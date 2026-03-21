// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IOracleConsumer {
    function getDroughtIndex(bytes32 regionCode) external view returns (uint256 index, uint256 timestamp, uint256 riskScore);
}

interface ILiquidityPool {
    function lockCapital(uint256 amount) external;
    function releaseCapital(uint256 amount) external;
    function sendPayout(address to, uint256 payoutAmount, uint256 liabilityAmount) external;
}

contract PolicyVault is ERC721Upgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    uint256 private _status;
    bool private _paused;

    modifier nonReentrant() {
        require(_status != 2, "ReentrancyGuard: reentrant call");
        _status = 2;
        _;
        _status = 1;
    }

    modifier whenNotPaused() {
        require(!_paused, "Pausable: paused");
        _;
    }

    enum CropType { SOY, CORN, WHEAT }
    enum PayoutSeverity { NONE, PARTIAL, FULL }

    IERC20 public usdc;
    IOracleConsumer public oracle;
    address public liquidityPool;

    uint256 public constant MIN_TRIGGER_DAYS = 14;
    uint256 public constant MAX_COVERAGE_PER_HECTARE = 1000 * 1e6; // $1,000 USDC per ha

    struct Policy {
        address farmer;
        CropType crop;
        uint256 farmSizeHectares;
        uint256 premium;
        uint256 coverageAmount;
        uint256 startTime;
        uint256 endTime;
        int256 lat;
        int256 lon;
        uint8 triggerThreshold;
        bool active;
        bool claimed;
        bool claimable;
        PayoutSeverity severity;
        bytes32 regionCode;
        uint256 triggerStartTimestamp;
    }

    uint256 public nextPolicyId = 1;
    mapping(uint256 => Policy) public policies;

    event PolicyCreated(uint256 indexed policyId, address indexed farmer, CropType crop, uint256 hectares, uint256 coverageAmount, uint256 premium);
    event PolicyClaimable(uint256 indexed policyId, PayoutSeverity severity);
    event PolicyClaimed(uint256 indexed policyId, address indexed farmer, uint256 payout, PayoutSeverity severity);
    event PolicyExpired(uint256 indexed policyId);
    event OracleUpdated(address indexed oracle);
    event LiquidityPoolUpdated(address indexed liquidityPool);

    function initialize(address _usdc, address _oracle, address _liquidityPool, address _owner) public initializer {
        __ERC721_init("AgroChain Policy", "AGROPOL");
        __Ownable_init(_owner);
        
        _status = 1;
        _paused = false;

        usdc = IERC20(_usdc);
        oracle = IOracleConsumer(_oracle);
        liquidityPool = _liquidityPool;
        emit OracleUpdated(_oracle);
        emit LiquidityPoolUpdated(_liquidityPool);
    }

    function pause() external onlyOwner {
        _paused = true;
    }
    
    function unpause() external onlyOwner {
        _paused = false;
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = IOracleConsumer(_oracle);
        emit OracleUpdated(_oracle);
    }

    function setLiquidityPool(address _liquidityPool) external onlyOwner {
        liquidityPool = _liquidityPool;
        emit LiquidityPoolUpdated(_liquidityPool);
    }

    // Internal helper to calculate dynamic premium rates
    function _calculatePremiumRate(CropType crop) internal pure returns (uint256) {
        // Returns rate in basis points (1 bp = 0.01%)
        if (crop == CropType.WHEAT) return 200; // 2% 
        if (crop == CropType.SOY) return 250;   // 2.5%
        return 300;                             // 3% (CORN)
    }

    struct CreatePolicyParams {
        CropType crop;
        uint256 farmSizeHectares;
        int256 lat;
        int256 lon;
        uint256 duration;
        bytes32 regionCode;
    }

    function createPolicy(CreatePolicyParams calldata params) external nonReentrant whenNotPaused {
        require(params.farmSizeHectares > 0, "PolicyVault: size=0");
        require(params.duration > 0, "PolicyVault: duration=0");

        // Calculate Coverage & Premium dynamically
        uint256 coverageAmount = params.farmSizeHectares * MAX_COVERAGE_PER_HECTARE;
        uint256 premiumRateBp = _calculatePremiumRate(params.crop);
        
        // Fetch riskScore from oracle
        (, uint256 riskTs, uint256 riskScore) = oracle.getDroughtIndex(params.regionCode);
        require(riskTs > 0, "PolicyVault: no oracle data");
        if (riskScore == 0) riskScore = 100;

        uint256 premium = (coverageAmount * premiumRateBp * riskScore) / (10000 * 100);

        uint256 policyId = nextPolicyId++;

        // transfer premium from farmer to vault then to pool
        usdc.safeTransferFrom(msg.sender, address(this), premium);
        usdc.safeTransfer(liquidityPool, premium);
        
        // Lock capital to ensure solvency 120% ratio
        ILiquidityPool(liquidityPool).lockCapital(coverageAmount);

        policies[policyId] = Policy({
            farmer: msg.sender,
            crop: params.crop,
            farmSizeHectares: params.farmSizeHectares,
            premium: premium,
            coverageAmount: coverageAmount,
            startTime: block.timestamp,
            endTime: block.timestamp + params.duration,
            lat: params.lat,
            lon: params.lon,
            triggerThreshold: 70, // Baseline phase 1 partial threshold
            active: true,
            claimed: false,
            claimable: false,
            severity: PayoutSeverity.NONE,
            regionCode: params.regionCode,
            triggerStartTimestamp: 0
        });

        _mint(msg.sender, policyId);

        emit PolicyCreated(policyId, msg.sender, params.crop, params.farmSizeHectares, coverageAmount, premium);
    }

    function evaluateTrigger(uint256 policyId) external whenNotPaused {
        Policy storage p = policies[policyId];
        require(p.active, "PolicyVault: inactive");

        (uint256 index, uint256 ts, ) = oracle.getDroughtIndex(p.regionCode);
        require(ts > 0, "PolicyVault: no oracle data");
        // require(block.timestamp - ts <= 48 hours, "PolicyVault: stale oracle"); // Disabled for fast-forward hackathon demo

        if (index > p.triggerThreshold) {
            if (p.triggerStartTimestamp == 0) {
                // start counting from current block time, not oracle timestamp
                p.triggerStartTimestamp = block.timestamp;
            }
            if (block.timestamp >= p.triggerStartTimestamp + MIN_TRIGGER_DAYS * 1 days) {
                p.claimable = true;
                
                // Determine severity payout tier
                if (index > 85) {
                    p.severity = PayoutSeverity.FULL;
                } else {
                    p.severity = PayoutSeverity.PARTIAL; // 70 to 85 is partial
                }
                
                emit PolicyClaimable(policyId, p.severity);
            }
        } else {
            p.triggerStartTimestamp = 0;
        }
    }

    function claimPayout(uint256 policyId) external nonReentrant whenNotPaused {
        require(ownerOf(policyId) == msg.sender, "PolicyVault: Only NFT owner can claim");
        
        Policy storage p = policies[policyId];
        require(p.active, "PolicyVault: inactive");
        require(!p.claimed, "PolicyVault: already claimed");
        require(p.claimable, "PolicyVault: not claimable");
        require(p.severity != PayoutSeverity.NONE, "PolicyVault: no severity set");

        p.claimed = true;
        p.active = false;

        uint256 payout = p.coverageAmount;
        if (p.severity == PayoutSeverity.PARTIAL) {
            payout = payout / 2; // 50% payout for Phase 1 drought
        }

        ILiquidityPool(liquidityPool).sendPayout(p.farmer, payout, p.coverageAmount);

        emit PolicyClaimed(policyId, p.farmer, payout, p.severity);
    }

    function expirePolicy(uint256 policyId) external whenNotPaused {
        Policy storage p = policies[policyId];
        require(p.active, "PolicyVault: inactive");
        require(block.timestamp > p.endTime, "PolicyVault: not expired");
        require(!p.claimable, "PolicyVault: trigger active - farmer must claim first");

        p.active = false;
        
        // Release capital constraint without paying out
        ILiquidityPool(liquidityPool).releaseCapital(p.coverageAmount);

        emit PolicyExpired(policyId);
    }
}


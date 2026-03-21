// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IReinsurancePool {
    function requestDrawdown(uint256 deficit) external;
}

contract LiquidityPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    uint256 public totalShares;
    mapping(address => uint256) public sharesOf;
    
    uint256 public totalLiabilities;
    mapping(address => uint256) public depositTime;
    address public policyVault;
    address public reinsurancePool;

    event Staked(address indexed lp, uint256 amount, uint256 sharesMinted);
    event Withdrawn(address indexed lp, uint256 sharesBurned, uint256 amountReturned);
    event CapitalLocked(uint256 amount);
    event CapitalReleased(uint256 amount);

    function setPolicyVault(address _vault) external onlyOwner {
        policyVault = _vault;
    }

    function setReinsurancePool(address _reinsurancePool) external onlyOwner {
        reinsurancePool = _reinsurancePool;
    }

    modifier onlyPolicyVault() {
        require(msg.sender == policyVault, "LiquidityPool: not policy vault");
        _;
    }

    function lockCapital(uint256 amount) external onlyPolicyVault {
        totalLiabilities += amount;
        uint256 poolBalance = usdc.balanceOf(address(this));
        require(poolBalance >= (totalLiabilities * 120) / 100, "LiquidityPool: insufficient collateral ratio");
        emit CapitalLocked(amount);
    }

    function releaseCapital(uint256 amount) external onlyPolicyVault {
        if (totalLiabilities >= amount) {
            totalLiabilities -= amount;
        } else {
            totalLiabilities = 0;
        }
        emit CapitalReleased(amount);
    }
    
    function sendPayout(address to, uint256 payoutAmount, uint256 liabilityAmount) external onlyPolicyVault {
        if (totalLiabilities >= liabilityAmount) {
            totalLiabilities -= liabilityAmount;
        } else {
            totalLiabilities = 0;
        }

        uint256 poolBalance = usdc.balanceOf(address(this));
        if (poolBalance < payoutAmount && reinsurancePool != address(0)) {
            // Pool is insolvent and cannot cover payout directly. Draw from reinsurance.
            uint256 deficit = payoutAmount - poolBalance;
            IReinsurancePool(reinsurancePool).requestDrawdown(deficit);
        }

        // Even after drawdown, pool might not be perfectly solvent if reinsurance was also empty,
        // so we just transfer whatever is available up to the payout amount to prevent locked transactions.
        uint256 availableToSend = usdc.balanceOf(address(this));
        if (availableToSend > payoutAmount) {
            availableToSend = payoutAmount;
        }

        usdc.safeTransfer(to, availableToSend);
    }

    function getUtilizationRate() external view returns (uint256) {
        uint256 poolBalance = usdc.balanceOf(address(this));
        if (poolBalance == 0) return 0;
        return (totalLiabilities * 100) / poolBalance;
    }

    constructor(address _usdc, address _owner) Ownable(_owner) {
        usdc = IERC20(_usdc);
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "LiquidityPool: amount=0");

        uint256 poolBalance = usdc.balanceOf(address(this));
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        uint256 sharesToMint;
        if (totalShares == 0 || poolBalance == 0) {
            sharesToMint = amount;
        } else {
            sharesToMint = (amount * totalShares) / poolBalance;
        }

        totalShares += sharesToMint;
        sharesOf[msg.sender] += sharesToMint;
        depositTime[msg.sender] = block.timestamp;

        emit Staked(msg.sender, amount, sharesToMint);
    }

    function withdraw(uint256 shares) external nonReentrant {
        require(shares > 0, "LiquidityPool: shares=0");
        uint256 userShares = sharesOf[msg.sender];
        require(userShares >= shares, "LiquidityPool: insufficient shares");
        require(block.timestamp >= depositTime[msg.sender] + 7 days, "LiquidityPool: 7-day lockup active");

        uint256 poolBalance = usdc.balanceOf(address(this));
        uint256 amountToReturn = (poolBalance * shares) / totalShares;

        sharesOf[msg.sender] = userShares - shares;
        totalShares -= shares;

        require((poolBalance - amountToReturn) >= (totalLiabilities * 120) / 100, "LiquidityPool: withdrawal breaches 120% CR");

        usdc.safeTransfer(msg.sender, amountToReturn);

        emit Withdrawn(msg.sender, shares, amountToReturn);
    }
}


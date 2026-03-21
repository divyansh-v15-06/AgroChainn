// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ReinsurancePool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public primaryPool;

    uint256 public totalShares;
    mapping(address => uint256) public sharesOf;
    mapping(address => uint256) public depositTime;

    event Staked(address indexed lp, uint256 amount);
    event Withdrawn(address indexed lp, uint256 amount);
    event DrawdownTriggered(uint256 amount);
    event PrimaryPoolSet(address indexed pool);

    modifier onlyPrimaryPool() {
        require(msg.sender == primaryPool, "Reinsurance: not primary pool");
        _;
    }

    constructor(address _usdc, address _owner) Ownable(_owner) {
        usdc = IERC20(_usdc);
    }

    function setPrimaryPool(address _primaryPool) external onlyOwner {
        primaryPool = _primaryPool;
        emit PrimaryPoolSet(_primaryPool);
    }

    // Institutional capital locks for 30 days
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Reinsurance: amount=0");

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

        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 shares) external nonReentrant {
        require(shares > 0, "Reinsurance: shares=0");
        uint256 userShares = sharesOf[msg.sender];
        require(userShares >= shares, "Reinsurance: insufficient shares");
        require(block.timestamp >= depositTime[msg.sender] + 30 days, "Reinsurance: 30-day lockup active");

        uint256 poolBalance = usdc.balanceOf(address(this));
        uint256 amountToReturn = (poolBalance * shares) / totalShares;

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;

        usdc.safeTransfer(msg.sender, amountToReturn);

        emit Withdrawn(msg.sender, amountToReturn);
    }

    // Primary pool calls this if it becomes insolvent during a black swamp event payout
    function requestDrawdown(uint256 deficit) external onlyPrimaryPool {
        uint256 poolBalance = usdc.balanceOf(address(this));
        require(poolBalance > 0, "Reinsurance: no capital available");

        uint256 amountToSend = deficit > poolBalance ? poolBalance : deficit;
        usdc.safeTransfer(primaryPool, amountToSend);

        emit DrawdownTriggered(amountToSend);
    }
}

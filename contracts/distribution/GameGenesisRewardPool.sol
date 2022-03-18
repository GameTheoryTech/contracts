// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interfaces/ITreasury.sol";
import "../utils/ContractGuard.sol";
import "../Authorizable.sol";

// Note that this pool has no minter key of GAME (rewards).
// Instead, the governance will call GAME distributeReward method and send reward to this pool at the beginning.
contract GameGenesisRewardPool is Authorizable, ContractGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    ITreasury public treasury;

    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
    }

    // Info of each pool.
    struct PoolInfo {
        IERC20 token; // Address of LP token contract.
        uint256 allocPoint; // How many allocation points assigned to this pool. GAME to distribute.
        uint256 lastRewardTime; // Last time that GAME distribution occurs.
        uint256 accGamePerShare; // Accumulated GAME per share, times 1e18. See below.
        bool isStarted; // if lastRewardBlock has passed
    }

    IERC20 public game;

    // Info of each pool.
    PoolInfo[] public poolInfo;

    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;

    // The time when GAME mining starts.
    uint256 public poolStartTime;

    // The time when GAME mining ends.
    uint256 public poolEndTime;

    // MAINNET
    uint256 public gamePerSecond = 0.09645 ether; // Approximately 25000 GAME / (72h * 60min * 60s)
    uint256 public runningTime = 3 days; // 3 days
    uint256 public depositFee = 100;
    // END MAINNET

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount);

    constructor(
        address _game,
        ITreasury _treasury,
        uint256 _poolStartTime
    ) public {
        require(block.timestamp < _poolStartTime, "late");
        if (_game != address(0)) game = IERC20(_game);
        treasury = _treasury;
        poolStartTime = _poolStartTime;
        poolEndTime = poolStartTime + runningTime;
    }

    // Allow us to delay or begin earlier if we have not started yet. Careful of gas.
    function setPoolStartTime(
        uint256 _time
    ) public onlyAuthorized
    {
        require(block.timestamp < poolStartTime, "Already started.");
        require(block.timestamp < _time, "Time input is too early.");
        uint256 length = poolInfo.length;
        uint256 pid = 0;
        uint256 _lastRewardTime;
        for (pid = 0; pid < length; pid += 1) {
            PoolInfo storage pool = poolInfo[pid];
            _lastRewardTime = pool.lastRewardTime;
            if (_lastRewardTime == poolStartTime || _lastRewardTime < _time) {
                pool.lastRewardTime = _time;
            }
        }
        poolStartTime = _time;
    }

    function setPoolEndTime(
        uint256 _time
    ) public onlyAuthorized
    {
        require(block.timestamp < poolStartTime, "Already started.");
        require(poolStartTime < _time, "Time input is too early.");
        poolEndTime = _time;
        runningTime = poolEndTime - poolStartTime;
    }

    function checkPoolDuplicate(IERC20 _token) internal view {
        uint256 length = poolInfo.length;
        uint256 pid;
        for (pid = 0; pid < length; pid += 1) {
            require(poolInfo[pid].token != _token, "GameGenesisRewardPool: existing pool?");
        }
    }

    // Add a new token to the pool. Can only be called by the owner.
    function add(
        uint256 _allocPoint,
        IERC20 _token,
        bool _withUpdate,
        uint256 _lastRewardTime
    ) public onlyOperator {
        checkPoolDuplicate(_token);
        if (_withUpdate) {
            massUpdatePools();
        }
        if (block.timestamp < poolStartTime) {
            // chef is sleeping
            if (_lastRewardTime < poolStartTime) {
                _lastRewardTime = poolStartTime;
            }
        } else {
            // chef is cooking
            if (_lastRewardTime < block.timestamp) {
                _lastRewardTime = block.timestamp;
            }
        }
        bool _isStarted =
        (_lastRewardTime <= poolStartTime) ||
        (_lastRewardTime <= block.timestamp);
        poolInfo.push(PoolInfo({
            token : _token,
            allocPoint : _allocPoint,
            lastRewardTime : _lastRewardTime,
            accGamePerShare : 0,
            isStarted : _isStarted
            }));
        if (_isStarted) {
            totalAllocPoint = totalAllocPoint.add(_allocPoint);
        }
    }

    // Update the given pool's GAME allocation point. Can only be called by the owner.
    function set(uint256 _pid, uint256 _allocPoint) public onlyOperator {
        massUpdatePools();
        PoolInfo storage pool = poolInfo[_pid];
        if (pool.isStarted) {
            totalAllocPoint = totalAllocPoint.sub(pool.allocPoint).add(
                _allocPoint
            );
        }
        pool.allocPoint = _allocPoint;
    }

    function setDepositFee(uint256 _depositFee) public onlyOperator {
        require(_depositFee <= 100, "Deposit fee must be less than 1%");
        depositFee = _depositFee;
    }

    function getGamePerSecondInPool(uint256 _pid) public view returns (uint256)
    {
        PoolInfo storage pool = poolInfo[_pid];
        uint256 _poolGamePerSecond = gamePerSecond.mul(pool.allocPoint).div(totalAllocPoint);
        return _poolGamePerSecond;
    }

    // Return accumulate rewards over the given _from to _to block.
    function getGeneratedReward(uint256 _fromTime, uint256 _toTime) public view returns (uint256) {
        if (_fromTime >= _toTime) return 0;
        if (_toTime >= poolEndTime) {
            if (_fromTime >= poolEndTime) return 0;
            if (_fromTime <= poolStartTime) return poolEndTime.sub(poolStartTime).mul(gamePerSecond);
            return poolEndTime.sub(_fromTime).mul(gamePerSecond);
        } else {
            if (_toTime <= poolStartTime) return 0;
            if (_fromTime <= poolStartTime) return _toTime.sub(poolStartTime).mul(gamePerSecond);
            return _toTime.sub(_fromTime).mul(gamePerSecond);
        }
    }

    // View function to see pending GAME on frontend.
    function pendingGAME(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accGamePerShare = pool.accGamePerShare;
        uint256 tokenSupply = pool.token.balanceOf(address(this));
        if (block.timestamp > pool.lastRewardTime && tokenSupply != 0) {
            uint256 _generatedReward = getGeneratedReward(pool.lastRewardTime, block.timestamp);
            uint256 _gameReward = _generatedReward.mul(pool.allocPoint).div(totalAllocPoint);
            accGamePerShare = accGamePerShare.add(_gameReward.mul(1e18).div(tokenSupply));
        }
        return user.amount.mul(accGamePerShare).div(1e18).sub(user.rewardDebt);
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() internal { // Too scared of scary reentrancy warnings. Internal version.
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function forceMassUpdatePools() external onlyAuthorized { // Too scared of scary reentrancy warnings. External version.
        massUpdatePools();
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) internal { // Too scared of scary reentrancy warnings. Internal version.
        PoolInfo storage pool = poolInfo[_pid];
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }
        uint256 tokenSupply = pool.token.balanceOf(address(this));
        if (tokenSupply == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }
        if (!pool.isStarted) {
            pool.isStarted = true;
            totalAllocPoint = totalAllocPoint.add(pool.allocPoint); // Reentrancy issue? But this can't be used maliciously... Can it?  A malicious token is what we should be more worried about.
        }
        if (totalAllocPoint > 0) {
            uint256 _generatedReward = getGeneratedReward(pool.lastRewardTime, block.timestamp);
            uint256 _gameReward = _generatedReward.mul(pool.allocPoint).div(totalAllocPoint);
            pool.accGamePerShare = pool.accGamePerShare.add(_gameReward.mul(1e18).div(tokenSupply));
        }
        pool.lastRewardTime = block.timestamp;
    }

    // Update reward variables of the given pool to be up-to-date.
    function forceUpdatePool(uint256 _pid) external onlyAuthorized { // Too scared of scary reentrancy warnings. External version.
        updatePool(_pid);
    }

    // Deposit LP tokens.
    function deposit(uint256 _pid, uint256 _amount) public onlyOneBlock { // Poor smart contracts, can't deposit to multiple pools at once... But my OCD will not allow this.
        address _sender = msg.sender;
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 _pending = user.amount.mul(pool.accGamePerShare).div(1e18).sub(user.rewardDebt);
            if (_pending > 0) {
                safeGameTransfer(_sender, _pending);
                emit RewardPaid(_sender, _pending);
            }
        }
        if (_amount > 0) {
            uint256 feeAmount = _amount.mul(depositFee).div(10000);
            uint256 amountToDeposit = _amount.sub(feeAmount);
            if(feeAmount > 0) pool.token.safeTransferFrom(_sender, treasury.daoFund(), feeAmount);
            pool.token.safeTransferFrom(_sender, address(this), amountToDeposit);
            user.amount = user.amount.add(amountToDeposit);
        }
        user.rewardDebt = user.amount.mul(pool.accGamePerShare).div(1e18);
        emit Deposit(_sender, _pid, _amount);
    }

    // Withdraw LP tokens.
    // No withdrawal fees or locks for Genesis Pools.
    function withdraw(uint256 _pid, uint256 _amount) public onlyOneBlock {
        address _sender = msg.sender;
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(_pid);
        uint256 _pending = user.amount.mul(pool.accGamePerShare).div(1e18).sub(user.rewardDebt);
        if (_pending > 0) {
            safeGameTransfer(_sender, _pending);
            emit RewardPaid(_sender, _pending);
        }
        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.token.safeTransfer(_sender, _amount);
        }
        user.rewardDebt = user.amount.mul(pool.accGamePerShare).div(1e18);
        emit Withdraw(_sender, _pid, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public onlyOneBlock {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 _amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        pool.token.safeTransfer(msg.sender, _amount);
        emit EmergencyWithdraw(msg.sender, _pid, _amount);
    }

    // Safe GAME transfer function, just in case if rounding error causes pool to not have enough GAMEs.
    function safeGameTransfer(address _to, uint256 _amount) internal {
        uint256 _gameBalance = game.balanceOf(address(this));
        if (_gameBalance > 0) {
            if (_amount > _gameBalance) {
                game.safeTransfer(_to, _gameBalance);
            } else {
                game.safeTransfer(_to, _amount);
            }
        }
    }

    function getRequiredAllocation() public view returns (uint256)
    {
        uint256 _generatedReward = getGeneratedReward(poolStartTime, poolEndTime);
        return _generatedReward;
    }

    function governanceRecoverUnsupported(IERC20 _token, uint256 amount, address to) external onlyOperator {
        if (block.timestamp < poolEndTime + 90 days) {
            // do not allow to drain core token (GAME or lps) if less than 90 days after pool ends
            require(_token != game, "game");
            uint256 length = poolInfo.length;
            for (uint256 pid = 0; pid < length; ++pid) {
                PoolInfo storage pool = poolInfo[pid];
                require(_token != pool.token, "pool.token");
            }
        }
        _token.safeTransfer(to, amount);
    }
}

// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./utils/ContractGuard.sol";
import "./interfaces/IBasisAsset.sol";
import "./interfaces/ITreasury.sol";
import "./interfaces/IFarm.sol";
import "./interfaces/IERC20Lockable.sol";
import "./Authorizable.sol";

contract ShareWrapper {
    using SafeMath for uint256;
    using SafeERC20 for IERC20Lockable;

    IERC20Lockable public share;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function stake(uint256 amount) public virtual {
        _totalSupply = _totalSupply.add(amount);
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        share.safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdrawWithFee(uint256 amount, uint256 fee, address feeFund) internal {
        uint256 theoristShare = _balances[msg.sender];
        require(theoristShare >= amount, "Theoretics: withdraw request greater than staked amount");
        _totalSupply = _totalSupply.sub(amount);
        _balances[msg.sender] = theoristShare.sub(amount);
        uint256 feeAmount = amount.mul(fee).div(10000);
        uint256 amountToGive = amount.sub(feeAmount);
        if(feeAmount > 0) share.safeTransfer(feeFund, feeAmount);
        share.safeTransfer(msg.sender, amountToGive);
    }
}

contract Theoretics is ShareWrapper, Authorizable, ContractGuard {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    /* ========== DATA STRUCTURES ========== */

    struct TheoristSeat {
        uint256 lastSnapshotIndex;
        uint256 rewardEarned;
        uint256 epochTimerStart;
        uint256 lastDepositBlock;
        uint256 lastWithdrawTime;
        uint256 firstDepositTime;
    }

    struct TheoreticsSnapshot {
        uint256 time;
        uint256 rewardReceived;
        uint256 rewardPerShare;
    }

    /* ========== STATE VARIABLES ========== */

    // flags
    bool public initialized = false;

    IERC20Lockable public game;
    ITreasury public treasury;
    IFarm public farm;

    mapping(address => TheoristSeat) public theorists;
    TheoreticsSnapshot[] public theoreticsHistory;

    uint256 public withdrawLockupEpochs;
    uint256 public rewardLockupEpochs;
    uint256 public pegMaxUnlock; //What TWAP do we have to be at to incur 0% lock?
    uint256 public sameBlockFee;
    uint256[] public feeStagePercentage; //In 10000s for decimal
    uint256[] public feeStageTime;


    /* ========== EVENTS ========== */

    event Initialized(address indexed executor, uint256 at);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward, uint256 lockAmount);
    event RewardAdded(address indexed user, uint256 reward);

    /* ========== Modifiers =============== */

    modifier theoristExists {
        require(balanceOf(msg.sender) > 0, "Theoretics: The theorist does not exist");
        _;
    }

    modifier updateReward(address theorist) {
        if (theorist != address(0)) {
            TheoristSeat memory seat = theorists[theorist];
            seat.rewardEarned = earned(theorist);
            seat.lastSnapshotIndex = latestSnapshotIndex();
            theorists[theorist] = seat;
        }
        _;
    }

    modifier notInitialized {
        require(!initialized, "Theoretics: already initialized");
        _;
    }

    /* ========== GOVERNANCE ========== */

    function initialize(
        IERC20Lockable _game,
        IERC20Lockable _share,
        ITreasury _treasury,
        IFarm _farm
    ) public notInitialized {
        require(_treasury.initialized(), "Treasury must be initialized first.");
        initialized = true;
        game = _game;
        share = _share;
        treasury = _treasury;
        farm = _farm;

        TheoreticsSnapshot memory genesisSnapshot = TheoreticsSnapshot({time : block.number, rewardReceived : 0, rewardPerShare : 0});
        theoreticsHistory.push(genesisSnapshot);

        withdrawLockupEpochs = 6; // Lock for 6 epochs (36h) before release withdraw
        rewardLockupEpochs = 3; // Lock for 3 epochs (18h) before release claimReward

        pegMaxUnlock = treasury.gamePriceOne().mul(4);
        sameBlockFee = 2500;
        feeStageTime = [0, 1 hours, 1 days, 3 days, 5 days, 2 weeks, 4 weeks];
        feeStagePercentage = [800, 400, 200, 100, 50, 25, 1];

        emit Initialized(msg.sender, block.number);
    }

    function setFeeStages(uint256[] memory _feeStageTime, uint256[] memory _feeStagePercentage) public onlyAuthorized() {
        require(_feeStageTime.length > 0
            && _feeStageTime[0] == 0
            && _feeStagePercentage.length == _feeStageTime.length,
            "Fee stage arrays must be equal in non-zero length and time should start at 0.");
        feeStageTime = _feeStageTime;
        uint256 i;
        uint256 len = _feeStagePercentage.length;
        for(i = 0; i < len; i += 1)
        {
            require(_feeStagePercentage[i] <= 800, "Fee can't be higher than 8%.");
        }
        feeStagePercentage = _feeStagePercentage;
    }

    function setSameBlockFee(uint256 _fee) public onlyAuthorized() {
        require(_fee <= 2500, "Fee can't be higher than 25%.");
        sameBlockFee = _fee;
    }

    function getWithdrawFeeOf(address _user) public view returns (uint256)
    {
        TheoristSeat storage user = theorists[_user];
        uint256 fee = sameBlockFee;
        if(block.number != user.lastDepositBlock)
        {
            if (!(user.firstDepositTime > 0)) {
                return feeStagePercentage[0];
            }
            uint256 deltaTime = user.lastWithdrawTime > 0 ?
            block.timestamp - user.lastWithdrawTime :
            block.timestamp - user.firstDepositTime;
            uint256 len = feeStageTime.length;
            uint256 n;
            uint256 i;
            for (n = len; n > 0; n -= 1) {
                i = n-1;
                if(deltaTime >= feeStageTime[i])
                {
                    fee = feeStagePercentage[i];
                    break;
                }
            }
        }
        return fee;
    }

    function setLockUp(uint256 _withdrawLockupEpochs, uint256 _rewardLockupEpochs, uint256 _pegMaxUnlock) external onlyAuthorized onlyOneBlock { // Switched to onlyAuthorized just in case we vote on a new lock up period later. The max is now the default, so this can only help users.
        require(_withdrawLockupEpochs >= _rewardLockupEpochs && _withdrawLockupEpochs <= 6 && _rewardLockupEpochs <= 3, "lockup epochs out of range"); // <= 6 epochs (36 hours)
        require(_pegMaxUnlock > treasury.gamePriceCeiling()
            && _pegMaxUnlock <= treasury.gamePriceOne().mul(4),
            "Max peg unlock must be greater than the GAME ceiling and lower than the price of one GAME times 4.");
        withdrawLockupEpochs = _withdrawLockupEpochs;
        rewardLockupEpochs = _rewardLockupEpochs;
        pegMaxUnlock = _pegMaxUnlock;
    }

    /* ========== VIEW FUNCTIONS ========== */

    // =========== Snapshot getters

    function latestSnapshotIndex() public view returns (uint256) {
        return theoreticsHistory.length.sub(1);
    }

    function getLatestSnapshot() internal view returns (TheoreticsSnapshot memory) {
        return theoreticsHistory[latestSnapshotIndex()];
    }

    function getLastSnapshotIndexOf(address theorist) public view returns (uint256) {
        return theorists[theorist].lastSnapshotIndex;
    }

    function getLastSnapshotOf(address theorist) internal view returns (TheoreticsSnapshot memory) {
        return theoreticsHistory[getLastSnapshotIndexOf(theorist)];
    }

    function canWithdraw(address theorist) external view returns (bool) {
        uint256 fullLock = 100;
        uint256 currentTime = block.timestamp;
        uint256 unlockPercentage = fullLock.sub(farm.getLockPercentage(currentTime > 0 ? currentTime.sub(1) : currentTime, currentTime));
        require(unlockPercentage <= 100, "Invalid unlock percentage, check farm contract."); // Don't worry: The max is not 100.  It is just here for simplicity. I should use assert instead of require but I prefer having the reason there when it asserts.
        return theorists[theorist].epochTimerStart.add(withdrawLockupEpochs.mul(unlockPercentage).div(100)) <= treasury.epoch();
    }

    function epoch() external view returns (uint256) {
        return treasury.epoch();
    }

    function canClaimReward(address theorist) external view returns (bool) {
        uint256 fullLock = 100;
        uint256 currentTime = block.timestamp;
        uint256 unlockPercentage = fullLock.sub(farm.getLockPercentage(currentTime > 0 ? currentTime.sub(1) : currentTime, currentTime));
        require(unlockPercentage <= 100, "Invalid unlock percentage, check farm contract.");
        return theorists[theorist].epochTimerStart.add(rewardLockupEpochs.mul(unlockPercentage).div(100)) <= treasury.epoch();
    }

    function nextEpochPoint() external view returns (uint256) {
        return treasury.nextEpochPoint();
    }

    function getGamePrice() external view returns (uint256) {
        return treasury.getGamePrice();
    }

    // =========== Theorist getters

    function rewardPerShare() public view returns (uint256) {
        return getLatestSnapshot().rewardPerShare;
    }

    function earned(address theorist) public view returns (uint256) {
        uint256 latestRPS = getLatestSnapshot().rewardPerShare;
        uint256 storedRPS = getLastSnapshotOf(theorist).rewardPerShare;

        return balanceOf(theorist).mul(latestRPS.sub(storedRPS)).div(1e18).add(theorists[theorist].rewardEarned);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function reviseDeposit(address _user, uint256 _time) public onlyAuthorized() {
        theorists[_user].firstDepositTime = _time;
    }

    function reviseWithdraw(address _user, uint256 _time) public onlyAuthorized() {
        theorists[_user].lastWithdrawTime = _time;
    }

    function stake(uint256 amount) public override onlyOneBlock updateReward(msg.sender) {
        require(amount > 0, "Theoretics: Cannot stake 0");
        super.stake(amount);
        TheoristSeat storage user = theorists[msg.sender];
        user.epochTimerStart = treasury.epoch(); // reset timer
        user.lastDepositBlock = block.number;
        if (!(user.firstDepositTime > 0)) {
            user.firstDepositTime = block.timestamp;
        }
        emit Staked(msg.sender, amount);
    }

    function getCurrentWithdrawEpochs() public view returns (uint256)
    {
        uint256 fullLock = 100;
        uint256 currentTime = block.timestamp;
        uint256 unlockPercentage = fullLock.sub(farm.getLockPercentage(currentTime > 0 ? currentTime.sub(1) : currentTime, currentTime));
        require(unlockPercentage <= 100, "Invalid unlock percentage, check farm contract.");
        return (withdrawLockupEpochs.mul(unlockPercentage).div(100));
    }

    function getCurrentClaimEpochs() public view returns (uint256)
    {
        uint256 fullLock = 100;
        uint256 currentTime = block.timestamp;
        uint256 unlockPercentage = fullLock.sub(farm.getLockPercentage(currentTime > 0 ? currentTime.sub(1) : currentTime, currentTime));
        require(unlockPercentage <= 100, "Invalid unlock percentage, check farm contract.");
        return (rewardLockupEpochs.mul(unlockPercentage).div(100));
    }

    // TODO: GAS OPTIMIZATION? user can be memory, manipulated, and then stored in theorists storage.
    // For safety reasons, I am not doing this now. I am also not sure if modifying all at once makes a difference.
    function withdraw(uint256 amount) public onlyOneBlock theoristExists updateReward(msg.sender) {
        require(amount > 0, "Theoretics: Cannot withdraw 0");
        uint256 fullLock = 100;
        uint256 currentTime = block.timestamp;
        uint256 unlockPercentage = fullLock.sub(farm.getLockPercentage(currentTime > 0 ? currentTime.sub(1) : currentTime, currentTime));
        require(unlockPercentage <= 100, "Invalid unlock percentage, check farm contract.");
        TheoristSeat storage user = theorists[msg.sender];
        require(user.epochTimerStart.add(withdrawLockupEpochs.mul(unlockPercentage).div(100)) <= treasury.epoch(), "Theoretics: still in withdraw lockup");
        claimReward();
        uint256 fee = sameBlockFee;
        if(block.number != user.lastDepositBlock)
        {
            uint256 deltaTime = user.lastWithdrawTime > 0 ?
            block.timestamp - user.lastWithdrawTime :
            block.timestamp - user.firstDepositTime;
            uint256 len = feeStageTime.length;
            uint256 n;
            uint256 i;
            for (n = len; n > 0; n -= 1) {
                i = n-1;
                if(deltaTime >= feeStageTime[i])
                {
                    fee = feeStagePercentage[i];
                    break;
                }
            }
        }
        user.lastWithdrawTime = block.timestamp;
        withdrawWithFee(amount, fee, treasury.daoFund());
        emit Withdrawn(msg.sender, amount);
    }

    function exit() external {
        withdraw(balanceOf(msg.sender));
    }

    function invLerpPercent95(uint256 _from, uint256 _to, uint _current) internal pure returns (uint256)
    {
        require(_to > _from, "Invalid parameters.");
        if(_current <= _from) return 0;
        if(_current >= _to) return 95;
        return (_current.sub(_from)).mul(95).div(_to.sub(_from));
    }

    function getLockPercentage() public view returns (uint256) {
        uint256 twap = treasury.getGamePrice();
        // By default, GAME is 100% locked for 1 year at <= 1.01, and fully unlocked at >= 2.0
        uint256 fullUnlock = 95;
        uint256 lockPercentage = fullUnlock.sub(invLerpPercent95(treasury.gamePriceCeiling(), pegMaxUnlock, twap));
        require(lockPercentage <= 100, "Invalid lock percentage, check this contract.");
        if (lockPercentage > 95) lockPercentage = 95; // Invalid but not TOO invalid. Okay, I admit, it is so that it stays consistent with all the other requires.
        return lockPercentage;
    }

    function claimReward() public onlyOneBlock updateReward(msg.sender) {
        uint256 reward = theorists[msg.sender].rewardEarned;
        if (reward > 0) {
            uint256 fullLock = 100;
            uint256 currentTime = block.timestamp;
            uint256 unlockPercentage = fullLock.sub(farm.getLockPercentage(currentTime > 0 ? currentTime.sub(1) : currentTime, currentTime));
            require(unlockPercentage <= 100, "Invalid unlock percentage, check farm contract.");
            require(theorists[msg.sender].epochTimerStart.add(rewardLockupEpochs.mul(unlockPercentage).div(100)) <= treasury.epoch(), "Theoretics: still in reward lockup");
            theorists[msg.sender].epochTimerStart = treasury.epoch(); // reset timer
            theorists[msg.sender].rewardEarned = 0;
            game.safeTransfer(msg.sender, reward);
            // GAME can always be locked.
            uint256 lockAmount = 0;
            uint256 lockPercentage = getLockPercentage();
            require(lockPercentage <= 100, "Invalid lock percentage, check this contract.");
            lockAmount = reward.mul(lockPercentage).div(100);
            if(lockAmount > 0) game.lock(msg.sender, lockAmount);
            emit RewardPaid(msg.sender, reward, lockAmount);
        }
    }

    function allocateSeigniorage(uint256 amount) external onlyOneBlock onlyOperator {
        require(amount > 0, "Theoretics: Cannot allocate 0");
        require(totalSupply() > 0, "Theoretics: Cannot allocate when totalSupply is 0");

        // Create & add new snapshot
        uint256 prevRPS = getLatestSnapshot().rewardPerShare;
        uint256 nextRPS = prevRPS.add(amount.mul(1e18).div(totalSupply()));

        TheoreticsSnapshot memory newSnapshot = TheoreticsSnapshot({
            time: block.number,
            rewardReceived: amount,
            rewardPerShare: nextRPS
        });
        theoreticsHistory.push(newSnapshot);

        game.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardAdded(msg.sender, amount);
    }

    function governanceRecoverUnsupported(IERC20 _token, uint256 _amount, address _to) external onlyOperator { //This can remain onlyOperator since we can call this from the Treasury anyways.
        // do not allow to drain core tokens
        require(address(_token) != address(game), "game");
        require(address(_token) != address(share), "share");
        _token.safeTransfer(_to, _amount);
    }
}

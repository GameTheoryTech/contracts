// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/math/Math.sol";

import "./lib/SafeMath8.sol";
import "./interfaces/IOracle.sol";
import "./interfaces/ITreasury.sol";
import "./Authorizable.sol";
import "./interfaces/IDistributable.sol";

contract Game is ERC20Burnable, Operator, Authorizable {
    using SafeMath8 for uint8;
    using SafeMath for uint256;

    // Have the rewards been distributed to the pools
    bool public rewardPoolDistributed = false;
    address public distributed;

    uint256 private _totalLock;
    uint256 public lockTime;
    mapping(address => uint256) public lockFromTime;
    mapping(address => bool) public noUnlockBeforeTransfer;

    mapping(address => uint256) private _locks;
    mapping(address => uint256) private _lastUnlockTime;

    // Events.
    event Lock(address indexed to, uint256 value);
    event Unlock(address indexed to, uint256 value);

    /**
     * @notice Constructs the GAME ERC-20 contract.
     */
    constructor() public ERC20("GAME", "Game Theory (gametheory.tech): GAME Token") {
        // Mints 1 GAME to contract creator for initial pool setup

        lockTime = 365 days;
        _mint(msg.sender, 1 ether); // mint 1 GAME for initial liquidity pool deployment
    }

    function setLockTime(uint256 _lockTime) public onlyAuthorized {
        require(_lockTime <= 365 days, "Lock time must not be greater than 365 days.");
        lockTime = _lockTime;
    }

    function doesNotUnlockBeforeTransfer(address _user) external view returns (bool) {
        return noUnlockBeforeTransfer[_user];
    }

    function setNoUnlockBeforeTransfer(bool _noUnlockBeforeTransfer) external {
        noUnlockBeforeTransfer[msg.sender] = _noUnlockBeforeTransfer;
    } // If for some reason it is causing problems for a specific user, they can turn it off themselves.

    /**
     * @notice Operator mints GAME to a recipient
     * @param recipient_ The address of recipient
     * @param amount_ The amount of GAME to mint to
     * @return whether the process has been done
     */
    function mint(address recipient_, uint256 amount_) public onlyOperator returns (bool) {
        uint256 balanceBefore = balanceOf(recipient_);
        _mint(recipient_, amount_);
        uint256 balanceAfter = balanceOf(recipient_);

        return balanceAfter > balanceBefore;
    }

    function burn(uint256 amount) public override {
        super.burn(amount);
    }

    function burnFrom(address account, uint256 amount) public override onlyOperator {
        super.burnFrom(account, amount);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal override {
        if(!noUnlockBeforeTransfer[sender] && _locks[sender] > 0)
        {
            uint256 amountToUnlock = canUnlockAmount(sender);
            _unlock(sender, amountToUnlock);
        }
        super._transfer(sender, recipient, amount);
    }

    /**
     * @notice distribute to reward pool (only once)
     */
    function distributeReward(
        address _genesisPool
    ) external onlyAuthorized { // Can only do this once, so no point in having it be only operator. We can switch to treasury operator before even distributing the reward!
        require(!rewardPoolDistributed, "only can distribute once");
        require(_genesisPool != address(0), "!_genesisPool");
        rewardPoolDistributed = true;
        distributed = _genesisPool;
        _mint(_genesisPool, IDistributable(_genesisPool).getRequiredAllocation());
    }

    function governanceRecoverUnsupported(
        IERC20 _token,
        uint256 _amount,
        address _to
    ) external onlyAuthorized {
        require(msg.sender == operator() || _token != IERC20(this), "Invalid permissions."); // Only the operator can transfer this (though this will probably never be used). We can now recover any tokens accidentally sent to this address.
        _token.transfer(_to, _amount);
    }

    // Update the lockFromTime
    function lockFromUpdate(address _holder, uint256 _newLockFrom) public onlyAuthorized {
        lockFromTime[_holder] = _newLockFrom;
    }

    function getLockFromTime(address _holder) public view returns (uint256) {
        return lockFromTime[_holder];
    }

    function totalBalanceOf(address _holder) public view returns (uint256) {
        return _locks[_holder].add(balanceOf(_holder));
    }

    function lockOf(address _holder) public view returns (uint256) {
        return _locks[_holder];
    }

    function lastUnlockTime(address _holder) public view returns (uint256) {
        return _lastUnlockTime[_holder];
    }

    function unlockedSupply() public view returns (uint256) {
        return totalSupply().sub(_totalLock);
    }

    function lockedSupply() public view returns (uint256) {
        return totalLock();
    }

    function circulatingSupply() public view returns (uint256) {
        return totalSupply().sub(balanceOf(distributed));
    }

    function totalLock() public view returns (uint256) {
        return _totalLock;
    }

    function lock(address _holder, uint256 _amount) public onlyAuthorized { // Genesis pool can't lock, so distributed doesn't need rights. Also, only operator is allowed to lock more than 95% (to prevent accidental deadlocks and abuse).
        require(_holder != address(0), "Cannot lock to the zero address");
        require(_amount <= balanceOf(_holder), "Lock amount over balance");
        require(msg.sender == operator() || _locks[_holder].add(_amount) <= totalBalanceOf(_holder).mul(95).div(100), "Lock amount over 95% of total balance");

        if(noUnlockBeforeTransfer[_holder] && _locks[_holder] > 0) //Before we lock more, make sure we unlock everything we can, even if noUnlockBeforeTransfer is set.
        {
            uint256 amount = canUnlockAmount(_holder);
            _unlock(_holder, amount);
        }

        uint256 _lockFromTime = block.timestamp;
        lockFromTime[_holder] = _lockFromTime;

        _transfer(_holder, address(this), _amount);

        _locks[_holder] = _locks[_holder].add(_amount);
        _totalLock = _totalLock.add(_amount);
        if (_lastUnlockTime[_holder] < lockFromTime[_holder]) {
            _lastUnlockTime[_holder] = lockFromTime[_holder];
        }
        emit Lock(_holder, _amount);
    }

    function canUnlockAmount(address _holder) public view returns (uint256) {
        if (block.timestamp <= lockFromTime[_holder]) {
            return 0;
        } else if (block.timestamp >= lockFromTime[_holder].add(lockTime)) {
            return _locks[_holder];
        } else {
            uint256 releaseTime = block.timestamp.sub(_lastUnlockTime[_holder]);
            uint256 numberLockTime = lockFromTime[_holder].add(lockTime).sub(_lastUnlockTime[_holder]);
            return _locks[_holder].mul(releaseTime).div(numberLockTime);
        }
    }

    // Unlocks some locked tokens immediately. This could be used for NFTs or promotional periods.
    function unlockForUser(address account, uint256 amount) public onlyAuthorized {
        // First we need to unlock all tokens the address is eligible for.
        uint256 pendingLocked = canUnlockAmount(account);
        if (pendingLocked > 0) {
            _unlock(account, pendingLocked);
        }

        // Now that that's done, we can unlock the extra amount passed in.
        _unlock(account, amount);
    }

    function unlock() public {
        uint256 amount = canUnlockAmount(msg.sender);
        _unlock(msg.sender, amount);
    }

    function _unlock(address holder, uint256 amount) internal {
        require(_locks[holder] > 0, "Insufficient locked tokens");

        // Make sure they aren't trying to unlock more than they have locked.
        if (amount > _locks[holder]) {
            amount = _locks[holder];
        }

        // If the amount is greater than the total balance, set it to max.
        if (amount > balanceOf(address(this))) {
            amount = balanceOf(address(this));
        }
        _transfer(address(this), holder, amount);
        _locks[holder] = _locks[holder].sub(amount);
        _lastUnlockTime[holder] = block.timestamp;
        _totalLock = _totalLock.sub(amount);

        emit Unlock(holder, amount);
    }
}

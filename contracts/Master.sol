// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20Snapshot.sol";
import "./AuthorizableNoOperator.sol";
import "./interfaces/IERC20Lockable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./interfaces/ITheoretics.sol";

contract Master is ERC20Snapshot, AuthorizableNoOperator {
    using SafeMath for uint256;
    using SafeERC20 for IERC20Lockable;

    mapping(address => uint256) public lockToTime;
    mapping(address => address) public approveTransferFrom;
    IERC20Lockable public theory;
    address[] public whitelistedAddressesInStakers; //communityFund
    ITheoretics[] public whitelistedStakers; //Theoretics
    address public communityFund;
    uint256 public minLockTime;

    constructor(ITheoretics[] memory _whitelistedStakers, address _communityFund) public ERC20("Master Token", "MASTER") {
        whitelistedStakers = _whitelistedStakers;
        whitelistedAddressesInStakers = [communityFund];
        communityFund = _communityFund;
        minLockTime = 365 days;
    }

    //TODO: Administrative setters for every variable.

    //For MASTER -> THEORY
    function masterToTheoryMultiplier() public view returns (uint256)
    {
        uint256 totalSupply = totalSupply();
        if(totalSupply == 0) return 1 ether;
        uint256 totalExtraTheory = 0;
        {
            uint256 i;
            uint256 len = whitelistedStakers.length;
            uint256 j;
            uint256 lenj = whitelistedAddressesInStakers.length;
            ITheoretics staker;
            address whitelistedAddress;
            for(i = 0; i < len; i += 1)
            {
                staker = whitelistedStakers[i];
                for(j = 0; j < lenj; j += 1)
                {
                    whitelistedAddress = whitelistedAddressesInStakers[j];
                    totalExtraTheory = totalExtraTheory.add(staker.balanceOf(whitelistedAddress));
                }
            }
        }
        return totalExtraTheory.add(totalSupply).add(theory.balanceOf(address(this))
        .add(theory.balanceOf(communityFund))).mul(1 ether).div(totalSupply);
    }

    //For THEORY -> MASTER
    function theoryToMasterMultiplier() public view returns (uint256)
    {
        uint256 totalSupply = totalSupply();
        if(totalSupply == 0) return 1 ether;
        uint256 totalExtraTheory = 0;
        {
            uint256 i;
            uint256 len = whitelistedStakers.length;
            uint256 j;
            uint256 lenj = whitelistedAddressesInStakers.length;
            ITheoretics staker;
            address whitelistedAddress;
            for(i = 0; i < len; i += 1)
            {
                staker = whitelistedStakers[i];
                for(j = 0; j < lenj; j += 1)
                {
                    whitelistedAddress = whitelistedAddressesInStakers[j];
                    totalExtraTheory = totalExtraTheory.add(staker.balanceOf(whitelistedAddress));
                }
            }
        }
        return totalSupply.mul(1 ether).div(totalExtraTheory.add(totalSupply).add(theory.balanceOf(address(this))
        .add(theory.balanceOf(communityFund))));
    }

    function _lock(address user, uint256 lockTo) internal
    {

    }

    function lock(address user, uint256 lockTo) public onlyAuthorized
    {
        _lock(user, lockTo);
    }

    function lockAndTransferFrom(address from, address to, uint256 amount, uint256 lockTo) public onlyAuthorized returns (bool)
    {
        if(!(authorized[msg.sender] || owner() == msg.sender || authorized[to] || owner() == to))
        {
            require(approveTransferFrom[to] == from, "Receiver did not approve transfer.");
            approveTransferFrom[to] = address(0);
            uint256 nextTime = block.timestamp.add(minLockTime);
            if(nextTime > lockToTime[to]) _lock(to, nextTime);
        }
        _lock(to, lockTo);
        if(from == msg.sender) return transfer(to, amount);
        return transferFrom(from, to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal virtual override {
        if(!(authorized[msg.sender] || owner() == msg.sender || authorized[to] || owner() == to))
        {
            require(approveTransferFrom[to] == from, "Receiver did not approve transfer.");
            approveTransferFrom[to] = address(0);
            uint256 nextTime = block.timestamp.add(minLockTime);
            if(nextTime > lockToTime[to]) _lock(to, nextTime);
        }
        super._transfer(from, to, amount);

    }

    function buyFromTheory(uint256 amountInTheory) public
    {

    }

    function sellToTheory(uint256 amountInMaster) public
    {

    }
}

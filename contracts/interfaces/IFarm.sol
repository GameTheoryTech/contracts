// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFarm {
    function getLockPercentage(uint256 _from, uint256 _to) external view returns (uint256);
}

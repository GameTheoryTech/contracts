// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface ITreasury {
    function epoch() external view returns (uint256);

    function nextEpochPoint() external view returns (uint256);

    function getGamePrice() external view returns (uint256);

    function gamePriceOne() external view returns (uint256);
    function gamePriceCeiling() external view returns (uint256);
    function initialized() external view returns (bool);
    function daoFund() external view returns (address);

    function buyBonds(uint256 amount, uint256 targetPrice) external;

    function redeemBonds(uint256 amount, uint256 targetPrice) external;
}

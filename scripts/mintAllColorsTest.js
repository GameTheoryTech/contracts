/* eslint-disable */
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {BigNumber} = require("@ethersproject/bignumber");
const {smock} = require("@defi-wonderland/smock");

async function main() {
    const [deployer, daofund, devfund] = await hre.ethers.getSigners();

    const seconds = BigNumber.from(1);
    const minutes = seconds.mul(60);
    const hours = minutes.mul(60);
    const days = hours.mul(24);
    const weeks = days.mul(7);
    const years = days.mul(365);

    const onePointTen = BigNumber.from('1100000000000000000');
    const one = BigNumber.from('1000000000000000000');
    const half = BigNumber.from('500000000000000000');
    const ten = BigNumber.from('10000000000000000000');
    const oneHundred = BigNumber.from('100000000000000000000');
    const oneTenth = BigNumber.from('100000000000000000');
    const oneHundredth = BigNumber.from('10000000000000000');
    const zero = BigNumber.from('0');
    const oneBillion = BigNumber.from('1000000000000000000000000000');
    const pTokenPriceCeiling = BigNumber.from('1010000000000000000');
    const period = hours.mul(6);

    let theoryUnlocker = await hre.ethers.getContractAt("TheoryUnlocker", "0x24559C54724704F1B909eA668DD7C72df0B9BCcc");
    let theoryUnlockerGen1 = await hre.ethers.getContractAt("TheoryUnlockerGen1", "0x50bB33375af32EAf42af72c6004bAAd931042632");

    //await theoryUnlocker.setLevelURIs([0,2,3,4], [await theoryUnlocker.levelURIsURI(0),await theoryUnlocker.levelURIsURI(1),await theoryUnlocker.levelURIsURI(2),await theoryUnlocker.levelURIsURI(3)]);
    // await theoryUnlockerGen1.setDisableMint(true);
    // await theoryUnlockerGen1.setLevelURIs([0,2,3,4],
    //     [await theoryUnlockerGen1.levelURIsURI(0),await theoryUnlockerGen1.levelURIsURI(1),await theoryUnlockerGen1.levelURIsURI(2),await theoryUnlockerGen1.levelURIsURI(3)],
    //     [await theoryUnlockerGen1.levelURIsMax(0), await theoryUnlockerGen1.levelURIsMax(1), await theoryUnlockerGen1.levelURIsMax(2), await theoryUnlockerGen1.levelURIsMax(3)],
    //     [await theoryUnlockerGen1.levelURIsSupply(0),await theoryUnlockerGen1.levelURIsSupply(1),await theoryUnlockerGen1.levelURIsSupply(2),await theoryUnlockerGen1.levelURIsSupply(3)],
    //     [await theoryUnlockerGen1.levelURIsMinted(0),await theoryUnlockerGen1.levelURIsMinted(1),await theoryUnlockerGen1.levelURIsMinted(2),await theoryUnlockerGen1.levelURIsMinted(3)]
    // );
    // await theoryUnlockerGen1.setDisableMint(false);
    // await theoryUnlocker.mint(1);
    // await theoryUnlocker.mint(2);
    // await theoryUnlocker.mint(3);
    //await theoryUnlocker.mint(4);
    //await theoryUnlockerGen1.mint(1, 50);
    //await theoryUnlockerGen1.mint(2, 50);
    //await theoryUnlockerGen1.mint(3, 50);
    //await theoryUnlockerGen1.mint(4, 50);

    await theoryUnlocker.transferFrom(deployer.address, "0x916A7Dab2f474F287A0469bB1BcBB6Eb29a670EE", 8);
    await theoryUnlocker.transferFrom(deployer.address, "0x916A7Dab2f474F287A0469bB1BcBB6Eb29a670EE", 9);
    await theoryUnlocker.transferFrom(deployer.address, "0x916A7Dab2f474F287A0469bB1BcBB6Eb29a670EE", 10);
    await theoryUnlocker.transferFrom(deployer.address, "0x916A7Dab2f474F287A0469bB1BcBB6Eb29a670EE", 11);

    await theoryUnlockerGen1.transferFrom(deployer.address, "0x916A7Dab2f474F287A0469bB1BcBB6Eb29a670EE", 9);
    await theoryUnlockerGen1.transferFrom(deployer.address, "0x916A7Dab2f474F287A0469bB1BcBB6Eb29a670EE", 10);
    await theoryUnlockerGen1.transferFrom(deployer.address, "0x916A7Dab2f474F287A0469bB1BcBB6Eb29a670EE", 11);
    await theoryUnlockerGen1.transferFrom(deployer.address, "0x916A7Dab2f474F287A0469bB1BcBB6Eb29a670EE", 12);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
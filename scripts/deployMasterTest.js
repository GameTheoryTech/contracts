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

    const iTokenAddress = "0xCc8FF4E67B368797d0Bc16cae2D0E6a25d716F37";
    const pToken = await hre.ethers.getContractAt("Game", "0x9b343B2fF740E7d4935a4C26c8f94DaD73b5f2ad");
    const sToken = await hre.ethers.getContractAt("Theory", "0x330e5d339C84524B99a02Df30c086b01fcE41614");

    const theoreticsAddress = "0x8b1455618B07Fa4Ef1f67F9f85b8a7CE6588b513";
    const treasuryDAOAddress = "0x55c6B3105ace3752e2414930D8767Df50Fb2f513";

    const Master = await hre.ethers.getContractFactory("Master");
    const gToken = await Master.deploy(sToken.address,
        pToken.address,
        theoreticsAddress,
        treasuryDAOAddress,
        ["0xFfF54fcdFc0E4357be9577D8BC2B4579ce9D5C88",
            "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E" ,
            "0x168e509FE5aae456cDcAC39bEb6Fd56B6cb8912e" ,
            "0xF69FCB51A13D4Ca8A58d5a8D964e7ae5d9Ca8594" ,
            "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75" ,
            "0x82f0B8B456c1A451378467398982d4834b6829c1" ,
            "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83" ,
            "0x74b23882a30290451A17c44f4F05243b6b58C76d"]);
    await gToken.deployed();
    console.log("- MasterToken deployed to:", gToken.address);

    await pToken.addAuthorized(gToken.address);
    await sToken.connect(daofund).approve(gToken.address, BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"));

    // TBC Initialisation
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
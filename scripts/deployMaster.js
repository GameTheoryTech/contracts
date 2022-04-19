/* eslint-disable */
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {BigNumber} = require("@ethersproject/bignumber");

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

    const iTokenAddress = "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E";
    const pToken = await hre.ethers.getContractAt("Game", "0x56EbFC2F3873853d799C155AF9bE9Cb8506b7817");
    const sToken = await hre.ethers.getContractAt("Theory", "0x60787C689ddc6edfc84FCC9E7d6BD21990793f06");

    const theoreticsAddress = "0x670433FB874d4B7b94CF1D16E95fa241474E6787";
    const treasuryDAOAddress = "0x98F5cdda1489503e755Da30BEc5FCD341C949791";

    const Master = await hre.ethers.getContractFactory("Master");
    const gToken = await Master.deploy(sToken.address,
        pToken.address,
        theoreticsAddress,
        treasuryDAOAddress);
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
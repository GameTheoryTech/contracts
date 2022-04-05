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
    const pTokenAddress = "0x56EbFC2F3873853d799C155AF9bE9Cb8506b7817";
    const sToken = await hre.ethers.getContractAt("Theory", "0x60787C689ddc6edfc84FCC9E7d6BD21990793f06");

    const startTime = BigNumber.from(Math.floor(new Date('2022-03-28T12:00:00Z') / 1000));

    await hre.run("verify:verify", {
        address: '0x9d30Aa92b2C128850EE0336D5bEAE3AcD3A52c9c',
        constructorArguments: [
            iTokenAddress, oneHundred, oneHundred.mul(5), sToken.address, daofund.address,
            [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
            [BigNumber.from(5),BigNumber.from(10),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
            [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)], [
                "ipfs://bafkreias23kdbna4vobjcn4eyqm73gnq6malettxrvjwyefhmscngj5b2y",
                "ipfs://bafkreibdipabxlgucnrerdtgakwbg4ob4xua4qpfmk7sm57bnndywtuwvi",
                "ipfs://bafkreidvdxnldspflsqw35qlbdmhsyafyvbykzadptzjwatkh5gclhbrrm",
                "ipfs://bafkreif66egaonk5fa7ddfh4dnhtdx7c4z7fhz3dpp6exuw7kyu4stxkwu"]
        ],
    });

    const spookySwapFactory = await ethers.getContractAt("UniswapV2Factory", "0xEE4bC42157cf65291Ba2FE839AE127e3Cc76f741");
    const spookySwapRouter = await ethers.getContractAt("UniswapV2Router02", "0xa6AD18C2aC47803E193F75c3677b14BF19B94883");

    const theoryUnlocker = await hre.ethers.getContractAt("TheoryUnlocker", "0x9d30Aa92b2C128850EE0336D5bEAE3AcD3A52c9c");

    await hre.run("verify:verify", {
        address: '0x0329AF552A7541616e4f238d9697adC5b5FE2d06',
        constructorArguments: [
            iTokenAddress, [oneHundred.mul(5), oneHundred.mul(5)], [sToken.address, pTokenAddress], daofund.address, theoryUnlocker.address, spookySwapRouter.address,
            [zero, startTime.add(days.mul(15)), startTime.add(days.mul(15).mul(2)), startTime.add(days.mul(15).mul(3)), startTime.add(days.mul(15).mul(4)), startTime.add(days.mul(15).mul(5)), startTime.add(days.mul(15).mul(6)), startTime.add(days.mul(15).mul(7)), startTime.add(days.mul(15).mul(8)), startTime.add(days.mul(15).mul(9))],
            [BigNumber.from(5),BigNumber.from(10),BigNumber.from(15),BigNumber.from(20),BigNumber.from(25),BigNumber.from(30),BigNumber.from(35),BigNumber.from(40),BigNumber.from(45),BigNumber.from(50)],
            [zero,BigNumber.from(20),BigNumber.from(40),BigNumber.from(50)],
            ["ipfs://bafkreias23kdbna4vobjcn4eyqm73gnq6malettxrvjwyefhmscngj5b2y",
                "ipfs://bafkreibdipabxlgucnrerdtgakwbg4ob4xua4qpfmk7sm57bnndywtuwvi",
                "ipfs://bafkreidvdxnldspflsqw35qlbdmhsyafyvbykzadptzjwatkh5gclhbrrm",
                "ipfs://bafkreif66egaonk5fa7ddfh4dnhtdx7c4z7fhz3dpp6exuw7kyu4stxkwu"],
            [BigNumber.from(300),BigNumber.from(100),BigNumber.from(50),BigNumber.from(10)]
        ],
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
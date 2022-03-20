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

    await hre.run("verify:verify", {
        address: '0x56EbFC2F3873853d799C155AF9bE9Cb8506b7817',
        constructorArguments: [
        ],
    });

    await hre.run("verify:verify", {
        address: '0xFfF54fcdFc0E4357be9577D8BC2B4579ce9D5C88',
        constructorArguments: [
        ],
    });

    const genesisStartTime = BigNumber.from(Math.floor(new Date('2022-03-22T12:00:00Z') / 1000));
    const theoryStartTime = BigNumber.from(Math.floor(new Date('2022-03-25T12:00:00Z') / 1000));
    const theoreticsStartTime = BigNumber.from(Math.floor(new Date('2022-03-28T12:00:00Z') / 1000));

    await hre.run("verify:verify", {
        address: '0x60787C689ddc6edfc84FCC9E7d6BD21990793f06',
        constructorArguments: [
            theoryStartTime, daofund.address, devfund.address, theoryStartTime.add(years), theoryStartTime.add(years.mul(2))
        ],
    });

    await hre.run("verify:verify", {
        address: '0x98F5cdda1489503e755Da30BEc5FCD341C949791',
        constructorArguments: [
        ],
    });

    await hre.run("verify:verify", {
        address: '0x670433FB874d4B7b94CF1D16E95fa241474E6787',
        constructorArguments: [
        ],
    });

    await hre.run("verify:verify", {
        address: '0x9D5D593Cf8FB6bF3Edb1c1D6dAf37714aF1A0F6C',
        constructorArguments: [
            '0x56EbFC2F3873853d799C155AF9bE9Cb8506b7817', '0x98F5cdda1489503e755Da30BEc5FCD341C949791', genesisStartTime
        ],
    });

    // await hre.run("verify:verify", {
    //     address: '0x55DA8eC723D6300184770A7F3E8902d6eb524bA8',
    //     constructorArguments: [
    //         '0x60787C689ddc6edfc84FCC9E7d6BD21990793f06',
    //         '0x23Dc7737839E3C269F40fCF714f63781188caca1',
    //         theoryStartTime,
    //         weeks, // 7 days
    //         [BigNumber.from(256),BigNumber.from(128),BigNumber.from(96),BigNumber.from(64),BigNumber.from(56),BigNumber.from(48),BigNumber.from(40),BigNumber.from(32),BigNumber.from(28),BigNumber.from(24),BigNumber.from(20),BigNumber.from(16),BigNumber.from(15),BigNumber.from(14),BigNumber.from(13),BigNumber.from(12),BigNumber.from(11),BigNumber.from(10),BigNumber.from(9),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4)],
    //         [BigNumber.from(95), BigNumber.from(93), BigNumber.from(91), BigNumber.from(89), BigNumber.from(87), BigNumber.from(85), BigNumber.from(83), BigNumber.from(81), BigNumber.from(79), BigNumber.from(77), BigNumber.from(75), BigNumber.from(73), BigNumber.from(71), BigNumber.from(69), BigNumber.from(67), BigNumber.from(65), BigNumber.from(63), BigNumber.from(61), BigNumber.from(59), BigNumber.from(57), BigNumber.from(55), BigNumber.from(53), BigNumber.from(51), BigNumber.from(49), BigNumber.from(47), BigNumber.from(45), BigNumber.from(43), BigNumber.from(41), BigNumber.from(39), BigNumber.from(37), BigNumber.from(35), BigNumber.from(33), BigNumber.from(31), BigNumber.from(29), BigNumber.from(27), BigNumber.from(25), BigNumber.from(23), BigNumber.from(21), BigNumber.from(19), BigNumber.from(17), BigNumber.from(15), BigNumber.from(13), BigNumber.from(11), BigNumber.from(9), BigNumber.from(7), BigNumber.from(5), BigNumber.from(3), BigNumber.from(1)]
    //     ],
    // });

    await hre.run("verify:verify", {
        address: '0x9BCcC82c7fCdb24B57B4BE33f33AE82EBcaf464d',
        constructorArguments: [
            '0x168e509FE5aae456cDcAC39bEb6Fd56B6cb8912e',
            hours.mul(6),
            theoreticsStartTime
        ],
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
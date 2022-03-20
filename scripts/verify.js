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
        address: '0xe5c495DEE0A78a12e44d946b7E9931d46B35dF62',
        constructorArguments: [
        ],
    });

    await hre.run("verify:verify", {
        address: '0x02e808efd8a8cb8af0719c5270c64ab462535db7',
        constructorArguments: [
        ],
    });

    const genesisStartTime = BigNumber.from(Math.floor(new Date('2022-03-22T12:00:00Z') / 1000));
    const theoryStartTime = BigNumber.from(Math.floor(new Date('2022-03-25T12:00:00Z') / 1000));
    const theoreticsStartTime = BigNumber.from(Math.floor(new Date('2022-03-28T12:00:00Z') / 1000));

    await hre.run("verify:verify", {
        address: '0xDbF138c66cbacd169017d8bEcFBBEeD84f6e6315',
        constructorArguments: [
            theoryStartTime, daofund.address, devfund.address, theoryStartTime.add(years), theoryStartTime.add(years.mul(2))
        ],
    });

    await hre.run("verify:verify", {
        address: '0x23Dc7737839E3C269F40fCF714f63781188caca1',
        constructorArguments: [
        ],
    });

    await hre.run("verify:verify", {
        address: '0x57946Ca8796e2E77CB6b0836C5F98b3dF3282AEb',
        constructorArguments: [
        ],
    });

    await hre.run("verify:verify", {
        address: '0x69b41c842b1285fBE60da6095B906C017c5D27A7',
        constructorArguments: [
            '0xe5c495DEE0A78a12e44d946b7E9931d46B35dF62', '0x23Dc7737839E3C269F40fCF714f63781188caca1', genesisStartTime
        ],
    });

    // await hre.run("verify:verify", {
    //     address: '0x55DA8eC723D6300184770A7F3E8902d6eb524bA8',
    //     constructorArguments: [
    //         '0xDbF138c66cbacd169017d8bEcFBBEeD84f6e6315',
    //         '0x23Dc7737839E3C269F40fCF714f63781188caca1',
    //         theoryStartTime,
    //         weeks, // 7 days
    //         [BigNumber.from(256),BigNumber.from(128),BigNumber.from(96),BigNumber.from(64),BigNumber.from(56),BigNumber.from(48),BigNumber.from(40),BigNumber.from(32),BigNumber.from(28),BigNumber.from(24),BigNumber.from(20),BigNumber.from(16),BigNumber.from(15),BigNumber.from(14),BigNumber.from(13),BigNumber.from(12),BigNumber.from(11),BigNumber.from(10),BigNumber.from(9),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(8),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4),BigNumber.from(4)],
    //         [BigNumber.from(95), BigNumber.from(93), BigNumber.from(91), BigNumber.from(89), BigNumber.from(87), BigNumber.from(85), BigNumber.from(83), BigNumber.from(81), BigNumber.from(79), BigNumber.from(77), BigNumber.from(75), BigNumber.from(73), BigNumber.from(71), BigNumber.from(69), BigNumber.from(67), BigNumber.from(65), BigNumber.from(63), BigNumber.from(61), BigNumber.from(59), BigNumber.from(57), BigNumber.from(55), BigNumber.from(53), BigNumber.from(51), BigNumber.from(49), BigNumber.from(47), BigNumber.from(45), BigNumber.from(43), BigNumber.from(41), BigNumber.from(39), BigNumber.from(37), BigNumber.from(35), BigNumber.from(33), BigNumber.from(31), BigNumber.from(29), BigNumber.from(27), BigNumber.from(25), BigNumber.from(23), BigNumber.from(21), BigNumber.from(19), BigNumber.from(17), BigNumber.from(15), BigNumber.from(13), BigNumber.from(11), BigNumber.from(9), BigNumber.from(7), BigNumber.from(5), BigNumber.from(3), BigNumber.from(1)]
    //     ],
    // });

    await hre.run("verify:verify", {
        address: '0x8d71d82699D82cBbA1442daf28A17EF1154a5416',
        constructorArguments: [
            '0xBED27D20AB6C23003498184969A7982Cd8c68551',
            hours.mul(6),
            theoreticsStartTime
        ],
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
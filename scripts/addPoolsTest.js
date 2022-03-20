/* eslint-disable */
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {BigNumber} = require("@ethersproject/bignumber");

async function main() {
    const [deployer, daofund, devfund] = await hre.ethers.getSigners();

    const genesisPool = await hre.ethers.getContractAt("GameGenesisRewardPool", "0x4D201413F96597F2AA0479e5C3420E2a9B931dFD");
    const theoryRewardPool = await hre.ethers.getContractAt("TheoryRewardPool", "0xB32C0afAfAaADb6956D0f6F61940441CF026d5F9");
    const treasuryDAO = await hre.ethers.getContractAt("Treasury", "0x643f98fa70126dB82fd32c29473933Fe8c4BF507");
    const theory = await hre.ethers.getContractAt("Theory", "0x4D1f76eCF939902B26BD978ef47C73EfDE4Bc134");
    const game = await hre.ethers.getContractAt("Game", "0xAA96Af10683542DB10b52D7eDD8E4BbcD599A059");
    const theoretics = await hre.ethers.getContractAt("Theoretics", "0x5d5375525B824C34d216B9ec429F6E11e6DE0866");

    const iTokenAddress = "0x3C878751d9d9083564A9E102627cEeDe82e802B7";
    const pTokenPairAddress = "0x72d0EF9720B32e150f15f99DBE7EbD57b3753822";
    const sTokenPairAddress = "0xdf785f8a120A1B65DD2c0c2Bc98C7D70DDE8e017";

    // await genesisPool.add(7500,
    //     iTokenAddress,
    //     true,
    //     Math.floor(Date.now() / 1000));

    // await theoryRewardPool.add(35500,
    //     pTokenPairAddress,
    //     true,
    //     Math.floor(Date.now() / 1000));

    // await theoryRewardPool.add(24000,
    //     sTokenPairAddress,
    //     true,
    //     Math.floor(Date.now() / 1000));
    //await treasuryDAO.setExtraFunds("0x90dED1c9c35f06b7239429939832f7Ab896D0E06", 0, "0x29a92c81795D589B32E98Fd119568e738aE5952b", 0);
    //await theory.addAuthorized("0x0c55293767F6D1BAe0E807421Ef6C74DBE43e7a6");
    //await game.addAuthorized("0x9C1498Bf0bf5fD93973AF090f2A5Fe5A0D7d8bf8");
    //await theoretics.setLockUp(6, 3, BigNumber.from(10).pow(18).mul(4));
    await treasuryDAO.allocateSeigniorage();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
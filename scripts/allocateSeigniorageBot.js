/* eslint-disable */
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {BigNumber} = require("@ethersproject/bignumber");

async function run(delay) {
    const [deployer, daofund, devfund] = await hre.ethers.getSigners();

    const treasuryDAO = (await hre.ethers.getContractAt("Treasury", "0x23Dc7737839E3C269F40fCF714f63781188caca1")).connect(daofund);
    try
    {
        //Lazy
        if(await treasuryDAO.shouldAllocateSeigniorage()) {
            await treasuryDAO.allocateSeigniorage();
        }
    }
    catch(e)
    {
        console.error("Exception thrown", e.stack);
    }
    setTimeout(() => run(delay), delay);
}
run(60000).catch(r => run(60000)).then(r => {});
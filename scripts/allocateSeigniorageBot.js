/* eslint-disable */
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {BigNumber} = require("@ethersproject/bignumber");

async function run(delay) {
    const [deployer, daofund, devfund] = await hre.ethers.getSigners();

    const treasuryDAO = (await hre.ethers.getContractAt("Treasury", "0x98F5cdda1489503e755Da30BEc5FCD341C949791")).connect(daofund);
    try
    {
        //Lazy
        const shouldAllocate = await treasuryDAO.shouldAllocateSeigniorage();
        if(shouldAllocate) {
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
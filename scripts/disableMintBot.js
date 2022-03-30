/* eslint-disable */
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {BigNumber} = require("@ethersproject/bignumber");

async function run(delay) {
    const [deployer, daofund, devfund] = await hre.ethers.getSigners();

    const theoryUnlocker = (await hre.ethers.getContractAt("TheoryUnlocker", "0x9d30Aa92b2C128850EE0336D5bEAE3AcD3A52c9c"));
    try
    {
        //Lazy
        const totalSupply = await theoryUnlocker.totalSupply();
        if(totalSupply.gte(100)) {
            await theoryUnlocker.setDisableMint(true);
            return;
        }
    }
    catch(e)
    {
        console.error("Exception thrown", e.stack);
    }
    setTimeout(() => run(delay), delay);
}
run(1000).catch(r => run(1000)).then(r => {});
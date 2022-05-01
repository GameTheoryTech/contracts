/* eslint-disable */
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
	const buyToken = "0x9b343B2fF740E7d4935a4C26c8f94DaD73b5f2ad";  // game test token
	// const buyToken = "0xCc8FF4E67B368797d0Bc16cae2D0E6a25d716F37";  // dai test token
	const communityFund = "0x1c932aED5dE394e7D0eA8467A3Ee0989689a3B32";

	const Marketplace = await hre.ethers.getContractFactory('Marketplace')
	const marketplace = await Marketplace.deploy(buyToken, communityFund)
	await marketplace.deployed()
	console.log('Marketplace deployed to:', marketplace.address)

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
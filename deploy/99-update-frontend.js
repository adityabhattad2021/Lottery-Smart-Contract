// The title has 99 because we want this file to executed at last in call other deploy scripts

const { ethers } = require("hardhat");
const fs = require("fs");
const { networkConfig } = require("../helper-hardhat-config");

const FRONT_END_ADDRESSES_FILE =
	"../nextjs-smart-contract-lottery/constants/contractAddresses.json";
const FRONT_END_ABI_FILE = "../nextjs-smart-contract-lottery/constants/abi.json";

module.exports = async function () {
	if (process.env.UPDATE_FRONT_END) {
		console.log("Upadating frontend...");
        updateContractAddresses();
        updateABI()
	}
};

async function updateContractAddresses() {
	const lottery = await ethers.getContract("Lottery");
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8"));
    const chainId = network.config.chainId.toString()
	if (chainId in currentAddresses) {
		if (!currentAddresses[chainId].includes(lottery.address)) {
			currentAddresses[chainId].push(lottery.address);
		}
	} else {
		currentAddresses[chainId] = [lottery.address];
	}
	fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses));
}


async function updateABI() {
    const lottery = await ethers.getContract("Lottery")
    fs.writeFileSync(FRONT_END_ABI_FILE, lottery.interface.format(ethers.utils.FormatTypes.json))
    
}

module.exports.tags = ["all", "frontend"];

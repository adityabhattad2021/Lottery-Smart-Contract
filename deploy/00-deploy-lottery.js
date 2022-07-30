const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

const BASE_FEE = ethers.utils.parseEther("0.25"); // It will cost 0.25 links to pass the request
const GAS_PRICE_LINK = 1e9;

module.exports = async function ({ getNamedAccounts, deployments }) {
	const { deploy, log } = deployments;
	const { deployer } = await getNamedAccounts();
	const chainId = network.config.chainId;

    if (developmentChains.includes(network.name)) {
        log("-----------------------------------------------------")
        log("Local Network Detected, Deploying Mocks...");
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        })
        log("Mock Deployed Successfully!")
        log("-----------------------------------------------------")
    }
    

};


module.exports.tags=["all","mocks"]
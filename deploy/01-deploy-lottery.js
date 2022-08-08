const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
require("dotenv").config();

const { verify } = require("../utils/verify");

const VRF_SUBSCRIPTION_FUND_AMOUNT = "1000000000000000000000";

module.exports = async ({ getNamedAccounts, deployments }) => {
	const { deploy, log } = deployments;
	const { deployer } = await getNamedAccounts();
	const chainId = network.config.chainId;
	let vrfCoordinatorV2Address, subscriptionId;
	


	if (developmentChains.includes(network.name)) {
		const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
		vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
		const transectionResponse = await vrfCoordinatorV2Mock.createSubscription();
		const transectionRecipt = await transectionResponse.wait(1);
		subscriptionId = transectionRecipt.events[0].args.subId;
		await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUBSCRIPTION_FUND_AMOUNT);
	} else {
		vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
		subscriptionId = networkConfig[chainId]["subscriptionId"];
	}

	const entranceFeeToEnterTheLottery = networkConfig[chainId]["entranceFee"];
	const gasLane = networkConfig[chainId]["gasLane"]; // The gas lane to use, which specifies the maximum gas price to bump to.
	const callBackGasLimit = networkConfig[chainId]["callBackGasLimit"];
	const lotteryTimeInterval = networkConfig[chainId]["lotteryTimeInterval"];
	console.log(`-------------1---------${entranceFeeToEnterTheLottery}------------------------------`);
console.log(`-------------2---------${gasLane}------------------------------`);
console.log(`-------------3---------${callBackGasLimit}------------------------------`);
console.log(`-------------4---------${lotteryTimeInterval}------------------------------`);
console.log(`-------------5---------${subscriptionId}------------------------------`);

	const args = [
		vrfCoordinatorV2Address,
		entranceFeeToEnterTheLottery,
		gasLane,
		subscriptionId,
		callBackGasLimit,
		lotteryTimeInterval,
	];
	log("---------------------------Deploying Lottery-----------------------------");


	const lottery = await deploy("Lottery", {
		from: deployer,
		args: args,
		log: true,
		waitConfirmations: network.config.blockConfirmations || 1,
	});

	if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
		log("--------------------------------------------------------");
		await verify(lottery.address, args);
		log("--------------------------------------------------------");
	}
	log("---------------------------Deployed  Lottery-----------------------------");

};

module.exports.tags = ["all", "lottery"];

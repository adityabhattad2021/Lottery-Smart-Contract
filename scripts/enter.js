const { getNamedAccounts, ethers,network } = require("hardhat");


// A reminder to do it like this "yarn hardhat run scripts/enter.js --network localhost" on localhost.
async function main() {
	const { deployer } = await getNamedAccounts();
    const lottery = await ethers.getContract("Lottery", deployer);
    console.log(`Lottery address ${lottery.address}`);
	console.log("-----------------Entering the lottery as deployer-------------------------");
	const transectionResponse = await lottery.enterLottery({
		value: ethers.utils.parseEther("10"),
	});
	transectionRecipt = await transectionResponse.wait(1);
    console.log("-----------------Entered Lottery Successfully-----------------------------");
    
    const chainId = network.config.chainId;
    if (chainId == 31337) {
        console.log("Working");
    }
    
}

main()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		console.log(error);
		process.exit(1);
	});

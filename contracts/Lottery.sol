// What will this contract do?
// Players can enter a lottery(by paying some amount of ether).
// The contract will readomly select a winner in every fixed amount of time.- completely automatic.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
import "hardhat/console.sol";

error Lottery__NotEnoughETHEntered();
error Lottery__TransferFailed();
error Lottery__CurrentlyClosed();
error Lottery__UpkeepNotNeeded(uint256 currentBalance,uint256 numPlayers,uint256 lotteryState,bool isTimePassed,bool isUpKeepNeeded);





/**
 * @title A sample Lottery Smart Contract
 * @author Aditya Bhattad
 * @notice This contract is for creating an untamperable lottery
 * @dev This implements chainlinkVRFV2 and chainlinkKeepers
 */
contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {

	/* Type declerations */
	enum LotteryState {
		OPEN,
		CALCULATING
	} 


	/* State Variables */
	uint256 private immutable i_enterenceFee;
	address payable[] private s_players;
	uint256 public s_requestId;
	VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
	bytes32 private immutable i_gasLane;
	uint64 private immutable i_subscriptionId;
	uint16 private constant REQUEST_CONFIRMATIONS = 3;
	uint32 private immutable i_callBackGasLimit;
	uint32 private constant NUM_WORDS = 1;

	address private s_recentWinner;
	LotteryState private s_lotteryState;
	uint256 private s_lastTimeStamp;
	uint256 private immutable i_interval;

	/* Events */
	event LotteryEnter(address indexed player);
	event RequestedLotteryWinner(uint256 indexed requestId);
	event WinnerPicked(address indexed winner);


	constructor(
		address vrfCoordinatorV2,
		uint256 _enterenceFee,
		bytes32 gasLane,
		uint64 subscriptionId,
		uint32 callbackGasLimit,
		uint256 interval
	) VRFConsumerBaseV2(vrfCoordinatorV2) {
		i_enterenceFee = _enterenceFee;
		i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
		i_gasLane = gasLane;
		i_subscriptionId = subscriptionId;
		i_callBackGasLimit = callbackGasLimit;
		s_lotteryState=LotteryState.OPEN;
		s_lastTimeStamp = block.timestamp;
		i_interval = interval;
	}


	function enterLottery() public payable {
		if (msg.value < i_enterenceFee) {
			revert Lottery__NotEnoughETHEntered();
		}
		if(s_lotteryState==LotteryState.CALCULATING){
			revert Lottery__CurrentlyClosed();
		
		}
		s_players.push(payable(msg.sender));

		// Emmiting and event when we update our dynamic array or mapping.
		emit LotteryEnter(msg.sender);
	}

	/**
	 * @dev This is the function that the Chainlink Keeper nodes call 
	 * they look for the `upkeepNeeded` to return true
	 * the following should be true in order to return true:
	 * 1. Our time interval should have passed
	 * 2. The lottery should have at least 1 player, and have some ETH
	 * 3. Our sunscription is funded with LINK
	 * 4. Lottery should be in an open state
	 */
	function checkUpkeep(
		bytes memory /* checkData */
	)
	 	public
		override
	 	returns (
			bool upkeepNeeded,
			bytes memory /* performData */
		)	
	{
		bool isOpen = LotteryState.OPEN == s_lotteryState;
		bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
		bool hasPlayers = s_players.length>0;
		bool hasBalance = address(this).balance>0;
		upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
	}


	function performUpkeep(bytes calldata  /* performData */) 
		external
		override 
	{

		(bool upkeepNeeded, ) = checkUpkeep("");
		if(!upkeepNeeded){
			revert Lottery__UpkeepNotNeeded(
				address(this).balance,
				s_players.length,
				uint256(s_lotteryState),
				((block.timestamp - s_lastTimeStamp) > i_interval),
				upkeepNeeded
			);
		}

		s_lotteryState=LotteryState.CALCULATING;


		// Request the random number.

		// This will return request id
		s_requestId = i_vrfCoordinator.requestRandomWords(
			i_gasLane,
			i_subscriptionId,
			REQUEST_CONFIRMATIONS,
			i_callBackGasLimit,
			NUM_WORDS
		);

		// This line is redundant as VRFCoordinator is already emitting the requestId
		emit RequestedLotteryWinner(s_requestId);
	}


	function fulfillRandomWords(
		uint256, /*requestId*/
		uint256[] memory randomWords
	) internal override {
		uint256 indexOfWinner = randomWords[0] % s_players.length;
		address payable recentWinner = s_players[indexOfWinner];
		s_recentWinner = recentWinner;
		(bool success, ) = recentWinner.call{value: address(this).balance}("");

		if (!success) {
			revert Lottery__TransferFailed();
		}

		emit WinnerPicked(recentWinner);
		s_lotteryState=LotteryState.OPEN;
		s_players = new address payable[](0);
		s_lastTimeStamp=block.timestamp;
	}

	




	/* Getter Functions */

	function getEntrenceFee() public view returns (uint256) {
		return i_enterenceFee;
	}

	function getPlayer(uint256 index) public view returns (address) {
		return s_players[index];
	}

	function getRecentWinner() public view returns (address) {
		return s_recentWinner;
	}

	function getLotteryState() public view returns (LotteryState){
		return s_lotteryState;
	}

	function getNumberWords() public pure returns (uint256) {
		return NUM_WORDS;
	}

	function getNumberOfPlayers() public view returns(uint256){
		return s_players.length;
	}

	function getLatestTimeStamp() public view returns (uint256){
		return s_lastTimeStamp;
	}

	function getRequestConfirmations() public pure returns (uint256){
		return REQUEST_CONFIRMATIONS;
	}

	function getInterval() public view returns(uint256){
		return i_interval;
	}
	
}

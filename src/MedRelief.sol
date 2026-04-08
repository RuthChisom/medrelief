// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MedRelief
 * @dev A decentralized emergency medical funding protocol.
 * Users can deposit funds into a shared pool.
 * Requesters can create emergency funding requests.
 * Validators approve requests.
 * Once a threshold is reached, funds are released to the requester.
 */
contract MedRelief is AccessControl, ReentrancyGuard {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    uint256 public constant APPROVAL_THRESHOLD = 2;
    uint256 public constant MIN_STAKE = 0.1 ether;
    uint256 public constant LOCK_PERIOD = 1 days;
    uint256 public constant MAX_REQUEST = 2 ether;

    struct Request {
        address requester;
        uint256 amount;
        string reason;
        uint256 approvalCount;
        uint256 deadline;
        bool executed;
    }

    uint256 public requestCount;
    uint256 public totalValidators;
    //mapping 
    mapping(uint256 => Request) public requests;
    mapping(uint256 => mapping(address => bool)) public hasApproved;
    mapping(address => uint256) public validatorStake;
    mapping(address => uint256) public lastApprovalTime;
    mapping(address => uint256) public lastRequestTime;
    uint256 public constant REQUEST_COOLDOWN = 30 days;

    // User profile system
    struct UserProfile {
        string name;
        string ipfsHash; // medical docs / proof
        string social;   // twitter / contact
    }
    mapping(address => UserProfile) public profiles;
    mapping(address => uint256) public validatorScore;
    
    //events
    event Deposit(address indexed user, uint256 amount);
    event ValidatorStaked(address indexed validator, uint256 amount);
    event ValidatorUnstaked(address indexed validator, uint256 amount);
    event ValidatorSlashed(address indexed validator, uint256 amount);
    event RequestCreated(uint256 indexed requestId, address indexed requester, uint256 amount, string reason);
    event RequestApproved(uint256 indexed requestId, address indexed validator);
    event RequestExecuted(uint256 indexed requestId, address indexed requester, uint256 amount);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    //Become validator by staking ETH
    function stakeToValidate() external payable {
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        require(!hasRole(VALIDATOR_ROLE, msg.sender), "Already validator");

        validatorStake[msg.sender] += msg.value;
        _grantRole(VALIDATOR_ROLE, msg.sender);
        totalValidators++;

        emit ValidatorStaked(msg.sender, msg.value);
    }

    // Unstake with lock protection
    function unstake() external nonReentrant {
        require(hasRole(VALIDATOR_ROLE, msg.sender), "Not validator");
        require(
            block.timestamp >= lastApprovalTime[msg.sender] + LOCK_PERIOD,
            "Stake locked"
        );

        uint256 amount = validatorStake[msg.sender];
        require(amount > 0, "No stake");

        validatorStake[msg.sender] = 0;
        _revokeRole(VALIDATOR_ROLE, msg.sender);
        totalValidators--;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit ValidatorUnstaked(msg.sender, amount);
    }

    // Admin can slash malicious validators
    function slashValidator(address validator, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(validatorStake[validator] >= amount, "Not enough stake");

        if (validatorScore[validator] > 0) {
            validatorScore[validator] -= 1;
        }
        validatorStake[validator] -= amount;

        emit ValidatorSlashed(validator, amount);
    }

    /**
     * @dev Allows users to deposit funds into the pool.
     */
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Creates a new funding request.
     * @param amount The amount of ETH requested.
     * @param reason The reason for the request.
     */
    function createRequest(uint256 amount, string memory reason) external {
        require(!hasRole(VALIDATOR_ROLE, msg.sender), "Validators cannot request");
        require(lastRequestTime[msg.sender] == 0 || block.timestamp >= lastRequestTime[msg.sender] + REQUEST_COOLDOWN,
        "Cooldown active");
        require(amount > 0, "Amount must be > 0");
        require(amount <= MAX_REQUEST, "Exceeds max request");
        require(amount <= address(this).balance, "Insufficient pool");

        uint256 requestId = requestCount++;

        requests[requestId] = Request({
            requester: msg.sender,
            amount: amount,
            reason: reason,
            approvalCount: 0,
            deadline: block.timestamp + 3 days,
            executed: false
        });
        lastRequestTime[msg.sender] = block.timestamp;
        emit RequestCreated(requestId, msg.sender, amount, reason);
    }


    /**
     * @dev Allows validators to approve a request.
     * @param requestId The ID of the request to approve.
     */
    function approveRequest(uint256 requestId) external onlyRole(VALIDATOR_ROLE) {
        Request storage request = requests[requestId];
        require(requestId < requestCount, "Request does not exist");
        require(!request.executed, "Request already executed");
        require(!hasApproved[requestId][msg.sender], "Already approved by this validator");
        require(block.timestamp <= request.deadline, "Request expired");
        require(request.requester != msg.sender, "Cannot approve own");

        hasApproved[requestId][msg.sender] = true;
        request.approvalCount++;
        lastApprovalTime[msg.sender] = block.timestamp;
        validatorScore[msg.sender] += 1;


        emit RequestApproved(requestId, msg.sender);
    }

    /**
     * @dev Executes a request and transfers funds if the threshold is reached.
     * @param requestId The ID of the request to execute.
     */
    function executeRequest(uint256 requestId) external nonReentrant {
        Request storage request = requests[requestId];
        require(requestId < requestCount, "Request does not exist");
        require(!request.executed, "Request already executed");
        require(request.approvalCount >= APPROVAL_THRESHOLD, "Approval threshold not reached");
        require(address(this).balance >= request.amount, "Insufficient pool balance");

        request.executed = true;
        (bool success, ) = request.requester.call{value: request.amount}("");
        require(success, "Transfer failed");

        emit RequestExecuted(requestId, request.requester, request.amount);
    }

    /**
     * @dev Adds a new validator. Only admin can call.
     * @param validator The address to be added as a validator.
     */
    function addValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(VALIDATOR_ROLE, validator);
    }

    /**
     * @dev Removes a validator. Only admin can call.
     * @param validator The address to be removed from validators.
     */
   //Emergency remove validator
    function removeValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE){
        if (hasRole(VALIDATOR_ROLE, validator)) {
            _revokeRole(VALIDATOR_ROLE, validator);
            totalValidators--;
        }
    }


    function setProfile(string memory name, string memory ipfsHash, string memory social) external {
        profiles[msg.sender] = UserProfile(name, ipfsHash, social);
    }


    /**
     * @dev Fallback to receive ETH.
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
}

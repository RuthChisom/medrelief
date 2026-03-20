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

    struct Request {
        address requester;
        uint256 amount;
        string reason;
        uint256 approvalCount;
        bool executed;
    }

    uint256 public requestCount;
    mapping(uint256 => Request) public requests;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    event Deposit(address indexed user, uint256 amount);
    event RequestCreated(uint256 indexed requestId, address indexed requester, uint256 amount, string reason);
    event RequestApproved(uint256 indexed requestId, address indexed validator);
    event RequestExecuted(uint256 indexed requestId, address indexed requester, uint256 amount);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
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
        require(amount > 0, "Requested amount must be greater than 0");
        require(amount <= address(this).balance, "Insufficient pool balance");

        uint256 requestId = requestCount++;
        requests[requestId] = Request({
            requester: msg.sender,
            amount: amount,
            reason: reason,
            approvalCount: 0,
            executed: false
        });

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

        hasApproved[requestId][msg.sender] = true;
        request.approvalCount++;

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
    function removeValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(VALIDATOR_ROLE, validator);
    }

    /**
     * @dev Fallback to receive ETH.
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
}

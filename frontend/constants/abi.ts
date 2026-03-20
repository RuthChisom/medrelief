export const MED_RELIEF_ABI = [
  "function deposit() external payable",
  "function createRequest(uint256 amount, string memory reason) external",
  "function approveRequest(uint256 requestId) external",
  "function executeRequest(uint256 requestId) external",
  "function addValidator(address validator) external",
  "function removeValidator(address validator) external",
  "function requestCount() external view returns (uint256)",
  "function requests(uint256 requestId) external view returns (address requester, uint256 amount, string memory reason, uint256 approvalCount, bool executed)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
  "function VALIDATOR_ROLE() external view returns (bytes32)",
  "event Deposit(address indexed user, uint256 amount)",
  "event RequestCreated(uint256 indexed requestId, address indexed requester, uint256 amount, string reason)"
];

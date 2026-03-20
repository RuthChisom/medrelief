// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MedRelief.sol";

contract DeployMedRelief is Script {
    function run() external {
        // Retrieve the private key from the environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting transactions to the network
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the MedRelief contract
        MedRelief medRelief = new MedRelief();

        // Optional: Add an initial validator (e.g., the deployer)
        address deployerAddress = vm.addr(deployerPrivateKey);
        medRelief.addValidator(deployerAddress);

        console.log("MedRelief deployed at:", address(medRelief));
        console.log("Admin/Validator set to:", deployerAddress);

        vm.stopBroadcast();
    }
}

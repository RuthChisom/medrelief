"use client";
import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { MED_RELIEF_ABI } from '../constants/abi';
import { useWallet } from './useWallet';

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export function useMedRelief() {
  const { address: account, isConnected, connectWallet: connect, disconnectWallet } = useWallet();

  const getReadOnlyContract = useCallback(async () => {
    if (!ethers.isAddress(contractAddress)) throw new Error("Invalid contract address in ENV");
    
    let provider;
    if (window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      // Fallback to public RPC if MetaMask is not present for read-only
      provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.api.moonbase.moonbeam.network");
    }
    
    return new ethers.Contract(contractAddress, MED_RELIEF_ABI, provider);
  }, []);

  const getContract = useCallback(async () => {
    if (!window.ethereum) throw new Error("No crypto wallet found");
    if (!ethers.isAddress(contractAddress)) throw new Error("Invalid contract address in ENV");
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Check if code exists at the address
    const code = await provider.getCode(contractAddress);
    if (code === "0x" || code === "0x0") {
      throw new Error(`No contract found at ${contractAddress}. Did you deploy it to this network?`);
    }

    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, MED_RELIEF_ABI, signer);
  }, []);

  const deposit = async (ethAmount: string) => {
    const contract = await getContract();
    const tx = await contract.deposit({ value: ethers.parseEther(ethAmount) });
    return tx.wait();
  };

  const createRequest = async (ethAmount: string, reason: string) => {
    const contract = await getContract();
    const tx = await contract.createRequest(ethers.parseEther(ethAmount), reason);
    return tx.wait();
  };

  const approveRequest = async (id: number) => {
    const contract = await getContract();
    const tx = await contract.approveRequest(id);
    return tx.wait();
  };

  const executeRequest = async (id: number) => {
    const contract = await getContract();
    const tx = await contract.executeRequest(id);
    return tx.wait();
  };

  const addValidator = async (validator: string) => {
    const contract = await getContract();
    const tx = await contract.addValidator(validator);
    return tx.wait();
  };

  const removeValidator = async (validator: string) => {
    const contract = await getContract();
    const tx = await contract.removeValidator(validator);
    return tx.wait();
  };

  const checkIsAdmin = async (userAddress: string) => {
    try {
      const contract = await getReadOnlyContract();
      const adminRole = await contract.DEFAULT_ADMIN_ROLE();
      return await contract.hasRole(adminRole, userAddress);
    } catch (e) {
      return false;
    }
  };

  const checkIsValidator = async (userAddress: string) => {
    try {
      const contract = await getReadOnlyContract();
      const validatorRole = await contract.VALIDATOR_ROLE();
      return await contract.hasRole(validatorRole, userAddress);
    } catch (e) {
      return false;
    }
  };

  return {
    account,
    isConnected,
    connect,
    disconnect: disconnectWallet,
    deposit,
    createRequest,
    approveRequest,
    executeRequest,
    addValidator,
    removeValidator,
    checkIsAdmin,
    checkIsValidator,
    getContract,
    getReadOnlyContract
  };
}

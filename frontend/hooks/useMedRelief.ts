"use client";
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { MED_RELIEF_ABI } from '../constants/abi';

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export function useMedRelief() {
  const [account, setAccount] = useState<string | null>(null);

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

  const connect = async () => {
    if (!window.ethereum) return alert("Install MetaMask");
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(accounts[0]);
  };

  const deposit = async (ethAmount: string) => {
    if (!ethers.isAddress(contractAddress)) return alert("Invalid contract address");
    const contract = await getContract();
    const tx = await contract.deposit({ value: ethers.parseEther(ethAmount) });
    return tx.wait();
  };

  const createRequest = async (ethAmount: string, reason: string) => {
    if (!ethers.isAddress(contractAddress)) return alert("Invalid contract address");
    const contract = await getContract();
    const tx = await contract.createRequest(ethers.parseEther(ethAmount), reason);
    return tx.wait();
  };

  const approveRequest = async (id: number) => {
    if (!ethers.isAddress(contractAddress)) return alert("Invalid contract address");
    const contract = await getContract();
    const tx = await contract.approveRequest(id);
    return tx.wait();
  };

  const executeRequest = async (id: number) => {
    if (!ethers.isAddress(contractAddress)) return alert("Invalid contract address");
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
      const contract = await getContract();
      const adminRole = await contract.DEFAULT_ADMIN_ROLE();
      return await contract.hasRole(adminRole, userAddress);
    } catch (e) {
      return false;
    }
  };

  return { account, connect, deposit, createRequest, approveRequest, executeRequest, addValidator, removeValidator, checkIsAdmin, getContract };
}

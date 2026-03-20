import { ethers } from 'ethers';
import { MED_RELIEF_ABI } from '../constants/abi';

/**
 * Connect to MetaMask and return the user's address.
 */
export async function connectWallet(): Promise<string> {
  if (!window.ethereum) throw new Error("MetaMask not found");
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return accounts[0];
}

/**
 * Get an ethers provider or signer.
 */
export async function getProviderOrSigner(needSigner = false) {
  if (!window.ethereum) throw new Error("MetaMask not found");
  const provider = new ethers.BrowserProvider(window.ethereum);
  if (needSigner) {
    return await provider.getSigner();
  }
  return provider;
}

/**
 * Instantiate the MedRelief contract.
 */
export function getMedReliefContract(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
  if (!ethers.isAddress(address)) throw new Error("Invalid contract address");
  return new ethers.Contract(address, MED_RELIEF_ABI, signerOrProvider);
}

/**
 * --- MUTATIONS ---
 */

export async function deposit(contract: ethers.Contract, ethAmount: string) {
  const tx = await contract.deposit({ value: ethers.parseEther(ethAmount) });
  return await tx.wait();
}

export async function createRequest(contract: ethers.Contract, ethAmount: string, reason: string) {
  const tx = await contract.createRequest(ethers.parseEther(ethAmount), reason);
  return await tx.wait();
}

export async function approveRequest(contract: ethers.Contract, requestId: number) {
  const tx = await contract.approveRequest(requestId);
  return await tx.wait();
}

export async function executeRequest(contract: ethers.Contract, requestId: number) {
  const tx = await contract.executeRequest(requestId);
  return await tx.wait();
}

/**
 * --- READ-ONLY ---
 */

export async function fetchRequests(contract: ethers.Contract) {
  const count = await contract.requestCount();
  const requests = [];
  for (let i = 0; i < Number(count); i++) {
    const req = await contract.requests(i);
    requests.push({
      id: i,
      requester: req[0],
      amount: req[1],
      reason: req[2],
      approvalCount: req[3],
      executed: req[4]
    });
  }
  return requests;
}

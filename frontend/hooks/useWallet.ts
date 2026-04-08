"use client";
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      alert("MetaMask is not installed!");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];
      setAddress(userAddress);
      setIsConnected(true);
      localStorage.setItem('walletConnected', userAddress);
    } catch (error) {
      console.error("User denied account access", error);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    localStorage.removeItem('walletConnected');
  }, []);

  const autoConnect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') return;

    const savedAddress = localStorage.getItem('walletConnected');
    if (!savedAddress) return;

    try {
      // Check if the user is still logged into MetaMask and has given permission
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
      } else {
        // Clear storage if permissions were revoked in MetaMask
        localStorage.removeItem('walletConnected');
      }
    } catch (error) {
      console.error("Auto-connect failed", error);
    }
  }, []);

  useEffect(() => {
    autoConnect();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
          localStorage.setItem('walletConnected', accounts[0]);
        } else {
          disconnectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, [autoConnect, disconnectWallet]);

  return { address, isConnected, connectWallet, disconnectWallet };
}

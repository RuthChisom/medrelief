"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useMedRelief } from '../hooks/useMedRelief';

export default function Home() {
  const { account, connect, deposit, createRequest, approveRequest, executeRequest, addValidator, removeValidator, checkIsAdmin, getContract } = useMedRelief();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [formData, setFormData] = useState({ deposit: "", reqAmount: "", reqReason: "", validatorAddress: "" });
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkNetwork = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      setChainId(network.chainId.toString());
    }
  };

  const handleAction = async (action: () => Promise<any>) => {
    setError(null);
    try {
      await action();
      alert("Success!");
      fetchRequests();
    } catch (e: any) {
      console.error(e);
      setError(e.reason || e.message || "An error occurred");
    }
  };

  const fetchRequests = async () => {
    try {
      const contract = await getContract();
      const count = await contract.requestCount();
      const list = [];
      for (let i = 0; i < Number(count); i++) {
        const req = await contract.requests(i);
        list.push({ id: i, requester: req[0], amount: req[1], reason: req[2], approvals: req[3], executed: req[4] });
      }
      setRequests(list);
    } catch (e: any) { 
      console.error("Fetch Error:", e);
      checkNetwork();
    }
  };

  useEffect(() => { 
    if (account) {
      fetchRequests();
      checkNetwork();
      checkIsAdmin(account).then(setIsAdmin);
    }
  }, [account]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <h1>🏥 MedRelief Dashboard</h1>
      
      <div style={{ background: '#f0f0f0', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px', fontSize: '0.8rem' }}>
        <strong>Status:</strong> {account ? "Connected" : "Disconnected"} | 
        <strong> Chain ID:</strong> {chainId || "Unknown"} |
        <strong> Role:</strong> {isAdmin ? "Admin" : "User"}
      </div>

      {error && (
        <div style={{ background: '#ffeeee', color: '#cc0000', padding: '1rem', marginBottom: '1rem', border: '1px solid #ffcccc', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!account ? (
        <button onClick={connect} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Connect Wallet</button>
      ) : (
        <p>Connected: <code>{account}</code></p>
      )}

      {/* Admin Panel */}
      {isAdmin && (
        <section style={{ background: '#f9f9ff', border: '1px solid #dddde', padding: '1rem', borderRadius: '8px', margin: '1rem 0' }}>
          <h3>👑 Admin Panel: Manage Validators</h3>
          <input 
            placeholder="Address to Add/Remove" 
            value={formData.validatorAddress}
            onChange={e => setFormData({...formData, validatorAddress: e.target.value})} 
            style={{ width: '60%', padding: '0.4rem', marginRight: '0.5rem' }}
          />
          <button onClick={() => handleAction(() => addValidator(formData.validatorAddress))} style={{ background: '#4CAF50', color: 'white', padding: '0.4rem 0.8rem' }}>Add</button>
          <button onClick={() => handleAction(() => removeValidator(formData.validatorAddress))} style={{ background: '#ff4d4d', color: 'white', padding: '0.4rem 0.8rem', marginLeft: '0.5rem' }}>Remove</button>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
        {/* Deposit Section */}
        <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
          <h3>Deposit Funds</h3>
          <input 
            type="number" 
            placeholder="ETH" 
            value={formData.deposit}
            onChange={e => setFormData({...formData, deposit: e.target.value})} 
            style={{ width: '100%', padding: '0.4rem', marginBottom: '0.5rem' }}
          />
          <button onClick={() => handleAction(() => deposit(formData.deposit))} style={{ width: '100%', padding: '0.4rem' }}>Send ETH</button>
        </section>

        {/* Request Section */}
        <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
          <h3>Create Request</h3>
          <input 
            type="number" 
            placeholder="Amount (ETH)" 
            value={formData.reqAmount}
            onChange={e => setFormData({...formData, reqAmount: e.target.value})} 
            style={{ width: '100%', padding: '0.4rem', marginBottom: '0.5rem' }}
          />
          <input 
            placeholder="Reason" 
            value={formData.reqReason}
            onChange={e => setFormData({...formData, reqReason: e.target.value})} 
            style={{ width: '100%', padding: '0.4rem', marginBottom: '0.5rem' }}
          />
          <button onClick={() => handleAction(() => createRequest(formData.reqAmount, formData.reqReason))} style={{ width: '100', padding: '0.4rem' }}>Request Funds</button>
        </section>
      </div>

      <h2 style={{ marginTop: '2rem' }}>Emergency Requests</h2>
      <button onClick={fetchRequests} style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem' }}>🔄 Refresh</button>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {requests.length === 0 && <p>No requests found or contract not connected.</p>}
        {requests.map((req) => (
          <div key={req.id} style={{ border: '1px solid #eee', padding: '1rem', borderRadius: '8px', background: req.executed ? '#f9f9f9' : '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <p><strong>#{req.id} - {req.reason}</strong></p>
            <p>Amount: {ethers.formatEther(req.amount)} ETH | Approvals: {Number(req.approvals)}/2</p>
            <p style={{ fontSize: '0.8rem', color: '#666' }}>By: {req.requester}</p>
            
            {!req.executed && (
              <div style={{ marginTop: '0.5rem' }}>
                <button onClick={() => handleAction(() => approveRequest(req.id))} style={{ marginRight: '0.5rem', padding: '0.4rem 0.8rem' }}>👍 Approve</button>
                <button onClick={() => handleAction(() => executeRequest(req.id))} style={{ background: '#4CAF50', color: 'white', padding: '0.4rem 0.8rem', border: 'none', borderRadius: '4px' }}>🚀 Execute</button>
              </div>
            )}
            {req.executed && <span style={{ color: 'green', fontWeight: 'bold' }}>✅ Successfully Funded</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Image from 'next/image';
import { useMedRelief } from '../hooks/useMedRelief';

export default function Home() {
  const { account, isConnected, connect, disconnect, deposit, createRequest, approveRequest, executeRequest, addValidator, removeValidator, checkIsAdmin, getReadOnlyContract } = useMedRelief();

  const [requests, setRequests] = useState<any[]>([]);
  const [formData, setFormData] = useState({ deposit: "", reqAmount: "", reqReason: "", validatorAddress: "" });
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
      const contract = await getReadOnlyContract();
      const count = await contract.requestCount();
      const list = [];
      for (let i = 0; i < Number(count); i++) {
        const req = await contract.requests(i);
        list.push({ id: i, requester: req[0], amount: req[1], reason: req[2], approvals: req[3], executed: req[4] });
      }
      setRequests(list);
    } catch (e: any) {
      console.error("Fetch Error:", e);
    }
  };

  // Fetch requests on mount (no wallet required)
  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (isConnected && account) {
      checkIsAdmin(account).then(setIsAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [isConnected, account]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Image src="/assets/logo.png" alt="MedRelief Logo" width={40} height={40} style={{ borderRadius: '8px' }} />
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>MedRelief</h1>
        </div>

        {!isConnected ? (
          <button onClick={connect} style={{ padding: '0.5rem 1.2rem', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', fontWeight: 600 }}>
            Connect Wallet
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <code style={{ fontSize: '0.8rem', background: '#f0f0f0', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
              {account?.slice(0, 6)}...{account?.slice(-4)}
            </code>
            <button
              onClick={disconnect}
              style={{ padding: '0.3rem 0.8rem', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ddd', background: '#fafafa' }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* App Summary */}
      <div style={{ background: '#f9f9ff', border: '1px solid #e0e0f0', padding: '1rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
        <p style={{ margin: 0, color: '#444', lineHeight: '1.6' }}>
          MedRelief is a decentralized emergency medical funding platform. Community members can deposit ETH into a shared pool, submit funding requests for medical emergencies, and validators transparently approve disbursements on-chain — no middlemen, no delays.
        </p>
      </div>

      {error && (
        <div style={{ background: '#ffeeee', color: '#cc0000', padding: '1rem', marginBottom: '1rem', border: '1px solid #ffcccc', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Admin Panel — connected admins only */}
      {isConnected && isAdmin && (
        <section style={{ background: '#f9f9ff', border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>👑 Admin Panel: Manage Validators</h3>
          <input
            placeholder="Validator address"
            value={formData.validatorAddress}
            onChange={e => setFormData({ ...formData, validatorAddress: e.target.value })}
            style={{ width: '60%', padding: '0.4rem', marginRight: '0.5rem' }}
          />
          <button onClick={() => handleAction(() => addValidator(formData.validatorAddress))} style={{ background: '#4CAF50', color: 'white', padding: '0.4rem 0.8rem', border: 'none', borderRadius: '4px' }}>Add</button>
          <button onClick={() => handleAction(() => removeValidator(formData.validatorAddress))} style={{ background: '#ff4d4d', color: 'white', padding: '0.4rem 0.8rem', marginLeft: '0.5rem', border: 'none', borderRadius: '4px' }}>Remove</button>
        </section>
      )}

      {/* Deposit + Create Request — connected users only */}
      {isConnected && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>Deposit Funds</h3>
            <input
              type="number"
              placeholder="Amount in ETH"
              value={formData.deposit}
              onChange={e => setFormData({ ...formData, deposit: e.target.value })}
              style={{ width: '100%', padding: '0.4rem', marginBottom: '0.5rem', boxSizing: 'border-box' }}
            />
            <button onClick={() => handleAction(() => deposit(formData.deposit))} style={{ width: '100%', padding: '0.4rem' }}>Send ETH</button>
          </section>

          <section style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>Create Request</h3>
            <input
              type="number"
              placeholder="Amount (ETH)"
              value={formData.reqAmount}
              onChange={e => setFormData({ ...formData, reqAmount: e.target.value })}
              style={{ width: '100%', padding: '0.4rem', marginBottom: '0.5rem', boxSizing: 'border-box' }}
            />
            <input
              placeholder="Reason"
              value={formData.reqReason}
              onChange={e => setFormData({ ...formData, reqReason: e.target.value })}
              style={{ width: '100%', padding: '0.4rem', marginBottom: '0.5rem', boxSizing: 'border-box' }}
            />
            <button onClick={() => handleAction(() => createRequest(formData.reqAmount, formData.reqReason))} style={{ width: '100%', padding: '0.4rem' }}>Request Funds</button>
          </section>
        </div>
      )}

      {/* Emergency Requests — always visible */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Emergency Requests</h2>
        <button onClick={fetchRequests} style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}>🔄 Refresh</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {requests.length === 0 && <p style={{ color: '#888' }}>No emergency requests yet.</p>}
        {requests.map((req) => (
          <div key={req.id} style={{ border: '1px solid #eee', padding: '1rem', borderRadius: '8px', background: req.executed ? '#f9f9f9' : '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <p style={{ margin: '0 0 0.25rem' }}><strong>#{req.id} — {req.reason}</strong></p>
            <p style={{ margin: '0 0 0.25rem' }}>Amount: {ethers.formatEther(req.amount)} ETH | Approvals: {Number(req.approvals)}/2</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>By: {req.requester}</p>

            {isConnected && !req.executed && (
              <div style={{ marginTop: '0.75rem' }}>
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

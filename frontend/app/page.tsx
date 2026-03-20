"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Image from 'next/image';
import { useMedRelief } from '../hooks/useMedRelief';

export default function Home() {
  const {
    account, isConnected, connect, disconnect,
    deposit, createRequest, approveRequest, executeRequest,
    addValidator, removeValidator, checkIsAdmin, checkIsValidator, getReadOnlyContract,
  } = useMedRelief();

  const [requests, setRequests]   = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'executed'>('pending');
  const [formData, setFormData]   = useState({ deposit: '', reqAmount: '', reqReason: '', validatorAddress: '' });
  const [error, setError]         = useState<string | null>(null);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [isValidator, setIsValidator] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }));

  const handleAction = async (action: () => Promise<any>) => {
    setError(null);
    try {
      await action();
      alert('Success!');
      fetchRequests();
    } catch (e: any) {
      setError(e.reason || e.message || 'An error occurred');
    }
  };

  const fetchRequests = async () => {
    try {
      const contract = await getReadOnlyContract();
      const count = await contract.requestCount();
      const list = [];
      for (let i = 0; i < Number(count); i++) {
        const r = await contract.requests(i);
        list.push({ id: i, requester: r[0], amount: r[1], reason: r[2], approvals: Number(r[3]), executed: r[4] });
      }
      setRequests(list);
    } catch (e: any) {
      console.error('Fetch error:', e);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  useEffect(() => {
    if (isConnected && account) {
      checkIsAdmin(account).then(setIsAdmin);
      checkIsValidator(account).then(setIsValidator);
    } else {
      setIsAdmin(false);
      setIsValidator(false);
    }
  }, [isConnected, account]);

  const pending  = requests.filter(r => !r.executed);
  const executed = requests.filter(r =>  r.executed);
  const shown    = activeTab === 'pending' ? pending : executed;

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <Image src="/assets/logo.png" alt="MedRelief" width={32} height={32} />
            MedRelief
          </div>

          <div className="wallet-info">
            {!isConnected ? (
              <button className="btn-connect" onClick={connect}>Connect Wallet</button>
            ) : (
              <>
                <span className="wallet-address">
                  {account?.slice(0, 6)}…{account?.slice(-4)}
                </span>
                <button className="btn-disconnect" onClick={disconnect}>Disconnect</button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container">

        {/* ── Hero ───────────────────────────────────────────── */}
        <div className="hero">
          <h2>Decentralized Emergency Medical Funding</h2>
          <p>
            Community members deposit ETH into a shared pool. Patients submit
            funding requests for medical emergencies. Validators approve
            disbursements transparently — no middlemen, no delays.
          </p>
        </div>

        {/* ── Error ──────────────────────────────────────────── */}
        {error && (
          <div className="error-box"><strong>Error:</strong> {error}</div>
        )}

        {/* ── Admin: Manage Validators ────────────────────────── */}
        {isConnected && isAdmin && (
          <div className="card">
            <p className="card-title">👑 Manage Validators</p>
            <div className="field-row">
              <div className="field">
                <label>Validator Address</label>
                <input placeholder="0x…" value={formData.validatorAddress} onChange={set('validatorAddress')} />
              </div>
              <button className="btn-primary" onClick={() => handleAction(() => addValidator(formData.validatorAddress))}>Add</button>
              <button className="btn-danger"  onClick={() => handleAction(() => removeValidator(formData.validatorAddress))}>Remove</button>
            </div>
          </div>
        )}

        {/* ── Deposit + Create Request ────────────────────────── */}
        {isConnected && (
          <div className="grid-2">

            {/* Deposit */}
            <div className="card">
              <p className="card-title">Deposit Funds</p>
              <div className="field">
                <label>Amount (ETH)</label>
                <input type="number" placeholder="0.0" value={formData.deposit} onChange={set('deposit')} />
              </div>
              <button className="btn-primary" style={{ width: '100%' }}
                onClick={() => handleAction(() => deposit(formData.deposit))}>
                Send ETH
              </button>
            </div>

            {/* Create Request */}
            <div className="card">
              <p className="card-title">Create Request</p>
              <div className="field">
                <label>Amount (ETH)</label>
                <input type="number" placeholder="0.0" value={formData.reqAmount} onChange={set('reqAmount')} />
              </div>
              <div className="field">
                <label>Reason</label>
                <input placeholder="Brief description" value={formData.reqReason} onChange={set('reqReason')} />
              </div>
              <button className="btn-secondary" style={{ width: '100%' }}
                onClick={() => handleAction(() => createRequest(formData.reqAmount, formData.reqReason))}>
                Submit Request
              </button>
            </div>

          </div>
        )}

        {/* ── Emergency Requests ──────────────────────────────── */}
        <div className="card">
          <div className="section-header">
            <h2>Emergency Requests</h2>
            <button className="btn-ghost btn-sm" onClick={fetchRequests}>↻ Refresh</button>
          </div>

          {/* Tabs */}
          <div className="requests-tabs">
            <button
              className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending <span style={{ fontSize: '0.75rem', marginLeft: '4px' }}>({pending.length})</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'executed' ? 'active' : ''}`}
              onClick={() => setActiveTab('executed')}
            >
              Executed <span style={{ fontSize: '0.75rem', marginLeft: '4px' }}>({executed.length})</span>
            </button>
          </div>

          {/* Request list */}
          {shown.length === 0 ? (
            <div className="empty-state">
              {activeTab === 'pending' ? 'No pending requests.' : 'No executed requests yet.'}
            </div>
          ) : (
            shown.map(req => (
              <div key={req.id} className={`request-card ${req.executed ? 'executed' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="request-id">Request #{req.id}</span>
                  <span className={`badge ${req.executed ? 'badge-executed' : 'badge-pending'}`}>
                    {req.executed ? 'Funded' : 'Pending'}
                  </span>
                </div>

                <p className="request-reason">{req.reason}</p>

                <p className="request-meta">
                  {ethers.formatEther(req.amount)} ETH &nbsp;·&nbsp;
                  {req.approvals}/2 approvals &nbsp;·&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>{req.requester.slice(0, 8)}…</span>
                </p>

                {!req.executed && (
                  <div className="approvals-bar">
                    <div className="approvals-fill" style={{ width: `${(req.approvals / 2) * 100}%` }} />
                  </div>
                )}

                {isConnected && !req.executed && (
                  <div className="request-actions">
                    {isValidator && (
                      <button className="btn-ghost btn-sm"
                        onClick={() => handleAction(() => approveRequest(req.id))}>
                        👍 Approve
                      </button>
                    )}
                    <button className="btn-primary btn-sm"
                      onClick={() => handleAction(() => executeRequest(req.id))}>
                      🚀 Execute
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </main>
    </>
  );
}

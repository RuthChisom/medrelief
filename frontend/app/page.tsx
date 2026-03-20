"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Image from 'next/image';
import { useMedRelief } from '../hooks/useMedRelief';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/Toast';
import { parseError } from '../lib/parseError';

export default function Home() {
  const {
    account, isConnected, connect, disconnect,
    deposit, createRequest, approveRequest, executeRequest,
    addValidator, removeValidator, checkIsAdmin, checkIsValidator, getReadOnlyContract, getPoolBalance, getValidators,
  } = useMedRelief();

  const { toasts, notify, dismiss } = useToast();

  const [requests, setRequests]       = useState<any[]>([]);
  const [activeTab, setActiveTab]     = useState<'pending' | 'executed'>('pending');
  const [formData, setFormData]       = useState({ deposit: '', reqAmount: '', reqReason: '', validatorAddress: '' });
  const [isAdmin, setIsAdmin]         = useState(false);
  const [isValidator, setIsValidator] = useState(false);
  const [poolBalance, setPoolBalance] = useState<string | null>(null);
  const [validators, setValidators]   = useState<string[]>([]);
  const [errors, setErrors]           = useState({ deposit: '', reqAmount: '', reqReason: '', validatorAddress: '' });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [key]: e.target.value }));
    if (errors[key as keyof typeof errors]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  // Prevent '-', '+', 'e', 'E' in number inputs
  const blockNegativeKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
  };

  const validateAmount = (val: string) => {
    if (!val.trim()) return 'Amount is required.';
    if (isNaN(Number(val)) || Number(val) <= 0) return 'Enter a valid amount greater than 0.';
    return '';
  };
  const validateReason  = (val: string) => val.trim() ? '' : 'Reason is required.';
  const validateAddress = (val: string) => {
    if (!val.trim()) return 'Address is required.';
    if (!ethers.isAddress(val)) return 'Enter a valid Ethereum address.';
    return '';
  };

  const fetchPoolBalance = async () => {
    try {
      const bal = await getPoolBalance();
      setPoolBalance(ethers.formatEther(bal));
    } catch {
      setPoolBalance(null);
    }
  };

  // Central action runner — all contract calls go through here
  const handleAction = async (action: () => Promise<any>, successMsg: string) => {
    try {
      await action();
      notify('success', successMsg);
      fetchRequests();
      fetchPoolBalance();
    } catch (e: any) {
      notify('error', parseError(e));
    }
  };

  // Approve then auto-execute if threshold is met
  const handleApprove = async (req: any) => {
    try {
      await approveRequest(req.id);
      notify('success', `Request #${req.id} approved.`);

      // Re-fetch the request to check updated approval count
      const contract = await getReadOnlyContract();
      const r = await contract.requests(req.id);
      const updatedApprovals = Number(r[3]);
      const isExecuted = r[4];

      if (updatedApprovals >= 2 && !isExecuted) {
        try {
          await executeRequest(req.id);
          notify('success', `Request #${req.id} auto-executed and funded.`);
        } catch {
          // Already executed by another tx or failed — silently skip
        }
      }

      fetchRequests();
      fetchPoolBalance();
    } catch (e: any) {
      notify('error', parseError(e));
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

  const fetchValidators = async () => {
    try {
      const list = await getValidators();
      setValidators(list);
    } catch {
      setValidators([]);
    }
  };

  useEffect(() => { fetchRequests(); fetchPoolBalance(); fetchValidators(); }, []);

  useEffect(() => {
    if (isConnected && account) {
      Promise.all([checkIsAdmin(account), checkIsValidator(account)]).then(([adminResult, validatorResult]) => {
        setIsAdmin(adminResult);
        // Admin is always treated as a validator in the UI
        setIsValidator(adminResult || validatorResult);
        // If admin doesn't yet have VALIDATOR_ROLE on-chain, grant it automatically (one-time)
        if (adminResult && !validatorResult) {
          addValidator(account).catch(() => {});
        }
      });
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

        {/* ── Pool Balance ────────────────────────────────────── */}
        <div className="pool-balance-card">
          <span className="pool-balance-label">Pool Balance</span>
          <span className="pool-balance-value">
            {poolBalance !== null ? `${poolBalance} ETH` : '—'}
          </span>
        </div>

        {/* ── Admin: Manage Validators ────────────────────────── */}
        {isConnected && isAdmin && (
          <div className="card">
            <p className="card-title">👑 Manage Validators</p>

            {/* Add validator */}
            <div className="field-row">
              <div className="field">
                <label>Validator Address</label>
                <input placeholder="0x…" value={formData.validatorAddress} onChange={set('validatorAddress')} />
                {errors.validatorAddress && <span className="field-error">{errors.validatorAddress}</span>}
              </div>
              <button className="btn-primary"
                disabled={!formData.validatorAddress.trim()}
                onClick={() => {
                  const err = validateAddress(formData.validatorAddress);
                  if (err) { setErrors(prev => ({ ...prev, validatorAddress: err })); return; }
                  handleAction(
                    async () => { await addValidator(formData.validatorAddress); await fetchValidators(); },
                    'Validator added successfully.'
                  );
                }}>
                Add
              </button>
            </div>

            {/* Validator list */}
            {validators.length > 0 && (
              <div className="validator-list">
                {validators.map(addr => (
                  <div key={addr} className="validator-row">
                    <span className="validator-addr">{addr.slice(0, 10)}…{addr.slice(-6)}</span>
                    <button className="btn-danger btn-sm"
                      onClick={() => handleAction(
                        async () => { await removeValidator(addr); await fetchValidators(); },
                        'Validator removed.'
                      )}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            {validators.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}>No validators added yet.</p>
            )}
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
                <input
                  type="number" placeholder="0.0" min="0"
                  value={formData.deposit} onChange={set('deposit')} onKeyDown={blockNegativeKey}
                />
                {errors.deposit && <span className="field-error">{errors.deposit}</span>}
              </div>
              <button className="btn-primary" style={{ width: '100%' }}
                disabled={!formData.deposit.trim()}
                onClick={() => {
                  const err = validateAmount(formData.deposit);
                  if (err) { setErrors(prev => ({ ...prev, deposit: err })); return; }
                  handleAction(() => deposit(formData.deposit), `Successfully deposited ${formData.deposit} ETH.`);
                }}>
                Send ETH
              </button>
            </div>

            {/* Create Request */}
            <div className="card">
              <p className="card-title">Create Request</p>
              <div className="field">
                <label>Amount (ETH)</label>
                <input
                  type="number" placeholder="0.0" min="0"
                  value={formData.reqAmount} onChange={set('reqAmount')} onKeyDown={blockNegativeKey}
                />
                {errors.reqAmount && <span className="field-error">{errors.reqAmount}</span>}
              </div>
              <div className="field">
                <label>Reason</label>
                <input placeholder="Brief description" value={formData.reqReason} onChange={set('reqReason')} />
                {errors.reqReason && <span className="field-error">{errors.reqReason}</span>}
              </div>
              <button className="btn-secondary" style={{ width: '100%' }}
                disabled={!formData.reqAmount.trim() || !formData.reqReason.trim()}
                onClick={() => {
                  const amtErr = validateAmount(formData.reqAmount);
                  const rsErr  = validateReason(formData.reqReason);
                  if (amtErr || rsErr) { setErrors(prev => ({ ...prev, reqAmount: amtErr, reqReason: rsErr })); return; }
                  handleAction(() => createRequest(formData.reqAmount, formData.reqReason), 'Emergency request submitted successfully.');
                }}>
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
                        onClick={() => handleApprove(req)}>
                        👍 Approve
                      </button>
                    )}
                    <button className="btn-primary btn-sm"
                      onClick={() => handleAction(
                        () => executeRequest(req.id),
                        `Request #${req.id} funded successfully.`
                      )}>
                      🚀 Execute
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </main>

      {/* ── Toast notifications (fixed, bottom-right) ────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

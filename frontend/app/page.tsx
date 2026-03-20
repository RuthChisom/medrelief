"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Image from 'next/image';
import { useMedRelief } from '../hooks/useMedRelief';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/Toast';
import { parseError } from '../lib/parseError';

const REPORT_SECTIONS = [
  { key: 'emergencyType', label: 'Emergency Type' },
  { key: 'urgency',       label: 'Urgency' },
  { key: 'situation',     label: 'Situation' },
  { key: 'requestedUse',  label: 'Requested Use' },
  { key: 'notes',         label: 'Additional Notes' },
] as const;

type SectionKey = typeof REPORT_SECTIONS[number]['key'];

function formatReportSections(text: string): Record<SectionKey, string> {
  const empty: Record<SectionKey, string> = { emergencyType: '', urgency: '', situation: '', requestedUse: '', notes: '' };
  const pattern = /(?:emergency\s*type|urgency|situation|requested\s*use|additional\s*notes?)\s*[:\-–]/gi;
  const matches = [...text.matchAll(pattern)];
  if (matches.length === 0) return { ...empty, situation: text.trim() };
  const result = { ...empty };
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index! + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const value = text.slice(start, end).trim().replace(/[.\s]+$/, '');
    const lbl = m[0].toLowerCase();
    if (/emergency/.test(lbl))      result.emergencyType = value;
    else if (/urgency/.test(lbl))   result.urgency       = value;
    else if (/situation/.test(lbl)) result.situation     = value;
    else if (/requested/.test(lbl)) result.requestedUse  = value;
    else                            result.notes         = value;
  }
  return result;
}

function parseReason(raw: string): { reason: string; link: string; contact: string } {
  try {
    const p = JSON.parse(raw);
    if (p && typeof p.reason === 'string') {
      return { reason: p.reason, link: p.link ?? '', contact: p.contact ?? '' };
    }
  } catch {}
  return { reason: raw, link: '', contact: '' };
}

export default function Home() {
  const {
    account, isConnected, connect, disconnect,
    deposit, createRequest, approveRequest, executeRequest,
    addValidator, removeValidator, checkIsAdmin, checkIsValidator, getReadOnlyContract, getPoolBalance, getValidators,
  } = useMedRelief();

  const { toasts, notify, dismiss } = useToast();

  const [requests, setRequests]       = useState<any[]>([]);
  const [activeTab, setActiveTab]     = useState<'pending' | 'executed'>('pending');
  const [formData, setFormData]       = useState({ deposit: '', reqAmount: '', reqReason: '', reqLink: '', reqContact: '', validatorAddress: '' });
  const [isAdmin, setIsAdmin]         = useState(false);
  const [isValidator, setIsValidator] = useState(false);
  const [poolBalance, setPoolBalance] = useState<string | null>(null);
  const [validators, setValidators]   = useState<string[]>([]);
  const [modalReq, setModalReq]       = useState<any | null>(null);
  const [errors, setErrors]           = useState({ deposit: '', reqAmount: '', reqReason: '', reqLink: '', validatorAddress: '' });

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
  const validateUrl = (val: string) => {
    if (!val.trim()) return '';
    try {
      const url = new URL(val);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Link must start with http:// or https://';
      return '';
    } catch {
      return 'Enter a valid URL (e.g. https://example.com)';
    }
  };
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
              <div className="field">
                <label>More Info Link <span className="field-optional">(optional)</span></label>
                <input placeholder="https://…" value={formData.reqLink} onChange={set('reqLink')} />
                {errors.reqLink && <span className="field-error">{errors.reqLink}</span>}
              </div>
              <div className="field">
                <label>Contact Info <span className="field-optional">(optional)</span></label>
                <input placeholder="Email, phone, or handle" value={formData.reqContact} onChange={set('reqContact')} />
              </div>
              <button className="btn-secondary" style={{ width: '100%' }}
                disabled={!formData.reqAmount.trim() || !formData.reqReason.trim()}
                onClick={() => {
                  const amtErr = validateAmount(formData.reqAmount);
                  const rsErr  = validateReason(formData.reqReason);
                  const lnkErr = validateUrl(formData.reqLink);
                  if (amtErr || rsErr || lnkErr) { setErrors(prev => ({ ...prev, reqAmount: amtErr, reqReason: rsErr, reqLink: lnkErr })); return; }
                  const hasExtras = formData.reqLink.trim() || formData.reqContact.trim();
                  const payload = hasExtras
                    ? JSON.stringify({ reason: formData.reqReason.trim(), link: formData.reqLink.trim(), contact: formData.reqContact.trim() })
                    : formData.reqReason;
                  handleAction(() => createRequest(formData.reqAmount, payload), 'Emergency request submitted successfully.');
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

          {/* ── Validator guidance ──────────────────────────── */}
          {isValidator && (
            <div className="validator-guide">
              <p className="validator-guide-title">Validator checklist</p>
              <ul className="validator-guide-list">
                <li>Is the request description clear and specific?</li>
                <li>Does the reason reflect a genuine medical need?</li>
                <li>Does the urgency appear proportionate to the amount?</li>
                <li>Is the requested amount reasonable for the stated condition?</li>
                <li>Is the description consistent with no obvious contradictions?</li>
              </ul>
            </div>
          )}

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
            shown.map(req => {
              const parsed = parseReason(req.reason);
              const safeLink = parsed.link && /^https?:\/\//i.test(parsed.link) ? parsed.link : '';
              return (
              <div key={req.id} className={`request-card ${req.executed ? 'executed' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="request-id">Request #{req.id}</span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className="btn-ghost btn-sm" onClick={() => setModalReq(req)}>Details</button>
                    <span className={`badge ${req.executed ? 'badge-executed' : 'badge-pending'}`}>
                      {req.executed ? 'Funded' : 'Pending'}
                    </span>
                  </div>
                </div>

                <p className="request-reason">{parsed.reason}</p>

                <p className="request-meta">
                  {ethers.formatEther(req.amount)} ETH &nbsp;·&nbsp;
                  {req.approvals}/2 approvals &nbsp;·&nbsp;
                  <span style={{ fontFamily: 'monospace' }}>{req.requester.slice(0, 8)}…</span>
                </p>

                {(safeLink || parsed.contact) && (
                  <div className="req-extras">
                    {safeLink && (
                      <a href={safeLink} target="_blank" rel="noopener noreferrer" className="req-link">
                        View Details →
                      </a>
                    )}
                    {parsed.contact && (
                      <span className="req-contact">Contact: {parsed.contact}</span>
                    )}
                  </div>
                )}

                {!req.executed && (
                  <div className="approvals-bar">
                    <div className="approvals-fill" style={{ width: `${(req.approvals / 2) * 100}%` }} />
                  </div>
                )}

                {isConnected && !req.executed && isValidator && (
                  <div className="request-actions">
                    <button className="btn-ghost btn-sm"
                      onClick={() => handleApprove(req)}>
                      👍 Approve
                    </button>
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>

      </main>

      {/* ── Request details modal ───────────────────────────── */}
      {modalReq && (() => {
        const parsed   = parseReason(modalReq.reason);
        const sections = formatReportSections(parsed.reason);
        const safeLink = parsed.link && /^https?:\/\//i.test(parsed.link) ? parsed.link : '';
        return (
          <div className="modal-overlay" onClick={() => setModalReq(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>

              <div className="modal-header">
                <span className="modal-header-title">Request #{modalReq.id} — Details</span>
                <button className="modal-close" onClick={() => setModalReq(null)} aria-label="Close">✕</button>
              </div>

              <div className="modal-body">
                <div className="modal-meta">
                  <span>{ethers.formatEther(modalReq.amount)} ETH</span>
                  <span>{modalReq.approvals}/2 approvals</span>
                  <span style={{ fontFamily: 'monospace' }}>{modalReq.requester.slice(0, 10)}…</span>
                  <span className={`badge ${modalReq.executed ? 'badge-executed' : 'badge-pending'}`}>
                    {modalReq.executed ? 'Funded' : 'Pending'}
                  </span>
                </div>

                {REPORT_SECTIONS.map(({ key, label }) => (
                  <div key={key} className="report-section">
                    <span className="report-label">{label}</span>
                    <span className={`report-value${sections[key] ? '' : ' empty'}`}>
                      {sections[key] || '—'}
                    </span>
                  </div>
                ))}

                {(safeLink || parsed.contact) && (
                  <div className="modal-extras">
                    {safeLink && (
                      <a href={safeLink} target="_blank" rel="noopener noreferrer" className="req-link">
                        View More →
                      </a>
                    )}
                    {parsed.contact && (
                      <span className="req-contact">Contact: {parsed.contact}</span>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Toast notifications (fixed, bottom-right) ────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

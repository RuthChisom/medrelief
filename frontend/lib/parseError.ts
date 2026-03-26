/**
 * Converts raw ethers.js v6 / wallet errors into a short, readable sentence.
 *
 * Key fix: the `str()` helper ensures only real strings pass through —
 * preventing objects from being coerced to "[object Object]".
 */

// Returns the value only if it is a non-empty string; '' otherwise.
// This is the single guard against [object Object] leaking into messages.
const str = (val: unknown): string =>
  typeof val === 'string' && val.trim() ? val.trim() : '';

export function parseError(e: any): string {
  // ── 1. Wallet rejection ────────────────────────────────────────────────────
  if (e?.code === 4001 || e?.code === 'ACTION_REJECTED') {
    return 'Transaction cancelled — rejected in wallet.';
  }

  // ── 2. ethers v6 typed error codes ────────────────────────────────────────
  // These are set on the error object before any message is composed, so they
  // are the most reliable signal when present.
  switch (e?.code) {
    case 'INSUFFICIENT_FUNDS':
      return 'Insufficient ETH in your wallet.';
    case 'NETWORK_ERROR':
      return 'Network error — check your connection and try again.';
    case 'TIMEOUT':
      return 'Request timed out — please try again.';
    case 'NONCE_EXPIRED':
      return 'Transaction nonce expired — please try again.';
    case 'UNPREDICTABLE_GAS_LIMIT':
      return 'Transaction would fail — check your inputs and try again.';
    case 'CALL_EXCEPTION':
      // Fall through: extract the revert reason below via shortMessage / reason
      break;
  }

  // ── 3. Revert reason extraction (safe strings only) ───────────────────────
  // Priority order: specific reason fields → ethers v6 shortMessage → RPC message.
  // Every candidate is wrapped in str() so objects never reach the toLowerCase() call.
  const reason =
    str(e?.reason) ||
    str(e?.shortMessage) ||           // ethers v6: clean one-liner, always set on CALL_EXCEPTION
    str(e?.info?.error?.message) ||   // ethers v6: raw RPC-level error
    str(e?.error?.reason) ||
    str(e?.data?.message) ||          // legacy / some RPC providers
    str(e?.error?.data?.message) ||
    '';

  if (reason) {
    const r = reason.toLowerCase();

    // Contract-specific revert strings — keep these in sync with MedRelief.sol
    if (r.includes('not a validator'))       return 'Only validators can approve requests.';
    if (r.includes('already approved'))      return 'You have already approved this request.';
    if (r.includes('already executed'))      return 'This request has already been executed.';
    if (r.includes('not enough approval'))   return 'Not enough approvals to execute yet.';
    if (r.includes('insufficient balance'))  return 'Contract has insufficient balance to fund this.';
    if (r.includes('invalid address'))       return 'The address entered is not valid.';
    if (r.includes('insufficient funds'))    return 'Insufficient ETH in your wallet.';

    // Strip "execution reverted:" prefix that MetaMask / ethers prepends,
    // then return what remains — it's the raw revert string from the contract.
    return reason.replace(/^execution reverted:\s*/i, '');
  }

  // ── 4. e.message fallback ─────────────────────────────────────────────────
  // In ethers v6, e.message can be a verbose multi-line dump:
  //   "could not coalesce error (action="estimateGas", data="0x...", ...)"
  // Strip everything from the first " (action=" onwards and truncate.
  const raw = str(e?.message);
  if (raw) {
    if (raw.includes('insufficient funds')) return 'Insufficient ETH in your wallet.';
    if (raw.includes('No contract found'))  return raw;   // already short and readable
    if (raw.includes('network'))            return 'Network error — check your connection and try again.';
    if (raw.includes('Invalid contract'))   return 'Contract address is not configured correctly.';

    const clean = raw.replace(/\s*\(action=.*/s, '').trim();
    const msg   = clean || raw;
    return msg.length > 120 ? msg.slice(0, 120) + '…' : msg;
  }

  // ── 5. Plain-string throws (rare, but some wallet libs do this) ────────────
  if (typeof e === 'string' && e.trim()) return e.trim();

  return 'An unexpected error occurred.';
}

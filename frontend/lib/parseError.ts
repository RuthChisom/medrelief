/**
 * Converts raw ethers.js / contract errors into a short, readable sentence.
 * Add new cases here as the contract evolves.
 */
export function parseError(e: any): string {
  // User explicitly rejected in wallet
  if (e?.code === 4001 || e?.code === 'ACTION_REJECTED') {
    return 'Transaction cancelled — rejected in wallet.';
  }

  // Extract the revert reason from several possible locations ethers places it
  const reason: string =
    e?.reason ||
    e?.data?.message ||
    e?.error?.data?.message ||
    e?.error?.reason ||
    '';

  if (reason) {
    const r = reason.toLowerCase();
    if (r.includes('not a validator'))       return 'Only validators can approve requests.';
    if (r.includes('already approved'))      return 'You have already approved this request.';
    if (r.includes('already executed'))      return 'This request has already been executed.';
    if (r.includes('not enough approval'))   return 'Not enough approvals to execute yet.';
    if (r.includes('insufficient balance'))  return 'Contract has insufficient balance to fund this.';
    if (r.includes('invalid address'))       return 'The address entered is not valid.';
    // Return the raw reason if it doesn't match a known pattern, but strip
    // the leading "execution reverted:" prefix MetaMask often prepends
    return reason.replace(/^execution reverted:\s*/i, '');
  }

  const msg: string = e?.message || '';
  if (msg.includes('insufficient funds'))  return 'Insufficient ETH in your wallet.';
  if (msg.includes('No contract found'))   return msg;   // already readable
  if (msg.includes('network'))             return 'Network error — check your connection and try again.';
  if (msg.includes('Invalid contract'))    return 'Contract address is not configured correctly.';

  return msg || 'An unexpected error occurred.';
}

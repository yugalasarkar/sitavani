import React, { useState } from 'react';

interface NilaTipModalProps {
  recipientAddress: string;
  recipientName?: string;
  targetType: 'POST' | 'COMMENT';
  targetId: string;
  onClose: () => void;
  onSuccess?: (amount: number, txHash: string) => void;
}

const KASTURI_CHAIN_ID_HEX = '0x1a64c'; // 108108

export const NilaTipModal: React.FC<NilaTipModalProps> = ({
  recipientAddress,
  recipientName,
  targetType,
  targetId,
  onClose,
  onSuccess
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(5);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successHash, setSuccessHash] = useState<string | null>(null);

  const presets = [1, 5, 10, 50, 108];

  const handleSendTip = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('MetaMask not detected.');
      return;
    }

    const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (!finalAmount || finalAmount <= 0 || isNaN(finalAmount)) {
      setError('Please specify a valid Nīlā amount.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const eth = (window as any).ethereum;

      // Check / Switch network to Kasturi Chain (108108)
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: KASTURI_CHAIN_ID_HEX }]
        });
      } catch (switchError: any) {
        // If chain not added, add it
        if (switchError.code === 4902) {
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: KASTURI_CHAIN_ID_HEX,
              chainName: 'Kasturi Sovereign Chain',
              nativeCurrency: { name: 'NILA', symbol: 'NILA', decimals: 18 },
              rpcUrls: ['https://sitavani.com/rpc'],
              blockExplorerUrls: ['https://satya.yugala.org']
            }]
          });
        }
      }

      const accounts = await eth.request({ method: 'eth_accounts' });
      const sender = accounts[0];
      if (!sender) throw new Error('Please connect your MetaMask wallet.');

      // Calculate wei hex (10^18)
      const weiAmount = BigInt(Math.floor(finalAmount * 1e6)) * BigInt(1e12);
      const hexValue = '0x' + weiAmount.toString(16);

      // Send transaction
      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from: sender,
          to: recipientAddress,
          value: hexValue
        }]
      });

      // Record tip in backend
      const res = await fetch('/api/social/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientAddress,
          targetType,
          targetId,
          amountNila: finalAmount,
          chainTxHash: txHash
        })
      });

      if (!res.ok) {
        console.warn('Backend tip record warning, on-chain tx succeeded:', txHash);
      }

      setSuccessHash(txHash);
      onSuccess?.(finalAmount, txHash);
    } catch (err: any) {
      setError(err?.message || 'Transaction could not be completed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B0E17] border border-amber-900/60 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-fade-in text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <h3 className="font-serif font-bold text-base text-slate-100">
              दक्षिणा Nīlā (नीला) Dakṣiṇā Gift
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        {/* Recipient Details */}
        <div className="p-3 rounded-xl bg-[#07090E] border border-slate-800 text-xs font-mono space-y-1">
          <span className="text-slate-500">Recipient / Scholar:</span>
          <div className="text-amber-300 font-bold truncate">
            {recipientName || (recipientAddress.slice(0, 8) + '...' + recipientAddress.slice(-6))}
          </div>
          <div className="text-[10px] text-slate-500 truncate select-all">{recipientAddress}</div>
        </div>

        {/* Success State */}
        {successHash ? (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs font-mono text-emerald-300 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-sm">
              <span>✓</span>
              <span>Dakṣiṇā Successfully Transferred!</span>
            </div>
            <p className="text-slate-300">
              Gift recorded on Kasturi Chain ledger.
            </p>
            <div className="text-[11px] text-slate-300 break-all select-all pt-1">
              Tx: {successHash}
            </div>
            <div className="pt-1">
              <a
                href={`https://satya.yugala.org/tx/${successHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 text-xs font-mono"
              >
                <span>🔍 View on Satya Explorer (satya.yugala.org) ↗</span>
              </a>
            </div>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold uppercase text-xs"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Error banner */}
            {error && (
              <p className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-900 text-rose-300 text-xs font-mono">
                {error}
              </p>
            )}

            {/* Presets Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-slate-400">
                Select Nīlā Amount (Kasturi Chain Native):
              </label>
              <div className="grid grid-cols-5 gap-2 font-mono text-xs">
                {presets.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amt);
                      setCustomAmount('');
                    }}
                    className={`py-2 rounded-lg border font-bold transition-all ${
                      selectedAmount === amt && !customAmount
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20'
                        : 'bg-[#07090E] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {amt} 🪙
                  </button>
                ))}
              </div>

              {/* Custom Amount Input */}
              <div className="pt-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="Or enter custom Nīlā amount..."
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Network Note */}
            <div className="text-[11px] font-mono text-slate-500 flex justify-between items-center border-t border-slate-800/80 pt-3">
              <span>Network: Kasturi Chain (108108)</span>
              <span className="text-amber-400">Currency: Nīlā (नीला)</span>
            </div>

            {/* Send Button */}
            <button
              disabled={sending}
              onClick={handleSendTip}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-bold uppercase tracking-wider text-xs hover:brightness-110 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <span>🎁</span>
              <span>
                {sending
                  ? 'Confirming on Kasturi Chain...'
                  : `Gift ${customAmount || selectedAmount} NILA (दक्षिणा प्रेषयतु)`}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

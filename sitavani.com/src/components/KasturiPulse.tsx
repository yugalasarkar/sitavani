import React, { useState, useEffect } from 'react';

export const KasturiPulse: React.FC = () => {
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [synced, setSynced] = useState<boolean>(true);

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const res = await fetch('https://sitavani.com/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.result) {
            setBlockNumber(parseInt(data.result, 16));
            setSynced(true);
          }
        }
      } catch (e) {
        setSynced(false);
      }
    };

    fetchBlock();
    const timer = setInterval(fetchBlock, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-[11px] font-mono">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0A0D14] border border-amber-900/40 text-slate-300 shadow-sm">
        <span className={`w-2 h-2 rounded-full ${synced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
        <span className="text-amber-400 font-semibold">कस्तूरी EVM (108108)</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">
          Block: {blockNumber !== null ? (
            <a
              href={`https://satya.yugala.org/block/${blockNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 font-bold hover:underline"
              title="Inspect latest block on Satya Explorer"
            >
              #{blockNumber}
            </a>
          ) : (
            <span className="animate-pulse">Syncing...</span>
          )}
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-emerald-400 font-semibold">Nīlā (नीला)</span>
      </div>

      <a
        href="https://satya.yugala.org"
        target="_blank"
        rel="noopener noreferrer"
        className="px-2 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] transition-colors hidden sm:inline-flex items-center gap-1 font-semibold"
        title="Open Satya Sovereign Block Explorer"
      >
        <span>Satya Explorer ↗</span>
      </a>
    </div>
  );
};

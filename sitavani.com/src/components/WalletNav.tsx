import React, { useState, useEffect } from 'react';

interface SessionData {
  authenticated: boolean;
  address?: string;
  isAdmin?: boolean;
  user?: {
    wallet_address: string;
    display_name: string;
    role: string;
    karma_score: number;
    is_verified_authority: boolean;
  } | null;
}

export const WalletNav: React.FC = () => {
  const [session, setSession] = useState<SessionData>({ authenticated: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const connectWallet = async () => {
    setError(null);
    setLoading(true);

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('MetaMask or EVM wallet not detected.');
      setLoading(false);
      return;
    }

    try {
      const provider = (window as any).ethereum;
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      if (!address) throw new Error('No wallet address selected.');

      // 1. Fetch challenge nonce
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      if (!nonceRes.ok) throw new Error('Failed to retrieve authentication challenge.');
      const { nonce, message } = await nonceRes.json();

      // 2. Request signature
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, address]
      });

      // 3. Verify signature
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, nonce })
      });
      if (!verifyRes.ok) {
        const errJson = await verifyRes.json();
        throw new Error(errJson.error || 'Verification failed.');
      }

      const verifyData = await verifyRes.json();
      setSession({
        authenticated: true,
        address: verifyData.address,
        isAdmin: verifyData.isAdmin,
        user: verifyData.user
      });
      window.dispatchEvent(new CustomEvent('sitavani:wallet_changed', { detail: verifyData }));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Wallet connection interrupted.');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    setSession({ authenticated: false });
    window.dispatchEvent(new CustomEvent('sitavani:wallet_changed', { detail: null }));
  };

  if (session.authenticated && session.address) {
    const shortAddr = session.address.slice(0, 6) + '...' + session.address.slice(-4);
    const karma = session.user?.karma_score ?? 108;
    const isAcharya = session.isAdmin || session.user?.role === 'ADMIN' || session.user?.role === 'ACHARYA';

    return (
      <div className="flex items-center gap-2">
        {isAcharya && (
          <a
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-amber-500/60 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 transition-all"
            title="Ācārya Editorial Desk"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>सम्पादक Ācārya Desk</span>
          </a>
        )}

        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#0D1017] border border-amber-950/60 rounded-md text-xs">
          <span className="font-mono text-amber-300 font-semibold">{shortAddr}</span>
          <span className="text-amber-700">·</span>
          <span className="text-amber-400/90 font-mono font-medium" title="Dharmic Merit Score">
            पुण्य Puṇya: <span className="text-amber-200">{karma}</span>
          </span>
          <button
            onClick={disconnectWallet}
            className="ml-1 text-slate-500 hover:text-red-400 text-[11px] transition-colors"
            title="Disconnect"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-[11px] text-red-400 font-mono hidden md:inline">{error}</span>}
      <button
        onClick={connectWallet}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-amber-600/60 bg-gradient-to-r from-amber-500/15 to-orange-600/15 text-amber-200 hover:border-amber-400 hover:bg-amber-500/25 transition-all shadow-sm"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span>{loading ? 'संयोजनम्... Connecting...' : 'संयोजयतु Connect Wallet'}</span>
      </button>
    </div>
  );
};

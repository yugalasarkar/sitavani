import React, { useState, useEffect } from 'react';

interface PollWidgetProps {
  postId: string;
  question: string;
  options: string[];
}

export const PollWidget: React.FC<PollWidgetProps> = ({ postId, question, options }) => {
  const [votesByOption, setVotesByOption] = useState<Record<number, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [userSelected, setUserSelected] = useState<number | undefined>(undefined);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/social/poll?postId=${postId}`)
      .then(res => res.json())
      .then(data => {
        if (data.votesByOption) setVotesByOption(data.votesByOption);
        if (data.totalVotes !== undefined) setTotalVotes(data.totalVotes);
        if (data.userSelectedOption !== undefined) setUserSelected(data.userSelectedOption);
      })
      .catch(() => {});
  }, [postId]);

  const handleVote = async (optionIndex: number) => {
    setVoting(true);
    setError(null);
    try {
      const res = await fetch('/api/social/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, optionIndex })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Voting failed');

      setVotesByOption(data.votesByOption);
      setTotalVotes(data.totalVotes);
      setUserSelected(data.userSelectedOption);
    } catch (err: any) {
      setError(err?.message || 'Please connect your MetaMask wallet to participate.');
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="rounded-xl bg-[#090C13] border border-amber-900/50 p-5 space-y-4 my-3 text-slate-100 shadow-xl font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          <span className="font-serif font-bold text-sm text-amber-300">
            जनमत-संग्रहः • Dialectic Referendum & Poll
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          {totalVotes} {totalVotes === 1 ? 'मतेन (Vote)' : 'मतानि (Votes)'}
        </span>
      </div>

      <p className="font-serif text-sm font-semibold text-slate-200">
        {question}
      </p>

      {error && (
        <p className="p-2 rounded bg-rose-950/40 border border-rose-900 text-rose-300 text-[11px]">
          {error}
        </p>
      )}

      <div className="space-y-2.5">
        {options.map((opt, idx) => {
          const count = votesByOption[idx] || 0;
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = userSelected === idx;

          return (
            <button
              key={idx}
              type="button"
              disabled={voting}
              onClick={() => handleVote(idx)}
              className={`w-full text-left p-3 rounded-lg border transition-all relative overflow-hidden group ${
                isSelected
                  ? 'border-amber-400/80 bg-amber-500/10'
                  : 'border-slate-800 bg-[#06080E] hover:border-amber-500/40'
              }`}
            >
              {/* Progress bar background fill */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 transition-all duration-500 pointer-events-none"
                style={{ width: `${percentage}%` }}
              ></div>

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                    isSelected ? 'border-amber-400 bg-amber-400 text-black font-bold' : 'border-slate-700'
                  }`}>
                    {isSelected ? '✓' : ''}
                  </span>
                  <span className={`text-xs ${isSelected ? 'text-amber-200 font-bold' : 'text-slate-300'}`}>
                    {opt}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-slate-400">
                  <span>{percentage}%</span>
                  <span className="text-slate-600">({count})</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

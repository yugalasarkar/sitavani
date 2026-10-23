import React from 'react';
import { DisplayLanguage } from '../types';

interface FooterProps {
  language: DisplayLanguage;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ language, onOpenAdmin }) => {
  return (
    <footer className="border-t border-amber-950/40 bg-[#050608] text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-slate-900">
          
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-brand font-bold text-slate-200 tracking-wider text-base">
                SITAVANI <span className="text-amber-500 font-normal">|</span> सीतावाणी
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md font-sans">
              {language === 'hi' 
                ? 'धर्म पुनर्जागरण का संप्रभु समाचार मंच। मंदिर पुनरुद्धार, पुरातत्व, स्वदेशी रक्षा एवं भारतीय ज्ञान परंपरा की सत्यापित सूचना प्रणाली।'
                : 'Sovereign intelligence wire documenting positive milestones of the Dharmic Renaissance. Human-in-the-loop editorial verification across heritage, defense, and sciences.'}
            </p>
            <div className="text-[11px] font-mono text-slate-500">
              Host: <code className="text-amber-400/80">sitavani.yugala.org</code> · Topology: Next.js + PostgreSQL + Ingestion Daemon
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-amber-500 font-semibold mb-3">
              {language === 'hi' ? 'स्तंभ एवं श्रेणियां' : 'Editorial Desks'}
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Heritage & Repatriation (विरासत)</li>
              <li>Mandir & Sacred Geography (मंदिर)</li>
              <li>Aeronautical & Naval Defense (रक्षा)</li>
              <li>Space & Deep Science (विज्ञान)</li>
              <li>Sanskrit Epigraphy (संस्कृत)</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-amber-500 font-semibold mb-3">
              {language === 'hi' ? 'प्रणाली एवं नियंत्रण' : 'System & Protocols'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button 
                  onClick={onOpenAdmin}
                  className="hover:text-amber-300 text-slate-300 underline underline-offset-4 font-mono text-left"
                >
                  Editorial Desk (/admin) ↗
                </button>
              </li>
              <li className="text-slate-500">SHA-256 Deduplication Core</li>
              <li className="text-slate-500">Hourly RSS Ingestion Daemon</li>
              <li className="text-slate-500">Human Approval Gate (Status: ACTIVE)</li>
            </ul>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div>
            © 2026 SITAVANI Sovereign Wire. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Yugala Sovereign Infrastructure</span>
            <span>·</span>
            <span>Zero Slop Compliance</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

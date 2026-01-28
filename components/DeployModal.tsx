
import React, { useState } from 'react';
import { StrategyConfig } from '../types';
import { ShieldCheck, AlertTriangle, Key, Terminal, X, CheckCircle2 } from 'lucide-react';

interface DeployModalProps {
  strategy: StrategyConfig;
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (agentKey: string) => void;
}

const DeployModal: React.FC<DeployModalProps> = ({ strategy, isOpen, onClose, onDeploy }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [agentKey, setAgentKey] = useState('');
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700 bg-[#0f1115] flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-indigo-500" />
                    Deploy to Hyperliquid
                </h2>
                <p className="text-xs text-gray-500 mt-1">Run "{strategy.name}" on mainnet</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
            
            {step === 1 && (
                <div className="space-y-4">
                    <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-xl flex gap-3">
                        <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                        <div>
                            <h3 className="font-bold text-yellow-500 text-sm">Security Requirement: Agent Wallets</h3>
                            <p className="text-xs text-yellow-200/80 mt-1 leading-relaxed">
                                Never paste your main wallet's private key. Hyperliquid uses "API Agents". 
                                You must create a secondary wallet address and authorize it to trade on behalf of your main account.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-300">How to setup:</h4>
                        <ol className="list-decimal list-inside text-xs text-gray-400 space-y-2 ml-1">
                            <li>Go to Hyperliquid.xyz and connect your main wallet.</li>
                            <li>Navigate to <b>API</b> settings.</li>
                            <li>Create a new <b>API Agent</b>.</li>
                            <li>Copy the <b>Private Key</b> of that AGENT wallet (not your main seed phrase).</li>
                            <li>This agent can only trade, it cannot withdraw your funds.</li>
                        </ol>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${agreed ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600 bg-gray-800'}`}>
                                {agreed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={agreed} onChange={() => setAgreed(!agreed)} />
                            <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">I understand I should only use an Agent Key</span>
                        </label>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Paste Agent Private Key
                        </label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                                type="password" 
                                placeholder="0x..." 
                                value={agentKey}
                                onChange={(e) => setAgentKey(e.target.value)}
                                className="w-full bg-[#0f1115] border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-sm font-mono text-white focus:ring-1 focus:ring-indigo-500 outline-none placeholder-gray-600"
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">
                            This key will be encrypted and stored in our secure vault. It will execute trades based on: 
                            <span className="text-indigo-400"> {strategy.timeframe} candles</span>.
                        </p>
                    </div>

                    <div className="bg-[#0f1115] p-3 rounded-lg border border-gray-800">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Target Exchange</span>
                            <span className="text-white">Hyperliquid (Arbitrum)</span>
                        </div>
                         <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Max Risk</span>
                            <span className="text-red-400">{(strategy.stopLossPct * 100).toFixed(1)}% / trade</span>
                        </div>
                         <div className="flex justify-between text-xs text-gray-400">
                            <span>Leverage</span>
                            <span className="text-white">Isolated 1x (Safe Mode)</span>
                        </div>
                    </div>
                </div>
            )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-[#1e293b] flex justify-end gap-3">
            {step === 1 ? (
                <button 
                    onClick={() => setStep(2)} 
                    disabled={!agreed}
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    Next: Configure Key
                </button>
            ) : (
                <>
                    <button 
                        onClick={() => setStep(1)}
                        className="px-4 py-2.5 text-gray-400 text-sm font-medium hover:text-white"
                    >
                        Back
                    </button>
                    <button 
                        onClick={() => onDeploy(agentKey)}
                        disabled={agentKey.length < 10}
                        className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Launch Strategy
                    </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default DeployModal;

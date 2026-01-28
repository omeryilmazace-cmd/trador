import React, { useState, useEffect } from 'react';
import { generateMockData, PRESET_STRATEGIES } from './constants';
import { Candle, StrategyConfig, BacktestResult } from './types';
import ChartArea from './components/ChartArea';
import StrategyPanel from './components/StrategyPanel';
import DeployModal from './components/DeployModal';
import { analyzeChartPoints } from './services/geminiService';
import { runBacktest } from './services/backtestEngine';
import { BrainCircuit, Wallet, PlayCircle, LayoutDashboard, LogOut, CheckCircle2, Activity, Zap, Library, Save, Cpu } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [data, setData] = useState<Candle[]>([]);
  const [strategy, setStrategy] = useState<StrategyConfig | null>(null);
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [savedStrategies, setSavedStrategies] = useState<StrategyConfig[]>([]);
  
  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [paperTradingActive, setPaperTradingActive] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SAVED'>('DASHBOARD');

  // Initialize Data & Load Saved Strategies
  useEffect(() => {
    setData(generateMockData(60)); // 60 days of hourly data
    
    // Load from local storage (Simulating backend fetch)
    const saved = localStorage.getItem('my_strategies');
    if (saved) {
        try {
            setSavedStrategies(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to load strategies", e);
        }
    }
  }, []);

  // Handlers
  const handleUpdateStrategy = (newConfig: StrategyConfig) => {
    setStrategy(newConfig);
    const btResult = runBacktest(newConfig, data);
    setBacktest(btResult);
  };

  const handleSaveStrategy = (config: StrategyConfig) => {
      const newStrategy = {
          ...config,
          id: config.id || Math.random().toString(36).substr(2, 9),
          createdAt: config.createdAt || Date.now()
      };

      // Update current strategy in view to include the new ID
      setStrategy(newStrategy);
      
      setSavedStrategies(prev => {
          const others = prev.filter(s => s.id !== newStrategy.id);
          const updatedList = [newStrategy, ...others]; // Add new ones to top
          localStorage.setItem('my_strategies', JSON.stringify(updatedList));
          return updatedList;
      });
  };

  const handleDeleteStrategy = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updatedList = savedStrategies.filter(s => s.id !== id);
      setSavedStrategies(updatedList);
      localStorage.setItem('my_strategies', JSON.stringify(updatedList));
  };

  const handleGenerateStrategy = async () => {
    if (userPrompt.length < 5) {
      alert("Please describe a strategy in the text box (e.g., 'Buy when RSI is low').");
      return;
    }

    setIsGenerating(true);
    setStrategy(null);
    setBacktest(null);

    try {
        const generatedStrategy = await analyzeChartPoints(data, userPrompt);
        setStrategy(generatedStrategy);
        
        if (generatedStrategy) {
            const btResult = runBacktest(generatedStrategy, data);
            setBacktest(btResult);
        }
    } catch (e) {
        console.error(e);
        alert("Failed to generate strategy. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleLoadPreset = (preset: StrategyConfig) => {
    setStrategy(preset);
    setUserPrompt(`Loaded: ${preset.name}`);
    const btResult = runBacktest(preset, data);
    setBacktest(btResult);
    setActiveTab('DASHBOARD'); 
  };

  const handleDeployClick = () => {
     if(!walletConnected) {
         alert("Connect wallet first.");
         return;
     }
     if(backtest?.maxDrawdown && backtest.maxDrawdown > 0.15) {
         const confirm = window.confirm("Warning: This strategy has high drawdown. Are you sure you want to deploy?");
         if(!confirm) return;
     }
     setShowDeployModal(true);
  };

  const handleRealDeploy = async (agentKey: string) => {
      try {
          setShowDeployModal(false);

          // Send to Backend
          const response = await fetch('/api/deploy', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  strategy,
                  agentKey 
              })
          });

          const result = await response.json();

          if (result.success) {
            setLiveMode(true);
            console.log("Server Response:", result);
            alert("Strategy Deployed to Hyperliquid via Backend Agent! Monitor your position on the dashboard.");
          } else {
            alert("Deployment failed: " + result.error);
          }

      } catch (e) {
          console.error("Deploy Error", e);
          alert("Failed to connect to Strategy Server. Please try again.");
      }
  };

  return (
    <div className="min-h-screen flex bg-[#0f1115] text-gray-200 font-sans selection:bg-indigo-500 selection:text-white">
      
      {strategy && (
        <DeployModal 
            isOpen={showDeployModal}
            strategy={strategy}
            onClose={() => setShowDeployModal(false)}
            onDeploy={handleRealDeploy}
        />
      )}

      {/* Sidebar */}
      <aside className="w-16 lg:w-64 border-r border-gray-800 flex flex-col items-center lg:items-stretch py-6 flex-shrink-0 bg-[#0f1115] z-20">
        <div className="mb-8 px-4 flex items-center gap-3 justify-center lg:justify-start">
           <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <BrainCircuit className="text-white w-5 h-5" />
           </div>
           <span className="hidden lg:block font-bold text-lg tracking-tight text-white">Strategy<span className="text-indigo-400">Factory</span></span>
        </div>

        <nav className="flex-1 w-full space-y-2 px-2">
            <button 
                onClick={() => setActiveTab('DASHBOARD')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'DASHBOARD' ? 'bg-[#1e293b] text-white border border-gray-700' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
            >
                <LayoutDashboard className="w-5 h-5" />
                <span className="hidden lg:block font-medium text-sm">Dashboard</span>
            </button>
            
            <button 
                onClick={() => setActiveTab('SAVED')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'SAVED' ? 'bg-[#1e293b] text-white border border-gray-700' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
            >
                <Save className="w-5 h-5" />
                <span className="hidden lg:block font-medium text-sm">My Strategies</span>
                {savedStrategies.length > 0 && <span className="hidden lg:flex ml-auto bg-gray-800 text-xs px-2 py-0.5 rounded-full text-gray-400">{savedStrategies.length}</span>}
            </button>
            
            <div className="mt-4 pt-4 border-t border-gray-800 px-4">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2 hidden lg:block">History</p>
                {/* Mini list of saved items */}
                <div className="space-y-1 hidden lg:block">
                    {savedStrategies.slice(0,3).map(s => (
                        <div key={s.id} onClick={() => handleLoadPreset(s)} className="text-xs text-gray-400 hover:text-indigo-400 cursor-pointer truncate py-1">
                            {s.name}
                        </div>
                    ))}
                </div>
            </div>
        </nav>

        <div className="px-4 pb-4 w-full">
            <button 
                onClick={() => setWalletConnected(!walletConnected)}
                className={`w-full flex items-center justify-center lg:justify-start gap-2 px-4 py-3 rounded-xl border transition-all ${walletConnected ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400' : 'bg-indigo-600 hover:bg-indigo-700 border-transparent text-white shadow-lg shadow-indigo-900/50'}`}
            >
                <Wallet className="w-4 h-4" />
                <span className="hidden lg:block text-sm font-semibold">
                    {walletConnected ? '0x71...3A' : 'Connect Wallet'}
                </span>
                {walletConnected && <CheckCircle2 className="w-3 h-3 ml-auto hidden lg:block" />}
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-[#0f1115]/95 backdrop-blur z-10">
            <h1 className="text-xl font-semibold text-white">Bitcoin / USD Perpetual</h1>
            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-900/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    AI System Online
                 </div>
                 <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
                    <Cpu className="w-4 h-4 text-indigo-500" />
                    Hyperliquid Connected
                 </div>
            </div>
        </header>

        {/* Content Grid */}
        <div className="flex-1 overflow-hidden p-6">
            
            {activeTab === 'SAVED' ? (
                <div className="h-full overflow-y-auto">
                    <h2 className="text-2xl font-bold mb-6">Saved Strategies</h2>
                    {savedStrategies.length === 0 ? (
                        <div className="text-center py-20 text-gray-500 bg-[#1e293b] rounded-xl border border-gray-700">
                            <Save className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No strategies saved yet. Go to Dashboard to create one.</p>
                            <button onClick={() => setActiveTab('DASHBOARD')} className="mt-4 text-indigo-400 hover:underline">Create Strategy</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {savedStrategies.map(s => (
                                <div key={s.id} className="bg-[#1e293b] border border-gray-700 rounded-xl p-5 hover:border-indigo-500 transition-colors group relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-white text-lg">{s.name}</h3>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleLoadPreset(s)} className="text-indigo-400 hover:text-white bg-indigo-900/30 p-1.5 rounded">
                                                <PlayCircle className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => handleDeleteStrategy(s.id!, e)} className="text-gray-500 hover:text-red-400 bg-gray-800 p-1.5 rounded">
                                                <LogOut className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-400 line-clamp-2 mb-4 h-10">{s.description}</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 border-t border-gray-700 pt-3">
                                        <div>Stop Loss: <span className="text-red-400">{(s.stopLossPct*100).toFixed(1)}%</span></div>
                                        <div>Take Profit: <span className="text-green-400">{(s.takeProfitPct*100).toFixed(1)}%</span></div>
                                        <div>Timeframe: <span className="text-white">{s.timeframe}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-12 gap-6 h-full">
                    
                    {/* Left Col: Chart & Input (8 cols) */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full overflow-y-auto pb-20 scrollbar-hide">
                        
                        {/* Chart Component */}
                        <ChartArea 
                            data={data} 
                            trades={backtest?.trades || []}
                            strategy={strategy} 
                        />

                        {/* Input Area */}
                        <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-6 shadow-xl">
                            
                            {/* Tabs / Header for Input */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-semibold flex items-center gap-2">
                                    <BrainCircuit className="w-4 h-4 text-indigo-400"/>
                                    Strategy Studio
                                </h3>
                            </div>

                            <div className="flex flex-col gap-6">
                                
                                {/* Preset Strategy Library */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                                        <Library className="w-3 h-3" /> Quick Start / Templates
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {PRESET_STRATEGIES.map((preset, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => handleLoadPreset(preset)}
                                                className="text-left p-2.5 rounded-lg border border-gray-700 bg-[#0f1115] hover:bg-gray-800 hover:border-indigo-500 transition-all group"
                                            >
                                                <div className="font-semibold text-xs text-gray-200 group-hover:text-white flex items-center gap-1">
                                                    <Zap className="w-3 h-3 text-yellow-500" />
                                                    {preset.name}
                                                </div>
                                                <div className="text-[10px] text-gray-500 truncate mt-1">
                                                    {preset.description}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Manual Input */}
                                <div className="flex gap-4">
                                    <textarea 
                                        value={userPrompt}
                                        onChange={(e) => setUserPrompt(e.target.value)}
                                        placeholder="Describe your strategy here. Examples:
- 'Buy when RSI is below 30 and price crosses above SMA 20'
- 'Scalping strategy for high volatility'
- 'Trend following on 4H timeframe'"
                                        className="flex-1 bg-[#0f1115] border border-gray-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-24 text-gray-300 placeholder-gray-600"
                                    />
                                    <div className="flex flex-col gap-2 justify-end w-40">
                                        <button 
                                            onClick={() => { setStrategy(null); setBacktest(null); setUserPrompt(''); }}
                                            className="w-full px-4 py-2 text-xs font-medium text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
                                        >
                                            Reset
                                        </button>
                                        <button 
                                            onClick={handleGenerateStrategy}
                                            disabled={isGenerating}
                                            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-indigo-900/40 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isGenerating ? 'AI Thinking...' : 'Generate'}
                                            {!isGenerating && <BrainCircuit className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>

                    {/* Right Col: Strategy Panel (4 cols) */}
                    <div className="col-span-12 lg:col-span-4 h-full border-l border-gray-800 pl-6 lg:block hidden">
                        <StrategyPanel 
                            strategy={strategy} 
                            backtest={backtest} 
                            isGenerating={isGenerating} 
                            onUpdateStrategy={handleUpdateStrategy}
                            onSaveStrategy={handleSaveStrategy}
                        />
                        
                        {strategy && backtest && (
                            <div className="mt-6 space-y-3">
                                {!paperTradingActive && !liveMode && (
                                    <button 
                                        onClick={() => setPaperTradingActive(true)}
                                        className="w-full py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors border border-gray-600"
                                    >
                                        Start Paper Trading
                                    </button>
                                )}

                                {paperTradingActive && !liveMode && (
                                    <div className="space-y-3 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl">
                                        <div className="flex justify-between text-sm text-indigo-200">
                                            <span>Paper PnL (Live)</span>
                                            <span className="font-mono text-white">+$124.50</span>
                                        </div>
                                        <button 
                                            onClick={handleDeployClick}
                                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-lg hover:opacity-90 transition-all shadow-lg shadow-emerald-900/20"
                                        >
                                            Deploy Real Capital ($)
                                        </button>
                                    </div>
                                )}

                                {liveMode && (
                                    <div className="p-4 bg-emerald-900/10 border border-emerald-500/30 rounded-xl flex items-center justify-center flex-col gap-2">
                                        <Activity className="w-8 h-8 text-emerald-500 animate-pulse" />
                                        <h3 className="font-bold text-emerald-400">Live Execution Active</h3>
                                        <p className="text-xs text-center text-emerald-200/60">Trades are routing to Hyperliquid via secure API.</p>
                                        <button onClick={() => setLiveMode(false)} className="mt-2 text-xs text-red-400 hover:text-red-300 underline">Emergency Stop</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
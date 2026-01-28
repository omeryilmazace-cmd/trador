import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine } from 'recharts';
import { Candle, OrderType, Trade, StrategyConfig } from '../types';
import { Crosshair, LineChart as ChartIcon } from 'lucide-react';

interface ChartAreaProps {
  data: Candle[];
  trades?: Trade[]; 
  strategy?: StrategyConfig | null; 
}

const ChartArea: React.FC<ChartAreaProps> = ({ data, trades = [], strategy }) => {
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  const handleMouseMove = (e: any) => {
    if (e && e.activePayload && e.activePayload[0]) {
      const payload = e.activePayload[0].payload;
      if (hoveredCandle?.timestamp !== payload.timestamp) {
        setHoveredCandle(payload);
      }
    } else {
      if (hoveredCandle !== null) {
        setHoveredCandle(null);
      }
    }
  };

  return (
    <div className="bg-[#1e293b] rounded-xl border border-gray-700 shadow-xl overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#0f1115]">
        <div className="flex items-center gap-2">
          <h2 className="text-gray-100 font-semibold flex items-center gap-2">
            <ChartIcon className="w-5 h-5 text-indigo-400" />
            Strategy Canvas
          </h2>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">BTC/USD - 1H</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
           <span>Displaying {data.length} Candles</span>
        </div>
      </div>

      <div className="flex-1 w-full relative group cursor-default">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={data} 
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredCandle(null)}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(tick) => new Date(tick).toLocaleDateString()} 
              stroke="#475569" 
              tick={{fontSize: 10}}
              minTickGap={50}
            />
            <YAxis 
              domain={['auto', 'auto']} 
              stroke="#475569" 
              tick={{fontSize: 10}} 
              width={60}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
              labelFormatter={(label) => new Date(label).toLocaleString()}
            />
            <Area 
              type="monotone" 
              dataKey="close" 
              stroke="#818cf8" 
              fillOpacity={1} 
              fill="url(#colorPrice)" 
              strokeWidth={2}
              isAnimationActive={false}
            />
            
            {/* Visualizing SL/TP Lines for Executed Trades */}
            {strategy && trades.map((trade, idx) => {
                 const isBuy = trade.type === OrderType.BUY;
                 // Calculate Levels based on entry price and strategy %
                 const slPrice = isBuy 
                    ? trade.entryPrice * (1 - strategy.stopLossPct) 
                    : trade.entryPrice * (1 + strategy.stopLossPct);
                 
                 const tpPrice = isBuy 
                    ? trade.entryPrice * (1 + strategy.takeProfitPct) 
                    : trade.entryPrice * (1 - strategy.takeProfitPct);

                 // Check if data is available to prevent crash
                 const lastTimestamp = data.length > 0 ? data[data.length - 1].timestamp : 0;
                 const endTime = trade.exitTime || lastTimestamp;

                 return (
                    <React.Fragment key={`trade-lines-${idx}`}>
                        {/* SL Line - Red Dashed */}
                        <ReferenceLine 
                            segment={[{ x: trade.entryTime, y: slPrice }, { x: endTime, y: slPrice }]} 
                            stroke="#f87171" 
                            strokeDasharray="3 3" 
                            opacity={0.6}
                            strokeWidth={1}
                        />
                        {/* TP Line - Green Dashed */}
                        <ReferenceLine 
                            segment={[{ x: trade.entryTime, y: tpPrice }, { x: endTime, y: tpPrice }]} 
                            stroke="#4ade80" 
                            strokeDasharray="3 3" 
                            opacity={0.6}
                            strokeWidth={1}
                        />
                        {/* Connection Line (optional, connects entry to exit) */}
                        <ReferenceLine 
                             segment={[{ x: trade.entryTime, y: trade.entryPrice }, { x: endTime, y: trade.exitPrice || trade.entryPrice }]} 
                             stroke={trade.pnl > 0 ? '#4ade80' : '#f87171'}
                             strokeOpacity={0.3}
                        />
                    </React.Fragment>
                 )
            })}

            {/* Trade Entry/Exit Points */}
            {trades.map((trade, idx) => (
                <React.Fragment key={`trade-dots-${idx}`}>
                    {/* Entry Dot */}
                    <ReferenceDot
                        x={trade.entryTime}
                        y={trade.entryPrice}
                        r={5}
                        fill="#3b82f6" // Blue for entry
                        stroke="#fff"
                        strokeWidth={2}
                    />
                    {/* Exit Dot (if closed) */}
                    {trade.exitTime && (
                        <ReferenceDot
                            x={trade.exitTime}
                            y={trade.exitPrice || 0}
                            r={5}
                            fill={trade.pnl > 0 ? '#4ade80' : '#f87171'} // Green/Red for result
                            stroke="#fff"
                            strokeWidth={2}
                        />
                    )}
                </React.Fragment>
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartArea;
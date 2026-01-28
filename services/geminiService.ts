import { GoogleGenAI, Type } from "@google/genai";
import { Candle, StrategyConfig, Timeframe } from '../types';

const getAi = () => {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        console.warn("UYARI: Google Gemini API anahtarı bulunamadı.");
        console.warn("Lütfen .env dosyanıza veya Railway değişkenlerine API_KEY ekleyin.");
    }
    
    return new GoogleGenAI({ apiKey: apiKey || 'MISSING_KEY' });
};

export const analyzeChartPoints = async (
  data: Candle[], 
  userNotes: string
): Promise<StrategyConfig> => {
  const ai = getAi();
  
  const prompt = `
    You are a Quantitative Strategy Architect.
    
    Task:
    1. Interpret the User Notes below to build a quantitative trading strategy.
    2. Translate the natural language description into technical indicators and logic.
    3. Create a robust strategy configuration JSON.

    User Notes: "${userNotes}"
    
    Requirements:
    1. Include StopLoss and TakeProfit defaults appropriate for crypto (1-5%).
    2. Provide a short, professional logic explanation.
    3. Use standard indicators: 'RSI', 'SMA_CROSS', 'PRICE_LEVEL'.

    Return ONLY JSON matching the specific Schema provided.
  `;

  // Define Schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      timeframe: { type: Type.STRING, enum: ['15m', '1h', '4h', '1d'] },
      entryConditions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            indicator: { type: Type.STRING, enum: ['RSI', 'SMA_CROSS', 'PRICE_LEVEL'] },
            operator: { type: Type.STRING, enum: ['>', '<', 'crosses_above', 'crosses_below'] },
            value: { type: Type.NUMBER },
            params: {
              type: Type.OBJECT,
              properties: {
                period: { type: Type.NUMBER },
                fast: { type: Type.NUMBER },
                slow: { type: Type.NUMBER },
              }
            }
          }
        }
      },
      exitConditions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            indicator: { type: Type.STRING, enum: ['RSI', 'SMA_CROSS', 'PRICE_LEVEL'] },
            operator: { type: Type.STRING, enum: ['>', '<', 'crosses_above', 'crosses_below'] },
            value: { type: Type.NUMBER },
            params: {
                type: Type.OBJECT,
                properties: {
                  period: { type: Type.NUMBER }
                }
              }
          }
        }
      },
      stopLossPct: { type: Type.NUMBER },
      takeProfitPct: { type: Type.NUMBER },
      riskPerTradePct: { type: Type.NUMBER },
      logicExplanation: { type: Type.STRING }
    },
    required: ["name", "entryConditions", "stopLossPct", "takeProfitPct", "logicExplanation"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Flash model is fast and free-tier friendly
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const result = JSON.parse(response.text.trim()) as StrategyConfig;
    return result;

  } catch (error) {
    console.error("Gemini Strategy Factory Error:", error);
    
    // Check for specific API key errors
    if (error.toString().includes('API_KEY') || error.toString().includes('401')) {
        alert("HATA: Google API Anahtarı geçersiz veya eksik. Lütfen geçerli bir anahtar kullanın.");
    }

    // Fallback strategy if AI fails
    return {
      name: "Fallback RSI Reversion",
      description: "AI failed to parse, reverting to standard mean reversion.",
      timeframe: Timeframe.H1,
      entryConditions: [{ indicator: 'RSI', operator: '<', value: 30, params: { period: 14 } }],
      exitConditions: [{ indicator: 'RSI', operator: '>', value: 70, params: { period: 14 } }],
      stopLossPct: 0.02,
      takeProfitPct: 0.04,
      riskPerTradePct: 0.01,
      logicExplanation: "Fallback strategy due to service interruption or invalid API Key."
    };
  }
};
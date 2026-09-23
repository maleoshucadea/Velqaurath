import { CurrencyPair } from '../types';

export const INITIAL_PAIRS: CurrencyPair[] = [
  // Major USD Pairs
  { id: 'pair-eurusd', baseCurrency: 'EUR', quoteCurrency: 'USD', symbol: 'EUR/USD', active: true, standardPipDigits: 4 },
  { id: 'pair-usdjpy', baseCurrency: 'USD', quoteCurrency: 'JPY', symbol: 'USD/JPY', active: true, standardPipDigits: 2 },
  { id: 'pair-gbpusd', baseCurrency: 'GBP', quoteCurrency: 'USD', symbol: 'GBP/USD', active: true, standardPipDigits: 4 },
  { id: 'pair-usdchf', baseCurrency: 'USD', quoteCurrency: 'CHF', symbol: 'USD/CHF', active: true, standardPipDigits: 4 },
  { id: 'pair-usdcad', baseCurrency: 'USD', quoteCurrency: 'CAD', symbol: 'USD/CAD', active: true, standardPipDigits: 4 },
  { id: 'pair-audusd', baseCurrency: 'AUD', quoteCurrency: 'USD', symbol: 'AUD/USD', active: true, standardPipDigits: 4 },
  { id: 'pair-nzdusd', baseCurrency: 'NZD', quoteCurrency: 'USD', symbol: 'NZD/USD', active: true, standardPipDigits: 4 },

  // Key Cross Pairs
  { id: 'pair-eurgbp', baseCurrency: 'EUR', quoteCurrency: 'GBP', symbol: 'EUR/GBP', active: true, standardPipDigits: 4 },
  { id: 'pair-eurjpy', baseCurrency: 'EUR', quoteCurrency: 'JPY', symbol: 'EUR/JPY', active: true, standardPipDigits: 2 },
  { id: 'pair-gbpjpy', baseCurrency: 'GBP', quoteCurrency: 'JPY', symbol: 'GBP/JPY', active: true, standardPipDigits: 2 },
  { id: 'pair-audjpy', baseCurrency: 'AUD', quoteCurrency: 'JPY', symbol: 'AUD/JPY', active: true, standardPipDigits: 2 },
  { id: 'pair-cadjpy', baseCurrency: 'CAD', quoteCurrency: 'JPY', symbol: 'CAD/JPY', active: true, standardPipDigits: 2 },
  { id: 'pair-euraud', baseCurrency: 'EUR', quoteCurrency: 'AUD', symbol: 'EUR/AUD', active: true, standardPipDigits: 4 },
  { id: 'pair-eurchf', baseCurrency: 'EUR', quoteCurrency: 'CHF', symbol: 'EUR/CHF', active: true, standardPipDigits: 4 },
  { id: 'pair-gbpaud', baseCurrency: 'GBP', quoteCurrency: 'AUD', symbol: 'GBP/AUD', active: true, standardPipDigits: 4 },
  { id: 'pair-audnzd', baseCurrency: 'AUD', quoteCurrency: 'NZD', symbol: 'AUD/NZD', active: true, standardPipDigits: 4 }
];

export const getPairBySymbol = (symbol: string): CurrencyPair | undefined => {
  const clean = symbol.replace(/[-_]/g, '/').toUpperCase();
  return INITIAL_PAIRS.find(p => p.symbol === clean);
};

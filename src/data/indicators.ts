import { EconomicIndicator } from '../types';

export const ECONOMIC_INDICATORS: EconomicIndicator[] = [
  // Inflation
  { id: 'ind-cpi-yoy', code: 'CPI_YOY', name: 'Consumer Price Index (YoY)', category: 'INFLATION', unit: '%', frequency: 'MONTHLY', highIsHawkish: true },
  { id: 'ind-core-cpi', code: 'CORE_CPI_YOY', name: 'Core CPI (YoY)', category: 'INFLATION', unit: '%', frequency: 'MONTHLY', highIsHawkish: true },
  { id: 'ind-ppi-yoy', code: 'PPI_YOY', name: 'Producer Price Index (YoY)', category: 'INFLATION', unit: '%', frequency: 'MONTHLY', highIsHawkish: true },

  // Employment
  { id: 'ind-unemp-rate', code: 'UNEMP_RATE', name: 'Unemployment Rate', category: 'EMPLOYMENT', unit: '%', frequency: 'MONTHLY', highIsHawkish: false },
  { id: 'ind-nonfarm-payrolls', code: 'NFP_CHG', name: 'Non-Farm Payrolls / Employment Change', category: 'EMPLOYMENT', unit: 'k', frequency: 'MONTHLY', highIsHawkish: true },
  { id: 'ind-wage-growth', code: 'WAGE_GROWTH_YOY', name: 'Average Hourly Earnings / Wage Growth (YoY)', category: 'EMPLOYMENT', unit: '%', frequency: 'MONTHLY', highIsHawkish: true },

  // Growth & Activity
  { id: 'ind-gdp-yoy', code: 'GDP_YOY', name: 'Gross Domestic Product (YoY)', category: 'GROWTH', unit: '%', frequency: 'QUARTERLY', highIsHawkish: true },
  { id: 'ind-retail-sales', code: 'RETAIL_SALES_MOM', name: 'Retail Sales (MoM)', category: 'CONSUMER_ACTIVITY', unit: '%', frequency: 'MONTHLY', highIsHawkish: true },
  { id: 'ind-industrial-prod', code: 'IND_PROD_YOY', name: 'Industrial Production (YoY)', category: 'GROWTH', unit: '%', frequency: 'MONTHLY', highIsHawkish: true },
  { id: 'ind-mfg-pmi', code: 'MFG_PMI', name: 'Manufacturing PMI', category: 'GROWTH', unit: 'Index', frequency: 'MONTHLY', highIsHawkish: true },
  { id: 'ind-serv-pmi', code: 'SERV_PMI', name: 'Services PMI', category: 'GROWTH', unit: 'Index', frequency: 'MONTHLY', highIsHawkish: true },

  // Trade & External
  { id: 'ind-trade-balance', code: 'TRADE_BAL', name: 'Trade Balance', category: 'TRADE_BALANCE', unit: 'B', frequency: 'MONTHLY', highIsHawkish: true },
  { id: 'ind-current-account', code: 'CURR_ACCT', name: 'Current Account Balance', category: 'TRADE_BALANCE', unit: 'B', frequency: 'QUARTERLY', highIsHawkish: true },

  // Sentiment
  { id: 'ind-consumer-conf', code: 'CONS_CONF', name: 'Consumer Confidence Index', category: 'SENTIMENT', unit: 'Index', frequency: 'MONTHLY', highIsHawkish: true },
  { id: 'ind-business-conf', code: 'BIZ_CONF', name: 'Business Climate / Confidence', category: 'SENTIMENT', unit: 'Index', frequency: 'MONTHLY', highIsHawkish: true },

  // Monetary Policy Reference
  { id: 'ind-policy-rate', code: 'POLICY_RATE', name: 'Central Bank Policy Rate', category: 'MONETARY_POLICY', unit: '%', frequency: 'IRREGULAR', highIsHawkish: true }
];

export const getIndicatorById = (id: string): EconomicIndicator | undefined => {
  return ECONOMIC_INDICATORS.find(i => i.id === id || i.code === id);
};

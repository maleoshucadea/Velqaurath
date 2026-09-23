import { Currency } from '../types';

export const INITIAL_CURRENCIES: Currency[] = [
  {
    id: 'curr-usd',
    code: 'USD',
    name: 'United States Dollar',
    symbol: '$',
    region: 'North America',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'curr-eur',
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    region: 'Eurozone',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'curr-gbp',
    code: 'GBP',
    name: 'British Pound Sterling',
    symbol: '£',
    region: 'United Kingdom',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'curr-jpy',
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    region: 'Asia',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'curr-chf',
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    region: 'Western Europe',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'curr-cad',
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    region: 'North America',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'curr-aud',
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    region: 'Oceania',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  },
  {
    id: 'curr-nzd',
    code: 'NZD',
    name: 'New Zealand Dollar',
    symbol: 'NZ$',
    region: 'Oceania',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-23T00:00:00Z'
  }
];

export const getCurrencyByCode = (code: string): Currency | undefined => {
  return INITIAL_CURRENCIES.find(c => c.code.toUpperCase() === code.toUpperCase());
};

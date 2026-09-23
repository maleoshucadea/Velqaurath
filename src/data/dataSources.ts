import { DataSource } from '../types';

export const INITIAL_DATA_SOURCES: DataSource[] = [
  {
    id: 'src-bls',
    name: 'U.S. Bureau of Labor Statistics',
    institution: 'US Department of Labor',
    url: 'https://www.bls.gov',
    coverage: ['USD CPI', 'USD Core CPI', 'USD Non-Farm Payrolls', 'USD Unemployment Rate', 'USD Average Hourly Earnings'],
    status: 'CONNECTED',
    lastSyncAt: '2026-09-22T13:30:00Z',
    reliabilityGrade: 'OFFICIAL_PRIMARY'
  },
  {
    id: 'src-bea',
    name: 'U.S. Bureau of Economic Analysis',
    institution: 'US Department of Commerce',
    url: 'https://www.bea.gov',
    coverage: ['USD GDP', 'USD PCE Price Index', 'USD Personal Income'],
    status: 'CONNECTED',
    lastSyncAt: '2026-09-21T12:30:00Z',
    reliabilityGrade: 'OFFICIAL_PRIMARY'
  },
  {
    id: 'src-eurostat',
    name: 'Eurostat',
    institution: 'European Commission',
    url: 'https://ec.europa.eu/eurostat',
    coverage: ['EUR HICP Inflation', 'EUR Core Inflation', 'EUR GDP', 'EUR Unemployment Rate'],
    status: 'CONNECTED',
    lastSyncAt: '2026-09-22T09:00:00Z',
    reliabilityGrade: 'OFFICIAL_PRIMARY'
  },
  {
    id: 'src-ons',
    name: 'Office for National Statistics',
    institution: 'UK Government Agency',
    url: 'https://www.ons.gov.uk',
    coverage: ['GBP CPI', 'GBP Core CPI', 'GBP GDP', 'GBP Claimant Count / ILO Unemployment', 'GBP Average Weekly Earnings'],
    status: 'CONNECTED',
    lastSyncAt: '2026-09-20T06:00:00Z',
    reliabilityGrade: 'OFFICIAL_PRIMARY'
  },
  {
    id: 'src-sbj',
    name: 'Statistics Bureau of Japan',
    institution: 'Ministry of Internal Affairs and Communications Japan',
    url: 'https://www.stat.go.jp/english/',
    coverage: ['JPY National CPI', 'JPY Tokyo Core CPI', 'JPY Unemployment Rate', 'JPY Industrial Production'],
    status: 'CONNECTED',
    lastSyncAt: '2026-09-22T23:30:00Z',
    reliabilityGrade: 'OFFICIAL_PRIMARY'
  },
  {
    id: 'src-fso',
    name: 'Swiss Federal Statistical Office (FSO)',
    institution: 'Swiss Federal Department of Home Affairs',
    url: 'https://www.bfs.admin.ch/bfs/en/home.html',
    coverage: ['CHF Consumer Price Index', 'CHF GDP', 'CHF Unemployment'],
    status: 'CONNECTED',
    lastSyncAt: '2026-09-18T07:15:00Z',
    reliabilityGrade: 'OFFICIAL_PRIMARY'
  },
  {
    id: 'src-statcan',
    name: 'Statistics Canada',
    institution: 'Government of Canada',
    url: 'https://www.statcan.gc.ca',
    coverage: ['CAD CPI YoY', 'CAD Trimmed CPI', 'CAD Employment Change', 'CAD Unemployment Rate', 'CAD GDP'],
    status: 'CONNECTED',
    lastSyncAt: '2026-09-19T12:30:00Z',
    reliabilityGrade: 'OFFICIAL_PRIMARY'
  },
  {
    id: 'src-abs',
    name: 'Australian Bureau of Statistics',
    institution: 'Australian Government',
    url: 'https://www.abs.gov.au',
    coverage: ['AUD CPI YoY', 'AUD Trimmed Mean CPI', 'AUD Employment Change', 'AUD Unemployment Rate'],
    status: 'CONNECTED',
    lastSyncAt: '2026-09-21T01:30:00Z',
    reliabilityGrade: 'OFFICIAL_PRIMARY'
  },
  {
    id: 'src-statsnz',
    name: 'Stats NZ (Tatauranga Aotearoa)',
    institution: 'New Zealand Government Agency',
    url: 'https://www.stats.govt.nz',
    coverage: ['NZD CPI YoY', 'NZD Employment Rate', 'NZD GDP YoY'],
    status: 'CONNECTED',
    lastSyncAt: '2026-09-17T22:45:00Z',
    reliabilityGrade: 'OFFICIAL_PRIMARY'
  }
];

import { CentralBank } from '../types';

export const INITIAL_CENTRAL_BANKS: CentralBank[] = [
  {
    id: 'cb-fed',
    institution: 'Federal Reserve',
    associatedCurrency: 'USD',
    currentPolicyRate: 5.25,
    previousPolicyRate: 5.50,
    latestDecisionDate: '2026-07-29',
    nextKnownDecisionDate: '2026-09-23',
    stance: 'NEUTRAL',
    stanceEvidence: [
      'FOMC statement explicitly emphasizes data dependency and dual mandate balance.',
      'Inflation cooling toward 2% target while labor market exhibits measured rebalancing.'
    ],
    guidanceSummary: 'Committee assesses that the risks to achieving its employment and inflation goals are moving into better balance.',
    majorRisks: [
      'Labor market softening faster than projected',
      'Services and housing inflation persistence'
    ],
    sourceMetadata: {
      sourceName: 'Federal Reserve Board of Governors',
      sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
      lastUpdated: '2026-08-01T18:00:00Z',
      status: 'CONNECTED'
    }
  },
  {
    id: 'cb-ecb',
    institution: 'European Central Bank',
    associatedCurrency: 'EUR',
    currentPolicyRate: 3.50,
    previousPolicyRate: 3.75,
    latestDecisionDate: '2026-07-18',
    nextKnownDecisionDate: '2026-10-15',
    stance: 'DOVISH',
    stanceEvidence: [
      'Governing Council implemented deposit rate reduction following sub-target headline prints.',
      'Manufacturing sector weakness in core economies dampening aggregate demand.'
    ],
    guidanceSummary: 'Interest rate decisions will continue to be based on assessment of the inflation outlook and monetary policy transmission strength.',
    majorRisks: [
      'Protracted manufacturing stagnation in Germany and France',
      'Wage growth deceleration impacting domestic services'
    ],
    sourceMetadata: {
      sourceName: 'European Central Bank Press Office',
      sourceUrl: 'https://www.ecb.europa.eu/press/pr/date/html/index.en.html',
      lastUpdated: '2026-08-01T12:00:00Z',
      status: 'CONNECTED'
    }
  },
  {
    id: 'cb-boe',
    institution: 'Bank of England',
    associatedCurrency: 'GBP',
    currentPolicyRate: 5.00,
    previousPolicyRate: 5.25,
    latestDecisionDate: '2026-08-01',
    nextKnownDecisionDate: '2026-11-05',
    stance: 'NEUTRAL',
    stanceEvidence: [
      'MPC 5-4 vote split indicating active divergence on pace of easing.',
      'Services inflation remains above target while headline inflation stays anchored near 2.2%.'
    ],
    guidanceSummary: 'Monetary policy will need to continue to remain restrictive for sufficiently long until the risks to inflation returning sustainably to the 2% target have dissipated further.',
    majorRisks: [
      'Elevated UK services inflation and wage persistence',
      'Consumption slowdown from sustained mortgage repricing'
    ],
    sourceMetadata: {
      sourceName: 'Bank of England Monetary Policy Committee',
      sourceUrl: 'https://www.bankofengland.co.uk/monetary-policy',
      lastUpdated: '2026-08-05T10:00:00Z',
      status: 'CONNECTED'
    }
  },
  {
    id: 'cb-boj',
    institution: 'Bank of Japan',
    associatedCurrency: 'JPY',
    currentPolicyRate: 0.50,
    previousPolicyRate: 0.25,
    latestDecisionDate: '2026-07-31',
    nextKnownDecisionDate: '2026-10-30',
    stance: 'HAWKISH',
    stanceEvidence: [
      'Policy rate raised from 0.25% to 0.50% with explicit commitment to further hikes if economic outlook materializes.',
      'Sustained wage-price virtuous cycle verified by historic Rengo union wage settlements.'
    ],
    guidanceSummary: 'Given that real interest rates are currently at significantly low levels, the Bank will continue to raise the policy interest rate and adjust the degree of monetary accommodation.',
    majorRisks: [
      'Excessive FX volatility causing rapid unwind of carry positions',
      'Global slowdown dampening Japanese export demand'
    ],
    sourceMetadata: {
      sourceName: 'Bank of Japan Monetary Policy Releases',
      sourceUrl: 'https://www.boj.or.jp/en/mopo/index.htm',
      lastUpdated: '2026-08-01T04:00:00Z',
      status: 'CONNECTED'
    }
  },
  {
    id: 'cb-snb',
    institution: 'Swiss National Bank',
    associatedCurrency: 'CHF',
    currentPolicyRate: 1.25,
    previousPolicyRate: 1.50,
    latestDecisionDate: '2026-06-20',
    nextKnownDecisionDate: '2026-09-24',
    stance: 'DOVISH',
    stanceEvidence: [
      'SNB initiated early rate cuts in response to persistent CHF real exchange rate appreciation.',
      'Swiss domestic inflation remains subdued well below 1.5% ceiling.'
    ],
    guidanceSummary: 'The SNB remains willing to be active in the foreign exchange market as necessary to counter excessive franc strength.',
    majorRisks: [
      'Accelerated safe-haven capital inflows strengthening the Swiss Franc',
      'Deflationary pressures imported through exchange rate pass-through'
    ],
    sourceMetadata: {
      sourceName: 'Swiss National Bank Media Relations',
      sourceUrl: 'https://www.snb.ch/en/iabout/monpol',
      lastUpdated: '2026-07-10T09:00:00Z',
      status: 'CONNECTED'
    }
  },
  {
    id: 'cb-boc',
    institution: 'Bank of Canada',
    associatedCurrency: 'CAD',
    currentPolicyRate: 4.25,
    previousPolicyRate: 4.50,
    latestDecisionDate: '2026-07-24',
    nextKnownDecisionDate: '2026-10-21',
    stance: 'DOVISH',
    stanceEvidence: [
      'Sequential 25 bps rate cuts following progressive deceleration in core CPI metrics.',
      'Per-capita consumer spending showing contractions under mortgage debt load.'
    ],
    guidanceSummary: 'If inflation continues to ease broadly in line with our forecast, it is reasonable to expect further cuts in our policy interest rate.',
    majorRisks: [
      'Mortgage renewal cliff over 2026-2027 constraining disposable income',
      'Oil price weakness deteriorating Canada trade balance'
    ],
    sourceMetadata: {
      sourceName: 'Bank of Canada Policy Statements',
      sourceUrl: 'https://www.bankofcanada.ca/core-functions/monetary-policy/',
      lastUpdated: '2026-08-01T15:00:00Z',
      status: 'CONNECTED'
    }
  },
  {
    id: 'cb-rba',
    institution: 'Reserve Bank of Australia',
    associatedCurrency: 'AUD',
    currentPolicyRate: 4.35,
    previousPolicyRate: 4.35,
    latestDecisionDate: '2026-08-06',
    nextKnownDecisionDate: '2026-11-03',
    stance: 'HAWKISH',
    stanceEvidence: [
      'Board held rate steady at 4.35% and explicitly retained consideration of rate increases.',
      'Trimmed mean inflation remaining persistent and labor conditions holding tight.'
    ],
    guidanceSummary: 'The Board remains resolute in its determination to return inflation to target and will do what is necessary to achieve that outcome.',
    majorRisks: [
      'Trimmed mean inflation returning to target slower than expected',
      'Chinese economic stimulus trajectory influencing iron ore export receipts'
    ],
    sourceMetadata: {
      sourceName: 'Reserve Bank of Australia Board Decisions',
      sourceUrl: 'https://www.rba.gov.au/monetary-policy/',
      lastUpdated: '2026-08-07T05:30:00Z',
      status: 'CONNECTED'
    }
  },
  {
    id: 'cb-rbnz',
    institution: 'Reserve Bank of New Zealand',
    associatedCurrency: 'NZD',
    currentPolicyRate: 5.25,
    previousPolicyRate: 5.50,
    latestDecisionDate: '2026-08-14',
    nextKnownDecisionDate: '2026-10-07',
    stance: 'DOVISH',
    stanceEvidence: [
      'Monetary Policy Committee initiated rate cutting cycle earlier than previous forward guidance.',
      'Broad-based contraction in domestic business demand and capacity constraints.'
    ],
    guidanceSummary: 'The pace of further easing will depend on the Committee\'s confidence that price-setting behaviour continues to normalise and headline inflation anchors to the 2% midpoint.',
    majorRisks: [
      'Agricultural export demand softness',
      'Domestic recessionary spillover into unemployment'
    ],
    sourceMetadata: {
      sourceName: 'Reserve Bank of New Zealand MPC',
      sourceUrl: 'https://www.rbnz.govt.nz/monetary-policy',
      lastUpdated: '2026-08-15T02:00:00Z',
      status: 'CONNECTED'
    }
  }
];

export const getCentralBankByCurrency = (currencyCode: string): CentralBank | undefined => {
  return INITIAL_CENTRAL_BANKS.find(cb => cb.associatedCurrency.toUpperCase() === currencyCode.toUpperCase());
};

import { PairIntelligence, EconomicObservation, EconomicEvent } from '../../types';

export interface ThesisRecord {
  pairSymbol: string;
  thesis: string;
  supportingEvidence: string[];
  counterEvidence: string[];
  upcomingCatalysts: EconomicEvent[];
  risks: string[];
  invalidationConditions: string[];
  lastUpdated: string;
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'INVALIDATED' | 'DATA_UNAVAILABLE';
}

/**
 * Thesis Monitor Engine
 * Tracks active pair theses, evaluates whether newly arrived observations
 * strengthen, weaken, or trigger an invalidation condition.
 */
export function buildThesisRecord(intelligence: PairIntelligence): ThesisRecord {
  if (intelligence.baseState.overallState === 'DATA_UNAVAILABLE') {
    return {
      pairSymbol: intelligence.pair.symbol,
      thesis: 'DATA UNAVAILABLE: Connect verified data sources to initialize active thesis.',
      supportingEvidence: [],
      counterEvidence: [],
      upcomingCatalysts: [],
      risks: ['Data feed offline.'],
      invalidationConditions: [],
      lastUpdated: intelligence.lastUpdated,
      status: 'DATA_UNAVAILABLE'
    };
  }

  let status: 'ACTIVE' | 'UNDER_REVIEW' | 'INVALIDATED' = 'ACTIVE';

  // If counter evidence outnumbers supporting evidence, mark as UNDER_REVIEW
  if (intelligence.counterEvidence.length > intelligence.supportingEvidence.length) {
    status = 'UNDER_REVIEW';
  }

  return {
    pairSymbol: intelligence.pair.symbol,
    thesis: intelligence.thesis,
    supportingEvidence: intelligence.supportingEvidence,
    counterEvidence: intelligence.counterEvidence,
    upcomingCatalysts: intelligence.catalysts,
    risks: intelligence.risks,
    invalidationConditions: intelligence.invalidationConditions,
    lastUpdated: intelligence.lastUpdated,
    status
  };
}

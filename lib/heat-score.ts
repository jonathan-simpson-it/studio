import type { Lead, Proposal } from '@/types';

const HKD_THRESHOLDS = { mid: 1000, high: 5000 };
const GBP_THRESHOLDS = { mid: 100, high: 500 };
const IDR_THRESHOLDS = { mid: 2_000_000, high: 10_000_000 };

function getDealValueBonus(estimatedValue: number, currency: string): number {
  const thresholds: Record<string, { mid: number; high: number }> = {
    HKD: HKD_THRESHOLDS,
    GBP: GBP_THRESHOLDS,
    IDR: IDR_THRESHOLDS,
  };

  const t = thresholds[currency] || thresholds.HKD;
  let bonus = 0;
  if (estimatedValue > t.high) bonus += 1;
  else if (estimatedValue > t.mid) bonus += 0.5;
  return bonus;
}

export function calculateHeatScore(lead: Lead, mostRecentProposal?: Proposal | null): number {
  let score = 3;

  const now = new Date();
  const lastContacted = lead.last_contacted_at ? new Date(lead.last_contacted_at) : null;
  const stageChanged = lead.stage_changed_at ? new Date(lead.stage_changed_at) : null;

  // Days since last contact
  if (lastContacted) {
    const daysSinceContact = Math.floor((now.getTime() - lastContacted.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceContact <= 2) score += 1;
    else if (daysSinceContact <= 7) score += 0;
    else if (daysSinceContact <= 14) score -= 0.5;
    else if (daysSinceContact > 30) score -= 1.5;
    else if (daysSinceContact > 14) score -= 1;
  }

  // Days since stage change
  if (stageChanged) {
    const daysSinceStage = Math.floor((now.getTime() - stageChanged.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceStage > 30) score -= 1;
    else if (daysSinceStage > 14) score -= 0.5;
  }

  // Deal value weighting
  score += getDealValueBonus(lead.estimated_value, lead.currency);

  // Source quality
  if (lead.source === 'Referral') score += 1;
  else if (lead.source === 'Inbound') score += 0.5;

  // Proposal pending but no response
  if (
    mostRecentProposal &&
    mostRecentProposal.status === 'Sent' &&
    mostRecentProposal.sent_at
  ) {
    const daysSinceSent = Math.floor(
      (now.getTime() - new Date(mostRecentProposal.sent_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceSent > 5) score += 0.5;
  }

  // Stage bonus
  if (lead.stage === 'Negotiation' || lead.stage === 'Won') score += 1;
  if (lead.stage === 'Lost') return 1;
  if (lead.stage === 'New' && !lastContacted) score -= 0.5;

  return Math.max(1, Math.min(5, Math.round(score)));
}

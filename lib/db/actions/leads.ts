'use server';

import { connect } from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/crm';
import { Proposal } from '@/lib/db/models/docs';
import { calculateHeatScore } from '@/lib/heat-score';

export async function listLeads() {
  await connect();
  return Lead.find().sort({ created_at: -1 }).lean({ virtuals: true });
}

export async function getLead(id: string) {
  await connect();
  return Lead.findById(id).lean({ virtuals: true });
}

export async function createLead(data: Record<string, unknown>) {
  await connect();
  const lead = await Lead.create({ ...data, stage_changed_at: new Date(), created_at: new Date(), updated_at: new Date() });
  return lead.toObject({ virtuals: true });
}

export async function updateLeadStage(leadId: string, stage: string) {
  await connect();
  return Lead.findByIdAndUpdate(
    leadId,
    { stage, stage_changed_at: new Date(), updated_at: new Date() },
    { returnDocument: 'after' }
  ).lean({ virtuals: true });
}

export async function updateLead(id: string, data: Record<string, unknown>) {
  await connect();
  return Lead.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true });
}

export async function deleteLead(id: string) {
  await connect();
  return Lead.findByIdAndDelete(id);
}

export async function getLeadsWithHeatScores() {
  await connect();
  const leads = await Lead.find().sort({ created_at: -1 }).lean({ virtuals: true });
  const enriched = await Promise.all(
    leads.map(async (lead) => {
      let proposal = null;
      if (lead.stage === 'Proposal Sent') {
        const proposals = await Proposal.find({}).sort({ sent_at: -1 }).limit(1).lean({ virtuals: true });
        proposal = proposals[0] || null;
      }
      return {
        ...lead,
        heat_score: calculateHeatScore(lead as any, proposal as any),
      };
    })
  );
  return enriched;
}

export async function getLeadStats() {
  await connect();
  const leads = await Lead.find({ stage: { $nin: ['Won', 'Lost'] } }).lean({ virtuals: true });
  const staleLeads = leads.filter(
    (l: any) => !l.last_contacted_at || new Date(l.last_contacted_at) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  );
  return staleLeads;
}

export async function getActiveLeadsCount() {
  await connect();
  return Lead.countDocuments({ stage: { $nin: ['Won', 'Lost'] } });
}

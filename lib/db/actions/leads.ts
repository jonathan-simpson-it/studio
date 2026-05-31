'use server';

import { connect } from '@/lib/db/connect';
import { Lead } from '@/lib/db/models/crm';
import { Proposal } from '@/lib/db/models/docs';
import { calculateHeatScore } from '@/lib/heat-score';
import { toPlain } from '@/lib/db/to-plain';

export async function listLeads() {
  await connect();
  return toPlain(await Lead.find().sort({ created_at: -1 }).lean({ virtuals: true }));
}

export async function getLead(id: string) {
  await connect();
  return toPlain(await Lead.findById(id).lean({ virtuals: true }));
}

export async function createLead(data: Record<string, unknown>) {
  await connect();
  const lead = await Lead.create({ ...data, stage_changed_at: new Date(), created_at: new Date(), updated_at: new Date() });
  return toPlain(lead.toObject({ virtuals: true }));
}

export async function updateLeadStage(leadId: string, stage: string) {
  await connect();
  return toPlain(await Lead.findByIdAndUpdate(
    leadId,
    { stage, stage_changed_at: new Date(), updated_at: new Date() },
    { returnDocument: 'after' }
  ).lean({ virtuals: true }));
}

export async function updateLead(id: string, data: Record<string, unknown>) {
  await connect();
  return toPlain(await Lead.findByIdAndUpdate(id, { ...data, updated_at: new Date() }, { returnDocument: 'after' }).lean({ virtuals: true }));
}

export async function deleteLead(id: string) {
  await connect();
  return Lead.findByIdAndDelete(id);
}

export async function getLeadsWithHeatScores() {
  await connect();
  const leads = await Lead.find().sort({ created_at: -1 }).lean({ virtuals: true });
  const proposalLeadIds = leads.filter(l => l.stage === 'Proposal Sent').map(l => l._id.toString());
  const proposals = proposalLeadIds.length > 0
    ? await Proposal.find({ lead_id: { $in: proposalLeadIds } }).sort({ sent_at: -1 }).lean({ virtuals: true })
    : [];
  const proposalByLeadId: Record<string, any> = {};
  for (const p of proposals) {
    if (!proposalByLeadId[p.lead_id]) {
      proposalByLeadId[p.lead_id] = p;
    }
  }
  const enriched = leads.map((lead) => {
    const proposal = proposalByLeadId[lead._id.toString()] || null;
    return {
      ...lead,
      heat_score: calculateHeatScore(lead as any, proposal as any),
    };
  });
  return toPlain(enriched);
}

export async function getLeadStats() {
  await connect();
  const leads = await Lead.find({ stage: { $nin: ['Won', 'Lost'] } }).lean({ virtuals: true });
  const staleLeads = leads.filter(
    (l: any) => !l.last_contacted_at || new Date(l.last_contacted_at) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  );
  return toPlain(staleLeads);
}

export async function getActiveLeadsCount() {
  await connect();
  return Lead.countDocuments({ stage: { $nin: ['Won', 'Lost'] } });
}

import { connect } from '../lib/db/connect';
import { Client } from '../lib/db/models/crm';
import { Ticket } from '../lib/db/models/tickets';
import { DocNumberSequence } from '../lib/db/models/meta';
import mongoose from 'mongoose';

async function getTicketNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const seq = await DocNumberSequence.findOneAndUpdate(
    { entity_type: 'ticket', year },
    { $inc: { sequence: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return `TKT-${year}-${String(seq.sequence).padStart(4, '0')}`;
}

async function seed() {
  await connect();

  const testEmail = 'test@jsco.dev';

  const client = await Client.findOneAndUpdate(
    { email: testEmail },
    {
      company_name: 'Test Client',
      contact_name: 'Test User',
      email: testEmail,
      phone: '+852 1234 5678',
      ticket_package: '10-pack',
      remaining_tickets: 5,
      currency_preference: 'HKD',
      created_at: new Date(),
      updated_at: new Date(),
    },
    { upsert: true, returnDocument: 'after' }
  );

  console.log(`Client: ${client.company_name} (${client.email})`);

  const existing = await Ticket.countDocuments({ contact_email: testEmail });
  if (existing > 0) {
    console.log(`${existing} tickets already exist for ${testEmail} — skipping ticket creation.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const sampleTickets = [
    {
      title: 'Website header update for mobile responsiveness',
      description: 'The header navigation doesn\'t collapse properly on screens below 768px. The hamburger menu fails to open on iOS Safari. Needs a fix for the z-index stacking on the mobile overlay.',
      status: 'Open',
      priority: 'Medium',
      tags: ['Frontend', 'UI/UX'],
    },
    {
      title: 'Database query optimization for reports page',
      description: 'The monthly reports page takes 8-12 seconds to load. The aggregation pipeline needs indexing on the date field and the lookup stage is causing a full collection scan on large datasets.',
      status: 'In Progress',
      priority: 'High',
      tags: ['Database', 'Performance'],
    },
    {
      title: 'DNS record configuration for new subdomain',
      description: 'Need to add a CNAME record for app.testclient.com pointing to the Vercel deployment. Also need to configure SSL certificate via Let\'s Encrypt.',
      status: 'Resolved',
      priority: 'Low',
      tags: ['Hosting/DNS'],
    },
    {
      title: 'Monthly analytics report setup',
      description: 'Set up automated Google Analytics 4 reports for Q2 2026. Configured custom dashboards for user acquisition, page views, and conversion funnels. Connected to Looker Studio.',
      status: 'Closed',
      priority: 'Medium',
      tags: ['Analytics', 'Automation'],
    },
  ];

  for (const t of sampleTickets) {
    const ticketNumber = await getTicketNumber();
    await Ticket.create({
      ticket_number: ticketNumber,
      client_id: (client as any)._id.toString(),
      project_id: null,
      contact_email: testEmail,
      contact_name: 'Test User',
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      source: 'support-form',
      tags: t.tags,
      original_message: null,
      created_task_id: null,
      created_issue_url: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`  ${ticketNumber} — ${t.title} [${t.status}]`);
  }

  console.log('\nSeed complete. Use test@jsco.dev on /portal to view.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

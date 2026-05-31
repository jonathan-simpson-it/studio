import { connect } from '../lib/db/connect';
import { Cost } from '../lib/db/models/docs';
import { User } from '../lib/db/models/core';
import mongoose from 'mongoose';

interface SeedCost {
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  is_reimbursable: boolean;
  payment_source: string;
  related_founder: string;
  notes: string | null;
}

const seedCosts: SeedCost[] = [
  {
    category: 'Other',
    description: 'Client Consult Lunch',
    amount: 80,
    currency: 'HKD',
    date: new Date('2026-05-06'),
    is_reimbursable: true,
    payment_source: 'Devano Personal',
    related_founder: 'Devano',
    notes: 'Project: HKU DSA Website',
  },
  {
    category: 'Domain',
    description: 'Domain purchase one year',
    amount: 58.80,
    currency: 'HKD',
    date: new Date('2026-05-09'),
    is_reimbursable: true,
    payment_source: 'Lewis Personal',
    related_founder: 'Lewis',
    notes: 'JSC',
  },
  {
    category: 'API',
    description: 'Deepseek API',
    amount: 100,
    currency: 'HKD',
    date: new Date('2026-05-20'),
    is_reimbursable: true,
    payment_source: 'Devano Personal',
    related_founder: 'Devano',
    notes: null,
  },
];

function findUserId(users: Array<{ _id: mongoose.Types.ObjectId; full_name: string }>, name: string): string | null {
  const match = users.find((u) => u.full_name.toLowerCase().includes(name.toLowerCase()));
  return match ? match._id.toString() : null;
}

async function seed() {
  await connect();

  const existing = await Cost.countDocuments();
  if (existing > 0) {
    console.log(`Found ${existing} existing cost(s) — skipping seed (run 'mongoose.disconnect()' manually if you want to re-seed).`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const users = await User.find({ role: 'founder' }).select('full_name').lean({ virtuals: true });
  const lewisId = findUserId(users as any, 'lewis');
  const devanoId = findUserId(users as any, 'devano');

  if (!lewisId || !devanoId) {
    console.error(
      'Could not find founder users (Lewis / Devano) in the database.\n' +
      'Please ensure founder users exist, then re-run.\n' +
      'Alternatively, pass --lewis-user-id <id> --devano-user-id <id> to skip lookup.'
    );
    const args = process.argv.slice(2);
    const getArg = (key: string) => {
      const idx = args.indexOf(key);
      return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
    };
    const lewisArg = getArg('--lewis-user-id');
    const devanoArg = getArg('--devano-user-id');
    if (!lewisArg || !devanoArg) {
      await mongoose.disconnect();
      process.exit(1);
    }
    const createdByFor = (name: string) => {
      if (name === 'Lewis') return lewisArg;
      if (name === 'Devano') return devanoArg;
      return null;
    };
    for (const c of seedCosts) {
      const createdBy = createdByFor(c.related_founder) || lewisArg;
      await Cost.create({ ...c, created_by: createdBy });
      console.log(`  ${c.description} — ${c.amount} ${c.currency} [${c.category}]`);
    }
  } else {
    const createdByFor = (name: string) => {
      if (name === 'Lewis') return lewisId;
      if (name === 'Devano') return devanoId;
      return lewisId;
    };
    for (const c of seedCosts) {
      const createdBy = createdByFor(c.related_founder);
      await Cost.create({ ...c, created_by: createdBy });
      console.log(`  ${c.description} — ${c.amount} ${c.currency} [${c.category}]`);
    }
  }

  console.log('\nSeed complete. 3 costs created from legacy CSV data.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

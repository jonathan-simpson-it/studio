import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/db/connect';
import { Invoice } from '@/lib/db/models/docs';
import { DocNumberSequence } from '@/lib/db/models/meta';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connect();

    // Mark overdue invoices
    const today = new Date().toISOString().split('T')[0];
    const overdueResult = await Invoice.updateMany(
      { status: 'Sent', due_date: { $lt: new Date(today), $ne: null } },
      { $set: { status: 'Overdue', updated_at: new Date() } }
    );
    const overdueCount = overdueResult.modifiedCount;

    // Generate recurring invoices
    const recurringInvoices = await Invoice.find({
      is_recurring: true,
      next_issue_date: new Date(today),
    }).lean({ virtuals: true });

    let generatedCount = 0;

    for (const inv of recurringInvoices as any[]) {
      const now = new Date();
      const year = now.getFullYear();
      const seq = await DocNumberSequence.findOneAndUpdate(
        { entity_type: 'invoice', year },
        { $inc: { sequence: 1 } },
        { upsert: true, new: true }
      );
      const invoiceNumber = `INV-${year}-${String(seq.sequence).padStart(3, '0')}`;

      await Invoice.create({
        invoice_number: invoiceNumber,
        client_id: inv.client_id,
        project_id: inv.project_id,
        status: 'Draft',
        currency: inv.currency,
        line_items: inv.line_items,
        discount_percent: inv.discount_percent,
        subtotal: inv.subtotal,
        tax_label: inv.tax_label,
        tax_percent: inv.tax_percent,
        total: inv.total,
        issue_date: new Date(today),
        payment_terms: inv.payment_terms,
        is_recurring: true,
        recurring_frequency: inv.recurring_frequency,
        created_by: inv.created_by,
      });

      generatedCount++;

      const nextDate = new Date(inv.next_issue_date!);
      switch (inv.recurring_frequency) {
        case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
      }

      await Invoice.findByIdAndUpdate(inv._id, {
        next_issue_date: nextDate.toISOString().split('T')[0],
      });
    }

    return NextResponse.json({
      overdue: overdueCount,
      recurring_generated: generatedCount,
    });
  } catch (error) {
    console.error('Overdue check cron error:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // Mark overdue invoices
    const { data: overdueInvoices, error: overdueError } = await supabase
      .from('invoices')
      .update({ status: 'Overdue', updated_at: new Date().toISOString() })
      .eq('status', 'Sent')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .not('due_date', 'is', null)
      .select();

    if (overdueError) throw overdueError;

    // Generate recurring invoices
    const today = new Date().toISOString().split('T')[0];
    const { data: recurringInvoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('is_recurring', true)
      .eq('next_issue_date', today);

    let generatedCount = 0;

    if (recurringInvoices) {
      for (const inv of recurringInvoices) {
        const { data: sequences } = await supabase
          .rpc('lock_and_get_sequence', { entity: 'invoice', yr: new Date().getFullYear() })
          .single();

        const nextSeq = (sequences || 0) + 1;
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextSeq).padStart(3, '0')}`;

        const { error: insertError } = await supabase.from('invoices').insert({
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
          issue_date: today,
          payment_terms: inv.payment_terms,
          is_recurring: true,
          recurring_frequency: inv.recurring_frequency,
          created_by: inv.created_by,
        });

        if (!insertError) {
          generatedCount++;

          // Update next_issue_date on source
          const nextDate = new Date(inv.next_issue_date!);
          switch (inv.recurring_frequency) {
            case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
            case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
            case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
          }

          await supabase
            .from('invoices')
            .update({ next_issue_date: nextDate.toISOString().split('T')[0] })
            .eq('id', inv.id);

          await supabase
            .rpc('update_sequence', { entity: 'invoice', yr: new Date().getFullYear(), seq: nextSeq })
        }
      }
    }

    return NextResponse.json({
      overdue: overdueInvoices?.length || 0,
      recurring_generated: generatedCount,
    });
  } catch (error) {
    console.error('Overdue check cron error:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}

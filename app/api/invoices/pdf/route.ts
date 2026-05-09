import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { invoiceId } = body;

  if (!invoiceId) {
    return NextResponse.json({ error: 'invoiceId required' }, { status: 400 });
  }

  try {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const { generateInvoicePDF } = await import('@/lib/pdf');
    const pdfBuffer = await generateInvoicePDF(invoice);

    const timestamp = Date.now();
    const storagePath = `invoices/${invoiceId}/${timestamp}_${invoice.invoice_number}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('studio-files')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
      });

    if (uploadError) throw uploadError;

    const { data: signedUrlData } = await supabase.storage
      .from('studio-files')
      .createSignedUrl(storagePath, 3600);

    const signedUrl = signedUrlData?.signedUrl || null;

    await supabase
      .from('invoices')
      .update({ pdf_url: signedUrl })
      .eq('id', invoiceId);

    return NextResponse.json({
      pdfUrl: signedUrl,
      buffer: pdfBuffer.toString('base64'),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF generation failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getInvoice, updateInvoice } from '@/lib/db/actions/invoices';
import { uploadToGridFS } from '@/lib/storage/gridfs';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { invoiceId } = body;

  if (!invoiceId) {
    return NextResponse.json({ error: 'invoiceId required' }, { status: 400 });
  }

  try {
    const invoice = await getInvoice(invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const { generateInvoicePDF } = await import('@/lib/pdf');
    const pdfBuffer = await generateInvoicePDF(invoice);

    const fileId = await uploadToGridFS(pdfBuffer, `${invoice.invoice_number}.pdf`, 'application/pdf');

    await updateInvoice(invoiceId, { pdf_url: fileId });

    return NextResponse.json({
      pdfUrl: `/api/files/serve?id=${fileId}`,
      buffer: pdfBuffer.toString('base64'),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF generation failed' },
      { status: 500 }
    );
  }
}

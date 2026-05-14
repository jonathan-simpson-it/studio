import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getProposal, updateProposal } from '@/lib/db/actions/invoices';
import { uploadToGridFS } from '@/lib/storage/gridfs';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { proposalId } = body;

  if (!proposalId) {
    return NextResponse.json({ error: 'proposalId required' }, { status: 400 });
  }

  try {
    const proposal = await getProposal(proposalId);

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const { generateProposalPDF } = await import('@/lib/pdf');
    const pdfBuffer = await generateProposalPDF(proposal);

    const fileId = await uploadToGridFS(pdfBuffer, `${proposal.proposal_number}.pdf`, 'application/pdf');

    await updateProposal(proposalId, { pdf_url: fileId });

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

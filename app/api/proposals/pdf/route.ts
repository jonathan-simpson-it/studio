import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { proposalId } = body;

  if (!proposalId) {
    return NextResponse.json({ error: 'proposalId required' }, { status: 400 });
  }

  try {
    const { data: proposal } = await supabase
      .from('proposals')
      .select('*, client:clients(*)')
      .eq('id', proposalId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const { generateProposalPDF } = await import('@/lib/pdf');
    const pdfBuffer = await generateProposalPDF(proposal);

    const timestamp = Date.now();
    const storagePath = `proposals/${proposalId}/${timestamp}_${proposal.proposal_number}.pdf`;

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
      .from('proposals')
      .update({ pdf_url: signedUrl })
      .eq('id', proposalId);

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

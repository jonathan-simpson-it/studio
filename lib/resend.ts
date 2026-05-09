import { Resend } from 'resend';

let resend: Resend | null = null;

function getClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendInvoiceEmail(
  to: string,
  invoiceNumber: string,
  pdfBuffer: Buffer
) {
  const from = process.env.EMAIL_FROM || 'studio@jonathansimpson.co';

  const { data, error } = await getClient().emails.send({
    from: `Jonathon Simpson & Co. <${from}>`,
    to,
    subject: `Invoice ${invoiceNumber} from Jonathon Simpson & Co.`,
    text: `Dear Client,\n\nPlease find attached invoice ${invoiceNumber} from Jonathon Simpson & Co.\n\nThank you for your business.\n\n— Jonathon Simpson & Co.`,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBuffer.toString('base64'),
      },
    ],
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function sendProposalEmail(
  to: string,
  proposalNumber: string,
  pdfBuffer: Buffer
) {
  const from = process.env.EMAIL_FROM || 'studio@jonathansimpson.co';

  const { data, error } = await getClient().emails.send({
    from: `Jonathon Simpson & Co. <${from}>`,
    to,
    subject: `Proposal ${proposalNumber} from Jonathon Simpson & Co.`,
    text: `Dear Client,\n\nPlease find attached proposal ${proposalNumber} from Jonathon Simpson & Co.\n\nWe look forward to working with you.\n\n— Jonathon Simpson & Co.`,
    attachments: [
      {
        filename: `${proposalNumber}.pdf`,
        content: pdfBuffer.toString('base64'),
      },
    ],
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function sendTestEmail(to: string) {
  const from = process.env.EMAIL_FROM || 'studio@jonathansimpson.co';

  const { data, error } = await getClient().emails.send({
    from: `Jonathon Simpson & Co. <${from}>`,
    to,
    subject: 'Studio — Resend connection test',
    text: 'This is a test email from Studio. Your Resend integration is working correctly.',
  });

  if (error) throw new Error(error.message);
  return data;
}

import { Resend } from 'resend';
import { connect } from '@/lib/db/connect';
import { AgencySettings } from '@/lib/db/models/core';

let resend: Resend | null = null;

function getClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function getSenderIdentity(profileId?: string) {
  await connect();
  const settings = await AgencySettings.findOne().lean({ virtuals: true });
  const domain = (settings as any)?.custom_domain_name || 'mail.jonathansimpson.co';

  let profile = (settings as any)?.sender_profiles?.find((p: any) => p.is_default);
  if (profileId) {
    profile = (settings as any)?.sender_profiles?.find((p: any) => p.id === profileId) || profile;
  }

  if ((settings as any)?.custom_domain_verified && profile) {
    return {
      displayName: profile.display_name,
      email: `${profile.email_prefix}@${domain}`,
    };
  }

  return {
    displayName: 'Jonathan Simpson & Co.',
    email: process.env.EMAIL_FROM || 'studio@jonathansimpson.co',
  };
}

export async function sendInvoiceEmail(
  to: string,
  invoiceNumber: string,
  pdfBuffer: Buffer,
  profileId?: string
) {
  const identity = await getSenderIdentity(profileId);

  const { data, error } = await getClient().emails.send({
    from: `${identity.displayName} <${identity.email}>`,
    to,
    subject: `Invoice ${invoiceNumber} from ${identity.displayName}`,
    text: `Dear Client,\n\nPlease find attached invoice ${invoiceNumber}.\n\nThank you for your business.\n\n— ${identity.displayName}`,
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
  pdfBuffer: Buffer,
  profileId?: string
) {
  const identity = await getSenderIdentity(profileId);

  const { data, error } = await getClient().emails.send({
    from: `${identity.displayName} <${identity.email}>`,
    to,
    subject: `Proposal ${proposalNumber} from ${identity.displayName}`,
    text: `Dear Client,\n\nPlease find attached proposal ${proposalNumber}.\n\nWe look forward to working with you.\n\n— ${identity.displayName}`,
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

export async function sendGeneralEmail(
  to: string,
  subject: string,
  body: string,
  attachments?: Array<{ filename: string; content: string }>,
  profileId?: string
) {
  const identity = await getSenderIdentity(profileId);

  const { data, error } = await getClient().emails.send({
    from: `${identity.displayName} <${identity.email}>`,
    to,
    subject,
    text: body,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function sendGeneralHtmlEmail(
  to: string,
  subject: string,
  bodyHtml: string,
  bodyText?: string,
  attachments?: Array<{ filename: string; content: string }>,
  profileId?: string
) {
  const identity = await getSenderIdentity(profileId);

  const { data, error } = await getClient().emails.send({
    from: `${identity.displayName} <${identity.email}>`,
    to,
    subject,
    html: bodyHtml,
    text: bodyText || bodyHtml.replace(/<[^>]*>/g, ''),
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function sendVerificationCode(to: string, code: string) {
  const identity = await getSenderIdentity();

  const { data, error } = await getClient().emails.send({
    from: `${identity.displayName} <${identity.email}>`,
    to,
    subject: 'Your verification code for the Client Portal',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
                  <tr>
                    <td align="center" style="padding-bottom:32px;">
                      <img src="https://studio.jonathansimpson.co/JSC-logo.svg" alt="JSC" width="40" height="40" style="border-radius:8px;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#18181b;border-radius:12px;padding:40px 32px;text-align:center;">
                      <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#fafafa;letter-spacing:-0.02em;">
                        Your verification code
                      </h1>
                      <p style="margin:0 0 28px;font-size:14px;color:#a1a1aa;line-height:1.5;">
                        Use this code to access your Client Portal. It expires in 15 minutes.
                      </p>
                      <div style="background:#27272a;border-radius:10px;padding:20px;margin-bottom:28px;">
                        <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#fafafa;font-family:'SF Mono',SFMono-Regular,Consolas,monospace;">${code}</span>
                      </div>
                      <p style="margin:0;font-size:12px;color:#71717a;">
                        If you didn't request this code, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:24px;">
                      <p style="margin:0;font-size:11px;color:#52525b;">
                        ${identity.displayName.replace(/&/g, '&amp;')} &middot; Hong Kong
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `.trim(),
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function sendTestEmail(to: string) {
  const identity = await getSenderIdentity();

  const { data, error } = await getClient().emails.send({
    from: `${identity.displayName} <${identity.email}>`,
    to,
    subject: 'Studio — Resend connection test',
    text: 'This is a test email from Studio. Your Resend integration is working correctly.',
  });

  if (error) throw new Error(error.message);
  return data;
}

export { getClient };

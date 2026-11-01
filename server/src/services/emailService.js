const isConfigured = () => process.env.EMAIL_PROVIDER === 'resend' && Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function emailProviderConfigured() { return isConfigured(); }

export async function sendEmail({ to, subject, html, text, idempotencyKey, attachments }) {
  if (!isConfigured()) throw Object.assign(new Error('Email is not configured. Set EMAIL_PROVIDER=resend, EMAIL_API_KEY, and EMAIL_FROM.'), { status: 503 });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${process.env.EMAIL_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, text, ...(attachments?.length ? { attachments } : {}) }),
  });
  if (!response.ok) {
    const error = new Error('The email provider rejected the message. Check the server email configuration.');
    error.status = 502;
    throw error;
  }
  return response.json();
}

export function buildInvitationEmail({ organizationName, role, inviteUrl }) {
  const safeOrg = escapeHtml(organizationName);
  const safeRole = escapeHtml(role);
  const safeUrl = escapeHtml(inviteUrl);
  return {
    subject: `Invitation to join ${organizationName} on Berry`,
    text: `You have been invited to join ${organizationName} as ${role}. Accept the invitation: ${inviteUrl}`,
    html: `<p>You have been invited to join <strong>${safeOrg}</strong> as ${safeRole}.</p><p><a href="${safeUrl}">Accept invitation</a></p><p>This invitation expires in seven days. If you did not expect it, you can ignore this email.</p>`,
  };
}

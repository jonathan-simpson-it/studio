export function validateInviteCode(code: string): boolean {
  if (!code) return false;
  const validCode = process.env.FOUNDER_INVITE_CODE;
  if (validCode && code.trim() === validCode) return true;
  return false;
}

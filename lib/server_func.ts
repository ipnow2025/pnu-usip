import { NextRequest } from 'next/server';

export function getUserIdFromSession(req: NextRequest): string | null {
  const encoded = req.headers.get('x-user-session');
  if (!encoded) return null;
  try {
    // 안전한 유니코드 Base64 디코딩
    const decoded = Buffer.from(encoded, 'base64').toString();
    const member = JSON.parse(decoded);
    return member.memberIdx || member.member_id || member.id || null;
  } catch (e) {
    console.log('getUserIdFromSession error', e);
    return null;
  }
}

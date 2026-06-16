import { NextResponse } from 'next/server';
import { getUserCookieName } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  // Apaga o cookie
  response.cookies.set(getUserCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

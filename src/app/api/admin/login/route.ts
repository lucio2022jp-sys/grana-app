import { NextRequest, NextResponse } from 'next/server';
import {
  checkAdminPassword,
  adminTokenForLogin,
  getAdminCookieName,
  getAdminCookieOptions,
} from '@/lib/admin-auth';
import { z } from 'zod';

const schema = z.object({ password: z.string() });

export async function POST(req: NextRequest) {
  try {
    const { password } = schema.parse(await req.json());

    if (!checkAdminPassword(password)) {
      // Pequeno delay pra dificultar brute force
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    const token = adminTokenForLogin();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(getAdminCookieName(), token, getAdminCookieOptions());
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'erro' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(getAdminCookieName());
  return response;
}

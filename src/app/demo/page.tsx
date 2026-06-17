import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCookieOptions, getUserCookieName } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Rota /demo: seta o cookie do user demo (Bruna) e manda direto pro /app.
 * Serve pra apresentacao publica sem precisar criar conta.
 */
export default function DemoPage() {
  const demoId = process.env.DEMO_USER_ID;
  if (!demoId) {
    redirect('/login');
  }

  cookies().set(getUserCookieName(), demoId, getCookieOptions());
  redirect('/app');
}

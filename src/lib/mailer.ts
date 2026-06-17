/**
 * Envio de e-mail transacional.
 *
 * Provedor: Resend (https://resend.com).
 * Em dev, sem RESEND_API_KEY, o link cai no console pra nao bloquear o fluxo.
 *
 * Importacao do SDK e dinamica de proposito: o pacote so e exigido quando ha
 * RESEND_API_KEY presente. Assim, em dev/CI sem `resend` no node_modules
 * tudo continua funcionando, e a build nao quebra por modulo faltante.
 */

type SendResult =
  | { sent: true; id?: string | null }
  | { sent: false; reason: 'no_api_key' | 'no_recipient' | 'error'; error?: unknown };

function defaultFrom() {
  return process.env.MAIL_FROM ?? 'Grana <onboarding@resend.dev>';
}

function htmlTemplate(name: string | null | undefined, resetUrl: string) {
  const saudacao = name ? `Oi, ${escapeHtml(name)}!` : 'Oi!';
  return `<!doctype html>
<html lang="pt-br">
  <body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background:#fafafa; padding:24px;">
    <div style="max-width:480px; margin:0 auto; background:#fff; border-radius:16px; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <h1 style="margin:0 0 16px; font-size:22px; color:#111;">${saudacao}</h1>
      <p style="margin:0 0 16px; color:#333; line-height:1.5;">
        Voce pediu pra redefinir sua senha do Grana. Clique no botao abaixo pra criar uma senha nova:
      </p>
      <p style="margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block; background:#7c3aed; color:#fff; text-decoration:none; font-weight:bold; padding:14px 24px; border-radius:12px;">
          Redefinir minha senha
        </a>
      </p>
      <p style="margin:0 0 8px; color:#555; font-size:13px;">
        Esse link expira em 30 minutos e so pode ser usado uma vez.
      </p>
      <p style="margin:0; color:#888; font-size:12px;">
        Se voce nao pediu isso, pode ignorar esse e-mail. Sua senha continua a mesma.
      </p>
    </div>
  </body>
</html>`;
}

function textTemplate(name: string | null | undefined, resetUrl: string) {
  const saudacao = name ? `Oi, ${name}!` : 'Oi!';
  return `${saudacao}

Voce pediu pra redefinir sua senha do Grana.
Abra esse link pra criar uma senha nova (expira em 30 minutos, uso unico):

${resetUrl}

Se voce nao pediu isso, ignore esse e-mail. Sua senha continua a mesma.
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendPasswordResetEmail(
  to: string | null | undefined,
  name: string | null | undefined,
  resetUrl: string,
): Promise<SendResult> {
  if (!to) return { sent: false, reason: 'no_recipient' };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[mailer] RESEND_API_KEY ausente — link de reset nao enviado por e-mail.');
    console.log(`[mailer] reset link para ${to}: ${resetUrl}`);
    return { sent: false, reason: 'no_api_key' };
  }

  try {
    // Import dinamico: 'resend' so e exigido em runtime, quando a chave existe.
    // Se o pacote nao estiver instalado, cai no catch e loga o link.
    const mod: any = await import('resend').catch((e) => {
      console.error('[mailer] pacote "resend" nao instalado. Rode: npm i resend');
      throw e;
    });
    const ResendCtor = mod.Resend ?? mod.default?.Resend ?? mod.default;
    const client = new ResendCtor(apiKey);

    const result = await client.emails.send({
      from: defaultFrom(),
      to,
      subject: 'Redefinir senha do Grana',
      html: htmlTemplate(name, resetUrl),
      text: textTemplate(name, resetUrl),
    });

    return { sent: true, id: result?.data?.id ?? null };
  } catch (e) {
    console.error('[mailer] falha ao enviar e-mail de reset:', e);
    console.log(`[mailer] reset link para ${to}: ${resetUrl}`);
    return { sent: false, reason: 'error', error: e };
  }
}

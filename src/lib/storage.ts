// Storage de comprovantes no Supabase Storage.
//
// Por que Supabase: o banco ja eh Supabase, entao reusa a infra. Bucket privado
// + URL assinada com TTL curto (5 min) eh suficiente: a foto so vaza se alguem
// tem acesso ao painel da usuaria, e mesmo assim a URL expira rapido.
//
// Estrutura no bucket:
//   receipts/{userId}/{transactionId}-{timestamp}.{ext}
//
// Configuracao necessaria:
//   SUPABASE_URL                = https://PROJETO.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   = chave service_role (NAO expor no client)
//   SUPABASE_RECEIPTS_BUCKET    = nome do bucket (default: 'receipts')
//
// Sem essas vars o upload retorna erro amigavel — o app nao quebra.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const BUCKET = process.env.SUPABASE_RECEIPTS_BUCKET || 'receipts';
const SIGNED_URL_TTL_SECONDS = 60 * 5; // 5 min

// Tamanho e tipos aceitos. Foto de comprovante geralmente tem 1-3MB.
export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024; // 8MB
export const ALLOWED_RECEIPT_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
] as const;

let cachedClient: SupabaseClient | null = null;

function getServerClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (cachedClient) return cachedClient;
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/heic': return 'heic';
    case 'image/heif': return 'heif';
    case 'application/pdf': return 'pdf';
    default: return 'bin';
  }
}

export function buildReceiptPath(params: {
  userId: string;
  transactionId: string;
  mime: string;
}): string {
  const ext = extFromMime(params.mime);
  const ts = Date.now();
  return `${params.userId}/${params.transactionId}-${ts}.${ext}`;
}

export async function uploadReceipt(params: {
  userId: string;
  transactionId: string;
  buffer: Buffer;
  mime: string;
}): Promise<{ path: string }> {
  const client = getServerClient();
  if (!client) {
    throw new Error('Storage nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  }
  const path = buildReceiptPath({
    userId: params.userId,
    transactionId: params.transactionId,
    mime: params.mime,
  });
  const { error } = await client.storage.from(BUCKET).upload(path, params.buffer, {
    contentType: params.mime,
    upsert: false,
  });
  if (error) {
    throw new Error(`Falha ao subir comprovante: ${error.message}`);
  }
  return { path };
}

export async function deleteReceipt(path: string): Promise<void> {
  const client = getServerClient();
  if (!client) return; // se nao configurado, nada pra deletar
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) {
    // Nao lanca: se o arquivo ja sumiu, o objetivo (limpar referencia) ainda eh
    // alcancado removendo a coluna no banco.
    console.warn(`Falha ao deletar comprovante ${path}: ${error.message}`);
  }
}

export async function getReceiptSignedUrl(path: string): Promise<string | null> {
  const client = getServerClient();
  if (!client) return null;
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.warn(`Falha ao gerar signed URL pra ${path}: ${error?.message}`);
    return null;
  }
  return data.signedUrl;
}

// ---------- DASN-SIMEI: PDFs de recibo da Receita Federal ----------
// Mesma logica dos comprovantes mas em diretorio separado.

export function buildDasnPath(params: {
  userId: string;
  year: number;
  mime: string;
}): string {
  const ext = extFromMime(params.mime);
  const ts = Date.now();
  return `dasn/${params.userId}/${params.year}-${ts}.${ext}`;
}

export async function uploadDasnRecibo(params: {
  userId: string;
  year: number;
  buffer: Buffer;
  mime: string;
}): Promise<{ path: string }> {
  const client = getServerClient();
  if (!client) {
    throw new Error('Storage nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  }
  const path = buildDasnPath({
    userId: params.userId,
    year: params.year,
    mime: params.mime,
  });
  const { error } = await client.storage.from(BUCKET).upload(path, params.buffer, {
    contentType: params.mime,
    upsert: true, // permite re-anexar se entregou de novo (raro)
  });
  if (error) {
    throw new Error(`Falha ao subir recibo DASN: ${error.message}`);
  }
  return { path };
}

export async function getDasnSignedUrl(path: string): Promise<string | null> {
  return getReceiptSignedUrl(path); // mesma logica
}

export async function deleteDasn(path: string): Promise<void> {
  return deleteReceipt(path);
}

// ---------- Relatorios mensais ----------

export function buildRelatorioPath(params: {
  userId: string;
  year: number;
  month: number;
}): string {
  const m = String(params.month).padStart(2, '0');
  const ts = Date.now();
  return `relatorios/${params.userId}/${params.year}-${m}-${ts}.pdf`;
}

export async function uploadRelatorio(params: {
  userId: string;
  year: number;
  month: number;
  buffer: Buffer;
}): Promise<{ path: string }> {
  const client = getServerClient();
  if (!client) {
    throw new Error('Storage nao configurado.');
  }
  const path = buildRelatorioPath({
    userId: params.userId,
    year: params.year,
    month: params.month,
  });
  const { error } = await client.storage.from(BUCKET).upload(path, params.buffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) throw new Error(`Falha ao subir relatorio: ${error.message}`);
  return { path };
}

export async function getRelatorioSignedUrl(path: string): Promise<string | null> {
  return getReceiptSignedUrl(path);
}

export async function deleteRelatorio(path: string): Promise<void> {
  return deleteReceipt(path);
}

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

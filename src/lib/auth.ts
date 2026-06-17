/**
 * Hash de senha usando scrypt nativo do Node (sem dependencia externa).
 * Formato armazenado: "scrypt$N$r$p$saltHex$hashHex"
 *
 * - N=16384, r=8, p=1 sao os defaults razoaveis pra app web
 * - keyLen=64 (saida com 512 bits)
 * - timing-safe compare na verificacao
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 16384;
const r = 8;
const p = 1;
const KEY_LEN = 64;

export function hashPassword(plain: string): string {
  if (!plain || plain.length < 6) {
    throw new Error('Senha precisa ter ao menos 6 caracteres.');
  }
  const salt = randomBytes(16);
  const derived = scryptSync(plain, salt, KEY_LEN, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (!plain || !stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const nVal = Number(nStr);
  const rVal = Number(rStr);
  const pVal = Number(pStr);
  if (!nVal || !rVal || !pVal) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = scryptSync(plain, salt, expected.length, {
    N: nVal,
    r: rVal,
    p: pVal,
  });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

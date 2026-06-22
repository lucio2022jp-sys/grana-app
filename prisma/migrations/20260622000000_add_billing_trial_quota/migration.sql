-- Billing: plano, trial e cota mensal de lancamentos novos.
-- Estrategia A+B: Free tem importacao inicial ilimitada + 20 lancamentos
-- NOVOS (manuais) por mes. Pro destrava ilimitado. Toda conta nova ganha
-- 7 dias de trial Pro automatico.

ALTER TABLE "User"
  ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN "monthlyNewTxCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "monthlyNewTxResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: contas existentes ganham trial de 7 dias a partir de agora.
-- Isso evita que usuarias que ja estao usando o app sejam barradas
-- subitamente quando o gate ficar ativo.
UPDATE "User"
SET "trialEndsAt" = CURRENT_TIMESTAMP + INTERVAL '7 days'
WHERE "trialEndsAt" IS NULL;

-- Flag em Transaction pra distinguir lancamento manual (que conta cota)
-- de importacao em massa / automatico (nao conta).
ALTER TABLE "Transaction"
  ADD COLUMN "imported" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: tudo que veio com source != 'manual' eh considerado importado
-- pra nao penalizar quem ja importou extrato antes desse gate existir.
UPDATE "Transaction"
SET "imported" = true
WHERE "source" != 'manual';

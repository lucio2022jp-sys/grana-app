-- Programa de indicacao (member-get-member).
-- referralCode: codigo curto e unico que cada usuario tem. Gerado lazy
-- quando a pagina /app/indique chama o endpoint pela primeira vez.
-- referredById: aponta pro usuario que trouxe esse novo cadastro (via
-- /signup?ref=CODIGO). ON DELETE SET NULL pra nao perder o usuario novo
-- caso o indicador apague a conta.
-- referralRewardedAt: marca quando o webhook do Stripe pagou os 30 dias
-- de Pro pra ambos. Evita double-reward.

ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN "referredById" TEXT;
ALTER TABLE "User" ADD COLUMN "referralRewardedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

ALTER TABLE "User"
  ADD CONSTRAINT "User_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

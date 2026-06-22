-- Campos do Stripe na User pra integracao do checkout do plano Pro.
-- stripeCustomerId é unico: um user => um customer no Stripe.
-- subscriptionId guarda a assinatura ativa atual (atualizado via webhook).
-- planUntil controla quando o plano Pro expira (volta pra free).

ALTER TABLE "User"
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "planUntil" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

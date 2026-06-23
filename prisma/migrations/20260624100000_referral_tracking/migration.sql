-- AlterTable: campos de telemetria do programa de indicacao
-- referralClickCount: visitas em /r/CODE (incrementado pela rota curta)
-- referralUtmMedium:  canal pelo qual a indicada chegou (share/copy/whatsapp/link)
ALTER TABLE "User"
  ADD COLUMN "referralClickCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "referralUtmMedium" TEXT;

-- CreateTable
CREATE TABLE "TaxReserve" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxReserve_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxReserve_userId_idx" ON "TaxReserve"("userId");

-- CreateIndex
CREATE INDEX "TaxReserve_userId_year_month_idx" ON "TaxReserve"("userId", "year", "month");

-- AddForeignKey
ALTER TABLE "TaxReserve" ADD CONSTRAINT "TaxReserve_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: preferencia de % de reserva automatica (default 8% do faturamento)
ALTER TABLE "User" ADD COLUMN "taxReserveAutoPercent" INTEGER;

-- CreateTable
CREATE TABLE "RelatorioMensal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "receita" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "despesas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lucro" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "txCount" INTEGER NOT NULL DEFAULT 0,
    "pdfPath" TEXT,
    "geradoAuto" BOOLEAN NOT NULL DEFAULT false,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelatorioMensal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RelatorioMensal_userId_year_month_idx" ON "RelatorioMensal"("userId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "RelatorioMensal_userId_year_month_key" ON "RelatorioMensal"("userId", "year", "month");

-- AddForeignKey
ALTER TABLE "RelatorioMensal" ADD CONSTRAINT "RelatorioMensal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

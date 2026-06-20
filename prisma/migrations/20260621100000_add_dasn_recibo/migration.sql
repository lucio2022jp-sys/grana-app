-- CreateTable
CREATE TABLE "DasnRecibo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL,
    "valorDeclarado" DOUBLE PRECISION NOT NULL,
    "receitaComercio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receitaServicos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DasnRecibo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DasnRecibo_userId_idx" ON "DasnRecibo"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DasnRecibo_userId_year_key" ON "DasnRecibo"("userId", "year");

-- AddForeignKey
ALTER TABLE "DasnRecibo" ADD CONSTRAINT "DasnRecibo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

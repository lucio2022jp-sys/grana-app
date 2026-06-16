-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "profissao" TEXT,
    "regime" TEXT,
    "meiAtividade" TEXT,
    "meiInicio" TIMESTAMP(3),
    "simplesAnexo" TEXT,
    "simplesInicio" TIMESTAMP(3),
    "contadorNome" TEXT,
    "contadorWhatsapp" TEXT,
    "contadorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "contraparte" TEXT,
    "contraparteDoc" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isDeductible" BOOLEAN NOT NULL DEFAULT false,
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "uploadId" TEXT,
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "userConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "bankDetected" TEXT,
    "status" TEXT NOT NULL,
    "errorMsg" TEXT,
    "rawText" TEXT,
    "txCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DASPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "proofUrl" TEXT,
    "notes" TEXT,
    "regime" TEXT,
    "rbt12" DOUBLE PRECISION,
    "aliquota" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DASPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContadorParceiro" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "foto" TEXT,
    "especialidade" TEXT,
    "cidade" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "preco" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "notaMedia" DOUBLE PRECISION,
    "notaCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContadorParceiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indicacao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parceiroId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'enviada',
    "notes" TEXT,
    "avaliadaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Indicacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parceiroId" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "oculta" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "uploadId" TEXT,
    "totalTxs" INTEGER NOT NULL,
    "fromHistory" INTEGER NOT NULL,
    "fromHeuristic" INTEGER NOT NULL,
    "fromAI" INTEGER NOT NULL,
    "aiCallsCount" INTEGER NOT NULL DEFAULT 0,
    "aiTxsCount" INTEGER NOT NULL DEFAULT 0,
    "correctedTxs" INTEGER NOT NULL DEFAULT 0,
    "correctedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassificationMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_idx" ON "Transaction"("userId", "type");

-- CreateIndex
CREATE INDEX "Transaction_userId_contraparteDoc_idx" ON "Transaction"("userId", "contraparteDoc");

-- CreateIndex
CREATE INDEX "DASPayment_userId_dueDate_idx" ON "DASPayment"("userId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "DASPayment_userId_year_month_key" ON "DASPayment"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "Indicacao_userId_idx" ON "Indicacao"("userId");

-- CreateIndex
CREATE INDEX "Indicacao_parceiroId_idx" ON "Indicacao"("parceiroId");

-- CreateIndex
CREATE INDEX "Indicacao_userId_avaliadaEm_idx" ON "Indicacao"("userId", "avaliadaEm");

-- CreateIndex
CREATE INDEX "Avaliacao_parceiroId_idx" ON "Avaliacao"("parceiroId");

-- CreateIndex
CREATE UNIQUE INDEX "Avaliacao_userId_parceiroId_key" ON "Avaliacao"("userId", "parceiroId");

-- CreateIndex
CREATE INDEX "ClassificationMetric_userId_createdAt_idx" ON "ClassificationMetric"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassificationMetric_uploadId_idx" ON "ClassificationMetric"("uploadId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DASPayment" ADD CONSTRAINT "DASPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicacao" ADD CONSTRAINT "Indicacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicacao" ADD CONSTRAINT "Indicacao_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "ContadorParceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "ContadorParceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AiFreePredictionClaim" (
    "id" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
    "birthTime" TEXT NOT NULL,
    "birthPlaceKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFreePredictionClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiFreePredictionClaim_birthDate_birthTime_birthPlaceKey_key"
ON "AiFreePredictionClaim"("birthDate", "birthTime", "birthPlaceKey");

-- CreateIndex
CREATE INDEX "AiFreePredictionClaim_createdAt_idx"
ON "AiFreePredictionClaim"("createdAt");

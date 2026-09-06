-- CreateTable
CREATE TABLE "AiPredictionPayment" (
    "id" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
    "birthTime" TEXT NOT NULL,
    "birthPlaceKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPredictionPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiPredictionPayment_razorpayOrderId_key" ON "AiPredictionPayment"("razorpayOrderId");
CREATE UNIQUE INDEX "AiPredictionPayment_razorpayPaymentId_key" ON "AiPredictionPayment"("razorpayPaymentId");
CREATE INDEX "AiPredictionPayment_birthDate_birthTime_birthPlaceKey_idx" ON "AiPredictionPayment"("birthDate", "birthTime", "birthPlaceKey");
CREATE INDEX "AiPredictionPayment_status_idx" ON "AiPredictionPayment"("status");

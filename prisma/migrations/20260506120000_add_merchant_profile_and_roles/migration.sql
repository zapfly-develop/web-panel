-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MERCHANT';
ALTER TYPE "UserRole" ADD VALUE 'RIDER';
ALTER TYPE "UserRole" ADD VALUE 'ADMIN';

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "assistantName" TEXT,
    "businessProfile" "BusinessProfile" NOT NULL DEFAULT 'GROCERY',
    "closedMessage" TEXT,
    "manualStoreClosed" BOOLEAN NOT NULL DEFAULT false,
    "deliveryFeeCents" INTEGER NOT NULL DEFAULT 0,
    "dynamicFareBonusCents" INTEGER NOT NULL DEFAULT 200,
    "stagnatedTimeoutMinutes" INTEGER NOT NULL DEFAULT 15,
    "riderIncidentCooldownMinutes" INTEGER NOT NULL DEFAULT 30,
    "storeAddress" TEXT,
    "acceptedPaymentMethods" "PaymentMethod"[] NOT NULL DEFAULT ARRAY[]::"PaymentMethod"[],
    "availableDeliveryTypes" "DeliveryType"[] NOT NULL DEFAULT ARRAY['DELIVERY']::"DeliveryType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_userId_key" ON "Merchant"("userId");
CREATE INDEX "Merchant_storeName_idx" ON "Merchant"("storeName");
CREATE INDEX "Merchant_businessProfile_idx" ON "Merchant"("businessProfile");

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill legacy store users into Merchant profiles without changing their role yet.
INSERT INTO "Merchant" (
    "id",
    "userId",
    "storeName",
    "assistantName",
    "businessProfile",
    "closedMessage",
    "manualStoreClosed",
    "deliveryFeeCents",
    "dynamicFareBonusCents",
    "stagnatedTimeoutMinutes",
    "riderIncidentCooldownMinutes",
    "storeAddress",
    "acceptedPaymentMethods",
    "availableDeliveryTypes",
    "createdAt",
    "updatedAt"
)
SELECT
    'merchant_' || "User"."id",
    "User"."id",
    COALESCE(NULLIF("User"."name", ''), NULLIF("User"."email", ''), 'Loja Floovi'),
    "User"."assistantName",
    "User"."businessProfile",
    "User"."closedMessage",
    "User"."manualStoreClosed",
    "User"."deliveryFeeCents",
    "User"."dynamicFareBonusCents",
    "User"."stagnatedTimeoutMinutes",
    "User"."riderIncidentCooldownMinutes",
    "User"."storeAddress",
    "User"."acceptedPaymentMethods",
    "User"."availableDeliveryTypes",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
WHERE "User"."role" = 'CUSTOMER'
ON CONFLICT ("userId") DO NOTHING;

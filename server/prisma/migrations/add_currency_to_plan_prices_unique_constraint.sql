-- DropIndex
DROP INDEX IF EXISTS "public"."plan_prices_planId_billingCycle_key";

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_planId_billingCycle_currency_key" ON "public"."plan_prices"("planId", "billingCycle", "currency");

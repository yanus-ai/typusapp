-- Add THREE_MONTHLY to BillingCycle enum
DO $$ 
BEGIN
    -- Check if the enum value already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE e.enumlabel = 'THREE_MONTHLY' 
        AND t.typname = 'BillingCycle'
        AND n.nspname = 'public'
    ) THEN
        ALTER TYPE "public"."BillingCycle" ADD VALUE 'THREE_MONTHLY';
    END IF;
END $$;


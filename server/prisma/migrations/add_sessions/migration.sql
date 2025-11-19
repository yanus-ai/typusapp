-- CreateTable: sessions
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: sessions_userId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'sessions' AND indexname = 'sessions_userId_idx'
    ) THEN
        CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
    END IF;
END $$;

-- AddForeignKey: sessions_userId -> users_id (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sessions_userId_fkey'
    ) THEN
        ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable: generation_batches - Add sessionId column (nullable initially for migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'generation_batches' AND column_name = 'sessionId'
    ) THEN
        ALTER TABLE "generation_batches" ADD COLUMN "sessionId" INTEGER;
    END IF;
END $$;

-- CreateIndex: generation_batches_sessionId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'generation_batches' AND indexname = 'generation_batches_sessionId_idx'
    ) THEN
        CREATE INDEX "generation_batches_sessionId_idx" ON "generation_batches"("sessionId");
    END IF;
END $$;

-- AddForeignKey: generation_batches_sessionId -> sessions_id (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'generation_batches_sessionId_fkey'
    ) THEN
        ALTER TABLE "generation_batches" ADD CONSTRAINT "generation_batches_sessionId_fkey" 
            FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") 
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;


-- CreateEnum
CREATE TYPE "public"."BatchStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."UploadSource" AS ENUM ('CREATE_MODULE', 'TWEAK_MODULE', 'REFINE_MODULE', 'GALLERY_UPLOAD');

-- CreateEnum
CREATE TYPE "public"."SubscriptionPlan" AS ENUM ('STARTER', 'EXPLORER', 'PRO');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELLED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'CANCELLED_AT_PERIOD_END');

-- CreateEnum
CREATE TYPE "public"."BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."CreditTransactionType" AS ENUM ('SUBSCRIPTION_CREDIT', 'IMAGE_CREATE', 'IMAGE_TWEAK', 'IMAGE_REFINE', 'PURCHASE', 'REFUND', 'EXPIRATION');

-- CreateEnum
CREATE TYPE "public"."ModuleType" AS ENUM ('CREATE', 'TWEAK', 'REFINE');

-- CreateEnum
CREATE TYPE "public"."ImageStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED', 'SUBMITTED', 'IN_QUEUE', 'STARTING', 'IN_PROGRESS', 'CANCELED', 'RETRY_1', 'RETRY_2', 'RETRY_FAILED');

-- CreateEnum
CREATE TYPE "public"."TweakOperationType" AS ENUM ('SELECT_RESIZE', 'CHANGE_REGION', 'CUT_OBJECTS', 'ADD_IMAGE');

-- CreateEnum
CREATE TYPE "public"."SharePlatform" AS ENUM ('LINKEDIN', 'TWITTER', 'FACEBOOK', 'DIRECT_LINK');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'REFUNDED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "handle" TEXT,
    "bio" TEXT,
    "profilePicture" TEXT,
    "coverPicture" TEXT,
    "socialLinks" JSONB,
    "googleId" TEXT,
    "password" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verificationToken" TEXT,
    "verificationTokenExpiry" TIMESTAMP(3),
    "isStudent" BOOLEAN NOT NULL DEFAULT false,
    "universityName" TEXT,
    "remainingCredits" INTEGER NOT NULL DEFAULT 0,
    "passwordResetToken" TEXT,
    "passwordResetTokenExpiry" TIMESTAMP(3),
    "gtmTrackingData" JSONB,
    "acceptedMarketing" BOOLEAN NOT NULL DEFAULT false,
    "acceptedMarketingAt" TIMESTAMP(3),
    "acceptedTerms" BOOLEAN NOT NULL DEFAULT false,
    "acceptedTermsAt" TIMESTAMP(3),
    "milestone10imagessent" BOOLEAN DEFAULT false,
    "firstImageEmailSent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plans" (
    "id" SERIAL NOT NULL,
    "planType" "public"."SubscriptionPlan" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "isEducational" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plan_prices" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "billingCycle" "public"."BillingCycle" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "stripePriceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "planType" "public"."SubscriptionPlan" NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "billingCycle" "public"."BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "paymentFailedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastPaymentFailureDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isEducational" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."credit_transactions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "public"."CreditTransactionType" NOT NULL,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "description" TEXT,
    "batchId" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."input_images" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "processedUrl" TEXT,
    "thumbnailUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "dimensions" JSONB,
    "uploadSource" "public"."UploadSource" NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "maskStatus" TEXT DEFAULT 'none',
    "maskData" JSONB,
    "generatedPrompt" TEXT,
    "aiMaterials" JSONB,
    "aiPrompt" TEXT,
    "displayImageUrl" TEXT,
    "displayThumbnailUrl" TEXT,
    "maskMaterialMappings" JSONB,
    "sourceGeneratedImageId" INTEGER,
    "tags" JSONB,
    "createUploadId" INTEGER,
    "refineUploadId" INTEGER,
    "tweakUploadId" INTEGER,
    "previewUrl" TEXT,
    "taggingStatus" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "input_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mask_regions" (
    "inputImageId" INTEGER NOT NULL,
    "maskUrl" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "materialOptionId" INTEGER,
    "customizationOptionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "id" SERIAL NOT NULL,
    "customText" TEXT,
    "subCategoryId" INTEGER,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mask_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_prompt_materials" (
    "id" SERIAL NOT NULL,
    "inputImageId" INTEGER NOT NULL,
    "materialOptionId" INTEGER,
    "customizationOptionId" INTEGER,
    "subCategoryId" INTEGER,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isCustomText" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ai_prompt_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."generation_batches" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "inputImageId" INTEGER,
    "moduleType" "public"."ModuleType" NOT NULL,
    "prompt" TEXT,
    "totalVariations" INTEGER NOT NULL DEFAULT 1,
    "status" "public"."BatchStatus" NOT NULL DEFAULT 'PROCESSING',
    "creditsUsed" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metaData" JSONB,

    CONSTRAINT "generation_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."images" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "originalImageUrl" TEXT,
    "processedImageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "title" TEXT,
    "description" TEXT,
    "variationNumber" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."ImageStatus" NOT NULL DEFAULT 'PROCESSING',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "runpodJobId" TEXT,
    "runpodStatus" TEXT,
    "originalBaseImageId" INTEGER,
    "aiPrompt" TEXT,
    "maskMaterialMappings" JSONB,
    "aiMaterials" JSONB,
    "contextSelection" TEXT,
    "generationPrompt" TEXT,
    "settingsSnapshot" JSONB,
    "createUploadId" INTEGER,
    "refineUploadId" INTEGER,
    "tweakUploadId" INTEGER,
    "previewUrl" TEXT,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."create_settings" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "mode" TEXT,
    "variations" INTEGER NOT NULL DEFAULT 1,
    "creativity" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "expressivity" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "resemblance" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "buildingType" TEXT,
    "category" TEXT,
    "context" TEXT,
    "style" TEXT,
    "regions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "create_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tweak_batches" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "baseImageUrl" TEXT NOT NULL,
    "variations" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tweak_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tweak_operations" (
    "id" SERIAL NOT NULL,
    "tweakBatchId" INTEGER NOT NULL,
    "operationType" "public"."TweakOperationType" NOT NULL,
    "operationData" JSONB NOT NULL,
    "inputImageId" INTEGER,
    "sequenceOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tweak_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refine_settings" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1969,
    "height" INTEGER NOT NULL DEFAULT 1969,
    "aiStrength" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "resemblance" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "clarity" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "sharpness" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "matchColor" BOOLEAN NOT NULL DEFAULT false,
    "zoomLevel" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "variations" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refine_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."likes" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "imageId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shares" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "imageId" INTEGER NOT NULL,
    "platform" "public"."SharePlatform" NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customization_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customization_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customization_sub_categories" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "hasSubItems" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customization_sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."material_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."material_category_sub_categories" (
    "id" SERIAL NOT NULL,
    "materialCategoryId" INTEGER NOT NULL,
    "subCategoryId" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_category_sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."material_options" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customization_options" (
    "id" SERIAL NOT NULL,
    "subCategoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customization_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."webhook_events" (
    "id" SERIAL NOT NULL,
    "stripe_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "public"."users"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "public"."users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_planType_isEducational_key" ON "public"."plans"("planType", "isEducational");

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_stripePriceId_key" ON "public"."plan_prices"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_planId_billingCycle_key" ON "public"."plan_prices"("planId", "billingCycle");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "public"."subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_stripeSubscriptionId_idx" ON "public"."subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "public"."subscriptions"("status");

-- CreateIndex
CREATE INDEX "credit_transactions_userId_status_expiresAt_idx" ON "public"."credit_transactions"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "credit_transactions_userId_status_idx" ON "public"."credit_transactions"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_materials_inputImageId_subCategoryId_materialOpti_key" ON "public"."ai_prompt_materials"("inputImageId", "subCategoryId", "materialOptionId", "customizationOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "images_batchId_variationNumber_key" ON "public"."images"("batchId", "variationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "create_settings_batchId_key" ON "public"."create_settings"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "tweak_batches_batchId_key" ON "public"."tweak_batches"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "refine_settings_batchId_key" ON "public"."refine_settings"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "likes_userId_imageId_key" ON "public"."likes"("userId", "imageId");

-- CreateIndex
CREATE UNIQUE INDEX "customization_categories_name_key" ON "public"."customization_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "customization_categories_slug_key" ON "public"."customization_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "customization_sub_categories_categoryId_slug_key" ON "public"."customization_sub_categories"("categoryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "material_categories_name_key" ON "public"."material_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "material_categories_slug_key" ON "public"."material_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "material_category_sub_categories_materialCategoryId_subCate_key" ON "public"."material_category_sub_categories"("materialCategoryId", "subCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "material_options_categoryId_slug_key" ON "public"."material_options"("categoryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "customization_options_subCategoryId_slug_key" ON "public"."customization_options"("subCategoryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_stripe_event_id_key" ON "public"."webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "webhook_events_stripe_event_id_idx" ON "public"."webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "webhook_events_event_type_idx" ON "public"."webhook_events"("event_type");

-- AddForeignKey
ALTER TABLE "public"."plan_prices" ADD CONSTRAINT "plan_prices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_transactions" ADD CONSTRAINT "credit_transactions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."generation_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_transactions" ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."input_images" ADD CONSTRAINT "input_images_createUploadId_fkey" FOREIGN KEY ("createUploadId") REFERENCES "public"."input_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."input_images" ADD CONSTRAINT "input_images_refineUploadId_fkey" FOREIGN KEY ("refineUploadId") REFERENCES "public"."input_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."input_images" ADD CONSTRAINT "input_images_tweakUploadId_fkey" FOREIGN KEY ("tweakUploadId") REFERENCES "public"."input_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."input_images" ADD CONSTRAINT "input_images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mask_regions" ADD CONSTRAINT "mask_regions_customizationOptionId_fkey" FOREIGN KEY ("customizationOptionId") REFERENCES "public"."customization_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mask_regions" ADD CONSTRAINT "mask_regions_inputImageId_fkey" FOREIGN KEY ("inputImageId") REFERENCES "public"."input_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mask_regions" ADD CONSTRAINT "mask_regions_materialOptionId_fkey" FOREIGN KEY ("materialOptionId") REFERENCES "public"."material_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mask_regions" ADD CONSTRAINT "mask_regions_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "public"."customization_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_prompt_materials" ADD CONSTRAINT "ai_prompt_materials_customizationOptionId_fkey" FOREIGN KEY ("customizationOptionId") REFERENCES "public"."customization_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_prompt_materials" ADD CONSTRAINT "ai_prompt_materials_inputImageId_fkey" FOREIGN KEY ("inputImageId") REFERENCES "public"."input_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_prompt_materials" ADD CONSTRAINT "ai_prompt_materials_materialOptionId_fkey" FOREIGN KEY ("materialOptionId") REFERENCES "public"."material_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_prompt_materials" ADD CONSTRAINT "ai_prompt_materials_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "public"."customization_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."generation_batches" ADD CONSTRAINT "generation_batches_inputImageId_fkey" FOREIGN KEY ("inputImageId") REFERENCES "public"."input_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."generation_batches" ADD CONSTRAINT "generation_batches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."images" ADD CONSTRAINT "images_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."generation_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."images" ADD CONSTRAINT "images_createUploadId_fkey" FOREIGN KEY ("createUploadId") REFERENCES "public"."input_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."images" ADD CONSTRAINT "images_originalBaseImageId_fkey" FOREIGN KEY ("originalBaseImageId") REFERENCES "public"."images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."images" ADD CONSTRAINT "images_refineUploadId_fkey" FOREIGN KEY ("refineUploadId") REFERENCES "public"."input_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."images" ADD CONSTRAINT "images_tweakUploadId_fkey" FOREIGN KEY ("tweakUploadId") REFERENCES "public"."input_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."images" ADD CONSTRAINT "images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."create_settings" ADD CONSTRAINT "create_settings_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."generation_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tweak_batches" ADD CONSTRAINT "tweak_batches_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."generation_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tweak_operations" ADD CONSTRAINT "tweak_operations_inputImageId_fkey" FOREIGN KEY ("inputImageId") REFERENCES "public"."input_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tweak_operations" ADD CONSTRAINT "tweak_operations_tweakBatchId_fkey" FOREIGN KEY ("tweakBatchId") REFERENCES "public"."tweak_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refine_settings" ADD CONSTRAINT "refine_settings_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."generation_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."likes" ADD CONSTRAINT "likes_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "public"."images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."likes" ADD CONSTRAINT "likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shares" ADD CONSTRAINT "shares_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "public"."images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shares" ADD CONSTRAINT "shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customization_sub_categories" ADD CONSTRAINT "customization_sub_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."customization_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."material_category_sub_categories" ADD CONSTRAINT "material_category_sub_categories_materialCategoryId_fkey" FOREIGN KEY ("materialCategoryId") REFERENCES "public"."material_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."material_category_sub_categories" ADD CONSTRAINT "material_category_sub_categories_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "public"."customization_sub_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."material_options" ADD CONSTRAINT "material_options_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."material_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customization_options" ADD CONSTRAINT "customization_options_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "public"."customization_sub_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

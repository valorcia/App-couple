-- CreateTable
CREATE TABLE "IntimacyCard" (
    "id" UUID NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "level" INTEGER NOT NULL DEFAULT 1,
    "role" TEXT NOT NULL DEFAULT 'DRAWER',
    "text" TEXT NOT NULL,
    "durationSec" INTEGER,
    "tier" "ContentTier" NOT NULL DEFAULT 'PREMIUM',
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntimacyCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntimacyCard_locale_level_status_idx" ON "IntimacyCard"("locale", "level", "status");

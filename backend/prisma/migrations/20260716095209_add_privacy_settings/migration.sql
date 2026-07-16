-- CreateTable
CREATE TABLE "privacy_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "controller_name" TEXT,
    "controller_document" TEXT,
    "dpo_name" TEXT,
    "dpo_email" TEXT,
    "retention_notice" TEXT,
    "additional_notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privacy_settings_pkey" PRIMARY KEY ("id")
);


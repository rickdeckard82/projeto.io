-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "pushover_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pushover_user_key" TEXT;

-- CreateTable
CREATE TABLE "pushover_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "api_token_encrypted" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pushover_settings_pkey" PRIMARY KEY ("id")
);


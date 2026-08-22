-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "google_chat_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "google_chat_webhook_url" TEXT;


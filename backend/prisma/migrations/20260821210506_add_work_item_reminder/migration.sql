-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TASK_REMINDER';

-- AlterTable
ALTER TABLE "work_items" ADD COLUMN     "reminder_at" TIMESTAMP(3),
ADD COLUMN     "reminder_notified_at" TIMESTAMP(3),
ADD COLUMN     "reminder_offset_minutes" INTEGER;


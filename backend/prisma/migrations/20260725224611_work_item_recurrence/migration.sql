-- CreateEnum
CREATE TYPE "RecurrenceUnit" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'RECURRENCE_GENERATED';

-- AlterTable
ALTER TABLE "work_items" ADD COLUMN     "recurrence_interval" INTEGER,
ADD COLUMN     "recurrence_unit" "RecurrenceUnit";


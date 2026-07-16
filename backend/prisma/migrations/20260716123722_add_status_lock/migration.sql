-- AlterTable
ALTER TABLE "work_items" ADD COLUMN     "status_locked_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_status_locked_by_id_fkey" FOREIGN KEY ("status_locked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


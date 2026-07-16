-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CREATED', 'TITLE_CHANGED', 'DESCRIPTION_CHANGED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'LABEL_ADDED', 'LABEL_REMOVED', 'ASSIGNEE_ADDED', 'ASSIGNEE_REMOVED', 'COMMENT');

-- CreateTable
CREATE TABLE "item_activities" (
    "id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_activities_work_item_id_idx" ON "item_activities"("work_item_id");

-- AddForeignKey
ALTER TABLE "item_activities" ADD CONSTRAINT "item_activities_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_activities" ADD CONSTRAINT "item_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


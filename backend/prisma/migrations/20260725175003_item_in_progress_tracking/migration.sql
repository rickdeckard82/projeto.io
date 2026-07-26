-- AlterTable
ALTER TABLE "work_items" ADD COLUMN     "in_progress_seconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "in_progress_since" TIMESTAMP(3);

-- Backfill: itens que já estão "em andamento" (status de categoria STARTED) no momento deste
-- deploy passam a contar o tempo em andamento a partir de agora — não há como saber quando essa
-- passagem para "em andamento" ocorreu de fato antes desta migration.
UPDATE "work_items" wi
SET "in_progress_since" = now()
FROM "statuses" s
WHERE wi."status_id" = s."id" AND s."category" = 'STARTED';


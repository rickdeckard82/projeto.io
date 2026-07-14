-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "cover_color" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "projects_key_key" ON "projects"("key");


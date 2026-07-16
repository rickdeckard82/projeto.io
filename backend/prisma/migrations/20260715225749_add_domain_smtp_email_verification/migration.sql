-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "verification_email_sent_at" TIMESTAMP(3),
ADD COLUMN     "verification_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "verification_token_hash" TEXT;

-- DataMigration: usuários já existentes (criados antes da confirmação por e-mail existir)
-- são considerados verificados retroativamente, para não travar seus logins.
UPDATE "users" SET "email_verified_at" = CURRENT_TIMESTAMP WHERE "email_verified_at" IS NULL;

-- CreateTable
CREATE TABLE "allowed_domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allowed_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smtp_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "use_ssl" BOOLEAN NOT NULL DEFAULT false,
    "from_email" TEXT NOT NULL,
    "auth_user" TEXT NOT NULL,
    "auth_pass_encrypted" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smtp_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allowed_domains_domain_key" ON "allowed_domains"("domain");


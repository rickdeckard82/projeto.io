-- CreateTable
CREATE TABLE "backup_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "run_time" TEXT NOT NULL DEFAULT '02:30',
    "keep_count" INTEGER NOT NULL DEFAULT 7,
    "ftp_host" TEXT,
    "ftp_port" INTEGER NOT NULL DEFAULT 21,
    "ftp_user" TEXT,
    "ftp_password_encrypted" TEXT,
    "ftp_directory" TEXT,
    "ftp_tls" BOOLEAN NOT NULL DEFAULT true,
    "ftp_write_only" BOOLEAN NOT NULL DEFAULT false,
    "run_requested_at" TIMESTAMP(3),
    "last_attempt_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "last_status" TEXT,
    "last_message" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_settings_pkey" PRIMARY KEY ("id")
);


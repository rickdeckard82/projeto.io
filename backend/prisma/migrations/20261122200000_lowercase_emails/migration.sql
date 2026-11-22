-- E-mails passam a ser gravados/buscados em minúsculas (ver NormalizeEmail nos DTOs).
-- Pula quem colidiria com outra conta já em minúsculas, para a migration não falhar no UNIQUE.
UPDATE "users" u
SET "email" = lower(u."email")
WHERE u."email" <> lower(u."email")
  AND NOT EXISTS (SELECT 1 FROM "users" o WHERE o."email" = lower(u."email"));

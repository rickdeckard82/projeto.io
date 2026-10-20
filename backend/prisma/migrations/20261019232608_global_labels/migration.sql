-- Etiquetas passam a ser globais (não mais por projeto). Antes de tirar o project_id, une as
-- etiquetas de mesmo nome (sem diferenciar maiúsculas/espaços nas pontas) de projetos diferentes
-- numa só — fica a mais antiga, com o nome e a cor dela — e passa os vínculos com itens para ela.
CREATE TEMP TABLE label_merge AS
SELECT id,
       first_value(id) OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at, id) AS keep_id
FROM "labels";

-- Vínculos que virariam duplicados no mesmo item (o item já tem a etiqueta que fica, ou outra
-- duplicata com id menor): apaga antes de redirecionar, por causa do UNIQUE (work_item_id, label_id).
DELETE FROM "item_labels" il
USING label_merge m
WHERE il.label_id = m.id
  AND m.id <> m.keep_id
  AND EXISTS (
    SELECT 1
    FROM "item_labels" o
    JOIN label_merge mo ON mo.id = o.label_id
    WHERE o.work_item_id = il.work_item_id
      AND mo.keep_id = m.keep_id
      AND (o.label_id = m.keep_id OR o.id < il.id)
  );

UPDATE "item_labels" il
SET label_id = m.keep_id
FROM label_merge m
WHERE il.label_id = m.id
  AND m.id <> m.keep_id;

DELETE FROM "labels" l
USING label_merge m
WHERE l.id = m.id
  AND m.id <> m.keep_id;

UPDATE "labels" SET name = btrim(name) WHERE name <> btrim(name);

DROP TABLE label_merge;

-- DropForeignKey
ALTER TABLE "labels" DROP CONSTRAINT "labels_project_id_fkey";

-- DropIndex
DROP INDEX "labels_project_id_name_key";

-- AlterTable
ALTER TABLE "labels" DROP COLUMN "project_id";

-- CreateIndex
CREATE UNIQUE INDEX "labels_name_key" ON "labels"("name");

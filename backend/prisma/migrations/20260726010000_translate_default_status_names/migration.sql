-- Backfill: traduz os nomes de status default (criados em inglês antes da
-- tradução do seed em c6783de) para os projetos já existentes.
-- Só atualiza linhas cujo nome bate exatamente com o default antigo em
-- inglês para a mesma categoria, preservando status que o usuário tenha
-- renomeado manualmente (ainda que também estejam em inglês de propósito).
UPDATE "statuses" SET "name" = 'A Fazer'      WHERE "name" = 'Todo'         AND "category" = 'UNSTARTED';
UPDATE "statuses" SET "name" = 'Em Andamento' WHERE "name" = 'In Progress' AND "category" = 'STARTED';
UPDATE "statuses" SET "name" = 'Concluído'    WHERE "name" = 'Done'        AND "category" = 'COMPLETED';
UPDATE "statuses" SET "name" = 'Cancelado'    WHERE "name" = 'Cancelled'   AND "category" = 'CANCELLED';

/** Paleta fixa de cores de capa usada quando o usuário não escolhe uma cor manualmente. */
export const COVER_COLOR_PALETTE = [
  '#0EA5E9',
  '#6366F1',
  '#F97316',
  '#10B981',
  '#EC4899',
  '#8B5CF6',
  '#EAB308',
  '#EF4444',
];

/**
 * Escolhe deterministicamente uma cor de capa da `COVER_COLOR_PALETTE` a partir de uma semente
 * (tipicamente o nome do projeto), usada como fallback quando `dto.coverColor` não é informado
 * em `ProjectsService.create`. Por ser determinístico (hash simples do texto), o mesmo nome
 * sempre produz a mesma cor.
 * @param seed - Texto usado para derivar o índice na paleta (ex.: nome do projeto).
 * @returns Uma cor hexadecimal da `COVER_COLOR_PALETTE`.
 */
export function pickCoverColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COVER_COLOR_PALETTE.length;
  return COVER_COLOR_PALETTE[index];
}

/**
 * Sugere uma key de projeto (ex.: "ZABBIXIA") a partir do nome, para o caso de o usuário não
 * informar uma explicitamente. Algoritmo: remove tudo que não for letra, converte para
 * maiúsculas, pega os 3 primeiros caracteres e completa com "X" à direita se o nome tiver
 * menos de 3 letras; se não sobrar nenhuma letra, usa "PRJ" como base. A desambiguação em
 * caso de colisão com uma key já existente (sufixo numérico incremental) é feita à parte,
 * em `ProjectsService.resolveProjectKey`, não nesta função.
 * @param name - Nome do projeto.
 * @returns Key candidata de 3 caracteres, em maiúsculas (ainda não garantida como única).
 */
export function suggestProjectKey(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  return (letters.slice(0, 3) || 'PRJ').padEnd(3, 'X');
}

// Paleta fixa de cores disponíveis para a capa (coverColor) de um projeto, exibida no seletor de criação/edição.
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
 * Sugere uma "key" curta de projeto (ex.: "ZABBIXIA") a partir do nome informado, para pré-preencher o campo no formulário de criação.
 * Remove tudo que não for letra, converte para maiúsculas e usa os 3 primeiros caracteres restantes; se sobrar menos de 3 letras, completa com "X" à direita.
 * @param name - nome do projeto digitado pelo usuário
 * @returns sugestão de key com 3 caracteres (ou vazio se o nome não tiver nenhuma letra)
 */
export function suggestProjectKey(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  return (letters.slice(0, 3) || '').padEnd(letters ? 3 : 0, 'X');
}

// Emojis disponíveis para o usuário escolher como ícone do projeto no seletor de criação/edição.
export const ICON_OPTIONS = [
  '📁', '🚀', '💡', '🛠️', '📊', '🔧', '🌐', '📡',
  '🛰️', '🔒', '📈', '🧩', '🗂️', '⚙️', '📦', '🧭',
  '😊', '🔥', '⭐', '🎯', '🧠', '💬', '🏗️', '🧪',
];

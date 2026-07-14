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

export function pickCoverColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COVER_COLOR_PALETTE.length;
  return COVER_COLOR_PALETTE[index];
}

export function suggestProjectKey(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  return (letters.slice(0, 3) || 'PRJ').padEnd(3, 'X');
}

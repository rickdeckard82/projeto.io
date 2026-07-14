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

export function suggestProjectKey(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  return (letters.slice(0, 3) || '').padEnd(letters ? 3 : 0, 'X');
}

export const ICON_OPTIONS = [
  '📁', '🚀', '💡', '🛠️', '📊', '🔧', '🌐', '📡',
  '🛰️', '🔒', '📈', '🧩', '🗂️', '⚙️', '📦', '🧭',
  '😊', '🔥', '⭐', '🎯', '🧠', '💬', '🏗️', '🧪',
];

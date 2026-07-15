/**
 * Converte uma cor hexadecimal (3 ou 6 dígitos, com ou sem '#') nos componentes "r, g, b" separados por vírgula, prontos para compor um valor `rgba(...)` em CSS ou canvas.
 * @param hex - cor em formato hexadecimal (ex.: "#0EA5E9" ou "0ea")
 * @returns string no formato "r, g, b" (ex.: "14, 165, 233")
 */
export function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

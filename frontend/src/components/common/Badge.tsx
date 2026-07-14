export function Badge({ color, children }: { color?: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-slate-950"
      style={{ backgroundColor: color || '#64748b' }}
    >
      {children}
    </span>
  );
}

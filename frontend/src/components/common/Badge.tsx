export function Badge({ color, children }: { color?: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-200">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color || '#64748b' }} />
      {children}
    </span>
  );
}

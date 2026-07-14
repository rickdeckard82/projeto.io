export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-800 py-12 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
  );
}

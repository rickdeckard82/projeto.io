import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
      <p className="text-lg font-semibold">Página não encontrada</p>
      <Link to="/projects" className="text-indigo-400">
        Voltar para projetos
      </Link>
    </div>
  );
}

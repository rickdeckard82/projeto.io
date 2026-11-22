import { Link } from 'react-router-dom';
import { APP_VERSION } from '../../lib/appInfo';
import { BarWaves } from '../common/BarWaves';

/** Rodapé fixo do AppShell (abaixo da área de conteúdo): copyright, versão (→ `/changelog`) e Política de Privacidade. */
export function AppFooter() {
  return (
    <footer className="relative shrink-0">
      <BarWaves />
      <div className="relative z-10 py-2 text-center text-[11px] leading-relaxed text-slate-500">
        H2NODE © 2026 Projeto.io •{' '}
        <Link to="/changelog" className="text-indigo-400 hover:underline">
          v{APP_VERSION}
        </Link>
        <br />
        <Link to="/privacidade" target="_blank" className="hover:text-slate-300">
          Política de Privacidade
        </Link>
      </div>
    </footer>
  );
}

export interface ChangelogEntry {
  version: string;
  /** Data no formato AAAA-MM-DD. */
  date: string;
  changes: string[];
}

/**
 * Histórico de versões exibido em `/changelog`. Ordem não importa — `ChangelogPage` ordena por
 * `date` (mais recente primeiro) antes de renderizar.
 *
 * Convenção deste repositório: ao commitar uma mudança perceptível para quem usa o app (feature,
 * correção de bug visível, etc.), suba `APP_VERSION` em `lib/appInfo.ts` (e a versão em
 * `frontend/package.json`/`backend/package.json`, para os três não divergirem) e adicione uma
 * entrada aqui descrevendo a mudança em português, no mesmo estilo das existentes. Mudanças
 * internas sem efeito perceptível (refatoração, ajuste de tsconfig, etc.) não precisam de entrada.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '2026-07-26',
    changes: [
      'Métricas de projeto passam a mostrar o tempo somado de cada responsável (soma do tempo "em andamento" de todas as tarefas em que a pessoa está atribuída).',
      'Adicionada a métrica de tarefas recorrentes: quantas séries ainda estão ativas e quantas vezes cada uma já se repetiu.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-26',
    changes: [
      'Adicionada a possibilidade de tornar uma tarefa recorrente (diária, semanal, mensal ou a cada N dias) — ao concluir, a próxima ocorrência é criada automaticamente.',
      'Uma tarefa concluída ou cancelada não pode mais ser movida, exceto por um Admin.',
      'Adicionado fuso horário por usuário (editável em Perfil) — datas e horários passam a ser exibidos no fuso escolhido.',
      'Adicionado menu para filtrar projetos entre "Meus projetos" e "Projetos em que participo".',
      'Traduzidos os status padrão do quadro kanban para português (A Fazer, Em Andamento, Concluído, Cancelado).',
      'Corrigido o formato de exibição de datas de vencimento (agora dd/mm/aaaa) e um bug que podia mostrar a data um dia antes da real.',
      'Adicionada esta página de changelog.',
      'Corrigido: o identificador de um novo projeto não bloqueava mais a criação quando coincidia com o de outro projeto — agora é desambiguado automaticamente, a menos que editado manualmente.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-14',
    changes: ['Lançamento inicial do Projeto.io.'],
  },
];

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
    version: '1.18.0',
    date: '2026-10-19',
    changes: [
      'Backup automático do banco por FTP (Configurações > Backup, só administradores): horário diário, servidor FTP/FTPS, pasta, cópias mantidas, "Testar conexão" e "Executar agora". O dump vai como .sql.gz, não fica cópia no servidor e cada execução aparece na Auditoria.',
      'Opção "Destino só de gravação (Pulse Backup)": envia direto com o nome final e deixa a retenção por conta do servidor de backup.',
    ],
  },
  {
    version: '1.17.2',
    date: '2026-09-25',
    changes: [
      'Celular: o menu lateral agora abre pelo botão ☰ na barra superior, como uma gaveta sobre a tela (fecha ao tocar fora ou ao navegar). Antes ele simplesmente não aparecia em telas pequenas.',
    ],
  },
  {
    version: '1.17.1',
    date: '2026-09-25',
    changes: ['Logo do Projeto.io maior no topo do menu lateral.'],
  },
  {
    version: '1.17.0',
    date: '2026-09-25',
    changes: [
      'Página de Política de Privacidade ganhou as ondas animadas e o copyright no rodapé; o link "Voltar" agora leva à página inicial (ou ao login, se não houver sessão).',
      'Páginas de Configurações (Perfil, Segurança, Notificações e as de administração) agora ficam centralizadas, na mesma largura da página inicial.',
      'Menu lateral agora vai até o topo da tela, com o logo do Projeto.io no alto (recolhido, só o ícone); a barra superior com ondas fica ao lado dele, igual ao rodapé.',
    ],
  },
  {
    version: '1.16.0',
    date: '2026-09-25',
    changes: [
      'Barra superior e rodapé ganharam ondas animadas sutis, no mesmo estilo da tela de login.',
      'Copyright, versão e Política de Privacidade saíram do menu lateral e agora ficam sempre visíveis no rodapé da página.',
      'Menu lateral pode ser recolhido (botão no topo do menu) para uma faixa só de ícones — os projetos aparecem pelo ícone, com o nome ao passar o mouse. A escolha fica lembrada neste navegador.',
    ],
  },
  {
    version: '1.15.0',
    date: '2026-09-25',
    changes: [
      'Telas de login, cadastro, confirmação de e-mail e 2FA obrigatório ganharam ondas animadas sutis no fundo (desligadas quando o sistema pede movimento reduzido).',
    ],
  },
  {
    version: '1.14.0',
    date: '2026-09-06',
    changes: [
      'Verificação anti-robô (Cloudflare Turnstile) nas telas de login e cadastro — aparece quando a instância está configurada com as chaves do Turnstile; sem elas, nada muda.',
    ],
  },
  {
    version: '1.13.0',
    date: '2026-09-06',
    changes: [
      'Tarefas recorrentes: novo campo "Esta é a última ocorrência" no detalhe do item — marcando-o, concluir a tarefa não gera a próxima ocorrência, encerrando a série. A série continua aparecendo em Métricas → Tarefas recorrentes, com a marca "última".',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-09-06',
    changes: [
      'Nova tela Configurações → Auditoria (administradores): registra login e logout, ativação/desativação de 2FA, mudança de senha, criação de usuário, troca de papel, desativação e anonimização de contas, e alterações de configuração — com data, autor e IP.',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-09-06',
    changes: [
      'Administradores agora são obrigados a ativar a verificação em duas etapas (2FA): enquanto não ativarem, o acesso fica restrito à tela de configuração do 2FA.',
      'Cabeçalhos de segurança HTTP reforçados no frontend e na API (HSTS, Content-Security-Policy, X-Frame-Options e afins).',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-09-06',
    changes: [
      'Reforço de segurança: login, cadastro, confirmação de e-mail e verificação de 2FA agora têm limite de tentativas por minuto — ao exceder, a resposta passa a ser "429 Tentativas demais" por um intervalo curto, dificultando ataques de força bruta.',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-08-22',
    changes: [
      'Usuários com papel Senior agora também podem editar um projeto (ícone, capa, descrição, visibilidade e líder) — antes era restrito a administradores.',
    ],
  },
  {
    version: '1.8.3',
    date: '2026-08-22',
    changes: [
      'Corrigido: o menu de atribuição rápida direto no card do quadro também passou a listar apenas os membros do projeto (a correção anterior só cobria o modal de detalhe do item).',
    ],
  },
  {
    version: '1.8.2',
    date: '2026-08-22',
    changes: [
      'Corrigido: a atribuição de responsáveis num item agora lista apenas os membros do projeto, em vez de todos os usuários do sistema.',
    ],
  },
  {
    version: '1.8.1',
    date: '2026-08-22',
    changes: [
      'Configurações > Segurança agora lista os dispositivos confiáveis do 2FA (navegador, quando foram lembrados e quando expiram), com opção de esquecer um por vez.',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-08-22',
    changes: [
      'Autenticação de dois fatores ganhou a opção "Lembrar este dispositivo por 30 dias" — marcando-a, o código não é mais pedido nesse navegador até o prazo expirar ou os dispositivos serem esquecidos.',
      'Adicionado botão "Esquecer dispositivos confiáveis" em Configurações > Segurança, para voltar a exigir o código de verificação em todo lugar.',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-08-22',
    changes: [
      'Adicionado Google Chat como novo canal de notificação: cole a URL do webhook de entrada de um Space em Configurações > Notificações para habilitar o reforço.',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-08-22',
    changes: [
      'Novas notificações: ao ser adicionado como membro de um projeto, e quando uma tarefa sob sua responsabilidade é concluída ou cancelada.',
    ],
  },
  {
    version: '1.5.1',
    date: '2026-08-22',
    changes: [
      'Notificações por e-mail, Telegram e Pushover agora informam o nome do projeto no título.',
      'Notificações de lembrete customizado passam a detalhar o motivo do lembrete, o vencimento, a prioridade e a descrição da tarefa.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-08-22',
    changes: [
      'Adicionado Pushover como novo canal de notificação: administradores configuram o API token da aplicação em Configurações > Pushover, e cada usuário informa sua User Key em Configurações > Notificações para habilitar o reforço.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-08-21',
    changes: [
      'Início e Vencimento de uma tarefa agora aceitam também um horário, além da data.',
      'Adicionado lembrete customizado por tarefa: escolha um horário exato ou "avisar X antes do vencimento" (10 min a 1 semana) — dispara uma notificação (sino/e-mail/Telegram/webhook) no momento configurado.',
    ],
  },
  {
    version: '1.3.3',
    date: '2026-08-21',
    changes: [
      'Adicionado botão "Limpar" no painel de notificações do sino, para apagar de uma vez todo o histórico.',
    ],
  },
  {
    version: '1.3.2',
    date: '2026-08-21',
    changes: [
      'Lista de tarefas recentes: a data de vencimento foi movida para o lado direito, perto do avatar, e ganhou um indicador colorido (verde quando no prazo, vermelho quando vencida).',
    ],
  },
  {
    version: '1.3.1',
    date: '2026-08-21',
    changes: [
      'Notificação de atribuição de tarefa passa a disparar também quando a pessoa se atribui a si mesma, não só quando é atribuída por outra pessoa.',
      'Alerta de tarefa atrasada passa a se repetir a cada 24h enquanto ela continuar vencida e não concluída, em vez de avisar só uma vez.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-08-21',
    changes: [
      'Adicionado sistema de notificações: alerta de vencimento de tarefa (24h antes do prazo e ao atrasar, sem repetir) e de nova atribuição, com sino em tempo real no topo da página.',
      'Cada usuário pode habilitar e desabilitar, em Configurações > Notificações, o reforço por e-mail, Telegram e webhook (com URL e assinatura próprias) além do sino.',
      'Administradores podem configurar o bot do Telegram usado para enviar notificações em Configurações > Telegram.',
    ],
  },
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

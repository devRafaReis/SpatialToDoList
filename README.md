# Spatial ToDoList

Kanban board com tema espacial. Organize tarefas em boards customizáveis com drag-and-drop, prioridades, planejamento, checklists, recorrência, múltiplos workspaces e efeitos visuais em canvas.

## Funcionalidades

### Tarefas
- Criar, editar e excluir tarefas com título, descrição e prioridade (Baixa / Média / Alta / Crítica)
- **Planejamento:** tempo estimado (horas/minutos) e intervalo de datas (início/fim)
- **Checklist:** subitens interativos com barra de progresso, expansíveis diretamente no card
- **Recorrência:** diária (todos os dias), diária (Seg–Sex), semanal ou mensal — com limite de repetições ou sem fim; ao mover para o último board, uma nova cópia é criada automaticamente com as datas deslocadas
- Drag-and-drop entre boards e reordenação dentro do mesmo board
- Mover tarefa via menu de contexto com efeito de portal animado

### Boards
- Criar, renomear e excluir boards customizados (além dos padrões: To Do, Doing, Done)
- Reordenar boards via drag-and-drop
- Minimizar/expandir boards individualmente
- Board se expande automaticamente ao criar uma tarefa dentro dele enquanto está minimizado

### Workspaces
- Múltiplos workspaces independentes (ex.: pessoal, profissional)
- Cada workspace possui seus próprios boards e tarefas isolados
- Criar, renomear e excluir workspaces pelo seletor no cabeçalho
- Confirmação ao excluir workspace com contagem de tarefas afetadas
- Dados existentes migrados automaticamente para o workspace padrão "Personal" na primeira abertura

### Filtros
- Filtrar cards por: Prioridade, Board, Data de Início e Data de Vencimento
- Badge no botão de filtro indica quantos filtros estão ativos

### Configurações
- Animações (estrelas, cometas, partículas — desativável para melhor performance)
- Layout do board: swimlane horizontal ou colunas verticais
- Checklists expandidos por padrão nos cards
- Modo claro ("Boring ToDoList") / escuro galaxy

### Animações
- Big Bang ao criar tarefa ou board
- Buraco negro ao deletar tarefa ou board
- Portal de saída/entrada ao mover tarefa entre boards
- Partículas ao arrastar card
- Easter egg: Nyan Cat atravessa a tela a cada 5 minutos

### Persistência
- Dados salvos automaticamente em `localStorage` por workspace
- Configurações salvas separadamente com prefixo `spatialTodo_`

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Bun |
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Estilo | Tailwind CSS + shadcn/ui |
| Drag-and-drop | @hello-pangea/dnd |
| Datas | date-fns |
| Testes | Vitest + Testing Library |

## Pré-requisitos

- [Bun](https://bun.sh) instalado globalmente

## Instalação

```bash
bun install
```

## Comandos do projeto

```bash
bun dev              # Inicia o servidor de desenvolvimento (porta 8080)
bun run build        # Build de produção
bun run build:dev    # Build em modo desenvolvimento
bun run lint         # ESLint
bun test             # Roda todos os testes uma vez
bun run test:watch   # Testes em modo watch
```

## Contexto para o Claude Code

Os scripts abaixo geram arquivos de contexto que facilitam sessões com o Claude Code.

```bash
bun run index            # Escaneia /src e gera project-map.json
bun run context          # Lê /docs + project-map.json e gera claude-context.txt
bun run prepare-context  # Executa os dois comandos acima em sequência
```

**Quando rodar:** sempre que fizer mudanças relevantes na arquitetura, adicionar novos arquivos ou modificar a lógica de estado.

## Estrutura do projeto

```
src/
  App.tsx                    # Providers e rotas
  main.tsx                   # Entry point
  index.css                  # Variáveis CSS, tema galaxy, keyframes de animação
  types/task.ts              # Task, TaskStatus, TaskPriority, Recurrence, Workspace, PRIORITIES
  store/
    taskStore.tsx            # Context + CRUD + handlers de drag-drop + lógica de recorrência
    settingsStore.tsx        # Configurações globais (animações, tema, layout, checklist)
    workspaceStore.tsx       # Workspaces: CRUD + workspace ativo + migração de dados legados
  services/taskStorage.ts    # Abstração de storage — createWorkspaceStorage(id)
  hooks/useTasks.ts          # Tarefas agrupadas por status (memoizado)
  pages/Index.tsx            # Rota / — monta TaskProvider com key=workspaceId
  components/
    KanbanBoard.tsx          # Orquestrador: drag-drop, filtros, gerenciamento de boards
    KanbanColumn.tsx         # Board droppable + animações de criação/exclusão + collapse
    TaskCard.tsx             # Card draggable + checklist inline + badge de recorrência + canvas
    TaskDialog.tsx           # Modal criação/edição (planejamento, checklist, recorrência)
    Header.tsx               # WorkspaceSwitcher + filtros + configurações + botão nova tarefa
    FilterPopover.tsx        # Popover de filtros (prioridade, board, datas)
    WorkspaceSwitcher.tsx    # Seletor de workspace com CRUD
    SettingsDialog.tsx       # Dialog de configurações globais
    StarParticles.tsx        # Canvas de fundo (estrelas + cometa periódico)
    SpaceEasterEggs.tsx      # Canvas overlay (Nyan Cat easter egg)
    ui/                      # Componentes shadcn/ui — não editar manualmente
docs/
  architecture.md            # Arquitetura completa, fluxo de dados, árvore de componentes
  decisions.md               # Decisões de design e padrões do código
  bugs.md                    # Problemas conhecidos e quirks
  flows/api.md               # Fluxo de storage e plano de migração para API
scripts/
  indexer.ts                 # Gerador de project-map.json
  context-builder.ts         # Gerador de claude-context.txt
```

## Migração para API

A camada de storage está abstraída em `src/services/taskStorage.ts`. Para migrar do `localStorage` para uma API:

1. Implemente `TaskStorageService` com chamadas ao seu backend (recebe `workspaceId`)
2. Substitua `createWorkspaceStorage` pela sua implementação
3. Nenhum outro arquivo precisa ser alterado

Detalhes em [docs/flows/api.md](docs/flows/api.md).

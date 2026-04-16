# Spatial ToDoList

Kanban board com tema espacial. Organize tarefas em quatro colunas — **To Do**, **Doing**, **Done** e **Cancelled** — com drag-and-drop, prioridades e efeitos visuais em canvas.

## Funcionalidades

- Criar, editar e excluir tarefas com título, descrição e prioridade (Baixa / Média / Alta / Crítica)
- Drag-and-drop entre colunas e reordenação dentro da mesma coluna
- Mover tarefa via menu de contexto (ícone de seta) com efeito de portal
- Animações em canvas: big bang ao criar, buraco negro ao deletar, portal ao mover, partículas ao arrastar
- Easter egg: Nyan Cat atravessa a tela a cada 5 minutos
- Persistência automática em `localStorage`

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Bun |
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Estilo | Tailwind CSS + shadcn/ui |
| Drag-and-drop | @hello-pangea/dnd |
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

Os scripts abaixo geram arquivos de contexto que facilitam sessões com o Claude Code, reduzindo a quantidade de tokens necessários para o agente entender o projeto.

```bash
bun run index            # Escaneia /src e gera project-map.json
bun run context          # Lê /docs + project-map.json e gera claude-context.txt
bun run prepare-context  # Executa os dois comandos acima em sequência
```

**Quando rodar:** sempre que fizer mudanças relevantes na arquitetura, adicionar novos arquivos ou modificar a lógica de estado. Após rodar, o arquivo `claude-context.txt` pode ser colado em uma nova sessão do Claude Code para dar contexto imediato.

## Estrutura do projeto

```
src/
  App.tsx                   # Providers e rotas
  main.tsx                  # Entry point
  index.css                 # Variáveis CSS, tema galaxy, keyframes de animação
  types/task.ts             # Task, TaskStatus, TaskPriority, COLUMNS, PRIORITIES
  store/taskStore.tsx       # Context + CRUD + handlers de drag-drop
  services/taskStorage.ts   # Abstração de storage (localStorage → troca por API aqui)
  hooks/useTasks.ts         # Tarefas agrupadas por status (memoizado)
  pages/Index.tsx           # Rota /
  components/
    KanbanBoard.tsx         # Orquestrador do board e lógica de drag-drop
    KanbanColumn.tsx        # Coluna droppable
    TaskCard.tsx            # Card draggable + todos os efeitos canvas
    TaskDialog.tsx          # Modal de criação/edição
    Header.tsx              # Título + botão "Nova Tarefa"
    StarParticles.tsx       # Canvas de fundo (estrelas + cometa periódico)
    NyanCatEasterEgg.tsx    # Canvas overlay (easter egg)
    ui/                     # Componentes shadcn/ui — não editar manualmente
docs/
  architecture.md           # Arquitetura completa, fluxo de dados, árvore de componentes
  decisions.md              # Decisões de design e padrões do código
  bugs.md                   # Problemas conhecidos e quirks
  flows/auth.md             # Ausência de auth e plano de migração
  flows/api.md              # Fluxo de storage e plano de migração para API
scripts/
  indexer.ts                # Gerador de project-map.json
  context-builder.ts        # Gerador de claude-context.txt
```

## Migração para API

A camada de storage está abstraída em `src/services/taskStorage.ts`. Para migrar do `localStorage` para uma API:

1. Crie `apiStorageService` implementando a interface `TaskStorageService`
2. Troque a última linha do arquivo: `export const taskStorage = apiStorageService`
3. Nenhum outro arquivo precisa ser alterado

Detalhes em [docs/flows/api.md](docs/flows/api.md).

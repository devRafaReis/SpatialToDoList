import { useState } from "react";
import {
  CheckSquare, LayoutGrid, Layers, Search, Settings, Cloud,
  Plus, Edit3, Flag, ListChecks, CalendarRange, RefreshCcw,
  CheckCircle2, Trash2, Archive, EyeOff,
  Columns, Palette, ChevronDown, GripVertical,
  SwitchCamera, FolderOpen, Trash,
  Filter, ArrowUpDown,
  Sparkles, Monitor, Languages, Target, Lock,
  LogIn, RefreshCw, AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n/translations";
import type { Language } from "@/i18n/translations";

type FeatureItem = { icon: React.ElementType; title: string; desc: string };
type Section = { icon: React.ElementType; title: string; items: FeatureItem[] };

const content: Record<Language, Section[]> = {
  en: [
    {
      icon: CheckSquare,
      title: "Tasks",
      items: [
        { icon: Plus,          title: "Create tasks",        desc: "Click + Task in the toolbar or Add task at the bottom of any board." },
        { icon: Edit3,         title: "Edit tasks",          desc: "Click on the card title to open the edit dialog, or use the ⋯ menu → Edit." },
        { icon: Flag,          title: "Priority",            desc: "Set Low, Medium, High, or Critical priority — color-coded on the card (green → red)." },
        { icon: ListChecks,    title: "Checklists",          desc: "Add sub-tasks inside any task. Progress shows as a counter (e.g. 2/5) on the card." },
        { icon: CalendarRange, title: "Planning",            desc: "Set estimated time (e.g. 1h30m), start & end dates, and specific times." },
        { icon: RefreshCcw,    title: "Recurrence",          desc: "Auto-clone a task when it moves to the last board. Supports daily, weekly, monthly, or every N days." },
        { icon: CheckCircle2,  title: "Mark as done",        desc: "Configure a Completed board in Settings → a circle button appears on each card to auto-move it there." },
        { icon: Trash2,        title: "Delete with undo",    desc: "Delete a task and use the Undo toast notification to recover it within a few seconds." },
        { icon: Archive,       title: "Archive tasks",       desc: "Archive tasks to hide them without deleting. Restore them from the Archive button in the header." },
        { icon: EyeOff,        title: "Hide tasks",          desc: "Temporarily hide a task from the board — it stays in the archive and can be restored anytime." },
        { icon: GripVertical,  title: "Drag & drop",         desc: "Drag cards between boards or reorder them within a board." },
      ],
    },
    {
      icon: LayoutGrid,
      title: "Boards",
      items: [
        { icon: Plus,       title: "Create boards",    desc: "Click + Board in the toolbar to add a new column. Board names are limited to 20 characters." },
        { icon: Edit3,      title: "Rename boards",    desc: "Double-click the board title (or ⋯ → Rename) to edit it inline. Press Enter to confirm." },
        { icon: Palette,    title: "Board colors",     desc: "Pick one of 8 accent colors from the board menu to visually distinguish your boards." },
        { icon: ArrowUpDown,title: "Sort tasks",       desc: "Use the sort button on a board to reorder cards by priority or by start date." },
        { icon: Archive,    title: "Archive boards",   desc: "Archive an entire board — tasks stay inside. Restore from the Archive dialog." },
        { icon: EyeOff,     title: "Hide boards",      desc: "Hide a board from view without archiving it. Toggle hidden boards from the board menu." },
        { icon: Columns,    title: "Collapse/Expand",  desc: "Collapse boards to save space — use the buttons in the toolbar to collapse or expand all at once." },
        { icon: Trash,      title: "Delete boards",    desc: "Deleting a board moves its tasks to the first available board (not deleted)." },
      ],
    },
    {
      icon: Layers,
      title: "Workspaces",
      items: [
        { icon: FolderOpen,   title: "Multiple workspaces", desc: "Create separate workspaces for different projects. Each has its own boards and tasks." },
        { icon: SwitchCamera, title: "Switch workspace",    desc: "Click your workspace name in the header to open the switcher and jump between spaces." },
        { icon: Edit3,        title: "Rename & delete",     desc: "Rename or delete a workspace from the workspace switcher dropdown." },
        { icon: Target,       title: "Progress indicator",  desc: "If a Completed board is configured, the switcher shows a done/total task ratio for the workspace." },
        { icon: Lock,         title: "Privacy mode",        desc: "Click the eye icon in the header to blur workspace names and card titles — useful for screen sharing." },
      ],
    },
    {
      icon: Search,
      title: "Search & Filters",
      items: [
        { icon: Search,    title: "Search",         desc: "Type in the search bar to find tasks by title across all boards in real time." },
        { icon: Filter,    title: "Filter by...",   desc: "Open Filters to narrow tasks by priority, board, start date range, or due date range." },
        { icon: Flag,      title: "Priority filter", desc: "Select one or more priority levels — only matching cards are shown." },
        { icon: LayoutGrid,title: "Board filter",   desc: "Select specific boards to focus on — hides tasks from other boards." },
        { icon: ArrowUpDown,title: "Sort per board", desc: "Sort tasks inside a board by priority (Critical → Low) or by start date (oldest first)." },
      ],
    },
    {
      icon: Settings,
      title: "Settings",
      items: [
        { icon: Sparkles,     title: "Animations",       desc: "Toggle stars, comets, and ship effects. Disable for better performance or in light mode." },
        { icon: Monitor,      title: "Board layout",     desc: "Switch between Vertical columns and Horizontal swimlane (desktop only)." },
        { icon: ListChecks,   title: "Expand checklists",desc: "Show checklist items expanded by default on all cards instead of collapsed." },
        { icon: Monitor,      title: "Light mode",       desc: "Toggle between the dark galaxy theme and the plain light theme." },
        { icon: Languages,    title: "Language",         desc: "Switch the interface between English and Portuguese (Brazil)." },
        { icon: CheckCircle2, title: "Completed board",  desc: "Pick a board to use as the done column — tasks auto-move there when you click the circle on a card." },
      ],
    },
    {
      icon: Cloud,
      title: "Sync & Account",
      items: [
        { icon: LogIn,      title: "Sign in with Google", desc: "Log in to sync your tasks and boards across devices automatically." },
        { icon: RefreshCw,  title: "Sync status",         desc: "The cloud icon in the header shows sync state — click it to force an immediate sync." },
        { icon: AlertCircle,title: "Offline mode",        desc: "All changes are saved locally first. They sync to the cloud once you're back online." },
        { icon: Lock,       title: "Access list",         desc: "This app uses an allowlist — sign-in is restricted to approved emails. Request access from the dialog." },
      ],
    },
  ],

  "pt-BR": [
    {
      icon: CheckSquare,
      title: "Tarefas",
      items: [
        { icon: Plus,          title: "Criar tarefas",        desc: "Clique em + Tarefa na barra de ferramentas ou em Adicionar tarefa no final de qualquer quadro." },
        { icon: Edit3,         title: "Editar tarefas",       desc: "Clique no título do cartão para abrir o editor, ou use o menu ⋯ → Editar." },
        { icon: Flag,          title: "Prioridade",           desc: "Defina prioridade Baixa, Média, Alta ou Crítica — identificadas por cor no cartão (verde → vermelho)." },
        { icon: ListChecks,    title: "Checklists",           desc: "Adicione subtarefas dentro de qualquer tarefa. O progresso aparece como um contador (ex.: 2/5) no cartão." },
        { icon: CalendarRange, title: "Planejamento",         desc: "Defina tempo estimado (ex.: 1h30m), datas de início e fim, e horários específicos." },
        { icon: RefreshCcw,    title: "Recorrência",          desc: "Crie cópias automáticas ao mover para o último quadro. Suporta diário, semanal, mensal ou a cada N dias." },
        { icon: CheckCircle2,  title: "Marcar como feito",    desc: "Configure um quadro de Concluídas nas Configurações → um botão circular aparece em cada cartão para movê-lo lá." },
        { icon: Trash2,        title: "Excluir com desfazer", desc: "Exclua uma tarefa e use o toast de Desfazer para recuperá-la em poucos segundos." },
        { icon: Archive,       title: "Arquivar tarefas",     desc: "Archive tarefas para ocultá-las sem excluir. Restaure pelo botão Arquivo no cabeçalho." },
        { icon: EyeOff,        title: "Ocultar tarefas",      desc: "Oculta temporariamente uma tarefa do quadro — ela fica no arquivo e pode ser restaurada a qualquer momento." },
        { icon: GripVertical,  title: "Arrastar e soltar",    desc: "Arraste cartões entre quadros ou reordene-os dentro do mesmo quadro." },
      ],
    },
    {
      icon: LayoutGrid,
      title: "Quadros",
      items: [
        { icon: Plus,       title: "Criar quadros",    desc: "Clique em + Quadro na barra para adicionar uma nova coluna. Nomes têm limite de 20 caracteres." },
        { icon: Edit3,      title: "Renomear quadros", desc: "Clique duas vezes no título (ou ⋯ → Renomear) para editar inline. Pressione Enter para confirmar." },
        { icon: Palette,    title: "Cores dos quadros",desc: "Escolha uma das 8 cores de destaque para distinguir visualmente seus quadros." },
        { icon: ArrowUpDown,title: "Ordenar tarefas",  desc: "Use o botão de ordenar para reorganizar os cartões por prioridade ou por data de início." },
        { icon: Archive,    title: "Arquivar quadros", desc: "Archive um quadro inteiro — as tarefas ficam dentro. Restaure pelo diálogo de Arquivo." },
        { icon: EyeOff,     title: "Ocultar quadros",  desc: "Oculte um quadro sem arquivá-lo. Alterne a visibilidade pelo menu do quadro." },
        { icon: Columns,    title: "Recolher/Expandir",desc: "Recolha quadros para economizar espaço — use os botões da barra para recolher/expandir todos de uma vez." },
        { icon: Trash,      title: "Excluir quadros",  desc: "Ao excluir um quadro, suas tarefas são movidas para o primeiro quadro disponível (não excluídas)." },
      ],
    },
    {
      icon: Layers,
      title: "Espaços de trabalho",
      items: [
        { icon: FolderOpen,   title: "Múltiplos espaços",    desc: "Crie espaços separados para projetos diferentes. Cada um tem seus próprios quadros e tarefas." },
        { icon: SwitchCamera, title: "Trocar espaço",        desc: "Clique no nome do espaço no cabeçalho para abrir o seletor e alternar entre espaços." },
        { icon: Edit3,        title: "Renomear e excluir",   desc: "Renomeie ou exclua um espaço pelo dropdown do seletor de espaços." },
        { icon: Target,       title: "Indicador de progresso",desc: "Se um quadro de Concluídas estiver configurado, o seletor mostra a proporção concluído/total." },
        { icon: Lock,         title: "Modo privado",         desc: "Clique no ícone de olho no cabeçalho para desfocar nomes e títulos — útil ao compartilhar a tela." },
      ],
    },
    {
      icon: Search,
      title: "Busca e Filtros",
      items: [
        { icon: Search,     title: "Busca",             desc: "Digite na barra de busca para encontrar tarefas pelo título em todos os quadros em tempo real." },
        { icon: Filter,     title: "Filtrar por...",    desc: "Abra Filtros para restringir tarefas por prioridade, quadro, data de início ou data de entrega." },
        { icon: Flag,       title: "Filtro de prioridade",desc: "Selecione um ou mais níveis de prioridade — apenas os cartões correspondentes são exibidos." },
        { icon: LayoutGrid, title: "Filtro de quadro",  desc: "Selecione quadros específicos para focar — oculta tarefas dos outros quadros." },
        { icon: ArrowUpDown,title: "Ordenar por quadro",desc: "Ordene tarefas dentro de um quadro por prioridade (Crítica → Baixa) ou por data de início." },
      ],
    },
    {
      icon: Settings,
      title: "Configurações",
      items: [
        { icon: Sparkles,     title: "Animações",            desc: "Ative/desative estrelas, cometas e efeitos de nave. Desative para melhor desempenho ou no modo claro." },
        { icon: Monitor,      title: "Layout do quadro",     desc: "Alterne entre Colunas verticais e Swimlane horizontal (apenas em desktop)." },
        { icon: ListChecks,   title: "Expandir checklists",  desc: "Mostra itens do checklist expandidos por padrão em todos os cartões." },
        { icon: Monitor,      title: "Modo claro",           desc: "Alterne entre o tema escuro galáxia e o tema claro." },
        { icon: Languages,    title: "Idioma",               desc: "Mude a interface entre Português (Brasil) e Inglês." },
        { icon: CheckCircle2, title: "Quadro de concluídas", desc: "Escolha um quadro para tarefas concluídas — elas são movidas lá ao clicar no círculo do cartão." },
      ],
    },
    {
      icon: Cloud,
      title: "Sincronização e Conta",
      items: [
        { icon: LogIn,      title: "Entrar com Google",  desc: "Faça login para sincronizar tarefas e quadros entre dispositivos automaticamente." },
        { icon: RefreshCw,  title: "Status de sync",     desc: "O ícone de nuvem no cabeçalho mostra o estado — clique para forçar uma sincronização imediata." },
        { icon: AlertCircle,title: "Modo offline",       desc: "Todas as alterações são salvas localmente primeiro e sincronizadas ao reconectar." },
        { icon: Lock,       title: "Lista de acesso",    desc: "O app usa uma lista de permissão — o login é restrito a e-mails aprovados. Solicite acesso pelo diálogo." },
      ],
    },
  ],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HelpDialog({ open, onOpenChange }: Props) {
  const { t, language } = useTranslation();
  const sections = content[language] ?? content.en;
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({ 0: true });

  const toggle = (i: number) =>
    setOpenSections((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] max-w-[95vw] sm:max-w-xl md:max-w-2xl rounded-lg flex flex-col"
        style={{ maxHeight: "min(90dvh, 680px)" }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary shrink-0" />
            {t("help")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("helpTooltip")}
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-galaxy flex flex-col gap-2 overflow-y-auto p-[5px] flex-1 min-h-0 overscroll-contain touch-pan-y scroll-smooth">
          {sections.map((section, i) => {
            const SectionIcon = section.icon;
            const isOpen = !!openSections[i];
            return (
              <div key={i} className="rounded-md border border-border/40 bg-muted/20">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="flex w-full items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SectionIcon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                  <span className="font-semibold text-foreground">{section.title}</span>
                  <span className="ml-1 text-[10px] text-muted-foreground/60">
                    {section.items.length} {language === "pt-BR" ? "funcionalidades" : "features"}
                  </span>
                  <ChevronDown
                    className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-border/30 px-2.5 pb-2.5 pt-2 space-y-1">
                    {section.items.map((item, j) => {
                      const ItemIcon = item.icon;
                      return (
                        <div key={j} className="flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/30 transition-colors">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10">
                            <ItemIcon className="h-3 w-3 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground leading-tight">{item.title}</p>
                            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

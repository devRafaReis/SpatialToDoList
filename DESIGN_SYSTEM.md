# Design System — Spatial ToDoList

Referência canônica de estilo. Sempre que uma feature nova for implementada, seguir estas regras antes de qualquer outra decisão visual.

---

## 1. Tema

O projeto possui **dois temas** controlados pela classe `.light` no `<html>`:

| | Dark (default) | Light ("Boring ToDoList") |
|---|---|---|
| Fundo | `bg-background` — azul-escuro profundo | `bg-background` — quase branco |
| Cards | `.glass` — glassmorphism escuro | `.glass` — glassmorphism claro |
| Primária | Roxo `hsl(260, 50%, 60%)` | Roxo `hsl(260, 50%, 50%)` |
| Texto principal | `text-foreground` | `text-foreground` |
| Texto secundário | `text-muted-foreground` | `text-muted-foreground` |

> **Regra:** nunca hardcode cores como `#abc` ou `rgb(...)`. Usar sempre tokens CSS via Tailwind (`text-primary`, `bg-card`, etc).

---

## 2. Tokens de Cor

### Tokens semânticos (usar sempre estes)

```
bg-background          Fundo da página
bg-card                Fundo de cards/superfícies
bg-muted               Fundo de seções internas mais escuras
bg-accent              Hover/foco sutil
bg-popover             Fundo de popovers e dropdowns

text-foreground        Texto principal
text-muted-foreground  Texto secundário / labels / placeholders
text-primary           Roxo de destaque (links, valores ativos)
text-accent-foreground Texto sobre accent

border-border          Borda padrão
border-input           Borda de inputs
ring                   Anel de foco
```

### Opacidades de borda (padrão do projeto)
```
border-border/20   →  borda muito sutil (separadores)
border-border/40   →  borda visível (seções, cards secundários)
border-border/60   →  borda padrão em inputs inline
border-primary/60  →  borda ativa em rename/edit inline
```

### Cores funcionais (não mudar)
```
Prioridade Low:      bg-emerald-500/15  text-emerald-400  border-emerald-500/30
Prioridade Medium:   bg-amber-500/15    text-amber-400    border-amber-500/30
Prioridade High:     bg-orange-500/15   text-orange-400   border-orange-500/30
Prioridade Critical: bg-red-500/15      text-red-400      border-red-500/30

Recorrência ativa:   bg-sky-500/15      text-sky-400      border-sky-500/30
Recorrência inativa: bg-muted/30  text-muted-foreground  border-border/30  opacity-60

Ações destrutivas:   text-red-400  hover:text-red-400  hover:bg-red-400/10
Ações de reset:      text-amber-400  hover:text-amber-400  hover:bg-amber-400/10
```

---

## 3. Glassmorphism

Cards e superfícies principais usam efeito glass definido em `src/index.css`.

```css
.glass         /* Card padrão — frosted glass com border e inset highlight */
.glass-column  /* Board/coluna — opacity mais baixa */
.glass-drag    /* Estado de drag — opacity mais alta */
```

**Usar `.glass` em:** novos cards, painéis, containers flutuantes.  
**Nunca usar:** `bg-white`, `bg-gray-*`, `bg-zinc-*` ou qualquer cor sólida hardcoded em superfícies.

---

## 4. Tipografia

| Uso | Classes |
|---|---|
| Título de seção | `text-sm font-semibold text-foreground` |
| Label / subtítulo | `text-xs font-medium text-muted-foreground` |
| Label minor | `text-[11px] text-muted-foreground` |
| Meta / badge | `text-[10px] font-medium leading-none` |
| Corpo / descrição | `text-sm text-foreground` |
| Placeholder | `text-muted-foreground` (via prop, não classe direta) |

**Font especial:** `.font-starwars` — apenas para branding/easter eggs. Nunca usar em UI funcional.

---

## 5. Espaçamento

O projeto segue Tailwind padrão com a seguinte escala preferida:

```
gap-1    4px   ícone + texto minúsculos
gap-1.5  6px   ícone + texto padrão
gap-2    8px   elementos inline
gap-3    12px  grupos de controles
gap-4    16px  seções

px-2 / py-1      compacto (badges, menus)
px-3 / py-2      padrão (cards internos, botões)
px-2.5 / py-2    seções do dialog
p-3              padding uniforme em blocos
```

---

## 6. Border Radius

| Classe | Valor | Uso |
|---|---|---|
| `rounded-sm` | 8px | Badges, tags pequenas |
| `rounded-md` | 10px | Inputs, botões |
| `rounded-lg` | 12px | Cards, panels |
| `rounded-full` | 50% | Dots, avatares, pills |

> `--radius: 0.75rem` é a base. Não usar `rounded-xl`, `rounded-2xl` — foge do padrão.

---

## 7. Componentes Padrão

### Card / Superfície
```tsx
<div className="glass rounded-lg overflow-hidden">
  {/* conteúdo */}
</div>
```

### Seção colapsável dentro de Dialog
```tsx
<div className="rounded-md border border-border/40 bg-muted/20">
  <button className="flex w-full items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
    <IconName className="h-3.5 w-3.5 shrink-0" />
    Título da seção
    <ChevronDown className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
  </button>
  {open && (
    <div className="space-y-2 border-t border-border/30 px-2.5 pb-2.5 pt-2">
      {/* conteúdo */}
    </div>
  )}
</div>
```

### Badge
```tsx
<span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none {colorClasses}">
  <Dot className="h-1.5 w-1.5 rounded-full" />
  Label
</span>
```

### Botão primário (ação principal do dialog)
```tsx
<Button onClick={handleSave} disabled={!title.trim()}>Salvar</Button>
```

### Botão ghost (ações secundárias, header)
```tsx
<Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground">
  <Icon className="h-3.5 w-3.5" />
  <span className="hidden sm:inline">Texto</span>
</Button>
```

### Botão destrutivo (hover apenas)
```tsx
<Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground/60 hover:text-red-400 hover:bg-red-400/10">
  <Trash2 className="h-3.5 w-3.5" />
  <span className="hidden sm:inline">Deletar</span>
</Button>
```

### Input inline (rename)
```tsx
<input
  className="flex-1 min-w-0 bg-transparent border-b border-primary/60 text-sm font-semibold text-foreground outline-none py-0.5"
  maxLength={20}
/>
```

### Popover Picker (data, hora, etc.)
```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-full justify-start gap-2 px-3 font-normal text-left">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {value ? <span>{value}</span> : <span className="text-muted-foreground">Pick …</span>}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">
    {/* conteúdo do picker */}
  </PopoverContent>
</Popover>
```

### Label de meta-informação no card (footer)
```tsx
<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
  <Icon className="h-2.5 w-2.5 shrink-0" />
  texto
</span>
```

---

## 8. Animações

### Classes de animação customizadas (CSS)

| Classe | Duração | Quando usar |
|---|---|---|
| `card-big-bang-in` | 850ms | Nova tarefa criada |
| `card-suck-in` | 680ms | Tarefa deletada |
| `card-portal-out` | 600ms | Tarefa saindo do board |
| `card-portal-in` | 600ms | Tarefa chegando no board |
| `board-suck-in` | 1800ms | Delete all tasks |

### Transições padrão
```
transition-colors          mudanças de cor (hover, focus)
transition-all duration-200  mudanças estruturais simples
duration-200               padrão para a maioria das transições
```

### Condicionais de animação
Sempre verificar `animationsEnabled` do `useSettings()` antes de aplicar animações pesadas:
```tsx
const { animationsEnabled } = useSettings();
className={animationsEnabled ? "card-big-bang-in" : ""}
```

---

## 9. Ícones

Usar exclusivamente **Lucide React**. Tamanhos padrão:

```
h-3 w-3      ícone micro (labels, badges)
h-3.5 w-3.5  ícone pequeno (botões ghost, headers de seção)
h-4 w-4      ícone padrão (botões, cards)
h-5 w-5      ícone médio (destaque)
```

Sempre incluir `shrink-0` em ícones ao lado de texto que pode transbordar.

---

## 10. Scrollbar

Em containers scrolláveis com tema dark:
```tsx
className="overflow-y-auto scrollbar-galaxy"
```

---

## 11. Responsividade

Padrão do projeto: **mobile-first com breakpoint `sm`**.

```
sm:inline / sm:flex   mostrar em desktop, ocultar em mobile
hidden sm:inline      rótulos de botão (ícone sempre visível)
w-36 sm:w-48          inputs responsivos
```

Layout do board: `vertical` em mobile (forçado pelo `useIsMobile()`), `horizontal` ou `vertical` em desktop conforme setting.

---

## 12. Dialog / Modal

```tsx
<DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl md:max-w-2xl rounded-lg flex flex-col" style={{ maxHeight: "min(90dvh, 580px)" }}>
```

Internamente usar `overflow-y-auto scrollbar-galaxy` no corpo para scroll interno.

---

## 13. Regras de implementação

1. **Sem cores hardcoded** — sempre tokens (`text-primary`, `bg-muted`, etc.)
2. **Sem borders sólidas visíveis em cards** — usar `.glass` + `border-border/20` ou `border-border/40`
3. **Animações condicionais** — verificar `animationsEnabled` antes de aplicar
4. **shadcn/ui para inputs, selects, switches, checkboxes** — não reinventar
5. **Picker customizado com Popover** — nunca `<input type="date">` ou `<input type="time">` nativos
6. **maxLength={20}** em títulos de board
7. **Ícones Lucide** — nunca outros icon sets
8. **`shrink-0` em ícones** ao lado de texto truncável
9. **`hidden sm:inline`** em labels de botão no header
10. **Seções colapsáveis** no TaskDialog seguem o padrão `rounded-md border border-border/40 bg-muted/20`

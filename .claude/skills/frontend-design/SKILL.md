---
name: frontend-design
description: Design system rules for Spatial ToDoList — tokens, glassmorphism, animations, components. Use when implementing UI changes, new components, or reviewing visual patterns.
---

# Frontend Design — Spatial ToDoList

Read `DESIGN_SYSTEM.md` for full reference. Key rules enforced here:

## Tokens de Cor (NUNCA hardcode)

```
bg-background / bg-card / bg-muted / bg-accent / bg-popover
text-foreground / text-muted-foreground / text-primary
border-border / border-input
```

Opacidades de borda padrão: `border-border/20` (sutil), `border-border/40` (visível), `border-border/60` (input inline), `border-primary/60` (rename ativo).

Cores funcionais — não alterar:
- Low: `bg-emerald-500/15 text-emerald-400 border-emerald-500/30`
- Medium: `bg-amber-500/15 text-amber-400 border-amber-500/30`
- High: `bg-orange-500/15 text-orange-400 border-orange-500/30`
- Critical: `bg-red-500/15 text-red-400 border-red-500/30`
- Recorrência ativa: `bg-sky-500/15 text-sky-400 border-sky-500/30`
- Destrutivo: `text-red-400 hover:text-red-400 hover:bg-red-400/10`

## Glassmorphism

Cards e superfícies: classe `.glass` (definida em `src/index.css`). Variantes: `.glass-column` (board), `.glass-drag` (drag). **Nunca** `bg-white`, `bg-gray-*`, `bg-zinc-*` em superfícies.

## Componentes Padrão

**Card:**
```tsx
<div className="glass rounded-lg overflow-hidden">
```

**Seção colapsável (TaskDialog):**
```tsx
<div className="rounded-md border border-border/40 bg-muted/20">
  <button className="flex w-full items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
    <Icon className="h-3.5 w-3.5 shrink-0" />
    Título
    <ChevronDown className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
  </button>
  {open && <div className="space-y-2 border-t border-border/30 px-2.5 pb-2.5 pt-2">{/* conteúdo */}</div>}
</div>
```

**Botão ghost (header):**
```tsx
<Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground">
  <Icon className="h-3.5 w-3.5" />
  <span className="hidden sm:inline">Texto</span>
</Button>
```

**Botão destrutivo:**
```tsx
<Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground/60 hover:text-red-400 hover:bg-red-400/10">
```

**Input inline (rename):**
```tsx
<input className="flex-1 min-w-0 bg-transparent border-b border-primary/60 text-sm font-semibold text-foreground outline-none py-0.5" maxLength={20} />
```

**Popover picker (data/hora — nunca `<input type="date/time">`):**
```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-full justify-start gap-2 px-3 font-normal text-left">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {value ?? <span className="text-muted-foreground">Pick…</span>}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">{/* picker */}</PopoverContent>
</Popover>
```

**Dialog:**
```tsx
<DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl md:max-w-2xl rounded-lg flex flex-col" style={{ maxHeight: "min(90dvh, 580px)" }}>
```

## Tipografia

| Uso | Classes |
|---|---|
| Título de seção | `text-sm font-semibold text-foreground` |
| Label / subtítulo | `text-xs font-medium text-muted-foreground` |
| Badge / meta | `text-[10px] font-medium leading-none` |

## Ícones

Lucide React exclusivamente. Tamanhos: `h-3 w-3` (micro), `h-3.5 w-3.5` (pequeno), `h-4 w-4` (padrão), `h-5 w-5` (médio). Sempre `shrink-0` ao lado de texto truncável.

## Animações

Sempre condicional:
```tsx
const { animationsEnabled } = useSettings();
className={animationsEnabled ? "card-big-bang-in" : ""}
```

Classes: `card-big-bang-in` (nova task), `card-suck-in` (delete), `card-portal-out/in` (move entre boards).

## Scrollbar

```tsx
className="overflow-y-auto scrollbar-galaxy"
```

## Responsividade

Mobile-first com breakpoint `sm`. Botões do header: `hidden sm:inline` no label. Visibilidade em hover: `sm:opacity-0 group-hover:opacity-100` (nunca `opacity-0 group-hover:opacity-100`).

## Regras Absolutas

1. Sem cores hardcoded — sempre tokens
2. Sem `bg-white/gray/zinc` em superfícies — usar `.glass`
3. Animações condicionais — verificar `animationsEnabled`
4. shadcn/ui para inputs, selects, switches — não reinventar
5. Picker com Popover — nunca `<input type="date/time">`
6. `maxLength={20}` em títulos de board
7. Lucide React — nunca outros icon sets
8. `shrink-0` em ícones ao lado de texto truncável
9. `hidden sm:inline` em labels de botão no header
10. Board title maxLength={20} everywhere

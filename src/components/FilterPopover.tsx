import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TaskFilter, TaskPriority, PRIORITIES, Column, EMPTY_FILTER } from "@/types/task";
import { useSettings } from "@/store/settingsStore";

interface FilterPopoverProps {
  filter: TaskFilter;
  onChange: (f: TaskFilter) => void;
  boards: Column[];
}

const activeCount = (f: TaskFilter) =>
  (f.priorities.length > 0 ? 1 : 0) +
  (f.boards.length > 0 ? 1 : 0) +
  (f.startDateFrom || f.startDateTo ? 1 : 0) +
  (f.endDateFrom || f.endDateTo ? 1 : 0);

const FilterPopover = ({ filter, onChange, boards }: FilterPopoverProps) => {
  const { lightMode } = useSettings();
  const count = activeCount(filter);

  const togglePriority = (p: TaskPriority) => {
    const has = filter.priorities.includes(p);
    onChange({
      ...filter,
      priorities: has ? filter.priorities.filter((x) => x !== p) : [...filter.priorities, p],
    });
  };

  const toggleBoard = (id: string) => {
    const has = filter.boards.includes(id);
    onChange({
      ...filter,
      boards: has ? filter.boards.filter((x) => x !== id) : [...filter.boards, id],
    });
  };

  const dateInputClass = `flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/50 ${
    lightMode ? "[color-scheme:light]" : "[color-scheme:dark]"
  }`;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Filter tasks"
              className={`relative ${count > 0 ? "text-primary" : ""}`}
            >
              <Filter className="h-4 w-4" />
              {count > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 text-[9px] flex items-center justify-center rounded-full bg-primary text-primary-foreground pointer-events-none">
                  {count}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Filter tasks</TooltipContent>
      </Tooltip>

      <PopoverContent className="w-80" align="end" sideOffset={8}>
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Filters</span>
            {count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(EMPTY_FILTER)}
                className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-2">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Priority
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => {
                const active = filter.priorities.includes(p.id);
                const dimmed = filter.priorities.length > 0 && !active;
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePriority(p.id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${p.badgeClass} ${
                      dimmed ? "opacity-30" : ""
                    } ${active ? "ring-1 ring-current ring-offset-1 ring-offset-background" : ""}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${p.dotClass}`} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Board */}
          <div className="flex flex-col gap-2">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Board
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {boards.map((b) => {
                const active = filter.boards.includes(b.id);
                const dimmed = filter.boards.length > 0 && !active;
                return (
                  <button
                    key={b.id}
                    onClick={() => toggleBoard(b.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                      active
                        ? "bg-primary/20 border-primary/50 text-primary ring-1 ring-primary/40 ring-offset-1 ring-offset-background"
                        : dimmed
                        ? "border-border/30 text-muted-foreground opacity-30"
                        : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {b.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Start Date
              </Label>
              {(filter.startDateFrom || filter.startDateTo) && (
                <button
                  onClick={() => onChange({ ...filter, startDateFrom: "", startDateTo: "" })}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filter.startDateFrom}
                onChange={(e) => onChange({ ...filter, startDateFrom: e.target.value })}
                className={dateInputClass}
                placeholder="From"
              />
              <span className="text-xs text-muted-foreground shrink-0">→</span>
              <input
                type="date"
                value={filter.startDateTo}
                onChange={(e) => onChange({ ...filter, startDateTo: e.target.value })}
                className={dateInputClass}
                placeholder="To"
              />
            </div>
          </div>

          {/* Due Date */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Due Date
              </Label>
              {(filter.endDateFrom || filter.endDateTo) && (
                <button
                  onClick={() => onChange({ ...filter, endDateFrom: "", endDateTo: "" })}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filter.endDateFrom}
                onChange={(e) => onChange({ ...filter, endDateFrom: e.target.value })}
                className={dateInputClass}
                placeholder="From"
              />
              <span className="text-xs text-muted-foreground shrink-0">→</span>
              <input
                type="date"
                value={filter.endDateTo}
                onChange={(e) => onChange({ ...filter, endDateTo: e.target.value })}
                className={dateInputClass}
                placeholder="To"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FilterPopover;

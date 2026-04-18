import { useEffect, useState, useRef } from "react";
import { Clock, CalendarRange, CalendarIcon, Plus, Trash2, ListChecks, ChevronDown, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Task, TaskStatus, TaskPriority, ChecklistItem, PRIORITIES, Recurrence, RecurrenceType } from "@/types/task";
import { useTaskContext } from "@/store/taskStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

const TimePickerPopover = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const h = value ? value.split(":")[0] : "";
  const m = value ? value.split(":")[1] : "";
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      hourRef.current?.querySelector<HTMLElement>('[data-sel="true"]')?.scrollIntoView({ block: "center" });
      minRef.current?.querySelector<HTMLElement>('[data-sel="true"]')?.scrollIntoView({ block: "center" });
    }, 50);
  }, [open]);

  const pick = (newH: string, newM: string) => onChange(`${newH}:${newM}`);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 px-3 font-normal text-left">
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {value ? <span>{value}</span> : <span className="text-muted-foreground">Pick time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-0">
          <div ref={hourRef} className="h-44 w-12 overflow-y-auto space-y-0.5 pr-1">
            {HOURS.map((hh) => (
              <button key={hh} type="button" data-sel={hh === h ? "true" : undefined}
                onClick={() => pick(hh, m || "00")}
                className={`w-full rounded px-1.5 py-1 text-sm text-center transition-colors ${hh === h ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
              >{hh}</button>
            ))}
          </div>
          <div className="w-px bg-border/40 mx-1" />
          <div ref={minRef} className="h-44 w-12 overflow-y-auto space-y-0.5 pl-1">
            {MINUTES.map((mm) => (
              <button key={mm} type="button" data-sel={mm === m ? "true" : undefined}
                onClick={() => pick(h || "00", mm)}
                className={`w-full rounded px-1.5 py-1 text-sm text-center transition-colors ${mm === m ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
              >{mm}</button>
            ))}
          </div>
        </div>
        {value && (
          <button type="button" onClick={() => { onChange(""); setOpen(false); }}
            className="mt-2 w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >Clear</button>
        )}
      </PopoverContent>
    </Popover>
  );
};

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultStatus?: string;
  onSave: (
    title: string,
    description: string,
    status?: TaskStatus,
    priority?: TaskPriority,
    estimatedHours?: number,
    estimatedMinutes?: number,
    startDate?: string,
    startTime?: string,
    endDate?: string,
    checklist?: ChecklistItem[],
    recurrence?: Recurrence,
  ) => void;
}

const TaskDialog = ({ open, onOpenChange, task, defaultStatus, onSave }: TaskDialogProps) => {
  const { boards } = useTaskContext();
  const [title, setTitle]                       = useState("");
  const [description, setDescription]           = useState("");
  const [status, setStatus]                     = useState<TaskStatus>("");
  const [priority, setPriority]                 = useState<TaskPriority | undefined>(undefined);
  const [estimatedHours, setEstimatedHours]     = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [startDate, setStartDate]               = useState("");
  const [startTime, setStartTime]               = useState("");
  const [endDate, setEndDate]                   = useState("");
  const [checklist, setChecklist]               = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText]           = useState("");
  const [recurrenceEnabled, setRecurrenceEnabled]     = useState(false);
  const [recurrenceType, setRecurrenceType]           = useState<RecurrenceType>("weekly");
  const [recurrenceLimitType, setRecurrenceLimitType] = useState<"forever" | "count">("forever");
  const [recurrenceLimitCount, setRecurrenceLimitCount] = useState("3");
  const [recurrenceOpen, setRecurrenceOpen]           = useState(false);
  const newItemInputRef                         = useRef<HTMLInputElement>(null);
  const planningRef                             = useRef<HTMLDivElement>(null);
  const checklistRef                            = useRef<HTMLDivElement>(null);
  const recurrenceRef                           = useRef<HTMLDivElement>(null);
  const [planningOpen, setPlanningOpen]         = useState(false);
  const [checklistOpen, setChecklistOpen]       = useState(false);

  const togglePlanning = () => {
    const next = !planningOpen;
    setPlanningOpen(next);
    if (next) setTimeout(() => planningRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  const toggleChecklist = () => {
    const next = !checklistOpen;
    setChecklistOpen(next);
    if (next) setTimeout(() => checklistRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  const toggleRecurrence = () => {
    const next = !recurrenceOpen;
    setRecurrenceOpen(next);
    if (next) setTimeout(() => recurrenceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  const isEditing = !!task;

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setStatus(task?.status ?? defaultStatus ?? boards[0]?.id ?? "");
    setPriority(task?.priority ?? undefined);
    setEstimatedHours(task?.estimatedHours?.toString() ?? "");
    setEstimatedMinutes(task?.estimatedMinutes?.toString() ?? "");
    setStartDate(task?.startDate ?? "");
    setStartTime(task?.startTime ?? "");
    setEndDate(task?.endDate ?? "");
    setChecklist(task?.checklist ? task.checklist.map((i) => ({ ...i })) : []);
    setNewItemText("");
    setRecurrenceEnabled(task?.recurrence?.enabled ?? false);
    setRecurrenceType(task?.recurrence?.type ?? "weekly");
    setRecurrenceLimitType(task?.recurrence?.limit !== undefined ? "count" : "forever");
    setRecurrenceLimitCount(task?.recurrence?.limit?.toString() ?? "3");
    setPlanningOpen(!!(task?.estimatedHours || task?.estimatedMinutes || task?.startDate || task?.startTime || task?.endDate));
    setChecklistOpen(!!(task?.checklist && task.checklist.length > 0));
    setRecurrenceOpen(!!task?.recurrence);
  }, [open, task]);

  const addChecklistItem = () => {
    const text = newItemText.trim();
    if (!text) return;
    setChecklist((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }]);
    setNewItemText("");
    newItemInputRef.current?.focus();
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) => prev.map((i) => i.id === id ? { ...i, done: !i.done } : i));
  };

  const deleteChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const hrs = estimatedHours !== "" ? parseInt(estimatedHours, 10) : undefined;
    const min = estimatedMinutes !== "" ? parseInt(estimatedMinutes, 10) : undefined;
    const limitVal = recurrenceLimitType === "count" && recurrenceLimitCount !== ""
      ? Math.max(1, parseInt(recurrenceLimitCount, 10))
      : undefined;
    const recurrence: Recurrence | undefined = recurrenceOpen
      ? { type: recurrenceType, enabled: recurrenceEnabled, limit: limitVal }
      : undefined;
    onSave(
      title.trim(),
      description.trim(),
      isEditing ? undefined : status,
      priority,
      hrs,
      min,
      startDate || undefined,
      startTime || undefined,
      endDate || undefined,
      checklist.length > 0 ? checklist : undefined,
      recurrence,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl md:max-w-2xl rounded-lg flex flex-col" style={{ maxHeight: "min(90dvh, 580px)" }}>
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the task details." : "Fill in the details to create a new task."}
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-galaxy flex flex-col gap-3 overflow-y-auto p-[5px] flex-1 min-h-0 overscroll-contain touch-pan-y scroll-smooth" style={{ scrollPaddingBottom: "12px", WebkitOverflowScrolling: "touch" }}>
          {/* Title */}
          <div className="space-y-1 scroll-mt-2">
            <Input
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              maxLength={200}
              autoFocus
            />
            <p className="text-right text-[10px] text-muted-foreground">{title.length}/200</p>
          </div>

          {/* Description */}
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            className="resize-none min-h-[80px] sm:min-h-[160px] scroll-mt-2"
          />

          {/* Column (create only) */}
          {!isEditing && (
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {boards.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Priority */}
          <Select
            value={priority ?? ""}
            onValueChange={(v) => setPriority(v === "" ? undefined : v as TaskPriority)}
          >
            <SelectTrigger>
              {/* Custom trigger display — avoids SelectValue re-rendering SelectItem children */}
              {(() => {
                const sel = priority ? PRIORITIES.find((p) => p.id === priority) : null;
                return sel ? (
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${sel.dotClass}`} />
                    <span>{sel.label}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Priority (optional)</span>
                );
              })()}
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${p.dotClass}`} />
                    {p.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Planning */}
          <div ref={planningRef} className="rounded-md border border-border/40 bg-muted/20">
            <button
              type="button"
              onClick={togglePlanning}
              className="flex w-full items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <CalendarRange className="h-3.5 w-3.5 shrink-0" />
              Planning (optional)
              {!planningOpen && (estimatedHours || estimatedMinutes || startDate || startTime || endDate) && (
                <span className="ml-1 text-[10px] text-primary/70">
                  {[estimatedHours && `${estimatedHours}h`, estimatedMinutes && `${estimatedMinutes}m`].filter(Boolean).join(" ")}
                  {(startDate || endDate) && (estimatedHours || estimatedMinutes) ? " · " : ""}
                  {startDate && format(parseISO(startDate), "MMM d")}
                  {startDate && startTime ? ` ${startTime}` : ""}
                  {startDate && endDate ? " → " : ""}
                  {endDate && format(parseISO(endDate), "MMM d")}
                </span>
              )}
              <ChevronDown className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${planningOpen ? "rotate-180" : ""}`} />
            </button>

            {planningOpen && (
              <div className="space-y-2 border-t border-border/30 px-2.5 pb-2.5 pt-2">
                {/* Estimated time */}
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" /> Estimated time
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        placeholder="0"
                        min={0}
                        max={999}
                        value={estimatedHours}
                        onChange={(e) => setEstimatedHours(e.target.value)}
                        className="pr-10"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
                    </div>
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        placeholder="0"
                        min={0}
                        max={59}
                        value={estimatedMinutes}
                        onChange={(e) => setEstimatedMinutes(e.target.value)}
                        className="pr-10"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">m</span>
                    </div>
                  </div>
                </div>

                {/* Date range */}
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Date range</p>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-0.5">
                      <p className="text-[10px] text-muted-foreground/60">Start</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start gap-2 px-3 font-normal text-left">
                            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {startDate ? <span>{format(parseISO(startDate), "MMM d, yyyy")}</span> : <span className="text-muted-foreground">Pick date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate ? parseISO(startDate) : undefined}
                            onSelect={(date) => {
                              const val = date ? format(date, "yyyy-MM-dd") : "";
                              setStartDate(val);
                              if (val && endDate && endDate < val) setEndDate("");
                            }}
                            disabled={(date) => endDate ? date > parseISO(endDate) : false}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="mt-1">
                        <TimePickerPopover value={startTime} onChange={setStartTime} />
                      </div>
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-[10px] text-muted-foreground/60">End</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start gap-2 px-3 font-normal text-left">
                            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {endDate ? <span>{format(parseISO(endDate), "MMM d, yyyy")}</span> : <span className="text-muted-foreground">Pick date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate ? parseISO(endDate) : undefined}
                            onSelect={(date) => setEndDate(date ? format(date, "yyyy-MM-dd") : "")}
                            disabled={(date) => startDate ? date < parseISO(startDate) : false}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div ref={checklistRef} className="rounded-md border border-border/40 bg-muted/20">
            <button
              type="button"
              onClick={toggleChecklist}
              className="flex w-full items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ListChecks className="h-3.5 w-3.5 shrink-0" />
              Checklist
              {checklist.length > 0 && (
                <span className="ml-1 text-[10px] text-primary/70">
                  {checklist.filter((i) => i.done).length}/{checklist.length}
                </span>
              )}
              <ChevronDown className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${checklistOpen ? "rotate-180" : ""}`} />
            </button>

            {checklistOpen && (
              <div className="space-y-2 border-t border-border/30 px-2.5 pb-2.5 pt-2">
                {checklist.length > 0 && (
                  <ul className="space-y-1">
                    {checklist.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 group">
                        <Checkbox
                          id={`cl-${item.id}`}
                          checked={item.done}
                          onCheckedChange={() => toggleChecklistItem(item.id)}
                          className="shrink-0"
                        />
                        <label
                          htmlFor={`cl-${item.id}`}
                          className={`flex-1 min-w-0 cursor-pointer truncate text-sm ${item.done ? "line-through text-muted-foreground/50" : "text-foreground"}`}
                        >
                          {item.text}
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => deleteChecklistItem(item.id)}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <Input
                    ref={newItemInputRef}
                    placeholder="New item…"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }}
                    className="h-8 text-sm"
                    maxLength={200}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={addChecklistItem}
                    disabled={!newItemText.trim()}
                    aria-label="Add item"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          {/* Recurrence */}
          <div ref={recurrenceRef} className="rounded-md border border-border/40 bg-muted/20">
            <button
              type="button"
              onClick={toggleRecurrence}
              className="flex w-full items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5 shrink-0" />
              Recurrence
              {recurrenceOpen && (() => {
                const typeLabel: Record<string, string> = { daily: "daily", "daily-weekdays": "Mon–Fri", weekly: "weekly", monthly: "monthly" };
                const limitLabel = recurrenceLimitType === "count" && recurrenceLimitCount ? ` · ${recurrenceLimitCount}×` : recurrenceLimitType === "forever" ? " · ∞" : "";
                return (
                  <span className={`ml-1 text-[10px] ${recurrenceEnabled ? "text-primary/70" : "text-muted-foreground/50"}`}>
                    {recurrenceEnabled ? `${typeLabel[recurrenceType] ?? recurrenceType}${limitLabel}` : "disabled"}
                  </span>
                );
              })()}
              <ChevronDown className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${recurrenceOpen ? "rotate-180" : ""}`} />
            </button>

            {recurrenceOpen && (
              <div className="space-y-3 border-t border-border/30 px-2.5 pb-2.5 pt-2">
                {/* Enable toggle */}
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="recurrence-enabled" className="text-xs text-muted-foreground cursor-pointer">
                    {recurrenceEnabled ? "Enabled" : "Disabled"}
                  </Label>
                  <Switch
                    id="recurrence-enabled"
                    checked={recurrenceEnabled}
                    onCheckedChange={setRecurrenceEnabled}
                  />
                </div>

                {/* Frequency */}
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Frequency</p>
                  <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as RecurrenceType)} disabled={!recurrenceEnabled}>
                    <SelectTrigger className={recurrenceEnabled ? "" : "opacity-50"}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily (every day)</SelectItem>
                      <SelectItem value="daily-weekdays">Daily (Mon – Fri)</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Repetitions */}
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Repetitions</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!recurrenceEnabled}
                      onClick={() => setRecurrenceLimitType("forever")}
                      className={`flex-1 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        recurrenceLimitType === "forever"
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/40 text-muted-foreground hover:border-border"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Forever
                    </button>
                    <button
                      type="button"
                      disabled={!recurrenceEnabled}
                      onClick={() => setRecurrenceLimitType("count")}
                      className={`flex-1 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        recurrenceLimitType === "count"
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/40 text-muted-foreground hover:border-border"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Set limit
                    </button>
                  </div>
                  {recurrenceLimitType === "count" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        value={recurrenceLimitCount}
                        onChange={(e) => setRecurrenceLimitCount(e.target.value)}
                        className="h-8 text-sm"
                        disabled={!recurrenceEnabled}
                        placeholder="3"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">repetitions</span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground/60">
                  When moved to the last board, a new copy is created in the first board with the next date.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 flex flex-col gap-2 sm:flex-row sm:gap-2">
          <Button onClick={handleSave} disabled={!title.trim()}>
            {isEditing ? "Save" : "Create"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDialog;

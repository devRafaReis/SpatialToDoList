import { useEffect, useState, useRef } from "react";
import { Clock, CalendarRange, CalendarIcon, Plus, Trash2, ListChecks, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Task, TaskStatus, TaskPriority, ChecklistItem, COLUMNS, PRIORITIES } from "@/types/task";
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

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSave: (
    title: string,
    description: string,
    status?: TaskStatus,
    priority?: TaskPriority,
    estimatedHours?: number,
    estimatedMinutes?: number,
    startDate?: string,
    endDate?: string,
    checklist?: ChecklistItem[],
  ) => void;
}

const TaskDialog = ({ open, onOpenChange, task, onSave }: TaskDialogProps) => {
  const [title, setTitle]                       = useState("");
  const [description, setDescription]           = useState("");
  const [status, setStatus]                     = useState<TaskStatus>("todo");
  const [priority, setPriority]                 = useState<TaskPriority | undefined>(undefined);
  const [estimatedHours, setEstimatedHours]     = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [startDate, setStartDate]               = useState("");
  const [endDate, setEndDate]                   = useState("");
  const [checklist, setChecklist]               = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText]           = useState("");
  const newItemInputRef                         = useRef<HTMLInputElement>(null);
  const planningRef                             = useRef<HTMLDivElement>(null);
  const checklistRef                            = useRef<HTMLDivElement>(null);
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

  const isEditing = !!task;

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setStatus(task?.status ?? "todo");
    setPriority(task?.priority ?? undefined);
    setEstimatedHours(task?.estimatedHours?.toString() ?? "");
    setEstimatedMinutes(task?.estimatedMinutes?.toString() ?? "");
    setStartDate(task?.startDate ?? "");
    setEndDate(task?.endDate ?? "");
    setChecklist(task?.checklist ? task.checklist.map((i) => ({ ...i })) : []);
    setNewItemText("");
    setPlanningOpen(!!(task?.estimatedHours || task?.estimatedMinutes || task?.startDate || task?.endDate));
    setChecklistOpen(!!(task?.checklist && task.checklist.length > 0));
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
    onSave(
      title.trim(),
      description.trim(),
      isEditing ? undefined : status,
      priority,
      hrs,
      min,
      startDate || undefined,
      endDate || undefined,
      checklist.length > 0 ? checklist : undefined,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl md:max-w-2xl rounded-lg flex flex-col" style={{ height: "min(90dvh, 580px)" }}>
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the task details." : "Fill in the details to create a new task."}
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-galaxy flex flex-col gap-3 overflow-y-auto p-[5px] flex-1 min-h-0">
          {/* Title */}
          <div className="space-y-1">
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
            className="resize-none min-h-[160px]"
          />

          {/* Column (create only) */}
          {!isEditing && (
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMNS.map((col) => (
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
              {!planningOpen && (estimatedHours || estimatedMinutes || startDate || endDate) && (
                <span className="ml-1 text-[10px] text-primary/70">
                  {[estimatedHours && `${estimatedHours}h`, estimatedMinutes && `${estimatedMinutes}m`].filter(Boolean).join(" ")}
                  {(startDate || endDate) && (estimatedHours || estimatedMinutes) ? " · " : ""}
                  {startDate && format(parseISO(startDate), "MMM d")}
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
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {isEditing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDialog;

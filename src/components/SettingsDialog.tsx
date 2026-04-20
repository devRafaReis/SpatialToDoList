import { LayoutList, LayoutPanelTop, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/store/settingsContext";
import { useTaskContext } from "@/store/taskContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTranslation } from "@/i18n/translations";

const SettingsDialog = () => {
  const { animationsEnabled, lightMode, boardLayout, checklistExpandedByDefault, language, completedBoardId, setAnimationsEnabled, setLightMode, setBoardLayout, setChecklistExpandedByDefault, setLanguage, setCompletedBoardId } = useSettings();
  const { boards } = useTaskContext();
  const activeBoards = boards.filter((b) => !b.archived);
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("settings")}>
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("settings")}</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("settings")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5 py-2">
          <div className={`flex items-center justify-between gap-4 ${lightMode ? "opacity-40" : ""}`}>
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="animations-toggle" className="text-sm font-medium">
                {t("animations")}
              </Label>
              <span className="text-xs text-muted-foreground">
                {lightMode ? t("animationsNotAvailable") : t("animationsDesc")}
              </span>
            </div>
            <Switch
              id="animations-toggle"
              checked={animationsEnabled}
              onCheckedChange={setAnimationsEnabled}
              disabled={lightMode}
            />
          </div>

          <div className={`flex items-center justify-between gap-4 ${isMobile ? "opacity-40" : ""}`}>
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm font-medium">{t("boardLayout")}</Label>
              <span className="text-xs text-muted-foreground">
                {isMobile
                  ? t("boardLayoutNotMobile")
                  : boardLayout === "horizontal"
                  ? t("boardLayoutHorizontalDesc")
                  : t("boardLayoutVerticalDesc")}
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border/40 p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 transition-colors ${boardLayout === "vertical" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}`}
                    onClick={() => setBoardLayout("vertical")}
                    aria-label={t("verticalColumns")}
                    disabled={isMobile}
                  >
                    <LayoutList className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("verticalColumns")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 transition-colors ${boardLayout === "horizontal" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}`}
                    onClick={() => setBoardLayout("horizontal")}
                    aria-label={t("horizontalSwimlane")}
                    disabled={isMobile}
                  >
                    <LayoutPanelTop className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("horizontalSwimlane")}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="checklist-toggle" className="text-sm font-medium">
                {t("expandChecklists")}
              </Label>
              <span className="text-xs text-muted-foreground">
                {t("expandChecklistsDesc")}
              </span>
            </div>
            <Switch
              id="checklist-toggle"
              checked={checklistExpandedByDefault}
              onCheckedChange={setChecklistExpandedByDefault}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="light-mode-toggle" className="text-sm font-medium">
                {t("lightMode")}
              </Label>
              <span className="text-xs text-muted-foreground">
                {t("lightModeDesc")}
              </span>
            </div>
            <Switch
              id="light-mode-toggle"
              checked={lightMode}
              onCheckedChange={setLightMode}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm font-medium">{t("language")}</Label>
              <span className="text-xs text-muted-foreground">{t("languageDesc")}</span>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border/40 p-0.5">
              <button
                onClick={() => setLanguage("en")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  language === "en"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage("pt-BR")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  language === "pt-BR"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
              >
                PT
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5 min-w-0">
              <Label className="text-sm font-medium">{t("completedBoard")}</Label>
              <span className="text-xs text-muted-foreground">{t("completedBoardDesc")}</span>
            </div>
            <Select
              value={completedBoardId ?? "__none__"}
              onValueChange={(v) => setCompletedBoardId(v === "__none__" ? null : v)}
            >
              <SelectTrigger className="w-36 h-8 text-xs shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">{t("completedBoardNone")}</SelectItem>
                {activeBoards.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">{b.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;

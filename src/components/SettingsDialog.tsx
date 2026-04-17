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
import { useSettings } from "@/store/settingsStore";

const SettingsDialog = () => {
  const { animationsEnabled, lightMode, boardLayout, setAnimationsEnabled, setLightMode, setBoardLayout } = useSettings();

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5 py-2">
          <div className={`flex items-center justify-between gap-4 ${lightMode ? "opacity-40" : ""}`}>
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="animations-toggle" className="text-sm font-medium">
                Animations
              </Label>
              <span className="text-xs text-muted-foreground">
                {lightMode ? "Not available in light mode." : "Stars, comets and ship effects. Disable for better performance."}
              </span>
            </div>
            <Switch
              id="animations-toggle"
              checked={animationsEnabled}
              onCheckedChange={setAnimationsEnabled}
              disabled={lightMode}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm font-medium">Board layout</Label>
              <span className="text-xs text-muted-foreground">
                {boardLayout === "horizontal" ? "Swimlane — tasks flow horizontally." : "Columns — tasks stack vertically."}
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border/40 p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${boardLayout === "vertical" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
                    onClick={() => setBoardLayout("vertical")}
                    aria-label="Vertical columns"
                  >
                    <LayoutList className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Vertical columns</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${boardLayout === "horizontal" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
                    onClick={() => setBoardLayout("horizontal")}
                    aria-label="Horizontal swimlane"
                  >
                    <LayoutPanelTop className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Horizontal swimlane</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="light-mode-toggle" className="text-sm font-medium">
                Light mode
              </Label>
              <span className="text-xs text-muted-foreground">
                Switch between dark galaxy and light theme.
              </span>
            </div>
            <Switch
              id="light-mode-toggle"
              checked={lightMode}
              onCheckedChange={setLightMode}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;

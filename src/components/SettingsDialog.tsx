import { Settings } from "lucide-react";
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
  const { animationsEnabled, lightMode, setAnimationsEnabled, setLightMode } = useSettings();

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

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SettingsDialog from "@/components/SettingsDialog";
import { useSettings } from "@/store/settingsStore";

interface HeaderProps {
  onAddTask: () => void;
}

const Header = ({ onAddTask }: HeaderProps) => {
  const { lightMode } = useSettings();
  return (
    <header className="flex items-center justify-between border-b border-border/30 glass px-4 py-3 sm:px-6 sm:py-4">
      <h1 className={`text-xl font-bold text-foreground sm:text-2xl ${lightMode ? "tracking-tight" : "font-starwars"}`}>
        {lightMode ? "Boring ToDoList" : "Spatial ToDoList"}
      </h1>
      <div className="flex items-center gap-2">
        <SettingsDialog />
        <Button onClick={onAddTask} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          New Task
        </Button>
      </div>
    </header>
  );
};

export default Header;

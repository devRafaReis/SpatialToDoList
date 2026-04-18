import SettingsDialog from "@/components/SettingsDialog";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { useSettings } from "@/store/settingsStore";

const Header = () => {
  const { lightMode } = useSettings();
  return (
    <header className="flex items-center justify-between border-b border-border/30 glass px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-baseline gap-2">
        <h1 className={`text-xl font-bold text-foreground sm:text-2xl ${lightMode ? "tracking-tight" : "font-starwars"}`}>
          {lightMode ? "Boring ToDoList" : "Spatial ToDoList"}
        </h1>
        <WorkspaceSwitcher />
      </div>
      <SettingsDialog />
    </header>
  );
};

export default Header;

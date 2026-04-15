import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onAddTask: () => void;
}

const Header = ({ onAddTask }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between border-b border-border/30 glass px-4 py-3 sm:px-6 sm:py-4">
      <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Spatial ToDoList</h1>
      <Button onClick={onAddTask} size="sm">
        <Plus className="mr-1 h-4 w-4" />
        Nova Tarefa
      </Button>
    </header>
  );
};

export default Header;

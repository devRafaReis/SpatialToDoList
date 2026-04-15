import { TaskProvider } from "@/store/taskStore";
import KanbanBoard from "@/components/KanbanBoard";

const Index = () => {
  return (
    <TaskProvider>
      <KanbanBoard />
    </TaskProvider>
  );
};

export default Index;

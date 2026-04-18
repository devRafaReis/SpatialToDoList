import { TaskProvider } from "@/store/taskStore";
import { useWorkspace } from "@/store/workspaceStore";
import KanbanBoard from "@/components/KanbanBoard";

const Index = () => {
  const { activeWorkspaceId } = useWorkspace();
  return (
    <TaskProvider key={activeWorkspaceId} workspaceId={activeWorkspaceId}>
      <KanbanBoard />
    </TaskProvider>
  );
};

export default Index;

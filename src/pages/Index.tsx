import { TaskProvider } from "@/store/taskStore";
import { useWorkspace } from "@/store/workspaceStore";
import { useAuth } from "@/store/authStore";
import KanbanBoard from "@/components/KanbanBoard";

const Index = () => {
  const { activeWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  return (
    <TaskProvider key={`${activeWorkspaceId}-${user?.id ?? "guest"}`} workspaceId={activeWorkspaceId} userId={user?.id}>
      <KanbanBoard />
    </TaskProvider>
  );
};

export default Index;

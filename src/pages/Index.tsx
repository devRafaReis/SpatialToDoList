import { TaskProvider } from "@/store/taskStore";
import { useWorkspace } from "@/store/workspaceStore";
import { useAuth } from "@/store/authStore";
import KanbanBoard from "@/components/KanbanBoard";

const Index = () => {
  const { activeWorkspaceId, workspaces } = useWorkspace();
  const { user } = useAuth();
  const workspaceName = workspaces.find((w) => w.id === activeWorkspaceId)?.name;
  return (
    <TaskProvider key={`${activeWorkspaceId}-${user?.id ?? "guest"}`} workspaceId={activeWorkspaceId} workspaceName={workspaceName} userId={user?.id}>
      <KanbanBoard />
    </TaskProvider>
  );
};

export default Index;

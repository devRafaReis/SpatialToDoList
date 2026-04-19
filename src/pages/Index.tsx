import { TaskProvider } from "@/store/taskStore";
import { useWorkspace } from "@/store/workspaceContext";
import { useAuth } from "@/store/authContext";
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

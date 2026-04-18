import { useState } from "react";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import SettingsDialog from "@/components/SettingsDialog";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import AccessRequestDialog from "@/components/AccessRequestDialog";
import { useSettings } from "@/store/settingsStore";
import { useAuth } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AuthButton = () => {
  const { user, loading, signingIn, accessDenied, deniedEmail, clearAccessDenied, signInWithGoogle, signOut } = useAuth();
  const [requestOpen, setRequestOpen] = useState(false);

  // Open request dialog automatically when access is denied
  if (accessDenied && !requestOpen) setRequestOpen(true);

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (!user) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
          onClick={signInWithGoogle}
          disabled={signingIn}
        >
          {signingIn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
          Sign in
        </Button>
        <AccessRequestDialog
          open={requestOpen}
          defaultEmail={deniedEmail}
          onClose={() => { setRequestOpen(false); clearAccessDenied(); }}
        />
      </>
    );
  }

  const name = user.user_metadata?.full_name ?? user.email ?? "User";
  const avatar = user.user_metadata?.avatar_url as string | undefined;
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
          <Avatar className="h-7 w-7">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="text-[10px] bg-primary/20 text-primary">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="gap-2 text-red-400 focus:text-red-400">
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Header = () => {
  const { lightMode } = useSettings();
  return (
    <header className="flex items-center justify-between border-b border-border/30 glass px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-baseline gap-2 min-w-0">
        <h1 className={`font-bold text-foreground whitespace-nowrap ${lightMode ? "tracking-tight text-lg sm:text-2xl" : "font-starwars text-sm sm:text-xl"}`}>
          {lightMode ? "Boring ToDoList" : "Spatial ToDoList"}
        </h1>
        <WorkspaceSwitcher />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <AuthButton />
        <SettingsDialog />
      </div>
    </header>
  );
};

export default Header;

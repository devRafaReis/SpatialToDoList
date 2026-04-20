import { useState } from "react";
import { LogIn, LogOut, Loader2, CloudOff, Cloud, RefreshCw, Eye, EyeOff } from "lucide-react";
import SettingsDialog from "@/components/SettingsDialog";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import AccessRequestDialog from "@/components/AccessRequestDialog";
import { useSettings } from "@/store/settingsContext";
import { useAuth } from "@/store/authContext";
import { useTaskContext } from "@/store/taskContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/i18n/translations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const SyncButton = () => {
  const { user } = useAuth();
  const { syncStatus, syncError, forceSyncNow } = useTaskContext();
  const { t } = useTranslation();
  if (!user) return null;

  const label =
    syncStatus === "syncing" ? t("syncing") :
    syncStatus === "error"   ? t("syncError", { msg: syncError ?? t("failedRequest") }) :
    t("syncSuccess");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={forceSyncNow}
          disabled={syncStatus === "syncing"}
          className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:pointer-events-none"
        >
          {syncStatus === "syncing" && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
          {syncStatus === "error"   && <CloudOff className="h-3.5 w-3.5 text-destructive" />}
          {syncStatus === "idle"    && <Cloud className="h-3.5 w-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-56 text-xs">{label}</TooltipContent>
    </Tooltip>
  );
};

const AuthButton = () => {
  const { user, loading, signingIn, accessDenied, deniedEmail, clearAccessDenied, signInWithGoogle, signOut } = useAuth();
  const { t } = useTranslation();
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
          {t("signIn")}
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
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const PrivacyButton = () => {
  const { privacyMode, setPrivacyMode } = useSettings();
  const { t } = useTranslation();
  const label = privacyMode ? t("privacyModeOn") : t("privacyModeOff");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => setPrivacyMode(!privacyMode)}
          className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
            privacyMode
              ? "text-primary bg-primary/15 hover:bg-primary/25"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
          aria-label={label}
        >
          {privacyMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
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
        <PrivacyButton />
        <SyncButton />
        <AuthButton />
        <SettingsDialog />
      </div>
    </header>
  );
};

export default Header;

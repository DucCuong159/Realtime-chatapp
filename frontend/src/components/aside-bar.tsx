import { useAuth } from "@/hooks/use-auth";
import { useIsUserOnline } from "@/hooks/use-is-user-online";
import { PROTECTED_ROUTES } from "@/routes/routes";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { Link } from "react-router-dom";
import AvatarWithBadge from "./avatar-with-badge";
import Logo from "./logo";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface AsideBarProps {
  defaultMenuOpen?: boolean;
}

const AsideBar = ({ defaultMenuOpen }: AsideBarProps = {}) => {
  const { user, logout } = useAuth();
  const { toggleTheme } = useTheme();

  const isOnline = useIsUserOnline(user?._id);

  return (
    <aside className="fixed inset-y-0 left-0 flex w-14 flex-col items-center justify-between border-r border-border bg-sidebar py-3.5 z-20">
      <Logo url={PROTECTED_ROUTES.CONVERSATION} imgClass="size-8" />
      <div className="flex flex-col items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full"
          aria-label="Toggle theme"
          onClick={toggleTheme}
        >
          <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <DropdownMenu defaultOpen={defaultMenuOpen}>
          <DropdownMenuTrigger
            className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Account menu"
          >
            <AvatarWithBadge
              name={user?.name || "Unknown"}
              src={user?.avatar || ""}
              isOnline={isOnline}
              size="size-9"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-lg p-1.5"
            side="right"
            sideOffset={10}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-2 font-normal">
                <div className="flex items-center gap-2.5">
                  <AvatarWithBadge
                    name={user?.name || "Unknown"}
                    src={user?.avatar || ""}
                    isOnline={isOnline}
                    size="size-8"
                  />
                  <div className="flex flex-col space-y-0.5 overflow-hidden text-left">
                    <p className="truncate text-sm font-semibold leading-none text-foreground">
                      {user?.name || "User"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.email || ""}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link to={PROTECTED_ROUTES.PROFILE} />}
                className="cursor-pointer gap-2 py-2"
              >
                <User className="size-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => logout()}
                className="cursor-pointer gap-2 py-2 text-destructive focus:text-destructive"
              >
                <LogOut className="size-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};

export default AsideBar;

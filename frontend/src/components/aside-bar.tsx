import { useAuth } from "@/hooks/use-auth";
import { isUserOnline } from "@/lib/helper";
import { PROTECTED_ROUTES } from "@/routes/routes";
import { Moon, Sun } from "lucide-react";
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
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const AsideBar = () => {
  const { user, logout } = useAuth();
  const { toggleTheme } = useTheme();

  const isOnline = isUserOnline(user?._id);

  return (
    <aside className="fixed inset-y-0 left-0 flex w-14 flex-col items-center justify-between border-r border-border bg-sidebar py-3.5">
      <Logo url={PROTECTED_ROUTES.CONVERSATION} imgClass="size-8" />
      <div className="flex flex-col items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full cursor-pointer"
          aria-label="Toggle theme"
          onClick={toggleTheme}
        >
          <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <DropdownMenu>
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
            className="w-48 rounded-lg"
            side="right"
            sideOffset={10}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => logout()} className="cursor-pointer">
                Logout
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};

export default AsideBar;

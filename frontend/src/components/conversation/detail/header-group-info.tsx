import AvatarWithBadge from "@/components/avatar-with-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useIsUserOnline from "@/hooks/use-is-user-online";
import type { ConversationType } from "@/types/conversation.type";
import { memo } from "react";
import HeaderUserInfo from "./header-user-info";

interface MemberDropdownItemProps {
  member: ConversationType["participants"][number];
}

const MemberDropdownItem = memo(({ member }: MemberDropdownItemProps) => {
  const isOnline = useIsUserOnline(member._id);

  return (
    <DropdownMenuItem className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5">
      <AvatarWithBadge
        name={member.name}
        src={member.avatar ?? undefined}
        isOnline={isOnline}
      />
      <span className="flex-1 truncate text-sm font-medium text-foreground">
        {member.name}
      </span>
    </DropdownMenuItem>
  );
});

MemberDropdownItem.displayName = "MemberDropdownItem";

interface HeaderGroupInfoProps {
  participants: ConversationType["participants"];
  name: string;
  subheading: string;
  avatar?: string | null;
  isOnline: boolean;
}

const HeaderGroupInfo = ({
  participants,
  name,
  subheading,
  avatar,
  isOnline,
}: HeaderGroupInfoProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        openOnHover
        className="cursor-pointer rounded-lg text-left outline-none transition-opacity hover:opacity-90"
        aria-label={name ? `Members of ${name}` : "Member list"}
      >
        <HeaderUserInfo
          name={name}
          subheading={subheading}
          avatar={avatar}
          isGroup={true}
          isOnline={isOnline}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-56 rounded-xl p-1.5"
        side="bottom"
        align="start"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Members ({participants.length})
          </DropdownMenuLabel>
          <div className="max-h-60 space-y-0.5 overflow-y-auto">
            {participants.map((member) => (
              <MemberDropdownItem key={member._id} member={member} />
            ))}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default memo(HeaderGroupInfo);

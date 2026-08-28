import AvatarWithBadge from "@/components/avatar-with-badge";
import { memo } from "react";

interface HeaderUserInfoProps {
  name: string;
  subheading: string;
  avatar?: string | null;
  isGroup: boolean;
  isOnline: boolean;
}

const HeaderUserInfo = ({
  name,
  subheading,
  avatar,
  isGroup,
  isOnline,
}: HeaderUserInfoProps) => {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <AvatarWithBadge
        name={name}
        src={avatar ?? undefined}
        isGroup={isGroup}
        isOnline={isOnline}
      />
      <div className="flex min-w-0 flex-col">
        <h5 className="truncate text-sm font-semibold leading-tight text-foreground">
          {name}
        </h5>
        <p
          className={`truncate text-xs ${
            isOnline ? "font-medium text-green-500" : "text-muted-foreground"
          }`}
        >
          {subheading}
        </p>
      </div>
    </div>
  );
};

export default memo(HeaderUserInfo);

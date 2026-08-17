import groupImg from "@/assets/images/group-img.png";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface Props {
  name: string;
  src?: string;
  size?: string;
  isOnline?: boolean;
  isGroup?: boolean;
  className?: string;
}

const AvatarWithBadge = ({
  name,
  src,
  isOnline,
  isGroup = false,
  size = "size-9",
  className,
}: Props) => {
  const avatar = isGroup ? groupImg : src || "";

  return (
    <div className="relative shrink-0">
      <Avatar className={size}>
        <AvatarImage src={avatar} />
        <AvatarFallback
          className={cn("bg-primary/10 text-primary font-semibold", className)}
        >
          {name?.charAt(0)}
        </AvatarFallback>
      </Avatar>

      {isOnline && !isGroup && (
        <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background bg-green-500" />
      )}
    </div>
  );
};

export default AvatarWithBadge;

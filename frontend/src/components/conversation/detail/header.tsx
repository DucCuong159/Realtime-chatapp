import { Button } from "@/components/ui/button";
import useConversationDetails from "@/hooks/use-conversation-details";
import { PROTECTED_ROUTES } from "@/routes/routes";
import type { ConversationType } from "@/types/conversation.type";
import { ArrowLeft } from "lucide-react";
import { memo } from "react";
import { useNavigate } from "react-router-dom";
import HeaderActions from "./header-actions";
import HeaderGroupInfo from "./header-group-info";
import HeaderUserInfo from "./header-user-info";

interface Props {
  conversation: ConversationType;
  currentUserId: string | null;
}

const ConversationHeader = ({ conversation, currentUserId }: Props) => {
  const navigate = useNavigate();
  const { name, subheading, avatar, isOnline, isGroup } =
    useConversationDetails(conversation, currentUserId);

  return (
    <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 md:hidden"
          onClick={() => navigate(PROTECTED_ROUTES.CONVERSATION)}
          aria-label="Back to conversation list"
        >
          <ArrowLeft className="size-5 text-muted-foreground" />
        </Button>

        {isGroup ? (
          <HeaderGroupInfo
            participants={conversation.participants}
            name={name}
            subheading={subheading}
            avatar={avatar}
            isOnline={isOnline}
          />
        ) : (
          <HeaderUserInfo
            name={name}
            subheading={subheading}
            avatar={avatar}
            isGroup={isGroup}
            isOnline={isOnline}
          />
        )}
      </div>

      <HeaderActions />
    </div>
  );
};

export default memo(ConversationHeader);

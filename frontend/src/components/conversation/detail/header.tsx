import { Button } from "@/components/ui/button";
import { useCall } from "@/hooks/use-call";
import useConversationDetails from "@/hooks/use-conversation-details";
import { PROTECTED_ROUTES } from "@/routes/routes";
import type { ConversationType } from "@/types/conversation.type";
import { ArrowLeft } from "lucide-react";
import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AiModelSelector from "./ai-model-selector";
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

  const isAi = Boolean(
    conversation.isAiConversation ||
    conversation.participants?.some((p) => p.isAI),
  );

  const otherParticipant = !isGroup
    ? conversation.participants?.find((p) => p._id !== currentUserId)
    : null;

  const handleAudioCall = useCallback(() => {
    if (isAi || isGroup || !otherParticipant) return;
    useCall.getState().initiateCall(
      {
        _id: otherParticipant._id,
        name: otherParticipant.name,
        avatar: otherParticipant.avatar,
      },
      conversation._id,
    );
  }, [isAi, isGroup, otherParticipant, conversation._id]);

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

      <div className="flex shrink-0 items-center gap-2">
        {isAi && <AiModelSelector />}
        <HeaderActions
          isAiConversation={isAi}
          isGroup={isGroup}
          onAudioCall={handleAudioCall}
        />
      </div>
    </div>
  );
};

export default memo(ConversationHeader);

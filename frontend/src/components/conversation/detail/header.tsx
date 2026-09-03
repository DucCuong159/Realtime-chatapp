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

const useConversationCalls = (
  conversationId: string,
  participant: ConversationType["participants"][number] | null | undefined,
  isDisabled: boolean,
) => {
  const startCall = useCallback(
    (callType: "audio" | "video") => {
      if (isDisabled || !participant) return;
      useCall.getState().initiateCall(
        {
          _id: participant._id,
          name: participant.name,
          avatar: participant.avatar,
        },
        conversationId,
        callType,
      );
    },
    [conversationId, participant, isDisabled],
  );

  return {
    handleAudioCall: useCallback(() => startCall("audio"), [startCall]),
    handleVideoCall: useCallback(() => startCall("video"), [startCall]),
  };
};

interface InfoProps {
  conversation: ConversationType;
  currentUserId: string | null;
  onBack: () => void;
}

const HeaderInfoSection = ({
  conversation,
  currentUserId,
  onBack,
}: InfoProps) => {
  const { name, subheading, avatar, isOnline, isGroup } =
    useConversationDetails(conversation, currentUserId);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 md:hidden"
        onClick={onBack}
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
  );
};

const ConversationHeader = ({ conversation, currentUserId }: Props) => {
  const navigate = useNavigate();
  const isGroup = conversation.isGroup;
  const isAi = Boolean(
    conversation.isAiConversation ||
    conversation.participants?.some((p) => p.isAI),
  );

  const otherParticipant = !isGroup
    ? conversation.participants?.find((p) => p._id !== currentUserId)
    : null;

  const { handleAudioCall, handleVideoCall } = useConversationCalls(
    conversation._id,
    otherParticipant,
    isAi || isGroup,
  );

  return (
    <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm">
      <HeaderInfoSection
        conversation={conversation}
        currentUserId={currentUserId}
        onBack={() => navigate(PROTECTED_ROUTES.CONVERSATION)}
      />

      <div className="flex shrink-0 items-center gap-2">
        {isAi && <AiModelSelector />}
        <HeaderActions
          isAiConversation={isAi}
          isGroup={isGroup}
          onAudioCall={handleAudioCall}
          onVideoCall={handleVideoCall}
        />
      </div>
    </div>
  );
};

export default memo(ConversationHeader);

import infoSvg from "@/assets/images/info-icon.svg";
import { Button } from "@/components/ui/button";
import { Phone, Video } from "lucide-react";
import { memo } from "react";

interface HeaderActionsProps {
  isAiConversation?: boolean;
  isGroup?: boolean;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
  onInfoClick?: () => void;
}

const HeaderActions = ({
  isAiConversation,
  isGroup,
  onAudioCall,
  onVideoCall,
  onInfoClick,
}: HeaderActionsProps) => {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {!isAiConversation && !isGroup && (
        <>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Audio call"
            onClick={onAudioCall}
            className="size-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Phone className="size-5 fill-[#2a7bff] text-[#2a7bff]" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Video call"
            onClick={onVideoCall}
            className="size-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Video className="size-5 fill-[#2a7bff] text-[#2a7bff]" />
          </Button>
        </>
      )}

      <Button
        variant="ghost"
        size="icon"
        aria-label="Conversation info"
        onClick={onInfoClick}
        className="size-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
      >
        <img src={infoSvg} alt="Info" className="size-5" />
      </Button>
    </div>
  );
};

export default memo(HeaderActions);


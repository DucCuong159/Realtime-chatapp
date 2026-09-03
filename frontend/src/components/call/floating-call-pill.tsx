import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCall } from "@/hooks/use-call";
import { formatCallTimer } from "@/lib/utils";
import type { CallStatus, CallUser } from "@/types/call.type";
import { Maximize2, Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { memo } from "react";

const FloatingCallTimer = ({ status }: { status: CallStatus }) => {
  const duration = useCall((s) => s.session?.duration || 0);

  const getPillStatusText = (): string => {
    switch (status) {
      case "CONNECTED":
        return formatCallTimer(duration);
      case "CALLING":
        return "Calling...";
      case "ENDED":
        return "Ended";
      default:
        return "Connecting...";
    }
  };

  return (
    <span className="text-[11px] font-mono text-muted-foreground">
      {getPillStatusText()}
    </span>
  );
};

const PillAvatar = ({
  remoteUser,
  isConnected,
}: {
  remoteUser: CallUser;
  isConnected: boolean;
}) => {
  const initials = remoteUser.name
    ? remoteUser.name.slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="relative flex items-center justify-center">
      <Avatar className="size-9 border border-border">
        {remoteUser.avatar ? (
          <AvatarImage src={remoteUser.avatar} alt={remoteUser.name} />
        ) : null}
        <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      {isConnected && (
        <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
      )}
    </div>
  );
};

interface ControlsProps {
  status: CallStatus;
  isMuted: boolean;
  isVideo: boolean;
  isVideoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleMinimize: () => void;
  onEndCall: () => void;
}

const PillMediaButtons = ({
  status,
  isMuted,
  isVideo,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
}: {
  status: CallStatus;
  isMuted: boolean;
  isVideo: boolean;
  isVideoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}) => (
  <>
    <Button
      size="icon"
      variant={isMuted ? "destructive" : "ghost"}
      className="size-8 rounded-full"
      onClick={onToggleMute}
      disabled={status === "ENDED" || status === "CALLING"}
      aria-label={isMuted ? "Unmute" : "Mute"}
    >
      {isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
    </Button>

    {isVideo && (
      <Button
        size="icon"
        variant={isVideoOff ? "destructive" : "ghost"}
        className="size-8 rounded-full"
        onClick={onToggleVideo}
        disabled={status === "ENDED"}
        aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
      >
        {isVideoOff ? (
          <VideoOff className="size-3.5" />
        ) : (
          <Video className="size-3.5" />
        )}
      </Button>
    )}
  </>
);

const PillControls = ({
  status,
  isMuted,
  isVideo,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onToggleMinimize,
  onEndCall,
}: ControlsProps) => (
  <div className="flex items-center gap-1.5 ml-2">
    <PillMediaButtons
      status={status}
      isMuted={isMuted}
      isVideo={isVideo}
      isVideoOff={isVideoOff}
      onToggleMute={onToggleMute}
      onToggleVideo={onToggleVideo}
    />

    <Button
      size="icon"
      variant="ghost"
      className="size-8 rounded-full text-muted-foreground hover:text-foreground"
      onClick={onToggleMinimize}
      aria-label="Maximize call"
    >
      <Maximize2 className="size-3.5" />
    </Button>

    <Button
      size="icon"
      variant="destructive"
      className="size-8 rounded-full bg-red-600 hover:bg-red-700 text-white shadow"
      onClick={onEndCall}
      disabled={status === "ENDED"}
      aria-label="End call"
    >
      <PhoneOff className="size-3.5" />
    </Button>
  </div>
);

const FloatingCallPill = () => {
  const status = useCall((s) => s.status);
  const session = useCall((s) => s.session);
  const isMuted = useCall((s) => s.isMuted);
  const isVideoOff = useCall((s) => s.isVideoOff);
  const isMinimized = useCall((s) => s.isMinimized);

  const endCall = useCall((s) => s.endCall);
  const toggleMute = useCall((s) => s.toggleMute);
  const toggleVideo = useCall((s) => s.toggleVideo);
  const toggleMinimize = useCall((s) => s.toggleMinimize);

  const isVisible =
    (status === "CALLING" ||
      status === "CONNECTING" ||
      status === "CONNECTED" ||
      status === "ENDED") &&
    isMinimized;

  if (!isVisible || !session) return null;

  const { remoteUser } = session;
  const isVideo = session.callType === "video";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-border/80 bg-card/90 backdrop-blur-md px-4 py-2.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
      <PillAvatar
        remoteUser={remoteUser}
        isConnected={status === "CONNECTED"}
      />

      <div className="flex flex-col min-w-20">
        <span className="text-xs font-semibold text-foreground truncate max-w-28 flex items-center gap-1">
          {isVideo && <Video className="size-3 text-emerald-500 shrink-0" />}
          <span className="truncate">{remoteUser.name}</span>
        </span>
        <FloatingCallTimer status={status} />
      </div>

      <PillControls
        status={status}
        isMuted={isMuted}
        isVideo={isVideo}
        isVideoOff={isVideoOff}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleMinimize={toggleMinimize}
        onEndCall={() => endCall("normal")}
      />
    </div>
  );
};

export default memo(FloatingCallPill);

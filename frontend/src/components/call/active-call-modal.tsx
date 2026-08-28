import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCallDuration, useCall } from "@/hooks/use-call";
import type { CallEndReason, CallStatus, CallUser } from "@/types/call.type";
import { Mic, MicOff, Minimize2, PhoneOff } from "lucide-react";
import { memo } from "react";

interface AvatarProps {
  remoteUser: CallUser;
  status: CallStatus;
}

const ActiveCallAvatar = ({ remoteUser, status }: AvatarProps) => {
  const initials = remoteUser.name ? remoteUser.name.slice(0, 2).toUpperCase() : "U";

  return (
    <div className="relative my-6 flex items-center justify-center">
      {status === "CONNECTED" && (
        <>
          <span className="absolute inline-flex size-32 rounded-full bg-primary/20 animate-ping opacity-60 will-change-transform" />
          <span className="absolute inline-flex size-28 rounded-full bg-primary/30 animate-pulse will-change-transform" />
        </>
      )}
      {status === "CALLING" && (
        <span className="absolute inline-flex size-28 rounded-full bg-blue-500/25 animate-pulse will-change-transform" />
      )}

      <Avatar className="size-24 border-2 border-border shadow-xl">
        {remoteUser.avatar ? (
          <AvatarImage src={remoteUser.avatar} alt={remoteUser.name} />
        ) : null}
        <AvatarFallback className="bg-primary/20 text-primary font-bold text-2xl">
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};

interface ControlsProps {
  status: CallStatus;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
}

const ActiveCallControls = ({
  status,
  isMuted,
  onToggleMute,
  onEndCall,
}: ControlsProps) => (
  <div className="mt-10 flex w-full items-center justify-center gap-6">
    {/* Mute Button */}
    <div className="flex flex-col items-center gap-1.5">
      <Button
        size="icon"
        variant={isMuted ? "destructive" : "secondary"}
        className={`size-12 rounded-full shadow-md transition-all ${
          isMuted
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
        onClick={onToggleMute}
        disabled={status === "ENDED" || status === "CALLING"}
        aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
      >
        {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
      </Button>
      <span className="text-xs text-muted-foreground font-medium">
        {isMuted ? "Unmute" : "Mute"}
      </span>
    </div>

    {/* End Call Button */}
    <div className="flex flex-col items-center gap-1.5">
      <Button
        size="icon"
        variant="destructive"
        className="size-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/30 hover:scale-105 transition-transform"
        onClick={onEndCall}
        disabled={status === "ENDED"}
        aria-label="End call"
      >
        <PhoneOff className="size-6" />
      </Button>
      <span className="text-xs text-muted-foreground font-medium">End</span>
    </div>
  </div>
);

const CallStatusDisplay = ({
  status,
  endReason,
}: {
  status: CallStatus;
  endReason: CallEndReason | null;
}) => {
  const duration = useCall((s) => s.session?.duration || 0);

  const getStatusText = (): string => {
    switch (status) {
      case "CALLING":
        return "Calling...";
      case "CONNECTING":
        return "Connecting...";
      case "CONNECTED":
        return formatCallDuration(duration);
      case "ENDED":
        if (endReason === "busy") return "User is busy";
        if (endReason === "rejected") return "Call declined";
        if (endReason === "timeout") return "No answer";
        if (endReason === "offline") return "User offline";
        if (endReason === "peer_disconnected") return "Disconnected";
        return "Call ended";
      default:
        return "";
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2">
      {status === "CONNECTED" && (
        <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
      )}
      <p
        className={`text-sm font-medium ${
          status === "CONNECTED"
            ? "text-emerald-500 font-mono tracking-wider text-base font-semibold"
            : status === "ENDED"
              ? "text-destructive font-semibold"
              : "text-muted-foreground animate-pulse"
        }`}
      >
        {getStatusText()}
      </p>
    </div>
  );
};

const ActiveCallModal = () => {
  const status = useCall((s) => s.status);
  const session = useCall((s) => s.session);
  const isMuted = useCall((s) => s.isMuted);
  const isMinimized = useCall((s) => s.isMinimized);
  const endReason = useCall((s) => s.endReason);

  const endCall = useCall((s) => s.endCall);
  const toggleMute = useCall((s) => s.toggleMute);
  const toggleMinimize = useCall((s) => s.toggleMinimize);

  const isVisible =
    (status === "CALLING" ||
      status === "CONNECTING" ||
      status === "CONNECTED" ||
      status === "ENDED") &&
    !isMinimized;

  if (!isVisible || !session) return null;

  const { remoteUser } = session;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-card/95 backdrop-blur-md p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Top bar controls */}
        <div className="absolute top-4 right-4">
          <Button
            size="icon"
            variant="ghost"
            className="size-8 rounded-full text-muted-foreground hover:text-foreground"
            onClick={toggleMinimize}
            aria-label="Minimize call"
          >
            <Minimize2 className="size-4" />
          </Button>
        </div>

        {/* User Avatar */}
        <ActiveCallAvatar remoteUser={remoteUser} status={status} />

        {/* User info */}
        <h3 className="text-2xl font-bold text-foreground tracking-tight">
          {remoteUser.name}
        </h3>

        {/* Status & Duration */}
        <CallStatusDisplay status={status} endReason={endReason} />

        {/* Controls */}
        <ActiveCallControls
          status={status}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onEndCall={() => endCall("normal")}
        />
      </div>
    </div>
  );
};

export default memo(ActiveCallModal);

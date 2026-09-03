import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCall } from "@/hooks/use-call";
import { Phone, PhoneOff, Video } from "lucide-react";
import { memo } from "react";

interface ActionsProps {
  isVideo: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallActions = ({ isVideo, onAccept, onReject }: ActionsProps) => (
  <div className="mt-8 flex w-full items-center justify-center gap-8">
    <div className="flex flex-col items-center gap-1.5">
      <Button
        size="icon"
        variant="destructive"
        className="size-14 rounded-full shadow-lg hover:scale-105 transition-transform"
        onClick={onReject}
        aria-label="Decline call"
      >
        <PhoneOff className="size-6 text-white" />
      </Button>
      <span className="text-xs text-muted-foreground font-medium">Decline</span>
    </div>

    <div className="flex flex-col items-center gap-1.5">
      <Button
        size="icon"
        className="size-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 hover:scale-105 transition-transform animate-bounce"
        onClick={onAccept}
        aria-label={isVideo ? "Accept video call" : "Accept voice call"}
      >
        {isVideo ? <Video className="size-6" /> : <Phone className="size-6" />}
      </Button>
      <span className="text-xs text-muted-foreground font-medium">Accept</span>
    </div>
  </div>
);

const IncomingCallModal = () => {
  const status = useCall((s) => s.status);
  const session = useCall((s) => s.session);
  const acceptCall = useCall((s) => s.acceptCall);
  const rejectCall = useCall((s) => s.rejectCall);

  if (status !== "RINGING" || !session) return null;

  const { remoteUser } = session;
  const isVideo = session.callType === "video";
  const initials = remoteUser.name
    ? remoteUser.name.slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl flex flex-col items-center text-center">
        <div className="relative my-4 flex items-center justify-center">
          <span className="absolute inline-flex size-28 rounded-full bg-emerald-500/20 animate-ping opacity-75 will-change-transform" />
          <span className="absolute inline-flex size-24 rounded-full bg-emerald-500/30 animate-pulse will-change-transform" />
          <Avatar className="size-20 border-2 border-emerald-500 shadow-lg">
            {remoteUser.avatar ? (
              <AvatarImage src={remoteUser.avatar} alt={remoteUser.name} />
            ) : null}
            <AvatarFallback className="bg-emerald-600 text-white font-semibold text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        <h3 className="mt-2 text-xl font-bold text-foreground">
          {remoteUser.name}
        </h3>
        <p className="mt-1 text-sm font-medium text-emerald-500 animate-pulse flex items-center justify-center gap-1.5">
          {isVideo && <Video className="size-4 inline" />}
          {isVideo ? "Incoming video call..." : "Incoming voice call..."}
        </p>

        <IncomingCallActions
          isVideo={isVideo}
          onAccept={acceptCall}
          onReject={() => rejectCall("rejected")}
        />
      </div>
    </div>
  );
};

export default memo(IncomingCallModal);

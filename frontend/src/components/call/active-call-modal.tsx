import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCall } from "@/hooks/use-call";
import { formatCallTimer } from "@/lib/utils";
import type { CallEndReason, CallStatus, CallUser } from "@/types/call.type";
import {
  CameraOff,
  FlipHorizontal2,
  Mic,
  MicOff,
  Minimize2,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { memo, useEffect, useRef } from "react";

// --- Custom Hooks for Modal Logic ---

const useCallModalFocus = (
  modalRef: React.RefObject<HTMLDivElement | null>,
  isVisible: boolean,
) => {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isVisible) {
      previousActiveElementRef.current =
        document.activeElement as HTMLElement | null;
      modalRef.current?.focus();
    } else if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus?.();
    }
  }, [isVisible, modalRef]);
};

const handleModalTabKey = (
  e: React.KeyboardEvent<HTMLDivElement>,
  modal: HTMLDivElement,
) => {
  const focusables = Array.from(
    modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );

  if (focusables.length === 0) {
    e.preventDefault();
    modal.focus();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
};

/**
 * Bind a MediaStream to a <video> element via ref + useEffect.
 * Deps include `status` so srcObject re-attaches when the video element
 * mounts on status transition (e.g. CONNECTING → CONNECTED).
 */
const useVideoStream = (
  stream: MediaStream | null,
  status: CallStatus,
) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, status]);

  return videoRef;
};

// --- Helper UI Components ---

const getReasonLabel = (endReason: CallEndReason | null): string => {
  if (endReason === "busy") return "User is busy";
  if (endReason === "rejected") return "Call declined";
  if (endReason === "timeout") return "No answer";
  if (endReason === "offline") return "User offline";
  if (endReason === "peer_disconnected") return "Disconnected";
  return "Call ended";
};

const getStatusLabel = (
  status: CallStatus,
  duration: number,
  endReason: CallEndReason | null,
): string => {
  if (status === "CALLING") return "Calling...";
  if (status === "CONNECTING") return "Connecting...";
  if (status === "CONNECTED") return formatCallTimer(duration);
  if (status === "ENDED") return getReasonLabel(endReason);
  return "";
};

const CallStatusText = ({
  status,
  endReason,
}: {
  status: CallStatus;
  endReason: CallEndReason | null;
}) => {
  const duration = useCall((s) => s.session?.duration || 0);
  const text = getStatusLabel(status, duration, endReason);
  const isConnected = status === "CONNECTED";

  return (
    <div className="mt-2 flex items-center justify-center gap-2">
      {isConnected && (
        <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
      )}
      <p
        className={`text-sm font-medium ${
          isConnected
            ? "text-emerald-500 font-mono tracking-wider text-base font-semibold"
            : status === "ENDED"
              ? "text-destructive font-semibold"
              : "text-muted-foreground animate-pulse"
        }`}
      >
        {text}
      </p>
    </div>
  );
};

// --- Audio Call View ---

interface AudioLayoutProps {
  remoteUser: CallUser;
  status: CallStatus;
  endReason: CallEndReason | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onMinimize: () => void;
  onEndCall: () => void;
}

const ActiveAudioCallView = ({
  remoteUser,
  status,
  endReason,
  isMuted,
  onToggleMute,
  onMinimize,
  onEndCall,
}: AudioLayoutProps) => {
  const initials = remoteUser.name ? remoteUser.name.slice(0, 2).toUpperCase() : "U";

  return (
    <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-card/95 backdrop-blur-md p-8 shadow-2xl flex flex-col items-center text-center">
      <div className="absolute top-4 right-4">
        <Button
          size="icon"
          variant="ghost"
          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
          onClick={onMinimize}
          aria-label="Minimize call"
        >
          <Minimize2 className="size-4" />
        </Button>
      </div>

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

      <h3 id="active-call-title" className="text-2xl font-bold text-foreground tracking-tight">
        {remoteUser.name}
      </h3>

      <CallStatusText status={status} endReason={endReason} />

      <div className="mt-10 flex w-full items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-1.5">
          <Button
            size="icon"
            variant={isMuted ? "destructive" : "secondary"}
            className="size-12 rounded-full shadow-md transition-all"
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
    </div>
  );
};

// --- Video Call View ---

interface VideoLayoutProps {
  remoteUser: CallUser;
  status: CallStatus;
  endReason: CallEndReason | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isRemoteVideoOff?: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => void;
  toggleMinimize: () => void;
  endCall: (reason?: CallEndReason) => void;
}

const VideoPip = ({
  isVideoOff,
  localStream,
  localVideoRef,
}: {
  isVideoOff: boolean;
  localStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
}) => {
  const isCameraOff = isVideoOff || !localStream;

  return (
    <div className="absolute bottom-24 right-4 sm:right-6 w-32 h-44 sm:w-44 sm:h-60 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-inset ring-white/20 bg-neutral-900 z-20 transition-all isolate [clip-path:inset(0_round_1rem)]">
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover scale-x-[-1] rounded-2xl bg-black ${
          isCameraOff ? "hidden" : "block"
        }`}
      />
      {isCameraOff && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-neutral-400 gap-2 p-2">
          <CameraOff className="size-6 text-neutral-500" />
          <span className="text-[11px] font-medium text-neutral-400">Camera off</span>
        </div>
      )}
      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[11px] text-white font-medium">
        You
      </span>
    </div>
  );
};

const VideoControls = ({
  status,
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onEndCall,
}: {
  status: CallStatus;
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onEndCall: () => void;
}) => (
  <div className="relative z-30 pb-6 flex items-center justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12">
    <div className="flex items-center gap-4 px-6 py-3 rounded-full bg-neutral-900/80 backdrop-blur-xl ring-1 ring-inset ring-white/15 shadow-2xl">
      <Button
        size="icon"
        variant={isMuted ? "destructive" : "secondary"}
        className="size-12 rounded-full transition-all"
        onClick={onToggleMute}
        disabled={status === "ENDED" || status === "CALLING"}
        aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
      >
        {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
      </Button>

      <Button
        size="icon"
        variant={isVideoOff ? "destructive" : "secondary"}
        className="size-12 rounded-full transition-all"
        onClick={onToggleVideo}
        disabled={status === "ENDED"}
        aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
      >
        {isVideoOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
      </Button>

      <Button
        size="icon"
        variant="secondary"
        className="size-12 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all"
        onClick={onSwitchCamera}
        disabled={status === "ENDED" || isVideoOff}
        aria-label="Switch camera"
      >
        <FlipHorizontal2 className="size-5" />
      </Button>

      <Button
        size="icon"
        variant="destructive"
        className="size-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/30 hover:scale-105 transition-transform"
        onClick={onEndCall}
        disabled={status === "ENDED"}
        aria-label="End call"
      >
        <PhoneOff className="size-6" />
      </Button>
    </div>
  </div>
);

const ActiveVideoCallView = ({
  remoteUser,
  status,
  endReason,
  isMuted,
  isVideoOff,
  isRemoteVideoOff,
  localStream,
  remoteStream,
  toggleMute,
  toggleVideo,
  switchCamera,
  toggleMinimize,
  endCall,
}: VideoLayoutProps) => {
  const remoteVideoRef = useVideoStream(remoteStream, status);
  const localVideoRef = useVideoStream(localStream, status);
  const duration = useCall((s) => s.session?.duration || 0);
  const isConnected = status === "CONNECTED";
  const hasRemoteVideo =
    isConnected &&
    !isRemoteVideoOff &&
    Boolean(
      remoteStream &&
        remoteStream.getVideoTracks().some((t) => t.enabled && t.readyState === "live"),
    );
  const initials = remoteUser.name ? remoteUser.name.slice(0, 2).toUpperCase() : "U";

  return (
    <div className="relative w-full max-w-4xl h-[90vh] max-h-[720px] rounded-3xl overflow-hidden bg-black ring-1 ring-inset ring-white/10 shadow-2xl flex flex-col justify-between select-none isolate [clip-path:inset(0_round_1.5rem)]">
      {/* Remote Video — always in DOM, visibility toggled via CSS */}
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover rounded-3xl bg-black transition-opacity duration-300 ${
            hasRemoteVideo ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />

        {/* Center Fallback / Calling State */}
        {!hasRemoteVideo && (
          <div className="flex flex-col items-center justify-center text-center p-6 z-10 animate-in fade-in duration-200">
            <Avatar className="size-24 border-2 border-white/20 shadow-xl my-4">
              {remoteUser.avatar ? <AvatarImage src={remoteUser.avatar} alt={remoteUser.name} /> : null}
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <h3 className="text-2xl font-bold text-white tracking-tight">{remoteUser.name}</h3>
            {isConnected && isRemoteVideoOff ? (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs text-white/80 backdrop-blur-md">
                <VideoOff className="size-3.5" />
                <span>Camera is off</span>
              </div>
            ) : (
              <CallStatusText status={status} endReason={endReason} />
            )}
          </div>
        )}
      </div>

      {/* Local PiP Preview */}
      <VideoPip
        isVideoOff={isVideoOff}
        localStream={localStream}
        localVideoRef={localVideoRef}
      />

      {/* Top Header Overlay */}
      <div className="relative z-30 flex items-center justify-between px-6 py-5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border border-white/20">
            {remoteUser.avatar ? <AvatarImage src={remoteUser.avatar} alt={remoteUser.name} /> : null}
            <AvatarFallback className="bg-primary/30 text-white font-semibold text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-semibold text-white truncate max-w-48">{remoteUser.name}</span>
            <div className="flex items-center justify-start gap-1.5 text-xs text-white/70">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className={isConnected ? "font-mono font-semibold text-emerald-400" : ""}>
                {isConnected ? formatCallTimer(duration) : "Video Call"}
              </span>
            </div>
          </div>
        </div>

        <Button
          size="icon"
          variant="ghost"
          className="size-9 rounded-full text-white/80 hover:text-white hover:bg-white/10"
          onClick={toggleMinimize}
          aria-label="Minimize call"
        >
          <Minimize2 className="size-4" />
        </Button>
      </div>

      {/* Bottom Controls Bar */}
      <VideoControls
        status={status}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onSwitchCamera={switchCamera}
        onEndCall={() => endCall("normal")}
      />
    </div>
  );
};

// --- Active Call Modal Root Component ---

const useActiveCallModalState = () => ({
  status: useCall((s) => s.status),
  session: useCall((s) => s.session),
  isMuted: useCall((s) => s.isMuted),
  isVideoOff: useCall((s) => s.isVideoOff),
  isRemoteVideoOff: useCall((s) => s.isRemoteVideoOff),
  isMinimized: useCall((s) => s.isMinimized),
  endReason: useCall((s) => s.endReason),
  localStream: useCall((s) => s.localStream),
  remoteStream: useCall((s) => s.remoteStream),
  endCall: useCall((s) => s.endCall),
  toggleMute: useCall((s) => s.toggleMute),
  toggleVideo: useCall((s) => s.toggleVideo),
  switchCamera: useCall((s) => s.switchCamera),
  toggleMinimize: useCall((s) => s.toggleMinimize),
});

const ActiveCallModal = () => {
  const call = useActiveCallModalState();
  const modalRef = useRef<HTMLDivElement>(null);
  const isVisible =
    (call.status === "CALLING" ||
      call.status === "CONNECTING" ||
      call.status === "CONNECTED" ||
      call.status === "ENDED") &&
    !call.isMinimized;

  useCallModalFocus(modalRef, isVisible);

  if (!isVisible || !call.session) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      call.toggleMinimize();
    } else if (e.key === "Tab" && modalRef.current) {
      handleModalTabKey(e, modalRef.current);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-call-title"
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150 outline-none"
    >
      {call.session.callType === "video" ? (
        <ActiveVideoCallView
          remoteUser={call.session.remoteUser}
          status={call.status}
          endReason={call.endReason}
          isMuted={call.isMuted}
          isVideoOff={call.isVideoOff}
          isRemoteVideoOff={call.isRemoteVideoOff}
          localStream={call.localStream}
          remoteStream={call.remoteStream}
          toggleMute={call.toggleMute}
          toggleVideo={call.toggleVideo}
          switchCamera={call.switchCamera}
          toggleMinimize={call.toggleMinimize}
          endCall={call.endCall}
        />
      ) : (
        <ActiveAudioCallView
          remoteUser={call.session.remoteUser}
          status={call.status}
          endReason={call.endReason}
          isMuted={call.isMuted}
          onToggleMute={call.toggleMute}
          onMinimize={call.toggleMinimize}
          onEndCall={() => call.endCall("normal")}
        />
      )}
    </div>
  );
};

export default memo(ActiveCallModal);

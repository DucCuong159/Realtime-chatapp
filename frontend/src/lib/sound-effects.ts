import callEndUrl from "@/assets/sounds/call-end.wav";
import incomingRingUrl from "@/assets/sounds/incoming-ring.wav";
import outgoingRingUrl from "@/assets/sounds/outgoing-ring.wav";
import { Howl, Howler } from "howler";

const createHowl = (src: string, loop: boolean, volume = 0.7): Howl => {
  const sound = new Howl({
    src: [src],
    format: ["wav"],
    loop,
    volume,
    preload: true,
    html5: true,
    onplayerror: () => {
      sound.once("unlock", () => {
        sound.play();
      });
    },
  });
  return sound;
};

const outgoingRing = createHowl(outgoingRingUrl, true, 0.7);
const incomingRing = createHowl(incomingRingUrl, true, 0.8);
const callEnd = createHowl(callEndUrl, false, 0.7);

const ALL_SOUNDS: Howl[] = [outgoingRing, incomingRing, callEnd];

export const soundEffects = {
  /** Plays outgoing ring back tone (loops until stopAll/destroy). */
  playOutgoingRing(): void {
    incomingRing.stop();
    callEnd.stop();
    if (!outgoingRing.playing()) {
      outgoingRing.play();
    }
  },

  /** Plays incoming ringtone (loops until stopAll/destroy). */
  playIncomingRing(): void {
    outgoingRing.stop();
    callEnd.stop();
    if (!incomingRing.playing()) {
      incomingRing.play();
    }
  },

  /** Plays a short call-ended tone (does not loop). */
  playCallEndTone(): void {
    outgoingRing.stop();
    incomingRing.stop();
    callEnd.play();
  },

  /** Stops all playing sounds immediately. */
  stopAll(): void {
    ALL_SOUNDS.forEach((s) => s.stop());
    Howler.stop();
  },

  /** Stops and unloads all sounds (full cleanup on unmount). */
  destroy(): void {
    ALL_SOUNDS.forEach((s) => {
      s.stop();
      s.unload();
    });
  },
};

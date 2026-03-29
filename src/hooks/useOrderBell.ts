/**
 * useOrderBell
 * Plays a kitchen bell sound when a new order arrives.
 * - Mute state persists in localStorage so staff preference survives page reloads.
 * - Only plays when the tab is visible (avoids phantom sounds on backgrounded tabs).
 * - Gracefully handles browsers that require user interaction before audio playback.
 */
import { useRef, useEffect, useCallback, useState } from 'react';

const MUTE_KEY = 'order-bell-muted';

export function useOrderBell() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Lazily create the Audio element on first user interaction
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio('/sounds/order-bell.wav');
      audio.preload = 'auto';
      audio.volume = 0.8;
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  // Warm up the audio context on first user interaction (required by browsers)
  useEffect(() => {
    const unlock = () => {
      const audio = ensureAudio();
      // Play silently and immediately pause to unlock AudioContext
      audio.volume = 0;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0.8;
      }).catch(() => {});
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [ensureAudio]);

  const ring = useCallback(() => {
    if (muted) return;
    // Don't play if tab is hidden (another tab is handling it)
    if (document.visibilityState === 'hidden') return;
    try {
      const audio = ensureAudio();
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Browser blocked autoplay — user hasn't interacted yet, ignore silently
      });
    } catch {
      // ignore
    }
  }, [muted, ensureAudio]);

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  return { ring, muted, toggleMute };
}

import * as Speech from 'expo-speech';
import { useCallback, useEffect, useState } from 'react';

import { sanitizeForSpeech } from '@/utils/speech-text';

// The default voice expo-speech falls back to (especially on web) tends to sound
// flat and robotic. Picking the highest-quality, most natural-sounding available
// voice — and warming its pitch/rate slightly — makes read-aloud sound like an
// enthusiastic guide instead of a monotone screen reader.
const PREFERRED_NAME_HINTS = ['natural', 'online', 'neural', 'premium', 'enhanced', 'google', 'samantha', 'aria', 'jenny'];
const SPEECH_PITCH = 1.07;
const SPEECH_RATE = 1.02;

let cachedVoicePromise: Promise<string | undefined> | null = null;

function scoreVoice(voice: Speech.Voice): number {
  const name = voice.name?.toLowerCase() ?? '';
  let score = 0;
  if (voice.quality === Speech.VoiceQuality.Enhanced) score += 10;
  if (PREFERRED_NAME_HINTS.some((hint) => name.includes(hint))) score += 5;
  return score;
}

function pickBestVoice(): Promise<string | undefined> {
  if (!cachedVoicePromise) {
    cachedVoicePromise = Speech.getAvailableVoicesAsync()
      .then((voices) => {
        const english = voices.filter((voice) => voice.language?.toLowerCase().startsWith('en'));
        const pool = english.length > 0 ? english : voices;
        const best = [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
        return best?.identifier;
      })
      .catch(() => undefined);
  }
  return cachedVoicePromise;
}

export function useSpeakable() {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const toggle = useCallback(
    async (text: string) => {
      if (speaking) {
        Speech.stop();
        setSpeaking(false);
        return;
      }

      setSpeaking(true);
      const voice = await pickBestVoice();
      Speech.speak(sanitizeForSpeech(text), {
        voice,
        pitch: SPEECH_PITCH,
        rate: SPEECH_RATE,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    },
    [speaking]
  );

  return { speaking, toggle };
}

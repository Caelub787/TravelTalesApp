import * as Speech from 'expo-speech';
import { useCallback, useEffect, useState } from 'react';

export function useSpeakable() {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const toggle = useCallback(
    (text: string) => {
      if (speaking) {
        Speech.stop();
        setSpeaking(false);
        return;
      }
      setSpeaking(true);
      Speech.speak(text, {
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    },
    [speaking]
  );

  return { speaking, toggle };
}

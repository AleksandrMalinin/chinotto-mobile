import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import * as Brightness from 'expo-brightness';

import { nextSunlightTarget, readDeviceBrightness } from '../theme/adaptiveBrightness';

const POLL_MS = 2500;
/** Ignore rapid brightness samples while still reacting within ~0.5s. */
const SAMPLE_THROTTLE_MS = 400;
const BLEND_MS = 280;

export type AdaptiveChromeBlend = {
  /** 0 = normal (colorsDark), 1 = full sunlight palette. Eased over ~{@link BLEND_MS}ms. */
  blendProgress: number;
  /** `true` after the first brightness read completes (success or failure). */
  ready: boolean;
};

/**
 * Drives adaptive “sunlight” chrome from device brightness (hysteresis + throttling).
 * Falls back to normal chrome when the brightness API is unavailable.
 */
export function useAdaptiveChromeBlend(): AdaptiveChromeBlend {
  const [blendProgress, setBlendProgress] = useState(0);
  const [ready, setReady] = useState(false);

  const sunlightTargetRef = useRef(false);
  const blendRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const lastSampleProcessRef = useRef(0);

  const runBlendAnimation = (target: number) => {
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    const from = blendRef.current;
    if (Math.abs(from - target) < 1 / 256) {
      blendRef.current = target;
      setBlendProgress(target);
      return;
    }
    const start = Date.now();
    const tick = () => {
      const u = Math.min(1, (Date.now() - start) / BLEND_MS);
      const eased = 1 - (1 - u) * (1 - u);
      const v = from + (target - from) * eased;
      blendRef.current = v;
      setBlendProgress(v);
      if (u < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        animFrameRef.current = null;
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    let cancelled = false;
    let brightnessSub: { remove: () => void } | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let appSub: { remove: () => void } | undefined;

    const processLevel = (b: number | null, force: boolean) => {
      if (cancelled) {
        return;
      }
      const now = Date.now();
      if (!force && now - lastSampleProcessRef.current < SAMPLE_THROTTLE_MS) {
        return;
      }
      lastSampleProcessRef.current = now;

      if (b == null) {
        sunlightTargetRef.current = false;
      } else {
        sunlightTargetRef.current = nextSunlightTarget(sunlightTargetRef.current, b);
      }
      const target = sunlightTargetRef.current ? 1 : 0;
      runBlendAnimation(target);
    };

    const sample = async (force: boolean) => {
      const b = await readDeviceBrightness();
      if (cancelled) {
        return;
      }
      processLevel(b, force);
    };

    void (async () => {
      await sample(true);
      if (!cancelled) {
        setReady(true);
      }
    })();

    if (Platform.OS === 'ios') {
      try {
        brightnessSub = Brightness.addBrightnessListener(({ brightness }) => {
          processLevel(brightness, true);
        });
      } catch {
        /* listener optional */
      }
    }

    poll = setInterval(() => {
      void sample(false);
    }, POLL_MS);

    const onAppState = (s: AppStateStatus) => {
      if (s === 'active') {
        void sample(true);
      }
    };
    appSub = AppState.addEventListener('change', onAppState);

    return () => {
      cancelled = true;
      brightnessSub?.remove();
      if (poll != null) {
        clearInterval(poll);
      }
      appSub?.remove();
      if (animFrameRef.current != null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return { blendProgress, ready };
}

import type { ComponentType } from 'react';

import {
  CaptureGuideVisual,
  ContinueGuideVisual,
  EchoGuideVisual,
  SearchGuideVisual,
  SyncGuideVisual,
  ThreadGuideVisual,
  TimelineGuideVisual,
} from './GuideSlideVisuals';

export type GuideSlideDefinition = {
  key: string;
  title: string;
  lead: string;
  Visual: ComponentType<{ active: boolean }>;
};

export const GUIDE_SLIDES: GuideSlideDefinition[] = [
  {
    key: 'capture',
    title: 'Capture',
    lead: 'Type or speak — saved on device first.',
    Visual: CaptureGuideVisual,
  },
  {
    key: 'sync',
    title: 'Sync',
    lead: 'Tap Enable sync, sign in with Apple. Continue on desktop.',
    Visual: SyncGuideVisual,
  },
  {
    key: 'search',
    title: 'Search',
    lead: 'Pull down or tap the loupe beside the mic.',
    Visual: SearchGuideVisual,
  },
  {
    key: 'timeline',
    title: 'Timeline',
    lead: 'Long-press a day label, or scrub months on the right.',
    Visual: TimelineGuideVisual,
  },
  {
    key: 'thread',
    title: 'Thread',
    lead: 'The dot links thoughts by shared words.',
    Visual: ThreadGuideVisual,
  },
  {
    key: 'continue',
    title: 'Continue',
    lead: 'Tap Continue to keep writing full screen.',
    Visual: ContinueGuideVisual,
  },
  {
    key: 'echo',
    title: 'Echo',
    lead: 'A quiet thread back when it may connect.',
    Visual: EchoGuideVisual,
  },
];

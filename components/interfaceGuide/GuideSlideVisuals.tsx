import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { CaptureInput } from '../CaptureInput';
import { CaptureMicRail } from '../CaptureMicRail';
import { HomeDepthRecall } from '../HomeDepthRecall';
import { RecentList } from '../RecentList';
import { StreamSearchField } from '../StreamSearchField';
import { ThoughtThreadPanel } from '../ThoughtThreadPanel';
import { TemporalMonthRack } from '../temporal/TemporalMonthRack';
import { VoiceMicButton } from '../VoiceCaptureControl';
import { typography, useAppTheme } from '../../theme';
import {
  GUIDE_ECHO_CANDIDATE,
  GUIDE_ENTRY_CURRENT,
  GUIDE_ENTRY_EARLIER,
  GUIDE_ENTRY_LATER,
  GUIDE_MONTHS,
  GUIDE_STREAM_ROWS,
} from './guideFixtures';
import {
  GUIDE_COMPOSER_MAX_HEIGHT,
  GUIDE_COMPOSER_MIN_HEIGHT,
  GuideCaptureFrame,
} from './GuideCaptureFrame';
import { GuideSheetPreview } from './GuideSheetPreview';
import { resolveGuidePreviewDesignWidth } from './guidePreviewMetrics';

type VisualProps = {
  active: boolean;
};

const noop = () => {};

function GuideComposerEmpty() {
  const t = useAppTheme();

  return (
    <View style={styles.composerInputRow}>
      <View style={styles.composerInputWrap}>
        <CaptureInput
          value=""
          editable={false}
          autoFocus={false}
          showSoftInputOnFocus={false}
          minHeight={GUIDE_COMPOSER_MIN_HEIGHT}
          maxHeight={GUIDE_COMPOSER_MAX_HEIGHT}
          placeholder="Jot a thought…"
          onChangeText={noop}
          onSubmit={noop}
        />
      </View>
      <CaptureMicRail captureLineHeight={typography.captureHero.lineHeight}>
        <VoiceMicButton phase="idle" onPress={noop} theme={t} placement="inline" />
      </CaptureMicRail>
    </View>
  );
}

function GuideStreamList({
  trailEntryId,
  highlightSectionPress = false,
}: {
  trailEntryId?: string;
  highlightSectionPress?: boolean;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const layoutWidth = resolveGuidePreviewDesignWidth(windowWidth);
  const trailLinkedIds =
    trailEntryId != null ? new Set([trailEntryId]) : undefined;

  return (
    <RecentList
      entries={GUIDE_STREAM_ROWS}
      visible
      layoutWidth={layoutWidth}
      trailLinkedIds={trailLinkedIds}
      onSectionLabelLongPress={highlightSectionPress ? noop : undefined}
      streamViewportFocusEnabled={false}
    />
  );
}

export function CaptureGuideVisual({ active: _active }: VisualProps) {
  return (
    <GuideCaptureFrame composer={<GuideComposerEmpty />} testID="guide-visual-capture">
      <GuideStreamList />
    </GuideCaptureFrame>
  );
}

export function SyncGuideVisual({ active }: VisualProps) {
  return (
    <GuideCaptureFrame
      composer={<GuideComposerEmpty />}
      enableSyncHighlight={active}
      testID="guide-visual-sync"
    >
      <GuideStreamList />
    </GuideCaptureFrame>
  );
}

export function SearchGuideVisual({ active: _active }: VisualProps) {
  return (
    <GuideCaptureFrame
      testID="guide-visual-search"
      composer={
        <StreamSearchField
          glassSticky
          expanded
          focused={false}
          value=""
          onChangeText={noop}
          onFocus={noop}
          onBlur={noop}
          onPressExpand={noop}
          onPressClose={noop}
        />
      }
    >
      <GuideStreamList />
    </GuideCaptureFrame>
  );
}

export function TimelineGuideVisual({ active }: VisualProps) {
  return (
    <GuideCaptureFrame composer={<GuideComposerEmpty />} testID="guide-visual-timeline">
      <View style={styles.timelineHost}>
        <GuideStreamList highlightSectionPress={active} />
        <View style={styles.rackOverlay} pointerEvents="none">
          <TemporalMonthRack
            months={GUIDE_MONTHS}
            streamMonthKey="2026-06"
            visible
            rightInset={0}
            bottomInset={12}
            onMonthCommitted={noop}
            onActiveMonthPress={noop}
            hapticsEnabled={false}
          />
        </View>
      </View>
    </GuideCaptureFrame>
  );
}

export function ThreadGuideVisual({ active: _active }: VisualProps) {
  return (
    <GuideCaptureFrame
      testID="guide-visual-thread"
      dimmed
      composer={<GuideComposerEmpty />}
      overlay={
        <GuideSheetPreview entry={GUIDE_ENTRY_CURRENT}>
          <ThoughtThreadPanel
            current={GUIDE_ENTRY_CURRENT}
            earlier={[GUIDE_ENTRY_EARLIER]}
            later={[GUIDE_ENTRY_LATER]}
            onSelect={noop}
          />
        </GuideSheetPreview>
      }
    >
      <GuideStreamList trailEntryId={GUIDE_ENTRY_CURRENT.id} />
    </GuideCaptureFrame>
  );
}

export function ContinueGuideVisual({ active }: VisualProps) {
  return (
    <GuideCaptureFrame
      testID="guide-visual-continue"
      dimmed
      composer={<GuideComposerEmpty />}
      overlay={<GuideSheetPreview entry={GUIDE_ENTRY_CURRENT} highlightContinue={active} />}
    >
      <GuideStreamList />
    </GuideCaptureFrame>
  );
}

export function EchoGuideVisual({ active: _active }: VisualProps) {
  return (
    <GuideCaptureFrame
      testID="guide-visual-echo"
      composer={
        <>
          <View style={styles.composerInputRow}>
            <View style={styles.composerInputWrap}>
              <CaptureInput
                value="New thought…"
                editable={false}
                autoFocus={false}
                showSoftInputOnFocus={false}
                minHeight={GUIDE_COMPOSER_MIN_HEIGHT}
                maxHeight={GUIDE_COMPOSER_MAX_HEIGHT}
                placeholder="Jot a thought…"
                onChangeText={noop}
                onSubmit={noop}
              />
            </View>
          </View>
          <HomeDepthRecall candidate={GUIDE_ECHO_CANDIDATE} />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  composerInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  composerInputWrap: {
    flex: 1,
    minWidth: 0,
  },
  timelineHost: {
    flex: 1,
    flexDirection: 'row',
  },
  rackOverlay: {
    position: 'absolute',
    right: 0,
    top: 24,
    bottom: 12,
    width: 58,
    overflow: 'hidden',
  },
});

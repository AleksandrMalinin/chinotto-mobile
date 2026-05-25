import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts, screenContentInnerPad, useAppTheme } from '../../theme';
import {
  ECHO_FIELD_NODE_WIDTH,
  echoFieldSpanPx,
  layoutEchoFieldNodes,
  type EchoFieldNode,
} from '../../utils/echoFieldLayout';
import type { EchoCandidate } from '../../utils/selectEchoCandidates';
import type { EchoChromeColors } from './echoChrome';
import { echoAccentForKind, echoFragmentBorderForKind } from './echoChrome';
import { ECHO_FRAGMENT_RADIUS, echoFragmentChrome } from './echoVesselChrome';

export type EchoFieldVesselProps = {
  candidates: readonly EchoCandidate[];
  chrome: EchoChromeColors;
  onEntryPress?: (entry: EchoCandidate) => void;
};

const NODE_MIN_HEIGHT = 56;

/**
 * Direction D — spatial constellation around center; tap to focus, tap again to open.
 */
export function EchoFieldVessel({
  candidates,
  chrome,
  onEntryPress,
}: EchoFieldVesselProps) {
  const t = useAppTheme();
  const fragment = useMemo(() => echoFragmentChrome(t, chrome), [t, chrome]);
  const nodes = useMemo(() => layoutEchoFieldNodes(candidates), [candidates]);
  const primaryId = nodes[0]?.id ?? null;
  const [viewport, setViewport] = useState({ w: 0, h: 280 });
  const [focusedId, setFocusedId] = useState<string | null>(primaryId);

  useEffect(() => {
    setFocusedId(primaryId);
  }, [primaryId]);

  const resolvedFocusId = focusedId ?? primaryId;
  const span = echoFieldSpanPx(viewport.w, viewport.h);
  const cx = viewport.w / 2;
  const cy = viewport.h / 2;

  const onViewportLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0) {
      return;
    }
    setViewport((prev) =>
      prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  }, []);

  const onNodePress = useCallback(
    (node: EchoFieldNode) => {
      if (resolvedFocusId === node.id) {
        onEntryPress?.(node);
        return;
      }
      setFocusedId(node.id);
    },
    [onEntryPress, resolvedFocusId],
  );

  if (nodes.length === 0) {
    return null;
  }

  return (
    <View style={styles.shell} testID="echo-field-vessel">
      <View
        testID="echo-field-viewport"
        style={styles.viewport}
        onLayout={onViewportLayout}
        accessibilityLabel="Continuity field"
        accessibilityHint="Tap a thought to focus it. Tap again to read full text."
      >
        {viewport.w > 0
          ? nodes.map((node) => (
              <EchoFieldNodeView
                key={node.id}
                node={node}
                chrome={chrome}
                fragment={fragment}
                left={cx + node.ox * span - ECHO_FIELD_NODE_WIDTH / 2}
                top={cy + node.oy * span - NODE_MIN_HEIGHT / 2}
                focused={resolvedFocusId === node.id}
                onPress={() => onNodePress(node)}
              />
            ))
          : null}
      </View>
    </View>
  );
}

type EchoFieldNodeViewProps = {
  node: EchoFieldNode;
  chrome: EchoChromeColors;
  fragment: ReturnType<typeof echoFragmentChrome>;
  left: number;
  top: number;
  focused: boolean;
  onPress: () => void;
};

function EchoFieldNodeView({
  node,
  chrome,
  fragment,
  left,
  top,
  focused,
  onPress,
}: EchoFieldNodeViewProps) {
  const accent = echoAccentForKind(chrome, node.kind);
  const borderColor = echoFragmentBorderForKind(chrome, node.kind);
  const scale = 0.9 + node.mass * 0.1;

  return (
    <Pressable
      testID={`echo-field-node-${node.id}`}
      onPress={onPress}
      style={[
        styles.nodeHit,
        {
          left,
          top,
          opacity: focused ? 1 : 0.55 + node.mass * 0.2,
          transform: [{ scale: focused ? scale + 0.05 : scale }],
          zIndex: focused ? 2 : 1,
        },
      ]}
      accessibilityLabel={node.text}
      accessibilityHint={
        focused ? 'Opens full text.' : 'Brings this thought to the center.'
      }
      accessibilityState={{ selected: focused }}
      {...(Platform.OS === 'android' ? { android_ripple: null } : {})}
    >
      <View
        style={[
          styles.node,
          {
            backgroundColor: fragment.fill,
            borderColor,
          },
          focused && styles.nodeFocused,
        ]}
      >
        <View style={[styles.nodeDot, { backgroundColor: accent }]} />
        <Text
          style={[
            styles.nodeText,
            {
              color:
                node.kind === 'gravity'
                  ? chrome.fragmentBodyGravity
                  : chrome.fragmentBodyDrift,
            },
          ]}
          numberOfLines={focused ? 4 : 2}
          ellipsizeMode="tail"
        >
          {node.text}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    flexGrow: 1,
    justifyContent: 'center',
  },
  viewport: {
    width: '100%',
    minHeight: 300,
    position: 'relative',
    overflow: 'visible',
  },
  nodeHit: {
    position: 'absolute',
    width: ECHO_FIELD_NODE_WIDTH,
    minHeight: NODE_MIN_HEIGHT,
  },
  node: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: screenContentInnerPad,
    borderRadius: ECHO_FRAGMENT_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nodeFocused: {
    borderWidth: 1,
  },
  nodeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 5,
    opacity: 0.6,
  },
  nodeText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
});

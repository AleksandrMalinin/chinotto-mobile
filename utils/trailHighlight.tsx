import { Text, type TextProps } from 'react-native';

import { fonts, useAppTheme } from '../theme';

type Props = {
  text: string;
  terms: readonly string[];
  style?: TextProps['style'];
};

/** Highlight shared trail keywords in preview text for React Native. */
export function TrailHighlightedText({ text, terms, style }: Props) {
  const t = useAppTheme();
  if (terms.length === 0) {
    return <Text style={style}>{text}</Text>;
  }

  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const lower = text.toLowerCase();
  const parts: Array<{ value: string; highlight: boolean }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    let matched: { start: number; end: number; term: string } | null = null;
    for (const term of sorted) {
      const idx = lower.indexOf(term.toLowerCase(), cursor);
      if (idx < 0) {
        continue;
      }
      const end = idx + term.length;
      const before = idx === 0 ? '' : text[idx - 1] ?? '';
      const after = text[end] ?? '';
      const boundaryBefore = !before || !/[\p{L}\p{N}]/u.test(before);
      const boundaryAfter = !after || !/[\p{L}\p{N}]/u.test(after);
      if (!boundaryBefore || !boundaryAfter) {
        continue;
      }
      if (!matched || idx < matched.start) {
        matched = { start: idx, end, term: text.slice(idx, end) };
      }
    }
    if (!matched) {
      parts.push({ value: text.slice(cursor), highlight: false });
      break;
    }
    if (matched.start > cursor) {
      parts.push({ value: text.slice(cursor, matched.start), highlight: false });
    }
    parts.push({ value: matched.term, highlight: true });
    cursor = matched.end;
  }

  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.highlight ? (
          <Text
            key={`${i}-${part.value}`}
            style={{
              color: 'rgba(34, 200, 220, 0.88)',
              fontFamily: fonts.medium,
            }}
          >
            {part.value}
          </Text>
        ) : (
          <Text key={`${i}-${part.value}`}>{part.value}</Text>
        ),
      )}
    </Text>
  );
}

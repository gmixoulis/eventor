import { FontAwesome5 } from '@expo/vector-icons';
import { useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import {
  AXIS_HEIGHT,
  LEFT_COL_WIDTH,
  PX_PER_SLOT,
  SLOT_MINUTES,
  computeRange,
  positionSession,
  stageColor,
} from '@/components/schedule/math';
import { makeStyles, useTheme } from '@/components/theme';
import { spacing, typeScale } from '@/constants/theme';
import { getSpeaker, listStages } from '@/data';
import type { Session, Stage } from '@/data/types';
import { formatTime, minutesToTime, toMinutes } from '@/lib/format';

type Props = {
  sessions: Session[];
  mySessionIds: string[];
  compact: boolean;
  use24h: boolean;
  onPressSession: (id: string) => void;
  onOpenSideEvent: (url: string) => void;
};

export function Timeline({
  sessions,
  mySessionIds,
  compact,
  use24h,
  onPressSession,
  onOpenSideEvent,
}: Props) {
  const styles = useStyles();
  const axisScroll = useRef<ScrollViewInstance>(null);
  const range = computeRange(sessions);
  if (!range) return null;

  const rowH = compact ? 56 : 84;
  const stages = listStages()
    .slice()
    .sort((a, b) => a.order - b.order);

  const byStage = new Map<string, Session[]>();
  for (const s of sessions) {
    const list = byStage.get(s.stageId) ?? [];
    list.push(s);
    byStage.set(s.stageId, list);
  }
  for (const list of byStage.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));

  const visibleStages = stages.filter((st) => byStage.has(st.id));

  const slots = Math.max(
    1,
    Math.round((toMinutes(range.end) - toMinutes(range.start)) / SLOT_MINUTES),
  );
  const contentWidth = slots * PX_PER_SLOT + PX_PER_SLOT;

  const first = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  const firstLeft = first ? positionSession(first.startTime, first.endTime, range.start).left : 0;

  const onBodyScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    axisScroll.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
  };

  const ticks = Array.from({ length: slots + 1 }, (_, i) =>
    minutesToTime(toMinutes(range.start) + i * SLOT_MINUTES),
  );

  return (
    <View style={styles.container}>
      <View style={styles.axisRow}>
        <View style={styles.axisCorner} />
        <ScrollView
          horizontal
          scrollEnabled={false}
          ref={axisScroll}
          style={styles.fill}
          contentOffset={{ x: firstLeft, y: 0 }}
          showsHorizontalScrollIndicator={false}>
          <View style={[styles.axisContent, { width: contentWidth }]}>
            {ticks.map((t, i) => (
              <Text key={t} style={[styles.axisLabel, { left: i * PX_PER_SLOT }]}>
                {formatTime(t, use24h)}
              </Text>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.bodyRow}>
          <View style={styles.leftCol}>
            {visibleStages.map((st) => {
              const sideUrl = byStage.get(st.id)?.[0]?.url;
              return (
                <View key={st.id} style={[styles.stageCell, { height: rowH }]}>
                  <Text style={styles.stageName} numberOfLines={3}>
                    {st.name}
                  </Text>
                  {sideUrl ? (
                    <Text style={styles.moreInfo} onPress={() => onOpenSideEvent(sideUrl)}>
                      More info
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>

          <ScrollView
            horizontal
            style={styles.fill}
            contentOffset={{ x: firstLeft, y: 0 }}
            onScroll={onBodyScroll}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}>
            <View style={{ width: contentWidth }}>
              {visibleStages.map((st) => (
                <StageRow
                  key={st.id}
                  stage={st}
                  sessions={byStage.get(st.id)!}
                  rowH={rowH}
                  slots={slots}
                  rangeStart={range.start}
                  use24h={use24h}
                  mySessionIds={mySessionIds}
                  onPressSession={onPressSession}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

type StageRowProps = {
  stage: Stage;
  sessions: Session[];
  rowH: number;
  slots: number;
  rangeStart: string;
  use24h: boolean;
  mySessionIds: string[];
  onPressSession: (id: string) => void;
};

function StageRow({
  stage,
  sessions,
  rowH,
  slots,
  rangeStart,
  use24h,
  mySessionIds,
  onPressSession,
}: StageRowProps) {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const color = stageColor(stage.order, scheme);
  return (
    <View style={[styles.stageRow, { height: rowH }]}>
      {Array.from({ length: slots }, (_, i) => i + 1).map((i) => (
        <View key={i} style={[styles.gridline, { left: i * PX_PER_SLOT }]} />
      ))}
      {sessions.map((s) => {
        const pos = positionSession(s.startTime, s.endTime, rangeStart);
        const speakerNames = s.speakerIds
          .map((id) => getSpeaker(id)?.name)
          .filter(Boolean)
          .join(', ');
        return (
          <Pressable
            key={s.id}
            onPress={() => onPressSession(s.id)}
            style={[
              styles.card,
              {
                left: pos.left,
                width: pos.width,
                height: rowH - 8,
                backgroundColor: color.bg,
                borderColor: color.border,
              },
            ]}>
            {mySessionIds.includes(s.id) ? (
              <FontAwesome5 name="star" solid size={10} color={colors.text} style={styles.star} />
            ) : null}
            <Text style={styles.cardTitle} numberOfLines={2}>
              {s.title}
            </Text>
            <Text style={styles.cardTime} numberOfLines={1}>
              {formatTime(s.startTime, use24h)} - {formatTime(s.endTime, use24h)}
            </Text>
            {speakerNames ? (
              <Text style={styles.cardTime} numberOfLines={2}>
                {speakerNames}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  axisRow: {
    flexDirection: 'row',
    height: AXIS_HEIGHT,
    backgroundColor: colors.bg,
  },
  fill: {
    flex: 1,
  },
  axisCorner: {
    width: LEFT_COL_WIDTH,
    height: AXIS_HEIGHT,
    backgroundColor: colors.card,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  axisContent: {
    flexDirection: 'row',
  },
  axisLabel: {
    position: 'absolute',
    top: 8,
    ...typeScale.caption,
    color: colors.textMuted,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyRow: {
    flexDirection: 'row',
  },
  leftCol: {
    width: LEFT_COL_WIDTH,
    backgroundColor: colors.card,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  stageCell: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  stageName: {
    ...typeScale.caption,
    color: colors.text,
  },
  moreInfo: {
    ...typeScale.caption,
    color: colors.primary,
    marginTop: 2,
  },
  stageRow: {
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  gridline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  card: {
    position: 'absolute',
    top: 4,
    borderRadius: 4,
    borderWidth: 1,
    padding: 4,
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  cardTitle: {
    ...typeScale.label,
    fontSize: 11,
    lineHeight: 14,
    color: colors.text,
  },
  cardTime: {
    ...typeScale.caption,
    fontSize: 9,
    lineHeight: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
}));

import { getEvent } from '@/data';
import { agenda, entities, lookupResponse, scheduleFact, type Entity } from '@/assistant/catalog';
import { EVENT_WEEKDAYS, eventDayIn, namesEventThing, normalize, normalizeIntent, onlyEventWords } from '@/assistant/scope';
import { byStart, eventTomorrow, itemEndMs, itemStartMs, withoutAllDay, type AgendaItem } from '@/lib/agenda-item';
import type { AskResponse } from '@/lib/assistant-contract';
import { eventWallClock, wallTimeMs } from '@/lib/event-clock';
import { formatFullDay, formatTime } from '@/lib/format';
import { phaseOf } from '@/lib/live-status';
import { upNext } from '@/lib/up-next';

const DAY_WORDS = new RegExp(`\\b(today|tomorrow|tonight|morning|afternoon|evening|whole day|day \\d+|${EVENT_WEEKDAYS.join('|')})\\b`);
const DAY_PARTS: Record<string, [string, string]> = {
  morning: ['00:00', '12:00'], afternoon: ['12:00', '18:00'], evening: ['18:00', '24:00'], tonight: ['18:00', '24:00'],
};
const SCHEDULE_WORDS = /\b(schedule|programme|program|agenda|lineup)\b/;
const items = [...agenda].sort(byStart);
// All-day placeholder blocks are not things that are on now or next, nor a day's first start; whole-day lists keep them.
const timed = withoutAllDay(items);

/** What a calendar question asks, read from the question with the matched names taken out. */
type Ask = {
  question: string; q: string; now: Date; matched: Entity[];
  starts: boolean; ends: boolean; ended: boolean; time: boolean; speakers: boolean; festivalDay: boolean;
};
type Found = { answer: string; used: Entity[] };

function inDayPart(item: AgendaItem, q: string): boolean {
  const part = DAY_PARTS[/\b(morning|afternoon|evening|tonight)\b/.exec(q)?.[1] ?? ''];
  return !part || (item.startTime < part[1] && item.endTime > part[0]);
}

function forItems(selected: AgendaItem[]): Entity[] {
  return entities.filter((e) => e.agenda && selected.includes(e.agenda));
}

export function clampTime(time: Date): { now: Date; clause: string } {
  const ms = time.getTime();
  const ranges = getEvent().days.map((day) => ({ start: wallTimeMs(`${day}T00:00`), end: wallTimeMs(`${day}T23:59`) + 59999 }));
  if (Number.isFinite(ms) && ranges.some((r) => ms >= r.start && ms <= r.end)) return { now: time, clause: '' };
  const edges = ranges.flatMap((range) => [range.start, range.end]);
  const closest = edges.reduce((best, edge) => Math.abs(edge - ms) < Math.abs(best - ms) ? edge : best);
  const now = new Date(closest);
  return { now, clause: `Using the nearest event moment (${formatFullDay(eventWallClock(now).day)}). ` };
}

export function questionDay(question: string, now: Date): string | undefined {
  const q = normalizeIntent(question);
  const days = getEvent().days;
  const numbered = /\bday (\d+)\b/.exec(q);
  if (numbered) return days[Number(numbered[1]) - 1];
  const named = eventDayIn(question) ?? days.find((_, i) => new RegExp(`\\b${EVENT_WEEKDAYS[i]}\\b`).test(q));
  if (named) return named;
  return /\btomorrow\b/.test(q) ? eventTomorrow(now) : eventWallClock(now).day;
}

/** True when the question names a day: an event date, a weekday, today, tomorrow, "day 2", "tonight" and the like. */
export function namesDay(question: string): boolean {
  return eventDayIn(question) !== undefined || DAY_WORDS.test(normalizeIntent(question));
}

function endedFacts(target: Entity, item: AgendaItem, now: Date): Found {
  const phase = phaseOf(item, now.getTime());
  const status = phase === 'ended' ? 'has ended' : phase === 'live' ? 'has not ended yet' : 'has not started yet';
  return { answer: `- ${scheduleFact(item)} (${status})`, used: [target] };
}

function afterFacts(target: Entity, item: AgendaItem, now: Date): Found {
  const end = itemEndMs(item);
  const next = upNext(items.filter((other) => itemStartMs(other) >= end), new Date(end - 1)).next;
  const ongoing = phaseOf(item, now.getTime()) === 'live' ? `- ${scheduleFact(item)} (has not ended yet)\n` : '';
  const after = next ? `${ongoing ? 'After that' : `After **${target.source.title}**`}:\n- ${scheduleFact(next)}` : `No scheduled item follows ${target.source.title}.`;
  return { answer: ongoing + after, used: [target, ...forItems(next ? [next] : [])] };
}

function speakersFacts({ question, q, now, matched }: Ask): Found {
  const named = withoutAllDay(matched.flatMap((e) => e.agenda?.kind === 'session' ? [e.agenda] : []));
  const sessions = named.length ? named : timed.filter((item) => item.kind === 'session');
  const live = sessions.filter((item) => phaseOf(item, now.getTime()) === 'live');
  const following = upNext(sessions, now).next;
  const nowAsked = /\bnow\b/.test(q);
  const chosen = nowAsked && live.length ? live
    : /\b(now|next)\b/.test(q) ? (following ? [following] : [])
    : sessions.filter((item) => item.day === questionDay(question, now) && inDayPart(item, q));
  const lines = chosen.map((item) => {
    const names = entities.find((e) => e.agenda === item)?.speakers?.join(', ');
    return `- ${scheduleFact(item)}${names ? `. Speakers: ${names}.` : ''}`;
  });
  const lead = nowAsked && !live.length ? `No session is on now.${lines.length ? '\nNext:\n' : ''}` : '';
  return { answer: lead + (lines.join('\n') || 'No session with speakers is scheduled for that time.'), used: forItems(chosen) };
}

function festivalDayFacts({ question, q, now, starts, ends }: Ask): Found {
  const days = getEvent().days;
  const dayItems = timed.filter((item) => item.day === questionDay(question, now));
  const first = dayItems[0];
  const last = dayItems.reduce<AgendaItem | undefined>(
    (latest, item) => !latest || item.endTime > latest.endTime ? item : latest, undefined);
  const lines = [
    ...(DAY_WORDS.test(q) ? [] : [`${getEvent().name} runs from ${formatFullDay(days[0])} to ${formatFullDay(days[days.length - 1])}.`]),
    ...(starts && first ? [`On ${formatFullDay(first.day)} the first scheduled item starts at ${formatTime(first.startTime, true)}.` +
      `\n- ${scheduleFact(first)}`] : []),
    ...(ends && last ? [`On ${formatFullDay(last.day)} the last scheduled item ends at ${formatTime(last.endTime, true)}.` +
      `\n- ${scheduleFact(last)}`] : []),
    ...((starts || ends) && !dayItems.length ? ['There is no festival schedule for that day.'] : []),
  ];
  return { answer: lines.join('\n'), used: forItems(dayItems.filter((item) => item === first || item === last)) };
}

function dayScheduleFacts({ question, q, now }: Ask): Found {
  const day = questionDay(question, now);
  const sideOnly = /\bside events?\b/.test(q);
  const selected = items.filter((item) => item.day === day && inDayPart(item, q) && (!sideOnly || item.kind === 'side-event'));
  const answer = selected.length ? selected.map((item) => `- ${scheduleFact(item)}`).join('\n') : 'There is no festival schedule for that day.';
  return { answer, used: forItems(selected) };
}

function nowNextFacts({ q, now }: Ask): Found {
  const { current, next } = upNext(timed, now);
  if (/\bnext\b/.test(q)) {
    const ongoing = current ? `- ${scheduleFact(current)} (has not ended yet)\n` : '';
    const upcoming = next ? `Next:\n- ${scheduleFact(next)}` : 'No more scheduled items are coming up.';
    return { answer: ongoing + upcoming, used: forItems([current, next].filter((item) => item !== null)) };
  }
  const live = timed.filter((item) => phaseOf(item, now.getTime()) === 'live');
  if (live.length) {
    return { answer: live.map((item) => `- ${scheduleFact(item)} (has not ended yet)`).join('\n'), used: forItems(live) };
  }
  return { answer: `Nothing is on now.${next ? `\nNext:\n- ${scheduleFact(next)}` : ''}`, used: forItems(next ? [next] : []) };
}

function calendarFacts(ask: Ask): Found | null {
  const { q, now, matched } = ask;
  const current = upNext(timed, now).current;
  const target = matched.find((e) => e.agenda) ?? (ask.ended ? entities.find((e) => e.agenda === current) : undefined);
  const item = target?.agenda;
  if (target && item && ask.ended) return endedFacts(target, item, now);
  if (target && item && /\bafter\b/.test(q)) return afterFacts(target, item, now);
  if (target && item && ask.time) return { answer: `- ${scheduleFact(item)}`, used: [target] };
  if (ask.speakers) return speakersFacts(ask);
  if (ask.festivalDay) return festivalDayFacts(ask);
  if (DAY_WORDS.test(q) || SCHEDULE_WORDS.test(q)) return dayScheduleFacts(ask);
  if (ask.ended) return { answer: 'No scheduled time was provided for that request.', used: matched };
  // A "when" about something without a schedule entry (a speaker, "the closing party") is left to retrieval.
  if (/\bwhen\b/.test(q) && !/\b(now|next)\b/.test(q)) return null;
  return nowNextFacts(ask);
}

export function calendarAnswer(question: string, eventTime: Date, matched: Entity[]): AskResponse | null {
  // Names are taken out first, so a title such as "Side Events Thursday" does not read as a day word.
  const withoutNames = matched.reduce((text, entity) =>
    entity.aliases.reduce((value, alias) => value.replace(normalize(alias), ''), text), normalize(question));
  const q = normalizeIntent(withoutNames);
  const starts = /\b(starts?|begins?|opens?)\b/.test(q);
  const ends = /\b(ends?|finish(?:es)?|closes?)\b/.test(q);
  const ended = /\b(over|ended)\b/.test(q);
  const time = matched.some((e) => e.agenda) && (starts || ends || /\b(when|time)\b/.test(q));
  const speakers = /\b(speak(?:s|ing|ers?)?|presenting)\b/.test(q) && (/\b(now|next)\b/.test(q) || DAY_WORDS.test(q));
  // "What time does the festival start tomorrow", "when is the festival": the festival or a day, no named item.
  const festivalDay = matched.every((e) => e.source.id === 'main-venue') && !namesEventThing(q) && onlyEventWords(q) &&
    (starts || ends || (/\bwhen\b/.test(q) && !DAY_WORDS.test(q)));
  const asksCalendar = time || speakers || festivalDay || ended || DAY_WORDS.test(q) || SCHEDULE_WORDS.test(q) ||
    /\b(now|next|after|when)\b/.test(q);
  if (!asksCalendar) return null;
  const { now, clause } = clampTime(eventTime);
  const found = calendarFacts({ question, q, now, matched, starts, ends, ended, time, speakers, festivalDay });
  return found && lookupResponse(found.answer, found.used, clause);
}

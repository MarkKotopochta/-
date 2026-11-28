import { createEmptyCard, fsrs, Rating, State } from './vendor/ts-fsrs-5.4.2.mjs';

export const dailyCardLimit = 10;
export const cardRatings = {
  learning: Rating.Again,
  review: Rating.Hard,
  known: Rating.Good,
};
const scheduler = fsrs({
  request_retention: 0.9,
  learning_steps: ['1m'],
  relearning_steps: ['1m'],
  enable_fuzz: false,
});
const legacyIntervals = { learning: 1, review: 2, known: 4 };
const isLearning = card => card.state === State.Learning || card.state === State.Relearning;

function startOfDay(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function chooseDailyCards(decks, marks, previousDates, cards, now) {
  const pool = [...new Set(decks.flat())];
  const today = +startOfDay(now);
  const reviews = [];
  const unseen = [];
  for (const id of pool) {
    const card = cards[id];
    const legacyDate = previousDates[id];
    if (card) {
      const due = +new Date(card.due);
      if (isLearning(card) ? due <= +now : +startOfDay(due) <= today) reviews.push({ id, due });
    } else if (legacyDate || marks.has(id)) {
      const due = legacyDate ? +new Date(legacyDate + 'T00:00:00') : today;
      if (due <= today) reviews.push({ id, due });
    } else {
      unseen.push(id);
    }
  }
  reviews.sort((a, b) => a.due - b.due);
  return [...reviews.map(review => review.id), ...unseen].slice(0, dailyCardLimit);
}

function previousCard(card, mark, legacyDate, now) {
  if (card) return card;
  if (!legacyDate || !Object.hasOwn(cardRatings, mark)) return createEmptyCard(now);
  const due = new Date(legacyDate + 'T00:00:00');
  if (!Number.isFinite(+due)) return createEmptyCard(now);
  // The old site stored only the next date and the latest grade.
  const last = new Date(due);
  last.setDate(last.getDate() - legacyIntervals[mark]);
  if (last > now) return createEmptyCard(now);
  return { ...scheduler.next(createEmptyCard(last), last, cardRatings[mark]).card, due };
}

export function planCardReview(card, mark, legacyDate, rating, now, shortReviews) {
  const scheduled = scheduler.next(previousCard(card, mark, legacyDate, now), now, cardRatings[rating]).card;
  if (!isLearning(scheduled) || scheduled.scheduled_days > 0) {
    return { card: scheduled, days: scheduled.scheduled_days };
  }
  if (shortReviews < 2) return { card: scheduled, repeat: true };
  const tomorrow = startOfDay(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { card: { ...scheduled, due: tomorrow }, days: 1 };
}

export function addSessionRepeat(queue, index, rating) {
  const { id } = queue[index];
  const intervening = rating === 'review' ? 6 : 3;
  queue.splice(Math.min(index + intervening + 1, queue.length), 0, { id, repeat: true });
}

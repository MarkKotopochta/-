export const dailyCardLimit = 10;
export const reviewIntervals = { learning: 1, review: 2, known: 4 };

export function chooseDailyCards(decks, marks, reviewDates, today) {
  const pool = [...new Set(decks.flatMap(deck => deck))];
  const due = pool.filter(id => reviewDates[id] ? reviewDates[id] <= today : marks.has(id))
    .sort((a, b) => (reviewDates[a] ?? today).localeCompare(reviewDates[b] ?? today));
  const unseen = pool.filter(id => !reviewDates[id] && !marks.has(id));
  const repeat = due.slice(0, unseen.length ? 4 : dailyCardLimit);
  return [...repeat, ...unseen.slice(0, dailyCardLimit - repeat.length),
    ...due.slice(repeat.length)].slice(0, dailyCardLimit);
}

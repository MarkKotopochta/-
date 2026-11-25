export const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function studyDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function dateKey(date, offset = 0) {
  const shifted = new Date(date);
  shifted.setUTCDate(date.getUTCDate() + offset);
  return shifted.toISOString().slice(0, 10);
}

export function currentStreak(days, today) {
  const start = days.has(dateKey(today)) ? 0 : -1;
  let streak = 0;
  while (days.has(dateKey(today, start - streak))) streak++;
  return streak;
}

function longestStreak(days, today) {
  const todayKey = dateKey(today);
  const dates = [...days].filter(key => key <= todayKey).sort();
  let previous;
  let consecutive = 0;
  let best = 0;
  for (const key of dates) {
    const day = Date.parse(key);
    consecutive = day - previous === 86_400_000 ? consecutive + 1 : 1;
    best = Math.max(best, consecutive);
    previous = day;
  }
  return best;
}

const ranks = [
  [0, 'Ученик почты'],
  [50, 'Сборщик писем'],
  [125, 'Сортировщик марок'],
  [225, 'Младший почтальон'],
  [350, 'Почтальон квартала'],
  [500, 'Курьер на велосипеде'],
  [700, 'Почтальон города'],
  [950, 'Курьер экспресса'],
  [1250, 'Старший почтальон'],
  [1600, 'Хранитель маршрутов'],
  [2000, 'Почтальон авиапочты'],
  [2450, 'Почтовый мастер'],
  [2950, 'Почтальон-путешественник'],
  [3500, 'Посланник между городами'],
  [4100, 'Начальник отделения'],
  [4750, 'Хранитель почтовых архивов'],
  [5450, 'Инспектор авиапочты'],
  [6200, 'Посол Котопочты'],
  [7000, 'Главный почтмейстер'],
  [7850, 'Легенда Котопочты'],
];

export function profileProgress({ mastered, lessons, texts, studyDays, practicedSets }, today) {
  const xp = mastered * 10 + lessons * 50 + texts * 25 + studyDays.size * 5;
  const level = ranks.findLastIndex(([threshold]) => xp >= threshold) + 1;
  const best = longestStreak(studyDays, today);
  const achievements = [
    ['first-step-mark', 'Первый шаг', 'Позаниматься хотя бы один раз', best >= 1 || mastered > 0 || lessons > 0 || texts > 0],
    ['talkative-bao', 'Разговорчивый', 'Завершить 10 диалогов или рассказов', texts >= 10],
    ['days-7-mark', '7 дней', 'Заниматься 7 дней подряд', best >= 7],
    ['words-50-fluff', '50 слов', 'Выучить 50 разных слов', mastered >= 50],
    ['words-100-mark', '100 слов', 'Выучить 100 разных слов', mastered >= 100],
    ['traveller-bao', 'Путешественник', 'Выучить хотя бы одно слово из каждого из трёх наборов', practicedSets >= 3],
    ['days-14-bao', '14 дней', 'Заниматься 14 дней подряд', best >= 14],
    ['days-30-fluff', '30 дней', 'Заниматься 30 дней подряд', best >= 30],
    ['days-100-mark', '100 дней', 'Заниматься 100 дней подряд', best >= 100],
  ];
  return { xp, level, title: ranks[level - 1][1], streak: currentStreak(studyDays, today), achievements };
}

const monthName = new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('ru', { dateStyle: 'long', timeZone: 'UTC' });

export function studyMonth(today, offset, studyDays) {
  const month = new Date(today);
  month.setUTCDate(1);
  month.setUTCMonth(month.getUTCMonth() + offset);
  const next = new Date(month);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const todayKey = dateKey(today);
  const leading = (month.getUTCDay() + 6) % 7;
  const days = Array(leading).fill(null);
  for (const day = new Date(month); day < next; day.setUTCDate(day.getUTCDate() + 1)) {
    const key = dateKey(day);
    days.push({
      key, label: fullDate.format(day), number: day.getUTCDate(), today: key === todayKey,
      state: studyDays.has(key) ? 'studied' : key < todayKey ? 'missed' : key === todayKey ? 'today' : 'future',
    });
  }
  while (days.length % 7) days.push(null);
  return { label: monthName.format(month), days };
}

import { words } from './food.mjs?v=5';
import { sets } from './catalog.mjs?v=8';
import { assembleDialogue, assembleStory, dialogueLengths, dialogueVocabulary } from './dialogues.mjs?v=3';
import { currentStreak, dateKey, profileProgress, studyDate, studyMonth, weekdayLabels } from './profile.mjs';

const byId = id => document.getElementById(id);
const storageKey = 'kotopochta-chinese-food';
const progressKey = 'kotopochta-study-v1';
const claimedSetsKey = 'kotopochta-claimed-sets';
const activityKey = 'kotopochta-study-days';
const masteredWordsKey = 'kotopochta-mastered-words';
const profileNameKey = 'kotopochta-profile-name';
const promotionEndsAt = Date.parse('2027-02-01T00:00:00+03:00');
const promotionMessage = 'До 1 февраля 2027 года любой набор можно открыть бесплатно. Нажми на карточку нужного набора.';
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* Keep this session usable when browser storage is unavailable. */ }
}
const savedProgress = load(progressKey, {});
const chosen = new Set(Array.isArray(savedProgress.sets)
  ? savedProgress.sets.filter(id => Object.hasOwn(sets, id))
  : []);
const savedClaims = load(claimedSetsKey, []);
const claimedSets = new Set(Array.isArray(savedClaims) ? savedClaims : []);
const promotionActive = () => Date.now() < promotionEndsAt;
const hasSetAccess = id => chosen.has(id) || (promotionActive() && claimedSets.has(id));
let lessons = Number.isSafeInteger(savedProgress.lessons) ? Math.max(0, savedProgress.lessons) : 0;
let texts = Number.isSafeInteger(savedProgress.texts) ? Math.max(0, savedProgress.texts) : 0;
const saveProgress = () => save(progressKey, { sets: [...chosen], lessons, texts });
const savedDays = load(activityKey, []);
const studyDays = new Set(Array.isArray(savedDays) ? savedDays.filter(day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)) : []);
const marks = new Map();
function storedMasteredWords() {
  const saved = load(masteredWordsKey, []);
  return Array.isArray(saved) ? saved.filter(id => Object.hasOwn(words, id)) : [];
}
const masteredWords = new Set(storedMasteredWords());
function setTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  byId('theme').setAttribute('aria-pressed', dark);
  const label = dark ? 'Светлая тема' : 'Тёмная тема';
  byId('theme').textContent = label;
  byId('theme').setAttribute('aria-label', label);
}
setTheme(load('kotopochta-dark', matchMedia('(prefers-color-scheme: dark)').matches));
byId('theme').onclick = () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  setTheme(dark);
  save('kotopochta-dark', dark);
};
const savedMarks = load(storageKey, {});
for (const id of Object.keys(words)) {
  if (['known', 'learning', 'review'].includes(savedMarks[id])) marks.set(id, savedMarks[id]);
}
rememberMasteredWords(knownWords());

function knownWords() {
  return new Set([...marks].filter(([, status]) => status === 'known').map(([id]) => id));
}

function rememberMasteredWords(ids) {
  const additions = [...ids].filter(id => !masteredWords.has(id));
  if (!additions.length) return;
  for (const id of [...storedMasteredWords(), ...additions]) masteredWords.add(id);
  save(masteredWordsKey, [...masteredWords]);
}

function storeWordMarks(id, status) {
  if (status === 'known') rememberMasteredWords([id]);
  save(storageKey, Object.fromEntries(marks));
}

function recordStudyActivity() {
  const key = dateKey(studyDate());
  if (!studyDays.has(key)) {
    studyDays.add(key);
    save(activityKey, [...studyDays]);
  }
  renderHeaderProgress();
}

function counted(count, forms) {
  const lastDigit = count % 10;
  return count + ' ' + forms[count % 100 >= 11 && count % 100 <= 14 ? 2
    : lastDigit === 1 ? 0 : lastDigit >= 2 && lastDigit <= 4 ? 1 : 2];
}

function renderHeaderProgress() {
  byId('homeLessons').textContent = counted(lessons, ['урок', 'урока', 'уроков']);
  const streak = currentStreak(studyDays, studyDate());
  byId('homeStreak').textContent = counted(streak, ['день', 'дня', 'дней']);
}

function renderHomeProgress() {
  const items = new Set(Object.keys(sets).filter(hasSetAccess).flatMap(id => sets[id].items));
  const known = [...items].filter(id => marks.get(id) === 'known').length;
  const meter = byId('homeWordMeter');
  meter.max = items.size || 1;
  meter.value = known;
  byId('homeKnownWords').textContent = items.size
    ? 'Изучено: ' + known + '/' + items.size
    : 'Выбери наборы для обучения';
  byId('homeStart').textContent = chosen.size === 3 ? 'Продолжить' : 'Начать бесплатно';
  const today = studyDate();
  const monday = -((today.getUTCDay() + 6) % 7);
  byId('homeWeek').replaceChildren(...weekdayLabels.map((day, index) => {
    const item = document.createElement('li');
    const active = studyDays.has(dateKey(today, monday + index));
    const mark = document.createElement('span');
    mark.className = 'home-day' + (active ? ' is-studied' : '');
    mark.setAttribute('aria-label', active ? 'Были занятия' : 'Без занятий');
    mark.setAttribute('role', 'img');
    item.append(day, mark);
    return item;
  }));
}

let cardIndex = 0;
let currentSet;
let cardFlip;
const answered = new Set();
const legacyScenes = ['hello', 'want', 'dumplings', 'rice', 'okay', 'thanks',
  'train', 'station', 'name', 'friend', 'price', 'buy', 'one', 'three', 'today', 'tomorrow'];
const foodScenes = [
  '面条', '包子', '馒头', '小笼包', '炒饭', '火锅', '粥', '汤', '面包', '鸡蛋', '鸡肉', '猪肉', '牛肉', '鱼', '虾', '豆腐',
  '蔬菜', '水果', '苹果', '香蕉', '西红柿', '土豆', '水', '茶', '咖啡', '牛奶', '果汁', '奶茶', '筷子', '勺子', '叉子', '刀',
  '碗', '盘子', '杯子', '菜单', '好吃', '不好吃', '好喝', '辣', '甜', '酸', '咸', '真香', '吃', '喝', '点菜',
];
function createCard() {
  const id = sets[currentSet].items[cardIndex];
  const [chinese, pinyin, reading, translation] = words[id];
  const card = document.createElement('article');
  const title = document.createElement('h2');
  title.lang = 'zh-CN';
  title.textContent = chinese;
  const transcription = document.createElement('p');
  transcription.className = 'card-pinyin';
  transcription.textContent = pinyin;
  const detail = document.createElement('p');
  detail.textContent = reading;
  const meaning = document.createElement('p');
  meaning.textContent = translation;
  const answer = document.createElement('details');
  const reveal = document.createElement('summary');
  reveal.textContent = 'Показать чтение и перевод';
  answer.append(reveal, detail, meaning);
  answer.ontoggle = () => { if (answer.open) recordStudyActivity(); };
  const illustration = document.createElement('span');
  const specific = currentSet === 'food' ? foodScenes.indexOf(chinese) : -1;
  const legacy = legacyScenes.indexOf(id);
  if (specific >= 0 || legacy >= 0) {
    const index = specific >= 0 ? specific % 16 : legacy;
    illustration.className = 'word-scene';
    if (specific >= 0) illustration.style.backgroundImage = "url('./food-art-" + (Math.floor(specific / 16) + 1) + ".png')";
    illustration.style.backgroundPosition = (index % 4 * 100 / 3) + '% ' + (Math.floor(index / 4) * 100 / 3) + '%';
  } else {
    illustration.className = 'postal-art card-topic-art art-' + currentSet;
  }
  illustration.setAttribute('aria-hidden', 'true');
  const prompt = document.createElement('div');
  prompt.className = 'card-prompt';
  prompt.append(title, transcription, pronunciation(chinese));
  card.append(prompt, illustration, answer);
  return card;
}
function updateCardControls() {
  const { title, items } = sets[currentSet];
  byId('cardPosition').textContent = title + ' · ' + (cardIndex + 1) + ' из ' + items.length;
  byId('cardMeter').max = items.length;
  byId('cardMeter').value = cardIndex + 1;
  byId('previous').disabled = cardIndex === 0;
  byId('next').disabled = cardIndex === items.length - 1;
  byId('finishCards').hidden = answered.size !== items.length;
  byId('reviewCard').setAttribute('aria-pressed', marks.get(items[cardIndex]) === 'review');
  byId('knowCard').setAttribute('aria-pressed', marks.get(items[cardIndex]) === 'known');
}
function renderCards() {
  const pendingFlip = cardFlip;
  cardFlip = undefined;
  pendingFlip?.cancel();
  byId('card').replaceChildren(createCard());
  updateCardControls();
}
async function moveCard(direction) {
  const destination = cardIndex + direction;
  if (cardFlip || destination < 0 || destination >= sets[currentSet].items.length) return;
  stopAudio();
  cardIndex = destination;
  const slot = byId('card');
  const previous = slot.firstElementChild;
  if (!previous || matchMedia('(prefers-reduced-motion: reduce)').matches || !slot.animate) {
    renderCards();
    return;
  }
  const incoming = createCard();
  const rotor = document.createElement('div');
  rotor.className = 'card-rotor';
  rotor.inert = true;
  incoming.classList.add('card-opposite');
  rotor.append(previous, incoming);
  slot.append(rotor);
  const turn = direction > 0 ? -180 : 180;
  const animation = rotor.animate(
    [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(' + turn + 'deg)' }],
    { duration: 530, easing: 'cubic-bezier(.38, .1, .24, 1)', fill: 'forwards' }
  );
  cardFlip = animation;
  try {
    await animation.finished;
  } catch {
    return;
  }
  if (cardFlip !== animation) return;
  cardFlip = undefined;
  incoming.classList.remove('card-opposite');
  slot.replaceChildren(incoming);
  updateCardControls();
}
function markCard(value) {
  if (cardFlip) return;
  const items = sets[currentSet].items;
  const id = items[cardIndex];
  marks.set(id, value);
  storeWordMarks(id, value);
  recordStudyActivity();
  answered.add(id);
  clearDialogue();
  if (cardIndex < items.length - 1) void moveCard(1);
  else updateCardControls();
}
byId('previous').onclick = () => { recordStudyActivity(); void moveCard(-1); };
byId('next').onclick = () => { recordStudyActivity(); void moveCard(1); };
byId('reviewCard').onclick = () => markCard('review');
byId('knowCard').onclick = () => markCard('known');

function selectCardSet(id) {
  currentSet = id;
  byId('cardSet').value = id;
  answered.clear();
  cardIndex = 0;
}
byId('cardSet').onchange = event => {
  selectCardSet(event.target.value);
  renderCards();
};
byId('finishCards').onclick = () => {
  lessons++;
  recordStudyActivity();
  answered.clear();
  cardIndex = 0;
  saveProgress();
  navigateTo('profile');
};

let scene;
const synth = window.speechSynthesis;
let playback = 0;
let wordRecording;
let dialoguePlaying = false;
let dialogueSpeechRows = [];
let highlightedSentence;
let highlightedWord;
const recordings = { '你好': './audio/hello.mp3', '火车': './audio/train.mp3' };
// Request the list early, and read it again on each click as browsers can populate it asynchronously.
synth?.getVoices();
function mandarinVoice() {
  const voices = synth?.getVoices().filter(voice => {
    const tag = voice.lang.replaceAll('_', '-');
    return /^(cmn|zh)(-|$)/i.test(tag) &&
      !/(^|-)yue(-|$)/i.test(tag) &&
      (/^cmn(-|$)/i.test(tag) || !/(^|-)(HK|MO)(-|$)/i.test(tag)) &&
      !/cantonese|粵語|粤语/i.test(voice.name);
  }) ?? [];
  const preferred = candidates => candidates.find(voice => /^(cmn|zh(?:-hans)?-cn)(-|$)/i.test(voice.lang.replaceAll('_', '-')))
    ?? candidates[0];
  return preferred(voices.filter(voice => voice.localService)) ?? preferred(voices);
}
const noMandarinVoice = 'Браузер не нашёл голос для мандаринского китайского. Попробуйте нажать «Слушать» ещё раз или добавьте китайский голос в настройках устройства.';
function speakMandarin(text, voice, rate, onError, onEnd, onBoundary, onStart) {
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = rate;
    utterance.onerror = onError;
    utterance.onend = onEnd ?? null;
    utterance.onboundary = onBoundary ?? null;
    utterance.onstart = onStart ?? null;
    synth.speak(utterance);
  } catch {
    onError();
  }
}
function pronunciation(text) {
  const button = document.createElement('button');
  button.className = 'listen';
  button.textContent = 'Слушать';
  button.setAttribute('aria-label', 'Прослушать ' + text);
  button.onclick = () => {
    stopAudio();
    const status = byId('wordAudio');
    button.closest('section').prepend(status);
    if (recordings[text]) {
      const token = playback;
      wordRecording = new Audio(recordings[text]);
      wordRecording.play().then(() => recordStudyActivity()).catch(() => {
        if (token === playback) status.textContent = 'Не удалось воспроизвести запись.';
      });
      return;
    }
    const voice = mandarinVoice();
    if (!voice) {
      status.textContent = noMandarinVoice;
      return;
    }
    const token = playback;
    speakMandarin(text, voice, 0.85, () => {
      if (token === playback) status.textContent = 'Не удалось озвучить слово. Попробуйте ещё раз.';
    }, undefined, undefined, recordStudyActivity);
  };
  return button;
}

function vocabularyAudio(text) {
  const button = pronunciation(text);
  button.classList.add('word-audio-button');
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l4-4v14l-4-4H4z M15 9a4 4 0 0 1 0 6 M18 6a8 8 0 0 1 0 12"/></svg>';
  return button;
}

function stopAudio() {
  wordRecording?.pause();
  wordRecording = undefined;
  byId('wordAudio').textContent = '';
  playback++;
  dialoguePlaying = false;
  clearSpeechHighlight();
  for (const part of dialogueSpeechRows.flat()) {
    part.status.textContent = '';
    part.listen.setAttribute('aria-pressed', 'false');
  }
  synth?.cancel();
  byId('stop').hidden = true;
  byId('audioStatus').textContent = '';
  byId('play').textContent = 'Слушать';
}

function clearDialogue() {
  stopAudio();
  scene = undefined;
  byId('reader').replaceChildren();
  dialogueSpeechRows = [];
  byId('result').hidden = true;
  byId('dialoguePreview').hidden = false;
  byId('dialogueSettings').hidden = false;
  byId('coverage').textContent = '';
  byId('play').hidden = true;
  byId('translate').hidden = true;
}

const pages = {
  learn: 'Выбирай свой маршрут обучения!', sets: 'Наборы слов', cards: 'Карточки', dialogue: 'Диалоги и рассказы',
  vocabulary: 'Слова', shop: 'Магазин', profile: 'Профиль',
};
let vocabularyScope;
function showPage(page, focus = true) {
  stopAudio();
  document.body.dataset.page = page;
  const inStudy = ['sets', 'cards', 'dialogue'].includes(page);
  updateTopHeader(inStudy ? 'learn' : page);
  byId('exitStudy').hidden = !inStudy;
  for (const id of Object.keys(pages)) byId(id).hidden = page !== id;
  const workspaceHeading = byId('heading');
  workspaceHeading.hidden = ['shop', 'dialogue', 'profile'].includes(page);
  workspaceHeading.textContent = pages[page];
  let heading = page === 'shop' ? byId('shopHeading')
    : page === 'dialogue' ? byId('dialogueHeading') : workspaceHeading;
  if (page === 'sets') renderLearning();
  if (page === 'cards') {
    updateCardSetOptions();
    renderCards();
  }
  if (page === 'shop') renderShop();
  if (page === 'dialogue') renderDialogueSets();
  if (page === 'vocabulary') {
    const scope = location.hash.split('/')[1];
    const nextScope = scope === 'all' || (Object.hasOwn(sets, scope) && hasSetAccess(scope)) ? scope : undefined;
    if (nextScope !== vocabularyScope) {
      byId('search').value = '';
      for (const button of byId('filters').querySelectorAll('button')) {
        button.setAttribute('aria-pressed', String(button.dataset.filter === ''));
      }
    }
    vocabularyScope = nextScope;
    byId('vocabularyOverview').hidden = Boolean(vocabularyScope);
    byId('vocabularyDetail').hidden = !vocabularyScope;
    workspaceHeading.textContent = vocabularyScope === 'all' ? 'Словарь' : sets[vocabularyScope]?.title ?? 'Мой словарь';
    if (vocabularyScope) renderVocabulary();
    else {
      workspaceHeading.hidden = true;
      heading = byId('vocabularyHeading');
      renderVocabularyOverview();
    }
  }
  if (page === 'profile') {
    heading = byId('profileHeading');
    renderProfile();
  }
  if (focus) heading.focus({ preventScroll: page === 'shop' });
}
const catalogItems = Object.values(sets).flatMap(set => set.items);
function renderLearning() {
  function tile(id, index) {
    const set = sets[id];
    const known = set.items.filter(item => marks.get(item) === 'known').length;
    const row = document.createElement('li');
    const visual = document.createElement('div');
    visual.className = 'learn-set-art';
    visual.setAttribute('aria-hidden', 'true');
    const character = document.createElement('span');
    character.className = 'scene-cat';
    const mascot = id === 'food' || (id !== 'travel' && index % 2 === 0) ? 'mark' : 'bao';
    for (const part of ['body', 'head']) {
      const image = document.createElement('img');
      image.className = 'scene-' + part;
      image.src = './' + mascot + '-' + part + '.svg';
      image.alt = '';
      character.append(image);
    }
    const themeArt = document.createElement('span');
    themeArt.className = 'postal-art art-' + id;
    visual.append(character, themeArt);
    const description = document.createElement('div');
    description.className = 'learn-set-details';
    const title = document.createElement('h3');
    title.textContent = set.title;
    const chinese = document.createElement('span');
    chinese.lang = 'zh-CN';
    chinese.textContent = set.chinese;
    const meter = document.createElement('progress');
    meter.max = set.items.length;
    meter.value = known;
    meter.setAttribute('aria-label', 'Изучено в наборе «' + set.title + '»');
    const count = document.createElement('p');
    count.textContent = known + ' из ' + set.items.length + ' изучено';
    const start = document.createElement('button');
    start.type = 'button';
    start.disabled = !hasSetAccess(id);
    start.className = start.disabled ? '' : 'primary';
    start.textContent = start.disabled ? 'Недоступно' : 'Учить';
    start.setAttribute('aria-label', start.textContent + ' — ' + set.title);
    start.onclick = () => {
      selectCardSet(id);
      navigateTo('cards');
    };
    description.append(title, chinese, meter, count, start);
    row.append(visual, description);
    return row;
  }
  byId('starterSets').replaceChildren(...[...chosen].map(tile));
  byId('otherSetsTitle').textContent = promotionActive() ? 'Другие наборы' : 'Недоступные наборы';
  byId('otherSets').replaceChildren(...Object.keys(sets).filter(id => !chosen.has(id)).map(tile));
  const totals = [
    ['Изучено', catalogItems.filter(id => marks.get(id) === 'known').length, 'introduction'],
    ['На повторение', catalogItems.filter(id => ['review','learning'].includes(marks.get(id))).length, 'time'],
    ['Не изучено', catalogItems.filter(id => !marks.has(id)).length, 'letter'],
  ];
  byId('learnTotals').replaceChildren(...totals.map(([label, value, art]) => {
    const cell = document.createElement('div');
    const term = document.createElement('dt');
    term.textContent = label;
    const count = document.createElement('dd');
    count.textContent = value;
    const illustration = document.createElement('span');
    illustration.className = 'postal-art art-' + art;
    illustration.setAttribute('aria-hidden', 'true');
    cell.append(term, count, illustration);
    return cell;
  }));
}
function renderVocabularyOverview() {
  function tile(id, available, wide = false) {
    const set = sets[id];
    const row = document.createElement('li');
    if (wide) row.className = 'vocabulary-set-wide';
    const link = document.createElement('a');
    link.className = 'vocabulary-set';
    link.href = available ? '#vocabulary/' + id : '#shop';
    const art = document.createElement('span');
    art.className = 'postal-art art-' + id;
    art.setAttribute('aria-hidden', 'true');
    const title = document.createElement('strong');
    title.textContent = set.title;
    const count = document.createElement('span');
    count.className = 'vocabulary-set-count';
    count.textContent = set.items.length + ' слов';
    const info = document.createElement('div');
    info.append(title, count);
    const visual = document.createElement('div');
    visual.className = 'vocabulary-set-visual';
    visual.dataset.set = id;
    const mascots = document.createElement('span');
    mascots.className = 'vocabulary-mascots';
    mascots.setAttribute('aria-hidden', 'true');
    for (const mascot of id === 'introduction' ? ['mark', 'bao'] : [id === 'travel' || id === 'time' ? 'bao' : 'mark']) {
      const image = document.createElement('img');
      image.src = './' + mascot + '.svg?v=2';
      image.alt = '';
      mascots.append(image);
    }
    visual.append(mascots, art, info);
    link.append(visual);
    const footer = document.createElement('div');
    footer.className = 'vocabulary-set-footer';
    const caption = document.createElement('span');
    caption.className = 'vocabulary-set-status';
    if (available) {
      const known = set.items.filter(item => marks.get(item) === 'known').length;
      const progress = document.createElement('progress');
      progress.max = set.items.length;
      progress.value = known;
      progress.setAttribute('aria-label', 'Изучено в наборе «' + set.title + '»');
      caption.textContent = 'Изучено: ' + known + '/' + set.items.length;
      const meter = document.createElement('div');
      meter.append(progress, caption);
      const action = document.createElement('span');
      action.className = 'landing-button primary';
      action.textContent = 'Открыть';
      footer.append(meter, action);
    } else {
      caption.textContent = 'Открыть в магазине';
      footer.append(caption);
    }
    link.append(footer);
    row.append(link);
    return row;
  }
  const ids = Object.keys(sets);
  const locked = ids.filter(id => !hasSetAccess(id));
  const owned = ids.filter(hasSetAccess);
  byId('ownedWordSets').replaceChildren(...owned.map((id, index) =>
    tile(id, true, id === 'introduction' && index === 2)));
  byId('lockedWordSets').replaceChildren(...locked.map(id => tile(id, false)));
  byId('lockedWordGroup').hidden = !locked.length;
  const items = new Set(owned.flatMap(id => sets[id].items));
  const known = [...items].filter(id => marks.get(id) === 'known').length;
  byId('vocabularyKnown').textContent = known;
  byId('vocabularyRemaining').textContent = items.size - known;
  byId('vocabularyTotal').textContent = items.size;
  byId('vocabularyProgress').max = items.size || 1;
  byId('vocabularyProgress').value = known;
  byId('vocabularyMarker').style.setProperty('--word-progress', (items.size ? known / items.size : 0) * 100 + '%');
}
function renderVocabulary() {
    const query = byId('search').value.trim().toLocaleLowerCase();
    const filter = byId('filters').querySelector('[aria-pressed="true"]').dataset.filter;
    const availableItems = vocabularyScope === 'all'
      ? Object.keys(sets).filter(hasSetAccess).flatMap(id => sets[id].items)
      : sets[vocabularyScope].items;
    const knownCount = availableItems.filter(item => marks.get(item) === 'known').length;
    byId('filters').querySelector('[data-filter="known"]').textContent = 'Изученные (' + knownCount + ')';
    byId('wordList').replaceChildren(...availableItems.filter(item => (!filter || marks.get(item) === filter) &&
        words[item].join(' ').toLocaleLowerCase().includes(query)).map(item => {
        const row = document.createElement('li');
        const hanzi = document.createElement('strong');
        hanzi.lang = 'zh-CN';
        hanzi.textContent = words[item][0];
        const readings = document.createElement('span');
        readings.className = 'word-reading';
        readings.textContent = words[item].slice(1, 3).join(' · ');
        const meaning = document.createElement('span');
        meaning.textContent = words[item][3];
        const rating = document.createElement('select');
        const control = document.createElement('div');
        control.className = 'rating-control';
        const result = document.createElement('span');
        result.className = 'rating-result';
        result.setAttribute('aria-hidden', 'true');
        rating.setAttribute('aria-label', 'Знание слова ' + words[item][0]);
        for (const [value,label] of [['','Без оценки'],['review','Сложно'],['learning','Учу'],['known','Знаю']]) rating.add(new Option(label,value));
        rating.value = marks.get(item) ?? '';
        const showRating = () => {
          result.textContent = rating.selectedOptions[0].textContent;
          result.dataset.rating = rating.value;
        };
        showRating();
        control.append(result, rating);
        rating.onchange = () => {
          if (rating.value) marks.set(item,rating.value);
          else marks.delete(item);
          storeWordMarks(item, rating.value);
          if (rating.value) recordStudyActivity();
          clearDialogue();
          if (filter) {
            renderVocabulary();
            byId('filters').querySelector('[aria-pressed="true"]').focus();
          } else {
            showRating();
            const count = availableItems.filter(id => marks.get(id) === 'known').length;
            byId('filters').querySelector('[data-filter="known"]').textContent = 'Изученные (' + count + ')';
          }
        };
        row.append(hanzi, readings, vocabularyAudio(words[item][0]), meaning, control);
        return row;
      }));
    byId('noWords').hidden = byId('wordList').childElementCount > 0;
}
byId('search').oninput = renderVocabulary;
for (const button of byId('filters').querySelectorAll('button')) {
  button.onclick = () => {
    for (const option of byId('filters').querySelectorAll('button')) {
      option.setAttribute('aria-pressed', option === button);
    }
    renderVocabulary();
  };
}
const storedName = load(profileNameKey, '');
let profileName = typeof storedName === 'string' ? storedName.trim().slice(0, 40) : '';
function editName(edit) {
  byId('profileNameDisplay').hidden = edit;
  byId('profileNameForm').hidden = !edit;
  if (edit) {
    const input = byId('profileNameInput');
    input.value = profileName;
    input.setCustomValidity('');
    input.focus();
    input.select();
  } else {
    byId('profileName').textContent = profileName || 'Ученик';
    byId('editProfileName').focus();
  }
}
byId('editProfileName').onclick = () => editName(true);
byId('cancelProfileName').onclick = () => editName(false);
byId('profileNameInput').oninput = event => event.target.setCustomValidity('');
byId('profileNameForm').onsubmit = event => {
  event.preventDefault();
  const input = byId('profileNameInput');
  const name = input.value.trim();
  if (!name) {
    input.setCustomValidity('Введите имя.');
    input.reportValidity();
    return;
  }
  profileName = name;
  save(profileNameKey, name);
  editName(false);
};

let profileMonthOffset = 0;
const profileDayLabels = {
  studied: 'были занятия', missed: 'день пропущен', today: 'занятий пока нет', future: 'будущий день',
};
function renderProfileCalendar(today = studyDate()) {
  const { label, days } = studyMonth(today, profileMonthOffset, studyDays);
  byId('profileMonth').textContent = label;
  byId('profileNextMonth').disabled = profileMonthOffset === 0;
  const weeks = document.createDocumentFragment();
  for (let offset = 0; offset < days.length; offset += 7) {
    const row = document.createElement('tr');
    for (const day of days.slice(offset, offset + 7)) {
      const cell = document.createElement('td');
      if (day) {
        const date = document.createElement('time');
        const description = day.label + ' · ' + profileDayLabels[day.state];
        date.dateTime = day.key;
        date.textContent = day.number;
        date.className = 'profile-day';
        date.dataset.state = day.state;
        date.setAttribute('aria-label', description);
        date.title = description;
        if (day.today) date.setAttribute('aria-current', 'date');
        cell.append(date);
      }
      row.append(cell);
    }
    weeks.append(row);
  }
  byId('profileDays').replaceChildren(weeks);
}
byId('profilePrevMonth').onclick = () => { profileMonthOffset--; renderProfileCalendar(); };
byId('profileNextMonth').onclick = () => {
  if (profileMonthOffset < 0) profileMonthOffset++;
  renderProfileCalendar();
  if (!profileMonthOffset) byId('profilePrevMonth').focus();
};

const profileNumber = new Intl.NumberFormat('ru');
function renderProfile() {
  const today = studyDate();
  const practicedSets = Object.values(sets).filter(set => set.items.some(id => masteredWords.has(id))).length;
  const { xp, level, title, streak, achievements } = profileProgress({
    mastered: masteredWords.size, lessons, texts, studyDays, practicedSets,
  }, today);
  byId('profileName').textContent = profileName || 'Ученик';
  byId('profileRank').textContent = title + ' (ур.\u00a0' + level + ')';
  byId('profileLessons').textContent = profileNumber.format(lessons);
  byId('profileTexts').textContent = profileNumber.format(texts);
  byId('profileWords').textContent = profileNumber.format(knownWords().size);
  byId('profileXP').textContent = profileNumber.format(xp) + ' XP';
  byId('profileStreak').textContent = profileNumber.format(streak);
  byId('profileStreakCaption').textContent = counted(streak, ['день', 'дня', 'дней']).split(' ')[1] + ' подряд';
  renderProfileCalendar(today);
  byId('profileAwards').replaceChildren(...achievements.map(([id, name, requirement, earned]) => {
    const item = document.createElement('li');
    const mark = document.createElement('img');
    mark.src = './profile-art/00-reward-' + id + (earned ? '' : '-locked') + '.svg?v=2';
    mark.alt = '';
    mark.width = 144;
    mark.height = 184;
    const caption = document.createElement('strong');
    caption.textContent = name;
    const status = document.createElement('span');
    status.textContent = earned ? 'Получена' : requirement;
    item.append(mark, caption, status);
    return item;
  }));
  byId('setStats').replaceChildren(...Object.values(sets).map(({ title, items }) => {
    const count = items.filter(item => marks.get(item) === 'known').length;
    const label = document.createElement('label');
    const bar = document.createElement('progress');
    bar.max = items.length;
    bar.value = count;
    label.append(title + ' · ' + count + ' из ' + items.length, bar);
    return label;
  }));
}

for (const button of document.querySelectorAll('[data-page]')) {
  button.onclick = () => navigateTo(button.dataset.page);
}
byId('target').oninput = () => {
  byId('goal').value = byId('target').value + '%';
  byId('target').style.setProperty('--target-fill', byId('target').value + '%');
};
byId('target').oninput();
const dialogueLength = byId('dialogueLength');
for (const { label, turns } of dialogueLengths) {
  dialogueLength.add(new Option(label + ' · ' + turns + ' реплик' + (turns === 4 ? 'и' : ''), turns));
}
dialogueLength.value = '4';
const dialogueSettings = byId('settings');
const dialogueThemes = [
  ['', 'Любая'], ['post', 'На почте', '../home-art/letter.svg'], ['food', 'В кафе', 'tea-icon.svg'],
  ['travel', 'Путешествие', 'plane-icon.svg'], ['introduction', 'Знакомство', 'hello-icon.svg'],
  ...['shopping', 'numbers', 'time'].map(id => [id, sets[id].title]),
];
byId('dialogueTopics').replaceChildren(...dialogueThemes.map(([id, title, icon]) => {
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'textTopic';
  input.value = id;
  input.checked = !id;
  label.append(input, title);
  if (icon) {
    const image = document.createElement('img');
    image.src = './dialogue-art/' + icon;
    image.alt = '';
    label.append(image);
  }
  return label;
}));
const dialogueSets = byId('dialogueSets');
const dialogueSetOptions = byId('dialogueSetOptions');
function selectedDialogueTopics() {
  if (dialogueSettings.elements.dialogueSource.value === 'all') return undefined;
  return [...dialogueSetOptions.querySelectorAll('input:checked')].map(input => input.value).filter(hasSetAccess);
}
function updateDialogueSource() {
  const topics = selectedDialogueTopics();
  dialogueSets.hidden = topics === undefined;
  dialogueSets.disabled = dialogueSets.hidden;
  byId('generate').disabled = topics?.length === 0;
  byId('progress').textContent = 'Отмечено «Знаю»: ' + dialogueVocabulary(knownWords(), topics).size;
}
function renderDialogueSets() {
  const previous = new Set([...dialogueSetOptions.querySelectorAll('input:checked')].map(input => input.value));
  dialogueSetOptions.replaceChildren(...Object.entries(sets).filter(([id]) => hasSetAccess(id)).map(([id, set]) => {
    const option = document.createElement('input');
    option.type = 'checkbox';
    option.value = id;
    option.checked = previous.has(id);
    const label = document.createElement('label');
    const count = set.items.filter(item => marks.get(item) === 'known').length;
    label.append(option, set.title + ' · ' + count + ' из ' + set.items.length);
    return label;
  }));
  updateDialogueSource();
}
dialogueSettings.addEventListener('change', event => {
  if (event.target.name === 'dialogueSource' || dialogueSets.contains(event.target)) updateDialogueSource();
  if (event.target.name === 'textFormat') {
    dialogueLength.disabled = event.target.value === 'story';
    byId('dialogueLengthControl').hidden = dialogueLength.disabled;
  }
});
const segmentsZh = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh-CN', { granularity: 'sentence' }) : null;
const segmentsRu = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ru', { granularity: 'sentence' }) : null;
const wordsZh = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh-CN') : null;
function sentences(text, segmenter) {
  if (segmenter) return [...segmenter.segment(text)];
  return [...text.matchAll(/[^。！？.!?]+[。！？.!?]*|[。！？.!?]+/g)]
    .map(match => ({ segment: match[0], index: match.index }));
}
function clearSpeechHighlight() {
  highlightedSentence?.classList.remove('is-speaking');
  highlightedWord?.classList.remove('is-spoken-word');
  highlightedSentence = undefined;
  highlightedWord = undefined;
}
function highlightSpeech(parts, charIndex, wordBoundary) {
  const part = parts.find(({ index, text }) => charIndex >= index && charIndex < index + text.length);
  const word = wordBoundary ? part?.words.find(({ index, end }) =>
    charIndex - part.index >= index && charIndex - part.index < end) : undefined;
  if (part?.element === highlightedSentence && word?.element === highlightedWord) return;
  clearSpeechHighlight();
  highlightedSentence = part?.element;
  highlightedWord = word?.element;
  highlightedSentence?.classList.add('is-speaking');
  highlightedWord?.classList.add('is-spoken-word');
}
function speakDialogueText(text, parts, voice, onError, onEnd) {
  const token = playback;
  speakMandarin(text, voice, Number(byId('dialogueRate').value), onError, onEnd, event => {
    if (token === playback) highlightSpeech(parts, event.charIndex, event.name === 'word');
  }, () => {
    if (token !== playback) return;
    highlightSpeech(parts, 0, false);
    recordStudyActivity();
  });
}
function updateDialogueSpeedIcon() {
  byId('dialogueSpeedIcon').src = byId('dialogueRate').value === '1'
    ? './dialogue-art/rabbit-icon.svg' : './dialogue-art/turtle-icon.svg';
}
byId('dialogueRate').onchange = updateDialogueSpeedIcon;
updateDialogueSpeedIcon();

function setSentenceTranslation(part, visible) {
  part.translation.hidden = !visible;
  part.translate.setAttribute('aria-expanded', String(visible));
  part.translate.textContent = visible ? 'Скрыть перевод' : 'Перевод';
}
function updateTranslationButton() {
  const allShown = dialogueSpeechRows.flat().every(part => !part.translation.hidden);
  byId('translate').setAttribute('aria-expanded', String(allShown));
  byId('translate').textContent = allShown ? 'Скрыть перевод' : 'Показать перевод';
}
function showTranslation(visible) {
  dialogueSpeechRows.flat().forEach(part => setSentenceTranslation(part, visible));
  updateTranslationButton();
}
function playSentence(part) {
  const alreadySpeaking = part.listen.getAttribute('aria-pressed') === 'true';
  stopAudio();
  if (alreadySpeaking) return;
  const voice = mandarinVoice();
  if (!voice) {
    part.status.textContent = noMandarinVoice;
    return;
  }
  const token = playback;
  part.listen.setAttribute('aria-pressed', 'true');
  const finish = () => {
    if (token !== playback) return;
    clearSpeechHighlight();
    part.listen.setAttribute('aria-pressed', 'false');
  };
  speakDialogueText(part.text, [{ ...part, index: 0 }], voice, () => {
    if (token !== playback) return;
    finish();
    part.status.textContent = 'Не удалось озвучить предложение. Попробуйте ещё раз.';
  }, finish);
}
function renderSentence({ segment: text, index }, translated, id) {
  const element = document.createElement('div');
  element.className = 'dialogue-sentence';
  const chinese = document.createElement('p');
  chinese.className = 'sentence-text';
  chinese.lang = 'zh-CN';
  const words = [];
  if (wordsZh) {
    for (const word of wordsZh.segment(text)) {
      if (!word.isWordLike) {
        chinese.append(word.segment);
        continue;
      }
      const span = document.createElement('span');
      span.textContent = word.segment;
      chinese.append(span);
      words.push({ index: word.index, end: word.index + word.segment.length, element: span });
    }
  } else chinese.textContent = text;
  const translation = document.createElement('p');
  translation.className = 'translation';
  translation.id = id;
  translation.textContent = translated;
  const actions = document.createElement('div');
  actions.className = 'sentence-actions';
  const translate = document.createElement('button');
  translate.type = 'button';
  translate.setAttribute('aria-controls', id);
  const listen = document.createElement('button');
  listen.type = 'button';
  listen.className = 'sentence-listen';
  listen.textContent = 'Слушать';
  listen.setAttribute('aria-pressed', 'false');
  const status = document.createElement('p');
  status.className = 'sentence-status';
  status.setAttribute('role', 'status');
  const part = { index, text, element, words, translate, translation, listen, status };
  setSentenceTranslation(part, false);
  translate.onclick = () => {
    setSentenceTranslation(part, translation.hidden);
    if (!translation.hidden) recordStudyActivity();
    updateTranslationButton();
  };
  listen.onclick = () => playSentence(part);
  actions.append(translate, listen);
  element.append(chinese, actions, translation, status);
  return part;
}
byId('translate').onclick = () => {
  const reveal = byId('translate').getAttribute('aria-expanded') !== 'true';
  showTranslation(reveal);
  if (reveal) recordStudyActivity();
};
dialogueSettings.onsubmit = event => {
  event.preventDefault();
  const topics = selectedDialogueTopics();
  if (topics?.length === 0) {
    renderDialogueSets();
    return;
  }
  stopAudio();
  const target = byId('target').valueAsNumber;
  const isStory = dialogueSettings.elements.textFormat.value === 'story';
  const topic = dialogueSettings.elements.textTopic.value;
  const known = knownWords();
  scene = isStory ? assembleStory(known, target, topics, topic)
    : assembleDialogue(known, target, Number(dialogueLength.value), topics, topic);
  recordStudyActivity();
  byId('dialoguePreview').hidden = true;
  byId('result').hidden = false;
  byId('dialogueTitle').textContent = (isStory ? 'Рассказ: ' : 'Диалог: ') + scene.title;
  const actual = Math.round(100 * scene.familiar / scene.total);
  byId('coverage').textContent = 'Знакомые единицы — ' + actual + '% (' +
    scene.familiar + ' из ' + scene.total + '). Цель — ' + target + '%. ' +
    (actual === target ? '' : 'Показан ближайший доступный вариант.');
  byId('play').hidden = false;
  const speakers = [...new Set(scene.lines.map(line => line.speaker))];
  dialogueSpeechRows = [];
  byId('reader').replaceChildren(...scene.lines.map((line, rowIndex) => {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const speaker = document.createElement('strong');
    speaker.textContent = line.speaker;
    summary.append(speaker);
    const explanation = document.createElement('p');
    explanation.textContent = line.grammar;
    if (line.grammar) details.append(summary, explanation);
    const row = document.createElement('article');
    const portrait = document.createElement('img');
    portrait.className = 'dialogue-portrait';
    portrait.alt = '';
    portrait.src = (line.speaker === 'Бао' || (line.speaker !== 'Марк' && speakers.indexOf(line.speaker) === 1))
      ? './dialogue-art/chip-bao.svg' : './dialogue-art/chip-mark.svg';
    const content = document.createElement('div');
    if (line.grammar) content.append(details);
    const chinese = sentences(line.text, segmentsZh);
    const russian = sentences(line.ru, segmentsRu);
    const parts = chinese.map((sentence, index) => renderSentence(sentence,
      chinese.length === 1 ? line.ru : russian.length === chinese.length ? russian[index].segment.trim()
        : 'Перевод этого предложения пока недоступен.', 'sentence-translation-' + rowIndex + '-' + index));
    dialogueSpeechRows.push(parts);
    content.append(...parts.map(part => part.element));
    row.append(portrait, content);
    return row;
  }));
  byId('translate').hidden = false;
  showTranslation(false);
  byId('dialogueTitle').focus();
};
byId('newDialogue').onclick = () => {
  clearDialogue();
  byId('generate').focus();
};
byId('finishText').onclick = () => {
  if (!scene) return;
  texts++;
  recordStudyActivity();
  saveProgress();
  clearDialogue();
  navigateTo('profile');
};

byId('play').onclick = () => {
  if (!scene) return;
  if (dialoguePlaying) {
    if (synth.paused) {
      synth.resume();
      byId('play').textContent = 'Пауза';
    } else {
      synth.pause();
      byId('play').textContent = 'Продолжить';
    }
    return;
  }
  stopAudio();
  const voice = mandarinVoice();
  if (!voice) {
    byId('audioStatus').textContent = noMandarinVoice;
    return;
  }
  const token = playback;
  const lines = scene.lines;
  dialoguePlaying = true;
  byId('stop').hidden = false;
  byId('play').textContent = 'Пауза';
  function speak(index) {
    if (token !== playback) return;
    clearSpeechHighlight();
    if (index === lines.length) {
      byId('stop').hidden = true;
      byId('audioStatus').textContent = '';
      dialoguePlaying = false;
      byId('play').textContent = 'Слушать';
      return;
    }
    byId('audioStatus').textContent = 'Реплика ' + (index + 1) + ' из ' + lines.length;
    speakDialogueText(lines[index].text, dialogueSpeechRows[index], voice, () => {
      if (token !== playback) return;
      stopAudio();
      byId('audioStatus').textContent = 'Не удалось озвучить реплику. Нажмите «Слушать», чтобы начать заново.';
    }, () => speak(index + 1));
  }
  speak(0);
};
byId('stop').onclick = stopAudio;
function openWorkspace(focus) {
  byId('welcome').hidden = true;
  byId('workspace').hidden = false;
  showPage(landingDestination(), focus);
}
function updateCardSetOptions() {
  const setIds = [...new Set([...chosen, ...Object.keys(sets)])].filter(hasSetAccess);
  byId('cardSet').replaceChildren(...setIds.map(id => new Option(sets[id].title, id)));
  if (!setIds.includes(currentSet)) selectCardSet(setIds[0]);
  else byId('cardSet').value = currentSet;
}
function renderShop() {
  const temporaryAccess = promotionActive();
  byId('shopAccess').textContent = temporaryAccess
    ? promotionMessage
    : 'Твои три стартовых набора уже доступны в «Обучении».';
  const setIds = Object.keys(sets).filter(id => !chosen.has(id));
  byId('testSets').replaceChildren(...setIds.map(id => {
    const row = document.createElement('li');
    const card = document.createElement('button');
    card.className = 'shop-set';
    card.type = 'button';
    card.setAttribute('aria-haspopup', 'dialog');
    const set = sets[id];
    const art = document.createElement('span');
    art.className = 'postal-art art-' + id;
    art.setAttribute('aria-hidden', 'true');
    const title = document.createElement('strong');
    title.textContent = set.title;
    const chinese = document.createElement('span');
    chinese.className = 'shop-set-chinese';
    chinese.lang = 'zh-CN';
    chinese.textContent = set.chinese;
    const caption = document.createElement('span');
    caption.className = 'shop-set-count';
    caption.textContent = set.items.length + ' слов';
    const availability = document.createElement('span');
    availability.className = 'shop-availability';
    availability.textContent = hasSetAccess(id) ? 'Открыт' : temporaryAccess ? 'Открыть бесплатно' : 'Недоступно';
    card.onclick = () => {
      if (promotionActive()) {
        claimedSets.add(id);
        save(claimedSetsKey, [...claimedSets]);
        availability.textContent = 'Открыт';
      }
      openShopGift(set.title);
    };
    card.append(art, title, chinese, caption, availability);
    row.append(card);
    return row;
  }));
}
const shopFilters = byId('shopFilters');
shopFilters.addEventListener('click', event => {
  const filter = event.target.closest('button')?.dataset.shopFilter;
  if (!filter) return;
  for (const button of shopFilters.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.shopFilter === filter));
  }
  for (const section of byId('shop').querySelectorAll('[data-shop-section]')) {
    section.hidden = filter !== 'all' && section.dataset.shopSection !== filter;
  }
});
const shopGift = byId('shopGift');
function openShopGift(setTitle) {
  byId('shopGiftAccess').textContent = promotionActive()
    ? 'Набор «' + setTitle + '» открыт бесплатно до 1 февраля 2027 года. Теперь его можно найти в «Обучении».'
    : 'Бесплатный доступ ко всем наборам завершился 1 февраля 2027 года.';
  shopGift.showModal();
}
byId('closeShopGift').onclick = () => shopGift.close();
function updateSelection() {
  byId('selectionCount').textContent = 'Выбрано ' + chosen.size + ' из 3';
  for (const option of byId('topics').querySelectorAll('input')) {
    option.checked = chosen.has(option.value);
    option.disabled = chosen.size === 3 && !option.checked;
  }
  byId('start').disabled = chosen.size !== 3;
}
if (chosen.size !== 3) {
  for (const [id, set] of Object.entries(sets)) {
    const label = document.createElement('label');
    const option = document.createElement('input');
    option.type = 'checkbox';
    option.value = id;
    option.onchange = () => {
      if (option.checked) chosen.add(id);
      else chosen.delete(id);
      updateSelection();
    };
    const art = document.createElement('img');
    art.src = './welcome-art/set-' + id + '.svg';
    art.alt = '';
    const name = document.createElement('span');
    name.textContent = set.title;
    label.append(option, art, name);
    byId('topics').append(label);
  }
  updateSelection();
}
function landingDestination() {
  const destination = location.hash.slice(1);
  if (destination.startsWith('vocabulary/')) return 'vocabulary';
  return Object.hasOwn(pages, destination) ? destination : 'learn';
}
function navigateTo(page) {
  if (location.hash === '#' + page) showPage(page);
  else location.hash = page;
}
function updateTopHeader(page) {
  renderHeaderProgress();
  for (const link of byId('topHeader').querySelectorAll('nav a')) {
    if (link.hash === '#' + page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}
function showDestination(focus) {
  const isLanding = !location.hash || ['#home', '#how'].includes(location.hash);
  byId('landing').hidden = !isLanding;
  if (isLanding) {
    updateTopHeader('home');
    stopAudio();
    renderHomeProgress();
    byId('welcome').hidden = true;
    byId('workspace').hidden = true;
    if (location.hash === '#how') byId('how').scrollIntoView();
    else if (focus) {
      window.scrollTo(0, 0);
      byId('homeHeading').focus({ preventScroll: true });
    }
    return;
  }
  window.scrollTo(0, 0);
  if (chosen.size === 3 || landingDestination() === 'profile') {
    openWorkspace(focus);
  } else {
    updateTopHeader('learn');
    byId('workspace').hidden = true;
    byId('welcome').hidden = false;
    if (focus) byId('topics').querySelector('input')?.focus();
  }
}
window.addEventListener('hashchange', () => showDestination(true));
showDestination(false);
byId('onboarding').onsubmit = event => {
  event.preventDefault();
  if (chosen.size !== 3) return;
  saveProgress();
  openWorkspace(true);
};

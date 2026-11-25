import { words } from './food.mjs?v=5';
import { sets } from './catalog.mjs?v=8';
import { dialogueScenes } from './dialogue-scenes.mjs?v=2';

export const dialogueLengths = [
  { label: 'Короткий', turns: 4, exchanges: [0, 1] },
  { label: 'Средний', turns: 6, exchanges: [0, 1, 3] },
  { label: 'Длинный', turns: 8, exchanges: [0, 1, 2, 3] },
];

const globalUnits = new Map(Object.entries(words).map(([id, [text]]) => [text, id]));
function learningUnits(text, topicUnits = globalUnits) {
  return text.split('|').map(unit => {
    const key = unit.trim().replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, '');
    return topicUnits.get(key) ?? globalUnits.get(key) ?? null;
  });
}

function* bindings(slots, base = {}) {
  const names = Object.keys(slots);
  function* fill(index, context) {
    if (index === names.length) {
      yield context;
      return;
    }
    const name = names[index];
    for (const value of slots[name]) yield* fill(index + 1, { ...context, [name]: value });
  }
  yield* fill(0, base);
}

const slotPattern = /\{(\w+(?:\.\w+)*)\}/g;
function fillSlot(path, context, language) {
  const value = path.split('.').reduce((item, key) => item[key], context);
  return typeof value === 'string' ? value : value[language];
}

function renderLine([chinese, russian, explanation], context, speaker, topicUnits) {
  let source = '';
  let end = 0;
  let bankWord;
  let bankUnit;
  for (const match of chinese.matchAll(slotPattern)) {
    source += chinese.slice(end, match.index);
    if (match[1] === 'bank') {
      bankWord = { word: context.bank.word, start: source.replaceAll('|', '').length };
      bankUnit = source.split('|').length - 1;
    }
    source += fillSlot(match[1], context, 'zh');
    end = match.index + match[0].length;
  }
  source += chinese.slice(end);
  const units = learningUnits(source, topicUnits);
  if (bankWord) units[bankUnit] = bankWord.word.id;
  const substitute = (text, language) => text.replace(slotPattern, (_, path) => fillSlot(path, context, language));
  return {
    speaker, units, text: source.replaceAll('|', ''), ru: substitute(russian, 'ru'),
    grammar: explanation && substitute(explanation, 'ru'),
    ...(bankWord && { bankWord }),
  };
}

const templates = dialogueScenes.map(scene => ({
  ...scene,
  topicUnits: new Map((sets[scene.topic]?.items ?? []).map(id => [words[id][0], id])),
  bank: scene.bank.map(word => ({ zh: word.zh, ru: word.inLine, classifier: word.classifier, word })),
}));

function stageOptions(stage, template, shared, known, saved, previousLines) {
  const groups = new Map();
  for (const { slots, lines, distinct } of stage) {
    const needsBank = lines.some(([zh]) => zh.includes('{bank}'));
    const candidates = needsBank ? { ...slots, bank: template.bank } : slots;
    for (const context of bindings(candidates, shared)) {
      if (distinct && context[distinct[0]] === context[distinct[1]]) continue;
      const pair = lines.map((line, index) => renderLine(line, context, template.speakers[index], template.topicUnits));
      const units = pair.flatMap(line => line.units);
      const learned = units.filter(id => known.has(id));
      const familiar = learned.length + units.filter(id => saved.has(id)).length;
      const unique = [...new Set(units.filter(id => known.has(id) || saved.has(id)))].sort();
      const isPrevious = pair.every((line, index) => line.text === previousLines[index]);
      const key = JSON.stringify([units.length, learned.length, familiar, unique, isPrevious]);
      const group = groups.get(key);
      if (!group || Math.random() * ++group.count < 1) {
        groups.set(key, { pair, total: units.length, learned: learned.length, familiar, unique, isPrevious, count: group?.count ?? 1 });
      }
    }
  }
  return [...groups.values()];
}

export function dialogueVocabulary(known, topics) {
  if (!topics) return known;
  return new Set(topics.flatMap(topic => sets[topic].items).filter(id => known.has(id)));
}

export function assembleDialogue(known, target, turns, topics, topic, { saved = new Set(), previous } = {}) {
  const familiarWords = dialogueVocabulary(known, topics);
  const stages = dialogueLengths.find(length => length.turns === turns)?.exchanges;
  if (!stages) return;
  const previousLines = previous?.split('\n') ?? [];
  let best;
  let ties = 0;
  for (const template of templates) {
    if (topic ? topic !== template.topic : topics && !topics.includes(template.topic)) continue;
    for (const shared of bindings(template.shared ?? {})) {
      const options = stages.map((stage, index) => stageOptions(template.stages[stage], template, shared,
        familiarWords, saved, previousLines.slice(index * 2, index * 2 + 2)));
      const path = [];
      function search(index, learned, familiar, total, unique, repeat) {
        if (index < options.length) {
          for (const option of options[index]) {
            path[index] = option.pair;
            search(index + 1, learned + option.learned, familiar + option.familiar, total + option.total,
              new Set([...unique, ...option.unique]), repeat && option.isPrevious);
          }
          return;
        }
        const score = target == null ? [...unique].filter(id => familiarWords.has(id)).length
          : -Math.abs(100 * familiar / total - target);
        const tieScore = target == null ? learned / total : unique.size;
        const comparison = best ? score - best.score || tieScore - best.tieScore
          || Number(best.repeat) - Number(repeat) : 1;
        if (comparison < 0) return;
        if (comparison > 0) ties = 0;
        if (Math.random() * ++ties < 1) {
          const lines = path.flat();
          best = { title: template.title, topic: template.topic, lines, familiar, total, distinct: unique.size,
            signature: lines.map(line => line.text).join('\n'), score, tieScore, repeat };
        }
      }
      search(0, 0, 0, 0, new Set(), true);
    }
  }
  return best;
}

const stories = [
  ['post', 'Письмо для Марка', '今天，|包去邮局。|他给马克寄了一封信。|马克|明天|会收到这封信。', ['Сегодня Бао идёт на почту.', 'Он отправляет Марку письмо.', 'Завтра Марк получит это письмо.']],
  ['food', 'Обед в кафе', '马克去吃饭。|他想吃|饺子，|也想喝|茶。|饺子|很好吃。', ['Марк идёт обедать.', 'Он хочет пельменей и чаю.', 'Пельмени очень вкусные.']],
  ['travel', 'Поездка на поезде', '马克到了|车站。|他和包一起坐|火车。|他们|今天|到北京。', ['Марк приехал на вокзал.', 'Они с Бао едут на поезде.', 'Сегодня они прибудут в Пекин.']],
  ['introduction', 'Новый друг', '马克|认识了|包。|包告诉马克自己的|名字。|他们成了|朋友。', ['Марк познакомился с Бао.', 'Бао назвал Марку своё имя.', 'Они стали друзьями.']],
  ['shopping', 'Подарок для Бао', '马克去|商店。|他想|买|一件|衣服。|这件衣服是给包的。', ['Марк идёт в магазин.', 'Он хочет купить одежду.', 'Эта одежда для Бао.']],
  ['numbers', 'Три посылки', '马克有|三|个包裹。|一|个是他的。|另外两个是包的。', ['У Марка три посылки.', 'Одна его.', 'Две другие принадлежат Бао.']],
  ['time', 'Встреча завтра', '今天|马克很忙。|他和包约好|明天|见面。|他们|下午|三|点见。', ['Сегодня Марк очень занят.', 'Они с Бао договорились встретиться завтра.', 'Они встретятся в три часа дня.']],
];

export function assembleStory(known, target, topics, topic) {
  const familiarWords = dialogueVocabulary(known, topics);
  let best;
  for (const [id, title, text, translations] of stories) {
    if (topic ? id !== topic : topics && !topics.includes(id)) continue;
    const units = learningUnits(text);
    const familiar = units.filter(unit => familiarWords.has(unit)).length;
    if (best && Math.abs(100 * best.familiar / best.total - target) <= Math.abs(100 * familiar / units.length - target)) continue;
    const lines = text.replaceAll('|', '').match(/[^。]+。/g).map((sentence, index) => ({
      text: sentence, ru: translations[index], speaker: 'Рассказчик',
    }));
    best = { title, lines, familiar, total: units.length };
  }
  return best;
}

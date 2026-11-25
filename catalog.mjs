import { food, words } from './food.mjs?v=5';
import { vocabulary } from './vocabulary.mjs';

export const sets = {
  food: { title: 'Еда', chinese: '食物', items: food },
  travel: { title: 'Поездки', chinese: '旅行', entries: {
    train: ['火车', 'huǒchē', 'хочэ', 'поезд'],
    station: ['车站', 'chēzhàn', 'чэчжань', 'вокзал'],
  }},
  introduction: { title: 'Знакомство', chinese: '初次见面', entries: {
    hello: words.hello,
    thanks: words.thanks,
    name: ['名字', 'míngzi', 'минцзы', 'имя'],
    friend: ['朋友', 'péngyou', 'пэнъю', 'друг'],
  }},
  shopping: { title: 'Покупки', chinese: '购物', entries: {
    price: ['多少钱', 'duōshao qián', 'дошао цянь', 'сколько стоит?'],
    buy: ['买', 'mǎi', 'май', 'покупать'],
  }},
  numbers: { title: 'Числа', chinese: '数字', entries: {
    one: ['一', 'yī', 'и', 'один'],
    three: ['三', 'sān', 'сань', 'три'],
  }},
  time: { title: 'Время', chinese: '时间', entries: {
    today: ['今天', 'jīntiān', 'цзиньтянь', 'сегодня'],
    tomorrow: ['明天', 'míngtiān', 'минтянь', 'завтра'],
  }},
};

for (const [id, set] of Object.entries(sets)) {
  const existing = set.entries ?? {};
  const added = Object.fromEntries(vocabulary[id].trim().split(/\r?\n/).map(line => {
    const fields = line.split('|');
    return [id + ':' + fields[0], fields];
  }));
  Object.assign(words, existing, added);
  set.items = [...(set.items ?? Object.keys(existing)), ...Object.keys(added)];
}

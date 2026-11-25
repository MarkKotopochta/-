export const words = {
  hello: ['你好', 'nǐ hǎo', 'ни хао', 'здравствуйте'],
  order: ['请问，您要吃什么', 'qǐngwèn, nín yào chī shénme', 'цинвэнь, нинь яо чы шэньмэ', 'Скажите, что будете есть?'],
  want: ['我想吃', 'wǒ xiǎng chī', 'во сян чы', 'я хочу съесть'],
  dumplings: ['饺子', 'jiǎozi', 'цзяоцзы', 'пельмени'],
  rice: ['米饭', 'mǐfàn', 'мифань', 'варёный рис'],
  okay: ['好的', 'hǎo de', 'хао дэ', 'хорошо'],
  portion: ['一份', 'yí fèn', 'и фэнь', 'одна порция'],
  thanks: ['谢谢', 'xièxie', 'сесе', 'спасибо'],
};

export const food = ['dumplings', 'rice', 'want'];
const menu = {
  dumplings: ['пельмени', 'пельменей'],
  rice: ['рис', 'риса'],
};

export function assemble(known, target) {
  const candidates = Object.entries(menu).map(([dish, [object, genitive]]) => {
    const lines = [
      { speaker: 'Официант', units: ['hello', 'order'], text: '你好！请问，您要吃什么？', ru: 'Здравствуйте! Скажите, что будете есть?', grammar: '请问 — вежливое вступление к вопросу. 什么 («что») стоит на месте ответа.' },
      { speaker: 'Гость', units: ['want', dish], text: '我想吃' + words[dish][0] + '。', ru: 'Я хочу съесть ' + object + '.', grammar: '想 + действие выражает желание. Здесь действие — 吃' + words[dish][0] + ' («есть ' + object + '»).' },
      { speaker: 'Официант', units: ['okay', 'portion', dish], text: '好的，一份' + words[dish][0] + '。', ru: 'Хорошо, одна порция ' + genitive + '.', grammar: '份 — счётное слово для порций. 一份' + words[dish][0] + ' — одна порция ' + genitive + '.' },
      { speaker: 'Гость', units: ['thanks'], text: '谢谢！', ru: 'Спасибо!', grammar: '谢谢 — самостоятельная формула благодарности.' },
    ];
    const units = lines.flatMap(line => line.units);
    return { lines, familiar: units.filter(id => known.has(id)).length, total: units.length };
  });
  return candidates.reduce((best, candidate) =>
    Math.abs(100 * candidate.familiar / candidate.total - target) <
    Math.abs(100 * best.familiar / best.total - target) ? candidate : best
  );
}

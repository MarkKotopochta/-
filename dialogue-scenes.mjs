import { dialogueBank } from './dialogue-bank.mjs?v=1';
import { extraFrames } from './dialogue-extra-frames.mjs?v=1';

// Each stage combines independently chosen values inside a Chinese and Russian frame.
const choices = values => values.map(([zh, ru]) => ({ zh, ru }));
const frame = (slots, first, second, distinct) => ({ slots, lines: [first, second], distinct });

const greetings = choices([
  ['你好', 'Привет'], ['您好', 'Здравствуйте'], ['早上好', 'Доброе утро'], ['晚上好', 'Добрый вечер'],
]);
const dishes = choices([
  ['饺子、|面条|和|火锅', 'пельмени, лапша и хого'],
  ['炒饭|和|小笼包', 'жареный рис и сяолунбао'],
  ['包子、|馒头|和|粥', 'баоцзы, маньтоу и рисовая каша'],
  ['米饭|和|汤', 'варёный рис и суп'],
  ['鸡肉|和|蔬菜', 'курица и овощи'],
  ['鱼、|虾|和|豆腐', 'рыба, креветки и тофу'],
  ['面包、|鸡蛋|和|土豆', 'хлеб, яйца и картошка'],
]);
const drinks = choices([
  ['茶', 'чай'], ['咖啡', 'кофе'], ['奶茶', 'чай с молоком'], ['水', 'воду'],
  ['果汁', 'сок'], ['牛奶', 'молоко'],
]);
const orders = [
  { zh: '我想吃', ru: 'Я хочу', reply: { zh: '那就点这个吧。', ru: 'Тогда давай это и закажем.' },
    grammar: '想吃 означает «хотеть съесть».' },
  { zh: '我点了', ru: 'Я заказал', reply: { zh: '好啊，|我们一起吃吧。', ru: 'Отлично, давай поедим вместе.' },
    grammar: '了 после 点 указывает, что заказ уже сделан.' },
  { zh: '我|喜欢|吃', ru: 'Я люблю', reply: { zh: '是吗？|那我也尝尝。', ru: 'Правда? Тогда я тоже попробую.' },
    grammar: '喜欢吃 означает «любить есть».' },
];
const transport = choices([
  ['地铁', 'на метро'], ['公交车', 'на автобусе'], ['出租车', 'на такси'],
]);
const stations = choices([
  ['车站', 'вокзалом'], ['火车站', 'железнодорожным вокзалом'], ['地铁站', 'станцией метро'],
  ['酒店', 'гостиницей'], ['入口', 'входом'], ['出口', 'выходом'],
]);
const direction = choices([
  ['左边', 'слева'], ['右边', 'справа'], ['前面', 'впереди'],
]);
const languages = choices([['汉语', 'по-китайски'], ['俄语', 'по-русски']]);
const colors = choices([['黑色', 'чёрном'], ['蓝色', 'синем'], ['红色', 'красном'], ['白色', 'белом']]);
const prices = choices([['二十', 'Двадцать'], ['五十', 'Пятьдесят'], ['一百', 'Сто']]);
const clothes = choices([
  ['裤子|和|鞋', 'брюки и обувь'], ['袜子|和|帽子', 'носки и шапки'],
  ['外套|和|衬衫', 'куртки и рубашки'],
]);
const times = choices([
  ['今天', 'сегодня'], ['明天', 'завтра'], ['后天', 'послезавтра'],
]);
const durations = choices([
  ['十|分钟', 'Десять минут'], ['半|个|小时', 'Полчаса'], ['一|个|小时', 'Час'],
]);
const amounts = [
  { zh: '一', ru: 'один', result: { zh: '四', ru: 'четыре' } },
  { zh: '两', ru: 'два', result: { zh: '五', ru: 'пять' } },
  { zh: '六', ru: 'шесть', result: { zh: '九', ru: 'девять' } },
];
const payment = choices([['银行卡', 'картой'], ['手机', 'телефоном']]);
const farewell = choices([['再见', 'До встречи'], ['拜拜', 'Пока']]);

// Mark the teaching occurrence with {bank}. Fields like {bank.classifier}
// use the same value in that stage without making the field clickable.
export const dialogueScenes = [
  {
    topic: 'food', title: 'В кафе', speakers: ['Марк', 'Бао'],
    stages: [
      [
        frame({ greeting: greetings, first: dishes, second: dishes },
          ['{greeting}，|阿包！|菜单|上有|{first}。', '{greeting}, Бао! В меню есть {first}.'],
          ['对，|还有|{second}。', 'Да, и ещё {second}.'], ['first', 'second']),
      ],
      [frame({ order: orders }, ['{order}|{bank}。', '{order} {bank}.', '{order.grammar}'], ['{order.reply}', '{order.reply}'])],
      [
        frame({ drink: drinks, other: drinks },
          ['你想|喝|{drink}|吗？', 'Хочешь {drink}?'],
          ['我想|喝|{other}。', 'Я хочу {other}.']),
        frame({ taste: choices([['辣', 'острое'], ['甜', 'сладкое'], ['酸', 'кислое']]) },
          ['你爱|吃|{taste}|的吗？', 'Ты любишь {taste}?'],
          ['喜欢。|这里的菜|好吃。', 'Люблю. Здесь вкусно готовят.']),
      ],
      [frame({ next: dishes },
        ['下次|也试试|菜单|上的其他菜吧。', 'В следующий раз давай попробуем и другие блюда из меню.'],
        ['好啊，|比如|{next}。', 'Давай. Например, {next}.'])],
    ],
  },
  {
    topic: 'travel', title: 'Как добраться?', speakers: ['Путешественник', 'Прохожий'],
    stages: [
      [frame({ greeting: greetings, transport },
        ['{greeting}！|请问，|{bank}|怎么走？', '{greeting}! Скажите, как пройти {bank}?', '怎么走 используют, когда спрашивают дорогу.'],
        ['可以|坐|{transport}|去。', 'Можно доехать {transport}.'])],
      [frame({ station: stations, direction },
        ['我该在哪儿|上车？', 'Где мне сесть?'],
        ['站点在|{direction}，|就在|{station}|旁边。', 'Остановка {direction}, рядом с {station}.'])],
      [frame({ duration: durations },
        ['大概需要|多久？', 'Сколько примерно ехать?'],
        ['大概|{duration}。', 'Примерно столько: {duration}.'])],
      [frame({ farewell },
        ['谢谢你指路。|{farewell}！', 'Спасибо, что подсказали дорогу. {farewell}!'],
        ['不客气！|路上小心。', 'Не за что! Будьте осторожны по дороге.'])],
    ],
  },
  {
    topic: 'introduction', title: 'Первое знакомство', speakers: ['Марк', 'Бао'],
    stages: [
      [frame({ greeting: greetings, name: choices([['阿包', 'Бао'], ['包', 'Бао']]) },
        ['{greeting}！|你叫什么名字？', '{greeting}! Как тебя зовут?'],
        ['我叫|{name}。|很高兴认识你。', 'Меня зовут {name}. Рад познакомиться.'])],
      [frame({ question: choices([['你|有什么|爱好', 'Какие у тебя увлечения'], ['你|平时|喜欢做什么', 'Чем ты любишь заниматься']]) },
        ['{question}？', '{question}?'],
        ['我的|爱好|是|{bank}。', 'Моё увлечение — {bank}.'])],
      [frame({ language: languages },
        ['你|会说|{language}|吗？', 'Ты говоришь {language}?'],
        ['会说一点儿。|请说|慢一点。', 'Немного. Говори, пожалуйста, помедленнее.'])],
      [frame({ farewell },
        ['认识你很开心。|{farewell}！', 'Рад был познакомиться. {farewell}!'],
        ['我也是。|下次见！', 'Я тоже. До следующей встречи!'])],
    ],
  },
  {
    topic: 'shopping', title: 'В магазине одежды', speakers: ['Покупатель', 'Продавец'],
    stages: [
      [frame({ greeting: greetings, reply: choices([['请看这款', 'посмотрите вот эту модель'], ['这边有货', 'вот здесь есть в наличии']]) },
        ['{greeting}，|我想|买|{bank}。', '{greeting}, я хочу купить {bank}.'],
        ['有的，|{reply}。', 'Да, {reply}.'])],
      [
        frame({ color: colors, price: prices },
          ['这款有|{color}|的吗？|多少钱？', 'Эта модель есть в {color} цвете? Сколько стоит?'],
          ['有，|这款是|{price}|元。', 'Есть. Цена — {price} юаней.']),
        frame({ first: clothes, second: clothes },
          ['你们还卖|{first}|吗？', 'А вы ещё продаёте {first}?'],
          ['卖，|也有|{second}。', 'Да, и у нас есть {second}.'], ['first', 'second']),
      ],
      [frame({ size: choices([['大', 'великоват'], ['小', 'маловат']]) },
        ['这个|尺码|有点|{size}。', 'Этот размер {size}.'],
        ['那您可以|换|个|尺码。', 'Тогда можно взять другой размер.'])],
      [frame({ method: payment },
        ['这款可以。|用|{method}|付款|行吗？', 'Эта модель подходит. Можно оплатить {method}?'],
        ['可以。|这是您的|收据。', 'Да. Вот ваш чек.'])],
    ],
  },
  {
    topic: 'numbers', title: 'Считаем вещи', speakers: ['Марк', 'Бао'],
    stages: [
      [frame({ place: choices([['桌上', 'На столе'], ['箱子里', 'В коробке']]) },
        ['{place}|有|两|件还是|三|件？', 'Там два предмета или три?'],
        ['{place}|有|三|{bank.classifier}|{bank}。', '{place} три {bank}.', 'Между числом и существительным ставится счётное слово.'])],
      [frame({ amount: amounts },
        ['再|加|{amount}|件呢？', 'А если добавить ещё {amount}?'],
        ['那就一共|{amount.result}|件。', 'Тогда всего {amount.result}.'])],
      [frame({ exercise: choices([['八', 'восемь'], ['十', 'десять'], ['十二', 'двенадцать'], ['二十', 'двадцать']]) },
        ['你能数到|{exercise}|吗？', 'Можешь досчитать до числа {exercise}?'],
        ['能。|我从|一|开始。', 'Могу. Начну с одного.'])],
      [frame({ sign: choices([['数量', 'количество'], ['号码', 'номер']]) },
        ['要写下|{sign}|吗？', 'Нужно записать {sign}?'],
        ['对，|写在这儿吧。', 'Да, запиши вот здесь.'])],
    ],
  },
  {
    topic: 'time', title: 'Договариваемся о встрече', speakers: ['Марк', 'Бао'],
    shared: { day: times },
    stages: [
      [
        frame({ opener: choices([['刚才|忘了问', 'Я только что забыл спросить'], ['我有个问题', 'У меня вопрос']]) },
          ['{opener}。|{day}|能见面吗？', '{opener}. Можем встретиться {day}?'],
          ['{day}|有空。', 'Я свободен {day}.']),
        frame({ reason: choices([['我看看日历', 'проверю календарь'], ['我看看安排', 'посмотрю своё расписание']]) },
          ['你|现在|方便说话吗？|{day}|能见面吗？', 'Сейчас удобно говорить? Можем встретиться {day}?'],
          ['等一下，|我|马上|看看。|{reason}……|可以。', 'Подожди, сейчас посмотрю. Я {reason}… Да, можем.']),
      ],
      [frame({ reply: choices([['好', 'Хорошо'], ['行', 'Договорились']]) },
        ['{day}|{bank}|见吧。', 'Давай встретимся {day}, {bank}.'],
        ['{reply}。|我会|准时|到。', '{reply}. Я приду вовремя.'])],
      [frame({ duration: durations },
        ['我们能聊|多久？', 'Сколько времени сможем поговорить?'],
        ['大概|{duration}。', 'Примерно столько: {duration}.'])],
      [frame({ ending: choices([['别|迟到', 'Не опаздывай'], ['别忘了', 'Не забудь']]) },
        ['那就这么说定了。|{ending}。', 'Тогда договорились. {ending}.'],
        ['放心吧。', 'Не волнуйся.'])],
    ],
  },
  {
    topic: 'post', title: 'На почте', speakers: ['Марк', 'Бао'],
    stages: [
      [frame({ greeting: greetings, label: choices([['地址', 'адрес'], ['名字', 'имя']]) },
        ['{greeting}，|我想寄|{bank}。', '{greeting}, я хочу отправить {bank}.', '寄 означает «отправить по почте».'],
        ['好的。|请写一下|{label}。', 'Хорошо. Напишите {label}, пожалуйста.'])],
      [frame({ price: prices },
        ['请问，|多少钱？', 'Скажите, сколько стоит?'],
        ['{price}|元。', '{price} юаней.'])],
      [frame({ method: payment },
        ['可以|用|{method}|付款|吗？', 'Можно заплатить {method}?'],
        ['可以，|请在这里付款。', 'Да, оплатите здесь, пожалуйста.'])],
      [frame({ farewell },
        ['谢谢您帮忙。|{farewell}！', 'Спасибо за помощь. {farewell}!'],
        ['不客气。|欢迎下次再来。', 'Не за что. Приходите ещё.'])],
    ],
  },
].map(scene => ({
  ...scene,
  stages: scene.stages.map((stage, index) => [...stage, ...extraFrames[scene.topic][index]]),
  bank: dialogueBank[scene.topic],
}));

const fs = require('fs');
const path = require('path');

const masterPath = path.resolve(__dirname, '../data/A3B/a3b-uz/a3b-uz-vocab-master.json');
const masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

function generateIDA() {
    return Array.from({length: 8}, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const missingQuestionsData = [
  // Challenge 11 (10 questions)
  {
    word: "tiger",
    meaning: "老虎,虎",
    context_sentence: "Are they tigers?",
    cn: "它们是老虎吗？",
    hint: "ti(踢) + ger(哥)。这只老虎脾气特别凶，一脚就“踢”飞了平头“哥”。",
    type: "En2Cn",
    prompt: "tiger",
    correct: "老虎,虎",
    distractors: ["狮子", "熊", "大熊猫", "猴子", "长颈鹿"],
    unit: 1
  },
  {
    word: "strong",
    meaning: "强壮的,力气大的",
    context_sentence: "But tigers are strong!",
    cn: "但是老虎很强壮！",
    hint: "谐音“死壮”。健身房里的那个人练得满身肌肉，可以说是“死壮死壮”的。",
    type: "Cloze",
    prompt: "But tigers are ____!",
    correct: "strong",
    distractors: ["string", "strange", "stream", "strike", "strength"],
    unit: 1
  },
  {
    word: "white",
    meaning: "白的,白色的",
    context_sentence: "Yes! They're black and white!",
    cn: "是的！它们是黑白相间的！",
    hint: "谐音“坏特”。电影里那个穿着全白色西装的反派是个大“坏特”（大坏蛋）。",
    type: "Cn2En",
    prompt: "白的,白色的",
    correct: "white",
    distractors: ["write", "right", "light", "wheat", "whine"],
    unit: 1
  },
  {
    word: "tall",
    meaning: "高的,高大的",
    context_sentence: "They're tall.",
    cn: "它们很高。",
    hint: "谐音“头”。个子特别高的人，走在人群里往往一眼就能被别人看到“头”。",
    type: "Cloze",
    prompt: "They're ____.",
    correct: "tall",
    distractors: ["fall", "ball", "call", "wall", "talk"],
    unit: 1
  },
  {
    word: "small",
    meaning: "小的",
    context_sentence: "He is small.",
    cn: "他很小。",
    hint: "s(蛇) + mall(大型商场)。一条体型非常小的玩具蛇不小心掉进了巨大的购物商场(mall)里。",
    type: "En2Cn",
    prompt: "small",
    correct: "小的",
    distractors: ["大的", "高的", "矮的", "胖的", "瘦的"],
    unit: 1
  },
  {
    word: "zoo",
    meaning: "动物园",
    context_sentence: "Let's go to the zoo!",
    cn: "我们去动物园吧！",
    hint: "z(长得像鸭子) + oo(像两只圆圆的眼睛)。在动物园 of the zoo: 在动物园的湖边，看到一只鸭子正瞪着两只圆圆的大眼睛。",
    type: "Cloze",
    prompt: "Let's go to the ____!",
    correct: "zoo",
    distractors: ["too", "cool", "food", "room", "book"],
    unit: 1
  },
  {
    word: "word",
    meaning: "字,词,单词",
    context_sentence: "Which words have 'z' or 'l' sounds?",
    cn: "哪些单词含有'z'或'l'的发音？",
    hint: "谐音“我的”。我在听写时记住了这个单词(word)，这个满分就是“我的”，谁也抢不走。",
    type: "En2Cn",
    prompt: "word",
    correct: "字,词,单词",
    distractors: ["世界", "工作", "木头", "风", "卡片"],
    unit: 1
  },
  {
    word: "nose",
    meaning: "鼻子",
    context_sentence: "Now, he has got a long nose.",
    cn: "现在，他有了一个长鼻子。",
    hint: "联想/图像记忆法 (闻rose玫瑰需要用nose鼻子)",
    type: "Cloze",
    prompt: "Now, he has got a long ____.",
    correct: "nose",
    distractors: ["rose", "noise", "pose", "hose", "neck"],
    unit: 2
  },
  {
    word: "work",
    meaning: "事情,工作",
    context_sentence: "Good work, children!",
    cn: "干得好，孩子们！",
    hint: "谐音记忆法 (我渴 - 工作太累了我好渴)",
    type: "En2Cn",
    prompt: "work",
    correct: "事情,工作",
    distractors: ["步行,散步", "学习", "玩耍", "画画", "跳舞"],
    unit: 2
  },
  {
    word: "tomato",
    meaning: "番茄,西红柿",
    context_sentence: "I like tomatoes.",
    cn: "我喜欢番茄。",
    hint: "谐音记忆法 (特麻头 - 番茄长得像特大红肿的麻头)",
    type: "Cn2En",
    prompt: "番茄,西红柿",
    correct: "tomato",
    distractors: ["potato", "tobacco", "tomorrow", "tonight", "teapot"],
    unit: 3
  },

  // Challenge 12 (10 questions)
  {
    word: "noodles",
    meaning: "面条",
    context_sentence: "I like noodles, too.",
    cn: "我也喜欢面条。",
    hint: "谐音记忆法 (怒斗 - 愤怒的小鸟在斗面条)",
    type: "Cloze",
    prompt: "I like ____, too. (提示: 面条)",
    correct: "noodles",
    distractors: ["needles", "poodles", "noodle", "doodles", "rice"],
    unit: 3
  },
  {
    word: "rice",
    meaning: "米;米饭",
    context_sentence: "I like rice, too.",
    cn: "我也喜欢米饭。",
    hint: "谐音记忆法 (白饭 - 吃rice要配白饭)",
    type: "En2Cn",
    prompt: "rice",
    correct: "米;米饭",
    distractors: ["面条", "面包", "汤", "果汁", "蛋糕"],
    unit: 3
  },
  {
    word: "meat",
    meaning: "肉",
    context_sentence: "Meat Fruit",
    cn: "肉类和水果",
    hint: "谐音记忆法 (面特 - 吃面的时候特别喜欢加meat肉)",
    type: "Cn2En",
    prompt: "肉",
    correct: "meat",
    distractors: ["meet", "neat", "seat", "meal", "melt"],
    unit: 3
  },
  {
    word: "why",
    meaning: "为什么",
    context_sentence: "Why do Taotao and Jiajia get up early?",
    cn: "涛涛和佳佳为什么起得早？",
    hint: "谐音记忆法 (外 - 为什么要跑去外面)",
    type: "Cloze",
    prompt: "____ do Taotao and Jiajia get up early? (提示: 为什么)",
    correct: "Why",
    distractors: ["Who", "What", "When", "Where", "How"],
    unit: 3
  },
  {
    word: "time",
    meaning: "时间",
    context_sentence: "Time to get up, children.",
    cn: "孩子们，该起床了。",
    hint: "谐音记忆法 (太慢 - 时间过得太慢了)",
    type: "En2Cn",
    prompt: "time",
    correct: "时间",
    distractors: ["钟表", "团队", "主意", "下午", "上午"],
    unit: 3
  },
  {
    word: "tea",
    meaning: "茶;茶叶",
    context_sentence: "A nice afternoon tea for Grandpa and me!",
    cn: "爷爷和我的一顿美味下午茶！",
    hint: "谐音记忆法 (提 - 提神要喝tea茶)",
    type: "Cloze",
    prompt: "A nice afternoon ____ for Grandpa and me!",
    correct: "tea",
    distractors: ["sea", "ten", "eat", "pea", "team"],
    unit: 3
  },
  {
    word: "week",
    meaning: "星期,周",
    context_sentence: "Every week, under the tree.",
    cn: "每周，在树下。",
    hint: "谐音记忆法 (喂卡 - 这一星期的电话卡要喂满)",
    type: "En2Cn",
    prompt: "week",
    correct: "星期,周",
    distractors: ["月份", "年份", "天,一日", "小时", "分钟"],
    unit: 3
  },
  {
    word: "tree",
    meaning: "树",
    context_sentence: "Every week, under the tree.",
    cn: "每周，在树下。",
    hint: "联想/图像记忆法 (t像树干，r像树枝，ee像树叶)",
    type: "Cloze",
    prompt: "Every week, under the ____.",
    correct: "tree",
    distractors: ["three", "free", "try", "tea", "true"],
    unit: 3
  },
  {
    word: "milk",
    meaning: "奶,牛奶",
    context_sentence: "Milk tea is good.",
    cn: "奶茶很好喝。",
    hint: "谐音记忆法 (眯了口 - 眯了一口牛奶，真香)",
    type: "Cn2En",
    prompt: "奶,牛奶",
    correct: "milk",
    distractors: ["silk", "mile", "mild", "mill", "make"],
    unit: 3
  },
  {
    word: "robot",
    meaning: "机器人",
    context_sentence: "Stan likes making robots.",
    cn: "斯坦喜欢制作机器人。",
    hint: "ro(肉) + bot(波特)，波特吃肉机器人。",
    type: "En2Cn",
    prompt: "robot",
    correct: "机器人",
    distractors: ["风筝", "球", "玩偶", "汽车", "飞机"],
    unit: 4
  },

  // Challenge 13 (10 questions)
  {
    word: "her",
    meaning: "她的",
    context_sentence: "Yuanyuan and her mum's day.",
    cn: "圆圆和她妈妈的一天。",
    hint: "那是她的(her)长头发(hair)。",
    type: "Cloze",
    prompt: "Yuanyuan and ____ mum's day.",
    correct: "her",
    distractors: ["him", "his", "he", "she", "hair"],
    unit: 5
  },
  {
    word: "park",
    meaning: "公园",
    context_sentence: "Sun: go to the park",
    cn: "星期天：去公园",
    hint: "在公园里停(park)车。",
    type: "En2Cn",
    prompt: "park",
    correct: "公园",
    distractors: ["学校", "动物园", "俱乐部", "图书馆", "商店"],
    unit: 6
  },
  {
    word: "football",
    meaning: "足球",
    context_sentence: "Sat: play football",
    cn: "星期六：踢足球",
    hint: "用脚(foot)踢球(ball)。",
    type: "Cn2En",
    prompt: "足球",
    correct: "football",
    distractors: ["basketball", "baseball", "volleyball", "foot", "ballon"],
    unit: 6
  },
  {
    word: "maths",
    meaning: "数学",
    context_sentence: "The blackboard shows Thursday (Maths, Science).",
    cn: "黑板上写着星期四（数学、科学）。",
    hint: "数学妈妈(ma)在做题。",
    type: "En2Cn",
    prompt: "maths",
    correct: "数学",
    distractors: ["科学", "美术,艺术", "英语", "语文", "音乐"],
    unit: 6
  },
  {
    word: "idea",
    meaning: "想法,主意",
    context_sentence: "Good idea!",
    cn: "好主意！",
    hint: "我的(I)的主意(idea)。",
    type: "Cloze",
    prompt: "Good ____!",
    correct: "idea",
    distractors: ["deal", "dear", "ideal", "idol", "identity"],
    unit: 6
  },
  {
    word: "old",
    meaning: "年老的;旧的",
    context_sentence: "Let's go and visit our old friends this Sunday!",
    cn: "这周日我们去拜访我们的老朋友吧！",
    hint: "老的(old)时候很冷(cold)。",
    type: "En2Cn",
    prompt: "old",
    correct: "年老的;旧的",
    distractors: ["年轻的", "新的", "忙碌的", "空闲的", "最好的"],
    unit: 6
  },
  {
    word: "some",
    meaning: "一些,若干",
    context_sentence: "I want to make some bookmarks for Grandma Guo.",
    cn: "我想给郭奶奶做一些书签。",
    hint: "一些(some)人来到了三(sam)里屯。",
    type: "Cloze",
    prompt: "I want to make ____ bookmarks for Grandma Guo.",
    correct: "some",
    distractors: ["same", "come", "home", "sum", "any"],
    unit: 6
  },
  {
    word: "sure",
    meaning: "当然,好的",
    context_sentence: "Dad: Sure.",
    cn: "爸爸：当然可以。",
    hint: "确定(sure)要去海边(shore)。",
    type: "En2Cn",
    prompt: "sure",
    correct: "当然,好的",
    distractors: ["可能,也许", "不对", "错误", "难的", "忙的"],
    unit: 6
  },
  {
    word: "piano",
    meaning: "钢琴",
    context_sentence: "Piano club and painting club!",
    cn: "钢琴俱乐部和绘画俱乐部！",
    hint: "皮(pi)鞋在钢琴上安(an)息。",
    type: "Cn2En",
    prompt: "钢琴",
    correct: "piano",
    distractors: ["photo", "guitar", "violin", "drums", "pencil"],
    unit: 6
  },
  {
    word: "music",
    meaning: "音乐",
    context_sentence: "Music Club: On Monday.",
    cn: "音乐俱乐部：在星期一。",
    hint: "缪斯(mu)女神的音乐(music)。",
    type: "Cloze",
    prompt: "____ Club: On Monday. (提示: 音乐)",
    correct: "Music",
    distractors: ["Museum", "Maths", "Movie", "Magic", "Art"],
    unit: 6
  }
];

const newChallenges = [
  { id: "c11", title: "Challenge 11", icon: "🦁", questions: [] },
  { id: "c12", title: "Challenge 12", icon: "💡", questions: [] },
  { id: "c13", title: "Challenge 13", icon: "🎹", questions: [] }
];

for (let i = 0; i < missingQuestionsData.length; i++) {
  const item = missingQuestionsData[i];
  const challengeIdx = Math.floor(i / 10);
  
  const options = shuffle([item.correct, ...item.distractors]);
  const answerIndex = options.indexOf(item.correct);
  
  const questionObj = {
    id: generateIDA(),
    word: item.word,
    meaning: item.meaning,
    context_sentence: item.context_sentence,
    cn: item.cn,
    hint: item.hint,
    title: "Vocab Master",
    type: item.type,
    prompt: item.prompt,
    options: options,
    answer: answerIndex,
    unit: item.unit
  };
  
  newChallenges[challengeIdx].questions.push(questionObj);
}

masterData.challenges.push(...newChallenges);

fs.writeFileSync(masterPath, JSON.stringify(masterData, null, 2), 'utf8');
console.log('Successfully appended 3 challenges (30 questions) to vocab-master.');

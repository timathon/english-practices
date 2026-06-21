const fs = require('fs');
const path = require('path');

// Helper to generate a unique random 8-character ID
function makeId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// Helper to shuffle array in place
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

const targetDir = path.join(__dirname, '..', 'data', 'A5Bx', 'a5bx-wm3');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Vocab Guide Data
const vocabGuideData = {
  "level": "Grade 5 Semester 2 - Word Magician 3",
  "unit_vocabulary": [
    {
      "word": "pay",
      "meaning": "付款;付钱给(某人)",
      "syllable_type": "元音字母组合音节",
      "comparison": "play, say, day",
      "page_number": "1",
      "context_sentence": "I need to pay some money for the book.",
      "memorization_hook": "谐音法：‘赔’。付款（pay）给别人赔偿。",
      "ipa": "/peɪ/"
    },
    {
      "word": "holiday",
      "meaning": "假期",
      "syllable_type": "hol-i-day",
      "comparison": "holy, day",
      "page_number": "1",
      "context_sentence": "We will have a wonderful holiday this summer.",
      "memorization_hook": "拆分法：holi (好礼) + day (天) -> 假期送好礼的一天。",
      "ipa": "/ˈhɒl.ə.deɪ/"
    },
    {
      "word": "camp",
      "meaning": "活动营地;度假营地",
      "syllable_type": "闭音节",
      "comparison": "lamp, damp",
      "page_number": "1",
      "context_sentence": "We have a happy activity in the summer camp.",
      "memorization_hook": "谐音法：“看铺”。在度假营地看铺子。",
      "ipa": "/kæmp/"
    },
    {
      "word": "ride",
      "meaning": "骑;骑自行车",
      "syllable_type": "相对开音节",
      "comparison": "hide, side, wide",
      "page_number": "1",
      "context_sentence": "I can ride a bike very well.",
      "memorization_hook": "拼读法：r像草，ide像“爱的”，骑着有爱的小车在草地上跑。",
      "ipa": "/raɪd/"
    },
    {
      "word": "skier",
      "meaning": "滑雪者",
      "syllable_type": "ski-er",
      "comparison": "ski, sky",
      "page_number": "1",
      "context_sentence": "The young skier likes skiing in winter.",
      "memorization_hook": "ski (滑雪) + er (人) = 滑雪者。",
      "ipa": "/ˈskiː.ər/"
    },
    {
      "word": "air",
      "meaning": "空气",
      "syllable_type": "元音字母组合音节",
      "comparison": "hair, pair",
      "page_number": "1",
      "context_sentence": "The fresh air makes us feel happy.",
      "memorization_hook": "谐音法：“哎呀”。哎呀，这里的空气真新鲜！",
      "ipa": "/eə/"
    },
    {
      "word": "mean",
      "meaning": "意思是;表示...的意思",
      "syllable_type": "元音字母组合音节",
      "comparison": "meat, bean",
      "page_number": "1",
      "context_sentence": "This word means good luck.",
      "memorization_hook": "谐音法：“面包”。这个面包的意思是美味。",
      "ipa": "/miːn/"
    },
    {
      "word": "British",
      "meaning": "英国的",
      "syllable_type": "Brit-ish",
      "comparison": "bright, fish",
      "page_number": "1",
      "context_sentence": "He is a British boy from England.",
      "memorization_hook": "Brit (不热) + ish (鱼) -> 英国的鱼不怕热。",
      "ipa": "/ˈbrɪt.ɪʃ/"
    },
    {
      "word": "pair",
      "meaning": "一双;一对",
      "syllable_type": "元音字母组合音节",
      "comparison": "fair, hair",
      "page_number": "1",
      "context_sentence": "I buy a new pair of gloves.",
      "memorization_hook": "谐音法：“配耳”。一双耳环要配耳朵。",
      "ipa": "/peə/"
    },
    {
      "word": "building",
      "meaning": "建筑物;楼房",
      "syllable_type": "build-ing",
      "comparison": "build, ding",
      "page_number": "1",
      "context_sentence": "There is a tall building near our school.",
      "memorization_hook": "build (建造) + ing (名词后缀) = 建筑物。",
      "ipa": "/ˈbɪl.dɪŋ/"
    },
    {
      "word": "second",
      "meaning": "第二;秒",
      "syllable_type": "sec-ond",
      "comparison": "seven, send",
      "page_number": "1",
      "context_sentence": "The second day of a week is Tuesday.",
      "memorization_hook": "sec (赛跑) + ond (温的) -> 赛跑得第二，喝杯温水。",
      "ipa": "/ˈsek.ənd/"
    },
    {
      "word": "fall",
      "meaning": "落下;摔倒",
      "syllable_type": "闭音节",
      "comparison": "tall, ball, call",
      "page_number": "1",
      "context_sentence": "Be careful! Don't fall down.",
      "memorization_hook": "谐音法：“扶”。摔倒了（fall）需要别人扶。",
      "ipa": "/fɔːl/"
    },
    {
      "word": "film",
      "meaning": "电影;影片",
      "syllable_type": "闭音节",
      "comparison": "fill, film, milk",
      "page_number": "1",
      "context_sentence": "I watch a funny film with my family.",
      "memorization_hook": "谐音“非梦”。电影里的世界并非梦境。",
      "ipa": "/fɪlm/"
    },
    {
      "word": "June",
      "meaning": "六月",
      "syllable_type": "相对开音节",
      "comparison": "July, June, tune",
      "page_number": "1",
      "context_sentence": "June is the sixth month of a year.",
      "memorization_hook": "Jun (军) + e -> 军人在六月进行大阅兵。",
      "ipa": "/dʒuːn/"
    },
    {
      "word": "hill",
      "meaning": "小山;丘陵",
      "syllable_type": "闭音节",
      "comparison": "will, kill, bill",
      "page_number": "1",
      "context_sentence": "There is a small hill behind our house.",
      "memorization_hook": "h (高) + ill (生病) -> 高高的小山上风大，容易生病。",
      "ipa": "/hɪl/"
    },
    {
      "word": "playground",
      "meaning": "操场",
      "syllable_type": "play-ground",
      "comparison": "play, ground",
      "page_number": "1",
      "context_sentence": "We play games on the playground after school.",
      "memorization_hook": "play (玩耍) + ground (地面) = 玩耍的地方，即操场。",
      "ipa": "/ˈpleɪ.ɡraʊnd/"
    },
    {
      "word": "activity",
      "meaning": "活动",
      "syllable_type": "ac-tiv-i-ty",
      "comparison": "active, city",
      "page_number": "1",
      "context_sentence": "We have an exciting activity in the mountain.",
      "memorization_hook": "active (积极的) + ity (名词后缀) = 活动。",
      "ipa": "/ækˈtɪv.ə.ti/"
    },
    {
      "word": "thousand",
      "meaning": "千",
      "syllable_type": "thou-sand",
      "comparison": "thought, sand",
      "page_number": "1",
      "context_sentence": "There are one thousand people in our school.",
      "memorization_hook": "thou (熟) + sand (沙子) -> 一千粒熟透的沙子。",
      "ipa": "/ˈθaʊ.zənd/"
    },
    {
      "word": "hero",
      "meaning": "英雄",
      "syllable_type": "he-ro",
      "comparison": "here, zero",
      "page_number": "1",
      "context_sentence": "The young man is a great hero.",
      "memorization_hook": "he (他) + ro (肉) -> 他是一身腱子肉的英雄。",
      "ipa": "/ˈhɪə.rəʊ/"
    },
    {
      "word": "nature",
      "meaning": "大自然",
      "syllable_type": "na-ture",
      "comparison": "nation, picture",
      "page_number": "1",
      "context_sentence": "We love beautiful nature very much.",
      "memorization_hook": "na (那) + ture (树儿) -> 大自然里有那万千树儿。",
      "ipa": "/ˈneɪ.tʃər/"
    }
  ]
};

fs.writeFileSync(path.join(targetDir, 'a5bx-wm3-vocab-guide.json'), JSON.stringify(vocabGuideData, null, 2) + "\n", 'utf8');
console.log('✅ Generated a5bx-wm3-vocab-guide.json');

// 2. Vocab Master Generation
const vmQuestions = [];
const wordGuideMap = {};
vocabGuideData.unit_vocabulary.forEach(v => {
    wordGuideMap[v.word] = v;
});

// Let's create questions (Cn2En, En2Cn, Cloze) for all 20 words.
// Total questions target: 20 * 3 = 60. Max 50 questions. Let's round to 50.
const targetQuestionCount = 50;

// Define templates for questions to ensure distractors match semantic category
const semanticCategories = {
    nouns: ["building", "playground", "hill", "nature", "camp", "skier", "hero", "film", "holiday", "pair"],
    verbs: ["pay", "ride", "fall", "mean"],
    other: ["British", "second", "thousand", "air"]
};

function getDistractors(word, type, num = 5) {
    let pool = [];
    if (semanticCategories.nouns.includes(word)) {
        pool = semanticCategories.nouns.filter(w => w !== word);
    } else if (semanticCategories.verbs.includes(word)) {
        pool = semanticCategories.verbs.filter(w => w !== word);
    } else {
        pool = vocabGuideData.unit_vocabulary.map(v => v.word).filter(w => w !== word);
    }
    
    // Add visual/spelling distractors if available
    const guide = wordGuideMap[word];
    if (guide && guide.comparison) {
        const comps = guide.comparison.split(',').map(s => s.trim());
        pool = [...comps, ...pool];
    }
    
    // De-duplicate and slice
    const uniquePool = Array.from(new Set(pool)).filter(w => w.toLowerCase() !== word.toLowerCase());
    return uniquePool.slice(0, num);
}

const rawQuestions = [
    // pay
    { word: "pay", type: "Cloze", prompt: "I need to ____ some money for the book. (提示: 付款)", distractors: ["play", "say", "day", "ride", "fall"] },
    { word: "pay", type: "Cn2En", prompt: "付款;付钱给(某人)", distractors: ["play", "say", "ride", "fall", "mean"] },
    { word: "pay", type: "En2Cn", prompt: "pay", distractors: ["骑", "落下", "意思是", "建造", "滑雪者"] },
    // holiday
    { word: "holiday", type: "Cloze", prompt: "We will have a wonderful ____ this summer. (提示: 假期)", distractors: ["camp", "nature", "building", "playground", "activity"] },
    { word: "holiday", type: "Cn2En", prompt: "假期", distractors: ["camp", "activity", "nature", "playground", "second"] },
    { word: "holiday", type: "En2Cn", prompt: "holiday", distractors: ["活动营地", "活动", "大自然", "操场", "第二"] },
    // camp
    { word: "camp", type: "Cloze", prompt: "We have a happy activity in the summer ____. (提示: 营地)", distractors: ["holiday", "playground", "hill", "building", "nature"] },
    { word: "camp", type: "Cn2En", prompt: "活动营地;度假营地", distractors: ["lamp", "damp", "holiday", "playground", "building"] },
    // ride
    { word: "ride", type: "Cloze", prompt: "I can ____ a bike very well. (提示: 骑)", distractors: ["ride", "hide", "side", "wide", "pay", "fall"] },
    { word: "ride", type: "Cn2En", prompt: "骑;骑自行车", distractors: ["hide", "side", "pay", "fall", "mean"] },
    { word: "ride", type: "En2Cn", prompt: "ride", distractors: ["付款", "摔倒", "意思是", "滑雪", "建造"] },
    // skier
    { word: "skier", type: "Cloze", prompt: "The young ____ likes skiing in winter. (提示: 滑雪者)", distractors: ["ski", "sky", "hero", "British", "nature"] },
    { word: "skier", type: "Cn2En", prompt: "滑雪者", distractors: ["ski", "sky", "hero", "building", "second"] },
    // air
    { word: "air", type: "Cloze", prompt: "The fresh ____ makes us feel happy. (提示: 空气)", distractors: ["hair", "pair", "nature", "hill", "camp"] },
    { word: "air", type: "Cn2En", prompt: "空气", distractors: ["hair", "pair", "nature", "camp", "film"] },
    // mean
    { word: "mean", type: "Cloze", prompt: "This word ____s good luck. (提示: 意思是)", distractors: ["beat", "meat", "bean", "pay", "ride"] },
    { word: "mean", type: "Cn2En", prompt: "意思是;表示...的意思", distractors: ["meat", "bean", "pay", "ride", "fall"] },
    // British
    { word: "British", type: "Cloze", prompt: "He is a ____ boy from England. (提示: 英国的)", distractors: ["bright", "fish", "second", "skier", "hero"] },
    { word: "British", type: "Cn2En", prompt: "英国的", distractors: ["bright", "fish", "second", "skier", "hero"] },
    // pair
    { word: "pair", type: "Cloze", prompt: "I buy a new ____ of gloves. (提示: 一双)", distractors: ["fair", "hair", "air", "thousand", "second"] },
    { word: "pair", type: "Cn2En", prompt: "一双;一对", distractors: ["fair", "hair", "air", "thousand", "second"] },
    // building
    { word: "building", type: "Cloze", prompt: "There is a tall ____ near our school. (提示: 建筑物)", distractors: ["playground", "hill", "camp", "nature", "holiday"] },
    { word: "building", type: "Cn2En", prompt: "建筑物;楼房", distractors: ["playground", "hill", "nature", "holiday", "camp"] },
    // second
    { word: "second", type: "Cloze", prompt: "The ____ day of a week is Tuesday. (提示: 第二)", distractors: ["seven", "send", "thousand", "British", "holiday"] },
    { word: "second", type: "Cn2En", prompt: "第二;秒", distractors: ["seven", "send", "thousand", "British", "holiday"] },
    // fall
    { word: "fall", type: "Cloze", prompt: "Be careful! Don't ____ down. (提示: 摔倒)", distractors: ["tall", "ball", "call", "ride", "pay"] },
    { word: "fall", type: "Cn2En", prompt: "落下;摔倒", distractors: ["tall", "ball", "pay", "ride", "mean"] },
    // film
    { word: "film", type: "Cloze", prompt: "I watch a funny ____ with my family. (提示: 电影)", distractors: ["fill", "milk", "activity", "holiday", "playground"] },
    { word: "film", type: "Cn2En", prompt: "电影;影片", distractors: ["fill", "milk", "activity", "holiday", "playground"] },
    // June
    { word: "June", type: "Cloze", prompt: "____ is the sixth month of a year. (提示: 六月)", distractors: ["July", "tune", "second", "holiday", "British"] },
    { word: "June", type: "Cn2En", prompt: "六月", distractors: ["July", "tune", "second", "holiday", "thousand"] },
    // hill
    { word: "hill", type: "Cloze", prompt: "There is a small ____ behind our house. (提示: 小山)", distractors: ["will", "kill", "bill", "building", "playground"] },
    { word: "hill", type: "Cn2En", prompt: "小山;丘陵", distractors: ["will", "kill", "bill", "building", "playground"] },
    // playground
    { word: "playground", type: "Cloze", prompt: "We play games on the ____ after school. (提示: 操场)", distractors: ["building", "hill", "camp", "nature", "holiday"] },
    { word: "playground", type: "Cn2En", prompt: "操场", distractors: ["building", "hill", "camp", "nature", "holiday"] },
    // activity
    { word: "activity", type: "Cloze", prompt: "We have an exciting ____ in the mountain. (提示: 活动)", distractors: ["active", "city", "holiday", "camp", "film"] },
    { word: "activity", type: "Cn2En", prompt: "活动", distractors: ["active", "city", "holiday", "camp", "film"] },
    // thousand
    { word: "thousand", type: "Cloze", prompt: "There are one ____ people in our school. (提示: 千)", distractors: ["thought", "sand", "second", "British", "pair"] },
    { word: "thousand", type: "Cn2En", prompt: "千", distractors: ["thought", "sand", "second", "British", "pair"] },
    // hero
    { word: "hero", type: "Cloze", prompt: "The young man is a great ____. (提示: 英雄)", distractors: ["here", "zero", "skier", "British", "second"] },
    { word: "hero", type: "Cn2En", prompt: "英雄", distractors: ["here", "zero", "skier", "British", "second"] },
    // nature
    { word: "nature", type: "Cloze", prompt: "We love beautiful ____ very much. (提示: 大自然)", distractors: ["nation", "picture", "hill", "building", "air"] },
    { word: "nature", type: "Cn2En", prompt: "大自然", distractors: ["nation", "picture", "hill", "building", "air"] },
    
    // Additional En2Cn questions to reach 50 questions
    { word: "holiday", type: "En2Cn", prompt: "holiday", distractors: ["操场", "小山", "建筑物", "第二", "千"] },
    { word: "camp", type: "En2Cn", prompt: "camp", distractors: ["大自然", "操场", "滑雪者", "六月", "英国的"] },
    { word: "skier", type: "En2Cn", prompt: "skier", distractors: ["英雄", "电影", "大自然", "操场", "空气"] },
    { word: "air", type: "En2Cn", prompt: "air", distractors: ["大自然", "一双", "小山", "操场", "假期"] },
    { word: "mean", type: "En2Cn", prompt: "mean", distractors: ["付款", "骑", "摔倒", "滑雪", "建造"] },
    { word: "British", type: "En2Cn", prompt: "British", distractors: ["第二", "千", "一双", "空气", "大自然"] },
    { word: "pair", type: "En2Cn", prompt: "pair", distractors: ["千", "第二", "空气", "大自然", "小山"] },
    { word: "building", type: "En2Cn", prompt: "building", distractors: ["操场", "小山", "活动营地", "大自然", "电影"] },
    { word: "second", type: "En2Cn", prompt: "second", distractors: ["千", "英国的", "一双", "空气", "六月"] },
    { word: "fall", type: "En2Cn", prompt: "fall", distractors: ["付款", "骑", "意思是", "击败", "建造"] },
    { word: "film", type: "En2Cn", prompt: "film", distractors: ["活动", "操场", "大自然", "楼房", "小山"] },
    { word: "June", type: "En2Cn", prompt: "June", distractors: ["第二", "千", "假期", "大自然", "英国的"] },
    { word: "hill", type: "En2Cn", prompt: "hill", distractors: ["楼房", "操场", "大自然", "活动", "电影"] },
    { word: "playground", type: "En2Cn", prompt: "playground", distractors: ["楼房", "小山", "大自然", "活动", "假期"] },
    { word: "activity", type: "En2Cn", prompt: "activity", distractors: ["假期", "操场", "大自然", "楼房", "小山"] },
    { word: "thousand", type: "En2Cn", prompt: "thousand", distractors: ["第二", "一双", "空气", "英国的", "六月"] },
    { word: "hero", type: "En2Cn", prompt: "hero", distractors: ["滑雪者", "电影", "大自然", "楼房", "操场"] },
    { word: "nature", type: "En2Cn", prompt: "nature", distractors: ["空气", "小山", "楼房", "操场", "活动"] }
];

const challenges = [
    { id: "c1", title: "Challenge 1", icon: "✨", questions: [] },
    { id: "c2", title: "Challenge 2", icon: "⚡", questions: [] },
    { id: "c3", title: "Challenge 3", icon: "🌟", questions: [] },
    { id: "c4", title: "Challenge 4", icon: "👑", questions: [] },
    { id: "c5", title: "Challenge 5", icon: "🏆", questions: [] }
];

rawQuestions.forEach((qData, i) => {
    const vocab = wordGuideMap[qData.word];
    const correctOption = qData.type === 'En2Cn' ? vocab.meaning : (qData.type === 'Cn2En' ? qData.word : qData.word);
    
    // Correct translation options mapping
    let correctStr = correctOption;
    if (qData.type === 'Cloze') {
        correctStr = qData.word;
    }
    
    const zipped = [correctStr, ...qData.distractors].map((opt, idx) => ({ opt, isCorrect: idx === 0 }));
    const shuffledZipped = shuffle(zipped);
    const options = shuffledZipped.map(z => z.opt);
    const answer = shuffledZipped.findIndex(z => z.isCorrect);

    const questionObj = {
        id: makeId(),
        word: qData.word,
        meaning: vocab.meaning,
        context_sentence: vocab.context_sentence,
        cn: qData.type === 'Cloze' ? vocab.context_sentence : "", // mapping requires cn context
        hint: vocab.memorization_hook,
        title: "Vocab Master",
        type: qData.type,
        prompt: qData.prompt,
        options: options,
        answer: answer
    };

    const challengeIdx = Math.floor(i / 10);
    if (challenges[challengeIdx]) {
        challenges[challengeIdx].questions.push(questionObj);
    }
});

const vmJson = {
    level: "Grade 5 Semester 2 - Word Magician 3",
    title: "Vocab Master",
    challenges: challenges
};

fs.writeFileSync(path.join(targetDir, 'a5bx-wm3-vocab-master.json'), JSON.stringify(vmJson, null, 2) + "\n", 'utf8');
console.log('✅ Generated a5bx-wm3-vocab-master.json');

// 3. Spelling Hero Generation
// Only single words. playground, summer camp, activity, etc.
const spellingWords = [];
vocabGuideData.unit_vocabulary.forEach(v => {
    if (v.word.includes(' ')) return; // Skip phrases (though there are no phrases here, just in case)
    
    // Phonics chunking
    let chunks = [];
    if (v.syllable_type === '闭音节' || v.syllable_type === '相对开音节' || v.syllable_type === '元音字母组合音节' || v.syllable_type === 'r控制音节' || v.syllable_type === '开音节') {
        // Single syllable: split by graphemes
        if (v.word === "pay") {
            chunks = [{ correct: "p", options: shuffle(["p", "b", "t"]) }, { correct: "ay", options: shuffle(["ay", "ai", "ey"]) }];
        } else if (v.word === "camp") {
            chunks = [{ correct: "c", options: shuffle(["c", "k", "s"]) }, { correct: "a", options: shuffle(["a", "e", "o"]) }, { correct: "mp", options: shuffle(["mp", "nd", "nt"]) }];
        } else if (v.word === "ride") {
            chunks = [{ correct: "r", options: shuffle(["r", "l", "w"]) }, { correct: "i", options: shuffle(["i", "y", "e"]) }, { correct: "de", options: shuffle(["de", "te", "d"]) }];
        } else if (v.word === "air") {
            chunks = [{ correct: "air", options: shuffle(["air", "are", "ear"]) }];
        } else if (v.word === "mean") {
            chunks = [{ correct: "m", options: shuffle(["m", "n", "w"]) }, { correct: "ea", options: shuffle(["ea", "ee", "ae"]) }, { correct: "n", options: shuffle(["n", "m", "ng"]) }];
        } else if (v.word === "pair") {
            chunks = [{ correct: "p", options: shuffle(["p", "b", "t"]) }, { correct: "air", options: shuffle(["air", "are", "ear"]) }];
        } else if (v.word === "fall") {
            chunks = [{ correct: "f", options: shuffle(["f", "v", "ph"]) }, { correct: "all", options: shuffle(["all", "oll", "al"]) }];
        } else if (v.word === "film") {
            chunks = [{ correct: "f", options: shuffle(["f", "v", "ph"]) }, { correct: "i", options: shuffle(["i", "e", "y"]) }, { correct: "lm", options: shuffle(["lm", "m", "le"]) }];
        } else if (v.word === "June") {
            chunks = [{ correct: "J", options: shuffle(["J", "G", "Ch"]) }, { correct: "u", options: shuffle(["u", "o", "oo"]) }, { correct: "ne", options: shuffle(["ne", "ni", "n"]) }];
        } else if (v.word === "hill") {
            chunks = [{ correct: "h", options: shuffle(["h", "f", "s"]) }, { correct: "ill", options: shuffle(["ill", "ell", "all"]) }];
        } else {
            // fallback
            chunks = v.word.split('').map(char => ({ correct: char, options: shuffle([char, 'x', 'y']) }));
        }
    } else {
        // Multi-syllable: split by syllables
        if (v.word === "holiday") {
            chunks = [{ correct: "hol", options: shuffle(["hol", "hal", "hul"]) }, { correct: "i", options: shuffle(["i", "e", "a"]) }, { correct: "day", options: shuffle(["day", "dey", "da"]) }];
        } else if (v.word === "skier") {
            chunks = [{ correct: "ski", options: shuffle(["ski", "sky", "ske"]) }, { correct: "er", options: shuffle(["er", "ar", "or"]) }];
        } else if (v.word === "British") {
            chunks = [{ correct: "Brit", options: shuffle(["Brit", "Bret", "Brat"]) }, { correct: "ish", options: shuffle(["ish", "esh", "ich"]) }];
        } else if (v.word === "building") {
            chunks = [{ correct: "build", options: shuffle(["build", "bild", "bield"]) }, { correct: "ing", options: shuffle(["ing", "eng", "ink"]) }];
        } else if (v.word === "second") {
            chunks = [{ correct: "sec", options: shuffle(["sec", "sac", "sic"]) }, { correct: "ond", options: shuffle(["ond", "and", "end"]) }];
        } else if (v.word === "playground") {
            chunks = [{ correct: "play", options: shuffle(["play", "pley", "playe"]) }, { correct: "ground", options: shuffle(["ground", "grownd", "grond"]) }];
        } else if (v.word === "activity") {
            chunks = [{ correct: "ac", options: shuffle(["ac", "ec", "at"]) }, { correct: "tiv", options: shuffle(["tiv", "tev", "tyv"]) }, { correct: "i", options: shuffle(["i", "e", "a"]) }, { correct: "ty", options: shuffle(["ty", "tie", "tey"]) }];
        } else if (v.word === "thousand") {
            chunks = [{ correct: "thou", options: shuffle(["thou", "thow", "tho"]) }, { correct: "sand", options: shuffle(["sand", "send", "sond"]) }];
        } else if (v.word === "hero") {
            chunks = [{ correct: "he", options: shuffle(["he", "ha", "hi"]) }, { correct: "ro", options: shuffle(["ro", "row", "ra"]) }];
        } else if (v.word === "nature") {
            chunks = [{ correct: "na", options: shuffle(["na", "ne", "no"]) }, { correct: "ture", options: shuffle(["ture", "cher", "sure"]) }];
        } else {
            // fallback
            chunks = v.word.split('').map(char => ({ correct: char, options: shuffle([char, 'x', 'y']) }));
        }
    }
    
    spellingWords.push({
        id: makeId(),
        word: v.word,
        meaning: v.meaning.split(';')[0].split('(')[0].trim(),
        type: (v.syllable_type.includes('-') || v.word === "playground") ? "multi-syllable" : "single-syllable",
        chunks: chunks
    });
});

const shJson = {
    level: "Grade 5 Semester 2 - Word Magician 3",
    title: "Spelling Master",
    spelling_words: spellingWords
};

fs.writeFileSync(path.join(targetDir, 'a5bx-wm3-spelling-hero.json'), JSON.stringify(shJson, null, 2) + "\n", 'utf8');
console.log('✅ Generated a5bx-wm3-spelling-hero.json');

// 4. Sentence Architect Generation
const saChallenges = [
    {
      id: "c1",
      title: "Daily Life & Activities",
      icon: "✨",
      data: [
        { en: "I need to pay some money for the book.", cn: "我需要付一些书钱。", hint: "pay money for... / 为...付钱", noise: ["paid", "books"] },
        { en: "I can ride a bike very well.", cn: "我自行车骑得很好。", hint: "can + verb base form / 情态动词加动词原形", noise: ["riding", "good"] },
        { en: "I buy a new pair of gloves.", cn: "我买了一双新手套。", hint: "a new pair of / 一双新的", noise: ["pairs", "glove"] },
        { en: "There is a tall building near our school.", cn: "我们学校附近有一栋高楼。", hint: "There is + singular noun / there be 句型表示有", noise: ["are", "buildings"] },
        { en: "Be careful! Don't fall down.", cn: "当心！别摔倒。", hint: "Don't + verb base form / 否定祈使句", noise: ["falling", "not"] },
        { en: "I watch a funny film with my family.", cn: "我和我的家人看了一部搞笑电影。", hint: "watch a film with sb. / 和某人一起看电影", noise: ["watching", "funny's"] },
        { en: "We play games on the playground after school.", cn: "放学后我们在操场上玩游戏。", hint: "on the playground / 在操场上", noise: ["in", "playgrounds"] },
        { en: "We love beautiful nature very much.", cn: "我们非常热爱美丽的大自然。", hint: "love... very much / 非常喜欢...", noise: ["beautifully", "natures"] },
        { en: "I paid some money for the film.", cn: "我付了看电影的钱。", hint: "paid (pay的过去式) / 过去发生的动作", noise: ["pay", "films"] },
        { en: "We rode bikes on the playground.", cn: "我们在操场上骑了自行车。", hint: "rode (ride的过去式) / 过去发生的动作", noise: ["ride", "playgrounds"] }
      ]
    },
    {
      id: "c2",
      title: "Holidays & Nature",
      icon: "🏖️",
      data: [
        { en: "We will have a wonderful holiday this summer.", cn: "今年夏天我们将度过一个美好的假期。", hint: "will + have / 将要拥有", noise: ["had", "holidays"] },
        { en: "We have a happy activity in the summer camp.", cn: "我们在夏令营里有一个快乐的活动。", hint: "in the summer camp / 在夏令营里", noise: ["on", "camps"] },
        { en: "The young skier likes skiing in winter.", cn: "这位年轻的滑雪者喜欢在冬天滑雪。", hint: "likes doing / 喜欢做某事", noise: ["like", "skiers"] },
        { en: "The fresh air makes us feel happy.", cn: "新鲜的空气让我们感到高兴。", hint: "make sb. do / 让某人做某事", noise: ["making", "feels"] },
        { en: "There is a small hill behind our house.", cn: "我们家后面有一座小山。", hint: "behind our house / 在我们家后面", noise: ["hills", "are"] },
        { en: "We have an exciting activity in the mountain.", cn: "我们在山里有一项令人兴奋的活动。", hint: "exciting / 令人兴奋的", noise: ["excited", "activities"] },
        { en: "He camped on the hill.", cn: "他在小山上宿营了。", hint: "camped (camp的过去式) / 过去发生的动作", noise: ["camp", "hills"] },
        { en: "The fresh air in nature is good.", cn: "大自然中新鲜的空气很好。", hint: "air in nature / 大自然中的空气", noise: ["are", "natures"] },
        { en: "My family went to England for holiday.", cn: "我的家人去英国度假了。", hint: "went (go的过去式) / 过去发生的动作", noise: ["go", "holidays"] },
        { en: "Many skiers love beautiful nature.", cn: "许多滑雪者热爱美丽的大自然。", hint: "skiers / 滑雪者（复数）", noise: ["skier", "beautifully"] }
      ]
    },
    {
      id: "c3",
      title: "Time, Numbers & People",
      icon: "⏰",
      data: [
        { en: "He is a British boy from England.", cn: "他是一个来自英国的英国男孩。", hint: "British / 英国的，来自英国", noise: ["Britain", "boys"] },
        { en: "The second day of a week is Tuesday.", cn: "一周的第二天是星期二。", hint: "second / 第二", noise: ["first", "weeks"] },
        { en: "June is the sixth month of a year.", cn: "六月是一年中的第六个月。", hint: "June / 六月，首字母大写", noise: ["june", "months"] },
        { en: "There are one thousand people in our school.", cn: "我们学校有一千人。", hint: "one thousand / 一千", noise: ["thousands", "is"] },
        { en: "The young man is a great hero.", cn: "这个年轻男子是一位伟大的英雄。", hint: "a great hero / 一位伟大的英雄", noise: ["heroes", "are"] },
        { en: "The British skier won the game.", cn: "那位英国滑雪者赢得了比赛。", hint: "won (win的过去式) / 赢了", noise: ["win", "skiers"] },
        { en: "The weather became very hot in June.", cn: "六月份天气变得非常热。", hint: "became (become的过去式)", noise: ["become", "hotter"] },
        { en: "A thousand people watched the match.", cn: "一千人观看了这场比赛。", hint: "watched / 观看了", noise: ["watch", "matches"] },
        { en: "The second month of a year is February.", cn: "一年中的第二个月是二月。", hint: "February / 二月", noise: ["february", "months"] },
        { en: "There is a new playground near the building.", cn: "这栋楼附近有一个新操场。", hint: "near the building / 在这栋楼附近", noise: ["are", "buildings"] }
      ]
    },
    {
      id: "c4",
      title: "Past Events & Grammar",
      icon: "📜",
      data: [
        { en: "He rode a bike yesterday.", cn: "他昨天骑了自行车。", hint: "rode (ride的过去式) / 过去发生的动作", noise: ["ride", "riding"] },
        { en: "They camped in the park last weekend.", cn: "他们上周末在公园宿营了。", hint: "camped (camp的过去式) / 过去时间状语 last weekend", noise: ["camp", "camping"] },
        { en: "The girl fell down just now.", cn: "那个女孩刚才摔倒了。", hint: "fell (fall的过去式) / 过去时间状语 just now", noise: ["fall", "falling"] },
        { en: "We became happy last winter.", cn: "我们去年冬天变得快乐了。", hint: "became (become的过去式)", noise: ["become", "becoming"] },
        { en: "Our team beat the game yesterday.", cn: "我们队昨天赢了比赛。", hint: "beat / 击败，赢了", noise: ["beating", "beats"] },
        { en: "We saw many brave heroes in the film.", cn: "我们在电影里看到了很多勇敢的英雄。", hint: "saw (see的过去式)", noise: ["see", "hero"] },
        { en: "We will have an exciting activity next week.", cn: "下周我们将举行一项令人兴奋的活动。", hint: "an exciting activity / 令人兴奋的活动", noise: ["a", "activities"] },
        { en: "The children camped in the forest.", cn: "孩子们在森林里宿营了。", hint: "camped / 宿营了", noise: ["camp", "forests"] },
        { en: "We walked up the green hill yesterday.", cn: "我们昨天走上了绿色的山丘。", hint: "walked up / 向上走", noise: ["walk", "hills"] },
        { en: "I rode a bike to school this morning.", cn: "我今天早上骑自行车去上学。", hint: "this morning / 今天早上", noise: ["ride", "schools"] }
      ]
    },
    {
      id: "c5",
      title: "Plurals & Meanings",
      icon: "📚",
      data: [
        { en: "This word means good luck.", cn: "这个词的意思是好运。", hint: "means / 意思是，第三人称单数", noise: ["mean", "luck's"] },
        { en: "There are many tall buildings in the city.", cn: "城市里有许多高楼大厦。", hint: "many tall buildings / 许多高楼", noise: ["building", "is"] },
        { en: "I have two pairs of shoes.", cn: "我有两双鞋。", hint: "two pairs of / 两双", noise: ["pair", "shoe"] },
        { en: "Many skiers go skiing every year.", cn: "许多滑雪者每年都去滑雪。", hint: "Many skiers / 许多滑雪者", noise: ["skier", "goes"] },
        { en: "The story has many brave heroes.", cn: "这个故事有许多勇敢的英雄。", hint: "heroes / 英雄（复数，词尾加es）", noise: ["heros", "have"] },
        { en: "There are some books in the library.", cn: "图书馆里有一些书。", hint: "some books / 一些书", noise: ["book", "is"] },
        { en: "A new pair of shoes is on the table.", cn: "一双新鞋在桌子上。", hint: "a new pair of shoes / 一双新鞋（主语是a pair，谓语用is）", noise: ["are", "shoe"] },
        { en: "He fell down from the tall building.", cn: "他从那栋高楼上摔了下来。", hint: "fell down from... / 从...摔下来", noise: ["fall", "buildings"] },
        { en: "What does this difficult word mean?", cn: "这个难懂的字是什么意思？", hint: "What does... mean? / ...是什么意思？", noise: ["means", "do"] },
        { en: "She bought two pairs of gloves yesterday.", cn: "她昨天买了两双手套。", hint: "bought (buy的过去式) / 过去发生的动作", noise: ["buy", "glove"] }
      ]
    }
];

const ipaDict = {};
vocabGuideData.unit_vocabulary.forEach(v => {
    ipaDict[v.word] = v.ipa.replace(/^\/|\/$/g, "");
});

const saJson = {
    title: "Word Magician 3",
    level: "Grade 5 Semester 2",
    primaryColor: "#8b5cf6",
    primaryColorDark: "#6d28d9",
    storageSuffix: "_a5bx_wm3",
    passcode: "DHTPP",
    ipaDict: ipaDict,
    challenges: saChallenges.map(c => {
        return {
            id: c.id,
            title: c.title,
            icon: c.icon,
            data: c.data.map(d => {
                return {
                    id: makeId(),
                    en: d.en,
                    cn: d.cn,
                    hint: d.hint,
                    noise: d.noise,
                    accept: []
                };
            })
        };
    })
};

fs.writeFileSync(path.join(targetDir, 'a5bx-wm3-sentence-architect.json'), JSON.stringify(saJson, null, 2) + "\n", 'utf8');
console.log('✅ Generated a5bx-wm3-sentence-architect.json');

// 5. Recall Map Generation
const rmJson = {
    level: "Grade 5 Semester 2",
    part: "Word Magician 3",
    tree: {
      id: "root",
      text: "Word Magician 3",
      emoji: "🪄",
      state: "emoji",
      children: [
        {
          id: "stories",
          text: "Practice Sentences",
          emoji: "📝",
          state: "hidden",
          children: [
            { id: "s_p1", text: "Pay money for the book", emoji: "💵" },
            { id: "s_p2", text: "Wonderful summer holiday", emoji: "🏖️" },
            { id: "s_p3", text: "Exciting camp activity", emoji: "🏕️" },
            { id: "s_p4", text: "Ride a bike very well", emoji: "🚲" },
            { id: "s_p5", text: "Young skier likes skiing", emoji: "⛷️" },
            { id: "s_p6", text: "Tall building near school", emoji: "🏢" }
          ]
        },
        {
          id: "vocabulary",
          text: "Vocabulary Map",
          emoji: "🔤",
          state: "hidden",
          children: [
            {
              id: "v_nouns",
              text: "Nouns (名词)",
              emoji: "🎒",
              state: "hidden",
              children: [
                { id: "v_holiday", text: "holiday (假期)", emoji: "🏖️" },
                { id: "v_camp", text: "camp (营地)", emoji: "🏕️" },
                { id: "v_skier", text: "skier (滑雪者)", emoji: "⛷️" },
                { id: "v_building", text: "building (建筑物)", emoji: "🏢" },
                { id: "v_playground", text: "playground (操场)", emoji: "🛝" },
                { id: "v_nature", text: "nature (大自然)", emoji: "🌲" },
                { id: "v_hero", text: "hero (英雄)", emoji: "🦸" }
              ]
            },
            {
              id: "v_verbs",
              text: "Verbs (动词)",
              emoji: "🏃",
              state: "hidden",
              children: [
                { id: "v_pay", text: "pay (付款)", emoji: "💵" },
                { id: "v_ride", text: "ride (骑)", emoji: "🚲" },
                { id: "v_fall", text: "fall (摔倒)", emoji: "⚠️" },
                { id: "v_mean", text: "mean (意思是)", emoji: "ℹ️" }
              ]
            }
          ]
        },
        {
          id: "grammar",
          text: "Grammar Rules",
          emoji: "💡",
          state: "hidden",
          children: [
            { id: "g_past", text: "Past Simple Tense (rode, fell, became, camped)", emoji: "⏳" },
            { id: "g_plural", text: "Plural Nouns (buildings, pairs, skiers, heroes)", emoji: "👥" }
          ]
        }
      ]
    }
};

fs.writeFileSync(path.join(targetDir, 'a5bx-wm3-recall-map.json'), JSON.stringify(rmJson, null, 2) + "\n", 'utf8');
console.log('✅ Generated a5bx-wm3-recall-map.json');

// 6. Grammar Wizard Generation
const gwChallenges = [
    {
      id: "c1",
      title: "Past Simple Tense",
      icon: "🧙‍♂️",
      questions: [
        {
          id: makeId(),
          type: "multiple-choice",
          category: "usage",
          prompt: "完成句子：He ______ a bike to school yesterday.",
          options: ["rode", "ride", "rides", "riding"],
          answer: 0,
          explanation: "yesterday提示句子应该使用一般过去时，ride的过去式是rode。",
          hint: "注意过去时间状语yesterday。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "formation",
          prompt: "完成句子：They ______ in the park last weekend.",
          options: ["camped", "camp", "camps", "camping"],
          answer: 0,
          explanation: "last weekend提示句子应该使用一般过去时，规则动词camp的过去式在词尾加ed，即camped。",
          hint: "规则动词变过去式直接在词尾加ed。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "usage",
          prompt: "完成句子：The girl ______ down and hurt herself just now.",
          options: ["fell", "fall", "falls", "falling"],
          answer: 0,
          explanation: "just now意为“刚才”，是过去时的时间标志词，fall的过去式是fell。",
          hint: "注意时间词“just now”意为“刚才”。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "differentiation",
          prompt: "完成句子：We ______ happy when we heard the news last winter.",
          options: ["became", "become", "becomes", "becoming"],
          answer: 0,
          explanation: "last winter提示句子应该使用一般过去时，become的过去式是became。",
          hint: "连系动词become的过去式是became。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "differentiation",
          prompt: "完成句子：Our team ______ the other team and won the game yesterday.",
          options: ["beat", "beats", "beating", "beaten"],
          answer: 0,
          explanation: "yesterday提示一般过去时，动词beat的过去式形式和原形相同，仍然是beat。",
          hint: "注意不规则动词beat的过去式与原形一样。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "usage",
          prompt: "完成句子：I watch a funny film? 改写成过去时：I ______ a funny film yesterday.",
          options: ["watched", "watch", "watches", "watching"],
          answer: 0,
          explanation: "一般过去时中，规则动词watch变过去式直接加ed，即watched。",
          hint: "规则动词watch变过去式加ed。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "usage",
          prompt: "完成句子：She ______ to England for her holiday last summer.",
          options: ["went", "go", "goes", "going"],
          answer: 0,
          explanation: "last summer提示一般过去时，go的过去式是不规则变化went。",
          hint: "go的过去式是went。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "differentiation",
          prompt: "完成句子：We ______ some money for the books just now.",
          options: ["paid", "pay", "pays", "paying"],
          answer: 0,
          explanation: "just now意为“刚才”，提示使用一般过去时，pay的过去式是不规则变化paid。",
          hint: "pay的过去式是paid。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "usage",
          prompt: "完成句子：He ______ a tall building near our school last night.",
          options: ["saw", "see", "sees", "seeing"],
          answer: 0,
          explanation: "last night提示一般过去时，see的过去式是不规则变化saw。",
          hint: "see的过去式是saw。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "formation",
          prompt: "完成句子：The children ______ games on the playground yesterday afternoon.",
          options: ["played", "play", "plays", "playing"],
          answer: 0,
          explanation: "yesterday afternoon提示使用一般过去时，play的过去式在词尾加ed，即played。",
          hint: "规则动词play变过去式直接加ed。"
        }
      ]
    },
    {
      id: "c2",
      title: "Plurals of Nouns",
      icon: "⚡",
      questions: [
        {
          id: makeId(),
          type: "multiple-choice",
          category: "formation",
          prompt: "完成句子：There are many tall ______ in the city.",
          options: ["buildings", "building", "build", "builds"],
          answer: 0,
          explanation: "many修饰可数名词复数，building的复数形式是在词尾直接加s，即buildings。",
          hint: "可数名词building变复数直接加s。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "usage",
          prompt: "完成句子：I bought two ______ of shoes yesterday.",
          options: ["pairs", "pair", "pares", "pair's"],
          answer: 0,
          explanation: "two修饰可数名词复数，pair的复数是在词尾加s，即pairs。",
          hint: "表示“两双”用two pairs of。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "formation",
          prompt: "完成句子：Many ______ go skiing in winter.",
          options: ["skiers", "skier", "skies", "skier's"],
          answer: 0,
          explanation: "many修饰可数名词复数，skier（滑雪者）的复数形式是skiers。",
          hint: "skier的复数形式直接加s。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "formation",
          prompt: "完成句子：The story has many brave ______.",
          options: ["heroes", "heros", "hero", "hero's"],
          answer: 0,
          explanation: "以o结尾的名词变复数，有生命的加es，无生命的加s。hero（英雄）是有生命的，所以加es，即heroes。",
          hint: "记住口诀：黑人英雄爱吃土豆西红柿（以o结尾有生命的名词加es）。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "formation",
          prompt: "完成句子：There are some ______ in the library.",
          options: ["books", "book", "bookes", "book's"],
          answer: 0,
          explanation: "some在此修饰可数名词复数，book的复数直接加s，即books。",
          hint: "可数名词book变复数直接加s。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "differentiation",
          prompt: "完成句子：A new pair of shoes ______ on the table.",
          options: ["is", "are", "be", "am"],
          answer: 0,
          explanation: "当a pair of...作主语时，其谓语动词的单复数取决于pair的单复数。本题中是a pair（单数），故谓语动词用is。",
          hint: "主语是a new pair，表示单数。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "differentiation",
          prompt: "完成句子：Two pairs of shoes ______ under the bed.",
          options: ["are", "is", "be", "am"],
          answer: 0,
          explanation: "当pairs of...作主语时，主语中心词是pairs（复数），因此谓语动词用are。",
          hint: "主语中心词是two pairs，表示复数。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "formation",
          prompt: "完成句子：June and July are two ______ of a year.",
          options: ["months", "monthes", "month", "month's"],
          answer: 0,
          explanation: "two修饰可数名词复数，month变复数直接加s，即months。",
          hint: "month的复数形式直接加s。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "formation",
          prompt: "完成句子：We can see many green ______ behind the house.",
          options: ["hills", "hill", "hilles", "hill's"],
          answer: 0,
          explanation: "many修饰可数名词复数，hill的复数形式是hills。",
          hint: "hill变复数直接加s。"
        },
        {
          id: makeId(),
          type: "multiple-choice",
          category: "definition",
          prompt: "完成句子：There are two ______ students in our school.",
          options: ["thousand", "thousands", "thousandes", "thousand's"],
          answer: 0,
          explanation: "thousand/hundred等数词前有具体数字修饰时，用单数形式表示确切数目。例如：two thousand（两千）。",
          hint: "具体数字 + thousand + 名词复数。"
        }
      ]
    }
];

const gwJson = {
    level: "Grade 5 Semester 2 - Word Magician 3",
    title: "Grammar Wizard",
    challenges: gwChallenges.map(c => {
        return {
            id: c.id,
            title: c.title,
            icon: c.icon,
            questions: c.questions.map(q => {
                // Shuffle options and fix correct answer index
                const correctText = q.options[q.answer];
                const shuffledOpts = shuffle(q.options);
                const answerIdx = shuffledOpts.indexOf(correctText);
                return {
                    id: q.id,
                    type: q.type,
                    category: q.category,
                    prompt: q.prompt,
                    options: shuffledOpts,
                    answer: answerIdx,
                    explanation: q.explanation,
                    hint: q.hint
                };
            })
        };
    })
};

fs.writeFileSync(path.join(targetDir, 'a5bx-wm3-grammar-wizard.json'), JSON.stringify(gwJson, null, 2) + "\n", 'utf8');
console.log('✅ Generated a5bx-wm3-grammar-wizard.json');

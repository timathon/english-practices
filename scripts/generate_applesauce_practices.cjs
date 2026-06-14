const fs = require('fs');
const path = require('path');
const { processFile } = require('./add_passage_decoder_highlights.cjs');

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

const bookFolder = "raz-b-applesauce";
const targetDir = path.join(__dirname, '..', 'data', 'RAZ-B', bookFolder);

// Vocab Guide source
const vocabGuide = {
  "some": { meaning: "一些 (pron.)", ipa: "/sʌm/", hint: "so（如此）+ me（我）-> 如此多的苹果中，分给我一些", sentence: "Some are red.", cnSentence: "一些是红色的。" },
  "red": { meaning: "红色的 (adj.)", ipa: "/red/", hint: "r（热）+ ed（额）-> 额头热得发红", sentence: "Some are red.", cnSentence: "一些是红色的。" },
  "green": { meaning: "绿色的 (adj.)", ipa: "/ɡriːn/", hint: "g（哥）+ ree（绿树）+ n（南面）-> 哥哥看到绿树在南面", sentence: "Some are green.", cnSentence: "一些是绿色的。" },
  "yellow": { meaning: "黄色的 (adj.)", ipa: "/ˈjeləʊ/", hint: "yel（大喊）+ low（低声）-> 看到黄色的大叫一声，然后低声耳语", sentence: "Some are yellow.", cnSentence: "一些是黄色的。" },
  "cut": { meaning: "切; 割 (v.)", ipa: "/kʌt/", hint: "cu（醋）+ t（桶）-> 用刀把醋桶切开", sentence: "Cut the apples.", cnSentence: "切苹果。" },
  "cook": { meaning: "煮; 烹饪 (v.)", ipa: "/kʊk/", hint: "coo（酷）+ k（客）-> 酷酷的客人喜欢自己烹饪", sentence: "Cook the apples.", cnSentence: "煮苹果。" },
  "mash": { meaning: "捣碎; 捣成泥 (v.)", ipa: "/mæʃ/", hint: "ma（妈妈）+ sh（手）-> 妈妈用手把苹果捣碎", sentence: "Mash the apples.", cnSentence: "捣碎苹果。" },
  "add": { meaning: "增加; 添加 (v.)", ipa: "/æd/", hint: "ad（广告）+ d（多）-> 广告添加得越来越多", sentence: "Add cinnamon?", cnSentence: "加肉桂吗？" },
  "cinnamon": { meaning: "肉桂 (n.)", ipa: "/ˈsɪnəmən/", hint: "cin（信）+ na（那）+ mon（门）-> 那扇门上写着信，信里装有肉桂", sentence: "Add cinnamon?", cnSentence: "加肉桂吗？" },
  "applesauce": { meaning: "苹果酱 (n.)", ipa: "/ˈæplˌsɔːs/", hint: "apple（苹果）+ sauce（酱）-> 苹果做成的酱就是苹果酱", sentence: "Applesauce!", cnSentence: "苹果酱！" },
  "apples": { meaning: "苹果 (n. plural)", ipa: "/ˈæplz/", hint: "ap（阿婆）+ ple（皮）+ s（们）-> 阿婆给苹果们削皮", sentence: "Cut the apples.", cnSentence: "切苹果。" }
};

// 1. Generate Vocab Master
function generateVocabMaster() {
  const questionsList = [
    // Challenge 1
    {
      word: "some",
      type: "Cn2En",
      prompt: "一些 (pron.)",
      options: ["some", "same", "come", "home", "more", "many"]
    },
    {
      word: "red",
      type: "Cloze",
      prompt: "Some are ____. (提示: 红色的)",
      options: ["red", "blue", "black", "white", "green", "yellow"]
    },
    {
      word: "green",
      type: "En2Cn",
      prompt: "green",
      options: ["绿色的", "红色的", "蓝色的", "黄色的", "白色的", "黑色的"]
    },
    {
      word: "green",
      type: "Cloze",
      prompt: "Some are ____. (提示: 绿色的)",
      options: ["green", "great", "greet", "grey", "grass", "grow"]
    },
    {
      word: "yellow",
      type: "Cn2En",
      prompt: "黄色的",
      options: ["yellow", "fellow", "pillow", "hallow", "shallow", "yell"]
    },
    {
      word: "some",
      type: "En2Cn",
      prompt: "some",
      options: ["一些", "相同的", "来", "家", "更多的", "许多"]
    },
    {
      word: "yellow",
      type: "Cloze",
      prompt: "Some are ____. (提示: 黄色的)",
      options: ["yellow", "fellow", "pillow", "hallow", "bellow", "mellow"]
    },
    {
      word: "red",
      type: "Cn2En",
      prompt: "红色的",
      options: ["red", "bed", "fed", "led", "read", "ride"]
    },
    {
      word: "yellow",
      type: "En2Cn",
      prompt: "yellow",
      options: ["黄色的", "绿色的", "红色的", "蓝色的", "白色的", "粉色的"]
    },
    {
      word: "green",
      type: "Cn2En",
      prompt: "绿色的",
      options: ["green", "greet", "great", "grey", "greenish", "grass"]
    },

    // Challenge 2
    {
      word: "cut",
      type: "Cloze",
      prompt: "____ the apples. (提示: 切)",
      options: ["Cut", "Cook", "Mash", "Add", "Eat", "Bake"]
    },
    {
      word: "cook",
      type: "Cn2En",
      prompt: "煮; 烹饪",
      options: ["cook", "book", "look", "took", "bake", "boil"]
    },
    {
      word: "mash",
      type: "En2Cn",
      prompt: "mash",
      options: ["捣碎; 捣成泥", "切; 割", "烹饪; 煮", "增加; 添加", "搅拌", "吃"]
    },
    {
      word: "cook",
      type: "Cloze",
      prompt: "____ the apples. (提示: 烹饪; 煮)",
      options: ["Cook", "Cut", "Mash", "Add", "Wash", "Eat"]
    },
    {
      word: "add",
      type: "Cn2En",
      prompt: "添加; 增加",
      options: ["add", "sad", "bad", "mad", "and", "aid"]
    },
    {
      word: "cut",
      type: "En2Cn",
      prompt: "cut",
      options: ["切; 割", "煮; 烹饪", "捣碎", "添加", "咬", "喝"]
    },
    {
      word: "mash",
      type: "Cloze",
      prompt: "____ the apples. (提示: 捣碎)",
      options: ["Mash", "Cut", "Cook", "Add", "Wash", "Stir"]
    },
    {
      word: "cut",
      type: "Cn2En",
      prompt: "切; 割",
      options: ["cut", "but", "nut", "put", "bit", "cat"]
    },
    {
      word: "cook",
      type: "En2Cn",
      prompt: "cook",
      options: ["煮; 烹饪", "切", "捣碎", "添加", "看", "拿"]
    },
    {
      word: "mash",
      type: "Cn2En",
      prompt: "捣碎; 捣成泥",
      options: ["mash", "wash", "dash", "cash", "make", "smash"]
    },

    // Challenge 3
    {
      word: "add",
      type: "Cloze",
      prompt: "____ cinnamon? (提示: 添加)",
      options: ["Add", "And", "Aid", "Ask", "Cut", "Cook"]
    },
    {
      word: "cinnamon",
      type: "Cn2En",
      prompt: "肉桂",
      options: ["cinnamon", "cinnamon powder", "coconuts", "common", "canyon", "cabin"]
    },
    {
      word: "applesauce",
      type: "En2Cn",
      prompt: "applesauce",
      options: ["苹果酱", "苹果", "肉桂", "糖浆", "果汁", "沙拉"]
    },
    {
      word: "cinnamon",
      type: "Cloze",
      prompt: "Add ____? (提示: 肉桂)",
      options: ["cinnamon", "coconut", "common", "commonplace", "commonality", "canyon"]
    },
    {
      word: "applesauce",
      type: "Cn2En",
      prompt: "苹果酱",
      options: ["applesauce", "apples", "sauce", "pineapple", "apricot", "applesauce cake"]
    },
    {
      word: "cinnamon",
      type: "En2Cn",
      prompt: "cinnamon",
      options: ["肉桂", "柠檬", "可可", "生姜", "大蒜", "香草"]
    },
    {
      word: "applesauce",
      type: "Cloze",
      prompt: "____! (提示: 苹果酱)",
      options: ["Applesauce", "Apples", "Sauce", "Pineapple", "Apricot", "Juice"]
    },
    {
      word: "apples",
      type: "Cn2En",
      prompt: "苹果",
      options: ["apples", "applesauce", "pineapple", "apricots", "peaches", "pears"]
    },
    {
      word: "apples",
      type: "En2Cn",
      prompt: "apples",
      options: ["苹果", "苹果酱", "梨", "桃子", "香蕉", "橙子"]
    },
    {
      word: "add",
      type: "En2Cn",
      prompt: "add",
      options: ["增加; 添加", "减少", "切", "煮", "捣碎", "吃"]
    }
  ];

  const challenges = [
    { id: "c1", title: "Challenge 1", icon: "🍎", questions: [] },
    { id: "c2", title: "Challenge 2", icon: "🍳", questions: [] },
    { id: "c3", title: "Challenge 3", icon: "🥣", questions: [] }
  ];

  for (let i = 0; i < questionsList.length; i++) {
    const qData = questionsList[i];
    const vocab = vocabGuide[qData.word];
    
    // Shuffle options and map to new correct index
    const zipped = qData.options.map((opt, idx) => ({ opt, isCorrect: idx === 0 }));
    const shuffledZipped = shuffle(zipped);
    const options = shuffledZipped.map(z => z.opt);
    const answer = shuffledZipped.findIndex(z => z.isCorrect);

    const questionObj = {
      id: makeId(),
      word: qData.word,
      meaning: vocab.meaning,
      context_sentence: vocab.sentence,
      cn: vocab.cnSentence,
      hint: vocab.hint,
      title: "Vocab Master",
      type: qData.type,
      prompt: qData.prompt,
      options: options,
      answer: answer
    };

    const challengeIdx = Math.floor(i / 10);
    challenges[challengeIdx].questions.push(questionObj);
  }

  const vmJson = {
    level: "RAZ Level B",
    title: "Vocab Master",
    challenges: challenges
  };

  fs.writeFileSync(path.join(targetDir, "raz-b-applesauce-vocab-master.json"), JSON.stringify(vmJson, null, 2) + "\n", "utf8");
}

// 2. Generate Spelling Hero
function generateSpellingHero() {
  const wordsList = [
    { word: "some", type: "single-syllable", chunks: [{ correct: "s", opts: ["s", "c", "t"] }, { correct: "o", opts: ["o", "a", "u"] }, { correct: "me", opts: ["me", "ne", "pe"] }] },
    { word: "red", type: "single-syllable", chunks: [{ correct: "r", opts: ["r", "l", "w"] }, { correct: "e", opts: ["e", "a", "i"] }, { correct: "d", opts: ["d", "t", "b"] }] },
    { word: "green", type: "single-syllable", chunks: [{ correct: "gr", opts: ["gr", "gl", "pr"] }, { correct: "ee", opts: ["ee", "ea", "oo"] }, { correct: "n", opts: ["n", "m", "ng"] }] },
    { word: "yellow", type: "multi-syllable", chunks: [{ correct: "yel", opts: ["yel", "yal", "yil"] }, { correct: "low", opts: ["low", "law", "lew"] }] },
    { word: "cut", type: "single-syllable", chunks: [{ correct: "c", opts: ["c", "k", "s"] }, { correct: "u", opts: ["u", "a", "o"] }, { correct: "t", opts: ["t", "d", "p"] }] },
    { word: "cook", type: "single-syllable", chunks: [{ correct: "c", opts: ["c", "k", "g"] }, { correct: "oo", opts: ["oo", "ou", "oa"] }, { correct: "k", opts: ["k", "g", "ck"] }] },
    { word: "mash", type: "single-syllable", chunks: [{ correct: "m", opts: ["m", "n", "w"] }, { correct: "a", opts: ["a", "e", "o"] }, { correct: "sh", opts: ["sh", "ch", "th"] }] },
    { word: "add", type: "single-syllable", chunks: [{ correct: "a", opts: ["a", "e", "u"] }, { correct: "dd", opts: ["dd", "tt", "pp"] }] },
    { word: "cinnamon", type: "multi-syllable", chunks: [{ correct: "cin", opts: ["cin", "sin", "cen"] }, { correct: "na", opts: ["na", "ne", "no"] }, { correct: "mon", opts: ["mon", "man", "mun"] }] },
    { word: "applesauce", type: "multi-syllable", chunks: [{ correct: "ap", opts: ["ap", "ep", "op"] }, { correct: "ple", opts: ["ple", "ble", "tle"] }, { correct: "sauce", opts: ["sauce", "sause", "soce"] }] },
    { word: "apples", type: "multi-syllable", chunks: [{ correct: "ap", opts: ["ap", "ep", "op"] }, { correct: "ples", opts: ["ples", "bles", "tles"] }] }
  ];

  const spellingWords = wordsList.map(w => {
    const vocabObj = vocabGuide[w.word];
    const chunkObjs = w.chunks.map(ch => {
      // Correct element must be in options, shuffle options
      return {
        correct: ch.correct,
        options: shuffle(ch.opts)
      };
    });

    return {
      id: makeId(),
      word: w.word,
      meaning: vocabObj.meaning.split(" ")[0], // remove (v.), (n.)
      type: w.type,
      chunks: chunkObjs
    };
  });

  const shJson = {
    level: "RAZ Level B",
    title: "Spelling Master",
    spelling_words: spellingWords
  };

  fs.writeFileSync(path.join(targetDir, "raz-b-applesauce-spelling-hero.json"), JSON.stringify(shJson, null, 2) + "\n", "utf8");
}

// 3. Generate Sentence Architect
function generateSentenceArchitect() {
  const ipaDict = {};
  for (const [w, obj] of Object.entries(vocabGuide)) {
    ipaDict[w] = obj.ipa.replace(/^\/|\/$/g, "");
  }

  const challengesData = [
    {
      id: "c1",
      title: "Colors of Apples",
      icon: "🍎",
      data: [
        { en: "Some are red.", cn: "一些是红色的。", hint: "Subject 'Some' is plural here / 这里的 Some 是复数形式", noise: ["is", "reds"] },
        { en: "Some are green.", cn: "一些是绿色的。", hint: "Use 'are' for plural subject / 复数主语用 are", noise: ["greens", "a"] },
        { en: "Some are yellow.", cn: "一些是黄色的。", hint: "Some + are + yellow", noise: ["yellows", "the"] },
        { en: "Some apples are red.", cn: "一些苹果是红色的。", hint: "Apples + are + red / 苹果是红色的", noise: ["apple", "is"] },
        { en: "Some apples are green.", cn: "一些苹果是绿色的。", hint: "Some + apples + are / 一些苹果是...", noise: ["apple", "am"] },
        { en: "Some apples are yellow.", cn: "一些苹果是黄色的。", hint: "Some + plural noun / Some 后面加复数名词", noise: ["yellows", "an"] },
        { en: "The apples are red.", cn: "苹果是红色的。", hint: "Use 'The' to specify / 用 The 特指这些苹果", noise: ["is", "reds"] },
        { en: "The apples are green.", cn: "苹果是绿色的。", hint: "The apples + are / 苹果是...", noise: ["a", "greens"] },
        { en: "The apples are yellow.", cn: "苹果是黄色的。", hint: "The apples + are / 苹果是...", noise: ["yellows", "in"] },
        { en: "Some are not red.", cn: "一些不是红色的。", hint: "Add 'not' after 'are' / 在 are 之后加 not", noise: ["no", "reds"] }
      ]
    },
    {
      id: "c2",
      title: "Making Applesauce",
      icon: "🍳",
      data: [
        { en: "Cut the apples.", cn: "切苹果。", hint: "Action word at the start / 祈使句动词开头", noise: ["apple", "cuts"] },
        { en: "Cook the apples.", cn: "煮苹果。", hint: "Action word at the start / 祈使句动词开头", noise: ["cooks", "thes"] },
        { en: "Mash the apples.", cn: "捣碎苹果。", hint: "Action word at the start / 祈使句动词开头", noise: ["mashes", "an"] },
        { en: "Cut some apples.", cn: "切一些苹果。", hint: "Cut + some + apples", noise: ["apple", "cuts"] },
        { en: "Cook some apples.", cn: "煮一些苹果。", hint: "Cook + some + apples", noise: ["cooks", "a"] },
        { en: "Mash some apples.", cn: "捣碎一些苹果。", hint: "Mash + some + apples", noise: ["mashes", "in"] },
        { en: "Cut the green apples.", cn: "切绿苹果。", hint: "Color adjective before noun / 颜色形容词放在名词前", noise: ["greens", "apple"] },
        { en: "Cook the red apples.", cn: "煮红苹果。", hint: "Color adjective before noun / 颜色形容词放在名词前", noise: ["reds", "cooks"] },
        { en: "Mash the yellow apples.", cn: "捣碎黄苹果。", hint: "Color adjective before noun / 颜色形容词放在名词前", noise: ["yellows", "a"] },
        { en: "Cut and cook the apples.", cn: "切并煮苹果。", hint: "Join two verbs with 'and' / 用 and 连接两个动词", noise: ["or", "applesauce"] }
      ]
    },
    {
      id: "c3",
      title: "Adding Flavour & Questions",
      icon: "❓",
      data: [
        { en: "Add cinnamon?", cn: "加肉桂吗？", hint: "Simple question / 简单问句，注意问号", noise: ["adds", "cinnamons"] },
        { en: "Do not add cinnamon.", cn: "不要加肉桂。", hint: "Negative command with 'Do not' / 用 Do not 开头的否定祈使句", noise: ["not's", "no"] },
        { en: "Do you add cinnamon?", cn: "你加肉桂吗？", hint: "Start with 'Do' / Do 开头的一般疑问句", noise: ["Does", "cinnamons"] },
        { en: "Cut the apples first.", cn: "先切苹果。", hint: "Put adverb at the end / 副词 first 放句末", noise: ["firsts", "apple"] },
        { en: "Cook the apples next.", cn: "接着煮苹果。", hint: "Put adverb at the end / 副词 next 放句末", noise: ["nexts", "thes"] },
        { en: "Is the applesauce yellow?", cn: "苹果酱是黄色的吗？", hint: "Start with 'Is' for singular / 单数主语疑问句 Is 开头", noise: ["Are", "yellows"] },
        { en: "Is the applesauce red?", cn: "苹果酱是红色的吗？", hint: "Start with 'Is' / Is 开头的疑问句", noise: ["Are", "reds"] },
        { en: "Are the apples green?", cn: "苹果是绿色的吗？", hint: "Use 'Are' for plural apples / 复数主语疑问句 Are 开头", noise: ["Is", "greens"] },
        { en: "Are the apples red?", cn: "苹果是红色的吗？", hint: "Use 'Are' for plural / 复数用 Are", noise: ["Is", "reds"] },
        { en: "Are the apples yellow?", cn: "苹果是黄色的吗？", hint: "Use 'Are' for plural / 复数用 Are", noise: ["Is", "yellows"] }
      ]
    },
    {
      id: "c4",
      title: "Simple Variations",
      icon: "🥗",
      data: [
        { en: "The red apples are sweet.", cn: "红苹果是甜的。", hint: "Sweet means 甜的 / apples are sweet", noise: ["sweets", "is"] },
        { en: "The green apples are sour.", cn: "绿苹果是酸的。", hint: "Sour means 酸的 / apples are sour", noise: ["sours", "am"] },
        { en: "Mash the hot apples.", cn: "捣碎热苹果。", hint: "Hot adjective before noun / 形容词 hot 放在名词前", noise: ["hots", "apple"] },
        { en: "Cook the apples in a pot.", cn: "在锅里煮苹果。", hint: "Pot means 锅 / in a pot 在锅里", noise: ["on", "pots"] },
        { en: "Some apples are green and yellow.", cn: "一些苹果是绿黄相间的。", hint: "Join two colors with 'and' / 用 and 连接两个颜色", noise: ["or", "apple"] },
        { en: "Some apples are red and green.", cn: "一些苹果是红绿相间的。", hint: "Join two colors with 'and' / 用 and 连接两个颜色", noise: ["but", "apple"] },
        { en: "We cut the apples.", cn: "我们切苹果。", hint: "We + verb / 我们...", noise: ["cuts", "us"] },
        { en: "We cook the apples.", cn: "我们煮苹果。", hint: "We + verb / 我们...", noise: ["cooks", "our"] },
        { en: "We mash the apples.", cn: "我们捣碎苹果。", hint: "We + verb / 我们...", noise: ["mashes", "us"] },
        { en: "We like applesauce!", cn: "我们喜欢苹果酱！", hint: "Like + noun / 喜欢某物", noise: ["likes", "sauce"] }
      ]
    },
    {
      id: "c5",
      title: "Review & Mixed",
      icon: "🏁",
      data: [
        { en: "Applesauce is good.", cn: "苹果酱很好吃。", hint: "Uncountable noun uses 'is' / 不可数名词用 is", noise: ["are", "goods"] },
        { en: "I like red apples.", cn: "我喜欢红苹果。", hint: "I + like + red + apples", noise: ["likes", "apple"] },
        { en: "I like green apples.", cn: "我喜欢绿苹果。", hint: "I + like + green + apples", noise: ["likes", "apple"] },
        { en: "I like yellow apples.", cn: "我喜欢黄苹果。", hint: "I + like + yellow + apples", noise: ["likes", "apple"] },
        { en: "She likes applesauce.", cn: "她喜欢苹果酱。", hint: "Third person singular adds -s / 第三人称单数动词加 -s", noise: ["like", "her"] },
        { en: "He likes applesauce.", cn: "他喜欢苹果酱。", hint: "Third person singular adds -s / 第三人称单数动词加 -s", noise: ["like", "him"] },
        { en: "Add some cinnamon.", cn: "添加一些肉桂。", hint: "Add + some + cinnamon", noise: ["adds", "cinnamons"] },
        { en: "Do you like applesauce?", cn: "你喜欢苹果酱吗？", hint: "Do you + like / 你喜欢...吗？", noise: ["Does", "likes"] },
        { en: "Cook and mash the apples.", cn: "煮并捣碎苹果。", hint: "Cook + and + mash / 煮和捣碎", noise: ["or", "apple"] },
        { en: "Applesauce!", cn: "苹果酱！", hint: "Single word exclamation / 单字感叹句", noise: ["apple", "sauce"] }
      ]
    }
  ];

  const challenges = challengesData.map(ch => {
    const dataItems = ch.data.map(item => {
      return {
        id: makeId(),
        en: item.en,
        cn: item.cn,
        hint: item.hint,
        noise: item.noise,
        accept: item.accept || []
      };
    });

    return {
      id: ch.id,
      title: ch.title,
      icon: ch.icon,
      data: dataItems
    };
  });

  const passcode = challenges.map(c => c.title.charAt(0)).join("");

  const saJson = {
    title: "Applesauce",
    level: "RAZ-B",
    primaryColor: "#3b82f6", // beautiful blue
    primaryColorDark: "#1d4ed8",
    storageSuffix: "_raz_b_applesauce",
    passcode: passcode,
    ipaDict: ipaDict,
    challenges: challenges
  };

  fs.writeFileSync(path.join(targetDir, "raz-b-applesauce-sentence-architect.json"), JSON.stringify(saJson, null, 2) + "\n", "utf8");
}

// 4. Generate Recall Map
function generateRecallMap() {
  const rmJson = {
    level: "RAZ-B",
    part: "Applesauce",
    tree: {
      id: "root",
      text: "Applesauce",
      emoji: "🥣",
      state: "emoji",
      children: [
        {
          id: "stories",
          text: "Stories",
          emoji: "📖",
          state: "hidden",
          children: [
            { id: "s1", text: "Some apples are red", emoji: "🔴" },
            { id: "s2", text: "Some apples are green", emoji: "🟢" },
            { id: "s3", text: "Some apples are yellow", emoji: "🟡" },
            { id: "s4", text: "Cut, cook and mash apples", emoji: "🍳" },
            { id: "s5", text: "Add cinnamon", emoji: "🧉" },
            { id: "s6", text: "Enjoy applesauce", emoji: "🥣" }
          ]
        },
        {
          id: "vocabulary",
          text: "Vocabulary",
          emoji: "🔤",
          state: "hidden",
          children: [
            {
              id: "v_nouns",
              text: "Nouns (Things) (名词)",
              emoji: "🎒",
              state: "hidden",
              children: [
                { id: "v_applesauce", text: "applesauce (苹果酱)", emoji: "🥣" },
                { id: "v_cinnamon", text: "cinnamon (肉桂)", emoji: "🧉" },
                { id: "v_apples", text: "apples (苹果)", emoji: "🍎" }
              ]
            },
            {
              id: "v_verbs",
              text: "Verbs (Actions) (动词)",
              emoji: "🏃",
              state: "hidden",
              children: [
                { id: "v_cut", text: "cut (切;割)", emoji: "🔪" },
                { id: "v_cook", text: "cook (煮;烹饪)", emoji: "🍳" },
                { id: "v_mash", text: "mash (捣碎)", emoji: "🥔" },
                { id: "v_add", text: "add (添加)", emoji: "➕" }
              ]
            },
            {
              id: "v_phrases",
              text: "Adjectives & Pronouns (形容词与代词)",
              emoji: "💬",
              state: "hidden",
              children: [
                { id: "v_some", text: "some (一些)", emoji: "🔢" },
                { id: "v_red", text: "red (红色的)", emoji: "🔴" },
                { id: "v_green", text: "green (绿色的)", emoji: "🟢" },
                { id: "v_yellow", text: "yellow (黄色的)", emoji: "🟡" }
              ]
            }
          ]
        },
        {
          id: "grammar",
          text: "Grammar Focus",
          emoji: "💡",
          state: "hidden",
          children: [
            { id: "g_pattern1", text: "Some are [color]. (一些是...的)", emoji: "🍎" },
            { id: "g_pattern2", text: "[Verb] the apples. (切/煮/捣碎苹果)", emoji: "🔪" },
            { id: "g_pattern3", text: "Add [noun]? (添加...吗？)", emoji: "❓" }
          ]
        }
      ]
    }
  };

  fs.writeFileSync(path.join(targetDir, "raz-b-applesauce-recall-map.json"), JSON.stringify(rmJson, null, 2) + "\n", "utf8");
}

// 5. Generate Text Navigator
function generateTextNavigator() {
  const tnJson = {
    level: "RAZ-B",
    part: "Applesauce",
    section: "Main Story",
    tree: {
      id: "root",
      text: "Applesauce",
      cn: "苹果酱",
      notes: "",
      statement: "这本书主要讲述了如何用不同颜色的苹果来制作苹果酱。",
      answer: true,
      explanation: "书中提到了红、绿、黄三种颜色的苹果，并展示了切、煮、捣碎及添加肉桂制作苹果酱的步骤。",
      emoji: "🥣",
      keywords: "",
      children: [
        {
          id: "p3",
          text: "Some are red.",
          cn: "一些是红色的。",
          notes: "some 一些；red 红色的",
          statement: "本句中的 are 是单数系动词形式。",
          answer: false,
          explanation: "are 是复数系动词，这里修饰复数概念的苹果（Some = Some apples）。",
          emoji: "🔴",
          keywords: "some, red",
          children: []
        },
        {
          id: "p4",
          text: "Some are green.",
          cn: "一些是绿色的。",
          notes: "green 绿色的",
          statement: "Some are green 意思是：一些是绿色的。",
          answer: true,
          explanation: "一些苹果是绿色的。",
          emoji: "🟢",
          keywords: "some, green",
          children: []
        },
        {
          id: "p5",
          text: "Some are yellow.",
          cn: "一些是黄色的。",
          notes: "yellow 黄色的",
          statement: "yellow 这个单词是红色的意思。",
          answer: false,
          explanation: "yellow 是黄色的，red 才是红色的。",
          emoji: "🟡",
          keywords: "some, yellow",
          children: []
        },
        {
          id: "p6",
          text: "Cut the apples.",
          cn: "切苹果。",
          notes: "cut 切；apples 苹果（复数）",
          statement: "因为有多个苹果，所以使用复数形式 apples。",
          answer: true,
          explanation: "apple 是单数，复数形式在词尾加 s 成为 apples。",
          emoji: "🔪",
          keywords: "cut, apples",
          children: []
        },
        {
          id: "p7",
          text: "Cook the apples.",
          cn: "煮苹果。",
          notes: "cook 煮，烹饪",
          statement: "cook 在这里表示“捣碎”的意思。",
          answer: false,
          explanation: "cook 表示煮、烹饪，捣碎是 mash。",
          emoji: "🍳",
          keywords: "cook, apples",
          children: []
        },
        {
          id: "p8",
          text: "Mash the apples.",
          cn: "捣碎苹果。",
          notes: "mash 捣碎，捣成泥",
          statement: "Mash the apples 表达的是把煮熟的苹果捣成泥。",
          answer: true,
          explanation: "mash 是把食物捣烂、捣碎的意思。",
          emoji: "🥔",
          keywords: "mash, apples",
          children: []
        },
        {
          id: "p9",
          text: "Add cinnamon?",
          cn: "加肉桂吗？",
          notes: "add 添加；cinnamon 肉桂",
          statement: "add 在句中作名词表示“苹果”。",
          answer: false,
          explanation: "add 是动词，表示添加。肉桂是 cinnamon。",
          emoji: "🧉",
          keywords: "add, cinnamon",
          children: []
        },
        {
          id: "p10",
          text: "Applesauce!",
          cn: "苹果酱！",
          notes: "applesauce 苹果酱（不可数名词）",
          statement: "applesauce 意思是苹果酱。",
          answer: true,
          explanation: "applesauce 指苹果泥、苹果酱。",
          emoji: "🥣",
          keywords: "applesauce",
          children: []
        }
      ]
    }
  };

  fs.writeFileSync(path.join(targetDir, "raz-b-applesauce-text-navigator.json"), JSON.stringify(tnJson, null, 2) + "\n", "utf8");
}

// 6. Generate Passage Decoder
function generatePassageDecoder() {
  const pdJson = {
    level: "RAZ-B",
    title: "Passage Decoder",
    sections: [
      {
        title: "Main Story",
        sentences: [
          {
            id: makeId(),
            en: "Some are red.",
            options: shuffle(["一些是红色的。", "一些是绿色的。", "一些是黄色的。"]),
            answer: 0, // placeholder, we will calculate below
            newline: true
          },
          {
            id: makeId(),
            en: "Some are green.",
            options: shuffle(["一些是绿色的。", "一些是红色的。", "一些是黄色的。"]),
            answer: 0,
            newline: true
          },
          {
            id: makeId(),
            en: "Some are yellow.",
            options: shuffle(["一些是黄色的。", "一些是红色的。", "一些是绿色的。"]),
            answer: 0,
            newline: true
          },
          {
            id: makeId(),
            en: "Cut the apples.",
            options: shuffle(["切苹果。", "煮苹果。", "捣碎苹果。"]),
            answer: 0,
            newline: true
          },
          {
            id: makeId(),
            en: "Cook the apples.",
            options: shuffle(["煮苹果。", "切苹果。", "捣碎苹果。"]),
            answer: 0,
            newline: true
          },
          {
            id: makeId(),
            en: "Mash the apples.",
            options: shuffle(["捣碎苹果。", "切苹果。", "煮苹果。"]),
            answer: 0,
            newline: true
          },
          {
            id: makeId(),
            en: "Add cinnamon?",
            options: shuffle(["加肉桂吗？", "加白糖吗？", "加蜂蜜吗？"]),
            answer: 0,
            newline: true
          },
          {
            id: makeId(),
            en: "Applesauce!",
            options: shuffle(["苹果酱！", "苹果派！", "苹果汁！"]),
            answer: 0,
            newline: true
          }
        ]
      }
    ]
  };

  // Fix correct answer index for shuffled options
  pdJson.sections[0].sentences.forEach(s => {
    let correctText = "";
    if (s.en === "Some are red.") correctText = "一些是红色的。";
    else if (s.en === "Some are green.") correctText = "一些是绿色的。";
    else if (s.en === "Some are yellow.") correctText = "一些是黄色的。";
    else if (s.en === "Cut the apples.") correctText = "切苹果。";
    else if (s.en === "Cook the apples.") correctText = "煮苹果。";
    else if (s.en === "Mash the apples.") correctText = "捣碎苹果。";
    else if (s.en === "Add cinnamon?") correctText = "加肉桂吗？";
    else if (s.en === "Applesauce!") correctText = "苹果酱！";

    s.answer = s.options.indexOf(correctText);
  });

  const targetPath = path.join(targetDir, "raz-b-applesauce-passage-decoder-s.json");
  fs.writeFileSync(targetPath, JSON.stringify(pdJson, null, 2) + "\n", "utf8");
  console.log(`Generated basic PD at: ${targetPath}`);

  // Inject Highlights using add_passage_decoder_highlights.cjs logic
  const vocabPath = path.join(targetDir, "raz-b-applesauce-vocab-guide.json");
  processFile(vocabPath, targetPath);
}

// Run all
generateVocabMaster();
generateSpellingHero();
generateSentenceArchitect();
generateRecallMap();
generateTextNavigator();
generatePassageDecoder();

console.log("🍏 Successfully generated all applesauce practice JSON files!");

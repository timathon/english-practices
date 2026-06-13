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

const unitFolder = path.join(__dirname, '..', 'data', 'A9', 'a9-u14');
if (!fs.existsSync(unitFolder)) {
    fs.mkdirSync(unitFolder, { recursive: true });
}

// ----------------------------------------------------
// 1. Vocabulary Guide
// ----------------------------------------------------
const unitVocabulary = [
    {
        word: "survey",
        meaning: "调查 (n.)",
        page_number: 105,
        context_sentence: "At junior high school, I remember doing a school survey.",
        ipa: "/ˈsɜːveɪ/",
        comparison: "survey vs servant",
        syllable_type: "sur-vey",
        memorization_hook: "sur（表面）+ vey（看作way，道路）-> 在道路表面进行实地考察，也就是调查。"
    },
    {
        word: "standard",
        meaning: "标准; 水平 (n.)",
        page_number: 105,
        context_sentence: "I always did my homework carefully to meet his standards.",
        ipa: "/ˈstændəd/",
        comparison: "standard vs standing",
        syllable_type: "stan-dard",
        memorization_hook: "stan（看作stand，站立）+ dard（看作hard，努力）-> 站得稳，需要有硬性标准。"
    },
    {
        word: "row",
        meaning: "一排; 一列; 一行 (n.)",
        page_number: 105,
        context_sentence: "I remember scoring two goals in a row during a soccer competition.",
        ipa: "/rəʊ/",
        comparison: "row vs raw",
        syllable_type: "元音字母组合音节 (Vowel Team)",
        memorization_hook: "r（人）+ ow（哦，我）-> 人们排成一排，哦！"
    },
    {
        word: "in a row",
        meaning: "连续几次地 (phr.)",
        page_number: 105,
        context_sentence: "I remember scoring two goals in a row during a soccer competition.",
        ipa: "/ɪn ə rəʊ/",
        comparison: "in a row vs in a line",
        syllable_type: "in a row",
        memorization_hook: "in a row 原意为排成一排，引申为连续发生、连续几次地。"
    },
    {
        word: "keyboard",
        meaning: "键盘式电子乐器; 键盘 (n.)",
        page_number: 105,
        context_sentence: "I have learned to play the keyboard in music class.",
        ipa: "/ˈkiːbɔːd/",
        comparison: "keyboard vs keycard",
        syllable_type: "key-board",
        memorization_hook: "key（键/钥匙）+ board（板）-> 带有许多琴键的板子就是键盘。"
    },
    {
        word: "method",
        meaning: "方法; 措施 (n.)",
        page_number: 106,
        context_sentence: "Someone liked Mr. Hunt's teaching methods.",
        ipa: "/ˈmeθəd/",
        comparison: "method vs metal",
        syllable_type: "meth-od",
        memorization_hook: "me（我）+ thod（看作thought，想法）-> 我的想法就是解决问题的方法。"
    },
    {
        word: "instruction",
        meaning: "指示; 命令 (n.)",
        page_number: 106,
        context_sentence: "He gave really clear instructions during P.E. class.",
        ipa: "/ɪnˈstrʌkʃn/",
        comparison: "instruction vs construction",
        syllable_type: "in-struc-tion",
        memorization_hook: "in（在内）+ struct（建造，结构）+ ion（名词后缀）-> 内部进行结构建造的指导，也就是指示。"
    },
    {
        word: "double",
        meaning: "加倍; 是……的两倍 (v.); 两倍的 (adj.)",
        page_number: 106,
        context_sentence: "Because of her, I put in more effort and my exam scores doubled.",
        ipa: "/ˈdʌbl/",
        comparison: "double vs doubt",
        syllable_type: "dou-ble",
        memorization_hook: "dou（都）+ ble（看作able，能够）-> 大家都能做两倍，加倍。"
    },
    {
        word: "shall",
        meaning: "将要; 将会 (modal v.)",
        page_number: 106,
        context_sentence: "Shall we get each of them a card and gift to say thank you?",
        ipa: "/ʃæl/",
        comparison: "shall vs shell",
        syllable_type: "闭音节 (Closed)",
        memorization_hook: "sh（沙）+ all（所有）-> 沙滩上的所有人都将要出发。"
    },
    {
        word: "look back at",
        meaning: "回首(往事); 回忆; 回顾 (phr.)",
        page_number: 107,
        context_sentence: "Looking back at these past three years I remember many things.",
        ipa: "/lʊk bæk æt/",
        comparison: "look back at vs look down at",
        syllable_type: "look back at",
        memorization_hook: "look（看）+ back（向后）+ at（指向）-> 往回看，就是回首往事。"
    },
    {
        word: "overcome",
        meaning: "克服; 战胜 (v.)",
        page_number: 107,
        context_sentence: "The many long hours of training, pride of overcoming fear.",
        ipa: "/ˌəʊvəˈkʌm/",
        comparison: "overcome vs overcoat",
        syllable_type: "o-ver-come",
        memorization_hook: "over（越过）+ come（来）-> 走过来并跨越它，就是克服。"
    },
    {
        word: "make a mess",
        meaning: "弄得一团糟; 一塌糊涂 (phr.)",
        page_number: 107,
        context_sentence: "Preparing for art festivals and making a great big mess.",
        ipa: "/meɪk ə mes/",
        comparison: "make a mess vs make a guess",
        syllable_type: "make a mess",
        memorization_hook: "make（做）+ a + mess（混乱）-> 制造混乱，弄得一团糟。"
    },
    {
        word: "graduate",
        meaning: "毕业; 获得学位 (v.)",
        page_number: 107,
        context_sentence: "And now it's time to graduate, we will leave our lovely school.",
        ipa: "/ˈɡrædʒueɪt/",
        comparison: "graduate vs gratitude",
        syllable_type: "grad-u-ate",
        memorization_hook: "grad（步，级）+ u + ate（动词后缀）-> 跨出人生的一个新台阶，也就是毕业。"
    },
    {
        word: "keep one's cool",
        meaning: "沉住气; 保持冷静 (phr.)",
        page_number: 107,
        context_sentence: "I can't believe it's been three years, I'm trying to keep my cool.",
        ipa: "/kiːp wʌnz kuːl/",
        comparison: "keep one's cool vs keep one's word",
        syllable_type: "keep one's cool",
        memorization_hook: "keep（保持）+ cool（冷静）-> 保持冷静，沉住气。"
    },
    {
        word: "caring",
        meaning: "体贴人的; 关心他人的 (adj.)",
        page_number: 107,
        context_sentence: "I'll miss the school trees and flowers and our kind and caring teachers.",
        ipa: "/ˈkeərɪŋ/",
        comparison: "caring vs carrying",
        syllable_type: "car-ing",
        memorization_hook: "care（关心）+ ing（形容词后缀）-> 充满关心的，体贴人的。"
    },
    {
        word: "ours",
        meaning: "我们的 (pron.)",
        page_number: 107,
        context_sentence: "Wonderful memories of ours.",
        ipa: "/ˈaʊəz/",
        comparison: "ours vs hours",
        syllable_type: "元音字母组合音节 (Vowel Team)",
        memorization_hook: "our（我们的）+ s -> 我们的东西/回忆。"
    },
    {
        word: "senior",
        meaning: "级别(或地位)高的 (adj.)",
        page_number: 108,
        context_sentence: "I'm looking forward to going to senior high school.",
        ipa: "/ˈsiːniə(r)/",
        comparison: "senior vs sensor",
        syllable_type: "se-nior",
        memorization_hook: "se（色）+ nior（看作near，靠近）-> 颜色很深，说明是资深的、高级的。"
    },
    {
        word: "senior high",
        meaning: "高中 (phr.)",
        page_number: 108,
        context_sentence: "I'm looking forward to going to senior high school.",
        ipa: "/ˈsiːniə(r) haɪ/",
        comparison: "senior high vs junior high",
        syllable_type: "se-nior high",
        memorization_hook: "senior（高级的）+ high（school的简写，中学）-> 高级中学，即高中。"
    },
    {
        word: "text",
        meaning: "课文; 文本 (n.)",
        page_number: 108,
        context_sentence: "I had problems with pronunciation and reading texts.",
        ipa: "/tekst/",
        comparison: "text vs test",
        syllable_type: "闭音节 (Closed)",
        memorization_hook: "te（特）+ xt（看作next，下一个）-> 特别阅读下一篇课文。"
    },
    {
        word: "go by",
        meaning: "(时间)逝去; 过去 (phr.)",
        page_number: 108,
        context_sentence: "I can't believe how fast the time went by!",
        ipa: "/ɡəʊ baɪ/",
        comparison: "go by vs go on",
        syllable_type: "go by",
        memorization_hook: "go（走）+ by（经过）-> 走过去，即（时间）逝去。"
    },
    {
        word: "level",
        meaning: "水平 (n.)",
        page_number: 108,
        context_sentence: "This year, with Mr. Trent's help, my English level has been improving.",
        ipa: "/ˈlevl/",
        comparison: "level vs lever",
        syllable_type: "lev-el",
        memorization_hook: "le（乐）+ vel（看作well，好）-> 快乐地上升到很好的水平。"
    },
    {
        word: "degree",
        meaning: "(大学)学位; 度数; 程度 (n.)",
        page_number: 109,
        context_sentence: "I hope to get a business degree and become a manager.",
        ipa: "/dɪˈɡriː/",
        comparison: "degree vs decree",
        syllable_type: "de-gree",
        memorization_hook: "de（低下）+ gree（看作agree，同意）-> 大家都同意给你颁发这个学位。"
    },
    {
        word: "manager",
        meaning: "经理; 经营者 (n.)",
        page_number: 109,
        context_sentence: "I hope to get a business degree and become a manager.",
        ipa: "/ˈmænɪdʒə(r)/",
        comparison: "manager vs manage",
        syllable_type: "man-ag-er",
        memorization_hook: "manage（管理）+ er（人）-> 管理事务的人，也就是经理。"
    },
    {
        word: "believe in",
        meaning: "信任; 信赖 (phr.)",
        page_number: 109,
        context_sentence: "Mrs. Chen believes in all of them and tells them to \"go for it\".",
        ipa: "/bɪˈliːv ɪn/",
        comparison: "believe in vs believe that",
        syllable_type: "be-lieve in",
        memorization_hook: "believe（相信）+ in（在...里）-> 相信一个人内心的能力，也就是信任、信赖。"
    },
    {
        word: "gentleman",
        meaning: "先生; 绅士 (n.)",
        page_number: 110,
        context_sentence: "Ladies and gentlemen, thank you for coming today.",
        ipa: "/ˈdʒentlmən/",
        comparison: "gentleman vs gentlewoman",
        syllable_type: "gen-tle-man",
        memorization_hook: "gentle（温和的）+ man（男人）-> 温和优雅的男人就是绅士、先生。"
    },
    {
        word: "graduation",
        meaning: "毕业 (n.)",
        page_number: 110,
        context_sentence: "Thank you for coming today to attend the graduation ceremony.",
        ipa: "/ˌɡrædʒuˈeɪʃn/",
        comparison: "graduation vs gradual",
        syllable_type: "grad-u-a-tion",
        memorization_hook: "graduate（毕业，动词）+ ion（名词后缀）-> 毕业。"
    },
    {
        word: "ceremony",
        meaning: "典礼; 仪式 (n.)",
        page_number: 110,
        context_sentence: "Thank you for coming today to attend the graduation ceremony.",
        ipa: "/ˈserəməni/",
        comparison: "ceremony vs harmony",
        syllable_type: "cer-e-mo-ny",
        memorization_hook: "ce（策）+ re（热）+ mony（看作money，钱）-> 策划了一场很热闹很花钱的典礼。"
    },
    {
        word: "first of all",
        meaning: "首先 (phr.)",
        page_number: 110,
        context_sentence: "First of all, I'd like to congratulate all the students.",
        ipa: "/fɜːst ɒv ɔːl/",
        comparison: "first of all vs at first",
        syllable_type: "first of all",
        memorization_hook: "first（第一）+ of all（在所有人/事物中）-> 首先。"
    },
    {
        word: "congratulate",
        meaning: "祝贺 (v.)",
        page_number: 110,
        context_sentence: "First of all, I'd like to congratulate all the students.",
        ipa: "/kənˈɡrætʃuleɪt/",
        comparison: "congratulate vs conversation",
        syllable_type: "con-grat-u-late",
        memorization_hook: "con（共同）+ grat（感激，高兴）+ u + late（做）-> 共同表达高兴之情，也就是祝贺。"
    },
    {
        word: "thirsty",
        meaning: "渴望的; 口渴的 (adj.)",
        page_number: 110,
        context_sentence: "You were all so full of energy and thirsty for knowledge.",
        ipa: "/ˈθɜːsti/",
        comparison: "thirsty vs thirty",
        syllable_type: "thir-sty",
        memorization_hook: "thir（看作third，第三次）+ sty（看作stay，停留）-> 停下来第三次喝水，因为口渴。"
    },
    {
        word: "be thirsty for",
        meaning: "渴望; 渴求 (phr.)",
        page_number: 110,
        context_sentence: "You were all so full of energy and thirsty for knowledge.",
        ipa: "/biː ˈθɜːsti fɔː(r)/",
        comparison: "be thirsty for vs be hungry for",
        syllable_type: "be thir-sty for",
        memorization_hook: "thirsty（口渴的）+ for（为了）-> 像口渴需要水一样迫切，也就是渴望。"
    },
    {
        word: "thankful",
        meaning: "感谢; 感激 (adj.)",
        page_number: 110,
        context_sentence: "Never fail to be thankful to the people around you.",
        ipa: "/ˈθæŋkfl/",
        comparison: "thankful vs thankfuly",
        syllable_type: "thank-ful",
        memorization_hook: "thank（感谢）+ ful（充满...的）-> 充满感激的。"
    },
    {
        word: "be thankful to sb.",
        meaning: "对某人心存感激 (phr.)",
        page_number: 110,
        context_sentence: "Never fail to be thankful to the people around you.",
        ipa: "/biː ˈθæŋkfl tuː/",
        comparison: "be thankful to sb. vs thank sb.",
        syllable_type: "be thank-ful to sb.",
        memorization_hook: "thankful（感激的）+ to（对）-> 对某人充满感激之情。"
    },
    {
        word: "lastly",
        meaning: "最后 (adv.)",
        page_number: 110,
        context_sentence: "Lastly, the end of junior high school is the beginning of a new life.",
        ipa: "/ˈlɑːstli/",
        comparison: "lastly vs lately",
        syllable_type: "last-ly",
        memorization_hook: "last（最后的）+ ly（副词后缀）-> 最后。"
    },
    {
        word: "task",
        meaning: "任务; 工作 (n.)",
        page_number: 110,
        context_sentence: "You have many difficult tasks ahead of you.",
        ipa: "/tɑːsk/",
        comparison: "task vs mask",
        syllable_type: "闭音节 (Closed)",
        memorization_hook: "ta（他）+ sk（看作ask，询问）-> 询问他今天分到了什么任务。"
    },
    {
        word: "ahead",
        meaning: "向前面; 在前面 (adv.)",
        page_number: 110,
        context_sentence: "You have many difficult tasks ahead of you.",
        ipa: "/əˈhed/",
        comparison: "ahead vs head",
        syllable_type: "a-head",
        memorization_hook: "a + head（头）-> 顺着头的方向往前面看。"
    },
    {
        word: "ahead of",
        meaning: "在……前面 (phr.)",
        page_number: 110,
        context_sentence: "You have many difficult tasks ahead of you.",
        ipa: "/əˈhed ɒv/",
        comparison: "ahead of vs in front of",
        syllable_type: "a-head of",
        memorization_hook: "ahead（在前面）+ of -> 在...前面。"
    },
    {
        word: "along with",
        meaning: "连同; 除……以外还 (phr.)",
        page_number: 110,
        context_sentence: "But along with difficulties, there will also be many exciting things.",
        ipa: "/əˈlɒŋ wɪð/",
        comparison: "along with vs go along",
        syllable_type: "a-long with",
        memorization_hook: "along（沿着，一起）+ with（和）-> 和...一起，连同。"
    },
    {
        word: "responsible",
        meaning: "有责任心的 (adj.)",
        page_number: 110,
        context_sentence: "Choose wisely and be responsible for your decisions and actions.",
        ipa: "/rɪˈsponseb(ə)l/",
        comparison: "responsible vs response",
        syllable_type: "re-spon-si-ble",
        memorization_hook: "re（重新）+ spons（承诺）+ ible（能...的）-> 能够重新履行承诺的，是有责任心的。"
    },
    {
        word: "be responsible for",
        meaning: "对……有责任; 负责任 (phr.)",
        page_number: 110,
        context_sentence: "Choose wisely and be responsible for your decisions and actions.",
        ipa: "/biː rɪˈsponseb(ə)l fɔː(r)/",
        comparison: "be responsible for vs lead to",
        syllable_type: "be re-spon-si-ble for",
        memorization_hook: "responsible（负责任的）+ for（为了）-> 对...承担起责任。"
    },
    {
        word: "separate",
        meaning: "分开; 分离 (v.); 单独的; 分离的 (adj.)",
        page_number: 110,
        context_sentence: "Although you have to go your separate ways now...",
        ipa: "/ˈsepəreɪt/",
        comparison: "separate vs desperate",
        syllable_type: "sep-a-rate",
        memorization_hook: "se（分开）+ par（看作part，部分）+ ate（动词后缀）-> 把它们分成不同的部分，也就是分开。"
    },
    {
        word: "set out",
        meaning: "出发; 启程 (phr.)",
        page_number: 110,
        context_sentence: "As you set out on your new journey, you shouldn't forget where you came from.",
        ipa: "/set aʊt/",
        comparison: "set out vs set up",
        syllable_type: "set out",
        memorization_hook: "set（放置，准备）+ out（向外）-> 整理好装备朝外走，也就是出发。"
    },
    {
        word: "separate from",
        meaning: "分离; 隔开 (phr.)",
        page_number: 111,
        context_sentence: "It is always hard to separate from those whom you have spent so much time with.",
        ipa: "/ˈsepəreɪt frɒm/",
        comparison: "separate from vs divide into",
        syllable_type: "sep-a-rate from",
        memorization_hook: "separate（分开）+ from（从...）-> 和某人或某物分离开。"
    },
    {
        word: "wing",
        meaning: "翅膀; 翼 (n.)",
        page_number: 111,
        context_sentence: "She tells us that knowledge will give us wings to fly.",
        ipa: "/wɪŋ/",
        comparison: "wing vs wind",
        syllable_type: "闭音节 (Closed)",
        memorization_hook: "w（万物）+ ing（正在进行）-> 鸟儿煽动翅膀，万物正在飞翔。"
    },
    // 10 Extra difficult words
    {
        word: "meet the standards",
        meaning: "达到标准 (phr.)",
        page_number: 105,
        context_sentence: "I always did my homework carefully to meet Mr. Brown's standards.",
        ipa: "/miːt ðə ˈstændədz/",
        comparison: "meet the standards vs meet the requirement",
        syllable_type: "meet the stan-dards",
        memorization_hook: "meet（达到，满足）+ standards（标准）-> 达到标准。"
    },
    {
        word: "volunteer",
        meaning: "志愿者 (n.)",
        page_number: 105,
        context_sentence: "At junior high school, I remember being a volunteer.",
        ipa: "/ˌvɒlənˈtɪə(r)/",
        comparison: "volunteer vs violence",
        syllable_type: "vol-un-teer",
        memorization_hook: "vol（意志，自愿）+ un + teer（人）-> 自愿提供服务的人，也就是志愿者。"
    },
    {
        word: "take a break",
        meaning: "休息一下 (phr.)",
        page_number: 106,
        context_sentence: "He told me to take a break from running.",
        ipa: "/teɪk ə breɪk/",
        comparison: "take a break vs take a breath",
        syllable_type: "take a break",
        memorization_hook: "take（拿，取）+ a + break（中止，暂停）-> 抽取一段时间进行暂停，也就是休息一下。"
    },
    {
        word: "patient",
        meaning: "有耐心的 (adj.)",
        page_number: 106,
        context_sentence: "I know that Ms. Lee was always patient with you in math class.",
        ipa: "/ˈpeɪʃnt/",
        comparison: "patient vs patent",
        syllable_type: "pa-tient",
        memorization_hook: "pa（怕）+ tient（看作tent，帐篷）-> 在帐篷里躲风雨的人需要有耐心。"
    },
    {
        word: "work out",
        meaning: "算出; 解决 (phr.)",
        page_number: 106,
        context_sentence: "She helped you to work out the answers yourself no matter how difficult they were.",
        ipa: "/wɜːk aʊt/",
        comparison: "work out vs work on",
        syllable_type: "work out",
        memorization_hook: "work（工作，劳动）+ out（出来）-> 劳动并得出结果，也就是解决、算出。"
    },
    {
        word: "no matter how",
        meaning: "不管……; 无论…… (phr.)",
        page_number: 106,
        context_sentence: "She helped you to work out the answers yourself no matter how difficult they were.",
        ipa: "/nəʊ ˈmætə(r) haʊ/",
        comparison: "no matter how vs no matter what",
        syllable_type: "no matter how",
        memorization_hook: "no（不）+ matter（有关系）+ how（多么）-> 无论多么...都不要紧。"
    },
    {
        word: "guide",
        meaning: "指导; 引导 (v.)",
        page_number: 106,
        context_sentence: "Yes, and Mr. Brown guided me to do a lot better in science.",
        ipa: "/ɡaɪd/",
        comparison: "guide vs guard",
        syllable_type: "相对开音节 (VCe)",
        memorization_hook: "gu（鼓）+ ide（看作idea，想法）-> 鼓励你有新想法，指导你前行。"
    },
    {
        word: "whenever",
        meaning: "每当; 无论何时 (conj.)",
        page_number: 106,
        context_sentence: "He always took the time to explain things to me clearly whenever I couldn't understand anything.",
        ipa: "/wenˈevə(r)/",
        comparison: "whenever vs wherever",
        syllable_type: "when-ev-er",
        memorization_hook: "when（什么时候）+ ever（无论）-> 无论什么时候，每当。"
    },
    {
        word: "encourage",
        meaning: "鼓励 (v.)",
        page_number: 106,
        context_sentence: "She encouraged me in English class.",
        ipa: "/ɪnˈkʌrɪdʒ/",
        comparison: "encourage vs courage",
        syllable_type: "en-cour-age",
        memorization_hook: "en（使动）+ courage（勇气）-> 使人产生勇气，也就是鼓励。"
    },
    {
        word: "put in effort",
        meaning: "付出努力 (phr.)",
        page_number: 106,
        context_sentence: "Because of her, I put in more effort and my exam scores doubled.",
        ipa: "/pʊt ɪn ˈefət/",
        comparison: "put in effort vs make an effort",
        syllable_type: "put in ef-fort",
        memorization_hook: "put in（投入，注入）+ effort（努力）-> 投入精力，付出努力。"
    }
];

const vocabGuideJson = {
    unit_vocabulary: unitVocabulary,
    level: "Grade 9 - Unit 14"
};

fs.writeFileSync(path.join(unitFolder, 'a9-u14-vocab-guide.json'), JSON.stringify(vocabGuideJson, null, 2) + '\n', 'utf8');
console.log("Generated a9-u14-vocab-guide.json");

// ----------------------------------------------------
// 2. Vocabulary Master (VM)
// ----------------------------------------------------
// We need exactly 5 challenges of 10 questions each = 50 questions.
// Let's generate challenges and questions. We will handcode some questions to maintain high-quality distractors.
// Types: Cloze, Cn2En, En2Cn
const vmQuestions = [];

const clozeRaw = [
    { word: "survey", prompt: "The school is conducting a ________ to find out what students do after class.", options: ["survey", "standard", "keyboard", "method", "manager", "ceremony"], meaning: "调查" },
    { word: "standard", prompt: "Strict teachers always set high ________ for their students.", options: ["standards", "methods", "surveys", "keyboards", "gentlemen", "tasks"], meaning: "标准" },
    { word: "row", prompt: "Our soccer team was very strong and we won five games in a ________.", options: ["row", "level", "degree", "survey", "standard", "mess"], meaning: "排; 列; 连续" },
    { word: "keyboard", prompt: "He is learning to play the ________ in the music school.", options: ["keyboard", "degree", "manager", "standard", "survey", "instruction"], meaning: "键盘乐器" },
    { word: "method", prompt: "Different teachers have their own teaching ________ to help students learn.", options: ["methods", "standards", "surveys", "keyboards", "gentlemen", "ceremonies"], meaning: "方法" },
    { word: "instruction", prompt: "Read the ________ carefully before you start the experiment.", options: ["instructions", "methods", "surveys", "standards", "keyboards", "gentlemen"], meaning: "指示; 命令" },
    { word: "double", prompt: "If you work hard, your exam scores might ________ next term.", options: ["double", "separate", "graduate", "overcome", "congratulate", "snore"], meaning: "加倍" },
    { word: "shall", prompt: "________ we get our caring teachers some cards and gifts to say thank you?", options: ["Shall", "Should", "Would", "Will", "Can", "Must"], meaning: "将要; 会" },
    { word: "overcome", prompt: "With the help of our friends, we can ________ any difficulties.", options: ["overcome", "graduate", "congratulate", "separate", "double", "snore"], meaning: "克服; 战战" },
    { word: "graduate", prompt: "We will leave our lovely junior high school when we ________ next month.", options: ["graduate", "overcome", "congratulate", "separate", "double", "improve"], meaning: "毕业" },
    { word: "caring", prompt: "We will miss our kind and ________ teachers after graduation.", options: ["caring", "senior", "thankful", "thirsty", "responsible", "separate"], meaning: "体贴的" },
    { word: "senior", prompt: "I am looking forward to going to ________ high school next year.", options: ["senior", "caring", "thankful", "thirsty", "responsible", "separate"], meaning: "高级的" },
    { word: "level", prompt: "With my teacher's help, my English ________ has been improving.", options: ["level", "degree", "survey", "standard", "method", "task"], meaning: "水平" },
    { word: "degree", prompt: "She wants to get a business ________ and become a manager in the future.", options: ["degree", "level", "survey", "standard", "method", "task"], meaning: "学位" },
    { word: "manager", prompt: "He works hard in the office because he wants to be a ________.", options: ["manager", "gentleman", "volunteer", "standard", "keyboard", "level"], meaning: "经理" },
    { word: "gentleman", prompt: "The speaker welcomed all the ladies and ________ at the ceremony.", options: ["gentlemen", "managers", "volunteers", "standards", "keyboards", "levels"], meaning: "先生; 绅士" },
    { word: "ceremony", prompt: "We attended the graduation ________ at the school hall yesterday.", options: ["ceremony", "survey", "degree", "method", "level", "task"], meaning: "典礼" },
    { word: "congratulate", prompt: "I'd like to ________ all of you on passing the final exams.", options: ["congratulate", "graduate", "overcome", "separate", "double", "believe"], meaning: "祝贺" },
    { word: "thirsty", prompt: "The young students were all full of energy and ________ for knowledge.", options: ["thirsty", "thankful", "caring", "responsible", "senior", "separate"], meaning: "渴望的" },
    { word: "thankful", prompt: "We should never fail to be ________ to the people who helped us.", options: ["thankful", "thirsty", "caring", "responsible", "senior", "separate"], meaning: "感激的" },
    { word: "task", prompt: "There are many difficult ________ ahead of us in senior high school.", options: ["tasks", "methods", "surveys", "standards", "keyboards", "gentlemen"], meaning: "任务" },
    { word: "responsible", prompt: "Teenagers should learn to be ________ for their own choices.", options: ["responsible", "thankful", "thirsty", "caring", "senior", "separate"], meaning: "有责任的" },
    { word: "separate", prompt: "Although we must go our ________ ways, we will be friends forever.", options: ["separate", "responsible", "thankful", "thirsty", "caring", "senior"], meaning: "分离的; 各自的" },
    { word: "volunteer", prompt: "I remember being a ________ at the school sports day last year.", options: ["volunteer", "manager", "gentleman", "standard", "keyboard", "level"], meaning: "志愿者" },
    { word: "patient", prompt: "Our math teacher is always ________ with us when we make mistakes.", options: ["patient", "caring", "responsible", "thankful", "thirsty", "senior"], meaning: "有耐心的" }
];

// Generate 25 Cloze
clozeRaw.forEach(item => {
    // Correct word is item.options[0] or we match it
    const options = [...item.options];
    const correctIdx = options.indexOf(item.word) !== -1 ? options.indexOf(item.word) : 0;
    // Shuffle options
    const zipped = options.map((opt, idx) => ({ opt, isCorrect: idx === correctIdx }));
    for (let i = zipped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [zipped[i], zipped[j]] = [zipped[j], zipped[i]];
    }
    const shuffledOptions = zipped.map(z => z.opt);
    const ansIdx = zipped.findIndex(z => z.isCorrect);

    vmQuestions.push({
        id: makeId(),
        word: item.word,
        meaning: item.meaning,
        context_sentence: item.prompt.replace("________", item.word),
        cn: `(提示: ${item.meaning})`,
        hint: `请选出填空最恰当的一项。`,
        title: "Vocab Master",
        type: "Cloze",
        prompt: `${item.prompt} (提示: ${item.meaning})`,
        options: shuffledOptions,
        answer: ansIdx
    });
});

// Generate 13 Cn2En
const cn2EnWords = [
    { word: "look back at", meaning: "回首(往事); 回忆; 回顾", options: ["look back at", "look down at", "look out of", "look up to", "look forward to", "look forward at"] },
    { word: "make a mess", meaning: "弄得一团糟; 一塌糊涂", options: ["make a mess", "make a guess", "make a face", "make a deal", "make a difference", "make a decision"] },
    { word: "keep one's cool", meaning: "沉住气; 保持冷静", options: ["keep one's cool", "keep one's word", "keep one's head", "keep one's promise", "keep one's hands", "keep one's book"] },
    { word: "believe in", meaning: "信任; 信赖", options: ["believe in", "believe that", "believe of", "believe to", "believe about", "believe with"] },
    { word: "first of all", meaning: "首先", options: ["first of all", "at first", "first time", "first day", "for first", "first in all"] },
    { word: "ahead of", meaning: "在……前面", options: ["ahead of", "in front of", "behind of", "next to", "far from", "along with"] },
    { word: "along with", meaning: "连同; 除……以外还", options: ["along with", "go along", "ahead of", "next to", "far from", "separate from"] },
    { word: "separate from", meaning: "分离; 隔开", options: ["separate from", "divide into", "along with", "ahead of", "look back at", "make a mess"] },
    { word: "set out", meaning: "出发; 启程", options: ["set out", "set up", "set off", "set in", "set down", "set back"] },
    { word: "meet the standards", meaning: "达到标准", options: ["meet the standards", "meet the requirements", "meet the needs", "meet the rules", "meet the expectations", "meet the teachers"] },
    { word: "take a break", meaning: "休息一下", options: ["take a break", "take a breath", "take a seat", "take a photo", "take a walk", "take a lesson"] },
    { word: "work out", meaning: "算出; 解决", options: ["work out", "work on", "work at", "work for", "work through", "work hard"] },
    { word: "put in effort", meaning: "付出努力", options: ["put in effort", "make an effort", "put in order", "put in place", "put in touch", "put in writing"] }
];

cn2EnWords.forEach(item => {
    const options = [...item.options];
    const zipped = options.map((opt, idx) => ({ opt, isCorrect: idx === 0 }));
    for (let i = zipped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [zipped[i], zipped[j]] = [zipped[j], zipped[i]];
    }
    const shuffledOptions = zipped.map(z => z.opt);
    const ansIdx = zipped.findIndex(z => z.isCorrect);

    vmQuestions.push({
        id: makeId(),
        word: item.word,
        meaning: item.meaning,
        context_sentence: "",
        cn: "",
        hint: `请根据中文释义选出正确的英文单词或短语。`,
        title: "Vocab Master",
        type: "Cn2En",
        prompt: `“${item.meaning}”对应的英文是：`,
        options: shuffledOptions,
        answer: ansIdx
    });
});

// Generate 12 En2Cn
const en2CnWords = [
    { word: "survey", meaning: "调查", options: ["调查", "标准", "指示", "典礼", "回忆", "经理"] },
    { word: "standard", meaning: "标准; 水平", options: ["标准; 水平", "调查", "方法", "毕业", "任务", "绅士"] },
    { word: "row", meaning: "一排; 一列; 一行", options: ["一排; 一列; 一行", "键盘", "学位", "经理", "翅膀", "水平"] },
    { word: "method", meaning: "方法; 措施", options: ["方法; 措施", "标准", "指示", "调查", "典礼", "翅膀"] },
    { word: "double", meaning: "加倍; 是……的两倍", options: ["加倍; 是……的两倍", "克服; 战胜", "毕业", "分离; 隔开", "祝贺", "信任"] },
    { word: "instruction", meaning: "指示; 命令", options: ["指示; 命令", "方法", "标准", "任务", "典礼", "调查"] },
    { word: "overcome", meaning: "克服; 战胜", options: ["克服; 战胜", "加倍", "毕业", "分离", "祝贺", "信任"] },
    { word: "caring", meaning: "体贴人的; 关心他人的", options: ["体贴人的; 关心他人的", "高级的", "感谢的", "渴望的", "有责任心的", "各自的"] },
    { word: "senior high", meaning: "高中", options: ["高中", "初中", "大学", "小学", "俱乐部", "志愿者"] },
    { word: "degree", meaning: "学位; 度数; 程度", options: ["学位; 度数; 程度", "水平", "调查", "方法", "指示", "标准"] },
    { word: "ceremony", meaning: "典礼; 仪式", options: ["典礼; 仪式", "调查", "学位", "方法", "水平", "任务"] },
    { word: "responsible", meaning: "有责任心的", options: ["有责任心的", "体贴人的", "感激的", "渴望的", "口渴的", "分离的"] }
];

en2CnWords.forEach(item => {
    const options = [...item.options];
    const zipped = options.map((opt, idx) => ({ opt, isCorrect: idx === 0 }));
    for (let i = zipped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [zipped[i], zipped[j]] = [zipped[j], zipped[i]];
    }
    const shuffledOptions = zipped.map(z => z.opt);
    const ansIdx = zipped.findIndex(z => z.isCorrect);

    vmQuestions.push({
        id: makeId(),
        word: item.word,
        meaning: item.meaning,
        context_sentence: "",
        cn: "",
        hint: `请根据英文单词或短语选出正确的中文释义。`,
        title: "Vocab Master",
        type: "En2Cn",
        prompt: `单词/短语“${item.word}”的意思是：`,
        options: shuffledOptions,
        answer: ansIdx
    });
});

// Group vmQuestions into 5 challenges of 10 questions
const vmChallenges = [];
for (let c = 1; c <= 5; c++) {
    const challengeQs = vmQuestions.slice((c - 1) * 10, c * 10);
    const icons = ["🔥", "⚡", "🌟", "🏆", "🎓"];
    vmChallenges.push({
        id: `c${c}`,
        title: `Challenge ${c}`,
        icon: icons[c - 1],
        questions: challengeQs
    });
}

const vocabMasterJson = {
    level: "Grade 9 - Unit 14",
    title: "Vocab Master",
    challenges: vmChallenges
};

fs.writeFileSync(path.join(unitFolder, 'a9-u14-vocab-master.json'), JSON.stringify(vocabMasterJson, null, 2) + '\n', 'utf8');
console.log("Generated a9-u14-vocab-master.json");

// ----------------------------------------------------
// 3. Spelling Hero (SH)
// ----------------------------------------------------
// Process single words from unitVocabulary only. Skip phrases.
const shWords = [];
const singleWords = unitVocabulary.filter(v => !v.word.includes(" "));

// Syllable breakdowns and options for each single word
const shDefinitions = {
    survey: { type: "multi-syllable", chunks: [{ correct: "sur", opts: ["sur", "ser", "sor"] }, { correct: "vey", opts: ["vey", "vay", "view"] }] },
    standard: { type: "multi-syllable", chunks: [{ correct: "stan", opts: ["stan", "stem", "sten"] }, { correct: "dard", opts: ["dard", "dert", "dent"] }] },
    row: { type: "single-syllable", chunks: [{ correct: "r", opts: ["r", "w", "l"] }, { correct: "ow", opts: ["ow", "aw", "oa"] }] },
    keyboard: { type: "multi-syllable", chunks: [{ correct: "key", opts: ["key", "kay", "kee"] }, { correct: "board", opts: ["board", "broad", "boad"] }] },
    method: { type: "multi-syllable", chunks: [{ correct: "meth", opts: ["meth", "math", "myth"] }, { correct: "od", opts: ["od", "ad", "ed"] }] },
    instruction: { type: "multi-syllable", chunks: [{ correct: "in", opts: ["in", "en", "im"] }, { correct: "struc", opts: ["struc", "struct", "strec"] }, { correct: "tion", opts: ["tion", "sion", "cian"] }] },
    double: { type: "multi-syllable", chunks: [{ correct: "dou", opts: ["dou", "du", "dow"] }, { correct: "ble", opts: ["ble", "bel", "ple"] }] },
    shall: { type: "single-syllable", chunks: [{ correct: "sh", opts: ["sh", "ch", "s"] }, { correct: "all", opts: ["all", "ell", "oll"] }] },
    overcome: { type: "multi-syllable", chunks: [{ correct: "o", opts: ["o", "u", "a"] }, { correct: "ver", opts: ["ver", "var", "vir"] }, { correct: "come", opts: ["come", "came", "cone"] }] },
    graduate: { type: "multi-syllable", chunks: [{ correct: "grad", opts: ["grad", "gred", "grid"] }, { correct: "u", opts: ["u", "o", "a"] }, { correct: "ate", opts: ["ate", "ite", "et"] }] },
    caring: { type: "multi-syllable", chunks: [{ correct: "car", opts: ["car", "cer", "cor"] }, { correct: "ing", opts: ["ing", "eng", "ang"] }] },
    ours: { type: "single-syllable", chunks: [{ correct: "our", opts: ["our", "are", "hour"] }, { correct: "s", opts: ["s", "es", "z"] }] },
    senior: { type: "multi-syllable", chunks: [{ correct: "se", opts: ["se", "si", "sa"] }, { correct: "nior", opts: ["nior", "near", "nor"] }] },
    text: { type: "single-syllable", chunks: [{ correct: "t", opts: ["t", "d", "p"] }, { correct: "e", opts: ["e", "a", "u"] }, { correct: "xt", opts: ["xt", "st", "ft"] }] },
    level: { type: "multi-syllable", chunks: [{ correct: "lev", opts: ["lev", "lav", "liv"] }, { correct: "el", opts: ["el", "al", "le"] }] },
    degree: { type: "multi-syllable", chunks: [{ correct: "de", opts: ["de", "di", "da"] }, { correct: "gree", opts: ["gree", "grey", "gre"] }] },
    manager: { type: "multi-syllable", chunks: [{ correct: "man", opts: ["man", "men", "mon"] }, { correct: "ag", opts: ["ag", "eg", "ig"] }, { correct: "er", opts: ["er", "ar", "or"] }] },
    gentleman: { type: "multi-syllable", chunks: [{ correct: "gen", opts: ["gen", "gan", "gin"] }, { correct: "tle", opts: ["tle", "tal", "tle"] }, { correct: "man", opts: ["man", "men", "min"] }] },
    graduation: { type: "multi-syllable", chunks: [{ correct: "grad", opts: ["grad", "gred", "grid"] }, { correct: "u", opts: ["u", "a", "o"] }, { correct: "a", opts: ["a", "e", "o"] }, { correct: "tion", opts: ["tion", "sion", "cian"] }] },
    ceremony: { type: "multi-syllable", chunks: [{ correct: "cer", opts: ["cer", "sar", "ser"] }, { correct: "e", opts: ["e", "a", "i"] }, { correct: "mo", opts: ["mo", "ma", "me"] }, { correct: "ny", opts: ["ny", "ney", "ni"] }] },
    congratulate: { type: "multi-syllable", chunks: [{ correct: "con", opts: ["con", "can", "com"] }, { correct: "grat", opts: ["grat", "gret", "grot"] }, { correct: "u", opts: ["u", "a", "e"] }, { correct: "late", opts: ["late", "lete", "lite"] }] },
    thirsty: { type: "multi-syllable", chunks: [{ correct: "thir", opts: ["thir", "ther", "thur"] }, { correct: "sty", opts: ["sty", "stay", "stey"] }] },
    thankful: { type: "multi-syllable", chunks: [{ correct: "thank", opts: ["thank", "think", "thank"] }, { correct: "ful", opts: ["ful", "fall", "full"] }] },
    lastly: { type: "multi-syllable", chunks: [{ correct: "last", opts: ["last", "lest", "list"] }, { correct: "ly", opts: ["ly", "ley", "li"] }] },
    task: { type: "single-syllable", chunks: [{ correct: "t", opts: ["t", "d", "p"] }, { correct: "a", opts: ["a", "u", "e"] }, { correct: "sk", opts: ["sk", "st", "ck"] }] },
    ahead: { type: "multi-syllable", chunks: [{ correct: "a", opts: ["a", "e", "o"] }, { correct: "head", opts: ["head", "had", "heed"] }] },
    responsible: { type: "multi-syllable", chunks: [{ correct: "re", opts: ["re", "ri", "ra"] }, { correct: "spon", opts: ["spon", "span", "spun"] }, { correct: "si", opts: ["si", "se", "sa"] }, { correct: "ble", opts: ["ble", "bel", "ple"] }] },
    separate: { type: "multi-syllable", chunks: [{ correct: "sep", opts: ["sep", "sap", "sip"] }, { correct: "a", opts: ["a", "e", "i"] }, { correct: "rate", opts: ["rate", "rete", "rite"] }] },
    wing: { type: "single-syllable", chunks: [{ correct: "w", opts: ["w", "v", "y"] }, { correct: "ing", opts: ["ing", "eng", "ang"] }] },
    volunteer: { type: "multi-syllable", chunks: [{ correct: "vol", opts: ["vol", "val", "vul"] }, { correct: "un", opts: ["un", "an", "on"] }, { correct: "teer", opts: ["teer", "tear", "tier"] }] },
    patient: { type: "multi-syllable", chunks: [{ correct: "pa", opts: ["pa", "pe", "pi"] }, { correct: "tient", opts: ["tient", "tent", "tiant"] }] },
    guide: { type: "single-syllable", chunks: [{ correct: "g", opts: ["g", "k", "j"] }, { correct: "uide", opts: ["uide", "ide", "aed"] }] },
    whenever: { type: "multi-syllable", chunks: [{ correct: "when", opts: ["when", "whan", "whin"] }, { correct: "ev", opts: ["ev", "av", "iv"] }, { correct: "er", opts: ["er", "ar", "or"] }] },
    encourage: { type: "multi-syllable", chunks: [{ correct: "en", opts: ["en", "in", "an"] }, { correct: "cour", opts: ["cour", "cur", "car"] }, { correct: "age", opts: ["age", "ege", "ige"] }] }
};

for (const wObj of singleWords) {
    const d = shDefinitions[wObj.word];
    if (!d) continue;

    const chunksMap = d.chunks.map(chunk => {
        // Shuffle options
        const opts = [...chunk.opts];
        const correctIdx = opts.indexOf(chunk.correct) !== -1 ? opts.indexOf(chunk.correct) : 0;
        const zipped = opts.map((opt, idx) => ({ opt, isCorrect: idx === correctIdx }));
        for (let i = zipped.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [zipped[i], zipped[j]] = [zipped[j], zipped[i]];
        }
        return {
            correct: chunk.correct,
            options: zipped.map(z => z.opt)
        };
    });

    shWords.push({
        id: makeId(),
        word: wObj.word,
        meaning: wObj.meaning,
        type: d.type,
        chunks: chunksMap
    });
}

const spellingHeroJson = {
    level: "Grade 9 - Unit 14",
    title: "Spelling Master",
    spelling_words: shWords
};

fs.writeFileSync(path.join(unitFolder, 'a9-u14-spelling-hero.json'), JSON.stringify(spellingHeroJson, null, 2) + '\n', 'utf8');
console.log("Generated a9-u14-spelling-hero.json");

// ----------------------------------------------------
// 4. Sentence Architect (SA)
// ----------------------------------------------------
// 5 challenges of 10 sentences = 50 sentences total.
const saChallenges = [];
const saSentencesRaw = [
    // Challenge 1: Memories of Junior High (M)
    { en: "I remember meeting all of you in Grade 7.", cn: "我记得在七年级时遇到你们所有人。", hint: "remember doing sth. 表示记得做过某事。", noise: ["meet", "meetup", "volunteers", "will"] },
    { en: "At junior high school, I remember winning a prize.", cn: "在初中时，我记得获得过一个奖项。", hint: "At junior high school 表示在初中。", noise: ["won", "volunteering", "surveying", "the"] },
    { en: "We all helped you to look for your schoolbag.", cn: "我们都帮你寻找你的书包。", hint: "help sb. to do sth. 表示帮助某人做某事。", noise: ["helping", "looks", "lookout", "for"] },
    { en: "I used to be scared of Mr. Brown in Grade 8.", cn: "我在八年级时曾经害怕布朗先生。", hint: "be scared of 表示害怕……。", noise: ["using", "scares", "frightened", "of"] },
    { en: "He was so strict and I always did my homework carefully.", cn: "他非常严厉，我总是仔细地做作业。", hint: "carefully 是副词，修饰动词 did。", noise: ["strictness", "careful", "do", "doing"] },
    { en: "I remember doing homework carefully to meet his standards.", cn: "我记得为了达到他的标准而仔细地做作业。", hint: "meet standards 表示达到标准/要求。", noise: ["standard", "meeting", "does", "careful"] },
    { en: "We have been good friends ever since Grade 7.", cn: "自七年级以来，我们一直是好朋友。", hint: "ever since 表示自……以来，常与现在完成时连用。", noise: ["are", "were", "since", "then"] },
    { en: "I've enjoyed every year of junior high school.", cn: "我享受了初中生活的每一年。", hint: "I've enjoyed 是现在完成时结构。", noise: ["enjoying", "everyday", "years", "enjoyable"] },
    { en: "I remember scoring two goals in a row during a competition.", cn: "我记得在一次比赛中连续进了两个球。", hint: "in a row 表示连续地。", noise: ["score", "goals", "line", "during"] },
    { en: "I have learned to play the keyboard in music class.", cn: "我已经在音乐课上学会了弹电子琴。", hint: "learn to do sth. 表示学会做某事。", noise: ["learning", "played", "keycard", "in"] },

    // Challenge 2: Experiences with Teachers (E)
    { en: "Which teachers will you miss the most after junior high?", cn: "初中毕业后你最想念哪些老师？", hint: "miss the most 表示最想念。", noise: ["missing", "more", "teacher", "after"] },
    { en: "Ms. Lee was always patient with you in math class.", cn: "数学课上，李老师总是对你很有耐心。", hint: "be patient with sb. 表示对某人有耐心。", noise: ["patience", "patiently", "classes", "with"] },
    { en: "She helped you to work out the answers yourself.", cn: "她帮助你自己算出答案。", hint: "work out 表示算出; 解决。", noise: ["helping", "works", "out of", "yourselves"] },
    { en: "The answers were difficult no matter how she explained them.", cn: "无论她如何解释，答案都很困难。", hint: "no matter how 表示无论如何。", noise: ["matter", "explaining", "explains", "how"] },
    { en: "Mr. Brown guided me to do a lot better in science.", cn: "布朗先生指导我在科学方面取得了很大进步。", hint: "guide sb. to do sth. 表示引导某人做某事。", noise: ["guiding", "does", "better", "in"] },
    { en: "He always took the time to explain things to me clearly.", cn: "他总是花时间清楚地向我解释事情。", hint: "take the time to do sth. 表示花时间做某事。", noise: ["taking", "clear", "explaining", "to"] },
    { en: "Whenever I couldn't understand anything, he explained clearly to me.", cn: "每当我有任何不理解的地方，他都会向我解释清楚。", hint: "whenever 表示每当; 无论何时。", noise: ["when", "understandable", "cleared", "me"] },
    { en: "Ms. Griffin encouraged me a lot in English class.", cn: "格里芬老师在英语课上给了我很多鼓励。", hint: "encourage sb. 表示鼓励某人。", noise: ["encouraging", "lots", "english", "encouragement"] },
    { en: "Because of her encouragement, I put in more effort.", cn: "因为她的鼓励，我付出了更多的努力。", hint: "put in effort 表示付出努力。", noise: ["efforts", "putting", "encourage", "more"] },
    { en: "My exam scores doubled at the end of the term.", cn: "在学期末，我的考试成绩翻了一番。", hint: "at the end of 表示在……末尾。", noise: ["double", "doubling", "ends", "term"] },

    // Challenge 3: Regrets and Passages (R)
    { en: "I'm so happy I don't have to do P.E. again.", cn: "我太高兴了，我再也不用上体育课了。", hint: "don't have to 表示不必; 不用。", noise: ["happily", "does", "doing", "again"] },
    { en: "He gave us clear instructions so that we'd be safe.", cn: "他给了我们清晰的指示，以便我们能够安全。", hint: "so that 引导目的状语从句。", noise: ["clearly", "instruction", "safety", "would"] },
    { en: "Mr. Hunt was kind when I hurt my knee.", cn: "当我伤到膝盖时，亨特先生很和善。", hint: "when 引导时间状语从句。", noise: ["kindness", "hurts", "knees", "when"] },
    { en: "He advised me to take a break from running.", cn: "他建议我暂停跑步休息一下。", hint: "advise sb. to do sth. 表示建议某人做某事。", noise: ["advising", "takes", "breaking", "from"] },
    { en: "We wrote a letter to the band about our dream.", cn: "我们给乐队写了一封信，讲述了我们的梦想。", hint: "write a letter to sb. 表示给某人写信。", noise: ["writing", "letters", "bands", "dreaming"] }
];

// Let's add 25 more to make exactly 50 sentences (5 challenges of 10 sentences each).
const extraSaSentences = [
    // Continuing Challenge 3:
    { en: "They offered to come and play at our school.", cn: "他们主动提出要来我们学校演奏。", hint: "offer to do sth. 表示主动提出做某事。", noise: ["offering", "comes", "playing", "at"] },
    { en: "I want to go to senior high and then university.", cn: "我想上高中，然后上大学。", hint: "senior high 表示高中。", noise: ["wants", "going", "universities", "then"] },
    { en: "I want to study medicine in the future.", cn: "我未来想要学习医学。", hint: "in the future 表示在未来。", noise: ["studying", "medical", "futures", "want"] },
    { en: "Today is the students' last class together.", cn: "今天是学生们在一起的最后一堂课。", hint: "students' 是名词所有格形式。", noise: ["student", "classes", "together", "last"] },
    { en: "Bob feels sad about it and thinks classes were great.", cn: "鲍勃对此感到难过，并认为课程很棒。", hint: "feel sad about sth. 表示对某事感到难过。", noise: ["sadly", "feeling", "thought", "greatly"] },

    // Challenge 4: Options and Graduation (O)
    { en: "Bob hopes to pass the exam to get into senior high.", cn: "鲍勃希望通过考试进入高中。", hint: "hope to do sth. 表示希望做某事。", noise: ["hoping", "passed", "exams", "senior"] },
    { en: "Shirley wants to get into a music school.", cn: "雪莉想要进入一所音乐学校。", hint: "get into 表示进入; 考入。", noise: ["wanting", "gets", "musical", "schools"] },
    { en: "Ken won a prize for science last year.", cn: "肯去年获得了科学奖项。", hint: "win a prize for 表示因……获得奖项。", noise: ["wins", "prizes", "scientific", "last"] },
    { en: "He wants to be an astronaut and go into space.", cn: "他想成为一名宇航员并进入太空。", hint: "go into space 表示进入太空。", noise: ["wanting", "astronauts", "spaces", "into"] },
    { en: "I'm going to improve my English so that I can teach kids.", cn: "我打算提高我的英语，以便将来能够教孩子们。", hint: "improve English 表示提高英语水平。", noise: ["improving", "teaches", "kid", "could"] },
    { en: "All of you should go for it because I believe in you.", cn: "你们所有人都应该去争取，因为我信任你们。", hint: "believe in 表示信任; 信赖。", noise: ["goes", "believing", "in", "should"] },
    { en: "We're having a party to celebrate the end of school.", cn: "我们正在举办一个派对来庆祝毕业。", hint: "celebrate the end of 表示庆祝……的结束。", noise: ["celebrates", "celebration", "parties", "end"] },
    { en: "Thank you for coming today to attend the graduation ceremony.", cn: "谢谢你们今天来参加毕业典礼。", hint: "thank sb. for doing sth. 表示因某事感谢某人。", noise: ["thanks", "comes", "attending", "ceremonies"] },
    { en: "First of all, I'd like to congratulate all of you.", cn: "首先，我想向你们所有人表示祝贺。", hint: "first of all 表示首先。", noise: ["firstly", "congratulates", "congratulation", "all"] },
    { en: "I remember meeting you when you were starting Grade 7.", cn: "我记得在你们刚开始上七年级时遇到你们。", hint: "remember doing sth. 表示记得做过某事。", noise: ["remembered", "meetings", "starts", "grade"] },

    // Challenge 5: Hopes for the Future (H)
    { en: "You were all so full of energy and thirsty for knowledge.", cn: "你们曾经都如此充满活力，渴望知识。", hint: "be thirsty for 表示渴望……。", noise: ["energetic", "thirst", "knowledges", "were"] },
    { en: "Today I see a room full of talented young adults.", cn: "今天我看到一屋子有才华的年轻一代。", hint: "full of 表示充满……的。", noise: ["rooms", "talents", "youth", "adult"] },
    { en: "Although you worked hard, none of you did it alone.", cn: "虽然你们工作努力，但没有人是独自完成的。", hint: "Although 引导让步状语从句。", noise: ["though", "working", "hardly", "aloneness"] },
    { en: "Never fail to be thankful to the people around you.", cn: "千万不要忘记感激你身边的那些人。", hint: "be thankful to sb. 表示对某人心存感激。", noise: ["thanking", "thankfulness", "around", "fails"] },
    { en: "Life in senior high school will be harder.", cn: "高中的生活将会更加艰难。", hint: "senior high school 表示高中。", noise: ["lives", "hardest", "hardly", "will"] },
    { en: "You have many difficult tasks ahead of you.", cn: "在你们的前方有许多艰难的任务。", hint: "ahead of you 表示在你前方。", noise: ["difficulty", "tasking", "head", "of"] },
    { en: "You'll make mistakes along the way, but you must learn.", cn: "你在一路上会犯错误，但你必须学习。", hint: "make mistakes 表示犯错。", noise: ["mistake", "learning", "must", "along"] },
    { en: "Choose wisely and be responsible for your decisions.", cn: "做出明智的选择，并对你的决定负责。", hint: "be responsible for 表示对……负责。", noise: ["choosing", "wise", "responsibility", "decide"] },
    { en: "As you set out on your new journey, don't forget.", cn: "在你开始新的旅程时，不要忘记（你来自何处）。", hint: "set out on 表示开始进行新的事情/出发。", noise: ["sets", "outing", "journeys", "forgetting"] },
    { en: "Knowledge will give you wings to fly high.", cn: "知识将会给你飞高的翅膀。", hint: "give sb. sth. 表示给某人某物。", noise: ["knowledges", "giving", "wing", "flying"] }
];

const fullSaSentences = [...saSentencesRaw, ...extraSaSentences];

// Double check we have exactly 50
if (fullSaSentences.length !== 50) {
    console.error(`SA Sentences count is ${fullSaSentences.length}, not 50!`);
}

const saNames = ["Memories", "Experiences", "Regrets", "Options", "Hopes"];
const saIcons = ["📝", "🏫", "💔", "🌟", "🚀"];

for (let c = 1; c <= 5; c++) {
    const chunk = fullSaSentences.slice((c - 1) * 10, c * 10);
    const dataItems = chunk.map((s, idx) => {
        return {
            id: makeId(),
            en: s.en,
            cn: s.cn,
            hint: s.hint,
            noise: s.noise,
            accept: [s.en]
        };
    });

    saChallenges.push({
        id: `c${c}`,
        title: saNames[c - 1],
        icon: saIcons[c - 1],
        data: dataItems
    });
}

const sentenceArchitectJson = {
    title: "I remember meeting all of you in Grade 7",
    level: "Grade 9 - Unit 14",
    primaryColor: "#4f46e5",
    primaryColorDark: "#3730a3",
    storageSuffix: "_a9_u14",
    passcode: "MEROH", // Memories, Experiences, Regrets, Options, Hopes
    challenges: saChallenges,
    ipaDict: {}
};

fs.writeFileSync(path.join(unitFolder, 'a9-u14-sentence-architect.json'), JSON.stringify(sentenceArchitectJson, null, 2) + '\n', 'utf8');
console.log("Generated a9-u14-sentence-architect.json");

// ----------------------------------------------------
// 5. Recall Map (RM)
// ----------------------------------------------------
const recallMapJson = {
    level: "Grade 9",
    part: "Unit 14",
    tree: {
        id: "root",
        text: "Unit 14 Summary",
        emoji: "🎓",
        state: "emoji",
        children: [
            {
                id: "stories",
                text: "Text Passages",
                emoji: "📚",
                children: [
                    {
                        id: "poem",
                        text: "Poem: I Remember",
                        emoji: "✍️",
                        children: [
                            { id: "p_key1", text: "Past three years memories (回顾三年回忆)", emoji: "📅" },
                            { id: "p_key2", text: "Excitement and training (运动会的兴奋与训练)", emoji: "🏃" },
                            { id: "p_key3", text: "Making friends & helping (结交新朋友互相帮助)", emoji: "🤝" },
                            { id: "p_key4", text: "English challenges (学习英语的挑战)", emoji: "🇬🇧" },
                            { id: "p_key5", text: "Time to graduate (毕业离校时刻)", emoji: "🏫" }
                        ]
                    },
                    {
                        id: "speech",
                        text: "Section B Graduation Speech",
                        emoji: "🎤",
                        children: [
                            { id: "s_key1", text: "Congratulating students (向毕业生表示祝贺)", emoji: "🎉" },
                            { id: "s_key2", text: "Thanking supporters (感激父母、老师和朋友)", emoji: "❤️" },
                            { id: "s_key3", text: "Difficult tasks ahead (高中前方更加艰难的任务)", emoji: "🏔️" },
                            { id: "s_key4", text: "Learning from mistakes (永不放弃，从错误中学习)", emoji: "💡" },
                            { id: "s_key5", text: "Setting out on a journey (启程开始新的人生成长)", emoji: "🚀" }
                        ]
                    }
                ]
            },
            {
                id: "vocab",
                text: "Vocabulary",
                emoji: "✏️",
                children: [
                    {
                        id: "v_verbs",
                        text: "Verbs (Actions)",
                        emoji: "🏃",
                        children: [
                            { id: "v_v1", text: "double (加倍)", emoji: "📈" },
                            { id: "v_v2", text: "overcome (克服)", emoji: "💪" },
                            { id: "v_v3", text: "graduate (毕业)", emoji: "🎓" },
                            { id: "v_v4", text: "congratulate (祝贺)", emoji: "🎉" }
                        ]
                    },
                    {
                        id: "v_nouns",
                        text: "Nouns (Things)",
                        emoji: "📦",
                        children: [
                            { id: "v_n1", text: "survey (调查)", emoji: "📊" },
                            { id: "v_n2", text: "standard (标准)", emoji: "📏" },
                            { id: "v_n3", text: "keyboard (键盘)", emoji: "🎹" },
                            { id: "v_n4", text: "method (方法)", emoji: "💡" },
                            { id: "v_n5", text: "instruction (指示)", emoji: "📋" },
                            { id: "v_n6", text: "degree (学位)", emoji: "📜" },
                            { id: "v_n7", text: "manager (经理)", emoji: "💼" },
                            { id: "v_n8", text: "ceremony (典礼)", emoji: "🏛️" }
                        ]
                    },
                    {
                        id: "v_phrases",
                        text: "Phrases (Expressions)",
                        emoji: "💬",
                        children: [
                            { id: "v_p1", text: "in a row (连续)", emoji: "🔄" },
                            { id: "v_p2", text: "look back at (回忆)", emoji: "🕰️" },
                            { id: "v_p3", text: "make a mess (一团糟)", emoji: "🗑️" },
                            { id: "v_p4", text: "keep one's cool (冷静)", emoji: "❄️" },
                            { id: "v_p5", text: "believe in (信任)", emoji: "🤝" },
                            { id: "v_p6", text: "first of all (首先)", emoji: "1️⃣" },
                            { id: "v_p7", text: "be thirsty for (渴望)", emoji: "🥤" },
                            { id: "v_p8", text: "ahead of (在……前面)", emoji: "➡️" },
                            { id: "v_p9", text: "along with (连同)", emoji: "➕" },
                            { id: "v_p10", text: "be responsible for (负责)", emoji: "🛡️" },
                            { id: "v_p11", text: "set out (出发)", emoji: "🎒" }
                        ]
                    }
                ]
            },
            {
                id: "grammar",
                text: "Grammar Focus",
                emoji: "🔧",
                children: [
                    {
                        id: "g_patterns",
                        text: "Key Patterns",
                        emoji: "📐",
                        children: [
                            { id: "g_p1", text: "remember doing sth. (记得做过某事)", emoji: "🧠" },
                            { id: "g_p2", text: "used to do sth. (过去常常做某事)", emoji: "🕰️" },
                            { id: "g_p3", text: "look forward to doing sth. (盼望做某事)", emoji: "👀" },
                            { id: "g_p4", text: "since + starting point (自从……开始到现在完成时)", emoji: "⏳" }
                        ]
                    }
                ]
            }
        ]
    }
};

fs.writeFileSync(path.join(unitFolder, 'a9-u14-recall-map.json'), JSON.stringify(recallMapJson, null, 2) + '\n', 'utf8');
console.log("Generated a9-u14-recall-map.json");

// ----------------------------------------------------
// 6. Grammar Wizard (GW)
// ----------------------------------------------------
// 2 challenges of 10 questions each = 20 questions total.
const gwQuestions = [
    // Challenge 1: Infinitive, Gerunds & Used to
    {
        id: makeId(),
        type: "multiple-choice",
        category: "differentiation",
        prompt: "请选出填空最恰当的一项：I remember ________ the teacher for the first time in Grade 7. She was very kind.",
        options: ["meeting", "to meet", "met", "meet"],
        answer: 0,
        explanation: "remember doing sth. 表示记得做过某事（已发生）；remember to do sth. 表示记住要做某事（未发生）。此处为回忆七年级第一次见到老师，是已经发生的事，应用 meeting。",
        hint: "回忆过去发生的事，用 remember doing 结构。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "differentiation",
        prompt: "请选出填空最恰当的一项：Please remember ________ the classroom windows before you leave.",
        options: ["to close", "closing", "closed", "close"],
        answer: 0,
        explanation: "remember to do sth. 意思是“记住要做某事”（事情还没做）。这里是提醒对方离开前要记住关窗户，属于未发生的事，应用 to close。",
        hint: "提醒未来的事情，用 remember to do 结构。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "formation",
        prompt: "请选出填空最恰当的一项：We are all looking forward to ________ senior high school next term.",
        options: ["going to", "go to", "went to", "goes to"],
        answer: 0,
        explanation: "look forward to 中的 to 是介词，后面接名词、代词或动名词（doing）。因此后面接 going to。",
        hint: "look forward to doing sth. 盼望做某事。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "differentiation",
        prompt: "请选出填空最恰当的一项：He used to ________ dance lessons, but he doesn't anymore.",
        options: ["take", "taking", "taken", "took"],
        answer: 0,
        explanation: "used to do sth. 表示过去常常做某事（现在不做了），后面接动词原形。这里表示过去常常上舞蹈课，选 take。",
        hint: "used to do 过去常常做某事。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "differentiation",
        prompt: "请选出填空最恰当的一项：The manager gets used to ________ early in the morning.",
        options: ["getting up", "get up", "got up", "gets up"],
        answer: 0,
        explanation: "be/get used to doing sth. 意为“习惯于做某事”，to为介词。used to do sth. 意为“过去常常做某事”。此处表示经理习惯于早起，应用 getting up。",
        hint: "get used to doing 习惯于做某事。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "usage",
        prompt: "请选出填空最恰当的一项：Our English level has improved since we ________ junior high school.",
        options: ["started", "have started", "start", "starting"],
        answer: 0,
        explanation: "在 since 引导的时间状语从句中，主句通常用现在完成时，since 从句通常用一般过去时。从句表示过去的起点“开始上初中”，因此用 started。",
        hint: "since 引导的从句用一般过去时。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "formation",
        prompt: "请选出填空最恰当的一项：He worked ________ harder next year and got much better grades.",
        options: ["much", "more", "very", "so"],
        answer: 0,
        explanation: "harder 是比较级，可用 much、far、a lot 等修饰比较级表示程度。very 和 so 不能直接修饰比较级。",
        hint: "修饰比较级可用 much。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "usage",
        prompt: "请选出填空最恰当的一项：Shall we ________ Ms. Griffin a beautiful card to say thank you?",
        options: ["get", "getting", "to get", "got"],
        answer: 0,
        explanation: "Shall we...? 意为“我们……好吗？”，用于提建议，后面接动词原形。因此选 get。",
        hint: "Shall we 后面加动词原形。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "definition",
        prompt: "在句子 “These memories of ours are wonderful.” 中，单词 “ours” 的词性是：",
        options: ["名词性物主代词", "形容词性物主代词", "人称代词宾格", "人称代词主格"],
        answer: 0,
        explanation: "ours 是名词性物主代词，相当于 our memories。形容词性物主代词是 our 后面必须接名词。",
        hint: "名词性物主代词起名词的作用。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "differentiation",
        prompt: "请选出填空最恰当的一项：None of us ________ to leave the school because we love it so much.",
        options: ["wants", "wanting", "to want", "wanted"],
        answer: 0,
        explanation: "none of us 作主语时，谓语动词既可用单数（表示“没有一个人”），也可用复数形式。这里表示客观事实，谓语动词用 wants 属于单数形式，表示目前大家都不想离开，时态用一般现在时合适。",
        hint: "none 可作单数看待，意为没有一个。"
    },

    // Challenge 2: Adverbials, Relatives & Complete Review
    {
        id: makeId(),
        type: "multiple-choice",
        category: "usage",
        prompt: "请选出填空最恰当的一项：She helped us find the answers ________ how difficult they were.",
        options: ["no matter", "so that", "although", "because of"],
        answer: 0,
        explanation: "no matter how 引导让步状语从句，意为“无论多么……”。句子意为“无论答案多么难，她都帮助我们自己找出来”。",
        hint: "无论多么... 填 no matter。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "usage",
        prompt: "请选出填空最恰当的一项：I put in more effort ________ my English exam scores would improve.",
        options: ["so that", "because of", "no matter", "although"],
        answer: 0,
        explanation: "so that 意为“以便；为了”，引导目的状语从句。句子意为“我付出更多努力，以便我的英语考试成绩能够提高”。",
        hint: "表示目的“以便于”，用 so that 引导。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "usage",
        prompt: "请选出填空最恰当的一项：He took the time to explain things to me ________ I couldn't understand anything.",
        options: ["whenever", "although", "because", "so that"],
        answer: 0,
        explanation: "whenever 意为“每当；无论何时”，引导时间状语从句。表示“每当我不能理解时，他总是花时间给我解释”。",
        hint: "无论何时、每当，用 whenever。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "formation",
        prompt: "请选出填空最恰当的一项：Teenagers should be responsible ________ their own choices.",
        options: ["for", "to", "with", "at"],
        answer: 0,
        explanation: "be responsible for... 是固定搭配，意为“对……负责任”。",
        hint: "固定搭配 be responsible for。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "usage",
        prompt: "请选出填空最恰当的一项：First ________ all, let me introduce our graduation ceremony speakers.",
        options: ["of", "for", "with", "to"],
        answer: 0,
        explanation: "first of all 是固定短语，意为“首先”。",
        hint: "首先的英文是 first of all。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "formation",
        prompt: "请选出填空最恰当的一项：We won the basketball competition ________ was held last week.",
        options: ["that", "who", "whom", "where"],
        answer: 0,
        explanation: "先行词是 basketball competition，指物，在限制性定语从句中作主语，关系代词应该用 that 或 which。who 和 whom 修饰人，where 修饰地点。",
        hint: "关系代词修饰事物作主语时，用 that。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "differentiation",
        prompt: "请选出填空最恰当的一项：They are excited to ________ on a new journey in senior high.",
        options: ["set out", "set up", "set off", "set down"],
        answer: 0,
        explanation: "set out on a new journey 是固定搭配，意为“开始新的旅程”。set off 也可以表示出发，但一般不与 on a new journey 这样连用，set out 更侧重着手或开始某事。set up 是建立的意思。",
        hint: "出发、着手新的旅程：set out on..."
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "usage",
        prompt: "请选出填空最恰当的一项：Never fail ________ thankful to those who support you.",
        options: ["to be", "being", "been", "be"],
        answer: 0,
        explanation: "fail to do sth. 意为“未能做某事；忘记做某事”。Never fail to be... 意思是“永远不要忘记做……”。",
        hint: "fail 后面接不定式 to do 形式。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "differentiation",
        prompt: "请选出填空最恰当的一项：It's hard to separate ________ those whom you spent three years with.",
        options: ["from", "with", "to", "at"],
        answer: 0,
        explanation: "separate from sb./sth. 意为“与某人/某物分离、分开”。",
        hint: "与……分离用介词 from。"
    },
    {
        id: makeId(),
        type: "multiple-choice",
        category: "differentiation",
        prompt: "请选出填空最恰当的一项：I ________ believe that junior high school is over.",
        options: ["can't", "shouldn't", "mustn't", "needn't"],
        answer: 0,
        explanation: "can't believe 意为“不敢相信；无法相信”，表示说话者对初中生活这么快就结束感到惊讶和不舍。",
        hint: "不敢相信、无法相信：can't believe。"
    }
];

const gwChallenges = [
    {
        id: "c1",
        title: "Verb Forms & Gerunds",
        icon: "🧙‍♂️",
        questions: gwQuestions.slice(0, 10)
    },
    {
        id: "c2",
        title: "Adverbials & Relatives",
        icon: "⚡",
        questions: gwQuestions.slice(10, 20)
    }
];

const grammarWizardJson = {
    level: "Grade 9 - Unit 14",
    title: "Grammar Wizard",
    challenges: gwChallenges
};

fs.writeFileSync(path.join(unitFolder, 'a9-u14-grammar-wizard.json'), JSON.stringify(grammarWizardJson, null, 2) + '\n', 'utf8');
console.log("Generated a9-u14-grammar-wizard.json");

// ----------------------------------------------------
// 7. Text Navigator - Section A 3a Poem (a3a)
// ----------------------------------------------------
const a3aTree = {
    id: "root",
    text: "I Remember",
    cn: "我记得",
    emoji: "✍️",
    statement: "这是一首回忆初中三年生活的诗歌。",
    answer: true,
    explanation: "文章题为“I Remember（我记得）”，描述了初中三年的学习与生活回忆。",
    notes: "",
    children: [
        {
            id: "p1",
            text: "Looking back at these past three years",
            cn: "回首过去的这三年",
            emoji: "🕰️",
            statement: "“look back at”在这里是“向后看”的物理动作。",
            answer: false,
            explanation: "“look back at”在这里是隐喻用法，意为“回首往事、回忆”。",
            notes: "look back at 回忆，回顾",
            children: [
                {
                    id: "p2",
                    text: "I remember many things",
                    cn: "我记起了许多往事",
                    emoji: "🧠",
                    statement: "作者不记得初中发生的事情了。",
                    answer: false,
                    explanation: "作者说自己记起了许多事 (remember many things)。",
                    notes: "remember 记得，记起",
                    children: [
                        {
                            id: "p3",
                            text: "Trying to be on time for morning readings",
                            cn: "尽力在早读时按时到达",
                            emoji: "⏰",
                            statement: "作者早读经常迟到。",
                            answer: false,
                            explanation: "作者在尽力做到按时到达 (trying to be on time)。",
                            notes: "on time 按时；morning reading 早读",
                            children: []
                        },
                        {
                            id: "p4",
                            text: "Running when the lunch bell rings",
                            cn: "当午饭铃声响起时奔跑",
                            emoji: "🏃",
                            statement: "饭铃响起时，作者会飞奔向食堂。",
                            answer: true,
                            explanation: "这句话生动地描绘了下课铃响跑向食堂的情景。",
                            notes: "lunch bell 午饭铃声；ring 响",
                            children: []
                        }
                    ]
                }
            ]
        },
        {
            id: "p5",
            text: "I remember the excitement",
            cn: "我记得那份兴奋",
            emoji: "🎉",
            statement: "作者对学校活动感到非常无聊。",
            answer: false,
            explanation: "作者说他记得那份兴奋 (remember the excitement)。",
            notes: "excitement 兴奋",
            children: [
                {
                    id: "p6",
                    text: "Of the school sports day each year",
                    cn: "每年的学校运动会",
                    emoji: "🏅",
                    statement: "运动会每两年举办一次。",
                    answer: false,
                    explanation: "运动会是每年举办的 (each year)。",
                    notes: "sports day 运动会",
                    children: [
                        {
                            id: "p7",
                            text: "The many long hours of training",
                            cn: "那许多个小时的长久训练",
                            emoji: "⏱️",
                            statement: "运动员需要进行长期的训练。",
                            answer: true,
                            explanation: "“many long hours of training” 说明训练时间很长。",
                            notes: "training 训练",
                            children: []
                        },
                        {
                            id: "p8",
                            text: "Pride of overcoming fear",
                            cn: "以及战胜恐惧后的自豪",
                            emoji: "💪",
                            statement: "“overcome” 的过去式是 “overcame”。",
                            answer: true,
                            explanation: "overcome 的过去式是不规则变化，写作 overcame。",
                            notes: "pride 自豪；overcome 克服，战胜",
                            children: []
                        }
                    ]
                }
            ]
        },
        {
            id: "p9",
            text: "I remember starting day one",
            cn: "我记得第一天开学的时候",
            emoji: "🎒",
            statement: "作者记得开学第一天的事情。",
            answer: true,
            explanation: "作者以第一人称回忆开学第一天 (starting day one)。",
            notes: "day one 第一天",
            children: [
                {
                    id: "p10",
                    text: "The shyest in my whole class",
                    cn: "我是全班最害羞的人",
                    emoji: "🫣",
                    statement: "作者是班里最外向活泼的人。",
                    answer: false,
                    explanation: "作者是全班最害羞的人 (the shyest)。",
                    notes: "shyest 是 shy 的最高级形式",
                    children: [
                        {
                            id: "p11",
                            text: "Never speaking to anyone",
                            cn: "不和任何人说话",
                            emoji: "🤐",
                            statement: "作者刚开学时沉默寡言。",
                            answer: true,
                            explanation: "“never speaking to anyone” 说明他不和任何人交流。",
                            notes: "speak to sb. 和某人说话",
                            children: []
                        },
                        {
                            id: "p12",
                            text: "And thinking I would not pass",
                            cn: "还以为自己不会通过考试",
                            emoji: "😰",
                            statement: "作者一开始对自己很有信心。",
                            answer: false,
                            explanation: "作者以为自己不会通过 (thinking I would not pass)。",
                            notes: "pass 通过（考试）",
                            children: []
                        }
                    ]
                }
            ]
        },
        {
            id: "p13",
            text: "Then slowly I made some new friends",
            cn: "然后慢慢地，我结交了一些新朋友",
            emoji: "🤝",
            statement: "作者一直是孤身一人，没有朋友。",
            answer: false,
            explanation: "作者慢慢地交到了新朋友 (made some new friends)。",
            notes: "make friends 结交朋友",
            children: [
                {
                    id: "p14",
                    text: "To remember forever",
                    cn: "他们是我要永远记住的人",
                    emoji: "💖",
                    statement: "作者很快就会忘记这些朋友。",
                    answer: false,
                    explanation: "作者想永远记住他们 (remember forever)。",
                    notes: "forever 永远",
                    children: [
                        {
                            id: "p15",
                            text: "Helping each other with homework",
                            cn: "我们互相帮助做作业",
                            emoji: "📝",
                            statement: "他们各自做作业，从不交流。",
                            answer: false,
                            explanation: "他们会互相帮助 (helping each other)。",
                            notes: "each other 互相；homework 家庭作业",
                            children: []
                        },
                        {
                            id: "p16",
                            text: "Getting better together",
                            cn: "一起变得更好",
                            emoji: "📈",
                            statement: "和朋友在一起让他们共同进步了。",
                            answer: true,
                            explanation: "“getting better together” 表达了共同成长和进步。",
                            notes: "get better 变好，进步",
                            children: []
                        }
                    ]
                }
            ]
        },
        {
            id: "p17",
            text: "Preparing for art festivals",
            cn: "为艺术节做准备",
            emoji: "🎨",
            statement: "他们在准备体育比赛。",
            answer: false,
            explanation: "他们在准备艺术节 (art festivals)。",
            notes: "prepare for 为……做准备；art festival 艺术节",
            children: [
                {
                    id: "p18",
                    text: "And making a great big mess",
                    cn: "把地方弄得一团糟",
                    emoji: "🗑️",
                    statement: "“make a mess” 是把地方弄得干净整洁的意思。",
                    answer: false,
                    explanation: "“make a mess” 是弄得一团糟的意思。",
                    notes: "make a mess 弄得一团糟",
                    children: [
                        {
                            id: "p19",
                            text: "Having fun at New Year's parties",
                            cn: "在新年派对上玩得开心",
                            emoji: "🥳",
                            statement: "他们在新年派对上感到很无聊。",
                            answer: false,
                            explanation: "他们在派对上玩得很开心 (having fun)。",
                            notes: "have fun 玩得开心；New Year's party 新年派对",
                            children: []
                        },
                        {
                            id: "p20",
                            text: "Wishing everyone the best",
                            cn: "祝愿每个人一切顺利",
                            emoji: "🙏",
                            statement: "“wish sb. the best” 是祝愿某人一切顺利的友好表达。",
                            answer: true,
                            explanation: "这表达了对大家的美好祝愿。",
                            notes: "wish sb. the best 祝愿某人一切顺利",
                            children: []
                        }
                    ]
                }
            ]
        },
        {
            id: "p21",
            text: "We have learned a different language",
            cn: "我们学习了一种不同的语言",
            emoji: "🇬🇧",
            statement: "他们没有学习任何外语。",
            answer: false,
            explanation: "他们学习了一门不同的语言 (different language)，指英语。",
            notes: "language 语言",
            children: [
                {
                    id: "p22",
                    text: "That is from a foreign land",
                    cn: "它来自一个异国他乡",
                    emoji: "🌍",
                    statement: "“land” 在这里指的是“泥土”。",
                    answer: false,
                    explanation: "“land” 在这里指的是“国家”，a foreign land 指外国。",
                    notes: "foreign 外国的；land 国家，土地",
                    children: [
                        {
                            id: "p23",
                            text: "English brings many challenges",
                            cn: "英语带来了许多挑战",
                            emoji: "🧗",
                            statement: "学习英语对他们来说极其简单，没有任何困难。",
                            answer: false,
                            explanation: "英语学习带来了很多挑战 (many challenges)。",
                            notes: "challenge 挑战",
                            children: []
                        },
                        {
                            id: "p24",
                            text: "We work hard to understand",
                            cn: "我们努力工作去理解它",
                            emoji: "🧠",
                            statement: "他们不努力学习英语。",
                            answer: false,
                            explanation: "他们工作很努力去理解 (work hard to understand)。",
                            notes: "work hard 努力工作/学习",
                            children: []
                        }
                    ]
                }
            ]
        },
        {
            id: "p25",
            text: "And now it's time to graduate",
            cn: "现在该是毕业的时候了",
            emoji: "🎓",
            statement: "现在是开学第一天。",
            answer: false,
            explanation: "作者说现在到了毕业的时候 (time to graduate)。",
            notes: "time to do sth. 该做某事的时间了；graduate 毕业",
            children: [
                {
                    id: "p26",
                    text: "We will leave our lovely school",
                    cn: "我们将离开我们可爱的学校",
                    emoji: "🏫",
                    statement: "他们将继续留在这所学校上高中。",
                    answer: false,
                    explanation: "他们将要离开这所学校 (leave our lovely school)。",
                    notes: "leave 离开；lovely 可爱的",
                    children: [
                        {
                            id: "p27",
                            text: "I can't believe it's been three years",
                            cn: "我真不敢相信已经过去了三年",
                            emoji: "⏳",
                            statement: "作者觉得时间过得非常慢。",
                            answer: false,
                            explanation: "“I can't believe” 表达了作者对三年时光飞逝的惊讶。",
                            notes: "can't believe 无法相信",
                            children: []
                        },
                        {
                            id: "p28",
                            text: "I'm trying to keep my cool",
                            cn: "我正努力保持冷静",
                            emoji: "❄️",
                            statement: "“keep my cool” 意为“尽力保持冷静，控制情绪”。",
                            answer: true,
                            explanation: "keep one's cool 意为保持冷静，沉住气。",
                            notes: "keep one's cool 保持冷静",
                            children: []
                        }
                    ]
                }
            ]
        },
        {
            id: "p29",
            text: "But it's difficult not to cry",
            cn: "但是要忍住不哭太难了",
            emoji: "😭",
            statement: "作者此时感到非常开心，一点也不难过。",
            answer: false,
            explanation: "“difficult not to cry” 说明作者非常难过不舍，想哭。",
            notes: "difficult 困难的；not to cry 不哭",
            children: [
                {
                    id: "p30",
                    text: "I'll miss the school trees and flowers",
                    cn: "我会想念学校的树木和花朵",
                    emoji: "🌸",
                    statement: "作者不会想念学校里的任何植物。",
                    answer: false,
                    explanation: "作者表示他会想念树木和花朵 (miss the trees and flowers)。",
                    notes: "miss 想念",
                    children: [
                        {
                            id: "p31",
                            text: "And our kind and caring teachers",
                            cn: "还有我们善良而又体贴的老师",
                            emoji: "👩‍🏫",
                            statement: "“caring” 意为“体贴的，关心他人的”。",
                            answer: true,
                            explanation: "caring 形容老师非常体贴、关心学生。",
                            notes: "kind 善良的；caring 关心的，体贴的",
                            children: []
                        },
                        {
                            id: "p32",
                            text: "Wonderful memories of ours",
                            cn: "那些属于我们的美好回忆",
                            emoji: "✨",
                            statement: "“ours” 相当于 “our memories”。",
                            answer: true,
                            explanation: "ours 是名词性物主代词，指代“我们的回忆”。",
                            notes: "wonderful 美妙的；ours 我们的",
                            children: []
                        }
                    ]
                }
            ]
        }
    ]
};

const textNavigatorA3aJson = {
    level: "Grade 9",
    part: "Unit 14",
    section: "Section A 3a",
    tree: a3aTree
};

fs.writeFileSync(path.join(unitFolder, 'a9-u14-text-navigator-a3a.json'), JSON.stringify(textNavigatorA3aJson, null, 2) + '\n', 'utf8');
console.log("Generated a9-u14-text-navigator-a3a.json");

// ----------------------------------------------------
// 8. Text Navigator - Section B 2b Graduation Speech (b2b)
// ----------------------------------------------------
const b2bTree = {
    id: "root",
    text: "Graduation Speech",
    cn: "毕业典礼致辞",
    emoji: "🎤",
    statement: "这是一篇在毕业典礼上的致辞发言。",
    answer: true,
    explanation: "文章开头向“Ladies and gentlemen”打招呼，并提到“attend the graduation ceremony”，属于毕业演讲。",
    notes: "",
    children: [
        {
            id: "s1",
            text: "Thank you for coming today to attend the graduation ceremony at No. 3 Junior High School.",
            cn: "感谢你们今天来参加第三初级中学的毕业典礼。",
            emoji: "🏛️",
            statement: "毕业典礼是在第一初级中学举行的。",
            answer: false,
            explanation: "典礼是在 No. 3 Junior High School（第三初级中学）举行。",
            notes: "thank you for doing 因某事感谢某人；attend 参加；ceremony 典礼",
            children: [
                {
                    id: "s2",
                    text: "First of all, I'd like to congratulate all the students who are here today.",
                    cn: "首先，我想向今天在这里的所有学生表示祝贺。",
                    emoji: "🎉",
                    statement: "“first of all” 的意思是“首先”。",
                    answer: true,
                    explanation: "first of all 是常用短语，表示首先、第一。",
                    notes: "first of all 首先；congratulate 祝贺",
                    children: [
                        {
                            id: "s3",
                            text: "I remember meeting all of you when you were just starting Grade 7 at this school.",
                            cn: "我记得在你们刚在这所学校开始上七年级时遇见你们的情景。",
                            emoji: "🏫",
                            statement: "发言人记得学生们刚入学时的情景。",
                            answer: true,
                            explanation: "作者用 I remember meeting you 表达了对学生入学时的会议。",
                            notes: "remember meeting 记得曾遇到过",
                            children: []
                        },
                        {
                            id: "s4",
                            text: "You were all so full of energy and thirsty for knowledge.",
                            cn: "你们那时都是如此充满活力，渴望知识。",
                            emoji: "⚡",
                            statement: "“thirsty for knowledge” 意思是学生们对知识充满渴望。",
                            answer: true,
                            explanation: "be thirsty for 表示渴望，如饥似渴地追求知识。",
                            notes: "full of 充满；thirsty for 渴望",
                            children: []
                        }
                    ]
                }
            ]
        },
        {
            id: "s5",
            text: "Although you've all worked very hard over the last three years, none of you did it alone.",
            cn: "虽然在过去的三年里你们都工作得非常努力，但你们没有一个人是独自完成的。",
            emoji: "🤝",
            statement: "虽然学生们学习很刻苦，但他们得到了很多人的支持。",
            answer: true,
            explanation: "none of you did it alone 意思是没有人是孤立无援的，大家都得到了支持。",
            notes: "Although 虽然；none 没有一个",
            children: [
                {
                    id: "s6",
                    text: "I hope you'll remember the important people in your lives who helped and supported you—your parents, your teachers and your friends.",
                    cn: "我希望你们能记住生命中帮助和支持过你们的重要人物——你们的父母、老师和朋友。",
                    emoji: "❤️",
                    statement: "学生应该感谢父母、老师和朋友。",
                    answer: true,
                    explanation: "文中列举了父母、老师和朋友作为支持者的代表。",
                    notes: "support 支持；parents 父母",
                    children: [
                        {
                            id: "s7",
                            text: "Never fail to be thankful to the people around you.",
                            cn: "永远不要忘记感激你身边的那些人。",
                            emoji: "🙏",
                            statement: "“Never fail to be...” 意思是“绝不要忘记做……”。",
                            answer: true,
                            explanation: "fail to do 意为未能做某事，双重否定 never fail to 表示“务必、永远不要忘记”。",
                            notes: "fail to do 未能做某事；thankful 感激的",
                            children: []
                        }
                    ]
                }
            ]
        },
        {
            id: "s8",
            text: "Lastly, the end of junior high school is the beginning of a new life.",
            cn: "最后，初中生活的结束是一个新生活的开始。",
            emoji: "🌅",
            statement: "初中结束代表学业的终结，以后不再学习了。",
            answer: false,
            explanation: "初中结束是新生活的开始 (the beginning of a new life)。",
            notes: "lastly 最后；beginning 开始",
            children: [
                {
                    id: "s9",
                    text: "I don't need to tell you that life in senior high school will be harder and that you have many difficult tasks ahead of you.",
                    cn: "我不需要告诉你们高中的生活将会更加艰难，在你们的前方有许多艰难的任务。",
                    emoji: "🏔️",
                    statement: "高中的学习任务会比初中更加轻松。",
                    answer: false,
                    explanation: "演讲中提到高中生活将更加艰难 (harder)，有更难的任务 (difficult tasks)。",
                    notes: "senior high 高中；ahead of 在……前面",
                    children: [
                        {
                            id: "s10",
                            text: "You'll make mistakes along the way, but the key is to learn from your mistakes and never give up.",
                            cn: "在行进的道路上你会犯错误，但关键是从错误中学习并且永不放弃。",
                            emoji: "💡",
                            statement: "犯错没关系，关键是从中汲取教训并坚持下去。",
                            answer: true,
                            explanation: "“learn from your mistakes and never give up” 是成功的关键。",
                            notes: "make mistakes 犯错；give up 放弃",
                            children: []
                        },
                        {
                            id: "s11",
                            text: "Behind each door you open are chances to learn new things, and you have the ability to make your own choices.",
                            cn: "在你打开的每一扇门后面都是学习新事物的机会，并且你有能力做出你自己的选择。",
                            emoji: "🚪",
                            statement: "学生们没有权利和能力自己做选择。",
                            answer: false,
                            explanation: "演讲说学生有能力做自己的选择 (have the ability to make your own choices)。",
                            notes: "chance 机会；ability 能力；make choices 做出选择",
                            children: []
                        }
                    ]
                }
            ]
        },
        {
            id: "s12",
            text: "As you set out on your new journey, you shouldn't forget where you came from.",
            cn: "在你们开始新的旅程时，你不应该忘记你来自何处。",
            emoji: "🎒",
            statement: "毕业后，学生们应该忘掉过去，永远不回头。",
            answer: false,
            explanation: "As you set out... you shouldn't forget where you came from 意为不要忘记母校和起点。",
            notes: "set out on 开始进行；journey 旅程，阶段",
            children: [
                {
                    id: "s13",
                    text: "The future is yours.",
                    cn: "未来是属于你们的。",
                    emoji: "🌟",
                    statement: "未来掌握在学生们自己手中。",
                    answer: true,
                    explanation: "“The future is yours” 指未来属于你们，由你们创造。",
                    notes: "future 未来；yours 你们的",
                    children: []
                }
            ]
        }
    ]
};

const textNavigatorB2bJson = {
    level: "Grade 9",
    part: "Unit 14",
    section: "Section B 2b",
    tree: b2bTree
};

fs.writeFileSync(path.join(unitFolder, 'a9-u14-text-navigator-b2b.json'), JSON.stringify(textNavigatorB2bJson, null, 2) + '\n', 'utf8');
console.log("Generated a9-u14-text-navigator-b2b.json");

// ----------------------------------------------------
// 9. Passage Decoder (PD)
// ----------------------------------------------------
// It contains sections: "Section A 3a Poem" and "Section B 2b Graduation Speech"
// Each sentence has exactly 3 options. Shuffling is done programmatically below.
const pdA3aSentences = [
    { en: "Looking back at these past three years I remember many things", options: ["回首过去的这三年，我记起了许多往事。", "展望未来的这三年，我计划了许多事情。", "回首过去的这三个星期，我记起了许多往事。"] },
    { en: "Trying to be on time for morning readings", options: ["尽力在早读时按时到达", "经常在早读时迟到", "努力在早上进行阅读训练"] },
    { en: "Running when the lunch bell rings", options: ["当午饭铃声响起时奔跑", "当午饭铃声响起时排队", "当下课铃声响起时散步"] },
    { en: "I remember starting day one", options: ["我记得第一天开学的时候", "我记得第一天放假的时候", "我计划在第一天开始做某事"] },
    { en: "The shyest in my whole class", options: ["我是全班最害羞的人", "我是全班最聪明的人", "他是全班最害羞的人"] },
    { en: "Never speaking to anyone", options: ["不和任何人说话", "总是和每个人说话", "从来不听别人说话"] },
    { en: "And thinking I would not pass", options: ["还以为自己不会通过考试", "还以为自己不会不及格", "并计划着自己能够通过"] },
    { en: "Then slowly I made some new friends", options: ["然后慢慢地，我结交了一些新朋友", "然后很快地，我结交了一些新朋友", "然后慢慢地，我失去了一些旧朋友"] },
    { en: "Helping each other with homework", options: ["我们互相帮助做作业", "我们互相抄袭作业", "他经常帮助我做家务"] },
    { en: "Getting better together", options: ["一起变得更好", "一起去更好的地方", "独自取得进步"] },
    { en: "Preparing for art festivals and making a great big mess", options: ["为艺术节做准备，把地方弄得一团糟", "为体育节做准备，把地方弄得一团糟", "为艺术节做准备，把地方收拾得干干净净"] },
    { en: "Having fun at New Year's parties wishing everyone the best", options: ["在新年派对上玩得开心，祝愿每个人一切顺利", "在生日派对上玩得开心，祝愿每个人一切顺利", "在新年派对上玩得开心，但希望早点回家"] },
    { en: "We have learned a different language that is from a foreign land", options: ["我们学习了一种不同的语言，它来自异国他乡", "我们学习了一种不同的语言，它来自我们自己的国家", "我们习惯了用不同的语言，去跟外国人交流"] },
    { en: "English brings many challenges we work hard to understand", options: ["英语带来了许多挑战，我们努力去理解它", "英语带来了许多机会，我们努力去抓住它", "英语带来了许多问题，我们不知道怎么解决"] },
    { en: "And now it's time to graduate we will leave our lovely school", options: ["现在该是毕业的时候了，我们将离开我们可爱的学校", "现在该是开学的时候了，我们将回到我们可爱的学校", "现在该是毕业的时候了，我们将继续留在这所学校"] },
    { en: "I can't believe it's been three years I'm trying to keep my cool", options: ["我真不敢相信已经过去了三年，我正努力保持冷静", "我真不敢相信已经过去了三年，我感到非常兴奋", "我无法相信才过去了三个星期，我想保持冷静"] },
    { en: "But it's difficult not to cry", options: ["但是要忍住不哭太难了", "但是想哭出来其实很容易", "但是想保持开心并不难"] },
    { en: "I'll miss the school trees and flowers and our kind and caring teachers", options: ["我会想念学校的树木和花草，还有我们善良体贴的老师", "我会想念学校的树木和花草，虽然老师非常严厉", "我会想念学校的建筑和花草，还有我们善良体贴的老师"] }
];

const pdB2bSentences = [
    { en: "Thank you for coming today to attend the graduation ceremony at No. 3 Junior High School.", options: ["感谢你们今天来参加第三初级中学的毕业典礼。", "感谢你们今天来参观第三初级中学的校园。", "感谢你们在过去三年里支持我们第三初级中学。"] },
    { en: "First of all, I'd like to congratulate all the students who are here today.", options: ["首先，我想向今天在这里的所有学生表示祝贺。", "最后，我想向今天在这里的所有老师表示祝贺。", "首先，我想向今天没能来的学生表示祝贺。"] },
    { en: "I remember meeting all of you when you were just starting Grade 7 at this school.", options: ["我记得在你们刚在这所学校开始上七年级时遇见你们的情景。", "我记得在你们七年级毕业离开这所学校时送别你们的情景。", "我记得当你们还是七年级新生时我没有关注到你们。"] },
    { en: "You were all so full of energy and thirsty for knowledge.", options: ["你们那时都是如此充满活力，渴望知识。", "你们那时都是如此疲惫不堪，渴望休息。", "你们那时都是如此调皮捣蛋，渴望玩耍。"] },
    { en: "Although you've all worked very hard over the last three years, none of you did it alone.", options: ["虽然在过去的三年里你们都工作得非常努力，但你们没有一个人是独自完成的。", "虽然在过去的三年里你们没有怎么努力，但你们都是独立完成的。", "虽然在过去的三年里你们都非常努力，但有些人是独自度过的。"] },
    { en: "I hope you'll remember the important people in your lives who helped and supported you.", options: ["我希望你们能记住生命中帮助和支持过你们的重要人物。", "我希望你们能感激学校为你们提供的发展和教育机会。", "我希望你们能记得在学校里结识的那些好朋友。"] },
    { en: "Never fail to be thankful to the people around you.", options: ["永远不要忘记感激你身边的那些人。", "永远不要忘记感谢学校给你们提供的支持。", "永远不要忘记向你身边的人表达歉意。"] },
    { en: "Lastly, the end of junior high school is the beginning of a new life.", options: ["最后，初中生活的结束是一个新生活的开始。", "总之，初中生活的结束标志着你们学业的终结。", "最后，初中生活的结束是一个巨大挑战的开始。"] },
    { en: "Life in senior high school will be harder and you have many difficult tasks ahead of you.", options: ["高中的生活将会更加艰难，在你们的前方有许多艰难的任务。", "高中的生活将会更加精彩，在你们的前方有许多精彩的活动。", "高中的生活其实挺轻松的，虽然你们前面有一些任务。"] },
    { en: "You'll make mistakes along the way, but the key is to learn from your mistakes and never give up.", options: ["在行进的道路上你会犯错误，但关键是从错误中学习并且永不放弃。", "在学习的道路上你会遇到挫折，但关键是避免犯错并保持自信。", "在成长的道路上你会犯很多错，但关键是改正错误并听从老师建议。"] },
    { en: "Behind each door you open are chances to learn new things.", options: ["在你打开的每一扇门后面都是学习新事物的机会。", "在你打开的每一扇门后面都是充满未知和危险的挑战。", "在你打开的每一扇门后面都有帮助你走向成功的人。"] },
    { en: "You have the ability to make your own choices.", options: ["你有能力做出你自己的选择。", "你有责任听从父母为你做的决定。", "你有机会改变你过去的选择。"] },
    { en: "Choose wisely and be responsible for your decisions and actions.", options: ["做出明智的选择，并对你的决定和行为负责。", "做出快速的选择，并且不要为你的决定感到后悔。", "做出聪明的选择，虽然你的行为可能会带来后果。"] },
    { en: "As you set out on your new journey, you shouldn't forget where you came from.", options: ["在你们开始新的旅程时，你不应该忘记你来自何处。", "在你们开始新的旅程时，你不应该忘记你们的目标是什么。", "当你们去往新的学校时，你们应该多回想过去的生活。"] },
    { en: "The future is yours.", options: ["未来是属于你们的。", "未来是由你们创造的。", "未来其实是未知的。"] }
];

const pdSections = [
    {
        title: "Section A 3a Poem",
        sentences: pdA3aSentences.map(s => {
            // Shuffle
            const zipped = s.options.map((opt, idx) => ({ opt, isCorrect: idx === 0 }));
            for (let i = zipped.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [zipped[i], zipped[j]] = [zipped[j], zipped[i]];
            }
            const shuffledOptions = zipped.map(z => z.opt);
            const ansIdx = zipped.findIndex(z => z.isCorrect);

            return {
                id: makeId(),
                en: s.en,
                options: shuffledOptions,
                answer: ansIdx,
                newline: true
            };
        })
    },
    {
        title: "Section B 2b Graduation Speech",
        sentences: pdB2bSentences.map(s => {
            const zipped = s.options.map((opt, idx) => ({ opt, isCorrect: idx === 0 }));
            for (let i = zipped.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [zipped[i], zipped[j]] = [zipped[j], zipped[i]];
            }
            const shuffledOptions = zipped.map(z => z.opt);
            const ansIdx = zipped.findIndex(z => z.isCorrect);

            return {
                id: makeId(),
                en: s.en,
                options: shuffledOptions,
                answer: ansIdx,
                newline: true
            };
        })
    }
];

const passageDecoderJson = {
    level: "Grade 9 - Unit 14",
    title: "Passage Decoder",
    sections: pdSections
};

const pdPath = path.join(unitFolder, 'a9-u14-passage-decoder-s.json');
fs.writeFileSync(pdPath, JSON.stringify(passageDecoderJson, null, 2) + '\n', 'utf8');
console.log("Generated a9-u14-passage-decoder-s.json");

// Run highlight script
processFile(path.join(unitFolder, 'a9-u14-vocab-guide.json'), pdPath);

// ----------------------------------------------------
// 10. Writing Task (a9-u14-writing-task.md)
// ----------------------------------------------------
const writingTaskContent = `### 写作任务：难忘的人或事

回想一下初中生活里你永远不会忘记的一个人或一件事。写一篇短文描述这个人或这件事，解释你对他们或它的感受，并详细说明他们或它在某种程度上改变了你的生活。

### Model Essay 1 (Basic)
I will never forget my English teacher, Ms. Griffin. When I first met her in Grade 7, I was very shy. I was afraid of speaking English in class. However, Ms. Griffin was always patient and friendly. She often smiled at me and said, "You can do it!" Because of her encouragement, I started to put in more effort. My exam scores doubled. I am very thankful to Ms. Griffin. She changed my life by making me more confident.

### Model Essay 2 (Advanced)
Looking back at my junior high school years, there is one person whom I will never forget. That person is Ms. Griffin, my kind and caring English teacher. When I entered Grade 7, I was the shiest student in my class, often remaining silent and fearing that I would fail. Fortunately, Ms. Griffin noticed my anxiety and was always patient with me. Whenever I encountered difficulties, she guided me to find the answers instead of just giving them to me. She constantly encouraged me, saying, "You can do it!" Inspired by her belief in me, I put in much more effort, and as a result, my exam scores doubled. Now that I am about to graduate, I feel extremely thankful to her. Not only did she help me improve my grades, but she also taught me how to overcome fear. She has truly changed my life, and I will look forward to senior high with the confidence she gave me.
`;

fs.writeFileSync(path.join(unitFolder, 'a9-u14-writing-task.md'), writingTaskContent, 'utf8');
console.log("Generated a9-u14-writing-task.md");

// ----------------------------------------------------
// 11. Writing Map Model 1 (Basic)
// ----------------------------------------------------
const model1Tree = {
    id: "root",
    text: "My English Teacher",
    emoji: "👩‍🏫",
    children: [
        {
            id: "m1_p1",
            text: "I will never forget my English teacher, Ms. Griffin.",
            emoji: "🏫",
            cn: "我永远不会忘记我的英语老师格里芬女士。",
            children: []
        },
        {
            id: "m1_p2",
            text: "When I first met her in Grade 7, I was very shy.",
            emoji: "🫣",
            cn: "当我在七年级第一次见到她时，我非常害羞。",
            children: [
                {
                    id: "m1_p2_1",
                    text: "I was afraid of speaking English in class.",
                    emoji: "😰",
                    cn: "我害怕在课堂上说英语。",
                    children: []
                }
            ]
        },
        {
            id: "m1_p3",
            text: "However, Ms. Griffin was always patient and friendly.",
            emoji: "😊",
            highlight: "However",
            cn: "然而，格里芬老师总是很有耐心且非常友好。",
            children: [
                {
                    id: "m1_p3_1",
                    text: "She often smiled at me and said, \"You can do it!\"",
                    emoji: "💬",
                    cn: "她经常对我微笑并说：“你能行！”",
                    children: []
                }
            ]
        },
        {
            id: "m1_p4",
            text: "Because of her encouragement, I started to put in more effort.",
            emoji: "💪",
            highlight: "Because of",
            cn: "因为她的鼓励，我开始付出更多努力。",
            children: [
                {
                    id: "m1_p4_1",
                    text: "My exam scores doubled.",
                    emoji: "📈",
                    cn: "我的考试成绩翻了一番。",
                    children: []
                }
            ]
        },
        {
            id: "m1_p5",
            text: "I am very thankful to Ms. Griffin.",
            emoji: "🙏",
            cn: "我非常感激格里芬老师。",
            children: [
                {
                    id: "m1_p5_1",
                    text: "She changed my life by making me more confident.",
                    emoji: "✨",
                    cn: "她通过让我变得更加自信改变了我的人生。",
                    children: []
                }
            ]
        }
    ]
};

const model1Json = {
    level: "Grade 9 - Unit 14",
    title: "Writing Map Model 1",
    section: "Model Essay 1",
    tree: model1Tree
};

fs.writeFileSync(path.join(unitFolder, 'a9-u14-writing-map-model-1.json'), JSON.stringify(model1Json, null, 2) + '\n', 'utf8');
console.log("Generated a9-u14-writing-map-model-1.json");

// ----------------------------------------------------
// 12. Writing Map Model 2 (Advanced)
// ----------------------------------------------------
const model2Tree = {
    id: "root",
    text: "Ms. Griffin's Influence",
    emoji: "🌟",
    children: [
        {
            id: "m2_p1",
            text: "Looking back at my junior high school years, there is one person whom I will never forget.",
            emoji: "🕰️",
            highlight: "Looking back at, whom",
            cn: "回首我的初中岁月，有一个人我永远不会忘记。",
            children: [
                {
                    id: "m2_p1_1",
                    text: "That person is Ms. Griffin, my kind and caring English teacher.",
                    emoji: "👩‍🏫",
                    cn: "那个人就是格里芬老师，我善良而又体贴的英语老师。",
                    children: []
                }
            ]
        },
        {
            id: "m2_p2",
            text: "When I entered Grade 7, I was the shiest student in my class, often remaining silent and fearing that I would fail.",
            emoji: "🫣",
            highlight: "When, and, that",
            cn: "当我进入七年级时，我是班里最害羞的学生，经常保持沉默并担心自己会不及格。",
            children: [
                {
                    id: "m2_p2_1",
                    text: "Fortunately, Ms. Griffin noticed my anxiety and was always patient with me.",
                    emoji: "😊",
                    highlight: "Fortunately, and",
                    cn: "幸运的是，格里芬老师注意到了我的焦虑，并且总是对我很耐心。",
                    children: []
                }
            ]
        },
        {
            id: "m2_p3",
            text: "Whenever I encountered difficulties, she guided me to find the answers instead of just giving them to me.",
            emoji: "💡",
            highlight: "Whenever, instead of",
            cn: "每当我遇到困难时，她都会引导我自己找出答案，而不是直接把答案给我。",
            children: [
                {
                    id: "m2_p3_1",
                    text: "She constantly encouraged me, saying, \"You can do it!\"",
                    emoji: "💬",
                    cn: "她不断鼓励我，说：“你能行！”",
                    children: []
                }
            ]
        },
        {
            id: "m2_p4",
            text: "Inspired by her belief in me, I put in much more effort, and as a result, my exam scores doubled.",
            emoji: "📈",
            highlight: "and, as a result",
            cn: "在对我的信任鼓舞下，我付出了多得多的努力，因此，我的考试成绩翻了一番。",
            children: []
        },
        {
            id: "m2_p5",
            text: "Now that I am about to graduate, I feel extremely thankful to her.",
            emoji: "🎓",
            highlight: "Now that",
            cn: "既然我即将毕业，我感到极其感激她。",
            children: [
                {
                    id: "m2_p5_1",
                    text: "Not only did she help me improve my grades, but she also taught me how to overcome fear.",
                    emoji: "💪",
                    highlight: "Not only...but she also, how to",
                    cn: "她不仅帮助我提高了成绩，而且还教会我了如何克服恐惧。",
                    children: [
                        {
                            id: "m2_p5_1_1",
                            text: "She has truly changed my life, and I will look forward to senior high with the confidence she gave me.",
                            emoji: "✨",
                            highlight: "and, look forward to",
                            cn: "她真的改变了我的生活，我将带着她给我的信心向往高中生活。",
                            children: []
                        }
                    ]
                }
            ]
        }
    ]
};

const model2Json = {
    level: "Grade 9 - Unit 14",
    title: "Writing Map Model 2",
    section: "Model Essay 2",
    tree: model2Tree
};

fs.writeFileSync(path.join(unitFolder, 'a9-u14-writing-map-model-2.json'), JSON.stringify(model2Json, null, 2) + '\n', 'utf8');
console.log("Generated a9-u14-writing-map-model-2.json");

console.log("All Grade 9 Unit 14 practice exercises compiled successfully!");

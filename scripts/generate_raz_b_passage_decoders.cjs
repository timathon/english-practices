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

const razBData = {
    "raz-b-a-cold-day": {
        level: "RAZ-B",
        sectionTitle: "Main Story",
        sentences: [
            { en: "The air feels cold today.", options: ["空气今天感觉很冷。", "空气今天感觉很热。", "空气今天感觉很潮湿。"], newline: true },
            { en: "The car feels cold today.", options: ["汽车今天感觉很冷。", "自行车今天感觉很冷。", "汽车今天感觉很脏。"], newline: true },
            { en: "The tree feels cold today.", options: ["树木今天感觉很冷。", "树木今天感觉很热。", "花朵今天感觉很冷。"], newline: true },
            { en: "The fence feels cold today.", options: ["篱笆今天感觉很冷。", "房子今天感觉很冷。", "篱笆今天感觉很矮。"], newline: true },
            { en: "The mailbox feels cold today.", options: ["信箱今天感觉很冷。", "书包今天感觉很冷。", "邮箱今天感觉很脏。"], newline: true },
            { en: "The mail feels cold today.", options: ["邮件今天感觉很冷。", "书本今天感觉很冷。", "邮件今天感觉很好。"], newline: true },
            { en: "The door handle feels cold today.", options: ["门把手今天感觉很冷。", "门把手今天感觉很热。", "窗户把手今天感觉很冷。"], newline: true },
            { en: "The hot chocolate feels good today!", options: ["热巧克力今天感觉很好！", "热牛奶今天感觉很好！", "冷饮今天感觉很好！"], newline: true }
        ]
    },
    "raz-b-after-school": {
        level: "RAZ-B",
        sectionTitle: "Main Story",
        sentences: [
            { en: "I like to study after school.", options: ["我喜欢放学后学习。", "我喜欢放学后玩耍。", "我喜欢上学前学习。"], newline: true },
            { en: "I like to play after school.", options: ["我喜欢放学后玩耍。", "我喜欢放学后学习。", "我喜欢放学后跳舞。"], newline: true },
            { en: "I like to dance after school.", options: ["我喜欢放学后跳舞。", "我喜欢放学后唱歌。", "我喜欢放学后画画。"], newline: true },
            { en: "I like to act after school.", options: ["我喜欢放学后表演。", "我喜欢放学后看戏。", "我喜欢放学后唱歌。"], newline: true },
            { en: "I like to read after school.", options: ["我喜欢放学后读书。", "我喜欢放学后写字。", "我喜欢上学前读书。"], newline: true },
            { en: "I like to sing after school.", options: ["我喜欢放学后唱歌。", "我喜欢放学后听歌。", "我喜欢放学后弹琴。"], newline: true },
            { en: "I like to bike after school.", options: ["我喜欢放学后骑车。", "我喜欢放学后跑步。", "我喜欢放学后坐车。"], newline: true },
            { en: "We like to have fun after school.", options: ["我们喜欢放学后玩得开心。", "我们喜欢在学校里玩。", "我们喜欢放学后去学习。"], newline: true }
        ]
    },
    "raz-b-all-by-myself": {
        level: "RAZ-B",
        sectionTitle: "Main Story",
        sentences: [
            { en: "I read all by myself.", options: ["我独自看书。", "我独自写字。", "我们一起看书。"], newline: true },
            { en: "I colour all by myself.", options: ["我独自画画涂色。", "我独自做手工。", "我独自看书。"], newline: true },
            { en: "I sing all by myself.", options: ["我独自唱歌。", "我独自听音乐。", "我们一起唱歌。"], newline: true },
            { en: "I play all by myself.", options: ["我独自玩耍。", "我独自工作。", "他独自玩耍。"], newline: true },
            { en: "I build all by myself.", options: ["我独自建造。", "我独自画画。", "我独自破坏。"], newline: true },
            { en: "I listen all by myself.", options: ["我独自倾听。", "我独自说话。", "我们一起倾听。"], newline: true },
            { en: "I dress all by myself.", options: ["我独自穿衣服。", "我独自洗衣服。", "我独自洗脸。"], newline: true },
            { en: "I think all by myself.", options: ["我独自思考。", "我独自说话。", "他独自思考。"], newline: true }
        ]
    },
    "raz-b-amazing-caves": {
        level: "RAZ-B",
        sectionTitle: "Main Story",
        sentences: [
            { en: "This cave has sharp rocks.", options: ["这个洞穴有锋利的石头。", "这个洞穴有圆润的石头。", "那个洞穴有锋利的石头。"], newline: true },
            { en: "This cave has blue water.", options: ["这个洞穴有蓝色的水。", "这个洞穴有绿色的水。", "那个洞穴有蓝色的水。"], newline: true },
            { en: "This cave has black bats.", options: ["这个洞穴有黑色的蝙蝠。", "这个洞穴有白色的鸟。", "那个洞穴有黑色的蝙蝠。"], newline: true },
            { en: "This cave has big crystals.", options: ["这个洞穴有巨大的水晶。", "这个洞穴有很小的水晶。", "那个洞穴有巨大的水晶。"], newline: true },
            { en: "This cave has bright worms.", options: ["这个洞穴有明亮的虫子。", "这个洞穴有黑暗的虫子。", "那个洞穴有明亮的虫子。"], newline: true },
            { en: "This cave has old drawings.", options: ["这个洞穴有古老的画作。", "这个洞穴有现代的画作。", "那个洞穴有古老的画作。"], newline: true },
            { en: "This cave has shiny fish.", options: ["这个洞穴有闪闪发亮的鱼。", "这个洞穴有死去的鱼。", "那个洞穴有闪闪发亮的鱼。"], newline: true },
            { en: "What does this cave have?", options: ["这个洞穴有什么？", "那个洞穴有什么？", "这个洞穴有多大？"], newline: true }
        ]
    },
    "raz-b-animal-ears": {
        level: "RAZ-B",
        sectionTitle: "Main Story",
        sentences: [
            { en: "This elephant has big ears.", options: ["这头大象有大耳朵。", "这只大象有小耳朵。", "那头大象有大耳朵。"], newline: true },
            { en: "This beaver has small ears.", options: ["这只海狸有小耳朵。", "这只海狸有大耳朵。", "那只海狸有小耳朵。"], newline: true },
            { en: "This fox has pointed ears.", options: ["这只狐狸有尖耳朵。", "这只狐狸有圆耳朵。", "那只狐狸有尖耳朵。"], newline: true },
            { en: "This bear has round ears.", options: ["这只熊有圆耳朵。", "这只熊有尖耳朵。", "那只熊有圆耳朵。"], newline: true },
            { en: "This cat has striped ears.", options: ["这只猫有斑纹耳朵。", "这只猫有斑点耳朵。", "那只猫有斑纹耳朵。"], newline: true },
            { en: "This puppy has spotted ears.", options: ["这只小狗有斑点耳朵。", "这只小狗有条纹耳朵。", "那只小狗有斑点耳朵。"], newline: true },
            { en: "This rabbit has long ears.", options: ["这只兔子有长耳朵。", "这只兔子有短耳朵。", "那只兔子有长耳朵。"], newline: true },
            { en: "Does this seal have ears?", options: ["这只海豹有耳朵吗？", "那只海豹有耳朵吗？", "这只海豹有眼睛吗？"], newline: true }
        ]
    },
    "raz-b-animal-sounds": {
        level: "RAZ-B",
        sectionTitle: "Main Story",
        sentences: [
            { en: "Dogs bark.", options: ["狗会吠叫。", "猫会吠叫。", "狗会吼叫。"], newline: true },
            { en: "Cats meow.", options: ["猫会喵喵叫。", "狗会喵喵叫。", "猫会打鼾。"], newline: true },
            { en: "Cows moo.", options: ["牛会哞哞叫。", "羊会哞哞叫。", "牛会吃草。"], newline: true },
            { en: "Pigs oink.", options: ["猪会哼哼叫。", "狗会哼哼叫。", "猪会睡觉。"], newline: true },
            { en: "Birds chirp.", options: ["鸟会叽叽喳喳叫。", "鱼会叽叽喳喳叫。", "鸟会飞。"], newline: true },
            { en: "Ducks quack.", options: ["鸭子会嘎嘎叫。", "鸡会嘎嘎叫。", "鸭子会游泳。"], newline: true },
            { en: "Snakes hiss.", options: ["蛇会发出嘶嘶声。", "蛇会发出吼叫声。", "蛇会爬行。"], newline: true },
            { en: "Bees buzz.", options: ["蜜蜂会嗡嗡叫。", "苍蝇会嗡嗡叫。", "蜜蜂会采蜜。"], newline: true },
            { en: "Lions roar.", options: ["狮子会吼叫。", "老虎会吼叫。", "狮子会睡觉。"], newline: true },
            { en: "Dads snore.", options: ["爸爸会打鼾。", "妈妈会打鼾。", "爸爸会睡觉。"], newline: true }
        ]
    },
    "raz-b-animals-can-move": {
        level: "RAZ-B",
        sectionTitle: "Main Story",
        sentences: [
            { en: "The camel can walk.", options: ["骆驼会行走。", "骆驼会奔跑。", "大象会行走。"], newline: true },
            { en: "The horse can run.", options: ["马会奔跑。", "马会走路。", "牛会奔跑。"], newline: true },
            { en: "The snake can slither.", options: ["蛇会爬行。", "蛇会飞翔。", "蛇会跳跃。"], newline: true },
            { en: "The rabbit can hop.", options: ["兔子会蹦跳。", "兔子会奔跑。", "袋鼠会蹦跳。"], newline: true },
            { en: "The polar bear can swim.", options: ["北极熊会游泳。", "北极熊会爬行。", "黑熊会游泳。"], newline: true },
            { en: "The bird can fly.", options: ["鸟会飞行。", "鸟会游泳。", "蝴蝶会飞行。"], newline: true },
            { en: "The bug can crawl.", options: ["昆虫会爬行。", "昆虫会飞行。", "蜘蛛会爬行。"], newline: true },
            { en: "How can these animals move?", options: ["这些动物会怎样移动？", "那些动物会怎样移动？", "这些动物住在哪里？"], newline: true }
        ]
    },
    "raz-b-go-animals-go": {
        level: "RAZ-B",
        sectionTitle: "Main Story",
        sentences: [
            { en: "The cow is in a car.", options: ["奶牛在小汽车里。", "奶牛在小汽车上面。", "小猪在小汽车里。"], newline: true },
            { en: "The pig is on a bike.", options: ["小猪在自行车上。", "小猪在自行车里面。", "小猫在自行车上。"], newline: true },
            { en: "The goat is in a boat.", options: ["山羊在小船里。", "山羊在小船上面。", "山羊在小汽车里。"], newline: true },
            { en: "The dog is on a train.", options: ["小狗在火车上。", "小狗在火车里面。", "小狗在飞机上。"], newline: true },
            { en: "The bird is on skates.", options: ["小鸟在滑冰鞋上。", "小鸟在自行车上。", "小鸟在马路上。"], newline: true },
            { en: "The duck is in a plane.", options: ["鸭子在飞机里。", "鸭子在飞机上面。", "鸭子在小船里。"], newline: true },
            { en: "The cat is on a horse.", options: ["小猫在马上。", "小猫在马路边。", "小狗在马上。"], newline: true },
            { en: "Go animals go.", options: ["走吧，动物们，走吧。", "走吧，孩子们，走吧。", "停下，动物们，停下。"], newline: true }
        ]
    }
};

const dataDir = path.join(__dirname, '..', 'data', 'RAZ-B');

for (const bookFolder of Object.keys(razBData)) {
    const bookInfo = razBData[bookFolder];
    const bookPath = path.join(dataDir, bookFolder);
    if (!fs.existsSync(bookPath)) {
        console.error(`Folder not found: ${bookPath}`);
        continue;
    }

    const sentencesMap = bookInfo.sentences.map(s => {
        // Shuffle options and find new correct index
        const zipped = s.options.map((opt, idx) => ({ opt, isCorrect: idx === 0 }));
        for (let i = zipped.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [zipped[i], zipped[j]] = [zipped[j], zipped[i]];
        }
        const shuffledOptions = zipped.map(z => z.opt);
        const correctAnswerIndex = zipped.findIndex(z => z.isCorrect);

        const sentenceObj = {
            id: makeId(),
            en: s.en,
            options: shuffledOptions,
            answer: correctAnswerIndex
        };
        if (s.speaker) sentenceObj.speaker = s.speaker;
        if (s.newline) sentenceObj.newline = s.newline;
        return sentenceObj;
    });

    const outputJson = {
        level: bookInfo.level,
        title: "Passage Decoder",
        sections: [
            {
                title: bookInfo.sectionTitle,
                sentences: sentencesMap
            }
        ]
    };

    const targetFilename = `${bookFolder}-passage-decoder-s.json`;
    const targetPath = path.join(bookPath, targetFilename);
    fs.writeFileSync(targetPath, JSON.stringify(outputJson, null, 2) + '\n', 'utf8');
    console.log(`Generated basic JSON at: ${targetPath}`);

    // Inject Highlights
    const vocabPath = path.join(bookPath, `${bookFolder}-vocab-guide.json`);
    processFile(vocabPath, targetPath);
}

console.log("All RAZ-B passage decoders generated and highlighted!");

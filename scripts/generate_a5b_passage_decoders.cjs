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

const a5bData = {
    1: {
        level: "Grade 5 Semester 2 - Unit 1",
        sections: [
            {
                title: "Start Up",
                sentences: [
                    { en: "I'm Yangyang. This is my little brother Chenchen.", cn: "我是阳阳。这是我的小弟弟晨晨。", options: ["我是阳阳。这是我的小弟弟晨晨。", "我是阳阳。这是我的大哥哥晨晨。", "我是晨晨。这是我的小弟弟阳阳。"], newline: true },
                    { en: "I was four and Chenchen was ten months old.", cn: "我四岁的时候，晨晨十个月大。", options: ["我四岁的时候，晨晨十岁大。", "我四岁的时候，晨晨十个月大。", "我十个月大的时候，晨晨四岁大。"], newline: true },
                    { en: "He cried a lot and I was not happy. But I still loved him.", cn: "他经常哭，我不开心。但我依然爱他。", options: ["他很少哭，我很开心。但我依然爱他。", "他经常笑，我不开心。但我依然恨他。", "他经常哭，我不开心。但我依然爱他。"] },
                    { en: "I was six and Chenchen was three.", cn: "我六岁的时候，晨晨三岁。", options: ["我六岁的时候，晨晨三岁。", "我三岁的时候，晨晨六岁。", "我六岁的时候，晨晨三个月大。"], newline: true },
                    { en: "He didn't listen to me and I was angry. But I still loved him.", cn: "他不听我的话，我很生气。但我依然爱他。", options: ["他很听我的话，我很开心。但我依然爱他。", "他不听我的话，我很生气。但我依然爱他。", "他不听我的话，我很伤心。但我还是讨厌他。"] },
                    { en: "I was eight and Chenchen was five.", cn: "我八岁的时候，晨晨五岁。", options: ["我五岁的时候，晨晨八岁。", "我八岁的时候，晨晨五个月大。", "我八岁的时候，晨晨五岁。"], newline: true },
                    { en: "We could play football together.", cn: "我们可以一起踢足球了。", options: ["我们可以一起打篮球了。", "我们可以一起踢足球了。", "我们过去经常踢足球。"] },
                    { en: "He was not a good player, but we were happy.", cn: "他踢得不是很好，但我们很开心。", options: ["他是一个好球员，所以我们很开心。", "他踢得不是很好，但我们很开心。", "他踢得很好，但我们不开心。"] },
                    { en: "I'm ten now and Chenchen is seven.", cn: "我现在十岁了，晨晨七岁。", options: ["我现在七岁了，晨晨十岁。", "我现在十岁了 ...", "我十年前，晨晨才七岁。"], targetCn: "我现在十岁了，晨晨七岁。", options: ["我现在七岁了，晨晨十岁。", "我现在十岁了，晨晨七岁。", "我十年前，晨晨才七岁。"], newline: true },
                    { en: "We go to the same school and we help each other.", cn: "我们在同一所学校上学，我们互相帮助。", options: ["我们在不同的学校上学，我们互不干涉。", "我们在同一所学校上学，我们互相帮助。", "我们去同一个学校，并且我们帮助其他人。"] },
                    { en: "It's great to grow up together!", cn: "一起长大太棒了！", options: ["一起玩耍太棒了！", "独自长大太难了！", "一起长大太棒了！"] }
                ]
            },
            {
                title: "Speed Up",
                sentences: [
                    { en: "The summer camp is over. The past seven days were hard but great.", cn: "夏令营结束了。过去的七天很辛苦但很棒。", options: ["夏令营结束了。过去的七天很辛苦但很棒。", "夏令营开始了。未来的七天会很辛苦但很棒。", "夏令营结束了。过去的七个星期很辛苦但很棒。"], newline: true },
                    { en: "It was very hot and our training was hard.", cn: "天气非常热，我们的训练很辛苦。", options: ["天气非常冷，我们的训练很轻松。", "天气非常热，我们的训练很辛苦。", "天气非常热，但我们的训练很有趣。"], newline: true },
                    { en: "We walked and ran for hours.", cn: "我们走路和跑步了好几个小时。", options: ["我们走路和跑步了好几个小时。", "我们走路 and 跑步了几个星期。", "我们走路和跑步了半小时。"] },
                    { en: "I was very tired on the first day.", cn: "第一天我非常累。", options: ["最后一天我非常累。", "第一天我非常兴奋。", "第一天我非常累。"] },
                    { en: "But my teacher and friends were kind and helpful.", cn: "但是我的老师和朋友们都很友善，乐于助人。", options: ["但是我的老师和朋友们都很严厉，乐于助人。", "但是我的老师和朋友们都很友善，乐于助人。", "而且我的老师和朋友们都很聪明，乐于助人。"], newline: true },
                    { en: "After the first day, I was much better.", cn: "第一天之后，我感觉好多了。", options: ["第一天之后，我感觉更累了。", "第一天之后，我感觉好多了。", "在第一天，我表现得更好。"] },
                    { en: "We also did many other things.", cn: "我们也做了许多其他事情。", options: ["我们也做了许多其他事情。", "我们也想做许多其他事情。", "我们没有做其他事情。"], newline: true },
                    { en: "On the third day, we cooked lunch on our own.", cn: "第三天，我们自己做了午饭。", options: ["在第三天，我们出去吃了午饭。", "在第三天，我们自己做了晚饭。", "第三天，我们自己做了午饭。"] },
                    { en: "We were not good at cooking, but we had a good time together.", cn: "我们不擅长做饭，但我们在一起玩得很开心。", options: ["我们很擅长做饭，而且在一起玩得很开心。", "我们不擅长做饭，但我们在一起玩得很开心。", "我们不擅长做饭，所以在一起玩得不开心。"] },
                    { en: "What was the best dish? It was my \"tomatoes with sugar\"!", cn: "最好吃的菜是什么？是我的“糖拌西红柿”！", options: ["最好吃的菜是什么？是我的“西红柿炒鸡蛋”！", "最好吃的菜是什么？是我的“糖拌西红柿”！", "最难吃的菜是什么？是我的“糖拌西红柿”！"] },
                    { en: "After the camp, we felt great. It was the feeling of growing up.", cn: "营期结束后，我们感觉棒极了。这就是长大的感觉。", options: ["营期结束后，我们感觉累极了。这就是学习的感觉。", "营期结束后，我们感觉棒极了。这就是长大的感觉。", "营期开始前，我们感觉棒极了。这就是长大的感觉。"], newline: true }
                ]
            }
        ]
    },
    2: {
        level: "Grade 5 Semester 2 - Unit 2",
        sections: [
            {
                title: "Start Up",
                sentences: [
                    { en: "The four friends went to a hill.", cn: "四个好朋友去了一座小山。", options: ["四个好朋友去了一座小山。", "五个好朋友去了一座小山。", "四个好朋友去了一个公园。"], newline: true },
                    { en: "\"Let's see who gets to the top first!\" said Amy.", cn: "“让我们看看谁先到山顶！”艾米说。", options: ["“让我们看看谁先到山底！”艾米说。", "“让我们看看谁先到山顶！”艾米说。", "“让我们看看谁跑得最慢！”艾米说。"] },
                    { en: "\"One, two, three. Run!\"", cn: "“一，二，三。跑！”", options: ["“一，二，三。停！”", "“三，二，一。跑！”", "“一，二，三。跑！”"] },
                    { en: "They all hurried up to the top of the hill.", cn: "他们都匆忙向山顶跑去。", options: ["他们都匆忙向山顶跑去。", "他们都慢慢向山顶走去。", "他们都匆忙从山顶跑下来。"] },
                    { en: "At first, Daming was at the front.", cn: "起初，大明跑在最前面。", options: ["起初，大明跑在最后面。", "起初，大明跑在最前面。", "最后，大明跑在最前面。"], newline: true },
                    { en: "But then he slowed down.", cn: "但后来他慢了下来。", options: ["但后来他停了下来。", "但后来他慢了下来。", "但后来他跑得更快了。"] },
                    { en: "One by one, his friends went past him.", cn: "一个接一个，他的朋友们超过了他。", options: ["一个接一个，他的朋友们追上了他。", "一个接一个，他的朋友们落在了他后面。", "一个接一个，他的朋友们超过了他。"] },
                    { en: "\"I win!\" said Lingling.", cn: "“我赢了！”玲玲说。", options: ["“我输了！”玲玲说。", "“我赢了！”玲玲说。", "“他赢了！”玲玲说。"], newline: true },
                    { en: "\"But where's Daming?\" asked Sam.", cn: "“但是大明在哪儿呢？”萨姆问。", options: ["“但是大明去哪儿了？”萨姆问。", "“但是大明在哪儿呢？”萨姆问。", "“但是大明为什么赢了？”萨姆问。"] },
                    { en: "They waited and waited.", cn: "他们等了又等。", options: ["他们等了又等。", "他们找了又找。", "他们跑了又跑。"] },
                    { en: "At last, Daming came with a big bag.", cn: "最后，大明提着一个大袋子来了。", options: ["最后，大明拿着一本书来了。", "最后，大明提着一个大袋子来了。", "起初，大明提着一个大袋子来了。"] },
                    { en: "\"Where did you go?\" asked Lingling.", cn: "“你刚才去哪儿了？”玲玲问。", options: ["“你刚才去哪儿了？”玲玲问。", "“你在做什么？”玲玲问。", "“你刚才和谁在一起？”玲玲问。"], newline: true },
                    { en: "\"I saw some rubbish on the way. I picked it up.\"", cn: "“我在路上看到一些垃圾。我把它们捡起来了。”", options: ["“我在路上看到一些垃圾。我把它们扔掉了。”", "“我在路上看到一些花。我把它们摘下来了。”", "“我在路上看到一些垃圾。我把它们捡起来了。”"] },
                    { en: "\"Daming, you're the real winner!\" said Lingling.", cn: "“大明，你才是真正的赢家！”玲玲说。", options: ["“大明，你才是真正的赢家！”玲玲说。", "“大明，你是第二个赢家！”玲玲说。", "“大明，你真的输了！”玲玲说。"], newline: true }
                ]
            },
            {
                title: "Speed Up",
                sentences: [
                    { en: "The little dog we have is the cutest in the world.", cn: "我们家的小狗是世界上最可爱的。", options: ["我们家的小狗是世界上最可爱的。", "邻居家的小狗是世界上最可爱的。", "我们家的小狗是世界上最聪明的。"], newline: true },
                    { en: "Small and playful, he's always by my side.", cn: "它既小巧又顽皮，总是待在我身边。", options: ["它既小巧又安静，总是待在我的房间里。", "它既小巧又顽皮，总是待在我身边。", "它既高大又温顺，总是待在我身边。"] },
                    { en: "\"Play with me and love me. I want you with me always.\"", cn: "“陪我玩，爱我。我想让你永远陪着我。”", options: ["“陪我玩，爱我。我想让你永远陪着我。”", "“跟我跑，保护我。我需要你永远陪着我。”", "“陪我玩，爱我。我想让你永远离开我。”"] },
                    { en: "But we can't have him for long.", cn: "但我们不能长久地拥有它。", options: ["但我们可以长久地拥有它。", "但我们不能长久地拥有它。", "但我们不能一直 and 它玩耍。"] },
                    { en: "He'll be someone's eyes one day.", cn: "总有一天，它会成为某个人的眼睛。", options: ["总有一天，它会成为某个人的眼睛。", "总有一天，它会成为某个人的朋友。", "总有一天，它会成为我的眼睛。"] },
                    { en: "I made a new friend. He was eighty years old, and he had no family.", cn: "我交了一个新朋友。他八十岁了，没有家人。", options: ["我交了一个新老师。他八十岁了，没有家人。", "我交了一个新朋友。他八十岁了，没有家人。", "我交了一个新朋友。他八岁了，没有家人。"], newline: true },
                    { en: "He owned a ukulele. So I brought over my guitar.", cn: "他有一把尤克里里。于是我带去了我的吉他。", options: ["他有一把吉他。于是我带去了我的尤克里里。", "他有一把尤克里里。于是我带去了我的吉他。", "他想要一把尤克里里。所以我买了一把吉他送给他。"] },
                    { en: "Together the two of us played.", cn: "我们俩一起弹奏。", options: ["我们俩一起弹奏。", "我们俩一起唱歌。", "我们俩一起跳舞。"] },
                    { en: "We're not good enough for a show. But we didn't sound too bad at all.", cn: "我们弹得还不够好，没法演出。但听起来一点也不差。", options: ["我们弹得很好，可以演出。而且听起来棒极了。", "我们弹得还不够好，没法演出。但听起来一点也不差。", "我们不想参加演出，因为听起来太糟糕了。"] },
                    { en: "At lunchtime, I saw the new kid. She sat on her own.", cn: "午饭时间，我看到了那个新来的孩子。她独自坐着。", options: ["午饭时间，我看到了那个新来的孩子。她独自坐着。", "晚饭时间，我看到了那个新来的孩子。她和大家坐在一起。", "午饭时间，我看到了我的老朋友。她独自坐着。"], newline: true },
                    { en: "She had only the words of a book for her lunch.", cn: "她只有书里的文字作为午餐。", options: ["她吃着午餐，同时在看一本书。", "她只有书里的文字作为午餐。", "她只买得起一本书作为午餐。"] },
                    { en: "I gave her half of my sandwich. And I had only half for me.", cn: "我分给她一半三明治。我自己也只有一半了。", options: ["我分给她一半三明治。我自己也只有一半了。", "我分给她整个三明治。我自己什么都没有了。", "我吃了她一半三明治。她自己也只有一半了。"] },
                    { en: "But after I ate it, I felt full.", cn: "但我吃完之后，感觉很饱。", options: ["但我吃完之后，感觉更饿了。", "但我分给别人之后，感觉很不开心。", "但我吃完之后，感觉很饱。"] }
                ]
            }
        ]
    },
    3: {
        level: "Grade 5 Semester 2 - Unit 3",
        sections: [
            {
                title: "Start Up",
                sentences: [
                    { en: "It's library day again! I'm excited! But it keeps raining and raining.", cn: "又是图书馆日了！我很兴奋！但雨一直下个不停。", options: ["又是图书馆日了！我很兴奋！但雨一直下个不停。", "又是图书馆日了！我很害怕！但雨已经停了。", "今天不是图书馆日。我不开心，因为外面一直在下雨。"], newline: true },
                    { en: "\"Mum, will the 'horse library' come today?\"", cn: "“妈妈，今天‘马背图书馆’会来吗？”", options: ["“爸爸，今天‘马背图书馆’会来吗？”", "“妈妈，今天‘马背图书馆’会来吗？”", "“妈妈，今天‘流动图书馆’已经来了吗？”"] },
                    { en: "\"Don't worry,\" says Mum. \"It comes every week, rain or sun.\"", cn: "“别担心，”妈妈说，“无论天晴还是下雨，它每周都会来。”", options: ["“别担心，”妈妈说，“无论天晴还是下雨，它每周都会来。”", "“别害怕，”妈妈说，“只要不下雨，它每周都会来。”", "“别担心，”妈妈说，“它每个月都会来一次，不管天晴还是下雨。”"] },
                    { en: "\"Did you also have library day in the past, Mum?\"", cn: "“妈妈，你以前也有图书馆日吗？”", options: ["“妈妈，你以前也有图书馆日吗？”", "“妈妈，你现在也有图书馆日吗？”", "“妈妈，你以前喜欢去图书馆吗？”"], newline: true },
                    { en: "\"Yes, we did. But our library only came one time a month.\"", cn: "“是的，我们也有。但我们的图书馆一个月只来一次。”", options: ["“是的，我们有。但我们的图书馆一个星期只来一次。”", "“不，我们没有。我们的图书馆一个月只来一次。”", "“是的，我们也有。但我们的图书馆一个月只来一次。”"] },
                    { en: "\"Were there many books?\"", cn: "“书多吗？”", options: ["“书好看吗？”", "“书多吗？”", "“这里有书吗？”"] },
                    { en: "\"No, there weren't. It was a small library.\"", cn: "“不，不多。那是一个小图书馆。”", options: ["“不，不多。那是一个小图书馆。”", "“是的，很多。那是一个大图书馆。”", "“不，不多。那里没有图书馆。”"] },
                    { en: "\"Did you like it?\"", cn: "“你喜欢它吗？”", options: ["“你想去吗？”", "“你喜欢它吗？”", "“你看过它吗？”"] },
                    { en: "\"Yes. Books made me happy.\"", cn: "“是的。书让我感到快乐。”", options: ["“是的。书让我感到快乐。”", "“不。看书让我很累。”", "“是的。书让我感到悲伤。”"] },
                    { en: "\"Now I can see the 'horse library'.\" \"Oh, yes. It's here!\"", cn: "“现在我能看到‘马背图书馆’了。”“哦，是的。它来了！”", options: ["“现在我能看到‘马背图书馆’了。”“哦，是的。它来了！”", "“现在我找不到‘马背图书馆’了。”“哦，是的。它走了！”", "“现在我能看到那匹马了。”“哦，是的。它在这儿！”"], newline: true },
                    { en: "I'm so happy. The library brings not only books but also hope.", cn: "我太开心了。图书馆带来的不仅是书，还有希望。", options: ["我太开心了。图书馆带来的不仅是书，还有希望。", "我太开心了。图书馆带走了所有的书和希望。", "我有点伤心。图书馆没有带书，只带来了希望。"] }
                ]
            },
            {
                title: "Speed Up",
                sentences: [
                    { en: "Mary was a 10-year-old girl. She lost her parents and had to live with her uncle.", cn: "玛丽是一个10岁的女孩。她失去了父母，不得不和她的叔叔住在一起。", options: ["玛丽是一个10岁的女孩。她失去了父母，不得不和她的叔叔住在一起。", "玛丽是一个10岁的女孩。她离开了父母，不得不和她的叔叔住在一起。", "玛丽是一个10岁的女孩。她失去了父母，不得不和她的阿姨住在一起。"], newline: true },
                    { en: "But her uncle was often away. Her cousin Colin was ill in bed.", cn: "但她的叔叔经常不在家。她的表弟柯林卧病在床。", options: ["但她的叔叔经常不在家。她的表弟柯林卧病在床。", "但她的叔叔经常在家。她的表弟柯林生病了。", "但她的叔叔经常不在家。她的弟弟柯林卧病在床。"] },
                    { en: "Mary didn't care about others and was often angry. She was unhappy in the new place.", cn: "玛丽不关心他人，而且经常生气。她在新地方过得不开心。", options: ["玛丽很关心他人，但经常生气。她在新地方过得不开心。", "玛丽不关心他人，而且经常生气。她在新地方过得不开心。", "玛丽不关心他人，但很少生气。你在新地方过得很开心。"] },
                    { en: "One day she found an old garden. There she met a new friend. His name was Dickon.", cn: "一天，她发现了一个旧花园。在那里她遇到了一个新朋友。他的名字叫狄肯。", options: ["一天，她买下了一个旧花园。在那里她遇到了一个新朋友。他的名字叫狄肯。", "一天，她发现了一个新花园。在那里她遇到了一个老朋友。他的名字叫狄肯。", "一天，她发现了一个旧花园。在那里她遇到了一个新朋友。他的名字叫狄肯。"], newline: true },
                    { en: "They worked together to bring the garden back to life.", cn: "他们一起努力让花园恢复生机。", options: ["他们一起努力让花园恢复生机。", "他们独自努力让花园恢复生机。", "他们一起努力建造了一个新花园。"] },
                    { en: "Mary slowly became friendly and kind. She also helped Colin to get well.", cn: "玛丽慢慢变得友好且善良。她还帮助柯林康复了。", options: ["玛丽慢慢变得友好且善良。她还帮助柯林康复了。", "玛丽很快变得友好且善良。她也让柯林生病了。", "玛丽慢慢变得骄傲且自私。她还帮助柯林康复了。"] },
                    { en: "I give the book 9 out of 10. It's a great book about friends, love and nature.", cn: "我给这本书打9分（满分10分）。这是一本关于朋友、爱和大自然的伟大的书。", options: ["我给这本书打10分。这是一本关于朋友、爱和大自然的伟大的书。", "我给这本书打9分（满分10分）。这是一本关于朋友、爱和大自然的伟大的书。", "我给这本书打9分（满分10分）。这是一本关于学校、学习和动物的伟大的书。"], newline: true }
                ]
            }
        ]
    },
    4: {
        level: "Grade 5 Semester 2 - Unit 4",
        sections: [
            {
                title: "Start Up",
                sentences: [
                    { en: "I went to the National Museum of China yesterday. I saw an ancient dumpling from Xinjiang!", cn: "我昨天去了中国国家博物馆。我看到了一个来自新疆的古代饺子！", options: ["我昨天去了中国国家博物馆。我看到了一个来自新疆的古代饺子！", "我昨天去了北京博物馆。我看到了一个来自新疆的古代面条！", "我上周去了中国国家博物馆。我看到了一个来自新疆的古代饺子！"], newline: true },
                    { en: "It looks just like dumplings today. What did ancient people put in it? No one knows for sure.", cn: "它看起来和今天的饺子一模一样。古人在里面放了什么？没有人确切知道。", options: ["它看起来和今天的饺子一模一样。古人在里面放了什么？没有人确切知道。", "它看起来和今天的饺子完全不同。古人在里面放了什么？大家都知道。", "它看起来和今天的饺子一模一样。古人喜欢吃它吗？没有人确切知道。"] },
                    { en: "The dumpling is from the Tang Dynasty. People ate dumplings over 1,000 years ago!", cn: "这个饺子来自唐朝。人们在1000多年前就在吃饺子了！", options: ["这个饺子来自宋朝。人们在1000多年前就在吃饺子了！", "这个饺子来自唐朝。人们在1000多年前就在吃饺子了！", "这个饺子来自唐朝。人们在100年前就在吃饺子了！"], newline: true },
                    { en: "At that time, Xinjiang was an important place in China.", cn: "在那时，新疆是中国一个非常重要的地方。", options: ["在那时，新疆是中国一个非常美丽的地方。", "在那时，新疆是中国一个非常重要的地方。", "现在，新疆是中国一个非常重要的地方。"], newline: true },
                    { en: "People in central China went there by the ancient Silk Road. They brought dumplings to Xinjiang.", cn: "中原地区的人们通过古代丝绸之路去那里。他们把饺子带到了新疆。", options: ["中原地区的人们通过古代丝绸之路去那里。他们把饺子带到了新疆。", "新疆地区的人们通过古代丝绸之路来到中原。他们把饺子带回了新疆。", "中原地区的人们乘火车去那里。他们把饺子带到了新疆。"] },
                    { en: "People ate dumplings so long ago! How interesting!", cn: "人们在那么久以前就吃饺子了！真有意思！", options: ["人们在那么久以前就吃饺子了！真有意思！", "人们现在依然喜欢吃饺子！真有意思！", "人们在很久以前就不吃饺子了！真遗憾！"], newline: true }
                ]
            },
            {
                title: "Speed Up",
                sentences: [
                    { en: "Wednesday, 7 February. Watches are so expensive. Most people don't have one.", cn: "2月7日，星期三。手表非常昂贵。大多数人都没有。", options: ["2月7日，星期三。手表非常便宜。大多数人都有一个。", "2月7日，星期三。手表非常昂贵。大多数人都没有。", "2月7日，星期四。手表非常昂贵。大多数人都没有。"], newline: true },
                    { en: "This morning, I bought my very first watch. From now on, I will always know the time!", cn: "今天早上，我买了自己的第一块手表。从现在起，我将永远知道时间！", options: ["今天早上，我买了自己的第一块手表。从现在起，我将永远知道时间！", "昨天晚上，我买了自己的第一块手表。从现在起，我将永远知道时间！", "今天早上，我收到了我的第一块手表。从现在起，我将永远知道时间！"] },
                    { en: "Friday, 16 March. Yesterday, I bought a pair of glasses.", cn: "3月16日，星期五。昨天，我买了一副眼镜。", options: ["3月16日，星期五。昨天，我买了一副眼镜。", "3月16日，星期五。今天，我买了一副眼镜。", "3月16日，星期六。昨天，我买了一副眼镜。"], newline: true },
                    { en: "I put them on, then I took a boat to work. And I could see all the ships on the River Thames!", cn: "我戴上它们，然后坐船去上班。我能看清泰晤士河上所有的船！", options: ["我戴上它们，然后坐车去上班。我能看清泰晤士河上所有的船！", "我取下它们，然后坐船去上班。我看不清泰晤士河上所有的船！", "我戴上它们，然后坐船去上班。我能看清泰晤士河上所有的船！"] },
                    { en: "The river was busy.", cn: "河面上非常繁忙。", options: ["河面上非常安静。", "河面上非常繁忙。", "河水非常脏。"] },
                    { en: "Sunday, 2 September. A great fire started in London this morning! The fire is now growing very quickly.", cn: "9月2日，星期日。今天早上伦敦发生了一场大火！火势现在蔓延得非常快。", options: ["9月2日，星期日。今天晚上伦敦发生了一场大火！火势现在蔓延得非常快。", "9月2日，星期日。今天早上伦敦发生了一场大火！火势现在蔓延得非常快。", "9月2日，星期日。今天早上伦敦发生了一场小火灾！火势被很快扑灭了。"], newline: true },
                    { en: "People are pulling down houses in front of the fire to stop it. But it's still moving very fast.", cn: "人们正在拆除大火前方的房屋以阻止它。但它仍然移动得很快。", options: ["人们正在拆除大火前方的房屋以阻止它。但它仍然移动得很快。", "人们正在灭火前方的房屋。火势已经慢下来了。", "人们正在火区前建新房屋。但火势仍然移动得很快。"] },
                    { en: "Monday, 3 September. I dug a hole in my garden. I put some cheese from Italy into it!", cn: "9月3日，星期一。我在花园里挖了一个洞。我把一些来自意大利的奶酪放了进去！", options: ["9月3日，星期一。我在花园里挖了一个洞。我把一些来自意大利的奶酪放了进去！", "9月3日，星期二。我在花园里挖了一个洞。我把一些来自法国的奶酪放了进去！", "9月3日，星期一。我在公园里挖了一个洞。我把一些奶酪放了进去！"], newline: true },
                    { en: "It's expensive. I hope it is safe from the fire.", cn: "它很贵。我希望它在火灾中是安全的。", options: ["它很便宜。我不在乎它是否安全。", "它很贵。我希望它在火灾中是安全的。", "它很贵。它在大火中被烧毁了。"] }
                ]
            }
        ]
    },
    5: {
        level: "Grade 5 Semester 2 - Unit 5",
        sections: [
            {
                title: "Start Up",
                sentences: [
                    { en: "What are you doing, Mum?", cn: "你正在做什么，妈妈？", options: ["你正在做什么，妈妈？", "你去哪里了，妈妈？", "你刚才在做什么，妈妈？"], speaker: "Daming", newline: true },
                    { en: "I'm looking for my ring. I can't find it.", cn: "我正在找我的戒指。我找不到它了。", options: ["我正在找我的戒指。我找不到它了。", "我找到了我的戒指。它在这儿。", "我正在戴我的戒指。它很漂亮。"], speaker: "Mum", newline: true },
                    { en: "Where did you put it?", cn: "你把它放哪儿了？", options: ["你把它放哪儿了？", "你什么时候买的？", "你把它丢在哪儿了？"], speaker: "Daming", newline: true },
                    { en: "I put it on the desk this morning.", cn: "我今天早上把它放在书桌上了。", options: ["我今天早上把它放在书桌上了。", "我今天早上把它放在书桌里了。", "我昨天晚上把它放在书桌上了。"], speaker: "Mum", newline: true },
                    { en: "Are you ready to go, Dad?", cn: "你准备好出发了吗，爸爸？", options: ["你准备好回家了吗，爸爸？", "你准备好出发了吗，爸爸？", "你还好吗，爸爸？"], speaker: "Daming", newline: true },
                    { en: "No, I can't find my car key.", cn: "不，我找不到我的车钥匙了。", options: ["不，我找不到我的房间钥匙了。", "不，我找不到我的车钥匙了。", "是的，我拿到了我的车钥匙。"], speaker: "Dad", newline: true },
                    { en: "Where was it?", cn: "它原先在哪儿？", options: ["它原先在哪儿？", "它现在在哪儿？", "谁拿走了它？"], speaker: "Daming", newline: true },
                    { en: "It was on the desk.", cn: "它原先在书桌上。", options: ["It原先在书桌下。", "它原先在书桌上。", "它现在在书桌上。"], targetCn: "它原先在书桌上。", options: ["它原先在书桌下。", "它原先在书桌上。", "它现在在书桌上。"], speaker: "Dad", newline: true },
                    { en: "Daming, are you OK?", cn: "大明，你还好吗？", options: ["大明，你还好吗？", "大明，你要去哪儿？", "大明，你在做什么？"], speaker: "Dad", newline: true },
                    { en: "I can't find my coins. Did you see them?", cn: "我找不到我的硬币了。你看到它们了吗？", options: ["我找不到我的硬币了。你看到它们了吗？", "我找不到我的硬币了。它们在这儿吗？", "我找到了我的硬币。你想要吗？"], speaker: "Daming", newline: true },
                    { en: "No, I didn't.", cn: "不，我没看到。", options: ["是的，我看到了。", "不，我没看到。", "不知道。"], speaker: "Dad", newline: true },
                    { en: "First, Mum's ring. Then, Dad's key. Now, my coins. What's going on?", cn: "首先是妈妈的戒指。然后是爸爸的钥匙。现在是我的硬币。发生了什么事？", options: ["首先是妈妈的戒指。然后是爸爸的钥匙。现在是我的硬币。发生了什么事？", "首先是妈妈的戒指。然后是爸爸的钥匙。现在是我的硬币。它们去哪儿了？", "首先是妈妈的硬币。然后是爸爸的钥匙。现在是我的戒指。发生了什么事？"], speaker: "Daming", newline: true },
                    { en: "I know. Come over here, everyone! Look! The lost things are all there.", cn: "我知道了。大家快过来！看！丢的东西都在那儿。", options: ["我知道了。大家快过来！看！丢的东西都在那儿。", "我知道了。大家快过来！看！丢的东西都不见了。", "我不知道。大家快过来！帮我找找丢的东西。"], speaker: "Daming", newline: true },
                    { en: "Well done, Daming!", cn: "干得好，大明！", options: ["干得好，大明！", "别担心，大明！", "你太棒了，大明！"], speaker: "Mum & Dad", newline: true }
                ]
            },
            {
                title: "Speed Up",
                sentences: [
                    { en: "Detective Sharp came to the prison.", cn: "谢普侦探来到了监狱。", options: ["谢普侦探来到了监狱。", "谢普侦探离开了监狱。", "谢普侦探来到了办公室。"], newline: true },
                    { en: "The police showed him a letter from Jim Burton.", cn: "警察给他看了一封吉姆·伯顿写的信。", options: ["吉姆·伯顿给他写了一封信。", "警察给他看了一封吉姆·伯顿写的信。", "警察收到了一封吉姆·伯顿写给谢普的信。"] },
                    { en: "He stole many jewels. But we didn't find the jewels on him.", cn: "他偷了很多珠宝。但我们没有在他身上发现珠宝。", options: ["他偷了很多珠宝。我们已经在他身上发现了珠宝。", "他买了很多珠宝。但我们没有在他身上发现珠宝。", "他偷了很多珠宝。但我们没有在他身上发现珠宝。"], speaker: "Police Officer", newline: true },
                    { en: "What did he do? Let's see the letter.", cn: "他做了什么？让我们看看这封信。", options: ["他去了哪里？让我们看看这封信。", "他做了什么？让我们看看这封信。", "他在干什么？这封信是谁写的？"], speaker: "Detective Sharp", newline: true },
                    { en: "Dear Susan, I hope you're happy after reading these sweet words!", cn: "亲爱的苏珊，我希望你在读到这些甜言蜜语后会感到幸福！", options: ["亲爱的苏珊，我希望你在读到这些甜言蜜语后会感到幸福！", "亲爱的苏珊，我希望你不要读这些甜言蜜语！", "亲爱的苏珊，我相信你读了这些字后会很开心的！"], newline: true },
                    { en: "I miss you and our girls, my sweet. There is so much to say.", cn: "我想念你和我们的女儿们，我的宝贝。有太多话要说了。", options: ["我想念你和我们的女儿们，我的宝贝。有太多话要说了。", "我不想念你和我们的女儿们，我的宝贝。没什么可说的。", "我想念你和我们的儿子们，我的宝贝。有太多话要说了。"] },
                    { en: "You are all so sweet. Are you happy these days?", cn: "你们都太贴心了。这些日子你开心吗？", options: ["你们都太贴心了。这些日子你开心吗？", "你们都太贴心了。你今天开心吗？", "你们看起来很甜。你们最近幸福吗？"] },
                    { en: "Your eyes are bright and sweet. Jewels can't be so shiny.", cn: "你的眼睛明亮又甜美。珠宝也不及此般闪耀。", options: ["你的眼睛明亮又甜美。珠宝也不及此般闪耀。", "你的眼睛明亮又大。珠宝也是那么闪亮。", "你的眼睛明亮又甜美。珠宝非常闪亮。"] },
                    { en: "You look sweet in your green dress! You always look so sweet!", cn: "你穿那件绿裙子看起来很甜美！你看起来总是那么甜美！", options: ["你穿那件红裙子看起来很甜美！你看起来总是那么甜美！", "你穿那件绿裙子看起来很甜美！你看起来总是那么甜美！", "你穿那件绿裙子看起来很甜美！你今天看起来真甜！"] },
                    { en: "The girls look happy in our sweet garden.", cn: "女儿们在我们的甜美花园里看起来很开心。", options: ["女儿们在我们的甜美花园里看起来很开心。", "女儿们在公园里玩得很开心。", "女孩们在我们的新花园里看起来很开心。"] },
                    { en: "There is something wrong with the letter. But I just don't know what it is.", cn: "这封信有点不对劲。但我就是不知道是什么。", options: ["这封信写得很好。但我就是不知道是谁写的。", "这封信没有任何问题。但我就是不知道是什么意思。", "这封信有点不对劲。但我就是不知道是什么。"], speaker: "Police Officer", newline: true },
                    { en: "Aha, I see! Don't give the letter to his wife.", cn: "啊哈，我明白了！不要把这封信交给他妻子。", options: ["啊哈，我明白了！不要把这封信交给他妻子。", "啊哈，我看不懂！把这封信交给他妻子吧。", "啊哈，我知道了！立刻把这封信交给他妻子。"], speaker: "Detective Sharp", newline: true },
                    { en: "We can get the jewels back now!", cn: "我们现在可以把珠宝找回来了！", options: ["我们现在可以把珠宝找回来了！", "我们现在找不到那些珠宝了！", "我们现在去把珠宝藏起来吧！"], speaker: "Detective Sharp", newline: true }
                ]
            }
        ]
    },
    6: {
        level: "Grade 5 Semester 2 - Unit 6",
        sections: [
            {
                title: "Start Up",
                sentences: [
                    { en: "It's the second day in China for Grandpa and me. I had a good time yesterday.", cn: "这是爷爷和我来到中国的第二天。我昨天玩得很开心。", options: ["这是爷爷和我来到中国的第二天。我昨天玩得很开心。", "这是爸爸和我来到中国的第二天。我昨天玩得很开心。", "这是爷爷和我来到中国的首日。我昨天玩得很开心。"], newline: true },
                    { en: "The high-speed train was a surprise!", cn: "高铁是一个惊喜！", options: ["普通的火车是一个惊喜！", "高大上的火车是一个惊喜！", "高铁是一个惊喜！"] },
                    { en: "It was around 15 hours from Beijing to Xi'an about 30 years ago.", cn: "大约30年前，从北京到西安大约需要15个小时。", options: ["大约30年前，从北京到西安大约需要15个小时。", "大约15年前，从北京到西安大约需要30个小时。", "大约30年前，从北京到西安大约需要5个小时。"], newline: true },
                    { en: "Grandpa still remembers that. He had a long journey then.", cn: "爷爷仍然记得那件事。He那时经历了一段漫长的旅程。", targetCn: "爷爷仍然记得那件事。他那时经历了一段漫长的旅程。", options: ["爷爷仍然记得那件事。他那时经历了一段漫长的旅程。", "爷爷已经忘记了那件事。他那时经历了一段漫长的旅程。", "爸爸仍然记得那件事。他那时经历了一段漫长的旅程。"] },
                    { en: "But now it takes only a little over four hours.", cn: "但现在只需要四个多小时。", options: ["但现在只需要不到四个小时。", "但现在只需要四个多小时。", "但现在需要十四个小时。"] },
                    { en: "We left Beijing in the morning and got to Xi'an in time for lunch.", cn: "我们早上离开北京，及时赶到西安吃午饭。", options: ["我们早上离开北京，及时赶到西安吃午饭。", "我们早上离开北京，下午赶到西安吃晚饭。", "我们下午离开北京，及时赶到西安吃午饭。"] },
                    { en: "The 'Chinese hamburger' tasted very good! Grandpa said, 'It's still the same taste!'", cn: "“中国汉堡”（肉夹馍）味道非常好！爷爷说：“还是原来的味道！”", options: ["“中国汉堡”（肉夹馍）味道非常差！爷爷说：“还是原来的味道！”", "“中国汉堡”（肉夹馍）味道非常好！爷爷说：“味道变了！”", "“中国汉堡”（肉夹馍）味道非常好！爷爷说：“还是原来的味道！”"] },
                    { en: "Xi'an also surprised me. It was an old city in Grandpa's photos. But now it's very different.", cn: "西安也让我感到惊讶。在爷爷的照片里，它是一座古老的城市。但现在它非常不同了。", options: ["西安也让我感到惊讶。在爷爷的照片里，它是一座现代的城市。但现在它非常不同了。", "西安也让我感到惊讶。在爷爷的照片里，它是一座古老的城市。但现在它非常不同了。", "西安没有让我感到惊讶。在爷爷的照片里，它是一座古老的城市。但现在它非常不同了。"] },
                    { en: "We are going to Chengdu tomorrow, also by the high-speed train. I can't wait!", cn: "我们明天要去成都，也是坐高铁。I can't wait!", targetCn: "我们明天要去成都，也是坐高铁。我等不及了！", options: ["我们明天要去成都，也是坐高铁。我等不及了！", "我们明天要去北京，也是坐高铁。我等不及了！", "我们今天去成都，坐的是高铁。我玩得很开心！"] }
                ]
            },
            {
                title: "Speed Up",
                sentences: [
                    { en: "In the Daliang Mountains, tall green trees grow. Birds sing all around.", cn: "在大亮山，高大的绿树生长着。鸟儿在到处歌唱。", options: ["在大亮山，高大的绿树生长着。鸟儿在到处歌唱。", "在大亮山，高大的树木被砍伐了。鸟儿在到处歌唱。", "在大亮山，矮小的灌木生长着。鸟儿在到处歌唱。"], newline: true },
                    { en: "But about 40 years ago, it was very different there. It changed because of Yang Shanzhou.", cn: "但大约40年前，那里非常不同。它因为杨善洲而改变了。", options: ["但大约14年前，那里非常不同。它因为杨善洲而改变了。", "但大约40年前，那里非常不同。它因为杨善洲而改变了。", "但大约40年前，那里没有什么不同。它因为杨善洲而改变了。"] },
                    { en: "In 1988, at the age of 61, he gave up a good life in the city.", cn: "1988年，61岁的他放弃了城市里的优越生活。", options: ["1988年，61岁的他放弃了城市里的优越生活。", "1988年，61岁的他来到了城市里过上优越生活。", "1988年，16岁的他放弃了城市里的优越生活。"], newline: true },
                    { en: "\"I want to do something for my hometown,\" said Yang.", cn: "“我想为我的家乡做点什么，”杨善洲说。", options: ["“我想为我的家乡做点什么，”杨善洲说。", "“我想去别的地方看看，”杨善洲说。", "“我不想为我的家乡做任何事，”杨善洲说。"] },
                    { en: "He moved to the mountains and worked hard to make them green. Life was very hard, but he never gave up.", cn: "他搬到了山里，努力工作使大山变绿。生活非常艰苦，但他从未放弃。", options: ["他离开了大山，因为那里生活非常艰苦，他放弃了。", "He搬到了山里，努力工作使大山变绿。生活非常轻松，所以他从未放弃。", "他搬到了山里，努力工作使大山变绿。生活非常艰苦，但他从未放弃。"] },
                    { en: "He broke his left leg at the age of 72. But he was back to work after only half a year.", cn: "他在72岁时摔断了左腿。但仅半年后他就重新开始工作了。", options: ["他在72岁时摔断了左腿。但仅半年后他就重新开始工作了。", "他在72岁时摔断了右腿。但仅半年后他就重新开始工作了。", "他在72岁时摔断了左腿。但他再也没有回去工作。"] },
                    { en: "After 22 years, the Daliang Mountains became a green world, with over 10 million trees.", cn: "22年后，大亮山变成了一个绿色的世界，拥有超过1000万棵树。", options: ["22年后，大亮山变成了一个绿色的世界，拥有超过1000万棵树。", "22个月后，大亮山变成了一个绿色的世界，拥有超过1000万棵树。", "22年后，大亮山变成了一个绿色的世界，拥有大约100万棵树。"] },
                    { en: "By planting trees, Yang Shanzhou also planted hope. His hard work gave people a brighter and greener life.", cn: "通过植树，杨善洲也播种了希望。他的辛勤工作给了人们一个更光明、更绿色的生活。", options: ["通过植树，杨善洲也播种了希望。His辛勤工作给了人们一个更光明、更绿色的生活。", "通过植树，杨善洲也感到很绝望。他的辛勤工作没有带来任何改变。", "通过植树，杨善洲也播种了希望。他的辛勤工作给了人们一个更光明、更绿色的生活。"] }
                ]
            }
        ]
    }
};

for (let u = 1; u <= 6; u++) {
    const unitInfo = a5bData[u];
    const unitDir = path.join(__dirname, '..', 'data', 'A5B', `a5b-u${u}`);
    if (!fs.existsSync(unitDir)) {
        fs.mkdirSync(unitDir, { recursive: true });
    }

    const sentencesMap = (sec) => {
        return sec.sentences.map(s => {
            const correctText = s.targetCn || s.cn;
            const correctIndex = s.options.indexOf(correctText);
            if (correctIndex === -1) {
                throw new Error(`Correct answer not found in options for: ${s.en} (looking for: ${correctText})`);
            }
            // Shuffle options and find new correct index
            const zipped = s.options.map((opt, idx) => ({ opt, isCorrect: idx === correctIndex }));
            for (let i = zipped.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [zipped[i], zipped[j]] = [zipped[j], zipped[i]];
            }
            const options = zipped.map(z => z.opt);
            const answer = zipped.findIndex(z => z.isCorrect);

            const sentenceObj = {
                id: makeId(),
                en: s.en,
                options: options,
                answer: answer
            };
            if (s.speaker) sentenceObj.speaker = s.speaker;
            if (s.newline) sentenceObj.newline = s.newline;
            return sentenceObj;
        });
    };

    const outputJson = {
        level: unitInfo.level,
        title: "Passage Decoder",
        sections: unitInfo.sections.map(sec => ({
            title: sec.title,
            sentences: sentencesMap(sec)
        }))
    };

    const targetPath = path.join(unitDir, `a5b-u${u}-passage-decoder-s.json`);
    fs.writeFileSync(targetPath, JSON.stringify(outputJson, null, 2) + '\n', 'utf8');
    console.log(`Generated basic JSON for Unit ${u} at ${targetPath}`);

    // Run highlights match script
    const vocabPath = path.join(unitDir, `a5b-u${u}-vocab-guide.json`);
    processFile(vocabPath, targetPath);
}
console.log("All A5B units generated successfully!");

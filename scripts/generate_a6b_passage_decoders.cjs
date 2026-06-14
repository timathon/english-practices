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

const a6bData = {
    1: {
        level: "Grade 6 Semester 2 - Module 1",
        sections: [
            {
                title: "Unit 1 Activity 2",
                target: "u1a2",
                sentences: [
                    { en: "What do you want, Daming?", cn: "大明，你想要什么？", options: ["大明，你想要什么？", "大明，你想去哪里？", "大明，你在做什么？"], speaker: "Simon", newline: true },
                    { en: "I don't know. What's a hot dog?", cn: "我不知道。热狗是什么？", options: ["我不知道。热狗是什么？", "我明白。热狗好吃吗？", "我不喜欢。热狗是什么？"], speaker: "Daming", newline: true },
                    { en: "Is it really a dog?", cn: "它真的是狗吗？", options: ["它真的是狗吗？", "它真的是热的吗？", "它是一只小狗吗？"], speaker: "Daming" },
                    { en: "No, Daming. That's a hot dog.", cn: "不，大明。那是热狗。", options: ["不，大明。那是热狗。", "是的，大明。那是狗。", "不，大明。那不是热狗。"], speaker: "Simon", newline: true },
                    { en: "It looks good!", cn: "它看起来很好吃！", options: ["它看起来很好吃！", "它看起来很大！", "它摸起来很好！"], speaker: "Daming", newline: true },
                    { en: "Can I help you?", cn: "我能帮您吗？", options: ["我能帮您吗？", "您能帮我吗？", "我能走吗？"], speaker: "Cashier", newline: true },
                    { en: "I want a hot dog, please.", cn: "请给我一个热狗。", options: ["请给我一个热狗。", "请给我一个汉堡包。", "我想喂狗，谢谢。"], speaker: "Daming", newline: true },
                    { en: "And I want a hamburger.", cn: "我想要一个汉堡包。", options: ["我想要一个汉堡包。", "我想要一杯可乐。", "我想要一个热狗。"], speaker: "Simon", newline: true },
                    { en: "A hamburger for me too.", cn: "我也要一个汉堡包。", options: ["我也要一个汉堡包。", "我也要一个热狗。", "他也要一个汉堡包。"], speaker: "Simon's dad", newline: true },
                    { en: "And to drink?", cn: "那喝点什么呢？", options: ["那喝点什么呢？", "那吃点什么呢？", "你想喝什么？"], speaker: "Cashier", newline: true },
                    { en: "I want a cola.", cn: "我想要一杯可乐。", options: ["我想要一杯可乐。", "我想要一些牛奶。", "我想要一个热狗。"], speaker: "Simon", newline: true },
                    { en: "A cola for me too.", cn: "我也要一杯可乐。", options: ["我也要一杯可乐。", "我也要一杯牛奶。", "我也想要一个汉堡。"], speaker: "Daming", newline: true },
                    { en: "Three colas, please.", cn: "请给我三杯可乐。", options: ["请给我三杯可乐。", "请给我两杯可乐。", "请给我三杯牛奶。"], speaker: "Simon's dad", newline: true },
                    { en: "That's two hamburgers, a hot dog and three colas.", cn: "两个汉堡，一个热狗和三杯可乐。", options: ["两个汉堡，一个热狗和三杯可乐。", "一个汉堡，两个热狗 and 三杯可乐。", "两个汉堡，两个热狗和三杯可乐。"], speaker: "Cashier", newline: true },
                    { en: "How much is it?", cn: "多少钱？", options: ["多少钱？", "它有多重？", "它们是什么？"], speaker: "Simon's dad", newline: true },
                    { en: "It's thirteen dollars and twenty-five cents.", cn: "是十三美元二十五美分。", options: ["是十三美元二十五美分。", "是三十美元二十五美分。", "是十三美元五十二美分。"], speaker: "Cashier", newline: true }
                ]
            },
            {
                title: "Unit 2 Activity 2",
                target: "u2a2",
                sentences: [
                    { en: "Can I help you?", cn: "我能帮您吗？", options: ["我能帮您吗？", "你想吃什么？", "我能走了吗？"], speaker: "Cashier", newline: true },
                    { en: "I want noodles and a cola.", cn: "我想要面条和可乐。", options: ["我想要面条和可乐。", "我想要汉堡和可乐。", "我想要面条和牛奶。"], speaker: "Dad", newline: true },
                    { en: "What do you want to eat, Lingling?", cn: "玲玲，你想吃什么？", options: ["玲玲，你想吃什么？", "玲玲，你想喝什么？", "玲玲，你想要什么？"], speaker: "Dad" },
                    { en: "I want a hamburger.", cn: "我想要一个汉堡包。", options: ["我想要一个汉堡包。", "我想要一个热狗。", "我想要一些面条。"], speaker: "Lingling", newline: true },
                    { en: "And what do you want to drink?", cn: "那你想喝点什么？", options: ["那你想喝点什么？", "那你想吃点什么？", "你想要喝可乐吗？"], speaker: "Dad", newline: true },
                    { en: "Milk, please.", cn: "请给我牛奶。", options: ["请给我牛奶。", "请给我可乐。", "请给我果汁。"], speaker: "Lingling", newline: true },
                    { en: "So we want a hamburger, noodles, milk and a cola, please.", cn: "所以我们要一个汉堡，面条，牛奶和可乐。", options: ["所以我们要一个汉堡，面条，牛奶和可乐。", "所以我们要两个汉堡，面条，牛奶和可乐。", "所以我们要一个热狗，面条，牛奶和可乐。"], speaker: "Dad", newline: true },
                    { en: "OK.", cn: "好的。", options: ["好的。", "不对。", "谢谢。"], speaker: "Cashier", newline: true }
                ]
            }
        ]
    },
    2: {
        level: "Grade 6 Semester 2 - Module 2",
        sections: [
            {
                title: "Unit 1 Activity 2",
                target: "u1a2",
                sentences: [
                    { en: "I'm hungry. When are we going to eat, Mum?", cn: "我饿了。妈妈，我们什么时候吃饭？", options: ["我饿了。妈妈，我们什么时候吃饭？", "我很饱。妈妈，我们什么时候吃午饭？", "我累了。妈妈，我们什么时候回家？"], speaker: "Simon", newline: true },
                    { en: "At half past twelve.", cn: "十二点半。", options: ["十二点半。", "十一点半。", "十二点。"], speaker: "Mum", newline: true },
                    { en: "What time is it now?", cn: "现在几点了？", options: ["现在几点了？", "现在是什么时候？", "我们什么时候出发？"], speaker: "Simon", newline: true },
                    { en: "It's only half past eleven. One hour to go!", cn: "现在才十一点半。还有一个小时！", options: ["现在才十一点半。还有一个小时！", "已经十二点半了。还有一个小时！", "现在才十一点。还有两个小时！"], speaker: "Mum", newline: true },
                    { en: "Look, there are some ducks on the pond.", cn: "看，池塘里有一些鸭子。", options: ["看，池塘里有一些鸭子。", "看，池塘里有一些鱼。", "看，天空中有一些鸭子。"], speaker: "Simon", newline: true },
                    { en: "They're lovely.", cn: "它们真可爱。", options: ["它们真可爱。", "它们真淘气。", "它们真漂亮。"], speaker: "Daming", newline: true },
                    { en: "Hey, there are some dark clouds in the sky. It's going to rain soon.", cn: "嘿，天空中有些乌云。马上就要下雨了。", options: ["嘿，天空中有些乌云。马上就要下雨了。", "嘿，天空中有一片白云。天气很好。", "嘿，天空中有些乌云。马上就要下雪了。"], speaker: "Mum", newline: true },
                    { en: "I don't think so. It's a beautiful day. Let's go!", cn: "我不这么认为。今天天气很好。我们走吧！", options: ["我不这么认为。今天天气很好。我们走吧！", "我也这么认为。天气很糟糕。我们走吧！", "我不知道。天气不错。我们去玩吧！"], speaker: "Simon", newline: true },
                    { en: "It's half past twelve. Let's have our picnic!", cn: "十二点半了。我们野餐吧！", options: ["十二点半了。我们野餐吧！", "十二点半了。我们吃午饭吧！", "一点半了。我们野餐吧！"], speaker: "Simon", newline: true },
                    { en: "Oh dear! It's raining now!", cn: "哦天哪！现在下雨了！", options: ["哦天哪！现在下雨了！", "太棒了！现在下雪了！", "哦天哪！现在天晴了！"], speaker: "Simon", newline: true },
                    { en: "It's dry over there. Run, boys!", cn: "那边是干的。跑吧，孩子们！", options: ["那边是干的。跑吧，孩子们！", "那边是湿的。跑吧，孩子们！", "那边是干的。走吧，孩子们！"], speaker: "Mum", newline: true },
                    { en: "Oh no, look at the ducks! They're eating our sandwiches!", cn: "哦不，看那些鸭子！它们在吃我们的三明治！", options: ["哦不，看那些鸭子！它们在吃我们的三明治！", "哦不，看那些小狗！它们在吃我们的汉堡包！", "哦不，看那些鸭子！它们在水里游泳！"], speaker: "Simon", newline: true },
                    { en: "Naughty ducks!", cn: "淘气的鸭子！", options: ["淘气的鸭子！", "可爱的鸭子！", "聪明的鸭子！"], speaker: "Daming", newline: true },
                    { en: "It looks like you're going to stay hungry, Simon!", cn: "看来你要挨饿了，西蒙！", options: ["看来你要挨饿了，西蒙！", "看来你要吃饱了，西蒙！", "看来你要回家了，西蒙！"], speaker: "Mum", newline: true }
                ]
            },
            {
                title: "Unit 2 Activity 2",
                target: "u2a2",
                sentences: [
                    { en: "Let's look at the weather tomorrow.", cn: "我们来看看明天的天气。", options: ["我们来看看明天的天气。", "我们来看看昨天的天气。", "我们来看看今天的天气。"], speaker: "Presenter", newline: true },
                    { en: "It will snow in Harbin.", cn: "哈尔滨将会下雪。", options: ["哈尔滨将会下雪。", "哈尔滨正在下雪。", "哈尔滨将会下雨。"], speaker: "Presenter" },
                    { en: "It will rain in Beijing.", cn: "北京将会下雨。", options: ["北京将会下雨。", "北京正在下雨。", "北京将会下雪。"], speaker: "Presenter" },
                    { en: "It will be cold and windy in Xi'an.", cn: "西安将会寒冷且有风。", options: ["西安将会寒冷且有风。", "西安将会寒冷且下雨。", "西安将会温暖且多风。"], speaker: "Presenter" },
                    { en: "It will be warm and sunny in Sanya.", cn: "三亚将会温暖且晴朗。", options: ["三亚将会温暖且晴朗。", "三亚将会寒冷且晴朗。", "三亚将会温暖且多雨。"], speaker: "Presenter" }
                ]
            }
        ]
    },
    3: {
        level: "Grade 6 Semester 2 - Module 3",
        sections: [
            {
                title: "Unit 1 Activity 2",
                target: "u1a2",
                sentences: [
                    { en: "Dear Lingling, How are you?", cn: "亲爱的玲玲，你好吗？", options: ["亲爱的玲玲，你好吗？", "亲爱的大明，你好吗？", "亲爱的玲玲，你去哪了？"], speaker: "Daming", newline: true },
                    { en: "I had a very interesting day on Saturday. We had a picnic in the park.", cn: "周六我度过了非常有趣的一天。我们在公园里野餐了。", options: ["周六我度过了非常有趣的一天。我们在公园里野餐了。", "周日我度过了非常有趣的一天。我们在公园里野餐了。", "周六我度过了非常无聊的一天。我们在公园里玩耍了。"], speaker: "Daming", newline: true },
                    { en: "I am sending you some photos. I miss everyone in China.", cn: "我正寄给你一些照片。我想念中国的每个人。", options: ["我正寄给你一些照片。我想念中国的每个人。", "我正寄给你一些书。我想念中国的每个人。", "我正送给你一些照片。我不想念中国的任何人。"], speaker: "Daming", newline: true },
                    { en: "Please write to me soon. Love, Daming.", cn: "请尽快给我回信。爱你的，大明。", options: ["请尽快给我回信。爱你的，大明。", "请尽快给我打电话。爱你的，大明。", "请写信给玲玲。爱你的，大明。"], speaker: "Daming", newline: true },
                    { en: "In this photo, the sun is shining. The birds are singing in the tree.", cn: "在这张照片里，阳光灿烂。鸟儿在树上歌唱。", options: ["在这张照片里，阳光灿烂。鸟儿在树上歌唱。", "在这张照片里，正在下雨。鸟儿在树上歌唱。", "在这张照片里，阳光灿烂。鸟儿在水里游泳。"], speaker: "Daming", newline: true },
                    { en: "We are looking at some ducks. They look hungry.", cn: "我们正在看一些鸭子。它们看起来饿了。", options: ["我们正在看一些鸭子。它们看起来饿了。", "我们正在喂一些鸭子。它们看起来饱了。", "我们正在看一些小鸟。它们看起来很可爱。"], speaker: "Daming", newline: true },
                    { en: "In this photo, it's starting to rain and the birds are flying away.", cn: "在这张照片里，开始下雨了，鸟儿正在飞走。", options: ["在这张照片里，开始下雨了，鸟儿正在飞走。", "在这张照片里，开始下雪了，鸟儿正在唱歌。", "在这张照片里，雨停了，鸟儿正在飞来。"], speaker: "Daming", newline: true },
                    { en: "And just look at this! The ducks are eating our sandwiches!", cn: "快看这个！鸭子们正在吃我们的三明治！", options: ["快看这个！鸭子们正在吃我们的三明治！", "快看那个！鸭子们正在吃我们的热狗！", "快看这个！鸭子们正在喝我们的可乐！"], speaker: "Daming", newline: true }
                ]
            },
            {
                title: "Unit 2 Activity 2",
                target: "u2a2",
                sentences: [
                    { en: "In this photo, we are in the mountains.", cn: "在这张照片里，我们在山里。", options: ["在这张照片里，我们在山里。", "在这张照片里，我们在公园里。", "在这张照片里，我们在学校里。"], speaker: "Daming", newline: true },
                    { en: "The sun is shining and the wind is blowing.", cn: "阳光灿烂，微风习习。", options: ["阳光灿烂，微风习习。", "正在下雨，微风习习。", "阳光灿烂，正在下雪。"], speaker: "Daming", newline: true },
                    { en: "The cows are drinking water. The birds are singing.", cn: "奶牛正在喝水。鸟儿正在歌唱。", options: ["奶牛正在喝水。鸟儿正在歌唱。", "马儿正在喝水。鸟儿正在飞走。", "奶牛正在吃草。鸟儿正在唱歌。"], speaker: "Daming", newline: true },
                    { en: "The ducks are swimming. The rabbits are jumping.", cn: "鸭子正在游泳。兔子正在跳跃。", options: ["鸭子正在游泳。兔子正在跳跃。", "鸭子正在飞。兔子正在跑。", "鱼儿正在游泳。兔子正在跳跃。"], speaker: "Daming", newline: true },
                    { en: "Simon and I are playing hide-and-seek.", cn: "西蒙和我正在玩捉迷藏。", options: ["西蒙和我正在玩捉迷藏。", "大明和西蒙正在打篮球。", "西蒙和我正在下棋。"], speaker: "Daming", newline: true },
                    { en: "We are having a lovely time! Love, Daming.", cn: "我们度过了一段美好的时光！爱你的，大明。", options: ["我们度过了一段美好的时光！爱你的，大明。", "我们过得很无聊！爱你的，大明。", "我们玩得很累！爱你的，大明。"], speaker: "Daming", newline: true }
                ]
            }
        ]
    },
    4: {
        level: "Grade 6 Semester 2 - Module 4",
        sections: [
            {
                title: "Unit 1 Activity 2",
                target: "u1a2",
                sentences: [
                    { en: "Who can help me? I can't carry everything.", cn: "谁能帮帮我？我拿不了所有东西。", options: ["谁能帮帮我？我拿不了所有东西。", "谁能帮帮他？他拿不了这个盒子。", "谁要走？我能拿所有东西。"], speaker: "Mum", newline: true },
                    { en: "Sorry, I can't. I'm on the phone.", cn: "对不起，我不能。我在打电话。", options: ["对不起，我不能。我在打电话。", "抱歉，我不想去。我在看书。", "没关系，我能行。我在听音乐。"], speaker: "Dad", newline: true },
                    { en: "I can help you. I can carry this box.", cn: "我能帮你。我能拿这个盒子。", options: ["我能帮你。我能拿这个盒子。", "我不想帮你。我能拿这个包。", "他能帮你。他能拿这个盒子。"], speaker: "Daming", newline: true },
                    { en: "Thank you, Daming.", cn: "谢谢你，大明。", options: ["谢谢你，大明。", "不用谢，大明。", "再见，大明。"], speaker: "Mum", newline: true },
                    { en: "Be careful. That's the cake. Oh dear! The oranges are falling!", cn: "当心。那是蛋糕。哦天哪！橘子掉下来了！", options: ["当心。那是蛋糕。哦天哪！橘子掉下来了！", "小心。那是蛋糕。哦天哪！苹果掉下来了！", "别担心。那是面包。哦天哪！橘子掉下来了！"], speaker: "Mum", newline: true },
                    { en: "Simon, come and help us!", cn: "西蒙，快来帮帮我们！", options: ["西蒙，快来帮帮我们！", "西蒙，快去帮帮他们！", "西蒙，别过来！"], speaker: "Daming", newline: true },
                    { en: "The balloons are flying away!", cn: "气球飞走了！", options: ["气球飞走了！", "风筝飞走了！", "气球掉下来了！"], speaker: "Simon", newline: true },
                    { en: "But look at the balloons. They say, \"Happy Birthday, Daming!\"", cn: "但是看那些气球。上面写着：“生日快乐，大明！”", options: ["但是看那些气球。上面写着：“生日快乐，大明！”", "但是看那些卡片。上面写着：“生日快乐，大明！”", "但是看那些气球。上面写着：“生日快乐，西蒙！”"], speaker: "Simon", newline: true }
                ]
            },
            {
                title: "Unit 2 Activity 2",
                target: "u2a2",
                sentences: [
                    { en: "Oh dear! I can't carry them all.", cn: "噢，天哪！我拿不动它们全部。", options: ["噢，天哪！我拿不动它们全部。", "噢，天哪！我能拿动它们全部。", "噢，天哪！我不想拿它们。"], speaker: "Boy", newline: true },
                    { en: "Everything is falling!", cn: "所有东西都掉下来了！", options: ["所有东西都掉下来了！", "所有东西都不见了！", "有些东西掉下来了！"], speaker: "Boy", newline: true },
                    { en: "The eggs are broken!", cn: "鸡蛋碎了！", options: ["鸡蛋碎了！", "苹果碎了！", "鸡蛋丢了！"], speaker: "Boy", newline: true },
                    { en: "And the apples are falling down the stairs!", cn: "苹果正在从楼梯上滚下来！", options: ["苹果正在从楼梯上滚下来！", "橘子正在从楼梯上滚下来！", "苹果正在从桌子上滚下来！"], speaker: "Boy", newline: true },
                    { en: "Oh no! Now the cola is falling too!", cn: "噢，不！现在可乐也掉下来了！", options: ["噢，不！现在可乐也掉下来了！", "噢，不！现在牛奶也掉下来了！", "噢，不！现在橘子也掉下来了！"], speaker: "Boy", newline: true },
                    { en: "What a mess!", cn: "真是一团糟！", options: ["真是一团糟！", "太干净了！", "多漂亮啊！"], speaker: "Boy", newline: true },
                    { en: "Who can help me?", cn: "谁能帮帮我？", options: ["谁能帮帮我？", "谁想帮他？", "我能帮谁？"], speaker: "Boy", newline: true }
                ]
            }
        ]
    },
    5: {
        level: "Grade 6 Semester 2 - Module 5",
        sections: [
            {
                title: "Unit 1 Activity 2",
                target: "u1a2",
                sentences: [
                    { en: "Daming is having a birthday party.", cn: "大明正在举办生日派对。", options: ["大明正在举办生日派对。", "西蒙正在举办生日派对。", "大明正在参加生日派对。"], speaker: "Narrator", newline: true },
                    { en: "He is playing the suona, but the phone rings.", cn: "他正在吹唢呐，但是电话响了。", options: ["他正在吹唢呐，但是电话响了。", "他正在弹吉他，但是电话响了。", "他正在吹唢呐，但是门铃响了。"], speaker: "Narrator", newline: true },
                    { en: "He stops and everyone waits.", cn: "他停了下来，大家都在等待。", options: ["他停了下来，大家都在等待。", "他停了下来，大家都在唱歌。", "他继续吹，大家都在跳舞。"], speaker: "Narrator", newline: true },
                    { en: "Daming is playing the suona again, but the bell rings.", cn: "大明又吹起唢呐，但是门铃响了。", options: ["大明又吹起唢呐，但是门铃响了。", "大明又吹起唢呐，但是电话响了。", "大明没有吹起唢呐，但是门铃响了。"], speaker: "Narrator", newline: true },
                    { en: "Stop! says Simon. Daming stops.", cn: "“停下！”西蒙说。大明停了下来。", options: ["“停下！”西蒙说。大明停了下来。", "“继续！”西蒙说。大明停了下来。", "“当心！”西蒙说。大明停了下来。"], speaker: "Narrator", newline: true },
                    { en: "More friends come in. Simon's dog comes in too.", cn: "更多朋友进来了。西蒙的狗也进来了。", options: ["更多朋友进来了。西蒙的狗也进来了。", "一些老师进来了。西蒙的猫也进来了。", "更多朋友出去了。西蒙的狗也出去了。"], speaker: "Narrator", newline: true },
                    { en: "Daming is playing the suona for the third time, but the dog starts to bark very loudly.", cn: "大明第三次吹起唢呐，但是狗开始非常大声地吠叫。", options: ["大明第三次吹起唢呐，但是狗开始非常大声地吠叫。", "大明第二次吹起唢呐，但是狗开始吠叫。", "大明第三次吹起唢呐，但是猫开始大声吠叫。"], speaker: "Narrator", newline: true },
                    { en: "His friends can't hear him.", cn: "他的朋友们听不见他的声音。", options: ["他的朋友们听不见他的声音。", "他的老师们听不见他的声音。", "他的朋友们能听见他的声音。"], speaker: "Narrator", newline: true }
                ]
            },
            {
                title: "Unit 2 Activity 2",
                target: "u2a2",
                sentences: [
                    { en: "She's having lunch, but the phone rings.", cn: "她正在吃午饭，但是电话响了。", options: ["她正在吃午饭，但是电话响了。", "她正在吃晚饭，但是门铃响了。", "她正在做饭，但是电话响了。"], speaker: "Narrator", newline: true },
                    { en: "He's riding his bike, but it starts to rain.", cn: "他正在骑自行车，但是开始下雨了。", options: ["他正在骑自行车，但是开始下雨了。", "他正在骑自行车，但是开始下雪了。", "他正在开汽车，但是开始下雨了。"], speaker: "Narrator", newline: true },
                    { en: "She's doing exercise, but it gets too hot.", cn: "她正在做运动，但是天气变得太热了。", options: ["她正在做运动，但是天气变得太热了。", "她正在做作业，但是天气变得太热了。", "她正在做运动，但是开始下雨了。"], speaker: "Narrator", newline: true },
                    { en: "She's watching TV, but the bell rings.", cn: "她正在看电视，但是门铃响了。", options: ["她正在看电视，但是门铃响了。", "她正在听音乐，但是门铃响了。", "她正在看电视，但是电话响了。"], speaker: "Narrator", newline: true },
                    { en: "He's walking in the park, but it starts to snow.", cn: "他正在公园散步，但是开始下雪了。", options: ["他正在公园散步，但是开始下雪了。", "他正在街上跑步，但是开始下雪了。", "他正在公园散步，但是开始下雨了。"], speaker: "Narrator", newline: true },
                    { en: "He's reading a book, but his sister starts to sing.", cn: "他正在读书，但是他的姐姐开始唱歌。", options: ["他正在读书，但是他的姐姐开始唱歌。", "他正在写字，但是他的姐姐开始唱歌。", "他正在看书，但是他的妹妹开始跳舞。"], speaker: "Narrator", newline: true }
                ]
            }
        ]
    },
    6: {
        level: "Grade 6 Semester 2 - Module 6",
        sections: [
            {
                title: "Unit 1 Activity 2",
                target: "u1a2",
                sentences: [
                    { en: "It was Daming's birthday yesterday.", cn: "昨天是大明的生日。", options: ["昨天是大明的生日。", "明天是大明的生日。", "昨天是西蒙的生日。"], speaker: "Narrator", newline: true },
                    { en: "He got many presents from his family and friends.", cn: "他收到了来自家人和朋友的许多礼物。", options: ["他收到了来自家人和朋友的许多礼物。", "他送给家人和朋友许多礼物。", "他收到了来自老师和同学 of 许多礼物。"], speaker: "Narrator", newline: true },
                    { en: "Simon's mum bought him a present too.", cn: "西蒙的妈妈也给他买了一份礼物。", options: ["西蒙的妈妈也给他买了一份礼物。", "西蒙的爸爸也给他买了一份礼物。", "大明的妈妈也给他买了一份礼物。"], speaker: "Narrator", newline: true },
                    { en: "It was a book about space travel.", cn: "那是一本关于太空旅行的书。", options: ["那是一本关于太空旅行的书。", "那是一本关于海底世界的书。", "那是一艘关于太空旅行的飞船。"], speaker: "Narrator", newline: true },
                    { en: "Daming is very interested in space travel.", cn: "大明对太空旅行非常感兴趣。", options: ["大明对太空旅行非常感兴趣。", "大明对太空旅行不感兴趣。", "西蒙对太空旅行非常感兴趣。"], speaker: "Narrator", newline: true },
                    { en: "He loves the present very much.", cn: "他非常喜欢这份礼物。", options: ["他非常喜欢这份礼物。", "他不怎么喜欢这份礼物。", "他很喜欢这本书。"], speaker: "Narrator", newline: true },
                    { en: "Daming showed Simon his birthday present.", cn: "大明给西蒙看了他的生日礼物。", options: ["大明给西蒙看了他的生日礼物。", "西蒙给大明看了他的生日礼物。", "大明给西蒙送了他的生日礼物。"], speaker: "Narrator", newline: true },
                    { en: "Simon was interested in the book too.", cn: "西蒙也对这本书感兴趣。", options: ["西蒙也对这本书感兴趣。", "西蒙也喜欢那艘宇宙飞船。", "大明也对这本书感兴趣。"], speaker: "Narrator", newline: true },
                    { en: "Daming asked him to read the book with him.", cn: "大明请他和他一起读这本书。", options: ["大明请他和他一起读这本书。", "西蒙请大明和他一起看那本书。", "大明请西蒙和他一起写这本书。"], speaker: "Narrator", newline: true },
                    { en: "In the book, they saw many pictures of spaceships from China, Russia and the US.", cn: "在书里，他们看到了许多来自中国、俄罗斯和美国的宇宙飞船的照片。", options: ["在书里，他们看到了许多来自中国、俄罗斯和美国的宇宙飞船的照片。", "在书里，他们看到了许多来自中国和美国的宇宙飞船的照片。", "在画册里，他们看到了许多来自中国、俄罗斯和美国的宇宙飞船。"], speaker: "Narrator", newline: true },
                    { en: "They learnt a lot about space travel.", cn: "他们学到了很多关于太空旅行的知识。", options: ["他们学到了很多关于太空旅行的知识。", "他们了解了一些关于太空旅行的知识。", "他们教了别人很多关于太空旅行的知识。"], speaker: "Narrator", newline: true },
                    { en: "Daming and Simon finished the book.", cn: "大明和西蒙读完了这本书。", options: ["大明和西蒙读完了这本书。", "大明和西蒙开始看这本书。", "大明和西蒙丢了这本书。"], speaker: "Narrator", newline: true },
                    { en: "Then they decided to make a paper spaceship together.", cn: "然后他们决定一起做一个纸宇宙飞船。", options: ["然后他们决定一起做一个纸宇宙飞船。", "然后他们决定一起画一个宇宙飞船。", "然后他们决定各自做一个纸宇宙飞船。"], speaker: "Narrator", newline: true },
                    { en: "They gave the spaceship to Simon's mum.", cn: "他们把飞船给了西蒙的妈妈。", options: ["他们把飞船给了西蒙的妈妈。", "他们把飞船给了大明的妈妈。", "他们把书给了西蒙的妈妈。"], speaker: "Narrator", newline: true },
                    { en: "Daming thanked her for the birthday present.", cn: "大明谢谢她送的生日礼物。", options: ["大明谢谢她送的生日礼物。", "西蒙谢谢她送的生日礼物。", "大明谢谢她送的生日卡片。"], speaker: "Narrator", newline: true },
                    { en: "She was very happy.", cn: "她非常高兴。", options: ["她非常高兴。", "她非常累。", "他们非常高兴。"], speaker: "Narrator", newline: true }
                ]
            },
            {
                title: "Unit 2 Activity 2",
                target: "u2a2",
                sentences: [
                    { en: "Daming and Simon made a model of a Chinese spaceship.", cn: "大明和西蒙做了一个中国宇宙飞船的模型。", options: ["大明和西蒙做了一个中国宇宙飞船的模型。", "大明和西蒙画了一艘中国宇宙飞船。", "大明和西蒙做了一个俄罗斯宇宙飞船的模型。"], speaker: "Narrator", newline: true },
                    { en: "The name of the spaceship is Shenzhou V.", cn: "这艘宇宙飞船的名字叫神舟五号。", options: ["这艘宇宙飞船的名字叫神舟五号。", "这艘宇宙飞船的名字叫神舟六号。", "这本太空书的名字叫神舟五号。"], speaker: "Narrator", newline: true },
                    { en: "In 2003, it took a Chinese taikonaut into space for the first time.", cn: "2003年，它第一次把一位中国航天员送入太空。", options: ["2003年，它第一次把一位中国航天员送入太空。", "2003年，它第一次把两位中国航天员送入太空。", "2013年，它第一次把一位中国航天员送入太空。"], speaker: "Narrator", newline: true },
                    { en: "It took the national flag of China and some seeds too.", cn: "它也携带了中国国旗和一些种子。", options: ["它也携带了中国国旗和一些种子。", "它只携带了中国国旗，没有带种子。", "It也携带了美国国旗和一些种子。"], speaker: "Narrator", newline: true }
                ]
            }
        ]
    },
    7: {
        level: "Grade 6 Semester 2 - Module 7",
        sections: [
            {
                title: "Unit 1 Activity 2",
                target: "u1a2",
                sentences: [
                    { en: "My father, Yang Liwei, is a taikonaut, and he is very famous.", cn: "我的父亲杨利伟是一名宇航员，他非常有名。", options: ["我的父亲杨利伟是一名宇航员，他非常有名。", "我的叔叔杨利伟是一名宇航员，他非常有名。", "我的父亲杨利伟是一名科学家，他很有名。"], speaker: "Yang Liwei's son", newline: true },
                    { en: "In October 2003, my father flew into space in Shenzhou V.", cn: "2003年10月，我的父亲乘坐神舟五号飞入太空。", options: ["2003年10月，我的父亲乘坐神舟五号飞入太空。", "2003年12月，我的父亲乘坐神舟五号飞入太空。", "2003年10月，我的父亲乘坐神舟六号飞入太空。"], speaker: "Yang Liwei's son", newline: true },
                    { en: "He spent about twenty-one hours in space.", cn: "他在太空度过了大约二十一个小时。", options: ["他在太空度过了大约二十一个小时。", "他在太空度过了大约十二个小时。", "他在太空工作了大约二十一天。"], speaker: "Yang Liwei's son", newline: true },
                    { en: "He did a lot of work there.", cn: "他在那里做了很多工作。", options: ["他在那里做了很多工作。", "他在那里拍了很多照片。", "他在那里休息了很久。"], speaker: "Yang Liwei's son", newline: true },
                    { en: "He also made a video in space.", cn: "他还在太空制作了一段视频。", options: ["他还在太空制作了一段视频。", "他还在太空拍了一张照片。", "他还在太空写了一封信。"], speaker: "Yang Liwei's son", newline: true },
                    { en: "Then he came back to the earth.", cn: "然后他回到了地球。", options: ["然后他回到了地球。", "然后他回到了太空舱。", "然后他回到了北京。"], speaker: "Yang Liwei's son", newline: true },
                    { en: "My mother and I went to the airport to meet my father.", cn: "我妈妈和我去机场迎接我父亲。", options: ["我妈妈和我去机场迎接我父亲。", "我爸爸和妈妈去机场接我。", "我妈妈和我去火车站迎接我父亲。"], speaker: "Yang Liwei's son", newline: true },
                    { en: "We were very happy.", cn: "我们非常高兴。", options: ["我们非常高兴。", "他们非常高兴。", "我们非常激动。"], speaker: "Yang Liwei's son", newline: true },
                    { en: "It was a great day!", cn: "那是一个伟大的日子！", options: ["那是一个伟大的日子！", "那是一个忙碌的日子！", "那是一次伟大的旅行！"], speaker: "Yang Liwei's son", newline: true },
                    { en: "I was very proud of him.", cn: "我为他感到非常自豪。", options: ["我为他感到非常自豪。", "他为我感到非常自豪。", "我为自己感到自豪。"], speaker: "Yang Liwei's son", newline: true },
                    { en: "Now he still tells me about his space travel.", cn: "现在他仍然告诉我关于他的太空旅行。", options: ["现在他仍然告诉我关于他的太空旅行。", "现在他不再告诉我关于他的太空旅行。", "过去他常告诉我关于他的太空旅行。"], speaker: "Yang Liwei's son", newline: true },
                    { en: "I want to go into space someday too.", cn: "我也想有朝一日进入太空。", options: ["我也想有朝一日进入太空。", "我也想去太空旅行一次。", "他不希望我有朝一日进入太空。"], speaker: "Yang Liwei's son", newline: true }
                ]
            },
            {
                title: "Unit 2 Activity 2",
                target: "u2a2",
                sentences: [
                    { en: "Helen Keller was born in the US in 1880.", cn: "海伦·凯勒1880年出生于美国。", options: ["海伦·凯勒1880年出生于美国。", "海伦·凯勒1880年出生于英国。", "海伦·凯勒1818年出生于美国。"], speaker: "Narrator", newline: true },
                    { en: "As a baby, she became blind and deaf.", cn: "还是个婴儿时，她变得又盲又聋。", options: ["还是个婴儿时，她变得又盲又聋。", "还是个孩子时，她变得又盲又哑。", "长大后，她变得又盲又聋。"], speaker: "Narrator", newline: true },
                    { en: "She couldn't see or hear.", cn: "她看不见也听不见。", options: ["她看不见也听不见。", "她看不见，但听得见。", "她看得见，但听不见。"], speaker: "Narrator", newline: true },
                    { en: "Helen had a teacher.", cn: "海伦有一位老师。", options: ["海伦有一位老师。", "海伦有一位朋友。", "海伦有一位医生。"], speaker: "Narrator", newline: true },
                    { en: "She drew letters in Helen's hand and taught her to spell.", cn: "她在海伦手中画字母并教她拼写。", options: ["她在海伦手中画字母并教她拼写。", "她在海伦手中写字并教她说话。", "她在海伦本子上画画并教她写字。"], speaker: "Narrator", newline: true },
                    { en: "Later Helen learnt to read, write and speak.", cn: "后来海伦学会了读、写和说。", options: ["后来海伦学会了读、写和说。", "后来海伦学会了读、写和画画。", "后来海伦学会了手语、写和说。"], speaker: "Narrator", newline: true },
                    { en: "She wrote a book about herself and travelled all over the world.", cn: "她写了一本关于她自己的书，并周游了世界。", options: ["她写了一本关于她自己的书，并周游了世界。", "她看了一本关于自己的书，并周游了世界。", "她写了一本关于自己老师的书，并周游了世界。"], speaker: "Narrator", newline: true },
                    { en: "Helen lived to be eighty-seven.", cn: "海伦活到了八十七岁。", options: ["海伦活到了八十七岁。", "海伦活到了七十八岁。", "海伦活到了八十岁。"], speaker: "Narrator", newline: true },
                    { en: "She is a role model for blind people, and also for you and me.", cn: "她是盲人们的榜样，也是你和我的榜样。", options: ["她是盲人们的榜样，也是你和我的榜样。", "她是聋哑人们的榜样，也是你和我的榜样。", "She是所有人的榜样，但不是我的榜样。"], speaker: "Narrator", newline: true }
                ]
            }
        ]
    },
    8: {
        level: "Grade 6 Semester 2 - Module 8",
        sections: [
            {
                title: "Unit 1 Activity 2",
                target: "u1a2",
                sentences: [
                    { en: "Sam came into the classroom and saw some friends there.", cn: "萨姆进了教室，在那儿看到了一些朋友。", options: ["萨姆进了教室，在那儿看到了一些朋友。", "大明进了教室，在那儿看到了一些老师。", "萨姆离开了教室，去见了一些朋友。"], speaker: "Narrator", newline: true },
                    { en: "They had cups on their heads.", cn: "他们头上戴着杯子。", options: ["他们头上戴着杯子。", "他们头上戴着帽子。", "他们手里拿着杯子。"], speaker: "Narrator", newline: true },
                    { en: "Why do you have cups on your heads? Why are you laughing?", cn: "你们为什么头上戴着杯子？你们为什么在笑？", options: ["你们为什么头上戴着杯子？你们为什么在笑？", "你们为什么头上戴着帽子？你们为什么在笑？", "你们为什么头上戴着杯子？你们在做什么？"], speaker: "Sam", newline: true },
                    { en: "Daming told him the story.", cn: "大明告诉了他那个故事。", options: ["大明告诉了他那个故事。", "西蒙告诉了他那个故事。", "大明教了他那首歌。"], speaker: "Narrator", newline: true },
                    { en: "They planned to play a baseball game.", cn: "他们计划打一场棒球赛。", options: ["他们计划打一场棒球赛。", "他们计划打一场篮球赛。", "他们刚刚打完一场棒球赛。"], speaker: "Narrator", newline: true },
                    { en: "Amy asked Lingling to bring some caps for the game.", cn: "埃米让玲玲带一些帽子来参加比赛。", options: ["埃米让玲玲带一些帽子来参加比赛。", "埃米让玲玲带一些杯子来参加比赛。", "玲玲让埃米带一些帽子来参加比赛。"], speaker: "Narrator", newline: true },
                    { en: "But Lingling brought some cups.", cn: "但是玲玲带了一些杯子。", options: ["但是玲玲带了一些杯子。", "但是玲玲带了一些帽子。", "但是埃米带了一些杯子。"], speaker: "Narrator", newline: true },
                    { en: "Sam opened his bag.", cn: "萨姆打开了他的书包。", options: ["萨姆打开了他的书包。", "大明打开了他的书包。", "萨姆合上了他的书包。"], speaker: "Narrator", newline: true },
                    { en: "There were baseball caps!", cn: "那里有棒球帽！", options: ["那里有棒球帽！", "那里有许多杯子！", "那里有一只棒球！"], speaker: "Narrator", newline: true }
                ]
            },
            {
                title: "Unit 2 Activity 2",
                target: "u2a2",
                sentences: [
                    { en: "Why are you wearing a raincoat?", cn: "你为什么要穿雨衣？", options: ["你为什么要穿雨衣？", "你为什么要穿大衣？", "你打算买一件雨衣吗？"], speaker: "Amy", newline: true },
                    { en: "Because it's going to rain.", cn: "因为要下雨了。", options: ["因为要下雨了。", "因为正在下雨。", "因为要下雪了。"], speaker: "Tom", newline: true },
                    { en: "Why are you wearing a hat?", cn: "你为什么要戴帽子？", options: ["你为什么要戴帽子？", "你为什么要戴眼镜？", "你为什么要戴头盔？"], speaker: "Daming", newline: true },
                    { en: "Because it's going to be sunny.", cn: "因为天气将会晴朗。", options: ["因为天气将会晴朗。", "因为要下雨了。", "因为太阳出来了。"], speaker: "Lingling", newline: true },
                    { en: "Why are you wearing a T-shirt?", cn: "你为什么要穿T恤？", options: ["你为什么要穿T恤？", "你为什么要穿毛衣？", "你为什么要穿衬衫？"], speaker: "Dad", newline: true },
                    { en: "Because I'm going to play basketball.", cn: "因为我要去打篮球。", options: ["因为我要去打篮球。", "因为我要去打棒球。", "因为我喜欢篮球。"], speaker: "Sam", newline: true },
                    { en: "Why are you wearing a dress?", cn: "你为什么要穿连衣裙？", options: ["你为什么要穿连衣裙？", "你为什么要穿裙子？", "你为什么要穿大衣？"], speaker: "Mum", newline: true },
                    { en: "Because I'm going to the theatre.", cn: "因为我要去剧院。", options: ["因为我要去剧院。", "因为我要去电影院。", "因为我要去学校。"], speaker: "Amy", newline: true }
                ]
            }
        ]
    },
    9: {
        level: "Grade 6 Semester 2 - Module 9",
        sections: [
            {
                title: "Unit 1 Activity 2",
                target: "u1a2",
                sentences: [
                    { en: "You're a naughty but lovely boy.", cn: "你是一个淘气但可爱的男孩。", options: ["你是一个淘气但可爱的男孩。", "你是一个聪明但可爱的男孩。", "你是一个淘气但不怎么可爱的男孩。"], speaker: "Lingling", newline: true },
                    { en: "You helped me in sport.", cn: "你在体育方面帮助了我。", options: ["你在体育方面帮助了我。", "你在英语方面帮助了我。", "你帮助了我做运动。"], speaker: "Lingling", newline: true },
                    { en: "We had a happy time at school.", cn: "我们在学校度过了快乐的时光。", options: ["我们在学校度过了快乐的时光。", "我们在公园度过了快乐的时光。", "我们在学校度过了难忘的时光。"], speaker: "Amy", newline: true },
                    { en: "You taught me Chinese.", cn: "你教了我汉语。", options: ["你教了我汉语。", "你教了我英语。", "你帮我学中文。"], speaker: "Amy", newline: true },
                    { en: "You're my best friend, Daming.", cn: "大明，你是我最好的朋友。", options: ["大明，你是我最好的朋友。", "大明，你是我的好朋友。", "西蒙，你是我最好的朋友。"], speaker: "Sam", newline: true },
                    { en: "I'll never forget our time together.", cn: "我永远不会忘记我们在一起的时光。", options: ["我永远不会忘记我们在一起的时光。", "我常常会想起我们在一起的时光。", "我永远会记住你的名字。"], speaker: "Sam", newline: true }
                ]
            },
            {
                title: "Unit 2 Activity 2",
                target: "u2a2",
                sentences: [
                    { en: "What are you doing, Lingling?", cn: "你在做什么，玲玲？", options: ["你在做什么，玲玲？", "你去哪儿了，玲玲？", "你在看书吗，玲玲？"], speaker: "Dad", newline: true },
                    { en: "I'm writing goodbye letters to all my friends at school.", cn: "我正在给学校所有的朋友写告别信。", options: ["我正在给学校所有的朋友写告别信。", "我正在给家里所有的朋友写告别信。", "我正在看我学校所有朋友写给我的告别信。"], speaker: "Lingling", newline: true },
                    { en: "What are you writing in your letters?", cn: "你在信里写什么呢？", options: ["你在信里写什么呢？", "你在信里写你的名字吗？", "你在卡片上写什么呢？"], speaker: "Dad", newline: true },
                    { en: "Well, first I write the name of a friend.", cn: "嗯，首先我写下一个朋友的名字。", options: ["嗯，首先我写下一个朋友的名字。", "嗯，首先我写下我自己的名字。", "嗯，然后我写下一个朋友的名字。"], speaker: "Lingling", newline: true },
                    { en: "And then I write \"Wishing you happiness every day\" in every letter.", cn: "然后我在每封信里都写上“祝你天天开心”。", options: ["然后我在每封信里都写上“祝你天天开心”。", "然后我在信里写上“祝你生日快乐”。", "然后我在信中写上“祝你天天开心，大明”。"], speaker: "Lingling", newline: true },
                    { en: "Wow! There are about forty letters here.", cn: "哇！这儿大约有四十封信。", options: ["哇！这儿大约有四十封信。", "哇！这儿大约有十四封信。", "哇！这儿有许多信。"], speaker: "Dad", newline: true }
                ]
            }
        ]
    },
    10: {
        level: "Grade 6 Semester 2 - Module 10",
        sections: [
            {
                title: "Unit 1 Activity 2",
                target: "u1a2",
                sentences: [
                    { en: "Dear classmates, we're going to leave our primary school soon and start middle school this September.", cn: "亲爱的同学们，我们很快就要离开小学，在今年九月开始上中学了。", options: ["亲爱的同学们，我们很快就要离开小学，在今年九月开始上中学了。", "亲爱的老师们，我们很快就要离开小学，在今年九月开始上中学了。", "亲爱的同学们，我们很快就要离开中学，在今年九月开始上大学了。"], speaker: "Speaker", newline: true },
                    { en: "I'm excited, and also sad.", cn: "我很兴奋，也很悲伤。", options: ["我很兴奋，也很悲伤。", "我很开心，但有点害怕。", "我很激动，但有点遗憾。"], speaker: "Speaker", newline: true },
                    { en: "I'm excited because we're going to study Chinese, English, Maths, History, Geography, and learn lots of new things.", cn: "我很兴奋，因为我们要学习语文、英语、数学、历史、地理，还要学习很多新事物。", options: ["我很兴奋，因为我们要学习语文、英语、数学、历史、地理，还要学习很多新事物。", "我很开心，因为我们要学习语文、英语、数学、科学、美术，还要学习很多新事物。", "我很兴奋，因为我们要学习语文、英语、数学、历史、物理，还要学习很多新事物。"], speaker: "Speaker", newline: true },
                    { en: "We're also going to meet new friends there.", cn: "我们还将在那里结识新朋友。", options: ["我们还将在那里结识新朋友。", "我们还将在那里见到老朋友。", "我们还将在那里和朋友们见面。"], speaker: "Speaker", newline: true },
                    { en: "At the same time, I'm very sad to say goodbye to you.", cn: "同时，我很伤心要和你们说再见。", options: ["同时，我很伤心要和你们说再见。", "同时，我很开心要和你们说再见。", "不久，我很伤心要和你们说再见。"], speaker: "Speaker", newline: true },
                    { en: "My best friends Sam and Amy are going back to the UK.", cn: "我最好的朋友萨姆和埃米要回英国了。", options: ["我最好的朋友萨姆和埃米要回英国了。", "我最好的朋友萨姆和西蒙要回英国了。", "我最好的朋友萨姆和埃米要去英国了。"], speaker: "Speaker", newline: true },
                    { en: "My dear friends, I'll miss you all. Let's write lots of emails to each other!", cn: "我亲爱的朋友们，我会想念你们所有人的。让我们互相写很多邮件吧！", options: ["我亲爱的朋友们，我会想念你们所有人的。让我们互相写很多邮件吧！", "我亲爱的朋友们，我会想念你们所有人的。让我们互相写信吧！", "我亲爱的同学们，我会想念你们的。让我们写信联系吧！"], speaker: "Speaker", newline: true }
                ]
            },
            {
                title: "Unit 2 Activity 2",
                target: "u2a2",
                sentences: [
                    { en: "I'm going to Park Middle School. What about you?", cn: "我要去公园中学。你呢？", options: ["我要去公园中学。你呢？", "我要去湖畔中学。你呢？", "我要去公园中学。你想去哪？"], speaker: "Lingling", newline: true },
                    { en: "I'm going to Lake Middle School.", cn: "我要去湖畔中学。", options: ["我要去湖畔中学。", "我要去公园中学。", "他要去湖畔中学。"], speaker: "Amy", newline: true },
                    { en: "What are you going to study?", cn: "你打算学习什么？", options: ["你打算学习什么？", "你打算去哪里？", "他打算学习什么？"], speaker: "Lingling", newline: true },
                    { en: "I'm going to study History, Science, Geography and French.", cn: "我打算学习历史、科学、地理和法语。", options: ["我打算学习历史、科学、地理和法语。", "我打算学习历史、化学、地理和法语。", "我打算学习历史、科学、地理和语文。"], speaker: "Amy", newline: true },
                    { en: "I'm going to study Physics, Chemistry and Chinese.", cn: "我打算学习物理、化学和语文。", options: ["我打算学习物理、化学和语文。", "我打算学习物理、科学和语文。", "我打算学习历史、化学和语文。"], speaker: "Lingling", newline: true },
                    { en: "I'm also going to study History and Geography. But I'm not going to study French.", cn: "我还要学习历史和地理。但是我不打算学习法语。", options: ["我还要学习历史和地理。但是我不打算学习法语。", "我还要学习历史和科学。但是我不打算学习法语。", "我还要学习物理和化学。但是我不打算学习法语。"], speaker: "Lingling", newline: true }
                ]
            }
        ]
    }
};

for (let m = 1; m <= 10; m++) {
    const modInfo = a6bData[m];
    const modDir = path.join(__dirname, '..', 'data', 'A6B', `a6b-m${m}`);
    if (!fs.existsSync(modDir)) {
        fs.mkdirSync(modDir, { recursive: true });
    }

    const outputJson = {
        level: modInfo.level,
        title: "Passage Decoder",
        sections: modInfo.sections.map(sec => {
            const sentencesMap = sec.sentences.map(s => {
                const correctIndex = s.options.indexOf(s.cn);
                if (correctIndex === -1) {
                    throw new Error(`Correct answer not found in options for: ${s.en} in Module ${m} ${sec.title}`);
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
            return {
                title: sec.title,
                sentences: sentencesMap
            };
        })
    };

    const targetPath = path.join(modDir, `a6b-m${m}-passage-decoder-s.json`);
    fs.writeFileSync(targetPath, JSON.stringify(outputJson, null, 2) + '\n', 'utf8');
    console.log(`Generated unified JSON for Module ${m} at ${targetPath}`);

    // Run highlights match script
    const vocabPath = path.join(modDir, `a6b-m${m}-vocab-guide.json`);
    processFile(vocabPath, targetPath);
}
console.log("All A6B passage decoders generated successfully!");

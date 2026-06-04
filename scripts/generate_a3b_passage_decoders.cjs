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

const a3bData = {
    1: {
        level: "Grade 3 Semester 2 - Unit 1",
        sections: [
            {
                title: "Start Up",
                sentences: [
                    { en: "What animals does Tom draw?", cn: "汤姆画了哪些动物？", options: ["汤姆画了哪些动物？", "汤姆喜欢哪些动物？", "汤姆看见了哪些动物？"] },
                    { en: "Look at my picture!", cn: "看我的画！", options: ["看我的画！", "看我的书！", "画一幅画！"], speaker: "Tom", newline: true },
                    { en: "Are they tigers?", cn: "它们是老虎吗？", options: ["它们是猫吗？", "它们是狮子吗？", "它们是老虎吗？"], speaker: "Amy", newline: true },
                    { en: "Yes!", cn: "是的！", options: ["是的！", "不！", "好的！"], speaker: "Tom", newline: true },
                    { en: "But tigers are strong!", cn: "但是老虎很强壮啊！", options: ["但是老虎很可爱啊！", "但是老虎很强壮啊！", "但是老虎很大呀！"], speaker: "Amy", newline: true },
                    { en: "What are they, Tom?", cn: "汤姆，它们是什么？", options: ["汤姆，它们在哪里？", "汤姆，它们是什么？", "汤姆，它们是谁？"], speaker: "Amy", newline: true },
                    { en: "They're elephants.", cn: "它们是大象。", options: ["它们是长颈鹿。", "它们是大象。", "它们是老虎。"], speaker: "Tom", newline: true },
                    { en: "But elephants are big.", cn: "但是大象很大呀。", options: ["但是大象很大呀。", "但是大象很矮呀。", "但是大象很小呀。"], speaker: "Amy", newline: true },
                    { en: "What are they?", cn: "它们是什么？", options: ["它们是谁？", "它们在哪里？", "它们是什么？"], speaker: "Amy", newline: true },
                    { en: "They're giraffes.", cn: "它们是长颈鹿。", options: ["它们是长颈鹿。", "它们是变色龙。", "它们是熊猫。"], speaker: "Tom", newline: true },
                    { en: "Oh, Tom. Giraffes aren't short!", cn: "哦，汤姆。长颈鹿可不矮！", options: ["哦，汤姆。长颈鹿可不矮！", "哦，汤姆。长颈鹿非常矮！", "哦，汤姆。长颈鹿可不长！"], speaker: "Amy", newline: true },
                    { en: "Are they pandas?", cn: "它们是熊猫吗？", options: ["它们是熊猫吗？", "它们是猫吗？", "它们是变色龙吗？"], speaker: "Amy", newline: true },
                    { en: "Yes! They're black and white!", cn: "是的！它们是黑白相间的！", options: ["是的！它们是红黄相间的！", "是的！它们是黑白相间的！", "是的！它们是蓝绿相间的！"], speaker: "Tom", newline: true },
                    { en: "Ha ha! That's not right. Let me help you.", cn: "哈哈！那不对。让我来帮你吧。", options: ["哈哈！那不对。让我来帮你吧。", "哈哈！那很对。让我来帮你吧。", "哈哈！那不对。我不需要你帮。"], speaker: "Amy", newline: true }
                ]
            },
            {
                title: "Speed Up",
                sentences: [
                    { en: "Hi, I'm Tippi. Look! This is my book.", cn: "你好，我是提比。看！这是我的书。", options: ["你好，我是提比。看！这是我的照片。", "你好，我是提比。看！这是我的画。", "你好，我是提比。看！这是我的书。"], speaker: "Tippi", newline: true },
                    { en: "This is Abu. He is an elephant. He is big and strong. I love him.", cn: "这是阿布。他是一头大象。他高大又强壮。我爱他。", options: ["这是阿布。他是一头大象。他高大又强壮。我爱他。", "这是阿布。他是一只长颈鹿。他高大又强壮。我喜欢他。", "这是阿布。他是一头大象。他很小很可爱。我爱他。"], newline: true },
                    { en: "This is Leon. He is a chameleon. He is small.", cn: "这是莱昂。他是一只变色龙。他很小。", options: ["这是莱昂。他是一只鸵鸟。他很小。", "这是莱昂。他是一只变色龙。他很小。", "这是莱昂。他是一只变色龙。他跑得快。"], newline: true },
                    { en: "This is Linda. She is an ostrich. She is fast.", cn: "这是琳达。她是一只鸵鸟。她跑得很快。", options: ["这是琳达。她是一只变色龙。她跑得很快。", "这是琳达。她是一只鸵鸟。她跑得很快。", "这是琳达。她是一只鸵鸟。她很强壮。"], newline: true },
                    { en: "This is Mufasa. He is a little lion. He is cute.", cn: "这是木法沙。他是一只小狮子。他很可爱。", options: ["这是木法沙。他是一只大狮子。他很凶猛。", "这是木法沙。他是一只小狮子。他很可爱。", "这是木法沙。他是一只小熊。他很可爱。"], newline: true },
                    { en: "They are my animal friends. I love them.", cn: "它们是我的动物朋友。我爱它们。", options: ["它们是我的学校朋友。我爱它们。", "它们是我的动物朋友。我爱它们。", "它们是我的动物玩具。我喜欢它们。"], newline: true }
                ]
            }
        ]
    },
    2: {
        level: "Grade 3 Semester 2 - Unit 2",
        sections: [
            {
                title: "Start Up",
                sentences: [
                    { en: "Good work, children! Let's make a snowman!", cn: "做得好，孩子们！我们来堆个雪人吧！", options: ["做得好，孩子们！我们来堆个雪人吧！", "做得好，孩子们！我们去滑雪吧！", "加油，孩子们！我们来画个雪人吧！"], speaker: "Dad", newline: true },
                    { en: "Look! He has got a red mouth.", cn: "看！他有一个红色的嘴巴。", options: ["看！他有一个红色的鼻子。", "看！他有一个红色的嘴巴。", "看！他有红色的眼睛。"], speaker: "Child 1", newline: true },
                    { en: "Now, he has got a long nose.", cn: "现在，他有一个长鼻子了。", options: ["现在，他有一个长鼻子了。", "现在，他有一个红色的鼻子了。", "现在，他有一只大耳朵了。"], speaker: "Child 2", newline: true },
                    { en: "Oh, he hasn't got eyes.", cn: "噢，他没有眼睛。", options: ["噢，他没有鼻子。", "噢，他没有眼睛。", "噢，他有两只眼睛。"], speaker: "Child 3", newline: true },
                    { en: "I've got two rocks! Now he has got two eyes.", cn: "我有两块石头！现在他有两只眼睛了。", options: ["我有两块石板！现在他有两只耳朵了。", "我有两块石头！现在他有两只眼睛了。", "我有两个树枝！现在他有眼睛了。"], speaker: "Child 4", newline: true },
                    { en: "He's got long arms and big hands!", cn: "他有长长的手臂和大大的手！", options: ["他有短短的手臂和细细的手！", "他有长长的手臂和大大的手！", "他有长长的腿和宽宽的脚！"], speaker: "Child 5", newline: true },
                    { en: "Wow! You've got a cool snowman!", cn: "哇！你们有一个酷酷的雪人！", options: ["哇！你们有一个酷酷的雪人！", "哇！你们有一个巨大的雪人！", "哇！你们堆雪人很冷！"], speaker: "Mom", newline: true }
                ]
            },
            {
                title: "Speed Up",
                sentences: [
                    { en: "I'm the best!", cn: "我是最好的！", options: ["我是最好的！", "你是最好的！", "他是最好的！"], newline: true },
                    { en: "No, I'm the best!", cn: "不，我是最好的！", options: ["不，你是最好的！", "不，我是最好的！", "不，他是最好的！"], newline: true },
                    { en: "Hello, who is there?", cn: "你好，谁在那儿？", options: ["你好，谁在那儿？", "你好，谁是娜娜？", "你好，你在做什么？"], newline: true },
                    { en: "Sorry, Nana. We are your body parts. Who is the best for you?", cn: "对不起，娜娜。我们是你的身体部位。对你来说谁是最好的？", options: ["抱歉，娜娜。我们是你的好朋友。谁是最好的？", "对不起，娜娜。我们是你的身体部位。对你来说谁是最好的？", "对不起，娜娜。我们是你的身体器官。你喜欢谁？"], newline: true },
                    { en: "Well...", cn: "嗯...", options: ["嗯...", "好的...", "对不起..."], newline: true },
                    { en: "You've got two ears. We help you hear.", cn: "你有两只耳朵。我们帮你听。", options: ["你有两只耳朵。我们帮你听。", "你有两只眼睛。我们帮你听。", "你有两只耳朵。我们帮你说话。"], newline: true },
                    { en: "You've got two eyes. We help you see.", cn: "你有两只眼睛。我们帮你看见。", options: ["你有两只耳朵。我们帮你看见。", "你有两只眼睛。我们帮你看见。", "你有两只眼睛。我们帮你闻。"], newline: true },
                    { en: "I help you smell.", cn: "我帮你闻。", options: ["我帮你闻。", "我帮你听。", "我帮你看见。"], newline: true },
                    { en: "I help you talk and eat.", cn: "我帮你说话和吃东西。", options: ["我帮你说话和吃东西。", "我帮你闻和吃东西。", "我帮你唱歌和喝水。"], newline: true },
                    { en: "And me...", cn: "还有我...", options: ["还有我...", "那是谁...", "就是我..."], newline: true },
                    { en: "And me...", cn: "还有我...", options: ["还有我...", "那是谁...", "就是我..."], newline: true },
                    { en: "And me...", cn: "还有我...", options: ["还有我...", "那是谁...", "就是我..."], newline: true },
                    { en: "And me...", cn: "还有我...", options: ["还有我...", "那是谁...", "就是我..."], newline: true },
                    { en: "Hey! Please stop! You are all important to me. You are a team.", cn: "嘿！请停下来！你们对我来说都很重要。你们是一个团队。", options: ["嘿！请继续！你们对我来说都很重要。你们要比赛。", "嘿！请停下来！你们对我来说都很重要。你们是一个团队。", "嘿！请停下来！你们都有点用。你们要好好干。"], newline: true },
                    { en: "You're right! Let's work together for Nana!", cn: "你是对的！让我们一起为娜娜努力吧！", options: ["你是错的！让我们一起打败娜娜！", "你是对的！让我们一起为娜娜努力吧！", "你是对的！让我们一起帮助娜娜的朋友！"], newline: true }
                ]
            }
        ]
    },
    3: {
        level: "Grade 3 Semester 2 - Unit 3",
        sections: [
            {
                title: "Start Up",
                sentences: [
                    { en: "Welcome!", cn: "欢迎！", options: ["欢迎！", "再见！", "谢谢！"] },
                    { en: "I like tomatoes and oranges.", cn: "我喜欢番茄和橙子。", options: ["我喜欢马铃薯和橙子。", "我喜欢番茄和橙子。", "我喜欢黄瓜和橙子。"], newline: true },
                    { en: "I like bananas.", cn: "我喜欢香蕉。", options: ["我喜欢香蕉。", "我喜欢葡萄。", "我喜欢西红柿。"], newline: true },
                    { en: "I like beans.", cn: "我喜欢豆子。", options: ["我喜欢黄瓜。", "我喜欢香蕉。", "我喜欢豆子。"], newline: true },
                    { en: "I don't like beans. I like cucumbers.", cn: "我不喜欢豆子。我喜欢黄瓜。", options: ["我不喜欢黄瓜。我喜欢豆子。", "我不喜欢豆子。我喜欢黄瓜。", "我不喜欢豆子。我喜欢西红柿。"], newline: true },
                    { en: "He likes grapes.", cn: "他喜欢葡萄。", options: ["他喜欢葡萄。", "她喜欢葡萄。", "他喜欢香蕉。"], newline: true },
                    { en: "Yes, I do. It's beautiful!", cn: "是的，我喜欢。它太漂亮了！", options: ["是的，我喜欢。它太漂亮了！", "是的，我吃。它很好吃！", "不，我不喜欢。它太普通了！"], newline: true }
                ]
            },
            {
                title: "Speed Up",
                sentences: [
                    { en: "Hello, Taotao and Jiajia.", cn: "你们好，涛涛和佳佳。", options: ["你们好，涛涛和佳佳。", "父母：“你们好，涛涛和佳佳。”", "祖父母：“再见，涛涛和佳佳。”"], speaker: "Grandparents", newline: true },
                    { en: "But it's still early.", cn: "但是现在还很早。", options: ["但是现在已经很晚了。", "但是现在还很早。", "而且我还没醒呢。"], speaker: "Taotao", newline: true },
                    { en: "Let's get ready for breakfast.", cn: "让我们准备吃早餐吧。", options: ["让我们准备吃午餐吧。", "让我们准备开始干活吧。", "让我们准备吃早餐吧。"], speaker: "Grandpa", newline: true },
                    { en: "Yes, we do.", cn: "是的，我们喜欢。", options: ["是的，我们喜欢。", "不，我们不喜欢。", "是的，我们去。"], speaker: "Kids", newline: true },
                    { en: "Now we've got eggs.", cn: "现在我们有鸡蛋了。", options: ["现在我们有牛奶了。", "现在我们有鸡蛋了。", "现在我们去拿鸡蛋。"], speaker: "Grandma", newline: true },
                    { en: "Yes, we do.", cn: "是的，我们喜欢。", options: ["不，我们不喜欢。", "是的，我们喜欢。", "是的，我们有。"], speaker: "Kids", newline: true },
                    { en: "Now we've got tomatoes.", cn: "现在我们有西红柿了。", options: ["现在我们有西红柿了。", "现在我们有香蕉了。", "现在我们去摘西红柿。"], speaker: "Grandpa", newline: true },
                    { en: "Yes, I do.", cn: "是的，我喜欢。", options: ["是的，我喜欢。", "不，我不喜欢。", "是的，我有。"], speaker: "Jiajia", newline: true },
                    { en: "Now we've got corn.", cn: "现在我们有玉米了。", options: ["现在我们有黄瓜了。", "现在我们有玉米了。", "现在我们有小麦了。"], speaker: "Grandpa", newline: true },
                    { en: "No, I don't. I like grapes.", cn: "不，我不喜欢。我喜欢葡萄。", options: ["不，我不喜欢。我喜欢葡萄。", "不，我不吃。我喜欢玉米。", "不，我不喜欢。我喜欢西红柿。"], speaker: "Taotao", newline: true },
                    { en: "OK. Let's get grapes.", cn: "好的。那我们去采葡萄吧。", options: ["好的。那我们去采葡萄吧。", "好的。那我们去买葡萄吧。", "好的。那我们准备吃葡萄吧。"], speaker: "Grandma", newline: true },
                    { en: "Thank you, Grandma and Grandpa.", cn: "谢谢奶奶和爷爷。", options: ["再见，奶奶和爷爷。", "谢谢奶奶和爷爷。", "谢谢爸爸和妈妈。"], speaker: "Jiajia", newline: true },
                    { en: "Yummy! Let's get ready for lunch together, too!", cn: "真好吃！让我们也一起准备午饭吧！", options: ["真好吃！让我们也一起准备午饭吧！", "真好吃！让我们一起去吃晚饭吧！", "真好玩！让我们一起做游戏吧！"], speaker: "Taotao", newline: true }
                ]
            }
        ]
    },
    4: {
        level: "Grade 3 Semester 2 - Unit 4",
        sections: [
            {
                title: "Start Up",
                sentences: [
                    { en: "Photos of my family.", cn: "我全家人的照片。", options: ["我全家人的照片。", "我朋友的照片。", "我家里的画。"] },
                    { en: "That's my dad. He likes running.", cn: "那是我爸爸。他喜欢跑步。", options: ["那是我爷爷。他喜欢慢跑。", "那是我爸爸。他喜欢跑步。", "那是我爸爸。他喜欢骑自行车。"], newline: true },
                    { en: "That's my mum. She likes writing.", cn: "那是我妈妈。她喜欢写作。", options: ["那是我妈妈。她喜欢读书。", "那是我妈妈。她喜欢写作。", "那是我姐姐。她喜欢写作。"], newline: true },
                    { en: "Yes, they like doing tai chi.", cn: "是的，他们喜欢打太极。", options: ["是的，他们喜欢打太极。", "是的，他们喜欢跳舞。", "是的，他们经常去散步。"], newline: true },
                    { en: "I like taking photos!", cn: "我喜欢拍照片！", options: ["我喜欢看照片！", "我喜欢拍照片！", "我喜欢画画！"], newline: true }
                ]
            },
            {
                title: "Speed Up",
                sentences: [
                    { en: "He likes learning about animals and plants.", cn: "他喜欢了解动物和植物。", options: ["他喜欢了解动物和植物。", "他喜欢了解动物和昆虫。", "他喜欢画动物 and 植物。"], newline: true },
                    { en: "He likes asking questions.", cn: "他喜欢提问。", options: ["他喜欢回答问题。", "他喜欢提问。", "他喜欢提建议。"] },
                    { en: "He likes watching insects.", cn: "他喜欢观察昆虫。", options: ["他喜欢观察昆虫。", "他喜欢收集昆虫。", "他喜欢画昆虫。"] },
                    { en: "He stays there and watches for a long time.", cn: "他在那里待了很长时间，一直在观察。", options: ["他去过那里，并看了很长时间。", "他在那里待了很长时间，一直在观察。", "他在那里坐了一整天，一直在睡觉。"], newline: true },
                    { en: "It's so interesting!", cn: "它太有趣了！", options: ["它太无聊了！", "它太有趣了！", "它太好玩了！"], newline: true },
                    { en: "People like reading them!", cn: "人们喜欢阅读它们！", options: ["人们喜欢阅读它们！", "人们喜欢购买它们！", "大家喜欢写信！"], newline: true }
                ]
            }
        ]
    },
    5: {
        level: "Grade 3 Semester 2 - Unit 5",
        sections: [
            {
                title: "Start Up",
                sentences: [
                    { en: "Urgh... Not now.", cn: "呃……现在不要。", options: ["呃……现在不要。", "呃……立刻开始。", "呃……不去了。"] },
                    { en: "Not now.", cn: "现在不要。", options: ["立刻去。", "现在不要。", "没有时间。"], newline: true },
                    { en: "What time is it? It's only six o'clock. Not now.", cn: "几点钟了？才六点钟。现在不要。", options: ["几点钟了？已经七点了。现在去。", "几点钟了？才六点钟。我们走吧。", "几点钟了？才六点钟。现在不要。"], newline: true },
                    { en: "Not now!", cn: "现在不要！", options: ["现在不要！", "立刻开始！", "现在不行！"], newline: true }
                ]
            },
            {
                title: "Speed Up",
                sentences: [
                    { en: "Yuanyuan gets up.", cn: "园园起床了。", options: ["园园起床了。", "园园睡觉了。", "园园去上学了。"], newline: true },
                    { en: "Her mum is at work.", cn: "她妈妈在工作。", options: ["她妈妈在休息。", "她妈妈在工作。", "她妈妈下班了。"] },
                    { en: "Yuanyuan goes to school.", cn: "园园去上学。", options: ["园园去上学。", "园园回家了。", "园园去公园了。"], newline: true },
                    { en: "Her mum goes home.", cn: "她妈妈回家了。", options: ["她妈妈回家了。", "她妈妈去上班了。", "她妈妈去学校了。"] },
                    { en: "Yuanyuan has classes at school.", cn: "园园在学校上课。", options: ["园园在学校上课。", "园园在学校做游戏。", "园园在学校吃午餐。"], newline: true },
                    { en: "Her mum goes to bed.", cn: "她妈妈去睡觉了。", options: ["她妈妈去睡觉了。", "她妈妈去上班了。", "她妈妈起床了。"] },
                    { en: "Yuanyuan goes home.", cn: "园园回家了。", options: ["园园回家了。", "园园去上学了。", "园园去睡觉了。"], newline: true },
                    { en: "Her mum goes to work.", cn: "她妈妈去上班了。", options: ["她妈妈去上班了。", "她妈妈回家了。", "她妈妈去买菜了。"] },
                    { en: "Yuanyuan goes to bed.", cn: "园园去睡觉了。", options: ["园园放学了。", "园园去睡觉了。", "园园起床了。"], newline: true },
                    { en: "Her mum is at work.", cn: "她妈妈在工作。", options: ["她妈妈在工作。", "她妈妈下班了。", "她妈妈在家。"] }
                ]
            }
        ]
    },
    6: {
        level: "Grade 3 Semester 2 - Unit 6",
        sections: [
            {
                title: "Start Up",
                sentences: [
                    { en: "It's Wednesday. Only two days!", cn: "玲玲：“今天是星期三。只有两天了！”", options: ["玲玲：“今天是星期三。只有两天了！”", "玲玲：“今天是星期四。只有两天了！”", "玲玲：“今天是星期三。还有三天呢！”"], speaker: "Lingling", newline: true },
                    { en: "It's Thursday! Only one day!", cn: "大明：“今天是星期四！只有一天了！”", options: ["大明：“今天是星期三！只有一天了！”", "大明：“今天是星期四！只有一天了！”", "大明：“今天是星期四！还有两天呢！”"], speaker: "Daming", newline: true },
                    { en: "You're happy! Why?", cn: "萨姆：“你们很高兴！为什么？”", options: ["萨姆：“你们很高兴！为什么？”", "萨姆：“你们很难过！为什么？”", "萨姆：“你们很忙！为什么？”"], speaker: "Sam", newline: true },
                    { en: "It's Friday! We have art on Friday. We love art!", cn: "大明：“今天是星期五！我们星期五有美术课。我们爱美术课！”", options: ["大明：“今天是星期五！我们星期五有美术课。我们爱美术课！”", "大明：“今天是星期五！我们星期五有体育课。我们爱体育！”", "大明：“今天是星期六！我们有美术课。我们爱美术课！”"], speaker: "Daming", newline: true },
                    { en: "Sorry, everyone. Ms Li is not well today.", cn: "王老师：“抱歉，各位。李老师今天身体不舒服。”", options: ["王老师：“大家好。李老师今天请假了。”", "王老师：“抱歉，各位。李老师今天身体不舒服。”", "王老师：“抱歉，各位。李老师今天迟到了。”"], speaker: "Ms Wang", newline: true },
                    { en: "Oh... No art today!", cn: "大明：“噢……今天没有美术课了！”", options: ["大明：“噢……今天没有美术课了！”", "大明：“噢……今天上美术课啦！”", "大明：“噢……美术老师生病了！”"], speaker: "Daming", newline: true },
                    { en: "Let's do something for Ms Li.", cn: "大明：“我们为李老师做点什么吧。”", options: ["大明：“我们为李老师做点什么吧。”", "大明：“我们去看看李老师吧。”", "大明：“我们给李老师打个电话吧。”"], speaker: "Daming", newline: true },
                    { en: "Good idea!", cn: "玲玲：“好主意！”", options: ["玲玲：“太好了！”", "玲玲：“好主意！”", "玲玲：“我不去。”"], speaker: "Lingling", newline: true },
                    { en: "To Ms Li: Get well soon! Daming & Lingling", cn: "“致李老师：早日康复！大明和玲玲”", options: ["“致李老师：早日康复！大明和玲玲”", "“致李老师：天天开心！大明和玲玲”", "“给李老师：节日快乐！大明和玲玲”"], newline: true },
                    { en: "What subject do Daming and Lingling love?", cn: "大明和玲玲最爱什么科目？", options: ["大明和玲玲最爱什么科目？", "大明和玲玲最爱美术老师？", "大明和玲玲星期五有美术课？"], newline: true }
                ]
            },
            {
                title: "Speed Up",
                sentences: [
                    { en: "Great!", cn: "太棒了！", options: ["太棒了！", "好主意！", "加油！"] },
                    { en: "It's Tuesday. I want to make some bookmarks for Grandma Guo. She likes reading.", cn: "今天是星期二。我想为郭奶奶做一些书签。她喜欢阅读。", options: ["今天是星期二。我想为郭奶奶画一幅画。她喜欢画画。", "今天是星期二。我想为郭奶奶做一些书签。她喜欢阅读。", "今天是星期三。我想为郭奶奶买些书。她喜欢阅读。"], newline: true },
                    { en: "It's Wednesday. I want to make a stick for Grandpa Liu.", cn: "今天是星期三。我想为刘爷爷做一根拐杖。", options: ["今天是星期三。我想为刘爷爷做一根拐杖。", "今天是星期四。我想为刘爷爷做一根拐杖。", "今天是星期三。我想帮刘爷爷买一根拐杖。"], newline: true },
                    { en: "It's Thursday. What about a painting for Grandma Zhang?", cn: "今天是星期四。给张奶奶画一幅画怎么样？", options: ["今天是星期五。给张奶奶送些花怎么样？", "今天是星期四。给张奶奶画一幅画怎么样？", "今天是星期四。给张奶奶做个书签怎么样？"], newline: true },
                    { en: "It's Friday. Dad, I want some tea. It's for Grandpa Ma.", cn: "今天是星期五。爸爸，我想要一些茶叶。这是给马爷爷的。", options: ["今天是星期五。爸爸，我想要一些茶叶。这是给马爷爷的。", "今天是星期五。爸爸，我想喝些茶。马爷爷也想喝。", "今天是星期六。爸爸，我想要些花。这是送给马爷爷的。"], newline: true },
                    { en: "It's Saturday. Mum, I want some flowers for Grandma Yang.", cn: "今天是星期六。妈妈，我想要一些花送给杨奶奶。", options: ["今天是星期六。妈妈，我想要一些花送给杨奶奶。", "今天是星期日。妈妈，我想摘一些花送给杨奶奶。", "今天是星期六。妈妈，我想要一些茶叶送给杨奶奶。"], newline: true },
                    { en: "It's Sunday. Thank you so much, Wenwen!", cn: "今天是星期日。太谢谢你了，文文！", options: ["今天是星期一。非常感谢你，文文！", "今天是星期日。太谢谢你了，文文！", "今天是星期日。不用谢，文文！"], newline: true }
                ]
            }
        ]
    }
};

for (let u = 1; u <= 6; u++) {
    const unitInfo = a3bData[u];
    const unitDir = path.join(__dirname, '..', 'data', 'A3B', `a3b-u${u}`);
    if (!fs.existsSync(unitDir)) {
        fs.mkdirSync(unitDir, { recursive: true });
    }

    const sentencesMap = (sec) => {
        return sec.sentences.map(s => {
            const correctIndex = s.options.indexOf(s.cn);
            if (correctIndex === -1) {
                throw new Error(`Correct answer not found in options for: ${s.en}`);
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

    const targetPath = path.join(unitDir, `a3b-u${u}-passage-decoder-s.json`);
    fs.writeFileSync(targetPath, JSON.stringify(outputJson, null, 2) + '\n', 'utf8');
    console.log(`Generated basic JSON for Unit ${u} at ${targetPath}`);

    // Run highlights match script
    const vocabPath = path.join(unitDir, `a3b-u${u}-vocab-guide.json`);
    processFile(vocabPath, targetPath);
}
console.log("All A3B units generated successfully!");

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

const a7aData = {
    1: {
        level: "Grade 7 Semester 1 - Unit 1",
        sections: [
            {
                title: "Section B Activity 1b",
                sentences: [
                    { en: "Pauline Lee", cn: "保琳·李", options: ["保琳·李", "彼得·布朗", "美美"], newline: true },
                    { en: "Hi, I'm Pauline Lee, and I'm 14 years old.", cn: "嗨，我是保琳·李，我14岁了。", options: ["嗨，我是保琳·李，我14岁了。", "你好，我是保琳·李，我13岁了。", "嗨，我是保琳·李，我过去14岁了。"], newline: true },
                    { en: "I live in Singapore with my big family.", cn: "我和我的大家庭一起住在新加坡。", options: ["我和我的大家庭一起住在新加坡。", "我和我的大家庭一起去新加坡旅行。", "我独自一人住在新加坡。"] },
                    { en: "I have a pet bird. It's a parrot.", cn: "我养了一只宠物鸟。它是一只鹦鹉。", options: ["我养了一只宠物鸟。它是一只鹦鹉。", "我养了一只宠物猫。它是一只鹦鹉。", "我养了一只宠物鸟。它是一只鸽子。"] },
                    { en: "Her name is Coco. She even speaks some Chinese!", cn: "她的名字叫Coco。她甚至会说一些中文！", options: ["她的名字叫Coco。她甚至会说一些中文！", "她的名字叫Coco。她以前会说一些中文！", "它的名字叫Coco。它不会说任何中文！"] },
                    { en: "My favourite sport is tennis.", cn: "我最喜欢的运动是网球。", options: ["我最喜欢的运动是网球。", "我最喜欢的运动是足球。", "我最讨厌的运动是网球。"] },
                    { en: "I often play it with my friends after school.", cn: "放学后我经常和我的朋友们一起打。", options: ["放学后我经常和我的朋友们一起打。", "上学前我经常和我的朋友们一起打。", "放学后我很少和我的朋友们一起打。"] },
                    { en: "Do you want to be my friend?", cn: "你想成为我的朋友吗？", options: ["你想成为我的朋友吗？", "你想去拜访我的朋友吗？", "他想成为你的朋友吗？"] },
                    { en: "Peter Brown", cn: "彼得·布朗", options: ["彼得·布朗", "保琳·李", "陈杰"], newline: true },
                    { en: "Hey there! My name is Peter Brown. I'm 13 years old.", cn: "大家好！我的名字是彼得·布朗。我13岁了。", options: ["大家好！我的名字是彼得·布朗。我13岁了。", "大家好！我的名字是彼得·布朗。我14岁了。", "你好！他的名字是彼得·布朗。他13岁了。"], newline: true },
                    { en: "I'm from London, in the UK.", cn: "我来自英国伦敦。", options: ["我来自英国伦敦。", "我来自美国伦敦。", "我计划去英国伦敦。"] },
                    { en: "Now, I live in Beijing with my family.", cn: "现在，我和我的家人一起住在北京。", options: ["现在，我和我的家人一起住在北京。", "过去，我和我的家人一起住在北京。", "现在，我独自一人住在北京。"] },
                    { en: "My favourite food is Beijing roast duck, and my favourite place is the Great Wall.", cn: "我最喜欢的食物是北京烤鸭，我最喜欢的地方是长城。", options: ["我最喜欢的食物是北京烤鸭，我最喜欢的地方是长城。", "我最喜欢的食物是北京烤鸭，我最喜欢的地方是故宫。", "我最讨厌的食物是北京烤鸭，我最讨厌的地方是长城。"] },
                    { en: "I like music, and I play the guitar in the school band.", cn: "我喜欢音乐，我在学校乐队里弹吉他。", options: ["我喜欢音乐，我在学校乐队里弹吉他。", "我喜欢体育，我在学校乐队里弹吉他。", "我喜欢音乐，我计划在学校乐队里弹吉他。"] },
                    { en: "Would you like to be my friend?", cn: "你愿意成为我的朋友吗？", options: ["你愿意成为我的朋友吗？", "你曾经是我的朋友吗？", "他愿意成为你的朋友吗？"] }
                ]
            },
            {
                title: "Section B Activity 3b",
                sentences: [
                    { en: "me", cn: "我", options: ["我", "我的大家庭", "我的最爱"], newline: true },
                    { en: "My name is Andre Kalu.", cn: "我的名字是安德烈·卡鲁。", options: ["我的名字是安德烈·卡鲁。", "他的名字是安德烈·卡鲁。", "我的名字叫托比。"], newline: true },
                    { en: "I'm 13 years old.", cn: "我13岁了。", options: ["我13岁了。", "我14岁了。", "我过去13岁。"] },
                    { en: "I'm from South Africa, but now I live in China.", cn: "我来自南非，但现在我住在中国。", options: ["我来自南非，但现在我住在中国。", "我来自南非，但过去我住在中国。", "我来自中国，但现在我住在南非。"] },
                    { en: "my family", cn: "我的家庭", options: ["我的家庭", "我", "我的最爱"], newline: true },
                    { en: "I live with my father, my mother, and my brother.", cn: "我和我父亲、我母亲以及我兄弟住在一起。", options: ["我和我父亲、我母亲以及我兄弟住在一起。", "我和我父亲、我母亲以及我姐妹住在一起。", "我独自和父母住在一起。"], newline: true },
                    { en: "We have a pet cat.", cn: "我们养了一只宠物猫。", options: ["我们养了一只宠物猫。", "我们养了一只宠物狗。", "他们养了一只宠物猫。"] },
                    { en: "His name is Toby.", cn: "它的名字是托比。", options: ["它的名字是托比。", "她的名字是托比。", "它的名字是柯柯。"] },
                    { en: "favourites", cn: "最爱", options: ["最爱", "我", "我的大家庭"], newline: true },
                    { en: "My favourite food is beef noodles.", cn: "我最喜欢的食物是牛肉面。", options: ["我最喜欢的食物是牛肉面。", "我最喜欢的食物是北京烤鸭。", "我最讨厌的食物是牛肉面。"], newline: true },
                    { en: "My favourite sport is basketball.", cn: "我最喜欢的运动是篮球。", options: ["我最喜欢的运动是篮球。", "我最喜欢的运动是足球。", "我最讨厌的运动是篮球。"] },
                    { en: "I play basketball every weekend with my brother and my friends.", cn: "我每个周末都和我的兄弟以及朋友们打篮球。", options: ["我每个周末都和我的兄弟以及朋友们打篮球。", "我每个周末都和我的姐妹以及朋友们打篮球。", "我每个工作日都和我的兄弟以及朋友们打篮球。"] }
                ]
            }
        ]
    },
    2: {
        level: "Grade 7 Semester 1 - Unit 2",
        sections: [
            {
                title: "Section B Activity 1b",
                sentences: [
                    { en: "Hi, I'm Lily from Ireland. I love my big family. Here's a photo of us.", cn: "嗨，我是来自爱尔兰的莉莉。我爱我的大家庭。这是我们的一张照片。", options: ["嗨，我是来自爱尔兰的莉莉。我爱我的大家庭。这是我们的一张照片。", "嗨，我是来自英国的莉莉。我爱我的大家庭。这是我们的一张照片。", "嗨，我是来自爱尔兰的莉莉。我喜欢独自生活。这是我们的一张照片。"], newline: true },
                    { en: "I'm the one with the pink hat.", cn: "我是戴着粉色帽子的那个人。", options: ["我是戴着粉色帽子的那个人。", "我是戴着红色帽子的那个人。", "我是穿着粉色裙子的那个人。"] },
                    { en: "This is my dad, Fred, on the left.", cn: "这是我的爸爸弗雷德，在左边。", options: ["这是我的爸爸弗雷德，在左边。", "这是我的爸爸弗雷德，在右边。", "这是我的爷爷弗雷德，在左边。"], newline: true },
                    { en: "He's very handsome.", cn: "他非常英俊。", options: ["他非常英俊。", "他非常高大。", "他很滑稽。"] },
                    { en: "He often plays tennis with me.", cn: "他经常和我打网球。", options: ["他经常和我打网球。", "他经常和我踢足球。", "他很少和我打网球。"] },
                    { en: "My little brother, Sam, is on his knee.", cn: "我的小弟弟萨姆坐在他的膝盖上。", options: ["我的小弟弟萨姆坐在他的膝盖上。", "我的大哥哥萨姆站在他的膝盖旁。", "我的小弟弟萨姆正坐在地板上。"], newline: true },
                    { en: "Sam is seven, and he really likes chess.", cn: "萨姆七岁了，他真的很喜欢国际象棋。", options: ["萨姆七岁了，他真的很喜欢国际象棋。", "萨姆八岁了，他真的很喜欢国际象棋。", "萨姆七岁了，他真的很喜欢打网球。"] },
                    { en: "My mum, Jane, is on the right.", cn: "我的妈妈珍妮在右边。", options: ["我的妈妈珍妮在右边。", "我的妈妈珍妮在左边。", "我的姐姐珍妮在右边。"], newline: true },
                    { en: "She's beautiful and kind.", cn: "她美丽又善良。", options: ["她美丽又善良。", "她美丽又严肃。", "她年轻又开朗。"] },
                    { en: "She always reads me a story at night.", cn: "她晚上总是给我读故事。", options: ["她晚上总是给我读故事。", "她晚上经常给我讲笑话。", "她白天总是陪我读书。"] },
                    { en: "My grandparents, Jack and Sarah, are in the middle. They're my dad's parents.", cn: "我的祖父母杰克和莎拉在中间。他们是我爸爸的父母。", options: ["我的祖父母杰克和莎拉在中间。他们是我爸爸的父母。", "我的祖父母杰克和莎拉在中间。他们是我妈妈的父母。", "我的祖父母杰克和莎拉在右边。他们是我爸爸的父母。"], newline: true },
                    { en: "They have a dog. His name is Oscar.", cn: "他们有一只狗。它的名字叫奥斯卡。", options: ["他们有一只狗。它的名字叫奥斯卡。", "他们有一只猫。它的名字叫奥斯卡。", "我们有一只狗。它的名字叫奥斯卡。"] },
                    { en: "My grandparents have three grandchildren: Sam, my cousin Lucy, and me.", cn: "我的祖父母有三个孙辈：萨姆、我的表妹露西和我。", options: ["我的祖父母有三个孙辈：萨姆、我的表妹露西和我。", "我的祖父母有三个孩子：萨姆、我的表妹露西和我。", "我的祖父母有三个孙辈：萨姆、我的堂兄卢卡斯和我。"], newline: true },
                    { en: "They often say I'm their favourite grandchild, but I think they say the same thing to all of us!", cn: "他们经常说我是他们最喜欢的孙辈，但我想他们对我们所有人说的都是一样的话！", options: ["他们经常说我是他们最喜欢的孙辈，但我想他们对我们所有人说的都是一样的话！", "他们经常说我是他们最讨厌的孙辈，但我想他们对我们所有人说的都是一样的话！", "他们很少说我是他们最喜欢的孙辈，因为他们对我们每个人说的话都不同！"] }
                ]
            },
            {
                title: "Section B Activity 2a",
                sentences: [
                    { en: "I'm Hu Xiao. This is my family photo.", cn: "我是胡晓。这是我的全家福。", options: ["我是胡晓。这是我的全家福。", "我是胡晓。这是我的朋友合影。", "我是胡瑞。这是我的全家福。"], newline: true },
                    { en: "Here's my dad.", cn: "这是我的爸爸。", options: ["这是我的爸爸。", "这是我的妈妈。", "这是我的爷爷。"], newline: true },
                    { en: "He's handsome and funny.", cn: "他英俊又幽默。", options: ["他英俊又幽默。", "他英俊又严肃。", "他高大又滑稽。"] },
                    { en: "My dad's favourite sport is football. He plays it every week.", cn: "我爸爸最喜欢的运动是足球。他每周都踢。", options: ["我爸爸最喜欢的运动是足球。他每周都踢。", "我爸爸最喜欢的运动是篮球。他每周都打。", "我爸爸最喜欢的运动是足球。他每个月都踢。"] },
                    { en: "Next to him is my mum.", cn: "在他旁边的是我的妈妈。", options: ["在他旁边的是我的妈妈。", "在他旁边的是我的姐姐。", "在她旁边的是我的爸爸。"], newline: true },
                    { en: "She's beautiful and kind.", cn: "她美丽又善良。", options: ["她美丽又善良。", "她美丽又幽默。", "她年轻又开朗。"] },
                    { en: "She likes to go hiking.", cn: "她喜欢去远足。", options: ["她喜欢去远足。", "她喜欢去游泳。", "她过去常常去远足。"] },
                    { en: "The tall girl is me.", cn: "那个高个子女孩是我。", options: ["那个高个子女孩是我。", "那个矮个子女孩是我。", "那个高个子男孩是我。"], newline: true },
                    { en: "I'm always happy, and I love animals.", cn: "我总是很快乐，而且我很喜欢动物。", options: ["我总是很快乐，而且我很喜欢动物。", "我总是很安静，而且我很喜欢动物。", "我过去很快乐，而且我很喜欢动物。"] },
                    { en: "This is my little brother, Hu Rui.", cn: "这是我的小弟弟胡瑞。", options: ["这是我的小弟弟胡瑞。", "这是我的大哥哥胡瑞。", "这是我的小妹妹胡瑞。"], newline: true },
                    { en: "He has big eyes.", cn: "他有一双大眼睛。", options: ["他有一双大眼睛。", "他有一双小眼睛。", "他有一只大耳朵。"] },
                    { en: "He's very clever, and he likes reading a lot.", cn: "他很聪明，而且非常喜欢阅读。", options: ["他很聪明，而且非常喜欢阅读。", "他很愚蠢，而且非常喜欢阅读。", "他很聪明，但他不喜欢阅读。"] },
                    { en: "We love and help each other.", cn: "我们彼此相爱并互相帮助。", options: ["我们彼此相爱并互相帮助。", "我们彼此相爱但很少交流。", "他们彼此相爱并互相帮助。"], newline: true }
                ]
            }
        ]
    },
    3: {
        level: "Grade 7 Semester 1 - Unit 3",
        sections: [
            {
                title: "Section A Activity 2a",
                sentences: [
                    { en: "What's your new classroom like, Peter?", cn: "彼得，你的新教室是什么样的？", options: ["彼得，你的新教室是什么样的？", "彼得，你的新学校是什么样的？", "彼得，你为什么喜欢新教室？"], speaker: "Helen", newline: true },
                    { en: "It's large.", cn: "它很大。", options: ["它很大。", "它很小。", "它很整洁。"], speaker: "Peter", newline: true },
                    { en: "There are 40 student desks in the room.", cn: "房间里有40张学生课桌。", options: ["房间里有40张学生课桌。", "教室里有50张学生课桌。", "走廊里有40张学生课桌。"], speaker: "Peter" },
                    { en: "And a teacher's desk in front of the blackboard.", cn: "黑板前面还有一张教师讲台。", options: ["黑板前面还有一张教师讲台。", "黑板后面还有一张教师讲台。", "窗户旁还有一张教师讲台。"], speaker: "Peter" },
                    { en: "Where do you sit?", cn: "你坐在哪里？", options: ["你坐在哪里？", "你来自哪里？", "你什么时候坐下？"], speaker: "Helen", newline: true },
                    { en: "I sit in the middle of the classroom.", cn: "我坐在教室的中间。", options: ["我坐在教室的中间。", "我坐在教室的前排。", "我坐在教室的后排。"], speaker: "Peter", newline: true },
                    { en: "What's special in your classroom?", cn: "你们教室里有什么特别的东西吗？", options: ["你们教室里有什么特别的东西吗？", "你们学校里有什么特别的吗？", "为什么你的教室很特别？"], speaker: "Helen", newline: true },
                    { en: "There's a smart whiteboard next to the blackboard.", cn: "黑板旁边有一块智能白板。", options: ["黑板旁边有一块智能白板。", "黑板旁边有一块智能屏幕。", "讲台旁边有一块智能白板。"], speaker: "Peter", newline: true },
                    { en: "Oh, and there's another blackboard at the back of the classroom.", cn: "哦，教室后面还有另一块黑板。", options: ["哦，教室后面还有另一块黑板。", "哦，教室前面还有另一块黑板。", "哦，教室外面还有另一块黑板。"], speaker: "Peter" },
                    { en: "Yes, we put up important notices there.", cn: "是的，我们在那里张贴重要通知。", options: ["是的，我们在那里张贴重要通知。", "是的，我们在那里写重要的问题。", "不，我们很少在那里放重要通知。"], speaker: "Peter" },
                    { en: "Are there any lockers in the classroom?", cn: "教室里有储物柜吗？", options: ["教室里有储物柜吗？", "书包里有储物柜吗？", "走廊里有储物柜吗？"], speaker: "Helen", newline: true },
                    { en: "No, there aren't.", cn: "不，没有。", options: ["不，没有。", "是的，有。", "不，它们不在这里。"], speaker: "Peter", newline: true },
                    { en: "We put our things in the desk drawers.", cn: "我们把东西放在课桌抽屉里。", options: ["我们把东西放在课桌抽屉里。", "我们把东西放在课桌上面。", "我们把衣物放在课桌抽屉里。"], speaker: "Peter" }
                ]
            },
            {
                title: "Section B Activity 1b",
                sentences: [
                    { en: "Hi Flora, Thanks for your email. To answer your question, my new school is great!", cn: "你好弗洛拉，谢谢你的来信。回答你的问题，我的新学校棒极了！", options: ["你好弗洛拉，谢谢你的来信。回答你的问题，我的新学校棒极了！", "你好弗洛拉，谢谢你的礼物。回答你的问题，我的新学校棒极了！", "你好弗洛拉，谢谢你的来信。回答你的问题，我的新教室棒极了！"], newline: true },
                    { en: "It's very beautiful. There are many modern buildings.", cn: "它非常漂亮。这里有许多现代化的建筑。", options: ["它非常漂亮。这里有许多现代化的建筑。", "它非常古老。这里有许多现代化的建筑。", "它非常漂亮。这里有一些低矮的房屋。"] },
                    { en: "There's a large sports field next to the teachers' building.", cn: "教师办公楼旁边有一个大型运动场。", options: ["教师办公楼旁边有一个大型运动场。", "教师宿舍旁边有一个大型运动场。", "教学楼旁边有一个大型运动场。"], newline: true },
                    { en: "All the students go there and do exercises together in the morning.", cn: "所有的学生早上都去那里一起做操。", options: ["所有的学生早上都去那里一起做操。", "所有的学生下午都去那里一起做操。", "部分学生早上都去那里一起做操。"] },
                    { en: "Every Monday we raise the flag there. It's a special way to start the week.", cn: "每周一我们都在那里升旗。这是开始新一周的特殊方式。", options: ["每周一我们都在那里升旗。这是开始新一周的特殊方式。", "每周五我们都在那里降旗。这是结束新一周的特殊方式。", "每周一我们都在那里升旗。这是开始新一天的普通方式。"] },
                    { en: "The classroom building is behind the sports field. We spend most of the time in our classroom.", cn: "教学楼在运动场后面。我们大部分时间都在教室里度过。", options: ["教学楼在运动场后面。我们大部分时间都在教室里度过。", "宿舍楼在运动场后面。我们大部分时间都在教室里度过。", "教学楼在运动场前面。我们大部分时间都在操场上度过。"], newline: true },
                    { en: "It's big and clean. Every week, we change seats.", cn: "它又大又干净。每周我们都会换座位。", options: ["它又大又干净。每周我们都会换座位。", "它又大又干净。每月我们都会换座位。", "它又小又干净。每周我们都会换座位。"] },
                    { en: "This week I sit next to my best friend, Han Lin.", cn: "这周我和我最好的朋友韩林坐在一起。", options: ["这周我和我最好的朋友韩林坐在一起。", "上周我和我最好的朋友韩林坐在一起。", "这周我和我的新同学韩林坐在一起。"] },
                    { en: "The dining hall is across from the sports field. It's my favourite place because there are many kinds of food.", cn: "食堂在运动场的对面。它是我最喜欢的地方，因为那里有许多种食物。", options: ["食堂在运动场的对面。它是我最喜欢的地方，因为那里有许多种食物。", "食堂在运动场的旁边。它是我最喜欢的地方，因为那里有许多种食物。", "体育馆在运动场的对面。它是我最喜欢的地方，因为那里有许多种食物。"], newline: true },
                    { en: "I love the Chinese food there. They make delicious jiaozi.", cn: "我喜欢那里的中国食物。他们做美味的饺子。", options: ["我喜欢那里的中国食物。他们做美味的饺子。", "我喜欢那里的中国食物。他们做美味的面条。", "我喜欢那里的西方食物。他们做美味的饺子。"] },
                    { en: "How about your school? Yours, Peter", cn: "你的学校怎么样？你的，彼得", options: ["你的学校怎么样？你的，彼得", "你的班级怎么样？你的，彼得", "他的学校怎么样？你的，彼得"], newline: true }
                ]
            }
        ]
    },
    4: {
        level: "Grade 7 Semester 1 - Unit 4",
        sections: [
            {
                title: "Section A Activity 2a",
                sentences: [
                    { en: "What's your next class?", cn: "你的下一节是什么课？", options: ["你的下一节是什么课？", "你的新教室在哪里？", "你的上一节是什么课？"], speaker: "Binbin", newline: true },
                    { en: "History. It's my favourite subject.", cn: "历史。它是我最喜欢的科目。", options: ["历史。它是我最喜欢的科目。", "地理。它是我最喜欢的科目。", "历史。它是我最讨厌的科目。"], speaker: "Emma", newline: true },
                    { en: "Why do you like it?", cn: "你为什么喜欢它？", options: ["你为什么喜欢它？", "你怎么学好它？", "他为什么喜欢它？"], speaker: "Binbin", newline: true },
                    { en: "It's interesting to learn about the past.", cn: "了解过去很有趣。", options: ["了解过去很有趣。", "了解过去很无聊。", "研究未来很有趣。"], speaker: "Emma", newline: true },
                    { en: "What's your favourite subject, Meimei?", cn: "美美，你最喜欢的科目是什么？", options: ["美美，你最喜欢的科目是什么？", "美美，他最喜欢的科目是什么？", "美美，你为什么喜欢这个科目？"], speaker: "Binbin", newline: true },
                    { en: "My favourite subject is English.", cn: "我最喜欢的科目是英语。", options: ["我最喜欢的科目是英语。", "我最喜欢的科目是语文。", "我最讨厌的科目是英语。"], speaker: "Meimei", newline: true },
                    { en: "It's useful, and my English teacher is really nice.", cn: "它很有用，而且我的英语老师人真的很好。", options: ["它很有用，而且我的英语老师人真的很好。", "它很难，而且我的英语老师人真的很严格。", "它很有用，而且我的语文老师人真的很好。"], speaker: "Meimei" },
                    { en: "How about you, Binbin?", cn: "你呢，彬彬？", options: ["你呢，彬彬？", "他呢，彬彬？", "你的新班级怎么样，彬彬？"], speaker: "Meimei", newline: true },
                    { en: "I like all the subjects, but my favourite is maths.", cn: "我喜欢所有的科目，但我最喜欢的是数学。", options: ["我喜欢所有的科目，但我最喜欢的是数学。", "我喜欢所有的科目，但我最喜欢的是音乐。", "我不喜欢所有的科目，但我最喜欢的是数学。"], speaker: "Binbin", newline: true },
                    { en: "Why?", cn: "为什么？", options: ["为什么？", "谁说的？", "什么时候？"], speaker: "Meimei", newline: true },
                    { en: "Because I'm good with numbers.", cn: "因为我对数字很敏感。", options: ["因为我对数字很敏感。", "因为我善于和人打交道。", "因为我不喜欢数字。"], speaker: "Binbin", newline: true },
                    { en: "Oh, it's difficult for me. Can you help me with this subject?", cn: "哦，它对我来说太难了。你能帮帮我这个科目吗？", options: ["哦，它对我来说太难了。你能帮帮我这个科目吗？", "哦，它对我来说太简单了。你能教教我这个科目吗？", "哦，它对我来说太难了。你能帮帮他这个科目吗？"], speaker: "Emma", newline: true },
                    { en: "Sure!", cn: "当然可以！", options: ["当然可以！", "对不起！", "没门！"], speaker: "Binbin", newline: true },
                    { en: "Hey, look at the time. Let's go to class!", cn: "嘿，看时间。我们去上课吧！", options: ["嘿，看时间。我们去上课吧！", "嘿，看时间。我们去吃饭吧！", "嘿，看时间。我们回家吧！"], speaker: "Meimei", newline: true }
                ]
            },
            {
                title: "Section B Activity 1b",
                sentences: [
                    { en: "I'm a student in Canada. I'm very busy this year.", cn: "我是加拿大的学生。我今年很忙。", options: ["我是加拿大的学生。我今年很忙。", "我是美国的学生。我今年很忙。", "我是加拿大的学生。我去年很忙。"], newline: true },
                    { en: "I study maths, music, French, history, English, IT, science, and have gym.", cn: "我学习数学、音乐、法语、历史、英语、信息技术、科学，并且上体育课。", options: ["我学习数学、音乐、法语、历史、英语、信息技术、科学，并且上体育课。", "我学习数学、音乐、德语、历史、英语、信息技术、科学，并且上体育课。", "我学习数学、美术、法语、历史、英语、信息技术、科学，并且上体育课。"] },
                    { en: "My favourite subject is music because the class is fun and we learn a lot of new songs.", cn: "我最喜欢的科目是音乐，因为课堂很有趣，我们可以学到很多新歌。", options: ["我最喜欢的科目是音乐，因为课堂很有趣，我们可以学到很多新歌。", "我最喜欢的科目是美术，因为课堂很有趣，我们可以学到很多新歌。", "我最讨厌的科目是音乐，因为课堂很有趣，我们可以学到很多新歌。"] },
                    { en: "Music always makes me happy. My music teacher is excellent.", cn: "音乐总是让我快乐。我的音乐老师非常优秀。", options: ["音乐总是让我快乐。我的音乐老师非常优秀。", "音乐经常让我难过。我的音乐老师非常优秀。", "音乐总是让我快乐。我的美术老师非常优秀。"] },
                    { en: "He lets us play all kinds of interesting instruments. I want to be a singer in the future.", cn: "他让我们演奏各种有趣的乐器。我将来想成为一名歌手。", options: ["他让我们演奏各种有趣的乐器。我将来想成为一名歌手。", "他让我们演奏各种有趣的乐器。我过去想成为一名歌手。", "He 让我们演奏一些简单的乐器。我将来想成为一名歌手。"] },
                    { en: "I'm from China. This term, I have subjects like Chinese, history, maths, English, PE, and IT.", cn: "我来自中国。这学期，我学习语文、历史、数学、英语、体育和信息技术等科目。", options: ["我来自中国。这学期，我学习语文、历史、数学、英语、体育和信息技术等科目。", "我来自中国。这学期，我学习语文、地理、数学、英语、体育和信息技术等科目。", "我来自日本。这学期，我学习语文、历史、数学、英语、体育和信息技术等科目。"], newline: true },
                    { en: "I like all the subjects, but my favourite is maths.", cn: "我喜欢所有的科目，但我最喜欢的是数学。", options: ["我喜欢所有的科目，但我最喜欢的是数学。", "我喜欢所有的科目，但我最讨厌的是数学。", "我不喜欢所有的科目，但我最喜欢的是数学。"] },
                    { en: "I like it because I'm good with numbers.", cn: "我喜欢它是因我擅长处理数字。", options: ["我喜欢它是因我擅长处理数字。", "我喜欢它是因我对数字不敏感。", "我讨厌它是因我擅长处理数字。"] },
                    { en: "We learn how to work out maths problems in class. It feels like magic and is really fun.", cn: "我们在课堂上学习如何解决数学题。这感觉就像魔术一样，真的很有趣。", options: ["我们在课堂上学习如何解决数学题。这感觉就像魔术一样，真的很有趣。", "我们在课堂上学习如何提出数学题。这感觉就像魔术一样，真的很有趣。", "我们在课堂上学习如何解决数学题。这感觉非常无聊，而且很难。"] },
                    { en: "Maths is very useful in our life, and I want to be a scientist in the future.", cn: "数学在我们的生活中非常有用，我将来想成为一名科学家。", options: ["数学在我们的生活中非常有用，我将来想成为一名科学家。", "数学在我们的学习中非常有用，我将来想成为一名宇航员。", "数学在我们的生活中非常有用，我过去想成为一名科学家。"] }
                ]
            }
        ]
    },
    5: {
        level: "Grade 7 Semester 1 - Unit 5",
        sections: [
            {
                title: "Section A Activity 2a",
                sentences: [
                    { en: "Hi there! What club do you want to join?", cn: "你好！你想加入什么社团？", options: ["你好！你想加入什么社团？", "你好！你想去哪间教室？", "你好！他想加入什么社团？"], speaker: "Teng Fei", newline: true },
                    { en: "I have no idea.", cn: "我不知道。", options: ["我不知道。", "我想好了。", "我有主意了。"], speaker: "Peter", newline: true },
                    { en: "Here's some good news! Our school wants to start a music club. Do you want to join?", cn: "这里有一个好消息！我们学校想创办一个音乐社团。你想加入吗？", options: ["这里有一个好消息！我们学校想创办一个音乐社团。你想加入吗？", "这里有一个坏消息！我们学校想创办一个音乐社团。你想加入吗？", "这里有一个好消息！我们学校想创办一个体育社团。你想加入吗？"], speaker: "Teng Fei", newline: true },
                    { en: "Sure. I can play the guitar. What about you, Emma?", cn: "当然。我会弹吉他。你呢，艾玛？", options: ["当然。我会弹吉他。你呢，艾玛？", "当然。我会弹吉他。她呢，艾玛？", "不。我会弹钢琴。你呢，艾玛？"], speaker: "Peter", newline: true },
                    { en: "I'd love to, but I can't play any musical instruments.", cn: "我很想加入，但我不会演奏任何乐器。", options: ["我很想加入，但我不会演奏任何乐器。", "我很想加入，而且我会演奏很多乐器。", "我不想加入，因为我不会演奏任何乐器。"], speaker: "Emma", newline: true },
                    { en: "Oh, but you can sing well.", cn: "噢，但你唱歌很好听。", options: ["噢，但你唱歌很好听。", "噢，但你唱歌很跑调。", "噢，但你会跳舞。"], speaker: "Peter" },
                    { en: "Exactly! How about Ella? She can play the violin, right?", cn: "没错！埃拉呢？她会拉小提琴，对吧？", options: ["没错！埃拉呢？她会拉小提琴，对吧？", "没错！埃拉呢？她会弹吉他，对吧？", "不对！埃拉呢？她会拉小提琴，对吧？"], speaker: "Teng Fei", newline: true },
                    { en: "Yes, she can.", cn: "是的，她会。", options: ["是的，她会。", "不，她不会。", "是的，我会。"], speaker: "Emma", newline: true },
                    { en: "What instruments can you play, Teng Fei?", cn: "腾飞，你会演奏什么乐器？", options: ["腾飞，你会演奏什么乐器？", "腾飞，你会玩什么运动？", "腾飞，他会演奏什么乐器？"], speaker: "Peter", newline: true },
                    { en: "I can play the drums.", cn: "我会敲鼓。", options: ["我会敲鼓。", "我会弹吉他。", "我会拉小提琴。"], speaker: "Teng Fei", newline: true },
                    { en: "That's great! Let's go to the music room after school!", cn: "太棒了！我们放学后去音乐教室吧！", options: ["太棒了！我们放学后去音乐教室吧！", "太棒了！我们放学后去体育馆吧！", "真糟糕！我们放学后去音乐教室吧！"], speaker: "Peter", newline: true }
                ]
            },
            {
                title: "Section B Activity 1b",
                sentences: [
                    { en: "Cooking Club: We Want You! Do you love Chinese food? Can you cook? Join our cooking club!", cn: "烹饪社团：我们需要你！你喜欢中国菜吗？你会做饭吗？加入我们的烹饪社团吧！", options: ["烹饪社团：我们需要你！你喜欢中国菜吗？你会做饭吗？加入我们的烹饪社团吧！", "烹饪社团：我们需要你！你喜欢西方菜吗？你会做饭吗？加入我们的烹饪社团吧！", "读书社团：我们需要你！你喜欢中国菜吗？你会看书吗？加入我们的读书社团吧！"], newline: true },
                    { en: "Let's learn to cook your favourite Chinese food.", cn: "让我们学做你最喜欢的中国菜。", options: ["让我们学做你最喜欢的中国菜。", "让我们学做他最喜欢的中国菜。", "让我们一起去吃你最喜欢的中国菜。"] },
                    { en: "Mapo tofu, beef noodles, jiaozi, baozi... You name it!", cn: "麻婆豆腐、牛肉面、饺子、包子……应有尽有！", options: ["麻婆豆腐、牛肉面、饺子、包子……应有尽有！", "麻婆豆腐、牛肉面、饺子、包子……你叫什么名字！", "麻婆豆腐、炸鸡、薯条、汉堡……应有尽有！"] },
                    { en: "You can soon cook for your family.", cn: "你很快就能为你的家人做饭了。", options: ["你很快就能为你的家人做饭了。", "你很快就能和你的家人一起吃饭了。", "你以前能为你的家人做饭。"] },
                    { en: "Join us in Room 303 at 4:30 p.m. on Wednesdays.", cn: "周三下午4:30在303室加入我们。", options: ["周三下午4:30在303室加入我们。", "周三上午4:30在303室加入我们。", "周四下午4:30在303室加入我们。"] },
                    { en: "Book Club: Do you like reading? Join our book club! It's more than reading.", cn: "读书社团：你喜欢阅读吗？加入我们的读书社团吧！这不仅仅是阅读。", options: ["读书社团：你喜欢阅读吗？加入我们的读书社团吧！这不仅仅是阅读。", "读书社团：你喜欢写字吗？加入我们的读书社团吧！这不仅仅是阅读。", "音乐社团：你喜欢听歌吗？加入我们的音乐社团吧！这不仅仅是听歌。"], newline: true },
                    { en: "We act out stories, talk about books, and make new friends.", cn: "我们表演故事，谈论书籍，并且交新朋友。", options: ["我们表演故事，谈论书籍，并且交新朋友。", "我们阅读故事，谈论书籍，并且交新朋友。", "我们表演故事，买很多书籍，并且交新朋友。"] },
                    { en: "Books can open your mind and make you think.", cn: "书本可以开阔你的视野，启发你思考。", options: ["书本可以开阔你的视野，启发你思考。", "书本可以让你感到快乐，启发你思考。", "书本可以开阔你的视野，但让你感到疲倦。"] },
                    { en: "Come to the library on Tuesdays after school and fall in love with books!", cn: "周二放学后到图书馆来，爱上书本吧！", options: ["周二放学后到图书馆来，爱上书本吧！", "周三放学后到图书馆来，爱上书本吧！", "周二上学前到图书馆来，爱上书本吧！"] },
                    { en: "Nature Club: Do you love nature? Can you take good photos? ", cn: "大自然社团：你热爱大自然吗？你会拍好看的照片吗？", options: ["大自然社团：你热爱大自然吗？你会拍好看的照片吗？", "大自然社团：你害怕大自然吗？你会拍好看的照片吗？", "大自然社团：你热爱大自然吗？你想去远足吗？"], newline: true },
                    { en: "Come hiking with us every Sunday afternoon!", cn: "每周日下午和我们一起去远足吧！", options: ["每周日下午和我们一起去远足吧！", "每周六下午和我们一起去远足吧！", "每周日上午和我们一起去远足吧！"] },
                    { en: "We watch birds, take photos, and collect plants and insects.", cn: "我们观察鸟类、拍照，并采集植物和昆虫。", options: ["我们观察鸟类、拍照，并采集植物和昆虫。", "我们观察小狗、拍照，并收集植物和树枝。", "我们捕猎鸟类、拍照，并采集植物 and 昆虫。"] },
                    { en: "We also visit nature parks. Discover wildlife right under your nose!", cn: "我们还参观自然公园。去发现就在眼前的野生动植物吧！", options: ["我们还参观自然公园。去发现就在眼前的野生动植物吧！", "我们还参观自然公园。去寻找遥远地方的野生动植物吧！", "我们只参观自然公园。去保护就在眼前的野生动植物吧！"] }
                ]
            },
            {
                title: "Section B Activity 2a",
                sentences: [
                    { en: "Dear Bill, I'm really interested in your club.", cn: "亲爱的比尔，我对你们的社团很感兴趣。", options: ["亲爱的比尔，我对你们的社团很感兴趣。", "亲爱的比尔，我对你们的学校很感兴趣。", "亲爱的比尔，我对你的工作很感兴趣。"], newline: true },
                    { en: "I love reading all kinds of books.", cn: "我喜欢阅读各种各样的书。", options: ["我喜欢阅读各种各样的书。", "我喜欢购买各种各样的书。", "我不喜欢阅读各种各样的书。"] },
                    { en: "I can read fast, but I'd love to find many good books to read.", cn: "我可以读得很快，但我很想找到许多好书来读。", options: ["我可以读得很快，但我很想找到许多好书来读。", "我可以读得很快，但我不想找到很多书来读。", "我读得很慢，但我很想找到许多好书来读。"] },
                    { en: "I can read more and share what I think with others.", cn: "我可以读得更多，并与他人分享我的想法。", options: ["我可以读得更多，并与他人分享我的想法。", "我可以写得更多，并与他人分享我的想法。", "我以前读得很多，但不想与他人分享。"] },
                    { en: "Can I join your club?", cn: "我能加入你们的社团吗？", options: ["我能加入你们的社团吗？", "他能加入你们的社团吗？", "我必须加入你们的社团吗？"] }
                ]
            }
        ]
    },
    6: {
        level: "Grade 7 Semester 1 - Unit 6",
        sections: [
            {
                title: "Section A Activity 2a",
                sentences: [
                    { en: "Hi! I'm Lu Jiaqi, a school reporter. What's your name?", cn: "嗨！我是陆佳琪，学校记者。你叫什么名字？", options: ["嗨！我是陆佳琪，学校记者。你叫什么名字？", "嗨！我是陆佳琪，学校老师。你叫什么名字？", "嗨！我是陆佳琪，学校记者。他叫什么名字？"], speaker: "Lu Jiaqi", newline: true },
                    { en: "Tom.", cn: "汤姆。", options: ["汤姆。", "萨姆。", "杰克。"], speaker: "Tom", newline: true },
                    { en: "So Tom, what time do you usually get up?", cn: "那么汤姆，你通常几点起床？", options: ["那么汤姆，你通常几点起床？", "那么汤姆，你通常几点去学校？", "那么汤姆，他通常几点起床？"], speaker: "Lu Jiaqi", newline: true },
                    { en: "At a quarter to seven.", cn: "差一刻七点。", options: ["差一刻七点。", "七点一刻。", "差一刻八点。"], speaker: "Tom", newline: true },
                    { en: "And then?", cn: "然后呢？", options: ["然后呢？", "在哪里呢？", "为什么呢？"], speaker: "Lu Jiaqi", newline: true },
                    { en: "I have breakfast at about ten past seven. Then I go to school at ten to eight.", cn: "我大约在七点十分吃早餐。然后我在七点五十去学校。", options: ["我大约在七点十分吃早餐。然后我在七点五十去学校。", "我大约在七点十分吃早餐。然后我在八点十去学校。", "我大约在七点一刻吃早餐。然后我在七点五十去学校。"], speaker: "Tom", newline: true },
                    { en: "When do you go home?", cn: "你什么时候回家？", options: ["你什么时候回家？", "你几点去学校？", "他什么时候回家？"], speaker: "Lu Jiaqi", newline: true },
                    { en: "Around five.", cn: "五点左右。", options: ["五点左右。", "六点左右。", "下午四点。"], speaker: "Tom", newline: true },
                    { en: "What do you do after that?", cn: "那之后你做什么？", options: ["那之后你做什么？", "那之前你做什么？", "那之后他做什么？"], speaker: "Lu Jiaqi", newline: true },
                    { en: "Sometimes I play basketball. I have dinner at half past six. Then I do my homework.", cn: "有时我打篮球。我在六点半吃晚饭。然后我做家庭作业。", options: ["有时我打篮球。我在六点半吃晚饭。然后我做家庭作业。", "有时我踢足球。我在六点半吃晚饭。然后我做家庭作业。", "有时我打篮球。我在六点半吃午饭。然后我做家庭作业。"], speaker: "Tom", newline: true },
                    { en: "When do you usually go to bed?", cn: "你通常什么时候睡觉？", options: ["你通常什么时候睡觉？", "你通常几点起床？", "他通常什么时候睡觉？"], speaker: "Lu Jiaqi", newline: true },
                    { en: "At half past nine.", cn: "九点半。", options: ["九点半。", "八点半。", "十点半。"], speaker: "Tom", newline: true },
                    { en: "That's early!", cn: "那真早！", options: ["那真早！", "那太晚了！", "那真棒！"], speaker: "Lu Jiaqi", newline: true },
                    { en: "Well, you know the saying, 'Early to bed, early to rise!'", cn: "嗯，你知道那句谚语，‘早睡早起！’", options: ["嗯，你知道那句谚语，‘早睡早起！’", "嗯，你知道那句话，‘早睡晚起！’", "嗯，你知道那句格言，‘时间就是生命！’"], speaker: "Tom", newline: true }
                ]
            },
            {
                title: "Section B Activity 1b",
                sentences: [
                    { en: "My name is Timo Halla.", cn: "我的名字是蒂莫·哈拉。", options: ["我的名字是蒂莫·哈拉。", "他的名字是蒂莫·哈拉。", "我的名字是蒂莫·海因。"], newline: true },
                    { en: "I'm 13 years old.", cn: "我13岁了。", options: ["我13岁了。", "他13岁了。", "我14岁了。"] },
                    { en: "I live with my parents in Helsinki, Finland.", cn: "我和我的父母住在芬兰赫尔辛基。", options: ["我和我的父母住在芬兰赫尔辛基。", "我和我的父母住在芬兰的首都。", "我独自住在芬兰赫尔辛基。"] },
                    { en: "Now it's December.", cn: "现在是十二月。", options: ["现在是十二月。", "现在是十一月。", "以前是十二月。"] },
                    { en: "Every Tuesday, I usually get up at 7:40.", cn: "每周二，我通常在7:40起床。", options: ["每周二，我通常在7:40起床。", "每周三，我通常在7:40起床。", "每周二，我通常在7:14起床。"], newline: true },
                    { en: "I often listen to the news or music.", cn: "我经常听新闻或音乐。", options: ["我经常听新闻或音乐。", "我偶尔看新闻或听音乐。", "我经常播放新闻或音乐。"] },
                    { en: "After breakfast, I walk to school.", cn: "吃过早餐后，我步行去学校。", options: ["吃过早餐后，我步行去学校。", "吃过早餐后，我乘公交车去学校。", "吃过早餐前，我步行去学校。"], newline: true },
                    { en: "It's only a 10-minute walk.", cn: "只需步行10分钟。", options: ["只需步行10分钟。", "只需乘车10分钟。", "这是一段长达10分钟的路程。"] },
                    { en: "My school begins at 9:00.", cn: "我们学校在9:00开始上课。", options: ["我们学校在9:00开始上课。", "我们学校在8:00开始上课。", "我们学校在9:30开始上课。"], newline: true },
                    { en: "There are 18 students in my class.", cn: "我们班有18个学生。", options: ["我们班有18个学生。", "我们学校有18个学生。", "我们班有80个学生。"] },
                    { en: "Each lesson is 45 minutes long, and there's a break between lessons.", cn: "每节课长45分钟，课间有休息时间。", options: ["每节课长45分钟，课间有休息时间。", "每节课长40分钟，课间有休息时间。", "每节课长45分钟，没有课间休息时间。"] },
                    { en: "I have one Finnish lesson and two home economics lessons in the morning.", cn: "我在上午有一节芬兰语课和两节家政课。", options: ["我在上午有一节芬兰语课和两节家政课。", "我在上午有一节英语课和两节家政课。", "我在下午有一节芬兰语课和两节数学课。"] },
                    { en: "After that, I have lunch at 12:00.", cn: "在那之后，我在12:00吃午饭。", options: ["在那之后，我在12:00吃午饭。", "在那之后，我在12:30吃午饭。", "在那之前，我在12:00吃午饭。"], newline: true },
                    { en: "The afternoon lessons begin at 12:30 and finish at 2:15.", cn: "下午的课在12:30开始，在2:15结束。", options: ["下午的课在12:30开始，在2:15结束。", "下午的课在12:30开始，在2:30结束。", "下午的课在1:30开始，在2:15结束。"] },
                    { en: "Then I go to my ice hockey club.", cn: "然后我去我的冰球俱乐部。", options: ["然后我去我的冰球俱乐部。", "然后我去我的曲棍球社团。", "然后我去我的冰球馆。"] },
                    { en: "I usually get home around 4:00.", cn: "我通常在4:00左右到家。", options: ["我通常在4:00左右到家。", "我通常在5:00左右到家。", "我通常在4:30左右到家。"], newline: true },
                    { en: "It's already dark outside.", cn: "外面已经天黑了。", options: ["外面已经天黑了。", "外面快要天黑了。", "外面还是明亮的。"] },
                    { en: "I often have dinner at 6:00.", cn: "我经常在6:00吃晚饭。", options: ["我经常在6:00吃晚饭。", "我经常在6:30吃晚饭。", "我偶尔在6:00吃晚饭。"], newline: true },
                    { en: "After that, I read with my parents for an hour.", cn: "那之后，我和我的父母一起阅读一个小时。", options: ["那之后，我和我的父母一起阅读一个小时。", "那之前，我和我的父母一起阅读一个小时。", "那之后，我独自阅读一个小时。"] },
                    { en: "That's an important part of my everyday life.", cn: "那是我日常生活的重要组成部分。", options: ["那是我日常生活的重要组成部分。", "那是我日常生活的不重要部分。", "那是我学习生活的重要组成部分。"] },
                    { en: "Then I prepare my schoolbag for the next day.", cn: "然后我为第二天准备好书包。", options: ["然后我为第二天准备好书包。", "然后我为第一天准备好书包。", "然后我把书包收拾好。"] },
                    { en: "At 9:30, it's time for me to go to bed.", cn: "在9:30，是我上床睡觉的时间了。", options: ["在9:30，是我上床睡觉的时间了。", "在10:30，是我上床睡觉的时间了。", "在9:30，是我起床的时间了。"], newline: true }
                ]
            }
        ]
    }
};

for (let u = 1; u <= 6; u++) {
    const unitInfo = a7aData[u];
    const unitDir = path.join(__dirname, '..', 'data', 'A7A', `a7a-u${u}`);
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

    const targetPath = path.join(unitDir, `a7a-u${u}-passage-decoder-s.json`);
    fs.writeFileSync(targetPath, JSON.stringify(outputJson, null, 2) + '\n', 'utf8');
    console.log(`Generated basic JSON for Unit ${u} at ${targetPath}`);

    // Run highlights match script
    const vocabPath = path.join(unitDir, `a7a-u${u}-vocab-guide.json`);
    processFile(vocabPath, targetPath);
}
console.log("All A7A units generated successfully!");

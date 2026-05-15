const fs = require('fs');

const taxiDriverTree = {
  id: "root",
  text: "THE TAXI DRIVER",
  emoji: "🚕",
  children: [
    {
      id: "intro",
      text: "Fiona McIntyre is a taxi driver in London. She tells us about her work and some of her experiences.",
      cn: "菲奥娜·麦金太尔是伦敦的一名出租车司机。她向我们讲述了她的工作和一些经历。",
      emoji: "👩‍✈️",
      notes: "The interview introduces Fiona and her job.",
      statement: "Fiona is a taxi driver.",
      answer: true,
      explanation: "文中明确提到她是 'a taxi driver'。",
      keywords: "Fiona, taxi driver",
      children: []
    },
    {
      id: "section1",
      text: "Question 1: When did you start?",
      cn: "问题 1：你是什么时候开始的？",
      emoji: "⏱️",
      children: [
        {
          id: "p1_1",
          text: "I've been a taxi driver for about five years.",
          cn: "我已经当了大约五年的出租车司机了。",
          emoji: "🖐️",
          notes: "Fiona has 5 years of experience.",
          statement: "She has been a taxi driver for 10 years.",
          answer: false,
          explanation: "文中说的是 'about five years'。",
          keywords: "five years",
          children: []
        },
        {
          id: "p1_2",
          text: "Before that I was a bus driver in London, and I enjoyed it, but I wanted to be more independent so I changed and started driving my taxi.",
          cn: "在那之前，我是伦敦的一名公交车司机。我很喜欢那份工作，但我想要更独立，所以我转行开始开出租车。",
          emoji: "🚌",
          notes: "'Independent' was the motivation for changing jobs.",
          statement: "She was a bus driver before.",
          answer: true,
          explanation: "文中提到 'Before that I was a bus driver'。",
          keywords: "bus driver, independent",
          highlight: "Before that, but, so",
          children: []
        }
      ]
    },
    {
      id: "section2",
      text: "Question 2: Have you ever had any famous passengers?",
      cn: "问题 2：你有没有载过名人的乘客？",
      emoji: "🌟",
      children: [
        {
          id: "p2_1",
          text: "Oh yes. I've had film stars, politicians, you know, lots of famous people.",
          cn: "哦，是的。我载过电影明星、政治家，你知道，很多名人。",
          emoji: "🎬",
          notes: "She meets many high-profile people in London.",
          statement: "Fiona never carries famous people.",
          answer: false,
          explanation: "文中说她载过 'lots of famous people'。",
          keywords: "famous people",
          children: []
        },
        {
          id: "p2_2",
          text: "About a year ago, a really famous actor got in my taxi.",
          cn: "大约一年前，一位非常有名的演员上了我的车。",
          emoji: "🎭",
          notes: "A specific celebrity encounter.",
          statement: "The actor entered the taxi a year ago.",
          answer: true,
          explanation: "文中提到 'About a year ago'。",
          keywords: "year ago, actor",
          children: []
        },
        {
          id: "p2_3",
          text: "I took him to the airport.",
          cn: "我送他去机场。",
          emoji: "✈️",
          notes: "He was traveling by plane.",
          statement: "They went to the train station.",
          answer: false,
          explanation: "文中说 'took him to the airport'。",
          keywords: "airport",
          children: []
        },
        {
          id: "p2_4",
          text: "There was a lot of traffic and it took a long time to get there, so he missed his plane.",
          cn: "当时交通很拥挤，花了很长时间才到，所以他错过了飞机。",
          emoji: "🚦",
          notes: "Traffic caused the delay.",
          statement: "The actor missed his flight.",
          answer: true,
          explanation: "因为堵车，他错过了飞机。",
          keywords: "traffic, missed plane",
          highlight: "so",
          children: []
        },
        {
          id: "p2_5",
          text: "It wasn't my fault but when he got out of the taxi, he said some things that weren't very polite!",
          cn: "这不是我的错，但当他下车时，他说了一些不太礼貌的话！",
          emoji: "😠",
          notes: "The actor was angry.",
          statement: "The actor was polite.",
          answer: false,
          explanation: "文中说 'weren't very polite'。",
          keywords: "not polite",
          highlight: "but when",
          children: []
        },
        {
          id: "p2_6",
          text: "I said to him, 'Next time, take a bus!'",
          cn: "我对他说：‘下次坐公交车吧！’",
          emoji: "🚌",
          notes: "Fiona's sharp retort.",
          statement: "Fiona told him to walk.",
          answer: false,
          explanation: "她建议他坐公交车。",
          keywords: "next time, bus",
          children: []
        }
      ]
    },
    {
      id: "section3",
      text: "Question 3: Have passengers ever left anything in your taxi?",
      cn: "问题 3：乘客有没有在你的车里留下过什么东西？",
      emoji: "🎒",
      children: [
        {
          id: "p3_1",
          text: "Oh yes! People have left all kinds of things in here - a suitcase, a hat, mobile phones of course, even a dog once!",
          cn: "哦，是的！人们在这里留下了各种各样的东西——手提箱、帽子，当然还有手机，甚至有一次还留下了一条狗！",
          emoji: "🐶",
          notes: "'All kinds of' implies a wide variety.",
          statement: "A dog was once left in the taxi.",
          answer: true,
          explanation: "文中提到 'even a dog once'。",
          keywords: "suitcase, dog",
          children: []
        },
        {
          id: "p3_2",
          text: "Years ago, a woman left a pair of shoes on the back seat.",
          cn: "几年前，一个女人在后座留了一双鞋。",
          emoji: "👠",
          notes: "Another unusual item.",
          statement: "The shoes were on the front seat.",
          answer: false,
          explanation: "文中说在 'back seat'。",
          keywords: "shoes, back seat",
          children: []
        },
        {
          id: "p3_3",
          text: "And one time a passenger left his teeth here! Not real teeth, of course false teeth.",
          cn: "还有一次，一名乘客把牙留在了这里！当然不是真牙，是假牙。",
          emoji: "🦷",
          notes: "Denture story.",
          statement: "The teeth were real.",
          answer: false,
          explanation: "文中强调是 'false teeth'。",
          keywords: "false teeth",
          children: []
        },
        {
          id: "p3_4",
          text: "And people have asked me to do some strange jobs.",
          cn: "人们还请我做过一些奇怪的工作。",
          emoji: "❓",
          notes: "Moving to unusual tasks.",
          statement: "The jobs were normal.",
          answer: false,
          explanation: "文中说 'strange jobs'。",
          keywords: "strange jobs",
          children: []
        },
        {
          id: "p3_5",
          text: "Once a doctor stopped me outside a hospital and asked me to take a skeleton to another hospital. And I did.",
          cn: "有一次，一位医生在一家医院外面拦住我，让我把一副骨架送到另一家医院。我照做了。",
          emoji: "💀",
          notes: "A skeleton was the passenger.",
          statement: "Fiona took a skeleton to a hospital.",
          answer: true,
          explanation: "文中提到 'take a skeleton to another hospital'。",
          keywords: "doctor, skeleton",
          children: []
        },
        {
          id: "p3_6",
          text: "But I asked the doctor to pay first - the skeleton couldn't pay, after all!",
          cn: "但我请医生先付钱——毕竟骨架没法付钱！",
          emoji: "💰",
          notes: "Fiona's practical sense of humor.",
          statement: "The doctor paid after the trip.",
          answer: false,
          explanation: "文中说她让医生 'pay first'。",
          keywords: "pay first",
          highlight: "But, after all",
          children: []
        }
      ]
    },
    {
      id: "section4",
      text: "Question 4: What's the worst part of your job?",
      cn: "问题 4：你工作中通过最糟糕的部分是什么？",
      emoji: "😫",
      children: [
        {
          id: "p4_1",
          text: "Good question. I've always enjoyed being a taxi driver and I don't want to change.",
          cn: "问得好。我一直很喜欢当出租车司机，我不想改行。",
          emoji: "😊",
          notes: "Overall job satisfaction.",
          statement: "Fiona wants to change her job.",
          answer: false,
          explanation: "文中说 'I don't want to change'。",
          keywords: "enjoyed, don't want to change",
          children: []
        },
        {
          id: "p4_2",
          text: "But of course, sometimes, it's not great.",
          cn: "但当然，有时候也没那么好。",
          emoji: "🌦️",
          notes: "Acknowledging the downsides.",
          statement: "The job is always perfect.",
          answer: false,
          explanation: "文中说 'sometimes, it's not great'。",
          keywords: "not great",
          highlight: "But, sometimes",
          children: []
        },
        {
          id: "p4_3",
          text: "I don't like driving around without a passenger, but it's better than just waiting at the airport or at a railway station.",
          cn: "我不喜欢不载客四处乱转，但总比在机场或火车站干等要好。",
          emoji: "🗺️",
          notes: "Comparing two types of downtime.",
          statement: "Fiona likes waiting at the airport.",
          answer: false,
          explanation: "文中说 'driving around... is better than just waiting'。",
          keywords: "driving around, waiting",
          highlight: "but, better than",
          children: []
        },
        {
          id: "p4_4",
          text: "I think that's the worst part - waiting.",
          cn: "我认为最糟糕的部分就是等待。",
          emoji: "⌛",
          notes: "Identifying the main negative.",
          statement: "Waiting is the worst part.",
          answer: true,
          explanation: "文中明确说 'that's the worst part - waiting'。",
          keywords: "worst part, waiting",
          children: []
        }
      ]
    }
  ]
};

const hardJourneysTree = {
  id: "root",
  text: "Hard journeys for schoolchildren",
  emoji: "🌏",
  children: [
    {
      id: "intro",
      text: "INTRODUCTION: The Reality for Many",
      emoji: "🚶",
      children: [
        {
          id: "p1_1",
          text: "'How do you get to school?'",
          cn: "“你平时怎么去上学？”",
          emoji: "❓",
          notes: "Opening question to engage the reader.",
          statement: "The article starts with a question.",
          answer: true,
          explanation: "文章开头即是问句。",
          keywords: "how, school",
          children: []
        },
        {
          id: "p1_2",
          text: "This question often gets an answer like 'By bus' or 'I walk' or 'My parents take me by car'.",
          cn: "这个问题通常得到的答案是“坐公交车”、“走路”或“我父母开车送我”。",
          emoji: "🚗",
          notes: "Typical ways children go to school.",
          statement: "Most kids answer 'by helicopter'.",
          answer: false,
          explanation: "文中列举的是 'bus', 'walk', 'car'。",
          keywords: "bus, walk, car",
          children: []
        },
        {
          id: "p1_3",
          text: "But not always - there are children in many different parts of the world who, every day, have to go on a difficult journey in order to get to their lessons.",
          cn: "但并非总是如此——在世界许多不同的地方，每天都有孩子为了上课而不得不进行一段艰难的旅程。",
          emoji: "🎒",
          notes: "Thesis statement: some journeys are hard.",
          statement: "All children have easy journeys to school.",
          answer: false,
          explanation: "文中说 'there are children... who... have to go on a difficult journey'。",
          keywords: "difficult journey, lessons",
          highlight: "But, in order to",
          children: []
        },
        {
          id: "p1_4",
          text: "They travel for kilometres on foot, or by boat, bicycle, donkey or train.",
          cn: "他们徒步走几公里，或者坐船、骑自行车、骑驴或坐火车。",
          emoji: "🐪",
          notes: "Various modes of difficult transport.",
          statement: "They travel by donkey.",
          answer: true,
          explanation: "文中列出了 'donkey'。",
          keywords: "kilometres, donkey",
          children: []
        },
        {
          id: "p1_5",
          text: "They cross deserts, mountains, rivers, snow and ice: for example, the children of the Iñupiat community in Alaska go to school and then come back when it is dark, in extremely cold temperatures.",
          cn: "他们穿过沙漠、大山、河流、冰雪：例如，阿拉斯加伊纽皮亚特社区的孩子们去上学，然后在天黑时回来，气温极低。",
          emoji: "❄️",
          notes: "Extreme environments.",
          statement: "Alaska is a warm place.",
          answer: false,
          explanation: "文中描述为 'extremely cold temperatures'。",
          keywords: "deserts, Alaska, cold",
          highlight: "for example",
          children: []
        },
        {
          id: "p1_6",
          text: "And they are not the only ones - kids in many countries do this and more.",
          cn: "他们并不是唯一的——许多国家的孩子都在这样做，甚至更多。",
          emoji: "🌍",
          notes: "This is a global issue.",
          statement: "Only kids in Alaska have hard journeys.",
          answer: false,
          explanation: "文中说 'kids in many countries do this'。",
          keywords: "many countries",
          children: []
        }
      ]
    },
    {
      id: "cases",
      text: "CASE STUDIES: Around the World",
      emoji: "📍",
      children: [
        {
          id: "indonesia_group",
          text: "INDONESIA: The Dangerous Bridge",
          emoji: "🇮🇩",
          children: [
            {
              id: "p2_1",
              text: "These children in Indonesia have to cross a bridge ten metres above a dangerous river to get to their class on time.",
              cn: "印度尼西亚的这些孩子必须穿过一座位于危险河流上方10米处的桥，才能准时去上课。",
              emoji: "🌉",
              notes: "Focus on Indonesia.",
              statement: "The bridge is 10 metres high.",
              answer: true,
              explanation: "文中说是 'ten metres'。",
              keywords: "Indonesia, bridge, on time",
              children: []
            },
            {
              id: "p2_2",
              text: "(The bridge fell down in 2001 after very heavy rain.)",
              cn: "（这座桥在2001年大雨后倒塌了。）",
              emoji: "🌧️",
              notes: "Parenthetical historical context.",
              statement: "The bridge fell down because of rain.",
              answer: true,
              explanation: "文中说是因为 'heavy rain'。",
              keywords: "fell down, 2001, rain",
              children: []
            },
            {
              id: "p2_3",
              text: "Then they walk many more kilometres through the forest to their school in Banten village.",
              cn: "然后他们还要穿过森林走很多公里才能到达万丹村的学校。",
              emoji: "🌳",
              notes: "A two-part difficult journey.",
              statement: "The school is in Banten village.",
              answer: true,
              explanation: "文中明确提到 'their school in Banten village'。",
              keywords: "forest, Banten village",
              children: []
            }
          ]
        },
        {
          id: "china_group",
          text: "CHINA: The Mountain Path",
          emoji: "🇨🇳",
          children: [
            {
              id: "p3_1",
              text: "A pupil at Gulu Village Primary School, China, rides a donkey as his grandfather walks beside him.",
              cn: "中国古鲁村小学的学生骑着驴，爷爷走在旁边。",
              emoji: "👴",
              notes: "Focus on China.",
              statement: "The student rides a donkey.",
              answer: true,
              explanation: "文中说是 'rides a donkey'。",
              keywords: "China, pupil, donkey",
              children: []
            },
            {
              id: "p3_2",
              text: "Gulu is a mountain village in a national park.",
              cn: "古鲁是一个位于国家公园内的山村。",
              emoji: "🏞️",
              notes: "Location description.",
              statement: "Gulu is a mountain village.",
              answer: true,
              explanation: "文中说是 'mountain village'。",
              keywords: "mountain, national park",
              children: []
            },
            {
              id: "p3_3",
              text: "The school is far away from the village.",
              cn: "学校离村子很远。",
              emoji: "📏",
              notes: "Distance issue.",
              statement: "The school is near the village.",
              answer: false,
              explanation: "文中说 'far away from the village'。",
              keywords: "far away",
              children: []
            },
            {
              id: "p3_4",
              text: "It is halfway up a mountain, so it takes five hours to climb from the bottom of the mountain to the school.",
              cn: "它在半山腰，所以从山脚爬到学校需要五个小时。",
              emoji: "🧗",
              notes: "Elevation and time.",
              statement: "It takes 5 hours to climb up.",
              answer: true,
              explanation: "文中提到 'it takes five hours to climb'。",
              keywords: "halfway up, five hours",
              highlight: "so",
              children: []
            },
            {
              id: "p3_5",
              text: "The children have a dangerous journey: the path is only 45 centimetres wide in some places.",
              cn: "孩子们有一段危险的旅程：有些地方的小路只有45厘米宽。",
              emoji: "⚠️",
              notes: "The specific danger: narrowness.",
              statement: "The path is 45 centimetres wide.",
              answer: true,
              explanation: "文中说是 '45 centimetres'。",
              keywords: "dangerous, 45 centimetres, wide",
              children: []
            }
          ]
        },
        {
          id: "srilanka_group",
          text: "SRI LANKA: The Castle Wall",
          emoji: "🇱🇰",
          children: [
            {
              id: "p4_1",
              text: "In Sri Lanka, some children have to cross a piece of wood between two walls of an old castle every morning.",
              cn: "在斯里兰卡，一些孩子每天早上必须穿过旧城堡两堵墙之间的一块木头。",
              emoji: "🏰",
              notes: "Focus on Sri Lanka.",
              statement: "They cross a piece of wood.",
              answer: true,
              explanation: "文中说 'cross a piece of wood'。",
              keywords: "Sri Lanka, wood, castle",
              children: []
            },
            {
              id: "p4_2",
              text: "Their teacher watches them carefully.",
              cn: "他们的老师仔细地看着他们。",
              emoji: "👀",
              notes: "Adult supervision.",
              statement: "The teacher watches them.",
              answer: true,
              explanation: "文中说 'Their teacher watches them'。",
              keywords: "teacher, carefully",
              children: []
            },
            {
              id: "p4_3",
              text: "But in Sri Lanka, many girls don't go to school - they have to go to work or get married young.",
              cn: "但在斯里兰卡，许多女孩不去上学——她们必须去工作或很早就结婚。",
              emoji: "👰",
              notes: "Social context.",
              statement: "All girls go to school in Sri Lanka.",
              answer: false,
              explanation: "文中说 'many girls don't go to school'。",
              keywords: "girls, married young",
              highlight: "But",
              children: []
            },
            {
              id: "p4_4",
              text: "So girls are happy to take a risk in order to get to school.",
              cn: "所以女孩们乐于冒险去上学。",
              emoji: "👩‍🎓",
              notes: "Value of education.",
              statement: "Girls are happy to take a risk.",
              answer: true,
              explanation: "文中说她们 'are happy to take a risk'。",
              keywords: "happy, take a risk",
              highlight: "So, in order to",
              children: []
            }
          ]
        },
        {
          id: "brazil_group",
          text: "BRAZIL: The Desert Ride",
          emoji: "🇧🇷",
          children: [
            {
              id: "p5_1",
              text: "Six-year old Fabricio Oliveira gets on his donkey every morning to ride with his friends for over an hour through a desert region in the very dry Sertão area of north-east Brazil.",
              cn: "六岁的法布里西奥·奥利维拉每天早上骑上驴，和朋友们一起在巴西东北部非常干燥的塞尔唐地区的沙漠地带骑行一个多小时。",
              emoji: "🏜️",
              notes: "Focus on Brazil.",
              statement: "Fabricio is 6 years old.",
              answer: true,
              explanation: "文中说他是 'Six-year old'。",
              keywords: "Fabricio, Brazil, desert",
              children: []
            },
            {
              id: "p5_2",
              text: "Their school is in Extrema.",
              cn: "他们的学校在埃克斯特雷马。",
              emoji: "🏫",
              notes: "School name/location.",
              statement: "The school is in Extrema.",
              answer: true,
              explanation: "文中说 'Their school is in Extrema'。",
              keywords: "Extrema",
              children: []
            },
            {
              id: "p5_3",
              text: "It's a tiny village - only very few people live there.",
              cn: "那是一个极小的村庄——只有极少数人住在那里。",
              emoji: "🏘️",
              notes: "'Tiny' means extremely small.",
              statement: "Extrema is a tiny village.",
              answer: true,
              explanation: "文中描述为 'tiny village'。",
              keywords: "tiny village",
              children: []
            }
          ]
        },
        {
          id: "india_group",
          text: "INDIA: The Railway Tracks",
          emoji: "🇮🇳",
          children: [
            {
              id: "p6_1",
              text: "These children live in poor houses on Chetla Road in Delhi, India.",
              cn: "这些孩子住在印度德里切特拉路的简陋房屋里。",
              emoji: "🏠",
              notes: "Focus on India.",
              statement: "They live in Delhi.",
              answer: true,
              explanation: "文中说 'in Delhi, India'。",
              keywords: "Delhi, India",
              children: []
            },
            {
              id: "p6_2",
              text: "Their homes are near the busy and dangerous railway lines that go to Alipur station.",
              cn: "他们的家就在通往阿里普尔车站的繁忙且危险的铁路线附近。",
              emoji: "🚂",
              notes: "The urban danger.",
              statement: "They live near a station.",
              answer: true,
              explanation: "文中提到 'Alipur station'。",
              keywords: "dangerous, railway, station",
              children: []
            },
            {
              id: "p6_3",
              text: "Every morning they walk along the tracks to get to their school, forty minutes away.",
              cn: "每天早上，他们沿着轨道走40分钟去上学。",
              emoji: "🕘",
              notes: "Route and duration.",
              statement: "They walk along the tracks.",
              answer: true,
              explanation: "文中说 'walk along the tracks'。",
              keywords: "tracks, forty minutes",
              children: []
            }
          ]
        }
      ]
    },
    {
      id: "conclusion_group",
      text: "CONCLUSION: A Better Future",
      emoji: "🌈",
      children: [
        {
          id: "p7_1",
          text: "So one question we can ask is: why do the children do this?",
          cn: "所以我们可以问一个问题：孩子们为什么要这样做？",
          emoji: "🤔",
          notes: "Rhetorical transition.",
          statement: "The author asks 'why'.",
          answer: true,
          explanation: "文中直接提出了这个问题。",
          keywords: "why",
          highlight: "So",
          children: []
        },
        {
          id: "p7_2",
          text: "Because their parents make them do it?",
          cn: "是因为他们的父母强迫他们这样做吗？",
          emoji: "🙎‍♂️",
          notes: "Considering a common assumption.",
          statement: "The parents make them do it.",
          answer: false,
          explanation: "文中说 'The answer... is no'。",
          keywords: "parents",
          highlight: "Because",
          children: []
        },
        {
          id: "p7_3",
          text: "The answer, in many cases, is no - it's because for them going to school means a better future.",
          cn: "在许多情况下，答案是否定的——这是因为对他们来说，上学意味着更美好的未来。",
          emoji: "💎",
          notes: "The true motivation.",
          statement: "School means a better future.",
          answer: true,
          explanation: "文中明确说 'going to school means a better future'。",
          keywords: "better future",
          highlight: "it's because",
          children: []
        },
        {
          id: "p7_4",
          text: "They hope to get a job and money, so they can help their families and their neighbours.",
          cn: "他们希望得到工作和金钱，这样他们就能帮助自己的家庭和邻居。",
          emoji: "🏠",
          notes: "Goals of education.",
          statement: "They want to help their neighbours.",
          answer: true,
          explanation: "文中说 'help their families and their neighbours'。",
          keywords: "job, money, neighbours",
          highlight: "so",
          children: []
        },
        {
          id: "p7_5",
          text: "And this is why rivers, deserts or danger won't stop them on their way to school.",
          cn: "这就是为什么河流、沙漠或危险都无法阻止他们去上学的脚步。",
          emoji: "🏃",
          notes: "Concluding thought on resilience.",
          statement: "Nothing stops them.",
          answer: true,
          explanation: "文中说 'won't stop them'。",
          keywords: "won't stop, way to school",
          highlight: "And this is why",
          children: []
        }
      ]
    }
  ]
};

const result1 = {
  level: "Think 1 Unit 12",
  part: "Pages 114-119",
  section: "The Taxi Driver",
  tree: taxiDriverTree
};

const result2 = {
  level: "Think 1 Unit 12",
  part: "Pages 114-119",
  section: "Hard Journeys",
  tree: hardJourneysTree
};

fs.writeFileSync('data/B-Think1/b-think1-u12/b-think1-u12-p114-p119/b-think1-u12-p114-p119-text-navigator-the-taxi-driver.json', JSON.stringify(result1, null, 2));
fs.writeFileSync('data/B-Think1/b-think1-u12/b-think1-u12-p114-p119/b-think1-u12-p114-p119-text-navigator-hard-journeys.json', JSON.stringify(result2, null, 2));

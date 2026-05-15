const fs = require('fs');

const model1Tree = {
  id: "root",
  text: "Someone I admire: My Uncle Tim",
  emoji: "👨‍⚕️",
  children: [
    {
      id: "facts",
      text: "FACTS: Background and Life",
      emoji: "📅",
      children: [
        {
          id: "f1",
          text: "My uncle Tim is a great guy.",
          cn: "我的蒂姆叔叔是个很棒的人。",
          emoji: "👍",
          children: []
        },
        {
          id: "f2",
          text: "He was born in Halifax, England, in 1980.",
          cn: "他1980年出生在英格兰的哈利法克斯。",
          emoji: "🇬🇧",
          children: []
        },
        {
          id: "f3",
          text: "Now he lives and works in Cambodia.",
          cn: "现在他在柬埔寨生活和工作。",
          emoji: "🇰🇭",
          children: []
        }
      ]
    },
    {
      id: "work",
      text: "WORK: Helping in Villages",
      emoji: "🏥",
      children: [
        {
          id: "w1",
          text: "He is a doctor.",
          cn: "他是一名医生。",
          emoji: "🩺",
          children: []
        },
        {
          id: "w2",
          text: "He worked in Manchester for a few years.",
          cn: "他在曼彻斯特工作了几年。",
          emoji: "🏢",
          children: []
        },
        {
          id: "w3",
          text: "In 2014, he went to Cambodia to help people in small villages.",
          cn: "2014年，他去柬埔寨帮助小村庄的人们。",
          emoji: "🤝",
          children: []
        },
        {
          id: "w4",
          text: "He uses a motorbike or a small plane to travel.",
          cn: "他使用摩托车或小飞机旅行。",
          emoji: "🏍️",
          children: []
        }
      ]
    },
    {
      id: "future",
      text: "FUTURE: Plans and Hopes",
      emoji: "🚀",
      children: [
        {
          id: "fu1",
          text: "He wants to stay in Cambodia because there is a lot of work.",
          cn: "他想留在柬埔寨，因为那里有很多工作。",
          emoji: "📍",
          children: []
        },
        {
          id: "fu2",
          text: "He hopes to teach people to become doctors.",
          cn: "他希望教人们成为医生。",
          emoji: "👨‍🏫",
          children: []
        },
        {
          id: "fu3",
          text: "He is also getting married next year.",
          cn: "他明年也要结婚了。",
          emoji: "💍",
          children: []
        }
      ]
    },
    {
      id: "why",
      text: "WHY: Admiration and Culture",
      emoji: "🌟",
      children: [
        {
          id: "why1",
          text: "I admire him because he helps other people.",
          cn: "我崇拜他，因为他帮助别人。",
          emoji: "❤️",
          children: []
        },
        {
          id: "why2",
          text: "He is happy to learn about another culture.",
          cn: "他很高兴了解另一种文化。",
          emoji: "🌍",
          children: []
        }
      ]
    }
  ]
};

const model2Tree = {
  id: "root",
  text: "Someone I admire: My Uncle Tim",
  emoji: "🖋️",
  children: [
    {
      id: "facts",
      text: "FACTS: Background and Life",
      emoji: "📅",
      children: [
        {
          id: "f1",
          text: "My uncle Tim is a really great guy.",
          cn: "我的蒂姆叔叔真的是个很棒的人。",
          emoji: "👍",
          notes: "'Great guy' is a friendly way to describe a man.",
          keywords: "great guy",
          children: []
        },
        {
          id: "f2",
          text: "He was born in England in 1980, in a city called Halifax, but now he lives and works in Cambodia.",
          cn: "他1980年出生在英格兰一个叫哈利法克斯的城市，但现在他在柬埔寨生活和工作。",
          emoji: "🇬🇧",
          notes: "Halifax is known for its historic Piece Hall.",
          keywords: "born, England, Halifax, Cambodia",
          highlight: "but, now",
          children: []
        },
        {
          id: "f3",
          text: "He went to Cambodia in 2014.",
          cn: "他2014年去了柬埔寨。",
          emoji: "🇰🇭",
          notes: "The journey started over a decade ago.",
          keywords: "2014",
          children: []
        }
      ]
    },
    {
      id: "work",
      text: "WORK: Medical Mission",
      emoji: "🏥",
      children: [
        {
          id: "w1",
          text: "My uncle is a doctor and he worked at a hospital in Manchester for a few years.",
          cn: "我的叔叔是一名医生，他在曼彻斯特的一家医院工作了几年。",
          emoji: "👨‍⚕️",
          notes: "Manchester is a major city in Northwest England.",
          keywords: "doctor, hospital, Manchester",
          children: []
        },
        {
          id: "w2",
          text: "But in 2014 he decided to go and work in small villages in Cambodia because he heard that they needed doctors.",
          cn: "但在2014年，他决定去柬埔寨的小村庄工作，因为他听说那里需要医生。",
          emoji: "🏘️",
          notes: "'Decided to' shows a conscious choice.",
          keywords: "decided, small villages, needed doctors",
          highlight: "But, because",
          children: []
        },
        {
          id: "w3",
          text: "He travels from village to village to help people.",
          cn: "他从一个村庄走到另一个村庄去帮助人们。",
          emoji: "🤝",
          notes: "'From village to village' implies a widespread effort.",
          keywords: "travels, village to village",
          children: []
        },
        {
          id: "w4",
          text: "He has a small motorbike that he uses.",
          cn: "他有一辆他使用的小型摩托车。",
          emoji: "🏍️",
          notes: "A practical way to navigate rural roads.",
          keywords: "motorbike",
          children: []
        },
        {
          id: "w5",
          text: "Sometimes, though, he goes in a very small plane because the roads aren't good enough.",
          cn: "不过，有时他会坐一架非常小的飞机，因为那里的路不够好。",
          emoji: "🛩️",
          notes: "'Good enough' means sufficient for the purpose.",
          keywords: "small plane, roads",
          highlight: "Sometimes, though, because",
          children: []
        }
      ]
    },
    {
      id: "future",
      text: "FUTURE: Commitment and Community",
      emoji: "🚀",
      children: [
        {
          id: "fu1",
          text: "Uncle Tim says that he wants to stay there because there is a lot of work to do.",
          cn: "蒂姆叔叔说他想留在那里，因为有很多工作要做。",
          emoji: "📍",
          notes: "'A lot of' is a synonym for many/much.",
          keywords: "stay, lot of work",
          highlight: "because",
          children: []
        },
        {
          id: "fu2",
          text: "He has also met a girl there - he told me in an email that they are getting married in July next year.",
          cn: "他还在那里遇到了一个女孩——他在一封电子邮件中告诉我，他们明年7月要结婚了。",
          emoji: "💍",
          notes: "'Getting married' is the process of having a wedding.",
          keywords: "met a girl, getting married, July",
          highlight: "also, that",
          children: []
        },
        {
          id: "fu3",
          text: "Uncle Tim hopes that he can help to teach Cambodian people to become doctors in the future.",
          cn: "蒂姆叔叔希望将来能帮助教柬埔寨人成为医生。",
          emoji: "👨‍🏫",
          notes: "'Hopes that' expresses a future desire.",
          keywords: "teach, become doctors",
          highlight: "that, in the future",
          children: []
        },
        {
          id: "fu4",
          text: "He has learned a lot of the language - that can't be easy!",
          cn: "他学了很多语言——那一定不容易！",
          emoji: "🗣️",
          notes: "'That can't be easy' is a common reaction to a difficult task.",
          keywords: "learned, language",
          children: []
        }
      ]
    },
    {
      id: "why",
      text: "WHY: Personal Inspiration",
      emoji: "🌟",
      children: [
        {
          id: "why1",
          text: "I said before that he's a great guy. Why do I think that?",
          cn: "我之前说过他是个很棒的人。为什么我这么想？",
          emoji: "❓",
          notes: "Rhetorical question to introduce the conclusion.",
          keywords: "great guy",
          highlight: "Why",
          children: []
        },
        {
          id: "why2",
          text: "Well, because he is helping other people and is happy doing that, and because he has learned a lot about another culture.",
          cn: "嗯，因为他在帮助别人，并且很高兴这样做，还因为他学到了很多关于另一种文化的知识。",
          emoji: "🌍",
          notes: "'Culture' involves shared values and customs.",
          keywords: "helping, happy, culture",
          highlight: "Well, because, and because",
          children: []
        }
      ]
    }
  ]
};

const result1 = {
  level: "Think 1 Unit 12",
  part: "Pages 114-119",
  section: "Model Essay 1",
  tree: model1Tree
};

const result2 = {
  level: "Think 1 Unit 12",
  part: "Pages 114-119",
  section: "Model Essay 2",
  tree: model2Tree
};

fs.writeFileSync('data/B-Think1/b-think1-u12/b-think1-u12-p114-p119/b-think1-u12-p114-p119-writing-map-model-1.json', JSON.stringify(result1, null, 2));
fs.writeFileSync('data/B-Think1/b-think1-u12/b-think1-u12-p114-p119/b-think1-u12-p114-p119-writing-map-model-2.json', JSON.stringify(result2, null, 2));

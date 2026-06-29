import json
import os
import random

# Define paths
target_dir = "/home/timathon/codes/smartedu/english-practices/data/A4A/a4a-u1"
vocab_guide_path = os.path.join(target_dir, "a4a-u1-vocab-guide.json")
vocab_master_path = os.path.join(target_dir, "a4a-u1-vocab-master.json")
spelling_hero_path = os.path.join(target_dir, "a4a-u1-spelling-hero.json")
sentence_architect_path = os.path.join(target_dir, "a4a-u1-sentence-architect.json")
recall_map_path = os.path.join(target_dir, "a4a-u1-recall-map.json")
text_navigator_path = os.path.join(target_dir, "a4a-u1-text-navigator.json")
grammar_wizard_path = os.path.join(target_dir, "a4a-u1-grammar-wizard.json")
passage_decoder_path = os.path.join(target_dir, "a4a-u1-passage-decoder-s.json")

# Ensure target directory exists
os.makedirs(target_dir, exist_ok=True)

# ----------------- 1. Vocab Guide Data -----------------
vocab_guide_data = {
  "level": "Grade 4 Semester 1 - Unit 1",
  "source_file": "a4a-u1.md",
  "unit_vocabulary": [
    {
      "word": "sport",
      "ipa": "/spɔːt/",
      "meaning": "体育运动",
      "syllable_type": "r控制音节 (R-Controlled)",
      "comparison": "sport vs port",
      "page_number": "2",
      "context_sentence": "Do a class survey about sports.",
      "memorization_hook": "sp(视频)+ort(类似art艺术)：体育运动(sport)是一种可以在视频里播放的艺术。"
    },
    {
      "word": "jump",
      "ipa": "/dʒʌmp/",
      "meaning": "跳",
      "syllable_type": "闭音节 (Closed)",
      "comparison": "jump vs pump",
      "page_number": "3",
      "context_sentence": "Can you jump high, Daming?",
      "memorization_hook": "j(家)+ump(阿姨)：阿姨回“家”时，高兴得“跳”(jump)了起来。"
    },
    {
      "word": "high",
      "ipa": "/haɪ/",
      "meaning": "高高地",
      "syllable_type": "元音字母组合音节 (Vowel Team)",
      "comparison": "high vs sigh",
      "page_number": "3",
      "context_sentence": "Can you jump high, Daming?",
      "memorization_hook": "h(像梯子)+igh(元音组合)：顺着高高的梯子(h)往上爬，越爬越高(high)。"
    },
    {
      "word": "far",
      "ipa": "/fɑː/",
      "meaning": "远",
      "syllable_type": "r控制音节 (R-Controlled)",
      "comparison": "far vs car",
      "page_number": "7",
      "context_sentence": "I can't jump very far.",
      "memorization_hook": "f(飞)+ar(阿姨)：阿姨“飞”(f)到了很远(far)的地方。"
    },
    {
      "word": "ping-pong",
      "ipa": "/ˈpɪŋ pɒŋ/",
      "meaning": "乒乓球运动",
      "syllable_type": "ping-pong",
      "comparison": "ping-pong vs king-kong",
      "page_number": "3",
      "context_sentence": "Can you play ping-pong?",
      "memorization_hook": "拟声词：ping和pong就是乒乓球击打桌面时发出的“乒”和“乓”的声音。"
    },
    {
      "word": "volleyball",
      "ipa": "/ˈvɒlibɔːl/",
      "meaning": "排球(运动)",
      "syllable_type": "vol-ley-ball",
      "comparison": "volleyball vs basketball",
      "page_number": "11",
      "context_sentence": "Can she play volleyball?",
      "memorization_hook": "volley(齐击，截击)+ball(球)：排球运动需要球员在空中拦截拍击(volley)球(ball)。"
    },
    {
      "word": "across",
      "ipa": "/əˈkrɒs/",
      "meaning": "从一边到另一边; 穿过, 越过",
      "syllable_type": "a-cross",
      "comparison": "across vs cross",
      "page_number": "5",
      "context_sentence": "I can run across Canada.",
      "memorization_hook": "a(一)+cross(十字路口)：穿过(across)一个十字路口。"
    },
    {
      "word": "hope",
      "ipa": "/həʊp/",
      "meaning": "希望",
      "syllable_type": "相对开音节 (VCe)",
      "comparison": "hope vs home",
      "page_number": "5",
      "context_sentence": "Run for Hope.",
      "memorization_hook": "ho(猴)+pe(跑)：猴子向前跑，看到了活下去的希望(hope)。"
    },
    {
      "word": "lose",
      "ipa": "/luːz/",
      "meaning": "失去",
      "syllable_type": "相对开音节 (VCe)",
      "comparison": "lose vs close",
      "page_number": "5",
      "context_sentence": "But I lose one leg because of cancer.",
      "memorization_hook": "lo(一零)+se(蛇)：抓到了一零只蛇，结果又不小心失去(lose)了。"
    },
    {
      "word": "because",
      "ipa": "/bɪˈkɒz/",
      "meaning": "因为",
      "syllable_type": "be-cause",
      "comparison": "because vs become",
      "page_number": "5",
      "context_sentence": "But I lose one leg because of cancer.",
      "memorization_hook": "be(是)+cause(原因)：因为(because)这就是原因(cause)。"
    },
    {
      "word": "because of sb/sth",
      "ipa": "none",
      "meaning": "因为某人/某事物",
      "syllable_type": "phrase",
      "comparison": "none",
      "page_number": "5",
      "context_sentence": "But I lose one leg because of cancer.",
      "memorization_hook": "because(因为)后面加of，可以接具体的人(sb)或事物(sth)。"
    },
    {
      "word": "cancer",
      "ipa": "/ˈkænsə/",
      "meaning": "癌(症)",
      "syllable_type": "can-cer",
      "comparison": "cancer vs dancer",
      "page_number": "5",
      "context_sentence": "But I lose one leg because of cancer.",
      "memorization_hook": "can(能够)+cer(策)：能够用策略去战胜癌症(cancer)。"
    },
    {
      "word": "money",
      "ipa": "/ˈmʌni/",
      "meaning": "钱",
      "syllable_type": "mon-ey",
      "comparison": "money vs monkey",
      "page_number": "5",
      "context_sentence": "And I can get money for people!",
      "memorization_hook": "mon(魔)+ey(眼睛)：金钱(money)就像魔法眼睛一样吸引人。"
    },
    {
      "word": "hard",
      "ipa": "/hɑːd/",
      "meaning": "困难的",
      "syllable_type": "r控制音节 (R-Controlled)",
      "comparison": "hard vs card",
      "page_number": "5",
      "context_sentence": "It's hard for me.",
      "memorization_hook": "har(哈)+d(弟)：哈！弟弟遇到了一个很困难(hard)的难题。"
    },
    {
      "word": "kind",
      "ipa": "/kaɪnd/",
      "meaning": "亲切的; 友好的; 善良的",
      "syllable_type": "闭音节 (Closed)",
      "comparison": "kind vs mind",
      "page_number": "5",
      "context_sentence": "Many kind people help me.",
      "memorization_hook": "k(开)+ind(印第安人)：热情的印第安人很善良(kind)。"
    },
    {
      "word": "keep",
      "ipa": "/kiːp/",
      "meaning": "持续; 继续",
      "syllable_type": "元音字母组合音节 (Vowel Team)",
      "comparison": "keep vs weep",
      "page_number": "6",
      "context_sentence": "I keep running for five months.",
      "memorization_hook": "ke(客)+ep(音频)：客人在继续(keep)播放音频。"
    },
    {
      "word": "month",
      "ipa": "/mʌnθ/",
      "meaning": "一个月",
      "syllable_type": "闭音节 (Closed)",
      "comparison": "month vs mouth",
      "page_number": "6",
      "context_sentence": "I keep running for five months.",
      "memorization_hook": "mon(星期一)+th(天)：一个月(month)里有很多个星期一。"
    },
    {
      "word": "ill",
      "ipa": "/ɪl/",
      "meaning": "生病的",
      "syllable_type": "闭音节 (Closed)",
      "comparison": "ill vs hill",
      "page_number": "6",
      "context_sentence": "But I'm very ill. I can't run anymore.",
      "memorization_hook": "生病(ill)时，躺在床上像一根面条(i)和两根筷子(ll)。"
    },
    {
      "word": "year",
      "ipa": "/jɪə/",
      "meaning": "年; 年度",
      "syllable_type": "元音字母组合音节 (Vowel Team)",
      "comparison": "year vs ear",
      "page_number": "6",
      "context_sentence": "Now many people do the Terry Fox Run every year.",
      "memorization_hook": "y(像树丫)+ear(耳朵)：大树长了一年(year)，树丫像耳朵一样多。"
    },
    {
      "word": "remember",
      "ipa": "/rɪˈmembə/",
      "meaning": "纪念; 记住",
      "syllable_type": "re-mem-ber",
      "comparison": "remember vs member",
      "page_number": "6",
      "context_sentence": "Let's remember Terry with a run.",
      "memorization_hook": "re(反复)+member(成员)：我们要记住并纪念(remember)团队中的每一个成员。"
    },
    {
      "word": "fail",
      "ipa": "/feɪl/",
      "meaning": "失败",
      "syllable_type": "元音字母组合音节 (Vowel Team)",
      "comparison": "fail vs sail",
      "page_number": "7",
      "context_sentence": "It's OK to fail.",
      "memorization_hook": "fa(发)+il(生病)：考试失败(fail)了，急得都快要生病了。"
    },
    {
      "word": "give",
      "ipa": "/ɡɪv/",
      "meaning": "给予",
      "syllable_type": "相对开音节 (VCe)",
      "comparison": "give vs live",
      "page_number": "7",
      "context_sentence": "Don't give up!",
      "memorization_hook": "gi(给)+ve(我们)：给予(give)我们力量。"
    },
    {
      "word": "give up",
      "ipa": "none",
      "meaning": "放弃",
      "syllable_type": "phrase",
      "comparison": "none",
      "page_number": "7",
      "context_sentence": "Don't give up! Never stop!",
      "memorization_hook": "give(给予)+up(向上)：把努力向上交出去了，就是放弃(give up)。"
    },
    {
      "word": "never",
      "ipa": "/ˈnevə/",
      "meaning": "决不, 永不",
      "syllable_type": "nev-er",
      "comparison": "never vs fever",
      "page_number": "7",
      "context_sentence": "Don't give up! Never stop!",
      "memorization_hook": "ne(不)+ver(版本)：这个软件决不(never)会有第二个版本。"
    },
    {
      "word": "try",
      "ipa": "/traɪ/",
      "meaning": "努力; 尝试",
      "syllable_type": "开音节 (Open)",
      "comparison": "try vs dry",
      "page_number": "7",
      "context_sentence": "Work hard and try your best!",
      "memorization_hook": "t(他)+ry(人)：尝试(try)去帮助他人。"
    },
    {
      "word": "try your best",
      "ipa": "none",
      "meaning": "尽最大努力",
      "syllable_type": "phrase",
      "comparison": "none",
      "page_number": "7",
      "context_sentence": "Work hard and try your best!",
      "memorization_hook": "try(尝试)+your best(你的最好)：尽你最大的努力去尝试。"
    },
    {
      "word": "star",
      "ipa": "/stɑː/",
      "meaning": "明星, 最出色者",
      "syllable_type": "r控制音节 (R-Controlled)",
      "comparison": "star vs scar",
      "page_number": "8",
      "context_sentence": "Sports stars",
      "memorization_hook": "st(石头)+ar(阿姨)：阿姨站在石头上，像一位闪耀的明星(star)。"
    },
    {
      "word": "ability",
      "ipa": "/əˈbɪləti/",
      "meaning": "才能; 能力",
      "syllable_type": "a-bil-i-ty",
      "comparison": "ability vs activity",
      "page_number": "8",
      "context_sentence": "Find good sports players in your school. Talk about their abilities.",
      "memorization_hook": "abil(能干)+ity(名词后缀)：拥有展现才能的能力(ability)。"
    },
    {
      "word": "player",
      "ipa": "/ˈpleɪə/",
      "meaning": "运动员, 选手, 球员",
      "syllable_type": "play-er",
      "comparison": "player vs prayer",
      "page_number": "8",
      "context_sentence": "Find good sports players in your school.",
      "memorization_hook": "play(玩，比赛)+er(人)：参加比赛的人就是运动员(player)."
    },
    {
      "word": "fast",
      "ipa": "/fɑːst/",
      "meaning": "快地; 快速的",
      "syllable_type": "闭音节 (Closed)",
      "comparison": "fast vs last",
      "page_number": "3",
      "context_sentence": "Can you run fast?",
      "memorization_hook": "f(飞)+as(如)+t(天)：飞得像天一样快(fast)。"
    },
    {
      "word": "swim",
      "ipa": "/swɪm/",
      "meaning": "游泳",
      "syllable_type": "闭音节 (Closed)",
      "comparison": "swim vs slim",
      "page_number": "3",
      "context_sentence": "Can you swim?",
      "memorization_hook": "sw(水)+im(我是)：我在水里，就是在游泳(swim)。"
    },
    {
      "word": "well",
      "ipa": "/wel/",
      "meaning": "好地",
      "syllable_type": "闭音节 (Closed)",
      "comparison": "well vs bell",
      "page_number": "4",
      "context_sentence": "Can Amy play ping-pong well?",
      "memorization_hook": "w(我们)+ell(发音类似“艾尔”)：我们都觉得艾尔表现得很好(well)。"
    },
    {
      "word": "come on",
      "ipa": "none",
      "meaning": "加油",
      "syllable_type": "phrase",
      "comparison": "none",
      "page_number": "5",
      "context_sentence": "Come on, Terry! You can do it!",
      "memorization_hook": "come(来)+on(在...上)：快跟上来，加油(come on)！"
    },
    {
      "word": "do it",
      "ipa": "none",
      "meaning": "做到; 办到",
      "syllable_type": "phrase",
      "comparison": "none",
      "page_number": "5",
      "context_sentence": "Come on, Terry! You can do it!",
      "memorization_hook": "do(做)+it(它)：做这件事，就是做得到、办得到(do it)。"
    },
    {
      "word": "run fast",
      "ipa": "none",
      "meaning": "跑得快",
      "syllable_type": "phrase",
      "comparison": "none",
      "page_number": "3",
      "context_sentence": "Can you run fast?",
      "memorization_hook": "run(跑)+fast(快)：跑得很快。"
    },
    {
      "word": "jump high",
      "ipa": "none",
      "meaning": "跳得高",
      "syllable_type": "phrase",
      "comparison": "none",
      "page_number": "3",
      "context_sentence": "Can you jump high, Daming?",
      "memorization_hook": "jump(跳)+high(高)：向上跳得很高。"
    },
    {
      "word": "play ping-pong",
      "ipa": "none",
      "meaning": "打乒乓球",
      "syllable_type": "phrase",
      "comparison": "none",
      "page_number": "3",
      "context_sentence": "Can you play ping-pong?",
      "memorization_hook": "play(玩，进行运动)+ping-pong(乒乓球)：打乒乓球。"
    },
    {
      "word": "jump far",
      "ipa": "none",
      "meaning": "跳得远",
      "syllable_type": "phrase",
      "comparison": "none",
      "page_number": "11",
      "context_sentence": "Can she jump far?",
      "memorization_hook": "jump(跳)+far(远)：往前跳得很远。"
    },
    {
      "word": "sports star",
      "ipa": "none",
      "meaning": "体育明星",
      "syllable_type": "phrase",
      "comparison": "none",
      "page_number": "12",
      "context_sentence": "Find out about an animal sports star.",
      "memorization_hook": "sports(运动)+star(明星)：运动界里的耀眼明星。"
    }
  ]
}

# Write Vocab Guide
with open(vocab_guide_path, "w", encoding="utf-8") as f:
    json.dump(vocab_guide_data, f, ensure_ascii=False, indent=2)

print("Vocab Guide Written.")

# Helper to generate unique 8-character alphanumeric ids
def gen_id():
    chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    return "".join(random.choice(chars) for _ in range(8))

# ----------------- 2. Vocab Master Generator -----------------
# Let's define the 50 questions
questions_pool = [
  # Challenge 1: Action & Ability
  {
    "word": "jump", "meaning": "跳", "context_sentence": "Can you jump high, Daming?", "cn": "你能跳得高吗，大明？", "hint": "与pump(泵)字形相似，首字母是j。",
    "type": "Cloze", "prompt": "Can you ____ high, Daming? (提示: 跳)", "options": ["run", "swim", "fly", "jump", "climb", "walk"]
  },
  {
    "word": "jump", "meaning": "跳", "context_sentence": "Can you jump high, Daming?", "cn": "你能跳得高吗，大明？", "hint": "与pump(泵)字形相似，首字母是j。",
    "type": "Cn2En", "prompt": "“跳”", "options": ["run", "swim", "jump", "climb", "walk", "hop"]
  },
  {
    "word": "jump", "meaning": "跳", "context_sentence": "Can you jump high, Daming?", "cn": "你能跳得高吗，大明？", "hint": "与pump(泵)字形相似，首字母是j。",
    "type": "En2Cn", "prompt": "jump", "options": ["奔跑", "游泳", "跳", "攀爬", "行走", "飞翔"]
  },
  {
    "word": "swim", "meaning": "游泳", "context_sentence": "Can you swim?", "cn": "你会游泳吗？", "hint": "sw(水)+im(我是)：我在水里，就是在游泳。",
    "type": "Cloze", "prompt": "Can you ____? (提示: 游泳)", "options": ["swim", "run", "jump", "sing", "dance", "read"]
  },
  {
    "word": "swim", "meaning": "游泳", "context_sentence": "Can you swim?", "cn": "你会游泳吗？", "hint": "sw(水)+im(我是)：我在水里，就是在游泳。",
    "type": "Cn2En", "prompt": "“游泳”", "options": ["swim", "swing", "sweep", "sweet", "swan", "swell"]
  },
  {
    "word": "swim", "meaning": "游泳", "context_sentence": "Can you swim?", "cn": "你会游泳吗？", "hint": "sw(水)+im(我是)：我在水里，就是在游泳。",
    "type": "En2Cn", "prompt": "swim", "options": ["游泳", "荡秋千", "打扫", "甜的", "天鹅", "膨胀"]
  },
  {
    "word": "run fast", "meaning": "跑得快", "context_sentence": "Can you run fast?", "cn": "你能跑得快吗？", "hint": "run(跑)+fast(快)：表示跑步速度极快。",
    "type": "Cloze", "prompt": "Can you ____? (提示: 跑得快)", "options": ["run fast", "jump high", "jump far", "play ping-pong", "swim fast", "play football"]
  },
  {
    "word": "run fast", "meaning": "跑得快", "context_sentence": "Can you run fast?", "cn": "你能跑得快吗？", "hint": "run(跑)+fast(快)：表示跑步速度极快。",
    "type": "Cn2En", "prompt": "“跑得快”", "options": ["run fast", "run slowly", "jump high", "jump far", "swim fast", "play football"]
  },
  {
    "word": "run fast", "meaning": "跑得快", "context_sentence": "Can you run fast?", "cn": "你能跑得快吗？", "hint": "run(跑)+fast(快)：表示跑步速度极快。",
    "type": "En2Cn", "prompt": "run fast", "options": ["跑得快", "跑得慢", "跳得高", "跳得远", "游得快", "踢足球"]
  },
  {
    "word": "jump high", "meaning": "跳得高", "context_sentence": "Can you jump high, Daming?", "cn": "你能跳得高吗，大明？", "hint": "jump(跳)+high(高)：向上跳跃的动作。",
    "type": "Cloze", "prompt": "Can you ____, Daming? (提示: 跳得高)", "options": ["jump high", "jump far", "run fast", "play football", "play ping-pong", "swim fast"]
  },
  
  # Challenge 2: Hope & Effort
  {
    "word": "hope", "meaning": "希望", "context_sentence": "Run for Hope.", "cn": "为希望而跑。", "hint": "ho(猴)+pe(跑)：猴子向前跑，看到了活下去的希望。",
    "type": "Cloze", "prompt": "Run for ____. (提示: 希望)", "options": ["hope", "home", "hole", "help", "here", "hopeful"]
  },
  {
    "word": "hope", "meaning": "希望", "context_sentence": "Run for Hope.", "cn": "为希望而跑。", "hint": "ho(猴)+pe(跑)：猴子向前跑，看到了活下去的希望。",
    "type": "Cn2En", "prompt": "“希望”", "options": ["hope", "help", "home", "hear", "keep", "lose"]
  },
  {
    "word": "hope", "meaning": "希望", "context_sentence": "Run for Hope.", "cn": "为希望而跑。", "hint": "ho(猴)+pe(跑)：猴子向前跑，看到了活下去的希望。",
    "type": "En2Cn", "prompt": "hope", "options": ["希望", "帮助", "家", "听见", "保持", "失去"]
  },
  {
    "word": "lose", "meaning": "失去", "context_sentence": "But I lose one leg because of cancer.", "cn": "但我因为癌症失去了一条腿。", "hint": "lo(一零)+se(蛇)：抓到了一零只蛇，结果又不小心失去了。",
    "type": "Cloze", "prompt": "But I ____ one leg because of cancer. (提示: 失去)", "options": ["lose", "lost", "loose", "find", "keep", "save"]
  },
  {
    "word": "lose", "meaning": "失去", "context_sentence": "But I lose one leg because of cancer.", "cn": "但我因为癌症失去了一条腿。", "hint": "lo(一零)+se(蛇)：抓到了一零只蛇，结果又不小心失去了。",
    "type": "Cn2En", "prompt": "“失去”", "options": ["lose", "loose", "lost", "find", "keep", "get"]
  },
  {
    "word": "lose", "meaning": "失去", "context_sentence": "But I lose one leg because of cancer.", "cn": "但我因为癌症失去了一条腿。", "hint": "lo(一零)+se(蛇)：抓到了一零只蛇，结果又不小心失去了。",
    "type": "En2Cn", "prompt": "lose", "options": ["失去", "宽松的", "寻找", "保持", "得到", "失败"]
  },
  {
    "word": "fail", "meaning": "失败", "context_sentence": "It's OK to fail.", "cn": "失败也没关系。", "hint": "fa(发)+il(生病)：考试失败了，急得都快要生病了。",
    "type": "Cloze", "prompt": "It's OK to ____. (提示: 失败)", "options": ["fail", "win", "feel", "fall", "fill", "find"]
  },
  {
    "word": "fail", "meaning": "失败", "context_sentence": "It's OK to fail.", "cn": "失败也没关系。", "hint": "fa(发)+il(生病)：考试失败了，急得都快要生病了。",
    "type": "Cn2En", "prompt": "“失败”", "options": ["fail", "fall", "feel", "fill", "file", "fly"]
  },
  {
    "word": "fail", "meaning": "失败", "context_sentence": "It's OK to fail.", "cn": "失败也没关系。", "hint": "fa(发)+il(生病)：考试失败了，急得都快要生病了。",
    "type": "En2Cn", "prompt": "fail", "options": ["失败", "落下", "感觉", "充满", "文件夹", "飞翔"]
  },
  {
    "word": "give up", "meaning": "放弃", "context_sentence": "Don't give up!", "cn": "不要放弃！", "hint": "give(给予)+up(向上)：把努力向上交出去了，就是放弃。",
    "type": "Cloze", "prompt": "Don't ____! (提示: 放弃)", "options": ["give up", "give in", "give out", "get up", "go up", "grow up"]
  },

  # Challenge 3: Sports & Players
  {
    "word": "sport", "meaning": "体育运动", "context_sentence": "Do a class survey about sports.", "cn": "做关于体育运动的班级调查。", "hint": "sp(视频)+ort(类似art艺术)：体育运动是一种可以在视频里播放的艺术。",
    "type": "Cloze", "prompt": "Do a class survey about ____. (提示: 体育运动)", "options": ["sports", "study", "subjects", "stories", "spring", "space"]
  },
  {
    "word": "sport", "meaning": "体育运动", "context_sentence": "Do a class survey about sports.", "cn": "做关于体育运动的班级调查。", "hint": "sp(视频)+ort(类似art艺术)：体育运动是一种可以在视频里播放的艺术。",
    "type": "Cn2En", "prompt": "“体育运动”", "options": ["sport", "spirit", "support", "export", "report", "import"]
  },
  {
    "word": "sport", "meaning": "体育运动", "context_sentence": "Do a class survey about sports.", "cn": "做关于体育运动的班级调查。", "hint": "sp(视频)+ort(类似art艺术)：体育运动是一种可以在视频里播放的艺术。",
    "type": "En2Cn", "prompt": "sport", "options": ["体育运动", "精神", "支持", "出口", "报告", "进口"]
  },
  {
    "word": "ping-pong", "meaning": "乒乓球运动", "context_sentence": "Can you play ping-pong?", "cn": "你会打乒乓球吗？", "hint": "拟声词：ping和pong就是乒乓球击打桌面时发出的声音。",
    "type": "Cloze", "prompt": "Can you play ____? (提示: 乒乓球运动)", "options": ["ping-pong", "football", "basketball", "volleyball", "tennis", "baseball"]
  },
  {
    "word": "volleyball", "meaning": "排球(运动)", "context_sentence": "Can she play volleyball?", "cn": "她会打排球吗？", "hint": "volley(齐击，截击)+ball(球)：排球运动需要球员在空中拦截拍击球。",
    "type": "Cloze", "prompt": "Can she play ____? (提示: 排球)", "options": ["volleyball", "basketball", "football", "ping-pong", "baseball", "tennis"]
  },
  {
    "word": "volleyball", "meaning": "排球(运动)", "context_sentence": "Can she play volleyball?", "cn": "她会打排球吗？", "hint": "volley(齐击，截击)+ball(球)：排球运动需要球员在空中拦截拍击球。",
    "type": "Cn2En", "prompt": "“排球(运动)”", "options": ["volleyball", "basketball", "football", "baseball", "tennis", "ping-pong"]
  },
  {
    "word": "volleyball", "meaning": "排球(运动)", "context_sentence": "Can she play volleyball?", "cn": "她会打排球吗？", "hint": "volley(齐击，截击)+ball(球)：排球运动需要球员在空中拦截拍击球。",
    "type": "En2Cn", "prompt": "volleyball", "options": ["排球(运动)", "篮球(运动)", "足球(运动)", "棒球(运动)", "网球(运动)", "乒乓球(运动)"]
  },
  {
    "word": "player", "meaning": "运动员, 选手, 球员", "context_sentence": "Find good sports players in your school.", "cn": "在你们学校里找出优秀的体育运动员。", "hint": "play(玩，比赛)+er(人)：参加比赛的人就是运动员。",
    "type": "Cloze", "prompt": "Find good sports ____ in your school. (提示: 运动员)", "options": ["players", "playgrounds", "plays", "workers", "teachers", "students"]
  },
  {
    "word": "player", "meaning": "运动员, 选手, 球员", "context_sentence": "Find good sports players in your school.", "cn": "在你们学校里找出优秀的体育运动员。", "hint": "play(玩，比赛)+er(人)：参加比赛的人就是运动员。",
    "type": "Cn2En", "prompt": "“运动员”", "options": ["player", "prayer", "playground", "playroom", "painter", "planner"]
  },
  {
    "word": "player", "meaning": "运动员, 选手, 球员", "context_sentence": "Find good sports players in your school.", "cn": "在你们学校里找出优秀的体育运动员。", "hint": "play(玩，比赛)+er(人)：参加比赛的人就是运动员。",
    "type": "En2Cn", "prompt": "player", "options": ["运动员, 选手", "祈祷者", "操场", "游戏室", "画家", "规划者"]
  },

  # Challenge 4: Kindness & Health
  {
    "word": "kind", "meaning": "亲切的; 友好的; 善良的", "context_sentence": "Many kind people help me.", "cn": "许多善良的人帮助我。", "hint": "k(开)+ind(印第安人)：热情的印第安人很善良。",
    "type": "Cloze", "prompt": "Many ____ people help me. (提示: 善良的)", "options": ["kind", "king", "kids", "kept", "kill", "kiss"]
  },
  {
    "word": "kind", "meaning": "亲切的; 友好的; 善良的", "context_sentence": "Many kind people help me.", "cn": "许多善良的人帮助我。", "hint": "k(开)+ind(印第安人)：热情的印第安人很善良。",
    "type": "Cn2En", "prompt": "“善良的; 友好的”", "options": ["kind", "king", "kiss", "kill", "keep", "kite"]
  },
  {
    "word": "kind", "meaning": "亲切的; 友好的; 善良的", "context_sentence": "Many kind people help me.", "cn": "许多善良的人帮助我。", "hint": "k(开)+ind(印第安人)：热情的印第安人很善良。",
    "type": "En2Cn", "prompt": "kind", "options": ["善良的; 友好的", "国王", "接吻", "杀死", "保持", "风筝"]
  },
  {
    "word": "ill", "meaning": "生病的", "context_sentence": "But I'm very ill. I can't run anymore.", "cn": "但我病得很重，再也不能跑了。", "hint": "生病时，躺在床上像一根面条(i)和两根筷子(ll)。",
    "type": "Cloze", "prompt": "But I'm very ____. I can't run anymore. (提示: 生病的)", "options": ["ill", "well", "hill", "will", "pill", "bill"]
  },
  {
    "word": "ill", "meaning": "生病的", "context_sentence": "But I'm very ill. I can't run anymore.", "cn": "但我病得很重，再也不能跑了。", "hint": "生病时，躺在床上像一根面条(i)和两根筷子(ll)。",
    "type": "Cn2En", "prompt": "“生病的”", "options": ["ill", "sick", "well", "hill", "pill", "bill"]
  },
  {
    "word": "ill", "meaning": "生病的", "context_sentence": "But I'm very ill. I can't run anymore.", "cn": "但我病得很重，再也不能跑了。", "hint": "生病时，躺在床上像一根面条(i)和两根筷子(ll)。",
    "type": "En2Cn", "prompt": "ill", "options": ["生病的", "小山", "将要", "药丸", "账单", "健康的"]
  },
  {
    "word": "remember", "meaning": "纪念; 记住", "context_sentence": "Let's remember Terry with a run.", "cn": "让我们用跑步的方式来纪念泰里。", "hint": "re(反复)+member(成员)：我们要记住并纪念团队中的每一个成员。",
    "type": "Cloze", "prompt": "Let's ____ Terry with a run. (提示: 纪念; 记住)", "options": ["remember", "forget", "respect", "repeat", "record", "return"]
  },
  {
    "word": "remember", "meaning": "纪念; 记住", "context_sentence": "Let's remember Terry with a run.", "cn": "让我们用跑步的方式来纪念泰里。", "hint": "re(反复)+member(成员)：我们要记住并纪念团队中的每一个成员。",
    "type": "Cn2En", "prompt": "“纪念; 记住”", "options": ["remember", "forget", "respect", "repeat", "record", "return"]
  },
  {
    "word": "remember", "meaning": "纪念; 记住", "context_sentence": "Let's remember Terry with a run.", "cn": "让我们用跑步的方式来纪念泰里。", "hint": "re(反复)+member(成员)：我们要记住并纪念团队中的每一个成员。",
    "type": "En2Cn", "prompt": "remember", "options": ["纪念; 记住", "忘记", "尊敬", "重复", "记录", "归还"]
  },
  {
    "word": "cancer", "meaning": "癌(症)", "context_sentence": "But I lose one leg because of cancer.", "cn": "但我因为癌症失去了一条腿。", "hint": "can(能够)+cer(策)：能够用策略去战胜癌症。",
    "type": "Cloze", "prompt": "But I lose one leg because of ____. (提示: 癌症)", "options": ["cancer", "fever", "cough", "cold", "headache", "illness"]
  },

  # Challenge 5: Time & Speed
  {
    "word": "month", "meaning": "一个月", "context_sentence": "I keep running for five months.", "cn": "我持续跑了五个月。", "hint": "mon(星期一)+th(天)：一个月里有很多个星期一。",
    "type": "Cloze", "prompt": "I keep running for five ____. (提示: 月)", "options": ["months", "mouths", "weeks", "years", "days", "hours"]
  },
  {
    "word": "month", "meaning": "一个月", "context_sentence": "I keep running for five months.", "cn": "我持续跑了五个月。", "hint": "mon(星期一)+th(天)：一个月里有很多个星期一。",
    "type": "Cn2En", "prompt": "“一个月”", "options": ["month", "mouth", "math", "money", "match", "monkey"]
  },
  {
    "word": "month", "meaning": "一个月", "context_sentence": "I keep running for five months.", "cn": "我持续跑了五个月。", "hint": "mon(星期一)+th(天)：一个月里有很多个星期一。",
    "type": "En2Cn", "prompt": "month", "options": ["一个月", "嘴巴", "数学", "金钱", "比赛", "猴子"]
  },
  {
    "word": "year", "meaning": "年; 年度", "context_sentence": "Now many people do the Terry Fox Run every year.", "cn": "现在许多人每年都参加泰里·福克斯义跑。", "hint": "y(像树丫)+ear(耳朵)：大树长了一年，树丫像耳朵一样多。",
    "type": "Cloze", "prompt": "Now many people do the Terry Fox Run every ____. (提示: 年)", "options": ["year", "month", "week", "day", "hour", "season"]
  },
  {
    "word": "year", "meaning": "年; 年度", "context_sentence": "Now many people do the Terry Fox Run every year.", "cn": "现在许多人每年都参加泰里·福克斯义跑。", "hint": "y(像树丫)+ear(耳朵)：大树长了一年，树丫像耳朵一样多。",
    "type": "Cn2En", "prompt": "“年; 年度”", "options": ["year", "ear", "near", "dear", "fear", "bear"]
  },
  {
    "word": "year", "meaning": "年; 年度", "context_sentence": "Now many people do the Terry Fox Run every year.", "cn": "现在许多人每年都参加泰里·福克斯义跑。", "hint": "y(像树丫)+ear(耳朵)：大树长了一年，树丫像耳朵一样多。",
    "type": "En2Cn", "prompt": "year", "options": ["年; 年度", "耳朵", "在附近", "亲爱的", "恐惧", "熊"]
  },
  {
    "word": "keep", "meaning": "持续; 继续", "context_sentence": "I keep running for five months.", "cn": "我持续跑了五个月。", "hint": "ke(客)+ep(音频)：客人在继续播放音频。",
    "type": "Cloze", "prompt": "I ____ running for five months. (提示: 持续)", "options": ["keep", "stop", "start", "like", "begin", "give"]
  },
  {
    "word": "keep", "meaning": "持续; 继续", "context_sentence": "I keep running for five months.", "cn": "我持续跑了五个月。", "hint": "ke(客)+ep(音频)：客人在继续播放音频。",
    "type": "Cn2En", "prompt": "“持续; 继续”", "options": ["keep", "deep", "weep", "peep", "jeep", "sleep"]
  },
  {
    "word": "keep", "meaning": "持续; 继续", "context_sentence": "I keep running for five months.", "cn": "我持续跑了五个月。", "hint": "ke(客)+ep(音频)：客人在继续播放音频。",
    "type": "En2Cn", "prompt": "keep", "options": ["持续; 继续", "深的", "哭泣", "窥视", "吉普车", "睡觉"]
  },
  {
    "word": "never", "meaning": "决不, 永不", "context_sentence": "Don't give up! Never stop!", "cn": "不要放弃！决不停止！", "hint": "ne(不)+ver(版本)：这个软件决不会有第二个版本。",
    "type": "Cloze", "prompt": "Don't give up! ____ stop! (提示: 决不)", "options": ["Never", "Always", "Often", "Usually", "Sometimes", "Ever"]
  }
]

# Randomize options and find correct index, then chunk into 5 challenges of 10 questions
random.seed(42)  # For deterministic shuffling
for q in questions_pool:
    # Shuffle options
    correct_opt = q["options"][0] if q["type"] == "Cloze" or q["type"] == "Cn2En" else q["options"][2] # Find correct one based on structure
    # Wait, let's just make sure the correct option is exactly match the word/meaning
    if q["type"] == "Cn2En" or q["type"] == "Cloze":
        correct_val = q["word"]
    else:
        correct_val = q["meaning"]
    
    # Re-shuffle options completely
    opts = list(set(q["options"]))
    if correct_val not in opts:
        opts[0] = correct_val
    random.shuffle(opts)
    q["options"] = opts
    q["answer"] = opts.index(correct_val)
    q["id"] = gen_id()
    q["title"] = "Vocab Master"

challenges_icons = ["🏃‍♂️", "🎗️", "🏫", "❤️", "📅"]
challenges_titles = ["Action & Ability", "Hope & Effort", "Sports & Players", "Kindness & Health", "Time & Speed"]

challenges = []
for i in range(5):
    challenges.append({
        "id": f"c{i+1}",
        "title": challenges_titles[i],
        "icon": challenges_icons[i],
        "questions": questions_pool[i*10 : (i+1)*10]
    })

vocab_master_data = {
    "level": "Grade 4 Semester 1 - Unit 1",
    "title": "Vocab Master",
    "challenges": challenges
}

with open(vocab_master_path, "w", encoding="utf-8") as f:
    json.dump(vocab_master_data, f, ensure_ascii=False, indent=2)

print("Vocab Master Written.")

# ----------------- 3. Spelling Hero Generator -----------------
# Filter out phrases
spelling_words_src = [item for item in vocab_guide_data["unit_vocabulary"] if " " not in item["word"]]
spelling_words = []

for item in spelling_words_src:
    word = item["word"]
    meaning = item["meaning"]
    syllable_type = item["syllable_type"]
    
    # Syllables/Phonics splitting
    chunks = []
    if syllable_type in ["闭音节 (Closed)", "开音节 (Open)", "相对开音节 (VCe)", "元音字母组合音节 (Vowel Team)", "r控制音节 (R-Controlled)", "辅音+le音节 (C-le)"]:
        w_type = "single-syllable"
        # Split single syllable words by graphemes
        if word == "sport":
            chunks = [
                {"correct": "sp", "options": ["st", "sh", "sp"]},
                {"correct": "or", "options": ["ar", "ur", "or"]},
                {"correct": "t", "options": ["p", "d", "t"]}
            ]
        elif word == "jump":
            chunks = [
                {"correct": "j", "options": ["g", "y", "j"]},
                {"correct": "u", "options": ["a", "o", "u"]},
                {"correct": "mp", "options": ["nt", "nd", "mp"]}
            ]
        elif word == "high":
            chunks = [
                {"correct": "h", "options": ["f", "l", "h"]},
                {"correct": "igh", "options": ["ite", "y", "igh"]}
            ]
        elif word == "far":
            chunks = [
                {"correct": "f", "options": ["v", "ph", "f"]},
                {"correct": "ar", "options": ["er", "or", "ar"]}
            ]
        elif word == "hope":
            chunks = [
                {"correct": "h", "options": ["h", "f", "p"]},
                {"correct": "ope", "options": ["ope", "oap", "oke"]}
            ]
        elif word == "lose":
            chunks = [
                {"correct": "l", "options": ["r", "w", "l"]},
                {"correct": "ose", "options": ["ose", "oze", "uice"]}
            ]
        elif word == "hard":
            chunks = [
                {"correct": "h", "options": ["h", "f", "l"]},
                {"correct": "ard", "options": ["ard", "art", "ord"]}
            ]
        elif word == "kind":
            chunks = [
                {"correct": "k", "options": ["c", "q", "k"]},
                {"correct": "ind", "options": ["ind", "int", "ined"]}
            ]
        elif word == "keep":
            chunks = [
                {"correct": "k", "options": ["k", "c", "ch"]},
                {"correct": "eep", "options": ["eep", "eap", "ip"]}
            ]
        elif word == "month":
            chunks = [
                {"correct": "m", "options": ["n", "w", "m"]},
                {"correct": "on", "options": ["un", "an", "on"]},
                {"correct": "th", "options": ["s", "f", "th"]}
            ]
        elif word == "ill":
            chunks = [
                {"correct": "i", "options": ["e", "a", "i"]},
                {"correct": "ll", "options": ["l", "le", "ll"]}
            ]
        elif word == "year":
            chunks = [
                {"correct": "y", "options": ["i", "j", "y"]},
                {"correct": "ear", "options": ["eer", "ere", "ear"]}
            ]
        elif word == "fail":
            chunks = [
                {"correct": "f", "options": ["v", "f", "h"]},
                {"correct": "ail", "options": ["ale", "ayl", "ail"]}
            ]
        elif word == "give":
            chunks = [
                {"correct": "g", "options": ["j", "g", "k"]},
                {"correct": "ive", "options": ["ive", "yve", "ife"]}
            ]
        elif word == "try":
            chunks = [
                {"correct": "tr", "options": ["ch", "dr", "tr"]},
                {"correct": "y", "options": ["ie", "igh", "y"]}
            ]
        elif word == "star":
            chunks = [
                {"correct": "st", "options": ["sp", "sk", "st"]},
                {"correct": "ar", "options": ["er", "or", "ar"]}
            ]
        elif word == "fast":
            chunks = [
                {"correct": "f", "options": ["v", "f", "h"]},
                {"correct": "ast", "options": ["ast", "est", "ust"]}
            ]
        elif word == "swim":
            chunks = [
                {"correct": "sw", "options": ["sl", "sn", "sw"]},
                {"correct": "i", "options": ["e", "o", "i"]},
                {"correct": "m", "options": ["n", "ng", "m"]}
            ]
        elif word == "well":
            chunks = [
                {"correct": "w", "options": ["v", "w", "wh"]},
                {"correct": "ell", "options": ["all", "ill", "ell"]}
            ]
        else:
            # Fallback
            chunks = [{"correct": word, "options": [word, word+"e", word+"y"]}]
    else:
        w_type = "multi-syllable"
        # Standard syllables
        parts = syllable_type.split("-")
        for idx, pt in enumerate(parts):
            # Create distractors for syllable
            dist1 = pt.replace("a", "e").replace("i", "e").replace("o", "a").replace("e", "i")
            if dist1 == pt:
                dist1 = pt + "e"
            dist2 = pt[::-1]
            if dist2 == pt:
                dist2 = pt + "y"
            chunks.append({
                "correct": pt,
                "options": [pt, dist1, dist2]
            })
            
    # Shuffle options for each chunk
    for chk in chunks:
        # Deduplicate and shuffle
        chk["options"] = list(set(chk["options"]))
        if chk["correct"] not in chk["options"]:
            chk["options"][0] = chk["correct"]
        random.shuffle(chk["options"])
        
    spelling_words.append({
        "id": gen_id(),
        "word": word,
        "meaning": meaning,
        "type": w_type,
        "chunks": chunks
    })

spelling_hero_data = {
    "level": "Grade 4 Semester 1 - Unit 1",
    "title": "Spelling Master",
    "spelling_words": spelling_words
}

with open(spelling_hero_path, "w", encoding="utf-8") as f:
    json.dump(spelling_hero_data, f, ensure_ascii=False, indent=2)

print("Spelling Hero Written.")

# ----------------- 4. Sentence Architect Generator -----------------
# 5 Challenges * 10 sentences = 50 sentences
# Passcode: P C S A T
sa_challenges = [
  {
    "id": "c1",
    "title": "Play to Win",
    "icon": "🎮",
    "data": [
      {"en": "Can you jump high, Daming?", "cn": "你能跳得高吗，大明？", "hint": "Can you + verb + adverb?", "noise": ["is", "do"], "accept": []},
      {"en": "Yes, I can.", "cn": "是的，我会。", "hint": "Short answer for ability.", "noise": ["am", "do"], "accept": []},
      {"en": "Can you run fast?", "cn": "你能跑得快吗？", "hint": "Ask about running ability.", "noise": ["are", "very"], "accept": []},
      {"en": "No, I can't.", "cn": "不，我不会。", "hint": "Negative short answer.", "noise": ["am", "don't"], "accept": []},
      {"en": "But I can learn.", "cn": "但我可以学习。", "hint": "Expressing willingness to learn.", "noise": ["am", "to"], "accept": []},
      {"en": "I can swim now.", "cn": "我现在会游泳了。", "hint": "Use 'now' at the end.", "noise": ["am", "is"], "accept": []},
      {"en": "You can swim fast!", "cn": "你游得真快！", "hint": "Subject + can + verb + adverb.", "noise": ["very", "is"], "accept": []},
      {"en": "Lingling can run fast.", "cn": "玲玲跑得快。", "hint": "Lingling is the subject.", "noise": ["is", "runs"], "accept": []},
      {"en": "Sam can jump high.", "cn": "萨姆跳得高。", "hint": "Sam is the subject.", "noise": ["is", "jumps"], "accept": []},
      {"en": "Can Amy play ping-pong well?", "cn": "埃米乒乓球打得好吗？", "hint": "Can + subject + play + sport + well?", "noise": ["is", "plays"], "accept": []}
    ]
  },
  {
    "id": "c2",
    "title": "Can Terry Fox Run",
    "icon": "🏃",
    "data": [
      {"en": "Yes, she can.", "cn": "是的，她会。", "hint": "Affirmative short answer.", "noise": ["is", "does"], "accept": []},
      {"en": "Can Bobo jump far?", "cn": "波波跳得远吗？", "hint": "Can + Bobo + jump + far?", "noise": ["is", "jumps"], "accept": []},
      {"en": "No, he can't.", "cn": "不，他不会。", "hint": "Negative short answer.", "noise": ["does", "isn't"], "accept": []},
      {"en": "Do you know Li Fei?", "cn": "你认识李菲吗？", "hint": "Do you know + person?", "noise": ["are", "knowing"], "accept": []},
      {"en": "She can play ping-pong well.", "cn": "她乒乓球打得好。", "hint": "Use 'well' at the end.", "noise": ["is", "plays"], "accept": []},
      {"en": "Six children can swim.", "cn": "六个孩子会游泳。", "hint": "Number + noun + can + verb.", "noise": ["swimming", "are"], "accept": []},
      {"en": "Four children can play basketball.", "cn": "四个孩子会打篮球。", "hint": "Number + children + can + play + basketball.", "noise": ["are", "playing"], "accept": []},
      {"en": "Five children can swim.", "cn": "五个孩子会游泳。", "hint": "Subject is Five children.", "noise": ["is", "swimming"], "accept": []},
      {"en": "I'm Terry Fox.", "cn": "我是泰里·福克斯。", "hint": "Use contraction for 'I am'.", "noise": ["is", "are"], "accept": ["I am Terry Fox."]},
      {"en": "I like running and playing basketball.", "cn": "我喜欢跑步和打篮球。", "hint": "like + doing and doing.", "noise": ["to", "play"], "accept": ["I like playing basketball and running."]}
    ]
  },
  {
    "id": "c3",
    "title": "Story of Hope",
    "icon": "🎗️",
    "data": [
      {"en": "But I lose one leg because of cancer.", "cn": "但我因为癌症失去了一条腿。", "hint": "because of + noun.", "noise": ["why", "off"], "accept": []},
      {"en": "Can I help other people with cancer?", "cn": "我能帮助其他癌症患者吗？", "hint": "help other people with + illness.", "noise": ["are", "to"], "accept": []},
      {"en": "I can run across Canada.", "cn": "我可以跑步穿过加拿大。", "hint": "run across + place.", "noise": ["cross", "is"], "accept": []},
      {"en": "I can get money for people!", "cn": "我可以为人们募捐！", "hint": "get money for + people.", "noise": ["to", "is"], "accept": []},
      {"en": "It's hard for me.", "cn": "这对我来说很困难。", "hint": "It is + adj + for + object.", "noise": ["is", "to"], "accept": ["It is hard for me."]},
      {"en": "Many kind people help me.", "cn": "许多善良的人帮助我。", "hint": "Subject + verb + object.", "noise": ["helps", "are"], "accept": []},
      {"en": "Come on, Terry!", "cn": "加油，泰里！", "hint": "Phrase for encouragement.", "noise": ["go", "in"], "accept": []},
      {"en": "You can do it!", "cn": "你能行！/你可以做到的！", "hint": "Encouragement expression.", "noise": ["does", "are"], "accept": []},
      {"en": "Yes, I can do it!", "cn": "是的，我能行！", "hint": "Response to encouragement.", "noise": ["am", "does"], "accept": []},
      {"en": "I keep running for five months.", "cn": "我坚持跑了五个月。", "hint": "keep + doing + for + time.", "noise": ["to", "month"], "accept": []}
    ]
  },
  {
    "id": "c4",
    "title": "Animal Sports Stars",
    "icon": "🐯",
    "data": [
      {"en": "But I'm very ill.", "cn": "但我病得很重。", "hint": "Use contraction for 'I am'.", "noise": ["is", "well"], "accept": ["I am very ill."]},
      {"en": "I can't run anymore.", "cn": "我再也不能跑了。", "hint": "not... anymore.", "noise": ["any", "don't"], "accept": []},
      {"en": "Let's remember Terry with a run.", "cn": "让我们用跑步的方式来纪念泰里。", "hint": "Let's + verb + with + noun.", "noise": ["to", "running"], "accept": []},
      {"en": "Welcome to Sports Day!", "cn": "欢迎来到运动会！", "hint": "Welcome to + event.", "noise": ["in", "at"], "accept": []},
      {"en": "I can't run very fast.", "cn": "我跑得不是很快。", "hint": "Negative sentence with 'very fast'.", "noise": ["am", "don't"], "accept": []},
      {"en": "I can't jump very far.", "cn": "我跳得不是很远。", "hint": "Negative sentence with 'very far'.", "noise": ["am", "don't"], "accept": []},
      {"en": "It's OK to fail.", "cn": "失败也没关系。", "hint": "It is + OK + to + verb.", "noise": ["is", "failing"], "accept": ["It is OK to fail."]},
      {"en": "Don't give up!", "cn": "不要放弃！", "hint": "Negative imperative sentence.", "noise": ["not", "giving"], "accept": []},
      {"en": "Never stop!", "cn": "决不停止！", "hint": "Never + verb.", "noise": ["not", "stopping"], "accept": []},
      {"en": "Work hard and try your best!", "cn": "努力工作，尽你最大努力！", "hint": "Two imperatives joined by and.", "noise": ["to", "trying"], "accept": ["Try your best and work hard!"]}
    ]
  },
  {
    "id": "c5",
    "title": "Talk about Abilities",
    "icon": "🦁",
    "data": [
      {"en": "Find out about an animal sports star.", "cn": "找出一位动物运动明星的信息。", "hint": "Find out about + noun phrase.", "noise": ["to", "finding"], "accept": []},
      {"en": "Tell the class about it.", "cn": "把它告诉全班同学。", "hint": "Tell + object + about + it.", "noise": ["to", "telling"], "accept": []},
      {"en": "I can run fast!", "cn": "我能跑得快！", "hint": "Cheetah's line.", "noise": ["is", "fastly"], "accept": []},
      {"en": "I can jump high!", "cn": "我能跳得高！", "hint": "Jackrabbit's line.", "noise": ["is", "highly"], "accept": []},
      {"en": "I can swim fast!", "cn": "我能游得快！", "hint": "Sailfish's line.", "noise": ["is", "swimming"], "accept": []},
      {"en": "I can jump far!", "cn": "我能跳得远！", "hint": "Snow leopard's line.", "noise": ["is", "farly"], "accept": []},
      {"en": "He can play football.", "cn": "他会踢足球。", "hint": "Subject is He.", "noise": ["is", "plays"], "accept": []},
      {"en": "Can she play volleyball?", "cn": "她会打排球吗？", "hint": "Can + she + play + volleyball?", "noise": ["is", "volleyballs"], "accept": []},
      {"en": "Can she jump far?", "cn": "她能跳得远吗？", "hint": "Can + she + jump + far?", "noise": ["is", "jumps"], "accept": []},
      {"en": "Can she swim?", "cn": "她会游泳吗？", "hint": "Can + she + swim?", "noise": ["is", "swimming"], "accept": []}
    ]
  }
]

# Generate unique ids for SA items, verify no overlaps with en, add IPAs
ipa_dict = {
  "sport": "spɔːt",
  "jump": "dʒʌmp",
  "high": "haɪ",
  "far": "fɑː",
  "ping-pong": "ˈpɪŋ pɒŋ",
  "volleyball": "ˈvɒlibɔːl",
  "across": "əˈkrɒs",
  "hope": "həʊp",
  "lose": "luːz",
  "because": "bɪˈkɒz",
  "cancer": "ˈkænsə",
  "money": "ˈmʌni",
  "hard": "hɑːd",
  "kind": "kaɪnd",
  "keep": "kiːp",
  "month": "mʌnθ",
  "ill": "ɪl",
  "year": "jɪə",
  "remember": "rɪˈmembə",
  "fail": "feɪl",
  "give": "ɡɪv",
  "never": "ˈnevə",
  "try": "traɪ",
  "star": "stɑː",
  "ability": "əˈbɪləti",
  "player": "ˈpleɪə",
  "fast": "fɑːst",
  "swim": "swɪm",
  "well": "wel"
}

for ch in sa_challenges:
    for item in ch["data"]:
        item["id"] = gen_id()
        # Clean en punctuation for check
        words_in_en = item["en"].lower().replace("?", "").replace(".", "").replace("!", "").replace(",", "").split()
        # Ensure noise words are not in en
        filtered_noise = []
        for n in item["noise"]:
            if n.lower() not in words_in_en:
                filtered_noise.append(n)
            else:
                filtered_noise.append(n + "s") # modify to avoid conflict
        item["noise"] = filtered_noise

sentence_architect_data = {
  "title": "Play to Win",
  "level": "Grade 4 Semester 1 - Unit 1",
  "primaryColor": "#6366f1",
  "primaryColorDark": "#4f46e5",
  "storageSuffix": "_g4s1_u1",
  "passcode": "PCSAT",
  "ipaDict": ipa_dict,
  "challenges": sa_challenges
}

with open(sentence_architect_path, "w", encoding="utf-8") as f:
    json.dump(sentence_architect_data, f, ensure_ascii=False, indent=2)

print("Sentence Architect Written.")

# ----------------- 5. Recall Map Generator -----------------
recall_map_data = {
  "level": "Grade 4 Semester 1",
  "part": "Unit 1",
  "tree": {
    "id": "root",
    "text": "Play to win!",
    "emoji": "🎮",
    "state": "emoji",
    "children": [
      {
        "id": "stories",
        "text": "Stories (2 Stories)",
        "emoji": "📖",
        "state": "hidden",
        "children": [
          {
            "id": "story1",
            "text": "Yes, I can!",
            "emoji": "🏊",
            "state": "hidden",
            "children": [
              {"id": "s1_1", "text": "Daming's abilities (jump high, run fast, play ping-pong)", "emoji": "🏓", "state": "hidden"},
              {"id": "s1_2", "text": "Can't swim at first", "emoji": "❌", "state": "hidden"},
              {"id": "s1_3", "text": "Can swim fast now", "emoji": "⚡", "state": "hidden"}
            ]
          },
          {
            "id": "story2",
            "text": "Run for Hope",
            "emoji": "🏃",
            "state": "hidden",
            "children": [
              {"id": "s2_1", "text": "Terry Fox lost leg to cancer", "emoji": "🎗️", "state": "hidden"},
              {"id": "s2_2", "text": "Run across Canada for money", "emoji": "🇨🇦", "state": "hidden"},
              {"id": "s2_3", "text": "Keep running for five months", "emoji": "📅", "state": "hidden"},
              {"id": "s2_4", "text": "Remember Terry with a run every year", "emoji": "❤️", "state": "hidden"}
            ]
          }
        ]
      },
      {
        "id": "vocabulary",
        "text": "Vocabulary",
        "emoji": "🗂️",
        "state": "hidden",
        "children": [
          {
            "id": "verbs",
            "text": "Verbs (Actions)",
            "emoji": "⚡",
            "state": "hidden",
            "children": [
              {"id": "v_jump", "text": "jump (跳)", "emoji": "🦘", "state": "hidden"},
              {"id": "v_swim", "text": "swim (游泳)", "emoji": "🏊", "state": "hidden"},
              {"id": "v_lose", "text": "lose (失去)", "emoji": "📉", "state": "hidden"},
              {"id": "v_keep", "text": "keep (持续; 继续)", "emoji": "🔄", "state": "hidden"},
              {"id": "v_remember", "text": "remember (纪念; 记住)", "emoji": "🧠", "state": "hidden"},
              {"id": "v_fail", "text": "fail (失败)", "emoji": "⚠️", "state": "hidden"},
              {"id": "v_give", "text": "give (给予)", "emoji": "🎁", "state": "hidden"},
              {"id": "v_try", "text": "try (努力; 尝试)", "emoji": "💪", "state": "hidden"}
            ]
          },
          {
            "id": "nouns",
            "text": "Nouns (Things)",
            "emoji": "📦",
            "state": "hidden",
            "children": [
              {"id": "n_sport", "text": "sport (体育运动)", "emoji": "⚽", "state": "hidden"},
              {"id": "n_ping_pong", "text": "ping-pong (乒乓球运动)", "emoji": "🏓", "state": "hidden"},
              {"id": "n_volleyball", "text": "volleyball (排球)", "emoji": "🏐", "state": "hidden"},
              {"id": "n_cancer", "text": "cancer (癌症)", "emoji": "🎗️", "state": "hidden"},
              {"id": "n_money", "text": "money (钱)", "emoji": "💵", "state": "hidden"},
              {"id": "n_month", "text": "month (一个月)", "emoji": "📅", "state": "hidden"},
              {"id": "n_year", "text": "year (年)", "emoji": "🗓️", "state": "hidden"},
              {"id": "n_star", "text": "star (明星)", "emoji": "⭐", "state": "hidden"},
              {"id": "n_ability", "text": "ability (才能; 能力)", "emoji": "🎯", "state": "hidden"},
              {"id": "n_player", "text": "player (运动员)", "emoji": "🏃", "state": "hidden"}
            ]
          },
          {
            "id": "phrases",
            "text": "Phrases (Expressions)",
            "emoji": "🗣️",
            "state": "hidden",
            "children": [
              {"id": "p_because_of", "text": "because of (因为)", "emoji": "❓", "state": "hidden"},
              {"id": "p_give_up", "text": "give up (放弃)", "emoji": "🛑", "state": "hidden"},
              {"id": "p_try_best", "text": "try your best (尽最大努力)", "emoji": "🔥", "state": "hidden"},
              {"id": "p_come_on", "text": "come on (加油)", "emoji": "📣", "state": "hidden"},
              {"id": "p_do_it", "text": "do it (做到; 办到)", "emoji": "✅", "state": "hidden"}
            ]
          }
        ]
      },
      {
        "id": "grammar",
        "text": "Grammar Focus",
        "emoji": "📝",
        "state": "hidden",
        "children": [
          {
            "id": "g_can",
            "text": "Ability: can & can't",
            "emoji": "💪",
            "state": "hidden",
            "children": [
              {"id": "gc_1", "text": "Can you swim? Yes, I can. / No, I can't.", "emoji": "💬", "state": "hidden"},
              {"id": "gc_2", "text": "can + not = can't", "emoji": "➖", "state": "hidden"},
              {"id": "gc_3", "text": "He/She can play ping-pong well.", "emoji": "🌟", "state": "hidden"}
            ]
          },
          {
            "id": "g_reason",
            "text": "Reason: because & because of",
            "emoji": "🤔",
            "state": "hidden",
            "children": [
              {"id": "gr_1", "text": "because + clause (He stopped running because he was ill.)", "emoji": "🔗", "state": "hidden"},
              {"id": "gr_2", "text": "because of + noun (He lost one leg because of cancer.)", "emoji": "🧩", "state": "hidden"}
            ]
          }
        ]
      }
    ]
  }
}

with open(recall_map_path, "w", encoding="utf-8") as f:
    json.dump(recall_map_data, f, ensure_ascii=False, indent=2)

print("Recall Map Written.")

# ----------------- 6. Text Navigator Generator -----------------
# Consolidated Start Up & Speed Up
text_navigator_data = {
  "level": "Grade 4 Semester 1",
  "part": "Unit 1",
  "sections": [
    {
      "section": "Start Up",
      "tree": {
        "id": "root",
        "text": "Yes, I can!",
        "cn": "是的，我会！",
        "emoji": "🏊",
        "notes": "Daming learns to swim and shows off his other sports abilities.",
        "statement": "This section shows Daming's progress in learning to swim.",
        "answer": True,
        "explanation": "本板块展示了大明学习游泳的进度。",
        "keywords": "Daming, swim, abilities",
        "children": [
          {
            "id": "su_q1",
            "text": "What can Daming do?",
            "cn": "大明会做什么？",
            "emoji": "❓",
            "notes": "The leading question of this section.",
            "statement": "Daming can do everything from the beginning.",
            "answer": False,
            "explanation": "大明并不是一开始什么都会，他最开始不会游泳。",
            "keywords": "what, Daming, do",
            "children": []
          },
          {
            "id": "su_p1",
            "text": "Girl: \"Can you jump high, Daming?\"",
            "cn": "女孩：“你能跳得高吗，大明？”",
            "emoji": "👧",
            "notes": "Asking about high jumping ability.",
            "statement": "The girl is asking Daming if he can jump high.",
            "answer": True,
            "explanation": "女孩在询问大明是否能跳得高。",
            "keywords": "jump, high",
            "children": [
              {
                "id": "su_p1_ans",
                "text": "Daming: \"Yes, I can.\"",
                "cn": "大明：“是的，我会。”",
                "emoji": "👦",
                "notes": "Affirmative answer.",
                "statement": "Daming can jump high.",
                "answer": True,
                "explanation": "大明会跳高。",
                "keywords": "yes, can",
                "children": []
              }
            ]
          },
          {
            "id": "su_p2",
            "text": "Girl: \"Can you run fast?\"",
            "cn": "女孩：“你能跑得快吗？”",
            "emoji": "👧",
            "notes": "Asking about running speed.",
            "statement": "The girl wants to know if Daming runs fast.",
            "answer": True,
            "explanation": "女孩想知道大明跑得快不快。",
            "keywords": "run, fast",
            "children": [
              {
                "id": "su_p2_ans",
                "text": "Daming: \"Yes, I can.\"",
                "cn": "大明：“是的，我会。”",
                "emoji": "👦",
                "notes": "Daming confirms he runs fast.",
                "statement": "Daming cannot run fast.",
                "answer": False,
                "explanation": "大明跑得快。",
                "keywords": "yes, can",
                "children": []
              }
            ]
          },
          {
            "id": "su_p3",
            "text": "Girl: \"Can you play ping-pong?\"",
            "cn": "女孩：“你会打乒乓球吗？”",
            "emoji": "👧",
            "notes": "Asking about playing table tennis.",
            "statement": "Ping-pong is also known as table tennis.",
            "answer": True,
            "explanation": "ping-pong也可以被称为table tennis（乒乓球）。",
            "keywords": "play, ping-pong",
            "children": [
              {
                "id": "su_p3_ans",
                "text": "Daming: \"Yes, I can.\"",
                "cn": "大明：“是的，我会。”",
                "emoji": "👦",
                "notes": "Daming can play ping-pong.",
                "statement": "Daming can play ping-pong.",
                "answer": True,
                "explanation": "大明会打乒乓球。",
                "keywords": "yes, can",
                "children": []
              }
            ]
          },
          {
            "id": "su_p4",
            "text": "Boy: \"Can you swim?\"",
            "cn": "男孩：“你会游泳吗？”",
            "emoji": "👦",
            "notes": "Asking about swimming ability.",
            "statement": "The boy asks Daming if he is able to swim.",
            "answer": True,
            "explanation": "男孩问大明是否会游泳。",
            "keywords": "swim",
            "children": [
              {
                "id": "su_p4_ans",
                "text": "Daming: \"No, I can't. But I can learn.\"",
                "cn": "大明：“不，我不会。但我可以学习。”",
                "emoji": "👦",
                "notes": "Daming cannot swim at first, but is willing to learn.",
                "statement": "Daming refuses to learn how to swim.",
                "answer": False,
                "explanation": "大明说他可以去学游泳，并没有拒绝。",
                "keywords": "can't, learn",
                "children": []
              }
            ]
          },
          {
            "id": "su_p5",
            "text": "Daming: \"I can swim now.\"",
            "cn": "大明：“我现在会游泳了。”",
            "emoji": "🏊",
            "notes": "Daming shows his progress.",
            "statement": "Daming has learned to swim by now.",
            "answer": True,
            "explanation": "此时大明已经学会了游泳。",
            "keywords": "swim, now",
            "children": [
              {
                "id": "su_p5_ans",
                "text": "Boy: \"Wow! You can swim fast!\"",
                "cn": "男孩：“哇！你游得真快！”",
                "emoji": "😮",
                "notes": "Cheering for Daming's speed.",
                "statement": "The boy is surprised by Daming's swimming speed.",
                "answer": True,
                "explanation": "男孩对大明的游泳速度感到惊讶。",
                "keywords": "wow, fast",
                "children": []
              }
            ]
          }
        ]
      }
    },
    {
      "section": "Speed Up",
      "tree": {
        "id": "root",
        "text": "Run for Hope",
        "cn": "为希望而跑",
        "emoji": "🏃",
        "notes": "The moving story of Terry Fox running across Canada for cancer research.",
        "statement": "Terry Fox ran for cancer awareness and research funding.",
        "answer": True,
        "explanation": "泰里·福克斯为了癌症宣传和研究基金而跑。",
        "keywords": "Terry Fox, Run for Hope",
        "children": [
          {
            "id": "sp_q1",
            "text": "Why does Terry run across Canada?",
            "cn": "泰里为什么要跑过加拿大？",
            "emoji": "❓",
            "notes": "The guide question of this reading passage.",
            "statement": "Terry runs across Canada to win a racing gold medal.",
            "answer": False,
            "explanation": "泰里是为了给癌症患者筹集资金而跑，不是为了得金牌。",
            "keywords": "why, Terry, run",
            "children": []
          },
          {
            "id": "sp_p1_1",
            "text": "Terry: \"I'm Terry Fox. I like running and playing basketball.\"",
            "cn": "泰里：“我是泰里·福克斯。我喜欢跑步和打篮球。”",
            "emoji": "👦",
            "notes": "Introduction of Terry's hobbies.",
            "statement": "Terry liked running and basketball.",
            "answer": True,
            "explanation": "泰里喜欢跑步和打篮球。",
            "keywords": "Terry, like, running",
            "children": []
          },
          {
            "id": "sp_p1_2",
            "text": "Terry: \"But I lose one leg because of cancer.\"",
            "cn": "泰里：“但我因为癌症失去了一条腿。”",
            "emoji": "🎗️",
            "notes": "because of + noun.",
            "statement": "Terry lost both of his legs due to cancer.",
            "answer": False,
            "explanation": "泰里只失去了一条腿(one leg)，不是两条。",
            "keywords": "lose, leg, cancer",
            "children": []
          },
          {
            "id": "sp_p1_3",
            "text": "Terry: \"Can I help other people with cancer?\"",
            "cn": "泰里：“我能帮助其他癌症患者吗？”",
            "emoji": "🤝",
            "notes": "Terry wonders how to help others.",
            "statement": "Terry wanted to help other people diagnosed with cancer.",
            "answer": True,
            "explanation": "泰里想帮助其他癌症患者。",
            "keywords": "help, other people",
            "children": []
          },
          {
            "id": "sp_p1_4",
            "text": "Terry: \"I can run across Canada. And I can get money for people!\"",
            "cn": "泰里：“我可以跑步穿过加拿大。我可以为人们募捐！”",
            "emoji": "🇨🇦",
            "notes": "Canada is a very large country.",
            "statement": "Terry's plan was to raise money by running across Canada.",
            "answer": True,
            "explanation": "泰里的计划是通过跑过加拿大来为人们募捐。",
            "keywords": "run, across, Canada, money",
            "children": []
          },
          {
            "id": "sp_p1_5",
            "text": "Terry: \"It's hard for me. Many kind people help me.\"",
            "cn": "泰里：“这对我来说很困难。许多善良的人帮助我。”",
            "emoji": "⛰️",
            "notes": "Running on a prosthetic leg is extremely difficult.",
            "statement": "No one helped Terry on his run.",
            "answer": False,
            "explanation": "许多善良的人帮助了他(Many kind people help me)。",
            "keywords": "hard, kind people, help",
            "children": []
          },
          {
            "id": "sp_p1_6",
            "text": "Crowd: \"Come on, Terry! You can do it!\"",
            "cn": "群众：“加油，泰里！你能行！”",
            "emoji": "📣",
            "notes": "Spectators cheering for Terry.",
            "statement": "The people cheered to support Terry.",
            "answer": True,
            "explanation": "人们大喊加油来支持泰里。",
            "keywords": "come on, do it",
            "children": [
              {
                "id": "sp_p1_6_thought",
                "text": "Terry (thought): \"Yes, I can do it!\"",
                "cn": "泰里（心想）：“是的，我能行！”",
                "emoji": "💭",
                "notes": "Inner determination.",
                "statement": "Terry believed in himself.",
                "answer": True,
                "explanation": "泰里内心相信自己能做到。",
                "keywords": "can do it",
                "children": []
              }
            ]
          },
          {
            "id": "sp_p2",
            "text": "Terry: \"I keep running for five months.\"",
            "cn": "泰里：“我坚持跑了五个月。”",
            "emoji": "📅",
            "notes": "Terry ran thousands of kilometers.",
            "statement": "Terry ran for five weeks before stopping.",
            "answer": False,
            "explanation": "他坚持跑了五个月(five months)，不是五周。",
            "keywords": "keep, five months",
            "children": []
          },
          {
            "id": "sp_p3",
            "text": "Terry: \"But I'm very ill. I can't run anymore.\"",
            "cn": "泰里：“但我病得很重。我再也不能跑了。”",
            "emoji": "🤒",
            "notes": "Terry had to stop due to the cancer spreading.",
            "statement": "Terry stopped running because he was tired of running.",
            "answer": False,
            "explanation": "泰里停止跑步是因为他病得很重(very ill)，而不是因为厌倦了跑步。",
            "keywords": "ill, can't run anymore",
            "children": []
          },
          {
            "id": "sp_p4",
            "text": "Narrator: \"Now many people do the Terry Fox Run every year. Let's remember Terry with a run.\"",
            "cn": "旁白：“现在许多人每年都参加泰里·福克斯义跑。让我们用跑步来纪念泰里吧。”",
            "emoji": "❤️",
            "notes": "The Terry Fox Run is a global event today.",
            "statement": "People remember Terry Fox by doing a run every year.",
            "answer": True,
            "explanation": "人们每年通过跑步来纪念泰里·福克斯。",
            "keywords": "remember Terry, every year",
            "children": []
          }
        ]
      }
    }
  ]
}

with open(text_navigator_path, "w", encoding="utf-8") as f:
    json.dump(text_navigator_data, f, ensure_ascii=False, indent=2)

print("Text Navigator Written.")

# ----------------- 7. Grammar Wizard Generator -----------------
# 2 Challenges * 10 questions = 20 questions
# Focus: can / can't for ability, because / because of for reason, sports collocations (play + sport, run fast)
gw_questions = [
  # Challenge 1: 情态动词 can & can't
  {
    "id": "gwa4aq01", "type": "multiple-choice", "category": "definition",
    "prompt": "在英语中，表示“能够，会”做某事，应该使用哪一个情态动词？",
    "options": ["do", "can", "must", "like"], "answer": 1,
    "explanation": "情态动词 can 表示“能力”，意为“能，会”。do 是助动词/实义动词，must 表示“必须”，like 表示“喜欢”。",
    "hint": "表达能力“会做某事”的词。"
  },
  {
    "id": "gwa4aq02", "type": "multiple-choice", "category": "formation",
    "prompt": "情态动词 can 的否定形式 “can't” 是哪两个词的缩写？",
    "options": ["can not", "can no", "can do", "could not"], "answer": 0,
    "explanation": "can't 是 can not 的简写形式，表示“不会，不能”。",
    "hint": "can 和 not 的合并缩写。"
  },
  {
    "id": "gwa4aq03", "type": "multiple-choice", "category": "formation",
    "prompt": "完成句子：Daming can ________ high. (大明能跳得高。)",
    "options": ["jumps", "jump", "jumping", "to jump"], "answer": 1,
    "explanation": "情态动词 can 后面必须接动词原形，所以用 jump。",
    "hint": "情态动词后面接动词的什么形式？"
  },
  {
    "id": "gwa4aq04", "type": "multiple-choice", "category": "usage",
    "prompt": "完成句子：Can you swim? — No, I ________.",
    "options": ["can", "can't", "don't", "am not"], "answer": 1,
    "explanation": "问句由 Can 引导，否定回答应为 No, I can't. (不，我不会。)",
    "hint": "用 Can 提问，否定回答也要用 Can 的否定式。"
  },
  {
    "id": "gwa4aq05", "type": "multiple-choice", "category": "differentiation",
    "prompt": "完成句子：Lingling can ________ ping-pong well.",
    "options": ["play", "plays", "playing", "to play"], "answer": 0,
    "explanation": "can 后面接动词原形，球类运动前不用定冠词 the，搭配动词 play 意为“打乒乓球”。",
    "hint": "情态动词 + 动词原形。"
  },
  {
    "id": "gwa4aq06", "type": "multiple-choice", "category": "differentiation",
    "prompt": "选出在句意和语法上都正确的一项：",
    "options": [
      "I can't swim, but I can learn.",
      "I can't swim, but I can learning.",
      "I can't swim, but I can to learn.",
      "I don't swim, but I can plays."
    ], "answer": 0,
    "explanation": "句意为“我不会游泳，但我可以学习。”can/can't 后面使用动词原形 swim 和 learn。",
    "hint": "两处情态动词后都要接动词原形。"
  },
  {
    "id": "gwa4aq07", "type": "multiple-choice", "category": "usage",
    "prompt": "完成句子：Can Bobo jump far? — Yes, he ________.",
    "options": ["is", "can", "does", "can't"], "answer": 1,
    "explanation": "由 Can 引导的一般疑问句，肯定回答为 Yes, he can. (是的，他会。)",
    "hint": "注意肯定回答的结构。"
  },
  {
    "id": "gwa4aq08", "type": "multiple-choice", "category": "formation",
    "prompt": "在疑问句 “Can you run fast?” 中，fast 修饰动词 run 作副词。它的意思是：",
    "options": ["快的 (形容词)", "快地 (副词)", "慢的 (形容词)", "慢地 (副词)"], "answer": 1,
    "explanation": "fast 在这里修饰奔跑的动作，作副词，表示“快地”。",
    "hint": "修饰动作跑(run)的词作副词。"
  },
  {
    "id": "gwa4aq09", "type": "multiple-choice", "category": "differentiation",
    "prompt": "下列球类运动搭配中，哪一个不使用动词 play？",
    "options": ["ping-pong", "volleyball", "basketball", "running"], "answer": 3,
    "explanation": "球类运动如 ping-pong, volleyball, basketball 使用 play。running 属于田径运动，一般直接用 run 或者 do running，不搭配 play。",
    "hint": "球类运动用 play，而跑步等田径类不用。"
  },
  {
    "id": "gwa4aq10", "type": "multiple-choice", "category": "purpose",
    "prompt": "当我们想表达某人做某项运动水平很高时，常在句尾使用副词：",
    "options": ["good", "well", "fine", "nice"], "answer": 1,
    "explanation": "修饰动词（如 play ping-pong）表示“好地”，要用副词 well。good 是形容词，通常不直接修饰普通动词。",
    "hint": "修饰动词“好地”要用副词。"
  },

  # Challenge 2: 原因连词 because & because of
  {
    "id": "gwa4aq11", "type": "multiple-choice", "category": "definition",
    "prompt": "在英语中，引导原因状语从句（表示“因为”）最常用的连词是：",
    "options": ["but", "so", "because", "and"], "answer": 2,
    "explanation": "because 表示“因为”，用来解释原因。but 表示转折，so 表示结果，and 表示并列。",
    "hint": "解释“为什么”的连词。"
  },
  {
    "id": "gwa4aq12", "type": "multiple-choice", "category": "differentiation",
    "prompt": "连词 because 和短语 because of 的用法区别是：",
    "options": [
      "because 后面接句子；because of 后面接名词、代词或短语",
      "because 后面接名词；because of 后面接句子",
      "两者的用法完全一样，没有任何区别",
      "because 只能在句首；because of 只能在句尾"
    ], "answer": 0,
    "explanation": "because 是连词，后接原因状语从句（有主语和谓语动词的句子）；because of 是介词短语，后接名词、代词或名词短语。",
    "hint": "注意 of 后面只能接名词性成分。"
  },
  {
    "id": "gwa4aq13", "type": "multiple-choice", "category": "usage",
    "prompt": "完成句子：Terry stops running because he ________ very ill.",
    "options": ["is", "are", "do", "does"], "answer": 0,
    "explanation": "because 引导句子，主语 he 是单数，使用 be 动词 is。",
    "hint": "主语 he 对应的 be 动词。"
  },
  {
    "id": "gwa4aq14", "type": "multiple-choice", "category": "differentiation",
    "prompt": "完成句子：Terry loses one leg ________ cancer.",
    "options": ["because", "because of", "so", "but"], "answer": 1,
    "explanation": "由于 cancer (癌症) 是名词，所以前面需要使用 because of 来连接。",
    "hint": "cancer 是名词，前面要用 whose/because of？"
  },
  {
    "id": "gwa4aq15", "type": "multiple-choice", "category": "usage",
    "prompt": "完成句子：Why does Terry run across Canada? — ________ he wants to get money for other people.",
    "options": ["So", "But", "Because", "Or"], "answer": 2,
    "explanation": "Why 引导的疑问句，答句通常用 Because (因为...) 来回答原因。",
    "hint": "回答 Why 的提问。"
  },
  {
    "id": "gwa4aq16", "type": "multiple-choice", "category": "formation",
    "prompt": "在短语 “because of sb/sth” 中，“sb” 和 “sth” 分别代表什么？",
    "options": [
      "somebody (某人) 和 something (某事物)",
      "somebody (某人) 和 sometimes (有时)",
      "schoolbag (书包) 和 schoolmate (同学)",
      "subject (科目) 和 student (学生)"
    ], "answer": 0,
    "explanation": "在词汇表中，sb 是 somebody (某人) 的缩写，sth 是 something (某事物) 的缩写。",
    "hint": "英语词典中的常用缩写代称。"
  },
  {
    "id": "gwa4aq17", "type": "multiple-choice", "category": "differentiation",
    "prompt": "完成句子：We didn't go out ________ the rain.",
    "options": ["because of", "because", "but", "so"], "answer": 0,
    "explanation": "the rain 是名词短语，因此使用 because of 表示“因为下雨”。",
    "hint": "the rain 是名词短语。"
  },
  {
    "id": "gwa4aq18", "type": "multiple-choice", "category": "differentiation",
    "prompt": "完成句子：We didn't go out ________ it was raining.",
    "options": ["because of", "because", "so", "but"], "answer": 1,
    "explanation": "it was raining 是一个完整的句子（主系表/主谓结构），因此使用 because 引导从句。",
    "hint": "it was raining 是个句子。"
  },
  {
    "id": "gwa4aq19", "type": "multiple-choice", "category": "usage",
    "prompt": "完成句子：It's hard for me, ________ many kind people help me.",
    "options": ["but", "because", "so", "or"], "answer": 0,
    "explanation": "句意为“这对我来说很困难，但是很多善良的人帮助了我。”表示转折关系，用 but。",
    "hint": "“困难”和“人帮助我”之间的逻辑转折关系。"
  },
  {
    "id": "gwa4aq20", "type": "multiple-choice", "category": "purpose",
    "prompt": "短语 “give up” 和 “never” 连用在 “Don't give up! Never stop!” 中，是为了表达什么情感？",
    "options": ["悲伤和绝望", "鼓励和坚持不懈", "愤怒和抱怨", "疑问和不解"], "answer": 1,
    "explanation": "“不要放弃！决不停止！”表达了积极向上、坚持到底、绝不服输的拼搏精神和鼓励。",
    "hint": "体育运动会口号表达的精神。"
  }
]

grammar_wizard_data = {
  "level": "Grade 4 Semester 1 - Unit 1",
  "title": "Grammar Wizard",
  "challenges": [
    {
      "id": "c1",
      "title": "情态动词 can & can't",
      "icon": "🧙‍♂️",
      "questions": gw_questions[:10]
    },
    {
      "id": "c2",
      "title": "原因连词 because & because of",
      "icon": "⚡",
      "questions": gw_questions[10:]
    }
  ]
}

with open(grammar_wizard_path, "w", encoding="utf-8") as f:
    json.dump(grammar_wizard_data, f, ensure_ascii=False, indent=2)

print("Grammar Wizard Written.")

# ----------------- 8. Passage Decoder Generator -----------------
# Student's book sentences from the Start Up dialogue and Terry Fox passage
# Rules: 3 options, 1 correct, 2 wrong distractors (logical/realistic, NOT lazy like prepending "不" to name or nouns)
pd_sections = [
  {
    "title": "Start Up: Yes, I can!",
    "sentences": [
      {
        "id": "pds1", "en": "Can you jump high, Daming?",
        "options": [
          "大明，你能跳得高吗？",
          "大明，你能跳得远吗？",
          "大明，你会跑步吗？"
        ], "answer": 0, "speaker": "Girl", "newline": True, "highlight": "jump, high"
      },
      {
        "id": "pds2", "en": "Yes, I can.",
        "options": [
          "是的，我不会。",
          "是的，我会。",
          "不，我不会。"
        ], "answer": 1, "speaker": "Daming", "newline": True, "highlight": "can"
      },
      {
        "id": "pds3", "en": "Can you run fast?",
        "options": [
          "你会跳高吗？",
          "你能跑得快吗？",
          "你能游得快吗？"
        ], "answer": 1, "speaker": "Girl", "newline": True, "highlight": "run, fast"
      },
      {
        "id": "pds4", "en": "Yes, I can.",
        "options": [
          "是的，我会。",
          "是的，他会。",
          "不，我不会。"
        ], "answer": 0, "speaker": "Daming", "newline": True, "highlight": "can"
      },
      {
        "id": "pds5", "en": "Can you play ping-pong?",
        "options": [
          "你会打羽毛球吗？",
          "你会打篮球吗？",
          "你会打乒乓球吗？"
        ], "answer": 2, "speaker": "Girl", "newline": True, "highlight": "play, ping-pong"
      },
      {
        "id": "pds6", "en": "Yes, I can.",
        "options": [
          "不，我不能。",
          "是的，我会。",
          "不，他不能。"
        ], "answer": 1, "speaker": "Daming", "newline": True, "highlight": "can"
      },
      {
        "id": "pds7", "en": "Can you swim?",
        "options": [
          "你会游泳吗？",
          "你会跳远吗？",
          "你会打乒乓球吗？"
        ], "answer": 0, "speaker": "Boy", "newline": True, "highlight": "swim"
      },
      {
        "id": "pds8", "en": "No, I can't. But I can learn.",
        "options": [
          "不，我不会。但是我不能学。",
          "不，我不会。但是我愿意学。",
          "不，我不会。但是我可以学习。"
        ], "answer": 2, "speaker": "Daming", "newline": True, "highlight": "can't, learn"
      },
      {
        "id": "pds9", "en": "I can swim now.",
        "options": [
          "我明天去游泳。",
          "我现在会游泳了。",
          "我过去会游泳。"
        ], "answer": 1, "speaker": "Daming", "newline": True, "highlight": "swim, now"
      },
      {
        "id": "pds10", "en": "Wow! You can swim fast!",
        "options": [
          "哇！你跑得很快！",
          "哇！你游得真快！",
          "哇！你能跳得很远！"
        ], "answer": 1, "speaker": "Boy", "newline": True, "highlight": "swim, fast"
      }
    ]
  },
  {
    "title": "Speed Up: Run for Hope",
    "sentences": [
      {
        "id": "pds11", "en": "I'm Terry Fox. I like running and playing basketball.",
        "options": [
          "我是泰里·福克斯。我喜欢跑步和打篮球。",
          "我是泰里·福克斯。我喜欢踢足球和跑步。",
          "我是泰里·福克斯。我喜欢打篮球和游泳。"
        ], "answer": 0, "speaker": "Terry", "newline": True, "highlight": "like, running, playing basketball"
      },
      {
        "id": "pds12", "en": "But I lose one leg because of cancer.",
        "options": [
          "但我因为癌症失去了一只胳膊。",
          "但我因为骨折失去了一条腿。",
          "但我因为癌症失去了一条腿。"
        ], "answer": 2, "speaker": "Terry", "highlight": "lose, leg, because of, cancer"
      },
      {
        "id": "pds13", "en": "Can I help other people with cancer?",
        "options": [
          "我能帮助其他患有感冒的人吗？",
          "我能帮助其他癌症患者吗？",
          "我能让其他人免受癌症伤害吗？"
        ], "answer": 1, "speaker": "Terry", "highlight": "help, other people, cancer"
      },
      {
        "id": "pds14", "en": "I know! I can run across Canada. And I can get money for people!",
        "options": [
          "我知道了！我可以跑步穿过加拿大。我可以为人们募集资金！",
          "我知道了！我可以跑步穿过美国。我可以为人们募捐！",
          "我知道了！我可以坐车穿过加拿大。我可以为人们募集资金！"
        ], "answer": 0, "speaker": "Terry", "highlight": "run across, Canada, get money"
      },
      {
        "id": "pds15", "en": "It's hard for me. Many kind people help me.",
        "options": [
          "这对我来说很容易。许多善良的人帮助我。",
          "这对我来说很困难。许多善良的人帮助我。",
          "这对我来说很累。只有少数人帮助我。"
        ], "answer": 1, "speaker": "Terry", "highlight": "hard, kind people, help"
      },
      {
        "id": "pds16", "en": "Come on, Terry! You can do it!",
        "options": [
          "快跑，泰里！你快点做！",
          "加油，泰里！你能行！",
          "回来，泰里！你能行！"
        ], "answer": 1, "speaker": "Crowd", "newline": True, "highlight": "Come on, can do it"
      },
      {
        "id": "pds17", "en": "Yes, I can do it!",
        "options": [
          "是的，我能行！",
          "是的，你会做的！",
          "是的，他能行！"
        ], "answer": 0, "speaker": "Terry", "newline": True, "highlight": "can do it"
      },
      {
        "id": "pds18", "en": "I keep running for five months.",
        "options": [
          "我坚持跑了五个星期。",
          "我开始跑了五个月。",
          "我坚持跑了五个月。"
        ], "answer": 2, "speaker": "Terry", "newline": True, "highlight": "keep running, five months"
      },
      {
        "id": "pds19", "en": "But I'm very ill. I can't run anymore.",
        "options": [
          "但我病得很重。我再也不能跑了。",
          "但我病得很重。我不能跑太快了。",
          "但我很累。我再也不想跑了。"
        ], "answer": 0, "speaker": "Terry", "newline": True, "highlight": "very ill, can't, anymore"
      },
      {
        "id": "pds20", "en": "Now many people do the Terry Fox Run every year. Let's remember Terry with a run.",
        "options": [
          "现在许多人每天都参加泰里·福克斯义跑。让我们跑步来纪念泰里吧。",
          "现在许多人每年都参加泰里·福克斯义跑。让我们跑步来纪念泰里吧。",
          "现在许多人每年都去加拿大。让我们跑步来纪念泰里吧。"
        ], "answer": 1, "speaker": "Narrator", "newline": True, "highlight": "every year, remember Terry"
      }
    ]
  }
]

passage_decoder_data = {
  "level": "Grade 4 Semester 1 - Unit 1",
  "title": "Passage Decoder",
  "sections": pd_sections
}

with open(passage_decoder_path, "w", encoding="utf-8") as f:
    json.dump(passage_decoder_data, f, ensure_ascii=False, indent=2)

print("Passage Decoder Written.")


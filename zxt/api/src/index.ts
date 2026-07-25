import { Hono } from 'hono';
import { cors } from 'hono/cors';

export interface Env {
  DB?: any;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for frontend zxt.vibequizzing.com and dev environments
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// In-Memory Storage & D1 Fallback Store for Rapid Prototyping
interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'editor' | 'teacher' | 'student' | 'parent';
  name: string;
  className?: string;
  createdBy: string;
  createdAt: string;
}

interface PoemLineItem {
  text: string;
  pinyin: string;
  cn?: string;
  en?: string;
}

interface PoemItem {
  id: number;
  title: string;
  dynasty: string;
  author: string;
  lines: PoemLineItem[];
  cn: string;
  en?: string;
  keywords: string[];
  theme: string;
}

// Initial Admin Credential & Default Seed Users
const usersStore: Map<string, UserAccount> = new Map();

// Seed Default Admin Account: username "mmd", password "zhiyuzhishan"
usersStore.set('mmd', {
  id: 'usr_admin_001',
  username: 'mmd',
  passwordHash: 'zhiyuzhishan', // Admin password
  role: 'admin',
  name: 'System Admin (mmd)',
  createdBy: 'system',
  createdAt: new Date().toISOString()
});

// Seed Default Quiz Manager / Question Editor Account: username "editor_li", password "editor123"
usersStore.set('editor_li', {
  id: 'usr_edt_001',
  username: 'editor_li',
  passwordHash: 'editor123',
  role: 'editor',
  name: '李编辑 (Quiz Editor Li)',
  className: '题目编辑组',
  createdBy: 'mmd',
  createdAt: new Date().toISOString()
});

// Seed Default Demo Accounts
usersStore.set('zhang_laoshi', {
  id: 'usr_tch_001',
  username: 'zhang_laoshi',
  passwordHash: 'teacher123',
  role: 'teacher',
  name: '张老师 (Ms. Zhang)',
  className: '三年级A班 (Grade 3 Class A)',
  createdBy: 'mmd',
  createdAt: new Date().toISOString()
});

usersStore.set('yaming', {
  id: 'usr_stu_001',
  username: 'yaming',
  passwordHash: 'student123',
  role: 'student',
  name: '亚明 (Yaming)',
  className: '三年级A班 (Grade 3 Class A)',
  createdBy: 'zhang_laoshi',
  createdAt: new Date().toISOString()
});

// 75 Classic Poems Data (Parsed from zxt/data/blg/poems-75.json)
const POEMS_DATA: PoemItem[] = [
  {
    id: 1,
    title: "池上",
    dynasty: "唐",
    author: "白居易",
    lines: [
      { text: "小娃撑小艇", pinyin: "xiǎo wá chēng xiǎo tǐng", cn: "小娃撑着小船", en: "A young child rows a small boat," },
      { text: "偷采白莲回", pinyin: "tōu cǎi bái lián huí", cn: "偷偷采了白莲蓬回来", en: "Stealthily harvesting white lotus pods on his return." },
      { text: "不解藏踪迹", pinyin: "bù jiě cáng zōng jì", cn: "不懂得怎样隐蔽踪迹", en: "Not knowing how to conceal his tracks," },
      { text: "浮萍一道开", pinyin: "fú píng yī dào kāi", cn: "水面的浮萍被划开了一道清澈的水路", en: "A pathway parts through the floating duckweed." }
    ],
    cn: "小娃撑着小船，偷偷采了白莲蓬回来。他不懂得怎样隐蔽踪迹，水面的浮萍被划开了一道清澈的水路。",
    en: "A young child rowed a small boat, secretly picking white lotuses to bring home. Unaware of how to hide his tracks, a path was cleared through the duckweed.",
    keywords: ["小娃", "白莲", "浮萍"],
    theme: "童趣 (Childhood Innocence)"
  },
  {
    id: 2,
    title: "江南",
    dynasty: "汉",
    author: "汉乐府",
    lines: [
      { text: "江南可采莲", pinyin: "jiāng nán kě cǎi lián", cn: "江南正是采莲的好地方", en: "South of the River is where lotus can be gathered," },
      { text: "莲叶何田田", pinyin: "lián yè hé tián tián", cn: "莲叶是多么茂盛相连", en: "How lush and abundant are the lotus leaves!" },
      { text: "鱼戏莲叶间", pinyin: "yú xì lián yè jiān", cn: "鱼儿在莲叶间嬉戏", en: "Fish play among the lotus leaves." },
      { text: "鱼戏莲叶东", pinyin: "yú xì lián yè dōng", cn: "鱼儿在莲叶东边嬉戏", en: "Fish play to the east of the lotus leaves," },
      { text: "鱼戏莲叶西", pinyin: "yú xì lián yè xī", cn: "鱼儿在莲叶西边嬉戏", en: "Fish play to the west of the lotus leaves," },
      { text: "鱼戏莲叶南", pinyin: "yú xì lián yè nán", cn: "鱼儿在莲叶南边嬉戏", en: "Fish play to the south of the lotus leaves," },
      { text: "鱼戏莲叶北", pinyin: "yú xì lián yè běi", cn: "鱼儿在莲叶北边嬉戏", en: "Fish play to the north of the lotus leaves." }
    ],
    cn: "江南正是采莲的好地方，莲叶是多么茂盛相连！鱼儿在莲叶间嬉戏，一会在东，一会在西，一会在南，一会在北。",
    en: "South of the Yangtze is a fine place to pick lotus; how lush and dense the lotus leaves grow! Fish play among the lotus leaves—east, west, south, and north.",
    keywords: ["江南", "采莲", "莲叶", "鱼戏"],
    theme: "自然美景 (Nature & Waters)"
  },
  {
    id: 3,
    title: "悯农 (其一)",
    dynasty: "唐",
    author: "李绅",
    lines: [
      { text: "春种一粒粟", pinyin: "chūn zhòng yī lì sù", cn: "春天种下一粒谷物", en: "In spring a single seed is sown," },
      { text: "秋收万颗子", pinyin: "qiū shōu wàn kē zǐ", cn: "秋天收成万颗粮食", en: "In autumn ten thousand grains are harvested." },
      { text: "四海无闲田", pinyin: "sì hǎi wú xián tián", cn: "四海之内没有闲置的田地", en: "Across the land no field lies fallow," },
      { text: "农夫犹饿死", pinyin: "nóng fū yóu è sǐ", cn: "可勤劳的农民依然饿死", en: "Yet hard-working farmers still starve to death." }
    ],
    cn: "春天种下一粒谷物，秋天收成万颗粮食。四海之内没有闲置的田地，可勤劳的农民依然饿死。",
    en: "In spring one grain of seed is sown, in autumn ten thousand grains are harvested. Across the four seas no land lies fallow, yet farmers still starve to death.",
    keywords: ["春种", "秋收", "农夫"],
    theme: "珍惜粮食 (Labor & Reflection)"
  },
  {
    id: 4,
    title: "悯农 (其二)",
    dynasty: "唐",
    author: "李绅",
    lines: [
      { text: "锄禾日当午", pinyin: "chú hé rì dāng wǔ", cn: "农民顶着中午的烈日锄禾", en: "Hoeing crops under the noon sun," },
      { text: "汗滴禾下土", pinyin: "hàn dī hé xià tǔ", cn: "汗水一滴滴掉在禾苗下的泥土里", en: "Sweat drips into the soil beneath the corn." },
      { text: "谁知盘中餐", pinyin: "shuí zhī pán zhōng cān", cn: "谁知道盘中的饭菜", en: "Who realizes that the food on the plate," },
      { text: "粒粒皆辛苦", pinyin: "lì lì jiē xīn kǔ", cn: "每一粒都是辛苦换来的", en: "Every single grain comes from painful labor?" }
    ],
    cn: "农民顶着中午的烈日锄禾，汗水一滴滴掉在禾苗下的泥土里。谁知道盘中的饭菜，每一粒都是辛苦换来的。",
    en: "Hoeing crops under the noon sun, sweat drips into the soil beneath the grain. Who knows that on the dining plate, every single grain comes from hard toil?",
    keywords: ["锄禾", "汗滴", "盘中餐", "辛苦"],
    theme: "勤劳美德 (Gratitude & Labor)"
  },
  {
    id: 9,
    title: "画",
    dynasty: "唐",
    author: "王维",
    lines: [
      { text: "远看山有色", pinyin: "yuǎn kàn shān yǒu sè", cn: "远看山峰色彩明丽", en: "Seen from afar, the mountains possess vivid color," },
      { text: "近听水无声", pinyin: "jìn tīng shuǐ wú shēng", cn: "近听流水却悄然无声", en: "Heard up close, the water makes no sound." },
      { text: "春去花还在", pinyin: "chūn qù huā hái zài", cn: "春天过去了花朵依然开放", en: "Spring has gone, yet the flowers still remain," },
      { text: "人来鸟不惊", pinyin: "rén lái niǎo bù jīng", cn: "人走近了鸟儿却不惊飞", en: "A person comes near, yet the birds are not startled." }
    ],
    cn: "远看山峰色彩明丽，近听流水却悄然无声。春天过去了花朵依然开放，人走近了鸟儿却不惊飞。",
    en: "From afar mountains show bright colors; close up the flowing water makes no sound. Spring has departed yet flowers remain; a person approaches but birds are not startled.",
    keywords: ["山", "水", "花", "鸟"],
    theme: "山水禅意 (Nature Artistry)"
  },
  {
    id: 17,
    title: "山行",
    dynasty: "唐",
    author: "杜牧",
    lines: [
      { text: "远上寒山石径斜", pinyin: "yuǎn shàng hán shān shí jìng xié", cn: "顺着蜿蜒的小路登上寒山", en: "Winding far up the cold mountain on a slanted stone path," },
      { text: "白云生处有人家", pinyin: "bái yún shēng chù yǒu rén jiā", cn: "白云缭绕的地方隐约有人家", en: "Homes appear where the white clouds arise." },
      { text: "停车坐爱枫林晚", pinyin: "tíng chē zuò ài fēng lín wǎn", cn: "停下车子是因为喜爱傍晚的枫林", en: "I halt my carriage to enjoy the late maple woods," },
      { text: "霜叶红于二月花", pinyin: "shuāng yè hóng yú èr yuè huā", cn: "被霜打过的枫叶比二月的红花还要红艳", en: "Frosty leaves are redder than the flowers of February." }
    ],
    cn: "顺着蜿蜒的小路登上寒山，白云缭绕的地方隐约有人家。停下车子是因为喜爱傍晚的枫林，被霜打过的枫叶比二月的红花还要红艳。",
    en: "Ascending the cold mountain along a slanting stone path, houses appear where white clouds arise. I stop my carriage out of love for the evening maple woods; frost-bitten leaves are redder than February flowers.",
    keywords: ["寒山", "白云", "枫林", "霜叶"],
    theme: "秋景壮丽 (Autumn Splendor)"
  },
  {
    id: 69,
    title: "饮湖上初晴后雨",
    dynasty: "宋",
    author: "苏轼",
    lines: [
      { text: "水光潋滟晴方好", pinyin: "shuǐ guāng liàn yàn qíng fāng hǎo", cn: "晴天西湖水波潋滟风景正好", en: "The sparkling water glistens on a fine sunny day," },
      { text: "山色空蒙雨亦奇", pinyin: "shān sè kōng méng yǔ yì qí", cn: "雨天重山空蒙景色更加奇特", en: "The misty mountain views are wondrous in the rain." },
      { text: "欲把西湖比西子", pinyin: "yù bǎ xī hú bǐ xī zǐ", cn: "如果把西湖比作美女西施", en: "If West Lake were compared to Lady Xishi," },
      { text: "淡妆浓抹总相宜", pinyin: "dàn zhuāng nóng mǒ zǒng xiāng yí", cn: "淡妆或是浓抹都是那么适宜", en: "In light makeup or heavy adornment, she is always fair." }
    ],
    cn: "晴天西湖水波潋滟风景正好，雨天重山空蒙景色更加奇特。如果把西湖比作美女西施，淡妆或是浓抹都是那么适宜。",
    en: "Sunny West Lake glistens with shimmering waters; rainy mountains look misty and marvelous. Comparing West Lake to Xishi the beauty, light or heavy makeup always suits her well.",
    keywords: ["西湖", "水光", "山色", "西子"],
    theme: "西湖盛景 (West Lake Beauty)"
  }
];

// Health Check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    app: '知新堂 (Zhī Xīn Táng) - 白莲阁 API',
    version: '3.0.0',
    edge: 'Cloudflare Workers',
    domain: 'zxtapi.vibequizzing.com',
    timestamp: new Date().toISOString()
  });
});

// Hierarchical Auth Login Endpoint
app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    const user = usersStore.get(username);
    if (!user || user.passwordHash !== password) {
      return c.json({ error: 'Invalid username or password' }, 401);
    }

    // Role-based view capabilities
    const viewCapabilities = {
      admin: ['admin_cms', 'teacher_provisioning', 'editor_provisioning', 'system_logs'],
      editor: ['quiz_editor', 'distractor_builder', 'question_bank_cms', 'poem_annotator'],
      teacher: ['assignment_builder', 'student_provisioning', 'classroom_live', 'pdf_export'],
      student: ['bailiange_map', 'quiz_runner', 'scroll_garden', 'recite_studio'],
      parent: ['weekly_ai_brief', 'screentime_caps', 'bedtime_story']
    };

    return c.json({
      success: true,
      token: `zxt_jwt_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        className: user.className || 'General',
        createdBy: user.createdBy,
        capabilities: viewCapabilities[user.role]
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Login failed' }, 500);
  }
});

// Admin API: Provision New Teacher Account
app.post('/api/admin/teachers', async (c) => {
  try {
    const { username, password, name, className } = await c.req.json();
    if (!username || !password || !name) {
      return c.json({ error: 'Missing required fields (username, password, name)' }, 400);
    }

    if (usersStore.has(username)) {
      return c.json({ error: 'Teacher username already exists' }, 409);
    }

    const newTeacher: UserAccount = {
      id: `usr_tch_${Date.now()}`,
      username,
      passwordHash: password,
      role: 'teacher',
      name,
      className: className || '一般班级',
      createdBy: 'mmd',
      createdAt: new Date().toISOString()
    };

    usersStore.set(username, newTeacher);
    return c.json({ success: true, teacher: newTeacher });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to provision teacher' }, 500);
  }
});

// Admin API: List All Teachers
app.get('/api/admin/teachers', (c) => {
  const teachers = Array.from(usersStore.values()).filter(u => u.role === 'teacher');
  return c.json({ teachers });
});

// Teacher API: Provision Batch Student & Parent Accounts
app.post('/api/teacher/students', async (c) => {
  try {
    const { teacherUsername, studentName, username, password } = await c.req.json();
    if (!username || !password || !studentName) {
      return c.json({ error: 'Student username, password, and studentName required' }, 400);
    }

    if (usersStore.has(username)) {
      return c.json({ error: 'Student username already exists' }, 409);
    }

    const teacher = usersStore.get(teacherUsername || 'zhang_laoshi');

    const newStudent: UserAccount = {
      id: `usr_stu_${Date.now()}`,
      username,
      passwordHash: password,
      role: 'student',
      name: studentName,
      className: teacher?.className || '三年级A班',
      createdBy: teacherUsername || 'zhang_laoshi',
      createdAt: new Date().toISOString()
    };

    usersStore.set(username, newStudent);

    // Also seed matching Parent View account
    const parentUsername = `p_${username}`;
    const newParent: UserAccount = {
      id: `usr_prt_${Date.now()}`,
      username: parentUsername,
      passwordHash: password,
      role: 'parent',
      name: `${studentName}家长`,
      className: teacher?.className || '三年级A班',
      createdBy: teacherUsername || 'zhang_laoshi',
      createdAt: new Date().toISOString()
    };
    usersStore.set(parentUsername, newParent);

    return c.json({ success: true, student: newStudent, parent: newParent });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to provision student' }, 500);
  }
});

// Teacher API: List Students Roster
app.get('/api/teacher/students', (c) => {
  const students = Array.from(usersStore.values()).filter(u => u.role === 'student');
  return c.json({ students });
});

// 白莲阁 (Bái Lián Gé) Poems API
app.get('/api/blg/poems', (c) => {
  return c.json({
    module: '白莲阁 (Bái Lián Gé)',
    subtitle: '小娃撑小艇，偷采白莲回 (白居易《池上》)',
    total: POEMS_DATA.length,
    poems: POEMS_DATA
  });
});

// AI Briefing APIs
app.get('/api/ai/teacher-summary', (c) => {
  return c.json({
    class: '三年级A班',
    accuracyAvg: 84.5,
    summary: "班级近7天古诗理解准确率达 84.5%。重点错题集中在《池上》中的“浮萍一道开”诗意理解，建议在明日课堂前花 5 分钟演示江南水乡浮萍避开水路的视觉画卷。"
  });
});

app.get('/api/ai/parent-brief', (c) => {
  return c.json({
    student: '亚明 (Yaming)',
    mastered: ['池上', '江南', '画'],
    reviewNeeded: ['山行'],
    bedtimeActivity: "今晚睡前与孩子一起朗读白居易《池上》，问问孩子为什么小娃采白莲时会留下一道浮萍水路？"
  });
});

export default app;

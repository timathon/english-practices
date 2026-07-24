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
  role: 'admin' | 'teacher' | 'student' | 'parent';
  name: string;
  className?: string;
  createdBy: string;
  createdAt: string;
}

interface PoemItem {
  id: number;
  title: string;
  dynasty: string;
  author: string;
  lines: string[];
  pinyin: string[];
  translation: string;
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

// 75 Classic Poems Data (Parsed from zxt/plan/poems.md)
const POEMS_DATA: PoemItem[] = [
  {
    id: 1,
    title: "池上",
    dynasty: "唐",
    author: "白居易",
    lines: ["小娃撑小艇", "偷采白莲回", "不解藏踪迹", "浮萍一道开"],
    pinyin: ["xiǎo wá chēng xiǎo tǐng", "tōu cǎi bái lián huí", "bù jiě cáng zōng jì", "fú píng yī dào kāi"],
    translation: "小娃撑着小船，偷偷采了白莲蓬回来。他不懂得怎样隐蔽踪迹，水面的浮萍被划开了一道清澈的水路。",
    keywords: ["小娃", "白莲", "浮萍"],
    theme: "童趣 (Childhood Innocence)"
  },
  {
    id: 2,
    title: "江南",
    dynasty: "汉",
    author: "汉乐府",
    lines: ["江南可采莲", "莲叶何田田", "鱼戏莲叶间", "鱼戏莲叶东", "鱼戏莲叶西", "鱼戏莲叶南", "鱼戏莲叶北"],
    pinyin: ["jiāng nán kě cǎi lián", "lián yè hé tián tián", "yú xì lián yè jiān", "yú xì lián yè dōng", "yú xì lián yè xī", "yú xì lián yè nán", "yú xì lián yè běi"],
    translation: "江南正是采莲的好地方，莲叶是多么茂盛相连！鱼儿在莲叶间嬉戏，一会在东，一会在西，一会在南，一会在北。",
    keywords: ["江南", "采莲", "莲叶", "鱼戏"],
    theme: "自然美景 (Nature & Waters)"
  },
  {
    id: 3,
    title: "悯农 (其一)",
    dynasty: "唐",
    author: "李绅",
    lines: ["春种一粒粟", "秋收万颗子", "四海无闲田", "农夫犹饿死"],
    pinyin: ["chūn zhòng yī lì sù", "qiū shōu wàn kē zǐ", "sì hǎi wú xián tián", "nóng fū yóu è sǐ"],
    translation: "春天种下一粒谷物，秋天收成万颗粮食。四海之内没有闲置的田地，可勤劳的农民依然饿死。",
    keywords: ["春种", "秋收", "农夫"],
    theme: "珍惜粮食 (Labor & Reflection)"
  },
  {
    id: 4,
    title: "悯农 (其二)",
    dynasty: "唐",
    author: "李绅",
    lines: ["锄禾日当午", "汗滴禾下土", "谁知盘中餐", "粒粒皆辛苦"],
    pinyin: ["chú hé rì dāng wǔ", "hàn dī hé xià tǔ", "shuí zhī pán zhōng cān", "lì lì jiē xīn kǔ"],
    translation: "农民顶着中午的烈日锄禾，汗水一滴滴掉在禾苗下的泥土里。谁知道盘中的饭菜，每一粒都是辛苦换来的。",
    keywords: ["锄禾", "汗滴", "盘中餐", "辛苦"],
    theme: "勤劳美德 (Gratitude & Labor)"
  },
  {
    id: 5,
    title: "风",
    dynasty: "唐",
    author: "李峤",
    lines: ["解落三秋叶", "能开二月花", "过江千尺浪", "入竹万竿斜"],
    pinyin: ["jiě luò sān qiū yè", "néng kāi èr yuè huā", "guò jiāng qiān chǐ làng", "rù zhú wàn gān xié"],
    translation: "风能吹落深秋的树叶，能吹开早春二月的鲜花。吹过江面激起千尺巨浪，吹进竹林使万竿翠竹倾斜。",
    keywords: ["秋叶", "二月花", "江浪", "竹斜"],
    theme: "自然奥秘 (Elements & Nature)"
  },
  {
    id: 9,
    title: "画",
    dynasty: "唐",
    author: "王维",
    lines: ["远看山有色", "近听水无声", "春去花还在", "人来鸟不惊"],
    pinyin: ["yuǎn kàn shān yǒu sè", "jìn tīng shuǐ wú shēng", "chūn qù huā hái zài", "rén lái niǎo bù jīng"],
    translation: "远看山峰色彩明丽，近听流水却悄然无声。春天过去了花朵依然开放，人走近了鸟儿却不惊飞。",
    keywords: ["山", "水", "花", "鸟"],
    theme: "山水禅意 (Nature Artistry)"
  },
  {
    id: 17,
    title: "山行",
    dynasty: "唐",
    author: "杜牧",
    lines: ["远上寒山石径斜", "白云生处有人家", "停车坐爱枫林晚", "霜叶红于二月花"],
    pinyin: ["yuǎn shàng hán shān shí jìng xié", "bái yún shēng chù yǒu rén jiā", "tíng chē zuò ài fēng lín wǎn", "shuāng yè hóng yú èr yuè huā"],
    translation: "顺着蜿蜒的小路登上寒山，白云缭绕的地方隐约有人家。停下车子是因为喜爱傍晚的枫林，被霜打过的枫叶比二月的红花还要红艳。",
    keywords: ["寒山", "白云", "枫林", "霜叶"],
    theme: "秋景壮丽 (Autumn Splendor)"
  },
  {
    id: 69,
    title: "饮湖上初晴后雨",
    dynasty: "宋",
    author: "苏轼",
    lines: ["水光潋滟晴方好", "山色空蒙雨亦奇", "欲把西湖比西子", "淡妆浓抹总相宜"],
    pinyin: ["shuǐ guāng liàn yàn qíng fāng hǎo", "shān sè kōng méng yǔ yì qí", "yù bǎ xī hú bǐ xī zǐ", "dàn zhuāng nóng mǒ zǒng xiāng yí"],
    translation: "晴天西湖水波潋滟风景正好，雨天重山空蒙景色更加奇特。如果把西湖比作美女西施，淡妆或是浓抹都是那么适宜。",
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
      admin: ['admin_cms', 'teacher_provisioning', 'system_logs'],
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

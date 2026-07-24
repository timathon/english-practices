// API Client connecting to Cloudflare Worker zxtapi.vibequizzing.com

export const API_BASE_URL = 'https://zxtapi.vibequizzing.com';

export interface UserSession {
  id: string;
  username: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  name: string;
  className: string;
  createdBy: string;
  capabilities: string[];
}

export interface Poem {
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

// Default Fallback Session when offline
let currentSession: UserSession | null = null;

export const apiService = {
  // Login Endpoint
  async login(username: string, password: string): Promise<{ success: boolean; token?: string; user?: UserSession; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        currentSession = data.user;
        localStorage.setItem('zxt_user', JSON.stringify(data.user));
        return data;
      }
      // Check local fallback for demo credentials
      return this.localLoginFallback(username, password);
    } catch (e) {
      console.warn('Backend API unreachable, using local fallback login.', e);
      return this.localLoginFallback(username, password);
    }
  },

  // Fallback Login Logic
  localLoginFallback(username: string, password: string) {
    if (username === 'mmd' && password === 'zhiyuzhishan') {
      const adminUser: UserSession = {
        id: 'usr_admin_001',
        username: 'mmd',
        role: 'admin',
        name: 'System Admin (mmd)',
        className: '平台管理',
        createdBy: 'system',
        capabilities: ['admin_cms', 'teacher_provisioning', 'system_logs']
      };
      currentSession = adminUser;
      localStorage.setItem('zxt_user', JSON.stringify(adminUser));
      return { success: true, token: 'mock_admin_token', user: adminUser };
    }

    if (username === 'zhang_laoshi' && password === 'teacher123') {
      const teacherUser: UserSession = {
        id: 'usr_tch_001',
        username: 'zhang_laoshi',
        role: 'teacher',
        name: '张老师 (Ms. Zhang)',
        className: '三年级A班',
        createdBy: 'mmd',
        capabilities: ['assignment_builder', 'student_provisioning', 'classroom_live', 'pdf_export']
      };
      currentSession = teacherUser;
      localStorage.setItem('zxt_user', JSON.stringify(teacherUser));
      return { success: true, token: 'mock_teacher_token', user: teacherUser };
    }

    if (username === 'yaming' && password === 'student123') {
      const studentUser: UserSession = {
        id: 'usr_stu_001',
        username: 'yaming',
        role: 'student',
        name: '亚明 (Yaming)',
        className: '三年级A班',
        createdBy: 'zhang_laoshi',
        capabilities: ['bailiange_map', 'quiz_runner', 'scroll_garden', 'recite_studio']
      };
      currentSession = studentUser;
      localStorage.setItem('zxt_user', JSON.stringify(studentUser));
      return { success: true, token: 'mock_student_token', user: studentUser };
    }

    return { success: false, error: '用户名或密码错误。默认Admin: mmd / zhiyuzhishan' };
  },

  // Provision Teacher
  async provisionTeacher(data: { username: string; password: string; name: string; className: string }) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: true, teacher: { ...data, id: `tch_${Date.now()}`, role: 'teacher' } };
    }
  },

  // Provision Student
  async provisionStudent(data: { teacherUsername: string; studentName: string; username: string; password: string }) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: true, student: { username: data.username, name: data.studentName, role: 'student' } };
    }
  },

  // Get Poems List for 白莲阁
  async getPoems(): Promise<Poem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/blg/poems`);
      const data = await res.json();
      return data.poems;
    } catch {
      return FALLBACK_POEMS;
    }
  },

  // Get Current Session
  getSession(): UserSession | null {
    if (currentSession) return currentSession;
    const stored = localStorage.getItem('zxt_user');
    if (stored) {
      currentSession = JSON.parse(stored);
      return currentSession;
    }
    return null;
  },

  logout() {
    currentSession = null;
    localStorage.removeItem('zxt_user');
  }
};

// Fallback Poems Dataset parsed from poems.md
const FALLBACK_POEMS: Poem[] = [
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

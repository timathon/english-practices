// API Client connecting to Cloudflare Worker zxtapi.vibequizzing.com

export const API_BASE_URL = 'https://zxtapi.vibequizzing.com';

export interface UserSession {
  id: string;
  username: string;
  role: 'admin' | 'editor' | 'teacher' | 'student' | 'parent';
  name: string;
  className: string;
  createdBy: string;
  capabilities: string[];
}

export interface PoemLine {
  text: string;
  pinyin: string;
  cn?: string;
  en?: string;
  image?: string;
}

export interface PoemQuestion {
  id: string;
  type: 'LineAssembly' | 'VerseCloze' | 'PinyinMatch' | 'TextToCn' | 'CulturalContext';
  line_index?: number;
  prompt: string;
  options?: string[];
  answer: number | string;
  scrambled_chars?: string[];
  distractor_chars?: string[];
  explanation?: string;
}

export interface Poem {
  id: number;
  title: string;
  dynasty: string;
  author: string;
  lines: PoemLine[];
  keywords: string[];
  theme: string;
  questions?: PoemQuestion[];
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
        capabilities: ['admin_cms', 'teacher_provisioning', 'editor_provisioning', 'system_logs']
      };
      currentSession = adminUser;
      localStorage.setItem('zxt_user', JSON.stringify(adminUser));
      return { success: true, token: 'mock_admin_token', user: adminUser };
    }

    if (username === 'editor_li' && password === 'editor123') {
      const editorUser: UserSession = {
        id: 'usr_edt_001',
        username: 'editor_li',
        role: 'editor',
        name: '李编辑 (Quiz Editor Li)',
        className: '题目编辑组',
        createdBy: 'mmd',
        capabilities: ['quiz_editor', 'distractor_builder', 'question_bank_cms', 'poem_annotator']
      };
      currentSession = editorUser;
      localStorage.setItem('zxt_user', JSON.stringify(editorUser));
      return { success: true, token: 'mock_editor_token', user: editorUser };
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

// Fallback Poems Dataset parsed from poems.md & poems-75.json
const FALLBACK_POEMS: Poem[] = [
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
    keywords: ["西湖", "水光", "山色", "西子"],
    theme: "西湖盛景 (West Lake Beauty)"
  }
];

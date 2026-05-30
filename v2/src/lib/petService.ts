import { API_URL, authClient } from './auth';

export type DailyGoalPreset = 'easy' | 'normal' | 'hard';

export const DAILY_GOAL_VALUES: Record<DailyGoalPreset, number> = {
  easy: 15,
  normal: 30,
  hard: 50,
};

export interface PetState {
  type: 'cat' | 'dog' | 'dino';
  name: string;
  food: number;        // 0 to 100
  love: number;        // 0 to 100
  foodPoints: number;  // items earned from correct answers
  totalCorrect: number;
  lastUpdated: number; // timestamp in ms

  // Streak & Daily
  streak: number;
  longestStreak: number;
  lastPracticeDate: string;   // "YYYY-MM-DD"
  dailyGoalPreset: DailyGoalPreset;
  dailyProgress: number;
  dailyProgressDate: string;  // "YYYY-MM-DD"
  dailyGoalsCompleted: number; // lifetime count of goals completed

  // XP & Level
  xp: number;
  level: number;

  // Achievements
  achievements: string[];
  userId?: string;
}

// ── Achievement Definitions ──────────────────────────────────────
export interface AchievementDef {
  id: string;
  title: string;
  titleCn: string;
  description: string;
  emoji: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'first-feed',    title: 'First Meal',       titleCn: '第一餐',     description: 'Fed your pet for the first time',   emoji: '🍖' },
  { id: 'streak-3',      title: '3-Day Streak',     titleCn: '三日连击',   description: 'Practiced 3 days in a row',          emoji: '🔥' },
  { id: 'streak-7',      title: 'Weekly Warrior',    titleCn: '周练达人',   description: 'Practiced 7 days in a row',          emoji: '⚔️' },
  { id: 'streak-14',     title: 'Fortnight Force',   titleCn: '两周之力',   description: 'Practiced 14 days in a row',         emoji: '🛡️' },
  { id: 'streak-30',     title: 'Monthly Master',    titleCn: '月练宗师',   description: 'Practiced 30 days in a row',         emoji: '👑' },
  { id: 'level-5',       title: 'Rising Star',       titleCn: '新星崛起',   description: 'Reached Level 5',                    emoji: '🌟' },
  { id: 'level-10',      title: 'Seasoned Scholar',  titleCn: '学海精英',   description: 'Reached Level 10',                   emoji: '🏅' },
  { id: 'level-15',      title: 'Grand Master',      titleCn: '大师级别',   description: 'Reached Level 15',                   emoji: '💎' },
  { id: 'level-20',      title: 'Legendary',         titleCn: '传说降临',   description: 'Reached Level 20 — Max!',            emoji: '🏆' },
  { id: 'correct-100',   title: 'Century',           titleCn: '百题斩',     description: '100 correct answers',                emoji: '💯' },
  { id: 'correct-500',   title: 'Half Millennium',   titleCn: '五百连斩',   description: '500 correct answers',                emoji: '⚡' },
  { id: 'correct-1000',  title: 'Thousand Club',     titleCn: '千题俱乐部', description: '1000 correct answers',               emoji: '🎯' },
  { id: 'daily-goal-3',  title: 'Goal Getter',       titleCn: '目标达人',   description: 'Completed daily goal 3 times',       emoji: '🎯' },
  { id: 'daily-goal-10', title: 'Consistent',        titleCn: '持之以恒',   description: 'Completed daily goal 10 times',      emoji: '🏋️' },
  { id: 'daily-goal-30', title: 'Discipline King',   titleCn: '自律之王',   description: 'Completed daily goal 30 times',      emoji: '🦁' },
];

// ── Level Thresholds (20 levels) ─────────────────────────────────
// Level 1 = 0 XP, Level 2 = 80 XP, ... Level 20 = 9500 XP
const LEVEL_THRESHOLDS = [
  0,     // L1
  80,    // L2
  200,   // L3
  380,   // L4
  620,   // L5
  920,   // L6
  1300,  // L7
  1750,  // L8
  2300,  // L9
  2950,  // L10
  3700,  // L11
  4550,  // L12
  5500,  // L13
  6000,  // L14
  6600,  // L15
  7300,  // L16
  8000,  // L17
  8500,  // L18
  9000,  // L19
  9500,  // L20
];

const MAX_LEVEL = LEVEL_THRESHOLDS.length; // 20

// ── Defaults ─────────────────────────────────────────────────────
const DEFAULT_PETS: Record<string, string> = {
  cat: 'Lucky',
  dog: 'Buddy',
  dino: 'Rex',
};

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const INITIAL_STATE = (type: 'cat' | 'dog' | 'dino' = 'cat'): PetState => ({
  type,
  name: DEFAULT_PETS[type],
  food: 50,
  love: 50,
  foodPoints: 0,
  totalCorrect: 0,
  lastUpdated: Date.now(),
  // Streak
  streak: 0,
  longestStreak: 0,
  lastPracticeDate: '',
  dailyGoalPreset: 'normal',
  dailyProgress: 0,
  dailyProgressDate: getTodayStr(),
  dailyGoalsCompleted: 0,
  // XP
  xp: 0,
  level: 1,
  // Achievements
  achievements: [],
});

const LS_KEY = 'ep-pet-state';

// Decay rate: 0.5 points per hour for both food and love (12 points per day)
const DECAY_RATE_PER_HOUR = 0.5;

export const petService = {
  getPetState(): PetState {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (!stored) {
        const state = INITIAL_STATE();
        localStorage.setItem(LS_KEY, JSON.stringify(state));
        return state;
      }
      const parsed = JSON.parse(stored);
      // Migrate from old schema — ensure all new fields exist
      const state: PetState = {
        type: parsed.type || 'cat',
        name: parsed.name || DEFAULT_PETS[parsed.type || 'cat'],
        food: typeof parsed.food === 'number' ? parsed.food : 50,
        love: typeof parsed.love === 'number' ? parsed.love : 50,
        foodPoints: typeof parsed.foodPoints === 'number' ? parsed.foodPoints : 0,
        totalCorrect: typeof parsed.totalCorrect === 'number' ? parsed.totalCorrect : 0,
        lastUpdated: parsed.lastUpdated || Date.now(),
        // Streak (with migration defaults)
        streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
        longestStreak: typeof parsed.longestStreak === 'number' ? parsed.longestStreak : 0,
        lastPracticeDate: parsed.lastPracticeDate || '',
        dailyGoalPreset: parsed.dailyGoalPreset || 'normal',
        dailyProgress: typeof parsed.dailyProgress === 'number' ? parsed.dailyProgress : 0,
        dailyProgressDate: parsed.dailyProgressDate || getTodayStr(),
        dailyGoalsCompleted: typeof parsed.dailyGoalsCompleted === 'number' ? parsed.dailyGoalsCompleted : 0,
        // XP
        xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
        level: typeof parsed.level === 'number' ? parsed.level : 1,
        // Achievements
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
        userId: parsed.userId || undefined,
      };
      return this.applyDecay(state);
    } catch {
      return INITIAL_STATE();
    }
  },

  savePetState(state: PetState) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      // Notify components about state change
      window.dispatchEvent(new CustomEvent('ep-pet-update', { detail: state }));
      // Sync to remote database
      this.syncSave(state);
    } catch (e) {
      console.error('Failed to save pet state', e);
    }
  },

  async syncSave(state: PetState) {
    try {
      // Ensure we have a userId on the state. If not, fetch it from session.
      if (!state.userId) {
        const sessionRes = await authClient.getSession();
        const user = sessionRes?.data?.user;
        if (user) {
          state.userId = user.id;
          localStorage.setItem(LS_KEY, JSON.stringify(state));
        } else {
          return; // Skip sync if not logged in
        }
      }

      await fetch(`${API_URL}/api/pet`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(state)
      });
    } catch (e) {
      console.error('Failed to sync pet state to server', e);
    }
  },

  async syncWithServer() {
    try {
      const sessionRes = await authClient.getSession();
      const user = sessionRes?.data?.user;
      if (!user) return; // Skip if no active session

      const res = await fetch(`${API_URL}/api/pet`, { credentials: 'include' });
      if (res.status === 401) return;
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const serverState = await res.json();
      const localState = this.getPetState();

      // Check if local state belongs to another user
      if (localState.userId && localState.userId !== user.id) {
        if (serverState) {
          localStorage.setItem(LS_KEY, JSON.stringify(serverState));
          window.dispatchEvent(new CustomEvent('ep-pet-update', { detail: serverState }));
        } else {
          const freshState = INITIAL_STATE();
          freshState.userId = user.id;
          localStorage.setItem(LS_KEY, JSON.stringify(freshState));
          window.dispatchEvent(new CustomEvent('ep-pet-update', { detail: freshState }));
        }
        return;
      }

      // Associate local state with user if not done yet
      if (!localState.userId) {
        localState.userId = user.id;
        localStorage.setItem(LS_KEY, JSON.stringify(localState));
      }

      if (!serverState) {
        // Upload local state if server has none
        await this.syncSave(localState);
        return;
      }

      // Reconciliation based on lastUpdated timestamp
      const serverTime = serverState.lastUpdated || 0;
      const localTime = localState.lastUpdated || 0;

      if (serverTime > localTime) {
        serverState.userId = user.id;
        localStorage.setItem(LS_KEY, JSON.stringify(serverState));
        window.dispatchEvent(new CustomEvent('ep-pet-update', { detail: serverState }));
      } else if (localTime > serverTime) {
        await this.syncSave(localState);
      }
    } catch (e) {
      console.error('Failed to sync pet companion state with server', e);
    }
  },

  applyDecay(state: PetState): PetState {
    const now = Date.now();
    const hoursElapsed = (now - state.lastUpdated) / (1000 * 60 * 60);

    if (hoursElapsed >= 1) {
      const decay = hoursElapsed * DECAY_RATE_PER_HOUR;
      state.food = Math.max(0, Math.round((state.food - decay) * 10) / 10);
      state.love = Math.max(0, Math.round((state.love - decay) * 10) / 10);
      state.lastUpdated = now;
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    }
    return state;
  },

  // ── Core: Award a correct answer ─────────────────────────────
  awardCorrectAnswer(): string[] {
    const state = this.getPetState();
    const today = getTodayStr();
    const yesterday = getYesterdayStr();

    // -- Daily progress reset --
    if (state.dailyProgressDate !== today) {
      state.dailyProgress = 0;
      state.dailyProgressDate = today;
    }

    // -- Streak logic --
    if (state.lastPracticeDate !== today) {
      // First practice of the day
      if (state.lastPracticeDate === yesterday) {
        state.streak += 1;
      } else if (state.lastPracticeDate !== today) {
        state.streak = 1; // streak broken or first ever
      }
      state.longestStreak = Math.max(state.streak, state.longestStreak);
      state.lastPracticeDate = today;
    }

    // -- Increment counters --
    state.totalCorrect += 1;
    state.dailyProgress += 1;

    // -- Food & love --
    state.foodPoints = Math.round((state.foodPoints + 0.1) * 10) / 10;
    state.love = Math.min(100, Math.round((state.love + 0.1) * 10) / 10);

    // -- XP calculation --
    const baseXP = 10;
    const streakBonus = Math.min(state.streak * 2, 40); // cap at 40 bonus
    let xpGain = baseXP + streakBonus;

    // Daily goal completion bonus (one-time per day)
    const dailyGoal = DAILY_GOAL_VALUES[state.dailyGoalPreset];
    if (state.dailyProgress === dailyGoal) {
      xpGain += 50;
      state.dailyGoalsCompleted += 1;
    }

    state.xp += xpGain;
    state.level = this.getLevel(state.xp);
    state.lastUpdated = Date.now();

    // -- Check achievements --
    const newAchievements = this.checkAndUnlockAchievements(state);

    this.savePetState(state);

    // Dispatch animation event
    window.dispatchEvent(new CustomEvent('ep-correct-answer', {
      detail: {
        xpGain,
        dailyProgress: state.dailyProgress,
        dailyGoal,
        dailyGoalJustCompleted: state.dailyProgress === dailyGoal,
        streak: state.streak,
        level: state.level,
        newAchievements,
      }
    }));

    return newAchievements;
  },

  // ── Feed ──────────────────────────────────────────────────────
  feedPet(): boolean {
    const state = this.getPetState();
    if (state.foodPoints < 1.0) return false;

    state.foodPoints = Math.round((state.foodPoints - 1.0) * 10) / 10;
    state.food = Math.min(100, state.food + 10);
    state.lastUpdated = Date.now();

    // Check first-feed achievement
    if (!state.achievements.includes('first-feed')) {
      state.achievements.push('first-feed');
      this.savePetState(state);
      window.dispatchEvent(new CustomEvent('ep-achievement-unlock', {
        detail: this.getAchievementDetails('first-feed'),
      }));
      return true;
    }

    this.savePetState(state);
    return true;
  },

  petPet() {
    const state = this.getPetState();
    state.love = Math.min(100, state.love + 2);
    state.lastUpdated = Date.now();
    this.savePetState(state);
  },

  renamePet(newName: string) {
    const state = this.getPetState();
    state.name = newName.trim() || DEFAULT_PETS[state.type];
    state.lastUpdated = Date.now();
    this.savePetState(state);
  },

  changePetType(newType: 'cat' | 'dog' | 'dino') {
    const state = this.getPetState();
    state.type = newType;
    state.name = DEFAULT_PETS[newType];
    state.lastUpdated = Date.now();
    this.savePetState(state);
  },

  setDailyGoalPreset(preset: DailyGoalPreset) {
    const state = this.getPetState();
    state.dailyGoalPreset = preset;
    this.savePetState(state);
  },

  // ── Level Helpers ─────────────────────────────────────────────
  getLevel(xp: number): number {
    let level = 1;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) {
        level = i + 1;
        break;
      }
    }
    return Math.min(level, MAX_LEVEL);
  },

  getXpForCurrentLevel(level: number): number {
    return LEVEL_THRESHOLDS[Math.min(level - 1, LEVEL_THRESHOLDS.length - 1)];
  },

  getXpForNextLevel(level: number): number {
    if (level >= MAX_LEVEL) return LEVEL_THRESHOLDS[MAX_LEVEL - 1];
    return LEVEL_THRESHOLDS[level]; // level is 1-indexed, threshold array is 0-indexed
  },

  getXpProgress(xp: number, level: number): { current: number; needed: number; percent: number } {
    if (level >= MAX_LEVEL) return { current: 0, needed: 0, percent: 100 };
    const currentThreshold = LEVEL_THRESHOLDS[level - 1];
    const nextThreshold = LEVEL_THRESHOLDS[level];
    const current = xp - currentThreshold;
    const needed = nextThreshold - currentThreshold;
    const percent = Math.min(100, Math.round((current / needed) * 100));
    return { current, needed, percent };
  },

  // ── Evolution Stages ──────────────────────────────────────────
  getEvolutionStage(level: number): 'baby' | 'teen' | 'adult' | 'legendary' {
    if (level >= 18) return 'legendary';
    if (level >= 11) return 'adult';
    if (level >= 5) return 'teen';
    return 'baby';
  },

  getEvolutionLabel(stage: 'baby' | 'teen' | 'adult' | 'legendary'): string {
    switch (stage) {
      case 'baby': return '🐣 Baby';
      case 'teen': return '🌱 Teen';
      case 'adult': return '⭐ Adult';
      case 'legendary': return '👑 Legendary';
    }
  },

  // ── Pet Emoji (evolution-aware) ───────────────────────────────
  getPetEmoji(type: 'cat' | 'dog' | 'dino', food: number, love: number, level: number = 1): string {
    const stage = this.getEvolutionStage(level);
    const avg = (food + love) / 2;

    if (type === 'cat') {
      if (avg <= 15) return '😿';
      if (food <= 30) return '😿';
      if (love <= 30) return '😾';
      if (stage === 'legendary') return '😻';
      if (stage === 'adult') return avg >= 60 ? '😸' : '🐱';
      if (stage === 'teen') return avg >= 60 ? '😺' : '🐱';
      return avg >= 60 ? '😺' : '🐱'; // baby
    } else if (type === 'dog') {
      if (avg <= 15) return '😭';
      if (food <= 30) return '🥺';
      if (love <= 30) return '🐩';
      if (stage === 'legendary') return '🐶';
      if (stage === 'adult') return avg >= 60 ? '🐶' : '🐕';
      if (stage === 'teen') return avg >= 60 ? '🐕‍🦺' : '🐕';
      return avg >= 60 ? '🐕‍🦺' : '🐕'; // baby
    } else {
      // dino
      if (avg <= 15) return '🦕';
      if (food <= 30) return '🦕';
      if (love <= 30) return '🦕';
      if (stage === 'legendary') return '🐉';
      if (stage === 'adult') return avg >= 60 ? '🦖' : '🦕';
      if (stage === 'teen') return avg >= 60 ? '🦖' : '🦕';
      return '🦕'; // baby
    }
  },

  getPetStatusText(food: number, love: number): string {
    const avg = (food + love) / 2;
    if (avg >= 80) return 'Extremely Content! (无比满足)';
    if (food <= 30 && love <= 30) return 'Starving & Lonely! (饥寒交迫)';
    if (food <= 30) return 'Hungry... (肚子饿了)';
    if (love <= 30) return 'Lonely... (渴望抚摸)';
    if (avg >= 50) return 'Happy & Healthy (开心健康)';
    return 'Neutral (平常心)';
  },

  // ── Daily Goal Helpers ────────────────────────────────────────
  getDailyProgress(state: PetState): { current: number; goal: number; percent: number; completed: boolean } {
    const today = getTodayStr();
    const current = state.dailyProgressDate === today ? state.dailyProgress : 0;
    const goal = DAILY_GOAL_VALUES[state.dailyGoalPreset];
    return {
      current,
      goal,
      percent: Math.min(100, Math.round((current / goal) * 100)),
      completed: current >= goal,
    };
  },

  // ── Streak Helpers ────────────────────────────────────────────
  getStreakInfo(state: PetState): { streak: number; longestStreak: number; activatedToday: boolean } {
    const today = getTodayStr();
    return {
      streak: state.streak,
      longestStreak: state.longestStreak,
      activatedToday: state.lastPracticeDate === today,
    };
  },

  // ── Achievement Logic ─────────────────────────────────────────
  checkAndUnlockAchievements(state: PetState): string[] {
    const newlyUnlocked: string[] = [];

    const check = (id: string, condition: boolean) => {
      if (condition && !state.achievements.includes(id)) {
        state.achievements.push(id);
        newlyUnlocked.push(id);
      }
    };

    // Streak
    check('streak-3', state.streak >= 3);
    check('streak-7', state.streak >= 7);
    check('streak-14', state.streak >= 14);
    check('streak-30', state.streak >= 30);

    // Level
    check('level-5', state.level >= 5);
    check('level-10', state.level >= 10);
    check('level-15', state.level >= 15);
    check('level-20', state.level >= 20);

    // Correct answers
    check('correct-100', state.totalCorrect >= 100);
    check('correct-500', state.totalCorrect >= 500);
    check('correct-1000', state.totalCorrect >= 1000);

    // Daily goals completed
    check('daily-goal-3', state.dailyGoalsCompleted >= 3);
    check('daily-goal-10', state.dailyGoalsCompleted >= 10);
    check('daily-goal-30', state.dailyGoalsCompleted >= 30);

    // Dispatch unlock events for each
    for (const id of newlyUnlocked) {
      window.dispatchEvent(new CustomEvent('ep-achievement-unlock', {
        detail: this.getAchievementDetails(id),
      }));
    }

    return newlyUnlocked;
  },

  getAchievementDetails(id: string): AchievementDef {
    return ACHIEVEMENT_DEFS.find(a => a.id === id) || {
      id, title: id, titleCn: id, description: '', emoji: '🏅'
    };
  },

  // ── Chat Messages ─────────────────────────────────────────────
  getRandomFeedMessage(name: string, type: 'cat' | 'dog' | 'dino'): string {
    const actionStr = type === 'cat' ? 'purrs' : type === 'dog' ? 'wags tail' : 'roars';
    const cnActionStr = type === 'cat' ? '呼噜呼噜' : type === 'dog' ? '摇尾巴' : '开心咆哮';
    const messages = [
      `*${name} eats happily* Nom nom! That was delicious! 😋 Keep up the good work! (美味！*${name}吃得很开心* 继续加油！)`,
      `*${name} ${actionStr}* Thank you for the tasty food! 🍗 Let's learn more together! (多谢美味！*${name}${cnActionStr}* 咱们一起学更多吧！)`,
      `Yum! This gives ${name} energy to watch you study! ⚡ Keep it up! (好吃！看你学习，让${name}更有劲了！)`,
      `*${name} licks lips* Delicious! You are getting smarter, and I am getting fuller! 🧠✨ (真好吃！*${name}舔了舔嘴* 你变聪明了，我也变饱了！)`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  },

  getRandomPetMessage(name: string, type: 'cat' | 'dog' | 'dino'): string {
    const catMessages = [
      `*${name} purrs* I love it when you practice! ❤️ Keep up the good work! (呼噜呼噜...*${name}*最喜欢你练习了！继续加油！)`,
      `Meow! ${name} thinks you are doing amazing! Let's get 100%! 😸 (喵！${name}觉得你太棒了！争取拿满分！)`,
      `Hehe, that tickles! 🥰 Keep learning, you are doing great! (嘿嘿，好痒呀！继续学习，你做得很好！)`
    ];
    const dogMessages = [
      `Woof woof! ${name} thinks you make learning so much fun! 🐾 (汪汪！${name}觉得你让学习变得很有趣！)`,
      `*${name} wags tail* You are doing amazing! I'm so proud of you! 🥰 ( *${name}摇尾巴* 你太棒了！我真为你骄傲！)`,
      `*Licks your hand* Let's practice more! You can do it! 🐶 ( *舔舔手* 咱们多练习练习！你一定行！)`
    ];
    const dinoMessages = [
      `Rawr! ${name} is the happiest dino ever! 🦖 Keep up the good work! (嗷呜！${name}是超级快乐的恐龙！继续加油！)`,
      `*${name} does a little dance* You are doing a fantastic job today! 🦕✨ ( *${name}跳了个舞* 你今天做得生龙活虎！)`,
      `Dino power! 🦖 Let's smash some English exercises! (恐龙力量！让我们消灭那些英语练习！)`
    ];

    if (type === 'cat') return catMessages[Math.floor(Math.random() * catMessages.length)];
    if (type === 'dog') return dogMessages[Math.floor(Math.random() * dogMessages.length)];
    return dinoMessages[Math.floor(Math.random() * dinoMessages.length)];
  },
};

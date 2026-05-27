export interface PetState {
  type: 'cat' | 'dog' | 'dino';
  name: string;
  food: number; // 0 to 100
  love: number; // 0 to 100
  foodPoints: number; // items earned from correct answers
  totalCorrect: number;
  lastUpdated: number; // timestamp in ms
}

const DEFAULT_PETS: Record<string, string> = {
  cat: 'Lucky',
  dog: 'Buddy',
  dino: 'Rex'
};

const INITIAL_STATE = (type: 'cat' | 'dog' | 'dino' = 'cat'): PetState => ({
  type,
  name: DEFAULT_PETS[type],
  food: 50,
  love: 50,
  foodPoints: 0,
  totalCorrect: 0,
  lastUpdated: Date.now()
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
      const parsed = JSON.parse(stored) as PetState;
      // Ensure all fields exist
      const state = {
        type: parsed.type || 'cat',
        name: parsed.name || DEFAULT_PETS[parsed.type || 'cat'],
        food: typeof parsed.food === 'number' ? parsed.food : 50,
        love: typeof parsed.love === 'number' ? parsed.love : 50,
        foodPoints: typeof parsed.foodPoints === 'number' ? parsed.foodPoints : 0,
        totalCorrect: typeof parsed.totalCorrect === 'number' ? parsed.totalCorrect : 0,
        lastUpdated: parsed.lastUpdated || Date.now()
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
    } catch (e) {
      console.error('Failed to save pet state', e);
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

  awardCorrectAnswer() {
    const state = this.getPetState();
    state.totalCorrect += 1;
    
    // Earn 0.1 food item point and directly gain 0.1 love point
    state.foodPoints = Math.round((state.foodPoints + 0.1) * 10) / 10;
    state.love = Math.min(100, Math.round((state.love + 0.1) * 10) / 10);
    state.lastUpdated = Date.now();
    
    this.savePetState(state);
    
    // Dispatch animation event
    window.dispatchEvent(new CustomEvent('ep-correct-answer'));
  },

  feedPet(): boolean {
    const state = this.getPetState();
    if (state.foodPoints < 1.0) return false;
    
    state.foodPoints = Math.round((state.foodPoints - 1.0) * 10) / 10;
    state.food = Math.min(100, state.food + 10);
    state.lastUpdated = Date.now();
    
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

  getPetEmoji(type: 'cat' | 'dog' | 'dino', food: number, love: number): string {
    const avg = (food + love) / 2;
    if (type === 'cat') {
      if (avg >= 80) return '😻'; // Loved/Happy
      if (food <= 30) return '😿'; // Hungry
      if (love <= 30) return '😾'; // Lonely
      if (avg <= 15) return '😿'; // Very neglected
      return '🐱'; // Neutral
    } else if (type === 'dog') {
      if (avg >= 80) return '🐶'; // Loved/Happy
      if (food <= 30) return '🥺'; // Hungry
      if (love <= 30) return '🐩'; // Lonely
      if (avg <= 15) return '😭'; // Very neglected
      return '🐕'; // Neutral
    } else {
      // dino
      if (avg >= 80) return '🦖'; // Loved/Happy
      if (food <= 30) return '🦕'; // Hungry
      if (love <= 30) return '🦕'; // Lonely
      if (avg <= 15) return '🦕'; // Very neglected
      return '🦖'; // Neutral
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
  }
};

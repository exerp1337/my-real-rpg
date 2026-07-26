//  ИГРОВЫЕ КОНСТАНТЫ И БАЗЫ ДАННЫХ

export const EXP = 250;
export const SOCIAL_XP_PER_LEVEL = 100;

// Пороги опыта для уровней
export const LEVEL_THRESHOLDS = [0, 50, 150, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500, 12000, 13600, 15300, 17100, 19000, 21000, 23100, 25300, 27600, 30000, 32500, 35100, 37800, 40600];

// Определяем, какие статы к какой ветке относятся
export const BRANCHES = {
    atletika: ['str', 'end', 'agi'],
    intellekt: ['int'],
    disciplina: ['per']
};

export const AVATARS = [
    { level: 1, emoji: '🥚', name: 'Яйцо' },
    { level: 2, emoji: '🐣', name: 'Цыпленок' },
    { level: 3, emoji: '🐥', name: 'Птенец' },
    { level: 4, emoji: '🐦', name: 'Птица' },
    { level: 5, emoji: '🦅', name: 'Орел' },
    { level: 7, emoji: '🐺', name: 'Волк' },
    { level: 9, emoji: '🦁', name: 'Лев' },
    { level: 12, emoji: '🐉', name: 'Дракон' },
    { level: 15, emoji: '🧙‍♂️', name: 'Маг' },
    { level: 18, emoji: '👑', name: 'Король' },
    { level: 21, emoji: '⚔️', name: 'Воин' },
    { level: 25, emoji: '🦸‍♂️', name: 'Герой' },
    { level: 30, emoji: '👾', name: 'Босс' }
];

export const RARITY_CONFIG = {
    legendary: { label: '⭐ Легендарная', color: '#ff6b00', xp: 50, statBonus: 15 },
    epic: { label: '🔮 Эпическая', color: '#bf5af2', xp: 30, statBonus: 10 },
    common: { label: '📦 Обычная', color: '#0a84ff', xp: 15, statBonus: 5 },
    easy: { label: '🌱 Легкая', color: '#30d158', xp: 5, statBonus: 2 }
};

export const STAT_LABELS = {
    str: '💪 Сила',
    end: '🏃‍♂️ Выносливость',
    agi: '🎯 Ловкость',
    int: '📚 Интеллект',
    cha: '🗣 Харизма',
    per: '👁 Дисциплина',
    luck: '🍀 Удача'
};

export const RARITIES = {
    common: { label: '📦 Обычное', color: '#8e8e93', weight: 40, emoji: '📦' },
    uncommon: { label: '🟢 Необычное', color: '#30d158', weight: 25, emoji: '🟢' },
    rare: { label: '🔵 Редкое', color: '#0a84ff', weight: 18, emoji: '🔵' },
    epic: { label: '🟣 Эпическое', color: '#bf5af2', weight: 10, emoji: '🟣' },
    legendary: { label: '🟠 Легендарное', color: '#ff9500', weight: 5, emoji: '🟠' },
    mythic: { label: '🔴 Мифическое', color: '#ff453a', weight: 2, emoji: '🔴' }
};

export const ITEMS_POOL = [
    // ... (same as before)
];

export const SOCIAL_QUESTS_DB = [
    // ... (same as before)
];

export const TITLES_DATABASE = [
    // ... (same as before)
];

export const TUTORIAL_QUESTS = [
    { id: 'tut1', title: "✅ Настрой цели", desc: "Добавь свою первую долгосрочную цель в соответствующей вкладке.", stat: "int", points: 25, gold: 50, type: "purple" },
    { id: 'tut2', title: "🤸 Сделай замеры", desc: "Запиши свои антропометрические данные (вес, объемы) в блокнот или приложение.", stat: "per", points: 25, gold: 50, type: "blue" },
    { id: 'tut3', title: "💧 Выпей стакан воды", desc: "Начни день правильно - с гидратации организма.", stat: "end", points: 15, gold: 20, type: "" }
];

export const ACHIEVEMENTS_DB = [
    // ... (same as before)
];

export const ROULETTE_SECTORS = [
    // ... (same as before)
];

export const PROFILE_PRESETS = {
    gym: {
        name: 'Атлет',
        description: 'Силовые тренировки, дисциплина и фокус на теле.',
        quests: [
            { id: `custom_${Date.now()}_1`, title: "Силовая тренировка (ноги)", description: "Приседания, выпады, жим ногами.", branch: 'atletika', stat: 'str', points: 20, gold: 30 },
            { id: `custom_${Date.now()}_2`, title: "Силовая тренировка (верх)", description: "Отжимания, подтягивания, жим.", branch: 'atletika', stat: 'str', points: 20, gold: 30 },
            { id: `custom_${Date.now()}_3`, title: "Контроль питания", description: "Соблюдать дневную норму калорий и БЖУ.", branch: 'disciplina', stat: 'per', points: 15, gold: 25 },
            { id: `custom_${Date.now()}_4`, title: "Кардио-сессия", description: "30 минут бега, велосипеда или эллипса.", branch: 'atletika', stat: 'end', points: 15, gold: 20 },
        ]
    },
    it: {
        name: 'IT-специалист',
        description: 'Кодинг, решение задач и постоянное обучение.',
        quests: [
            { id: `custom_${Date.now()}_5`, title: "Сессия кодинга (Pomodoro)", description: "25 минут сфокусированной работы над проектом.", branch: 'intellekt', stat: 'int', points: 15, gold: 20 },
            { id: `custom_${Date.now()}_6`, title: "Алгоритмическая задача", description: "Решить одну задачу на LeetCode, HackerRank и т.п.", branch: 'intellekt', stat: 'int', points: 25, gold: 40 },
            { id: `custom_${Date.now()}_7`, title: "Чтение технической документации", description: "Изучить новую технологию или главу документации (30 мин).", branch: 'intellekt', stat: 'int', points: 20, gold: 25 },
            { id: `custom_${Date.now()}_8`, title: "Физическая разминка", description: "Сделать перерыв на 15-минутную зарядку/растяжку.", branch: 'atletika', stat: 'agi', points: 10, gold: 15 },
        ]
    }
};

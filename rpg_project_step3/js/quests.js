import { state, EXP } from './state.js';

export const AVATARS = [
    { level: 1, icon: 'ph-egg', name: 'Яйцо' },
    { level: 2, icon: 'ph-bird', name: 'Цыпленок' },
    { level: 3, icon: 'ph-paper-plane-tilt', name: 'Птенец' },
    { level: 4, icon: 'ph-paper-plane-right', name: 'Птица' },
    { level: 5, icon: 'ph-airplane-tilt', name: 'Орел' },
    { level: 7, icon: 'ph-paw-print', name: 'Волк' },
    { level: 9, icon: 'ph-cat', name: 'Лев' },
    { level: 12, icon: 'ph-fire', name: 'Дракон' },
    { level: 15, icon: 'ph-magic-wand', name: 'Маг' },
    { level: 18, icon: 'ph-crown', name: 'Король' },
    { level: 21, icon: 'ph-sword', name: 'Воин' },
    { level: 25, icon: 'ph-shield-star', name: 'Герой' },
    { level: 30, icon: 'ph-alien', name: 'Босс' }
];

export function getAvatar(level) {
    let result = AVATARS[0];
    for (const a of AVATARS) {
        if (level >= a.level) result = a;
    }
    return result;
}

export const RARITY_CONFIG = {
    legendary: { label: '⭐ Легендарная', color: '#ff6b00', xp: 50, statBonus: 15 },
    epic: { label: '🔮 Эпическая', color: '#bf5af2', xp: 30, statBonus: 10 },
    common: { label: '📦 Обычная', color: '#0a84ff', xp: 15, statBonus: 5 },
    easy: { label: '🌱 Легкая', color: '#30d158', xp: 5, statBonus: 2 }
};

export const STAT_LABELS = {
    str: '<i class="ph ph-barbell"></i> Сила',
    end: '<i class="ph ph-sneaker"></i> Выносливость',
    agi: '<i class="ph ph-target"></i> Ловкость',
    int: '<i class="ph ph-book-open"></i> Интеллект',
    cha: '<i class="ph ph-chat-centered-text"></i> Харизма',
    per: '<i class="ph ph-eye"></i> Дисциплина',
    luck: '<i class="ph ph-clover"></i> Удача'
};

export const RARITIES = {
    common: { label: 'Обычное', color: '#8e8e93', weight: 40, icon: 'ph-package' },
    uncommon: { label: 'Необычное', color: '#30d158', weight: 25, icon: 'ph-sparkle' },
    rare: { label: 'Редкое', color: '#0a84ff', weight: 18, icon: 'ph-star' },
    epic: { label: 'Эпическое', color: '#bf5af2', weight: 10, icon: 'ph-shooting-star' },
    legendary: { label: 'Легендарное', color: '#ff9500', weight: 5, icon: 'ph-crown' },
    mythic: { label: 'Мифическое', color: '#ff453a', weight: 2, icon: 'ph-diamond' }
};

export const ITEMS_POOL = [
    { id: 'item_1', name: 'Клевер', desc: 'Приносит удачу', stat: 'luck', bonus: 2, rarity: 'common', icon: 'ph-clover' },
    { id: 'item_2', name: 'Гантеля', desc: 'Для силовых тренировок', stat: 'str', bonus: 3, rarity: 'common', icon: 'ph-barbell' },
    { id: 'item_3', name: 'Книга', desc: 'Источник знаний', stat: 'int', bonus: 3, rarity: 'common', icon: 'ph-book-open' },
    { id: 'item_4', name: 'Кроссовки', desc: 'Для бега', stat: 'end', bonus: 3, rarity: 'common', icon: 'ph-sneaker' },
    { id: 'item_5', name: 'Мишень', desc: 'Тренирует меткость', stat: 'agi', bonus: 3, rarity: 'common', icon: 'ph-target' },
    { id: 'item_15', name: 'Rolex', desc: 'Стиль и статус', stat: 'cha', bonus: 20, rarity: 'epic', icon: 'ph-watch' },
    { id: 'item_19', name: 'Звезда', desc: 'Сияние гения', stat: 'luck', bonus: 35, rarity: 'legendary', icon: 'ph-star' },
    { id: 'item_22', name: 'Камень бесконечности', desc: 'Абсолютная сила', stat: 'str', bonus: 50, rarity: 'mythic', icon: 'ph-hexagon' }
];

export const SOCIAL_QUESTS_DB = [
    { id: 's1', title: '👀 Контакт установлен', desc: 'Поймай взгляд прохожего на 2 секунды.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1 },
    { id: 's20', title: '👋 Новый союзник', desc: 'Подойди к человеку на мероприятии.', rank: 2, xpReward: 30, socialBonus: 2, minSocialLevel: 2 },
    { id: 's41', title: '🔗 Связующее звено', desc: 'Познакомь двух людей.', rank: 5, xpReward: 65, socialBonus: 7, minSocialLevel: 5 },
    { id: 's60', title: '🏆 Ачивка «Легенда»', desc: 'Получи от кого-то искреннюю похвалу.', rank: 6, xpReward: 150, socialBonus: 20, minSocialLevel: 6 }
];

export const TITLES_DATABASE = [
    { lvl: 30, text: "👾 Высший разум" },
    { lvl: 15, text: "🌌 Полубог реала" },
    { lvl: 1,  text: "🥚 Обыватель" }
];

export const QUESTS_DATABASE = [
    { id: 'q1', title: "20 отжиманий", desc: "Выполните 20 отжиманий.", stat: "str", points: 3, gold: 10, type: "purple" },
    { id: 'q2', title: "20 минут растяжки", desc: "Выполняйте базовые упражнения.", stat: "agi", points: 2, gold: 10, type: "blue" },
    { id: 'q5', title: "25 минут кода", desc: "Поработайте над кодом 25 минут.", stat: "int", points: 3, gold: 20, type: "purple" }
];

export const ACHIEVEMENTS_DB = [
    { id: 'ach_level_3', title: 'Статус авторитета', desc: 'Достигнуть 3 уровня', check: () => getLevel() >= 3, reward: { stats: { str: 5, end: 5, agi: 5, int: 5, cha: 5, per: 5, luck: 5 } } },
    { id: 'ach_quest_5', title: 'Квестовый энтузиаст', desc: 'Выполнить 5 квестов', check: () => (state.currentUserData?.total_quests_completed || 0) >= 5, reward: { gold: 30 } }
];

export function getLevel() {
    if (!state.currentUserData) return 1;
    const s = state.currentUserData.stats;
    const total = s.str + s.end + s.agi + s.int + s.cha + s.per + s.luck;
    return Math.floor(total / EXP) + 1;
}

export function getRandomItem() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedRarity = 'common';
    for (const [rarity, config] of Object.entries(RARITIES)) {
        cumulative += config.weight;
        if (rand <= cumulative) { selectedRarity = rarity; break; }
    }
    const pool = ITEMS_POOL.filter(item => item.rarity === selectedRarity);
    if (pool.length === 0) return ITEMS_POOL[0];
    return JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]));
}

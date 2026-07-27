// ========================================
//  ПОДКЛЮЧЕНИЕ К SUPABASE
// ========================================

const SUPABASE_URL = 'https://zjtudyoffdwqfamzczcb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqdHVkeW9mZmR3cWZhbXpjemNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTYxMDMsImV4cCI6MjEwMDE5MjEwM30.yO-fyi_hZv__XqMjz-OpuYNPAlKyaGT7KB4xscqHMNo';
const TABLE_NAME = 'players';
const SESSION_KEY = 'rpg_session';

// ========================================
//  АВАТАРЫ
// ========================================

const AVATARS = [
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

function getAvatar(level) {
    let result = AVATARS[0];
    for (const a of AVATARS) {
        if (level >= a.level) result = a;
    }
    return result;
}

// ========================================
//  СОСТОЯНИЕ
// ========================================

let currentUserData = null;
let currentUsername = null;
let lastTrainTime = 0;
const SOCIAL_XP_PER_LEVEL = 100;

// ── Экспоненциальная таблица порогов XP (сумма всех stats) ──
// Lv1→0, Lv2→50, Lv3→150, Lv4→300, Lv5→600, Lv6→1000, Lv7→1500, Lv8→2100 … Lv30
const LEVEL_THRESHOLDS = (() => {
    const t = [0];
    const earlyDeltas = [50, 100, 150, 300, 400, 500, 600]; // быстрый старт
    for (let i = 1; i < 30; i++) {
        const delta = i <= earlyDeltas.length
            ? earlyDeltas[i - 1]
            : Math.round(earlyDeltas[earlyDeltas.length - 1] * Math.pow(1.12, i - earlyDeltas.length));
        t.push(t[i - 1] + delta);
    }
    return t; // индекс = уровень − 1
})();

const DAILY_QUEST_COUNT = 3;
const SLEEP_EVENING_HOUR = 18; // награда доступна с 18:00
const SLEEP_LATE_HOUR    = 23; // жёсткий таргет отбоя
const SLEEP_EARLY_HOUR   = 6;  // граница «ночной смены»

function getTotalXp(stats) {
    if (!stats) return 0;
    return (stats.str || 0) + (stats.end || 0) + (stats.agi || 0)
         + (stats.int || 0) + (stats.cha || 0) + (stats.per || 0) + (stats.luck || 0);
}

function getLevelFromXp(xp, thresholds) {
    let lvl = 1;
    for (let i = 0; i < thresholds.length; i++) {
        if (xp >= thresholds[i]) lvl = i + 1;
        else break;
    }
    return lvl;
}

function getBranchThreshold(levelIndex) {
    return Math.round((LEVEL_THRESHOLDS[levelIndex] ?? 0) / 2);
}

function getBranchProgress(exp) {
    const branchThresholds = LEVEL_THRESHOLDS.map((_, i) => getBranchThreshold(i));
    const lvl = getLevelFromXp(exp, branchThresholds);
    const thresh = branchThresholds[lvl - 1] ?? 0;
    const next = lvl < branchThresholds.length
        ? branchThresholds[lvl]
        : thresh + 999999;
    return { lvl, cur: exp - thresh, toNext: next - thresh };
}

function isTrackableQuest(q) {
    return q && !q._tutorial;
}

function isMissableQuest(q) {
    return isTrackableQuest(q) && !q._delayed;
}

function checkAndNotifyLevelUp(prevTotal) {
    const prevLvl = getLevelFromXp(prevTotal, LEVEL_THRESHOLDS);
    const newLvl  = getLevel();
    if (newLvl > prevLvl) {
        const avatar = getAvatar(newLvl);
        toast(`🎉 Level Up! Lv.${newLvl} — ${avatar.emoji} ${avatar.name}`, 'success');
    }
}

// ========================================
//  НОВЫЕ СИСТЕМЫ: HP / ДЕБАФФЫ / ВЕТКИ / СТРИК / ГАЧА / АРТЕФАКТЫ
// ========================================

const HP_CONFIG = {
    max: 100,
    damage: {
        sleep_late:   15,
        missed_daily: 10,
        missed_weekly: 25,
    },
    regen: {
        per_day: 5,
        on_streak_5: 10,
    }
};

const DEBUFF_DEFINITIONS = {
    cortisol: {
        id: 'cortisol', name: '🧪 Кортизол',
        desc: 'Сон < 7ч. −20% EXP за физические квесты.',
        duration: 1,
        apply: (u, exp, branch) => branch === 'athletics' ? Math.round(exp * 0.8) : exp
    },
    brain_fog: {
        id: 'brain_fog', name: '🌫️ Туман разума',
        desc: 'Менее 6ч. сна. −15% EXP за Интеллект-квесты.',
        duration: 1,
        apply: (u, exp, branch) => branch === 'intellect' ? Math.round(exp * 0.85) : exp
    },
    overload: {
        id: 'overload', name: '⚡ Перегруз',
        desc: '3 пропущенных дейлика подряд. −10% EXP во всех ветках.',
        duration: 2,
        apply: (u, exp) => Math.round(exp * 0.9)
    }
};

const SKILL_BRANCHES = {
    athletics:  { id: 'athletics',  name: '💪 Атлетика',    stat: 'str', color: '#ff6b35' },
    intellect:  { id: 'intellect',  name: '📚 Интеллект/IT', stat: 'int', color: '#0a84ff' },
    discipline: { id: 'discipline', name: '🎯 Дисциплина',   stat: 'per', color: '#bf5af2' }
};

// Маппинг stat → ветка (используется в completeQuest)
const STAT_TO_BRANCH = {
    str: 'athletics', end: 'athletics', agi: 'athletics',
    int: 'intellect',
    per: 'discipline', cha: 'discipline', luck: 'discipline'
};

const QUEST_RANKS = {
    D: { label: 'D', name: 'Дейлики',    streakImpact: true,  expMult: 1.0 },
    B: { label: 'B', name: 'Недельные',  streakImpact: true,  expMult: 2.0 },
    S: { label: 'S', name: 'Глобальные', streakImpact: false, expMult: 5.0 }
};

const STREAK_MULTIPLIERS = [
    { days: 10, mult: 2.0, label: '🔥×2' },
    { days:  5, mult: 1.5, label: '⚡×1.5' },
    { days:  0, mult: 1.0, label: '×1' }
];

const ARTIFACT_DEFINITIONS = {
    time_scroll: {
        id: 'time_scroll', name: '📜 Свиток Искажения Времени',
        desc: 'Сдвигает дедлайн задачи на 1 день без сброса стрика.',
        icon: '📜', rarity: 'epic', shopCost: 200, dropChance: 0.05
    },
    dodge_shield: {
        id: 'dodge_shield', name: '🛡️ Щит Уклонения',
        desc: 'Блокирует следующий урон по HP (1 раз).',
        icon: '🛡️', rarity: 'epic', shopCost: 150, dropChance: 0.07
    },
    tavern_pass: {
        id: 'tavern_pass', name: '🍺 Пропуск Таверны',
        desc: 'Активирует режим паузы — HP не падает, EXP заморожено.',
        icon: '🍺', rarity: 'rare', shopCost: 100, dropChance: 0.08
    }
};

const GACHA_POOL = [
    { id: 'g_gold_100',    name: '💰 +100 Голды',         weight: 30, effect: 'gold_100' },
    { id: 'g_exp_200',     name: '✨ +200 EXP в ветку',   weight: 25, effect: 'exp_200' },
    { id: 'g_hp_30',       name: '❤️ +30 HP',             weight: 20, effect: 'hp_30' },
    { id: 'g_dodge_shield',name: '🛡️ Щит Уклонения',     weight: 10, effect: 'artifact_dodge_shield' },
    { id: 'g_time_scroll', name: '📜 Свиток Времени',     weight: 8,  effect: 'artifact_time_scroll' },
    { id: 'g_tavern_pass', name: '🍺 Пропуск Таверны',   weight: 5,  effect: 'artifact_tavern_pass' },
    { id: 'g_hp_full',     name: '💊 Полное восстановление HP', weight: 2, effect: 'hp_full' }
];

// ========================================
//  БАЗЫ ДАННЫХ
// ========================================

const RARITY_CONFIG = {
    legendary: { label: '⭐ Легендарная', color: '#ff6b00', xp: 50, statBonus: 15 },
    epic: { label: '🔮 Эпическая', color: '#bf5af2', xp: 30, statBonus: 10 },
    common: { label: '📦 Обычная', color: '#0a84ff', xp: 15, statBonus: 5 },
    easy: { label: '🌱 Легкая', color: '#30d158', xp: 5, statBonus: 2 }
};

const STAT_LABELS = {
    str: '💪 Сила',
    end: '🏃‍♂️ Выносливость',
    agi: '🎯 Ловкость',
    int: '📚 Интеллект',
    cha: '🗣 Харизма',
    per: '👁 Дисциплина',
    luck: '🍀 Удача'
};

const RARITIES = {
    common: { label: '📦 Обычное', color: '#8e8e93', weight: 40, emoji: '📦' },
    uncommon: { label: '🟢 Необычное', color: '#30d158', weight: 25, emoji: '🟢' },
    rare: { label: '🔵 Редкое', color: '#0a84ff', weight: 18, emoji: '🔵' },
    epic: { label: '🟣 Эпическое', color: '#bf5af2', weight: 10, emoji: '🟣' },
    legendary: { label: '🟠 Легендарное', color: '#ff9500', weight: 5, emoji: '🟠' },
    mythic: { label: '🔴 Мифическое', color: '#ff453a', weight: 2, emoji: '🔴' }
};

const ITEMS_POOL = [
    { id: 'item_1', name: '🍀 Клевер', desc: 'Приносит удачу', stat: 'luck', bonus: 2, rarity: 'common', icon: '🍀' },
    { id: 'item_2', name: '💪 Гантеля', desc: 'Для силовых тренировок', stat: 'str', bonus: 3, rarity: 'common', icon: '💪' },
    { id: 'item_3', name: '📖 Книга', desc: 'Источник знаний', stat: 'int', bonus: 3, rarity: 'common', icon: '📖' },
    { id: 'item_4', name: '👟 Кроссовки', desc: 'Для бега', stat: 'end', bonus: 3, rarity: 'common', icon: '👟' },
    { id: 'item_5', name: '🎯 Мишень', desc: 'Тренирует меткость', stat: 'agi', bonus: 3, rarity: 'common', icon: '🎯' },
    { id: 'item_6', name: '🔮 Хрустальный шар', desc: 'Усиливает интуицию', stat: 'luck', bonus: 5, rarity: 'uncommon', icon: '🔮' },
    { id: 'item_7', name: '⚔️ Меч', desc: 'Символ силы', stat: 'str', bonus: 7, rarity: 'uncommon', icon: '⚔️' },
    { id: 'item_8', name: '🛡️ Щит', desc: 'Защищает от усталости', stat: 'end', bonus: 7, rarity: 'uncommon', icon: '🛡️' },
    { id: 'item_9', name: '🧠 Тренажёр', desc: 'Для мозга', stat: 'int', bonus: 7, rarity: 'uncommon', icon: '🧠' },
    { id: 'item_10', name: '🎤 Микрофон', desc: 'Укрепляет голос', stat: 'cha', bonus: 7, rarity: 'uncommon', icon: '🎤' },
    { id: 'item_11', name: '👑 Корона', desc: 'Власть и уважение', stat: 'cha', bonus: 12, rarity: 'rare', icon: '👑' },
    { id: 'item_12', name: '🐉 Драконий глаз', desc: 'Мистическая удача', stat: 'luck', bonus: 12, rarity: 'rare', icon: '🐉' },
    { id: 'item_13', name: '⚡ Молния', desc: 'Скорость реакции', stat: 'agi', bonus: 12, rarity: 'rare', icon: '⚡' },
    { id: 'item_14', name: '📚 Энциклопедия', desc: 'Глубокая мудрость', stat: 'int', bonus: 12, rarity: 'rare', icon: '📚' },
    { id: 'item_15', name: '⌚ Rolex', desc: 'Стиль и статус', stat: 'cha', bonus: 20, rarity: 'epic', icon: '⌚' },
    { id: 'item_16', name: '💻 Ноутбук', desc: 'Инструмент гения', stat: 'int', bonus: 20, rarity: 'epic', icon: '💻' },
    { id: 'item_17', name: '🏆 Трофей', desc: 'Победа во всём', stat: 'str', bonus: 20, rarity: 'epic', icon: '🏆' },
    { id: 'item_18', name: '🧘 Коврик', desc: 'Гармония и фокус', stat: 'per', bonus: 20, rarity: 'epic', icon: '🧘' },
    { id: 'item_19', name: '🌟 Звезда', desc: 'Сияние гения', stat: 'luck', bonus: 35, rarity: 'legendary', icon: '🌟' },
    { id: 'item_20', name: '👾 Артефакт', desc: 'Древняя магия', stat: 'luck', bonus: 35, rarity: 'legendary', icon: '👾' },
    { id: 'item_21', name: '🔥 Феникс', desc: 'Возрождение', stat: 'end', bonus: 35, rarity: 'legendary', icon: '🔥' },
    { id: 'item_22', name: '💎 Камень бесконечности', desc: 'Абсолютная сила', stat: 'str', bonus: 50, rarity: 'mythic', icon: '💎' },
    { id: 'item_23', name: '🌌 Космос', desc: 'Бесконечные знания', stat: 'int', bonus: 50, rarity: 'mythic', icon: '🌌' },
    { id: 'item_24', name: '🕊️ Ангельское крыло', desc: 'Божественная харизма', stat: 'cha', bonus: 50, rarity: 'mythic', icon: '🕊️' }
];

// ========================================
//  СОЦИАЛЬНЫЕ КВЕСТЫ (с доп. полями для рулетки)
// ========================================

const SOCIAL_QUESTS_DB = [
    // РАНГ 1 (уровни 1–5) – easy
    { id: 's1', title: '👀 Контакт установлен', desc: 'Поймай взгляд случайного прохожего и не отводи его первым ровно 2 секунды.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's2', title: '🧍 Бафф осанки', desc: 'Пройди 10 минут по улице с максимально прямой спиной и расправленными плечами.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's3', title: '🗣️ Голос из таверны', desc: 'Скажи «Здравствуйте» кассиру или курьеру на 10% громче, чем обычно.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's4', title: '😊 Оружие к бою', desc: 'Искренне улыбнись одному незнакомому человеку за день.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's5', title: '🛡️ Открытый щит', desc: 'Проведи 15 минут в людном месте, сознательно не скрещивая руки и ноги.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's6', title: '⏳ Мастер времени', desc: 'Подойди к незнакомцу на улице и спроси, который час.', rank: 1, xpReward: 20, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's7', title: '🤝 Вежливый NPC', desc: 'Поблагодари обслуживающий персонал, обязательно посмотрев при этом в глаза.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's8', title: '📱 Анти-стелс', desc: 'Зайди в лифт с другими людьми и не доставай телефон.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's9', title: '👂 Эффект присутствия', desc: 'Во время разговора со знакомым кивни минимум 3 раза, показывая, что ты слушаешь.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's10', title: '📖 Четкая дикция', desc: 'Прочитай вслух любой текст (1 страница), чётко проговаривая каждое слово.', rank: 1, xpReward: 20, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    // РАНГ 2 (уровни 6–10) – medium
    { id: 's11', title: '💎 Нежданный лут', desc: 'Сделай искренний комплимент внешности или одежде малознакомого человека.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's12', title: '✨ Магия имени', desc: 'Узнай имя нового собеседника и назови его по имени минимум 2 раза за диалог.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's13', title: '🔀 Разрыв шаблона', desc: 'На дежурное «Как дела?» ответь не «нормально», а интересной деталью.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's14', title: '🗺️ Следопыт', desc: 'Спроси дорогу у прохожего, даже если точно знаешь, куда идти.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's15', title: '📡 Эхолокация', desc: 'Повтори последние 3 слова собеседника с вопросительной интонацией, чтобы он продолжил рассказ.', rank: 2, xpReward: 30, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's16', title: '🤝 Общий знаменатель', desc: 'Найди одну общую деталь с человеком, с которым раньше почти не общался.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's17', title: '☕ Светская беседа', desc: 'Перекинься парой фраз о погоде или ситуации с соседом/коллегой.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's18', title: '🚮 Без мусора', desc: 'Поговори с кем-то 5 минут, сознательно избегая слов-паразитов.', rank: 2, xpReward: 30, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's19', title: '📢 Развернутый ответ', desc: 'Ни разу за день не ответь на вопросы односложно — добавляй минимум одно предложение.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's20', title: '👋 Новый союзник', desc: 'Подойди к человеку на мероприятии и первым представься.', rank: 2, xpReward: 30, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    // РАНГ 3 (уровни 11–15) – medium/hard
    { id: 's21', title: '🧘 Безмолвный монах', desc: 'Выслушай человека в течение 5 минут, ни разу его не перебив.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's22', title: '🔍 Глубокий зонд', desc: 'Задай открытый вопрос, требующий размышления.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's23', title: '📡 Тонкая настройка', desc: 'Заметь изменение настроения собеседника и аккуратно спроси об этом.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's24', title: '🏅 Высокоуровневый комплимент', desc: 'Похвали не внешность, а навык, характер или поступок человека.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's25', title: '🎁 Достойная награда', desc: 'В ответ на похвалу скажи только «Спасибо, мне очень приятно», не принижая своих заслуг.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's26', title: '📚 Архивариус', desc: 'Вспомни в разговоре мелкую деталь, которую человек упоминал несколько дней назад.', rank: 3, xpReward: 40, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's27', title: '🪞 Отзеркаливание', desc: 'В течение 3 минут незаметно копируй позу собеседника для повышения доверия.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's28', title: '⏸️ Тяжеловесная пауза', desc: 'Выдержи паузу в 2 секунды перед ответом на важный вопрос, глядя человеку в глаза.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's29', title: '🛡️ Снятие брони', desc: 'Расскажи собеседнику небольшую, но искреннюю историю о своей недавней мелкой неудаче.', rank: 3, xpReward: 40, socialBonus: 4, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's30', title: '👁️ Удержание фокуса', desc: 'Смотри в глаза собеседнику не только когда он говорит, но и когда говоришь ты сам.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    // РАНГ 4 (уровни 16–20) – hard
    { id: 's31', title: '🔥 Байки у костра', desc: 'Заранее вспомни, отрепетируй и расскажи в компании забавную историю на 1-2 минуты.', rank: 4, xpReward: 45, socialBonus: 5, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's32', title: '⚔️ Изящное парирование', desc: 'Вежливо, но твердо не согласись с чужим мнением, начав с «Я понимаю твою мысль, но...»', rank: 4, xpReward: 45, socialBonus: 5, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's33', title: '🎮 Врыв в пати', desc: 'Успешно вклинись в уже идущий разговор группы людей, не нарушив его динамику.', rank: 4, xpReward: 50, socialBonus: 5, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's34', title: '🕊️ Уютная тишина', desc: 'Переживи неловкую паузу в разговоре, не пытаясь судорожно заполнить её болтовней.', rank: 4, xpReward: 45, socialBonus: 5, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's35', title: '🤲 Плавный жест', desc: 'Рассказывая что-то, осознанно используй открытые жесты руками (ладонями вверх).', rank: 4, xpReward: 45, socialBonus: 5, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's36', title: '☕ Инвайт', desc: 'Пригласи малознакомого, но интересного тебе человека выпить кофе или пообедать вместе.', rank: 4, xpReward: 50, socialBonus: 5, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's37', title: '🎬 Режиссёр', desc: 'Увидев, что кого-то в компании перебили, верни ему слово («Так что ты там говорил про...?»).', rank: 4, xpReward: 50, socialBonus: 6, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's38', title: '🎙️ Прокачка голоса', desc: 'Говори более низким и грудным голосом, чем обычно, в течение одного разговора.', rank: 4, xpReward: 50, socialBonus: 6, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's39', title: '😂 Шутка в тему', desc: 'Сделай уместное ироничное замечание, заставив улыбнуться хотя бы одного человека.', rank: 4, xpReward: 50, socialBonus: 6, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's40', title: '🎯 Центр притяжения', desc: 'Удержи на себе внимание группы из 3+ человек в течение хотя бы минуты.', rank: 4, xpReward: 55, socialBonus: 6, minSocialLevel: 4, difficulty: 'hard' },
    // РАНГ 5 (уровни 21–25) – hard
    { id: 's41', title: '🔗 Связующее звено', desc: 'Познакомь двух людей, рассказав им по одному крутому факту друг о друге.', rank: 5, xpReward: 65, socialBonus: 7, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's42', title: '🛡️ Сбор рейда', desc: 'Выступи инициатором: собери группу из 3+ друзей/коллег и организуй совместный поход куда-либо.', rank: 5, xpReward: 70, socialBonus: 8, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's43', title: '🤝 Дипломат', desc: 'Успокой расстроенного или раздражённого человека, используя только эмпатию и слушание.', rank: 5, xpReward: 70, socialBonus: 8, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's44', title: '👔 Разговор с боссом', desc: 'Уверенно и на равных заведи смолл-ток с человеком, который выше тебя по статусу или должности.', rank: 5, xpReward: 75, socialBonus: 8, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's45', title: '📢 Глас глашатая', desc: 'Произнеси тост или возьми вступительное слово на встрече/празднике.', rank: 5, xpReward: 75, socialBonus: 9, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's46', title: '🔄 Перелом хода', desc: 'Мягко переведи негативное обсуждение (жалобы, сплетни) в позитивное или нейтральное русло.', rank: 5, xpReward: 75, socialBonus: 9, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's47', title: '💼 Торговец', desc: 'Попроси о небольшой скидке, бонусе или лучшем столике в заведении с дружелюбной улыбкой.', rank: 5, xpReward: 80, socialBonus: 9, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's48', title: '💪 Уверенная просьба', desc: 'Попроси человека об одолжении прямо, без извиняющегося тона («Мне нужна твоя помощь с...»).', rank: 5, xpReward: 80, socialBonus: 10, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's49', title: '🧠 Память на имена', desc: 'Попав в новую компанию, запомни и используй в разговоре имена минимум троих людей.', rank: 5, xpReward: 80, socialBonus: 10, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's50', title: '🎭 Эмоциональные качели', desc: 'Расскажи историю так, чтобы слушатели испытали сначала напряжение, а затем смех или облегчение.', rank: 5, xpReward: 85, socialBonus: 10, minSocialLevel: 5, difficulty: 'hard' },
    // РАНГ 6 (уровни 26–30) – hard
    { id: 's51', title: '🏠 Хост (Хозяин таверны)', desc: 'Прими гостей у себя (или организуй вечеринку), лично следя за тем, чтобы всем было комфортно и никто не скучал.', rank: 6, xpReward: 100, socialBonus: 12, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's52', title: '🕊️ Миротворец', desc: 'Выступи медиатором в споре двух людей и помоги им прийти к компромиссу без ссоры.', rank: 6, xpReward: 105, socialBonus: 13, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's53', title: '💡 Презентация идеи', desc: 'Успешно «продай» свою идею группе людей (от выбора фильма до рабочего проекта).', rank: 6, xpReward: 105, socialBonus: 13, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's54', title: '⚡ Бафф вдохновения', desc: 'Скажи человеку такие слова поддержки, после которых он сразу пойдёт что-то делать или воспрянет духом.', rank: 6, xpReward: 100, socialBonus: 12, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's55', title: '😂 Массовый смех', desc: 'Рассмеши аудиторию от 5 и более человек одной историей или шуткой.', rank: 6, xpReward: 110, socialBonus: 14, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's56', title: '🛡️ Очарование стражи', desc: 'Выйди из проблемной ситуации (опоздание, мелкий штраф, ошибка) исключительно за счёт обаяния и умения договариваться.', rank: 6, xpReward: 115, socialBonus: 14, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's57', title: '🧙 Наставник', desc: 'Объясни сложную концепцию или научи навыку человека так, чтобы он почувствовал себя умным, а не глупым.', rank: 6, xpReward: 115, socialBonus: 15, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's58', title: '👑 Властелин зала', desc: 'Войди в помещение, где сидят люди, и своим языком тела и приветствием заставь всех обратить на тебя позитивное внимание.', rank: 6, xpReward: 120, socialBonus: 15, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's59', title: '🤝 Мгновенный траст', desc: 'Установи глубокий, доверительный раппорт с новым человеком менее чем за 10 минут.', rank: 6, xpReward: 130, socialBonus: 16, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's60', title: '🏆 Ачивка «Легенда»', desc: 'Получи от кого-то искреннюю, невынужденную обратную связь в стиле: «С тобой так круто общаться» или «У тебя потрясающая энергетика».', rank: 6, xpReward: 150, socialBonus: 20, minSocialLevel: 6, difficulty: 'hard' }
];

// ========================================
//  ОСТАЛЬНЫЕ БАЗЫ
// ========================================

const TITLES_DATABASE = [
    { lvl: 30, text: "👾 Высший разум" },
    { lvl: 25, text: "🪐 Абсолют" },
    { lvl: 20, text: "🔮 Легенда" },
    { lvl: 15, text: "🌌 Полубог реала" },
    { lvl: 12, text: "🔱 Грандмастер" },
    { lvl: 10, text: "👑 Мировой Мастер" },
    { lvl: 9,  text: "🥷 Теневой Мастер" },
    { lvl: 8,  text: "💎 Элита" },
    { lvl: 7,  text: "🎯 Профи дисциплины" },
    { lvl: 6,  text: "🔥 Прокачанный" },
    { lvl: 5,  text: "🦾 Местный авторитет" },
    { lvl: 4,  text: "⚔️ Боец" },
    { lvl: 3,  text: "⚡ Заряженный" },
    { lvl: 2,  text: "🌱 Начинающий атлет" },
    { lvl: 1,  text: "🥚 Обыватель" }
];

const QUESTS_DATABASE = [
    // ── Атлетика (str / end / agi) ──────────────────────────────
    { id: 'q1',  title: '20 отжиманий на возвышении', desc: 'Выполните 20 отжиманий с ногами на стуле.', stat: 'str', points: 3, gold: 10, type: 'purple', minBranchLevel: 1 },
    { id: 'q2',  title: '20 минут растяжки', desc: 'Выполняйте базовые упражнения на растяжку.', stat: 'agi', points: 2, gold: 10, type: 'blue', minBranchLevel: 1 },
    { id: 'q4',  title: '60 минут уборки', desc: 'Наведите идеальный порядок в своей комнате.', stat: 'end', points: 3, gold: 15, type: '', minBranchLevel: 1 },
    { id: 'q6',  title: '30 минут кардио', desc: 'Бег, прыжки, велосипед — любая непрерывная кардио-нагрузка.', stat: 'end', points: 4, gold: 18, type: 'blue', minBranchLevel: 2 },
    { id: 'q7',  title: '3×15 подтягиваний', desc: 'Три подхода по 15 подтягиваний с паузой 90 секунд.', stat: 'str', points: 5, gold: 20, type: 'purple', minBranchLevel: 3 },
    { id: 'q8',  title: 'Спринт-интервалы', desc: '8 спринтов по 30 секунд с минутой отдыха.', stat: 'agi', points: 6, gold: 25, type: 'purple', minBranchLevel: 4 },
    { id: 'q9',  title: '5 км без остановок', desc: 'Пробегите 5 километров в умеренном темпе.', stat: 'end', points: 8, gold: 35, type: 'blue', minBranchLevel: 5 },
    // ── Интеллект (int) ──────────────────────────────────────────
    { id: 'q5',  title: '25 минут учёбы / кода', desc: 'Поработайте над кодом или учёбой 25 минут без пауз.', stat: 'int', points: 3, gold: 20, type: 'purple', minBranchLevel: 1 },
    { id: 'q10', title: 'Прочитать 20 страниц', desc: 'Любая нон-фикшн или техническая книга.', stat: 'int', points: 3, gold: 15, type: 'blue', minBranchLevel: 1 },
    { id: 'q11', title: 'Глубокий Pomodoro (50 мин)', desc: 'Один непрерывный рабочий блок без отвлечений.', stat: 'int', points: 5, gold: 22, type: 'purple', minBranchLevel: 2 },
    { id: 'q12', title: 'Написать конспект', desc: 'Законспектируй лекцию / главу / статью своими словами.', stat: 'int', points: 5, gold: 20, type: 'blue', minBranchLevel: 3 },
    { id: 'q13', title: 'Решить 3 задачи LeetCode', desc: 'Минимум три задачи любой сложности.', stat: 'int', points: 8, gold: 30, type: 'purple', minBranchLevel: 4 },
    { id: 'q14', title: 'Написать 500 строк кода', desc: 'Продуктивная сессия — значимый фичер или 500+ строк.', stat: 'int', points: 10, gold: 40, type: 'purple', minBranchLevel: 5 },
    // ── Дисциплина (per / cha / luck) ───────────────────────────
    { id: 'q3',  title: '15 минут наблюдения за природой', desc: 'Понаблюдайте за птицами или небом на улице.', stat: 'per', points: 2, gold: 10, type: 'blue', minBranchLevel: 1 },
    { id: 'q15', title: 'Без телефона 2 часа', desc: 'Режим полного цифрового молчания в дневное время.', stat: 'per', points: 3, gold: 15, type: 'blue', minBranchLevel: 1 },
    { id: 'q16', title: 'Утренняя рутина без пропусков', desc: 'Подъём по будильнику, вода, зарядка — всё по плану.', stat: 'per', points: 4, gold: 18, type: '', minBranchLevel: 2 },
    { id: 'q17', title: 'Дневник / журнал 10 мин', desc: 'Запишите итоги дня и одну цель на завтра.', stat: 'per', points: 3, gold: 12, type: 'blue', minBranchLevel: 2 },
    { id: 'q18', title: 'Медитация 15 минут', desc: 'Сессия осознанного дыхания или сканирования тела.', stat: 'per', points: 5, gold: 20, type: 'blue', minBranchLevel: 3 },
    { id: 'q19', title: 'Холодный душ', desc: 'Закончи душ минутой холодной воды.', stat: 'per', points: 4, gold: 18, type: 'purple', minBranchLevel: 3 },
    { id: 'q20', title: 'Тайм-блокинг дня', desc: 'Распланируй каждый час завтрашнего дня в блокноте или приложении.', stat: 'per', points: 6, gold: 25, type: 'blue', minBranchLevel: 4 },
    { id: 'q21', title: 'Полный день без соцсетей', desc: '24 часа без открытия Instagram, TikTok, VK и прочих лент.', stat: 'per', points: 10, gold: 40, type: 'purple', minBranchLevel: 5 },
];

// ── Туториальные квесты (одноразовые, только для новичков) ───
const TUTORIAL_QUESTS = [
    { id: 'tq1', title: '📏 Сделать замеры тела', desc: 'Запишите вес, обхват груди, талии и бёдер — базовая точка отсчёта.', stat: 'per', points: 20, gold: 30, type: 'blue', minBranchLevel: 1, _tutorial: true },
    { id: 'tq2', title: '⚖️ Настроить весы и приложение', desc: 'Убедитесь, что весы откалиброваны и введены в трекер или заметки.', stat: 'per', points: 15, gold: 20, type: 'blue', minBranchLevel: 1, _tutorial: true },
    { id: 'tq3', title: '🗺️ Составить план тренировок на неделю', desc: 'Запишите 3–4 тренировки с днями и целями — без деталей, просто расписание.', stat: 'int', points: 20, gold: 30, type: 'purple', minBranchLevel: 1, _tutorial: true },
    { id: 'tq4', title: '🎯 Поставить первую S-цель', desc: 'Добавьте в раздел «Цели» одну большую задачу с конкретным дедлайном.', stat: 'per', points: 25, gold: 40, type: '', minBranchLevel: 1, _tutorial: true },
];

// ========================================
//  ДОСТИЖЕНИЯ
// ========================================

const ACHIEVEMENTS_DB = [
    { id: 'ach_level_3', title: 'Статус авторитета', desc: 'Достигнуть 3 уровня', check: () => getLevel() >= 3, reward: { stats: { str: 5, end: 5, agi: 5, int: 5, cha: 5, per: 5, luck: 5 } } },
    { id: 'ach_level_5', title: 'Мировой Мастер', desc: 'Достигнуть 5 уровня', check: () => getLevel() >= 5, reward: { stats: { str: 10, end: 10, agi: 10, int: 10, cha: 10, per: 10, luck: 10 } } },
    { id: 'ach_level_10', title: 'Легенда', desc: 'Достигнуть 10 уровня', check: () => getLevel() >= 10, reward: { stats: { str: 20, end: 20, agi: 20, int: 20, cha: 20, per: 20, luck: 20 } } },
    { id: 'ach_quest_5', title: 'Квестовый энтузиаст', desc: 'Выполнить 5 ежедневных квестов', check: () => (currentUserData?.total_quests_completed || 0) >= 5, reward: { gold: 30 } },
    { id: 'ach_quest_20', title: 'Квестовый профи', desc: 'Выполнить 20 ежедневных квестов', check: () => (currentUserData?.total_quests_completed || 0) >= 20, reward: { gold: 100 } },
    { id: 'ach_social_5', title: 'Социальная бабочка', desc: 'Выполнить 5 социальных квестов', check: () => (currentUserData?.total_social_quests_completed || 0) >= 5, reward: { stats: { cha: 5 } } },
    { id: 'ach_social_15', title: 'Мастер нетворкинга', desc: 'Выполнить 15 социальных квестов', check: () => (currentUserData?.total_social_quests_completed || 0) >= 15, reward: { stats: { cha: 15 } } },
    { id: 'ach_chest_3', title: 'Коллекционер', desc: 'Открыть 3 сундука', check: () => (currentUserData?.total_chests_opened || 0) >= 3, reward: { gold: 50 } },
    { id: 'ach_chest_10', title: 'Сундучный магнат', desc: 'Открыть 10 сундуков', check: () => (currentUserData?.total_chests_opened || 0) >= 10, reward: { gold: 150 } },
    { id: 'ach_goal_3', title: 'Целеустремлённый', desc: 'Выполнить 3 цели', check: () => (currentUserData?.total_goals_completed || 0) >= 3, reward: { stats: { luck: 20 } } },
    { id: 'ach_goal_10', title: 'Мастер целей', desc: 'Выполнить 10 целей', check: () => (currentUserData?.total_goals_completed || 0) >= 10, reward: { stats: { luck: 50 } } },
    { id: 'ach_social_level_5', title: 'Социальный лидер', desc: 'Достигнуть 5 социального уровня', check: () => (currentUserData?.socialLevel || 1) >= 5, reward: { stats: { cha: 10 } } },
    { id: 'ach_items_5', title: 'Начинающий коллекционер', desc: 'Собрать 5 разных предметов', check: () => (currentUserData?.inventory?.length || 0) >= 5, reward: { gold: 50 } },
    { id: 'ach_items_15', title: 'Собиратель сокровищ', desc: 'Собрать 15 разных предметов', check: () => (currentUserData?.inventory?.length || 0) >= 15, reward: { gold: 150 } }
];

function getLevel() {
    if (!currentUserData) return 1;
    return getLevelFromXp(getTotalXp(currentUserData.stats), LEVEL_THRESHOLDS);
}

// ========================================
//  СЕССИЯ
// ========================================

function saveSession(username) {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ username: username, loginTime: new Date().toISOString() }));
    } catch (e) { console.error('Error saving session:', e); }
}

function getSession() {
    try {
        const data = localStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
}

function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { console.error('Error clearing session:', e); }
}

// ========================================
//  ЗАПРОСЫ К SUPABASE
// ========================================

async function supabaseRequest(method, endpoint, body = null) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);

    // 204 No Content — успех без тела
    if (response.status === 204) return null;

    const text = await response.text();

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text}`);
    }

    if (!text || text.trim() === '') return null;

    try { return JSON.parse(text); } catch (e) { return null; }
}

async function getUser(username) {
    const result = await supabaseRequest('GET', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`);
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
}

async function createUser(username, password, email = '') {
    const newUser = {
        username,
        password,
        email: email || '',
        stats: { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 },
        inventory: [],
        completed_quests: [],
        current_quests: [],
        last_quest_date: '',
        last_sleep_date: '',
        goals: [],
        socialLevel: 1,
        socialXP: 0,
        socialQuests: [],
        lastSocialDate: '',
        total_quests_completed: 0,
        total_social_quests_completed: 0,
        total_chests_opened: 0,
        total_goals_completed: 0,
        achievements: [],
        last_weekly_date: '',
        randomQuest: null,
        lastRandomDate: '',
        delayed_quests: [],
        tutorial_done: []
    };
    const result = await supabaseRequest('POST', TABLE_NAME, newUser);
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
}

async function updateUser(username, data) {
    // PATCH: Supabase может вернуть [] или 204 — оба варианта успех
    const result = await supabaseRequest('PATCH', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`, data);
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
}

// ========================================
//  НОРМАЛИЗАЦИЯ ДАННЫХ
// ========================================

function normalizeUserData(user) {
    if (!user) return user;
    const normalized = JSON.parse(JSON.stringify(user));

    if (!normalized.stats || typeof normalized.stats !== 'object') {
        normalized.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 };
    } else {
        const defaultStats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 };
        normalized.stats = { ...defaultStats, ...normalized.stats };
    }

    if (!normalized.inventory) {
        normalized.inventory = [];
    } else if (typeof normalized.inventory === 'string') {
        try {
            const parsed = JSON.parse(normalized.inventory);
            normalized.inventory = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            normalized.inventory = [];
        }
    } else if (!Array.isArray(normalized.inventory)) {
        normalized.inventory = [];
    }

    const arrayFields = ['completed_quests', 'current_quests', 'goals', 'socialQuests', 'achievements'];
    arrayFields.forEach(field => {
        if (!normalized[field]) {
            normalized[field] = [];
        } else if (typeof normalized[field] === 'string') {
            try {
                const parsed = JSON.parse(normalized[field]);
                normalized[field] = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                normalized[field] = [];
            }
        } else if (!Array.isArray(normalized[field])) {
            normalized[field] = [];
        }
    });

    const numberFields = ['socialLevel', 'socialXP', 'total_quests_completed', 'total_social_quests_completed', 'total_chests_opened', 'total_goals_completed'];
    numberFields.forEach(field => {
        if (normalized[field] === undefined || normalized[field] === null) {
            normalized[field] = 0;
        } else if (typeof normalized[field] === 'string') {
            normalized[field] = parseInt(normalized[field]) || 0;
        }
    });

    const stringFields = ['last_quest_date', 'last_sleep_date', 'lastSocialDate', 'last_weekly_date', 'lastRandomDate'];
    stringFields.forEach(field => {
        if (typeof normalized[field] !== 'string') {
            normalized[field] = '';
        }
    });

    // ── Новые поля RPG-систем ──
    if (normalized.hp === undefined || normalized.hp === null) normalized.hp = HP_CONFIG.max;
    if (!normalized.maxHp) normalized.maxHp = HP_CONFIG.max;
    if (!Array.isArray(normalized.debuffs)) normalized.debuffs = [];
    if (!normalized.branchExp || typeof normalized.branchExp !== 'object')
        normalized.branchExp = { athletics: 0, intellect: 0, discipline: 0 };
    ['athletics','intellect','discipline'].forEach(b => { if (!normalized.branchExp[b]) normalized.branchExp[b] = 0; });
    if (normalized.streak === undefined) normalized.streak = 0;
    if (!normalized.lastStreakDate) normalized.lastStreakDate = '';
    if (normalized.gachaTokens === undefined) normalized.gachaTokens = 0;
    if (!Array.isArray(normalized.artifacts)) normalized.artifacts = [];
    if (normalized.tavernMode === undefined) normalized.tavernMode = false;
    if (!normalized.tavernStart) normalized.tavernStart = '';
    if (!normalized.missedDaysInRow) normalized.missedDaysInRow = 0;
    if (!Array.isArray(normalized.delayed_quests)) normalized.delayed_quests = [];
    if (!Array.isArray(normalized.tutorial_done))  normalized.tutorial_done  = [];

    // Нормализация randomQuest
    if (normalized.randomQuest && typeof normalized.randomQuest === 'string') {
        try {
            normalized.randomQuest = JSON.parse(normalized.randomQuest);
        } catch (e) {
            normalized.randomQuest = null;
        }
    }
    if (normalized.randomQuest && typeof normalized.randomQuest === 'object') {
        // просто оставляем как есть
    } else {
        normalized.randomQuest = null;
    }

    return normalized;
}

// ========================================
//  АВТОРИЗАЦИЯ
// ========================================

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(el => el.classList.remove('active'));
    if (tab === 'login') {
        document.getElementById('login-tab').classList.add('active');
        document.getElementById('login-form').classList.add('active');
        document.getElementById('register-error').textContent = '';
        document.getElementById('register-success').textContent = '';
    } else {
        document.getElementById('register-tab').classList.add('active');
        document.getElementById('register-form').classList.add('active');
        document.getElementById('login-error').textContent = '';
    }
}

async function registerUser() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;
    const errorEl = document.getElementById('register-error');
    const successEl = document.getElementById('register-success');

    errorEl.textContent = '';
    successEl.textContent = '';

    if (!username || username.length < 2) {
        errorEl.textContent = '❌ Имя минимум 2 символа!';
        return;
    }
    if (!password || password.length < 4) {
        errorEl.textContent = '❌ Пароль минимум 4 символа!';
        return;
    }
    if (password !== password2) {
        errorEl.textContent = '❌ Пароли не совпадают!';
        return;
    }

    try {
        const existing = await getUser(username);
        if (existing) {
            errorEl.textContent = '❌ Пользователь уже существует!';
            return;
        }
        const newUser = await createUser(username, password, email);
        if (newUser) {
            successEl.textContent = '✅ Аккаунт создан! Теперь войдите.';
            document.getElementById('reg-username').value = '';
            document.getElementById('reg-email').value = '';
            document.getElementById('reg-password').value = '';
            document.getElementById('reg-password2').value = '';
            setTimeout(() => {
                switchAuthTab('login');
                document.getElementById('login-username').value = username;
                document.getElementById('login-error').textContent = '✅ Аккаунт создан! Войдите.';
            }, 800);
        } else {
            errorEl.textContent = '❌ Ошибка создания.';
        }
    } catch (e) {
        errorEl.textContent = '❌ Ошибка: ' + e.message;
    }
}

async function loginUser() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    if (!username || !password) {
        errorEl.textContent = '❌ Введите имя и пароль!';
        return;
    }

    try {
        const user = await getUser(username);
        if (!user) {
            errorEl.textContent = '❌ Пользователь не найден!';
            return;
        }
        if (user.password !== password) {
            errorEl.textContent = '❌ Неверный пароль!';
            return;
        }
        
        currentUsername = username;
        currentUserData = normalizeUserData(user);
        saveSession(username);
        
        showGameScreen();
        document.getElementById('user-nick').textContent = username;
        await checkDailyRotation();
        await refreshSocialQuests();
        updateUI();
        renderQuests();
        renderGoals();
        renderHotbar();
        renderSocialQuests();
        renderAchievements();
        renderRouletteResult('');
        renderRandomQuestDisplay();
        toast('✅ Добро пожаловать, ' + username + '!', 'success');
    } catch (e) {
        errorEl.textContent = '❌ Ошибка: ' + e.message;
    }
}

function logoutUser() {
    if (confirm('Выйти из аккаунта?')) {
        currentUsername = null;
        currentUserData = null;
        clearSession();
        showAuthScreen();
        toast('👋 До встречи!', 'info');
    }
}

function showAuthScreen() {
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('game-container').classList.remove('active');
}

function showGameScreen() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('game-container').classList.add('active');
}

async function restoreSession() {
    const session = getSession();
    if (!session || !session.username) {
        showAuthScreen();
        return false;
    }

    try {
        const user = await getUser(session.username);
        if (!user) {
            clearSession();
            showAuthScreen();
            return false;
        }

        currentUsername = session.username;
        currentUserData = normalizeUserData(user);
        showGameScreen();
        document.getElementById('user-nick').textContent = currentUsername;
        await checkDailyRotation();
        await refreshSocialQuests();
        updateUI();
        renderQuests();
        renderGoals();
        renderHotbar();
        renderSocialQuests();
        renderAchievements();
        renderRouletteResult('');
        renderRandomQuestDisplay();
        initRoulette();
        toast('🔁 Сессия восстановлена', 'info');
        switchTab('main-screen', document.querySelector('.tab-btn'));
        return true;
    } catch (e) {
        console.error('Session restore error:', e);
        clearSession();
        showAuthScreen();
        return false;
    }
}

// ========================================
//  TOAST-УВЕДОМЛЕНИЯ
// ========================================

function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.textContent = message;
    container.appendChild(toastEl);
    setTimeout(() => {
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateY(10px)';
        setTimeout(() => toastEl.remove(), 300);
    }, 3500);
}

// ========================================
//  ИГРОВАЯ ЛОГИКА
// ========================================

function switchTab(id, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (btn) btn.classList.add('active');
    if (id === 'goals-screen') renderGoals();
    if (id === 'main-screen') {
        renderHotbar();
        renderRandomQuestDisplay();
    }
    if (id === 'quests-screen') {
        renderQuests();
        renderSocialQuests();
    }
    if (id === 'shop-screen') {
        renderRouletteResult('');
        renderInventory();
        drawWheel(currentAngle || 0);
    }
    if (id === 'achieve-screen') renderAchievements();
}

async function checkDailyRotation() {
    if (!currentUserData) return;
    if (!Array.isArray(currentUserData.delayed_quests)) currentUserData.delayed_quests = [];

    const today = new Date().toDateString();
    if (currentUserData.last_quest_date !== today || !currentUserData.current_quests?.length) {

        // ── Проверяем вчерашний день ──────────────────────────────
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yDate = yesterday.toDateString();

        // Считаем выполненными только обязательные (не туториал, не отложенные) квесты
        const missableYesterday = (currentUserData.current_quests || []).filter(isMissableQuest);
        const yesterdayDone = currentUserData.last_quest_date === yDate
            && (missableYesterday.length === 0
                || missableYesterday.every(q => (currentUserData.completed_quests || []).includes(q.id)));

        await processDayChange(yesterdayDone);

        // ── Забираем отложенные квесты из свитка ─────────────────
        const delayed = currentUserData.delayed_quests.splice(0);
        currentUserData.delayed_quests = [];

        // ── Фильтруем базу по уровню ветки ───────────────────────
        const delayedIds = delayed.map(q => q.id);
        const available  = QUESTS_DATABASE.filter(q => {
            if (delayedIds.includes(q.id)) return false;
            const branch = STAT_TO_BRANCH[q.stat] || 'discipline';
            const needed = q.minBranchLevel || 1;
            return getBranchLevel(branch) >= needed;
        });

        const shuffled    = [...available].sort(() => 0.5 - Math.random());
        const freshCount  = Math.max(0, DAILY_QUEST_COUNT - delayed.length);
        const freshQuests = shuffled.slice(0, Math.min(freshCount, shuffled.length));

        currentUserData.current_quests   = [...delayed, ...freshQuests];
        currentUserData.completed_quests = currentUserData.completed_quests?.filter(id => id === 'w1') || [];
        currentUserData.last_quest_date  = today;

        // ── Туториальные квесты для новичков ─────────────────────
        addTutorialQuestsIfNeeded();

        await saveUserData();
    }
}

// Выдаёт туториальные квесты, пока игрок ниже 3-го уровня
function addTutorialQuestsIfNeeded() {
    if (!currentUserData) return;
    if (!Array.isArray(currentUserData.tutorial_done)) currentUserData.tutorial_done = [];
    if (getLevel() >= 3) return;

    const currentIds = (currentUserData.current_quests || []).map(q => q.id);
    TUTORIAL_QUESTS.forEach(tq => {
        const done   = currentUserData.tutorial_done.includes(tq.id);
        const active = currentIds.includes(tq.id);
        if (!done && !active) currentUserData.current_quests.push({ ...tq });
    });
}

function renderQuests() {
    const container = document.getElementById('quests-container');
    if (!container) return;
    if (!currentUserData?.current_quests?.length) {
        container.innerHTML = `<div style="color:var(--text-secondary); text-align:center; padding:20px;">Нет активных квестов. Зайдите завтра!</div>`;
        return;
    }
    container.innerHTML = '';
    currentUserData.current_quests.forEach(q => {
        const isDone = currentUserData.completed_quests.includes(q.id);
        const branch = SKILL_BRANCHES[STAT_TO_BRANCH[q.stat] || 'discipline'];
        const badges = [];
        if (q._tutorial) badges.push('<span class="quest-badge quest-badge--tutorial">🎓 Старт</span>');
        if (q._delayed)  badges.push('<span class="quest-badge quest-badge--delayed">📜 Перенос</span>');
        if (q.minBranchLevel > 1) badges.push(`<span class="quest-badge quest-badge--rank">Lv.${q.minBranchLevel}</span>`);

        const card = document.createElement('div');
        card.className = 'quest-card' + (q._tutorial ? ' quest-card--tutorial' : '') + (q._delayed ? ' quest-card--delayed' : '');
        card.innerHTML = `
            <div class="quest-header">
                <div class="quest-title">${q.title}</div>
                <div class="quest-badges">${badges.join('')}</div>
            </div>
            <div class="quest-desc">${q.desc}</div>
            <div class="quest-meta">
                <span class="quest-branch" style="color:${branch?.color || 'var(--text-mid)'}">${branch?.name || ''}</span>
                <span class="quest-reward">+${q.points} XP / +${q.gold} 🪙</span>
            </div>
            <button class="action-btn ${q.type || ''}" id="${q.id}" ${isDone ? 'disabled' : ''} onclick="completeQuest('${q.id}', '${q.stat}', ${q.points}, ${q.gold})">${isDone ? '✓ Выполнено' : 'Выполнить'}</button>
        `;
        container.appendChild(card);
    });
}

function updateUI() {
    if (!currentUserData) return;
    const stats = currentUserData.stats;
    const total = getTotalXp(stats);
    const lvl    = getLevel();
    const thresh = LEVEL_THRESHOLDS[lvl - 1] ?? 0;
    const next   = lvl < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[lvl] : thresh + 999999;
    const curExp = total - thresh;
    const toNext = next - thresh;

    const avatar = getAvatar(lvl);
    document.getElementById('profile-avatar').textContent = avatar.emoji;
    document.getElementById('header-avatar').textContent = avatar.emoji;
    document.getElementById('profile-avatar').title = avatar.name;
    document.getElementById('header-avatar').title = avatar.name;

    ['str', 'end', 'agi', 'int', 'cha', 'per', 'luck'].forEach(id => {
        const el = document.getElementById(id + '-val');
        if (el) el.textContent = stats[id] || 0;
    });
    document.getElementById('gold-val').textContent = stats.gold || 0;
    document.getElementById('level-display').textContent = lvl;
    document.getElementById('user-level-badge').textContent = 'Lv.' + lvl;
    document.getElementById('exp-display').textContent = curExp + ' / ' + toNext + ' XP';
    document.getElementById('exp-bar').style.width = Math.min(100, Math.round((curExp / toNext) * 100)) + '%';

    let title = '🥚 Обыватель';
    for (const t of TITLES_DATABASE) {
        if (lvl >= t.lvl) { title = t.text; break; }
    }
    document.getElementById('title-display').textContent = title;

    const socialLevel = currentUserData.socialLevel || 1;
    const socialXP = currentUserData.socialXP || 0;
    const socialProgress = Math.min(100, (socialXP / SOCIAL_XP_PER_LEVEL) * 100);
    document.getElementById('social-level-display').textContent = socialLevel;
    document.getElementById('social-xp-display').textContent = socialXP + ' / ' + SOCIAL_XP_PER_LEVEL + ' XP';
    document.getElementById('social-percent-display').textContent = Math.round(socialProgress) + '%';
    document.getElementById('social-bar').style.width = socialProgress + '%';

    const socialBadge = document.getElementById('social-level-badge');
    if (socialBadge) {
        socialBadge.textContent = 'Соц.' + socialLevel;
    }

    renderAchievements();

    const wBtn = document.getElementById('w1');
    if (wBtn) {
        const isDone = currentUserData.completed_quests.includes('w1');
        if (isDone) {
            wBtn.style.background = '#2c2c2e';
            wBtn.style.opacity = '0.4';
            wBtn.style.pointerEvents = 'none';
            wBtn.textContent = 'Выполнено';
        } else {
            wBtn.style.background = 'linear-gradient(135deg, #ff5e00, #ff9500)';
            wBtn.style.opacity = '1';
            wBtn.style.pointerEvents = 'auto';
            wBtn.textContent = 'Выполнить';
        }
    }

    const sBtn = document.getElementById('sleep-action-btn');
    if (sBtn) {
        const hour = new Date().getHours();
        if (currentUserData.last_sleep_date === new Date().toDateString()) {
            sBtn.style.background = '#2c2c2e';
            sBtn.style.opacity = '0.4';
            sBtn.textContent = '💤 Отмечено';
        } else if (hour >= SLEEP_EARLY_HOUR && hour < SLEEP_EVENING_HOUR) {
            sBtn.style.background = '#2c2c2e';
            sBtn.style.opacity = '0.6';
            sBtn.textContent = `⏰ С ${SLEEP_EVENING_HOUR}:00`;
        } else {
            sBtn.style.background = 'linear-gradient(135deg, #0055ff, #0a84ff)';
            sBtn.style.opacity = '1';
            sBtn.textContent = hour >= SLEEP_LATE_HOUR || hour < SLEEP_EARLY_HOUR
                ? '🌙 Поздний отбой'
                : '🛌 Лечь спать';
        }
    }

    renderInventory();
    renderHotbar();
    renderRandomQuestDisplay();

    // ── Новые системы ──
    renderHpBar();
    renderDebuffs();
    renderSkillBranches();
    renderStreakInfo();
    renderArtifacts();
    renderArtifactShop();
    renderTavernStatus();
    const gachaLabel = document.getElementById('gacha-tokens-label');
    if (gachaLabel) gachaLabel.textContent = `🎰 Гача-токены: ${currentUserData?.gachaTokens || 0}`;
}

// ========================================
//  ИНВЕНТАРЬ
// ========================================

function renderInventory() {
    const container = document.getElementById('inventory-list');
    if (!container) return;
    if (!currentUserData) {
        container.innerHTML = `<span style="color:var(--text-secondary); font-style: italic;">Войдите в игру...</span>`;
        return;
    }
    
    if (!Array.isArray(currentUserData.inventory)) {
        if (typeof currentUserData.inventory === 'string') {
            try {
                currentUserData.inventory = JSON.parse(currentUserData.inventory);
                if (!Array.isArray(currentUserData.inventory)) currentUserData.inventory = [];
            } catch (e) {
                currentUserData.inventory = [];
            }
        } else {
            currentUserData.inventory = [];
        }
    }
    
    const inventory = currentUserData.inventory;
    if (inventory.length === 0) {
        container.innerHTML = `<span style="color:var(--text-secondary); font-style: italic;">У вас пока нет снаряжения...</span>`;
        return;
    }
    
    container.innerHTML = inventory.map((item) => {
        if (typeof item === 'string') {
            return `<span class="inv-item">📦 ${item}</span>`;
        }
        if (item && typeof item === 'object') {
            const rarity = RARITIES[item.rarity] || RARITIES.common;
            const statLabel = STAT_LABELS[item.stat] || '';
            const bonusText = item.stat && item.bonus ? `+${item.bonus} ${statLabel}` : '';
            return `
                <span class="inv-item" style="border-color: ${rarity.color}; background: ${rarity.color}22;" title="${item.desc || ''}">
                    <span style="font-size:18px;">${item.icon || '📦'}</span>
                    <span style="font-weight:600;">${item.name || 'Предмет'}</span>
                    ${bonusText ? `<span style="font-size:11px; color:#ffcc00;">${bonusText}</span>` : ''}
                    <span style="font-size:10px; color:${rarity.color}; padding:2px 8px; background:${rarity.color}33; border-radius:8px;">${rarity.label}</span>
                </span>
            `;
        }
        return `<span class="inv-item">📦 Неизвестный предмет</span>`;
    }).join('');
}

// ========================================
//  СОХРАНЕНИЕ ДАННЫХ
// ========================================

async function saveUserData() {
    if (!currentUserData || !currentUsername) {
        console.error('❌ Нечего сохранять');
        return;
    }
    currentUserData = normalizeUserData(currentUserData);
    
    const dataToSave = {
        stats: currentUserData.stats,
        inventory: currentUserData.inventory,
        completed_quests: currentUserData.completed_quests || [],
        current_quests: currentUserData.current_quests || [],
        last_quest_date: currentUserData.last_quest_date || '',
        last_sleep_date: currentUserData.last_sleep_date || '',
        goals: currentUserData.goals || [],
        socialLevel: currentUserData.socialLevel || 1,
        socialXP: currentUserData.socialXP || 0,
        socialQuests: currentUserData.socialQuests || [],
        lastSocialDate: currentUserData.lastSocialDate || '',
        total_quests_completed: currentUserData.total_quests_completed || 0,
        total_social_quests_completed: currentUserData.total_social_quests_completed || 0,
        total_chests_opened: currentUserData.total_chests_opened || 0,
        total_goals_completed: currentUserData.total_goals_completed || 0,
        achievements: currentUserData.achievements || [],
        last_weekly_date: currentUserData.last_weekly_date || '',
        randomQuest: currentUserData.randomQuest || null,
        lastRandomDate: currentUserData.lastRandomDate || '',
        // Новые поля
        hp: currentUserData.hp ?? HP_CONFIG.max,
        maxHp: currentUserData.maxHp ?? HP_CONFIG.max,
        debuffs: currentUserData.debuffs || [],
        branchExp: currentUserData.branchExp || { athletics: 0, intellect: 0, discipline: 0 },
        streak: currentUserData.streak || 0,
        lastStreakDate: currentUserData.lastStreakDate || '',
        gachaTokens: currentUserData.gachaTokens || 0,
        artifacts: currentUserData.artifacts || [],
        tavernMode: currentUserData.tavernMode || false,
        tavernStart: currentUserData.tavernStart || '',
        missedDaysInRow: currentUserData.missedDaysInRow || 0,
        delayed_quests: currentUserData.delayed_quests || [],
        tutorial_done:  currentUserData.tutorial_done  || []
    };
    
    try {
        await updateUser(currentUsername, dataToSave);
    } catch (e) {
        console.error('❌ Ошибка сохранения:', e);
        toast('⚠️ Ошибка сохранения!', 'error');
    }
}

// ========================================
//  ТРЕНИРОВКИ И СОН
// ========================================

async function train(type) {
    if (!currentUserData) return;
    const now = Date.now();
    if (now - lastTrainTime < 1000) {
        toast('⏳ Подожди секунду!', 'warning');
        return;
    }
    lastTrainTime = now;
    currentUserData.stats[type] = (currentUserData.stats[type] || 0) + 10;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 2;
    await saveUserData();
    updateUI();
}

async function checkSleepTime() {
    if (!currentUserData) return;
    const now     = new Date();
    const today   = now.toDateString();
    const hours   = now.getHours();
    const minutes = now.getMinutes();
    const timeStr = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;

    if (currentUserData.last_sleep_date === today) {
        toast('💤 Вы уже отметили сон сегодня!', 'info');
        return;
    }

    // Днём отметка недоступна — только вечером или ночью
    if (hours >= SLEEP_EARLY_HOUR && hours < SLEEP_EVENING_HOUR) {
        toast(`⏰ Отметка сна доступна с ${SLEEP_EVENING_HOUR}:00 до ${SLEEP_LATE_HOUR}:00.`, 'info');
        return;
    }

    const prevTotal = getTotalXp(currentUserData.stats);

    // Штраф: отбой в 23:00+ или до 06:00 (ночная смена)
    const isSleepLate = hours >= SLEEP_LATE_HOUR || hours < SLEEP_EARLY_HOUR;

    if (isSleepLate) {
        applyDamage(HP_CONFIG.damage.sleep_late, 'Отбой после 23:00');
        currentUserData.stats.per = Math.max(0, (currentUserData.stats.per || 0) - 10);

        if (hours >= SLEEP_LATE_HOUR) {
            applyDebuff('cortisol');
        } else if (hours < 3) {
            applyDebuff('cortisol');
        } else {
            applyDebuff('cortisol');
            applyDebuff('brain_fog');
        }
        toast(`🌙 Поздно лёг (${timeStr})! −${HP_CONFIG.damage.sleep_late} HP, −10 Дисциплина.`, 'error');
    } else {
        currentUserData.stats.per  = (currentUserData.stats.per  || 0) + 10;
        currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 15;
        addBranchExp('discipline', 30);
        regenHp(5);
        checkAndNotifyLevelUp(prevTotal);
        toast(`🏆 Отличный режим (${timeStr})! +10 Дисциплина / +15 🪙 / +30 EXP / +5 HP`, 'success');
    }

    currentUserData.last_sleep_date = today;
    await saveUserData();
    updateUI();
}

// ========================================
//  КВЕСТЫ
// ========================================

async function completeQuest(id, type, points, gold) {
    if (!currentUserData || currentUserData.completed_quests.includes(id)) return;

    const prevTotal = getTotalXp(currentUserData.stats);
    const branch = STAT_TO_BRANCH[type] || 'discipline';
    const earnedExp = addBranchExp(branch, points * 10);

    currentUserData.stats[type] = (currentUserData.stats[type] || 0) + points;
    currentUserData.stats.gold  = (currentUserData.stats.gold  || 0) + gold;
    currentUserData.completed_quests.push(id);

    const tQuest = TUTORIAL_QUESTS.find(t => t.id === id);
    if (tQuest) {
        if (!Array.isArray(currentUserData.tutorial_done)) currentUserData.tutorial_done = [];
        if (!currentUserData.tutorial_done.includes(id)) currentUserData.tutorial_done.push(id);
    }
    currentUserData.total_quests_completed = (currentUserData.total_quests_completed || 0) + 1;

    // Стрик — только по обязательным дейликам (без туториала)
    const streakQuests = (currentUserData.current_quests || []).filter(isTrackableQuest);
    const allDone = streakQuests.length > 0
        && streakQuests.every(q => currentUserData.completed_quests.includes(q.id));
    if (allDone) updateStreak(true);

    checkAndNotifyLevelUp(prevTotal);
    await saveUserData();
    updateUI();
    renderQuests();
    renderAchievements();
    toast(`✅ Квест выполнен! +${points} XP / +${earnedExp} ветка, +${gold} 🪙`, 'success');
}

async function completeWeeklyChallenge(btn) {
    if (!currentUserData) return;
    const today = new Date().toDateString();
    const lastWeekly = currentUserData.last_weekly_date || '';
    if (lastWeekly === today) {
        toast('⏳ Вы уже выполнили вызов сегодня!', 'warning');
        return;
    }
    if (lastWeekly) {
        const lastDate = new Date(lastWeekly);
        const diffDays = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            toast('⏳ Выполнить вызов можно раз в неделю!', 'warning');
            return;
        }
    }

    ['str', 'end', 'agi', 'int', 'cha', 'per'].forEach(id => {
        currentUserData.stats[id] = (currentUserData.stats[id] || 0) + 8;
    });
    currentUserData.stats.luck = (currentUserData.stats.luck || 0) + 15;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 100;
    currentUserData.completed_quests.push('w1');
    currentUserData.last_weekly_date = today;
    await saveUserData();
    updateUI();
    toast('⭐ Вызов выполнен! Награда получена!', 'success');
}

// ========================================
//  СИСТЕМА СУНДУКОВ
// ========================================

function getRandomItem() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedRarity = 'common';
    for (const [rarity, config] of Object.entries(RARITIES)) {
        cumulative += config.weight;
        if (rand <= cumulative) {
            selectedRarity = rarity;
            break;
        }
    }
    const pool = ITEMS_POOL.filter(item => item.rarity === selectedRarity);
    if (pool.length === 0) {
        return ITEMS_POOL[Math.floor(Math.random() * ITEMS_POOL.length)];
    }
    return JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]));
}

// ── CHEST ANIMATION ──────────────────────────────────────────────────────

const RARITY_GLOW = {
    legendary: '#ffe600',
    epic:       '#cc44ff',
    rare:       '#4488ff',
    uncommon:   '#00ff88',
    common:     '#aaaacc',
};

const CHEST_EMOJI_MAP = {
    common: '📦',
    epic:   '👑',
};

function spawnParticles(color) {
    const container = document.getElementById('chest-particles');
    container.innerHTML = '';
    const count = 28;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'chest-particle';
        const angle = (i / count) * 360;
        const dist  = 80 + Math.random() * 100;
        const rad   = angle * Math.PI / 180;
        const tx    = Math.cos(rad) * dist + 'px';
        const ty    = Math.sin(rad) * dist + 'px';
        const size  = 4 + Math.random() * 7;
        const delay = Math.random() * 0.15;
        const dur   = 0.5 + Math.random() * 0.4;
        p.style.cssText = `
            background: ${color};
            width: ${size}px; height: ${size}px;
            --tx: ${tx}; --ty: ${ty};
            box-shadow: 0 0 6px ${color};
            animation: particle-fly ${dur}s ease-out ${delay}s forwards;
        `;
        container.appendChild(p);
    }
}

function flashRing(color) {
    const ring = document.getElementById('chest-ring');
    ring.style.border = `3px solid ${color}`;
    ring.style.boxShadow = `0 0 30px ${color}, inset 0 0 20px ${color}`;
    ring.classList.remove('pop');
    void ring.offsetWidth; // reflow
    ring.classList.add('pop');
}

function showChestModal(tier, item) {
    const modal     = document.getElementById('chest-modal');
    const emojiEl   = document.getElementById('chest-emoji');
    const labelEl   = document.getElementById('chest-label');
    const revealEl  = document.getElementById('chest-item-reveal');
    const iconEl    = document.getElementById('chest-item-icon');
    const nameEl    = document.getElementById('chest-item-name');
    const rarityEl  = document.getElementById('chest-item-rarity');
    const bonusEl   = document.getElementById('chest-item-bonus');
    const closeBtn  = document.getElementById('chest-close-btn');

    const rarityConfig = RARITIES[item.rarity] || RARITIES.common;
    const glowColor    = RARITY_GLOW[item.rarity] || '#aaaacc';
    const chestEmoji   = CHEST_EMOJI_MAP[tier] || '📦';

    // Reset state
    emojiEl.className   = 'chest-emoji idle';
    emojiEl.textContent = chestEmoji;
    emojiEl.style.setProperty('--burst-color', glowColor);
    labelEl.textContent   = 'Нажмите, чтобы открыть';
    revealEl.classList.remove('visible');
    closeBtn.classList.remove('visible');
    iconEl.textContent    = item.icon || '🎁';
    nameEl.textContent    = item.name;
    rarityEl.textContent  = rarityConfig.label || item.rarity;
    rarityEl.style.background = glowColor;
    rarityEl.style.color      = '#000';
    bonusEl.textContent = `+${item.bonus} к ${STAT_LABELS[item.stat] || 'характеристике'}`;
    iconEl.style.filter = `drop-shadow(0 0 16px ${glowColor})`;

    modal.classList.add('active');

    // Make chest clickable to open
    let opened = false;
    function doOpen() {
        if (opened) return;
        opened = true;
        emojiEl.removeEventListener('click', doOpen);
        labelEl.textContent = '...';

        // 1. Shake phase
        emojiEl.className = 'chest-emoji shaking';

        setTimeout(() => {
            // 2. Burst
            emojiEl.className = 'chest-emoji burst';
            emojiEl.textContent = tier === 'epic' ? '🎁' : '📬';
            spawnParticles(glowColor);
            flashRing(glowColor);
            labelEl.textContent = 'Вы получили...';
        }, 600);

        setTimeout(() => {
            // 3. Show item
            revealEl.classList.add('visible');
        }, 1100);

        setTimeout(() => {
            // 4. Show close button
            closeBtn.classList.add('visible');
        }, 1600);
    }

    emojiEl.style.cursor = 'pointer';
    emojiEl.addEventListener('click', doOpen);

    // Also auto-open after 2s if user doesn't click
    setTimeout(() => doOpen(), 2000);
}

function closeChestModal() {
    document.getElementById('chest-modal').classList.remove('active');
    document.getElementById('chest-particles').innerHTML = '';
}

// ── OPEN CHEST (main function) ────────────────────────────────────────────

async function openChest(tier, price) {
    if (!currentUserData) return;
    if ((currentUserData.stats.gold || 0) < price) {
        toast('❌ Недостаточно монет!', 'error');
        return;
    }
    currentUserData.stats.gold -= price;
    const item = getRandomItem();
    if (!Array.isArray(currentUserData.inventory)) {
        currentUserData.inventory = [];
    }
    currentUserData.inventory.push(item);
    if (item.stat && item.bonus) {
        currentUserData.stats[item.stat] = (currentUserData.stats[item.stat] || 0) + item.bonus;
    }
    currentUserData.total_chests_opened = (currentUserData.total_chests_opened || 0) + 1;
    await saveUserData();
    updateUI();
    renderInventory();
    renderAchievements();
    // Show animated modal instead of plain toast
    showChestModal(tier, item);
}

// ========================================
//  СИСТЕМА ЦЕЛЕЙ
// ========================================

function getRarityConfig(rarity) {
    return RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
}

function updateRewardPreview() {
    const rarity = document.getElementById('goal-rarity')?.value || 'common';
    const stat = document.getElementById('goal-stat')?.value || 'str';
    const config = getRarityConfig(rarity);
    const previewEl = document.getElementById('goal-reward-preview');
    if (previewEl) {
        previewEl.innerHTML = `
            🎁 Награда: <span style="color:#ffcc00;">+${config.xp} XP</span> + 
            <span style="color:${config.color};">+${config.statBonus} ${STAT_LABELS[stat]}</span>
            <span style="color:var(--text-secondary); font-size:11px; margin-left:8px;">(${config.label})</span>
        `;
    }
}

function showAddGoalModal() {
    document.getElementById('goal-modal').classList.add('active');
    document.getElementById('goal-title').value = '';
    document.getElementById('goal-desc').value = '';
    document.getElementById('goal-target').value = '';
    document.getElementById('goal-unit').value = '';
    document.getElementById('goal-rarity').value = 'common';
    document.getElementById('goal-stat').value = 'str';
    updateRewardPreview();
}

function closeGoalModal() {
    document.getElementById('goal-modal').classList.remove('active');
}

async function addGoal() {
    const title = document.getElementById('goal-title').value.trim();
    const description = document.getElementById('goal-desc').value.trim();
    const target = parseFloat(document.getElementById('goal-target').value);
    const unit = document.getElementById('goal-unit').value.trim();
    const rarity = document.getElementById('goal-rarity').value;
    const stat = document.getElementById('goal-stat').value;
    const config = getRarityConfig(rarity);

    if (!title) {
        toast('❌ Введите название цели!', 'error');
        return;
    }
    if (!target || target <= 0) {
        toast('❌ Введите целевое значение (число > 0)!', 'error');
        return;
    }

    const newGoal = {
        id: Date.now().toString(),
        title,
        description: description || '',
        target,
        current: 0,
        unit: unit || '',
        rarity: rarity,
        stat: stat,
        xpReward: config.xp,
        statBonus: config.statBonus,
        completed: false,
        createdAt: new Date().toISOString()
    };

    if (!Array.isArray(currentUserData.goals)) {
        currentUserData.goals = [];
    }
    currentUserData.goals.push(newGoal);
    await saveUserData();
    closeGoalModal();
    renderGoals();
    renderHotbar();
    toast(`🎯 Цель "${title}" добавлена! (${config.label})`, 'success');
}

function renderHotbar() {
    const container = document.getElementById('hotbar-goals');
    if (!container) return;
    if (!currentUserData?.goals?.length) {
        container.innerHTML = '<div class="hotbar-empty">Нет активных целей. Добавьте!</div>';
        return;
    }
    const activeGoals = currentUserData.goals.filter(g => !g.completed).slice(0, 3);
    if (!activeGoals.length) {
        container.innerHTML = '<div class="hotbar-empty">Все цели выполнены! 🎉</div>';
        return;
    }
    container.innerHTML = activeGoals.map(g => {
        const config = getRarityConfig(g.rarity);
        const progress = g.target > 0 ? Math.min(100, (g.current || 0) / g.target * 100) : 0;
        const isDone = progress >= 100;
        return `
            <div class="hotbar-goal" style="border-left-color: ${config.color};">
                <div>
                    <div class="title">${g.title}</div>
                    <div class="progress">${g.current || 0} / ${g.target} ${g.unit || ''}</div>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span class="rarity-badge" style="background:${config.color};">${config.label}</span>
                    ${isDone ? '<span class="done">✅</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderGoals() {
    const container = document.getElementById('goals-container');
    if (!container) return;
    if (!currentUserData?.goals?.length) {
        container.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:20px;">У вас пока нет целей. Добавьте первую!</div>';
        return;
    }
    container.innerHTML = currentUserData.goals.map((g, index) => {
        const config = getRarityConfig(g.rarity);
        const progress = g.target > 0 ? Math.min(100, (g.current || 0) / g.target * 100) : 0;
        const isCompleted = g.completed || progress >= 100;
        return `
            <div class="goal-card ${isCompleted ? 'completed' : ''}" style="border-color: ${isCompleted ? '#30d158' : config.color};">
                <div class="goal-header">
                    <div class="goal-title" style="color: ${isCompleted ? '#30d158' : config.color};">${g.title}</div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="rarity-badge" style="background:${config.color};">${config.label}</span>
                        <div style="font-size:13px; color:var(--text-secondary);">${Math.round(progress)}%</div>
                    </div>
                </div>
                ${g.description ? `<div class="goal-desc">${g.description}</div>` : ''}
                <div class="goal-progress">
                    <span style="font-size:13px; color:var(--text-secondary);">${g.current || 0}</span>
                    <div class="goal-progress-bar">
                        <div class="fill" style="width:${progress}%; background: ${config.color};"></div>
                    </div>
                    <span style="font-size:13px; color:var(--text-secondary);">${g.target} ${g.unit || ''}</span>
                </div>
                <div class="goal-reward">
                    🎁 Награда: <span>+${config.xp} XP</span> + <span style="color:${config.color};">+${config.statBonus} ${STAT_LABELS[g.stat] || '💪 Сила'}</span>
                </div>
                <div class="goal-actions">
                    ${!isCompleted ? `
                        <button onclick="updateGoalProgress(${index}, 1)">➕ +1</button>
                        <button onclick="updateGoalProgress(${index}, 5)">➕ +5</button>
                        <button onclick="updateGoalProgress(${index}, 10)">➕ +10</button>
                        <button onclick="setGoalComplete(${index})" class="done-btn">✅ Выполнено</button>
                    ` : `
                        <span style="color:#30d158; font-weight:600;">✅ Выполнено!</span>
                    `}
                    <button onclick="deleteGoal(${index})" class="delete-btn">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

async function updateGoalProgress(index, amount) {
    if (!currentUserData?.goals?.[index]) return;
    const goal = currentUserData.goals[index];
    if (goal.completed) return;
    goal.current = (goal.current || 0) + amount;
    if (goal.current >= goal.target) {
        goal.current = goal.target;
        goal.completed = true;
        await claimGoalReward(index);
        toast(`🎉 Цель "${goal.title}" выполнена! Молодец!`, 'success');
    }
    await saveUserData();
    renderGoals();
    renderHotbar();
    updateUI();
    renderAchievements();
}

async function setGoalComplete(index) {
    if (!currentUserData?.goals?.[index]) return;
    const goal = currentUserData.goals[index];
    if (goal.completed) return;
    if (!confirm(`Отметить "${goal.title}" как выполненную?`)) return;
    goal.completed = true;
    goal.current = goal.target;
    await claimGoalReward(index);
    await saveUserData();
    renderGoals();
    renderHotbar();
    updateUI();
    renderAchievements();
    toast('✅ Цель отмечена как выполненная! Награда получена!', 'success');
}

async function claimGoalReward(index) {
    if (!currentUserData?.goals?.[index]) return;
    const goal = currentUserData.goals[index];
    const config = getRarityConfig(goal.rarity);
    const targetStat = goal.stat || 'str';
    currentUserData.stats[targetStat] = (currentUserData.stats[targetStat] || 0) + config.statBonus;
    currentUserData.stats.luck = (currentUserData.stats.luck || 0) + Math.floor(config.xp / 5);
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + config.xp * 2;
    currentUserData.total_goals_completed = (currentUserData.total_goals_completed || 0) + 1;
}

async function deleteGoal(index) {
    if (!currentUserData?.goals?.[index]) return;
    const goal = currentUserData.goals[index];
    if (!confirm(`Удалить цель "${goal.title}"?`)) return;
    currentUserData.goals.splice(index, 1);
    await saveUserData();
    renderGoals();
    renderHotbar();
}

// ========================================
//  СОЦИАЛЬНЫЕ КВЕСТЫ
// ========================================

async function refreshSocialQuests() {
    if (!currentUserData) return;
    const today = new Date().toDateString();
    if (currentUserData.lastSocialDate !== today || !currentUserData.socialQuests?.length) {
        const chaLevel = currentUserData.stats.cha || 0;
        let rank = 1;
        if (chaLevel >= 26) rank = 6;
        else if (chaLevel >= 21) rank = 5;
        else if (chaLevel >= 16) rank = 4;
        else if (chaLevel >= 11) rank = 3;
        else if (chaLevel >= 6) rank = 2;

        const available = SOCIAL_QUESTS_DB.filter(q => q.rank === rank);
        const shuffled = available.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 2);
        currentUserData.socialQuests = selected.map(q => ({ ...q, completed: false }));
        currentUserData.lastSocialDate = today;
        await saveUserData();
    }
}

function renderSocialQuests() {
    const container = document.getElementById('social-quests-container');
    if (!container) return;
    if (!currentUserData?.socialQuests?.length) {
        container.innerHTML = '<div class="social-quest-empty">Нет доступных социальных квестов. Зайдите завтра!</div>';
        return;
    }
    container.innerHTML = '';
    currentUserData.socialQuests.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'social-quest-card';
        const isDone = q.completed;
        card.innerHTML = `
            <div class="social-quest-rank">Ранг ${q.rank}</div>
            <div class="title">${q.title}</div>
            <div class="desc">${q.desc}</div>
            <div class="reward">🎁 Награда: +${q.xpReward} XP соц. уровня, +${q.socialBonus} к Харизме</div>
            <div class="actions">
                <button onclick="completeSocialQuest(${index})" ${isDone ? 'class="done"' : ''}>${isDone ? '✅ Выполнено' : '✅ Выполнить'}</button>
            </div>
        `;
        container.appendChild(card);
    });
    updateSocialTimer();
}

async function completeSocialQuest(index) {
    if (!currentUserData?.socialQuests?.[index]) return;
    const quest = currentUserData.socialQuests[index];
    if (quest.completed) {
        toast('Этот квест уже выполнен!', 'warning');
        return;
    }
    quest.completed = true;
    currentUserData.socialXP = (currentUserData.socialXP || 0) + quest.xpReward;
    currentUserData.stats.cha = (currentUserData.stats.cha || 0) + quest.socialBonus;
    currentUserData.total_social_quests_completed = (currentUserData.total_social_quests_completed || 0) + 1;
    let leveledUp = false;
    while (currentUserData.socialXP >= SOCIAL_XP_PER_LEVEL) {
        currentUserData.socialXP -= SOCIAL_XP_PER_LEVEL;
        currentUserData.socialLevel = (currentUserData.socialLevel || 1) + 1;
        leveledUp = true;
    }
    await saveUserData();
    updateUI();
    renderSocialQuests();
    renderAchievements();
    if (leveledUp) {
        toast(`🎉 Социальный уровень повышен! Теперь ты ${currentUserData.socialLevel} уровень!`, 'success');
    } else {
        toast(`✅ Квест выполнен! +${quest.xpReward} XP, +${quest.socialBonus} к харизме.`, 'success');
    }
    await refreshSocialQuests();
}

function updateSocialTimer() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const timerEl = document.getElementById('social-timer');
    if (timerEl) {
        timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

// ========================================
//  ДОСТИЖЕНИЯ
// ========================================

function renderAchievements() {
    const container = document.getElementById('achievements-container');
    if (!container) return;
    if (!currentUserData) {
        container.innerHTML = '<div style="color:var(--text-secondary); text-align:center;">Войдите, чтобы видеть достижения</div>';
        return;
    }
    
    if (!Array.isArray(currentUserData.achievements)) {
        currentUserData.achievements = [];
    }
    
    let anyUnlocked = false;
    const toUnlock = [];
    ACHIEVEMENTS_DB.forEach(ach => {
        if (!currentUserData.achievements.includes(ach.id) && ach.check()) {
            toUnlock.push(ach);
            currentUserData.achievements.push(ach.id);
            if (ach.reward.stats) {
                Object.keys(ach.reward.stats).forEach(stat => {
                    currentUserData.stats[stat] = (currentUserData.stats[stat] || 0) + ach.reward.stats[stat];
                });
            }
            if (ach.reward.gold) {
                currentUserData.stats.gold = (currentUserData.stats.gold || 0) + ach.reward.gold;
            }
            anyUnlocked = true;
        }
    });
    
    if (anyUnlocked) {
        saveUserData().then(() => {
            updateUI();
            toUnlock.forEach(ach => toast(`🏆 Достижение разблокировано: ${ach.title}!`, 'success'));
        });
    }
    
    container.innerHTML = ACHIEVEMENTS_DB.map(ach => {
        const unlocked = currentUserData.achievements.includes(ach.id);
        const progress = ach.check() ? 1 : 0;
        const progressPercent = progress * 100;
        return `
            <div class="achieve-card ${unlocked ? '' : 'locked'}">
                <div class="achieve-header">
                    <span class="achieve-title">${unlocked ? '✅' : '🔒'} ${ach.title}</span>
                    <span class="achieve-badge">${unlocked ? 'Получено' : 'Закрыто'}</span>
                </div>
                <div class="achieve-desc">${ach.desc}</div>
                <div class="achieve-progress-bar"><div class="fill" style="width:${progressPercent}%;"></div></div>
                <div class="achieve-progress">${unlocked ? 'Выполнено!' : 'Не выполнено'}</div>
                <div class="achieve-reward">
                    🎁 Награда: 
                    ${ach.reward.stats ? Object.entries(ach.reward.stats).map(([s, v]) => `+${v} ${STAT_LABELS[s]}`).join(', ') : ''}
                    ${ach.reward.gold ? `+${ach.reward.gold} 🪙` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ========================================
//  НОВАЯ РУЛЕТКА (КАЗИНО-СТИЛЬ)
// ========================================

const ROULETTE_SECTORS = [
    { emoji: '🎁', label: 'Подарок', color: '#ff6b6b' },
    { emoji: '💰', label: 'Монеты', color: '#feca57' },
    { emoji: '💎', label: 'Алмаз', color: '#48dbfb' },
    { emoji: '⭐', label: 'Звезда', color: '#ff9ff3' },
    { emoji: '🏆', label: 'Трофей', color: '#f368e0' },
    { emoji: '🎯', label: 'Мишень', color: '#ff9f43' },
    { emoji: '🎲', label: 'Кубик', color: '#00d2d3' },
    { emoji: '🌀', label: 'Циклон', color: '#54a0ff' }
];

let rouletteCanvas = null;
let ctx = null;
let isSpinning = false;
let currentAngle = 0;
let spinVelocity = 0;
let animationId = null;

function initRoulette() {
    const canvas = document.getElementById('roulette-canvas');
    if (!canvas) return;
    // Fix canvas resolution to match its CSS display size
    const size = Math.min(canvas.parentElement?.offsetWidth || 320, 320);
    canvas.width  = size;
    canvas.height = size;
    rouletteCanvas = canvas;
    ctx = canvas.getContext('2d');
    drawWheel(currentAngle);
}

function drawWheel(angle) {
    if (!ctx || !rouletteCanvas) return;
    const canvas = rouletteCanvas;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R  = Math.min(W, H) * 0.46;   // outer edge of sectors

    ctx.clearRect(0, 0, W, H);

    const count = ROULETTE_SECTORS.length;
    const arc   = (2 * Math.PI) / count;

    // ── Dark sector colours (desaturated, cyberpunk) ──
    const DARK_COLORS = [
        { bg: '#1a0a2e', neon: '#cc44ff' },  // deep purple / violet
        { bg: '#0a1a2e', neon: '#00ccff' },  // deep blue   / cyan
        { bg: '#1a1a0a', neon: '#ffcc00' },  // dark olive  / gold
        { bg: '#2e0a1a', neon: '#ff2277' },  // deep rose   / magenta
        { bg: '#0a2e1a', neon: '#00ff88' },  // dark green  / lime
        { bg: '#1a0e0a', neon: '#ff6633' },  // dark rust   / orange
        { bg: '#0e0a2e', neon: '#8866ff' },  // indigo      / lavender
        { bg: '#2e2a0a', neon: '#ffee44' },  // dark amber  / yellow
    ];

    // ── 1. Outer decorative ring tick-marks ──────────
    const tickCount = count * 6;
    const tickInner = R + 4;
    const tickOuter = R + 14;
    for (let i = 0; i < tickCount; i++) {
        const a = (i / tickCount) * 2 * Math.PI + angle;
        const isMajor = i % 6 === 0;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * tickInner, cy + Math.sin(a) * tickInner);
        ctx.lineTo(cx + Math.cos(a) * (isMajor ? tickOuter : tickOuter - 4), cy + Math.sin(a) * (isMajor ? tickOuter : tickOuter - 4));
        ctx.strokeStyle = isMajor ? 'rgba(255,0,204,0.8)' : 'rgba(255,0,204,0.3)';
        ctx.lineWidth = isMajor ? 1.5 : 0.8;
        ctx.stroke();
    }

    // ── 2. Draw sectors ──────────────────────────────
    ROULETTE_SECTORS.forEach((sector, i) => {
        const col = DARK_COLORS[i % DARK_COLORS.length];
        const startAngle = angle + i * arc;
        const endAngle   = startAngle + arc;

        // Sector fill — radial gradient dark→slightly lighter
        const grad = ctx.createRadialGradient(cx, cy, R * 0.18, cx, cy, R);
        grad.addColorStop(0,   col.bg);
        grad.addColorStop(0.6, col.bg);
        grad.addColorStop(1,   col.neon + '33');
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Sector border — neon line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = col.neon + '55';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Neon arc on outer edge of sector
        ctx.beginPath();
        ctx.arc(cx, cy, R, startAngle + 0.04, endAngle - 0.04);
        ctx.strokeStyle = col.neon;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = col.neon;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Divider lines
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(startAngle) * R * 0.2, cy + Math.sin(startAngle) * R * 0.2);
        ctx.lineTo(cx + Math.cos(startAngle) * R,       cy + Math.sin(startAngle) * R);
        ctx.strokeStyle = col.neon + '88';
        ctx.lineWidth = 1.2;
        ctx.shadowColor = col.neon;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Emoji icon
        const midAngle  = startAngle + arc / 2;
        const textR     = R * 0.68;
        const x = cx + Math.cos(midAngle) * textR;
        const y = cy + Math.sin(midAngle) * textR;
        ctx.font = `${Math.round(R * 0.2)}px sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = '#fff';
        ctx.shadowColor  = col.neon;
        ctx.shadowBlur   = 12;
        ctx.fillText(sector.emoji, x, y);
        ctx.shadowBlur = 0;

        // Small sector label
        const labelR = R * 0.88;
        const lx = cx + Math.cos(midAngle) * labelR;
        const ly = cy + Math.sin(midAngle) * labelR;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(midAngle + Math.PI / 2);
        ctx.font = `bold ${Math.round(R * 0.07)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = col.neon;
        ctx.shadowColor = col.neon;
        ctx.shadowBlur  = 6;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sector.label.toUpperCase(), 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
    });

    // ── 3. Outer ring border ─────────────────────────
    // Dark ring gap
    ctx.beginPath();
    ctx.arc(cx, cy, R + 2, 0, 2 * Math.PI);
    ctx.strokeStyle = '#0a0a18';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Neon outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, R + 6, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ff00cc';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff00cc';
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Second neon ring (thinner, cyan)
    ctx.beginPath();
    ctx.arc(cx, cy, R + 12, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── 4. Inner hub ─────────────────────────────────
    const hubR = R * 0.16;

    // Hub glow base
    const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubR);
    hubGrad.addColorStop(0,   '#3a1a4a');
    hubGrad.addColorStop(0.6, '#1a0a2e');
    hubGrad.addColorStop(1,   '#0d0018');
    ctx.beginPath();
    ctx.arc(cx, cy, hubR, 0, 2 * Math.PI);
    ctx.fillStyle = hubGrad;
    ctx.fill();

    // Hub neon ring
    ctx.beginPath();
    ctx.arc(cx, cy, hubR, 0, 2 * Math.PI);
    ctx.strokeStyle = '#bf5af2';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#bf5af2';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner spike / rivet effect
    for (let s = 0; s < 4; s++) {
        const sa = (s / 4) * Math.PI * 2 + angle * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(sa) * hubR * 0.4, cy + Math.sin(sa) * hubR * 0.4);
        ctx.lineTo(cx + Math.cos(sa) * hubR * 0.9, cy + Math.sin(sa) * hubR * 0.9);
        ctx.strokeStyle = 'rgba(191,90,242,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, hubR * 0.28, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#bf5af2';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
}

async function spinRoulette() {
    if (!currentUserData) {
        toast('❌ Сначала войдите в игру!', 'error');
        return;
    }
    if ((currentUserData.stats.gold || 0) < 50) {
        toast('❌ Недостаточно монет! Нужно 50 🪙', 'error');
        return;
    }
    if (isSpinning) return;
    isSpinning = true;
    document.getElementById('roulette-spin-btn').disabled = true;

    currentUserData.stats.gold -= 50;
    await saveUserData();

    const totalRotation = 4 * 2 * Math.PI + Math.random() * 2 * Math.PI;
    const startAngle = currentAngle;
    const targetAngle = startAngle + totalRotation;
    const duration = 4000;
    const startTime = performance.now();

    function animateSpin(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startAngle + totalRotation * eased;
        drawWheel(current);
        if (progress < 1) {
            requestAnimationFrame(animateSpin);
        } else {
            currentAngle = targetAngle;
            drawWheel(currentAngle);
            isSpinning = false;
            document.getElementById('roulette-spin-btn').disabled = false;
            // Выбор сектора
            const normalized = ((targetAngle % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
            const sectorIndex = Math.floor(normalized / (2*Math.PI / ROULETTE_SECTORS.length)) % ROULETTE_SECTORS.length;
            const sector = ROULETTE_SECTORS[sectorIndex];
            // Здесь можно использовать выбранный сектор для награды, но мы используем предметную систему
            const item = getRandomItem();
            if (!Array.isArray(currentUserData.inventory)) {
                currentUserData.inventory = [];
            }
            currentUserData.inventory.push(item);
            if (item.stat && item.bonus) {
                currentUserData.stats[item.stat] = (currentUserData.stats[item.stat] || 0) + item.bonus;
            }
            saveUserData().then(() => {
                const rarityConfig = RARITIES[item.rarity] || RARITIES.common;
                renderRouletteResult(`✦ ${rarityConfig.label}: ${item.name}  +${item.bonus} ${STAT_LABELS[item.stat] || 'все статы'}`);
                updateUI();
                renderInventory();
                renderAchievements();
                // Flash effect
                const flash = document.getElementById('roulette-flash');
                if (flash) { flash.classList.add('active'); setTimeout(() => flash.classList.remove('active'), 700); }
                // Result text colour
                const resultEl = document.getElementById('roulette-result');
                if (resultEl) { resultEl.style.color = rarityConfig.color || '#00ffff'; setTimeout(() => { resultEl.style.color = ''; }, 4000); }
                toast(`🎡 Вы выиграли: ${rarityConfig.label}\n${item.icon} ${item.name}\n+${item.bonus} ${STAT_LABELS[item.stat] || 'всем статам'}`, 'success');
            });
        }
    }
    requestAnimationFrame(animateSpin);
}

function renderRouletteResult(text) {
    const resultEl = document.getElementById('roulette-result');
    if (resultEl) {
        resultEl.textContent = text || '';
    }
}

// ========================================
//  РУЛЕТКА ЗАДАНИЙ (RANDOM QUEST)
// ========================================

// Получить доступные задания по социальному уровню
function getAvailableRandomQuests() {
    const socialLevel = currentUserData?.socialLevel || 1;
    return SOCIAL_QUESTS_DB.filter(q => q.minSocialLevel <= socialLevel);
}

// Отображение принятого квеста на главном экране
function renderRandomQuestDisplay() {
    const container = document.getElementById('random-quest-display');
    if (!container) return;
    if (!currentUserData) {
        container.innerHTML = 'Нажмите «Крутить», чтобы получить случайное задание.';
        return;
    }
    const quest = currentUserData.randomQuest;
    if (!quest) {
        container.innerHTML = 'Нажмите «Крутить», чтобы получить случайное задание.';
        return;
    }
    // Проверяем, не выполнен ли уже
    if (quest.completed) {
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--accent-green);">
                <div>
                    <span style="font-weight: 600; color: var(--text-primary);">${quest.title}</span>
                    <span style="font-size: 12px; color: var(--text-secondary); margin-left: 8px;">(выполнено)</span>
                </div>
                <span style="color: var(--accent-green);">✅</span>
            </div>
        `;
        return;
    }
    const difficultyLabel = { easy: '🌱 Легко', medium: '⚡ Средне', hard: '🔥 Хардкор' }[quest.difficulty] || '';
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--accent-magenta); flex-wrap: wrap; gap: 8px;">
            <div>
                <div style="font-weight: 600; color: var(--text-primary);">${quest.title}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${difficultyLabel} • +${quest.xpReward} XP соц. • +${quest.socialBonus} харизмы</div>
            </div>
            <button class="action-btn" style="background: var(--accent-green); width: auto; padding: 6px 16px; font-size: 13px;" onclick="completeRandomQuest()">✅ Выполнить</button>
        </div>
    `;
}

// Запуск рулетки заданий (вызов из кнопки)
function startRandomQuest() {
    if (!currentUserData) {
        toast('❌ Войдите в игру!', 'error');
        return;
    }
    // Проверка, не использовали ли сегодня
    const today = new Date().toDateString();
    if (currentUserData.lastRandomDate === today) {
        toast('⏳ Вы уже крутили сегодня! Завтра будет новый шанс.', 'warning');
        return;
    }
    // Проверка, есть ли уже активный невыполненный квест
    if (currentUserData.randomQuest && !currentUserData.randomQuest.completed) {
        toast('⚠️ У вас уже есть активный случайный квест! Выполните его или дождитесь завтра.', 'warning');
        return;
    }

    // Фильтруем доступные задания
    const available = getAvailableRandomQuests();
    if (available.length === 0) {
        toast('❌ Нет доступных заданий для вашего уровня.', 'error');
        return;
    }

    // Показываем модалку с анимацией
    const modal = document.getElementById('roulette-modal');
    modal.classList.add('active');
    const spinText = document.getElementById('roulette-spin-text');
    const resultText = document.getElementById('roulette-result-text');
    const actionsDiv = document.getElementById('roulette-actions');
    const acceptBtn = document.getElementById('roulette-accept-btn');
    const skipBtn = document.getElementById('roulette-skip-btn');
    const closeBtn = document.getElementById('roulette-close-btn');

    // Сброс
    spinText.textContent = '🎰';
    resultText.textContent = '';
    actionsDiv.style.display = 'none';
    acceptBtn.disabled = false;
    skipBtn.disabled = false;

    // Эффект крутящегося барабана (смена эмодзи)
    let count = 0;
    const emojis = ['🎲', '🎰', '🌀', '⚡', '🔥', '✨', '💫', '🌟'];
    const interval = setInterval(() => {
        spinText.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        count++;
        if (count > 15) { // примерно 2 секунды (15*130ms ≈ 2с)
            clearInterval(interval);
            // Выбираем задание
            const chosen = available[Math.floor(Math.random() * available.length)];
            // Сохраняем выбранное задание в модалке (временно)
            const questCopy = { ...chosen, completed: false };
            spinText.textContent = chosen.emoji || '🎯';
            resultText.textContent = `«${chosen.title}» — ${chosen.desc}`;
            actionsDiv.style.display = 'flex';

            // Обработчики
            acceptBtn.onclick = function() {
                if (currentUserData.randomQuest && !currentUserData.randomQuest.completed) {
                    toast('⚠️ У вас уже есть активный квест!', 'warning');
                    return;
                }
                // Сохраняем квест в данные
                currentUserData.randomQuest = { ...questCopy };
                currentUserData.lastRandomDate = new Date().toDateString();
                saveUserData().then(() => {
                    modal.classList.remove('active');
                    renderRandomQuestDisplay();
                    updateUI();
                    toast(`✅ Квест «${questCopy.title}» принят! Выполняйте!`, 'success');
                });
                acceptBtn.disabled = true;
                skipBtn.disabled = true;
            };

            skipBtn.onclick = function() {
                // Можно крутить дальше только если сегодня ещё не крутили
                if (currentUserData.lastRandomDate === new Date().toDateString()) {
                    toast('⏳ Сегодня вы уже использовали попытку. Хотите сбросить?', 'warning');
                    // Можно разрешить повторно, но за плату или без - оставим как есть, но дадим второй шанс за 10 монет?
                    // По условию - один бесплатный в день. Поэтому предложим пропустить и закрыть модалку.
                    modal.classList.remove('active');
                    toast('🔄 Вы пропустили задание. Приходите завтра!', 'info');
                } else {
                    // Можно перекрутить, но это будет считаться использованием попытки? Сделаем так: повторный клик "Крутить дальше" закрывает модалку и даёт шанс снова, но уже с пометкой использовано.
                    // Но чтобы не нарушать логику, мы уже записали lastRandomDate? Нет, мы ещё не записали. Поэтому если пропустить, то даём возможность попробовать снова, но только если не принимали.
                    // При пропуске мы просто закрываем модалку, и пользователь может нажать снова, но тогда он потратит попытку.
                    // Поскольку мы ещё не сохранили lastRandomDate, то можно закрыть и дать попробовать снова.
                    modal.classList.remove('active');
                    toast('🔄 Вы пропустили это задание. Попробуйте снова!', 'info');
                }
                skipBtn.disabled = true;
                acceptBtn.disabled = true;
            };

            closeBtn.onclick = function() {
                modal.classList.remove('active');
            };
        }
    }, 130);
}

// Выполнение случайного квеста
async function completeRandomQuest() {
    if (!currentUserData || !currentUserData.randomQuest || currentUserData.randomQuest.completed) {
        toast('❌ Нет активного случайного квеста.', 'error');
        return;
    }
    const quest = currentUserData.randomQuest;
    // Начисляем награду
    currentUserData.socialXP = (currentUserData.socialXP || 0) + quest.xpReward;
    currentUserData.stats.cha = (currentUserData.stats.cha || 0) + quest.socialBonus;
    quest.completed = true;
    // Повышение соц. уровня
    let leveledUp = false;
    while (currentUserData.socialXP >= SOCIAL_XP_PER_LEVEL) {
        currentUserData.socialXP -= SOCIAL_XP_PER_LEVEL;
        currentUserData.socialLevel = (currentUserData.socialLevel || 1) + 1;
        leveledUp = true;
    }
    await saveUserData();
    updateUI();
    renderRandomQuestDisplay();
    renderAchievements();
    if (leveledUp) {
        toast(`🎉 Социальный уровень повышен! Теперь ты ${currentUserData.socialLevel} уровень!`, 'success');
    } else {
        toast(`✅ Случайный квест выполнен! +${quest.xpReward} XP, +${quest.socialBonus} к харизме.`, 'success');
    }
}

// ========================================
//  СБРОС ПРОГРЕССА
// ========================================

async function resetProgress() {
    if (!currentUserData) return;
    if (!confirm('Сбросить прогресс?')) return;
    
    currentUserData.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 };
    currentUserData.completed_quests = [];
    currentUserData.inventory = [];
    currentUserData.current_quests = [];
    currentUserData.last_quest_date = '';
    currentUserData.last_sleep_date = '';
    currentUserData.goals = [];
    currentUserData.socialLevel = 1;
    currentUserData.socialXP = 0;
    currentUserData.socialQuests = [];
    currentUserData.lastSocialDate = '';
    currentUserData.total_quests_completed = 0;
    currentUserData.total_social_quests_completed = 0;
    currentUserData.total_chests_opened = 0;
    currentUserData.total_goals_completed = 0;
    currentUserData.achievements = [];
    currentUserData.last_weekly_date = '';
    currentUserData.randomQuest = null;
    currentUserData.lastRandomDate = '';
    // Новые поля
    currentUserData.hp = HP_CONFIG.max;
    currentUserData.debuffs = [];
    currentUserData.branchExp = { athletics: 0, intellect: 0, discipline: 0 };
    currentUserData.streak = 0;
    currentUserData.lastStreakDate = '';
    currentUserData.gachaTokens = 0;
    currentUserData.artifacts = [];
    currentUserData.tavernMode = false;
    currentUserData.tavernStart = '';
    currentUserData.missedDaysInRow = 0;
    currentUserData.delayed_quests = [];
    currentUserData.tutorial_done  = [];

    await saveUserData();
    await checkDailyRotation();
    await refreshSocialQuests();
    
    updateUI();
    renderInventory();
    renderQuests();
    renderGoals();
    renderHotbar();
    renderSocialQuests();
    renderAchievements();
    renderRouletteResult('');
    renderRandomQuestDisplay();
    
    toast('🗑️ Прогресс сброшен!', 'info');
}

// ========================================
//  HP СИСТЕМА
// ========================================

function applyDamage(amount, reason = '') {
    if (!currentUserData) return;
    const shieldIdx = findArtifactIndex('dodge_shield');
    if (shieldIdx !== -1) {
        consumeArtifact('dodge_shield');
        toast('🛡️ Щит Уклонения заблокировал урон!', 'success');
        return;
    }
    if (currentUserData.tavernMode) {
        toast('🍺 Отдых в Таверне: HP защищён.', 'info');
        return;
    }
    currentUserData.hp = Math.max(0, (currentUserData.hp ?? HP_CONFIG.max) - amount);
    if (currentUserData.hp <= 0) {
        currentUserData.hp = 0;
        resetStreak();
        toast(`💀 HP упало до нуля! Стрик сброшен. (${reason})`, 'error');
    } else {
        toast(`❤️ −${amount} HP. ${reason}`, 'warning');
    }
}

function regenHp(amount = HP_CONFIG.regen.per_day) {
    if (!currentUserData || currentUserData.tavernMode) return;
    currentUserData.hp = Math.min(
        currentUserData.maxHp || HP_CONFIG.max,
        (currentUserData.hp ?? HP_CONFIG.max) + amount
    );
}

// ========================================
//  ДЕБАФФЫ
// ========================================

function applyDebuff(debuffId) {
    if (!currentUserData || currentUserData.tavernMode) return;
    if (!DEBUFF_DEFINITIONS[debuffId]) return;
    if (currentUserData.debuffs.some(d => d.id === debuffId)) return;
    const def = DEBUFF_DEFINITIONS[debuffId];
    const d = new Date();
    d.setDate(d.getDate() + def.duration);
    currentUserData.debuffs.push({ id: debuffId, expiresDate: d.toISOString().split('T')[0] });
    toast(`${def.name} — дебафф активирован! ${def.desc}`, 'warning');
}

function cleanExpiredDebuffs() {
    if (!currentUserData?.debuffs) return;
    const today = new Date().toISOString().split('T')[0];
    currentUserData.debuffs = currentUserData.debuffs.filter(d => d.expiresDate >= today);
}

function applyDebuffsToExp(exp, branch) {
    let result = exp;
    for (const active of (currentUserData?.debuffs || [])) {
        const def = DEBUFF_DEFINITIONS[active.id];
        if (def) result = def.apply(currentUserData, result, branch);
    }
    return result;
}

// ========================================
//  ВЕТКИ НАВЫКОВ
// ========================================

function addBranchExp(branch, rawExp) {
    if (!currentUserData) return 0;
    if (currentUserData.tavernMode) return 0;
    if (!SKILL_BRANCHES[branch]) return 0;
    let exp = applyDebuffsToExp(rawExp, branch);
    exp = applyStreakMultiplier(exp);
    exp = Math.round(exp);
    currentUserData.branchExp[branch] = (currentUserData.branchExp[branch] || 0) + exp;
    return exp;
}

function getBranchLevel(branch) {
    const exp = currentUserData?.branchExp?.[branch] || 0;
    const branchThresholds = LEVEL_THRESHOLDS.map((_, i) => getBranchThreshold(i));
    return getLevelFromXp(exp, branchThresholds);
}

// ========================================
//  СТРИК И МНОЖИТЕЛЬ
// ========================================

function updateStreak(success) {
    if (!currentUserData) return;
    const today = new Date().toDateString();
    if (success) {
        if (currentUserData.lastStreakDate !== today) {
            currentUserData.streak = (currentUserData.streak || 0) + 1;
            currentUserData.lastStreakDate = today;
            currentUserData.missedDaysInRow = 0;
            if (currentUserData.streak === 5) {
                regenHp(HP_CONFIG.regen.on_streak_5);
                toast('🔥 Стрик 5 дней! +10 HP бонус!', 'success');
            }
            const mult = getStreakMultiplier();
            if (mult.mult > 1) toast(`${mult.label} Стрик-множитель активен! (${currentUserData.streak} дн.)`, 'success');
        }
    } else {
        resetStreak();
        currentUserData.missedDaysInRow = (currentUserData.missedDaysInRow || 0) + 1;
        if (currentUserData.missedDaysInRow >= 3) applyDebuff('overload');
    }
}

function resetStreak() {
    if (!currentUserData) return;
    if (currentUserData.streak > 0) {
        currentUserData.streak = 0;
        currentUserData.lastStreakDate = '';
        toast('💔 Стрик сброшен до 0.', 'error');
    }
}

function getStreakMultiplier() {
    const streak = currentUserData?.streak || 0;
    for (const tier of STREAK_MULTIPLIERS) {
        if (streak >= tier.days) return tier;
    }
    return { days: 0, mult: 1.0, label: '×1' };
}

function applyStreakMultiplier(exp) {
    return Math.round(exp * getStreakMultiplier().mult);
}

// ========================================
//  СМЕНА ДНЯ
// ========================================

async function processDayChange(yesterdayCompleted) {
    if (!currentUserData) return;
    cleanExpiredDebuffs();
    regenHp(HP_CONFIG.regen.per_day);
    updateStreak(yesterdayCompleted);
    if (!yesterdayCompleted && currentUserData.last_quest_date) {
        const missable = (currentUserData.current_quests || []).filter(isMissableQuest);
        const hasRealMiss = missable.some(
            q => !(currentUserData.completed_quests || []).includes(q.id)
        );
        if (hasRealMiss) {
            applyDamage(HP_CONFIG.damage.missed_daily, 'Дейлики не выполнены вчера');
        }
    }
}

// ========================================
//  ГАЧА-ТОКЕНЫ И СПИН
// ========================================

async function spinGacha() {
    if (!currentUserData) return;
    if ((currentUserData.gachaTokens || 0) < 1) {
        toast('❌ Нет Гача-токенов! Закрой S-цель или идеальную неделю.', 'error');
        return;
    }
    currentUserData.gachaTokens -= 1;
    const item = weightedRandom(GACHA_POOL);
    applyGachaEffect(item);
    await saveUserData();
    updateUI();
    return item;
}

function applyGachaEffect(item) {
    switch (item.effect) {
        case 'gold_100':
            currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 100;
            toast(`🎰 ${item.name}`, 'success'); break;
        case 'exp_200': {
            const branches = Object.keys(SKILL_BRANCHES);
            const branch = branches[Math.floor(Math.random() * branches.length)];
            addBranchExp(branch, 200);
            toast(`🎰 ${item.name} → ${SKILL_BRANCHES[branch].name}`, 'success'); break;
        }
        case 'hp_30':
            regenHp(30);
            toast(`🎰 ${item.name}`, 'success'); break;
        case 'hp_full':
            currentUserData.hp = currentUserData.maxHp || HP_CONFIG.max;
            toast(`🎰 ${item.name}`, 'success'); break;
        default:
            if (item.effect.startsWith('artifact_')) {
                grantArtifact(item.effect.replace('artifact_', ''));
                toast(`🎰 Артефакт выпал: ${item.name}!`, 'success');
            }
    }
}

function weightedRandom(items) {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let rand = Math.random() * total;
    for (const item of items) { rand -= item.weight; if (rand <= 0) return item; }
    return items[items.length - 1];
}

// ========================================
//  АРТЕФАКТЫ
// ========================================

function grantArtifact(artifactId) {
    if (!ARTIFACT_DEFINITIONS[artifactId]) return;
    const existing = currentUserData.artifacts.find(a => a.id === artifactId);
    if (existing) existing.qty = (existing.qty || 1) + 1;
    else currentUserData.artifacts.push({ id: artifactId, qty: 1 });
    toast(`📦 Артефакт "${ARTIFACT_DEFINITIONS[artifactId].name}" получен!`, 'success');
}

async function buyArtifact(artifactId) {
    if (!currentUserData) return;
    const def = ARTIFACT_DEFINITIONS[artifactId];
    if (!def) return;
    const gold = currentUserData.stats?.gold || 0;
    if (gold < def.shopCost) { toast(`❌ Нужно ${def.shopCost} 🪙, у тебя ${gold}.`, 'error'); return; }
    currentUserData.stats.gold -= def.shopCost;
    grantArtifact(artifactId);
    await saveUserData();
    updateUI();
}

async function useArtifact(artifactId) {
    if (!currentUserData) return;
    const idx = findArtifactIndex(artifactId);
    if (idx === -1) { toast('❌ Артефакта нет в инвентаре.', 'error'); return; }

    switch (artifactId) {
        case 'time_scroll': {
            if (!Array.isArray(currentUserData.delayed_quests)) currentUserData.delayed_quests = [];
            // Берём первый невыполненный квест из текущих (не туториал)
            const pending = (currentUserData.current_quests || []).filter(
                q => !(currentUserData.completed_quests || []).includes(q.id) && !q._tutorial
            );
            if (pending.length === 0) {
                toast('📜 Нет невыполненных квестов для переноса!', 'warning');
                return; // не тратим свиток
            }
            const toDelay = pending[0];
            currentUserData.current_quests = currentUserData.current_quests.filter(q => q.id !== toDelay.id);
            currentUserData.delayed_quests.push({ ...toDelay, _delayed: true });
            consumeArtifact(artifactId);
            toast(`📜 Квест «${toDelay.title}» перенесён на завтра! Стрик сохранён.`, 'success');
            renderQuests();
            break;
        }
        case 'dodge_shield':
            toast('🛡️ Щит работает автоматически — блокирует следующий урон по HP.', 'info');
            return;
        case 'tavern_pass':
            activateTavernMode();
            consumeArtifact(artifactId);
            break;
    }
    await saveUserData();
    updateUI();
}

function consumeArtifact(artifactId) {
    const idx = findArtifactIndex(artifactId);
    if (idx === -1) return;
    currentUserData.artifacts[idx].qty -= 1;
    if (currentUserData.artifacts[idx].qty <= 0) currentUserData.artifacts.splice(idx, 1);
}

function findArtifactIndex(artifactId) {
    return (currentUserData?.artifacts || []).findIndex(a => a.id === artifactId);
}

// ========================================
//  ТАВЕРНА
// ========================================

function activateTavernMode() {
    if (!currentUserData) return;
    if (currentUserData.tavernMode) { toast('🍺 Таверна уже активна.', 'info'); return; }
    currentUserData.tavernMode = true;
    currentUserData.tavernStart = new Date().toISOString().split('T')[0];
    toast('🍺 Режим "Отдых в Таверне" активирован. HP и стрик заморожены.', 'info');
}

async function deactivateTavernMode() {
    if (!currentUserData) return;
    currentUserData.tavernMode = false;
    currentUserData.tavernStart = '';
    toast('⚔️ Отдых завершён. Добро пожаловать обратно!', 'success');
    await saveUserData();
    updateUI();
}

// ========================================
//  РЕНДЕР НОВЫХ UI-БЛОКОВ
// ========================================

function renderHpBar() {
    const fill  = document.getElementById('hp-bar-fill');
    const label = document.getElementById('hp-label');
    if (!fill || !currentUserData) return;
    const hp    = currentUserData.hp    ?? HP_CONFIG.max;
    const maxHp = currentUserData.maxHp ?? HP_CONFIG.max;
    const pct   = Math.round((hp / maxHp) * 100);
    fill.style.width      = pct + '%';
    fill.style.background = pct > 50 ? '#30d158' : pct > 25 ? '#ffd60a' : '#ff453a';
    fill.style.boxShadow  = pct > 50 ? '0 0 8px #30d158' : pct > 25 ? '0 0 8px #ffd60a' : '0 0 8px #ff453a';
    if (label) label.textContent = `❤️ ${hp} / ${maxHp}`;
}

function renderDebuffs() {
    const container = document.getElementById('debuffs-container');
    if (!container || !currentUserData) return;
    container.innerHTML = '';
    (currentUserData.debuffs || []).forEach(d => {
        const def = DEBUFF_DEFINITIONS[d.id];
        if (!def) return;
        const chip = document.createElement('div');
        chip.className = 'debuff-chip';
        chip.title = def.desc;
        chip.textContent = `${def.name} до ${d.expiresDate}`;
        container.appendChild(chip);
    });
}

function renderSkillBranches() {
    const container = document.getElementById('skill-branches-container');
    if (!container || !currentUserData) return;
    container.innerHTML = '';
    Object.values(SKILL_BRANCHES).forEach(branch => {
        const exp = currentUserData.branchExp?.[branch.id] || 0;
        const { lvl, cur, toNext } = getBranchProgress(exp);
        const pct = Math.min(100, Math.round((cur / toNext) * 100));
        container.innerHTML += `
        <div class="branch-card" style="border-left:3px solid ${branch.color}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span class="branch-name">${branch.name}</span>
                <span style="color:${branch.color};font-family:var(--font-mono);font-size:11px;font-weight:700;">Lv.${lvl}</span>
            </div>
            <div class="branch-bar-wrap">
                <div class="branch-bar-fill" style="width:${pct}%;background:${branch.color};box-shadow:0 0 6px ${branch.color};"></div>
            </div>
            <div class="branch-exp-label">${cur} / ${toNext} EXP</div>
        </div>`;
    });
}

function renderStreakInfo() {
    const el = document.getElementById('streak-info');
    if (!el || !currentUserData) return;
    const streak = currentUserData.streak || 0;
    const mult   = getStreakMultiplier();
    el.innerHTML = `🔥 Стрик: <b>${streak}</b> дн. &nbsp;|&nbsp; Множитель: <b style="color:var(--yellow)">${mult.label}</b>`;
}

function renderArtifacts() {
    const container = document.getElementById('artifacts-container');
    if (!container || !currentUserData) return;
    if (!currentUserData.artifacts?.length) {
        container.innerHTML = '<div style="color:var(--text-mid);font-size:13px;font-style:italic;">Нет артефактов</div>';
        return;
    }
    container.innerHTML = currentUserData.artifacts.map(a => {
        const def = ARTIFACT_DEFINITIONS[a.id];
        if (!def) return '';
        return `<div class="artifact-card">
            <span class="artifact-icon">${def.icon}</span>
            <div style="flex:1">
                <div class="artifact-name">${def.name} <span style="color:var(--text-mid)">×${a.qty}</span></div>
                <div class="artifact-desc">${def.desc}</div>
            </div>
            <button onclick="useArtifact('${a.id}')" style="background:transparent;border:1px solid var(--cyan);color:var(--cyan);padding:6px 12px;border-radius:6px;cursor:pointer;font-family:var(--font-hud);font-size:10px;letter-spacing:1px;text-transform:uppercase;">Исп.</button>
        </div>`;
    }).join('');
}

function renderArtifactShop() {
    const container = document.getElementById('artifact-shop-container');
    if (!container) return;
    container.innerHTML = Object.values(ARTIFACT_DEFINITIONS).map(def => `
        <div class="artifact-card">
            <span class="artifact-icon">${def.icon}</span>
            <div style="flex:1">
                <div class="artifact-name">${def.name}</div>
                <div class="artifact-desc">${def.desc}</div>
                <div style="color:var(--yellow);font-family:var(--font-mono);font-size:11px;margin-top:4px;">💰 ${def.shopCost} голды</div>
            </div>
            <button onclick="buyArtifact('${def.id}')" style="background:transparent;border:1px solid var(--yellow);color:var(--yellow);padding:6px 12px;border-radius:6px;cursor:pointer;font-family:var(--font-hud);font-size:10px;letter-spacing:1px;text-transform:uppercase;">Купить</button>
        </div>`).join('');
}

function renderTavernStatus() {
    const el = document.getElementById('tavern-status');
    if (!el || !currentUserData) return;
    if (currentUserData.tavernMode) {
        el.style.display = 'flex';
        el.innerHTML = `<span>🍺 <b>Отдых в Таверне</b> (с ${currentUserData.tavernStart}) — HP и стрик заморожены</span>
            <button onclick="deactivateTavernMode()" style="background:transparent;border:1px solid var(--yellow);color:var(--yellow);padding:6px 14px;border-radius:6px;cursor:pointer;font-family:var(--font-hud);font-size:10px;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;">Вернуться ⚔️</button>`;
    } else {
        el.style.display = 'none';
    }
}

// ========================================
//  ТАЙМЕРЫ
// ========================================

setInterval(() => {
    const n = new Date();
    let h = 23 - n.getHours(), m = 59 - n.getMinutes(), s = 59 - n.getSeconds();
    const dailyTimer = document.getElementById('daily-timer');
    if (dailyTimer) {
        dailyTimer.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    const daysLeft = 6 - (n.getDay() % 7);
    const weeklyTimer = document.getElementById('weekly-timer');
    if (weeklyTimer) {
        weeklyTimer.textContent = `${daysLeft}д ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    if (h === 0 && m === 0 && s === 0 && currentUserData) {
        checkDailyRotation();
    }
    updateSocialTimer();
}, 1000);

// ========================================
//  ЗАПУСК
// ========================================

document.getElementById('goal-rarity')?.addEventListener('change', updateRewardPreview);
document.getElementById('goal-stat')?.addEventListener('change', updateRewardPreview);

// Кнопка рулетки заданий
document.getElementById('random-quest-btn')?.addEventListener('click', startRandomQuest);

console.log('✅ Игра запущена! Все системы работают.');
restoreSession();
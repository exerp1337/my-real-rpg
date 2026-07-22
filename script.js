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
const EXP = 250;
const SOCIAL_XP_PER_LEVEL = 100;

// ========================================
//  БАЗЫ ДАННЫХ (НАГРАДЫ, КВЕСТЫ, ЛУТ)
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

const SOCIAL_QUESTS_DB = [
    { id: 's1', title: 'Изящное парирование', desc: 'Вежливо не согласись с чьим-то мнением, начав фразу с «Я понимаю твою точку зрения, но...» без агрессии и перехода на личности.', rank: 1, xpReward: 20, socialBonus: 1 },
    { id: 's2', title: 'Сделать чей-то день', desc: 'Пообщайся с работником сферы услуг (таксистом, официантом) так, чтобы к концу взаимодействия он искренне рассмеялся или просиял.', rank: 1, xpReward: 20, socialBonus: 1 },
    { id: 's3', title: 'Глас глашатая', desc: 'Возьми слово первым на рабочем созвоне/встрече, либо произнеси тост на празднике, завладев вниманием аудитории от 3 и более человек.', rank: 1, xpReward: 20, socialBonus: 1 },
    { id: 's4', title: 'Знакомство + факт', desc: 'Познакомь двух людей, которые друг друга не знают, и обязательно упомяни крутой факт о каждом, чтобы завязать между ними беседу.', rank: 1, xpReward: 20, socialBonus: 1 },
    { id: 's5', title: 'Публичный комплимент', desc: 'Сделай искренний комплимент человеку в присутствии других людей (не менее 2 свидетелей). Комплимент должен быть конкретным и небанальным.', rank: 2, xpReward: 25, socialBonus: 2 },
    { id: 's6', title: 'Активное слушание', desc: 'В разговоре задай не менее 3 открытых вопросов, чтобы собеседник рассказал о себе больше, и ни разу не перебивай.', rank: 2, xpReward: 25, socialBonus: 2 },
    { id: 's7', title: 'Тост за незнакомца', desc: 'На мероприятии (вечеринка, корпоратив) подними бокал за человека, с которым ты не знаком, и скажи тост, который вызовет улыбки.', rank: 2, xpReward: 25, socialBonus: 2 },
    { id: 's8', title: 'Дебаты с незнакомцем', desc: 'Вступи в короткую дискуссию с незнакомым человеком на отвлечённую тему (погода, спорт, кино) и постарайся сохранить доброжелательный тон, даже если мнения расходятся.', rank: 3, xpReward: 30, socialBonus: 3 },
    { id: 's9', title: 'Мастер малых разговоров', desc: 'Заведи разговор с незнакомцем в очереди, транспорте или лифте и поддерживай его не менее 2 минут, используя технику «перекрестного опроса» (задавай вопросы, связанные с предыдущими ответами).', rank: 3, xpReward: 30, socialBonus: 3 },
    { id: 's10', title: 'Эмпатический отклик', desc: 'Когда кто-то поделится проблемой, вместо совета скажи: «Мне кажется, ты чувствуешь...» и опиши его эмоцию. Затем спроси: «Как я могу тебя поддержать?»', rank: 3, xpReward: 30, socialBonus: 3 },
    { id: 's11', title: 'Вдохновляющая речь', desc: 'Выступи перед группой (от 5 человек) с короткой (2-3 мин) речью на тему, которая тебя вдохновляет. После выступления получи хотя бы один положительный отклик.', rank: 4, xpReward: 40, socialBonus: 5 },
    { id: 's12', title: 'Нетворкинг-вечеринка', desc: 'На мероприятии познакомься с 5 новыми людьми, запомни их имена и по одному интересному факту о каждом. После мероприятия напиши каждому короткое сообщение с упоминанием этого факта.', rank: 4, xpReward: 40, socialBonus: 5 }
];

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
    { id: 'q1', title: "20 отжиманий на возвышении", desc: "Выполните 20 отжиманий с ногами на стуле.", stat: "str", points: 3, gold: 10, type: "purple" },
    { id: 'q2', title: "20 минут растяжки", desc: "Выполняйте базовые упражнения на растяжку.", stat: "agi", points: 2, gold: 10, type: "blue" },
    { id: 'q3', title: "15 минут наблюдения за природой", desc: "Понаблюдайте за птицами на улице 15 минут.", stat: "per", points: 2, gold: 10, type: "blue" },
    { id: 'q4', title: "60 минут уборки", desc: "Наведите идеальный порядок в своей комнате.", stat: "end", points: 3, gold: 15, type: "" },
    { id: 'q5', title: "25 минут учебы / кода", desc: "Поработайте над кодом 25 минут без пауз.", stat: "int", points: 3, gold: 20, type: "purple" }
];

const LOOT_POOL = {
    common: [
        { name: "👟 Nike (+5 Выносл.)", stat: "end", bonus: 5 },
        { name: "🏋️‍♂️ Эспандер (+5 Сила)", stat: "str", bonus: 5 },
        { name: "📖 Блокнот (+5 Интелл.)", stat: "int", bonus: 5 },
        { name: "🎯 Мишень (+5 Ловкость)", stat: "agi", bonus: 5 }
    ],
    epic: [
        { name: "⌚ Rolex (+25 Харизма)", stat: "cha", bonus: 25 },
        { name: "💻 Ноутбук (+25 Интелл.)", stat: "int", bonus: 25 },
        { name: "🏆 Трофей (+25 Сила)", stat: "str", bonus: 25 },
        { name: "🧘 Коврик (+25 Дисциплина)", stat: "per", bonus: 25 }
    ]
};

// Рулетка — расширенный лут с редкостями
const ROULETTE_POOL = [
    // Обычные (шанс 45%)
    { name: "🍀 Клевер (+3 Удача)", stat: "luck", bonus: 3, rarity: 'common' },
    { name: "💪 Гантеля (+5 Сила)", stat: "str", bonus: 5, rarity: 'common' },
    { name: "🏃 Кроссовки (+5 Выносл.)", stat: "end", bonus: 5, rarity: 'common' },
    { name: "📚 Книга (+5 Интелл.)", stat: "int", bonus: 5, rarity: 'common' },
    // Редкие (шанс 30%)
    { name: "🔮 Хрустальный шар (+10 Удача)", stat: "luck", bonus: 10, rarity: 'rare' },
    { name: "⚔️ Меч (+15 Сила)", stat: "str", bonus: 15, rarity: 'rare' },
    { name: "🛡️ Щит (+15 Выносл.)", stat: "end", bonus: 15, rarity: 'rare' },
    // Эпические (шанс 20%)
    { name: "👑 Корона (+25 Харизма)", stat: "cha", bonus: 25, rarity: 'epic' },
    { name: "🐉 Драконий глаз (+25 Удача)", stat: "luck", bonus: 25, rarity: 'epic' },
    { name: "⚡ Молния (+25 Ловкость)", stat: "agi", bonus: 25, rarity: 'epic' },
    // Легендарные (шанс 5%)
    { name: "🌟 Звезда (+50 ко всем статам)", stat: "all", bonus: 50, rarity: 'legendary' },
    { name: "👾 Артефакт (+50 Удача)", stat: "luck", bonus: 50, rarity: 'legendary' }
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
    { id: 'ach_social_level_5', title: 'Социальный лидер', desc: 'Достигнуть 5 социального уровня', check: () => (currentUserData?.socialLevel || 1) >= 5, reward: { stats: { cha: 10 } } }
];

function getLevel() {
    if (!currentUserData) return 1;
    const stats = currentUserData.stats;
    const total = stats.str + stats.end + stats.agi + stats.int + stats.cha + stats.per + stats.luck;
    return Math.floor(total / EXP) + 1;
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
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
    }
    return await response.json();
}

async function getUser(username) {
    const result = await supabaseRequest('GET', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`);
    return result && result.length > 0 ? result[0] : null;
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
        achievements: []
    };
    const result = await supabaseRequest('POST', TABLE_NAME, newUser);
    return result && result.length > 0 ? result[0] : null;
}

async function updateUser(username, data) {
    const result = await supabaseRequest('PATCH', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`, data);
    return result && result.length > 0 ? result[0] : null;
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
        currentUserData = user;
        // Инициализация полей, если их нет
        if (!currentUserData.goals) currentUserData.goals = [];
        if (!currentUserData.socialLevel) currentUserData.socialLevel = 1;
        if (!currentUserData.socialXP) currentUserData.socialXP = 0;
        if (!currentUserData.socialQuests) currentUserData.socialQuests = [];
        if (!currentUserData.lastSocialDate) currentUserData.lastSocialDate = '';
        if (currentUserData.total_quests_completed === undefined) currentUserData.total_quests_completed = 0;
        if (currentUserData.total_social_quests_completed === undefined) currentUserData.total_social_quests_completed = 0;
        if (currentUserData.total_chests_opened === undefined) currentUserData.total_chests_opened = 0;
        if (currentUserData.total_goals_completed === undefined) currentUserData.total_goals_completed = 0;
        if (!currentUserData.achievements) currentUserData.achievements = [];
        
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
        currentUserData = user;
        if (!currentUserData.goals) currentUserData.goals = [];
        if (!currentUserData.socialLevel) currentUserData.socialLevel = 1;
        if (!currentUserData.socialXP) currentUserData.socialXP = 0;
        if (!currentUserData.socialQuests) currentUserData.socialQuests = [];
        if (!currentUserData.lastSocialDate) currentUserData.lastSocialDate = '';
        if (currentUserData.total_quests_completed === undefined) currentUserData.total_quests_completed = 0;
        if (currentUserData.total_social_quests_completed === undefined) currentUserData.total_social_quests_completed = 0;
        if (currentUserData.total_chests_opened === undefined) currentUserData.total_chests_opened = 0;
        if (currentUserData.total_goals_completed === undefined) currentUserData.total_goals_completed = 0;
        if (!currentUserData.achievements) currentUserData.achievements = [];
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
        return true;
    } catch (e) {
        console.error('Session restore error:', e);
        clearSession();
        showAuthScreen();
        return false;
    }
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
    if (id === 'main-screen') renderHotbar();
    if (id === 'social-screen') renderSocialQuests();
    if (id === 'achieve-screen') renderAchievements();
}

async function checkDailyRotation() {
    if (!currentUserData) return;
    const today = new Date().toDateString();
    if (currentUserData.last_quest_date !== today || !currentUserData.current_quests?.length) {
        const shuffled = [...QUESTS_DATABASE].sort(() => 0.5 - Math.random());
        currentUserData.current_quests = shuffled.slice(0, 3);
        currentUserData.completed_quests = currentUserData.completed_quests?.filter(id => id.startsWith('w')) || [];
        currentUserData.last_quest_date = today;
        await saveUserData();
    }
}

function renderQuests() {
    const container = document.getElementById('quests-container');
    if (!container) return;
    if (!currentUserData?.current_quests?.length) {
        container.innerHTML = `<div style="color:#8e8e93; text-align:center; padding:20px;">Нет активных квестов. Зайдите завтра!</div>`;
        return;
    }
    container.innerHTML = '';
    currentUserData.current_quests.forEach(q => {
        const isDone = currentUserData.completed_quests.includes(q.id);
        const card = document.createElement('div');
        card.className = 'quest-card';
        card.innerHTML = `
            <div class="quest-title">${q.title}</div>
            <div class="quest-desc">${q.desc}</div>
            <div class="quest-reward">➕ +${q.points} XP / +${q.gold} 🪙</div>
            <button class="action-btn ${q.type}" id="${q.id}" style="${isDone ? 'background:#2c2c2e; opacity:0.4; pointer-events:none;' : ''}" onclick="completeQuest('${q.id}', '${q.stat}', ${q.points}, ${q.gold})">${isDone ? 'Выполнено' : 'Выполнить'}</button>
        `;
        container.appendChild(card);
    });
}

function updateUI() {
    if (!currentUserData) return;
    const stats = currentUserData.stats;
    const total = stats.str + stats.end + stats.agi + stats.int + stats.cha + stats.per + stats.luck;
    const lvl = Math.floor(total / EXP) + 1;
    const curExp = total % EXP;

    // Avatar
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
    document.getElementById('exp-display').textContent = curExp + ' / ' + EXP + ' XP';
    document.getElementById('exp-bar').style.width = (curExp / EXP * 100) + '%';

    let title = '🥚 Обыватель';
    for (const t of TITLES_DATABASE) {
        if (lvl >= t.lvl) { title = t.text; break; }
    }
    document.getElementById('title-display').textContent = title;

    // Social level
    const socialLevel = currentUserData.socialLevel || 1;
    const socialXP = currentUserData.socialXP || 0;
    const socialProgress = Math.min(100, (socialXP / SOCIAL_XP_PER_LEVEL) * 100);
    document.getElementById('social-level-display').textContent = socialLevel;
    document.getElementById('social-level-badge').textContent = socialLevel;
    document.getElementById('social-xp-display').textContent = socialXP + ' / ' + SOCIAL_XP_PER_LEVEL + ' XP';
    document.getElementById('social-percent-display').textContent = Math.round(socialProgress) + '%';
    document.getElementById('social-bar').style.width = socialProgress + '%';

    // Achievements
    renderAchievements();

    // Weekly button
    const wBtn = document.getElementById('w1');
    if (wBtn) {
        if (currentUserData.completed_quests.includes('w1')) {
            wBtn.style.background = '#2c2c2e';
            wBtn.style.opacity = '0.4';
            wBtn.style.pointerEvents = 'none';
            wBtn.textContent = 'Выполнено';
        } else {
            wBtn.style.background = 'linear-gradient(90deg, #ff5e00, #ff9500)';
            wBtn.style.opacity = '1';
            wBtn.style.pointerEvents = 'auto';
            wBtn.textContent = 'Выполнить';
        }
    }

    // Sleep button
    const sBtn = document.getElementById('sleep-action-btn');
    if (sBtn) {
        if (currentUserData.last_sleep_date === new Date().toDateString()) {
            sBtn.style.background = '#2c2c2e';
            sBtn.style.opacity = '0.4';
            sBtn.textContent = '💤 Отмечено';
        } else {
            sBtn.style.background = 'linear-gradient(90deg, #0055ff, #0a84ff)';
            sBtn.style.opacity = '1';
            sBtn.textContent = '🛌 Лечь спать';
        }
    }

    // Inventory
    const invList = document.getElementById('inventory-list');
    if (invList) {
        if (currentUserData.inventory?.length) {
            invList.innerHTML = currentUserData.inventory.map(item => `<span class="inv-item">${item}</span>`).join('');
        } else {
            invList.innerHTML = `<span style="color:#636366; font-style: italic;">У вас пока нет снаряжения...</span>`;
        }
    }

    renderHotbar();
}

async function saveUserData() {
    if (!currentUserData || !currentUsername) return;
    try {
        await updateUser(currentUsername, {
            stats: currentUserData.stats,
            inventory: currentUserData.inventory,
            completed_quests: currentUserData.completed_quests,
            current_quests: currentUserData.current_quests,
            last_quest_date: currentUserData.last_quest_date,
            last_sleep_date: currentUserData.last_sleep_date,
            goals: currentUserData.goals,
            socialLevel: currentUserData.socialLevel,
            socialXP: currentUserData.socialXP,
            socialQuests: currentUserData.socialQuests,
            lastSocialDate: currentUserData.lastSocialDate,
            total_quests_completed: currentUserData.total_quests_completed,
            total_social_quests_completed: currentUserData.total_social_quests_completed,
            total_chests_opened: currentUserData.total_chests_opened,
            total_goals_completed: currentUserData.total_goals_completed,
            achievements: currentUserData.achievements
        });
        console.log('✅ Saved');
    } catch (e) {
        console.error('❌ Save error', e);
    }
}

async function train(type) {
    if (!currentUserData) return;
    const now = Date.now();
    if (now - lastTrainTime < 1000) {
        alert('Подожди секунду!');
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
    const now = new Date();
    const today = now.toDateString();
    if (currentUserData.last_sleep_date === today) {
        alert('Вы уже отметили сон сегодня!');
        return;
    }
    const hours = now.getHours();
    if (hours === 0 || hours >= 21) {
        currentUserData.stats.per += 10;
        currentUserData.stats.gold += 15;
        alert('🏆 Отличный режим! +10 Дисциплина / +15 🪙');
    } else {
        currentUserData.stats.per = Math.max(0, currentUserData.stats.per - 10);
        alert('⚠️ Режим нарушен! -10 Дисциплина.');
    }
    currentUserData.last_sleep_date = today;
    await saveUserData();
    updateUI();
}

async function completeQuest(id, type, points, gold) {
    if (!currentUserData || currentUserData.completed_quests.includes(id)) return;
    currentUserData.stats[type] = (currentUserData.stats[type] || 0) + points;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + gold;
    currentUserData.completed_quests.push(id);
    currentUserData.total_quests_completed = (currentUserData.total_quests_completed || 0) + 1;
    await saveUserData();
    updateUI();
    renderQuests();
    renderAchievements();
}

async function completeWeeklyChallenge(btn) {
    if (!currentUserData || currentUserData.completed_quests.includes('w1')) {
        alert('Вы уже выполнили вызов!');
        return;
    }
    ['str', 'end', 'agi', 'int', 'cha', 'per'].forEach(id => currentUserData.stats[id] = (currentUserData.stats[id] || 0) + 8);
    currentUserData.stats.luck = (currentUserData.stats.luck || 0) + 15;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 100;
    currentUserData.completed_quests.push('w1');
    await saveUserData();
    updateUI();
    alert('⭐ Вызов выполнен!');
}

async function openChest(tier, price) {
    if (!currentUserData) return;
    if (currentUserData.stats.gold < price) {
        alert('Недостаточно монет!');
        return;
    }
    currentUserData.stats.gold -= price;
    const pool = LOOT_POOL[tier];
    const item = pool[Math.floor(Math.random() * pool.length)];
    if (!currentUserData.inventory) currentUserData.inventory = [];
    currentUserData.inventory.push(item.name);
    currentUserData.stats[item.stat] = (currentUserData.stats[item.stat] || 0) + item.bonus;
    currentUserData.total_chests_opened = (currentUserData.total_chests_opened || 0) + 1;
    await saveUserData();
    updateUI();
    renderAchievements();
    alert(`🎉 Вы выбили: ${item.name}!`);
}

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
    await saveUserData();
    await checkDailyRotation();
    await refreshSocialQuests();
    updateUI();
    renderQuests();
    renderGoals();
    renderSocialQuests();
    renderAchievements();
    alert('🗑️ Прогресс сброшен!');
}

// ========================================
//  СИСТЕМА ЦЕЛЕЙ
// ========================================

function getRarityConfig(rarity) {
    return RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
}

function updateRewardPreview() {
    const rarity = document.getElementById('goal-rarity').value;
    const stat = document.getElementById('goal-stat').value;
    const config = getRarityConfig(rarity);
    document.getElementById('goal-reward-preview').innerHTML = `
        🎁 Награда: <span style="color:#ffcc00;">+${config.xp} XP</span> + 
        <span style="color:${config.color};">+${config.statBonus} ${STAT_LABELS[stat]}</span>
        <span style="color:#8e8e93; font-size:11px; margin-left:8px;">(${config.label})</span>
    `;
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
        alert('Введите название цели!');
        return;
    }
    if (!target || target <= 0) {
        alert('Введите целевое значение (число > 0)!');
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

    if (!currentUserData.goals) currentUserData.goals = [];
    currentUserData.goals.push(newGoal);
    await saveUserData();
    closeGoalModal();
    renderGoals();
    renderHotbar();
    alert(`🎯 Цель "${title}" добавлена! (${config.label})`);
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
                    <span class="rarity-badge" style="background:${config.color}; color:#fff;">${config.label}</span>
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
        container.innerHTML = '<div style="color:#8e8e93; text-align:center; padding:20px;">У вас пока нет целей. Добавьте первую!</div>';
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
                        <span class="rarity-badge" style="background:${config.color}; color:#fff;">${config.label}</span>
                        <div style="font-size:13px; color:#8e8e93;">${Math.round(progress)}%</div>
                    </div>
                </div>
                ${g.description ? `<div class="goal-desc">${g.description}</div>` : ''}
                <div class="goal-progress">
                    <span style="font-size:13px; color:#8e8e93;">${g.current || 0}</span>
                    <div class="goal-progress-bar">
                        <div class="fill" style="width:${progress}%; background: ${config.color};"></div>
                    </div>
                    <span style="font-size:13px; color:#8e8e93;">${g.target} ${g.unit || ''}</span>
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
        alert(`🎉 Цель "${goal.title}" выполнена! Молодец!`);
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
    alert('✅ Цель отмечена как выполненная! Награда получена!');
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
        const level = currentUserData.socialLevel || 1;
        let rank = 1;
        if (level >= 15) rank = 4;
        else if (level >= 10) rank = 3;
        else if (level >= 5) rank = 2;
        
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
        alert('Этот квест уже выполнен!');
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
        alert(`🎉 Социальный уровень повышен! Теперь ты ${currentUserData.socialLevel} уровень!`);
    } else {
        alert(`✅ Квест выполнен! +${quest.xpReward} XP, +${quest.socialBonus} к харизме.`);
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
//  РУЛЕТКА
// ========================================

function spinRoulette() {
    if (!currentUserData) {
        alert('Сначала войдите в игру!');
        return;
    }
    if (currentUserData.stats.gold < 50) {
        alert('Недостаточно монет! Нужно 50 🪙');
        return;
    }
    currentUserData.stats.gold -= 50;
    // Определяем выигрыш
    const rand = Math.random();
    let pool, rarityLabel;
    if (rand < 0.05) { // 5% легендарка
        pool = ROULETTE_POOL.filter(item => item.rarity === 'legendary');
        rarityLabel = '⭐ ЛЕГЕНДАРНОЕ';
    } else if (rand < 0.25) { // 20% эпик
        pool = ROULETTE_POOL.filter(item => item.rarity === 'epic');
        rarityLabel = '🔮 ЭПИЧЕСКОЕ';
    } else if (rand < 0.55) { // 30% редкое
        pool = ROULETTE_POOL.filter(item => item.rarity === 'rare');
        rarityLabel = '💎 РЕДКОЕ';
    } else { // 45% обычное
        pool = ROULETTE_POOL.filter(item => item.rarity === 'common');
        rarityLabel = '📦 ОБЫЧНОЕ';
    }
    // Если пул пуст (маловероятно), берём всё
    if (!pool.length) pool = ROULETTE_POOL;
    const item = pool[Math.floor(Math.random() * pool.length)];
    // Добавляем в инвентарь
    if (!currentUserData.inventory) currentUserData.inventory = [];
    currentUserData.inventory.push(item.name);
    if (item.stat === 'all') {
        // +50 ко всем
        const allStats = ['str', 'end', 'agi', 'int', 'cha', 'per', 'luck'];
        allStats.forEach(s => currentUserData.stats[s] = (currentUserData.stats[s] || 0) + item.bonus);
    } else {
        currentUserData.stats[item.stat] = (currentUserData.stats[item.stat] || 0) + item.bonus;
    }
    // Сохраняем
    saveUserData().then(() => {
        updateUI();
        renderRouletteResult(`${rarityLabel}: ${item.name} (+${item.bonus} ${STAT_LABELS[item.stat] || 'все статы'})`);
        alert(`🎡 Вы выиграли: ${rarityLabel}\n${item.name} (+${item.bonus} ${STAT_LABELS[item.stat] || 'все статы'})`);
    });
}

function renderRouletteResult(text) {
    const el = document.getElementById('roulette-result');
    if (el) el.textContent = text || '';
}

// ========================================
//  ДОСТИЖЕНИЯ
// ========================================

function renderAchievements() {
    const container = document.getElementById('achievements-container');
    if (!container) return;
    if (!currentUserData) {
        container.innerHTML = '<div style="color:#8e8e93; text-align:center;">Войдите, чтобы видеть достижения</div>';
        return;
    }
    // Проверяем все ачивки и награждаем, если ещё не получены
    let anyUnlocked = false;
    ACHIEVEMENTS_DB.forEach(ach => {
        if (!currentUserData.achievements.includes(ach.id) && ach.check()) {
            // Разблокируем
            currentUserData.achievements.push(ach.id);
            // Применяем награду
            if (ach.reward.stats) {
                Object.keys(ach.reward.stats).forEach(stat => {
                    currentUserData.stats[stat] = (currentUserData.stats[stat] || 0) + ach.reward.stats[stat];
                });
            }
            if (ach.reward.gold) {
                currentUserData.stats.gold = (currentUserData.stats.gold || 0) + ach.reward.gold;
            }
            anyUnlocked = true;
            // Показываем уведомление (но не спамим, покажем одно)
            setTimeout(() => alert(`🏆 Достижение разблокировано: ${ach.title}!`), 100);
        }
    });
    if (anyUnlocked) {
        saveUserData().then(() => updateUI());
    }

    // Рендерим список
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
//  ТАЙМЕРЫ
// ========================================

setInterval(() => {
    const n = new Date();
    let h = 23 - n.getHours(), m = 59 - n.getMinutes(), s = 59 - n.getSeconds();
    document.getElementById('daily-timer').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const daysLeft = 6 - (n.getDay() % 7);
    document.getElementById('weekly-timer').textContent = `${daysLeft}д ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (h === 0 && m === 0 && s === 0 && currentUserData) {
        checkDailyRotation();
    }
    updateSocialTimer();
}, 1000);

// ========================================
//  ЗАПУСК
// ========================================

document.getElementById('goal-rarity').addEventListener('change', updateRewardPreview);
document.getElementById('goal-stat').addEventListener('change', updateRewardPreview);

console.log('✅ Игра запущена!');
restoreSession();

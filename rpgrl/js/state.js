//  УПРАВЛЕНИЕ СОСТОЯНИЕМ И ДАННЫМИ

// ========================================
//  ПОДКЛЮЧЕНИЕ К SUPABASE
// ========================================
const SUPABASE_URL = 'https://zjtudyoffdwqfamzczcb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqdHVkeW9mZmR3cWZhbXpjemNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTYxMDMsImV4cCI6MjEwMDE5MjEwM30.yO-fyi_hZv__XqMjz-OpuYNPAlKyaGT7KB4xscqHMNo';
const TABLE_NAME = 'players';
const SESSION_KEY = 'rpg_session';

// ========================================
//  ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// ========================================

let currentUserData = null;
let currentUsername = null;
let lastTrainTime = 0;

export function getState() {
    return {
        currentUserData,
        currentUsername,
        lastTrainTime
    };
}

export function setCurrentUser(username, data) {
    currentUsername = username;
    currentUserData = data;
}

export function setLastTrainTime(time) {
    lastTrainTime = time;
}

// ========================================
//  СЕССИЯ
// ========================================

export function saveSession(username) {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ username, loginTime: new Date().toISOString() }));
    } catch (e) {
        console.error('Error saving session:', e);
    }
}

export function getSession() {
    try {
        const data = localStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

export function clearSession() {
    try {
        localStorage.removeItem(SESSION_KEY);
    } catch (e) {
        console.error('Error clearing session:', e);
    }
}


// ========================================
//  ВЗАИМОДЕЙСТВИЕ С API (SUPABASE)
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
    return response.json();
}

export async function getUser(username) {
    const result = await supabaseRequest('GET', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`);
    return result && result.length > 0 ? result[0] : null;
}

export async function createUser(username, password, email = '') {
    // ВНИМАНИЕ: Хранение паролей в открытом виде чрезвычайно небезопасно.
    const newUser = {
        username,
        password, // В реальном приложении здесь должен быть хеш
        email: email || '',
        stats: { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 },
        inventory: [],
        completed_quests: [],
        current_quests: [],
        delayed_quests: [],
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
        tutorial_completed: false,
        sleep_schedule: { bedtime: '23:00', wakeup: '07:00' } // Новое поле
    };
    const result = await supabaseRequest('POST', TABLE_NAME, newUser);
    return result && result.length > 0 ? result[0] : null;
}

async function updateUser(username, data) {
    const result = await supabaseRequest('PATCH', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`, data);
    return result && result.length > 0 ? result[0] : null;
}

export async function saveUserData() {
    if (!currentUserData || !currentUsername) {
        console.error('❌ Нечего сохранять');
        return;
    }

    const dataToSave = {
        stats: currentUserData.stats,
        inventory: JSON.stringify(currentUserData.inventory || []),
        completed_quests: JSON.stringify(currentUserData.completed_quests || []),
        current_quests: JSON.stringify(currentUserData.current_quests || []),
        delayed_quests: JSON.stringify(currentUserData.delayed_quests || []),
        last_quest_date: currentUserData.last_quest_date || '',
        last_sleep_date: currentUserData.last_sleep_date || '',
        goals: JSON.stringify(currentUserData.goals || []),
        socialLevel: currentUserData.socialLevel || 1,
        socialXP: currentUserData.socialXP || 0,
        socialQuests: JSON.stringify(currentUserData.socialQuests || []),
        lastSocialDate: currentUserData.lastSocialDate || '',
        total_quests_completed: currentUserData.total_quests_completed || 0,
        total_social_quests_completed: currentUserData.total_social_quests_completed || 0,
        total_chests_opened: currentUserData.total_chests_opened || 0,
        total_goals_completed: currentUserData.total_goals_completed || 0,
        achievements: JSON.stringify(currentUserData.achievements || []),
        last_weekly_date: currentUserData.last_weekly_date || '',
        randomQuest: JSON.stringify(currentUserData.randomQuest || null),
        lastRandomDate: currentUserData.lastRandomDate || '',
        tutorial_completed: currentUserData.tutorial_completed || false,
        sleep_schedule: JSON.stringify(currentUserData.sleep_schedule || { bedtime: '23:00', wakeup: '07:00' }), // Новое поле
    };

    try {
        await updateUser(currentUsername, dataToSave);
    } catch (e) {
        console.error('❌ Ошибка сохранения:', e);
        throw new Error('Ошибка сохранения данных на сервере.');
    }
}


// ========================================
//  НОРМАЛИЗАЦИЯ ДАННЫХ
// ========================================

export function normalizeUserData(user) {
    if (!user) return null;

    const normalized = JSON.parse(JSON.stringify(user));

    const defaultStats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 };
    normalized.stats = { ...defaultStats, ...(normalized.stats || {}) };

    const arrayFields = ['inventory', 'completed_quests', 'current_quests', 'delayed_quests', 'goals', 'socialQuests', 'achievements'];
    for (const field of arrayFields) {
        let value = normalized[field];
        if (typeof value === 'string') {
            try {
                value = JSON.parse(value);
            } catch {
                value = [];
            }
        }
        normalized[field] = Array.isArray(value) ? value : [];
    }

    const numberFields = ['socialXP', 'total_quests_completed', 'total_social_quests_completed', 'total_chests_opened', 'total_goals_completed'];
    for (const field of numberFields) {
        normalized[field] = Number(normalized[field]) || 0;
    }

    normalized.socialLevel = Number(normalized.socialLevel) || 1;
    if (normalized.socialLevel === 0) {
        normalized.socialLevel = 1;
    }

    const stringFields = ['last_quest_date', 'last_sleep_date', 'lastSocialDate', 'last_weekly_date', 'lastRandomDate'];
    for (const field of stringFields) {
        normalized[field] = String(normalized[field] || '');
    }

    // Обработка сложных объектов, которые могли быть сохранены как строки
    const jsonFields = ['randomQuest', 'sleep_schedule'];
    for (const field of jsonFields) {
        if (typeof normalized[field] === 'string') {
            try {
                normalized[field] = JSON.parse(normalized[field]);
            } catch {
                normalized[field] = null;
            }
        }
    }
    
    // Значения по умолчанию для графика сна
    const defaultSchedule = { bedtime: '23:00', wakeup: '07:00' };
    normalized.sleep_schedule = (typeof normalized.sleep_schedule === 'object' && normalized.sleep_schedule)
        ? { ...defaultSchedule, ...normalized.sleep_schedule }
        : defaultSchedule;


    normalized.tutorial_completed = Boolean(normalized.tutorial_completed);

    return normalized;
}

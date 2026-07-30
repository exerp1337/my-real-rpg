export const SUPABASE_URL = 'https://zjtudyoffdwqfamzczcb.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqdHVkeW9mZmR3cWZhbXpjemNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTYxMDMsImV4cCI6MjEwMDE5MjEwM30.yO-fyi_hZv__XqMjz-OpuYNPAlKyaGT7KB4xscqHMNo';
export const TABLE_NAME = 'players';
export const SESSION_KEY = 'rpg_session';

export let state = {
    currentUserData: null,
    currentUsername: null,
    lastTrainTime: 0
};

export const EXP = 250;
export const SOCIAL_XP_PER_LEVEL = 100;

export function normalizeUserData(user) {
    if (!user) return user;
    const normalized = JSON.parse(JSON.stringify(user));

    const defaultStats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0, target_bedtime: "23:00" };
    normalized.stats = (typeof normalized.stats === 'object' && normalized.stats !== null)
        ? { ...defaultStats, ...normalized.stats }
        : { ...defaultStats };

    const parseJSON = (val, fallback, validator) => {
        let res = val;
        if (typeof val === 'string') {
            try { res = JSON.parse(val); } catch (e) { return fallback; }
        }
        return validator(res) ? res : fallback;
    };

    const arrayFields = ['inventory', 'completed_quests', 'current_quests', 'goals', 'socialQuests', 'achievements'];
    arrayFields.forEach(key => {
        normalized[key] = parseJSON(normalized[key], [], Array.isArray);
    });

    const numberFields = ['socialLevel', 'socialXP', 'total_quests_completed', 'total_social_quests_completed', 'total_chests_opened', 'total_goals_completed'];
    numberFields.forEach(key => {
        normalized[key] = Number(normalized[key]) || 0;
    });

    const stringFields = ['last_quest_date', 'last_sleep_date', 'lastSocialDate', 'last_weekly_date', 'lastRandomDate'];
    stringFields.forEach(key => {
        normalized[key] = typeof normalized[key] === 'string' ? normalized[key] : '';
    });

    normalized.randomQuest = parseJSON(normalized.randomQuest, null, v => typeof v === 'object' && v !== null && !Array.isArray(v));

    return normalized;
}

export async function supabaseRequest(method, endpoint, body = null) {
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

export async function getUser(username) {
    const result = await supabaseRequest('GET', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`);
    return result && result.length > 0 ? result[0] : null;
}

export async function createUser(username, password, email = '') {
    const newUser = {
        username, password, email: email || '',
        stats: { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0, target_bedtime: "23:00" },
        inventory: [], completed_quests: [], current_quests: [], last_quest_date: '',
        last_sleep_date: '', goals: [], socialLevel: 1, socialXP: 0, socialQuests: [],
        lastSocialDate: '', total_quests_completed: 0, total_social_quests_completed: 0,
        total_chests_opened: 0, total_goals_completed: 0, achievements: [],
        last_weekly_date: '', randomQuest: null, lastRandomDate: ''
    };
    const result = await supabaseRequest('POST', TABLE_NAME, newUser);
    return result && result.length > 0 ? result[0] : null;
}

export async function updateUser(username, data) {
    const result = await supabaseRequest('PATCH', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`, data);
    return result && result.length > 0 ? result[0] : null;
}

export function saveSession(username) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ username: username, loginTime: new Date().toISOString() })); } catch (e) {}
}

export function getSession() {
    try { const data = localStorage.getItem(SESSION_KEY); return data ? JSON.parse(data) : null; } catch (e) { return null; }
}

export function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
}

export async function saveUserData() {
    if (!state.currentUserData || !state.currentUsername) return;
    state.currentUserData = normalizeUserData(state.currentUserData);
    try {
        await updateUser(state.currentUsername, state.currentUserData);
    } catch (e) {
        console.error('Ошибка сохранения:', e);
    }
}

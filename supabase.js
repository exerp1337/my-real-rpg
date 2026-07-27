// ========================================
//  ЗАПРОСЫ К SUPABASE
// ========================================

import { SUPABASE_URL, SUPABASE_ANON_KEY, TABLE_NAME } from './config.js';

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
        lastRandomDate: ''
    };
    const result = await supabaseRequest('POST', TABLE_NAME, newUser);
    return result && result.length > 0 ? result[0] : null;
}

export async function updateUser(username, data) {
    const result = await supabaseRequest('PATCH', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`, data);
    return result && result.length > 0 ? result[0] : null;
}
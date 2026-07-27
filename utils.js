// ========================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

import { AVATARS } from './config.js';

export function getAvatar(level) {
    let result = AVATARS[0];
    for (const a of AVATARS) {
        if (level >= a.level) result = a;
    }
    return result;
}

export function normalizeUserData(user) {
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

    if (normalized.randomQuest && typeof normalized.randomQuest === 'string') {
        try {
            normalized.randomQuest = JSON.parse(normalized.randomQuest);
        } catch (e) {
            normalized.randomQuest = null;
        }
    }
    if (normalized.randomQuest && typeof normalized.randomQuest === 'object') {
        // оставляем
    } else {
        normalized.randomQuest = null;
    }

    return normalized;
}

export function toast(message, type = 'info') {
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
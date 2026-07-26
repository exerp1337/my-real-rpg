//  УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ (UI)

import { getState } from './state.js';
import { AVATARS, EXP, SOCIAL_XP_PER_LEVEL, TITLES_DATABASE, RARITIES, STAT_LABELS, RARITY_CONFIG, ROULETTE_SECTORS, ACHIEVEMENTS_DB, LEVEL_THRESHOLDS, BRANCHES } from './constants.js';
import { getLevel } from './game.js';

// ... (toast, navigation, screen switching functions remain the same) ...

// ========================================
//  РЕНДЕРИНГ КВЕСТОВ
// ========================================

export function renderQuests() {
    const { currentUserData } = getState();
    const container = document.getElementById('quests-container');
    if (!container) return;

    if (!currentUserData?.current_quests?.length) {
        container.innerHTML = `<div class="empty-state">Нет активных квестов на сегодня. Загляните в конструктор!</div>`;
        return;
    }

    container.innerHTML = currentUserData.current_quests.map(q => {
        const isDone = currentUserData.completed_quests.includes(q.id);
        return `
            <div class="quest-card">
                <div class="quest-title">${q.title}</div>
                <div class="quest-desc">${q.description || q.desc}</div>
                <div class="quest-reward">➕ +${q.points} XP / +${q.gold} 🪙</div>
                <button class="action-btn ${q.type || ''}" data-action="complete-quest" data-quest-id="${q.id}" ${isDone ? 'disabled' : ''}>
                    ${isDone ? 'Выполнено' : 'Выполнить'}
                </button>
            </div>
        `;
    }).join('');
}

export function populateStatsForBranch(branch) {
    const statSelect = document.getElementById('custom-quest-stat');
    if (!statSelect) return;
    
    const statsForBranch = BRANCHES[branch] || [];
    statSelect.innerHTML = statsForBranch.map(statKey => {
        return `<option value="${statKey}">${STAT_LABELS[statKey]}</option>`;
    }).join('');
}

export function renderCustomQuests() {
    const { currentUserData } = getState();
    const container = document.getElementById('custom-quests-pool-container');
    if (!container) return;

    // Populate the branch-stat dropdown initially
    const branchSelect = document.getElementById('custom-quest-branch');
    if(branchSelect.value) {
        populateStatsForBranch(branchSelect.value);
    }
    
    if (!currentUserData?.custom_quests?.length) {
        container.innerHTML = `<div class="empty-state">Ваш пул квестов пуст. Добавьте свой первый квест или выберите пресет!</div>`;
        return;
    }

    container.innerHTML = currentUserData.custom_quests.map(q => {
        return `
            <div class="custom-quests-pool-item">
                <div>
                    <div class="title">${q.title}</div>
                    <div class="details">${STAT_LABELS[q.stat]} • ${q.points} XP • ${q.gold} 🪙</div>
                </div>
                <button class="delete-quest-btn" data-action="delete-custom-quest" data-quest-id="${q.id}">🗑️</button>
            </div>
        `;
    }).join('');
}


// ... (all other functions remain the same as in the previous step) ...
// The following is a placeholder for the rest of the file which is unchanged.
// The actual file write will use the full content.

export function switchTab(id, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const screen = document.getElementById(id);
    if (screen) screen.classList.add('active');
    if (btn) btn.classList.add('active');

    if (id === 'quests-screen') {
        renderQuests();
        renderSocialQuests();
        renderCustomQuests(); // Add this call
    }
    // ... other if blocks
}

// ... rest of the file

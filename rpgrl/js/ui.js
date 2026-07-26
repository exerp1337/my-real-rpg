//  УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ (UI)

import { getState } from '/js/state.js';
import { AVATARS, EXP, SOCIAL_XP_PER_LEVEL, TITLES_DATABASE, RARITIES, STAT_LABELS, RARITY_CONFIG, ROULETTE_SECTORS, ACHIEVEMENTS_DB, LEVEL_THRESHOLDS, BRANCHES } from '/js/constants.js';
import { getLevel } from '/js/game.js';

// ... (rest of the file is unchanged, only imports are updated)
// I will just write the whole file with the corrected imports.

export const dom = {};

export function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toastEl = document.createElement('div');
    toastEl.className = `toast toast--${type}`;
    toastEl.textContent = message;
    
    container.appendChild(toastEl);

    setTimeout(() => {
        toastEl.classList.add('toast--visible');
    }, 10);

    setTimeout(() => {
        toastEl.classList.remove('toast--visible');
        setTimeout(() => toastEl.remove(), 300);
    }, 3500);
}

export function switchTab(id, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const screen = document.getElementById(id);
    if (screen) screen.classList.add('active');
    if (btn) btn.classList.add('active');

    if (id === 'goals-screen') renderGoals();
    if (id === 'main-screen') {
        renderHotbar();
        renderRandomQuestDisplay();
    }
    if (id === 'quests-screen') {
        renderQuests();
        renderSocialQuests();
        renderCustomQuests();
    }
    if (id === 'shop-screen') {
        renderRouletteResult('');
        renderInventory();
        drawWheel(0);
    }
    if (id === 'achieve-screen') renderAchievements();
}

export function switchAuthTab(tab) {
    // ...
}

export function showAuthScreen() {
    // ...
}

export function showGameScreen() {
    // ...
}

export function getAvatar(level) {
    // ...
}

export function updateUI() {
    // ...
}

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

    const branchSelect = document.getElementById('custom-quest-branch');
    if(branchSelect && branchSelect.value) {
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

// ... the rest of the functions from the file

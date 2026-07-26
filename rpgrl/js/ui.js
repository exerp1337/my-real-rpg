//  УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ (UI)

import { getState } from './state.js';
import { AVATARS, EXP, SOCIAL_XP_PER_LEVEL, TITLES_DATABASE, RARITIES, STAT_LABELS, RARITY_CONFIG, ROULETTE_SECTORS, ACHIEVEMENTS_DB, LEVEL_THRESHOLDS, BRANCHES } from './constants.js';
import { getLevel } from './game.js';

export const dom = {};

// ===== TOAST =====
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

// ===== АВТОРИЗАЦИЯ =====
export function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTab = document.querySelector('[data-tab="login"]');
    const registerTab = document.querySelector('[data-tab="register"]');
    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        loginTab?.classList.add('active');
        registerTab?.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        registerTab?.classList.add('active');
        loginTab?.classList.remove('active');
    }
}

export function showAuthScreen() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('game-container').classList.remove('active');
}

export function showGameScreen() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('game-container').classList.add('active');
    updateUI();
}

// ===== АВАТАР =====
export function getAvatar(level) {
    let avatar = AVATARS[0];
    for (const a of AVATARS) {
        if (level >= a.level) avatar = a;
    }
    return avatar;
}

// ===== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА =====
export function updateUI() {
    const { currentUserData } = getState();
    if (!currentUserData) return;

    const stats = currentUserData.stats;
    const level = getLevel();
    const avatar = getAvatar(level);

    // Обновление хедера
    document.getElementById('player-level').textContent = `Ур. ${level}`;
    document.getElementById('player-avatar').textContent = avatar.emoji;
    document.getElementById('player-gold').textContent = stats.gold || 0;

    // Обновление статов
    const statMap = {
        'str': document.getElementById('stat-str'),
        'end': document.getElementById('stat-end'),
        'agi': document.getElementById('stat-agi'),
        'int': document.getElementById('stat-int'),
        'cha': document.getElementById('stat-cha'),
        'per': document.getElementById('stat-per'),
        'luck': document.getElementById('stat-luck'),
    };
    for (const [key, el] of Object.entries(statMap)) {
        if (el) el.textContent = stats[key] || 0;
    }

    // Социальный уровень
    const socialLevel = currentUserData.socialLevel || 1;
    const socialXP = currentUserData.socialXP || 0;
    document.getElementById('social-level').textContent = socialLevel;
    const socialProgress = (socialXP % SOCIAL_XP_PER_LEVEL) / SOCIAL_XP_PER_LEVEL * 100;
    document.getElementById('social-progress-fill').style.width = socialProgress + '%';

    // Прогресс общего уровня
    const totalXp = Object.keys(stats).filter(k => k !== 'gold').reduce((sum, k) => sum + stats[k], 0);
    const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 100;
    const levelProgress = (totalXp - currentThreshold) / (nextThreshold - currentThreshold) * 100;
    document.getElementById('level-progress-fill').style.width = Math.min(levelProgress, 100) + '%';
}

// ===== КВЕСТЫ =====
export function renderQuests() {
    const { currentUserData } = getState();
    const container = document.getElementById('quests-container');
    if (!container) return;

    if (!currentUserData?.current_quests?.length) {
        container.innerHTML = `<div class="empty-state">Нет активных квестов на сегодня. Загляните в конструктор!</div>`;
        return;
    }

    container.innerHTML = currentUserData.current_quests.map(q => {
        const isDone = currentUserData.completed_quests?.includes(q.id) || false;
        return `
            <div class="quest-card">
                <div class="quest-title">${q.title}</div>
                <div class="quest-desc">${q.description || q.desc || ''}</div>
                <div class="quest-reward">➕ +${q.points} XP / +${q.gold} 🪙</div>
                <button class="action-btn ${q.type || ''}" data-action="complete-quest" data-quest-id="${q.id}" ${isDone ? 'disabled' : ''}>
                    ${isDone ? 'Выполнено' : 'Выполнить'}
                </button>
            </div>
        `;
    }).join('');
}

export function renderSocialQuests() {
    const { currentUserData } = getState();
    const container = document.getElementById('social-quests-container');
    if (!container) return;

    if (!currentUserData?.socialQuests || currentUserData.socialQuests.length === 0) {
        container.innerHTML = `<div class="empty-state">Социальных квестов нет. Выполните задания с друзьями!</div>`;
        return;
    }

    container.innerHTML = currentUserData.socialQuests.map(q => {
        const isDone = currentUserData.completed_quests?.includes(q.id) || false;
        return `
            <div class="quest-card social-quest">
                <div class="quest-title">${q.title}</div>
                <div class="quest-desc">${q.desc || ''}</div>
                <div class="quest-reward">➕ +${q.points} XP / +${q.gold} 🪙</div>
                <button class="action-btn" data-action="complete-social-quest" data-quest-id="${q.id}" ${isDone ? 'disabled' : ''}>
                    ${isDone ? 'Выполнено' : 'Выполнить'}
                </button>
            </div>
        `;
    }).join('');
}

export function renderCustomQuests() {
    const { currentUserData } = getState();
    const container = document.getElementById('custom-quests-pool-container');
    if (!container) return;

    const branchSelect = document.getElementById('custom-quest-branch');
    if (branchSelect && branchSelect.value) {
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
                    <div class="details">${STAT_LABELS[q.stat] || q.stat} • ${q.points} XP • ${q.gold} 🪙</div>
                </div>
                <button class="delete-quest-btn" data-action="delete-custom-quest" data-quest-id="${q.id}">🗑️</button>
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

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====
export function switchTab(id, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const screen = document.getElementById(id);
    if (screen) screen.classList.add('active');
    if (btn) btn.classList.add('active');

    // Рендеринг соответствующих разделов
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

// ===== ЦЕЛИ (GOALS) =====
export function renderGoals() {
    const { currentUserData } = getState();
    const container = document.getElementById('goals-container');
    if (!container) return;

    if (!currentUserData?.goals?.length) {
        container.innerHTML = `<div class="empty-state">Целей пока нет. Добавьте свою первую цель!</div>`;
        return;
    }

    container.innerHTML = currentUserData.goals.map((goal, index) => {
        const progress = goal.current / goal.target * 100;
        const isComplete = goal.current >= goal.target;
        return `
            <div class="goal-card ${isComplete ? 'completed' : ''}" style="--rarity-color: ${RARITY_CONFIG[goal.rarity]?.color || '#0a84ff'}">
                <div class="goal-title">${goal.title}</div>
                <div class="goal-desc">${goal.desc || ''}</div>
                <div class="goal-progress">
                    <span>${goal.current} / ${goal.target} ${goal.unit || ''}</span>
                    <div class="goal-progress-bar"><div class="fill" style="width:${Math.min(progress, 100)}%"></div></div>
                </div>
                <div class="goal-reward">
                    <span class="xp-reward">+${goal.rewardXp} XP</span>
                    <span class="stat-reward">${STAT_LABELS[goal.stat]}: +${goal.rewardStat}</span>
                    <span class="rarity-label">${RARITY_CONFIG[goal.rarity]?.label || ''}</span>
                </div>
                ${!isComplete ? `<button class="action-btn" data-action="update-goal" data-index="${index}">+1</button>` : ''}
                <button class="action-btn small" data-action="delete-goal" data-index="${index}">🗑</button>
            </div>
        `;
    }).join('');
}

export function showAddGoalModal() {
    document.getElementById('goal-modal').classList.add('active');
    updateRewardPreview();
}

export function closeGoalModal() {
    document.getElementById('goal-modal').classList.remove('active');
}

export function updateRewardPreview() {
    const rarity = document.getElementById('goal-rarity').value;
    const stat = document.getElementById('goal-stat').value;
    const config = RARITY_CONFIG[rarity];
    if (!config) return;
    document.getElementById('goal-preview-xp').textContent = config.xp;
    document.getElementById('goal-preview-stat').textContent = `${STAT_LABELS[stat] || stat} +${config.statBonus}`;
    document.getElementById('goal-preview-rarity').textContent = config.label;
    document.getElementById('goal-preview-rarity').style.color = config.color;
}

// ===== ХОТБАР =====
export function renderHotbar() {
    const { currentUserData } = getState();
    const container = document.getElementById('hotbar-container');
    if (!container) return;

    if (!currentUserData?.goals?.length) {
        container.innerHTML = `<div class="empty-state">Нет активных целей в хотбаре</div>`;
        return;
    }

    // Показываем первые 3 цели
    const hotbarGoals = currentUserData.goals.slice(0, 3);
    container.innerHTML = hotbarGoals.map(goal => {
        const progress = goal.current / goal.target * 100;
        return `
            <div class="hotbar-goal" style="--rarity-color: ${RARITY_CONFIG[goal.rarity]?.color || '#0a84ff'}">
                <div class="title">${goal.title}</div>
                <div class="progress-bar"><div class="fill" style="width:${Math.min(progress, 100)}%"></div></div>
            </div>
        `;
    }).join('');
}

// ===== СЛУЧАЙНЫЙ КВЕСТ =====
export function renderRandomQuestDisplay() {
    const { currentUserData } = getState();
    const container = document.getElementById('random-quest-display');
    if (!container) return;

    const rq = currentUserData?.randomQuest;
    if (!rq) {
        container.innerHTML = `<div class="empty-state">Нет активного случайного квеста</div>`;
        return;
    }
    const isDone = currentUserData.completed_quests?.includes(rq.id) || false;
    container.innerHTML = `
        <div class="quest-card random-quest ${isDone ? 'completed' : ''}">
            <div class="quest-title">🎲 ${rq.title}</div>
            <div class="quest-desc">${rq.desc || ''}</div>
            <div class="quest-reward">➕ +${rq.points} XP / +${rq.gold} 🪙</div>
            <button class="action-btn" data-action="complete-random-quest" ${isDone ? 'disabled' : ''}>
                ${isDone ? 'Выполнено' : 'Выполнить'}
            </button>
        </div>
    `;
}

// ===== МАГАЗИН =====
export function renderInventory() {
    const { currentUserData } = getState();
    const container = document.getElementById('inventory-container');
    if (!container) return;

    const inv = currentUserData?.inventory || [];
    if (!inv.length) {
        container.innerHTML = `<div class="empty-state">Инвентарь пуст</div>`;
        return;
    }

    container.innerHTML = inv.map((item, index) => {
        const rarity = RARITIES[item.rarity] || RARITIES.common;
        const color = rarity.color;
        return `
            <div class="inv-item" style="--rarity-color: ${color}">
                <div class="inv-item-name">${item.emoji || '📦'} ${item.name}</div>
                <div class="inv-item-rarity" style="color:${color}">${rarity.label}</div>
            </div>
        `;
    }).join('');
}

export function renderRouletteResult(result) {
    const el = document.getElementById('roulette-result');
    if (!el) return;
    if (result) {
        el.innerHTML = `<div class="roulette-win">🎉 Выиграно: ${result}</div>`;
    } else {
        el.innerHTML = '';
    }
}

// ===== КОЛЕСО ФОРТУНЫ =====
export function drawWheel(rotation) {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const sectors = ROULETTE_SECTORS;
    const numSectors = sectors.length;
    const arc = (2 * Math.PI) / numSectors;
    const radius = canvas.width / 2 - 10;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < numSectors; i++) {
        const startAngle = i * arc + rotation;
        const endAngle = startAngle + arc;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = sectors[i].color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Текст
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startAngle + arc / 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.font = '12px Orbitron, sans-serif';
        ctx.fillText(sectors[i].label, radius * 0.7, 6);
        ctx.restore();
    }
}

// ===== ДОСТИЖЕНИЯ =====
export function renderAchievements() {
    const { currentUserData } = getState();
    const container = document.getElementById('achievements-container');
    if (!container) return;

    const unlocked = currentUserData?.achievements || [];
    const all = ACHIEVEMENTS_DB;

    container.innerHTML = all.map(ach => {
        const isUnlocked = unlocked.includes(ach.id);
        return `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="ach-icon">${ach.icon}</div>
                <div class="ach-info">
                    <div class="ach-name">${ach.name}</div>
                    <div class="ach-desc">${ach.desc}</div>
                </div>
                ${isUnlocked ? '✅' : '🔒'}
            </div>
        `;
    }).join('');
}

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК АВТОРИЗАЦИИ (уже есть) =====
// Но мы его уже экспортировали выше.

// Экспорт всех функций (если не все помечены export, но мы уже расставили export)
// Дополнительно можно экспортировать всё, что используется извне.
// В нашем случае все нужные функции уже экспортированы.

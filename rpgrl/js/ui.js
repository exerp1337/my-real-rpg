//  УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ (UI)

import { getState } from './state.js';
import { AVATARS, EXP, SOCIAL_XP_PER_LEVEL, TITLES_DATABASE, RARITIES, STAT_LABELS, RARITY_CONFIG, ROULETTE_SECTORS, ACHIEVEMENTS_DB, LEVEL_THRESHOLDS, BRANCHES } from './constants.js';
import { getLevel } from './game.js';

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
    document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(el => el.classList.remove('active'));

    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const registerSuccess = document.getElementById('register-success');

    if (tab === 'login') {
        if(loginTab) loginTab.classList.add('active');
        if(loginForm) loginForm.classList.add('active');
        if(registerError) registerError.textContent = '';
        if(registerSuccess) registerSuccess.textContent = '';
    } else {
        if(registerTab) registerTab.classList.add('active');
        if(registerForm) registerForm.classList.add('active');
        if(loginError) loginError.textContent = '';
    }
}

export function showAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    const gameContainer = document.getElementById('game-container');
    if (authScreen) authScreen.style.display = 'flex';
    if (gameContainer) gameContainer.classList.remove('active');
}

export function showGameScreen() {
    const authScreen = document.getElementById('auth-screen');
    const gameContainer = document.getElementById('game-container');
    if (authScreen) authScreen.style.display = 'none';
    if (gameContainer) gameContainer.classList.add('active');
}

export function getAvatar(level) {
    let result = AVATARS[0];
    for (const a of AVATARS) {
        if (level >= a.level) result = a;
        else break;
    }
    return result;
}

export function updateUI() {
    const { currentUserData, currentUsername } = getState();
    if (!currentUserData) return;

    const stats = currentUserData.stats;
    const totalXp = Object.keys(stats).filter(k => k !== 'gold').reduce((sum, key) => sum + stats[key], 0);
    const lvl = getLevel();
    const currentLevelXpStart = LEVEL_THRESHOLDS[lvl-1] || 0;
    const nextLevelXp = LEVEL_THRESHOLDS[lvl] || (currentLevelXpStart + EXP);
    const xpForLevel = nextLevelXp - currentLevelXpStart;
    const curExp = totalXp - currentLevelXpStart;

    const avatar = getAvatar(lvl);
    
    document.getElementById('header-avatar').textContent = avatar.emoji;
    document.getElementById('user-nick').textContent = currentUsername;
    document.getElementById('user-level-badge').textContent = `Lv.${lvl}`;
    document.getElementById('profile-avatar').textContent = avatar.emoji;
    document.getElementById('profile-avatar').title = avatar.name;
    document.getElementById('level-display').textContent = lvl;
    
    let title = TITLES_DATABASE[TITLES_DATABASE.length - 1].text;
    for (const t of TITLES_DATABASE) {
        if (lvl >= t.lvl) {
            title = t.text;
            break;
        }
    }
    document.getElementById('title-display').textContent = title;
    
    document.getElementById('exp-display').textContent = `${curExp} / ${xpForLevel} XP`;
    document.getElementById('exp-bar').style.width = `${(curExp / xpForLevel * 100)}%`;
    
    for (const id of ['str', 'end', 'agi', 'int', 'cha', 'per', 'luck', 'gold']) {
        document.getElementById(`${id}-val`).textContent = stats[id] || 0;
    }
    
    const socialLevel = currentUserData.socialLevel || 1;
    const socialXP = currentUserData.socialXP || 0;
    const socialProgress = Math.min(100, (socialXP / SOCIAL_XP_PER_LEVEL) * 100);
    
    document.getElementById('social-level-display').textContent = socialLevel;
    document.getElementById('social-xp-display').textContent = `${socialXP} / ${SOCIAL_XP_PER_LEVEL} XP`;
    document.getElementById('social-percent-display').textContent = `${Math.round(socialProgress)}%`;
    document.getElementById('social-bar').style.width = `${socialProgress}%`;
    document.getElementById('social-level-badge').textContent = `Соц.${socialLevel}`;

    const sleepBtn = document.getElementById('sleep-action-btn');
    if (sleepBtn) {
        sleepBtn.disabled = currentUserData.last_sleep_date === new Date().toDateString();
        sleepBtn.textContent = sleepBtn.disabled ? '💤 Отмечено' : '🛌 Лечь спать';
    }

    const bedtimeInput = document.getElementById('sleep-bedtime');
    const wakeupInput = document.getElementById('sleep-wakeup');
    if (bedtimeInput && currentUserData.sleep_schedule) {
        bedtimeInput.value = currentUserData.sleep_schedule.bedtime;
    }
    if (wakeupInput && currentUserData.sleep_schedule) {
        wakeupInput.value = currentUserData.sleep_schedule.wakeup;
    }

    renderInventory();
    renderHotbar();
    renderRandomQuestDisplay();
    renderAchievements();
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

export function renderInventory() {
    const { currentUserData } = getState();
    const container = document.getElementById('inventory-list');
    if (!container) return;

    if (!currentUserData || !currentUserData.inventory || currentUserData.inventory.length === 0) {
        container.innerHTML = `<span class="inventory-empty">У вас пока нет снаряжения...</span>`;
        return;
    }

    container.innerHTML = currentUserData.inventory.map((item) => {
        if (!item || typeof item !== 'object') return '';
        const rarity = RARITIES[item.rarity] || RARITIES.common;
        const statLabel = STAT_LABELS[item.stat] || '';
        const bonusText = item.stat && item.bonus ? `+${item.bonus} ${statLabel}` : '';
        return `
            <span class="inv-item rarity-${item.rarity}" title="${item.desc || ''}">
                <span class="inv-item-icon">${item.icon || '📦'}</span>
                <span class="inv-item-name">${item.name || 'Предмет'}</span>
                ${bonusText ? `<span class="inv-item-bonus">${bonusText}</span>` : ''}
                <span class="inv-item-rarity">${rarity.label}</span>
            </span>
        `;
    }).join('');
}

export function renderHotbar() {
    const { currentUserData } = getState();
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
        const progress = g.target > 0 ? Math.min(100, (g.current || 0) / g.target * 100) : 0;
        return `
            <div class="hotbar-goal rarity-${g.rarity}">
                <div>
                    <div class="title">${g.title}</div>
                    <div class="progress">${g.current || 0} / ${g.target} ${g.unit || ''}</div>
                </div>
                <div class="hotbar-goal-right">
                    <span class="rarity-badge">${RARITY_CONFIG[g.rarity].label}</span>
                    ${progress >= 100 ? '<span class="done">✅</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

export function renderGoals() {
    const { currentUserData } = getState();
    const container = document.getElementById('goals-container');
    if (!container) return;

    if (!currentUserData?.goals?.length) {
        container.innerHTML = '<div class="empty-state">У вас пока нет целей. Добавьте первую!</div>';
        return;
    }

    container.innerHTML = currentUserData.goals.map((g, index) => {
        const config = RARITY_CONFIG[g.rarity] || RARITY_CONFIG.common;
        const progress = g.target > 0 ? Math.min(100, (g.current || 0) / g.target * 100) : 0;
        const isCompleted = g.completed || progress >= 100;
        return `
            <div class="goal-card ${isCompleted ? 'completed' : ''} rarity-${g.rarity}" data-goal-index="${index}">
                <div class="goal-header">
                    <div class="goal-title">${g.title}</div>
                    <div class="goal-header-right">
                        <span class="rarity-badge">${config.label}</span>
                        <div class="goal-percent">${Math.round(progress)}%</div>
                    </div>
                </div>
                ${g.description ? `<div class="goal-desc">${g.description}</div>` : ''}
                <div class="goal-progress">
                    <span>${g.current || 0}</span>
                    <div class="goal-progress-bar"><div class="fill" style="width:${progress}%;"></div></div>
                    <span>${g.target} ${g.unit || ''}</span>
                </div>
                <div class="goal-reward">
                    🎁 Награда: <span class="xp-reward">+${config.xp} XP</span> + <span class="stat-reward rarity-text-${g.rarity}">+${config.statBonus} ${STAT_LABELS[g.stat]}</span>
                </div>
                <div class="goal-actions" data-action="handle-goal-action">
                    ${!isCompleted ? `
                        <button data-goal-action="progress" data-amount="1">➕ +1</button>
                        <button data-goal-action="progress" data-amount="5">➕ +5</button>
                        <button data-goal-action="progress" data-amount="10">➕ +10</button>
                        <button data-goal-action="complete" class="done-btn">✅ Выполнено</button>
                    ` : `
                        <span class="goal-completed-text">✅ Выполнено!</span>
                    `}
                    <button data-goal-action="delete" class="delete-btn">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

export function renderSocialQuests() {
    const { currentUserData } = getState();
    const container = document.getElementById('social-quests-container');
    if (!container) return;
    
    if (!currentUserData?.socialQuests?.length) {
        container.innerHTML = '<div class="social-quest-empty">Нет доступных социальных квестов. Зайдите завтра!</div>';
        return;
    }
    
    container.innerHTML = currentUserData.socialQuests.map((q, index) => {
        const isDone = q.completed;
        return `
            <div class="social-quest-card" data-social-quest-index="${index}">
                <div class="social-quest-rank">Ранг ${q.rank}</div>
                <div class="title">${q.title}</div>
                <div class="desc">${q.desc}</div>
                <div class="reward">🎁 Награда: +${q.xpReward} XP соц. уровня, +${q.socialBonus} к Харизме</div>
                <div class="actions">
                    <button data-action="complete-social" ${isDone ? 'disabled class="done"' : ''}>
                        ${isDone ? '✅ Выполнено' : '✅ Выполнить'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    updateSocialTimer();
}

export function updateSocialTimer() {
    const timerEl = document.getElementById('social-timer');
    if (!timerEl) return;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    timerEl.textContent = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

export function renderAchievements() {
    const container = document.getElementById('achievements-container');
    if (!container) return;
    
    const { currentUserData } = getState();
    if (!currentUserData) {
        container.innerHTML = '<div class="empty-state">Войдите, чтобы видеть достижения</div>';
        return;
    }
    
    container.innerHTML = ACHIEVEMENTS_DB.map(ach => {
        const unlocked = currentUserData.achievements.includes(ach.id);
        return `
            <div class="achieve-card ${unlocked ? '' : 'locked'}">
                <div class="achieve-header">
                    <span class="achieve-title">${unlocked ? '✅' : '🔒'} ${ach.title}</span>
                    <span class="achieve-badge">${unlocked ? 'Получено' : 'Закрыто'}</span>
                </div>
                <div class="achieve-desc">${ach.desc}</div>
                <div class="achieve-reward">
                    🎁 Награда: 
                    ${ach.reward.stats ? Object.entries(ach.reward.stats).map(([s, v]) => `+${v} ${STAT_LABELS[s]}`).join(', ') : ''}
                    ${ach.reward.gold ? `+${ach.gold} 🪙` : ''}
                </div>
            </div>
        `;
    }).join('');
}

export function updateRewardPreview() {
    const rarity = document.getElementById('goal-rarity')?.value || 'common';
    const stat = document.getElementById('goal-stat')?.value || 'str';
    const config = RARITY_CONFIG[rarity];
    const previewEl = document.getElementById('goal-reward-preview');
    if (previewEl) {
        previewEl.innerHTML = `
            🎁 Награда: <span class="xp-reward">+${config.xp} XP</span> + 
            <span class="stat-reward rarity-text-${rarity}">+${config.statBonus} ${STAT_LABELS[stat]}</span>
            <span class="rarity-label">(${config.label})</span>
        `;
    }
}

export function showAddGoalModal() {
    document.getElementById('goal-modal')?.classList.add('active');
    document.getElementById('goal-title').value = '';
    document.getElementById('goal-desc').value = '';
    document.getElementById('goal-target').value = '';
    document.getElementById('goal-unit').value = '';
    updateRewardPreview();
}

export function closeGoalModal() {
    document.getElementById('goal-modal')?.classList.remove('active');
}

let rouletteCanvas = null;
let ctx = null;
export function initRoulette() {
    const canvas = document.getElementById('roulette-canvas');
    if (!canvas) return;
    rouletteCanvas = canvas;
    ctx = canvas.getContext('2d');
    drawWheel(0);
}

export function drawWheel(angle) {
    if (!ctx) return;
    const w = rouletteCanvas.width;
    const h = rouletteCanvas.height;
    const cx = w/2;
    const cy = h/2;
    const radius = Math.min(w, h) * 0.42;

    ctx.clearRect(0, 0, w, h);

    const count = ROULETTE_SECTORS.length;
    const arc = (2 * Math.PI) / count;

    ROULETTE_SECTORS.forEach((sector, i) => {
        const startAngle = angle + i * arc;
        const endAngle = startAngle + arc;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = sector.color;
        ctx.fill();
    });
}

export function renderRouletteResult(text) {
    const resultEl = document.getElementById('roulette-result');
    if (resultEl) {
        resultEl.textContent = text || '';
    }
}

export function renderRandomQuestDisplay() {
    const { currentUserData } = getState();
    const container = document.getElementById('random-quest-display');
    if (!container) return;
    
    const quest = currentUserData?.randomQuest;
    if (!quest) {
        container.innerHTML = 'Нажмите «Крутить», чтобы получить случайное задание.';
        return;
    }

    const difficultyLabel = { easy: '🌱 Легко', medium: '⚡ Средне', hard: '🔥 Хардкор' }[quest.difficulty] || '';
    container.innerHTML = `
        <div class="random-quest-active ${quest.completed ? 'completed' : ''}">
            <div>
                <div class="title">${quest.title} ${quest.completed ? '(выполнено)' : ''}</div>
                <div class="desc">${difficultyLabel} • +${quest.xpReward} XP соц. • +${quest.socialBonus} харизмы</div>
            </div>
            ${!quest.completed ? '<button class="action-btn" data-action="complete-random">✅ Выполнить</button>' : '<span class="done-icon">✅</span>'}
        </div>
    `;
}

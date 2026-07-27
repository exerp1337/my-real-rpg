// ========================================
//  ОТРИСОВКА UI
// ========================================

import { currentUserData, currentUsername, getLevel } from './state.js';
import { 
    AVATARS, EXP, TITLES_DATABASE, STAT_LABELS, 
    RARITIES, RARITY_CONFIG, SOCIAL_XP_PER_LEVEL 
} from './config.js';
import { ACHIEVEMENTS_DB } from './achievements.js';
import { getAvatar, toast } from './utils.js';
import { saveUserData } from './supabase.js'; // нужно для сохранения при разблокировке достижений

export function switchTab(id, btn) {
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
        // drawWheel вызывается из chest.js, но мы можем вызвать её здесь, если импортировать
        // для простоты оставим вызов в main.js
    }
    if (id === 'achieve-screen') renderAchievements();
}

export function updateUI() {
    if (!currentUserData) return;
    const stats = currentUserData.stats;
    const total = stats.str + stats.end + stats.agi + stats.int + stats.cha + stats.per + stats.luck;
    const lvl = getLevel();
    const curExp = total % EXP;

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
        if (currentUserData.last_sleep_date === new Date().toDateString()) {
            sBtn.style.background = '#2c2c2e';
            sBtn.style.opacity = '0.4';
            sBtn.textContent = '💤 Отмечено';
        } else {
            sBtn.style.background = 'linear-gradient(135deg, #0055ff, #0a84ff)';
            sBtn.style.opacity = '1';
            sBtn.textContent = '🛌 Лечь спать';
        }
    }

    renderInventory();
    renderHotbar();
    renderRandomQuestDisplay();
}

export function renderQuests() {
    const container = document.getElementById('quests-container');
    if (!container) return;
    if (!currentUserData?.current_quests?.length) {
        container.innerHTML = `<div style="color:var(--text-secondary); text-align:center; padding:20px;">Нет активных квестов. Зайдите завтра!</div>`;
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
            <button class="action-btn ${q.type || ''}" id="${q.id}" ${isDone ? 'disabled' : ''} onclick="completeQuest('${q.id}', '${q.stat}', ${q.points}, ${q.gold})">${isDone ? 'Выполнено' : 'Выполнить'}</button>
        `;
        container.appendChild(card);
    });
}

export function renderInventory() {
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

export function renderHotbar() {
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
        const config = RARITY_CONFIG[g.rarity] || RARITY_CONFIG.common;
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

export function renderGoals() {
    const container = document.getElementById('goals-container');
    if (!container) return;
    if (!currentUserData?.goals?.length) {
        container.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:20px;">У вас пока нет целей. Добавьте первую!</div>';
        return;
    }
    container.innerHTML = currentUserData.goals.map((g, index) => {
        const config = RARITY_CONFIG[g.rarity] || RARITY_CONFIG.common;
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

export function renderSocialQuests() {
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

export function renderAchievements() {
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

export function renderRouletteResult(text) {
    const resultEl = document.getElementById('roulette-result');
    if (resultEl) {
        resultEl.textContent = text || '';
    }
}

export function renderRandomQuestDisplay() {
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
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--accent-purple); flex-wrap: wrap; gap: 8px;">
            <div>
                <div style="font-weight: 600; color: var(--text-primary);">${quest.title}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${difficultyLabel} • +${quest.xpReward} XP соц. • +${quest.socialBonus} харизмы</div>
            </div>
            <button class="action-btn" style="background: var(--accent-green); width: auto; padding: 6px 16px; font-size: 13px;" onclick="completeRandomQuest()">✅ Выполнить</button>
        </div>
    `;
}

export function updateSocialTimer() {
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

export function updateRewardPreview() {
    const rarity = document.getElementById('goal-rarity')?.value || 'common';
    const stat = document.getElementById('goal-stat')?.value || 'str';
    const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
    const previewEl = document.getElementById('goal-reward-preview');
    if (previewEl) {
        previewEl.innerHTML = `
            🎁 Награда: <span style="color:#ffcc00;">+${config.xp} XP</span> + 
            <span style="color:${config.color};">+${config.statBonus} ${STAT_LABELS[stat]}</span>
            <span style="color:var(--text-secondary); font-size:11px; margin-left:8px;">(${config.label})</span>
        `;
    }
}
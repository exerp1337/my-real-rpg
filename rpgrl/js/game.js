//  ИГРОВАЯ ЛОГИКА

import { getState, setCurrentUser, setLastTrainTime, saveUserData, getUser, createUser, clearSession, getSession, normalizeUserData } from './state.js';
import { toast, updateUI, renderQuests, renderGoals, renderHotbar, showAuthScreen, showGameScreen, switchTab, renderSocialQuests, renderAchievements, renderInventory, renderRouletteResult, initRoulette, drawWheel, renderRandomQuestDisplay } from './ui.js';
import { TUTORIAL_QUESTS, QUESTS_DATABASE, SOCIAL_QUESTS_DB, LEVEL_THRESHOLDS, BRANCHES, ITEMS_POOL, RARITIES, ACHIEVEMENTS_DB } from './constants.js';


// ========================================
//  УРОВНИ И ОПЫТ
// ========================================

export function getLevel() {
    const { currentUserData } = getState();
    if (!currentUserData) return 1;
    
    const stats = currentUserData.stats;
    const totalXp = Object.keys(stats).filter(k => k !== 'gold').reduce((sum, key) => sum + stats[key], 0);
    
    const level = LEVEL_THRESHOLDS.findLastIndex(threshold => totalXp >= threshold);
    return level === -1 ? 1 : level + 1; // Уровни начинаются с 1
}

export function getBranchLevel(branchName) {
    const { currentUserData } = getState();
    if (!currentUserData || !BRANCHES[branchName]) return 1;

    const branchStats = BRANCHES[branchName];
    const branchXp = branchStats.reduce((sum, stat) => sum + (currentUserData.stats[stat] || 0), 0);
    
    const level = LEVEL_THRESHOLDS.findLastIndex(threshold => branchXp >= threshold);
    return level === -1 ? 1 : level + 1;
}

// ========================================
//  ДЕЙСТВИЯ ИГРОКА (Тренировки, Сон)
// ========================================

export async function train(type) {
    const { currentUserData, lastTrainTime } = getState();
    if (!currentUserData) return;

    const now = Date.now();
    if (now - lastTrainTime < 1000) { // Простая защита от спама
        toast('⏳ Подожди секунду!', 'warning');
        return;
    }
    setLastTrainTime(now);

    currentUserData.stats[type] = (currentUserData.stats[type] || 0) + 10;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 2;

    await saveUserData();
    updateUI();
}

export async function saveSleepSchedule(bedtime, wakeup) {
    const { currentUserData } = getState();
    if (!currentUserData) return;

    if (!bedtime || !wakeup) {
        toast('❌ Укажите время отбоя и подъема', 'error');
        return;
    }

    currentUserData.sleep_schedule = { bedtime, wakeup };
    await saveUserData();
    toast('✅ График сна сохранен!', 'success');
    updateUI(); // Чтобы обновить значения в инпутах, если нужно
}

export async function checkSleepTime() {
    const { currentUserData } = getState();
    if (!currentUserData) return;

    const now = new Date();
    const today = now.toDateString();

    if (currentUserData.last_sleep_date === today) {
        toast('💤 Вы уже отметили сон сегодня!', 'info');
        return;
    }
    
    const schedule = currentUserData.sleep_schedule || { bedtime: '23:00', wakeup: '07:00' };
    const [bedtimeHour, bedtimeMinute] = schedule.bedtime.split(':').map(Number);
    
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const bedtimeMinutes = bedtimeHour * 60 + bedtimeMinute;
    
    // Проверяем, лег ли юзер спать вовремя. "Вовремя" - это до полуночи и до установленного времени отбоя.
    // Если время отбоя 23:00, а сейчас 23:01, то это штраф.
    // Если время отбоя 01:00, а сейчас 00:59, то это ок.
    let onTime = false;
    if (bedtimeMinutes >= 1440/2) { // если время отбоя до полуночи (e.g. 23:00)
        onTime = nowMinutes >= bedtimeMinutes && nowMinutes < 1440; // легли после 23:00 и до 00:00
    } else { // если время отбоя после полуночи (e.g. 01:00)
        onTime = nowMinutes >= bedtimeMinutes; // просто проверяем, что легли после 01:00
    }

    // Это упрощенная логика. Она не идеальна для пересечения полуночи.
    // Более правильная логика:
    const currentTime = now.getHours() + now.getMinutes() / 60;
    const targetBedtime = bedtimeHour + bedtimeMinute / 60;

    let isLate;
    if (targetBedtime >= 12) { // если отбой вечером
        isLate = currentTime > targetBedtime && currentTime <= 24;
    } else { // если отбой после полуночи
        isLate = currentTime > targetBedtime && currentTime < 12;
    }

    if (isLate) {
        currentUserData.stats.per = Math.max(0, (currentUserData.stats.per || 0) - 10);
        toast('❌ Нарушение режима! -10 Дисциплины.', 'error');
    } else {
        currentUserData.stats.per = (currentUserData.stats.per || 0) + 15;
        currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 20;
        toast('🏆 Отличный режим! +15 Дисциплины / +20 🪙', 'success');
    }


    currentUserData.last_sleep_date = today;
    await saveUserData();
    updateUI();
}

// ... остальной код game.js ...
// (он остается без изменений на этом шаге)

// ========================================
//  КВЕСТЫ (Ежедневные, Социальные, и т.д.)
// ========================================

export async function checkDailyRotation() {
    const { currentUserData } = getState();
    if (!currentUserData) return;
    
    const today = new Date().toDateString();

    if (currentUserData.last_quest_date !== today) {
        let newQuests = [];
        const tutorialCompleted = currentUserData.tutorial_completed || false;
        
        if (!tutorialCompleted) {
            newQuests = TUTORIAL_QUESTS;
        } else {
            const levels = {
                atletika: getBranchLevel('atletika'),
                intellekt: getBranchLevel('intellekt'),
                disciplina: getBranchLevel('disciplina')
            };
            const availableQuests = QUESTS_DATABASE.filter(q => (levels[q.branch] || 1) >= (q.minBranchLevel || 1));
            newQuests = [...availableQuests].sort(() => 0.5 - Math.random()).slice(0, 3);
        }

        const delayed = currentUserData.delayed_quests || [];
        currentUserData.current_quests = [...delayed, ...newQuests];
        currentUserData.delayed_quests = [];

        currentUserData.completed_quests = currentUserData.completed_quests?.filter(id => id.startsWith('w') || id.startsWith('tut')) || [];
        currentUserData.last_quest_date = today;
        
        await saveUserData();
    }
}


export async function completeQuest(questId) {
    const { currentUserData } = getState();
    if (!currentUserData || currentUserData.completed_quests.includes(questId)) return;
    
    const quest = currentUserData.current_quests.find(q => q.id === questId);
    if (!quest) return;

    currentUserData.stats[quest.stat] = (currentUserData.stats[quest.stat] || 0) + quest.points;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + quest.gold;
    currentUserData.completed_quests.push(questId);
    currentUserData.total_quests_completed = (currentUserData.total_quests_completed || 0) + 1;
    
    // Проверка на завершение туториала
    const completedTutorialQuests = currentUserData.completed_quests.filter(id => id.startsWith('tut')).length;
    if (!currentUserData.tutorial_completed && completedTutorialQuests >= TUTORIAL_QUESTS.length) {
        currentUserData.tutorial_completed = true;
        toast('🎉 Обучение завершено!', 'success');
    }

    await saveUserData();
    updateUI();
    renderQuests();
    toast(`✅ Квест выполнен! +${quest.points} XP, +${quest.gold} 🪙`, 'success');
}


export async function refreshSocialQuests() {
    const { currentUserData } = getState();
    if (!currentUserData) return;
    const today = new Date().toDateString();

    if (currentUserData.lastSocialDate !== today || !currentUserData.socialQuests?.length) {
        const socialLevel = currentUserData.socialLevel || 1;
        const available = SOCIAL_QUESTS_DB.filter(q => q.rank <= socialLevel);
        const shuffled = available.sort(() => 0.5 - Math.random());
        
        currentUserData.socialQuests = shuffled.slice(0, 2).map(q => ({ ...q, completed: false }));
        currentUserData.lastSocialDate = today;
        await saveUserData();
    }
}


// ========================================
//  СИСТЕМА СУНДУКОВ И РУЛЕТКИ
// ========================================

function getRandomItem() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedRarity = 'common';
    for (const [rarity, config] of Object.entries(RARITIES)) {
        cumulative += config.weight;
        if (rand <= cumulative) {
            selectedRarity = rarity;
            break;
        }
    }
    const pool = ITEMS_POOL.filter(item => item.rarity === selectedRarity);
    if (pool.length === 0) return JSON.parse(JSON.stringify(ITEMS_POOL[0])); // Fallback
    return JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]));
}

export async function openChest(tier, price) {
    const { currentUserData } = getState();
    if (!currentUserData) return;

    if ((currentUserData.stats.gold || 0) < price) {
        toast('❌ Недостаточно монет!', 'error');
        return;
    }
    currentUserData.stats.gold -= price;

    const item = getRandomItem();
    currentUserData.inventory.push(item);

    if (item.stat && item.bonus) {
        currentUserData.stats[item.stat] = (currentUserData.stats[item.stat] || 0) + item.bonus;
    }
    currentUserData.total_chests_opened = (currentUserData.total_chests_opened || 0) + 1;
    
    await saveUserData();
    updateUI();
    
    const rarityConfig = RARITIES[item.rarity] || RARITIES.common;
    toast(`🎉 Выпал предмет: ${item.icon} ${item.name} (${rarityConfig.label})!`, 'success');
}


// ========================================
//  АУТЕНТИФИКАЦИЯ
// ========================================

export async function registerUser(username, email, password, password2) {
    if (!username || username.length < 2) return { error: '❌ Имя минимум 2 символа!' };
    if (!password || password.length < 4) return { error: '❌ Пароль минимум 4 символа!' };
    if (password !== password2) return { error: '❌ Пароли не совпадают!' };

    try {
        const existing = await getUser(username);
        if (existing) return { error: '❌ Пользователь уже существует!' };

        const newUser = await createUser(username, password, email);
        if (newUser) {
            return { success: '✅ Аккаунт создан! Теперь войдите.', username };
        }
        return { error: '❌ Ошибка создания аккаунта.' };
    } catch (e) {
        return { error: `❌ Ошибка: ${e.message}` };
    }
}

export async function loginUser(username, password) {
    if (!username || !password) return { error: '❌ Введите имя и пароль!' };

    try {
        const user = await getUser(username);
        if (!user) return { error: '❌ Пользователь не найден!' };
        
        if (user.password !== password) return { error: '❌ Неверный пароль!' };

        const normalizedData = normalizeUserData(user);
        setCurrentUser(username, normalizedData);
        saveSession(username);

        await checkDailyRotation();
        await refreshSocialQuests();
        
        showGameScreen();
        updateUI(); 
        
        toast(`✅ Добро пожаловать, ${username}!`, 'success');
        return { success: true };

    } catch (e) {
        return { error: `❌ Ошибка: ${e.message}` };
    }
}


export function logoutUser() {
    if (confirm('Выйти из аккаунта?')) {
        setCurrentUser(null, null);
        clearSession();
        showAuthScreen();
        toast('👋 До встречи!', 'info');
    }
}

export async function restoreSession() {
    const session = getSession();
    if (!session || !session.username) {
        showAuthScreen();
        return;
    }

    try {
        const user = await getUser(session.username);
        if (!user) {
            clearSession();
            showAuthScreen();
            return;
        }

        const normalizedData = normalizeUserData(user);
        setCurrentUser(session.username, normalizedData);
        
        await checkDailyRotation();
        await refreshSocialQuests();

        showGameScreen();
        switchTab('main-screen', document.querySelector('.tab-btn.active'));
        updateUI();

        toast('🔁 Сессия восстановлена', 'info');

    } catch (e) {
        console.error('Session restore error:', e);
        clearSession();
        showAuthScreen();
    }
}


export async function resetProgress() {
    if (!confirm('Вы действительно хотите сбросить весь прогресс? Это действие необратимо.')) return;
    
    const { currentUserData } = getState();
    if (!currentUserData) return;

    currentUserData.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 };
    currentUserData.inventory = [];
    currentUserData.completed_quests = [];
    currentUserData.current_quests = [];
    currentUserData.delayed_quests = [];
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
    currentUserData.last_weekly_date = '';
    currentUserData.randomQuest = null;
    currentUserData.lastRandomDate = '';
    currentUserData.tutorial_completed = false;
    currentUserData.sleep_schedule = { bedtime: '23:00', wakeup: '07:00' };

    await saveUserData();
    
    await checkDailyRotation();
    await refreshSocialQuests();
    updateUI();
    
    toast('🗑️ Прогресс сброшен!', 'info');
}

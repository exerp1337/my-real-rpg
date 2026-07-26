//  ИГРОВАЯ ЛОГИКА

import { getState, setCurrentUser, saveUserData, getUser, createUser, clearSession, getSession, normalizeUserData } from './state.js';
import { toast, updateUI, renderQuests, showAuthScreen, showGameScreen, switchTab, renderSocialQuests, renderCustomQuests } from './ui.js';
import { TUTORIAL_QUESTS, SOCIAL_QUESTS_DB, LEVEL_THRESHOLDS, BRANCHES, ITEMS_POOL, RARITIES, PROFILE_PRESETS } from './constants.js';


// ========================================
//  УРОВНИ И ОПЫТ
// ========================================

export function getLevel() {
    const { currentUserData } = getState();
    if (!currentUserData) return 1;
    const stats = currentUserData.stats;
    const totalXp = Object.keys(stats).filter(k => k !== 'gold').reduce((sum, key) => sum + stats[key], 0);
    const level = LEVEL_THRESHOLDS.findLastIndex(threshold => totalXp >= threshold);
    return level === -1 ? 1 : level + 1;
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
//  КВЕСТЫ: Управление и логика
// ========================================

export async function applyProfilePreset(presetKey) {
    const { currentUserData } = getState();
    if (!currentUserData || !PROFILE_PRESETS[presetKey]) {
        toast('❌ Неверный пресет профиля.', 'error');
        return;
    }
    if (currentUserData.custom_quests.length > 0) {
        if (!confirm('Это заменит ваши текущие квесты. Продолжить?')) {
            return;
        }
    }
    // Deep copy to avoid mutations
    currentUserData.custom_quests = JSON.parse(JSON.stringify(PROFILE_PRESETS[presetKey].quests));
    await saveUserData();
    toast(`✅ Пресет "${PROFILE_PRESETS[presetKey].name}" применен!`);
    renderCustomQuests(); // Обновляем UI для отображения нового пула
    checkDailyRotation(); // Сразу генерируем дейлики из нового пула
}

export async function addCustomQuest(questData) {
    const { currentUserData } = getState();
    if (!currentUserData) return;

    if (!questData.title || !questData.branch || !questData.stat) {
        toast('❌ Заполните все поля для создания квеста.', 'error');
        return;
    }

    const newQuest = {
        id: `custom_${Date.now()}`,
        title: questData.title,
        description: questData.description || '',
        branch: questData.branch,
        stat: questData.stat,
        points: parseInt(questData.points, 10) || 10,
        gold: parseInt(questData.gold, 10) || 15,
    };

    currentUserData.custom_quests.push(newQuest);
    await saveUserData();
    toast('✅ Новый квест добавлен в ваш пул!', 'success');
    renderCustomQuests();
}

export async function deleteCustomQuest(questId) {
    const { currentUserData } = getState();
    if (!currentUserData) return;

    const questIndex = currentUserData.custom_quests.findIndex(q => q.id === questId);
    if (questIndex === -1) {
        toast('❌ Квест не найден.', 'error');
        return;
    }
    
    if (!confirm(`Вы уверены, что хотите удалить квест "${currentUserData.custom_quests[questIndex].title}"?`)) {
        return;
    }

    currentUserData.custom_quests.splice(questIndex, 1);
    await saveUserData();
    toast('🗑️ Квест удален.', 'info');
    renderCustomQuests();
}

export async function checkDailyRotation() {
    const { currentUserData } = getState();
    if (!currentUserData) return;
    
    const today = new Date().toDateString();

    // Логика стрика
    if (currentUserData.last_streak_date) {
        const lastStreak = new Date(currentUserData.last_streak_date);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Если последний стрик был не вчера, сбрасываем
        if (lastStreak.toDateString() !== yesterday.toDateString()) {
            if (currentUserData.daily_streak > 0) {
                 toast(`🔥 Комбо-стрик ${currentUserData.daily_streak}x сброшен!`, 'warning');
            }
            currentUserData.daily_streak = 0;
        }
    }

    if (currentUserData.last_quest_date !== today) {
        let newQuests = [];
        const tutorialCompleted = currentUserData.tutorial_completed || false;
        
        if (!tutorialCompleted) {
            newQuests = TUTORIAL_QUESTS;
        } else if (currentUserData.custom_quests && currentUserData.custom_quests.length > 0) {
            // Выбираем 3 случайных квеста из пула пользователя
            const shuffled = [...currentUserData.custom_quests].sort(() => 0.5 - Math.random());
            newQuests = shuffled.slice(0, 3);
        } else {
            // Если у пользователя нет квестов, можно выдать сообщение
            console.log("Пул квестов пуст. Добавьте новые квесты.");
        }

        const delayed = currentUserData.delayed_quests || [];
        currentUserData.current_quests = [...delayed, ...newQuests];
        currentUserData.delayed_quests = [];

        currentUserData.completed_quests = currentUserData.completed_quests?.filter(id => id.startsWith('w')) || [];
        currentUserData.last_quest_date = today;
        
        await saveUserData();
    }
}

export async function completeQuest(questId) {
    const { currentUserData } = getState();
    if (!currentUserData || currentUserData.completed_quests.includes(questId)) return;
    
    const quest = currentUserData.current_quests.find(q => q.id === questId);
    if (!quest) {
        toast(`❌ Квест с ID ${questId} не найден в текущих.`, 'error');
        return;
    }
    
    // Логика стрика
    const today = new Date().toDateString();
    if (currentUserData.last_streak_date !== today) {
        currentUserData.daily_streak = (currentUserData.daily_streak || 0) + 1;
        currentUserData.last_streak_date = today;
        if (currentUserData.daily_streak > 1) {
            toast(`🔥 Комбо-стрик: ${currentUserData.daily_streak} дня!`, 'success');
        }
    }

    const streakMultiplier = 1 + (currentUserData.daily_streak * 0.05); // +5% за каждый день стрика
    const finalPoints = Math.round(quest.points * streakMultiplier);
    const finalGold = Math.round(quest.gold * streakMultiplier);

    // Опыт уходит в нужную ветку через главный стат квеста
    const branchStats = BRANCHES[quest.branch];
    if (branchStats) {
        // Начисляем опыт на основной стат ветки
        const mainStat = quest.stat || branchStats[0];
        currentUserData.stats[mainStat] = (currentUserData.stats[mainStat] || 0) + finalPoints;
    } else {
        // Фоллбэк, если ветка не найдена
        currentUserData.stats[quest.stat] = (currentUserData.stats[quest.stat] || 0) + finalPoints;
    }

    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + finalGold;
    currentUserData.completed_quests.push(questId);
    currentUserData.total_quests_completed = (currentUserData.total_quests_completed || 0) + 1;
    
    const completedTutorialQuests = currentUserData.completed_quests.filter(id => id.startsWith('tut')).length;
    if (!currentUserData.tutorial_completed && completedTutorialQuests >= TUTORIAL_QUESTS.length) {
        currentUserData.tutorial_completed = true;
        toast('🎉 Обучение завершено!', 'success');
    }

    await saveUserData();
    updateUI();
    renderQuests();
    toast(`✅ ${quest.title}! +${finalPoints} XP, +${finalGold} 🪙`, 'success');
}

// ... (остальные функции, не связанные с основной логикой квестов, остаются без изменений) ...
// ... train, checkSleepTime, refreshSocialQuests, openChest, auth functions, resetProgress ...
// --- Начало неизменного кода ---
export async function train(type) {
    const { currentUserData, lastTrainTime } = getState();
    if (!currentUserData) return;

    const now = Date.now();
    if (now - lastTrainTime < 1000) { 
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
    updateUI();
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
    
    const currentTime = now.getHours() + now.getMinutes() / 60;
    const targetBedtime = bedtimeHour + bedtimeMinute / 60;

    let isLate;
    if (targetBedtime >= 12) { 
        isLate = currentTime > targetBedtime && currentTime <= 24;
    } else {
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
    if (pool.length === 0) return JSON.parse(JSON.stringify(ITEMS_POOL[0])); 
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
    currentUserData.custom_quests = [];
    currentUserData.daily_streak = 0;
    currentUserData.last_streak_date = '';

    await saveUserData();
    
    await checkDailyRotation();
    await refreshSocialQuests();
    updateUI();
    
    toast('🗑️ Прогресс сброшен!', 'info');
}
// --- Конец неизменного кода ---

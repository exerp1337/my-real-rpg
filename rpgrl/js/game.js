//  ИГРОВАЯ ЛОГИКА

import { getState, setCurrentUser, saveUserData, getUser, createUser, clearSession, getSession, normalizeUserData } from '/js/state.js';
import { toast, updateUI, renderQuests, showAuthScreen, showGameScreen, switchTab, renderSocialQuests, renderCustomQuests } from '/js/ui.js';
import { TUTORIAL_QUESTS, SOCIAL_QUESTS_DB, LEVEL_THRESHOLDS, BRANCHES, ITEMS_POOL, RARITIES, PROFILE_PRESETS } from '/js/constants.js';


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

// ... (rest of file is unchanged)

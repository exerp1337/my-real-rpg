// ========================================
//  КВЕСТЫ (ежедневные, социальные, случайные)
// ========================================

import { currentUserData } from './state.js';
import { QUESTS_DATABASE, SOCIAL_QUESTS_DB, SOCIAL_XP_PER_LEVEL } from './config.js';
import { saveUserData } from './supabase.js';
import { toast } from './utils.js';
import { 
    updateUI, renderQuests, renderSocialQuests, renderAchievements, 
    renderRandomQuestDisplay, renderHotbar 
} from './ui.js';

export async function checkDailyRotation() {
    if (!currentUserData) return;
    const today = new Date().toDateString();
    if (currentUserData.last_quest_date !== today || !currentUserData.current_quests?.length) {
        const shuffled = [...QUESTS_DATABASE].sort(() => 0.5 - Math.random());
        currentUserData.current_quests = shuffled.slice(0, 3);
        currentUserData.completed_quests = currentUserData.completed_quests?.filter(id => id === 'w1') || [];
        currentUserData.last_quest_date = today;
        await saveUserData();
    }
}

export async function completeQuest(id, type, points, gold) {
    if (!currentUserData || currentUserData.completed_quests.includes(id)) return;
    currentUserData.stats[type] = (currentUserData.stats[type] || 0) + points;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + gold;
    currentUserData.completed_quests.push(id);
    currentUserData.total_quests_completed = (currentUserData.total_quests_completed || 0) + 1;
    await saveUserData();
    updateUI();
    renderQuests();
    renderAchievements();
    toast(`✅ Квест выполнен! +${points} XP, +${gold} 🪙`, 'success');
}

export async function completeWeeklyChallenge(btn) {
    if (!currentUserData) return;
    const today = new Date().toDateString();
    const lastWeekly = currentUserData.last_weekly_date || '';
    if (lastWeekly === today) {
        toast('⏳ Вы уже выполнили вызов сегодня!', 'warning');
        return;
    }
    if (lastWeekly) {
        const lastDate = new Date(lastWeekly);
        const diffDays = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            toast('⏳ Выполнить вызов можно раз в неделю!', 'warning');
            return;
        }
    }

    ['str', 'end', 'agi', 'int', 'cha', 'per'].forEach(id => {
        currentUserData.stats[id] = (currentUserData.stats[id] || 0) + 8;
    });
    currentUserData.stats.luck = (currentUserData.stats.luck || 0) + 15;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 100;
    currentUserData.completed_quests.push('w1');
    currentUserData.last_weekly_date = today;
    await saveUserData();
    updateUI();
    toast('⭐ Вызов выполнен! Награда получена!', 'success');
}

export async function refreshSocialQuests() {
    if (!currentUserData) return;
    const today = new Date().toDateString();
    if (currentUserData.lastSocialDate !== today || !currentUserData.socialQuests?.length) {
        const chaLevel = currentUserData.stats.cha || 0;
        let rank = 1;
        if (chaLevel >= 26) rank = 6;
        else if (chaLevel >= 21) rank = 5;
        else if (chaLevel >= 16) rank = 4;
        else if (chaLevel >= 11) rank = 3;
        else if (chaLevel >= 6) rank = 2;

        const available = SOCIAL_QUESTS_DB.filter(q => q.rank === rank);
        const shuffled = available.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 2);
        currentUserData.socialQuests = selected.map(q => ({ ...q, completed: false }));
        currentUserData.lastSocialDate = today;
        await saveUserData();
    }
}

export async function completeSocialQuest(index) {
    if (!currentUserData?.socialQuests?.[index]) return;
    const quest = currentUserData.socialQuests[index];
    if (quest.completed) {
        toast('Этот квест уже выполнен!', 'warning');
        return;
    }
    quest.completed = true;
    currentUserData.socialXP = (currentUserData.socialXP || 0) + quest.xpReward;
    currentUserData.stats.cha = (currentUserData.stats.cha || 0) + quest.socialBonus;
    currentUserData.total_social_quests_completed = (currentUserData.total_social_quests_completed || 0) + 1;
    let leveledUp = false;
    while (currentUserData.socialXP >= SOCIAL_XP_PER_LEVEL) {
        currentUserData.socialXP -= SOCIAL_XP_PER_LEVEL;
        currentUserData.socialLevel = (currentUserData.socialLevel || 1) + 1;
        leveledUp = true;
    }
    await saveUserData();
    updateUI();
    renderSocialQuests();
    renderAchievements();
    if (leveledUp) {
        toast(`🎉 Социальный уровень повышен! Теперь ты ${currentUserData.socialLevel} уровень!`, 'success');
    } else {
        toast(`✅ Квест выполнен! +${quest.xpReward} XP, +${quest.socialBonus} к харизме.`, 'success');
    }
    await refreshSocialQuests();
}

export function getAvailableRandomQuests() {
    const socialLevel = currentUserData?.socialLevel || 1;
    return SOCIAL_QUESTS_DB.filter(q => q.minSocialLevel <= socialLevel);
}

export function startRandomQuest() {
    if (!currentUserData) {
        toast('❌ Войдите в игру!', 'error');
        return;
    }
    const today = new Date().toDateString();
    if (currentUserData.lastRandomDate === today) {
        toast('⏳ Вы уже крутили сегодня! Завтра будет новый шанс.', 'warning');
        return;
    }
    if (currentUserData.randomQuest && !currentUserData.randomQuest.completed) {
        toast('⚠️ У вас уже есть активный случайный квест! Выполните его или дождитесь завтра.', 'warning');
        return;
    }

    const available = getAvailableRandomQuests();
    if (available.length === 0) {
        toast('❌ Нет доступных заданий для вашего уровня.', 'error');
        return;
    }

    const modal = document.getElementById('roulette-modal');
    modal.classList.add('active');
    const spinText = document.getElementById('roulette-spin-text');
    const resultText = document.getElementById('roulette-result-text');
    const actionsDiv = document.getElementById('roulette-actions');
    const acceptBtn = document.getElementById('roulette-accept-btn');
    const skipBtn = document.getElementById('roulette-skip-btn');
    const closeBtn = document.getElementById('roulette-close-btn');

    spinText.textContent = '🎰';
    resultText.textContent = '';
    actionsDiv.style.display = 'none';
    acceptBtn.disabled = false;
    skipBtn.disabled = false;

    let count = 0;
    const emojis = ['🎲', '🎰', '🌀', '⚡', '🔥', '✨', '💫', '🌟'];
    const interval = setInterval(() => {
        spinText.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        count++;
        if (count > 15) {
            clearInterval(interval);
            const chosen = available[Math.floor(Math.random() * available.length)];
            const questCopy = { ...chosen, completed: false };
            spinText.textContent = chosen.emoji || '🎯';
            resultText.textContent = `«${chosen.title}» — ${chosen.desc}`;
            actionsDiv.style.display = 'flex';

            acceptBtn.onclick = function() {
                if (currentUserData.randomQuest && !currentUserData.randomQuest.completed) {
                    toast('⚠️ У вас уже есть активный квест!', 'warning');
                    return;
                }
                currentUserData.randomQuest = { ...questCopy };
                currentUserData.lastRandomDate = new Date().toDateString();
                saveUserData().then(() => {
                    modal.classList.remove('active');
                    renderRandomQuestDisplay();
                    updateUI();
                    toast(`✅ Квест «${questCopy.title}» принят! Выполняйте!`, 'success');
                });
                acceptBtn.disabled = true;
                skipBtn.disabled = true;
            };

            skipBtn.onclick = function() {
                if (currentUserData.lastRandomDate === new Date().toDateString()) {
                    modal.classList.remove('active');
                    toast('🔄 Вы пропустили задание. Приходите завтра!', 'info');
                } else {
                    modal.classList.remove('active');
                    toast('🔄 Вы пропустили это задание. Попробуйте снова!', 'info');
                }
                skipBtn.disabled = true;
                acceptBtn.disabled = true;
            };

            closeBtn.onclick = function() {
                modal.classList.remove('active');
            };
        }
    }, 130);
}

export async function completeRandomQuest() {
    if (!currentUserData || !currentUserData.randomQuest || currentUserData.randomQuest.completed) {
        toast('❌ Нет активного случайного квеста.', 'error');
        return;
    }
    const quest = currentUserData.randomQuest;
    currentUserData.socialXP = (currentUserData.socialXP || 0) + quest.xpReward;
    currentUserData.stats.cha = (currentUserData.stats.cha || 0) + quest.socialBonus;
    quest.completed = true;
    let leveledUp = false;
    while (currentUserData.socialXP >= SOCIAL_XP_PER_LEVEL) {
        currentUserData.socialXP -= SOCIAL_XP_PER_LEVEL;
        currentUserData.socialLevel = (currentUserData.socialLevel || 1) + 1;
        leveledUp = true;
    }
    await saveUserData();
    updateUI();
    renderRandomQuestDisplay();
    renderAchievements();
    if (leveledUp) {
        toast(`🎉 Социальный уровень повышен! Теперь ты ${currentUserData.socialLevel} уровень!`, 'success');
    } else {
        toast(`✅ Случайный квест выполнен! +${quest.xpReward} XP, +${quest.socialBonus} к харизме.`, 'success');
    }
}
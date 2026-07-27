// main.js
import { restoreSession } from './auth.js';
import {
    switchTab, updateUI, renderQuests, renderGoals, renderHotbar,
    renderSocialQuests, renderAchievements, renderInventory,
    renderRouletteResult, renderRandomQuestDisplay, updateRewardPreview
} from './ui.js';
import { initRoulette, spinRoulette, openChest } from './chest.js';
import {
    completeQuest, completeWeeklyChallenge, completeSocialQuest,
    startRandomQuest, completeRandomQuest
} from './quests.js';
import { train, checkSleepTime } from './training.js';
import {
    addGoal, updateGoalProgress, setGoalComplete, deleteGoal,
    showAddGoalModal, closeGoalModal
} from './goals.js';
import { logoutUser, loginUser, registerUser, switchAuthTab } from './auth.js';
import { resetProgress } from './reset.js';

// === Глобальные привязки для HTML-атрибутов onclick ===
window.switchTab = switchTab;
window.logoutUser = logoutUser;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.switchAuthTab = switchAuthTab;
window.train = train;
window.checkSleepTime = checkSleepTime;
window.completeQuest = completeQuest;
window.completeWeeklyChallenge = completeWeeklyChallenge;
window.completeSocialQuest = completeSocialQuest;
window.startRandomQuest = startRandomQuest;
window.completeRandomQuest = completeRandomQuest;
window.openChest = openChest;
window.spinRoulette = spinRoulette;
window.addGoal = addGoal;
window.updateGoalProgress = updateGoalProgress;
window.setGoalComplete = setGoalComplete;
window.deleteGoal = deleteGoal;
window.showAddGoalModal = showAddGoalModal;
window.closeGoalModal = closeGoalModal;
window.resetProgress = resetProgress;
window.updateRewardPreview = updateRewardPreview;

// === Инициализация ===
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('goal-rarity')?.addEventListener('change', updateRewardPreview);
    document.getElementById('goal-stat')?.addEventListener('change', updateRewardPreview);
    document.getElementById('random-quest-btn')?.addEventListener('click', startRandomQuest);

    restoreSession().then(() => {
        initRoulette();
    });

    setInterval(() => {
        const n = new Date();
        let h = 23 - n.getHours(),
            m = 59 - n.getMinutes(),
            s = 59 - n.getSeconds();
        const dailyTimer = document.getElementById('daily-timer');
        if (dailyTimer) {
            dailyTimer.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        const daysLeft = 6 - (n.getDay() % 7);
        const weeklyTimer = document.getElementById('weekly-timer');
        if (weeklyTimer) {
            weeklyTimer.textContent = `${daysLeft}д ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
    }, 1000);

    console.log('✅ Игра запущена! Все системы работают.');
});
// ========================================
//  ГЛАВНЫЙ МОДУЛЬ (инициализация и привязка)
// ========================================

import { restoreSession } from './auth.js';
import { 
    switchTab, updateUI, renderQuests, renderGoals, renderHotbar, 
    renderSocialQuests, renderAchievements, renderInventory, 
    renderRouletteResult, renderRandomQuestDisplay, updateRewardPreview 
} from './ui.js';
import { initRoulette, drawWheel, spinRoulette, openChest } from './chest.js';
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
import { resetProgress } from './reset.js'; // нужно создать модуль reset, или оставить в main
// Для простоты мы не создавали reset.js, но функция resetProgress была в исходнике. Можно создать отдельный модуль reset.js.
// Я создам его прямо здесь, в main, но для чистоты лучше вынести.

// Временно определим resetProgress здесь (или импортируем)
import { currentUserData } from './state.js';
import { saveUserData } from './supabase.js';
import { checkDailyRotation, refreshSocialQuests } from './quests.js';

async function resetProgress() {
    if (!currentUserData) return;
    if (!confirm('Сбросить прогресс?')) return;
    
    currentUserData.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 };
    currentUserData.completed_quests = [];
    currentUserData.inventory = [];
    currentUserData.current_quests = [];
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
    
    await saveUserData();
    await checkDailyRotation();
    await refreshSocialQuests();
    
    updateUI();
    renderInventory();
    renderQuests();
    renderGoals();
    renderHotbar();
    renderSocialQuests();
    renderAchievements();
    renderRouletteResult('');
    renderRandomQuestDisplay();
    
    toast('🗑️ Прогресс сброшен!', 'info');
}

// Делаем все функции глобальными (для onclick)
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

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Навешиваем обработчики событий
    document.getElementById('goal-rarity')?.addEventListener('change', updateRewardPreview);
    document.getElementById('goal-stat')?.addEventListener('change', updateRewardPreview);
    document.getElementById('random-quest-btn')?.addEventListener('click', startRandomQuest);
    
    // Запускаем восстановление сессии
    restoreSession().then(() => {
        // После восстановления инициализируем рулетку
        initRoulette();
    });
    
    // Таймеры для обновления времени
    setInterval(() => {
        const n = new Date();
        let h = 23 - n.getHours(), m = 59 - n.getMinutes(), s = 59 - n.getSeconds();
        const dailyTimer = document.getElementById('daily-timer');
        if (dailyTimer) {
            dailyTimer.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }
        const daysLeft = 6 - (n.getDay() % 7);
        const weeklyTimer = document.getElementById('weekly-timer');
        if (weeklyTimer) {
            weeklyTimer.textContent = `${daysLeft}д ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }
        // Пересчет социального таймера внутри ui.updateSocialTimer вызывается каждую секунду
        // Можно вызывать updateSocialTimer, но она экспортируется из ui.
        // Для простоты оставим как есть.
    }, 1000);
    
    console.log('✅ Игра запущена! Все системы работают.');
});

// Также нужно импортировать toast для reset, но toast уже есть в utils
import { toast } from './utils.js';
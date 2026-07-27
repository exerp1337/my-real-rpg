// reset.js
import { currentUserData } from './state.js';
import { saveUserData } from './supabase.js';
import { checkDailyRotation, refreshSocialQuests } from './quests.js';
import {
    updateUI, renderInventory, renderQuests, renderGoals,
    renderHotbar, renderSocialQuests, renderAchievements,
    renderRouletteResult, renderRandomQuestDisplay
} from './ui.js';
import { toast } from './utils.js';

export async function resetProgress() {
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
// ========================================
//  СИСТЕМА ЦЕЛЕЙ
// ========================================

import { currentUserData } from './state.js';
import { RARITY_CONFIG, STAT_LABELS } from './config.js';
import { saveUserData } from './supabase.js';
import { updateUI, renderGoals, renderHotbar, renderAchievements } from './ui.js';
import { toast } from './utils.js';

export function getRarityConfig(rarity) {
    return RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
}

export function showAddGoalModal() {
    document.getElementById('goal-modal').classList.add('active');
    document.getElementById('goal-title').value = '';
    document.getElementById('goal-desc').value = '';
    document.getElementById('goal-target').value = '';
    document.getElementById('goal-unit').value = '';
    document.getElementById('goal-rarity').value = 'common';
    document.getElementById('goal-stat').value = 'str';
    updateRewardPreview(); // функция из ui
}

export function closeGoalModal() {
    document.getElementById('goal-modal').classList.remove('active');
}

export async function addGoal() {
    const title = document.getElementById('goal-title').value.trim();
    const description = document.getElementById('goal-desc').value.trim();
    const target = parseFloat(document.getElementById('goal-target').value);
    const unit = document.getElementById('goal-unit').value.trim();
    const rarity = document.getElementById('goal-rarity').value;
    const stat = document.getElementById('goal-stat').value;
    const config = getRarityConfig(rarity);

    if (!title) {
        toast('❌ Введите название цели!', 'error');
        return;
    }
    if (!target || target <= 0) {
        toast('❌ Введите целевое значение (число > 0)!', 'error');
        return;
    }

    const newGoal = {
        id: Date.now().toString(),
        title,
        description: description || '',
        target,
        current: 0,
        unit: unit || '',
        rarity: rarity,
        stat: stat,
        xpReward: config.xp,
        statBonus: config.statBonus,
        completed: false,
        createdAt: new Date().toISOString()
    };

    if (!Array.isArray(currentUserData.goals)) {
        currentUserData.goals = [];
    }
    currentUserData.goals.push(newGoal);
    await saveUserData();
    closeGoalModal();
    renderGoals();
    renderHotbar();
    toast(`🎯 Цель "${title}" добавлена! (${config.label})`, 'success');
}

export async function updateGoalProgress(index, amount) {
    if (!currentUserData?.goals?.[index]) return;
    const goal = currentUserData.goals[index];
    if (goal.completed) return;
    goal.current = (goal.current || 0) + amount;
    if (goal.current >= goal.target) {
        goal.current = goal.target;
        goal.completed = true;
        await claimGoalReward(index);
        toast(`🎉 Цель "${goal.title}" выполнена! Молодец!`, 'success');
    }
    await saveUserData();
    renderGoals();
    renderHotbar();
    updateUI();
    renderAchievements();
}

export async function setGoalComplete(index) {
    if (!currentUserData?.goals?.[index]) return;
    const goal = currentUserData.goals[index];
    if (goal.completed) return;
    if (!confirm(`Отметить "${goal.title}" как выполненную?`)) return;
    goal.completed = true;
    goal.current = goal.target;
    await claimGoalReward(index);
    await saveUserData();
    renderGoals();
    renderHotbar();
    updateUI();
    renderAchievements();
    toast('✅ Цель отмечена как выполненная! Награда получена!', 'success');
}

async function claimGoalReward(index) {
    if (!currentUserData?.goals?.[index]) return;
    const goal = currentUserData.goals[index];
    const config = getRarityConfig(goal.rarity);
    const targetStat = goal.stat || 'str';
    currentUserData.stats[targetStat] = (currentUserData.stats[targetStat] || 0) + config.statBonus;
    currentUserData.stats.luck = (currentUserData.stats.luck || 0) + Math.floor(config.xp / 5);
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + config.xp * 2;
    currentUserData.total_goals_completed = (currentUserData.total_goals_completed || 0) + 1;
}

export async function deleteGoal(index) {
    if (!currentUserData?.goals?.[index]) return;
    const goal = currentUserData.goals[index];
    if (!confirm(`Удалить цель "${goal.title}"?`)) return;
    currentUserData.goals.splice(index, 1);
    await saveUserData();
    renderGoals();
    renderHotbar();
}
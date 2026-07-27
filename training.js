// ========================================
//  ТРЕНИРОВКИ И СОН
// ========================================

import { currentUserData, lastTrainTime } from './state.js';
import { saveUserData } from './supabase.js';
import { updateUI } from './ui.js';
import { toast } from './utils.js';

export async function train(type) {
    if (!currentUserData) return;
    const now = Date.now();
    if (now - lastTrainTime < 1000) {
        toast('⏳ Подожди секунду!', 'warning');
        return;
    }
    lastTrainTime = now;
    currentUserData.stats[type] = (currentUserData.stats[type] || 0) + 10;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 2;
    await saveUserData();
    updateUI();
}

export async function checkSleepTime() {
    if (!currentUserData) return;
    const now = new Date();
    const today = now.toDateString();
    if (currentUserData.last_sleep_date === today) {
        toast('💤 Вы уже отметили сон сегодня!', 'info');
        return;
    }
    const hours = now.getHours();
    if (hours >= 0 && hours < 6) {
        currentUserData.stats.per = Math.max(0, (currentUserData.stats.per || 0) - 10);
        toast('⚠️ Вы легли после полуночи! -10 Дисциплина.', 'error');
    } else {
        currentUserData.stats.per = (currentUserData.stats.per || 0) + 10;
        currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 15;
        toast('🏆 Отличный режим! +10 Дисциплина / +15 🪙', 'success');
    }
    currentUserData.last_sleep_date = today;
    await saveUserData();
    updateUI();
}
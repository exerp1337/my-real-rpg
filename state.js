// ========================================
//  ГЛОБАЛЬНОЕ СОСТОЯНИЕ ИГРЫ
// ========================================

import { EXP } from './config.js';

export let currentUserData = null;
export let currentUsername = null;
export let lastTrainTime = 0;

export function getLevel() {
    if (!currentUserData) return 1;
    const stats = currentUserData.stats;
    const total = stats.str + stats.end + stats.agi + stats.int + stats.cha + stats.per + stats.luck;
    return Math.floor(total / EXP) + 1;
}
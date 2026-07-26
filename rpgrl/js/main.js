//  ГЛАВНЫЙ ФАЙЛ - ТОЧКА ВХОДА

import { 
    restoreSession, loginUser, registerUser, logoutUser, train, checkSleepTime, 
    completeQuest, resetProgress, openChest, addGoal, updateGoalProgress, 
    setGoalComplete, deleteGoal, completeSocialQuest, completeRandomQuest,
    startRandomQuest, spinRoulette, completeWeeklyChallenge, saveSleepSchedule,
    applyProfilePreset, addCustomQuest, deleteCustomQuest 
} from '/js/game.js';
import { 
    switchTab, switchAuthTab, updateRewardPreview, showAddGoalModal, closeGoalModal,
    toast, populateStatsForBranch
} from '/js/ui.js';

// ========================================
//  КЭШИРОВАНИЕ DOM-ЭЛЕМЕНТОВ
// ========================================
const dom = {};

function cacheDOMElements() {
    const ids = [
        'auth-screen', 'game-container', 'login-form', 'register-form',
        'login-username', 'login-password', 'login-error', 
        'reg-username', 'reg-email', 'reg-password', 'reg-password2', 'register-error', 'register-success',
        'goal-rarity', 'goal-stat', 'goal-title', 'goal-desc', 'goal-target', 'goal-unit',
        'quests-container', 'goals-container',
        'sleep-bedtime', 'sleep-wakeup',
        'custom-quest-title', 'custom-quest-desc', 'custom-quest-branch', 
        'custom-quest-stat', 'custom-quest-points', 'custom-quest-gold'
    ];
    for (const id of ids) {
        dom[id] = document.getElementById(id);
    }
}

// ========================================
//  УТИЛИТЫ
// ========================================

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}


// ========================================
//  ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ========================================

function initialize() {
    console.log('✅ Игра запущена! Все системы работают.');
    cacheDOMElements();
    setupEventListeners();
    restoreSession();
    setInterval(updateTimers, 1000);
}

// ========================================
//  ОБРАБОТЧИКИ СОБЫТИЙ
// ========================================

function setupEventListeners() {
    document.body.addEventListener('click', handleBodyClick);
    
    // Non-delegated events
    if(dom['goal-rarity']) dom['goal-rarity'].addEventListener('change', updateRewardPreview);
    if(dom['goal-stat']) dom['goal-stat'].addEventListener('change', updateRewardPreview);
    if(dom['custom-quest-branch']) dom['custom-quest-branch'].addEventListener('change', (e) => {
        populateStatsForBranch(e.target.value);
    });
}

const debouncedOpenChest = debounce(openChest, 1000);
const debouncedTrain = debounce(train, 500);
const debouncedCompleteQuest = debounce(completeQuest, 1000);

async function handleBodyClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;

    switch (action) {
        case 'switch-auth-tab':
            switchAuthTab(target.dataset.tab);
            break;

        case 'login': {
            const result = await loginUser(dom['login-username'].value, dom['login-password'].value);
            if (result.error) dom['login-error'].textContent = result.error;
            break;
        }

        case 'register': {
            const result = await registerUser(dom['reg-username'].value, dom['reg-email'].value, dom['reg-password'].value, dom['reg-password2'].value);
            dom['register-error'].textContent = result.error || '';
            dom['register-success'].textContent = result.success || '';
            if(result.success) {
                setTimeout(() => {
                    switchAuthTab('login');
                    dom['login-username'].value = result.username;
                }, 1000);
            }
            break;
        }

        case 'logout':
            logoutUser();
            break;

        case 'switch-tab':
            switchTab(target.dataset.screen, target);
            break;

        case 'apply-preset':
            applyProfilePreset(target.dataset.preset);
            break;

        case 'add-custom-quest': {
            const questData = {
                title: dom['custom-quest-title'].value,
                description: dom['custom-quest-desc'].value,
                branch: dom['custom-quest-branch'].value,
                stat: dom['custom-quest-stat'].value,
                points: dom['custom-quest-points'].value,
                gold: dom['custom-quest-gold'].value,
            };
            await addCustomQuest(questData);
            // Clear form
            dom['custom-quest-title'].value = '';
            dom['custom-quest-desc'].value = '';
            break;
        }

        case 'delete-custom-quest':
            deleteCustomQuest(target.dataset.questId);
            break;

        case 'check-sleep':
            checkSleepTime();
            break;

        case 'save-sleep-schedule': {
            const bedtime = dom['sleep-bedtime'].value;
            const wakeup = dom['sleep-wakeup'].value;
            saveSleepSchedule(bedtime, wakeup);
            break;
        }

        case 'train':
            debouncedTrain(target.dataset.stat);
            break;
        
        case 'complete-quest':
            debouncedCompleteQuest(target.dataset.questId);
            break;

        // ... (other actions remain the same)
        default:
            console.warn(`Unknown action: ${action}`);
    }
}


// ========================================
//  ТАЙМЕРЫ
// ========================================

function updateTimers() {
    // ...
}

// ========================================
//  ЗАПУСК
// ========================================

document.addEventListener('DOMContentLoaded', initialize);

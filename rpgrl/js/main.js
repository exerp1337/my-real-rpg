//  ГЛАВНЫЙ ФАЙЛ - ТОЧКА ВХОДА

import { 
    restoreSession, loginUser, registerUser, logoutUser, train, checkSleepTime, 
    completeQuest, resetProgress, openChest, addGoal, updateGoalProgress, 
    setGoalComplete, deleteGoal, completeSocialQuest, 
    startRandomQuest, completeRandomQuest,
    saveSleepSchedule,
    applyProfilePreset, addCustomQuest, deleteCustomQuest 
} from './game.js';
// Removed spinRoulette and completeWeeklyChallenge as they are not used here directly
// They are internal to game.js or handled by other means.
import { 
    switchTab, switchAuthTab, updateRewardPreview, showAddGoalModal, closeGoalModal,
    toast, populateStatsForBranch
} from './ui.js';

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
    // Removed setInterval for timers as it's not fully implemented
}

// ========================================
//  ОБРАБОТЧИКИ СОБЫТИЙ
// ========================================

function setupEventListeners() {
    document.body.addEventListener('click', handleBodyClick);
    
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

        case 'show-goal-modal':
            showAddGoalModal();
            break;
        
        case 'close-goal-modal':
            closeGoalModal();
            break;
        
        case 'add-goal': {
            const goalData = {
                title: dom['goal-title'].value,
                description: dom['goal-desc'].value,
                target: parseFloat(dom['goal-target'].value),
                unit: dom['goal-unit'].value,
                rarity: dom['goal-rarity'].value,
                stat: dom['goal-stat'].value,
            };
            const result = await addGoal(goalData);
            if(result.error) toast(result.error, 'error');
            break;
        }

        case 'handle-goal-action': {
            const card = target.closest('.goal-card');
            if (!card) return;
            const index = parseInt(card.dataset.goalIndex, 10);
            const goalActionTarget = target.closest('[data-goal-action]');
            if (!goalActionTarget) return;
            
            const goalAction = goalActionTarget.dataset.goalAction;
            
            if (goalAction === 'progress') {
                const amount = parseInt(goalActionTarget.dataset.amount, 10);
                updateGoalProgress(index, amount);
            } else if (goalAction === 'complete') {
                setGoalComplete(index);
            } else if (goalAction === 'delete') {
                deleteGoal(index);
            }
            break;
        }

        case 'complete-social': {
            const card = target.closest('.social-quest-card');
            if (!card) return;
            const index = parseInt(card.dataset.socialQuestIndex, 10);
            completeSocialQuest(index);
            break;
        }

        case 'complete-random': {
            completeRandomQuest();
            break;
        }
        
        default:
            console.warn(`Unknown action: ${action}`);
    }
}

// ========================================
//  ЗАПУСК
// ========================================

document.addEventListener('DOMContentLoaded', initialize);

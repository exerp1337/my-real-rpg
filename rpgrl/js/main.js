//  ГЛАВНЫЙ ФАЙЛ - ТОЧКА ВХОДА

import { 
    restoreSession, loginUser, registerUser, logoutUser, train, checkSleepTime, 
    completeQuest, resetProgress, openChest, addGoal, updateGoalProgress, 
    setGoalComplete, deleteGoal, completeSocialQuest, completeRandomQuest,
    startRandomQuest, spinRoulette, completeWeeklyChallenge, saveSleepSchedule
} from './game.js';
import { 
    switchTab, switchAuthTab, updateRewardPreview, showAddGoalModal, closeGoalModal,
    toast 
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
        'sleep-bedtime', 'sleep-wakeup' // Новые элементы
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
    
    if(dom['goal-rarity']) dom['goal-rarity'].addEventListener('change', updateRewardPreview);
    if(dom['goal-stat']) dom['goal-stat'].addEventListener('change', updateRewardPreview);
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
            if (result.error) {
                dom['login-error'].textContent = result.error;
            }
            break;
        }

        case 'register': {
            const result = await registerUser(
                dom['reg-username'].value,
                dom['reg-email'].value,
                dom['reg-password'].value,
                dom['reg-password2'].value
            );
            dom['register-error'].textContent = result.error || '';
            dom['register-success'].textContent = result.success || '';
            if(result.success){
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

        case 'start-random-quest':
            startRandomQuest();
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

        case 'reset-progress':
            resetProgress();
            break;

        case 'complete-weekly':
            completeWeeklyChallenge();
            break;
        
        case 'complete-quest':
            debouncedCompleteQuest(target.dataset.questId);
            break;

        case 'open-chest':
            debouncedOpenChest(target.dataset.tier, parseInt(target.dataset.price, 10));
            break;
        
        case 'spin-roulette':
            spinRoulette();
            break;

        case 'show-goal-modal':
            showAddGoalModal();
            break;
        
        case 'close-goal-modal':
            closeGoalModal();
            break;
        
        case 'add-goal': {
            const newGoal = {
                title: dom['goal-title'].value,
                description: dom['goal-desc'].value,
                target: parseFloat(dom['goal-target'].value),
                unit: dom['goal-unit'].value,
                rarity: dom['goal-rarity'].value,
                stat: dom['goal-stat'].value,
            };
            const result = await addGoal(newGoal);
            if(result.error) toast(result.error, 'error');
            break;
        }

        case 'handle-goal-action': {
            const card = target.closest('.goal-card');
            const index = parseInt(card.dataset.goalIndex, 10);
            const goalAction = target.dataset.goalAction;
            
            if (goalAction === 'progress') {
                const amount = parseInt(target.dataset.amount, 10);
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
//  ТАЙМЕРЫ
// ========================================

function updateTimers() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow - now;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    
    const dailyTimer = document.getElementById('daily-timer');
    if(dailyTimer) dailyTimer.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ========================================
//  ЗАПУСК
// ========================================

document.addEventListener('DOMContentLoaded', initialize);

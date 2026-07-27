// ========================================
//  АВТОРИЗАЦИЯ (вход/регистрация/выход)
// ========================================

import { getUser, createUser, updateUser } from './supabase.js';
import { saveSession, getSession, clearSession } from './session.js';
import { normalizeUserData, toast } from './utils.js';
import { currentUserData, currentUsername, setCurrentUserData, setCurrentUsername } from './state.js'; // нужно добавить сеттеры в state
// Но мы можем просто изменять переменные напрямую, импортировав их, и присваивать им новые значения.
// Чтобы изменения были видны, экспортируем их как let, и в этом модуле будем присваивать.

// Однако в state.js мы экспортировали let переменные, поэтому можем их импортировать и изменять.
// Но в auth.js мы также импортируем функции UI для обновления.
import { 
    updateUI, renderQuests, renderGoals, renderHotbar, renderSocialQuests,
    renderAchievements, renderRouletteResult, renderRandomQuestDisplay, 
    showGameScreen, showAuthScreen, switchTab
} from './ui.js';
import { checkDailyRotation, refreshSocialQuests } from './quests.js';
import { initRoulette } from './chest.js';

// Импортируем переменные состояния, чтобы их изменять
import { currentUserData as stateUserData, currentUsername as stateUsername } from './state.js';

// Для удобства создадим локальные ссылки, но будем изменять экспортированные переменные напрямую
// В ES модулях, если мы импортируем let переменную, мы можем ее изменять, и это отразится на всех импортерах.
// Поэтому в auth.js мы будем делать: 
// import { currentUserData, currentUsername } from './state.js';
// и затем присваивать currentUserData = newData; и т.д.

// Но нужно убедиться, что мы не переопределяем import, а изменяем переменную.

export async function registerUser() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;
    const errorEl = document.getElementById('register-error');
    const successEl = document.getElementById('register-success');

    errorEl.textContent = '';
    successEl.textContent = '';

    if (!username || username.length < 2) {
        errorEl.textContent = '❌ Имя минимум 2 символа!';
        return;
    }
    if (!password || password.length < 4) {
        errorEl.textContent = '❌ Пароль минимум 4 символа!';
        return;
    }
    if (password !== password2) {
        errorEl.textContent = '❌ Пароли не совпадают!';
        return;
    }

    try {
        const existing = await getUser(username);
        if (existing) {
            errorEl.textContent = '❌ Пользователь уже существует!';
            return;
        }
        const newUser = await createUser(username, password, email);
        if (newUser) {
            successEl.textContent = '✅ Аккаунт создан! Теперь войдите.';
            document.getElementById('reg-username').value = '';
            document.getElementById('reg-email').value = '';
            document.getElementById('reg-password').value = '';
            document.getElementById('reg-password2').value = '';
            setTimeout(() => {
                switchAuthTab('login');
                document.getElementById('login-username').value = username;
                document.getElementById('login-error').textContent = '✅ Аккаунт создан! Войдите.';
            }, 800);
        } else {
            errorEl.textContent = '❌ Ошибка создания.';
        }
    } catch (e) {
        errorEl.textContent = '❌ Ошибка: ' + e.message;
    }
}

export async function loginUser() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    if (!username || !password) {
        errorEl.textContent = '❌ Введите имя и пароль!';
        return;
    }

    try {
        const user = await getUser(username);
        if (!user) {
            errorEl.textContent = '❌ Пользователь не найден!';
            return;
        }
        if (user.password !== password) {
            errorEl.textContent = '❌ Неверный пароль!';
            return;
        }
        
        // Обновляем глобальное состояние
        import { currentUserData, currentUsername } from './state.js';
        currentUsername = username;
        currentUserData = normalizeUserData(user);
        saveSession(username);
        
        showGameScreen();
        document.getElementById('user-nick').textContent = username;
        await checkDailyRotation();
        await refreshSocialQuests();
        updateUI();
        renderQuests();
        renderGoals();
        renderHotbar();
        renderSocialQuests();
        renderAchievements();
        renderRouletteResult('');
        renderRandomQuestDisplay();
        toast('✅ Добро пожаловать, ' + username + '!', 'success');
    } catch (e) {
        errorEl.textContent = '❌ Ошибка: ' + e.message;
    }
}

export function logoutUser() {
    if (confirm('Выйти из аккаунта?')) {
        import { currentUserData, currentUsername } from './state.js';
        currentUsername = null;
        currentUserData = null;
        clearSession();
        showAuthScreen();
        toast('👋 До встречи!', 'info');
    }
}

export function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(el => el.classList.remove('active'));
    if (tab === 'login') {
        document.getElementById('login-tab').classList.add('active');
        document.getElementById('login-form').classList.add('active');
        document.getElementById('register-error').textContent = '';
        document.getElementById('register-success').textContent = '';
    } else {
        document.getElementById('register-tab').classList.add('active');
        document.getElementById('register-form').classList.add('active');
        document.getElementById('login-error').textContent = '';
    }
}

export function showAuthScreen() {
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('game-container').classList.remove('active');
}

export function showGameScreen() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('game-container').classList.add('active');
}

export async function restoreSession() {
    const session = getSession();
    if (!session || !session.username) {
        showAuthScreen();
        return false;
    }

    try {
        const user = await getUser(session.username);
        if (!user) {
            clearSession();
            showAuthScreen();
            return false;
        }

        import { currentUserData, currentUsername } from './state.js';
        currentUsername = session.username;
        currentUserData = normalizeUserData(user);
        showGameScreen();
        document.getElementById('user-nick').textContent = currentUsername;
        await checkDailyRotation();
        await refreshSocialQuests();
        updateUI();
        renderQuests();
        renderGoals();
        renderHotbar();
        renderSocialQuests();
        renderAchievements();
        renderRouletteResult('');
        renderRandomQuestDisplay();
        initRoulette();
        toast('🔁 Сессия восстановлена', 'info');
        return true;
    } catch (e) {
        console.error('Session restore error:', e);
        clearSession();
        showAuthScreen();
        return false;
    }
}
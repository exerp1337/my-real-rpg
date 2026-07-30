import { state, normalizeUserData, getUser, createUser, saveSession, getSession, clearSession, saveUserData } from './state.js';
import { cacheDOM, elements, toast, showAuthScreen, showGameScreen, switchAuthTab, switchTab } from './ui.js';
import { debounce } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    cacheDOM();
    setupEventListeners();
    
    // Setup Theme
    const themeBtn = document.getElementById('theme-toggle');
    if(themeBtn) {
        themeBtn.addEventListener('click', () => {
            const isDark = document.body.classList.contains('dark');
            applyTheme(isDark ? 'light' : 'dark');
        });
    }
    applyTheme(localStorage.getItem('rpg_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

    const session = getSession();
    if (session && session.username) {
        try {
            const user = await getUser(session.username);
            if (user) {
                state.currentUsername = session.username;
                state.currentUserData = normalizeUserData(user);
                showGameScreen();
                if(elements.userNick) elements.userNick.textContent = session.username;
                updateUI();
                toast('🔁 Сессия восстановлена', 'info');
            } else { showAuthScreen(); }
        } catch(e) { showAuthScreen(); }
    } else {
        showAuthScreen();
    }
});

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark');
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark');
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = '🌙';
    }
    localStorage.setItem('rpg_theme', theme);
}

function setupEventListeners() {
    // Auth switching
    if(elements.authTabs) {
        elements.authTabs.addEventListener('click', (e) => {
            if(e.target.classList.contains('auth-tab')) switchAuthTab(e.target.dataset.tab);
        });
    }
    document.querySelectorAll('.tab-switch').forEach(el => {
        el.addEventListener('click', (e) => switchAuthTab(e.target.dataset.tab));
    });

    // Auth actions
    const btnLogin = document.getElementById('btn-login');
    if(btnLogin) btnLogin.addEventListener('click', handleLogin);
    
    const btnReg = document.getElementById('btn-register');
    if(btnReg) btnReg.addEventListener('click', handleRegister);

    // Logout
    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) btnLogout.addEventListener('click', handleLogout);

    // Main Tabs (Delegation)
    if(elements.mainTabs) {
        elements.mainTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('.tab-btn');
            if(btn && btn.dataset.target) switchTab(btn.dataset.target);
        });
    }
    
    document.querySelectorAll('.hotbar-all-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.targetTab));
    });

    // Sleep Settings Toggle
    if(elements.btnSleepSettings) {
        elements.btnSleepSettings.addEventListener('click', () => {
            const isHidden = elements.sleepSettingsPanel.style.display === 'none';
            elements.sleepSettingsPanel.style.display = isHidden ? 'block' : 'none';
            if (isHidden && state.currentUserData) {
                elements.inputBedtime.value = state.currentUserData.stats.target_bedtime || '23:00';
            }
        });
    }

    // Save Sleep Settings
    if(elements.btnSaveSleep) {
        elements.btnSaveSleep.addEventListener('click', async () => {
            if(!state.currentUserData) return;
            const newBedtime = elements.inputBedtime.value;
            if(!newBedtime) return;
            state.currentUserData.stats.target_bedtime = newBedtime;
            await saveUserData();
            elements.sleepSettingsPanel.style.display = 'none';
            updateUI();
            toast('Настройки сна сохранены!', 'success');
        });
    }

    // Game Actions
    if(elements.sleepActionBtn) elements.sleepActionBtn.addEventListener('click', debounce(handleSleep, 500));
}

async function handleLogin() {
    const username = elements.loginUsername.value.trim();
    const password = elements.loginPassword.value;
    if(elements.loginError) elements.loginError.textContent = '';

    if (!username || !password) { 
        if(elements.loginError) elements.loginError.textContent = '❌ Введите имя и пароль!'; 
        return; 
    }

    try {
        const user = await getUser(username);
        if (!user || user.password !== password) { 
            if(elements.loginError) elements.loginError.textContent = '❌ Неверное имя или пароль!'; 
            return; 
        }
        
        state.currentUsername = username;
        state.currentUserData = normalizeUserData(user);
        saveSession(username);
        
        showGameScreen();
        if(elements.userNick) elements.userNick.textContent = username;
        updateUI();
        toast('✅ Добро пожаловать, ' + username + '!', 'success');
    } catch (e) { 
        if(elements.loginError) elements.loginError.textContent = '❌ Ошибка: ' + e.message; 
    }
}

async function handleRegister() {
    const username = elements.regUsername.value.trim();
    const email = elements.regEmail.value.trim();
    const password = elements.regPassword.value;
    const password2 = elements.regPassword2.value;
    
    if(elements.regError) elements.regError.textContent = ''; 
    if(elements.regSuccess) elements.regSuccess.textContent = '';
    
    if (!username || username.length < 2) { if(elements.regError) elements.regError.textContent = '❌ Имя минимум 2 символа!'; return; }
    if (!password || password.length < 4) { if(elements.regError) elements.regError.textContent = '❌ Пароль минимум 4 символа!'; return; }
    if (password !== password2) { if(elements.regError) elements.regError.textContent = '❌ Пароли не совпадают!'; return; }

    try {
        const existing = await getUser(username);
        if (existing) { if(elements.regError) elements.regError.textContent = '❌ Пользователь уже существует!'; return; }
        const newUser = await createUser(username, password, email);
        if (newUser) {
            if(elements.regSuccess) elements.regSuccess.textContent = '✅ Аккаунт создан! Теперь войдите.';
            setTimeout(() => {
                switchAuthTab('login');
                elements.loginUsername.value = username;
            }, 800);
        } else {
            if(elements.regError) elements.regError.textContent = '❌ Ошибка создания.';
        }
    } catch (e) { if(elements.regError) elements.regError.textContent = '❌ Ошибка: ' + e.message; }
}

function handleLogout() {
    if (confirm('Выйти из аккаунта?')) {
        state.currentUsername = null;
        state.currentUserData = null;
        clearSession();
        showAuthScreen();
        toast('👋 До встречи!', 'info');
    }
}

// НОВАЯ МЕХАНИКА СНА (Учитывающая кастомный график)
async function handleSleep() {
    if (!state.currentUserData) return;
    const today = new Date().toDateString();
    
    if (state.currentUserData.last_sleep_date === today) { 
        toast('💤 Вы уже отметили сон сегодня!', 'info'); 
        return; 
    }
    
    const bedtime = state.currentUserData.stats.target_bedtime || "23:00";
    const [targetH, targetM] = bedtime.split(':').map(Number);
    
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const targetMins = targetH * 60 + targetM;
    
    // Вычисляем разницу с учетом перехода через полночь
    let diff = currentMins - targetMins;
    if (diff < -12 * 60) diff += 24 * 60;
    if (diff > 12 * 60) diff -= 24 * 60;
    
    // Если легли спать более чем на 60 минут позже желаемого времени - штраф
    if (diff > 60) {
        state.currentUserData.stats.per = Math.max(0, (state.currentUserData.stats.per || 0) - 10);
        toast(`⚠️ Вы легли слишком поздно (цель: ${bedtime})! -10 Дисциплина.`, 'error');
    } else {
        state.currentUserData.stats.per = (state.currentUserData.stats.per || 0) + 10;
        state.currentUserData.stats.gold = (state.currentUserData.stats.gold || 0) + 15;
        toast('🏆 Отличный режим! +10 Дисциплина / +15 🪙', 'success');
    }
    
    state.currentUserData.last_sleep_date = today;
    await saveUserData();
    updateUI();
}

function updateUI() {
    if (!state.currentUserData) return;
    const stats = state.currentUserData.stats;
    
    // Update bedtime display
    if (elements.displayBedtime && stats.target_bedtime) {
        elements.displayBedtime.textContent = stats.target_bedtime;
    }
    
    // Update Sleep Button state
    if (elements.sleepActionBtn) {
        if (state.currentUserData.last_sleep_date === new Date().toDateString()) {
            elements.sleepActionBtn.style.background = '#2c2c2e';
            elements.sleepActionBtn.style.opacity = '0.4';
            elements.sleepActionBtn.textContent = '💤 Отмечено';
        } else {
            elements.sleepActionBtn.style.background = 'var(--accent)';
            elements.sleepActionBtn.style.opacity = '1';
            elements.sleepActionBtn.textContent = '🛌 ЛЕЧЬ СПАТЬ';
        }
    }
    
    const goldEl = document.getElementById('gold-val');
    if (goldEl) goldEl.textContent = stats.gold || 0;
}

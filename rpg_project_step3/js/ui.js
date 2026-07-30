export const elements = {};

export function cacheDOM() {
    elements.authScreen = document.getElementById('auth-screen');
    elements.gameContainer = document.getElementById('game-container');
    elements.toastContainer = document.getElementById('toast-container');
    elements.screensWrapper = document.getElementById('screens-wrapper');
    elements.mainTabs = document.getElementById('main-tabs');
    elements.authTabs = document.getElementById('auth-tabs');
    
    // Auth inputs
    elements.loginUsername = document.getElementById('login-username');
    elements.loginPassword = document.getElementById('login-password');
    elements.loginError = document.getElementById('login-error');
    elements.regUsername = document.getElementById('reg-username');
    elements.regEmail = document.getElementById('reg-email');
    elements.regPassword = document.getElementById('reg-password');
    elements.regPassword2 = document.getElementById('reg-password2');
    elements.regError = document.getElementById('register-error');
    elements.regSuccess = document.getElementById('register-success');
    
    // Custom UI
    elements.userNick = document.getElementById('user-nick');
    
    // Sleep UI
    elements.btnSleepSettings = document.getElementById('btn-sleep-settings');
    elements.sleepSettingsPanel = document.getElementById('sleep-settings-panel');
    elements.inputBedtime = document.getElementById('input-bedtime');
    elements.btnSaveSleep = document.getElementById('btn-save-sleep');
    elements.displayBedtime = document.getElementById('display-bedtime');
    elements.sleepActionBtn = document.getElementById('sleep-action-btn');
}

// Продвинутая система очередей Toast уведомлений
export function toast(message, type = 'info') {
    if (!elements.toastContainer) return;
    
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.textContent = message;
    elements.toastContainer.appendChild(toastEl);
    
    // Автоматическое удаление с анимацией
    setTimeout(() => {
        toastEl.classList.add('hiding');
        setTimeout(() => {
            if (toastEl.parentNode) toastEl.remove();
        }, 400); // Ожидание завершения CSS transition
    }, 3500);

    // Поддержание визуального порядка (не более 5 уведомлений на экране)
    while (elements.toastContainer.children.length > 5) {
        const oldest = elements.toastContainer.firstElementChild;
        oldest.classList.add('hiding');
        setTimeout(() => { if (oldest.parentNode) oldest.remove(); }, 400);
    }
}

export function showAuthScreen() {
    if(elements.authScreen) elements.authScreen.style.display = 'flex';
    if(elements.gameContainer) elements.gameContainer.classList.remove('active');
}

export function showGameScreen() {
    if(elements.authScreen) elements.authScreen.style.display = 'none';
    if(elements.gameContainer) elements.gameContainer.classList.add('active');
}

export function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(el => el.classList.remove('active'));
    if (tab === 'login') {
        document.getElementById('login-tab').classList.add('active');
        document.getElementById('login-form').classList.add('active');
        if(elements.regError) elements.regError.textContent = '';
        if(elements.regSuccess) elements.regSuccess.textContent = '';
    } else {
        document.getElementById('register-tab').classList.add('active');
        document.getElementById('register-form').classList.add('active');
        if(elements.loginError) elements.loginError.textContent = '';
    }
}

export function switchTab(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        if(b.dataset.target === id) b.classList.add('active');
    });
    const targetScreen = document.getElementById(id);
    if(targetScreen) targetScreen.classList.add('active');
}

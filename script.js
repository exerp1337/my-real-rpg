const SUPABASE_URL = 'https://zjtudyoffdwqfamzczcb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqdHVkeW9mZmR3cWZhbXpjemNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTYxMDMsImV4cCI6MjEwMDE5MjEwM30.yO-fyi_hZv__XqMjz-OpuYNPAlKyaGT7KB4xscqHMNo';
const TABLE_NAME = 'players';
const SESSION_KEY = 'grit_session';

let currentUserData = null;
let currentUsername = null;
let activeTimers = {};
let currentTimeFilter = 'any';
let editingHabitId = null; 

// Focus Timer State
let focusInterval = null;
let focusTimeLeft = 0;
let currentFocusHabit = null;

// ========================================
// HAPTICS & SOUND
// ========================================
function triggerFeedback() {
    if (navigator.vibrate) navigator.vibrate(50);
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
    } catch(e) {}
}

// ========================================
// SUPABASE & DATA NORMALIZATION
// ========================================

async function supabaseRequest(method, endpoint, body = null) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}

async function getUser(username) {
    const res = await supabaseRequest('GET', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`);
    return res && res.length > 0 ? res[0] : null;
}

const defaultHabits = [
    { id: Date.now(), title: 'Take Breaks', emoji: '⏳', type: 'counter', target: 3, current: 0, streak: -1, color: 'blue', isRunning: false, lastUpdated: '', schedule: { type: 'everyday' }, timeOfDay: 'any', history: {} },
    { id: Date.now()+1, title: 'Deep Work', emoji: '👨‍💻', type: 'timer', target: 60, current: 0, streak: -1, color: 'green', isRunning: false, lastUpdated: '', schedule: { type: 'everyday' }, timeOfDay: 'any', history: {} },
    { id: Date.now()+2, title: 'Plan Tomorrow', emoji: '📋', type: 'checkbox', target: 1, current: 0, streak: -1, color: 'orange', lastUpdated: '', schedule: { type: 'everyday' }, timeOfDay: 'any', history: {} },
    { id: Date.now()+3, title: 'Make Your Bed', emoji: '🛏️', type: 'checkbox', target: 1, current: 0, streak: -1, color: 'purple', lastUpdated: '', schedule: { type: 'everyday' }, timeOfDay: 'morning', history: {} },
    { id: Date.now()+4, title: 'Wake Up on Time', emoji: '🌞', type: 'checkbox', target: 1, current: 0, streak: -1, color: 'orange', lastUpdated: '', schedule: { type: 'everyday' }, timeOfDay: 'morning', history: {} }
];

async function createUser(username, password) {
    const newUser = {
        username, password, xp: 0, streak_freezes: 2,
        stats: { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0 },
        settings: { target_bedtime: "23:00", target_wakeup: "08:30" },
        habits: JSON.parse(JSON.stringify(defaultHabits)),
        social: { level: 1, xp: 0, currentQuest: null, lastCycle: null, isCompleted: false },
        gym: { 
            workouts: [], 
            prs: { 'Приседания со штангой': 0, 'Жим лежа': 0, 'Становая тяга': 0 },
            availableExercises: ['Приседания со штангой', 'Жим лежа', 'Становая тяга'] 
        }
    };
    const res = await supabaseRequest('POST', TABLE_NAME, newUser);
    return res && res.length > 0 ? res[0] : null;
}

async function updateUser(username, data) {
    return await supabaseRequest('PATCH', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`, data);
}

function normalizeData(user) {
    if (typeof user.habits === 'string') { try { user.habits = JSON.parse(user.habits); } catch(e) { user.habits = []; } }
    if (!Array.isArray(user.habits) || user.habits.length === 0) { user.habits = JSON.parse(JSON.stringify(defaultHabits)); }

    user.habits.forEach(h => {
        if (!h.schedule) h.schedule = { type: 'everyday' };
        if (!h.timeOfDay) h.timeOfDay = 'any';
        if (!h.history) h.history = {};
        if (h.type === 'checklist' && !h.subtasks) h.subtasks = [];
    });
    
    if (typeof user.settings === 'string') { try { user.settings = JSON.parse(user.settings); } catch(e) { user.settings = null; } }
    if (!user.settings) user.settings = { target_bedtime: "23:00", target_wakeup: "08:30" };

    if (typeof user.social === 'string') { try { user.social = JSON.parse(user.social); } catch(e) { user.social = null; } }
    if (!user.social) user.social = { level: 1, xp: 0, currentQuest: null, lastCycle: null, isCompleted: false };
    
    if (user.social.lastCycle === undefined) {
        user.social.lastCycle = user.social.lastWeek || null;
        delete user.social.lastWeek;
    }

    if (typeof user.stats === 'string') { try { user.stats = JSON.parse(user.stats); } catch(e) { user.stats = null; } }
    if (!user.stats) user.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0 };

    if (typeof user.gym === 'string') { try { user.gym = JSON.parse(user.gym); } catch(e) { user.gym = null; } }
    if (!user.gym) {
        user.gym = { workouts: [], prs: { 'Приседания со штангой': 0, 'Жим лежа': 0, 'Становая тяга': 0 }, availableExercises: ['Приседания со штангой', 'Жим лежа', 'Становая тяга'] };
    }
    
    // Normalize new custom exercises structures
    if(!user.gym.availableExercises) {
        user.gym.availableExercises = ['Приседания со штангой', 'Жим лежа', 'Становая тяга'];
    }
    
    // Map existing english prs to russian if any exist and initialize missing
    user.gym.availableExercises.forEach(ex => {
        if(user.gym.prs[ex] === undefined) user.gym.prs[ex] = 0;
    });

    if (user.streak_freezes === undefined || user.streak_freezes === null) user.streak_freezes = 2;
    if (!user.xp) user.xp = 0;
    
    return user;
}

// ========================================
// AUTH & APP INIT
// ========================================
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(e => e.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
}

async function registerUser() {
    const username = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value;
    const err = document.getElementById('register-error');
    err.textContent = '';
    if (username.length < 2 || pass.length < 4) return err.textContent = 'Invalid username/pass length.';
    try {
        if (await getUser(username)) return err.textContent = 'User exists!';
        await createUser(username, pass);
        document.getElementById('register-success').textContent = 'Account created!';
        setTimeout(() => { switchAuthTab('login'); document.getElementById('login-username').value = username; }, 1000);
    } catch (e) { err.textContent = 'Error creating account.'; }
}

async function loginUser() {
    const username = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    err.textContent = '';
    try {
        const user = await getUser(username);
        if (!user || user.password !== pass) return err.textContent = 'Invalid credentials!';
        currentUsername = username;
        currentUserData = normalizeData(user);
        localStorage.setItem(SESSION_KEY, username);
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-container').classList.add('active');
        initApp();
    } catch (e) { err.textContent = 'Login failed. Check console.'; console.error(e); }
}

function logoutUser() {
    currentUsername = null; currentUserData = null; localStorage.removeItem(SESSION_KEY);
    document.getElementById('app-container').classList.remove('active');
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('login-password').value = '';
    Object.values(activeTimers).forEach(clearInterval); activeTimers = {};
}

function initApp() {
    initSocialData(); checkNewDay(); renderCalendar(); renderHabits(); renderSocialQuest(); updateStatsUI();
    document.getElementById('setting-bedtime').value = currentUserData.settings.target_bedtime;
    document.getElementById('setting-wakeup').value = currentUserData.settings.target_wakeup;
}

function toast(msg) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2000);
}

window.switchTab = function(tab, title) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById('main-header-title').textContent = title;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`${tab}-screen`).classList.add('active');
    if (tab === 'stats') { 
        updateStatsUI(); 
        renderHeatmap(); 
        populateGymHistorySelect();
    }
};

window.filterTime = function(time) {
    currentTimeFilter = time;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.time-btn[data-time="${time}"]`).classList.add('active');
    renderHabits();
};

function getTodayString() {
    const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function isHabitActiveToday(habit, dateObj = new Date()) {
    const dayOfWeek = dateObj.getDay(); 
    const type = habit.schedule.type;
    if (type === 'everyday') return true;
    if (type === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
    return true;
}

function checkNewDay() {
    const todayStr = getTodayString();
    let needsSave = false;
    currentUserData.habits.forEach(h => {
        if (h.lastUpdated !== todayStr) {
            if (h.current < h.target && h.lastUpdated !== '') {
                if (currentUserData.streak_freezes > 0) {
                    currentUserData.streak_freezes--; toast(`❄️ Streak frozen for: ${h.title}`);
                } else { h.streak = -1; }
            }
            h.current = 0; h.isRunning = false;
            if(h.type === 'checklist' && h.subtasks) h.subtasks.forEach(s => s.done = false);
            h.lastUpdated = todayStr; needsSave = true;
        }
    });
    if (needsSave) saveData();
}

function renderCalendar() {
    const strip = document.getElementById('calendar-strip'); strip.innerHTML = '';
    const today = new Date(); const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = -3; i <= 3; i++) {
        const d = new Date(today); d.setDate(d.getDate() + i);
        const el = document.createElement('div'); el.className = `cal-day ${i === 0 ? 'active' : ''}`;
        el.innerHTML = `<span>${days[d.getDay()]}</span><span class="date">${d.getDate()}</span>`;
        strip.appendChild(el);
    }
}

// ========================================
// SOCIAL SYSTEM (CHARISMA) - 3-DAY CYCLE
// ========================================
const socialQuestsDB = [
    // Tier 1 (Lvl 1-3) | +35 XP
    { id: 'sq_1_1', minLvl: 1, maxLvl: 3, xp: 35, emoji: '👋', title: 'Микро-контакт', desc: 'Улыбнуться и поздороваться с администратором зала, охранником или соседом в лифте.' },
    { id: 'sq_1_2', minLvl: 1, maxLvl: 3, xp: 35, emoji: '☕', title: 'Позитивный вайб', desc: 'Искренне пожелать хорошего дня кассиру, баристе или курьеру.' },
    { id: 'sq_1_3', minLvl: 1, maxLvl: 3, xp: 35, emoji: '🎧', title: 'Вежливость в движении', desc: 'Попросить уступить дорогу или пропустить с искренним «спасибо» вместо молчаливого обхода.' },
    { id: 'sq_1_4', minLvl: 1, maxLvl: 3, xp: 35, emoji: '👍', title: 'Фидбек в сети', desc: 'Отправить поддерживающий комментарий автору полезного контента или разработчику проекта.' },
    { id: 'sq_1_5', minLvl: 1, maxLvl: 3, xp: 35, emoji: '👀', title: 'Визуальный контакт', desc: 'В процессе разговора (при покупке) удержать доброжелательный зрительный контакт на пару секунд дольше обычного.' },

    // Tier 2 (Lvl 4-6) | +70 XP
    { id: 'sq_2_1', minLvl: 4, maxLvl: 6, xp: 70, emoji: '🏋️', title: 'Small-talk в зале', desc: 'Попросить подстраховать на подходе или спросить, сколько подходов осталось, и перекинуться пару фраз.' },
    { id: 'sq_2_2', minLvl: 4, maxLvl: 6, xp: 70, emoji: '♟️', title: 'GG WP', desc: 'Написать оппоненту/тиммейту в чате после хорошего матча, отметив конкретный сильный мув.' },
    { id: 'sq_2_3', minLvl: 4, maxLvl: 6, xp: 70, emoji: '🤝', title: 'Признание заслуг', desc: 'Сделать искренний комплимент навыкам коллеги, знакомого или парня в зале.' },
    { id: 'sq_2_4', minLvl: 4, maxLvl: 6, xp: 70, emoji: '❓', title: 'Быстрый совет', desc: 'Спросить у знакомого или коллеги рекомендацию по его теме.' },
    { id: 'sq_2_5', minLvl: 4, maxLvl: 6, xp: 70, emoji: '📦', title: 'Ситуативный вопрос', desc: 'Задать уточняющий вопрос консультанту или мастеру, выйдя за рамки стандартного скрипта.' },

    // Tier 3 (Lvl 7-10) | +130 XP
    { id: 'sq_3_1', minLvl: 7, maxLvl: 10, xp: 130, emoji: '👂', title: 'Активное слушание', desc: 'Задать открытый вопрос знакомому о его увлечении и с интересом выслушать 2–3 минуты.' },
    { id: 'sq_3_2', minLvl: 7, maxLvl: 10, xp: 130, emoji: '🔄', title: 'Разрыв шаблона', desc: 'Начать неформальный разговор на абстрактную тему с тем, с кем раньше только здоровался.' },
    { id: 'sq_3_3', minLvl: 7, maxLvl: 10, xp: 130, emoji: '💬', title: 'Мост из прошлого', desc: 'Написать старому другу/знакомому без конкретного дела («Вспомнил про тебя, как дела?»).' },
    { id: 'sq_3_4', minLvl: 7, maxLvl: 10, xp: 130, emoji: '🧠', title: 'Смена роли', desc: 'Спросить развернутое мнение человека по вопросу, в котором он считает себя экспертом.' },
    { id: 'sq_3_5', minLvl: 7, maxLvl: 10, xp: 130, emoji: '🎯', title: 'Комплимент выбору', desc: 'Сделать редкий комплимент решению человека (вкусу в музыке, выбору экипировки).' },

    // Tier 4 (Lvl 11-15) | +220 XP
    { id: 'sq_4_1', minLvl: 11, maxLvl: 15, xp: 220, emoji: '🍕', title: 'Инициатор', desc: 'Предложить коллеге или знакомому выпить кофе или перекусить вместе.' },
    { id: 'sq_4_2', minLvl: 11, maxLvl: 15, xp: 220, emoji: '🌐', title: 'Расширение сети', desc: 'Начать диалог и познакомиться с новым человеком в общей компании или на ивенте.' },
    { id: 'sq_4_3', minLvl: 11, maxLvl: 15, xp: 220, emoji: '🎉', title: 'Мини-организатор', desc: 'Собрать 2–3 человек на совместную активность (настолки, зал, новая кофейня).' },
    { id: 'sq_4_4', minLvl: 11, maxLvl: 15, xp: 220, emoji: '🛡️', title: 'Социальный буст', desc: 'Заметить скромного человека в компании и задать удобный вопрос, чтобы втянуть в разговор.' },
    { id: 'sq_4_5', minLvl: 11, maxLvl: 15, xp: 220, emoji: '🚀', title: 'Смелый шаг', desc: 'Первым завести диалог в месте своих интересов с целью познакомиться.' },

    // Tier 5 (Lvl 16+) | +400 XP
    { id: 'sq_5_1', minLvl: 16, maxLvl: 999, xp: 400, emoji: '🎤', title: 'Публичный питчинг', desc: 'Рассказать о своем пет-проекте или концепции перед группой людей, отвечая на вопросы.' },
    { id: 'sq_5_2', minLvl: 16, maxLvl: 999, xp: 400, emoji: '🏋️', title: 'Спортивный нетворк', desc: 'Договориться о совместной тяжелой тренировке по пауэрлифтингу с опытными атлетами.' },
    { id: 'sq_5_3', minLvl: 16, maxLvl: 999, xp: 400, emoji: '🤝', title: 'Медиатор', desc: 'Выступить миротворцем в конфликтной ситуации, переведя эмоции в конструктивное русло.' },
    { id: 'sq_5_4', minLvl: 16, maxLvl: 999, xp: 400, emoji: '🎮', title: 'Создатель комьюнити', desc: 'Инициировать сбор группы людей по интересам (Discord-сервер, турнир) и стать лидером.' },
    { id: 'sq_5_5', minLvl: 16, maxLvl: 999, xp: 400, emoji: '❤️', title: 'Осознанная уязвимость', desc: 'Инициировать честный разговор на глубоко личную тему с близким человеком.' }
];

function getRequiredCharismaXP(level) { 
    return Math.floor(100 * Math.pow(level, 1.3)); 
}

function getCurrentCycleString() {
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const cycleNo = Math.floor(daysSinceEpoch / 3); // 3-day cycle
    return `Cycle-${cycleNo}`;
}

function initSocialData() {
    const currentCycle = getCurrentCycleString();
    if (currentUserData.social.lastCycle !== currentCycle) {
        const userLvl = currentUserData.social.level;
        const availableQuests = socialQuestsDB.filter(q => userLvl >= q.minLvl && userLvl <= q.maxLvl);
        currentUserData.social.currentQuest = availableQuests[Math.floor(Math.random() * availableQuests.length)];
        currentUserData.social.isCompleted = false; 
        currentUserData.social.lastCycle = currentCycle;
        saveData(); 
    }
}

function renderSocialQuest() {
    const container = document.getElementById('weekly-social-container');
    if (!container) return;
    const socData = currentUserData.social;
    if (socData.isCompleted || !socData.currentQuest) { container.innerHTML = ''; return; }
    const q = socData.currentQuest;
    container.innerHTML = `
        <div class="social-quest-card">
            <div class="habit-icon" style="text-shadow: 0 0 12px var(--color-purple-accent);">${q.emoji}</div>
            <div class="habit-info">
                <div class="social-badge">3-Day Social Quest</div>
                <div class="habit-title">${q.title}</div>
                <div class="habit-desc">${q.desc}</div>
                <div class="social-reward">+${q.xp} Charisma XP</div>
            </div>
            <button class="habit-action card-purple" onclick="completeWeeklySocial()" style="background: rgba(191, 90, 242, 0.2); border: 1px solid var(--color-purple-accent);">
                <i class="ph-bold ph-check"></i>
            </button>
        </div>
    `;
}

window.completeWeeklySocial = function() {
    triggerFeedback(); 
    const socData = currentUserData.social; const q = socData.currentQuest;
    socData.isCompleted = true; socData.xp += q.xp;
    let reqXP = getRequiredCharismaXP(socData.level); let leveledUp = false;
    while (socData.xp >= reqXP) { socData.xp -= reqXP; socData.level++; reqXP = getRequiredCharismaXP(socData.level); leveledUp = true; }
    saveData(); renderSocialQuest(); updateStatsUI();    
    if (leveledUp) toast(`🎉 Charisma Level Up! You are now Level ${socData.level}!`);
    else toast(`🤝 Social Quest Done! +${q.xp} XP`);
};

// ========================================
// HABITS RENDERING & ACTIONS
// ========================================
function renderHabits() {
    const container = document.getElementById('habits-list'); container.innerHTML = '';
    const activeHabits = currentUserData.habits.filter(h => (currentTimeFilter === 'any' || h.timeOfDay === currentTimeFilter || h.timeOfDay === 'any') && isHabitActiveToday(h));
    if (activeHabits.length === 0) { container.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top: 20px;">No habits for this filter today.</div>`; return; }
    
    activeHabits.forEach(h => {
        const isDone = h.current >= h.target;
        let streakHTML = '';
        if (h.streak > 0) streakHTML = `<div class="streak-badge fire">🔥 ${h.streak}</div>`;
        else if (h.streak < 0) streakHTML = `<div class="streak-badge negative">${h.streak}</div>`;
        else if (h.streak === 0 && currentUserData.streak_freezes > 0) streakHTML = `<div class="streak-badge frozen">❄️ Freeze</div>`;
        
        let desc = h.schedule.type === 'weekdays' ? 'Weekdays' : 'Every day';
        let actionIcon = '<i class="ph ph-plus"></i>'; let btnAction = `incrementHabit(${h.id})`;
        
        if (h.type === 'counter' || h.type === 'checklist') {
            desc += `, ${h.current}/${h.target}`;
        } else if (h.type === 'timer') { 
            if (h.target === 60) {
                desc += `, ${h.current >= 60 ? 1 : 0}/1 hour`;
            } else {
                desc += `, ${h.current}/${h.target} min`; 
            }
            actionIcon = '<i class="ph-fill ph-play"></i>'; 
            btnAction = `openFocusTimer(${h.id})`; 
        }
        
        if (isDone && h.type !== 'timer') { actionIcon = '<i class="ph-bold ph-check"></i>'; btnAction = ''; }

        let subtasksHTML = '';
        if (h.type === 'checklist' && h.subtasks && h.subtasks.length > 0) {
            subtasksHTML = '<div class="subtasks-container">' + h.subtasks.map((st, idx) => `
                <div class="subtask-item ${st.done ? 'done' : ''}" onclick="toggleSubtask(${h.id}, ${idx})">
                    <div class="subtask-checkbox">${st.done ? '<i class="ph-bold ph-check"></i>' : ''}</div>
                    <span>${st.title}</span>
                </div>
            `).join('') + '</div>';
        }

        const card = document.createElement('div'); card.className = `habit-card card-${h.color}`;
        card.innerHTML = `
            ${streakHTML}
            <div style="display:flex; flex-direction:column; width:100%;">
                <div class="habit-card-main">
                    <div class="habit-icon">${h.emoji}</div>
                    <div class="habit-info">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div class="habit-title">${h.title}</div>
                            <button onclick="editHabit(${h.id}); event.stopPropagation();" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:2px;"><i class="ph ph-pencil-simple"></i></button>
                        </div>
                        <div class="habit-desc">${desc}</div>
                    </div>
                    <button class="habit-action ${isDone ? 'done' : ''}" onclick="${btnAction}">${actionIcon}</button>
                </div>
                ${subtasksHTML}
            </div>
        `;
        container.appendChild(card);
    });
}

async function saveData() { await updateUser(currentUsername, currentUserData); }
function updateStreak(h) { h.streak = h.streak < 0 ? 1 : h.streak + 1; }

function claimHabitReward(h) {
    let multiplier = h.streak >= 30 ? 2.0 : (h.streak >= 7 ? 1.5 : (h.streak >= 3 ? 1.2 : 1.0));
    const totalXP = Math.floor(15 * multiplier); currentUserData.xp += totalXP;
    
    const s = currentUserData.stats;
    if (h.color === 'green') { s.int += 2; s.per += 1; }
    else if (h.color === 'purple') { s.per += 3; }
    else if (h.color === 'orange') { s.str += 2; s.end += 1; }
    else if (h.color === 'blue') { s.int += 1; s.agi += 2; }
    
    const todayStr = getTodayString(); h.history[todayStr] = { completed: true, insight: "" };
    toast(`+${totalXP} XP${multiplier > 1.0 ? ` (Combo x${multiplier}!)` : ''} | ${h.title}`);
    setTimeout(() => openInsightModal(h.id), 500);
}

window.incrementHabit = function(id) {
    const h = currentUserData.habits.find(x => x.id === id);
    if (!h || h.current >= h.target) return;
    triggerFeedback(); h.current += 1;
    if (h.current === h.target) { updateStreak(h); claimHabitReward(h); }
    renderHabits(); saveData();
};

window.toggleSubtask = function(habitId, subtaskIdx) {
    const h = currentUserData.habits.find(x => x.id === habitId);
    if (!h || h.current >= h.target) return; 
    h.subtasks[subtaskIdx].done = !h.subtasks[subtaskIdx].done; triggerFeedback();
    h.current = h.subtasks.filter(x => x.done).length;
    if (h.current >= h.target) { updateStreak(h); claimHabitReward(h); }
    saveData(); renderHabits();
};

// ========================================
// EMOJI PICKER & ADD/EDIT MODAL
// ========================================

window.selectEmoji = function(emoji, el) {
    document.querySelectorAll('.emoji-option').forEach(opt => opt.classList.remove('active'));
    if (el) el.classList.add('active');
    document.getElementById('habit-emoji').value = emoji;
};

window.clearEmojiSelection = function() {
    document.querySelectorAll('.emoji-option').forEach(opt => opt.classList.remove('active'));
};

window.addHabitModal = function() {
    editingHabitId = null;
    document.querySelector('.modal h2').textContent = 'New Habit';
    document.getElementById('habit-title').value = '';
    document.getElementById('habit-emoji').value = '';
    document.getElementById('habit-target').value = '';
    document.getElementById('habit-subtasks').value = '';
    
    clearEmojiSelection();
    document.getElementById('add-habit-modal').classList.add('active');
    
    document.getElementById('habit-type').onchange = (e) => {
        const tw = document.getElementById('target-wrapper');
        const sw = document.getElementById('subtasks-wrapper');
        if (e.target.value === 'checkbox') { tw.style.display = 'none'; sw.style.display = 'none'; } 
        else if (e.target.value === 'checklist') { tw.style.display = 'none'; sw.style.display = 'block'; } 
        else {
            tw.style.display = 'block'; sw.style.display = 'none';
            document.getElementById('habit-target').placeholder = e.target.value === 'timer' ? 'Minutes (e.g., 60)' : 'Amount (e.g., 3)';
        }
    };
    document.getElementById('habit-type').dispatchEvent(new Event('change'));
};

window.editHabit = function(id) {
    const h = currentUserData.habits.find(x => x.id === id);
    if (!h) return;
    editingHabitId = id;

    document.querySelector('.modal h2').textContent = 'Edit Habit';
    document.getElementById('habit-title').value = h.title;
    document.getElementById('habit-emoji').value = h.emoji;
    document.getElementById('habit-type').value = h.type;
    document.getElementById('habit-schedule').value = h.schedule.type;
    document.getElementById('habit-time').value = h.timeOfDay;
    document.getElementById('habit-color').value = h.color;

    if (h.type === 'checklist' && h.subtasks) {
        document.getElementById('habit-subtasks').value = h.subtasks.map(s => s.title).join('\n');
    } else {
        document.getElementById('habit-target').value = h.target || '';
    }

    clearEmojiSelection();
    document.getElementById('add-habit-modal').classList.add('active');
    
    document.getElementById('habit-type').onchange = (e) => {
        const tw = document.getElementById('target-wrapper');
        const sw = document.getElementById('subtasks-wrapper');
        if (e.target.value === 'checkbox') { tw.style.display = 'none'; sw.style.display = 'none'; } 
        else if (e.target.value === 'checklist') { tw.style.display = 'none'; sw.style.display = 'block'; } 
        else {
            tw.style.display = 'block'; sw.style.display = 'none';
            document.getElementById('habit-target').placeholder = e.target.value === 'timer' ? 'Minutes (e.g., 60)' : 'Amount (e.g., 3)';
        }
    };
    document.getElementById('habit-type').dispatchEvent(new Event('change'));
};

window.saveNewHabit = function() {
    const title = document.getElementById('habit-title').value.trim();
    const emoji = document.getElementById('habit-emoji').value.trim() || '📌';
    const type = document.getElementById('habit-type').value;
    const color = document.getElementById('habit-color').value;
    let target = parseInt(document.getElementById('habit-target').value);
    const scheduleType = document.getElementById('habit-schedule').value;
    const timeOfDay = document.getElementById('habit-time').value;

    if (!title) return toast('Please enter a title');
    
    let subtasks = [];
    if (type === 'checkbox') target = 1;
    if (type === 'checklist') {
        const stText = document.getElementById('habit-subtasks').value.trim();
        if (!stText) return toast('Please enter checklist items');
        
        const oldLines = stText.split('\n').map(s => s.trim()).filter(s => s !== '');
        if (editingHabitId) {
            const existingH = currentUserData.habits.find(x => x.id === editingHabitId);
            subtasks = oldLines.map(line => {
                const existingSt = existingH.subtasks?.find(s => s.title === line);
                return { title: line, done: existingSt ? existingSt.done : false };
            });
        } else {
            subtasks = oldLines.map(s => ({ title: s, done: false }));
        }
        target = subtasks.length;
    }
    if ((type === 'counter' || type === 'timer') && (!target || target <= 0)) return toast('Enter valid target');
    
    if (editingHabitId) {
        const h = currentUserData.habits.find(x => x.id === editingHabitId);
        h.title = title; h.emoji = emoji; h.type = type; h.color = color; h.target = target;
        h.schedule.type = scheduleType; h.timeOfDay = timeOfDay;
        if (type === 'checklist') {
            h.subtasks = subtasks;
            h.current = h.subtasks.filter(s => s.done).length;
        }
        toast('Habit updated!');
    } else {
        const newH = {
            id: Date.now(), title, emoji, type, color, target, current: 0, streak: -1, isRunning: false,
            lastUpdated: getTodayString(), schedule: { type: scheduleType }, timeOfDay: timeOfDay, history: {}
        };
        if (type === 'checklist') newH.subtasks = subtasks;
        currentUserData.habits.push(newH);
        toast('Habit created!');
    }
    
    saveData(); renderHabits();
    document.getElementById('add-habit-modal').classList.remove('active');
};

// ========================================
// FOCUS TIMER (FULLSCREEN)
// ========================================

window.openFocusTimer = function(id) {
    const h = currentUserData.habits.find(x => x.id === id);
    if (!h || h.current >= h.target) return toast('Habit already completed today!');
    
    currentFocusHabit = h; focusTimeLeft = (h.target - h.current) * 60;
    
    document.getElementById('focus-title').textContent = h.title;
    document.getElementById('focus-overlay').style.display = 'flex';
    document.getElementById('focus-play-icon').className = 'ph-fill ph-pause';
    
    updateFocusDisplay(); focusInterval = setInterval(focusTick, 1000);
};

function focusTick() {
    if (focusTimeLeft <= 0) { clearInterval(focusInterval); return completeFocusSession(); }
    focusTimeLeft--; updateFocusDisplay();
    if (focusTimeLeft % 60 === 0) { currentFocusHabit.current += 1; saveData(); renderHabits(); }
}

function updateFocusDisplay() {
    const m = Math.floor(focusTimeLeft / 60).toString().padStart(2, '0');
    const s = (focusTimeLeft % 60).toString().padStart(2, '0');
    document.getElementById('focus-time-display').textContent = `${m}:${s}`;
    
    const totalSecs = currentFocusHabit.target * 60;
    const progress = 1 - (focusTimeLeft / totalSecs);
    document.getElementById('focus-progress-circle').style.strokeDashoffset = 283 - (283 * progress);
}

window.toggleFocusTimer = function() {
    const icon = document.getElementById('focus-play-icon');
    if (focusInterval) { clearInterval(focusInterval); focusInterval = null; icon.className = 'ph-fill ph-play'; } 
    else { focusInterval = setInterval(focusTick, 1000); icon.className = 'ph-fill ph-pause'; }
};

window.stopFocusTimer = function() { clearInterval(focusInterval); focusInterval = null; document.getElementById('focus-overlay').style.display = 'none'; saveData(); renderHabits(); };
function completeFocusSession() { document.getElementById('focus-overlay').style.display = 'none'; currentFocusHabit.current = currentFocusHabit.target; updateStreak(currentFocusHabit); claimHabitReward(currentFocusHabit); saveData(); renderHabits(); }

// ========================================
// GYM PRO MODULE
// ========================================
let currentWorkout = null;
let activeExercise = '';
let restTimerInterval = null;
let restSeconds = 0;

function pluralizeDays(n) {
    if (n === 0) return 'сегодня';
    let rule = (n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2);
    let words = ['день', 'дня', 'дней'];
    return `${n} ${words[rule]} назад`;
}

function pluralizeSets(n) {
    let rule = (n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2);
    let words = ['подход', 'подхода', 'подходов'];
    return `${n} ${words[rule]}`;
}

window.openGymPro = function() {
    if(!currentWorkout) {
        currentWorkout = {
            id: Date.now(),
            timestamp: Date.now(),
            date: getTodayString(),
            exercises: []
        };
    }
    document.getElementById('gym-focus-overlay').style.display = 'flex';
    renderExerciseSelector();
    if(currentUserData.gym.availableExercises.length > 0) {
        switchExercise(currentUserData.gym.availableExercises[0]);
    }
    updateRestTimerDisplay();
};

window.closeGym = function() {
    document.getElementById('gym-focus-overlay').style.display = 'none';
};

window.renderExerciseSelector = function() {
    const container = document.getElementById('gym-exercise-list');
    container.innerHTML = '';
    
    currentUserData.gym.availableExercises.forEach(ex => {
        const btn = document.createElement('button');
        btn.textContent = ex;
        if(ex === activeExercise) btn.classList.add('active');
        btn.onclick = () => switchExercise(ex);
        container.appendChild(btn);
    });
    
    const addBtn = document.createElement('button');
    addBtn.innerHTML = '+ Добавить';
    addBtn.style.color = 'var(--color-orange-accent)';
    addBtn.onclick = addNewExercise;
    container.appendChild(addBtn);
};

window.addNewExercise = function() {
    const name = prompt('Введите название нового упражнения:');
    if(name && name.trim() !== '') {
        const cleanName = name.trim();
        if(!currentUserData.gym.availableExercises.includes(cleanName)) {
            currentUserData.gym.availableExercises.push(cleanName);
            currentUserData.gym.prs[cleanName] = 0;
            saveData();
            renderExerciseSelector();
            switchExercise(cleanName);
            populateGymHistorySelect(); // Update history dropdown if on stats page
        }
    }
};

window.switchExercise = function(exName) {
    activeExercise = exName;
    document.getElementById('gym-exercise-name').textContent = exName;
    document.getElementById('gym-ghost-text').textContent = getGhostText(exName);
    
    const btns = document.querySelectorAll('.gym-exercise-selector button');
    btns.forEach(b => {
        if(b.textContent === exName) b.classList.add('active');
        else b.classList.remove('active');
    });
    
    renderSetsLog();
};

window.adjGymVal = function(type, val) {
    triggerFeedback();
    const input = document.getElementById(`gym-${type}-input`);
    let cur = parseFloat(input.value) || 0;
    cur += val;
    if(cur < 0) cur = 0;
    input.value = type === 'weight' ? cur.toFixed(1) : Math.round(cur);
};

function getGhostText(exName) {
    let pr = currentUserData.gym.prs[exName] || 0;
    let prText = `Твой Максимум (1RM): ${Math.round(pr)} кг`;
    
    if(!currentUserData || !currentUserData.gym || !currentUserData.gym.workouts || currentUserData.gym.workouts.length === 0) {
        return `Нет данных | ${prText}`;
    }
    
    for (let i = currentUserData.gym.workouts.length - 1; i >= 0; i--) {
        let w = currentUserData.gym.workouts[i];
        let ex = w.exercises.find(e => e.name === exName);
        if (ex && ex.sets && ex.sets.length > 0) {
            let lastSet = ex.sets[ex.sets.length - 1]; 
            let daysAgo = Math.floor((Date.now() - w.timestamp) / 86400000);
            return `Прошлый раз: ${lastSet.weight} кг х ${lastSet.reps} (${pluralizeDays(daysAgo)}) | ${prText}`;
        }
    }
    return `Нет данных | ${prText}`;
}

window.logSet = function() {
    triggerFeedback();
    const w = parseFloat(document.getElementById('gym-weight-input').value) || 0;
    const r = parseInt(document.getElementById('gym-reps-input').value) || 0;
    if(r === 0) return toast('Reps cannot be zero');
    
    let epley1RM = w;
    if (r > 1) {
        epley1RM = w * (1 + r / 30);
    }
    
    let isPR = false;
    let currentPR = currentUserData.gym.prs[activeExercise] || 0;
    
    if(epley1RM > currentPR) {
        isPR = true;
        currentUserData.gym.prs[activeExercise] = epley1RM;
        let baseXP = 10;
        let xpGained = Math.floor(baseXP * 1.5);
        currentUserData.stats.str += xpGained;
        toast(`🔥 New PR! Est. 1RM: ${Math.round(epley1RM)}кг (+50% STR XP)`);
    } else {
        currentUserData.stats.str += 10;
        toast('Set logged! +10 STR XP');
    }
    
    let exData = currentWorkout.exercises.find(e => e.name === activeExercise);
    if(!exData) {
        exData = { name: activeExercise, sets: [] };
        currentWorkout.exercises.push(exData);
    }
    
    exData.sets.push({ weight: w, reps: r, isPR: isPR, epley: epley1RM });
    
    startRestTimer();
    renderSetsLog();
    document.getElementById('gym-ghost-text').textContent = getGhostText(activeExercise);
    updateStatsUI();
    saveData();
};

function startRestTimer() {
    if(restTimerInterval) clearInterval(restTimerInterval);
    restSeconds = 0;
    updateRestTimerDisplay();
    restTimerInterval = setInterval(() => {
        restSeconds++;
        updateRestTimerDisplay();
    }, 1000);
}

function updateRestTimerDisplay() {
    const m = Math.floor(restSeconds / 60).toString().padStart(2, '0');
    const s = (restSeconds % 60).toString().padStart(2, '0');
    document.getElementById('gym-timer').textContent = `${m}:${s}`;
}

function renderSetsLog() {
    const logContainer = document.getElementById('gym-sets-log');
    logContainer.innerHTML = '';
    let exData = currentWorkout.exercises.find(e => e.name === activeExercise);
    if(!exData || !exData.sets) return;
    
    exData.sets.forEach((set, i) => {
        let div = document.createElement('div');
        div.className = 'gym-set-row';
        div.innerHTML = `
            <div style="color:var(--text-muted); width:30px;">${i+1}</div>
            <div class="gym-set-info">${set.weight}кг × ${set.reps}</div>
            <div>${set.isPR ? '<span class="gym-set-pr">PR 🏆</span>' : ''}</div>
        `;
        logContainer.appendChild(div);
    });
}

window.finishWorkout = function() {
    if(currentWorkout) {
        let hasSets = currentWorkout.exercises.some(ex => ex.sets && ex.sets.length > 0);
        if(hasSets) {
            currentUserData.gym.workouts.push(currentWorkout);
            toast('Workout Saved! 💪');
            populateGymHistorySelect(); // Update history if stats page is open
        }
        currentWorkout = null;
        if(restTimerInterval) clearInterval(restTimerInterval);
        saveData();
        closeGym();
    }
};

// ========================================
// GYM HISTORY (ANALYTICS)
// ========================================
window.populateGymHistorySelect = function() {
    const sel = document.getElementById('gym-history-select');
    if (!sel || !currentUserData || !currentUserData.gym) return;
    sel.innerHTML = '';
    currentUserData.gym.availableExercises.forEach(ex => {
        const opt = document.createElement('option');
        opt.value = ex;
        opt.textContent = ex;
        sel.appendChild(opt);
    });
    if(currentUserData.gym.availableExercises.length > 0) {
        renderGymHistory(currentUserData.gym.availableExercises[0]);
    }
};

window.renderGymHistory = function(exName) {
    const container = document.getElementById('gym-history-timeline');
    if (!container) return;
    container.innerHTML = '';
    
    const history = currentUserData.gym.workouts.filter(w => w.exercises.some(e => e.name === exName));
    history.sort((a, b) => b.timestamp - a.timestamp); // Newest first
    
    if (history.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); font-size:13px; text-align:center; padding: 20px 0;">Нет истории для этого упражнения.</div>';
        return;
    }
    
    history.forEach(w => {
        const ex = w.exercises.find(e => e.name === exName);
        let bestSet = ex.sets[0];
        let hasPR = false;
        
        ex.sets.forEach(s => {
            if (s.epley > (bestSet.epley || 0)) bestSet = s;
            if (s.isPR) hasPR = true;
        });
        
        const dateObj = new Date(w.timestamp);
        const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        
        const row = document.createElement('div');
        row.className = 'gym-timeline-row';
        row.innerHTML = `
            <div class="gym-timeline-date">${dateStr}</div>
            <div class="gym-timeline-info">
                ${pluralizeSets(ex.sets.length)} (Лучший: ${bestSet.weight} кг х ${bestSet.reps})
                ${hasPR ? '<span class="gym-set-pr">🏆</span>' : ''}
            </div>
        `;
        container.appendChild(row);
    });
};


// ========================================
// INSIGHTS MODAL
// ========================================

window.openInsightModal = function(habitId) { document.getElementById('insight-habit-id').value = habitId; document.getElementById('insight-text').value = ''; document.getElementById('insight-modal').classList.add('active'); }
window.closeInsightModal = function() { document.getElementById('insight-modal').classList.remove('active'); }
window.saveInsight = function() {
    const habitId = parseInt(document.getElementById('insight-habit-id').value);
    const text = document.getElementById('insight-text').value.trim();
    if (text !== '') {
        const h = currentUserData.habits.find(x => x.id === habitId);
        if (h) { const todayStr = getTodayString(); if (!h.history[todayStr]) h.history[todayStr] = { completed: true }; h.history[todayStr].insight = text; saveData(); toast('Insight saved! 📝'); }
    }
    closeInsightModal();
}

// ========================================
// HEATMAP & STATS
// ========================================
function renderHeatmap() {
    const container = document.getElementById('heatmap-container'); if(!container) return; container.innerHTML = '';
    const today = new Date();
    for(let i=59; i>=0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
        let totalDone = 0; currentUserData.habits.forEach(h => { if(h.history && h.history[dateStr] && h.history[dateStr].completed) totalDone++; });
        const cell = document.createElement('div');
        let level = totalDone >= 3 ? 3 : (totalDone === 2 ? 2 : (totalDone === 1 ? 1 : 0));
        cell.className = `heatmap-cell level-${level}`; cell.title = `${dateStr}: ${totalDone} completed`;
        container.appendChild(cell);
    }
}

const AVATARS = [{ level: 1, icon: 'ph-egg', name: 'Novice' }, { level: 5, icon: 'ph-bird', name: 'Apprentice' }, { level: 10, icon: 'ph-sword', name: 'Warrior' }, { level: 20, icon: 'ph-crown', name: 'Master' }];
function updateStatsUI() {
    if(!currentUserData) return;
    const xp = currentUserData.xp; const lvl = Math.floor(xp / 250) + 1; const curExp = xp % 250;
    let avatar = AVATARS[0]; for(const a of AVATARS) { if(lvl >= a.level) avatar = a; }
    
    document.getElementById('profile-avatar-icon').className = `ph ${avatar.icon} doll-base`; document.getElementById('level-display').textContent = lvl;
    document.getElementById('title-display').textContent = avatar.name; document.getElementById('xp-text').textContent = `${curExp} / 250 XP`;
    document.getElementById('exp-bar').style.width = `${(curExp / 250) * 100}%`;
    
    const s = currentUserData.stats;
    ['str','end','agi','int','per'].forEach(st => { document.getElementById(`stat-${st}`).textContent = s[st]; });
    document.getElementById('stat-freezes').textContent = currentUserData.streak_freezes;
    
    if (currentUserData.social) {
        const socData = currentUserData.social; const reqXP = getRequiredCharismaXP(socData.level);
        document.getElementById('charisma-lvl-display').textContent = socData.level;
        document.getElementById('charisma-xp-display').textContent = `${socData.xp} / ${reqXP} XP`;
        document.getElementById('charisma-bar').style.width = `${(socData.xp / reqXP) * 100}%`;
    }
}

// ========================================
// DATA IMPORT / EXPORT (BACKUP)
// ========================================
window.exportData = async function() {
    if(!currentUserData) return;
    const dataStr = JSON.stringify(currentUserData, null, 2);
    const fileName = `grit_backup_${getTodayString()}.json`;
    const file = new File([dataStr], fileName, { type: "application/json" });

    // iOS Web Share API (Окно "Поделиться" / "Сохранить в Файлы")
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'Grit Tracker Backup'
            });
            toast('📦 Backup exported!');
            return;
        } catch (err) {
            console.log('Share canceled or failed:', err);
        }
    }
    
    // Стандартное скачивание (исправлено под iOS)
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a); // Критично для iOS Safari!
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('📦 Backup exported!');
};

window.importData = function(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if(importedData.habits && importedData.stats) {
                currentUserData = normalizeData(importedData); await saveData(); initApp(); toast('🚀 Backup restored successfully!');
            } else toast('❌ Invalid backup file format.', 'error');
        } catch(err) { toast('❌ Error parsing JSON file.', 'error'); }
        event.target.value = ''; 
    };
    reader.readAsText(file);
};

// ========================================
// SETTINGS
// ========================================
window.saveSettings = async function() {
    const bed = document.getElementById('setting-bedtime').value; const wake = document.getElementById('setting-wakeup').value;
    if(bed && wake) { currentUserData.settings.target_bedtime = bed; currentUserData.settings.target_wakeup = wake; await saveData(); toast('Schedule Saved!'); }
};

window.resetProgress = async function() {
    if(confirm('Are you sure you want to reset all habits and RPG stats?')) {
        currentUserData.xp = 0; currentUserData.streak_freezes = 2;
        currentUserData.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0 };
        currentUserData.social = { level: 1, xp: 0, currentQuest: null, lastCycle: null, isCompleted: false };
        currentUserData.habits = JSON.parse(JSON.stringify(defaultHabits));
        currentUserData.gym = { workouts: [], prs: { 'Приседания со штангой': 0, 'Жим лежа': 0, 'Становая тяга': 0 }, availableExercises: ['Приседания со штангой', 'Жим лежа', 'Становая тяга'] };
        await saveData(); initApp(); updateStatsUI(); toast('Progress Reset');
    }
};

// ========================================
// AUTO-LOGIN & STARTUP LOGIC
// ========================================
async function attemptAutoLogin() {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
        document.getElementById('login-username').value = savedSession;
        try {
            const user = await getUser(savedSession);
            if (user) {
                currentUsername = savedSession;
                currentUserData = normalizeData(user);
                document.getElementById('auth-screen').style.display = 'none';
                document.getElementById('app-container').classList.add('active');
                initApp();
            } else {
                localStorage.removeItem(SESSION_KEY); // Сбрасываем, если юзер удален из базы
            }
        } catch (e) {
            console.error("Auto-login failed:", e);
        }
    }
}

attemptAutoLogin();

if ('serviceWorker' in navigator) {
    const swCode = `const CACHE_NAME = 'grit-v1'; self.addEventListener('install', event => { self.skipWaiting(); }); self.addEventListener('fetch', event => { event.respondWith( fetch(event.request).catch(() => caches.match(event.request)) ); });`;
    navigator.serviceWorker.register(URL.createObjectURL(new Blob([swCode], { type: 'application/javascript' })))
        .catch(err => console.log('SW registration skipped:', err));
}

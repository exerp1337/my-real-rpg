const SUPABASE_URL = 'https://zjtudyoffdwqfamzczcb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqdHVkeW9mZmR3cWZhbXpjemNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTYxMDMsImV4cCI6MjEwMDE5MjEwM30.yO-fyi_hZv__XqMjz-OpuYNPAlKyaGT7KB4xscqHMNo';
const TABLE_NAME = 'players';
const SESSION_KEY = 'grit_session';

let currentUserData = null;
let currentUsername = null;
let activeTimers = {};
let currentTimeFilter = 'any';
let editingHabitId = null; 

let focusInterval = null;
let focusTimeLeft = 0;
let currentFocusHabit = null;

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
    
    if (user.social.lastCycle === undefined) { user.social.lastCycle = user.social.lastWeek || null; delete user.social.lastWeek; }

    if (typeof user.stats === 'string') { try { user.stats = JSON.parse(user.stats); } catch(e) { user.stats = null; } }
    if (!user.stats) user.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0 };

    if (typeof user.gym === 'string') { try { user.gym = JSON.parse(user.gym); } catch(e) { user.gym = null; } }
    if (!user.gym) { user.gym = { workouts: [], prs: { 'Приседания со штангой': 0, 'Жим лежа': 0, 'Становая тяга': 0 }, availableExercises: ['Приседания со штангой', 'Жим лежа', 'Становая тяга'] }; }
    
    if(!user.gym.availableExercises) { user.gym.availableExercises = ['Приседания со штангой', 'Жим лежа', 'Становая тяга']; }
    user.gym.availableExercises.forEach(ex => { if(user.gym.prs[ex] === undefined) user.gym.prs[ex] = 0; });

    if (user.streak_freezes === undefined || user.streak_freezes === null) user.streak_freezes = 2;
    if (!user.xp) user.xp = 0;
    
    return user;
}

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

async function attemptAutoLogin() {
    const savedUsername = localStorage.getItem(SESSION_KEY);
    if (!savedUsername) return;
    try {
        const user = await getUser(savedUsername);
        if (!user) { localStorage.removeItem(SESSION_KEY); return; }
        currentUsername = savedUsername;
        currentUserData = normalizeData(user);
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-container').classList.add('active');
        initApp();
    } catch (e) { console.error('Auto-login failed:', e); }
}

function toast(msg, type) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' toast-error' : '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2000);
}

window.switchTab = function(evt, tab, title) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    evt.currentTarget.classList.add('active');
    document.getElementById('main-header-title').textContent = title;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`${tab}-screen`).classList.add('active');
    if (tab === 'stats') { updateStatsUI(); renderHeatmap(); populateGymHistorySelect(); }
};

window.filterTime = function(time) {
    currentTimeFilter = time;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.time-btn[data-time="${time}"]`).classList.add('active');
    renderHabits();
};

function getTodayString() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }

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
                if (currentUserData.streak_freezes > 0) { currentUserData.streak_freezes--; toast(`❄️ Streak frozen for: ${h.title}`); } else { h.streak = -1; }
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

const socialQuestsDB = [
    { id: 'sq_1_1', minLvl: 1, maxLvl: 3, xp: 35, emoji: '👋', title: 'Микро-контакт', desc: 'Улыбнуться и поздороваться с администратором зала, охранником или соседом в лифте.' },
    { id: 'sq_5_5', minLvl: 16, maxLvl: 999, xp: 400, emoji: '❤️', title: 'Осознанная уязвимость', desc: 'Инициировать честный разговор на глубоко личную тему с близким человеком.' }
];

function getRequiredCharismaXP(level) { return Math.floor(100 * Math.pow(level, 1.3)); }
function getCurrentCycleString() { const daysSinceEpoch = Math.floor(Date.now() / 86400000); const cycleNo = Math.floor(daysSinceEpoch / 3); return `Cycle-${cycleNo}`; }

function initSocialData() {
    const currentCycle = getCurrentCycleString();
    if (currentUserData.social.lastCycle !== currentCycle) {
        const userLvl = currentUserData.social.level;
        const availableQuests = socialQuestsDB.filter(q => userLvl >= q.minLvl && userLvl <= q.maxLvl);
        if(availableQuests.length > 0) currentUserData.social.currentQuest = availableQuests[Math.floor(Math.random() * availableQuests.length)];
        else currentUserData.social.currentQuest = socialQuestsDB[0];
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
    if (leveledUp) toast(`🎉 Charisma Level Up! You are now Level ${socData.level}!`); else toast(`🤝 Social Quest Done! +${q.xp} XP`);
};

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
        
        if (h.type === 'counter' || h.type === 'checklist') { desc += `, ${h.current}/${h.target}`; } 
        else if (h.type === 'timer') { if (h.target === 60) { desc += `, ${h.current >= 60 ? 1 : 0}/1 hour`; } else { desc += `, ${h.current}/${h.target} min`; } actionIcon = '<i class="ph-fill ph-play"></i>'; btnAction = `openFocusTimer(${h.id})`; }
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

        const wrapper = document.createElement('div');
        wrapper.className = 'habit-card-wrapper';
        wrapper.dataset.habitId = h.id;

        const deleteBg = document.createElement('div');
        deleteBg.className = 'habit-delete-bg';
        deleteBg.innerHTML = '<i class="ph-fill ph-trash"></i> Удалить';
        deleteBg.addEventListener('click', function() { openDeleteModal(h.id, h.title); });
        wrapper.appendChild(deleteBg);

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

        attachSwipeDelete(wrapper, card, h.id, h.title);
        wrapper.appendChild(card);
        container.appendChild(wrapper);
    });
}

async function saveData() { await updateUser(currentUsername, currentUserData); }
function updateStreak(h) { h.streak = h.streak < 0 ? 1 : h.streak + 1; }

function claimHabitReward(h) {
    let multiplier = h.streak >= 30 ? 2.0 : (h.streak >= 7 ? 1.5 : (h.streak >= 3 ? 1.2 : 1.0));
    const totalXP = Math.floor(15 * multiplier); currentUserData.xp += totalXP;
    const s = currentUserData.stats;
    if (h.color === 'green') { s.int += 2; s.per += 1; } else if (h.color === 'purple') { s.per += 3; } else if (h.color === 'orange') { s.str += 2; s.end += 1; } else if (h.color === 'blue') { s.int += 1; s.agi += 2; }
    const todayStr = getTodayString(); h.history[todayStr] = { completed: true, insight: "" };
    toast(`+${totalXP} XP${multiplier > 1.0 ? ` (Combo x${multiplier}!)` : ''} | ${h.title}`);
    setTimeout(() => openInsightModal(h.id), 500);
}

window.incrementHabit = function(id) {
    const h = currentUserData.habits.find(x => x.id === id); if (!h || h.current >= h.target) return;
    triggerFeedback(); h.current += 1; if (h.current === h.target) { updateStreak(h); claimHabitReward(h); } renderHabits(); saveData();
};

window.toggleSubtask = function(habitId, subtaskIdx) {
    const h = currentUserData.habits.find(x => x.id === habitId); if (!h || h.current >= h.target) return; 
    h.subtasks[subtaskIdx].done = !h.subtasks[subtaskIdx].done; triggerFeedback();
    h.current = h.subtasks.filter(x => x.done).length; if (h.current >= h.target) { updateStreak(h); claimHabitReward(h); } saveData(); renderHabits();
};

window.selectEmoji = function(emoji, el) {
    document.querySelectorAll('.emoji-option').forEach(opt => opt.classList.remove('active'));
    if (el) el.classList.add('active'); document.getElementById('habit-emoji').value = emoji;
};

window.clearEmojiSelection = function() { document.querySelectorAll('.emoji-option').forEach(opt => opt.classList.remove('active')); };

function updateHabitTypeUI(type) {
    const tw = document.getElementById('target-wrapper'); const sw = document.getElementById('subtasks-wrapper');
    if (type === 'checkbox') { tw.style.display = 'none'; sw.style.display = 'none'; }
    else if (type === 'checklist') { tw.style.display = 'none'; sw.style.display = 'block'; }
    else { tw.style.display = 'block'; sw.style.display = 'none'; document.getElementById('habit-target').placeholder = type === 'timer' ? 'Minutes (e.g., 60)' : 'Amount (e.g., 3)'; }
}

window.addHabitModal = function() {
    editingHabitId = null;
    document.querySelector('.modal h2').textContent = 'New Habit';
    document.getElementById('habit-title').value = ''; document.getElementById('habit-emoji').value = '';
    document.getElementById('habit-target').value = ''; document.getElementById('habit-subtasks').value = '';
    clearEmojiSelection(); document.getElementById('add-habit-modal').classList.add('active');

    document.getElementById('habit-type').onchange = (e) => updateHabitTypeUI(e.target.value);
    document.getElementById('habit-type').dispatchEvent(new Event('change'));
};

window.editHabit = function(id) {
    const h = currentUserData.habits.find(x => x.id === id); if (!h) return;
    editingHabitId = id;
    document.querySelector('.modal h2').textContent = 'Edit Habit';
    document.getElementById('habit-title').value = h.title; document.getElementById('habit-emoji').value = h.emoji;
    document.getElementById('habit-type').value = h.type; document.getElementById('habit-schedule').value = h.schedule.type;
    document.getElementById('habit-time').value = h.timeOfDay; document.getElementById('habit-color').value = h.color;
    if (h.type === 'checklist' && h.subtasks) { document.getElementById('habit-subtasks').value = h.subtasks.map(s => s.title).join('\n'); } else { document.getElementById('habit-target').value = h.target || ''; }
    
    clearEmojiSelection(); document.getElementById('add-habit-modal').classList.add('active');

    document.getElementById('habit-type').onchange = (e) => updateHabitTypeUI(e.target.value);
    document.getElementById('habit-type').dispatchEvent(new Event('change'));
};

window.saveNewHabit = function() {
    const title = document.getElementById('habit-title').value.trim(); const emoji = document.getElementById('habit-emoji').value.trim() || '📌';
    const type = document.getElementById('habit-type').value; const color = document.getElementById('habit-color').value;
    let target = parseInt(document.getElementById('habit-target').value);
    const scheduleType = document.getElementById('habit-schedule').value; const timeOfDay = document.getElementById('habit-time').value;

    if (!title) return toast('Please enter a title');
    let subtasks = []; if (type === 'checkbox') target = 1;
    if (type === 'checklist') {
        const stText = document.getElementById('habit-subtasks').value.trim(); if (!stText) return toast('Please enter checklist items');
        const oldLines = stText.split('\n').map(s => s.trim()).filter(s => s !== '');
        if (editingHabitId) {
            const existingH = currentUserData.habits.find(x => x.id === editingHabitId);
            subtasks = oldLines.map(line => { const existingSt = existingH.subtasks?.find(s => s.title === line); return { title: line, done: existingSt ? existingSt.done : false }; });
        } else { subtasks = oldLines.map(s => ({ title: s, done: false })); }
        target = subtasks.length;
    }
    if ((type === 'counter' || type === 'timer') && (!target || target <= 0)) return toast('Enter valid target');
    
    if (editingHabitId) {
        const h = currentUserData.habits.find(x => x.id === editingHabitId);
        h.title = title; h.emoji = emoji; h.type = type; h.color = color; h.target = target; h.schedule.type = scheduleType; h.timeOfDay = timeOfDay;
        if (type === 'checklist') { h.subtasks = subtasks; h.current = h.subtasks.filter(s => s.done).length; } toast('Habit updated!');
    } else {
        const newH = { id: Date.now(), title, emoji, type, color, target, current: 0, streak: -1, isRunning: false, lastUpdated: getTodayString(), schedule: { type: scheduleType }, timeOfDay: timeOfDay, history: {} };
        if (type === 'checklist') newH.subtasks = subtasks; currentUserData.habits.push(newH); toast('Habit created!');
    }
    saveData(); renderHabits(); document.getElementById('add-habit-modal').classList.remove('active');
};

window.openFocusTimer = function(id) {
    const h = currentUserData.habits.find(x => x.id === id); if (!h || h.current >= h.target) return toast('Habit already completed today!');
    currentFocusHabit = h; focusTimeLeft = (h.target - h.current) * 60;
    document.getElementById('focus-title').textContent = h.title; document.getElementById('focus-overlay').style.display = 'flex'; document.getElementById('focus-play-icon').className = 'ph-fill ph-pause';
    updateFocusDisplay(); focusInterval = setInterval(focusTick, 1000);
};

function focusTick() {
    if (focusTimeLeft <= 0) { clearInterval(focusInterval); return completeFocusSession(); }
    focusTimeLeft--; updateFocusDisplay(); if (focusTimeLeft % 60 === 0) { currentFocusHabit.current += 1; saveData(); renderHabits(); }
}
function updateFocusDisplay() {
    const m = Math.floor(focusTimeLeft / 60).toString().padStart(2, '0'); const s = (focusTimeLeft % 60).toString().padStart(2, '0');
    document.getElementById('focus-time-display').textContent = `${m}:${s}`;
    const totalSecs = currentFocusHabit.target * 60; const progress = 1 - (focusTimeLeft / totalSecs);
    document.getElementById('focus-progress-circle').style.strokeDashoffset = 283 - (283 * progress);
}
window.toggleFocusTimer = function() { const icon = document.getElementById('focus-play-icon'); if (focusInterval) { clearInterval(focusInterval); focusInterval = null; icon.className = 'ph-fill ph-play'; } else { focusInterval = setInterval(focusTick, 1000); icon.className = 'ph-fill ph-pause'; } };
window.stopFocusTimer = function() { clearInterval(focusInterval); focusInterval = null; document.getElementById('focus-overlay').style.display = 'none'; saveData(); renderHabits(); };
function completeFocusSession() { document.getElementById('focus-overlay').style.display = 'none'; currentFocusHabit.current = currentFocusHabit.target; updateStreak(currentFocusHabit); claimHabitReward(currentFocusHabit); saveData(); renderHabits(); }

let currentWorkout = null; let activeExercise = ''; let restTimerInterval = null; let restSeconds = 0;
function pluralizeDays(n) { if (n === 0) return 'сегодня'; let rule = (n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2); let words = ['день', 'дня', 'дней']; return `${n} ${words[rule]} назад`; }
function pluralizeSets(n) { let rule = (n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2); let words = ['подход', 'подхода', 'подходов']; return `${n} ${words[rule]}`; }

window.openGymPro = function() {
    if(!currentWorkout) { currentWorkout = { id: Date.now(), timestamp: Date.now(), date: getTodayString(), exercises: [] }; }
    document.getElementById('gym-focus-overlay').style.display = 'flex'; renderExerciseSelector();
    if(currentUserData.gym.availableExercises.length > 0) { switchExercise(currentUserData.gym.availableExercises[0]); } updateRestTimerDisplay();
};
window.closeGym = function() { document.getElementById('gym-focus-overlay').style.display = 'none'; };

window.renderExerciseSelector = function() {
    const container = document.getElementById('gym-exercise-list'); container.innerHTML = '';
    currentUserData.gym.availableExercises.forEach(ex => { const btn = document.createElement('button'); btn.textContent = ex; if(ex === activeExercise) btn.classList.add('active'); btn.onclick = () => switchExercise(ex); container.appendChild(btn); });
    const addBtn = document.createElement('button'); addBtn.innerHTML = '+ Добавить'; addBtn.style.color = 'var(--color-orange-accent)'; addBtn.onclick = addNewExercise; container.appendChild(addBtn);
};
window.addNewExercise = function() { const name = prompt('Введите название нового упражнения:'); if(name && name.trim() !== '') { const cleanName = name.trim(); if(!currentUserData.gym.availableExercises.includes(cleanName)) { currentUserData.gym.availableExercises.push(cleanName); currentUserData.gym.prs[cleanName] = 0; saveData(); renderExerciseSelector(); switchExercise(cleanName); populateGymHistorySelect(); } } };

window.switchExercise = function(exName) {
    activeExercise = exName; document.getElementById('gym-exercise-name').textContent = exName; document.getElementById('gym-ghost-text').textContent = getGhostText(exName);
    const btns = document.querySelectorAll('.gym-exercise-selector button'); btns.forEach(b => { if(b.textContent === exName) b.classList.add('active'); else b.classList.remove('active'); }); renderSetsLog();
};
window.adjGymVal = function(type, val) { triggerFeedback(); const input = document.getElementById(`gym-${type}-input`); let cur = parseFloat(input.value) || 0; cur += val; if(cur < 0) cur = 0; input.value = type === 'weight' ? cur.toFixed(1) : Math.round(cur); };

function getGhostText(exName) {
    let pr = currentUserData.gym.prs[exName] || 0; let prText = `Твой Максимум (1RM): ${Math.round(pr)} кг`;
    if(!currentUserData || !currentUserData.gym || !currentUserData.gym.workouts || currentUserData.gym.workouts.length === 0) { return `Нет данных | ${prText}`; }
    for (let i = currentUserData.gym.workouts.length - 1; i >= 0; i--) { let w = currentUserData.gym.workouts[i]; let ex = w.exercises.find(e => e.name === exName); if (ex && ex.sets && ex.sets.length > 0) { let lastSet = ex.sets[ex.sets.length - 1]; let daysAgo = Math.floor((Date.now() - w.timestamp) / 86400000); return `Прошлый раз: ${lastSet.weight} кг х ${lastSet.reps} (${pluralizeDays(daysAgo)}) | ${prText}`; } } return `Нет данных | ${prText}`;
}

window.logSet = function() {
    triggerFeedback(); const w = parseFloat(document.getElementById('gym-weight-input').value) || 0; const r = parseInt(document.getElementById('gym-reps-input').value) || 0; if(r === 0) return toast('Reps cannot be zero');
    let epley1RM = w; if (r > 1) { epley1RM = w * (1 + r / 30); } let isPR = false; let currentPR = currentUserData.gym.prs[activeExercise] || 0;
    if(epley1RM > currentPR) { isPR = true; currentUserData.gym.prs[activeExercise] = epley1RM; currentUserData.stats.str += 15; toast(`🔥 New PR! Est. 1RM: ${Math.round(epley1RM)}кг (+50% STR XP)`); } else { currentUserData.stats.str += 10; toast('Set logged! +10 STR XP'); }
    let exData = currentWorkout.exercises.find(e => e.name === activeExercise); if(!exData) { exData = { name: activeExercise, sets: [] }; currentWorkout.exercises.push(exData); }
    exData.sets.push({ weight: w, reps: r, isPR: isPR, epley: epley1RM }); startRestTimer(); renderSetsLog(); document.getElementById('gym-ghost-text').textContent = getGhostText(activeExercise); updateStatsUI(); saveData();
};

function startRestTimer() { if(restTimerInterval) clearInterval(restTimerInterval); restSeconds = 0; updateRestTimerDisplay(); restTimerInterval = setInterval(() => { restSeconds++; updateRestTimerDisplay(); }, 1000); }
function updateRestTimerDisplay() { const m = Math.floor(restSeconds / 60).toString().padStart(2, '0'); const s = (restSeconds % 60).toString().padStart(2, '0'); document.getElementById('gym-timer').textContent = `${m}:${s}`; }

function renderSetsLog() {
    const logContainer = document.getElementById('gym-sets-log'); logContainer.innerHTML = ''; let exData = currentWorkout.exercises.find(e => e.name === activeExercise); if(!exData || !exData.sets) return;
    exData.sets.forEach((set, i) => { let div = document.createElement('div'); div.className = 'gym-set-row'; div.innerHTML = ` <div style="color:var(--text-muted); width:30px;">${i+1}</div> <div class="gym-set-info">${set.weight}кг × ${set.reps}</div> <div>${set.isPR ? '<span class="gym-set-pr">PR 🏆</span>' : ''}</div> `; logContainer.appendChild(div); });
}

window.finishWorkout = function() { if(currentWorkout) { let hasSets = currentWorkout.exercises.some(ex => ex.sets && ex.sets.length > 0); if(hasSets) { currentUserData.gym.workouts.push(currentWorkout); toast('Workout Saved! 💪'); populateGymHistorySelect(); } currentWorkout = null; if(restTimerInterval) clearInterval(restTimerInterval); saveData(); closeGym(); } };

window.populateGymHistorySelect = function() {
    const sel = document.getElementById('gym-history-select'); if (!sel || !currentUserData || !currentUserData.gym) return; sel.innerHTML = '';
    currentUserData.gym.availableExercises.forEach(ex => { const opt = document.createElement('option'); opt.value = ex; opt.textContent = ex; sel.appendChild(opt); });
    if(currentUserData.gym.availableExercises.length > 0) { renderGymHistory(currentUserData.gym.availableExercises[0]); }
};

window.renderGymHistory = function(exName) {
    const container = document.getElementById('gym-history-timeline'); if (!container) return; container.innerHTML = '';
    const history = currentUserData.gym.workouts.filter(w => w.exercises.some(e => e.name === exName)); history.sort((a, b) => b.timestamp - a.timestamp);
    if (history.length === 0) { container.innerHTML = '<div style="color:var(--text-muted); font-size:13px; text-align:center; padding: 20px 0;">Нет истории для этого упражнения.</div>'; return; }
    history.forEach(w => {
        const ex = w.exercises.find(e => e.name === exName); let bestSet = ex.sets[0]; let hasPR = false;
        ex.sets.forEach(s => { if (s.epley > (bestSet.epley || 0)) bestSet = s; if (s.isPR) hasPR = true; });
        const dateStr = new Date(w.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        const row = document.createElement('div'); row.className = 'gym-timeline-row';
        row.innerHTML = `<div class="gym-timeline-date">${dateStr}</div><div class="gym-timeline-info">${pluralizeSets(ex.sets.length)} (Лучший: ${bestSet.weight} кг х ${bestSet.reps}) ${hasPR ? '<span class="gym-set-pr">🏆</span>' : ''}</div>`; container.appendChild(row);
    });
};

window.openInsightModal = function(habitId) { document.getElementById('insight-habit-id').value = habitId; document.getElementById('insight-text').value = ''; document.getElementById('insight-modal').classList.add('active'); }
window.closeInsightModal = function() { document.getElementById('insight-modal').classList.remove('active'); }
window.saveInsight = function() { const habitId = parseInt(document.getElementById('insight-habit-id').value); const text = document.getElementById('insight-text').value.trim(); if (text !== '') { const h = currentUserData.habits.find(x => x.id === habitId); if (h) { const todayStr = getTodayString(); if (!h.history[todayStr]) h.history[todayStr] = { completed: true }; h.history[todayStr].insight = text; saveData(); toast('Insight saved! 📝'); } } closeInsightModal(); }

function renderHeatmap() {
    const container = document.getElementById('heatmap-container'); if(!container) return; container.innerHTML = ''; const today = new Date();
    for(let i=59; i>=0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const dateStr = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; let totalDone = 0; currentUserData.habits.forEach(h => { if(h.history && h.history[dateStr] && h.history[dateStr].completed) totalDone++; }); const cell = document.createElement('div'); let level = totalDone >= 3 ? 3 : (totalDone === 2 ? 2 : (totalDone === 1 ? 1 : 0)); cell.className = `heatmap-cell level-${level}`; cell.title = `${dateStr}: ${totalDone} completed`; container.appendChild(cell); }
}

const AVATARS = [{ level: 1, icon: 'ph-egg', name: 'Novice' }, { level: 5, icon: 'ph-bird', name: 'Apprentice' }, { level: 10, icon: 'ph-sword', name: 'Warrior' }, { level: 20, icon: 'ph-crown', name: 'Master' }];
function updateStatsUI() {
    if(!currentUserData) return; const xp = currentUserData.xp; const lvl = Math.floor(xp / 250) + 1; const curExp = xp % 250; let avatar = AVATARS[0]; for(const a of AVATARS) { if(lvl >= a.level) avatar = a; }
    document.getElementById('profile-avatar-icon').className = `ph ${avatar.icon} doll-base`; document.getElementById('level-display').textContent = lvl; document.getElementById('title-display').textContent = avatar.name; document.getElementById('xp-text').textContent = `${curExp} / 250 XP`; document.getElementById('exp-bar').style.width = `${(curExp / 250) * 100}%`;
    const s = currentUserData.stats; ['str','end','agi','int','per'].forEach(st => { document.getElementById(`stat-${st}`).textContent = s[st]; }); document.getElementById('stat-freezes').textContent = currentUserData.streak_freezes;
    if (currentUserData.social) { const socData = currentUserData.social; const reqXP = getRequiredCharismaXP(socData.level); document.getElementById('charisma-lvl-display').textContent = socData.level; document.getElementById('charisma-xp-display').textContent = `${socData.xp} / ${reqXP} XP`; document.getElementById('charisma-bar').style.width = `${(socData.xp / reqXP) * 100}%`; }
}

window.saveSettings = async function() {
    const bedtime = document.getElementById('setting-bedtime').value;
    const wakeup = document.getElementById('setting-wakeup').value;
    if (!bedtime || !wakeup) return toast('Укажите оба значения времени', 'error');
    currentUserData.settings.target_bedtime = bedtime;
    currentUserData.settings.target_wakeup = wakeup;
    await saveData();
    toast('⏰ Расписание сохранено');
};

window.resetProgress = async function() {
    if (!confirm('Сбросить весь прогресс? Это действие нельзя отменить.')) return;
    currentUserData.xp = 0;
    currentUserData.streak_freezes = 2;
    currentUserData.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0 };
    currentUserData.habits = JSON.parse(JSON.stringify(defaultHabits));
    currentUserData.habits.forEach(h => h.lastUpdated = getTodayString());
    currentUserData.social = { level: 1, xp: 0, currentQuest: null, lastCycle: null, isCompleted: false };
    currentUserData.gym = {
        workouts: [],
        prs: { 'Приседания со штангой': 0, 'Жим лежа': 0, 'Становая тяга': 0 },
        availableExercises: ['Приседания со штангой', 'Жим лежа', 'Становая тяга']
    };
    await saveData();
    initApp();
    toast('🔄 Прогресс сброшен');
};

window.exportData = async function() { if(!currentUserData) return; const dataStr = JSON.stringify(currentUserData, null, 2); const fileName = `grit_backup_${getTodayString()}.json`; const file = new File([dataStr], fileName, { type: "application/json" }); if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Grit Tracker Backup' }); toast('📦 Backup exported!'); return; } catch (err) { } } const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); toast('📦 Backup exported!'); };
window.importData = function(event) { const file = event.target.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = async function(e) { try { const importedData = JSON.parse(e.target.result); if(importedData.habits && importedData.stats) { currentUserData = normalizeData(importedData); await saveData(); initApp(); toast('🚀 Backup restored successfully!'); } else toast('❌ Invalid backup file format.', 'error'); } catch(err) { toast('❌ Error parsing JSON file.', 'error'); } event.target.value = ''; }; reader.readAsText(file); };

// ========================================
// SWIPE-TO-DELETE — HABIT CARDS
// ========================================
var swipeState = null;

function attachSwipeDelete(wrapper, card, habitId, habitTitle) {
    var startX = 0, startY = 0, currentX = 0, isSwiping = false, isOpen = false, longPressTimer = null;
    var SWIPE_THRESHOLD = 50;
    var MAX_SWIPE = 96;

    function closeOthers() {
        document.querySelectorAll('.habit-card-wrapper.swiped').forEach(function(w) {
            if (w !== wrapper) {
                w.classList.remove('swiped');
                var c = w.querySelector('.habit-card');
                if (c) c.style.transform = '';
            }
        });
    }

    card.addEventListener('pointerdown', function(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        startX = e.clientX;
        startY = e.clientY;
        isSwiping = false;

        longPressTimer = setTimeout(function() {
            if (!isSwiping) {
                if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
                openDeleteModal(habitId, habitTitle);
            }
        }, 600);
    });

    card.addEventListener('pointermove', function(e) {
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;

        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
            clearTimeout(longPressTimer);
        }

        if (!isSwiping && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
            isSwiping = true;
            closeOthers();
            if (e.pointerType === 'mouse') {
                card.setPointerCapture(e.pointerId);
            }
        }

        if (!isSwiping) return;

        var base = isOpen ? -MAX_SWIPE : 0;
        var newX = base + dx;
        newX = Math.min(0, Math.max(-MAX_SWIPE, newX));

        card.style.transition = 'none';
        card.style.transform = 'translateX(' + newX + 'px)';
    });

    function endSwipe(e) {
        clearTimeout(longPressTimer);
        if (!isSwiping) return;

        if (card.hasPointerCapture && card.hasPointerCapture(e.pointerId)) {
            card.releasePointerCapture(e.pointerId);
        }

        var dx = e.clientX - startX;
        var base = isOpen ? -MAX_SWIPE : 0;
        var finalX = base + dx;

        card.style.transition = '';

        if (!isOpen) {
            if (finalX < -SWIPE_THRESHOLD) {
                isOpen = true;
                wrapper.classList.add('swiped');
                card.style.transform = '';
            } else {
                card.style.transform = '';
            }
        } else {
            if (finalX > -SWIPE_THRESHOLD) {
                isOpen = false;
                wrapper.classList.remove('swiped');
                card.style.transform = '';
            } else {
                card.style.transform = 'translateX(-' + MAX_SWIPE + 'px)';
            }
        }
        isSwiping = false;
    }

    card.addEventListener('pointerup', endSwipe);
    card.addEventListener('pointercancel', endSwipe);

    document.addEventListener('pointerdown', function(e) {
        if (isOpen && !wrapper.contains(e.target)) {
            isOpen = false;
            wrapper.classList.remove('swiped');
            card.style.transition = '';
            card.style.transform = '';
        }
    });
}

function openDeleteModal(habitId, habitTitle) {
    document.getElementById('delete-habit-id').value = habitId;
    document.getElementById('delete-habit-name').textContent = '«' + habitTitle + '»';
    document.getElementById('delete-habit-modal').classList.add('active');
}

window.confirmDeleteHabit = function() {
    var id = parseInt(document.getElementById('delete-habit-id').value);
    document.getElementById('delete-habit-modal').classList.remove('active');

    var wrapper = document.querySelector('.habit-card-wrapper[data-habit-id="' + id + '"]');
    if (wrapper) {
        wrapper.classList.add('removing');
        setTimeout(function() {
            currentUserData.habits = currentUserData.habits.filter(function(h) { return h.id !== id; });
            saveData();
            renderHabits();
            toast('🗑️ Задание удалено');
        }, 400);
    } else {
        currentUserData.habits = currentUserData.habits.filter(function(h) { return h.id !== id; });
        saveData();
        renderHabits();
        toast('🗑️ Задание удалено');
    }
};

window.calcSleep = function() {
    var now = new Date();
    var asleepTime = new Date(now.getTime() + 15 * 60 * 1000);

    var cycles = [
        { n: 4, label: '4 цикла — Жёсткий режим', highlight: false },
        { n: 5, label: '5 циклов — Идеально ✦',   highlight: true  },
        { n: 6, label: '6 циклов — Максимум',      highlight: false }
    ];

    var timesContainer = document.getElementById('sleep-times');
    timesContainer.innerHTML = '';

    cycles.forEach(function(c) {
        var wakeMs = asleepTime.getTime() + c.n * 90 * 60 * 1000;
        var wakeDate = new Date(wakeMs);
        var hh = wakeDate.getHours().toString().padStart(2, '0');
        var mm = wakeDate.getMinutes().toString().padStart(2, '0');

        var row = document.createElement('div');
        row.className = 'sleep-time-row' + (c.highlight ? ' highlight' : '');
        row.innerHTML =
            '<span class="sleep-time-value">' + hh + ':' + mm + '</span>' +
            '<div class="sleep-time-meta">' +
                '<div class="sleep-time-cycles">' + c.label + '</div>' +
                '<div class="sleep-time-label">' + (c.n * 90 / 60).toFixed(1).replace('.0','') + ' ч чистого сна</div>' +
            '</div>';
        timesContainer.appendChild(row);
    });

    var results = document.getElementById('sleep-results');
    results.style.display = 'block';

    document.getElementById('sleep-calc-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (navigator.vibrate) navigator.vibrate(40);
};

attemptAutoLogin();

if ('serviceWorker' in navigator) {
    const swCode = `const CACHE_NAME = 'grit-v1'; self.addEventListener('install', event => { self.skipWaiting(); }); self.addEventListener('fetch', event => { event.respondWith( fetch(event.request).catch(() => caches.match(event.request)) ); });`;
    navigator.serviceWorker.register(URL.createObjectURL(new Blob([swCode], { type: 'application/javascript' })))
        .catch(err => console.log('SW registration skipped:', err));
}

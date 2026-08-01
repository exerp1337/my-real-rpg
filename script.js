const SUPABASE_URL = 'https://zjtudyoffdwqfamzczcb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqdHVkeW9mZmR3cWZhbXpjemNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTYxMDMsImV4cCI6MjEwMDE5MjEwM30.yO-fyi_hZv__XqMjz-OpuYNPAlKyaGT7KB4xscqHMNo';
const TABLE_NAME = 'players';
const SESSION_KEY = 'grit_session';

let currentUserData = null;
let currentUsername = null;
let activeTimers = {};
let currentTimeFilter = 'any';

// Focus Timer State
let focusInterval = null;
let focusTimeLeft = 0;
let currentFocusHabit = null;

// ========================================
// HAPTICS & SOUND (MICRO-INTERACTIONS)
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
// SUPABASE & MIGRATION
// ========================================

async function supabaseRequest(method, endpoint, body = null) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
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
    { id: Date.now(), title: 'Deep Work', emoji: '👨‍💻', type: 'timer', target: 60, current: 0, streak: -1, color: 'green', isRunning: false, lastUpdated: '', schedule: { type: 'weekdays' }, timeOfDay: 'morning', history: {} },
    { id: Date.now()+1, title: 'Nutrition Plan', emoji: '🍳', type: 'checklist', target: 4, current: 0, streak: -1, color: 'orange', lastUpdated: '', schedule: { type: 'everyday' }, timeOfDay: 'any', history: {}, subtasks: [{title: 'Eggs', done: false}, {title: 'Milk', done: false}, {title: 'Cottage cheese', done: false}, {title: 'Bananas', done: false}] },
    { id: Date.now()+2, title: 'Plan Tomorrow', emoji: '📋', type: 'checkbox', target: 1, current: 0, streak: -1, color: 'purple', lastUpdated: '', schedule: { type: 'everyday' }, timeOfDay: 'evening', history: {} }
];

async function createUser(username, password) {
    const newUser = {
        username,
        password,
        xp: 0,
        streak_freezes: 2,
        stats: { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0 },
        settings: { target_bedtime: "23:00", target_wakeup: "08:30" },
        habits: JSON.parse(JSON.stringify(defaultHabits))
    };
    const res = await supabaseRequest('POST', TABLE_NAME, newUser);
    return res && res.length > 0 ? res[0] : null;
}

async function updateUser(username, data) {
    return await supabaseRequest('PATCH', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`, data);
}

function normalizeData(user) {
    if (!user.habits) user.habits = JSON.parse(JSON.stringify(defaultHabits));
    user.habits.forEach(h => {
        if (!h.schedule) h.schedule = { type: 'everyday' };
        if (!h.timeOfDay) h.timeOfDay = 'any';
        if (!h.history) h.history = {};
        if (h.type === 'checklist' && !h.subtasks) h.subtasks = [];
    });
    
    if (user.streak_freezes === undefined) user.streak_freezes = 2;
    if (!user.xp) user.xp = 0;
    if (!user.stats) user.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0 };
    if (!user.settings) user.settings = { target_bedtime: "23:00", target_wakeup: "08:30" };
    return user;
}

// ========================================
// AUTH & SESSION
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
    if (username.length < 2 || pass.length < 4) { err.textContent = 'Invalid username/pass length.'; return; }
    try {
        if (await getUser(username)) { err.textContent = 'User exists!'; return; }
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
        if (!user || user.password !== pass) { err.textContent = 'Invalid credentials!'; return; }
        currentUsername = username;
        currentUserData = normalizeData(user);
        localStorage.setItem(SESSION_KEY, username);
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-container').classList.add('active');
        initApp();
    } catch (e) { err.textContent = 'Login failed.'; }
}

function logoutUser() {
    currentUsername = null;
    currentUserData = null;
    localStorage.removeItem(SESSION_KEY);
    document.getElementById('app-container').classList.remove('active');
    document.getElementById('auth-screen').style.display = 'flex';
    Object.values(activeTimers).forEach(clearInterval);
    activeTimers = {};
}

// ========================================
// DATA IMPORT / EXPORT (BACKUP)
// ========================================

window.exportData = function() {
    if(!currentUserData) return;
    const dataStr = JSON.stringify(currentUserData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grit_backup_${getTodayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('📦 Backup exported!');
};

window.importData = function(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if(importedData.habits && importedData.stats) {
                currentUserData = normalizeData(importedData);
                await saveData();
                initApp();
                toast('🚀 Backup restored successfully!');
            } else {
                toast('❌ Invalid backup file format.', 'error');
            }
        } catch(err) {
            toast('❌ Error parsing JSON file.', 'error');
        }
        event.target.value = ''; // reset input
    };
    reader.readAsText(file);
};

// ========================================
// CORE APP LOGIC
// ========================================

function initApp() {
    checkNewDay();
    renderCalendar();
    renderHabits();
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
    if (tab === 'stats') { updateStatsUI(); renderHeatmap(); }
};

window.filterTime = function(time) {
    currentTimeFilter = time;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.time-btn[data-time="${time}"]`).classList.add('active');
    renderHabits();
};

// ========================================
// CALENDAR & SCHEDULES
// ========================================

function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function isHabitActiveToday(habit, dateObj = new Date()) {
    const dayOfWeek = dateObj.getDay(); // 0 - Sun, 1 - Mon...
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
            // Check yesterday
            if (h.current < h.target && h.lastUpdated !== '') {
                // If it was active, deal with freeze/loss
                if (currentUserData.streak_freezes > 0) {
                    currentUserData.streak_freezes--;
                    toast(`❄️ Streak frozen for: ${h.title}`);
                } else {
                    h.streak = -1; // Lost streak
                }
            }
            h.current = 0;
            h.isRunning = false;
            if(h.type === 'checklist' && h.subtasks) {
                h.subtasks.forEach(s => s.done = false);
            }
            h.lastUpdated = todayStr;
            needsSave = true;
        }
    });
    
    if (needsSave) saveData();
}

function renderCalendar() {
    const strip = document.getElementById('calendar-strip');
    strip.innerHTML = '';
    const today = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = -3; i <= 3; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const isToday = i === 0;
        const el = document.createElement('div');
        el.className = `cal-day ${isToday ? 'active' : ''}`;
        el.innerHTML = `<span>${days[d.getDay()]}</span><span class="date">${d.getDate()}</span>`;
        strip.appendChild(el);
    }
}

// ========================================
// HABITS RENDERING & ACTIONS
// ========================================

function renderHabits() {
    const container = document.getElementById('habits-list');
    container.innerHTML = '';
    
    const activeHabits = currentUserData.habits.filter(h => {
        const timeMatch = currentTimeFilter === 'any' || h.timeOfDay === currentTimeFilter || h.timeOfDay === 'any';
        const activeToday = isHabitActiveToday(h);
        return timeMatch && activeToday;
    });

    if (activeHabits.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top: 20px;">No habits for this filter today.</div>`;
        return;
    }
    
    activeHabits.forEach(h => {
        const isDone = h.current >= h.target;
        
        let streakHTML = '';
        if (h.streak > 0) {
            streakHTML = `<div class="streak-badge fire">🔥 ${h.streak}</div>`;
        } else if (h.streak < 0) {
            streakHTML = `<div class="streak-badge negative">${h.streak}</div>`;
        } else if (h.streak === 0 && currentUserData.streak_freezes > 0) {
             streakHTML = `<div class="streak-badge frozen">❄️ Freeze</div>`;
        }
        
        let scheduleText = h.schedule.type === 'weekdays' ? 'Weekdays' : 'Every day';
        let desc = scheduleText;
        let actionIcon = '<i class="ph ph-plus"></i>';
        let btnAction = `incrementHabit(${h.id})`;
        
        if (h.type === 'counter' || h.type === 'checklist') {
            desc = `${scheduleText}, ${h.current}/${h.target}`;
        } else if (h.type === 'timer') {
            desc = `${scheduleText}, ${h.current}/${h.target} min`;
            actionIcon = '<i class="ph-fill ph-play"></i>';
            btnAction = `openFocusTimer(${h.id})`;
        }
        
        if (isDone && h.type !== 'timer') {
            actionIcon = '<i class="ph-bold ph-check"></i>';
            btnAction = ''; 
        }

        let subtasksHTML = '';
        if (h.type === 'checklist' && h.subtasks && h.subtasks.length > 0) {
            subtasksHTML = '<div class="subtasks-container">';
            h.subtasks.forEach((st, idx) => {
                subtasksHTML += `
                    <div class="subtask-item ${st.done ? 'done' : ''}" onclick="toggleSubtask(${h.id}, ${idx})">
                        <div class="subtask-checkbox">${st.done ? '<i class="ph-bold ph-check"></i>' : ''}</div>
                        <span>${st.title}</span>
                    </div>
                `;
            });
            subtasksHTML += '</div>';
        }

        const card = document.createElement('div');
        card.className = `habit-card card-${h.color}`;
        card.innerHTML = `
            ${streakHTML}
            <div style="display:flex; flex-direction:column; width:100%;">
                <div class="habit-card-main">
                    <div class="habit-icon">${h.emoji}</div>
                    <div class="habit-info">
                        <div class="habit-title">${h.title}</div>
                        <div class="habit-desc">${desc}</div>
                    </div>
                    <button class="habit-action ${isDone ? 'done' : ''}" onclick="${btnAction}">
                        ${actionIcon}
                    </button>
                </div>
                ${subtasksHTML}
            </div>
        `;
        container.appendChild(card);
    });
}

async function saveData() {
    await updateUser(currentUsername, { 
        habits: currentUserData.habits,
        xp: currentUserData.xp,
        streak_freezes: currentUserData.streak_freezes,
        stats: currentUserData.stats,
        settings: currentUserData.settings
    });
}

function updateStreak(h) {
    if (h.streak < 0) h.streak = 1;
    else h.streak += 1;
}

// RPG Logic
function claimHabitReward(h) {
    let multiplier = 1.0;
    if (h.streak >= 30) multiplier = 2.0;
    else if (h.streak >= 7) multiplier = 1.5;
    else if (h.streak >= 3) multiplier = 1.2;

    const baseXP = 15;
    const totalXP = Math.floor(baseXP * multiplier);
    currentUserData.xp += totalXP;
    
    const s = currentUserData.stats;
    if (h.color === 'green') { s.int += 2; s.per += 1; }
    else if (h.color === 'purple') { s.per += 3; }
    else if (h.color === 'orange') { s.str += 2; s.end += 1; }
    else if (h.color === 'blue') { s.int += 1; s.agi += 2; }
    
    // Save to history
    const todayStr = getTodayString();
    h.history[todayStr] = { completed: true, insight: "" };
    
    const comboText = multiplier > 1.0 ? ` (Combo x${multiplier}!)` : '';
    toast(`+${totalXP} XP${comboText} | ${h.title}`);
    
    setTimeout(() => openInsightModal(h.id), 500);
}

window.incrementHabit = function(id) {
    const h = currentUserData.habits.find(x => x.id === id);
    if (!h || h.current >= h.target) return;
    
    triggerFeedback();
    h.current += 1;
    if (h.current === h.target) { 
        updateStreak(h);
        claimHabitReward(h);
    }
    
    renderHabits();
    saveData();
};

window.toggleSubtask = function(habitId, subtaskIdx) {
    const h = currentUserData.habits.find(x => x.id === habitId);
    if (!h || h.current >= h.target) return; // already done
    
    const st = h.subtasks[subtaskIdx];
    st.done = !st.done;
    triggerFeedback();
    
    h.current = h.subtasks.filter(x => x.done).length;
    if (h.current >= h.target) {
        updateStreak(h);
        claimHabitReward(h);
    }
    saveData();
    renderHabits();
};

// ========================================
// FOCUS TIMER (FULLSCREEN)
// ========================================

window.openFocusTimer = function(id) {
    const h = currentUserData.habits.find(x => x.id === id);
    if (!h || h.current >= h.target) {
        if(h && h.current >= h.target) toast('Habit already completed today!');
        return;
    }
    
    currentFocusHabit = h;
    focusTimeLeft = (h.target - h.current) * 60; // seconds
    
    document.getElementById('focus-title').textContent = h.title;
    document.getElementById('focus-overlay').style.display = 'flex';
    document.getElementById('focus-play-icon').className = 'ph-fill ph-pause';
    
    updateFocusDisplay();
    focusInterval = setInterval(focusTick, 1000);
};

function focusTick() {
    if (focusTimeLeft <= 0) {
        clearInterval(focusInterval);
        completeFocusSession();
        return;
    }
    focusTimeLeft--;
    updateFocusDisplay();
    
    // Sync progress every minute
    if (focusTimeLeft % 60 === 0) {
        currentFocusHabit.current += 1;
        saveData();
        renderHabits();
    }
}

function updateFocusDisplay() {
    const m = Math.floor(focusTimeLeft / 60).toString().padStart(2, '0');
    const s = (focusTimeLeft % 60).toString().padStart(2, '0');
    document.getElementById('focus-time-display').textContent = `${m}:${s}`;
    
    const totalSecs = currentFocusHabit.target * 60;
    const progress = 1 - (focusTimeLeft / totalSecs);
    const dashoffset = 283 - (283 * progress);
    document.getElementById('focus-progress-circle').style.strokeDashoffset = dashoffset;
}

window.toggleFocusTimer = function() {
    const icon = document.getElementById('focus-play-icon');
    if (focusInterval) {
        clearInterval(focusInterval); focusInterval = null;
        icon.className = 'ph-fill ph-play';
    } else {
        focusInterval = setInterval(focusTick, 1000);
        icon.className = 'ph-fill ph-pause';
    }
};

window.stopFocusTimer = function() {
    clearInterval(focusInterval);
    focusInterval = null;
    document.getElementById('focus-overlay').style.display = 'none';
    saveData(); renderHabits();
};

function completeFocusSession() {
    document.getElementById('focus-overlay').style.display = 'none';
    currentFocusHabit.current = currentFocusHabit.target;
    updateStreak(currentFocusHabit);
    claimHabitReward(currentFocusHabit);
    saveData(); renderHabits();
}

// ========================================
// INSIGHTS MODAL
// ========================================

window.openInsightModal = function(habitId) {
    document.getElementById('insight-habit-id').value = habitId;
    document.getElementById('insight-text').value = '';
    document.getElementById('insight-modal').classList.add('active');
}

window.closeInsightModal = function() {
    document.getElementById('insight-modal').classList.remove('active');
}

window.saveInsight = function() {
    const habitId = parseInt(document.getElementById('insight-habit-id').value);
    const text = document.getElementById('insight-text').value.trim();
    
    if (text !== '') {
        const h = currentUserData.habits.find(x => x.id === habitId);
        if (h) {
            const todayStr = getTodayString();
            if (!h.history[todayStr]) h.history[todayStr] = { completed: true };
            h.history[todayStr].insight = text;
            saveData();
            toast('Insight saved! 📝');
        }
    }
    closeInsightModal();
}

// ========================================
// HEATMAP
// ========================================

function renderHeatmap() {
    const container = document.getElementById('heatmap-container');
    if(!container) return;
    container.innerHTML = '';
    
    const today = new Date();
    // 60 days
    for(let i=59; i>=0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
        
        let totalDone = 0;
        currentUserData.habits.forEach(h => {
            if(h.history && h.history[dateStr] && h.history[dateStr].completed) {
                totalDone++;
            }
        });
        
        const cell = document.createElement('div');
        let level = 0;
        if (totalDone >= 3) level = 3;
        else if (totalDone === 2) level = 2;
        else if (totalDone === 1) level = 1;
        
        cell.className = `heatmap-cell level-${level}`;
        cell.title = `${dateStr}: ${totalDone} completed`;
        container.appendChild(cell);
    }
}

// ========================================
// RPG STATS UI
// ========================================

const AVATARS = [
    { level: 1, icon: 'ph-egg', name: 'Novice' },
    { level: 5, icon: 'ph-bird', name: 'Apprentice' },
    { level: 10, icon: 'ph-sword', name: 'Warrior' },
    { level: 20, icon: 'ph-crown', name: 'Master' }
];

function updateStatsUI() {
    if(!currentUserData) return;
    
    const xp = currentUserData.xp;
    const lvl = Math.floor(xp / 250) + 1;
    const curExp = xp % 250;
    
    let avatar = AVATARS[0];
    for(const a of AVATARS) { if(lvl >= a.level) avatar = a; }
    
    document.getElementById('profile-avatar-icon').className = `ph ${avatar.icon} doll-base`;
    document.getElementById('level-display').textContent = lvl;
    document.getElementById('title-display').textContent = avatar.name;
    document.getElementById('xp-text').textContent = `${curExp} / 250 XP`;
    document.getElementById('exp-bar').style.width = `${(curExp / 250) * 100}%`;
    
    const s = currentUserData.stats;
    document.getElementById('stat-str').textContent = s.str;
    document.getElementById('stat-end').textContent = s.end;
    document.getElementById('stat-agi').textContent = s.agi;
    document.getElementById('stat-int').textContent = s.int;
    document.getElementById('stat-per').textContent = s.per;
    document.getElementById('stat-freezes').textContent = currentUserData.streak_freezes;
}

// ========================================
// SETTINGS
// ========================================

window.saveSettings = async function() {
    const bed = document.getElementById('setting-bedtime').value;
    const wake = document.getElementById('setting-wakeup').value;
    if(bed && wake) {
        currentUserData.settings.target_bedtime = bed;
        currentUserData.settings.target_wakeup = wake;
        await saveData();
        toast('Schedule Saved!');
    }
};

window.resetProgress = async function() {
    if(confirm('Are you sure you want to reset all habits and RPG stats?')) {
        currentUserData.xp = 0;
        currentUserData.streak_freezes = 2;
        currentUserData.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0 };
        currentUserData.habits = JSON.parse(JSON.stringify(defaultHabits));
        
        await saveData();
        initApp();
        updateStatsUI();
        toast('Progress Reset');
    }
};

// ========================================
// ADD HABIT MODAL
// ========================================

window.addHabitModal = function() {
    document.getElementById('add-habit-modal').classList.add('active');
    document.getElementById('habit-type').onchange = (e) => {
        const tw = document.getElementById('target-wrapper');
        const sw = document.getElementById('subtasks-wrapper');
        if (e.target.value === 'checkbox') {
            tw.style.display = 'none';
            sw.style.display = 'none';
        } else if (e.target.value === 'checklist') {
            tw.style.display = 'none';
            sw.style.display = 'block';
        } else {
            tw.style.display = 'block';
            sw.style.display = 'none';
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
        subtasks = stText.split('\n').map(s => ({ title: s.trim(), done: false })).filter(s => s.title !== '');
        target = subtasks.length;
    }
    if ((type === 'counter' || type === 'timer') && (!target || target <= 0)) return toast('Enter valid target');
    
    const newH = {
        id: Date.now(),
        title, emoji, type, color, target,
        current: 0, streak: -1, isRunning: false, lastUpdated: getTodayString(),
        schedule: { type: scheduleType },
        timeOfDay: timeOfDay,
        history: {}
    };
    
    if (type === 'checklist') newH.subtasks = subtasks;
    
    currentUserData.habits.push(newH);
    saveData();
    renderHabits();
    document.getElementById('add-habit-modal').classList.remove('active');
    
    document.getElementById('habit-title').value = '';
    document.getElementById('habit-emoji').value = '';
    document.getElementById('habit-subtasks').value = '';
};

// Auto-login logic
const savedSession = localStorage.getItem(SESSION_KEY);
if (savedSession) {
    document.getElementById('login-username').value = savedSession;
}

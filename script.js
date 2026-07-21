alert('script.js загружен!');
console.log('✅ script.js загружен!');

// ========================================
//  ПОДКЛЮЧЕНИЕ К SUPABASE
// ========================================

const SUPABASE_URL = 'https://zjtudyoffdwqfamzczcb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqdHVkeW9mZmR3cWZhbXpjemNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTYxMDMsImV4cCI6MjEwMDE5MjEwM30.yO-fyi_hZv__XqMjz-OpuYNPAlKyaGT7KB4xscqHMNo';
const TABLE_NAME = 'players';

// ========================================
//  РАБОТА С "БАЗОЙ ДАННЫХ" ЧЕРЕЗ SUPABASE
// ========================================

let currentUserData = null;
let currentUsername = null;
let lastTrainTime = 0;
const EXP = 250;

// ========================================
//  ФУНКЦИИ ДЛЯ РАБОТЫ С SUPABASE
// ========================================

async function supabaseRequest(method, endpoint, body = null) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    const options = {
        method: method,
        headers: headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Supabase request failed:', error);
        throw error;
    }
}

async function getUserFromDB(username) {
    try {
        const result = await supabaseRequest('GET', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`);
        return result && result.length > 0 ? result[0] : null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

async function createUserInDB(username, password, email = '') {
    try {
        const newUser = {
            username: username,
            password: password,
            email: email || '',
            stats: { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 },
            inventory: [],
            completed_quests: [],
            current_quests: [],
            last_quest_date: '',
            last_sleep_date: ''
        };
        
        const result = await supabaseRequest('POST', TABLE_NAME, newUser);
        return result && result.length > 0 ? result[0] : null;
    } catch (error) {
        console.error('Error creating user:', error);
        return null;
    }
}

async function updateUserInDB(username, data) {
    try {
        const result = await supabaseRequest('PATCH', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`, data);
        return result && result.length > 0 ? result[0] : null;
    } catch (error) {
        console.error('Error updating user:', error);
        return null;
    }
}

async function validateUser(username, password) {
    const user = await getUserFromDB(username);
    if (!user) return false;
    return user.password === password;
}

// ========================================
//  СИСТЕМА АВТОРИЗАЦИИ
// ========================================

function getCurrentUser() {
    try {
        const data = localStorage.getItem('rpg_current_user');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

function setCurrentUser(username) {
    localStorage.setItem('rpg_current_user', JSON.stringify({ 
        username: username, 
        loginTime: new Date().toISOString() 
    }));
}

function clearCurrentUser() {
    localStorage.removeItem('rpg_current_user');
}

// ========================================
//  ФУНКЦИИ ДЛЯ UI АВТОРИЗАЦИИ
// ========================================

function switchAuthTab(tab) {
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

async function registerUser() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;
    const errorEl = document.getElementById('register-error');
    const successEl = document.getElementById('register-success');
    
    errorEl.textContent = '';
    successEl.textContent = '';
    
    if (!username || username.length < 2) {
        errorEl.textContent = '❌ Имя должно быть минимум 2 символа!';
        return;
    }
    if (!password || password.length < 4) {
        errorEl.textContent = '❌ Пароль должен быть минимум 4 символа!';
        return;
    }
    if (password !== password2) {
        errorEl.textContent = '❌ Пароли не совпадают!';
        return;
    }
    
    const existingUser = await getUserFromDB(username);
    if (existingUser) {
        errorEl.textContent = '❌ Пользователь уже существует!';
        return;
    }
    
    const newUser = await createUserInDB(username, password, email);
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
        errorEl.textContent = '❌ Ошибка создания аккаунта!';
    }
}

async function loginUser() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    errorEl.textContent = '';
    
    if (!username || !password) {
        errorEl.textContent = '❌ Введите имя и пароль!';
        return;
    }
    
    const user = await getUserFromDB(username);
    if (!user) {
        errorEl.textContent = '❌ Пользователь не найден!';
        return;
    }
    if (!await validateUser(username, password)) {
        errorEl.textContent = '❌ Неверный пароль!';
        return;
    }
    
    setCurrentUser(username);
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    
    // Загружаем игру
    await initGame();
}

function logoutUser() {
    if (confirm('Выйти из аккаунта?')) {
        clearCurrentUser();
        showAuthScreen();
    }
}

function showAuthScreen() {
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('game-container').classList.remove('active');
}

function showGameScreen() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('game-container').classList.add('active');
}

// ========================================
//  ОСНОВНАЯ ИГРОВАЯ ЛОГИКА
// ========================================

const TITLES_DATABASE = [
    { lvl: 30, text: "👾 Высший разум" }, { lvl: 25, text: "🪐 Абсолют" }, { lvl: 20, text: "🔮 Легенда" },
    { lvl: 15, text: "🌌 Полубог реала" }, { lvl: 12, text: "🔱 Грандмастер" }, { lvl: 10, text: "👑 Мировой Мастер" },
    { lvl: 9,  text: "🥷 Теневой Мастер" }, { lvl: 8,  text: "💎 Элита" }, { lvl: 7,  text: "🎯 Профи дисциплины" },
    { lvl: 6,  text: "🔥 Прокачанный" }, { lvl: 5,  text: "🦾 Местный авторитет" }, { lvl: 4,  text: "⚔️ Боец" },
    { lvl: 3,  text: "⚡ Заряженный" }, { lvl: 2,  text: "🌱 Начинающий атлет" }, { lvl: 1,  text: "🥚 Обыватель" }
];

const QUESTS_DATABASE = [
    { id: 'q1', title: "20 отжиманий на возвышении", desc: "Выполните 20 отжиманий с ногами на стуле.", stat: "str", points: 3, gold: 10, type: "purple" },
    { id: 'q2', title: "20 минут растяжки", desc: "Выполняйте базовые упражнения на растяжку.", stat: "agi", points: 2, gold: 10, type: "blue" },
    { id: 'q3', title: "15 минут наблюдения за природой", desc: "Понаблюдайте за птицами на улице 15 минут.", stat: "per", points: 2, gold: 10, type: "blue" },
    { id: 'q4', title: "60 минут уборки", desc: "Наведите идеальный порядок в своей комнате.", stat: "end", points: 3, gold: 15, type: "" },
    { id: 'q5', title: "25 минут учебы / кода", desc: "Поработайте над кодом 25 минут без пауз.", stat: "int", points: 3, gold: 20, type: "purple" }
];

const LOOT_POOL = {
    common: [{ name: "👟 Nike (+5 Выносл.)", stat: "end", bonus: 5 }, { name: "🏋️‍♂️ Эспандер (+5 Сила)", stat: "str", bonus: 5 }],
    epic: [{ name: "⌚ Rolex (+25 Харизма)", stat: "cha", bonus: 25 }, { name: "💻 Ноутбук (+25 Интелл.)", stat: "int", bonus: 25 }]
};

async function initGame() {
    const session = getCurrentUser();
    if (!session) {
        showAuthScreen();
        return;
    }
    
    currentUsername = session.username;
    const user = await getUserFromDB(currentUsername);
    if (!user) {
        clearCurrentUser();
        showAuthScreen();
        return;
    }
    
    currentUserData = user;
    showGameScreen();
    
    // Обновляем ник
    document.getElementById('user-nick').textContent = currentUsername;
    
    await checkDailyRotation();
    updateUI();
    renderQuests();
}

// ========================================
//  ИГРОВЫЕ ФУНКЦИИ
// ========================================

function switchTab(id, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if(document.getElementById(id)) document.getElementById(id).classList.add('active');
    if(btn) btn.classList.add('active');
}

async function checkDailyRotation() {
    if (!currentUserData) return;
    
    let todayStr = new Date().toDateString();
    
    if (currentUserData.last_quest_date !== todayStr || !currentUserData.current_quests || currentUserData.current_quests.length === 0) {
        let shuffled = [...QUESTS_DATABASE].sort(() => 0.5 - Math.random());
        currentUserData.current_quests = shuffled.slice(0, 3);
        currentUserData.completed_quests = currentUserData.completed_quests.filter(id => id.startsWith('w'));
        currentUserData.last_quest_date = todayStr;
        await saveUserData();
    }
}

function renderQuests() {
    const container = document.getElementById('quests-container');
    if (!container) return;
    
    if (!currentUserData || !currentUserData.current_quests || currentUserData.current_quests.length === 0) {
        container.innerHTML = `<div style="color:#8e8e93; text-align:center; padding:20px;">Нет активных квестов. Зайдите завтра!</div>`;
        return;
    }
    
    container.innerHTML = "";
    
    currentUserData.current_quests.forEach((q) => {
        let isDone = currentUserData.completed_quests.includes(q.id);
        let card = document.createElement('div');
        card.className = "quest-card";
        card.innerHTML = `
            <div class="quest-title">${q.title}</div>
            <div class="quest-desc">${q.desc}</div>
            <div class="quest-reward">➕ +${q.points} XP / +${q.gold} 🪙</div>
            <button class="action-btn ${q.type}" id="${q.id}" style="${isDone ? 'background:#2c2c2e; opacity:0.4; pointer-events:none;' : ''}" onclick="completeQuest('${q.id}', '${q.stat}', ${q.points}, ${q.gold})">${isDone ? 'Выполнено' : 'Выполнить'}</button>
        `;
        container.appendChild(card);
    });
}

async function checkSleepTime() {
    if (!currentUserData) {
        alert("Ошибка: данные пользователя не загружены!");
        return;
    }
    
    let now = new Date();
    let todayStr = now.toDateString();
    
    if (currentUserData.last_sleep_date === todayStr) {
        alert("Вы уже отметили сон сегодня!");
        return;
    }
    
    let hours = now.getHours();
    if (hours === 0 || hours >= 21) {
        currentUserData.stats.per += 10;
        currentUserData.stats.gold += 15;
        alert(`🏆 Отличный режим! Награда: +10 Восприятие / +15 🪙`);
    } else {
        currentUserData.stats.per = Math.max(0, currentUserData.stats.per - 10);
        alert(`⚠️ Режим нарушен! Штраф: -10 Восприятие.`);
    }
    
    currentUserData.last_sleep_date = todayStr;
    await saveUserData();
    updateUI();
}

function updateUI() {
    if (!currentUserData) return;
    
    const stats = currentUserData.stats;
    
    let total = stats.str + stats.end + stats.agi + stats.int + stats.cha + stats.per + stats.luck;
    let lvl = Math.floor(total / EXP) + 1;
    let curExp = total % EXP;
    
    ['str', 'end', 'agi', 'int', 'cha', 'per', 'luck'].forEach(id => {
        if(document.getElementById(id+'-val')) document.getElementById(id+'-val').textContent = stats[id] || 0;
    });
    
    if(document.getElementById('gold-val')) document.getElementById('gold-val').textContent = stats.gold || 0;
    if(document.getElementById('level-display')) document.getElementById('level-display').textContent = lvl;
    if(document.getElementById('user-level-badge')) document.getElementById('user-level-badge').textContent = 'Lv.' + lvl;
    if(document.getElementById('exp-display')) document.getElementById('exp-display').textContent = curExp + " / " + EXP + " XP";
    if(document.getElementById('exp-bar')) document.getElementById('exp-bar').style.width = (curExp / EXP * 100) + "%";

    let currentTitle = "🥚 Обыватель";
    for (let i = 0; i < TITLES_DATABASE.length; i++) {
        if (lvl >= TITLES_DATABASE[i].lvl) {
            currentTitle = TITLES_DATABASE[i].text;
            break;
        }
    }
    if(document.getElementById('title-display')) document.getElementById('title-display').textContent = currentTitle;

    ['ach-status', 'ach-prof'].forEach((id, i) => {
        let el = document.getElementById(id);
        if(el) {
            if(lvl >= (i === 0 ? 3 : 5)) el.classList.remove('locked');
            else el.classList.add('locked');
        }
    });

    let wBtn = document.getElementById('w1');
    if(wBtn) {
        if(currentUserData.completed_quests.includes('w1')) {
            wBtn.style.background = "#2c2c2e";
            wBtn.style.opacity = "0.4";
            wBtn.style.pointerEvents = "none";
            wBtn.textContent = "Выполнено";
        } else {
            wBtn.style.background = "linear-gradient(90deg, #ff5e00, #ff9500)";
            wBtn.style.opacity = "1";
            wBtn.style.pointerEvents = "auto";
            wBtn.textContent = "Выполнить";
        }
    }

    let sBtn = document.getElementById('sleep-action-btn');
    if(sBtn) {
        if(currentUserData.last_sleep_date === new Date().toDateString()) {
            sBtn.style.background = "#2c2c2e";
            sBtn.style.opacity = "0.4";
            sBtn.textContent = "💤 Отмечено";
        } else {
            sBtn.style.background = "linear-gradient(90deg, #0055ff, #0a84ff)";
            sBtn.style.opacity = "1";
            sBtn.textContent = "🛌 Лечь спать";
        }
    }

    let invList = document.getElementById('inventory-list');
    if(invList) {
        if(currentUserData.inventory && currentUserData.inventory.length > 0) {
            invList.innerHTML = "";
            currentUserData.inventory.forEach(item => {
                let span = document.createElement('span');
                span.className = "inv-item";
                span.textContent = item;
                invList.appendChild(span);
            });
        } else {
            invList.innerHTML = `<span style="color:#636366; font-style: italic;">У вас пока нет снаряжения...</span>`;
        }
    }
}

async function saveUserData() {
    if (!currentUserData || !currentUsername) return;
    
    try {
        const updateData = {
            stats: currentUserData.stats,
            inventory: currentUserData.inventory,
            completed_quests: currentUserData.completed_quests,
            current_quests: currentUserData.current_quests,
            last_quest_date: currentUserData.last_quest_date,
            last_sleep_date: currentUserData.last_sleep_date,
            last_login: new Date().toISOString()
        };
        
        await updateUserInDB(currentUsername, updateData);
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

async function train(type) {
    if (!currentUserData) {
        alert("Ошибка: данные пользователя не загружены!");
        return;
    }
    
    let now = Date.now();
    if (now - lastTrainTime < 1000) {
        alert("Подожди секунду между тренировками!");
        return;
    }
    lastTrainTime = now;
    
    currentUserData.stats[type] = (currentUserData.stats[type] || 0) + 10;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 2;
    await saveUserData();
    updateUI();
}

async function completeQuest(id, type, points, goldReward) {
    if (!currentUserData) {
        alert("Ошибка: данные пользователя не загружены!");
        return;
    }
    
    if (currentUserData.completed_quests.includes(id)) return;
    
    currentUserData.stats[type] = (currentUserData.stats[type] || 0) + points;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + goldReward;
    currentUserData.completed_quests.push(id);
    await saveUserData();
    updateUI();
    renderQuests();
}

async function completeWeeklyChallenge(btn) {
    if (!currentUserData) {
        alert("Ошибка: данные пользователя не загружены!");
        return;
    }
    
    if (currentUserData.completed_quests.includes('w1')) {
        alert("Вы уже выполнили еженедельный вызов!");
        return;
    }
    
    ['str', 'end', 'agi', 'int', 'cha', 'per'].forEach(id => currentUserData.stats[id] = (currentUserData.stats[id] || 0) + 8);
    currentUserData.stats.luck = (currentUserData.stats.luck || 0) + 15;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 100;
    currentUserData.completed_quests.push('w1');
    await saveUserData();
    updateUI();
    alert("⭐ Еженедельный вызов выполнен! +8 ко всем статам, +15 удачи, +100 монет!");
}

async function openChest(tier, price) {
    if (!currentUserData) {
        alert("Ошибка: данные пользователя не загружены!");
        return;
    }
    
    if ((currentUserData.stats.gold || 0) < price) {
        alert("Недостаточно монет!");
        return;
    }
    
    currentUserData.stats.gold -= price;
    let pool = LOOT_POOL[tier];
    let randomItem = pool[Math.floor(Math.random() * pool.length)];
    if(!currentUserData.inventory) currentUserData.inventory = [];
    currentUserData.inventory.push(randomItem.name);
    currentUserData.stats[randomItem.stat] = (currentUserData.stats[randomItem.stat] || 0) + randomItem.bonus;
    await saveUserData();
    updateUI();
    alert(`🎉 Вы выбили: ${randomItem.name}!`);
}

async function resetProgress() {
    if (!currentUserData) {
        alert("Ошибка: данные пользователя не загружены!");
        return;
    }
    
    if (!confirm(`Точно сбросить прогресс персонажа?`)) return;
    
    currentUserData.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 };
    currentUserData.completed_quests = [];
    currentUserData.inventory = [];
    currentUserData.current_quests = [];
    currentUserData.last_quest_date = "";
    currentUserData.last_sleep_date = "";
    await saveUserData();
    await checkDailyRotation();
    updateUI();
    renderQuests();
    alert("🗑️ Прогресс сброшен!");
}

// ========================================
//  ТАЙМЕРЫ
// ========================================

setInterval(() => {
    let n = new Date();
    let h = 23 - n.getHours(), m = 59 - n.getMinutes(), s = 59 - n.getSeconds();
    let dEl = document.getElementById('daily-timer');
    if(dEl) dEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    let wEl = document.getElementById('weekly-timer');
    if(wEl) {
        let daysLeft = 6 - (n.getDay() % 7);
        wEl.textContent = `${daysLeft}д ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    if (h === 0 && m === 0 && s === 0 && currentUserData) {
        checkDailyRotation();
    }
}, 1000);

// ========================================
//  ЗАПУСК
// ========================================

// Проверяем, есть ли активная сессия
const session = getCurrentUser();
if (session) {
    initGame();
} else {
    showAuthScreen();
}

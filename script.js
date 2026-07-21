// ========================================
//  СИСТЕМА АВТОРИЗАЦИИ (ПСЕВДО-БД В LOCALSTORAGE)
// ========================================

const DB_KEY = 'rpg_users_db';
const SESSION_KEY = 'rpg_current_user';

// ========================================
//  РАБОТА С "БАЗОЙ ДАННЫХ"
// ========================================

function getDB() {
    try {
        const data = localStorage.getItem(DB_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        return {};
    }
}

function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getUser(username) {
    const db = getDB();
    return db[username] || null;
}

function createUser(username, password, email = '') {
    const db = getDB();
    if (db[username]) return false;
    
    db[username] = {
        password: password,
        email: email || '',
        createdAt: new Date().toISOString(),
        stats: {
            str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, 
            luck: 0, gold: 0
        },
        completedQuests: [],
        inventory: [],
        currentQuests: [],
        lastQuestDate: "",
        lastSleepDate: ""
    };
    
    saveDB(db);
    return true;
}

function validateUser(username, password) {
    const user = getUser(username);
    if (!user) return false;
    return user.password === password;
}

function getCurrentUser() {
    try {
        const data = localStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

function setCurrentUser(username) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ 
        username: username, 
        loginTime: new Date().toISOString() 
    }));
}

function clearCurrentUser() {
    localStorage.removeItem(SESSION_KEY);
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

function registerUser() {
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
    if (getUser(username)) {
        errorEl.textContent = '❌ Пользователь уже существует!';
        return;
    }
    
    if (createUser(username, password, email)) {
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
    }
}

function loginUser() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    errorEl.textContent = '';
    
    if (!username || !password) {
        errorEl.textContent = '❌ Введите имя и пароль!';
        return;
    }
    if (!getUser(username)) {
        errorEl.textContent = '❌ Пользователь не найден!';
        return;
    }
    if (!validateUser(username, password)) {
        errorEl.textContent = '❌ Неверный пароль!';
        return;
    }
    
    setCurrentUser(username);
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    
    // Загружаем игру
    initGame();
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

const EXP = 250;
let lastTrainTime = 0;
let currentUserData = null;

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

function getStats() {
    return currentUserData ? currentUserData.stats : null;
}

function saveUserData() {
    if (!currentUserData) return;
    const db = getDB();
    const session = getCurrentUser();
    if (session && db[session.username]) {
        db[session.username] = currentUserData;
        saveDB(db);
    }
}

function initGame() {
    const session = getCurrentUser();
    if (!session) {
        showAuthScreen();
        return;
    }
    
    const user = getUser(session.username);
    if (!user) {
        clearCurrentUser();
        showAuthScreen();
        return;
    }
    
    currentUserData = user;
    showGameScreen();
    
    // Обновляем ник
    document.getElementById('user-nick').textContent = session.username;
    
    checkDailyRotation();
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

function checkDailyRotation() {
    if (!currentUserData) return;
    
    let todayStr = new Date().toDateString();
    
    if (currentUserData.lastQuestDate !== todayStr || !currentUserData.currentQuests || currentUserData.currentQuests.length === 0) {
        let shuffled = [...QUESTS_DATABASE].sort(() => 0.5 - Math.random());
        currentUserData.currentQuests = shuffled.slice(0, 3);
        currentUserData.completedQuests = currentUserData.completedQuests.filter(id => id.startsWith('w'));
        currentUserData.lastQuestDate = todayStr;
        saveUserData();
    }
}

function renderQuests() {
    const container = document.getElementById('quests-container');
    if (!container) return;
    
    if (!currentUserData || !currentUserData.currentQuests || currentUserData.currentQuests.length === 0) {
        container.innerHTML = `<div style="color:#8e8e93; text-align:center; padding:20px;">Нет активных квестов. Зайдите завтра!</div>`;
        return;
    }
    
    container.innerHTML = "";
    
    currentUserData.currentQuests.forEach((q) => {
        let isDone = currentUserData.completedQuests.includes(q.id);
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

function checkSleepTime() {
    if (!currentUserData) {
        alert("Ошибка: данные пользователя не загружены!");
        return;
    }
    
    let now = new Date();
    let todayStr = now.toDateString();
    
    if (currentUserData.lastSleepDate === todayStr) {
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
    
    currentUserData.lastSleepDate = todayStr;
    saveUserData();
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
        if(currentUserData.completedQuests.includes('w1')) {
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
        if(currentUserData.lastSleepDate === new Date().toDateString()) {
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

function train(type) {
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
    saveUserData();
    updateUI();
}

function completeQuest(id, type, points, goldReward) {
    if (!currentUserData) {
        alert("Ошибка: данные пользователя не загружены!");
        return;
    }
    
    if (currentUserData.completedQuests.includes(id)) return;
    
    currentUserData.stats[type] = (currentUserData.stats[type] || 0) + points;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + goldReward;
    currentUserData.completedQuests.push(id);
    saveUserData();
    updateUI();
    renderQuests();
}

function completeWeeklyChallenge(btn) {
    if (!currentUserData) {
        alert("Ошибка: данные пользователя не загружены!");
        return;
    }
    
    if (currentUserData.completedQuests.includes('w1')) {
        alert("Вы уже выполнили еженедельный вызов!");
        return;
    }
    
    ['str', 'end', 'agi', 'int', 'cha', 'per'].forEach(id => currentUserData.stats[id] = (currentUserData.stats[id] || 0) + 8);
    currentUserData.stats.luck = (currentUserData.stats.luck || 0) + 15;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 100;
    currentUserData.completedQuests.push('w1');
    saveUserData();
    updateUI();
    alert("⭐ Еженедельный вызов выполнен! +8 ко всем статам, +15 удачи, +100 монет!");
}

function openChest(tier, price) {
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
    saveUserData();
    updateUI();
    alert(`🎉 Вы выбили: ${randomItem.name}!`);
}

function resetProgress() {
    if (!currentUserData) {
        alert("Ошибка: данные пользователя не загружены!");
        return;
    }
    
    if (!confirm(`Точно сбросить прогресс персонажа?`)) return;
    
    currentUserData.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 };
    currentUserData.completedQuests = [];
    currentUserData.inventory = [];
    currentUserData.currentQuests = [];
    currentUserData.lastQuestDate = "";
    currentUserData.lastSleepDate = "";
    saveUserData();
    checkDailyRotation();
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
        let shuffled = [...QUESTS_DATABASE].sort(() => 0.5 - Math.random());
        currentUserData.currentQuests = shuffled.slice(0, 3);
        currentUserData.completedQuests = currentUserData.completedQuests.filter(id => id.startsWith('w'));
        currentUserData.lastQuestDate = new Date().toDateString();
        saveUserData();
        renderQuests();
        updateUI();
    }
}, 1000);

// ========================================
//  ЗАПУСК
// ========================================

// Проверяем, есть ли активная сессия
const session = getCurrentUser();
if (session && getUser(session.username)) {
    initGame();
} else {
    showAuthScreen();
}

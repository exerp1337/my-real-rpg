// ========================================
//  ПОДКЛЮЧЕНИЕ К SUPABASE
// ========================================

const SUPABASE_URL = 'https://zjtudyoffdwqfamzczcb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqdHVkeW9mZmR3cWZhbXpjemNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTYxMDMsImV4cCI6MjEwMDE5MjEwM30.yO-fyi_hZv__XqMjz-OpuYNPAlKyaGT7KB4xscqHMNo';
const TABLE_NAME = 'players';

// ========================================
//  СОСТОЯНИЕ
// ========================================

let currentUserData = null;
let currentUsername = null;
let lastTrainTime = 0;
const EXP = 250;

// ========================================
//  БАЗЫ ДАННЫХ (НАЗВАНИЯ И Т.Д.)
// ========================================

const TITLES_DATABASE = [
    { lvl: 30, text: "👾 Высший разум" },
    { lvl: 25, text: "🪐 Абсолют" },
    { lvl: 20, text: "🔮 Легенда" },
    { lvl: 15, text: "🌌 Полубог реала" },
    { lvl: 12, text: "🔱 Грандмастер" },
    { lvl: 10, text: "👑 Мировой Мастер" },
    { lvl: 9,  text: "🥷 Теневой Мастер" },
    { lvl: 8,  text: "💎 Элита" },
    { lvl: 7,  text: "🎯 Профи дисциплины" },
    { lvl: 6,  text: "🔥 Прокачанный" },
    { lvl: 5,  text: "🦾 Местный авторитет" },
    { lvl: 4,  text: "⚔️ Боец" },
    { lvl: 3,  text: "⚡ Заряженный" },
    { lvl: 2,  text: "🌱 Начинающий атлет" },
    { lvl: 1,  text: "🥚 Обыватель" }
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

// ========================================
//  ЗАПРОСЫ К SUPABASE
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
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
    }
    return await response.json();
}

async function getUser(username) {
    const result = await supabaseRequest('GET', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`);
    return result && result.length > 0 ? result[0] : null;
}

async function createUser(username, password, email = '') {
    const newUser = {
        username,
        password,
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
}

async function updateUser(username, data) {
    const result = await supabaseRequest('PATCH', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`, data);
    return result && result.length > 0 ? result[0] : null;
}

// ========================================
//  АВТОРИЗАЦИЯ
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

async function loginUser() {
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
        currentUsername = username;
        currentUserData = user;
        showGameScreen();
        document.getElementById('user-nick').textContent = username;
        await checkDailyRotation();
        updateUI();
        renderQuests();
    } catch (e) {
        errorEl.textContent = '❌ Ошибка: ' + e.message;
    }
}

function logoutUser() {
    if (confirm('Выйти из аккаунта?')) {
        currentUsername = null;
        currentUserData = null;
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
//  ИГРОВАЯ ЛОГИКА
// ========================================

function switchTab(id, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (btn) btn.classList.add('active');
}

async function checkDailyRotation() {
    if (!currentUserData) return;
    const today = new Date().toDateString();
    if (currentUserData.last_quest_date !== today || !currentUserData.current_quests?.length) {
        const shuffled = [...QUESTS_DATABASE].sort(() => 0.5 - Math.random());
        currentUserData.current_quests = shuffled.slice(0, 3);
        currentUserData.completed_quests = currentUserData.completed_quests?.filter(id => id.startsWith('w')) || [];
        currentUserData.last_quest_date = today;
        await saveUserData();
    }
}

function renderQuests() {
    const container = document.getElementById('quests-container');
    if (!container) return;
    if (!currentUserData?.current_quests?.length) {
        container.innerHTML = `<div style="color:#8e8e93; text-align:center; padding:20px;">Нет активных квестов. Зайдите завтра!</div>`;
        return;
    }
    container.innerHTML = '';
    currentUserData.current_quests.forEach(q => {
        const isDone = currentUserData.completed_quests.includes(q.id);
        const card = document.createElement('div');
        card.className = 'quest-card';
        card.innerHTML = `
            <div class="quest-title">${q.title}</div>
            <div class="quest-desc">${q.desc}</div>
            <div class="quest-reward">➕ +${q.points} XP / +${q.gold} 🪙</div>
            <button class="action-btn ${q.type}" id="${q.id}" style="${isDone ? 'background:#2c2c2e; opacity:0.4; pointer-events:none;' : ''}" onclick="completeQuest('${q.id}', '${q.stat}', ${q.points}, ${q.gold})">${isDone ? 'Выполнено' : 'Выполнить'}</button>
        `;
        container.appendChild(card);
    });
}

function updateUI() {
    if (!currentUserData) return;
    const stats = currentUserData.stats;
    const total = stats.str + stats.end + stats.agi + stats.int + stats.cha + stats.per + stats.luck;
    const lvl = Math.floor(total / EXP) + 1;
    const curExp = total % EXP;

    ['str', 'end', 'agi', 'int', 'cha', 'per', 'luck'].forEach(id => {
        const el = document.getElementById(id + '-val');
        if (el) el.textContent = stats[id] || 0;
    });
    document.getElementById('gold-val').textContent = stats.gold || 0;
    document.getElementById('level-display').textContent = lvl;
    document.getElementById('user-level-badge').textContent = 'Lv.' + lvl;
    document.getElementById('exp-display').textContent = curExp + ' / ' + EXP + ' XP';
    document.getElementById('exp-bar').style.width = (curExp / EXP * 100) + '%';

    let title = '🥚 Обыватель';
    for (const t of TITLES_DATABASE) {
        if (lvl >= t.lvl) { title = t.text; break; }
    }
    document.getElementById('title-display').textContent = title;

    ['ach-status', 'ach-prof'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) {
            const need = i === 0 ? 3 : 5;
            if (lvl >= need) el.classList.remove('locked');
            else el.classList.add('locked');
        }
    });

    // Weekly button
    const wBtn = document.getElementById('w1');
    if (wBtn) {
        if (currentUserData.completed_quests.includes('w1')) {
            wBtn.style.background = '#2c2c2e';
            wBtn.style.opacity = '0.4';
            wBtn.style.pointerEvents = 'none';
            wBtn.textContent = 'Выполнено';
        } else {
            wBtn.style.background = 'linear-gradient(90deg, #ff5e00, #ff9500)';
            wBtn.style.opacity = '1';
            wBtn.style.pointerEvents = 'auto';
            wBtn.textContent = 'Выполнить';
        }
    }

    // Sleep button
    const sBtn = document.getElementById('sleep-action-btn');
    if (sBtn) {
        if (currentUserData.last_sleep_date === new Date().toDateString()) {
            sBtn.style.background = '#2c2c2e';
            sBtn.style.opacity = '0.4';
            sBtn.textContent = '💤 Отмечено';
        } else {
            sBtn.style.background = 'linear-gradient(90deg, #0055ff, #0a84ff)';
            sBtn.style.opacity = '1';
            sBtn.textContent = '🛌 Лечь спать';
        }
    }

    // Inventory
    const invList = document.getElementById('inventory-list');
    if (invList) {
        if (currentUserData.inventory?.length) {
            invList.innerHTML = currentUserData.inventory.map(item => `<span class="inv-item">${item}</span>`).join('');
        } else {
            invList.innerHTML = `<span style="color:#636366; font-style: italic;">У вас пока нет снаряжения...</span>`;
        }
    }
}

async function saveUserData() {
    if (!currentUserData || !currentUsername) return;
    try {
        await updateUser(currentUsername, {
            stats: currentUserData.stats,
            inventory: currentUserData.inventory,
            completed_quests: currentUserData.completed_quests,
            current_quests: currentUserData.current_quests,
            last_quest_date: currentUserData.last_quest_date,
            last_sleep_date: currentUserData.last_sleep_date
        });
        console.log('✅ Saved');
    } catch (e) {
        console.error('❌ Save error', e);
    }
}

async function train(type) {
    if (!currentUserData) return;
    const now = Date.now();
    if (now - lastTrainTime < 1000) {
        alert('Подожди секунду!');
        return;
    }
    lastTrainTime = now;
    currentUserData.stats[type] = (currentUserData.stats[type] || 0) + 10;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 2;
    await saveUserData();
    updateUI();
}

async function checkSleepTime() {
    if (!currentUserData) return;
    const now = new Date();
    const today = now.toDateString();
    if (currentUserData.last_sleep_date === today) {
        alert('Вы уже отметили сон сегодня!');
        return;
    }
    const hours = now.getHours();
    if (hours === 0 || hours >= 21) {
        currentUserData.stats.per += 10;
        currentUserData.stats.gold += 15;
        alert('🏆 Отличный режим! +10 Восприятие / +15 🪙');
    } else {
        currentUserData.stats.per = Math.max(0, currentUserData.stats.per - 10);
        alert('⚠️ Режим нарушен! -10 Восприятие.');
    }
    currentUserData.last_sleep_date = today;
    await saveUserData();
    updateUI();
}

async function completeQuest(id, type, points, gold) {
    if (!currentUserData || currentUserData.completed_quests.includes(id)) return;
    currentUserData.stats[type] = (currentUserData.stats[type] || 0) + points;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + gold;
    currentUserData.completed_quests.push(id);
    await saveUserData();
    updateUI();
    renderQuests();
}

async function completeWeeklyChallenge(btn) {
    if (!currentUserData || currentUserData.completed_quests.includes('w1')) {
        alert('Вы уже выполнили вызов!');
        return;
    }
    ['str', 'end', 'agi', 'int', 'cha', 'per'].forEach(id => currentUserData.stats[id] = (currentUserData.stats[id] || 0) + 8);
    currentUserData.stats.luck = (currentUserData.stats.luck || 0) + 15;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 100;
    currentUserData.completed_quests.push('w1');
    await saveUserData();
    updateUI();
    alert('⭐ Вызов выполнен!');
}

async function openChest(tier, price) {
    if (!currentUserData) return;
    if (currentUserData.stats.gold < price) {
        alert('Недостаточно монет!');
        return;
    }
    currentUserData.stats.gold -= price;
    const pool = LOOT_POOL[tier];
    const item = pool[Math.floor(Math.random() * pool.length)];
    if (!currentUserData.inventory) currentUserData.inventory = [];
    currentUserData.inventory.push(item.name);
    currentUserData.stats[item.stat] = (currentUserData.stats[item.stat] || 0) + item.bonus;
    await saveUserData();
    updateUI();
    alert(`🎉 Вы выбили: ${item.name}!`);
}

async function resetProgress() {
    if (!currentUserData) return;
    if (!confirm('Сбросить прогресс?')) return;
    currentUserData.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 };
    currentUserData.completed_quests = [];
    currentUserData.inventory = [];
    currentUserData.current_quests = [];
    currentUserData.last_quest_date = '';
    currentUserData.last_sleep_date = '';
    await saveUserData();
    await checkDailyRotation();
    updateUI();
    renderQuests();
    alert('🗑️ Прогресс сброшен!');
}

// ========================================
//  ТАЙМЕРЫ
// ========================================

setInterval(() => {
    const n = new Date();
    let h = 23 - n.getHours(), m = 59 - n.getMinutes(), s = 59 - n.getSeconds();
    document.getElementById('daily-timer').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const daysLeft = 6 - (n.getDay() % 7);
    document.getElementById('weekly-timer').textContent = `${daysLeft}д ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (h === 0 && m === 0 && s === 0 && currentUserData) {
        checkDailyRotation();
    }
}, 1000);

// ========================================
//  ЗАПУСК
// ========================================

console.log('✅ Игра запущена!');
showAuthScreen();

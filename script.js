// ========================================
//  СИСТЕМА ПРОФИЛЕЙ
// ========================================

const PROFILES_KEY = 'rpg_profiles_data';
let currentProfileName = null;
let profiles = {};
let stats = {}; // Будет заполняться из текущего профиля

// Базовый шаблон нового персонажа
function createNewProfile(name) {
    return {
        name: name,
        stats: {
            str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, 
            luck: 0, gold: 0
        },
        completedQuests: [],
        inventory: [],
        currentQuests: [],
        lastQuestDate: "",
        lastSleepDate: "",
        createdAt: new Date().toISOString(),
        lastPlayed: new Date().toISOString()
    };
}

// Загрузка всех профилей
function loadProfiles() {
    try {
        const data = localStorage.getItem(PROFILES_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            profiles = parsed.profiles || {};
            currentProfileName = parsed.currentProfile || null;
        } else {
            profiles = {};
            currentProfileName = null;
        }
    } catch (e) {
        console.error("Ошибка загрузки профилей:", e);
        profiles = {};
        currentProfileName = null;
    }
}

// Сохранение всех профилей
function saveProfiles() {
    try {
        const data = {
            profiles: profiles,
            currentProfile: currentProfileName
        };
        localStorage.setItem(PROFILES_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Ошибка сохранения профилей:", e);
    }
}

// Загрузка текущего профиля
function loadCurrentProfile() {
    if (currentProfileName && profiles[currentProfileName]) {
        stats = profiles[currentProfileName].stats;
        // Дополнительные поля тоже загружаем в глобальные переменные
        // (можно оставить как есть, просто обновим stats)
        return true;
    }
    return false;
}

// Переключение профиля
function switchProfile(name) {
    if (!profiles[name]) {
        console.error("Профиль не найден:", name);
        return false;
    }
    currentProfileName = name;
    stats = profiles[name].stats;
    saveProfiles();
    // Обновляем все UI
    checkDailyRotation();
    updateUI();
    renderQuests();
    updateProfileSelector();
    return true;
}

// Создание нового профиля
function createProfile(name) {
    // Проверка на дубликат
    if (profiles[name]) {
        alert(`Профиль "${name}" уже существует!`);
        return false;
    }
    
    // Проверка на пустое имя
    if (!name || name.trim() === "") {
        alert("Введите имя персонажа!");
        return false;
    }
    
    // Создаем профиль
    profiles[name] = createNewProfile(name);
    currentProfileName = name;
    stats = profiles[name].stats;
    saveProfiles();
    
    // Обновляем UI
    checkDailyRotation();
    updateUI();
    renderQuests();
    updateProfileSelector();
    
    alert(`✨ Персонаж "${name}" создан! Добро пожаловать в игру!`);
    return true;
}

// Удаление профиля
function deleteProfile(name) {
    if (!profiles[name]) {
        alert("Профиль не найден!");
        return;
    }
    
    if (name === currentProfileName) {
        alert("Нельзя удалить активный профиль! Сначала переключитесь на другой.");
        return;
    }
    
    if (!confirm(`Точно удалить персонажа "${name}"? Все данные будут потеряны!`)) {
        return;
    }
    
    delete profiles[name];
    saveProfiles();
    updateProfileSelector();
    alert(`🗑️ Профиль "${name}" удален.`);
}

// ========================================
//  ОСТАЛЬНАЯ ЛОГИКА (АДАПТИРОВАНА)
// ========================================

const EXP = 250;
let lastTrainTime = 0;

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

// ========================================
//  ФУНКЦИИ ДЛЯ РАБОТЫ С ПРОФИЛЕМ В UI
// ========================================

// Обновление селектора профилей
function updateProfileSelector() {
    const container = document.getElementById('profile-selector');
    if (!container) return;
    
    const names = Object.keys(profiles);
    
    if (names.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 10px; color: #8e8e93;">
                Нет персонажей. Создайте первого!
            </div>
        `;
        return;
    }
    
    let html = `<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">`;
    
    names.forEach(name => {
        const isActive = name === currentProfileName;
        const profile = profiles[name];
        const total = profile ? 
            profile.stats.str + profile.stats.end + profile.stats.agi + 
            profile.stats.int + profile.stats.cha + profile.stats.per + profile.stats.luck : 0;
        const lvl = Math.floor(total / EXP) + 1;
        
        html += `
            <button onclick="switchProfile('${name}')" 
                    style="
                        background: ${isActive ? '#2c2c2e' : '#1c1c1e'};
                        border: ${isActive ? '2px solid #ff9500' : '1px solid #3a3a3c'};
                        color: ${isActive ? '#ff9500' : '#ffffff'};
                        padding: 8px 16px;
                        border-radius: 12px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 13px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        touch-action: manipulation;
                    "
                    onmouseover="this.style.background='#2c2c2e'"
                    onmouseout="this.style.background='${isActive ? '#2c2c2e' : '#1c1c1e'}'">
                ${isActive ? '▶' : ''} ${name} (${lvl} ур.)
                ${!isActive ? `<span onclick="event.stopPropagation(); deleteProfile('${name}')" style="color:#ff453a; margin-left:4px; cursor:pointer;">✕</span>` : ''}
            </button>
        `;
    });
    
    html += `
        <button onclick="showCreateProfileModal()" 
                style="
                    background: #0a84ff;
                    border: none;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 13px;
                    touch-action: manipulation;
                "
                onmouseover="this.style.background='#0066cc'"
                onmouseout="this.style.background='#0a84ff'">
            ➕ Создать
        </button>
    `;
    
    html += `</div>`;
    container.innerHTML = html;
}

// Модалка создания профиля
function showCreateProfileModal() {
    const name = prompt("Введите имя нового персонажа:", "Игрок" + (Object.keys(profiles).length + 1));
    if (name !== null) {
        createProfile(name.trim());
    }
}

// ========================================
//  ОСНОВНАЯ ИГРОВАЯ ЛОГИКА (АДАПТИРОВАНА)
// ========================================

function switchTab(id, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if(document.getElementById(id)) document.getElementById(id).classList.add('active');
    if(btn) btn.classList.add('active');
}

function checkDailyRotation() {
    if (!currentProfileName || !profiles[currentProfileName]) return;
    
    const profile = profiles[currentProfileName];
    let todayStr = new Date().toDateString();
    
    if (profile.lastQuestDate !== todayStr || !profile.currentQuests || profile.currentQuests.length === 0) {
        let shuffled = [...QUESTS_DATABASE].sort(() => 0.5 - Math.random());
        profile.currentQuests = shuffled.slice(0, 3);
        profile.completedQuests = profile.completedQuests.filter(id => id.startsWith('w'));
        profile.lastQuestDate = todayStr;
        saveProfiles();
    }
}

function renderQuests() {
    const container = document.getElementById('quests-container');
    if (!container) return;
    
    if (!currentProfileName || !profiles[currentProfileName]) {
        container.innerHTML = `<div style="color:#8e8e93; text-align:center; padding:20px;">Создайте персонажа, чтобы видеть квесты</div>`;
        return;
    }
    
    const profile = profiles[currentProfileName];
    container.innerHTML = "";
    
    profile.currentQuests.forEach((q) => {
        let isDone = profile.completedQuests.includes(q.id);
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
    if (!currentProfileName || !profiles[currentProfileName]) {
        alert("Сначала создайте персонажа!");
        return;
    }
    
    const profile = profiles[currentProfileName];
    let now = new Date();
    let todayStr = now.toDateString();
    
    if (profile.lastSleepDate === todayStr) {
        alert("Вы уже отметили сон сегодня!");
        return;
    }
    
    let hours = now.getHours();
    if (hours === 0 || hours >= 21) {
        profile.stats.per += 10;
        profile.stats.gold += 15;
        alert(`🏆 Отличный режим! Награда: +10 Восприятие / +15 🪙`);
    } else {
        profile.stats.per = Math.max(0, profile.stats.per - 10);
        alert(`⚠️ Режим нарушен! Штраф: -10 Восприятие.`);
    }
    
    profile.lastSleepDate = todayStr;
    stats = profile.stats;
    saveProfiles();
    updateUI();
}

function updateUI() {
    if (!currentProfileName || !profiles[currentProfileName]) {
        // Показываем приглашение создать персонажа
        document.querySelectorAll('.stat-item span:last-child').forEach(el => el.textContent = '-');
        if(document.getElementById('gold-val')) document.getElementById('gold-val').textContent = '0';
        if(document.getElementById('level-display')) document.getElementById('level-display').textContent = '?';
        if(document.getElementById('title-display')) document.getElementById('title-display').textContent = '👤 Нет персонажа';
        if(document.getElementById('exp-display')) document.getElementById('exp-display').textContent = 'Создайте персонажа!';
        if(document.getElementById('exp-bar')) document.getElementById('exp-bar').style.width = '0%';
        
        const invList = document.getElementById('inventory-list');
        if(invList) invList.innerHTML = `<span style="color:#636366; font-style: italic;">Создайте персонажа, чтобы видеть инвентарь</span>`;
        
        // Обновляем кнопку сна
        const sBtn = document.getElementById('sleep-action-btn');
        if(sBtn) {
            sBtn.style.background = "#2c2c2e";
            sBtn.style.opacity = "0.4";
            sBtn.textContent = "🚫 Нет персонажа";
        }
        
        updateProfileSelector();
        return;
    }
    
    const profile = profiles[currentProfileName];
    stats = profile.stats;
    
    let total = stats.str + stats.end + stats.agi + stats.int + stats.cha + stats.per + stats.luck;
    let lvl = Math.floor(total / EXP) + 1;
    let curExp = total % EXP;
    
    ['str', 'end', 'agi', 'int', 'cha', 'per', 'luck'].forEach(id => {
        if(document.getElementById(id+'-val')) document.getElementById(id+'-val').textContent = stats[id] || 0;
    });
    
    if(document.getElementById('gold-val')) document.getElementById('gold-val').textContent = stats.gold || 0;
    if(document.getElementById('level-display')) document.getElementById('level-display').textContent = lvl;
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

    // Ачивки
    ['ach-status', 'ach-prof'].forEach((id, i) => {
        let el = document.getElementById(id);
        if(el) {
            if(lvl >= (i === 0 ? 3 : 5)) el.classList.remove('locked');
            else el.classList.add('locked');
        }
    });

    // Weekly challenge
    let wBtn = document.getElementById('w1');
    if(wBtn) {
        if(profile.completedQuests.includes('w1')) {
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

    // Sleep button
    let sBtn = document.getElementById('sleep-action-btn');
    if(sBtn) {
        if(profile.lastSleepDate === new Date().toDateString()) {
            sBtn.style.background = "#2c2c2e";
            sBtn.style.opacity = "0.4";
            sBtn.textContent = "💤 Отмечено";
        } else {
            sBtn.style.background = "linear-gradient(90deg, #0055ff, #0a84ff)";
            sBtn.style.opacity = "1";
            sBtn.textContent = "🛌 Лечь спать";
        }
    }

    // Inventory
    let invList = document.getElementById('inventory-list');
    if(invList) {
        if(profile.inventory && profile.inventory.length > 0) {
            invList.innerHTML = "";
            profile.inventory.forEach(item => {
                let span = document.createElement('span');
                span.className = "inv-item";
                span.textContent = item;
                invList.appendChild(span);
            });
        } else {
            invList.innerHTML = `<span style="color:#636366; font-style: italic;">У вас пока нет снаряжения...</span>`;
        }
    }
    
    updateProfileSelector();
}

// ========================================
//  ИГРОВЫЕ ДЕЙСТВИЯ
// ========================================

function train(type) {
    if (!currentProfileName || !profiles[currentProfileName]) {
        alert("Сначала создайте персонажа!");
        return;
    }
    
    let now = Date.now();
    if (now - lastTrainTime < 1000) {
        alert("Подожди секунду между тренировками!");
        return;
    }
    lastTrainTime = now;
    
    const profile = profiles[currentProfileName];
    profile.stats[type] = (profile.stats[type] || 0) + 10;
    profile.stats.gold = (profile.stats.gold || 0) + 2;
    stats = profile.stats;
    saveProfiles();
    updateUI();
}

function completeQuest(id, type, points, goldReward) {
    if (!currentProfileName || !profiles[currentProfileName]) {
        alert("Сначала создайте персонажа!");
        return;
    }
    
    const profile = profiles[currentProfileName];
    if (profile.completedQuests.includes(id)) return;
    
    profile.stats[type] = (profile.stats[type] || 0) + points;
    profile.stats.gold = (profile.stats.gold || 0) + goldReward;
    profile.completedQuests.push(id);
    stats = profile.stats;
    saveProfiles();
    updateUI();
    renderQuests();
}

function completeWeeklyChallenge(btn) {
    if (!currentProfileName || !profiles[currentProfileName]) {
        alert("Сначала создайте персонажа!");
        return;
    }
    
    const profile = profiles[currentProfileName];
    if (profile.completedQuests.includes('w1')) {
        alert("Вы уже выполнили еженедельный вызов!");
        return;
    }
    
    ['str', 'end', 'agi', 'int', 'cha', 'per'].forEach(id => profile.stats[id] = (profile.stats[id] || 0) + 8);
    profile.stats.luck = (profile.stats.luck || 0) + 15;
    profile.stats.gold = (profile.stats.gold || 0) + 100;
    profile.completedQuests.push('w1');
    stats = profile.stats;
    saveProfiles();
    updateUI();
    alert("⭐ Еженедельный вызов выполнен! +8 ко всем статам, +15 удачи, +100 монет!");
}

function openChest(tier, price) {
    if (!currentProfileName || !profiles[currentProfileName]) {
        alert("Сначала создайте персонажа!");
        return;
    }
    
    const profile = profiles[currentProfileName];
    if ((profile.stats.gold || 0) < price) {
        alert("Недостаточно монет!");
        return;
    }
    
    profile.stats.gold -= price;
    let pool = LOOT_POOL[tier];
    let randomItem = pool[Math.floor(Math.random() * pool.length)];
    if(!profile.inventory) profile.inventory = [];
    profile.inventory.push(randomItem.name);
    profile.stats[randomItem.stat] = (profile.stats[randomItem.stat] || 0) + randomItem.bonus;
    stats = profile.stats;
    saveProfiles();
    updateUI();
    alert(`🎉 Вы выбили: ${randomItem.name}!`);
}

function resetProgress() {
    if (!currentProfileName || !profiles[currentProfileName]) {
        alert("Нет активного персонажа!");
        return;
    }
    
    if (!confirm(`Точно сбросить прогресс персонажа "${currentProfileName}"?`)) return;
    
    const profile = profiles[currentProfileName];
    profile.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 };
    profile.completedQuests = [];
    profile.inventory = [];
    profile.currentQuests = [];
    profile.lastQuestDate = "";
    profile.lastSleepDate = "";
    stats = profile.stats;
    saveProfiles();
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
    if (h === 0 && m === 0 && s === 0 && currentProfileName && profiles[currentProfileName]) {
        const profile = profiles[currentProfileName];
        let shuffled = [...QUESTS_DATABASE].sort(() => 0.5 - Math.random());
        profile.currentQuests = shuffled.slice(0, 3);
        profile.completedQuests = profile.completedQuests.filter(id => id.startsWith('w'));
        profile.lastQuestDate = new Date().toDateString();
        saveProfiles();
        renderQuests();
        updateUI();
    }
}, 1000);

// ========================================
//  ИНИЦИАЛИЗАЦИЯ
// ========================================

loadProfiles();

// Если есть активный профиль - загружаем его
if (currentProfileName && profiles[currentProfileName]) {
    stats = profiles[currentProfileName].stats;
    checkDailyRotation();
} else {
    // Если профилей нет - показываем приглашение
    if (Object.keys(profiles).length === 0) {
        setTimeout(() => {
            if (confirm("👋 Добро пожаловать! Создать первого персонажа?")) {
                const name = prompt("Введите имя вашего персонажа:", "Герой");
                if (name && name.trim()) {
                    createProfile(name.trim());
                }
            }
        }, 500);
    } else {
        // Если есть профили, но нет активного - выбираем первый
        const firstProfile = Object.keys(profiles)[0];
        switchProfile(firstProfile);
    }
}

updateUI();
renderQuests();

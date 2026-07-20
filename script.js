// ЧАСТЬ 1 ИЗ 2: БАЗА ДАННЫХ И НАСТРОЙКИ СИСТЕМЫ
const SAVE_KEY = 'rpg_mega_save_v7.0';
let stats = { 
    str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0, 
    completedQuests: [], inventory: [],
    currentQuests: [], lastQuestDate: "" 
};
const EXP = 250;

const QUESTS_DATABASE = [
    { title: "20 отжиманий с ногами на возвышении", desc: "Выполните 20 качественных отжиманий с ногами на стуле или диване.", stat: "str", points: 3, gold: 10, type: "purple" },
    { title: "20 минут упражнений на растяжку", desc: "Выполняйте базовые упражнения на растяжку всего тела в течение 20 минут.", stat: "agi", points: 2, gold: 10, type: "blue" },
    { title: "15 минут наблюдения за животными", desc: "Понаблюдайте за домашними животными, птицами или насекомыми на улице 15 минут.", stat: "per", points: 2, gold: 10, type: "blue" },
    { title: "60 минут работы в саду / уборки", desc: "Поработайте в саду, наведите идеальный порядок в комнате или помогите близким.", stat: "end", points: 3, gold: 15, type: "" },
    { title: "25 минут программирования", desc: "Поработайте над своим кодом или изучите новую тему в разработке 25 минут без пауз.", stat: "int", points: 3, gold: 20, type: "purple" },
    { title: "Планка 3 минуты суммарно", desc: "Простойте в классической планке на локтях три минуты (можно за несколько подходов).", stat: "str", points: 2, gold: 10, type: "purple" },
    { title: "Пробежка или кардио 20 минут", desc: "Интенсивный бег на улице или прыжки со скакалкой дома для разгона крови.", stat: "end", points: 3, gold: 15, type: "" },
    { title: "Прочесть 15 страниц полезной книги", desc: "Отложите соцсети и вдумчиво прочитайте 15 страниц любой развивающей книги.", stat: "int", points: 2, gold: 12, type: "purple" },
    { title: "Контрастный душ утром", desc: "Примите бодрящий контрастный душ, чередуя холодную и горячую воду 5 раз.", stat: "end", points: 2, gold: 10, type: "blue" },
    { title: "Изучить 10 новых иностранных слов", desc: "Выпишите и запомните 10 слов на английском или любом другом языке.", stat: "int", points: 3, gold: 15, type: "purple" },
    { title: "Сделать 50 глубоких приседаний", desc: "Сделайте 50 техничных приседаний. Можно разбить на 2 подхода по 25 раз.", stat: "str", points: 2, gold: 10, type: "" },
    { title: "Удалить 50 ненужных фото/файлов", desc: "Очистите память телефона или компьютера от хлама, разгрузите фокус.", stat: "per", points: 2, gold: 10, type: "blue" },
    { title: "Помыть всю посуду сразу после еды", desc: "Прокачка дисциплины: не оставляйте раковину грязной ни на минуту.", stat: "end", points: 2, gold: 8, type: "" },
    { title: "Разминка для глаз и шеи", desc: "Сделайте комплекс упражнений для расслабления глаз и затекшей шеи.", stat: "per", points: 2, gold: 8, type: "blue" },
    { title: "Записать 3 главных цели на завтра", desc: "Спланируйте следующий день на бумаге или в заметках перед сном.", stat: "int", points: 2, gold: 10, type: "purple" }
];

const LOOT_POOL = {
    common: [
        { name: "👟 Nike (+5 Выносливость)", stat: "end", bonus: 5 },
        { name: "🏋️‍♂️ Эспандер (+5 Сила)", stat: "str", bonus: 5 },
        { name: "🕶 Очки (+5 Харизма)", stat: "cha", bonus: 5 }
    ],
    epic: [
        { name: "⌚ Rolex (+25 Харизма)", stat: "cha", bonus: 25 },
        { name: "💻 Ноутбук (+25 Интеллект)", stat: "int", bonus: 25 },
        { name: "🎧 AirPods (+25 Восприятие)", stat: "per", bonus: 25 }
    ]
};

function loadData() {
    try {
        let saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
            let parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') { stats = Object.assign(stats, parsed); }
        }
    } catch (e) {}
}

function switchTab(id, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    let target = document.getElementById(id);
    if(target) target.classList.add('active');
    if(btn) btn.classList.add('active');
}

function checkDailyRotation() {
    let todayStr = new Date().toDateString();
    if (stats.lastQuestDate !== todayStr || !stats.currentQuests || stats.currentQuests.length === 0) {
        let shuffled = [...QUESTS_DATABASE].sort(() => 0.5 - Math.random());
        stats.currentQuests = shuffled.slice(0, 3);
        stats.completedQuests = [];
        stats.lastQuestDate = todayStr;
        saveData();
    }
}

// ЧАСТЬ 2 ИЗ 2: ЛОГИКА ИНТЕРФЕЙСА, ТАЙМЕРЫ И ГЕНЕРАЦИЯ
function renderQuests() {
    let container = document.getElementById('quests-container');
    if (!container) return;
    container.innerHTML = "";

    stats.currentQuests.forEach((q, index) => {
        let isDone = stats.completedQuests.includes('dq_' + index);
        let card = document.createElement('div');
        card.className = "quest-card";
        
        card.innerHTML = `
            <div class="quest-title">${q.title}</div>
            <div class="quest-desc">${q.desc}</div>
            <div class="quest-reward">➕ +${q.points} XP / +${q.gold} 🪙</div>
            <button class="action-btn ${q.type}" id="dq_${index}" 
                style="${isDone ? 'background:#2c2c2e; opacity:0.4; pointer-events:none;' : ''}"
                onclick="completeQuest(this, '${q.stat}', ${q.points}, ${q.gold})">
                ${isDone ? 'Выполнено' : 'Выполнить'}
            </button>
        `;
        container.appendChild(card);
    });
}

function updateUI() {
    let total = (stats.str || 0) + (stats.end || 0) + (stats.agi || 0) + (stats.int || 0) + (stats.cha || 0) + (stats.per || 0) + (stats.luck || 0);
    let lvl = Math.floor(total / EXP) + 1;
    let curExp = total % EXP;

    if(document.getElementById('str-val')) document.getElementById('str-val').textContent = stats.str;
    if(document.getElementById('end-val')) document.getElementById('end-val').textContent = stats.end;
    if(document.getElementById('agi-val')) document.getElementById('agi-val').textContent = stats.agi;
    if(document.getElementById('int-val')) document.getElementById('int-val').textContent = stats.int;
    if(document.getElementById('cha-val')) document.getElementById('cha-val').textContent = stats.cha;
    if(document.getElementById('per-val')) document.getElementById('per-val').textContent = stats.per;
    if(document.getElementById('luck-val')) document.getElementById('luck-val').textContent = stats.luck;
    
    if(document.getElementById('gold-val')) document.getElementById('gold-val').textContent = stats.gold;
    if(document.getElementById('level-display')) document.getElementById('level-display').textContent = lvl;
    if(document.getElementById('exp-display')) document.getElementById('exp-display').textContent = curExp + " / " + EXP + " XP";
    if(document.getElementById('exp-bar')) document.getElementById('exp-bar').style.width = (curExp / EXP * 100) + "%";

    let achStatus = document.getElementById('ach-status');
    let achProf = document.getElementById('ach-prof');
    if(achStatus) { if(lvl >= 3) achStatus.classList.remove('locked'); else achStatus.classList.add('locked'); }
    if(achProf) { if(lvl >= 5) achProf.classList.remove('locked'); else achProf.classList.add('locked'); }

    let wBtn = document.getElementById('w1');
    if(wBtn && stats.completedQuests.includes('w1')) {
        wBtn.style.background = "#2c2c2e";
        wBtn.style.opacity = "0.4";
        wBtn.style.pointerEvents = "none";
        wBtn.textContent = "Выполнено";
    }

    let invList = document.getElementById('inventory-list');
    if(invList) {
        if(stats.inventory && stats.inventory.length > 0) {
            invList.innerHTML = "";
            stats.inventory.forEach(item => {
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
    stats[type] = (stats[type] || 0) + 10;
    stats.gold = (stats.gold || 0) + 2; 
    saveData();
}

function completeQuest(btn, type, points, goldReward) {
    stats[type] = (stats[type] || 0) + points;
    stats.gold = (stats.gold || 0) + goldReward;
    if (btn && btn.id && !stats.completedQuests.includes(btn.id)) { stats.completedQuests.push(btn.id); }
    saveData();
}

function completeWeeklyChallenge(btn) {
    stats.str = (stats.str || 0) + 2;
    stats.end = (stats.end || 0) + 2;
    stats.agi = (stats.agi || 0) + 2;
    stats.int = (stats.int || 0) + 2;
    stats.cha = (stats.cha || 0) + 2;
    stats.per = (stats.per || 0) + 2;
    stats.luck = (stats.luck || 0) + 3;
    if (btn && !stats.completedQuests.includes('w1')) { stats.completedQuests.push('w1'); }
    saveData();
}

function openChest(tier, price) {
    if ((stats.gold || 0) < price) {
        alert("Недостаточно монет!");
        return;
    }
    stats.gold -= price;
    let pool = LOOT_POOL[tier];
    let randomItem = pool[Math.floor(Math.random() * pool.length)];
    if(!stats.inventory) stats.inventory = [];
    stats.inventory.push(randomItem.name);
    stats[randomItem.stat] = (stats[randomItem.stat] || 0) + randomItem.bonus;
    alert(`🎉 Вы выбили: ${randomItem.name}! Бонус добавлен.`);
    saveData();
}

function saveData() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(stats));
        document.cookie = SAVE_KEY + "=" + JSON.stringify(stats) + "; max-age=31536000; path=/";
    } catch (e) {}
    updateUI();
}

function resetProgress() {
    if (confirm("Обнулить прогресс и начать заново?")) {
        stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0, completedQuests: [], inventory: [], currentQuests: [], lastQuestDate: "" };
        try {
            localStorage.removeItem(SAVE_KEY);
            document.cookie = SAVE_KEY + "=; max-age=0; path=/";
        } catch (e) {}
        window.location.reload();
    }
}

setInterval(() => {
    let n = new Date();
    let h = 23 - n.getHours();
    let m = 59 - n.getMinutes();
    let s = 59 - n.getSeconds();
    
    let dailyTimerEl = document.getElementById('daily-timer');
    if(dailyTimerEl) dailyTimerEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    
    let weeklyTimerEl = document.getElementById('weekly-timer');
    if(weeklyTimerEl) {
        let daysLeft = 6 - (n.getDay() % 7);
        weeklyTimerEl.textContent = `${daysLeft}д ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    
    if (h === 0 && m === 0 && s === 0) {
        let shuffled = [...QUESTS_DATABASE].sort(() => 0.5 - Math.random());
        stats.currentQuests = shuffled.slice(0, 3);
        stats.completedQuests = [];
        stats.lastQuestDate = new Date().toDateString();
        saveData();
    }
}, 1000);

loadData();
checkDailyRotation();
updateUI();
renderQuests();

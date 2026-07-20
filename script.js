// ЧАСТЬ 1 ИЗ 3: НАСТРОЙКИ СИСТЕМЫ И БАЗА СЛУЧАЙНЫХ КВЕСТОВ
const SAVE_KEY = 'rpg_mega_save_v8.0';
let stats = { 
    str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0, 
    completedQuests: [], inventory: [], currentQuests: [], 
    lastQuestDate: "", lastSleepDate: "" 
};
const EXP = 250;

const TITLES_DATABASE = [
    { lvl: 30, text: "👾 Высший разум" }, { lvl: 25, text: "🪐 Абсолют" }, { lvl: 20, text: "🔮 Легенда" },
    { lvl: 15, text: "🌌 Полубог реала" }, { lvl: 12, text: "🔱 Грандмастер" }, { lvl: 10, text: "👑 Мировой Мастер" },
    { lvl: 9,  text: "🥷 Теневой Мастер" }, { lvl: 8,  text: "💎 Элита" }, { lvl: 7,  text: "🎯 Профи дисциплины" },
    { lvl: 6,  text: "🔥 Прокачанный" }, { lvl: 5,  text: "🦾 Местный авторитет" }, { lvl: 4,  text: "⚔️ Боец" },
    { lvl: 3,  text: "⚡ Заряженный" }, { lvl: 2,  text: "🌱 Начинающий атлет" }, { lvl: 1,  text: "🥚 Обыватель" }
];

const QUESTS_DATABASE = [
    { title: "20 отжиманий на возвышении", desc: "Выполните 20 отжиманий с ногами на стуле.", stat: "str", points: 3, gold: 10, type: "purple" },
    { title: "20 минут растяжки", desc: "Выполняйте базовые упражнения на растяжку.", stat: "agi", points: 2, gold: 10, type: "blue" },
    { title: "15 минут наблюдения за природой", desc: "Понаблюдайте за птицами на улице 15 минут.", stat: "per", points: 2, gold: 10, type: "blue" },
    { title: "60 минут уборки", desc: "Наведите идеальный порядок в своей комнате.", stat: "end", points: 3, gold: 15, type: "" },
    { title: "25 минут учебы / кода", desc: "Поработайте над кодом 25 минут без пауз.", stat: "int", points: 3, gold: 20, type: "purple" }
];

// ЧАСТЬ 2 ИЗ 3: СУНДУКИ, ВЕРСИЯ СОХРАНЕНИЯ И ОПРЕДЕЛЕНИЕ ТАБОВ
const LOOT_POOL = {
    common: [{ name: "👟 Nike (+5 Выносл.)", stat: "end", bonus: 5 }, { name: "🏋️‍♂️ Эспандер (+5 Сила)", stat: "str", bonus: 5 }],
    epic: [{ name: "⌚ Rolex (+25 Харизма)", stat: "cha", bonus: 25 }, { name: "💻 Ноутбук (+25 Интелл.)", stat: "int", bonus: 25 }]
};

function loadData() { try { let saved = localStorage.getItem(SAVE_KEY); if (saved) { stats = Object.assign(stats, JSON.parse(saved)); } } catch (e) {} }

function switchTab(id, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if(document.getElementById(id)) document.getElementById(id).classList.add('active');
    if(btn) btn.classList.add('active');
}

function checkDailyRotation() {
    let todayStr = new Date().toDateString();
    if (stats.lastQuestDate !== todayStr || !stats.currentQuests || stats.currentQuests.length === 0) {
        let shuffled = [...QUESTS_DATABASE].sort(() => 0.5 - Math.random());
        stats.currentQuests = shuffled.slice(0, 3); stats.completedQuests = []; stats.lastQuestDate = todayStr; saveData();
    }
}

function renderQuests() {
    let container = document.getElementById('quests-container'); if (!container) return; container.innerHTML = "";
    stats.currentQuests.forEach((q, index) => {
        let isDone = stats.completedQuests.includes('dq_' + index); let card = document.createElement('div'); card.className = "quest-card";
        card.innerHTML = `<div class="quest-title">${q.title}</div><div class="quest-desc">${q.desc}</div><div class="quest-reward">➕ +${q.points} XP / +${q.gold} 🪙</div><button class="action-btn ${q.type}" id="dq_${index}" style="${isDone ? 'background:#2c2c2e; opacity:0.4; pointer-events:none;' : ''}" onclick="completeQuest(this, '${q.stat}', ${q.points}, ${q.gold})">${isDone ? 'Выполнено' : 'Выполнить'}</button>`;
        container.appendChild(card);
    });
}

function checkSleepTime() {
    let now = new Date(); let todayStr = now.toDateString();
    if (stats.lastSleepDate === todayStr) { alert("Вы уже отметили сон сегодня!"); return; }
    let hours = now.getHours();
    if (hours === 0 || hours >= 21) {
        stats.per += 10; stats.gold += 15; alert(`🏆 Отличный режим! Награда: +10 Восприятие / +15 🪙`);
    } else {
        stats.per = Math.max(0, stats.per - 10); alert(`⚠️ Режим нарушен! Штраф: -10 Восприятие.`);
    }
    stats.lastSleepDate = todayStr; saveData();
}

// ЧАСТЬ 3 ИЗ 3: ЛОГИКА UI, ФУНКЦИИ КНОПОК И ТАЙМЕРЫ ОБНОВЛЕНИЯ
function updateUI() {
    let total = stats.str + stats.end + stats.agi + stats.int + stats.cha + stats.per + stats.luck;
    let lvl = Math.floor(total / EXP) + 1; let curExp = total % EXP;
    ['str', 'end', 'agi', 'int', 'cha', 'per', 'luck'].forEach(id => { if(document.getElementById(id+'-val')) document.getElementById(id+'-val').textContent = stats[id]; });
    if(document.getElementById('gold-val')) document.getElementById('gold-val').textContent = stats.gold;
    if(document.getElementById('level-display')) document.getElementById('level-display').textContent = lvl;
    if(document.getElementById('exp-display')) document.getElementById('exp-display').textContent = curExp + " / " + EXP + " XP";
    if(document.getElementById('exp-bar')) document.getElementById('exp-bar').style.width = (curExp / EXP * 100) + "%";

    let currentTitle = "🥚 Обыватель";
    for (let i = 0; i < TITLES_DATABASE.length; i++) { if (lvl >= TITLES_DATABASE[i].lvl) { currentTitle = TITLES_DATABASE[i].text; break; } }
    if(document.getElementById('title-display')) document.getElementById('title-display').textContent = currentTitle;

    ['ach-status', 'ach-prof'].forEach((id, i) => { let el = document.getElementById(id); if(el) { if(lvl >= (i === 0 ? 3 : 5)) el.classList.remove('locked'); else el.classList.add('locked'); } });
    let wBtn = document.getElementById('w1'); if(wBtn && stats.completedQuests.includes('w1')) { wBtn.style.background = "#2c2c2e"; wBtn.style.opacity = "0.4"; wBtn.style.pointerEvents = "none"; wBtn.textContent = "Выполнено"; }
    let sBtn = document.getElementById('sleep-action-btn'); if(sBtn) { if(stats.lastSleepDate === new Date().toDateString()) { sBtn.style.background = "#2c2c2e"; sBtn.style.opacity = "0.4"; sBtn.textContent = "💤 Отмечено"; } else { sBtn.style.background = "linear-gradient(90deg, #0055ff, #0a84ff)"; sBtn.style.opacity = "1"; sBtn.textContent = "🛌 Лечь спать"; } }

    let invList = document.getElementById('inventory-list');
    if(invList) {
        if(stats.inventory && stats.inventory.length > 0) {
            invList.innerHTML = ""; stats.inventory.forEach(item => { let span = document.createElement('span'); span.className = "inv-item"; span.textContent = item; invList.appendChild(span); });
        } else { invList.innerHTML = `<span style="color:#636366; font-style: italic;">У вас пока нет снаряжения...</span>`; }
    }
}

function train(type) { stats[type] = (stats[type] || 0) + 10; stats.gold = (stats.gold || 0) + 2; saveData(); }
function completeQuest(btn, type, points, goldReward) { stats[type] = (stats[type] || 0) + points; stats.gold = (stats.gold || 0) + goldReward; if (btn && btn.id && !stats.completedQuests.includes(btn.id)) { stats.completedQuests.push(btn.id); } saveData(); }
function completeWeeklyChallenge(btn) { ['str', 'end', 'agi', 'int', 'cha', 'per'].forEach(id => stats[id] = (stats[id] || 0) + 8); stats.luck = (stats.luck || 0) + 15; stats.gold = (stats.gold || 0) + 100; if (btn && !stats.completedQuests.includes('w1')) { stats.completedQuests.push('w1'); } saveData(); }

function openChest(tier, price) { if ((stats.gold || 0) < price) { alert("Недостаточно монет!"); return; } stats.gold -= price; let pool = LOOT_POOL[tier]; let randomItem = pool[Math.floor(Math.random() * pool.length)]; if(!stats.inventory) stats.inventory = []; stats.inventory.push(randomItem.name); stats[randomItem.stat] = (stats[randomItem.stat] || 0) + randomItem.bonus; alert(`🎉 Вы выбили: ${randomItem.name}!`); saveData(); }

function saveData() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(stats)); document.cookie = SAVE_KEY + "=" + JSON.stringify(stats) + "; max-age=31536000; path=/"; } catch (e) {} updateUI(); }
function resetProgress() { stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0, completedQuests: [], inventory: [], currentQuests: [], lastQuestDate: "", lastSleepDate: "" }; try { localStorage.removeItem(SAVE_KEY); document.cookie = SAVE_KEY + "=; max-age=0; path=/"; } catch (e) {} saveData(); window.location.reload(); }

setInterval(() => {
    let n = new Date(); let h = 23 - n.getHours(), m = 59 - n.getMinutes(), s = 59 - n.getSeconds();
    let dEl = document.getElementById('daily-timer'); if(dEl) dEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    let wEl = document.getElementById('weekly-timer'); if(wEl) { let daysLeft = 6 - (n.getDay() % 7); wEl.textContent = `${daysLeft}д ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
    if (h === 0 && m === 0 && s === 0) { let shuffled = [...QUESTS_DATABASE].sort(() => 0.5 - Math.random()); stats.currentQuests = shuffled.slice(0, 3); stats.completedQuests = []; stats.lastQuestDate = new Date().toDateString(); saveData(); }
}, 1000);

loadData(); checkDailyRotation(); updateUI(); renderQuests();

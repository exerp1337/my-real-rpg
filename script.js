let gold = Number(localStorage.getItem('gold')) || 0;
let level = Number(localStorage.getItem('level')) || 1;
let xp = Number(localStorage.getItem('xp')) || 0;
let xpNeeded = level * 100;
let energy = Number(localStorage.getItem('energy')) || 100;

let stats = {
    strength: Number(localStorage.getItem('stat_strength')) || 10,
    endurance: Number(localStorage.getItem('stat_endurance')) || 0,
    agility: Number(localStorage.getItem('stat_agility')) || 0,
    intelligence: Number(localStorage.getItem('stat_intelligence')) || 0,
    charisma: Number(localStorage.getItem('stat_charisma')) || 0,
    perception: Number(localStorage.getItem('stat_perception')) || 0
};

const titles = [
    { lvl: 1, name: "Бомж" },
    { lvl: 5, name: "Работяга" },
    { lvl: 10, name: "Специалист" },
    { lvl: 15, name: "Менеджер" },
    { lvl: 20, name: "Босс" },
    { lvl: 30, name: "Олигарх" }
];

const quests = [
    { id: 'quest1', name: "Раздавать листовки", reqStat: 'endurance', reqVal: 0, goldPrize: 15, xpPrize: 20, energyCost: 20 },
    { id: 'quest2', name: "Разгрузить фуру", reqStat: 'strength', reqVal: 12, goldPrize: 40, xpPrize: 35, energyCost: 40 },
    { id: 'quest3', name: "Написать легкий скрипт", reqStat: 'intelligence', reqVal: 5, goldPrize: 60, xpPrize: 50, energyCost: 30 }
];

const shopItems = [
    { id: 'item1', name: "Энергетик", cost: 25, effect: "Восстанавливает 30% энергии", action: () => { energy = Math.min(100, energy + 30); } },
    { id: 'item2', name: "Книга по саморазвитию", cost: 100, effect: "+2 к Интеллекту", action: () => { stats.intelligence += 2; } },
    { id: 'item3', name: "Абонемент в зал", cost: 200, effect: "+3 к Силе", action: () => { stats.strength += 3; } }
];

function saveGame() {
    localStorage.setItem('gold', gold);
    localStorage.setItem('level', level);
    localStorage.setItem('xp', xp);
    localStorage.setItem('energy', energy);
    for (let s in stats) {
        localStorage.setItem('stat_' + s, stats[s]);
    }
}

function updateUI() {
    document.getElementById('gold-count').innerText = gold;
    document.getElementById('player-level').innerText = level;
    document.getElementById('xp-text').innerText = `${xp}/${xpNeeded}`;
    document.getElementById('xp-bar').style.width = `${(xp / xpNeeded) * 100}%`;
    document.getElementById('energy-display').innerText = `(${energy}%)`;

    for (let s in stats) {
        let el = document.getElementById('stat_' + s);
        if (el) el.innerText = stats[s];
    }

    let currentTitle = "Бомж";
    for (let t of titles) {
        if (level >= t.lvl) currentTitle = t.name;
    }
    document.getElementById('player-title').innerText = currentTitle;
    renderQuests();
}

function switchTab(tabId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

function upgradeStat(statName) {
    let cost = Math.floor(10 * Math.pow(1.5, stats[statName] - (statName === 'strength' ? 10 : 0)));
    if (gold >= cost) {
        gold -= cost;
        stats[statName]++;
        saveGame();
        updateUI();
    } else {
        alert("Недостаточно золота! Нужно: " + cost);
    }
}

function goToSleep() {
    if (energy >= 100) {
        alert("Вы не хотите спать!");
        return;
    }
    energy = 100;
    alert("Вы отлично выспались! Энергия восстановлена.");
    saveGame();
    updateUI();
}

function renderQuests() {
    const list = document.getElementById('quests-list');
    list.innerHTML = "";
    quests.forEach(q => {
        let isLocked = stats[q.reqStat] < q.reqVal;
        let card = document.createElement('div');
        card.className = `quest-card ${isLocked ? 'locked' : ''}`;
        card.innerHTML = `
            <h3>${q.name}</h3>
            <p>Награда: 🪙 ${q.goldPrize} | ⭐ ${q.xpPrize}</p>
            <p style="color: #ff9f00;">Расход энергии: ${q.energyCost}%</p>
            ${isLocked ? `<p style="color: #ff4d4d; font-size:12px;">Требуется: ${q.reqStat} ${q.reqVal}</p>` : ''}
            <button class="action-btn" ${isLocked ? 'disabled' : ''} onclick="doQuest('${q.id}')">Выполнить</button>
        `;
        list.appendChild(card);
    });
}

function doQuest(questId) {
    let q = quests.find(x => x.id === questId);
    if (energy >= q.energyCost) {
        energy -= q.energyCost;
        gold += q.goldPrize;
        xp += q.xpPrize;
        if (xp >= xpNeeded) {
            xp -= xpNeeded;
            level++;
            xpNeeded = level * 100;
            alert("🎉 УРОВЕНЬ ПОВЫШЕН! Ваш новый уровень: " + level);
        }
        saveGame();
        updateUI();
    } else {
        alert("Вы слишком устали! Пора лечь спать.");
    }
}

function renderShop() {
    const list = document.getElementById('shop-list');
    list.innerHTML = "";
    shopItems.forEach(item => {
        let card = document.createElement('div');
        card.className = "quest-card";
        card.innerHTML = `
            <h3>${item.name}</h3>
            <p style="color: #aaa; font-size:13px;">${item.effect}</p>
            <p style="color: #ffcc00; font-weight: bold; margin: 5px 0;">Цена: 🪙 ${item.cost}</p>
            <button class="action-btn" onclick="buyItem('${item.id}')">Купить</button>
        `;
        list.appendChild(card);
    });
}

function buyItem(itemId) {
    let item = shopItems.find(x => x.id === itemId);
    if (gold >= item.cost) {
        gold -= item.cost;
        item.action();
        saveGame();
        updateUI();
        alert(`Вы купили ${item.name}!`);
    } else {
        alert("Недостаточно золота!");
    }
}

// Первоначальный рендер статических списков магазинов
renderShop();

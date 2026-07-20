const SAVE_KEY = 'rpg_ultimate_save_v2';
let stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, completedQuests: [] };
const EXP = 250;

function loadData() {
    try {
        let saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
            let parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                stats = Object.assign(stats, parsed);
            }
        }
    } catch (e) {
        console.log("Режим памяти RAM");
    }
}

function switchTab(id, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    let target = document.getElementById(id);
    if(target) target.classList.add('active');
    if(btn) btn.classList.add('active');
}

function updateUI() {
    let total = (stats.str || 0) + (stats.end || 0) + (stats.agi || 0) + (stats.int || 0) + (stats.cha || 0);
    let lvl = Math.floor(total / EXP) + 1;
    let curExp = total % EXP;

    if(document.getElementById('str-val')) document.getElementById('str-val').textContent = stats.str;
    if(document.getElementById('end-val')) document.getElementById('end-val').textContent = stats.end;
    if(document.getElementById('agi-val')) document.getElementById('agi-val').textContent = stats.agi;
    if(document.getElementById('int-val')) document.getElementById('int-val').textContent = stats.int;
    if(document.getElementById('cha-val')) document.getElementById('cha-val').textContent = stats.cha;
    
    if(document.getElementById('level-display')) document.getElementById('level-display').textContent = lvl;
    if(document.getElementById('exp-display')) document.getElementById('exp-display').textContent = curExp + " / " + EXP + " XP";
    if(document.getElementById('exp-bar')) document.getElementById('exp-bar').style.width = (curExp / EXP * 100) + "%";

    let achStatus = document.getElementById('ach-status');
    let achProf = document.getElementById('ach-prof');
    if(achStatus) { if(lvl >= 3) achStatus.classList.remove('locked'); else achStatus.classList.add('locked'); }
    if(achProf) { if(lvl >= 5) achProf.classList.remove('locked'); else achProf.classList.add('locked'); }

    if (stats.completedQuests) {
        stats.completedQuests.forEach(id => {
            let btn = document.getElementById(id);
            if (btn) {
                btn.style.opacity = "0.4";
                btn.style.pointerEvents = "none";
            }
        });
    }
}

function train(type) {
    stats[type] = (stats[type] || 0) + 10;
    saveData();
}

function quest(btn, type) {
    stats[type] = (stats[type] || 0) + 15;
    if (btn.id && !stats.completedQuests.includes(btn.id)) {
        stats.completedQuests.push(btn.id);
    }
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
    if (confirm("Обнулить весь прогресс?")) {
        stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, completedQuests: [] };
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
    let timerEl = document.getElementById('daily-timer');
    if(timerEl) timerEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    
    if (h === 0 && m === 0 && s === 0) {
        stats.completedQuests = [];
        saveData();
        window.location.reload();
    }
}, 1000);

loadData();
updateUI();

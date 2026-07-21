// Инициализация Supabase твоей базы данных
const SUPABASE_URL = "https://supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vZvOsb3vBq7SHnAmb3gvqw_Uh03tVHpYdzU2Mzlfc3VwYWJhc2UuY28=";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// Встраиваем окно авторизации поверх игры
document.addEventListener("DOMContentLoaded", () => {
    const authHtml = `
    <div id="auth-container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,15,15,0.97); display: flex; justify-content: center; align-items: center; z-index: 99999; font-family: sans-serif;">
        <div style="background: #1e1e1e; padding: 30px; border-radius: 12px; box-shadow: 0 0 25px rgba(0,255,255,0.25); text-align: center; color: white; width: 320px; border: 1px solid #333;">
            <h2 id="auth-title" style="margin-bottom: 20px; color: #00ffff; font-size: 24px; font-weight: bold;">Реал Лайф РПГ</h2>
            <input type="email" id="auth-email" placeholder="Ваша почта (Email)" style="width: 100%; padding: 12px; margin: 8px 0; box-sizing: border-box; background: #111; border: 1px solid #444; color: white; border-radius: 6px; outline: none;">
            <input type="password" id="auth-password" placeholder="Пароль" style="width: 100%; padding: 12px; margin: 8px 0; box-sizing: border-box; background: #111; border: 1px solid #444; color: white; border-radius: 6px; outline: none;">
            <input type="text" id="auth-username" placeholder="Придумайте никнейм" style="width: 100%; padding: 12px; margin: 8px 0; box-sizing: border-box; background: #111; border: 1px solid #444; color: white; border-radius: 6px; outline: none; display: none;">
            <button id="auth-btn" style="width: 100%; padding: 12px; margin-top: 15px; background: #00ffff; border: none; color: #111; font-weight: bold; cursor: pointer; border-radius: 6px; font-size: 16px; transition: 0.2s;">Войти</button>
            <p id="auth-toggle" style="margin-top: 15px; font-size: 13px; color: #00ffff; cursor: pointer; text-decoration: underline;">Нет аккаунта? Зарегистрироваться</p>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('afterbegin', authHtml);

    const logoutBtnHtml = `<button id="logout-btn" style="position: fixed; bottom: 15px; right: 15px; padding: 10px 16px; background: #ff4d4d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; z-index: 9999; box-shadow: 0 0 10px rgba(0,0,0,0.5);">Выйти из профиля</button>`;
    document.body.insertAdjacentHTML('beforeend', logoutBtnHtml);

    initAuthLogic();
});

// Перехват сохранений localStorage
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (currentUser) {
        saveAllLocalStorageToCloud();
    }
};

async function saveAllLocalStorageToCloud() {
    if (!currentUser) return;
    let localData = {};
    for (let i = 0; i < localStorage.length; i++) {
        let k = localStorage.key(i);
        localData[k] = localStorage.getItem(k);
    }
    await supabase.from('profiles').upsert({ id: currentUser.id, save_data: localData, updated_at: new Date() });
}

async function loadCloudToLocalStorage(userId) {
    const { data } = await supabase.from('profiles').select('save_data').eq('id', userId).single();
    if (data && data.save_data && Object.keys(data.save_data).length > 0) {
        for (let key in data.save_data) {
            originalSetItem.call(localStorage, key, data.save_data[key]);
        }
        // Обновляем переменные в памяти твоей игры
        gold = Number(localStorage.getItem('gold')) || 0;
        level = Number(localStorage.getItem('level')) || 1;
        xp = Number(localStorage.getItem('xp')) || 0;
        xpNeeded = level * 100;
        energy = Number(localStorage.getItem('energy')) || 100;
        stats = {
            strength: Number(localStorage.getItem('stat_strength')) || 10,
            endurance: Number(localStorage.getItem('stat_endurance')) || 0,
            agility: Number(localStorage.getItem('stat_agility')) || 0,
            intelligence: Number(localStorage.getItem('stat_intelligence')) || 0,
            charisma: Number(localStorage.getItem('stat_charisma')) || 0,
            perception: Number(localStorage.getItem('stat_perception')) || 0
        };
    }
    // Перерисовываем интерфейс игры данными из облака
    if (typeof updateUI === "function") {
        updateUI();
    }
}

function initAuthLogic() {
    const container = document.getElementById('auth-container');
    const title = document.getElementById('auth-title');
    const emailInp = document.getElementById('auth-email');
    const passInp = document.getElementById('auth-password');
    const userInp = document.getElementById('auth-username');
    const btn = document.getElementById('auth-btn');
    const toggle = document.getElementById('auth-toggle');
    const logoutBtn = document.getElementById('logout-btn');
    
    let isSignUp = false;

    toggle.addEventListener('click', () => {
        isSignUp = !isSignUp;
        title.innerText = isSignUp ? "Регистрация" : "Реал Лайф РПГ";
        btn.innerText = isSignUp ? "Создать профиль" : "Войти";
        userInp.style.display = isSignUp ? "block" : "none";
        toggle.innerText = isSignUp ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться";
    });

    btn.addEventListener('click', async () => {
        if (isSignUp) {
            const { data, error } = await supabase.auth.signUp({ email: emailInp.value, password: passInp.value });
            if (error) return alert("Ошибка: " + error.message);
            if (data.user) {
                await supabase.from('profiles').insert({ id: data.user.id, username: userInp.value });
                alert("Успешно зарегистрирован! Теперь войдите.");
                toggle.click();
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email: emailInp.value, password: passInp.value });
            if (error) return alert("Ошибка входа: " + error.message);
        }
    });

    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            currentUser = session.user;
            container.style.display = 'none';
            await loadCloudToLocalStorage(session.user.id);
        } else {
            container.style.display = 'flex';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        localStorage.clear();
        await supabase.auth.signOut();
        location.reload();
    });
}

// 1. Инициализация Supabase базы данных
const SUPABASE_URL = "https://supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vZvOsb3vBq7SHnAmb3gvqw_Uh03tVHpYdzU2Mzlfc3VwYWJhc2UuY28="; // Полный ключ
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// 2. Встраиваем окно авторизации прямо в HTML при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
    // Создаем элементы интерфейса авторизации
    const authHtml = `
    <div id="auth-container" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,15,15,0.95); display: flex; justify-content: center; align-items: center; z-index: 99999; font-family: sans-serif;">
        <div style="background: #222; padding: 30px; border-radius: 12px; box-shadow: 0 0 20px rgba(0,255,255,0.2); text-align: center; color: white; width: 320px; border: 1px solid #333;">
            <h2 id="auth-title" style="margin-bottom: 20px; color: #00ffff; font-size: 24px;">Войти в РПГ</h2>
            <input type="email" id="auth-email" placeholder="Ваша почта (Email)" style="width: 100%; padding: 12px; margin: 8px 0; box-sizing: border-box; background: #1a1a1a; border: 1px solid #444; color: white; border-radius: 6px;">
            <input type="password" id="auth-password" placeholder="Пароль" style="width: 100%; padding: 12px; margin: 8px 0; box-sizing: border-box; background: #1a1a1a; border: 1px solid #444; color: white; border-radius: 6px;">
            <input type="text" id="auth-username" placeholder="Ваш никнейм" style="width: 100%; padding: 12px; margin: 8px 0; box-sizing: border-box; background: #1a1a1a; border: 1px solid #444; color: white; border-radius: 6px; display: none;">
            <button id="auth-btn" style="width: 100%; padding: 12px; margin-top: 15px; background: #00ffff; border: none; color: #111; font-weight: bold; cursor: pointer; border-radius: 6px; font-size: 16px;">Войти</button>
            <p id="auth-toggle" style="margin-top: 15px; font-size: 14px; color: #00ffff; cursor: pointer; text-decoration: underline;">Нет аккаунта? Зарегистрироваться</p>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('afterbegin', authHtml);
    
    // Кнопка выхода из аккаунта в верхний угол экрана
    const logoutBtnHtml = `<button id="logout-btn" style="position: fixed; top: 15px; right: 15px; padding: 8px 14px; background: #ff4d4d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; z-index: 9999;">Выйти</button>`;
    document.body.insertAdjacentHTML('beforeend', logoutBtnHtml);

    initAuthLogic();
});

// 3. Логика перехвата localStorage (Главный трюк!)
// Скрипт подменяет стандартный localStorage на отправку данных в облако
const originalSetItem = localStorage.setItem;
const originalGetItem = localStorage.getItem;

localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments); // Сохраняем локально на всякий случай
    if (currentUser) {
        saveAllLocalStorageToCloud(); // Синхронизируем с облаком Supabase
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
        // Перезапускаем страницу один раз, чтобы твоя игра перерисовала новые статы из localStorage
        if (!sessionStorage.getItem('reloaded')) {
            sessionStorage.setItem('reloaded', 'true');
            location.reload();
        }
    }
}

// 4. Логика кнопок формы авторизации
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
        title.innerText = isSignUp ? "Регистрация" : "Войти в РПГ";
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
            const { data, error } = await supabase.auth.signInWithPassword({ email: emailInp.value, password: passInp.value });
            if (error) return alert("Ошибка входа: " + error.message);
        }
    });

    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            currentUser = session.user;
            container.style.display = 'none';
            if (!sessionStorage.getItem('reloaded')) {
                await loadCloudToLocalStorage(session.user.id);
            }
        } else {
            container.style.display = 'flex';
            sessionStorage.removeItem('reloaded');
        }
    });

    logoutBtn.addEventListener('click', async () => {
        localStorage.clear(); // Очищаем локально, чтобы чужие статы не висели
        await supabase.auth.signOut();
        location.reload();
    });
}

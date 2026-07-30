// ===========================
// НАСТРОЙКИ ЗАКАЗА (ТЕЛЕГРАМ)
// ===========================
const TELEGRAM_USERNAME = 'ТВОЙ_ЮЗЕРНЕЙМ'; // <-- УКАЖИ СВОЙ ЮЗЕРНЕЙМ ЗДЕСЬ (Без знака @)

// ===========================
// TAB SWITCHING
// ===========================
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;

    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    tabContents.forEach(tab => {
      tab.classList.remove('active');
      if (tab.id === `tab-${target}`) {
        tab.classList.add('active');
        document.getElementById('menu').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});

// ===========================
// ПЕРЕСЧЕТ ЦЕНЫ ТОВАРА
// ===========================
function updateCardPrice(card) {
  const basePrice = parseFloat(card.dataset.basePrice || 0);
  
  // Цена за размер
  const activeSizeBtn = card.querySelector('.size-btn.active');
  const sizePrice = activeSizeBtn ? parseFloat(activeSizeBtn.dataset.addPrice || 0) : 0;
  
  // Цена за добавки
  let addonsPrice = 0;
  card.querySelectorAll('.addon-btn.active').forEach(btn => {
    addonsPrice += parseFloat(btn.dataset.price || 0);
  });
  
  // Общая сумма
  const totalPrice = (basePrice + sizePrice + addonsPrice).toFixed(2);
  
  // Обновляем текст
  const priceEl = card.querySelector('.card-price');
  if (priceEl) {
    priceEl.innerText = `${totalPrice} руб`;
  }
}

// ===========================
// КЛИКИ: РАЗМЕРЫ И ДОБАВКИ
// ===========================
document.addEventListener('click', e => {
  // Выбор размера
  if (e.target.classList.contains('size-btn')) {
    const picker = e.target.closest('.size-picker');
    if (!picker) return;
    
    picker.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    const card = e.target.closest('.card');
    if (card) updateCardPrice(card);
  }
  
  // Выбор добавки (вкл/выкл)
  if (e.target.classList.contains('addon-btn')) {
    e.target.classList.toggle('active');
    
    const card = e.target.closest('.card');
    if (card) updateCardPrice(card);
  }
});

// Инициализация цен при загрузке (чтобы применились базовые значения)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.card').forEach(card => updateCardPrice(card));
});

// ===========================
// ORDER LOGIC (TELEGRAM)
// ===========================
document.addEventListener('click', e => {
  if (e.target.classList.contains('order-btn')) {
    const card = e.target.closest('.card');
    if (!card) return;

    // Считываем название и финальную цену
    const name = card.querySelector('.card-name')?.innerText.trim() || 'Без названия';
    const price = card.querySelector('.card-price')?.innerText.trim() || 'Не указана';

    // Базовый текст сообщения
    let message = `Привет! Хочу заказать:\n🌯 Блюдо: ${name}`;

    // Ищем выбранный размер
    const activeSizeBtn = card.querySelector('.size-btn.active');
    const staticWeight = card.querySelector('.card-weight');

    if (activeSizeBtn) {
      message += `\n📏 Размер: ${activeSizeBtn.innerText.trim()}`;
    } else if (staticWeight) {
      message += `\n⚖️ Вес: ${staticWeight.innerText.trim()}`;
    }
    
    // Собираем добавки
    const activeAddons = card.querySelectorAll('.addon-btn.active');
    if (activeAddons.length > 0) {
      const addonsTexts = Array.from(activeAddons).map(b => b.innerText.split('(')[0].trim()).join(', ');
      message += `\n🧀 Добавки: ${addonsTexts}`;
    }

    message += `\n💵 Итоговая цена: ${price}`;

    // Кодируем текст для URL
    const encodedMessage = encodeURIComponent(message);
    
    // Формируем ссылку и открываем в новой вкладке
    const telegramUrl = `https://t.me/${TELEGRAM_USERNAME}?text=${encodedMessage}`;
    window.open(telegramUrl, '_blank');
  }
});

// ===========================
// HEADER SCROLL SHADOW
// ===========================
const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    header.style.boxShadow = '0 4px 24px rgba(0,0,0,0.6)';
    header.style.borderBottomColor = 'transparent';
  } else {
    header.style.boxShadow = 'none';
    header.style.borderBottomColor = 'var(--border)';
  }
}, { passive: true });

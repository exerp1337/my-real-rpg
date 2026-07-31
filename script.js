// ========================================
//  ПОДКЛЮЧЕНИЕ К SUPABASE
// ========================================

const SUPABASE_URL = 'https://zjtudyoffdwqfamzczcb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqdHVkeW9mZmR3cWZhbXpjemNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTYxMDMsImV4cCI6MjEwMDE5MjEwM30.yO-fyi_hZv__XqMjz-OpuYNPAlKyaGT7KB4xscqHMNo';
const TABLE_NAME = 'players';
const SESSION_KEY = 'rpg_session';

// ========================================
//  АВАТАРЫ
// ========================================
const AVATARS = [
    { level: 1, icon: 'ph-egg', name: 'Яйцо' },
    { level: 2, icon: 'ph-bird', name: 'Цыпленок' },
    { level: 3, icon: 'ph-paper-plane-tilt', name: 'Птенец' },
    { level: 4, icon: 'ph-paper-plane-right', name: 'Птица' },
    { level: 5, icon: 'ph-airplane-tilt', name: 'Орел' },
    { level: 7, icon: 'ph-paw-print', name: 'Волк' },
    { level: 9, icon: 'ph-cat', name: 'Лев' },
    { level: 12, icon: 'ph-fire', name: 'Дракон' },
    { level: 15, icon: 'ph-magic-wand', name: 'Маг' },
    { level: 18, icon: 'ph-crown', name: 'Король' },
    { level: 21, icon: 'ph-sword', name: 'Воин' },
    { level: 25, icon: 'ph-shield-star', name: 'Герой' },
    { level: 30, icon: 'ph-alien', name: 'Босс' }
];

function getAvatar(level) {
    let result = AVATARS[0];
    for (const a of AVATARS) {
        if (level >= a.level) result = a;
    }
    return result;
}

// ========================================
//  СОСТОЯНИЕ
// ========================================

let currentUserData = null;
let currentUsername = null;
let lastTrainTime = 0;
const EXP = 250;
const SOCIAL_XP_PER_LEVEL = 100;

// ========================================
//  БАЗЫ ДАННЫХ
// ========================================

const RARITY_CONFIG = {
    legendary: { label: '⭐ Легендарная', color: '#ff6b00', xp: 50, statBonus: 15 },
    epic: { label: '🔮 Эпическая', color: '#bf5af2', xp: 30, statBonus: 10 },
    common: { label: '📦 Обычная', color: '#0a84ff', xp: 15, statBonus: 5 },
    easy: { label: '🌱 Легкая', color: '#30d158', xp: 5, statBonus: 2 }
};

const STAT_LABELS = {
    str: '<i class="ph ph-barbell"></i> Сила',
    end: '<i class="ph ph-sneaker"></i> Выносливость',
    agi: '<i class="ph ph-target"></i> Ловкость',
    int: '<i class="ph ph-book-open"></i> Интеллект',
    cha: '<i class="ph ph-chat-centered-text"></i> Харизма',
    per: '<i class="ph ph-eye"></i> Дисциплина',
    luck: '<i class="ph ph-clover"></i> Удача'
};

const RARITIES = {
    common: { label: 'Обычное', color: '#8e8e93', weight: 40, icon: 'ph-package' },
    uncommon: { label: 'Необычное', color: '#30d158', weight: 25, icon: 'ph-sparkle' },
    rare: { label: 'Редкое', color: '#0a84ff', weight: 18, icon: 'ph-star' },
    epic: { label: 'Эпическое', color: '#bf5af2', weight: 10, icon: 'ph-shooting-star' },
    legendary: { label: 'Легендарное', color: '#ff9500', weight: 5, icon: 'ph-crown' },
    mythic: { label: 'Мифическое', color: '#ff453a', weight: 2, icon: 'ph-diamond' }
};

const ITEMS_POOL = [
    { id: 'item_1', name: 'Клевер', desc: 'Приносит удачу', stat: 'luck', bonus: 2, rarity: 'common', icon: 'ph-clover' },
    { id: 'item_2', name: 'Гантеля', desc: 'Для силовых тренировок', stat: 'str', bonus: 3, rarity: 'common', icon: 'ph-barbell' },
    { id: 'item_3', name: 'Книга', desc: 'Источник знаний', stat: 'int', bonus: 3, rarity: 'common', icon: 'ph-book-open' },
    { id: 'item_4', name: 'Кроссовки', desc: 'Для бега', stat: 'end', bonus: 3, rarity: 'common', icon: 'ph-sneaker' },
    { id: 'item_5', name: 'Мишень', desc: 'Тренирует меткость', stat: 'agi', bonus: 3, rarity: 'common', icon: 'ph-target' },
    { id: 'item_6', name: 'Хрустальный шар', desc: 'Усиливает интуицию', stat: 'luck', bonus: 5, rarity: 'uncommon', icon: 'ph-magic-wand' },
    { id: 'item_7', name: 'Меч', desc: 'Символ силы', stat: 'str', bonus: 7, rarity: 'uncommon', icon: 'ph-sword' },
    { id: 'item_8', name: 'Щит', desc: 'Защищает от усталости', stat: 'end', bonus: 7, rarity: 'uncommon', icon: 'ph-shield' },
    { id: 'item_9', name: 'Тренажёр', desc: 'Для мозга', stat: 'int', bonus: 7, rarity: 'uncommon', icon: 'ph-brain' },
    { id: 'item_10', name: 'Микрофон', desc: 'Укрепляет голос', stat: 'cha', bonus: 7, rarity: 'uncommon', icon: 'ph-microphone-stage' },
    { id: 'item_11', name: 'Корона', desc: 'Власть и уважение', stat: 'cha', bonus: 12, rarity: 'rare', icon: 'ph-crown' },
    { id: 'item_12', name: 'Драконий глаз', desc: 'Мистическая удача', stat: 'luck', bonus: 12, rarity: 'rare', icon: 'ph-eye' },
    { id: 'item_13', name: 'Молния', desc: 'Скорость реакции', stat: 'agi', bonus: 12, rarity: 'rare', icon: 'ph-lightning' },
    { id: 'item_14', name: 'Энциклопедия', desc: 'Глубокая мудрость', stat: 'int', bonus: 12, rarity: 'rare', icon: 'ph-books' },
    { id: 'item_15', name: 'Rolex', desc: 'Стиль и статус', stat: 'cha', bonus: 20, rarity: 'epic', icon: 'ph-watch' },
    { id: 'item_16', name: 'Ноутбук', desc: 'Инструмент гения', stat: 'int', bonus: 20, rarity: 'epic', icon: 'ph-laptop' },
    { id: 'item_17', name: 'Трофей', desc: 'Победа во всём', stat: 'str', bonus: 20, rarity: 'epic', icon: 'ph-trophy' },
    { id: 'item_18', name: 'Коврик', desc: 'Гармония и фокус', stat: 'per', bonus: 20, rarity: 'epic', icon: 'ph-person-simple-lotus' },
    { id: 'item_19', name: 'Звезда', desc: 'Сияние гения', stat: 'luck', bonus: 35, rarity: 'legendary', icon: 'ph-star' },
    { id: 'item_20', name: 'Артефакт', desc: 'Древняя магия', stat: 'luck', bonus: 35, rarity: 'legendary', icon: 'ph-gem' },
    { id: 'item_21', name: 'Феникс', desc: 'Возрождение', stat: 'end', bonus: 35, rarity: 'legendary', icon: 'ph-fire' },
    { id: 'item_22', name: 'Камень бесконечности', desc: 'Абсолютная сила', stat: 'str', bonus: 50, rarity: 'mythic', icon: 'ph-hexagon' },
    { id: 'item_23', name: 'Космос', desc: 'Бесконечные знания', stat: 'int', bonus: 50, rarity: 'mythic', icon: 'ph-planet' },
    { id: 'item_24', name: 'Ангельское крыло', desc: 'Божественная харизма', stat: 'cha', bonus: 50, rarity: 'mythic', icon: 'ph-feather' }
];

// ========================================
//  СОЦИАЛЬНЫЕ КВЕСТЫ
// ========================================

const SOCIAL_QUESTS_DB = [
    // РАНГ 1 (уровни 1–5)
    { id: 's1', title: '👀 Контакт установлен', desc: 'Поймай взгляд случайного прохожего и не отводи его первым ровно 2 секунды.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1 },
    { id: 's2', title: '🧍 Бафф осанки', desc: 'Пройди 10 минут по улице с максимально прямой спиной и расправленными плечами.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1 },
    { id: 's3', title: '🗣️ Голос из таверны', desc: 'Скажи «Здравствуйте» кассиру или курьеру на 10% громче, чем обычно.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1 },
    { id: 's4', title: '😊 Оружие к бою', desc: 'Искренне улыбнись одному незнакомому человеку за день.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1 },
    { id: 's5', title: '🛡️ Открытый щит', desc: 'Проведи 15 минут в людном месте, сознательно не скрещивая руки и ноги.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1 },
    { id: 's6', title: '⏳ Мастер времени', desc: 'Подойди к незнакомцу на улице и спроси, который час.', rank: 1, xpReward: 20, socialBonus: 1, minSocialLevel: 1 },
    { id: 's7', title: '🤝 Вежливый NPC', desc: 'Поблагодари обслуживающий персонал, обязательно посмотрев при этом в глаза.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1 },
    { id: 's8', title: '📱 Анти-стелс', desc: 'Зайди в лифт с другими людьми и не доставай телефон.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1 },
    { id: 's9', title: '👂 Эффект присутствия', desc: 'Во время разговора со знакомым кивни минимум 3 раза, показывая, что ты слушаешь.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1 },
    { id: 's10', title: '📖 Четкая дикция', desc: 'Прочитай вслух любой текст (1 страница), чётко проговаривая каждое слово.', rank: 1, xpReward: 20, socialBonus: 1, minSocialLevel: 1 },
    // РАНГ 2 (уровни 6–10)
    { id: 's11', title: '💎 Нежданный лут', desc: 'Сделай искренний комплимент внешности или одежде малознакомого человека.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2 },
    { id: 's12', title: '✨ Магия имени', desc: 'Узнай имя нового собеседника и назови его по имени минимум 2 раза за диалог.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2 },
    { id: 's13', title: '🔀 Разрыв шаблона', desc: 'На дежурное «Как дела?» ответь не «нормально», а интересной деталью.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2 },
    { id: 's14', title: '🗺️ Следопыт', desc: 'Спроси дорогу у прохожего, даже если точно знаешь, куда идти.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2 },
    { id: 's15', title: '📡 Эхолокация', desc: 'Повтори последние 3 слова собеседника с вопросительной интонацией, чтобы он продолжил рассказ.', rank: 2, xpReward: 30, socialBonus: 2, minSocialLevel: 2 },
    { id: 's16', title: '🤝 Общий знаменатель', desc: 'Найди одну общую деталь с человеком, с которым раньше почти не общался.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2 },
    { id: 's17', title: '☕ Светская беседа', desc: 'Перекинься парой фраз о погоде или ситуации с соседом/коллегой.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2 },
    { id: 's18', title: '🚮 Без мусора', desc: 'Поговори с кем-то 5 минут, сознательно избегая слов-паразитов.', rank: 2, xpReward: 30, socialBonus: 2, minSocialLevel: 2 },
    { id: 's19', title: '📢 Развернутый ответ', desc: 'Ни разу за день не ответь на вопросы односложно — добавляй минимум одно предложение.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2 },
    { id: 's20', title: '👋 Новый союзник', desc: 'Подойди к человеку на мероприятии и первым представься.', rank: 2, xpReward: 30, socialBonus: 2, minSocialLevel: 2 },
    // РАНГ 3 (уровни 11–15)
    { id: 's21', title: '🧘 Безмолвный монах', desc: 'Выслушай человека в течение 5 минут, ни разу его не перебив.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3 },
    { id: 's22', title: '🔍 Глубокий зонд', desc: 'Задай открытый вопрос, требующий размышления.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3 },
    { id: 's23', title: '📡 Тонкая настройка', desc: 'Заметь изменение настроения собеседника и аккуратно спроси об этом.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3 },
    { id: 's24', title: '🏅 Высокоуровневый комплимент', desc: 'Похвали не внешность, а навык, характер или поступок человека.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3 },
    { id: 's25', title: '🎁 Достойная награда', desc: 'В ответ на похвалу скажи только «Спасибо, мне очень приятно», не принижая своих заслуг.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3 },
    { id: 's26', title: '📚 Архивариус', desc: 'Вспомни в разговоре мелкую деталь, которую человек упоминал несколько дней назад.', rank: 3, xpReward: 40, socialBonus: 3, minSocialLevel: 3 },
    { id: 's27', title: '🪞 Отзеркаливание', desc: 'В течение 3 минут незаметно копируй позу собеседника для повышения доверия.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3 },
    { id: 's28', title: '⏸️ Тяжеловесная пауза', desc: 'Выдержи паузу в 2 секунды перед ответом на важный вопрос, глядя человеку в глаза.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3 },
    { id: 's29', title: '🛡️ Снятие брони', desc: 'Расскажи собеседнику небольшую, но искреннюю историю о своей недавней мелкой неудаче.', rank: 3, xpReward: 40, socialBonus: 4, minSocialLevel: 3 },
    { id: 's30', title: '👁️ Удержание фокуса', desc: 'Смотри в глаза собеседнику не только когда он говорит, но и когда говоришь ты сам.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3 },
    // РАНГ 4 (уровни 16–20)
    { id: 's31', title: '🔥 Байки у костра', desc: 'Заранее вспомни, отрепетируй и расскажи в компании забавную историю на 1-2 минуты.', rank: 4, xpReward: 45, socialBonus: 5, minSocialLevel: 4 },
    { id: 's32', title: '⚔️ Изящное парирование', desc: 'Вежливо, но твердо не согласись с чужим мнением, начав с «Я понимаю твою мысль, но...»', rank: 4, xpReward: 45, socialBonus: 5, minSocialLevel: 4 },
    { id: 's33', title: '🎮 Врыв в пати', desc: 'Успешно вклинись в уже идущий разговор группы людей, не нарушив его динамику.', rank: 4, xpReward: 50, socialBonus: 5, minSocialLevel: 4 },
    { id: 's34', title: '🕊️ Уютная тишина', desc: 'Переживи неловкую паузу в разговоре, не пытаясь судорожно заполнить её болтовней.', rank: 4, xpReward: 45, socialBonus: 5, minSocialLevel: 4 },
    { id: 's35', title: '🤲 Плавный жест', desc: 'Рассказывая что-то, осознанно используй открытые жесты руками (ладонями вверх).', rank: 4, xpReward: 45, socialBonus: 5, minSocialLevel: 4 },
    { id: 's36', title: '☕ Инвайт', desc: 'Пригласи малознакомого, но интересного тебе человека выпить кофе или пообедать вместе.', rank: 4, xpReward: 50, socialBonus: 5, minSocialLevel: 4 },
    { id: 's37', title: '🎬 Режиссёр', desc: 'Увидев, что кого-то в компании перебили, верни ему слово («Так что ты там говорил про...?»).', rank: 4, xpReward: 50, socialBonus: 6, minSocialLevel: 4 },
    { id: 's38', title: '🎙️ Прокачка голоса', desc: 'Говори более низким и грудным голосом, чем обычно, в течение одного разговора.', rank: 4, xpReward: 50, socialBonus: 6, minSocialLevel: 4 },
    { id: 's39', title: '😂 Шутка в тему', desc: 'Сделай уместное ироничное замечание, заставив улыбнуться хотя бы одного человека.', rank: 4, xpReward: 50, socialBonus: 6, minSocialLevel: 4 },
    { id: 's40', title: '🎯 Центр притяжения', desc: 'Удержи на себе внимание группы из 3+ человек в течение хотя бы минуты.', rank: 4, xpReward: 55, socialBonus: 6, minSocialLevel: 4 },
    // РАНГ 5 (уровни 21–25)
    { id: 's41', title: '🔗 Связующее звено', desc: 'Познакомь двух людей, рассказав им по одному крутому факту друг о друге.', rank: 5, xpReward: 65, socialBonus: 7, minSocialLevel: 5 },
    { id: 's42', title: '🛡️ Сбор рейда', desc: 'Выступи инициатором: собери группу из 3+ друзей/коллег и организуй совместный поход куда-либо.', rank: 5, xpReward: 70, socialBonus: 8, minSocialLevel: 5 },
    { id: 's43', title: '🤝 Дипломат', desc: 'Успокой расстроенного или раздражённого человека, используя только эмпатию и слушание.', rank: 5, xpReward: 70, socialBonus: 8, minSocialLevel: 5 },
    { id: 's44', title: '👔 Разговор с боссом', desc: 'Уверенно и на равных заведи смолл-ток с человеком, который выше тебя по статусу или должности.', rank: 5, xpReward: 75, socialBonus: 8, minSocialLevel: 5 },
    { id: 's45', title: '📢 Глас глашатая', desc: 'Произнеси тост или возьми вступительное слово на встрече/празднике.', rank: 5, xpReward: 75, socialBonus: 9, minSocialLevel: 5 },
    { id: 's46', title: '🔄 Перелом хода', desc: 'Мягко переведи негативное обсуждение (жалобы, сплетни) в позитивное или нейтральное русло.', rank: 5, xpReward: 75, socialBonus: 9, minSocialLevel: 5 },
    { id: 's47', title: '💼 Торговец', desc: 'Попроси о небольшой скидке, бонусе или лучшем столике в заведении с дружелюбной улыбкой.', rank: 5, xpReward: 80, socialBonus: 9, minSocialLevel: 5 },
    { id: 's48', title: '💪 Уверенная просьба', desc: 'Попроси человека об одолжении прямо, без извиняющегося тона («Мне нужна твоя помощь с...»).', rank: 5, xpReward: 80, socialBonus: 10, minSocialLevel: 5 },
    { id: 's49', title: '🧠 Память на имена', desc: 'Попав в новую компанию, запомни и используй в разговоре имена минимум троих людей.', rank: 5, xpReward: 80, socialBonus: 10, minSocialLevel: 5 },
    { id: 's50', title: '🎭 Эмоциональные качели', desc: 'Расскажи историю так, чтобы слушатели испытали сначала напряжение, а затем смех или облегчение.', rank: 5, xpReward: 85, socialBonus: 10, minSocialLevel: 5 },
    // РАНГ 6 (уровни 26–30)
    { id: 's51', title: '🏠 Хост (Хозяин таверны)', desc: 'Прими гостей у себя (или организуй вечеринку), лично следя за тем, чтобы всем было комфортно и никто не скучал.', rank: 6, xpReward: 100, socialBonus: 12, minSocialLevel: 6 },
    { id: 's52', title: '🕊️ Миротворец', desc: 'Выступи медиатором в споре двух людей и помоги им прийти к компромиссу без ссоры.', rank: 6, xpReward: 105, socialBonus: 13, minSocialLevel: 6 },
    { id: 's53', title: '💡 Презентация идеи', desc: 'Успешно «продай» свою идею группе людей (от выбора фильма до рабочего проекта).', rank: 6, xpReward: 105, socialBonus: 13, minSocialLevel: 6 },
    { id: 's54', title: '⚡ Бафф вдохновения', desc: 'Скажи человеку такие слова поддержки, после которых он сразу пойдёт что-то делать или воспрянет духом.', rank: 6, xpReward: 100, socialBonus: 12, minSocialLevel: 6 },
    { id: 's55', title: '😂 Массовый смех', desc: 'Рассмеши аудиторию от 5 и более человек одной историей или шуткой.', rank: 6, xpReward: 110, socialBonus: 14, minSocialLevel: 6 },
    { id: 's56', title: '🛡️ Очарование стражи', desc: 'Выйди из проблемной ситуации (опоздание, мелкий штраф, ошибка) исключительно за счёт обаяния и умения договариваться.', rank: 6, xpReward: 115, socialBonus: 14, minSocialLevel: 6 },
    { id: 's57', title: '🧙 Наставник', desc: 'Объясни сложную концепцию или научи навыку человека так, чтобы он почувствовал себя умным, а не глупым.', rank: 6, xpReward: 115, socialBonus: 15, minSocialLevel: 6 },
    { id: 's58', title: '👑 Властелин зала', desc: 'Войди в помещение, где сидят люди, и своим языком тела и приветствием заставь всех обратить на тебя позитивное внимание.', rank: 6, xpReward: 120, socialBonus: 15, minSocialLevel: 6 },
    { id: 's59', title: '🤝 Мгновенный траст', desc: 'Установи глубокий, доверительный раппорт с новым человеком менее чем за 10 минут.', rank: 6, xpReward: 130, socialBonus: 16, minSocialLevel: 6 },
    { id: 's60', title: '🏆 Ачивка «Легенда»', desc: 'Получи от кого-то искреннюю, невынужденную обратную связь в стиле: «С тобой так круто общаться» или «У тебя потрясающая энергетика».', rank: 6, xpReward: 150, socialBonus: 20, minSocialLevel: 6 }
];

// ========================================
//  ОСТАЛЬНЫЕ БАЗЫ
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

// ========================================
//  ДОСТИЖЕНИЯ
// ========================================

const ACHIEVEMENTS_DB = [
    { id: 'ach_level_3', title: 'Статус авторитета', desc: 'Достигнуть 3 уровня', check: () => getLevel() >= 3, reward: { stats: { str: 5, end: 5, agi: 5, int: 5, cha: 5, per: 5, luck: 5 } } },
    { id: 'ach_level_5', title: 'Мировой Мастер', desc: 'Достигнуть 5 уровня', check: () => getLevel() >= 5, reward: { stats: { str: 10, end: 10, agi: 10, int: 10, cha: 10, per: 10, luck: 10 } } },
    { id: 'ach_level_10', title: 'Легенда', desc: 'Достигнуть 10 уровня', check: () => getLevel() >= 10, reward: { stats: { str: 20, end: 20, agi: 20, int: 20, cha: 20, per: 20, luck: 20 } } },
    { id: 'ach_quest_5', title: 'Квестовый энтузиаст', desc: 'Выполнить 5 ежедневных квестов', check: () => (currentUserData?.total_quests_completed || 0) >= 5, reward: { gold: 30 } },
    { id: 'ach_quest_20', title: 'Квестовый профи', desc: 'Выполнить 20 ежедневных квестов', check: () => (currentUserData?.total_quests_completed || 0) >= 20, reward: { gold: 100 } },
    { id: 'ach_social_5', title: 'Социальная бабочка', desc: 'Выполнить 5 социальных квестов', check: () => (currentUserData?.total_social_quests_completed || 0) >= 5, reward: { stats: { cha: 5 } } },
    { id: 'ach_social_15', title: 'Мастер нетворкинга', desc: 'Выполнить 15 социальных квестов', check: () => (currentUserData?.total_social_quests_completed || 0) >= 15, reward: { stats: { cha: 15 } } },
    { id: 'ach_chest_3', title: 'Коллекционер', desc: 'Открыть 3 сундука', check: () => (currentUserData?.total_chests_opened || 0) >= 3, reward: { gold: 50 } },
    { id: 'ach_chest_10', title: 'Сундучный магнат', desc: 'Открыть 10 сундуков', check: () => (currentUserData?.total_chests_opened || 0) >= 10, reward: { gold: 150 } },
    { id: 'ach_goal_3', title: 'Целеустремлённый', desc: 'Выполнить 3 цели', check: () => (currentUserData?.total_goals_completed || 0) >= 3, reward: { stats: { luck: 20 } } },
    { id: 'ach_goal_10', title: 'Мастер целей', desc: 'Выполнить 10 целей', check: () => (currentUserData?.total_goals_completed || 0) >= 10, reward: { stats: { luck: 50 } } },
    { id: 'ach_social_level_5', title: 'Социальный лидер', desc: 'Достигнуть 5 социального уровня', check: () => (currentUserData?.socialLevel || 1) >= 5, reward: { stats: { cha: 10 } } },
    { id: 'ach_items_5', title: 'Начинающий коллекционер', desc: 'Собрать 5 разных предметов', check: () => (currentUserData?.inventory?.length || 0) >= 5, reward: { gold: 50 } },
    { id: 'ach_items_15', title: 'Собиратель сокровищ', desc: 'Собрать 15 разных предметов', check: () => (currentUserData?.inventory?.length || 0) >= 15, reward: { gold: 150 } }
];

function getLevel() {
    if (!currentUserData) return 1;
    const stats = currentUserData.stats;
    const total = stats.str + stats.end + stats.agi + stats.int + stats.cha + stats.per + stats.luck;
    return Math.floor(total / EXP) + 1;
}

// ========================================
//  СЕССИЯ
// ========================================

function saveSession(username) {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ username: username, loginTime: new Date().toISOString() }));
    } catch (e) { console.error('Error saving session:', e); }
}

function getSession() {
    try {
        const data = localStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
}

function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { console.error('Error clearing session:', e); }
}

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
        last_sleep_date: '',
        goals: [],
        socialLevel: 1,
        socialXP: 0,
        socialQuests: [],
        lastSocialDate: '',
        total_quests_completed: 0,
        total_social_quests_completed: 0,
        total_chests_opened: 0,
        total_goals_completed: 0,
        achievements: [],
        last_weekly_date: '',
        randomQuest: null,
        lastRandomDate: ''
    };
    const result = await supabaseRequest('POST', TABLE_NAME, newUser);
    return result && result.length > 0 ? result[0] : null;
}

async function updateUser(username, data) {
    const result = await supabaseRequest('PATCH', `${TABLE_NAME}?username=eq.${encodeURIComponent(username)}`, data);
    return result && result.length > 0 ? result[0] : null;
}

// ========================================
//  НОРМАЛИЗАЦИЯ ДАННЫХ
// ========================================

function normalizeUserData(user) {
    if (!user) return user;
    const normalized = JSON.parse(JSON.stringify(user));

    if (!normalized.stats || typeof normalized.stats !== 'object') {
        normalized.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 };
    } else {
        const defaultStats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 };
        normalized.stats = { ...defaultStats, ...normalized.stats };
    }

    if (!normalized.inventory) {
        normalized.inventory = [];
    } else if (typeof normalized.inventory === 'string') {
        try {
            const parsed = JSON.parse(normalized.inventory);
            normalized.inventory = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            normalized.inventory = [];
        }
    } else if (!Array.isArray(normalized.inventory)) {
        normalized.inventory = [];
    }

    const arrayFields = ['completed_quests', 'current_quests', 'goals', 'socialQuests', 'achievements'];
    arrayFields.forEach(field => {
        if (!normalized[field]) {
            normalized[field] = [];
        } else if (typeof normalized[field] === 'string') {
            try {
                const parsed = JSON.parse(normalized[field]);
                normalized[field] = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                normalized[field] = [];
            }
        } else if (!Array.isArray(normalized[field])) {
            normalized[field] = [];
        }
    });

    const numberFields = ['socialLevel', 'socialXP', 'total_quests_completed', 'total_social_quests_completed', 'total_chests_opened', 'total_goals_completed'];
    numberFields.forEach(field => {
        if (normalized[field] === undefined || normalized[field] === null) {
            normalized[field] = 0;
        } else if (typeof normalized[field] === 'string') {
            normalized[field] = parseInt(normalized[field]) || 0;
        }
    });

    const stringFields = ['last_quest_date', 'last_sleep_date', 'lastSocialDate', 'last_weekly_date', 'lastRandomDate'];
    stringFields.forEach(field => {
        if (typeof normalized[field] !== 'string') {
            normalized[field] = '';
        }
    });

    if (normalized.randomQuest && typeof normalized.randomQuest === 'string') {
        try {
            normalized.randomQuest = JSON.parse(normalized.randomQuest);
        } catch (e) {
            normalized.randomQuest = null;
        }
    }
    if (normalized.randomQuest && typeof normalized.randomQuest === 'object') {
        // оставляем
    } else {
        normalized.randomQuest = null;
    }

    return normalized;
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
        currentUserData = normalizeUserData(user);
        saveSession(username);
        
        showGameScreen();
        document.getElementById('user-nick').textContent = username;
        await checkDailyRotation();
        await refreshSocialQuests();
        updateUI();
        renderQuests();
        renderGoals();
        renderHotbar();
        renderSocialQuests();
        renderAchievements();
        renderRouletteResult('');
        renderRandomQuestDisplay();
        toast('✅ Добро пожаловать, ' + username + '!', 'success');
    } catch (e) {
        errorEl.textContent = '❌ Ошибка: ' + e.message;
    }
    // Вызов онбординга для новых игроков
    if (currentUserData && currentUserData.stats && !currentUserData.stats.has_seen_onboarding) {
        setTimeout(showOnboarding, 500);
    }
}

function logoutUser() {
    if (confirm('Выйти из аккаунта?')) {
        currentUsername = null;
        currentUserData = null;
        clearSession();
        showAuthScreen();
        toast('👋 До встречи!', 'info');
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

async function restoreSession() {
    const session = getSession();
    if (!session || !session.username) {
        showAuthScreen();
        return false;
    }

    try {
        const user = await getUser(session.username);
        if (!user) {
            clearSession();
            showAuthScreen();
            return false;
        }

        currentUsername = session.username;
        currentUserData = normalizeUserData(user);
        showGameScreen();
        document.getElementById('user-nick').textContent = currentUsername;
        await checkDailyRotation();
        await refreshSocialQuests();
        updateUI();
        renderQuests();
        renderGoals();
        renderHotbar();
        renderSocialQuests();
        renderAchievements();
        renderRouletteResult('');
        renderRandomQuestDisplay();
        initRoulette();
        toast('🔁 Сессия восстановлена', 'info');
        return true;
    } catch (e) {
        console.error('Session restore error:', e);
        clearSession();
        showAuthScreen();
        return false;
    }
}

// ========================================
//  TOAST
// ========================================

function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.textContent = message;
    container.appendChild(toastEl);
    setTimeout(() => {
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateY(10px)';
        setTimeout(() => toastEl.remove(), 300);
    }, 3500);
}

// ========================================
//  ИГРОВАЯ ЛОГИКА
// ========================================

function switchTab(id, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (btn) btn.classList.add('active');
    if (id === 'goals-screen') renderGoals();
    if (id === 'main-screen') {
        renderHotbar();
        renderRandomQuestDisplay();
    }
    if (id === 'quests-screen') {
        renderQuests();
        renderSocialQuests();
    }
    if (id === 'shop-screen') {
        renderRouletteResult('');
        renderInventory();
        drawWheel(currentAngle || 0);
    }
    if (id === 'achieve-screen') renderAchievements();
}

async function checkDailyRotation() {
    if (!currentUserData) return;
    const today = new Date().toDateString();
    if (currentUserData.last_quest_date !== today || !currentUserData.current_quests?.length) {
        const shuffled = [...QUESTS_DATABASE].sort(() => 0.5 - Math.random());
        currentUserData.current_quests = shuffled.slice(0, 3);
        currentUserData.completed_quests = currentUserData.completed_quests?.filter(id => id === 'w1') || [];
        currentUserData.last_quest_date = today;
        await saveUserData();
    }
}

function renderQuests() {
    const container = document.getElementById('quests-container');
    if (!container) return;
    if (!currentUserData?.current_quests?.length) {
        container.innerHTML = `<div style="color:var(--text-secondary); text-align:center; padding:20px;">Нет активных квестов. Зайдите завтра!</div>`;
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
            <button class="action-btn ${q.type || ''}" id="${q.id}" ${isDone ? 'disabled' : ''} onclick="completeQuest('${q.id}', '${q.stat}', ${q.points}, ${q.gold})">${isDone ? 'Выполнено' : 'Выполнить'}</button>
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

    const avatar = getAvatar(lvl);
    // 1. Обновляем мини-аватар в верхней шапке
    const headerAv = document.getElementById('header-avatar');
    if (headerAv) {
        headerAv.innerHTML = `<i class="ph ${avatar.icon}"></i>`;
        headerAv.title = avatar.name;
    }

    // 2. Обновляем "куклу" персонажа на главном экране
    const dollContainer = document.getElementById('profile-doll');
    if (dollContainer) {
        let dollHTML = `<i class="ph ${avatar.icon} doll-base" title="${avatar.name}"></i>`;
        
        const inv = currentUserData.inventory || [];
        const hasItem = (name) => inv.some(i => i.name === name);

        // Если в инвентаре есть предметы, наслаиваем их иконки
        if (hasItem('Корона')) dollHTML += `<i class="ph ph-crown doll-item head"></i>`;
        if (hasItem('Меч')) dollHTML += `<i class="ph ph-sword doll-item hand-right"></i>`;
        if (hasItem('Щит')) dollHTML += `<i class="ph ph-shield doll-item hand-left"></i>`;
        if (hasItem('Трофей')) dollHTML += `<i class="ph ph-trophy doll-item body"></i>`;

        dollContainer.innerHTML = dollHTML;
    }
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

    const socialLevel = currentUserData.socialLevel || 1;
    const socialXP = currentUserData.socialXP || 0;
    const socialProgress = Math.min(100, (socialXP / SOCIAL_XP_PER_LEVEL) * 100);
    document.getElementById('social-level-display').textContent = socialLevel;
    document.getElementById('social-xp-display').textContent = socialXP + ' / ' + SOCIAL_XP_PER_LEVEL + ' XP';
    document.getElementById('social-percent-display').textContent = Math.round(socialProgress) + '%';
    document.getElementById('social-bar').style.width = socialProgress + '%';

    const socialBadge = document.getElementById('social-level-badge');
    if (socialBadge) {
        socialBadge.textContent = 'Соц.' + socialLevel;
    }

    renderAchievements();

    const wBtn = document.getElementById('w1');
    if (wBtn) {
        const isDone = currentUserData.completed_quests.includes('w1');
        if (isDone) {
            wBtn.style.background = '#2c2c2e';
            wBtn.style.opacity = '0.4';
            wBtn.style.pointerEvents = 'none';
            wBtn.textContent = 'Выполнено';
        } else {
            wBtn.style.background = 'linear-gradient(135deg, #ff5e00, #ff9500)';
            wBtn.style.opacity = '1';
            wBtn.style.pointerEvents = 'auto';
            wBtn.textContent = 'Выполнить';
        }
    }

    const sBtn = document.getElementById('sleep-action-btn');
    if (sBtn) {
        if (currentUserData.last_sleep_date === new Date().toDateString()) {
            sBtn.style.background = '#2c2c2e';
            sBtn.style.opacity = '0.4';
            sBtn.textContent = '💤 Отмечено';
        } else {
            sBtn.style.background = 'linear-gradient(135deg, #0055ff, #0a84ff)';
            sBtn.style.opacity = '1';
            sBtn.textContent = '🛌 Лечь спать';
        }
    }

    renderInventory();
    renderHotbar();
    renderRandomQuestDisplay();
}

// ========================================
//  ИНВЕНТАРЬ
// ========================================

function renderInventory() {
    const container = document.getElementById('inventory-list');
    if (!container) return;
    if (!currentUserData) {
        container.innerHTML = `<span style="color:var(--text-secondary); font-style: italic;">Войдите в игру...</span>`;
        return;
    }
    
    if (!Array.isArray(currentUserData.inventory)) {
        if (typeof currentUserData.inventory === 'string') {
            try {
                currentUserData.inventory = JSON.parse(currentUserData.inventory);
                if (!Array.isArray(currentUserData.inventory)) currentUserData.inventory = [];
            } catch (e) {
                currentUserData.inventory = [];
            }
        } else {
            currentUserData.inventory = [];
        }
    }
    
    const inventory = currentUserData.inventory;
    if (inventory.length === 0) {
        container.innerHTML = `<span style="color:var(--text-secondary); font-style: italic;">У вас пока нет снаряжения...</span>`;
        return;
    }
    
    container.innerHTML = inventory.map((item) => {
        if (typeof item === 'string') {
            return `<span class="inv-item">📦 ${item}</span>`;
        }
        if (item && typeof item === 'object') {
            const rarity = RARITIES[item.rarity] || RARITIES.common;
            const statLabel = STAT_LABELS[item.stat] || '';
            const bonusText = item.stat && item.bonus ? `+${item.bonus} ${statLabel}` : '';
            return `
                <span class="inv-item" style="border-color: ${rarity.color}; background: ${rarity.color}22;" title="${item.desc || ''}">
                    <i class="ph ${item.icon || 'ph-package'}" style="font-size: 22px; color: var(--text-primary);"></i>
                    <span style="font-weight:600;">${item.name || 'Предмет'}</span>
                    ${bonusText ? `<span style="font-size:11px; color:#ffcc00;">${bonusText}</span>` : ''}
                    <span style="font-size:10px; color:${rarity.color}; padding:2px 8px; background:${rarity.color}33; border-radius:8px;">${rarity.label}</span>
                </span>
            `;
        }
        return `<span class="inv-item">📦 Неизвестный предмет</span>`;
    }).join('');
}

// ========================================
//  СОХРАНЕНИЕ ДАННЫХ
// ========================================

async function saveUserData() {
    if (!currentUserData || !currentUsername) {
        console.error('❌ Нечего сохранять');
        return;
    }
    currentUserData = normalizeUserData(currentUserData);
    
    const dataToSave = {
        stats: currentUserData.stats,
        inventory: currentUserData.inventory,
        completed_quests: currentUserData.completed_quests || [],
        current_quests: currentUserData.current_quests || [],
        last_quest_date: currentUserData.last_quest_date || '',
        last_sleep_date: currentUserData.last_sleep_date || '',
        goals: currentUserData.goals || [],
        socialLevel: currentUserData.socialLevel || 1,
        socialXP: currentUserData.socialXP || 0,
        socialQuests: currentUserData.socialQuests || [],
        lastSocialDate: currentUserData.lastSocialDate || '',
        total_quests_completed: currentUserData.total_quests_completed || 0,
        total_social_quests_completed: currentUserData.total_social_quests_completed || 0,
        total_chests_opened: currentUserData.total_chests_opened || 0,
        total_goals_completed: currentUserData.total_goals_completed || 0,
        achievements: currentUserData.achievements || [],
        last_weekly_date: currentUserData.last_weekly_date || '',
        randomQuest: currentUserData.randomQuest || null,
        lastRandomDate: currentUserData.lastRandomDate || ''
    };
    
    try {
        await updateUser(currentUsername, dataToSave);
    } catch (e) {
        console.error('❌ Ошибка сохранения:', e);
        toast('⚠️ Ошибка сохранения!', 'error');
    }
}

// ========================================
//  ТРЕНИРОВКИ И СОН
// ========================================

async function train(type) {
    if (!currentUserData) return;
    const now = Date.now();
    if (now - lastTrainTime < 1000) {
        toast('⏳ Подожди секунду!', 'warning');
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
        toast('💤 Вы уже отметили сон сегодня!', 'info');
        return;
    }
    const hours = now.getHours();
    if (hours >= 0 && hours < 6) {
        currentUserData.stats.per = Math.max(0, (currentUserData.stats.per || 0) - 10);
        toast('⚠️ Вы легли после полуночи! -10 Дисциплина.', 'error');
    } else {
        currentUserData.stats.per = (currentUserData.stats.per || 0) + 10;
        currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 15;
        toast('🏆 Отличный режим! +10 Дисциплина / +15 🪙', 'success');
    }
    currentUserData.last_sleep_date = today;
    await saveUserData();
    updateUI();
}

// ========================================
//  КВЕСТЫ
// ========================================

async function completeQuest(id, type, points, gold) {
    if (!currentUserData || currentUserData.completed_quests.includes(id)) return;
    currentUserData.stats[type] = (currentUserData.stats[type] || 0) + points;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + gold;
    currentUserData.completed_quests.push(id);
    currentUserData.total_quests_completed = (currentUserData.total_quests_completed || 0) + 1;
    await saveUserData();
    updateUI();
    renderQuests();
    renderAchievements();
    toast(`✅ Квест выполнен! +${points} XP, +${gold} 🪙`, 'success');
}

async function completeWeeklyChallenge(btn) {
    if (!currentUserData) return;
    const today = new Date().toDateString();
    const lastWeekly = currentUserData.last_weekly_date || '';
    if (lastWeekly === today) {
        toast('⏳ Вы уже выполнили вызов сегодня!', 'warning');
        return;
    }
    if (lastWeekly) {
        const lastDate = new Date(lastWeekly);
        const diffDays = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            toast('⏳ Выполнить вызов можно раз в неделю!', 'warning');
            return;
        }
    }

    ['str', 'end', 'agi', 'int', 'cha', 'per'].forEach(id => {
        currentUserData.stats[id] = (currentUserData.stats[id] || 0) + 8;
    });
    currentUserData.stats.luck = (currentUserData.stats.luck || 0) + 15;
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + 100;
    currentUserData.completed_quests.push('w1');
    currentUserData.last_weekly_date = today;
    await saveUserData();
    updateUI();
    toast('⭐ Вызов выполнен! Награда получена!', 'success');
}

// ========================================
//  СИСТЕМА СУНДУКОВ
// ========================================

function getRandomItem() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedRarity = 'common';
    for (const [rarity, config] of Object.entries(RARITIES)) {
        cumulative += config.weight;
        if (rand <= cumulative) {
            selectedRarity = rarity;
            break;
        }
    }
    const pool = ITEMS_POOL.filter(item => item.rarity === selectedRarity);
    if (pool.length === 0) {
        return ITEMS_POOL[Math.floor(Math.random() * ITEMS_POOL.length)];
    }
    return JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]));
}

// ── CHEST ANIMATION ──────────────────────────────────────

const RARITY_GLOW = {
    legendary: '#ffe600',
    epic:       '#cc44ff',
    rare:       '#4488ff',
    uncommon:   '#00ff88',
    common:     '#aaaacc',
};

const CHEST_EMOJI_MAP = {
    common: '📦',
    epic:   '👑',
};

function spawnParticles(color) {
    const container = document.getElementById('chest-particles');
    container.innerHTML = '';
    const count = 28;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'chest-particle';
        const angle = (i / count) * 360;
        const dist  = 80 + Math.random() * 100;
        const rad   = angle * Math.PI / 180;
        const tx    = Math.cos(rad) * dist + 'px';
        const ty    = Math.sin(rad) * dist + 'px';
        const size  = 4 + Math.random() * 7;
        const delay = Math.random() * 0.15;
        const dur   = 0.5 + Math.random() * 0.4;
        p.style.cssText = `
            background: ${color};
            width: ${size}px; height: ${size}px;
            --tx: ${tx}; --ty: ${ty};
            box-shadow: 0 0 6px ${color};
            animation: particle-fly ${dur}s ease-out ${delay}s forwards;
        `;
        container.appendChild(p);
    }
}

function flashRing(color) {
    const ring = document.getElementById('chest-ring');
    ring.style.border = `3px solid ${color}`;
    ring.style.boxShadow = `0 0 30px ${color}, inset 0 0 20px ${color}`;
    ring.classList.remove('pop');
    void ring.offsetWidth;
    ring.classList.add('pop');
}

function showChestModal(tier, item) {
    const modal     = document.getElementById('chest-modal');
    const emojiEl   = document.getElementById('chest-emoji');
    const labelEl   = document.getElementById('chest-label');
    const revealEl  = document.getElementById('chest-item-reveal');
    const iconEl    = document.getElementById('chest-item-icon');
    const nameEl    = document.getElementById('chest-item-name');
    const rarityEl  = document.getElementById('chest-item-rarity');
    const bonusEl   = document.getElementById('chest-item-bonus');
    const closeBtn  = document.getElementById('chest-close-btn');

    const rarityConfig = RARITIES[item.rarity] || RARITIES.common;
    const glowColor    = RARITY_GLOW[item.rarity] || '#aaaacc';
    const chestEmoji   = CHEST_EMOJI_MAP[tier] || '📦';

    emojiEl.className   = 'chest-emoji idle';
    emojiEl.textContent = chestEmoji;
    emojiEl.style.setProperty('--burst-color', glowColor);
    labelEl.textContent   = 'Нажмите, чтобы открыть';
    revealEl.classList.remove('visible');
    closeBtn.classList.remove('visible');
    iconEl.textContent    = item.icon || '🎁';
    nameEl.textContent    = item.name;
    rarityEl.textContent  = rarityConfig.label || item.rarity;
    rarityEl.style.background = glowColor;
    rarityEl.style.color      = '#000';
    bonusEl.textContent = `+${item.bonus} к ${STAT_LABELS[item.stat] || 'характеристике'}`;
    iconEl.style.filter = `drop-shadow(0 0 16px ${glowColor})`;

    modal.classList.add('active');

    let opened = false;
    function doOpen() {
        if (opened) return;
        opened = true;
        emojiEl.removeEventListener('click', doOpen);
        labelEl.textContent = '...';

        emojiEl.className = 'chest-emoji shaking';

        setTimeout(() => {
            emojiEl.className = 'chest-emoji burst';
            emojiEl.textContent = tier === 'epic' ? '🎁' : '📬';
            spawnParticles(glowColor);
            flashRing(glowColor);
            labelEl.textContent = 'Вы получили...';
        }, 600);

        setTimeout(() => {
            revealEl.classList.add('visible');
        }, 1100);

        setTimeout(() => {
            closeBtn.classList.add('visible');
        }, 1600);
    }

    emojiEl.style.cursor = 'pointer';
    emojiEl.addEventListener('click', doOpen);

    setTimeout(() => doOpen(), 2000);
}

function closeChestModal() {
    document.getElementById('chest-modal').classList.remove('active');
    document.getElementById('chest-particles').innerHTML = '';
}

// ── OPEN CHEST (main function) ────────────────────────────

async function openChest(tier, price) {
    if (!currentUserData) return;
    if ((currentUserData.stats.gold || 0) < price) {
        toast('❌ Недостаточно монет!', 'error');
        return;
    }
    currentUserData.stats.gold -= price;
    const item = getRandomItem();
    if (!Array.isArray(currentUserData.inventory)) {
        currentUserData.inventory = [];
    }
    currentUserData.inventory.push(item);
    if (item.stat && item.bonus) {
        currentUserData.stats[item.stat] = (currentUserData.stats[item.stat] || 0) + item.bonus;
    }
    currentUserData.total_chests_opened = (currentUserData.total_chests_opened || 0) + 1;
    await saveUserData();
    updateUI();
    renderInventory();
    renderAchievements();
    showChestModal(tier, item);
}

// ========================================
//  СИСТЕМА ЦЕЛЕЙ
// ========================================

function getRarityConfig(rarity) {
    return RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
}

function updateRewardPreview() {
    const rarity = document.getElementById('goal-rarity')?.value || 'common';
    const stat = document.getElementById('goal-stat')?.value || 'str';
    const config = getRarityConfig(rarity);
    const previewEl = document.getElementById('goal-reward-preview');
    if (previewEl) {
        previewEl.innerHTML = `
            🎁 Награда: <span style="color:#ffcc00;">+${config.xp} XP</span> + 
            <span style="color:${config.color};">+${config.statBonus} ${STAT_LABELS[stat]}</span>
            <span style="color:var(--text-secondary); font-size:11px; margin-left:8px;">(${config.label})</span>
        `;
    }
}

function showAddGoalModal() {
    document.getElementById('goal-modal').classList.add('active');
    document.getElementById('goal-title').value = '';
    document.getElementById('goal-desc').value = '';
    document.getElementById('goal-target').value = '';
    document.getElementById('goal-unit').value = '';
    document.getElementById('goal-rarity').value = 'common';
    document.getElementById('goal-stat').value = 'str';
    updateRewardPreview();
}

function closeGoalModal() {
    document.getElementById('goal-modal').classList.remove('active');
}

async function addGoal() {
    const title = document.getElementById('goal-title').value.trim();
    const description = document.getElementById('goal-desc').value.trim();
    const target = parseFloat(document.getElementById('goal-target').value);
    const unit = document.getElementById('goal-unit').value.trim();
    const rarity = document.getElementById('goal-rarity').value;
    const stat = document.getElementById('goal-stat').value;
    const config = getRarityConfig(rarity);

    if (!title) {
        toast('❌ Введите название цели!', 'error');
        return;
    }
    if (!target || target <= 0) {
        toast('❌ Введите целевое значение (число > 0)!', 'error');
        return;
    }

    const newGoal = {
        id: Date.now().toString(),
        title,
        description: description || '',
        target,
        current: 0,
        unit: unit || '',
        rarity: rarity,
        stat: stat,
        xpReward: config.xp,
        statBonus: config.statBonus,
        completed: false,
        createdAt: new Date().toISOString()
    };

    if (!Array.isArray(currentUserData.goals)) {
        currentUserData.goals = [];
    }
    currentUserData.goals.push(newGoal);
    await saveUserData();
    closeGoalModal();
    renderGoals();
    renderHotbar();
    toast(`🎯 Цель "${title}" добавлена! (${config.label})`, 'success');
}

function renderHotbar() {
    const container = document.getElementById('hotbar-goals');
    if (!container) return;
    if (!currentUserData?.goals?.length) {
        container.innerHTML = '<div class="hotbar-empty">Нет активных целей. Добавьте!</div>';
        return;
    }
    const activeGoals = currentUserData.goals.filter(g => !g.completed).slice(0, 3);
    if (!activeGoals.length) {
        container.innerHTML = '<div class="hotbar-empty">Все цели выполнены! 🎉</div>';
        return;
    }
    container.innerHTML = activeGoals.map(g => {
        const config = getRarityConfig(g.rarity);
        const progress = g.target > 0 ? Math.min(100, (g.current || 0) / g.target * 100) : 0;
        const isDone = progress >= 100;
        return `
            <div class="hotbar-goal" style="border-left-color: ${config.color};">
                <div>
                    <div class="title">${g.title}</div>
                    <div class="progress">${g.current || 0} / ${g.target} ${g.unit || ''}</div>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span class="rarity-badge" style="background:${config.color};">${config.label}</span>
                    ${isDone ? '<span class="done">✅</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderGoals() {
    const container = document.getElementById('goals-container');
    if (!container) return;
    if (!currentUserData?.goals?.length) {
        container.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:20px;">У вас пока нет целей. Добавьте первую!</div>';
        return;
    }
    container.innerHTML = currentUserData.goals.map((g, index) => {
        const config = getRarityConfig(g.rarity);
        const progress = g.target > 0 ? Math.min(100, (g.current || 0) / g.target * 100) : 0;
        const isCompleted = g.completed || progress >= 100;
        return `
            <div class="goal-card ${isCompleted ? 'completed' : ''}" style="border-color: ${isCompleted ? '#30d158' : config.color};">
                <div class="goal-header">
                    <div class="goal-title" style="color: ${isCompleted ? '#30d158' : config.color};">${g.title}</div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="rarity-badge" style="background:${config.color};">${config.label}</span>
                        <div style="font-size:13px; color:var(--text-secondary);">${Math.round(progress)}%</div>
                    </div>
                </div>
                ${g.description ? `<div class="goal-desc">${g.description}</div>` : ''}
                <div class="goal-progress">
                    <span style="font-size:13px; color:var(--text-secondary);">${g.current || 0}</span>
                    <div class="goal-progress-bar">
                        <div class="fill" style="width:${progress}%; background: ${config.color};"></div>
                    </div>
                    <span style="font-size:13px; color:var(--text-secondary);">${g.target} ${g.unit || ''}</span>
                </div>
                <div class="goal-reward">
                    🎁 Награда: <span>+${config.xp} XP</span> + <span style="color:${config.color};">+${config.statBonus} ${STAT_LABELS[g.stat] || '💪 Сила'}</span>
                </div>
                <div class="goal-actions">
                    ${!isCompleted ? `
                        <button onclick="updateGoalProgress(${index}, 1)">➕ +1</button>
                        <button onclick="updateGoalProgress(${index}, 5)">➕ +5</button>
                        <button onclick="updateGoalProgress(${index}, 10)">➕ +10</button>
                        <button onclick="setGoalComplete(${index})" class="done-btn">✅ Выполнено</button>
                    ` : `
                        <span style="color:#30d158; font-weight:600;">✅ Выполнено!</span>
                    `}
                    <button onclick="deleteGoal(${index})" class="delete-btn">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

async function updateGoalProgress(index, amount) {
    if (!currentUserData?.goals?.[index]) return;
    const goal = currentUserData.goals[index];
    if (goal.completed) return;
    goal.current = (goal.current || 0) + amount;
    if (goal.current >= goal.target) {
        goal.current = goal.target;
        goal.completed = true;
        await claimGoalReward(index);
        toast(`🎉 Цель "${goal.title}" выполнена! Молодец!`, 'success');
    }
    await saveUserData();
    renderGoals();
    renderHotbar();
    updateUI();
    renderAchievements();
}

async function setGoalComplete(index) {
    if (!currentUserData?.goals?.[index]) return;
    const goal = currentUserData.goals[index];
    if (goal.completed) return;
    if (!confirm(`Отметить "${goal.title}" как выполненную?`)) return;
    goal.completed = true;
    goal.current = goal.target;
    await claimGoalReward(index);
    await saveUserData();
    renderGoals();
    renderHotbar();
    updateUI();
    renderAchievements();
    toast('✅ Цель отмечена как выполненная! Награда получена!', 'success');
}

async function claimGoalReward(index) {
    if (!currentUserData?.goals?.[index]) return;
    const goal = currentUserData.goals[index];
    const config = getRarityConfig(goal.rarity);
    const targetStat = goal.stat || 'str';
    currentUserData.stats[targetStat] = (currentUserData.stats[targetStat] || 0) + config.statBonus;
    currentUserData.stats.luck = (currentUserData.stats.luck || 0) + Math.floor(config.xp / 5);
    currentUserData.stats.gold = (currentUserData.stats.gold || 0) + config.xp * 2;
    currentUserData.total_goals_completed = (currentUserData.total_goals_completed || 0) + 1;
}

async function deleteGoal(index) {
    if (!currentUserData?.goals?.[index]) return;
    const goal = currentUserData.goals[index];
    if (!confirm(`Удалить цель "${goal.title}"?`)) return;
    currentUserData.goals.splice(index, 1);
    await saveUserData();
    renderGoals();
    renderHotbar();
}

// ========================================
//  СОЦИАЛЬНЫЕ КВЕСТЫ
// ========================================

async function refreshSocialQuests() {
    if (!currentUserData) return;
    const today = new Date().toDateString();
    if (currentUserData.lastSocialDate !== today || !currentUserData.socialQuests?.length) {
        const chaLevel = currentUserData.stats.cha || 0;
        let rank = 1;
        if (chaLevel >= 26) rank = 6;
        else if (chaLevel >= 21) rank = 5;
        else if (chaLevel >= 16) rank = 4;
        else if (chaLevel >= 11) rank = 3;
        else if (chaLevel >= 6) rank = 2;

        const available = SOCIAL_QUESTS_DB.filter(q => q.rank === rank);
        const shuffled = available.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 2);
        currentUserData.socialQuests = selected.map(q => ({ ...q, completed: false }));
        currentUserData.lastSocialDate = today;
        await saveUserData();
    }
}

function renderSocialQuests() {
    const container = document.getElementById('social-quests-container');
    if (!container) return;
    if (!currentUserData?.socialQuests?.length) {
        container.innerHTML = '<div class="social-quest-empty">Нет доступных социальных квестов. Зайдите завтра!</div>';
        return;
    }
    container.innerHTML = '';
    currentUserData.socialQuests.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'social-quest-card';
        const isDone = q.completed;
        card.innerHTML = `
            <div class="social-quest-rank">Ранг ${q.rank}</div>
            <div class="title">${q.title}</div>
            <div class="desc">${q.desc}</div>
            <div class="reward">🎁 Награда: +${q.xpReward} XP соц. уровня, +${q.socialBonus} к Харизме</div>
            <div class="actions">
                <button onclick="completeSocialQuest(${index})" ${isDone ? 'class="done"' : ''}>${isDone ? '✅ Выполнено' : '✅ Выполнить'}</button>
            </div>
        `;
        container.appendChild(card);
    });
    updateSocialTimer();
}

async function completeSocialQuest(index) {
    if (!currentUserData?.socialQuests?.[index]) return;
    const quest = currentUserData.socialQuests[index];
    if (quest.completed) {
        toast('Этот квест уже выполнен!', 'warning');
        return;
    }
    quest.completed = true;
    currentUserData.socialXP = (currentUserData.socialXP || 0) + quest.xpReward;
    currentUserData.stats.cha = (currentUserData.stats.cha || 0) + quest.socialBonus;
    currentUserData.total_social_quests_completed = (currentUserData.total_social_quests_completed || 0) + 1;
    let leveledUp = false;
    while (currentUserData.socialXP >= SOCIAL_XP_PER_LEVEL) {
        currentUserData.socialXP -= SOCIAL_XP_PER_LEVEL;
        currentUserData.socialLevel = (currentUserData.socialLevel || 1) + 1;
        leveledUp = true;
    }
    await saveUserData();
    updateUI();
    renderSocialQuests();
    renderAchievements();
    if (leveledUp) {
        toast(`🎉 Социальный уровень повышен! Теперь ты ${currentUserData.socialLevel} уровень!`, 'success');
    } else {
        toast(`✅ Квест выполнен! +${quest.xpReward} XP, +${quest.socialBonus} к харизме.`, 'success');
    }
    await refreshSocialQuests();
}

function updateSocialTimer() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const timerEl = document.getElementById('social-timer');
    if (timerEl) {
        timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

// ========================================
//  ДОСТИЖЕНИЯ
// ========================================

function renderAchievements() {
    const container = document.getElementById('achievements-container');
    if (!container) return;
    if (!currentUserData) {
        container.innerHTML = '<div style="color:var(--text-secondary); text-align:center;">Войдите, чтобы видеть достижения</div>';
        return;
    }
    
    if (!Array.isArray(currentUserData.achievements)) {
        currentUserData.achievements = [];
    }
    
    let anyUnlocked = false;
    const toUnlock = [];
    ACHIEVEMENTS_DB.forEach(ach => {
        if (!currentUserData.achievements.includes(ach.id) && ach.check()) {
            toUnlock.push(ach);
            currentUserData.achievements.push(ach.id);
            if (ach.reward.stats) {
                Object.keys(ach.reward.stats).forEach(stat => {
                    currentUserData.stats[stat] = (currentUserData.stats[stat] || 0) + ach.reward.stats[stat];
                });
            }
            if (ach.reward.gold) {
                currentUserData.stats.gold = (currentUserData.stats.gold || 0) + ach.reward.gold;
            }
            anyUnlocked = true;
        }
    });
    
    if (anyUnlocked) {
        saveUserData().then(() => {
            updateUI();
            toUnlock.forEach(ach => toast(`🏆 Достижение разблокировано: ${ach.title}!`, 'success'));
        });
    }
    
    container.innerHTML = ACHIEVEMENTS_DB.map(ach => {
        const unlocked = currentUserData.achievements.includes(ach.id);
        const progress = ach.check() ? 1 : 0;
        const progressPercent = progress * 100;
        return `
            <div class="achieve-card ${unlocked ? '' : 'locked'}">
                <div class="achieve-header">
                    <span class="achieve-title">${unlocked ? '✅' : '🔒'} ${ach.title}</span>
                    <span class="achieve-badge">${unlocked ? 'Получено' : 'Закрыто'}</span>
                </div>
                <div class="achieve-desc">${ach.desc}</div>
                <div class="achieve-progress-bar"><div class="fill" style="width:${progressPercent}%;"></div></div>
                <div class="achieve-progress">${unlocked ? 'Выполнено!' : 'Не выполнено'}</div>
                <div class="achieve-reward">
                    🎁 Награда: 
                    ${ach.reward.stats ? Object.entries(ach.reward.stats).map(([s, v]) => `+${v} ${STAT_LABELS[s]}`).join(', ') : ''}
                    ${ach.reward.gold ? `+${ach.reward.gold} 🪙` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ========================================
//  НОВАЯ РУЛЕТКА (КАЗИНО-СТИЛЬ)
// ========================================

const ROULETTE_SECTORS = [
    { emoji: '🎁', label: 'Подарок', color: '#ff6b6b' },
    { emoji: '💰', label: 'Монеты', color: '#feca57' },
    { emoji: '💎', label: 'Алмаз', color: '#48dbfb' },
    { emoji: '⭐', label: 'Звезда', color: '#ff9ff3' },
    { emoji: '🏆', label: 'Трофей', color: '#f368e0' },
    { emoji: '🎯', label: 'Мишень', color: '#ff9f43' },
    { emoji: '🎲', label: 'Кубик', color: '#00d2d3' },
    { emoji: '🌀', label: 'Циклон', color: '#54a0ff' }
];

let rouletteCanvas = null;
let ctx = null;
let isSpinning = false;
let currentAngle = 0;
let spinVelocity = 0;
let animationId = null;

function initRoulette() {
    const canvas = document.getElementById('roulette-canvas');
    if (!canvas) return;
    const size = Math.min(canvas.parentElement?.offsetWidth || 320, 320);
    canvas.width  = size;
    canvas.height = size;
    rouletteCanvas = canvas;
    ctx = canvas.getContext('2d');
    drawWheel(currentAngle);
}

function drawWheel(angle) {
    if (!ctx || !rouletteCanvas) return;
    const canvas = rouletteCanvas;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R  = Math.min(W, H) * 0.46;

    ctx.clearRect(0, 0, W, H);

    const count = ROULETTE_SECTORS.length;
    const arc   = (2 * Math.PI) / count;

    const DARK_COLORS = [
        { bg: '#1a0a2e', neon: '#cc44ff' },
        { bg: '#0a1a2e', neon: '#00ccff' },
        { bg: '#1a1a0a', neon: '#ffcc00' },
        { bg: '#2e0a1a', neon: '#ff2277' },
        { bg: '#0a2e1a', neon: '#00ff88' },
        { bg: '#1a0e0a', neon: '#ff6633' },
        { bg: '#0e0a2e', neon: '#8866ff' },
        { bg: '#2e2a0a', neon: '#ffee44' },
    ];

    // ── 1. Outer decorative ring tick-marks ──────────
    const tickCount = count * 6;
    const tickInner = R + 4;
    const tickOuter = R + 14;
    for (let i = 0; i < tickCount; i++) {
        const a = (i / tickCount) * 2 * Math.PI + angle;
        const isMajor = i % 6 === 0;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * tickInner, cy + Math.sin(a) * tickInner);
        ctx.lineTo(cx + Math.cos(a) * (isMajor ? tickOuter : tickOuter - 4), cy + Math.sin(a) * (isMajor ? tickOuter : tickOuter - 4));
        ctx.strokeStyle = isMajor ? 'rgba(255,0,204,0.8)' : 'rgba(255,0,204,0.3)';
        ctx.lineWidth = isMajor ? 1.5 : 0.8;
        ctx.stroke();
    }

    ROULETTE_SECTORS.forEach((sector, i) => {
        const col = DARK_COLORS[i % DARK_COLORS.length];
        const startAngle = angle + i * arc;
        const endAngle   = startAngle + arc;

        const grad = ctx.createRadialGradient(cx, cy, R * 0.18, cx, cy, R);
        grad.addColorStop(0,   col.bg);
        grad.addColorStop(0.6, col.bg);
        grad.addColorStop(1,   col.neon + '33');
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = col.neon + '55';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, R, startAngle + 0.04, endAngle - 0.04);
        ctx.strokeStyle = col.neon;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = col.neon;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(startAngle) * R * 0.2, cy + Math.sin(startAngle) * R * 0.2);
        ctx.lineTo(cx + Math.cos(startAngle) * R,       cy + Math.sin(startAngle) * R);
        ctx.strokeStyle = col.neon + '88';
        ctx.lineWidth = 1.2;
        ctx.shadowColor = col.neon;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        const midAngle  = startAngle + arc / 2;
        const textR     = R * 0.68;
        const x = cx + Math.cos(midAngle) * textR;
        const y = cy + Math.sin(midAngle) * textR;
        ctx.font = `${Math.round(R * 0.2)}px sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = '#fff';
        ctx.shadowColor  = col.neon;
        ctx.shadowBlur   = 12;
        ctx.fillText(sector.emoji, x, y);
        ctx.shadowBlur = 0;

        const labelR = R * 0.88;
        const lx = cx + Math.cos(midAngle) * labelR;
        const ly = cy + Math.sin(midAngle) * labelR;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(midAngle + Math.PI / 2);
        ctx.font = `bold ${Math.round(R * 0.07)}px 'Inter', monospace`;
        ctx.fillStyle = col.neon;
        ctx.shadowColor = col.neon;
        ctx.shadowBlur  = 6;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sector.label.toUpperCase(), 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
    });

    // ── 3. Outer ring border ─────────────────────────
    ctx.beginPath();
    ctx.arc(cx, cy, R + 2, 0, 2 * Math.PI);
    ctx.strokeStyle = '#0a0a18';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, R + 6, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ff00cc';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff00cc';
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(cx, cy, R + 12, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── 4. Inner hub ─────────────────────────────────
    const hubR = R * 0.16;

    const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubR);
    hubGrad.addColorStop(0,   '#3a1a4a');
    hubGrad.addColorStop(0.6, '#1a0a2e');
    hubGrad.addColorStop(1,   '#0d0018');
    ctx.beginPath();
    ctx.arc(cx, cy, hubR, 0, 2 * Math.PI);
    ctx.fillStyle = hubGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, hubR, 0, 2 * Math.PI);
    ctx.strokeStyle = '#bf5af2';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#bf5af2';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (let s = 0; s < 4; s++) {
        const sa = (s / 4) * Math.PI * 2 + angle * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(sa) * hubR * 0.4, cy + Math.sin(sa) * hubR * 0.4);
        ctx.lineTo(cx + Math.cos(sa) * hubR * 0.9, cy + Math.sin(sa) * hubR * 0.9);
        ctx.strokeStyle = 'rgba(191,90,242,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, hubR * 0.28, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#bf5af2';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
}

async function spinRoulette() {
    if (!currentUserData) {
        toast('❌ Сначала войдите в игру!', 'error');
        return;
    }
    if ((currentUserData.stats.gold || 0) < 50) {
        toast('❌ Недостаточно монет! Нужно 50 🪙', 'error');
        return;
    }
    if (isSpinning) return;
    isSpinning = true;
    document.getElementById('roulette-spin-btn').disabled = true;

    currentUserData.stats.gold -= 50;
    await saveUserData();

    const totalRotation = 4 * 2 * Math.PI + Math.random() * 2 * Math.PI;
    const startAngle = currentAngle;
    const targetAngle = startAngle + totalRotation;
    const duration = 4000;
    const startTime = performance.now();

    function animateSpin(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startAngle + totalRotation * eased;
        drawWheel(current);
        if (progress < 1) {
            requestAnimationFrame(animateSpin);
        } else {
            currentAngle = targetAngle;
            drawWheel(currentAngle);
            isSpinning = false;
            document.getElementById('roulette-spin-btn').disabled = false;
            const normalized = ((targetAngle % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
            const sectorIndex = Math.floor(normalized / (2*Math.PI / ROULETTE_SECTORS.length)) % ROULETTE_SECTORS.length;
            const sector = ROULETTE_SECTORS[sectorIndex];
            const item = getRandomItem();
            if (!Array.isArray(currentUserData.inventory)) {
                currentUserData.inventory = [];
            }
            currentUserData.inventory.push(item);
            if (item.stat && item.bonus) {
                currentUserData.stats[item.stat] = (currentUserData.stats[item.stat] || 0) + item.bonus;
            }
            saveUserData().then(() => {
                const rarityConfig = RARITIES[item.rarity] || RARITIES.common;
                renderRouletteResult(`✦ ${rarityConfig.label}: ${item.name}  +${item.bonus} ${STAT_LABELS[item.stat] || 'все статы'}`);
                updateUI();
                renderInventory();
                renderAchievements();
                const flash = document.getElementById('roulette-flash');
                if (flash) { flash.classList.add('active'); setTimeout(() => flash.classList.remove('active'), 700); }
                const resultEl = document.getElementById('roulette-result');
                if (resultEl) { resultEl.style.color = rarityConfig.color || '#00ffff'; setTimeout(() => { resultEl.style.color = ''; }, 4000); }
                toast(`🎡 Вы выиграли: ${rarityConfig.label}
${item.icon} ${item.name}
+${item.bonus} ${STAT_LABELS[item.stat] || 'всем статам'}`, 'success');
            });
        }
    }
    requestAnimationFrame(animateSpin);
}

function renderRouletteResult(text) {
    const resultEl = document.getElementById('roulette-result');
    if (resultEl) {
        resultEl.textContent = text || '';
    }
}

// ========================================
//  РУЛЕТКА ЗАДАНИЙ (RANDOM QUEST)
// ========================================

function getAvailableRandomQuests() {
    const socialLevel = currentUserData?.socialLevel || 1;
    return SOCIAL_QUESTS_DB.filter(q => q.minSocialLevel <= socialLevel);
}

function renderRandomQuestDisplay() {
    const container = document.getElementById('random-quest-display');
    if (!container) return;
    if (!currentUserData) {
        container.innerHTML = 'Нажмите «Крутить», чтобы получить случайное задание.';
        return;
    }
    const quest = currentUserData.randomQuest;
    if (!quest) {
        container.innerHTML = 'Нажмите «Крутить», чтобы получить случайное задание.';
        return;
    }
    if (quest.completed) {
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--accent-green);">
                <div>
                    <span style="font-weight: 600; color: var(--text-primary);">${quest.title}</span>
                    <span style="font-size: 12px; color: var(--text-secondary); margin-left: 8px;">(выполнено)</span>
                </div>
                <span style="color: var(--accent-green);">✅</span>
            </div>
        `;
        return;
    }
    const difficultyLabel = { easy: '🌱 Легко', medium: '⚡ Средне', hard: '🔥 Хардкор' }[quest.difficulty] || '';
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--accent-purple); flex-wrap: wrap; gap: 8px;">
            <div>
                <div style="font-weight: 600; color: var(--text-primary);">${quest.title}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${difficultyLabel} • +${quest.xpReward} XP соц. • +${quest.socialBonus} харизмы</div>
            </div>
            <button class="action-btn" style="background: var(--accent-green); width: auto; padding: 6px 16px; font-size: 13px;" onclick="completeRandomQuest()">✅ Выполнить</button>
        </div>
    `;
}

function startRandomQuest() {
    if (!currentUserData) {
        toast('❌ Войдите в игру!', 'error');
        return;
    }
    const today = new Date().toDateString();
    if (currentUserData.lastRandomDate === today) {
        toast('⏳ Вы уже крутили сегодня! Завтра будет новый шанс.', 'warning');
        return;
    }
    if (currentUserData.randomQuest && !currentUserData.randomQuest.completed) {
        toast('⚠️ У вас уже есть активный случайный квест! Выполните его или дождитесь завтра.', 'warning');
        return;
    }

    const available = getAvailableRandomQuests();
    if (available.length === 0) {
        toast('❌ Нет доступных заданий для вашего уровня.', 'error');
        return;
    }

    const modal = document.getElementById('roulette-modal');
    modal.classList.add('active');
    const spinText = document.getElementById('roulette-spin-text');
    const resultText = document.getElementById('roulette-result-text');
    const actionsDiv = document.getElementById('roulette-actions');
    const acceptBtn = document.getElementById('roulette-accept-btn');
    const skipBtn = document.getElementById('roulette-skip-btn');
    const closeBtn = document.getElementById('roulette-close-btn');

    spinText.textContent = '🎰';
    resultText.textContent = '';
    actionsDiv.style.display = 'none';
    acceptBtn.disabled = false;
    skipBtn.disabled = false;

    let count = 0;
    const emojis = ['🎲', '🎰', '🌀', '⚡', '🔥', '✨', '💫', '🌟'];
    const interval = setInterval(() => {
        spinText.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        count++;
        if (count > 15) {
            clearInterval(interval);
            const chosen = available[Math.floor(Math.random() * available.length)];
            const questCopy = { ...chosen, completed: false };
            spinText.textContent = chosen.emoji || '🎯';
            resultText.textContent = `«${chosen.title}» — ${chosen.desc}`;
            actionsDiv.style.display = 'flex';

            acceptBtn.onclick = function() {
                if (currentUserData.randomQuest && !currentUserData.randomQuest.completed) {
                    toast('⚠️ У вас уже есть активный квест!', 'warning');
                    return;
                }
                currentUserData.randomQuest = { ...questCopy };
                currentUserData.lastRandomDate = new Date().toDateString();
                saveUserData().then(() => {
                    modal.classList.remove('active');
                    renderRandomQuestDisplay();
                    updateUI();
                    toast(`✅ Квест «${questCopy.title}» принят! Выполняйте!`, 'success');
                });
                acceptBtn.disabled = true;
                skipBtn.disabled = true;
            };

            skipBtn.onclick = function() {
                if (currentUserData.lastRandomDate === new Date().toDateString()) {
                    modal.classList.remove('active');
                    toast('🔄 Вы пропустили задание. Приходите завтра!', 'info');
                } else {
                    modal.classList.remove('active');
                    toast('🔄 Вы пропустили это задание. Попробуйте снова!', 'info');
                }
                skipBtn.disabled = true;
                acceptBtn.disabled = true;
            };

            closeBtn.onclick = function() {
                modal.classList.remove('active');
            };
        }
    }, 130);
}

async function completeRandomQuest() {
    if (!currentUserData || !currentUserData.randomQuest || currentUserData.randomQuest.completed) {
        toast('❌ Нет активного случайного квеста.', 'error');
        return;
    }
    const quest = currentUserData.randomQuest;
    currentUserData.socialXP = (currentUserData.socialXP || 0) + quest.xpReward;
    currentUserData.stats.cha = (currentUserData.stats.cha || 0) + quest.socialBonus;
    quest.completed = true;
    let leveledUp = false;
    while (currentUserData.socialXP >= SOCIAL_XP_PER_LEVEL) {
        currentUserData.socialXP -= SOCIAL_XP_PER_LEVEL;
        currentUserData.socialLevel = (currentUserData.socialLevel || 1) + 1;
        leveledUp = true;
    }
    await saveUserData();
    updateUI();
    renderRandomQuestDisplay();
    renderAchievements();
    if (leveledUp) {
        toast(`🎉 Социальный уровень повышен! Теперь ты ${currentUserData.socialLevel} уровень!`, 'success');
    } else {
        toast(`✅ Случайный квест выполнен! +${quest.xpReward} XP, +${quest.socialBonus} к харизме.`, 'success');
    }
}

// ========================================
//  СБРОС ПРОГРЕССА
// ========================================

async function resetProgress() {
    if (!currentUserData) return;
    if (!confirm('Сбросить прогресс?')) return;
    
    currentUserData.stats = { str: 0, end: 0, agi: 0, int: 0, cha: 0, per: 0, luck: 0, gold: 0 };
    currentUserData.completed_quests = [];
    currentUserData.inventory = [];
    currentUserData.current_quests = [];
    currentUserData.last_quest_date = '';
    currentUserData.last_sleep_date = '';
    currentUserData.goals = [];
    currentUserData.socialLevel = 1;
    currentUserData.socialXP = 0;
    currentUserData.socialQuests = [];
    currentUserData.lastSocialDate = '';
    currentUserData.total_quests_completed = 0;
    currentUserData.total_social_quests_completed = 0;
    currentUserData.total_chests_opened = 0;
    currentUserData.total_goals_completed = 0;
    currentUserData.achievements = [];
    currentUserData.last_weekly_date = '';
    currentUserData.randomQuest = null;
    currentUserData.lastRandomDate = '';
    
    await saveUserData();
    await checkDailyRotation();
    await refreshSocialQuests();
    
    updateUI();
    renderInventory();
    renderQuests();
    renderGoals();
    renderHotbar();
    renderSocialQuests();
    renderAchievements();
    renderRouletteResult('');
    renderRandomQuestDisplay();
    
    toast('🗑️ Прогресс сброшен!', 'info');
}

// ========================================
//  ТАЙМЕРЫ
// ========================================

setInterval(() => {
    const n = new Date();
    let h = 23 - n.getHours(), m = 59 - n.getMinutes(), s = 59 - n.getSeconds();
    const dailyTimer = document.getElementById('daily-timer');
    if (dailyTimer) {
        dailyTimer.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    const daysLeft = 6 - (n.getDay() % 7);
    const weeklyTimer = document.getElementById('weekly-timer');
    if (weeklyTimer) {
        weeklyTimer.textContent = `${daysLeft}д ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    if (h === 0 && m === 0 && s === 0 && currentUserData) {
        checkDailyRotation();
    }
    updateSocialTimer();
}, 1000);

// ========================================
//  ЗАПУСК
// ========================================

document.getElementById('goal-rarity')?.addEventListener('change', updateRewardPreview);
document.getElementById('goal-stat')?.addEventListener('change', updateRewardPreview);
document.getElementById('random-quest-btn')?.addEventListener('click', startRandomQuest);

// ========================================
//  ОНБОРДИНГ
// ========================================
let currentOnboardingSlide = 0;

function showOnboarding() {
    if (currentUserData && currentUserData.stats && currentUserData.stats.has_seen_onboarding) return;
    currentOnboardingSlide = 0;
    updateOnboardingUI();
    document.getElementById('onboarding-modal').classList.add('active');
}

function nextOnboardingSlide() {
    const slides = document.querySelectorAll('.onboarding-slide');
    if (currentOnboardingSlide < slides.length - 1) {
        currentOnboardingSlide++;
        updateOnboardingUI();
    } else {
        document.getElementById('onboarding-modal').classList.remove('active');
        if (currentUserData && currentUserData.stats) {
            currentUserData.stats.has_seen_onboarding = true;
            saveUserData();
            toast('Удачной игры! ⚔️', 'success');
        }
    }
}

function updateOnboardingUI() {
    const slides = document.querySelectorAll('.onboarding-slide');
    const dots = document.querySelectorAll('#onboarding-dots .dot');
    const btn = document.getElementById('onboarding-next-btn');
    
    slides.forEach((s, i) => {
        if (i === currentOnboardingSlide) {
            s.style.display = 'block';
            s.style.animation = 'fadeUp 0.4s ease forwards';
        } else {
            s.style.display = 'none';
        }
    });
    
    dots.forEach((d, i) => {
        if (i === currentOnboardingSlide) {
            d.style.background = 'var(--accent)';
            d.style.width = '24px';
            d.style.borderRadius = '8px';
        } else {
            d.style.background = 'var(--border-heavy)';
            d.style.width = '8px';
            d.style.borderRadius = '50%';
        }
    });
    
    if (currentOnboardingSlide === slides.length - 1) {
        btn.textContent = 'Начать игру 🚀';
        btn.style.background = 'var(--accent-green)';
    } else {
        btn.textContent = 'Далее';
        btn.style.background = 'var(--accent)';
    }
}

console.log('✅ Игра запущена! Все системы работают.');
restoreSession();

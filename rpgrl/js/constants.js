//  ИГРОВЫЕ КОНСТАНТЫ И БАЗЫ ДАННЫХ

export const EXP = 250;
export const SOCIAL_XP_PER_LEVEL = 100;

// Пороги опыта для уровней
export const LEVEL_THRESHOLDS = [0, 50, 150, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500, 12000, 13600, 15300, 17100, 19000, 21000, 23100, 25300, 27600, 30000, 32500, 35100, 37800, 40600];

// Определяем, какие статы к какой ветке относятся
export const BRANCHES = {
    atletika: ['str', 'end', 'agi'],
    intellekt: ['int'],
    disciplina: ['per']
};

export const AVATARS = [
    { level: 1, emoji: '🥚', name: 'Яйцо' },
    { level: 2, emoji: '🐣', name: 'Цыпленок' },
    { level: 3, emoji: '🐥', name: 'Птенец' },
    { level: 4, emoji: '🐦', name: 'Птица' },
    { level: 5, emoji: '🦅', name: 'Орел' },
    { level: 7, emoji: '🐺', name: 'Волк' },
    { level: 9, emoji: '🦁', name: 'Лев' },
    { level: 12, emoji: '🐉', name: 'Дракон' },
    { level: 15, emoji: '🧙‍♂️', name: 'Маг' },
    { level: 18, emoji: '👑', name: 'Король' },
    { level: 21, emoji: '⚔️', name: 'Воин' },
    { level: 25, emoji: '🦸‍♂️', name: 'Герой' },
    { level: 30, emoji: '👾', name: 'Босс' }
];

export const RARITY_CONFIG = {
    legendary: { label: '⭐ Легендарная', color: '#ff6b00', xp: 50, statBonus: 15 },
    epic: { label: '🔮 Эпическая', color: '#bf5af2', xp: 30, statBonus: 10 },
    common: { label: '📦 Обычная', color: '#0a84ff', xp: 15, statBonus: 5 },
    easy: { label: '🌱 Легкая', color: '#30d158', xp: 5, statBonus: 2 }
};

export const STAT_LABELS = {
    str: '💪 Сила',
    end: '🏃‍♂️ Выносливость',
    agi: '🎯 Ловкость',
    int: '📚 Интеллект',
    cha: '🗣 Харизма',
    per: '👁 Дисциплина',
    luck: '🍀 Удача'
};

export const RARITIES = {
    common: { label: '📦 Обычное', color: '#8e8e93', weight: 40, emoji: '📦' },
    uncommon: { label: '🟢 Необычное', color: '#30d158', weight: 25, emoji: '🟢' },
    rare: { label: '🔵 Редкое', color: '#0a84ff', weight: 18, emoji: '🔵' },
    epic: { label: '🟣 Эпическое', color: '#bf5af2', weight: 10, emoji: '🟣' },
    legendary: { label: '🟠 Легендарное', color: '#ff9500', weight: 5, emoji: '🟠' },
    mythic: { label: '🔴 Мифическое', color: '#ff453a', weight: 2, emoji: '🔴' }
};

export const ITEMS_POOL = [
    { id: 'item_1', name: '🍀 Клевер', desc: 'Приносит удачу', stat: 'luck', bonus: 2, rarity: 'common', icon: '🍀' },
    { id: 'item_2', name: '💪 Гантеля', desc: 'Для силовых тренировок', stat: 'str', bonus: 3, rarity: 'common', icon: '💪' },
    { id: 'item_3', name: '📖 Книга', desc: 'Источник знаний', stat: 'int', bonus: 3, rarity: 'common', icon: '📖' },
    { id: 'item_4', name: '👟 Кроссовки', desc: 'Для бега', stat: 'end', bonus: 3, rarity: 'common', icon: '👟' },
    { id: 'item_5', name: '🎯 Мишень', desc: 'Тренирует меткость', stat: 'agi', bonus: 3, rarity: 'common', icon: '🎯' },
    { id: 'item_6', name: '🔮 Хрустальный шар', desc: 'Усиливает интуицию', stat: 'luck', bonus: 5, rarity: 'uncommon', icon: '🔮' },
    { id: 'item_7', name: '⚔️ Меч', desc: 'Символ силы', stat: 'str', bonus: 7, rarity: 'uncommon', icon: '⚔️' },
    { id: 'item_8', name: '🛡️ Щит', desc: 'Защищает от усталости', stat: 'end', bonus: 7, rarity: 'uncommon', icon: '🛡️' },
    { id: 'item_9', name: '🧠 Тренажёр', desc: 'Для мозга', stat: 'int', bonus: 7, rarity: 'uncommon', icon: '🧠' },
    { id: 'item_10', name: '🎤 Микрофон', desc: 'Укрепляет голос', stat: 'cha', bonus: 7, rarity: 'uncommon', icon: '🎤' },
    { id: 'item_11', name: '👑 Корона', desc: 'Власть и уважение', stat: 'cha', bonus: 12, rarity: 'rare', icon: '👑' },
    { id: 'item_12', name: '🐉 Драконий глаз', desc: 'Мистическая удача', stat: 'luck', bonus: 12, rarity: 'rare', icon: '🐉' },
    { id: 'item_13', name: '⚡ Молния', desc: 'Скорость реакции', stat: 'agi', bonus: 12, rarity: 'rare', icon: '⚡' },
    { id: 'item_14', name: '📚 Энциклопедия', desc: 'Глубокая мудрость', stat: 'int', bonus: 12, rarity: 'rare', icon: '📚' },
    { id: 'item_15', name: '⌚ Rolex', desc: 'Стиль и статус', stat: 'cha', bonus: 20, rarity: 'epic', icon: '⌚' },
    { id: 'item_16', name: '💻 Ноутбук', desc: 'Инструмент гения', stat: 'int', bonus: 20, rarity: 'epic', icon: '💻' },
    { id: 'item_17', name: '🏆 Трофей', desc: 'Победа во всём', stat: 'str', bonus: 20, rarity: 'epic', icon: '🏆' },
    { id: 'item_18', name: '🧘 Коврик', desc: 'Гармония и фокус', stat: 'per', bonus: 20, rarity: 'epic', icon: '🧘' },
    { id: 'item_19', name: '🌟 Звезда', desc: 'Сияние гения', stat: 'luck', bonus: 35, rarity: 'legendary', icon: '🌟' },
    { id: 'item_20', name: '👾 Артефакт', desc: 'Древняя магия', stat: 'luck', bonus: 35, rarity: 'legendary', icon: '👾' },
    { id: 'item_21', name: '🔥 Феникс', desc: 'Возрождение', stat: 'end', bonus: 35, rarity: 'legendary', icon: '🔥' },
    { id: 'item_22', name: '💎 Камень бесконечности', desc: 'Абсолютная сила', stat: 'str', bonus: 50, rarity: 'mythic', icon: '💎' },
    { id: 'item_23', name: '🌌 Космос', desc: 'Бесконечные знания', stat: 'int', bonus: 50, rarity: 'mythic', icon: '🌌' },
    { id: 'item_24', name: '🕊️ Ангельское крыло', desc: 'Божественная харизма', stat: 'cha', bonus: 50, rarity: 'mythic', icon: '🕊️' }
];

export const SOCIAL_QUESTS_DB = [
    { id: 's1', title: '👀 Контакт установлен', desc: 'Поймай взгляд случайного прохожего и не отводи его первым ровно 2 секунды.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's2', title: '🧍 Бафф осанки', desc: 'Пройди 10 минут по улице с максимально прямой спиной и расправленными плечами.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's3', title: '🗣️ Голос из таверны', desc: 'Скажи «Здравствуйте» кассиру или курьеру на 10% громче, чем обычно.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's4', title: '😊 Оружие к бою', desc: 'Искренне улыбнись одному незнакомому человеку за день.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's5', title: '🛡️ Открытый щит', desc: 'Проведи 15 минут в людном месте, сознательно не скрещивая руки и ноги.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's6', title: '⏳ Мастер времени', desc: 'Подойди к незнакомцу на улице и спроси, который час.', rank: 1, xpReward: 20, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's7', title: '🤝 Вежливый NPC', desc: 'Поблагодари обслуживающий персонал, обязательно посмотрев при этом в глаза.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's8', title: '📱 Анти-стелс', desc: 'Зайди в лифт с другими людьми и не доставай телефон.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's9', title: '👂 Эффект присутствия', desc: 'Во время разговора со знакомым кивни минимум 3 раза, показывая, что ты слушаешь.', rank: 1, xpReward: 15, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's10', title: '📖 Четкая дикция', desc: 'Прочитай вслух любой текст (1 страница), чётко проговаривая каждое слово.', rank: 1, xpReward: 20, socialBonus: 1, minSocialLevel: 1, difficulty: 'easy' },
    { id: 's11', title: '💎 Нежданный лут', desc: 'Сделай искренний комплимент внешности или одежде малознакомого человека.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's12', title: '✨ Магия имени', desc: 'Узнай имя нового собеседника и назови его по имени минимум 2 раза за диалог.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's13', title: '🔀 Разрыв шаблона', desc: 'На дежурное «Как дела?» ответь не «нормально», а интересной деталью.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's14', title: '🗺️ Следопыт', desc: 'Спроси дорогу у прохожего, даже если точно знаешь, куда идти.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's15', title: '📡 Эхолокация', desc: 'Повтори последние 3 слова собеседника с вопросительной интонацией, чтобы он продолжил рассказ.', rank: 2, xpReward: 30, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's16', title: '🤝 Общий знаменатель', desc: 'Найди одну общую деталь с человеком, с которым раньше почти не общался.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's17', title: '☕ Светская беседа', desc: 'Перекинься парой фраз о погоде или ситуации с соседом/коллегой.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's18', title: '🚮 Без мусора', desc: 'Поговори с кем-то 5 минут, сознательно избегая слов-паразитов.', rank: 2, xpReward: 30, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's19', title: '📢 Развернутый ответ', desc: 'Ни разу за день не ответь на вопросы односложно — добавляй минимум одно предложение.', rank: 2, xpReward: 25, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's20', title: '👋 Новый союзник', desc: 'Подойди к человеку на мероприятии и первым представься.', rank: 2, xpReward: 30, socialBonus: 2, minSocialLevel: 2, difficulty: 'medium' },
    { id: 's21', title: '🧘 Безмолвный монах', desc: 'Выслушай человека в течение 5 минут, ни разу его не перебив.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's22', title: '🔍 Глубокий зонд', desc: 'Задай открытый вопрос, требующий размышления.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's23', title: '📡 Тонкая настройка', desc: 'Заметь изменение настроения собеседника и аккуратно спроси об этом.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's24', title: '🏅 Высокоуровневый комплимент', desc: 'Похвали не внешность, а навык, характер или поступок человека.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's25', title: '🎁 Достойная награда', desc: 'В ответ на похвалу скажи только «Спасибо, мне очень приятно», не принижая своих заслуг.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's26', title: '📚 Архивариус', desc: 'Вспомни в разговоре мелкую деталь, которую человек упоминал несколько дней назад.', rank: 3, xpReward: 40, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's27', title: '🪞 Отзеркаливание', desc: 'В течение 3 минут незаметно копируй позу собеседника для повышения доверия.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's28', title: '⏸️ Тяжеловесная пауза', desc: 'Выдержи паузу в 2 секунды перед ответом на важный вопрос, глядя человеку в глаза.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's29', title: '🛡️ Снятие брони', desc: 'Расскажи собеседнику небольшую, но искреннюю историю о своей недавней мелкой неудаче.', rank: 3, xpReward: 40, socialBonus: 4, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's30', title: '👁️ Удержание фокуса', desc: 'Смотри в глаза собеседнику не только когда он говорит, но и когда говоришь ты сам.', rank: 3, xpReward: 35, socialBonus: 3, minSocialLevel: 3, difficulty: 'medium' },
    { id: 's31', title: '🔥 Байки у костра', desc: 'Заранее вспомни, отрепетируй и расскажи в компании забавную историю на 1-2 минуты.', rank: 4, xpReward: 45, socialBonus: 5, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's32', title: '⚔️ Изящное парирование', desc: 'Вежливо, но твердо не согласись с чужим мнением, начав с «Я понимаю твою мысль, но...»', rank: 4, xpReward: 45, socialBonus: 5, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's33', title: '🎮 Врыв в пати', desc: 'Успешно вклинись в уже идущий разговор группы людей, не нарушив его динамику.', rank: 4, xpReward: 50, socialBonus: 5, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's34', title: '🕊️ Уютная тишина', desc: 'Переживи неловкую паузу в разговоре, не пытаясь судорожно заполнить её болтовней.', rank: 4, xpReward: 45, socialBonus: 5, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's35', title: '🤲 Плавный жест', desc: 'Рассказывая что-то, осознанно используй открытые жесты руками (ладонями вверх).', rank: 4, xpReward: 45, socialBonus: 5, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's36', title: '☕ Инвайт', desc: 'Пригласи малознакомого, но интересного тебе человека выпить кофе или пообедать вместе.', rank: 4, xpReward: 50, socialBonus: 5, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's37', title: '🎬 Режиссёр', desc: 'Увидев, что кого-то в компании перебили, верни ему слово («Так что ты там говорил про...?»).', rank: 4, xpReward: 50, socialBonus: 6, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's38', title: '🎙️ Прокачка голоса', desc: 'Говори более низким и грудным голосом, чем обычно, в течение одного разговора.', rank: 4, xpReward: 50, socialBonus: 6, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's39', title: '😂 Шутка в тему', desc: 'Сделай уместное ироничное замечание, заставив улыбнуться хотя бы одного человека.', rank: 4, xpReward: 50, socialBonus: 6, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's40', title: '🎯 Центр притяжения', desc: 'Удержи на себе внимание группы из 3+ человек в течение хотя бы минуты.', rank: 4, xpReward: 55, socialBonus: 6, minSocialLevel: 4, difficulty: 'hard' },
    { id: 's41', title: '🔗 Связующее звено', desc: 'Познакомь двух людей, рассказав им по одному крутому факту друг о друге.', rank: 5, xpReward: 65, socialBonus: 7, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's42', title: '🛡️ Сбор рейда', desc: 'Выступи инициатором: собери группу из 3+ друзей/коллег и организуй совместный поход куда-либо.', rank: 5, xpReward: 70, socialBonus: 8, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's43', title: '🤝 Дипломат', desc: 'Успокой расстроенного или раздражённого человека, используя только эмпатию и слушание.', rank: 5, xpReward: 70, socialBonus: 8, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's44', title: '👔 Разговор с боссом', desc: 'Уверенно и на равных заведи смолл-ток с человеком, который выше тебя по статусу или должности.', rank: 5, xpReward: 75, socialBonus: 8, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's45', title: '📢 Глас глашатая', desc: 'Произнеси тост или возьми вступительное слово на встрече/празднике.', rank: 5, xpReward: 75, socialBonus: 9, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's46', title: '🔄 Перелом хода', desc: 'Мягко переведи негативное обсуждение (жалобы, сплетни) в позитивное или нейтральное русло.', rank: 5, xpReward: 75, socialBonus: 9, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's47', title: '💼 Торговец', desc: 'Попроси о небольшой скидке, бонусе или лучшем столике в заведении с дружелюбной улыбкой.', rank: 5, xpReward: 80, socialBonus: 9, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's48', title: '💪 Уверенная просьба', desc: 'Попроси человека об одолжении прямо, без извиняющегося тона («Мне нужна твоя помощь с...»).', rank: 5, xpReward: 80, socialBonus: 10, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's49', title: '🧠 Память на имена', desc: 'Попав в новую компанию, запомни и используй в разговоре имена минимум троих людей.', rank: 5, xpReward: 80, socialBonus: 10, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's50', title: '🎭 Эмоциональные качели', desc: 'Расскажи историю так, чтобы слушатели испытали сначала напряжение, а затем смех или облегчение.', rank: 5, xpReward: 85, socialBonus: 10, minSocialLevel: 5, difficulty: 'hard' },
    { id: 's51', title: '🏠 Хост (Хозяин таверны)', desc: 'Прими гостей у себя (или организуй вечеринку), лично следя за тем, чтобы всем было комфортно и никто не скучал.', rank: 6, xpReward: 100, socialBonus: 12, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's52', title: '🕊️ Миротворец', desc: 'Выступи медиатором в споре двух людей и помоги им прийти к компромиссу без ссоры.', rank: 6, xpReward: 105, socialBonus: 13, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's53', title: '💡 Презентация идеи', desc: 'Успешно «продай» свою идею группе людей (от выбора фильма до рабочего проекта).', rank: 6, xpReward: 105, socialBonus: 13, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's54', title: '⚡ Бафф вдохновения', desc: 'Скажи человеку такие слова поддержки, после которых он сразу пойдёт что-то делать или воспрянет духом.', rank: 6, xpReward: 100, socialBonus: 12, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's55', title: '😂 Массовый смех', desc: 'Рассмеши аудиторию от 5 и более человек одной историей или шуткой.', rank: 6, xpReward: 110, socialBonus: 14, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's56', title: '🛡️ Очарование стражи', desc: 'Выйди из проблемной ситуации (опоздание, мелкий штраф, ошибка) исключительно за счёт обаяния и умения договариваться.', rank: 6, xpReward: 115, socialBonus: 14, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's57', title: '🧙 Наставник', desc: 'Объясни сложную концепцию или научи навыку человека так, чтобы он почувствовал себя умным, а не глупым.', rank: 6, xpReward: 115, socialBonus: 15, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's58', title: '👑 Властелин зала', desc: 'Войди в помещение, где сидят люди, и своим языком тела и приветствием заставь всех обратить на тебя позитивное внимание.', rank: 6, xpReward: 120, socialBonus: 15, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's59', title: '🤝 Мгновенный траст', desc: 'Установи глубокий, доверительный раппорт с новым человеком менее чем за 10 минут.', rank: 6, xpReward: 130, socialBonus: 16, minSocialLevel: 6, difficulty: 'hard' },
    { id: 's60', title: '🏆 Ачивка «Легенда»', desc: 'Получи от кого-то искреннюю, невынужденную обратную связь в стиле: «С тобой так круто общаться» или «У тебя потрясающая энергетика».', rank: 6, xpReward: 150, socialBonus: 20, minSocialLevel: 6, difficulty: 'hard' }
];

export const TITLES_DATABASE = [
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

export const TUTORIAL_QUESTS = [
    { id: 'tut1', title: "✅ Настрой цели", desc: "Добавь свою первую долгосрочную цель в соответствующей вкладке.", stat: "int", points: 25, gold: 50, type: "purple" },
    { id: 'tut2', title: "🤸 Сделай замеры", desc: "Запиши свои антропометрические данные (вес, объемы) в блокнот или приложение.", stat: "per", points: 25, gold: 50, type: "blue" },
    { id: 'tut3', title: "💧 Выпей стакан воды", desc: "Начни день правильно - с гидратации организма.", stat: "end", points: 15, gold: 20, type: "" }
];

export const QUESTS_DATABASE = [
    // Атлетика
    { id: 'q1', title: "20 отжиманий на возвышении", desc: "Выполните 20 отжиманий с ногами на стуле.", stat: "str", points: 3, gold: 10, type: "purple", branch: 'atletika', minBranchLevel: 1 },
    { id: 'q2', title: "20 минут растяжки", desc: "Выполняйте базовые упражнения на растяжку.", stat: "agi", points: 2, gold: 10, type: "blue", branch: 'atletika', minBranchLevel: 1 },
    { id: 'q4', title: "60 минут уборки", desc: "Наведите идеальный порядок в своей комнате.", stat: "end", points: 3, gold: 15, type: "", branch: 'atletika', minBranchLevel: 2 },
    { id: 'q_hard_run', title: "Пробежка 5 км", desc: "Преодолей себя и пробеги дистанцию в 5 километров.", stat: "end", points: 20, gold: 40, type: "purple", branch: 'atletika', minBranchLevel: 5 },

    // Интеллект
    { id: 'q5', title: "25 минут учебы / кода", desc: "Поработайте над кодом 25 минут без пауз.", stat: "int", points: 3, gold: 20, type: "purple", branch: 'intellekt', minBranchLevel: 1 },
    { id: 'q_read_book', title: "Чтение (1 глава)", desc: "Прочитай одну главу профессиональной или художественной книги.", stat: "int", points: 10, gold: 15, type: "blue", branch: 'intellekt', minBranchLevel: 2 },
    { id: 'q_hard_lecture', title: "Изучить лекцию", desc: "Посмотри и законспектируй часовую лекцию по твоей специальности.", stat: "int", points: 25, gold: 50, type: "purple", branch: 'intellekt', minBranchLevel: 5 },

    // Дисциплина
    { id: 'q3', title: "15 минут наблюдения за природой", desc: "Понаблюдайте за птицами на улице 15 минут.", stat: "per", points: 2, gold: 10, type: "blue", branch: 'disciplina', minBranchLevel: 1 },
    { id: 'q_meditate', title: "5 минут медитации", desc: "Сядь в тишине и сфокусируйся на своем дыхании в течение 5 минут.", stat: "per", points: 8, gold: 15, type: "blue", branch: 'disciplina', minBranchLevel: 2 },
    { id: 'q_hard_plan', title: "Детальный план на неделю", desc: "Спланируй все ключевые задачи и встречи на следующую неделю.", stat: "per", points: 20, gold: 40, type: "purple", branch: 'disciplina', minBranchLevel: 4 }
];

export const ACHIEVEMENTS_DB = [
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

export const ROULETTE_SECTORS = [
    { emoji: '🎁', label: 'Подарок', color: '#ff6b6b' },
    { emoji: '💰', label: 'Монеты', color: '#feca57' },
    { emoji: '💎', label: 'Алмаз', color: '#48dbfb' },
    { emoji: '⭐', label: 'Звезда', color: '#ff9ff3' },
    { emoji: '🏆', label: 'Трофей', color: '#f368e0' },
    { emoji: '🎯', label: 'Мишень', color: '#ff9f43' },
    { emoji: '🎲', label: 'Кубик', color: '#00d2d3' },
    { emoji: '🌀', label: 'Циклон', color: '#54a0ff' }
];

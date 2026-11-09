-- ===================================================
-- aki - База данных Supabase
-- Запусти этот скрипт в Supabase -> SQL Editor -> Run
-- ===================================================

-- 1. Таблица одноразовых кодов авторизации
create table if not exists otp_codes (
  id uuid primary key default gen_random_uuid(),
  code varchar(4) not null,
  used boolean default false,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Таблица пользователей Telegram бота (для отправки кодов при логине)
create table if not exists telegram_users (
  id uuid primary key default gen_random_uuid(),
  chat_id bigint not null unique,
  username text,
  first_name text,
  last_interaction timestamptz default now(),
  created_at timestamptz default now()
);

-- Таблица долговременной памяти и обучения aki AI
create table if not exists ai_memory (
  id uuid primary key default gen_random_uuid(),
  category text default 'preference',
  content text not null,
  created_at timestamptz default now()
);

-- 2. Привычки
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text check (type in ('positive', 'negative')) not null,
  frequency text not null default 'daily',
  streak integer default 0,
  created_at timestamptz default now()
);

-- Логи привычек
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade,
  logged_date date not null,
  completed boolean default true,
  created_at timestamptz default now(),
  unique(habit_id, logged_date)
);

-- Принципы
create table if not exists principles (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  created_at timestamptz default now()
);

-- 3. Цели
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  horizon text check (horizon in ('1year', '5years', '10years')) not null,
  status text check (status in ('active', 'completed', 'paused')) default 'active',
  progress integer default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz default now()
);

-- 4. Финансы
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('income', 'expense', 'savings')) not null,
  amount numeric(12,2) not null,
  category text not null,
  description text,
  transaction_date date not null default current_date,
  created_at timestamptz default now()
);

-- 5. Книги
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  status text check (status in ('reading', 'completed', 'want')) default 'want',
  rating integer check (rating >= 1 and rating <= 5),
  notes text,
  finished_at date,
  created_at timestamptz default now()
);

-- 6. Планы и проекты
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text check (status in ('active', 'completed', 'paused')) default 'active',
  deadline date,
  created_at timestamptz default now()
);

-- Задачи для планов
create table if not exists plan_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  title text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- 7. Достижения
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text check (category in ('personal', 'professional', 'health', 'other')) not null,
  achieved_at date not null default current_date,
  created_at timestamptz default now()
);

-- 8. Блокнот
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  category text check (category in ('self', 'friends', 'family', 'work', 'ideas', 'other')) not null,
  title text not null,
  content text default '',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 9. Карточки людей (Досье на друзей, близких и окружение)
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text default '',
  relation text default 'friend', -- 'friend', 'family', 'colleague', 'mentor'
  age integer,
  city text default '',
  birthday text, -- 'YYYY-MM-DD' или 'MM-DD'
  occupation text default '', -- Чем занимается
  how_met text default '', -- Как познакомились, история дружбы
  tastes text default '', -- Вкусы, еда, музыка, хобби, аллергии
  important_people text default '', -- Близкие (девушка, родители, братья)
  goals_problems text default '', -- Его цели и проблемы
  gifts text default '', -- Что дарили, идеи подарков
  debts_promises text default '', -- Взаимные обещания и долги
  avatar_url text default '', -- Ссылка на аватарку
  last_contact_date date default current_date,
  notes text default '',
  created_at timestamptz default now()
);

-- Таблица лога общения с людьми (встречи, созвоны, важные разговоры)
create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people(id) on delete cascade,
  interaction_date date default current_date,
  type text default 'chat', -- 'meeting', 'call', 'chat'
  summary text not null,
  created_at timestamptz default now()
);

-- 10. Единая история диалогов aki AI (Web + Telegram)
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel text check (channel in ('web', 'tg')) not null default 'web',
  chat_id text,
  role text check (role in ('user', 'assistant')) not null,
  content text not null,
  created_at timestamptz default now()
);

-- 11. Лог автономных сообщений aki (для Cron, чтобы не спамить)
create table if not exists ai_proactive_log (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  message text not null,
  sent_at timestamptz default now()
);

-- 12. Таймлайн жизни и автобиография
create table if not exists life_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  title text not null,
  category text check (category in ('childhood', 'school', 'university', 'career', 'relationship', 'turning_point', 'victory', 'family')) default 'turning_point',
  description text default '',
  importance integer default 3 check (importance >= 1 and importance <= 5),
  people_names text default '',
  created_at timestamptz default now()
);

-- 13. Письма в будущее (доставляются в Telegram)
create table if not exists future_letters (
  id uuid primary key default gen_random_uuid(),
  delivery_date date not null,
  content text not null,
  theme text default 'письмо себе',
  delivered boolean default false,
  created_at timestamptz default now()
);

-- 14. Колесо баланса (оценки 1-10 раз в месяц)
create table if not exists balance_wheel (
  id uuid primary key default gen_random_uuid(),
  month text not null, -- 'YYYY-MM'
  career integer default 5,
  health integer default 5,
  friends integer default 5,
  family integer default 5,
  finances integer default 5,
  development integer default 5,
  rest integer default 5,
  discipline integer default 5,
  notes text default '',
  created_at timestamptz default now(),
  unique(month)
);

-- 15. Персональные настройки и режим общения aki
create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  chat_mode text default 'friend', -- 'friend', 'coach', 'mentor', 'devil', 'listener'
  feedback_notes text default '',
  created_at timestamptz default now()
);

-- 16. Обратная связь по ответам (👍 / 👎)
create table if not exists ai_feedback (
  id uuid primary key default gen_random_uuid(),
  channel text default 'tg',
  rating text not null check (rating in ('like', 'dislike')),
  message_content text default '',
  comment text default '',
  created_at timestamptz default now()
);

-- Отключаем Row Level Security для простоты
alter table otp_codes disable row level security;
alter table habits disable row level security;
alter table habit_logs disable row level security;
alter table principles disable row level security;
alter table goals disable row level security;
alter table transactions disable row level security;
alter table books disable row level security;
alter table plans disable row level security;
alter table plan_tasks disable row level security;
alter table achievements disable row level security;
alter table notes disable row level security;
alter table people disable row level security;
alter table interactions disable row level security;
alter table chat_messages disable row level security;
alter table ai_proactive_log disable row level security;
alter table life_events disable row level security;
alter table future_letters disable row level security;
alter table balance_wheel disable row level security;
alter table user_settings disable row level security;
alter table ai_feedback disable row level security;

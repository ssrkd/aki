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

-- Отключаем Row Level Security для простоты (проект персональный, защищён OTP на уровне Next.js middleware)
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

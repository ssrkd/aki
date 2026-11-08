// Все TypeScript типы проекта

// ==================== АУТЕНТИФИКАЦИЯ ====================

export interface OtpCode {
  id: string
  code: string
  used: boolean
  expires_at: string
  created_at: string
}

// ==================== ПРИВЫЧКИ ====================

export type HabitType = 'positive' | 'negative'
export type HabitFrequency = 'daily' | '3x_week' | '2x_week' | 'weekly'

export interface Habit {
  id: string
  name: string
  type: HabitType
  frequency: HabitFrequency
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  logged_date: string
  completed: boolean
  created_at: string
}

export interface HabitWithLogs extends Habit {
  logs: HabitLog[]
  completedToday: boolean
  streak: number
}

export interface Principle {
  id: string
  text: string
  created_at: string
}

// ==================== ЦЕЛИ ====================

export type GoalHorizon = '1year' | '5years' | '10years'
export type GoalStatus = 'active' | 'completed' | 'paused'

export interface Goal {
  id: string
  title: string
  description: string | null
  horizon: GoalHorizon
  status: GoalStatus
  progress: number
  created_at: string
}

// ==================== ФИНАНСЫ ====================

export type TransactionType = 'income' | 'expense' | 'savings'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  description: string | null
  transaction_date: string
  created_at: string
}

export interface FinanceSummary {
  income: number
  expense: number
  savings: number
  balance: number
}

export interface MonthlyData {
  month: string
  income: number
  expense: number
}

// ==================== КНИГИ ====================

export type BookStatus = 'reading' | 'completed' | 'want'

export interface Book {
  id: string
  title: string
  author: string
  status: BookStatus
  rating: number | null
  notes: string | null
  finished_at: string | null
  created_at: string
}

// ==================== ПЛАНЫ ====================

export type PlanStatus = 'active' | 'completed' | 'paused'

export interface Plan {
  id: string
  title: string
  description: string | null
  status: PlanStatus
  deadline: string | null
  created_at: string
  tasks?: PlanTask[]
}

export interface PlanTask {
  id: string
  plan_id: string
  title: string
  completed: boolean
  created_at: string
}

// ==================== ДОСТИЖЕНИЯ ====================

export type AchievementCategory = 'personal' | 'professional' | 'health' | 'other'

export interface Achievement {
  id: string
  title: string
  description: string | null
  category: AchievementCategory
  achieved_at: string
  created_at: string
}

// ==================== БЛОКНОТ ====================

export type NoteCategory = 'self' | 'friends' | 'family' | 'work' | 'ideas' | 'other'

export interface Note {
  id: string
  category: NoteCategory
  title: string
  content: string | null
  updated_at: string
  created_at: string
}

// ==================== UI ТИПЫ ====================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type BadgeVariant = 'blue' | 'green' | 'red' | 'yellow' | 'gray'


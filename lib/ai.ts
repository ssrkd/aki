import { createServiceClient } from '@/lib/supabase'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ActionLog {
  tool: string
  details: string
  success: boolean
}

// Загрузка памяти и правил из базы данных
export async function getAIMemories(): Promise<string[]> {
  const supabase = createServiceClient()
  const memories: string[] = []

  try {
    // 1. Проверяем таблицу ai_memory
    const { data: memData } = await supabase
      .from('ai_memory')
      .select('content')
      .order('created_at', { ascending: false })
      .limit(20)

    if (memData) {
      memData.forEach((m) => memories.push(m.content))
    }
  } catch {
    // игнорируем
  }

  try {
    // 2. Проверяем резервную память в principles (ai_mem:...)
    const { data: prinData } = await supabase
      .from('principles')
      .select('text')
      .like('text', 'ai_mem:%')
      .limit(20)

    if (prinData) {
      prinData.forEach((p) => {
        const text = p.text.replace('ai_mem:', '').trim()
        if (text && !memories.includes(text)) {
          memories.push(text)
        }
      })
    }
  } catch {
    // игнорируем
  }

  return memories
}

// Сохранение новой памяти / выученного правила
export async function saveAIMemory(content: string, category = 'preference'): Promise<boolean> {
  const supabase = createServiceClient()
  try {
    // Пробуем в ai_memory
    const { error } = await supabase.from('ai_memory').insert({ content, category })
    if (!error) return true
  } catch {
    // fallback
  }

  try {
    // Сохраняем в principles
    await supabase.from('principles').insert({ text: `ai_mem:${content}` })
    return true
  } catch (e) {
    console.error('Ошибка сохранения памяти ИИ:', e)
    return false
  }
}

// Загрузка текущего контекста пользователя для ответа
export async function getUserOverview(): Promise<string> {
  const supabase = createServiceClient()
  try {
    const [habitsRes, goalsRes, plansRes, financesRes, booksRes, notesRes] = await Promise.all([
      supabase.from('habits').select('id, name, type, frequency, streak').limit(15),
      supabase.from('goals').select('id, title, horizon, status, progress').limit(15),
      supabase.from('plans').select('id, title, status, deadline').limit(10),
      supabase.from('transactions').select('id, type, amount, category, description, transaction_date').order('transaction_date', { ascending: false }).limit(8),
      supabase.from('books').select('id, title, author, status, rating').limit(10),
      supabase.from('notes').select('id, title, category, updated_at').limit(10),
    ])

    return JSON.stringify({
      habits: habitsRes.data || [],
      goals: goalsRes.data || [],
      plans: plansRes.data || [],
      recent_finances: financesRes.data || [],
      books: booksRes.data || [],
      recent_notes: notesRes.data || [],
    })
  } catch (e) {
    return '{}'
  }
}

// Выполнение команд к базе данных
export async function executeDBTool(name: string, args: any): Promise<ActionLog> {
  const supabase = createServiceClient()

  try {
    switch (name) {
      case 'create_goal': {
        const { title, horizon = '1year', description = '' } = args
        const { error } = await supabase.from('goals').insert({
          title,
          horizon,
          description,
          status: 'active',
          progress: 0,
        })
        return {
          tool: 'create_goal',
          details: `Создана цель: "${title}" (${horizon})`,
          success: !error,
        }
      }

      case 'update_goal_progress': {
        const { goal_id, progress, status } = args
        const updateData: any = { progress }
        if (status) updateData.status = status
        if (progress >= 100) updateData.status = 'completed'

        const { error } = await supabase.from('goals').update(updateData).eq('id', goal_id)
        return {
          tool: 'update_goal_progress',
          details: `Обновлен прогресс цели: ${progress}%`,
          success: !error,
        }
      }

      case 'create_habit': {
        const { name: habitName, type = 'positive', frequency = 'daily' } = args
        const { error } = await supabase.from('habits').insert({
          name: habitName,
          type,
          frequency,
          streak: 0,
        })
        return {
          tool: 'create_habit',
          details: `Добавлена привычка: "${habitName}" (${type})`,
          success: !error,
        }
      }

      case 'toggle_habit_today': {
        const { habit_id, completed = true } = args
        const today = new Date().toISOString().split('T')[0]
        if (completed) {
          const { error } = await supabase.from('habit_logs').upsert({
            habit_id,
            logged_date: today,
            completed: true,
          })
          return {
            tool: 'toggle_habit_today',
            details: `Отмечено выполнение привычки за сегодня`,
            success: !error,
          }
        } else {
          const { error } = await supabase
            .from('habit_logs')
            .delete()
            .eq('habit_id', habit_id)
            .eq('logged_date', today)
          return {
            tool: 'toggle_habit_today',
            details: `Снята отметка выполнения за сегодня`,
            success: !error,
          }
        }
      }

      case 'add_transaction': {
        const { type, amount, category = 'Другое', description = '' } = args
        const { error } = await supabase.from('transactions').insert({
          type,
          amount: Number(amount),
          category,
          description,
          transaction_date: new Date().toISOString().split('T')[0],
        })
        return {
          tool: 'add_transaction',
          details: `Записано в финансы: ${type === 'income' ? '+' : '-'}${amount} (${category})`,
          success: !error,
        }
      }

      case 'create_plan': {
        const { title, deadline, tasks = [] } = args
        const { data: plan, error } = await supabase
          .from('plans')
          .insert({
            title,
            deadline: deadline || null,
            status: 'active',
          })
          .select('id')
          .single()

        if (!error && plan && tasks.length > 0) {
          const taskRows = tasks.map((t: string) => ({
            plan_id: plan.id,
            title: t,
            completed: false,
          }))
          await supabase.from('plan_tasks').insert(taskRows)
        }

        return {
          tool: 'create_plan',
          details: `Создан план: "${title}" с ${tasks.length} задачами`,
          success: !error,
        }
      }

      case 'add_note': {
        const { title, category = 'ideas', content = '' } = args
        const { error } = await supabase.from('notes').insert({
          title,
          category,
          content,
        })
        return {
          tool: 'add_note',
          details: `Сохранена заметка в блокнот: "${title}"`,
          success: !error,
        }
      }

      case 'add_book': {
        const { title, author = '', status = 'want' } = args
        const { error } = await supabase.from('books').insert({
          title,
          author,
          status,
        })
        return {
          tool: 'add_book',
          details: `Добавлена книга: "${title}" (${author})`,
          success: !error,
        }
      }

      case 'learn_memory': {
        const { content, category = 'preference' } = args
        const success = await saveAIMemory(content, category)
        return {
          tool: 'learn_memory',
          details: `Запомнил: "${content}"`,
          success,
        }
      }

      default:
        return { tool: name, details: 'Неизвестная команда', success: false }
    }
  } catch (err: any) {
    return { tool: name, details: err.message || 'Ошибка выполнения', success: false }
  }
}


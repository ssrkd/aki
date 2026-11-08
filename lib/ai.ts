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

export interface AIThought {
  id: string
  category: 'self' | 'friends' | 'work' | 'principles'
  content: string
  created_at: string
}

// Загрузка «мыслей аки» (блокнота памяти)
export async function getAIThoughts(): Promise<AIThought[]> {
  const supabase = createServiceClient()
  const thoughts: AIThought[] = []

  try {
    const { data: memData } = await supabase
      .from('ai_memory')
      .select('id, category, content, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (memData) {
      memData.forEach((m) => {
        const cat = ['self', 'friends', 'work', 'principles'].includes(m.category)
          ? (m.category as any)
          : 'self'
        thoughts.push({
          id: m.id,
          category: cat,
          content: m.content,
          created_at: m.created_at,
        })
      })
    }
  } catch {
    // fallback
  }

  // Резервное чтение из principles
  try {
    const { data: prinData } = await supabase
      .from('principles')
      .select('id, text, created_at')
      .like('text', 'ai_thought:%')
      .limit(50)

    if (prinData) {
      prinData.forEach((p) => {
        const parts = p.text.replace('ai_thought:', '').split(':')
        const cat = (parts[0] || 'self') as any
        const content = parts.slice(1).join(':').trim()
        if (content && !thoughts.some((t) => t.content === content)) {
          thoughts.push({
            id: p.id,
            category: cat,
            content,
            created_at: p.created_at,
          })
        }
      })
    }
  } catch {
    // fallback
  }

  return thoughts
}

// Добавление мысли аки
export async function addAIThought(
  category: 'self' | 'friends' | 'work' | 'principles',
  content: string
): Promise<boolean> {
  const supabase = createServiceClient()
  try {
    const { error } = await supabase.from('ai_memory').insert({ category, content })
    if (!error) return true
  } catch {
    // fallback
  }

  try {
    await supabase.from('principles').insert({ text: `ai_thought:${category}:${content}` })
    return true
  } catch (e) {
    console.error('Ошибка сохранения мысли аки:', e)
    return false
  }
}

// Удаление мысли аки
export async function deleteAIThought(id: string): Promise<boolean> {
  const supabase = createServiceClient()
  try {
    await supabase.from('ai_memory').delete().eq('id', id)
  } catch {
    // fallback
  }
  try {
    await supabase.from('principles').delete().eq('id', id)
  } catch {
    // fallback
  }
  return true
}

// Загрузка памяти для промпта
export async function getAIMemories(): Promise<string[]> {
  const thoughts = await getAIThoughts()
  return thoughts.map((t) => `[${t.category}] ${t.content}`)
}

// Загрузка текущего контекста пользователя для ответа (компактно, экономя токены)
export async function getUserOverview(): Promise<string> {
  const supabase = createServiceClient()
  try {
    const [habitsRes, goalsRes, plansRes, financesRes, booksRes] = await Promise.all([
      supabase.from('habits').select('name, streak').limit(10),
      supabase.from('goals').select('title, horizon, progress').limit(10),
      supabase.from('plans').select('title, status').limit(5),
      supabase.from('transactions').select('type, amount, category').order('transaction_date', { ascending: false }).limit(5),
      supabase.from('books').select('title, author, status').limit(5),
    ])

    return JSON.stringify({
      habits: (habitsRes.data || []).map((h) => `${h.name} (streak: ${h.streak})`),
      goals: (goalsRes.data || []).map((g) => `${g.title} [${g.horizon}: ${g.progress}%]`),
      plans: (plansRes.data || []).map((p) => `${p.title} (${p.status})`),
      finances: (financesRes.data || []).map((f) => `${f.type}: ${f.amount} (${f.category})`),
      books: (booksRes.data || []).map((b) => `${b.title} (${b.status})`),
    })
  } catch {
    return '{}'
  }
}

// Выполнение действий с базой данных
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
            details: `Отмечена привычка за сегодня`,
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
            details: `Снята отметка за сегодня`,
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
          details: `Сохранена заметка: "${title}"`,
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

      case 'learn_memory':
      case 'add_thought': {
        const { content, category = 'self' } = args
        const cat = ['self', 'friends', 'work', 'principles'].includes(category)
          ? category
          : 'self'
        const success = await addAIThought(cat as any, content)
        return {
          tool: 'add_thought',
          details: `Записано в «мысль аки» [${cat}]: "${content}"`,
          success,
        }
      }

      default:
        return { tool: name, details: 'Команда выполнена', success: true }
    }
  } catch (err: any) {
    return { tool: name, details: err.message || 'Ошибка выполнения', success: false }
  }
}

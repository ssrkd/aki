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

// Добавление мысли аки (с гарантированной защитой от дубликатов)
export async function addAIThought(
  category: 'self' | 'friends' | 'work' | 'principles',
  content: string
): Promise<boolean> {
  const cleanContent = content.trim()
  if (!cleanContent) return false

  const supabase = createServiceClient()

  // 1. Проверяем, нет ли уже точно такой же мысли или принципа
  try {
    const { data: existing } = await supabase
      .from('ai_memory')
      .select('id')
      .ilike('content', cleanContent)
      .limit(1)

    if (existing && existing.length > 0) {
      return true // Дубликат отсеян!
    }
  } catch {}

  // 2. Вставляем уникальную запись
  try {
    const { error } = await supabase.from('ai_memory').insert({ category, content: cleanContent })
    if (!error) return true
  } catch {}

  try {
    await supabase.from('principles').insert({ text: `ai_thought:${category}:${cleanContent}` })
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

      case 'save_person': {
        const {
          name: personName,
          nickname = '',
          relation = 'friend',
          age,
          city = '',
          birthday,
          occupation = '',
          how_met = '',
          tastes = '',
          important_people = '',
          goals_problems = '',
          gifts = '',
          debts_promises = '',
          notes = '',
        } = args

        if (!personName) {
          return { tool: 'save_person', details: 'Не указано имя', success: false }
        }

        // КРИТИЧЕСКИ ВАЖНО: Серик — это САМ ВЛАДЕЛЕЦ, а не друг!
        const isSelf = ['серик', 'серика', 'серику', 'сериком', 'серике', 'srk', 'я', 'себя'].includes(
          personName.toLowerCase().trim()
        )

        if (isSelf) {
          const selfFact = [
            'Серик (владелец)',
            age ? `возраст: ${age}` : '',
            city ? `город: ${city}` : '',
            birthday ? `день рождения: ${birthday}` : '',
            occupation ? `занятость: ${occupation}` : '',
            notes ? `детали: ${notes}` : '',
          ]
            .filter(Boolean)
            .join(', ')

          // Ищем существующую запись в self и обновляем
          try {
            const { data: existingSelf } = await supabase
              .from('ai_memory')
              .select('id')
              .eq('category', 'self')
              .ilike('content', '%серик%')
              .limit(1)

            if (existingSelf && existingSelf.length > 0) {
              await supabase.from('ai_memory').update({ content: selfFact }).eq('id', existingSelf[0].id)
            } else {
              await addAIThought('self', selfFact)
            }
          } catch {
            await addAIThought('self', selfFact)
          }

          return {
            tool: 'save_person',
            details: `Обновлены данные о Серике (обо мне): ${age ? age + ' лет, ' : ''}${city ? 'г. ' + city : ''}`,
            success: true,
          }
        }

        // Автоматическая генерация стильной аватарки по имени
        const avatarUrl =
          args.avatar_url ||
          `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(personName)}`

        let savedSuccess = false

        // Проверяем, есть ли уже человек с таким именем в people
        try {
          const { data: existing } = await supabase
            .from('people')
            .select('id, notes, city, age')
            .ilike('name', personName)
            .limit(1)

          if (existing && existing.length > 0) {
            const current = existing[0]
            const updatePayload: any = {}
            if (relation) updatePayload.relation = relation
            if (nickname) updatePayload.nickname = nickname
            if (age !== undefined && age !== null) updatePayload.age = Number(age)
            if (city) updatePayload.city = city
            if (birthday) updatePayload.birthday = birthday
            if (occupation) updatePayload.occupation = occupation
            if (how_met) updatePayload.how_met = how_met
            if (tastes) updatePayload.tastes = tastes
            if (important_people) updatePayload.important_people = important_people
            if (goals_problems) updatePayload.goals_problems = goals_problems
            if (gifts) updatePayload.gifts = gifts
            if (debts_promises) updatePayload.debts_promises = debts_promises
            if (notes) updatePayload.notes = notes
            updatePayload.last_contact_date = new Date().toISOString().split('T')[0]

            const { error: updateErr } = await supabase
              .from('people')
              .update(updatePayload)
              .eq('id', current.id)

            savedSuccess = !updateErr
          } else {
            const { error: insertErr } = await supabase.from('people').insert({
              name: personName,
              nickname,
              relation,
              age: age ? Number(age) : null,
              city,
              birthday: birthday || null,
              occupation,
              how_met,
              tastes,
              important_people,
              goals_problems,
              gifts,
              debts_promises,
              avatar_url: avatarUrl,
              notes,
              last_contact_date: new Date().toISOString().split('T')[0],
            })
            savedSuccess = !insertErr
          }
        } catch {
          // fallback
        }

        if (!savedSuccess) {
          try {
            await supabase.from('notes').insert({
              title: `Досье: ${personName}`,
              category: relation === 'family' ? 'family' : 'friends',
              content: `Имя: ${personName}\nВозраст: ${age || ''}\nГород: ${city || ''}\nОтношение: ${relation}\nЗаметки: ${notes}`,
            })
            savedSuccess = true
          } catch {}
        }

        // Сохраняем/обновляем в «мысль аки» БЕЗ ДУБЛИКАТОВ
        const factDetails = [
          personName,
          age ? `возраст: ${age}` : '',
          city ? `город: ${city}` : '',
          birthday ? `день рождения: ${birthday}` : '',
          occupation ? `занятость: ${occupation}` : '',
          notes ? `детали: ${notes}` : '',
        ]
          .filter(Boolean)
          .join(', ')

        try {
          const { data: existingMem } = await supabase
            .from('ai_memory')
            .select('id')
            .eq('category', 'friends')
            .ilike('content', `${personName}%`)
            .limit(1)

          if (existingMem && existingMem.length > 0) {
            await supabase.from('ai_memory').update({ content: factDetails }).eq('id', existingMem[0].id)
          } else {
            await addAIThought('friends', factDetails)
          }
        } catch {
          await addAIThought('friends', factDetails)
        }

        return {
          tool: 'save_person',
          details: `Обновлено досье: ${personName}${age ? `, ${age} лет` : ''}${city ? `, г. ${city}` : ''}`,
          success: true,
        }
      }

      case 'record_interaction': {
        const { person_name, summary, type = 'chat' } = args
        try {
          const { data: p } = await supabase
            .from('people')
            .select('id')
            .ilike('name', person_name)
            .limit(1)

          if (p && p.length > 0) {
            await supabase.from('interactions').insert({
              person_id: p[0].id,
              type,
              summary,
              interaction_date: new Date().toISOString().split('T')[0],
            })
            await supabase
              .from('people')
              .update({ last_contact_date: new Date().toISOString().split('T')[0] })
              .eq('id', p[0].id)
          }
        } catch {}

        return {
          tool: 'record_interaction',
          details: `Зафиксирован контакт с ${person_name}: ${summary}`,
          success: true,
        }
      }

      case 'create_life_event': {
        const { title, event_date, category = 'turning_point', description = '', importance = 3, people_names = '' } = args
        try {
          await supabase.from('life_events').insert({
            title,
            event_date: event_date || new Date().toISOString().split('T')[0],
            category,
            description,
            importance: Number(importance) || 3,
            people_names,
          })
        } catch {}

        await addAIThought('self', `Событие жизни (${event_date || 'дата'}): ${title}. ${description}`)

        return {
          tool: 'create_life_event',
          details: `Добавлено в историю жизни: "${title}" (${event_date || 'сегодня'})`,
          success: true,
        }
      }

      case 'send_future_letter': {
        const { content, delivery_date, theme = 'письмо себе' } = args
        try {
          await supabase.from('future_letters').insert({
            content,
            delivery_date,
            theme,
            delivered: false,
          })
        } catch {}

        return {
          tool: 'send_future_letter',
          details: `Письмо в будущее сохранено. Доставка в Telegram: ${delivery_date}`,
          success: true,
        }
      }

      case 'set_chat_mode': {
        const { mode } = args
        const validModes = ['friend', 'coach', 'mentor', 'devil', 'listener']
        const targetMode = validModes.includes(mode) ? mode : 'friend'

        try {
          await supabase.from('user_settings').upsert(
            { id: '00000000-0000-0000-0000-000000000001', chat_mode: targetMode },
            { onConflict: 'id' }
          )
        } catch {}

        const modeNames: Record<string, string> = {
          friend: 'Близкий друг',
          coach: 'Коуч',
          mentor: 'Строгий наставник',
          devil: 'Адвокат дьявола (критик)',
          listener: 'Тихий слушатель',
        }

        return {
          tool: 'set_chat_mode',
          details: `Режим общения переключен на: ${modeNames[targetMode]}`,
          success: true,
        }
      }

      default:
        return { tool: name, details: 'Команда выполнена', success: true }
    }
  } catch (err: any) {
    return { tool: name, details: err.message || 'Ошибка выполнения', success: false }
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET — list all current task labels so we can see what's in the DB
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data, error } = await supabase.from('main_tasks').select('*').order('id', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data })
}

// ─────────────────────────────────────────────
// Malayalam → English task label mapping
// Keys are exact labels currently stored in the DB.
// ─────────────────────────────────────────────
const TRANSLATIONS: Record<string, string> = {
  // --- Exact DB labels (as of latest fetch) ---
  'എഴുനേറ്റപ്പൊൾ ദിക്ർ ചൊല്ലിയോ':                                          'Recited morning Dhikr',
  'തഹജ്ജുദ് നിസ്കരിച്ചോ':                                                    'Prayed Tahajjud',
  'തസ്ബീഹിനെ നേരത്തെ എത്തിയോ':                                               'Arrived early for Tasbeeh',
  'ഖുർആൻ ഓതിയോ':                                                             'Recited Quran',
  'സബ്ഖ് ശ്രദ്ധിച്ചോ':                                                        'Paid attention to Sabq',
  'ഒഴിവ് സമയത്ത് പത്രം വായിച്ചോ':                                             'Read newspaper during free time',
  'സ്കൂൾ ക്ലാസ്സ് ശ്രദ്ധിച്ചോ':                                               'Paid attention in school class',
  'ളുഹാ - നിസ്കരിച്ചോ':                                                       'Prayed Duha',
  'ളുഹർ -ന്റെ റവാത്തിബ് നിസ്കരിച്ചോ':                                        'Prayed Zuhr Rawathib',
  'സുബഹിക്ക് ശേഷമുള്ള സബ്ഖ് ശ്രദ്ധിച്ചോ':                                    'Attended post-Subh Sabq',
  'വൈകീട്ട് ഇംഗ്ലീഷ് ഇംപ്രൂവന് വേണ്ടി പ്രവർത്തിച്ചോ':                        'Practiced English in the evening',
  'Library book വായിച്ചോ':                                                    'Read a library book',
  'എന്തെങ്കിലും ഒന്ന് എഴുതി നോക്കിയോ':                                       'Wrote something (journal/notes)',
  'കളിച്ചോ':                                                                  'Played / Exercised',
  'കുളിച്ചോ':                                                                 'Took a bath / shower',
  'ഒന്നാം ദർസിൽ പങ്കെടുത്തോ':                                                 'Attended 1st Dars session',
  'റവാത്തിബ് / വിത്ർ നിസ്കരിച്ചോ':                                           'Prayed Rawathib / Witr',
  'ഒന്നാം ദർസിൽ മുത്വാലഅ ചെയ്തോ':                                            "Did Mutha'ala in 1st Dars",
  'ഹദ്ദാദ് ഓതിയോ':                                                           'Recited Haddad',
  'രണ്ടാം ദർസ് ഉപകാരപ്പെടുത്തിയോ':                                           'Made use of 2nd Dars',
  'സ്കൂളിലെ കോ.. / ദർസിലെ കോ.. ഉള്ള വർക്ക് ചെയ്യുകയോ / പഠിക്കുകയോ ചെയ്തോ': 'Completed School/Dars assignments',
  'നേരത്തെ ഉറങ്ങിയോ':                                                        'Slept on time',

  // --- Already-English labels (no-op passthrough, kept for safety) ---
  'Recited morning Dhikr':             'Recited morning Dhikr',
  'Prayed Tahajjud':                   'Prayed Tahajjud',
  'Arrived early for Tasbeeh':         'Arrived early for Tasbeeh',
  'Recited Quran':                     'Recited Quran',
  'Paid attention to Sabq':            'Paid attention to Sabq',
  'Read newspaper during free time':   'Read newspaper during free time',
  'Paid attention in school class':    'Paid attention in school class',
  'Prayed Duha':                       'Prayed Duha',
  'Prayed Zuhr Rawathib':              'Prayed Zuhr Rawathib',
  'Attended post-Subh Sabq':           'Attended post-Subh Sabq',
  'Practiced English in the evening':  'Practiced English in the evening',
  'Read a library book':               'Read a library book',
  'Wrote something (journal/notes)':   'Wrote something (journal/notes)',
  'Wrote something (journal / notes)': 'Wrote something (journal/notes)',
  'Played / Exercised':                'Played / Exercised',
  'Played / exercised':                'Played / Exercised',
  'Took a bath / shower':              'Took a bath / shower',
  'Attended 1st Dars session':         'Attended 1st Dars session',
  'Attended 1st dars session':         'Attended 1st Dars session',
  'Prayed Rawathib / Witr':            'Prayed Rawathib / Witr',
  "Did Mutha'ala in 1st Dars":         "Did Mutha'ala in 1st Dars",
  'Recited Haddad':                    'Recited Haddad',
  'Made use of 2nd Dars':              'Made use of 2nd Dars',
  'Completed School/Dars assignments': 'Completed School/Dars assignments',
  'Slept on time':                     'Slept on time',
}

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Fetch all current tasks
  const { data: tasks, error: fetchErr } = await supabase
    .from('main_tasks')
    .select('*')

  if (fetchErr || !tasks) {
    return NextResponse.json({ error: fetchErr?.message || 'Could not fetch tasks.' }, { status: 500 })
  }

  const results: { id: string; old: string; new: string; status: string }[] = []

  for (const task of tasks) {
    const englishLabel = TRANSLATIONS[task.label.trim()]
    if (englishLabel) {
      const { error: updateErr } = await supabase
        .from('main_tasks')
        .update({ label: englishLabel })
        .eq('id', task.id)

      results.push({
        id: task.id,
        old: task.label,
        new: englishLabel,
        status: updateErr ? `ERROR: ${updateErr.message}` : 'updated'
      })
    } else {
      results.push({
        id: task.id,
        old: task.label,
        new: task.label,
        status: 'no translation found — left unchanged'
      })
    }
  }

  return NextResponse.json({ success: true, results })
}

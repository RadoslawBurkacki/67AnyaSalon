import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TIME_SLOTS } from '@/lib/types'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: 'date is required and must be YYYY-MM-DD' }, { status: 400 })
  }

  try {
    const [bookingsRes, blockedRes, settingsRes] = await Promise.all([
      supabase.from('bookings').select('time_slot').eq('date', date).neq('status', 'cancelled'),
      supabase.from('blocked_slots').select('time_slot, all_day').eq('date', date),
      supabase.from('settings').select('key, value').in('key', ['schedule_days', 'schedule_slots']),
    ])

    // Parse schedule settings (defaults: Mon–Sat, all slots)
    const s = Object.fromEntries((settingsRes.data ?? []).map(r => [r.key, r.value as string]))
    const workingDays: number[] = s.schedule_days ? s.schedule_days.split(',').map(Number) : [1,2,3,4,5,6]
    const workingSlots: string[] = s.schedule_slots ? s.schedule_slots.split(',') : TIME_SLOTS

    // If the requested date falls on a non-working day, block everything
    const dayOfWeek = new Date(date + 'T00:00:00').getDay()
    if (!workingDays.includes(dayOfWeek)) {
      return NextResponse.json({ bookedSlots: TIME_SLOTS })
    }

    const bookedSlots = bookingsRes.data?.map(b => b.time_slot) ?? []
    const blockedSlots = blockedRes.data ?? []
    const allDayBlock = blockedSlots.some(b => b.all_day)

    // Slots outside the working schedule are also unavailable
    const offSchedule = TIME_SLOTS.filter(slot => !workingSlots.includes(slot))

    const unavailable = allDayBlock
      ? TIME_SLOTS
      : Array.from(new Set([
          ...offSchedule,
          ...bookedSlots,
          ...blockedSlots.filter(b => b.time_slot).map(b => b.time_slot),
        ]))

    return NextResponse.json({ bookedSlots: unavailable })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}

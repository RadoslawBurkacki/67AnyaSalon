import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { TIME_SLOTS } from '@/lib/types'
import { sendBookingReceived, sendAdminNewBooking } from '@/lib/email'

export const dynamic = 'force-dynamic'

const VALID_SLOTS = new Set(TIME_SLOTS)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const bookingSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(200),
  phone: z.string().min(7).max(30),
  service_id: z.string().min(1),
  date: z.string().regex(DATE_RE),
  time_slot: z.string().refine(t => VALID_SLOTS.has(t), { message: 'Invalid time slot' }),
  notes: z.string().max(1000).optional(),
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = bookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    const { name, email, phone, service_id, date, time_slot, notes } = parsed.data

    if (date < new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: 'Cannot book in the past' }, { status: 400 })
    }

    // Validate service against DB (fixes missing eyelash/eyebrow support)
    const { data: service } = await supabase
      .from('services')
      .select('id, category, name, duration')
      .eq('id', service_id)
      .maybeSingle()

    if (!service) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('date', date)
      .eq('time_slot', time_slot)
      .neq('status', 'cancelled')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'This time slot is no longer available. Please choose another.' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        name,
        email,
        phone,
        service_category: service.category,
        service_name: service.name,
        duration_minutes: service.duration,
        date,
        time_slot,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Send emails — await so errors appear in Vercel logs
    try {
      await Promise.all([sendBookingReceived(data), sendAdminNewBooking(data)])
    } catch (emailErr) {
      console.error('Email send failed:', emailErr)
    }

    return NextResponse.json({ booking: data }, { status: 201 })
  } catch (e) {
    console.error('Booking error:', e)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}

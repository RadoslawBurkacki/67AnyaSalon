export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Booking {
  id: string
  name: string
  email: string
  phone: string
  service_category: 'nail' | 'massage' | 'eyelash' | 'eyebrow'
  service_name: string
  date: string
  time_slot: string
  duration_minutes: number
  status: BookingStatus
  notes: string | null
  created_at: string
}

export interface BlockedSlot {
  id: string
  date: string
  time_slot: string | null
  all_day: boolean
  reason: string | null
}

export interface Service {
  id: string
  category: 'nail' | 'massage' | 'eyelash' | 'eyebrow'
  name: string
  description: string
  duration: number
  price: number
  popular?: boolean
}


export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
]

export function formatTime(slot: string): string {
  const [h, m] = slot.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

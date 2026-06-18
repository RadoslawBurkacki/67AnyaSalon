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

export const NAIL_SERVICES: Service[] = [
  { id: 'n1', category: 'nail', name: 'Classic Manicure', description: 'Shape, buff, cuticle care & polish', duration: 45, price: 30 },
  { id: 'n2', category: 'nail', name: 'Gel Manicure', description: 'Long-lasting gel polish with UV finish', duration: 60, price: 45, popular: true },
  { id: 'n3', category: 'nail', name: 'Acrylic Full Set', description: 'Full acrylic extension set with shape & design', duration: 90, price: 65, popular: true },
  { id: 'n4', category: 'nail', name: 'Acrylic Infill', description: 'Infill for existing acrylic nails', duration: 60, price: 45 },
  { id: 'n5', category: 'nail', name: 'Nail Art', description: 'Custom nail art designs per nail', duration: 30, price: 20 },
  { id: 'n6', category: 'nail', name: 'Classic Pedicure', description: 'Soak, exfoliate, shape & polish', duration: 60, price: 40 },
  { id: 'n7', category: 'nail', name: 'Gel Pedicure', description: 'Pedicure with long-lasting gel polish', duration: 75, price: 55, popular: true },
  { id: 'n8', category: 'nail', name: 'Luxury Mani + Pedi', description: 'Complete hands & feet treatment with scrub & mask', duration: 120, price: 85 },
]

export const MASSAGE_SERVICES: Service[] = [
  { id: 'm1', category: 'massage', name: 'Swedish Relaxation', description: 'Gentle full-body massage to relieve tension & stress', duration: 60, price: 70, popular: true },
  { id: 'm2', category: 'massage', name: 'Swedish — Extended', description: 'Extended full-body Swedish massage', duration: 90, price: 95 },
  { id: 'm3', category: 'massage', name: 'Deep Tissue', description: 'Targeted deep muscle work for chronic tension', duration: 60, price: 80, popular: true },
  { id: 'm4', category: 'massage', name: 'Deep Tissue — Extended', description: 'Longer deep tissue session', duration: 90, price: 110 },
  { id: 'm5', category: 'massage', name: 'Hot Stone Massage', description: 'Warm volcanic stones melt away muscle tension', duration: 90, price: 100, popular: true },
  { id: 'm6', category: 'massage', name: 'Aromatherapy Massage', description: 'Relaxing massage with premium essential oils', duration: 60, price: 75 },
  { id: 'm7', category: 'massage', name: 'Couples Massage', description: 'Side-by-side relaxation for two', duration: 60, price: 130 },
  { id: 'm8', category: 'massage', name: 'Pamper Package', description: 'Gel manicure + 60 min Swedish massage', duration: 120, price: 110 },
]

export const EYELASH_SERVICES: Service[] = [
  { id: 'el1', category: 'eyelash', name: 'Classic Lash Extensions', description: 'Natural, single-strand extensions for a subtle enhancement', duration: 90, price: 55 },
  { id: 'el2', category: 'eyelash', name: 'Hybrid Lash Extensions', description: 'Mix of classic & volume for a soft, textured look', duration: 105, price: 70, popular: true },
  { id: 'el3', category: 'eyelash', name: 'Volume Lash Extensions', description: 'Fluffy, full-volume fans for a dramatic effect', duration: 120, price: 85, popular: true },
  { id: 'el4', category: 'eyelash', name: 'Mega Volume Lashes', description: 'Ultra-lush, maximum density lash set', duration: 150, price: 100 },
  { id: 'el5', category: 'eyelash', name: 'Classic Lash Infill', description: 'Infill for existing classic lash extensions', duration: 45, price: 35 },
  { id: 'el6', category: 'eyelash', name: 'Hybrid / Volume Infill', description: 'Infill for hybrid or volume lash extensions', duration: 60, price: 45 },
  { id: 'el7', category: 'eyelash', name: 'Lash Lift & Tint', description: 'Curl, lift and tint your natural lashes for weeks', duration: 60, price: 50, popular: true },
  { id: 'el8', category: 'eyelash', name: 'Lash Removal', description: 'Safe removal of existing lash extensions', duration: 30, price: 15 },
]

export const EYEBROW_SERVICES: Service[] = [
  { id: 'eb1', category: 'eyebrow', name: 'Brow Wax & Shape', description: 'Clean, defined brow shape using warm wax', duration: 20, price: 15 },
  { id: 'eb2', category: 'eyebrow', name: 'Brow Wax & Tint', description: 'Wax shape plus tint for colour and definition', duration: 30, price: 22, popular: true },
  { id: 'eb3', category: 'eyebrow', name: 'Brow Threading', description: 'Precise hair removal using the threading technique', duration: 20, price: 15 },
  { id: 'eb4', category: 'eyebrow', name: 'Brow Tint', description: 'Colour treatment to enhance and define brow hair', duration: 15, price: 12 },
  { id: 'eb5', category: 'eyebrow', name: 'Brow Lamination', description: 'Restructure brow hairs for a full, brushed-up finish', duration: 60, price: 45, popular: true },
  { id: 'eb6', category: 'eyebrow', name: 'Brow Lamination & Tint', description: 'Lamination with tint for bold, glossy brows', duration: 75, price: 55, popular: true },
  { id: 'eb7', category: 'eyebrow', name: 'HD Brows', description: 'Signature brow design with tint, wax and threading', duration: 60, price: 50 },
  { id: 'eb8', category: 'eyebrow', name: 'Henna Brows', description: 'Natural henna tint that stains skin and hair for lasting colour', duration: 45, price: 35 },
]

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

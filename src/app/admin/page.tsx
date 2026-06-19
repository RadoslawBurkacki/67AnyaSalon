'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { type Booking, TIME_SLOTS, formatTime } from '@/lib/types'
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, LogOut, RefreshCw, Calendar, List, Settings, CalendarClock, Scissors, Plus, Trash2 } from 'lucide-react'
import type { Service } from '@/lib/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type View = 'calendar' | 'list' | 'settings' | 'schedule' | 'services'
type ServiceCategory = 'nail' | 'massage' | 'eyelash' | 'eyebrow'

const STATUS_STYLES = {
  pending: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  confirmed: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  cancelled: 'text-cream/30 border-cream/10 bg-cream/5',
}

export default function AdminPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('calendar')
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [adminNotifications, setAdminNotifications] = useState<boolean | null>(null)
  const [savingNotification, setSavingNotification] = useState(false)
  const [emailConfig, setEmailConfig] = useState({ admin_email: '', from_email: '' })
  const [savingEmailConfig, setSavingEmailConfig] = useState(false)
  const [emailConfigSaved, setEmailConfigSaved] = useState(false)
  const [siteInfo, setSiteInfo] = useState({
    site_address: '', site_phone: '', site_email: '',
    site_map_url: '', hours_mon_fri: '', hours_sat: '', hours_sun: '',
    social_instagram: '', social_facebook: '',
  })
  const [savingSiteInfo, setSavingSiteInfo] = useState(false)
  const [siteInfoSaved, setSiteInfoSaved] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'general' | 'emails'>('general')
  const [workingDays, setWorkingDays] = useState<number[]>([1,2,3,4,5,6])
  const [workingSlots, setWorkingSlots] = useState<string[]>([...TIME_SLOTS])
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleSaved, setScheduleSaved] = useState(false)
  const [newBookingAlert, setNewBookingAlert] = useState(false)
  const [adminServices, setAdminServices] = useState<Service[]>([])
  const [adminServicesCategory, setAdminServicesCategory] = useState<ServiceCategory>('nail')
  const [loadingAdminServices, setLoadingAdminServices] = useState(false)
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', duration: '60', price: '', popular: false })
  const [addingService, setAddingService] = useState(false)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('bookings').select('*').order('date').order('time_slot')
    setBookings((data as Booking[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  // Realtime subscription — new bookings appear instantly, status changes sync across sessions
  useEffect(() => {
    const channel = supabase
      .channel('admin-bookings-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, payload => {
        setBookings(prev =>
          [...prev, payload.new as Booking].sort((a, b) =>
            a.date !== b.date ? a.date.localeCompare(b.date) : a.time_slot.localeCompare(b.time_slot)
          )
        )
        setNewBookingAlert(true)
        setTimeout(() => setNewBookingAlert(false), 4000)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, payload => {
        setBookings(prev => prev.map(b => b.id === (payload.new as Booking).id ? payload.new as Booking : b))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(({ settings: s }) => {
        setAdminNotifications(s?.admin_booking_notifications !== 'false')
        setEmailConfig({ admin_email: s?.admin_email ?? '', from_email: s?.from_email ?? '' })
        setWorkingDays(s?.schedule_days ? s.schedule_days.split(',').map(Number) : [1,2,3,4,5,6])
        setWorkingSlots(s?.schedule_slots ? s.schedule_slots.split(',') : [...TIME_SLOTS])
        setSiteInfo({
          site_address: s?.site_address ?? '',
          site_phone: s?.site_phone ?? '',
          site_email: s?.site_email ?? '',
          site_map_url: s?.site_map_url ?? '',
          hours_mon_fri: s?.hours_mon_fri ?? '',
          hours_sat: s?.hours_sat ?? '',
          hours_sun: s?.hours_sun ?? '',
          social_instagram: s?.social_instagram ?? '',
          social_facebook: s?.social_facebook ?? '',
        })
      })
      .catch(() => setAdminNotifications(true))
  }, [])

  useEffect(() => {
    if (view !== 'services') return
    setLoadingAdminServices(true)
    fetch(`/api/services?category=${adminServicesCategory}`)
      .then(r => r.json())
      .then(({ services }) => setAdminServices(services ?? []))
      .catch(() => setAdminServices([]))
      .finally(() => setLoadingAdminServices(false))
  }, [view, adminServicesCategory])

  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    }
  }

  const toggleAdminNotifications = async (enabled: boolean) => {
    setSavingNotification(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify({ key: 'admin_booking_notifications', value: String(enabled) }),
    })
    setAdminNotifications(enabled)
    setSavingNotification(false)
  }

  const saveSettings = async (
    data: Record<string, string>,
    setSaving: (v: boolean) => void,
    setSaved: (v: boolean) => void,
  ) => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify({ settings: data }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status as Booking['status'] } : b))
    if (status === 'confirmed') {
      fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id }),
      }).catch(err => console.error('Confirmation email failed:', err))
    }
    setUpdatingId(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    document.cookie = 'admin-auth=; path=/; max-age=0; SameSite=Strict'
    router.push('/admin/login')
  }

  const monthDays = eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) })
  const dayBookings = (day: Date) => bookings.filter(b => isSameDay(parseISO(b.date), day))
  const selectedDayBookings = selectedDay ? dayBookings(selectedDay).sort((a, b) => a.time_slot.localeCompare(b.time_slot)) : []

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    today: bookings.filter(b => b.date === format(new Date(), 'yyyy-MM-dd')).length,
  }

  return (
    <div className="min-h-screen bg-background text-cream">
      {/* New booking toast */}
      <AnimatePresence>
        {newBookingAlert && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gold text-background text-sm font-medium px-5 py-2.5 shadow-lg"
          >
            New booking received
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="border-b border-border">
        <div className="section-container flex items-center justify-between h-16">
          <Link href="/" className="font-serif text-lg">
            <span className="gold-text">Anya</span>
            <span className="text-cream/40 text-xs tracking-widest ml-1 font-sans">Admin</span>
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={fetchBookings} disabled={loading} className="text-cream/40 hover:text-gold transition-colors" title="Refresh">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 text-cream/40 hover:text-gold text-sm transition-colors">
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="section-container py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Bookings', value: stats.total, color: 'text-cream' },
            { label: 'Today', value: stats.today, color: 'text-gold' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
            { label: 'Confirmed', value: stats.confirmed, color: 'text-emerald-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-surface border border-border p-5">
              <div className={`font-serif text-3xl font-light mb-1 ${stat.color}`}>{stat.value}</div>
              <div className="text-cream/40 text-xs tracking-wider uppercase">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-4 mb-6">
          <h1 className="font-serif text-2xl text-cream">
            {view === 'settings' ? 'Settings' : view === 'schedule' ? 'Schedule' : view === 'services' ? 'Services' : 'Bookings'}
          </h1>
          <div className="flex flex-wrap border border-border ml-auto">
            {([
              { id: 'calendar' as const, Icon: Calendar, label: 'Calendar' },
              { id: 'list' as const, Icon: List, label: 'List' },
              { id: 'schedule' as const, Icon: CalendarClock, label: 'Schedule' },
              { id: 'services' as const, Icon: Scissors, label: 'Services' },
              { id: 'settings' as const, Icon: Settings, label: 'Settings' },
            ] as const).map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs transition-all duration-300 ${
                  view === id ? 'bg-gold text-background' : 'text-cream/50 hover:text-cream'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* CALENDAR VIEW */}
        {view === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar grid */}
            <div className="lg:col-span-2 bg-surface border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-xl">{format(calendarMonth, 'MMMM yyyy')}</h2>
                <div className="flex gap-2">
                  <button onClick={() => setCalendarMonth(m => subMonths(m, 1))} className="text-cream/40 hover:text-gold transition-colors p-1">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setCalendarMonth(m => addMonths(m, 1))} className="text-cream/40 hover:text-gold transition-colors p-1">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="text-center text-xs text-cream/30 tracking-wider py-2">{d}</div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Offset for first day */}
                {Array.from({ length: (monthDays[0].getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {monthDays.map(day => {
                  const daybkgs = dayBookings(day)
                  const isSelected = selectedDay && isSameDay(day, selectedDay)
                  const hasBookings = daybkgs.length > 0
                  const hasPending = daybkgs.some(b => b.status === 'pending')
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      className={`relative aspect-square flex flex-col items-center justify-center text-sm transition-all duration-200 rounded-sm ${
                        isSelected ? 'bg-gold text-background font-medium' :
                        isToday(day) ? 'border border-gold/50 text-gold' :
                        'hover:bg-elevated text-cream/70'
                      }`}
                    >
                      {day.getDate()}
                      {hasBookings && !isSelected && (
                        <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${hasPending ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Day detail */}
            <div className="bg-surface border border-border p-6">
              <h3 className="font-serif text-lg mb-1">
                {selectedDay ? format(selectedDay, 'EEEE') : 'Select a day'}
              </h3>
              <p className="text-cream/40 text-sm mb-6">
                {selectedDay ? format(selectedDay, 'd MMMM yyyy') : ''}
              </p>

              {selectedDayBookings.length === 0 ? (
                <p className="text-cream/30 text-sm">No bookings for this day</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayBookings.map(b => (
                    <BookingCard key={b.id} booking={b} updatingId={updatingId} onUpdate={updateStatus} compact />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCHEDULE VIEW */}
        {view === 'schedule' && (() => {
          const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          const toggleDay = (d: number) =>
            setWorkingDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a,b) => a-b))
          const toggleSlot = (slot: string) =>
            setWorkingSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot].sort())
          return (
            <div className="max-w-lg space-y-6">
              <div className="bg-surface border border-border p-6">
                <h2 className="font-serif text-lg text-cream mb-1">Working Days</h2>
                <p className="text-cream/40 text-sm mb-5">Select which days the salon is open for bookings.</p>
                <div className="flex gap-2 flex-wrap">
                  {DAY_LABELS.map((label, d) => (
                    <button
                      key={d}
                      onClick={() => toggleDay(d)}
                      className={`px-4 py-2 text-sm border transition-all duration-200 ${
                        workingDays.includes(d)
                          ? 'bg-gold border-gold text-background font-medium'
                          : 'border-border text-cream/40 hover:text-cream hover:border-gold/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-surface border border-border p-6">
                <h2 className="font-serif text-lg text-cream mb-1">Working Hours</h2>
                <p className="text-cream/40 text-sm mb-5">Select which time slots are available for booking.</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot}
                      onClick={() => toggleSlot(slot)}
                      className={`py-2.5 px-3 text-sm border transition-all duration-200 ${
                        workingSlots.includes(slot)
                          ? 'bg-gold border-gold text-background font-medium'
                          : 'border-border text-cream/40 hover:text-cream hover:border-gold/40'
                      }`}
                    >
                      {formatTime(slot)}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => saveSettings(
                    { schedule_days: workingDays.join(','), schedule_slots: workingSlots.join(',') },
                    setSavingSchedule, setScheduleSaved
                  )}
                  disabled={savingSchedule}
                  className="mt-6 btn-primary disabled:opacity-50"
                >
                  {scheduleSaved ? 'Saved' : savingSchedule ? 'Saving…' : 'Save Schedule'}
                </button>
              </div>
            </div>
          )
        })()}

        {/* SERVICES VIEW */}
        {view === 'services' && (() => {
          const CATEGORY_LABELS: Record<ServiceCategory, string> = {
            nail: 'Nail Services',
            massage: 'Massage',
            eyelash: 'Eyelashes',
            eyebrow: 'Eyebrows',
          }

          const addService = async () => {
            if (!serviceForm.name || !serviceForm.price || !serviceForm.duration) return
            setAddingService(true)
            const headers = await authHeaders()
            const res = await fetch('/api/services', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                category: adminServicesCategory,
                name: serviceForm.name,
                description: serviceForm.description,
                duration: parseInt(serviceForm.duration),
                price: parseFloat(serviceForm.price),
                popular: serviceForm.popular,
              }),
            })
            if (res.ok) {
              const { service } = await res.json()
              setAdminServices(prev => [...prev, service])
              setServiceForm({ name: '', description: '', duration: '60', price: '', popular: false })
            }
            setAddingService(false)
          }

          const deleteService = async (id: string) => {
            const headers = await authHeaders()
            const res = await fetch('/api/services', {
              method: 'DELETE',
              headers,
              body: JSON.stringify({ id }),
            })
            if (res.ok) setAdminServices(prev => prev.filter(s => s.id !== id))
          }

          return (
            <div className="max-w-2xl space-y-6">
              {/* Category tabs */}
              <div className="flex border border-border">
                {(Object.keys(CATEGORY_LABELS) as ServiceCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setAdminServicesCategory(cat)}
                    className={`flex-1 py-3 text-sm transition-all duration-200 ${
                      adminServicesCategory === cat
                        ? 'bg-gold text-background font-medium'
                        : 'text-cream/50 hover:text-cream'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              {/* Service list */}
              <div className="bg-surface border border-border divide-y divide-border">
                <div className="px-5 py-3 flex items-center gap-2">
                  <h2 className="font-serif text-base text-cream">{CATEGORY_LABELS[adminServicesCategory]}</h2>
                  <span className="text-cream/30 text-sm ml-auto">{adminServices.length} service{adminServices.length !== 1 ? 's' : ''}</span>
                </div>

                {loadingAdminServices ? (
                  <div className="p-5 text-cream/40 text-sm">Loading…</div>
                ) : adminServices.length === 0 ? (
                  <div className="p-5 text-cream/40 text-sm">No services yet.</div>
                ) : adminServices.map(svc => (
                  <div key={svc.id} className="flex items-start gap-4 px-5 py-4 group hover:bg-elevated transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-cream text-sm">{svc.name}</span>
                        {svc.popular && <span className="text-xs text-gold border border-gold/30 px-1.5 py-px">Popular</span>}
                      </div>
                      <p className="text-cream/40 text-xs truncate">{svc.description}</p>
                      <p className="text-cream/30 text-xs mt-1">{svc.duration} min</p>
                    </div>
                    <span className="text-gold text-sm shrink-0">£{Number(svc.price).toFixed(2)}</span>
                    <button
                      onClick={() => deleteService(svc.id)}
                      className="text-cream/20 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                      title="Delete service"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add service form */}
              <div className="bg-surface border border-border p-6 space-y-4">
                <h2 className="font-serif text-base text-cream mb-4">Add New Service</h2>
                <div>
                  <label className="text-cream/50 text-xs tracking-wider uppercase block mb-1.5">Name *</label>
                  <input
                    value={serviceForm.name}
                    onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Gel Manicure"
                    className="w-full bg-background border border-border text-cream px-3 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-cream/50 text-xs tracking-wider uppercase block mb-1.5">Description</label>
                  <input
                    value={serviceForm.description}
                    onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Short description of the service"
                    className="w-full bg-background border border-border text-cream px-3 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-cream/50 text-xs tracking-wider uppercase block mb-1.5">Duration (min) *</label>
                    <input
                      type="number"
                      value={serviceForm.duration}
                      onChange={e => setServiceForm(f => ({ ...f, duration: e.target.value }))}
                      min="5"
                      step="5"
                      className="w-full bg-background border border-border text-cream px-3 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-cream/50 text-xs tracking-wider uppercase block mb-1.5">Price (£) *</label>
                    <input
                      type="number"
                      value={serviceForm.price}
                      onChange={e => setServiceForm(f => ({ ...f, price: e.target.value }))}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full bg-background border border-border text-cream px-3 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setServiceForm(f => ({ ...f, popular: !f.popular }))}
                    className={`w-10 h-5 relative transition-colors duration-200 ${serviceForm.popular ? 'bg-gold' : 'bg-border'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-background transition-all duration-200 ${serviceForm.popular ? 'left-5' : 'left-0.5'}`} />
                  </div>
                  <span className="text-cream/60 text-sm">Mark as popular</span>
                </label>
                <button
                  onClick={addService}
                  disabled={addingService || !serviceForm.name || !serviceForm.price || !serviceForm.duration}
                  className="flex items-center gap-2 btn-primary disabled:opacity-50"
                >
                  <Plus size={15} />
                  {addingService ? 'Adding…' : 'Add Service'}
                </button>
              </div>
            </div>
          )
        })()}

        {/* SETTINGS VIEW */}
        {view === 'settings' && (
          <div className="max-w-lg space-y-6">

            {/* Settings sub-tabs */}
            <div className="flex border border-border w-fit">
              {(['general', 'emails'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSettingsTab(tab)}
                  className={`px-5 py-2 text-xs capitalize transition-all duration-300 ${
                    settingsTab === tab ? 'bg-gold text-background' : 'text-cream/50 hover:text-cream'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Site Info */}
            {settingsTab === 'general' && <>
            <div className="bg-surface border border-border p-6">
              <h2 className="font-serif text-lg text-cream mb-1">Site Info</h2>
              <p className="text-cream/40 text-sm mb-6">
                Shown on the website contact section and in client emails. Leave blank to use the built-in placeholder.
              </p>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-cream/50 tracking-wider uppercase mb-1.5">Address</label>
                  <textarea
                    rows={2}
                    value={siteInfo.site_address}
                    onChange={e => setSiteInfo(p => ({ ...p, site_address: e.target.value }))}
                    placeholder="123 Beauty Lane&#10;Your Town, AB12 3CD"
                    className="w-full bg-background border border-border focus:border-gold outline-none px-4 py-2.5 text-cream text-sm placeholder:text-cream/20 transition-colors resize-none"
                  />
                </div>
                {([
                  { key: 'site_phone' as const, label: 'Phone', type: 'tel', placeholder: '+44 7700 000000' },
                  { key: 'site_email' as const, label: 'Contact Email', type: 'email', placeholder: 'hello@anyasalon.com' },
                  { key: 'site_map_url' as const, label: 'Google Maps Embed URL', type: 'url', placeholder: 'https://www.google.com/maps/embed?pb=...' },
                ]).map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-cream/50 tracking-wider uppercase mb-1.5">{label}</label>
                    <input
                      type={type}
                      value={siteInfo[key]}
                      onChange={e => setSiteInfo(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-background border border-border focus:border-gold outline-none px-4 py-2.5 text-cream text-sm placeholder:text-cream/20 transition-colors"
                    />
                  </div>
                ))}

                <div className="pt-2">
                  <p className="text-xs text-cream/50 tracking-wider uppercase mb-3">Opening Hours</p>
                  <div className="space-y-3">
                    {([
                      { key: 'hours_mon_fri' as const, label: 'Mon – Fri', placeholder: '9:00 AM – 6:00 PM' },
                      { key: 'hours_sat' as const, label: 'Saturday', placeholder: '9:00 AM – 5:00 PM' },
                      { key: 'hours_sun' as const, label: 'Sunday', placeholder: 'Closed' },
                    ]).map(({ key, label, placeholder }) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-cream/40 text-xs w-20 shrink-0">{label}</span>
                        <input
                          type="text"
                          value={siteInfo[key]}
                          onChange={e => setSiteInfo(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="flex-1 bg-background border border-border focus:border-gold outline-none px-3 py-2 text-cream text-sm placeholder:text-cream/20 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-cream/50 tracking-wider uppercase mb-3">Social Media</p>
                  <div className="space-y-3">
                    {([
                      { key: 'social_instagram' as const, label: 'Instagram URL' },
                      { key: 'social_facebook' as const, label: 'Facebook URL' },
                    ]).map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs text-cream/40 mb-1.5">{label}</label>
                        <input
                          type="url"
                          value={siteInfo[key]}
                          onChange={e => setSiteInfo(p => ({ ...p, [key]: e.target.value }))}
                          placeholder="https://..."
                          className="w-full bg-background border border-border focus:border-gold outline-none px-4 py-2.5 text-cream text-sm placeholder:text-cream/20 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => saveSettings(siteInfo, setSavingSiteInfo, setSiteInfoSaved)}
                disabled={savingSiteInfo}
                className="mt-6 btn-primary disabled:opacity-50"
              >
                {siteInfoSaved ? 'Saved' : savingSiteInfo ? 'Saving…' : 'Save Site Info'}
              </button>
            </div>
            </>}

            {/* Email addresses */}
            {settingsTab === 'emails' && <><div className="bg-surface border border-border p-6">
              <h2 className="font-serif text-lg text-cream mb-1">Email Config</h2>
              <p className="text-cream/40 text-sm mb-6">
                Leave blank to use the server environment variable fallback.
              </p>
              <div className="space-y-5">
                {([
                  { key: 'admin_email' as const, label: 'Admin Email', hint: 'Who receives new booking alerts' },
                  { key: 'from_email' as const, label: 'From Email', hint: 'Sender address shown to clients' },
                ] as const).map(({ key, label, hint }) => (
                  <div key={key}>
                    <label className="block text-xs text-cream/50 tracking-wider uppercase mb-1">{label}</label>
                    <p className="text-cream/30 text-xs mb-2">{hint}</p>
                    <input
                      type="email"
                      value={emailConfig[key]}
                      onChange={e => setEmailConfig(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder="env var fallback"
                      className="w-full bg-background border border-border focus:border-gold outline-none px-4 py-2.5 text-cream text-sm placeholder:text-cream/20 transition-colors"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => saveSettings(emailConfig, setSavingEmailConfig, setEmailConfigSaved)}
                disabled={savingEmailConfig}
                className="mt-6 btn-primary disabled:opacity-50"
              >
                {emailConfigSaved ? 'Saved' : savingEmailConfig ? 'Saving…' : 'Save Email Config'}
              </button>
            </div>

            {/* Notifications toggle */}
            <div className="bg-surface border border-border p-6">
              <h2 className="font-serif text-lg text-cream mb-1">Notifications</h2>
              <p className="text-cream/40 text-sm mb-6">Control which emails are sent automatically.</p>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cream text-sm">Admin alert on new booking</p>
                  <p className="text-cream/40 text-xs mt-0.5">
                    Send an email to the Admin Email above when a new booking arrives
                  </p>
                </div>
                <button
                  onClick={() => adminNotifications !== null && toggleAdminNotifications(!adminNotifications)}
                  disabled={savingNotification || adminNotifications === null}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ml-6 disabled:opacity-50 ${
                    adminNotifications ? 'bg-gold' : 'bg-surface border border-border'
                  }`}
                  aria-label="Toggle admin notifications"
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background transition-transform duration-200 ${
                    adminNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <p className="text-cream/25 text-xs mt-6">
                Customer confirmation emails are always sent and cannot be disabled here.
              </p>
            </div>
            </>}

          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="space-y-2">
            {loading ? (
              <p className="text-cream/30 py-8 text-center">Loading bookings...</p>
            ) : bookings.length === 0 ? (
              <p className="text-cream/30 py-8 text-center">No bookings yet</p>
            ) : (
              bookings.map(b => (
                <BookingCard key={b.id} booking={b} updatingId={updatingId} onUpdate={updateStatus} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function BookingCard({
  booking: b,
  updatingId,
  onUpdate,
  compact = false,
}: {
  booking: Booking
  updatingId: string | null
  onUpdate: (id: string, status: string) => void
  compact?: boolean
}) {
  const isUpdating = updatingId === b.id

  return (
    <motion.div
      layout
      className={`border ${compact ? 'border-border p-4' : 'border-border bg-surface p-5'} transition-colors`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-cream font-medium text-sm">{b.name}</span>
            <span className={`text-xs border px-2 py-0.5 ${STATUS_STYLES[b.status]}`}>
              {b.status}
            </span>
          </div>
          <div className="text-gold text-sm mt-1">{b.service_name}</div>
          {!compact && (
            <div className="text-cream/40 text-xs mt-1">{b.email} · {b.phone}</div>
          )}
          <div className="flex items-center gap-1.5 text-cream/40 text-xs mt-1.5">
            <Clock size={11} />
            {compact ? b.time_slot : `${format(parseISO(b.date), 'd MMM yyyy')} at ${b.time_slot}`}
            · {b.duration_minutes}min
          </div>
          {b.notes && <p className="text-cream/30 text-xs mt-1.5 italic">{b.notes}</p>}
        </div>

        {b.status !== 'cancelled' && (
          <div className="flex gap-2 shrink-0">
            {b.status === 'pending' && (
              <button
                onClick={() => onUpdate(b.id, 'confirmed')}
                disabled={isUpdating}
                title="Confirm"
                className="text-emerald-400/60 hover:text-emerald-400 transition-colors disabled:opacity-30"
              >
                <CheckCircle size={18} />
              </button>
            )}
            <button
              onClick={() => onUpdate(b.id, 'cancelled')}
              disabled={isUpdating}
              title="Cancel"
              className="text-red-400/40 hover:text-red-400 transition-colors disabled:opacity-30"
            >
              <XCircle size={18} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

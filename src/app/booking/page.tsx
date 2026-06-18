'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format, isBefore, startOfDay, addDays } from 'date-fns'
import { ChevronLeft, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { NAIL_SERVICES, MASSAGE_SERVICES, EYELASH_SERVICES, EYEBROW_SERVICES, TIME_SLOTS, formatTime, type Service } from '@/lib/types'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(7, 'Please enter a valid phone number'),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

type Step = 'category' | 'service' | 'datetime' | 'details' | 'confirm' | 'success'

export default function BookingPage() {
  const [step, setStep] = useState<Step>('category')
  const [category, setCategory] = useState<'nail' | 'massage' | 'eyelash' | 'eyebrow' | null>(null)
  const [service, setService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const today = startOfDay(new Date())
  const disabledDays = [
    { before: addDays(today, 1) },
    { dayOfWeek: [0] }, // Sunday closed
  ]

  useEffect(() => {
    if (!selectedDate) return
    setLoadingSlots(true)
    setSelectedTime(null)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    fetch(`/api/available-slots?date=${dateStr}`)
      .then(r => r.json())
      .then(data => setBookedSlots(data.bookedSlots ?? []))
      .catch(() => setBookedSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [selectedDate])

  const servicesMap = { nail: NAIL_SERVICES, massage: MASSAGE_SERVICES, eyelash: EYELASH_SERVICES, eyebrow: EYEBROW_SERVICES }
  const services = category ? servicesMap[category] : []

  const onSubmit = async (data: FormData) => {
    if (!service || !selectedDate || !selectedTime) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          service_id: service.id,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time_slot: selectedTime,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Booking failed')
      setStep('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const stepProgress = { category: 1, service: 2, datetime: 3, details: 4, confirm: 5, success: 5 }

  return (
    <div className="min-h-screen bg-background text-cream">
      {/* Header */}
      <div className="border-b border-border">
        <div className="section-container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 text-cream/50 hover:text-gold transition-colors text-sm">
            <ChevronLeft size={16} />
            Back to Home
          </Link>
          <div className="font-serif text-lg">
            <span className="gold-text">Ania</span>
            <span className="text-cream/40 text-sm tracking-widest ml-1 font-sans">Salon</span>
          </div>
        </div>
      </div>

      <div className="section-container py-12 max-w-3xl">
        {/* Progress bar */}
        {step !== 'success' && (
          <div className="mb-10">
            <div className="flex justify-between text-xs text-cream/30 tracking-wider uppercase mb-3">
              <span>Step {stepProgress[step]} of 5</span>
              <span>{Math.round((stepProgress[step] / 5) * 100)}% Complete</span>
            </div>
            <div className="h-px bg-border">
              <motion.div
                className="h-full bg-gold"
                animate={{ width: `${(stepProgress[step] / 5) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* STEP 1: Category */}
          {step === 'category' && (
            <motion.div key="category" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 className="heading-md mb-2">Book an Appointment</h1>
              <p className="text-cream/40 mb-10">What type of treatment are you looking for?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'nail' as const, label: 'Nail Services', desc: 'Manicure, pedicure, gel, acrylics & nail art', emoji: '💅' },
                  { id: 'massage' as const, label: 'Massage', desc: 'Swedish, deep tissue, hot stone & more', emoji: '🌿' },
                  { id: 'eyelash' as const, label: 'Eyelashes', desc: 'Extensions, infills, lash lift & tint', emoji: '✨' },
                  { id: 'eyebrow' as const, label: 'Eyebrows', desc: 'Wax, tint, threading, lamination & HD brows', emoji: '🪄' },
                ].map(opt => (
                  <motion.button
                    key={opt.id}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setCategory(opt.id); setStep('service') }}
                    className="group text-left p-8 border border-border hover:border-gold/50 bg-surface transition-all duration-300"
                  >
                    <div className="text-3xl mb-4">{opt.emoji}</div>
                    <h2 className="font-serif text-xl text-cream group-hover:text-gold transition-colors mb-2">{opt.label}</h2>
                    <p className="text-cream/40 text-sm">{opt.desc}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Service */}
          {step === 'service' && (
            <motion.div key="service" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <button onClick={() => setStep('category')} className="flex items-center gap-2 text-cream/40 hover:text-gold text-sm mb-8 transition-colors">
                <ChevronLeft size={15} /> Back
              </button>
              <h2 className="heading-md mb-2">Choose Your Service</h2>
              <p className="text-cream/40 mb-8">{{ nail: 'Nail', massage: 'Massage', eyelash: 'Eyelash', eyebrow: 'Eyebrow' }[category!]} services available</p>
              <div className="space-y-2">
                {services.map((svc) => (
                  <motion.button
                    key={svc.id}
                    whileHover={{ x: 4 }}
                    onClick={() => { setService(svc); setStep('datetime') }}
                    className="w-full flex items-center justify-between p-5 border border-border hover:border-gold/40 bg-surface hover:bg-elevated text-left transition-all duration-300 group"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-cream group-hover:text-gold transition-colors">{svc.name}</span>
                        {svc.popular && <span className="text-xs text-gold border border-gold/40 px-2 py-0.5">Popular</span>}
                      </div>
                      <p className="text-cream/40 text-sm mt-1">{svc.description} · {svc.duration} min</p>
                    </div>
                    <span className="text-gold font-light text-lg ml-4 shrink-0">£{svc.price}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Date & Time */}
          {step === 'datetime' && (
            <motion.div key="datetime" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <button onClick={() => setStep('service')} className="flex items-center gap-2 text-cream/40 hover:text-gold text-sm mb-8 transition-colors">
                <ChevronLeft size={15} /> Back
              </button>
              <h2 className="heading-md mb-2">Pick Date &amp; Time</h2>
              <p className="text-cream/40 mb-8">{service?.name} · {service?.duration} min · £{service?.price}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Calendar */}
                <div className="bg-surface border border-border p-4">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={disabledDays}
                    fromMonth={today}
                    toMonth={addDays(today, 90)}
                    className="!font-sans"
                  />
                </div>

                {/* Time slots */}
                <div>
                  <p className="text-cream/50 text-sm mb-4">
                    {selectedDate ? `Available times for ${format(selectedDate, 'EEEE, d MMMM')}` : 'Select a date first'}
                  </p>
                  {loadingSlots ? (
                    <div className="flex items-center gap-3 text-cream/40">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Loading availability...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {TIME_SLOTS.map((slot) => {
                        const isBooked = bookedSlots.includes(slot)
                        const isSelected = selectedTime === slot
                        return (
                          <button
                            key={slot}
                            disabled={!selectedDate || isBooked}
                            onClick={() => setSelectedTime(slot)}
                            className={`py-3 px-4 text-sm border transition-all duration-200 ${
                              isSelected
                                ? 'border-gold bg-gold text-background font-medium'
                                : isBooked
                                ? 'border-border text-cream/20 cursor-not-allowed line-through'
                                : selectedDate
                                ? 'border-border hover:border-gold/50 text-cream/70 hover:text-cream'
                                : 'border-border text-cream/20 cursor-not-allowed'
                            }`}
                          >
                            {formatTime(slot)}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {selectedDate && selectedTime && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
                  <button onClick={() => setStep('details')} className="btn-primary w-full sm:w-auto justify-center">
                    Continue to Details
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 4: Personal Details */}
          {step === 'details' && (
            <motion.div key="details" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <button onClick={() => setStep('datetime')} className="flex items-center gap-2 text-cream/40 hover:text-gold text-sm mb-8 transition-colors">
                <ChevronLeft size={15} /> Back
              </button>
              <h2 className="heading-md mb-2">Your Details</h2>
              <p className="text-cream/40 mb-8">Almost there — just a few details</p>

              <form className="space-y-6" onSubmit={handleSubmit(() => setStep('confirm'))}>
                {[
                  { name: 'name' as const, label: 'Full Name', type: 'text', placeholder: 'Jane Smith' },
                  { name: 'email' as const, label: 'Email Address', type: 'email', placeholder: 'jane@example.com' },
                  { name: 'phone' as const, label: 'Phone Number', type: 'tel', placeholder: '+44 7700 000000' },
                ].map(field => (
                  <div key={field.name}>
                    <label className="block text-xs text-cream/50 tracking-wider uppercase mb-2">{field.label}</label>
                    <input
                      {...register(field.name)}
                      type={field.type}
                      placeholder={field.placeholder}
                      className="w-full bg-surface border border-border focus:border-gold outline-none px-4 py-3 text-cream placeholder:text-cream/20 transition-colors duration-300"
                    />
                    {errors[field.name] && (
                      <p className="text-red-400/80 text-xs mt-1.5">{errors[field.name]?.message}</p>
                    )}
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-cream/50 tracking-wider uppercase mb-2">Notes (optional)</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="Any special requests or information..."
                    className="w-full bg-surface border border-border focus:border-gold outline-none px-4 py-3 text-cream placeholder:text-cream/20 resize-none transition-colors duration-300"
                  />
                </div>
                <button type="submit" className="btn-primary w-full sm:w-auto justify-center">
                  Review Booking
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 5: Confirm */}
          {step === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <button onClick={() => setStep('details')} className="flex items-center gap-2 text-cream/40 hover:text-gold text-sm mb-8 transition-colors">
                <ChevronLeft size={15} /> Back
              </button>
              <h2 className="heading-md mb-8">Confirm Your Booking</h2>

              <div className="bg-surface border border-gold/20 p-8 mb-8">
                <h3 className="text-xs text-cream/40 tracking-wider uppercase mb-6">Booking Summary</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Service', value: service?.name },
                    { label: 'Category', value: { nail: 'Nail Services', massage: 'Massage', eyelash: 'Eyelashes', eyebrow: 'Eyebrows' }[category!] },
                    { label: 'Date', value: selectedDate ? format(selectedDate, 'EEEE, d MMMM yyyy') : '' },
                    { label: 'Time', value: selectedTime ? formatTime(selectedTime) : '' },
                    { label: 'Duration', value: `${service?.duration} minutes` },
                    { label: 'Price', value: `£${service?.price}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between border-b border-border pb-3 last:border-0">
                      <span className="text-cream/40 text-sm">{label}</span>
                      <span className="text-cream text-sm font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-red-400/80 bg-red-400/10 border border-red-400/20 px-4 py-3 mb-6 text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full sm:w-auto justify-center disabled:opacity-50"
                >
                  {submitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Confirming...</>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
              >
                <CheckCircle className="text-gold mx-auto mb-6" size={56} />
              </motion.div>
              <h2 className="heading-md mb-4">Booking Confirmed!</h2>
              <p className="text-cream/50 mb-2">
                Your appointment has been received.
              </p>
              <p className="text-cream/40 text-sm mb-10">
                You&apos;ll receive a confirmation from Ania shortly.
              </p>

              <div className="bg-surface border border-gold/20 p-6 inline-block text-left mb-10 min-w-[280px]">
                <div className="text-xs text-cream/40 tracking-wider uppercase mb-4">Your Appointment</div>
                <div className="space-y-2 text-sm">
                  <div className="text-cream">{service?.name}</div>
                  <div className="text-gold">{selectedDate ? format(selectedDate, 'EEEE, d MMMM yyyy') : ''}</div>
                  <div className="text-cream/60">{selectedTime ? formatTime(selectedTime) : ''}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/" className="btn-outline">Back to Home</Link>
                <button onClick={() => { setStep('category'); setCategory(null); setService(null); setSelectedDate(undefined); setSelectedTime(null) }} className="btn-primary">
                  Book Another
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

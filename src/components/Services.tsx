'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Sparkles, Clock, Star, Eye } from 'lucide-react'
import { type Service } from '@/lib/types'
import Link from 'next/link'

function ServiceCard({ service, index }: { service: Service; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className="group relative flex flex-col h-full bg-surface border border-border hover:border-gold/40 p-6 transition-all duration-400"
    >
      {service.popular && (
        <div className="absolute top-3 right-3">
          <Star size={12} className="text-gold fill-gold" />
        </div>
      )}

      {(() => {
        const discountActive = !!service.discount_price &&
          (!service.discount_ends_at || new Date(service.discount_ends_at) > new Date())
        return (
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-serif text-lg text-cream group-hover:text-gold transition-colors duration-300 leading-snug pr-4">
              {service.name}
            </h3>
            {discountActive ? (
              <div className="text-right shrink-0">
                <span className="text-cream/30 text-xs line-through block">£{service.price}</span>
                <span className="text-emerald-400 font-light text-lg">£{service.discount_price}</span>
              </div>
            ) : (
              <span className="text-gold font-light text-lg shrink-0">£{service.price}</span>
            )}
          </div>
        )
      })()}

      <p className="text-cream/50 text-sm leading-relaxed mb-4 flex-1">{service.description}</p>

      <div className="flex items-center gap-1.5 text-cream/30 text-xs mt-auto">
        <Clock size={11} />
        <span>{service.duration} min</span>
      </div>

      <motion.div
        className="absolute bottom-0 left-0 h-px bg-gold"
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.3 }}
        style={{ originX: 0 }}
      />
    </motion.div>
  )
}

export default function Services() {
  const [activeTab, setActiveTab] = useState<'massage' | 'lashes'>('massage')
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    setLoadingServices(true)
    fetch(`/api/services?category=${activeTab}`)
      .then(r => r.json())
      .then(({ services: svcs }) => setServices(svcs ?? []))
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false))
  }, [activeTab])

  return (
    <section id="services" className="py-28 bg-background" ref={ref}>
      <div className="section-container">

        {/* Header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="section-label mb-4"
          >
            Our Services
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="heading-lg text-cream"
          >
            Tailored for <span className="gold-text">You</span>
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="w-16 h-px bg-gold mx-auto mt-6"
          />
        </div>

        {/* Tab switcher */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex justify-center mb-12"
        >
          <div className="flex flex-wrap justify-center border border-border">
            {([
              { id: 'massage' as const, label: 'Massage', Icon: Sparkles },
              { id: 'lashes' as const, label: 'Lashes & Brows', Icon: Eye },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex items-center gap-2 px-8 py-4 text-sm tracking-wider uppercase transition-all duration-300 ${
                  activeTab === id
                    ? 'bg-gold text-background font-medium'
                    : 'text-cream/50 hover:text-cream hover:bg-surface'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Service cards grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-border"
          >
            {loadingServices
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-background p-6 animate-pulse">
                    <div className="h-5 bg-surface rounded mb-3 w-3/4" />
                    <div className="h-3 bg-surface rounded mb-2 w-full" />
                    <div className="h-3 bg-surface rounded w-2/3" />
                  </div>
                ))
              : services.map((service, i) => (
                  <div key={service.id} className="bg-background h-full">
                    <ServiceCard service={service} index={i} />
                  </div>
                ))
            }
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-16"
        >
          <p className="text-cream/40 text-sm mb-6">All services include a complimentary consultation</p>
          <Link href="/booking" className="btn-primary">
            Book Your Treatment
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

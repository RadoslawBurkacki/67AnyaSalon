'use client'

import { motion } from 'framer-motion'
import { Award, Heart, Sparkles, Users } from 'lucide-react'
import Image from 'next/image'

const highlights = [
  { Icon: Award, title: 'Certified Professional', desc: 'Fully qualified in lash artistry, brow treatments and therapeutic massage' },
  { Icon: Heart, title: 'Passion for Detail', desc: 'Every client receives personalised attention and care' },
  { Icon: Sparkles, title: 'Premium Products', desc: 'Only the finest professional-grade products used' },
  { Icon: Users, title: 'Loyal Clientele', desc: 'Building long-term relationships built on trust and results' },
]

export default function About() {
  return (
    <section id="about" className="py-28 bg-background overflow-hidden">
      <div className="section-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative"
          >
            {/* Main image */}
            <div className="relative aspect-[3/4] overflow-hidden bg-surface">
              <Image
                src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80"
                alt="Salon owner"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>

            {/* Gold frame accent */}
            <div className="absolute -top-4 -left-4 w-full h-full border border-gold/20 pointer-events-none" />

            {/* Floating stat card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="absolute -bottom-6 -right-6 bg-surface border border-gold/30 p-6 max-w-[180px]"
            >
              <div className="font-serif text-4xl text-gold font-light">10+</div>
              <div className="text-cream/50 text-xs tracking-wider uppercase mt-1">Years of<br />Experience</div>
            </motion.div>
          </motion.div>

          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <p className="section-label mb-6">About Me</p>

            <h2 className="heading-md text-cream mb-6">
              Hi, I&apos;m <span className="gold-text">Anya</span>
            </h2>

            <div className="space-y-5 text-cream/60 leading-relaxed mb-10">
              <p>
                Welcome to my salon — a place I created to offer more than just beauty treatments.
                I believe every visit should leave you feeling refreshed, confident, and truly cared for.
              </p>
              <p>
                With over a decade of experience in lash extensions, brow treatments and therapeutic
                massage, I&apos;ve had the privilege of working with hundreds of clients, each with
                their own unique needs. I approach every treatment with patience, creativity, and a
                commitment to excellence.
              </p>
              <p>
                Whether you&apos;re coming in for a lash set, brow lamination, or a relaxing massage
                — you&apos;re in expert hands.
              </p>
            </div>

            {/* Highlights grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {highlights.map(({ Icon, title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                  className="flex gap-4 group"
                >
                  <div className="mt-0.5 shrink-0">
                    <div className="w-9 h-9 border border-gold/30 group-hover:border-gold group-hover:bg-gold/10 flex items-center justify-center transition-all duration-300">
                      <Icon size={15} className="text-gold" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-cream text-sm font-medium mb-1">{title}</h3>
                    <p className="text-cream/40 text-xs leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Signature */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="mt-10 pt-8 border-t border-border"
            >
              <p className="font-serif text-3xl text-gold/80 italic">Anya</p>
              <p className="text-cream/30 text-xs tracking-wider mt-1">Owner &amp; Lead Therapist</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

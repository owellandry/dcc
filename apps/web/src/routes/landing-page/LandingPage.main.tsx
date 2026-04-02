'use client'

import Link from 'next/link'
import { Download, Sparkles } from 'lucide-react'
import { motion } from '@/lib/motion'

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#404EED] font-sans selection:bg-[#5865F2] selection:text-white">
      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 sm:px-12 lg:px-24">
        <div className="flex items-center gap-2 text-white">
          {/* Custom Discord-like Logo */}
          <svg width="32" height="32" viewBox="0 0 127.14 96.36" fill="currentColor">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c0,0,.04-.06.04-.09A71.18,71.18,0,0,0,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.3,46,96.19,53,91.08,65.69,84.69,65.69Z" />
          </svg>
          <span className="font-display text-xl font-800 tracking-tight">DCC</span>
        </div>
        
        <div className="hidden items-center gap-8 text-sm font-600 text-white lg:flex">
          <Link href="#" className="hover:underline">Descargar</Link>
          <Link href="#" className="hover:underline">Nitro</Link>
          <Link href="#" className="hover:underline">Descubrir</Link>
          <Link href="#" className="hover:underline">Seguridad</Link>
          <Link href="#" className="hover:underline">Soporte</Link>
          <Link href="#" className="hover:underline">Blog</Link>
        </div>

        <div>
          <Link
            href="/login"
            className="rounded-full bg-white px-4 py-2 text-sm font-500 text-[#23272A] transition-colors hover:text-[#5865F2] hover:shadow-lg"
          >
            Iniciar sesión
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 text-center text-white sm:pt-32 lg:px-24">
        <motion.h1 
          className="font-display text-[40px] font-800 uppercase leading-[95%] tracking-tight sm:text-[56px] md:text-[72px] lg:text-[84px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Imagina un lugar...
        </motion.h1>
        
        <motion.p 
          className="mt-8 max-w-[780px] text-base leading-[1.6] sm:text-lg md:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          ...en el que puedas formar parte de un club escolar, un grupo de gamers, o una comunidad mundial de arte. En el que puedas pasar tiempo con unos cuantos amigos. Un lugar que haga que hablar a diario y divertirte más a menudo sea fácil.
        </motion.p>

        <motion.div 
          className="mt-10 flex flex-col items-center gap-6 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-500 text-[#23272A] transition-all hover:text-[#5865F2] hover:shadow-xl"
          >
            <Download size={24} />
            Descargar para Mac
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-full bg-[#23272A] px-8 py-4 text-lg font-500 text-white transition-all hover:bg-[#36393f] hover:shadow-xl"
          >
            Abrir DCC en tu navegador
          </Link>
        </motion.div>
      </main>

      {/* Abstract Background Shapes mimicking Discord's clouds/illustrations */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[50vh] w-full overflow-hidden">
        {/* Left abstract shoe/mountain */}
        <motion.div 
          className="absolute -bottom-10 -left-20 hidden h-[400px] w-[500px] bg-[url('https://cdn.discordapp.com/assets/discovering/discovering-1.svg')] bg-contain bg-no-repeat lg:block"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
        {/* Right abstract drink/console */}
        <motion.div 
          className="absolute -bottom-10 -right-20 hidden h-[400px] w-[500px] bg-[url('https://cdn.discordapp.com/assets/discovering/discovering-2.svg')] bg-contain bg-no-repeat lg:block"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        />
        {/* Clouds */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-[url('https://cdn.discordapp.com/assets/discovering/clouds.svg')] bg-cover bg-bottom bg-no-repeat opacity-50" />
      </div>
    </div>
  )
}

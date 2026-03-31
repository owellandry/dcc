import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surface tokens — reference CSS variables from globals.css
        s: {
          0: 'var(--s0)',
          1: 'var(--s1)',
          2: 'var(--s2)',
          3: 'var(--s3)',
          4: 'var(--s4)',
          5: 'var(--s5)',
          6: 'var(--s6)',
          7: 'var(--s7)',
        },
        // Text hierarchy tokens
        t: {
          0: 'var(--t0)',
          1: 'var(--t1)',
          2: 'var(--t2)',
          3: 'var(--t3)',
          4: 'var(--t4)',
        },
        // Accent: ember orange
        ember: {
          DEFAULT: 'var(--ember)',
          hover:   'var(--ember-hover)',
          dim:     'var(--ember-dim)',
          glow:    'var(--ember-glow)',
          600: '#cc4d0f',
          500: '#e85920',
          400: '#ff6835',
          300: '#ff8c5a',
          200: '#ffb38a',
          100: '#ffd4be',
        },
        // Secondary: volt violet
        volt: {
          DEFAULT: 'var(--volt)',
          dim:     'var(--volt-dim)',
          600: '#5344cc',
          500: '#6557e8',
          400: '#7c6bff',
          300: '#9d8fff',
          200: '#c2baff',
          100: '#e4e0ff',
        },
        // Status colors
        status: {
          online:  'var(--online)',
          idle:    'var(--idle)',
          dnd:     'var(--dnd)',
          offline: 'var(--offline)',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body:    'var(--font-body)',
        mono:    'var(--font-mono)',
      },
      animation: {
        'fade-in':       'fade-in 120ms ease-out both',
        'slide-up':      'slide-up 220ms cubic-bezier(0.16,1,0.3,1) both',
        'spring':        'spring-in 200ms cubic-bezier(0.34,1.56,0.64,1) both',
        'pop':           'pop 180ms cubic-bezier(0.34,1.56,0.64,1) both',
        'shake':         'shake 300ms ease both',
        'skeleton':      'skeleton-sweep 1.6s ease-in-out infinite',
        'ping-once':     'ping-once 0.6s cubic-bezier(0,0,0.2,1) 1',
        'typing-dot':    'typing-dot 1.2s ease-in-out infinite',
      },
      boxShadow: {
        'sm':        'none',
        'md':        'none',
        'lg':        'none',
        'xl':        'none',
        'glow-ember':'none',
        'glow-volt': 'none',
        'context':   'none',
        'highlight': 'none',
      },
    },
  },
  plugins: [],
}

export default config

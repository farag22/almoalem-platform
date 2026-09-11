import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Sun, Moon, LogIn, QrCode } from 'lucide-react'

function OpenBook() {
  return (
    <div className="book-scene" aria-hidden="true">
      <div className="book-aura" />
      <svg viewBox="0 0 220 165" className="book-svg">
        <defs>
          <linearGradient id="coverGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
          <linearGradient id="pageGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>
          <linearGradient id="pageShine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <path
          className="book-cover book-cover-left"
          d="M110 30 Q68 20 30 34 L30 140 Q68 126 110 136 Z"
          fill="url(#coverGrad)"
        />
        <path
          className="book-cover book-cover-right"
          d="M110 30 Q152 20 190 34 L190 140 Q152 126 110 136 Z"
          fill="url(#coverGrad)"
        />

        <g className="book-page book-page-left">
          <path
            d="M110 36 Q72 28 40 40 L40 138 Q72 126 110 132 Z"
            fill="url(#pageGrad)"
            stroke="#c7d2fe"
            strokeWidth="1.5"
          />
          <g stroke="#a5b4fc" strokeLinecap="round" opacity="0.5">
            <line x1="52" y1="58" x2="96" y2="58" strokeWidth="3" />
            <line x1="52" y1="70" x2="88" y2="70" strokeWidth="3" />
            <line x1="52" y1="82" x2="94" y2="82" strokeWidth="3" />
            <line x1="52" y1="98" x2="78" y2="98" strokeWidth="3" />
            <line x1="52" y1="110" x2="90" y2="110" strokeWidth="3" />
          </g>
          <path d="M40 40 L110 36 L110 132 L40 138 Z" fill="url(#pageShine)" opacity="0.4" />
        </g>

        <g className="book-page book-page-right">
          <path
            d="M110 36 Q148 28 180 40 L180 138 Q148 126 110 132 Z"
            fill="url(#pageGrad)"
            stroke="#c7d2fe"
            strokeWidth="1.5"
          />
          <g stroke="#a5b4fc" strokeLinecap="round" opacity="0.5">
            <line x1="124" y1="58" x2="168" y2="58" strokeWidth="3" />
            <line x1="124" y1="70" x2="160" y2="70" strokeWidth="3" />
            <line x1="124" y1="82" x2="166" y2="82" strokeWidth="3" />
            <line x1="124" y1="98" x2="150" y2="98" strokeWidth="3" />
            <line x1="124" y1="110" x2="162" y2="110" strokeWidth="3" />
          </g>
          <path d="M110 36 L180 40 L180 138 L110 132 Z" fill="url(#pageShine)" opacity="0.4" />
        </g>

        <line x1="110" y1="30" x2="110" y2="136" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="110" cy="30" r="3.5" fill="#4338ca" />
        <circle cx="110" cy="136" r="3.5" fill="#4338ca" />
      </svg>
      <style>{`
        .book-scene { position: relative; width: 180px; height: 135px; perspective: 1000px; }
        .book-aura { position: absolute; inset: -18px; border-radius: 9999px; background: radial-gradient(circle, rgba(99,102,241,0.28), transparent 65%); filter: blur(18px); animation: auraPulse 3s ease-in-out infinite; }
        .book-svg { position: relative; width: 100%; height: 100%; overflow: visible; animation: bookFloat 3.2s ease-in-out infinite; }
        .book-cover, .book-page { transform-box: fill-box; }
        .book-cover-left, .book-page-left { transform-origin: right center; animation: openLeft 1.15s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both; }
        .book-cover-right, .book-page-right { transform-origin: left center; animation: openRight 1.15s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both; }
        .book-page-left, .book-page-right { animation-duration: 1.2s; animation-delay: 0.12s; }
        @keyframes openLeft { from { transform: rotateY(88deg); opacity: 0.25; } to { transform: rotateY(0deg); opacity: 1; } }
        @keyframes openRight { from { transform: rotateY(-88deg); opacity: 0.25; } to { transform: rotateY(0deg); opacity: 1; } }
        @keyframes bookFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes auraPulse { 0%, 100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
      `}</style>
    </div>
  )
}

function SplashScreen({ leaving }) {
  return (
    <div className={`splash-screen ${leaving ? 'splash-leave' : ''}`}>
      <style>{`
        .splash-screen { position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2rem; background: #0b1020; transition: opacity 0.55s ease, visibility 0.55s ease; overflow: hidden; }
        .splash-screen::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.22), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(168,85,247,0.14), transparent 50%); }
        .splash-leave { opacity: 0; visibility: hidden; pointer-events: none; }
        .splash-title { position: relative; font-size: 1.6rem; font-weight: 900; color: #fff; animation: splashUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.5s both; }
        .splash-title span { background: linear-gradient(90deg, #a5b4fc, #818cf8, #c084fc); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .splash-bar { position: relative; width: 140px; height: 3px; border-radius: 99px; background: rgba(148,163,184,0.18); overflow: hidden; animation: splashUp 0.7s ease 0.75s both; }
        .splash-bar::after { content: ''; position: absolute; inset: 0; border-radius: 99px; background: linear-gradient(90deg, #6366f1, #a855f7); transform-origin: right; animation: barGrow 1.5s ease 0.2s both; }
        @keyframes splashUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes barGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      `}</style>
      <OpenBook />
      <h1 className="splash-title">
        منصة <span>تعليم</span>
      </h1>
      <div className="splash-bar" />
    </div>
  )
}

function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={dark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 text-slate-500 shadow-sm backdrop-blur transition hover:text-primary-600 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-primary-300"
    >
      <span className={`transition-all duration-300 ${dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}>
        <Moon className="h-4 w-4" />
      </span>
      <span className={`absolute transition-all duration-300 ${dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}>
        <Sun className="h-4 w-4" />
      </span>
    </button>
  )
}

export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(true)
  const [splashLeaving, setSplashLeaving] = useState(false)
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const leaveTimer = setTimeout(() => setSplashLeaving(true), 1500)
    const hideTimer = setTimeout(() => setShowSplash(false), 2100)
    return () => {
      clearTimeout(leaveTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <>
      {showSplash && <SplashScreen leaving={splashLeaving} />}

      <div className="relative flex h-screen max-h-screen flex-col overflow-hidden bg-slate-50 font-sans text-slate-800 transition-colors duration-300 dark:bg-[#0a0d18] dark:text-slate-100">
        {/* Ambient background */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute -top-24 right-[-8%] h-72 w-72 rounded-full bg-sky-400/20 blur-[110px] dark:bg-sky-500/10" />
          <div className="absolute bottom-[-15%] left-[-10%] h-72 w-72 rounded-full bg-violet-400/20 blur-[120px] dark:bg-violet-500/10" />
        </div>

        {/* Top corner: theme toggle */}
        <header className="relative z-10 flex justify-end px-4 pt-4">
          <ThemeToggle dark={dark} onToggle={() => setDark((d) => !d)} />
        </header>

        {/* Center: brand + actions */}
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-4">
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25">
              <GraduationCap className="h-8 w-8" strokeWidth={2.2} />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-white">
              منصة تعليم
            </h1>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-2">
            <Link
              to="/teacher/login"
              className="group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-l from-indigo-500 via-violet-500 to-fuchsia-500 text-[15px] font-extrabold text-white shadow-lg shadow-violet-500/30 transition-all duration-300 hover:brightness-110 active:scale-[0.97]"
            >
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.35)_50%,transparent_70%)] bg-[length:200%_100%] transition-[background-position] duration-700 group-hover:bg-[position:100%_0]" />
              <LogIn className="h-[18px] w-[18px]" />
              دخول المعلم
            </Link>
            <Link
              to="/parent"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 text-[15px] font-extrabold text-slate-700 shadow-sm backdrop-blur transition-all duration-300 hover:border-primary-300 hover:text-primary-600 active:scale-[0.97] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-primary-400/50 dark:hover:text-primary-300"
            >
              <QrCode className="h-[18px] w-[18px]" />
              استعلام ولي الأمر
            </Link>
          </div>
        </main>
      </div>
    </>
  )
}

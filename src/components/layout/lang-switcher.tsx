'use client'

import { useRouter } from 'next/navigation'

interface LangSwitcherProps {
  currentLang: 'vi' | 'en'
}

export function LangSwitcher({ currentLang }: LangSwitcherProps) {
  const router = useRouter()

  function setLang(lang: string) {
    document.cookie = `NEXT_LOCALE=${lang};path=/;max-age=31536000`
    router.refresh()
  }

  return (
    <div className="flex gap-1 rounded-full border border-gray-200 bg-gray-100 p-0.5 text-xs">
      <button
        onClick={() => setLang('vi')}
        className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
          currentLang === 'vi' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        🇻🇳
      </button>
      <button
        onClick={() => setLang('en')}
        className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
          currentLang === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        🇬🇧
      </button>
    </div>
  )
}

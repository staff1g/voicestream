 
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Language } from './translations'

type LanguageContextType = {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'fr',
  setLang: () => {},
  t: (key: string) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('fr')

  useEffect(() => {
    const saved = localStorage.getItem('bezbez_lang') as Language
    if (saved && translations[saved]) {
      setLangState(saved)
      return
    }
    const browserLang = navigator.language.slice(0, 2)
    if (browserLang === 'ar') setLangState('ar')
    else if (browserLang === 'de') setLangState('de')
    else if (browserLang === 'en') setLangState('en')
    else setLangState('fr')
  }, [])

  function setLang(newLang: Language) {
    setLangState(newLang)
    localStorage.setItem('bezbez_lang', newLang)
  }

  function t(key: string): string {
    return translations[lang]?.[key] || translations['fr']?.[key] || key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
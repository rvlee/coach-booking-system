import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { Language, translations } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Fetch language preference from server
    const fetchLanguage = async (): Promise<void> => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get<{ language: Language }>('/api/coach/settings');
          if (response.data?.language) {
            setLanguageState(response.data.language);
          }
        }
      } catch (err) {
        // If not logged in or error, use default
        console.error('Error fetching language:', err);
      }
    };
    fetchLanguage();
  }, []);

  const setLanguage = async (lang: Language): Promise<void> => {
    setLanguageState(lang);
    // Update on server
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.put('/api/coach/settings', { language: lang });
      }
    } catch (err) {
      console.error('Error updating language:', err);
    }
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language]
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}



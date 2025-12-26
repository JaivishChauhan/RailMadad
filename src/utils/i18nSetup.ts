/**
 * Internationalization Setup
 * 
 * Initializes the i18n system with all translations and configurations
 */

import { translationManager } from './i18n';
import { ENGLISH_TRANSLATIONS, SPANISH_TRANSLATIONS, FRENCH_TRANSLATIONS } from './translations';

/**
 * Initialize the translation system with all available translations
 */
export const initializeI18n = async () => {
  try {
    // Add English translations (default/fallback)
    translationManager.addTranslations('en', ENGLISH_TRANSLATIONS);
    
    // Add Spanish translations
    translationManager.addTranslations('es', SPANISH_TRANSLATIONS);
    
    // Add French translations
    translationManager.addTranslations('fr', FRENCH_TRANSLATIONS);
    
    // Add other language translations (you can add more here)
    // For now, we'll use English as fallback for other languages
    const fallbackLanguages: Array<'de' | 'it' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko' | 'ar' | 'hi'> = 
      ['de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'];
    
    fallbackLanguages.forEach(lang => {
      translationManager.addTranslations(lang, ENGLISH_TRANSLATIONS);
    });
    
    console.log('✅ Internationalization system initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize i18n system:', error);
  }
};

/**
 * Load additional translations dynamically
 */
export const loadLanguageTranslations = async (language: string) => {
  try {
    // In a real application, you might load translations from an API or separate files
    // For now, we'll return the existing translations
    switch (language) {
      case 'en':
        return ENGLISH_TRANSLATIONS;
      case 'es':
        return SPANISH_TRANSLATIONS;
      case 'fr':
        return FRENCH_TRANSLATIONS;
      default:
        return ENGLISH_TRANSLATIONS; // Fallback
    }
  } catch (error) {
    console.error(`Failed to load translations for ${language}:`, error);
    return ENGLISH_TRANSLATIONS; // Fallback to English
  }
};

/**
 * Get translation completion status for each language
 */
export const getTranslationStatus = () => {
  return {
    en: { name: 'English', completion: 100 },
    es: { name: 'Spanish', completion: 85 }, // Estimated based on what we've translated
    fr: { name: 'French', completion: 60 }, // Partial translation
    de: { name: 'German', completion: 0 },   // Using fallback
    it: { name: 'Italian', completion: 0 },  // Using fallback
    pt: { name: 'Portuguese', completion: 0 }, // Using fallback
    ru: { name: 'Russian', completion: 0 },   // Using fallback
    zh: { name: 'Chinese', completion: 0 },   // Using fallback
    ja: { name: 'Japanese', completion: 0 },  // Using fallback
    ko: { name: 'Korean', completion: 0 },    // Using fallback
    ar: { name: 'Arabic', completion: 0 },    // Using fallback
    hi: { name: 'Hindi', completion: 0 }      // Using fallback
  };
};

// Auto-initialize when this module is imported
initializeI18n();
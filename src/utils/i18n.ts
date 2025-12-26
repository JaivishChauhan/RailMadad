/**
 * Internationalization (i18n) Utilities for User-Aware Components
 * 
 * Provides comprehensive multilingual support including:
 * - Dynamic language switching
 * - Context-aware translations
 * - Role-based translations
 * - Pluralization support
 * - RTL language support
 * - Date/time localization
 * - Number formatting
 */

import { UserContext, Role } from '../types';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko' | 'ar' | 'hi';

export interface TranslationNamespace {
  [key: string]: string | string[] | TranslationNamespace;
}

export interface TranslationResource {
  [namespace: string]: TranslationNamespace;
}

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  rtl: boolean;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  numberFormat: Intl.NumberFormatOptions;
}

export interface TranslationContext {
  user?: {
    name?: string;
    role?: string;
    preferences?: any;
  };
  count?: number;
  date?: Date;
  time?: Date;
  context?: 'formal' | 'informal' | 'technical';
  // Allow additional dynamic properties
  [key: string]: any;
}

export interface PluralRules {
  [language: string]: (count: number) => 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
}

// Language configurations
export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    rtl: false,
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
    currency: 'USD',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 }
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    rtl: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    currency: 'EUR',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 }
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    rtl: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    currency: 'EUR',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 }
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    rtl: false,
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    currency: 'EUR',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0, useGrouping: true }
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    rtl: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    currency: 'EUR',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 }
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    rtl: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    currency: 'EUR',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 }
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    rtl: false,
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    currency: 'RUB',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 }
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    rtl: false,
    dateFormat: 'YYYY/MM/DD',
    timeFormat: 'HH:mm',
    currency: 'CNY',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 }
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    rtl: false,
    dateFormat: 'YYYY/MM/DD',
    timeFormat: 'HH:mm',
    currency: 'JPY',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 }
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    rtl: false,
    dateFormat: 'YYYY.MM.DD',
    timeFormat: 'HH:mm',
    currency: 'KRW',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 }
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    rtl: true,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    currency: 'SAR',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 }
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    rtl: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    currency: 'INR',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 }
  }
};

// Pluralization rules for different languages
export const PLURAL_RULES: PluralRules = {
  en: (count: number) => count === 1 ? 'one' : 'other',
  es: (count: number) => count === 1 ? 'one' : 'other',
  fr: (count: number) => count === 0 || count === 1 ? 'one' : 'other',
  de: (count: number) => count === 1 ? 'one' : 'other',
  it: (count: number) => count === 1 ? 'one' : 'other',
  pt: (count: number) => count === 1 ? 'one' : 'other',
  ru: (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'one';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
    return 'many';
  },
  zh: () => 'other',
  ja: () => 'other',
  ko: () => 'other',
  ar: (count: number) => {
    if (count === 0) return 'zero';
    if (count === 1) return 'one';
    if (count === 2) return 'two';
    if (count >= 3 && count <= 10) return 'few';
    if (count >= 11 && count <= 99) return 'many';
    return 'other';
  },
  hi: (count: number) => count === 1 ? 'one' : 'other'
};

/**
 * Translation Manager Class
 */
export class TranslationManager {
  private static instance: TranslationManager | null = null;
  private currentLanguage: SupportedLanguage = 'en';
  private translations: Record<SupportedLanguage, TranslationResource> = {} as Record<SupportedLanguage, TranslationResource>;
  private fallbackLanguage: SupportedLanguage = 'en';
  private observers: Set<(language: SupportedLanguage) => void> = new Set();

  static getInstance(): TranslationManager {
    if (!TranslationManager.instance) {
      TranslationManager.instance = new TranslationManager();
    }
    return TranslationManager.instance;
  }

  constructor() {
    this.detectBrowserLanguage();
    this.loadStoredLanguage();
  }

  private detectBrowserLanguage(): void {
    const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
    if (LANGUAGE_CONFIGS[browserLang]) {
      this.currentLanguage = browserLang;
    }
  }

  private loadStoredLanguage(): void {
    try {
      const stored = localStorage.getItem('preferred_language') as SupportedLanguage;
      if (stored && LANGUAGE_CONFIGS[stored]) {
        this.currentLanguage = stored;
      }
    } catch (error) {
      console.warn('Failed to load stored language preference:', error);
    }
  }

  /**
   * Set the current language
   */
  setLanguage(language: SupportedLanguage): void {
    if (!LANGUAGE_CONFIGS[language]) {
      console.warn(`Unsupported language: ${language}`);
      return;
    }

    this.currentLanguage = language;
    
    // Store preference
    try {
      localStorage.setItem('preferred_language', language);
    } catch (error) {
      console.warn('Failed to store language preference:', error);
    }

    // Apply RTL if needed
    this.applyLanguageDirection(language);

    // Notify observers
    this.observers.forEach(callback => callback(language));
  }

  /**
   * Get the current language
   */
  getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Get language configuration
   */
  getLanguageConfig(language?: SupportedLanguage): LanguageConfig {
    return LANGUAGE_CONFIGS[language || this.currentLanguage];
  }

  /**
   * Add translation resources for a language
   */
  addTranslations(language: SupportedLanguage, translations: TranslationResource): void {
    if (!this.translations[language]) {
      this.translations[language] = {};
    }
    
    // Deep merge translations
    this.translations[language] = this.deepMerge(this.translations[language], translations);
  }

  /**
   * Subscribe to language changes
   */
  subscribe(callback: (language: SupportedLanguage) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Translate a key with optional interpolation and context
   */
  translate(
    key: string, 
    context: TranslationContext = {}, 
    language?: SupportedLanguage
  ): string {
    const lang = language || this.currentLanguage;
    const translation = this.getTranslation(key, lang) || this.getTranslation(key, this.fallbackLanguage) || key;

    return this.interpolate(translation, context, lang);
  }

  /**
   * Translate with pluralization support
   */
  translatePlural(
    key: string,
    count: number,
    context: TranslationContext = {},
    language?: SupportedLanguage
  ): string {
    const lang = language || this.currentLanguage;
    const pluralRule = PLURAL_RULES[lang] || PLURAL_RULES.en;
    const pluralForm = pluralRule(count);
    
    const pluralKey = `${key}.${pluralForm}`;
    const translation = this.getTranslation(pluralKey, lang) || 
                       this.getTranslation(`${key}.other`, lang) ||
                       this.getTranslation(key, lang) ||
                       key;

    return this.interpolate(translation, { ...context, count }, lang);
  }

  /**
   * Format date according to language preferences
   */
  formatDate(date: Date, language?: SupportedLanguage): string {
    const lang = language || this.currentLanguage;
    const config = LANGUAGE_CONFIGS[lang];
    
    try {
      return new Intl.DateTimeFormat(lang, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    } catch (error) {
      return date.toLocaleDateString();
    }
  }

  /**
   * Format time according to language preferences
   */
  formatTime(date: Date, language?: SupportedLanguage): string {
    const lang = language || this.currentLanguage;
    
    try {
      return new Intl.DateTimeFormat(lang, {
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return date.toLocaleTimeString();
    }
  }

  /**
   * Format number according to language preferences
   */
  formatNumber(number: number, language?: SupportedLanguage): string {
    const lang = language || this.currentLanguage;
    const config = LANGUAGE_CONFIGS[lang];
    
    try {
      return new Intl.NumberFormat(lang, config.numberFormat).format(number);
    } catch (error) {
      return number.toString();
    }
  }

  /**
   * Format currency according to language preferences
   */
  formatCurrency(amount: number, currency?: string, language?: SupportedLanguage): string {
    const lang = language || this.currentLanguage;
    const config = LANGUAGE_CONFIGS[lang];
    const currencyCode = currency || config.currency;
    
    try {
      return new Intl.NumberFormat(lang, {
        style: 'currency',
        currency: currencyCode
      }).format(amount);
    } catch (error) {
      return `${currencyCode} ${amount}`;
    }
  }

  private getTranslation(key: string, language: SupportedLanguage): string | null {
    const keys = key.split('.');
    let current: any = this.translations[language];

    for (const keyPart of keys) {
      if (current && typeof current === 'object' && keyPart in current) {
        current = current[keyPart];
      } else {
        return null;
      }
    }

    return typeof current === 'string' ? current : null;
  }

  private interpolate(template: string, context: TranslationContext, language: SupportedLanguage): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key === 'count' && typeof context.count === 'number') {
        return this.formatNumber(context.count, language);
      }
      
      if (key === 'date' && context.date) {
        return this.formatDate(context.date, language);
      }
      
      if (key === 'time' && context.time) {
        return this.formatTime(context.time, language);
      }

      if (context.user && key.startsWith('user.')) {
        const userKey = key.replace('user.', '');
        return (context.user as any)[userKey] || match;
      }

      return (context as any)[key] || match;
    });
  }

  private applyLanguageDirection(language: SupportedLanguage): void {
    const config = LANGUAGE_CONFIGS[language];
    const htmlElement = document.documentElement;
    
    if (config.rtl) {
      htmlElement.dir = 'rtl';
      htmlElement.classList.add('rtl');
      htmlElement.classList.remove('ltr');
    } else {
      htmlElement.dir = 'ltr';
      htmlElement.classList.add('ltr');
      htmlElement.classList.remove('rtl');
    }
    
    htmlElement.lang = language;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

// Default instance
export const translationManager = TranslationManager.getInstance();

/**
 * Convenience functions
 */
export const t = (key: string, context?: TranslationContext, language?: SupportedLanguage): string => {
  return translationManager.translate(key, context, language);
};

export const tn = (key: string, count: number, context?: TranslationContext, language?: SupportedLanguage): string => {
  return translationManager.translatePlural(key, count, context, language);
};

export const formatDate = (date: Date, language?: SupportedLanguage): string => {
  return translationManager.formatDate(date, language);
};

export const formatTime = (date: Date, language?: SupportedLanguage): string => {
  return translationManager.formatTime(date, language);
};

export const formatNumber = (number: number, language?: SupportedLanguage): string => {
  return translationManager.formatNumber(number, language);
};

export const formatCurrency = (amount: number, currency?: string, language?: SupportedLanguage): string => {
  return translationManager.formatCurrency(amount, currency, language);
};
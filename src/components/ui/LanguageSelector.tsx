/**
 * Language Selector Component
 * 
 * Provides UI for language selection with:
 * - Dropdown selector
 * - Language flags/icons
 * - Accessibility support
 * - User preference persistence
 */

import React, { useState, useRef } from 'react';
import { ChevronDown, Globe, Check } from 'lucide-react';
import { useTranslation } from '../../hooks/useI18n';
import { SupportedLanguage, LANGUAGE_CONFIGS } from '../../utils/i18n';
import { useAccessibilityAnnouncements } from '../../hooks/useI18n';

export interface LanguageSelectorProps {
  variant?: 'dropdown' | 'menu' | 'compact';
  showFlags?: boolean;
  showNativeNames?: boolean;
  className?: string;
  onLanguageChange?: (language: SupportedLanguage) => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'dropdown',
  showFlags = true,
  showNativeNames = true,
  className = '',
  onLanguageChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    language: currentLanguage, 
    setLanguage, 
    t, 
    availableLanguages,
    isRTL 
  } = useTranslation();
  
  const { announceLanguageChange } = useAccessibilityAnnouncements();
  const selectRef = useRef<HTMLDivElement>(null);

  const handleLanguageSelect = (language: SupportedLanguage) => {
    setLanguage(language);
    setIsOpen(false);
    
    // Announce language change for accessibility
    const languageName = LANGUAGE_CONFIGS[language].nativeName;
    announceLanguageChange(languageName);
    
    onLanguageChange?.(language);
  };

  const handleKeyDown = (event: React.KeyboardEvent, language?: SupportedLanguage) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (language) {
          handleLanguageSelect(language);
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'ArrowUp':
        if (isOpen) {
          setIsOpen(false);
        }
        break;
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderFlag = (language: SupportedLanguage) => {
    if (!showFlags) return null;
    
    // Simple flag representation using emoji or Unicode flags
    const flagMap: Record<SupportedLanguage, string> = {
      en: '🇺🇸',
      es: '🇪🇸', 
      fr: '🇫🇷',
      de: '🇩🇪',
      it: '🇮🇹',
      pt: '🇵🇹',
      ru: '🇷🇺',
      zh: '🇨🇳',
      ja: '🇯🇵',
      ko: '🇰🇷',
      ar: '🇸🇦',
      hi: '🇮🇳'
    };

    return (
      <span 
        className="mr-2 text-lg"
        role="img" 
        aria-label={`${LANGUAGE_CONFIGS[language].name} flag`}
      >
        {flagMap[language]}
      </span>
    );
  };

  const renderLanguageName = (language: SupportedLanguage) => {
    const config = LANGUAGE_CONFIGS[language];
    if (showNativeNames) {
      return (
        <span>
          {config.nativeName}
          <span className="text-gray-500 ml-1 text-sm">({config.name})</span>
        </span>
      );
    }
    return <span>{config.name}</span>;
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => handleKeyDown(e)}
        disabled={disabled}
        className={`
          relative inline-flex items-center px-3 py-2 text-sm font-medium
          bg-white border border-gray-300 rounded-md shadow-sm
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isRTL ? 'flex-row-reverse' : ''}
          ${className}
        `}
        aria-label={t('language.selector.current', { 
          language: LANGUAGE_CONFIGS[currentLanguage].nativeName 
        })}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4" />
        <span className="ml-1 text-xs">
          {LANGUAGE_CONFIGS[currentLanguage].code.toUpperCase()}
        </span>
        <ChevronDown className={`ml-1 w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        
        {isOpen && (
          <div className={`
            absolute top-full mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-50
            ${isRTL ? 'right-0' : 'left-0'}
          `}>
            <div role="listbox" aria-label={t('language.selector.title')}>
              {availableLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageSelect(lang)}
                  onKeyDown={(e) => handleKeyDown(e, lang)}
                  role="option"
                  aria-selected={lang === currentLanguage}
                  className={`
                    w-full px-3 py-2 text-left flex items-center justify-between
                    hover:bg-blue-50 focus:bg-blue-50 focus:outline-none
                    ${lang === currentLanguage ? 'bg-blue-100 text-blue-900' : 'text-gray-700'}
                    ${isRTL ? 'flex-row-reverse text-right' : ''}
                  `}
                >
                  <div className="flex items-center">
                    {renderFlag(lang)}
                    {renderLanguageName(lang)}
                  </div>
                  {lang === currentLanguage && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </button>
    );
  }

  if (variant === 'menu') {
    return (
      <div className={`space-y-1 ${className}`}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('language.selector.title')}
        </label>
        {availableLanguages.map((lang) => (
          <button
            key={lang}
            onClick={() => handleLanguageSelect(lang)}
            onKeyDown={(e) => handleKeyDown(e, lang)}
            disabled={disabled}
            className={`
              w-full px-3 py-2 text-left flex items-center justify-between rounded-md
              transition-colors duration-200
              ${lang === currentLanguage 
                ? 'bg-blue-100 text-blue-900 border-blue-200' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }
              border focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isRTL ? 'flex-row-reverse text-right' : ''}
            `}
            aria-label={t('language.selector.change', { 
              language: LANGUAGE_CONFIGS[lang].nativeName 
            })}
          >
            <div className="flex items-center">
              {renderFlag(lang)}
              {renderLanguageName(lang)}
            </div>
            {lang === currentLanguage && (
              <Check className="w-4 h-4 text-blue-600" />
            )}
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div ref={selectRef} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => handleKeyDown(e)}
        disabled={disabled}
        className={`
          inline-flex items-center justify-between px-4 py-2 bg-white border border-gray-300
          rounded-md shadow-sm text-sm font-medium text-gray-700
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed min-w-[150px]
          ${isRTL ? 'flex-row-reverse' : ''}
        `}
        aria-label={t('language.selector.current', { 
          language: LANGUAGE_CONFIGS[currentLanguage].nativeName 
        })}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center">
          {renderFlag(currentLanguage)}
          {renderLanguageName(currentLanguage)}
        </div>
        <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`
          absolute top-full mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-50
          max-h-60 overflow-auto
          ${isRTL ? 'right-0' : 'left-0'}
        `}>
          <div role="listbox" aria-label={t('language.selector.title')}>
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageSelect(lang)}
                onKeyDown={(e) => handleKeyDown(e, lang)}
                role="option"
                aria-selected={lang === currentLanguage}
                className={`
                  w-full px-4 py-3 text-left flex items-center justify-between
                  hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors
                  ${lang === currentLanguage ? 'bg-blue-100 text-blue-900' : 'text-gray-700'}
                  ${isRTL ? 'flex-row-reverse text-right' : ''}
                `}
              >
                <div className="flex items-center">
                  {renderFlag(lang)}
                  {renderLanguageName(lang)}
                </div>
                {lang === currentLanguage && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Simple language toggle for two languages
 */
export interface LanguageToggleProps {
  primaryLanguage: SupportedLanguage;
  secondaryLanguage: SupportedLanguage;
  className?: string;
  onLanguageChange?: (language: SupportedLanguage) => void;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  primaryLanguage,
  secondaryLanguage,
  className = '',
  onLanguageChange
}) => {
  const { language: currentLanguage, setLanguage, t } = useTranslation();
  const { announceLanguageChange } = useAccessibilityAnnouncements();

  const handleToggle = () => {
    const newLanguage = currentLanguage === primaryLanguage ? secondaryLanguage : primaryLanguage;
    setLanguage(newLanguage);
    
    const languageName = LANGUAGE_CONFIGS[newLanguage].nativeName;
    announceLanguageChange(languageName);
    
    onLanguageChange?.(newLanguage);
  };

  const isSecondary = currentLanguage === secondaryLanguage;
  
  return (
    <button
      onClick={handleToggle}
      className={`
        inline-flex items-center px-3 py-2 text-sm font-medium rounded-md
        bg-gray-100 text-gray-700 hover:bg-gray-200 
        focus:outline-none focus:ring-2 focus:ring-blue-500
        transition-colors duration-200
        ${className}
      `}
      aria-label={t('language.selector.change', { 
        language: LANGUAGE_CONFIGS[isSecondary ? primaryLanguage : secondaryLanguage].nativeName 
      })}
    >
      <Globe className="w-4 h-4 mr-2" />
      {LANGUAGE_CONFIGS[currentLanguage].code.toUpperCase()}
      <span className="mx-2">⇌</span>
      {LANGUAGE_CONFIGS[isSecondary ? primaryLanguage : secondaryLanguage].code.toUpperCase()}
    </button>
  );
};

export default LanguageSelector;
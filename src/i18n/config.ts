/**
 * i18n Configuration
 * Multi-language support for English and Swahili
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enCommon from './locales/en/common.json';
import enMessaging from './locales/en/messaging.json';
import enRequests from './locales/en/requests.json';
import enFeedback from './locales/en/feedback.json';
import enAnnouncements from './locales/en/announcements.json';

import swCommon from './locales/sw/common.json';
import swMessaging from './locales/sw/messaging.json';
import swRequests from './locales/sw/requests.json';
import swFeedback from './locales/sw/feedback.json';
import swAnnouncements from './locales/sw/announcements.json';

const resources = {
  en: {
    common: enCommon,
    messaging: enMessaging,
    requests: enRequests,
    feedback: enFeedback,
    announcements: enAnnouncements
  },
  sw: {
    common: swCommon,
    messaging: swMessaging,
    requests: swRequests,
    feedback: swFeedback,
    announcements: swAnnouncements
  }
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'messaging', 'requests', 'feedback', 'announcements'],

    interpolation: {
      escapeValue: false // React already escapes values
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },

    react: {
      useSuspense: false
    }
  });

export default i18n;

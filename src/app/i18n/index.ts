import am from './translations/am';
import en from './translations/en';

export type Language = 'en' | 'am';
export type TranslationParams = Record<string, string | number>;

export const DEFAULT_LANGUAGE: Language = 'en';
export const LANGUAGE_STORAGE_KEY = 'epl-language';

export const translations: Record<Language, Record<string, string>> = {
  en: { ...en },
  am: { ...am },
};

export function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template;

  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

export function formatRelativeTime(
  dateString: string,
  t: (key: string, params?: TranslationParams) => string,
  language: Language,
) {
  try {
    const utcDate =
      dateString.includes('Z') || dateString.includes('+')
        ? new Date(dateString)
        : new Date(`${dateString}Z`);

    const now = new Date();
    const diffMs = now.getTime() - utcDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('Just now');
    if (diffMins < 60) return t(diffMins === 1 ? '{{count}} minute ago' : '{{count}} minutes ago', { count: diffMins });
    if (diffHours < 24) return t(diffHours === 1 ? '{{count}} hour ago' : '{{count}} hours ago', { count: diffHours });
    if (diffDays < 7) return t(diffDays === 1 ? '{{count}} day ago' : '{{count}} days ago', { count: diffDays });

    return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US').format(utcDate);
  } catch {
    return t('Recently');
  }
}

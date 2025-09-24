import { ui, defaultLang } from './ui';

export function useTranslationsReact(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  }
}

export function getLangFromUrlReact(url: string) {
  const [, lang] = url.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

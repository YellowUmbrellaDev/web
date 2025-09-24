import { ui, defaultLang, routes } from './ui';

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  }
}

export function useTranslatedPath(lang: keyof typeof ui) {
  return function translatePath(path: string, targetLang: string = lang) {
    // Si es la página de inicio
    if (!path || path === '/' || path === '') {
      return `/${targetLang}/`;
    }
    
    // Remover el slash inicial si existe
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Si el path está vacío después de limpiar, es página de inicio
    if (!cleanPath) {
      return `/${targetLang}/`;
    }
    
    // Verificar si necesita traducción de ruta
    if (routes[targetLang] && routes[targetLang][cleanPath]) {
      const translatedRoute = routes[targetLang][cleanPath];
      return `/${targetLang}/${translatedRoute}`;
    }
    
    // Si no hay traducción, usar el path original
    return `/${targetLang}/${cleanPath}`;
  }
}

export function getRouteFromUrl(url: URL): string | undefined {
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean); // Remover elementos vacíos
  
  if (parts.length === 0) {
    return ''; // página de inicio
  }
  
  // Si el primer elemento es un código de idioma, omítelo
  const currentLang = getLangFromUrl(url);
  if (parts[0] === currentLang) {
    parts.shift(); // Remover el código de idioma
  }
  
  // Si no hay más partes, es la página de inicio
  if (parts.length === 0) {
    return '';
  }
  
  // Devolver la última parte como la ruta actual
  return parts[parts.length - 1];
}

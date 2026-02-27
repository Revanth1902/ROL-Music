import Cookies from 'js-cookie';

export const setLanguageCookie = (lang) => Cookies.set('rol_lang', lang, { expires: 365 });
export const getLanguageCookie = () => Cookies.get('rol_lang');
export const removeLanguageCookie = () => Cookies.remove('rol_lang');

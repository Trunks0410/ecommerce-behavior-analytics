export const formatViewCount = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }

  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }

  return num.toString();
};

export const getCurrentLocale = (): string => {
  if (typeof document !== 'undefined') {
    const language = document.documentElement.getAttribute('data-language') || document.documentElement.lang;
    if (language === 'en') return 'en-US';
    if (language === 'vi') return 'vi-VN';
  }

  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem('meemart_language');
    if (saved === 'en') return 'en-US';
    if (saved === 'vi') return 'vi-VN';
  }

  return 'vi-VN';
};

export const formatPrice = (price: number): string => {
  const locale = getCurrentLocale();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export const getAvatarUrl = (url: string | undefined | null) => {
   if (!url) return "";
   if (url.startsWith("http")) return url;
   const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8088";
   return `${baseUrl}${url}`;
};


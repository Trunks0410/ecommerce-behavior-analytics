export const formatViewCount = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }

  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }

  return num.toString();
};

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', {
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


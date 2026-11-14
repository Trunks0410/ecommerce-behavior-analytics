/**
 * Dịch vụ điều khiển Google Translate Engine tự động toàn trang (Option A)
 * Cho phép tự động chuyển đổi toàn bộ DOM (bao gồm cả text trong JSX và dữ liệu DB)
 * mà không hiển thị thanh công cụ khó chịu của Google.
 */

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

let isInitialized = false;

/**
 * Khởi tạo engine Google Translate ngầm
 */
export const initGoogleTranslate = (): void => {
  if (typeof window === "undefined" || isInitialized) return;

  // Tạo container ẩn nếu chưa có
  if (!document.getElementById("google_translate_element")) {
    const div = document.createElement("div");
    div.id = "google_translate_element";
    div.style.display = "none";
    document.body.appendChild(div);
  }

  // Định nghĩa callback khởi tạo
  window.googleTranslateElementInit = () => {
    try {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "vi",
            includedLanguages: "en,vi",
            autoDisplay: false,
          },
          "google_translate_element"
        );
      }
    } catch (e) {
      console.warn("Lỗi khởi tạo Google Translate:", e);
    }
  };

  // Nạp script Google Translate
  const scriptId = "google-translate-script";
  if (!document.getElementById(scriptId)) {
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }

  isInitialized = true;
};

/**
 * Thiết lập cookie googtrans để Google Translate nhận diện ngôn ngữ
 */
const setGoogleTranslateCookie = (lang: "vi" | "en") => {
  const cookieValue = lang === "en" ? "/vi/en" : "/vi/vi";
  const domain = window.location.hostname;

  document.cookie = `googtrans=${cookieValue}; path=/;`;
  document.cookie = `googtrans=${cookieValue}; path=/; domain=${domain};`;

  if (domain.includes(".")) {
    const rootDomain = domain.substring(domain.indexOf("."));
    document.cookie = `googtrans=${cookieValue}; path=/; domain=${rootDomain};`;
  }
};

/**
 * Kích hoạt chuyển đổi ngôn ngữ DOM toàn trang
 */
export const switchDOMTranslation = (targetLang: "vi" | "en"): void => {
  if (typeof window === "undefined") return;

  setGoogleTranslateCookie(targetLang);

  // Thử kích hoạt trực tiếp select combo của Google nếu đã sẵn sàng
  const selectBox = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (selectBox) {
    selectBox.value = targetLang;
    selectBox.dispatchEvent(new Event("change"));
  } else {
    // Nếu selectBox chưa load, thử lại sau 300ms
    setTimeout(() => {
      const retrySelect = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (retrySelect) {
        retrySelect.value = targetLang;
        retrySelect.dispatchEvent(new Event("change"));
      }
    }, 400);
  }
};

export default {
  initGoogleTranslate,
  switchDOMTranslation,
};


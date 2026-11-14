import { MapPin, Phone, Mail, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/shared/context/LanguageContext";

const FacebookIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const TwitterIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const YoutubeIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const Footer = () => {
  const { t, language } = useLanguage();

  return (
    <footer className="w-full bg-[#fbfbfb] dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 text-xs">
      {/* 4 Main Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Chăm sóc khách hàng */}
          <div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100 uppercase mb-4">
              {t("customer_care")}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/blogs" className="hover:text-[#ee4d2d] transition-colors">
                  {t("help_center")}
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:text-[#ee4d2d] transition-colors">
                  {t("meemart_blog")}
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:text-[#ee4d2d] transition-colors">
                  {t("shopping_guide")}
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:text-[#ee4d2d] transition-colors">
                  {t("payment_guide")}
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:text-[#ee4d2d] transition-colors">
                  {t("shipping_guide")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Về MeeMart */}
          <div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100 uppercase mb-4">
              {t("about_meemart")}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/blogs" className="hover:text-[#ee4d2d] transition-colors">
                  {t("about_us")}
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:text-[#ee4d2d] transition-colors">
                  {t("careers")}
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:text-[#ee4d2d] transition-colors">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:text-[#ee4d2d] transition-colors">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:text-[#ee4d2d] transition-colors">
                  {t("media_contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Liên hệ */}
          <div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100 uppercase mb-4">
              {t("contact")}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="text-[#ee4d2d] shrink-0 mt-0.5" />
                <span>{t("address_text")}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-[#ee4d2d] shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-slate-200">
                  {t("hotline")}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-[#ee4d2d] shrink-0" />
                <span>support@meemart.vn</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Kết nối với chúng tôi */}
          <div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100 uppercase mb-4">
              {t("connect_with_us")}
            </h4>
            <div className="flex items-center space-x-3 mb-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-[#ee4d2d] hover:text-white flex items-center justify-center transition-colors text-gray-700 dark:text-slate-200"
                title="Facebook"
              >
                <FacebookIcon size={16} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-[#ee4d2d] hover:text-white flex items-center justify-center transition-colors text-gray-700 dark:text-slate-200"
                title="Instagram"
              >
                <InstagramIcon size={16} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-[#ee4d2d] hover:text-white flex items-center justify-center transition-colors text-gray-700 dark:text-slate-200"
                title="Twitter / X"
              >
                <TwitterIcon size={15} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-[#ee4d2d] hover:text-white flex items-center justify-center transition-colors text-gray-700 dark:text-slate-200"
                title="YouTube"
              >
                <YoutubeIcon size={16} />
              </a>
            </div>

            <Link
              to="/blogs"
              className="inline-flex items-center gap-1.5 text-[#ee4d2d] hover:underline font-medium mt-2"
            >
              <HelpCircle size={15} />
              <span>{t("faq")}</span>
            </Link>
          </div>
        </div>

        {/* Bottom Copyright Notice */}
        <div className="border-t border-gray-200 dark:border-slate-800 mt-10 pt-6 text-center space-y-1 text-gray-500 dark:text-slate-500 text-[11px]">
          <p>{t("copyright")}</p>
          <p>{t("office_address")}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

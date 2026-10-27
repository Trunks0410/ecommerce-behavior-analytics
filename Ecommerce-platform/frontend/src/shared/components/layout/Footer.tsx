import { ShoppingBag, Send } from "lucide-react";
import { Link } from "react-router-dom";

// Custom Social Icons
const FacebookIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

const InstagramIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);

const XIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>
);

const Footer = () => {
  return (
    <footer className="w-full bg-white border-t border-black/10 mt-32">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          {/* Brand Info */}
          <div className="space-y-8">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-primary text-white border-2 border-black/10 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:border-black transition-all shadow-sm">
                <ShoppingBag size={24} strokeWidth={2.5} />
              </div>
              <span className="font-serif text-2xl font-black text-primary uppercase group-hover:text-black transition-colors">UTEShop</span>
            </Link>
            <p className="text-sm font-bold text-gray-500 leading-relaxed max-w-xs">
              Nâng tầm phong cách cá nhân với những thiết kế tối giản và hiện đại từ UTEShop.
            </p>
            <div className="flex space-x-4">
              {[
                { icon: <FacebookIcon />, href: "#" },
                { icon: <InstagramIcon />, href: "#" },
                { icon: <XIcon />, href: "#" }
              ].map((social, i) => (
                <a key={i} href={social.href} className="w-11 h-11 bg-white border border-black/10 rounded-xl flex items-center justify-center text-black hover:bg-primary hover:text-white transition-all shadow-sm hover:shadow-subtle hover:-translate-y-1">
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest mb-8 pb-2 border-b border-black/10 w-fit">Mua sắm</h4>
            <ul className="space-y-4">
              {["Thời trang Nam", "Thời trang Nữ", "Phụ kiện", "Bộ sưu tập"].map((link) => (
                <li key={link}>
                  <Link to="/products" className="text-sm font-bold text-gray-500 hover:text-primary transition-colors">{link}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest mb-8 pb-2 border-b border-black/10 w-fit">Hỗ trợ</h4>
            <ul className="space-y-4">
              {["Chính sách đổi trả", "Hướng dẫn chọn size", "Câu hỏi thường gặp", "Liên hệ"].map((link) => (
                <li key={link}>
                  <Link to="#" className="text-sm font-bold text-gray-500 hover:text-primary transition-colors">{link}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-8">
            <h4 className="font-black text-xs uppercase tracking-widest mb-8 pb-2 border-b border-black/10 w-fit">Bản tin</h4>
            <form className="relative">
              <input
                type="email"
                placeholder="Email của bạn"
                className="input-brutal h-14 pr-16"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 w-11 bg-black text-white rounded-lg flex items-center justify-center border border-black hover:bg-primary transition-all shadow-sm"
              >
                <Send size={18} strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-black/10 mt-20 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            © 2024 UTEShop. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-8">
             <span className="text-[10px] font-black uppercase tracking-widest text-black cursor-pointer hover:text-primary transition-colors">Privacy Policy</span>
             <span className="text-[10px] font-black uppercase tracking-widest text-black cursor-pointer hover:text-primary transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

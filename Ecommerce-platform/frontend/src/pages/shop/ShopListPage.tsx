import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Store, Star, Users, MapPin } from "lucide-react";
import vendorService from "@/services/vendorService";

const ShopListPage = () => {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("search") || "";
  
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchShops = async () => {
      setLoading(true);
      try {
        const response = await vendorService.getAllShops({ search: keyword, page: 1, limit: 50 });
        setShops(response.data.shops || []);
      } catch (err: any) {
        console.error("Error fetching shops:", err);
        setError("Có lỗi xảy ra khi tải danh sách Shop.");
      } finally {
        setLoading(false);
      }
    };
    fetchShops();
  }, [keyword]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 flex items-center justify-center gap-3">
          <Store className="w-8 h-8 text-primary" />
          {keyword ? `KẾT QUẢ TÌM KIẾM SHOP: "${keyword}"` : "TẤT CẢ CÁC SHOP"}
        </h1>
        <p className="text-gray-500 font-medium">Khám phá các gian hàng uy tín trên UTEShop</p>
      </div>

      {error ? (
        <div className="text-center text-red-500 py-10 bg-red-50 rounded-2xl border border-red-100">
          <p>{error}</p>
        </div>
      ) : shops.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-400">Không tìm thấy Shop nào!</h2>
          <p className="text-gray-500 mt-2">Vui lòng thử lại với từ khóa khác.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {shops.map((shop) => (
            <Link
              key={shop.id}
              to={`/shop/${shop.id}`}
              className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-premium transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full"
            >
              {/* Cover Image */}
              <div className="h-32 bg-gray-200 relative overflow-hidden">
                <img
                  src={shop.cover_url || "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000"}
                  alt="cover"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
              </div>

              {/* Avatar & Info */}
              <div className="px-6 pb-6 pt-0 relative flex-1 flex flex-col">
                <div className="flex justify-center -mt-10 mb-4 relative z-10">
                  <div className="w-20 h-20 bg-white p-1 rounded-full shadow-md">
                    <img
                      src={shop.avatar_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent(shop.shop_name)}
                      alt={shop.shop_name}
                      className="w-full h-full rounded-full object-cover border border-gray-100"
                    />
                  </div>
                </div>

                <div className="text-center mb-4 flex-1">
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                    {shop.shop_name}
                  </h3>
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>TP. Hồ Chí Minh</span> {/* Mock data, có thể update API sau */}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 mt-auto">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-bold">{Number(shop.rating || 0).toFixed(1)}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Đánh giá</span>
                  </div>
                  <div className="text-center border-l border-gray-100">
                    <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="font-bold">{shop.followers_count || 0}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Người theo dõi</span>
                  </div>
                </div>
                
                <div className="mt-4 w-full">
                  <button className="w-full py-2 bg-gray-50 hover:bg-primary hover:text-white text-primary rounded-lg text-xs font-black uppercase tracking-widest transition-colors border border-primary/20 hover:border-primary">
                    Xem Shop
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopListPage;

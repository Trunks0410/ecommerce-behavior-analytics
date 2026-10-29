import { Star, Camera, Video, ThumbsUp, ThumbsDown, Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const ReviewPage = () => {
  const [rating, setRating] = useState(5);
  
  return (
    <div className="min-h-screen bg-[#F4F4F0] pt-24 pb-32 px-6">
      <div className="max-w-4xl mx-auto">
        <Link to="/orders" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all mb-8">
           <ArrowLeft size={16} /> Quay lại đơn hàng
        </Link>

        <div className="bg-white border-2 border-black rounded-[3rem] p-12 shadow-brutal relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full flex items-center justify-center p-4">
            <MessageSquare className="text-primary rotate-12" size={40} />
          </div>

          <div className="relative z-10">
            <div className="mb-12">
              <h1 className="text-4xl font-serif font-black tracking-tighter uppercase mb-3">Đánh giá trải nghiệm</h1>
              <p className="text-gray-500 font-medium max-w-lg">Cảm ơn bạn đã tin tưởng UTEShop. Những nhận xét của bạn sẽ giúp chúng tôi hoàn thiện hơn mỗi ngày.</p>
            </div>

            <div className="space-y-12">
              {/* Section 1: Product Rating */}
              <div className="space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-24 bg-gray-50 rounded-xl overflow-hidden border-2 border-black/5 flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=200" alt="Product" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-1">Đang đánh giá sản phẩm</h3>
                    <p className="text-xl font-black">Heritage Jacket - Vintage Edition</p>
                  </div>
                </div>

                <div className="p-8 bg-gray-50/50 rounded-3xl border-2 border-black/5 border-dashed space-y-6">
                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest mb-4">Chất lượng sản phẩm</p>
                    <div className="flex justify-center gap-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                          key={star}
                          onClick={() => setRating(star)}
                          className={`transition-all active:scale-90 ${star <= rating ? 'text-yellow-400 scale-110' : 'text-gray-200 hover:text-yellow-200'}`}
                        >
                          <Star size={40} fill={star <= rating ? "currentColor" : "none"} strokeWidth={2.5} />
                        </button>
                      ))}
                    </div>
                    <p className="mt-4 text-xs font-bold text-primary italic uppercase tracking-widest">
                      {rating === 5 ? 'Tuyệt vời!' : rating === 4 ? 'Hài lòng' : rating === 3 ? 'Bình thường' : 'Chưa tốt'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nhận xét chi tiết</label>
                    <textarea 
                      rows={4} 
                      placeholder="Hãy chia sẻ cảm nhận của bạn về chất liệu, form dáng, màu sắc..." 
                      className="w-full bg-white border-2 border-black rounded-2xl px-6 py-5 font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-black/20 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group">
                      <Camera className="text-gray-400 group-hover:text-primary" size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary">Thêm hình ảnh</span>
                    </button>
                    <button className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-black/20 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group">
                      <Video className="text-gray-400 group-hover:text-primary" size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary">Thêm Video</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: Service Rating */}
              <div className="space-y-6 pt-12 border-t border-gray-100">
                <h3 className="text-lg font-black uppercase tracking-tighter">Đánh giá dịch vụ & vận chuyển</h3>
                
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-sm font-bold uppercase tracking-widest text-gray-500">Tốc độ giao hàng</span>
                    <div className="flex gap-2">
                      {['Tệ', 'Bình thường', 'Tốt'].map((tag) => (
                        <button key={tag} className={`px-4 py-2 rounded-full border-2 border-black text-[10px] font-black uppercase tracking-widest transition-all ${tag === 'Tốt' ? 'bg-black text-white' : 'bg-white hover:bg-primary/10'}`}>
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-sm font-bold uppercase tracking-widest text-gray-500">Đóng gói sản phẩm</span>
                    <div className="flex gap-2">
                      {['Tệ', 'Bình thường', 'Tốt'].map((tag) => (
                        <button key={tag} className={`px-4 py-2 rounded-full border-2 border-black text-[10px] font-black uppercase tracking-widest transition-all ${tag === 'Tốt' ? 'bg-black text-white' : 'bg-white hover:bg-primary/10'}`}>
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-12">
                <button className="w-full btn-brutal py-6 text-sm flex items-center justify-center gap-3 shadow-brutal active:shadow-none active:translate-x-[4px] active:translate-y-[4px]">
                   GỬI ĐÁNH GIÁ NGAY <Send size={18} />
                </button>
                <p className="text-center mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                   Bạn sẽ nhận được <span className="text-primary">+200 điểm UTEShop</span> sau khi đánh giá thành công
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;

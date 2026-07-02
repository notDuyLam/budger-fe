import Link from "next/link";
import { Wallet, Sparkles, Receipt, ArrowRight, ShieldCheck, TrendingUp, HelpCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight text-white bg-clip-text">
              Budger
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Tính năng</a>
            <a href="#workflow" className="hover:text-emerald-400 transition-colors">Cách hoạt động</a>
            <a href="#security" className="hover:text-emerald-400 transition-colors">Bảo mật</a>
          </nav>

          <div>
            <Link 
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 hover:shadow-emerald-400/30 transition-all duration-200"
            >
              Vào Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto max-w-7xl px-6 pt-20 pb-24 text-center lg:pt-32">
        <div className="mx-auto max-w-3xl">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 mb-8 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Trợ lý tài chính AI thông minh</span>
          </div>

          {/* Heading */}
          <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-6xl text-white leading-none">
            Quản lý tài chính cá nhân{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
              thông minh & tối giản
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg leading-8 text-slate-400">
            Không còn mệt mỏi khi phải ghi chép từng khoản thu chi. Trò chuyện trực tiếp với AI của chúng tôi để tự động ghi chép giao dịch, phân tích tài chính và tối ưu hoá số dư trong nháy mắt.
          </p>

          {/* Actions */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex w-full sm:w-auto h-12 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-base font-semibold text-slate-950 shadow-xl shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition-all duration-200 group"
            >
              Trải nghiệm ngay
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#features"
              className="inline-flex w-full sm:w-auto h-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-3 text-base font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Tìm hiểu thêm
            </a>
          </div>
        </div>

        {/* Feature Grid */}
        <section id="features" className="mt-32 scroll-mt-20">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Tính năng nổi bật
            </h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              Mọi công cụ cần thiết giúp bạn làm chủ ví tiền của mình, được hỗ trợ đắc lực bởi trí tuệ nhân tạo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 */}
            <div className="relative group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/80">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-6">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Ghi chép giao dịch bằng AI</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Chỉ cần gõ: &quot;Ăn trưa hết 50k trả bằng Momo&quot;, AI sẽ tự động phân loại, chọn đúng ví và cập nhật số dư cho bạn.
              </p>
            </div>

            {/* Card 2 */}
            <div className="relative group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/80">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mb-6">
                <Wallet className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Quản lý đa ví linh hoạt</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Theo dõi đồng thời tài khoản ngân hàng, ví điện tử và tiền mặt tại một nơi duy nhất. Luôn biết chính xác bạn đang có bao nhiêu tiền.
              </p>
            </div>

            {/* Card 3 */}
            <div className="relative group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/80">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 mb-6">
                <Receipt className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Đồng bộ & Quản lý nợ</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Quản lý các khoản đi vay, cho vay và nhắc nhở trả nợ. Tự động đồng bộ số dư ví tương ứng khi thực hiện thanh toán nợ.
              </p>
            </div>

            {/* Card 4 */}
            <div className="relative group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/80">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-6">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Báo cáo trực quan</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Biểu đồ tròn trực quan hiển thị cơ cấu chi tiêu của bạn theo từng danh mục. Giúp bạn nhận diện những khoản chi tiêu lãng phí dễ dàng.
              </p>
            </div>

            {/* Card 5 */}
            <div className="relative group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/80">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 mb-6">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Bảo mật cấp độ cao</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Xác thực người dùng tích hợp của Supabase. Dữ liệu của bạn được cô lập an toàn bằng chính sách phân quyền Row Level Security (RLS).
              </p>
            </div>

            {/* Card 6 */}
            <div className="relative group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/80">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 mb-6">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sử dụng dễ dàng</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Được thiết kế tối ưu trên giao diện di động (Mobile-first). Trải nghiệm vuốt chạm mượt mà như ứng dụng di động bản địa.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-8 mt-24">
        <div className="container mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} Budger App. Mọi quyền được bảo lưu.
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-300">Điều khoản</a>
            <a href="#" className="hover:text-slate-300">Bảo mật</a>
            <a href="#" className="hover:text-slate-300">Liên hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

## 🛠️ KẾ HOẠCH TRIỂN KHAI CHI TIẾT (DEVELOPMENT PLAN)

### Giai đoạn 1: Thiết lập Hạ tầng & Khung xương Dự án (Init & Infrastructure) - [Đã hoàn thành]

*Mục tiêu: Cài đặt source code local, khởi tạo database trên Supabase và cấu hình kết nối an toàn.*

- [x] **Khởi tạo Next.js Project:**
    - [x] Setup dự án Next.js mới sử dụng App Router, TypeScript và Tailwind CSS.
    - [x] Cài đặt thư viện UI nền tảng: `shadcn/ui`, `lucide-react`.
- [x] **Thiết lập Supabase Cloud:**
    - [x] Khởi tạo Project mới trên Supabase Dashboard.
    - [x] Chạy Script SQL để tạo cấu trúc các bảng cốt lõi (`wallets`, `categories`, `debt_partners`, `transactions`).
    - [x] Bật tính năng **Row Level Security (RLS)** trên tất cả các bảng.
- [x] **Quản lý Biến Môi Trường (.env.local):**
    - [x] Cấu hình các key kết nối: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, và `GEMINI_API_KEY`.

### Giai đoạn 2: Thiết kế Giao diện (UI/UX Design & Layout) - [Đã hoàn thành]

> 💡 **Lưu ý đặc biệt:** Giai đoạn này AI đóng vai trò là cộng sự tư vấn, gợi ý layout và cấu trúc component. **AI không tự cô lập cài đặt một mình** mà sẽ làm việc, chỉnh sửa và tối ưu hóa dựa trên phản hồi trực tiếp từ bạn qua từng màn hình.
> 
- [x] **Cấu hình Theme & Layout Chung (Responsive & Light/Dark Mode):**
    - [x] Dựng Layout responsive hoàn chỉnh (màn hình di động hiển thị dọc kèm Bottom Nav, màn hình PC hiển thị rộng rãi và mở rộng Sidebar sang bên trái).
    - [x] Thiết lập hệ thống Navigation: **Bottom Navigation Bar** cho Mobile và **Sidebar** cố định/ẩn hiện linh hoạt cho PC.
    - [x] Tích hợp nút toggle và logic chuyển đổi Light/Dark Theme mượt mà, lưu tùy chọn trong `localStorage` cho toàn bộ trang (kể cả Landing page).
    - [x] Chuyển đổi toàn bộ ngôn ngữ giao diện sang **100% tiếng Anh** và nâng cấp typography với các font chữ chuyên nghiệp (**Plus Jakarta Sans** & **Lexend**).
- [x] **Xây dựng 4 Màn hình Core kèm dữ liệu giả lập (Mock data) tương tác cao:**
    - [x] **Màn 1: Dashboard:** Layout thẻ Net Worth, danh sách ví (cuộn ngang trên mobile, grid 2 cột cân đối trên PC), danh sách giao dịch gần đây (kèm note), và nút FAB chuyển nhanh sang AI Assistant.
    - [x] **Màn 2: Transactions & AI Chat:** Component phân tách 2 Tab (History / AI Assistant). Thiết kế sẵn UI mẫu cho `Confirmation Card` (tích hợp trường Note và tự động để trống Note mặc định nếu AI không bóc tách được). Tích hợp form modal để tạo mới, chỉnh sửa, hoặc xóa giao dịch thủ công.
    - [x] **Màn 3: Debt Management:** Giao diện quản lý sổ nợ (Lent / Borrowed), danh sách đối tác nợ, và cấu trúc Modal/Bottom sheet chi tiết lịch sử từng người (tag Paid, Unpaid, Overdue).
    - [x] **Màn 4: Analytics:** Thiết kế biểu đồ donut tròn SVG tương tác lọc danh mục và biểu đồ cột so sánh SVG (sửa lỗi hiển thị trên mobile).


### Giai đoạn 3: Xác thực & Quản lý Luồng Dữ liệu Cơ bản (Auth & CRUD Operations) - [Đã hoàn thành]

*Mục tiêu: Kết nối giao diện với cơ sở dữ liệu thật qua Supabase.*

- [x] **Tích hợp Supabase Auth:**
    - [x] Xây dựng luồng Đăng nhập/Đăng ký (Sử dụng Email/Password).
    - [x] Viết Proxy (Middleware) bảo vệ các route (nếu chưa đăng nhập sẽ redirect về trang login, tuân thủ tiêu chuẩn Next.js 16).
- [x] **Triển khai CRUD Nghiệp vụ:**
    - [x] **Ví & Danh mục:** Tạo cơ chế tự động khởi tạo 1 ví mặc định khi user mới đăng ký. Cho phép thêm/sửa ví và danh mục thu chi.
    - [x] **Quản lý giao dịch thủ công:** Người dùng có thể tạo, xóa, và sửa các giao dịch Thu/Chi trực tiếp trên UI (Cập nhật real-time vào bảng `transactions` và trigger cộng/trừ số dư ở bảng `wallets`).


### Giai đoạn 4: Tích hợp Trí tuệ Nhân tạo (AI Integration) - [Đã hoàn thành]

*Mục tiêu: Hiện thực hóa tính năng "Chat để lưu giao dịch" bằng LLM, hỗ trợ phân tích nợ và xoay vòng nhiều key.*

- [x] **Xây dựng Route Handler (Backend API):**
    - Tạo API endpoint (`/api/chat`) tích hợp mô hình **Gemini 2.5 Flash**.
    - Cài đặt cơ chế xoay vòng nhiều API Key trong biến môi trường `GEMINI_API_KEY` (cách nhau bởi dấu phẩy) giúp tự động phát hiện lỗi và failover sang key kế tiếp mà không ảnh hưởng tới trải nghiệm người dùng.
    - Cấu hình Prompt và gán JSON Schema ép model bắt buộc trả về đúng cấu trúc dữ liệu bao gồm: Loại giao dịch (`INCOME`, `EXPENSE`, `DEBT_LENT`, `DEBT_BORROWED`), số tiền, tài khoản ví, danh mục chi tiêu, ghi chú và đối tác nợ.
- [x] **Xử lý Luồng Giao tiếp UI-AI:**
    - Truyền danh sách ví, danh mục hiện có và đối tác nợ từ Client lên API để AI thực hiện ánh xạ tối ưu nhất.
    - Nhận dữ liệu JSON từ Gemini, hiển thị đầy đủ thông tin bóc tách được (bao gồm badge loại nợ và tên đối tác nợ) lên thẻ `Confirmation Card`.
    - Xử lý sự kiện nút **Lưu** (Insert dữ liệu nợ với trạng thái `PENDING` và tự động tạo mới đối tác nợ trong bảng `debt_partners` nếu chưa tồn tại) và nút **Hủy** để tiếp tục hội thoại.

### Giai đoạn 5: Logic Nghiệp vụ Nâng cao & Báo cáo (Debt Logic & Analytics) - [Đã hoàn thành]

*Mục tiêu: Hoàn thiện các luồng xử lý phức tạp còn lại.*

- [x] **Xử lý Logic Nợ (Debt Syncing & Repayments):**
    - [x] Viết logic tự động trừ/cộng tiền trong ví khi có giao dịch Vay (`DEBT_BORROWED`) hoặc Cho vay (`DEBT_LENT`).
    - [x] Xây dựng luồng Trả nợ (`DEBT_REPAYMENT`): Khi tạo giao dịch trả nợ, hệ thống cập nhật trạng thái của khoản nợ gốc từ `PENDING` sang `COMPLETED` và lưu ID tham chiếu `repaid_by_transaction_id`.
    - [x] **Theo dõi ví trả nợ:** Hỗ trợ hiển thị chuyển đổi ví (ví dụ: `Tiền mặt → Momo`) trong danh sách chi tiết.
    - [x] **Nâng cấp hội thoại tạo đối tác nợ:** Khi AI nhận diện tên đối tác nợ chưa tồn tại, hệ thống hiển thị câu hỏi xác nhận *"Do you want to create a new debt contact...?"* trước khi lưu.
- [x] **Đổ dữ liệu thật vào Biểu đồ (Analytics):**
    - [x] Viết các câu lệnh query lấy dữ liệu Thu/Chi theo khoảng thời gian và vẽ biểu đồ hình tròn/hình cột SVG tương tác.

### Giai đoạn 6: Kiểm thử & Đóng gói Triển khai (Testing & CI/CD Setup)

*Mục tiêu: Đảm bảo ứng dụng chạy mượt mà trên môi trường Production.*

- **Kiểm tra RLS & Bảo mật:** Kiểm thử kỹ càng xem User A có thể xem hoặc can thiệp vào dữ liệu của User B hay không.
- **Thiết lập CI/CD:** * Đẩy mã nguồn lên GitHub.
    - Import project vào Vercel, cấu hình lại toàn bộ Environment Variables trên Vercel Dashboard.
    - Cấu hình URL Redirect cho Supabase Auth để luồng đăng nhập hoạt động chính xác trên domain thật.

---

### Giai đoạn 7: Sửa Lỗi & Tối Ư u Test Phase 2 (Bug Fixes & Changes) - [Ang thực hiện]

*Mục tiêu: Giải quyết toàn bộ lỗi và các yêu cầu thay đổi sau kết quả kiểm thử lần 2.*

#### 7.1. Critical Bug Fixes
- [ ] **Bug 1.1:** Sửa query `transactions` trong Dashboard dùng FK alias rõ ràng (`.select('*, wallets!transactions_wallet_id_fkey(*)')`) để khắp phục lỗi `PGRST201`.
- [ ] **Bug 2.1:** Sửa lỗi reset state về Dashboard khi chuyển tab trình duyệt (kiểm tra `visibilitychange` listener và re-fetch logic trong `AuthProvider`).
- [ ] **Bug 3.1:** Sửa lỗi chữ cùng màu nền trong bộ lọc Analytics (Select component).
- [ ] **Bug 3.2:** Thay thế toàn bộ `console.error` rộ + `alert` bằng **Toast Notification** chuẩn cho luồng AI và Debt Ledger.

#### 7.2. Wallet Business Logic
- [ ] **Logic 1.1:** Đảm bảo khóa số dư âm chỉ áp dụng cho ví thường (không phải Credit Card) - đã có sẵn logic, kiểm tra lại.
- [ ] **Logic 1.2:** Thêm trường `is_balance_masked` vào DB và giao diện chi tiết ví (icon mắt để toggle ẩn/hiện số dư).

#### 7.3. Pagination & Filters Enhancement
- [ ] **Tính năng 2.1:** Kiểm tra phân trang và bộ lọc đầy đủ (Wallet, Type, Category, Partner, Date) trong Transactions History - đã có sẵn, review lại.
- [ ] **Tính năng 2.2:** Click vào ví Dashboard ⇒ redirect sang Transactions với filter wallet đã áp sẵn - đã có sẵn, kiểm tra lại.

#### 7.4. AI Enhancements
- [ ] **AI 3.1:** Thêm `TRANSFER` type vào AI schema và prompt (điền thêm `to_wallet` field).
- [ ] **AI 3.2:** Cải thiện UI lịch sử chat: Nhóm theo **Today / This Week / This Month**, chỉ tải thêm khi user yêu cầu.
- [ ] **AI 3.3:** Đồng bộ `due_date` trên form thủ công (field đã có, đảm bảo hiển thị đúng).
- [ ] **Tính năng 3.4:** Kiểm tra tab Quản lý Category (CRUD + AI suggest icon) đã đủ chức năng chưa.

#### 7.5. Analytics & Account Optimization
- [ ] **Tối ưu 4.1:** Pie Chart đã có toggle Income/Expense - kiểm tra lại.
- [ ] **Tối ưu 4.2:** Tạo **MoneyInputFormatter** reusable component - format số tiền với dấu chấm nghìn.
- [ ] **Tối ưu 4.3:** Loại bỏ tab Account riêng; nén thông tin tài khoản vào Dropdown trên Header.

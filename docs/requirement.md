# **🚀 PRODUCT REQUIREMENT DOCUMENT (PRD) - PERSONAL FINANCE APP**

## **1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)**

- **Mục tiêu:** Ứng dụng quản lý tài chính cá nhân thông minh, tích hợp AI để tối ưu hóa việc ghi chép thu chi và quản lý nợ.
- **Target User:** Thiết kế tối ưu cho 1 user (cá nhân), nhưng database được chuẩn bị sẵn để có thể scale thành Multi-tenant (nhiều user) trong tương lai.
- **Platform:** Web App (Mobile-first approach), UI/UX tập trung tối đa cho trải nghiệm trên trình duyệt điện thoại.

## **2. TECH STACK & INFRASTRUCTURE**

- **Frontend:** Next.js (App Router), React, TypeScript.
- **Styling & UI:** Tailwind CSS, Shadcn/ui (hỗ trợ responsive cực tốt, UI elements như bottom sheet, modal phù hợp cho mobile).
- **State Management/Data Fetching:** SWR hoặc React Query.
- **Backend & Database:** Supabase (PostgreSQL + Authentication + Row Level Security).
- **AI Integration:** Google Gemini API (Gemini 2.5 Flash - tối ưu tốc độ, hỗ trợ structured JSON output và cơ chế tự động xoay vòng/failover nhiều API keys).
- **Hosting:** Vercel (Frontend & Serverless Functions).

## **3. THIẾT KẾ DATABASE (POSTGRESQL - SUPABASE)**

Hệ thống xoay quanh 5 bảng chính. Mặc định luôn có `user_id` để scale về sau.

### **3.1. Bảng `users` (Supabase Auth quản lý)**

- `id` (UUID, Primary Key)
- `email`, `created_at`

### **3.2. Bảng `wallets`**

- `id` (UUID, PK)
- `user_id` (UUID, FK -> users)
- `name` (String) - Vd: Tiền mặt, Momo, VCB (Mặc định tạo 1 ví khi user đăng ký).
- `balance` (Decimal) - Số dư hiện tại. Hỗ trợ giá trị âm (cho phép số dư < 0) để phục vụ cho các loại Ví đặc biệt như Thẻ tín dụng (Credit Card).
- `created_at`, `updated_at`

### **3.3. Bảng `categories`**

- `id` (UUID, PK)
- `user_id` (UUID, FK -> users) - Cho phép user custom.
- `name` (String) - Vd: Ăn uống, Tiền nhà.
- `type` (Enum: `INCOME`, `EXPENSE`)
- `created_at`

### **3.4. Bảng `debt_partners` (Danh bạ người nợ/chủ nợ)**

- `id` (UUID, PK)
- `user_id` (UUID, FK -> users)
- `name` (String)
- `created_at`

### **3.5. Bảng `transactions` (Lưu cả thu chi và biến động nợ)**

- `id` (UUID, PK)
- `user_id` (UUID, FK -> users)
- `wallet_id` (UUID, FK -> wallets)
- `category_id` (UUID, FK -> categories, nullable nếu là transfer/debt)
- `debt_partner_id` (UUID, FK -> debt_partners, nullable)
- `amount` (Decimal) - Số tuyệt đối.
- `type` (Enum: `INCOME`, `EXPENSE`, `TRANSFER`, `DEBT_LENT`, `DEBT_BORROWED`, `DEBT_REPAYMENT`)
- `status` (Enum: `COMPLETED`, `PENDING`) - Dùng cho nợ. `PENDING` là chưa trả, `COMPLETED` là đã thanh toán.
- `due_date` (Timestamp, nullable) - Hạn trả nợ.
- `description` (Text, nullable)
- `repaid_by_transaction_id` (UUID, FK -> transactions, nullable) - Giao dịch trả nợ liên kết.
- `created_at`, `updated_at`

## **4. GIAO DIỆN & PHÂN CHIA MÀN HÌNH (SITEMAP)**

Thiết kế 4 màn hình chính, sử dụng Bottom Navigation Bar trên Mobile và Sidebar trên PC.

### **Màn 1: Dashboard (Tổng quan)**

- **Header:** Tổng tài sản (Sum balance của tất cả ví).
- **Section 1:** Danh sách Ví (Horizontal scroll trên Mobile, Grid 4 cột trên PC). Hiển thị tên ví và số dư.
- **Section 2:** Recent Transactions (5 giao dịch gần nhất, có hiển thị trường Ghi chú/Note nếu có).
- **Action:** Nút FAB (Floating Action Button) cố định góc dưới phải để "Tạo giao dịch/Chat AI".

### **Màn 2: Transactions & AI Chat (Quản lý thu chi)**

- **Cấu trúc:** 2 Tabs chuyển đổi qua lại.
- **Tab 1 - History:**
- **Tab 2 - AI Assistant:**
    - Giao diện Chat UI.
    - Hiển thị **Confirmation Card** ngay trong tin nhắn của AI. Card gồm: `Loại giao dịch`, `Số tiền`, `Ví`, `Phân loại`, và `Ghi chú/Note` (tự động phân tách từ tin nhắn). Kèm 2 nút: `Lưu` hoặc `Hủy`.

### **Màn 3: Debt Management (Quản lý Nợ)**

- **Header:** 2 thông số tổng: `Tổng tiền người ta nợ` & `Tổng tiền mình nợ`.
- **Danh sách:** Group theo `debt_partners`.
- **Chi tiết:** Bấm vào 1 partner mở Modal xem lịch sử nợ/trả của người đó. Các item nợ có Tag trạng thái (Chưa trả, Đã trả, Quá hạn).

### **Màn 4: Analytics (Báo cáo)**

- **Controls:** Chọn khoảng thời gian (Tháng này, Tháng trước, Tuần này).
- **Metrics:** Tổng Thu, Tổng Chi.
- **Charts:**
    - **Pie Chart (Recharts):** Cơ cấu chi tiêu theo Category. Click vào phần trạng thái hiển thị.
    - **Bar Chart:** So sánh Thu / Chi theo từng ngày trong tháng.

## **5. FLOW XỬ LÝ NGHIỆP VỤ (BUSINESS LOGIC)**

### **5.1. Flow tạo giao dịch bằng AI**

1. **Input:** User gõ tin nhắn (VD: "Nay đi siêu thị tiêu bằng thẻ tín dụng hết 500k").
2. **Process:** Client gửi prompt + schema JSON định nghĩa sẵn lên API.
3. **LLM Execution:** Gemini phân tích context, bóc tách thực thể (Amount: 500000, Type: EXPENSE, Wallet: Thẻ tín dụng, Category: Mua sắm).
4. **Confirm:** Trả JSON về UI. Render ra Confirmation Card.
5. **Action:**
    - Nếu chọn `Hủy`: Bỏ qua, user chat tiếp để sửa.
    - Nếu chọn `Lưu`: Gọi hàm Insert DB. Trigger Update Balance của `wallets` tương ứng.

#### **5.1.1. Logic xử lý Ghi chú (Note) khi tạo bằng AI**
- AI sẽ cố gắng bóc tách nội dung ghi chú/memo từ câu lệnh chat của người dùng (Ví dụ các cụm từ sau từ khóa "cho...", "với...", "để...").
- **Mặc định:** Nếu câu lệnh không chứa bất kỳ ngữ cảnh ghi chú cụ thể nào, trường **Note (Ghi chú)** của giao dịch sẽ được **để trống mặc định** (null/empty string) trong thẻ Confirmation Card và khi lưu vào Database. Tuyệt đối không tự động điền các danh mục chung chung.

#### **5.1.2. Logic xử lý Giao dịch Nợ (DEBT_LENT, DEBT_BORROWED) bằng AI**
- **Nhận diện:** AI sẽ tự động phân tách câu lệnh để xác định xem đó có phải là giao dịch vay nợ hay không (ví dụ: "cho anh Huy mượn 150k" -> `DEBT_LENT`, "vay Nam 2 triệu" -> `DEBT_BORROWED`).
- **Trích xuất đối tác nợ (Partner):** AI sẽ bóc tách tên đối tác nợ từ câu lệnh (ví dụ: "Huy", "Nam") và ánh xạ trùng khớp với danh sách đối tác nợ hiện có (`debt_partners`).
- **Lưu trữ:**
  - Nếu tên đối tác chưa có trong hệ thống, hệ thống sẽ tự động khởi tạo bản ghi đối tác nợ mới.
  - Giao dịch nợ sẽ được ghi nhận vào cơ sở dữ liệu với trạng thái mặc định ban đầu là `PENDING` (chưa thanh toán).

#### **5.1.3. Tạo & Chỉnh sửa giao dịch thủ công (Manual Transactions)**
- Hệ thống luôn hỗ trợ người dùng tạo mới hoặc chỉnh sửa/xóa giao dịch thủ công mà không cần qua AI.
- **Tạo mới:** Tại màn hình Lịch sử giao dịch (History Tab), nút "+ Add Transaction" mở Modal Form chứa các trường:
  - `Description/Merchant` (Tiêu đề giao dịch - Bắt buộc)
  - `Amount` (Số tiền - Bắt buộc)
  - `Type` (Loại: Thu, Chi, Cho vay, Đi vay, Trả nợ - Bắt buộc)
  - `Wallet Account` (Tài khoản ví thanh toán - Bắt buộc)
  - `Category` (Danh mục phân loại - Bắt buộc)
  - `Note` (Ghi chú thêm - Tùy chọn)
- **Chỉnh sửa & Xóa:** Người dùng click trực tiếp vào một bản ghi giao dịch trong danh sách Lịch sử để mở lại Modal Form điền sẵn dữ liệu cũ, cho phép cập nhật thông tin hoặc bấm "Delete" để xóa bản ghi đó.
- Lưu trữ: Giao dịch được lưu trực tiếp vào bảng `transactions`, đồng thời trigger cộng/trừ số dư tương ứng của ví trong bảng `wallets`.

### **5.2. Flow xử lý Nợ (Đồng bộ với Ví)**

- **Khi cho vay (LENT):** Tạo record `transactions` type `DEBT_LENT`. Trừ tiền ở ví được chọn.
- **Khi đi vay (BORROWED):** Tạo record `transactions` type `DEBT_BORROWED`. Cộng tiền vào ví được chọn.
- **Khi trả nợ (REPAYMENT):** Tạo record mới type `DEBT_REPAYMENT`. Tìm kiếm khoản nợ gốc PENDING phù hợp để chuyển status thành `COMPLETED` và cập nhật cột `repaid_by_transaction_id` của khoản nợ gốc trỏ đến ID của record trả nợ này. Cập nhật lại số dư ví tương ứng. Nếu giao dịch trả nợ bị xóa, trigger tự động đổi ngược status của khoản nợ gốc về `PENDING`.

### **5.3. Logic xử lý Thẻ tín dụng (Credit Card dưới dạng Ví số dư âm)**

- **Bản chất hệ thống:** Thẻ tín dụng được khởi tạo như một bản ghi trong bảng `wallets`. Số dư ban đầu (`balance`) có thể set bằng `0` (để theo dõi số tiền đang nợ ngân hàng tăng dần) hoặc bằng chính `Hạn mức thẻ` (Vd: 50.000.000đ). Trong tài liệu này, thống nhất chọn giải pháp set bằng `0` và ví sẽ âm dần để phản ánh chính xác nghĩa vụ nợ.
- **Khi chi tiêu qua Thẻ tín dụng:** Tạo một bản ghi trong bảng `transactions` với `type: EXPENSE`, gán `wallet_id` là ID của Ví Thẻ tín dụng, và gán `category_id` tương ứng (Vd: Mua sắm, Ăn uống). Hành động này sẽ trừ tiền trực tiếp vào Ví Thẻ tín dụng khiến số dư của ví này âm xuống (Vd: từ 0đ thành -500.000đ). Luồng này hoàn toàn KHÔNG đi qua bảng `debt_partners` để giữ màn hình Debt sạch sẽ và đảm bảo biểu đồ Analytics quét được chi phí ngay lập tức.
- **Khi thanh toán/đáo hạn Thẻ tín dụng (Trả nợ thẻ):** Bản chất là hành động chuyển tiền giữa các ví. Tạo một bản ghi trong bảng `transactions` with `type: TRANSFER`. Nguồn tiền đi (`from`) là một ví thông thường có số dư dương (Vd: Ví Tiền mặt, Ví VCB, Ví Momo) và đích đến (`to`) là Ví Thẻ tín dụng. Hành động này sẽ làm giảm số dư ví thường và tăng số dư Ví Thẻ tín dụng trở lại (giảm bớt độ âm hoặc về lại mức 0).

## **6. KẾ HOẠCH TRIỂN KHAI (DEPLOYMENT PLAN)**

### **6.1. Quản lý Biến Môi Trường (Environment Variables)**

Hệ thống cần cấu hình chính xác các key giữa các môi trường (Development & Production):

- `NEXT_PUBLIC_SUPABASE_URL`: URL endpoint của dự án Supabase nhằm kết nối Client-side.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: API key công khai mã hóa anon mã để thực hiện các truy vấn an toàn qua cơ chế RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: Key đặc quyền quản trị cấp cao dùng riêng ở Server-side (Route Handler) khi bắt buộc phải bypass cơ chế RLS (Tuyệt đối không để lộ ở Client).
- `GEMINI_API_KEY`: Mã định danh kết nối với Google Gemini API (Mô hình Gemini 2.5 Flash). Hỗ trợ danh sách các key cách nhau bằng dấu phẩy để hệ thống tự động xoay vòng/failover khi một key hết hạn quota hoặc gặp lỗi.

### **6.2. Luồng CI/CD (Continuous Integration / Continuous Deployment)**

- **Quản lý Mã Nguồn:** Toàn bộ source code được lưu trữ và quản lý phiên bản tập trung trên GitHub hoặc GitLab.
- **Frontend & Serverless API (Vercel):** - Kết nối trực tiếp repository nhánh chính (`main` hoặc `master`) với Vercel.
    - Cơ chế tự động trigger: Mỗi khi có hành động `git push` hoặc merge Pull Request hợp lệ, Vercel sẽ tự động chạy quy trình build, tối ưu hóa code và deploy phiên bản mới nhất (Zero-downtime).
- **Cơ sở dữ liệu (Supabase):**
    - *Giai đoạn phát triển ban đầu:* Cho phép thao tác chỉnh sửa trực tiếp trên Supabase Dashboard thông qua công cụ Table Editor để kiểm thử nhanh.
    - *Giai đoạn Product chuẩn hóa:* Khuyến khích chuyển sang mô hình sử dụng **Supabase CLI**. Viết các tệp SQL Schema migration độc lập dưới môi trường local, thực hiện kiểm thử tính toàn vẹn dữ liệu trước khi đẩy (push) migration lên Production nhằm tránh rủi ro mất mát dữ liệu người dùng.

### **6.3. Quy trình Đưa vào Vận hành (Production Readiness Checklist)**

- **Cấu hình Tên miền (Custom Domain):** Thay thế tên miền mặc định của Vercel bằng domain chính thức của ứng dụng, cấu hình đúng bản ghi DNS (CNAME/A record).
- **Định cấu hình Supabase Auth Redirect:** Cập nhật mục URL Configuration trong Supabase Dashboard để chuyển hướng chính xác luồng Authentication sau khi đăng nhập thành công (thay đổi từ `http://localhost:3000` sang URL production `https://ten-mien-cua-ban.com`).

## **7. KIẾN TRÚC PROJECT (FOLDER STRUCTURE)**

Áp dụng Feature-driven architecture kết hợp Next.js App Router:

```
src/
├── app/
│   ├── (main)/               # Layout chính có Bottom Nav
│   │   ├── dashboard/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── debts/page.tsx
│   │   └── analytics/page.tsx
│   ├── api/                  # API Routes
│   │   └── chat/route.ts     # Xử lý Vercel AI SDK
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                   # Shadcn UI (Button, Modal, Input, Dialog, Form)
│   └── shared/               # Components dùng chung (BottomNav, FAB, Header)
├── features/                 # Tách biệt logic từng module
│   ├── ai/
│   │   ├── components/       # ChatBubble, ConfirmationCard
│   │   └── actions.ts        # Server actions liên quan AI
│   ├── transactions/
│   │   ├── components/       # TransactionItem, TransactionForm
│   │   └── actions.ts
│   ├── debts/
│   └── analytics/
├── lib/
│   ├── supabase.ts           # Khởi tạo client
│   └── utils.ts              # Format tiền tệ, date time
└── types/
    └── database.types.ts     # Generate từ Supabase
```

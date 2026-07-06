# 📋 BUG LIST AND CHANGES DOCUMENT - TEST PHASE

**Dự án:** Personal Finance App (Ứng dụng Quản lý Tài chính Cá nhân)
**Trạng thái:** Đang kiểm thử - Cập nhật Test Phase 2
**Tác giả tổng hợp:** Budger AI Assistant

---

## 🐛 CHI TIẾT DANH SÁCH BUG (BUG LIST)

### 1. Lỗi Nghiêm Trọng / Hệ Thống (Critical & API Bugs)
#### 📌 Bug 1.1: Crash API / Mâu Thuẫn Query Embed Supabase (`PGRST201`)
* **Vị trí phát hiện:** `src/app/(main)/dashboard/page.tsx:159` (Hàm `fetchDashboardData`).
* **Mô tả chi tiết:** Terminal liên tục bắn lỗi mã `PGRST201` từ PostgREST. Nguyên nhân do bảng `transactions` có 2 Foreign Key (`wallet_id` và `to_wallet_id`) cùng trỏ về bảng `wallets`. Khi query gọi `.select('*, wallets(*)')`, hệ thống bị bối rối vì có nhiều hơn một mối quan hệ (cardinality many-to-one).
* **Hệ lụy trực tiếp:** * Chặn đứng luồng tải dữ liệu Dashboard.
    * Đóng băng khu vực **Recent Transactions** (5 giao dịch gần nhất) không hiển thị được dữ liệu.
    * Ảnh hưởng dây chuyền khiến danh sách đối tác nợ (**Debt Ledger**) bị ẩn/không load được dữ liệu.
* **Giải pháp:** Sửa đổi câu query chỉ định rõ tên Foreign Key muốn kết hợp (Join) theo gợi ý của hệ thống. 
    * *Ví dụ:* Sửa thành `.select('*, wallets!transactions_wallet_id_fkey(*)')`.

---

### 2. Lỗi Luồng Hoạt Động & State (Routing & Flow Bugs)
#### 📌 Bug 2.1: Lỗi Tự Động Reset State Quay Về Dashboard Khi Đổi Tab Trình Duyệt
* **Vị trí phát hiện:** Toàn bộ ứng dụng khi chạy trên Browser.
* **Mô tả chi tiết:** Khi người dùng đang ở một tab bất kỳ (ví dụ: Transactions, Analytics, Debt) mà chuyển sang tab khác trên trình duyệt rồi quay lại, hệ thống tự động điều hướng (Redirect) hoặc reset state quay trở về màn hình Dashboard. Lỗi này vẫn chưa được xử lý triệt để ở Phase 2.
* **Hướng xử lý:** Kiểm tra lại cơ chế lắng nghe sự kiện thay đổi trạng thái hiển thị (`visibilitychange` hoặc logic re-fetch dữ liệu của SWR/React Query) tránh kích hoạt reset state không đáng có.

---

### 3. Lỗi Hiển Thị & Trải Nghiệm Giao Diện (UI/UX Bugs)
#### 📌 Bug 3.1: Chữ Cùng Màu Nền Tại Bộ Lọc Báo Cáo
* **Vị trí phát hiện:** Tab Analytics Report (Báo cáo phân tích).
* **Mô tả chi tiết:** Ở các ô input bộ lọc theo khoảng thời gian (Month, Year, Week...), phần chữ hiển thị đang bị trùng màu hoàn toàn với màu nền (background), khiến người dùng không thể đọc được nội dung lựa chọn.
* **Giải pháp:** Điều chỉnh lại class CSS/Tailwind để text hiển thị tương phản rõ ràng với nền.

#### 📌 Bug 3.2: Báo Lỗi "Ngầm" Bằng `console.error` Thay Vì UI
* **Vị trí phát hiện:** 1.  Luồng tạo giao dịch bằng AI (AI Confirmation Card) khi check số dư bị âm.
    2.  Luồng add contact (đối tác) nợ mới trong Debt Ledger khi bị trùng tên/thông tin đã có sẵn.
* **Mô tả chi tiết:** Khác với luồng tạo giao dịch thủ công (đã báo lỗi số dư âm chính xác lên UI), luồng AI và luồng Debt Ledger khi gặp lỗi log ngầm qua `console.error`, khiến người dùng không biết thao tác của mình bị thất bại vì lý do gì.
* **Giải pháp:** Loại bỏ hoàn toàn `console.error` thô, chuyển đổi đồng bộ sang hiển thị **Custom Toast Notification** báo lỗi trực quan trên giao diện để người dùng nhận biết tức thì.

---

## 🔄 CÁC YÊU CẦU THAY ĐỔI & TỐI ƯU (CHANGES & RE-ENGINEERING)

### 1. Nâng Cấp Logic Nghiệp Vụ Ví & Số Dư (Wallets Business Logic)
#### 🔀 Logic 1.1: Khóa Số Dư Âm Có Điều Kiện (Ví Thường vs Thẻ Tín Dụng)
* **Ví thông thường (Tiền mặt, Ví điện tử, Ví ngân hàng):** Khóa chặt, không cho phép số dư bị âm.
* **Thẻ tín dụng (Credit Card):** Cho phép user bật/tắt thuộc tính cấu hình đây có phải Thẻ tín dụng hay không. Nếu là Thẻ tín dụng:
    * Số dư ban đầu bằng `0`. Khi chi tiêu tiền sẽ âm xuống (thể hiện số tiền nợ ngân hàng).
    * Khi thanh toán trả nợ thẻ, nếu nộp vào nhiều hơn số tiền đang âm, số dư sẽ chuyển sang dương và phần dương đó vẫn được cộng dồn vào Tổng tài sản (Net Worth) bình thường.

#### 🔀 Logic 1.2: Quản Lý Trạng Thái Ẩn Số Dư (Private Balance Masking) Cho Ví Ẩn
* **Hiển thị ở Dashboard:** Các ví được đánh dấu `is_hidden = true` (Sổ tiết kiệm, quỹ đen...) sẽ không hiển thị số dư ở Dashboard tổng và không cộng dồn vào tổng Net Worth (Trừ khi người dùng tắt chế độ ẩn). Ví ẩn không hiển thị trong danh sách lựa chọn khi tạo giao dịch (không thể chi/thu).
* **Màn hình chi tiết ví ẩn:** Người dùng có quyền ẩn số dư chi tiết thành dạng dấu `****`.
* **Database:** Thêm trường `is_balance_masked: boolean` (mặc định `false`) vào bảng `wallets`.
* **Giao diện:** Cung cấp nút bấm (Icon con mắt 👁️) ở màn hình chi tiết để user chủ động bật/tắt hiển thị số dư. Cho phép chọn màu sắc cố định khi tạo ví thay vì render màu ngẫu nhiên.

---

### 2. Tối Ưu Bộ Lọc, Phân Trang & Di Chuyển (Pagination & Filters)
#### 🔀 Tính năng 2.1: Phân Trang & Đa Dạng Hóa Bộ Lọc
* **Tab Transactions:** Triển khai phân trang. Mở rộng bộ lọc linh hoạt: lọc theo Ngày, theo Loại hình (INCOME, EXPENSE...), theo Ví, và theo Người nợ (`debt_partners`).
* **Debt Ledger History:** Cài đặt phân trang và bộ lọc tương tự như trên.
* *(Lưu ý: Bộ lọc input chọn ngày (Date Picker) đã có sẵn trên hệ thống, giữ nguyên không cần thiết kế lại).*

#### 🔀 Tính năng 2.2: Luồng Di Chuyển Thông Minh Từ Dashboard
* Khi người dùng click vào một chiếc ví bất kỳ ở màn hình Dashboard, hệ thống sẽ điều hướng (Redirect) thẳng sang trang History của tab Transactions, đồng thời tự động áp dụng sẵn bộ lọc (Filter) theo chính chiếc ví vừa được click.

---

### 3. Nâng Cấp Tính Năng AI & Quản Lý Category
#### 🔀 AI 3.1: Nhận Diện Luồng Chuyển Tiền (Transfer Flow)
* **Yêu cầu:** Tối ưu Prompt/Schema để AI nhận diện chính xác loại giao dịch `TRANSFER` (Chuyển khoản giữa các ví).
* **Ví dụ:** *"Chuyển 500k từ ví momo qua thẻ hsbc credit"* $\rightarrow$ AI bóc tách: `type: TRANSFER`, ví nguồn `wallet_id` (momo), ví đích `to_wallet_id` (hsbc credit). Hệ thống phải xử lý logic để tiền ở ví đích thực sự tăng lên.

#### 🔀 AI 3.2: Rút Gọn Bộ Lọc Lịch Sử Chat AI (Chat History Grouping)
* Thay vì lọc chi tiết theo lịch tùy chọn phức tạp, màn hình lịch sử Chat AI sẽ nhóm cố định theo các khoảng thời gian trực quan bao gồm: **Today** (Hôm nay), **This Week** (Tuần này), và **This Month** (Tháng này). Dữ liệu chat cũ chỉ tải khi user chủ động nhấn xem quá khứ (không auto-load để tránh chậm hệ thống).

#### 🔀 AI 3.3: Đồng Bộ Ngày Hẹn Trả Nợ (Due Date)
* **Tạo thủ công:** Mở rộng UI trường chọn ngày `due_date` khi tạo giao dịch nợ (hiện tại DB có cột nhưng UI đang thiếu).
* **Tạo qua AI:** AI phải tự phân tích ngôn ngữ tự nhiên (Ví dụ: *"Hẹn cuối tuần sau trả"*) để tự quy đổi ra ngày cụ thể (`Timestamp`) và map vào schema gửi về.

#### 🔀 Tính năng 3.4: Tab Mới Quản Lý Category & AI Gợi Ý Icon
* **Thêm Tab Quản lý Category:** Bổ sung 1 tab mới hoàn toàn hỗ trợ đầy đủ các thao tác Thêm, Xóa, Sửa danh mục thu/chi (Hiện tại đang thiếu).
* **Tích hợp AI Icon:** Khi tạo mới Category, AI sẽ tự động gợi ý một Icon phù hợp dựa trên tên danh mục. Cấu trúc Prompt xử lý luồng này phải cực kỳ tinh gọn để tối ưu hóa, tiết kiệm Token tối đa.

---

### 4. Tối Ưu Biểu Đồ Báo Cáo & Quản Lý Tài Khoản
#### 🔀 Tối ưu 4.1: Biểu Đồ Analytics Hai Chiều (Thu & Chi)
* **Yêu cầu:** Biểu đồ tròn (Pie Chart) trong tab Report không được cố định (fix cứng) mỗi phần Chi tiêu (Expense) như hiện tại. Cần nâng cấp giao diện, bổ sung nút bấm chuyển đổi linh hoạt giúp người dùng xem được song song cơ cấu của cả **Chi tiêu (Expense)** và **Thu nhập (Income)**.

#### 🔀 Tối ưu 4.2: Component Hóa Ô Nhập Tiền Tệ (Money Input Formatter)
* **Yêu cầu:** Tạo một Reusable Component (Component tái sử dụng) áp dụng cho mọi Input nhập số tiền trong app.
* **Tính năng:** Tự động định dạng (format) thêm dấu chấm `.` phân cách hàng nghìn ngay trong lúc người dùng đang gõ (Ví dụ: Nhập `10000` $\rightarrow$ `10.000`, nhập `1000000` $\rightarrow$ `1.000.000`).

#### 🔀 Tối ưu 4.3: Tinh Giản Màn Hình Tài Khoản (Account)
* Loại bỏ hoàn toàn tab/màn hình quản lý tài khoản riêng biệt để tránh rườm rà. Thông tin tài khoản hiện tại của người dùng chỉ cần hiển thị ngắn gọn trong một Menu thả xuống (Dropdown/Popover) khi click vào Nút Tài khoản đặt trên Header.

---

### 📌 GHI CHÚ QUẢN LÝ TÍNH NĂNG ĐƯỜNG DÀI (BACKLOG / TODO)
* **Tính năng Cảnh báo Vượt chi tiêu (Budget Alert):** Định kỳ 1 ngày/lần, AI chạy ngầm quét chi tiêu tháng hiện tại so với hạn mức (Budget). Gắn tag **[TODO - Không khẩn cấp]** vì hệ thống hiện tại chưa làm UI cho phép người dùng thiết lập Budget theo từng Category cụ thể.
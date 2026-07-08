# BÁO CÁO TỔNG HỢP LOG SỬA LỖI & THAY ĐỔI YÊU CẦU NGHIỆP VỤ (BUG LIST & CHANGES)
**Dự án:** Ứng dụng Quản lý Tài chính Cá nhân Thông minh (Personal Finance App)
**Phiên bản tài liệu:** V3.0 (Cập nhật toàn diện sau Đợt Kiểm thử Phase 3)

---

## I. KHUNG QUẢN LÝ LỖI NGHIÊM TRỌNG (CRITICAL BUGS & BLOCKER)
*Các lỗi thuộc danh sách này có độ ưu tiên cao nhất, làm đóng băng tiến trình trải nghiệm hoặc gây crash luồng dữ liệu core. Yêu cầu giải quyết triệt để trước khi triển khai các tính năng mới.*

| Mã Bug / Thành phần | Mô tả chi tiết hệ quả & Hành vi lỗi | Định hướng xử lý kỹ thuật (Fix) |
| :--- | :--- | :--- |
| **🚨 [CRITICAL-01]<br>Routing / State Reset**<br>(Browser Visibility Context) | Khi người dùng đang thao tác ở bất kỳ màn hình nào khác ngoài Dashboard (đang gõ dở câu lệnh Chat AI, cấu hình Modal, xem báo cáo Analytics...), nếu thực hiện chuyển đổi tab trình duyệt khác hoặc ẩn/thu nhỏ cửa sổ rồi quay lại, hệ thống luôn tự động điều hướng (Redirect) hoặc reset state ép người dùng quay về trang Dashboard mặc định. Lỗi này gây ức chế trải nghiệm rất lớn và làm mất dữ liệu tạm thời của user. | Rà soát cơ chế auto re-fetch/revalidation của thư viện Data Fetching (SWR / React Query) khi kích hoạt sự kiện `onFocus` hoặc `visibilitychange`. Khóa luồng router điều hướng cưỡng ép trong hàm `fetchDashboardData` hoặc Auth State Listener của Supabase để giữ nguyên trạng thái route hiện tại của Client. |
---

## II. NÂNG CẤP LUỒNG UX DASHBOARD & BỘ LỌC TRANSACTIONS

### 1. Tối ưu hóa Luồng tương tác Thẻ Ví (Wallet Card Flow) tại Dashboard
Luồng cũ đang bị xung đột hành vi khi việc click vào thẻ ví (Hành vi A - Xem giao dịch ví) chiếm dụng toàn bộ diện tích, gây cản trở và làm phức tạp hóa luồng chỉnh sửa ví (Hành vi B - Yêu cầu user bấm Manage -> Hiện danh sách -> Chọn Edit -> UI Edit đè lên danh sách ví gây rối mắt).
* **Khi ấn vào thẻ ở dashboard:** Mở giao diện Edit thẻ ngay lập tức. Loại bỏ hoàn toàn luồng A (chuyển qua tab transactions để xem những giao dịch của ví)
* **Khai tử bước trung gian của Luồng B:** Loại bỏ hoàn toàn màn hình danh sách ví trung gian sau khi bấm "Manage". Khi người dùng ấn vào sửa nhanh của một ví cụ thể tại Dashboard, hệ thống lập tức kích hoạt mở ngay giao diện chỉnh sửa (Edit Form) riêng cho ví đó thông qua **Bottom Sheet (trên Mobile)** hoặc **Modal Popup (trên PC)** để tránh làm ngắt quãng trải nghiệm.

### 2. Áp dụng Hiển thị có Điều kiện (Conditional Rendering) cho Bộ lọc Transactions
Để tối ưu hóa diện tích hiển thị và giảm thiểu các tùy chọn dư thừa gây nhiễu cho người dùng khi xem danh sách thu chi thông thường, bộ lọc Đối tác nợ (Debt Partner) tại tab Transactions cần thay đổi cơ chế hoạt động:
* Ô chọn bộ lọc **Debt Partner** sẽ tự động **ẨN** đi theo mặc định hoặc khi bộ lọc Loại giao dịch (Transaction Type) đang chọn các loại thu chi thông thường (`INCOME`, `EXPENSE`, `TRANSFER`) hoặc đang chọn "Tất cả".
* Bộ lọc này chỉ được phép **HIỂN THỊ** khi và chỉ khi bộ lọc Loại giao dịch được chỉ định đích danh vào một trong các nghiệp vụ liên quan đến biến động nợ, bao gồm: Cho vay (`DEBT_LENT`), Đi vay (`DEBT_BORROWED`), hoặc Trả nợ (`DEBT_REPAYMENT`).

---

## III. ĐỒNG BỘ KIẾN TRÚC FORM VALIDATION & ĐỊNH DẠNG TIỀN TỆ

### 1. Rà soát Toàn diện và Đồng bộ hóa Form Validation sang Zod
Hiện tại, form Thêm mới giao dịch (Add Transaction) và form Chỉnh sửa giao dịch (Edit Transaction) vẫn đang bắt lỗi thô sơ bằng thuộc tính mặc định của HTML (như `required`, `type="number"`), gây bất đồng bộ với định hướng kỹ thuật sử dụng Zod của toàn project.
* **Hành động bắt buộc:** Thực hiện gỡ bỏ hoàn toàn cơ chế validate gốc của HTML trên các thẻ input. Chuyển giao toàn bộ gánh nặng kiểm tra dữ liệu sang cho **Zod Schema** kết hợp với giải pháp quản lý form `react-hook-form` và thư viện cầu nối `@hookform/resolvers/zod` (phù hợp với quy chuẩn thiết kế của hệ thống `shadcn/ui`).
* **Phạm vi rà soát mở rộng:** Áp dụng đồng bộ cho form Add/Edit Transaction và mở rộng kiểm tra tất cả các biểu mẫu nhập liệu hiện hành trên các cấu phần khác (Analytics, Debt Management, Thêm đối tác nợ) nhằm hiển thị thông báo lỗi (Error message) trực quan dưới dạng text UI thân thiện thay vì bong bóng cảnh báo mặc định của trình duyệt.
---

## IV. NGHIỆP VỤ AI NÂNG CAO & CẤU TRÚC CORE MỚI (TAB CATEGORY MANAGEMENT)

### 1. Thiết lập cấu trúc Tab Quản lý Danh mục (Category Management Tab)
Hệ thống hiện tại đang thiếu hoàn toàn giao diện tập trung để quản lý các danh mục thu chi cá nhân. Yêu cầu bổ sung một phân hệ tính năng mới bao gồm:
* **Giao diện Tab độc lập:** Cung cấp đầy đủ các tác vụ cốt lõi Thêm, Xóa, Sửa dành cho các danh mục (Categories).
* **Tích hợp AI gợi ý Icon thông minh:** Khi người dùng tiến hành tạo mới một Category (Ví dụ nhập tên: "Cơm trưa", "Học phí"), hệ thống tích hợp nút gọi AI tự động phân tích ngữ nghĩa tên để đưa ra gợi ý Icon phù hợp nhất từ bộ thư viện có sẵn.
* **🛡️ Lưu ý Tối ưu chi phí (Token Optimization):** Do đây là một tính năng phụ trợ nhỏ, cấu trúc Prompt và JSON Schema phản hồi gửi lên Gemini API phải được thiết kế tinh giản tối đa, chỉ trả ra mã định danh Icon (String short-code) nhằm tiết kiệm dung lượng token tiêu thụ.

### 2. Nâng cấp bộ lọc Lịch sử Chat AI linh hoạt (Granular Time Filtering)
Điều chỉnh lại hiểu lầm logic ở các phase trước (vốn fix cứng bộ lọc lịch sử chat theo các mốc tĩnh Today, This Week, This Month). Hệ thống chat AI yêu cầu lưu lại lịch sử nhưng không được tự động load hàng loạt khi truy cập tab chat nhằm tránh nghẽn băng thông.
* Thiết kế khu vực "Xem lại chat quá khứ" tích hợp thành phần lịch trực quan (**Calendar / Date-Picker**).
* Cho phép người dùng lựa chọn linh hoạt loại bộ lọc (theo Ngày cụ thể, theo Tuần cụ thể, theo Tháng cụ thể, hoặc theo Năm cụ thể) và pick đích danh khoảng thời gian trong quá khứ để truy xuất chính xác nội dung phiên chat cũ.
---

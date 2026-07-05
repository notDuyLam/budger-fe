# 📋 BUG LIST & SYSTEM CHANGES DOCUMENT

Tài liệu này dùng để ghi vết, phân loại và theo dõi trạng thái xử lý các lỗi phát sinh (Bugs) cũng như các yêu cầu điều chỉnh nghiệp vụ/giao diện (Changes) trong giai đoạn kiểm thử dự án Personal Finance App.

---

## 🐛 1. DANH SÁCH BUG CẦN FIX (BUG LIST)

| ID | Thành phần / Màn hình | Mô tả chi tiết lỗi | Độ ưu tiên | Trạng thái | Giải pháp đề xuất |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | `Màn 4: Analytics` (Báo cáo) | Ở các ô input filter theo `Month`, `Year`, `Week`, chữ hiển thị đang bị trùng màu với nền (background màu gì chữ màu đó) khiến người dùng không đọc được text. | 🔥 High | **Pending** | Kiểm tra lại các class utility của Tailwind CSS hoặc cấu hình theme CSS của `shadcn/ui` tại các component input lựa chọn để force màu chữ hiển thị đúng tương phản. |
| **BUG-02** | `Routing / State` (Hệ thống) | Mỗi khi người dùng chuyển qua tab khác trên trình duyệt (browser tab) rồi quay lại, ứng dụng luôn tự động reset state hoặc kích hoạt lại luồng điều hướng, tự quay về màn hình `Dashboard`. | 🔥 High | **Pending** | Kiểm tra lại các hook check Single Page App routing, cơ chế Re-validation của dữ liệu (SWR/React Query) hoặc logic `useEffect` lắng nghe sự kiện focus trình duyệt nhằm tránh re-trigger hàm điều hướng gốc. |

---

## 🔄 2. CÁC YÊU CẦU THAY ĐỔI & TỐI ƯU (CHANGES)

### 🏦 2.1. Logic Nghiệp Vụ Ví (Wallets) & Quản Lý Thẻ Tín Dụng
* **Chặn số dư âm cho Ví thông thường:** Hệ thống không cho phép số dư ví giảm xuống dưới `0` đối với các ví tiêu chuẩn (Tiền mặt, Ví điện tử, Thẻ ATM...).
* **Cấu hình Ví Thẻ Tín Dụng (Credit Card):**
    * Bổ sung thêm option cấu hình (Checkbox/Toggle) cho phép người dùng đánh dấu khi tạo/sửa ví: `[ ] Đây là Credit Card`.
    * Nếu là Credit Card, số dư ban đầu mặc định bằng `0` và **cho phép số dư xuống âm** khi thực hiện giao dịch chi tiêu (`EXPENSE`).
    * Khi người dùng nạp tiền/trả nợ thẻ (`TRANSFER`), nếu số tiền trả lớn hơn số tiền đang bị âm, số dư ví sẽ chuyển sang số dương và phần dương đó vẫn được cộng dồn vào Tổng tài sản (`Net Worth`) ở màn hình Dashboard như bình thường.
* **Tính năng Ví Ẩn (Sổ tiết kiệm/Khoản tiền ít dùng):**
    * Bổ sung thuộc tính ẩn (`is_hidden`) khi thiết lập ví.
    * Một khi ví được đánh dấu ẩn: **Không cộng** số dư của nó vào Tổng tài sản (`Net Worth`) hiển thị trên Dashboard (trừ khi người dùng tắt chế độ ẩn của ví).
    * Ví ẩn sẽ **bị loại bỏ hoàn toàn** khỏi các danh sách lựa chọn (Select/Dropdown choice) khi tạo giao dịch mới, nghĩa là người dùng không thể chọn ví này để chi hay thu.
* **Tùy biến giao diện chọn màu Ví:** Cho phép người dùng tự lựa chọn mã màu hiển thị cho từng chiếc ví khi tạo mới, thay vì hệ thống tự động render màu ngẫu nhiên vô định như hiện tại.

### 📊 2.2. Giao Diện & Bộ Lọc Nâng Cao (Pagination & Advanced Filters)
* **Tab Transactions (Lịch sử giao dịch):** Cài đặt phân trang (Pagination). Mở rộng bộ lọc (Filter) đa dạng hơn bao gồm: lọc theo khoảng ngày cụ thể, lọc theo dạng biến động dòng tiền (`EXPENSE`, `INCOME`...), và lọc theo người nợ/đối tác (`debt_partners`).
* **Màn 3: Debt Management (Lịch sử Debt Ledger):** Cài đặt cấu trúc phân trang và bộ lọc nâng cao tương tự như tab Transactions để quản lý danh sách nợ chuyên nghiệp hơn.
* **Tối ưu luồng di chuyển (Navigation UX):** Khi người dùng click vào một thẻ ví cụ thể ngay tại màn hình `Dashboard`, hệ thống phải điều hướng thẳng sang trang `Transaction`, đồng thời tự động áp dụng sẵn bộ lọc (filter) cho chính chiếc ví vừa được click đó.
* **Cải tiến Biểu đồ tròn tại Tab Analytics:** Hiện tại biểu đồ tròn chỉ hiển thị cơ cấu Chi tiêu (`Expense`). Cần nâng cấp UI cho phép người dùng chuyển đổi linh hoạt qua lại giữa hai chế độ xem: **Cơ cấu Chi tiêu (Expense)** và **Cơ cấu Thu nhập (Income)**.

### 📁 2.3. Danh Mục (Categories) & Hệ Thống Icon Tích Hợp AI
* **Giao diện tạo mới Category:** Bổ sung giao diện/nút bấm trực quan cho phép người dùng tự khởi tạo thêm các `Category` mới theo nhu cầu cá nhân (hiện tại UI đang thiếu luồng này).
* **Cơ chế chọn và gợi ý Icon thông minh:**
    * *Đối với Category:* Cho phép người dùng chọn icon từ bộ icon hệ thống. Đồng thời, tích hợp AI để **tự động gợi ý icon phù hợp** dựa trên tên danh mục người dùng vừa nhập vào. 
    * *🛡️ Lưu ý tối ưu kỹ thuật (Token):* Vì đây là một tính năng phụ trợ nhỏ, prompt gửi lên và JSON Schema phản hồi từ AI cần được tối ưu hóa tối đa, cấu trúc trả về cực kỳ tinh gọn để tiết kiệm token nhất có thể.
    * *Đối với Ví (Wallets):* Không cần AI gợi ý phức tạp, chỉ giới hạn cho phép người dùng chọn lựa xung quanh các icon tài chính cơ bản gồm: *Ví tiền, Thẻ, Điện thoại (tượng trưng cho ví điện tử), Sổ tiết kiệm*.

### ⏳ 2.4. Xử Lý Quản Lý Nợ & Ngày Đáo Hạn (Due Date)
* **Tạo giao dịch nợ thủ công:** Mở rộng giao diện form nhập liệu, bổ sung ô chọn ngày đáo hạn trả nợ (`due_date`) cho người dùng (hiện tại cấu trúc Database đã có sẵn trường này nhưng UI chưa thiết kế ô input).
* **Tạo giao dịch nợ bằng AI:** Cập nhật Prompt và JSON Schema của AI Chat Assistant để bóc tách thông minh ngày `due_date` dựa trên ngôn ngữ tự nhiên của người dùng (Ví dụ: *"Vay Nam 500k hẹn cuối tuần sau trả"* $\rightarrow$ AI tự tính toán ra mốc ngày cụ thể của tuần kế tiếp để map vào dữ liệu).

### 💬 2.5. Cơ Chế Lưu Trữ AI Chat
* **Tối ưu hóa dữ liệu tải (Data Fetching):** Hệ thống cần lưu lại toàn bộ lịch sử chat với AI. Tuy nhiên, để tránh làm giảm tốc độ tải trang, hệ thống **không tự động load** toàn bộ lịch sử này mỗi khi người dùng truy cập tab AI Assistant.
* **Giao diện xem lại lịch sử:** Thiết kế thêm nút hoặc khu vực biệt lập mang tên "Xem lại các đoạn chat trong quá khứ". Tại đây, bổ sung bộ lọc hỗ trợ người dùng tìm kiếm lại các đoạn hội thoại cũ theo mốc thời gian: *Ngày, Tuần, Tháng...*

### 👤 2.6. Tinh Giản Giao Diện Tài Khoản & Form Validation
* **Loại bỏ Tab quản lý tài khoản riêng biệt:** Cắt bỏ hoàn toàn màn hình/tab quản lý tài khoản độc lập để tinh giản sitemap. Thay vào đó, toàn bộ thông tin account hiện tại của user chỉ cần hiển thị gọn gàng bên trong một menu thả xuống dạng Dropdown hoặc Popup xuất hiện khi người dùng click vào nút tài khoản đặt trên `Header`.
* **Chuẩn hóa dữ liệu đầu vào với Zod:** Loại bỏ hoàn toàn cơ chế bắt lỗi input mặc định thô sơ của HTML. Chuyển đổi toàn bộ form, các ô input trong toàn bộ ứng dụng sang sử dụng thư viện **Zod** để validate dữ liệu chặt chẽ và render thông báo lỗi trực quan.
* **Thay đổi UI Choice Input:** Thay thế toàn bộ các input lựa chọn mặc định của HTML (HTML input choice) tại tab `Analytic Report` cũng như các phân hệ khác thành các component custom chỉn chu, hiện đại hơn (ví dụ sử dụng Select component của `shadcn/ui`).

---

## 🔔 3. QUẢN LÝ TÍNH NĂNG CHỜ (BACKLOG / TODO - KHÔNG KHẨN CẤP)

* **Hạng mục:** `🔔 Cảnh báo sử dụng vượt quá chi tiêu (Budget Overdue Warning)`
* **Mô tả:** Định kỳ mỗi ngày 1 lần, hệ thống sẽ kích hoạt AI chạy ngầm quét toàn bộ chi tiêu của tháng hiện tại xem có vượt quá hạn mức (Budget) đặt ra hay không để gửi cảnh báo cho user.
* **Ghi chú triển khai:** Vì hiện tại hệ thống chưa phát triển tính năng thiết lập Budget cho từng Category cụ thể, tính năng này được gắn tag `TODO` và sẽ chuyển thành một Feature độc lập phát triển ở giai đoạn sau khi hệ thống cốt lõi đã vận hành ổn định.
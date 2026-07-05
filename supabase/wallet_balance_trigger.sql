-- BƯỚC ĐẦU TIÊN: Đảm bảo bảng transactions có thêm cột 'note' để lưu ghi chú phụ.
-- Bạn có thể chạy câu lệnh này trong Supabase SQL Editor nếu cột 'note' chưa tồn tại:
-- ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS note TEXT;

-- =========================================================================
-- TRIGGER TỰ ĐỘNG CẬP NHẬT SỐ DƯ VÍ KHI THAY ĐỔI GIAO DỊCH
-- =========================================================================

-- 1. Hàm tính toán chênh lệch số dư (delta) của một giao dịch
CREATE OR REPLACE FUNCTION public.get_transaction_delta(
    p_type TEXT,
    p_amount NUMERIC,
    p_debt_partner_id UUID
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pending_type TEXT;
BEGIN
    -- INCOME: Dòng tiền vào (+)
    IF p_type = 'INCOME' THEN
        RETURN p_amount;
    -- EXPENSE: Dòng tiền ra (-)
    ELSIF p_type = 'EXPENSE' THEN
        RETURN -p_amount;
    -- DEBT_BORROWED (Đi vay): Tiền chạy vào ví (+)
    ELSIF p_type = 'DEBT_BORROWED' THEN
        RETURN p_amount;
    -- DEBT_LENT (Cho vay): Tiền chạy ra khỏi ví (-)
    ELSIF p_type = 'DEBT_LENT' THEN
        RETURN -p_amount;
    -- TRANSFER (Chuyển khoản): Giao dịch nguồn làm giảm số dư (-)
    ELSIF p_type = 'TRANSFER' THEN
        RETURN -p_amount;
    -- DEBT_REPAYMENT (Trả nợ):
    ELSIF p_type = 'DEBT_REPAYMENT' THEN
        -- Tìm xem đối tác nợ này có khoản nợ nào đang chờ xử lý (PENDING) không
        IF p_debt_partner_id IS NOT NULL THEN
            SELECT type INTO v_pending_type
            FROM public.transactions
            WHERE debt_partner_id = p_debt_partner_id
              AND status = 'PENDING'
              AND type IN ('DEBT_BORROWED', 'DEBT_LENT')
            ORDER BY created_at DESC
            LIMIT 1;

            -- Nếu trước đó đi vay (DEBT_BORROWED) -> Bây giờ trả nợ là tiền ra (-)
            IF v_pending_type = 'DEBT_BORROWED' THEN
                RETURN -p_amount;
            -- Nếu trước đó cho vay (DEBT_LENT) -> Bây giờ họ trả nợ cho mình là tiền vào (+)
            ELSIF v_pending_type = 'DEBT_LENT' THEN
                RETURN p_amount;
            END IF;
        END IF;
        -- Mặc định nếu không tìm thấy khoản nợ gốc: Coi như trả nợ của mình (tiền ra -)
        RETURN -p_amount;
    ELSE
        RETURN 0;
    END IF;
END;
$$;

-- 2. Hàm trigger xử lý sự thay đổi giao dịch (INSERT, UPDATE, DELETE)
CREATE OR REPLACE FUNCTION public.handle_transaction_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Trường hợp INSERT: Cộng delta vào ví
    IF TG_OP = 'INSERT' THEN
        UPDATE public.wallets
        SET balance = balance + public.get_transaction_delta(NEW.type, NEW.amount, NEW.debt_partner_id),
            updated_at = NOW()
        WHERE id = NEW.wallet_id;
        
    -- Trường hợp UPDATE: Trừ delta cũ và cộng delta mới
    ELSIF TG_OP = 'UPDATE' THEN
        -- Trừ ảnh hưởng của giao dịch cũ từ ví cũ
        UPDATE public.wallets
        SET balance = balance - public.get_transaction_delta(OLD.type, OLD.amount, OLD.debt_partner_id),
            updated_at = NOW()
        WHERE id = OLD.wallet_id;
        
        -- Cộng ảnh hưởng của giao dịch mới vào ví mới (hoặc ví cũ)
        UPDATE public.wallets
        SET balance = balance + public.get_transaction_delta(NEW.type, NEW.amount, NEW.debt_partner_id),
            updated_at = NOW()
        WHERE id = NEW.wallet_id;
        
    -- Trường hợp DELETE: Trừ delta cũ ra khỏi ví
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.wallets
        SET balance = balance - public.get_transaction_delta(OLD.type, OLD.amount, OLD.debt_partner_id),
            updated_at = NOW()
        WHERE id = OLD.wallet_id;
    END IF;
    
    RETURN NULL;
END;
$$;

-- 3. Tạo trigger lắng nghe sự thay đổi của bảng transactions
DROP TRIGGER IF EXISTS on_transaction_changed ON public.transactions;

CREATE TRIGGER on_transaction_changed
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_transaction_changes();

-- 4. Hàm trigger để tự động khôi phục status thành 'PENDING' khi mối liên kết bị ngắt
CREATE OR REPLACE FUNCTION public.handle_debt_repayment_reversal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Nếu repaid_by_transaction_id bị cập nhật từ có giá trị sang NULL (ví dụ khi xóa giao dịch trả nợ)
    IF OLD.repaid_by_transaction_id IS NOT NULL AND NEW.repaid_by_transaction_id IS NULL THEN
        NEW.status := 'PENDING';
    END IF;
    RETURN NEW;
END;
$$;

-- 5. Tạo trigger lắng nghe sự kiện UPDATE của bảng transactions để phát hiện ngắt liên kết
DROP TRIGGER IF EXISTS on_repayment_reversal ON public.transactions;

CREATE TRIGGER on_repayment_reversal
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_debt_repayment_reversal();

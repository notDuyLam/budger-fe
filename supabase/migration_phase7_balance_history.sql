-- =========================================================================
-- MIGRATION SCRIPT - PHASE 7: BALANCE HISTORY
-- Chạy toàn bộ script này trong Supabase SQL Editor để cập nhật DB.
-- =========================================================================

-- 1. Thêm cột lưu trữ số dư lịch sử vào bảng transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS wallet_balance_after NUMERIC(15, 2);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS to_wallet_balance_after NUMERIC(15, 2);

-- 2. Hàm recalculate_wallet_balances để tính toán lại lịch sử số dư cho một ví
CREATE OR REPLACE FUNCTION public.recalculate_wallet_balances(p_wallet_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance NUMERIC;
    v_delta NUMERIC;
    v_pending_type TEXT;
    r_tx RECORD;
BEGIN
    -- Lấy số dư hiện tại của ví
    SELECT balance INTO v_balance
    FROM public.wallets
    WHERE id = p_wallet_id;
    
    -- Duyệt qua toàn bộ các giao dịch ảnh hưởng tới ví này từ mới nhất đến cũ nhất
    FOR r_tx IN 
        SELECT id, type, amount, wallet_id, to_wallet_id, debt_partner_id
        FROM public.transactions
        WHERE wallet_id = p_wallet_id OR (type = 'TRANSFER' AND to_wallet_id = p_wallet_id)
        ORDER BY created_at DESC, id DESC
    LOOP
        v_delta := 0;
        IF r_tx.wallet_id = p_wallet_id THEN
            IF r_tx.type = 'INCOME' OR r_tx.type = 'DEBT_BORROWED' THEN
                v_delta := r_tx.amount;
            ELSIF r_tx.type = 'EXPENSE' OR r_tx.type = 'DEBT_LENT' OR r_tx.type = 'TRANSFER' THEN
                v_delta := -r_tx.amount;
            ELSIF r_tx.type = 'DEBT_REPAYMENT' THEN
                v_pending_type := NULL;
                SELECT type INTO v_pending_type
                FROM public.transactions
                WHERE repaid_by_transaction_id = r_tx.id
                LIMIT 1;
                
                IF v_pending_type IS NULL AND r_tx.debt_partner_id IS NOT NULL THEN
                    SELECT type INTO v_pending_type
                    FROM public.transactions
                    WHERE debt_partner_id = r_tx.debt_partner_id
                      AND type IN ('DEBT_BORROWED', 'DEBT_LENT')
                      AND status = 'PENDING'
                    ORDER BY created_at DESC
                    LIMIT 1;
                END IF;
                
                IF v_pending_type = 'DEBT_BORROWED' THEN
                    v_delta := -r_tx.amount;
                ELSIF v_pending_type = 'DEBT_LENT' THEN
                    v_delta := r_tx.amount;
                ELSE
                    v_delta := -r_tx.amount;
                END IF;
            END IF;
            
            UPDATE public.transactions
            SET wallet_balance_after = v_balance
            WHERE id = r_tx.id;
            
        ELSIF r_tx.type = 'TRANSFER' AND r_tx.to_wallet_id = p_wallet_id THEN
            v_delta := r_tx.amount;
            
            UPDATE public.transactions
            SET to_wallet_balance_after = v_balance
            WHERE id = r_tx.id;
        END IF;
        
        -- Trừ delta để quay lại số dư trước giao dịch
        v_balance := v_balance - v_delta;
    END LOOP;
END;
$$;

-- 3. Hàm trigger handle_transaction_changes_after để cập nhật số dư ví và tính toán lịch sử
CREATE OR REPLACE FUNCTION public.handle_transaction_changes_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Tránh vòng lặp vô hạn khi hàm recalculate_wallet_balances thực hiện UPDATE trên transactions
    IF pg_trigger_depth() > 1 THEN
        RETURN NULL;
    END IF;

    -- A. CẬP NHẬT SỐ DƯ VÍ TRONG BẢNG WALLETS (Giữ nguyên logic trigger cũ)
    IF TG_OP = 'INSERT' THEN
        UPDATE public.wallets
        SET balance = balance + public.get_transaction_delta(NEW.type, NEW.amount, NEW.debt_partner_id),
            updated_at = NOW()
        WHERE id = NEW.wallet_id;
        
        IF NEW.type = 'TRANSFER' AND NEW.to_wallet_id IS NOT NULL THEN
            UPDATE public.wallets
            SET balance = balance + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.to_wallet_id;
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.wallets
        SET balance = balance - public.get_transaction_delta(OLD.type, OLD.amount, OLD.debt_partner_id),
            updated_at = NOW()
        WHERE id = OLD.wallet_id;
        
        IF OLD.type = 'TRANSFER' AND OLD.to_wallet_id IS NOT NULL THEN
            UPDATE public.wallets
            SET balance = balance - OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.to_wallet_id;
        END IF;
        
        UPDATE public.wallets
        SET balance = balance + public.get_transaction_delta(NEW.type, NEW.amount, NEW.debt_partner_id),
            updated_at = NOW()
        WHERE id = NEW.wallet_id;
        
        IF NEW.type = 'TRANSFER' AND NEW.to_wallet_id IS NOT NULL THEN
            UPDATE public.wallets
            SET balance = balance + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.to_wallet_id;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.wallets
        SET balance = balance - public.get_transaction_delta(OLD.type, OLD.amount, OLD.debt_partner_id),
            updated_at = NOW()
        WHERE id = OLD.wallet_id;
        
        IF OLD.type = 'TRANSFER' AND OLD.to_wallet_id IS NOT NULL THEN
            UPDATE public.wallets
            SET balance = balance - OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.to_wallet_id;
        END IF;
    END IF;

    -- B. TÍNH TOÁN LẠI LỊCH SỬ SỐ DƯ
    IF TG_OP = 'INSERT' THEN
        PERFORM public.recalculate_wallet_balances(NEW.wallet_id);
        IF NEW.type = 'TRANSFER' AND NEW.to_wallet_id IS NOT NULL THEN
            PERFORM public.recalculate_wallet_balances(NEW.to_wallet_id);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.recalculate_wallet_balances(NEW.wallet_id);
        IF NEW.wallet_id <> OLD.wallet_id THEN
            PERFORM public.recalculate_wallet_balances(OLD.wallet_id);
        END IF;
        
        IF NEW.type = 'TRANSFER' AND NEW.to_wallet_id IS NOT NULL THEN
            PERFORM public.recalculate_wallet_balances(NEW.to_wallet_id);
        END IF;
        IF OLD.type = 'TRANSFER' AND OLD.to_wallet_id IS NOT NULL AND OLD.to_wallet_id <> COALESCE(NEW.to_wallet_id, '00000000-0000-0000-0000-000000000000'::UUID) THEN
            PERFORM public.recalculate_wallet_balances(OLD.to_wallet_id);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.recalculate_wallet_balances(OLD.wallet_id);
        IF OLD.type = 'TRANSFER' AND OLD.to_wallet_id IS NOT NULL THEN
            PERFORM public.recalculate_wallet_balances(OLD.to_wallet_id);
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

-- 4. Thay thế trigger cũ bằng trigger mới
DROP TRIGGER IF EXISTS on_transaction_changed ON public.transactions;
CREATE TRIGGER on_transaction_changed
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_transaction_changes_after();

-- 5. Chạy cập nhật lần đầu tiên cho toàn bộ các ví đang có
DO $$
DECLARE
    r_wallet RECORD;
BEGIN
    FOR r_wallet IN SELECT id FROM public.wallets LOOP
        PERFORM public.recalculate_wallet_balances(r_wallet.id);
    END LOOP;
END $$;

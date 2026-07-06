-- =========================================================================
-- MIGRATION SCRIPT - PHASE 6
-- Chạy toàn bộ script này trong Supabase SQL Editor để cập nhật DB.
-- =========================================================================

-- 1. Cập nhật bảng public.wallets
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS is_credit_card BOOLEAN DEFAULT FALSE;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS color TEXT DEFAULT NULL;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;

-- 2. Cập nhật bảng public.categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;

-- 3. Cập nhật bảng public.transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS to_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL;

-- 4. Cập nhật Hàm Trigger xử lý thay đổi giao dịch (đồng bộ số dư hai ví khi TRANSFER)
CREATE OR REPLACE FUNCTION public.handle_transaction_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Trường hợp INSERT: Cộng delta vào ví nguồn
    IF TG_OP = 'INSERT' THEN
        UPDATE public.wallets
        SET balance = balance + public.get_transaction_delta(NEW.type, NEW.amount, NEW.debt_partner_id),
            updated_at = NOW()
        WHERE id = NEW.wallet_id;
        
        -- Nếu là TRANSFER và có ví đích, cộng tiền vào ví đích
        IF NEW.type = 'TRANSFER' AND NEW.to_wallet_id IS NOT NULL THEN
            UPDATE public.wallets
            SET balance = balance + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.to_wallet_id;
        END IF;
        
    -- Trường hợp UPDATE: Trừ delta cũ ra khỏi ví cũ và cộng delta mới vào ví mới
    ELSIF TG_OP = 'UPDATE' THEN
        -- Trừ ảnh hưởng cũ từ ví cũ
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
        
        -- Cộng ảnh hưởng mới vào ví mới
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
        
    -- Trường hợp DELETE: Trừ delta cũ ra khỏi ví nguồn
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
    
    RETURN NULL;
END;
$$;

-- Tái tạo trigger lắng nghe thay đổi của transactions
DROP TRIGGER IF EXISTS on_transaction_changed ON public.transactions;
CREATE TRIGGER on_transaction_changed
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_transaction_changes();

-- 5. Tạo bảng lưu trữ tin nhắn lịch sử AI Chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
    text TEXT NOT NULL,
    confirmation_card JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index tìm kiếm chat messages theo user
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- Kích hoạt Row Level Security (RLS) cho chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách bảo mật RLS cho chat_messages
DROP POLICY IF EXISTS "Users can manage their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can manage their own chat messages" 
    ON public.chat_messages 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

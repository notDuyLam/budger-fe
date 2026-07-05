-- Enable UUID-OSSP extension (optional, usually default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. BẢNG WALLETS (VÍ TÀI CHÍNH)
-- =========================================================================
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index cho việc tìm kiếm ví theo user
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);

-- =========================================================================
-- 2. BẢNG CATEGORIES (DANH MỤC THU/CHI)
-- =========================================================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index cho việc tìm kiếm danh mục theo user
CREATE INDEX idx_categories_user_id ON public.categories(user_id);

-- =========================================================================
-- 3. BẢNG DEBT_PARTNERS (ĐỐI TÁC NỢ)
-- =========================================================================
CREATE TABLE public.debt_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index cho việc tìm kiếm đối tác nợ theo user
CREATE INDEX idx_debt_partners_user_id ON public.debt_partners(user_id);

-- =========================================================================
-- 4. BẢNG TRANSACTIONS (GIAO DỊCH THU/CHI & NỢ)
-- =========================================================================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    debt_partner_id UUID REFERENCES public.debt_partners(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER', 'DEBT_LENT', 'DEBT_BORROWED', 'DEBT_REPAYMENT')),
    status TEXT NOT NULL CHECK (status IN ('COMPLETED', 'PENDING')),
    due_date TIMESTAMP WITH TIME ZONE,
    description TEXT,
    note TEXT, -- Cột lưu ghi chú phụ
    repaid_by_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index giao dịch
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON public.transactions(wallet_id);

-- =========================================================================
-- 5. KÍCH HOẠT ROW LEVEL SECURITY (RLS)
-- =========================================================================
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 6. CHÍNH SÁCH BẢO MẬT RLS (POLICIES)
-- =========================================================================

-- Wallets policies
CREATE POLICY "Users can manage their own wallets" 
    ON public.wallets 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can manage their own categories" 
    ON public.categories 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Debt Partners policies
CREATE POLICY "Users can manage their own debt partners" 
    ON public.debt_partners 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can manage their own transactions" 
    ON public.transactions 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 7. TRIGGER TỰ ĐỘNG KHỞI TẠO VÍ & CATEGORIES MẶC ĐỊNH CHO USER MỚI
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- 1. Khởi tạo 1 ví mặc định "Ví tiền mặt"
    INSERT INTO public.wallets (user_id, name, balance)
    VALUES (new.id, 'Ví tiền mặt', 0.00);

    -- 2. Khởi tạo các danh mục thu/chi mặc định
    INSERT INTO public.categories (user_id, name, type)
    VALUES
        -- Chi tiêu (EXPENSE)
        (new.id, 'Ăn uống', 'EXPENSE'),
        (new.id, 'Di chuyển', 'EXPENSE'),
        (new.id, 'Mua sắm', 'EXPENSE'),
        (new.id, 'Giải trí', 'EXPENSE'),
        (new.id, 'Học tập', 'EXPENSE'),
        (new.id, 'Sức khỏe', 'EXPENSE'),
        (new.id, 'Tiền nhà', 'EXPENSE'),
        (new.id, 'Khác', 'EXPENSE'),
        -- Thu nhập (INCOME)
        (new.id, 'Lương', 'INCOME'),
        (new.id, 'Được cho/tặng', 'INCOME'),
        (new.id, 'Đầu tư', 'INCOME'),
        (new.id, 'Khác', 'INCOME');

    RETURN NEW;
END;
$$;

-- Tạo trigger chạy sau khi user mới được tạo trong bảng auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.savings_products (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    bank_name text NOT NULL,
    product_name text NOT NULL,
    type text NOT NULL,
    rate_type text NOT NULL,
    rate_value numeric(10, 4) NOT NULL,
    rate_index_type text,
    rate_index_value numeric(10, 4),
    liquidity text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.savings_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Savings products readable" ON public.savings_products;

CREATE POLICY "Savings products readable"
ON public.savings_products FOR SELECT
TO authenticated
USING (true);

GRANT SELECT ON public.savings_products TO authenticated;

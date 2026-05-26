-- ============================================================
-- Tier 1 / Slice 5: atomic inventory deduction
-- ============================================================
-- The previous services/complete route did:
--   1. SELECT quantity FROM products WHERE id = ...
--   2. UPDATE products SET quantity = MAX(0, prev - usage) WHERE id = ...
-- Two students completing services on the same tube of developer at the
-- same time would both read stock=5, both compute new=3, both write 3
-- (instead of 1). With 15-25 students in Belle's classroom this race
-- is real and observable.
--
-- This RPC takes the row lock first (SELECT ... FOR UPDATE) then writes,
-- so concurrent callers serialize through the row. It returns both
-- previous and new quantity so the calling route can still log an
-- accurate stock_movements audit row and fire low-stock alerts.
--
-- Return shape:
--   previous_stock  NUMERIC  — quantity BEFORE this deduction
--   new_stock       NUMERIC  — quantity AFTER (clamped at 0)
--   success         BOOLEAN  — true iff prev >= requested deduction
--                              (false = clamped, deducted less than asked)
-- ============================================================

CREATE OR REPLACE FUNCTION public.deduct_product_stock(
  p_product_id UUID,
  p_workspace_id UUID,
  p_quantity NUMERIC
)
RETURNS TABLE(previous_stock NUMERIC, new_stock NUMERIC, success BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev NUMERIC;
  v_new  NUMERIC;
BEGIN
  -- Row lock: blocks any other transaction trying to UPDATE / SELECT FOR
  -- UPDATE this product row until our COMMIT. This is the serialization
  -- point — concurrent service-completion calls queue here instead of
  -- racing through a read-then-write.
  SELECT COALESCE(quantity, 0) INTO v_prev
  FROM products
  WHERE id = p_product_id
    AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF v_prev IS NULL THEN
    -- Row not found (wrong workspace or deleted product).
    RETURN QUERY SELECT NULL::NUMERIC, NULL::NUMERIC, FALSE;
    RETURN;
  END IF;

  v_new := GREATEST(0, v_prev - p_quantity);

  UPDATE products
  SET quantity = v_new,
      updated_at = NOW()
  WHERE id = p_product_id;

  RETURN QUERY SELECT v_prev, v_new, (v_prev >= p_quantity);
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_product_stock(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_product_stock(UUID, UUID, NUMERIC) TO service_role;

-- ============================================================
-- Migration 010: Reporting Views, AR/AP Aging & Seed Data
-- ============================================================

-- ── AR AGING VIEW ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_ar_aging AS
SELECT
  c.id           AS customer_id,
  c.code         AS customer_code,
  c.name         AS customer_name,
  c.name_ur      AS customer_name_ur,
  c.current_balance,
  ct.name        AS tier,
  -- Aging buckets based on invoice due dates
  COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) <= 0  THEN i.amount_due END), 0) AS current_amt,
  COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) BETWEEN 1  AND 30 THEN i.amount_due END), 0) AS days_1_30,
  COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) BETWEEN 31 AND 60 THEN i.amount_due END), 0) AS days_31_60,
  COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) BETWEEN 61 AND 90 THEN i.amount_due END), 0) AS days_61_90,
  COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) > 90             THEN i.amount_due END), 0) AS days_90_plus,
  COUNT(DISTINCT i.id) AS open_invoices
FROM customers c
LEFT JOIN customer_tiers ct  ON ct.id = c.tier_id
LEFT JOIN invoices i
  ON i.customer_id = c.id
  AND i.status IN ('confirmed','partially_paid')
  AND i.amount_due > 0
WHERE c.status = 'active'
GROUP BY c.id, c.code, c.name, c.name_ur, c.current_balance, ct.name
HAVING c.current_balance > 0 OR COUNT(i.id) > 0;

-- ── AP AGING VIEW ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_ap_aging AS
SELECT
  v.id           AS vendor_id,
  v.code         AS vendor_code,
  v.name         AS vendor_name,
  v.name_ur      AS vendor_name_ur,
  v.current_balance,
  v.vendor_type,
  COALESCE(SUM(CASE WHEN (CURRENT_DATE - (po.po_date + po.payment_terms)) <= 0  THEN po.amount_due END), 0) AS current_amt,
  COALESCE(SUM(CASE WHEN (CURRENT_DATE - (po.po_date + po.payment_terms)) BETWEEN 1  AND 30 THEN po.amount_due END), 0) AS days_1_30,
  COALESCE(SUM(CASE WHEN (CURRENT_DATE - (po.po_date + po.payment_terms)) BETWEEN 31 AND 60 THEN po.amount_due END), 0) AS days_31_60,
  COALESCE(SUM(CASE WHEN (CURRENT_DATE - (po.po_date + po.payment_terms)) BETWEEN 61 AND 90 THEN po.amount_due END), 0) AS days_61_90,
  COALESCE(SUM(CASE WHEN (CURRENT_DATE - (po.po_date + po.payment_terms)) > 90             THEN po.amount_due END), 0) AS days_90_plus
FROM vendors v
LEFT JOIN purchase_orders po
  ON po.vendor_id = v.id
  AND po.status IN ('approved','partial')
  AND po.amount_due > 0
WHERE v.status = 'active'
GROUP BY v.id, v.code, v.name, v.name_ur, v.current_balance, v.vendor_type;

-- ── SALES SUMMARY VIEW ───────────────────────────────────────
CREATE OR REPLACE VIEW v_sales_summary AS
SELECT
  DATE_TRUNC('month', i.invoice_date) AS month,
  b.name   AS branch,
  COUNT(*)                            AS invoice_count,
  SUM(i.grand_total)                  AS total_sales,
  SUM(i.discount_amount)              AS total_discount,
  SUM(i.tax_amount)                   AS total_tax,
  SUM(ii.cost_price * ii.qty)         AS total_cost,
  SUM(i.grand_total) - SUM(ii.cost_price * ii.qty) AS gross_profit
FROM invoices i
JOIN branches b     ON b.id = i.branch_id
JOIN invoice_items ii ON ii.invoice_id = i.id
WHERE i.status NOT IN ('voided','draft')
GROUP BY DATE_TRUNC('month', i.invoice_date), b.name;

-- ── PRODUCT SALES VIEW ───────────────────────────────────────
CREATE OR REPLACE VIEW v_product_sales AS
SELECT
  p.id, p.sku, p.name, p.name_ur,
  c.name       AS category,
  p.sale_price,
  SUM(ii.qty)  AS total_qty_sold,
  SUM(ii.line_total) AS total_revenue,
  SUM(ii.cost_price * ii.qty) AS total_cost,
  SUM(ii.line_total) - SUM(ii.cost_price * ii.qty) AS total_profit,
  CASE WHEN SUM(ii.line_total) > 0
    THEN ROUND(((SUM(ii.line_total) - SUM(ii.cost_price * ii.qty)) / SUM(ii.line_total)) * 100, 2)
    ELSE 0 END AS profit_margin_pct,
  MAX(inv.invoice_date) AS last_sold_date
FROM products p
LEFT JOIN categories c     ON c.id = p.category_id
LEFT JOIN invoice_items ii ON ii.product_id = p.id
LEFT JOIN invoices inv     ON inv.id = ii.invoice_id AND inv.status NOT IN ('voided','draft')
WHERE p.is_active = TRUE
GROUP BY p.id, p.sku, p.name, p.name_ur, c.name, p.sale_price;

-- ── STOCK VALUATION VIEW ─────────────────────────────────────
CREATE OR REPLACE VIEW v_stock_valuation AS
SELECT
  p.id, p.sku, p.name, p.name_ur,
  c.name           AS category,
  w.name           AS warehouse,
  COALESCE(pv.attributes->>'Color', '—') AS color,
  COALESCE(pv.attributes->>'Size', '—')  AS size,
  sl.qty_on_hand,
  sl.qty_available,
  sl.avg_cost,
  sl.qty_on_hand * sl.avg_cost       AS stock_value,
  p.sale_price,
  sl.qty_on_hand * p.sale_price      AS retail_value
FROM stock_levels sl
JOIN products p          ON p.id = sl.product_id
JOIN warehouses w        ON w.id = sl.warehouse_id
LEFT JOIN categories c   ON c.id = p.category_id
LEFT JOIN product_variants pv ON pv.id = sl.variant_id
WHERE sl.qty_on_hand > 0;

-- ── TRIAL BALANCE VIEW ───────────────────────────────────────
CREATE OR REPLACE VIEW v_trial_balance AS
SELECT
  at.name          AS account_type,
  at.normal_side,
  a.code,
  a.name,
  a.name_ur,
  a.level,
  a.current_balance,
  CASE WHEN at.normal_side = 'debit'  THEN a.current_balance ELSE 0 END AS debit_balance,
  CASE WHEN at.normal_side = 'credit' THEN a.current_balance ELSE 0 END AS credit_balance
FROM accounts a
JOIN account_types at ON at.id = a.account_type_id
WHERE a.is_posting = TRUE AND a.current_balance <> 0
ORDER BY a.code;

-- ── DASHBOARD KPI FUNCTION ───────────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_kpis(p_branch_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON AS $$
DECLARE
  v_today_sales     NUMERIC;
  v_today_invoices  INT;
  v_month_sales     NUMERIC;
  v_receivables     NUMERIC;
  v_payables        NUMERIC;
  v_fbr_pending     INT;
  v_low_stock       INT;
BEGIN
  SELECT COALESCE(SUM(grand_total),0), COUNT(*) INTO v_today_sales, v_today_invoices
  FROM invoices WHERE branch_id=p_branch_id AND invoice_date=p_date AND status NOT IN ('voided','draft');

  SELECT COALESCE(SUM(grand_total),0) INTO v_month_sales
  FROM invoices WHERE branch_id=p_branch_id
    AND DATE_TRUNC('month',invoice_date) = DATE_TRUNC('month',p_date)
    AND status NOT IN ('voided','draft');

  SELECT COALESCE(SUM(current_balance),0) INTO v_receivables FROM customers WHERE status='active';
  SELECT COALESCE(SUM(current_balance),0) INTO v_payables    FROM vendors    WHERE status='active';

  SELECT COUNT(*) INTO v_fbr_pending FROM invoices
  WHERE branch_id=p_branch_id AND fbr_status='failed';

  SELECT COUNT(*) INTO v_low_stock FROM stock_levels sl
  JOIN products p ON p.id=sl.product_id
  WHERE sl.qty_available <= p.reorder_level AND p.is_active;

  RETURN json_build_object(
    'today_sales',     v_today_sales,
    'today_invoices',  v_today_invoices,
    'month_sales',     v_month_sales,
    'receivables',     v_receivables,
    'payables',        v_payables,
    'fbr_pending',     v_fbr_pending,
    'low_stock_items', v_low_stock
  );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- SEED DATA — Sample tenant: Al-Baraka Textiles
-- Run AFTER provisioning schema 'albaraka_textiles'
-- ============================================================

-- Sample customers
INSERT INTO customers (code, name, name_ur, contact_person, phone, city, credit_limit, payment_terms, current_balance, rating)
SELECT next_customer_code(), name, name_ur, contact, phone, city, credit_limit, terms, balance, rating FROM (VALUES
  ('Hassan Fabrics',       'حسن فیبرکس',     'Hassan Ali',    '0300-1234567', 'Lahore',     500000, 30, 124000, 5),
  ('City Garments',        'سٹی گارمنٹس',    'Asif Mehmood',  '0321-2345678', 'Karachi',    200000, 15,  78500, 4),
  ('Rehman Sons Traders',  'رحمن سنز',       'Rehman Sahib',  '0311-3456789', 'Faisalabad', 300000, 45,  45000, 4),
  ('Textiles Waqas Co.',   'ٹیکسٹائلز وقاص', 'Waqas Ahmed',   '0333-4567890', 'Islamabad',  400000, 30, 225000, 3),
  ('Shah Brothers',        'شاہ برادرز',     'Shah Sahib',    '0345-5678901', 'Lahore',     600000, 30,  89000, 5),
  ('Lahore Cloth House',   'لاہور کلاتھ',    'Tariq Sb',      '0322-6789012', 'Lahore',     350000, 15, 310000, 2),
  ('Pak Fashion Hub',      'پاک فیشن',       'Faraz Khan',    '0300-7890123', 'Karachi',    150000, 15,      0, 5),
  ('Northern Traders',     'ناردرن ٹریڈرز',  'Arshad Ali',    '0312-8901234', 'Rawalpindi', 200000, 30,  12500, 3)
) AS t(name, name_ur, contact, phone, city, credit_limit, terms, balance, rating);

-- Sample vendors
INSERT INTO vendors (code, name, name_ur, phone, city, vendor_type, current_balance, total_purchases)
SELECT next_vendor_code(), name, name_ur, phone, city, vtype, balance, purchases FROM (VALUES
  ('Gul Ahmed Textiles Ltd',   'گل احمد ٹیکسٹائلز', '042-35880001', 'Lahore',     'manufacturer', 380000,  5200000),
  ('Khaadi Pvt Ltd',           'کھادی',              '021-35380001', 'Karachi',    'brand',         120000,  2100000),
  ('Sapphire Textile Mills',   'سفائر',              '042-35660001', 'Lahore',     'manufacturer',  95000,   1800000),
  ('Bonanza Garments',         'بونانزہ',            '051-28500001', 'Islamabad',  'brand',          45000,    980000),
  ('Master Fabrics Faisalabad','ماسٹر فیبرکس',       '041-26300001', 'Faisalabad', 'mill',          650000,  8400000)
) AS t(name, name_ur, phone, city, vtype, balance, purchases);

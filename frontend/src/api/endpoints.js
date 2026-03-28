// ================================================================
// src/api/endpoints.js
// One-stop shop for all API calls across every ERP module.
// Each function returns the unwrapped response data.
// ================================================================
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────
export const dashboardApi = {
  getSummary:  ()         => apiGet('/dashboard/summary'),
  getActivity: ()         => apiGet('/dashboard/activity'),
  getSettings: ()         => apiGet('/settings'),
  saveSettings: (d)       => apiPut('/settings', d),
};

// ─────────────────────────────────────────────────────────────
// PRODUCTS / INVENTORY
// ─────────────────────────────────────────────────────────────
export const productsApi = {
  list:          (p)      => apiGet('/products', p),
  categories:    ()       => apiGet('/products/categories'),
  barcodeLookup: (code)   => apiGet(`/products/barcode/${code}`),
  get:           (id)     => apiGet(`/products/${id}`),
  create:        (d)      => apiPost('/products', d),
  update:        (id, d)  => apiPut(`/products/${id}`, d),
  setStatus:     (id, d)  => apiPatch(`/products/${id}/status`, d),
  addVariant:    (id, d)  => apiPost(`/products/${id}/variants`, d),
};

export const inventoryApi = {
  stock:          (p)     => apiGet('/inventory/stock', p),
  valuation:      (p)     => apiGet('/inventory/valuation', p),
  lowStock:       ()      => apiGet('/inventory/low-stock'),
  movements:      (p)     => apiGet('/inventory/movements', p),
  adjust:         (d)     => apiPost('/inventory/adjustments', d),
  createTransfer: (d)     => apiPost('/inventory/transfers', d),
  receiveTransfer:(id, d) => apiPatch(`/inventory/transfers/${id}/receive`, d),
};

// ─────────────────────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────────────────────
export const customersApi = {
  aging:         ()       => apiGet('/customers/aging'),
  list:          (p)      => apiGet('/customers', p),
  create:        (d)      => apiPost('/customers', d),
  get:           (id)     => apiGet(`/customers/${id}`),
  update:        (id, d)  => apiPut(`/customers/${id}`, d),
  ledger:        (id, p)  => apiGet(`/customers/${id}/ledger`, p),
  invoices:      (id, p)  => apiGet(`/customers/${id}/invoices`, p),
};

// ─────────────────────────────────────────────────────────────
// INVOICES / POS
// ─────────────────────────────────────────────────────────────
export const invoicesApi = {
  list:          (p)      => apiGet('/invoices', p),
  create:        (d)      => apiPost('/invoices', d),
  get:           (id)     => apiGet(`/invoices/${id}`),
  confirm:       (id)     => apiPatch(`/invoices/${id}/confirm`),
  addPayment:    (id, d)  => apiPost(`/invoices/${id}/payments`, d),
  void:          (id, d)  => apiPatch(`/invoices/${id}/void`, d),
  fbrSync:       (id)     => apiPost(`/invoices/${id}/fbr-sync`),
  printData:     (id, fmt)=> apiGet(`/invoices/${id}/print`, { format: fmt || 'receipt' }),
};

// ─────────────────────────────────────────────────────────────
// VENDORS
// ─────────────────────────────────────────────────────────────
export const vendorsApi = {
  aging:         ()       => apiGet('/vendors/aging'),
  list:          (p)      => apiGet('/vendors', p),
  create:        (d)      => apiPost('/vendors', d),
  get:           (id)     => apiGet(`/vendors/${id}`),
  update:        (id, d)  => apiPut(`/vendors/${id}`, d),
};

// ─────────────────────────────────────────────────────────────
// PURCHASE ORDERS
// ─────────────────────────────────────────────────────────────
export const purchaseOrdersApi = {
  list:          (p)      => apiGet('/purchase-orders', p),
  create:        (d)      => apiPost('/purchase-orders', d),
  get:           (id)     => apiGet(`/purchase-orders/${id}`),
  approve:       (id)     => apiPatch(`/purchase-orders/${id}/approve`),
  grn:           (id, d)  => apiPost(`/purchase-orders/${id}/grn`, d),
  payment:       (id, d)  => apiPost(`/purchase-orders/${id}/payment`, d),
};

// ─────────────────────────────────────────────────────────────
// ACCOUNTING
// ─────────────────────────────────────────────────────────────
export const accountingApi = {
  accounts:       (p)     => apiGet('/accounting/accounts', p),
  accountLedger:  (id, p) => apiGet(`/accounting/accounts/${id}/ledger`, p),
  vouchers:       (p)     => apiGet('/accounting/vouchers', p),
  createVoucher:  (d)     => apiPost('/accounting/vouchers', d),
  getVoucher:     (id)    => apiGet(`/accounting/vouchers/${id}`),
  postVoucher:    (id)    => apiPatch(`/accounting/vouchers/${id}/post`),
  reverseVoucher: (id)    => apiPatch(`/accounting/vouchers/${id}/reverse`),
  periods:        ()      => apiGet('/accounting/periods'),
  closePeriod:    (id)    => apiPatch(`/accounting/periods/${id}/close`),
};

// ─────────────────────────────────────────────────────────────
// HR & PAYROLL
// ─────────────────────────────────────────────────────────────
export const hrApi = {
  departments:     ()      => apiGet('/hr/departments'),
  employees:       (p)     => apiGet('/hr/employees', p),
  createEmployee:  (d)     => apiPost('/hr/employees', d),
  getEmployee:     (id)    => apiGet(`/hr/employees/${id}`),
  updateStatus:    (id, d) => apiPatch(`/hr/employees/${id}/status`, d),
  attendance:      (p)     => apiGet('/hr/attendance', p),
  markAttendance:  (d)     => apiPost('/hr/attendance', d),
  leaves:          (p)     => apiGet('/hr/leaves', p),
  applyLeave:      (d)     => apiPost('/hr/leaves', d),
  reviewLeave:     (id, d) => apiPatch(`/hr/leaves/${id}/approve`, d),
};

export const payrollApi = {
  list:       (p)       => apiGet('/payroll', p),
  process:    (d)       => apiPost('/payroll/process', d),
  get:        (id)      => apiGet(`/payroll/${id}`),
  markPaid:   (id)      => apiPatch(`/payroll/${id}/mark-paid`),
  payslip:    (id, emp) => apiGet(`/payroll/${id}/payslip/${emp}`),
};

// ─────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────
export const reportsApi = {
  sales:          (p)     => apiGet('/reports/sales', p),
  profitLoss:     (p)     => apiGet('/reports/profit-loss', p),
  balanceSheet:   (p)     => apiGet('/reports/balance-sheet', p),
  arAging:        ()      => apiGet('/reports/ar-aging'),
  apAging:        ()      => apiGet('/reports/ap-aging'),
  stockValuation: ()      => apiGet('/reports/stock-valuation'),
  fbrSummary:     (p)     => apiGet('/reports/fbr-summary', p),
  topProducts:    (p)     => apiGet('/reports/top-products', p),
  trialBalance:   (p)     => apiGet('/reports/trial-balance', p),
};

// ─────────────────────────────────────────────────────────────
// FBR
// ─────────────────────────────────────────────────────────────
export const fbrApi = {
  status:        ()      => apiGet('/fbr/status'),
  retry:         (id)    => apiPost(`/fbr/retry/${id}`),
  retryAll:      ()      => apiPost('/fbr/retry-all'),
  transmissions: (p)     => apiGet('/fbr/transmissions', p),
  getConfig:     ()      => apiGet('/fbr/config'),
  saveConfig:    (d)     => apiPut('/fbr/config', d),
};

// ─────────────────────────────────────────────────────────────
// SUPER ADMIN
// ─────────────────────────────────────────────────────────────
export const adminApi = {
  tenants:       (p)      => apiGet('/admin/tenants', p),
  getTenant:     (id)     => apiGet(`/admin/tenants/${id}`),
  updateTenant:  (id, d)  => apiPatch(`/admin/tenants/${id}`, d),
  stats:         ()       => apiGet('/admin/stats'),
  migrate:       (d)      => apiPost('/admin/migrate', d),
};

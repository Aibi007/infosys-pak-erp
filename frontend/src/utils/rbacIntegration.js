// ================================================================
// src/utils/rbacIntegration.js
// Drop-in patches to wire existing ERP frontend modules to the
// real backend API + RBAC system.
//
// Each module export shows:
//   1. What API hooks to swap in for mock data
//   2. What buttons/actions to gate with usePermission()
//   3. Module-specific notes
// ================================================================

/**
 * HOW TO INTEGRATE EACH MODULE
 * ─────────────────────────────────────────────────────────────
 *
 * PATTERN:
 *   // Before (mock data):
 *   const [products, setProducts] = useState(PRODUCTS_INIT);
 *
 *   // After (live API):
 *   const { data: products, loading, refetch } = useQuery(
 *     () => productsApi.list(params), [params]
 *   );
 *
 * ─────────────────────────────────────────────────────────────
 * MODULE: POS Terminal (infosys-pos-terminal.jsx)
 * ─────────────────────────────────────────────────────────────
 *
 * REPLACE mock data with:
 *   - productsApi.list({ search }) for product search
 *   - productsApi.barcodeLookup(code) for barcode scan
 *   - customersApi.list({ search }) for customer search
 *   - invoicesApi.create(payload) on sale
 *   - invoicesApi.confirm(id) to post to stock + GL + FBR
 *   - invoicesApi.printData(id) for receipt
 *
 * PERMISSION GATES:
 *   - "New Sale" button → can('pos:create')
 *   - Void invoice → can('sales:delete')
 *   - Cash discount > threshold → can('sales:discount')
 *
 * ─────────────────────────────────────────────────────────────
 * MODULE: Inventory (infosys-inventory.jsx)
 * ─────────────────────────────────────────────────────────────
 *
 * REPLACE mock data with:
 *   - inventoryApi.stock(params) for stock levels grid
 *   - inventoryApi.lowStock() for alert list
 *   - inventoryApi.movements(params) for audit log
 *   - inventoryApi.adjust(payload) for stock adjustments
 *   - inventoryApi.createTransfer(payload) for transfers
 *   - productsApi.list(params) for product list
 *   - productsApi.create(payload) for new product
 *
 * PERMISSION GATES:
 *   - "Add Product" → can('inventory:create')
 *   - "Stock Adjustment" → can('inventory:adjust')
 *   - "Transfer" → can('inventory:transfer')
 *   - Edit product → can('inventory:update')
 *
 * ─────────────────────────────────────────────────────────────
 * MODULE: Accounting (infosys-accounting.jsx)
 * ─────────────────────────────────────────────────────────────
 *
 * REPLACE mock data with:
 *   - accountingApi.accounts() for COA tree
 *   - accountingApi.accountLedger(id, params) for GL
 *   - accountingApi.vouchers(params) for voucher list
 *   - accountingApi.createVoucher(d) for new JV/CPV etc
 *   - accountingApi.postVoucher(id) to post
 *   - accountingApi.reverseVoucher(id) to reverse
 *   - reportsApi.trialBalance() for TB
 *   - reportsApi.profitLoss(params) for P&L
 *   - reportsApi.balanceSheet() for BS
 *
 * PERMISSION GATES:
 *   - "New Voucher" → can('accounting:create')
 *   - "Post" button → can('accounting:create')
 *   - "Reverse" → can('accounting:create')
 *   - "Close Period" → can('accounting:close')
 *
 * ─────────────────────────────────────────────────────────────
 * MODULE: Reports & FBR (infosys-reports-fbr.jsx)
 * ─────────────────────────────────────────────────────────────
 *
 * REPLACE mock data with:
 *   - reportsApi.sales(params) for sales report
 *   - reportsApi.topProducts(params) for top products
 *   - fbrApi.status() for FBR dashboard
 *   - fbrApi.transmissions(params) for transmission log
 *   - fbrApi.retry(id) for retry
 *   - fbrApi.retryAll() for bulk retry
 *   - fbrApi.saveConfig(d) to update credentials
 *
 * PERMISSION GATES:
 *   - All FBR actions → can('reports:fbr')
 *   - Export reports → can('reports:read')
 *
 * ─────────────────────────────────────────────────────────────
 * MODULE: Procurement (infosys-procurement.jsx)
 * ─────────────────────────────────────────────────────────────
 *
 * REPLACE mock data with:
 *   - vendorsApi.list(params) for vendor list
 *   - vendorsApi.create(d) for new vendor
 *   - purchaseOrdersApi.list(params) for PO list
 *   - purchaseOrdersApi.create(d) for new PO
 *   - purchaseOrdersApi.approve(id) to approve
 *   - purchaseOrdersApi.grn(id, d) to receive goods
 *   - purchaseOrdersApi.payment(id, d) for AP payment
 *   - reportsApi.apAging() for AP aging
 *
 * PERMISSION GATES:
 *   - "New PO" → can('procurement:create')
 *   - "Approve PO" → can('procurement:approve')
 *   - "Receive GRN" → can('inventory:create')
 *
 * ─────────────────────────────────────────────────────────────
 * MODULE: Ledger (infosys-ledger.jsx)
 * ─────────────────────────────────────────────────────────────
 *
 * REPLACE mock data with:
 *   - customersApi.list(params) for customer list
 *   - customersApi.aging() for AR aging
 *   - customersApi.ledger(id, params) for customer statement
 *   - vendorsApi.list(params) for vendor list
 *   - vendorsApi.aging() for AP aging
 *   - invoicesApi.addPayment(id, d) for receipt recording
 *
 * PERMISSION GATES:
 *   - Record payment → can('sales:create')
 *   - Add customer → can('sales:create')
 *   - Add vendor → can('procurement:create')
 *
 * ─────────────────────────────────────────────────────────────
 * MODULE: HR & Payroll (infosys-hr.jsx)
 * ─────────────────────────────────────────────────────────────
 *
 * REPLACE mock data with:
 *   - hrApi.employees(params) for employee list
 *   - hrApi.createEmployee(d) for new employee
 *   - hrApi.attendance({ month, year }) for month grid
 *   - hrApi.markAttendance(d) for bulk mark
 *   - hrApi.leaves(params) for leave requests
 *   - hrApi.applyLeave(d) for new leave
 *   - hrApi.reviewLeave(id, d) for approve/reject
 *   - payrollApi.list(params) for payroll runs
 *   - payrollApi.process({ month, year }) for payroll calc
 *   - payrollApi.markPaid(id) to disburse
 *
 * PERMISSION GATES:
 *   - "Add Employee" → can('hr:create')
 *   - "Mark Attendance" → can('hr:update')
 *   - "Process Payroll" → can('hr:payroll')
 *   - "Approve Leave" → can('hr:update')
 *   - View salary details → can('hr:payroll')
 *
 * ─────────────────────────────────────────────────────────────
 * MODULE: App Shell (infosys-app-shell.jsx)
 * ─────────────────────────────────────────────────────────────
 *
 * REPLACE the local login form with <LoginScreen /> from AuthContext.
 *
 * REPLACE the nav sidebar module list with permission-filtered
 * modules using can():
 *
 *   const MODULES = [
 *     { key: 'pos',        label: 'POS',         perm: 'pos:read' },
 *     { key: 'inventory',  label: 'Inventory',    perm: 'inventory:read' },
 *     { key: 'accounting', label: 'Accounting',   perm: 'accounting:read' },
 *     { key: 'procurement',label: 'Procurement',  perm: 'procurement:read' },
 *     { key: 'ledger',     label: 'Ledger',       perm: 'sales:read' },
 *     { key: 'hr',         label: 'HR & Payroll', perm: 'hr:read' },
 *     { key: 'reports',    label: 'Reports',      perm: 'reports:read' },
 *     { key: 'admin',      label: 'Super Admin',  superAdminOnly: true },
 *   ].filter(m => m.superAdminOnly ? isSuperAdmin : can(m.perm));
 *
 * REPLACE logout button with:
 *   import { useAuth } from '../context/AuthContext';
 *   const { logout, user, tenant } = useAuth();
 *
 * REPLACE dashboardApi mock with:
 *   const { data } = useQuery(() => dashboardApi.getSummary());
 *
 */

// ─────────────────────────────────────────────────────────────
// INTEGRATION HELPER: wrap existing module's notify fn
// ─────────────────────────────────────────────────────────────
/**
 * Bridges the existing module's local notify() to the global
 * notification system.
 *
 * USAGE (inside each module):
 *   import { useNotifications } from '../context/NotificationContext';
 *   const { notify, notifyError } = useNotifications();
 *   // Replace: notify("Invoice saved")
 *   // With:    notify("Invoice saved")   (same call, global system)
 */

// ─────────────────────────────────────────────────────────────
// INTEGRATION HELPER: error boundary for API errors
// ─────────────────────────────────────────────────────────────
export function extractApiError(err) {
  if (err?.response?.data?.error)   return err.response.data.error;
  if (err?.response?.data?.details) return err.response.data.details[0]?.message || 'Validation error';
  if (err?.message)                  return err.message;
  return 'An unexpected error occurred';
}

// ─────────────────────────────────────────────────────────────
// INTEGRATION HELPER: map API pagination to component state
// ─────────────────────────────────────────────────────────────
export function toPaginationState(apiPagination) {
  if (!apiPagination) return { page: 1, limit: 20, total: 0, pages: 1 };
  return {
    page:  apiPagination.page,
    limit: apiPagination.limit,
    total: apiPagination.total,
    pages: apiPagination.pages,
  };
}

// ─────────────────────────────────────────────────────────────
// ROLE LABELS for display in UI
// ─────────────────────────────────────────────────────────────
export const ROLE_LABELS = {
  owner:      'Owner',
  admin:      'Admin',
  manager:    'Manager',
  accountant: 'Accountant',
  cashier:    'Cashier',
  salesperson:'Sales Person',
  warehouse:  'Warehouse',
  hr_officer: 'HR Officer',
  viewer:     'Viewer (Read Only)',
};

export const ROLE_COLORS = {
  owner:      '#f97316',
  admin:      '#ef4444',
  manager:    '#8b5cf6',
  accountant: '#3b82f6',
  cashier:    '#10b981',
  salesperson:'#06b6d4',
  warehouse:  '#f59e0b',
  hr_officer: '#ec4899',
  viewer:     '#4a6070',
};

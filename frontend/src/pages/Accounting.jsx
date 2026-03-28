import { useState, useMemo } from "react";

// ================================================================
// INFOSYS PAK ERP — PART 4: ACCOUNTING & FINANCIALS
// Double-Entry | COA | Ledger | Vouchers | Trial Balance | P&L | BS
// ================================================================

// ── CHART OF ACCOUNTS (Parent-Child) ─────────────────────────────
const INIT_COA = [
  // ASSETS
  { id:"1000", code:"1000", name:"Assets",                    type:"Asset",     parent:null,   level:1, normal:"debit",  balance:0 },
  { id:"1100", code:"1100", name:"Current Assets",            type:"Asset",     parent:"1000", level:2, normal:"debit",  balance:0 },
  { id:"1110", code:"1110", name:"Cash in Hand",              type:"Asset",     parent:"1100", level:3, normal:"debit",  balance:285000 },
  { id:"1120", code:"1120", name:"HBL Current Account",       type:"Asset",     parent:"1100", level:3, normal:"debit",  balance:1245000 },
  { id:"1130", code:"1130", name:"MCB Savings Account",       type:"Asset",     parent:"1100", level:3, normal:"debit",  balance:890000 },
  { id:"1140", code:"1140", name:"Accounts Receivable",       type:"Asset",     parent:"1100", level:3, normal:"debit",  balance:845000 },
  { id:"1150", code:"1150", name:"Advance to Suppliers",      type:"Asset",     parent:"1100", level:3, normal:"debit",  balance:120000 },
  { id:"1200", code:"1200", name:"Inventory",                 type:"Asset",     parent:"1000", level:2, normal:"debit",  balance:0 },
  { id:"1210", code:"1210", name:"Fabric & Textile Stock",    type:"Asset",     parent:"1200", level:3, normal:"debit",  balance:4200000 },
  { id:"1220", code:"1220", name:"Ready-to-Wear Stock",       type:"Asset",     parent:"1200", level:3, normal:"debit",  balance:1850000 },
  { id:"1300", code:"1300", name:"Fixed Assets",              type:"Asset",     parent:"1000", level:2, normal:"debit",  balance:0 },
  { id:"1310", code:"1310", name:"Furniture & Fixtures",      type:"Asset",     parent:"1300", level:3, normal:"debit",  balance:350000 },
  { id:"1320", code:"1320", name:"Office Equipment",          type:"Asset",     parent:"1300", level:3, normal:"debit",  balance:180000 },
  // LIABILITIES
  { id:"2000", code:"2000", name:"Liabilities",               type:"Liability", parent:null,   level:1, normal:"credit", balance:0 },
  { id:"2100", code:"2100", name:"Current Liabilities",       type:"Liability", parent:"2000", level:2, normal:"credit", balance:0 },
  { id:"2110", code:"2110", name:"Accounts Payable",          type:"Liability", parent:"2100", level:3, normal:"credit", balance:620000 },
  { id:"2120", code:"2120", name:"Advance from Customers",    type:"Liability", parent:"2100", level:3, normal:"credit", balance:95000 },
  { id:"2130", code:"2130", name:"Sales Tax Payable (FBR)",   type:"Liability", parent:"2100", level:3, normal:"credit", balance:48500 },
  { id:"2140", code:"2140", name:"Salaries Payable",          type:"Liability", parent:"2100", level:3, normal:"credit", balance:180000 },
  { id:"2200", code:"2200", name:"Long-term Liabilities",     type:"Liability", parent:"2000", level:2, normal:"credit", balance:0 },
  { id:"2210", code:"2210", name:"Bank Loan - HBL",           type:"Liability", parent:"2200", level:3, normal:"credit", balance:1500000 },
  // EQUITY
  { id:"3000", code:"3000", name:"Equity",                    type:"Equity",    parent:null,   level:1, normal:"credit", balance:0 },
  { id:"3100", code:"3100", name:"Owner's Capital",           type:"Equity",    parent:"3000", level:2, normal:"credit", balance:5500000 },
  { id:"3200", code:"3200", name:"Retained Earnings",         type:"Equity",    parent:"3000", level:2, normal:"credit", balance:1200000 },
  { id:"3300", code:"3300", name:"Drawings",                  type:"Equity",    parent:"3000", level:2, normal:"debit",  balance:150000 },
  // REVENUE
  { id:"4000", code:"4000", name:"Revenue",                   type:"Revenue",   parent:null,   level:1, normal:"credit", balance:0 },
  { id:"4100", code:"4100", name:"Sales Revenue",             type:"Revenue",   parent:"4000", level:2, normal:"credit", balance:0 },
  { id:"4110", code:"4110", name:"Fabric Sales",              type:"Revenue",   parent:"4100", level:3, normal:"credit", balance:4200000 },
  { id:"4120", code:"4120", name:"Ready-to-Wear Sales",       type:"Revenue",   parent:"4100", level:3, normal:"credit", balance:2800000 },
  { id:"4130", code:"4130", name:"Accessories Sales",         type:"Revenue",   parent:"4100", level:3, normal:"credit", balance:450000 },
  { id:"4200", code:"4200", name:"Other Income",              type:"Revenue",   parent:"4000", level:2, normal:"credit", balance:0 },
  { id:"4210", code:"4210", name:"Discount Received",         type:"Revenue",   parent:"4200", level:3, normal:"credit", balance:35000 },
  // EXPENSES
  { id:"5000", code:"5000", name:"Expenses",                  type:"Expense",   parent:null,   level:1, normal:"debit",  balance:0 },
  { id:"5100", code:"5100", name:"Cost of Goods Sold",        type:"Expense",   parent:"5000", level:2, normal:"debit",  balance:0 },
  { id:"5110", code:"5110", name:"Purchases - Fabric",        type:"Expense",   parent:"5100", level:3, normal:"debit",  balance:2750000 },
  { id:"5120", code:"5120", name:"Purchases - Ready-to-Wear", type:"Expense",   parent:"5100", level:3, normal:"debit",  balance:1820000 },
  { id:"5130", code:"5130", name:"Freight Inward",            type:"Expense",   parent:"5100", level:3, normal:"debit",  balance:85000 },
  { id:"5200", code:"5200", name:"Operating Expenses",        type:"Expense",   parent:"5000", level:2, normal:"debit",  balance:0 },
  { id:"5210", code:"5210", name:"Salaries & Wages",          type:"Expense",   parent:"5200", level:3, normal:"debit",  balance:540000 },
  { id:"5220", code:"5220", name:"Rent Expense",              type:"Expense",   parent:"5200", level:3, normal:"debit",  balance:180000 },
  { id:"5230", code:"5230", name:"Electricity & Utilities",   type:"Expense",   parent:"5200", level:3, normal:"debit",  balance:42000 },
  { id:"5240", code:"5240", name:"Telephone & Internet",      type:"Expense",   parent:"5200", level:3, normal:"debit",  balance:18000 },
  { id:"5250", code:"5250", name:"Stationery & Printing",     type:"Expense",   parent:"5200", level:3, normal:"debit",  balance:12000 },
  { id:"5260", code:"5260", name:"Marketing & Advertising",   type:"Expense",   parent:"5200", level:3, normal:"debit",  balance:65000 },
  { id:"5300", code:"5300", name:"Finance Costs",             type:"Expense",   parent:"5000", level:2, normal:"debit",  balance:0 },
  { id:"5310", code:"5310", name:"Bank Charges",              type:"Expense",   parent:"5300", level:3, normal:"debit",  balance:8500 },
  { id:"5320", code:"5320", name:"Loan Interest - HBL",       type:"Expense",   parent:"5300", level:3, normal:"debit",  balance:45000 },
  { id:"5330", code:"5330", name:"Discount Allowed",          type:"Expense",   parent:"5300", level:3, normal:"debit",  balance:28000 },
];

const INIT_VOUCHERS = [
  { id:"v001", number:"CRV-2024-001", type:"Cash Receipt",  date:"2024-03-02", narration:"Cash received from Al-Fatah Traders against INV-2024-08741", ref:"INV-2024-08741", posted:true, createdBy:"Admin",
    lines:[{account:"1110",label:"Cash in Hand",debit:245000,credit:0},{account:"4110",label:"Fabric Sales",debit:0,credit:245000}] },
  { id:"v002", number:"BPV-2024-001", type:"Bank Payment",  date:"2024-03-01", narration:"Payment to Gul Ahmed Textiles for fabric purchase PO-2024-03219", ref:"PO-2024-03219", posted:true, createdBy:"Admin",
    lines:[{account:"5110",label:"Purchases - Fabric",debit:1250000,credit:0},{account:"1120",label:"HBL Current Account",debit:0,credit:1250000}] },
  { id:"v003", number:"CRV-2024-002", type:"Cash Receipt",  date:"2024-03-01", narration:"Cash received from City Garments INV-2024-08739", ref:"INV-2024-08739", posted:true, createdBy:"Admin",
    lines:[{account:"1110",label:"Cash in Hand",debit:78500,credit:0},{account:"4120",label:"Ready-to-Wear Sales",debit:0,credit:78500}] },
  { id:"v004", number:"CPV-2024-001", type:"Cash Payment",  date:"2024-02-29", narration:"Monthly rent payment for Lahore Main Branch", ref:"", posted:true, createdBy:"Admin",
    lines:[{account:"5220",label:"Rent Expense",debit:60000,credit:0},{account:"1110",label:"Cash in Hand",debit:0,credit:60000}] },
  { id:"v005", number:"JV-2024-001",  type:"Journal",       date:"2024-02-28", narration:"Monthly salary expense accrual - February 2024", ref:"", posted:true, createdBy:"Admin",
    lines:[{account:"5210",label:"Salaries & Wages",debit:180000,credit:0},{account:"2140",label:"Salaries Payable",debit:0,credit:180000}] },
  { id:"v006", number:"BRV-2024-001", type:"Bank Receipt",  date:"2024-02-28", narration:"Bank transfer received from Hassan Fabrics partial payment", ref:"INV-2024-08738", posted:true, createdBy:"Admin",
    lines:[{account:"1120",label:"HBL Current Account",debit:100000,credit:0},{account:"1140",label:"Accounts Receivable",debit:0,credit:100000}] },
  { id:"v007", number:"BPV-2024-002", type:"Bank Payment",  date:"2024-02-27", narration:"Electricity bill payment for all branches", ref:"", posted:true, createdBy:"Admin",
    lines:[{account:"5230",label:"Electricity & Utilities",debit:14000,credit:0},{account:"1120",label:"HBL Current Account",debit:0,credit:14000}] },
  { id:"v008", number:"JV-2024-002",  type:"Journal",       date:"2024-02-26", narration:"FBR Sales Tax payable for February 2024", ref:"", posted:false, createdBy:"Admin",
    lines:[{account:"4110",label:"Fabric Sales",debit:16170,credit:0},{account:"2130",label:"Sales Tax Payable (FBR)",debit:0,credit:16170}] },
];

const LEDGER_ENTRIES = [
  { date:"2024-03-02", voucher:"CRV-2024-001", narration:"Cash from Al-Fatah Traders", debit:245000, credit:0,    account:"1110", balance:285000 },
  { date:"2024-03-01", voucher:"BRV-2024-001", narration:"Bank transfer Hassan Fabrics", debit:100000, credit:0,  account:"1120", balance:1245000 },
  { date:"2024-03-01", voucher:"CRV-2024-002", narration:"Cash from City Garments",     debit:78500,  credit:0,   account:"1110", balance:40000 },
  { date:"2024-02-29", voucher:"CPV-2024-001", narration:"Rent payment",                debit:0,      credit:60000, account:"1110", balance:-38500 },
  { date:"2024-02-28", voucher:"JV-2024-001",  narration:"Salary accrual Feb",          debit:0,      credit:180000, account:"2140", balance:180000 },
  { date:"2024-02-27", voucher:"BPV-2024-002", narration:"Electricity bill",            debit:0,      credit:14000, account:"1120", balance:159000 },
];

// ── HELPERS ───────────────────────────────────────────────────────
const fmt  = n => new Intl.NumberFormat("en-PK").format(Math.abs(Math.round(n)));
const fmtS = n => (n < 0 ? "(" : "") + fmt(n) + (n < 0 ? ")" : "");

const TYPE_COLOR = {
  Asset:"#3b82f6", Liability:"#ef4444", Equity:"#8b5cf6",
  Revenue:"#10b981", Expense:"#f97316",
};
const VOUCHER_COLOR = {
  "Cash Receipt":"#10b981", "Cash Payment":"#ef4444",
  "Bank Receipt":"#3b82f6", "Bank Payment":"#f59e0b",
  "Journal":"#8b5cf6",
};

// ── PALETTE ───────────────────────────────────────────────────────
const C = {
  bg:"#070b11", panel:"#0b1019", card:"#0f1621", card2:"#0d1420",
  border:"#192433", border2:"#1e2e40",
  text:"#dde4ed", muted:"#506070", muted2:"#2d404f",
  accent:"#f97316", blue:"#3b82f6", green:"#10b981",
  red:"#ef4444", yellow:"#f59e0b", purple:"#8b5cf6",
  teal:"#06b6d4", input:"#09121c", header:"#05090e",
};

const Tag = ({ l, col }) => (
  <span style={{ fontSize:"9px", fontWeight:"700", padding:"1px 6px", borderRadius:"4px", background:`${col}18`, color:col, border:`1px solid ${col}28` }}>{l}</span>
);

const Btn = ({ onClick, children, color=C.blue, outline=false, small=false, disabled=false }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: small?"5px 10px":"8px 14px", borderRadius:"7px", border: outline?`1px solid ${color}55`:"none",
    background: disabled?"#1c2a3a":outline?`${color}12`:color, color: disabled?C.muted:"#fff",
    cursor: disabled?"not-allowed":"pointer", fontSize: small?"10px":"12px", fontWeight:"700",
    display:"flex", alignItems:"center", gap:"5px", whiteSpace:"nowrap",
  }}>{children}</button>
);

const Divider = () => <div style={{ height:"1px", background:C.border, margin:"0" }}/>;

// ── MAIN ─────────────────────────────────────────────────────────
export default function AccountingModule() {
  const [tab, setTab]         = useState("coa");
  const [coa, setCoa]         = useState(INIT_COA);
  const [vouchers, setVouchers] = useState(INIT_VOUCHERS);
  const [expanded, setExpanded] = useState(new Set(["1000","2000","3000","4000","5000"]));
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [showVoucherForm, setShowVoucherForm] = useState(null);
  const [voucherFilter, setVoucherFilter] = useState("All");
  const [notification, setNotification] = useState(null);
  const [ledgerAcc, setLedgerAcc] = useState(null);
  const [tbExpanded, setTbExpanded] = useState(false);

  const notify = (msg, type="success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Computed account balances (propagated from children)
  const accountMap = useMemo(() => {
    const map = {};
    coa.forEach(a => { map[a.code] = { ...a }; });
    // Propagate child balances to parents
    const levels = [3, 2, 1];
    levels.forEach(level => {
      coa.filter(a => a.level === level && a.parent).forEach(a => {
        if (map[a.parent]) map[a.parent].balance = (map[a.parent].balance || 0) + (a.balance || 0);
      });
    });
    return map;
  }, [coa]);

  const toggle = (code) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(code) ? next.delete(code) : next.add(code);
    return next;
  });

  const children = (parentCode) => coa.filter(a => a.parent === parentCode);
  const hasChildren = (code) => coa.some(a => a.parent === code);

  // Trial Balance
  const leafAccounts = coa.filter(a => !hasChildren(a.code) && a.balance !== 0);
  const tbDebit  = leafAccounts.filter(a => a.normal === "debit").reduce((s,a)=>s+a.balance,0);
  const tbCredit = leafAccounts.filter(a => a.normal === "credit").reduce((s,a)=>s+a.balance,0);

  // P&L
  const revenue  = coa.filter(a=>a.type==="Revenue" && a.level===3).reduce((s,a)=>s+a.balance,0);
  const cogs     = coa.filter(a=>a.parent==="5100").reduce((s,a)=>s+a.balance,0);
  const grossProfit = revenue - cogs;
  const opex     = coa.filter(a=>a.parent==="5200").reduce((s,a)=>s+a.balance,0);
  const finCost  = coa.filter(a=>a.parent==="5300").reduce((s,a)=>s+a.balance,0);
  const netProfit = grossProfit - opex - finCost;

  // Balance Sheet
  const totalAssets = coa.filter(a=>a.type==="Asset"&&a.level===3).reduce((s,a)=>s+a.balance,0);
  const totalLiab   = coa.filter(a=>a.type==="Liability"&&a.level===3).reduce((s,a)=>s+a.balance,0);
  const totalEquity = coa.filter(a=>a.type==="Equity"&&a.level===3).reduce((s,a)=>(a.normal==="debit"?s-a.balance:s+a.balance),0) + netProfit;

  const tabs = [
    { k:"coa",     l:"🗂 Chart of Accounts" },
    { k:"vouchers",l:"📝 Vouchers" },
    { k:"ledger",  l:"📒 Ledger" },
    { k:"trial",   l:"⚖️ Trial Balance" },
    { k:"pl",      l:"📊 Profit & Loss" },
    { k:"bs",      l:"🏦 Balance Sheet" },
  ];

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif", fontSize:"13px", overflow:"hidden", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-thumb{background:#192433;border-radius:4px}
        input,select,textarea,button{font-family:inherit}
        @keyframes slideIn{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes rowIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
      `}</style>

      {/* HEADER */}
      <div style={{ background:C.header, borderBottom:`1px solid ${C.border}`, padding:"0 20px", height:"56px", display:"flex", alignItems:"center", gap:"14px", flexShrink:0 }}>
        <div style={{ width:"32px", height:"32px", borderRadius:"7px", background:"linear-gradient(135deg,#f97316,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"900", fontSize:"12px", color:"#fff" }}>IP</div>
        <div>
          <div style={{ fontWeight:"800", fontSize:"15px", color:"#fff" }}>Accounting & Financials</div>
          <div style={{ fontSize:"9px", color:C.muted }}>Double-Entry · Chart of Accounts · Ledger · Financial Statements</div>
        </div>
        <div style={{ marginLeft:"20px", display:"flex", gap:"2px", overflowX:"auto" }}>
          {tabs.map(t => (
            <button key={t.k} onClick={()=>setTab(t.k)} style={{ padding:"6px 12px", borderRadius:"6px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"700", whiteSpace:"nowrap",
              background:tab===t.k?C.accent:"transparent", color:tab===t.k?"#fff":C.muted, transition:"all 0.15s" }}>
              {t.l}
            </button>
          ))}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:"8px" }}>
          {tab==="vouchers" && <Btn onClick={()=>setShowVoucherForm("Cash Receipt")} color={C.green}>+ New Voucher</Btn>}
          {(tab==="pl"||tab==="bs"||tab==="trial") && <Btn color={C.blue} outline small>📤 Export PDF</Btn>}
          {(tab==="pl"||tab==="bs"||tab==="trial") && <Btn color={C.green} outline small>📊 Export Excel</Btn>}
        </div>
      </div>

      {/* SUMMARY STRIP */}
      <div style={{ background:C.panel, borderBottom:`1px solid ${C.border}`, padding:"8px 20px", display:"flex", gap:"10px", flexShrink:0, overflowX:"auto" }}>
        {[
          { l:"Total Assets",     v:`PKR ${fmt(totalAssets)}`,  col:C.blue },
          { l:"Total Liabilities",v:`PKR ${fmt(totalLiab)}`,   col:C.red },
          { l:"Total Equity",     v:`PKR ${fmt(totalEquity)}`,  col:C.purple },
          { l:"Gross Revenue",    v:`PKR ${fmt(revenue)}`,      col:C.green },
          { l:"Net Profit",       v:`PKR ${fmt(netProfit)}`,    col:netProfit>=0?C.green:C.red },
          { l:"Vouchers (Posted)",v:vouchers.filter(v=>v.posted).length, col:C.teal },
          { l:"Vouchers (Draft)", v:vouchers.filter(v=>!v.posted).length, col:C.yellow },
        ].map(s => (
          <div key={s.l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"9px 14px", minWidth:"150px", flex:1 }}>
            <div style={{ fontSize:"9px", color:C.muted, fontWeight:"600", marginBottom:"3px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.l}</div>
            <div style={{ fontSize:"15px", fontWeight:"900", color:s.col, letterSpacing:"-0.02em" }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CHART OF ACCOUNTS */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === "coa" && (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"14px" }}>
              <h2 style={{ fontSize:"16px", fontWeight:"800", color:C.text, margin:0 }}>Chart of Accounts</h2>
              <div style={{ display:"flex", gap:"6px" }}>
                {["Asset","Liability","Equity","Revenue","Expense"].map(type => (
                  <Tag key={type} l={type} col={TYPE_COLOR[type]}/>
                ))}
              </div>
              <div style={{ marginLeft:"auto" }}>
                <Btn color={C.green} small>+ Add Account</Btn>
              </div>
            </div>

            {/* COA Table */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"120px 1fr 100px 140px 140px 100px", gap:0 }}>
                {["Code","Account Name","Type","Debit Balance","Credit Balance","Action"].map(h => (
                  <div key={h} style={{ padding:"9px 12px", fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", background:C.panel, borderBottom:`1px solid ${C.border}` }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Render tree */}
              {coa.filter(a => a.level === 1).map(root => (
                <CoaGroup key={root.code} account={accountMap[root.code]||root} coa={coa} accountMap={accountMap}
                  expanded={expanded} toggle={toggle} level={0}
                  onSelect={a=>setSelectedAcc(selectedAcc?.code===a.code?null:a)}
                  selectedAcc={selectedAcc}/>
              ))}
            </div>
          </div>

          {/* Account Detail Panel */}
          {selectedAcc && (
            <div style={{ width:"320px", background:C.panel, borderLeft:`1px solid ${C.border}`, display:"flex", flexDirection:"column", flexShrink:0, animation:"slideIn 0.2s ease" }}>
              <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontWeight:"800", fontSize:"13px", color:C.text }}>Account Detail</div>
                <button onClick={()=>setSelectedAcc(null)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"16px" }}>✕</button>
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:"16px" }}>
                <div style={{ marginBottom:"16px" }}>
                  <div style={{ fontSize:"22px", fontWeight:"900", color:C.text, marginBottom:"4px" }}>{selectedAcc.name}</div>
                  <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                    <Tag l={selectedAcc.code} col={C.blue}/>
                    <Tag l={selectedAcc.type} col={TYPE_COLOR[selectedAcc.type]}/>
                    <Tag l={`Level ${selectedAcc.level}`} col={C.muted}/>
                    <Tag l={`Normal: ${selectedAcc.normal}`} col={C.teal}/>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"16px" }}>
                  {[
                    { l:"Current Balance", v:`PKR ${fmt(accountMap[selectedAcc.code]?.balance||0)}`, col:C.accent, big:true },
                    { l:"Normal Side",     v:selectedAcc.normal.toUpperCase(), col:selectedAcc.normal==="debit"?C.blue:C.green },
                    { l:"Account Type",    v:selectedAcc.type, col:TYPE_COLOR[selectedAcc.type] },
                    { l:"Account Level",   v:`Level ${selectedAcc.level}`, col:C.muted },
                  ].map(s => (
                    <div key={s.l} style={{ background:C.card, borderRadius:"8px", padding:"10px 12px", gridColumn:s.big?"1/-1":"auto" }}>
                      <div style={{ fontSize:"9px", color:C.muted, marginBottom:"3px" }}>{s.l}</div>
                      <div style={{ fontSize:s.big?"18px":"13px", fontWeight:"800", color:s.col }}>{s.v}</div>
                    </div>
                  ))}
                </div>

                {/* Recent transactions for this account */}
                <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>Recent Transactions</div>
                {LEDGER_ENTRIES.filter(e=>e.account===selectedAcc.code).slice(0,5).map((e,i) => (
                  <div key={i} style={{ padding:"9px 10px", background:C.card, borderRadius:"7px", marginBottom:"5px", display:"flex", alignItems:"center", gap:"8px" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"11px", fontWeight:"600", color:C.text }}>{e.narration}</div>
                      <div style={{ fontSize:"9px", color:C.muted }}>{e.date} · {e.voucher}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      {e.debit > 0 && <div style={{ fontSize:"11px", fontWeight:"700", color:C.blue }}>Dr {fmt(e.debit)}</div>}
                      {e.credit > 0 && <div style={{ fontSize:"11px", fontWeight:"700", color:C.red }}>Cr {fmt(e.credit)}</div>}
                    </div>
                  </div>
                ))}
                {LEDGER_ENTRIES.filter(e=>e.account===selectedAcc.code).length === 0 && (
                  <div style={{ padding:"20px", textAlign:"center", color:C.muted, fontSize:"11px" }}>No recent transactions</div>
                )}
                <button onClick={()=>{setTab("ledger");setLedgerAcc(selectedAcc);}} style={{ marginTop:"8px", width:"100%", padding:"9px", borderRadius:"7px", border:`1px solid ${C.blue}44`, background:`${C.blue}10`, color:C.blue, cursor:"pointer", fontSize:"11px", fontWeight:"700" }}>
                  📒 View Full Ledger →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* VOUCHERS */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === "vouchers" && (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
            {/* Voucher Type Filter */}
            <div style={{ display:"flex", gap:"8px", marginBottom:"16px", flexWrap:"wrap", alignItems:"center" }}>
              {["All","Cash Receipt","Cash Payment","Bank Receipt","Bank Payment","Journal"].map(t => (
                <button key={t} onClick={()=>setVoucherFilter(t)} style={{
                  padding:"5px 12px", borderRadius:"20px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"700",
                  background: voucherFilter===t?(VOUCHER_COLOR[t]||C.accent):"transparent",
                  color: voucherFilter===t?"#fff":C.muted, transition:"all 0.15s",
                }}>{t}</button>
              ))}
              <div style={{ marginLeft:"auto", display:"flex", gap:"6px" }}>
                {["Cash Receipt","Cash Payment","Bank Receipt","Bank Payment","Journal"].map(t => (
                  <Btn key={t} small color={VOUCHER_COLOR[t]||C.accent} outline onClick={()=>setShowVoucherForm(t)}>+ {t}</Btn>
                ))}
              </div>
            </div>

            {/* Vouchers List */}
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {vouchers.filter(v=>voucherFilter==="All"||v.type===voucherFilter).map((v,i) => (
                <div key={v.id} style={{ background:C.card, border:`1px solid ${v.posted?C.border:C.yellow+"44"}`, borderRadius:"10px", overflow:"hidden", animation:`rowIn 0.2s ease ${i*0.04}s both` }}>
                  {/* Voucher Header */}
                  <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:"12px", borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ width:"38px", height:"38px", borderRadius:"9px", flexShrink:0, background:`${VOUCHER_COLOR[v.type]||C.accent}18`, border:`1.5px solid ${VOUCHER_COLOR[v.type]||C.accent}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px" }}>
                      {v.type==="Cash Receipt"?"💵":v.type==="Cash Payment"?"💸":v.type==="Bank Receipt"?"🏦":v.type==="Bank Payment"?"🏧":"📋"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"3px" }}>
                        <span style={{ fontSize:"13px", fontWeight:"800", color:C.text, fontFamily:"'IBM Plex Mono'" }}>{v.number}</span>
                        <Tag l={v.type} col={VOUCHER_COLOR[v.type]||C.accent}/>
                        {!v.posted && <Tag l="DRAFT" col={C.yellow}/>}
                        {v.posted && <Tag l="POSTED" col={C.green}/>}
                      </div>
                      <div style={{ fontSize:"11px", color:C.muted }}>{v.narration}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:"14px", fontWeight:"900", color:VOUCHER_COLOR[v.type]||C.accent }}>
                        PKR {fmt(v.lines.reduce((s,l)=>s+l.debit,0))}
                      </div>
                      <div style={{ fontSize:"10px", color:C.muted }}>{v.date}</div>
                    </div>
                    {v.ref && <div style={{ fontSize:"10px", color:C.blue, fontFamily:"'IBM Plex Mono'", padding:"3px 8px", background:`${C.blue}12`, borderRadius:"4px" }}>{v.ref}</div>}
                    <div style={{ display:"flex", gap:"4px", flexShrink:0 }}>
                      <Btn small outline color={C.blue}>✎ Edit</Btn>
                      {!v.posted && <Btn small color={C.green} onClick={()=>{setVouchers(prev=>prev.map(x=>x.id===v.id?{...x,posted:true}:x));notify(`${v.number} posted`)}}>✓ Post</Btn>}
                    </div>
                  </div>
                  {/* Journal Lines */}
                  <div style={{ padding:"8px 16px 12px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 130px 130px", gap:0, marginBottom:"4px" }}>
                      {["Code","Account","Debit (PKR)","Credit (PKR)"].map(h=>(
                        <div key={h} style={{ fontSize:"9px", color:C.muted, fontWeight:"700", padding:"3px 6px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</div>
                      ))}
                    </div>
                    {v.lines.map((line,li) => (
                      <div key={li} style={{ display:"grid", gridTemplateColumns:"80px 1fr 130px 130px", gap:0, padding:"4px 0", borderTop:`1px solid ${C.border}` }}>
                        <div style={{ padding:"4px 6px", fontSize:"10px", color:C.blue, fontFamily:"'IBM Plex Mono'" }}>{line.account}</div>
                        <div style={{ padding:"4px 6px", fontSize:"11px", color:C.text, paddingLeft: line.credit>0?"24px":"6px" }}>{line.label}</div>
                        <div style={{ padding:"4px 6px", fontSize:"11px", fontWeight:"700", color:C.blue, fontFamily:"'IBM Plex Mono'" }}>
                          {line.debit > 0 ? fmt(line.debit) : "—"}
                        </div>
                        <div style={{ padding:"4px 6px", fontSize:"11px", fontWeight:"700", color:C.green, fontFamily:"'IBM Plex Mono'" }}>
                          {line.credit > 0 ? fmt(line.credit) : "—"}
                        </div>
                      </div>
                    ))}
                    {/* Balance check */}
                    <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 130px 130px", borderTop:`2px solid ${C.border2}`, marginTop:"4px", paddingTop:"4px" }}>
                      <div/>
                      <div style={{ padding:"4px 6px", fontSize:"10px", color:C.muted, fontWeight:"700" }}>TOTAL</div>
                      <div style={{ padding:"4px 6px", fontSize:"11px", fontWeight:"900", color:C.blue, fontFamily:"'IBM Plex Mono'" }}>{fmt(v.lines.reduce((s,l)=>s+l.debit,0))}</div>
                      <div style={{ padding:"4px 6px", fontSize:"11px", fontWeight:"900", color:C.green, fontFamily:"'IBM Plex Mono'" }}>{fmt(v.lines.reduce((s,l)=>s+l.credit,0))}</div>
                    </div>
                    {v.lines.reduce((s,l)=>s+l.debit,0) === v.lines.reduce((s,l)=>s+l.credit,0) && (
                      <div style={{ marginTop:"4px", fontSize:"9px", color:C.green }}>✓ Balanced</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* LEDGER */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === "ledger" && (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          {/* Account Selector */}
          <div style={{ width:"240px", background:C.panel, borderRight:`1px solid ${C.border}`, overflowY:"auto", flexShrink:0 }}>
            <div style={{ padding:"12px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"6px" }}>Select Account</div>
              <input placeholder="Search..." style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"6px 9px", color:C.text, fontSize:"11px", outline:"none" }}/>
            </div>
            {coa.filter(a => a.level === 3).map(a => (
              <div key={a.code} onClick={()=>setLedgerAcc(a)} style={{
                padding:"8px 14px", cursor:"pointer", borderBottom:`1px solid ${C.border}`,
                background: ledgerAcc?.code===a.code?`${TYPE_COLOR[a.type]}12`:"transparent",
                borderLeft:`3px solid ${ledgerAcc?.code===a.code?TYPE_COLOR[a.type]:"transparent"}`,
              }}
                onMouseEnter={e=>{ if(ledgerAcc?.code!==a.code) e.currentTarget.style.background=C.card }}
                onMouseLeave={e=>{ if(ledgerAcc?.code!==a.code) e.currentTarget.style.background="transparent" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:"11px", fontWeight:"600", color:C.text, lineHeight:1.3 }}>{a.name}</div>
                    <div style={{ fontSize:"9px", color:C.muted, fontFamily:"'IBM Plex Mono'" }}>{a.code}</div>
                  </div>
                  <Tag l={a.type.slice(0,3)} col={TYPE_COLOR[a.type]}/>
                </div>
              </div>
            ))}
          </div>

          {/* Ledger Entries */}
          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
            {ledgerAcc ? (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px" }}>
                  <div>
                    <h2 style={{ fontSize:"18px", fontWeight:"900", color:C.text, margin:0 }}>{ledgerAcc.name}</h2>
                    <div style={{ display:"flex", gap:"6px", marginTop:"4px" }}>
                      <Tag l={ledgerAcc.code} col={C.blue}/>
                      <Tag l={ledgerAcc.type} col={TYPE_COLOR[ledgerAcc.type]}/>
                    </div>
                  </div>
                  <div style={{ marginLeft:"auto", display:"flex", gap:"8px" }}>
                    <Btn small outline color={C.blue}>📅 Date Range</Btn>
                    <Btn small outline color={C.blue}>📤 Export</Btn>
                  </div>
                </div>

                {/* Running balance table */}
                <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", overflow:"hidden" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"110px 1fr 120px 130px 130px 130px", borderBottom:`1px solid ${C.border}` }}>
                    {["Date","Narration","Voucher","Debit (PKR)","Credit (PKR)","Balance (PKR)"].map(h => (
                      <div key={h} style={{ padding:"9px 12px", fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em", background:C.panel }}>
                        {h}
                      </div>
                    ))}
                  </div>

                  {/* Opening Balance Row */}
                  <div style={{ display:"grid", gridTemplateColumns:"110px 1fr 120px 130px 130px 130px", background:`${C.yellow}0a`, borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ padding:"9px 12px", fontSize:"10px", color:C.muted }}>Opening</div>
                    <div style={{ padding:"9px 12px", fontSize:"11px", color:C.yellow, fontWeight:"600" }}>Opening Balance b/d</div>
                    <div style={{ padding:"9px 12px" }}/>
                    <div style={{ padding:"9px 12px" }}/>
                    <div style={{ padding:"9px 12px" }}/>
                    <div style={{ padding:"9px 12px", fontSize:"12px", fontWeight:"900", color:C.yellow, fontFamily:"'IBM Plex Mono'" }}>{fmt(ledgerAcc.balance)}</div>
                  </div>

                  {/* Generate sample ledger rows for selected account */}
                  {vouchers.filter(v=>v.posted).flatMap(v =>
                    v.lines.filter(l=>l.account===ledgerAcc.code).map(l=>({
                      date:v.date, narration:v.narration, voucher:v.number,
                      debit:l.debit, credit:l.credit
                    }))
                  ).map((entry, i, arr) => {
                    const runBal = arr.slice(0,i+1).reduce((s,e)=>s+(e.debit-e.credit),ledgerAcc.balance);
                    return (
                      <div key={i} style={{ display:"grid", gridTemplateColumns:"110px 1fr 120px 130px 130px 130px", borderBottom:`1px solid ${C.border}`, animation:`rowIn 0.15s ease ${i*0.03}s both` }}
                        onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <div style={{ padding:"9px 12px", fontSize:"10px", color:C.muted }}>{entry.date}</div>
                        <div style={{ padding:"9px 12px", fontSize:"11px", color:C.text }}>{entry.narration}</div>
                        <div style={{ padding:"9px 12px", fontSize:"10px", color:C.blue, fontFamily:"'IBM Plex Mono'", cursor:"pointer" }}
                          onClick={()=>setTab("vouchers")}>{entry.voucher}</div>
                        <div style={{ padding:"9px 12px", fontSize:"11px", fontWeight:"700", color:C.blue, fontFamily:"'IBM Plex Mono'" }}>
                          {entry.debit > 0 ? fmt(entry.debit) : ""}
                        </div>
                        <div style={{ padding:"9px 12px", fontSize:"11px", fontWeight:"700", color:C.red, fontFamily:"'IBM Plex Mono'" }}>
                          {entry.credit > 0 ? fmt(entry.credit) : ""}
                        </div>
                        <div style={{ padding:"9px 12px", fontSize:"11px", fontWeight:"800", color:C.text, fontFamily:"'IBM Plex Mono'" }}>
                          {fmt(runBal)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Closing Balance */}
                  <div style={{ display:"grid", gridTemplateColumns:"110px 1fr 120px 130px 130px 130px", background:`${C.green}0a`, borderTop:`2px solid ${C.border2}` }}>
                    <div style={{ padding:"10px 12px", fontSize:"10px", color:C.green, fontWeight:"700" }}>Closing</div>
                    <div style={{ padding:"10px 12px", fontSize:"11px", color:C.green, fontWeight:"700" }}>Balance c/d</div>
                    <div style={{ padding:"10px 12px" }}/>
                    <div style={{ padding:"10px 12px" }}/>
                    <div style={{ padding:"10px 12px" }}/>
                    <div style={{ padding:"10px 12px", fontSize:"14px", fontWeight:"900", color:C.green, fontFamily:"'IBM Plex Mono'" }}>
                      {fmt(ledgerAcc.balance + vouchers.filter(v=>v.posted).flatMap(v=>v.lines.filter(l=>l.account===ledgerAcc.code)).reduce((s,l)=>s+l.debit-l.credit,0))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:C.muted }}>
                <div style={{ fontSize:"48px", marginBottom:"12px", opacity:0.3 }}>📒</div>
                <div style={{ fontSize:"14px", fontWeight:"600" }}>Select an account to view its ledger</div>
                <div style={{ fontSize:"11px", marginTop:"4px" }}>All transactions will be shown with running balance</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TRIAL BALANCE */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === "trial" && (
        <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
          <div style={{ maxWidth:"900px", margin:"0 auto" }}>
            {/* Header */}
            <div style={{ textAlign:"center", marginBottom:"20px" }}>
              <div style={{ fontSize:"11px", color:C.muted, textTransform:"uppercase", letterSpacing:"0.1em" }}>Infosys Pak ERP · Lahore Main Branch</div>
              <div style={{ fontSize:"22px", fontWeight:"900", color:C.text, margin:"4px 0" }}>Trial Balance</div>
              <div style={{ fontSize:"11px", color:C.muted }}>As at 02 March 2024</div>
            </div>

            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", overflow:"hidden" }}>
              {/* Column Headers */}
              <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 160px 160px", background:C.panel, borderBottom:`1px solid ${C.border}` }}>
                {["Code","Account Name","Debit (PKR)","Credit (PKR)"].map(h => (
                  <div key={h} style={{ padding:"10px 14px", fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</div>
                ))}
              </div>

              {/* Group by type */}
              {["Asset","Liability","Equity","Revenue","Expense"].map(type => {
                const accs = leafAccounts.filter(a=>a.type===type);
                if (accs.length === 0) return null;
                const groupDr = accs.filter(a=>a.normal==="debit").reduce((s,a)=>s+a.balance,0);
                const groupCr = accs.filter(a=>a.normal==="credit").reduce((s,a)=>s+a.balance,0);
                return (
                  <div key={type}>
                    <div style={{ padding:"7px 14px", background:`${TYPE_COLOR[type]}0c`, borderBottom:`1px solid ${C.border}`, borderTop:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:"10px", fontWeight:"800", color:TYPE_COLOR[type], textTransform:"uppercase", letterSpacing:"0.07em" }}>{type}s</span>
                    </div>
                    {accs.map((a,i) => (
                      <div key={a.code} style={{ display:"grid", gridTemplateColumns:"80px 1fr 160px 160px", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}
                        onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        onClick={()=>{setTab("ledger");setLedgerAcc(a)}}>
                        <div style={{ padding:"8px 14px", fontSize:"10px", color:C.blue, fontFamily:"'IBM Plex Mono'" }}>{a.code}</div>
                        <div style={{ padding:"8px 14px", fontSize:"11px", color:C.text }}>{a.name}</div>
                        <div style={{ padding:"8px 14px", fontSize:"11px", fontWeight:"700", color:C.blue, fontFamily:"'IBM Plex Mono'", textAlign:"right", paddingRight:"24px" }}>
                          {a.normal==="debit" ? fmt(a.balance) : ""}
                        </div>
                        <div style={{ padding:"8px 14px", fontSize:"11px", fontWeight:"700", color:C.green, fontFamily:"'IBM Plex Mono'", textAlign:"right", paddingRight:"24px" }}>
                          {a.normal==="credit" ? fmt(a.balance) : ""}
                        </div>
                      </div>
                    ))}
                    {/* Group subtotal */}
                    <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 160px 160px", background:`${TYPE_COLOR[type]}08`, borderBottom:`1px solid ${C.border}` }}>
                      <div/>
                      <div style={{ padding:"6px 14px", fontSize:"10px", color:TYPE_COLOR[type], fontWeight:"700" }}>Total {type}s</div>
                      <div style={{ padding:"6px 14px", fontSize:"11px", fontWeight:"800", color:C.blue, fontFamily:"'IBM Plex Mono'", textAlign:"right", paddingRight:"24px" }}>{groupDr>0?fmt(groupDr):""}</div>
                      <div style={{ padding:"6px 14px", fontSize:"11px", fontWeight:"800", color:C.green, fontFamily:"'IBM Plex Mono'", textAlign:"right", paddingRight:"24px" }}>{groupCr>0?fmt(groupCr):""}</div>
                    </div>
                  </div>
                );
              })}

              {/* Grand Total */}
              <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 160px 160px", background:`${C.accent}12`, borderTop:`2px solid ${C.accent}44` }}>
                <div/>
                <div style={{ padding:"12px 14px", fontSize:"13px", fontWeight:"900", color:C.text }}>GRAND TOTAL</div>
                <div style={{ padding:"12px 14px", fontSize:"15px", fontWeight:"900", color:C.blue, fontFamily:"'IBM Plex Mono'", textAlign:"right", paddingRight:"24px" }}>{fmt(tbDebit)}</div>
                <div style={{ padding:"12px 14px", fontSize:"15px", fontWeight:"900", color:C.green, fontFamily:"'IBM Plex Mono'", textAlign:"right", paddingRight:"24px" }}>{fmt(tbCredit)}</div>
              </div>

              {/* Balanced Indicator */}
              <div style={{ padding:"10px 14px", background: Math.abs(tbDebit-tbCredit)<1?`${C.green}12`:`${C.red}12`, borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:"8px" }}>
                <span style={{ fontSize:"16px" }}>{Math.abs(tbDebit-tbCredit)<1?"✅":"❌"}</span>
                <span style={{ fontSize:"12px", fontWeight:"700", color:Math.abs(tbDebit-tbCredit)<1?C.green:C.red }}>
                  {Math.abs(tbDebit-tbCredit)<1 ? "Trial Balance is BALANCED — Debits equal Credits" : `UNBALANCED — Difference: PKR ${fmt(Math.abs(tbDebit-tbCredit))}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PROFIT & LOSS */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === "pl" && (
        <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
          <div style={{ maxWidth:"800px", margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:"20px" }}>
              <div style={{ fontSize:"11px", color:C.muted, textTransform:"uppercase", letterSpacing:"0.1em" }}>Infosys Pak ERP</div>
              <div style={{ fontSize:"22px", fontWeight:"900", color:C.text, margin:"4px 0" }}>Profit & Loss Statement</div>
              <div style={{ fontSize:"11px", color:C.muted }}>For the Period Ending 02 March 2024</div>
            </div>

            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", overflow:"hidden" }}>
              {/* REVENUE */}
              <PLSection title="REVENUE" color={C.green} icon="📈">
                {coa.filter(a=>a.type==="Revenue"&&a.level===3).map(a=>(
                  <PLRow key={a.code} code={a.code} name={a.name} amount={a.balance} color={C.green} indent onClick={()=>{setTab("ledger");setLedgerAcc(a)}}/>
                ))}
                <PLTotal label="Total Revenue" amount={revenue} color={C.green}/>
              </PLSection>

              {/* COGS */}
              <PLSection title="COST OF GOODS SOLD" color={C.red} icon="🏭">
                {coa.filter(a=>a.parent==="5100").map(a=>(
                  <PLRow key={a.code} code={a.code} name={a.name} amount={a.balance} color={C.red} indent onClick={()=>{setTab("ledger");setLedgerAcc(a)}}/>
                ))}
                <PLTotal label="Total COGS" amount={cogs} color={C.red}/>
              </PLSection>

              {/* GROSS PROFIT */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 160px", padding:"12px 20px", background:`${grossProfit>=0?C.green:C.red}18`, borderTop:`2px solid ${grossProfit>=0?C.green:C.red}44` }}>
                <div style={{ fontSize:"14px", fontWeight:"900", color:grossProfit>=0?C.green:C.red }}>GROSS PROFIT</div>
                <div style={{ fontSize:"16px", fontWeight:"900", color:grossProfit>=0?C.green:C.red, fontFamily:"'IBM Plex Mono'", textAlign:"right" }}>PKR {fmt(grossProfit)}</div>
              </div>

              {/* OPERATING EXPENSES */}
              <PLSection title="OPERATING EXPENSES" color={C.yellow} icon="💼">
                {coa.filter(a=>a.parent==="5200").map(a=>(
                  <PLRow key={a.code} code={a.code} name={a.name} amount={a.balance} color={C.yellow} indent onClick={()=>{setTab("ledger");setLedgerAcc(a)}}/>
                ))}
                <PLTotal label="Total Operating Expenses" amount={opex} color={C.yellow}/>
              </PLSection>

              {/* FINANCE COSTS */}
              <PLSection title="FINANCE COSTS" color={C.purple} icon="🏦">
                {coa.filter(a=>a.parent==="5300").map(a=>(
                  <PLRow key={a.code} code={a.code} name={a.name} amount={a.balance} color={C.purple} indent onClick={()=>{setTab("ledger");setLedgerAcc(a)}}/>
                ))}
                <PLTotal label="Total Finance Costs" amount={finCost} color={C.purple}/>
              </PLSection>

              {/* NET PROFIT */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 160px", padding:"16px 20px", background:`${netProfit>=0?C.green:C.red}20`, borderTop:`3px solid ${netProfit>=0?C.green:C.red}` }}>
                <div style={{ fontSize:"16px", fontWeight:"900", color:netProfit>=0?C.green:C.red }}>
                  {netProfit >= 0 ? "✅ NET PROFIT" : "❌ NET LOSS"}
                </div>
                <div style={{ fontSize:"20px", fontWeight:"900", color:netProfit>=0?C.green:C.red, fontFamily:"'IBM Plex Mono'", textAlign:"right" }}>
                  PKR {fmt(netProfit)}
                </div>
              </div>

              {/* Margin metrics */}
              <div style={{ display:"flex", gap:"0", borderTop:`1px solid ${C.border}` }}>
                {[
                  { l:"Gross Margin", v:`${((grossProfit/revenue)*100).toFixed(1)}%`, col:C.green },
                  { l:"Operating Margin", v:`${(((grossProfit-opex)/revenue)*100).toFixed(1)}%`, col:C.teal },
                  { l:"Net Margin", v:`${((netProfit/revenue)*100).toFixed(1)}%`, col:netProfit>=0?C.green:C.red },
                  { l:"COGS Ratio", v:`${((cogs/revenue)*100).toFixed(1)}%`, col:C.yellow },
                ].map((m,i) => (
                  <div key={m.l} style={{ flex:1, padding:"12px 16px", borderLeft:i>0?`1px solid ${C.border}`:"none", textAlign:"center" }}>
                    <div style={{ fontSize:"9px", color:C.muted, fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"4px" }}>{m.l}</div>
                    <div style={{ fontSize:"18px", fontWeight:"900", color:m.col }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* BALANCE SHEET */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === "bs" && (
        <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
          <div style={{ maxWidth:"900px", margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:"20px" }}>
              <div style={{ fontSize:"11px", color:C.muted, textTransform:"uppercase", letterSpacing:"0.1em" }}>Infosys Pak ERP</div>
              <div style={{ fontSize:"22px", fontWeight:"900", color:C.text, margin:"4px 0" }}>Balance Sheet</div>
              <div style={{ fontSize:"11px", color:C.muted }}>As at 02 March 2024</div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
              {/* ASSETS SIDE */}
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", overflow:"hidden" }}>
                <div style={{ padding:"12px 16px", background:`${C.blue}15`, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:"8px" }}>
                  <span style={{ fontSize:"16px" }}>🏦</span>
                  <span style={{ fontSize:"13px", fontWeight:"900", color:C.blue }}>ASSETS</span>
                </div>

                {/* Current Assets */}
                <BSGroup title="Current Assets" color={C.blue}>
                  {coa.filter(a=>a.parent==="1100").map(a=>(
                    <BSRow key={a.code} name={a.name} amount={a.balance} onClick={()=>{setTab("ledger");setLedgerAcc(a)}}/>
                  ))}
                  <BSSubtotal label="Total Current Assets" amount={coa.filter(a=>a.parent==="1100").reduce((s,a)=>s+a.balance,0)} color={C.blue}/>
                </BSGroup>

                {/* Inventory */}
                <BSGroup title="Inventory" color={C.teal}>
                  {coa.filter(a=>a.parent==="1200").map(a=>(
                    <BSRow key={a.code} name={a.name} amount={a.balance} onClick={()=>{setTab("ledger");setLedgerAcc(a)}}/>
                  ))}
                  <BSSubtotal label="Total Inventory" amount={coa.filter(a=>a.parent==="1200").reduce((s,a)=>s+a.balance,0)} color={C.teal}/>
                </BSGroup>

                {/* Fixed Assets */}
                <BSGroup title="Fixed Assets" color={C.purple}>
                  {coa.filter(a=>a.parent==="1300").map(a=>(
                    <BSRow key={a.code} name={a.name} amount={a.balance} onClick={()=>{setTab("ledger");setLedgerAcc(a)}}/>
                  ))}
                  <BSSubtotal label="Total Fixed Assets" amount={coa.filter(a=>a.parent==="1300").reduce((s,a)=>s+a.balance,0)} color={C.purple}/>
                </BSGroup>

                <div style={{ padding:"12px 16px", background:`${C.blue}18`, borderTop:`2px solid ${C.blue}44`, display:"grid", gridTemplateColumns:"1fr auto" }}>
                  <span style={{ fontSize:"13px", fontWeight:"900", color:C.blue }}>TOTAL ASSETS</span>
                  <span style={{ fontSize:"16px", fontWeight:"900", color:C.blue, fontFamily:"'IBM Plex Mono'" }}>PKR {fmt(totalAssets)}</span>
                </div>
              </div>

              {/* LIABILITIES + EQUITY SIDE */}
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", overflow:"hidden" }}>
                <div style={{ padding:"12px 16px", background:`${C.red}15`, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:"8px" }}>
                  <span style={{ fontSize:"16px" }}>📋</span>
                  <span style={{ fontSize:"13px", fontWeight:"900", color:C.red }}>LIABILITIES & EQUITY</span>
                </div>

                {/* Current Liabilities */}
                <BSGroup title="Current Liabilities" color={C.red}>
                  {coa.filter(a=>a.parent==="2100").map(a=>(
                    <BSRow key={a.code} name={a.name} amount={a.balance} onClick={()=>{setTab("ledger");setLedgerAcc(a)}}/>
                  ))}
                  <BSSubtotal label="Total Current Liabilities" amount={coa.filter(a=>a.parent==="2100").reduce((s,a)=>s+a.balance,0)} color={C.red}/>
                </BSGroup>

                {/* Long-term Liabilities */}
                <BSGroup title="Long-term Liabilities" color={C.yellow}>
                  {coa.filter(a=>a.parent==="2200").map(a=>(
                    <BSRow key={a.code} name={a.name} amount={a.balance} onClick={()=>{setTab("ledger");setLedgerAcc(a)}}/>
                  ))}
                  <BSSubtotal label="Total Long-term Liabilities" amount={coa.filter(a=>a.parent==="2200").reduce((s,a)=>s+a.balance,0)} color={C.yellow}/>
                </BSGroup>

                {/* Equity */}
                <BSGroup title="Owner's Equity" color={C.purple}>
                  {coa.filter(a=>a.type==="Equity"&&a.level===2).map(a=>(
                    <BSRow key={a.code} name={a.name} amount={a.normal==="debit"?-a.balance:a.balance} onClick={()=>{setTab("ledger");setLedgerAcc(a)}}/>
                  ))}
                  <BSRow name="Net Profit (Current Period)" amount={netProfit}/>
                  <BSSubtotal label="Total Equity" amount={totalEquity} color={C.purple}/>
                </BSGroup>

                <div style={{ padding:"12px 16px", background:`${C.red}18`, borderTop:`2px solid ${C.red}44`, display:"grid", gridTemplateColumns:"1fr auto" }}>
                  <span style={{ fontSize:"12px", fontWeight:"900", color:C.red }}>TOTAL LIABILITIES + EQUITY</span>
                  <span style={{ fontSize:"16px", fontWeight:"900", color:C.red, fontFamily:"'IBM Plex Mono'" }}>PKR {fmt(totalLiab + totalEquity)}</span>
                </div>
              </div>
            </div>

            {/* Balance Check */}
            <div style={{ marginTop:"12px", padding:"14px 20px", background:Math.abs(totalAssets-(totalLiab+totalEquity))<1?`${C.green}12`:`${C.red}12`, border:`1px solid ${Math.abs(totalAssets-(totalLiab+totalEquity))<1?C.green:C.red}44`, borderRadius:"10px", display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ fontSize:"20px" }}>{Math.abs(totalAssets-(totalLiab+totalEquity))<1?"⚖️":"❌"}</span>
              <div>
                <div style={{ fontSize:"13px", fontWeight:"800", color:Math.abs(totalAssets-(totalLiab+totalEquity))<1?C.green:C.red }}>
                  {Math.abs(totalAssets-(totalLiab+totalEquity))<1 ? "Balance Sheet is BALANCED — Assets = Liabilities + Equity" : "UNBALANCED Balance Sheet!"}
                </div>
                <div style={{ fontSize:"10px", color:C.muted }}>Assets: PKR {fmt(totalAssets)} = Liabilities: PKR {fmt(totalLiab)} + Equity: PKR {fmt(totalEquity)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VOUCHER FORM MODAL ── */}
      {showVoucherForm && <VoucherForm type={showVoucherForm} coa={coa} onClose={()=>setShowVoucherForm(null)}
        onSave={(v)=>{ setVouchers(prev=>[v,...prev]); setShowVoucherForm(null); notify(`${v.number} saved as draft`); }}/>}

      {/* NOTIFICATION */}
      {notification && (
        <div style={{ position:"fixed", top:"16px", left:"50%", transform:"translateX(-50%)", zIndex:400, background:notification.type==="error"?C.red:C.green, color:"#fff", padding:"10px 18px", borderRadius:"8px", fontSize:"12px", fontWeight:"700", boxShadow:"0 8px 24px rgba(0,0,0,0.4)", animation:"slideIn 0.2s ease", whiteSpace:"nowrap" }}>
          {notification.type==="error"?"✕":"✓"} {notification.msg}
        </div>
      )}
    </div>
  );
}

// ── COA Tree Row ──────────────────────────────────────────────────
function CoaGroup({ account, coa, accountMap, expanded, toggle, level, onSelect, selectedAcc }) {
  const kids = coa.filter(a => a.parent === account.code);
  const hasKids = kids.length > 0;
  const isExpanded = expanded.has(account.code);
  const isLeaf = !hasKids;
  const acc = accountMap[account.code] || account;
  const indent = level * 22;

  return (
    <>
      <div style={{ display:"grid", gridTemplateColumns:"120px 1fr 100px 140px 140px 100px", borderBottom:`1px solid ${C.border}`, cursor:"pointer", background:selectedAcc?.code===acc.code?`${TYPE_COLOR[acc.type]}0c`:"transparent" }}
        onMouseEnter={e=>{ if(selectedAcc?.code!==acc.code) e.currentTarget.style.background=C.panel }}
        onMouseLeave={e=>{ if(selectedAcc?.code!==acc.code) e.currentTarget.style.background="transparent" }}
        onClick={()=>{ if(isLeaf) onSelect(acc); else toggle(account.code); }}>
        <div style={{ padding:"8px 12px", fontSize:"10px", color:C.blue, fontFamily:"'IBM Plex Mono'", display:"flex", alignItems:"center" }}>
          <span style={{ marginLeft:indent>0?indent/2:0 }}>{acc.code}</span>
        </div>
        <div style={{ padding:"8px 12px", display:"flex", alignItems:"center", gap:"6px" }}>
          {!isLeaf && <span style={{ fontSize:"10px", color:C.muted, marginLeft:indent }}>{isExpanded?"▼":"▶"}</span>}
          {isLeaf && <span style={{ marginLeft:indent+12 }}/>}
          <span style={{ fontSize:isLeaf?"11px":acc.level===1?"13px":"12px", fontWeight:isLeaf?"500":acc.level===1?"900":"700", color:C.text }}>{acc.name}</span>
          {isLeaf && <Tag l={acc.type} col={TYPE_COLOR[acc.type]}/>}
        </div>
        <div style={{ padding:"8px 12px", display:"flex", alignItems:"center" }}>
          {isLeaf && <Tag l={acc.normal} col={acc.normal==="debit"?C.blue:C.green}/>}
        </div>
        <div style={{ padding:"8px 12px", fontSize:"11px", fontWeight:"700", color:C.blue, fontFamily:"'IBM Plex Mono'", display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:"20px" }}>
          {acc.normal === "debit" && acc.balance > 0 ? fmt(acc.balance) : ""}
        </div>
        <div style={{ padding:"8px 12px", fontSize:"11px", fontWeight:"700", color:C.green, fontFamily:"'IBM Plex Mono'", display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:"20px" }}>
          {acc.normal === "credit" && acc.balance > 0 ? fmt(acc.balance) : ""}
        </div>
        <div style={{ padding:"8px 12px", display:"flex", alignItems:"center", gap:"4px" }}>
          {isLeaf && <button onClick={e=>{e.stopPropagation();onSelect(acc)}} style={{ padding:"3px 7px", borderRadius:"4px", border:`1px solid ${C.border}`, background:"transparent", color:C.blue, cursor:"pointer", fontSize:"9px" }}>View</button>}
        </div>
      </div>
      {!isLeaf && isExpanded && kids.map(kid => (
        <CoaGroup key={kid.code} account={accountMap[kid.code]||kid} coa={coa} accountMap={accountMap}
          expanded={expanded} toggle={toggle} level={level+1} onSelect={onSelect} selectedAcc={selectedAcc}/>
      ))}
    </>
  );
}

// ── P&L helpers ───────────────────────────────────────────────────
function PLSection({ title, color, icon, children }) {
  return (
    <div>
      <div style={{ padding:"9px 20px", background:`${color}0c`, borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:"7px" }}>
        <span>{icon}</span>
        <span style={{ fontSize:"10px", fontWeight:"800", color, textTransform:"uppercase", letterSpacing:"0.07em" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
function PLRow({ code, name, amount, color, indent, onClick }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 160px", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}
      onMouseEnter={e=>e.currentTarget.style.background=C.panel} onMouseLeave={e=>e.currentTarget.style.background="transparent"}
      onClick={onClick}>
      <div style={{ padding:"8px 20px 8px "+(indent?"40px":"20px"), fontSize:"11px", color:C.text }}>{name}</div>
      <div style={{ padding:"8px 20px", fontSize:"11px", fontWeight:"700", color, fontFamily:"'IBM Plex Mono'", textAlign:"right" }}>
        {fmt(amount)}
      </div>
    </div>
  );
}
function PLTotal({ label, amount, color }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 160px", background:`${color}08`, borderBottom:`1px solid ${C.border}` }}>
      <div style={{ padding:"7px 20px", fontSize:"10px", fontWeight:"800", color }}>{label}</div>
      <div style={{ padding:"7px 20px", fontSize:"12px", fontWeight:"900", color, fontFamily:"'IBM Plex Mono'", textAlign:"right" }}>PKR {fmt(amount)}</div>
    </div>
  );
}

// ── Balance Sheet helpers ─────────────────────────────────────────
function BSGroup({ title, color, children }) {
  return (
    <div>
      <div style={{ padding:"7px 14px", background:`${color}0c`, borderBottom:`1px solid ${C.border}` }}>
        <span style={{ fontSize:"10px", fontWeight:"700", color }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
function BSRow({ name, amount, onClick }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr auto", padding:"7px 14px", borderBottom:`1px solid ${C.border}`, cursor:onClick?"pointer":"default" }}
      onMouseEnter={e=>{ if(onClick) e.currentTarget.style.background=C.panel }}
      onMouseLeave={e=>{ if(onClick) e.currentTarget.style.background="transparent" }}
      onClick={onClick}>
      <span style={{ fontSize:"11px", color:C.text, paddingLeft:"12px" }}>{name}</span>
      <span style={{ fontSize:"11px", fontWeight:"700", color:amount>=0?C.text:C.red, fontFamily:"'IBM Plex Mono'" }}>{fmt(Math.abs(amount))}</span>
    </div>
  );
}
function BSSubtotal({ label, amount, color }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr auto", padding:"6px 14px", background:`${color}0a`, borderBottom:`1px solid ${C.border}` }}>
      <span style={{ fontSize:"10px", fontWeight:"800", color }}>{label}</span>
      <span style={{ fontSize:"12px", fontWeight:"900", color, fontFamily:"'IBM Plex Mono'" }}>PKR {fmt(amount)}</span>
    </div>
  );
}

// ── VOUCHER FORM MODAL ────────────────────────────────────────────
function VoucherForm({ type, coa, onClose, onSave }) {
  const leafAccounts = coa.filter(a => !coa.some(b => b.parent === a.code));
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [narration, setNarration] = useState("");
  const [ref, setRef] = useState("");
  const [lines, setLines] = useState([
    { account: type.includes("Cash")?"1110":type.includes("Bank")?"1120":"5210", debit:0, credit:0 },
    { account:"4110", debit:0, credit:0 },
  ]);

  const prefixMap = { "Cash Receipt":"CRV","Cash Payment":"CPV","Bank Receipt":"BRV","Bank Payment":"BPV","Journal":"JV" };
  const totalDr = lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0);
  const totalCr = lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0);
  const balanced = Math.abs(totalDr-totalCr) < 0.01 && totalDr > 0;

  const addLine = () => setLines(prev=>[...prev,{account:leafAccounts[0]?.code||"",debit:0,credit:0}]);
  const removeLine = i => setLines(prev=>prev.filter((_,idx)=>idx!==i));
  const updateLine = (i,field,val) => setLines(prev=>prev.map((l,idx)=>idx===i?{...l,[field]:val}:l));

  const handleSave = () => {
    const prefix = prefixMap[type] || "JV";
    const number = `${prefix}-2024-${String(Math.floor(Math.random()*900)+100)}`;
    onSave({
      id:`v${Date.now()}`, number, type, date, narration, ref, posted:false, createdBy:"Admin",
      lines: lines.map(l=>({ account:l.account, label:leafAccounts.find(a=>a.code===l.account)?.name||l.account, debit:parseFloat(l.debit)||0, credit:parseFloat(l.credit)||0 }))
    });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"14px", width:"620px", maxHeight:"88vh", overflow:"hidden", display:"flex", flexDirection:"column", animation:"slideIn 0.2s ease" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:C.panel }}>
          <div>
            <div style={{ fontWeight:"900", fontSize:"15px", color:C.text }}>{type} Voucher</div>
            <div style={{ fontSize:"10px", color:C.muted }}>Double-entry accounting entry</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"18px" }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
          {/* Meta fields */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px", marginBottom:"20px" }}>
            {[
              { l:"Date", node:<input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px", color:C.text, fontSize:"12px", outline:"none" }}/> },
              { l:"Reference No.", node:<input value={ref} onChange={e=>setRef(e.target.value)} placeholder="e.g. INV-2024-XXXX" style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px", color:C.text, fontSize:"12px", outline:"none" }}/> },
            ].map(f=>(
              <div key={f.l}>
                <label style={{ fontSize:"9px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>{f.l}</label>
                {f.node}
              </div>
            ))}
          </div>
          <div style={{ marginBottom:"20px" }}>
            <label style={{ fontSize:"9px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Narration / Description</label>
            <textarea value={narration} onChange={e=>setNarration(e.target.value)} rows={2} placeholder="Brief description of this transaction..."
              style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px", color:C.text, fontSize:"12px", outline:"none", resize:"vertical" }}/>
          </div>

          {/* Journal Lines */}
          <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>Journal Lines</div>
          <div style={{ border:`1px solid ${C.border}`, borderRadius:"8px", overflow:"hidden", marginBottom:"10px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 140px 36px", background:C.panel, padding:"7px 10px", gap:"8px" }}>
              {["Account","Debit (PKR)","Credit (PKR)",""].map(h=>(
                <div key={h} style={{ fontSize:"9px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</div>
              ))}
            </div>
            {lines.map((line,i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 140px 140px 36px", gap:"8px", padding:"7px 10px", borderTop:`1px solid ${C.border}` }}>
                <select value={line.account} onChange={e=>updateLine(i,"account",e.target.value)}
                  style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"7px", color:C.text, fontSize:"11px", outline:"none" }}>
                  {leafAccounts.map(a=><option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                </select>
                <input type="number" min="0" value={line.debit||""} onChange={e=>updateLine(i,"debit",e.target.value)} placeholder="0"
                  style={{ background:C.input, border:`1px solid ${parseFloat(line.debit)>0?C.blue:C.border}`, borderRadius:"6px", padding:"7px", color:C.blue, fontSize:"12px", fontWeight:"700", outline:"none", fontFamily:"'IBM Plex Mono'", textAlign:"right" }}/>
                <input type="number" min="0" value={line.credit||""} onChange={e=>updateLine(i,"credit",e.target.value)} placeholder="0"
                  style={{ background:C.input, border:`1px solid ${parseFloat(line.credit)>0?C.green:C.border}`, borderRadius:"6px", padding:"7px", color:C.green, fontSize:"12px", fontWeight:"700", outline:"none", fontFamily:"'IBM Plex Mono'", textAlign:"right" }}/>
                <button onClick={()=>removeLine(i)} disabled={lines.length<=2} style={{ background:"none", border:"none", color:lines.length<=2?C.muted2:C.red, cursor:lines.length<=2?"not-allowed":"pointer", fontSize:"14px", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              </div>
            ))}
            {/* Totals Row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 140px 36px", gap:"8px", padding:"8px 10px", borderTop:`2px solid ${C.border2}`, background:C.panel }}>
              <div style={{ fontSize:"11px", fontWeight:"700", color:C.text }}>
                TOTAL {balanced && <span style={{ color:C.green }}>✓ Balanced</span>}
                {!balanced && totalDr > 0 && <span style={{ color:C.red }}>✗ Diff: {fmt(Math.abs(totalDr-totalCr))}</span>}
              </div>
              <div style={{ fontSize:"13px", fontWeight:"900", color:C.blue, fontFamily:"'IBM Plex Mono'", textAlign:"right", padding:"4px 7px" }}>{fmt(totalDr)}</div>
              <div style={{ fontSize:"13px", fontWeight:"900", color:C.green, fontFamily:"'IBM Plex Mono'", textAlign:"right", padding:"4px 7px" }}>{fmt(totalCr)}</div>
              <div/>
            </div>
          </div>
          <button onClick={addLine} style={{ padding:"7px 14px", borderRadius:"7px", border:`1px dashed ${C.border2}`, background:"transparent", color:C.muted, cursor:"pointer", fontSize:"11px", width:"100%" }}>
            + Add Line
          </button>
        </div>
        <div style={{ padding:"14px 20px", borderTop:`1px solid ${C.border}`, display:"flex", gap:"8px" }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px", borderRadius:"8px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontWeight:"600" }}>Cancel</button>
          <button onClick={handleSave} disabled={!narration||!balanced} style={{ flex:1, padding:"10px", borderRadius:"8px", border:"none", background:narration&&balanced?`${VOUCHER_COLOR[type]}`:C.muted2, color:"#fff", cursor:narration&&balanced?"pointer":"not-allowed", fontWeight:"800" }}>
            💾 Save as Draft
          </button>
          <button onClick={()=>{if(balanced&&narration){const v={id:`v${Date.now()}`,number:`${({"Cash Receipt":"CRV","Cash Payment":"CPV","Bank Receipt":"BRV","Bank Payment":"BPV","Journal":"JV"}[type]||"JV")}-2024-${Math.floor(Math.random()*900)+100}`,type,date,narration,ref,posted:true,createdBy:"Admin",lines:lines.map(l=>({account:l.account,label:coa.find(a=>a.code===l.account)?.name||l.account,debit:parseFloat(l.debit)||0,credit:parseFloat(l.credit)||0}))};onSave(v)}}} disabled={!narration||!balanced} style={{ flex:1, padding:"10px", borderRadius:"8px", border:"none", background:narration&&balanced?C.green:C.muted2, color:"#fff", cursor:narration&&balanced?"pointer":"not-allowed", fontWeight:"800" }}>
            ✓ Post Voucher
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useContext, createContext, useCallback, useMemo } from "react";

// ================================================================
// INFOSYS PAK ERP — STEP 11: FULL URDU RTL INTEGRATION
// ================================================================
// ► Live EN ↔ اردو switching — full RTL layout engine
// ► Complete translation dictionary for all 10 modules
// ► RTL-aware: sidebar flips, text aligns, icons mirror, numbers stay LTR
// ► Noto Nastaliq Urdu font for authentic Nastaliq calligraphy
// ► Urdu number formatting (۰۱۲۳۴۵۶۷۸۹)
// ► Demo: every major screen shown in both languages side-by-side
// ================================================================

// ── PALETTE ──────────────────────────────────────────────────────
const C = {
  bg:"#060a10", panel:"#090f1a", card:"#0d1825", card2:"#0b1520",
  border:"#162030", border2:"#1e2e40", text:"#dce4f0", muted:"#4a6070",
  muted2:"#111e2c", accent:"#f97316", blue:"#3b82f6", green:"#10b981",
  red:"#ef4444", yellow:"#f59e0b", purple:"#8b5cf6", teal:"#06b6d4",
  pink:"#ec4899", lime:"#84cc16", input:"#070f1a", header:"#050910",
};

// ── URDU NUMBER SYSTEM ────────────────────────────────────────────
const UR_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
const toUrduNum = n => String(Math.round(Math.abs(n)))
  .replace(/\d/g, d => UR_DIGITS[+d]);
const fmtUrdu = n => {
  const s = Math.round(Math.abs(n)).toString();
  const parts = [];
  let i = s.length;
  while (i > 0) { parts.unshift(s.slice(Math.max(0,i-3),i)); i-=3; }
  return parts.join(',').replace(/\d/g, d => UR_DIGITS[+d]);
};
const fmtEN  = n => new Intl.NumberFormat("en-PK").format(Math.round(Math.abs(n)));

// ── LANGUAGE CONTEXT ──────────────────────────────────────────────
const LangCtx = createContext({ lang:"en", t:k=>k, fmt:fmtEN, dir:"ltr" });
const useLang = () => useContext(LangCtx);

// ══════════════════════════════════════════════════════════════════
// FULL TRANSLATION DICTIONARY
// ══════════════════════════════════════════════════════════════════
const DICT = {
  // ── NAVIGATION ──
  "Dashboard":           "ڈیش بورڈ",
  "POS Terminal":        "پوائنٹ آف سیل",
  "Inventory":           "انوینٹری",
  "Procurement":         "خریداری",
  "Sales":               "فروخت",
  "Accounting":          "اکاؤنٹنگ",
  "Reports":             "رپورٹس",
  "HR & Payroll":        "انسانی وسائل",
  "Print Designer":      "پرنٹ ڈیزائنر",
  "Settings":            "ترتیبات",
  "Super Admin":         "سپر ایڈمن",
  "Logout":              "لاگ آؤٹ",

  // ── COMMON ACTIONS ──
  "Search":              "تلاش",
  "Add":                 "شامل کریں",
  "Edit":                "ترمیم",
  "Delete":              "حذف",
  "Save":                "محفوظ",
  "Cancel":              "منسوخ",
  "Export":              "برآمد",
  "Print":               "پرنٹ",
  "Close":               "بند",
  "Approve":             "منظور",
  "Reject":              "رد",
  "View":                "دیکھیں",
  "Filter":              "فلٹر",
  "All":                 "تمام",
  "Submit":              "جمع کریں",
  "Reset":               "دوبارہ ترتیب",
  "Send":                "بھیجیں",
  "Download":            "ڈاؤن لوڈ",
  "New":                 "نئی",
  "Back":                "واپس",
  "Next":                "اگلا",
  "Total":               "کل",
  "Status":              "حیثیت",
  "Date":                "تاریخ",
  "Amount":              "رقم",
  "Description":         "تفصیل",
  "Notes":               "نوٹس",
  "Actions":             "اقدامات",
  "Type":                "قسم",
  "Name":                "نام",
  "Code":                "کوڈ",
  "City":                "شہر",
  "Phone":               "فون",
  "Email":               "ای میل",
  "Address":             "پتہ",
  "Balance":             "بیلنس",

  // ── STATUS LABELS ──
  "Active":              "فعال",
  "Inactive":            "غیر فعال",
  "Pending":             "زیر التوا",
  "Approved":            "منظور شدہ",
  "Rejected":            "مسترد",
  "Draft":               "مسودہ",
  "Paid":                "ادا شدہ",
  "Unpaid":              "غیر ادا",
  "Partial":             "جزوی",
  "Processing":          "کارروائی جاری",
  "Complete":            "مکمل",
  "On Leave":            "چھٹی پر",

  // ── DASHBOARD ──
  "Today's Sales":       "آج کی فروخت",
  "Total Invoices":      "کل انوائسز",
  "FBR Pending":         "ایف بی آر زیر التوا",
  "Low Stock Items":     "کم اسٹاک اشیاء",
  "Receivables Due":     "وصولیاں واجب الادا",
  "Net Profit":          "خالص منافع",
  "Recent Invoices":     "حالیہ انوائسز",
  "Quick Actions":       "فوری اقدامات",
  "New Invoice":         "نئی انوائس",
  "Add Product":         "پراڈکٹ شامل کریں",
  "Add Customer":        "گاہک شامل کریں",
  "Cash Receipt":        "نقد وصولی",
  "View Reports":        "رپورٹس دیکھیں",
  "Z-Report":            "زیڈ رپورٹ",
  "FBR Online":          "ایف بی آر آن لائن",
  "FBR Offline":         "ایف بی آر آف لائن",

  // ── POS ──
  "Point of Sale":       "نقطہ فروخت",
  "Cart":                "کارٹ",
  "Customer":            "گاہک",
  "Product":             "پراڈکٹ",
  "Quantity":            "مقدار",
  "Unit Price":          "فی یونٹ قیمت",
  "Subtotal":            "ذیلی کل",
  "Discount":            "رعایت",
  "Tax":                 "ٹیکس",
  "Grand Total":         "مجموعی کل",
  "Cash":                "نقد",
  "Bank Transfer":       "بینک منتقلی",
  "Credit":              "ادھار",
  "Payment":             "ادائیگی",
  "Receipt":             "رسید",
  "Change Due":          "واپسی رقم",
  "Barcode":             "بار کوڈ",
  "Scan":                "اسکین",
  "Checkout":            "چیک آؤٹ",
  "Payment Mode":        "ادائیگی کا طریقہ",
  "FBR Sync":            "ایف بی آر سنک",

  // ── INVENTORY ──
  "Products":            "پراڈکٹس",
  "Stock":               "اسٹاک",
  "Warehouse":           "گودام",
  "Category":            "زمرہ",
  "SKU":                 "ایس کے یو",
  "In Stock":            "اسٹاک میں",
  "Out of Stock":        "اسٹاک ختم",
  "Low Stock":           "کم اسٹاک",
  "Stock Transfer":      "اسٹاک منتقلی",
  "Stock Adjustment":    "اسٹاک ایڈجسٹمنٹ",
  "Variants":            "اقسام",
  "Color":               "رنگ",
  "Size":                "سائز",
  "Fabric":              "کپڑا",
  "Season":              "موسم",
  "Reorder Level":       "دوبارہ آرڈر سطح",

  // ── PROCUREMENT ──
  "Purchase Order":      "خریداری آرڈر",
  "Purchase Orders":     "خریداری آرڈرز",
  "Vendor":              "سپلائر",
  "Vendors":             "سپلائرز",
  "GRN":                 "جی آر این",
  "Goods Receipt":       "مال کی وصولی",
  "Payment Terms":       "ادائیگی کی شرائط",
  "Credit Limit":        "کریڈٹ حد",
  "Outstanding":         "باقی",
  "AP Aging":            "دیناداران کی عمر",
  "Approved":            "منظور شدہ",
  "Receive":             "وصول کریں",
  "Unit Cost":           "فی یونٹ لاگت",
  "Received":            "وصول شدہ",
  "Accepted":            "قبول شدہ",
  "Rejected Items":      "مسترد اشیاء",

  // ── SALES & LEDGER ──
  "Invoice":             "انوائس",
  "Invoices":            "انوائسز",
  "Sales Return":        "فروخت واپسی",
  "Credit Note":         "کریڈٹ نوٹ",
  "Debit Note":          "ڈیبٹ نوٹ",
  "Receivables":         "وصولیاں",
  "Payables":            "ادائیگیاں",
  "Ledger":              "کھاتہ",
  "Account Statement":   "حساب کا بیان",
  "AR Aging":            "وصولیوں کی عمر",
  "Collections":         "وصولیاں",
  "Outstanding Balance": "باقی بیلنس",

  // ── ACCOUNTING ──
  "Chart of Accounts":   "کھاتوں کا خاکہ",
  "Voucher":             "واؤچر",
  "Journal":             "جرنل",
  "Debit":               "ڈیبٹ",
  "Credit":              "کریڈٹ",
  "Trial Balance":       "آزمائشی توازن",
  "Profit & Loss":       "منافع و نقصان",
  "Balance Sheet":       "توازن نامہ",
  "General Ledger":      "عمومی کھاتہ",
  "Opening Balance":     "ابتدائی بیلنس",
  "Closing Balance":     "اختتامی بیلنس",
  "Assets":              "اثاثے",
  "Liabilities":         "واجبات",
  "Equity":              "حصص",
  "Revenue":             "آمدن",
  "Expenses":            "اخراجات",

  // ── HR ──
  "Employees":           "ملازمین",
  "Employee":            "ملازم",
  "Attendance":          "حاضری",
  "Payroll":             "تنخواہ",
  "Leave Management":    "چھٹی انتظام",
  "Leave Request":       "چھٹی کی درخواست",
  "Annual Leave":        "سالانہ چھٹی",
  "Sick Leave":          "بیماری چھٹی",
  "Casual Leave":        "اتفاقی چھٹی",
  "Department":          "محکمہ",
  "Designation":         "عہدہ",
  "Basic Salary":        "بنیادی تنخواہ",
  "Allowances":          "الاؤنسز",
  "Deductions":          "کٹوتیاں",
  "Net Pay":             "خالص تنخواہ",
  "Gross Salary":        "مجموعی تنخواہ",
  "EOBI":                "ای او بی آئی",
  "Income Tax":          "آمدن ٹیکس",
  "Present":             "حاضر",
  "Absent":              "غیر حاضر",
  "Late":                "دیر",
  "Half Day":            "نصف روز",
  "Holiday":             "چھٹی",
  "Joining Date":        "شمولیت کی تاریخ",
  "Gender":              "صنف",
  "CNIC":                "شناختی کارڈ",
  "Process Payroll":     "تنخواہ پروسیس کریں",
  "Send Payslips":       "تنخواہ سلپ بھیجیں",

  // ── REPORTS / FBR ──
  "Sales Report":        "فروخت رپورٹ",
  "Product Report":      "پراڈکٹ رپورٹ",
  "Aging Report":        "عمر رپورٹ",
  "FBR Integration":     "ایف بی آر انضمام",
  "Synced":              "مطابقت شدہ",
  "Failed":              "ناکام",
  "Queue":               "قطار",
  "Transmission":        "ترسیل",

  // ── COMPANY / SETTINGS ──
  "Company":             "کمپنی",
  "Branch":              "شاخ",
  "NTN":                 "این ٹی این",
  "STRN":                "ایس ٹی آر این",
  "Language":            "زبان",
  "Currency":            "کرنسی",
  "English":             "انگریزی",
  "Urdu":                "اردو",
  "Lahore":              "لاہور",
  "Karachi":             "کراچی",
  "Islamabad":           "اسلام آباد",
  "Faisalabad":          "فیصل آباد",
  "Rawalpindi":          "راولپنڈی",

  // ── MONTHS ──
  "January":  "جنوری", "February": "فروری",  "March":    "مارچ",
  "April":    "اپریل", "May":       "مئی",    "June":     "جون",
  "July":     "جولائی","August":    "اگست",   "September":"ستمبر",
  "October":  "اکتوبر","November":  "نومبر",  "December": "دسمبر",

  // ── MISC ──
  "Al-Baraka Textiles":  "البرکہ ٹیکسٹائلز",
  "Infosys Pak ERP":     "انفوسس پاک ای آر پی",
  "Powered by":          "کی طاقت سے",
  "Version":             "ورژن",
  "Loading":             "لوڈ ہو رہا ہے",
  "No data":             "کوئی ڈیٹا نہیں",
  "Search results":      "تلاش کے نتائج",
  "Confirm":             "تصدیق",
  "Warning":             "انتباہ",
  "Success":             "کامیابی",
  "Error":               "خرابی",
  "Today":               "آج",
  "This Month":          "اس مہینے",
  "Last 30 Days":        "گزشتہ ۳۰ دن",
  "Analytics":           "تجزیات",
  "Overview":            "جائزہ",
  "Summary":             "خلاصہ",
  "Details":             "تفصیلات",
};

// ── NAV ITEMS ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon:"📊", en:"Dashboard",      ur:"ڈیش بورڈ",   key:"dashboard"  },
  { icon:"🧾", en:"POS Terminal",   ur:"پوائنٹ آف سیل",key:"pos"       },
  { icon:"📦", en:"Inventory",      ur:"انوینٹری",    key:"inventory"  },
  { icon:"🛒", en:"Procurement",    ur:"خریداری",     key:"procurement"},
  { icon:"💼", en:"Sales",          ur:"فروخت",       key:"sales"      },
  { icon:"📒", en:"Accounting",     ur:"اکاؤنٹنگ",    key:"accounting" },
  { icon:"📈", en:"Reports",        ur:"رپورٹس",      key:"reports"    },
  { icon:"👥", en:"HR & Payroll",   ur:"انسانی وسائل",key:"hr"         },
  { icon:"🖨",  en:"Print Designer", ur:"پرنٹ ڈیزائنر",key:"print"      },
  { icon:"⚙",  en:"Settings",       ur:"ترتیبات",     key:"settings"   },
];

const DEMO_SCREENS = [
  "dashboard","pos","inventory","procurement","accounting","hr","ledger","settings",
];

const DEMO_LABELS = {
  dashboard:   {en:"Dashboard",      ur:"ڈیش بورڈ"},
  pos:         {en:"POS Terminal",   ur:"پوائنٹ آف سیل"},
  inventory:   {en:"Inventory",      ur:"انوینٹری"},
  procurement: {en:"Procurement",    ur:"خریداری"},
  accounting:  {en:"Accounting",     ur:"اکاؤنٹنگ"},
  hr:          {en:"HR & Payroll",   ur:"انسانی وسائل"},
  ledger:      {en:"Ledger",         ur:"کھاتہ"},
  settings:    {en:"Settings",       ur:"ترتیبات"},
};

// ═══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════
const Tag = ({l, col, sm}) => (
  <span style={{fontSize:sm?"9px":"10px",fontWeight:"700",padding:sm?"1px 6px":"2px 9px",borderRadius:"20px",
    background:`${col}18`,color:col,border:`1px solid ${col}28`,whiteSpace:"nowrap"}}>{l}</span>
);

const Btn = ({onClick,children,color=C.blue,outline=false,sm=false,full=false,disabled=false}) => (
  <button onClick={onClick} disabled={disabled} style={{width:full?"100%":"auto",padding:sm?"5px 12px":"9px 18px",borderRadius:"7px",
    border:outline?`1px solid ${color}55`:"none",background:disabled?"#1a2a3a":outline?`${color}0e`:color,
    color:disabled?C.muted:"#fff",cursor:disabled?"not-allowed":"pointer",fontSize:sm?"11px":"12px",fontWeight:"700",
    display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"6px",whiteSpace:"nowrap",fontFamily:"inherit"
  }}>{children}</button>
);

// Bilingual label: shows both EN and UR side by side
const BiLabel = ({en, ur, bold, size="12px", muted}) => (
  <div style={{display:"flex",flexDirection:"column",gap:"1px"}}>
    <span style={{fontSize:size,fontWeight:bold?"800":"500",color:muted?C.muted:C.text,fontFamily:"'IBM Plex Sans'"}}>{en}</span>
    <span style={{fontSize:"11px",fontWeight:"600",color:muted?C.muted:C.yellow,fontFamily:"'Noto Nastaliq Urdu',serif",direction:"rtl",textAlign:"right",lineHeight:"1.8"}}>{ur}</span>
  </div>
);

// RTL-aware text component
const T = ({children, ur, style:s={}, bold, muted, mono}) => {
  const {lang,dir} = useLang();
  const isRTL = lang === "ur";
  return (
    <span style={{
      direction: isRTL ? "rtl" : "ltr",
      fontFamily: isRTL ? "'Noto Nastaliq Urdu',serif" : mono ? "'IBM Plex Mono'" : "'IBM Plex Sans'",
      fontWeight: bold ? "700" : "400",
      color: muted ? C.muted : C.text,
      lineHeight: isRTL ? "2" : "1.4",
      fontSize: isRTL ? "13px" : "inherit",
      ...s,
    }}>
      {isRTL && ur ? ur : children}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════
// SIDEBAR COMPONENT (RTL-aware)
// ═══════════════════════════════════════════════════════════════════
function Sidebar({ lang, activeKey, onNav }) {
  const isRTL = lang === "ur";
  return (
    <div style={{
      width: "220px", background: C.panel, borderRight: isRTL ? "none" : `1px solid ${C.border}`,
      borderLeft: isRTL ? `1px solid ${C.border}` : "none",
      display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden",
    }}>
      {/* Logo */}
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:"10px",flexDirection:isRTL?"row-reverse":"row"}}>
        <div style={{width:"34px",height:"34px",borderRadius:"8px",background:"linear-gradient(135deg,#f97316,#ea580c)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",fontSize:"12px",color:"#fff",flexShrink:0}}>IP</div>
        <div style={{textAlign:isRTL?"right":"left"}}>
          <div style={{fontSize:"12px",fontWeight:"900",color:C.text,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"'IBM Plex Sans'",direction:isRTL?"rtl":"ltr",lineHeight:isRTL?"2":"1.3"}}>
            {isRTL ? "البرکہ ٹیکسٹائلز" : "Al-Baraka Textiles"}
          </div>
          <div style={{fontSize:"9px",color:C.muted,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",direction:isRTL?"rtl":"ltr",lineHeight:isRTL?"2":"1.3"}}>
            {isRTL ? "انفوسس پاک ای آر پی" : "Infosys Pak ERP"}
          </div>
        </div>
      </div>
      {/* Nav */}
      <div style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
        {NAV_ITEMS.map(item => {
          const isActive = activeKey === item.key;
          return (
            <button key={item.key} onClick={() => onNav(item.key)}
              style={{width:"100%",display:"flex",flexDirection:isRTL?"row-reverse":"row",alignItems:"center",gap:"10px",
                padding:"9px 16px",background:isActive?`${C.accent}18`:"transparent",
                borderLeft: isRTL ? "none" : isActive?`3px solid ${C.accent}`:"3px solid transparent",
                borderRight: isRTL ? isActive?`3px solid ${C.accent}`:"3px solid transparent" : "none",
                border:"none",cursor:"pointer",textAlign:isRTL?"right":"left",transition:"all .12s",
              }}
              onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=C.card}}
              onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background="transparent"}}>
              <span style={{fontSize:"15px",flexShrink:0}}>{item.icon}</span>
              <span style={{fontSize:isRTL?"13px":"11px",fontWeight:"600",color:isActive?C.accent:C.muted,
                fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"'IBM Plex Sans'",
                direction:isRTL?"rtl":"ltr",lineHeight:isRTL?"2":"1.4",flex:1,
                textAlign:isRTL?"right":"left",
              }}>
                {isRTL ? item.ur : item.en}
              </span>
            </button>
          );
        })}
      </div>
      {/* User */}
      <div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:"9px",flexDirection:isRTL?"row-reverse":"row"}}>
        <div style={{width:"30px",height:"30px",borderRadius:"50%",background:"linear-gradient(135deg,#f97316,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:"900",color:"#fff",flexShrink:0}}>AR</div>
        <div style={{flex:1,textAlign:isRTL?"right":"left"}}>
          <div style={{fontSize:isRTL?"12px":"11px",fontWeight:"700",color:C.text,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",direction:isRTL?"rtl":"ltr",lineHeight:isRTL?"2":"1.3"}}>{isRTL?"احمد رضا":"Ahmed Raza"}</div>
          <div style={{fontSize:"9px",color:C.muted,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",direction:isRTL?"rtl":"ltr",lineHeight:isRTL?"1.8":"1.3"}}>{isRTL?"برانچ مینیجر":"Branch Manager"}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TOP BAR (RTL-aware)
// ═══════════════════════════════════════════════════════════════════
function TopBar({ lang, setLang, activeKey }) {
  const isRTL = lang === "ur";
  const label = NAV_ITEMS.find(n=>n.key===activeKey);
  return (
    <div style={{height:"50px",background:C.header,borderBottom:`1px solid ${C.border}`,
      display:"flex",alignItems:"center",padding:"0 18px",gap:"10px",flexShrink:0,
      flexDirection:isRTL?"row-reverse":"row",
    }}>
      {/* Breadcrumb */}
      <div style={{flex:1,display:"flex",alignItems:"center",gap:"6px",flexDirection:isRTL?"row-reverse":"row"}}>
        <span style={{fontSize:"9px",color:C.muted,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",direction:isRTL?"rtl":"ltr"}}>
          {isRTL?"البرکہ ٹیکسٹائلز":"Al-Baraka Textiles"}
        </span>
        <span style={{fontSize:"9px",color:C.muted}}>›</span>
        <span style={{fontSize:"12px",fontWeight:"800",color:C.text,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",direction:isRTL?"rtl":"ltr",lineHeight:isRTL?"2":"1.3"}}>
          {isRTL ? (label?.ur||"") : (label?.en||"")}
        </span>
      </div>

      {/* FBR status */}
      <div style={{display:"flex",alignItems:"center",gap:"5px",padding:"4px 10px",borderRadius:"20px",background:`${C.green}12`,border:`1px solid ${C.green}30`,flexDirection:isRTL?"row-reverse":"row"}}>
        <div style={{width:"6px",height:"6px",borderRadius:"50%",background:C.green}}/>
        <span style={{fontSize:"9px",fontWeight:"700",color:C.green,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",direction:isRTL?"rtl":"ltr",lineHeight:isRTL?"2":"1"}}>
          {isRTL?"ایف بی آر آن لائن":"FBR Online"}
        </span>
      </div>

      {/* Language toggle — THE KEY CONTROL */}
      <div style={{display:"flex",background:C.panel,borderRadius:"8px",padding:"3px",border:`1px solid ${C.border}`,gap:"2px"}}>
        <button onClick={()=>setLang("en")}
          style={{padding:"4px 12px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:"700",
            background:lang==="en"?C.accent:"transparent",color:lang==="en"?"#fff":C.muted,fontFamily:"'IBM Plex Sans'",transition:"all .15s"}}>
          EN
        </button>
        <button onClick={()=>setLang("ur")}
          style={{padding:"4px 12px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:"700",
            background:lang==="ur"?C.accent:"transparent",color:lang==="ur"?"#fff":C.muted,fontFamily:"'Noto Nastaliq Urdu',serif",transition:"all .15s",lineHeight:"2"}}>
          اردو
        </button>
      </div>

      {/* Notifications */}
      <button style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"16px",position:"relative"}}>
        🔔<span style={{position:"absolute",top:"-2px",right:"-4px",width:"14px",height:"14px",borderRadius:"50%",background:C.red,fontSize:"8px",fontWeight:"900",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>3</span>
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SCREEN RENDERERS (each fully bilingual)
// ═══════════════════════════════════════════════════════════════════

function DashboardScreen({ lang }) {
  const isRTL = lang === "ur";
  const f = n => isRTL ? fmtUrdu(n) : fmtEN(n);
  const kpis = [
    { en:"Today's Sales",    ur:"آج کی فروخت",    v:245800,  prefix:"PKR", col:C.green,  ic:"💰", chg:"+12%",  up:true  },
    { en:"Total Invoices",   ur:"کل انوائسز",      v:34,      prefix:"",   col:C.blue,   ic:"🧾", chg:"+5",    up:true  },
    { en:"FBR Pending",      ur:"ایف بی آر زیر التوا",v:1,   prefix:"",   col:C.yellow, ic:"⚠", chg:"failed",up:false },
    { en:"Low Stock Items",  ur:"کم اسٹاک اشیاء",  v:3,      prefix:"",   col:C.red,    ic:"📦", chg:"reorder",up:false},
    { en:"Receivables Due",  ur:"وصولیاں واجب الادا",v:871000,prefix:"PKR",col:C.accent, ic:"📥", chg:"3 accts",up:null },
    { en:"Net Profit Mo.",   ur:"ماہانہ خالص منافع",v:2100000,prefix:"PKR",col:C.purple, ic:"📈", chg:"+18.7%",up:true  },
  ];
  const invoices = [
    { ref:"INV-2024-08720", cust:{en:"Hassan Fabrics",ur:"حسن فیبرکس"}, amt:82500,  status:{en:"Paid",    ur:"ادا شدہ"},  sts:"paid",    fbr:"synced" },
    { ref:"INV-2024-08710", cust:{en:"Shah Brothers", ur:"شاہ برادرز"}, amt:145000, status:{en:"Partial", ur:"جزوی"},    sts:"partial", fbr:"pending" },
    { ref:"INV-2024-08700", cust:{en:"City Garments", ur:"سٹی گارمنٹس"},amt:56000,  status:{en:"Pending", ur:"زیر التوا"},sts:"pending",  fbr:"failed" },
    { ref:"INV-2024-08690", cust:{en:"Rehman Sons",   ur:"رحمن سنز"},   amt:38500,  status:{en:"Paid",    ur:"ادا شدہ"},  sts:"paid",    fbr:"synced" },
    { ref:"INV-2024-08680", cust:{en:"Pak Fashion",   ur:"پاک فیشن"},   amt:22000,  status:{en:"Paid",    ur:"ادا شدہ"},  sts:"paid",    fbr:"synced" },
  ];
  const stCol = {paid:C.green,partial:C.yellow,pending:C.muted};
  const fbrCol = {synced:C.green,failed:C.red,pending:C.yellow};

  return (
    <div style={{flex:1,overflowY:"auto",padding:"16px 20px",direction:isRTL?"rtl":"ltr"}}>
      {/* KPI grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"10px",marginBottom:"16px"}}>
        {kpis.map((k,i)=>(
          <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"12px 14px",position:"relative",overflow:"hidden"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=k.col+"55"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{position:"absolute",top:0,right:isRTL?undefined:0,left:isRTL?0:undefined,width:"40px",height:"40px",borderRadius:isRTL?"11px 0 40px 0":"0 11px 0 40px",background:`${k.col}12`}}/>
            <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".06em",marginBottom:"4px",textAlign:isRTL?"right":"left",
              fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>
              {isRTL?k.ur:k.en}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexDirection:isRTL?"row-reverse":"row"}}>
              <div style={{fontSize:"18px",fontWeight:"900",color:k.col,fontFamily:"'IBM Plex Mono'",direction:"ltr"}}>
                {k.prefix&&<span style={{fontSize:"10px",marginRight:"2px"}}>{k.prefix}</span>}
                {f(k.v)}
              </div>
              <span style={{fontSize:"18px"}}>{k.ic}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"4px",marginTop:"4px",flexDirection:isRTL?"row-reverse":"row"}}>
              {k.up!==null&&<span style={{fontSize:"9px",color:k.up?C.green:C.red}}>{k.up?"▲":"▼"}</span>}
              <span style={{fontSize:"9px",color:C.muted}}>{k.chg}</span>
            </div>
            <div style={{position:"absolute",bottom:0,left:isRTL?undefined:0,right:isRTL?0:undefined,height:"2px",width:"100%",background:`linear-gradient(${isRTL?"270deg":"90deg"},${k.col},transparent)`}}/>
          </div>
        ))}
      </div>

      {/* Recent Invoices */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",overflow:"hidden",marginBottom:"14px"}}>
        <div style={{padding:"11px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.panel,flexDirection:isRTL?"row-reverse":"row"}}>
          <span style={{fontSize:"13px",fontWeight:"800",color:C.text,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",direction:isRTL?"rtl":"ltr",lineHeight:isRTL?"2":"1.3"}}>
            {isRTL?"حالیہ انوائسز":"Recent Invoices"}
          </span>
          <Btn sm outline color={C.blue} onClick={()=>{}}>
            <span style={{fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",fontSize:isRTL?"12px":"11px"}}>
              {isRTL?"تمام دیکھیں →":"View All →"}
            </span>
          </Btn>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",direction:isRTL?"rtl":"ltr"}}>
          <thead><tr>
            {[
              {en:"Invoice #",ur:"انوائس نمبر"},
              {en:"Customer",ur:"گاہک"},
              {en:"Amount",ur:"رقم"},
              {en:"Status",ur:"حیثیت"},
              {en:"FBR",ur:"ایف بی آر"},
            ].map((h,hi)=>(
              <th key={hi} style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",
                letterSpacing:".06em",borderBottom:`1px solid ${C.border}`,background:C.panel,
                textAlign:isRTL?(hi===2||hi===4?"left":"right"):(hi===2||hi===4?"right":"left"),
                fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",
                lineHeight:isRTL?"2":"1.3",whiteSpace:"nowrap"}}>
                {isRTL?h.ur:h.en}
              </th>
            ))}
          </tr></thead>
          <tbody>
            {invoices.map((inv,i)=>(
              <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}
                onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"9px 12px",fontFamily:"'IBM Plex Mono'",fontSize:"11px",fontWeight:"700",color:C.blue}}>{inv.ref}</td>
                <td style={{padding:"9px 12px",fontSize:"11px",fontWeight:"600",color:C.text,textAlign:isRTL?"right":"left",
                  fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.4"}}>
                  {isRTL?inv.cust.ur:inv.cust.en}
                </td>
                <td style={{padding:"9px 12px",textAlign:isRTL?"left":"right",fontFamily:"'IBM Plex Mono'",fontWeight:"800",color:C.accent,direction:"ltr"}}>
                  {isRTL?`ر ${fmtUrdu(inv.amt)}`:`PKR ${fmtEN(inv.amt)}`}
                </td>
                <td style={{padding:"9px 12px",textAlign:isRTL?"right":"left"}}><Tag l={isRTL?inv.status.ur:inv.status.en} col={stCol[inv.sts]} sm/></td>
                <td style={{padding:"9px 12px",textAlign:isRTL?"left":"right"}}>
                  <Tag l={isRTL?(inv.fbr==="synced"?"مطابق":inv.fbr==="failed"?"ناکام":"زیر التوا"):inv.fbr} col={fbrCol[inv.fbr]} sm/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Actions */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"14px"}}>
        <div style={{fontSize:"13px",fontWeight:"800",color:C.text,marginBottom:"12px",textAlign:isRTL?"right":"left",
          fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>
          {isRTL?"فوری اقدامات":"Quick Actions"}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
          {[
            {ic:"🧾",en:"New Invoice",  ur:"نئی انوائس",    col:C.green},
            {ic:"📦",en:"Add Product",  ur:"پراڈکٹ شامل",   col:C.blue},
            {ic:"👤",en:"Add Customer", ur:"گاہک شامل",     col:C.teal},
            {ic:"💰",en:"Cash Receipt", ur:"نقد وصولی",     col:C.accent},
            {ic:"📈",en:"View Reports", ur:"رپورٹس",        col:C.purple},
            {ic:"🖨",en:"Z-Report",     ur:"زیڈ رپورٹ",    col:C.yellow},
          ].map(a=>(
            <button key={a.en} style={{padding:"10px 8px",borderRadius:"8px",border:`1px solid ${C.border}`,background:C.panel,
              cursor:"pointer",display:"flex",alignItems:"center",gap:"7px",
              flexDirection:isRTL?"row-reverse":"row",textAlign:isRTL?"right":"left"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=a.col;e.currentTarget.style.background=`${a.col}0e`}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.panel}}>
              <span style={{fontSize:"18px"}}>{a.ic}</span>
              <span style={{fontSize:isRTL?"12px":"10px",fontWeight:"700",color:C.muted,
                fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",
                lineHeight:isRTL?"2":"1.3",direction:isRTL?"rtl":"ltr"}}>
                {isRTL?a.ur:a.en}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function POSScreen({ lang }) {
  const isRTL = lang === "ur";
  const f = n => isRTL ? fmtUrdu(n) : fmtEN(n);
  const products = [
    {en:"Lawn Fabric 3pc",ur:"لان فیبرک ۳پیس",price:5500,qty:2},
    {en:"Embroidered Kurta",ur:"کشیدہ کاری کرتہ",price:3500,qty:1},
    {en:"Sapphire Dupatta",ur:"سفائر دوپٹہ",price:1800,qty:3},
  ];
  const subtotal = products.reduce((s,p)=>s+p.price*p.qty,0);
  const discount = 1000;
  const total    = subtotal - discount;

  return (
    <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 320px",gap:"0",overflow:"hidden",direction:isRTL?"rtl":"ltr"}}>
      {/* Products left */}
      <div style={{padding:"14px",borderRight:isRTL?"none":"1px solid "+C.border,borderLeft:isRTL?"1px solid "+C.border:"none",overflowY:"auto"}}>
        <div style={{fontSize:"13px",fontWeight:"800",color:C.text,marginBottom:"12px",textAlign:isRTL?"right":"left",
          fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>
          {isRTL?"پراڈکٹ تلاش":"Product Search"}
        </div>
        <input placeholder={isRTL?"پراڈکٹ یا بار کوڈ تلاش کریں...":"Search product or scan barcode..."}
          style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"8px 12px",
            color:C.text,fontSize:isRTL?"13px":"11px",outline:"none",fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",
            direction:isRTL?"rtl":"ltr",lineHeight:isRTL?"2":"1.4",marginBottom:"12px"}}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"8px"}}>
          {[{en:"Lawn Fabric 3pc",ur:"لان فیبرک ۳پیس",price:5500,stock:45,col:C.blue},
            {en:"Khaadi Kurta",ur:"کھادی کرتہ",price:3500,stock:28,col:C.green},
            {en:"Sapphire Suit",ur:"سفائر سوٹ",price:8900,stock:12,col:C.purple},
            {en:"Lawn Dupatta",ur:"لان دوپٹہ",price:1500,stock:67,col:C.teal},
            {en:"Embroidered Set",ur:"کشیدہ سیٹ",price:12000,stock:8,col:C.accent},
            {en:"Cotton Fabric",ur:"کاٹن فیبرک",price:2800,stock:120,col:C.pink},
          ].map(p=>(
            <div key={p.en} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"9px",padding:"11px",cursor:"pointer",
              textAlign:isRTL?"right":"left"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=p.col;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;}}>
              <div style={{fontSize:isRTL?"13px":"11px",fontWeight:"700",color:C.text,marginBottom:"4px",
                fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>
                {isRTL?p.ur:p.en}
              </div>
              <div style={{fontSize:"13px",fontWeight:"900",color:p.col,fontFamily:"'IBM Plex Mono'",direction:"ltr",textAlign:isRTL?"right":"left"}}>
                PKR {fmtEN(p.price)}
              </div>
              <div style={{fontSize:"9px",color:C.muted,marginTop:"2px",textAlign:isRTL?"right":"left"}}>
                {isRTL?"اسٹاک:":"Stock:"} <span style={{color:C.green}}>{isRTL?toUrduNum(p.stock):p.stock}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart right */}
      <div style={{background:C.panel,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",flexDirection:isRTL?"row-reverse":"row"}}>
          <span style={{fontSize:"13px",fontWeight:"800",color:C.text,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",
            lineHeight:isRTL?"2":"1.3"}}>{isRTL?"کارٹ":"Cart"}</span>
          <Tag l={isRTL?`${toUrduNum(products.length)} اشیاء`:`${products.length} items`} col={C.blue} sm/>
        </div>
        {/* Customer */}
        <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontSize:"9px",color:C.muted,marginBottom:"4px",textAlign:isRTL?"right":"left",
            fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1"}}>
            {isRTL?"گاہک":"Customer"}
          </div>
          <div style={{padding:"7px 10px",background:C.card,borderRadius:"6px",border:`1px solid ${C.border}`,
            fontSize:isRTL?"13px":"11px",fontWeight:"700",color:C.text,textAlign:isRTL?"right":"left",
            fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.4"}}>
            {isRTL?"حسن فیبرکس":"Hassan Fabrics"} — {isRTL?"تھوک":"Wholesale"}
          </div>
        </div>
        {/* Items */}
        <div style={{flex:1,overflowY:"auto",padding:"8px 14px"}}>
          {products.map((p,i)=>(
            <div key={i} style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",
              alignItems:"center",flexDirection:isRTL?"row-reverse":"row",gap:"8px"}}>
              <div style={{flex:1,textAlign:isRTL?"right":"left"}}>
                <div style={{fontSize:isRTL?"12px":"11px",fontWeight:"700",color:C.text,
                  fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>
                  {isRTL?p.ur:p.en}
                </div>
                <div style={{fontSize:"10px",color:C.muted,direction:"ltr",textAlign:isRTL?"right":"left"}}>
                  PKR {fmtEN(p.price)} × {p.qty}
                </div>
              </div>
              <div style={{fontSize:"12px",fontWeight:"900",color:C.accent,fontFamily:"'IBM Plex Mono'",direction:"ltr",flexShrink:0}}>
                {fmtEN(p.price*p.qty)}
              </div>
            </div>
          ))}
        </div>
        {/* Totals */}
        <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`}}>
          {[
            {en:"Subtotal",ur:"ذیلی کل",v:subtotal,col:C.muted},
            {en:"Discount",ur:"رعایت",  v:`-${fmtEN(discount)}`,col:C.green},
            {en:"GST (0%)",ur:"جی ایس ٹی",v:0,col:C.muted},
          ].map(r=>(
            <div key={r.en} style={{display:"flex",justifyContent:"space-between",fontSize:"10px",marginBottom:"4px",flexDirection:isRTL?"row-reverse":"row"}}>
              <span style={{color:C.muted,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3",fontSize:isRTL?"12px":"10px"}}>{isRTL?r.ur:r.en}</span>
              <span style={{fontFamily:"'IBM Plex Mono'",color:r.col,direction:"ltr"}}>{typeof r.v==="number"?fmtEN(r.v):r.v}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:"16px",fontWeight:"900",
            borderTop:`1px solid ${C.border}`,paddingTop:"8px",marginTop:"4px",flexDirection:isRTL?"row-reverse":"row"}}>
            <span style={{color:C.text,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3",fontSize:isRTL?"14px":"16px"}}>{isRTL?"مجموعی کل":"Grand Total"}</span>
            <span style={{color:C.accent,fontFamily:"'IBM Plex Mono'",direction:"ltr"}}>PKR {fmtEN(total)}</span>
          </div>
          <div style={{marginTop:"10px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
            <Btn color={C.green} full sm onClick={()=>{}}><span style={{fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",fontSize:isRTL?"12px":"11px",lineHeight:isRTL?"2":"1"}}>💰 {isRTL?"نقد":"Cash"}</span></Btn>
            <Btn color={C.blue}  full sm onClick={()=>{}}><span style={{fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",fontSize:isRTL?"12px":"11px",lineHeight:isRTL?"2":"1"}}>🏦 {isRTL?"بینک":"Bank"}</span></Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function HRScreen({ lang }) {
  const isRTL = lang === "ur";
  const emps = [
    {photo:"AR",en:"Ahmed Raza",   ur:"احمد رضا",   dept:{en:"Management",ur:"انتظام"},  desg:{en:"Branch Manager",ur:"برانچ مینیجر"},   salary:85000,att:95,status:"active"},
    {photo:"SB",en:"Sana Butt",    ur:"ثنا بٹ",     dept:{en:"Accounts",  ur:"اکاؤنٹس"}, desg:{en:"Sr. Accountant",ur:"سینیئر اکاؤنٹنٹ"},salary:65000,att:98,status:"active"},
    {photo:"TH",en:"Tariq Hassan", ur:"طارق حسن",   dept:{en:"Accounts",  ur:"اکاؤنٹس"}, desg:{en:"Cashier",       ur:"کیشئر"},            salary:42000,att:88,status:"active"},
    {photo:"FM",en:"Fareeha Malik",ur:"فریحہ ملک", dept:{en:"Sales",     ur:"فروخت"},   desg:{en:"Sales Executive",ur:"سیلز ایگزیکٹو"}, salary:38000,att:92,status:"active"},
    {photo:"ZK",en:"Zubair Khan",  ur:"زبیر خان",   dept:{en:"Warehouse", ur:"گودام"},    desg:{en:"WH Manager",    ur:"گودام مینیجر"},     salary:55000,att:85,status:"active"},
    {photo:"KA",en:"Kamran Ashraf",ur:"کامران اشرف",dept:{en:"Sales",     ur:"فروخت"},   desg:{en:"Sales Manager", ur:"سیلز مینیجر"},      salary:62000,att:72,status:"on_leave"},
  ];
  const DCOLS = {Management:C.accent,Accounts:C.green,Sales:C.blue,Warehouse:C.teal,HR:C.pink};

  return (
    <div style={{flex:1,overflowY:"auto",padding:"14px 20px",direction:isRTL?"rtl":"ltr"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"10px"}}>
        {emps.map((e,i)=>{
          const dc = DCOLS[e.dept.en]||C.blue;
          const isOL = e.status==="on_leave";
          return(
            <div key={i} style={{background:C.card,border:`2px solid ${C.border}`,borderRadius:"12px",padding:"14px",cursor:"pointer",
              textAlign:isRTL?"right":"left"}}
              onMouseEnter={el=>{el.currentTarget.style.borderColor=dc+"55";}}
              onMouseLeave={el=>{el.currentTarget.style.borderColor=C.border;}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:"11px",marginBottom:"10px",flexDirection:isRTL?"row-reverse":"row"}}>
                <div style={{width:"42px",height:"42px",borderRadius:"50%",background:`linear-gradient(135deg,${dc},${dc}bb)`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",fontSize:"12px",color:"#fff",flexShrink:0}}>
                  {e.photo}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:isRTL?"14px":"13px",fontWeight:"800",color:C.text,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",
                    lineHeight:isRTL?"2":"1.3",marginBottom:"2px"}}>
                    {isRTL?e.ur:e.en}
                  </div>
                  <div style={{fontSize:isRTL?"11px":"10px",color:C.muted,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",
                    lineHeight:isRTL?"2":"1.3",marginBottom:"5px"}}>
                    {isRTL?e.desg.ur:e.desg.en}
                  </div>
                  <div style={{display:"flex",gap:"4px",flexWrap:"wrap",justifyContent:isRTL?"flex-end":"flex-start"}}>
                    <Tag l={isRTL?e.dept.ur:e.dept.en} col={dc} sm/>
                    <Tag l={isRTL?(isOL?"چھٹی پر":"فعال"):(isOL?"On Leave":"Active")} col={isOL?C.yellow:C.green} sm/>
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
                <div style={{background:C.panel,borderRadius:"6px",padding:"6px 8px",textAlign:isRTL?"right":"left"}}>
                  <div style={{fontSize:"8px",color:C.muted,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>{isRTL?"تنخواہ":"Salary"}</div>
                  <div style={{fontSize:"11px",fontWeight:"900",color:C.green,fontFamily:"'IBM Plex Mono'",direction:"ltr",textAlign:isRTL?"right":"left"}}>
                    PKR {fmtEN(e.salary)}
                  </div>
                </div>
                <div style={{background:C.panel,borderRadius:"6px",padding:"6px 8px",textAlign:isRTL?"right":"left"}}>
                  <div style={{fontSize:"8px",color:C.muted,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>{isRTL?"حاضری":"Attendance"}</div>
                  <div style={{fontSize:"12px",fontWeight:"900",color:e.att>=90?C.green:e.att>=75?C.yellow:C.red}}>
                    {isRTL?toUrduNum(e.att):e.att}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsScreen({ lang, setLang }) {
  const isRTL = lang === "ur";
  const sections = [
    {key:"company", en:"Company",      ur:"کمپنی",        ic:"🏢"},
    {key:"branches",en:"Branches",     ur:"شاخیں",        ic:"📍"},
    {key:"users",   en:"Users & Roles",ur:"صارفین و کردار",ic:"👥"},
    {key:"fbr",     en:"FBR Config",   ur:"ایف بی آر ترتیب",ic:"🔗"},
    {key:"prefs",   en:"Preferences",  ur:"ترجیحات",       ic:"⚙"},
  ];
  return (
    <div style={{flex:1,display:"flex",overflow:"hidden",direction:isRTL?"rtl":"ltr"}}>
      {/* Sidebar */}
      <div style={{width:"190px",borderRight:isRTL?"none":"1px solid "+C.border,borderLeft:isRTL?"1px solid "+C.border:"none",
        background:C.panel,flexShrink:0,padding:"8px 0"}}>
        {sections.map(s=>(
          <button key={s.key} style={{width:"100%",padding:"10px 14px",display:"flex",gap:"9px",alignItems:"center",
            background:s.key==="prefs"?`${C.accent}15`:"transparent",
            borderLeft:isRTL?"none":(s.key==="prefs"?`3px solid ${C.accent}`:"3px solid transparent"),
            borderRight:isRTL?(s.key==="prefs"?`3px solid ${C.accent}`:"3px solid transparent"):"none",
            border:"none",cursor:"pointer",flexDirection:isRTL?"row-reverse":"row",textAlign:isRTL?"right":"left"}}
            onMouseEnter={e=>{if(s.key!=="prefs")e.currentTarget.style.background=C.card}}
            onMouseLeave={e=>{if(s.key!=="prefs")e.currentTarget.style.background="transparent"}}>
            <span style={{fontSize:"15px"}}>{s.ic}</span>
            <span style={{fontSize:isRTL?"12px":"11px",fontWeight:"600",color:s.key==="prefs"?C.accent:C.muted,
              fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>
              {isRTL?s.ur:s.en}
            </span>
          </button>
        ))}
      </div>
      {/* Content */}
      <div style={{flex:1,padding:"20px",overflowY:"auto"}}>
        <div style={{fontSize:"14px",fontWeight:"800",color:C.text,marginBottom:"16px",textAlign:isRTL?"right":"left",
          fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>
          {isRTL?"ترجیحات":"Preferences"}
        </div>

        {/* Language Setting — most important */}
        <div style={{background:C.card,border:`2px solid ${C.accent}44`,borderRadius:"10px",padding:"16px",marginBottom:"12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexDirection:isRTL?"row-reverse":"row",marginBottom:"8px"}}>
            <div style={{textAlign:isRTL?"right":"left"}}>
              <div style={{fontSize:isRTL?"14px":"13px",fontWeight:"800",color:C.text,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>
                {isRTL?"انٹرفیس زبان":"Interface Language"}
              </div>
              <div style={{fontSize:isRTL?"11px":"10px",color:C.muted,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>
                {isRTL?"مکمل نظام کی زبان تبدیل کریں":"Switch entire system language"}
              </div>
            </div>
            <div style={{display:"flex",background:C.panel,borderRadius:"8px",padding:"3px",border:`1px solid ${C.border}`,gap:"2px",flexShrink:0}}>
              <button onClick={()=>setLang("en")} style={{padding:"5px 14px",borderRadius:"6px",border:"none",cursor:"pointer",
                fontSize:"12px",fontWeight:"700",background:lang==="en"?C.accent:"transparent",color:lang==="en"?"#fff":C.muted,fontFamily:"'IBM Plex Sans'"}}>
                🇬🇧 English
              </button>
              <button onClick={()=>setLang("ur")} style={{padding:"5px 14px",borderRadius:"6px",border:"none",cursor:"pointer",
                fontSize:"14px",fontWeight:"700",background:lang==="ur"?C.accent:"transparent",color:lang==="ur"?"#fff":C.muted,
                fontFamily:"'Noto Nastaliq Urdu',serif",lineHeight:"2"}}>
                🇵🇰 اردو
              </button>
            </div>
          </div>
          <div style={{padding:"9px 12px",background:`${C.green}0a`,border:`1px solid ${C.green}22`,borderRadius:"7px",
            fontSize:isRTL?"12px":"11px",color:C.muted,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",
            lineHeight:isRTL?"2":"1.5",direction:isRTL?"rtl":"ltr",textAlign:isRTL?"right":"left"}}>
            ✓ {isRTL?"تمام ماڈیولز، نیویگیشن، انوائسز اور رپورٹس مکمل طور پر اردو میں دستیاب ہیں":"All modules, navigation, invoices and reports fully available in Urdu"}
          </div>
        </div>

        {/* Other prefs */}
        {[
          {en:"Currency",ur:"کرنسی",    val:{en:"PKR",ur:"پاکستانی روپیہ"},    col:C.green},
          {en:"Date Format",ur:"تاریخ",  val:{en:"DD/MM/YYYY",ur:"DD/MM/YYYY"},  col:C.blue},
          {en:"Number Format",ur:"نمبر",  val:{en:"English (1,234)",ur:"اردو (۱,۲۳۴)"},col:C.teal},
          {en:"Receipt Paper",ur:"کاغذ",  val:{en:"80mm Thermal",ur:"۸۰ ملی میٹر"},  col:C.purple},
        ].map(p=>(
          <div key={p.en} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"9px",padding:"12px 14px",
            marginBottom:"8px",display:"flex",justifyContent:"space-between",alignItems:"center",flexDirection:isRTL?"row-reverse":"row"}}>
            <div style={{textAlign:isRTL?"right":"left"}}>
              <div style={{fontSize:isRTL?"13px":"12px",fontWeight:"700",color:C.text,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>{isRTL?p.ur:p.en}</div>
            </div>
            <Tag l={isRTL?p.val.ur:p.val.en} col={p.col} sm/>
          </div>
        ))}
      </div>
    </div>
  );
}

// Generic placeholder for accounting / inventory screens
function GenericScreen({ lang, screen }) {
  const isRTL = lang === "ur";
  const data = {
    inventory: {
      title:{en:"Inventory",ur:"انوینٹری"},
      items:[
        {en:"Lawn Fabric 3pc",ur:"لان فیبرک ۳پیس",sku:"FA-0001",stock:45,price:5500,col:C.blue},
        {en:"Embroidered Kurta L",ur:"کشیدہ کرتہ ایل",sku:"RW-0002",stock:28,price:3500,col:C.green},
        {en:"Sapphire Cotton",ur:"سفائر کاٹن",sku:"FA-0003",stock:120,price:2800,col:C.purple},
        {en:"Khaadi Printed Shirt",ur:"کھادی پرنٹ شرٹ",sku:"RW-0008",stock:15,price:3500,col:C.teal},
        {en:"Bonanza Sweater",ur:"بونانزہ سویٹر",sku:"RW-0003",stock:3,price:4200,col:C.red},
      ]
    },
    procurement: {
      title:{en:"Purchase Orders",ur:"خریداری آرڈرز"},
      items:[
        {en:"PO-2024-001 — Gul Ahmed",ur:"پی او-۲۰۲۴-۰۰۱ — گل احمد",sku:"Approved",stock:200,price:1250000,col:C.green},
        {en:"PO-2024-002 — Khaadi",ur:"پی او-۲۰۲۴-۰۰۲ — کھادی",sku:"Partial",stock:90,price:560000,col:C.yellow},
        {en:"PO-2024-003 — Master Fab",ur:"پی او-۲۰۲۴-۰۰۳ — ماسٹر فیب",sku:"Approved",stock:0,price:3200000,col:C.blue},
        {en:"PO-2024-004 — Alkaram",ur:"پی او-۲۰۲۴-۰۰۴ — الکرم",sku:"Draft",stock:0,price:420000,col:C.muted},
      ]
    },
    accounting: {
      title:{en:"Accounting",ur:"اکاؤنٹنگ"},
      items:[
        {en:"Cash in Hand",ur:"نقد ہاتھ میں",sku:"1001",stock:null,price:485000,col:C.green},
        {en:"HBL Bank Account",ur:"ایچ بی ایل بینک",sku:"1010",stock:null,price:2150000,col:C.blue},
        {en:"Accounts Receivable",ur:"وصولیاں",sku:"1100",stock:null,price:884000,col:C.accent},
        {en:"Inventory Asset",ur:"انوینٹری",sku:"1200",stock:null,price:4200000,col:C.teal},
        {en:"Sales Revenue",ur:"فروخت آمدن",sku:"4001",stock:null,price:8400000,col:C.purple},
      ]
    },
    ledger: {
      title:{en:"Customer Ledger",ur:"گاہک کھاتہ"},
      items:[
        {en:"Hassan Fabrics",ur:"حسن فیبرکس",sku:"CUS-001",stock:null,price:124000,col:C.red},
        {en:"Shah Brothers",ur:"شاہ برادرز",sku:"CUS-005",stock:null,price:89000,col:C.red},
        {en:"Textiles Waqas",ur:"ٹیکسٹائلز وقاص",sku:"CUS-004",stock:null,price:225000,col:C.red},
        {en:"City Garments",ur:"سٹی گارمنٹس",sku:"CUS-002",stock:null,price:78500,col:C.red},
        {en:"Lahore Cloth House",ur:"لاہور کلاتھ ہاؤس",sku:"CUS-006",stock:null,price:310000,col:C.red},
      ]
    },
  };
  const d = data[screen] || data.inventory;
  const cols = screen==="inventory"?["Name/SKU","SKU","In Stock","Unit Price"]:
               screen==="procurement"?["Order","Status","Received","Value"]:
               screen==="accounting"?["Account","Code","—","Balance"]:
               ["Customer","Code","—","Outstanding"];
  const urCols = screen==="inventory"?["نام/ایس کے یو","ایس کے یو","اسٹاک","قیمت"]:
                 screen==="procurement"?["آرڈر","حیثیت","موصول","رقم"]:
                 screen==="accounting"?["کھاتہ","کوڈ","—","بیلنس"]:
                 ["گاہک","کوڈ","—","باقی"];

  return (
    <div style={{flex:1,overflowY:"auto",padding:"14px 20px",direction:isRTL?"rtl":"ltr"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",overflow:"hidden"}}>
        <div style={{padding:"11px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",
          alignItems:"center",background:C.panel,flexDirection:isRTL?"row-reverse":"row"}}>
          <span style={{fontSize:"13px",fontWeight:"800",color:C.text,fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",
            lineHeight:isRTL?"2":"1.3"}}>{isRTL?d.title.ur:d.title.en}</span>
          <div style={{display:"flex",gap:"5px"}}>
            <Btn sm outline color={C.green} onClick={()=>{}}>
              <span style={{fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",fontSize:isRTL?"12px":"11px",lineHeight:isRTL?"2":"1"}}>+ {isRTL?"شامل":"Add"}</span>
            </Btn>
            <Btn sm outline color={C.blue} onClick={()=>{}}>
              <span style={{fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",fontSize:isRTL?"12px":"11px",lineHeight:isRTL?"2":"1"}}>📤 {isRTL?"برآمد":"Export"}</span>
            </Btn>
          </div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",direction:isRTL?"rtl":"ltr"}}>
          <thead><tr>
            {(isRTL?urCols:cols).map((h,hi)=>(
              <th key={hi} style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",
                letterSpacing:".06em",borderBottom:`1px solid ${C.border}`,background:C.panel,
                textAlign:hi>=2?(isRTL?"left":"right"):(isRTL?"right":"left"),
                fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>
                {h}
              </th>
            ))}
          </tr></thead>
          <tbody>
            {d.items.map((item,i)=>(
              <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}
                onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"10px 12px",textAlign:isRTL?"right":"left"}}>
                  <span style={{fontSize:isRTL?"13px":"12px",fontWeight:"700",color:C.text,
                    fontFamily:isRTL?"'Noto Nastaliq Urdu',serif":"inherit",lineHeight:isRTL?"2":"1.3"}}>
                    {isRTL?item.ur:item.en}
                  </span>
                </td>
                <td style={{padding:"10px 12px",textAlign:isRTL?"right":"left"}}>
                  <Tag l={item.sku} col={item.col} sm/>
                </td>
                <td style={{padding:"10px 12px",textAlign:isRTL?"left":"right",fontFamily:"'IBM Plex Mono'",
                  fontSize:"11px",color:item.stock===0?C.red:C.green,direction:"ltr"}}>
                  {item.stock===null?"—":item.stock===0?(isRTL?"ختم":"None"):isRTL?toUrduNum(item.stock):item.stock}
                </td>
                <td style={{padding:"10px 12px",textAlign:isRTL?"left":"right",fontFamily:"'IBM Plex Mono'",
                  fontWeight:"800",fontSize:"12px",color:item.col,direction:"ltr"}}>
                  PKR {fmtEN(item.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TRANSLATION REFERENCE PANEL
// ═══════════════════════════════════════════════════════════════════
function TranslationPanel() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Navigation");
  const categories = {
    "Navigation":  Object.entries(DICT).slice(0,12),
    "Common":      Object.entries(DICT).slice(12,30),
    "POS":         Object.entries(DICT).slice(48,63),
    "Inventory":   Object.entries(DICT).slice(63,79),
    "HR":          Object.entries(DICT).slice(119,145),
    "Accounting":  Object.entries(DICT).slice(96,115),
    "Months":      Object.entries(DICT).slice(151,163),
  };
  const filtered = search
    ? Object.entries(DICT).filter(([en,ur])=>en.toLowerCase().includes(search.toLowerCase())||ur.includes(search))
    : (categories[cat]||[]);

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{fontSize:"13px",fontWeight:"800",color:C.text,marginBottom:"4px"}}>📚 Translation Dictionary</div>
        <div style={{fontSize:"10px",color:C.muted,marginBottom:"10px"}}>{Object.keys(DICT).length} terms across all modules — English ↔ اردو</div>
        <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search terms..."
            style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"7px 10px",color:C.text,fontSize:"11px",outline:"none",width:"200px"}}/>
          {!search&&Object.keys(categories).map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{padding:"4px 10px",borderRadius:"20px",fontSize:"9px",fontWeight:"700",
              border:`1px solid ${cat===c?C.accent:C.border}`,background:cat===c?`${C.accent}15`:"transparent",
              color:cat===c?C.accent:C.muted,cursor:"pointer"}}>{c}</button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 20px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
          {filtered.map(([en,ur])=>(
            <div key={en} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"9px 12px",
              display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.blue+"55"}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <span style={{fontSize:"11px",fontWeight:"600",color:C.text,fontFamily:"'IBM Plex Sans'"}}>{en}</span>
              <span style={{fontSize:"13px",fontWeight:"700",color:C.yellow,fontFamily:"'Noto Nastaliq Urdu',serif",
                direction:"rtl",lineHeight:"2",textAlign:"right"}}>{ur}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function UrduRTLIntegration() {
  const [lang,    setLang]    = useState("en");
  const [demoKey, setDemoKey] = useState("dashboard");
  const [view,    setView]    = useState("demo"); // demo | sidebyside | dict

  const isRTL = lang === "ur";

  const renderScreen = (l) => {
    switch(demoKey) {
      case "dashboard":   return <DashboardScreen lang={l}/>;
      case "pos":         return <POSScreen lang={l}/>;
      case "hr":          return <HRScreen lang={l}/>;
      case "settings":    return <SettingsScreen lang={l} setLang={setLang}/>;
      default:            return <GenericScreen lang={l} screen={demoKey}/>;
    }
  };

  return (
    <div style={{display:"flex",height:"100%",flexDirection:"column",background:C.bg,color:C.text,fontFamily:"'IBM Plex Sans',sans-serif",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;600&family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#1a2e40;border-radius:4px}
        input,select,textarea,button{font-family:inherit}
        @keyframes sI{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
        @keyframes fI{from{opacity:0}to{opacity:1}}
      `}</style>

      {/* ── MASTER HEADER ── */}
      <div style={{background:C.header,borderBottom:`1px solid ${C.border}`,padding:"0 20px",height:"54px",display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
        <div style={{width:"30px",height:"30px",borderRadius:"7px",background:"linear-gradient(135deg,#f97316,#ea580c)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",fontSize:"11px",color:"#fff"}}>IP</div>
        <div>
          <div style={{fontWeight:"800",fontSize:"14px",color:"#fff"}}>Step 11 — Urdu RTL Integration</div>
          <div style={{fontSize:"9px",color:C.muted}}>Full bilingual EN ↔ اردو · RTL layout engine · Nastaliq font · Urdu numerals</div>
        </div>

        {/* View switcher */}
        <div style={{display:"flex",gap:"2px",marginLeft:"12px",background:C.panel,borderRadius:"8px",padding:"3px",border:`1px solid ${C.border}`}}>
          {[{k:"demo",l:"🖥 Live Demo"},{k:"sidebyside",l:"⚡ Side by Side"},{k:"dict",l:"📚 Dictionary"}].map(v=>(
            <button key={v.k} onClick={()=>setView(v.k)} style={{padding:"5px 12px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:"700",background:view===v.k?C.accent:"transparent",color:view===v.k?"#fff":C.muted,whiteSpace:"nowrap"}}>{v.l}</button>
          ))}
        </div>

        {/* Screen selector */}
        <div style={{display:"flex",gap:"2px",marginLeft:"4px",flexWrap:"wrap"}}>
          {DEMO_SCREENS.map(s=>(
            <button key={s} onClick={()=>setDemoKey(s)} style={{padding:"4px 9px",borderRadius:"5px",border:"none",cursor:"pointer",fontSize:"10px",fontWeight:"700",background:demoKey===s?C.blue:"transparent",color:demoKey===s?"#fff":C.muted,whiteSpace:"nowrap"}}>
              {DEMO_LABELS[s]?.[lang==="ur"?"ur":"en"]||s}
            </button>
          ))}
        </div>

        <div style={{marginLeft:"auto",display:"flex",gap:"8px",alignItems:"center"}}>
          {/* Master language toggle */}
          <div style={{display:"flex",background:C.panel,borderRadius:"8px",padding:"3px",border:`1px solid ${C.accent}44`,gap:"2px"}}>
            <button onClick={()=>setLang("en")} style={{padding:"5px 14px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:"700",background:lang==="en"?C.accent:"transparent",color:lang==="en"?"#fff":C.muted,fontFamily:"'IBM Plex Sans'",transition:"all .15s"}}>🇬🇧 EN</button>
            <button onClick={()=>setLang("ur")} style={{padding:"5px 14px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"14px",fontWeight:"700",background:lang==="ur"?C.accent:"transparent",color:lang==="ur"?"#fff":C.muted,fontFamily:"'Noto Nastaliq Urdu',serif",lineHeight:"2",transition:"all .15s"}}>🇵🇰 اردو</button>
          </div>
        </div>
      </div>

      {/* ── LIVE DEMO VIEW ── */}
      {view==="demo"&&(
        <div style={{flex:1,display:"flex",overflow:"hidden",animation:"fI .2s ease"}}>
          {/* Sidebar — FLIPS on RTL */}
          {isRTL
            ? <>{renderScreen(lang)}<Sidebar lang={lang} activeKey={demoKey} onNav={setDemoKey}/></>
            : <><Sidebar lang={lang} activeKey={demoKey} onNav={setDemoKey}/>
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <TopBar lang={lang} setLang={setLang} activeKey={demoKey}/>
                {renderScreen(lang)}
              </div>
            </>
          }
          {isRTL&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",order:-1}}>
              <TopBar lang={lang} setLang={setLang} activeKey={demoKey}/>
              {renderScreen(lang)}
            </div>
          )}
        </div>
      )}

      {/* ── SIDE BY SIDE VIEW ── */}
      {view==="sidebyside"&&(
        <div style={{flex:1,display:"flex",overflow:"hidden",gap:"0",animation:"fI .2s ease"}}>
          {/* English panel */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",borderRight:`2px solid ${C.border2}`}}>
            <div style={{padding:"8px 14px",background:`${C.blue}12`,borderBottom:`1px solid ${C.blue}22`,display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
              <span style={{fontSize:"16px"}}>🇬🇧</span>
              <div>
                <div style={{fontSize:"11px",fontWeight:"800",color:C.blue}}>English — LTR</div>
                <div style={{fontSize:"9px",color:C.muted}}>Left-to-right layout · IBM Plex Sans · English numerals</div>
              </div>
            </div>
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <TopBar lang="en" setLang={()=>{}} activeKey={demoKey}/>
              {renderScreen("en")}
            </div>
          </div>
          {/* Urdu panel */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"8px 14px",background:`${C.accent}12`,borderBottom:`1px solid ${C.accent}22`,display:"flex",alignItems:"center",gap:"8px",flexDirection:"row-reverse",flexShrink:0}}>
              <span style={{fontSize:"16px"}}>🇵🇰</span>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"11px",fontWeight:"800",color:C.accent,fontFamily:"'Noto Nastaliq Urdu',serif",direction:"rtl",lineHeight:"2"}}>اردو — دائیں سے بائیں</div>
                <div style={{fontSize:"9px",color:C.muted}}>Right-to-left layout · Noto Nastaliq Urdu · Urdu numerals</div>
              </div>
            </div>
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <TopBar lang="ur" setLang={()=>{}} activeKey={demoKey}/>
              <div style={{flex:1,display:"flex",overflow:"hidden",flexDirection:"row-reverse"}}>
                <Sidebar lang="ur" activeKey={demoKey} onNav={setDemoKey}/>
                {renderScreen("ur")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DICTIONARY VIEW ── */}
      {view==="dict"&&<TranslationPanel/>}
    </div>
  );
}

import { useState, useMemo } from "react";

// ================================================================
// INFOSYS PAK ERP — STEP 9: CUSTOMER & VENDOR LEDGER
// AR Management · AP Management · Ledger · Statements · Receipts
// ================================================================

const C = {
  bg:"#060a10", panel:"#090f1a", card:"#0d1825", card2:"#0b1520",
  border:"#162030", border2:"#1e2e40", text:"#dce4f0", muted:"#4a6070",
  muted2:"#1e2e3e", accent:"#f97316", blue:"#3b82f6", green:"#10b981",
  red:"#ef4444", yellow:"#f59e0b", purple:"#8b5cf6", teal:"#06b6d4",
  pink:"#ec4899", lime:"#84cc16", input:"#070f1a", header:"#050910",
};

const fmt  = n => new Intl.NumberFormat("en-PK").format(Math.round(Math.abs(n)));
const fmtC = n => `PKR ${fmt(n)}`;
const today = "2024-03-02";

// ─── CUSTOMERS ────────────────────────────────────────────────────
const CUSTOMERS = [
  { id:"c001", code:"CUS-001", name:"Al-Fatah Traders",      contact:"Haji Fatah",     phone:"0300-1234567", email:"alfatah@gmail.com",     city:"Lahore",    type:"Wholesale",  status:"active",   balance:245000, creditLimit:500000, paymentTerms:"Net 30", totalSales:4800000, lastInvoice:"2024-03-02", discount:10, ntn:"1234567-8" },
  { id:"c002", code:"CUS-002", name:"City Garments LLC",     contact:"Tariq Mehmood",  phone:"0321-9876543", email:"citygarments@pk.com",   city:"Karachi",   type:"Retail",     status:"active",   balance:78500,  creditLimit:200000, paymentTerms:"Net 15", totalSales:2100000, lastInvoice:"2024-03-01", discount:5,  ntn:"2345678-9" },
  { id:"c003", code:"CUS-003", name:"Hassan Fabrics",        contact:"Hassan Raza",    phone:"0333-1122334", email:"hassanfab@yahoo.com",   city:"Faisalabad",type:"Wholesale",  status:"active",   balance:124000, creditLimit:300000, paymentTerms:"Net 30", totalSales:3600000, lastInvoice:"2024-02-28", discount:8,  ntn:"3456789-0" },
  { id:"c004", code:"CUS-004", name:"Rehman Sons",           contact:"Abdul Rehman",   phone:"0312-5556789", email:"rehmansons@gmail.com",  city:"Multan",    type:"Wholesale",  status:"active",   balance:45000,  creditLimit:150000, paymentTerms:"Net 30", totalSales:1800000, lastInvoice:"2024-02-27", discount:5,  ntn:"4567890-1" },
  { id:"c005", code:"CUS-005", name:"Textiles Waqas Co.",    contact:"Waqas Ahmed",    phone:"0300-9988776", email:"waqastex@pk.com",       city:"Lahore",    type:"Wholesale",  status:"active",   balance:225000, creditLimit:400000, paymentTerms:"Net 45", totalSales:5200000, lastInvoice:"2023-12-10", discount:12, ntn:"5678901-2" },
  { id:"c006", code:"CUS-006", name:"Shah Brothers",         contact:"Shahid Shah",    phone:"0311-4433221", email:"shahbros@gmail.com",    city:"Islamabad", type:"Retail",     status:"active",   balance:89000,  creditLimit:100000, paymentTerms:"Net 15", totalSales:980000,  lastInvoice:"2023-10-22", discount:3,  ntn:"6789012-3" },
  { id:"c007", code:"CUS-007", name:"Lahore Cloth House",    contact:"Irfan Malik",    phone:"0300-1111222", email:"lchouse@gmail.com",     city:"Lahore",    type:"Wholesale",  status:"active",   balance:310000, creditLimit:600000, paymentTerms:"Net 30", totalSales:7100000, lastInvoice:"2024-02-28", discount:15, ntn:"7890123-4" },
  { id:"c008", code:"CUS-008", name:"Khan & Sons Boutique",  contact:"Khalid Khan",    phone:"0321-7654321", email:"khanboutique@pk.com",   city:"Peshawar",  type:"Retail",     status:"active",   balance:0,      creditLimit:80000,  paymentTerms:"Cash",   totalSales:450000,  lastInvoice:"2024-01-15", discount:0,  ntn:"8901234-5" },
  { id:"c009", code:"CUS-009", name:"Noor Fashion",          contact:"Noor Fatima",    phone:"0333-9988776", email:"noorfashion@gmail.com", city:"Karachi",   type:"Retail",     status:"inactive", balance:0,      creditLimit:50000,  paymentTerms:"Cash",   totalSales:120000,  lastInvoice:"2023-08-11", discount:0,  ntn:"9012345-6" },
];

// ─── CUSTOMER LEDGER ENTRIES ──────────────────────────────────────
const CUST_LEDGER = {
  c001: [
    { date:"2024-01-05", type:"Invoice",  ref:"INV-2024-00120", desc:"Lawn Fabric 3pc × 20",        debit:110000, credit:0,      balance:110000  },
    { date:"2024-01-12", type:"Receipt",  ref:"RCV-2024-00045", desc:"Cash payment received",       debit:0,      credit:110000, balance:0       },
    { date:"2024-02-01", type:"Invoice",  ref:"INV-2024-00310", desc:"Khaadi Kurta × 30 + Lawn",    debit:185000, credit:0,      balance:185000  },
    { date:"2024-02-10", type:"Receipt",  ref:"RCV-2024-00089", desc:"Bank transfer — partial",     debit:0,      credit:100000, balance:85000   },
    { date:"2024-02-20", type:"Invoice",  ref:"INV-2024-00480", desc:"Eid collection order",        debit:210000, credit:0,      balance:295000  },
    { date:"2024-02-28", type:"Receipt",  ref:"RCV-2024-00134", desc:"Cash payment",                debit:0,      credit:100000, balance:195000  },
    { date:"2024-03-02", type:"Invoice",  ref:"INV-2024-08741", desc:"Summer Lawn 3pc × 50",        debit:245000, credit:0,      balance:440000  },
    { date:"2024-03-02", type:"Receipt",  ref:"RCV-2024-00201", desc:"Bank transfer received",      debit:0,      credit:195000, balance:245000  },
  ],
  c003: [
    { date:"2024-01-10", type:"Invoice",  ref:"INV-2024-00155", desc:"Cotton Fabric 200m",          debit:560000, credit:0,      balance:560000  },
    { date:"2024-01-25", type:"Receipt",  ref:"RCV-2024-00062", desc:"Cheque payment",              debit:0,      credit:400000, balance:160000  },
    { date:"2024-02-14", type:"Invoice",  ref:"INV-2024-00395", desc:"Lawn Dupatta × 100",          debit:150000, credit:0,      balance:310000  },
    { date:"2024-02-28", type:"Invoice",  ref:"INV-2024-00521", desc:"Embroidered Suit × 40",       debit:140000, credit:0,      balance:450000  },
    { date:"2024-02-28", type:"Receipt",  ref:"RCV-2024-00140", desc:"Partial payment bank",        debit:0,      credit:326000, balance:124000  },
  ],
  c007: [
    { date:"2024-01-08", type:"Invoice",  ref:"INV-2024-00140", desc:"Bulk Lawn Order — Jan",       debit:850000, credit:0,      balance:850000  },
    { date:"2024-01-20", type:"Receipt",  ref:"RCV-2024-00055", desc:"Bank transfer",               debit:0,      credit:700000, balance:150000  },
    { date:"2024-02-01", type:"Invoice",  ref:"INV-2024-00320", desc:"Khaadi RTW × 80",             debit:280000, credit:0,      balance:430000  },
    { date:"2024-02-15", type:"Receipt",  ref:"RCV-2024-00095", desc:"Cash + bank split",           debit:0,      credit:310000, balance:120000  },
    { date:"2024-02-28", type:"Invoice",  ref:"INV-2024-00540", desc:"Sapphire collection",         debit:310000, credit:0,      balance:430000  },
    { date:"2024-02-28", type:"Receipt",  ref:"RCV-2024-00145", desc:"Cheque cleared",              debit:0,      credit:120000, balance:310000  },
  ],
};

// ─── VENDORS (reuse from procurement for AP) ──────────────────────
const VENDORS = [
  { id:"v001", code:"VND-001", name:"Gul Ahmed Textiles Ltd",   contact:"Imran Gul",    phone:"042-111-485-485", email:"orders@gulahmed.com",    city:"Lahore",    type:"Manufacturer", balance:380000, creditLimit:1000000, paymentTerms:"Net 30", totalPurchases:8200000, lastOrder:"2024-03-01" },
  { id:"v002", code:"VND-002", name:"Khaadi Pvt Ltd",           contact:"Sara Khan",    phone:"021-111-542-542", email:"supply@khaadi.com",       city:"Karachi",   type:"Brand",        balance:120000, creditLimit:500000,  paymentTerms:"Net 15", totalPurchases:5100000, lastOrder:"2024-02-25" },
  { id:"v003", code:"VND-003", name:"Sapphire Textile Mills",   contact:"Ali Sapphire", phone:"042-111-727-727", email:"procurement@sapphire.pk", city:"Lahore",    type:"Manufacturer", balance:95000,  creditLimit:750000,  paymentTerms:"Net 30", totalPurchases:3800000, lastOrder:"2024-02-20" },
  { id:"v006", code:"VND-006", name:"Master Fabrics Faisalabad",contact:"Rashid Master",phone:"041-111-627-627", email:"sales@masterfab.pk",      city:"Faisalabad",type:"Mill",         balance:650000, creditLimit:2000000, paymentTerms:"Net 60", totalPurchases:12400000,lastOrder:"2024-02-28" },
];

const VEND_LEDGER = {
  v001: [
    { date:"2024-01-15", type:"Invoice",  ref:"PI-2024-00022", desc:"Lawn Fabric 3pc × 150 sets",  debit:0,      credit:825000, balance:-825000 },
    { date:"2024-01-28", type:"Payment",  ref:"PAY-2024-00018",desc:"Bank transfer — HBL",          debit:825000, credit:0,      balance:0       },
    { date:"2024-03-01", type:"Invoice",  ref:"PI-2024-00087", desc:"PO-2024-001 · 200 sets + 100 dupatta", debit:0, credit:1250000, balance:-1250000},
    { date:"2024-03-02", type:"Payment",  ref:"PAY-2024-00056",desc:"Partial payment — HBL",        debit:870000, credit:0,      balance:-380000 },
  ],
  v006: [
    { date:"2023-12-10", type:"Invoice",  ref:"PI-2023-00210", desc:"Cotton Lawn 300m",             debit:0,      credit:840000, balance:-840000 },
    { date:"2024-01-05", type:"Payment",  ref:"PAY-2024-00002",desc:"Bank transfer",                debit:840000, credit:0,      balance:0       },
    { date:"2024-02-28", type:"Invoice",  ref:"PI-2024-00082", desc:"PO-2024-003 · Cotton+Silk+Cambric", debit:0, credit:3200000,balance:-3200000},
    { date:"2024-03-01", type:"Payment",  ref:"PAY-2024-00055",desc:"Partial payment",              debit:2550000,credit:0,      balance:-650000 },
  ],
};

// ─── RECEIPTS (AR) ────────────────────────────────────────────────
const AR_RECEIPTS = [
  { id:"rcv001", number:"RCV-2024-00201", date:"2024-03-02", customer:"Al-Fatah Traders",   custId:"c001", amount:195000, method:"Bank Transfer", ref:"IBFT-2024-12345", invoices:["INV-2024-00480"], status:"posted",  bank:"HBL" },
  { id:"rcv002", number:"RCV-2024-00198", date:"2024-03-01", customer:"Lahore Cloth House",  custId:"c007", amount:120000, method:"Cheque",        ref:"CHQ-00456",       invoices:["INV-2024-00540"], status:"posted",  bank:"MCB" },
  { id:"rcv003", number:"RCV-2024-00195", date:"2024-02-29", customer:"Hassan Fabrics",      custId:"c003", amount:326000, method:"Bank Transfer", ref:"IBFT-2024-11900", invoices:["INV-2024-00395","INV-2024-00521"], status:"posted", bank:"HBL" },
  { id:"rcv004", number:"RCV-2024-00190", date:"2024-02-28", customer:"Al-Fatah Traders",   custId:"c001", amount:100000, method:"Cash",          ref:"",                invoices:["INV-2024-00310"], status:"posted",  bank:"" },
  { id:"rcv005", number:"RCV-2024-00185", date:"2024-02-27", customer:"Rehman Sons",         custId:"c004", amount:55000,  method:"Bank Transfer", ref:"IBFT-2024-11450", invoices:["INV-2024-00415"], status:"posted",  bank:"UBL" },
];

// ─── PAYMENTS (AP) ────────────────────────────────────────────────
const AP_PAYMENTS = [
  { id:"pay001", number:"PAY-2024-00056", date:"2024-03-02", vendor:"Gul Ahmed Textiles Ltd", vendId:"v001", amount:870000, method:"Bank Transfer", ref:"IBFT-OUT-2024-456",  invoices:["PI-2024-00087"], status:"posted", bank:"HBL" },
  { id:"pay002", number:"PAY-2024-00055", date:"2024-03-01", vendor:"Master Fabrics Faisalabad",vendId:"v006",amount:2550000,method:"Bank Transfer", ref:"IBFT-OUT-2024-445", invoices:["PI-2024-00082"], status:"posted", bank:"HBL" },
  { id:"pay003", number:"PAY-2024-00040", date:"2024-02-20", vendor:"Khaadi Pvt Ltd",          vendId:"v002", amount:280000, method:"Cheque",        ref:"CHQ-OUT-00312",      invoices:["PI-2024-00055"], status:"posted", bank:"MCB" },
  { id:"pay004", number:"PAY-2024-00038", date:"2024-02-18", vendor:"Sapphire Textile Mills",  vendId:"v003", amount:648000, method:"Bank Transfer", ref:"IBFT-OUT-2024-402",  invoices:["PI-2024-00050"], status:"posted", bank:"HBL" },
];

// ─── AR AGING ─────────────────────────────────────────────────────
const AR_AGING = [
  { customer:"Al-Fatah Traders",   total:245000, current:245000, d30:0,      d60:0,      d90:0,      d90plus:0      },
  { customer:"Lahore Cloth House", total:310000, current:100000, d30:210000, d60:0,      d90:0,      d90plus:0      },
  { customer:"Hassan Fabrics",     total:124000, current:0,      d30:0,      d60:124000, d90:0,      d90plus:0      },
  { customer:"Textiles Waqas Co.", total:225000, current:0,      d30:0,      d60:75000,  d90:150000, d90plus:0      },
  { customer:"Shah Brothers",      total:89000,  current:0,      d30:0,      d60:0,      d90:0,      d90plus:89000  },
  { customer:"Rehman Sons",        total:45000,  current:0,      d30:45000,  d60:0,      d90:0,      d90plus:0      },
  { customer:"City Garments LLC",  total:78500,  current:78500,  d30:0,      d60:0,      d90:0,      d90plus:0      },
];

// ─── HELPERS ──────────────────────────────────────────────────────
const Tag = ({l,col,sm}) => (
  <span style={{fontSize:sm?"9px":"10px",fontWeight:"700",padding:sm?"1px 5px":"2px 8px",borderRadius:"20px",background:`${col}18`,color:col,border:`1px solid ${col}28`,whiteSpace:"nowrap"}}>{l}</span>
);

const Btn = ({onClick,children,color=C.blue,outline=false,small=false,disabled=false,full=false}) => (
  <button onClick={onClick} disabled={disabled}
    style={{width:full?"100%":"auto",padding:small?"5px 11px":"9px 16px",borderRadius:"7px",border:outline?`1px solid ${color}55`:"none",background:disabled?"#1a2a3a":outline?`${color}0e`:color,color:disabled?C.muted:"#fff",cursor:disabled?"not-allowed":"pointer",fontSize:small?"10px":"12px",fontWeight:"700",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"5px",whiteSpace:"nowrap",fontFamily:"inherit"}}>
    {children}
  </button>
);

const TH = ({children,right,center}) => (
  <th style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:".07em",borderBottom:`1px solid ${C.border}`,background:C.panel,textAlign:center?"center":right?"right":"left",whiteSpace:"nowrap"}}>{children}</th>
);

// ═══════════════════════════════════════════════════════════════════
// MAIN MODULE
// ═══════════════════════════════════════════════════════════════════
export default function LedgerModule() {
  const [tab,        setTab]        = useState("ar");
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState(null);
  const [ledgerView, setLedgerView] = useState(null);  // {type:"cust"|"vend", id}
  const [showReceipt,setShowReceipt]= useState(false);
  const [showPayment,setShowPayment]= useState(false);
  const [showStmt,   setShowStmt]   = useState(null);  // customer/vendor object
  const [receipts,   setReceipts]   = useState(AR_RECEIPTS);
  const [payments,   setPayments]   = useState(AP_PAYMENTS);
  const [notif,      setNotif]      = useState(null);

  const notify = (msg,type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3000); };

  const totalAR      = CUSTOMERS.reduce((s,c)=>s+c.balance,0);
  const totalAP      = VENDORS.reduce((s,v)=>s+v.balance,0);
  const overdueAR    = AR_AGING.reduce((s,r)=>s+r.d60+r.d90+r.d90plus,0);
  const totalCustSales = CUSTOMERS.reduce((s,c)=>s+c.totalSales,0);

  const filteredCusts = useMemo(()=>CUSTOMERS.filter(c=>{
    if(tab!=="ar"&&tab!=="ledger") return true;
    if(!search) return true;
    return c.name.toLowerCase().includes(search.toLowerCase())||c.city.toLowerCase().includes(search.toLowerCase())||c.code.toLowerCase().includes(search.toLowerCase());
  }),[search,tab]);

  const filteredVends = useMemo(()=>VENDORS.filter(v=>{
    if(!search) return true;
    return v.name.toLowerCase().includes(search.toLowerCase())||v.city.toLowerCase().includes(search.toLowerCase());
  }),[search]);

  const TABS = [
    {k:"ar",      l:"💰 Accounts Receivable"},
    {k:"ap",      l:"💳 Accounts Payable"},
    {k:"ledger",  l:"📒 Ledger"},
    {k:"receipts",l:"📥 Receipts"},
    {k:"payments",l:"📤 Payments"},
    {k:"aging",   l:"⏳ Aging Summary"},
  ];

  return (
    <div style={{display:"flex",height:"100%",flexDirection:"column",background:C.bg,color:C.text,fontFamily:"'IBM Plex Sans',sans-serif",overflow:"hidden",fontSize:"13px"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#1a2e40;border-radius:4px}
        input,select,textarea,button{font-family:inherit}
        @keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
        @keyframes rowIn{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes printIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
      `}</style>

      {/* HEADER */}
      <div style={{background:C.header,borderBottom:`1px solid ${C.border}`,padding:"0 20px",height:"54px",display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
        <div style={{width:"30px",height:"30px",borderRadius:"7px",background:"linear-gradient(135deg,#f97316,#ea580c)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",fontSize:"11px",color:"#fff"}}>IP</div>
        <div>
          <div style={{fontWeight:"800",fontSize:"14px",color:"#fff"}}>Customer & Vendor Ledger</div>
          <div style={{fontSize:"9px",color:C.muted}}>AR · AP · Ledger · Receipts · Payments · Aging</div>
        </div>
        <div style={{marginLeft:"16px",display:"flex",gap:"2px",flexWrap:"wrap"}}>
          {TABS.map(t=>(
            <button key={t.k} onClick={()=>{setTab(t.k);setSearch("");setSelected(null);setLedgerView(null);}}
              style={{padding:"5px 12px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:"700",whiteSpace:"nowrap",background:tab===t.k?C.accent:"transparent",color:tab===t.k?"#fff":C.muted}}>
              {t.l}
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:"8px",alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:"9px",top:"50%",transform:"translateY(-50%)",fontSize:"11px",color:C.muted}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
              style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"6px 10px 6px 28px",color:C.text,fontSize:"11px",outline:"none",width:"170px"}}
              onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
          {tab==="receipts" && <Btn color={C.green} small onClick={()=>setShowReceipt(true)}>+ Record Receipt</Btn>}
          {tab==="payments" && <Btn color={C.red}   small onClick={()=>setShowPayment(true)}>+ Record Payment</Btn>}
          <Btn color={C.muted} outline small onClick={()=>notify("Exported successfully")}>📤 Export</Btn>
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,padding:"9px 20px",display:"flex",gap:"10px",flexShrink:0,overflowX:"auto"}}>
        {[
          {l:"Total Receivables",  v:fmtC(totalAR),           col:C.blue,   ic:"💰"},
          {l:"Overdue (60+ days)", v:fmtC(overdueAR),         col:C.red,    ic:"⚠"},
          {l:"Total Payables",     v:fmtC(totalAP),           col:C.red,    ic:"💳"},
          {l:"Total Customers",    v:CUSTOMERS.filter(c=>c.status==="active").length, col:C.green,  ic:"👥"},
          {l:"Credit Customers",   v:CUSTOMERS.filter(c=>c.balance>0).length,        col:C.yellow, ic:"⏳"},
          {l:"Total Sales Volume", v:`PKR ${(totalCustSales/1000000).toFixed(1)}M`,  col:C.accent, ic:"📈"},
        ].map(s=>(
          <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"9px",padding:"9px 14px",minWidth:"148px",flex:1,position:"relative",overflow:"hidden",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=s.col+"55"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{position:"absolute",top:0,right:0,width:"36px",height:"36px",borderRadius:"0 9px 0 36px",background:`${s.col}12`}}/>
            <div style={{fontSize:"8px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"3px"}}>{s.l}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"15px",fontWeight:"900",color:s.col}}>{s.v}</div>
              <span style={{fontSize:"16px"}}>{s.ic}</span>
            </div>
            <div style={{position:"absolute",bottom:0,left:0,height:"2px",width:"100%",background:`linear-gradient(90deg,${s.col},transparent)`}}/>
          </div>
        ))}
      </div>

      {/* ══════════════ ACCOUNTS RECEIVABLE ══════════════ */}
      {tab==="ar" && (
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <TH>Customer</TH><TH>City</TH><TH>Type</TH><TH right>Balance Due</TH><TH right>Credit Limit</TH><TH right>Utilization</TH><TH>Terms</TH><TH>Discount</TH><TH>Last Invoice</TH><TH>Status</TH><TH center>Actions</TH>
                </tr></thead>
                <tbody>
                  {filteredCusts.map((c,i)=>{
                    const util = c.creditLimit>0?(c.balance/c.creditLimit)*100:0;
                    const isSel = selected?.id===c.id;
                    return(
                      <tr key={c.id} onClick={()=>setSelected(isSel?null:c)}
                        style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:isSel?`${C.blue}0a`:"transparent",animation:`rowIn .12s ease ${i*.03}s both`}}
                        onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=C.panel}}
                        onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background=isSel?`${C.blue}0a`:"transparent"}}>
                        <td style={{padding:"11px 12px"}}>
                          <div style={{fontSize:"12px",fontWeight:"700",color:C.text}}>{c.name}</div>
                          <div style={{fontSize:"9px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>{c.code} · {c.contact}</div>
                        </td>
                        <td style={{padding:"11px 12px",fontSize:"11px",color:C.muted}}>{c.city}</td>
                        <td style={{padding:"11px 12px"}}><Tag l={c.type} col={c.type==="Wholesale"?C.blue:C.teal} sm/></td>
                        <td style={{padding:"11px 12px",textAlign:"right"}}>
                          <div style={{fontSize:"13px",fontWeight:"900",color:c.balance>0?C.red:C.muted,fontFamily:"'IBM Plex Mono'"}}>{c.balance>0?fmtC(c.balance):"—"}</div>
                        </td>
                        <td style={{padding:"11px 12px",textAlign:"right",fontSize:"11px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>{fmt(c.creditLimit)}</td>
                        <td style={{padding:"11px 12px",textAlign:"right"}}>
                          {c.balance>0?(
                            <div style={{display:"flex",alignItems:"center",gap:"6px",justifyContent:"flex-end"}}>
                              <div style={{width:"52px",height:"5px",background:C.border,borderRadius:"3px",overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${Math.min(100,util)}%`,background:util>90?C.red:util>60?C.yellow:C.green,borderRadius:"3px"}}/>
                              </div>
                              <span style={{fontSize:"9px",fontWeight:"700",color:util>90?C.red:util>60?C.yellow:C.green}}>{util.toFixed(0)}%</span>
                            </div>
                          ):<span style={{color:C.muted2,fontSize:"10px"}}>—</span>}
                        </td>
                        <td style={{padding:"11px 12px",fontSize:"11px",color:C.muted}}>{c.paymentTerms}</td>
                        <td style={{padding:"11px 12px",fontSize:"11px",fontWeight:"700",color:c.discount>0?C.green:C.muted}}>{c.discount>0?`${c.discount}%`:"—"}</td>
                        <td style={{padding:"11px 12px",fontSize:"10px",color:C.muted}}>{c.lastInvoice}</td>
                        <td style={{padding:"11px 12px"}}><Tag l={c.status==="active"?"Active":"Inactive"} col={c.status==="active"?C.green:C.muted} sm/></td>
                        <td style={{padding:"11px 12px"}} onClick={e=>e.stopPropagation()}>
                          <div style={{display:"flex",gap:"4px",justifyContent:"center"}}>
                            <Btn small outline color={C.blue}  onClick={()=>{setLedgerView({type:"cust",id:c.id});setTab("ledger");}}>📒 Ledger</Btn>
                            <Btn small outline color={C.green} onClick={()=>{setSelected(c);setShowReceipt(true);}}>💰 Receipt</Btn>
                            <Btn small outline color={C.teal}  onClick={()=>setShowStmt(c)}>📄 Statement</Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Detail Panel */}
          {selected && tab==="ar" && (
            <CustomerDetailPanel
              customer={selected}
              onClose={()=>setSelected(null)}
              onLedger={()=>{setLedgerView({type:"cust",id:selected.id});setTab("ledger");}}
              onReceipt={()=>setShowReceipt(true)}
              onStatement={()=>setShowStmt(selected)}
            />
          )}
        </div>
      )}

      {/* ══════════════ ACCOUNTS PAYABLE ══════════════ */}
      {tab==="ap" && (
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <TH>Vendor</TH><TH>City</TH><TH>Type</TH><TH right>Balance Due</TH><TH right>Credit Limit</TH><TH right>Utilization</TH><TH>Terms</TH><TH>Last Order</TH><TH center>Actions</TH>
                </tr></thead>
                <tbody>
                  {filteredVends.map((v,i)=>{
                    const util = v.creditLimit>0?(v.balance/v.creditLimit)*100:0;
                    const isSel = selected?.id===v.id;
                    return(
                      <tr key={v.id} onClick={()=>setSelected(isSel?null:v)}
                        style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:isSel?`${C.red}0a`:"transparent",animation:`rowIn .12s ease ${i*.03}s both`}}
                        onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=C.panel}}
                        onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background=isSel?`${C.red}0a`:"transparent"}}>
                        <td style={{padding:"11px 12px"}}>
                          <div style={{fontSize:"12px",fontWeight:"700",color:C.text}}>{v.name}</div>
                          <div style={{fontSize:"9px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>{v.code} · {v.contact}</div>
                        </td>
                        <td style={{padding:"11px 12px",fontSize:"11px",color:C.muted}}>{v.city}</td>
                        <td style={{padding:"11px 12px"}}><Tag l={v.type} col={v.type==="Manufacturer"?C.blue:v.type==="Brand"?C.purple:C.teal} sm/></td>
                        <td style={{padding:"11px 12px",textAlign:"right"}}>
                          <div style={{fontSize:"13px",fontWeight:"900",color:v.balance>0?C.red:C.muted,fontFamily:"'IBM Plex Mono'"}}>{v.balance>0?fmtC(v.balance):"—"}</div>
                        </td>
                        <td style={{padding:"11px 12px",textAlign:"right",fontSize:"11px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>{fmt(v.creditLimit)}</td>
                        <td style={{padding:"11px 12px",textAlign:"right"}}>
                          {v.balance>0?(
                            <div style={{display:"flex",alignItems:"center",gap:"6px",justifyContent:"flex-end"}}>
                              <div style={{width:"52px",height:"5px",background:C.border,borderRadius:"3px",overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${Math.min(100,util)}%`,background:util>80?C.red:util>50?C.yellow:C.green,borderRadius:"3px"}}/>
                              </div>
                              <span style={{fontSize:"9px",fontWeight:"700",color:util>80?C.red:util>50?C.yellow:C.green}}>{util.toFixed(0)}%</span>
                            </div>
                          ):<span style={{color:C.muted2,fontSize:"10px"}}>—</span>}
                        </td>
                        <td style={{padding:"11px 12px",fontSize:"11px",color:C.muted}}>{v.paymentTerms}</td>
                        <td style={{padding:"11px 12px",fontSize:"10px",color:C.muted}}>{v.lastOrder}</td>
                        <td style={{padding:"11px 12px"}} onClick={e=>e.stopPropagation()}>
                          <div style={{display:"flex",gap:"4px",justifyContent:"center"}}>
                            <Btn small outline color={C.purple} onClick={()=>{setLedgerView({type:"vend",id:v.id});setTab("ledger");}}>📒 Ledger</Btn>
                            <Btn small outline color={C.red}    onClick={()=>{setSelected(v);setShowPayment(true);}}>💳 Pay</Btn>
                            <Btn small outline color={C.teal}   onClick={()=>setShowStmt(v)}>📄 Statement</Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ LEDGER TAB ══════════════ */}
      {tab==="ledger" && (
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* Left: party selector */}
          <div style={{width:"230px",background:C.panel,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
            <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"6px"}}>Customers</div>
              {CUSTOMERS.filter(c=>CUST_LEDGER[c.id]).map(c=>(
                <div key={c.id} onClick={()=>setLedgerView({type:"cust",id:c.id})}
                  style={{padding:"7px 10px",borderRadius:"7px",cursor:"pointer",marginBottom:"3px",background:ledgerView?.id===c.id&&ledgerView?.type==="cust"?`${C.blue}18`:"transparent",border:`1px solid ${ledgerView?.id===c.id&&ledgerView?.type==="cust"?C.blue:C.border}`}}
                  onMouseEnter={e=>{if(!(ledgerView?.id===c.id&&ledgerView?.type==="cust"))e.currentTarget.style.background=C.card}}
                  onMouseLeave={e=>{if(!(ledgerView?.id===c.id&&ledgerView?.type==="cust"))e.currentTarget.style.background="transparent"}}>
                  <div style={{fontSize:"11px",fontWeight:"600",color:C.text}}>{c.name}</div>
                  {c.balance>0&&<div style={{fontSize:"9px",color:C.red,fontFamily:"'IBM Plex Mono'"}}>Due: {fmtC(c.balance)}</div>}
                </div>
              ))}
              <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",marginTop:"12px",marginBottom:"6px"}}>Vendors</div>
              {VENDORS.filter(v=>VEND_LEDGER[v.id]).map(v=>(
                <div key={v.id} onClick={()=>setLedgerView({type:"vend",id:v.id})}
                  style={{padding:"7px 10px",borderRadius:"7px",cursor:"pointer",marginBottom:"3px",background:ledgerView?.id===v.id&&ledgerView?.type==="vend"?`${C.purple}18`:"transparent",border:`1px solid ${ledgerView?.id===v.id&&ledgerView?.type==="vend"?C.purple:C.border}`}}
                  onMouseEnter={e=>{if(!(ledgerView?.id===v.id&&ledgerView?.type==="vend"))e.currentTarget.style.background=C.card}}
                  onMouseLeave={e=>{if(!(ledgerView?.id===v.id&&ledgerView?.type==="vend"))e.currentTarget.style.background="transparent"}}>
                  <div style={{fontSize:"11px",fontWeight:"600",color:C.text}}>{v.name}</div>
                  {v.balance>0&&<div style={{fontSize:"9px",color:C.red,fontFamily:"'IBM Plex Mono'"}}>Due: {fmtC(v.balance)}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Ledger entries */}
          <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
            {!ledgerView && (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:"12px"}}>
                <div style={{fontSize:"40px",opacity:.3}}>📒</div>
                <div style={{fontSize:"14px",color:C.muted}}>Select a customer or vendor to view their ledger</div>
              </div>
            )}
            {ledgerView && (() => {
              const isCust = ledgerView.type==="cust";
              const party  = isCust ? CUSTOMERS.find(c=>c.id===ledgerView.id) : VENDORS.find(v=>v.id===ledgerView.id);
              const entries= isCust ? (CUST_LEDGER[ledgerView.id]||[]) : (VEND_LEDGER[ledgerView.id]||[]);
              const accentCol = isCust ? C.blue : C.purple;
              const openBal = 0;
              let runningBal = openBal;
              return (
                <div>
                  {/* Party header */}
                  <div style={{background:C.card,border:`1px solid ${accentCol}33`,borderRadius:"11px",padding:"16px 18px",marginBottom:"16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontSize:"15px",fontWeight:"900",color:C.text}}>{party?.name}</div>
                      <div style={{fontSize:"10px",color:C.muted,marginTop:"2px"}}>{party?.code} · {party?.city} · {isCust?"Customer":"Vendor"}</div>
                    </div>
                    <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:"9px",color:C.muted,textTransform:"uppercase",letterSpacing:".07em"}}>Current Balance</div>
                        <div style={{fontSize:"18px",fontWeight:"900",color:party?.balance>0?C.red:C.green,fontFamily:"'IBM Plex Mono'"}}>{party?.balance>0?`PKR ${fmt(party.balance)}`:"Nil"}</div>
                      </div>
                      <Btn small outline color={accentCol} onClick={()=>setShowStmt(party)}>📄 Statement</Btn>
                      {isCust && <Btn small color={C.green} onClick={()=>setShowReceipt(true)}>💰 Receipt</Btn>}
                      {!isCust && <Btn small color={C.red}   onClick={()=>setShowPayment(true)}>💳 Payment</Btn>}
                    </div>
                  </div>

                  {/* Ledger table */}
                  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",overflow:"hidden"}}>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr>
                        <TH>Date</TH><TH>Type</TH><TH>Reference</TH><TH>Description</TH><TH right>Debit</TH><TH right>Credit</TH><TH right>Balance</TH>
                      </tr></thead>
                      <tbody>
                        {/* Opening */}
                        <tr style={{background:`${C.yellow}0a`,borderBottom:`1px solid ${C.border}`}}>
                          <td style={{padding:"9px 12px",fontSize:"10px",color:C.muted}}>Opening</td>
                          <td colSpan={5} style={{padding:"9px 12px",fontSize:"10px",color:C.muted,fontStyle:"italic"}}>Opening Balance b/d</td>
                          <td style={{padding:"9px 12px",textAlign:"right",fontSize:"11px",fontWeight:"800",fontFamily:"'IBM Plex Mono'",color:C.yellow}}>{fmtC(openBal)}</td>
                        </tr>
                        {entries.map((e,i)=>(
                          <tr key={i} style={{borderBottom:`1px solid ${C.border}`,animation:`rowIn .1s ease ${i*.02}s both`}}
                            onMouseEnter={ev=>ev.currentTarget.style.background=C.panel}
                            onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                            <td style={{padding:"9px 12px",fontSize:"10px",color:C.muted,whiteSpace:"nowrap"}}>{e.date}</td>
                            <td style={{padding:"9px 12px"}}>
                              <Tag l={e.type} col={e.type==="Invoice"?C.accent:e.type==="Receipt"||e.type==="Payment"?C.green:C.blue} sm/>
                            </td>
                            <td style={{padding:"9px 12px",fontSize:"10px",color:accentCol,fontFamily:"'IBM Plex Mono'",whiteSpace:"nowrap"}}>{e.ref}</td>
                            <td style={{padding:"9px 12px",fontSize:"11px",color:C.text}}>{e.desc}</td>
                            <td style={{padding:"9px 12px",textAlign:"right",fontSize:"11px",fontWeight:e.debit>0?"700":"400",color:e.debit>0?C.red:C.muted2,fontFamily:"'IBM Plex Mono'"}}>{e.debit>0?fmt(e.debit):"—"}</td>
                            <td style={{padding:"9px 12px",textAlign:"right",fontSize:"11px",fontWeight:e.credit>0?"700":"400",color:e.credit>0?C.green:C.muted2,fontFamily:"'IBM Plex Mono'"}}>{e.credit>0?fmt(e.credit):"—"}</td>
                            <td style={{padding:"9px 12px",textAlign:"right",fontSize:"11px",fontWeight:"800",fontFamily:"'IBM Plex Mono'",color:e.balance>0?C.red:e.balance<0?C.blue:C.green}}>{fmtC(Math.abs(e.balance))} {e.balance>0?"Dr":e.balance<0?"Cr":"✓"}</td>
                          </tr>
                        ))}
                        {/* Closing */}
                        <tr style={{background:`${C.green}08`,borderTop:`2px solid ${C.border}`}}>
                          <td colSpan={6} style={{padding:"10px 12px",fontSize:"11px",fontWeight:"700",color:C.muted}}>Closing Balance c/d</td>
                          <td style={{padding:"10px 12px",textAlign:"right",fontSize:"13px",fontWeight:"900",fontFamily:"'IBM Plex Mono'",color:party?.balance>0?C.red:C.green}}>
                            {party?.balance>0?fmtC(party.balance):"Nil"} {party?.balance>0?"Dr":""}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══════════════ RECEIPTS TAB ══════════════ */}
      {tab==="receipts" && (
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>
                <TH>Receipt #</TH><TH>Date</TH><TH>Customer</TH><TH>Method</TH><TH>Reference</TH><TH>Bank</TH><TH right>Amount</TH><TH>Status</TH><TH center>Actions</TH>
              </tr></thead>
              <tbody>
                {receipts.map((r,i)=>(
                  <tr key={r.id} style={{borderBottom:`1px solid ${C.border}`,animation:`rowIn .1s ease ${i*.04}s both`}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"10px 12px",fontSize:"11px",fontWeight:"700",color:C.green,fontFamily:"'IBM Plex Mono'"}}>{r.number}</td>
                    <td style={{padding:"10px 12px",fontSize:"10px",color:C.muted}}>{r.date}</td>
                    <td style={{padding:"10px 12px",fontSize:"11px",fontWeight:"600",color:C.text}}>{r.customer}</td>
                    <td style={{padding:"10px 12px"}}>
                      <Tag l={r.method} col={r.method==="Cash"?C.green:r.method==="Bank Transfer"?C.blue:C.purple} sm/>
                    </td>
                    <td style={{padding:"10px 12px",fontSize:"10px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>{r.ref||"—"}</td>
                    <td style={{padding:"10px 12px",fontSize:"10px",color:C.muted}}>{r.bank||"—"}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:"13px",fontWeight:"900",color:C.green,fontFamily:"'IBM Plex Mono'"}}>{fmtC(r.amount)}</td>
                    <td style={{padding:"10px 12px"}}><Tag l="Posted" col={C.green} sm/></td>
                    <td style={{padding:"10px 12px"}} >
                      <div style={{display:"flex",gap:"4px",justifyContent:"center"}}>
                        <Btn small outline color={C.blue} onClick={()=>notify("Receipt printed")}>🖨 Print</Btn>
                        <Btn small outline color={C.teal} onClick={()=>notify("Email sent")}>📧</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════ PAYMENTS TAB ══════════════ */}
      {tab==="payments" && (
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>
                <TH>Payment #</TH><TH>Date</TH><TH>Vendor</TH><TH>Method</TH><TH>Reference</TH><TH>Bank</TH><TH right>Amount</TH><TH>Status</TH><TH center>Actions</TH>
              </tr></thead>
              <tbody>
                {payments.map((p,i)=>(
                  <tr key={p.id} style={{borderBottom:`1px solid ${C.border}`,animation:`rowIn .1s ease ${i*.04}s both`}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"10px 12px",fontSize:"11px",fontWeight:"700",color:C.red,fontFamily:"'IBM Plex Mono'"}}>{p.number}</td>
                    <td style={{padding:"10px 12px",fontSize:"10px",color:C.muted}}>{p.date}</td>
                    <td style={{padding:"10px 12px",fontSize:"11px",fontWeight:"600",color:C.text}}>{p.vendor}</td>
                    <td style={{padding:"10px 12px"}}>
                      <Tag l={p.method} col={p.method==="Cash"?C.green:p.method==="Bank Transfer"?C.blue:C.purple} sm/>
                    </td>
                    <td style={{padding:"10px 12px",fontSize:"10px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>{p.ref||"—"}</td>
                    <td style={{padding:"10px 12px",fontSize:"10px",color:C.muted}}>{p.bank||"—"}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:"13px",fontWeight:"900",color:C.red,fontFamily:"'IBM Plex Mono'"}}>{fmtC(p.amount)}</td>
                    <td style={{padding:"10px 12px"}}><Tag l="Posted" col={C.green} sm/></td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:"4px",justifyContent:"center"}}>
                        <Btn small outline color={C.blue} onClick={()=>notify("Payment voucher printed")}>🖨 Print</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════ AGING SUMMARY ══════════════ */}
      {tab==="aging" && (
        <div style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:"16px"}}>
          {/* AR Aging */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
            <div style={{fontSize:"14px",fontWeight:"800",color:C.text,marginBottom:"4px"}}>Accounts Receivable Aging</div>
            <div style={{fontSize:"10px",color:C.muted,marginBottom:"14px"}}>Customer-wise outstanding balances by age bucket</div>
            {(() => {
              const tots={current:AR_AGING.reduce((s,r)=>s+r.current,0),d30:AR_AGING.reduce((s,r)=>s+r.d30,0),d60:AR_AGING.reduce((s,r)=>s+r.d60,0),d90:AR_AGING.reduce((s,r)=>s+r.d90,0),d90plus:AR_AGING.reduce((s,r)=>s+r.d90plus,0)};
              const total=Object.values(tots).reduce((a,b)=>a+b,0);
              const buckets=[{l:"Current",k:"current",col:C.green},{l:"1–30 Days",k:"d30",col:C.yellow},{l:"31–60 Days",k:"d60",col:C.accent},{l:"61–90 Days",k:"d90",col:C.red},{l:"90+ Days",k:"d90plus",col:"#dc2626"}];
              return(
                <>
                  {/* Visual bar */}
                  <div style={{display:"flex",height:"32px",borderRadius:"7px",overflow:"hidden",gap:"2px",marginBottom:"12px"}}>
                    {buckets.filter(b=>tots[b.k]>0).map(b=>(
                      <div key={b.k} style={{flex:tots[b.k],background:b.col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:"700",color:"#fff",minWidth:"18px"}}>
                        {(tots[b.k]/total*100)>8?`${(tots[b.k]/total*100).toFixed(0)}%`:""}
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:"14px",flexWrap:"wrap",marginBottom:"14px"}}>
                    {buckets.map(b=>(
                      <div key={b.k} style={{display:"flex",alignItems:"center",gap:"6px"}}>
                        <div style={{width:"9px",height:"9px",borderRadius:"2px",background:b.col}}/>
                        <span style={{fontSize:"10px",color:C.muted}}>{b.l}</span>
                        <span style={{fontSize:"11px",fontWeight:"800",color:b.col,fontFamily:"'IBM Plex Mono'"}}>{fmtC(tots[b.k])}</span>
                      </div>
                    ))}
                    <span style={{marginLeft:"auto",fontSize:"12px",fontWeight:"900",color:C.accent}}>Total: {fmtC(total)}</span>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>
                      <TH>Customer</TH>
                      {["Total","Current","1–30 Days","31–60 Days","61–90 Days","90+ Days"].map((h,hi)=>(
                        <th key={h} style={{padding:"7px 11px",fontSize:"9px",fontWeight:"700",textTransform:"uppercase",letterSpacing:".06em",borderBottom:`1px solid ${C.border}`,background:C.panel,textAlign:"right",color:[C.text,C.green,C.yellow,C.accent,C.red,"#dc2626"][hi],whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                      <TH center>Action</TH>
                    </tr></thead>
                    <tbody>
                      {AR_AGING.map((row,i)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}
                          onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{padding:"10px 11px",fontSize:"12px",fontWeight:"700",color:C.text}}>{row.customer}</td>
                          {[row.total,row.current,row.d30,row.d60,row.d90,row.d90plus].map((v,vi)=>(
                            <td key={vi} style={{padding:"10px 11px",textAlign:"right",fontSize:"11px",fontWeight:vi===0?"800":"600",color:v>0?[C.text,C.green,C.yellow,C.accent,C.red,"#dc2626"][vi]:C.muted2,fontFamily:"'IBM Plex Mono'"}}>{v>0?fmt(v):"—"}</td>
                          ))}
                          <td style={{padding:"10px 11px",textAlign:"center"}}>
                            <Btn small outline color={C.green} onClick={()=>notify(`Receipt initiated for ${row.customer}`)}>💰 Receive</Btn>
                          </td>
                        </tr>
                      ))}
                      <tr style={{borderTop:`2px solid ${C.border2}`,background:`${C.blue}08`}}>
                        <td style={{padding:"10px 11px",fontWeight:"900",color:C.text,fontSize:"11px"}}>TOTAL</td>
                        {["total","current","d30","d60","d90","d90plus"].map((k,ki)=>(
                          <td key={k} style={{padding:"10px 11px",textAlign:"right",fontWeight:"900",color:[C.accent,C.green,C.yellow,C.accent,C.red,"#dc2626"][ki],fontSize:"12px",fontFamily:"'IBM Plex Mono'"}}>
                            {fmt(AR_AGING.reduce((s,r)=>s+r[k],0))}
                          </td>
                        ))}
                        <td/>
                      </tr>
                    </tbody>
                  </table>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══════════════ MODALS ══════════════ */}
      {showReceipt && (
        <ReceiptModal
          customers={CUSTOMERS}
          preSelected={selected?.id||""}
          onClose={()=>setShowReceipt(false)}
          onSave={r=>{setReceipts(p=>[r,...p]);setShowReceipt(false);notify(`${r.number} posted`);}}
        />
      )}
      {showPayment && (
        <PaymentModal
          vendors={VENDORS}
          preSelected={selected?.id||""}
          onClose={()=>setShowPayment(false)}
          onSave={p=>{setPayments(prev=>[p,...prev]);setShowPayment(false);notify(`${p.number} posted`);}}
        />
      )}
      {showStmt && (
        <StatementModal
          party={showStmt}
          entries={showStmt.code?.startsWith("CUS")?CUST_LEDGER[showStmt.id]||[]:VEND_LEDGER[showStmt.id]||[]}
          isCust={showStmt.code?.startsWith("CUS")}
          onClose={()=>setShowStmt(null)}
          onPrint={()=>notify("Statement sent to printer")}
        />
      )}

      {notif && (
        <div style={{position:"fixed",top:"14px",left:"50%",transform:"translateX(-50%)",zIndex:500,background:notif.type==="error"?C.red:C.green,color:"#fff",padding:"10px 18px",borderRadius:"8px",fontSize:"12px",fontWeight:"700",boxShadow:"0 8px 24px rgba(0,0,0,.5)",animation:"slideIn .2s ease",whiteSpace:"nowrap"}}>
          {notif.type==="error"?"✕":"✓"} {notif.msg}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CUSTOMER DETAIL PANEL
// ══════════════════════════════════════════════════════════════════
function CustomerDetailPanel({customer:c,onClose,onLedger,onReceipt,onStatement}){
  const recentEntries = CUST_LEDGER[c.id]||[];
  return(
    <div style={{width:"310px",background:C.panel,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,animation:"slideRight .2s ease",overflow:"hidden"}}>
      <div style={{padding:"13px 15px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:"13px",fontWeight:"800",color:C.text}}>Customer Profile</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"16px"}}>✕</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
        {/* Hero */}
        <div style={{background:`linear-gradient(135deg,${C.blue}18,${C.teal}0a)`,border:`1px solid ${C.blue}22`,borderRadius:"10px",padding:"14px",marginBottom:"14px"}}>
          <div style={{fontSize:"14px",fontWeight:"900",color:C.text,marginBottom:"4px"}}>{c.name}</div>
          <div style={{display:"flex",gap:"5px",flexWrap:"wrap",marginBottom:"8px"}}>
            <Tag l={c.code}         col={C.blue} sm/>
            <Tag l={c.type}         col={c.type==="Wholesale"?C.teal:C.purple} sm/>
            <Tag l={c.status==="active"?"Active":"Inactive"} col={c.status==="active"?C.green:C.muted} sm/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
            <div>
              <div style={{fontSize:"9px",color:C.muted,textTransform:"uppercase",letterSpacing:".06em"}}>Balance Due</div>
              <div style={{fontSize:"20px",fontWeight:"900",color:c.balance>0?C.red:C.green,fontFamily:"'IBM Plex Mono'"}}>{c.balance>0?fmtC(c.balance):"Nil"}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:"9px",color:C.muted}}>Total Sales</div>
              <div style={{fontSize:"13px",fontWeight:"800",color:C.accent}}>PKR {(c.totalSales/1000000).toFixed(1)}M</div>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px",marginBottom:"14px"}}>
          {[
            {l:"Contact",v:c.contact},{l:"Phone",v:c.phone},
            {l:"City",v:c.city},{l:"Terms",v:c.paymentTerms},
            {l:"Discount",v:c.discount>0?`${c.discount}%`:"None",col:c.discount>0?C.green:undefined},
            {l:"Credit Limit",v:fmtC(c.creditLimit),col:C.blue},
            {l:"NTN",v:c.ntn,full:true},{l:"Last Invoice",v:c.lastInvoice,full:true},
          ].map(s=>(
            <div key={s.l} style={{background:C.card,borderRadius:"7px",padding:"8px 10px",gridColumn:s.full?"1/-1":"auto"}}>
              <div style={{fontSize:"8px",color:C.muted,marginBottom:"2px",textTransform:"uppercase",letterSpacing:".06em"}}>{s.l}</div>
              <div style={{fontSize:"11px",fontWeight:"700",color:s.col||C.text}}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Credit utilization */}
        {c.balance>0&&(
          <div style={{background:C.card,borderRadius:"9px",padding:"11px",marginBottom:"12px",border:`1px solid ${(c.balance/c.creditLimit)>.8?C.red+"44":C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:C.muted,marginBottom:"6px"}}>
              <span>Credit Used</span>
              <span style={{fontWeight:"700",color:(c.balance/c.creditLimit)>.8?C.red:C.yellow}}>{((c.balance/c.creditLimit)*100).toFixed(0)}%</span>
            </div>
            <div style={{height:"6px",background:C.border,borderRadius:"3px",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.min(100,(c.balance/c.creditLimit)*100)}%`,background:(c.balance/c.creditLimit)>.8?C.red:(c.balance/c.creditLimit)>.6?C.yellow:C.green,borderRadius:"3px"}}/>
            </div>
          </div>
        )}

        {/* Recent transactions */}
        {recentEntries.length>0&&(
          <>
            <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"7px"}}>Recent Transactions</div>
            {recentEntries.slice(-4).reverse().map((e,i)=>(
              <div key={i} style={{padding:"8px 10px",background:C.card,borderRadius:"7px",marginBottom:"5px",display:"flex",alignItems:"center",gap:"8px"}}>
                <Tag l={e.type} col={e.type==="Invoice"?C.accent:C.green} sm/>
                <div style={{flex:1,fontSize:"10px",color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.ref}</div>
                <div style={{fontSize:"11px",fontWeight:"800",color:e.debit>0?C.red:C.green,fontFamily:"'IBM Plex Mono'"}}>{e.debit>0?`+${fmt(e.debit)}`:fmt(e.credit)}</div>
              </div>
            ))}
          </>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:"6px",marginTop:"12px"}}>
          <Btn full color={C.blue}  outline small onClick={onLedger}>📒 View Full Ledger</Btn>
          <Btn full color={C.green} small       onClick={onReceipt}>💰 Record Receipt</Btn>
          <Btn full color={C.teal}  outline small onClick={onStatement}>📄 Print Statement</Btn>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// RECEIPT MODAL
// ══════════════════════════════════════════════════════════════════
function ReceiptModal({customers,preSelected,onClose,onSave}){
  const [custId,  setCustId]  = useState(preSelected||customers[0]?.id||"");
  const [amount,  setAmount]  = useState("");
  const [method,  setMethod]  = useState("Bank Transfer");
  const [bank,    setBank]    = useState("HBL");
  const [ref,     setRef]     = useState("");
  const [date,    setDate]    = useState(today);
  const [notes,   setNotes]   = useState("");

  const cust = customers.find(c=>c.id===custId);
  const num  = `RCV-2024-${String(Math.floor(Math.random()*900+100)).padStart(5,"0")}`;

  const handleSave=()=>{
    onSave({id:`r_${Date.now()}`,number:num,date,customer:cust?.name||"",custId,amount:+amount,method,ref,bank:method==="Cash"?"":bank,invoices:[],status:"posted"});
  };

  const iStyle={width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"9px 11px",color:C.text,fontSize:"12px",outline:"none",fontFamily:"inherit"};
  const Lbl=({l,children})=><div><label style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:"4px"}}>{l}</label>{children}</div>;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",width:"520px",overflow:"hidden",animation:"slideIn .2s ease"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,background:C.panel,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:"900",fontSize:"15px",color:C.text}}>Record Customer Receipt</div>
            <div style={{fontSize:"10px",color:C.muted}}>Post payment received from customer</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px"}}>✕</button>
        </div>
        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:"13px"}}>
          <Lbl l="Customer">
            <select value={custId} onChange={e=>setCustId(e.target.value)} style={iStyle}>
              {customers.filter(c=>c.status==="active").map(c=><option key={c.id} value={c.id}>{c.name}{c.balance>0?` — Due: PKR ${fmt(c.balance)}`:""}</option>)}
            </select>
          </Lbl>
          {cust&&cust.balance>0&&(
            <div style={{padding:"10px 12px",background:`${C.red}0a`,border:`1px solid ${C.red}22`,borderRadius:"7px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"11px",color:C.muted}}>Outstanding Balance</span>
              <span style={{fontSize:"14px",fontWeight:"900",color:C.red,fontFamily:"'IBM Plex Mono'"}}>{fmtC(cust.balance)}</span>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
            <Lbl l="Receipt Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={iStyle}/></Lbl>
            <Lbl l="Amount (PKR)"><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" style={iStyle}/></Lbl>
            <Lbl l="Payment Method">
              <select value={method} onChange={e=>setMethod(e.target.value)} style={iStyle}>
                {["Cash","Bank Transfer","Cheque","Online Payment"].map(m=><option key={m}>{m}</option>)}
              </select>
            </Lbl>
            {method!=="Cash"&&<Lbl l="Bank / Account"><select value={bank} onChange={e=>setBank(e.target.value)} style={iStyle}><option>HBL</option><option>MCB</option><option>UBL</option><option>Meezan</option><option>Allied</option></select></Lbl>}
          </div>
          {method!=="Cash"&&<Lbl l="Reference / IBFT / Cheque No."><input value={ref} onChange={e=>setRef(e.target.value)} placeholder="Transaction reference" style={iStyle}/></Lbl>}
          <Lbl l="Notes"><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional notes" style={iStyle}/></Lbl>

          {amount&&+amount>0&&(
            <div style={{padding:"12px",background:`${C.green}0a`,border:`1px solid ${C.green}22`,borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"11px",color:C.muted}}>Receipt Amount</span>
              <span style={{fontSize:"16px",fontWeight:"900",color:C.green,fontFamily:"'IBM Plex Mono'"}}>{fmtC(+amount)}</span>
            </div>
          )}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:"8px"}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:"8px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontWeight:"600",fontSize:"12px"}}>Cancel</button>
          <Btn color={C.green} onClick={handleSave} disabled={!amount||+amount<=0}>✓ Post Receipt</Btn>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAYMENT MODAL
// ══════════════════════════════════════════════════════════════════
function PaymentModal({vendors,preSelected,onClose,onSave}){
  const [vendId, setVendId]  = useState(preSelected||vendors[0]?.id||"");
  const [amount, setAmount]  = useState("");
  const [method, setMethod]  = useState("Bank Transfer");
  const [bank,   setBank]    = useState("HBL");
  const [ref,    setRef]     = useState("");
  const [date,   setDate]    = useState(today);

  const vend = vendors.find(v=>v.id===vendId);
  const num  = `PAY-2024-${String(Math.floor(Math.random()*900+100)).padStart(5,"0")}`;

  const iStyle={width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"9px 11px",color:C.text,fontSize:"12px",outline:"none",fontFamily:"inherit"};
  const Lbl=({l,children})=><div><label style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:"4px"}}>{l}</label>{children}</div>;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",width:"500px",overflow:"hidden",animation:"slideIn .2s ease"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,background:C.panel,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:"900",fontSize:"15px",color:C.text}}>Record Vendor Payment</div>
            <div style={{fontSize:"10px",color:C.muted}}>Post payment made to vendor</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px"}}>✕</button>
        </div>
        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:"13px"}}>
          <Lbl l="Vendor">
            <select value={vendId} onChange={e=>setVendId(e.target.value)} style={iStyle}>
              {vendors.map(v=><option key={v.id} value={v.id}>{v.name}{v.balance>0?` — Due: PKR ${fmt(v.balance)}`:""}</option>)}
            </select>
          </Lbl>
          {vend&&vend.balance>0&&(
            <div style={{padding:"10px 12px",background:`${C.red}0a`,border:`1px solid ${C.red}22`,borderRadius:"7px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"11px",color:C.muted}}>Balance Due to Vendor</span>
              <span style={{fontSize:"14px",fontWeight:"900",color:C.red,fontFamily:"'IBM Plex Mono'"}}>{fmtC(vend.balance)}</span>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
            <Lbl l="Payment Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={iStyle}/></Lbl>
            <Lbl l="Amount (PKR)"><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" style={iStyle}/></Lbl>
            <Lbl l="Payment Method">
              <select value={method} onChange={e=>setMethod(e.target.value)} style={iStyle}>
                {["Bank Transfer","Cheque","Cash"].map(m=><option key={m}>{m}</option>)}
              </select>
            </Lbl>
            <Lbl l="Bank Account"><select value={bank} onChange={e=>setBank(e.target.value)} style={iStyle}><option>HBL</option><option>MCB</option><option>UBL</option><option>Meezan</option></select></Lbl>
          </div>
          <Lbl l="Reference / Transaction ID"><input value={ref} onChange={e=>setRef(e.target.value)} placeholder="IBFT reference, cheque number..." style={iStyle}/></Lbl>
          {amount&&+amount>0&&(
            <div style={{padding:"12px",background:`${C.red}0a`,border:`1px solid ${C.red}22`,borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"11px",color:C.muted}}>Payment Amount</span>
              <span style={{fontSize:"16px",fontWeight:"900",color:C.red,fontFamily:"'IBM Plex Mono'"}}>{fmtC(+amount)}</span>
            </div>
          )}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:"8px"}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:"8px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontWeight:"600",fontSize:"12px"}}>Cancel</button>
          <Btn color={C.red} onClick={()=>onSave({id:`p_${Date.now()}`,number:num,date,vendor:vend?.name||"",vendId,amount:+amount,method,ref,bank,invoices:[],status:"posted"})} disabled={!amount||+amount<=0}>✓ Post Payment</Btn>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// STATEMENT MODAL (print-ready account statement)
// ══════════════════════════════════════════════════════════════════
function StatementModal({party,entries,isCust,onClose,onPrint}){
  const balance = party.balance||0;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:400,paddingTop:"30px",overflowY:"auto"}}>
      <div style={{width:"580px",marginBottom:"40px",animation:"printIn .25s ease"}}>
        {/* Print actions */}
        <div style={{display:"flex",gap:"8px",marginBottom:"12px",justifyContent:"flex-end"}}>
          <Btn small color={C.blue} onClick={onPrint}>🖨 Print</Btn>
          <Btn small outline color={C.teal} onClick={()=>{}}>📧 Email</Btn>
          <Btn small outline color={C.muted} onClick={onClose}>✕ Close</Btn>
        </div>

        {/* Statement paper */}
        <div style={{background:"#ffffff",borderRadius:"10px",overflow:"hidden",color:"#1a202c",fontFamily:"'IBM Plex Sans',sans-serif",boxShadow:"0 20px 60px rgba(0,0,0,.6)"}}>
          {/* Header */}
          <div style={{background:"#1a202c",padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{color:"#f97316",fontWeight:"900",fontSize:"18px",letterSpacing:".02em"}}>INFOSYS PAK ERP</div>
              <div style={{color:"#9ca3af",fontSize:"10px",marginTop:"2px"}}>Al-Baraka Textiles Pvt Ltd</div>
              <div style={{color:"#6b7280",fontSize:"9px"}}>Main Market, Lahore · NTN: 1234567-8 · 042-111-234-567</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{color:"#ffffff",fontWeight:"800",fontSize:"15px"}}>{isCust?"ACCOUNT STATEMENT":"VENDOR STATEMENT"}</div>
              <div style={{color:"#9ca3af",fontSize:"10px",marginTop:"3px"}}>Period: Jan 2024 – Mar 2024</div>
              <div style={{color:"#6b7280",fontSize:"9px"}}>Printed: {today}</div>
            </div>
          </div>

          <div style={{padding:"20px 24px"}}>
            {/* Party info */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"18px",padding:"14px",background:"#f9fafb",borderRadius:"8px",border:"1px solid #e5e7eb"}}>
              <div>
                <div style={{fontSize:"9px",color:"#6b7280",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"3px"}}>{isCust?"Bill To":"Vendor"}</div>
                <div style={{fontSize:"14px",fontWeight:"800",color:"#111827"}}>{party.name}</div>
                <div style={{fontSize:"11px",color:"#4b5563"}}>{party.city}</div>
                <div style={{fontSize:"10px",color:"#6b7280"}}>{party.phone} · {party.email}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"9px",color:"#6b7280",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"3px"}}>Current Balance</div>
                <div style={{fontSize:"22px",fontWeight:"900",color:balance>0?"#dc2626":"#059669"}}>{balance>0?fmtC(balance):"NIL"}</div>
                <div style={{fontSize:"9px",color:"#9ca3af",marginTop:"2px"}}>{balance>0?`${isCust?"Amount due from customer":"Amount due to vendor"}`:"Account is clear"}</div>
              </div>
            </div>

            {/* Entries table */}
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px",marginBottom:"16px"}}>
              <thead>
                <tr style={{background:"#f3f4f6"}}>
                  {["Date","Type","Reference","Description","Debit","Credit","Balance"].map(h=>(
                    <th key={h} style={{padding:"7px 10px",textAlign:["Debit","Credit","Balance"].includes(h)?"right":"left",fontSize:"9px",fontWeight:"700",color:"#6b7280",textTransform:"uppercase",letterSpacing:".06em",borderBottom:"1px solid #e5e7eb"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{background:"#fef9ec"}}>
                  <td style={{padding:"6px 10px",fontSize:"10px",color:"#6b7280"}}>Opening</td>
                  <td colSpan={5} style={{padding:"6px 10px",fontSize:"10px",color:"#6b7280",fontStyle:"italic"}}>Opening Balance b/d</td>
                  <td style={{padding:"6px 10px",textAlign:"right",fontSize:"10px",fontWeight:"700",color:"#6b7280"}}>—</td>
                </tr>
                {entries.map((e,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"6px 10px",fontSize:"10px",color:"#6b7280",whiteSpace:"nowrap"}}>{e.date}</td>
                    <td style={{padding:"6px 10px"}}><span style={{fontSize:"9px",fontWeight:"700",padding:"1px 5px",borderRadius:"3px",background:e.type==="Invoice"?"#fff7ed":"#f0fdf4",color:e.type==="Invoice"?"#ea580c":"#059669"}}>{e.type}</span></td>
                    <td style={{padding:"6px 10px",fontSize:"9px",color:"#3b82f6",fontFamily:"monospace",whiteSpace:"nowrap"}}>{e.ref}</td>
                    <td style={{padding:"6px 10px",fontSize:"10px",color:"#374151",maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.desc}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontSize:"10px",fontWeight:e.debit>0?"700":"400",color:e.debit>0?"#dc2626":"#d1d5db",fontFamily:"monospace"}}>{e.debit>0?fmt(e.debit):"—"}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontSize:"10px",fontWeight:e.credit>0?"700":"400",color:e.credit>0?"#059669":"#d1d5db",fontFamily:"monospace"}}>{e.credit>0?fmt(e.credit):"—"}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontSize:"10px",fontWeight:"700",color:e.balance>0?"#dc2626":e.balance<0?"#2563eb":"#059669",fontFamily:"monospace"}}>{fmt(Math.abs(e.balance))} {e.balance!==0?(e.balance>0?"Dr":"Cr"):""}</td>
                  </tr>
                ))}
                <tr style={{background:"#f0fdf4",borderTop:"1.5px solid #d1fae5"}}>
                  <td colSpan={6} style={{padding:"9px 10px",fontWeight:"800",fontSize:"12px",color:"#1a202c"}}>Closing Balance</td>
                  <td style={{padding:"9px 10px",textAlign:"right",fontWeight:"900",fontSize:"14px",color:balance>0?"#dc2626":"#059669",fontFamily:"monospace"}}>{balance>0?fmtC(balance):"NIL"}</td>
                </tr>
              </tbody>
            </table>

            <div style={{borderTop:"1px dashed #e5e7eb",paddingTop:"12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"9px",color:"#9ca3af"}}>Generated by Infosys Pak ERP · {today} · {isCust?party.code:party.code}</div>
              <div style={{fontSize:"9px",color:"#9ca3af"}}>This is a computer-generated statement and requires no signature.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

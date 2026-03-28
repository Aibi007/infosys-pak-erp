import { useState, useMemo, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Scatter
} from "recharts";

// ================================================================
// INFOSYS PAK ERP — PART 5: FBR INTEGRATION + REPORTS & ANALYTICS
// FBR Sync · Z-Report · Aging · Sales · P&L · Drill-Down · Export
// ================================================================

// ── MOCK DATA ────────────────────────────────────────────────────
const MONTHS = ["Oct","Nov","Dec","Jan","Feb","Mar"];

const SALES_TREND = [
  { month:"Oct'23", sales:4200000, purchases:2800000, profit:1400000, target:4000000, returns:120000, invoices:612 },
  { month:"Nov'23", sales:5100000, purchases:3200000, profit:1900000, target:5000000, returns:95000,  invoices:743 },
  { month:"Dec'23", sales:7800000, purchases:4500000, profit:3300000, target:7000000, returns:180000, invoices:1102 },
  { month:"Jan'24", sales:6200000, purchases:3900000, profit:2300000, target:6500000, returns:145000, invoices:891 },
  { month:"Feb'24", sales:5500000, purchases:3400000, profit:2100000, target:5500000, returns:110000, invoices:802 },
  { month:"Mar'24", sales:6900000, purchases:4100000, profit:2800000, target:7000000, returns:160000, invoices:978 },
];

const DAILY_SALES = [
  { day:"Mon",sales:245000,txns:34}, { day:"Tue",sales:312000,txns:45},
  { day:"Wed",sales:189000,txns:28}, { day:"Thu",sales:420000,txns:61},
  { day:"Fri",sales:580000,txns:84}, { day:"Sat",sales:890000,txns:129},
  { day:"Sun",sales:320000,txns:46},
];

const VENDOR_SALES = [
  { vendor:"Gul Ahmed",    sales:2800000, profit:980000, margin:35.0, qty:702,  color:"#f97316" },
  { vendor:"Khaadi",       sales:2200000, profit:748000, margin:34.0, qty:548,  color:"#3b82f6" },
  { vendor:"Sapphire",     sales:1400000, profit:448000, margin:32.0, qty:623,  color:"#10b981" },
  { vendor:"Bonanza",      sales:900000,  profit:315000, margin:35.0, qty:321,  color:"#8b5cf6" },
  { vendor:"Alkaram",      sales:600000,  profit:192000, margin:32.0, qty:171,  color:"#f59e0b" },
  { vendor:"Nishat Linen", sales:450000,  profit:135000, margin:30.0, qty:82,   color:"#06b6d4" },
  { vendor:"Limelight",    sales:350000,  profit:112000, margin:32.0, qty:94,   color:"#ec4899" },
];

const BRANCH_DATA = [
  { branch:"Lahore Main",  sales:3400000, target:3500000, invoices:1180, cashiers:4 },
  { branch:"Karachi",      sales:2100000, target:2000000, invoices:698,  cashiers:3 },
  { branch:"Islamabad",    sales:950000,  target:1000000, invoices:312,  cashiers:2 },
  { branch:"Faisalabad",   sales:310000,  target:400000,  invoices:102,  cashiers:1 },
  { branch:"Multan",       sales:140000,  target:200000,  invoices:64,   cashiers:1 },
];

const PAYMENT_MIX = [
  { name:"Cash",         value:45, amount:3105000, color:"#10b981" },
  { name:"Bank Transfer",value:28, amount:1932000, color:"#3b82f6" },
  { name:"Credit",       value:18, amount:1242000, color:"#f59e0b" },
  { name:"Cheque",       value:9,  amount:621000,  color:"#8b5cf6" },
];

const CATEGORY_DATA = [
  { cat:"Fabric",         sales:4200000, items:1248, color:"#f97316" },
  { cat:"Ready-to-Wear",  sales:2800000, items:892,  color:"#3b82f6" },
  { cat:"Knitwear",       sales:890000,  items:312,  color:"#8b5cf6" },
  { cat:"Accessories",    sales:450000,  items:684,  color:"#10b981" },
  { cat:"Home Textile",   sales:310000,  items:82,   color:"#06b6d4" },
];

const TOP_PRODUCTS = [
  { rank:1, sku:"FA-0001", name:"Gul Ahmed Summer Lawn 3pc",   sold:342, revenue:1368000, profit:479000, margin:"35%", trend:"+12%" },
  { rank:2, sku:"RW-0002", name:"Khaadi Embroidered Kurta",    sold:289, revenue:867000,  profit:260000, margin:"30%", trend:"+8%"  },
  { rank:3, sku:"FA-0003", name:"Sapphire Cotton Fabric",      sold:215, revenue:645000,  profit:206000, margin:"32%", trend:"-2%"  },
  { rank:4, sku:"KN-0004", name:"Bonanza Satrangi Sweater",    sold:198, revenue:554000,  profit:194000, margin:"35%", trend:"+5%"  },
  { rank:5, sku:"RW-0005", name:"Alkaram Studio 2pc Set",      sold:176, revenue:528000,  profit:169000, margin:"32%", trend:"+3%"  },
  { rank:6, sku:"HT-0006", name:"Nishat Linen Bedsheet Set",   sold:82,  revenue:451000,  profit:135000, margin:"30%", trend:"+18%" },
  { rank:7, sku:"AC-0007", name:"Khaadi Silk Hijab Dupatta",   sold:320, revenue:288000,  profit:101000, margin:"35%", trend:"+22%" },
  { rank:8, sku:"RW-0008", name:"Limelight Eid Lawn Suit",     sold:68,  revenue:292000,  profit:93000,  margin:"32%", trend:"-5%"  },
];

const RECEIVABLES = [
  { customer:"Hassan Fabrics",      total:124000, current:0,     d30:0,      d60:124000, d90:0,      d90plus:0,     lastPayment:"2024-01-15", phone:"0333-1122334" },
  { customer:"City Garments LLC",   total:78500,  current:78500, d30:0,      d60:0,      d90:0,      d90plus:0,     lastPayment:"2024-03-01", phone:"0321-9876543" },
  { customer:"Rehman Sons",         total:45000,  current:0,     d30:45000,  d60:0,      d90:0,      d90plus:0,     lastPayment:"2024-02-05", phone:"0312-5556789" },
  { customer:"Textiles Waqas Co.",  total:225000, current:0,     d30:0,      d60:75000,  d90:150000, d90plus:0,     lastPayment:"2023-12-10", phone:"0300-9988776" },
  { customer:"Shah Brothers",       total:89000,  current:0,     d30:0,      d60:0,      d90:0,      d90plus:89000, lastPayment:"2023-10-22", phone:"0311-4433221" },
  { customer:"Lahore Cloth House",  total:310000, current:100000,d30:210000, d60:0,      d90:0,      d90plus:0,     lastPayment:"2024-02-28", phone:"0300-1111222" },
];

const PAYABLES = [
  { vendor:"Gul Ahmed Textiles",    total:380000, current:380000,d30:0,      d60:0,      d90:0,      d90plus:0,     dueDate:"2024-03-15" },
  { vendor:"Khaadi",                total:120000, current:0,     d30:120000, d60:0,      d90:0,      d90plus:0,     dueDate:"2024-03-05" },
  { vendor:"Master Molty Foam",     total:890000, current:500000,d30:390000, d60:0,      d90:0,      d90plus:0,     dueDate:"2024-03-20" },
  { vendor:"Sapphire Textile",      total:95000,  current:0,     d30:0,      d60:95000,  d90:0,      d90plus:0,     dueDate:"2024-02-01" },
];

const FBR_INVOICES = [
  { inv:"INV-2024-08741", fbr:"FBR-2024-0874100", customer:"Al-Fatah Traders", amount:245000, tax:0,     date:"2024-03-02 10:14", status:"synced",  attempt:1 },
  { inv:"INV-2024-08739", fbr:"FBR-2024-0873900", customer:"City Garments",    amount:78500,  tax:0,     date:"2024-03-01 16:22", status:"synced",  attempt:1 },
  { inv:"INV-2024-08738", fbr:"—",                 customer:"Hassan Fabrics",   amount:124000, tax:0,     date:"2024-02-28 11:05", status:"failed",  attempt:3 },
  { inv:"INV-2024-08735", fbr:"FBR-2024-0873500", customer:"Rehman Sons",      amount:55000,  tax:0,     date:"2024-02-27 15:40", status:"synced",  attempt:1 },
  { inv:"INV-2024-08730", fbr:"—",                 customer:"Walk-in",          amount:12500,  tax:0,     date:"2024-02-26 09:00", status:"pending", attempt:0 },
  { inv:"INV-2024-08725", fbr:"FBR-2024-0872500", customer:"Lahore Cloth",     amount:310000, tax:0,     date:"2024-02-25 14:30", status:"synced",  attempt:1 },
];

const Z_REPORT = {
  date:"2024-03-02", branch:"Lahore Main Store", cashier:"Admin User",
  openingCash:50000, closingCash:285000,
  totalSales:245000, totalReturns:0, netSales:245000,
  totalInvoices:34, voidedInvoices:1,
  cash:145000, bank:68000, credit:32000, cheque:0,
  fbrSynced:33, fbrPending:1,
  topItem:"Gul Ahmed Summer Lawn 3pc", topItemQty:12,
  taxCollected:0, discountsGiven:12500,
};

const fmt  = (n) => new Intl.NumberFormat("en-PK").format(Math.round(Math.abs(n)));
const fmtC = (n) => `PKR ${fmt(n)}`;
const pct  = (a,b) => b===0 ? "0%" : ((a/b)*100).toFixed(1)+"%";

// ── PALETTE ───────────────────────────────────────────────────────
const C = {
  bg:"#070b11", panel:"#0a1018", card:"#0e1622", card2:"#0c1420",
  border:"#182332", text:"#dde4ed", muted:"#506070", muted2:"#253545",
  accent:"#f97316", blue:"#3b82f6", green:"#10b981",
  red:"#ef4444", yellow:"#f59e0b", purple:"#8b5cf6",
  teal:"#06b6d4", pink:"#ec4899", lime:"#84cc16",
  input:"#08111a", header:"#050910",
  chartGrid:"#182332",
};

const Tag = ({l,col,sm}) => (
  <span style={{fontSize:sm?"9px":"10px",fontWeight:"700",padding:sm?"1px 5px":"2px 8px",borderRadius:"20px",background:`${col}18`,color:col,border:`1px solid ${col}30`,whiteSpace:"nowrap"}}>{l}</span>
);

const StatCard = ({label,value,sub,icon,color,change,up}) => (
  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"14px 16px",position:"relative",overflow:"hidden",flex:1,minWidth:"150px"}}>
    <div style={{position:"absolute",top:0,right:0,width:"52px",height:"52px",borderRadius:"0 10px 0 52px",background:`${color}12`}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <div style={{fontSize:"9px",color:C.muted,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"5px"}}>{label}</div>
        <div style={{fontSize:"18px",fontWeight:"900",color:C.text,letterSpacing:"-0.02em"}}>{value}</div>
        {sub && <div style={{fontSize:"9px",color:C.muted,marginTop:"3px"}}>{sub}</div>}
        {change && <div style={{fontSize:"10px",fontWeight:"700",color:up?C.green:C.red,marginTop:"4px"}}>{up?"▲":"▼"} {change}</div>}
      </div>
      <span style={{fontSize:"20px"}}>{icon}</span>
    </div>
    <div style={{position:"absolute",bottom:0,left:0,height:"3px",width:"100%",background:`linear-gradient(90deg,${color},transparent)`}}/>
  </div>
);

const SectionHeader = ({title,sub,actions}) => (
  <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}>
    <div style={{flex:1}}>
      <div style={{fontSize:"15px",fontWeight:"800",color:C.text}}>{title}</div>
      {sub && <div style={{fontSize:"10px",color:C.muted,marginTop:"1px"}}>{sub}</div>}
    </div>
    {actions}
  </div>
);

const ExportBtns = () => (
  <div style={{display:"flex",gap:"6px"}}>
    <button style={{padding:"5px 11px",borderRadius:"6px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>📤 PDF</button>
    <button style={{padding:"5px 11px",borderRadius:"6px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>📊 Excel</button>
  </div>
);

const TOOLTIP_STYLE = {contentStyle:{background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px",color:C.text,fontSize:"11px"},labelStyle:{color:C.muted,fontSize:"10px"}};

// ── MAIN ─────────────────────────────────────────────────────────
export default function ReportsAnalytics() {
  const [tab,setTab]           = useState("overview");
  const [fbrOnline,setFbrOnline] = useState(true);
  const [syncing,setSyncing]   = useState(false);
  const [dateRange,setDateRange] = useState("thisMonth");
  const [branch,setBranch]     = useState("all");
  const [drillItem,setDrillItem] = useState(null);
  const [notification,setNotify] = useState(null);
  const syncTimer               = useRef(null);

  const notify = (msg,type="success") => { setNotify({msg,type}); setTimeout(()=>setNotify(null),3000); };

  const handleFBRSync = async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r,2200));
    setSyncing(false);
    notify("FBR sync complete — 33 invoices synced, 1 failed");
  };

  const tabs = [
    {k:"overview",  l:"📊 Overview"},
    {k:"sales",     l:"📈 Sales Report"},
    {k:"products",  l:"📦 Product Report"},
    {k:"aging",     l:"⏳ Aging Report"},
    {k:"fbr",       l:"🏛 FBR Integration"},
    {k:"zreport",   l:"🖨 Z-Report"},
  ];

  const totalRevenue  = SALES_TREND.reduce((s,m)=>s+m.sales,0);
  const totalProfit   = SALES_TREND.reduce((s,m)=>s+m.profit,0);
  const totalInvoices = SALES_TREND.reduce((s,m)=>s+m.invoices,0);
  const avgOrderVal   = totalRevenue / totalInvoices;
  const totalReceivables = RECEIVABLES.reduce((s,r)=>s+r.total,0);
  const overdueRec    = RECEIVABLES.reduce((s,r)=>s+r.d60+r.d90+r.d90plus,0);

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,color:C.text,fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif",fontSize:"13px",overflow:"hidden",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#182332;border-radius:4px}
        input,select,button{font-family:inherit}
        @keyframes slideIn{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse3{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.95)}}
        @keyframes rowIn{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
        @keyframes barGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
      `}</style>

      {/* HEADER */}
      <div style={{background:C.header,borderBottom:`1px solid ${C.border}`,padding:"0 20px",height:"56px",display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
        <div style={{width:"32px",height:"32px",borderRadius:"7px",background:"linear-gradient(135deg,#f97316,#ea580c)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",fontSize:"12px",color:"#fff"}}>IP</div>
        <div>
          <div style={{fontWeight:"800",fontSize:"15px",color:"#fff"}}>Reports & Analytics</div>
          <div style={{fontSize:"9px",color:C.muted}}>FBR Integration · Sales Analytics · Aging Reports · Z-Report</div>
        </div>

        <div style={{marginLeft:"20px",display:"flex",gap:"2px",overflowX:"auto"}}>
          {tabs.map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"6px 12px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:"700",whiteSpace:"nowrap",background:tab===t.k?C.accent:"transparent",color:tab===t.k?"#fff":C.muted,transition:"all 0.15s"}}>
              {t.l}
            </button>
          ))}
        </div>

        <div style={{marginLeft:"auto",display:"flex",gap:"8px",alignItems:"center"}}>
          {/* Date Range */}
          <div style={{display:"flex",gap:"3px"}}>
            {[{k:"today",l:"Today"},{k:"thisWeek",l:"Week"},{k:"thisMonth",l:"Month"},{k:"thisYear",l:"Year"}].map(d=>(
              <button key={d.k} onClick={()=>setDateRange(d.k)} style={{padding:"5px 9px",borderRadius:"5px",border:"none",cursor:"pointer",fontSize:"10px",fontWeight:"700",background:dateRange===d.k?C.blue:"transparent",color:dateRange===d.k?"#fff":C.muted}}>
                {d.l}
              </button>
            ))}
          </div>
          {/* Branch */}
          <select value={branch} onChange={e=>setBranch(e.target.value)} style={{background:C.input,border:`1px solid ${C.border}`,color:C.text,borderRadius:"6px",padding:"5px 8px",fontSize:"10px",cursor:"pointer"}}>
            <option value="all">All Branches</option>
            {BRANCH_DATA.map(b=><option key={b.branch} value={b.branch}>{b.branch}</option>)}
          </select>
          {/* FBR Status */}
          <div style={{display:"flex",alignItems:"center",gap:"6px",padding:"5px 10px",borderRadius:"20px",background:`${fbrOnline?C.green:C.red}15`,border:`1px solid ${fbrOnline?C.green:C.red}44`,cursor:"pointer"}} onClick={()=>setFbrOnline(!fbrOnline)}>
            <div style={{width:"7px",height:"7px",borderRadius:"50%",background:fbrOnline?C.green:C.red,animation:"pulse3 2s infinite"}}/>
            <span style={{fontSize:"10px",color:fbrOnline?C.green:C.red,fontWeight:"700"}}>FBR {fbrOnline?"Online":"Offline"}</span>
          </div>
          <button onClick={handleFBRSync} disabled={syncing} style={{padding:"6px 12px",borderRadius:"7px",border:"none",background:syncing?"#1c2a3a":"linear-gradient(135deg,#3b82f6,#2563eb)",color:syncing?C.muted:"#fff",cursor:syncing?"not-allowed":"pointer",fontSize:"10px",fontWeight:"700",display:"flex",alignItems:"center",gap:"5px"}}>
            {syncing ? <span style={{display:"inline-block",animation:"spin 0.8s linear infinite"}}>⟳</span> : "⟳"}
            {syncing?"Syncing...":"Sync FBR"}
          </button>
          <ExportBtns/>
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,padding:"10px 20px",display:"flex",gap:"10px",flexShrink:0,overflowX:"auto"}}>
        <StatCard label="Total Revenue"   value={`PKR ${(totalRevenue/1000000).toFixed(1)}M`}  sub="6 months" icon="💰" color={C.green}  change="+12.4%" up/>
        <StatCard label="Net Profit"      value={`PKR ${(totalProfit/1000000).toFixed(1)}M`}   sub="margin 40%" icon="📈" color={C.blue} change="+18.7%" up/>
        <StatCard label="Total Invoices"  value={fmt(totalInvoices)}  sub="all branches" icon="🧾" color={C.teal}   change="+156"  up/>
        <StatCard label="Avg Order Value" value={`PKR ${fmt(avgOrderVal)}`} sub="per invoice" icon="💳" color={C.purple} change="+3.2%"  up/>
        <StatCard label="Receivables"     value={`PKR ${(totalReceivables/1000).toFixed(0)}K`} sub={`PKR ${fmt(overdueRec)} overdue`} icon="⏳" color={C.yellow} change={`${fmt(overdueRec)} due`} up={false}/>
        <StatCard label="FBR Synced"      value={`${FBR_INVOICES.filter(f=>f.status==="synced").length}/${FBR_INVOICES.length}`} sub="invoices" icon="🏛" color={C.green} change="1 failed" up={false}/>
      </div>

      {/* ═══════════════════════ OVERVIEW ═══════════════════════════ */}
      {tab==="overview" && (
        <div style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:"18px"}}>
          {/* Row 1: Sales Trend + Payment Mix */}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"16px"}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
              <SectionHeader title="Revenue vs Profit — 6 Month Trend" sub="Monthly comparison with target line"/>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={SALES_TREND}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.green}  stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={C.green}  stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.blue}   stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={C.blue}   stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid}/>
                  <XAxis dataKey="month" stroke={C.muted} fontSize={10}/>
                  <YAxis stroke={C.muted} fontSize={9} tickFormatter={v=>`${(v/1000000).toFixed(1)}M`}/>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v,n)=>[`PKR ${fmt(v)}`,n.charAt(0).toUpperCase()+n.slice(1)]}/>
                  <Legend wrapperStyle={{fontSize:"10px",color:C.muted}}/>
                  <Area type="monotone" dataKey="sales"  stroke={C.green}  fill="url(#gSales)"  strokeWidth={2.5} name="Sales"/>
                  <Area type="monotone" dataKey="profit" stroke={C.blue}   fill="url(#gProfit)" strokeWidth={2.5} name="Profit"/>
                  <Line type="monotone" dataKey="target" stroke={C.yellow} strokeDasharray="5 3" strokeWidth={1.5} dot={false} name="Target"/>
                  <Bar dataKey="returns" fill={C.red} opacity={0.6} name="Returns" barSize={8}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
              <SectionHeader title="Payment Methods" sub="By collection amount"/>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={PAYMENT_MIX} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3}>
                    {PAYMENT_MIX.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v,n,p)=>[`${v}% · PKR ${fmt(p.payload.amount)}`,n]}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                {PAYMENT_MIX.map(p=>(
                  <div key={p.name} style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"11px"}}>
                    <div style={{width:"10px",height:"10px",borderRadius:"2px",background:p.color,flexShrink:0}}/>
                    <span style={{flex:1,color:C.muted}}>{p.name}</span>
                    <span style={{fontWeight:"700",color:C.text}}>PKR {fmt(p.amount)}</span>
                    <span style={{fontSize:"9px",color:C.muted}}>{p.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Branch Performance + Daily Sales */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
              <SectionHeader title="Branch Performance" sub="Sales vs Target"/>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={BRANCH_DATA} layout="vertical" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} horizontal={false}/>
                  <XAxis type="number" stroke={C.muted} fontSize={9} tickFormatter={v=>`${(v/1000000).toFixed(1)}M`}/>
                  <YAxis type="category" dataKey="branch" stroke={C.muted} fontSize={9} width={90}/>
                  <Tooltip {...TOOLTIP_STYLE} formatter={v=>`PKR ${fmt(v)}`}/>
                  <Bar dataKey="sales"  fill={C.accent} radius={[0,4,4,0]} barSize={10} name="Sales"/>
                  <Bar dataKey="target" fill={C.muted2} radius={[0,4,4,0]} barSize={4}  name="Target"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
              <SectionHeader title="Sales by Category" sub="Revenue distribution"/>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={CATEGORY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid}/>
                  <XAxis dataKey="cat" stroke={C.muted} fontSize={9}/>
                  <YAxis stroke={C.muted} fontSize={9} tickFormatter={v=>`${(v/1000000).toFixed(1)}M`}/>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v,n)=>[`PKR ${fmt(v)}`,n]}/>
                  <Bar dataKey="sales" radius={[4,4,0,0]} barSize={32} name="Revenue">
                    {CATEGORY_DATA.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Vendor Sales Breakdown */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
            <SectionHeader title="Vendor / Brand Performance" sub="Revenue, Profit and Margin by supplier" actions={<ExportBtns/>}/>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>
                    {["Vendor","Sales (PKR)","Profit (PKR)","Margin","Units Sold","Share"].map(h=>(
                      <th key={h} style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${C.border}`,textAlign:h==="Vendor"?"left":"right"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {VENDOR_SALES.map((v,i)=>(
                    <tr key={v.vendor} style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer",animation:`rowIn 0.15s ease ${i*0.04}s both`}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                      onClick={()=>setDrillItem(drillItem===v.vendor?null:v.vendor)}>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                          <div style={{width:"10px",height:"10px",borderRadius:"50%",background:v.color,flexShrink:0}}/>
                          <span style={{fontSize:"12px",fontWeight:"700",color:C.text}}>{v.vendor}</span>
                        </div>
                      </td>
                      <td style={{padding:"10px 12px",textAlign:"right",fontSize:"12px",fontWeight:"700",color:C.green,fontFamily:"'IBM Plex Mono'"}}>{fmt(v.sales)}</td>
                      <td style={{padding:"10px 12px",textAlign:"right",fontSize:"12px",fontWeight:"700",color:C.blue,fontFamily:"'IBM Plex Mono'"}}>{fmt(v.profit)}</td>
                      <td style={{padding:"10px 12px",textAlign:"right"}}>
                        <span style={{fontSize:"11px",fontWeight:"800",padding:"3px 8px",borderRadius:"12px",background:`${v.margin>=33?C.green:v.margin>=30?C.yellow:C.red}18`,color:v.margin>=33?C.green:v.margin>=30?C.yellow:C.red}}>
                          {v.margin.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{padding:"10px 12px",textAlign:"right",fontSize:"11px",color:C.muted}}>{fmt(v.qty)}</td>
                      <td style={{padding:"10px 12px",textAlign:"right"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"6px",justifyContent:"flex-end"}}>
                          <div style={{width:"60px",height:"5px",background:C.border,borderRadius:"3px",overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${(v.sales/VENDOR_SALES[0].sales)*100}%`,background:v.color,borderRadius:"3px"}}/>
                          </div>
                          <span style={{fontSize:"10px",color:C.muted}}>{pct(v.sales,VENDOR_SALES.reduce((s,x)=>s+x.sales,0))}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ SALES REPORT ═══════════════════════ */}
      {tab==="sales" && (
        <div style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:"18px"}}>
          {/* Daily Heatmap-style bar */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
            <SectionHeader title="Daily Sales Pattern — This Week" sub="Revenue and transaction count by day of week" actions={<ExportBtns/>}/>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={DAILY_SALES}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid}/>
                <XAxis dataKey="day" stroke={C.muted} fontSize={11}/>
                <YAxis yAxisId="left" stroke={C.muted} fontSize={9} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                <YAxis yAxisId="right" orientation="right" stroke={C.muted} fontSize={9}/>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v,n)=>n==="sales"?[`PKR ${fmt(v)}`,n]:[v,n]}/>
                <Bar yAxisId="left" dataKey="sales" fill={C.accent} radius={[5,5,0,0]} name="sales" barSize={40}>
                  {DAILY_SALES.map((e,i)=><Cell key={i} fill={e.sales===Math.max(...DAILY_SALES.map(d=>d.sales))?C.green:C.accent}/>)}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="txns" stroke={C.blue} strokeWidth={2} dot={{fill:C.blue,r:4}} name="Transactions"/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly trend with invoices */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
            <SectionHeader title="Monthly Sales vs Target" sub="6 months performance with invoice count" actions={<ExportBtns/>}/>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={SALES_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid}/>
                <XAxis dataKey="month" stroke={C.muted} fontSize={10}/>
                <YAxis yAxisId="l" stroke={C.muted} fontSize={9} tickFormatter={v=>`${(v/1000000).toFixed(1)}M`}/>
                <YAxis yAxisId="r" orientation="right" stroke={C.muted} fontSize={9}/>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v,n)=>n==="invoices"?[v+" invoices","Invoices"]:[`PKR ${fmt(v)}`,n]}/>
                <Legend wrapperStyle={{fontSize:"10px",color:C.muted}}/>
                <Bar yAxisId="l" dataKey="sales"  fill={C.accent}  radius={[4,4,0,0]} barSize={28} name="Sales"/>
                <Bar yAxisId="l" dataKey="returns" fill={C.red}    radius={[4,4,0,0]} barSize={10} name="Returns" opacity={0.8}/>
                <Line yAxisId="l" type="monotone" dataKey="target" stroke={C.yellow} strokeDasharray="6 3" strokeWidth={2} dot={false} name="Target"/>
                <Line yAxisId="r" type="monotone" dataKey="invoices" stroke={C.teal} strokeWidth={2} dot={{fill:C.teal,r:3}} name="Invoices"/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Branch Sales Table */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
            <SectionHeader title="Branch Sales Summary" actions={<ExportBtns/>}/>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>{["Branch","Sales","Target","Achievement","Invoices","Cashiers","Avg/Invoice"].map(h=>(
                  <th key={h} style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${C.border}`,textAlign:h==="Branch"?"left":"right"}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {BRANCH_DATA.map((b,i)=>{
                  const ach = (b.sales/b.target)*100;
                  return (
                    <tr key={b.branch} style={{borderBottom:`1px solid ${C.border}`,animation:`rowIn 0.15s ease ${i*0.05}s both`}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"11px 12px",fontSize:"12px",fontWeight:"700",color:C.text}}>{b.branch}</td>
                      <td style={{padding:"11px 12px",textAlign:"right",fontSize:"12px",fontWeight:"700",color:C.green,fontFamily:"'IBM Plex Mono'"}}>{fmt(b.sales)}</td>
                      <td style={{padding:"11px 12px",textAlign:"right",fontSize:"11px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>{fmt(b.target)}</td>
                      <td style={{padding:"11px 12px",textAlign:"right"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"7px",justifyContent:"flex-end"}}>
                          <div style={{width:"55px",height:"6px",background:C.border,borderRadius:"4px",overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${Math.min(100,ach)}%`,background:ach>=100?C.green:ach>=80?C.yellow:C.red,borderRadius:"4px"}}/>
                          </div>
                          <span style={{fontSize:"11px",fontWeight:"800",color:ach>=100?C.green:ach>=80?C.yellow:C.red}}>{ach.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{padding:"11px 12px",textAlign:"right",fontSize:"11px",color:C.text}}>{fmt(b.invoices)}</td>
                      <td style={{padding:"11px 12px",textAlign:"right",fontSize:"11px",color:C.muted}}>{b.cashiers}</td>
                      <td style={{padding:"11px 12px",textAlign:"right",fontSize:"11px",color:C.teal,fontFamily:"'IBM Plex Mono'"}}>{fmt(b.sales/b.invoices)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════ PRODUCT REPORT ═══════════════════════ */}
      {tab==="products" && (
        <div style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:"18px"}}>
          {/* Vendor profit chart */}
          <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:"16px"}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
              <SectionHeader title="Profit by Vendor" sub="Revenue vs Profit comparison"/>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={VENDOR_SALES} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid}/>
                  <XAxis dataKey="vendor" stroke={C.muted} fontSize={9}/>
                  <YAxis stroke={C.muted} fontSize={9} tickFormatter={v=>`${(v/1000000).toFixed(1)}M`}/>
                  <Tooltip {...TOOLTIP_STYLE} formatter={v=>`PKR ${fmt(v)}`}/>
                  <Legend wrapperStyle={{fontSize:"10px",color:C.muted}}/>
                  <Bar dataKey="sales"  fill={C.blue}   radius={[4,4,0,0]} barSize={22} name="Sales"/>
                  <Bar dataKey="profit" fill={C.green}  radius={[4,4,0,0]} barSize={14} name="Profit"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
              <SectionHeader title="Vendor Share" sub="By revenue"/>
              <ResponsiveContainer width="100%" height={175}>
                <PieChart>
                  <Pie data={VENDOR_SALES} cx="50%" cy="50%" outerRadius={78} dataKey="sales" paddingAngle={2}>
                    {VENDOR_SALES.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v,n)=>[`PKR ${fmt(v)}`,n]}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexWrap:"wrap",gap:"5px",justifyContent:"center"}}>
                {VENDOR_SALES.map(v=>(
                  <div key={v.vendor} style={{display:"flex",alignItems:"center",gap:"4px"}}>
                    <div style={{width:"7px",height:"7px",borderRadius:"50%",background:v.color}}/>
                    <span style={{fontSize:"9px",color:C.muted}}>{v.vendor.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Products Table */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
            <SectionHeader title="Top Products by Revenue" sub="Click any row to drill down into transactions" actions={<ExportBtns/>}/>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>{["Rank","SKU","Product Name","Qty Sold","Revenue","Profit","Margin","Trend"].map(h=>(
                  <th key={h} style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${C.border}`,textAlign:h==="Rank"||h==="SKU"||h==="Product Name"?"left":"right"}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {TOP_PRODUCTS.map((p,i)=>(
                  <tr key={p.sku} style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer",animation:`rowIn 0.15s ease ${i*0.03}s both`}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    onClick={()=>setDrillItem(drillItem===p.sku?null:p.sku)}>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{width:"22px",height:"22px",borderRadius:"50%",background:p.rank<=3?["#f59e0b","#9ca3af","#b45309"][p.rank-1]:C.muted2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:"800",color:p.rank<=3?"#fff":C.muted}}>{p.rank}</div>
                    </td>
                    <td style={{padding:"10px 12px",fontSize:"10px",color:C.blue,fontFamily:"'IBM Plex Mono'"}}>{p.sku}</td>
                    <td style={{padding:"10px 12px",fontSize:"12px",fontWeight:"600",color:C.text}}>{p.name}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:"11px",color:C.text}}>{fmt(p.sold)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:"12px",fontWeight:"800",color:C.green,fontFamily:"'IBM Plex Mono'"}}>{fmt(p.revenue)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:"11px",fontWeight:"700",color:C.blue,fontFamily:"'IBM Plex Mono'"}}>{fmt(p.profit)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right"}}>
                      <span style={{fontSize:"11px",fontWeight:"800",padding:"3px 8px",borderRadius:"12px",background:`${C.green}18`,color:C.green}}>{p.margin}</span>
                    </td>
                    <td style={{padding:"10px 12px",textAlign:"right"}}>
                      <span style={{fontSize:"11px",fontWeight:"800",color:p.trend.startsWith("+")?C.green:C.red}}>{p.trend}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Drill-down row */}
            {drillItem && TOP_PRODUCTS.find(p=>p.sku===drillItem) && (
              <div style={{background:`${C.blue}0c`,border:`1px solid ${C.blue}33`,borderRadius:"8px",padding:"14px",marginTop:"12px",animation:"slideIn 0.2s ease"}}>
                <div style={{fontSize:"11px",fontWeight:"700",color:C.blue,marginBottom:"10px"}}>
                  🔍 Drill-Down: {TOP_PRODUCTS.find(p=>p.sku===drillItem)?.name}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>
                  {[{l:"Lahore Main",sales:TOP_PRODUCTS.find(p=>p.sku===drillItem)?.revenue*0.45},{l:"Karachi",sales:TOP_PRODUCTS.find(p=>p.sku===drillItem)?.revenue*0.28},{l:"Islamabad",sales:TOP_PRODUCTS.find(p=>p.sku===drillItem)?.revenue*0.18},{l:"Other",sales:TOP_PRODUCTS.find(p=>p.sku===drillItem)?.revenue*0.09}].map(b=>(
                    <div key={b.l} style={{background:C.card,borderRadius:"7px",padding:"10px 12px"}}>
                      <div style={{fontSize:"9px",color:C.muted,marginBottom:"3px"}}>{b.l}</div>
                      <div style={{fontSize:"13px",fontWeight:"800",color:C.text}}>PKR {fmt(b.sales)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════ AGING REPORT ═══════════════════════ */}
      {tab==="aging" && (
        <div style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:"18px"}}>
          {/* Aging Summary Charts */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
            {[{title:"Accounts Receivable Aging",data:RECEIVABLES,type:"rec"},{title:"Accounts Payable Aging",data:PAYABLES,type:"pay"}].map(({title,data,type})=>{
              const buckets = [
                {l:"Current",   col:C.green,  val:data.reduce((s,r)=>s+r.current,0)},
                {l:"1-30 Days", col:C.yellow, val:data.reduce((s,r)=>s+r.d30,0)},
                {l:"31-60 Days",col:C.accent, val:data.reduce((s,r)=>s+r.d60,0)},
                {l:"61-90 Days",col:C.red,    val:data.reduce((s,r)=>s+r.d90,0)},
                {l:"90+ Days",  col:"#dc2626", val:data.reduce((s,r)=>s+r.d90plus,0)},
              ];
              const total = buckets.reduce((s,b)=>s+b.val,0);
              return (
                <div key={title} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
                  <SectionHeader title={title} sub={`Total: PKR ${fmt(total)}`}/>
                  <div style={{display:"flex",gap:"3px",marginBottom:"12px",height:"32px",borderRadius:"6px",overflow:"hidden"}}>
                    {buckets.filter(b=>b.val>0).map(b=>(
                      <div key={b.l} title={`${b.l}: PKR ${fmt(b.val)}`} style={{flex:b.val,background:b.col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:"700",color:"#fff",minWidth:"24px",transition:"flex 0.3s"}}>
                        {((b.val/total)*100)>10?`${((b.val/total)*100).toFixed(0)}%`:""}
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                    {buckets.map(b=>(
                      <div key={b.l} style={{display:"flex",alignItems:"center",gap:"9px",fontSize:"11px"}}>
                        <div style={{width:"8px",height:"8px",borderRadius:"2px",background:b.col,flexShrink:0}}/>
                        <span style={{flex:1,color:C.muted}}>{b.l}</span>
                        <span style={{fontWeight:"700",color:b.col,fontFamily:"'IBM Plex Mono'"}}>{fmtC(b.val)}</span>
                        <span style={{fontSize:"9px",color:C.muted,width:"35px",textAlign:"right"}}>{pct(b.val,total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Receivables Detail */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
            <SectionHeader title="Receivables Aging Detail" sub="Customer-wise outstanding amounts" actions={<ExportBtns/>}/>
            <AgingTable data={RECEIVABLES} nameKey="customer" extraCol={{label:"Phone",key:"phone"}} accentColor={C.blue}/>
          </div>

          {/* Payables Detail */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
            <SectionHeader title="Payables Aging Detail" sub="Vendor-wise outstanding amounts" actions={<ExportBtns/>}/>
            <AgingTable data={PAYABLES} nameKey="vendor" extraCol={{label:"Due Date",key:"dueDate"}} accentColor={C.red}/>
          </div>
        </div>
      )}

      {/* ═══════════════════════ FBR INTEGRATION ═══════════════════════ */}
      {tab==="fbr" && (
        <div style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:"18px"}}>
          {/* FBR Status Panel */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}}>
            {[
              {l:"Synced Today",  v:FBR_INVOICES.filter(f=>f.status==="synced").length, icon:"✅", col:C.green,  sub:"invoices posted to FBR"},
              {l:"Pending Sync",  v:FBR_INVOICES.filter(f=>f.status==="pending").length,icon:"⏳", col:C.yellow, sub:"queued for transmission"},
              {l:"Failed",        v:FBR_INVOICES.filter(f=>f.status==="failed").length, icon:"❌", col:C.red,    sub:"need manual review"},
              {l:"Offline Queue", v:0, icon:"📥", col:C.purple, sub:"saved for later sync"},
            ].map(s=>(
              <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"14px 16px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,right:0,width:"48px",height:"48px",borderRadius:"0 10px 0 48px",background:`${s.col}12`}}/>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:"9px",color:C.muted,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"5px"}}>{s.l}</div>
                    <div style={{fontSize:"28px",fontWeight:"900",color:s.col}}>{s.v}</div>
                    <div style={{fontSize:"9px",color:C.muted,marginTop:"2px"}}>{s.sub}</div>
                  </div>
                  <span style={{fontSize:"22px"}}>{s.icon}</span>
                </div>
                <div style={{position:"absolute",bottom:0,left:0,height:"3px",width:"100%",background:`linear-gradient(90deg,${s.col},transparent)`}}/>
              </div>
            ))}
          </div>

          {/* FBR Config Panel */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
            <SectionHeader title="FBR POS Integration Settings" sub="Federal Board of Revenue API Configuration"/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"16px"}}>
              {[
                {l:"POS ID",        v:"LHR-MAIN-001"},
                {l:"NTN Number",    v:"1234567-8"},
                {l:"STRN Number",   v:"12-34-5678-001-89"},
                {l:"API Endpoint",  v:"esp.fbr.gov.pk:8443"},
                {l:"Last Sync",     v:"2024-03-02 10:14 AM"},
                {l:"Sync Mode",     v:"Real-time"},
              ].map(f=>(
                <div key={f.l} style={{background:C.panel,borderRadius:"8px",padding:"10px 12px"}}>
                  <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"4px"}}>{f.l}</div>
                  <div style={{fontSize:"12px",fontWeight:"700",color:C.text,fontFamily:"'IBM Plex Mono'"}}>{f.v}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:"10px"}}>
              <button onClick={handleFBRSync} disabled={syncing} style={{padding:"9px 18px",borderRadius:"8px",border:"none",background:syncing?"#1c2a3a":"linear-gradient(135deg,#3b82f6,#2563eb)",color:syncing?C.muted:"#fff",cursor:syncing?"not-allowed":"pointer",fontSize:"12px",fontWeight:"700",display:"flex",alignItems:"center",gap:"6px"}}>
                {syncing?<span style={{display:"inline-block",animation:"spin 0.8s linear infinite"}}>⟳</span>:"⟳"}
                {syncing?"Syncing FBR...":"Force Sync All Pending"}
              </button>
              <button style={{padding:"9px 14px",borderRadius:"8px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:"12px",fontWeight:"600"}}>🔧 Test Connection</button>
              <button style={{padding:"9px 14px",borderRadius:"8px",border:`1px solid ${C.yellow}44`,background:`${C.yellow}10`,color:C.yellow,cursor:"pointer",fontSize:"12px",fontWeight:"600"}}>📥 Load Offline Queue ({0})</button>
            </div>
          </div>

          {/* FBR Invoice Log */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
            <SectionHeader title="FBR Invoice Transmission Log" sub="Real-time sync status for all invoices" actions={<ExportBtns/>}/>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>{["Invoice #","FBR Invoice #","Customer","Amount","Date","Status","Attempts","Action"].map(h=>(
                  <th key={h} style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${C.border}`,textAlign:"left"}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {FBR_INVOICES.map((f,i)=>(
                  <tr key={f.inv} style={{borderBottom:`1px solid ${C.border}`,animation:`rowIn 0.15s ease ${i*0.04}s both`}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"10px 12px",fontSize:"11px",fontWeight:"700",color:C.blue,fontFamily:"'IBM Plex Mono'"}}>{f.inv}</td>
                    <td style={{padding:"10px 12px",fontSize:"10px",color:f.fbr==="—"?C.muted:C.green,fontFamily:"'IBM Plex Mono'"}}>{f.fbr}</td>
                    <td style={{padding:"10px 12px",fontSize:"11px",color:C.text}}>{f.customer}</td>
                    <td style={{padding:"10px 12px",fontSize:"11px",fontWeight:"700",color:C.text,fontFamily:"'IBM Plex Mono'"}}>{fmtC(f.amount)}</td>
                    <td style={{padding:"10px 12px",fontSize:"10px",color:C.muted}}>{f.date}</td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{fontSize:"10px",fontWeight:"700",padding:"3px 9px",borderRadius:"12px",background:f.status==="synced"?`${C.green}18`:f.status==="failed"?`${C.red}18`:`${C.yellow}18`,color:f.status==="synced"?C.green:f.status==="failed"?C.red:C.yellow}}>
                        ● {f.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{padding:"10px 12px",fontSize:"11px",color:C.muted,textAlign:"center"}}>{f.attempt}</td>
                    <td style={{padding:"10px 12px"}}>
                      {f.status==="failed" && <button style={{padding:"4px 9px",borderRadius:"5px",border:`1px solid ${C.orange}44`,background:`${C.accent}12`,color:C.accent,cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>↺ Retry</button>}
                      {f.status==="synced" && <button style={{padding:"4px 9px",borderRadius:"5px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:"10px"}}>🔍 Verify</button>}
                      {f.status==="pending" && <button onClick={handleFBRSync} style={{padding:"4px 9px",borderRadius:"5px",border:`1px solid ${C.blue}44`,background:`${C.blue}12`,color:C.blue,cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>⟳ Sync</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Offline Fallback Info */}
          <div style={{background:`${C.yellow}0a`,border:`1px solid ${C.yellow}33`,borderRadius:"10px",padding:"16px 20px",display:"flex",gap:"14px",alignItems:"flex-start"}}>
            <span style={{fontSize:"24px",flexShrink:0}}>📶</span>
            <div>
              <div style={{fontSize:"13px",fontWeight:"800",color:C.yellow,marginBottom:"5px"}}>Offline Sale Handling — FBR Compliance</div>
              <div style={{fontSize:"11px",color:C.muted,lineHeight:1.7}}>
                When FBR API is unavailable, invoices are automatically saved to the <strong style={{color:C.text}}>offline queue</strong> in local storage. 
                Each invoice is stamped with an <strong style={{color:C.text}}>offline timestamp</strong> and assigned a provisional invoice number. 
                Once connectivity is restored, the system <strong style={{color:C.text}}>automatically retries</strong> all queued invoices in sequence, 
                updates the FBR invoice number on each record, and regenerates the <strong style={{color:C.text}}>QR verification code</strong>. 
                Maximum retry attempts: <strong style={{color:C.text}}>5 times</strong> with exponential backoff.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ Z-REPORT ═══════════════════════════ */}
      {tab==="zreport" && <ZReportView data={Z_REPORT}/>}

      {/* NOTIFICATION */}
      {notification && (
        <div style={{position:"fixed",top:"16px",left:"50%",transform:"translateX(-50%)",zIndex:400,background:notification.type==="error"?C.red:C.green,color:"#fff",padding:"10px 18px",borderRadius:"8px",fontSize:"12px",fontWeight:"700",boxShadow:"0 8px 24px rgba(0,0,0,0.4)",animation:"slideIn 0.2s ease",whiteSpace:"nowrap"}}>
          {notification.type==="error"?"✕":"✓"} {notification.msg}
        </div>
      )}
    </div>
  );
}

// ── AGING TABLE COMPONENT ─────────────────────────────────────────
function AgingTable({data,nameKey,extraCol,accentColor}) {
  const totals = {total:data.reduce((s,r)=>s+r.total,0),current:data.reduce((s,r)=>s+r.current,0),d30:data.reduce((s,r)=>s+r.d30,0),d60:data.reduce((s,r)=>s+r.d60,0),d90:data.reduce((s,r)=>s+r.d90,0),d90plus:data.reduce((s,r)=>s+r.d90plus,0)};
  const cols = ["Total","Current","1-30 Days","31-60 Days","61-90 Days","90+ Days"];
  const keys = ["total","current","d30","d60","d90","d90plus"];
  const colColors = [C.text,C.green,C.yellow,C.accent,C.red,"#dc2626"];
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:"700px"}}>
        <thead>
          <tr>
            <th style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${C.border}`,textAlign:"left"}}>{nameKey==="customer"?"Customer":"Vendor"}</th>
            {cols.map((h,i)=>(
              <th key={h} style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:colColors[i],textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${C.border}`,textAlign:"right"}}>{h}</th>
            ))}
            <th style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${C.border}`,textAlign:"right"}}>{extraCol.label}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row,i)=>(
            <tr key={i} style={{borderBottom:`1px solid ${C.border}`,animation:`rowIn 0.15s ease ${i*0.04}s both`}}
              onMouseEnter={e=>e.currentTarget.style.background=C.panel}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <td style={{padding:"10px 12px"}}>
                <div style={{fontSize:"12px",fontWeight:"700",color:C.text}}>{row[nameKey]}</div>
              </td>
              {keys.map((k,ki)=>(
                <td key={k} style={{padding:"10px 12px",textAlign:"right",fontSize:"11px",fontWeight:ki===0?"800":"600",color:row[k]>0?colColors[ki]:C.muted2,fontFamily:"'IBM Plex Mono'"}}>
                  {row[k]>0?fmt(row[k]):"—"}
                </td>
              ))}
              <td style={{padding:"10px 12px",textAlign:"right",fontSize:"10px",color:C.muted}}>{row[extraCol.key]}</td>
            </tr>
          ))}
          <tr style={{borderTop:`2px solid ${C.border}`,background:`${accentColor}08`}}>
            <td style={{padding:"10px 12px",fontSize:"11px",fontWeight:"800",color:C.text}}>TOTAL</td>
            {keys.map((k,ki)=>(
              <td key={k} style={{padding:"10px 12px",textAlign:"right",fontSize:"12px",fontWeight:"900",color:colColors[ki],fontFamily:"'IBM Plex Mono'"}}>{fmt(totals[k])}</td>
            ))}
            <td/>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Z-REPORT VIEW ─────────────────────────────────────────────────
function ZReportView({data}) {
  return (
    <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",justifyContent:"center"}}>
      <div style={{width:"480px"}}>
        {/* Print-style Z-Report */}
        <div style={{background:"#fff",borderRadius:"12px",overflow:"hidden",color:"#1a202c",fontFamily:"'IBM Plex Mono',monospace",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
          {/* Header */}
          <div style={{background:"#1a202c",padding:"20px",textAlign:"center"}}>
            <div style={{color:"#f97316",fontWeight:"900",fontSize:"18px",fontFamily:"'IBM Plex Sans'",letterSpacing:"0.05em"}}>INFOSYS PAK ERP</div>
            <div style={{color:"#9ca3af",fontSize:"11px",marginTop:"2px"}}>Z — END OF DAY REPORT</div>
            <div style={{color:"#9ca3af",fontSize:"10px",marginTop:"6px",borderTop:"1px dashed #374151",paddingTop:"8px"}}>
              {data.branch}<br/>Cashier: {data.cashier}<br/>{data.date}
            </div>
          </div>

          <div style={{padding:"20px"}}>
            <ZSection title="CASH SUMMARY">
              <ZRow l="Opening Cash"  v={fmtC(data.openingCash)} />
              <ZRow l="Cash Collected" v={fmtC(data.cash)} col="#059669"/>
              <ZRow l="Bank Transfer"  v={fmtC(data.bank)} col="#2563eb"/>
              <ZRow l="Credit Sales"   v={fmtC(data.credit)} col="#d97706"/>
              <ZRow l="Cheque"         v={fmtC(data.cheque)} col="#7c3aed"/>
              <ZDivider/>
              <ZRow l="Closing Cash"  v={fmtC(data.closingCash)} bold col="#059669"/>
            </ZSection>

            <ZSection title="SALES SUMMARY">
              <ZRow l="Gross Sales"     v={fmtC(data.totalSales)}/>
              <ZRow l="Returns"         v={`- ${fmtC(data.totalReturns)}`} col="#dc2626"/>
              <ZRow l="Discounts Given" v={`- ${fmtC(data.discountsGiven)}`} col="#d97706"/>
              <ZRow l="Tax Collected"   v={fmtC(data.taxCollected)} col="#7c3aed"/>
              <ZDivider/>
              <ZRow l="NET SALES"       v={fmtC(data.netSales)} bold col="#059669"/>
            </ZSection>

            <ZSection title="TRANSACTION COUNT">
              <ZRow l="Total Invoices"   v={data.totalInvoices}/>
              <ZRow l="Voided Invoices"  v={data.voidedInvoices} col="#dc2626"/>
              <ZRow l="Net Transactions" v={data.totalInvoices - data.voidedInvoices} bold/>
            </ZSection>

            <ZSection title="FBR FISCAL DATA">
              <ZRow l="FBR Synced"    v={data.fbrSynced}  col="#059669"/>
              <ZRow l="FBR Pending"   v={data.fbrPending} col="#d97706"/>
              <ZRow l="POS ID"        v="LHR-MAIN-001"/>
              <ZRow l="NTN"           v="1234567-8"/>
            </ZSection>

            <ZSection title="TOP PERFORMER">
              <ZRow l="Top Product"   v={data.topItem.split(" ").slice(0,3).join(" ")+"..."}/>
              <ZRow l="Units Sold"    v={data.topItemQty} bold col="#059669"/>
            </ZSection>

            {/* QR Simulation */}
            <div style={{textAlign:"center",margin:"16px 0",padding:"12px",background:"#f9fafb",borderRadius:"8px",border:"1px solid #e5e7eb"}}>
              <div style={{fontSize:"10px",color:"#6b7280",marginBottom:"6px"}}>Z-Report FBR Verification</div>
              <svg width="90" height="90" style={{display:"block",margin:"0 auto"}}>
                {[...Array(9)].map((_,r)=>[...Array(9)].map((_,c)=>(
                  <rect key={`${r}-${c}`} x={c*10} y={r*10} width="9" height="9" fill={Math.sin(r*c+r+c)>0?"#1a202c":"#fff"} rx="1"/>
                )))}
                <rect x="0"  y="0"  width="30" height="30" fill="#1a202c" rx="2"/>
                <rect x="2"  y="2"  width="26" height="26" fill="#fff" rx="1"/>
                <rect x="6"  y="6"  width="18" height="18" fill="#1a202c" rx="1"/>
                <rect x="9"  y="9"  width="12" height="12" fill="#fff"/>
                <rect x="60" y="0"  width="30" height="30" fill="#1a202c" rx="2"/>
                <rect x="62" y="2"  width="26" height="26" fill="#fff" rx="1"/>
                <rect x="66" y="6"  width="18" height="18" fill="#1a202c" rx="1"/>
                <rect x="69" y="9"  width="12" height="12" fill="#fff"/>
                <rect x="0"  y="60" width="30" height="30" fill="#1a202c" rx="2"/>
                <rect x="2"  y="62" width="26" height="26" fill="#fff" rx="1"/>
                <rect x="6"  y="66" width="18" height="18" fill="#1a202c" rx="1"/>
                <rect x="9"  y="69" width="12" height="12" fill="#fff"/>
              </svg>
              <div style={{fontSize:"9px",color:"#9ca3af",marginTop:"6px"}}>Scan to verify at FBR portal</div>
              <div style={{fontSize:"8px",color:"#9ca3af",fontFamily:"monospace"}}>ZRPT-{data.date}-LHR-MAIN</div>
            </div>

            <div style={{textAlign:"center",borderTop:"1px dashed #e5e7eb",paddingTop:"14px",marginTop:"4px"}}>
              <div style={{fontSize:"11px",color:"#374151",fontWeight:"700"}}>End of Day — {data.date}</div>
              <div style={{fontSize:"9px",color:"#9ca3af",marginTop:"3px"}}>Generated: {new Date().toLocaleTimeString()}</div>
              <div style={{fontSize:"9px",color:"#9ca3af"}}>Infosys Pak ERP · FBR Compliant POS System</div>
            </div>
          </div>
        </div>

        {/* Print / Export Actions */}
        <div style={{display:"flex",gap:"10px",marginTop:"16px",justifyContent:"center"}}>
          <button onClick={()=>window.print()} style={{padding:"10px 20px",borderRadius:"8px",border:"none",background:"linear-gradient(135deg,#3b82f6,#2563eb)",color:"#fff",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>🖨 Print Z-Report</button>
          <button style={{padding:"10px 20px",borderRadius:"8px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:"12px",fontWeight:"600"}}>📧 Email Report</button>
          <button style={{padding:"10px 20px",borderRadius:"8px",border:`1px solid ${C.green}44`,background:`${C.green}12`,color:C.green,cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>📊 Export PDF</button>
        </div>
      </div>
    </div>
  );
}

function ZSection({title,children}) {
  return (
    <div style={{marginBottom:"14px"}}>
      <div style={{fontSize:"9px",fontWeight:"700",color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.1em",borderBottom:"1px dashed #e5e7eb",paddingBottom:"5px",marginBottom:"7px"}}>{title}</div>
      {children}
    </div>
  );
}
function ZRow({l,v,bold,col}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",marginBottom:"3px",padding:"1px 0"}}>
      <span style={{color:"#6b7280"}}>{l}</span>
      <span style={{fontWeight:bold?"900":"600",color:col||"#1a202c"}}>{v}</span>
    </div>
  );
}
function ZDivider() {
  return <div style={{borderTop:"1px solid #e5e7eb",margin:"5px 0"}}/>;
}

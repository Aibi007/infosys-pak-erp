import { useState, useMemo, useCallback } from "react";

// ================================================================
// INFOSYS PAK ERP — STEP 8: PROCUREMENT MODULE
// Purchase Orders · Vendor Management · GRN · AP Aging · Analytics
// ================================================================

// ── PALETTE ──────────────────────────────────────────────────────
const C = {
  bg:"#060a10", panel:"#090f1a", card:"#0d1825", card2:"#0b1520",
  border:"#162030", border2:"#1e2e40", text:"#dce4f0", muted:"#4a6070",
  muted2:"#1e2e3e", accent:"#f97316", blue:"#3b82f6", green:"#10b981",
  red:"#ef4444", yellow:"#f59e0b", purple:"#8b5cf6", teal:"#06b6d4",
  pink:"#ec4899", lime:"#84cc16", input:"#070f1a", header:"#050910",
};

const fmt   = n => new Intl.NumberFormat("en-PK").format(Math.round(Math.abs(n)));
const fmtC  = n => `PKR ${fmt(n)}`;
const today = "2024-03-02";

// ── MOCK DATA ─────────────────────────────────────────────────────
const VENDORS = [
  { id:"v001", code:"VND-001", name:"Gul Ahmed Textiles Ltd",    contact:"Imran Gul",       phone:"042-111-485-485", email:"orders@gulahmed.com",    city:"Lahore",   type:"Manufacturer", status:"active",   balance:380000, creditLimit:1000000, paymentTerms:"Net 30", rating:5, totalPurchases:8200000, lastOrder:"2024-03-01", ntn:"1234567-8" },
  { id:"v002", code:"VND-002", name:"Khaadi Pvt Ltd",            contact:"Sara Khan",       phone:"021-111-542-542", email:"supply@khaadi.com",       city:"Karachi",  type:"Brand",        status:"active",   balance:120000, creditLimit:500000,  paymentTerms:"Net 15", rating:4, totalPurchases:5100000, lastOrder:"2024-02-25", ntn:"2345678-9" },
  { id:"v003", code:"VND-003", name:"Sapphire Textile Mills",    contact:"Ali Sapphire",    phone:"042-111-727-727", email:"procurement@sapphire.pk", city:"Lahore",   type:"Manufacturer", status:"active",   balance:95000,  creditLimit:750000,  paymentTerms:"Net 30", rating:4, totalPurchases:3800000, lastOrder:"2024-02-20", ntn:"3456789-0" },
  { id:"v004", code:"VND-004", name:"Bonanza Garments",          contact:"Khalid Bonanza",  phone:"051-111-266-266", email:"orders@bonanza.pk",       city:"Islamabad",type:"Brand",        status:"active",   balance:45000,  creditLimit:300000,  paymentTerms:"Net 45", rating:3, totalPurchases:1900000, lastOrder:"2024-02-15", ntn:"4567890-1" },
  { id:"v005", code:"VND-005", name:"Alkaram Studio",            contact:"Fatima Alkaram",  phone:"021-111-255-255", email:"b2b@alkaram.pk",          city:"Karachi",  type:"Brand",        status:"active",   balance:28000,  creditLimit:400000,  paymentTerms:"Net 30", rating:5, totalPurchases:2600000, lastOrder:"2024-03-01", ntn:"5678901-2" },
  { id:"v006", code:"VND-006", name:"Master Fabrics Faisalabad", contact:"Rashid Master",   phone:"041-111-627-627", email:"sales@masterfab.pk",      city:"Faisalabad",type:"Mill",        status:"active",   balance:650000, creditLimit:2000000, paymentTerms:"Net 60", rating:4, totalPurchases:12400000,lastOrder:"2024-02-28", ntn:"6789012-3" },
  { id:"v007", code:"VND-007", name:"Nishat Linen",              contact:"Amna Nishat",     phone:"042-111-647-647", email:"orders@nishatlinen.com",  city:"Lahore",   type:"Manufacturer", status:"active",   balance:0,      creditLimit:600000,  paymentTerms:"Net 30", rating:5, totalPurchases:4100000, lastOrder:"2024-02-10", ntn:"7890123-4" },
  { id:"v008", code:"VND-008", name:"Limelight Pvt Ltd",         contact:"Hina Limelight",  phone:"042-111-546-546", email:"supply@limelight.pk",     city:"Lahore",   type:"Brand",        status:"inactive", balance:0,      creditLimit:200000,  paymentTerms:"Net 15", rating:3, totalPurchases:890000,  lastOrder:"2023-11-05", ntn:"8901234-5" },
];

const PURCHASE_ORDERS = [
  { id:"po001", number:"PO-2024-001", vendor:"v001", vendorName:"Gul Ahmed Textiles Ltd",   date:"2024-03-01", dueDate:"2024-03-15", status:"received",  total:1250000, tax:0, discount:25000, items:[
    { product:"Lawn Fabric 3pc", sku:"FA-0001", qty:200, uom:"Set",  unitPrice:5500, total:1100000, received:200 },
    { product:"Lawn Dupatta",    sku:"FA-0012", qty:100, uom:"Pcs",  unitPrice:1500, total:150000,  received:100 },
  ], notes:"Urgent order for Eid stock", grn:"GRN-2024-001", paymentStatus:"partial", paidAmount:800000 },

  { id:"po002", number:"PO-2024-002", vendor:"v002", vendorName:"Khaadi Pvt Ltd",           date:"2024-02-28", dueDate:"2024-03-14", status:"partial",   total:560000,  tax:0, discount:0,     items:[
    { product:"Embroidered Kurta L", sku:"RW-0002", qty:80,  uom:"Pcs", unitPrice:3500, total:280000, received:50 },
    { product:"Khaadi Printed Shirt",sku:"RW-0008", qty:80,  uom:"Pcs", unitPrice:3500, total:280000, received:40 },
  ], notes:"Spring collection", grn:"GRN-2024-002", paymentStatus:"unpaid", paidAmount:0 },

  { id:"po003", number:"PO-2024-003", vendor:"v006", vendorName:"Master Fabrics Faisalabad",date:"2024-02-27", dueDate:"2024-04-27", status:"approved",  total:3200000, tax:0, discount:64000, items:[
    { product:"Cotton Lawn Fabric",    sku:"FA-0020", qty:500, uom:"Meters", unitPrice:2800, total:1400000, received:0 },
    { product:"Silk Chiffon Fabric",   sku:"FA-0021", qty:300, uom:"Meters", unitPrice:4800, total:1440000, received:0 },
    { product:"Cambric Cotton",        sku:"FA-0022", qty:200, uom:"Meters", unitPrice:1800, total:360000,  received:0 },
  ], notes:"Q2 inventory top-up. Net 60 terms.", grn:null, paymentStatus:"unpaid", paidAmount:0 },

  { id:"po004", number:"PO-2024-004", vendor:"v005", vendorName:"Alkaram Studio",           date:"2024-03-02", dueDate:"2024-04-01", status:"draft",     total:420000,  tax:0, discount:0,     items:[
    { product:"Alkaram 2pc Set",  sku:"RW-0005", qty:60, uom:"Pcs", unitPrice:3500, total:210000, received:0 },
    { product:"Alkaram Silk Suit",sku:"RW-0009", qty:60, uom:"Pcs", unitPrice:3500, total:210000, received:0 },
  ], notes:"Draft — awaiting approval", grn:null, paymentStatus:"unpaid", paidAmount:0 },

  { id:"po005", number:"PO-2024-005", vendor:"v003", vendorName:"Sapphire Textile Mills",   date:"2024-02-20", dueDate:"2024-03-21", status:"received",  total:648000,  tax:0, discount:12000, items:[
    { product:"Sapphire Cotton",  sku:"FA-0003", qty:120, uom:"Meters", unitPrice:2800, total:336000, received:120 },
    { product:"Sapphire Lawn",    sku:"FA-0004", qty:120, uom:"Meters", unitPrice:2600, total:312000, received:120 },
  ], notes:"", grn:"GRN-2024-003", paymentStatus:"paid", paidAmount:636000 },
];

const GRN_LIST = [
  { id:"grn001", number:"GRN-2024-001", po:"PO-2024-001", vendor:"Gul Ahmed Textiles Ltd", date:"2024-03-02", receivedBy:"Ahmed Raza",   warehouse:"Lahore Main", items:[
    { product:"Lawn Fabric 3pc", qtyOrdered:200, qtyReceived:200, qtyAccepted:198, qtyRejected:2, reason:"2 pcs damaged",      unitCost:5500 },
    { product:"Lawn Dupatta",    qtyOrdered:100, qtyReceived:100, qtyAccepted:100, qtyRejected:0, reason:"",                   unitCost:1500 },
  ], status:"complete", notes:"Minor damage on 2 units — returned to vendor" },
  { id:"grn002", number:"GRN-2024-002", po:"PO-2024-002", vendor:"Khaadi Pvt Ltd",         date:"2024-03-01", receivedBy:"Tariq Hassan",  warehouse:"Karachi",     items:[
    { product:"Embroidered Kurta L",  qtyOrdered:80, qtyReceived:50, qtyAccepted:50, qtyRejected:0, reason:"",         unitCost:3500 },
    { product:"Khaadi Printed Shirt", qtyOrdered:80, qtyReceived:40, qtyAccepted:38, qtyRejected:2, reason:"Size mismatch", unitCost:3500 },
  ], status:"partial", notes:"Balance 50 units expected 2024-03-10" },
  { id:"grn003", number:"GRN-2024-003", po:"PO-2024-005", vendor:"Sapphire Textile Mills",  date:"2024-02-22", receivedBy:"Ahmed Raza",   warehouse:"Lahore Main", items:[
    { product:"Sapphire Cotton", qtyOrdered:120, qtyReceived:120, qtyAccepted:120, qtyRejected:0, reason:"", unitCost:2800 },
    { product:"Sapphire Lawn",   qtyOrdered:120, qtyReceived:120, qtyAccepted:120, qtyRejected:0, reason:"", unitCost:2600 },
  ], status:"complete", notes:"" },
];

const AP_AGING = [
  { vendor:"Master Fabrics",      total:650000, current:0,      d30:0,      d60:650000, d90:0,      d90plus:0      },
  { vendor:"Gul Ahmed Textiles",  total:380000, current:380000, d30:0,      d60:0,      d90:0,      d90plus:0      },
  { vendor:"Khaadi Pvt Ltd",      total:120000, current:0,      d30:120000, d60:0,      d90:0,      d90plus:0      },
  { vendor:"Sapphire Textile",    total:95000,  current:0,      d30:0,      d60:95000,  d90:0,      d90plus:0      },
  { vendor:"Bonanza Garments",    total:45000,  current:0,      d30:45000,  d60:0,      d90:0,      d90plus:0      },
  { vendor:"Alkaram Studio",      total:28000,  current:28000,  d30:0,      d60:0,      d90:0,      d90plus:0      },
];

const PRICE_HISTORY = [
  { product:"Lawn Fabric 3pc",    vendor:"Gul Ahmed",  date:"2024-03-01", price:5500, qty:200 },
  { product:"Lawn Fabric 3pc",    vendor:"Gul Ahmed",  date:"2024-01-15", price:5200, qty:150 },
  { product:"Lawn Fabric 3pc",    vendor:"Gul Ahmed",  date:"2023-11-20", price:4900, qty:100 },
  { product:"Embroidered Kurta",  vendor:"Khaadi",     date:"2024-02-28", price:3500, qty:80  },
  { product:"Embroidered Kurta",  vendor:"Khaadi",     date:"2023-12-10", price:3200, qty:60  },
  { product:"Cotton Fabric",      vendor:"Master Fab", date:"2024-02-27", price:2800, qty:500 },
  { product:"Cotton Fabric",      vendor:"Sapphire",   date:"2024-02-20", price:2800, qty:120 },
  { product:"Cotton Fabric",      vendor:"Master Fab", date:"2023-10-05", price:2500, qty:300 },
];

// ── STATUS CONFIG ─────────────────────────────────────────────────
const PO_STATUS = {
  draft:    { col:C.muted,   label:"Draft",    icon:"📝" },
  approved: { col:C.blue,    label:"Approved",  icon:"✅" },
  partial:  { col:C.yellow,  label:"Partial",   icon:"⏳" },
  received: { col:C.green,   label:"Received",  icon:"📦" },
  cancelled:{ col:C.red,     label:"Cancelled", icon:"✕"  },
};
const PAY_STATUS = {
  unpaid:  { col:C.red,    label:"Unpaid"   },
  partial: { col:C.yellow, label:"Partial"  },
  paid:    { col:C.green,  label:"Paid"     },
};
const RATING_STARS = r => "★".repeat(r) + "☆".repeat(5-r);

// ── HELPERS ───────────────────────────────────────────────────────
const Tag = ({l,col,sm}) => (
  <span style={{fontSize:sm?"9px":"10px",fontWeight:"700",padding:sm?"1px 5px":"2px 8px",borderRadius:"20px",background:`${col}18`,color:col,border:`1px solid ${col}28`,whiteSpace:"nowrap"}}>{l}</span>
);

const Btn = ({onClick,children,color=C.blue,outline=false,small=false,disabled=false,full=false}) => (
  <button onClick={onClick} disabled={disabled}
    style={{width:full?"100%":"auto",padding:small?"5px 11px":"9px 16px",borderRadius:"7px",border:outline?`1px solid ${color}55`:"none",background:disabled?"#1a2a3a":outline?`${color}0e`:color,color:disabled?C.muted:"#fff",cursor:disabled?"not-allowed":"pointer",fontSize:small?"10px":"12px",fontWeight:"700",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"5px",whiteSpace:"nowrap",fontFamily:"inherit"}}>
    {children}
  </button>
);

const TH = ({children,right}) => (
  <th style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:".07em",borderBottom:`1px solid ${C.border}`,background:C.panel,textAlign:right?"right":"left",whiteSpace:"nowrap"}}>{children}</th>
);

const TD = ({children,right,mono,bold,color}) => (
  <td style={{padding:"10px 12px",fontSize:"11px",fontWeight:bold?"800":"400",color:color||C.text,textAlign:right?"right":"left",fontFamily:mono?"'IBM Plex Mono'":'inherit'}}>{children}</td>
);

// ═══════════════════════════════════════════════════════════════════
// MAIN PROCUREMENT MODULE
// ═══════════════════════════════════════════════════════════════════
export default function ProcurementModule() {
  const [tab,        setTab]        = useState("po");
  const [poList,     setPoList]     = useState(PURCHASE_ORDERS);
  const [vendors,    setVendors]    = useState(VENDORS);
  const [grnList,    setGrnList]    = useState(GRN_LIST);
  const [poFilter,   setPoFilter]   = useState("all");
  const [vendFilter, setVendFilter] = useState("all");
  const [search,     setSearch]     = useState("");
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedV,  setSelectedV]  = useState(null);
  const [selectedGRN,setSelectedGRN]= useState(null);
  const [showNewPO,  setShowNewPO]  = useState(false);
  const [showNewGRN, setShowNewGRN] = useState(null); // PO object
  const [showNewV,   setShowNewV]   = useState(false);
  const [notif,      setNotif]      = useState(null);

  const notify = (msg, type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3000); };

  const totalPayables  = vendors.reduce((s,v)=>s+v.balance,0);
  const totalPOs       = poList.length;
  const pendingPOs     = poList.filter(p=>p.status==="approved"||p.status==="partial").length;
  const totalPOValue   = poList.reduce((s,p)=>s+p.total,0);
  const overdueAmount  = AP_AGING.reduce((s,r)=>s+r.d60+r.d90+r.d90plus,0);

  const filteredPOs = useMemo(()=>poList.filter(p=>{
    if(poFilter!=="all"&&p.status!==poFilter) return false;
    if(search&&!p.number.toLowerCase().includes(search.toLowerCase())&&!p.vendorName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[poList,poFilter,search]);

  const filteredVendors = useMemo(()=>vendors.filter(v=>{
    if(vendFilter!=="all"&&v.status!==vendFilter) return false;
    if(search&&!v.name.toLowerCase().includes(search.toLowerCase())&&!v.city.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[vendors,vendFilter,search]);

  const TABS = [
    {k:"po",      l:"📋 Purchase Orders", count:poList.length},
    {k:"vendors", l:"🏢 Vendors",         count:vendors.filter(v=>v.status==="active").length},
    {k:"grn",     l:"📥 Goods Receipt",   count:grnList.length},
    {k:"aging",   l:"⏳ AP Aging"},
    {k:"analytics",l:"📊 Analytics"},
  ];

  return (
    <div style={{display:"flex",height:"100%",flexDirection:"column",background:C.bg,color:C.text,fontFamily:"'IBM Plex Sans',sans-serif",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-thumb{background:#1a2e40;border-radius:4px}
        input,select,textarea,button{font-family:inherit}
        @keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
        @keyframes rowIn{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{background:C.header,borderBottom:`1px solid ${C.border}`,padding:"0 20px",height:"54px",display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
        <div style={{width:"30px",height:"30px",borderRadius:"7px",background:"linear-gradient(135deg,#f97316,#ea580c)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",fontSize:"11px",color:"#fff"}}>IP</div>
        <div>
          <div style={{fontWeight:"800",fontSize:"14px",color:"#fff"}}>Procurement</div>
          <div style={{fontSize:"9px",color:C.muted}}>Purchase Orders · Vendors · GRN · AP Aging</div>
        </div>

        <div style={{marginLeft:"16px",display:"flex",gap:"2px"}}>
          {TABS.map(t=>(
            <button key={t.k} onClick={()=>{setTab(t.k);setSearch("");setSelectedPO(null);setSelectedV(null);setSelectedGRN(null);}}
              style={{padding:"5px 12px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:"700",whiteSpace:"nowrap",background:tab===t.k?C.accent:"transparent",color:tab===t.k?"#fff":C.muted,display:"flex",alignItems:"center",gap:"5px"}}>
              {t.l}{t.count!==undefined&&<span style={{fontSize:"9px",padding:"1px 5px",borderRadius:"10px",background:tab===t.k?"rgba(255,255,255,.25)":`${C.accent}20`,color:tab===t.k?"#fff":C.accent}}>{t.count}</span>}
            </button>
          ))}
        </div>

        <div style={{marginLeft:"auto",display:"flex",gap:"8px",alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:"9px",top:"50%",transform:"translateY(-50%)",fontSize:"11px",color:C.muted}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tab==="vendors"?"Search vendors...":"Search POs..."}
              style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"6px 10px 6px 28px",color:C.text,fontSize:"11px",outline:"none",width:"190px"}}
              onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
          {tab==="po"      && <Btn color={C.green} small onClick={()=>setShowNewPO(true)}>+ New PO</Btn>}
          {tab==="vendors" && <Btn color={C.blue}  small onClick={()=>setShowNewV(true)}>+ Add Vendor</Btn>}
          {tab==="grn"     && <Btn color={C.teal}  small onClick={()=>notify("Select a PO to receive against")}>+ New GRN</Btn>}
          <Btn color={C.muted} outline small onClick={()=>notify("Report exported")}>📤 Export</Btn>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,padding:"9px 20px",display:"flex",gap:"10px",flexShrink:0,overflowX:"auto"}}>
        {[
          {l:"Total Payables",    v:`PKR ${fmt(totalPayables)}`,   col:C.red,    ic:"💳"},
          {l:"Overdue (60+ days)",v:`PKR ${fmt(overdueAmount)}`,   col:"#dc2626", ic:"⚠"},
          {l:"Active POs",        v:pendingPOs,                    col:C.blue,   ic:"📋"},
          {l:"Total PO Value",    v:`PKR ${(totalPOValue/1000000).toFixed(1)}M`, col:C.accent,ic:"🛒"},
          {l:"Active Vendors",    v:vendors.filter(v=>v.status==="active").length, col:C.green,ic:"🏢"},
          {l:"Pending GRNs",      v:grnList.filter(g=>g.status==="partial").length, col:C.yellow,ic:"📥"},
        ].map(s=>(
          <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"9px",padding:"9px 14px",minWidth:"145px",flex:1,position:"relative",overflow:"hidden",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=s.col+"55"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{position:"absolute",top:0,right:0,width:"36px",height:"36px",borderRadius:"0 9px 0 36px",background:`${s.col}12`}}/>
            <div style={{fontSize:"8px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"3px"}}>{s.l}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"16px",fontWeight:"900",color:s.col}}>{s.v}</div>
              <span style={{fontSize:"16px"}}>{s.ic}</span>
            </div>
            <div style={{position:"absolute",bottom:0,left:0,height:"2px",width:"100%",background:`linear-gradient(90deg,${s.col},transparent)`}}/>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* PURCHASE ORDERS TAB                                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab==="po" && (
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
            {/* Filter Tabs */}
            <div style={{display:"flex",gap:"6px",marginBottom:"14px",flexWrap:"wrap"}}>
              {[{k:"all",l:"All POs"},{k:"draft",l:"Draft"},{k:"approved",l:"Approved"},{k:"partial",l:"Partial"},{k:"received",l:"Received"},{k:"cancelled",l:"Cancelled"}].map(f=>(
                <button key={f.k} onClick={()=>setPoFilter(f.k)} style={{padding:"4px 11px",borderRadius:"20px",border:`1px solid ${poFilter===f.k?C.accent:C.border}`,background:poFilter===f.k?`${C.accent}15`:"transparent",color:poFilter===f.k?C.accent:C.muted,cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>
                  {PO_STATUS[f.k]?.icon||""} {f.l} {f.k!=="all"&&<span style={{opacity:.7}}>({poList.filter(p=>p.status===f.k).length})</span>}
                </button>
              ))}
            </div>

            {/* PO Cards */}
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {filteredPOs.map((po,i)=>{
                const st  = PO_STATUS[po.status];
                const pay = PAY_STATUS[po.paymentStatus];
                const outstanding = po.total - po.paidAmount;
                const isSelected  = selectedPO?.id===po.id;
                return(
                  <div key={po.id} onClick={()=>setSelectedPO(isSelected?null:po)}
                    style={{background:C.card,border:`1px solid ${isSelected?C.accent:C.border}`,borderRadius:"10px",overflow:"hidden",cursor:"pointer",transition:"border-color .15s",animation:`rowIn .15s ease ${i*.03}s both`}}>
                    <div style={{padding:"13px 16px",display:"flex",alignItems:"center",gap:"12px",borderBottom:isSelected?`1px solid ${C.border}`:"none"}}>
                      {/* PO Number + Status */}
                      <div style={{width:"38px",height:"38px",borderRadius:"9px",background:`${st.col}18`,border:`1.5px solid ${st.col}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",flexShrink:0}}>
                        {st.icon}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"3px"}}>
                          <span style={{fontSize:"13px",fontWeight:"800",color:C.text,fontFamily:"'IBM Plex Mono'"}}>{po.number}</span>
                          <Tag l={st.label}          col={st.col} sm/>
                          <Tag l={pay.label}         col={pay.col} sm/>
                          {new Date(po.dueDate)<new Date(today)&&po.status!=="received"&&<Tag l="OVERDUE" col={C.red} sm/>}
                        </div>
                        <div style={{fontSize:"11px",color:C.muted}}>{po.vendorName} · Due: {po.dueDate} · {po.items.length} items</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:"15px",fontWeight:"900",color:C.accent}}>PKR {fmt(po.total)}</div>
                        {outstanding>0&&<div style={{fontSize:"10px",color:C.red}}>Outstanding: PKR {fmt(outstanding)}</div>}
                        {outstanding===0&&<div style={{fontSize:"10px",color:C.green}}>✓ Fully Paid</div>}
                      </div>
                      <div style={{display:"flex",gap:"5px",flexShrink:0}} onClick={e=>e.stopPropagation()}>
                        {po.status==="draft"&&<Btn small color={C.blue} onClick={()=>{setPoList(p=>p.map(x=>x.id===po.id?{...x,status:"approved"}:x));notify(`${po.number} approved`)}}>✓ Approve</Btn>}
                        {(po.status==="approved"||po.status==="partial")&&<Btn small color={C.teal} onClick={()=>setShowNewGRN(po)}>📥 Receive</Btn>}
                        {po.status!=="received"&&po.status!=="cancelled"&&<Btn small outline color={C.muted} onClick={()=>notify(`${po.number} printed`)}>🖨</Btn>}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isSelected&&(
                      <div style={{padding:"14px 16px",animation:"fadeIn .2s ease"}}>
                        {/* Items Table */}
                        <div style={{marginBottom:"14px"}}>
                          <div style={{fontSize:"10px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"7px"}}>Line Items</div>
                          <table style={{width:"100%",borderCollapse:"collapse"}}>
                            <thead><tr>
                              <TH>Product</TH><TH>SKU</TH><TH right>Qty</TH><TH>UOM</TH><TH right>Unit Price</TH><TH right>Total</TH><TH right>Received</TH>
                            </tr></thead>
                            <tbody>
                              {po.items.map((item,ii)=>(
                                <tr key={ii} style={{borderBottom:`1px solid ${C.border}`}}>
                                  <TD><span style={{fontWeight:"600"}}>{item.product}</span></TD>
                                  <TD mono>{item.sku}</TD>
                                  <TD right mono>{item.qty}</TD>
                                  <TD>{item.uom}</TD>
                                  <TD right mono color={C.muted}>{fmt(item.unitPrice)}</TD>
                                  <TD right mono bold color={C.green}>{fmt(item.total)}</TD>
                                  <TD right>
                                    <span style={{fontSize:"10px",fontWeight:"700",color:item.received===item.qty?C.green:item.received>0?C.yellow:C.muted}}>
                                      {item.received}/{item.qty}
                                    </span>
                                  </TD>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Totals + meta */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 220px",gap:"14px"}}>
                          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                            {po.notes&&<div style={{padding:"9px 12px",background:`${C.blue}0a`,border:`1px solid ${C.blue}22`,borderRadius:"7px",fontSize:"11px",color:C.muted}}>📝 {po.notes}</div>}
                            {po.grn&&<div style={{fontSize:"11px",color:C.teal}}>📥 GRN: <span style={{fontWeight:"700",fontFamily:"'IBM Plex Mono'"}}>{po.grn}</span></div>}
                            <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                              <Btn small outline color={C.blue} onClick={()=>notify("PO printed")}>🖨 Print PO</Btn>
                              <Btn small outline color={C.green} onClick={()=>notify("Email sent to vendor")}>📧 Email Vendor</Btn>
                              {po.status==="approved"&&<Btn small outline color={C.red} onClick={()=>{setPoList(p=>p.map(x=>x.id===po.id?{...x,status:"cancelled"}:x));setSelectedPO(null);notify("PO cancelled","error")}}>✕ Cancel PO</Btn>}
                            </div>
                          </div>
                          <div style={{background:C.panel,borderRadius:"8px",padding:"12px 14px"}}>
                            {[
                              {l:"Subtotal", v:fmt(po.total+po.discount)},
                              {l:"Discount", v:`- ${fmt(po.discount)}`,col:C.green},
                              {l:"Tax (GST)",v:fmt(po.tax)},
                            ].map(r=>(
                              <div key={r.l} style={{display:"flex",justifyContent:"space-between",fontSize:"11px",marginBottom:"5px",paddingBottom:"5px",borderBottom:`1px solid ${C.border}`}}>
                                <span style={{color:C.muted}}>{r.l}</span>
                                <span style={{fontFamily:"'IBM Plex Mono'",color:r.col||C.text}}>{r.v}</span>
                              </div>
                            ))}
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:"14px",fontWeight:"900",marginTop:"6px"}}>
                              <span style={{color:C.text}}>Total</span>
                              <span style={{color:C.accent,fontFamily:"'IBM Plex Mono'"}}>PKR {fmt(po.total)}</span>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",marginTop:"5px"}}>
                              <span style={{color:C.muted}}>Paid</span>
                              <span style={{color:C.green,fontFamily:"'IBM Plex Mono'"}}>{fmt(po.paidAmount)}</span>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",fontWeight:"800",marginTop:"4px"}}>
                              <span style={{color:C.muted}}>Outstanding</span>
                              <span style={{color:po.total-po.paidAmount>0?C.red:C.green,fontFamily:"'IBM Plex Mono'"}}>{fmt(po.total-po.paidAmount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredPOs.length===0&&(
                <div style={{textAlign:"center",padding:"48px",color:C.muted,fontSize:"13px"}}>
                  <div style={{fontSize:"36px",marginBottom:"10px",opacity:.4}}>📋</div>
                  No purchase orders found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* VENDORS TAB                                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab==="vendors" && (
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* Vendor List */}
          <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
            <div style={{display:"flex",gap:"5px",marginBottom:"14px"}}>
              {["all","active","inactive"].map(f=>(
                <button key={f} onClick={()=>setVendFilter(f)} style={{padding:"4px 11px",borderRadius:"20px",border:`1px solid ${vendFilter===f?C.blue:C.border}`,background:vendFilter===f?`${C.blue}15`:"transparent",color:vendFilter===f?C.blue:C.muted,cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>
                  {f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)} ({f==="all"?vendors.length:vendors.filter(v=>v.status===f).length})
                </button>
              ))}
            </div>

            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <TH>Vendor</TH><TH>Type</TH><TH>City</TH><TH right>Balance (PKR)</TH><TH right>Credit Limit</TH><TH>Terms</TH><TH>Rating</TH><TH>Status</TH><TH>Action</TH>
                </tr></thead>
                <tbody>
                  {filteredVendors.map((v,i)=>{
                    const utilization = v.creditLimit>0?(v.balance/v.creditLimit)*100:0;
                    const isSelected  = selectedV?.id===v.id;
                    return(
                      <tr key={v.id} onClick={()=>setSelectedV(isSelected?null:v)}
                        style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:isSelected?`${C.blue}0a`:"transparent",animation:`rowIn .12s ease ${i*.03}s both`}}
                        onMouseEnter={e=>{if(!isSelected)e.currentTarget.style.background=C.panel}}
                        onMouseLeave={e=>{if(!isSelected)e.currentTarget.style.background=isSelected?`${C.blue}0a`:"transparent"}}>
                        <td style={{padding:"11px 12px"}}>
                          <div style={{fontSize:"12px",fontWeight:"700",color:C.text}}>{v.name}</div>
                          <div style={{fontSize:"9px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>{v.code} · {v.contact}</div>
                        </td>
                        <td style={{padding:"11px 12px"}}><Tag l={v.type} col={v.type==="Manufacturer"?C.blue:v.type==="Brand"?C.purple:C.teal} sm/></td>
                        <TD>{v.city}</TD>
                        <td style={{padding:"11px 12px",textAlign:"right"}}>
                          <div style={{fontSize:"12px",fontWeight:"800",color:v.balance>0?C.red:C.muted,fontFamily:"'IBM Plex Mono'"}}>{v.balance>0?fmt(v.balance):"—"}</div>
                          {v.balance>0&&<div style={{width:"70px",height:"3px",background:C.border,borderRadius:"2px",marginLeft:"auto",marginTop:"3px",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,utilization)}%`,background:utilization>80?C.red:utilization>50?C.yellow:C.green,borderRadius:"2px"}}/></div>}
                        </td>
                        <TD right mono color={C.muted}>{fmt(v.creditLimit)}</TD>
                        <TD>{v.paymentTerms}</TD>
                        <td style={{padding:"11px 12px",fontSize:"12px",color:C.yellow,letterSpacing:"1px"}}>{RATING_STARS(v.rating)}</td>
                        <td style={{padding:"11px 12px"}}><Tag l={v.status==="active"?"Active":"Inactive"} col={v.status==="active"?C.green:C.muted} sm/></td>
                        <td style={{padding:"11px 12px"}} onClick={e=>e.stopPropagation()}>
                          <div style={{display:"flex",gap:"4px"}}>
                            <Btn small outline color={C.blue} onClick={()=>setSelectedV(v)}>View</Btn>
                            <Btn small outline color={C.green} onClick={()=>setShowNewPO(true)}>+ PO</Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vendor Detail Sidebar */}
          {selectedV&&(
            <div style={{width:"320px",background:C.panel,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,animation:"slideIn .2s ease",overflow:"hidden"}}>
              <div style={{padding:"13px 15px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:"13px",fontWeight:"800",color:C.text}}>Vendor Profile</span>
                <button onClick={()=>setSelectedV(null)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"16px"}}>✕</button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
                {/* Header */}
                <div style={{background:`linear-gradient(135deg,${C.blue}18,${C.purple}0a)`,borderRadius:"10px",padding:"14px",marginBottom:"14px",border:`1px solid ${C.blue}22`}}>
                  <div style={{fontSize:"15px",fontWeight:"900",color:C.text,marginBottom:"4px"}}>{selectedV.name}</div>
                  <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                    <Tag l={selectedV.code} col={C.blue} sm/>
                    <Tag l={selectedV.type} col={C.purple} sm/>
                    <Tag l={selectedV.status==="active"?"Active":"Inactive"} col={selectedV.status==="active"?C.green:C.muted} sm/>
                  </div>
                  <div style={{fontSize:"14px",color:C.yellow,letterSpacing:"2px",marginTop:"8px"}}>{RATING_STARS(selectedV.rating)}</div>
                </div>

                {/* Key Info */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px",marginBottom:"14px"}}>
                  {[
                    {l:"Contact",v:selectedV.contact},
                    {l:"City",   v:selectedV.city},
                    {l:"Phone",  v:selectedV.phone},
                    {l:"Email",  v:selectedV.email,small:true},
                    {l:"NTN",    v:selectedV.ntn},
                    {l:"Terms",  v:selectedV.paymentTerms},
                    {l:"Last Order",v:selectedV.lastOrder},
                    {l:"Total Purchases",v:`PKR ${(selectedV.totalPurchases/1000000).toFixed(1)}M`,col:C.green},
                  ].map(s=>(
                    <div key={s.l} style={{background:C.card,borderRadius:"7px",padding:"8px 10px",gridColumn:s.small?"1/-1":"auto"}}>
                      <div style={{fontSize:"8px",color:C.muted,marginBottom:"2px",textTransform:"uppercase",letterSpacing:".06em"}}>{s.l}</div>
                      <div style={{fontSize:"10px",fontWeight:"700",color:s.col||C.text,wordBreak:"break-all"}}>{s.v}</div>
                    </div>
                  ))}
                </div>

                {/* Balance & Credit */}
                <div style={{background:C.card,borderRadius:"9px",padding:"12px",marginBottom:"12px",border:`1px solid ${selectedV.balance>selectedV.creditLimit*0.8?C.red+"44":C.border}`}}>
                  <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"8px"}}>Credit Utilization</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                    <span style={{fontSize:"11px",color:C.muted}}>Balance Due</span>
                    <span style={{fontSize:"13px",fontWeight:"900",color:selectedV.balance>0?C.red:C.muted,fontFamily:"'IBM Plex Mono'"}}>{selectedV.balance>0?`PKR ${fmt(selectedV.balance)}`:"—"}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"7px"}}>
                    <span style={{fontSize:"11px",color:C.muted}}>Credit Limit</span>
                    <span style={{fontSize:"11px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>PKR {fmt(selectedV.creditLimit)}</span>
                  </div>
                  <div style={{height:"6px",background:C.border,borderRadius:"3px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(100,(selectedV.balance/selectedV.creditLimit)*100)}%`,background:selectedV.balance>selectedV.creditLimit*.8?C.red:selectedV.balance>selectedV.creditLimit*.5?C.yellow:C.green,borderRadius:"3px"}}/>
                  </div>
                  <div style={{fontSize:"9px",color:C.muted,marginTop:"4px",textAlign:"right"}}>{((selectedV.balance/selectedV.creditLimit)*100).toFixed(0)}% utilized</div>
                </div>

                {/* Recent POs */}
                <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"7px"}}>Recent Purchase Orders</div>
                {poList.filter(p=>p.vendor===selectedV.id).slice(0,3).map(p=>(
                  <div key={p.id} style={{padding:"8px 10px",background:C.card,borderRadius:"7px",marginBottom:"5px",display:"flex",alignItems:"center",gap:"8px",cursor:"pointer"}} onClick={()=>{setTab("po");setSelectedPO(p);}}>
                    <Tag l={PO_STATUS[p.status].icon+" "+PO_STATUS[p.status].label} col={PO_STATUS[p.status].col} sm/>
                    <div style={{flex:1,fontSize:"10px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>{p.number}</div>
                    <div style={{fontSize:"11px",fontWeight:"800",color:C.accent}}>PKR {fmt(p.total)}</div>
                  </div>
                ))}
                {poList.filter(p=>p.vendor===selectedV.id).length===0&&<div style={{fontSize:"11px",color:C.muted,textAlign:"center",padding:"14px"}}>No orders yet</div>}

                <div style={{display:"flex",flexDirection:"column",gap:"6px",marginTop:"12px"}}>
                  <Btn full color={C.green} small onClick={()=>{setShowNewPO(true);setSelectedV(null);}}>+ Create Purchase Order</Btn>
                  <Btn full color={C.blue} outline small onClick={()=>notify("Vendor statement printed")}>📄 Print Statement</Btn>
                  <Btn full color={C.yellow} outline small onClick={()=>notify("Email sent to vendor")}>📧 Send Email</Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* GRN TAB                                                    */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab==="grn" && (
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
            <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
              {grnList.map((grn,i)=>{
                const totalAccepted = grn.items.reduce((s,it)=>s+it.qtyAccepted,0);
                const totalOrdered  = grn.items.reduce((s,it)=>s+it.qtyOrdered,0);
                const totalRejected = grn.items.reduce((s,it)=>s+it.qtyRejected,0);
                const totalValue    = grn.items.reduce((s,it)=>s+it.qtyAccepted*it.unitCost,0);
                const isSelected    = selectedGRN?.id===grn.id;
                return(
                  <div key={grn.id} onClick={()=>setSelectedGRN(isSelected?null:grn)}
                    style={{background:C.card,border:`1px solid ${isSelected?C.teal:C.border}`,borderRadius:"10px",overflow:"hidden",cursor:"pointer",animation:`rowIn .15s ease ${i*.05}s both`}}>
                    <div style={{padding:"13px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
                      <div style={{width:"38px",height:"38px",borderRadius:"9px",background:`${grn.status==="complete"?C.green:C.yellow}18`,border:`1.5px solid ${grn.status==="complete"?C.green:C.yellow}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>
                        {grn.status==="complete"?"✅":"📦"}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"3px"}}>
                          <span style={{fontSize:"13px",fontWeight:"800",color:C.text,fontFamily:"'IBM Plex Mono'"}}>{grn.number}</span>
                          <Tag l={grn.status==="complete"?"Complete":"Partial"} col={grn.status==="complete"?C.green:C.yellow} sm/>
                          <Tag l={`Ref: ${grn.po}`} col={C.blue} sm/>
                        </div>
                        <div style={{fontSize:"11px",color:C.muted}}>{grn.vendor} · {grn.warehouse} · Received by: {grn.receivedBy} · {grn.date}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:"14px",fontWeight:"900",color:C.green}}>PKR {fmt(totalValue)}</div>
                        <div style={{fontSize:"10px",color:C.muted}}>{totalAccepted}/{totalOrdered} units accepted</div>
                        {totalRejected>0&&<div style={{fontSize:"10px",color:C.red}}>{totalRejected} rejected</div>}
                      </div>
                    </div>

                    {isSelected&&(
                      <div style={{padding:"14px 16px",borderTop:`1px solid ${C.border}`,animation:"fadeIn .2s ease"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"12px"}}>
                          <thead><tr>
                            <TH>Product</TH><TH right>Ordered</TH><TH right>Received</TH><TH right>Accepted</TH><TH right>Rejected</TH><TH right>Unit Cost</TH><TH right>Value</TH><TH>Reject Reason</TH>
                          </tr></thead>
                          <tbody>
                            {grn.items.map((it,ii)=>(
                              <tr key={ii} style={{borderBottom:`1px solid ${C.border}`}}>
                                <TD><span style={{fontWeight:"600"}}>{it.product}</span></TD>
                                <TD right mono>{it.qtyOrdered}</TD>
                                <TD right mono>{it.qtyReceived}</TD>
                                <TD right mono color={C.green}>{it.qtyAccepted}</TD>
                                <TD right mono color={it.qtyRejected>0?C.red:C.muted}>{it.qtyRejected||"—"}</TD>
                                <TD right mono color={C.muted}>{fmt(it.unitCost)}</TD>
                                <TD right mono bold color={C.accent}>{fmt(it.qtyAccepted*it.unitCost)}</TD>
                                <TD><span style={{fontSize:"10px",color:C.muted}}>{it.reason||"—"}</span></TD>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {grn.notes&&<div style={{padding:"9px 12px",background:`${C.blue}0a`,border:`1px solid ${C.blue}22`,borderRadius:"7px",fontSize:"11px",color:C.muted,marginBottom:"10px"}}>📝 {grn.notes}</div>}
                        <div style={{display:"flex",gap:"6px"}}>
                          <Btn small outline color={C.blue} onClick={()=>notify("GRN printed")}>🖨 Print GRN</Btn>
                          <Btn small outline color={C.green} onClick={()=>notify("GRN posted to accounting")}>📒 Post to Accounts</Btn>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* AP AGING TAB                                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab==="aging" && (
        <div style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:"16px"}}>
          {/* Aging Stacked Bar */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
            <div style={{fontSize:"14px",fontWeight:"800",color:C.text,marginBottom:"14px"}}>AP Aging Summary — All Vendors</div>
            {(() => {
              const tots = {current:AP_AGING.reduce((s,r)=>s+r.current,0),d30:AP_AGING.reduce((s,r)=>s+r.d30,0),d60:AP_AGING.reduce((s,r)=>s+r.d60,0),d90:AP_AGING.reduce((s,r)=>s+r.d90,0),d90plus:AP_AGING.reduce((s,r)=>s+r.d90plus,0)};
              const total = Object.values(tots).reduce((a,b)=>a+b,0);
              const buckets=[{l:"Current",k:"current",col:C.green},{l:"1–30 Days",k:"d30",col:C.yellow},{l:"31–60 Days",k:"d60",col:C.accent},{l:"61–90 Days",k:"d90",col:C.red},{l:"90+ Days",k:"d90plus",col:"#dc2626"}];
              return(
                <>
                  <div style={{display:"flex",height:"36px",borderRadius:"8px",overflow:"hidden",marginBottom:"12px",gap:"2px"}}>
                    {buckets.filter(b=>tots[b.k]>0).map(b=>(
                      <div key={b.k} style={{flex:tots[b.k],background:b.col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:"700",color:"#fff",minWidth:"20px",transition:"flex .3s",title:`${b.l}: PKR ${fmt(tots[b.k])}`}}>
                        {(tots[b.k]/total*100)>8?`${(tots[b.k]/total*100).toFixed(0)}%`:""}
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:"16px",flexWrap:"wrap"}}>
                    {buckets.map(b=>(
                      <div key={b.k} style={{display:"flex",alignItems:"center",gap:"7px"}}>
                        <div style={{width:"9px",height:"9px",borderRadius:"2px",background:b.col}}/>
                        <span style={{fontSize:"10px",color:C.muted}}>{b.l}</span>
                        <span style={{fontSize:"11px",fontWeight:"800",color:b.col,fontFamily:"'IBM Plex Mono'"}}>PKR {fmt(tots[b.k])}</span>
                      </div>
                    ))}
                    <div style={{marginLeft:"auto",fontSize:"13px",fontWeight:"900",color:C.accent}}>Total: PKR {fmt(total)}</div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Aging Detail Table */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",overflow:"hidden"}}>
            <div style={{padding:"13px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"13px",fontWeight:"800",color:C.text}}>Vendor-wise AP Aging</span>
              <Btn small outline color={C.blue} onClick={()=>notify("AP Aging exported")}>📤 Export</Btn>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>
                <TH>Vendor</TH>
                {["Total","Current","1–30 Days","31–60 Days","61–90 Days","90+ Days"].map((h,i)=><th key={h} style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",borderBottom:`1px solid ${C.border}`,background:C.panel,textAlign:"right",color:[C.text,C.green,C.yellow,C.accent,C.red,"#dc2626"][i]}}>{h}</th>)}
                <TH>Action</TH>
              </tr></thead>
              <tbody>
                {AP_AGING.map((row,i)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${C.border}`,animation:`rowIn .1s ease ${i*.04}s both`}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"11px 12px",fontSize:"12px",fontWeight:"700",color:C.text}}>{row.vendor}</td>
                    {[row.total,row.current,row.d30,row.d60,row.d90,row.d90plus].map((v,vi)=>(
                      <td key={vi} style={{padding:"11px 12px",textAlign:"right",fontSize:"11px",fontWeight:vi===0?"800":"600",color:v>0?[C.text,C.green,C.yellow,C.accent,C.red,"#dc2626"][vi]:C.muted2,fontFamily:"'IBM Plex Mono'"}}>{v>0?fmt(v):"—"}</td>
                    ))}
                    <td style={{padding:"11px 12px"}}>
                      <Btn small outline color={C.blue} onClick={()=>notify(`Payment recorded for ${row.vendor}`)}>💳 Pay</Btn>
                    </td>
                  </tr>
                ))}
                <tr style={{borderTop:`2px solid ${C.border2}`,background:`${C.accent}08`}}>
                  <td style={{padding:"10px 12px",fontSize:"11px",fontWeight:"900",color:C.text}}>TOTAL</td>
                  {["total","current","d30","d60","d90","d90plus"].map((k,ki)=>(
                    <td key={k} style={{padding:"10px 12px",textAlign:"right",fontSize:"12px",fontWeight:"900",color:[C.accent,C.green,C.yellow,C.accent,C.red,"#dc2626"][ki],fontFamily:"'IBM Plex Mono'"}}>
                      {fmt(AP_AGING.reduce((s,r)=>s+r[k],0))}
                    </td>
                  ))}
                  <td/>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ANALYTICS TAB                                              */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab==="analytics" && (
        <div style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:"16px"}}>
          {/* Vendor Spend Cards */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
            <div style={{fontSize:"14px",fontWeight:"800",color:C.text,marginBottom:"14px"}}>Vendor Purchase Analysis</div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {vendors.filter(v=>v.totalPurchases>0).sort((a,b)=>b.totalPurchases-a.totalPurchases).map((v,i)=>{
                const maxVal = Math.max(...vendors.map(x=>x.totalPurchases));
                const pct    = (v.totalPurchases/maxVal)*100;
                const colors = [C.accent,C.blue,C.green,C.purple,C.teal,C.yellow,C.pink];
                const col    = colors[i%colors.length];
                return(
                  <div key={v.id} style={{display:"flex",alignItems:"center",gap:"12px"}}>
                    <div style={{fontSize:"11px",fontWeight:"700",color:C.text,width:"200px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flexShrink:0}}>{v.name}</div>
                    <div style={{flex:1,height:"22px",background:C.border,borderRadius:"4px",overflow:"hidden",position:"relative"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${col},${col}cc)`,borderRadius:"4px",display:"flex",alignItems:"center",paddingLeft:"8px",minWidth:"60px",transition:"width .5s ease"}}>
                        <span style={{fontSize:"9px",fontWeight:"700",color:"#fff",whiteSpace:"nowrap"}}>PKR {(v.totalPurchases/1000000).toFixed(1)}M</span>
                      </div>
                    </div>
                    <div style={{width:"60px",textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:"10px",color:C.muted,fontWeight:"700"}}>{((v.totalPurchases/vendors.reduce((s,x)=>s+x.totalPurchases,0))*100).toFixed(0)}%</div>
                      <div style={{fontSize:"8px",color:C.muted2}}>{RATING_STARS(v.rating)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Price History */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",overflow:"hidden"}}>
            <div style={{padding:"13px 16px",borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:"14px",fontWeight:"800",color:C.text}}>Price History — Product vs Vendor</div>
              <div style={{fontSize:"10px",color:C.muted,marginTop:"2px"}}>Track price changes across vendors over time</div>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><TH>Product</TH><TH>Vendor</TH><TH>Date</TH><TH right>Unit Price</TH><TH right>Qty</TH><TH right>Total Value</TH><TH>Trend</TH></tr></thead>
              <tbody>
                {PRICE_HISTORY.map((p,i)=>{
                  const prev = PRICE_HISTORY.slice(i+1).find(x=>x.product===p.product&&x.vendor===p.vendor);
                  const diff = prev?(p.price-prev.price):0;
                  return(
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <TD><span style={{fontWeight:"600"}}>{p.product}</span></TD>
                      <TD>{p.vendor}</TD>
                      <TD>{p.date}</TD>
                      <TD right mono bold color={C.accent}>PKR {fmt(p.price)}</TD>
                      <TD right mono>{p.qty}</TD>
                      <TD right mono color={C.green}>PKR {fmt(p.price*p.qty)}</TD>
                      <td style={{padding:"10px 12px"}}>
                        {diff!==0&&<span style={{fontSize:"10px",fontWeight:"800",color:diff>0?C.red:C.green}}>{diff>0?"▲":"▼"} PKR {fmt(Math.abs(diff))} ({diff>0?"+":""}{((diff/p.price)*100).toFixed(1)}%)</span>}
                        {diff===0&&!prev&&<span style={{fontSize:"10px",color:C.muted}}>Baseline</span>}
                        {diff===0&&prev&&<span style={{fontSize:"10px",color:C.muted}}>No change</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Stats Grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"12px"}}>
            {[
              {l:"Total Purchases (6 Mo)", v:`PKR ${(PURCHASE_ORDERS.reduce((s,p)=>s+p.total,0)/1000000).toFixed(1)}M`, col:C.accent},
              {l:"Top Vendor",             v:"Master Fabrics Fsd.", col:C.blue},
              {l:"Avg PO Value",           v:`PKR ${fmt(PURCHASE_ORDERS.reduce((s,p)=>s+p.total,0)/PURCHASE_ORDERS.length)}`, col:C.green},
              {l:"Vendor Payment Rate",    v:"94.2%",              col:C.teal},
              {l:"On-Time Deliveries",     v:"87%",                col:C.purple},
              {l:"Rejection Rate",         v:"1.8%",              col:C.yellow},
            ].map(s=>(
              <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"9px",padding:"14px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,right:0,width:"40px",height:"40px",borderRadius:"0 9px 0 40px",background:`${s.col}12`}}/>
                <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"6px"}}>{s.l}</div>
                <div style={{fontSize:"17px",fontWeight:"900",color:s.col}}>{s.v}</div>
                <div style={{position:"absolute",bottom:0,left:0,height:"2px",width:"100%",background:`linear-gradient(90deg,${s.col},transparent)`}}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* NEW PO MODAL                                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showNewPO&&<NewPOModal vendors={vendors} onClose={()=>setShowNewPO(false)} onSave={po=>{setPoList(p=>[po,...p]);setShowNewPO(false);notify(`${po.number} created`);}}/>}

      {/* NEW GRN MODAL */}
      {showNewGRN&&<NewGRNModal po={showNewGRN} warehouses={["Lahore Main","Karachi","Islamabad","Faisalabad"]}
        onClose={()=>setShowNewGRN(null)}
        onSave={grn=>{setGrnList(p=>[grn,...p]);setPoList(p=>p.map(x=>x.id===showNewGRN.id?{...x,status:grn.status==="complete"?"received":"partial",grn:grn.number}:x));setShowNewGRN(null);notify(`${grn.number} saved`);}}/>}

      {/* ADD VENDOR MODAL */}
      {showNewV&&<AddVendorModal onClose={()=>setShowNewV(false)} onSave={v=>{setVendors(p=>[v,...p]);setShowNewV(false);notify(`${v.name} added`);}}/>}

      {/* NOTIFICATION */}
      {notif&&<div style={{position:"fixed",top:"14px",left:"50%",transform:"translateX(-50%)",zIndex:500,background:notif.type==="error"?C.red:C.green,color:"#fff",padding:"10px 18px",borderRadius:"8px",fontSize:"12px",fontWeight:"700",boxShadow:"0 8px 24px rgba(0,0,0,.5)",animation:"slideIn .2s ease",whiteSpace:"nowrap"}}>
        {notif.type==="error"?"✕":"✓"} {notif.msg}
      </div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// NEW PO MODAL
// ══════════════════════════════════════════════════════════════════
function NewPOModal({vendors,onClose,onSave}){
  const [vendor,  setVendor]  = useState(vendors[0]?.id||"");
  const [date,    setDate]    = useState(today);
  const [dueDate, setDueDate] = useState("");
  const [notes,   setNotes]   = useState("");
  const [items,   setItems]   = useState([{product:"",sku:"",qty:1,uom:"Pcs",unitPrice:0}]);
  const [discount,setDiscount]= useState(0);

  const subtotal = items.reduce((s,it)=>s+(it.qty*it.unitPrice),0);
  const total    = subtotal - discount;

  const addItem    = () => setItems(p=>[...p,{product:"",sku:"",qty:1,uom:"Pcs",unitPrice:0}]);
  const removeItem = i  => setItems(p=>p.filter((_,idx)=>idx!==i));
  const updateItem = (i,k,v) => setItems(p=>p.map((it,idx)=>idx===i?{...it,[k]:v}:it));

  const handleSave = (asDraft) => {
    const v = vendors.find(x=>x.id===vendor);
    const num = `PO-2024-${String(Math.floor(Math.random()*900)+100)}`;
    onSave({
      id:`po_${Date.now()}`, number:num, vendor, vendorName:v?.name||"", date, dueDate,
      status:asDraft?"draft":"approved",
      total, discount, tax:0, notes, grn:null,
      paymentStatus:"unpaid", paidAmount:0,
      items:items.map(it=>({...it,total:it.qty*it.unitPrice,received:0})),
    });
  };

  const F = ({l,children}) => (
    <div>
      <label style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:"4px"}}>{l}</label>
      {children}
    </div>
  );
  const inputStyle = {width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"8px 10px",color:C.text,fontSize:"12px",outline:"none"};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:300,paddingTop:"40px",overflowY:"auto"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",width:"700px",maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",animation:"slideIn .2s ease",margin:"0 20px 40px"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.panel,flexShrink:0}}>
          <div>
            <div style={{fontWeight:"900",fontSize:"15px",color:C.text}}>New Purchase Order</div>
            <div style={{fontSize:"10px",color:C.muted}}>Create a new vendor purchase order</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px",marginBottom:"18px"}}>
            <F l="Vendor">
              <select value={vendor} onChange={e=>setVendor(e.target.value)} style={inputStyle}>
                {vendors.filter(v=>v.status==="active").map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </F>
            <F l="Order Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle}/></F>
            <F l="Due / Delivery Date"><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={inputStyle}/></F>
          </div>

          {/* Items */}
          <div style={{marginBottom:"16px"}}>
            <div style={{fontSize:"10px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"8px"}}>Line Items</div>
            <div style={{border:`1px solid ${C.border}`,borderRadius:"9px",overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 80px 1fr 1fr 36px",gap:"1px",background:C.panel,padding:"7px 10px"}}>
                {["Product","SKU","UOM","Qty","Unit Price","Total",""].map(h=><div key={h} style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".06em"}}>{h}</div>)}
              </div>
              {items.map((it,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 80px 1fr 1fr 36px",gap:"6px",padding:"7px 10px",borderTop:`1px solid ${C.border}`}}>
                  <input value={it.product} onChange={e=>updateItem(i,"product",e.target.value)} placeholder="Product name"
                    style={{...inputStyle,padding:"6px 8px",fontSize:"11px"}}/>
                  <input value={it.sku} onChange={e=>updateItem(i,"sku",e.target.value)} placeholder="SKU"
                    style={{...inputStyle,padding:"6px 8px",fontSize:"11px",fontFamily:"'IBM Plex Mono'"}}/>
                  <select value={it.uom} onChange={e=>updateItem(i,"uom",e.target.value)} style={{...inputStyle,padding:"6px 8px",fontSize:"11px"}}>
                    {["Pcs","Set","Meters","Kg","Box","Dozen"].map(u=><option key={u}>{u}</option>)}
                  </select>
                  <input type="number" value={it.qty} onChange={e=>updateItem(i,"qty",+e.target.value)} min="1"
                    style={{...inputStyle,padding:"6px 8px",fontSize:"11px",textAlign:"right"}}/>
                  <input type="number" value={it.unitPrice} onChange={e=>updateItem(i,"unitPrice",+e.target.value)} min="0"
                    style={{...inputStyle,padding:"6px 8px",fontSize:"11px",textAlign:"right"}}/>
                  <div style={{display:"flex",alignItems:"center",fontSize:"12px",fontWeight:"800",color:C.green,fontFamily:"'IBM Plex Mono'"}}>{fmt(it.qty*it.unitPrice)}</div>
                  <button onClick={()=>removeItem(i)} disabled={items.length<=1} style={{background:"none",border:"none",color:items.length<=1?C.muted2:C.red,cursor:items.length<=1?"not-allowed":"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                </div>
              ))}
            </div>
            <button onClick={addItem} style={{marginTop:"7px",width:"100%",padding:"7px",borderRadius:"7px",border:`1px dashed ${C.border2}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:"11px"}}>+ Add Item</button>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 220px",gap:"14px"}}>
            <F l="Notes / Instructions">
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Special instructions, delivery notes..."
                style={{...inputStyle,resize:"vertical"}}/>
            </F>
            <div style={{background:C.panel,borderRadius:"9px",padding:"14px",display:"flex",flexDirection:"column",gap:"8px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px"}}>
                <span style={{color:C.muted}}>Subtotal</span>
                <span style={{fontFamily:"'IBM Plex Mono'",color:C.text}}>{fmt(subtotal)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"11px"}}>
                <span style={{color:C.muted}}>Discount</span>
                <input type="number" value={discount} onChange={e=>setDiscount(+e.target.value)} min="0"
                  style={{width:"90px",background:C.input,border:`1px solid ${C.border}`,borderRadius:"5px",padding:"3px 7px",color:C.green,fontSize:"11px",fontFamily:"'IBM Plex Mono'",outline:"none",textAlign:"right"}}/>
              </div>
              <div style={{height:"1px",background:C.border}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"15px",fontWeight:"900"}}>
                <span style={{color:C.text}}>Total</span>
                <span style={{color:C.accent,fontFamily:"'IBM Plex Mono'"}}>PKR {fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:"8px",flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:"8px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontWeight:"600",fontSize:"12px"}}>Cancel</button>
          <Btn color={C.yellow} onClick={()=>handleSave(true)}>💾 Save as Draft</Btn>
          <Btn color={C.green}  onClick={()=>handleSave(false)} disabled={items.some(i=>!i.product||i.qty<1||i.unitPrice<1)}>✓ Create & Approve PO</Btn>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// NEW GRN MODAL
// ══════════════════════════════════════════════════════════════════
function NewGRNModal({po,warehouses,onClose,onSave}){
  const [warehouse, setWarehouse] = useState(warehouses[0]);
  const [notes,     setNotes]     = useState("");
  const [items,     setItems]     = useState(
    po.items.map(it=>({...it,qtyReceived:it.qty-it.received,qtyAccepted:it.qty-it.received,qtyRejected:0,reason:""}))
  );
  const updateItem=(i,k,v)=>setItems(p=>p.map((it,idx)=>{
    if(idx!==i) return it;
    const updated={...it,[k]:+v};
    if(k==="qtyReceived") updated.qtyAccepted=+v;
    if(k==="qtyAccepted") updated.qtyRejected=updated.qtyReceived-+v;
    return updated;
  }));

  const totalAccepted = items.reduce((s,it)=>s+it.qtyAccepted,0);
  const totalOrdered  = items.reduce((s,it)=>s+it.qty,0);
  const isComplete    = items.every(it=>it.qtyReceived+it.received>=it.qty);

  const handleSave=()=>{
    const num=`GRN-2024-${String(Math.floor(Math.random()*900)+100)}`;
    onSave({
      id:`grn_${Date.now()}`, number:num, po:po.number, vendor:po.vendorName,
      date:today, receivedBy:"Ahmed Raza", warehouse, notes,
      status:isComplete?"complete":"partial",
      items:items.map(it=>({product:it.product,qtyOrdered:it.qty,qtyReceived:it.qtyReceived,qtyAccepted:it.qtyAccepted,qtyRejected:it.qtyRejected,reason:it.reason,unitCost:it.unitPrice})),
    });
  };

  const inputStyle={background:C.input,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"5px 8px",color:C.text,fontSize:"11px",outline:"none",fontFamily:"inherit"};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",width:"720px",maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column",animation:"slideIn .2s ease"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.panel,flexShrink:0}}>
          <div>
            <div style={{fontWeight:"900",fontSize:"15px",color:C.text}}>Goods Receipt Note</div>
            <div style={{fontSize:"10px",color:C.muted}}>Receiving against {po.number} · {po.vendorName}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"18px"}}>
            <div>
              <label style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:"4px"}}>Receiving Warehouse</label>
              <select value={warehouse} onChange={e=>setWarehouse(e.target.value)} style={{...inputStyle,width:"100%",padding:"8px 10px"}}>
                {warehouses.map(w=><option key={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:"4px"}}>Receiving Date</label>
              <input type="date" defaultValue={today} style={{...inputStyle,width:"100%",padding:"8px 10px"}}/>
            </div>
          </div>

          <div style={{border:`1px solid ${C.border}`,borderRadius:"9px",overflow:"hidden",marginBottom:"14px"}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 70px 80px 80px 80px 1fr",gap:"1px",background:C.panel,padding:"7px 10px"}}>
              {["Product","Ordered","Received","Accepted","Rejected","Reject Reason"].map(h=><div key={h} style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".05em"}}>{h}</div>)}
            </div>
            {items.map((it,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 70px 80px 80px 80px 1fr",gap:"6px",padding:"8px 10px",borderTop:`1px solid ${C.border}`,alignItems:"center"}}>
                <div style={{fontSize:"11px",fontWeight:"600",color:C.text}}>{it.product}</div>
                <div style={{fontSize:"11px",color:C.muted,textAlign:"right",fontFamily:"'IBM Plex Mono'"}}>{it.qty}</div>
                <input type="number" value={it.qtyReceived} min="0" max={it.qty-it.received} onChange={e=>updateItem(i,"qtyReceived",e.target.value)}
                  style={{...inputStyle,textAlign:"right",width:"100%"}}/>
                <input type="number" value={it.qtyAccepted} min="0" max={it.qtyReceived} onChange={e=>updateItem(i,"qtyAccepted",e.target.value)}
                  style={{...inputStyle,textAlign:"right",width:"100%",color:C.green}}/>
                <div style={{fontSize:"11px",fontWeight:"700",color:it.qtyRejected>0?C.red:C.muted,textAlign:"right",fontFamily:"'IBM Plex Mono'"}}>{it.qtyRejected||"—"}</div>
                <input value={it.reason} onChange={e=>setItems(p=>p.map((x,xi)=>xi===i?{...x,reason:e.target.value}:x))} placeholder={it.qtyRejected>0?"Rejection reason...":""}
                  style={{...inputStyle,width:"100%",opacity:it.qtyRejected>0?1:.4}}/>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
            <div style={{padding:"11px 14px",background:C.panel,borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"11px",color:C.muted}}>Total Accepted</span>
              <span style={{fontSize:"16px",fontWeight:"900",color:C.green}}>{totalAccepted} / {totalOrdered}</span>
            </div>
            <div style={{padding:"11px 14px",background:C.panel,borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"11px",color:C.muted}}>GRN Type</span>
              <span style={{fontSize:"13px",fontWeight:"800",color:isComplete?C.green:C.yellow}}>{isComplete?"Complete Receipt":"Partial Receipt"}</span>
            </div>
          </div>

          <div>
            <label style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:"4px"}}>Notes</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Quality notes, delivery condition..."
              style={{...inputStyle,width:"100%",resize:"vertical"}}/>
          </div>
        </div>

        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:"8px",flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:"8px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontWeight:"600",fontSize:"12px"}}>Cancel</button>
          <Btn color={C.teal} onClick={handleSave}>📥 Save GRN & Update Stock</Btn>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADD VENDOR MODAL
// ══════════════════════════════════════════════════════════════════
function AddVendorModal({onClose,onSave}){
  const [form,setForm]=useState({name:"",contact:"",phone:"",email:"",city:"Lahore",type:"Manufacturer",creditLimit:500000,paymentTerms:"Net 30",ntn:""});
  const update=(k,v)=>setForm(p=>({...p,[k]:v}));
  const inputStyle={width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"8px 10px",color:C.text,fontSize:"12px",outline:"none",fontFamily:"inherit"};
  const handleSave=()=>{
    const id=`v${Date.now()}`;
    const code=`VND-${String(Math.floor(Math.random()*900)+100)}`;
    onSave({...form,id,code,status:"active",balance:0,rating:3,totalPurchases:0,lastOrder:"—"});
  };
  const F=({l,children,span})=>(
    <div style={{gridColumn:span?"1/-1":"auto"}}>
      <label style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:"4px"}}>{l}</label>
      {children}
    </div>
  );
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",width:"540px",overflow:"hidden",display:"flex",flexDirection:"column",animation:"slideIn .2s ease"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.panel}}>
          <div><div style={{fontWeight:"900",fontSize:"15px",color:C.text}}>Add New Vendor</div><div style={{fontSize:"10px",color:C.muted}}>Register a new supplier in the system</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px"}}>✕</button>
        </div>
        <div style={{padding:"20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
          <F l="Company Name" span><input value={form.name} onChange={e=>update("name",e.target.value)} placeholder="Vendor company name" style={inputStyle}/></F>
          <F l="Contact Person"><input value={form.contact} onChange={e=>update("contact",e.target.value)} placeholder="Main contact" style={inputStyle}/></F>
          <F l="Phone"><input value={form.phone} onChange={e=>update("phone",e.target.value)} placeholder="0XX-XXXXXXX" style={inputStyle}/></F>
          <F l="Email"><input value={form.email} onChange={e=>update("email",e.target.value)} placeholder="vendor@company.pk" style={inputStyle}/></F>
          <F l="City">
            <select value={form.city} onChange={e=>update("city",e.target.value)} style={inputStyle}>
              {["Lahore","Karachi","Islamabad","Faisalabad","Multan","Peshawar","Sialkot"].map(c=><option key={c}>{c}</option>)}
            </select>
          </F>
          <F l="Vendor Type">
            <select value={form.type} onChange={e=>update("type",e.target.value)} style={inputStyle}>
              {["Manufacturer","Brand","Mill","Distributor","Importer"].map(t=><option key={t}>{t}</option>)}
            </select>
          </F>
          <F l="NTN Number"><input value={form.ntn} onChange={e=>update("ntn",e.target.value)} placeholder="XXXXXXX-X" style={inputStyle}/></F>
          <F l="Payment Terms">
            <select value={form.paymentTerms} onChange={e=>update("paymentTerms",e.target.value)} style={inputStyle}>
              {["Net 15","Net 30","Net 45","Net 60","Cash on Delivery","Advance"].map(t=><option key={t}>{t}</option>)}
            </select>
          </F>
          <F l="Credit Limit (PKR)" span>
            <input type="number" value={form.creditLimit} onChange={e=>update("creditLimit",+e.target.value)} style={inputStyle}/>
          </F>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:"8px"}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:"8px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontWeight:"600",fontSize:"12px"}}>Cancel</button>
          <Btn color={C.green} onClick={handleSave} disabled={!form.name||!form.contact}>✓ Add Vendor</Btn>
        </div>
      </div>
    </div>
  );
}

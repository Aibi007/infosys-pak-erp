import { useState, useRef, useEffect } from "react";

// ================================================================
// INFOSYS PAK ERP — PART 3: INVENTORY MANAGEMENT
// Features: Multi-dim variants, Warehouses, Barcode, Stock Movement
// ================================================================

// ── MOCK DATA ────────────────────────────────────────────────────
const WAREHOUSES = [
  { id:"wh1", name:"Lahore Main Store",    city:"Lahore",    manager:"Asif Mehmood",  active:true },
  { id:"wh2", name:"Karachi Warehouse",    city:"Karachi",   manager:"Tariq Hassan",  active:true },
  { id:"wh3", name:"Islamabad Outlet",     city:"Islamabad", manager:"Sana Butt",     active:true },
  { id:"wh4", name:"Faisalabad Storage",   city:"Faisalabad",manager:"Kamran Ali",    active:false },
];

const CATEGORIES = ["All","Fabric","Ready-to-Wear","Knitwear","Accessories","Home Textile","Footwear"];
const VENDORS    = ["Gul Ahmed Textiles","Khaadi","Sapphire Textile","Bonanza","Alkaram Studio","Nishat Linen","Limelight"];
const SEASONS    = ["Summer 2024","Winter 2024","Spring 2025","Eid Collection","All Season"];
const FABRICS    = ["Lawn","Linen","Cotton","Silk","Chiffon","Khaddar","Velvet","Jersey","Khaadi"];
const SIZES      = ["XS","S","M","L","XL","XXL","XXXL","Free Size"];
const COLORS     = ["White","Black","Navy","Sky Blue","Peach","Maroon","Green","Gold","Multi","Brown","Coral","Teal","Purple","Mustard","Off-White"];

const genBarcode = () => `690${Math.floor(Math.random()*10000000000).toString().padStart(10,"0")}`;
const genSKU     = (cat,id) => `${cat.slice(0,2).toUpperCase()}-${String(id).padStart(4,"0")}`;

const INIT_PRODUCTS = [
  { id:"p001", sku:"FA-0001", name:"Gul Ahmed Summer Lawn 3pc", category:"Fabric",        vendor:"Gul Ahmed Textiles", season:"Summer 2024", fabric:"Lawn",    uom:"Set",  salePrice:3999, purchasePrice:2600, tax:0,  reorderLevel:20, barcode:genBarcode(), active:true,
    variants:[
      { id:"v001a", color:"Multi",   size:"S",  fabric:"Lawn", season:"Summer 2024", stock:{ wh1:45, wh2:22, wh3:10, wh4:0 }, barcode:genBarcode() },
      { id:"v001b", color:"Multi",   size:"M",  fabric:"Lawn", season:"Summer 2024", stock:{ wh1:38, wh2:18, wh3:12, wh4:0 }, barcode:genBarcode() },
      { id:"v001c", color:"Multi",   size:"L",  fabric:"Lawn", season:"Summer 2024", stock:{ wh1:27, wh2:14, wh3:8,  wh4:0 }, barcode:genBarcode() },
      { id:"v001d", color:"Peach",   size:"M",  fabric:"Lawn", season:"Summer 2024", stock:{ wh1:19, wh2:0,  wh3:5,  wh4:0 }, barcode:genBarcode() },
      { id:"v001e", color:"Maroon",  size:"L",  fabric:"Lawn", season:"Summer 2024", stock:{ wh1:8,  wh2:3,  wh3:0,  wh4:0 }, barcode:genBarcode() },
    ]
  },
  { id:"p002", sku:"RW-0002", name:"Khaadi Embroidered Kurta", category:"Ready-to-Wear",  vendor:"Khaadi",             season:"All Season",  fabric:"Khaadi",  uom:"Piece", salePrice:2999, purchasePrice:1900, tax:0,  reorderLevel:15, barcode:genBarcode(), active:true,
    variants:[
      { id:"v002a", color:"Navy",    size:"S",  fabric:"Khaadi", season:"All Season", stock:{ wh1:30, wh2:12, wh3:8,  wh4:0 }, barcode:genBarcode() },
      { id:"v002b", color:"Navy",    size:"M",  fabric:"Khaadi", season:"All Season", stock:{ wh1:25, wh2:15, wh3:10, wh4:0 }, barcode:genBarcode() },
      { id:"v002c", color:"Navy",    size:"L",  fabric:"Khaadi", season:"All Season", stock:{ wh1:18, wh2:9,  wh3:6,  wh4:0 }, barcode:genBarcode() },
      { id:"v002d", color:"Teal",    size:"M",  fabric:"Khaadi", season:"All Season", stock:{ wh1:12, wh2:5,  wh3:3,  wh4:0 }, barcode:genBarcode() },
      { id:"v002e", color:"Mustard", size:"XL", fabric:"Khaadi", season:"All Season", stock:{ wh1:7,  wh2:2,  wh3:0,  wh4:0 }, barcode:genBarcode() },
    ]
  },
  { id:"p003", sku:"FA-0003", name:"Sapphire Cotton Fabric",    category:"Fabric",        vendor:"Sapphire Textile",   season:"All Season",  fabric:"Cotton",  uom:"Meter", salePrice:850,  purchasePrice:550,  tax:0,  reorderLevel:50, barcode:genBarcode(), active:true,
    variants:[
      { id:"v003a", color:"Sky Blue", size:"Free Size", fabric:"Cotton", season:"All Season", stock:{ wh1:120, wh2:80, wh3:40, wh4:0 }, barcode:genBarcode() },
      { id:"v003b", color:"White",    size:"Free Size", fabric:"Cotton", season:"All Season", stock:{ wh1:95,  wh2:60, wh3:30, wh4:0 }, barcode:genBarcode() },
      { id:"v003c", color:"Maroon",   size:"Free Size", fabric:"Cotton", season:"All Season", stock:{ wh1:42,  wh2:25, wh3:12, wh4:0 }, barcode:genBarcode() },
    ]
  },
  { id:"p004", sku:"KN-0004", name:"Bonanza Satrangi Sweater",  category:"Knitwear",      vendor:"Bonanza",            season:"Winter 2024", fabric:"Jersey",  uom:"Piece", salePrice:2799, purchasePrice:1750, tax:0,  reorderLevel:10, barcode:genBarcode(), active:true,
    variants:[
      { id:"v004a", color:"Brown",   size:"M",  fabric:"Jersey", season:"Winter 2024", stock:{ wh1:14, wh2:0,  wh3:4,  wh4:0 }, barcode:genBarcode() },
      { id:"v004b", color:"Brown",   size:"L",  fabric:"Jersey", season:"Winter 2024", stock:{ wh1:9,  wh2:0,  wh3:2,  wh4:0 }, barcode:genBarcode() },
      { id:"v004c", color:"Navy",    size:"XL", fabric:"Jersey", season:"Winter 2024", stock:{ wh1:5,  wh2:0,  wh3:1,  wh4:0 }, barcode:genBarcode() },
    ]
  },
  { id:"p005", sku:"RW-0005", name:"Alkaram Studio 2pc Set",    category:"Ready-to-Wear",  vendor:"Alkaram Studio",    season:"Summer 2024", fabric:"Lawn",    uom:"Set",   salePrice:3499, purchasePrice:2200, tax:0,  reorderLevel:12, barcode:genBarcode(), active:true,
    variants:[
      { id:"v005a", color:"Peach",   size:"S",  fabric:"Lawn", season:"Summer 2024", stock:{ wh1:22, wh2:10, wh3:5,  wh4:0 }, barcode:genBarcode() },
      { id:"v005b", color:"Peach",   size:"M",  fabric:"Lawn", season:"Summer 2024", stock:{ wh1:18, wh2:8,  wh3:4,  wh4:0 }, barcode:genBarcode() },
      { id:"v005c", color:"Coral",   size:"M",  fabric:"Lawn", season:"Summer 2024", stock:{ wh1:6,  wh2:0,  wh3:2,  wh4:0 }, barcode:genBarcode() },
    ]
  },
  { id:"p006", sku:"HT-0006", name:"Nishat Linen Bedsheet Set", category:"Home Textile",  vendor:"Nishat Linen",       season:"All Season",  fabric:"Linen",   uom:"Set",   salePrice:5499, purchasePrice:3500, tax:0,  reorderLevel:8,  barcode:genBarcode(), active:true,
    variants:[
      { id:"v006a", color:"White",   size:"Free Size", fabric:"Linen", season:"All Season", stock:{ wh1:30, wh2:15, wh3:10, wh4:0 }, barcode:genBarcode() },
      { id:"v006b", color:"Off-White",size:"Free Size",fabric:"Linen", season:"All Season", stock:{ wh1:4,  wh2:2,  wh3:0,  wh4:0 }, barcode:genBarcode() },
    ]
  },
  { id:"p007", sku:"AC-0007", name:"Khaadi Silk Hijab Dupatta",  category:"Accessories",  vendor:"Khaadi",             season:"All Season",  fabric:"Silk",    uom:"Piece", salePrice:899,  purchasePrice:500,  tax:0,  reorderLevel:30, barcode:genBarcode(), active:true,
    variants:[
      { id:"v007a", color:"Multi",   size:"Free Size", fabric:"Silk", season:"All Season", stock:{ wh1:180, wh2:90, wh3:50, wh4:0 }, barcode:genBarcode() },
      { id:"v007b", color:"Black",   size:"Free Size", fabric:"Silk", season:"All Season", stock:{ wh1:120, wh2:60, wh3:35, wh4:0 }, barcode:genBarcode() },
    ]
  },
  { id:"p008", sku:"RW-0008", name:"Limelight Eid Lawn Suit",   category:"Ready-to-Wear", vendor:"Limelight",          season:"Eid Collection",fabric:"Lawn",   uom:"Set",   salePrice:4299, purchasePrice:2800, tax:0,  reorderLevel:10, barcode:genBarcode(), active:false,
    variants:[
      { id:"v008a", color:"Gold",    size:"M",  fabric:"Lawn", season:"Eid Collection", stock:{ wh1:3,  wh2:0,  wh3:0,  wh4:0 }, barcode:genBarcode() },
      { id:"v008b", color:"Purple",  size:"L",  fabric:"Lawn", season:"Eid Collection", stock:{ wh1:2,  wh2:0,  wh3:1,  wh4:0 }, barcode:genBarcode() },
    ]
  },
];

const STOCK_MOVEMENTS = [
  { id:"sm001", date:"2024-03-02 10:14", type:"Sale",          product:"Gul Ahmed Summer Lawn 3pc", variant:"Multi / M", qty:-2,  warehouse:"Lahore Main Store",  ref:"INV-2024-08741", by:"Admin" },
  { id:"sm002", date:"2024-03-02 09:45", type:"Purchase",      product:"Khaadi Embroidered Kurta",  variant:"Navy / L",  qty:+30, warehouse:"Lahore Main Store",  ref:"PO-2024-03221",  by:"Admin" },
  { id:"sm003", date:"2024-03-01 16:22", type:"Transfer",      product:"Sapphire Cotton Fabric",    variant:"White",     qty:-20, warehouse:"Lahore Main Store",  ref:"TRF-0041",       by:"Asif M." },
  { id:"sm004", date:"2024-03-01 16:22", type:"Transfer",      product:"Sapphire Cotton Fabric",    variant:"White",     qty:+20, warehouse:"Karachi Warehouse",  ref:"TRF-0041",       by:"Asif M." },
  { id:"sm005", date:"2024-03-01 11:05", type:"Sale",          product:"Bonanza Satrangi Sweater",  variant:"Brown / L", qty:-3,  warehouse:"Lahore Main Store",  ref:"INV-2024-08739", by:"Cashier1" },
  { id:"sm006", date:"2024-02-29 14:30", type:"Adjustment",    product:"Alkaram Studio 2pc Set",    variant:"Coral / M", qty:-2,  warehouse:"Lahore Main Store",  ref:"ADJ-0012",       by:"Admin" },
  { id:"sm007", date:"2024-02-28 09:00", type:"Purchase",      product:"Nishat Linen Bedsheet Set", variant:"White",     qty:+50, warehouse:"Lahore Main Store",  ref:"PO-2024-03200",  by:"Admin" },
  { id:"sm008", date:"2024-02-27 15:40", type:"Return",        product:"Khaadi Silk Hijab",         variant:"Multi",     qty:+5,  warehouse:"Lahore Main Store",  ref:"RTN-0008",       by:"Cashier2" },
];

// ── HELPERS ───────────────────────────────────────────────────────
const fmt  = n => new Intl.NumberFormat("en-PK").format(n);
const totalStock = p => p.variants.reduce((s,v) => s + Object.values(v.stock).reduce((a,b)=>a+b,0), 0);
const warehouseStock = (p, whId) => p.variants.reduce((s,v) => s + (v.stock[whId]||0), 0);
const isLowStock = p => totalStock(p) <= p.reorderLevel;
const isOutOfStock = p => totalStock(p) === 0;

// ── COLORS ────────────────────────────────────────────────────────
const C = {
  bg:"#080c13", panel:"#0d1320", card:"#111827", card2:"#0f1724",
  border:"#1c2a3a", border2:"#243040",
  text:"#e8edf3", muted:"#5a7080", muted2:"#3d5060",
  accent:"#f97316", blue:"#3b82f6", green:"#10b981",
  red:"#ef4444", yellow:"#f59e0b", purple:"#8b5cf6",
  teal:"#06b6d4", pink:"#ec4899", lime:"#84cc16",
  input:"#0b1520", header:"#060a10",
};

const pill = (txt, color, small=false) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:"3px", fontSize:small?"9px":"10px", fontWeight:"700", padding:small?"1px 6px":"2px 8px", borderRadius:"20px", background:`${color}1a`, color, border:`1px solid ${color}33`, whiteSpace:"nowrap" }}>
    {txt}
  </span>
);

const Tag = ({ label, color }) => (
  <span style={{ fontSize:"9px", fontWeight:"600", padding:"1px 6px", borderRadius:"4px", background:`${color}18`, color, border:`1px solid ${color}30` }}>{label}</span>
);

// ── BARCODE SVG COMPONENT ─────────────────────────────────────────
function BarcodeDisplay({ value, width=200, height=50 }) {
  const bars = [];
  let x = 5;
  const seed = value.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  const rng = (i) => ((seed * 1103515245 + 12345 * (i+1)) >>> 0) % 100;
  for (let i = 0; i < 60; i++) {
    const w = rng(i) > 50 ? 2 : 1;
    if (rng(i*7+3) > 30) { bars.push({ x, w }); }
    x += w + 1;
    if (x > width-5) break;
  }
  // Always add guard bars
  const guards = [{x:5,w:1},{x:7,w:1},{x:9,w:1},{x:width-10,w:1},{x:width-8,w:1},{x:width-6,w:1}];
  return (
    <svg width={width} height={height} style={{ display:"block" }}>
      <rect width={width} height={height} fill="#fff" rx="3"/>
      {guards.map((b,i) => <rect key={`g${i}`} x={b.x} y={4} width={b.w} height={height-10} fill="#1a202c"/>)}
      {bars.map((b,i) => <rect key={i} x={b.x} y={4} width={b.w} height={height-16} fill="#1a202c"/>)}
      <text x={width/2} y={height-3} textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#374151">{value}</text>
    </svg>
  );
}

// ── STOCK LEVEL BAR ───────────────────────────────────────────────
function StockBar({ current, reorder, max }) {
  const pct = Math.min(100, (current / (max||100)) * 100);
  const color = current === 0 ? C.red : current <= reorder ? C.yellow : C.green;
  return (
    <div style={{ width:"100%", height:"5px", background:C.border, borderRadius:"3px", overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:"3px", transition:"width 0.3s" }}/>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────
export default function InventoryModule() {
  const [tab, setTab] = useState("products");             // products | movements | warehouses | adjustments
  const [products, setProducts] = useState(INIT_PRODUCTS);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [vendorFilter, setVendorFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All"); // All | Low | Out | Active | Inactive
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showTransfer, setShowTransfer] = useState(null);
  const [showAdjust, setShowAdjust] = useState(null);
  const [showBarcode, setShowBarcode] = useState(null);
  const [movements, setMovements] = useState(STOCK_MOVEMENTS);
  const [movType, setMovType] = useState("All");
  const [notification, setNotification] = useState(null);
  const [activeWH, setActiveWH] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // grid | table

  // New product form
  const [form, setForm] = useState({ name:"", category:"Fabric", vendor:VENDORS[0], fabric:"Lawn", season:"Summer 2024", uom:"Piece", salePrice:"", purchasePrice:"", reorderLevel:"10", sizes:["M","L"], colors:["Multi"], active:true });

  const notify = (msg, type="success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filtered = products.filter(p => {
    if (catFilter !== "All" && p.category !== catFilter) return false;
    if (vendorFilter !== "All" && p.vendor !== vendorFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.includes(search.toUpperCase())) return false;
    if (statusFilter === "Low") return isLowStock(p) && !isOutOfStock(p);
    if (statusFilter === "Out") return isOutOfStock(p);
    if (statusFilter === "Active") return p.active;
    if (statusFilter === "Inactive") return !p.active;
    return true;
  });

  // Summary stats
  const totalProducts  = products.length;
  const totalVariants  = products.reduce((s,p)=>s+p.variants.length,0);
  const totalItems     = products.reduce((s,p)=>s+totalStock(p),0);
  const totalValue     = products.reduce((s,p)=>s+totalStock(p)*p.purchasePrice,0);
  const lowStockCount  = products.filter(p=>isLowStock(p)&&!isOutOfStock(p)).length;
  const outStockCount  = products.filter(p=>isOutOfStock(p)).length;

  const handleAddProduct = () => {
    const id = `p${String(products.length+1).padStart(3,"0")}`;
    const sku = genSKU(form.category, products.length+1);
    const variants = [];
    form.sizes.forEach(size => {
      form.colors.forEach(color => {
        variants.push({
          id:`${id}_${color}_${size}`.replace(/\s/g,"_"),
          color, size, fabric:form.fabric, season:form.season,
          stock:{ wh1:0, wh2:0, wh3:0, wh4:0 },
          barcode: genBarcode()
        });
      });
    });
    const newP = { id, sku, name:form.name, category:form.category, vendor:form.vendor,
      season:form.season, fabric:form.fabric, uom:form.uom,
      salePrice:parseFloat(form.salePrice)||0, purchasePrice:parseFloat(form.purchasePrice)||0,
      tax:0, reorderLevel:parseInt(form.reorderLevel)||10,
      barcode:genBarcode(), active:form.active, variants };
    setProducts(prev=>[...prev,newP]);
    setShowAddProduct(false);
    setForm({ name:"", category:"Fabric", vendor:VENDORS[0], fabric:"Lawn", season:"Summer 2024", uom:"Piece", salePrice:"", purchasePrice:"", reorderLevel:"10", sizes:["M","L"], colors:["Multi"], active:true });
    notify(`Product "${form.name}" added with ${variants.length} variants`);
  };

  const handleTransfer = (data) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== data.productId) return p;
      return { ...p, variants: p.variants.map(v => {
        if (v.id !== data.variantId) return v;
        const newStock = { ...v.stock };
        newStock[data.from] = Math.max(0, (newStock[data.from]||0) - data.qty);
        newStock[data.to]   = (newStock[data.to]||0) + data.qty;
        return { ...v, stock: newStock };
      })};
    }));
    const newMov = {
      id:`sm${movements.length+1}`, date:new Date().toISOString().slice(0,16).replace("T"," "),
      type:"Transfer", product:data.productName, variant:data.variantLabel,
      qty:data.qty, warehouse:WAREHOUSES.find(w=>w.id===data.to)?.name,
      ref:`TRF-${String(movements.length+100).padStart(4,"0")}`, by:"Admin"
    };
    setMovements(prev=>[newMov,...prev]);
    setShowTransfer(null);
    notify(`Transferred ${data.qty} units to ${WAREHOUSES.find(w=>w.id===data.to)?.name}`);
  };

  const handleAdjust = (data) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== data.productId) return p;
      return { ...p, variants: p.variants.map(v => {
        if (v.id !== data.variantId) return v;
        const newStock = { ...v.stock };
        newStock[data.warehouse] = Math.max(0, (newStock[data.warehouse]||0) + data.delta);
        return { ...v, stock: newStock };
      })};
    }));
    const newMov = {
      id:`sm${movements.length+1}`, date:new Date().toISOString().slice(0,16).replace("T"," "),
      type:"Adjustment", product:data.productName, variant:data.variantLabel,
      qty:data.delta, warehouse:WAREHOUSES.find(w=>w.id===data.warehouse)?.name,
      ref:`ADJ-${String(movements.length+100).padStart(4,"0")}`, by:"Admin"
    };
    setMovements(prev=>[newMov,...prev]);
    setShowAdjust(null);
    notify(`Stock adjusted: ${data.delta > 0 ? "+" : ""}${data.delta} units`);
  };

  const movTypeColor = (t) => t==="Sale"?C.red:t==="Purchase"?C.green:t==="Transfer"?C.blue:t==="Return"?C.purple:C.yellow;

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif", fontSize:"13px", overflow:"hidden", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-thumb{background:#1c2a3a;border-radius:4px}
        input,select,textarea,button{font-family:inherit}
        @keyframes slideIn{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background:C.header, borderBottom:`1px solid ${C.border}`, padding:"0 20px", height:"56px", display:"flex", alignItems:"center", gap:"14px", flexShrink:0 }}>
        <div style={{ width:"32px", height:"32px", borderRadius:"7px", background:"linear-gradient(135deg,#f97316,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"900", fontSize:"12px", color:"#fff" }}>IP</div>
        <div>
          <div style={{ fontWeight:"800", fontSize:"15px", color:"#fff" }}>Inventory Management</div>
          <div style={{ fontSize:"9px", color:C.muted }}>Multi-Warehouse · Multi-Dimensional Variants · Real-time Tracking</div>
        </div>

        {/* Module Tabs */}
        <div style={{ marginLeft:"24px", display:"flex", gap:"2px" }}>
          {[
            { k:"products",   l:"📦 Products" },
            { k:"movements",  l:"🔄 Stock Movement" },
            { k:"warehouses", l:"🏭 Warehouses" },
          ].map(t => (
            <button key={t.k} onClick={()=>setTab(t.k)} style={{ padding:"6px 14px", borderRadius:"6px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"700",
              background: tab===t.k?C.accent:"transparent", color: tab===t.k?"#fff":C.muted, transition:"all 0.15s" }}>
              {t.l}
            </button>
          ))}
        </div>

        <div style={{ marginLeft:"auto", display:"flex", gap:"8px", alignItems:"center" }}>
          <button onClick={()=>setShowAddProduct(true)} style={{ padding:"7px 14px", borderRadius:"7px", border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", cursor:"pointer", fontSize:"11px", fontWeight:"700" }}>
            + Add Product
          </button>
          <button style={{ padding:"7px 12px", borderRadius:"7px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontSize:"11px" }}>
            📥 Import CSV
          </button>
          <button style={{ padding:"7px 12px", borderRadius:"7px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontSize:"11px" }}>
            📤 Export
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ background:C.panel, borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", gap:"12px", flexShrink:0, overflowX:"auto" }}>
        {[
          { l:"Total Products",  v:totalProducts,           ic:"📦", col:C.blue,   sub:`${totalVariants} variants` },
          { l:"Total Stock",     v:fmt(totalItems),         ic:"🗃", col:C.teal,   sub:"units across all WH" },
          { l:"Inventory Value", v:`PKR ${fmt(totalValue)}`,ic:"💰", col:C.green,  sub:"at purchase cost" },
          { l:"Low Stock",       v:lowStockCount,           ic:"⚠️", col:C.yellow, sub:"need reorder" },
          { l:"Out of Stock",    v:outStockCount,           ic:"🚫", col:C.red,    sub:"zero units" },
          { l:"Warehouses",      v:WAREHOUSES.filter(w=>w.active).length, ic:"🏭", col:C.purple, sub:"active locations" },
        ].map(s => (
          <div key={s.l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"9px", padding:"12px 16px", minWidth:"170px", flex:1, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, right:0, width:"40px", height:"40px", borderRadius:"0 9px 0 40px", background:`${s.col}15` }}/>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:"9px", color:C.muted, fontWeight:"600", marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.l}</div>
                <div style={{ fontSize:"19px", fontWeight:"900", color:C.text, letterSpacing:"-0.02em" }}>{s.v}</div>
                <div style={{ fontSize:"9px", color:C.muted, marginTop:"2px" }}>{s.sub}</div>
              </div>
              <span style={{ fontSize:"18px" }}>{s.ic}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── PRODUCTS TAB ── */}
      {tab === "products" && (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          {/* Filter Sidebar */}
          <div style={{ width:"220px", background:C.panel, borderRight:`1px solid ${C.border}`, padding:"14px", display:"flex", flexDirection:"column", gap:"16px", overflowY:"auto", flexShrink:0 }}>
            <div>
              <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"8px" }}>Search</div>
              <div style={{ display:"flex", alignItems:"center", gap:"6px", background:C.input, borderRadius:"7px", padding:"0 9px", border:`1px solid ${C.border}` }}>
                <span style={{ color:C.muted, fontSize:"12px" }}>🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or SKU..."
                  style={{ background:"none", border:"none", outline:"none", color:C.text, fontSize:"11px", flex:1, padding:"7px 0" }}/>
              </div>
            </div>

            <div>
              <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"8px" }}>Category</div>
              {CATEGORIES.map(cat => (
                <div key={cat} onClick={()=>setCatFilter(cat)} style={{ padding:"6px 10px", borderRadius:"6px", cursor:"pointer", fontSize:"12px",
                  background: catFilter===cat?`${C.accent}20`:"transparent",
                  color: catFilter===cat?C.accent:C.muted,
                  borderLeft:`2px solid ${catFilter===cat?C.accent:"transparent"}`,
                  marginBottom:"1px" }}>
                  {cat}
                  <span style={{ float:"right", fontSize:"10px", color:C.muted2 }}>
                    {cat==="All" ? products.length : products.filter(p=>p.category===cat).length}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"8px" }}>Status</div>
              {[
                { k:"All", l:"All Products", col:C.text },
                { k:"Active", l:"Active", col:C.green },
                { k:"Low", l:"Low Stock", col:C.yellow },
                { k:"Out", l:"Out of Stock", col:C.red },
                { k:"Inactive", l:"Inactive", col:C.muted },
              ].map(s => (
                <div key={s.k} onClick={()=>setStatusFilter(s.k)} style={{ padding:"6px 10px", borderRadius:"6px", cursor:"pointer", fontSize:"12px",
                  background: statusFilter===s.k?`${s.col}15`:"transparent",
                  color: statusFilter===s.k?s.col:C.muted,
                  borderLeft:`2px solid ${statusFilter===s.k?s.col:"transparent"}`,
                  marginBottom:"1px" }}>
                  {s.l}
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"8px" }}>Vendor</div>
              <select value={vendorFilter} onChange={e=>setVendorFilter(e.target.value)}
                style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"7px", color:C.text, fontSize:"11px", outline:"none" }}>
                <option value="All">All Vendors</option>
                {VENDORS.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"8px" }}>Warehouse View</div>
              <select value={activeWH} onChange={e=>setActiveWH(e.target.value)}
                style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"7px", color:C.text, fontSize:"11px", outline:"none" }}>
                <option value="all">All Warehouses</option>
                {WAREHOUSES.filter(w=>w.active).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"8px" }}>View</div>
              <div style={{ display:"flex", gap:"4px" }}>
                <button onClick={()=>setViewMode("grid")} style={{ flex:1, padding:"6px", borderRadius:"5px", border:`1px solid ${viewMode==="grid"?C.accent:C.border}`, background:viewMode==="grid"?`${C.accent}18`:"transparent", color:viewMode==="grid"?C.accent:C.muted, cursor:"pointer", fontSize:"12px" }}>⊞ Grid</button>
                <button onClick={()=>setViewMode("table")} style={{ flex:1, padding:"6px", borderRadius:"5px", border:`1px solid ${viewMode==="table"?C.accent:C.border}`, background:viewMode==="table"?`${C.accent}18`:"transparent", color:viewMode==="table"?C.accent:C.muted, cursor:"pointer", fontSize:"12px" }}>≡ Table</button>
              </div>
            </div>
          </div>

          {/* Product List */}
          <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:"10px", flexShrink:0, background:C.panel }}>
              <span style={{ fontSize:"12px", color:C.muted }}>{filtered.length} products</span>
              {lowStockCount > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:"5px", padding:"3px 10px", borderRadius:"20px", background:`${C.yellow}15`, border:`1px solid ${C.yellow}33` }}>
                  <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:C.yellow, animation:"pulse2 2s infinite" }}/>
                  <span style={{ fontSize:"10px", color:C.yellow, fontWeight:"700" }}>{lowStockCount} items need reorder</span>
                </div>
              )}
              {outStockCount > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:"5px", padding:"3px 10px", borderRadius:"20px", background:`${C.red}15`, border:`1px solid ${C.red}33` }}>
                  <span style={{ fontSize:"10px", color:C.red, fontWeight:"700" }}>🚫 {outStockCount} out of stock</span>
                </div>
              )}
            </div>

            <div style={{ flex:1, overflowY:"auto", padding:"14px" }}>
              {viewMode === "grid" ? (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"12px" }}>
                  {filtered.map(p => {
                    const total = activeWH==="all" ? totalStock(p) : warehouseStock(p, activeWH);
                    const low = total <= p.reorderLevel;
                    const out = total === 0;
                    const statusCol = out ? C.red : low ? C.yellow : C.green;
                    return (
                      <div key={p.id} style={{ background:C.card, border:`1px solid ${out?C.red+"44":low?C.yellow+"44":C.border}`, borderRadius:"11px", overflow:"hidden", cursor:"pointer", transition:"all 0.15s" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent+"88";e.currentTarget.style.transform="translateY(-1px)"}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=out?C.red+"44":low?C.yellow+"44":C.border;e.currentTarget.style.transform="none"}}
                        onClick={()=>setSelectedProduct(selectedProduct?.id===p.id?null:p)}>
                        {/* Card Header */}
                        <div style={{ padding:"12px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:"10px" }}>
                          <div style={{ width:"36px", height:"36px", borderRadius:"8px", background:`${C.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", flexShrink:0 }}>
                            {p.category==="Fabric"?"🧵":p.category==="Ready-to-Wear"?"👗":p.category==="Knitwear"?"🧥":p.category==="Home Textile"?"🛏":"👜"}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:"12px", fontWeight:"700", color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                            <div style={{ display:"flex", gap:"5px", marginTop:"3px", flexWrap:"wrap" }}>
                              <Tag label={p.sku} color={C.blue}/>
                              <Tag label={p.category} color={C.teal}/>
                              {!p.active && <Tag label="Inactive" color={C.red}/>}
                            </div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontSize:"14px", fontWeight:"800", color:C.accent }}>PKR {fmt(p.salePrice)}</div>
                            <div style={{ fontSize:"9px", color:C.muted }}>cost: {fmt(p.purchasePrice)}</div>
                          </div>
                        </div>

                        {/* Stock Info */}
                        <div style={{ padding:"10px 14px" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px", alignItems:"center" }}>
                            <span style={{ fontSize:"10px", color:C.muted }}>
                              {activeWH==="all" ? "Total Stock" : WAREHOUSES.find(w=>w.id===activeWH)?.name}
                            </span>
                            <div style={{ display:"flex", gap:"5px", alignItems:"center" }}>
                              <span style={{ fontSize:"16px", fontWeight:"900", color:statusCol }}>{fmt(total)}</span>
                              <span style={{ fontSize:"10px", color:C.muted }}>{p.uom}</span>
                              {out ? pill("Out",C.red,true) : low ? pill("Low",C.yellow,true) : pill("OK",C.green,true)}
                            </div>
                          </div>
                          <StockBar current={total} reorder={p.reorderLevel} max={total + p.reorderLevel * 3}/>
                          <div style={{ display:"flex", justifyContent:"space-between", marginTop:"4px" }}>
                            <span style={{ fontSize:"9px", color:C.muted }}>Reorder at: {p.reorderLevel}</span>
                            <span style={{ fontSize:"9px", color:C.muted }}>{p.variants.length} variants · {p.season}</span>
                          </div>
                        </div>

                        {/* Warehouse Breakdown */}
                        {activeWH === "all" && (
                          <div style={{ padding:"0 14px 10px", display:"flex", gap:"4px" }}>
                            {WAREHOUSES.filter(w=>w.active).map(wh => {
                              const qty = warehouseStock(p, wh.id);
                              return (
                                <div key={wh.id} style={{ flex:1, background:C.card2, borderRadius:"5px", padding:"5px 6px", textAlign:"center" }}>
                                  <div style={{ fontSize:"9px", color:C.muted, marginBottom:"2px" }}>{wh.city.slice(0,3)}</div>
                                  <div style={{ fontSize:"11px", fontWeight:"700", color:qty===0?C.red:qty<=5?C.yellow:C.text }}>{fmt(qty)}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ padding:"8px 14px 12px", display:"flex", gap:"5px" }} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>setShowTransfer({ product:p })} style={{ flex:1, padding:"6px", borderRadius:"6px", border:`1px solid ${C.border}`, background:"transparent", color:C.blue, cursor:"pointer", fontSize:"10px", fontWeight:"600" }}>↔ Transfer</button>
                          <button onClick={()=>setShowAdjust({ product:p })} style={{ flex:1, padding:"6px", borderRadius:"6px", border:`1px solid ${C.border}`, background:"transparent", color:C.yellow, cursor:"pointer", fontSize:"10px", fontWeight:"600" }}>✎ Adjust</button>
                          <button onClick={()=>setShowBarcode(p)} style={{ flex:1, padding:"6px", borderRadius:"6px", border:`1px solid ${C.border}`, background:"transparent", color:C.teal, cursor:"pointer", fontSize:"10px", fontWeight:"600" }}>▦ Barcode</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* TABLE VIEW */
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      {["SKU","Product","Category","Vendor","Variants","Stock","Reorder","Sale Price","Cost","Status","Actions"].map(h => (
                        <th key={h} style={{ textAlign:"left", padding:"8px 10px", fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:`1px solid ${C.border}`, background:C.panel, whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const total = totalStock(p);
                      const out = total === 0;
                      const low = !out && total <= p.reorderLevel;
                      return (
                        <tr key={p.id} style={{ borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}
                          onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                          onClick={()=>setSelectedProduct(selectedProduct?.id===p.id?null:p)}>
                          <td style={{ padding:"10px", fontSize:"10px", color:C.blue, fontFamily:"'IBM Plex Mono'" }}>{p.sku}</td>
                          <td style={{ padding:"10px" }}>
                            <div style={{ fontSize:"11px", fontWeight:"600", color:C.text }}>{p.name}</div>
                            <div style={{ fontSize:"9px", color:C.muted }}>{p.season} · {p.fabric}</div>
                          </td>
                          <td style={{ padding:"10px" }}><Tag label={p.category} color={C.teal}/></td>
                          <td style={{ padding:"10px", fontSize:"10px", color:C.muted }}>{p.vendor}</td>
                          <td style={{ padding:"10px", fontSize:"11px", fontWeight:"700", color:C.text, textAlign:"center" }}>{p.variants.length}</td>
                          <td style={{ padding:"10px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                              <span style={{ fontSize:"13px", fontWeight:"800", color:out?C.red:low?C.yellow:C.green }}>{fmt(total)}</span>
                              <span style={{ fontSize:"9px", color:C.muted }}>{p.uom}</span>
                            </div>
                            <StockBar current={total} reorder={p.reorderLevel} max={total+p.reorderLevel*3}/>
                          </td>
                          <td style={{ padding:"10px", fontSize:"11px", color:C.muted, textAlign:"center" }}>{p.reorderLevel}</td>
                          <td style={{ padding:"10px", fontSize:"11px", fontWeight:"700", color:C.accent }}>PKR {fmt(p.salePrice)}</td>
                          <td style={{ padding:"10px", fontSize:"10px", color:C.muted }}>PKR {fmt(p.purchasePrice)}</td>
                          <td style={{ padding:"10px" }}>
                            {out ? pill("Out",C.red,true) : low ? pill("Low",C.yellow,true) : !p.active ? pill("Inactive",C.muted,true) : pill("Active",C.green,true)}
                          </td>
                          <td style={{ padding:"10px" }} onClick={e=>e.stopPropagation()}>
                            <div style={{ display:"flex", gap:"4px" }}>
                              <button onClick={()=>setShowTransfer({product:p})} style={{ padding:"3px 7px", borderRadius:"4px", border:`1px solid ${C.border}`, background:"transparent", color:C.blue, cursor:"pointer", fontSize:"9px" }}>↔</button>
                              <button onClick={()=>setShowAdjust({product:p})} style={{ padding:"3px 7px", borderRadius:"4px", border:`1px solid ${C.border}`, background:"transparent", color:C.yellow, cursor:"pointer", fontSize:"9px" }}>✎</button>
                              <button onClick={()=>setShowBarcode(p)} style={{ padding:"3px 7px", borderRadius:"4px", border:`1px solid ${C.border}`, background:"transparent", color:C.teal, cursor:"pointer", fontSize:"9px" }}>▦</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Product Detail Panel */}
          {selectedProduct && (
            <div style={{ width:"340px", background:C.panel, borderLeft:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0, animation:"slideIn 0.2s ease" }}>
              <div style={{ padding:"14px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ fontWeight:"800", fontSize:"13px", color:C.text }}>Product Detail</div>
                <button onClick={()=>setSelectedProduct(null)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"16px" }}>✕</button>
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:"14px" }}>
                <div style={{ marginBottom:"14px" }}>
                  <div style={{ fontSize:"15px", fontWeight:"800", color:C.text, marginBottom:"4px" }}>{selectedProduct.name}</div>
                  <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"8px" }}>
                    <Tag label={selectedProduct.sku} color={C.blue}/>
                    <Tag label={selectedProduct.category} color={C.teal}/>
                    <Tag label={selectedProduct.fabric} color={C.purple}/>
                    <Tag label={selectedProduct.season} color={C.yellow}/>
                    <Tag label={selectedProduct.uom} color={C.muted}/>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                    {[
                      { l:"Sale Price", v:`PKR ${fmt(selectedProduct.salePrice)}`, col:C.accent },
                      { l:"Cost Price", v:`PKR ${fmt(selectedProduct.purchasePrice)}`, col:C.muted },
                      { l:"Margin", v:`${(((selectedProduct.salePrice-selectedProduct.purchasePrice)/selectedProduct.salePrice)*100).toFixed(1)}%`, col:C.green },
                      { l:"Reorder At", v:selectedProduct.reorderLevel, col:C.yellow },
                    ].map(s => (
                      <div key={s.l} style={{ background:C.card, borderRadius:"7px", padding:"9px 10px" }}>
                        <div style={{ fontSize:"9px", color:C.muted, marginBottom:"3px" }}>{s.l}</div>
                        <div style={{ fontSize:"14px", fontWeight:"800", color:s.col }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warehouse Stock Breakdown */}
                <div style={{ marginBottom:"14px" }}>
                  <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>Warehouse Stock</div>
                  {WAREHOUSES.filter(w=>w.active).map(wh => {
                    const qty = warehouseStock(selectedProduct, wh.id);
                    return (
                      <div key={wh.id} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"7px 10px", background:C.card, borderRadius:"6px", marginBottom:"5px" }}>
                        <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:qty===0?C.red:C.green, flexShrink:0 }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:"11px", fontWeight:"600", color:C.text }}>{wh.name}</div>
                          <div style={{ fontSize:"9px", color:C.muted }}>{wh.city}</div>
                        </div>
                        <div style={{ fontSize:"16px", fontWeight:"900", color:qty===0?C.red:qty<=5?C.yellow:C.text }}>{fmt(qty)}</div>
                        <span style={{ fontSize:"9px", color:C.muted }}>{selectedProduct.uom}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Variants Table */}
                <div>
                  <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>
                    Variants ({selectedProduct.variants.length})
                  </div>
                  {selectedProduct.variants.map(v => {
                    const qty = Object.values(v.stock).reduce((a,b)=>a+b,0);
                    return (
                      <div key={v.id} style={{ background:C.card, borderRadius:"7px", padding:"9px 11px", marginBottom:"6px", border:`1px solid ${qty===0?C.red+"33":C.border}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"5px" }}>
                          <div style={{ display:"flex", gap:"4px" }}>
                            <Tag label={v.color} color={C.pink}/>
                            <Tag label={v.size} color={C.blue}/>
                          </div>
                          <span style={{ fontSize:"13px", fontWeight:"800", color:qty===0?C.red:C.text }}>{qty}</span>
                        </div>
                        <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
                          {Object.entries(v.stock).map(([whId, qty2]) => {
                            const wh = WAREHOUSES.find(w=>w.id===whId);
                            if (!wh?.active) return null;
                            return (
                              <div key={whId} style={{ fontSize:"9px", padding:"1px 5px", borderRadius:"3px", background:`${qty2>0?C.blue:C.red}15`, color:qty2>0?C.blue:C.red }}>
                                {wh.city.slice(0,3)}: {qty2}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop:"5px", fontSize:"9px", color:C.muted, fontFamily:"'IBM Plex Mono'" }}>{v.barcode}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding:"12px", borderTop:`1px solid ${C.border}`, display:"flex", gap:"6px" }}>
                <button onClick={()=>setShowTransfer({product:selectedProduct})} style={{ flex:1, padding:"8px", borderRadius:"7px", border:`1px solid ${C.blue}44`, background:`${C.blue}12`, color:C.blue, cursor:"pointer", fontSize:"11px", fontWeight:"700" }}>↔ Transfer</button>
                <button onClick={()=>setShowAdjust({product:selectedProduct})} style={{ flex:1, padding:"8px", borderRadius:"7px", border:`1px solid ${C.yellow}44`, background:`${C.yellow}12`, color:C.yellow, cursor:"pointer", fontSize:"11px", fontWeight:"700" }}>✎ Adjust</button>
                <button onClick={()=>setShowBarcode(selectedProduct)} style={{ flex:1, padding:"8px", borderRadius:"7px", border:`1px solid ${C.teal}44`, background:`${C.teal}12`, color:C.teal, cursor:"pointer", fontSize:"11px", fontWeight:"700" }}>▦ Barcode</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MOVEMENTS TAB ── */}
      {tab === "movements" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"10px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:"8px", flexShrink:0, background:C.panel }}>
            {["All","Sale","Purchase","Transfer","Adjustment","Return"].map(t => (
              <button key={t} onClick={()=>setMovType(t)} style={{ padding:"5px 12px", borderRadius:"20px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"700",
                background: movType===t?(t==="All"?C.accent:movTypeColor(t)):"transparent",
                color: movType===t?"#fff":C.muted }}>
                {t}
              </button>
            ))}
            <div style={{ marginLeft:"auto", display:"flex", gap:"6px" }}>
              <input placeholder="Search movements..." style={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"5px 10px", color:C.text, fontSize:"11px", outline:"none", width:"200px" }}/>
              <button style={{ padding:"5px 12px", borderRadius:"7px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontSize:"11px" }}>📅 Date Range</button>
            </div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  {["Date","Type","Product","Variant","Qty","Warehouse","Reference","By"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"8px 12px", fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:`1px solid ${C.border}`, background:C.panel, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.filter(m=>movType==="All"||m.type===movType).map((m,i) => (
                  <tr key={m.id} style={{ borderBottom:`1px solid ${C.border}`, animation:`fadeIn 0.2s ease ${i*0.03}s both` }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"10px 12px", fontSize:"10px", color:C.muted, fontFamily:"'IBM Plex Mono'" }}>{m.date}</td>
                    <td style={{ padding:"10px 12px" }}>
                      <span style={{ fontSize:"10px", fontWeight:"700", padding:"2px 8px", borderRadius:"12px", background:`${movTypeColor(m.type)}18`, color:movTypeColor(m.type) }}>{m.type}</span>
                    </td>
                    <td style={{ padding:"10px 12px", fontSize:"11px", color:C.text, fontWeight:"500" }}>{m.product}</td>
                    <td style={{ padding:"10px 12px", fontSize:"10px", color:C.muted }}>{m.variant}</td>
                    <td style={{ padding:"10px 12px" }}>
                      <span style={{ fontSize:"13px", fontWeight:"800", color:m.qty>0?C.green:C.red, fontFamily:"'IBM Plex Mono'" }}>
                        {m.qty>0?"+":""}{m.qty}
                      </span>
                    </td>
                    <td style={{ padding:"10px 12px", fontSize:"10px", color:C.muted }}>{m.warehouse}</td>
                    <td style={{ padding:"10px 12px", fontSize:"10px", color:C.blue, fontFamily:"'IBM Plex Mono'", cursor:"pointer" }}>{m.ref}</td>
                    <td style={{ padding:"10px 12px", fontSize:"10px", color:C.muted }}>{m.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── WAREHOUSES TAB ── */}
      {tab === "warehouses" && (
        <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:"16px" }}>
            {WAREHOUSES.map(wh => {
              const whProducts = products.map(p => ({ ...p, qty: warehouseStock(p, wh.id) })).filter(p=>p.qty>0);
              const whValue = products.reduce((s,p)=>s+warehouseStock(p,wh.id)*p.purchasePrice,0);
              return (
                <div key={wh.id} style={{ background:C.card, border:`1px solid ${wh.active?C.border:C.red+"33"}`, borderRadius:"12px", overflow:"hidden" }}>
                  <div style={{ padding:"14px 16px", background:`linear-gradient(135deg,${C.panel},${C.card})`, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:"12px" }}>
                    <div style={{ width:"42px", height:"42px", borderRadius:"10px", background:`${wh.active?C.blue:C.red}18`, border:`2px solid ${wh.active?C.blue:C.red}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px" }}>🏭</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"14px", fontWeight:"800", color:C.text }}>{wh.name}</div>
                      <div style={{ fontSize:"10px", color:C.muted }}>{wh.city} · Manager: {wh.manager}</div>
                    </div>
                    {wh.active ? pill("Active",C.green) : pill("Inactive",C.red)}
                  </div>
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"14px" }}>
                      {[
                        { l:"Products",     v:whProducts.length,    col:C.blue },
                        { l:"Total Units",  v:fmt(whProducts.reduce((s,p)=>s+p.qty,0)), col:C.teal },
                        { l:"Stock Value",  v:`PKR ${fmt(whValue)}`, col:C.green },
                        { l:"Low Stock",    v:products.filter(p=>warehouseStock(p,wh.id)<=p.reorderLevel&&warehouseStock(p,wh.id)>0).length, col:C.yellow },
                      ].map(s=>(
                        <div key={s.l} style={{ background:C.card2, borderRadius:"7px", padding:"9px 11px" }}>
                          <div style={{ fontSize:"9px", color:C.muted, marginBottom:"3px" }}>{s.l}</div>
                          <div style={{ fontSize:"15px", fontWeight:"900", color:s.col }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                    {/* Top items */}
                    <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"7px" }}>Top Items</div>
                    {whProducts.sort((a,b)=>b.qty-a.qty).slice(0,4).map(p => (
                      <div key={p.id} style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"5px" }}>
                        <div style={{ flex:1, fontSize:"11px", color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                        <span style={{ fontSize:"11px", fontWeight:"700", color:C.text, fontFamily:"'IBM Plex Mono'" }}>{fmt(p.qty)}</span>
                        <span style={{ fontSize:"9px", color:C.muted }}>{p.uom}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* ADD PRODUCT MODAL */}
      {showAddProduct && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"14px", width:"580px", maxHeight:"85vh", overflow:"hidden", display:"flex", flexDirection:"column", animation:"slideIn 0.2s ease" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontWeight:"800", fontSize:"15px", color:C.text }}>Add New Product</div>
              <button onClick={()=>setShowAddProduct(false)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"18px" }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                {/* Product Name */}
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Product Name *</label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                    placeholder="e.g. Gul Ahmed Summer Lawn 3pc"
                    style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"10px 12px", color:C.text, fontSize:"13px", outline:"none" }}/>
                </div>
                {[
                  { l:"Category",     k:"category",      type:"select", opts:CATEGORIES.slice(1) },
                  { l:"Vendor",       k:"vendor",        type:"select", opts:VENDORS },
                  { l:"Fabric",       k:"fabric",        type:"select", opts:FABRICS },
                  { l:"Season",       k:"season",        type:"select", opts:SEASONS },
                  { l:"Unit of Measure", k:"uom",        type:"select", opts:["Piece","Set","Meter","KG","Pair"] },
                  { l:"Sale Price (PKR)", k:"salePrice", type:"number", placeholder:"0.00" },
                  { l:"Purchase Price (PKR)", k:"purchasePrice", type:"number", placeholder:"0.00" },
                  { l:"Reorder Level", k:"reorderLevel", type:"number", placeholder:"10" },
                ].map(f => (
                  <div key={f.k}>
                    <label style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>{f.l}</label>
                    {f.type==="select" ? (
                      <select value={form[f.k]} onChange={e=>setForm(prev=>({...prev,[f.k]:e.target.value}))}
                        style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"10px 12px", color:C.text, fontSize:"12px", outline:"none" }}>
                        {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={f.type} value={form[f.k]} onChange={e=>setForm(prev=>({...prev,[f.k]:e.target.value}))}
                        placeholder={f.placeholder}
                        style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"10px 12px", color:C.text, fontSize:"12px", outline:"none" }}/>
                    )}
                  </div>
                ))}
              </div>

              {/* Sizes */}
              <div style={{ marginTop:"16px" }}>
                <label style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"8px" }}>Sizes (select all that apply)</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                  {SIZES.map(s => (
                    <button key={s} onClick={()=>setForm(f=>({...f, sizes:f.sizes.includes(s)?f.sizes.filter(x=>x!==s):[...f.sizes,s]}))}
                      style={{ padding:"5px 12px", borderRadius:"20px", border:`1px solid ${form.sizes.includes(s)?C.blue:C.border}`, background:form.sizes.includes(s)?`${C.blue}18`:"transparent", color:form.sizes.includes(s)?C.blue:C.muted, cursor:"pointer", fontSize:"11px", fontWeight:"600" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div style={{ marginTop:"14px" }}>
                <label style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"8px" }}>Colors (select all that apply)</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                  {COLORS.map(col => (
                    <button key={col} onClick={()=>setForm(f=>({...f, colors:f.colors.includes(col)?f.colors.filter(x=>x!==col):[...f.colors,col]}))}
                      style={{ padding:"5px 12px", borderRadius:"20px", border:`1px solid ${form.colors.includes(col)?C.pink:C.border}`, background:form.colors.includes(col)?`${C.pink}18`:"transparent", color:form.colors.includes(col)?C.pink:C.muted, cursor:"pointer", fontSize:"11px", fontWeight:"600" }}>
                      {col}
                    </button>
                  ))}
                </div>
              </div>

              {form.sizes.length > 0 && form.colors.length > 0 && (
                <div style={{ marginTop:"14px", padding:"12px", background:C.input, borderRadius:"8px", border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:"11px", color:C.muted, marginBottom:"4px" }}>This will create:</div>
                  <div style={{ fontSize:"14px", fontWeight:"800", color:C.green }}>{form.sizes.length * form.colors.length} variants</div>
                  <div style={{ fontSize:"10px", color:C.muted }}>({form.sizes.join(", ")}) × ({form.colors.join(", ")})</div>
                </div>
              )}
            </div>
            <div style={{ padding:"14px 20px", borderTop:`1px solid ${C.border}`, display:"flex", gap:"8px" }}>
              <button onClick={()=>setShowAddProduct(false)} style={{ flex:1, padding:"10px", borderRadius:"8px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontWeight:"600" }}>Cancel</button>
              <button onClick={handleAddProduct} disabled={!form.name} style={{ flex:2, padding:"10px", borderRadius:"8px", border:"none", background:form.name?"linear-gradient(135deg,#10b981,#059669)":"#1c2a3a", color:form.name?"#fff":C.muted, cursor:form.name?"pointer":"not-allowed", fontWeight:"800", fontSize:"13px" }}>
                ✓ Add Product & Generate Barcodes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransfer && <TransferModal product={showTransfer.product} warehouses={WAREHOUSES.filter(w=>w.active)} onClose={()=>setShowTransfer(null)} onConfirm={handleTransfer}/>}

      {/* ADJUST MODAL */}
      {showAdjust && <AdjustModal product={showAdjust.product} warehouses={WAREHOUSES.filter(w=>w.active)} onClose={()=>setShowAdjust(null)} onConfirm={handleAdjust}/>}

      {/* BARCODE MODAL */}
      {showBarcode && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"14px", width:"500px", maxHeight:"80vh", overflow:"hidden", display:"flex", flexDirection:"column", animation:"slideIn 0.2s ease" }}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontWeight:"800", fontSize:"14px", color:C.text }}>▦ Barcodes — {showBarcode.name}</div>
                <div style={{ fontSize:"10px", color:C.muted }}>{showBarcode.variants.length} variant barcodes</div>
              </div>
              <div style={{ display:"flex", gap:"6px" }}>
                <button onClick={()=>window.print()} style={{ padding:"7px 12px", borderRadius:"7px", border:`1px solid ${C.border}`, background:"transparent", color:C.teal, cursor:"pointer", fontSize:"11px", fontWeight:"700" }}>🖨 Print All</button>
                <button onClick={()=>setShowBarcode(null)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"18px" }}>✕</button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
              {/* Master barcode */}
              <div style={{ gridColumn:"1/-1", background:C.input, borderRadius:"9px", padding:"14px", textAlign:"center", border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:"10px", color:C.muted, marginBottom:"8px" }}>Master Product Barcode</div>
                <BarcodeDisplay value={showBarcode.barcode} width={240} height={60}/>
                <div style={{ fontSize:"11px", color:C.text, marginTop:"8px", fontWeight:"700" }}>{showBarcode.name}</div>
                <div style={{ fontSize:"9px", color:C.muted }}>{showBarcode.sku}</div>
              </div>
              {/* Variant barcodes */}
              {showBarcode.variants.map(v => (
                <div key={v.id} style={{ background:C.input, borderRadius:"9px", padding:"12px", textAlign:"center", border:`1px solid ${C.border}` }}>
                  <div style={{ display:"flex", gap:"4px", justifyContent:"center", marginBottom:"7px" }}>
                    <Tag label={v.color} color={C.pink}/>
                    {v.size!=="Free Size" && <Tag label={v.size} color={C.blue}/>}
                  </div>
                  <BarcodeDisplay value={v.barcode} width={160} height={50}/>
                  <div style={{ fontSize:"8px", color:C.muted, marginTop:"4px", fontFamily:"'IBM Plex Mono'" }}>{v.barcode}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION */}
      {notification && (
        <div style={{ position:"fixed", top:"16px", left:"50%", transform:"translateX(-50%)", zIndex:400,
          background:notification.type==="error"?C.red:C.green, color:"#fff",
          padding:"10px 18px", borderRadius:"8px", fontSize:"12px", fontWeight:"700",
          boxShadow:"0 8px 24px rgba(0,0,0,0.4)", animation:"slideIn 0.2s ease", whiteSpace:"nowrap" }}>
          {notification.type==="error"?"✕":"✓"} {notification.msg}
        </div>
      )}
    </div>
  );
}

// ── TRANSFER MODAL ────────────────────────────────────────────────
function TransferModal({ product, warehouses, onClose, onConfirm }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id||"");
  const [from, setFrom] = useState(warehouses[0]?.id||"");
  const [to, setTo] = useState(warehouses[1]?.id||"");
  const [qty, setQty] = useState(1);
  const variant = product.variants.find(v=>v.id===variantId);
  const avail = variant ? (variant.stock[from]||0) : 0;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"14px", width:"420px", animation:"slideIn 0.2s ease" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:"800", fontSize:"14px", color:C.text }}>↔ Stock Transfer</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"18px" }}>✕</button>
        </div>
        <div style={{ padding:"20px" }}>
          <div style={{ fontSize:"12px", fontWeight:"700", color:C.text, marginBottom:"14px" }}>{product.name}</div>
          {[
            { l:"Variant", node:
              <select value={variantId} onChange={e=>setVariantId(e.target.value)} style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px", color:C.text, fontSize:"12px", outline:"none" }}>
                {product.variants.map(v=><option key={v.id} value={v.id}>{v.color} / {v.size} (Stock: {Object.values(v.stock).reduce((a,b)=>a+b,0)})</option>)}
              </select>
            },
            { l:"From Warehouse", node:
              <select value={from} onChange={e=>setFrom(e.target.value)} style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px", color:C.text, fontSize:"12px", outline:"none" }}>
                {warehouses.map(w=><option key={w.id} value={w.id}>{w.name} (Available: {variant?.stock[w.id]||0})</option>)}
              </select>
            },
            { l:"To Warehouse", node:
              <select value={to} onChange={e=>setTo(e.target.value)} style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px", color:C.text, fontSize:"12px", outline:"none" }}>
                {warehouses.filter(w=>w.id!==from).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            },
          ].map(f => (
            <div key={f.l} style={{ marginBottom:"12px" }}>
              <label style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>{f.l}</label>
              {f.node}
            </div>
          ))}
          <div>
            <label style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Quantity (Available: {avail})</label>
            <input type="number" min={1} max={avail} value={qty} onChange={e=>setQty(Math.min(avail,Math.max(1,parseInt(e.target.value)||1)))}
              style={{ width:"100%", background:C.input, border:`1px solid ${qty>avail?C.red:C.border}`, borderRadius:"7px", padding:"9px", color:C.text, fontSize:"14px", fontWeight:"700", outline:"none" }}/>
            {qty > avail && <div style={{ fontSize:"10px", color:C.red, marginTop:"3px" }}>Exceeds available stock!</div>}
          </div>
        </div>
        <div style={{ padding:"14px 20px", borderTop:`1px solid ${C.border}`, display:"flex", gap:"8px" }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px", borderRadius:"8px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontWeight:"600" }}>Cancel</button>
          <button onClick={()=>onConfirm({ productId:product.id, productName:product.name, variantId, variantLabel:`${variant?.color} / ${variant?.size}`, from, to, qty })}
            disabled={qty>avail||from===to}
            style={{ flex:2, padding:"10px", borderRadius:"8px", border:"none", background:qty<=avail&&from!==to?"linear-gradient(135deg,#3b82f6,#2563eb)":"#1c2a3a", color:qty<=avail&&from!==to?"#fff":C.muted, cursor:qty<=avail&&from!==to?"pointer":"not-allowed", fontWeight:"800", fontSize:"13px" }}>
            ↔ Transfer {qty} Units
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ADJUST MODAL ──────────────────────────────────────────────────
function AdjustModal({ product, warehouses, onClose, onConfirm }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id||"");
  const [warehouse, setWarehouse] = useState(warehouses[0]?.id||"");
  const [type, setType] = useState("add"); // add | remove | set
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("Physical Count");
  const variant = product.variants.find(v=>v.id===variantId);
  const current = variant ? (variant.stock[warehouse]||0) : 0;
  const delta = type==="add" ? qty : type==="remove" ? -qty : qty - current;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"14px", width:"420px", animation:"slideIn 0.2s ease" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:"800", fontSize:"14px", color:C.text }}>✎ Stock Adjustment</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"18px" }}>✕</button>
        </div>
        <div style={{ padding:"20px" }}>
          <div style={{ fontSize:"12px", fontWeight:"700", color:C.text, marginBottom:"14px" }}>{product.name}</div>

          <div style={{ marginBottom:"12px" }}>
            <label style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Variant</label>
            <select value={variantId} onChange={e=>setVariantId(e.target.value)} style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px", color:C.text, fontSize:"12px", outline:"none" }}>
              {product.variants.map(v=><option key={v.id} value={v.id}>{v.color} / {v.size}</option>)}
            </select>
          </div>

          <div style={{ marginBottom:"12px" }}>
            <label style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Warehouse</label>
            <select value={warehouse} onChange={e=>setWarehouse(e.target.value)} style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px", color:C.text, fontSize:"12px", outline:"none" }}>
              {warehouses.map(w=><option key={w.id} value={w.id}>{w.name} (Current: {variant?.stock[w.id]||0})</option>)}
            </select>
          </div>

          <div style={{ marginBottom:"12px" }}>
            <label style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Adjustment Type</label>
            <div style={{ display:"flex", gap:"6px" }}>
              {[{k:"add",l:"+ Add",col:C.green},{k:"remove",l:"- Remove",col:C.red},{k:"set",l:"= Set To",col:C.blue}].map(t => (
                <button key={t.k} onClick={()=>setType(t.k)} style={{ flex:1, padding:"8px", borderRadius:"7px", border:`1px solid ${type===t.k?t.col:C.border}`, background:type===t.k?`${t.col}18`:"transparent", color:type===t.k?t.col:C.muted, cursor:"pointer", fontSize:"11px", fontWeight:"700" }}>{t.l}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:"12px" }}>
            <label style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>
              {type==="set"?"Set Stock To":"Quantity"} (Current: {current})
            </label>
            <input type="number" min={0} value={qty} onChange={e=>setQty(Math.max(0,parseInt(e.target.value)||0))}
              style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px", color:C.text, fontSize:"16px", fontWeight:"800", outline:"none" }}/>
          </div>

          <div>
            <label style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Reason</label>
            <select value={reason} onChange={e=>setReason(e.target.value)} style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px", color:C.text, fontSize:"12px", outline:"none" }}>
              {["Physical Count","Damaged Goods","Returned from Customer","Supplier Return","Opening Stock","System Correction"].map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div style={{ marginTop:"12px", padding:"10px", background:`${delta>0?C.green:delta<0?C.red:C.blue}15`, border:`1px solid ${delta>0?C.green:delta<0?C.red:C.blue}33`, borderRadius:"7px" }}>
            <div style={{ fontSize:"11px", color:C.muted }}>Result: {current} → <strong style={{ color:delta>0?C.green:delta<0?C.red:C.blue }}>{Math.max(0,current+delta)}</strong> units ({delta>0?"+":""}{delta})</div>
          </div>
        </div>
        <div style={{ padding:"14px 20px", borderTop:`1px solid ${C.border}`, display:"flex", gap:"8px" }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px", borderRadius:"8px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontWeight:"600" }}>Cancel</button>
          <button onClick={()=>onConfirm({ productId:product.id, productName:product.name, variantId, variantLabel:`${variant?.color} / ${variant?.size}`, warehouse, delta, reason })}
            style={{ flex:2, padding:"10px", borderRadius:"8px", border:"none", background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"#fff", cursor:"pointer", fontWeight:"800", fontSize:"13px" }}>
            ✓ Apply Adjustment
          </button>
        </div>
      </div>
    </div>
  );
}

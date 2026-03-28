import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// INFOSYS PAK ERP — PART 2: POS TERMINAL
// Features: Barcode scan, Discount Matrix, FBR sync, Receipt
// ============================================================

const PRODUCTS_DB = [
  { id:"p001", sku:"GA-LS-001", name:"Lawn Suit - Gul Ahmed (3pc)", category:"Fabric", vendor:"Gul Ahmed Textiles", vendorId:"v001", brand:"Gul Ahmed", brandId:"b001", price:3999, tax:0, barcode:"6901234567890", stock:142, variants:[{size:"S"},{size:"M"},{size:"L"},{size:"XL"}], color:"Multi" },
  { id:"p002", sku:"KH-KT-002", name:"Khaadi Embroidered Kurta", category:"Ready-to-Wear", vendor:"Khaadi", vendorId:"v002", brand:"Khaadi", brandId:"b002", price:2999, tax:0, barcode:"6901234567891", stock:88, variants:[{size:"S"},{size:"M"},{size:"L"},{size:"XL"},{size:"XXL"}], color:"Navy" },
  { id:"p003", sku:"SP-FB-003", name:"Sapphire Cotton Fabric (3m)", category:"Fabric", vendor:"Sapphire Textile", vendorId:"v003", brand:"Sapphire", brandId:"b003", price:2499, tax:0, barcode:"6901234567892", stock:210, variants:[], color:"Sky Blue" },
  { id:"p004", sku:"BZ-SW-004", name:"Bonanza Satrangi Sweater", category:"Knitwear", vendor:"Bonanza", vendorId:"v004", brand:"Bonanza", brandId:"b004", price:2799, tax:0, barcode:"6901234567893", stock:55, variants:[{size:"M"},{size:"L"},{size:"XL"}], color:"Brown" },
  { id:"p005", sku:"AK-SS-005", name:"Alkaram Studio 2pc Set", category:"Ready-to-Wear", vendor:"Alkaram Studio", vendorId:"v005", brand:"Alkaram", brandId:"b005", price:3499, tax:0, barcode:"6901234567894", stock:74, variants:[{size:"S"},{size:"M"},{size:"L"}], color:"Peach" },
  { id:"p006", sku:"GA-EB-006", name:"Gul Ahmed Embroidered Linen", category:"Fabric", vendor:"Gul Ahmed Textiles", vendorId:"v001", brand:"Gul Ahmed", brandId:"b001", price:4599, tax:0, barcode:"6901234567895", stock:38, variants:[], color:"Gold" },
  { id:"p007", sku:"KH-SH-007", name:"Khaadi Silk Hijab", category:"Accessories", vendor:"Khaadi", vendorId:"v002", brand:"Khaadi", brandId:"b002", price:899, tax:0, barcode:"6901234567896", stock:320, variants:[], color:"Various" },
  { id:"p008", sku:"SP-JB-008", name:"Sapphire Jacquard Blouse", category:"Ready-to-Wear", vendor:"Sapphire Textile", vendorId:"v003", brand:"Sapphire", brandId:"b003", price:1899, tax:0, barcode:"6901234567897", stock:61, variants:[{size:"S"},{size:"M"},{size:"L"}], color:"Maroon" },
];

const CUSTOMERS_DB = [
  { id:"c001", name:"Al-Fatah Traders", phone:"0300-1234567", type:"Wholesale", balance:-45000, discounts:[{vendorId:"v001",brandId:"b001",pct:15},{vendorId:"v002",brandId:null,pct:10}] },
  { id:"c002", name:"City Garments LLC", phone:"0321-9876543", type:"Retail", balance:12000, discounts:[{vendorId:"v003",brandId:"b003",pct:8}] },
  { id:"c003", name:"Hassan Fabrics", phone:"0333-1122334", type:"Wholesale", balance:-78000, discounts:[{vendorId:null,brandId:null,pct:5}] },
  { id:"c004", name:"Rehman Sons", phone:"0312-5556789", type:"Retail", balance:0, discounts:[] },
  { id:"c005", name:"Walk-in Customer", phone:"", type:"Retail", balance:0, discounts:[] },
];

function resolveDiscount(customer, product) {
  if (!customer || customer.discounts.length === 0) return { pct: 0, source: "none" };
  // Priority: vendor+brand > vendor > brand > global
  const d = customer.discounts;
  const exact = d.find(x => x.vendorId === product.vendorId && x.brandId === product.brandId);
  if (exact) return { pct: exact.pct, source: `${product.brand} × ${customer.name}` };
  const byVendor = d.find(x => x.vendorId === product.vendorId && !x.brandId);
  if (byVendor) return { pct: byVendor.pct, source: `${product.vendor} vendor discount` };
  const global = d.find(x => !x.vendorId && !x.brandId);
  if (global) return { pct: global.pct, source: `Global customer discount` };
  return { pct: 0, source: "none" };
}

const fmt = n => new Intl.NumberFormat("en-PK").format(Math.round(n));
const now = () => new Date().toLocaleString("en-PK", { hour12: true });

// Color palette
const C = {
  bg: "#080c13", panel: "#0d1320", card: "#111827", border: "#1c2a3a",
  text: "#e8edf3", muted: "#5a7080", accent: "#f97316", blue: "#3b82f6",
  green: "#10b981", red: "#ef4444", yellow: "#f59e0b", purple: "#8b5cf6",
  teal: "#06b6d4", input: "#0d1a26", header: "#090e19",
};

const pill = (text, color) => (
  <span style={{ fontSize:"10px", fontWeight:"700", padding:"2px 8px", borderRadius:"20px",
    background:`${color}22`, color, border:`1px solid ${color}44`, letterSpacing:"0.03em" }}>
    {text}
  </span>
);

export default function POSTerminal() {
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(CUSTOMERS_DB[4]);
  const [search, setSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showProducts, setShowProducts] = useState(true);
  const [paymentMode, setPaymentMode] = useState(null); // null=cart, "pay"=payment, "receipt"=done
  const [payMethod, setPayMethod] = useState("cash");
  const [cashGiven, setCashGiven] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitBank, setSplitBank] = useState("");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [fbrStatus, setFbrStatus] = useState("ready");
  const [lastInvoice, setLastInvoice] = useState(null);
  const [showVariant, setShowVariant] = useState(null);
  const [notification, setNotification] = useState(null);
  const barcodeRef = useRef(null);
  const searchRef = useRef(null);

  const filtered = PRODUCTS_DB.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.includes(search)
  );

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2800);
  };

  const addToCart = (product, selectedSize = null) => {
    const disc = resolveDiscount(customer, product);
    setCart(prev => {
      const key = `${product.id}_${selectedSize || "default"}`;
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, qty: i.qty + 1, lineTotal: (i.qty + 1) * i.unitPrice * (1 - i.discPct / 100) } : i);
      }
      const unitPrice = product.price;
      const discPct = disc.pct;
      return [...prev, {
        key, productId: product.id, sku: product.sku,
        name: product.name, size: selectedSize,
        unitPrice, discPct, discSource: disc.source,
        qty: 1, lineTotal: unitPrice * (1 - discPct / 100),
        tax: product.tax, vendorId: product.vendorId, brand: product.brand,
      }];
    });
    notify(`${product.name}${selectedSize ? ` (${selectedSize})` : ""} added`);
    setShowVariant(null);
  };

  const handleProductClick = (product) => {
    if (product.variants.length > 0) {
      setShowVariant(product);
    } else {
      addToCart(product);
    }
  };

  const handleBarcode = (e) => {
    if (e.key === "Enter") {
      const found = PRODUCTS_DB.find(p => p.barcode === barcodeInput.trim());
      if (found) {
        handleProductClick(found);
        setBarcodeInput("");
        notify(`✓ Barcode scanned: ${found.sku}`, "success");
      } else {
        notify(`Barcode not found: ${barcodeInput}`, "error");
        setBarcodeInput("");
      }
    }
  };

  const updateQty = (key, delta) => {
    setCart(prev => prev.map(i => {
      if (i.key !== key) return i;
      const qty = Math.max(0, i.qty + delta);
      if (qty === 0) return null;
      return { ...i, qty, lineTotal: qty * i.unitPrice * (1 - i.discPct / 100) };
    }).filter(Boolean));
  };

  const removeItem = (key) => setCart(prev => prev.filter(i => i.key !== key));

  const setManualDisc = (key, val) => {
    setCart(prev => prev.map(i => {
      if (i.key !== key) return i;
      const pct = Math.min(100, Math.max(0, parseFloat(val) || 0));
      return { ...i, discPct: pct, discSource: "manual", lineTotal: i.qty * i.unitPrice * (1 - pct / 100) };
    }));
  };

  const subtotal = cart.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const itemDiscount = cart.reduce((s, i) => s + (i.qty * i.unitPrice * i.discPct / 100), 0);
  const invoiceDiscount = (subtotal - itemDiscount) * discount / 100;
  const taxable = subtotal - itemDiscount - invoiceDiscount;
  const taxAmt = cart.reduce((s, i) => s + (i.lineTotal * (i.tax / 100)), 0);
  const total = taxable + taxAmt;
  const cashChange = payMethod === "cash" ? (parseFloat(cashGiven) || 0) - total : 0;

  const changeCustomer = (c) => {
    setCustomer(c);
    setShowCustomerList(false);
    setCustomerSearch("");
    // Re-resolve discounts for cart items
    setCart(prev => prev.map(item => {
      const product = PRODUCTS_DB.find(p => p.id === item.productId);
      const disc = resolveDiscount(c, product);
      const pct = disc.pct;
      return { ...item, discPct: pct, discSource: disc.source, lineTotal: item.qty * item.unitPrice * (1 - pct / 100) };
    }));
    notify(`Customer: ${c.name}`);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) { notify("Cart is empty!", "error"); return; }
    setPaymentMode("pay");
    setCashGiven(String(Math.ceil(total / 100) * 100));
  };

  const handleConfirmPayment = async () => {
    setFbrStatus("syncing");
    await new Promise(r => setTimeout(r, 1500));
    const fbrNum = `FBR-${Date.now().toString().slice(-10)}`;
    const invNum = `INV-2024-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    setFbrStatus("synced");
    const invoice = {
      number: invNum, fbrNumber: fbrNum,
      customer: customer.name, items: [...cart],
      subtotal, itemDiscount, invoiceDiscount, tax: taxAmt, total,
      payMethod, cashGiven: parseFloat(cashGiven) || total,
      change: cashChange > 0 ? cashChange : 0,
      date: now(), cashier: "Admin User",
      qrData: `https://esp.fbr.gov.pk/verify?inv=${fbrNum}`,
    };
    setLastInvoice(invoice);
    setPaymentMode("receipt");
  };

  const newSale = () => {
    setCart([]); setPaymentMode(null); setFbrStatus("ready");
    setDiscount(0); setNotes(""); setCashGiven(""); setLastInvoice(null);
    setCustomer(CUSTOMERS_DB[4]);
    notify("New sale started", "success");
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  const filteredCustomers = CUSTOMERS_DB.filter(c =>
    !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif", fontSize:"13px", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:#1c2a3a; border-radius:4px; }
        input,select,button { font-family:inherit; }
        @keyframes slideIn { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── LEFT: PRODUCT PANEL ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", borderRight:`1px solid ${C.border}`, overflow:"hidden" }}>

        {/* Top Bar */}
        <div style={{ background:C.header, borderBottom:`1px solid ${C.border}`, padding:"0 14px", height:"56px", display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
          <div style={{ width:"32px", height:"32px", borderRadius:"7px", background:"linear-gradient(135deg,#f97316,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"900", fontSize:"12px", color:"#fff", flexShrink:0 }}>IP</div>
          <div>
            <div style={{ fontWeight:"800", fontSize:"14px", color:"#fff" }}>POS Terminal</div>
            <div style={{ fontSize:"9px", color:C.muted }}>Lahore Main Branch · Cashier: Admin</div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"5px", padding:"4px 10px", borderRadius:"20px", background:`${C.green}18`, border:`1px solid ${C.green}44` }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:C.green, animation:"pulse2 2s infinite" }}/>
              <span style={{ fontSize:"10px", color:C.green, fontWeight:"600" }}>FBR Online</span>
            </div>
            <div style={{ fontSize:"11px", color:C.muted }}>{new Date().toLocaleDateString("en-PK",{weekday:"short",day:"numeric",month:"short"})}</div>
          </div>
        </div>

        {/* Search + Barcode Row */}
        <div style={{ padding:"10px 14px", background:C.panel, borderBottom:`1px solid ${C.border}`, display:"flex", gap:"8px", flexShrink:0 }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:"7px", background:C.input, borderRadius:"8px", padding:"0 10px", border:`1px solid ${C.border}` }}>
            <span style={{ color:C.muted, fontSize:"14px" }}>🔍</span>
            <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search product name, SKU..." autoFocus
              style={{ background:"none", border:"none", outline:"none", color:C.text, fontSize:"12px", flex:1, padding:"8px 0" }}/>
            {search && <span onClick={()=>setSearch("")} style={{ cursor:"pointer", color:C.muted, fontSize:"14px" }}>✕</span>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"7px", background:C.input, borderRadius:"8px", padding:"0 10px", border:`1px solid ${C.accent}44`, minWidth:"200px" }}>
            <span style={{ color:C.accent, fontSize:"13px" }}>▦</span>
            <input ref={barcodeRef} value={barcodeInput} onChange={e=>setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcode} placeholder="Scan barcode / Enter"
              style={{ background:"none", border:"none", outline:"none", color:C.accent, fontSize:"12px", flex:1, padding:"8px 0", fontFamily:"'IBM Plex Mono',monospace" }}/>
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ padding:"8px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:"6px", overflowX:"auto", flexShrink:0 }}>
          {["All","Fabric","Ready-to-Wear","Knitwear","Accessories"].map(cat => (
            <button key={cat} style={{ padding:"4px 12px", borderRadius:"20px", border:`1px solid ${C.border}`, background: search===cat||cat==="All"?C.accent:C.input, color: search===cat||cat==="All"?"#fff":C.muted, cursor:"pointer", fontSize:"11px", fontWeight:"600", whiteSpace:"nowrap" }}
              onClick={()=>setSearch(cat==="All"?"":cat)}>{cat}</button>
          ))}
        </div>

        {/* Product Grid */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"10px", alignContent:"start" }}>
          {filtered.map(p => {
            const disc = resolveDiscount(customer, p);
            const hasDisc = disc.pct > 0;
            return (
              <div key={p.id} onClick={()=>handleProductClick(p)}
                style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"13px", cursor:"pointer", transition:"all 0.15s", position:"relative", overflow:"hidden" }}
                onMouseEnter={e=>{e.currentTarget.style.border=`1px solid ${C.accent}88`;e.currentTarget.style.transform="translateY(-1px)"}}
                onMouseLeave={e=>{e.currentTarget.style.border=`1px solid ${C.border}`;e.currentTarget.style.transform="none"}}>
                {hasDisc && (
                  <div style={{ position:"absolute", top:0, right:0, background:C.green, color:"#fff", fontSize:"9px", fontWeight:"700", padding:"3px 7px 3px 10px", borderRadius:"0 10px 0 10px" }}>
                    -{disc.pct}%
                  </div>
                )}
                <div style={{ fontSize:"22px", marginBottom:"8px", display:"flex", alignItems:"center", justifyContent:"center", width:"40px", height:"40px", background:`${C.accent}18`, borderRadius:"8px" }}>
                  {p.category==="Fabric"?"🧵":p.category==="Ready-to-Wear"?"👗":p.category==="Knitwear"?"🧥":"👜"}
                </div>
                <div style={{ fontSize:"11.5px", fontWeight:"700", color:C.text, lineHeight:1.3, marginBottom:"4px" }}>{p.name}</div>
                <div style={{ fontSize:"9px", color:C.muted, marginBottom:"6px", fontFamily:"'IBM Plex Mono',monospace" }}>{p.sku}</div>
                <div style={{ fontSize:"10px", color:C.muted, marginBottom:"6px" }}>{p.brand}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                  <div>
                    {hasDisc && <div style={{ fontSize:"10px", color:C.muted, textDecoration:"line-through" }}>PKR {fmt(p.price)}</div>}
                    <div style={{ fontSize:"14px", fontWeight:"800", color: hasDisc?C.green:C.text }}>
                      PKR {fmt(p.price * (1 - disc.pct/100))}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"9px", color: p.stock<10?C.red:C.muted }}>{p.stock} in stock</div>
                    {p.variants.length>0 && <div style={{ fontSize:"9px", color:C.teal }}>▼ sizes</div>}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length===0 && (
            <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"40px", color:C.muted }}>
              <div style={{ fontSize:"32px", marginBottom:"8px" }}>📭</div>
              <div>No products found</div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: CART PANEL ── */}
      <div style={{ width:"420px", display:"flex", flexDirection:"column", background:C.panel, flexShrink:0 }}>

        {/* Customer Selector */}
        <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <div style={{ position:"relative" }}>
            <div onClick={()=>setShowCustomerList(!showCustomerList)} style={{
              display:"flex", alignItems:"center", gap:"10px", padding:"9px 12px",
              background:C.input, borderRadius:"8px", cursor:"pointer",
              border:`1px solid ${customer.id!=="c005"?C.blue+"66":C.border}`,
            }}>
              <div style={{ width:"30px", height:"30px", borderRadius:"50%", flexShrink:0,
                background:customer.id!=="c005"?"linear-gradient(135deg,#3b82f6,#8b5cf6)":"linear-gradient(135deg,#374151,#1f2937)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"700", color:"#fff" }}>
                {customer.name.charAt(0)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"12px", fontWeight:"700", color:C.text }}>{customer.name}</div>
                <div style={{ fontSize:"10px", color:C.muted }}>
                  {customer.phone || "Walk-in"} ·{" "}
                  <span style={{ color: customer.balance<0?C.red:customer.balance>0?C.green:C.muted }}>
                    {customer.balance<0?`PKR ${fmt(Math.abs(customer.balance))} due`:customer.balance>0?`PKR ${fmt(customer.balance)} advance`:"No balance"}
                  </span>
                </div>
              </div>
              {customer.discounts.length>0 && <div style={{ fontSize:"10px", color:C.green, fontWeight:"600" }}>🏷 Discounts active</div>}
              <span style={{ color:C.muted, fontSize:"11px" }}>▼</span>
            </div>
            {showCustomerList && (
              <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:100,
                background:C.card, border:`1px solid ${C.border}`, borderRadius:"8px", overflow:"hidden", animation:"slideIn 0.15s ease" }}>
                <div style={{ padding:"8px" }}>
                  <input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}
                    placeholder="Search customer..." autoFocus
                    style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"7px 10px", color:C.text, fontSize:"12px", outline:"none" }}/>
                </div>
                {filteredCustomers.map(c=>(
                  <div key={c.id} onClick={()=>changeCustomer(c)}
                    style={{ padding:"9px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:"9px",
                      borderTop:`1px solid ${C.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.input}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:"700", color:"#fff", flexShrink:0 }}>{c.name.charAt(0)}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"12px", fontWeight:"600", color:C.text }}>{c.name}</div>
                      <div style={{ fontSize:"10px", color:C.muted }}>{c.phone||"No phone"} · {c.type}</div>
                    </div>
                    {c.discounts.length>0 && <span style={{ fontSize:"10px", color:C.green }}>🏷 {c.discounts.length}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div style={{ flex:1, overflowY:"auto", padding:"8px 10px" }}>
          {cart.length===0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:C.muted }}>
              <div style={{ fontSize:"48px", marginBottom:"12px", opacity:0.3 }}>🛒</div>
              <div style={{ fontSize:"14px", fontWeight:"600" }}>Cart is empty</div>
              <div style={{ fontSize:"11px", marginTop:"4px" }}>Scan barcode or search products</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {cart.map((item,i) => (
                <div key={item.key} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"9px", padding:"10px 12px", animation:"slideIn 0.2s ease" }}>
                  <div style={{ display:"flex", gap:"8px", alignItems:"flex-start" }}>
                    <div style={{ width:"28px", height:"28px", borderRadius:"6px", background:`${C.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", flexShrink:0, color:C.accent, fontWeight:"700" }}>{i+1}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"12px", fontWeight:"700", color:C.text, lineHeight:1.3 }}>{item.name}{item.size&&<span style={{ color:C.muted }}> ({item.size})</span>}</div>
                      <div style={{ fontSize:"9px", color:C.muted, fontFamily:"'IBM Plex Mono',monospace" }}>{item.sku} · {item.brand}</div>
                    </div>
                    <button onClick={()=>removeItem(item.key)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:"14px", padding:"2px", flexShrink:0 }}>✕</button>
                  </div>

                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"8px" }}>
                    {/* Qty Controls */}
                    <div style={{ display:"flex", alignItems:"center", gap:"2px" }}>
                      <button onClick={()=>updateQty(item.key,-1)} style={{ width:"24px", height:"24px", borderRadius:"5px", border:"none", background:C.input, color:C.text, cursor:"pointer", fontSize:"14px", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                      <div style={{ width:"32px", textAlign:"center", fontWeight:"700", fontSize:"13px", color:C.text }}>{item.qty}</div>
                      <button onClick={()=>updateQty(item.key,1)} style={{ width:"24px", height:"24px", borderRadius:"5px", border:"none", background:C.accent, color:"#fff", cursor:"pointer", fontSize:"14px", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                    </div>

                    <div style={{ fontSize:"11px", color:C.muted }}>×</div>
                    <div style={{ fontSize:"11px", color:C.muted }}>PKR {fmt(item.unitPrice)}</div>

                    {/* Discount */}
                    <div style={{ display:"flex", alignItems:"center", gap:"3px", background:C.input, borderRadius:"5px", padding:"2px 6px", border:`1px solid ${item.discPct>0?C.green+"55":C.border}` }}>
                      <span style={{ fontSize:"10px", color:C.muted }}>Disc</span>
                      <input value={item.discPct} onChange={e=>setManualDisc(item.key,e.target.value)}
                        style={{ width:"28px", background:"none", border:"none", outline:"none", color:item.discPct>0?C.green:C.muted, fontSize:"11px", fontWeight:"600", textAlign:"center" }}/>
                      <span style={{ fontSize:"10px", color:C.muted }}>%</span>
                    </div>

                    <div style={{ marginLeft:"auto", textAlign:"right" }}>
                      <div style={{ fontSize:"13px", fontWeight:"800", color:item.discPct>0?C.green:C.text }}>PKR {fmt(item.lineTotal)}</div>
                    </div>
                  </div>

                  {item.discPct>0 && (
                    <div style={{ marginTop:"4px", display:"flex", alignItems:"center", gap:"4px" }}>
                      <span style={{ fontSize:"9px", color:C.green }}>🏷</span>
                      <span style={{ fontSize:"9px", color:C.green }}>{item.discSource} · saved PKR {fmt(item.qty*item.unitPrice*item.discPct/100)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + Checkout */}
        <div style={{ background:C.card, borderTop:`1px solid ${C.border}`, padding:"12px 14px", flexShrink:0 }}>
          {/* Invoice-level discount */}
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
            <span style={{ fontSize:"11px", color:C.muted, flex:1 }}>Additional Invoice Discount</span>
            <div style={{ display:"flex", alignItems:"center", gap:"3px", background:C.input, borderRadius:"6px", padding:"4px 8px", border:`1px solid ${C.border}` }}>
              <input value={discount} onChange={e=>setDiscount(Math.min(100,Math.max(0,parseFloat(e.target.value)||0)))}
                style={{ width:"36px", background:"none", border:"none", outline:"none", color:C.yellow, fontSize:"12px", fontWeight:"700", textAlign:"center" }}/>
              <span style={{ fontSize:"11px", color:C.muted }}>%</span>
            </div>
          </div>

          {/* Summary Lines */}
          {[
            { label:"Subtotal", value:`PKR ${fmt(subtotal)}`, color:C.text },
            { label:"Item Discounts", value:`- PKR ${fmt(itemDiscount)}`, color:itemDiscount>0?C.green:C.muted, hide:itemDiscount===0 },
            { label:"Invoice Discount", value:`- PKR ${fmt(invoiceDiscount)}`, color:C.yellow, hide:invoiceDiscount===0 },
            { label:"Tax (GST)", value:`PKR ${fmt(taxAmt)}`, color:C.muted, hide:taxAmt===0 },
          ].filter(l=>!l.hide).map(l=>(
            <div key={l.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
              <span style={{ fontSize:"11px", color:C.muted }}>{l.label}</span>
              <span style={{ fontSize:"11px", color:l.color, fontWeight:"500" }}>{l.value}</span>
            </div>
          ))}

          <div style={{ height:"1px", background:C.border, margin:"8px 0" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"12px" }}>
            <span style={{ fontSize:"15px", fontWeight:"700", color:C.text }}>Total</span>
            <span style={{ fontSize:"20px", fontWeight:"900", color:C.accent, fontFamily:"'IBM Plex Mono',monospace" }}>PKR {fmt(total)}</span>
          </div>

          <div style={{ display:"flex", gap:"8px" }}>
            <button onClick={()=>{setCart([]);setDiscount(0)}} style={{ flex:1, padding:"10px", borderRadius:"8px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontSize:"12px", fontWeight:"600" }}>
              🗑 Clear
            </button>
            <button onClick={handleCheckout} disabled={cart.length===0}
              style={{ flex:3, padding:"10px", borderRadius:"8px", border:"none", background:cart.length>0?"linear-gradient(135deg,#f97316,#ea580c)":"#1c2a3a", color:cart.length>0?"#fff":C.muted, cursor:cart.length>0?"pointer":"not-allowed", fontSize:"13px", fontWeight:"800", letterSpacing:"0.03em" }}>
              💳 Checkout · PKR {fmt(total)}
            </button>
          </div>

          {/* Cart count badge */}
          <div style={{ marginTop:"8px", display:"flex", justifyContent:"center", gap:"12px" }}>
            {pill(`${cart.length} items`, C.blue)}
            {pill(`${cart.reduce((s,i)=>s+i.qty,0)} qty`, C.teal)}
            {itemDiscount>0 && pill(`Saved PKR ${fmt(itemDiscount+invoiceDiscount)}`, C.green)}
          </div>
        </div>
      </div>

      {/* ── VARIANT PICKER MODAL ── */}
      {showVariant && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }} onClick={()=>setShowVariant(null)}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"14px", padding:"24px", minWidth:"300px", animation:"slideIn 0.2s ease" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:"800", fontSize:"15px", marginBottom:"4px", color:C.text }}>{showVariant.name}</div>
            <div style={{ fontSize:"11px", color:C.muted, marginBottom:"16px" }}>Select size to add to cart</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
              {showVariant.variants.map(v=>(
                <button key={v.size} onClick={()=>addToCart(showVariant, v.size)}
                  style={{ padding:"10px 18px", borderRadius:"8px", border:`2px solid ${C.border}`, background:C.input, color:C.text, cursor:"pointer", fontSize:"13px", fontWeight:"700", transition:"all 0.15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text}}>
                  {v.size}
                </button>
              ))}
            </div>
            <button onClick={()=>addToCart(showVariant)} style={{ marginTop:"12px", width:"100%", padding:"9px", borderRadius:"8px", border:`1px dashed ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontSize:"11px" }}>
              Add without size
            </button>
          </div>
        </div>
      )}

      {/* ── PAYMENT MODAL ── */}
      {paymentMode==="pay" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", width:"420px", overflow:"hidden", animation:"slideIn 0.2s ease" }}>
            <div style={{ background:"linear-gradient(135deg,#111827,#1a2332)", padding:"18px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontWeight:"800", fontSize:"16px", color:"#fff" }}>💳 Payment</div>
                <div style={{ fontSize:"11px", color:C.muted }}>Customer: {customer.name}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"22px", fontWeight:"900", color:C.accent, fontFamily:"'IBM Plex Mono'" }}>PKR {fmt(total)}</div>
                <div style={{ fontSize:"10px", color:C.muted }}>{cart.length} items</div>
              </div>
            </div>

            <div style={{ padding:"18px 20px" }}>
              {/* Payment Method Tabs */}
              <div style={{ display:"flex", gap:"6px", marginBottom:"16px" }}>
                {[{k:"cash",l:"💵 Cash"},{k:"bank",l:"🏦 Bank"},{k:"split",l:"✂️ Split"},{k:"credit",l:"📋 Credit"}].map(m=>(
                  <button key={m.k} onClick={()=>setPayMethod(m.k)}
                    style={{ flex:1, padding:"8px 4px", borderRadius:"8px", border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"700",
                      background: payMethod===m.k?C.accent:C.input, color: payMethod===m.k?"#fff":C.muted }}>
                    {m.l}
                  </button>
                ))}
              </div>

              {payMethod==="cash" && (
                <div>
                  <div style={{ marginBottom:"10px" }}>
                    <label style={{ fontSize:"11px", color:C.muted, display:"block", marginBottom:"4px" }}>Cash Received</label>
                    <input value={cashGiven} onChange={e=>setCashGiven(e.target.value)} autoFocus
                      style={{ width:"100%", background:C.input, border:`2px solid ${C.green}`, borderRadius:"8px", padding:"12px", color:C.green, fontSize:"18px", fontWeight:"800", outline:"none", fontFamily:"'IBM Plex Mono'" }}/>
                  </div>
                  <div style={{ display:"flex", gap:"6px", marginBottom:"12px" }}>
                    {[Math.ceil(total/100)*100, Math.ceil(total/500)*500, Math.ceil(total/1000)*1000].map(v=>(
                      <button key={v} onClick={()=>setCashGiven(String(v))}
                        style={{ flex:1, padding:"7px", background:C.input, border:`1px solid ${C.border}`, borderRadius:"6px", color:C.text, cursor:"pointer", fontSize:"11px", fontWeight:"600" }}>
                        {fmt(v)}
                      </button>
                    ))}
                  </div>
                  {parseFloat(cashGiven)>=total && (
                    <div style={{ padding:"10px", background:`${C.green}18`, border:`1px solid ${C.green}44`, borderRadius:"8px", display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:"12px", color:C.green }}>Change to Return</span>
                      <span style={{ fontSize:"16px", fontWeight:"900", color:C.green, fontFamily:"'IBM Plex Mono'" }}>PKR {fmt(cashChange)}</span>
                    </div>
                  )}
                </div>
              )}

              {payMethod==="bank" && (
                <div style={{ padding:"16px", background:C.input, borderRadius:"8px", border:`1px solid ${C.blue}44` }}>
                  <div style={{ fontSize:"12px", color:C.text, marginBottom:"8px" }}>Bank Transfer / IBFT</div>
                  <div style={{ fontSize:"11px", color:C.muted, lineHeight:1.8 }}>
                    Account: <span style={{ color:C.text, fontFamily:"'IBM Plex Mono'" }}>PK12 HABB 0000 9000 0000 01</span><br/>
                    Bank: HBL · Branch: Main Lahore<br/>
                    Amount: <span style={{ color:C.accent, fontWeight:"700" }}>PKR {fmt(total)}</span>
                  </div>
                </div>
              )}

              {payMethod==="split" && (
                <div style={{ display:"flex", gap:"10px", marginBottom:"8px" }}>
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:"11px", color:C.muted, display:"block", marginBottom:"4px" }}>Cash</label>
                    <input value={splitCash} onChange={e=>setSplitCash(e.target.value)} placeholder="0"
                      style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"10px", color:C.text, fontSize:"14px", fontWeight:"700", outline:"none", fontFamily:"'IBM Plex Mono'" }}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:"11px", color:C.muted, display:"block", marginBottom:"4px" }}>Bank</label>
                    <input value={splitBank} onChange={e=>setSplitBank(e.target.value)} placeholder="0"
                      style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"10px", color:C.text, fontSize:"14px", fontWeight:"700", outline:"none", fontFamily:"'IBM Plex Mono'" }}/>
                  </div>
                </div>
              )}

              {payMethod==="credit" && (
                <div style={{ padding:"12px", background:`${C.yellow}12`, border:`1px solid ${C.yellow}44`, borderRadius:"8px" }}>
                  <div style={{ fontSize:"12px", color:C.yellow, fontWeight:"700", marginBottom:"4px" }}>⚠️ Credit Sale</div>
                  <div style={{ fontSize:"11px", color:C.muted }}>
                    This will be added to {customer.name}'s account.<br/>
                    Current balance: <span style={{ color:C.red }}>PKR {fmt(Math.abs(customer.balance))} due</span>
                  </div>
                </div>
              )}

              <div style={{ marginTop:"14px", display:"flex", gap:"8px" }}>
                <button onClick={()=>setPaymentMode(null)} style={{ flex:1, padding:"11px", borderRadius:"8px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontWeight:"600", fontSize:"12px" }}>
                  ← Back
                </button>
                <button onClick={handleConfirmPayment} style={{ flex:2, padding:"11px", borderRadius:"8px", border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", cursor:"pointer", fontWeight:"800", fontSize:"13px" }}>
                  ✓ Confirm & Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RECEIPT MODAL ── */}
      {paymentMode==="receipt" && lastInvoice && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, overflowY:"auto", padding:"20px" }}>
          <div style={{ background:"#fff", borderRadius:"16px", width:"340px", color:"#1a202c", fontFamily:"'IBM Plex Mono',monospace", overflow:"hidden", animation:"slideIn 0.2s ease" }}>
            {/* Receipt Header */}
            <div style={{ background:"#1a202c", padding:"18px", textAlign:"center" }}>
              <div style={{ color:"#f97316", fontWeight:"900", fontSize:"16px", fontFamily:"'IBM Plex Sans'" }}>INFOSYS PAK ERP</div>
              <div style={{ color:"#9ca3af", fontSize:"10px" }}>Lahore Main Branch</div>
              <div style={{ color:"#9ca3af", fontSize:"10px" }}>NTN: 1234567-8 · STRN: 12-34-5678-001-89</div>
            </div>

            <div style={{ padding:"16px" }}>
              <div style={{ borderBottom:"1px dashed #e5e7eb", paddingBottom:"10px", marginBottom:"10px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", marginBottom:"3px" }}>
                  <span style={{ color:"#6b7280" }}>Invoice#</span>
                  <span style={{ fontWeight:"700" }}>{lastInvoice.number}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", marginBottom:"3px" }}>
                  <span style={{ color:"#6b7280" }}>FBR#</span>
                  <span style={{ fontWeight:"700", color:"#059669" }}>{lastInvoice.fbrNumber}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", marginBottom:"3px" }}>
                  <span style={{ color:"#6b7280" }}>Date</span>
                  <span>{lastInvoice.date}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px" }}>
                  <span style={{ color:"#6b7280" }}>Customer</span>
                  <span style={{ fontWeight:"600" }}>{lastInvoice.customer}</span>
                </div>
              </div>

              {/* Items */}
              <div style={{ borderBottom:"1px dashed #e5e7eb", paddingBottom:"10px", marginBottom:"10px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"9px", color:"#9ca3af", marginBottom:"6px", fontWeight:"600" }}>
                  <span>ITEM</span><span>QTY</span><span>PRICE</span><span>TOTAL</span>
                </div>
                {lastInvoice.items.map((item,i)=>(
                  <div key={i}>
                    <div style={{ fontSize:"10px", fontWeight:"700", color:"#1a202c", lineHeight:1.3 }}>{item.name}{item.size?` (${item.size})`:""}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:"10px", color:"#374151", marginBottom:"4px" }}>
                      <span style={{ color:"#9ca3af" }}>{item.sku}</span>
                      <span>{item.qty}</span>
                      <span>{fmt(item.unitPrice)}</span>
                      <span style={{ fontWeight:"700" }}>{fmt(item.lineTotal)}</span>
                    </div>
                    {item.discPct>0 && <div style={{ fontSize:"9px", color:"#059669", marginBottom:"4px" }}>Discount: {item.discPct}% (-PKR {fmt(item.qty*item.unitPrice*item.discPct/100)})</div>}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ marginBottom:"12px" }}>
                {[
                  {l:"Subtotal",v:`PKR ${fmt(lastInvoice.subtotal)}`},
                  ...(lastInvoice.itemDiscount>0?[{l:"Discounts",v:`-PKR ${fmt(lastInvoice.itemDiscount)}`,c:"#059669"}]:[]),
                  ...(lastInvoice.tax>0?[{l:"Tax",v:`PKR ${fmt(lastInvoice.tax)}`}]:[]),
                ].map(r=><div key={r.l} style={{display:"flex",justifyContent:"space-between",fontSize:"11px",marginBottom:"3px"}}>
                  <span style={{color:"#6b7280"}}>{r.l}</span><span style={{color:r.c||"#374151"}}>{r.v}</span>
                </div>)}
                <div style={{ display:"flex", justifyContent:"space-between", borderTop:"2px solid #1a202c", paddingTop:"8px", marginTop:"4px" }}>
                  <span style={{ fontWeight:"900", fontSize:"14px" }}>TOTAL</span>
                  <span style={{ fontWeight:"900", fontSize:"16px", color:"#f97316" }}>PKR {fmt(lastInvoice.total)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", marginTop:"4px" }}>
                  <span style={{ color:"#6b7280" }}>Paid ({lastInvoice.payMethod})</span>
                  <span>PKR {fmt(lastInvoice.cashGiven)}</span>
                </div>
                {lastInvoice.change>0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px" }}>
                    <span style={{ color:"#6b7280" }}>Change</span>
                    <span style={{ color:"#059669", fontWeight:"700" }}>PKR {fmt(lastInvoice.change)}</span>
                  </div>
                )}
              </div>

              {/* QR Code Placeholder */}
              <div style={{ background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:"8px", padding:"12px", textAlign:"center", marginBottom:"12px" }}>
                <div style={{ fontSize:"10px", color:"#6b7280", marginBottom:"6px" }}>FBR Verification QR Code</div>
                <div style={{ display:"inline-block", background:"#fff", padding:"8px", border:"1px solid #e5e7eb" }}>
                  {/* Simulated QR Pattern */}
                  <svg width="80" height="80" style={{ display:"block" }}>
                    {[...Array(8)].map((_,r)=>[...Array(8)].map((_,c)=>(
                      <rect key={`${r}-${c}`} x={c*10} y={r*10} width="9" height="9"
                        fill={Math.random()>0.5?"#1a202c":"#fff"}
                        rx="1"
                      />
                    )))}
                    {/* Corner squares */}
                    <rect x="0" y="0" width="29" height="29" fill="#1a202c" rx="2"/><rect x="2" y="2" width="25" height="25" fill="#fff" rx="1"/><rect x="5" y="5" width="19" height="19" fill="#1a202c" rx="1"/><rect x="8" y="8" width="13" height="13" fill="#fff"/>
                    <rect x="51" y="0" width="29" height="29" fill="#1a202c" rx="2"/><rect x="53" y="2" width="25" height="25" fill="#fff" rx="1"/><rect x="56" y="5" width="19" height="19" fill="#1a202c" rx="1"/><rect x="59" y="8" width="13" height="13" fill="#fff"/>
                    <rect x="0" y="51" width="29" height="29" fill="#1a202c" rx="2"/><rect x="2" y="53" width="25" height="25" fill="#fff" rx="1"/><rect x="5" y="56" width="19" height="19" fill="#1a202c" rx="1"/><rect x="8" y="59" width="13" height="13" fill="#fff"/>
                  </svg>
                </div>
                <div style={{ fontSize:"9px", color:"#9ca3af", marginTop:"4px" }}>Scan to verify at FBR portal</div>
                <div style={{ fontSize:"8px", color:"#9ca3af", fontFamily:"monospace", marginTop:"2px" }}>{lastInvoice.fbrNumber}</div>
              </div>

              <div style={{ textAlign:"center", fontSize:"10px", color:"#9ca3af", marginBottom:"14px" }}>
                Thank you for shopping with us!<br/>
                Returns within 7 days with receipt.
              </div>

              {/* Action Buttons */}
              <div style={{ display:"flex", gap:"8px" }}>
                <button style={{ flex:1, padding:"10px", borderRadius:"8px", border:"1px solid #e5e7eb", background:"#f9fafb", color:"#374151", cursor:"pointer", fontSize:"11px", fontWeight:"600" }}
                  onClick={()=>window.print()}>🖨 Print</button>
                <button style={{ flex:1, padding:"10px", borderRadius:"8px", border:"1px solid #e5e7eb", background:"#f9fafb", color:"#374151", cursor:"pointer", fontSize:"11px", fontWeight:"600" }}>📧 Email</button>
                <button onClick={newSale} style={{ flex:2, padding:"10px", borderRadius:"8px", border:"none", background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", cursor:"pointer", fontSize:"12px", fontWeight:"800" }}>
                  + New Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATION TOAST ── */}
      {notification && (
        <div style={{ position:"fixed", top:"16px", left:"50%", transform:"translateX(-50%)", zIndex:300,
          background: notification.type==="error"?C.red:notification.type==="warning"?C.yellow:C.green,
          color:"#fff", padding:"10px 18px", borderRadius:"8px", fontSize:"12px", fontWeight:"700",
          boxShadow:"0 8px 24px rgba(0,0,0,0.4)", animation:"slideIn 0.2s ease",
          display:"flex", alignItems:"center", gap:"8px", whiteSpace:"nowrap" }}>
          {notification.type==="error"?"✕":"✓"} {notification.msg}
        </div>
      )}
    </div>
  );
}

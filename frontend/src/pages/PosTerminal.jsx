import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/client";

// ── Color palette ─────────────────────────────────────────────
const C = {
  bg:"#080c13", panel:"#0d1320", card:"#111827", border:"#1c2a3a",
  text:"#e8edf3", muted:"#5a7080", accent:"#f97316", blue:"#3b82f6",
  green:"#10b981", red:"#ef4444", yellow:"#f59e0b", purple:"#8b5cf6",
  teal:"#06b6d4", input:"#0d1a26", header:"#090e19",
};

const fmt = n => new Intl.NumberFormat("en-PK").format(Math.round(n||0));

// ── Walk-in customer default ──────────────────────────────────
const WALKIN = { id: null, name: "Walk-in Customer", phone: "", credit_limit: 0 };

export default function POSTerminal() {
  // Products & Customers from API
  const [products, setProducts]     = useState([]);
  const [customers, setCustomers]   = useState([WALKIN]);
  const [loadingProds, setLoadingProds] = useState(true);
  const [prodError, setProdError]   = useState(null);

  // POS State
  const [cart, setCart]             = useState([]);
  const [customer, setCustomer]     = useState(WALKIN);
  const [search, setSearch]         = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [paymentMode, setPaymentMode] = useState(null);
  const [payMethod, setPayMethod]   = useState("cash");
  const [cashGiven, setCashGiven]   = useState("");
  const [discount, setDiscount]     = useState(0);
  const [notes, setNotes]           = useState("");
  const [saving, setSaving]         = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [notification, setNotification] = useState(null);

  const barcodeRef = useRef(null);
  const searchRef  = useRef(null);

  // ── Load products from API ──────────────────────────────────
  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  async function loadProducts() {
    setLoadingProds(true);
    setProdError(null);
    try {
      const res = await api.get("/products");
      const data = res.data?.data || res.data || [];
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setProdError("Products load nahi hue. Backend check karo.");
    } finally {
      setLoadingProds(false);
    }
  }

  async function loadCustomers() {
    try {
      const res = await api.get("/customers");
      const data = res.data?.data || res.data || [];
      setCustomers([WALKIN, ...(Array.isArray(data) ? data : [])]);
    } catch (e) {
      setCustomers([WALKIN]);
    }
  }

  // ── Notification helper ───────────────────────────────────
  const notify = useCallback((msg, type="success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2800);
  }, []);

  // ── Filter products ───────────────────────────────────────
  const categories = ["All", ...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search);
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  // ── Add to cart ───────────────────────────────────────────
  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, qty: i.qty + 1, lineTotal: (i.qty + 1) * i.unit_price }
          : i
        );
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        unit_price: Number(product.sale_price) || 0,
        qty: 1,
        discount: 0,
        lineTotal: Number(product.sale_price) || 0,
      }];
    });
    notify(`Added: ${product.name}`);
  }, [notify]);

  // ── Barcode scan ──────────────────────────────────────────
  const handleBarcode = async (e) => {
    if (e.key !== "Enter" || !barcodeInput.trim()) return;
    const code = barcodeInput.trim();
    setBarcodeInput("");
    // First check local products
    const local = products.find(p => p.barcode === code);
    if (local) { addToCart(local); return; }
    // Try API
    try {
      const res = await api.get(`/products/barcode/${code}`);
      const prod = res.data?.data || res.data;
      if (prod) addToCart(prod);
      else notify(`Barcode not found: ${code}`, "error");
    } catch {
      notify(`Barcode not found: ${code}`, "error");
    }
  };

  // ── Cart operations ───────────────────────────────────────
  const updateQty = (product_id, delta) => {
    setCart(prev => prev
      .map(i => i.product_id === product_id
        ? { ...i, qty: Math.max(0, i.qty + delta), lineTotal: Math.max(0, i.qty + delta) * i.unit_price }
        : i
      )
      .filter(i => i.qty > 0)
    );
  };

  const removeItem = (product_id) => setCart(prev => prev.filter(i => i.product_id !== product_id));

  const setItemDiscount = (product_id, val) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== product_id) return i;
      const pct = Math.min(100, Math.max(0, parseFloat(val) || 0));
      return { ...i, discount: pct, lineTotal: i.qty * i.unit_price * (1 - pct / 100) };
    }));
  };

  // ── Totals ────────────────────────────────────────────────
  const subtotal       = cart.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const itemDiscount   = cart.reduce((s, i) => s + (i.qty * i.unit_price * i.discount / 100), 0);
  const invoiceDisc    = (subtotal - itemDiscount) * discount / 100;
  const total          = subtotal - itemDiscount - invoiceDisc;
  const cashChange     = payMethod === "cash" ? (parseFloat(cashGiven) || 0) - total : 0;

  // ── Checkout ──────────────────────────────────────────────
  const handleCheckout = () => {
    if (cart.length === 0) { notify("Cart is empty!", "error"); return; }
    setPaymentMode("pay");
    setCashGiven(String(Math.ceil(total / 100) * 100));
  };

  const handleConfirmPayment = async () => {
    setSaving(true);
    try {
      const payload = {
        customer_id:    customer.id || null,
        items:          cart.map(i => ({
          product_id:  i.product_id,
          qty:         i.qty,
          unit_price:  i.unit_price,
          discount:    i.discount || 0,
        })),
        discount:       invoiceDisc,
        notes:          notes,
        payment_method: payMethod,
        paid_amount:    payMethod === "cash" ? (parseFloat(cashGiven) || total) : total,
      };

      const res = await api.post("/invoices", payload);
      const inv = res.data?.data || res.data;

      setLastInvoice({
        number:    inv.invoice_no || `INV-${Date.now()}`,
        customer:  customer.name,
        items:     [...cart],
        subtotal, itemDiscount, invoiceDisc,
        total,
        payMethod,
        cashGiven: parseFloat(cashGiven) || total,
        change:    cashChange > 0 ? cashChange : 0,
        date:      new Date().toLocaleString("en-PK", { hour12: true }),
      });
      setPaymentMode("receipt");
      notify("Invoice saved!", "success");
    } catch (e) {
      notify(e.response?.data?.error || "Save failed. Try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const newSale = () => {
    setCart([]); setPaymentMode(null); setDiscount(0);
    setNotes(""); setCashGiven(""); setLastInvoice(null);
    setCustomer(WALKIN);
    notify("New sale started");
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  const filteredCustomers = customers.filter(c =>
    !customerSearch ||
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif", fontSize:"13px", overflow:"hidden" }}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:#1c2a3a; border-radius:4px; }
        input,select,button { font-family:inherit; }
        @keyframes slideIn { from{transform:translateY(-8px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── NOTIFICATION ── */}
      {notification && (
        <div style={{ position:"fixed", top:"16px", left:"50%", transform:"translateX(-50%)", zIndex:999,
          padding:"10px 20px", borderRadius:"8px", fontWeight:"700", fontSize:"12px",
          background: notification.type==="error" ? C.red : C.green,
          color:"#fff", boxShadow:"0 4px 20px rgba(0,0,0,0.4)", animation:"slideIn .2s ease" }}>
          {notification.msg}
        </div>
      )}

      {/* ── LEFT: PRODUCT PANEL ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", borderRight:`1px solid ${C.border}`, overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:C.header, borderBottom:`1px solid ${C.border}`, padding:"0 14px", height:"52px", display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
          <div style={{ width:"30px", height:"30px", borderRadius:"7px", background:"linear-gradient(135deg,#f97316,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"900", fontSize:"11px", color:"#fff" }}>IP</div>
          <div>
            <div style={{ fontWeight:"800", fontSize:"13px" }}>POS Terminal</div>
            <div style={{ fontSize:"9px", color:C.muted }}>Cashier: Admin</div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"5px", padding:"3px 10px", borderRadius:"20px", background:`${C.green}18`, border:`1px solid ${C.green}44` }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:C.green, animation:"pulse2 2s infinite" }}/>
              <span style={{ fontSize:"10px", color:C.green, fontWeight:"600" }}>Live</span>
            </div>
            <button onClick={loadProducts} style={{ background:C.input, border:`1px solid ${C.border}`, color:C.muted, padding:"4px 10px", borderRadius:"6px", cursor:"pointer", fontSize:"10px" }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Search + Barcode */}
        <div style={{ padding:"10px 14px", background:C.panel, borderBottom:`1px solid ${C.border}`, display:"flex", gap:"8px", flexShrink:0 }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:"7px", background:C.input, borderRadius:"8px", padding:"0 10px", border:`1px solid ${C.border}` }}>
            <span style={{ color:C.muted }}>🔍</span>
            <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search product name or SKU..." autoFocus
              style={{ background:"none", border:"none", outline:"none", color:C.text, fontSize:"12px", flex:1, padding:"8px 0" }}/>
            {search && <span onClick={()=>setSearch("")} style={{ cursor:"pointer", color:C.muted }}>✕</span>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"7px", background:C.input, borderRadius:"8px", padding:"0 10px", border:`1px solid ${C.accent}44`, minWidth:"190px" }}>
            <span style={{ color:C.accent }}>▦</span>
            <input ref={barcodeRef} value={barcodeInput} onChange={e=>setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcode} placeholder="Scan barcode + Enter"
              style={{ background:"none", border:"none", outline:"none", color:C.accent, fontSize:"12px", flex:1, padding:"8px 0" }}/>
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ padding:"8px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:"6px", overflowX:"auto", flexShrink:0 }}>
          {categories.map(cat => (
            <button key={cat} onClick={()=>setActiveCategory(cat)}
              style={{ padding:"4px 12px", borderRadius:"20px", border:`1px solid ${activeCategory===cat?C.accent:C.border}`,
                background:activeCategory===cat?C.accent:"transparent", color:activeCategory===cat?"#fff":C.muted,
                cursor:"pointer", fontSize:"11px", fontWeight:"600", whiteSpace:"nowrap" }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px" }}>
          {loadingProds ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"200px", color:C.muted }}>
              <div style={{ width:"32px", height:"32px", border:`3px solid ${C.border}`, borderTop:`3px solid ${C.accent}`, borderRadius:"50%", animation:"spin 1s linear infinite", marginBottom:"12px" }}/>
              <div>Products load ho rahe hain...</div>
            </div>
          ) : prodError ? (
            <div style={{ textAlign:"center", padding:"40px", color:C.red }}>
              <div style={{ fontSize:"28px", marginBottom:"8px" }}>⚠️</div>
              <div style={{ marginBottom:"12px" }}>{prodError}</div>
              <button onClick={loadProducts} style={{ padding:"8px 16px", borderRadius:"7px", background:C.accent, border:"none", color:"#fff", cursor:"pointer" }}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px", color:C.muted }}>
              <div style={{ fontSize:"32px", marginBottom:"8px" }}>📭</div>
              <div style={{ marginBottom:"8px" }}>Koi product nahi mila</div>
              <button onClick={()=>{ setSearch(""); setActiveCategory("All"); }}
                style={{ padding:"6px 14px", borderRadius:"6px", background:C.input, border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer", fontSize:"11px" }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:"10px", alignContent:"start" }}>
              {filtered.map(p => (
                <div key={p.id} onClick={()=>addToCart(p)}
                  style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"12px", cursor:"pointer", transition:"all .15s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent+"88"; e.currentTarget.style.transform="translateY(-1px)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.transform="none"; }}>
                  <div style={{ fontSize:"20px", marginBottom:"8px", width:"38px", height:"38px", background:`${C.accent}18`, borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {p.category==="Fabric"?"🧵":p.category==="Ready-to-Wear"?"👗":p.category==="Knitwear"?"🧥":"📦"}
                  </div>
                  <div style={{ fontSize:"11.5px", fontWeight:"700", color:C.text, lineHeight:1.3, marginBottom:"4px" }}>{p.name}</div>
                  <div style={{ fontSize:"9px", color:C.muted, marginBottom:"6px", fontFamily:"monospace" }}>{p.sku}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                    <div style={{ fontSize:"14px", fontWeight:"800", color:C.text }}>PKR {fmt(p.sale_price)}</div>
                    <div style={{ fontSize:"9px", color:C.muted }}>{p.category}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: CART PANEL ── */}
      <div style={{ width:"400px", display:"flex", flexDirection:"column", background:C.panel, flexShrink:0 }}>

        {/* Customer Selector */}
        <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <div style={{ position:"relative" }}>
            <div onClick={()=>setShowCustomerList(!showCustomerList)}
              style={{ display:"flex", alignItems:"center", gap:"10px", padding:"9px 12px",
                background:C.input, borderRadius:"8px", cursor:"pointer",
                border:`1px solid ${customer.id?C.blue+"66":C.border}` }}>
              <div style={{ width:"30px", height:"30px", borderRadius:"50%", flexShrink:0,
                background:customer.id?"linear-gradient(135deg,#3b82f6,#8b5cf6)":"linear-gradient(135deg,#374151,#1f2937)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"700", color:"#fff" }}>
                {customer.name.charAt(0)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"12px", fontWeight:"700" }}>{customer.name}</div>
                <div style={{ fontSize:"10px", color:C.muted }}>{customer.phone || "Walk-in"}</div>
              </div>
              <span style={{ color:C.muted, fontSize:"11px" }}>▼</span>
            </div>

            {showCustomerList && (
              <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:100,
                background:C.card, border:`1px solid ${C.border}`, borderRadius:"8px", overflow:"hidden", animation:"slideIn .15s ease",
                maxHeight:"280px", overflowY:"auto" }}>
                <div style={{ padding:"8px", borderBottom:`1px solid ${C.border}` }}>
                  <input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}
                    placeholder="Search customer..." autoFocus
                    style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"7px 10px", color:C.text, fontSize:"12px", outline:"none" }}/>
                </div>
                {filteredCustomers.map(c => (
                  <div key={c.id||"walkin"} onClick={()=>{ setCustomer(c); setShowCustomerList(false); setCustomerSearch(""); notify(`Customer: ${c.name}`); }}
                    style={{ padding:"9px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:"9px", borderTop:`1px solid ${C.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.input}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:"700", color:"#fff", flexShrink:0 }}>
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize:"12px", fontWeight:"600" }}>{c.name}</div>
                      <div style={{ fontSize:"10px", color:C.muted }}>{c.phone||"No phone"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div style={{ flex:1, overflowY:"auto", padding:"8px 10px" }}>
          {cart.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:C.muted }}>
              <div style={{ fontSize:"48px", marginBottom:"12px", opacity:0.3 }}>🛒</div>
              <div style={{ fontSize:"14px", fontWeight:"600" }}>Cart is empty</div>
              <div style={{ fontSize:"11px", marginTop:"4px" }}>Left se product select karo</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {cart.map((item, i) => (
                <div key={item.product_id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"9px", padding:"10px 12px", animation:"slideIn .2s ease" }}>
                  <div style={{ display:"flex", gap:"8px", alignItems:"flex-start" }}>
                    <div style={{ width:"26px", height:"26px", borderRadius:"6px", background:`${C.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:"700", color:C.accent, flexShrink:0 }}>{i+1}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"12px", fontWeight:"700", lineHeight:1.3 }}>{item.name}</div>
                      <div style={{ fontSize:"9px", color:C.muted, fontFamily:"monospace" }}>{item.sku}</div>
                    </div>
                    <button onClick={()=>removeItem(item.product_id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:"14px", padding:"2px" }}>✕</button>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"8px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"2px" }}>
                      <button onClick={()=>updateQty(item.product_id,-1)} style={{ width:"24px", height:"24px", borderRadius:"5px", border:"none", background:C.input, color:C.text, cursor:"pointer" }}>−</button>
                      <div style={{ width:"30px", textAlign:"center", fontWeight:"700" }}>{item.qty}</div>
                      <button onClick={()=>updateQty(item.product_id,1)} style={{ width:"24px", height:"24px", borderRadius:"5px", border:"none", background:C.accent, color:"#fff", cursor:"pointer" }}>+</button>
                    </div>
                    <div style={{ fontSize:"11px", color:C.muted }}>× PKR {fmt(item.unit_price)}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:"3px", background:C.input, borderRadius:"5px", padding:"2px 6px", border:`1px solid ${item.discount>0?C.green+"55":C.border}` }}>
                      <span style={{ fontSize:"10px", color:C.muted }}>Disc</span>
                      <input value={item.discount} onChange={e=>setItemDiscount(item.product_id, e.target.value)}
                        style={{ width:"28px", background:"none", border:"none", outline:"none", color:item.discount>0?C.green:C.muted, fontSize:"11px", fontWeight:"600", textAlign:"center" }}/>
                      <span style={{ fontSize:"10px", color:C.muted }}>%</span>
                    </div>
                    <div style={{ marginLeft:"auto", fontSize:"13px", fontWeight:"800", color:item.discount>0?C.green:C.text }}>
                      PKR {fmt(item.lineTotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + Checkout / Payment / Receipt */}
        {paymentMode === null && (
          <div style={{ background:C.card, borderTop:`1px solid ${C.border}`, padding:"12px 14px", flexShrink:0 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:"5px", marginBottom:"10px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", color:C.muted }}>
                <span>Subtotal</span><span>PKR {fmt(subtotal)}</span>
              </div>
              {itemDiscount > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", color:C.green }}>
                  <span>Item Discounts</span><span>- PKR {fmt(itemDiscount)}</span>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"12px", color:C.muted }}>
                <span>Invoice Disc %</span>
                <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                  <input value={discount} onChange={e=>setDiscount(Math.min(100,Math.max(0,parseFloat(e.target.value)||0)))}
                    style={{ width:"40px", background:C.input, border:`1px solid ${C.border}`, borderRadius:"4px", padding:"2px 6px", color:C.text, fontSize:"11px", textAlign:"center", outline:"none" }}/>
                  <span>%</span>
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"16px", fontWeight:"800", color:C.text, paddingTop:"6px", borderTop:`1px solid ${C.border}` }}>
                <span>Total</span><span>PKR {fmt(total)}</span>
              </div>
            </div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes (optional)..."
              style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"7px 10px", color:C.text, fontSize:"11px", resize:"none", height:"44px", outline:"none", marginBottom:"10px" }}/>
            <button onClick={handleCheckout} disabled={cart.length===0}
              style={{ width:"100%", padding:"12px", borderRadius:"8px", border:"none",
                background:cart.length===0?"#1a2a3a":C.accent, color:"#fff", fontWeight:"800", fontSize:"14px",
                cursor:cart.length===0?"not-allowed":"pointer" }}>
              💳 Checkout — PKR {fmt(total)}
            </button>
          </div>
        )}

        {paymentMode === "pay" && (
          <div style={{ background:C.card, borderTop:`1px solid ${C.border}`, padding:"14px", flexShrink:0 }}>
            <div style={{ fontWeight:"800", fontSize:"13px", marginBottom:"12px" }}>Payment Method</div>
            <div style={{ display:"flex", gap:"6px", marginBottom:"12px" }}>
              {["cash","card","bank"].map(m => (
                <button key={m} onClick={()=>setPayMethod(m)}
                  style={{ flex:1, padding:"8px", borderRadius:"7px", border:`1px solid ${payMethod===m?C.accent:C.border}`,
                    background:payMethod===m?`${C.accent}22`:"transparent", color:payMethod===m?C.accent:C.muted,
                    cursor:"pointer", fontWeight:"600", fontSize:"11px", textTransform:"capitalize" }}>
                  {m==="cash"?"💵":m==="card"?"💳":"🏦"} {m}
                </button>
              ))}
            </div>
            {payMethod === "cash" && (
              <div style={{ marginBottom:"10px" }}>
                <label style={{ fontSize:"10px", color:C.muted, display:"block", marginBottom:"4px" }}>Cash Received</label>
                <input type="number" value={cashGiven} onChange={e=>setCashGiven(e.target.value)}
                  style={{ width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"8px 10px", color:C.text, fontSize:"14px", fontWeight:"700", outline:"none" }}/>
                {cashChange > 0 && (
                  <div style={{ marginTop:"6px", padding:"6px 10px", background:`${C.green}18`, borderRadius:"6px", fontSize:"12px", color:C.green, fontWeight:"700" }}>
                    Change: PKR {fmt(cashChange)}
                  </div>
                )}
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"16px", fontWeight:"800", marginBottom:"12px" }}>
              <span>Total</span><span style={{ color:C.accent }}>PKR {fmt(total)}</span>
            </div>
            <div style={{ display:"flex", gap:"8px" }}>
              <button onClick={()=>setPaymentMode(null)}
                style={{ flex:1, padding:"10px", borderRadius:"7px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer" }}>
                ← Back
              </button>
              <button onClick={handleConfirmPayment} disabled={saving}
                style={{ flex:2, padding:"10px", borderRadius:"7px", border:"none", background:saving?"#1a2a3a":C.green, color:"#fff", fontWeight:"800", cursor:saving?"not-allowed":"pointer" }}>
                {saving ? "⏳ Saving..." : "✓ Confirm Payment"}
              </button>
            </div>
          </div>
        )}

        {paymentMode === "receipt" && lastInvoice && (
          <div style={{ background:C.card, borderTop:`1px solid ${C.border}`, padding:"14px", flexShrink:0, maxHeight:"320px", overflowY:"auto" }}>
            <div style={{ textAlign:"center", marginBottom:"10px" }}>
              <div style={{ fontSize:"28px", marginBottom:"4px" }}>✅</div>
              <div style={{ fontWeight:"800", fontSize:"14px", color:C.green }}>Payment Complete!</div>
              <div style={{ fontSize:"11px", color:C.muted, marginTop:"2px" }}>{lastInvoice.number}</div>
            </div>
            <div style={{ background:C.input, borderRadius:"8px", padding:"10px", marginBottom:"10px", fontSize:"11px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                <span style={{ color:C.muted }}>Customer</span>
                <span style={{ fontWeight:"600" }}>{lastInvoice.customer}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                <span style={{ color:C.muted }}>Items</span>
                <span>{lastInvoice.items.length}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                <span style={{ color:C.muted }}>Total</span>
                <span style={{ fontWeight:"800", color:C.accent }}>PKR {fmt(lastInvoice.total)}</span>
              </div>
              {lastInvoice.change > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:C.muted }}>Change</span>
                  <span style={{ color:C.green, fontWeight:"700" }}>PKR {fmt(lastInvoice.change)}</span>
                </div>
              )}
            </div>
            <button onClick={newSale}
              style={{ width:"100%", padding:"12px", borderRadius:"8px", border:"none", background:C.accent, color:"#fff", fontWeight:"800", fontSize:"14px", cursor:"pointer" }}>
              + New Sale
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

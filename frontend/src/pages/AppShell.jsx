import { useState, useEffect, createContext, useContext, useCallback } from "react";

const API = "https://infosys-pak-erp-production-74cb.up.railway.app/api/v1";
const C = {
  bg:"#060a10",sidebar:"#070d16",panel:"#0a1220",card:"#0d1825",
  border:"#162030",text:"#dce4f0",muted:"#4a6070",muted2:"#223040",
  accent:"#f97316",blue:"#3b82f6",green:"#10b981",red:"#ef4444",
  yellow:"#f59e0b",purple:"#8b5cf6",teal:"#06b6d4",input:"#070f1a",
};
const fmt = n => new Intl.NumberFormat("en-PK").format(Math.round(n||0));
const AuthCtx = createContext(null);

// ── API HELPER ────────────────────────────────────────────────────
async function apiFetch(path, opts={}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`}:{}), ...opts.headers },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "API Error");
  return data;
}

// ── HOOKS ─────────────────────────────────────────────────────────
function useClock() {
  const [t,setT] = useState(new Date());
  useEffect(()=>{ const id=setInterval(()=>setT(new Date()),1000); return ()=>clearInterval(id); },[]);
  return t;
}

function useApi(path, deps=[]) {
  const [data,setData]     = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError]   = useState(null);
  const load = useCallback(async () => {
    if(!path) return;
    setLoading(true); setError(null);
    try { const r = await apiFetch(path); setData(r.data ?? r); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(()=>{ load(); }, [load, ...deps]);
  return {data, loading, error, reload:load};
}

// ── SMALL COMPONENTS ──────────────────────────────────────────────
function Tag({l,col,sm}) {
  return <span style={{fontSize:sm?"9px":"10px",fontWeight:"700",padding:sm?"1px 5px":"2px 8px",borderRadius:"20px",background:`${col}18`,color:col,border:`1px solid ${col}28`,whiteSpace:"nowrap"}}>{l}</span>;
}

function Spinner() {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"40px"}}>
    <div style={{width:"28px",height:"28px",border:`3px solid ${C.border}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
  </div>;
}

function EmptyState({icon="📭", msg="No data found"}) {
  return <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
    <div style={{fontSize:"40px",marginBottom:"12px"}}>{icon}</div>
    <div style={{fontSize:"13px"}}>{msg}</div>
  </div>;
}

function Btn({children, onClick, col=C.accent, sm=false, outline=false}) {
  return <button onClick={onClick} style={{padding:sm?"5px 10px":"8px 16px",borderRadius:"6px",border:`1px solid ${outline?col:col}`,background:outline?"transparent":col,color:outline?col:"#fff",fontSize:sm?"11px":"12px",fontWeight:"600",cursor:"pointer"}}>
    {children}
  </button>;
}

// ── LOGIN ─────────────────────────────────────────────────────────
function LoginScreen({onLogin}) {
  const [email,setEmail]     = useState("admin@erp.pk");
  const [pass,setPass]       = useState("Admin@123");
  const [slug,setSlug]       = useState("admin");
  const [err,setErr]         = useState("");
  const [loading,setLoading] = useState(false);
  const [showPass,setShowPass] = useState(false);

  const doLogin = async () => {
    setLoading(true); setErr("");
    try {
      const r = await apiFetch("/auth/login", { method:"POST", body:{email, password:pass, tenantSlug:slug} });
      localStorage.setItem("token", r.data.accessToken);
      onLogin(r.data.user);
    } catch(e) {
      setErr(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}input,button{font-family:inherit}`}</style>
      <div style={{width:"360px",background:C.panel,borderRadius:"16px",border:`1px solid ${C.border}`,padding:"36px 32px"}}>
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div style={{width:"52px",height:"52px",borderRadius:"14px",background:C.accent,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:"22px",fontWeight:"800",color:"#fff",marginBottom:"14px"}}>IP</div>
          <div style={{fontSize:"20px",fontWeight:"800",color:C.text}}>Infosys Pak ERP</div>
          <div style={{fontSize:"11px",color:C.muted,marginTop:"4px"}}>Multi-tenant Business Management System</div>
        </div>

        {[["COMPANY SLUG",slug,setSlug,"text"],["EMAIL ADDRESS",email,setEmail,"email"],["PASSWORD",pass,setPass,showPass?"text":"password"]].map(([lbl,val,set,type])=>(
          <div key={lbl} style={{marginBottom:"14px"}}>
            <div style={{fontSize:"9px",fontWeight:"700",color:C.muted,letterSpacing:"1px",marginBottom:"5px"}}>{lbl}</div>
            <div style={{position:"relative"}}>
              <input value={val} onChange={e=>set(e.target.value)} type={type} onKeyDown={e=>e.key==="Enter"&&doLogin()}
                style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"10px 12px",color:C.text,fontSize:"13px",outline:"none"}}/>
              {lbl==="PASSWORD"&&<button onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"14px"}}>{showPass?"🙈":"👁"}</button>}
            </div>
          </div>
        ))}

        {err&&<div style={{background:"#ef444418",border:"1px solid #ef444430",borderRadius:"6px",padding:"8px 12px",fontSize:"11px",color:C.red,marginBottom:"12px"}}>{err}</div>}

        <button onClick={doLogin} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:"8px",border:"none",background:loading?C.muted2:C.accent,color:"#fff",fontSize:"13px",fontWeight:"700",cursor:loading?"not-allowed":"pointer",marginTop:"4px"}}>
          {loading?"Signing in…":"→ Sign In"}
        </button>
      </div>
    </div>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────
const NAV = [
  {id:"dashboard",   label:"Dashboard",    icon:"⊞"},
  {id:"inventory",   label:"Inventory",    icon:"📦", children:[
    {id:"inventory_products",   label:"Products",       icon:"📋"},
    {id:"inventory_stock",      label:"Stock Movement", icon:"🔄"},
    {id:"inventory_warehouses", label:"Warehouses",     icon:"🏭"},
  ]},
  {id:"procurement", label:"Procurement",  icon:"🛒", children:[
    {id:"procurement_po",      label:"Purchase Orders", icon:"📄"},
    {id:"procurement_vendors", label:"Vendors",         icon:"🏢"},
  ]},
  {id:"sales",       label:"Sales",        icon:"💰", children:[
    {id:"sales_invoices",  label:"Invoices",   icon:"🧾"},
    {id:"sales_customers", label:"Customers",  icon:"👥"},
  ]},
  {id:"accounting",  label:"Accounting",   icon:"📒", children:[
    {id:"accounting_coa",      label:"Chart of Accounts", icon:"🗂"},
    {id:"accounting_vouchers", label:"Vouchers",           icon:"📝"},
    {id:"accounting_ledger",   label:"Ledger",             icon:"📒"},
    {id:"accounting_trial",    label:"Trial Balance",      icon:"⚖️"},
  ]},
  {id:"hr",          label:"HR & Payroll", icon:"👤", children:[
    {id:"hr_employees",  label:"Employees",      icon:"👥"},
    {id:"hr_attendance", label:"Attendance",     icon:"📅"},
    {id:"hr_payroll",    label:"Payroll",        icon:"💳"},
    {id:"hr_leaves",     label:"Leave Requests", icon:"🌴"},
  ]},
  {id:"settings",    label:"Settings",     icon:"⚙"},
];

function Sidebar({route,navigate,user,collapsed,setCollapsed}) {
  const [open,setOpen] = useState(new Set(["inventory","sales","procurement","accounting","hr"]));
  const toggle = id => setOpen(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });

  return (
    <div style={{width:collapsed?"52px":"210px",background:C.sidebar,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",transition:"width .2s",overflow:"hidden",flexShrink:0}}>
      <div style={{padding:"12px",display:"flex",alignItems:"center",gap:"8px",borderBottom:`1px solid ${C.border}`,minHeight:"52px"}}>
        <div style={{width:"28px",height:"28px",borderRadius:"7px",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"800",color:"#fff",flexShrink:0}}>IP</div>
        {!collapsed&&<div style={{fontSize:"13px",fontWeight:"700",color:C.text,whiteSpace:"nowrap"}}>Infosys Pak</div>}
        <button onClick={()=>setCollapsed(!collapsed)} style={{marginLeft:"auto",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"14px",flexShrink:0}}>☰</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
        {NAV.map(item=>{
          const active = route===item.id||route.startsWith(item.id+"_");
          const expanded = open.has(item.id);
          return (
            <div key={item.id}>
              <div onClick={()=>item.children?toggle(item.id):navigate(item.id)}
                style={{display:"flex",alignItems:"center",gap:"8px",padding:"7px 12px",cursor:"pointer",borderRadius:"6px",margin:"1px 6px",background:active&&!item.children?`${C.accent}18`:"transparent",color:active?C.accent:C.text}}>
                <span style={{fontSize:"14px",flexShrink:0}}>{item.icon}</span>
                {!collapsed&&<>
                  <span style={{fontSize:"11px",fontWeight:"600",flex:1}}>{item.label}</span>
                  {item.children&&<span style={{fontSize:"9px",color:C.muted}}>{expanded?"▾":"▸"}</span>}
                </>}
              </div>
              {!collapsed&&item.children&&expanded&&item.children.map(ch=>(
                <div key={ch.id} onClick={()=>navigate(ch.id)}
                  style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 12px 6px 32px",cursor:"pointer",color:route===ch.id?C.accent:C.muted,background:route===ch.id?`${C.accent}12`:"transparent",fontSize:"11px"}}>
                  <span>{ch.icon}</span><span>{ch.label}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {!collapsed&&<div style={{padding:"10px 12px",borderTop:`1px solid ${C.border}`,fontSize:"11px"}}>
        <div style={{color:C.text,fontWeight:"600"}}>{user?.name}</div>
        <div style={{color:C.muted}}>{user?.role}</div>
      </div>}
    </div>
  );
}

// ── TOPBAR ────────────────────────────────────────────────────────
function TopBar({route,user,onLogout}) {
  const clock = useClock();
  const label = NAV.flatMap(n=>[n,...(n.children||[])]).find(n=>n.id===route)?.label||"Dashboard";
  return (
    <div style={{height:"52px",background:C.panel,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 16px",gap:"12px",flexShrink:0}}>
      <div style={{flex:1}}>
        <div style={{fontSize:"14px",fontWeight:"700",color:C.text}}>{label}</div>
      </div>
      <div style={{fontSize:"11px",color:C.muted}}>{clock.toLocaleTimeString("en-PK")}</div>
      <div style={{fontSize:"11px",color:C.green,border:`1px solid ${C.green}30`,padding:"2px 8px",borderRadius:"20px"}}>● FBR Online</div>
      <div style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",padding:"4px 10px",borderRadius:"7px",border:`1px solid ${C.border}`,background:C.card}} onClick={onLogout}>
        <div style={{width:"24px",height:"24px",borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:"700",color:"#fff"}}>{user?.name?.slice(0,2).toUpperCase()||"U"}</div>
        <span style={{fontSize:"11px",color:C.text}}>{user?.name}</span>
        <span style={{fontSize:"9px",color:C.muted}}>Logout</span>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────
function Dashboard({navigate}) {
  const {data, loading} = useApi("/dashboard");
  const stats = data?.stats || {};
  const cards = [
    {label:"Today Sales",    val:`Rs ${fmt(stats.todaySales)}`,     col:C.green,  icon:"💰"},
    {label:"Total Customers",val:stats.totalCustomers||0,           col:C.blue,   icon:"👥"},
    {label:"Products",       val:stats.totalProducts||0,            col:C.purple, icon:"📦"},
    {label:"Pending Invoices",val:stats.pendingInvoices||0,         col:C.yellow, icon:"🧾"},
  ];
  return (
    <div style={{padding:"20px",overflowY:"auto",flex:1}}>
      {loading?<Spinner/>:<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"20px"}}>
          {cards.map(c=>(
            <div key={c.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"16px"}}>
              <div style={{fontSize:"20px",marginBottom:"8px"}}>{c.icon}</div>
              <div style={{fontSize:"20px",fontWeight:"800",color:c.col}}>{c.val}</div>
              <div style={{fontSize:"11px",color:C.muted,marginTop:"4px"}}>{c.label}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
          {[["📦 Inventory",["Products","Stock Movement","Warehouses"],["inventory_products","inventory_stock","inventory_warehouses"]],
            ["💰 Sales",["Invoices","Customers"],["sales_invoices","sales_customers"]],
            ["🛒 Procurement",["Purchase Orders","Vendors"],["procurement_po","procurement_vendors"]],
            ["👤 HR",["Employees","Attendance","Payroll"],["hr_employees","hr_attendance","hr_payroll"]]
          ].map(([title,labels,ids])=>(
            <div key={title} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"16px"}}>
              <div style={{fontSize:"13px",fontWeight:"700",color:C.text,marginBottom:"12px"}}>{title}</div>
              {labels.map((l,i)=>(
                <div key={l} onClick={()=>navigate(ids[i])} style={{padding:"8px 10px",borderRadius:"6px",marginBottom:"4px",cursor:"pointer",color:C.muted,fontSize:"12px",display:"flex",alignItems:"center",gap:"8px"}}
                  onMouseOver={e=>e.currentTarget.style.background=C.muted2} onMouseOut={e=>e.currentTarget.style.background="transparent"}}>
                  {l}
                </div>
              ))}
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}

// ── PRODUCTS ──────────────────────────────────────────────────────
function Products() {
  const [page,setPage]     = useState(1);
  const [search,setSearch] = useState("");
  const [query,setQuery]   = useState("");
  const {data,loading,error,reload} = useApi(`/products?page=${page}&limit=20&search=${query}`,[page,query]);
  const products = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div style={{padding:"20px",flex:1,overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px"}}>
        <div style={{flex:1,fontSize:"16px",fontWeight:"700",color:C.text}}>Products</div>
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(setQuery(search),setPage(1))}
          placeholder="Search products..." style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"7px 12px",color:C.text,fontSize:"12px",width:"200px",outline:"none"}}/>
        <Btn onClick={()=>{setQuery(search);setPage(1);}}>Search</Btn>
      </div>
      {loading?<Spinner/>:error?<div style={{color:C.red,padding:"20px"}}>{error}</div>:products.length===0?<EmptyState icon="📦" msg="No products found. Add your first product."/>:(
        <>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
              <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
                {["SKU","Name","Category","Sale Price","Stock","Status"].map(h=>(
                  <th key={h} style={{padding:"10px 12px",textAlign:"left",color:C.muted,fontWeight:"600",fontSize:"10px"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {products.map(p=>(
                  <tr key={p.id} style={{borderBottom:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.background=C.muted2} onMouseOut={e=>e.currentTarget.style.background="transparent"}}>
                    <td style={{padding:"10px 12px",color:C.muted,fontFamily:"monospace"}}>{p.sku}</td>
                    <td style={{padding:"10px 12px",color:C.text,fontWeight:"600"}}>{p.name}</td>
                    <td style={{padding:"10px 12px",color:C.muted}}>{p.category_name||"—"}</td>
                    <td style={{padding:"10px 12px",color:C.green,fontWeight:"700"}}>Rs {fmt(p.sale_price)}</td>
                    <td style={{padding:"10px 12px",color:p.total_stock>0?C.text:C.red}}>{p.total_stock||0}</td>
                    <td style={{padding:"10px 12px"}}><Tag l={p.is_active?"Active":"Inactive"} col={p.is_active?C.green:C.red} sm/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:"12px",fontSize:"11px",color:C.muted}}>
            <span>Total: {pagination.total||0} products</span>
            <div style={{display:"flex",gap:"6px"}}>
              <Btn sm outline onClick={()=>setPage(p=>Math.max(1,p-1))} col={C.muted}>← Prev</Btn>
              <span style={{padding:"5px 10px",color:C.text}}>Page {pagination.page} of {pagination.totalPages||1}</span>
              <Btn sm outline onClick={()=>setPage(p=>p+1)} col={C.muted}>Next →</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── CUSTOMERS ─────────────────────────────────────────────────────
function Customers() {
  const [page,setPage]   = useState(1);
  const [search,setSearch] = useState("");
  const [query,setQuery] = useState("");
  const {data,loading,error} = useApi(`/customers?page=${page}&limit=20&search=${query}`,[page,query]);
  const customers = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div style={{padding:"20px",flex:1,overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px"}}>
        <div style={{flex:1,fontSize:"16px",fontWeight:"700",color:C.text}}>Customers</div>
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(setQuery(search),setPage(1))}
          placeholder="Search customers..." style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"7px 12px",color:C.text,fontSize:"12px",width:"200px",outline:"none"}}/>
        <Btn onClick={()=>{setQuery(search);setPage(1);}}>Search</Btn>
      </div>
      {loading?<Spinner/>:error?<div style={{color:C.red,padding:"20px"}}>{error}</div>:customers.length===0?<EmptyState icon="👥" msg="No customers found. Add your first customer."/>:(
        <>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
              <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
                {["Name","Phone","City","Balance","Status"].map(h=>(
                  <th key={h} style={{padding:"10px 12px",textAlign:"left",color:C.muted,fontWeight:"600",fontSize:"10px"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {customers.map(c=>(
                  <tr key={c.id} style={{borderBottom:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.background=C.muted2} onMouseOut={e=>e.currentTarget.style.background="transparent"}}>
                    <td style={{padding:"10px 12px",color:C.text,fontWeight:"600"}}>{c.name}</td>
                    <td style={{padding:"10px 12px",color:C.muted}}>{c.phone||"—"}</td>
                    <td style={{padding:"10px 12px",color:C.muted}}>{c.city||"—"}</td>
                    <td style={{padding:"10px 12px",color:c.balance>0?C.red:C.green,fontWeight:"700"}}>Rs {fmt(Math.abs(c.balance||0))}</td>
                    <td style={{padding:"10px 12px"}}><Tag l={c.is_active?"Active":"Inactive"} col={c.is_active?C.green:C.red} sm/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:"12px",fontSize:"11px",color:C.muted}}>
            <span>Total: {pagination.total||0} customers</span>
            <div style={{display:"flex",gap:"6px"}}>
              <Btn sm outline onClick={()=>setPage(p=>Math.max(1,p-1))} col={C.muted}>← Prev</Btn>
              <span style={{padding:"5px 10px",color:C.text}}>Page {pagination.page} of {pagination.totalPages||1}</span>
              <Btn sm outline onClick={()=>setPage(p=>p+1)} col={C.muted}>Next →</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── INVOICES ──────────────────────────────────────────────────────
function Invoices() {
  const [page,setPage] = useState(1);
  const {data,loading,error} = useApi(`/invoices?page=${page}&limit=20`,[page]);
  const invoices = data?.data || [];
  const pagination = data?.pagination || {};

  const statusColor = s => ({draft:C.muted,posted:C.blue,paid:C.green,void:C.red,partial:C.yellow}[s]||C.muted);

  return (
    <div style={{padding:"20px",flex:1,overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px"}}>
        <div style={{flex:1,fontSize:"16px",fontWeight:"700",color:C.text}}>Invoices</div>
      </div>
      {loading?<Spinner/>:error?<div style={{color:C.red,padding:"20px"}}>{error}</div>:invoices.length===0?<EmptyState icon="🧾" msg="No invoices found."/>:(
        <>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
              <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
                {["Invoice #","Customer","Date","Amount","Status"].map(h=>(
                  <th key={h} style={{padding:"10px 12px",textAlign:"left",color:C.muted,fontWeight:"600",fontSize:"10px"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {invoices.map(inv=>(
                  <tr key={inv.id} style={{borderBottom:`1px solid ${C.border}`}} onMouseOver={e=>e.currentTarget.style.background=C.muted2} onMouseOut={e=>e.currentTarget.style.background="transparent"}}>
                    <td style={{padding:"10px 12px",color:C.accent,fontWeight:"700"}}>{inv.invoice_number||inv.id?.slice(0,8)}</td>
                    <td style={{padding:"10px 12px",color:C.text}}>{inv.customer_name||"Walk-in"}</td>
                    <td style={{padding:"10px 12px",color:C.muted}}>{inv.created_at?.slice(0,10)||"—"}</td>
                    <td style={{padding:"10px 12px",color:C.green,fontWeight:"700"}}>Rs {fmt(inv.total_amount)}</td>
                    <td style={{padding:"10px 12px"}}><Tag l={inv.status} col={statusColor(inv.status)} sm/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:"12px",fontSize:"11px",color:C.muted}}>
            <span>Total: {pagination.total||0} invoices</span>
            <div style={{display:"flex",gap:"6px"}}>
              <Btn sm outline onClick={()=>setPage(p=>Math.max(1,p-1))} col={C.muted}>← Prev</Btn>
              <span style={{padding:"5px 10px",color:C.text}}>Page {pagination.page} of {pagination.totalPages||1}</span>
              <Btn sm outline onClick={()=>setPage(p=>p+1)} col={C.muted}>Next →</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── VENDORS ───────────────────────────────────────────────────────
function Vendors() {
  const [page,setPage] = useState(1);
  const {data,loading,error} = useApi(`/vendors?page=${page}&limit=20`,[page]);
  const vendors = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div style={{padding:"20px",flex:1,overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px"}}>
        <div style={{flex:1,fontSize:"16px",fontWeight:"700",color:C.text}}>Vendors</div>
      </div>
      {loading?<Spinner/>:error?<div style={{color:C.red,padding:"20px"}}>{error}</div>:vendors.length===0?<EmptyState icon="🏢" msg="No vendors found."/>:(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
            <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
              {["Name","Phone","City","Balance"].map(h=>(
                <th key={h} style={{padding:"10px 12px",textAlign:"left",color:C.muted,fontWeight:"600",fontSize:"10px"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {vendors.map(v=>(
                <tr key={v.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"10px 12px",color:C.text,fontWeight:"600"}}>{v.name}</td>
                  <td style={{padding:"10px 12px",color:C.muted}}>{v.phone||"—"}</td>
                  <td style={{padding:"10px 12px",color:C.muted}}>{v.city||"—"}</td>
                  <td style={{padding:"10px 12px",color:C.red,fontWeight:"700"}}>Rs {fmt(Math.abs(v.balance||0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── EMPLOYEES ─────────────────────────────────────────────────────
function Employees() {
  const {data,loading,error} = useApi("/hr/employees");
  const employees = data?.data || [];

  return (
    <div style={{padding:"20px",flex:1,overflowY:"auto"}}>
      <div style={{fontSize:"16px",fontWeight:"700",color:C.text,marginBottom:"16px"}}>Employees</div>
      {loading?<Spinner/>:error?<div style={{color:C.red,padding:"20px"}}>{error}</div>:employees.length===0?<EmptyState icon="👥" msg="No employees found."/>:(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
            <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
              {["Name","Designation","Department","Phone","Status"].map(h=>(
                <th key={h} style={{padding:"10px 12px",textAlign:"left",color:C.muted,fontWeight:"600",fontSize:"10px"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {employees.map(e=>(
                <tr key={e.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"10px 12px",color:C.text,fontWeight:"600"}}>{e.name}</td>
                  <td style={{padding:"10px 12px",color:C.muted}}>{e.designation||"—"}</td>
                  <td style={{padding:"10px 12px",color:C.muted}}>{e.department_name||"—"}</td>
                  <td style={{padding:"10px 12px",color:C.muted}}>{e.phone||"—"}</td>
                  <td style={{padding:"10px 12px"}}><Tag l={e.is_active?"Active":"Inactive"} col={e.is_active?C.green:C.red} sm/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── PLACEHOLDER ───────────────────────────────────────────────────
function Placeholder({title,icon,features=[]}) {
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px"}}>
      <div style={{fontSize:"48px",marginBottom:"16px"}}>{icon}</div>
      <div style={{fontSize:"20px",fontWeight:"800",color:C.text,marginBottom:"8px"}}>{title}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginTop:"20px",maxWidth:"480px"}}>
        {features.map(f=><div key={f} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"10px 14px",fontSize:"11px",color:C.muted}}>✓ {f}</div>)}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────
export default function InfosysPakERP() {
  const [user,setUser]         = useState(()=>{
    const t = localStorage.getItem("token");
    return t ? JSON.parse(localStorage.getItem("user")||"null") : null;
  });
  const [route,setRoute]       = useState("dashboard");
  const [collapsed,setCollapsed] = useState(false);

  const navigate = r => setRoute(r);
  const onLogin  = u => { setUser(u); localStorage.setItem("user",JSON.stringify(u)); setRoute("dashboard"); };
  const onLogout = () => { setUser(null); localStorage.removeItem("token"); localStorage.removeItem("user"); };

  useEffect(() => {
    const autoLogin = async () => {
      if (!user) {
        try {
          const r = await apiFetch("/auth/login", { method:"POST", body:{email: "admin@erp.pk", password: "Admin@123", tenantSlug: "admin"} });
          localStorage.setItem("token", r.data.accessToken);
          onLogin(r.data.user);
        } catch (e) {
          console.error("Auto-login failed:", e);
        }
      }
    };
    autoLogin();
  }, [user]);

  if(!user) return <LoginScreen onLogin={onLogin}/>;

  const content = () => {
    if(route==="dashboard")                    return <Dashboard navigate={navigate}/>;
    if(route==="inventory_products")           return <Products/>;
    if(route==="sales_customers")              return <Customers/>;
    if(route==="sales_invoices")               return <Invoices/>;
    if(route==="procurement_vendors")          return <Vendors/>;
    if(route==="hr_employees")                 return <Employees/>;
    if(route==="inventory_stock")              return <Placeholder title="Stock Movement" icon="🔄" features={["Stock In","Stock Out","Transfers","Adjustments","Movement Log","Valuation"]}/>;
    if(route==="inventory_warehouses")         return <Placeholder title="Warehouses" icon="🏭" features={["Multi-WH","Stock Levels","Transfers","Default WH","Branch Link","Valuation"]}/>;
    if(route==="procurement_po")               return <Placeholder title="Purchase Orders" icon="📄" features={["Create PO","Approve PO","GRN","Vendor Ledger","AP Aging","Price History"]}/>;
    if(route==="accounting_coa")               return <Placeholder title="Chart of Accounts" icon="🗂" features={["Account Groups","Sub Accounts","Opening Balance","Account Types","Active/Inactive","Hierarchy"]}/>;
    if(route==="accounting_vouchers")          return <Placeholder title="Vouchers" icon="📝" features={["Journal Entry","Payment Voucher","Receipt Voucher","Post","Reverse","Print"]}/>;
    if(route==="accounting_ledger")            return <Placeholder title="Ledger" icon="📒" features={["Account Ledger","Date Filter","Opening Balance","Closing Balance","Print","Export"]}/>;
    if(route==="accounting_trial")             return <Placeholder title="Trial Balance" icon="⚖️" features={["Trial Balance","Date Filter","Group By","Debit/Credit","Print","Export"]}/>;
    if(route==="hr_attendance")                return <Placeholder title="Attendance" icon="📅" features={["Mark Attendance","Monthly View","Late/Early","OT Calculation","Report","Export"]}/>;
    if(route==="hr_payroll")                   return <Placeholder title="Payroll" icon="💳" features={["Calculate Payroll","Approve","Salary Slips","EOBI","PESSI","Bank File"]}/>;
    if(route==="hr_leaves")                    return <Placeholder title="Leave Requests" icon="🌴" features={["Apply Leave","Approve/Reject","Leave Types","Balance","Calendar","Report"]}/>;
    if(route==="settings")                     return <Placeholder title="Settings" icon="⚙" features={["Company Info","Branches","Users","Roles","FBR Config","Backup"]}/>;
    return <Dashboard navigate={navigate}/>;
  };

  return (
    <AuthCtx.Provider value={{user,route,navigate}}>
      <div style={{display:"flex",height:"100vh",background:C.bg,color:C.text,fontFamily:"'IBM Plex Sans',sans-serif",fontSize:"13px",overflow:"hidden"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#162030;border-radius:4px}input,select,textarea,button{font-family:inherit}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
        <Sidebar route={route} navigate={navigate} user={user} collapsed={collapsed} setCollapsed={setCollapsed}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <TopBar route={route} user={user} onLogout={onLogout}/>
          <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",animation:"fadeUp .18s ease"}}>
            {content()}
          </div>
        </div>
      </div>
    </AuthCtx.Provider>
  );
}


// ================================================================
// INFOSYS PAK ERP — UNIFIED APP SHELL (FINAL)
// This file has been modified to include all functional modules.
// ================================================================
import { useState, useEffect, createContext, useContext } from "react";
import PosTerminal from './PosTerminal';
import Inventory from './Inventory';
import Procurement from './Procurement';
import Accounting from './Accounting';
import ReportsFbr from './ReportsFbr';
import HrPayroll from './HrPayroll';
import { PrintDesigner, SuperAdmin } from './PrintSuperAdmin';

const C = {
  bg:"#060a10",sidebar:"#070d16",panel:"#0a1220",card:"#0d1825",
  border:"#162030",text:"#dce4f0",muted:"#4a6070",muted2:"#223040",
  accent:"#f97316",blue:"#3b82f6",green:"#10b981",red:"#ef4444",
  yellow:"#f59e0b",purple:"#8b5cf6",teal:"#06b6d4",input:"#070f1a",
};
const fmt = n => new Intl.NumberFormat("en-PK").format(Math.round(n));
const AuthCtx = createContext(null);

const USERS = [
  { id:"u1",name:"Ahmed Raza",  email:"admin@albaraka.pk",   password:"admin123", role:"Admin",      avatar:"AR",branch:"Lahore Main", company:"Al-Baraka Textiles"},
  { id:"u2",name:"Sana Butt",   email:"accounts@albaraka.pk",password:"sana123",  role:"Accountant", avatar:"SB",branch:"Islamabad",   company:"Al-Baraka Textiles"},
  { id:"u3",name:"Tariq Hassan",email:"cashier@albaraka.pk", password:"tariq123", role:"Cashier",    avatar:"TH",branch:"Karachi",     company:"Al-Baraka Textiles"},
  { id:"u4",name:"Super Admin", email:"sa@infosys.pk",       password:"super123", role:"Super Admin",avatar:"SA",branch:"All Branches",company:"Infosys Pak"},
];

const ROLE_PERMS = {
  "Super Admin":["*"],
  "Admin":["dashboard","pos","inventory","procurement","sales","accounting","reports","hr","printdesigner","settings","superadmin"],
  "Accountant":["dashboard","accounting","reports","settings"],
  "Cashier":["dashboard","pos"],
};

const NAV = [
  {id:"dashboard",   label:"Dashboard",     labelUr:"ڈیش بورڈ",     icon:"⊞"},
  {id:"pos",         label:"POS Terminal",  labelUr:"پوائنٹ آف سیل",icon:"🖥"},
  {id:"_d1",divider:true},
  {id:"inventory",   label:"Inventory",     labelUr:"انوینٹری",     icon:"📦",children:[
    {id:"inventory_products",  label:"Products",       icon:"📋"},
    {id:"inventory_stock",     label:"Stock Movement", icon:"🔄"},
    {id:"inventory_warehouses",label:"Warehouses",     icon:"🏭"},
    {id:"inventory_barcode",   label:"Barcodes",       icon:"▦"},
  ]},
  {id:"procurement", label:"Procurement",   labelUr:"خریداری",      icon:"🛒",children:[
    {id:"procurement_po",     label:"Purchase Orders",icon:"📄"},
    {id:"procurement_vendors",label:"Vendors",        icon:"🏢"},
    {id:"procurement_grn",    label:"Receive Stock",  icon:"📥"},
  ]},
  {id:"sales",       label:"Sales",         labelUr:"فروخت",        icon:"💰",children:[
    {id:"sales_invoices", label:"Invoices",  icon:"🧾"},
    {id:"sales_customers",label:"Customers", icon:"👥"},
    {id:"sales_returns",  label:"Returns",   icon:"↩"},
  ]},
  {id:"_d2",divider:true},
  {id:"accounting",  label:"Accounting",    labelUr:"اکاؤنٹنگ",     icon:"📒",children:[
    {id:"accounting_coa",     label:"Chart of Accounts",icon:"🗂"},
    {id:"accounting_vouchers",label:"Vouchers",         icon:"📝"},
    {id:"accounting_ledger",  label:"Ledger",           icon:"📒"},
    {id:"accounting_trial",   label:"Trial Balance",    icon:"⚖️"},
    {id:"accounting_pl",      label:"Profit & Loss",    icon:"📊"},
    {id:"accounting_bs",      label:"Balance Sheet",    icon:"🏦"},
  ]},
  {id:"reports",     label:"Reports",       labelUr:"رپورٹس",       icon:"📈",children:[
    {id:"reports_overview", label:"Overview",        icon:"📊"},
    {id:"reports_sales",    label:"Sales Report",    icon:"📈"},
    {id:"reports_products", label:"Product Report",  icon:"📦"},
    {id:"reports_aging",    label:"Aging Report",    icon:"⏳"},
    {id:"reports_zreport",  label:"Z-Report",        icon:"🖨"},
    {id:"reports_fbr",      label:"FBR Integration", icon:"🏛"},
  ]},
  {id:"_d3",divider:true},
  {id:"hr",          label:"HR & Payroll",  labelUr:"ایچ آر",       icon:"👤",children:[
    {id:"hr_employees", label:"Employees",      icon:"👥"},
    {id:"hr_attendance",label:"Attendance",     icon:"📅"},
    {id:"hr_payroll",   label:"Payroll",        icon:"💳"},
    {id:"hr_leaves",    label:"Leave Requests", icon:"🌴"},
  ]},
  {id:"printdesigner",label:"Print Designer",labelUr:"پرنٹ ڈیزائنر",icon:"🖨"},
  {id:"settings",    label:"Settings",      labelUr:"سیٹنگز",       icon:"⚙"},
  {id:"superadmin",  label:"Super Admin",   labelUr:"سپر ایڈمن",    icon:"🔐",superAdminOnly:true},
];

const NOTIFS = [
  {title:"FBR sync failed — INV-2024-08738",   time:"10 min ago", icon:"🚫",read:false},
  {title:"Low stock: Bonanza Sweater (5 units)",time:"25 min ago",icon:"⚠", read:false},
  {title:"Payment received — Hassan Fabrics",   time:"1 hr ago",  icon:"💰",read:true},
  {title:"Nightly backup completed (3.2 GB)",   time:"8 hrs ago", icon:"💾",read:true},
  {title:"New customer: Khan Traders",          time:"1 day ago", icon:"👤",read:true},
];

function useClock() {
  const [t,setT] = useState(new Date());
  useEffect(()=>{ const id=setInterval(()=>setT(new Date()),1000); return ()=>clearInterval(id); },[]);
  return t;
}

function Tag({l,col,sm}){
  return <span style={{fontSize:sm?"9px":"10px",fontWeight:"700",padding:sm?"1px 5px":"2px 8px",borderRadius:"20px",background:`${col}18`,color:col,border:`1px solid ${col}28`,whiteSpace:"nowrap"}}>{l}</span>;
}

function LoginScreen({onLogin}){
  const [email,setEmail]       = useState("admin@albaraka.pk");
  const [pass,setPass]         = useState("admin123");
  const [err,setErr]           = useState("");
  const [loading,setLoading]   = useState(false);
  const [showPass,setShowPass] = useState(false);

  const doLogin = async()=>{
    setLoading(true); setErr("");
    await new Promise(r=>setTimeout(r,800));
    const u = USERS.find(u=>u.email===email&&u.password===pass);
    if(u) onLogin(u);
    else { setErr("Invalid email or password"); setLoading(false); }
  };

  return(
    <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:"'IBM Plex Sans',sans-serif",overflow:"hidden"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes glow{0%,100%{box-shadow:0 20px 60px rgba(249,115,22,.35)}50%{box-shadow:0 20px 80px rgba(249,115,22,.55)}}input,button{font-family:inherit}`}</style>
      <div style={{flex:1,background:"linear-gradient(135deg,#040c18 0%,#091525 60%,#050e1c 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(59,130,246,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.04) 1px,transparent 1px)",backgroundSize:"44px 44px"}}/>
        <div style={{position:"absolute",top:"18%",left:"22%",width:"280px",height:"280px",borderRadius:"50%",background:"radial-gradient(circle,rgba(249,115,22,.13) 0%,transparent 70%)",filter:"blur(40px)"}}/>
        <div style={{position:"absolute",bottom:"22%",right:"18%",width:"220px",height:"220px",borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,.1) 0%,transparent 70%)",filter:"blur(40px)"}}/>
        <div style={{position:"relative",textAlign:"center",animation:"fadeUp .8s ease both"}}>
          <div style={{width:"88px",height:"88px",borderRadius:"22px",background:"linear-gradient(135deg,#f97316,#ea580c)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"34px",fontWeight:"900",color:"#fff",margin:"0 auto 22px",animation:"float 3s ease-in-out infinite,glow 3s ease-in-out infinite"}}>IP</div>
          <div style={{fontSize:"30px",fontWeight:"900",color:"#fff",letterSpacing:"-0.02em",marginBottom:"8px"}}>Infosys Pak ERP</div>
          <div style={{fontSize:"13px",color:"rgba(255,255,255,.4)",marginBottom:"38px",letterSpacing:".02em"}}>Enterprise Resource Planning · Pakistani Business</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"7px",justifyContent:"center",marginBottom:"44px"}}>
            {["FBR Compliant","Multi-Tenant","Double-Entry Accounting","Urdu / English RTL","Multi-Warehouse","POS + Barcode"].map(f=>( <div key={f} style={{padding:"4px 11px",borderRadius:"20px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",fontSize:"10px",color:"rgba(255,255,255,.55)",fontWeight:"600"}}>{f}</div> ))}
          </div>
          <div style={{display:"flex",gap:"28px",justifyContent:"center"}}>
            {[{v:"8",l:"Modules"},{v:"FBR",l:"Integrated"},{v:"RTL",l:"Urdu Support"},{v:"SaaS",l:"Multi-Tenant"}].map(s=>( <div key={s.l} style={{textAlign:"center"}}> <div style={{fontSize:"20px",fontWeight:"900",color:C.accent}}>{s.v}</div> <div style={{fontSize:"9px",color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:".08em",marginTop:"2px"}}>{s.l}</div> </div> ))}
          </div>
        </div>
      </div>
      <div style={{width:"440px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 40px",background:C.panel,borderLeft:`1px solid ${C.border}`}}>
        <div style={{width:"100%",maxWidth:"340px",animation:"fadeUp .6s ease .15s both"}}>
          <div style={{marginBottom:"28px"}}><div style={{fontSize:"22px",fontWeight:"900",color:C.text,marginBottom:"5px"}}>Sign In</div><div style={{fontSize:"12px",color:C.muted}}>Access your ERP workspace</div></div>
          <div style={{marginBottom:"20px"}}>
            <div style={{fontSize:"10px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"7px"}}>Quick Demo Accounts</div>
            <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
              {USERS.map(u=>( <button key={u.id} onClick={()=>{setEmail(u.email);setPass(u.password);}} style={{padding:"4px 10px",borderRadius:"6px",border:`1px solid ${email===u.email?C.accent:C.border}`,background:email===u.email?`${C.accent}18`:C.card,color:email===u.email?C.accent:C.muted,cursor:"pointer",fontSize:"10px",fontWeight:"700",transition:"all .15s"}}> {u.role} </button> ))}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"13px"}}>
            <div>
              <label style={{fontSize:"10px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:"5px"}}>Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" style={{width:"100%",background:C.input,border:`1px solid ${err?C.red:C.border}`,borderRadius:"8px",padding:"11px 13px",color:C.text,fontSize:"13px",outline:"none"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=err?C.red:C.border}/>
            </div>
            <div>
              <label style={{fontSize:"10px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:"5px"}}>Password</label>
              <div style={{position:"relative"}}>
                <input value={pass} onChange={e=>setPass(e.target.value)} type={showPass?"text":"password"} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{width:"100%",background:C.input,border:`1px solid ${err?C.red:C.border}`,borderRadius:"8px",padding:"11px 40px 11px 13px",color:C.text,fontSize:"13px",outline:"none"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=err?C.red:C.border}/>
                <button onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:"11px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"14px"}}>{showPass?"🙈":"👁"}</button>
              </div>
            </div>
            {err&&<div style={{padding:"9px 12px",background:`${C.red}15`,border:`1px solid ${C.red}44`,borderRadius:"7px",fontSize:"11px",color:C.red}}>⚠ {err}</div>}
            <button onClick={doLogin} disabled={loading} style={{padding:"12px",borderRadius:"8px",border:"none",background:loading?"#1a2a3a":"linear-gradient(135deg,#f97316,#ea580c)",color:loading?C.muted:"#fff",cursor:loading?"not-allowed":"pointer",fontSize:"13px",fontWeight:"800",marginTop:"4px",display:"flex",alignItems:"center",justifyContent:"center",gap:"7px"}}>
              {loading?<><span style={{display:"inline-block",animation:"spin .8s linear infinite"}}>⟳</span>Signing in...</>:"Sign In →"}
            </button>
          </div>
          <div style={{marginTop:"24px",padding:"12px",background:C.card,borderRadius:"8px",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:"9px",color:C.muted,marginBottom:"4px",fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em"}}>Selected Account</div>
            <div style={{fontSize:"12px",color:C.text,fontWeight:"700"}}>{USERS.find(u=>u.email===email)?.name||"—"}</div>
            <div style={{fontSize:"10px",color:C.muted}}>{USERS.find(u=>u.email===email)?.role} · {USERS.find(u=>u.email===email)?.company}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar({route,navigate,user,collapsed,setCollapsed,lang}){
  const [open,setOpen] = useState(new Set(["inventory","accounting","reports","hr","sales","procurement"]));
  const perms = ROLE_PERMS[user.role]||[];
  const can   = id => perms.includes("*")||perms.includes(id.split("_")[0]);
  const toggle= id => setOpen(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });

  return(
    <div style={{width:collapsed?"52px":"224px",background:C.sidebar,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",transition:"width .2s ease",flexShrink:0,overflow:"hidden"}}>
      <div style={{height:"56px",display:"flex",alignItems:"center",padding:collapsed?"0 10px":"0 14px",borderBottom:`1px solid ${C.border}`,gap:"9px",flexShrink:0,cursor:"pointer"}} onClick={()=>setCollapsed(!collapsed)}>
        <div style={{width:"30px",height:"30px",borderRadius:"7px",background:"linear-gradient(135deg,#f97316,#ea580c)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",fontSize:"11px",color:"#fff",flexShrink:0}}>IP</div>
        {!collapsed&&<div><div style={{fontSize:"12px",fontWeight:"800",color:"#fff",whiteSpace:"nowrap"}}>Infosys Pak</div><div style={{fontSize:"8px",color:C.muted}}>ERP System</div></div>}
      </div>
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:"6px 0"}}>
        {NAV.map(item=>{
          if(item.divider) return !collapsed?<div key={item.id} style={{height:"1px",background:C.border,margin:"5px 10px"}}/>:null;
          if(item.superAdminOnly&&user.role!=="Super Admin") return null;
          if(!can(item.id)) return null;
          const active   = route===item.id||route.startsWith(item.id+"_");
          const expanded = open.has(item.id);
          const hasKids  = item.children?.length>0;

          return(
            <div key={item.id}>
              <div onClick={()=>hasKids?toggle(item.id):navigate(item.id)} style={{display:"flex",alignItems:"center",gap:"8px",padding:collapsed?"8px 11px":"7px 12px",cursor:"pointer",background:active?`${C.accent}18`:"transparent",borderLeft:`3px solid ${active?C.accent:"transparent"}`,transition:"all .12s"}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background=C.panel}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent"}} title={collapsed?(lang==="ur"?item.labelUr:item.label):""}>
                <span style={{fontSize:"14px",flexShrink:0,width:"18px",textAlign:"center"}}>{item.icon}</span>
                {!collapsed&&<>
                  <span style={{fontSize:"11px",fontWeight:active?"700":"500",color:active?C.accent:C.text,flex:1,whiteSpace:"nowrap"}}>{lang==="ur"?(item.labelUr||item.label):item.label}</span>
                  {hasKids&&<span style={{fontSize:"8px",color:C.muted,transition:"transform .2s",transform:expanded?"rotate(90deg)":"rotate(0deg)"}}>▶</span>}
                </>}
              </div>
              {hasKids&&!collapsed&&expanded&&(
                <div style={{background:"rgba(0,0,0,.15)",borderLeft:`1px solid ${C.border}`,marginLeft:"26px"}}>
                  {item.children.map(ch=>{
                    const ca=route===ch.id;
                    return(
                      <div key={ch.id} onClick={()=>navigate(ch.id)} style={{display:"flex",alignItems:"center",gap:"7px",padding:"5px 11px",cursor:"pointer",background:ca?`${C.blue}12`:"transparent",borderLeft:`2px solid ${ca?C.blue:"transparent"}`,transition:"all .12s"}} onMouseEnter={e=>{if(!ca)e.currentTarget.style.background=C.panel}} onMouseLeave={e=>{if(!ca)e.currentTarget.style.background="transparent"}}>
                        <span style={{fontSize:"10px",opacity:.7}}>{ch.icon}</span>
                        <span style={{fontSize:"10px",color:ca?C.blue:C.muted,fontWeight:ca?"700":"400"}}>{ch.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!collapsed&&(
        <div style={{padding:"10px 12px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"linear-gradient(135deg,#f97316,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"800",fontSize:"9px",flexShrink:0}}>{user.avatar}</div>
            <div style={{flex:1,overflow:"hidden"}}>
              <div style={{fontSize:"11px",fontWeight:"700",color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</div>
              <div style={{fontSize:"8px",color:C.muted}}>{user.role}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar({route,user,lang,setLang,notifs,onLogout,markRead}){
  const clock = useClock();
  const [userMenu,setUserMenu]   = useState(false);
  const [notifMenu,setNotifMenu] = useState(false);
  const unread = notifs.filter(n=>!n.read).length;

  const label = (()=>{
    for(const item of NAV){
      if(item.id===route) return item.label;
      if(item.children) for(const c of item.children) if(c.id===route) return `${item.label} › ${c.label}`;
    }
    return route;
  })();

  return(
    <div style={{height:"56px",background:C.bg,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 18px",gap:"12px",flexShrink:0,position:"relative",zIndex:50}}>
      <div style={{flex:1}}>
        <div style={{fontSize:"14px",fontWeight:"700",color:C.text}}>{label}</div>
        <div style={{fontSize:"9px",color:C.muted}}>{user.company} · {user.branch}</div>
      </div>

      <div style={{fontSize:"10px",color:C.muted,fontFamily:"'IBM Plex Mono'",textAlign:"right"}}>
        <div style={{color:C.text,fontWeight:"600"}}>{clock.toLocaleTimeString("en-PK",{hour12:true})}</div>
        <div style={{fontSize:"8px"}}>{clock.toLocaleDateString("en-PK",{weekday:"short",day:"numeric",month:"short"})}</div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:"5px",padding:"4px 9px",borderRadius:"20px",background:`${C.green}12`,border:`1px solid ${C.green}30`}}>
        <div style={{width:"6px",height:"6px",borderRadius:"50%",background:C.green}}/>
        <span style={{fontSize:"9px",color:C.green,fontWeight:"600"}}>FBR Online</span>
      </div>

      <button onClick={()=>setLang(l=>l==="en"?"ur":"en")} style={{padding:"4px 9px",borderRadius:"6px",border:`1px solid ${C.border}`,background:C.panel,color:C.text,cursor:"pointer",fontSize:"11px",fontWeight:"700"}}>
        {lang==="en"?"اردو":"EN"}
      </button>

      <div style={{position:"relative"}}>
        <button onClick={()=>{setNotifMenu(!notifMenu);setUserMenu(false);}} style={{width:"32px",height:"32px",borderRadius:"7px",border:`1px solid ${C.border}`,background:C.panel,cursor:"pointer",fontSize:"14px",position:"relative",display:"flex",alignItems:"center",justifyContent:"center",color:C.text}}>
          🔔
          {unread>0&&<div style={{position:"absolute",top:"-3px",right:"-3px",width:"14px",height:"14px",borderRadius:"50%",background:C.red,fontSize:"8px",fontWeight:"800",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{unread}</div>}
        </button>
        {notifMenu&&(
          <div style={{position:"absolute",top:"calc(100% + 7px)",right:0,width:"300px",background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",boxShadow:"0 16px 48px rgba(0,0,0,.55)",zIndex:200,overflow:"hidden"}}>
            <div style={{padding:"11px 13px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"12px",fontWeight:"700",color:C.text}}>Notifications</span>
              <button onClick={markRead} style={{fontSize:"9px",color:C.blue,background:"none",border:"none",cursor:"pointer",fontWeight:"700"}}>Mark all read</button>
            </div>
            {notifs.map((n,i)=>( <div key={i} style={{padding:"10px 13px",borderBottom:`1px solid ${C.border}`,background:!n.read?`${C.blue}07`:"transparent",display:"flex",gap:"9px",alignItems:"flex-start"}}> <span style={{fontSize:"14px",flexShrink:0}}>{n.icon}</span> <div style={{flex:1}}> <div style={{fontSize:"11px",fontWeight:!n.read?"700":"400",color:C.text}}>{n.title}</div> <div style={{fontSize:"9px",color:C.muted}}>{n.time}</div> </div> {!n.read&&<div style={{width:"6px",height:"6px",borderRadius:"50%",background:C.blue,marginTop:"5px",flexShrink:0}}/>} </div> ))}
          </div>
        )}
      </div>

      <div style={{position:"relative"}}>
        <div onClick={()=>{setUserMenu(!userMenu);setNotifMenu(false);}} style={{display:"flex",alignItems:"center",gap:"7px",cursor:"pointer",padding:"4px 8px",borderRadius:"7px",border:`1px solid ${C.border}`,background:C.panel}}>
          <div style={{width:"24px",height:"24px",borderRadius:"50%",background:"linear-gradient(135deg,#f97316,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"800",fontSize:"8px"}}>{user.avatar}</div>
          <span style={{fontSize:"11px",color:C.text,fontWeight:"600"}}>{user.name.split(" ")[0]}</span>
          <span style={{fontSize:"8px",color:C.muted}}>▼</span>
        </div>
        {userMenu&&(
          <div style={{position:"absolute",top:"calc(100% + 7px)",right:0,width:"190px",background:C.card,border:`1px solid ${C.border}`,borderRadius:"9px",boxShadow:"0 16px 48px rgba(0,0,0,.55)",zIndex:200,overflow:"hidden"}}>
            <div style={{padding:"11px 13px",borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:"12px",fontWeight:"700",color:C.text}}>{user.name}</div>
              <div style={{fontSize:"9px",color:C.muted}}>{user.role} · {user.email}</div>
            </div>
            {[{l:"👤 My Profile"},{l:"⚙ Settings"},{l:"🔑 Change Password"},{l:"📤 Sign Out",fn:onLogout,col:C.red}].map(m=>( <div key={m.l} onClick={()=>{m.fn?.();setUserMenu(false);}} style={{padding:"9px 13px",cursor:"pointer",fontSize:"11px",color:m.col||C.text,borderBottom:`1px solid ${C.border}`}} onMouseEnter={e=>e.currentTarget.style.background=C.panel} onMouseLeave={e=>e.currentTarget.style.background="transparent"}> {m.l} </div> ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Dashboard({navigate}){
  const STATS=[
    {l:"Today's Sales",   v:"PKR 245,000",change:"+12%", up:true, ic:"💰",col:C.green},
    {l:"Total Invoices",  v:"34",          change:"+5",   up:true, ic:"🧾",col:C.blue},
    {l:"FBR Pending",     v:"1",           change:"failed",up:false,ic:"🏛",col:C.yellow},
    {l:"Low Stock Items", v:"3",           change:"reorder",up:false,ic:"📦",col:C.red},
    {l:"Receivables Due", v:"PKR 871K",    change:"3 accts",up:false,ic:"⏳",col:C.accent},
    {l:"Net Profit (Mo)", v:"PKR 2.1M",   change:"+18.7%",up:true, ic:"📈",col:C.purple},
  ];
  const RECENT=[
    {inv:"INV-2024-08741",cust:"Al-Fatah Traders",amt:245000,status:"paid",   fbr:"synced"},
    {inv:"INV-2024-08739",cust:"City Garments",   amt:78500, status:"partial",fbr:"synced"},
    {inv:"INV-2024-08738",cust:"Hassan Fabrics",  amt:124000,status:"pending",fbr:"failed"},
    {inv:"INV-2024-08735",cust:"Rehman Sons",     amt:55000, status:"paid",   fbr:"synced"},
    {inv:"INV-2024-08730",cust:"Walk-in",         amt:12500, status:"paid",   fbr:"pending"},
  ];
  const QUICK=[
    {l:"New Invoice",   ic:"➕",r:"pos",           col:C.green},
    {l:"Add Product",   ic:"📦",r:"inventory_products",col:C.blue},
    {l:"Add Customer",  ic:"👤",r:"sales_customers",col:C.teal},
    {l:"Cash Receipt",  ic:"💵",r:"accounting_vouchers",col:C.accent},
    {l:"View Reports",  ic:"📊",r:"reports_overview",col:C.purple},
    {l:"Z-Report",      ic:"🖨",r:"reports_zreport", col:C.yellow},
  ];

  return(
    <div style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:"16px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:"10px"}}>
        {STATS.map(s=>( <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"13px 15px",position:"relative",overflow:"hidden",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=s.col+"55"} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}> <div style={{position:"absolute",top:0,right:0,width:"40px",height:"40px",borderRadius:"0 10px 0 40px",background:`${s.col}12`}}/> <div style={{fontSize:"9px",color:C.muted,fontWeight:"600",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"4px"}}>{s.l}</div> <div style={{fontSize:"18px",fontWeight:"900",color:C.text}}>{s.v}</div> <div style={{fontSize:"9px",fontWeight:"700",color:s.up?C.green:s.col,marginTop:"3px"}}>{s.up?"▲":"▼"} {s.change}</div> <div style={{position:"absolute",bottom:0,left:0,height:"3px",width:"100%",background:`linear-gradient(90deg,${s.col},transparent)`}}/> </div> ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:"14px"}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
          <div style={{padding:"13px 15px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}> <span style={{fontSize:"13px",fontWeight:"800",color:C.text}}>Recent Invoices</span> <button onClick={()=>navigate("sales_invoices")} style={{padding:"4px 9px",borderRadius:"5px",border:`1px solid ${C.border}`,background:"transparent",color:C.blue,cursor:"pointer",fontSize:"9px",fontWeight:"700"}}>View All →</button> </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Invoice","Customer","Amount","Status","FBR"].map(h=><th key={h} style={{padding:"7px 13px",fontSize:"8px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:".06em",borderBottom:`1px solid ${C.border}`,textAlign:h==="Amount"?"right":"left"}}>{h}</th>)}</tr></thead>
            <tbody>
              {RECENT.map((r,i)=>( <tr key={i} style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.panel} onMouseLeave={e=>e.currentTarget.style.background="transparent"}> <td style={{padding:"9px 13px",fontSize:"10px",fontWeight:"700",color:C.blue,fontFamily:"'IBM Plex Mono'"}}>{r.inv}</td> <td style={{padding:"9px 13px",fontSize:"11px",color:C.text}}>{r.cust}</td> <td style={{padding:"9px 13px",fontSize:"11px",fontWeight:"800",color:C.green,fontFamily:"'IBM Plex Mono'",textAlign:"right"}}>PKR {fmt(r.amt)}</td> <td style={{padding:"9px 13px"}}><Tag l={r.status} col={r.status==="paid"?C.green:r.status==="partial"?C.yellow:C.red} sm/></td> <td style={{padding:"9px 13px",fontSize:"10px",fontWeight:"700",color:r.fbr==="synced"?C.green:r.fbr==="failed"?C.red:C.yellow}}>{r.fbr==="synced"?"✓":r.fbr==="failed"?"✕":"⏳"} {r.fbr}</td> </tr> ))}
            </tbody>
          </table>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"14px"}}>
          <div style={{fontSize:"13px",fontWeight:"800",color:C.text,marginBottom:"12px"}}>Quick Actions</div>
          <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
            {QUICK.map(q=>( <button key={q.l} onClick={()=>navigate(q.r)} style={{display:"flex",alignItems:"center",gap:"9px",padding:"10px 12px",borderRadius:"8px",border:`1px solid ${C.border}`,background:C.panel,color:C.text,cursor:"pointer",fontSize:"11px",fontWeight:"600",textAlign:"left",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=q.col+"55";e.currentTarget.style.background=`${q.col}0e`}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.panel}}> <span style={{fontSize:"15px"}}>{q.ic}</span>{q.l} </button> ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Settings({user,lang,setLang}){
  const [tab,setTab]=useState("company");
  const TABS=[{k:"company",l:"🏢 Company"},{k:"branches",l:"🏬 Branches"},{k:"users",l:"👥 Users & Roles"},{k:"fbr",l:"🏛 FBR Config"},{k:"preferences",l:"⚙ Preferences"}];
  const BRANCHES=[
    {name:"Lahore Main Store",city:"Lahore",   mgr:"Asif Mehmood",phone:"042-111-000-111"},
    {name:"Karachi Branch",   city:"Karachi",  mgr:"Tariq Hassan", phone:"021-111-000-222"},
    {name:"Islamabad Outlet", city:"Islamabad",mgr:"Sana Butt",    phone:"051-111-000-333"},
  ];
  return(
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      <div style={{width:"185px",background:C.panel,borderRight:`1px solid ${C.border}`,padding:"10px 0",flexShrink:0}}>
        {TABS.map(t=>(
          <div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:"11px",fontWeight:tab===t.k?"700":"400",color:tab===t.k?C.accent:C.muted,background:tab===t.k?`${C.accent}0e`:"transparent",borderLeft:`3px solid ${tab===t.k?C.accent:"transparent"}`}}>
            {t.l}
          </div>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
        {tab==="company"&&(
          <div style={{maxWidth:"520px"}}>
            <div style={{fontSize:"15px",fontWeight:"800",color:C.text,marginBottom:"18px"}}>Company Information</div>
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              {[["Company Name","Al-Baraka Textiles Pvt Ltd"],["NTN Number","1234567-8"],["STRN Number","12-34-5678-001-89"],["Business Address","Main Market, Lahore, Pakistan"],["Phone","042-111-234-567"],["Email","info@albaraka.pk"]].map(([l,v])=>(
                <div key={l}>
                  <label style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:"4px"}}>{l}</label>
                  <input defaultValue={v} style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"9px 11px",color:C.text,fontSize:"12px",outline:"none"}} onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
                </div>
              ))}
              <button style={{padding:"9px 18px",borderRadius:"7px",border:"none",background:`linear-gradient(135deg,${C.green},#059669)`,color:"#fff",cursor:"pointer",fontSize:"11px",fontWeight:"700",alignSelf:"flex-start",marginTop:"4px"}}>💾 Save Settings</button>
            </div>
          </div>
        )}
        {tab==="branches"&&(
          <div>
            <div style={{fontSize:"15px",fontWeight:"800",color:C.text,marginBottom:"18px"}}>Branch Management</div>
            <div style={{display:"flex",flexDirection:"column",gap:"9px"}}>
              {BRANCHES.map(b=>( <div key={b.name} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"9px",padding:"13px 15px",display:"flex",alignItems:"center",gap:"12px"}}> <div style={{width:"38px",height:"38px",borderRadius:"8px",background:`${C.blue}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px"}}>🏬</div> <div style={{flex:1}}> <div style={{fontSize:"12px",fontWeight:"700",color:C.text}}>{b.name}</div> <div style={{fontSize:"9px",color:C.muted}}>{b.city} · {b.mgr} · {b.phone}</div> </div> <Tag l="Active" col={C.green} sm/> <button style={{padding:"4px 10px",borderRadius:"5px",border:`1px solid ${C.border}`,background:"transparent",color:C.blue,cursor:"pointer",fontSize:"9px",fontWeight:"700"}}>Edit</button> </div> ))}
              <button style={{padding:"9px 14px",borderRadius:"7px",border:`1px dashed ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:"11px"}}>+ Add Branch</button>
            </div>
          </div>
        )}
        {tab==="preferences"&&(
          <div style={{maxWidth:"460px"}}>
            <div style={{fontSize:"15px",fontWeight:"800",color:C.text,marginBottom:"18px"}}>Preferences</div>
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              {[
                {l:"Language",sub:"Interface language",node:<div style={{display:"flex",gap:"5px"}}>{["English","اردو"].map((l,i)=><button key={l} onClick={()=>setLang(i===0?"en":"ur")} style={{padding:"6px 12px",borderRadius:"6px",border:`1px solid ${(lang==="en"&&i===0)||(lang==="ur"&&i===1)?C.blue:C.border}`,background:(lang==="en"&&i===0)||(lang==="ur"&&i===1)?`${C.blue}18`:"transparent",color:(lang==="en"&&i===0)||(lang==="ur"&&i===1)?C.blue:C.muted,cursor:"pointer",fontSize:"11px",fontWeight:"700"}}>{l}</button>)}</div>},
                {l:"Currency",sub:"Display format",node:<select style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"7px 10px",color:C.text,fontSize:"11px",outline:"none"}}><option>PKR — Pakistani Rupee</option></select>},
                {l:"Date Format",sub:"Display style",node:<select style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"7px 10px",color:C.text,fontSize:"11px",outline:"none"}}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select>},
                {l:"Receipt Size",sub:"Default thermal paper",node:<select style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"7px 10px",color:C.text,fontSize:"11px",outline:"none"}}><option>80mm Thermal</option><option>58mm Thermal</option><option>A4</option></select>},
              ].map(s=>( <div key={s.l} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px",background:C.card,borderRadius:"8px",border:`1px solid ${C.border}`}}> <div style={{flex:1}}> <div style={{fontSize:"12px",fontWeight:"700",color:C.text}}>{s.l}</div> <div style={{fontSize:"9px",color:C.muted}}>{s.sub}</div> </div> {s.node} </div> ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InfosysPakERP(){
  const [user,     setUser]     = useState(null);
  const [route,    setRoute]    = useState("dashboard");
  const [collapsed,setCollapsed]= useState(false);
  const [lang,     setLang]     = useState("en");
  const [notifs,   setNotifs]   = useState(NOTIFS);

  const navigate  = r  => setRoute(r);
  const onLogin   = u  => { setUser(u); setRoute("dashboard"); };
  const onLogout  = () => setUser(null);
  const markRead  = () => setNotifs(p=>p.map(n=>({...n,read:true})));

  // This part is automatically handled by the AuthProvider now
  // We keep the logic here for demonstration purposes.
  useEffect(() => {
    const u = USERS[0]; // Auto-login as Admin for demo
    onLogin(u);
  }, []);

  if(!user) return <LoginScreen onLogin={onLogin}/>;

  const content = () => {
    if (route === "dashboard") return <Dashboard navigate={navigate} />;
    if (route === "pos") return <PosTerminal user={user} navigate={navigate} />;
    if (route.startsWith("inventory")) return <Inventory user={user} navigate={navigate} route={route}/>;
    if (route.startsWith("procurement")) return <Procurement user={user} navigate={navigate} route={route} />;
    if (route.startsWith("accounting")) return <Accounting user={user} navigate={navigate} route={route} />;
    if (route.startsWith("hr")) return <HrPayroll user={user} navigate={navigate} route={route}/>;
    if (route.startsWith("sales")) return <Accounting user={user} navigate={navigate} route={route} />;
    if (route.startsWith("reports")) return <ReportsFbr user={user} navigate={navigate} route={route}/>;
    if (route === "settings") return <Settings user={user} lang={lang} setLang={setLang} />;
    if (route === "printdesigner") return <PrintDesigner />;
    if (route === "superadmin") return <SuperAdmin />;
    return <Dashboard navigate={navigate} />;
  };

  return(
    <AuthCtx.Provider value={{user,route,navigate}}>
      <div style={{display:"flex",height:"100vh",background:C.bg,color:C.text,fontFamily:"'IBM Plex Sans',sans-serif",fontSize:"13px",overflow:"hidden"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#162030;border-radius:4px}input,select,textarea,button{font-family:inherit}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <Sidebar route={route} navigate={navigate} user={user} collapsed={collapsed} setCollapsed={setCollapsed} lang={lang}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <TopBar route={route} user={user} lang={lang} setLang={setLang} notifs={notifs} onLogout={onLogout} markRead={markRead}/>
          <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",animation:"fadeUp .18s ease"}}>
            {content()}
          </div>
        </div>
      </div>
    </AuthCtx.Provider>
  );
}

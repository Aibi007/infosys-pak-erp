import { useState, useRef, useCallback, useEffect } from "react";

// ================================================================
// INFOSYS PAK ERP — PART 6: PRINT DESIGNER + SUPER ADMIN PANEL
// Drag-Drop Template Designer · Multi-Tenancy · Audit · Backups
// ================================================================

const C = {
  bg:"#060a10", panel:"#09111a", card:"#0d1825", card2:"#0b1520",
  border:"#172030", border2:"#1e2e42", text:"#dce4f0", muted:"#4d6070",
  muted2:"#253545", accent:"#f97316", blue:"#3b82f6", green:"#10b981",
  red:"#ef4444", yellow:"#f59e0b", purple:"#8b5cf6", teal:"#06b6d4",
  pink:"#ec4899", lime:"#84cc16", input:"#07101a", header:"#050910",
};

const fmt = n => new Intl.NumberFormat("en-PK").format(Math.round(n));

// ── MOCK DATA ─────────────────────────────────────────────────────
const TENANTS = [
  { id:"t001", company:"Al-Baraka Textiles Pvt Ltd",   plan:"Enterprise", branches:5, users:24, status:"active",   mrr:45000, ntn:"1234567-8", joined:"2023-01-15", storage:"2.4 GB", lastActive:"2 min ago",    logo:"🏭" },
  { id:"t002", company:"Malik Brothers Garments",      plan:"Pro",        branches:3, users:12, status:"active",   mrr:25000, ntn:"8765432-1", joined:"2023-04-20", storage:"1.1 GB", lastActive:"15 min ago",   logo:"👔" },
  { id:"t003", company:"City Fashion House",           plan:"Pro",        branches:2, users:8,  status:"active",   mrr:25000, ntn:"2345678-9", joined:"2023-06-01", storage:"0.8 GB", lastActive:"1 hour ago",   logo:"👗" },
  { id:"t004", company:"Rehman Cloth Store",           plan:"Basic",      branches:1, users:3,  status:"active",   mrr:8000,  ntn:"3456789-0", joined:"2023-09-10", storage:"0.3 GB", lastActive:"3 hours ago",  logo:"🧵" },
  { id:"t005", company:"Star Fabrics International",   plan:"Enterprise", branches:8, users:45, status:"active",   mrr:45000, ntn:"4567890-1", joined:"2022-11-05", storage:"5.1 GB", lastActive:"Just now",     logo:"⭐" },
  { id:"t006", company:"Noor Textile Mills",           plan:"Basic",      branches:1, users:2,  status:"suspended",mrr:0,     ntn:"5678901-2", joined:"2023-07-22", storage:"0.2 GB", lastActive:"5 days ago",   logo:"🌟" },
  { id:"t007", company:"Khan & Sons Boutique",         plan:"Pro",        branches:2, users:6,  status:"trial",    mrr:0,     ntn:"6789012-3", joined:"2024-02-28", storage:"0.1 GB", lastActive:"30 min ago",   logo:"💼" },
];

const AUDIT_LOG = [
  { id:"al001", ts:"2024-03-02 10:14:32", tenant:"Al-Baraka Textiles",   user:"admin@albaraka.pk",     action:"CREATE",  entity:"Invoice",  detail:"INV-2024-08741 · PKR 245,000",         ip:"110.93.12.44",  risk:"low"    },
  { id:"al002", ts:"2024-03-02 10:11:05", tenant:"Al-Baraka Textiles",   user:"cashier1@albaraka.pk",  action:"UPDATE",  entity:"Product",  detail:"Price changed: PKR 3,999 → PKR 4,199", ip:"110.93.12.44",  risk:"medium" },
  { id:"al003", ts:"2024-03-02 09:58:21", tenant:"Malik Brothers",       user:"owner@malikbros.pk",    action:"DELETE",  entity:"Voucher",  detail:"BPV-2024-003 deleted (draft)",          ip:"39.34.175.8",   risk:"high"   },
  { id:"al004", ts:"2024-03-02 09:45:00", tenant:"City Fashion",         user:"accounts@cityfash.pk",  action:"POST",    entity:"Voucher",  detail:"JV-2024-011 posted · PKR 180,000",     ip:"203.128.6.11",  risk:"low"    },
  { id:"al005", ts:"2024-03-02 09:30:14", tenant:"Star Fabrics",         user:"admin@starfab.pk",      action:"LOGIN",   entity:"User",     detail:"Successful login from new device",      ip:"42.201.18.99",  risk:"medium" },
  { id:"al006", ts:"2024-03-02 09:12:47", tenant:"Rehman Cloth",         user:"cashier@rehmancloth.pk",action:"CREATE",  entity:"Invoice",  detail:"INV-2024-00312 · PKR 55,000",           ip:"58.65.122.3",   risk:"low"    },
  { id:"al007", ts:"2024-03-02 08:55:03", tenant:"Al-Baraka Textiles",   user:"admin@albaraka.pk",     action:"CONFIG",  entity:"Settings", detail:"FBR POS ID updated",                   ip:"110.93.12.44",  risk:"medium" },
  { id:"al008", ts:"2024-03-01 23:00:00", tenant:"SYSTEM",               user:"system@infosys.pk",     action:"BACKUP",  entity:"Database", detail:"Nightly backup completed · 3.2 GB",    ip:"localhost",     risk:"low"    },
  { id:"al009", ts:"2024-03-01 22:45:00", tenant:"Noor Textile",         user:"admin@noor.pk",         action:"SUSPEND", entity:"Account",  detail:"Account suspended: payment overdue",    ip:"system",        risk:"high"   },
  { id:"al010", ts:"2024-03-01 18:30:22", tenant:"Khan & Sons",          user:"khan@khansons.pk",      action:"CREATE",  entity:"Customer", detail:"New customer: Tariq Traders",           ip:"39.53.201.7",   risk:"low"    },
];

const BACKUPS = [
  { id:"bk001", name:"nightly-auto-2024-03-02", date:"2024-03-02 23:00", size:"3.2 GB", type:"Auto",   tenants:7, status:"complete", duration:"4m 12s" },
  { id:"bk002", name:"nightly-auto-2024-03-01", date:"2024-03-01 23:00", size:"3.1 GB", type:"Auto",   tenants:7, status:"complete", duration:"4m 08s" },
  { id:"bk003", name:"manual-backup-albaraka",  date:"2024-03-01 14:22", size:"2.4 GB", type:"Manual", tenants:1, status:"complete", duration:"2m 55s" },
  { id:"bk004", name:"nightly-auto-2024-02-29", date:"2024-02-29 23:00", size:"3.0 GB", type:"Auto",   tenants:7, status:"complete", duration:"3m 59s" },
  { id:"bk005", name:"pre-upgrade-backup",      date:"2024-02-28 09:00", size:"2.9 GB", type:"Manual", tenants:7, status:"complete", duration:"3m 45s" },
  { id:"bk006", name:"nightly-auto-2024-02-28", date:"2024-02-28 23:00", size:"2.9 GB", type:"Auto",   tenants:7, status:"complete", duration:"3m 50s" },
];

const PLANS = [
  { name:"Basic",      price:8000,  branches:1, users:5,  features:["POS","Inventory","Basic Reports"],              color:C.teal   },
  { name:"Pro",        price:25000, branches:3, users:15, features:["All Basic","Accounting","FBR","Advanced Reports"],color:C.blue   },
  { name:"Enterprise", price:45000, branches:"∞",users:"∞",features:["All Pro","Multi-WH","API Access","SLA 99.9%"],  color:C.purple },
];

// ── PRINT TEMPLATE DATA ───────────────────────────────────────────
const TEMPLATE_ELEMENTS = [
  { id:"logo",       label:"Company Logo",    icon:"🖼",  type:"image",  defaultW:120, defaultH:60  },
  { id:"compName",   label:"Company Name",    icon:"🏢",  type:"text",   defaultW:220, defaultH:28  },
  { id:"compAddr",   label:"Company Address", icon:"📍",  type:"text",   defaultW:200, defaultH:44  },
  { id:"invTitle",   label:"Invoice Title",   icon:"📄",  type:"text",   defaultW:160, defaultH:32  },
  { id:"invNumber",  label:"Invoice #",       icon:"🔢",  type:"field",  defaultW:180, defaultH:24  },
  { id:"invDate",    label:"Date",            icon:"📅",  type:"field",  defaultW:140, defaultH:24  },
  { id:"custName",   label:"Customer Name",   icon:"👤",  type:"field",  defaultW:200, defaultH:24  },
  { id:"custAddr",   label:"Customer Address",icon:"📮",  type:"field",  defaultW:200, defaultH:44  },
  { id:"itemsTable", label:"Items Table",     icon:"📋",  type:"table",  defaultW:480, defaultH:180 },
  { id:"subtotal",   label:"Subtotal Row",    icon:"➕",  type:"total",  defaultW:200, defaultH:24  },
  { id:"discount",   label:"Discount Row",    icon:"🏷",  type:"total",  defaultW:200, defaultH:24  },
  { id:"tax",        label:"Tax Row",         icon:"🧾",  type:"total",  defaultW:200, defaultH:24  },
  { id:"total",      label:"Grand Total",     icon:"💰",  type:"total",  defaultW:200, defaultH:30  },
  { id:"qrCode",     label:"FBR QR Code",     icon:"▦",   type:"qr",     defaultW:80,  defaultH:80  },
  { id:"fbrNum",     label:"FBR Invoice #",   icon:"🏛",  type:"field",  defaultW:200, defaultH:24  },
  { id:"signature",  label:"Signature Block", icon:"✍",   type:"block",  defaultW:160, defaultH:60  },
  { id:"footer",     label:"Footer Text",     icon:"📝",  type:"text",   defaultW:480, defaultH:36  },
  { id:"divider",    label:"Divider Line",    icon:"—",   type:"line",   defaultW:480, defaultH:8   },
  { id:"barcode",    label:"Barcode",         icon:"▦▦",  type:"barcode",defaultW:180, defaultH:50  },
  { id:"terms",      label:"Terms & Cond.",   icon:"📜",  type:"text",   defaultW:480, defaultH:60  },
];

const PAPER_SIZES = [
  { id:"a4",    label:"A4",      w:595, h:842,  scale:0.72 },
  { id:"letter",label:"Letter",  w:612, h:792,  scale:0.70 },
  { id:"t80",   label:"Thermal 80mm", w:227, h:600, scale:1.2  },
  { id:"t58",   label:"Thermal 58mm", w:164, h:500, scale:1.5  },
];

const INIT_CANVAS = [
  { id:"el_1", elementId:"logo",      x:30,  y:20,  w:100, h:50, content:"[Logo]",             style:{fontWeight:"700",fontSize:"22px",color:C.accent}  },
  { id:"el_2", elementId:"compName",  x:145, y:28,  w:220, h:28, content:"Infosys Pak ERP",    style:{fontWeight:"900",fontSize:"16px",color:"#1a202c"}  },
  { id:"el_3", elementId:"compAddr",  x:145, y:54,  w:200, h:36, content:"Main Branch, Lahore\nNTN: 1234567-8", style:{fontSize:"9px",color:"#6b7280"} },
  { id:"el_4", elementId:"invTitle",  x:30,  y:90,  w:160, h:28, content:"TAX INVOICE",        style:{fontWeight:"900",fontSize:"15px",color:C.accent}   },
  { id:"el_5", elementId:"invNumber", x:310, y:90,  w:180, h:22, content:"Invoice #: INV-2024-08741", style:{fontSize:"10px",color:"#374151"} },
  { id:"el_6", elementId:"invDate",   x:310, y:114, w:160, h:22, content:"Date: 02 Mar 2024",  style:{fontSize:"10px",color:"#374151"}                   },
  { id:"el_7", elementId:"custName",  x:30,  y:130, w:200, h:22, content:"Bill To: Al-Fatah Traders", style:{fontWeight:"700",fontSize:"10px",color:"#1a202c"} },
  { id:"el_8", elementId:"divider",   x:20,  y:162, w:460, h:2,  content:"",                   style:{background:"#e5e7eb"}                              },
  { id:"el_9", elementId:"itemsTable",x:20,  y:174, w:460, h:160,content:"[Items Table]",      style:{fontSize:"10px",color:"#374151"}                   },
  { id:"el_10",elementId:"total",     x:310, y:348, w:170, h:28, content:"TOTAL: PKR 245,000", style:{fontWeight:"900",fontSize:"13px",color:C.accent}   },
  { id:"el_11",elementId:"qrCode",    x:20,  y:348, w:75,  h:75, content:"[QR]",               style:{fontSize:"10px",color:"#374151"}                   },
  { id:"el_12",elementId:"footer",    x:20,  y:440, w:460, h:28, content:"Thank you for your business! Returns within 7 days.", style:{fontSize:"9px",color:"#9ca3af",textAlign:"center"} },
];

// ── COMPONENTS ────────────────────────────────────────────────────
const Tag = ({l,col,sm}) => (
  <span style={{fontSize:sm?"9px":"10px",fontWeight:"700",padding:sm?"1px 5px":"2px 8px",borderRadius:"20px",background:`${col}18`,color:col,border:`1px solid ${col}28`,whiteSpace:"nowrap"}}>{l}</span>
);

const Btn = ({onClick,children,color=C.blue,outline=false,small=false,disabled=false,full=false}) => (
  <button onClick={onClick} disabled={disabled} style={{width:full?"100%":"auto",padding:small?"5px 10px":"8px 14px",borderRadius:"7px",border:outline?`1px solid ${color}55`:"none",background:disabled?"#1c2a3a":outline?`${color}10`:color,color:disabled?C.muted:"#fff",cursor:disabled?"not-allowed":"pointer",fontSize:small?"10px":"12px",fontWeight:"700",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"5px",whiteSpace:"nowrap",transition:"opacity 0.15s"}}
    onMouseEnter={e=>{if(!disabled)e.currentTarget.style.opacity="0.85"}}
    onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
    {children}
  </button>
);

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function Part6() {
  const [section, setSection] = useState("printDesigner"); // printDesigner | superAdmin

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,color:C.text,fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif",fontSize:"13px",overflow:"hidden",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#1c2a3a;border-radius:4px}
        input,select,textarea,button{font-family:inherit}
        @keyframes slideIn{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse4{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)}70%{box-shadow:0 0 0 8px rgba(16,185,129,0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes rowIn{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
      `}</style>

      {/* TOP NAV */}
      <div style={{background:C.header,borderBottom:`1px solid ${C.border}`,padding:"0 20px",height:"56px",display:"flex",alignItems:"center",gap:"14px",flexShrink:0}}>
        <div style={{width:"32px",height:"32px",borderRadius:"7px",background:"linear-gradient(135deg,#f97316,#ea580c)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",fontSize:"12px",color:"#fff"}}>IP</div>
        <div>
          <div style={{fontWeight:"800",fontSize:"15px",color:"#fff"}}>Infosys Pak ERP</div>
          <div style={{fontSize:"9px",color:C.muted}}>Part 6 — Print Designer & Super Admin Panel</div>
        </div>
        <div style={{marginLeft:"20px",display:"flex",gap:"4px"}}>
          {[
            {k:"printDesigner",l:"🖨 Print Designer"},
            {k:"superAdmin",   l:"🔐 Super Admin"},
          ].map(s=>(
            <button key={s.k} onClick={()=>setSection(s.k)} style={{padding:"7px 16px",borderRadius:"7px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:"700",background:section===s.k?C.accent:"transparent",color:section===s.k?"#fff":C.muted,transition:"all 0.15s"}}>
              {s.l}
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{fontSize:"10px",color:C.muted}}>Super Admin</div>
          <div style={{width:"30px",height:"30px",borderRadius:"50%",background:"linear-gradient(135deg,#f97316,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"700",fontSize:"11px"}}>SA</div>
        </div>
      </div>

      {section === "printDesigner" && <PrintDesigner/>}
      {section === "superAdmin"    && <SuperAdminPanel/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PRINT DESIGNER
// ═══════════════════════════════════════════════════════════════════
function PrintDesigner() {
  const [paperSize, setPaperSize]       = useState("a4");
  const [canvasEls, setCanvasEls]       = useState(INIT_CANVAS);
  const [selected, setSelected]         = useState(null);
  const [dragging, setDragging]         = useState(null);
  const [resizing, setResizing]         = useState(null);
  const [dragOffset, setDragOffset]     = useState({x:0,y:0});
  const [templateName, setTemplateName] = useState("Invoice Template — Default");
  const [templateType, setTemplateType] = useState("invoice");
  const [showGrid, setShowGrid]         = useState(true);
  const [zoom, setZoom]                 = useState(100);
  const [savedTemplates, setSavedTemplates] = useState(["Invoice — Default","Invoice — Thermal 80mm","Purchase Order","Delivery Note"]);
  const [notification, setNotify]       = useState(null);
  const canvasRef                       = useRef(null);
  const paper                           = PAPER_SIZES.find(p=>p.id===paperSize);

  const notify = (msg,type="success")=>{ setNotify({msg,type}); setTimeout(()=>setNotify(null),2500); };

  // Drag handlers
  const onMouseDownEl = (e, id) => {
    e.stopPropagation();
    setSelected(id);
    const el = canvasEls.find(c=>c.id===id);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragging(id);
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const onMouseMove = useCallback((e) => {
    if (!dragging && !resizing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const scale = (paper.w * (zoom/100)) / canvasRect.width;

    if (dragging) {
      const x = ((e.clientX - canvasRect.left) * scale - dragOffset.x * scale);
      const y = ((e.clientY - canvasRect.top)  * scale - dragOffset.y * scale);
      setCanvasEls(prev => prev.map(el =>
        el.id === dragging ? { ...el, x: Math.max(0, Math.round(x/5)*5), y: Math.max(0, Math.round(y/5)*5) } : el
      ));
    }
    if (resizing) {
      const el = canvasEls.find(c=>c.id===resizing.id);
      if (!el) return;
      const newW = Math.max(40, Math.round(((e.clientX - canvasRect.left) * scale - el.x) / 5) * 5);
      const newH = Math.max(16, Math.round(((e.clientY - canvasRect.top)  * scale - el.y) / 5) * 5);
      setCanvasEls(prev => prev.map(c => c.id===resizing.id ? {...c, w:newW, h:newH} : c));
    }
  }, [dragging, resizing, dragOffset, paper, zoom, canvasEls]);

  const onMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [onMouseMove, onMouseUp]);

  const addElement = (tmplEl) => {
    const newEl = {
      id: `el_${Date.now()}`, elementId: tmplEl.id,
      x: 30, y: 30, w: tmplEl.defaultW, h: tmplEl.defaultH,
      content: `[${tmplEl.label}]`,
      style: { fontSize:"11px", color:"#374151" }
    };
    setCanvasEls(prev => [...prev, newEl]);
    setSelected(newEl.id);
    notify(`${tmplEl.label} added to canvas`);
  };

  const deleteSelected = () => {
    if (!selected) return;
    setCanvasEls(prev => prev.filter(el => el.id !== selected));
    setSelected(null);
  };

  const selectedEl   = canvasEls.find(el=>el.id===selected);
  const selectedMeta = selectedEl ? TEMPLATE_ELEMENTS.find(t=>t.id===selectedEl.elementId) : null;
  const canvasW      = paper.w * (zoom/100);
  const canvasH      = paper.h * (zoom/100);
  const scale        = zoom/100;

  const renderPreviewEl = (el) => {
    const meta = TEMPLATE_ELEMENTS.find(t=>t.id===el.elementId);
    const isSelected = selected === el.id;
    const baseStyle = {
      position:"absolute", left:el.x*scale, top:el.y*scale,
      width:el.w*scale, height:el.h*scale,
      cursor:"move", userSelect:"none",
      border: isSelected ? `1.5px solid ${C.blue}` : "1px dashed transparent",
      borderRadius:"2px",
      overflow:"hidden",
      transition: dragging===el.id ? "none" : "border 0.1s",
    };

    let inner;
    if (meta?.type === "image") {
      inner = <div style={{width:"100%",height:"100%",background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:`${14*scale}px`,color:C.accent,fontWeight:"900",border:"1px dashed #d1d5db"}}>🖼 LOGO</div>;
    } else if (meta?.type === "table") {
      inner = (
        <div style={{width:"100%",height:"100%",fontSize:`${9*scale}px`}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",borderBottom:"1.5px solid #374151",paddingBottom:`${2*scale}px`,marginBottom:`${3*scale}px`,fontWeight:"700",color:"#374151",gap:`${4*scale}px`}}>
            <span>Item Description</span><span style={{textAlign:"right"}}>Qty</span><span style={{textAlign:"right"}}>Price</span><span style={{textAlign:"right"}}>Total</span>
          </div>
          {[["Gul Ahmed Lawn 3pc","2","3,999","7,998"],["Khaadi Kurta L","1","2,999","2,999"]].map((r,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",padding:`${2*scale}px 0`,borderBottom:"1px solid #e5e7eb",color:"#4b5563",gap:`${4*scale}px`}}>
              {r.map((c,ci)=><span key={ci} style={{textAlign:ci>0?"right":"left"}}>{c}</span>)}
            </div>
          ))}
        </div>
      );
    } else if (meta?.type === "qr") {
      inner = (
        <svg width="100%" height="100%">
          <rect width="100%" height="100%" fill="#fff" rx="2"/>
          {[0,1,2].map(q=>[
            <rect key={`${q}a`} x={q===0?2:q===1?el.w*scale-22:2} y={q===2?el.h*scale-22:2} width={20*scale} height={20*scale} fill="#374151" rx="1"/>,
            <rect key={`${q}b`} x={q===0?4:q===1?el.w*scale-20:4} y={q===2?el.h*scale-20:4} width={16*scale} height={16*scale} fill="#fff" rx="1"/>,
            <rect key={`${q}c`} x={q===0?7:q===1?el.w*scale-17:7} y={q===2?el.h*scale-17:7} width={10*scale} height={10*scale} fill="#374151" rx="0.5"/>,
          ])}
          {[...Array(8)].map((_,r)=>[...Array(8)].map((_,c)=>Math.random()>0.5&&(
            <rect key={`${r}-${c}`} x={22*scale+c*6*scale} y={22*scale+r*6*scale} width={5*scale} height={5*scale} fill="#374151" rx="0.5"/>
          )))}
        </svg>
      );
    } else if (meta?.type === "line") {
      inner = <div style={{width:"100%",height:"1.5px",background:el.style?.background||"#374151",marginTop:`${3*scale}px`}}/>;
    } else if (meta?.type === "barcode") {
      inner = (
        <div style={{background:"#fff",padding:`${2*scale}px`,display:"flex",flexDirection:"column",alignItems:"center"}}>
          <svg width="100%" height={`${32*scale}px`}>
            {[...Array(40)].map((_,i)=>Math.random()>0.4&&<rect key={i} x={i*(el.w*scale/40)} y={0} width={Math.random()>0.5?2:1} height={32*scale} fill="#374151"/>)}
          </svg>
          <div style={{fontSize:`${7*scale}px`,color:"#374151",fontFamily:"monospace",marginTop:`${1*scale}px`}}>690123456789</div>
        </div>
      );
    } else {
      inner = (
        <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",fontSize:`${(parseInt(el.style?.fontSize)||11)*scale}px`,fontWeight:el.style?.fontWeight||"normal",color:el.style?.color||"#374151",whiteSpace:"pre-wrap",lineHeight:1.3,justifyContent:el.style?.textAlign==="center"?"center":"flex-start"}}>
          {el.content}
        </div>
      );
    }

    return (
      <div key={el.id} style={baseStyle}
        onMouseDown={e=>onMouseDownEl(e,el.id)}
        onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.borderColor="#94a3b8" }}
        onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.borderColor="transparent" }}>
        {inner}
        {isSelected && (
          <>
            <div style={{position:"absolute",top:-4,left:-4,width:8,height:8,background:C.blue,borderRadius:"50%",cursor:"nw-resize"}}/>
            <div style={{position:"absolute",bottom:-4,right:-4,width:8,height:8,background:C.blue,borderRadius:"2px",cursor:"se-resize"}}
              onMouseDown={e=>{e.stopPropagation();setResizing({id:el.id})}}/>
            <div style={{position:"absolute",top:-18,left:0,background:C.blue,color:"#fff",fontSize:`${8*scale}px`,padding:"1px 4px",borderRadius:"2px",whiteSpace:"nowrap",pointerEvents:"none"}}>{selectedMeta?.label}</div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      {/* LEFT: ELEMENTS PANEL */}
      <div style={{width:"200px",background:C.panel,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
        <div style={{padding:"12px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{fontSize:"10px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"4px"}}>Template Type</div>
          <select value={templateType} onChange={e=>setTemplateType(e.target.value)} style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"7px",color:C.text,fontSize:"11px",outline:"none"}}>
            {["invoice","purchase_order","delivery_note","receipt","voucher"].map(t=><option key={t} value={t}>{t.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
          </select>
        </div>

        <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{fontSize:"10px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"8px"}}>Elements</div>
          <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
            {TEMPLATE_ELEMENTS.map(el=>(
              <div key={el.id} onClick={()=>addElement(el)}
                style={{display:"flex",alignItems:"center",gap:"7px",padding:"5px 8px",borderRadius:"6px",cursor:"pointer",border:`1px solid ${C.border}`,background:C.card2,transition:"all 0.12s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background=`${C.accent}10`}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.card2}}>
                <span style={{fontSize:"12px",flexShrink:0}}>{el.icon}</span>
                <span style={{fontSize:"10px",color:C.text,fontWeight:"500"}}>{el.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Templates */}
        <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
          <div style={{fontSize:"10px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"7px"}}>Saved Templates</div>
          {savedTemplates.map(t=>(
            <div key={t} style={{padding:"6px 8px",borderRadius:"5px",cursor:"pointer",fontSize:"10px",color:C.text,border:`1px solid ${C.border}`,marginBottom:"4px",background:t===templateName?`${C.blue}18`:C.card2}}
              onClick={()=>setTemplateName(t)}>
              📄 {t}
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: CANVAS */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:C.bg}}>
        {/* Toolbar */}
        <div style={{height:"46px",background:C.panel,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 14px",gap:"10px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"4px",flex:1}}>
            <span style={{fontSize:"10px",color:C.muted}}>Template:</span>
            <input value={templateName} onChange={e=>setTemplateName(e.target.value)} style={{background:"transparent",border:"none",outline:"none",color:C.text,fontSize:"12px",fontWeight:"600",flex:1,maxWidth:"280px"}}/>
          </div>
          <div style={{display:"flex",gap:"4px"}}>
            {PAPER_SIZES.map(p=>(
              <button key={p.id} onClick={()=>setPaperSize(p.id)} style={{padding:"4px 9px",borderRadius:"5px",border:"none",cursor:"pointer",fontSize:"10px",fontWeight:"700",background:paperSize===p.id?C.accent:"transparent",color:paperSize===p.id?"#fff":C.muted}}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <button onClick={()=>setZoom(z=>Math.max(40,z-10))} style={{width:"22px",height:"22px",borderRadius:"4px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
            <span style={{fontSize:"10px",color:C.muted,minWidth:"34px",textAlign:"center"}}>{zoom}%</span>
            <button onClick={()=>setZoom(z=>Math.min(150,z+10))} style={{width:"22px",height:"22px",borderRadius:"4px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
          </div>
          <button onClick={()=>setShowGrid(!showGrid)} style={{padding:"4px 9px",borderRadius:"5px",border:`1px solid ${showGrid?C.blue:C.border}`,background:showGrid?`${C.blue}18`:"transparent",color:showGrid?C.blue:C.muted,cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>⊞ Grid</button>
          {selected && <button onClick={deleteSelected} style={{padding:"4px 9px",borderRadius:"5px",border:`1px solid ${C.red}44`,background:`${C.red}10`,color:C.red,cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>🗑 Delete</button>}
          <Btn color={C.blue} small outline onClick={()=>notify("Preview opened in new window")}>👁 Preview</Btn>
          <Btn color={C.green} small onClick={()=>{setSavedTemplates(p=>[...p.filter(t=>t!==templateName),templateName]);notify("Template saved!")}}>💾 Save</Btn>
          <Btn color={C.accent} small onClick={()=>notify("Template exported as PDF")}>📤 Export</Btn>
        </div>

        {/* Canvas Area */}
        <div style={{flex:1,overflowY:"auto",overflowX:"auto",padding:"24px",display:"flex",justifyContent:"center",alignItems:"flex-start",background:"#374151"}}>
          <div ref={canvasRef}
            style={{width:canvasW,height:canvasH,background:"#ffffff",position:"relative",flexShrink:0,boxShadow:"0 10px 40px rgba(0,0,0,0.6)",cursor:"default",
              backgroundImage: showGrid ? "linear-gradient(rgba(59,130,246,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.05) 1px,transparent 1px)" : "none",
              backgroundSize: showGrid ? `${20*scale}px ${20*scale}px` : "auto"
            }}
            onMouseDown={()=>setSelected(null)}>
            {canvasEls.map(el => renderPreviewEl(el))}
          </div>
        </div>
      </div>

      {/* RIGHT: PROPERTIES PANEL */}
      <div style={{width:"220px",background:C.panel,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{fontSize:"11px",fontWeight:"800",color:C.text}}>
            {selectedEl ? `📐 ${selectedMeta?.label||"Element"}` : "📐 Properties"}
          </div>
        </div>
        {selectedEl ? (
          <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:"12px"}}>
            {/* Position */}
            <div>
              <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"7px"}}>Position & Size</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
                {[{l:"X",k:"x"},{l:"Y",k:"y"},{l:"W",k:"w"},{l:"H",k:"h"}].map(f=>(
                  <div key={f.k}>
                    <div style={{fontSize:"9px",color:C.muted,marginBottom:"2px"}}>{f.l}</div>
                    <input type="number" value={selectedEl[f.k]} onChange={e=>setCanvasEls(prev=>prev.map(el=>el.id===selected?{...el,[f.k]:parseInt(e.target.value)||0}:el))}
                      style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"5px",padding:"5px",color:C.text,fontSize:"11px",outline:"none",fontFamily:"'IBM Plex Mono'"}}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            {selectedMeta?.type !== "table" && selectedMeta?.type !== "qr" && selectedMeta?.type !== "line" && (
              <div>
                <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"5px"}}>Content</div>
                <textarea value={selectedEl.content} rows={3} onChange={e=>setCanvasEls(prev=>prev.map(el=>el.id===selected?{...el,content:e.target.value}:el))}
                  style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"5px",padding:"6px",color:C.text,fontSize:"11px",outline:"none",resize:"vertical"}}/>
              </div>
            )}

            {/* Style */}
            <div>
              <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"7px"}}>Style</div>
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                <div>
                  <div style={{fontSize:"9px",color:C.muted,marginBottom:"2px"}}>Font Size</div>
                  <input type="number" value={parseInt(selectedEl.style?.fontSize)||11}
                    onChange={e=>setCanvasEls(prev=>prev.map(el=>el.id===selected?{...el,style:{...el.style,fontSize:`${e.target.value}px`}}:el))}
                    style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"5px",padding:"5px",color:C.text,fontSize:"11px",outline:"none"}}/>
                </div>
                <div>
                  <div style={{fontSize:"9px",color:C.muted,marginBottom:"2px"}}>Text Color</div>
                  <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                    {["#1a202c","#374151","#6b7280","#f97316","#3b82f6","#10b981","#ef4444","#8b5cf6"].map(col=>(
                      <div key={col} onClick={()=>setCanvasEls(prev=>prev.map(el=>el.id===selected?{...el,style:{...el.style,color:col}}:el))}
                        style={{width:"20px",height:"20px",borderRadius:"3px",background:col,cursor:"pointer",border:selectedEl.style?.color===col?`2px solid ${C.text}`:"2px solid transparent"}}/>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:"9px",color:C.muted,marginBottom:"2px"}}>Font Weight</div>
                  <div style={{display:"flex",gap:"4px"}}>
                    {[{l:"Normal",v:"400"},{l:"Bold",v:"700"},{l:"Black",v:"900"}].map(fw=>(
                      <button key={fw.v} onClick={()=>setCanvasEls(prev=>prev.map(el=>el.id===selected?{...el,style:{...el.style,fontWeight:fw.v}}:el))}
                        style={{flex:1,padding:"4px",borderRadius:"4px",border:`1px solid ${selectedEl.style?.fontWeight===fw.v?C.accent:C.border}`,background:selectedEl.style?.fontWeight===fw.v?`${C.accent}18`:"transparent",color:selectedEl.style?.fontWeight===fw.v?C.accent:C.muted,cursor:"pointer",fontSize:"9px",fontWeight:fw.v}}>
                        {fw.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:"9px",color:C.muted,marginBottom:"2px"}}>Align</div>
                  <div style={{display:"flex",gap:"4px"}}>
                    {[{l:"←",v:"left"},{l:"↔",v:"center"},{l:"→",v:"right"}].map(a=>(
                      <button key={a.v} onClick={()=>setCanvasEls(prev=>prev.map(el=>el.id===selected?{...el,style:{...el.style,textAlign:a.v}}:el))}
                        style={{flex:1,padding:"5px",borderRadius:"4px",border:`1px solid ${selectedEl.style?.textAlign===a.v?C.blue:C.border}`,background:selectedEl.style?.textAlign===a.v?`${C.blue}18`:"transparent",color:selectedEl.style?.textAlign===a.v?C.blue:C.muted,cursor:"pointer",fontSize:"12px"}}>
                        {a.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={deleteSelected} style={{padding:"8px",borderRadius:"7px",border:`1px solid ${C.red}44`,background:`${C.red}10`,color:C.red,cursor:"pointer",fontSize:"11px",fontWeight:"700",width:"100%"}}>
              🗑 Delete Element
            </button>
          </div>
        ) : (
          <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
            <div style={{fontSize:"10px",color:C.muted,marginBottom:"14px"}}>Click any element on the canvas to edit its properties.</div>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"4px"}}>Canvas Info</div>
              {[{l:"Paper",v:paper.label},{l:"Elements",v:canvasEls.length},{l:"Width",v:`${paper.w}px`},{l:"Height",v:`${paper.h}px`},{l:"Zoom",v:`${zoom}%`}].map(i=>(
                <div key={i.l} style={{display:"flex",justifyContent:"space-between",fontSize:"11px"}}>
                  <span style={{color:C.muted}}>{i.l}</span>
                  <span style={{color:C.text,fontWeight:"600"}}>{i.v}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:"16px"}}>
              <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"6px"}}>Quick Actions</div>
              <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                {[{l:"Clear Canvas",col:C.red,fn:()=>{setCanvasEls([]);setSelected(null);notify("Canvas cleared","error")}},{l:"Reset to Default",col:C.yellow,fn:()=>{setCanvasEls(INIT_CANVAS);setSelected(null);notify("Reset to default")}},{l:"Duplicate Template",col:C.blue,fn:()=>{setSavedTemplates(p=>[...p,templateName+" (copy)"]);notify("Template duplicated")}}].map(a=>(
                  <button key={a.l} onClick={a.fn} style={{padding:"7px 10px",borderRadius:"6px",border:`1px solid ${a.col}44`,background:`${a.col}10`,color:a.col,cursor:"pointer",fontSize:"10px",fontWeight:"700",textAlign:"left"}}>
                    {a.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {notification && (
        <div style={{position:"fixed",top:"16px",left:"50%",transform:"translateX(-50%)",zIndex:400,background:notification.type==="error"?C.red:C.green,color:"#fff",padding:"10px 18px",borderRadius:"8px",fontSize:"12px",fontWeight:"700",boxShadow:"0 8px 24px rgba(0,0,0,0.4)",animation:"slideIn 0.2s ease",whiteSpace:"nowrap"}}>
          ✓ {notification.msg}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUPER ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════
function SuperAdminPanel() {
  const [tab, setTab]         = useState("tenants");
  const [tenants, setTenants] = useState(TENANTS);
  const [selected, setSelected] = useState(null);
  const [auditFilter, setAuditFilter] = useState("All");
  const [riskFilter, setRiskFilter]   = useState("All");
  const [backingUp, setBackingUp]     = useState(false);
  const [notification, setNotify]     = useState(null);
  const [showAddTenant, setShowAddTenant] = useState(false);

  const notify = (msg,type="success")=>{ setNotify({msg,type}); setTimeout(()=>setNotify(null),3000); };

  const totalMRR    = tenants.filter(t=>t.status==="active").reduce((s,t)=>s+t.mrr,0);
  const totalUsers  = tenants.reduce((s,t)=>s+t.users,0);
  const totalBranch = tenants.reduce((s,t)=>s+t.branches,0);
  const activeCount = tenants.filter(t=>t.status==="active").length;

  const doBackup = async () => {
    setBackingUp(true);
    await new Promise(r=>setTimeout(r,2500));
    setBackingUp(false);
    notify("Manual backup completed — 3.2 GB stored");
  };

  const statusColor = s => s==="active"?C.green:s==="suspended"?C.red:s==="trial"?C.yellow:C.muted;
  const planColor   = p => p==="Enterprise"?C.purple:p==="Pro"?C.blue:C.teal;
  const riskColor   = r => r==="high"?C.red:r==="medium"?C.yellow:C.green;

  const filteredAudit = AUDIT_LOG.filter(a=>{
    if (auditFilter!=="All" && a.action!==auditFilter) return false;
    if (riskFilter!=="All"  && a.risk!==riskFilter)   return false;
    return true;
  });

  const tabs = [
    {k:"tenants",      l:"🏢 Tenants"},
    {k:"subscriptions",l:"💳 Subscriptions"},
    {k:"auditLog",     l:"📋 Audit Log"},
    {k:"backups",      l:"💾 Backups"},
    {k:"system",       l:"⚙️ System"},
  ];

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Sub-header */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,padding:"0 20px",height:"48px",display:"flex",alignItems:"center",gap:"4px",flexShrink:0}}>
        {tabs.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"6px 14px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:"700",background:tab===t.k?C.accent:"transparent",color:tab===t.k?"#fff":C.muted,transition:"all 0.15s"}}>
            {t.l}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:"8px"}}>
          {tab==="tenants"  && <Btn color={C.green} small onClick={()=>setShowAddTenant(true)}>+ Add Tenant</Btn>}
          {tab==="backups"  && <Btn color={C.blue}  small onClick={doBackup} disabled={backingUp}>{backingUp?<span style={{display:"inline-block",animation:"spin 0.8s linear infinite"}}>⟳</span>:"💾"} {backingUp?"Running...":"Backup Now"}</Btn>}
          {tab==="auditLog" && <Btn color={C.blue}  small outline>📤 Export Log</Btn>}
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{background:C.card2,borderBottom:`1px solid ${C.border}`,padding:"8px 20px",display:"flex",gap:"10px",flexShrink:0,overflowX:"auto"}}>
        {[
          {l:"Total Tenants",  v:tenants.length,               col:C.blue,   ic:"🏢"},
          {l:"Active",         v:activeCount,                   col:C.green,  ic:"✅"},
          {l:"Monthly Revenue",v:`PKR ${fmt(totalMRR)}`,        col:C.accent, ic:"💰"},
          {l:"Total Users",    v:totalUsers,                    col:C.teal,   ic:"👥"},
          {l:"Total Branches", v:totalBranch,                   col:C.purple, ic:"🏬"},
          {l:"On Trial",       v:tenants.filter(t=>t.status==="trial").length, col:C.yellow,ic:"⏳"},
          {l:"Suspended",      v:tenants.filter(t=>t.status==="suspended").length, col:C.red,ic:"🚫"},
        ].map(s=>(
          <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"9px 14px",minWidth:"130px",flex:1,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,right:0,width:"36px",height:"36px",borderRadius:"0 8px 0 36px",background:`${s.col}12`}}/>
            <div style={{fontSize:"9px",color:C.muted,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"3px"}}>{s.l}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"18px",fontWeight:"900",color:s.col}}>{s.v}</div>
              <span style={{fontSize:"16px"}}>{s.ic}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>

        {/* ── TENANTS ── */}
        {tab==="tenants" && (
          <div style={{display:"grid",gridTemplateColumns:selected?"1fr 340px":"1fr",gap:"16px"}}>
            <div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>{["","Company","Plan","Branches","Users","MRR","Status","Last Active","Action"].map(h=>(
                    <th key={h} style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${C.border}`,textAlign:h==="MRR"?"right":"left",background:C.panel}}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {tenants.map((t,i)=>(
                    <tr key={t.id} style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:selected?.id===t.id?`${C.blue}0a`:"transparent",animation:`rowIn 0.15s ease ${i*0.04}s both`}}
                      onMouseEnter={e=>{if(selected?.id!==t.id)e.currentTarget.style.background=C.panel}}
                      onMouseLeave={e=>{if(selected?.id!==t.id)e.currentTarget.style.background="transparent"}}
                      onClick={()=>setSelected(selected?.id===t.id?null:t)}>
                      <td style={{padding:"11px 12px",fontSize:"20px"}}>{t.logo}</td>
                      <td style={{padding:"11px 12px"}}>
                        <div style={{fontSize:"12px",fontWeight:"700",color:C.text}}>{t.company}</div>
                        <div style={{fontSize:"9px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>{t.ntn} · {t.id}</div>
                      </td>
                      <td style={{padding:"11px 12px"}}><Tag l={t.plan} col={planColor(t.plan)}/></td>
                      <td style={{padding:"11px 12px",fontSize:"11px",color:C.text,textAlign:"center"}}>{t.branches}</td>
                      <td style={{padding:"11px 12px",fontSize:"11px",color:C.text,textAlign:"center"}}>{t.users}</td>
                      <td style={{padding:"11px 12px",fontSize:"12px",fontWeight:"800",color:t.mrr>0?C.green:C.muted,fontFamily:"'IBM Plex Mono'",textAlign:"right"}}>{t.mrr>0?`PKR ${fmt(t.mrr)}`:"—"}</td>
                      <td style={{padding:"11px 12px"}}><Tag l={t.status.toUpperCase()} col={statusColor(t.status)}/></td>
                      <td style={{padding:"11px 12px",fontSize:"10px",color:C.muted}}>{t.lastActive}</td>
                      <td style={{padding:"11px 12px"}}>
                        <div style={{display:"flex",gap:"4px"}} onClick={e=>e.stopPropagation()}>
                          <button style={{padding:"3px 8px",borderRadius:"4px",border:`1px solid ${C.border}`,background:"transparent",color:C.blue,cursor:"pointer",fontSize:"9px",fontWeight:"700"}} onClick={()=>{setSelected(t)}}>Manage</button>
                          {t.status==="active" && <button onClick={()=>{setTenants(p=>p.map(x=>x.id===t.id?{...x,status:"suspended"}:x));notify(`${t.company} suspended`,"error")}} style={{padding:"3px 8px",borderRadius:"4px",border:`1px solid ${C.red}44`,background:"transparent",color:C.red,cursor:"pointer",fontSize:"9px"}}>Suspend</button>}
                          {t.status==="suspended" && <button onClick={()=>{setTenants(p=>p.map(x=>x.id===t.id?{...x,status:"active"}:x));notify(`${t.company} restored`)}} style={{padding:"3px 8px",borderRadius:"4px",border:`1px solid ${C.green}44`,background:"transparent",color:C.green,cursor:"pointer",fontSize:"9px"}}>Restore</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tenant Detail */}
            {selected && (
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",overflow:"hidden",height:"fit-content",animation:"slideIn 0.2s ease"}}>
                <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:`linear-gradient(135deg,${C.panel},${C.card})`}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontSize:"28px"}}>{selected.logo}</span>
                    <div>
                      <div style={{fontSize:"14px",fontWeight:"900",color:C.text}}>{selected.company}</div>
                      <div style={{display:"flex",gap:"5px",marginTop:"3px"}}>
                        <Tag l={selected.plan} col={planColor(selected.plan)}/>
                        <Tag l={selected.status.toUpperCase()} col={statusColor(selected.status)}/>
                      </div>
                    </div>
                  </div>
                  <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px"}}>✕</button>
                </div>
                <div style={{padding:"16px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"14px"}}>
                    {[{l:"Tenant ID",v:selected.id,col:C.blue},{l:"NTN",v:selected.ntn,col:C.text},{l:"Joined",v:selected.joined,col:C.text},{l:"Storage",v:selected.storage,col:C.teal},{l:"Branches",v:selected.branches,col:C.text},{l:"Users",v:selected.users,col:C.text},{l:"MRR",v:selected.mrr>0?`PKR ${fmt(selected.mrr)}`:"—",col:selected.mrr>0?C.green:C.muted},{l:"Last Active",v:selected.lastActive,col:C.text}].map(s=>(
                      <div key={s.l} style={{background:C.panel,borderRadius:"7px",padding:"8px 10px"}}>
                        <div style={{fontSize:"9px",color:C.muted,marginBottom:"2px"}}>{s.l}</div>
                        <div style={{fontSize:"12px",fontWeight:"700",color:s.col,fontFamily:s.l==="Tenant ID"||s.l==="NTN"?"'IBM Plex Mono'":'inherit'}}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                    {[{l:"🔑 Reset Password",col:C.yellow},{l:"📊 View Reports",col:C.blue},{l:"💾 Backup Tenant",col:C.green},{l:"📧 Send Email",col:C.teal},{l:"🔧 Impersonate",col:C.purple},{l:selected.status==="active"?"🚫 Suspend Tenant":"✅ Restore Tenant",col:selected.status==="active"?C.red:C.green}].map(a=>(
                      <button key={a.l} onClick={()=>notify(`${a.l} — ${selected.company}`)} style={{padding:"8px 12px",borderRadius:"7px",border:`1px solid ${a.col}44`,background:`${a.col}10`,color:a.col,cursor:"pointer",fontSize:"11px",fontWeight:"700",textAlign:"left"}}>
                        {a.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SUBSCRIPTIONS ── */}
        {tab==="subscriptions" && (
          <div style={{display:"flex",flexDirection:"column",gap:"18px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px"}}>
              {PLANS.map(plan=>(
                <div key={plan.name} style={{background:C.card,border:`2px solid ${plan.color}44`,borderRadius:"12px",overflow:"hidden"}}>
                  <div style={{padding:"16px",background:`linear-gradient(135deg,${plan.color}18,${plan.color}0a)`,borderBottom:`1px solid ${plan.color}22`}}>
                    <div style={{fontSize:"10px",color:plan.color,fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.1em"}}>{plan.name}</div>
                    <div style={{fontSize:"28px",fontWeight:"900",color:C.text,marginTop:"6px"}}>PKR {fmt(plan.price)}<span style={{fontSize:"11px",color:C.muted,fontWeight:"400"}}>/mo</span></div>
                  </div>
                  <div style={{padding:"14px 16px"}}>
                    <div style={{display:"flex",flexDirection:"column",gap:"5px",marginBottom:"14px"}}>
                      {[{l:"Branches",v:plan.branches},{l:"Users",v:plan.users}].map(f=>(
                        <div key={f.l} style={{display:"flex",justifyContent:"space-between",fontSize:"11px"}}>
                          <span style={{color:C.muted}}>{f.l}</span>
                          <span style={{fontWeight:"700",color:C.text}}>{f.v}</span>
                        </div>
                      ))}
                      {plan.features.map(f=>(
                        <div key={f} style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"11px",color:C.muted}}>
                          <span style={{color:C.green}}>✓</span>{f}
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:"11px",color:C.muted,marginBottom:"8px"}}>
                      <strong style={{color:plan.color}}>{tenants.filter(t=>t.plan===plan.name).length}</strong> active tenants
                    </div>
                    <Btn full color={plan.color} outline small onClick={()=>notify(`${plan.name} plan settings opened`)}>⚙ Configure</Btn>
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
              <div style={{fontSize:"15px",fontWeight:"800",color:C.text,marginBottom:"14px"}}>Revenue by Plan</div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Plan","Tenants","MRR","ARR","Churn"].map(h=><th key={h} style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${C.border}`,textAlign:h==="Plan"?"left":"right"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {PLANS.map(plan=>{
                    const ts = tenants.filter(t=>t.plan===plan.name&&t.status==="active");
                    const mrr = ts.reduce((s,t)=>s+t.mrr,0);
                    return (
                      <tr key={plan.name} style={{borderBottom:`1px solid ${C.border}`}}
                        onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{padding:"11px 12px"}}><Tag l={plan.name} col={planColor(plan.name)}/></td>
                        <td style={{padding:"11px 12px",textAlign:"right",fontSize:"12px",fontWeight:"700",color:C.text}}>{ts.length}</td>
                        <td style={{padding:"11px 12px",textAlign:"right",fontSize:"12px",fontWeight:"800",color:C.green,fontFamily:"'IBM Plex Mono'"}}>PKR {fmt(mrr)}</td>
                        <td style={{padding:"11px 12px",textAlign:"right",fontSize:"12px",fontWeight:"800",color:C.blue,fontFamily:"'IBM Plex Mono'"}}>PKR {fmt(mrr*12)}</td>
                        <td style={{padding:"11px 12px",textAlign:"right",fontSize:"11px",color:C.green}}>0%</td>
                      </tr>
                    );
                  })}
                  <tr style={{borderTop:`2px solid ${C.border}`,background:`${C.accent}08`}}>
                    <td style={{padding:"10px 12px",fontWeight:"800",color:C.text,fontSize:"11px"}}>TOTAL</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontWeight:"900",color:C.text,fontSize:"12px"}}>{activeCount}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontWeight:"900",color:C.accent,fontSize:"14px",fontFamily:"'IBM Plex Mono'"}}>PKR {fmt(totalMRR)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontWeight:"900",color:C.blue,fontSize:"13px",fontFamily:"'IBM Plex Mono'"}}>PKR {fmt(totalMRR*12)}</td>
                    <td/>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── AUDIT LOG ── */}
        {tab==="auditLog" && (
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
                {["All","CREATE","UPDATE","DELETE","POST","LOGIN","CONFIG","BACKUP","SUSPEND"].map(a=>(
                  <button key={a} onClick={()=>setAuditFilter(a)} style={{padding:"4px 10px",borderRadius:"20px",border:"none",cursor:"pointer",fontSize:"10px",fontWeight:"700",background:auditFilter===a?C.blue:"transparent",color:auditFilter===a?"#fff":C.muted}}>
                    {a}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:"4px",marginLeft:"auto"}}>
                {["All","low","medium","high"].map(r=>(
                  <button key={r} onClick={()=>setRiskFilter(r)} style={{padding:"4px 10px",borderRadius:"20px",border:`1px solid ${riskFilter===r?riskColor(r):C.border}`,cursor:"pointer",fontSize:"10px",fontWeight:"700",background:riskFilter===r?`${riskColor(r)}18`:"transparent",color:riskFilter===r?riskColor(r):C.muted}}>
                    {r==="All"?"All Risk":r.charAt(0).toUpperCase()+r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>{["Timestamp","Tenant","User","Action","Entity","Detail","IP","Risk"].map(h=>(
                    <th key={h} style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${C.border}`,textAlign:"left",background:C.panel,whiteSpace:"nowrap"}}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {filteredAudit.map((log,i)=>(
                    <tr key={log.id} style={{borderBottom:`1px solid ${C.border}`,animation:`rowIn 0.15s ease ${i*0.03}s both`,borderLeft:log.risk==="high"?`3px solid ${C.red}`:log.risk==="medium"?`3px solid ${C.yellow}`:"3px solid transparent"}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"9px 12px",fontSize:"9px",color:C.muted,fontFamily:"'IBM Plex Mono'",whiteSpace:"nowrap"}}>{log.ts}</td>
                      <td style={{padding:"9px 12px",fontSize:"10px",color:C.text,fontWeight:"600"}}>{log.tenant}</td>
                      <td style={{padding:"9px 12px",fontSize:"10px",color:C.muted,maxWidth:"140px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{log.user}</td>
                      <td style={{padding:"9px 12px"}}>
                        <span style={{fontSize:"9px",fontWeight:"800",padding:"2px 7px",borderRadius:"4px",background:
                          log.action==="DELETE"?`${C.red}18`:log.action==="CREATE"?`${C.green}18`:log.action==="UPDATE"?`${C.yellow}18`:log.action==="SUSPEND"?`${C.red}18`:`${C.blue}18`,
                          color:log.action==="DELETE"||log.action==="SUSPEND"?C.red:log.action==="CREATE"?C.green:log.action==="UPDATE"?C.yellow:C.blue}}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{padding:"9px 12px",fontSize:"10px",color:C.teal}}>{log.entity}</td>
                      <td style={{padding:"9px 12px",fontSize:"10px",color:C.text,maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{log.detail}</td>
                      <td style={{padding:"9px 12px",fontSize:"9px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>{log.ip}</td>
                      <td style={{padding:"9px 12px"}}>
                        <span style={{fontSize:"9px",fontWeight:"700",padding:"2px 7px",borderRadius:"12px",background:`${riskColor(log.risk)}18`,color:riskColor(log.risk)}}>{log.risk}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── BACKUPS ── */}
        {tab==="backups" && (
          <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
              {[
                {l:"Last Backup",     v:"2024-03-02 23:00", ic:"✅", col:C.green,  sub:"Nightly auto backup"},
                {l:"Total Backups",   v:BACKUPS.length,     ic:"💾", col:C.blue,   sub:"All time"},
                {l:"Total Storage",   v:"18.4 GB",          ic:"🗄", col:C.purple, sub:"Across all backups"},
              ].map(s=>(
                <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"14px 16px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,right:0,width:"48px",height:"48px",borderRadius:"0 10px 0 48px",background:`${s.col}12`}}/>
                  <div style={{fontSize:"9px",color:C.muted,fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"5px"}}>{s.l}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:"16px",fontWeight:"900",color:s.col}}>{s.v}</div>
                    <span style={{fontSize:"20px"}}>{s.ic}</span>
                  </div>
                  <div style={{fontSize:"9px",color:C.muted,marginTop:"2px"}}>{s.sub}</div>
                  <div style={{position:"absolute",bottom:0,left:0,height:"3px",width:"100%",background:`linear-gradient(90deg,${s.col},transparent)`}}/>
                </div>
              ))}
            </div>

            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",overflow:"hidden"}}>
              <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{fontSize:"14px",fontWeight:"800",color:C.text}}>Backup History</div>
                <div style={{display:"flex",gap:"8px"}}>
                  <Btn small color={C.yellow} outline onClick={()=>notify("Backup schedule configured")}>⏰ Schedule</Btn>
                  <Btn small color={C.blue} onClick={doBackup} disabled={backingUp}>
                    {backingUp?<span style={{display:"inline-block",animation:"spin 0.8s linear infinite"}}>⟳</span>:"💾"}
                    {backingUp?"Backing up...":"Backup All Tenants"}
                  </Btn>
                </div>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Name","Date","Size","Type","Tenants","Status","Duration","Actions"].map(h=>(
                  <th key={h} style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${C.border}`,textAlign:"left",background:C.panel}}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {BACKUPS.map((b,i)=>(
                    <tr key={b.id} style={{borderBottom:`1px solid ${C.border}`,animation:`rowIn 0.15s ease ${i*0.04}s both`}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"10px 12px",fontSize:"10px",color:C.blue,fontFamily:"'IBM Plex Mono'"}}>{b.name}</td>
                      <td style={{padding:"10px 12px",fontSize:"10px",color:C.muted}}>{b.date}</td>
                      <td style={{padding:"10px 12px",fontSize:"11px",fontWeight:"700",color:C.text}}>{b.size}</td>
                      <td style={{padding:"10px 12px"}}><Tag l={b.type} col={b.type==="Auto"?C.blue:C.purple} sm/></td>
                      <td style={{padding:"10px 12px",fontSize:"11px",color:C.muted,textAlign:"center"}}>{b.tenants}</td>
                      <td style={{padding:"10px 12px"}}><Tag l={b.status.toUpperCase()} col={C.green} sm/></td>
                      <td style={{padding:"10px 12px",fontSize:"10px",color:C.muted}}>{b.duration}</td>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",gap:"4px"}}>
                          <button onClick={()=>notify("Download started")} style={{padding:"3px 8px",borderRadius:"4px",border:`1px solid ${C.border}`,background:"transparent",color:C.blue,cursor:"pointer",fontSize:"9px",fontWeight:"700"}}>⬇ Download</button>
                          <button onClick={()=>notify("Restore initiated","error")} style={{padding:"3px 8px",borderRadius:"4px",border:`1px solid ${C.yellow}44`,background:"transparent",color:C.yellow,cursor:"pointer",fontSize:"9px",fontWeight:"700"}}>↩ Restore</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SYSTEM ── */}
        {tab==="system" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
            {[
              { title:"System Health", icon:"💚", items:[{l:"API Server",v:"Running",col:C.green},{l:"Database",v:"PostgreSQL 15.2",col:C.green},{l:"Redis Cache",v:"Running",col:C.green},{l:"FBR API",v:"Connected",col:C.green},{l:"Storage",v:"18.4 / 100 GB",col:C.blue},{l:"CPU Usage",v:"12%",col:C.green},{l:"Memory",v:"3.2 / 8 GB",col:C.yellow},{l:"Uptime",v:"99.97%",col:C.green}] },
              { title:"Platform Config", icon:"⚙️", items:[{l:"Version",v:"v1.0.0-beta"},{l:"Node.js",v:"v20.11.0"},{l:"Next.js",v:"14.1.0"},{l:"PostgreSQL",v:"15.2"},{l:"Deployment",v:"AWS ap-south-1"},{l:"SSL",v:"Valid (365 days)"},{l:"Backups",v:"Daily 11PM PKT"},{l:"Max Tenants",v:"Unlimited"}] },
              { title:"RBAC Roles", icon:"🔐", items:[{l:"Super Admin",v:"Full Access",col:C.purple},{l:"Admin",v:"All modules",col:C.blue},{l:"Accountant",v:"Finance + Reports",col:C.teal},{l:"Cashier",v:"POS only",col:C.green},{l:"Viewer",v:"Reports only",col:C.yellow},{l:"Branch Manager",v:"Branch data",col:C.accent}] },
              { title:"Integrations", icon:"🔌", items:[{l:"FBR POS API",v:"Active",col:C.green},{l:"SMS (Jazz)",v:"Active",col:C.green},{l:"Email (SES)",v:"Active",col:C.green},{l:"WhatsApp API",v:"Configured",col:C.green},{l:"Barcode API",v:"Active",col:C.green},{l:"Payment Gateway",v:"Pending",col:C.yellow}] },
            ].map(section=>(
              <div key={section.title} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"11px",padding:"18px"}}>
                <div style={{fontSize:"13px",fontWeight:"800",color:C.text,marginBottom:"14px",display:"flex",alignItems:"center",gap:"8px"}}>
                  <span>{section.icon}</span>{section.title}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  {section.items.map(item=>(
                    <div key={item.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:C.panel,borderRadius:"6px"}}>
                      <span style={{fontSize:"11px",color:C.muted}}>{item.l}</span>
                      <span style={{fontSize:"11px",fontWeight:"700",color:item.col||C.text}}>{item.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notification && (
        <div style={{position:"fixed",top:"16px",left:"50%",transform:"translateX(-50%)",zIndex:400,background:notification.type==="error"?C.red:C.green,color:"#fff",padding:"10px 18px",borderRadius:"8px",fontSize:"12px",fontWeight:"700",boxShadow:"0 8px 24px rgba(0,0,0,0.4)",animation:"slideIn 0.2s ease",whiteSpace:"nowrap"}}>
          {notification.type==="error"?"⚠":"✓"} {notification.msg}
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from "react";

// ================================================================
// INFOSYS PAK ERP — STEP 10: HR & PAYROLL MODULE
// Employees · Attendance · Payroll · Leave Management · Salary Slips
// ================================================================

const C = {
  bg:"#060a10", panel:"#090f1a", card:"#0d1825", card2:"#0b1520",
  border:"#162030", border2:"#1e2e40", text:"#dce4f0", muted:"#4a6070",
  muted2:"#111d28", accent:"#f97316", blue:"#3b82f6", green:"#10b981",
  red:"#ef4444", yellow:"#f59e0b", purple:"#8b5cf6", teal:"#06b6d4",
  pink:"#ec4899", lime:"#84cc16", sky:"#0ea5e9", input:"#070f1a",
};
const fmt  = n => new Intl.NumberFormat("en-PK").format(Math.round(n));
const fmtC = n => `PKR ${fmt(n)}`;
const TODAY = "2024-03-02";
const MONTH = "March 2024";
const DAYS_IN_MONTH = 31;
const WORK_DAYS = 26;

// ── EMPLOYEES ─────────────────────────────────────────────────────
const EMPLOYEES = [
  { id:"e01", empNo:"EMP-001", name:"Ahmed Raza",       fatherName:"Raza Khan",       cnic:"35202-1234567-1", phone:"0300-1234567", email:"ahmed@albaraka.pk",  dept:"Management",  designation:"General Manager",   branch:"Lahore Main",  join:"2018-01-15", type:"Permanent", status:"active",  basicSalary:120000, allowances:{house:48000,conveyance:8000,medical:5000,utility:3000}, deductions:{eobi:1900,pessi:0,loan:0,advance:0}, bank:"HBL", iban:"PK36HABB0000000100030069", gender:"Male",   dob:"1985-06-12", qualification:"MBA", probation:false  },
  { id:"e02", empNo:"EMP-002", name:"Sana Butt",         fatherName:"Butt Sahib",      cnic:"35201-9876543-2", phone:"0311-9876543", email:"sana@albaraka.pk",   dept:"Accounts",    designation:"Senior Accountant", branch:"Lahore Main",  join:"2020-03-01", type:"Permanent", status:"active",  basicSalary:65000,  allowances:{house:26000,conveyance:5000,medical:3000,utility:2000}, deductions:{eobi:1900,pessi:0,loan:5000,advance:0}, bank:"MCB", iban:"PK35MUCB0002280100879879", gender:"Female", dob:"1992-09-20", qualification:"B.Com", probation:false },
  { id:"e03", empNo:"EMP-003", name:"Tariq Hassan",     fatherName:"Hassan Ali",      cnic:"42101-5555555-3", phone:"0321-5555555", email:"tariq@albaraka.pk",  dept:"Sales",       designation:"Sales Manager",      branch:"Karachi",     join:"2019-07-10", type:"Permanent", status:"active",  basicSalary:75000,  allowances:{house:30000,conveyance:6000,medical:4000,utility:2500}, deductions:{eobi:1900,pessi:0,loan:0,advance:10000}, bank:"UBL", iban:"PK02UNIL0109000100488017", gender:"Male",   dob:"1988-03-15", qualification:"BBA", probation:false  },
  { id:"e04", empNo:"EMP-004", name:"Fatima Malik",     fatherName:"Malik Sahib",     cnic:"61101-2222222-4", phone:"0333-2222222", email:"fatima@albaraka.pk", dept:"HR",          designation:"HR Officer",         branch:"Islamabad",   join:"2021-11-20", type:"Permanent", status:"active",  basicSalary:55000,  allowances:{house:22000,conveyance:4000,medical:3000,utility:1500}, deductions:{eobi:1900,pessi:0,loan:0,advance:0}, bank:"HBL", iban:"PK36HABB0000000200040010", gender:"Female", dob:"1994-12-01", qualification:"BCS", probation:false  },
  { id:"e05", empNo:"EMP-005", name:"Khalid Mehmood",   fatherName:"Mehmood Sb",      cnic:"33100-7777777-5", phone:"0345-7777777", email:"khalid@albaraka.pk", dept:"Warehouse",   designation:"Warehouse Manager",  branch:"Lahore Main",  join:"2017-05-22", type:"Permanent", status:"active",  basicSalary:50000,  allowances:{house:20000,conveyance:4000,medical:2500,utility:1500}, deductions:{eobi:1900,pessi:0,loan:8000,advance:0}, bank:"MCB", iban:"PK35MUCB0001100100345678", gender:"Male",   dob:"1982-08-30", qualification:"Matric", probation:false },
  { id:"e06", empNo:"EMP-006", name:"Asma Shahid",      fatherName:"Shahid Bhai",     cnic:"35202-3333333-6", phone:"0301-3333333", email:"asma@albaraka.pk",   dept:"Accounts",    designation:"Accounts Officer",   branch:"Islamabad",   join:"2022-02-01", type:"Contractual",status:"active",  basicSalary:40000,  allowances:{house:16000,conveyance:3000,medical:2000,utility:1000}, deductions:{eobi:1900,pessi:0,loan:0,advance:5000}, bank:"UBL", iban:"PK02UNIL0109000200123456", gender:"Female", dob:"1996-05-10", qualification:"B.Com", probation:false },
  { id:"e07", empNo:"EMP-007", name:"Bilal Khan",       fatherName:"Khan Sahib",      cnic:"37405-4444444-7", phone:"0312-4444444", email:"bilal@albaraka.pk",  dept:"Sales",       designation:"Sales Executive",    branch:"Karachi",     join:"2023-08-15", type:"Contractual",status:"active",  basicSalary:35000,  allowances:{house:14000,conveyance:3000,medical:1500,utility:1000}, deductions:{eobi:1900,pessi:0,loan:0,advance:0}, bank:"HBL", iban:"PK36HABB0000000300050020", gender:"Male",   dob:"1998-11-22", qualification:"BA", probation:true   },
  { id:"e08", empNo:"EMP-008", name:"Nadia Iqbal",      fatherName:"Iqbal Sahib",     cnic:"42201-6666666-8", phone:"0322-6666666", email:"nadia@albaraka.pk",  dept:"Management",  designation:"Admin Officer",      branch:"Lahore Main",  join:"2020-09-01", type:"Permanent", status:"active",  basicSalary:45000,  allowances:{house:18000,conveyance:3500,medical:2500,utility:1500}, deductions:{eobi:1900,pessi:0,loan:0,advance:0}, bank:"MCB", iban:"PK35MUCB0001200100654321", gender:"Female", dob:"1990-04-18", qualification:"BBA", probation:false  },
  { id:"e09", empNo:"EMP-009", name:"Rashid Farooq",    fatherName:"Farooq Bhai",     cnic:"35201-8888888-9", phone:"0300-8888888", email:"rashid@albaraka.pk", dept:"Warehouse",   designation:"Store Keeper",       branch:"Faisalabad",  join:"2021-04-05", type:"Permanent", status:"active",  basicSalary:30000,  allowances:{house:12000,conveyance:2500,medical:1500,utility:1000}, deductions:{eobi:1900,pessi:0,loan:0,advance:3000}, bank:"UBL", iban:"PK02UNIL0109000300789012", gender:"Male",   dob:"1991-07-25", qualification:"Intermediate", probation:false },
  { id:"e10", empNo:"EMP-010", name:"Zara Ahmed",       fatherName:"Ahmed Bhai",      cnic:"35202-9999999-0", phone:"0311-9999999", email:"zara@albaraka.pk",   dept:"HR",          designation:"Receptionist",       branch:"Lahore Main",  join:"2023-01-10", type:"Probation", status:"active",  basicSalary:28000,  allowances:{house:11200,conveyance:2000,medical:1500,utility:800},  deductions:{eobi:1900,pessi:0,loan:0,advance:0}, bank:"HBL", iban:"PK36HABB0000000400060030", gender:"Female", dob:"2001-02-14", qualification:"B.Com", probation:true   },
];

const DEPARTMENTS = ["Management","Accounts","Sales","HR","Warehouse","IT","Operations"];
const DESIGNATIONS = {
  Management: ["General Manager","Admin Officer","CEO","COO"],
  Accounts:   ["Senior Accountant","Accounts Officer","Junior Accountant"],
  Sales:      ["Sales Manager","Sales Executive","Area Sales Manager"],
  HR:         ["HR Manager","HR Officer","Receptionist"],
  Warehouse:  ["Warehouse Manager","Store Keeper","Inventory Officer"],
  IT:         ["IT Manager","Software Developer","Support Engineer"],
  Operations: ["Operations Manager","Operations Executive"],
};

// ── ATTENDANCE DATA ───────────────────────────────────────────────
const generateAttendance = (empId) => {
  const seed = empId.charCodeAt(2);
  const days = [];
  for (let d = 1; d <= DAYS_IN_MONTH; d++) {
    const date = `2024-03-${String(d).padStart(2,"0")}`;
    const dow  = new Date(date).getDay();
    if (dow === 0 || dow === 6) { days.push({date, day:d, status:"weekend", in:null, out:null, ot:0}); continue; }
    if (d > 2) { days.push({date, day:d, status:"future", in:null, out:null, ot:0}); continue; }
    const r = (seed * d * 7 + d * 13) % 100;
    if (r < 5)  { days.push({date, day:d, status:"absent",  in:null,    out:null,    ot:0}); continue; }
    if (r < 12) { days.push({date, day:d, status:"late",    in:"09:42", out:"18:00", ot:0}); continue; }
    if (r < 18) { days.push({date, day:d, status:"halfday", in:"09:00", out:"13:00", ot:0}); continue; }
    const ot = r < 30 ? 2 : 0;
    days.push({date, day:d, status:"present", in:"09:00", out: ot ? "20:00" : "18:00", ot});
  }
  return days;
};

// Pre-build for all
const ATTENDANCE_MAP = {};
EMPLOYEES.forEach(e => { ATTENDANCE_MAP[e.id] = generateAttendance(e.id); });

// ── LEAVE REQUESTS ────────────────────────────────────────────────
const LEAVES_INIT = [
  { id:"l01", empId:"e02", empName:"Sana Butt",       type:"Sick",      from:"2024-03-05", to:"2024-03-06", days:2, reason:"Fever",                  status:"approved", appliedOn:"2024-03-04", approvedBy:"Ahmed Raza" },
  { id:"l02", empId:"e03", empName:"Tariq Hassan",    type:"Annual",    from:"2024-03-10", to:"2024-03-12", days:3, reason:"Family wedding in Lahore",status:"pending",  appliedOn:"2024-03-01", approvedBy:null },
  { id:"l03", empId:"e07", empName:"Bilal Khan",      type:"Casual",    from:"2024-02-28", to:"2024-02-28", days:1, reason:"Personal work",            status:"approved", appliedOn:"2024-02-27", approvedBy:"Ahmed Raza" },
  { id:"l04", empId:"e05", empName:"Khalid Mehmood",  type:"Annual",    from:"2024-03-18", to:"2024-03-22", days:5, reason:"Umrah trip",               status:"pending",  appliedOn:"2024-03-02", approvedBy:null },
  { id:"l05", empId:"e09", empName:"Rashid Farooq",   type:"Sick",      from:"2024-02-20", to:"2024-02-21", days:2, reason:"Medical checkup",          status:"approved", appliedOn:"2024-02-19", approvedBy:"Fatima Malik" },
  { id:"l06", empId:"e06", empName:"Asma Shahid",     type:"Maternity", from:"2024-04-01", to:"2024-07-01", days:90,reason:"Maternity leave",          status:"pending",  appliedOn:"2024-03-01", approvedBy:null },
  { id:"l07", empId:"e04", empName:"Fatima Malik",    type:"Casual",    from:"2024-03-15", to:"2024-03-15", days:1, reason:"Child school event",       status:"rejected", appliedOn:"2024-03-10", approvedBy:"Ahmed Raza" },
  { id:"l08", empId:"e10", empName:"Zara Ahmed",      type:"Sick",      from:"2024-03-01", to:"2024-03-02", days:2, reason:"Flu",                     status:"approved", appliedOn:"2024-02-29", approvedBy:"Fatima Malik" },
];

// ── LEAVE BALANCES ────────────────────────────────────────────────
const LEAVE_BALANCES = {
  e01:{annual:21,sick:10,casual:12,used:{annual:0,sick:0,casual:0}},
  e02:{annual:21,sick:10,casual:12,used:{annual:0,sick:2,casual:0}},
  e03:{annual:21,sick:10,casual:12,used:{annual:0,sick:0,casual:0}},
  e04:{annual:21,sick:10,casual:12,used:{annual:0,sick:0,casual:1}},
  e05:{annual:21,sick:10,casual:12,used:{annual:0,sick:0,casual:0}},
  e06:{annual:14,sick:10,casual:8, used:{annual:0,sick:0,casual:0}},
  e07:{annual:10,sick:7, casual:6, used:{annual:0,sick:0,casual:1}},
  e08:{annual:21,sick:10,casual:12,used:{annual:0,sick:0,casual:0}},
  e09:{annual:21,sick:10,casual:12,used:{annual:0,sick:2,casual:0}},
  e10:{annual:7, sick:7, casual:6, used:{annual:0,sick:2,casual:0}},
};

// ── PAYROLL HELPERS ───────────────────────────────────────────────
const calcPayroll = (emp, att) => {
  const totalDays   = att.filter(d => d.status !== "future").length;
  const workDays    = att.filter(d => !["weekend","future"].includes(d.status)).length;
  const present     = att.filter(d => d.status === "present").length;
  const absent      = att.filter(d => d.status === "absent").length;
  const halfDays    = att.filter(d => d.status === "halfday").length;
  const late        = att.filter(d => d.status === "late").length;
  const otHours     = att.reduce((s,d) => s + (d.ot||0), 0);
  const effectiveDays = present + (halfDays * 0.5) + (late * 0.9);
  const grossPay    = emp.basicSalary + Object.values(emp.allowances).reduce((a,b)=>a+b,0);
  const perDayRate  = grossPay / WORK_DAYS;
  const absentDed   = absent * perDayRate;
  const halfDayDed  = halfDays * (perDayRate * 0.5);
  const otPay       = (emp.basicSalary / (WORK_DAYS * 8)) * 1.5 * otHours;
  const totalDed    = Object.values(emp.deductions).reduce((a,b)=>a+b,0) + absentDed + halfDayDed;
  const netPay      = grossPay + otPay - totalDed;
  return { grossPay, netPay, totalDed, absentDed, halfDayDed, otPay, perDayRate, present, absent, halfDays, late, otHours, effectiveDays, workDays };
};

// ── HELPERS ───────────────────────────────────────────────────────
const Tag = ({l,col,sm}) => (
  <span style={{fontSize:sm?"9px":"10px",fontWeight:"700",padding:sm?"1px 5px":"2px 8px",borderRadius:"20px",background:`${col}18`,color:col,border:`1px solid ${col}28`,whiteSpace:"nowrap"}}>{l}</span>
);
const Btn = ({onClick,children,color=C.blue,outline=false,small=false,disabled=false,full=false}) => (
  <button onClick={onClick} disabled={disabled} style={{width:full?"100%":"auto",padding:small?"5px 11px":"9px 16px",borderRadius:"7px",border:outline?`1px solid ${color}55`:"none",background:disabled?"#131f2d":outline?`${color}0e`:color,color:disabled?C.muted:"#fff",cursor:disabled?"not-allowed":"pointer",fontSize:small?"10px":"12px",fontWeight:"700",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"5px",whiteSpace:"nowrap",fontFamily:"inherit"}}>
    {children}
  </button>
);
const TH = ({c,right,col,w}) => <th style={{padding:"8px 12px",fontSize:"9px",fontWeight:"700",color:col||C.muted,textTransform:"uppercase",letterSpacing:".07em",borderBottom:`1px solid ${C.border}`,background:C.panel,textAlign:right?"right":"left",whiteSpace:"nowrap",width:w}}>{c}</th>;
const TD = ({children,right,mono,bold,col,sm,muted}) => <td style={{padding:"10px 12px",fontSize:sm?"9px":"11px",fontWeight:bold?"800":"400",color:muted?C.muted:col||C.text,textAlign:right?"right":"left",fontFamily:mono?"'IBM Plex Mono'":'inherit'}}>{children}</td>;
const Inp = ({label,value,onChange,type="text",placeholder,opts,span}) => {
  const s={width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"8px 10px",color:C.text,fontSize:"12px",outline:"none",fontFamily:"inherit"};
  return(
    <div style={{gridColumn:span?"1/-1":"auto"}}>
      <label style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:"4px"}}>{label}</label>
      {opts?<select value={value} onChange={e=>onChange(e.target.value)} style={s}>{opts.map(o=><option key={o}>{o}</option>)}</select>
           :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s}
              onFocus={el=>el.target.style.borderColor=C.blue} onBlur={el=>el.target.style.borderColor=C.border}/>}
    </div>
  );
};

const DEPTCOL = {Management:C.purple,Accounts:C.blue,Sales:C.green,HR:C.pink,Warehouse:C.yellow,IT:C.teal,Operations:C.accent};
const LEAVECOL = {approved:C.green,pending:C.yellow,rejected:C.red};
const ATTCOL = {present:C.green,absent:C.red,late:C.yellow,halfday:C.accent,weekend:C.muted2,future:C.muted2,holiday:C.purple};

// ═══════════════════════════════════════════════════════════════════
// MAIN HR MODULE
// ═══════════════════════════════════════════════════════════════════
export default function HRModule() {
  const [tab,       setTab]       = useState("employees");
  const [empList,   setEmpList]   = useState(EMPLOYEES);
  const [leaves,    setLeaves]    = useState(LEAVES_INIT);
  const [selEmp,    setSelEmp]    = useState(null);
  const [selLeave,  setSelLeave]  = useState(null);
  const [search,    setSearch]    = useState("");
  const [deptF,     setDeptF]     = useState("all");
  const [payPeriod]               = useState(MONTH);
  const [showPayslip,setShowPayslip]=useState(null);
  const [showNewEmp, setShowNewEmp]=useState(false);
  const [showLeave,  setShowLeave] =useState(false);
  const [notif,     setNotif]     = useState(null);
  const [payrollRun,setPayrollRun]= useState(false);
  const [payrollDone,setPayrollDone]=useState(false);

  const notify = (msg,type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3500); };

  const filtered = useMemo(()=>empList.filter(e=>{
    if(deptF!=="all"&&e.dept!==deptF) return false;
    if(search&&!e.name.toLowerCase().includes(search.toLowerCase())&&!e.empNo.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[empList,deptF,search]);

  const totalPayroll = empList.reduce((s,e)=>{
    const pr = calcPayroll(e, ATTENDANCE_MAP[e.id]||[]);
    return s + pr.netPay;
  },0);

  const TABS=[
    {k:"employees", l:"👥 Employees",   cnt:empList.filter(e=>e.status==="active").length},
    {k:"attendance",l:"📅 Attendance",   cnt:null},
    {k:"payroll",   l:"💳 Payroll",      cnt:null},
    {k:"leaves",    l:"🌴 Leave Mgmt",   cnt:leaves.filter(l=>l.status==="pending").length},
  ];

  return (
    <div style={{display:"flex",height:"100%",flexDirection:"column",background:C.bg,color:C.text,fontFamily:"'IBM Plex Sans',sans-serif",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-thumb{background:#1a2e40;border-radius:4px}
        input,select,textarea,button{font-family:inherit}
        @keyframes sI{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
        @keyframes sR{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
        @keyframes rI{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
        @keyframes fI{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{background:"#050910",borderBottom:`1px solid ${C.border}`,padding:"0 20px",height:"54px",display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
        <div style={{width:"30px",height:"30px",borderRadius:"7px",background:"linear-gradient(135deg,#f97316,#ea580c)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",fontSize:"11px",color:"#fff"}}>IP</div>
        <div>
          <div style={{fontWeight:"800",fontSize:"14px",color:"#fff"}}>HR & Payroll</div>
          <div style={{fontSize:"9px",color:C.muted}}>Employees · Attendance · Payroll · Leave Management</div>
        </div>
        <div style={{display:"flex",gap:"2px",marginLeft:"10px"}}>
          {TABS.map(t=>(
            <button key={t.k} onClick={()=>{setTab(t.k);setSearch("");setSelEmp(null);}}
              style={{padding:"5px 12px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:"700",background:tab===t.k?C.accent:"transparent",color:tab===t.k?"#fff":C.muted,transition:"all .15s",display:"flex",alignItems:"center",gap:"5px"}}>
              {t.l}{t.cnt!=null&&<span style={{fontSize:"9px",padding:"1px 5px",borderRadius:"10px",background:tab===t.k?"rgba(255,255,255,.25)":`${C.accent}22`,color:tab===t.k?"#fff":C.accent}}>{t.cnt}</span>}
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:"7px",alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:"8px",top:"50%",transform:"translateY(-50%)",fontSize:"11px",color:C.muted}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tab==="employees"?"Search employees...":"Search..."}
              style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"6px 10px 6px 26px",color:C.text,fontSize:"11px",outline:"none",width:"190px"}}
              onFocus={e=>e.target.style.borderColor=C.blue} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
          {tab==="employees"&&<Btn color={C.green} small onClick={()=>setShowNewEmp(true)}>+ Add Employee</Btn>}
          {tab==="leaves"   &&<Btn color={C.teal}  small onClick={()=>setShowLeave(true)}>+ Apply Leave</Btn>}
          {tab==="payroll"  &&<Btn color={C.purple} small onClick={()=>notify("Payroll exported to Excel")}>📤 Export</Btn>}
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,padding:"8px 20px",display:"flex",gap:"9px",flexShrink:0,overflowX:"auto"}}>
        {[
          {l:"Total Employees",  v:empList.filter(e=>e.status==="active").length,              col:C.blue,   ic:"👥"},
          {l:"Monthly Payroll",  v:`PKR ${(totalPayroll/1000).toFixed(0)}K`,                   col:C.accent, ic:"💳"},
          {l:"On Leave Today",   v:leaves.filter(l=>l.status==="approved"&&l.from<=TODAY&&l.to>=TODAY).length, col:C.yellow,ic:"🌴"},
          {l:"Pending Leaves",   v:leaves.filter(l=>l.status==="pending").length,              col:C.orange||C.accent, ic:"⏳"},
          {l:"Avg Attendance",   v:"94.2%",                                                    col:C.green,  ic:"📅"},
          {l:"On Probation",     v:empList.filter(e=>e.probation).length,                      col:C.purple, ic:"🔖"},
        ].map(s=>(
          <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"9px",padding:"8px 13px",minWidth:"130px",flex:1,position:"relative",overflow:"hidden"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=s.col+"55"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{position:"absolute",top:0,right:0,width:"32px",height:"32px",borderRadius:"0 9px 0 32px",background:`${s.col}12`}}/>
            <div style={{fontSize:"8px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".06em",marginBottom:"2px"}}>{s.l}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"15px",fontWeight:"900",color:s.col}}>{s.v}</div>
              <span style={{fontSize:"14px"}}>{s.ic}</span>
            </div>
            <div style={{position:"absolute",bottom:0,left:0,height:"2px",width:"100%",background:`linear-gradient(90deg,${s.col},transparent)`}}/>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════
          EMPLOYEES TAB
      ════════════════════════════════════════════════════════════ */}
      {tab==="employees"&&(
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
            {/* Dept filter */}
            <div style={{display:"flex",gap:"5px",marginBottom:"11px",flexWrap:"wrap"}}>
              <button onClick={()=>setDeptF("all")} style={{padding:"3px 10px",borderRadius:"20px",border:`1px solid ${deptF==="all"?C.accent:C.border}`,background:deptF==="all"?`${C.accent}15`:"transparent",color:deptF==="all"?C.accent:C.muted,cursor:"pointer",fontSize:"9px",fontWeight:"700"}}>All ({empList.length})</button>
              {DEPARTMENTS.filter(d=>empList.some(e=>e.dept===d)).map(d=>(
                <button key={d} onClick={()=>setDeptF(d)} style={{padding:"3px 10px",borderRadius:"20px",border:`1px solid ${deptF===d?(DEPTCOL[d]||C.blue):C.border}`,background:deptF===d?`${DEPTCOL[d]||C.blue}15`:"transparent",color:deptF===d?(DEPTCOL[d]||C.blue):C.muted,cursor:"pointer",fontSize:"9px",fontWeight:"700"}}>
                  {d} ({empList.filter(e=>e.dept===d).length})
                </button>
              ))}
            </div>

            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <TH c="Employee"/><TH c="Department"/><TH c="Designation"/><TH c="Branch"/><TH c="Join Date"/><TH c="Type"/><TH c="Basic (PKR)" right/><TH c="Gross (PKR)" right/><TH c="Status"/><TH c="Actions"/>
                </tr></thead>
                <tbody>
                  {filtered.map((emp,i)=>{
                    const gross = emp.basicSalary + Object.values(emp.allowances).reduce((a,b)=>a+b,0);
                    const isSel = selEmp?.id===emp.id;
                    return(
                      <tr key={emp.id} onClick={()=>setSelEmp(isSel?null:emp)}
                        style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:isSel?`${C.blue}0a`:"transparent",animation:`rI .12s ease ${i*.025}s both`,borderLeft:emp.probation?`3px solid ${C.purple}`:isSel?`3px solid ${C.blue}`:"3px solid transparent"}}
                        onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=C.panel}}
                        onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background=isSel?`${C.blue}0a`:"transparent"}}>
                        <td style={{padding:"11px 12px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
                            <div style={{width:"32px",height:"32px",borderRadius:"50%",background:`linear-gradient(135deg,${DEPTCOL[emp.dept]||C.blue},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"900",fontSize:"10px",flexShrink:0}}>
                              {emp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                            </div>
                            <div>
                              <div style={{fontSize:"12px",fontWeight:"700",color:C.text}}>{emp.name}</div>
                              <div style={{fontSize:"9px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>{emp.empNo}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:"11px 12px"}}><Tag l={emp.dept} col={DEPTCOL[emp.dept]||C.blue} sm/></td>
                        <TD sm muted>{emp.designation}</TD>
                        <TD sm muted>{emp.branch}</TD>
                        <TD sm muted>{emp.join}</TD>
                        <td style={{padding:"11px 12px"}}><Tag l={emp.type} col={emp.type==="Permanent"?C.green:emp.type==="Contractual"?C.yellow:C.purple} sm/></td>
                        <TD right mono bold col={C.text}>{fmt(emp.basicSalary)}</TD>
                        <TD right mono bold col={C.green}>{fmt(gross)}</TD>
                        <td style={{padding:"11px 12px"}}>
                          <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
                            <Tag l="Active" col={C.green} sm/>
                            {emp.probation&&<Tag l="Probation" col={C.purple} sm/>}
                          </div>
                        </td>
                        <td style={{padding:"11px 12px"}} onClick={e=>e.stopPropagation()}>
                          <div style={{display:"flex",gap:"4px"}}>
                            <Btn small outline color={C.blue} onClick={()=>{setSelEmp(emp);}}>👁</Btn>
                            <Btn small outline color={C.purple} onClick={()=>setShowPayslip(emp)}>💳</Btn>
                            <Btn small outline color={C.teal} onClick={()=>{setTab("attendance");setSelEmp(emp);}}>📅</Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Employee Detail Panel */}
          {selEmp&&(
            <div style={{width:"300px",background:C.panel,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,animation:"sR .2s ease",overflow:"hidden"}}>
              <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:"12px",fontWeight:"800",color:C.text}}>Employee Profile</span>
                <button onClick={()=>setSelEmp(null)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"16px"}}>✕</button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"13px"}}>
                {/* Avatar */}
                <div style={{textAlign:"center",marginBottom:"14px"}}>
                  <div style={{width:"56px",height:"56px",borderRadius:"50%",background:`linear-gradient(135deg,${DEPTCOL[selEmp.dept]||C.blue},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"900",fontSize:"18px",margin:"0 auto 8px"}}>
                    {selEmp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                  <div style={{fontSize:"14px",fontWeight:"900",color:C.text}}>{selEmp.name}</div>
                  <div style={{fontSize:"10px",color:C.muted}}>{selEmp.designation}</div>
                  <div style={{display:"flex",gap:"4px",justifyContent:"center",marginTop:"6px",flexWrap:"wrap"}}>
                    <Tag l={selEmp.dept} col={DEPTCOL[selEmp.dept]||C.blue} sm/>
                    <Tag l={selEmp.type} col={selEmp.type==="Permanent"?C.green:C.yellow} sm/>
                    {selEmp.probation&&<Tag l="Probation" col={C.purple} sm/>}
                  </div>
                </div>
                {/* Info */}
                <div style={{display:"flex",flexDirection:"column",gap:"5px",marginBottom:"12px"}}>
                  {[
                    ["Emp No.",    selEmp.empNo],
                    ["CNIC",       selEmp.cnic],
                    ["Phone",      selEmp.phone],
                    ["Email",      selEmp.email],
                    ["Branch",     selEmp.branch],
                    ["Join Date",  selEmp.join],
                    ["DOB",        selEmp.dob],
                    ["Qualification",selEmp.qualification],
                    ["Bank",       selEmp.bank],
                  ].map(([l,v])=>(
                    <div key={l} style={{background:C.card,borderRadius:"6px",padding:"7px 9px",display:"flex",justifyContent:"space-between",gap:"8px",alignItems:"flex-start"}}>
                      <span style={{fontSize:"9px",color:C.muted,whiteSpace:"nowrap",paddingTop:"1px"}}>{l}</span>
                      <span style={{fontSize:"10px",fontWeight:"700",color:C.text,textAlign:"right",wordBreak:"break-all"}}>{v}</span>
                    </div>
                  ))}
                </div>
                {/* Salary breakdown */}
                <div style={{background:C.card,borderRadius:"8px",padding:"11px",marginBottom:"11px",border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".06em",marginBottom:"8px"}}>Salary Structure</div>
                  {[
                    ["Basic Salary",    selEmp.basicSalary,     C.text],
                    ["House Allowance", selEmp.allowances.house, C.muted],
                    ["Conveyance",      selEmp.allowances.conveyance, C.muted],
                    ["Medical",         selEmp.allowances.medical, C.muted],
                    ["Utility",         selEmp.allowances.utility, C.muted],
                  ].map(([l,v,col])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:"10px",marginBottom:"4px"}}>
                      <span style={{color:C.muted}}>{l}</span>
                      <span style={{fontFamily:"'IBM Plex Mono'",fontWeight:"700",color:col}}>{fmt(v)}</span>
                    </div>
                  ))}
                  <div style={{borderTop:`1px solid ${C.border}`,paddingTop:"6px",marginTop:"4px",display:"flex",justifyContent:"space-between",fontSize:"12px",fontWeight:"900"}}>
                    <span style={{color:C.text}}>Gross Pay</span>
                    <span style={{color:C.green,fontFamily:"'IBM Plex Mono'"}}>{fmtC(selEmp.basicSalary+Object.values(selEmp.allowances).reduce((a,b)=>a+b,0))}</span>
                  </div>
                </div>
                {/* Leave balances */}
                {LEAVE_BALANCES[selEmp.id]&&(
                  <div style={{background:C.card,borderRadius:"8px",padding:"11px",marginBottom:"11px"}}>
                    <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".06em",marginBottom:"7px"}}>Leave Balances</div>
                    {[{l:"Annual",k:"annual",col:C.blue},{l:"Sick",k:"sick",col:C.red},{l:"Casual",k:"casual",col:C.teal}].map(lb=>{
                      const bal=LEAVE_BALANCES[selEmp.id];
                      const avail=bal[lb.k]-bal.used[lb.k];
                      return(
                        <div key={lb.k} style={{marginBottom:"5px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:"9px",marginBottom:"2px"}}>
                            <span style={{color:C.muted}}>{lb.l}</span>
                            <span style={{fontWeight:"700",color:lb.col}}>{avail}/{bal[lb.k]} days</span>
                          </div>
                          <div style={{height:"3px",background:C.border,borderRadius:"2px",overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${(avail/bal[lb.k])*100}%`,background:lb.col,borderRadius:"2px"}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                  <Btn full color={C.purple} small onClick={()=>setShowPayslip(selEmp)}>💳 View Payslip</Btn>
                  <Btn full outline color={C.teal} small onClick={()=>{setTab("attendance");setSel&&setSelEmp(selEmp);}}>📅 Attendance</Btn>
                  <Btn full outline color={C.yellow} small onClick={()=>notify("Leave request form opened")}>🌴 Apply Leave</Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          ATTENDANCE TAB
      ════════════════════════════════════════════════════════════ */}
      {tab==="attendance"&&(
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* Employee list sidebar */}
          <div style={{width:"210px",background:C.panel,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
            <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <div style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".06em",marginBottom:"5px"}}>Select Employee</div>
              <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"5px 8px",color:C.text,fontSize:"10px",outline:"none"}}/>
            </div>
            <div style={{flex:1,overflowY:"auto"}}>
              {empList.filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase())).map(emp=>{
                const att = ATTENDANCE_MAP[emp.id]||[];
                const pct = att.filter(d=>d.status==="present").length / Math.max(1, att.filter(d=>!["weekend","future"].includes(d.status)).length) * 100;
                return(
                  <div key={emp.id} onClick={()=>setSelEmp(emp)} style={{padding:"8px 12px",cursor:"pointer",background:selEmp?.id===emp.id?`${C.blue}15`:"transparent",borderLeft:`3px solid ${selEmp?.id===emp.id?C.blue:"transparent"}`,transition:"all .12s"}}
                    onMouseEnter={e=>{if(selEmp?.id!==emp.id)e.currentTarget.style.background=C.card}}
                    onMouseLeave={e=>{if(selEmp?.id!==emp.id)e.currentTarget.style.background="transparent"}}>
                    <div style={{fontSize:"11px",fontWeight:"700",color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{emp.name}</div>
                    <div style={{display:"flex",alignItems:"center",gap:"5px",marginTop:"2px"}}>
                      <div style={{flex:1,height:"3px",background:C.border,borderRadius:"2px",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:pct>90?C.green:pct>75?C.yellow:C.red,borderRadius:"2px"}}/>
                      </div>
                      <span style={{fontSize:"9px",color:pct>90?C.green:pct>75?C.yellow:C.red,fontWeight:"700"}}>{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attendance Grid */}
          <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
            {!selEmp&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:C.muted,gap:"10px"}}>
                <div style={{fontSize:"40px",opacity:.3}}>📅</div>
                <div style={{fontSize:"13px"}}>Select an employee to view attendance</div>
              </div>
            )}
            {selEmp&&(()=>{
              const att = ATTENDANCE_MAP[selEmp.id]||[];
              const pr  = calcPayroll(selEmp, att);
              const statusSummary = [
                {l:"Present",  v:att.filter(d=>d.status==="present").length,  col:C.green},
                {l:"Absent",   v:att.filter(d=>d.status==="absent").length,   col:C.red},
                {l:"Late",     v:att.filter(d=>d.status==="late").length,     col:C.yellow},
                {l:"Half Day", v:att.filter(d=>d.status==="halfday").length,  col:C.accent},
                {l:"OT Hours", v:`${pr.otHours}h`,                            col:C.teal},
                {l:"Work Days",v:att.filter(d=>!["weekend","future"].includes(d.status)).length, col:C.blue},
              ];
              return(
                <>
                  {/* Summary */}
                  <div style={{marginBottom:"16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                      <div>
                        <div style={{fontSize:"15px",fontWeight:"900",color:C.text}}>{selEmp.name}</div>
                        <div style={{fontSize:"10px",color:C.muted}}>{MONTH} Attendance · {selEmp.empNo}</div>
                      </div>
                      <Btn small outline color={C.blue} onClick={()=>notify("Attendance report exported")}>📤 Export</Btn>
                    </div>
                    <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                      {statusSummary.map(s=>(
                        <div key={s.l} style={{background:C.card,border:`1px solid ${s.col}22`,borderRadius:"8px",padding:"8px 12px",flex:1,minWidth:"80px",textAlign:"center"}}>
                          <div style={{fontSize:"18px",fontWeight:"900",color:s.col}}>{s.v}</div>
                          <div style={{fontSize:"8px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".06em"}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"14px",marginBottom:"14px"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:C.text,marginBottom:"10px"}}>{MONTH} Calendar</div>
                    {/* Day headers */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px",marginBottom:"3px"}}>
                      {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
                        <div key={d} style={{textAlign:"center",fontSize:"9px",fontWeight:"700",color:C.muted,padding:"3px"}}>{d}</div>
                      ))}
                    </div>
                    {/* Day cells — align first day */}
                    {(()=>{
                      const firstDow = new Date("2024-03-01").getDay();
                      const cells = [];
                      for(let i=0;i<firstDow;i++) cells.push(null);
                      att.forEach(d=>cells.push(d));
                      const rows=[];
                      for(let i=0;i<cells.length;i+=7) rows.push(cells.slice(i,i+7));
                      return rows.map((row,ri)=>(
                        <div key={ri} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px",marginBottom:"3px"}}>
                          {row.map((d,ci)=>{
                            if(!d) return <div key={ci}/>;
                            const sc = ATTCOL[d.status];
                            const isFut = d.status==="future";
                            const isWknd = d.status==="weekend";
                            return(
                              <div key={ci} style={{borderRadius:"6px",padding:"5px 3px",textAlign:"center",background:isFut||isWknd?C.muted2:`${sc}18`,border:`1px solid ${isFut||isWknd?C.border:`${sc}44`}`,cursor:isFut?"default":"pointer",minHeight:"38px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"2px"}}
                                title={`${d.date}: ${d.status}${d.in?` | In: ${d.in} Out: ${d.out}`:""}`}>
                                <div style={{fontSize:"10px",fontWeight:"700",color:isFut?C.muted2:isWknd?C.muted:sc}}>{d.day}</div>
                                {!isFut&&!isWknd&&(
                                  <div style={{fontSize:"8px",fontWeight:"600",color:sc,textTransform:"uppercase"}}>{d.status==="present"?"P":d.status==="absent"?"A":d.status==="late"?"L":d.status==="halfday"?"H":"—"}</div>
                                )}
                                {d.ot>0&&<div style={{fontSize:"7px",color:C.teal,fontWeight:"700"}}>+{d.ot}h</div>}
                              </div>
                            );
                          })}
                        </div>
                      ));
                    })()}
                    {/* Legend */}
                    <div style={{display:"flex",gap:"12px",flexWrap:"wrap",marginTop:"10px",paddingTop:"10px",borderTop:`1px solid ${C.border}`}}>
                      {[{l:"Present",col:C.green},{l:"Absent",col:C.red},{l:"Late",col:C.yellow},{l:"Half Day",col:C.accent},{l:"Weekend",col:C.muted},{l:"OT",col:C.teal}].map(lg=>(
                        <div key={lg.l} style={{display:"flex",alignItems:"center",gap:"5px"}}>
                          <div style={{width:"8px",height:"8px",borderRadius:"2px",background:lg.col}}/>
                          <span style={{fontSize:"9px",color:C.muted}}>{lg.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily Log Table */}
                  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,background:C.panel,fontSize:"12px",fontWeight:"700",color:C.text}}>Daily Log — Recorded Days</div>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr>
                        <TH c="Date"/><TH c="Day"/><TH c="Status"/><TH c="In Time"/><TH c="Out Time"/><TH c="Hours"/><TH c="OT"/><TH c="Note"/>
                      </tr></thead>
                      <tbody>
                        {att.filter(d=>!["weekend","future"].includes(d.status)).map((d,i)=>(
                          <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}
                            onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <TD sm>{d.date}</TD>
                            <TD sm muted>{new Date(d.date).toLocaleDateString("en-PK",{weekday:"short"})}</TD>
                            <td style={{padding:"8px 12px"}}>
                              <span style={{fontSize:"9px",fontWeight:"700",padding:"2px 7px",borderRadius:"12px",background:`${ATTCOL[d.status]}18`,color:ATTCOL[d.status]}}>{d.status}</span>
                            </td>
                            <TD sm mono col={d.status==="absent"?C.muted:C.text}>{d.in||"—"}</TD>
                            <TD sm mono col={d.status==="absent"?C.muted:C.text}>{d.out||"—"}</TD>
                            <TD sm mono col={C.muted}>{d.in&&d.out?`${((new Date(`2024-01-01T${d.out}`)-new Date(`2024-01-01T${d.in}`))/3600000).toFixed(1)}h`:"—"}</TD>
                            <TD sm mono col={d.ot>0?C.teal:C.muted2}>{d.ot>0?`+${d.ot}h`:"—"}</TD>
                            <TD sm muted>{d.status==="late"?"Late arrival":d.status==="halfday"?"Half day":d.status==="absent"?"Absent — No record":""}</TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          PAYROLL TAB
      ════════════════════════════════════════════════════════════ */}
      {tab==="payroll"&&(
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:"14px"}}>
          {/* Payroll run header */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:"15px",fontWeight:"900",color:C.text}}>Payroll Processing — {MONTH}</div>
              <div style={{fontSize:"10px",color:C.muted,marginTop:"2px"}}>
                {payrollDone
                  ? <span style={{color:C.green}}>✅ Payroll finalized · Disbursement ready</span>
                  : "Review and process payroll for all employees"}
              </div>
            </div>
            <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"9px",color:C.muted}}>Total Net Payroll</div>
                <div style={{fontSize:"18px",fontWeight:"900",color:C.accent,fontFamily:"'IBM Plex Mono'"}}>{fmtC(Math.round(totalPayroll))}</div>
              </div>
              {!payrollDone&&(
                <Btn color={C.purple} disabled={payrollRun} onClick={async()=>{
                  setPayrollRun(true);
                  await new Promise(r=>setTimeout(r,2000));
                  setPayrollRun(false); setPayrollDone(true);
                  notify("Payroll processed and finalized for "+MONTH);
                }}>
                  {payrollRun?<><span style={{display:"inline-block",animation:"spin .8s linear infinite",marginRight:"4px"}}>⟳</span>Processing...</>:"▶ Run Payroll"}
                </Btn>
              )}
              {payrollDone&&<Btn color={C.green} outline onClick={()=>notify("Bank file generated — ready for upload")}>🏦 Generate Bank File</Btn>}
            </div>
          </div>

          {/* Payroll table */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>
                <TH c="Employee"/><TH c="Department"/>
                <TH c="Basic" right col={C.text}/>
                <TH c="Allowances" right col={C.blue}/>
                <TH c="Gross Pay" right col={C.green}/>
                <TH c="Absent Ded." right col={C.red}/>
                <TH c="Other Ded." right col={C.yellow}/>
                <TH c="OT Pay" right col={C.teal}/>
                <TH c="Net Pay" right col={C.accent}/>
                <TH c="Status"/><TH c="Payslip"/>
              </tr></thead>
              <tbody>
                {empList.map((emp,i)=>{
                  const att = ATTENDANCE_MAP[emp.id]||[];
                  const pr  = calcPayroll(emp, att);
                  const totalAllowances = Object.values(emp.allowances).reduce((a,b)=>a+b,0);
                  const otherDed = Object.values(emp.deductions).reduce((a,b)=>a+b,0);
                  return(
                    <tr key={emp.id} style={{borderBottom:`1px solid ${C.border}`,animation:`rI .1s ease ${i*.025}s both`}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.panel}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{fontSize:"12px",fontWeight:"700",color:C.text}}>{emp.name}</div>
                        <div style={{fontSize:"9px",color:C.muted,fontFamily:"'IBM Plex Mono'"}}>{emp.empNo}</div>
                      </td>
                      <td style={{padding:"10px 12px"}}><Tag l={emp.dept} col={DEPTCOL[emp.dept]||C.blue} sm/></td>
                      <TD right mono>{fmt(emp.basicSalary)}</TD>
                      <TD right mono col={C.blue}>{fmt(totalAllowances)}</TD>
                      <TD right mono bold col={C.green}>{fmt(pr.grossPay)}</TD>
                      <TD right mono col={pr.absentDed>0?C.red:C.muted2}>{pr.absentDed>0?fmt(Math.round(pr.absentDed)):"—"}</TD>
                      <TD right mono col={otherDed>0?C.yellow:C.muted2}>{otherDed>0?fmt(otherDed):"—"}</TD>
                      <TD right mono col={pr.otPay>0?C.teal:C.muted2}>{pr.otPay>0?fmt(Math.round(pr.otPay)):"—"}</TD>
                      <td style={{padding:"10px 12px",textAlign:"right"}}>
                        <div style={{fontSize:"13px",fontWeight:"900",color:C.accent,fontFamily:"'IBM Plex Mono'"}}>{fmt(Math.round(pr.netPay))}</div>
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <Tag l={payrollDone?"Paid":"Pending"} col={payrollDone?C.green:C.yellow} sm/>
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <Btn small outline color={C.purple} onClick={()=>setShowPayslip(emp)}>💳 Slip</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{borderTop:`2px solid ${C.border2}`,background:`${C.accent}08`}}>
                  <td colSpan={2} style={{padding:"10px 12px",fontWeight:"900",color:C.text,fontSize:"12px"}}>TOTAL ({empList.length} Employees)</td>
                  <TD right mono bold col={C.text}>{fmt(empList.reduce((s,e)=>s+e.basicSalary,0))}</TD>
                  <TD right mono bold col={C.blue}>{fmt(empList.reduce((s,e)=>s+Object.values(e.allowances).reduce((a,b)=>a+b,0),0))}</TD>
                  <TD right mono bold col={C.green}>{fmt(empList.reduce((s,e)=>{const pr=calcPayroll(e,ATTENDANCE_MAP[e.id]||[]);return s+pr.grossPay;},0))}</TD>
                  <TD right mono bold col={C.red}>{fmt(empList.reduce((s,e)=>{const pr=calcPayroll(e,ATTENDANCE_MAP[e.id]||[]);return s+pr.absentDed;},0))}</TD>
                  <TD right mono bold col={C.yellow}>{fmt(empList.reduce((s,e)=>s+Object.values(e.deductions).reduce((a,b)=>a+b,0),0))}</TD>
                  <TD right mono bold col={C.teal}>{fmt(empList.reduce((s,e)=>{const pr=calcPayroll(e,ATTENDANCE_MAP[e.id]||[]);return s+pr.otPay;},0))}</TD>
                  <TD right mono bold col={C.accent}>{fmt(Math.round(totalPayroll))}</TD>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          LEAVE MANAGEMENT TAB
      ════════════════════════════════════════════════════════════ */}
      {tab==="leaves"&&(
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          <div style={{flex:1,overflowY:"auto",padding:"14px 20px",display:"flex",flexDirection:"column",gap:"10px"}}>
            {/* Filter row */}
            <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
              {["all","pending","approved","rejected"].map(f=>(
                <button key={f} onClick={()=>setDeptF(f)} style={{padding:"3px 10px",borderRadius:"20px",border:`1px solid ${deptF===f?(f==="pending"?C.yellow:f==="approved"?C.green:f==="rejected"?C.red:C.accent):C.border}`,background:deptF===f?`${f==="pending"?C.yellow:f==="approved"?C.green:f==="rejected"?C.red:C.accent}15`:"transparent",color:deptF===f?(f==="pending"?C.yellow:f==="approved"?C.green:f==="rejected"?C.red:C.accent):C.muted,cursor:"pointer",fontSize:"9px",fontWeight:"700"}}>
                  {f.charAt(0).toUpperCase()+f.slice(1)} ({f==="all"?leaves.length:leaves.filter(l=>l.status===f).length})
                </button>
              ))}
            </div>

            {/* Leave cards */}
            {leaves.filter(l=>deptF==="all"||l.status===deptF).map((leave,i)=>{
              const emp = empList.find(e=>e.id===leave.empId);
              const isSel = selLeave?.id===leave.id;
              const stCol = LEAVECOL[leave.status];
              const leaveTypeCol = {Annual:C.blue,Sick:C.red,Casual:C.teal,Maternity:C.pink,Emergency:C.accent}[leave.type]||C.muted;
              return(
                <div key={leave.id} onClick={()=>setSelLeave(isSel?null:leave)}
                  style={{background:C.card,border:`1px solid ${isSel?stCol:C.border}`,borderRadius:"10px",overflow:"hidden",cursor:"pointer",animation:`rI .12s ease ${i*.04}s both`,borderLeft:`4px solid ${stCol}`}}>
                  <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:"12px"}}>
                    {emp&&(
                      <div style={{width:"36px",height:"36px",borderRadius:"50%",background:`linear-gradient(135deg,${DEPTCOL[emp.dept]||C.blue},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"900",fontSize:"10px",flexShrink:0}}>
                        {emp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                      </div>
                    )}
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"3px"}}>
                        <span style={{fontSize:"13px",fontWeight:"800",color:C.text}}>{leave.empName}</span>
                        <Tag l={leave.type} col={leaveTypeCol} sm/>
                        <Tag l={leave.status.toUpperCase()} col={stCol} sm/>
                      </div>
                      <div style={{fontSize:"10px",color:C.muted}}>
                        {leave.from} → {leave.to} · <strong style={{color:C.text}}>{leave.days} day{leave.days>1?"s":""}</strong> · Applied: {leave.appliedOn}
                      </div>
                    </div>
                    {leave.status==="pending"&&(
                      <div style={{display:"flex",gap:"5px",flexShrink:0}} onClick={e=>e.stopPropagation()}>
                        <Btn small color={C.green} onClick={()=>{setLeaves(p=>p.map(l=>l.id===leave.id?{...l,status:"approved",approvedBy:"Ahmed Raza"}:l));notify(`${leave.empName}'s leave approved`);}}>✓ Approve</Btn>
                        <Btn small color={C.red}   onClick={()=>{setLeaves(p=>p.map(l=>l.id===leave.id?{...l,status:"rejected",approvedBy:"Ahmed Raza"}:l));notify(`Leave rejected`,"error");}}>✕ Reject</Btn>
                      </div>
                    )}
                    {leave.status!=="pending"&&(
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:"9px",color:C.muted}}>{leave.status==="approved"?"Approved":"Rejected"} by</div>
                        <div style={{fontSize:"11px",fontWeight:"700",color:stCol}}>{leave.approvedBy||"—"}</div>
                      </div>
                    )}
                  </div>
                  {isSel&&(
                    <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,background:C.panel,animation:"fI .2s ease"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
                        {[["Leave ID",leave.id],["Employee",leave.empName],["Department",emp?.dept||"—"],["Branch",emp?.branch||"—"],["From",leave.from],["To",leave.to],["Total Days",leave.days],["Applied On",leave.appliedOn]].map(([l,v])=>(
                          <div key={l} style={{background:C.card,borderRadius:"6px",padding:"7px 9px"}}>
                            <div style={{fontSize:"8px",color:C.muted,marginBottom:"2px",textTransform:"uppercase",letterSpacing:".06em"}}>{l}</div>
                            <div style={{fontSize:"11px",fontWeight:"700",color:C.text}}>{v}</div>
                          </div>
                        ))}
                        <div style={{gridColumn:"1/-1",background:C.card,borderRadius:"6px",padding:"7px 9px"}}>
                          <div style={{fontSize:"8px",color:C.muted,marginBottom:"2px",textTransform:"uppercase",letterSpacing:".06em"}}>Reason</div>
                          <div style={{fontSize:"11px",color:C.text}}>{leave.reason}</div>
                        </div>
                      </div>
                      {leave.status==="pending"&&(
                        <div style={{display:"flex",gap:"6px"}}>
                          <Btn color={C.green} onClick={()=>{setLeaves(p=>p.map(l=>l.id===leave.id?{...l,status:"approved",approvedBy:"Ahmed Raza"}:l));setSelLeave(null);notify(`${leave.empName}'s leave approved`);}}>✓ Approve Leave</Btn>
                          <Btn color={C.red} outline onClick={()=>{setLeaves(p=>p.map(l=>l.id===leave.id?{...l,status:"rejected",approvedBy:"Ahmed Raza"}:l));setSelLeave(null);notify(`Leave rejected`,"error");}}>✕ Reject Leave</Btn>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Leave balances sidebar */}
          <div style={{width:"260px",background:C.panel,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
            <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,fontSize:"12px",fontWeight:"800",color:C.text,flexShrink:0}}>Team Leave Balances</div>
            <div style={{flex:1,overflowY:"auto",padding:"10px"}}>
              {empList.map(emp=>{
                const bal=LEAVE_BALANCES[emp.id];
                if(!bal) return null;
                const annualLeft = bal.annual-bal.used.annual;
                return(
                  <div key={emp.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"10px 12px",marginBottom:"7px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"7px"}}>
                      <div style={{width:"24px",height:"24px",borderRadius:"50%",background:`linear-gradient(135deg,${DEPTCOL[emp.dept]||C.blue},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"900",fontSize:"8px",flexShrink:0}}>
                        {emp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                      </div>
                      <div style={{flex:1,overflow:"hidden"}}>
                        <div style={{fontSize:"10px",fontWeight:"700",color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{emp.name}</div>
                        <div style={{fontSize:"8px",color:C.muted}}>{emp.designation}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:"5px"}}>
                      {[{l:"A",k:"annual",col:C.blue},{l:"S",k:"sick",col:C.red},{l:"C",k:"casual",col:C.teal}].map(lb=>{
                        const avail=bal[lb.k]-bal.used[lb.k];
                        return(
                          <div key={lb.k} style={{flex:1,textAlign:"center",background:C.panel,borderRadius:"5px",padding:"4px 2px",border:`1px solid ${lb.col}22`}}>
                            <div style={{fontSize:"11px",fontWeight:"900",color:lb.col}}>{avail}</div>
                            <div style={{fontSize:"7px",color:C.muted}}>{lb.l}/{bal[lb.k]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          PAYSLIP MODAL
      ════════════════════════════════════════════════════════════ */}
      {showPayslip&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:300,overflowY:"auto",padding:"30px 20px"}}>
          <div style={{width:"620px",flexShrink:0,margin:"0 auto 40px",animation:"sI .2s ease"}}>
            {(()=>{
              const emp=showPayslip;
              const att=ATTENDANCE_MAP[emp.id]||[];
              const pr=calcPayroll(emp,att);
              const gross=emp.basicSalary+Object.values(emp.allowances).reduce((a,b)=>a+b,0);
              const totalDedAll=Object.values(emp.deductions).reduce((a,b)=>a+b,0)+pr.absentDed+pr.halfDayDed;
              return(
                <div style={{background:"#fff",borderRadius:"4px",overflow:"hidden",fontFamily:"'IBM Plex Sans',sans-serif",color:"#1a202c",boxShadow:"0 24px 64px rgba(0,0,0,.7)"}}>
                  {/* Header */}
                  <div style={{background:"linear-gradient(135deg,#f97316,#ea580c)",padding:"22px 28px",color:"#fff"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:"11px",fontWeight:"700",opacity:.8,letterSpacing:".1em",textTransform:"uppercase",marginBottom:"3px"}}>Al-Baraka Textiles Pvt Ltd</div>
                        <div style={{fontSize:"22px",fontWeight:"900",letterSpacing:"-0.02em"}}>Salary Slip</div>
                        <div style={{fontSize:"10px",opacity:.75,marginTop:"3px"}}>{MONTH} · NTN: 1234567-8</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:"28px",fontWeight:"900"}}>{fmtC(Math.round(pr.netPay))}</div>
                        <div style={{fontSize:"10px",opacity:.8}}>Net Pay</div>
                        <button onClick={()=>setShowPayslip(null)} style={{marginTop:"10px",padding:"4px 12px",borderRadius:"20px",border:"2px solid rgba(255,255,255,.6)",background:"transparent",color:"#fff",cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>✕ Close</button>
                      </div>
                    </div>
                  </div>

                  <div style={{padding:"22px 28px"}}>
                    {/* Employee info */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"18px",background:"#f9fafb",borderRadius:"8px",padding:"14px"}}>
                      {[
                        ["Employee Name", emp.name],["Employee No.", emp.empNo],
                        ["Designation",  emp.designation],["Department", emp.dept],
                        ["Branch",       emp.branch],["Join Date", emp.join],
                        ["Bank",         emp.bank],["IBAN", emp.iban],
                        ["CNIC",         emp.cnic],["Pay Period", MONTH],
                      ].map(([l,v])=>(
                        <div key={l}>
                          <div style={{fontSize:"9px",color:"#9ca3af",textTransform:"uppercase",letterSpacing:".06em",marginBottom:"1px"}}>{l}</div>
                          <div style={{fontSize:"11px",fontWeight:"700",color:"#374151",wordBreak:"break-all"}}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Attendance summary */}
                    <div style={{display:"flex",gap:"6px",marginBottom:"18px"}}>
                      {[
                        {l:"Work Days",v:pr.workDays,    col:"#374151"},
                        {l:"Present",  v:pr.present,    col:"#10b981"},
                        {l:"Absent",   v:pr.absent,     col:"#ef4444"},
                        {l:"Late",     v:pr.late,       col:"#f59e0b"},
                        {l:"Half Day", v:pr.halfDays,   col:"#f97316"},
                        {l:"OT Hours", v:`${pr.otHours}h`,col:"#06b6d4"},
                      ].map(s=>(
                        <div key={s.l} style={{flex:1,textAlign:"center",background:"#f3f4f6",borderRadius:"6px",padding:"7px 4px"}}>
                          <div style={{fontSize:"16px",fontWeight:"900",color:s.col}}>{s.v}</div>
                          <div style={{fontSize:"8px",color:"#9ca3af",textTransform:"uppercase",letterSpacing:".05em"}}>{s.l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Earnings & deductions */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"16px"}}>
                      {/* Earnings */}
                      <div>
                        <div style={{fontSize:"10px",fontWeight:"700",color:"#10b981",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"7px",paddingBottom:"5px",borderBottom:"2px solid #10b981"}}>Earnings</div>
                        {[
                          ["Basic Salary",     emp.basicSalary],
                          ["House Allowance",  emp.allowances.house],
                          ["Conveyance Allow.",emp.allowances.conveyance],
                          ["Medical Allow.",   emp.allowances.medical],
                          ["Utility Allow.",   emp.allowances.utility],
                          ...(pr.otPay>0?[["Overtime Pay ("+pr.otHours+"h)", Math.round(pr.otPay)]]:[] ),
                        ].map(([l,v])=>(
                          <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:"10px",marginBottom:"4px",padding:"3px 0",borderBottom:"1px solid #f3f4f6"}}>
                            <span style={{color:"#6b7280"}}>{l}</span>
                            <span style={{fontFamily:"'IBM Plex Mono'",fontWeight:"700",color:"#374151"}}>{fmt(v)}</span>
                          </div>
                        ))}
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",fontWeight:"900",marginTop:"6px",paddingTop:"6px",borderTop:"2px solid #10b981"}}>
                          <span style={{color:"#374151"}}>Gross Earnings</span>
                          <span style={{color:"#10b981",fontFamily:"'IBM Plex Mono'"}}>{fmt(gross+(pr.otPay>0?Math.round(pr.otPay):0))}</span>
                        </div>
                      </div>
                      {/* Deductions */}
                      <div>
                        <div style={{fontSize:"10px",fontWeight:"700",color:"#ef4444",textTransform:"uppercase",letterSpacing:".07em",marginBottom:"7px",paddingBottom:"5px",borderBottom:"2px solid #ef4444"}}>Deductions</div>
                        {[
                          ["EOBI Contribution",   emp.deductions.eobi],
                          ["Loan Installment",    emp.deductions.loan],
                          ["Advance Recovery",    emp.deductions.advance],
                          ...(pr.absentDed>0?[["Absent ("+pr.absent+" days)", Math.round(pr.absentDed)]]:[] ),
                          ...(pr.halfDayDed>0?[["Half Days ("+pr.halfDays+")", Math.round(pr.halfDayDed)]]:[] ),
                        ].filter(([,v])=>v>0).map(([l,v])=>(
                          <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:"10px",marginBottom:"4px",padding:"3px 0",borderBottom:"1px solid #f3f4f6"}}>
                            <span style={{color:"#6b7280"}}>{l}</span>
                            <span style={{fontFamily:"'IBM Plex Mono'",fontWeight:"700",color:"#ef4444"}}>{fmt(v)}</span>
                          </div>
                        ))}
                        {[...Object.values(emp.deductions),pr.absentDed,pr.halfDayDed].every(v=>!v)&&(
                          <div style={{fontSize:"10px",color:"#9ca3af",textAlign:"center",padding:"12px"}}>No deductions</div>
                        )}
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",fontWeight:"900",marginTop:"6px",paddingTop:"6px",borderTop:"2px solid #ef4444"}}>
                          <span style={{color:"#374151"}}>Total Deductions</span>
                          <span style={{color:"#ef4444",fontFamily:"'IBM Plex Mono'"}}>{fmt(Math.round(totalDedAll))}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Pay box */}
                    <div style={{background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:"2px solid #10b981",borderRadius:"10px",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                      <div>
                        <div style={{fontSize:"11px",color:"#065f46",fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em"}}>Net Salary Payable</div>
                        <div style={{fontSize:"10px",color:"#6b7280",marginTop:"2px"}}>Credited to {emp.bank} — {emp.iban.slice(-8)}</div>
                      </div>
                      <div style={{fontSize:"28px",fontWeight:"900",color:"#065f46",fontFamily:"'IBM Plex Mono'"}}>{fmtC(Math.round(pr.netPay))}</div>
                    </div>

                    {/* Footer */}
                    <div style={{borderTop:"1px solid #e5e7eb",paddingTop:"12px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                      <div style={{fontSize:"8px",color:"#9ca3af",lineHeight:1.8}}>
                        <div>This is a computer-generated payslip. No physical signature required.</div>
                        <div>For queries: hr@albaraka.pk · 042-111-234-567</div>
                        <div>Generated: {TODAY} · Infosys Pak ERP v1.0</div>
                      </div>
                      <div style={{display:"flex",gap:"7px"}}>
                        <button onClick={()=>notify("Payslip printed")} style={{padding:"6px 14px",borderRadius:"7px",border:"1px solid #d1d5db",background:"#fff",color:"#374151",cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>🖨 Print</button>
                        <button onClick={()=>notify("Payslip emailed to "+emp.email)} style={{padding:"6px 14px",borderRadius:"7px",border:"none",background:"#f97316",color:"#fff",cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>📧 Email</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      {showNewEmp&&<AddEmployeeModal depts={DEPARTMENTS} desig={DESIGNATIONS} onClose={()=>setShowNewEmp(false)} onSave={e=>{setEmpList(p=>[e,...p]);setShowNewEmp(false);notify(`${e.name} added to HR`);}}/>}

      {/* APPLY LEAVE MODAL */}
      {showLeave&&<ApplyLeaveModal employees={empList} onClose={()=>setShowLeave(false)} onSave={l=>{setLeaves(p=>[l,...p]);setShowLeave(false);notify("Leave request submitted");}}/>}

      {/* NOTIFICATION */}
      {notif&&<div style={{position:"fixed",top:"14px",left:"50%",transform:"translateX(-50%)",zIndex:600,background:notif.type==="error"?C.red:C.green,color:"#fff",padding:"10px 18px",borderRadius:"8px",fontSize:"12px",fontWeight:"700",boxShadow:"0 8px 28px rgba(0,0,0,.55)",animation:"sI .2s ease",whiteSpace:"nowrap"}}>{notif.type==="error"?"✕":"✓"} {notif.msg}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADD EMPLOYEE MODAL
// ══════════════════════════════════════════════════════════════════
function AddEmployeeModal({depts,desig,onClose,onSave}){
  const [f,setF]=useState({name:"",fatherName:"",cnic:"",phone:"",email:"",dept:"Accounts",designation:"Accounts Officer",branch:"Lahore Main",city:"Lahore",join:TODAY,type:"Permanent",gender:"Male",dob:"",qualification:"",basicSalary:40000,bank:"HBL",iban:"",notes:""});
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const s={width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"8px 10px",color:C.text,fontSize:"12px",outline:"none",fontFamily:"inherit"};
  const L=({l,children,span})=><div style={{gridColumn:span?"1/-1":"auto"}}><label style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:"4px"}}>{l}</label>{children}</div>;
  const handleSave=()=>{
    const id=`e${Date.now()}`,empNo=`EMP-${String(Math.floor(Math.random()*900)+100)}`;
    onSave({...f,id,empNo,status:"active",probation:f.type==="Probation",allowances:{house:Math.round(f.basicSalary*.4),conveyance:3000,medical:2000,utility:1500},deductions:{eobi:1900,pessi:0,loan:0,advance:0}});
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:400,overflowY:"auto",padding:"30px 20px"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",width:"600px",overflow:"hidden",animation:"sI .2s ease",margin:"0 auto 40px"}}>
        <div style={{padding:"15px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.panel}}>
          <div><div style={{fontWeight:"900",fontSize:"14px",color:C.text}}>Add New Employee</div><div style={{fontSize:"9px",color:C.muted}}>Register a new employee in HR system</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px"}}>✕</button>
        </div>
        <div style={{padding:"20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"11px",maxHeight:"520px",overflowY:"auto"}}>
          <L l="Full Name" span><input value={f.name} onChange={e=>upd("name",e.target.value)} placeholder="Employee full name" style={s}/></L>
          <L l="Father Name"><input value={f.fatherName} onChange={e=>upd("fatherName",e.target.value)} placeholder="Father's name" style={s}/></L>
          <L l="CNIC"><input value={f.cnic} onChange={e=>upd("cnic",e.target.value)} placeholder="XXXXX-XXXXXXX-X" style={s}/></L>
          <L l="Phone"><input value={f.phone} onChange={e=>upd("phone",e.target.value)} placeholder="0300-XXXXXXX" style={s}/></L>
          <L l="Email" span><input value={f.email} onChange={e=>upd("email",e.target.value)} placeholder="employee@albaraka.pk" style={s}/></L>
          <L l="Department"><select value={f.dept} onChange={e=>{upd("dept",e.target.value);upd("designation",(desig[e.target.value]||[])[0]||"");}} style={s}>{depts.map(d=><option key={d}>{d}</option>)}</select></L>
          <L l="Designation"><select value={f.designation} onChange={e=>upd("designation",e.target.value)} style={s}>{(desig[f.dept]||[]).map(d=><option key={d}>{d}</option>)}</select></L>
          <L l="Branch"><select value={f.branch} onChange={e=>upd("branch",e.target.value)} style={s}>{["Lahore Main","Karachi","Islamabad","Faisalabad"].map(b=><option key={b}>{b}</option>)}</select></L>
          <L l="City"><input value={f.city} onChange={e=>upd("city",e.target.value)} placeholder="e.g. Lahore" style={s}/></L>
          <L l="Employment Type"><select value={f.type} onChange={e=>upd("type",e.target.value)} style={s}>{["Permanent","Contractual","Probation","Part-time"].map(t=><option key={t}>{t}</option>)}</select></L>
          <L l="Join Date"><input type="date" value={f.join} onChange={e=>upd("join",e.target.value)} style={s}/></L>
          <L l="Date of Birth"><input type="date" value={f.dob} onChange={e=>upd("dob",e.target.value)} style={s}/></L>
          <L l="Gender"><select value={f.gender} onChange={e=>upd("gender",e.target.value)} style={s}>{["Male","Female","Other"].map(g=><option key={g}>{g}</option>)}</select></L>
          <L l="Qualification"><input value={f.qualification} onChange={e=>upd("qualification",e.target.value)} placeholder="e.g. MBA, B.Com" style={s}/></L>
          <L l="Basic Salary (PKR)"><input type="number" value={f.basicSalary} onChange={e=>upd("basicSalary",+e.target.value)} style={s}/></L>
          <L l="Bank Name"><select value={f.bank} onChange={e=>upd("bank",e.target.value)} style={s}>{["HBL","MCB","UBL","ABL","Meezan","Bank Al-Falah","Bank Al-Habib"].map(b=><option key={b}>{b}</option>)}</select></L>
          <L l="IBAN" span><input value={f.iban} onChange={e=>upd("iban",e.target.value)} placeholder="PKXXXXXXXXXXXXXXXXXXXXXXXX" style={{...s,fontFamily:"'IBM Plex Mono'"}}/></L>
          <L l="Notes" span><textarea value={f.notes} onChange={e=>upd("notes",e.target.value)} rows={2} placeholder="HR notes..." style={{...s,resize:"vertical"}}/></L>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:"8px"}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:"8px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontWeight:"600",fontSize:"12px"}}>Cancel</button>
          <Btn color={C.green} disabled={!f.name||!f.cnic||!f.phone||!f.city} onClick={handleSave}>✓ Add Employee</Btn>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// APPLY LEAVE MODAL
// ══════════════════════════════════════════════════════════════════
function ApplyLeaveModal({employees,onClose,onSave}){
  const [empId,  setEmpId]   = useState(employees[0]?.id||"");
  const [type,   setType]    = useState("Annual");
  const [from,   setFrom]    = useState(TODAY);
  const [to,     setTo]      = useState(TODAY);
  const [reason, setReason]  = useState("");
  const days = Math.max(1, Math.round((new Date(to)-new Date(from))/(1000*60*60*24))+1);
  const emp  = employees.find(e=>e.id===empId);
  const s={width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"8px 10px",color:C.text,fontSize:"12px",outline:"none",fontFamily:"inherit"};
  const L=({l,children})=><div><label style={{fontSize:"9px",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:"4px"}}>{l}</label>{children}</div>;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",width:"460px",overflow:"hidden",animation:"sI .2s ease"}}>
        <div style={{padding:"15px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.panel}}>
          <div><div style={{fontWeight:"900",fontSize:"14px",color:C.text}}>Apply Leave Request</div><div style={{fontSize:"9px",color:C.muted}}>Submit a leave application</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px"}}>✕</button>
        </div>
        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:"12px"}}>
          <L l="Employee"><select value={empId} onChange={e=>setEmpId(e.target.value)} style={s}>{employees.map(e=><option key={e.id} value={e.id}>{e.name} — {e.designation}</option>)}</select></L>
          <L l="Leave Type"><select value={type} onChange={e=>setType(e.target.value)} style={s}>{["Annual","Sick","Casual","Maternity","Emergency","Unpaid"].map(t=><option key={t}>{t}</option>)}</select></L>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
            <L l="From Date"><input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={s}/></L>
            <L l="To Date"><input type="date" value={to} onChange={e=>setTo(e.target.value>=from?e.target.value:from)} style={s}/></L>
          </div>
          <div style={{padding:"10px 14px",background:`${C.blue}0a`,border:`1px solid ${C.blue}22`,borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:"11px",color:C.muted}}>Duration</span>
            <span style={{fontSize:"16px",fontWeight:"900",color:C.blue}}>{days} day{days>1?"s":""}</span>
          </div>
          <L l="Reason / Notes"><textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="Reason for leave..." style={{...s,resize:"vertical"}}/></L>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:"8px"}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:"8px",border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer",fontWeight:"600",fontSize:"12px"}}>Cancel</button>
          <Btn color={C.teal} disabled={!reason||!empId} onClick={()=>onSave({id:`l${Date.now()}`,empId,empName:emp?.name||"",type,from,to,days,reason,status:"pending",appliedOn:TODAY,approvedBy:null})}>📤 Submit Leave Request</Btn>
        </div>
      </div>
    </div>
  );
}

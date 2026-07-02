import { useState, useRef, useCallback, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";

const C = {
  bg:"#0F0F1A", card:"#161320", border:"#2b2440",
  green:"#10b981", red:"#ef4444", blue:"#3b82f6",
  yellow:"#f59e0b", purple:"#8b5cf6", cyan:"#06b6d4", orange:"#f97316",
  gold:"#C8A84B", goldSoft:"#E8D4A0",
  text:"#F0E6D2", muted:"#8a8095", sub:"#c9bfa8",
};

const CATS = {
  "Moradia":["Aluguel/Financiamento","Condominio","Agua","Energia Eletrica","Gas","Internet","Telefone","IPTU","Manutencao","Outros"],
  "Carro":["Gasolina","Seguro","IPVA","Manutencao","Estacionamento","Pedagio","Multa","Outros"],
  "Saude":["Plano de Saude","Consulta Medica","Exame","Farmacia","Dentista","Academia","Jiu-jitsu","Esporte","Outros"],
  "Alimentacao":["Supermercado","Acougue","Padaria","Restaurante","Delivery","Lanche","Outros"],
  "Filho":["Escola","Esporte","Alimentacao","Vestuario","Saude","Lazer","Material Escolar","Outros"],
  "Educacao":["Escola/Faculdade","Curso","Material Escolar","Livros","Outros"],
  "Lazer":["Cinema/Teatro","Viagem","Streaming","Eventos","Hobbies","Outros"],
  "Vestuario":["Roupas","Calcados","Acessorios","Outros"],
  "Pets":["Racao","Veterinario","Banho/Tosa","Outros"],
  "Impostos/Taxas":["INSS","IR","IOF","Taxas Bancarias","Seguro de Vida","Outros"],
  "Cartao Credito":["Cartao Banestes Frank","Cartao Banestes Vania","Cartao XP Vania","Outros"],
  "Outros":["Presente","Doacao","Emprestimo","Outros"],
};

const CAT_COLS = {
  "Moradia":"#3b82f6","Carro":"#8b5cf6","Saude":"#ef4444","Alimentacao":"#f59e0b",
  "Filho":"#a78bfa","Educacao":"#06b6d4","Lazer":"#ec4899","Vestuario":"#f97316",
  "Pets":"#10b981","Impostos/Taxas":"#64748b","Cartao Credito":"#6366f1","Outros":"#94a3b8",
};

const CARTOES = [
  {id:"frank_ban", nome:"Banestes Frank", titular:"Frank", cor:"#b45309"},
  {id:"vania_ban", nome:"Banestes Vania", titular:"Vania", cor:"#78350f"},
  {id:"vania_xp",  nome:"XP Vania",       titular:"Vania", cor:"#1e3a5f"},
];

const CONTAS = [
  {id:"ban_frank", nome:"Banestes Frank", banco:"Banestes", titular:"Frank", saldo:0},
  {id:"ban_vania", nome:"Banestes Vania", banco:"Banestes", titular:"Vania", saldo:0},
  {id:"xp_vania",  nome:"XP Vania",       banco:"XP",       titular:"Vania", saldo:0},
];

const FORMAS = ["Pix","Debito","Dinheiro","Cartao de Credito"];
const PAY_ICON = {"Pix":"PIX","Debito":"DEB","Dinheiro":"DIN","Cartao de Credito":"CRT"};

const ALL_MONTHS = [
  ["2026-01","Jan/26"],["2026-02","Fev/26"],["2026-03","Mar/26"],["2026-04","Abr/26"],
  ["2026-05","Mai/26"],["2026-06","Jun/26"],["2026-07","Jul/26"],["2026-08","Ago/26"],
  ["2026-09","Set/26"],["2026-10","Out/26"],["2026-11","Nov/26"],["2026-12","Dez/26"],
];

const fmt   = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmtS  = v => v >= 1000 ? "R$"+(v/1000).toFixed(1)+"k" : "R$"+Math.round(v);
const today = () => new Date().toISOString().slice(0,10);

const EMPTY_FORM = {
  type:"despesa", desc:"", value:"", category:"Alimentacao", subcategory:"Supermercado",
  payMethod:"Pix", banco:"ban_frank", card:"", fixed:false, installments:1,
  date:today(), prevista:false, investBanco:"Banestes", prazo:"Livre", investTipo:"Poupanca",
};

const splitInstallments = (base, n) => {
  if (n <= 1) return [base];
  const parcela = parseFloat((base.value / n).toFixed(2));
  return Array.from({length: n}, (_, i) => {
    const d = new Date(base.date + "T12:00");
    d.setMonth(d.getMonth() + i);
    const m = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");
    return {
      ...base,
      id: base.id + i * 100000,
      value: parcela,
      month: m,
      date: m + "-" + base.date.slice(8),
      desc: base.desc + " (" + (i+1) + "/" + n + ")",
      installments: 1,
    };
  });
};

async function askClaude(messages, sys) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: sys,
      messages,
    }),
  });
  const d = await r.json();
  return d.content?.map(b => b.text || "").join("") || "";
}

// -- UI primitives --
const Card = ({children, style={}}) => (
  <div style={{
    background:"linear-gradient(165deg, #1a1628, #141020)",
    border:"1px solid rgba(200,168,75,0.09)",
    borderRadius:22, padding:20,
    boxShadow:"0 14px 34px -20px rgba(0,0,0,0.65)",
    ...style,
  }}>
    {children}
  </div>
);

const Pill = ({active, onClick, children}) => (
  <button onClick={onClick} style={{
    background: active ? "rgba(200,168,75,0.12)" : "transparent",
    color: active ? C.gold : C.muted,
    border: "none",
    borderBottom: "2px solid " + (active ? C.gold : "transparent"),
    borderRadius: "10px 10px 0 0",
    padding:"7px 13px", fontSize:12.5,
    fontWeight: 700, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
    transition:"all 0.15s ease", letterSpacing:0.1,
  }}>
    {children}
  </button>
);

const Bdg = ({color, children}) => (
  <span style={{
    background: color+"16", color, borderRadius: 7,
    padding:"2px 7px", fontSize:9.5, fontWeight:700,
    letterSpacing:0.3, textTransform:"uppercase",
  }}>
    {children}
  </span>
);

const Lbl = ({children}) => (
  <div style={{fontSize:10, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, marginBottom:4}}>
    {children}
  </div>
);

// -- TxForm outside App to prevent keyboard flicker --
function TxForm({f, setF, onSave, onCancel, title}) {
  const inp = {
    background:"#100d1a", border:"1px solid rgba(200,168,75,0.14)", borderRadius:12,
    padding:"10px 13px", color:"#F0E6D2", fontSize:13, width:"100%",
    outline:"none", boxSizing:"border-box",
  };
  const sel = {...inp, cursor:"pointer"};
  const btn = (bg, col="#fff") => ({
    background:bg, color:col, border:"none", borderRadius:13,
    padding:"10px 0", fontWeight:700, fontSize:12.5, letterSpacing:0.15, cursor:"pointer", flex:1,
  });

  return (
    <div style={{
      background:"linear-gradient(165deg, #1c1830, #14111d)", border:"1px solid rgba(200,168,75,0.12)", borderRadius:24,
      padding:22, width:"100%", maxWidth:460, margin:"auto",
      maxHeight:"92vh", overflowY:"auto",
      boxShadow:"0 24px 60px -20px rgba(0,0,0,0.7)",
    }}>
      <div style={{fontWeight:800, fontSize:17, marginBottom:16, color:"#F0E6D2", fontFamily:"'Fraunces', serif"}}>{title}</div>

      <div style={{display:"flex", gap:5, marginBottom:12}}>
        {[["despesa","Despesa","#ef4444"],["receita","Receita","#10b981"],["investimento","Invest.","#3b82f6"]].map(([t,l,col]) => (
          <button key={t} onClick={() => setF(x => ({...x, type:t}))}
            style={{...btn(f.type===t ? col : "#100d1a", f.type===t ? "#fff" : "#8a8095")}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:10}}>
        <div>
          <Lbl>Descricao</Lbl>
          <input
            value={f.desc || ""}
            onChange={e => setF(x => ({...x, desc:e.target.value}))}
            placeholder="Ex: Gasolina"
            style={inp}
            autoComplete="off"
          />
        </div>

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
          <div>
            <Lbl>Valor (R$)</Lbl>
            <input
              type="number"
              value={f.value || ""}
              onChange={e => setF(x => ({...x, value:e.target.value}))}
              placeholder="0,00"
              style={inp}
              inputMode="decimal"
            />
          </div>
          <div>
            <Lbl>Data</Lbl>
            <input
              type="date"
              value={f.date || today()}
              onChange={e => setF(x => ({...x, date:e.target.value}))}
              style={inp}
            />
          </div>
        </div>

        {f.type === "despesa" && (
          <div style={{display:"flex", flexDirection:"column", gap:10}}>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
              <div>
                <Lbl>Categoria</Lbl>
                <select
                  value={f.category || "Alimentacao"}
                  onChange={e => setF(x => ({...x, category:e.target.value, subcategory:CATS[e.target.value]?.[0] || ""}))}
                  style={sel}
                >
                  {Object.keys(CATS).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Lbl>Subcategoria</Lbl>
                <select
                  value={f.subcategory || ""}
                  onChange={e => setF(x => ({...x, subcategory:e.target.value}))}
                  style={sel}
                >
                  {(CATS[f.category || "Alimentacao"] || ["Outros"]).map(sc => <option key={sc}>{sc}</option>)}
                </select>
              </div>
            </div>

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
              <div>
                <Lbl>Pagamento</Lbl>
                <select
                  value={f.payMethod || "Pix"}
                  onChange={e => setF(x => ({...x, payMethod:e.target.value, card:e.target.value !== "Cartao de Credito" ? "" : x.card}))}
                  style={sel}
                >
                  {FORMAS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <Lbl>Banco/Conta</Lbl>
                <select
                  value={f.banco || "ban_frank"}
                  onChange={e => setF(x => ({...x, banco:e.target.value}))}
                  style={sel}
                >
                  {CONTAS.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>

            {f.payMethod === "Cartao de Credito" && (
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                <div>
                  <Lbl>Cartao</Lbl>
                  <select
                    value={f.card || ""}
                    onChange={e => setF(x => ({...x, card:e.target.value}))}
                    style={sel}
                  >
                    <option value="">Selecione</option>
                    {CARTOES.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <Lbl>Parcelas</Lbl>
                  <select
                    value={f.installments || 1}
                    onChange={e => setF(x => ({...x, installments:parseInt(e.target.value)}))}
                    style={sel}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => (
                      <option key={n} value={n}>
                        {n === 1 ? "A vista" : n+"x"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div style={{display:"flex", gap:14, padding:"8px 12px", background:"#100d1a", borderRadius:10}}>
              <label style={{display:"flex", gap:6, alignItems:"center", cursor:"pointer", fontSize:13}}>
                <input
                  type="checkbox"
                  checked={f.fixed || false}
                  onChange={e => setF(x => ({...x, fixed:e.target.checked}))}
                  style={{width:14, height:14}}
                />
                <span style={{color:"#c9bfa8"}}>Gasto fixo</span>
              </label>
              <label style={{display:"flex", gap:6, alignItems:"center", cursor:"pointer", fontSize:13}}>
                <input
                  type="checkbox"
                  checked={f.prevista || false}
                  onChange={e => setF(x => ({...x, prevista:e.target.checked}))}
                  style={{width:14, height:14}}
                />
                <span style={{color:"#f59e0b"}}>Prevista</span>
              </label>
            </div>
          </div>
        )}

        {f.type === "receita" && (
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            <div>
              <Lbl>Origem</Lbl>
              <select
                value={f.subcategory || "Salario"}
                onChange={e => setF(x => ({...x, subcategory:e.target.value}))}
                style={sel}
              >
                {["Salario Frank","Salario Vania","Freelance","Dividendos","Rendimento","Renda Extra","Outros"].map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <Lbl>Depositar em</Lbl>
              <select
                value={f.banco || "ban_frank"}
                onChange={e => setF(x => ({...x, banco:e.target.value}))}
                style={sel}
              >
                {CONTAS.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>
        )}

        {f.type === "investimento" && (
          <div style={{display:"flex", flexDirection:"column", gap:10}}>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
              <div>
                <Lbl>Tipo</Lbl>
                <select
                  value={f.investTipo || "Poupanca"}
                  onChange={e => setF(x => ({...x, investTipo:e.target.value}))}
                  style={sel}
                >
                  {["Poupanca","CDB","LCI","LCA","Tesouro Selic","Tesouro IPCA","Acoes","FIIs","Outros"].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Lbl>Banco/Corretora</Lbl>
                <select
                  value={f.investBanco || "Banestes"}
                  onChange={e => setF(x => ({...x, investBanco:e.target.value}))}
                  style={sel}
                >
                  {["Banestes","XP Investimentos","Inter","Rico","BTG","Outros"].map(b => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
              <div>
                <Lbl>Prazo</Lbl>
                <select
                  value={f.prazo || "Livre"}
                  onChange={e => setF(x => ({...x, prazo:e.target.value}))}
                  style={sel}
                >
                  {["Livre","30 dias","60 dias","90 dias","6 meses","1 ano","2 anos","5 anos"].map(p => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <Lbl>Debitar de</Lbl>
                <select
                  value={f.banco || "ban_frank"}
                  onChange={e => setF(x => ({...x, banco:e.target.value}))}
                  style={sel}
                >
                  {CONTAS.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        <div style={{display:"flex", gap:8, marginTop:4}}>
          <button onClick={onCancel} style={{...btn("#100d1a","#8a8095"), border:"1px solid #1a2d4a"}}>Cancelar</button>
          <button onClick={onSave} style={btn(C.green)}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// -- Main App --
const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(_) { return fallback; }
};

export default function App() {
  const [tab,        setTab]        = useState("dashboard");
  const [txs,        setTxs]        = useState(() => load("cr_txs", []));
  const [fixos,      setFixos]      = useState(() => load("cr_fixos", []));
  const [goals,      setGoals]      = useState(() => load("cr_goals", []));
  const [hideValues, setHideValues] = useState(() => load("cr_hide", false));
  const [month,      setMonth]      = useState("2026-06");
  const [chatOpen,   setChatOpen]   = useState(false);
  const [msgs,       setMsgs]       = useState([{role:"assistant", content:"Ola Frank e Vania! Pronto para registrar.\n\nExemplos:\n- gasolina 200 debito Frank\n- salario 5000 Frank\n- farmacia 80 Vania\n\nOu envie foto do comprovante."}]);
  const [input,      setInput]      = useState("");
  const [aiLoading,  setAiLoading]  = useState(false);
  const [addOpen,    setAddOpen]    = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [editOpen,   setEditOpen]   = useState(false);
  const [editTx,     setEditTx]     = useState(null);
  const [goalOpen,   setGoalOpen]   = useState(false);
  const [gForm,      setGForm]      = useState({name:"",target:"",current:"",deadline:"",color:C.green});
  const [fixoOpen,   setFixoOpen]   = useState(false);
  const [fixoForm,   setFixoForm]   = useState({desc:"",category:"Moradia",subcategory:"Aluguel/Financiamento",value:"",payMethod:"Debito",banco:"ban_frank"});
  const [filterType, setFilterType] = useState("Todas");
  const [filterCat,  setFilterCat]  = useState("Todas");
  const [filterVar,  setFilterVar]  = useState("Todas");
  const [search,     setSearch]     = useState("");
  const [toast,      setToast]      = useState(null);
  const endRef = useRef();

  const showToast = (msg, ok=true) => {
    setToast({msg, ok});
    setTimeout(() => setToast(null), 2500);
  };

  // Salvar automaticamente no localStorage sempre que dados mudarem
  useEffect(() => { try { localStorage.setItem("cr_txs",   JSON.stringify(txs));   } catch(_){} }, [txs]);
  useEffect(() => { try { localStorage.setItem("cr_fixos", JSON.stringify(fixos)); } catch(_){} }, [fixos]);
  useEffect(() => { try { localStorage.setItem("cr_goals", JSON.stringify(goals)); } catch(_){} }, [goals]);
  useEffect(() => { try { localStorage.setItem("cr_hide",  JSON.stringify(hideValues)); } catch(_){} }, [hideValues]);

  const fmtV = v => hideValues ? "R$ ••••" : fmt(v);

  const S = {
    inp: {background:"#100d1a", border:"1px solid rgba(200,168,75,0.14)", borderRadius:12, padding:"10px 13px", color:C.text, fontSize:13, width:"100%", outline:"none", boxSizing:"border-box"},
    sel: {background:"#100d1a", border:"1px solid rgba(200,168,75,0.14)", borderRadius:12, padding:"10px 13px", color:C.text, fontSize:13, width:"100%", outline:"none", cursor:"pointer"},
    btn: (bg, col="#fff") => ({background:bg, color:col, border:"none", borderRadius:14, padding:"10px 18px", fontWeight:700, fontSize:13, letterSpacing:0.15, cursor:"pointer"}),
  };

  const getMonthTxs = useCallback((m) => {
    const real = txs.filter(t => t.month === m);
    const fixosJa = new Set(real.filter(t => t.fixed).map(t => t.desc));
    const auto = fixos
      .filter(f => !fixosJa.has(f.desc))
      .map((f, i) => ({...f, id:"auto_"+m+"_"+i, type:"despesa", date:m+"-05", month:m, installments:1, prevista:false, auto:true}));
    return [...real, ...auto];
  }, [txs, fixos]);

  const monthTxs  = getMonthTxs(month);
  const rec       = monthTxs.filter(t => t.type==="receita").reduce((s,t) => s+t.value, 0);
  const desp      = monthTxs.filter(t => t.type==="despesa").reduce((s,t) => s+t.value, 0);
  const inv       = monthTxs.filter(t => t.type==="investimento").reduce((s,t) => s+t.value, 0);
  const saldo     = rec - desp - inv;
  const despFixed = monthTxs.filter(t => t.type==="despesa" && t.fixed).reduce((s,t) => s+t.value, 0);
  const despVar   = monthTxs.filter(t => t.type==="despesa" && !t.fixed).reduce((s,t) => s+t.value, 0);

  const byCat   = monthTxs.filter(t => t.type==="despesa").reduce((a,t) => {a[t.category]=(a[t.category]||0)+t.value; return a;}, {});
  const catData = Object.entries(byCat).map(([name,value]) => ({name,value})).sort((a,b) => b.value-a.value);

  const fixedItems = monthTxs.filter(t => t.type==="despesa" && t.fixed).sort((a,b) => b.value-a.value);
  const varItems    = monthTxs.filter(t => t.type==="despesa" && !t.fixed).sort((a,b) => b.value-a.value);

  const monthly = ALL_MONTHS.map(([m,l]) => {
    const all = getMonthTxs(m);
    return {
      mes: l.slice(0,3),
      Receitas:      all.filter(t => t.type==="receita").reduce((s,t) => s+t.value, 0),
      Despesas:      all.filter(t => t.type==="despesa").reduce((s,t) => s+t.value, 0),
      Investimentos: all.filter(t => t.type==="investimento").reduce((s,t) => s+t.value, 0),
    };
  });

  const totalRec    = txs.filter(t => t.type==="receita").reduce((s,t) => s+t.value, 0);
  const totalDesp   = txs.filter(t => t.type==="despesa").reduce((s,t) => s+t.value, 0);
  const totalInv    = txs.filter(t => t.type==="investimento").reduce((s,t) => s+t.value, 0);
  const saldoGeral  = totalRec - totalDesp - totalInv;

  const taxa         = rec > 0 ? (desp / rec) * 100 : 0;
  const semaforo     = taxa < 70 ? "Verde - Otimo" : taxa < 85 ? "Amarelo - Atencao" : "Vermelho - Alerta";
  const semaforoCol  = taxa < 70 ? C.green : taxa < 85 ? C.yellow : C.red;

  const filteredTxs = monthTxs.filter(t => {
    if (filterType !== "Todas" && t.type !== filterType) return false;
    if (filterCat  !== "Todas" && t.category !== filterCat) return false;
    if (filterVar === "Fixas" && !t.fixed) return false;
    if (filterVar === "Variaveis" && t.fixed) return false;
    if (search && !t.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const saveTx = () => {
    if (!form.desc || !form.value) { showToast("Preencha descricao e valor", false); return; }
    const base = {...form, id:Date.now(), value:parseFloat(form.value), month:form.date.slice(0,7), installments:parseInt(form.installments)||1};
    setTxs(p => [...p, ...splitInstallments(base, base.installments)]);
    setAddOpen(false);
    setForm(EMPTY_FORM);
    showToast(form.desc + " registrado!");
  };

  const saveEdit = () => {
    if (!editTx) return;
    setTxs(p => p.map(t => t.id===editTx.id ? {...editTx, value:parseFloat(editTx.value)} : t));
    setEditOpen(false);
    setEditTx(null);
    showToast("Lancamento atualizado!");
  };

  const openEdit = t => { setEditTx({...t}); setEditOpen(true); };

  const sendMsg = async (text, img=null) => {
    if (!text.trim() && !img) return;
    setMsgs(p => [...p, {role:"user", content: img ? "[Foto] "+text : text}]);
    setInput("");
    setAiLoading(true);

    const catsList = Object.entries(CATS).map(([c,ss]) => c+":"+ss.join(",")).join("|");
    const sys = "Assistente financeiro de Frank e Vania. Responda APENAS com JSON: {\"type\":\"despesa|receita|investimento\",\"desc\":\"\",\"value\":0,\"category\":\"\",\"subcategory\":\"\",\"payMethod\":\"Pix\",\"banco\":\"ban_frank\",\"card\":\"\",\"fixed\":false,\"installments\":1,\"date\":\""+today()+"\",\"prevista\":false} Bancos: ban_frank=Banestes Frank, ban_vania=Banestes Vania, xp_vania=XP Vania. Cartoes: frank_ban=Banestes Frank, vania_ban=Banestes Vania, vania_xp=XP Vania. Cats: "+catsList;

    try {
      const m2 = img
        ? [{role:"user", content:[{type:"image", source:{type:"base64", media_type:"image/jpeg", data:img}}, {type:"text", text:text||"Registre esta transacao."}]}]
        : [{role:"user", content:text}];

      const reply = await askClaude(m2, sys);
      const clean = reply.replace(/```json?|```/g,"").trim();
      const match = clean.match(/\{[\s\S]+\}/);

      if (match) {
        const t = JSON.parse(match[0]);
        const base = {...t, id:Date.now(), month:(t.date||today()).slice(0,7), installments:parseInt(t.installments)||1};
        setTxs(p => [...p, ...splitInstallments(base, base.installments)]);
        const conta = CONTAS.find(c => c.id===t.banco)?.nome || "";
        setMsgs(p => [...p, {role:"assistant", content:"OK! "+t.desc+" - "+fmtV(t.value)+"\n"+t.category+(t.subcategory ? " > "+t.subcategory : "")+"\n"+t.payMethod+" - "+conta}]);
        showToast(t.desc + " registrado!");
      } else {
        setMsgs(p => [...p, {role:"assistant", content: reply || "Nao entendi. Tente: gasolina 200 debito Frank"}]);
      }
    } catch(_) {
      setMsgs(p => [...p, {role:"assistant", content:"Erro. Tente novamente."}]);
    }

    setAiLoading(false);
    setTimeout(() => endRef.current?.scrollIntoView({behavior:"smooth"}), 80);
  };

  const monthLabel = m => ALL_MONTHS.find(x => x[0]===m)?.[1] || m;

  return (
    <div style={{minHeight:"100vh", background:"radial-gradient(ellipse 900px 500px at 50% 0%, #1c1830 0%, #0F0F1A 55%)", color:C.text, fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif"}}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        body, input, select, button, textarea { font-variant-numeric: tabular-nums; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#0F0F1A; }
        ::-webkit-scrollbar-thumb { background:rgba(200,168,75,0.25); border-radius:4px; }
        input { -webkit-user-select:text!important; user-select:text!important; }
        input::placeholder { color:#4a4258; }
        select option { background:#100d1a; }
        @keyframes fadeup { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .up { animation:fadeup 0.3s ease; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        input[type=number] { -moz-appearance:textfield; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
      `}</style>

      {toast && (
        <div style={{position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background: toast.ok ? "linear-gradient(135deg,#C8A84B,#B8944A)" : C.red, color: toast.ok ? "#0F0F1A" : "#fff", padding:"10px 20px", borderRadius:14, fontWeight:700, fontSize:13, zIndex:999, whiteSpace:"nowrap", boxShadow:"0 12px 30px -10px rgba(0,0,0,0.6)"}}>
          {toast.msg}
        </div>

      )}

      {/* HEADER */}
      <div style={{padding:"18px 16px 14px", borderBottom:"1px solid rgba(200,168,75,0.1)"}}>
        <div style={{maxWidth:960, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div style={{display:"flex", gap:12, alignItems:"center"}}>
            <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
              <defs>
                <radialGradient id="hbg" cx="30%" cy="25%" r="80%">
                  <stop offset="0%" stopColor="#221c34"/>
                  <stop offset="100%" stopColor="#100d1a"/>
                </radialGradient>
                <linearGradient id="hring" x1="0" y1="0" x2="42" y2="42" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#E8D4A0"/>
                  <stop offset="100%" stopColor="#C8A84B"/>
                </linearGradient>
              </defs>
              <circle cx="21" cy="21" r="21" fill="url(#hbg)"/>
              <circle cx="16.5" cy="21" r="8.4" stroke="url(#hring)" strokeWidth="1.6" fill="none"/>
              <circle cx="25.5" cy="21" r="8.4" stroke="url(#hring)" strokeWidth="1.6" fill="none" opacity="0.55"/>
            </svg>
            <div>
              <div style={{fontSize:19, fontWeight:600, letterSpacing:-0.3, lineHeight:1.1, fontFamily:"'Fraunces', serif"}}>
                <span style={{background:"linear-gradient(90deg,#C8A84B,#E8D4A0)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>Casal</span>
                <span style={{color:"#F0E6D2"}}>Rico</span>
              </div>
              <div style={{fontSize:9, color:C.muted, fontWeight:600, letterSpacing:0.6, textTransform:"uppercase"}}>Frank & Vania · 2026</div>
            </div>
          </div>
          <div style={{display:"flex", gap:6, alignItems:"center"}}>
            <div style={{fontSize:10.5, color:semaforoCol, fontWeight:700, background:semaforoCol+"14", borderRadius:999, padding:"4px 10px"}}>{semaforo}</div>
            <button
              onClick={() => setHideValues(h => !h)}
              title={hideValues ? "Mostrar valores" : "Esconder valores"}
              style={{...S.btn("transparent"), fontSize:12, padding:"7px 12px", border:"1px solid "+(hideValues ? C.gold : "rgba(200,168,75,0.18)"), color: hideValues ? C.gold : C.sub, borderRadius:999}}
            >
              {hideValues ? "Oculto" : "Ver"}
            </button>
            <button onClick={() => setAddOpen(true)} style={{...S.btn(C.gold, "#0F0F1A"), fontSize:12, padding:"8px 15px", borderRadius:999, boxShadow:"0 8px 20px -8px rgba(200,168,75,0.5)"}}>+ Lancar</button>
            <button onClick={() => setChatOpen(true)} style={{...S.btn("transparent"), fontSize:16, padding:"6px 12px", border:"1px solid rgba(200,168,75,0.18)", color:C.gold, borderRadius:999}}>IA</button>
          </div>
        </div>
      </div>

      {/* TOTAIS */}
      <div style={{background:"rgba(200,168,75,0.04)", borderBottom:"1px solid rgba(200,168,75,0.08)", padding:"8px 16px", overflowX:"auto"}}>
        <div style={{maxWidth:960, margin:"0 auto", display:"flex", gap:18, flexWrap:"nowrap"}}>
          {[["Receitas",totalRec,C.green],["Despesas",totalDesp,C.red],["Investido",totalInv,C.blue],["Saldo",saldoGeral,saldoGeral>=0?C.green:C.red]].map(([l,v,col]) => (
            <div key={l} style={{display:"flex", gap:6, alignItems:"center", flexShrink:0}}>
              <div style={{width:5, height:5, borderRadius:"50%", background:col}}/>
              <span style={{fontSize:10.5, color:C.muted}}>{l}</span>
              <span style={{fontSize:12, fontWeight:700, color:col}}>{fmtV(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* NAV */}
      <div style={{display:"flex", gap:2, padding:"0 11px", background:"rgba(20,17,29,0.7)", backdropFilter:"blur(8px)", borderBottom:"1px solid rgba(200,168,75,0.08)", overflowX:"auto", position:"sticky", top:0, zIndex:100}}>
        {[["dashboard","Inicio"],["transacoes","Lancamentos"],["relatorio","Relatorio"],["fixos","Fixos"],["investimentos","Investir"],["metas","Metas"],["analise","Analise"]].map(([id,lbl]) => (
          <Pill key={id} active={tab===id} onClick={() => setTab(id)}>{lbl}</Pill>
        ))}
      </div>

      <div style={{padding:"16px 14px", maxWidth:960, margin:"0 auto", paddingBottom:80}}>

        {/* MES SELECTOR */}
        {["dashboard","transacoes","relatorio","analise"].includes(tab) && (
          <div style={{display:"flex", gap:4, marginBottom:14, overflowX:"auto", paddingBottom:4}}>
            {ALL_MONTHS.map(([v,l]) => (
              <Pill key={v} active={month===v} onClick={() => setMonth(v)}>
                {v > "2026-06" ? "* "+l : l}
              </Pill>
            ))}
          </div>
        )}

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div className="up">
            <Card style={{marginBottom:11, padding:"24px 22px", position:"relative", overflow:"hidden"}}>
              <div style={{position:"absolute", top:-40, right:-40, width:140, height:140, borderRadius:"50%", background:"radial-gradient(circle, rgba(200,168,75,0.14) 0%, transparent 70%)"}}/>
              <Lbl>Saldo de {monthLabel(month)}</Lbl>
              <div style={{
                fontFamily:"'Fraunces', serif", fontWeight:600, fontSize:36, lineHeight:1.15,
                color: saldo>=0 ? "#E8D4A0" : C.red, marginTop:2,
              }}>
                {fmtV(saldo)}
              </div>
              <div style={{width:56, height:2, background:"linear-gradient(90deg,#C8A84B,transparent)", margin:"12px 0 14px"}}/>
              <div style={{display:"flex", gap:22, flexWrap:"wrap"}}>
                {[["Receitas",rec,C.green],["Despesas",desp,C.red],["Investido",inv,C.blue]].map(([l,v,col]) => (
                  <div key={l}>
                    <div style={{fontSize:9.5, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, marginBottom:2}}>{l}</div>
                    <div style={{fontSize:14, fontWeight:700, color:col}}>{fmtV(v)}</div>
                  </div>
                ))}
              </div>
            </Card>

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:11}}>
              <Card style={{padding:14}}>
                <Lbl>Gastos Fixos</Lbl>
                <div style={{fontSize:15, fontWeight:800, color:C.purple, marginTop:2}}>{fmtV(despFixed)}</div>
              </Card>
              <Card style={{padding:14}}>
                <Lbl>Gastos Variaveis</Lbl>
                <div style={{fontSize:15, fontWeight:800, color:C.orange, marginTop:2}}>{fmtV(despVar)}</div>
              </Card>
            </div>

            <Card style={{marginBottom:11}}>
              <div style={{fontSize:14, fontWeight:700, marginBottom:10}}>Evolucao 2026</div>
              {hideValues ? (
                <div style={{height:180, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:12, background:"#100d1a", borderRadius:10}}>
                  Grafico oculto
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.green} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={C.green} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.red} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={C.red} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="mes" tick={{fill:C.muted, fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={fmtS} tick={{fill:C.muted, fontSize:9}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={v => fmtV(v)} contentStyle={{background:C.card, border:"1px solid "+C.border, borderRadius:10, color:C.text}}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Area type="monotone" dataKey="Receitas" stroke={C.green} strokeWidth={2} fill="url(#ag)"/>
                  <Area type="monotone" dataKey="Despesas" stroke={C.red} strokeWidth={2} fill="url(#ar)"/>
                </AreaChart>
              </ResponsiveContainer>
              )}
            </Card>

            <Card style={{marginBottom:11}}>
              <div style={{fontSize:14, fontWeight:700, marginBottom:9}}>Gastos por Categoria - {monthLabel(month)}</div>
              {catData.length === 0
                ? <div style={{color:C.muted, textAlign:"center", padding:20, fontSize:13}}>Sem despesas neste mes</div>
                : (
                  <div>
                    {hideValues ? (
                      <div style={{height:130, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:12, background:"#100d1a", borderRadius:10, marginBottom:9}}>
                        Grafico oculto
                      </div>
                    ) : (
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart>
                        <Pie data={catData} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={24}>
                          {catData.map((e,i) => <Cell key={i} fill={CAT_COLS[e.name]||"#64748b"}/>)}
                        </Pie>
                        <Tooltip formatter={v => fmtV(v)} contentStyle={{background:C.card, border:"1px solid "+C.border, borderRadius:10, color:C.text}}/>
                      </PieChart>
                    </ResponsiveContainer>
                    )}
                    {catData.map(({name,value}) => (
                      <div key={name} style={{display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3}}>
                        <div style={{display:"flex", gap:5, alignItems:"center"}}>
                          <div style={{width:7, height:7, borderRadius:"50%", background:CAT_COLS[name]||"#64748b"}}/>
                          <span style={{color:C.sub}}>{name}</span>
                        </div>
                        <span style={{fontWeight:700}}>{fmtV(value)}</span>
                      </div>
                    ))}
                  </div>
                )
              }
            </Card>

            <Card>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:10}}>
                <div style={{fontSize:14, fontWeight:700}}>Metas</div>
                <button onClick={() => setTab("metas")} style={{background:"none", border:"none", color:C.green, cursor:"pointer", fontSize:12}}>Ver todas</button>
              </div>
              {goals.length === 0
                ? (
                  <div style={{color:C.muted, textAlign:"center", padding:16, fontSize:13}}>
                    Nenhuma meta.{" "}
                    <button onClick={() => {setTab("metas"); setGoalOpen(true);}} style={{color:C.green, background:"none", border:"none", cursor:"pointer", fontWeight:600}}>
                      + Criar
                    </button>
                  </div>
                )
                : goals.slice(0,3).map(g => {
                    const p = Math.min((g.current/g.target)*100, 100);
                    return (
                      <div key={g.id} style={{marginBottom:10}}>
                        <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                          <span style={{fontWeight:600, fontSize:13}}>{g.name}</span>
                          <span style={{fontSize:11, color:C.muted}}>{fmtV(g.current)} / {fmtV(g.target)}</span>
                        </div>
                        <div style={{background:"#100d1a", borderRadius:999, height:7, overflow:"hidden"}}>
                          <div style={{background:g.color, width:p+"%", height:"100%", borderRadius:999}}/>
                        </div>
                        <div style={{fontSize:10, color:C.muted, marginTop:2}}>{p.toFixed(0)}%</div>
                      </div>
                    );
                  })
              }
            </Card>
          </div>
        )}

        {/* TRANSACOES */}
        {tab === "transacoes" && (
          <div className="up">
            <div style={{display:"flex", gap:6, marginBottom:10, flexWrap:"wrap", justifyContent:"space-between", alignItems:"center"}}>
              <div style={{display:"flex", gap:5, flexWrap:"wrap", flex:1}}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  style={{...S.inp, width:110, padding:"6px 10px", fontSize:12}}
                />
                <select value={filterVar} onChange={e => setFilterVar(e.target.value)} style={{...S.sel, width:"auto", padding:"6px 10px", fontSize:12}}>
                  <option value="Todas">Fixas+Variaveis</option>
                  <option value="Fixas">So Fixas</option>
                  <option value="Variaveis">So Variaveis</option>
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{...S.sel, width:"auto", padding:"6px 10px", fontSize:12}}>
                  <option value="Todas">Todos</option>
                  <option value="receita">Receitas</option>
                  <option value="despesa">Despesas</option>
                  <option value="investimento">Invest.</option>
                </select>
              </div>
              <button onClick={() => setAddOpen(true)} style={{...S.btn(C.green), fontSize:12, padding:"7px 13px"}}>+ Nova</button>
            </div>

            {["receita","despesa","investimento"].map(tipo => {
              const items = filteredTxs.filter(t => t.type===tipo).sort((a,b) => a.date.localeCompare(b.date));
              if (!items.length) return null;
              const total = items.reduce((s,t) => s+t.value, 0);
              const cor   = {receita:C.green, despesa:C.red, investimento:C.blue}[tipo];
              const nom   = {receita:"Receitas", despesa:"Despesas", investimento:"Investimentos"}[tipo];
              return (
                <Card key={tipo} style={{marginBottom:11}}>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:9}}>
                    <span style={{fontWeight:700, color:cor, fontSize:14}}>{nom}</span>
                    <span style={{fontWeight:700, color:cor}}>{fmtV(total)}</span>
                  </div>
                  {items.map(t => (
                    <div key={t.id} style={{padding:"8px 0", borderBottom:"1px solid "+C.border}}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{fontWeight:600, fontSize:13, display:"flex", gap:5, alignItems:"center", flexWrap:"wrap"}}>
                            <span>{t.desc}</span>
                            {t.fixed    && <Bdg color={C.purple}>Fixo</Bdg>}
                            {t.prevista && <Bdg color={C.yellow}>Prevista</Bdg>}
                            {(t.installments||1) > 1 && <Bdg color={C.cyan}>Parc.</Bdg>}
                            {t.auto     && <Bdg color={C.muted}>Auto</Bdg>}
                          </div>
                          <div style={{fontSize:10, color:C.muted, marginTop:3, display:"flex", gap:5, flexWrap:"wrap", alignItems:"center"}}>
                            <span>{new Date(t.date+"T12:00").toLocaleDateString("pt-BR")}</span>
                            {t.category && <Bdg color={CAT_COLS[t.category]||C.muted}>{t.category}</Bdg>}
                            {t.subcategory && t.subcategory !== t.category && <Bdg color="#1a3050">{t.subcategory}</Bdg>}
                            {t.banco && <span>Banco: {CONTAS.find(c=>c.id===t.banco)?.nome||""}</span>}
                          </div>
                        </div>
                        <div style={{display:"flex", gap:5, alignItems:"center", marginLeft:8}}>
                          <span style={{fontWeight:700, color:cor, fontSize:13}}>{tipo==="receita"?"+":"-"}{fmtV(t.value)}</span>
                          <button
                            onClick={() => { if(t.auto){ const nt={...t,id:Date.now(),auto:false}; setTxs(p=>[...p,nt]); openEdit(nt); } else openEdit(t); }}
                            style={{background:"#1e293b", border:"none", color:C.sub, cursor:"pointer", fontSize:11, borderRadius:7, padding:"3px 7px"}}
                          >Edit</button>
                          {!t.fixed && !t.auto && (
                            <button
                              onClick={() => { setTxs(p => p.filter(x => x.id!==t.id)); showToast("Removido", false); }}
                              style={{background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:15}}
                            >x</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>
              );
            })}

            {filteredTxs.length === 0 && (
              <Card style={{textAlign:"center", padding:30, color:C.muted, fontSize:13}}>
                Nenhum lancamento encontrado.
              </Card>
            )}
          </div>
        )}

        {/* RELATORIO */}
        {tab === "relatorio" && (
          <div className="up">
            <Card style={{marginBottom:11, borderTop:"3px solid "+C.gold}}>
              <div style={{fontSize:14, fontWeight:700, marginBottom:2, color:C.gold}}>Relatorio - {monthLabel(month)}</div>
              <div style={{fontSize:11, color:C.muted, marginBottom:12}}>Resumo de fixos e variaveis do mes</div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10}}>
                {[["Receitas",rec,C.green],["Despesas",desp,C.red],["Investido",inv,C.blue],["Saldo",saldo,saldo>=0?C.green:C.red]].map(([l,v,col]) => (
                  <div key={l} style={{textAlign:"center"}}>
                    <Lbl>{l}</Lbl>
                    <div style={{fontSize:14, fontWeight:800, color:col}}>{fmtV(v)}</div>
                  </div>
                ))}
              </div>
            </Card>

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
              <Card style={{borderTop:"3px solid "+C.purple, padding:14}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, gap:6}}>
                  <span style={{fontWeight:800, fontSize:13, color:C.purple}}>Fixos</span>
                  <span style={{fontWeight:800, fontSize:13, color:C.purple}}>{fmtV(despFixed)}</span>
                </div>
                {fixedItems.length === 0
                  ? <div style={{color:C.muted, fontSize:12, textAlign:"center", padding:14}}>Sem gastos fixos</div>
                  : fixedItems.map(t => (
                      <div key={t.id} style={{display:"flex", justifyContent:"space-between", gap:6, padding:"7px 0", borderBottom:"1px solid "+C.border}}>
                        <span style={{fontSize:12, color:C.sub}}>{t.desc}</span>
                        <span style={{fontSize:12, fontWeight:700, whiteSpace:"nowrap"}}>{fmtV(t.value)}</span>
                      </div>
                    ))
                }
              </Card>

              <Card style={{borderTop:"3px solid "+C.orange, padding:14}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, gap:6}}>
                  <span style={{fontWeight:800, fontSize:13, color:C.orange}}>Variaveis</span>
                  <span style={{fontWeight:800, fontSize:13, color:C.orange}}>{fmtV(despVar)}</span>
                </div>
                {varItems.length === 0
                  ? <div style={{color:C.muted, fontSize:12, textAlign:"center", padding:14}}>Sem gastos variaveis</div>
                  : varItems.map(t => (
                      <div key={t.id} style={{display:"flex", justifyContent:"space-between", gap:6, padding:"7px 0", borderBottom:"1px solid "+C.border}}>
                        <span style={{fontSize:12, color:C.sub}}>{t.desc}</span>
                        <span style={{fontSize:12, fontWeight:700, whiteSpace:"nowrap"}}>{fmtV(t.value)}</span>
                      </div>
                    ))
                }
              </Card>
            </div>
          </div>
        )}

        {/* FIXOS */}
        {tab === "fixos" && (
          <div className="up">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
              <div style={{fontSize:15, fontWeight:700}}>Gastos Fixos Mensais</div>
              <button onClick={() => setFixoOpen(true)} style={{...S.btn(C.purple), fontSize:12, padding:"7px 13px"}}>+ Novo Fixo</button>
            </div>
            <Card style={{marginBottom:14}}>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:10}}>
                <span style={{fontWeight:700, color:C.purple}}>Total fixo mensal</span>
                <span style={{fontWeight:700, color:C.purple}}>{fmtV(fixos.reduce((s,f) => s+f.value, 0))}</span>
              </div>
              {fixos.length === 0 && (
                <div style={{color:C.muted, textAlign:"center", padding:20, fontSize:13}}>
                  Nenhum fixo cadastrado.
                </div>
              )}
              {fixos.map((f,i) => (
                <div key={i} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid "+C.border}}>
                  <div>
                    <div style={{fontWeight:600, fontSize:13}}>{f.desc}</div>
                    <div style={{fontSize:10, color:C.muted, marginTop:2}}>
                      {f.category} - {f.subcategory} - {CONTAS.find(c=>c.id===f.banco)?.nome||""}
                    </div>
                  </div>
                  <div style={{display:"flex", gap:6, alignItems:"center"}}>
                    <span style={{fontWeight:700, color:C.purple}}>{fmtV(f.value)}</span>
                    <button
                      onClick={() => { const v=prompt("Novo valor para "+f.desc+":"); if(v&&!isNaN(parseFloat(v))) setFixos(p=>p.map((x,j)=>j===i?{...x,value:parseFloat(v)}:x)); }}
                      style={{background:"#1e293b", border:"none", color:C.sub, cursor:"pointer", fontSize:11, borderRadius:7, padding:"3px 7px"}}
                    >Edit</button>
                    <button
                      onClick={() => setFixos(p => p.filter((_,j) => j!==i))}
                      style={{background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:15}}
                    >x</button>
                  </div>
                </div>
              ))}
            </Card>

            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
              <div style={{fontSize:15, fontWeight:700}}>Despesas Previstas</div>
              <button onClick={() => {setForm({...EMPTY_FORM, prevista:true}); setAddOpen(true);}} style={{...S.btn(C.yellow,"#000"), fontSize:12, padding:"7px 13px"}}>+ Lancar Prevista</button>
            </div>
            {txs.filter(t => t.prevista).length === 0
              ? <Card style={{textAlign:"center", padding:24, color:C.muted, fontSize:13}}>Nenhuma despesa prevista ainda.</Card>
              : txs.filter(t => t.prevista).sort((a,b) => a.date.localeCompare(b.date)).map(t => (
                <Card key={t.id} style={{marginBottom:9, borderLeft:"3px solid "+C.yellow}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:700, fontSize:14}}>{t.desc}</div>
                      <div style={{fontSize:10, color:C.muted, marginTop:2}}>{new Date(t.date+"T12:00").toLocaleDateString("pt-BR")} - {monthLabel(t.month)}</div>
                    </div>
                    <div style={{display:"flex", gap:6, alignItems:"center"}}>
                      <span style={{fontWeight:700, color:C.yellow}}>{fmtV(t.value)}</span>
                      <button onClick={() => openEdit(t)} style={{background:"#1e293b", border:"none", color:C.sub, cursor:"pointer", fontSize:11, borderRadius:7, padding:"3px 7px"}}>Edit</button>
                      <button onClick={() => setTxs(p => p.filter(x => x.id!==t.id))} style={{background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:15}}>x</button>
                    </div>
                  </div>
                </Card>
              ))
            }
          </div>
        )}

        {/* INVESTIMENTOS */}
        {tab === "investimentos" && (
          <div className="up">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
              <div style={{fontSize:15, fontWeight:700}}>Investimentos</div>
              <button onClick={() => {setForm({...EMPTY_FORM, type:"investimento"}); setAddOpen(true);}} style={{...S.btn(C.blue), fontSize:12, padding:"7px 13px"}}>+ Novo</button>
            </div>
            <Card style={{marginBottom:11, padding:"22px 22px"}}>
              <Lbl>Patrimonio Total Investido</Lbl>
              <div style={{fontFamily:"'Fraunces', serif", fontWeight:600, fontSize:30, color:"#E8D4A0", marginTop:2}}>
                {fmtV(txs.filter(t => t.type==="investimento").reduce((s,t) => s+t.value, 0))}
              </div>
              <div style={{width:56, height:2, background:"linear-gradient(90deg,#C8A84B,transparent)", marginTop:12}}/>
            </Card>
            {txs.filter(t => t.type==="investimento").length === 0
              ? (
                <Card style={{textAlign:"center", padding:30, color:C.muted, fontSize:13}}>
                  Nenhum investimento ainda.
                </Card>
              )
              : txs.filter(t => t.type==="investimento").sort((a,b) => b.date.localeCompare(a.date)).map(t => (
                <Card key={t.id} style={{marginBottom:9, borderLeft:"3px solid "+C.blue}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:700, fontSize:14}}>{t.desc}</div>
                      <div style={{fontSize:11, color:C.muted, marginTop:2}}>
                        {new Date(t.date+"T12:00").toLocaleDateString("pt-BR")}
                        {t.investBanco && " - "+t.investBanco}
                        {t.investTipo  && " - "+t.investTipo}
                        {t.prazo       && " - "+t.prazo}
                      </div>
                    </div>
                    <div style={{display:"flex", gap:5, alignItems:"center"}}>
                      <span style={{fontWeight:700, color:C.blue, fontSize:15}}>{fmtV(t.value)}</span>
                      <button onClick={() => openEdit(t)} style={{background:"#1e293b", border:"none", color:C.sub, cursor:"pointer", fontSize:11, borderRadius:7, padding:"3px 7px"}}>Edit</button>
                      <button onClick={() => {setTxs(p => p.filter(x => x.id!==t.id)); showToast("Removido", false);}} style={{background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:14}}>x</button>
                    </div>
                  </div>
                </Card>
              ))
            }
          </div>
        )}

        {/* METAS */}
        {tab === "metas" && (
          <div className="up">
            <div style={{display:"flex", justifyContent:"flex-end", marginBottom:12}}>
              <button onClick={() => setGoalOpen(true)} style={S.btn(C.green)}>+ Nova Meta</button>
            </div>
            {goals.length === 0 && (
              <Card style={{textAlign:"center", padding:34}}>
                <div style={{fontSize:36, marginBottom:10}}>Meta</div>
                <div style={{fontSize:15, fontWeight:700, marginBottom:5}}>Nenhuma meta cadastrada</div>
                <button onClick={() => setGoalOpen(true)} style={{...S.btn(C.green), width:"100%"}}>+ Criar primeira meta</button>
              </Card>
            )}
            {goals.map(g => {
              const p    = Math.min((g.current/g.target)*100, 100);
              const falta = g.target - g.current;
              const dias  = Math.ceil((new Date(g.deadline)-new Date()) / 86400000);
              const pm    = dias > 0 ? falta / (dias/30) : 0;
              return (
                <Card key={g.id} style={{marginBottom:13, borderLeft:"3px solid "+g.color}}>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:9}}>
                    <div style={{fontWeight:800, fontSize:15}}>{g.name}</div>
                    <div style={{display:"flex", gap:7, alignItems:"center"}}>
                      <div style={{fontWeight:900, fontSize:17, color:g.color}}>{p.toFixed(0)}%</div>
                      <button onClick={() => setGoals(p => p.filter(x => x.id!==g.id))} style={{background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:15}}>x</button>
                    </div>
                  </div>
                  <div style={{background:"#100d1a", borderRadius:999, height:11, overflow:"hidden", marginBottom:9}}>
                    <div style={{background:g.color, width:p+"%", height:"100%", borderRadius:999}}/>
                  </div>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:9, textAlign:"center", marginBottom:9}}>
                    <div><Lbl>Acumulado</Lbl><div style={{fontWeight:700, color:g.color, fontSize:13}}>{fmtV(g.current)}</div></div>
                    <div><Lbl>Meta</Lbl><div style={{fontWeight:700, fontSize:13}}>{fmtV(g.target)}</div></div>
                    <div><Lbl>Poupar/Mes</Lbl><div style={{fontWeight:700, color:C.yellow, fontSize:13}}>{fmtV(pm)}</div></div>
                  </div>
                  <Lbl>Atualizar valor acumulado</Lbl>
                  <input
                    type="number"
                    placeholder={"Atual: "+fmtV(g.current)}
                    style={{...S.inp, marginTop:3}}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) {
                          setGoals(p => p.map(gl => gl.id===g.id ? {...gl,current:v} : gl));
                          e.target.value = "";
                        }
                      }
                    }}
                  />
                </Card>
              );
            })}
          </div>
        )}

        {/* ANALISE */}
        {tab === "analise" && (
          <div className="up">
            <Card style={{marginBottom:12}}>
              <div style={{fontSize:14, fontWeight:700, marginBottom:11}}>Maiores Gastos - {monthLabel(month)}</div>
              {catData.length === 0
                ? <div style={{color:C.muted, textAlign:"center", padding:20}}>Sem despesas neste periodo</div>
                : hideValues ? (
                  <div style={{height:160, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:12, background:"#100d1a", borderRadius:10}}>
                    Grafico oculto
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(160, catData.length*33)}>
                    <BarChart data={catData} layout="vertical">
                      <XAxis type="number" tickFormatter={fmtS} tick={{fill:C.muted, fontSize:10}} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="name" tick={{fill:C.sub, fontSize:11}} axisLine={false} tickLine={false} width={110}/>
                      <Tooltip formatter={v => fmtV(v)} contentStyle={{background:C.card, border:"1px solid "+C.border, borderRadius:10, color:C.text}}/>
                      <Bar dataKey="value" radius={[0,7,7,0]}>
                        {catData.map((e,i) => <Cell key={i} fill={CAT_COLS[e.name]||"#64748b"}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </Card>
            <Card>
              <div style={{fontSize:14, fontWeight:700, marginBottom:10}}>Receitas x Despesas 2026</div>
              {hideValues ? (
                <div style={{height:175, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:12, background:"#100d1a", borderRadius:10}}>
                  Grafico oculto
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={175}>
                <BarChart data={monthly}>
                  <XAxis dataKey="mes" tick={{fill:C.muted, fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={fmtS} tick={{fill:C.muted, fontSize:9}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={v => fmtV(v)} contentStyle={{background:C.card, border:"1px solid "+C.border, borderRadius:10, color:C.text}}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="Receitas" fill={C.green} radius={[4,4,0,0]}/>
                  <Bar dataKey="Despesas" fill={C.red} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR */}
      {addOpen && (
        <div style={{position:"fixed", inset:0, background:"#000d", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:12, overflowY:"auto"}}>
          <TxForm f={form} setF={setForm} onSave={saveTx} onCancel={() => {setAddOpen(false); setForm(EMPTY_FORM);}} title="Nova Transacao"/>
        </div>
      )}

      {/* MODAL EDITAR */}
      {editOpen && editTx && (
        <div style={{position:"fixed", inset:0, background:"#000d", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:12, overflowY:"auto"}}>
          <TxForm f={editTx} setF={setEditTx} onSave={saveEdit} onCancel={() => {setEditOpen(false); setEditTx(null);}} title="Editar Lancamento"/>
        </div>
      )}

      {/* MODAL FIXO */}
      {fixoOpen && (
        <div style={{position:"fixed", inset:0, background:"#000d", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:12}}>
          <div style={{background:C.card, border:"1px solid "+C.border, borderRadius:20, padding:22, width:"100%", maxWidth:420}}>
            <div style={{fontWeight:800, fontSize:16, marginBottom:13}}>Novo Gasto Fixo</div>
            <div style={{display:"flex", flexDirection:"column", gap:9}}>
              <div>
                <Lbl>Descricao</Lbl>
                <input placeholder="Ex: Plano de Saude" value={fixoForm.desc} onChange={e => setFixoForm(f => ({...f,desc:e.target.value}))} style={S.inp}/>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                <div>
                  <Lbl>Categoria</Lbl>
                  <select value={fixoForm.category} onChange={e => setFixoForm(f => ({...f,category:e.target.value,subcategory:CATS[e.target.value]?.[0]||""}))} style={S.sel}>
                    {Object.keys(CATS).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Lbl>Subcategoria</Lbl>
                  <select value={fixoForm.subcategory} onChange={e => setFixoForm(f => ({...f,subcategory:e.target.value}))} style={S.sel}>
                    {(CATS[fixoForm.category]||[]).map(sc => <option key={sc}>{sc}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                <div>
                  <Lbl>Valor (R$)</Lbl>
                  <input type="number" value={fixoForm.value} onChange={e => setFixoForm(f => ({...f,value:e.target.value}))} placeholder="0,00" style={S.inp}/>
                </div>
                <div>
                  <Lbl>Banco</Lbl>
                  <select value={fixoForm.banco} onChange={e => setFixoForm(f => ({...f,banco:e.target.value}))} style={S.sel}>
                    {CONTAS.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"flex", gap:8, marginTop:4}}>
                <button onClick={() => setFixoOpen(false)} style={{...S.btn("#100d1a",C.muted), flex:1, border:"1px solid "+C.border}}>Cancelar</button>
                <button
                  onClick={() => {
                    if (!fixoForm.desc||!fixoForm.value) return;
                    setFixos(p => [...p, {...fixoForm, value:parseFloat(fixoForm.value)}]);
                    setFixoOpen(false);
                    setFixoForm({desc:"",category:"Moradia",subcategory:"Aluguel/Financiamento",value:"",payMethod:"Debito",banco:"ban_frank"});
                    showToast("Fixo salvo!");
                  }}
                  style={{...S.btn(C.purple), flex:1}}
                >Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL META */}
      {goalOpen && (
        <div style={{position:"fixed", inset:0, background:"#000d", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:12}}>
          <div style={{background:C.card, border:"1px solid "+C.border, borderRadius:20, padding:22, width:"100%", maxWidth:400}}>
            <div style={{fontWeight:800, fontSize:16, marginBottom:13}}>Nova Meta</div>
            <div style={{display:"flex", flexDirection:"column", gap:9}}>
              <div>
                <Lbl>Nome</Lbl>
                <input placeholder="Ex: Reserva de Emergencia" value={gForm.name} onChange={e => setGForm(f => ({...f,name:e.target.value}))} style={S.inp}/>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                <div>
                  <Lbl>Valor Alvo (R$)</Lbl>
                  <input type="number" value={gForm.target} onChange={e => setGForm(f => ({...f,target:e.target.value}))} placeholder="30000" style={S.inp}/>
                </div>
                <div>
                  <Lbl>Ja Acumulado (R$)</Lbl>
                  <input type="number" value={gForm.current} onChange={e => setGForm(f => ({...f,current:e.target.value}))} placeholder="0" style={S.inp}/>
                </div>
              </div>
              <div>
                <Lbl>Prazo</Lbl>
                <input type="date" value={gForm.deadline} onChange={e => setGForm(f => ({...f,deadline:e.target.value}))} style={S.inp}/>
              </div>
              <div>
                <Lbl>Cor</Lbl>
                <div style={{display:"flex", gap:6, marginTop:3}}>
                  {[C.green,C.blue,C.yellow,C.purple,C.red,C.orange,C.cyan].map(col => (
                    <div key={col} onClick={() => setGForm(f => ({...f,color:col}))} style={{width:26, height:26, borderRadius:"50%", background:col, cursor:"pointer", border:gForm.color===col?"3px solid white":"3px solid transparent"}}/>
                  ))}
                </div>
              </div>
              <div style={{display:"flex", gap:8, marginTop:4}}>
                <button onClick={() => setGoalOpen(false)} style={{...S.btn("#100d1a",C.muted), flex:1, border:"1px solid "+C.border}}>Cancelar</button>
                <button
                  onClick={() => {
                    if (!gForm.name||!gForm.target||!gForm.deadline) return;
                    setGoals(p => [...p, {...gForm, id:Date.now(), target:parseFloat(gForm.target), current:parseFloat(gForm.current||0)}]);
                    setGoalOpen(false);
                    setGForm({name:"",target:"",current:"",deadline:"",color:C.green});
                    showToast("Meta criada!");
                  }}
                  style={{...S.btn(C.green), flex:1}}
                >Criar Meta</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHAT IA */}
      {chatOpen && (
        <div style={{position:"fixed", inset:0, zIndex:300, display:"flex", flexDirection:"column", background:"radial-gradient(ellipse 900px 500px at 50% 0%, #1c1830 0%, #0F0F1A 55%)"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", background:"rgba(22,19,32,0.8)", borderBottom:"1px solid rgba(200,168,75,0.1)"}}>
            <div>
              <div style={{fontWeight:700, fontFamily:"'Fraunces', serif", fontSize:16}}>Assistente Financeiro</div>
              <div style={{fontSize:10, color:C.gold, fontWeight:600, letterSpacing:0.4, textTransform:"uppercase"}}>CasalRico App</div>
            </div>
            <button onClick={() => setChatOpen(false)} style={{background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer"}}>x</button>
          </div>

          <div style={{flex:1, overflowY:"auto", padding:14, display:"flex", flexDirection:"column", gap:9}}>
            {msgs.map((m,i) => (
              <div key={i} style={{display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                <div style={{
                  maxWidth:"85%", padding:"10px 14px",
                  borderRadius: m.role==="user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: m.role==="user" ? "linear-gradient(135deg,#C8A84B,#B8944A)" : "linear-gradient(165deg, #1a1628, #141020)",
                  color: m.role==="user" ? "#0F0F1A" : C.text,
                  border: m.role==="user" ? "none" : "1px solid rgba(200,168,75,0.1)",
                  fontSize:13, lineHeight:1.55, whiteSpace:"pre-wrap",
                  boxShadow: m.role==="user" ? "none" : "0 10px 24px -16px rgba(0,0,0,0.6)",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div style={{display:"flex", gap:5, padding:10, alignItems:"center"}}>
                <div style={{width:14, height:14, border:"2px solid rgba(200,168,75,0.25)", borderTop:"2px solid "+C.gold, borderRadius:"50%", animation:"spin 0.8s linear infinite"}}/>
                <span style={{fontSize:12, color:C.muted}}>Processando...</span>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          <div style={{padding:"10px 14px 0", background:"rgba(22,19,32,0.8)", borderTop:"1px solid rgba(200,168,75,0.1)"}}>
            <div style={{display:"flex", gap:5, flexWrap:"wrap", marginBottom:8}}>
              {["Gasolina 200 debito Frank","Farmacia 80 Vania","Delivery 60 cartao Frank","Salario 5000 Frank"].map(sg => (
                <button key={sg} onClick={() => sendMsg(sg)} style={{background:"transparent", border:"1px solid rgba(200,168,75,0.16)", borderRadius:999, padding:"4px 10px", fontSize:11, color:C.sub, cursor:"pointer"}}>{sg}</button>
              ))}
            </div>
            <div style={{display:"flex", gap:7, paddingBottom:14}}>
              <label htmlFor="cam-inp" style={{background:"#100d1a", color:C.gold, border:"1px solid rgba(200,168,75,0.16)", borderRadius:12, padding:"0 13px", fontSize:16, display:"flex", alignItems:"center", cursor:"pointer", flexShrink:0}}>
                Cam
                <input
                  id="cam-inp"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{position:"absolute", width:1, height:1, opacity:0}}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    e.target.value = "";
                    const r = new FileReader();
                    r.onload = () => sendMsg("Analise este comprovante.", r.result.split(",")[1]);
                    r.readAsDataURL(f);
                  }}
                />
              </label>
              <label htmlFor="gal-inp" style={{background:"#100d1a", color:C.gold, border:"1px solid rgba(200,168,75,0.16)", borderRadius:12, padding:"0 13px", fontSize:15, display:"flex", alignItems:"center", cursor:"pointer", flexShrink:0}}>
                Gal
                <input
                  id="gal-inp"
                  type="file"
                  accept="image/*"
                  style={{position:"absolute", width:1, height:1, opacity:0}}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    e.target.value = "";
                    const r = new FileReader();
                    r.onload = () => sendMsg("Analise este comprovante.", r.result.split(",")[1]);
                    r.readAsDataURL(f);
                  }}
                />
              </label>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMsg(input)}
                placeholder="gasolina 200 debito Frank"
                style={{...S.inp, flex:1}}
                autoComplete="off"
              />
              <button
                onClick={() => sendMsg(input)}
                disabled={aiLoading || !input.trim()}
                style={{...S.btn(C.gold, "#0F0F1A"), padding:"0 16px", flexShrink:0, borderRadius:12, opacity: (aiLoading || !input.trim()) ? 0.5 : 1}}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

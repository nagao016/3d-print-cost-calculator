import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import "./styles.css";

const fields = [
  { group: "material", title: "フィラメント購入価格", id: "filamentPrice", unit: "円", value: 2500, step: 1, note: "スプール1個の価格" },
  { group: "material", title: "スプール総重量", id: "spoolWeight", unit: "g", value: 1000, step: 1 },
  { group: "material", title: "作品の使用量", id: "usedGrams", unit: "g", value: 80, step: 0.1 },
  { group: "machine", title: "印刷時間", id: "printHours", unit: "時間", value: 5, step: 0.1 },
  { group: "machine", title: "平均消費電力", id: "powerWatts", unit: "W", value: 150, step: 1 },
  { group: "machine", title: "電気料金単価", id: "electricityRate", unit: "円/kWh", value: 31, step: 0.1 },
  { group: "machine", title: "プリンター購入価格", id: "printerPrice", unit: "円", value: 60000, step: 1 },
  { group: "machine", title: "想定使用可能時間", id: "printerLifeHours", unit: "時間", value: 3000, step: 1 },
  { group: "machine", title: "印刷失敗率", id: "failureRate", unit: "%", value: 5, step: 1 },
  { group: "machine", title: "その他消耗品費", id: "otherCost", unit: "円/個", value: 20, step: 1 },
  { group: "selling", title: "梱包費", id: "packagingCost", unit: "円/個", value: 80, step: 1 },
  { group: "selling", title: "送料（出品者負担）", id: "shippingCost", unit: "円/個", value: 230, step: 1 },
  { group: "selling", title: "販売手数料率", id: "feeRate", unit: "%", value: 10, step: 0.1 },
  { group: "selling", title: "目標利益率", id: "targetMargin", unit: "%", value: 30, step: 1 }
];
const defaults = Object.fromEntries(fields.map(f => [f.id, f.value]));
const money = n => Number.isFinite(n) ? "¥" + Math.round(n).toLocaleString("ja-JP") : "—";
const pct = n => Number.isFinite(n) ? n.toFixed(1) + "%" : "—";
const num = n => Math.max(0, Number(n) || 0);
function calculate(v) {
  const spool = num(v.spoolWeight), life = num(v.printerLifeHours);
  const failureInput = num(v.failureRate), feeInput = num(v.feeRate), targetInput = num(v.targetMargin);
  const failure = Math.min(99, failureInput) / 100, fee = Math.min(99, feeInput) / 100, target = Math.min(95, targetInput) / 100;
  const filament = spool > 0 ? num(v.filamentPrice) / spool * num(v.usedGrams) : NaN;
  const electricity = num(v.printHours) * num(v.powerWatts) / 1000 * num(v.electricityRate);
  const depreciation = life > 0 ? num(v.printerPrice) / life * num(v.printHours) : NaN;
  const other = num(v.otherCost), base = filament + electricity + depreciation + other;
  const production = base / (1 - failure);
  const packaging = num(v.packagingCost), shipping = num(v.shippingCost), landed = production + packaging + shipping;
  const denominator = 1 - fee - target;
  const suggested = denominator > 0 ? Math.ceil(landed / denominator) : NaN;
  const breakEven = fee < 1 ? Math.ceil(landed / (1 - fee)) : NaN;
  const profit = suggested * (1 - fee) - landed, margin = suggested > 0 ? profit / suggested * 100 : NaN;
  let warning = "概算です。人件費・税金・固定手数料などは別途考慮してください。";
  if (spool <= 0) warning = "スプール総重量は1g以上を入力してください。";
  else if (life <= 0) warning = "想定使用可能時間は1時間以上を入力してください。";
  else if (failureInput >= 100) warning = "失敗率は100%未満を入力してください（計算上99%として扱います）。";
  else if (feeInput >= 100) warning = "販売手数料率は100%未満を入力してください（計算上99%として扱います）。";
  else if (targetInput > 95) warning = "目標利益率は95%以下を入力してください（計算上95%として扱います）。";
  else if (denominator <= 0) warning = "手数料率と目標利益率の合計が100%以上のため、価格を計算できません。";
  return { filament, electricity, depreciation, other, base, production, packaging, shipping, landed, suggested, breakEven, profit, margin, feeCost: suggested * fee, warning };
}
const sections = [
  { id: "material", n: "01", title: "材料", subtitle: "MATERIAL", detail: "素材と使用量" },
  { id: "machine", n: "02", title: "製造", subtitle: "MACHINE", detail: "時間・電力・機材" },
  { id: "selling", n: "03", title: "販売", subtitle: "SELLING", detail: "配送と利益の条件" }
];
function Field({ field, value, onChange }) {
  return <label className="field" htmlFor={field.id}><span className="field-label">{field.title}</span><span className="input-shell"><input id={field.id} type="number" min="0" step={field.step} inputMode="decimal" value={value} onChange={e => onChange(field.id, e.target.value)} /><span>{field.unit}</span></span>{field.note && <small>{field.note}</small>}</label>;
}
function App() {
  const [values, setValues] = useState(defaults);
  const [active, setActive] = useState("material");
  const [copied, setCopied] = useState("");
  const [licenseToken, setLicenseToken] = useState("");
  const [proActive, setProActive] = useState(false);
  const [proMessage, setProMessage] = useState("");
  const [proBusy, setProBusy] = useState(false);
  const [savedConditions, setSavedConditions] = useState([]);
  const [conditionName, setConditionName] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [orderQuantity, setOrderQuantity] = useState(10);
  const [freeQuantity, setFreeQuantity] = useState(1);
  const [orderSalePrice, setOrderSalePrice] = useState(0);
  const [filamentOptions, setFilamentOptions] = useState([{ name: "PLA A", price: 2500, weight: 1000 }, { name: "PLA B", price: 3200, weight: 1000 }]);
  const [batchRows, setBatchRows] = useState([{ id: 1, name: "商品A", grams: 80, hours: 5, quantity: 1 }]);
  const reduced = useReducedMotion();
  const result = useMemo(() => calculate(values), [values]);
  const update = (id, value) => setValues(old => ({ ...old, [id]: value }));
  const goSection = id => setActive(id);
  const saveCondition = () => {
    if (!proActive) return;
    const name = conditionName.trim();
    if (!name) { setProMessage("保存名を入力してください。"); return; }
    const item = { id: crypto.randomUUID(), name, values: { ...values }, savedAt: new Date().toISOString() };
    const next = [...savedConditions, item].slice(-20); setSavedConditions(next);
    window.localStorage.setItem("formcost_saved_conditions", JSON.stringify(next)); setConditionName(""); setProMessage("計算条件をこのブラウザに保存しました。");
  };
  const loadCondition = () => { if (!proActive || !selectedCondition) return; const item = savedConditions.find(x => x.id === selectedCondition); if (item) { setValues({ ...defaults, ...item.values }); setProMessage("保存した計算条件を呼び出しました。"); } };
  const addFilament = () => { if (filamentOptions.length < 10) setFilamentOptions(old => [...old, { name: "フィラメント " + (old.length + 1), price: 2500, weight: 1000 }]); };
  const updateFilament = (index, key, value) => setFilamentOptions(old => old.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const orderUnitPrice = orderSalePrice > 0 ? Number(orderSalePrice) : (Number.isFinite(result.suggested) ? result.suggested : 0);
  const orderCost = result.landed * Math.max(0, Number(orderQuantity) || 0);
  const orderRevenue = orderUnitPrice * Math.max(0, Number(orderQuantity) || 0);
  const orderFee = orderRevenue * Math.min(99, num(values.feeRate)) / 100;
  const orderProfit = orderRevenue - orderCost - orderFee;
  const compareFilament = item => { const weight = Math.max(0, Number(item.weight) || 0); const price = Math.max(0, Number(item.price) || 0); return { perGram: weight > 0 ? price / weight : NaN, usedCost: weight > 0 ? price / weight * num(values.usedGrams) : NaN }; };
  const updateBatchRow = (id, key, value) => setBatchRows(rows => rows.map(row => row.id === id ? { ...row, [key]: value } : row));
  const addBatchRow = () => setBatchRows(rows => rows.length < 20 ? [...rows, { id: Date.now(), name: "商品" + String.fromCharCode(65 + rows.length), grams: num(values.usedGrams), hours: num(values.printHours), quantity: 1 }] : rows);
  const batchResults = batchRows.map(row => {
    const calc = calculate({ ...values, usedGrams: num(row.grams), printHours: num(row.hours) });
    const quantity = Math.max(1, Math.min(100000, Number(row.quantity) || 1));
    const unitPrice = Number.isFinite(calc.suggested) ? calc.suggested : 0;
    const unitProfit = unitPrice * (1 - Math.min(99, num(values.feeRate)) / 100) - calc.landed;
    return { ...row, calc, quantity, unitPrice, totalCost: calc.landed * quantity, totalRevenue: unitPrice * quantity, totalProfit: unitProfit * quantity };
  });
  const exportBatchCsv = () => {
    if (!proActive || !batchResults.length) return;
    const rows = [["商品名","使用量(g)","印刷時間(h)","数量","1個あたり原価(円)","推奨販売価格(円)","注文原価合計(円)","売上合計(円)","利益合計(円)"], ...batchResults.map(r => [r.name,r.grams,r.hours,r.quantity,Math.round(r.calc.landed),r.unitPrice,Math.round(r.totalCost),Math.round(r.totalRevenue),Math.round(r.totalProfit)])];
    const csv = "\uFEFF" + rows.map(row => row.map(value => '"' + String(value ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "3d-print-batch-estimates.csv"; link.click(); URL.revokeObjectURL(url);
    setProMessage("一括見積もりをCSV出力しました。データはサーバーへ送信されません。");
  };
  useEffect(() => { try { const stored = JSON.parse(window.localStorage.getItem("formcost_saved_conditions") || "[]"); if (Array.isArray(stored)) setSavedConditions(stored.filter(x => x && typeof x.id === "string" && typeof x.name === "string" && x.values).slice(-20)); } catch { setSavedConditions([]); } }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const savedToken = window.localStorage.getItem("formcost_pro_license");
    const cleanUrl = () => {
      params.delete("pro");
      params.delete("session_id");
      const query = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (query ? "?" + query : "") + window.location.hash);
    };
    const verify = async token => {
      if (!token) return;
      try {
        const response = await fetch("/api/verify-pro", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ licenseToken: token })
        });
        const data = await response.json();
        if (!cancelled && response.ok) {
          setLicenseToken(token);
          setProActive(data.active === true);
          if (data.active !== true) window.localStorage.removeItem("formcost_pro_license");
        } else if (!cancelled) {
          // Keep the saved token during temporary API/configuration errors.
          // A failed verification response is not proof that the subscription ended.
          setProMessage("会員資格を確認できませんでした。時間をおいて再読み込みしてください。");
        }
      } catch {
        // Preserve the saved token on network errors so a temporary outage cannot
        // force the customer to purchase again.
        if (!cancelled) setProMessage("会員資格を確認できません。通信環境を確認してください。");
      }
    };
    if (params.get("pro") === "success" && sessionId) {
      setProBusy(true);
      fetch("/api/complete-checkout?session_id=" + encodeURIComponent(sessionId))
        .then(async response => {
          const data = await response.json();
          if (!response.ok || !data.licenseToken) throw new Error(data.error || "購入状況を確認できません。");
          window.localStorage.setItem("formcost_pro_license", data.licenseToken);
          if (!cancelled) {
            setLicenseToken(data.licenseToken);
            setProActive(true);
            setProMessage("Proの購入が完了しました。");
          }
        })
        .catch(error => { if (!cancelled) setProMessage(error.message || "購入状況を確認できません。"); })
        .finally(() => { cleanUrl(); if (!cancelled) setProBusy(false); });
    } else {
      if (params.get("pro") === "cancelled") setProMessage("購入手続きはキャンセルされました。");
      if (params.has("pro") || params.has("session_id")) cleanUrl();
      if (savedToken) verify(savedToken);
    }
    return () => { cancelled = true; };
  }, []);

  const startProCheckout = async () => {
    setProBusy(true); setProMessage("");
    try {
      const response = await fetch("/api/create-checkout-session", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "購入ページを開けませんでした。");
      window.location.assign(data.url);
    } catch (error) {
      setProMessage(error.message || "購入ページを開けませんでした。");
      setProBusy(false);
    }
  };

  const openBillingPortal = async () => {
    setProBusy(true); setProMessage("");
    try {
      const response = await fetch("/api/create-customer-portal", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ licenseToken })
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "契約管理ページを開けませんでした。");
      window.location.assign(data.url);
    } catch (error) {
      setProMessage(error.message || "契約管理ページを開けませんでした。");
      setProBusy(false);
    }
  };
  const costRows = [
    { label: "フィラメント", value: result.filament, color: "orange" },
    { label: "電気代", value: result.electricity, color: "blue" },
    { label: "機材償却", value: result.depreciation, color: "violet" },
    { label: "消耗品", value: result.other, color: "grey" },
    { label: "梱包・送料", value: result.packaging + result.shipping, color: "sand" }
  ];
  const totalForBar = costRows.reduce((sum, row) => sum + (Number.isFinite(row.value) ? Math.max(0, row.value) : 0), 0) || 1;
  const scenarios = [
    { label: "最低ライン", desc: "赤字を避ける", price: result.breakEven, style: "floor" },
    { label: "目標価格", desc: "設定した利益率", price: result.suggested, style: "target" },
    { label: "利益 +10pt", desc: "利益率を10pt上乗せ", price: (() => { const d = 1 - Math.min(99, num(values.feeRate))/100 - Math.min(95, num(values.targetMargin)+10)/100; return d > 0 ? Math.ceil(result.landed/d) : NaN; })(), style: "stretch" }
  ];
  const copy = async () => {
    const text = ["3Dプリンター原価・販売価格試算", `目標販売価格: ${money(result.suggested)}`, `原価（梱包・送料込み）: ${money(result.landed)}`, `利益額: ${money(result.profit)}`, `利益率: ${pct(result.margin)}`, `損益分岐価格: ${money(result.breakEven)}`, ...costRows.map(r => `${r.label}: ${money(r.value)}`)].join("\n");
    try { await navigator.clipboard.writeText(text); setCopied("コピーしました"); } catch { setCopied("ブラウザのコピー許可を確認してください"); }
  };
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
    <div className="app">
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="ページ先頭"><span className="mark-cube"><i /></span><span>FORM / COST<small>3D PRINT PRICING LAB</small></span></a>
        <div className="mast-meta"><span className="status-dot" /> FREE TOOL <span className="meta-divider" /> 日本語 / JPY</div>
        <div className="mast-actions"><a className="mast-link" href="/guide/">記事一覧 <span>↗</span></a><a className="mast-link" href="#method">計算ロジック <span>↗</span></a><button className="mast-link pro-action" onClick={proActive ? openBillingPortal : startProCheckout} disabled={proBusy}>{proBusy ? "確認中…" : proActive ? "Pro会員・契約管理 ↗" : "Pro 月額500円 ↗"}</button></div>
      </header>
      {proMessage && <div className="pro-notice" role="status">{proMessage}</div>}
      <main id="top">
        <section className="opening">
          <div className="opening-copy">
            <motion.div initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="overline"><span>PRICING WORKSPACE</span><span>NO. 001 — 2026</span></motion.div>
            <motion.h1 initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .06 }}>その造形に、<br /><em>値段の根拠</em>を。</motion.h1>
            <motion.p initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }}>材料・機材・販売条件をひとつのワークスペースに。数字を動かしながら、納得できる販売価格を見つける。</motion.p>
            <div className="opening-foot"><span className="big-index">01</span><span>INPUT → MODEL → PRICE</span><span className="short-rule" /></div>
          </div>
          <div className="opening-art" aria-label="積層造形を表現した図">
            <div className="art-grid" />
            <motion.div className="wire-cube" animate={reduced ? {} : { rotate: [0, 3, 0], y: [0, -5, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}><div className="cube-top" /><div className="cube-face face-left" /><div className="cube-face face-right" /><div className="layer-lines" /></motion.div>
            <div className="art-caption"><span>FIG. 01</span><span>LAYER BY LAYER</span></div>
            <div className="art-coordinate">X / 120<br />Y / 120<br />Z / 084</div>
          </div>
        </section>

        <section className="live-strip" aria-live="polite">
          <div className="live-label"><span className="pulse" /> LIVE ESTIMATE <small>入力に合わせて更新</small></div>
          <div className="live-price"><span>推奨販売価格</span><motion.strong key={String(result.suggested)} initial={reduced ? false : { opacity: .35, y: 8 }} animate={{ opacity: 1, y: 0 }}>{money(result.suggested)}</motion.strong></div>
          <div className="live-metric"><span>製造・販売原価</span><strong>{money(result.landed)}</strong></div>
          <div className="live-metric"><span>損益分岐価格</span><strong>{money(result.breakEven)}</strong></div>
          <div className="live-metric"><span>目標価格での利益</span><strong className="green">{money(result.profit)}</strong></div>
        </section>

        <section className="studio" id="calculator">
          <aside className="rail-nav">
            <div className="rail-title">CONFIGURE <span>3 STEPS</span></div>
            {sections.map((s, i) => <button key={s.id} className={active === s.id ? "rail-step active" : "rail-step"} onClick={() => goSection(s.id)} aria-current={active === s.id ? "step" : undefined}><span className="rail-num">{s.n}</span><span className="rail-text"><strong>{s.title}</strong><small>{s.subtitle}</small></span><span className="rail-arrow">{s.id === "selling" && !proActive ? "🔒" : active === s.id ? "↳" : "↗"}</span></button>)}
            <div className="rail-note"><span className="note-icon">↗</span><strong>数字はいつでも変更可能</strong><p>入力値はブラウザ内で計算され、サーバーへ送信されません。</p><button onClick={() => { setValues(defaults); setCopied("初期値に戻しました"); }}>↺ 初期値に戻す</button></div>
          </aside>
          <div className="config-panel">
            <div className="panel-heading"><div><span className="micro-label">CONFIGURATION / {sections.find(s => s.id === active).subtitle}</span><h2>{sections.find(s => s.id === active).title}<span>を設定する</span></h2><p>{sections.find(s => s.id === active).detail}に関する条件を入力してください。</p></div><span className="panel-count">{sections.find(s => s.id === active).n} <i>/ 03</i></span></div>
            <div className="step-progress"><span className={active === "material" ? "done" : "done"} /><span className={active !== "material" ? "done" : ""} /><span className={active === "selling" ? "done" : ""} /></div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={active} className="field-grid" initial={reduced ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={reduced ? {} : { opacity: 0, x: -8 }} transition={{ duration: .2 }}>
                fields.filter(f => f.group === active).map(f => <Field key={f.id} field={f} value={values[f.id]} onChange={update} />)
              </motion.div>
            </AnimatePresence>
            <div className="panel-bottom"><span><b>●</b> AUTO-CALCULATE ENABLED</span><div>{active !== "material" && <button className="secondary-btn" onClick={() => setActive(sections[sections.findIndex(s => s.id === active)-1].id)}>← 戻る</button>}{active !== "selling" ? <button className="next-btn" onClick={() => setActive(sections[sections.findIndex(s => s.id === active)+1].id)}>次の設定へ <span>→</span></button> : <button className="next-btn" onClick={() => document.getElementById("results").scrollIntoView({ behavior: reduced ? "auto" : "smooth" })}>価格を確認 <span>↓</span></button>}</div></div>
          </div>
          <aside className="model-panel">
            <div className="model-top"><span className="micro-label">COST MODEL / LIVE</span><span className="model-live"><i /> RUNNING</span></div>
            <div className="model-figure"><div className="ring ring-outer" /><div className="ring ring-inner" /><div className="model-center"><span>BASE COST</span><strong>{money(result.base)}</strong><small>製造ベース原価</small></div><div className="orbit-label label-a">01 / MATERIAL</div><div className="orbit-label label-b">02 / MACHINE</div><div className="orbit-label label-c">03 / SELLING</div></div>
            <div className="mini-breakdown"><div><span>材料</span><strong>{money(result.filament)}</strong></div><div><span>電気</span><strong>{money(result.electricity)}</strong></div><div><span>償却</span><strong>{money(result.depreciation)}</strong></div></div>
            <div className="model-footer"><span>CALCULATION STATUS</span><strong><i /> ALL VALUES UPDATED</strong></div>
          </aside>
        </section>

        <section className="pro-tools-section" id="pro-tools">
          <div className="results-heading"><div><span className="micro-label">PRO WORKSPACE</span><h2>見積もりから利益管理まで、ひとつのワークスペースで。</h2><p>複数商品の一括見積もりを中心に、材料比較・条件保存・注文利益の確認まで。日々の見積もり業務をまとめて効率化します。</p></div><span className="pro-pill">PRO / ¥500 MONTH</span></div>
          {!proActive ? <div className="pro-lock-panel pro-wide"><span className="micro-label">PRO WORKSPACE / UNLOCK</span><h3>見積もり業務を、もっと速く・正確に。</h3><p>複数商品の一括見積もりとCSV出力、フィラメント比較、計算条件の保存、注文全体の利益計算、手数料や送料を含む価格シミュレーションを利用できます。計算データはブラウザ内で処理し、保存条件もこのブラウザに保存します。</p><button className="next-btn" onClick={startProCheckout} disabled={proBusy}>Pro 月額500円で利用する <span>→</span></button></div> : <div className="pro-tools-grid">
            <article className="pro-tool-card pro-tool-wide batch-estimate-card">
              <span className="micro-label">01 / BATCH ESTIMATES</span><h3>複数商品の一括見積もり・CSV出力</h3><p>商品ごとの使用量・印刷時間・注文数を入力すると、原価・推奨販売価格・注文利益をまとめて計算します。最大20商品まで対応。</p>
              <div className="batch-estimate-table-wrap"><table className="batch-estimate-table"><thead><tr><th>商品名</th><th>使用量 (g)</th><th>印刷時間 (h)</th><th>数量</th><th>1個原価</th><th>推奨価格</th><th>注文利益</th><th></th></tr></thead><tbody>{batchResults.map(row=><tr key={row.id}><td><input aria-label="商品名" value={row.name} maxLength={60} onChange={e=>updateBatchRow(row.id,"name",e.target.value)}/></td><td><input aria-label="使用量" type="number" min="0" step="0.1" value={row.grams} onChange={e=>updateBatchRow(row.id,"grams",e.target.value)}/></td><td><input aria-label="印刷時間" type="number" min="0" step="0.1" value={row.hours} onChange={e=>updateBatchRow(row.id,"hours",e.target.value)}/></td><td><input aria-label="数量" type="number" min="1" max="100000" step="1" value={row.quantity} onChange={e=>updateBatchRow(row.id,"quantity",e.target.value)}/></td><td>{money(row.calc.landed)}</td><td>{money(row.unitPrice)}</td><td>{money(row.totalProfit)}</td><td><button className="remove-filament" onClick={()=>setBatchRows(rows=>rows.length>1?rows.filter(item=>item.id!==row.id):rows.map(item=>({...item,name:"",grams:0,hours:0,quantity:1})))} aria-label="商品行を削除">×</button></td></tr>)}</tbody></table></div>
              <div className="batch-estimate-actions"><button className="secondary-btn" onClick={addBatchRow} disabled={batchRows.length>=20}>＋ 商品を追加（{batchRows.length}/20）</button><button className="next-btn" onClick={exportBatchCsv}>CSVをダウンロード ↓</button></div>
              <div className="batch-estimate-summary"><div><span>注文原価合計</span><strong>{money(batchResults.reduce((sum,row)=>sum+row.totalCost,0))}</strong></div><div><span>注文売上合計</span><strong>{money(batchResults.reduce((sum,row)=>sum+row.totalRevenue,0))}</strong></div><div><span>注文利益合計</span><strong>{money(batchResults.reduce((sum,row)=>sum+row.totalProfit,0))}</strong></div></div>
              <small className="pro-privacy-note">計算とCSV作成はブラウザ内で行います。商品名や見積もりデータをサーバーへ送信しません。</small>
            </article>
            <article className="pro-tool-card pro-tool-wide">
              <span className="micro-label">02 / FILAMENT COMPARISON</span><h3>フィラメント最大10種類の比較</h3><p>価格とスプール重量から、1gあたりの価格と作品1個分の材料費を比較します。</p>
              <div className="filament-table-wrap"><table className="filament-table"><thead><tr><th>名称</th><th>購入価格（円）</th><th>重量（g）</th><th>円/g</th><th>作品分の材料費</th><th></th></tr></thead><tbody>{filamentOptions.map((item,index)=>{const calc=compareFilament(item);return <tr key={index}><td><input aria-label={"フィラメント名 "+(index+1)} value={item.name} maxLength={40} onChange={e=>updateFilament(index,"name",e.target.value)}/></td><td><input aria-label={"購入価格 "+(index+1)} type="number" min="0" value={item.price} onChange={e=>updateFilament(index,"price",Math.max(0,Number(e.target.value)||0))}/></td><td><input aria-label={"重量 "+(index+1)} type="number" min="1" value={item.weight} onChange={e=>updateFilament(index,"weight",Math.max(1,Number(e.target.value)||1))}/></td><td>{Number.isFinite(calc.perGram)?money(calc.perGram):"—"}</td><td>{Number.isFinite(calc.usedCost)?money(calc.usedCost):"—"}</td><td>{filamentOptions.length>2&&<button className="remove-filament" onClick={()=>setFilamentOptions(old=>old.filter((_,i)=>i!==index))} aria-label="削除">×</button>}</td></tr>})}</tbody></table></div>
              <button className="secondary-btn" onClick={addFilament} disabled={filamentOptions.length>=10}>＋ フィラメントを追加（{filamentOptions.length}/10）</button>
              <small className="pro-privacy-note">比較条件は画面内で計算され、サーバーへ送信されません。</small>
            </article>
<article className="pro-tool-card">
              <span className="micro-label">03 / SAVE CONDITIONS</span><h3>計算条件の保存・呼び出し</h3><p>条件はこのブラウザに最大20件保存されます。</p>
              <div className="pro-form-row"><input aria-label="保存名" value={conditionName} onChange={e=>setConditionName(e.target.value)} placeholder="例：PLA・標準設定" maxLength={60}/><button onClick={saveCondition}>保存</button></div>
              <div className="pro-form-row"><select aria-label="保存条件" value={selectedCondition} onChange={e=>setSelectedCondition(e.target.value)}><option value="">保存した条件を選択</option>{savedConditions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><button onClick={loadCondition} disabled={!selectedCondition}>呼び出す</button></div>
              <small className="pro-privacy-note">保存先：このブラウザのみ（最大20件）</small>
            </article>
            <article className="pro-tool-card">
              <span className="micro-label">04 / ORDER PROFIT</span><h3>複数個印刷・注文全体の利益</h3><p>現在の条件を使って、注文全体の原価・売上・利益を試算します。</p>
              <label>注文数量（個）<input type="number" min="1" max="100000" step="1" value={orderQuantity} onChange={e=>setOrderQuantity(Math.max(1,Math.min(100000,Number(e.target.value)||1)))}/></label>
              <label>販売単価（円・任意）<input type="number" min="0" step="1" value={orderSalePrice} onChange={e=>setOrderSalePrice(Math.max(0,Number(e.target.value)||0))}/></label>
              <div className="pro-result-list"><div><span>注文全体の売上</span><strong>{money(orderRevenue)}</strong></div><div><span>注文全体の原価</span><strong>{money(orderCost)}</strong></div><div><span>販売手数料</span><strong>{money(orderFee)}</strong></div><div className="pro-profit-row"><span>注文全体の利益</span><strong>{money(orderProfit)}</strong></div></div>
              <small className="pro-privacy-note">販売単価が0円の場合は目標販売価格を使用します。</small>
            </article>
                      </div>}
        </section>

        <section className="free-quantity-section" aria-labelledby="free-quantity-title"><div className="results-heading"><div><span className="micro-label">FREE TOOL / ORDER QUANTITY</span><h2 id="free-quantity-title">まとめて作ると、原価と利益はいくら？</h2><p>商品1種類の数量を指定して、注文全体の原価と利益を試算できます。複数商品をまとめた詳細見積もりとCSV出力はPro機能です。</p></div></div><div className="free-quantity-card"><label htmlFor="free-quantity">作る個数<input id="free-quantity" type="number" min="1" max="100000" step="1" value={freeQuantity} onChange={e=>setFreeQuantity(Math.max(1,Math.min(100000,Number(e.target.value)||1)))}/></label><div><span>注文全体の原価</span><strong>{money(result.landed * freeQuantity)}</strong></div><div><span>販売売上（推奨価格の場合）</span><strong>{money((Number.isFinite(result.suggested)?result.suggested:0) * freeQuantity)}</strong></div><div><span>注文全体の利益</span><strong>{money((Number.isFinite(result.suggested)?result.suggested*(1-Math.min(99,num(values.feeRate))/100)-result.landed:0) * freeQuantity)}</strong></div><div><span>損益分岐の売上</span><strong>{money(result.breakEven * freeQuantity)}</strong></div></div></section>

        <section className="results-section" id="results">
          <div className="results-heading"><div><span className="micro-label">OUTPUT / 01</span><h2>価格を、分解して考える。</h2><p>損益分岐価格と目標利益率から逆算した価格、コスト構造を確認できます。</p></div>{proActive ? <button className="copy-action" onClick={copy}>結果をコピー <span>↗</span></button> : <span className="pro-inline-tag">詳細な価格シナリオ比較はPro</span>}</div>
          <div className="results-grid">
            <div className="cost-map">
              <div className="subhead"><span>コスト構成</span><small>PER ITEM / ESTIMATE</small></div>
              <div className="stacked-bar">{costRows.map(row => <motion.div key={row.label} className={row.color} initial={false} animate={{ width: ((Number.isFinite(row.value) ? Math.max(0,row.value) : 0) / totalForBar * 100) + "%" }} />)}</div>
              <div className="legend">{costRows.map(row => <div key={row.label}><i className={row.color} /><span>{row.label}</span><strong>{money(row.value)}</strong></div>)}</div>
              <div className="cost-total"><span>原価合計（梱包・送料込み）</span><strong>{money(result.landed)}</strong></div><div className="cost-total"><span>損益分岐価格（手数料込み）</span><strong>{money(result.breakEven)}</strong></div>
              <p className="result-warning">{result.warning}</p>
            </div>
            <div className="price-scenarios">
              <div className="subhead"><span>価格シナリオ</span><small>COMPARE OPTIONS</small></div>
              {proActive ? <>{scenarios.map((s, i) => <motion.div key={s.label} className={"scenario " + s.style} whileHover={reduced ? {} : { x: 3 }}><div className="scenario-number">0{i+1}</div><div className="scenario-copy"><strong>{s.label}</strong><small>{s.desc}</small></div><strong className="scenario-price">{money(s.price)}</strong></motion.div>)}<div className="profit-callout"><span>目標価格での利益</span><strong>{money(result.profit)}</strong><small>販売利益率 {pct(result.margin)} · 手数料 {money(result.feeCost)}</small></div></> : <div className="pro-lock-panel"><span className="micro-label">PRO FEATURE</span><h3>価格シミュレーション</h3><p>販売手数料・送料・目標利益率を考慮した販売価格と利益の試算はPro専用です。</p><button className="secondary-btn" onClick={startProCheckout}>Proを利用する ↗</button></div>}
            </div>
          </div>
        </section>

        <section className="method" id="method"><div className="method-head"><span className="micro-label">THE LOGIC BEHIND THE NUMBER</span><h2>計算の仕組み</h2><p>透明な計算式で、価格設定の根拠を確認できます。</p></div><div className="logic-steps"><article><span>01</span><div><h3>製造ベース原価</h3><p>フィラメント代・電気代・プリンター償却費・その他消耗品を合算。</p><code>材料 + 電気 + 償却 + 消耗品</code></div></article><article><span>02</span><div><h3>失敗率・販売関連費用</h3><p>印刷失敗を見込み、梱包費と送料を加算します。</p><code>製造ベース原価 ÷ (1 − 失敗率)</code></div></article><article><span>03</span><div><h3>目標利益率から逆算</h3><p>販売手数料と目標利益率を差し引いた割合で原価を割ります。</p><code>原価 ÷ (1 − 手数料率 − 目標利益率)</code></div></article></div><div className="method-foot"><span>FORM / COST — PRICING TOOL</span><span>人件費・税金・固定出品料・返品費などは含まれません。</span></div></section>
      </main>
      <footer><a className="wordmark" href="#top"><span className="mark-cube"><i /></span><span>FORM / COST<small>3D PRINT PRICING LAB</small></span></a><span>つくることに、価格の根拠を。</span><a href="/guide/">記事一覧 ↗</a><a href="#calculator">上へ戻る ↑</a></footer>
      {copied && <motion.div className="toast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{copied}</motion.div>}
    </div>
  </MotionConfig>;
}
createRoot(document.getElementById("root")).render(<App />);

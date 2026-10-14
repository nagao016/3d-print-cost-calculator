import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, MotionConfig, useReducedMotion } from "motion/react";
import "./styles.css";

const fields = [
  { group: "材料", title: "フィラメント購入価格", id: "filamentPrice", unit: "円", value: 2500, step: 1, hint: "スプール1個の購入価格" },
  { group: "材料", title: "スプール総重量", id: "spoolWeight", unit: "g", value: 1000, step: 1 },
  { group: "材料", title: "作品1個の使用量", id: "usedGrams", unit: "g", value: 80, step: 0.1 },
  { group: "印刷・機材", title: "印刷時間", id: "printHours", unit: "時間", value: 5, step: 0.1 },
  { group: "印刷・機材", title: "消費電力", id: "powerWatts", unit: "W", value: 150, step: 1, hint: "平均消費電力の目安" },
  { group: "印刷・機材", title: "電気料金単価", id: "electricityRate", unit: "円/kWh", value: 31, step: 0.1 },
  { group: "印刷・機材", title: "プリンター購入価格", id: "printerPrice", unit: "円", value: 60000, step: 1 },
  { group: "印刷・機材", title: "想定使用可能時間", id: "printerLifeHours", unit: "時間", value: 3000, step: 1 },
  { group: "印刷・機材", title: "印刷失敗率", id: "failureRate", unit: "%", value: 5, step: 1 },
  { group: "印刷・機材", title: "その他消耗品費", id: "otherCost", unit: "円/個", value: 20, step: 1 },
  { group: "販売条件", title: "梱包費", id: "packagingCost", unit: "円/個", value: 80, step: 1 },
  { group: "販売条件", title: "送料（出品者負担）", id: "shippingCost", unit: "円/個", value: 230, step: 1 },
  { group: "販売条件", title: "販売手数料率", id: "feeRate", unit: "%", value: 10, step: 0.1 },
  { group: "販売条件", title: "目標利益率", id: "targetMargin", unit: "%", value: 30, step: 1, hint: "販売価格に対する利益の割合" }
];

const defaults = Object.fromEntries(fields.map((f) => [f.id, f.value]));
const yen = (n) => Number.isFinite(n) ? Math.round(n).toLocaleString("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }) : "計算不可";
const pct = (n) => Number.isFinite(n) ? `${n.toFixed(1)}%` : "計算不可";
const val = (v) => Math.max(0, Number(v) || 0);

function calculate(v) {
  const spool = val(v.spoolWeight);
  const life = val(v.printerLifeHours);
  const failureInput = val(v.failureRate);
  const feeInput = val(v.feeRate);
  const targetInput = val(v.targetMargin);
  const failure = Math.min(99, failureInput) / 100;
  const fee = Math.min(99, feeInput) / 100;
  const target = Math.min(95, targetInput) / 100;
  const filament = spool > 0 ? val(v.filamentPrice) / spool * val(v.usedGrams) : NaN;
  const electricity = val(v.printHours) * val(v.powerWatts) / 1000 * val(v.electricityRate);
  const depreciation = life > 0 ? val(v.printerPrice) / life * val(v.printHours) : NaN;
  const other = val(v.otherCost);
  const base = filament + electricity + depreciation + other;
  const production = base / (1 - failure);
  const packaging = val(v.packagingCost);
  const shipping = val(v.shippingCost);
  const landed = production + packaging + shipping;
  const denominator = 1 - fee - target;
  const suggestedExact = denominator > 0 ? landed / denominator : NaN;
  const breakEvenExact = fee < 1 ? landed / (1 - fee) : NaN;
  const suggested = Number.isFinite(suggestedExact) ? Math.ceil(suggestedExact) : NaN;
  const breakEven = Number.isFinite(breakEvenExact) ? Math.ceil(breakEvenExact) : NaN;
  const profit = suggested * (1 - fee) - landed;
  const margin = suggested > 0 ? profit / suggested * 100 : NaN;
  let warning = "販売価格は1円単位で切り上げています。人件費・税金・固定手数料などは別途考慮してください。";
  if (spool <= 0) warning = "スプール総重量は1g以上を入力してください。";
  else if (life <= 0) warning = "想定使用可能時間は1時間以上を入力してください。";
  else if (failureInput >= 100) warning = "失敗率は100%未満を入力してください（計算上99%として扱います）。";
  else if (feeInput >= 100) warning = "販売手数料率は100%未満を入力してください（計算上99%として扱います）。";
  else if (targetInput > 95) warning = "目標利益率は95%以下を入力してください（計算上95%として扱います）。";
  else if (denominator <= 0) warning = "販売手数料率と目標利益率の合計が100%以上のため、販売価格を計算できません。";
  return { filament, electricity, depreciation, other, base, landed, suggested, breakEven, profit, margin, feeCost: suggested * fee, warning };
}

function Field({ field, value, onChange }) {
  return <label className="field" htmlFor={field.id}>
    <span className="field-title">{field.title}</span>
    <span className="input-wrap">
      <input id={field.id} type="number" min="0" step={field.step} value={value} onChange={(e) => onChange(field.id, e.target.value)} inputMode="decimal" />
      <span className="unit">{field.unit}</span>
    </span>
    {field.hint && <span className="hint">{field.hint}</span>}
  </label>;
}

function App() {
  const [values, setValues] = useState(defaults);
  const [copyStatus, setCopyStatus] = useState("");
  const result = useMemo(() => calculate(values), [values]);
  const reducedMotion = useReducedMotion();
  const groups = ["材料", "印刷・機材", "販売条件"];
  const update = (id, value) => setValues((old) => ({ ...old, [id]: value }));
  const copyResult = async () => {
    const lines = [
      "3Dプリンター原価・販売価格計算結果",
      `目標利益率での販売価格: ${yen(result.suggested)}`,
      `梱包・送料を含む原価: ${yen(result.landed)}`,
      `販売時の利益額: ${yen(result.profit)}`,
      `販売利益率: ${pct(result.margin)}`,
      `フィラメント代: ${yen(result.filament)}`,
      `電気代: ${yen(result.electricity)}`,
      `プリンター償却費: ${yen(result.depreciation)}`,
      `損益分岐価格: ${yen(result.breakEven)}`
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setCopyStatus("計算結果をコピーしました。");
    } catch {
      setCopyStatus("自動コピーできませんでした。ブラウザのコピー許可を確認してください。");
    }
  };
  return <MotionConfig reducedMotion="user">
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ページ先頭へ"><span className="brand-mark">3D</span><span>PRINT COST <small>CALCULATOR</small></span></a>
        <nav aria-label="メインナビゲーション"><a href="#calculator">原価計算</a><a href="#method">計算方法</a></nav>
      </header>
      <main id="top">
        <section className="hero">
          <motion.div className="hero-copy" initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <span className="eyebrow"><span className="live-dot" /> FREE CALCULATOR</span>
            <h1>原価がわかると、<br /><em>価格に自信</em>が持てる。</h1>
            <p>材料費から販売手数料まで。3Dプリント作品1個あたりのコストと、目標利益率に合わせた販売価格をかんたん試算。</p>
            <a className="primary-cta" href="#calculator">無料で原価を計算する <span aria-hidden="true">↓</span></a>
            <div className="hero-proof"><span>✓ 登録不要</span><span>✓ ブラウザ内で計算</span><span>✓ 無料で利用可能</span></div>
          </motion.div>
          <div className="hero-visual" aria-hidden="true">
            <div className="visual-glow" />
            <div className="printer"><div className="printer-top"><span /><span /><span /></div><div className="printer-frame"><div className="rail" /><div className="print-head" /><div className="print-object"><i /><i /><i /><i /><i /></div><div className="build-plate" /></div><div className="printer-base" /></div>
            <div className="floating-chip chip-cost"><span>製造原価</span><strong>見える化</strong></div>
            <div className="floating-chip chip-price"><span>目標利益率</span><strong>価格を逆算</strong></div>
          </div>
        </section>
        <section className="trust-row" aria-label="サービスの特徴"><div><span className="trust-icon">01</span><span><strong>入力するだけ</strong><small>難しい設定は不要</small></span></div><div><span className="trust-icon">02</span><span><strong>費用をまとめて計算</strong><small>材料・電気・機材・販売費</small></span></div><div><span className="trust-icon">03</span><span><strong>条件を比較できる</strong><small>数字を変えてすぐ試算</small></span></div></section>
        <section className="calculator-section" id="calculator">
          <div className="section-intro"><span className="eyebrow">COST ESTIMATOR</span><h2>作品1個あたりの原価を計算</h2><p>わかる範囲で入力してください。数値を変えると結果がすぐに更新されます。</p></div>
          <div className="workspace">
            <div className="input-column">
              {groups.map((group, index) => <motion.section className="input-card" key={group} initial={reducedMotion ? false : { opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.3, delay: reducedMotion ? 0 : index * 0.06 }}>
                <div className="card-heading"><span className="step-number">0{index + 1}</span><div><h3>{group}</h3><p>{["作品に使う材料の量と購入単価","印刷条件と機材の使用コスト","販売時に発生する費用と利益"][index]}</p></div></div>
                <div className="field-grid">{fields.filter((f) => f.group === group).map((field) => <Field key={field.id} field={field} value={values[field.id]} onChange={update} />)}</div>
              </motion.section>)}
              <div className="form-actions"><button className="text-button" type="button" onClick={() => { setValues(defaults); setCopyStatus("初期値に戻しました。"); }}>↺ 初期値に戻す</button><span>入力内容はサーバーに送信されません</span></div>
            </div>
            <motion.aside className="result-card" aria-live="polite" key="result-card" initial={reducedMotion ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
              <div className="result-top"><span className="eyebrow">YOUR ESTIMATE</span><span className="result-badge">作品1個あたり</span></div>
              <p className="result-label">目標利益率での販売価格</p>
              <motion.div className="big-price" key={String(result.suggested)} initial={reducedMotion ? false : { opacity: 0.6, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>{yen(result.suggested)}</motion.div>
              <p className="result-sub">販売手数料・目標利益率を考慮した概算</p>
              <div className="result-highlights"><div><span>原価（梱包・送料込み）</span><strong>{yen(result.landed)}</strong></div><div><span>販売時の利益額</span><strong className="profit-value">{yen(result.profit)}</strong></div><div><span>販売利益率</span><strong>{pct(result.margin)}</strong></div></div>
              <div className="cost-breakdown"><h3>費用の内訳</h3>{[["フィラメント代",result.filament],["電気代",result.electricity],["プリンター償却費",result.depreciation],["その他消耗品費",result.other],["販売手数料（提案価格）",result.feeCost],["損益分岐となる販売価格",result.breakEven]].map(([label, amount]) => <div className="breakdown-row" key={label}><span>{label}</span><strong>{yen(amount)}</strong></div>)}</div>
              <button className="copy-button" type="button" onClick={copyResult}><span aria-hidden="true">▣</span> 計算結果をコピー</button>
              <p className="copy-status" role="status">{copyStatus}</p>
              <p className="warning">{result.warning}</p>
            </motion.aside>
          </div>
        </section>
        <section className="method-section" id="method"><span className="eyebrow">HOW IT WORKS</span><h2>価格の根拠を、わかりやすく。</h2><div className="method-grid"><article><span>01</span><h3>材料費</h3><p>フィラメントの購入価格と、作品1個に使用する重量から計算します。</p><code>購入価格 ÷ 総重量 × 使用量</code></article><article><span>02</span><h3>製造コスト</h3><p>電気代・機材費・消耗品費を加算し、印刷失敗率も考慮します。</p><code>材料費 + 電気代 + 機材費</code></article><article><span>03</span><h3>販売価格</h3><p>梱包費・送料・販売手数料を考慮して目標利益率から逆算します。</p><code>原価 ÷ (1 − 手数料率 − 利益率)</code></article></div><p className="fine-print">※ 概算ツールです。人件費、税金、固定出品料、返品・再発送費などは含まれません。実際の販売前にご自身の条件でご確認ください。</p></section>
      </main>
      <footer><a className="brand footer-brand" href="#top"><span className="brand-mark">3D</span><span>PRINT COST <small>CALCULATOR</small></span></a><span>シンプルに、根拠のある価格設定を。</span></footer>
    </div>
  </MotionConfig>;
}

createRoot(document.getElementById("root")).render(<App />);

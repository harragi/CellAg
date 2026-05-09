import { useMemo, useState } from "react";
import {
  simulate,
  sensitivity,
  makeVerdict,
  DEFAULT_PARAMS,
  type BenchParams,
  type SimResult,
  type SimPoint,
} from "../lib/bench-model.ts";

export type BenchInit = {
  id: string;
  label: string;
  rationale: string;
  components: BenchParams;
};

const SLIDER_DEFS: {
  key: keyof BenchParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}[] = [
  { key: "glucose_mM",    label: "Glucose",    min: 2,    max: 60,  step: 0.5, unit: "mM" },
  { key: "glutamine_mM",  label: "Glutamine",  min: 0,    max: 12,  step: 0.1, unit: "mM" },
  { key: "asparagine_mM", label: "Asparagine", min: 0,    max: 18,  step: 0.5, unit: "mM" },
  { key: "insulin_mg_L",  label: "Insulin",    min: 0,    max: 30,  step: 0.5, unit: "mg/L" },
  { key: "igf1_ng_mL",    label: "IGF-1",      min: 0,    max: 150, step: 1,   unit: "ng/mL" },
  { key: "selenium_nM",   label: "Selenium",   min: 0,    max: 120, step: 1,   unit: "nM" },
  { key: "naCl_mM",       label: "NaCl",       min: 50,   max: 220, step: 1,   unit: "mM" },
  { key: "initial_vcd_million_per_ml", label: "Initial VCD", min: 0.1, max: 4, step: 0.05, unit: "×10⁶/mL" },
  { key: "time_horizon_hours", label: "Horizon", min: 24, max: 240, step: 6, unit: "h" },
];

export function BenchCard({
  data,
  onSendToChat,
}: {
  data: BenchInit;
  onSendToChat: (text: string) => void;
}) {
  const [params, setParams] = useState<BenchParams>({ ...DEFAULT_PARAMS, ...data.components });
  const result = useMemo(() => simulate(params), [params]);
  const sens = useMemo(() => sensitivity(params), [params]);
  const verdict = useMemo(() => makeVerdict(result), [result]);

  const update = (key: keyof BenchParams, value: number) =>
    setParams((p) => ({ ...p, [key]: value }));
  const reset = () => setParams({ ...DEFAULT_PARAMS, ...data.components });

  const askAgent = () => {
    const lines = SLIDER_DEFS.map((d) => `${d.label}: ${formatValue(params[d.key], d.unit)}`).join(", ");
    const summary = `Tweaked the ${data.label} bench: ${lines}. Predicted final VCD ${result.finalVCD.toFixed(2)} ×10⁶/mL, peak μ ${result.muPeak.toFixed(3)} hr⁻¹, max lactate ${result.maxLac.toFixed(1)} mM, max NH₃ ${result.maxNH3.toFixed(2)} mM, Y_Lac/Glc ${result.yLacGlc.toFixed(2)}. Verdict: ${verdict.worst}. What's your read — should we apply this composition or push another knob?`;
    onSendToChat(summary);
  };

  return (
    <div className="bench-card">
      <div className="bench-head">
        <span className="bench-tag">CHO bench</span>
        <span className="bench-label">{data.label}</span>
        <span className={`bench-verdict ${verdict.worst}`}>{verdict.worst}</span>
      </div>

      {data.rationale ? <div className="bench-rationale">{data.rationale}</div> : null}

      <div className="bench-metrics">
        <Metric label="μ peak"        value={result.muPeak.toFixed(4)}  units="hr⁻¹" />
        <Metric label="t_d"           value={result.muPeak > 0 ? result.tDouble.toFixed(0) : "—"} units="hr" />
        <Metric label="Final VCD"     value={result.finalVCD.toFixed(2)} units="×10⁶/mL" />
        <Metric label="Max lactate"   value={result.maxLac.toFixed(1)} units="mM" />
        <Metric label="Max NH₃"       value={result.maxNH3.toFixed(2)} units="mM" />
        <Metric label="Y_Lac/Glc"     value={result.yLacGlc.toFixed(2)} units="mol/mol" />
      </div>

      <div className="bench-grid">
        <div className="bench-controls">
          {SLIDER_DEFS.map((d) => (
            <Slider
              key={d.key}
              def={d}
              value={params[d.key]}
              onChange={(v) => update(d.key, v)}
            />
          ))}
          <div className="bench-actions">
            <button className="ghost" onClick={reset}>reset to agent's values</button>
            <button className="primary" onClick={askAgent}>ask agent about this run</button>
          </div>
        </div>

        <div className="bench-charts">
          <ChartCard title="Growth (VCD)">
            <LineChart series={result.series} keys={[{ k: "vcd", color: "var(--c-bench-vcd)" }]} />
          </ChartCard>
          <ChartCard title="Substrates">
            <LineChart series={result.series} keys={[
              { k: "glc", color: "var(--c-bench-glc)" },
              { k: "gln", color: "var(--c-bench-gln)" },
            ]} />
            <Legend items={[
              { color: "var(--c-bench-glc)", label: "Glucose" },
              { color: "var(--c-bench-gln)", label: "Glutamine" },
            ]} />
          </ChartCard>
          <ChartCard title="Byproducts">
            <ByproductsChart series={result.series} />
            <Legend items={[
              { color: "var(--c-bench-lac)", label: "Lactate (left)" },
              { color: "var(--c-bench-nh3)", label: "NH₃" },
              { color: "var(--c-bench-osm)", label: "Osmolarity (right)" },
            ]} />
          </ChartCard>
          <ChartCard title="Sensitivity (±20%)">
            <SensitivityChart rows={sens} />
          </ChartCard>
        </div>
      </div>

      <ul className="bench-issues">
        {verdict.issues.map((i, idx) => (
          <li key={idx} className={`issue ${i.sev}`}>{i.msg}</li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value, units }: { label: string; value: string; units: string }) {
  return (
    <div className="bench-metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-units">{units}</div>
    </div>
  );
}

function Slider({
  def,
  value,
  onChange,
}: {
  def: { key: keyof BenchParams; label: string; min: number; max: number; step: number; unit: string };
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="bench-slider">
      <div className="slider-row">
        <label>{def.label}</label>
        <span className="slider-value">{formatValue(value, def.unit)}</span>
      </div>
      <input
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bench-chart-card">
      <div className="bench-chart-title">{title}</div>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="bench-legend">
      {items.map((it, i) => (
        <span key={i}>
          <span className="dot" style={{ background: it.color }} /> {it.label}
        </span>
      ))}
    </div>
  );
}

const W = 360;
const H = 130;
const PAD_L = 30;
const PAD_R = 8;
const PAD_T = 6;
const PAD_B = 18;

function LineChart({
  series,
  keys,
}: {
  series: SimPoint[];
  keys: { k: keyof SimPoint; color: string }[];
}) {
  if (series.length < 2) return <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} />;
  const tMax = series[series.length - 1]!.t;
  const yMax = Math.max(0.1, ...keys.flatMap((sp) => series.map((s) => s[sp.k] as number))) * 1.1;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Grid tMax={tMax} yMax={yMax} />
      {keys.map((sp, i) => (
        <polyline
          key={i}
          fill="none"
          stroke={sp.color}
          strokeWidth={1.6}
          points={series.map((s) => `${xCoord(s.t, tMax)},${yCoord(s[sp.k] as number, yMax)}`).join(" ")}
        />
      ))}
    </svg>
  );
}

function ByproductsChart({ series }: { series: SimPoint[] }) {
  if (series.length < 2) return <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} />;
  const tMax = series[series.length - 1]!.t;
  const lacMax = Math.max(60, ...series.map((s) => s.lac));
  const nh3Max = Math.max(8, ...series.map((s) => s.nh3));
  const osmMax = Math.max(450, ...series.map((s) => s.osm));
  const lacWarnY = yCoord(40, lacMax);
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Grid tMax={tMax} yMax={lacMax} />
      <line x1={PAD_L} y1={lacWarnY} x2={W - PAD_R} y2={lacWarnY} stroke="var(--warn)" strokeWidth={0.6} strokeDasharray="2,3" opacity={0.7} />
      <polyline
        fill="none" stroke="var(--c-bench-lac)" strokeWidth={1.6}
        points={series.map((s) => `${xCoord(s.t, tMax)},${yCoord(s.lac, lacMax)}`).join(" ")}
      />
      <polyline
        fill="none" stroke="var(--c-bench-nh3)" strokeWidth={1.6}
        points={series.map((s) => `${xCoord(s.t, tMax)},${yCoord(s.nh3, nh3Max)}`).join(" ")}
      />
      <polyline
        fill="none" stroke="var(--c-bench-osm)" strokeWidth={1.4} opacity={0.7}
        points={series.map((s) => `${xCoord(s.t, tMax)},${yCoord(s.osm, osmMax)}`).join(" ")}
      />
    </svg>
  );
}

function Grid({ tMax, yMax }: { tMax: number; yMax: number }) {
  const xTicks = 4;
  const yTicks = 3;
  const elements: React.ReactNode[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const y = yCoord((yMax * i) / yTicks, yMax);
    elements.push(<line key={`yg${i}`} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--line-soft)" strokeWidth={0.5} />);
    elements.push(
      <text key={`yt${i}`} x={PAD_L - 4} y={y + 3} fontSize={9} fill="var(--muted)" textAnchor="end" fontFamily="ui-monospace,Menlo,monospace">
        {fmtAxis((yMax * i) / yTicks)}
      </text>
    );
  }
  for (let i = 0; i <= xTicks; i++) {
    const x = xCoord((tMax * i) / xTicks, tMax);
    elements.push(
      <text key={`xt${i}`} x={x} y={H - 4} fontSize={9} fill="var(--muted)" textAnchor="middle" fontFamily="ui-monospace,Menlo,monospace">
        {Math.round((tMax * i) / xTicks)}h
      </text>
    );
  }
  return <>{elements}</>;
}

function xCoord(t: number, tMax: number): number {
  return PAD_L + (W - PAD_L - PAD_R) * (t / tMax);
}
function yCoord(v: number, yMax: number): number {
  return PAD_T + (H - PAD_T - PAD_B) * (1 - Math.min(1, Math.max(0, v / yMax)));
}
function fmtAxis(v: number): string {
  return v < 10 ? v.toFixed(1) : v.toFixed(0);
}

function SensitivityChart({ rows }: { rows: { name: string; up: number; dn: number }[] }) {
  const W2 = 360;
  const H2 = 160;
  const PAD_L2 = 80;
  const PAD_R2 = 6;
  const PAD_T2 = 8;
  const PAD_B2 = 18;
  const innerW = W2 - PAD_L2 - PAD_R2;
  const innerH = H2 - PAD_T2 - PAD_B2;
  const max = Math.max(2, ...rows.flatMap((r) => [Math.abs(r.up), Math.abs(r.dn)]));
  const zeroX = PAD_L2 + innerW / 2;
  const rowH = innerH / rows.length;

  return (
    <svg width="100%" height={H2} viewBox={`0 0 ${W2} ${H2}`} preserveAspectRatio="none">
      <line x1={zeroX} y1={PAD_T2} x2={zeroX} y2={H2 - PAD_B2} stroke="var(--line)" strokeWidth={1} />
      {[-max, -max / 2, 0, max / 2, max].map((pct, i) => {
        const x = zeroX + (innerW / 2) * (pct / max);
        return (
          <text key={i} x={x} y={H2 - 4} fontSize={9} fill="var(--muted)" textAnchor="middle" fontFamily="ui-monospace,Menlo,monospace">
            {pct >= 0 ? `+${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`}
          </text>
        );
      })}
      {rows.map((r, i) => {
        const cy = PAD_T2 + rowH * (i + 0.5);
        const upWidth = (innerW / 2) * (r.up / max);
        const dnWidth = (innerW / 2) * (r.dn / max);
        const upColor = r.up >= 0 ? "var(--ok)" : "var(--bad)";
        const dnColor = r.dn >= 0 ? "var(--ok)" : "var(--bad)";
        return (
          <g key={r.name}>
            <text x={PAD_L2 - 6} y={cy + 3} fontSize={10} fill="var(--fg)" textAnchor="end">{r.name}</text>
            <rect x={zeroX + Math.min(0, upWidth)} y={cy - rowH * 0.32} width={Math.abs(upWidth)} height={rowH * 0.27} fill={upColor} opacity={0.85} rx={2} />
            <rect x={zeroX + Math.min(0, dnWidth)} y={cy + rowH * 0.05} width={Math.abs(dnWidth)} height={rowH * 0.27} fill={dnColor} opacity={0.55} rx={2} />
          </g>
        );
      })}
    </svg>
  );
}

function formatValue(v: number, unit: string): string {
  const fixed = unit === "h" || unit === "ng/mL" || unit === "nM" || unit === "mg/L"
    ? v.toFixed(0)
    : v.toFixed(1);
  return `${fixed} ${unit}`;
}

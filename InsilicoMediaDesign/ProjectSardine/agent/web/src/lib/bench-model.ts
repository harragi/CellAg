/**
 * CHO media bench — Monod-style ODE simulator with multiplicative inhibition.
 * Same model logic as cho-bench.html, ported to TypeScript and pure-functional.
 *
 * Coefficients drawn from CHO-K1 mAb-platform literature (Mulukutla, Yang &
 * Butler, Schmelzer & Miller, Chen & Harcum, Chevallier). Triage tool — not
 * a substitute for an iCHO FBA run.
 */

export type BenchParams = {
  glucose_mM: number;
  glutamine_mM: number;
  asparagine_mM: number;
  insulin_mg_L: number;
  igf1_ng_mL: number;
  selenium_nM: number;
  naCl_mM: number;
  initial_vcd_million_per_ml: number;
  time_horizon_hours: number;
};

export type SimPoint = {
  t: number;
  vcd: number;
  glc: number;
  gln: number;
  lac: number;
  nh3: number;
  osm: number;
  mu: number;
  viab: number;
};

export type SimResult = {
  series: SimPoint[];
  muPeak: number;
  tDouble: number;
  finalVCD: number;
  maxLac: number;
  maxNH3: number;
  maxOsm: number;
  yLacGlc: number;
};

export type Verdict = {
  worst: "ok" | "warn" | "bad";
  issues: { sev: "ok" | "warn" | "bad"; msg: string }[];
};

export type SensitivityRow = { name: string; key: keyof BenchParams; up: number; dn: number };

const COEF = {
  muMax: 0.035,
  kGlc: 0.1,
  kGln: 0.05,
  kILac: 40,
  kINH3: 2.5,
  optOsm: 320,
  osmSigma: 80,
  qGlcMax: 0.6 / 24,
  qGlnMax: 0.15 / 24,
  yLacGlcMax: 1.8,
  yNH3Gln: 0.85,
  osmBaseline: 200,
  selKm: 8,
  insKm: 4,
  igfKm: 12,
  viabRecover: 0.001,
  viabDecay: 0.005,
  viabStressGate: 1.5,
};

export const DEFAULT_PARAMS: BenchParams = {
  glucose_mM: 25,
  glutamine_mM: 4,
  asparagine_mM: 5,
  insulin_mg_L: 10,
  igf1_ng_mL: 20,
  selenium_nM: 30,
  naCl_mM: 117,
  initial_vcd_million_per_ml: 0.5,
  time_horizon_hours: 96,
};

export function simulate(p: BenchParams): SimResult {
  const dt = 1; // hours
  const T = Math.round(p.time_horizon_hours);
  let vcd = p.initial_vcd_million_per_ml;
  let glc = p.glucose_mM;
  let gln = p.glutamine_mM;
  let asn = p.asparagine_mM;
  let lac = 0;
  let nh3 = 0;
  let viab = 1.0;

  const series: SimPoint[] = [];
  let muPeak = 0;
  let yLacGlcRunning = 0;

  for (let t = 0; t <= T; t++) {
    const fGlc = glc / (COEF.kGlc + glc);
    const effGln = gln + 0.5 * asn;
    const fGln = effGln / (COEF.kGln + effGln);

    const fIns = p.insulin_mg_L / (COEF.insKm + p.insulin_mg_L);
    const fIGF = p.igf1_ng_mL / (COEF.igfKm + p.igf1_ng_mL);
    const fGF = Math.max(fIns, fIGF);
    const fSel = p.selenium_nM / (COEF.selKm + p.selenium_nM);

    const osm = COEF.osmBaseline + p.naCl_mM * 1.86 + glc + lac + nh3 * 2;
    const fOsm =
      osm > COEF.optOsm
        ? Math.exp(-Math.pow((osm - COEF.optOsm) / COEF.osmSigma, 2))
        : 1.0;

    const fLac = COEF.kILac / (COEF.kILac + lac);
    const fNH3 = COEF.kINH3 / (COEF.kINH3 + nh3);

    const mu =
      COEF.muMax * fGlc * fGln * fGF * fSel * fOsm * fLac * fNH3 * viab;
    if (mu > muPeak) muPeak = mu;

    const yLacGlc = COEF.yLacGlcMax * (glc / (5 + glc));
    yLacGlcRunning = yLacGlc;

    const qGlc = COEF.qGlcMax * fGlc;
    const qGln = COEF.qGlnMax * fGln;
    const qLac = qGlc * yLacGlc;
    const qNH3 = qGln * COEF.yNH3Gln;

    series.push({ t, vcd, glc, gln, lac, nh3, osm, mu, viab });

    vcd = vcd * (1 + mu * dt);
    glc = Math.max(0, glc - qGlc * vcd * dt);
    const dGln = qGln * vcd * dt;
    if (gln > dGln) {
      gln -= dGln;
    } else {
      const remaining = dGln - gln;
      gln = 0;
      asn = Math.max(0, asn - remaining * 2);
    }
    if (glc < 1 && lac > 1) {
      lac = Math.max(0, lac - 0.3 * vcd * dt);
    } else {
      lac = lac + qLac * vcd * dt;
    }
    nh3 = nh3 + qNH3 * vcd * dt;

    const stress = (1 - fOsm) + (1 - fLac) + (1 - fNH3);
    if (stress > COEF.viabStressGate) {
      viab = Math.max(0, viab - COEF.viabDecay);
    } else {
      viab = Math.min(1, viab + COEF.viabRecover);
    }

    if (vcd < 0.01 || (mu < 0.0005 && t > 24)) break;
  }

  const last = series[series.length - 1]!;
  const tDouble = muPeak > 0 ? Math.log(2) / muPeak : Infinity;
  const maxLac = series.reduce((m, x) => Math.max(m, x.lac), 0);
  const maxNH3 = series.reduce((m, x) => Math.max(m, x.nh3), 0);
  const maxOsm = series.reduce((m, x) => Math.max(m, x.osm), 0);

  return {
    series,
    muPeak,
    tDouble,
    finalVCD: last.vcd,
    maxLac,
    maxNH3,
    maxOsm,
    yLacGlc: yLacGlcRunning,
  };
}

export function makeVerdict(r: SimResult): Verdict {
  const issues: Verdict["issues"] = [];

  if (r.maxLac > 50) {
    issues.push({
      sev: "bad",
      msg: `Lactate hit ${r.maxLac.toFixed(1)} mM — past the 40-mM Warburg-stress threshold.`,
    });
  } else if (r.maxLac > 35) {
    issues.push({
      sev: "warn",
      msg: `Lactate peaked at ${r.maxLac.toFixed(1)} mM — approaching the 40-mM band.`,
    });
  }

  if (r.maxNH3 > 5) {
    issues.push({
      sev: "bad",
      msg: `NH₃ peaked at ${r.maxNH3.toFixed(2)} mM — significant glycosylation/growth penalty (>5 mM).`,
    });
  } else if (r.maxNH3 > 3) {
    issues.push({
      sev: "warn",
      msg: `NH₃ peaked at ${r.maxNH3.toFixed(2)} mM — mild stress band (3–5 mM).`,
    });
  }

  if (r.maxOsm > 400) {
    issues.push({
      sev: "bad",
      msg: `Osmolarity peaked at ${r.maxOsm.toFixed(0)} mOsm/kg — significant inhibition above 400.`,
    });
  } else if (r.maxOsm > 360) {
    issues.push({
      sev: "warn",
      msg: `Osmolarity peaked at ${r.maxOsm.toFixed(0)} mOsm/kg — mild osmotic stress (360–400).`,
    });
  }

  if (r.yLacGlc > 1.6) {
    issues.push({
      sev: "warn",
      msg: `Y_Lac/Glc ${r.yLacGlc.toFixed(2)} — Warburg-like overflow metabolism.`,
    });
  }

  if (r.muPeak < 0.015) {
    issues.push({
      sev: "bad",
      msg: `Peak μ only ${r.muPeak.toFixed(3)} hr⁻¹ — culture is severely growth-limited.`,
    });
  }

  if (issues.length === 0) {
    issues.push({
      sev: "ok",
      msg: "No stress triggers crossed — culture stays within healthy bands across the full horizon.",
    });
  }

  const worst = issues.reduce<"ok" | "warn" | "bad">((w, i) => {
    if (i.sev === "bad") return "bad";
    if (i.sev === "warn" && w !== "bad") return "warn";
    return w;
  }, "ok");

  return { worst, issues };
}

const SENS_KNOBS: { key: keyof BenchParams; name: string }[] = [
  { key: "glucose_mM", name: "Glucose" },
  { key: "glutamine_mM", name: "Glutamine" },
  { key: "asparagine_mM", name: "Asparagine" },
  { key: "insulin_mg_L", name: "Insulin" },
  { key: "igf1_ng_mL", name: "IGF-1" },
  { key: "selenium_nM", name: "Selenium" },
  { key: "naCl_mM", name: "NaCl" },
];

export function sensitivity(state: BenchParams): SensitivityRow[] {
  const baseFinal = simulate(state).finalVCD;
  const rows: SensitivityRow[] = [];
  for (const { key, name } of SENS_KNOBS) {
    const upParams = { ...state, [key]: state[key] * 1.2 };
    const dnParams = { ...state, [key]: Math.max(0.01, state[key] * 0.8) };
    const upDelta = ((simulate(upParams).finalVCD - baseFinal) / baseFinal) * 100;
    const dnDelta = ((simulate(dnParams).finalVCD - baseFinal) / baseFinal) * 100;
    rows.push({ key, name, up: upDelta, dn: dnDelta });
  }
  return rows;
}

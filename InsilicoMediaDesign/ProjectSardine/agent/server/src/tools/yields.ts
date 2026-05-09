import { z } from "zod";
import { tool } from "@anthropic-ai/claude-agent-sdk";

/**
 * Compute CHO-style metabolic specific rates (q_X) and yield ratios from
 * a two-point time-course measurement.
 *
 * Standard formulas:
 *   μ                    = ln(VCD1 / VCD0) / Δt
 *   doubling_time        = ln(2) / μ
 *   IVCD (cell·time)     = (VCD1 - VCD0) / μ      [valid for exponential growth]
 *   q_S (consumption)    = (S0 - S1) / (IVCD · Δt)            [normalized below]
 *   q_P (production)     = (P1 - P0) / (IVCD · Δt)            [normalized below]
 *   Y_P/S                = q_P / q_S
 *
 * Units returned:
 *   μ in hr⁻¹
 *   doubling_time in hr
 *   q_X in mmol / 10⁹ cells / day  (CHO-industry convention)
 *
 * VCD is provided in 10⁶ cells/mL  (= 10⁹ cells/L), the standard unit on
 * a Vi-Cell or similar counter.
 */

const PointSchema = z.object({
  vcd_million_per_ml: z
    .number()
    .positive()
    .describe("Viable cell density in 10⁶ cells/mL."),
  glucose_mM: z.number().nonnegative().optional().describe("Glucose in mmol/L (mM)."),
  lactate_mM: z.number().nonnegative().optional().describe("Lactate in mmol/L (mM)."),
  glutamine_mM: z.number().nonnegative().optional().describe("Glutamine in mmol/L (mM)."),
  ammonia_mM: z.number().nonnegative().optional().describe("Ammonia in mmol/L (mM)."),
  mab_mg_per_L: z
    .number()
    .nonnegative()
    .optional()
    .describe("Recombinant product titer in mg/L (optional)."),
});

export function buildYieldsTool() {
  return tool(
    "compute_metabolic_yields",
    "Compute CHO-style metabolic specific rates (q_Glc, q_Lac, q_Gln, q_NH₃, q_P) and yield ratios (Y_Lac/Glc, Y_NH₃/Gln) from two time-course measurements. Standard inputs: viable cell density (VCD) in 10⁶ cells/mL and substrate/product concentrations in mmol/L (mM). Returns specific rates in mmol / 10⁹ cells / day, the CHO industry convention. Y_Lac/Glc is the headline metabolic-state diagnostic for CHO (>1.5 indicates Warburg-like, <1.0 indicates oxidative).",
    {
      t0_hours: z.number().nonnegative().describe("Start time in hours since seeding."),
      t1_hours: z.number().describe("End time in hours since seeding (must be > t0)."),
      point0: PointSchema,
      point1: PointSchema,
      product_label: z
        .string()
        .optional()
        .default("mAb")
        .describe("Label for the recombinant product, default 'mAb'."),
    },
    async (inp) => {
      const dt_hr = inp.t1_hours - inp.t0_hours;
      if (!(dt_hr > 0)) {
        return {
          content: [{ type: "text" as const, text: "t1_hours must be greater than t0_hours." }],
          isError: true,
        };
      }
      const dt_days = dt_hr / 24;

      const v0 = inp.point0.vcd_million_per_ml;
      const v1 = inp.point1.vcd_million_per_ml;
      const mu_per_hr = Math.log(v1 / v0) / dt_hr;
      const dbl_hr = mu_per_hr > 0 ? Math.log(2) / mu_per_hr : Infinity;

      // Log-mean VCD (in 10^6 cells/mL = 10^9 cells/L) — the correct integral
      // for exponential growth. Falls back to arithmetic mean if VCDs are equal.
      const lmVcd =
        Math.abs(v1 - v0) > 1e-9 && mu_per_hr !== 0
          ? (v1 - v0) / Math.log(v1 / v0)
          : (v0 + v1) / 2;

      // Specific rate = ΔC / (lmVcd · Δt_days), where lmVcd is in 10^9 cells/L
      // (the unit numerically equals 10^6 cells/mL). ΔC in mmol/L. Result in
      // mmol / 10^9 cells / day. Sign convention: positive = consumption for
      // substrates, positive = production for products (we explicitly flip).
      function specRate(c0: number | undefined, c1: number | undefined): number | null {
        if (c0 === undefined || c1 === undefined) return null;
        return (c0 - c1) / (lmVcd * dt_days);
      }
      const q_Glc = specRate(inp.point0.glucose_mM, inp.point1.glucose_mM);
      const q_Gln = specRate(inp.point0.glutamine_mM, inp.point1.glutamine_mM);
      const q_LacNeg = specRate(inp.point0.lactate_mM, inp.point1.lactate_mM);
      const q_NH3Neg = specRate(inp.point0.ammonia_mM, inp.point1.ammonia_mM);
      // For products, we want production positive: flip sign.
      const q_Lac = q_LacNeg === null ? null : -q_LacNeg;
      const q_NH3 = q_NH3Neg === null ? null : -q_NH3Neg;

      // Product (mg/L) → mg / 10^9 cells / day
      let q_P: number | null = null;
      if (
        inp.point0.mab_mg_per_L !== undefined &&
        inp.point1.mab_mg_per_L !== undefined
      ) {
        q_P =
          (inp.point1.mab_mg_per_L - inp.point0.mab_mg_per_L) /
          (lmVcd * dt_days);
      }

      const Y_LacGlc =
        q_Glc !== null && q_Glc > 0 && q_Lac !== null ? q_Lac / q_Glc : null;
      const Y_NH3Gln =
        q_Gln !== null && q_Gln > 0 && q_NH3 !== null ? q_NH3 / q_Gln : null;

      const fmt = (x: number | null, decimals = 3) =>
        x === null ? "n/a" : Number.isFinite(x) ? x.toFixed(decimals) : "∞";

      const interp = lacInterp(Y_LacGlc);

      const out = [
        `## Metabolic readouts (Δt = ${dt_hr.toFixed(1)} hr)`,
        "",
        "| Metric | Value | Units |",
        "|---|---|---|",
        `| **μ** (specific growth rate) | ${fmt(mu_per_hr, 4)} | hr⁻¹ |`,
        `| **doubling time** | ${fmt(dbl_hr, 1)} | hr |`,
        `| log-mean VCD | ${fmt(lmVcd, 2)} | 10⁶ cells/mL |`,
        `| q_Glc | ${fmt(q_Glc)} | mmol / 10⁹ cells / day |`,
        `| q_Gln | ${fmt(q_Gln)} | mmol / 10⁹ cells / day |`,
        `| q_Lac (production) | ${fmt(q_Lac)} | mmol / 10⁹ cells / day |`,
        `| q_NH₃ (production) | ${fmt(q_NH3)} | mmol / 10⁹ cells / day |`,
        q_P !== null
          ? `| q_${inp.product_label} | ${fmt(q_P, 4)} | mg / 10⁹ cells / day |`
          : null,
        "",
        "**Yield ratios**",
        `- Y_Lac/Glc = ${fmt(Y_LacGlc, 2)} (mol/mol) — ${interp}`,
        Y_NH3Gln !== null ? `- Y_NH₃/Gln = ${fmt(Y_NH3Gln, 2)} (mol/mol)` : null,
      ]
        .filter(Boolean)
        .join("\n");

      return {
        content: [{ type: "text" as const, text: out }],
      };
    }
  );
}

function lacInterp(y: number | null): string {
  if (y === null) return "compute requires both glucose and lactate measurements";
  if (y >= 1.5) return "**Warburg-like**: glucose largely diverted to lactate; consider feeding/control changes";
  if (y >= 1.0) return "mixed metabolism, glycolysis-leaning";
  if (y >= 0.3) return "balanced; partial oxidative metabolism";
  if (y >= 0) return "**oxidative**: lactate is being consumed or near-zero (typical of late fed-batch)";
  return "lactate is decreasing — net lactate consumption (a desirable late-phase mode)";
}

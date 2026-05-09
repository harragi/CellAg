import { z } from "zod";
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { state } from "../state.ts";

type NotifyClient = (event: string, data: unknown) => void;

const ComponentsSchema = z.object({
  glucose_mM: z.number().min(0).max(100),
  glutamine_mM: z.number().min(0).max(20),
  asparagine_mM: z.number().min(0).max(20),
  insulin_mg_L: z.number().min(0).max(50),
  igf1_ng_mL: z.number().min(0).max(200),
  selenium_nM: z.number().min(0).max(200),
  naCl_mM: z.number().min(0).max(300),
  initial_vcd_million_per_ml: z.number().min(0.05).max(10).optional().default(0.5),
  time_horizon_hours: z.number().min(24).max(336).optional().default(96),
});

export type BenchData = {
  id: string;
  label: string;
  rationale: string;
  components: z.infer<typeof ComponentsSchema>;
  proposedAt: number;
};

export function buildSimulateTool(notify: NotifyClient) {
  return tool(
    "simulate_cho_media",
    "Render an interactive CHO media bench card inline in the chat. Use this AFTER you've designed a CHO media (or modified one) so the user gets a live dashboard they can tweak. The bench uses Monod-style ODE kinetics with multiplicative inhibition by lactate, NH₃, and osmolarity — fast triage, NOT an iCHO FBA replacement. Map your media composition to the seven scalar inputs below. If your formulation has values you don't know precisely, pick reasonable CHO-K1 mAb-platform defaults (glucose 25 mM, glutamine 4 mM, asparagine 5 mM, insulin 10 mg/L, IGF-1 20 ng/mL, selenium 30 nM, NaCl 117 mM, initial VCD 0.5×10⁶/mL, 96 h).",
    {
      label: z
        .string()
        .describe(
          "Short label for this media (e.g., 'CHO-K1-mAb-v0', 'NAT-substituted-v1', 'glucose-staged-v0')."
        ),
      rationale: z
        .string()
        .describe(
          "One sentence on what's distinctive about this media or why you're loading the bench. Shown to the user under the card label."
        ),
      components: ComponentsSchema.describe(
        "Bench inputs. Map your designed composition to these scalar parameters. Lipids, vitamins, and trace elements beyond selenium are not modeled here — focus on the substrates, growth factors, and ions that drive the ODE."
      ),
    },
    async ({ label, rationale, components }) => {
      const id = `bench_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const data: BenchData = {
        id,
        label,
        rationale,
        components: components as BenchData["components"],
        proposedAt: Date.now(),
      };
      state.benches.set(id, data);
      notify("bench_init", data);
      return {
        content: [
          {
            type: "text" as const,
            text: `Bench ${id} initialized for "${label}". Tell the user the interactive dashboard is shown inline below — they can move the sliders to vary components and watch growth, lactate, NH₃, and osmolarity respond live. Remind them this is Monod-kinetics triage, not an iCHO FBA run; use it to find which knob to spin before a wet-lab cycle.`,
          },
        ],
      };
    }
  );
}

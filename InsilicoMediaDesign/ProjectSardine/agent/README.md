# Sardine Start-With Agent

An interactive agent for the **Media Zero (Start With)** half of Project Sardine — designing minimum cell-culture media that enables cell survival.

- **Backend:** Bun + TypeScript + `@anthropic-ai/claude-agent-sdk`
- **Frontend:** React + Vite
- **State:** `../notes.md` is canonical. The agent reads it on every turn and proposes edits the user reviews via diff before they hit disk.
- **Tools:** 7 custom tools — read/edit notes, KEGG, Ensembl, EuropePMC, arXiv, local caail bibliography search.

## Run

From this directory:

```bash
# 1. install
(cd server && bun install)
(cd web && bun install)

# 2. configure
cp .env.example .env
# then edit .env and put your ANTHROPIC_API_KEY

# 3. boot (two terminals)
(cd server && bun run dev)   # → http://localhost:3001
(cd web && bun run dev)      # → http://localhost:5173

# 4. open browser
open http://localhost:5173
```

## Tools the agent can call

| Tool | What it does |
|---|---|
| `read_notes` | Fetch the current `notes.md` contents. |
| `propose_notes_edit` | Stage a section edit. Surfaces in the UI as a diff with Apply / Reject buttons; never writes directly. |
| `query_kegg` | KEGG REST API — pathway, gene, organism lookups. |
| `query_ensembl` | Ensembl REST — genes, receptors, species lookups. |
| `search_europepmc` | Literature search across PubMed/PMC/preprints. |
| `arxiv_search` | arXiv API. |
| `search_caail` | Local grep over the cloned caail bibliography. Falls back gracefully if caail isn't cloned at `/Users/harrissyed/Code/tucca/caail/`. |

## Things to ask it

- "What's the current state of Project Sardine?"
- "Look up KEGG pathway map00010 (glycolysis)."
- "Search arXiv for cultured-meat media optimization."
- "Search caail for Cosenza."
- "Add a decision: target species is rainbow trout."  *(triggers a propose_notes_edit; review and Apply in the UI)*

## Project layout

```
agent/
├── README.md
├── .env.example
├── .env               (you create — gitignored)
├── server/            Bun + TypeScript backend
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          (server entry — SSE chat endpoint)
│       ├── agent.ts          (Agent SDK wiring)
│       ├── system-prompt.ts  (loads SKILL.md + notes.md)
│       └── tools/            (the 7 custom tools)
└── web/               React + Vite frontend
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── components/
        │   ├── Chat.tsx
        │   ├── ToolCallView.tsx
        │   └── NotesPreview.tsx
        └── lib/
            └── stream.ts
```

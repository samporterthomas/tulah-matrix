# Tulah Comparator Matrix

A refined, client-facing analytical interface for interrogating the Tulah competitor benchmarking matrix through natural language.

---

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **SheetJS (xlsx)** for client-side XLSX parsing
- **Anthropic SDK** for AI analysis (server-side only)
- **Vercel** for deployment

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Set your API key

```bash
cp .env.example .env.local
```

Open `.env.local` and set:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get your key at: https://console.anthropic.com/

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

### Option A: Vercel CLI (recommended)

```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked about environment variables, add `ANTHROPIC_API_KEY`.

### Option B: GitHub + Vercel Dashboard

1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub.
3. In the Vercel project settings, go to **Settings → Environment Variables**.
4. Add: `ANTHROPIC_API_KEY` = `sk-ant-your-key-here`
5. Deploy.

### Environment variable reference

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |

The API key is **never** exposed to the browser. All Anthropic calls go through the `/api/analyse` server route.

---

## How the matrix parsing works

1. The XLSX file is bundled in `/public/matrix.xlsx` and loaded automatically on page open.
2. **SheetJS** reads the file client-side (no server upload required).
3. `lib/parseMatrix.ts` targets the `"Benchmark Matrix"` sheet (falling back to the first sheet if absent).
4. **Row 0** = section header (skipped). **Row 1** = column headers. **Rows 2+** = data.
5. Blank rows and section-label rows (starting with `LOCAL` or `SECTION`) are filtered out.
6. The result is a `ParsedMatrix` object held in React state and sent with every API request.

**To update the matrix:** replace `public/matrix.xlsx` with the new file and redeploy. No code changes needed.

---


---

## Setting up the Google Sheets matrix panel

The interface includes an inline panel that embeds your Google Sheet so you can view the full matrix alongside the chat.

### Step 1 — Publish the sheet to the web

1. Open the Google Sheet
2. Go to **File → Share → Publish to web**
3. Under "Link", select **"Entire document"** and **"Web page"**
4. Click **Publish** and confirm
5. Copy the URL shown — it will look like:
   `https://docs.google.com/spreadsheets/d/SHEET_ID/pubhtml`

### Step 2 — Set the environment variable

Add this to your `.env.local` (local) and Vercel environment variables (deployed):

```
NEXT_PUBLIC_SHEETS_EMBED_URL=https://docs.google.com/spreadsheets/d/SHEET_ID/pubhtml?widget=true&headers=false
```

To embed only the "Benchmark Matrix" sheet, find its `gid` (the number after `#gid=` in the URL when you have that sheet open), then use:

```
NEXT_PUBLIC_SHEETS_EMBED_URL=https://docs.google.com/spreadsheets/d/SHEET_ID/pubhtml?gid=GID_NUMBER&single=true&widget=true&headers=false
```

### Step 3 — Redeploy

On Vercel: Settings → Environment Variables → add `NEXT_PUBLIC_SHEETS_EMBED_URL`, then trigger a redeploy.

The panel will then be accessible via the **"View matrix"** button in the top bar. It is collapsed by default and can be expanded, resized by dragging, and collapsed again. An "Open in Sheets" link is always available as a fallback.

> Note: `NEXT_PUBLIC_` prefix is required — this URL is intentionally exposed to the browser (it is the published, public embed URL, not a secret).

## Project structure

```
tulah-matrix/
├── app/
│   ├── api/
│   │   └── analyse/
│   │       └── route.ts        # Server-side Anthropic proxy
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── MatrixAnalyser.tsx      # Full application UI
├── lib/
│   ├── parseMatrix.ts          # XLSX → JSON parser
│   ├── systemPrompt.ts         # AI system prompt builder
│   └── types.ts                # Shared TypeScript interfaces
├── public/
│   └── matrix.xlsx             # Bundled default matrix
├── .env.example
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

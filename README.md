# API Sandbox

A focused, fast, and friendly web app for trying APIs without the overhead of a full‑blown client. Paste an endpoint, pick a method, set headers/body, hit **Send**—get a clean response with useful insights and shareable exports.

> Built to keep you in flow while exploring APIs, debugging issues, and documenting endpoints.

**Live demo:** https://api-sandbox.ashwinsathian.com/

---

## Why use API Sandbox?

- **Zero clutter, just the essentials.** Compose a request and see a clean, structured response.
- **Great defaults.** Sensible method/body pairing, helpful validation, and safe fallbacks.
- **Shareable results.** Export a request/response as **HAR 1.2** or **NDJSON** lines for teammates and tooling.
- **History that actually helps.** Saved **per‑browser, per‑device** using **IndexedDB (IDB)**—no servers, no tracking.
- **Dark‑first UI.** Minimal, accessible, and keyboard‑friendly.

---

## Highlights

- **Request Composer**

  - Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`
  - URL field with live validation
  - Headers editor
  - Body editor (enabled only when it makes sense)
  - Optional **Monaco JSON editor** mode for power users

- **Response Viewer**

  - Pretty JSON with collapsible sections
  - Headers & meta tabs
  - Timing (DNS → Connect → TTFB → Total) and size breakdowns
  - Copy helpers and raw view

- **Exports**

  - **HAR 1.2** – Standard archive for HTTP requests/responses (great for bug reports)
  - **NDJSON** – Line‑by‑line JSON records for logs and automation
  - Large bodies are safely truncated/omitted in exports to keep files lightweight

- **History**
  - Stored **locally in your browser via IndexedDB**
  - Re‑run, rename, and delete entries
  - Quick filters by method and URL

---

## Quick Start (Local)

> Requires **Node 18+** and a modern browser. Angular CLI is optional; the scripts below will run the dev server.

```bash
# 1) Clone the repo
git clone https://github.com/AshwinSathian/apiSandbox.git
cd api-sandbox

# 2) Install dependencies
npm install
# (or: npm ci)

# 3) Run the app (Angular dev server)
ng serve --open
# then open http://localhost:4200

# 4) Production build (optional)
npm run build
```

**Notes**

- Calling third‑party APIs may require CORS to be enabled by that API. For private APIs, consider a proxy if needed.
- The **History** is stored locally in **IndexedDB** and is **specific to the browser and device** you’re using.

---

## How it works (in 60 seconds)

- The **Request Composer** accepts a URL, method, headers, and (if applicable) a JSON body.
- The app sends the request and shows:
  - **Body** (pretty‑printed for JSON)
  - **Headers**
  - **Meta** (status, duration, sizes)
- Each call can be **saved to History** for later replay or export.
- You can **export** any call as HAR or NDJSON to share with teammates or attach to tickets.

---

## Privacy & Data

- Your request history is stored **locally** in your browser via **IndexedDB (IDB)**.
- **Nothing is uploaded** to our servers.
- You’re in control: clear individual entries or wipe the entire history anytime.

---

## FAQ

**Does this replace Postman/Insomnia?**  
No. API Sandbox is intentionally smaller and faster for everyday calls, docs checks, and quick debugging.

**Why HAR and NDJSON?**  
They’re widely accepted by browsers, proxies, and observability tools. HAR is great for attaching to bug reports. NDJSON is ideal for pipelines and log ingestion.

**Can I use form data or files?**  
Current focus is JSON APIs. Form/file helpers may land later.

**Will there be a light theme?**  
Possibly. The app is dark‑first today.

---

## Contributing

Contributions are welcome—bug reports, small UX wins, docs tweaks, or focused features that keep the app fast and simple. Please open an issue to propose changes before a PR, and keep scope tight.

---

## Roadmap (public intent, not a contract)

- JSONPath search/filter in responses
- Advanced auth helpers
- Request collections and sharing
- CSV/XLSX preview & import flows
- PWA mode for offline use

---

## License

MIT © Ashwin Sathian

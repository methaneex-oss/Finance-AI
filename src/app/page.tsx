"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Classification = "INCOME" | "EXPENSE" | "FUND";
type Category = { id: string; name: string; classification: Classification; active: boolean };
type EntryLine = { categoryId: string; amount: string; category: Category };
type Entry = { id: string; entryDate: string; description: string; branch?: { name: string } | null; lines: EntryLine[] };

const money = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

export default function Home() {
  const [page, setPage] = useState("Dashboard");
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState("Ask me about recorded finances, categories, trends, or reports.");
  const [notice, setNotice] = useState("Loading persistent financial data…");
  const [loading, setLoading] = useState(true);

  const notify = (message: string) => { setNotice(message); setTimeout(() => setNotice(""), 3000); };

  async function loadData() {
    setLoading(true);
    try {
      const [categoryResponse, entryResponse] = await Promise.all([fetch("/api/categories"), fetch("/api/entries")]);
      if (!categoryResponse.ok || !entryResponse.ok) throw new Error("Database unavailable");
      setCategories(await categoryResponse.json());
      setEntries(await entryResponse.json());
      setNotice("");
    } catch (error) {
      console.error(error);
      notify("Database connection is not configured or unavailable. Add DATABASE_URL to run the live ledger.");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  const totals = useMemo(() => {
    const result = { INCOME: 0, EXPENSE: 0, FUND: 0 };
    for (const entry of entries) for (const line of entry.lines) result[line.category.classification] += Number(line.amount);
    return result;
  }, [entries]);

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lines = categories.filter(c => selected[c.id]).map(c => ({ categoryId: c.id, amount: Number(amounts[c.id] || 0) })).filter(line => line.amount > 0);
    if (!lines.length) return notify("Select at least one category and enter an amount.");

    const response = await fetch("/api/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryDate: form.get("date"), description: form.get("description"), lines }) });
    if (!response.ok) return notify("The entry could not be recorded.");
    setSelected({}); setAmounts({}); event.currentTarget.reset();
    await loadData();
    notify("Financial entry committed to the database and audit log.");
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const classification = String(form.get("classification"));
    if (!name) return notify("Category name is required.");
    const response = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, classification }) });
    if (!response.ok) return notify("Category could not be created.");
    event.currentTarget.reset(); await loadData(); notify("Category created in the organization database.");
  }

  function askAI() {
    const q = query.toLowerCase();
    if (q.includes("today")) setAiAnswer(`Recorded income: ${money(totals.INCOME)}. Recorded funds: ${money(totals.FUND)}. This answer is calculated from database records.`);
    else if (q.includes("month") || q.includes("total")) setAiAnswer(`Current database totals: income ${money(totals.INCOME)}, expenses ${money(totals.EXPENSE)}, funds ${money(totals.FUND)}.`);
    else if (q.includes("category")) setAiAnswer(`${categories.length} categories are currently stored for this organization.`);
    else setAiAnswer("The AI model layer is intentionally separate from the ledger. Next, model tools will query this same database for verified facts.");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r bg-white p-5 md:block">
          <div className="mb-8"><div className="text-xl font-black tracking-tight">FINANCE AI</div><div className="text-xs text-slate-500">Financial Intelligence Platform</div></div>
          <nav className="space-y-1">{["Dashboard", "New Entry", "Financial Categories", "Reports", "AI Assistant", "Settings"].map(item => <button key={item} onClick={() => setPage(item)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${page === item ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}>{item}</button>)}</nav>
        </aside>

        <section className="flex-1 p-4 md:p-8">
          <header className="mb-6 flex items-center justify-between"><div><p className="text-sm text-slate-500">Organization</p><h1 className="text-2xl font-bold">Harvest Organization</h1></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Development</span></header>

          {loading && <div className="mb-6 rounded-xl border bg-white p-4 text-sm text-slate-600">Connecting to the persistent ledger…</div>}

          {page === "Dashboard" && <>
            <div className="grid gap-4 md:grid-cols-4">{[["Income", totals.INCOME], ["Expenses", totals.EXPENSE], ["Funds", totals.FUND], ["Categories", categories.length]].map(([label, value]) => <div key={label} className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{label === "Categories" ? value : money(Number(value))}</p></div>)}</div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border bg-white p-6 lg:col-span-2"><div className="mb-4 flex justify-between"><h2 className="font-bold">Recent financial entries</h2><button onClick={() => setPage("New Entry")} className="text-sm font-semibold">+ New entry</button></div><div className="space-y-3">{entries.slice(0, 6).map(entry => <div key={entry.id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between"><span className="font-medium">{entry.description}</span><span className="text-xs text-slate-500">{new Date(entry.entryDate).toLocaleDateString("en-NG")}</span></div><p className="mt-1 text-xs text-slate-500">{entry.branch?.name ?? "Organization"} · {money(entry.lines.reduce((sum, line) => sum + Number(line.amount), 0))}</p></div>)}{!entries.length && <p className="text-sm text-slate-500">No entries have been recorded yet.</p>}</div></div>
              <div className="rounded-2xl border bg-white p-6"><h2 className="font-bold">Ask Finance AI</h2><textarea value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. What did we record today?" className="mt-4 h-28 w-full rounded-xl border p-3 text-sm outline-none"/><button onClick={askAI} className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Ask AI</button><p className="mt-4 text-sm leading-6 text-slate-600">{aiAnswer}</p></div>
            </div>
          </>}

          {page === "New Entry" && <div className="max-w-3xl rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Record financial entry</h2><p className="mt-1 text-sm text-slate-500">Categories are loaded from organization configuration.</p><form onSubmit={submitEntry} className="mt-6 space-y-5"><div className="grid gap-4 md:grid-cols-2"><input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="rounded-xl border p-3"/><input name="description" placeholder="Description" required className="rounded-xl border p-3"/></div><div className="space-y-2">{categories.filter(c => c.active).map(c => <label key={c.id} className="flex items-center gap-3 rounded-xl border p-4"><input type="checkbox" checked={!!selected[c.id]} onChange={e => setSelected(s => ({ ...s, [c.id]: e.target.checked }))}/><span className="flex-1"><b>{c.name}</b><span className="ml-2 text-xs text-slate-400">{c.classification.toLowerCase()}</span></span>{selected[c.id] && <input value={amounts[c.id] || ""} onChange={e => setAmounts(a => ({ ...a, [c.id]: e.target.value }))} type="number" min="0" step="0.01" placeholder="Amount" className="w-40 rounded-lg border p-2"/>}</label>)}</div><button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Submit & record</button></form></div>}

          {page === "Financial Categories" && <div className="grid gap-6 lg:grid-cols-3"><form onSubmit={addCategory} className="rounded-2xl border bg-white p-6"><h2 className="font-bold">Create category</h2><input name="name" placeholder="Category or fund name" className="mt-4 w-full rounded-xl border p-3"/><select name="classification" defaultValue="INCOME" className="mt-3 w-full rounded-xl border p-3"><option value="INCOME">Income</option><option value="EXPENSE">Expense</option><option value="FUND">Fund</option></select><button className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">Create</button></form><div className="rounded-2xl border bg-white p-6 lg:col-span-2"><h2 className="font-bold">Configured categories</h2><div className="mt-4 space-y-2">{categories.map(c => <div key={c.id} className="flex justify-between rounded-xl bg-slate-50 p-4"><span>{c.name}</span><span className="text-xs uppercase text-slate-500">{c.classification}</span></div>)}</div></div></div>}

          {page === "Reports" && <div className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Financial report</h2><div className="mt-6 grid gap-4 md:grid-cols-3">{[["Income", totals.INCOME], ["Expenses", totals.EXPENSE], ["Funds", totals.FUND]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-5"><p className="text-sm text-slate-500">{label}</p><b className="text-xl">{money(Number(value))}</b></div>)}</div><p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Reports now read from the persistent ledger. Export formats and period filters are the next reporting layer.</p></div>}

          {page === "AI Assistant" && <div className="max-w-2xl rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Finance AI</h2><p className="mt-2 text-sm text-slate-500">The model will sit on top of the authoritative ledger and use tools to retrieve verified financial facts.</p><textarea value={query} onChange={e => setQuery(e.target.value)} placeholder="Ask a financial question..." className="mt-5 h-32 w-full rounded-xl border p-3"/><button onClick={askAI} className="mt-3 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Analyze</button><div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6">{aiAnswer}</div></div>}

          {page === "Settings" && <div className="max-w-2xl rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Organization settings</h2><p className="mt-2 text-sm text-slate-500">Organization configuration is stored in PostgreSQL. Authentication and role-based access will control who can change these values.</p><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm">Organization name<input defaultValue="Harvest Organization" readOnly className="mt-2 w-full rounded-xl border bg-slate-50 p-3"/></label><label className="text-sm">Base currency<input defaultValue="NGN" readOnly className="mt-2 w-full rounded-xl border bg-slate-50 p-3"/></label></div></div>}

          {notice && <div className="fixed bottom-5 right-5 max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
        </section>
      </div>
    </main>
  );
}

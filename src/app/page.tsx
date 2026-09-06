"use client";

import { FormEvent, useMemo, useState } from "react";

type Classification = "income" | "expense" | "fund";
type Category = { id: string; name: string; classification: Classification; active: boolean };
type Entry = { id: string; date: string; description: string; branch: string; amounts: Record<string, number> };

const seedCategories: Category[] = [
  { id: "c1", name: "Tithe", classification: "income", active: true },
  { id: "c2", name: "Offering", classification: "income", active: true },
  { id: "c3", name: "Building Project", classification: "fund", active: true },
  { id: "c4", name: "Welfare", classification: "fund", active: true },
];

const seedEntries: Entry[] = [
  { id: "e1", date: "2026-09-06", description: "Sunday service", branch: "Main", amounts: { c1: 180000, c2: 95000, c3: 40000 } },
];

const money = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

export default function Home() {
  const [page, setPage] = useState("Dashboard");
  const [categories, setCategories] = useState<Category[]>(seedCategories);
  const [entries, setEntries] = useState<Entry[]>(seedEntries);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState("Ask me about recorded finances, categories, trends, or reports.");
  const [notice, setNotice] = useState("");

  const totals = useMemo(() => {
    const result = { income: 0, expense: 0, fund: 0 };
    for (const entry of entries) for (const [id, value] of Object.entries(entry.amounts)) {
      const category = categories.find(c => c.id === id);
      if (category) result[category.classification] += value;
    }
    return result;
  }, [entries, categories]);

  const notify = (message: string) => { setNotice(message); setTimeout(() => setNotice(""), 2500); };

  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextAmounts: Record<string, number> = {};
    for (const category of categories) if (selected[category.id]) {
      const value = Number(amounts[category.id] || 0);
      if (value > 0) nextAmounts[category.id] = value;
    }
    if (!Object.keys(nextAmounts).length) return notify("Select at least one category and enter an amount.");
    setEntries(prev => [...prev, { id: crypto.randomUUID(), date: String(form.get("date")), description: String(form.get("description") || "Entry"), branch: String(form.get("branch") || "Main"), amounts: nextAmounts }]);
    setSelected({}); setAmounts({});
    notify("Financial entry recorded in the current session.");
  }

  function askAI() {
    const q = query.toLowerCase();
    if (q.includes("today")) setAiAnswer(`Today's recorded income is ${money(totals.income)}. Funds recorded: ${money(totals.fund)}.`);
    else if (q.includes("month") || q.includes("total")) setAiAnswer(`Current recorded totals: income ${money(totals.income)}, expenses ${money(totals.expense)}, funds ${money(totals.fund)}.`);
    else if (q.includes("category")) setAiAnswer(`${categories.length} financial categories are configured, with ${categories.filter(c => c.active).length} active.`);
    else setAiAnswer("I can analyze the financial ledger once persistent storage and the selected AI model are connected. For now, this demo uses the live session ledger.");
  }

  function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const classification = String(form.get("classification")) as Classification;
    if (!name) return notify("Category name is required.");
    setCategories(prev => [...prev, { id: crypto.randomUUID(), name, classification, active: true }]);
    event.currentTarget.reset(); notify("Category created.");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r bg-white p-5 md:block">
          <div className="mb-8"><div className="text-xl font-black tracking-tight">FINANCE AI</div><div className="text-xs text-slate-500">Financial Intelligence Platform</div></div>
          <nav className="space-y-1">
            {["Dashboard", "New Entry", "Financial Categories", "Reports", "AI Assistant", "Settings"].map(item => <button key={item} onClick={() => setPage(item)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${page === item ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}>{item}</button>)}
          </nav>
        </aside>

        <section className="flex-1 p-4 md:p-8">
          <header className="mb-6 flex items-center justify-between"><div><p className="text-sm text-slate-500">Organization</p><h1 className="text-2xl font-bold">Harvest Organization</h1></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Development</span></header>

          {page === "Dashboard" && <>
            <div className="grid gap-4 md:grid-cols-4">
              {[['Income', totals.income], ['Expenses', totals.expense], ['Funds', totals.fund], ['Categories', categories.length]].map(([label, value]) => <div key={label} className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{typeof value === "number" && label !== "Categories" ? money(value) : value}</p></div>)}
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border bg-white p-6 lg:col-span-2"><div className="mb-4 flex justify-between"><h2 className="font-bold">Recent financial entries</h2><button onClick={() => setPage("New Entry")} className="text-sm font-semibold">+ New entry</button></div><div className="space-y-3">{entries.slice(-6).reverse().map(entry => <div key={entry.id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between"><span className="font-medium">{entry.description}</span><span className="text-xs text-slate-500">{entry.date}</span></div><p className="mt-1 text-xs text-slate-500">{entry.branch} · {money(Object.values(entry.amounts).reduce((a,b) => a+b, 0))}</p></div>)}</div></div>
              <div className="rounded-2xl border bg-white p-6"><h2 className="font-bold">Ask Finance AI</h2><textarea value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. What did we record today?" className="mt-4 h-28 w-full rounded-xl border p-3 text-sm outline-none"/><button onClick={askAI} className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Ask AI</button><p className="mt-4 text-sm leading-6 text-slate-600">{aiAnswer}</p></div>
            </div>
          </>}

          {page === "New Entry" && <div className="max-w-3xl rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Record financial entry</h2><p className="mt-1 text-sm text-slate-500">Categories come from organization configuration — not hard-coded rules.</p><form onSubmit={submitEntry} className="mt-6 space-y-5"><div className="grid gap-4 md:grid-cols-3"><input name="date" type="date" defaultValue="2026-09-06" required className="rounded-xl border p-3"/><input name="branch" placeholder="Branch" defaultValue="Main" className="rounded-xl border p-3"/><input name="description" placeholder="Description" required className="rounded-xl border p-3 md:col-span-1"/></div><div className="space-y-2">{categories.filter(c => c.active).map(c => <label key={c.id} className="flex items-center gap-3 rounded-xl border p-4"><input type="checkbox" checked={!!selected[c.id]} onChange={e => setSelected(s => ({...s, [c.id]: e.target.checked}))}/><span className="flex-1"><b>{c.name}</b><span className="ml-2 text-xs text-slate-400">{c.classification}</span></span>{selected[c.id] && <input value={amounts[c.id] || ""} onChange={e => setAmounts(a => ({...a, [c.id]: e.target.value}))} type="number" min="0" placeholder="Amount" className="w-40 rounded-lg border p-2"/>}</label>)}</div><button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Submit & record</button></form></div>}

          {page === "Financial Categories" && <div className="grid gap-6 lg:grid-cols-3"><form onSubmit={addCategory} className="rounded-2xl border bg-white p-6"><h2 className="font-bold">Create category</h2><input name="name" placeholder="Category or fund name" className="mt-4 w-full rounded-xl border p-3"/><select name="classification" defaultValue="income" className="mt-3 w-full rounded-xl border p-3"><option value="income">Income</option><option value="expense">Expense</option><option value="fund">Fund</option></select><button className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">Create</button></form><div className="rounded-2xl border bg-white p-6 lg:col-span-2"><h2 className="font-bold">Configured categories</h2><div className="mt-4 space-y-2">{categories.map(c => <div key={c.id} className="flex justify-between rounded-xl bg-slate-50 p-4"><span>{c.name}</span><span className="text-xs uppercase text-slate-500">{c.classification}</span></div>)}</div></div></div>}

          {page === "Reports" && <div className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Financial report</h2><div className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-5"><p className="text-sm text-slate-500">Income</p><b className="text-xl">{money(totals.income)}</b></div><div className="rounded-xl bg-slate-50 p-5"><p className="text-sm text-slate-500">Expenses</p><b className="text-xl">{money(totals.expense)}</b></div><div className="rounded-xl bg-slate-50 p-5"><p className="text-sm text-slate-500">Funds</p><b className="text-xl">{money(totals.fund)}</b></div></div><button onClick={() => notify("Report export will be connected to persistent reporting in the next build stage.")} className="mt-6 rounded-xl border px-4 py-3 font-semibold">Generate report</button></div>}

          {page === "AI Assistant" && <div className="max-w-2xl rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Finance AI</h2><p className="mt-2 text-sm text-slate-500">The AI layer will sit on top of the authoritative ledger and use tools to retrieve verified financial facts.</p><textarea value={query} onChange={e => setQuery(e.target.value)} placeholder="Ask a financial question..." className="mt-5 h-32 w-full rounded-xl border p-3"/><button onClick={askAI} className="mt-3 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Analyze</button><div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6">{aiAnswer}</div></div>}

          {page === "Settings" && <div className="max-w-2xl rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Organization settings</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm">Organization name<input defaultValue="Harvest Organization" className="mt-2 w-full rounded-xl border p-3"/></label><label className="text-sm">Currency<select defaultValue="NGN" className="mt-2 w-full rounded-xl border p-3"><option value="NGN">NGN — ₦</option><option value="USD">USD — $</option><option value="GBP">GBP — £</option></select></label><label className="text-sm">Financial year<select defaultValue="calendar" className="mt-2 w-full rounded-xl border p-3"><option value="calendar">January–December</option><option value="custom">Custom financial year</option></select></label></div><p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Production hardening will add authentication, role permissions, database persistence, audit logs, reconciliation controls, and AI provider configuration.</p></div>}

          {notice && <div className="fixed bottom-5 right-5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
        </section>
      </div>
    </main>
  );
}

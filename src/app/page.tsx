"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Classification = "INCOME" | "EXPENSE" | "FUND";
type Category = { id: string; name: string; classification: Classification; active: boolean };
type Branch = { id: string; name: string; code?: string | null; active: boolean };
type Organization = {
  id: string;
  name: string;
  baseCurrency: string;
  fiscalYearStartMonth: number;
  fiscalYearStartDay: number;
  branches: Branch[];
};
type EntryLine = { categoryId: string; amount: string; category: Category };
type Entry = {
  id: string;
  entryDate: string;
  description: string;
  branch?: { name: string } | null;
  lines: EntryLine[];
};

export default function Home() {
  const [page, setPage] = useState("Dashboard");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState("Ask me about recorded finances, categories, trends, or reports.");
  const [notice, setNotice] = useState("Loading persistent financial data…");
  const [loading, setLoading] = useState(true);

  const money = useMemo(
    () =>
      (value: number) =>
        new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: organization?.baseCurrency || "NGN",
          maximumFractionDigits: 2,
        }).format(value),
    [organization?.baseCurrency],
  );

  const notify = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  };

  async function loadData() {
    setLoading(true);
    try {
      const [organizationResponse, categoryResponse, entryResponse] = await Promise.all([
        fetch("/api/organization"),
        fetch("/api/categories"),
        fetch("/api/entries"),
      ]);

      if (!organizationResponse.ok || !categoryResponse.ok || !entryResponse.ok) {
        throw new Error("Database unavailable");
      }

      setOrganization(await organizationResponse.json());
      setCategories(await categoryResponse.json());
      setEntries(await entryResponse.json());
      setNotice("");
    } catch (error) {
      console.error(error);
      notify("Database connection is not configured or unavailable. Add DATABASE_URL to run the live ledger.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totals = useMemo(() => {
    const result = { INCOME: 0, EXPENSE: 0, FUND: 0 };
    for (const entry of entries) {
      for (const line of entry.lines) {
        result[line.category.classification] += Number(line.amount);
      }
    }
    return result;
  }, [entries]);

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lines = categories
      .filter((category) => selected[category.id])
      .map((category) => ({ categoryId: category.id, amount: Number(amounts[category.id] || 0) }))
      .filter((line) => line.amount > 0);

    if (!lines.length) return notify("Select at least one category and enter an amount.");

    const response = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryDate: form.get("date"),
        description: form.get("description"),
        branchId: form.get("branchId") || null,
        lines,
      }),
    });

    if (!response.ok) return notify("The entry could not be recorded.");

    setSelected({});
    setAmounts({});
    event.currentTarget.reset();
    await loadData();
    notify("Financial entry committed to the database and audit log.");
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const classification = String(form.get("classification"));
    const description = String(form.get("description") || "").trim();
    const isTemporary = form.get("isTemporary") === "on";

    if (!name) return notify("Category name is required.");

    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, classification, description: description || null, isTemporary }),
    });

    if (!response.ok) return notify("Category could not be created.");
    event.currentTarget.reset();
    await loadData();
    notify("Category created in the organization database.");
  }

  function askAI() {
    setAiAnswer(
      "The live model/tool layer is not connected yet. Financial answers will be generated from database tools rather than hard-coded category or amount rules.",
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r bg-white p-5 md:block">
          <div className="mb-8">
            <div className="text-xl font-black tracking-tight">FINANCE AI</div>
            <div className="text-xs text-slate-500">Financial Intelligence Platform</div>
          </div>
          <nav className="space-y-1">
            {["Dashboard", "New Entry", "Financial Categories", "Reports", "AI Assistant", "Settings"].map((item) => (
              <button
                key={item}
                onClick={() => setPage(item)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${page === item ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex-1 p-4 md:p-8">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Organization</p>
              <h1 className="text-2xl font-bold">{organization?.name || "Loading organization…"}</h1>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Development</span>
          </header>

          {loading && <div className="mb-6 rounded-xl border bg-white p-4 text-sm text-slate-600">Connecting to the persistent ledger…</div>}

          {page === "Dashboard" && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  ["Income", totals.INCOME],
                  ["Expenses", totals.EXPENSE],
                  ["Funds", totals.FUND],
                  ["Categories", categories.length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border bg-white p-5">
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-bold">{label === "Categories" ? value : money(Number(value))}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border bg-white p-6 lg:col-span-2">
                  <div className="mb-4 flex justify-between">
                    <h2 className="font-bold">Recent financial entries</h2>
                    <button onClick={() => setPage("New Entry")} className="text-sm font-semibold">+ New entry</button>
                  </div>
                  <div className="space-y-3">
                    {entries.slice(0, 6).map((entry) => (
                      <div key={entry.id} className="rounded-xl bg-slate-50 p-4">
                        <div className="flex justify-between">
                          <span className="font-medium">{entry.description}</span>
                          <span className="text-xs text-slate-500">{new Date(entry.entryDate).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.branch?.name ?? "Organization"} · {money(entry.lines.reduce((sum, line) => sum + Number(line.amount), 0))}
                        </p>
                      </div>
                    ))}
                    {!entries.length && <p className="text-sm text-slate-500">No entries have been recorded yet.</p>}
                  </div>
                </div>
                <div className="rounded-2xl border bg-white p-6">
                  <h2 className="font-bold">Ask Finance AI</h2>
                  <textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. What did we record today?" className="mt-4 h-28 w-full rounded-xl border p-3 text-sm outline-none" />
                  <button onClick={askAI} className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Ask AI</button>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{aiAnswer}</p>
                </div>
              </div>
            </>
          )}

          {page === "New Entry" && (
            <div className="max-w-3xl rounded-2xl border bg-white p-6">
              <h2 className="text-xl font-bold">Record financial entry</h2>
              <p className="mt-1 text-sm text-slate-500">Categories and branches are loaded from organization configuration.</p>
              <form onSubmit={submitEntry} className="mt-6 space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="rounded-xl border p-3" />
                  <input name="description" placeholder="Description" required className="rounded-xl border p-3 md:col-span-2" />
                </div>
                {organization?.branches.length ? (
                  <select name="branchId" defaultValue="" className="w-full rounded-xl border p-3">
                    <option value="">Organization-wide</option>
                    {organization.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.code ? ` (${branch.code})` : ""}</option>)}
                  </select>
                ) : null}
                <div className="space-y-2">
                  {categories.filter((category) => category.active).map((category) => (
                    <label key={category.id} className="flex items-center gap-3 rounded-xl border p-4">
                      <input type="checkbox" checked={!!selected[category.id]} onChange={(e) => setSelected((state) => ({ ...state, [category.id]: e.target.checked }))} />
                      <span className="flex-1"><b>{category.name}</b><span className="ml-2 text-xs text-slate-400">{category.classification.toLowerCase()}</span></span>
                      {selected[category.id] && <input value={amounts[category.id] || ""} onChange={(e) => setAmounts((state) => ({ ...state, [category.id]: e.target.value }))} type="number" min="0" step="0.01" placeholder="Amount" className="w-40 rounded-lg border p-2" />}
                    </label>
                  ))}
                  {!categories.filter((category) => category.active).length && <p className="text-sm text-slate-500">No active financial categories are configured yet.</p>}
                </div>
                <button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Submit & record</button>
              </form>
            </div>
          )}

          {page === "Financial Categories" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <form onSubmit={addCategory} className="rounded-2xl border bg-white p-6">
                <h2 className="font-bold">Create category or fund</h2>
                <input name="name" placeholder="Category or fund name" required className="mt-4 w-full rounded-xl border p-3" />
                <textarea name="description" placeholder="Description (optional)" className="mt-3 w-full rounded-xl border p-3" />
                <select name="classification" defaultValue="INCOME" className="mt-3 w-full rounded-xl border p-3">
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                  <option value="FUND">Fund</option>
                </select>
                <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="isTemporary" /> Temporary category/fund</label>
                <button className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">Create</button>
              </form>
              <div className="rounded-2xl border bg-white p-6 lg:col-span-2">
                <h2 className="font-bold">Configured categories</h2>
                <div className="mt-4 space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex justify-between rounded-xl bg-slate-50 p-4">
                      <span>{category.name}</span>
                      <span className="text-xs uppercase text-slate-500">{category.classification}</span>
                    </div>
                  ))}
                  {!categories.length && <p className="text-sm text-slate-500">No categories configured.</p>}
                </div>
              </div>
            </div>
          )}

          {page === "Reports" && (
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="text-xl font-bold">Financial report</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[["Income", totals.INCOME], ["Expenses", totals.EXPENSE], ["Funds", totals.FUND]].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-5"><p className="text-sm text-slate-500">{label}</p><b className="text-xl">{money(Number(value))}</b></div>
                ))}
              </div>
              <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Reports read from the persistent ledger. Period filters, comparisons, and exports are the next reporting layer.</p>
            </div>
          )}

          {page === "AI Assistant" && (
            <div className="max-w-2xl rounded-2xl border bg-white p-6">
              <h2 className="text-xl font-bold">Finance AI</h2>
              <p className="mt-2 text-sm text-slate-500">The model will sit on top of the authoritative ledger and use tools to retrieve verified financial facts.</p>
              <textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask a financial question..." className="mt-5 h-32 w-full rounded-xl border p-3" />
              <button onClick={askAI} className="mt-3 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">Analyze</button>
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6">{aiAnswer}</div>
            </div>
          )}

          {page === "Settings" && (
            <div className="max-w-2xl rounded-2xl border bg-white p-6">
              <h2 className="text-xl font-bold">Organization settings</h2>
              <p className="mt-2 text-sm text-slate-500">These values are read from PostgreSQL. Authentication and role-based access will control who can change them.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm">Organization name<input value={organization?.name || ""} readOnly className="mt-2 w-full rounded-xl border bg-slate-50 p-3" /></label>
                <label className="text-sm">Base currency<input value={organization?.baseCurrency || ""} readOnly className="mt-2 w-full rounded-xl border bg-slate-50 p-3" /></label>
              </div>
            </div>
          )}

          {notice && <div className="fixed bottom-5 right-5 max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
        </section>
      </div>
    </main>
  );
}

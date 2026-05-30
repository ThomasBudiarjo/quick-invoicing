import { useEffect, useRef, useState, type ReactNode } from "react";

type SubItem = { id: string; description: string; qty: number; rate: number };
type LineItem = { id: string; description: string; qty: number; rate: number; subItems?: SubItem[] };
type DiscountType = "flat" | "percent";
type ThemeKey = "blue" | "green" | "slate" | "rose" | "amber";

type Invoice = {
  logo: string | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  from: { name: string; address: string; email: string; phone: string };
  to: { name: string; address: string; email: string };
  items: LineItem[];
  taxPercent: number;
  discount: number;
  discountType: DiscountType;
  notes: string;
  currency: string;
  theme: ThemeKey;
};

const CURRENCIES: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", IDR: "Rp", CAD: "C$", AUD: "A$", CHF: "CHF", CNY: "¥", BRL: "R$",
};

const THEMES: Record<ThemeKey, { accent: string; soft: string; text: string }> = {
  blue:  { accent: "#2563eb", soft: "#eff6ff", text: "#1e3a8a" },
  green: { accent: "#059669", soft: "#ecfdf5", text: "#064e3b" },
  slate: { accent: "#475569", soft: "#f1f5f9", text: "#0f172a" },
  rose:  { accent: "#e11d48", soft: "#fff1f2", text: "#881337" },
  amber: { accent: "#d97706", soft: "#fffbeb", text: "#78350f" },
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
  const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
};
const uid = () => Math.random().toString(36).slice(2, 10);

const nextInvoiceNumber = (current: string): string => {
  const m = current.match(/^(.*?)(\d+)$/);
  if (!m) return "INV-0001";
  const n = (parseInt(m[2], 10) + 1).toString().padStart(m[2].length, "0");
  return m[1] + n;
};

const blankInvoice = (number = "INV-0001"): Invoice => ({
  logo: null,
  invoiceNumber: number,
  issueDate: todayISO(),
  dueDate: addDays(todayISO(), 30),
  from: { name: "Your Company", address: "123 Main St\nCity, State 00000", email: "hello@company.com", phone: "+1 (555) 000-0000" },
  to: { name: "Client Name", address: "456 Client Ave\nCity, State 00000", email: "client@example.com" },
  items: [
    { id: uid(), description: "Service or product description", qty: 1, rate: 100, subItems: [] },
  ],
  taxPercent: 0,
  discount: 0,
  discountType: "flat",
  notes: "Thank you for your business! Payment due within 30 days.",
  currency: "USD",
  theme: "blue",
});

const STORAGE_KEY = "quickinvoice:v1";

function loadInvoice(): Invoice {
  if (typeof window === "undefined") return blankInvoice();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankInvoice();
    return { ...blankInvoice(), ...JSON.parse(raw) };
  } catch { return blankInvoice(); }
}

function fmtMoney(n: number, currency: string) {
  const sym = CURRENCIES[currency] ?? "";
  const v = (isFinite(n) ? n : 0).toFixed(2);
  return `${sym}${v}`;
}

/** Inline editable text field — uncontrolled contentEditable to keep caret stable. */
function Editable({
  value, onChange, placeholder, className = "", multiline = false, as = "span",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  className?: string; multiline?: boolean; as?: "span" | "div" | "h1" | "h2" | "p";
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);
  const Tag = as as any;
  return (
    <Tag
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={`editable ${multiline ? "whitespace-pre-wrap" : ""} ${className}`}
      onBlur={(e: any) => onChange(e.currentTarget.innerText)}
      onKeyDown={(e: any) => {
        if (!multiline && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
      }}
    />
  );
}

function NumberEditable({
  value, onChange, className = "", min = 0,
}: { value: number; onChange: (n: number) => void; className?: string; min?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== String(value)) {
      ref.current.innerText = String(value);
    }
  }, [value]);
  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      inputMode="decimal"
      className={`editable ${className}`}
      onInput={(e: any) => {
        const raw = e.currentTarget.innerText.replace(/[^\d.\-]/g, "");
        const n = parseFloat(raw);
        if (!isNaN(n) && n >= min) onChange(n);
        else if (raw === "" || raw === "-") onChange(0);
      }}
      onBlur={(e: any) => {
        const n = parseFloat(e.currentTarget.innerText);
        e.currentTarget.innerText = String(isNaN(n) ? 0 : n);
      }}
      onKeyDown={(e: any) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
    />
  );
}

export default function QuickInvoice() {
  const [inv, setInv] = useState<Invoice>(() => blankInvoice());
  const [hydrated, setHydrated] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInv(loadInvoice()); setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(inv));
  }, [inv, hydrated]);

  const update = (patch: Partial<Invoice>) => setInv((p) => ({ ...p, ...patch }));
  const updateFrom = (patch: Partial<Invoice["from"]>) =>
    setInv((p) => ({ ...p, from: { ...p.from, ...patch } }));
  const updateTo = (patch: Partial<Invoice["to"]>) =>
    setInv((p) => ({ ...p, to: { ...p.to, ...patch } }));

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setInv((p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const addItem = () =>
    setInv((p) => ({ ...p, items: [...p.items, { id: uid(), description: "New item", qty: 1, rate: 0, subItems: [] }] }));
  const removeItem = (id: string) =>
    setInv((p) => ({ ...p, items: p.items.filter((it) => it.id !== id) }));
  const addSubItem = (itemId: string) =>
    setInv((p) => ({
      ...p,
      items: p.items.map((it) =>
        it.id === itemId
          ? { ...it, subItems: [...(it.subItems ?? []), { id: uid(), description: "Sub-item", qty: 1, rate: 0 }] }
          : it,
      ),
    }));
  const updateSubItem = (itemId: string, subId: string, patch: Partial<SubItem>) =>
    setInv((p) => ({
      ...p,
      items: p.items.map((it) =>
        it.id === itemId
          ? { ...it, subItems: (it.subItems ?? []).map((s) => (s.id === subId ? { ...s, ...patch } : s)) }
          : it,
      ),
    }));
  const removeSubItem = (itemId: string, subId: string) =>
    setInv((p) => ({
      ...p,
      items: p.items.map((it) =>
        it.id === itemId ? { ...it, subItems: (it.subItems ?? []).filter((s) => s.id !== subId) } : it,
      ),
    }));

  const lineAmount = (it: LineItem) =>
    it.qty * it.rate + (it.subItems ?? []).reduce((s, x) => s + x.qty * x.rate, 0);
  const subtotal = inv.items.reduce((s, it) => s + lineAmount(it), 0);
  const taxAmt = subtotal * (inv.taxPercent / 100);
  const discountAmt = inv.discountType === "percent" ? subtotal * (inv.discount / 100) : inv.discount;
  const total = Math.max(0, subtotal + taxAmt - discountAmt);

  const theme = THEMES[inv.theme];

  const handleLogo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => update({ logo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const newInvoice = () => {
    if (!confirm("Start a new invoice? Current invoice will be cleared.")) return;
    setInv(blankInvoice(nextInvoiceNumber(inv.invoiceNumber)));
  };
  const duplicate = () => {
    setInv({ ...inv, invoiceNumber: nextInvoiceNumber(inv.invoiceNumber), issueDate: todayISO(), dueDate: addDays(todayISO(), 30) });
  };

  const print = () => window.print();

  const downloadPDF = async () => {
    const el = paperRef.current; if (!el) return;
    el.classList.add("exporting");
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf().set({
        margin: 0.4,
        filename: `${inv.invoiceNumber || "invoice"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      }).from(el).save();
    } finally {
      el.classList.remove("exporting");
    }
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <div className="grid h-7 w-7 place-items-center rounded-md text-primary-foreground" style={{ background: theme.accent }}>Q</div>
            <span>QuickInvoice</span>
          </div>
          <div className="flex-1" />
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Currency</span>
            <select
              value={inv.currency}
              onChange={(e) => update({ currency: e.target.value })}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              {Object.keys(CURRENCIES).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-1.5">
            {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
              <button
                key={k}
                onClick={() => update({ theme: k })}
                aria-label={`Theme ${k}`}
                className={`h-6 w-6 rounded-full border-2 transition ${inv.theme === k ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ background: THEMES[k].accent }}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarBtn onClick={newInvoice}>New</ToolbarBtn>
            <ToolbarBtn onClick={duplicate}>Duplicate</ToolbarBtn>
            <ToolbarBtn onClick={print}>Print</ToolbarBtn>
            <ToolbarBtn onClick={downloadPDF} primary>Download PDF</ToolbarBtn>
          </div>
        </div>
      </div>

      {/* Invoice paper */}
      <div className="mx-auto mt-8 max-w-[850px] px-4">
        <div
          ref={paperRef}
          className="invoice-paper mx-auto rounded-lg bg-card p-10 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.15)] sm:p-14"
          style={{ aspectRatio: "auto" }}
        >
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              {inv.logo ? (
                <label className="block cursor-pointer">
                  <img src={inv.logo} alt="Logo" className="max-h-20 max-w-[200px] object-contain" />
                  <input type="file" accept="image/*" className="hidden no-print" onChange={(e) => e.target.files && handleLogo(e.target.files[0])} />
                  <button onClick={(e) => { e.preventDefault(); update({ logo: null }); }} className="no-print mt-2 text-xs text-muted-foreground hover:text-destructive">Remove logo</button>
                </label>
              ) : (
                <label className="no-print flex h-20 w-44 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary">
                  + Add logo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleLogo(e.target.files[0])} />
                </label>
              )}
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-bold tracking-tight" style={{ color: theme.text }}>INVOICE</h1>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-muted-foreground">Invoice #</span>
                  <Editable value={inv.invoiceNumber} onChange={(v) => update({ invoiceNumber: v })} className="font-medium" />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-muted-foreground">Issued</span>
                  <input type="date" value={inv.issueDate} onChange={(e) => update({ issueDate: e.target.value })}
                    className="rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-border focus:border-primary focus:outline-none" />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-muted-foreground">Due</span>
                  <input type="date" value={inv.dueDate} onChange={(e) => update({ dueDate: e.target.value })}
                    className="rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-border focus:border-primary focus:outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* From / To */}
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <Party label="From" theme={theme}>
              <Editable value={inv.from.name} onChange={(v) => updateFrom({ name: v })} className="block text-base font-semibold" placeholder="Your company" />
              <Editable value={inv.from.address} onChange={(v) => updateFrom({ address: v })} multiline as="div" className="mt-1 block text-sm text-muted-foreground" placeholder="Address" />
              <Editable value={inv.from.email} onChange={(v) => updateFrom({ email: v })} className="mt-1 block text-sm" placeholder="Email" />
              <Editable value={inv.from.phone} onChange={(v) => updateFrom({ phone: v })} className="block text-sm" placeholder="Phone" />
            </Party>
            <Party label="Bill To" theme={theme}>
              <Editable value={inv.to.name} onChange={(v) => updateTo({ name: v })} className="block text-base font-semibold" placeholder="Client name" />
              <Editable value={inv.to.address} onChange={(v) => updateTo({ address: v })} multiline as="div" className="mt-1 block text-sm text-muted-foreground" placeholder="Address" />
              <Editable value={inv.to.email} onChange={(v) => updateTo({ email: v })} className="mt-1 block text-sm" placeholder="Email" />
            </Party>
          </div>

          {/* Line items */}
          <div className="mt-10">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: theme.soft, color: theme.text }}>
                  <th className="px-3 py-2 text-left font-medium">Description</th>
                  <th className="w-20 px-3 py-2 text-right font-medium">Qty</th>
                  <th className="w-28 px-3 py-2 text-right font-medium">Rate</th>
                  <th className="w-32 px-3 py-2 text-right font-medium">Amount</th>
                  <th className="no-print w-8" />
                </tr>
              </thead>
              <tbody>
                {inv.items.map((it) => (
                  <tr key={it.id} className="border-b border-border align-top">
                    <td className="px-3 py-3">
                      <Editable value={it.description} onChange={(v) => updateItem(it.id, { description: v })} multiline as="div" placeholder="Description" />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <NumberEditable value={it.qty} onChange={(n) => updateItem(it.id, { qty: n })} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <NumberEditable value={it.rate} onChange={(n) => updateItem(it.id, { rate: n })} />
                    </td>
                    <td className="px-3 py-3 text-right font-medium">{fmtMoney(it.qty * it.rate, inv.currency)}</td>
                    <td className="no-print px-1 py-3 text-right">
                      <button onClick={() => removeItem(it.id)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label="Remove">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addItem} className="no-print mt-3 text-sm font-medium" style={{ color: theme.accent }}>
              + Add line
            </button>
          </div>

          {/* Totals */}
          <div className="mt-8 flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <Row label="Subtotal">{fmtMoney(subtotal, inv.currency)}</Row>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Tax (<NumberEditable value={inv.taxPercent} onChange={(n) => update({ taxPercent: n })} />%)
                </span>
                <span>{fmtMoney(taxAmt, inv.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Discount
                  <button
                    onClick={() => update({ discountType: inv.discountType === "flat" ? "percent" : "flat" })}
                    className="no-print ml-1 rounded border border-border px-1 text-xs hover:bg-muted"
                    title="Toggle flat / percent"
                  >
                    {inv.discountType === "flat" ? CURRENCIES[inv.currency] : "%"}
                  </button>{" "}
                  <NumberEditable value={inv.discount} onChange={(n) => update({ discount: n })} />
                </span>
                <span>−{fmtMoney(discountAmt, inv.currency)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t-2 pt-3" style={{ borderColor: theme.accent }}>
                <span className="text-base font-semibold" style={{ color: theme.text }}>Total</span>
                <span className="text-2xl font-bold" style={{ color: theme.text }}>{fmtMoney(total, inv.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-12 border-t border-border pt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: theme.accent }}>Notes & Terms</div>
            <Editable value={inv.notes} onChange={(v) => update({ notes: v })} multiline as="div" className="block text-sm text-muted-foreground" placeholder="Payment terms, thank-you note, etc." />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({ children, onClick, primary }: { children: ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        primary
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "border border-border bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Party({ label, theme, children }: { label: string; theme: { accent: string }; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: theme.accent }}>{label}</div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

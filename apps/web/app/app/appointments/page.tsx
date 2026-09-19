"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { fetchAppointmentCalendar, type CalendarAppointment } from "@/lib/appointmentsCalendarApi";
import { facilityMonthBounds } from "@/lib/facilityCalendarBounds";
import { AddAppointmentForm } from "@/features/appointments/AddAppointmentForm";

const colors = ["#0879e8", "#079981", "#f8b51b", "#f53681", "#7838db", "#ff692f"];
const isoDay = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
const dayInZone = (instant: string, zone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  return ["year", "month", "day"].map((key) => parts.find((part) => part.type === key)?.value).join("-");
};
const strings = {
  en: { title: "Appointments", subtitle: "View and manage patient appointments. Click on a date to see the list of appointments.", today: "Today", add: "Add Appointment", search: "Search by patient name or reason...", all: "All Providers", time: "Time", patient: "Patient", reason: "Reason", provider: "Provider", status: "Status", actions: "Actions", visits: "Visits", empty: "No appointments for this day", retry: "Retry", more: "Load more", loading: "Loading appointments...", failed: "Unable to load appointments", month: "Month", week: "Week", day: "Day", details: "Appointment Details", date: "Date", selected: "Appointments for", unavailable: "Not available in this phase" },
  es: { title: "Citas", subtitle: "Consulte y gestione las citas. Seleccione una fecha para ver la lista.", today: "Hoy", add: "Añadir cita", search: "Buscar por paciente o motivo...", all: "Todos los proveedores", time: "Hora", patient: "Paciente", reason: "Motivo", provider: "Proveedor", status: "Estado", actions: "Acciones", visits: "Visitas", empty: "No hay citas para este día", retry: "Reintentar", more: "Cargar más", loading: "Cargando citas...", failed: "No se pudieron cargar las citas", month: "Mes", week: "Semana", day: "Día", details: "Detalles de la cita", date: "Fecha", selected: "Citas para", unavailable: "No disponible en esta fase" },
  fr: { title: "Rendez-vous", subtitle: "Consultez et gérez les rendez-vous. Choisissez une date pour voir la liste.", today: "Aujourd'hui", add: "Ajouter un rendez-vous", search: "Rechercher un patient ou un motif...", all: "Tous les praticiens", time: "Heure", patient: "Patient", reason: "Motif", provider: "Praticien", status: "Statut", actions: "Actions", visits: "Visites", empty: "Aucun rendez-vous ce jour", retry: "Réessayer", more: "Charger plus", loading: "Chargement des rendez-vous...", failed: "Impossible de charger les rendez-vous", month: "Mois", week: "Semaine", day: "Jour", details: "Détails du rendez-vous", date: "Date", selected: "Rendez-vous du", unavailable: "Indisponible à cette étape" },
};
const panel: React.CSSProperties = { background: "#fff", border: "1px solid #d5e2f6", borderRadius: 12, padding: 16, minWidth: 0 };
const control: React.CSSProperties = { border: "1px solid #cbd8ec", borderRadius: 6, padding: "9px 12px", background: "#fff", color: "#172b4d", cursor: "pointer" };

export default function AppointmentsPage() {
  const { facilityId, ready, roles, facilityTimeZone } = useFacilityAndRoles();
  const { language } = useI18n();
  // The authenticated app shell bridges the registered active-facility language into useI18n.
  // Never offer a page-local language switch or read a staff browser preference here.
  const locale = language === "es" ? "es" : language === "fr" ? "fr" : "en";
  const s = strings[locale as keyof typeof strings];
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => isoDay(new Date()));
  const [items, setItems] = useState<CalendarAppointment[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [zone, setZone] = useState("UTC");
  const [total, setTotal] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [focused, setFocused] = useState<CalendarAppointment | null>(null);
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const canView = roles.some((role) => ["FRONT_DESK", "ADMIN", "PROVIDER", "RN"].includes(role));
  const load = useCallback(async (offset = 0) => {
    if (!facilityId || !canView || !facilityTimeZone) return;
    setLoading(true); setError(false);
    try {
      const { from, to } = facilityMonthBounds(month, facilityTimeZone);
      const result = await fetchAppointmentCalendar(facilityId, from, to, offset);
      setItems((previous) => offset ? [...previous, ...result.items] : result.items);
      setCounts(result.dailyCounts); setZone(result.timezone);
      setTotal(result.total);
      setNext(result.hasMore && result.nextOffset !== null && result.nextOffset > offset ? result.nextOffset : null);
    } catch { setError(true); if (!offset) { setItems([]); setCounts({}); setNext(null); } }
    finally { setLoading(false); }
  }, [facilityId, canView, month, facilityTimeZone]);
  useEffect(() => { void load(); }, [load]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = useMemo(() => {
    const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month.getFullYear(), month.getMonth()]);
  const selectedDate = new Date(selected + "T12:00:00");
  const weekStart = new Date(selectedDate);
  weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
  const displayedDays = view === "month" ? days : view === "day" ? [selectedDate] :
    Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
  const dayItems = items.filter((item) => dayInZone(item.scheduledStartAt, zone) === selected);
  const providers = [...new Set(dayItems.map((item) => item.providerName).filter((name): name is string => Boolean(name)))];
  const visible = dayItems.filter((item) => (!provider || item.providerName === provider) && `${item.patientName ?? ""} ${item.reason ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const displayDate = (value: string) => new Date(value + "T12:00:00").toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const time = (value: string) => new Date(value).toLocaleTimeString(locale, { timeZone: zone, hour: "numeric", minute: "2-digit" });
  const move = (n: number) => {
    const d = view === "month" ? new Date(month.getFullYear(), month.getMonth() + n, 1) : new Date(selected + "T12:00:00");
    if (view !== "month") d.setDate(d.getDate() + n * (view === "week" ? 7 : 1));
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelected(isoDay(d)); setFocused(null);
  };
  if (!ready || !facilityTimeZone) return <p>{s.loading}</p>;
  if (!canView) return <p role="alert">{s.unavailable}</p>;
  return <main style={{ color: "#172b4d", padding: 6 }}>
    {adding && facilityId && <AddAppointmentForm key={facilityId} facilityId={facilityId} onClose={() => setAdding(false)} onCreated={() => void load()} />}
    <header style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <div><h1 style={{ margin: 0, fontSize: 30 }}>🗓️ {s.title}</h1><p style={{ color: "#62738f", margin: "5px 0" }}>{s.subtitle}</p></div>
      <button type="button" style={{ ...control, background: "#008d85", color: "#fff" }} onClick={() => setAdding(true)} disabled={!roles.some((role) => ["FRONT_DESK", "ADMIN", "PROVIDER"].includes(role))}>{"+ " + s.add}</button>
    </header>
    <nav aria-label={s.title} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 6 }}>{[s.title, "Today's Visits", "Nursing / MA", "Billing", "Laboratory"].map((tab, i) => <span key={tab} style={{ ...control, background: i === 0 ? "#e7f2ff" : "#fff" }}>{tab}</span>)}</div>
      <div style={{ display: "flex", gap: 8 }}><button style={control} onClick={() => { const d = new Date(); setMonth(d); setSelected(isoDay(d)); }}>{s.today}</button><button style={control} onClick={() => move(-1)} aria-label="Previous month">‹</button><strong style={{ padding: 9 }}>{first.toLocaleDateString(locale, { month: "long", year: "numeric" })}</strong><button style={control} onClick={() => move(1)} aria-label="Next month">›</button>{(["month", "week", "day"] as const).map((mode) => <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)} style={{ ...control, background: view === mode ? "#e7f2ff" : "#fff" }}>{s[mode]}</button>)}</div>
    </nav>
    {error && <p role="alert" style={{ color: "#b91c1c" }}>{s.failed} <button onClick={() => void load()}>{s.retry}</button></p>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 12 }}>
      <section style={panel}><h2 style={{ marginTop: 0 }}>{first.toLocaleDateString(locale, { month: "long", year: "numeric" })}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>{displayedDays.slice(0, 7).map((d) => <div key={isoDay(d)} style={{ textAlign: "center", padding: "8px 0", fontSize: 12 }}>{d.toLocaleDateString(locale, { weekday: "short" })}</div>)}</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${view === "day" ? 1 : 7}, minmax(0, 1fr))` }}>{displayedDays.map((d) => { const key = isoDay(d), count = counts[key] ?? 0, current = d.getMonth() === month.getMonth(); return <button key={key} type="button" onClick={() => { setSelected(key); if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setFocused(null); }} aria-pressed={selected === key} style={{ minHeight: 66, border: "1px solid #e0e9f6", background: selected === key ? "#e8f3ff" : "#fff", color: current ? "#142846" : "#a1aec2", cursor: "pointer" }}><span style={{ display: "inline-block", background: selected === key ? "#0879e8" : "transparent", color: selected === key ? "#fff" : "inherit", borderRadius: 30, padding: "5px 9px" }}>{d.getDate()}</span><br/>{count > 0 && <small title={`${count} appointments`} style={{ color: colors[d.getDate() % colors.length] }}>● {count}</small>}</button>; })}</div>
        <p style={{ fontSize: 12, color: "#62738f" }}>{loading ? s.loading : `${total} ${s.title.toLowerCase()}`}</p>
      </section>
      <section style={panel}><h2 style={{ marginTop: 0, fontSize: 20 }}>{s.selected} <span style={{ color: "#1241a1" }}>{displayDate(selected)}</span> <small style={{ fontSize: 12, color: "#0879e8" }}>({counts[selected] ?? 0})</small></h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><input aria-label={s.search} placeholder={s.search} value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...control, flex: 1, minWidth: 0 }}/><select aria-label={s.all} value={provider} onChange={(e) => setProvider(e.target.value)} style={control}><option value="">{s.all}</option>{providers.map((name) => <option key={name}>{name}</option>)}</select></div>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr>{[s.time, s.patient, s.reason, s.provider, s.status, s.actions].map((h) => <th key={h} style={{ textAlign: "left", padding: 9, background: "#f2f6fd" }}>{h}</th>)}</tr></thead><tbody>{visible.map((item) => <tr key={item.id} style={{ borderBottom: "1px solid #e4eaf4", background: focused?.id === item.id ? "#e8f3ff" : "#fff" }}><td style={{ padding: 9, whiteSpace: "nowrap" }}>{time(item.scheduledStartAt)}</td><td style={{ padding: 9 }}>{item.patientName ?? "—"}</td><td style={{ padding: 9 }}>{item.reason ?? "—"}</td><td style={{ padding: 9 }}>{item.providerName ?? "—"}</td><td style={{ padding: 9 }}>{item.status}</td><td style={{ padding: 9 }}><button style={control} onClick={() => setFocused(item)} aria-label={s.details}>•••</button></td></tr>)}</tbody></table></div>
        {!visible.length && !loading && <p>{s.empty}</p>}
        {next !== null && <button style={{ ...control, marginTop: 12 }} disabled={loading} onClick={() => void load(next)}>{s.more}</button>}
      </section>
    </div>
    {focused && <section style={{ ...panel, marginTop: 16 }}><h2>{focused.patientName ?? s.patient}</h2><p>{s.details}: {displayDate(dayInZone(focused.scheduledStartAt, zone))} · {time(focused.scheduledStartAt)} · {focused.reason ?? "—"} · {focused.providerName ?? "—"} · {focused.status}</p><p>{s.visits}: {s.unavailable}</p></section>}
  </main>;
}

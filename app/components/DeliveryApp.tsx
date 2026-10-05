"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Delivery } from "@/lib/storage";
import { listDeliveries, createDelivery, updateDelivery, deleteDelivery } from "@/lib/storage";
import {
  buildDeliveryCsv, filterDeliveries, getRouteTypes,
  routeTypeLabel, summarizeRoutes, UNCLASSIFIED_ROUTE,
} from "@/lib/route-types";

type View = "resumen" | "registrar" | "historial" | "informes";
type ReportPeriod = "day" | "week" | "month";

const DEFAULT_COMPANIES = [
  "Empresa Demo Norte",
  "Empresa Demo Sur",
  "Empresa Demo Centro",
];

const COMPANY_COLORS = [
  "#16756a",
  "#f39b4a",
  "#6375d8",
  "#d75f65",
  "#6e9d52",
  "#9a6bc2",
];

const NAV_ITEMS: { id: View; label: string; icon: string }[] = [
  { id: "resumen", label: "Resumen", icon: "⌂" },
  { id: "registrar", label: "Registrar", icon: "+" },
  { id: "historial", label: "Historial", icon: "≡" },
  { id: "informes", label: "Informes", icon: "▥" },
];

const numberFormatter = new Intl.NumberFormat("es-CL");

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatDate(value: string, short = false) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: short ? undefined : "short",
    day: "numeric",
    month: short ? "short" : "long",
    year: short ? undefined : "numeric",
  }).format(parseDate(value));
}

function getPeriodRange(period: ReportPeriod, anchor: string) {
  const date = parseDate(anchor);

  if (period === "day") {
    return { start: anchor, end: anchor };
  }

  if (period === "week") {
    const day = date.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = addDays(date, mondayOffset);
    return { start: localDate(monday), end: localDate(addDays(monday, 6)) };
  }

  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: localDate(start), end: localDate(end) };
}

function periodLabel(period: ReportPeriod, start: string, end: string) {
  if (period === "day") {
    return formatDate(start);
  }

  if (period === "week") {
    return `${formatDate(start, true)} — ${formatDate(end, true)}`;
  }

  return new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
  }).format(parseDate(start));
}

function dateSeries(start: string, end: string, deliveries: Delivery[]) {
  const totals = new Map<string, number>();
  for (const delivery of deliveries) {
    totals.set(delivery.date, (totals.get(delivery.date) ?? 0) + delivery.quantity);
  }

  const points: { date: string; total: number }[] = [];
  let cursor = parseDate(start);
  const last = parseDate(end);

  while (cursor <= last) {
    const date = localDate(cursor);
    points.push({ date, total: totals.get(date) ?? 0 });
    cursor = addDays(cursor, 1);
  }

  return points;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No fue posible completar la acción.";
}

export function DeliveryApp() {
  const [view, setView] = useState<View>("resumen");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const today = localDate();

  const loadDeliveries = useCallback(async () => {
    try {
      setError("");
      setDeliveries(listDeliveries());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDeliveries();
  }, [loadDeliveries]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const todayDeliveries = useMemo(
    () => deliveries.filter((delivery) => delivery.date === today),
    [deliveries, today],
  );
  const todayTotal = todayDeliveries.reduce(
    (sum, delivery) => sum + delivery.quantity,
    0,
  );
  const todayCompanies = new Set(todayDeliveries.map((item) => item.company)).size;

  const installApp = async () => {
    setToast("Esta versión es una demo local. La aplicación empresarial incluye instalación PWA.");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <button
          className="brand"
          type="button"
          onClick={() => setView("resumen")}
          aria-label="Ir al resumen"
        >
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>
            <strong>Control de</strong>
            <strong>Paquetes</strong>
          </span>
        </button>

        <nav className="desktop-nav">
          {NAV_ITEMS.map((item) => (
            <button
              className={view === item.id ? "nav-item active" : "nav-item"}
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" aria-hidden="true" />
          <span>
            <strong>Demo de portafolio</strong>
            <small>Registros ficticios en memoria</small>
          </span>
        </div>
      </aside>

      <main className="main">
        <p className="demo-notice" role="note">Demo de portafolio · Datos ficticios. Los cambios y las fotos solo permanecen en esta pestaña y se reinician al recargar.</p>
        <header className="topbar">
          <div>
            <p className="eyebrow">{formatDate(today)}</p>
            <h1>
              {view === "resumen" && "Resumen"}
              {view === "registrar" && "Agregar paquetes"}
              {view === "historial" && "Historial de entregas"}
              {view === "informes" && "Informes y resultados"}
            </h1>
            <p className="topbar-description">
              {view === "resumen" && "Revisa el avance de tus entregas de un vistazo."}
              {view === "registrar" &&
                "Registra varios paquetes a la vez y adjunta fotos si lo necesitas."}
              {view === "historial" &&
                "Consulta comentarios, cantidades y fotos de cada registro."}
              {view === "informes" &&
                "Analiza los paquetes entregados por empresa, día y fecha."}
            </p>
          </div>
          <button className="install-button" type="button" onClick={installApp}>
            <span aria-hidden="true">⇩</span>
            Acerca de la demo
          </button>
        </header>

        {error && (
          <div className="alert" role="alert">
            <span aria-hidden="true">!</span>
            <p>{error}</p>
            <button type="button" onClick={() => void loadDeliveries()}>
              Reintentar
            </button>
          </div>
        )}

        {view === "resumen" && (
          <Dashboard
            deliveries={deliveries}
            loading={loading}
            today={today}
            todayTotal={todayTotal}
            todayCompanies={todayCompanies}
            onRegister={() => setView("registrar")}
            onReports={() => setView("informes")}
          />
        )}

        {view === "registrar" && (
          <DeliveryForm
            routeTypes={getRouteTypes(deliveries)}
            companies={Array.from(
              new Set([
                ...DEFAULT_COMPANIES,
                ...deliveries.map((delivery) => delivery.company),
              ]),
            ).sort((a, b) => a.localeCompare(b, "es"))}
            saving={saving}
            setSaving={setSaving}
            onSaved={async () => {
              await loadDeliveries();
              setToast("Entrega guardada correctamente.");
              setView("resumen");
            }}
          />
        )}

        {view === "historial" && (
          <History
            deliveries={deliveries}
            loading={loading}
            onUpdated={async () => {
              await loadDeliveries();
              setToast("Registro actualizado correctamente.");
            }}
            onDeleted={async () => {
              await loadDeliveries();
              setToast("El registro fue eliminado.");
            }}
          />
        )}

        {view === "informes" && <Reports deliveries={deliveries} />}
      </main>

      <nav className="mobile-nav" aria-label="Navegación principal">
        {NAV_ITEMS.map((item) => (
          <button
            className={view === item.id ? "mobile-nav-item active" : "mobile-nav-item"}
            key={item.id}
            type="button"
            onClick={() => {
              setView(item.id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-current={view === item.id ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}

function Dashboard({
  deliveries,
  loading,
  today,
  todayTotal,
  todayCompanies,
  onRegister,
  onReports,
}: {
  deliveries: Delivery[];
  loading: boolean;
  today: string;
  todayTotal: number;
  todayCompanies: number;
  onRegister: () => void;
  onReports: () => void;
}) {
  const weekStart = localDate(addDays(parseDate(today), -6));
  const weekDeliveries = deliveries.filter(
    (delivery) => delivery.date >= weekStart && delivery.date <= today,
  );
  const weekTotal = weekDeliveries.reduce(
    (sum, delivery) => sum + delivery.quantity,
    0,
  );
  const weekPoints = dateSeries(weekStart, today, weekDeliveries);
  const max = Math.max(1, ...weekPoints.map((point) => point.total));
  const recent = deliveries.slice(0, 4);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-content">
          <span className="hero-kicker">Resumen de hoy</span>
          <div className="hero-number">
            {loading ? <span className="loading-line wide" /> : numberFormatter.format(todayTotal)}
          </div>
          <p>paquetes entregados</p>
          <button className="primary-button light" type="button" onClick={onRegister}>
            <span aria-hidden="true">+</span>
            Registrar entrega
          </button>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="route-line route-one" />
          <div className="route-line route-two" />
          <div className="route-pin pin-one">1</div>
          <div className="route-pin pin-two">2</div>
          <div className="route-pin pin-three">✓</div>
          <div className="parcel-shape">
            <span />
          </div>
        </div>
      </section>

      <section className="stat-grid" aria-label="Indicadores de hoy">
        <article className="stat-card">
          <span className="stat-icon green" aria-hidden="true">▦</span>
          <div>
            <p>Empresas atendidas</p>
            <strong>{loading ? "—" : todayCompanies}</strong>
          </div>
          <span className="stat-note">hoy</span>
        </article>
        <article className="stat-card">
          <span className="stat-icon orange" aria-hidden="true">↗</span>
          <div>
            <p>Total últimos 7 días</p>
            <strong>{loading ? "—" : numberFormatter.format(weekTotal)}</strong>
          </div>
          <button className="text-button" type="button" onClick={onReports}>
            Ver informe
          </button>
        </article>
        <article className="stat-card">
          <span className="stat-icon violet" aria-hidden="true">✓</span>
          <div>
            <p>Registros de hoy</p>
            <strong>
              {loading
                ? "—"
                : deliveries.filter((delivery) => delivery.date === today).length}
            </strong>
          </div>
          <span className="stat-note">entregas</span>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Ritmo semanal</span>
              <h2>Paquetes por día</h2>
            </div>
            <span className="soft-badge">Últimos 7 días</span>
          </div>
          <div className="mini-chart" aria-label="Gráfico de entregas de los últimos siete días">
            {weekPoints.map((point) => (
              <div className="mini-chart-column" key={point.date}>
                <span className="bar-value">
                  {point.total ? numberFormatter.format(point.total) : ""}
                </span>
                <span
                  className="mini-bar"
                  style={{ height: `${Math.max(5, (point.total / max) * 100)}%` }}
                />
                <span className="bar-label">
                  {new Intl.DateTimeFormat("es-CL", { weekday: "narrow" }).format(
                    parseDate(point.date),
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Actividad</span>
              <h2>Entregas recientes</h2>
            </div>
          </div>
          {loading ? (
            <div className="loading-list" aria-label="Cargando entregas">
              <span />
              <span />
              <span />
            </div>
          ) : recent.length ? (
            <div className="recent-list">
              {recent.map((delivery, index) => (
                <article className="recent-row" key={delivery.id}>
                  <span
                    className="company-dot"
                    style={{
                      background: COMPANY_COLORS[index % COMPANY_COLORS.length],
                    }}
                  />
                  <div>
                    <strong>{delivery.company}</strong>
                    <small>{formatDate(delivery.date, true)}</small>
                  </div>
                  <span>{numberFormatter.format(delivery.quantity)} paquetes</span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              title="Tu historial comienza aquí"
              text="Registra la primera entrega para ver la actividad."
              action="Registrar ahora"
              onAction={onRegister}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function DeliveryForm({
  companies,
  routeTypes,
  saving,
  setSaving,
  onSaved,
}: {
  companies: string[];
  routeTypes: string[];
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [date, setDate] = useState(localDate());
  const [company, setCompany] = useState("");
  const [routeType, setRouteType] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [comments, setComments] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!company.trim()) {
      setFormError("Selecciona o escribe el nombre de una empresa.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("date", date);
      formData.set("company", company.trim());
      formData.set("routeType", routeType);
      formData.set("quantity", String(quantity));
      formData.set("comments", comments.trim());
      files.forEach((file) => formData.append("photos", file));

      createDelivery(formData);

      setCompany("");
      setQuantity(1);
      setComments("");
      setFiles([]);
      await onSaved();
    } catch (submitError) {
      setFormError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="form-layout">
      <form className="delivery-form panel" onSubmit={submit}>
        <div className="panel-heading form-heading">
          <div>
            <span className="section-kicker">Nuevo registro</span>
            <h2>Datos de la entrega</h2>
          </div>
          <span className="step-badge">1 registro</span>
        </div>

        {formError && <p className="form-error" role="alert">{formError}</p>}

        <div className="form-main-grid">
          <section className="form-section">
            <div className="form-section-heading">
              <strong>Información principal</strong>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Empresa</span>
                <input
                  type="text"
                  list="company-options"
                  placeholder="Ej. Empresa Demo Norte"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  maxLength={100}
                  autoComplete="organization"
                  required
                />
                <datalist id="company-options">
                  {companies.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </label>
              <label className="field">
                <span>Fecha de entrega</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </label>
            </div>

            <RouteTypeField value={routeType} onChange={setRouteType} options={routeTypes} listId="new-route-types" />

            <fieldset className="quantity-field">
              <legend>Cantidad por agregar</legend>
              <div className="quantity-row">
                <div className="quantity-control">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    aria-label="Restar un paquete"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(Math.max(1, Number(event.target.value) || 1))
                    }
                    aria-label="Cantidad de paquetes"
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((current) => Math.min(100000, current + 1))
                    }
                    aria-label="Sumar un paquete"
                  >
                    +
                  </button>
                </div>
                <div className="quick-quantities" aria-label="Cantidades rápidas">
                  {[10, 25, 50, 100].map((amount) => (
                    <button key={amount} type="button" onClick={() => setQuantity(amount)}>
                      {amount}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>

            <label className="field">
              <span>Observación <em>(opcional)</em></span>
              <textarea
                placeholder="Información adicional de la entrega de los paquetes..."
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                maxLength={2000}
                rows={5}
              />
              <small className="character-count">{comments.length}/2000</small>
            </label>
          </section>

          <section className="form-section photo-section">
            <div className="photo-field">
              <div className="photo-field-heading">
                <div>
                  <strong>Fotos de los paquetes <em>(opcional)</em></strong>
                  <span>Puedes agregar varias fotos a la vez.</span>
                </div>
                <button type="button" onClick={() => fileInput.current?.click()}>
                  <span aria-hidden="true">+</span>
                  Agregar fotos
                </button>
              </div>

              <input
                ref={fileInput}
                className="visually-hidden"
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []).slice(0, 5);
                  setFiles(selected);
                }}
              />

              {files.length ? (
                <>
                  <div className="photo-previews">
                    {files.map((file, index) => (
                      <div className="photo-preview" key={`${file.name}-${file.lastModified}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previews[index]} alt={`Vista previa de ${file.name}`} />
                        <button
                          type="button"
                          aria-label={`Quitar ${file.name}`}
                          onClick={() =>
                            setFiles((current) =>
                              current.filter((_, fileIndex) => fileIndex !== index),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {files.length < 5 && (
                      <button
                        className="add-photo-tile"
                        type="button"
                        onClick={() => fileInput.current?.click()}
                      >
                        <span className="camera-icon" aria-hidden="true">▣</span>
                        Agregar foto
                      </button>
                    )}
                  </div>
                  <button className="clear-photos" type="button" onClick={() => setFiles([])}>
                    Quitar todas
                  </button>
                </>
              ) : (
                <button
                  className="photo-dropzone"
                  type="button"
                  onClick={() => fileInput.current?.click()}
                >
                  <span className="camera-icon" aria-hidden="true">▣</span>
                  <strong>Agregar fotos</strong>
                  <small>Hasta 5 imágenes de 8 MB</small>
                </button>
              )}
            </div>
          </section>
        </div>

        <section className="form-summary">
          <div>
            <span className="section-kicker">Resumen de lo que se agregará</span>
            <div className="summary-items">
              <span><small>Empresa</small><strong>{company || "Sin seleccionar"}</strong></span>
              <span><small>Tipo de ruta</small><strong>{routeTypeLabel(routeType)}</strong></span>
              <span><small>Cantidad</small><strong>{numberFormatter.format(quantity)} paquetes</strong></span>
              <span><small>Fecha</small><strong>{formatDate(date, true)}</strong></span>
              <span><small>Fotos</small><strong>{files.length}</strong></span>
            </div>
          </div>
          <button className="primary-button submit-button" type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar paquetes"}
            {!saving && <span aria-hidden="true">→</span>}
          </button>
        </section>
      </form>

      <aside className="form-tip">
        <span aria-hidden="true">i</span>
        <div>
          <strong>Un registro claro da mejores informes</strong>
          <p>
            Usa siempre el mismo nombre para cada empresa. La app recordará las
            empresas ingresadas y las sugerirá la próxima vez.
          </p>
        </div>
      </aside>
    </section>
  );
}

function RouteTypeField({ value, onChange, options, listId }: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  listId: string;
}) {
  return (
    <label className="field route-type-field">
      <span>Tipo de ruta <em>(opcional)</em></span>
      <input type="text" list={listId} value={value} maxLength={60}
        placeholder="Escribe tu propia clasificación"
        onChange={(event) => onChange(event.target.value)} />
      <datalist id={listId}>
        {options.map((option) => <option key={option} value={option} />)}
      </datalist>
      <small>Los tipos que escribas se podrán elegir en los filtros.</small>
    </label>
  );
}

function RouteTypeFilter({ value, onChange, deliveries }: {
  value: string;
  onChange: (value: string) => void;
  deliveries: Delivery[];
}) {
  const options = getRouteTypes(deliveries);
  // Keep a selected type visible after editing its final matching record.
  if (value && value !== UNCLASSIFIED_ROUTE && !options.includes(value)) options.push(value);
  return (
    <label className="route-filter">
      <span>Tipo de ruta</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos los tipos</option>
        {options.map((option) => <option key={option} value={option}>{routeTypeLabel(option)}</option>)}
        <option value={UNCLASSIFIED_ROUTE}>Sin clasificar</option>
      </select>
    </label>
  );
}

function DeliveryEditor({ delivery, routeTypes, onSaved, onCancel }: {
  delivery: Delivery;
  routeTypes: string[];
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(delivery.date);
  const [company, setCompany] = useState(delivery.company);
  const [quantity, setQuantity] = useState(String(delivery.quantity));
  const [comments, setComments] = useState(delivery.comments);
  const [routeType, setRouteType] = useState(delivery.routeType ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      updateDelivery(delivery.id, { date, company, quantity: Number(quantity), comments, routeType });
      await onSaved();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="delivery-editor" onSubmit={submit} aria-label="Editar registro">
      {error && <p className="form-error" role="alert">{error}</p>}
      <fieldset disabled={saving}>
        <div className="edit-field-grid">
          <label className="field"><span>Empresa</span>
            <input value={company} onChange={(event) => setCompany(event.target.value)} maxLength={100} required />
          </label>
          <label className="field"><span>Fecha de entrega</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <label className="field"><span>Cantidad de paquetes</span>
            <input type="number" min={1} max={100000} step={1} value={quantity}
              onChange={(event) => setQuantity(event.target.value)} required />
          </label>
          <RouteTypeField value={routeType} onChange={setRouteType} options={routeTypes} listId={`edit-route-${delivery.id}`} />
        </div>
        <label className="field"><span>Observación</span>
          <textarea value={comments} onChange={(event) => setComments(event.target.value)} maxLength={2000} rows={3} />
        </label>
        <div className="edit-actions">
          <button className="primary-button" type="submit">{saving ? "Guardando…" : "Guardar cambios"}</button>
          <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button>
        </div>
      </fieldset>
    </form>
  );
}

function History({
  deliveries,
  loading,
  onDeleted,
  onUpdated,
}: {
  deliveries: Delivery[];
  loading: boolean;
  onDeleted: () => Promise<void>;
  onUpdated: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [routeType, setRouteType] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = filterDeliveries(deliveries, { query, from: date, to: date, routeType });

  const remove = async (delivery: Delivery) => {
    if (
      !window.confirm(
        `¿Eliminar la entrega de ${delivery.quantity} paquetes para ${delivery.company}?`,
      )
    ) {
      return;
    }

    setDeleting(delivery.id);
    try {
      deleteDelivery(delivery.id);
      await onDeleted();
    } catch (deleteError) {
      window.alert(getErrorMessage(deleteError));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="page-stack">
      <section className="filter-bar panel">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Buscar empresa, ruta u observación"
            aria-label="Buscar en empresa, tipo de ruta y observaciones"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="date-filter">
          <span>Fecha</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <RouteTypeFilter value={routeType} onChange={setRouteType} deliveries={deliveries} />
        {(query || date || routeType) && (
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setQuery("");
              setDate("");
              setRouteType("");
            }}
          >
            Limpiar
          </button>
        )}
      </section>

      <section className="panel history-panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Registros guardados</span>
            <h2>{filtered.length} entregas</h2>
          </div>
          <span className="soft-badge">
            {numberFormatter.format(
              filtered.reduce((sum, delivery) => sum + delivery.quantity, 0),
            )}{" "}
            paquetes
          </span>
        </div>

        {loading ? (
          <div className="loading-list">
            <span />
            <span />
            <span />
          </div>
        ) : filtered.length ? (
          <div className="history-list">
            {filtered.map((delivery, index) => (
              <article
                className={expanded === delivery.id ? "history-card expanded" : "history-card"}
                key={delivery.id}
              >
                <button
                  className="history-summary"
                  type="button"
                  onClick={() =>
                    setExpanded((current) =>
                      current === delivery.id ? null : delivery.id,
                    )
                  }
                  aria-expanded={expanded === delivery.id}
                >
                  <span
                    className="company-avatar"
                    style={{
                      background: COMPANY_COLORS[index % COMPANY_COLORS.length],
                    }}
                    aria-hidden="true"
                  >
                    {delivery.company.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="history-company">
                    <strong>{delivery.company}</strong>
                    <small>{formatDate(delivery.date)}</small>
                    <span className="route-badge">{routeTypeLabel(delivery.routeType)}</span>
                  </span>
                  <span className="history-quantity">
                    <strong>{numberFormatter.format(delivery.quantity)}</strong>
                    <small>paquetes</small>
                  </span>
                  <span className="chevron" aria-hidden="true">
                    {expanded === delivery.id ? "⌃" : "⌄"}
                  </span>
                </button>

                {expanded === delivery.id && (
                  <div className="history-details">
                    {editing === delivery.id ? (
                      <DeliveryEditor
                        delivery={delivery}
                        routeTypes={getRouteTypes(deliveries)}
                        onCancel={() => setEditing(null)}
                        onSaved={async () => {
                          await onUpdated();
                          setEditing(null);
                        }}
                      />
                    ) : (
                      <button className="secondary-button" type="button" disabled={deleting === delivery.id}
                        onClick={() => setEditing(delivery.id)}>Editar registro</button>
                    )}
                    {delivery.comments && (
                      <div className="detail-block">
                        <span>Comentarios</span>
                        <p>{delivery.comments}</p>
                      </div>
                    )}
                    {delivery.photos.length > 0 && (
                      <div className="detail-block">
                        <span>Fotos de respaldo</span>
                        <div className="saved-photos">
                          {delivery.photos.map((photo) => (
                            <a
                              href={photo.url}
                              target="_blank"
                              rel="noreferrer"
                              key={photo.id}
                              aria-label={`Abrir ${photo.fileName}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.url} alt={photo.fileName} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {!delivery.comments && !delivery.photos.length && (
                      <p className="no-details">Este registro no tiene comentarios ni fotos.</p>
                    )}
                    {editing !== delivery.id && <button
                      className="danger-button"
                      type="button"
                      disabled={deleting === delivery.id}
                      onClick={() => void remove(delivery)}
                    >
                      {deleting === delivery.id ? "Eliminando…" : "Eliminar registro"}
                    </button>}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No encontramos entregas"
            text="Prueba quitando los filtros o registra una nueva entrega."
          />
        )}
      </section>
    </div>
  );
}

function Reports({ deliveries }: { deliveries: Delivery[] }) {
  const [period, setPeriod] = useState<ReportPeriod>("week");
  const [anchor, setAnchor] = useState(localDate());
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("");
  const [routeType, setRouteType] = useState("");
  const range = getPeriodRange(period, anchor);
  const selected = filterDeliveries(deliveries, { from: range.start, to: range.end, query, company, routeType });
  const hasFilters = Boolean(query.trim() || company || routeType);
  const companyOptions = Array.from(new Set(deliveries.map((delivery) => delivery.company)))
    .sort((a, b) => a.localeCompare(b, "es"));
  const routeTotals = summarizeRoutes(selected);
  const total = selected.reduce((sum, delivery) => sum + delivery.quantity, 0);
  const daysWithDeliveries = new Set(selected.map((delivery) => delivery.date)).size;
  const companies = Array.from(
    selected.reduce((map, delivery) => {
      map.set(delivery.company, (map.get(delivery.company) ?? 0) + delivery.quantity);
      return map;
    }, new Map<string, number>()),
  )
    .map(([company, quantity]) => ({ company, quantity }))
    .sort((a, b) => b.quantity - a.quantity);
  const points = dateSeries(range.start, range.end, selected);
  const chartMax = Math.max(1, ...points.map((point) => point.total));

  const exportCsv = () => {
    const blob = new Blob([buildDeliveryCsv(selected)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `informe-paquetes-${range.start}-${range.end}${hasFilters ? "-filtrado" : ""}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-stack">
      <section className="report-controls panel">
        <div className="period-tabs" aria-label="Tipo de informe">
          {[
            { id: "day" as const, label: "Diario" },
            { id: "week" as const, label: "Semanal" },
            { id: "month" as const, label: "Mensual" },
          ].map((option) => (
            <button
              className={period === option.id ? "active" : ""}
              key={option.id}
              type="button"
              onClick={() => setPeriod(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="report-date">
          <span>Fecha de referencia</span>
          <input
            type={period === "month" ? "month" : "date"}
            value={period === "month" ? anchor.slice(0, 7) : anchor}
            onChange={(event) => {
              if (!event.target.value) return;
              setAnchor(
                period === "month"
                  ? `${event.target.value}-01`
                  : event.target.value,
              );
            }}
          />
        </label>
        <button
          className="secondary-button"
          type="button"
          onClick={exportCsv}
          disabled={!selected.length}
        >
          <span aria-hidden="true">⇩</span>
          Descargar CSV
        </button>
      </section>

      <section className="report-filters panel" aria-label="Filtros del informe">
        <label className="report-search">
          <span>Buscar en los registros</span>
          <input type="search" value={query} placeholder="Empresa, tipo de ruta u observación"
            onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="route-filter">
          <span>Empresa</span>
          <select value={company} onChange={(event) => setCompany(event.target.value)}>
            <option value="">Todas las empresas</option>
            {companyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <RouteTypeFilter value={routeType} onChange={setRouteType} deliveries={deliveries} />
        {hasFilters && <button className="secondary-button" type="button"
          onClick={() => { setQuery(""); setCompany(""); setRouteType(""); }}>Limpiar filtros</button>}
        <p className="filter-help">La búsqueda incluye lo que ya escribiste en las observaciones. Los filtros se combinan y también se aplican al CSV.</p>
      </section>

      <section className="report-hero">
        <div>
          <span className="hero-kicker">Informe {period === "day" ? "diario" : period === "week" ? "semanal" : "mensual"}</span>
          <h2>{periodLabel(period, range.start, range.end)}</h2>
          <p>{hasFilters ? "Resumen de los registros que coinciden con tus filtros." : "Resumen consolidado de paquetes entregados."}</p>
          {hasFilters && <p className="active-filter-summary">
            {[query.trim() && `Búsqueda: “${query.trim()}”`, company && `Empresa: ${company}`,
              routeType && `Tipo: ${routeType === UNCLASSIFIED_ROUTE ? "Sin clasificar" : routeTypeLabel(routeType)}`]
              .filter(Boolean).join(" · ")}
          </p>}
        </div>
        <div className="report-total">
          <strong>{numberFormatter.format(total)}</strong>
          <span>paquetes en total</span>
          <span>{numberFormatter.format(selected.length)} registros</span>
        </div>
      </section>

      <section className="stat-grid report-stats">
        <article className="stat-card">
          <span className="stat-icon green" aria-hidden="true">▦</span>
          <div>
            <p>Empresas</p>
            <strong>{companies.length}</strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon orange" aria-hidden="true">◷</span>
          <div>
            <p>Días con entregas</p>
            <strong>{daysWithDeliveries}</strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon violet" aria-hidden="true">÷</span>
          <div>
            <p>Promedio por día activo</p>
            <strong>
              {numberFormatter.format(
                daysWithDeliveries ? Math.round(total / daysWithDeliveries) : 0,
              )}
            </strong>
          </div>
        </article>
      </section>

      <section className="panel route-breakdown">
        <div className="panel-heading">
          <div><span className="section-kicker">Clasificación</span><h2>Por tipo de ruta</h2></div>
        </div>
        {routeTotals.length ? <div className="route-table-scroll"><table>
          <thead><tr><th scope="col">Tipo de ruta</th><th scope="col">Registros</th><th scope="col">Paquetes</th></tr></thead>
          <tbody>{routeTotals.map((row) => <tr key={row.routeType}>
            <th scope="row">{routeTypeLabel(row.routeType)}</th>
            <td>{numberFormatter.format(row.records)}</td><td>{numberFormatter.format(row.quantity)}</td>
          </tr>)}</tbody>
        </table></div> : <p className="filter-help">No hay registros para este periodo y estos filtros.</p>}
      </section>

      <div className="reports-grid">
        <section className="panel report-chart-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Evolución</span>
              <h2>Paquetes por día y fecha</h2>
            </div>
          </div>
          <div className="report-chart-scroll">
            <div
              className="report-chart"
              style={{ minWidth: `${Math.max(480, points.length * 44)}px` }}
              aria-label="Gráfico de paquetes entregados por fecha"
            >
              {points.map((point) => (
                <div className="report-bar-column" key={point.date}>
                  <span className="bar-value">
                    {point.total ? numberFormatter.format(point.total) : ""}
                  </span>
                  <span
                    className="report-bar"
                    style={{
                      height: `${Math.max(3, (point.total / chartMax) * 100)}%`,
                    }}
                  />
                  <span className="bar-date">
                    {new Intl.DateTimeFormat("es-CL", {
                      day: "2-digit",
                      month: "short",
                    }).format(parseDate(point.date))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel company-report">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Distribución</span>
              <h2>Por empresa</h2>
            </div>
          </div>
          {companies.length ? (
            <div className="company-breakdown">
              {companies.map((item, index) => {
                const percentage = total ? Math.round((item.quantity / total) * 100) : 0;
                return (
                  <article className="company-breakdown-row" key={item.company}>
                    <div className="company-breakdown-heading">
                      <span
                        className="company-dot"
                        style={{
                          background: COMPANY_COLORS[index % COMPANY_COLORS.length],
                        }}
                      />
                      <strong>{item.company}</strong>
                      <span>{numberFormatter.format(item.quantity)}</span>
                    </div>
                    <div className="progress-track">
                      <span
                        style={{
                          width: `${percentage}%`,
                          background: COMPANY_COLORS[index % COMPANY_COLORS.length],
                        }}
                      />
                    </div>
                    <small>{percentage}% del total</small>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              compact
              title="Sin datos en este periodo"
              text="Elige otra fecha, limpia los filtros o registra entregas para generar el informe."
            />
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  text,
  action,
  onAction,
  compact = false,
}: {
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "empty-state compact" : "empty-state"}>
      <span className="empty-icon" aria-hidden="true">□</span>
      <strong>{title}</strong>
      <p>{text}</p>
      {action && onAction && (
        <button className="text-button" type="button" onClick={onAction}>
          {action} →
        </button>
      )}
    </div>
  );
}

import type { Delivery } from "./storage";

export const UNCLASSIFIED_ROUTE = "__unclassified";

export function normalizeRouteType(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("es-CL");
}

export function routeTypeLabel(value: string | null | undefined) {
  const type = normalizeRouteType(value);
  return type || "Sin clasificar";
}

export function getRouteTypes(deliveries: Delivery[]) {
  return Array.from(new Set([
    ...deliveries.map((delivery) => normalizeRouteType(delivery.routeType)).filter(Boolean),
  ])).sort((a, b) => a.localeCompare(b, "es"));
}

export function filterDeliveries(
  deliveries: Delivery[],
  filters: { from?: string; to?: string; query?: string; company?: string; routeType?: string },
) {
  const normalizeSearch = (value: string) => value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  const words = normalizeSearch(filters.query?.trim() ?? "").split(/\s+/).filter(Boolean);
  return deliveries.filter((delivery) => {
    const type = normalizeRouteType(delivery.routeType);
    const text = normalizeSearch(`${delivery.company} ${type} ${delivery.comments}`);
    return (!filters.from || delivery.date >= filters.from)
      && (!filters.to || delivery.date <= filters.to)
      && (!filters.company || delivery.company === filters.company)
      && words.every((word) => text.includes(word))
      && (!filters.routeType || (filters.routeType === UNCLASSIFIED_ROUTE
        ? !type
        : type === normalizeRouteType(filters.routeType)));
  });
}

export function summarizeRoutes(deliveries: Delivery[]) {
  const totals = new Map<string, { routeType: string; records: number; quantity: number }>();
  for (const delivery of deliveries) {
    const type = normalizeRouteType(delivery.routeType);
    const row = totals.get(type) ?? { routeType: type, records: 0, quantity: 0 };
    row.records += 1;
    row.quantity += delivery.quantity;
    totals.set(type, row);
  }
  return Array.from(totals.values()).sort((a, b) => b.quantity - a.quantity);
}

export function buildDeliveryCsv(deliveries: Delivery[]) {
  const rows = [
    ["Fecha", "Empresa", "Cantidad", "Comentarios", "Tipo de ruta"],
    ...deliveries.map((delivery) => [
      delivery.date, delivery.company, String(delivery.quantity),
      delivery.comments, routeTypeLabel(delivery.routeType),
    ]),
  ];
  return "\uFEFF" + rows.map((row) => row.map((cell) => {
    // Prevent user-entered text from becoming a spreadsheet formula.
    const safe = /^[\s\u0000-\u001f]*[=+@-]/u.test(cell) ? "'" + cell : cell;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(",")).join("\n");
}

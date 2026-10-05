import { normalizeRouteType } from "./route-types";

export function validateDeliveryInput(input: Record<string, unknown>) {
  const date = typeof input.date === "string" ? input.date.trim() : "";
  const company = typeof input.company === "string" ? input.company.trim() : "";
  const comments = typeof input.comments === "string" ? input.comments.trim() : "";
  const quantity = typeof input.quantity === "number" || typeof input.quantity === "string"
    ? Number(input.quantity) : NaN;
  const routeType = normalizeRouteType(typeof input.routeType === "string" ? input.routeType : "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !Number.isFinite(Date.parse(`${date}T12:00:00Z`))
    || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) {
    return { error: "Selecciona una fecha válida." } as const;
  }
  if (!company || company.length > 100) {
    return { error: "Ingresa una empresa válida." } as const;
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
    return { error: "La cantidad debe ser un número entre 1 y 100.000." } as const;
  }
  if (comments.length > 2000) {
    return { error: "El comentario no puede superar los 2.000 caracteres." } as const;
  }
  if ((input.routeType != null && typeof input.routeType !== "string") || routeType.length > 60) {
    return { error: "El tipo de ruta debe tener hasta 60 caracteres." } as const;
  }
  return { data: { date, company, quantity, comments, routeType } } as const;
}

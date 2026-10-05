import { validateDeliveryInput } from "./delivery-validation";

export type DeliveryPhoto = { id: string; fileName: string; contentType: string; url: string };
export type Delivery = {
  id: string; date: string; company: string; routeType: string; quantity: number;
  comments: string; createdAt: string; photos: DeliveryPhoto[];
};

function dateAtOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Invented examples only. No database, environment variables or network client.
let rows: Delivery[] = [
  { id: "demo-1", date: dateAtOffset(0), company: "Empresa Demo Norte", routeType: "JOIN", quantity: 28, comments: "Registro ficticio para demostrar una ruta agrupada.", createdAt: new Date().toISOString(), photos: [] },
  { id: "demo-2", date: dateAtOffset(0), company: "Empresa Demo Sur", routeType: "EXTERNA", quantity: 16, comments: "Ejemplo ficticio de ruta externa.", createdAt: new Date().toISOString(), photos: [] },
  { id: "demo-3", date: dateAtOffset(-1), company: "Empresa Demo Centro", routeType: "RETIRO ESPECIAL", quantity: 9, comments: "Categoría personalizada de ejemplo.", createdAt: new Date().toISOString(), photos: [] },
  { id: "demo-4", date: dateAtOffset(-2), company: "Empresa Demo Norte", routeType: "", quantity: 12, comments: "Ejemplo sin clasificación.", createdAt: new Date().toISOString(), photos: [] },
];

export function listDeliveries(): Delivery[] {
  return structuredClone(rows).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function createDelivery(form: FormData) {
  const result = validateDeliveryInput(Object.fromEntries(["date", "company", "routeType", "quantity", "comments"].map(key => [key, form.get(key)])));
  if (result.error) throw new Error(result.error);
  const files = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > 5 || files.some(file => !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024)) {
    throw new Error("Agrega hasta 5 imágenes de 8 MB cada una.");
  }
  const delivery: Delivery = {
    id: crypto.randomUUID(), ...result.data!, createdAt: new Date().toISOString(),
    photos: files.map(file => ({ id: crypto.randomUUID(), fileName: file.name, contentType: file.type, url: URL.createObjectURL(file) })),
  };
  rows.unshift(delivery);
  return delivery.id;
}

export function updateDelivery(id: string, input: Record<string, unknown>) {
  const index = rows.findIndex(row => row.id === id);
  if (index < 0) throw new Error("El registro no existe.");
  const result = validateDeliveryInput(input);
  if (result.error) throw new Error(result.error);
  rows[index] = { ...rows[index], ...result.data! };
}

export function deleteDelivery(id: string) {
  const index = rows.findIndex(row => row.id === id);
  if (index < 0) throw new Error("El registro no existe.");
  rows[index].photos.forEach(photo => URL.revokeObjectURL(photo.url));
  rows.splice(index, 1);
}

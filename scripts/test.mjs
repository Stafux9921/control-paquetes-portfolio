import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const directory = await mkdtemp(path.join(tmpdir(), "paquetes-demo-test-"));
try {
  for (const name of ["route-types", "delivery-validation", "storage"]) {
    const source = await readFile(`lib/${name}.ts`, "utf8");
    const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
      .replaceAll('"./route-types"', '"./route-types.mjs"').replaceAll('"./delivery-validation"', '"./delivery-validation.mjs"');
    await writeFile(path.join(directory, `${name}.mjs`), output);
  }
  const storage = await import(pathToFileURL(path.join(directory, "storage.mjs")));
  const helpers = await import(pathToFileURL(path.join(directory, "route-types.mjs")));
  const before = storage.listDeliveries();
  const form = new FormData();
  for (const [key, value] of Object.entries({ date: "2026-10-05", company: "Empresa Prueba", routeType: "  ruta   especial ", quantity: "7", comments: "En estación" })) form.set(key, value);
  form.append("photos", new File([new Uint8Array([1, 2])], "ejemplo.png", { type: "image/png" }));
  const id = storage.createDelivery(form);
  const row = storage.listDeliveries().find(row => row.id === id);
  assert.equal(row.quantity, 7);
  assert.equal(row.routeType, "RUTA ESPECIAL");
  assert.ok(row.photos[0].url.startsWith("blob:"));
  const update = { ...row, quantity: 22, comments: "=1+1" };
  storage.updateDelivery(id, update);
  const updated = storage.listDeliveries().find(row => row.id === id);
  assert.deepEqual(updated.photos, row.photos);
  assert.equal(updated.createdAt, row.createdAt);
  for (const invalid of [{ quantity: 0 }, { quantity: 1.5 }, { date: "2026-02-30" }, { company: "" }, { routeType: "a".repeat(61) }]) assert.throws(() => storage.updateDelivery(id, { ...update, ...invalid }));
  assert.equal(storage.listDeliveries().find(row => row.id === id).quantity, 22);
  assert.deepEqual(helpers.filterDeliveries([row], { query: "estacion", company: "Empresa Prueba", routeType: "ruta especial", from: "2026-10-01", to: "2026-10-31" }), [row]);
  assert.equal(helpers.filterDeliveries([row], { query: "no existe" }).length, 0);
  assert.deepEqual(helpers.summarizeRoutes([row, { ...row, quantity: 3 }]), [{ routeType: "RUTA ESPECIAL", records: 2, quantity: 10 }]);
  assert.match(helpers.buildDeliveryCsv([updated]), /"'=1\+1"/);
  assert.equal(helpers.buildDeliveryCsv([updated]).charCodeAt(0), 0xfeff);
  storage.deleteDelivery(id);
  assert.deepEqual(storage.listDeliveries(), before);
  assert.throws(() => storage.deleteDelivery("missing"));
  // The adapted component must not contain calls to the removed server API.
  const component = await readFile("app/components/DeliveryApp.tsx", "utf8");
  assert.doesNotMatch(component, /fetch\s*\(|\/api\//);
  console.log("CRUD, fotos locales, validación, filtros y CSV: correctos.");
} finally {
  await rm(directory, { recursive: true, force: true });
}

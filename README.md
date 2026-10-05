# Control de Paquetes — demo de portafolio

Aplicación para registrar entregas por empresa, consultar historial y generar informes diarios, semanales y mensuales. Esta demo deriva de un servicio desarrollado para una empresa que lo utiliza diariamente.

**Autor:** Matías Ramírez ([Stafux9921](https://github.com/Stafux9921)), estudiante de Ingeniería en Informática en INACAP. Proyecto desarrollado con apoyo de agentes de IA para programación.

## Ejecutar

Requiere Node.js 22.13 o superior.

```sh
npm ci
npm run dev
```

Abre la dirección local que indica Vite. Para compilar: `npm run build`. Para verificar la lógica: `npm test`.

## Funciones

- Registro de cantidades, fechas, empresas y observaciones.
- Fotos locales de ejemplo: hasta cinco por registro.
- Edición y eliminación de registros de la demo.
- Búsqueda y filtros combinados por fecha, empresa, texto y tipo de ruta configurable.
- Resúmenes por empresa y ruta, gráficos e informes diarios, semanales y mensuales.
- Exportación CSV de los registros filtrados, con protección frente a fórmulas de hoja de cálculo.
- Interfaz adaptable a móvil y escritorio.

## Arquitectura de esta demo

React y TypeScript para la interfaz; Vite para desarrollo y compilación. Las funciones de filtros, validación y CSV están separadas de la interfaz. Un adaptador en memoria sustituye las operaciones del servidor.

No hay base de datos, backend, credenciales, variables de entorno, identificadores de alojamiento, conexiones a producción ni historial Git del servicio original. Los registros incluidos son inventados. Las modificaciones y las fotos se mantienen únicamente en memoria durante la sesión de esta pestaña; recargar restaura los ejemplos. Las imágenes seleccionadas se muestran con URLs `blob:` y no se suben a un servidor.

La política de contenido de la demo limita las conexiones al mismo origen y al servidor local de desarrollo. No incluye telemetría ni integraciones externas.

La aplicación empresarial original utiliza almacenamiento persistente y funciones PWA. Esta copia conserva los flujos de gestión para poder revisarlos sin acceder a información de la empresa. No es una versión lista para operar con datos reales ni un reemplazo del servicio empresarial.

## Verificación

`npm test` comprueba creación, edición, eliminación, rechazo de valores inválidos, preservación de fotos, filtros, agregación y CSV. `npm run build` verifica TypeScript y genera la versión estática.

No se incluye una licencia que conceda derechos sobre el servicio empresarial. El repositorio presenta una adaptación para evaluación del portafolio.

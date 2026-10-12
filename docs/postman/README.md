# Colección Postman — SportSpace

Archivo: [SportSpace.postman_collection.json](SportSpace.postman_collection.json)

## Cómo usarla

1. API en marcha: `npm run dev:api` (`http://localhost:3000`).
2. Postman → **Import** → el JSON de esta carpeta.
3. Orden sugerido en **Spaces**: GET catalog → POST space → GET by id → PATCH edit → GET catalog → PATCH deactivate → GET catalog.

Tras **POST space**, el `id` queda en la variable de colección `spaceId`.

Aún no hay JWT: los guards de Carlos son stubs y dejan pasar las peticiones.

## Mantenimiento

Si se agrega, cambia o elimina un endpoint, actualizar esta colección **en el mismo PR**. No dejar Postman desfasado respecto a `apps/api`.

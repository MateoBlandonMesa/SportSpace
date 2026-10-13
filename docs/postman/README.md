# Colección Postman — SportSpace

Archivo: [SportSpace.postman_collection.json](SportSpace.postman_collection.json)

## Cómo usarla

1. API en marcha: `npm run dev:api` (`http://localhost:3000`).
2. Postman → **Import** → el JSON de esta carpeta.
3. Orden: **Auth → POST register → POST login** (guarda `accessToken`) → Spaces.

Tras **POST space**, el `id` queda en `spaceId`. Las rutas protegidas envían `Authorization: Bearer {{accessToken}}`.

Disponibilidad: **GET** `/api/spaces/{{spaceId}}/availability?date=YYYY-MM-DD`. Staff/admin: **PUT weekly-hours** y **POST blocks**.

En login, Postman debe enviar y guardar cookies (cookie jar) para **POST refresh**.

## Mantenimiento

Si se agrega, cambia o elimina un endpoint, actualizar esta colección **en el mismo PR**. No dejar Postman desfasado respecto a `apps/api`.

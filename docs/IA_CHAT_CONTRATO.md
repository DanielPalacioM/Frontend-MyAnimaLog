# Chat con la IA de MyAnimaLog: contrato con el IA-service

> La app del dueño (`/ia`, el mini chat y el botón de IA) ya está conectada a este contrato. La fuente es la colección de Postman del IA-service: [MyAnimaLog-IA-service.postman_collection.json](coleccion%20de%20postman/MyAnimaLog-IA-service.postman_collection.json) y sus dos entornos (`Local`, puerto 8083, y `Cloud Run`, con `baseUrl` por completar).

## Estado al 18 de noviembre de 2026

- **El gateway ya enruta `/api/ai/*`** (el mismo día, antes respondía `404`), **pero el IA-service no responde**: `POST /api/ai/chat` devuelve `503 AI service is currently unavailable` en cada intento (5 seguidos en 45 s). Falta desplegarlo en Cloud Run y apuntar el gateway a él.
- Mientras no responda, la app muestra "Todavía no puedo responder" con un botón "Reintentar". No se inventan respuestas.
- Para probar sin pasar por el gateway: poner la dirección del servicio en `environment.ai.baseUrl` (la app llama a `<baseUrl>/api/ai/...`). El servicio tiene que permitir CORS desde `http://localhost:8100`.

## Endpoints que usa la app

Todos con el token del dueño (`Authorization: Bearer`). El `userId` sale del token, nunca del cuerpo.

| Método | Ruta | Uso en la app |
|---|---|---|
| `POST` | `/api/ai/chat` | Cada mensaje del chat completo y del mini chat |
| `POST` | `/api/ai/actions/{id}/confirm` | Botón "Confirmar" de una acción propuesta |
| `POST` | `/api/ai/actions/{id}/reject` | Botón "Cancelar" de una acción propuesta |
| `GET` | `/api/ai/conversations?limit=&offset=` | **Sin usar todavía** (ver "Pendientes") |
| `GET` | `/api/ai/conversations/{id}/messages` | **Sin usar todavía** |

### `POST /api/ai/chat` (`multipart/form-data`)

| Campo | Detalle |
|---|---|
| `message` | Texto. Opcional si hay archivos. |
| `conversationId` | Opcional. Sin él empieza una conversación; con él continúa. **El servidor guarda el historial**: la app no lo reenvía. |
| `files` | 0 a 5 archivos (PDF, JPG, PNG, WEBP; 10 MB cada uno). El tipo lo detecta el servidor por los primeros bytes. |
| `context` | **Pedido nuevo, ver más abajo.** JSON con la pantalla del usuario (mini chat). |

Respuesta `200`: `{ "reply", "model", "conversationId", "pendingAction": null | { "id", "descripcion", ... } }`.

La app guarda el `conversationId` y lo reenvía en el siguiente mensaje. Interpreta en `reply` párrafos, `**negrita**`, `` `código` ``, listas con `-` o `1.` y títulos con `#`; el HTML se escapa.

### Acciones que la IA propone

Crear mascota, agendar cita y registrar vacuna **nunca se escriben solas**: el chat responde con `pendingAction` y la app muestra una tarjeta "Acción propuesta" con **Confirmar** y **Cancelar**.
- Confirmar → `POST .../confirm` → `reply` empieza con "Listo: ...". La tarjeta queda "Confirmada".
- Cancelar → `POST .../reject` → la tarjeta queda "Cancelada" y se avisa que no se hizo ningún cambio.
- `404 PENDING_ACTION_NOT_FOUND` (ya confirmada, ajena o inexistente) → la tarjeta queda "Ya no está disponible".
- Si no hay conexión, la acción sigue pendiente para reintentar.

## Errores que la app distingue

| HTTP | `code` | Qué hace la app |
|---|---|---|
| 404 | `CONVERSATION_NOT_FOUND` | Descarta el `conversationId` guardado y reenvía el mismo mensaje como conversación nueva, **una sola vez y sin avisar** |
| 404 | `PENDING_ACTION_NOT_FOUND` | Marca la acción como no disponible |
| 400 | `INVALID_REQUEST` | "Escribe un mensaje o adjunta un archivo" |
| 415 | `UNSUPPORTED_ATTACHMENT_TYPE` | "Adjunta un PDF o una imagen" |
| 413 | — | "Archivo demasiado pesado" |
| 404 sin `code`, 405, 501, 502, 503, 504 | — | "El servicio de IA no está disponible" + Reintentar |
| 429 | — | "Me has escrito muy rápido" |
| sin conexión | — | "No pude conectarme" |
| 401 | — | La app renueva el token y reintenta una vez; si falla, cierra la sesión |

## Pedidos al backend

1. **Desplegar el IA-service** y conectarlo al gateway (hoy `503`). Completar `baseUrl` en el entorno `Cloud Run` de Postman.
2. **Campo `context` en `POST /api/ai/chat`** (nuevo). Es lo que permite que la IA sepa **en qué pantalla está el usuario** cuando escribe desde el mini chat, para pedirle cosas ahí mismo. La app ya lo manda:
   ```json
   { "screen": "pet-profile", "label": "Perfil de mascota", "petId": "uuid-opcional" }
   ```
   `screen` ∈ `home`, `pet-profile`, `calendar`, `shared-profiles`, `vet`, `maps`, `vaccines`, `medical-history`, `documents`, `notifications`, `profile`, `add-pet`... y `petId` solo aparece dentro del perfil de una mascota. Hoy el servicio puede ignorarlo; sin él, la IA no sabe dónde está el usuario.
3. **CORS** en el IA-service (si se llama directo) para `localhost:8100` y los dominios de Firebase Hosting.

## Pendientes en la app

- **Historial del servidor:** el historial de chats de la barra lateral se guarda **en el dispositivo**. El IA-service ya ofrece `GET /api/ai/conversations` y `.../messages`: cuando esté desplegado, se puede traer el historial del servidor para que el usuario lo vea en otro teléfono. Falta decidir si el del dispositivo se queda como caché.
- **Adjuntos en el mini chat:** solo el chat completo adjunta archivos.
- **Mascota de contexto:** hoy la IA deduce la mascota del mensaje; en el perfil de una mascota el `petId` del `context` ya la identifica.
- **Plan de pago:** `AiAccessService.canUseAi()` deja pasar a todos; cuando exista el plan, activar `environment.ai.requiresPlan` y conectar la comprobación.
- **Privacidad:** los archivos son datos de salud del dueño y de su mascota. Hay que mencionar en el aviso de tratamiento de datos que se analizan con IA y definir si el servicio los conserva (se recomienda que no).

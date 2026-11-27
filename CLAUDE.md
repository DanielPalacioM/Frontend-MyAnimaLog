# CLAUDE.md — MyAnimaLog (Frontend)

App para gestionar mascotas: perfil, historial médico, vacunas, calendario, documentos, perfiles compartidos y mapa de veterinarias. El siguiente frente de trabajo es la **parte de veterinaria (Vet)**; ver la sección al final.

## Stack
- **Ionic 8 + Angular 20 con NgModules.** Todo lleva `standalone: false`; no se usan componentes standalone.
- **Capacitor 7**, SCSS, `@fullcalendar/*` para el calendario, `jwt-decode`, y `@googlemaps/js-api-loader` v2 (`setOptions` / `importLibrary`).
- **Backend:** API Gateway en Cloud Run. `environment.apiUrl` = `https://pets-api-gateway-20369076707.us-central1.run.app/api`. Este repo no tiene el código del backend.

## Comandos
- **Local:** `ionic serve`. Tiene que ser el puerto **8100**, porque la key de Google Maps solo permite `localhost:8100`; `ng serve` usa el 4200 y ahí el mapa no carga.
- **Verificar que compila:** `npx ng build`.
- **Build de producción:** `npx ng build --configuration production`. Sale a `www/`.
- **Desplegar:** `firebase deploy --only hosting`. Proyecto `project-ea0d4de8-cedf-4542-8fa`, en https://project-ea0d4de8-cedf-4542-8fa.web.app
- **Aviso conocido:** el SCSS de `shared-profiles-home` pasa el límite de 10 kB. No bloquea.

## Git
- Se trabaja en la rama `dev`; la principal es `main`.
- Mensajes de commit en español, en minúscula, estilo "se agrego / se corrigio / se creo ...".
- `.firebase/hosting.*.cache` cambia en cada despliegue: no se commitea.
- `CONTEXTO-CLAUDE.md` son notas locales de sesión, sin versionar.

## Estructura (`src/app/`)
```
app-routing.module.ts   rutas con lazy loading; '**' redirige a /login
guards/                 sharedProfilesIntroGuard (la intro de perfiles compartidos se ve una vez por usuario)
interceptors/           AuthInterceptor (Bearer token) y BypassTunnelInterceptor
models/                 interfaces: vaccine, medical-history, calendar-event, pet-document, shared-profile, notification
services/<Nombre>Service/   un servicio por dominio (ver la tabla de abajo)
shared/shared.module.ts declara y exporta todos los componentes compartidos y la directiva ImgFallback
shared/components/      tab-bar, pet-card, vaccine-timeline-card, bottom-sheet, date-picker-field, tutorial-overlay, ...
views/<pantalla>/       un módulo por pantalla
```

### Patrón para una pantalla nueva
Copia la estructura de `views/maps/`:
1. `x.module.ts` importa `CommonModule`, `FormsModule`, `IonicModule`, `XRoutingModule` y `SharedModule`, y declara `XPage`.
2. `x-routing.module.ts` define `{ path: '', component: XPage }`.
3. `x.page.ts|html|scss` con `standalone: false`.
4. Registra la ruta con `loadChildren` en `app-routing.module.ts`, **antes** de la ruta `'**'`. Si una ruta no existe, la app manda al login: ese es el síntoma típico de una ruta mal declarada, por ejemplo `/x/:id` cuando solo está registrada `x`.
5. La pantalla va dentro de `<ion-content [fullscreen]="true">` y termina con `<app-tab-bar activeTab="...">`.

### Servicios y endpoints
| Servicio | Base | Notas |
|---|---|---|
| `authServices/auth.ts` | `/auth/*`, `/user/register` | Login local y con Google. Guarda `token`, `userId` (sacado del JWT) y `profileImage` en localStorage. |
| `PetService/pet.ts` | `/pets` | CRUD, foto, edad, `/pets/user/{ownerId}` |
| `VaccineService/vaccine/vaccine.ts` | `/vaccines` | Listar por `?petId=`, crear, actualizar. **No tiene GET por id ni DELETE.** |
| `MedicalHistoryService` | `/visits`, `/treatments`, `/lab`, `/surgery` | Las respuestas vienen como `{ success, data, count }` |
| `CalendarService` | `/calendar-events` | Tipos de evento: `VET_APPOINTMENT`, `MEDICATION`, `TREATMENT`, `GROOMING`, `OTHER` |
| `DocumentService` | `/pets/{petId}/documents` | Subida con `FormData` y `download-url` |
| `SharedProfileService` | `/pets/{id}/access`, `/invitations`, `/pets/shared` | Roles `OWNER` / `EDITOR` / `VIEWER` (`getMyRoleForPet`) |
| `ProfileService` | `/user/profile/{id}` | Ver un perfil ajeno da 403 (pasa en `loadCaregivers` del Home) |
| `NotificationService` | `/notifications` | |
| `MapsService/maps.ts` | Google Places (New) y Routes | Veterinarias cercanas, autocompletado, detalle y ruta |
| `VeterinaryService/veterinary.ts` | `/veterinary/links*`, `/veterinary/me/*` | Fase 4A del dueño: vista previa por código, vincularse (idempotente), mis clínicas, desvincularme, compartir y revocar mascotas, clínicas por mascota. Errores como `VetError` con `code`. |
| `AppointmentService/appointment.ts` | `environment.calendarUrl` (o `apiUrl`): `/veterinaries/{id}/services`, `/availability`, `/appointment-requests`, `/me/appointments`, `PATCH …/cancel` y `…/reschedule` | Citas con una clínica (calendar-service, servicio aparte del gateway). Errores como `AppointmentError` con `code`. Contrato en Postman "Calendar Microservice" y `docs/MYANIMALOG_VET_BACKEND_CONTRATO.md` §G–H. |
| `AiChatService/ai-chat.ts` | `POST /ai/chat` (multipart), `/ai/actions/{id}/confirm` y `/reject` | IA-service. El historial lo guarda el servidor (`conversationId`); las acciones (crear mascota, agendar cita, registrar vacuna) piden confirmación. Errores como `AiError` con `code`. **El gateway ya enruta `/api/ai/*` pero el servicio responde 503 (sin desplegar).** Contrato en `docs/IA_CHAT_CONTRATO.md` y Postman `MyAnimaLog-IA-service`. También guarda los chats por usuario en localStorage. |
| `AiConversationService` | — | Estado de la conversación compartido por el chat completo y el mini chat (enviar, reintentar, confirmar acciones, historial). |
| `TutorialService` | localStorage | Textos en `tutorial-content.ts` |

### Convenciones del código
- **Usuario actual:** `localStorage.getItem('userId')`. Muchos POST/PUT agregan `userId` al body.
- **Formato de los datos:** el backend mezcla camelCase y snake_case. Los servicios normalizan con `a.accessRole ?? a.access_role`. Mantén ese patrón.
- **Permisos:** las pantallas de una mascota calculan `canEdit = role !== 'VIEWER'`.
- **Fechas visibles:** `toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })`. Para filtrar o agrupar, usa la fecha cruda, nunca el texto ya formateado.
- **Errores:** `console.error('❌ ...', err)` y la pantalla sigue funcionando.
- **Tutoriales:** el elemento que se quiere resaltar lleva `data-tour="..."`. Los componentes `app-tutorial-overlay` y `app-tutorial-gallery` van dentro de `<ion-content>` con `slot="fixed"`, y su `:host` necesita `position:absolute; inset:0; pointer-events:none`.
- **Sin modo oscuro:** está desactivado a propósito en `global.scss`.

## Diseño
- Se sigue el diseño de Figma, pantalla por pantalla. El equipo se define como "frontends profesionales".
- **Colores:** morado `#4037BE`, naranja `#f5a623`, fondo menta `#F3FFFB`, texto `#1a1a2e`. Morados claros para fondos: `#F1F0FB` y `#F7F6FF`.
- **Fuentes:** `'Jua'` para títulos y `'Actor'` para texto.
- **Imágenes:** en `src/assets/images/<Seccion>/`, por ejemplo `Home_icons/`, que tiene `VetIcon.png`, `MyAnimaLogVetLogo.png`, `AsociationVet.png`, `UbiVet.png` y `dalmataVet.png`.

## Google Maps
- La key y el `mapId` (`e2b9dc397cc68605f7024cf8`) están en `environment*.ts`.
- La key está restringida a `localhost:8100` y a los dominios de Firebase Hosting, y solo puede usar Maps JS, Places (New) y Routes.
- El estilo del mapa se cambia en Google Cloud (Diseños de mapa), sin tocar código.
- Para ver el proyecto en Google Cloud hay que entrar con juandavidmartinez576@gmail.com.

## Parte Vet: estado actual
Lo que ya existe:
- **`/maps`:** busca veterinarias cercanas. Desde ahí se puede agendar una cita (`/calendar/add-event?type=VET_APPOINTMENT&title=&location=`), ver la ruta, llamar y abrir el sitio web.
- **`/vet` (`views/vet/`, 9 oct):** la ruta quedó unificada. La abren "Asociar veterinaria" y el acceso rápido "Vet" del Home, y la pestaña "Vet" del tab bar (`key: 'veterinary'`, `route: '/vet'`). Por ahora muestra el estado vacío de Figma ("VetAsosiation - empty", `858:83`), y "Empieza" lleva a `/maps`. La ilustración está en `assets/images/Vet/`.
- **Vincular y compartir (17 nov, Fase 4A, `views/vet/` + `views/pet-clinics/`):** `/vet` (vacío o Mis veterinarias), `/vet/link` (código, QR con jsQR y vista previa; acepta `?code=VET-XXXXXXXX`), `/vet/share/:vetId`, `/vet/detail/:vetId` (interruptor por mascota y desvincular) y `/pet-clinics/:id` (Clínicas con acceso, desde el menú del perfil de la mascota; solo el dueño). Rutas reales en `docs/coleccion de postman` (carpeta 11 de la colección más nueva; la de `Descargas` del 17 nov es más reciente que la del repo). **Sin probar contra el gateway:** devuelve 401 a cualquier ruta, así que falta un token para confirmar que está desplegado. No hay citas, directorio ni reclamos todavía; "Próxima cita", "Pedir cita" y "Última visita" del Figma quedan fuera.
- **Pruebas:** `ng test` completo no compila por specs de plantilla viejos; usa `npx ng test --watch=false --browsers=ChromeHeadless --ts-config=tsconfig.spec.vet.json --include=<spec>` (con `CHROME_BIN`).
- **Datos:** hoy la veterinaria es solo texto libre (`veterinarian` en vacunas y visitas, `vetName` en Pet). No hay modelo `Vet` ni servicio.

### Pedir cita y Mis citas (23 nov, `views/vet/vet-book/` y `views/vet/vet-appointments/`)
Hechas con la lógica completa y **sin conectar todavía**: solo falta llenar `environment.calendarUrl` con la URL de Calendar (`https://calendar-microservice-20369076707.us-central1.run.app/api`) y que Calendar permita CORS desde `localhost:8100` (en móvil nativo no hace falta). Probado solo con pruebas unitarias (`vet-appointments.spec.ts`); contra el backend real no.
- **`/vet/book/:vetId`** (Figma 2034:225/282/361): servicio → fecha y hora (tira de 5 días) → mascota y confirmar. Con `?appointmentId=` reprograma esa cita. Solo mascotas propias; si la elegida no está compartida se comparte y se sigue ("Compartir a X y pedir cita"); sin horas con menos de 1 h de anticipación; el precio queda fijo en la cita.
- **`/vet/appointments`** (`?veterinaryId=` filtra): próximas y anteriores con el estado en texto e ícono (`STATUS_VIEW`). Cancelar y reprogramar se bloquean fuera de plazo (24 h, o `cancellableUntil` si el backend lo manda) y explican por qué.
- **Entradas:** botón "Pedir cita" y "Ver mis citas con esta clínica" en `/vet/detail/:vetId`, y "Mis citas" en `/vet`. Las notificaciones `APPOINTMENT_*` abren Mis citas.
- **Horas libres:** `GET …/availability` no existe todavía; si responde 404 la app usa una cuadrícula local (L–V 8–12 y 14–18, sábado 8–12, cada 30 min) y avisa "la clínica confirma tu cita". Cuando el endpoint exista no hay que tocar nada.
  - **25 nov, verificado:** Calendar responde 404 a `/availability` y el horario de la clínica (`GET /api/veterinary/{id}/business-hours`) exige token de clínica (403 `CLINIC_CONTEXT_REQUIRED`), así que la app no puede saber el horario real. Calendar sí valida al crear (409 `SLOT_UNAVAILABLE`): la hora rechazada se marca como no disponible y no se vuelve a ofrecer. **Pedido al backend:** publicar `GET /veterinaries/{id}/availability?serviceId=&from=&to=` (token de dueño) con las franjas libres calculadas con horario de la clínica y de los empleados, bloqueos y citas existentes.
  - **26 nov: ya está publicado** en Calendar y la app lo usa (deja la cuadrícula local). Devuelve `{ days: [{ date, slots: [{ startsAt (UTC), endsAt, employeeId, employeeName }] }] }`; un día vacío puede ser cerrado, lleno o, si es hoy, sin tiempo (la app pide 1 h de anticipación), y el mensaje lo dice así. Ojo: `employeeName` viene con el id del empleado (bug del backend); la app no lo muestra.
- **Lógica pura** (fechas en hora de Bogotá, franjas, plazos, errores) en `shared/utils/appointment.util.ts`.
- **Pruebas:** `npx ng test --watch=false --browsers=ChromeHeadless --ts-config=tsconfig.spec.vet.json --include='src/**/vet-appointments.spec.ts'`.
- **Sin vincular (25 nov):** en la vista previa de `/vet/link` está "Vincularme y pedir cita" (o "Pedir cita" si ya está vinculado): vincula y va a `/vet/book/:vetId`, que comparte la mascota si hace falta. Pedir cita exige estar vinculado.
- **Calendario:** el calendario general muestra las citas abiertas (las pendientes marcadas "Pendiente de confirmación"). El **calendario de la mascota** (perfil) solo muestra las que la clínica ya validó (`CONFIRMED`/`CHECKED_IN`, `confirmedForPet`); no se editan ni se borran ahí: se gestionan en Mis citas.
- **Falta:** los avisos `APPOINTMENT_*` en el enum del backend.

### Home (25 nov): saludo del día, Para hoy, semana y clínica
Diseño en Figma (archivo de siempre): componente `Home/Saludo` (5 momentos), guía "Saludo · guía de animación de la mascota" y pantallas "Home · propuesta".
- **Orden:** encabezado → saludo (`app-home-greeting`) → **Para hoy** (máx. 3, lo más urgente primero) → accesos rápidos (Shared pet, Add pet, Calendar, Maps; **sin Vet**) → mascotas → **Esta semana** (L–D con puntos; reemplaza la tarjeta Calendar) → tarjeta MyAnimaLogVet y, si hay clínica vinculada, la clínica **pegada debajo** (Pedir cita / Llamar).
- **Saludo:** según la hora y lo que pasa (sin mascotas → bienvenida; cumpleaños; noche → lo de mañana; pendientes → cuántos y "Ver lo de hoy"; todo al día → frase del banco del día). Textos oscuros sobre claro (el blanco sobre naranja no se leía). El perrito entra con salto y saluda **una vez por sesión** (`sessionStorage homeGreeted`), luego se balancea cada ~9 s; sin animación con reducir movimiento. Tocarlo abre el mini chat (es la cara de la IA). Para que salude "con el cuerpo" hay que redibujarlo por capas (ver la guía en Figma).
- **Datos:** vacunas por mascota, `clinical-summary` (desparasitación), citas de Calendar y eventos; cada fuente falla por su cuenta. Lógica pura en `shared/utils/home-today.util.ts` (pruebas en `home-today.util.spec.ts`).

### Chat de IA (18 nov, `views/ai-chat/`, ruta `/ia`) y botón de IA
Sin diseño de Figma; criterios del equipo.
- **Chat completo:** estilo ChatGPT/Claude, fondo **naranja** con la parte de abajo (caja de escribir) en **blanco**, logo + "MyAnimaLog IA" + saludo al centro, tamaños compactos. La primera vez se presenta en varios mensajes; después solo da la bienvenida. Se escribe y se adjuntan PDF o imágenes (máx. 5 de 10 MB). Sin `app-tab-bar`. Barra lateral (☰) con el historial: abrir, buscar y borrar chats (localStorage por usuario, máx. 40).
- **Botón de IA, dos modos** (`AiAccessService`):
  - **Seguimiento** (`shared/components/ai-fab`, en `app.component.html`): flota en **todas** las pantallas menos login/registro y el chat. **Toque** = mini chat; **mantener presionado** = chat completo (con animación de círculo desde el botón); **arrastrar** = moverlo (se pega al borde) y, si se suelta sobre "Ocultar", pasa a modo anclado. La primera vez en el Home cada sesión saluda con un mensajito.
  - **Anclado** (`shared/components/ai-dock`, en el header del Home): queda junto al menú ☰. **Toque** = chat completo; **mantener presionado** (o clic derecho) = "Volver al modo seguimiento".
- **Mini chat** (`shared/components/ai-mini-chat`): panel lateral derecho sobre cualquier pantalla. Manda `context` (pantalla y `petId`) para que la IA sepa dónde está el usuario. Es la misma conversación del chat completo (`AiConversationService`). Sin adjuntos (para eso, el chat completo).
- **Acciones:** cuando la IA propone crear una mascota, agendar una cita o registrar una vacuna, se muestra una tarjeta (`ai-action-card`) con Confirmar/Cancelar; nada se escribe sin confirmar.
- **Plan:** `AiAccessService.canUseAi()` hoy deja pasar a todos (`environment.ai.requiresPlan = false`). Para probar contra el servicio directo, `environment.ai.baseUrl`.
- **Home:** los íconos del header (notificaciones, quitar anuncios, tutorial) están en un menú de tres líneas (`data-tour="home-menu"`).
- **Tipografía:** estas pantallas y las de vinculación Vet usan **Actor** (negrita en títulos), como Perfiles compartidos; no usar Jua en pantallas nuevas.
- Al probar en el navegador usa `localhost:8100` (con `127.0.0.1` el gateway bloquea por CORS).

### Salud de la mascota: desparasitación, alergias y esterilización (20 nov, `views/pet-health/`)
Sin diseño de Figma; criterios del equipo (cabecera naranja + tarjeta blanca como la línea de vida de vacunas, **Actor**).
- **Decisión de diseño:** la desparasitación es **una sección propia, junto a Vacunas** (no dentro): tiene datos distintos (interna/externa, producto, dosis, peso). Usa el mismo lenguaje de estados (Al día, Por vencer, Vencida, Sin registro; el color nunca va solo, cada chip lleva ícono).
- **Rutas** (módulo `PetHealthModule`, montado en `pet-health/:petId`): `/pet-health/:petId` (esterilización y alergias), `/deworming` (estado por tipo + historial) y `/deworming/new?kind=` (registrar). Perfil de la mascota: tarjetas `app-prevention-card` y `app-health-card`, aviso rojo con alergia grave vigente y dos entradas en el menú lateral.
- **Servicio:** `PetHealthService` (`/allergies`, `/dewormings`, `/pets/{id}/clinical-profile` y `/clinical-summary`); errores como `HealthError` con `code`. Lógica pura en `shared/utils/pet-health.util.ts` (normaliza las respuestas, estado del ciclo, próxima dosis sugerida por edad). El usuario sale del token, no del body.
- **Reglas:** el dueño declara una alergia (`SUSPECTED`); solo un veterinario la confirma. Nada se borra: se resuelve o se anula con `/corrections` y motivo. "No sé" ≠ "no tiene" (`UNKNOWN` ≠ `NONE_KNOWN`). `OWNER` y `EDITOR` registran, `VIEWER` solo lee. La próxima dosis sugerida por edad es una referencia general **que debe validar un veterinario**.
- **Corrections:** el backend ya no acepta `PUT` en visitas, tratamientos, cirugías ni vacunas (405 `USE_CORRECTION_ENDPOINT`): `update*` de `MedicalHistoryService` y `VaccineService` ahora hacen `POST /corrections` con `reason`.
- **Gateway (26 nov, verificado):** `/api/dewormings` y `/api/allergies` ya funcionan. `/api/pets/{id}/clinical-summary` y `/clinical-profile` siguen en 404 ("Ruta no encontrada"). Mientras tanto `getSummary` arma el resumen con desparasitación y alergias (`neuteredUnavailable`), y **solo la esterilización** dice "todavía no disponible". La del registro de mascota no se guarda (falla en silencio). Las formas de respuesta salen de la colección Postman; `normalize*` es tolerante a variantes. Falta probar de punta a punta cuando se publiquen.
- **Pendiente en la app:** esterilización y alergias en el registro de mascota (`add-pet`), recordatorios de desparasitación en calendario y notificaciones.

### Plan Vet (fuente de verdad: [docs/MYANIMALOG_VET_MAESTRO.md](docs/MYANIMALOG_VET_MAESTRO.md))
Ese documento define el plan de todo el ecosistema. Lee la sección que toque antes de trabajar en la parte Vet; no inventes contratos que no estén ahí. Lo que afecta a esta app:
- **Alcance:** el panel de la clínica (MyAnimaLogVet, B2B) es una web aparte. Esta app solo hace la parte del dueño: el directorio, asociarse a una clínica, compartir o revocar mascotas, reclamar mascotas registradas por una clínica, pedir citas y ver qué clínicas tienen acceso.
- **Endpoints del dueño:**
  - Directorio: `GET /public/veterinaries` y `/public/veterinaries/{id}`
  - Vista previa por código: `GET /public/veterinaries/by-code/{code}`
  - Vinculación: `POST /veterinaries/link` con `{ code }`, que reemplaza `linkByCode` y `linkByUrl`. También `GET /me/linked-veterinaries` y `DELETE /veterinaries/{id}/link`.
  - Compartir mascotas: `POST /veterinaries/{id}/patients/share` con `{ petIds }`, `DELETE /veterinaries/{id}/patients/{petId}/share` y `GET /me/pets/{petId}/veterinaries`.
  - Reclamar mascotas: `GET /pets/claims/me`, `GET /pets/claims/{token}` y `POST /pets/claims/{token}/accept`. Al aceptar, la app debe avisar que la clínica conserva el acceso.
  - Citas: `GET /veterinaries/{id}/availability`, `POST /veterinaries/{id}/appointment-requests`, `GET /me/appointments` y cancelar o reprogramar.
- **Autenticación (USER-01/02, ya desplegado en el User service y adaptado aquí el 9 oct):** el login (`/auth/local`, `/auth/google`) devuelve `{ token, refreshToken, expiresIn }`. `sub` ahora es el UUID (antes era el email); el `userId` se saca del claim `id`. `AuthService` guarda `token`, `refreshToken` y `tokenExpiresAt`, y `refreshSession()` comparte un solo refresh en curso porque el refresh token rota y reusarlo cierra todas las sesiones. `AuthInterceptor` renueva el token si vence en menos de 30 s y, ante un 401 del gateway, hace un refresh y reintenta una vez; si el refresh falla, `clearSession()`. El logout manda `{ refreshToken }`. **Falta (cuando Pets lo despliegue):** quitar `userId`/`ownerId` de bodies y query params y pasar `GET /pets/user/{id}` a `/pets/me`.
- **Dependencias:** casi todo esto depende de las fases de backend (VET Fase 4, PETS-04…06 y CAL-xx; ver la sección 5 del documento). Antes de conectar una pantalla, confirma que su endpoint ya está desplegado en el gateway.

### Agregar y editar mascota (26 nov, `views/add-pet/`)
Figma: "Agregar mascota · Paso 1/2/3", "¡Listo!", "Mascota · Editar perfil" y "Salir sin guardar" (propuesta, x≈16300).
- **Pasos:** 1 Quién es (foto, nombre, especie, sexo; obligatorios nombre, especie y sexo), 2 Cómo es (raza con atajos, fecha o edad aproximada, peso y altura), 3 Salud (esterilización y alergias, todo opcional). `app-step-basic-info` recibe `section` = `who` | `how` | `all`.
- **Al guardar** no va al Home: queda en la bienvenida (el perrito `app-mascot` salta, globo "¡Bienvenido, X!" y confeti) con accesos a vacunas, documentos y veterinaria.
- **Editar:** una sola pantalla en tarjetas; "Guardar cambios" solo se activa si cambió algo. Salud se edita en `/pet-health/:petId`.
- **Sin botón Cancelar:** atrás con datos abre la hoja "¿Salir sin guardar?". Estilos comunes en `add-pet/_add-pet-common.scss`.

### Nombre completo y teléfono (26 nov, User service, `docs/NOMBRE_Y_TELEFONO.md`)
- Registro (`views/register`) y Editar perfil (`update-username-modal`) piden **Nombre completo** y **Teléfono**, los dos opcionales. El username sigue sin espacios. El perfil y el saludo del Home muestran el nombre completo (el backend cae al username si no hay).
- `PUT /user/{id}`: el username va siempre; nombre y teléfono solo si cambiaron (si se omiten no se tocan; con `""` se borran). `INVALID_PHONE` y los errores de campo se traducen en `shared/utils/user-identity.util.ts`.
- Sirve para "registrar sin app": el dueño que la clínica registró crea su cuenta con los mismos datos. El walk-in del panel sigue apagado: `POST /patients/walk-in` aún no está en la colección de Veterinary (verificado el 26 nov).

## Pendientes generales
- Poner cuotas diarias en Google Maps Platform y una alerta de presupuesto.
- Agregar `.firebase/` al `.gitignore`.
- Poner las imágenes del tutorial en `src/assets/images/Tutorial/` (`01-home.png` … `09-maps.png`).
- **Info de la vacuna:** "Eliminar" no borra nada (no hay endpoint), el toggle del recordatorio y el documento adjunto no se guardan, y "Editar" no carga la vacuna en `register-vaccine`.
- "Quitar anuncios" (menú del Home) solo muestra un aviso: falta la función.

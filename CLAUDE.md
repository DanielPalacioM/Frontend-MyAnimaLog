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
- **Datos:** hoy la veterinaria es solo texto libre (`veterinarian` en vacunas y visitas, `vetName` en Pet). No hay modelo `Vet` ni servicio.

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

## Pendientes generales
- `git push origin dev`: hay commits locales sin subir (mapa y vacunas).
- Poner cuotas diarias en Google Maps Platform y una alerta de presupuesto.
- Agregar `.firebase/` al `.gitignore`.
- Poner las imágenes del tutorial en `src/assets/images/Tutorial/` (`01-home.png` … `09-maps.png`).
- **Info de la vacuna:** "Eliminar" no borra nada (no hay endpoint), el toggle del recordatorio y el documento adjunto no se guardan, y "Editar" no carga la vacuna en `register-vaccine`.
- Los botones de IA y de quitar anuncios del header del Home no hacen nada todavía.

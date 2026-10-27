# Contexto del proyecto: MyAnimaLog (Frontend)

> Pega este archivo al iniciar una conversación nueva para retomar donde quedamos.
> Última actualización: 1 de octubre de 2026.

## Proyecto
- **App:** MyAnimaLog, para gestionar mascotas: perfil, historial médico, vacunas, calendario, documentos y perfiles compartidos.
- **Stack:** Ionic 8 + Angular 20 con **módulos** (`standalone: false`, no componentes standalone). Capacitor 7. SCSS.
- **Backend:** API Gateway en Cloud Run, `https://pets-api-gateway-20369076707.us-central1.run.app/api` (en `src/environments/*`).
- **Repo:** https://github.com/DanielPalacioM/Frontend-MyAnimaLog. Se trabaja en la rama `dev`; la principal es `main`.
- **Commits:** mensajes en español, en minúscula, estilo "se ajusto/se creo ...".
- **Estilo del equipo:** "somos frontends profesionales". Se trabaja pantalla por pantalla y se sigue el diseño de Figma.

## Diseño (paleta y fuentes)
- Morado principal `#4037BE`, naranja `#f5a623`, fondo menta `#F3FFFB`, texto `#1a1a2e`.
- Morado claro para fondos: `#F1F0FB` y `#F7F6FF`.
- Fuentes: `'Jua'` para títulos y `'Actor'` para texto.

## Cómo correr y desplegar
- **Local:** `ionic serve`. Tiene que ser el puerto **8100**, porque la key de Google Maps solo permite `localhost:8100`; con `ng serve` (puerto 4200) el mapa no carga.
- **Build de producción:** `npx ng build --configuration production`. Sale a `www/`.
- **Desplegar:** `firebase deploy --only hosting`.
  - Proyecto de Firebase: `project-ea0d4de8-cedf-4542-8fa`.
  - URL: https://project-ea0d4de8-cedf-4542-8fa.web.app
- **Aviso conocido:** el CSS de `shared-profiles-home` pasa el límite de tamaño (10,7 kB de 10 kB). No bloquea el build.

## Lo que se hizo en esta sesión

### 1. Tutorial (commit `020db8a`, ya en GitHub)
- **Servicio:** `src/app/services/TutorialService/tutorial.ts` guarda qué tutoriales vio cada usuario, con la clave `tutorial_<clave>_<userId>` en localStorage.
- **Textos:** todos en `src/app/services/TutorialService/tutorial-content.ts`, en `TUTORIAL_STEPS` y `TUTORIAL_GALLERY`.
- **Componentes compartidos:**
  - `app-tutorial-overlay`: tutorial interactivo. Resalta el elemento que tenga `data-tour="..."`, se desplaza hasta él y ubica la burbuja arriba o abajo. Si el elemento no está visible, salta ese paso.
  - `app-tutorial-gallery`: tutorial con imágenes, en diapositivas.
- **Detalle técnico importante:** los dos componentes se colocan dentro de `<ion-content>` con `slot="fixed"`. Ionic le pone `transform` a ese slot, por eso cada componente tiene `:host { position:absolute; inset:0; pointer-events:none }`. Sin eso se abren con tamaño 0×0 y no se ven.
- **Cuándo aparece en el Home:**
  - Usuario nuevo sin mascotas: `home-general` + `home-no-pets` (termina señalando "Add pet").
  - Cuando agrega su primera mascota: `home-pets`, que explica la tarjeta.
- **Guías por sección** (se muestran la primera vez que se entra): `pet-profile` (incluye el calendario de la mascota), `medical-history`, `vaccine-timeline`, `calendar` y `maps`.
- **Botón de tutorial en el Home:** ícono de video en el header, junto a notificaciones, IA y anuncios. Esos botones se hicieron más pequeños (36–42 px). Abre un menú con:
  - Tutorial interactivo.
  - Tutorial con imágenes.
  - Volver a ver las guías de cada sección.
- **Pendiente:** el usuario va a poner las imágenes en `src/assets/images/Tutorial/` (`01-home.png` … `09-maps.png`, lista en `TUTORIAL_GALLERY`). Mientras no estén, la galería muestra un ícono en su lugar.

### 2. Mapa de veterinarias (commits `73f71d6`, `60432c8` y `67d19bf`, SIN subir a GitHub todavía)
- **Ruta y archivos:** `/maps`, en `src/app/views/maps/`. El servicio está en `src/app/services/MapsService/maps.ts`.
- **Desde dónde se abre:** el botón "Maps" de los accesos rápidos del Home y "Buscar veterinaria" de la tarjeta MyAnimaLogVet.
- **Qué muestra:**
  - Veterinarias en 5 km (`Place.searchNearby` con `veterinary_care`), como pines morados con huella. La seleccionada se pone naranja.
  - Tu ubicación como punto azul con pulso.
  - Una hoja inferior con la lista ordenada por distancia en línea recta.
- **Buscador por nombre:** primero filtra las veterinarias que ya están en el mapa, que no cuesta nada. Desde 3 letras pide sugerencias a Google Autocomplete, solo veterinarias, usando un token de sesión.
- **Detalle de una veterinaria:** distancia, abierto o cerrado ahora, estrellas y horario de hoy. Estos datos se piden solo al tocarla, para ahorrar costos.
- **Acciones del detalle:**
  - **Agendar cita:** abre `/calendar/add-event?type=VET_APPOINTMENT&title=...&location=...`. En `add-event.page.ts` se agregó `applyPrefill()` para que los datos lleguen llenos.
  - **Cómo llegar:** dibuja la ruta dentro del mapa (Routes API, `Route.computeRoutes`) en **morado sólido con borde blanco**, con opciones Carro, Moto y A pie y el tiempo y la distancia. También tiene "Navegar en Google Maps" (abre la app aparte) y "Quitar ruta".
  - **Llamar** y **Sitio web**, si la veterinaria tiene esos datos.
- **Otros detalles:**
  - Si el usuario no da permiso de ubicación, el mapa arranca en Cartagena (`DEFAULT_CENTER`).
  - Hay un botón "Buscar en esta zona" que aparece al mover el mapa.
  - Librerías: `@googlemaps/js-api-loader` v2 (`setOptions` / `importLibrary`) y `@types/google.maps`. En `tsconfig.app.json` quedó `"types": ["google.maps"]`.

### 3. Línea de vida de vacunas e info de la vacuna
- **Filtro por año** (commit `31f6ff7`): el año de cada fila sale de la fecha cruda, no del texto formateado. Antes se ocultaban las vacunas de enero, abril, agosto y diciembre y las retrasadas de otro año.
- **Pendientes** (commit `fef27fe`, desplegado): en `vaccine-timeline.page.ts`, `buildTimeline()` arma **dos filas por vacuna**:
  - La dosis registrada (`kind: 'dose'`): "Aplicada" si su fecha ya pasó; si es futura, "En espera".
  - La próxima dosis (`kind: 'next'`, id `<id>-next`): "En espera" si es futura, "Retrasada" si ya pasó.
  - Si ya hay registrada una dosis posterior con el **mismo nombre**, la próxima dosis de la anterior se da por cumplida y no sale.
  - Cada fila va en el año de su fecha, así que una próxima dosis de 2027 aparece al tocar el botón 2027.
  - `VaccineTimelineItem` ahora tiene `vaccineId` (id real en el backend) y `kind`.
- **Info de la vacuna** (commit `fef27fe`, desplegado):
  - La ruta pasó a `vaccine-info/:id`. Antes era `vaccine-info` sin parámetro, por eso `/vaccine-info/<id>` caía al login por el `**`.
  - La línea de vida navega con `queryParams: { petId, kind }`.
  - `vaccine-info.page.ts` ya no usa datos de ejemplo. Como el backend no tiene `GET /vaccines/{id}`, pide `getVaccinesByPet(petId)` y busca la vacuna por id. Tiene estados de carga y "no encontrada".
  - Se quitó la tarjeta de cita de ejemplo, porque la vacuna no trae datos de cita. El recordatorio solo sale si hay próxima dosis.

## Google Cloud / Google Maps (ya configurado)
- **Proyecto de Google Cloud:** `project-ea0d4de8-cedf-4542-8fa` ("My First Project"), el mismo de Firebase. Ya tiene facturación vinculada.
  - Hay que entrar con la cuenta **juandavidmartinez576@gmail.com**. La otra cuenta no ve ese proyecto.
- **APIs habilitadas:** Maps JavaScript API, Places API (New) y Routes API.
- **API key `maps-web-myanimalog`:** `AIzaSyBY6Wc5EYmk4i9B4NewAz7X10scnRN6plE`. Está en `environment.ts` y `environment.prod.ts`.
  - Permitida solo desde `http://localhost:8100/*`, `https://project-ea0d4de8-cedf-4542-8fa.web.app/*` y `https://project-ea0d4de8-cedf-4542-8fa.firebaseapp.com/*`.
  - Solo puede usar las 3 APIs de arriba. Se comprobó que desde un dominio ajeno responde 403.
- **Map ID con el estilo de la app:** `e2b9dc397cc68605f7024cf8` ("MyAnimaLog Web"). Los colores se editan en Google Cloud → Diseños de mapa, sin tocar código ni redesplegar.

## Pendientes
1. **Subir a GitHub** los commits del mapa y de vacunas (`73f71d6` a `fef27fe`): `git push origin dev`.
2. **Evitar cobros en Google Cloud:**
   - Poner cuotas por día en Google Maps Platform → Cuotas. Sugerido: cargas de mapa 300/día, Search Nearby 150/día, detalles de lugar 30/día, rutas 300/día.
   - Crear una alerta de presupuesto de 1 USD. La alerta solo avisa por correo, no frena el gasto; lo que frena el gasto son las cuotas.
3. **Opcional, ofrecido:** guardar en memoria unos minutos las búsquedas y los detalles de las veterinarias, para repetir menos llamadas a Google.
4. **Agregar `.firebase/` al `.gitignore`** y sacarlo del repo. El archivo `.firebase/hosting.*.cache` cambia en cada despliegue.
5. **Imágenes del tutorial** en `src/assets/images/Tutorial/`.
6. **Error 403 en `GET /user/profile/{id}`:** sale de `loadCaregivers` en el Home, que pide la foto de los otros cuidadores. El backend no deja ver perfiles ajenos. Ya se captura y no rompe nada, pero ensucia la consola. Se puede arreglar de dos formas:
   - Backend: que la respuesta de accesos compartidos incluya siempre `userAvatarUrl`.
   - Frontend: no hacer esa petición y usar el avatar por defecto.
7. **Rutas que no existen:** `/vet` (botón "Vet" del Home) y "Asociar veterinaria" (`/vet`) todavía no tienen ruta y caen al login por el `**`. Los botones de IA y de quitar anuncios del header no hacen nada todavía.
8. **Info de la vacuna:** "Eliminar" solo vuelve atrás, porque `VaccineService` no tiene método para borrar. El documento adjunto y el toggle del recordatorio todavía no se guardan en el backend. "Editar" manda a `/register-vaccine?mode=edit`, pero ese formulario aún no carga la vacuna para editarla.

## Parte Vet: diseño (5 de octubre de 2026)
- **Documentos:** `docs/MYANIMALOG_VET_MAESTRO.md` (plan técnico), `docs/MYANIMALOG_VET_CLIENTE.md` (lo que toca a la app del dueño) y `docs/MYANIMALOG_VET_NEGOCIO.md` (planes, verificación, entrevistas, demo; cifras = supuestos) , `docs/MYANIMALOG_VET_DISENO.md` (guía de diseño) y `docs/MYANIMALOG_VET_ESTADO.md` (estado general: qué está hecho, qué falta, ClickUp y plan al 3 de noviembre).
- **Dirección visual del panel MyAnimaLogVet:** seria y organizada, con estilo propio pero sin ser juguetona ni recargada. Base de color = Login MyAnimaLogVet de Figma: morado `#4037BE`, degradado `#544CC4` → `#201B61`, turquesa del logo `#00F8DC`, naranja `#FEB444`. El Register va a cambiar.
- **Figma:** archivo `e9FbM805Y2oAmOgIbcL0Hj`, página única `0:1`. Frames Vet abajo: `1828:2` Login, `1861:19` Register, `1865:100` y `1868:2` vacíos (1280x832); móvil `858:83` VetAsosiation - empty. La cuenta de Figma pasó a Professional con puesto Full (pago mensual, 6 oct): el MCP ya puede escribir sin el tope mensual.
- **Forma de trabajo:** el usuario diseña en Figma; Claude solo sugiere (campos, flujos, estructura) y no crea nada hasta que se lo pidan.
- **Registro de la clínica (hecho en Figma, 5 oct):** fila y=5875. Antes de empezar `1861:19` → 1 Cuenta `1899:73` → 2 Tu clínica `1901:132` → 3 Representante `1902:215` → 4 Documentos `1910:20` → 5 Perfil profesional `1910:131` → 6 Revisar y enviar `1910:244` → estados: en revisión `1911:109`, corrección `1911:198`, aprobada `1911:303`, rechazada `1911:368`.
- **Sistema del registro:** fuente Afacad (Bold 64 títulos, Bold 16 etiquetas, Medium 12–15 ayudas), campos 184x41 con borde negro 2 px y radio 5, columnas en x=45 y x=242 (eje central x=236), botones Atrás/Continuar en y=700, indicador "PASO N DE 6" + barra morada arriba. Turquesa solo en el sello de aprobada.
- **Componentes locales:** frame `1908:2` con `Vet/Campo` (`1908:3`), `Vet/Botón` (`1908:13`, Principal/Secundario) y `Vet/Documento` (`1908:48`, Pendiente/Listo/Corregir), y `Vet/Saludo` (`1930:159`) para el Inicio del panel.
- **Inicio del panel (propuesta, 6 oct):** frame `1932:159` en x=1646, y=6819, junto al "MacBook Air - 4" del usuario (`1868:2`, que el usuario está diseñando; no tocar). Menú lateral índigo de 232 px, barra con buscador y "Nueva cita", saludo, Agenda de hoy (600 px), Por resolver, Acciones rápidas y Mi clínica. El menú ya incluye "Reportes".
- **Reportes (propuesta, 6 oct):** frame `1935:182` en x=3044, y=6819 (1280x1165, con scroll): indicadores, hallazgo, citas por mes, inasistencia por mes, inasistencia por día, salud de los pacientes y tabla por profesional.
- **Agenda (propuesta, 6 oct):** día por profesional `1941:174` (x=4442, y=6819) y la misma con el detalle de la cita abierto `1942:174` (x=4442, y=7751). Faltan: semana, nueva cita (modal) y estados especiales.

- **Pacientes (propuesta, 7 oct):** lista `1958:174` (x=10886), con ficha abierta `1959:174` (x=12206), modal "Agregar paciente" con 3 opciones (QR recomendado, enviar enlace, registrar sin app) `1961:219` (x=13526) y el paso "Registrar sin app" `1959:698` (x=14846), todos en y=7038. Decisión: el registro manual se queda, pero como última opción.
- **Clientes (propuesta, 7 oct):** lista `1964:219` (x=16166) y con ficha `1964:905` (x=17486). Solo dueños vinculados (contrato `ListClients`); los dueños sin app aparecen en Pacientes como "Por reclamar". "Quitar cliente" en rojo revoca todas sus mascotas.
- **Equipo (propuesta, 7 oct):** lista `1965:219` (x=18806), ficha `1966:219` (x=20126) y modal invitar `1966:630` (x=21446). Columna "Tarjeta profesional" solo para veterinarios y dueña ("No aplica" en el resto); "Verificada" usa el chip turquesa suave. Roles en el modal como opciones con su explicación; Dueño no se invita. Usan `Vet/Campo` y `Vet/Botón`. Los frames del panel ahora están en la fila y=7038 (el usuario los reordenó); "MacBook Air - 7" (`1954:182`) es del usuario.
- **Servicios y horarios, Mi clínica y Plan (propuesta, 8 oct):** `1971:225`, `1972:225` y `1973:225`, en la fila y=8382 (x=8246, 9566, 10886). Con esto, todas las opciones del menú lateral tienen pantalla. Mi clínica y Plan miden más de 832 de alto (con scroll). Las cifras del Plan son los supuestos de `MYANIMALOG_VET_NEGOCIO.md`.
- **Historia clínica del paciente (propuesta, 9 oct):** fila y=9700, desde x=-1092 cada 1320. Resumen `1997:225` (base: las demás se clonan de esta), Consultas `1998:225`, Vacunas `1998:710`, Tratamientos `2001:225`, Cirugías `2001:747`, Laboratorio `2002:225`, Peso `2002:719`. Paciente Toby; los datos cuadran entre pestañas (Patitas 17 registros, VetCentro 6, dueño 3). Falta Documentos.
- **Siguiente en diseño (propuesto el 9 oct, falta que el usuario elija):**
  1. "Registrar visita" desde la cita: Agenda → llegada → atendida → formulario prellenado con `appointmentId` (MED-04). Dentro de la visita, secciones para vacuna, receta, exámenes y peso. Arriba, la alergia y los tratamientos activos.
  2. Formularios sueltos: aplicar vacuna (lote obligatorio), receta con aviso de alergia, resultado de laboratorio, cirugía (programada → completada, con consentimiento), peso, subir documento y la pestaña Documentos.
  3. Estados por permiso: recepción, veterinario sin tarjeta verificada, registro de otra clínica (solo lectura), acceso revocado y paciente por reclamar.
  4. "Ver cambios" (auditoría) y anular con motivo en vez de borrar (falta acordarlo con backend).

## ClickUp: organización de la parte Vet (6 oct, a medias por el límite diario)
**Fecha límite de toda la parte Vet: martes 3 de noviembre de 2026.** Festivos a evitar: 12 oct y 2 nov.

Hecho el 6 oct:
- 13 tareas de código ya hechas pasadas a `complete` (calendario, documentos, historial médico, vacunas, pet profile).
- Creadas como `complete`: mapa de veterinarias, buscador y ruta, tutorial, vistas adaptables + verify/reset.
- Creadas `to do`: info de vacuna (eliminar/recordatorio/editar), botones IA y anuncios, imágenes del tutorial.
- Lista Veterinary → Desing (`901327070760`): registro (complete, 9 subtareas), Inicio (complete, 3), Reportes (complete), Agenda (`wdx6zf56pb`, in progress, vence 9 oct; semana 7 oct, nueva cita 8 oct, estados 9 oct), Guía de diseño (complete), pantallas restantes del panel (`wdx6zf56pd`, vence 16 oct, 7 subtareas con fecha), app del dueño (`wdx6zf56pe`, vence 21 oct).

**Falta crear (el MCP de ClickUp tiene 100 llamadas al día):**
- Subtareas de `wdx6zf56pe` (app del dueño, diseño): Vincularse con código o QR y "Mis veterinarias" (19 oct), Clínicas con acceso (20 oct), Reclamar mascota (20 oct), Pedir cita y "Mis citas" (21 oct). Ya existe "Directorio de clínicas y perfil público".
- Lista Veterinary → Frontend Logic (`901327070808`), tarea "Parte Vet — app del dueño (código)" (3 nov) con subtareas: unificar ruta /vet (9 oct), modelos y VeterinaryService (13 oct), directorio (22 oct), vincularse (23 oct), compartir/revocar (26 oct), reclamar (27 oct), citas (29 oct), migración auth con refresh token (3 nov, bloqueada por backend).
- Misma lista, "Panel web MyAnimaLogVet (código)" (3 nov): crear proyecto Angular web + layout y menú (14 oct), login y elección de clínica (16 oct), registro y verificación (21 oct), Inicio con saludo animado (23 oct), Agenda (28 oct), Reportes (30 oct), pantallas restantes (3 nov).
- Lista Veterinary → QA/TESTING (`901327070810`): "Recorrido de prueba de punta a punta de la parte Vet" (3 nov).

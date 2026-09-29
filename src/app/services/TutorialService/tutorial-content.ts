import type { TutorialKey, TutorialSlide, TutorialStep } from './tutorial';

// Textos de todos los tutoriales. Cada `target` debe existir como
// `data-tour="..."` en la vista; si no está visible (p. ej. un botón que
// solo ve el dueño) ese paso se salta solo.
export const TUTORIAL_STEPS: Record<TutorialKey, TutorialStep[]> = {

  // Home: lo que ve cualquier usuario nuevo, tenga o no mascotas.
  'home-general': [
    {
      title: '¡Bienvenido a MyAnimaLog! 🐾',
      text: 'Te mostramos en un minuto para qué sirve cada parte de la app. Puedes saltar el tutorial cuando quieras.',
    },
    {
      target: 'home-profile',
      title: 'Tu perfil',
      text: 'Toca tu foto o tu nombre para editar tus datos, cambiar el idioma o cerrar sesión.',
    },
    {
      target: 'home-notifications',
      title: 'Notificaciones',
      text: 'Aquí llegan los recordatorios de citas y vacunas y las invitaciones para cuidar mascotas de otras personas. El número rojo indica cuántas no has leído.',
    },
    {
      target: 'home-ia',
      title: 'Asistente con IA',
      text: 'Resuelve dudas sobre el cuidado, la alimentación o la salud de tu mascota.',
    },
    {
      target: 'home-ads',
      title: 'Sin anuncios',
      text: 'Desde aquí puedes quitar la publicidad de la app.',
    },
    {
      target: 'home-tutorial',
      title: 'Ver el tutorial otra vez',
      text: 'Cuando quieras repasar, toca este botón: puedes verlo de forma interactiva, como ahora, o con imágenes.',
    },
    {
      target: 'home-quick-vet',
      title: 'Vet',
      text: 'Consulta información de veterinarias y gestiona la veterinaria de confianza de tus mascotas.',
    },
    {
      target: 'home-quick-shared',
      title: 'Shared pet',
      text: 'Comparte el perfil de tu mascota con familiares o cuidadores. Tú decides si pueden editar o solo ver.',
    },
    {
      target: 'home-quick-add',
      title: 'Add pet',
      text: 'Registra una mascota con su foto, especie, raza, fecha de nacimiento, peso y altura.',
    },
    {
      target: 'home-quick-calendar',
      title: 'Calendar',
      text: 'Abre el calendario general con los eventos de todas tus mascotas juntos.',
    },
    {
      target: 'home-quick-maps',
      title: 'Maps',
      text: 'Encuentra lugares pet-friendly cerca de ti: parques, tiendas y veterinarias.',
    },
    {
      target: 'home-calendar-card',
      title: 'Calendario',
      text: '"Crear evento" agenda citas, vacunas, medicamentos o recordatorios para una mascota. "Ver eventos" abre tu agenda por día, semana o mes.',
    },
    {
      target: 'home-vet-card',
      title: 'MyAnimaLogVet',
      text: '"Asociar veterinaria" conecta tu veterinaria para que pueda consultar y actualizar el historial de tu mascota. "Buscar veterinaria" te muestra las más cercanas.',
    },
  ],

  // Cierre del Home cuando todavía no hay mascotas.
  'home-no-pets': [
    {
      target: 'home-quick-add',
      title: '¡Empieza por aquí!',
      text: 'Agrega tu primera mascota. Cuando lo hagas te mostraremos cómo funciona su tarjeta y su perfil.',
    },
  ],

  // Home con al menos una mascota: la tarjeta del carrusel.
  'home-pets': [
    {
      target: 'home-pet-card',
      title: 'La tarjeta de tu mascota',
      text: 'Muestra su nombre, raza, fecha de nacimiento y sexo. Tócala para abrir su perfil completo.',
    },
    {
      target: 'home-pet-card',
      title: 'Cambia entre mascotas',
      text: 'Si tienes varias, desliza la tarjeta hacia los lados o toca la flecha. Las que te compartieron aparecen con la etiqueta "A mi cuidado" y abajo ves quién más cuida a las tuyas.',
    },
  ],

  'pet-profile': [
    {
      title: 'El perfil de tu mascota',
      text: 'Aquí está toda su información: salud, vacunas, citas y documentos. Veamos cada sección.',
    },
    {
      target: 'pp-menu',
      title: 'Menú de opciones',
      text: 'Agenda una cita rápida, edita la información, filtra vacunas, mira quién tiene acceso compartido o elimina la mascota.',
    },
    {
      target: 'pp-card',
      title: 'Identidad',
      text: 'Foto, nombre, raza y edad. Toca la foto para verla en grande.',
    },
    {
      target: 'pp-stats',
      title: 'Datos básicos',
      text: 'Edad, peso, sexo y altura. Se actualizan cuando editas la información de la mascota.',
    },
    {
      target: 'pp-medical',
      title: 'Historial médico',
      text: 'Visitas veterinarias, tratamientos, exámenes de laboratorio y cirugías con su número de registros. Toca una categoría o "Ver todo" para entrar.',
    },
    {
      target: 'pp-vaccines',
      title: 'Vacunas',
      text: 'La barra muestra cuántas vacunas lleva aplicadas y cuál es la próxima dosis. "Agregar" registra una nueva y "Ver vacunas" abre su línea de vida.',
    },
    {
      target: 'pc-header',
      title: 'Calendario de la mascota',
      text: 'El número indica cuántos eventos tiene este mes. Con el botón + agendas una cita, vacuna o medicamento solo para esta mascota.',
    },
    {
      target: 'pc-grid',
      title: 'Días con eventos',
      text: 'Los puntos de colores marcan los días con eventos; cada color es un tipo (cita, vacuna, medicamento...). Toca un día para ver sus eventos abajo.',
    },
    {
      target: 'pc-menu',
      title: 'Lista de eventos',
      text: 'Cambia entre los eventos del día seleccionado y todos los del mes. Toca un evento para ver el detalle, editarlo o eliminarlo.',
    },
    {
      target: 'pp-docs',
      title: 'Documentos',
      text: 'Guarda certificados, recetas o resultados en PDF o imagen para tenerlos siempre a mano.',
    },
  ],

  'medical-history': [
    {
      target: 'mh-tabs',
      title: 'Historial médico',
      text: 'Está dividido en cuatro secciones: consultas veterinarias, tratamientos con sus medicamentos, exámenes de laboratorio y cirugías.',
    },
    {
      target: 'mh-card',
      title: 'Registros',
      text: 'Aquí aparecen los registros de la sección elegida. En laboratorio, los resultados normales se ven en azul y los fuera de rango en rojo.',
    },
    {
      target: 'mh-add',
      title: 'Registrar',
      text: 'Agrega un nuevo registro en la sección en la que estás.',
    },
  ],

  'vaccine-timeline': [
    {
      target: 'vt-summary',
      title: 'Resumen de vacunas',
      text: 'Cuántas vacunas están aplicadas, pendientes o retrasadas. La barra y los colores de la leyenda te lo muestran de un vistazo.',
    },
    {
      target: 'vt-years',
      title: 'Filtrar por año',
      text: 'Elige un año para ver solo las vacunas de ese periodo.',
    },
    {
      target: 'vt-list',
      title: 'Línea de vida',
      text: 'Cada vacuna en orden, con su fecha y estado. Tócala para ver el detalle.',
    },
  ],

  'calendar': [
    {
      target: 'cal-header',
      title: 'Tu calendario',
      text: 'Reúne los eventos de todas tus mascotas; sus fotos aparecen arriba.',
    },
    {
      target: 'cal-menu',
      title: 'Vistas y nuevo evento',
      text: 'Cambia entre vista por día, semana o mes, o agrega un evento nuevo.',
    },
    {
      target: 'cal-nav',
      title: 'Navegar',
      text: 'Usa las flechas para moverte al día, semana o mes anterior o siguiente.',
    },
    {
      target: 'cal-events',
      title: 'Eventos',
      text: 'Cada evento tiene el color de su tipo. Tócalo para ver el detalle; con el lápiz lo editas y con la papelera lo eliminas.',
    },
  ],
};

// Tutorial con imágenes. Guarda las capturas en src/assets/images/Tutorial/
// con estos nombres; mientras no existan se muestra un marcador.
export const TUTORIAL_GALLERY: TutorialSlide[] = [
  {
    image: 'assets/images/Tutorial/01-home.png',
    title: 'Inicio',
    text: 'Tu perfil, notificaciones, accesos rápidos y las tarjetas de tus mascotas.',
  },
  {
    image: 'assets/images/Tutorial/02-add-pet.png',
    title: 'Agregar mascota',
    text: 'Registra a tu mascota con su foto y sus datos básicos.',
  },
  {
    image: 'assets/images/Tutorial/03-pet-profile.png',
    title: 'Perfil de la mascota',
    text: 'Datos básicos, historial médico, vacunas, calendario y documentos.',
  },
  {
    image: 'assets/images/Tutorial/04-medical-history.png',
    title: 'Historial médico',
    text: 'Consultas, tratamientos, laboratorio y cirugías.',
  },
  {
    image: 'assets/images/Tutorial/05-vaccines.png',
    title: 'Vacunas',
    text: 'Registra vacunas y sigue su línea de vida.',
  },
  {
    image: 'assets/images/Tutorial/06-calendar.png',
    title: 'Calendario',
    text: 'Agenda citas, vacunas y medicamentos y velos por día, semana o mes.',
  },
  {
    image: 'assets/images/Tutorial/07-shared.png',
    title: 'Perfiles compartidos',
    text: 'Invita a otras personas a cuidar a tu mascota.',
  },
  {
    image: 'assets/images/Tutorial/08-vet.png',
    title: 'MyAnimaLogVet',
    text: 'Asocia o busca una veterinaria.',
  },
];

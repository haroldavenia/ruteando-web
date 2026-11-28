import type { TFunction } from '@/lib/i18n/core';

/**
 * Lo que dice la página pública `/about`: definición, qué se puede hacer y preguntas frecuentes. Es la única fuente: la página lo pinta
 * y los datos estructurados (`FAQPage`, `SoftwareApplication`) lo repiten, así que lo que ve una persona es lo que lee un buscador o un
 * motor de respuestas.
 */
export function aboutContent(t: TFunction) {
  return {
    title: t('Ruteando: planificación de rutas, flota y jornadas'),
    lead: t(
      'Ruteando es una aplicación web para planificar rutas de reparto y recogida, administrar la flota y seguir cada visita hasta que se atiende.'
    ),
    features: [
      {
        title: t('Planificar jornadas'),
        text: t('Eliges una configuración y los paquetes, y Ruteando calcula las rutas y sus paradas.'),
      },
      {
        title: t('Seguir cada visita'),
        text: t('El estado de cada paquete se actualiza y se ve en un mapa, ruta por ruta.'),
      },
      {
        title: t('Administrar la flota'),
        text: t('Vehículos, tipos de vehículo y conductores, con su capacidad y sus restricciones.'),
      },
      {
        title: t('Organizar lugares y zonas'),
        text: t('Puntos de interés y polígonos de cobertura dibujados sobre el mapa.'),
      },
      {
        title: t('Exportar reportes'),
        text: t('Cada ruta o jornada se descarga en Excel, y cada ruta también en PDF.'),
      },
    ],
    faq: [
      {
        question: t('¿Qué es Ruteando?'),
        answer: t(
          'Es una aplicación web para planificar rutas, administrar la flota y seguir las visitas de cada jornada.'
        ),
      },
      {
        question: t('¿Se puede instalar en el teléfono?'),
        answer: t(
          'Sí. Es una aplicación instalable: desde el menú del navegador elige «Instalar aplicación» o «Añadir a la pantalla de inicio».'
        ),
      },
      {
        question: t('¿En qué idiomas está?'),
        answer: t('En español, inglés y portugués.'),
      },
      {
        question: t('¿Cómo se protege el acceso?'),
        answer: t(
          'Con verificación en dos pasos (correo, SMS o aplicación autenticadora), opcional u obligatoria según la empresa, y con inicio de sesión único con Google, GitHub, Apple o el proveedor de la empresa.'
        ),
      },
    ],
  };
}

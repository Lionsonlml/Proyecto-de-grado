// ─── Fallbacks estáticos de IA ───────────────────────────────────────────────
// Se usan cuando Gemini no está disponible (cuota 429 / error red).
// Diseñados para ser útiles, contextualizados y variados.

// ─── Consejos de productividad (advice) ──────────────────────────────────────
// 35 consejos basados en CBT, regla de 2 minutos, bloques de tiempo, Pareto, GTD

export const FALLBACK_ADVICE_TIPS: string[] = [
  // Regla de 2 minutos
  "Si esta tarea toma menos de 2 minutos, hazla ahora mismo. La acción inmediata elimina la carga mental de recordarla.",
  "Empieza con la versión más pequeña posible de la tarea. Un borrador de 5 líneas es mejor que una hoja en blanco.",
  "La procrastinación nace del miedo al resultado perfecto. Establece 'suficientemente bueno' como tu estándar de inicio.",

  // Bloques de tiempo (Time Blocking)
  "Divide esta tarea en bloques de 25 minutos con descansos de 5 minutos. El cerebro trabaja mejor en sprints cortos.",
  "Bloquea el primer bloque de tu jornada para esta tarea antes de revisar correos o mensajes. La energía matutina es tu activo más valioso.",
  "Programa esta tarea cuando tu energía esté en su punto más alto. Reserva las horas de baja energía para tareas mecánicas.",
  "Agrupa tareas similares en el mismo bloque de tiempo para evitar el costo cognitivo de cambiar de contexto.",

  // Principio de Pareto (80/20)
  "Identifica el 20% del esfuerzo que produce el 80% del resultado. Enfócate solo en esa parte crítica.",
  "Pregúntate: ¿cuál es el paso de esta tarea que tiene mayor impacto? Empieza por ahí.",
  "No necesitas completar la tarea al 100% para obtener el 80% del beneficio. Perfecciona solo si el tiempo lo permite.",

  // Técnicas CBT (Terapia Cognitivo-Conductual)
  "Cuando sientas resistencia a iniciar, pregúntate: ¿qué es lo peor que puede pasar si hago esto ahora? Normalmente el miedo es mayor que el riesgo real.",
  "Reemplaza 'tengo que hacer esto' por 'voy a hacer esto'. El lenguaje de elección reduce la percrastinación.",
  "Divide la ansiedad de esta tarea: ¿qué parte específica te genera tensión? Esa es la que necesita atención primero.",
  "Usa el ancla conductual: haz esta tarea siempre en el mismo lugar y hora. Tu cerebro aprenderá a entrar en modo de trabajo automáticamente.",
  "Celebra el proceso, no solo el resultado. Reconoce que iniciaste como un logro propio.",

  // Gestión de energía
  "Si tu energía está baja, empieza con la parte más mecánica de la tarea. El movimiento genera momentum.",
  "Hidrátate y toma un descanso de 5 minutos antes de iniciar. El rendimiento cognitivo cae un 20% con deshidratación leve.",
  "Elimina una distracción antes de iniciar: cierra una pestaña, silencia una notificación. Un entorno limpio reduce la carga cognitiva.",
  "Si llevas más de 90 minutos trabajando sin pausa, tu cerebro necesita un descanso activo antes de continuar con esta tarea.",

  // GTD (Getting Things Done)
  "Si esta tarea tiene más de un paso, define cuál es el próximo paso físico y concreto. La ambigüedad paraliza.",
  "Escribe el resultado esperado de esta tarea en una oración. La claridad de objetivo reduce el tiempo de ejecución.",
  "¿Esta tarea pertenece a tu área de enfoque principal de hoy? Si no, considera delegarla o posponerla conscientemente.",

  // Técnicas de foco
  "Pon tu teléfono boca abajo y activa el modo no molestar durante el tiempo que le dediques a esta tarea.",
  "Usa la técnica del '5-4-3-2-1': cuenta hacia atrás y comienza. El ritual de cuenta regresiva activa la corteza prefrontal.",
  "Si sientes que la tarea es abrumadora, reducela: ¿qué podrías entregar en 15 minutos que tenga valor?",
  "Trabaja de pie durante los primeros 10 minutos si sientes somnolencia. El cambio postural aumenta el estado de alerta.",

  // Motivación intrínseca
  "Conecta esta tarea con un objetivo mayor que te importe. Las tareas con 'por qué' claro se completan más rápido.",
  "Imagina cómo te sentirás cuando la hayas terminado. Esa sensación de alivio y satisfacción está disponible ahora mismo.",
  "Hazla más desafiante: pon un temporizador y trata de terminarla antes de que suene. La gamificación aumenta la motivación.",

  // Colaboración y contexto
  "Si estás bloqueado, explica la tarea a alguien (o en voz alta para ti mismo). El acto de explicar desbloquea nuevas perspectivas.",
  "Revisa si hay una versión más simple de esta tarea. A veces el scope inicial es innecesariamente grande.",
  "Si es una tarea creativa, empieza llenando páginas sin filtro. La calidad viene en la revisión, no en el primer intento.",

  // Cierre y seguimiento
  "Termina la sesión de trabajo escribiendo 3 palabras sobre dónde quedaste. Mañana empezarás sin fricción de reconstrucción de contexto.",
  "Al completar la tarea, registra cuánto tiempo tomó realmente vs. tu estimación. Afina tu calibración para el futuro.",
  "Después de completar la tarea, define la siguiente acción del proyecto antes de cerrar. No pierdas el momentum.",
]

// ─── Fallback para analyze: patterns ─────────────────────────────────────────

export const FALLBACK_PATTERNS = {
  patterns: [
    "Tus registros muestran actividad consistente a lo largo del día.",
    "Las tareas de mayor duración tienden a quedar pendientes con más frecuencia.",
    "Los períodos de alta energía coinciden con mayor tasa de completación.",
  ],
  optimal_times: {
    mañana: "Período con mayor energía disponible para tareas cognitivas complejas.",
    tarde: "Momento adecuado para tareas de revisión, comunicación y tareas mecánicas.",
    noche: "Reservar para planificación del día siguiente, no para tareas de alta concentración.",
  },
  correlations: [
    "Mayor energía → mayor tasa de completación de tareas.",
    "Tareas sin hora asignada tienden a postponerse más.",
    "Bloques de trabajo de 25-50 minutos correlacionan con mejor completación.",
  ],
  recommendations: [
    "Asigna siempre una hora específica a cada tarea para reducir la postergación.",
    "Agrupa tareas similares en el mismo bloque de tiempo.",
    "Registra tu estado de ánimo al inicio del día para anticipar tu rendimiento.",
  ],
  source: "fallback" as const,
}

// ─── Fallback para analyze: recommendations ───────────────────────────────────

export const FALLBACK_RECOMMENDATIONS = {
  recommendations: [
    "Establece 3 tareas prioritarias cada mañana y completa al menos 2 antes del mediodía.",
    "Usa bloques de 25 minutos de trabajo enfocado seguidos de 5 minutos de descanso.",
    "Revisa y actualiza tu lista de tareas al final de cada jornada para empezar el día siguiente con claridad.",
    "Identifica tu hora de mayor energía y reserva ese bloque para tu tarea más importante del día.",
    "Elimina o delega las tareas que llevan más de 3 días en estado 'pendiente' sin progreso.",
  ],
  source: "fallback" as const,
}

// ─── Fallback para schedule/optimize ─────────────────────────────────────────

export const FALLBACK_SCHEDULE = {
  schedule: [
    {
      time: "09:00",
      task: "Tarea prioritaria del día",
      duration: 90,
      reason: "Bloque de máxima concentración por la mañana antes de que empiecen las interrupciones.",
    },
    {
      time: "11:00",
      task: "Segunda tarea en importancia",
      duration: 60,
      reason: "La energía sigue alta y el momentum del bloque anterior impulsa la productividad.",
    },
    {
      time: "14:00",
      task: "Tareas de revisión o comunicación",
      duration: 60,
      reason: "La energía post-almuerzo es más baja; ideal para trabajo menos intenso cognitivamente.",
    },
    {
      time: "16:00",
      task: "Tareas pendientes menores",
      duration: 45,
      reason: "Segundo pico de energía de la tarde, aprovechable para cerrar tareas rápidas.",
    },
    {
      time: "17:00",
      task: "Planificación del día siguiente",
      duration: 15,
      reason: "Cerrar el día con claridad sobre las prioridades del mañana reduce la ansiedad nocturna.",
    },
  ],
  source: "fallback" as const,
}

// ─── Fallback motivacional ────────────────────────────────────────────────────

export const FALLBACK_MOTIVATIONAL: string[] = [
  "La productividad no es hacer más cosas, es hacer las cosas correctas en el momento correcto.",
  "Cada tarea completada es evidencia de que eres capaz. Construye sobre esa evidencia.",
  "El progreso pequeño y consistente siempre supera a la perfección ocasional.",
  "Tu energía es un recurso renovable. Cuídala tanto como tu tiempo.",
  "Una sola tarea enfocada vale más que diez iniciadas sin terminar.",
  "El mejor momento para empezar era ayer. El segundo mejor momento es ahora.",
  "La disciplina es elegir, repetidamente, lo que te importa sobre lo que es conveniente.",
  "No esperes motivación para actuar. Actúa y la motivación te seguirá.",
  "Cada hora de trabajo enfocado es una inversión en la versión de ti que quieres ser.",
  "Terminar algo imperfecto tiene infinitamente más valor que no terminar algo perfecto.",
]

// ─── Función auxiliar: consejo aleatorio ─────────────────────────────────────

export function getRandomAdvice(): string {
  return FALLBACK_ADVICE_TIPS[Math.floor(Math.random() * FALLBACK_ADVICE_TIPS.length)]
}

export function getRandomMotivational(): string {
  return FALLBACK_MOTIVATIONAL[Math.floor(Math.random() * FALLBACK_MOTIVATIONAL.length)]
}

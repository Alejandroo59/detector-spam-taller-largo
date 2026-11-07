// =====================================================================
// reglas.js - El filtro "de antes": reglas escritas A MANO (sin aprender)
//
// Es un léxico con puntajes, igual que el diccionario de sentimiento:
// cada palabra "sospechosa" suma puntos y cada palabra "tranquila" resta.
// Si el total llega al umbral, el mensaje se marca como SPAM.
//
// Es independiente de modelo.js: funciona aunque tus TODO estén pendientes.
// Sirve de punto de comparación: ¿gana el modelo que aprende a las reglas?
// =====================================================================

// Puntos necesarios para marcar un mensaje como spam
const UMBRAL_REGLAS = 3;

// Palabras que delatan o tranquilizan. Se escribieron pensando en el spam
// en general (no mirando los mensajes del examen).
// Positivo = suena a spam. Negativo = suena a conversación normal.

const LEXICO_SPAM = {
  // Premios y dinero fácil
  gratis: 2, gratuito: 2, premio: 3, ganador: 3, ganaste: 3, felicidades: 2,
  felicitaciones: 2, sorteo: 2, loteria: 3, regalo: 2, millonario: 3,
  ganancias: 2, garantizado: 2, garantizadas: 2, garantizados: 2,
  dinero: 1, invierte: 2, inversion: 1, criptomonedas: 2, bitcoin: 2,
  prestamo: 2, credito: 1, facil: 2, oportunidad: 2, duplica: 2,
  seleccionado: 2, reclama: 2, reclamar: 2, visitante: 2,

  // Ofertas y urgencia
  oferta: 2, descuento: 2, promocion: 2, cupon: 2, exclusivo: 2, exclusiva: 2,
  imperdible: 2, limitada: 1, rebaja: 2, compra: 1, urgente: 2, inmediato: 1,
  ahora: 1, paga: 1, pague: 2, enlace: 1, link: 1, multiplica: 2,
  beneficios: 2, experiencia: 2, gana: 2, ultimo: 2, tarifa: 2,
  aduana: 2, retenido: 2, retenida: 2, papeleo: 2, solicita: 1,
  relampago: 2, riesgo: 1, diarios: 1, vip: 2, trading: 2,

  // Suplantación (phishing): cuentas, claves, enlaces
  clic: 2, bloqueada: 2, bloqueado: 2, suspendida: 2,
  verifica: 2, confirma: 1, clave: 2, contrasena: 2,
  sospechosa: 2, datos: 2, ingresa: 2, restablece: 2,
  bancaria: 1, bancarios: 2, cargo: 1, expiró: 2,

  // Palabras de la vida diaria (restan)
  clase: -2, tarea: -2, examen: -2, profe: -1, profesor: -1,
  mama: -2, papa: -2, familia: -1, gracias: -1, amigos: -1,
  cumpleanos: -2, estudiar: -2, biblioteca: -2, proyecto: -1,
  almorzar: -1, cena: -1, abuela: -2, hermana: -1, hermano: -1,
  reunion: -1, apuntes: -2, horario: -1, cine: -1, chicos: -1,
  duda: -1, ejercicio: -1, guia: -1, jefe: -1, parque: -1,
  futbol: -1, postre: -1, perro: -1, presentacion: -1,
  carpeta: -1, equipo: -1, entrevista: -1, leche: -1,
  codigo: -1, direccion: -1, fiesta: -1, prima: -1,
  restaurante: -1, celular: -1, informe: -1
};


// Palabras que dan vuelta el sentido de la palabra que sigue
const NEGADORES_REGLAS = ["no", "nunca", "jamas", "tampoco"];

// Limpia el texto igual que lo hace modelo.js (copia propia, para no depender de él)
function normalizarReglas(texto) {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // quita las tildes
    .replace(/[^a-z0-9\s]/g, " ")      // cambia los signos por espacios
    .replace(/\s+/g, " ")
    .trim();
}

// Califica un mensaje con las reglas.
// Devuelve { puntaje, etiqueta, coincidencias }, donde coincidencias es una
// lista de { palabra, puntos } con lo que sumó o restó cada regla.
function puntuarPorReglas(texto) {
  const limpio = normalizarReglas(texto);
  const palabras = limpio === "" ? [] : limpio.split(" ");
  const coincidencias = [];
  let puntaje = 0;

  palabras.forEach(function (palabra, i) {
    const base = LEXICO_SPAM[palabra];
    if (typeof base !== "number") return;   // palabra sin regla: se ignora

    let puntos = base;
    // Negación sencilla: "no" en las dos palabras anteriores invierte el signo
    const negada = NEGADORES_REGLAS.indexOf(palabras[i - 1]) !== -1 ||
                   NEGADORES_REGLAS.indexOf(palabras[i - 2]) !== -1;
    if (negada) puntos = -puntos;

    puntaje += puntos;
    coincidencias.push({ palabra: palabra, puntos: puntos });
  });

  // Regla extra: porcentajes o signos de dinero suelen venir en ofertas
  if (/[%$]/.test(String(texto))) {
    puntaje += 1;
    coincidencias.push({ palabra: "% o $", puntos: 1 });
  }

  return {
    puntaje: puntaje,
    etiqueta: puntaje >= UMBRAL_REGLAS ? "spam" : "normal",
    coincidencias: coincidencias
  };
}

// El examen de las reglas. "spam" es la clase positiva, igual que en modelo.js.
// Devuelve { exactitud, vp, fp, vn, fn, total, errores }.
function evaluarReglas(prueba) {
  let vp = 0, fp = 0, vn = 0, fn = 0;
  const errores = [];

  for (const ejemplo of prueba) {
    const res = puntuarPorReglas(ejemplo.texto);
    const real = ejemplo.etiqueta;
    if (real === "spam" && res.etiqueta === "spam") vp += 1;
    else if (real === "normal" && res.etiqueta === "spam") fp += 1;
    else if (real === "normal" && res.etiqueta === "normal") vn += 1;
    else fn += 1;

    if (res.etiqueta !== real) {
      errores.push({ texto: ejemplo.texto, esperada: real, predicha: res.etiqueta, puntaje: res.puntaje });
    }
  }

  const total = prueba.length;
  return {
    exactitud: total === 0 ? 0 : (vp + vn) / total,
    vp: vp, fp: fp, vn: vn, fn: fn,
    total: total,
    errores: errores
  };
}

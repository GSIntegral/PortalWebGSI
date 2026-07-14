/**
 * Reparación de "mojibake": texto UTF-8 que fue leído/guardado como Windows-1252
 * y llega con secuencias como "Ã±" (ñ), "Ã³" (ó), "Ã—" (×), "NÂ°" (N°)…
 *
 * La causa real está en la base de datos (columnas VARCHAR + carga no-UTF-8);
 * esto es solo una red de seguridad para el front. Es idempotente: una cadena
 * ya correcta no se toca, porque el decode UTF-8 en modo estricto falla y se
 * devuelve el original.
 */

// Windows-1252: caracteres del rango 0x80–0x9F → su byte original.
const CP1252_REVERSE: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { fatal: true }) : null;

/** Repara una sola cadena si parece mojibake; si no, la devuelve intacta. */
export function fixMojibake(value: string): string {
  // Marcador típico del mojibake en español: 'Ã' o 'Â' como byte guía UTF-8.
  if (!decoder || (!value.includes('Ã') && !value.includes('Â'))) {
    return value;
  }

  const bytes: number[] = [];
  for (const ch of value) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0xff) {
      bytes.push(cp);
    } else if (CP1252_REVERSE[cp] != null) {
      bytes.push(CP1252_REVERSE[cp]);
    } else {
      return value; // carácter que no proviene de CP1252 → no era mojibake.
    }
  }

  try {
    // Modo estricto: si los bytes no son UTF-8 válido, no era mojibake real.
    return decoder.decode(Uint8Array.from(bytes));
  } catch {
    return value;
  }
}

/**
 * Recorre recursivamente un objeto/array y repara todas sus cadenas.
 * Muta y devuelve el mismo objeto (viene fresco del HTTP, es seguro).
 */
export function fixMojibakeDeep<T>(input: T): T {
  if (typeof input === 'string') {
    return fixMojibake(input) as unknown as T;
  }
  if (Array.isArray(input)) {
    for (let i = 0; i < input.length; i++) {
      input[i] = fixMojibakeDeep(input[i]);
    }
    return input;
  }
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      obj[key] = fixMojibakeDeep(obj[key]);
    }
    return input;
  }
  return input;
}

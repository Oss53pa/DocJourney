/**
 * Calcule le hash SHA-256 d'une chaîne ou d'un ArrayBuffer.
 */
export async function sha256(data: string | ArrayBuffer): Promise<string> {
  const buffer = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Génère un nonce/salt aléatoire de 16 octets en hexadécimal.
 */
export function generateRandomHex(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

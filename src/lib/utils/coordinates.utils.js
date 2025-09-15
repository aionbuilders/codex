/**
 * Trouve l'index du parent le plus proche entre deux chaînes d'ID de chaîne.
 * @param {string} chainId1 - Le premier ID de chaîne.
 * @param {string} chainId2 - Le deuxième ID de chaîne.
 * @returns {number} L'index du parent le plus proche, ou -1 si aucun parent commun n'est trouvé.
 */
export function findClosestParentIndex(chainId1, chainId2) {
  if (!chainId1 || !chainId2) return -1;

  const parts1 = chainId1.split('.');
  const parts2 = chainId2.split('.');
  const minLength = Math.min(parts1.length, parts2.length);
  
  // On commence à -1 et on incrémente tant que ça match
  let i = 0;
  while (i < minLength && parts1[i] === parts2[i]) {
    i++;
  }
  
  if (parts1[i - 1] !== parts2[i - 1] || !parts1[i - 1] || !parts2[i - 1]) {
    return -1; // Aucun parent commun trouvé
  }
  const commonIndex = parts1[i - 1];
  return parseInt(commonIndex, 10); // Convertit l'index en entier
}
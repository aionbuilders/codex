
/**
 * @template {Function} FN
 * @param {FN} fn 
 * @returns {Promise<ReturnType<FN>>}
 */
export function queueMicrotaskAsync(fn) {
  return new Promise((resolve, reject) => {
    queueMicrotask(() => {
      try {
        const result = fn();
        // Si fn retourne une Promise, on attend sa résolution
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}
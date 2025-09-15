
/** 
 * Splits an array into two parts: the initial segment where the predicate is true, and the rest.
 * @template T
 * @param {T[]} arr - The array to split.
 * @param {(item: T) => boolean} fn - The predicate function to test each element.
 * @returns {[T[], T[]]} A tuple where the first element is the initial segment and the second is the rest.
 */
export const until = (arr, fn) => {
  const index = arr.findIndex(x => !fn(x));
  return [
    arr.slice(0, index < 0 ? arr.length : index),
    arr.slice(index < 0 ? arr.length : index)
  ];
};
/**
 * Ordena recursivamente as chaves de um objeto de forma determinística e alfabética.
 */
export function sortObjectDeep(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectDeep);
  }
  
  return Object.keys(obj)
    .sort()
    .reduce((sorted: any, key: string) => {
      sorted[key] = sortObjectDeep(obj[key]);
      return sorted;
    }, {});
}

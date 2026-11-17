/** Minúsculas y sin tildes: "Árbol" y "arbol" coinciden. */
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

/** ¿El nombre contiene la búsqueda? Una búsqueda vacía lo deja pasar todo. */
export const matchesQuery = (name: string, query: string) => normalize(name).includes(normalize(query))

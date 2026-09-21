// Accents are folded away so plain letters match (Étudiants ← etu); precomposed letters keep their index.
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

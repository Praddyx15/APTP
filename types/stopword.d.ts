declare module 'stopword' {
  export function removeStopwords(tokens: string[], stopwords?: string[]): string[];
  export const eng: string[];
  export const fra: string[];
  export const spa: string[];
  export const deu: string[];
  export const ita: string[];
  export const por: string[];
  export const rus: string[];
  export const jpn: string[];
  export const zho: string[];
  export const ara: string[];
  export const hin: string[];
}
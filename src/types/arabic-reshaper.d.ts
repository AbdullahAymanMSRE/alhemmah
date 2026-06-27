// `arabic-reshaper` ships no type declarations. It converts Arabic text to/from
// joined presentation forms; we use it to pre-shape OG image text for satori.
declare module "arabic-reshaper" {
  export function convertArabic(text: string): string;
  export function convertArabicBack(text: string): string;
}

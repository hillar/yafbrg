import { convertNumberToWordsEN } from '../services/n2w.mjs'

export function get(n:number):string {
  return convertNumberToWordsEN(n)
}

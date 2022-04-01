import { convertNumberToWordsEN } from '../../../services/n2w.mjs'
import { convertSquareConfig, LabeledSquareConfig, SquareConfig, LabeledValue } from '../../../services/index.mjs'


export function get(n:number):string {
  return convertNumberToWordsEN(n)
}

/**
* kala asadc
*/
export async function post(sq:SquareConfig,l:LabeledValue):Promise<LabeledSquareConfig> {
  return convertSquareConfig(sq,l)
}

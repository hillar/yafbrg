import { convertNumberToWordsEN } from '../../../services/n2w.mjs'
import { convertSquareConfig, LabeledSquareConfig, SquareConfig, LabeledValue } from '../../../services/index.mjs'


export async function get(kana:number,kala:string,kolja:number):Promise<string|Error> {
  kana = Number(kana)
  if (isNaN(kana)) {
    throw new Error('missing kana as number')
  }
  return convertNumberToWordsEN(kana)
}

/**
* kala asadc
*/
export async function post(sq:SquareConfig,l:LabeledValue):Promise<LabeledSquareConfig> {
  return convertSquareConfig(sq,l)
}

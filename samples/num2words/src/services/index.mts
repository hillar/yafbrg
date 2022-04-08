import {LabeledValue, Color} from './index.interfaces.mjs'
export {LabeledValue, Color } from './index.interfaces.mjs'

export interface SquareConfig {
    color?: Color;
    width?: number;
}
export interface LabeledSquareConfig {
    color?: Color;
    width?: number;
    label: LabeledValue;
}

/**
* kala
*/
export function convertSquareConfig(i:SquareConfig,l:LabeledValue):LabeledSquareConfig {
  const x:LabeledSquareConfig = {...i,label:l}
  return x
}

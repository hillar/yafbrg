export interface LabeledValue {
    label: string;
}
export interface SquareConfig {
    color?: string;
    width?: number;
}
export interface LabeledSquareConfig {
    color?: string;
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

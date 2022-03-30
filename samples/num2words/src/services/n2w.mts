export function convertNumberToWordsEN (value: number): string {
  value = Math.floor(value)
  var ones = [
    '',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen'
  ]
  var tens = [
    '',
    '',
    'twenty',
    'thirty',
    'forty',
    'fifty',
    'sixty',
    'seventy',
    'eighty',
    'ninety'
  ]

  var numString = value.toString()

  if (value < 0) throw new Error('Negative numbers are not supported.')

  if (value === 0) return 'zero'

  //the case of 1 - 20
  if (value < 20) {
    return ones[value]
  }

  if (numString.length === 2) {
    return tens[Number(numString[0])] + ' ' + ones[Number(numString[1])]
  }

  //100 and more
  if (numString.length == 3) {
    if (numString[1] === '0' && numString[2] === '0')
      return ones[Number(numString[0])] + ' hundred'
    else
      return (
        ones[Number(numString[0])] +
        ' hundred and ' +
        convertNumberToWordsEN(+(numString[1] + numString[2]))
      )
  }

  if (numString.length === 4) {
    var end = +(numString[1] + numString[2] + numString[3])
    if (end === 0) return ones[Number(numString[0])] + ' thousand'
    if (end < 100)
      return (
        ones[Number(numString[0])] +
        ' thousand and ' +
        convertNumberToWordsEN(end)
      )
    return (
      ones[Number(numString[0])] + ' thousand ' + convertNumberToWordsEN(end)
    )
  }
  return ''
}

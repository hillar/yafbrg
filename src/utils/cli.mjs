import { Settable } from './settable.mjs'

export class Cli extends Settable {
  #params
  constructor(params,...options){
    const cmdArgs = process.argv.slice(2)
    const _params = Object.keys(params)
    if (_params.length) {
      while (_params[0]){
        const paramName = _params[0]
        if (cmdArgs[0] && !cmdArgs[0]?.startsWith('-')){
          options[0][paramName] = cmdArgs[0]//.push(tmp)
          cmdArgs.shift()
        } else options[0][paramName] = params[paramName]
        _params.shift()
      }
    }
    super(...options)
    this.#params = Object.keys(params)
    if (cmdArgs.includes('-h') || cmdArgs.includes('--help')) {
      this.help()
      process.exit(0)
    }
    // look for command line options
    // if not set, look for ENV
    for (const settable of this.settings){
      const is = cmdArgs.filter(x=>x.includes(settable))
      if (is.length>0){
        const bittes = is[0].split("=")
        if (bittes.length === 2) {
          process.env[settable.toUpperCase()] = bittes[1]
        } else {
          const i = cmdArgs.indexOf(is[0])
          process.env[settable.toUpperCase()] = cmdArgs[i+1]
        }
      }
      try {
        if (process.env[settable.toUpperCase()]) this[settable] = process.env[settable.toUpperCase()]
      } catch (error){
        let message = error.toString()
        if (!message.includes(error.settable)) message = message.replace('Error:', `Error: ${error.settable.toUpperCase()} `)
        console.error(message)
        process.exit(1)
      }
    }
    if (process.stdout.isTTY) {
      console.log(this.prototypeof.toLowerCase(),'starting with:',this.defaults)
    }
  }
  help(){
    const defaults = this.defaults
    console.log('params:', this.#params.join(' '))
    console.log('options:')
    for (const param of Object.keys(defaults)){
      console.log(`--${param}`,'\t default:',defaults[param])
    }
  }
}



/*
console.dir(cli.settings)
console.dir(cli.defaults)
*/

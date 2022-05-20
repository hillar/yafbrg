import { Settable } from './settable.mjs'
import { homedir } from 'node:os'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

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
    // load rc first if exists
    let rcRaw
    let createRCFileinHomedir
    const rcVals = {}
    let rcFile = `.${this.prototypeof.toLowerCase()}rc`
    try {
      rcRaw = readFileSync(rcFile,'utf-8')
    } catch (error) {
      try {
        rcFile = join(homedir(),rcFile)
        rcRaw = readFileSync(rcFile,'utf-8')
      } catch (error) {
        createRCFileinHomedir = true
      }
    }
    if (rcRaw) {
      for (const line of rcRaw.split('\n')){
        const [settable,value] = line.split('=')
        try {
          this[settable] = value
        }  catch (error) {
          let message = error.toString()
          if (!message.includes(error.settable)) message = message.replace('Error:', `Error: ${error.settable.toUpperCase()} `)
          console.error(rcFile, message)
        }
      }
    }
    // look for command line options
    // if not set, look for ENV
    for (const settable of this.settings){
      const is = cmdArgs.filter(x=>x.includes(settable))
      if (is.length>0){
        const bittes = is[0].split("=")
        if (bittes.length === 2) {
          const clean = bittes[0].replace('--','').toUpperCase()
          if (settable.toUpperCase() === clean)
            process.env[settable.toUpperCase()] = bittes[1]
        } else {
          const i = cmdArgs.indexOf(is[0])
          // TODO chech match
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
    if (createRCFileinHomedir) {
      // TODO exluce list
      const exludes = ['workDir','outDir','production']
      let rcStr = ''
      for (const settable of this.settings){
        if (!exludes.includes(settable)) rcStr += `${settable}=${this[settable]}\n`
      }
      try {
        writeFileSync(rcFile,rcStr)
        if (process.stdout.isTTY) console.log('created',rcFile)
      } catch (error) {
        console.error(error)
        //noop
      }
    }
    /*
    if (process.stdout.isTTY) {
      console.log(this.prototypeof.toLowerCase(),'starting with:',this.defaults)
    }
    */
  }
  help(){
    const defaults = this.defaults
    //console.log('params:', this.#params.join(' '))
    console.log('params:')
    for (const param of Object.keys(defaults).filter(x=>this.#params.includes(x))){
      console.log(`${param}`,'\t default:',defaults[param])
    }
    console.log('options:')
    for (const param of Object.keys(defaults).filter(x=>!this.#params.includes(x))){
      console.log(`--${param}`,'\t default:',defaults[param])
    }
  }
}

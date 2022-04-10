import { Cli } from './utils/cli.mjs'
import { parseAllMTS } from './yafbrg.mjs'
import { mkdirSync, readFileSync, writeFileSync, accessSync, constants } from 'node:fs'
import { join, dirname } from 'node:path'

function fsExistsundWritable(name){
  try {
    accessSync(name, constants.R_OK | constants.W_OK);
    return true
  } catch (err) {
    return false
  }
}

// ----

const TEMPLATES = {
  polka: `
import { default as polka } from 'polka'
/*IMPORTS*/

const LISTENPORT= process.env.PORT || /*DEFAULTPORT*/

polka()
/*ROUTES*/
    .listen(LISTENPORT, (l) => {
      console.log("> Polka server running on localhost:",LISTENPORT);
    })
  `,
  express:`
import { default as express } from 'express'
/*IMPORTS*/

const LISTENPORT= process.env.PORT || /*DEFAULTPORT*/

express()
/*ROUTES*/
.listen(LISTENPORT, (l) => {
  console.log("> Express server running on localhost:",LISTENPORT);
})
  `,
  fastify: `
import { default as fastify } from 'fastify';
/*IMPORTS*/

const LISTENPORT= process.env.PORT || /*DEFAULTPORT*/

fastify.route(/*ROUTES*/)

try {
  await fastify.listen(3000)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}

  `,
  dummyroute:`
  import {dummy} from '$providers/dummy.mjs'
  import {dummy as IDummy} from '$interfaces/foo/bar.mjs'
  export function get():string{
    return ''
  }
  `,
  dummyprovider: `
  export function dummy(n:number):string{
    return ''
  }
  `

}

// ----

const POLKA = 'polka'
const EXPRESS = 'express'
const FASTIFY = 'fastify'
const FRAMEWORKS = [POLKA,EXPRESS,FASTIFY]


const port = (v) => {
  const port = v ? Number(v) : 6789
  if (!port) throw new Error('port not number')
  if (port > 65535 || port < 0) throw new Error('should be >= 0 and < 65536')
  return port
}
const production = (v) => {
  return v ? true : (process.env.NODE_ENV === 'production' ? true : false)
}
const framework = (v) => {
  if (!v) return POLKA
  if (FRAMEWORKS.includes(v)) return v
  else throw new Error('must be one of:' + FRAMEWORKS.join(','))
}

const SRCPATH = 'src'
const ROUTESPATH = 'routes'
const TEMPLATESUFFIX = '-server.template.mjs'


class YAFBRG_Cli extends Cli{
  constructor(){

    super({workDir:`./${framework()}`,outDir:`./.${framework()}-build`},{port, framework, production})
  }
  async build(){

    if (!this.workDir.startsWith('./')) this.workDir = './'+this.workDir
    const srcDir = join(this.workDir,SRCPATH)
    const routesDir = join(this.workDir,SRCPATH,ROUTESPATH)
    // there is no workir, make one
    if (!fsExistsundWritable(this.workDir)) {
          console.log('bootstraping ...')
      mkdirSync(this.workDir)

      if (!fsExistsundWritable(srcDir)) mkdirSync(srcDir)
      const templateFilename = join(srcDir,this.framework+TEMPLATESUFFIX)
      if (!fsExistsundWritable(templateFilename)) writeFileSync(templateFilename,TEMPLATES[this.framework])

      if (!fsExistsundWritable(routesDir)) mkdirSync(routesDir)
      const defaultroutepreffix = 'api/v1'
      const defaultroutes = [
      'status/index.mts',
      'status/version.mts',
      'status/upstreams.mts',
      'status/upstreams/[backend].mts',
      'health/index.mts',
      'health/upstreams/[backend].mts',
      ]
      for (const defaultroute of defaultroutes){
        const routefile = join(routesDir,defaultroutepreffix,defaultroute)
        console.dir(routefile)
        if (!fsExistsundWritable(routefile)) {
          const dname = dirname(routefile)
          if (!fsExistsundWritable(dname)) mkdirSync(dname,{recursive:true})
          writeFileSync(routefile,`// ${routefile}\n`+TEMPLATES['dummyroute'])
        }
      }
      const defaultproviderspreffix = 'providers'
      const defaultproviders = [
      'dummy.mts',
      'foo/bar.mts',
      ]
      for (const defaultprovider of defaultproviders){
        const routefile = join(srcDir,defaultproviderspreffix,defaultprovider)
        console.dir(routefile)
        if (!fsExistsundWritable(routefile)) {
          const dname = dirname(routefile)
          if (!fsExistsundWritable(dname)) mkdirSync(dname,{recursive:true})
          writeFileSync(routefile,`// ${routefile}\n`+TEMPLATES['dummyprovider'])
        }
      }
      const defaultinterfacespreffix = 'interfaces'
      const defaultinterfaces = [
      'dummy.mts',
      'foo/bar.mts',
      ]
      for (const defaultinterface of defaultinterfaces){
        const routefile = join(srcDir,defaultinterfacespreffix,defaultinterface)
        console.dir(routefile)
        if (!fsExistsundWritable(routefile)) {
          const dname = dirname(routefile)
          if (!fsExistsundWritable(dname)) mkdirSync(dname,{recursive:true})
          writeFileSync(routefile,`// ${routefile}\n`+TEMPLATES['dummyprovider'])
        }
      }
    }
    console.log('compiling with tsc ..')

    const {schemas,parsed:paths} = await parseAllMTS(srcDir,this.outDir,this.workDir)
    console.dir(paths)
  }
}

const cli = new YAFBRG_Cli()
await cli.build()

import { Cli } from './utils/cli.mjs'
import { parseAllMTS, toPolka, parseRoute } from './yafbrg.mjs'
import { compileundparse, toOpenApi, primitives } from './utils/parseMTS.mjs'
import { readdirSync, mkdirSync, readFileSync, writeFileSync, accessSync, constants } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { default as chokidar } from 'chokidar'
import { execa, execaCommandSync } from 'execa'



function fsExistsundWritable(name){
  try {
    accessSync(name, constants.R_OK | constants.W_OK);
    return true
  } catch (err) {
    return false
  }
}

// ----

const ALLOWEDMETHODS = ['HEAD','GET','POST','PUT','PATCH','DEL']

const TEMPLATES = {
  polka: `
import { default as polka } from 'polka'
/*IMPORTS*/

const LISTENPORT= process.env.PORT || /*DEFAULTPORT*/

polka()
/*ROUTES*/
// https://github.com/braidn/tiny-graphql/blob/master/index.mjs
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
  import {IDummy} from '$interfaces/foo/bar.mjs'
  export function get():string{
    return ''
  }
  `,
  dummyprovider: `
  export function dummy(n:number):string{
    return ''
  }
  `,
  dummyinterface: `
  export interface IDummy {
    backend: string;
  }
  `,
  dummypackage:`
  {
    "name": "DUMMY",
    "version": "0.0.0"
  }
  `

}



// ----

const POLKA = 'polka'
const EXPRESS = 'express'
const FASTIFY = 'fastify'
const FRAMEWORKS = [POLKA,EXPRESS,FASTIFY]
const OPENAPIFILENAME = 'openapi.json'

// TODO well known
const WELLKNOWNSCHEMAPATH = '.well-known/schema-discovery'
const WELLKNOWNSCHEMA = [{
    "schema_url": `/${OPENAPIFILENAME}`,
    "schema_type": "openapi-3.0"
  }]
// TODO load from package.json
const  WELLKNOWNSECURITYCONTACTPATH = '/.well-known/security.txt'
const WELLKNOWNSECURITYCONTACT =  `
Contact: mailto:kala@na.ee
Expires: 2022-04-30T16:44:00.000Z
`

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

const docsgenerator = (v) => {
  if (!v) return '/usr/local/bin/openapi-generator generate -g markdown -i '
  const cmd = v.split(' ')[0]
  //if (fsExistsundExecutable(cmd))
  // else throw new Error('not found or not executable: '+cmd)
  return v
}

const SRCPATH = 'src'
const ROUTESPATH = 'routes'
const DOCSPATH = 'docs'
const TEMPLATESUFFIX = '-server.template.mjs'


class YAFBRG_Cli extends Cli{
  constructor(){
    super({workDir:`./${framework()}`,outDir:`./${framework()}/.build`},{port, framework, production,docsgenerator})
    if (this.workDir !== framework() && this.outDir === `./${framework()}/.build`){
      this.outDir = this.workDir+'/.build'
    }
    if (process.stdout.isTTY) {
      console.log(this.prototypeof.toLowerCase(),'starting with:',this.defaults)
    }
    this.cached = {routes:new Map(), schemas:new Map()}
  }
  async firstrun(){
    const dev = process.env.NODE_ENV !== "production";
    if (!this.workDir.startsWith('./')) this.workDir = './'+this.workDir
    const srcDir = join(this.workDir,SRCPATH)
    this.srcDir = srcDir
    const routesDir = join(this.workDir,SRCPATH,ROUTESPATH)
    this.routesDir = routesDir
    this.docsDir = join(this.workDir,DOCSPATH)
    // there is no workir, make one
    if (!fsExistsundWritable(this.workDir)) {
          console.log('bootstraping ...')
      mkdirSync(this.workDir)
      mkdirSync(this.docsDir)

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
          writeFileSync(routefile,`// ${routefile}\n`+TEMPLATES['dummyinterface'])
        }
      }
      execaCommandSync(`cd "${this.workDir}" && pwd && npm init -y && yarn add -D ${this.framework}`,{shell:true,stdio: 'inherit'})
      //.stdout.pipe(process.stdout)
      //.stderr.pipe(process.stderr)

    }
    // paths aliases
    const tmppathAliases = readdirSync(join(this.workDir,SRCPATH),{withFileTypes:true})
    .filter(f=>f.isDirectory())
    .map(f=>f.name)
    .filter(x=>x!==ROUTESPATH)
    .map(x=>{const tmp= {}; tmp[`\$${x}/*`]=[`./${SRCPATH}/${x}/*`]; return tmp})
    this.pathAliases = {}
    for (const p of tmppathAliases ){
      this.pathAliases = {...this.pathAliases,...p}
    }

    console.log('First run, compiling all with tsc. This may take a while ..')
    /*
    const {schemas,parsed:paths} = await parseAllMTS(routesDir,this.outDir,this.workDir,this.pathAliases)
    this.cached = {schemas, paths}
    console.dir(paths)
    const templateFilename = join(srcDir,this.framework+TEMPLATESUFFIX)
    if (fsExistsundWritable(templateFilename)){
      const templateServer = readFileSync(templateFilename,'utf-8')
      const serverSource = toPolka(templateServer,paths,join(this.outDir,SRCPATH),this.port)
      const serverFilename = join(this.outDir,SRCPATH,this.framework+'-server.mjs')
      writeFileSync(serverFilename,serverSource)
    } else {
      console.error('cant find server template file', templateFilename)
    }
    */
  }

  async rebuild(filenames){
    //console.dir({rebuild:filenames,routesDir:this.routesDir})
    const updates = []
    for (const {event,filename} of filenames.filter(({event})=>event!=='unlink')) {
      if (!filename.endsWith('.mts')) continue
      if (!filename.startsWith(this.routesDir)) continue
      const parsed = await compileundparse(filename,this.outDir,this.workDir,this.pathAliases)
      //console.dir(filename)
      //console.dir(parsed)
      updates.push({filename,parsed})
    }
    return this.cacheUpdate(updates,filenames.filter(({event})=>event==='unlink').map(({filename})=>filename))
  }

  async cacheUpdate(updates,deletes=[]){
    for (const filename of deletes){
      const cleaned = filename.replace(this.routesDir,'').replace('index.mts','').replace('.mts','')
      const route = parseRoute(cleaned)
      this.cached.routes.delete(route.pattern.toString())
      // schemas are not deleted !
    }
    // routes map
    const routeConflicts = []
    const schemaConflicts = []
    for (const { filename,parsed } of updates ){
      const cleaned = filename.replace(this.routesDir,'').replace('index.mts','').replace('.mts','')
      const route = parseRoute(cleaned)
      route.compiledFilename = filename
      if (this.cached.routes.has(route.pattern.toString())){
        const prev = this.cached.routes.get(route.pattern.toString())
        if (route.orig !== prev.route.orig){
          routeConflicts.push({a:prev.route.orig,b:route.orig})
          continue
        } else {
          this.cached.routes.delete(route.pattern.toString())
        }
      }

      const methods = []
      const { methods:maybeMethods, interfaces} = parsed
      for (const method of maybeMethods) {
        if (!ALLOWEDMETHODS.includes(method.name.toUpperCase())) continue
        methods.push(method)
      }
      this.cached.routes.set(route.pattern.toString(),{route,methods})

      for (const maybeInterface of Object.keys(interfaces)){

        if (this.cached.schemas.has(maybeInterface)) {
            const prev = this.cached.schemas.get(maybeInterface)
            const canditate = interfaces[maybeInterface]
            console.dir({prev,canditate})
        } else {
          this.cached.schemas.set(maybeInterface,interfaces[maybeInterface])
        }
      }

    }
    if (routeConflicts.length) {
      console.error('*** ROUTE CONFLICTS ***')
      console.error(routeConflicts)
      console.error('***  ***')
      return false
    }
    if (schemaConflicts.length) {
      console.error('*** SCHEMA CONFLICTS ***')
      console.error(schemaConflicts)
      console.error('***  ***')
      return false
    }



    // prep for openapi

    const types =  []

    console.log('using interfaces:')
    let tmp = []
    this.cached.schemas.forEach((v)=>{
      tmp.push(v.name)
      types.push(v)
    })
    console.log(tmp.sort((a,b)=>a>b?1:-1))
    const {data:openapi} = toOpenApi({ version:1, types })
    // TODO load from package.json
    openapi.info = {version:'0.0.1',title:this.workDir}
    console.log('using routes:')
    tmp = []
    this.cached.routes.forEach(({route, methods})=>{
      tmp.push(route.orig)
      console.dir(route)
      console.dir(methods)
      // "/api/target/{slug}/cases":
      openapi.paths[route.curlified] = {}
      for (const method of methods){
        let mn = method.name
        if (mn==="del") mn = 'delete'
        openapi.paths[route.curlified][mn] = {parameters:[],responses:{"200":{"description":"",content:{}}}}
        openapi.paths[route.curlified][mn].summary = method.jsDoc
        //openapi.paths[route.curlified][mn].parameters.push(...)
        for (const {name,type,required} of method.parameters){
          const tmp = {name,required}
          tmp.schema = {}
          if (primitives.includes(type)) tmp.schema.type = type
          else tmp.schema = {"$ref":`#/components/schemas/${type}`}
          if (route.keys.includes(name)) tmp.in = 'path'
          else tmp.in = 'query'
          openapi.paths[route.curlified][mn].parameters.push(tmp)
        }
        if (primitives.includes(method.type)){
          openapi.paths[route.curlified][mn].responses['200'].content["text/plain"] = {schema:{type:method.type}}
        } else {
          openapi.paths[route.curlified][mn].responses['200'].content["application/json"] = {schema:{"$ref":`#/components/schemas/${method.type}`}}
        }
      }
    })
    console.log(tmp.sort((a,b)=>a>b?1:-1))
    const openApiFilename = join(this.srcDir,OPENAPIFILENAME)
    writeFileSync(openApiFilename,JSON.stringify(openapi))
    // generate docs
    execaCommandSync(`cd "${this.docsDir}" &&  ${this.docsgenerator} ../${SRCPATH}/${OPENAPIFILENAME}`,{shell:true,stdio: 'inherit'})
    // TODO test openapi with some generator
    // /usr/local/bin/openapi-generator generate -i ../../src/openapi.json -g python
    // /usr/local/bin/openapi-generator generate -i ../../src/openapi.json -g markdown



    // make server
    const templateFilename = join(this.srcDir,this.framework+TEMPLATESUFFIX)
    if (fsExistsundWritable(templateFilename)){
      const templateServer = readFileSync(templateFilename,'utf-8')
      const serverSource = toPolka(templateServer,this.cached.routes,this.srcDir,this.port)
      const serverFilename = join(this.outDir,SRCPATH,this.framework+'-server.mjs')
      writeFileSync(serverFilename,serverSource)
    } else {
      console.error('cant find server template file', templateFilename)
      return false
    }
    return true
  }

}


const cli = new YAFBRG_Cli()
await cli.firstrun()


const serverFilename = join('./',cli.outDir,SRCPATH,cli.framework+'-server.mjs')
// console.log('starting ..',serverFilename)
let subprocessServer
/*
try {
subprocessServer = execa(`node`,[`${serverFilename}`] )//, {signal: abortServer.signal}).stdout.pipe(process.stdout);
subprocessServer.stdout.pipe(process.stdout)
} catch (eee) {
  console.dir({eee})
}
*/

let paths = []
let timeoutId
let running
async function restart(path){
  if (path.filename.endsWith(OPENAPIFILENAME)) return
  if (running) {
    console.dir({running:timeoutId})
  }
  clearTimeout(timeoutId)
  // collect changes
  paths.push(path)
  timeoutId = setTimeout(async () => {
    if (!paths.length) return
    running = true
    timeoutId = null
    //console.dir({paths})
    //console.dir({changed:paths.map(({filename})=>filename)})
    if (subprocessServer?.kill && !subprocessServer.killed) await subprocessServer.kill('SIGTERM', {
      forceKillAfterTimeout: 1
    });
    if (await cli.rebuild(paths)){
      console.log('restarting ..',serverFilename)
      subprocessServer = execa(`node`,[`${serverFilename}`] )
      subprocessServer.stdout.pipe(process.stdout)
      subprocessServer.stderr.pipe(process.stderr)
      running = false
    }
    paths = []
    /*
    console.log('restarting ..',serverFilename)
    if (subprocessServer?.kill && !subprocessServer.killed) await subprocessServer.kill('SIGTERM', {
      forceKillAfterTimeout: 1
    });
    subprocessServer = execa(`node`,[`${serverFilename}`] )
    subprocessServer.stdout.pipe(process.stdout)
    subprocessServer.stderr.pipe(process.stderr)
    */
    running = false
  }, 500)
}


setTimeout(async () => {
  chokidar.watch(join(cli.workDir,SRCPATH),{ignored:OPENAPIFILENAME})
  .on('abort', abort => log(`Watcher abort: ${abort}`))
  .on('error', error => log(`Watcher error: ${error}`))
  .on('change', async (path) => {await restart({filename:path,event:'change'})})
  .on('add', async (path) => {await restart({filename:path,event:'add'})})
  .on('unlink', async (path) => {await restart({filename:path,event:'unlink'})})
  //await subprocessServer
},1000)



/*
change polka/src/routes/api/v1/status/version.mts

// mv polka/src/routes/api/v1/health -> polka/src/routes/api/v1/status/health
unlink polka/src/routes/api/v1/health/index.mts
unlink polka/src/routes/api/v1/health/upstreams/[backend].mts
unlinkDir polka/src/routes/api/v1/health/upstreams
unlinkDir polka/src/routes/api/v1/health
addDir polka/src/routes/api/v1/status/health
add polka/src/routes/api/v1/status/health/index.mts
addDir polka/src/routes/api/v1/status/health/upstreams
add polka/src/routes/api/v1/status/health/upstreams/[backend].mts


*/

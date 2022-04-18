#!/usr/bin/env node

import { render, routes2data, getDefaultTemplate } from './utils/mustache.mjs'
import { Cli } from './utils/cli.mjs'
import { parseAllMTS, parseRoute, findAllMTS } from './yafbrg.mjs'
import { compileundparse, toOpenApi, primitives } from './utils/parseMTS.mjs'
import { readdirSync, mkdirSync, readFileSync, writeFileSync, accessSync, constants, readlinkSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { default as chokidar } from 'chokidar'
import { execa, execaCommandSync } from 'execa'
import copy from 'recursive-copy';


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

  dummyroute:`
  import {dummy} from '$providers/dummy.mjs'
  import {IDummy} from '$interfaces/foo/bar.mjs'
  export function get(backend:string):string{
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
const PACKAGEMANAGERS = ['npm','pnpm','yarn']
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

const skeleton = (v) => {
  if (!v) return ''
  if (fsExistsundWritable(v)) return v
  else throw new Error('can not find skeleton: ' + v)
}

const packagemanager = (v) => {
  if (!v) return PACKAGEMANAGERS[0]
  if (PACKAGEMANAGERS.includes(v)) return v
  else throw new Error('must be one of:' + PACKAGEMANAGERS.join(','))
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
const TEMPLATESUFFIX = '-server.mustache'//.template.mjs'





class YAFBRG_Cli extends Cli{
  constructor(){
    super({workDir:`./${framework()}`,outDir:`./${framework()}/.build`},{port, framework, production,docsgenerator,packagemanager,skeleton})
    if (this.workDir !== framework() && this.outDir === `./${framework()}/.build`){
      this.outDir = this.workDir+'/.build'
    }
    if (process.stdout.isTTY) {
      console.log(this.prototypeof.toLowerCase(),'starting with:',this.defaults)
    }
    if (resolve(this.skeleton) === resolve(this.workDir)) {
      console.error('skeleton can not be same as workdir: ', this.skeleton)
      process.exit(1)
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
      mkdirSync(this.srcDir)
      mkdirSync(this.routesDir)
      if (!fsExistsundWritable(srcDir)) mkdirSync(srcDir)

      const templateFilename = join(srcDir,this.framework+TEMPLATESUFFIX)

      if (this.skeleton) {
        console.log('using skeleton',this.skeleton)
        // just copy all
        await copy(resolve(this.skeleton),resolve(this.workDir))
        execaCommandSync(`cd "${this.workDir}" && ${this.packagemanager} install`,{shell:true,stdio: 'inherit'})

        /*
        const skeletonFilename = join(this.skeleton,this.framework+TEMPLATESUFFIX)
        try {
          let template = readFileSync(skeletonFilename,'utf-8')
          writeFileSync(templateFilename,template)

        } catch (error) {
          console.error(skeletonFilename)
          console.error(error)
        }
        */
      } else { // no skeleteon, just fill dirs with hardcoded stuff ...
        console.log('using hardcoded sample')
        let template = getDefaultTemplate([this.framework])
        if (!fsExistsundWritable(templateFilename)) writeFileSync(templateFilename,template)
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
        // TODO handle @next
        execaCommandSync(`cd "${this.workDir}" && pwd && npm init -y && yarn add -D ${this.framework}@next`,{shell:true,stdio: 'inherit'})
      }


    }
    // paths aliases
    // TODO check is symbolic link directory
    const tmppathAliases = readdirSync(join(this.workDir,SRCPATH),{withFileTypes:true})
    .filter(f=>f.isDirectory()||f.isSymbolicLink())
    .map(f=>f.name)
    .filter(x=>x!==ROUTESPATH)
    .map(x=>{const tmp= {}; tmp[`\$${x}/*`]=[`./${SRCPATH}/${x}/*`]; return tmp})
    this.pathAliases = {}
    for (const p of tmppathAliases ){
      this.pathAliases = {...this.pathAliases,...p}
    }
    // read package.json
    const packageFilename = join(this.workDir,'package.json')
    this.packageJson = JSON.parse(readFileSync(packageFilename,'utf-8'))
    // build prod or start watching changes ..
    if (this.production){
      const allRouteMTS = (await findAllMTS(this.routesDir)).map(x=> {return {filename:x,event:'add'}})
      const exitCode = (await this.rebuild(allRouteMTS)) ? 0 : 1
      //TODO print some pretti report ..
      process.exit(exitCode)
    } else {
      console.log('First run, compiling all with tsc. This may take a while ..')
    }
  }

  async rebuild(fileEvents){
    const updates = []
    const failed = []
    for (const { filename } of fileEvents.filter(({event})=>event!=='unlink')) {
      if (!filename.endsWith('.mts')) continue
      if (!filename.startsWith(this.routesDir)) continue
      const parsed = await compileundparse(filename,this.outDir,this.workDir,this.pathAliases)
      const { interfaces, methods } = parsed
      if (!(interfaces && methods)) failed.push(filename)
      updates.push({filename,parsed})
    }
    if (failed.length){
      console.error('*** FAILED TSC ***')
      console.error(failed)
      console.error('***  ***')
      return false
    }
    return this.cacheUpdate(updates,fileEvents.filter(({event})=>event==='unlink').map(({filename})=>filename))
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
    const paramWarnings = []
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
        if (route.keys.length) {
          const mp = method.parameters.map(({name})=>name)
          for (const inpath of route.keys) {
            if (!mp.includes(inpath)){
              paramWarnings.push({missing:{route:route.orig,method:method.name,inpath}})
            }
          }
        }
        methods.push(method)
      }
      this.cached.routes.set(route.pattern.toString(),{route,methods})

      //TODO interfaces are deduped before reaching here ;/
      for (const maybeInterface of Object.keys(interfaces)){
        if (this.cached.schemas.has(maybeInterface)) {
            const prev = this.cached.schemas.get(maybeInterface)
            const canditate = interfaces[maybeInterface]
            //console.dir({b:(prev.orig !== canditate.orig),prev,canditate})
            if (prev.orig !== canditate.orig) {
              schemaConflicts.push({interface:maybeInterface,a:prev.orig,b:canditate.orig})
            }
        } else {
          this.cached.schemas.set(maybeInterface,interfaces[maybeInterface])
        }
      }
    }

    if (routeConflicts.length) {
      console.error('*** ROUTE CONFLICTS ***')
      console.error(routeConflicts)
      console.error('***  ***')
    }
    if (schemaConflicts.length) {
      console.error('*** SCHEMA CONFLICTS ***')
      console.error(schemaConflicts)
      console.error('***  ***')
    }
    if (paramWarnings.length){
      console.error('*** MISSING INPATH PARAMS ***')
      console.error(paramWarnings)
      console.error('***  ***')
    }
    if (paramWarnings.length || schemaConflicts.length || routeConflicts.length) return false



    // prep for openapi

    const types =  []

    //console.log('using interfaces:')
    let tmp = []
    this.cached.schemas.forEach((v)=>{
      tmp.push(v.name)
      types.push(v)
    })
    //console.log(tmp.sort((a,b)=>a>b?1:-1))

    const {data:openapi} = toOpenApi({ version:1, types })
    // load from package.json
    const { version, name:title, description, author } = this.packageJson
    openapi.info = { version, title, description, contact: { name: author } }
    console.log('using routes:')
    tmp = []
    this.cached.routes.forEach(({route, methods})=>{
      tmp.push(route.orig)
      // "/api/target/{slug}/cases":
      openapi.paths[route.curlified] = {}
      for (const method of methods){
        let mn = method.name
        if (mn==="del") mn = 'delete'
        openapi.paths[route.curlified][mn] = {parameters:[],responses:{"200":{"description":"",content:{}}}}
        openapi.paths[route.curlified][mn].summary = method?.jsDoc?.join(' ') || ''
        const requestBodyproperties = {}
        let requestBodyRequired = false
        for (const {name,type,required} of method.parameters){
          const tmp = {name,required}
          tmp.schema = {}
          if (primitives.includes(type)) {
            tmp.schema.type = type
            if (route.keys.includes(name)) tmp.in = 'path'
            else tmp.in = 'query'
            openapi.paths[route.curlified][mn].parameters.push(tmp)
          } else {
            tmp.schema = {"$ref":`#/components/schemas/${type}`}
            requestBodyproperties[name] ={"$ref":`#/components/schemas/${type}`,required}
            if (required) requestBodyRequired = true
          }
        }
        if (Object.keys(requestBodyproperties).length) {
          openapi.paths[route.curlified][mn].requestBody = {required:requestBodyRequired}
          openapi.paths[route.curlified][mn].requestBody.content = {"application/json":{schema:{type: "object",properties:requestBodyproperties}}}
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
    try {
      execaCommandSync(`cd "${this.docsDir}" &&  ${this.docsgenerator} ../${SRCPATH}/${OPENAPIFILENAME}`,{shell:true,stderr: 'inherit'})
    } catch (e) {
      return false
    }
    // make server
    const templateFilename = join(this.srcDir,this.framework+TEMPLATESUFFIX)
    if (fsExistsundWritable(templateFilename)){
      //const templateServer = readFileSync(templateFilename,'utf-8')
      //console.dir(this.cached.routes)
      const serverSource = render(templateFilename,routes2data(this.cached.routes,this.port,this.srcDir))
      //const serverSource = toPolka(templateServer,this.cached.routes,this.srcDir,this.port)
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
let subprocessServer
let paths = []
let timeoutId
let running
async function restart(path){
  if (path.filename.endsWith(OPENAPIFILENAME)) return
  if (running) {
    console.dir({running:timeoutId})
  }
  clearTimeout(timeoutId)
  // collect changes, but dedup with last event
  let isprev = false
  if (paths.length) {
    for (const prev of paths){
      if (prev.filename === path.filename) {
        prev.event = path.event
        isprev = true
      }
    }
  }
  if (!isprev) paths.push(path)
  timeoutId = setTimeout(async () => {
    if (!paths.length) return
    running = true
    timeoutId = null
    if (subprocessServer?.kill && !subprocessServer.killed) await subprocessServer.kill('SIGTERM', {
      forceKillAfterTimeout: 1
    });
    const buildResult = await cli.rebuild(paths)
    if (buildResult){
      console.log('restarting ..',serverFilename)
      subprocessServer = execa(`node`,[`${serverFilename}`] )
      subprocessServer.stdout.pipe(process.stdout)
      subprocessServer.stderr.pipe(process.stderr)
      running = false
      paths = []
    } else {
      // rebuild failed, keep paths
    }
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

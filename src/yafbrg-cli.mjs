#!/usr/bin/env node

import { render, routes2data, getDefaultTemplate } from './utils/mustache.mjs'
import { Cli } from './utils/cli.mjs'
import { parseAllMTS, parseRoute, findAllMTS } from './yafbrg.mjs'
import { compileundparse, toOpenApi, toGraphql, primitives } from './utils/parseMTS.mjs'
import { readdirSync, mkdirSync, readFileSync, writeFileSync, accessSync, constants, readlinkSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url';
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

function fsExistsundExecutable(name){
  try {
    accessSync(name, constants.R_OK | constants.X_OK);
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

function getFrameworks(){
  const selfDir = dirname(fileURLToPath(import.meta.url))
  const defaultSekeletonsDir = resolve(join(selfDir,'../samples/skeletetons'))
  const skeles = readdirSync(defaultSekeletonsDir)
}




//const POLKA = 'polka'
//const EXPRESS = 'express'
//const FASTIFY = 'fastify'
//const FRAMEWORKS = getFrameworks() //[POLKA,EXPRESS,FASTIFY]
const PACKAGEMANAGERS = ['npm','pnpm','yarn']
const OPENAPIFILENAME = 'openapi.json'
const OPENAPIDIRNAME = '__openapi__'
const GQLSCHEMAFILENAME = 'graphql-schema.mjs'
const GQLSOPERATIONSFILENAME = 'graphql-resolvers.mjs'

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

function getSkeletonDir(){
  return resolve(join(dirname(fileURLToPath(import.meta.url)),'../samples/skeletetons'))
}
const FRAMEWORKS = readdirSync(getSkeletonDir()).sort()
const framework = (v) => {
  if (!v) return FRAMEWORKS[0]
  if (FRAMEWORKS.includes(v)) return v
  else throw new Error('must be one of: ' + FRAMEWORKS.join(', ')+'\ngot :"'+ v+'"')
}
const sample = framework

const skeleton = (v) => {
  if (!v) return ''
  if (fsExistsundWritable(v) && fsExistsundWritable(resolve(join(v,SRCPATH)))) return v
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
  if (fsExistsundExecutable(cmd)) return v
  else throw new Error('not found or not executable: '+cmd)

}

const SRCPATH = 'src'
const ROUTESPATH = 'routes'
const DOCSPATH = 'docs'
const TEMPLATESUFFIX = '-server.mustache'//.template.mjs'


class YAFBRG_Cli extends Cli{
  constructor(){
    super({workDir:`./`},{port, sample, production,docsgenerator,packagemanager,skeleton})
      //this.workDir = resolve(this.workDir)
    //if (this.workDir !== framework() && this.outDir === `./${framework()}/.build`){
      this.outDir = this.workDir+'/.build'
    //}
    if (process.stdout.isTTY) {
      console.log(this.prototypeof.toLowerCase(),'starting with:',this.defaults)
    }
    if (this.skeleton.length && resolve(this.skeleton) === resolve(this.workDir)) {
      console.error('skeleton can not be same as workdir: ', this.skeleton)
      process.exit(1)
    }
    this.cached = {routes:new Map(), schemas:new Map()}
  }
  async firstrun(){
    const selfDir = dirname(fileURLToPath(import.meta.url))
    const defaultSekeletonsDir = resolve(join(selfDir,'../sample/skeletetons'))
    if (!this.workDir.startsWith('./')) this.workDir = './'+this.workDir
    const srcDir = join(this.workDir,SRCPATH)
    this.srcDir = srcDir
    const routesDir = join(this.workDir,SRCPATH,ROUTESPATH)
    this.routesDir = routesDir
    this.docsDir = join(this.workDir,DOCSPATH)
    // there is no workir, make one
    //resolve(join(this.workDir,SRCPATH))
    if (!fsExistsundWritable(resolve(join(this.workDir,SRCPATH)))) {
      //TODO check for existing dirs & files and warn ...
      console.log('bootstraping ...')
      if (!fsExistsundWritable(resolve(join(this.workDir)))) mkdirSync(this.workDir)
      mkdirSync(this.docsDir)
      mkdirSync(this.srcDir)
      mkdirSync(this.routesDir)
      //const templateFilename = join(srcDir,this.sample+TEMPLATESUFFIX)
      if (this.skeleton) {
        console.log('using skeleton',this.skeleton)
        // just copy all
        await copy(resolve(this.skeleton),resolve(this.workDir))
        execaCommandSync(`cd "${this.workDir}" && ${this.packagemanager} install`,{shell:true,stdio: 'inherit'})
      } else { // no skeleteon, just fill dirs with hardcoded stuff ...
        const skeleDir = join(getSkeletonDir(),this.sample)
        console.log('using hardcoded sample:',skeleDir)
        await copy(resolve(skeleDir),resolve(this.workDir))
        execaCommandSync(`cd "${this.workDir}" && ${this.packagemanager} install`,{shell:true,stdio: 'inherit'})
        //const

        /*
        let template = getDefaultTemplate([this.sample])
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

          if (!fsExistsundWritable(routefile)) {
            const dname = dirname(routefile)
            if (!fsExistsundWritable(dname)) mkdirSync(dname,{recursive:true})
            writeFileSync(routefile,`// ${routefile}\n`+TEMPLATES['dummyinterface'])
          }
        }
        // TODO handle @next
        execaCommandSync(`cd "${this.workDir}" && pwd && npm init -y && yarn add -D ${this.sample}@next`,{shell:true,stdio: 'inherit'})
        */
      }
    }
    // paths aliases
    // TODO check is symbolic link directory
    console.dir(resolve(join(this.workDir,SRCPATH)))
    const tmppathAliases = readdirSync(resolve(join(this.workDir,SRCPATH)),{withFileTypes:true})
    .filter(f=>f.isDirectory()||f.isSymbolicLink())
    .map(f=>f.name)
    .filter(x=>x!==ROUTESPATH)
    .map(x=>{const tmp= {}; tmp[`\$${x}/*`]=[`./${SRCPATH}/${x}/*`]; return tmp})
    this.pathAliases = {}
    for (const p of tmppathAliases ){
      this.pathAliases = {...this.pathAliases,...p}
    }
    // read package.json
    const packageFilename = resolve(join(this.workDir,'package.json'))
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
    const paramErrors = []
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
        // check for get head not primitive params
        // fetch :: TypeError: Request with GET/HEAD method cannot have body.
        // openapi :: Semantic error : GET operations cannot have a requestBody.
        // graphql ::The type of Query.foo(filter:) must be Input Type but got: IUserFilter."

        if (method.name === 'get' || method.name === 'head') {
          const hasObjects = method.parameters.filter(({isPrimitive}) => !isPrimitive)
          if (hasObjects.length) {
            paramErrors.push({route:route.orig,method:method.name,params:hasObjects.map(({name}) => name
            )})
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
    if (paramErrors.length) {
      console.error('*** PARAMS ERRORS ***')
      console.error(paramErrors)
      console.error('***  ***')
    }
    if (paramWarnings.length || schemaConflicts.length || routeConflicts.length || paramErrors.length) return false

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
    //console.log('using routes:')
    tmp = []
    const gqlQueries = []
    const gqlMutations = []
    this.cached.routes.forEach(({route, methods})=>{
      tmp.push({route:route.orig,operationName:route.operationName,b:route.bittes})
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
        /*
        "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/pet"
                }
              }
        */
        let type = method.type
        let isArray = false
        if (type.endsWith('[]')){
          isArray = true
          type = type.replace('[]','')
        }
        if (primitives.includes(type)){
          if (!isArray) openapi.paths[route.curlified][mn].responses['200'].content["text/plain"] = {schema:{type:type}}
          else openapi.paths[route.curlified][mn].responses['200'].content["text/plain"] = {schema:{type:'array',"items": {type} }}
        } else {
          if (!isArray) openapi.paths[route.curlified][mn].responses['200'].content["application/json"] = {schema:{"$ref":`#/components/schemas/${type}`}}
          else openapi.paths[route.curlified][mn].responses['200'].content["application/json"] = {schema:{type:'array',"items": {"$ref":`#/components/schemas/${type}`}}}
        }
        const tmpQ = {}
        tmpQ[method.type] = {...route,...method}
        let operation = `${method.name}${route.operationName}`
        //console.dir(route)
        if (method.parameters.length){
          const ops = []
          for (let {name,type,required} of method.parameters){
            if (type === 'number') type = 'Float'
            else if (type === 'string') type = 'String'
            ops.push(`${name}: ${type}${required ? '! ':''}`)
          }
          operation += `( ${ops.join(',')} )`
        }
        let response = isArray ? `[${type}]` : type
        /*
        POST is always for creating a resource ( does not matter if it was duplicated )
        PUT is for checking if resource exists then update, else create new resource.
        PATCH is always for updating a resource.
        */
        const opresp = `${operation}: ${response}`
        if (method.name === 'get') gqlQueries.push(opresp)
        else gqlMutations.push(opresp)
      }
    })
    //console.log(tmp.sort((a,b)=>a>b?1:-1))
    if (!fsExistsundWritable(join(this.outDir,SRCPATH,OPENAPIDIRNAME))) {
      // TODO https://swagger.io/docs/open-source-tools/swagger-ui/customization/plug-points/#request-snippets
      //mkdirSync(join(this.outDir,SRCPATH,OPENAPIDIRNAME))
      await copy(resolve(join(this.srcDir,OPENAPIDIRNAME)),resolve(join(this.outDir,SRCPATH,OPENAPIDIRNAME)))
    }
    let openApiFilename = join(this.outDir,SRCPATH,OPENAPIDIRNAME,OPENAPIFILENAME)
    writeFileSync(openApiFilename,JSON.stringify(openapi,null,4))
    openApiFilename = join(this.srcDir,OPENAPIFILENAME)
    writeFileSync(openApiFilename,JSON.stringify(openapi))

    // generate docs
    try {
      execaCommandSync(`cd "${this.docsDir}" &&  ${this.docsgenerator} ../${SRCPATH}/${OPENAPIFILENAME}`,{shell:true,stderr: 'inherit'})
    } catch (e) {
      return false
    }

    const renderData = routes2data(this.cached,this.port,this.srcDir)

    // make graphql schema
    const xQ = `type Query { \n\t${gqlQueries.join('\n\t')}\n}`
    let xM = `type Mutation { \n\t${gqlMutations.join('\n\t')}\n}`
    xM = '' // TODO  disable mutations for now
    let {data:gql} = toGraphql({ version:1, types })
    gql = `export const schema = \`${gql.split('\n').filter(x=>!x.startsWith('#')).join('\n')}\n${xQ}\n${xM}\``
    const gqlSchemaFilename = join(this.outDir,SRCPATH,GQLSCHEMAFILENAME)
    writeFileSync(gqlSchemaFilename,gql)
    // TODO verify schema with gql.buildSchema(..)
    // make graphql resolvers
    const gqlOpsFilename = join(this.outDir,SRCPATH,GQLSOPERATIONSFILENAME)
    const tmpimps = []
    const tmpOps = []
    for (const i of renderData.imports){
      i.exports.map(({alias})=>tmpOps.push(alias))
      const aliases = i.exports.map(({named,alias})=>`${named} as ${alias}`).join(', ')
      tmpimps.push(`import {${aliases}} from '${i.specifier}'`)
    }
    const opsFile = `${tmpimps.join('\n')}\n\nexport default {\n\t${tmpOps.join(',\n\t')}\n}`
    writeFileSync(gqlOpsFilename,opsFile)

    // make server
    // find server template
    //const  templateFilename = join(this.srcDir,this.sample+TEMPLATESUFFIX)
    const { serverFilename, templateFilename } = findTemplateFileUndMakeServerFilename(cli.srcDir,cli.outDir,TEMPLATESUFFIX)
    console.dir({ serverFilename, templateFilename })
    if (fsExistsundWritable(templateFilename)) {

      const serverSource = render(templateFilename, renderData)//routes2data(this.cached,this.port,this.srcDir))
      //const serverFilename = join(this.outDir,SRCPATH,this.sample+'-server.mjs')
      console.log('using',templateFilename,'for',serverFilename)
      writeFileSync(serverFilename,serverSource)/*
    } else {
      const [maybeTempalteFilename] = readdirSync(this.srcDir).filter(x=>x.endsWith(TEMPLATESUFFIX))
      if (maybeTempalteFilename) {
        const  templateFilename = join(this.srcDir,maybeTempalteFilename)
        if (fsExistsundWritable(templateFilename)){

          const serverSource = render(templateFilename, renderData)//routes2data(this.cached,this.port,this.srcDir))
          const serverFilename = join(this.outDir,SRCPATH,maybeTempalteFilename.replace(TEMPLATESUFFIX,'.mjs'))
          console.log('using',templateFilename,'for ',serverFilename)
          writeFileSync(serverFilename,serverSource)
        } else {
          console.error('cant use server template file' , templateFilename)
          return false
        }

      } else {
        console.error('cant find server template file in ' , this.srcDir)
        return false
      }
      */
    } else {
      console.error('cant find server template file in ' , this.srcDir, templateFilename)
      return false
    }
    return true
  }
}

function findTemplateFileUndMakeServerFilename(srcDir,outDir,suffix) {
  const [maybeTempalteFilename] = readdirSync(srcDir).filter(x=>x.endsWith(suffix))
  if (maybeTempalteFilename) {
    const  templateFilename = join(srcDir,maybeTempalteFilename)
    if (fsExistsundWritable(templateFilename)){
        const serverFilename = join(outDir,SRCPATH,maybeTempalteFilename.replace(suffix,'.mjs'))
        return { serverFilename, templateFilename }
    }
  }
  throw new Error('cant find template in '+srcDir+' with' + suffix)

}

const cli = new YAFBRG_Cli()
await cli.firstrun()
// TODO check for template name
const { serverFilename } = findTemplateFileUndMakeServerFilename(cli.srcDir,cli.outDir,TEMPLATESUFFIX)
//const serverFilename = join('./',cli.outDir,SRCPATH,cli.sample+'-server.mjs')
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

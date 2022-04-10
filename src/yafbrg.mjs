import { compileundparse, primitives, toOpenApi } from './utils/parseMTS.mjs'

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, basename, dirname } from 'node:path'

// for debug only

/**
 * PHP-like print_r() equivalent for JavaScript Object
 *
 * @author Faisalman <fyzlman@gmail.com>
 * @license http://www.opensource.org/licenses/mit-license.php
 * @link http://gist.github.com/879208
 */
const print_r = (obj, t) => {

    // define tab spacing
    const tab = t || '';

    // check if it's array
    const isArr = Object.prototype.toString.call(obj) === '[object Array]';

    // use {} for object, [] for array
    let str = isArr ? (`Array\n${tab}[\n`) : (`Object\n${tab}{\n`);

    // walk through it's properties
    for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            const val1 = obj[prop];
            let val2 = '';
            const type = Object.prototype.toString.call(val1);
            switch (type) {

                // recursive if object/array
                case '[object Array]':
                case '[object Object]':
                    val2 = print_r(val1, (`${tab}\t`));
                    break;

                case '[object String]':
                    val2 = `'${val1}'`;
                    break;

                default:
                    val2 = val1;
            }
            str += `${tab}\t${prop} => ${val2},\n`;
        }
    }

    // remove extra comma for last property
    str = `${str.substring(0, str.length - 2)}\n${tab}`;

    return isArr ? (`${str}]`) : (`${str}}`);
};

// use [ and ] or : to denote parameters...
// and __foo as preprocess
// and bar__ asj postprocess

function getRoute(str){
  const denotes = ['*',':','[','__']
  let min = Infinity
  for (const d of denotes){
    const hit = str.indexOf(d)
    if (hit > -1 ) min = min < hit ? min : hit
  }
  let result = str.slice(0,min)
  if (result.endsWith('/')) result = result.slice(0,-1)
  if (!result.startsWith('/')) result = '/'+result
  return result
}

function parse(orig, loose) {
    //if (str instanceof RegExp) return { keys:false, pattern:str };
    let c;
    let o;
    let tmp;
    let ext;
    const keys=[];
    let pattern='';
    const arr = orig.split('/');
    arr[0] || arr.shift();

    while (tmp = arr.shift()) {
  		c = tmp[0];
  		if (c === '*') {
  			keys.push('wild');
  			pattern += '/(.*)';
  		} else if (c === ':' || c === '[') {
  			o = tmp.indexOf('?', 1);
  			ext = tmp.indexOf('.', 1);
  			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length).replace(']','') );
  			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
  			if (!!~ext) pattern += `${!!~o ? '?' : ''}\\${tmp.substring(ext)}`;
  		} else {
  			pattern += `/${tmp}`;
  		}
  	}
    const route = getRoute(orig)
    return {
      orig,
      route,
  		keys,
  		pattern: new RegExp(`^${pattern}${loose ? '(?=$|\/)' : '\/?$'}`, 'i')
  	};
}



async function findAllMTS(dirName){
  let result = []
  const maybeRoutes = readdirSync(dirName,{withFileTypes:true})
  for (const maybeRoute of maybeRoutes.filter(f=>f.isFile()&&f.name.endsWith('.mts')&&!f.name.endsWith('.d.mts'))) {
    result.push(join(dirName,maybeRoute.name))
  }
  for (const maybeRoute of maybeRoutes.filter(f=>f.isDirectory())) {
    const tmp = await findAllMTS(join(dirName,maybeRoute.name))
    result = [...result,...tmp]
  }
  return result
}

/*
const routes = process.argv.slice(2)[0] || './routes'
const out = './.buildkala'
const root = dirname(routes)+'/' || './'

const x = await parseAllMTS(routes,out,root)
console.dir({x})
*/
export async function parseAllMTS(routesDir,outDir,rootDir){
  console.dir({parseAllMTS:{routesDir,outDir,rootDir}})
const prepRoutes = await findAllMTS(routesDir)
//console.dir(prepRoutes)
const parsed = []
for (const mts of prepRoutes) {
  const cleaned = mts.replace(routesDir,'').replace('index.mts','').replace('.mts','')
  const tmp = parse(cleaned)
  tmp.mts = mts
  parsed.push(tmp)
}
// check for duplicates
for (const route of parsed) {
  const tmp = route.pattern.toString()
  const x = parsed.filter(({pattern}) => pattern.toString()=== tmp)
  if (x.length > 1) {
    console.error('duplicate',route.orig)
    console.error(x)
    process.exit(-1)
  }
}
for (const route of parsed) {
  //const dn = dirname(route.mts)

  const pathsT = {
    '$providers/*': ['./src/providers'+ '/*'],
    '$interfaces/*': ['./src/interfaces'+ '/*'],
  }

  const compiled = await compileundparse(route.mts,outDir,rootDir,pathsT)
  for (const key of Object.keys(compiled)) route[key] = compiled[key]
  if (route.compiledFilename) {
    try {
      const tmp = await import(resolve(route.compiledFilename))
      route.functions = {}
      for (const key of Object.keys(tmp)) {
        route.functions[key] = tmp[key].toString()
      }
    } catch (error){
      console.error(error)
    }
  }
}

const tmp = {} // uniq interfaces
for (const route of parsed) {
  const interfaces = {...route.interfaces }
  delete route.interfaces
  for (const i of Object.keys(interfaces)) {
    const {name, orig } = interfaces[i]
    const hash = name+orig
    if (!tmp[hash]){
      tmp[hash] = interfaces[i]
    }
  }
}
const types = []
for (const i of Object.keys(tmp)) {
  types.push(tmp[i])
}
const schemas = {version: 1, types }

  return {schemas, parsed}
}
//console.log(print_r(toOpenApi(schemas).data))
//console.log(print_r(parsed.map(({methods})=>methods)))
//console.log(print_r({paths:parsed,schemas}))

//console.log(JSON.stringify(toOpenApi(schemas).data,null,4))

function toPolka(){

let polkaStr = `
// generated ${JSON.stringify(new Date())}
// ${resolve(join('./',outDir))}
import { STATUS_CODES as HTTP_STATUS_CODES } from 'node:http'
import { default as polka } from 'polka'
/*IMPORTS*/

function maybeExit(error){
  if (error instanceof RangeError) {
    console.error(error)
    process.exit(1)
  }
  if (error instanceof SyntaxError) {
    console.error(error)
    process.exit(2)
  }
  if (error instanceof ReferenceError) {
    console.error(error)
    process.exit(3)
  }
  if (error instanceof TypeError) {
    console.error(error)
    process.exit(4)
  }
  if (error instanceof AggregateError) {
    console.error(error)
    process.exit(5)
  }
  if (error instanceof EvalError) {
    console.error(error)
    process.exit(6)
  }
}


polka({onError:(err, req, res)=>{
  console.error('custom onError')
  console.error(err)
  let code = typeof err.status === 'number' && err.status;
  code = res.statusCode = (code && code >= 100 ? code : 422);
  if (typeof err === 'string' || Buffer.isBuffer(err)) res.end(err);
  else res.end(err.message || HTTP_STATUS_CODES[code]);
  maybeExit(err)
}})
/*ROUTES*/
    .listen(3000, (l) => {
      console.log("> Running on localhost:3000");
    })

`



let curlStr = ""
let routesStr = ""
let importsStr = ""
for (const route of parsed){

  const polkafied = route.orig.replaceAll("]",'').replaceAll("[",":")
  let bittes = []
  for (let bitte of polkafied.replaceAll(":","").split('/')) if (bitte?.[0]) bittes.push(bitte?.[0]?.toUpperCase() + bitte?.substring(1))
  const importsAs = []
  for (const method of route.methods) {
    curlStr += `curl -s -v -X${method.name.toUpperCase()} localhost:3000${route.route}/`
    const importAs = `${method.name}${bittes.join('')}`
    importsAs.push(`${method.name} as ${importAs} `)
    // put arg in func param order
    const _args = method.parameters.map(({name})=>name)
    const args = []
    for (const arg of _args) {
      if (route.keys.includes(arg)) args.push(`req?.params?.${arg}`)
      else args.push(`req?.query?.${arg}`)
    }
    let isAwait = method.isAsync ? 'await' : ''
    let isAsync = method.isAsync ? 'async' : ''
    let contentType = "res.setHeader('conten-type','application/json; charset=UTF-8')"
    let send = ` ${contentType}
      res.end(JSON.stringify(${isAwait} ${importAs}(${args})))`
    if (primitives.includes(method.type)) {
      contentType = "res.setHeader('conten-type','text/plain; charset=UTF-8')"
      send = ` ${contentType}
      res.end(''+${isAwait} ${importAs}(${args}))`

    }
    // https://nodejs.org/en/docs/guides/nodejs-docker-webapp/
    // RUN npm ci --only=production
    const logifnotproduction = process.env.NODE_ENV === 'production' ?
    ``
    :
    `console.log('${method.name}','${polkafied}',req.params,req.query)
    `
    routesStr += `
    .${method.name}('${polkafied}', ${isAsync} (req, res, next) => {
      ${logifnotproduction} ${send}
    })`
  }
  console.dir(route)
  importsStr += `import { ${importsAs.join(', ')}} from '${route.compiledFilename.replace(outDir,'.')}'\n`
}

polkaStr = polkaStr.replace('/*IMPORTS*/',importsStr)
polkaStr = polkaStr.replace('/*ROUTES*/',routesStr)
}

/*

//console.log(polkaStr)
try {
  writeFileSync(join(outDir,'polka.mjs'),polkaStr)
  console.log('done', join(outDir,'polka.mjs'))
} catch (error) {
  console.error(error)
}

try {
  writeFileSync(join(outDir,'curl-all.bash'),curlStr)
  console.log('done', join(outDir,'curl-all.bash'))
} catch (error) {
  console.error(error)
}

*/



//console.log(print_r(parsed))
//console.dir(parsed)
/*
for (const route of parsed) {
  console.log('----------')
  for (const key of Object.keys(route)){
      console.log(key, '::')
      if (!Array.isArray(route[key]))console.dir(route[key])
      else for (const i of route[key]) {
        console.dir(i)
      }
  }
}
/*
/*
----------
orig :: '/[kala]/maja/:kana'
route :: '/'
keys :: 'kala','kana'
pattern :: /^\/([^/]+?)\/maja\/([^/]+?)\/?$/i
mts :: 'src/routes/[kala]/maja/:kana.mts'
compiledFilename :: '.build/routes/[kala]/maja/:kana.mjs'
imports ::
{
  '../../../services/n2w.mjs': [ 'convertNumberToWordsEN' ],
  '../../../services/index.mjs': [
    'convertSquareConfig',
    'LabeledSquareConfig',
    'SquareConfig',
    'LabeledValue'
  ]
}
schemas ::
{
  LabeledValue: {
    properties: { label: [Object] },
    required: [ 'label' ],
    additionalProperties: false,
    title: 'LabeledValue',
    type: 'object'
  },
  SquareConfig: {
    properties: { color: [Object], width: [Object] },
    additionalProperties: false,
    title: 'SquareConfig',
    type: 'object'
  },
  LabeledSquareConfig: {
    properties: { color: [Object], width: [Object], label: [Object] },
    required: [ 'label' ],
    additionalProperties: false,
    title: 'LabeledSquareConfig',
    type: 'object'
  }
}
methods ::
{
  name: 'get',
  type: 'string',
  parameters: [ { name: 'n', type: 'number', required: true } ],
  jsDoc: undefined
}
{
  name: 'post',
  type: 'LabeledSquareConfig',
  parameters: [
    { name: 'sq', type: 'SquareConfig', required: true },
    { name: 'l', type: 'LabeledValue', required: true }
  ],
  jsDoc: [ 'kala asadc' ]
}

functions ::
{
  get: 'function get(n) {\n    return convertNumberToWordsEN(n);\n}',
  post: 'async function post(sq, l) {\n    return convertSquareConfig(sq, l);\n}'
}

*/

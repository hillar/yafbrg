import { compileundparse } from './utils/parseMTS.mjs'

import { readdirSync, readFileSync } from 'node:fs'
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

const routesDir = process.argv.slice(2)[0] || './routes'
const outDir = '.build'

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
  const dn = dirname(route.mts)
  const compiled = await compileundparse(route.mts,join(outDir))
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

console.log(print_r(parsed))
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

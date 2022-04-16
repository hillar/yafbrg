import { default as mustache } from 'mustache'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { primitives } from './parseMTS.mjs'


const serverTempaltes = {
  polka:`
import { default as polka } from 'polka'
{{#imports}}
import { {{#exports}} {{named}} as {{alias}} {{/exports}} } from '{{specifier}}'
{{/imports}}

polka()
    .use((req,res,next)=>{
        const body = []
        req.on('data', chunk => body.push(chunk))
        req.on('end', () => {
          try {
            req.body = JSON.parse(Buffer.concat(body).toString())
          } catch (error) {
            error.statusCode = 415
            throw error
          } finally {
            next()
          }
        })
    })
    {{#methods}}
    .{{method}}('{{route}}',  (req, res, next) => {
      const { params, query, body } = req
      res.setHeader('conten-type','{{contentype}}; charset=UTF-8')
      res.end(JSON.stringify( {{alias}}({{#params}}{{.}},{{/params}})))
    })
    {{/methods}}
.listen({{port}}, () => {
  console.log("> Polka server running on localhost:",{{port}});
})
  `,
  express:`
  `,
  fastify:`
  `,
}

export function getDefaultTemplate(framework){
  return serverTempaltes[framework]
}

function getReverse(mustacheTokens){
  const namesundsections = mustacheTokens.filter(x=>x[0]!=='text')
  const tmp = {}
  for (const candidate of namesundsections){
    const [type,value] = candidate
    if (value==='params') console.dir(candidate)
    if (type==='name') {
      tmp[value] = ''
    } else {
      if (candidate?.[4]?.[0]?.[1] === '.') tmp[value] = ['']
      else tmp[value] = [getReverse(candidate.filter(x=>Array.isArray(x)).flat())]
    }
  }
  return tmp
}

export function reverse(templateFilename){
  const template = readFileSync(templateFilename,'utf-8')
  const mustacheTokens = mustache.parse(template)
  return getReverse(mustacheTokens)
}

export function render(templateFilename,data){
  const template = readFileSync(templateFilename,'utf-8')
  mustache.escape = text => text
  const rendered = mustache.render(template,data)
  return rendered
}


export function routes2data(routes,port,outDir) {
  const data = { port, imports:[], methods:[] }
  routes.forEach(({route, methods })=> {
    let bittes = []
    for (let bitte of route.polkafied.replaceAll(":","").split('/')) if (bitte?.[0]) bittes.push(bitte?.[0]?.toUpperCase() + bitte?.substring(1))
    const importsAs = []
    for (const method of methods) {
      const importAs = `${method.name}${bittes.join('')}`
      importsAs.push({named:method.name, alias: importAs})
      const args = []
      for (const {name,type,required} of method.parameters) {
        if (!primitives.includes(type)) args.push(`body?.${name}`)
        else if (route.keys.includes(name)) args.push(`params?.${name}`)
        else args.push(`query?.${name}`)
      }

      let async = method.isAsync ? 'async' : ''
      let contentType = "application/json"
      if (primitives.includes(method.type)) {
        contentType = "text/plain"
      }
      // delete is reserved word, so **del** must be used as method name in modules
      // replace it here
      let methodName = method.name
      if (method.name === 'del') methodName = 'delete'
      // https://nodejs.org/en/docs/guides/nodejs-docker-webapp/
      // RUN npm ci --only=production
      /*
      const logifnotproduction = process.env.NODE_ENV === 'production' ?
      ``
      :
      `console.log('${methodName}','${polkafied}',req?.params,req?.query,JSON.stringify(req?.body,null,4))
      `
      */
      data.methods.push({method:methodName, route:route.polkafied, params:args, async, alias: importAs, contenttype: contentType})
    }
    const r = route.compiledFilename.replace(outDir,'.').replace('.mts','.mjs')
    //console.dir({r,rr:route.compiledFilename})
    data.imports.push({specifier:route.compiledFilename.replace(outDir.replace('./',''),'.').replace('.mts','.mjs'), exports: importsAs})
  })

  //console.log(JSON.stringify(data,null,4))
  return data
}

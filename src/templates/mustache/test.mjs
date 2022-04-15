import { default as mustache } from 'mustache'
import { readFileSync } from 'node:fs'





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

function reverse(templateFilename){
  const template = readFileSync(templateFilename,'utf-8')
  const mustacheTokens = mustache.parse(template)
  console.dir(mustacheTokens)
  return getReverse(mustacheTokens)
}

const x = reverse('polka.mustache')
console.log(JSON.stringify(x,null,4))


const data = {
    "imports": [
        {
            "name": "a",
            "alias": "",
            "path": ""
        },
        {
            "name": "b",
            "alias": "",
            "path": ""
        }
    ],
    "methods": [
        {
            "method": "aa",
            "route": "a/b",
            "contentype": "text/plain",
            "alias": "",
            "params": [
                ""
            ]
        }
    ],
    "port": ""
}

function render(templateFilename,data){
  const template = readFileSync(templateFilename,'utf-8')
  mustache.escape = function(text) {return text;};
  const rendered = mustache.render(template,data)
  return rendered
}

const r = render('polka.mustache',data)
console.log(r)

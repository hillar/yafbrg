import { createServer } from 'node:http'

/* IMPORTS */


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

function getRoute(str){
  const denotes = ['*',':','[','__']
  let min = Infinity
  for (const d of denotes){
    const hit = str.indexOf(d)
    if (hit > -1 ) min = min < hit ? min : hit
  }
  let result = str.slice(0,min)
  if (result.endsWith('/')) result = result.slice(0,-1)
  return result
}

function parse(str, loose) {
    //if (str instanceof RegExp) return { keys:false, pattern:str };
    let c;
    let o;
    let tmp;
    let ext;
    const keys=[];
    let pattern='';
    const arr = str.split('/');
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
    const route = getRoute(str)
    return {
      str,
      route,
  		keys,
  		pattern: new RegExp(`^${pattern}${loose ? '(?=$|\/)' : '\/?$'}`, 'i')
  	};
}


// IncomingMessage ServerResponse
const server = createServer( async (request, response) => {

  // TODO log all non 2xx
  response.on('prefinish', (r) => {
    if (response.statusCode > 299) {
      console.log(response.statusCode,r)
    }
  })

// -----------------

/* ROUTES */

// -----------------
/*
const routes = [
  {
    str: 'routes/kalamaja/:kala',
    route: 'routes/kalamaja',
    keys: [ 'kala' ],
    pattern: /^\/routes\/kalamaja\/([^/]+?)\/?$/i,
    methods: {
      'GET': {
            fn: function getRoutesKalamaja(a,kala,n){
              console.log('getRoutesKalamaja',a,n)
              return {a,n,kala}
            },
            params:[
                  {
                      "name": "a",
                      "type": "string",
                      "required": true
                  },
                  {
                      "name": "kala",
                      "type": "string",
                      "required": true
                  },
                  {
                      "name": "n",
                      "type": "SquareConfig",
                      "required": false
                  }
              ]}}
  }
]
*/

// -----------------

  const { pathname, searchParams, hostname, port } = new URL(request.url,`http://${request.headers.host}`)
  const maybeMatch = routes
    .filter( r => Object.keys(r.methods).includes(request.method))
    .filter( m => (pathname+'/').startsWith('/'+m.route+'/'))

  if (!maybeMatch.length) {
    response.statusCode = 404
    response.end(JSON.stringify({method:request.method, url:request.url}));
  } else {
    for (const maybe of maybeMatch) {
      let match = maybe.pattern.exec(pathname)
      if (match) {
        console.dir({match,maybe})
        const tmp = {}
        for (const [key,value] of  searchParams) {
          tmp[key]=value
        }
        // in path overrides in query
        for (const i in maybe.keys){
          tmp[maybe.keys[i]] = match[Number(i)+1]
        }
        // put arg in func param order
        const args = []
        for (const {name,type,required} of maybe.methods[request.method].params){
          //TODO type verify
          if (required && !tmp[name]) {
            response.statusCode = 422
            response.end(JSON.stringify({error:`"${name}" is required`}));
            break
          }
          args.push(tmp[name])
        }
        if (response.writableEnded) break
        const handler = maybe.methods[request.method].fn
        try {
          const result = handler(...args)
          if (typeof result === 'object') {
            response.setHeader('conten-type','application/json; charset=UTF-8')
            response.end(JSON.stringify(result))
          } else {
            response.setHeader('conten-type','text/plain; charset=UTF-8')
            response.end(''+result)
          }
          console.dir({args,result})
        } catch (error) {
          if (!response.writableEnded) {
            response.statusCode = error.statusCode || 500
            response.end()
          }
          maybeExit(error)
        }
        if (!response.writableEnded) {
          console.error('it should not be happened, response was not ended by match',maybe,response)
          response.end();
        }
        break
      }
    }
  }
  // no match in routes
  // TODO or 404
  if (!response.writableEnded) {
    response.statusCode = 501
    response.end(JSON.stringify({method:request.method, url:request.url}));
  }
});

server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

const PORT = process.env.port || 6789
server.listen(PORT,() => {
  console.dir(server);
});

# yafbrg

> мысли короткие как у буратино

*yet another filesystem based route  generation*

This is highly opinionated, experimental, incomplete, and undocumented.

see https://i.gifer.com/8YOU.mp4

For now, a traditional development setup will be more productive.

## TLDR;

yafbrg is a tsc compiler with custom config that works behind the scenes to turn your [typescript module files](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#new-file-extensions) into (polka || koa || fastify || express || ..) api|graphql server with swagger|graphqli endpoints and some docs.

**API routes** *are generated* from filesystem **directory structure**.<br>
**Call parameters** *are generated* from handler module **functions arguments** combined with denoted parts of filenames.<br>
**Server response** is type of handler  **function return value**.   



* source **src/routes/users/[id]/index.mts**

```typescript
import { IUser } from '$interfaces/user.mjs'
import { getUser } from '$providers/user.mjs'

/**
* returns user by id
*/
export async function get(id:number):IUser {
  return getUser(id)
}

```

* generated **src/polka-server.mjs**

```javascript
import { polka } from 'polka'
import { get as getUserId } from './routes/users/[id]/index.mjs'

polka()
.get('/users/:id', (req, res) => {

  res.end( getUserId(req.params.id) );

})


```

<details>

<summary>generated src/openapi.json </summary>

```json
{
  "openapi": "3.0.0",
  "info": {
    "version": "0.0.0",
    "title": "polka",
    "description": "simple polka sample",
    "contact": {
      "name": "email or phone or .."
    }
  },
  "paths": {
    "/users/": {
      "post": {
        "parameters": [],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/IResult"
                }
              }
            }
          }
        },
        "summary": "",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "user": {
                    "$ref": "#/components/schemas/IUser",
                    "required": true
                  },
                  "manager": {
                    "$ref": "#/components/schemas/IUser",
                    "required": false
                  }
                }
              }
            }
          }
        }
      }
    },
    "/users/{id}/": {
      "get": {
        "parameters": [
          {
            "name": "id",
            "required": true,
            "schema": {
              "type": "number"
            },
            "in": "path"
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/IUser"
                }
              }
            }
          }
        },
        "summary": "\nreturns user by id"
      }
    }
  },
  "components": {
    "schemas": {
      "IResult": {
        "properties": {
          "ok": {
            "title": "IResult.ok",
            "type": "boolean"
          }
        },
        "required": [
          "ok"
        ],
        "additionalProperties": false,
        "title": "IResult",
        "type": "object"
      },
      "IUser": {
        "properties": {
          "id": {
            "title": "IUser.id",
            "type": "number"
          },
          "firstname": {
            "title": "IUser.firstname",
            "type": "string"
          },
          "lastname": {
            "title": "IUser.lastname",
            "type": "string"
          },
          "ou": {
            "$ref": "#/components/schemas/IOrgUnit",
            "title": "IUser.ou"
          }
        },
        "required": [
          "id",
          "firstname",
          "lastname"
        ],
        "additionalProperties": false,
        "title": "IUser",
        "type": "object"
      },
      "IOrgUnit": {
        "properties": {
          "name": {
            "title": "IOrgUnit.name",
            "type": "string"
          }
        },
        "required": [
          "name"
        ],
        "additionalProperties": false,
        "title": "IOrgUnit",
        "type": "object"
      }
    }
  }
}

```
</details>

## No relative path hell

any other directory in same directory of `routes` is aliased with `$name`.

It allows you to access common  and or utility modules without ../../../../../../ pain. So after moving handler module files around in routes directory there is no need to fix import paths.

```
// no need for ../../../../providers/auth.mjs
import { checkUser }  from '$providers/auth.mjs'
import { IUser }  from '$interfaces/user.mjs'
import { isIP } from '$utils/ip.mjs'

```

it is done with [tsc module resolution  path mapping](https://www.typescriptlang.org/tsconfig#paths) and [trasnform plugin](https://github.com/LeDDGroup/typescript-transform-paths)




## Endpoints

Endpoints are typescript modules written in .mts files that export request handler functions corresponding to HTTP methods.

Endpoints can handle any HTTP method by exporting the corresponding function:
```
export function post(foo:string,bar:number):string {...}
...
export function del(id:number):boolean {...} // `delete` is a reserved word
```
### Rest parameters
A route can have multiple dynamic parameters, denoted with **[]** or **{}** or **:**,
for example
- src/routes/ **[** category **]** / **[** item **]** .mts
- src/routes/ **{** category **}** / **{** item **}** .mts
- src/routes/ **:** category/ **:** item.mts

those (category,item) will be passed to handler method as *req.param.x*
and in openapi docs as *in:path*

```
export function get(category:string,item:number):string {...}

```
everything after **?** in url, will be passed as *req.query.y* and in openapi docs as *in:query*

`curl http://localhost/swag/1?color=green`

```
export function get(category:string,item:number,color:string):string {...}

```

if handler function parameter is not primitive type (number,string,..) but **interface**, then it will be passed as *req.body.x* and in openapi docs as *requestBodyproperties*

```
interface IUser {
  name: string
  age: number
}

export function post(user:IUser,manager:IUser):boolean {...}

```

```
import { post as postUsers } from './routes/users/index.mjs'
polka()
.post('/users/',  (req, res, next) => {
  res.end( postUsers(req?.body?.user,req?.body?.manager) )
})
```

server code generator to decide which is what
```
for (const { name, type, required } of method.parameters) {
  if (!primitives.includes(type)) args.push(`body?.${name}`) // interface
  else if (route.keys.includes(name)) args.push(`params?.${name}`) // denoted in file path
  else args.push(`query?.${name}`)
}
```

## OpenAPI

[core-types-ts](https://github.com/grantila/core-types-ts) is used to convert typescript to openapi schemas. Sadly have not (yet) found tool to convert *paths*, so had to write one ;/

To make documentation out of openapi definition file, any tool can be used (openapi-to-md, widdershins, ..)
For now default in configuration is [openapi-generator](https://github.com/OpenAPITools/openapi-generator)<br>
[Swagger-ui-dist](https://github.com/swagger-api/swagger-ui) is also dropped into server routes as `/openapi/`

<details>

<summary>if you do not have `/usr/local/bin/openapi-generator` then see </summary>

[openapi-generator-cli](https://github.com/OpenAPITools/openapi-generator-cli)

```
npm install @openapitools/openapi-generator-cli

npx yafbrg .... --docsgenerator="$(pwd)/node_modules/.bin/openapi-generator-cli generate -g markdown -i"
```
</details>

## GraphQL
[core-types-graphql](https://github.com/grantila/core-types-graphql) is used to convert typescript to graphql schema Types. Sadly have not (yet) found tool to convert *[Inputs](https://graphql.org/learn/schema/#input-types) , [Queries and Mutations](https://graphql.org/learn/queries/)*, so had to write one ;/<br>
[GraphiQL](https://github.com/graphql/express-graphql) is also dropped into server routes simply as `.use('/graphql', graphqlHTTP({ schema: serverSchema, rootValue, graphiql: true}))`

## Server code generation

**API routes** *are generated* from filesystem **directory structure**.<br>
**Call parameters** *are generated* from handler module **function arguments** combined with denoted parts of full filenames.<br>
**Server response** is type of handler  **function return value**.   

Planned: filenames strarting with **__** are **preHandlers**  and filenames ending with **__** are **postHandlers**

Server code is generated simply replacing parts of template with good old **mustache**.  Theoretically any framework based on **node:http** like *polka, koa, fastify, exspress* can be used. Expected is that denoting of route parameters in the path with **:** is supported, and http methods are handled with handler functions.


mustache tempalte

```
import { default as polka } from 'polka'
{{#imports}}
import { {{#exports}} {{named}} as {{alias}} {{/exports}} } from '{{specifier}}'
{{/imports}}

polka()
    {{#methods}}
    .{{method}}('{{route}}',  (req, res, next) => {
      const { params, query, body } = req
      res.setHeader('conten-type','{{contenttype}}; charset=UTF-8')
      res.end(JSON.stringify( {{alias}}({{#params}}{{.}},{{/params}})))
    })
    {{/methods}}
.listen({{port}}, () => {
  console.log("> Polka server running on localhost:",{{port}});
})

```
data for render function

```
{
    "port": 6789,
    "imports": [
        {
            "specifier": "./routes/users/[id]/index.mjs",
            "exports": [
                {
                    "named": "get",
                    "alias": "getUsersId"
                }
            ]
        }
    ],
    "methods": [
        {
            "method": "get",
            "route": "/users/:id/",
            "params": [
                "params?.id"
            ],
            "async": "",
            "alias": "getUsersId",
            "contenttype": "application/json"
        }
    ]
}
```

render result

```
import { default as polka } from 'polka'
import {  get as getUsersId  } from './routes/users/[id]/index.mjs'

polka()
    .get('/users/:id/',  (req, res, next) => {
      const { params, query, body } = req
      res.setHeader('conten-type','application/json; charset=UTF-8')
      res.end(JSON.stringify( getUsersId(params?.id,)))
    })
.listen(6789, () => {
  console.log("> Polka server running on localhost:",6789);
})

```




## .yafbrg_clirc

options are valued in following order:

1. .yafbrg_clirc
1. env
1. command line
1. default

## pre-defined code templates aka Skeletons

**Skeletons** are baseline applications which meet some non-functionals (boilerplate code),
things which no one really wants to reinvent. Skeleton is used only once in first run, if workdir is empty.

## ENV VARS

simply use them

```
const database = process.env.MYSQL_DB_NAME || 'name'
```

```
export const config = {
  type: 'mysql',
  host: process.env.MYSQL_DB_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_DB_PORT||'3306'),
  ...
} as Partial<MikroORMOptions>;

```
yafbrg will grep them out and one can do in server mustache template whatever one want
for example turn them into **cmd options**
see https://github.com/hillar/yafbrg/blob/main/samples/skeletetons/polka/src/polka-server.mustache

```
const ENVS = []
const defaults = {}
{{#envs}}
// {{from}}
{{#vars}}
//{{funcName}} {{varName}}
ENVS.push('{{envName}}')
defaults.{{envName}} = {{defaultValue}}
{{/vars}}
{{/envs}}
```

help shows all *cmd opts* with defaults and *env vars* with current values

```
% node polka.mjs -h

options (:default):
	--mysql_db_host :localhost
	--mysql_db_port :3306
	--mysql_db_username :root
	--mysql_db_password
	--mysql_db_database :name
	--kalamaja :4321

enviroment vars (:value):
	MYSQL_DB_HOST
	MYSQL_DB_PORT
	MYSQL_DB_USERNAME
	MYSQL_DB_PASSWORD
	MYSQL_DB_DATABASE
	KALAMAJA  :linnupesa33

```

admin can simply override

```
node polka.mjs --mysql_db_database=namefromcmd --kalamaja=yetanothercmdopt
{ settable: 'MYSQL_DB_DATABASE', default: 'name' }
setting MYSQL_DB_DATABASE to namefromcmd
{ settable: 'KALAMAJA', default: 4321 }
KALAMAJA env was linnupesa33
setting KALAMAJA to yetanothercmdopt
> Polka server running on localhost: 6789
```



## monorepos

just use symlinks ;)

```
common -> ../../common
interfaces
providers
routes
```

```
import { auth } from '$common/auth/freeipa.mjs'
```

---------------------

works for me™

waitlist:

- [x] [ `.mts` ](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#new-file-extensions)
- [ ] tsc relative path imports


-------

why? to lazy to fight over SSOT

how?

```
docker run -p6789:6789 -v $(pwd):/opt/ -ti node:alpine sh
apk add openjdk11
cd /opt  
npx yafbrg yourprojectname

```

-------

--------




* [method](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) aka  [operation](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#operationObject)
* [path](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#pathsObject)
* Input Models :: [Parameters](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#parameterObject) & [Request Body](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#requestBodyObject)
* Output Models :: [Response](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#responseObject)s



-------

https://github.com/pacedotdev/oto

`npm install -D yafbrg`

-------
```
yarn add -D typescript@next
yarn add -D core-types-graphql
yarn add -D core-types-json-schema
yarn add -D core-types-ts
yarn add -D @types/node



```

? [...file]
* https://kit.svelte.dev/docs/routing#advanced-routing-rest-parameters

? [page=integer]
* https://kit.svelte.dev/docs/routing#advanced-routing-matching

#### fastify

https://github.com/spa5k/fastify-file-routes
https://github.com/GiovanniCardamone/fastify-autoroutes
https://github.com/israeleriston/fastify-register-routes

https://github.com/fastify/fastify-swagger

The authentication scheme connects to the REST API via an RFC 2616 HTTP header or RFC 3986 GET query argument. API Key authentication is usable simply by adding an http header with a key of **'apikey'** or **'x-apikey'** and a value of your apikey.

`...?apikey=5862e5ab11dbab78f1b8c0cf`

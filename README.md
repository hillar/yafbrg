# yafbrg

> мысли короткие как у буратино

*yet another filesystem based route  generation*

***highly opinionated***

*(with API description generated from source files)*


This is highly experimental, highly incomplete, and completely undocumented.

For now, a traditional development setup will be more productive.

## TLDR;

 yafbrg is a tsc compiler with custom config that works behind the scenes to turn your typescript module files into (polka || koa || fastify || express || ..) api server and openapi docs.

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
For now default in configuration is *openapi-generator*.

## Server code generation

**API routes** *are generated* from filesystem **directory structure**.<br>
**Call parameters** *are generated* from handler module **function arguments** combined with denoted parts of full filenames.<br>
**Server response** is type of handler  **function return value**.   

Planned: filenames strarting with **__** are **preHandlers**  and filenames ending with **__** are **postHandlers**

Server code is generated simply replacing parts of template with good old **mustache**.  Theoretically any framework based on **node:http** like *polka, koa, fastify, exspress* can be used. Expected is that denoting of route parameters in the path with **:** is supported, and http methods are handled with handler functions.

```
import { default as polka } from 'polka'
{{#imports}}
import { {{#exports}} {{named}} as {{alias}} {{/exports}} } from '{{specifier}}'
{{/imports}}

polka()
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

-------

why? to lazy to fight over SSOT

-------

--------




* [method](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) aka  [operation](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#operationObject)
* [path](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#pathsObject)
* Input Models :: [Parameters](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#parameterObject) & [Request Body](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#requestBodyObject)
* Output Models :: [Response](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#responseObject)s



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

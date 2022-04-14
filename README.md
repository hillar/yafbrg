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
Their job is to make it possible to read and write data that is only available on the server (for example in a database, or on the filesystem).

Endpoints can handle any HTTP method — not just GET — by exporting the corresponding function:
```
export function post(foo:string,bar:number):string {...}
...
export function del(id:number):boolean {...} // `delete` is a reserved word
```
### Rest parameters
A route can have multiple dynamic parameters, denoted with **[],{},:**,
for example
- src/routes/ **[** category **]** / **[** item **]** .mts
- src/routes/ **{** category **}** / **{** item **}** .mts
- src/routes/ **:** category/ **:** item.mts

those (category,item) will be passed to handler method as *req.param.x*
and in openapi docs as *in:path*

```
export function get(category:string,item:number):string {...}

```
everything after **?** will be passed as *req.query.y* and in openapi docs as *in:query*

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



---------------------

-------

-------

--------



## SSOT
### Paths and (Parameters och Request Body) and Responses

* [method](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) aka  [operation](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#operationObject)
* [path](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#pathsObject)
* Input Models :: [Parameters](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#parameterObject) & [Request Body](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#requestBodyObject)
* Output Models :: [Response](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#responseObject)s


For example, function `function get(id:number):string` in */users/[id].mts* is  described as:

* method: `GET`
* path: `/users`
* input (in path): `{ name:id, type:number }`
* output: `{ type:string }`

and from TypeScript source is compiled to

```javascript
import { get as getUserId } from './users/[id].mjs'

polka() // You can also use Express

  .get('/users/:id', (req, res) => {
    res.end( getUserId(req.params.id) );
  })

```




## list of methods och operations

> GET
>> requests a representation of the specified resource. Requests using GET should only retrieve data.

> HEAD
>> asks for a response identical to a GET request, but without the response body.

> POST
>> submits an entity to the specified resource, often causing a change in state or side effects on the server.

> PUT
>> replaces all current representations of the target resource with the request payload.

> DELETE
>> deletes the specified resource.

#### POST, PUT, PATCH, DELETE

Endpoints can handle any HTTP method by exporting the corresponding function:

export function post(event:string):number {...}

export function put(event:string):number {...}

export function patch(event:string):number {...}

export function del(event:string):number {...} // `delete` is a reserved word

## list of response codes

Any thrown exception containing the **statusCode** and **message** property will be properly populated and send back as a response.

* 501 Not Implemented
* 500 Internal Server Error

* 404 Not Found


* 422 Unprocessable Entity
* 415 Unsupported Media Type


* 503 Service Unavailable
* 429 Too Many Requests






### source code is single source of truth (SSOT) for API documentation


> ~~To document the API, a technical writer examines the code created by the API developers and then manually creates the API documentation.~~

>> SSOT is the API's source code.

> ~~If you will spend time writing definitions and then spend time writing code to ensure these definitions are maintained during runtime, why have them in the first place?~~

>> definitions make up documentation

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

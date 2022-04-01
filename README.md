# yafbrg

*yet another filesystem based route generation*

**highly opinionated**

*(with API description generated from source files)*


This is highly experimental, highly incomplete, and completely undocumented.

For now, a traditional development setup will be more productive.


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

```
import { get as getUserId } from './users/[id].mjs'

polka() // You can also use Express

  .get('/users/:id', (req, res) => {
    res.end( getUserId(req.params.id) );
  })

```

so one can do

```

curl example.com/users/1

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

## list of response codes

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

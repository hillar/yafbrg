## openapi


### securitySchemes

```
"components": {
"securitySchemes": {
  "JWTAuth": {
    "scheme": "bearer",
    "bearerFormat": "JWT",
    "type": "http",
    "description": "Example: \n> Authorization: Bearer <token>",
    "x-last-modified": 1649830860715
  },
  "BasicAuth": {
    "type": "http",
    "scheme": "basic",
    "name": "BASIC",
    "in": "header",
    "description": "Example: \n> Authorization: Basic ZGVtbzpwQDU1dzByZA ==",
    "x-last-modified": 1649830919146
  }
},
...

```

### event stream oneof's

#### oneof anyof or

ts.isUnionTypeNode

{
  type: 'or',
  or: [
    { type: 'ref', ref: 'Dog', title: 'Pet.animal' },
    { type: 'ref', ref: 'Cat', title: 'Pet.animal' }
  ],
  title: 'Pet.animal'
}
{
  anyOf: [
    { '$ref': '#/components/schemas/Dog', title: 'Pet.animal' },
    { '$ref': '#/components/schemas/Cat', title: 'Pet.animal' }
  ],
  title: 'Pet.animal'
}

--------

```
export async function* get():AsyncGenerator<IUser|IGroup> {
  const user = await getUser(1)
  yield user
  const group = await getGroup(1)
  yield group
}
```
https://www.npmjs.com/package/graphql-sse

```
{
  "openapi": "3.0.1",
  "info": {
    "title": "foo",
    "version": "1.0"
  },
  "paths": {
    "/pets": {
      "get": {
        "summary": "get events a pet",
        "responses": {
          "200": {
            "content": {
              "text/event-stream": {
                "schema": {
                  "$ref": "#/components/schemas/Pet"
                }
              }
            },
            "description": "Updated"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Pet": {
        "type": "object",
        "oneOf": [
          {
            "type": "object",
            "properties": {
              "catInfo": {
                "$ref": "#/components/schemas/Cat"
              }
            }
          },
          {
            "type": "object",
            "properties": {
              "dogInfo": {
                "$ref": "#/components/schemas/Dog"
              }
            }
          }
        ]
      },
      "Dog": {
        "properties": {
          "bark": {
            "type": "boolean"
          },
          "breed": {
            "type": "string",
            "enum": [
              "Dingo",
              "Husky",
              "Retriever",
              "Shepherd"
            ]
          }
        }
      },
      "Cat": {
        "properties": {
          "hunts": {
            "type": "boolean"
          },
          "age": {
            "type": "integer"
          }
        }
      }
    }
  }
}

```

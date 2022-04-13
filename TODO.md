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

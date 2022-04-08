import {default as polka} from 'polka'


polka()

    .get('/:kala/maja/:kana', (req, res) => {
      const result =
      res.end(`User: ${req.params.id}`);
    })
    
    .post('/:kala/maja/:kana', (req, res) => {
      const result =
      res.end(`User: ${req.params.id}`);
    })
    
    .get('/api/v1/:liha/maja/:kana', (req, res) => {
      const result =
      res.end(`User: ${req.params.id}`);
    })
    
    .post('/api/v1/:liha/maja/:kana', (req, res) => {
      const result =
      res.end(`User: ${req.params.id}`);
    })
    
.listen(3000, (l) => {
  console.dir(l)
  console.log("> Running on localhost:3000");
})

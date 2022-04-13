
import { default as polka } from 'polka'
/*IMPORTS*/

const LISTENPORT= process.env.PORT || /*DEFAULTPORT*/

polka()
/*ROUTES*/
// https://github.com/braidn/tiny-graphql/blob/master/index.mjs
.listen(LISTENPORT, (l) => {
  console.log("> Polka server running on localhost:",LISTENPORT);
})
  
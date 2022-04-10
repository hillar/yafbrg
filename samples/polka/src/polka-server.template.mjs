
import { default as polka } from 'polka'
/*IMPORTS*/
const LISTENPORT= process.env.PORT || /*DEFAULTPORT*/
polka()
/*ROUTES*/
.listen(LISTENPORT, (l) => {
  console.log("> Polka server running on localhost:",LISTENPORT);
})
  

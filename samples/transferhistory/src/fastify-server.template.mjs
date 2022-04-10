
import { default as fastify } from 'fastify';
/*IMPORTS*/

const LISTENPORT= process.env.PORT || /*DEFAULTPORT*/

fastify.route(/*ROUTES*/)

try {
  await fastify.listen(3000)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}

  
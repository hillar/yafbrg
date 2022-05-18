import { IUser } from '$interfaces/users.mjs'
import { getUser } from '$providers/users.mjs'


/**
*
* returns all users
*
*/
export function get():IUser[] {
  return [getUser(1),getUser(1),getUser(1),getUser(1)]
}

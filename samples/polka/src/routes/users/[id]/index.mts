import { IUser } from '$interfaces/users.mjs'
import { getUser } from '$providers/users.mjs'

/**
*
* returns user by id
*
*/
export function get(id:number):IUser {
  return getUser(id)
}

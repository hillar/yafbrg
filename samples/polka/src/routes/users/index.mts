import { IUser } from '$interfaces/users.mjs'
import { getUser } from '$providers/users.mjs'

export interface IResult {
  ok: boolean
}


export function post(user:IUser,manager?:IUser):IResult {
  console.dir({user,manager})
  const ok = user?.id ? true : false
  return { ok }
}

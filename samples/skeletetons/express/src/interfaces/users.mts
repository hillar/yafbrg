import { IOrgUnit } from './org.mjs'
export { IOrgUnit } from './org.mjs'

export interface IUser {
  id: number
  firstname: string
  lastname: string
  ou?: IOrgUnit
}

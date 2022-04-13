import { IUser, IOrgUnit } from '$interfaces/users.mjs'

export function getUser(n:number):IUser{
  let id:number = 1
  let firstname:string = 'John'
  let lastname:string = 'Doe'
  let ou:IOrgUnit = {name:'example'}
  return {id, firstname, lastname, ou }
}

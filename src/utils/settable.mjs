class NotImplementedError extends Error {
  constructor(...args) {
    super(...args)
  }
}

class CoerseError extends Error {
  constructor(...args) {
    super(...args)
  }
}

export class Settable {
  constructor(...settings) {
    let kala = [...settings]
    // convert sinlge object to array
    if (settings.length === 1 && Object.keys(settings[0]).length > 1) {
      kala = []
      for (const key of Object.keys(settings[0])) {
        const tmp = {}
        tmp[key] = settings[0][key]
        kala.push(tmp)
      }
    }
    for (const setting of kala) {
      // there has to be name, setting can not be anonymous
      let name = Object.keys(setting)
      if (!name[0]) throw new Error(this.prototypeof + ' no name for setting')
      name = name[0]

      /*
      The coercion function should accept one argument,
      and should return always some value
      or throw an error.
      If the function throws, the error will be treated as
      a kinda validation failure and CoerseError is thrown

      { hostname: (v) => { return v.trim().length > 0 ? v.toLowerCase() : 'localhost'} }

      { port: (v) => {
          const port = Number(v)
          if (!port) throw new Error('port not number')
          if (port > 65535 || port < 0) throw new Error('port should be >= 0 and < 65536')}
          return port
      }


      If just value is passed, then typeof is used for coersion function
      and value itself as default

      { hostname: 'localhost' }
      { port: 9200 }
      { verbose: true}

      */
      let fn = setting[name]
      let _default
      try {
        _default = fn()
      } catch (e) {
        //console.log('catch',Object.getPrototypeOf( e ).constructor.name, this.prototypeof, n)
        if (e instanceof ReferenceError || e instanceof SyntaxError) {
          console.error(Object.getPrototypeOf(e).constructor.name, this.prototypeof, name)
          console.error(e)
          process.exit(-1)
        } else if (e.message === 'fn is not a function') {
          _default = fn
          switch (typeof fn) {
            case 'string':
              fn = String
              break
            case 'number':
              fn = Number
              break
            case 'boolean':
              fn = Boolean
              break
            default:
              throw new NotImplementedError(this.prototypeof + '.' + name + ' ' + typeof fn + ' default coerse function is not implemented (yet)')
          }
        } else throw new CoerseError(this.prototypeof + '.' + name + ' : ' + e.message)
      }
      if (_default === undefined) throw new Error(this.prototypeof + '.' + name + ' : no default returned by coerse function')
      Object.defineProperty(this, '__' + name, {
        enumerable: false,
        writable: true,
        value: _default,
      })
      Object.defineProperty(Object.getPrototypeOf(this), name, {
        get: () => {
          return this['__' + name]
        },
        set: (v) => {
          try {
            this['__' + name] = fn(v)
          } catch (error) {
            error.prototypeof = this.prototypeof
            error.settable = name
            throw error
          }
        },
        enumerable: false,
        configurable: true,
      })
    }
  }

  get prototypeof() {
    return Object.getPrototypeOf(this).constructor.name
  }

  /*
    return all class and it parents settable names
  */
  get settings() {
    function dig(i) {
      let _self = []
      const proto = Object.getPrototypeOf(i)
      for (const name of Object.getOwnPropertyNames(proto)) {
        if (!name.startsWith('__')) {
          // '__proto__' && ..
          const desc = Object.getOwnPropertyDescriptor(proto, name)
          if (desc && typeof desc.set === 'function') _self.push(name)
        }
      }
      const parent = Object.getPrototypeOf(i)
      if (parent && parent.constructor.name !== 'Object') return [...new Set([..._self, ...dig(parent)])]
      else return _self
    }
    return dig(this)
  }

  /*
    return all class settables with current values
  */
  get defaults() {
    const d = {}
    for (const name of this.settings) if (!(this[name] === undefined)) d[name] = this[name]
    return d
  }
}

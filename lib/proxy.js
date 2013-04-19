var util = require('util');

function toSource(obj) {
  var seen = new WeakMap();

  function toSourceImpl(obj) {
    switch (typeof obj) {
      case 'number':
      case 'boolean':
      case 'function':
        return obj;
        break;
      case 'string':
        return '\'' + obj + '\'';
        break;
      case 'object':
        if (obj === null)
          return 'null';

        if (obj.__isproxy) {
          var cached = seen.get(obj.__value);
          if (cached !== undefined) return cached;
          seen.set(obj.__value, obj.__path);
          return toSourceImpl(obj);
        }
        else {
          var cached = seen.get(obj);
          if (cached !== undefined) return cached;
          seen.set(obj, obj);
        }

        if (util.isArray(obj)) {
          var sep = '';
          return obj.reduce(
            function(prev, curr, idx, arr) {
              if (idx === 1)
                sep = ',';
              return prev + sep + toSourceImpl(curr);
            },
            '['
          ) + ']';
        }
        else {
          var sep = '';
          return Object.keys(obj).reduce(
            function(prev, curr, idx, arr) {
              if (idx === 1)
                sep = ',';
              return prev + sep + "'" + curr + "': " + toSourceImpl(obj[curr]);
            },
            '{'
          ) + '}';
        }
        break;
      case 'undefined':
        return undefined;
        break;
      default:
        assert(false, 'Unable to serialize object: ' + JSON.stringify(obj, null, 2));
        break;
    }
  }

  var result = toSourceImpl(obj);
  delete seen;
  return result;
}
	
var m = new WeakMap();

function ProxyType(obj, path, observer) {
  if (obj === null) return obj;

  var cached =  m.get(obj);
  if (cached !== undefined) return cached;
  path = path || 'root';

  function handlers() {
    return {
      getOwnPropertyDescriptor: function(name) {
        var desc = Object.getOwnPropertyDescriptor(obj, name);
        if (desc !== undefined) 
          desc.configurable = true;
        return desc;
      },
      getPropertyDescriptor: function(name) {
        var desc = Object.getPropertyDescriptor(obj, name);
        if (desc !== undefined) 
          desc.configurable = true;
        return desc;
      },
      getOwnPropertyNames: function() {
        return Object.getOwnPropertyNames(obj);
      },
      getPropertyNames: function() {
        return Object.getPropertyNames(obj);  
      },
      defineProperty: function(name, desc) {
        Object.defineProperty(obj, name, desc);
      },
      delete: function(key) {
        var subpath = path + '["' + key + '"]'; 
        var current = obj[key];
        if (current && typeof current === 'object')
          m.delete(current);
        if (observer && observer.delete)
          observer.delete(subpath);
        return delete obj[key];
      },   
      fix: function() {
        if (Object.isFrozen(obj)) {
          return Object.getOwnPropertyNames(obj).map(function(name) {
            return Object.getOwnPropertyDescriptor(obj, name);
          });
        }
        return undefined;
      },
      has: function(name) { 
        return name in obj; 
      },
      hasOwn: function(name) { 
        return Object.prototype.hasOwnProperty.call(obj, name); 
      },
      get: function(receiver, key) {
        if (key === '__path')
          return path;
        if (key === '__value')
          return obj;
        if (key === '__isproxy')
          return true;
        if (key === 'toJSON')
          return function() { return toSource(obj); };
        var subpath = path + '["' + key + '"]';
        if (observer && observer.get)
          observer.get(subpath);

        return (typeof obj[key] === 'object') ? ProxyType(obj[key], subpath, observer) 
               : (typeof obj[key] === 'function') ? function() { 
                 if (observer && observer.invoke)
                   observer.invoke(subpath, [].slice.call(arguments));
                 return obj[key].apply(obj, arguments); 
               }
               : obj[key];
      },
      set: function(receiver, key, value) { 
        var subpath = path + '["' + key + '"]';
        var current = obj[key];
        if (typeof current === 'object' && current !== null)
          m.delete(current);
        obj[key] = value;
        if (observer && observer.set)
          observer.set(subpath, value);
        return true; 
      }, 
      enumerate: function() {
        var result = [];
        for (name in obj) 
          result.push(name);
        return result;
      },
      keys: function() { 
        return Object.keys(obj) 
      }
    };
  }

  var proxy = Proxy.create(handlers(obj));
  m.set(obj, proxy);
  return proxy;
}  

function ObserverMultiplexer(observers) {
  var self = this;
  self.observer = {};
  self.observers = observers || [];

  var funcs = ['get', 'set', 'delete', 'invoke'];
  funcs.forEach(function(name) {
    self.observer[name] = function() {
      var args = arguments;
      var dispatch = this;
      self.observers.forEach(function(observer) {
        if (observer[name]) observer[name].apply(dispatch, args);   
      });
    };
  });
  return self.observer;
}

module.exports.ProxyType = ProxyType;
module.exports.ObserverMultiplexer = ObserverMultiplexer;
module.exports.toSource = toSource;

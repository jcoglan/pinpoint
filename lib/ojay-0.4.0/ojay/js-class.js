/*
Copyright (c) 2007-2008 James Coglan, http://jsclass.jcoglan.com
Licensed under the MIT license, http://www.opensource.org/licenses/mit-license.php
*/

/**
 * Copyright (c) 2007-2008 James Coglan
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Parts of this software are derived from the following open-source projects:
 *
 * - The Prototype framework, (c) 2005-2007 Sam Stephenson
 * - Alex Arnell's Inheritance library, (c) 2006, Alex Arnell
 * - Base, (c) 2006-7, Dean Edwards
 */

JS = {
  extend: function(object, methods) {
    methods = methods || {};
    for (var prop in methods) {
      if (object[prop] === methods[prop]) continue;
      object[prop] = methods[prop];
    }
    return object;
  },
  
  makeFunction: function() {
    return function() {
      return this.initialize
          ? (this.initialize.apply(this, arguments) || this)
          : this;
    };
  },
  
  makeBridge: function(klass) {
    var bridge = function() {};
    bridge.prototype = klass.prototype;
    return new bridge;
  },
  
  delegate: function(property, method) {
    return function() {
      return this[property][method].apply(this[property], arguments);
    };
  },
  
  bind: function() {
    var args = JS.array(arguments), method = args.shift(), object = args.shift() || null;
    return function() {
      return method.apply(object, args.concat(JS.array(arguments)));
    };
  },
  
  callsSuper: function(func) {
    return func.SUPER === undefined
        ? func.SUPER = /\bcallSuper\b/.test(func.toString())
        : func.SUPER;
  },
  
  mask: function(func) {
    var string = func.toString().replace(/callSuper/g, 'super');
    func.toString = function() { return string };
    return func;
  },
  
  array: function(iterable) {
    if (!iterable) return [];
    if (iterable.toArray) return iterable.toArray();
    var length = iterable.length, results = [];
    while (length--) results[length] = iterable[length];
    return results;
  },
  
  indexOf: function(haystack, needle) {
    for (var i = 0, n = haystack.length; i < n; i++) {
      if (haystack[i] === needle) return i;
    }
    return -1;
  },
  
  isFn: function(object) {
    return object instanceof Function;
  },
  
  ignore: function(key, object) {
    return /^(include|extend)$/.test(key) && typeof object === 'object';
  }
};

JS.Module = JS.makeFunction();
JS.extend(JS.Module.prototype, {
  initialize: function(methods, options) {
    options = options || {};
    this.__mod__ = this;
    this.__inc__ = [];
    this.__fns__ = {};
    this.__dep__ = [];
    this.__res__ = options._resolve || null;
    this.include(methods || {});
  },
  
  define: function(name, func, options) {
    options = options || {};
    this.__fns__[name] = func;
    if (JS.Module._notify && options._notify && JS.isFn(func))
        JS.Module._notify(name, options._notify);
    var i = this.__dep__.length;
    while (i--) this.__dep__[i].resolve();
  },
  
  instanceMethod: function(name) {
    var method = this.lookup(name).pop();
    return JS.isFn(method) ? method : null;
  },
  
  include: function(module, options, resolve) {
    if (!module) return resolve && this.resolve();
    options = options || {};
    var inc = module.include, ext = module.extend, modules, i, n, method,
        includer = options._included || this;
    
    if (module.__inc__ && module.__fns__) {
      this.__inc__.push(module);
      module.__dep__.push(this);
      if (options._extended) module.extended && module.extended(options._extended);
      else module.included && module.included(includer);
    }
    else {
      if (options._recall) {
        for (method in module) {
          if (JS.ignore(method, module[method])) continue;
          this.define(method, module[method], {_notify: includer || options._extended || this});
        }
      } else {
        if (typeof inc === 'object') {
          modules = [].concat(inc);
          for (i = 0, n = modules.length; i < n; i++)
            includer.include(modules[i], options);
        }
        if (typeof ext === 'object') {
          modules = [].concat(ext);
          for (i = 0, n = modules.length; i < n; i++)
            includer.extend(modules[i], false);
          includer.extend();
        }
        options._recall = true;
        return includer.include(module, options, resolve);
      }
    }
    resolve && this.resolve();
  },
  
  includes: function(moduleOrClass) {
    if (Object === moduleOrClass || this === moduleOrClass || this.__res__ === moduleOrClass.prototype)
      return true;
    var i = this.__inc__.length;
    while (i--) {
      if (this.__inc__[i].includes(moduleOrClass))
        return true;
    }
    return false;
  },
  
  ancestors: function(results) {
    results = results || [];
    for (var i = 0, n = this.__inc__.length; i < n; i++)
      this.__inc__[i].ancestors(results);
    var klass = (this.__res__||{}).klass,
        result = (klass && this.__res__ === klass.prototype) ? klass : this;
    if (JS.indexOf(results, result) === -1) results.push(result);
    return results;
  },
  
  lookup: function(name) {
    var ancestors = this.ancestors(), results = [], i, n, method;
    for (i = 0, n = ancestors.length; i < n; i++) {
      method = ancestors[i].__mod__.__fns__[name];
      if (method) results.push(method);
    }
    return results;
  },
  
  make: function(name, func) {
    if (!JS.isFn(func) || !JS.callsSuper(func)) return func;
    var module = this;
    return function() {
      return module.chain(this, name, arguments);
    };
  },
  
  chain: JS.mask( function(self, name, args) {
    var callees = this.lookup(name),
        stackIndex = callees.length - 1,
        currentSuper = self.callSuper,
        params = JS.array(args),
        result;
    
    self.callSuper = function() {
      var i = arguments.length;
      while (i--) params[i] = arguments[i];
      stackIndex -= 1;
      var returnValue = callees[stackIndex].apply(self, params);
      stackIndex += 1;
      return returnValue;
    };
    
    result = callees.pop().apply(self, params);
    currentSuper ? self.callSuper = currentSuper : delete self.callSuper;
    return result;
  } ),
  
  resolve: function(target) {
    var target = target || this, resolved = target.__res__, i, n, key, made;
    
    if (target === this) {
      i = this.__dep__.length;
      while (i--) this.__dep__[i].resolve();
    }
    
    if (!resolved) return;
    
    for (i = 0, n = this.__inc__.length; i < n; i++)
      this.__inc__[i].resolve(target);
    for (key in this.__fns__) {
      made = target.make(key, this.__fns__[key]);
      if (resolved[key] !== made) resolved[key] = made;
    }
  }
});

JS.ObjectMethods = new JS.Module({
  __eigen__: function() {
    if (this.__meta__) return this.__meta__;
    var module = this.__meta__ = new JS.Module({}, {_resolve: this});
    module.include(this.klass.__mod__);
    return module;
  },
  
  extend: function(module, resolve) {
    return this.__eigen__().include(module, {_extended: this}, resolve !== false);
  },
  
  isA: function(moduleOrClass) {
    return this.__eigen__().includes(moduleOrClass);
  },
  
  method: function(name) {
    var self = this, cache = self.__mcache__ = self.__mcache__ || {};
    if ((cache[name] || {}).fn === self[name]) return cache[name].bd;
    return (cache[name] = {fn: self[name], bd: JS.bind(self[name], self)}).bd;
  }
});

JS.Class = JS.makeFunction();
JS.extend(JS.Class.prototype = JS.makeBridge(JS.Module), {
  initialize: function(parent, methods) {
    var klass = JS.extend(JS.makeFunction(), this);
    klass.klass = klass.constructor = this.klass;
    if (!JS.isFn(parent)) {
      methods = parent;
      parent = Object;
    }
    klass.inherit(parent);
    klass.include(methods, null, false);
    klass.resolve();
    do {
      parent.inherited && parent.inherited(klass);
    } while (parent = parent.superclass);
    return klass;
  },
  
  inherit: function(klass) {
    this.superclass = klass;
    
    if (this.__eigen__) {
      this.__eigen__().include(klass.__eigen__
          ? klass.__eigen__()
          : new JS.Module(klass.prototype));
      this.__meta__.resolve();
    }
    
    this.subclasses = [];
    (klass.subclasses || []).push(this);
    
    var p = this.prototype = JS.makeBridge(klass);
    p.klass = p.constructor = this;
    
    this.__mod__ = new JS.Module({}, {_resolve: this.prototype});
    this.include(JS.ObjectMethods, null, false);
    
    if (klass !== Object) this.include(klass.__mod__ || new JS.Module(klass.prototype,
        {_resolve: klass.prototype}), null, false);
  },
  
  include: function(module, options, resolve) {
    if (!module) return;
    var mod = this.__mod__, options = options || {};
    options._included = this;
    return mod.include(module, options, resolve !== false);
  },
  
  extend: function(module) {
    if (!this.callSuper) return;
    this.callSuper();
    var i = this.subclasses.length;
    while (i--) this.subclasses[i].extend();
  },
  
  define: function() {
    var module = this.__mod__;
    module.define.apply(module, arguments);
    module.resolve();
  },
  
  includes:   JS.delegate('__mod__', 'includes'),
  ancestors:  JS.delegate('__mod__', 'ancestors'),
  resolve:    JS.delegate('__mod__', 'resolve')
});

JS.Module = JS.extend(new JS.Class(JS.Module.prototype), JS.ObjectMethods.__fns__);
JS.Module.include(JS.ObjectMethods);
JS.Class = JS.extend(new JS.Class(JS.Module, JS.Class.prototype), JS.ObjectMethods.__fns__);
JS.Module.klass = JS.Module.constructor =
JS.Class.klass = JS.Class.constructor = JS.Class;

JS.Module.extend({
  _observers: [],
  methodAdded: function(block, context) {
    this._observers.push([block, context]);
  },
  _notify: function(name, object) {
    var obs = this._observers, i = obs.length;
    while (i--) obs[i][0].call(obs[i][1] || null, name, object);
  }
});

JS.extend(JS, {
  Interface: new JS.Class({
    initialize: function(methods) {
      this.test = function(object, returnName) {
        var n = methods.length;
        while (n--) {
          if (!JS.isFn(object[methods[n]]))
            return returnName ? methods[n] : false;
        }
        return true;
      };
    },
    
    extend: {
      ensure: function() {
        var args = JS.array(arguments), object = args.shift(), face, result;
        while (face = args.shift()) {
          result = face.test(object, true);
          if (result !== true) throw new Error('object does not implement ' + result + '()');
        }
      }
    }
  }),
  
  Singleton: new JS.Class({
    initialize: function(parent, methods) {
      return new (new JS.Class(parent, methods));
    }
  })
});


JS.MethodChain = function(base) {
  var queue = [], baseObject = base || {};
  
  this.____ = function(method, args) {
    queue.push({func: method, args: args});
  };
  
  this.fire = function(base) {
    return JS.MethodChain.fire(queue, base || baseObject);
  };
};

JS.MethodChain.fire = function(queue, object) {
  var method, property, i, n;
  loop: for (i = 0, n = queue.length; i < n; i++) {
    method = queue[i];
    if (object instanceof JS.MethodChain) {
      object.____(method.func, method.args);
      continue;
    }
    switch (typeof method.func) {
      case 'string':    property = object[method.func];       break;
      case 'function':  property = method.func;               break;
      case 'object':    object = method.func; continue loop;  break;
    }
    object = (typeof property === 'function')
        ? property.apply(object, method.args)
        : property;
  }
  return object;
};

JS.MethodChain.prototype = {
  _: function() {
    var base = arguments[0], args, i, n;
    switch (typeof base) {
      case 'object': case 'function':
        args = [];
        for (i = 1, n = arguments.length; i < n; i++) args.push(arguments[i]);
        this.____(base, args);
    }
    return this;
  },
  
  toFunction: function() {
    var chain = this;
    return function(object) { return chain.fire(object); };
  }
};

JS.MethodChain.reserved = (function() {
  var names = [], key;
  for (key in new JS.MethodChain) names.push(key);
  return new RegExp('^(?:' + names.join('|') + ')$');
})();

JS.MethodChain.addMethod = function(name) {
  if (this.reserved.test(name)) return;
  this.prototype[name] = function() {
    this.____(name, arguments);
    return this;
  };
};

JS.MethodChain.addMethods = function(object) {
  var methods = [], property, i;
  
  for (property in object)
    Number(property) !== property && methods.push(property);
  
  if (object instanceof Array) {
    i = object.length;
    while (i--)
      typeof object[i] === 'string' && methods.push(object[i]);
  }
  i = methods.length;
  while (i--) this.addMethod(methods[i]);
  
  object.prototype &&
    this.addMethods(object.prototype);
};

it = its = function() { return new JS.MethodChain; };

JS.Module.methodAdded(function(name) {
  JS.MethodChain.addMethod(name);
});

JS.ObjectMethods.include({
  wait: function(time) {
    var chain = new JS.MethodChain;
    
    typeof time === 'number' &&
      setTimeout(chain.fire.bind(chain, this), time * 1000);
    
    this.forEach && typeof time === 'function' &&
      this.forEach(function() {
        setTimeout(chain.fire.bind(chain, arguments[0]), time.apply(this, arguments) * 1000);
      });
    
    return chain;
  },
  
  _: function() {
    var base = arguments[0], args = [], i, n;
    for (i = 1, n = arguments.length; i < n; i++) args.push(arguments[i]);
    return  (typeof base === 'object' && base) ||
            (typeof base === 'function' && base.apply(this, args)) ||
            this;
  }
});


JS.Observable = new JS.Module({
  addObserver: function(observer, context) {
    (this.__observers__ = this.__observers__ || []).push({bk: observer, cx: context || null});
  },
  
  removeObserver: function(observer, context) {
    this.__observers__ = this.__observers__ || [];
    context = context || null;
    var i = this.countObservers();
    while (i--) {
      if (this.__observers__[i].bk === observer && this.__observers__[i].cx === context) {
        this.__observers__.splice(i,1);
        return;
      }
    }
  },
  
  removeObservers: function() {
    this.__observers__ = [];
  },
  
  countObservers: function() {
    return (this.__observers__ = this.__observers__ || []).length;
  },
  
  notifyObservers: function() {
    if (!this.isChanged()) return;
    var i = this.countObservers(), observer;
    while (i--) {
      observer = this.__observers__[i];
      observer.bk.apply(observer.cx, arguments);
    }
  },
  
  setChanged: function(state) {
    this.__changed__ = !(state === false);
  },
  
  isChanged: function() {
    if (this.__changed__ === undefined) this.__changed__ = true;
    return !!this.__changed__;
  }
});

JS.Observable.include({
  subscribe:    JS.Observable.instanceMethod('addObserver'),
  unsubscribe:  JS.Observable.instanceMethod('removeObserver')
});


JS.State = new JS.Module({
  __getState__: function(state) {
    return  (typeof state === 'object' && state) ||
            (typeof state === 'string' && ((this.states || {})[state] || {})) ||
            {};
  },
  
  setState: function(state) {
    this.__state__ = this.__getState__(state);
    JS.State.addMethods(this.__state__, this.klass);
  },
  
  inState: function() {
    var i = arguments.length;
    while (i--) {
      if (this.__state__ === this.__getState__(arguments[i])) return true;
    }
    return false;
  },
  
  extend: {
    stub: function() { return this; },
    
    buildStubs: function(stubs, collection, states) {
      var state, method;
      for (state in states) {
        collection[state] = {};
        for (method in states[state]) stubs[method] = this.stub;
    } },
    
    buildCollection: function(module, states) {
      var stubs = {}, collection = {}, superstates = module.lookup('states').pop() || {};
      this.buildStubs(stubs, collection, states);
      this.buildStubs(stubs, collection, superstates);
      var state, klass, methods, name;
      for (state in collection) {
        klass = (superstates[state]||{}).klass;
        klass = klass ? new JS.Class(klass, states[state]) : new JS.Class(states[state]);
        methods = {};
        for (name in stubs) { if (!klass.prototype[name]) methods[name] = stubs[name]; }
        klass.include(methods);
        collection[state] = new klass;
      }
      if (module.__res__) this.addMethods(stubs, module.__res__.klass);
      return collection;
    },
    
    addMethods: function(state, klass) {
      if (!klass) return;
      var methods = {}, p = klass.prototype;
      for (var method in state) {
        if (p[method]) continue;
        p[method] = klass.__mod__.__fns__[method] = this.wrapped(method);
      }
    },
    
    wrapped: function(method) {
      return function() {
        var func = (this.__state__ || {})[method];
        return func ? func.apply(this, arguments): this;
      };
    }
  }
});

JS.Module.include({define: (function(wrapped) {
  return function(name, block) {
    if (name === 'states' && typeof block === 'object')
      arguments[1] = JS.State.buildCollection(this, block);
    return wrapped.apply(this, arguments);
  };
})(JS.Module.prototype.define)});
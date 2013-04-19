#!/usr/local/bin/node --harmony

var proxy = require('../lib/proxy.js');
var ProxyType = proxy.ProxyType;
var ObserverMultiplexer = proxy.ObserverMultiplexer;
var toSource = proxy.toSource;

var observer = {
  get: function(path) {

  },
  set: function(path, value) {
    var cmd = path + ' = ' + toSource(value);
    eval(cmd);
  },
  delete: function(path) {
    var cmd = 'delete ' + path;
    eval(cmd);
  },
  invoke: function(path, args) {
    var cmd = path + '(' + args.map(toSource).join(',') + ')';
    eval(cmd);
  }
};

var root = {
  func: function() {
    this.test = 1;
  },
  func2: function(val) {
    console.log('Root:', val);
  }
};

var observer2 = {
  get: function(path) {
    console.log('Get:', path);
  }
};

var init = {
  func: function() {
    this.test = 1;
  },
  func2: function(val) {
    console.log('Func2:',val);
  }
};

var observerM = ObserverMultiplexer([observer, observer2]);

var obj = ProxyType(init, 'root', observerM);
obj.test2 = 2;
obj.test3 = [1,2,3];
obj.test3.push(4);
obj.test4 = {
  hello: 'world'
};

obj.test4.hello = 'world!';
obj.test3.shift();

obj.test3.unshift({'hello': 'world'});
obj.test3.push({goodbye: 1});

delete obj.test4.hello;

obj.func();
obj.func2('Hello!');

obj.msg = 'Testing!';

obj.test5 = function(val) {
  console.log(this.msg);
};

obj.test5('Testing!');

obj.pop = function() {
  this.test3.pop();
}

console.log(obj);
console.log(root);

obj.pop();

console.log(obj);
console.log(root);

var test = {}

var proxy2 = ProxyType({}, 'test', observer);
proxy2.one = 1;
proxy2.two = 2;

proxy2.append = function(val) {
  this.arr = this.arr || [];
  this.arr.push(val);
}

proxy2.append(1);

delete proxy2.append;

console.log(test);
console.log(proxy2);

var obj3 = {};
var model = {};

var proxy3 = ProxyType(obj3, 'model', observer);
proxy3.value = 1;
proxy3.internal = {};
proxy3.internal.self = proxy3.internal;
proxy3.self = proxy3;
console.log(model.internal.self.self.self);
console.log(obj3.internal.self.self.self);
console.log(proxy3.internal.self.self.self);
console.log(proxy3.self.self.self.value);
console.log(model.self.self.self.value);
console.log(obj3.self.self.self.value);

proxy3.value = 3;
console.log(proxy3.self.self.self.value);
console.log(model.self.self.self.value);
console.log(obj3.self.self.self.value);

var tester = {};
tester.self = tester;
console.log(toSource(tester));

var model2 = {};
var proxy4 = ProxyType(tester, 'model2', observer);
proxy4.value = 2;
console.log(proxy4);
console.log(tester);

proxy4.value = 3;
console.log(proxy4);
console.log(tester);
console.log(model2);

proxy4.self = proxy4;
console.log(model2);
console.log('Source:',toSource(proxy4.__value));

var init_data = {
  data: []
};

var matched_data = {
  data: []
};

array_proxy = ProxyType(init_data, 'matched_data', observer);
array_proxy.data.push(1);
console.log(array_proxy);
console.log(init_data);
console.log(matched_data);

array_proxy.data.push(2);
array_proxy.data = array_proxy.data.concat([3,4,5]);
console.log(array_proxy);
console.log(init_data);
console.log(matched_data);

array_proxy.data.push(6);
array_proxy.data.shift();

console.log(array_proxy);
console.log(init_data);
console.log(matched_data);

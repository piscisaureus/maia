function generateId() {
  return Math.floor(Math.random() * 1e9);
}

function kv(key, value) {
  var o = {};
  o[key] = value;
  return o;
}

function mixin(target, source) {
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key];
    }
  }
  return target;
}


function clone(source) {
  return mixin({}, source);
}
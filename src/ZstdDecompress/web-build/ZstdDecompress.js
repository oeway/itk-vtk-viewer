var Module = typeof Module !== 'undefined' ? Module : {}
var Module = {}
var moduleStdout = null
var moduleStderr = null
Module.resetModuleStdout = function() {
  moduleStdout = ''
}
Module.resetModuleStderr = function() {
  moduleStderr = ''
}
Module.print = function(text) {
  console.log(text)
  moduleStdout += text + '\n'
}
Module.printErr = function(text) {
  console.log(text)
  moduleStderr += text + '\n'
}
Module.getModuleStdout = function() {
  return moduleStdout
}
Module.getModuleStderr = function() {
  return moduleStderr
}
Module.preRun = function() {
  ENV.ITK_GLOBAL_DEFAULT_THREADER = 'Platform'
}
var moduleOverrides = {}
var key
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key]
  }
}
var arguments_ = []
var thisProgram = './this.program'
var quit_ = function(status, toThrow) {
  throw toThrow
}
var ENVIRONMENT_IS_WEB = false
var ENVIRONMENT_IS_WORKER = false
var ENVIRONMENT_IS_NODE = false
var ENVIRONMENT_IS_SHELL = false
ENVIRONMENT_IS_WEB = typeof window === 'object'
ENVIRONMENT_IS_WORKER = typeof importScripts === 'function'
ENVIRONMENT_IS_NODE =
  typeof process === 'object' &&
  typeof process.versions === 'object' &&
  typeof process.versions.node === 'string'
ENVIRONMENT_IS_SHELL =
  !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER
var scriptDirectory = ''
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory)
  }
  return scriptDirectory + path
}
var read_, readAsync, readBinary, setWindowTitle
var nodeFS
var nodePath
if (ENVIRONMENT_IS_NODE) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = require('path').dirname(scriptDirectory) + '/'
  } else {
    scriptDirectory = __dirname + '/'
  }
  read_ = function shell_read(filename, binary) {
    var ret = tryParseAsDataURI(filename)
    if (ret) {
      return binary ? ret : ret.toString()
    }
    if (!nodeFS) nodeFS = require('fs')
    if (!nodePath) nodePath = require('path')
    filename = nodePath['normalize'](filename)
    return nodeFS['readFileSync'](filename, binary ? null : 'utf8')
  }
  readBinary = function readBinary(filename) {
    var ret = read_(filename, true)
    if (!ret.buffer) {
      ret = new Uint8Array(ret)
    }
    assert(ret.buffer)
    return ret
  }
  if (process['argv'].length > 1) {
    thisProgram = process['argv'][1].replace(/\\/g, '/')
  }
  arguments_ = process['argv'].slice(2)
  if (typeof module !== 'undefined') {
    module['exports'] = Module
  }
  process['on']('uncaughtException', function(ex) {
    if (!(ex instanceof ExitStatus)) {
      throw ex
    }
  })
  process['on']('unhandledRejection', abort)
  quit_ = function(status) {
    process['exit'](status)
  }
  Module['inspect'] = function() {
    return '[Emscripten Module object]'
  }
} else if (ENVIRONMENT_IS_SHELL) {
  if (typeof read != 'undefined') {
    read_ = function shell_read(f) {
      var data = tryParseAsDataURI(f)
      if (data) {
        return intArrayToString(data)
      }
      return read(f)
    }
  }
  readBinary = function readBinary(f) {
    var data
    data = tryParseAsDataURI(f)
    if (data) {
      return data
    }
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f))
    }
    data = read(f, 'binary')
    assert(typeof data === 'object')
    return data
  }
  if (typeof scriptArgs != 'undefined') {
    arguments_ = scriptArgs
  } else if (typeof arguments != 'undefined') {
    arguments_ = arguments
  }
  if (typeof quit === 'function') {
    quit_ = function(status) {
      quit(status)
    }
  }
  if (typeof print !== 'undefined') {
    if (typeof console === 'undefined') console = {}
    console.log = print
    console.warn = console.error =
      typeof printErr !== 'undefined' ? printErr : print
  }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = self.location.href
  } else if (document.currentScript) {
    scriptDirectory = document.currentScript.src
  }
  if (scriptDirectory.indexOf('blob:') !== 0) {
    scriptDirectory = scriptDirectory.substr(
      0,
      scriptDirectory.lastIndexOf('/') + 1
    )
  } else {
    scriptDirectory = ''
  }
  {
    read_ = function shell_read(url) {
      try {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', url, false)
        xhr.send(null)
        return xhr.responseText
      } catch (err) {
        var data = tryParseAsDataURI(url)
        if (data) {
          return intArrayToString(data)
        }
        throw err
      }
    }
    if (ENVIRONMENT_IS_WORKER) {
      readBinary = function readBinary(url) {
        try {
          var xhr = new XMLHttpRequest()
          xhr.open('GET', url, false)
          xhr.responseType = 'arraybuffer'
          xhr.send(null)
          return new Uint8Array(xhr.response)
        } catch (err) {
          var data = tryParseAsDataURI(url)
          if (data) {
            return data
          }
          throw err
        }
      }
    }
    readAsync = function readAsync(url, onload, onerror) {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      xhr.responseType = 'arraybuffer'
      xhr.onload = function xhr_onload() {
        if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
          onload(xhr.response)
          return
        }
        var data = tryParseAsDataURI(url)
        if (data) {
          onload(data.buffer)
          return
        }
        onerror()
      }
      xhr.onerror = onerror
      xhr.send(null)
    }
  }
  setWindowTitle = function(title) {
    document.title = title
  }
} else {
}
var out = Module['print'] || console.log.bind(console)
var err = Module['printErr'] || console.warn.bind(console)
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key]
  }
}
moduleOverrides = null
if (Module['arguments']) arguments_ = Module['arguments']
if (Module['thisProgram']) thisProgram = Module['thisProgram']
if (Module['quit']) quit_ = Module['quit']
var STACK_ALIGN = 16
function dynamicAlloc(size) {
  var ret = HEAP32[DYNAMICTOP_PTR >> 2]
  var end = (ret + size + 15) & -16
  if (end > _emscripten_get_heap_size()) {
    abort()
  }
  HEAP32[DYNAMICTOP_PTR >> 2] = end
  return ret
}
function getNativeTypeSize(type) {
  switch (type) {
    case 'i1':
    case 'i8':
      return 1
    case 'i16':
      return 2
    case 'i32':
      return 4
    case 'i64':
      return 8
    case 'float':
      return 4
    case 'double':
      return 8
    default: {
      if (type[type.length - 1] === '*') {
        return 4
      } else if (type[0] === 'i') {
        var bits = Number(type.substr(1))
        assert(
          bits % 8 === 0,
          'getNativeTypeSize invalid bits ' + bits + ', type ' + type
        )
        return bits / 8
      } else {
        return 0
      }
    }
  }
}
function warnOnce(text) {
  if (!warnOnce.shown) warnOnce.shown = {}
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1
    err(text)
  }
}
var jsCallStartIndex = 1
var functionPointers = new Array(0)
var funcWrappers = {}
function dynCall(sig, ptr, args) {
  if (args && args.length) {
    return Module['dynCall_' + sig].apply(null, [ptr].concat(args))
  } else {
    return Module['dynCall_' + sig].call(null, ptr)
  }
}
var tempRet0 = 0
var setTempRet0 = function(value) {
  tempRet0 = value
}
var getTempRet0 = function() {
  return tempRet0
}
var GLOBAL_BASE = 8
var wasmBinary
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary']
var noExitRuntime
if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime']
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8'
  if (type.charAt(type.length - 1) === '*') type = 'i32'
  switch (type) {
    case 'i1':
      HEAP8[ptr >> 0] = value
      break
    case 'i8':
      HEAP8[ptr >> 0] = value
      break
    case 'i16':
      HEAP16[ptr >> 1] = value
      break
    case 'i32':
      HEAP32[ptr >> 2] = value
      break
    case 'i64':
      ;(tempI64 = [
        value >>> 0,
        ((tempDouble = value),
        +Math_abs(tempDouble) >= +1
          ? tempDouble > +0
            ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) |
                0) >>>
              0
            : ~~+Math_ceil(
                (tempDouble - +(~~tempDouble >>> 0)) / +4294967296
              ) >>> 0
          : 0),
      ]),
        (HEAP32[ptr >> 2] = tempI64[0]),
        (HEAP32[(ptr + 4) >> 2] = tempI64[1])
      break
    case 'float':
      HEAPF32[ptr >> 2] = value
      break
    case 'double':
      HEAPF64[ptr >> 3] = value
      break
    default:
      abort('invalid type for setValue: ' + type)
  }
}
var ABORT = false
var EXITSTATUS = 0
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text)
  }
}
function getCFunc(ident) {
  var func = Module['_' + ident]
  assert(
    func,
    'Cannot call unknown function ' + ident + ', make sure it is exported'
  )
  return func
}
function ccall(ident, returnType, argTypes, args, opts) {
  var toC = {
    string: function(str) {
      var ret = 0
      if (str !== null && str !== undefined && str !== 0) {
        var len = (str.length << 2) + 1
        ret = stackAlloc(len)
        stringToUTF8(str, ret, len)
      }
      return ret
    },
    array: function(arr) {
      var ret = stackAlloc(arr.length)
      writeArrayToMemory(arr, ret)
      return ret
    },
  }
  function convertReturnValue(ret) {
    if (returnType === 'string') return UTF8ToString(ret)
    if (returnType === 'boolean') return Boolean(ret)
    return ret
  }
  var func = getCFunc(ident)
  var cArgs = []
  var stack = 0
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]]
      if (converter) {
        if (stack === 0) stack = stackSave()
        cArgs[i] = converter(args[i])
      } else {
        cArgs[i] = args[i]
      }
    }
  }
  var ret = func.apply(null, cArgs)
  ret = convertReturnValue(ret)
  if (stack !== 0) stackRestore(stack)
  return ret
}
var ALLOC_NONE = 3
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size
  if (typeof slab === 'number') {
    zeroinit = true
    size = slab
  } else {
    zeroinit = false
    size = slab.length
  }
  var singleType = typeof types === 'string' ? types : null
  var ret
  if (allocator == ALLOC_NONE) {
    ret = ptr
  } else {
    ret = [_malloc, stackAlloc, dynamicAlloc][allocator](
      Math.max(size, singleType ? 1 : types.length)
    )
  }
  if (zeroinit) {
    var stop
    ptr = ret
    assert((ret & 3) == 0)
    stop = ret + (size & ~3)
    for (; ptr < stop; ptr += 4) {
      HEAP32[ptr >> 2] = 0
    }
    stop = ret + size
    while (ptr < stop) {
      HEAP8[ptr++ >> 0] = 0
    }
    return ret
  }
  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret)
    } else {
      HEAPU8.set(new Uint8Array(slab), ret)
    }
    return ret
  }
  var i = 0,
    type,
    typeSize,
    previousType
  while (i < size) {
    var curr = slab[i]
    type = singleType || types[i]
    if (type === 0) {
      i++
      continue
    }
    if (type == 'i64') type = 'i32'
    setValue(ret + i, curr, type)
    if (previousType !== type) {
      typeSize = getNativeTypeSize(type)
      previousType = type
    }
    i += typeSize
  }
  return ret
}
var UTF8Decoder =
  typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined
function UTF8ArrayToString(u8Array, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead
  var endPtr = idx
  while (u8Array[endPtr] && !(endPtr >= endIdx)) ++endPtr
  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr))
  } else {
    var str = ''
    while (idx < endPtr) {
      var u0 = u8Array[idx++]
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0)
        continue
      }
      var u1 = u8Array[idx++] & 63
      if ((u0 & 224) == 192) {
        str += String.fromCharCode(((u0 & 31) << 6) | u1)
        continue
      }
      var u2 = u8Array[idx++] & 63
      if ((u0 & 240) == 224) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2
      } else {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (u8Array[idx++] & 63)
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0)
      } else {
        var ch = u0 - 65536
        str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023))
      }
    }
  }
  return str
}
function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : ''
}
function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) return 0
  var startIdx = outIdx
  var endIdx = outIdx + maxBytesToWrite - 1
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i)
    if (u >= 55296 && u <= 57343) {
      var u1 = str.charCodeAt(++i)
      u = (65536 + ((u & 1023) << 10)) | (u1 & 1023)
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break
      outU8Array[outIdx++] = u
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break
      outU8Array[outIdx++] = 192 | (u >> 6)
      outU8Array[outIdx++] = 128 | (u & 63)
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break
      outU8Array[outIdx++] = 224 | (u >> 12)
      outU8Array[outIdx++] = 128 | ((u >> 6) & 63)
      outU8Array[outIdx++] = 128 | (u & 63)
    } else {
      if (outIdx + 3 >= endIdx) break
      outU8Array[outIdx++] = 240 | (u >> 18)
      outU8Array[outIdx++] = 128 | ((u >> 12) & 63)
      outU8Array[outIdx++] = 128 | ((u >> 6) & 63)
      outU8Array[outIdx++] = 128 | (u & 63)
    }
  }
  outU8Array[outIdx] = 0
  return outIdx - startIdx
}
function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}
function lengthBytesUTF8(str) {
  var len = 0
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i)
    if (u >= 55296 && u <= 57343)
      u = (65536 + ((u & 1023) << 10)) | (str.charCodeAt(++i) & 1023)
    if (u <= 127) ++len
    else if (u <= 2047) len += 2
    else if (u <= 65535) len += 3
    else len += 4
  }
  return len
}
var UTF16Decoder =
  typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined
function allocateUTF8OnStack(str) {
  var size = lengthBytesUTF8(str) + 1
  var ret = stackAlloc(size)
  stringToUTF8Array(str, HEAP8, ret, size)
  return ret
}
function writeArrayToMemory(array, buffer) {
  HEAP8.set(array, buffer)
}
function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[buffer++ >> 0] = str.charCodeAt(i)
  }
  if (!dontAddNull) HEAP8[buffer >> 0] = 0
}
function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - (x % multiple)
  }
  return x
}
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64
function updateGlobalBufferAndViews(buf) {
  buffer = buf
  Module['HEAP8'] = HEAP8 = new Int8Array(buf)
  Module['HEAP16'] = HEAP16 = new Int16Array(buf)
  Module['HEAP32'] = HEAP32 = new Int32Array(buf)
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buf)
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buf)
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buf)
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buf)
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buf)
}
var STACK_BASE = 7024,
  DYNAMIC_BASE = 5249904,
  DYNAMICTOP_PTR = 6832
var INITIAL_INITIAL_MEMORY = Module['INITIAL_MEMORY'] || 16777216
if (Module['buffer']) {
  buffer = Module['buffer']
} else {
  buffer = new ArrayBuffer(INITIAL_INITIAL_MEMORY)
}
INITIAL_INITIAL_MEMORY = buffer.byteLength
updateGlobalBufferAndViews(buffer)
HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE
function callRuntimeCallbacks(callbacks) {
  while (callbacks.length > 0) {
    var callback = callbacks.shift()
    if (typeof callback == 'function') {
      callback()
      continue
    }
    var func = callback.func
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Module['dynCall_v'](func)
      } else {
        Module['dynCall_vi'](func, callback.arg)
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg)
    }
  }
}
var __ATPRERUN__ = []
var __ATINIT__ = []
var __ATMAIN__ = []
var __ATPOSTRUN__ = []
var runtimeInitialized = false
var runtimeExited = false
function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function')
      Module['preRun'] = [Module['preRun']]
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift())
    }
  }
  callRuntimeCallbacks(__ATPRERUN__)
}
function initRuntime() {
  runtimeInitialized = true
  if (!Module['noFSInit'] && !FS.init.initialized) FS.init()
  TTY.init()
  callRuntimeCallbacks(__ATINIT__)
}
function preMain() {
  FS.ignorePermissions = false
  callRuntimeCallbacks(__ATMAIN__)
}
function exitRuntime() {
  runtimeExited = true
}
function postRun() {
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function')
      Module['postRun'] = [Module['postRun']]
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift())
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__)
}
function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb)
}
function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb)
}
var Math_abs = Math.abs
var Math_ceil = Math.ceil
var Math_floor = Math.floor
var Math_min = Math.min
var runDependencies = 0
var runDependencyWatcher = null
var dependenciesFulfilled = null
function getUniqueRunDependency(id) {
  return id
}
function addRunDependency(id) {
  runDependencies++
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies)
  }
}
function removeRunDependency(id) {
  runDependencies--
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies)
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher)
      runDependencyWatcher = null
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled
      dependenciesFulfilled = null
      callback()
    }
  }
}
Module['preloadedImages'] = {}
Module['preloadedAudios'] = {}
function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what)
  }
  what += ''
  out(what)
  err(what)
  ABORT = true
  EXITSTATUS = 1
  what = 'abort(' + what + '). Build with -s ASSERTIONS=1 for more info.'
  throw what
}
var memoryInitializer = null
var dataURIPrefix = 'data:application/octet-stream;base64,'
function isDataURI(filename) {
  return String.prototype.startsWith
    ? filename.startsWith(dataURIPrefix)
    : filename.indexOf(dataURIPrefix) === 0
}
var tempDouble
var tempI64
memoryInitializer =
  'data:application/octet-stream;base64,AAAAAAAAAAAAAAAAAQAAAAIAAAAEAAAAAAAAAAIAAAAEAAAACAAAAAAAAAABAAAAAQAAAAUAAAANAAAAHQAAAD0AAAB9AAAA/QAAAP0BAAD9AwAA/QcAAP0PAAD9HwAA/T8AAP1/AAD9/wAA/f8BAP3/AwD9/wcA/f8PAP3/HwD9/z8A/f9/AP3//wD9//8B/f//A/3//wf9//8P/f//H/3//z/9//9/AAAAAAEAAAACAAAAAwAAAAQAAAAFAAAABgAAAAcAAAAIAAAACQAAAAoAAAALAAAADAAAAA0AAAAOAAAADwAAABAAAAARAAAAEgAAABMAAAAUAAAAFQAAABYAAAAXAAAAGAAAABkAAAAaAAAAGwAAABwAAAAdAAAAHgAAAB8AAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAABEAAAASAAAAEwAAABQAAAAVAAAAFgAAABcAAAAYAAAAGQAAABoAAAAbAAAAHAAAAB0AAAAeAAAAHwAAACAAAAAhAAAAIgAAACMAAAAlAAAAJwAAACkAAAArAAAALwAAADMAAAA7AAAAQwAAAFMAAABjAAAAgwAAAAMBAAADAgAAAwQAAAMIAAADEAAAAyAAAANAAAADgAAAAwABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAIAAAACAAAAAwAAAAMAAAAEAAAABAAAAAUAAAAHAAAACAAAAAkAAAAKAAAACwAAAAwAAAANAAAADgAAAA8AAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAACAAAAAwAAAAQAAAAFAAAABgAAAAcAAAAIAAAACQAAAAoAAAALAAAADAAAAA0AAAAOAAAADwAAABAAAAASAAAAFAAAABYAAAAYAAAAHAAAACAAAAAoAAAAMAAAAEAAAACAAAAAAAEAAAACAAAABAAAAAgAAAAQAAAAIAAAAEAAAACAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAACAAAAAgAAAAMAAAADAAAABAAAAAYAAAAHAAAACAAAAAkAAAAKAAAACwAAAAwAAAANAAAADgAAAA8AAAAQAAAAAAAAAAAAAAABAAAAAQAAAAIAAAACAAAAAAAAAAAAAAABAAAAAQAAAAIAAAACAAAAJgAAAIIAAAAhBQAASgAAAGcIAAAmAAAAwAEAAIAAAABJBQAASgAAAL4IAAApAAAALAIAAIAAAABJBQAASgAAAL4IAAAvAAAAygIAAIAAAACKBQAASgAAAIQJAAA1AAAAcwMAAIAAAACdBQAASgAAAKAJAAA9AAAAgQMAAIAAAADrBQAASwAAAD4KAABEAAAAngMAAIAAAABNBgAASwAAAKoKAABLAAAAswMAAIAAAADBBgAATQAAAB8NAABNAAAAUwQAAIAAAAAjCAAAUQAAAKYPAABUAAAAmQQAAIAAAABLCQAAVwAAALESAABYAAAA2gQAAIAAAABvCQAAXQAAACMUAABUAAAARQUAAIAAAABUCgAAagAAAIwUAABqAAAArwUAAIAAAAB2CQAAfAAAAE4QAAB8AAAA0gIAAIAAAABjBwAAkQAAAJAHAACSAAAAAAAAAAEAAAACAAAAAwAAAAQAAAAFAAAABgAAAAcAAAAIAAAACQAAAAoAAAALAAAADAAAAA0AAAAOAAAADwAAABAAAAASAAAAFAAAABYAAAAYAAAAHAAAACAAAAAoAAAAMAAAAEAAAACAAAAAAAEAAAACAAAABAAAAAgAAAAQAAAAIAAAAEAAAACAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAACAAAAAgAAAAMAAAADAAAABAAAAAYAAAAHAAAACAAAAAkAAAAKAAAACwAAAAwAAAANAAAADgAAAA8AAAAQAAAAAQABAQYAAAAAAAAEAAAAABAAAAQAAAAAIAAABQEAAAAAAAAFAwAAAAAAAAUEAAAAAAAABQYAAAAAAAAFBwAAAAAAAAUJAAAAAAAABQoAAAAAAAAFDAAAAAAAAAYOAAAAAAABBRAAAAAAAAEFFAAAAAAAAQUWAAAAAAACBRwAAAAAAAMFIAAAAAAABAUwAAAAIAAGBUAAAAAAAAcFgAAAAAAACAYAAQAAAAAKBgAEAAAAAAwGABAAACAAAAQAAAAAAAAABAEAAAAAAAAFAgAAACAAAAUEAAAAAAAABQUAAAAgAAAFBwAAAAAAAAUIAAAAIAAABQoAAAAAAAAFCwAAAAAAAAYNAAAAIAABBRAAAAAAAAEFEgAAACAAAQUWAAAAAAACBRgAAAAgAAMFIAAAAAAAAwUoAAAAAAAGBEAAAAAQAAYEQAAAACAABwWAAAAAAAAJBgACAAAAAAsGAAgAADAAAAQAAAAAEAAABAEAAAAgAAAFAgAAACAAAAUDAAAAIAAABQUAAAAgAAAFBgAAACAAAAUIAAAAIAAABQkAAAAgAAAFCwAAACAAAAUMAAAAAAAABg8AAAAgAAEFEgAAACAAAQUUAAAAIAACBRgAAAAgAAIFHAAAACAAAwUoAAAAIAAEBTAAAAAAABAGAAABAAAADwYAgAAAAAAOBgBAAAAAAA0GACAAAAAAAAAAAAAAAAAAAAEAAAABAAAABQAAAA0AAAAdAAAAPQAAAH0AAAD9AAAA/QEAAP0DAAD9BwAA/Q8AAP0fAAD9PwAA/X8AAP3/AAD9/wEA/f8DAP3/BwD9/w8A/f8fAP3/PwD9/38A/f//AP3//wH9//8D/f//B/3//w/9//8f/f//P/3//38AAAAAAQAAAAIAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAABEAAAASAAAAEwAAABQAAAAVAAAAFgAAABcAAAAYAAAAGQAAABoAAAAbAAAAHAAAAB0AAAAeAAAAHwAAAAEAAQEFAAAAAAAABQAAAAAAAAYEPQAAAAAACQX9AQAAAAAPBf1/AAAAABUF/f8fAAAAAwUFAAAAAAAHBH0AAAAAAAwF/Q8AAAAAEgX9/wMAAAAXBf3/fwAAAAUFHQAAAAAACAT9AAAAAAAOBf0/AAAAABQF/f8PAAAAAgUBAAAAEAAHBH0AAAAAAAsF/QcAAAAAEQX9/wEAAAAWBf3/PwAAAAQFDQAAABAACAT9AAAAAAANBf0fAAAAABMF/f8HAAAAAQUBAAAAEAAGBD0AAAAAAAoF/QMAAAAAEAX9/wAAAAAcBf3//w8AABsF/f//BwAAGgX9//8DAAAZBf3//wEAABgF/f//AAAAAAAAAAAAAwAAAAQAAAAFAAAABgAAAAcAAAAIAAAACQAAAAoAAAALAAAADAAAAA0AAAAOAAAADwAAABAAAAARAAAAEgAAABMAAAAUAAAAFQAAABYAAAAXAAAAGAAAABkAAAAaAAAAGwAAABwAAAAdAAAAHgAAAB8AAAAgAAAAIQAAACIAAAAjAAAAJQAAACcAAAApAAAAKwAAAC8AAAAzAAAAOwAAAEMAAABTAAAAYwAAAIMAAAADAQAAAwIAAAMEAAADCAAAAxAAAAMgAAADQAAAA4AAAAMAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAEAAAACAAAAAgAAAAMAAAADAAAABAAAAAQAAAAFAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAAAAAAAAAAAAAAAAAAAEAAQEGAAAAAAAABgMAAAAAAAAEBAAAACAAAAUFAAAAAAAABQYAAAAAAAAFCAAAAAAAAAUJAAAAAAAABQsAAAAAAAAGDQAAAAAAAAYQAAAAAAAABhMAAAAAAAAGFgAAAAAAAAYZAAAAAAAABhwAAAAAAAAGHwAAAAAAAAYiAAAAAAABBiUAAAAAAAEGKQAAAAAAAgYvAAAAAAADBjsAAAAAAAQGUwAAAAAABwaDAAAAAAAJBgMCAAAQAAAEBAAAAAAAAAQFAAAAIAAABQYAAAAAAAAFBwAAACAAAAUJAAAAAAAABQoAAAAAAAAGDAAAAAAAAAYPAAAAAAAABhIAAAAAAAAGFQAAAAAAAAYYAAAAAAAABhsAAAAAAAAGHgAAAAAAAAYhAAAAAAABBiMAAAAAAAEGJwAAAAAAAgYrAAAAAAADBjMAAAAAAAQGQwAAAAAABQZjAAAAAAAIBgMBAAAgAAAEBAAAADAAAAQEAAAAEAAABAUAAAAgAAAFBwAAACAAAAUIAAAAIAAABQoAAAAgAAAFCwAAAAAAAAYOAAAAAAAABhEAAAAAAAAGFAAAAAAAAAYXAAAAAAAABhoAAAAAAAAGHQAAAAAAAAYgAAAAAAAQBgMAAQAAAA8GA4AAAAAADgYDQAAAAAANBgMgAAAAAAwGAxAAAAAACwYDCAAAAAAKBgMEAAAAAAAAAAAAAAgAAAAIAAAACAAAAAcAAAAIAAAACQAAAAoAAAALAAAAAAAAAAEAAAACAAAAAQAAAAQAAAAEAAAABAAAAAQAAAAAAAAAAQAAAAMAAAAHAAAADwAAAB8AAAA/AAAAfwAAAP8AAAD/AQAA/wMAAP8HAAD/DwAA/x8AAP8/AAD/fwAA//8AAP//AQD//wMA//8HAP//DwD//x8A//8/AP//fwD///8A////Af///wP///8H////D////x////8/////fxEACgAREREAAAAABQAAAAAAAAkAAAAACwAAAAAAAAAAEQAPChEREQMKBwABEwkLCwAACQYLAAALAAYRAAAAERERAAAAAAAAAAAAAAAAAAAAAAsAAAAAAAAAABEACgoREREACgAAAgAJCwAAAAkACwAACwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAAAAwAAAAACQwAAAAAAAwAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAADQAAAAQNAAAAAAkOAAAAAAAOAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAA8AAAAADwAAAAAJEAAAAAAAEAAAEAAAEgAAABISEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASAAAAEhISAAAAAAAACQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAAAAAAAAAACgAAAAAKAAAAAAkLAAAAAAALAAALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAADAAAAAAJDAAAAAAADAAADAAAMDEyMzQ1Njc4OUFCQ0RFRgUAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAmBoAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAP//////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAACAAAAOBQAAAAEAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAr/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAEAAAACAAAAEARAADQEQAA0BEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeBgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABJbnN1ZmZpY2llbnQgYXJndW1lbnRzIQoAVXNhZ2U6IFpzdGREZWNvbXByZXNzIGlucHV0LmJpbiBvdXRwdXQuYmluIG91dHB1dEZpbGVTaXplAHJiAFVuYWJsZSB0byBvcGVuIGZpbGUgJXMATWVtb3J5IGVycm9yIQByZXN1bHQ6ICVkAHdiAC0rICAgMFgweAAobnVsbCkALTBYKzBYIDBYLTB4KzB4IDB4AGluZgBJTkYAbmFuAE5BTgAuAHJ3YQ=='
var tempDoublePtr = 7008
function demangle(func) {
  return func
}
function demangleAll(text) {
  var regex = /\b__Z[\w\d_]+/g
  return text.replace(regex, function(x) {
    var y = demangle(x)
    return x === y ? x : y + ' [' + x + ']'
  })
}
function jsStackTrace() {
  var err = new Error()
  if (!err.stack) {
    try {
      throw new Error()
    } catch (e) {
      err = e
    }
    if (!err.stack) {
      return '(no stack trace available)'
    }
  }
  return err.stack.toString()
}
function stackTrace() {
  var js = jsStackTrace()
  if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']()
  return demangleAll(js)
}
function ___setErrNo(value) {
  if (Module['___errno_location'])
    HEAP32[Module['___errno_location']() >> 2] = value
  return value
}
var PATH = {
  splitPath: function(filename) {
    var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/
    return splitPathRe.exec(filename).slice(1)
  },
  normalizeArray: function(parts, allowAboveRoot) {
    var up = 0
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i]
      if (last === '.') {
        parts.splice(i, 1)
      } else if (last === '..') {
        parts.splice(i, 1)
        up++
      } else if (up) {
        parts.splice(i, 1)
        up--
      }
    }
    if (allowAboveRoot) {
      for (; up; up--) {
        parts.unshift('..')
      }
    }
    return parts
  },
  normalize: function(path) {
    var isAbsolute = path.charAt(0) === '/',
      trailingSlash = path.substr(-1) === '/'
    path = PATH.normalizeArray(
      path.split('/').filter(function(p) {
        return !!p
      }),
      !isAbsolute
    ).join('/')
    if (!path && !isAbsolute) {
      path = '.'
    }
    if (path && trailingSlash) {
      path += '/'
    }
    return (isAbsolute ? '/' : '') + path
  },
  dirname: function(path) {
    var result = PATH.splitPath(path),
      root = result[0],
      dir = result[1]
    if (!root && !dir) {
      return '.'
    }
    if (dir) {
      dir = dir.substr(0, dir.length - 1)
    }
    return root + dir
  },
  basename: function(path) {
    if (path === '/') return '/'
    var lastSlash = path.lastIndexOf('/')
    if (lastSlash === -1) return path
    return path.substr(lastSlash + 1)
  },
  extname: function(path) {
    return PATH.splitPath(path)[3]
  },
  join: function() {
    var paths = Array.prototype.slice.call(arguments, 0)
    return PATH.normalize(paths.join('/'))
  },
  join2: function(l, r) {
    return PATH.normalize(l + '/' + r)
  },
}
var PATH_FS = {
  resolve: function() {
    var resolvedPath = '',
      resolvedAbsolute = false
    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = i >= 0 ? arguments[i] : FS.cwd()
      if (typeof path !== 'string') {
        throw new TypeError('Arguments to path.resolve must be strings')
      } else if (!path) {
        return ''
      }
      resolvedPath = path + '/' + resolvedPath
      resolvedAbsolute = path.charAt(0) === '/'
    }
    resolvedPath = PATH.normalizeArray(
      resolvedPath.split('/').filter(function(p) {
        return !!p
      }),
      !resolvedAbsolute
    ).join('/')
    return (resolvedAbsolute ? '/' : '') + resolvedPath || '.'
  },
  relative: function(from, to) {
    from = PATH_FS.resolve(from).substr(1)
    to = PATH_FS.resolve(to).substr(1)
    function trim(arr) {
      var start = 0
      for (; start < arr.length; start++) {
        if (arr[start] !== '') break
      }
      var end = arr.length - 1
      for (; end >= 0; end--) {
        if (arr[end] !== '') break
      }
      if (start > end) return []
      return arr.slice(start, end - start + 1)
    }
    var fromParts = trim(from.split('/'))
    var toParts = trim(to.split('/'))
    var length = Math.min(fromParts.length, toParts.length)
    var samePartsLength = length
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i
        break
      }
    }
    var outputParts = []
    for (var i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push('..')
    }
    outputParts = outputParts.concat(toParts.slice(samePartsLength))
    return outputParts.join('/')
  },
}
var TTY = {
  ttys: [],
  init: function() {},
  shutdown: function() {},
  register: function(dev, ops) {
    TTY.ttys[dev] = { input: [], output: [], ops: ops }
    FS.registerDevice(dev, TTY.stream_ops)
  },
  stream_ops: {
    open: function(stream) {
      var tty = TTY.ttys[stream.node.rdev]
      if (!tty) {
        throw new FS.ErrnoError(43)
      }
      stream.tty = tty
      stream.seekable = false
    },
    close: function(stream) {
      stream.tty.ops.flush(stream.tty)
    },
    flush: function(stream) {
      stream.tty.ops.flush(stream.tty)
    },
    read: function(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.get_char) {
        throw new FS.ErrnoError(60)
      }
      var bytesRead = 0
      for (var i = 0; i < length; i++) {
        var result
        try {
          result = stream.tty.ops.get_char(stream.tty)
        } catch (e) {
          throw new FS.ErrnoError(29)
        }
        if (result === undefined && bytesRead === 0) {
          throw new FS.ErrnoError(6)
        }
        if (result === null || result === undefined) break
        bytesRead++
        buffer[offset + i] = result
      }
      if (bytesRead) {
        stream.node.timestamp = Date.now()
      }
      return bytesRead
    },
    write: function(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.put_char) {
        throw new FS.ErrnoError(60)
      }
      try {
        for (var i = 0; i < length; i++) {
          stream.tty.ops.put_char(stream.tty, buffer[offset + i])
        }
      } catch (e) {
        throw new FS.ErrnoError(29)
      }
      if (length) {
        stream.node.timestamp = Date.now()
      }
      return i
    },
  },
  default_tty_ops: {
    get_char: function(tty) {
      if (!tty.input.length) {
        var result = null
        if (ENVIRONMENT_IS_NODE) {
          var BUFSIZE = 256
          var buf = Buffer.alloc ? Buffer.alloc(BUFSIZE) : new Buffer(BUFSIZE)
          var bytesRead = 0
          try {
            bytesRead = nodeFS.readSync(process.stdin.fd, buf, 0, BUFSIZE, null)
          } catch (e) {
            if (e.toString().indexOf('EOF') != -1) bytesRead = 0
            else throw e
          }
          if (bytesRead > 0) {
            result = buf.slice(0, bytesRead).toString('utf-8')
          } else {
            result = null
          }
        } else if (
          typeof window != 'undefined' &&
          typeof window.prompt == 'function'
        ) {
          result = window.prompt('Input: ')
          if (result !== null) {
            result += '\n'
          }
        } else if (typeof readline == 'function') {
          result = readline()
          if (result !== null) {
            result += '\n'
          }
        }
        if (!result) {
          return null
        }
        tty.input = intArrayFromString(result, true)
      }
      return tty.input.shift()
    },
    put_char: function(tty, val) {
      if (val === null || val === 10) {
        out(UTF8ArrayToString(tty.output, 0))
        tty.output = []
      } else {
        if (val != 0) tty.output.push(val)
      }
    },
    flush: function(tty) {
      if (tty.output && tty.output.length > 0) {
        out(UTF8ArrayToString(tty.output, 0))
        tty.output = []
      }
    },
  },
  default_tty1_ops: {
    put_char: function(tty, val) {
      if (val === null || val === 10) {
        err(UTF8ArrayToString(tty.output, 0))
        tty.output = []
      } else {
        if (val != 0) tty.output.push(val)
      }
    },
    flush: function(tty) {
      if (tty.output && tty.output.length > 0) {
        err(UTF8ArrayToString(tty.output, 0))
        tty.output = []
      }
    },
  },
}
var MEMFS = {
  ops_table: null,
  mount: function(mount) {
    return MEMFS.createNode(null, '/', 16384 | 511, 0)
  },
  createNode: function(parent, name, mode, dev) {
    if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
      throw new FS.ErrnoError(63)
    }
    if (!MEMFS.ops_table) {
      MEMFS.ops_table = {
        dir: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            lookup: MEMFS.node_ops.lookup,
            mknod: MEMFS.node_ops.mknod,
            rename: MEMFS.node_ops.rename,
            unlink: MEMFS.node_ops.unlink,
            rmdir: MEMFS.node_ops.rmdir,
            readdir: MEMFS.node_ops.readdir,
            symlink: MEMFS.node_ops.symlink,
          },
          stream: { llseek: MEMFS.stream_ops.llseek },
        },
        file: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
          },
          stream: {
            llseek: MEMFS.stream_ops.llseek,
            read: MEMFS.stream_ops.read,
            write: MEMFS.stream_ops.write,
            allocate: MEMFS.stream_ops.allocate,
            mmap: MEMFS.stream_ops.mmap,
            msync: MEMFS.stream_ops.msync,
          },
        },
        link: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            readlink: MEMFS.node_ops.readlink,
          },
          stream: {},
        },
        chrdev: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
          },
          stream: FS.chrdev_stream_ops,
        },
      }
    }
    var node = FS.createNode(parent, name, mode, dev)
    if (FS.isDir(node.mode)) {
      node.node_ops = MEMFS.ops_table.dir.node
      node.stream_ops = MEMFS.ops_table.dir.stream
      node.contents = {}
    } else if (FS.isFile(node.mode)) {
      node.node_ops = MEMFS.ops_table.file.node
      node.stream_ops = MEMFS.ops_table.file.stream
      node.usedBytes = 0
      node.contents = null
    } else if (FS.isLink(node.mode)) {
      node.node_ops = MEMFS.ops_table.link.node
      node.stream_ops = MEMFS.ops_table.link.stream
    } else if (FS.isChrdev(node.mode)) {
      node.node_ops = MEMFS.ops_table.chrdev.node
      node.stream_ops = MEMFS.ops_table.chrdev.stream
    }
    node.timestamp = Date.now()
    if (parent) {
      parent.contents[name] = node
    }
    return node
  },
  getFileDataAsRegularArray: function(node) {
    if (node.contents && node.contents.subarray) {
      var arr = []
      for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i])
      return arr
    }
    return node.contents
  },
  getFileDataAsTypedArray: function(node) {
    if (!node.contents) return new Uint8Array(0)
    if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes)
    return new Uint8Array(node.contents)
  },
  expandFileStorage: function(node, newCapacity) {
    var prevCapacity = node.contents ? node.contents.length : 0
    if (prevCapacity >= newCapacity) return
    var CAPACITY_DOUBLING_MAX = 1024 * 1024
    newCapacity = Math.max(
      newCapacity,
      (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125)) | 0
    )
    if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256)
    var oldContents = node.contents
    node.contents = new Uint8Array(newCapacity)
    if (node.usedBytes > 0)
      node.contents.set(oldContents.subarray(0, node.usedBytes), 0)
    return
  },
  resizeFileStorage: function(node, newSize) {
    if (node.usedBytes == newSize) return
    if (newSize == 0) {
      node.contents = null
      node.usedBytes = 0
      return
    }
    if (!node.contents || node.contents.subarray) {
      var oldContents = node.contents
      node.contents = new Uint8Array(newSize)
      if (oldContents) {
        node.contents.set(
          oldContents.subarray(0, Math.min(newSize, node.usedBytes))
        )
      }
      node.usedBytes = newSize
      return
    }
    if (!node.contents) node.contents = []
    if (node.contents.length > newSize) node.contents.length = newSize
    else while (node.contents.length < newSize) node.contents.push(0)
    node.usedBytes = newSize
  },
  node_ops: {
    getattr: function(node) {
      var attr = {}
      attr.dev = FS.isChrdev(node.mode) ? node.id : 1
      attr.ino = node.id
      attr.mode = node.mode
      attr.nlink = 1
      attr.uid = 0
      attr.gid = 0
      attr.rdev = node.rdev
      if (FS.isDir(node.mode)) {
        attr.size = 4096
      } else if (FS.isFile(node.mode)) {
        attr.size = node.usedBytes
      } else if (FS.isLink(node.mode)) {
        attr.size = node.link.length
      } else {
        attr.size = 0
      }
      attr.atime = new Date(node.timestamp)
      attr.mtime = new Date(node.timestamp)
      attr.ctime = new Date(node.timestamp)
      attr.blksize = 4096
      attr.blocks = Math.ceil(attr.size / attr.blksize)
      return attr
    },
    setattr: function(node, attr) {
      if (attr.mode !== undefined) {
        node.mode = attr.mode
      }
      if (attr.timestamp !== undefined) {
        node.timestamp = attr.timestamp
      }
      if (attr.size !== undefined) {
        MEMFS.resizeFileStorage(node, attr.size)
      }
    },
    lookup: function(parent, name) {
      throw FS.genericErrors[44]
    },
    mknod: function(parent, name, mode, dev) {
      return MEMFS.createNode(parent, name, mode, dev)
    },
    rename: function(old_node, new_dir, new_name) {
      if (FS.isDir(old_node.mode)) {
        var new_node
        try {
          new_node = FS.lookupNode(new_dir, new_name)
        } catch (e) {}
        if (new_node) {
          for (var i in new_node.contents) {
            throw new FS.ErrnoError(55)
          }
        }
      }
      delete old_node.parent.contents[old_node.name]
      old_node.name = new_name
      new_dir.contents[new_name] = old_node
      old_node.parent = new_dir
    },
    unlink: function(parent, name) {
      delete parent.contents[name]
    },
    rmdir: function(parent, name) {
      var node = FS.lookupNode(parent, name)
      for (var i in node.contents) {
        throw new FS.ErrnoError(55)
      }
      delete parent.contents[name]
    },
    readdir: function(node) {
      var entries = ['.', '..']
      for (var key in node.contents) {
        if (!node.contents.hasOwnProperty(key)) {
          continue
        }
        entries.push(key)
      }
      return entries
    },
    symlink: function(parent, newname, oldpath) {
      var node = MEMFS.createNode(parent, newname, 511 | 40960, 0)
      node.link = oldpath
      return node
    },
    readlink: function(node) {
      if (!FS.isLink(node.mode)) {
        throw new FS.ErrnoError(28)
      }
      return node.link
    },
  },
  stream_ops: {
    read: function(stream, buffer, offset, length, position) {
      var contents = stream.node.contents
      if (position >= stream.node.usedBytes) return 0
      var size = Math.min(stream.node.usedBytes - position, length)
      if (size > 8 && contents.subarray) {
        buffer.set(contents.subarray(position, position + size), offset)
      } else {
        for (var i = 0; i < size; i++)
          buffer[offset + i] = contents[position + i]
      }
      return size
    },
    write: function(stream, buffer, offset, length, position, canOwn) {
      if (buffer.buffer === HEAP8.buffer) {
        canOwn = false
      }
      if (!length) return 0
      var node = stream.node
      node.timestamp = Date.now()
      if (buffer.subarray && (!node.contents || node.contents.subarray)) {
        if (canOwn) {
          node.contents = buffer.subarray(offset, offset + length)
          node.usedBytes = length
          return length
        } else if (node.usedBytes === 0 && position === 0) {
          node.contents = buffer.slice(offset, offset + length)
          node.usedBytes = length
          return length
        } else if (position + length <= node.usedBytes) {
          node.contents.set(buffer.subarray(offset, offset + length), position)
          return length
        }
      }
      MEMFS.expandFileStorage(node, position + length)
      if (node.contents.subarray && buffer.subarray)
        node.contents.set(buffer.subarray(offset, offset + length), position)
      else {
        for (var i = 0; i < length; i++) {
          node.contents[position + i] = buffer[offset + i]
        }
      }
      node.usedBytes = Math.max(node.usedBytes, position + length)
      return length
    },
    llseek: function(stream, offset, whence) {
      var position = offset
      if (whence === 1) {
        position += stream.position
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          position += stream.node.usedBytes
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(28)
      }
      return position
    },
    allocate: function(stream, offset, length) {
      MEMFS.expandFileStorage(stream.node, offset + length)
      stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
    },
    mmap: function(stream, buffer, offset, length, position, prot, flags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43)
      }
      var ptr
      var allocated
      var contents = stream.node.contents
      if (!(flags & 2) && contents.buffer === buffer.buffer) {
        allocated = false
        ptr = contents.byteOffset
      } else {
        if (position > 0 || position + length < contents.length) {
          if (contents.subarray) {
            contents = contents.subarray(position, position + length)
          } else {
            contents = Array.prototype.slice.call(
              contents,
              position,
              position + length
            )
          }
        }
        allocated = true
        var fromHeap = buffer.buffer == HEAP8.buffer
        ptr = _malloc(length)
        if (!ptr) {
          throw new FS.ErrnoError(48)
        }
        ;(fromHeap ? HEAP8 : buffer).set(contents, ptr)
      }
      return { ptr: ptr, allocated: allocated }
    },
    msync: function(stream, buffer, offset, length, mmapFlags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43)
      }
      if (mmapFlags & 2) {
        return 0
      }
      var bytesWritten = MEMFS.stream_ops.write(
        stream,
        buffer,
        0,
        length,
        offset,
        false
      )
      return 0
    },
  },
}
var ERRNO_CODES = {
  EPERM: 63,
  ENOENT: 44,
  ESRCH: 71,
  EINTR: 27,
  EIO: 29,
  ENXIO: 60,
  E2BIG: 1,
  ENOEXEC: 45,
  EBADF: 8,
  ECHILD: 12,
  EAGAIN: 6,
  EWOULDBLOCK: 6,
  ENOMEM: 48,
  EACCES: 2,
  EFAULT: 21,
  ENOTBLK: 105,
  EBUSY: 10,
  EEXIST: 20,
  EXDEV: 75,
  ENODEV: 43,
  ENOTDIR: 54,
  EISDIR: 31,
  EINVAL: 28,
  ENFILE: 41,
  EMFILE: 33,
  ENOTTY: 59,
  ETXTBSY: 74,
  EFBIG: 22,
  ENOSPC: 51,
  ESPIPE: 70,
  EROFS: 69,
  EMLINK: 34,
  EPIPE: 64,
  EDOM: 18,
  ERANGE: 68,
  ENOMSG: 49,
  EIDRM: 24,
  ECHRNG: 106,
  EL2NSYNC: 156,
  EL3HLT: 107,
  EL3RST: 108,
  ELNRNG: 109,
  EUNATCH: 110,
  ENOCSI: 111,
  EL2HLT: 112,
  EDEADLK: 16,
  ENOLCK: 46,
  EBADE: 113,
  EBADR: 114,
  EXFULL: 115,
  ENOANO: 104,
  EBADRQC: 103,
  EBADSLT: 102,
  EDEADLOCK: 16,
  EBFONT: 101,
  ENOSTR: 100,
  ENODATA: 116,
  ETIME: 117,
  ENOSR: 118,
  ENONET: 119,
  ENOPKG: 120,
  EREMOTE: 121,
  ENOLINK: 47,
  EADV: 122,
  ESRMNT: 123,
  ECOMM: 124,
  EPROTO: 65,
  EMULTIHOP: 36,
  EDOTDOT: 125,
  EBADMSG: 9,
  ENOTUNIQ: 126,
  EBADFD: 127,
  EREMCHG: 128,
  ELIBACC: 129,
  ELIBBAD: 130,
  ELIBSCN: 131,
  ELIBMAX: 132,
  ELIBEXEC: 133,
  ENOSYS: 52,
  ENOTEMPTY: 55,
  ENAMETOOLONG: 37,
  ELOOP: 32,
  EOPNOTSUPP: 138,
  EPFNOSUPPORT: 139,
  ECONNRESET: 15,
  ENOBUFS: 42,
  EAFNOSUPPORT: 5,
  EPROTOTYPE: 67,
  ENOTSOCK: 57,
  ENOPROTOOPT: 50,
  ESHUTDOWN: 140,
  ECONNREFUSED: 14,
  EADDRINUSE: 3,
  ECONNABORTED: 13,
  ENETUNREACH: 40,
  ENETDOWN: 38,
  ETIMEDOUT: 73,
  EHOSTDOWN: 142,
  EHOSTUNREACH: 23,
  EINPROGRESS: 26,
  EALREADY: 7,
  EDESTADDRREQ: 17,
  EMSGSIZE: 35,
  EPROTONOSUPPORT: 66,
  ESOCKTNOSUPPORT: 137,
  EADDRNOTAVAIL: 4,
  ENETRESET: 39,
  EISCONN: 30,
  ENOTCONN: 53,
  ETOOMANYREFS: 141,
  EUSERS: 136,
  EDQUOT: 19,
  ESTALE: 72,
  ENOTSUP: 138,
  ENOMEDIUM: 148,
  EILSEQ: 25,
  EOVERFLOW: 61,
  ECANCELED: 11,
  ENOTRECOVERABLE: 56,
  EOWNERDEAD: 62,
  ESTRPIPE: 135,
}
var NODEFS = {
  isWindows: false,
  staticInit: function() {
    NODEFS.isWindows = !!process.platform.match(/^win/)
    var flags = process['binding']('constants')
    if (flags['fs']) {
      flags = flags['fs']
    }
    NODEFS.flagsForNodeMap = {
      1024: flags['O_APPEND'],
      64: flags['O_CREAT'],
      128: flags['O_EXCL'],
      0: flags['O_RDONLY'],
      2: flags['O_RDWR'],
      4096: flags['O_SYNC'],
      512: flags['O_TRUNC'],
      1: flags['O_WRONLY'],
    }
  },
  bufferFrom: function(arrayBuffer) {
    return Buffer['alloc'] ? Buffer.from(arrayBuffer) : new Buffer(arrayBuffer)
  },
  convertNodeCode: function(e) {
    var code = e.code
    return ERRNO_CODES[code]
  },
  mount: function(mount) {
    return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0)
  },
  createNode: function(parent, name, mode, dev) {
    if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
      throw new FS.ErrnoError(28)
    }
    var node = FS.createNode(parent, name, mode)
    node.node_ops = NODEFS.node_ops
    node.stream_ops = NODEFS.stream_ops
    return node
  },
  getMode: function(path) {
    var stat
    try {
      stat = fs.lstatSync(path)
      if (NODEFS.isWindows) {
        stat.mode = stat.mode | ((stat.mode & 292) >> 2)
      }
    } catch (e) {
      if (!e.code) throw e
      throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
    }
    return stat.mode
  },
  realPath: function(node) {
    var parts = []
    while (node.parent !== node) {
      parts.push(node.name)
      node = node.parent
    }
    parts.push(node.mount.opts.root)
    parts.reverse()
    return PATH.join.apply(null, parts)
  },
  flagsForNode: function(flags) {
    flags &= ~2097152
    flags &= ~2048
    flags &= ~32768
    flags &= ~524288
    var newFlags = 0
    for (var k in NODEFS.flagsForNodeMap) {
      if (flags & k) {
        newFlags |= NODEFS.flagsForNodeMap[k]
        flags ^= k
      }
    }
    if (!flags) {
      return newFlags
    } else {
      throw new FS.ErrnoError(28)
    }
  },
  node_ops: {
    getattr: function(node) {
      var path = NODEFS.realPath(node)
      var stat
      try {
        stat = fs.lstatSync(path)
      } catch (e) {
        if (!e.code) throw e
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
      }
      if (NODEFS.isWindows && !stat.blksize) {
        stat.blksize = 4096
      }
      if (NODEFS.isWindows && !stat.blocks) {
        stat.blocks = ((stat.size + stat.blksize - 1) / stat.blksize) | 0
      }
      return {
        dev: stat.dev,
        ino: stat.ino,
        mode: stat.mode,
        nlink: stat.nlink,
        uid: stat.uid,
        gid: stat.gid,
        rdev: stat.rdev,
        size: stat.size,
        atime: stat.atime,
        mtime: stat.mtime,
        ctime: stat.ctime,
        blksize: stat.blksize,
        blocks: stat.blocks,
      }
    },
    setattr: function(node, attr) {
      var path = NODEFS.realPath(node)
      try {
        if (attr.mode !== undefined) {
          fs.chmodSync(path, attr.mode)
          node.mode = attr.mode
        }
        if (attr.timestamp !== undefined) {
          var date = new Date(attr.timestamp)
          fs.utimesSync(path, date, date)
        }
        if (attr.size !== undefined) {
          fs.truncateSync(path, attr.size)
        }
      } catch (e) {
        if (!e.code) throw e
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
      }
    },
    lookup: function(parent, name) {
      var path = PATH.join2(NODEFS.realPath(parent), name)
      var mode = NODEFS.getMode(path)
      return NODEFS.createNode(parent, name, mode)
    },
    mknod: function(parent, name, mode, dev) {
      var node = NODEFS.createNode(parent, name, mode, dev)
      var path = NODEFS.realPath(node)
      try {
        if (FS.isDir(node.mode)) {
          fs.mkdirSync(path, node.mode)
        } else {
          fs.writeFileSync(path, '', { mode: node.mode })
        }
      } catch (e) {
        if (!e.code) throw e
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
      }
      return node
    },
    rename: function(oldNode, newDir, newName) {
      var oldPath = NODEFS.realPath(oldNode)
      var newPath = PATH.join2(NODEFS.realPath(newDir), newName)
      try {
        fs.renameSync(oldPath, newPath)
      } catch (e) {
        if (!e.code) throw e
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
      }
      oldNode.name = newName
    },
    unlink: function(parent, name) {
      var path = PATH.join2(NODEFS.realPath(parent), name)
      try {
        fs.unlinkSync(path)
      } catch (e) {
        if (!e.code) throw e
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
      }
    },
    rmdir: function(parent, name) {
      var path = PATH.join2(NODEFS.realPath(parent), name)
      try {
        fs.rmdirSync(path)
      } catch (e) {
        if (!e.code) throw e
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
      }
    },
    readdir: function(node) {
      var path = NODEFS.realPath(node)
      try {
        return fs.readdirSync(path)
      } catch (e) {
        if (!e.code) throw e
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
      }
    },
    symlink: function(parent, newName, oldPath) {
      var newPath = PATH.join2(NODEFS.realPath(parent), newName)
      try {
        fs.symlinkSync(oldPath, newPath)
      } catch (e) {
        if (!e.code) throw e
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
      }
    },
    readlink: function(node) {
      var path = NODEFS.realPath(node)
      try {
        path = fs.readlinkSync(path)
        path = NODEJS_PATH.relative(
          NODEJS_PATH.resolve(node.mount.opts.root),
          path
        )
        return path
      } catch (e) {
        if (!e.code) throw e
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
      }
    },
  },
  stream_ops: {
    open: function(stream) {
      var path = NODEFS.realPath(stream.node)
      try {
        if (FS.isFile(stream.node.mode)) {
          stream.nfd = fs.openSync(path, NODEFS.flagsForNode(stream.flags))
        }
      } catch (e) {
        if (!e.code) throw e
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
      }
    },
    close: function(stream) {
      try {
        if (FS.isFile(stream.node.mode) && stream.nfd) {
          fs.closeSync(stream.nfd)
        }
      } catch (e) {
        if (!e.code) throw e
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
      }
    },
    read: function(stream, buffer, offset, length, position) {
      if (length === 0) return 0
      try {
        return fs.readSync(
          stream.nfd,
          NODEFS.bufferFrom(buffer.buffer),
          offset,
          length,
          position
        )
      } catch (e) {
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
      }
    },
    write: function(stream, buffer, offset, length, position) {
      try {
        return fs.writeSync(
          stream.nfd,
          NODEFS.bufferFrom(buffer.buffer),
          offset,
          length,
          position
        )
      } catch (e) {
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
      }
    },
    llseek: function(stream, offset, whence) {
      var position = offset
      if (whence === 1) {
        position += stream.position
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          try {
            var stat = fs.fstatSync(stream.nfd)
            position += stat.size
          } catch (e) {
            throw new FS.ErrnoError(NODEFS.convertNodeCode(e))
          }
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(28)
      }
      return position
    },
  },
}
var FS = {
  root: null,
  mounts: [],
  devices: {},
  streams: [],
  nextInode: 1,
  nameTable: null,
  currentPath: '/',
  initialized: false,
  ignorePermissions: true,
  trackingDelegate: {},
  tracking: { openFlags: { READ: 1, WRITE: 2 } },
  ErrnoError: null,
  genericErrors: {},
  filesystems: null,
  syncFSRequests: 0,
  handleFSError: function(e) {
    if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace()
    return ___setErrNo(e.errno)
  },
  lookupPath: function(path, opts) {
    path = PATH_FS.resolve(FS.cwd(), path)
    opts = opts || {}
    if (!path) return { path: '', node: null }
    var defaults = { follow_mount: true, recurse_count: 0 }
    for (var key in defaults) {
      if (opts[key] === undefined) {
        opts[key] = defaults[key]
      }
    }
    if (opts.recurse_count > 8) {
      throw new FS.ErrnoError(32)
    }
    var parts = PATH.normalizeArray(
      path.split('/').filter(function(p) {
        return !!p
      }),
      false
    )
    var current = FS.root
    var current_path = '/'
    for (var i = 0; i < parts.length; i++) {
      var islast = i === parts.length - 1
      if (islast && opts.parent) {
        break
      }
      current = FS.lookupNode(current, parts[i])
      current_path = PATH.join2(current_path, parts[i])
      if (FS.isMountpoint(current)) {
        if (!islast || (islast && opts.follow_mount)) {
          current = current.mounted.root
        }
      }
      if (!islast || opts.follow) {
        var count = 0
        while (FS.isLink(current.mode)) {
          var link = FS.readlink(current_path)
          current_path = PATH_FS.resolve(PATH.dirname(current_path), link)
          var lookup = FS.lookupPath(current_path, {
            recurse_count: opts.recurse_count,
          })
          current = lookup.node
          if (count++ > 40) {
            throw new FS.ErrnoError(32)
          }
        }
      }
    }
    return { path: current_path, node: current }
  },
  getPath: function(node) {
    var path
    while (true) {
      if (FS.isRoot(node)) {
        var mount = node.mount.mountpoint
        if (!path) return mount
        return mount[mount.length - 1] !== '/'
          ? mount + '/' + path
          : mount + path
      }
      path = path ? node.name + '/' + path : node.name
      node = node.parent
    }
  },
  hashName: function(parentid, name) {
    var hash = 0
    for (var i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
    }
    return ((parentid + hash) >>> 0) % FS.nameTable.length
  },
  hashAddNode: function(node) {
    var hash = FS.hashName(node.parent.id, node.name)
    node.name_next = FS.nameTable[hash]
    FS.nameTable[hash] = node
  },
  hashRemoveNode: function(node) {
    var hash = FS.hashName(node.parent.id, node.name)
    if (FS.nameTable[hash] === node) {
      FS.nameTable[hash] = node.name_next
    } else {
      var current = FS.nameTable[hash]
      while (current) {
        if (current.name_next === node) {
          current.name_next = node.name_next
          break
        }
        current = current.name_next
      }
    }
  },
  lookupNode: function(parent, name) {
    var errCode = FS.mayLookup(parent)
    if (errCode) {
      throw new FS.ErrnoError(errCode, parent)
    }
    var hash = FS.hashName(parent.id, name)
    for (var node = FS.nameTable[hash]; node; node = node.name_next) {
      var nodeName = node.name
      if (node.parent.id === parent.id && nodeName === name) {
        return node
      }
    }
    return FS.lookup(parent, name)
  },
  createNode: function(parent, name, mode, rdev) {
    var node = new FS.FSNode(parent, name, mode, rdev)
    FS.hashAddNode(node)
    return node
  },
  destroyNode: function(node) {
    FS.hashRemoveNode(node)
  },
  isRoot: function(node) {
    return node === node.parent
  },
  isMountpoint: function(node) {
    return !!node.mounted
  },
  isFile: function(mode) {
    return (mode & 61440) === 32768
  },
  isDir: function(mode) {
    return (mode & 61440) === 16384
  },
  isLink: function(mode) {
    return (mode & 61440) === 40960
  },
  isChrdev: function(mode) {
    return (mode & 61440) === 8192
  },
  isBlkdev: function(mode) {
    return (mode & 61440) === 24576
  },
  isFIFO: function(mode) {
    return (mode & 61440) === 4096
  },
  isSocket: function(mode) {
    return (mode & 49152) === 49152
  },
  flagModes: {
    r: 0,
    rs: 1052672,
    'r+': 2,
    w: 577,
    wx: 705,
    xw: 705,
    'w+': 578,
    'wx+': 706,
    'xw+': 706,
    a: 1089,
    ax: 1217,
    xa: 1217,
    'a+': 1090,
    'ax+': 1218,
    'xa+': 1218,
  },
  modeStringToFlags: function(str) {
    var flags = FS.flagModes[str]
    if (typeof flags === 'undefined') {
      throw new Error('Unknown file open mode: ' + str)
    }
    return flags
  },
  flagsToPermissionString: function(flag) {
    var perms = ['r', 'w', 'rw'][flag & 3]
    if (flag & 512) {
      perms += 'w'
    }
    return perms
  },
  nodePermissions: function(node, perms) {
    if (FS.ignorePermissions) {
      return 0
    }
    if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
      return 2
    } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
      return 2
    } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
      return 2
    }
    return 0
  },
  mayLookup: function(dir) {
    var errCode = FS.nodePermissions(dir, 'x')
    if (errCode) return errCode
    if (!dir.node_ops.lookup) return 2
    return 0
  },
  mayCreate: function(dir, name) {
    try {
      var node = FS.lookupNode(dir, name)
      return 20
    } catch (e) {}
    return FS.nodePermissions(dir, 'wx')
  },
  mayDelete: function(dir, name, isdir) {
    var node
    try {
      node = FS.lookupNode(dir, name)
    } catch (e) {
      return e.errno
    }
    var errCode = FS.nodePermissions(dir, 'wx')
    if (errCode) {
      return errCode
    }
    if (isdir) {
      if (!FS.isDir(node.mode)) {
        return 54
      }
      if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
        return 10
      }
    } else {
      if (FS.isDir(node.mode)) {
        return 31
      }
    }
    return 0
  },
  mayOpen: function(node, flags) {
    if (!node) {
      return 44
    }
    if (FS.isLink(node.mode)) {
      return 32
    } else if (FS.isDir(node.mode)) {
      if (FS.flagsToPermissionString(flags) !== 'r' || flags & 512) {
        return 31
      }
    }
    return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
  },
  MAX_OPEN_FDS: 4096,
  nextfd: function(fd_start, fd_end) {
    fd_start = fd_start || 0
    fd_end = fd_end || FS.MAX_OPEN_FDS
    for (var fd = fd_start; fd <= fd_end; fd++) {
      if (!FS.streams[fd]) {
        return fd
      }
    }
    throw new FS.ErrnoError(33)
  },
  getStream: function(fd) {
    return FS.streams[fd]
  },
  createStream: function(stream, fd_start, fd_end) {
    if (!FS.FSStream) {
      FS.FSStream = function() {}
      FS.FSStream.prototype = {
        object: {
          get: function() {
            return this.node
          },
          set: function(val) {
            this.node = val
          },
        },
        isRead: {
          get: function() {
            return (this.flags & 2097155) !== 1
          },
        },
        isWrite: {
          get: function() {
            return (this.flags & 2097155) !== 0
          },
        },
        isAppend: {
          get: function() {
            return this.flags & 1024
          },
        },
      }
    }
    var newStream = new FS.FSStream()
    for (var p in stream) {
      newStream[p] = stream[p]
    }
    stream = newStream
    var fd = FS.nextfd(fd_start, fd_end)
    stream.fd = fd
    FS.streams[fd] = stream
    return stream
  },
  closeStream: function(fd) {
    FS.streams[fd] = null
  },
  chrdev_stream_ops: {
    open: function(stream) {
      var device = FS.getDevice(stream.node.rdev)
      stream.stream_ops = device.stream_ops
      if (stream.stream_ops.open) {
        stream.stream_ops.open(stream)
      }
    },
    llseek: function() {
      throw new FS.ErrnoError(70)
    },
  },
  major: function(dev) {
    return dev >> 8
  },
  minor: function(dev) {
    return dev & 255
  },
  makedev: function(ma, mi) {
    return (ma << 8) | mi
  },
  registerDevice: function(dev, ops) {
    FS.devices[dev] = { stream_ops: ops }
  },
  getDevice: function(dev) {
    return FS.devices[dev]
  },
  getMounts: function(mount) {
    var mounts = []
    var check = [mount]
    while (check.length) {
      var m = check.pop()
      mounts.push(m)
      check.push.apply(check, m.mounts)
    }
    return mounts
  },
  syncfs: function(populate, callback) {
    if (typeof populate === 'function') {
      callback = populate
      populate = false
    }
    FS.syncFSRequests++
    if (FS.syncFSRequests > 1) {
      err(
        'warning: ' +
          FS.syncFSRequests +
          ' FS.syncfs operations in flight at once, probably just doing extra work'
      )
    }
    var mounts = FS.getMounts(FS.root.mount)
    var completed = 0
    function doCallback(errCode) {
      FS.syncFSRequests--
      return callback(errCode)
    }
    function done(errCode) {
      if (errCode) {
        if (!done.errored) {
          done.errored = true
          return doCallback(errCode)
        }
        return
      }
      if (++completed >= mounts.length) {
        doCallback(null)
      }
    }
    mounts.forEach(function(mount) {
      if (!mount.type.syncfs) {
        return done(null)
      }
      mount.type.syncfs(mount, populate, done)
    })
  },
  mount: function(type, opts, mountpoint) {
    var root = mountpoint === '/'
    var pseudo = !mountpoint
    var node
    if (root && FS.root) {
      throw new FS.ErrnoError(10)
    } else if (!root && !pseudo) {
      var lookup = FS.lookupPath(mountpoint, { follow_mount: false })
      mountpoint = lookup.path
      node = lookup.node
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10)
      }
      if (!FS.isDir(node.mode)) {
        throw new FS.ErrnoError(54)
      }
    }
    var mount = { type: type, opts: opts, mountpoint: mountpoint, mounts: [] }
    var mountRoot = type.mount(mount)
    mountRoot.mount = mount
    mount.root = mountRoot
    if (root) {
      FS.root = mountRoot
    } else if (node) {
      node.mounted = mount
      if (node.mount) {
        node.mount.mounts.push(mount)
      }
    }
    return mountRoot
  },
  unmount: function(mountpoint) {
    var lookup = FS.lookupPath(mountpoint, { follow_mount: false })
    if (!FS.isMountpoint(lookup.node)) {
      throw new FS.ErrnoError(28)
    }
    var node = lookup.node
    var mount = node.mounted
    var mounts = FS.getMounts(mount)
    Object.keys(FS.nameTable).forEach(function(hash) {
      var current = FS.nameTable[hash]
      while (current) {
        var next = current.name_next
        if (mounts.indexOf(current.mount) !== -1) {
          FS.destroyNode(current)
        }
        current = next
      }
    })
    node.mounted = null
    var idx = node.mount.mounts.indexOf(mount)
    node.mount.mounts.splice(idx, 1)
  },
  lookup: function(parent, name) {
    return parent.node_ops.lookup(parent, name)
  },
  mknod: function(path, mode, dev) {
    var lookup = FS.lookupPath(path, { parent: true })
    var parent = lookup.node
    var name = PATH.basename(path)
    if (!name || name === '.' || name === '..') {
      throw new FS.ErrnoError(28)
    }
    var errCode = FS.mayCreate(parent, name)
    if (errCode) {
      throw new FS.ErrnoError(errCode)
    }
    if (!parent.node_ops.mknod) {
      throw new FS.ErrnoError(63)
    }
    return parent.node_ops.mknod(parent, name, mode, dev)
  },
  create: function(path, mode) {
    mode = mode !== undefined ? mode : 438
    mode &= 4095
    mode |= 32768
    return FS.mknod(path, mode, 0)
  },
  mkdir: function(path, mode) {
    mode = mode !== undefined ? mode : 511
    mode &= 511 | 512
    mode |= 16384
    return FS.mknod(path, mode, 0)
  },
  mkdirTree: function(path, mode) {
    var dirs = path.split('/')
    var d = ''
    for (var i = 0; i < dirs.length; ++i) {
      if (!dirs[i]) continue
      d += '/' + dirs[i]
      try {
        FS.mkdir(d, mode)
      } catch (e) {
        if (e.errno != 20) throw e
      }
    }
  },
  mkdev: function(path, mode, dev) {
    if (typeof dev === 'undefined') {
      dev = mode
      mode = 438
    }
    mode |= 8192
    return FS.mknod(path, mode, dev)
  },
  symlink: function(oldpath, newpath) {
    if (!PATH_FS.resolve(oldpath)) {
      throw new FS.ErrnoError(44)
    }
    var lookup = FS.lookupPath(newpath, { parent: true })
    var parent = lookup.node
    if (!parent) {
      throw new FS.ErrnoError(44)
    }
    var newname = PATH.basename(newpath)
    var errCode = FS.mayCreate(parent, newname)
    if (errCode) {
      throw new FS.ErrnoError(errCode)
    }
    if (!parent.node_ops.symlink) {
      throw new FS.ErrnoError(63)
    }
    return parent.node_ops.symlink(parent, newname, oldpath)
  },
  rename: function(old_path, new_path) {
    var old_dirname = PATH.dirname(old_path)
    var new_dirname = PATH.dirname(new_path)
    var old_name = PATH.basename(old_path)
    var new_name = PATH.basename(new_path)
    var lookup, old_dir, new_dir
    try {
      lookup = FS.lookupPath(old_path, { parent: true })
      old_dir = lookup.node
      lookup = FS.lookupPath(new_path, { parent: true })
      new_dir = lookup.node
    } catch (e) {
      throw new FS.ErrnoError(10)
    }
    if (!old_dir || !new_dir) throw new FS.ErrnoError(44)
    if (old_dir.mount !== new_dir.mount) {
      throw new FS.ErrnoError(75)
    }
    var old_node = FS.lookupNode(old_dir, old_name)
    var relative = PATH_FS.relative(old_path, new_dirname)
    if (relative.charAt(0) !== '.') {
      throw new FS.ErrnoError(28)
    }
    relative = PATH_FS.relative(new_path, old_dirname)
    if (relative.charAt(0) !== '.') {
      throw new FS.ErrnoError(55)
    }
    var new_node
    try {
      new_node = FS.lookupNode(new_dir, new_name)
    } catch (e) {}
    if (old_node === new_node) {
      return
    }
    var isdir = FS.isDir(old_node.mode)
    var errCode = FS.mayDelete(old_dir, old_name, isdir)
    if (errCode) {
      throw new FS.ErrnoError(errCode)
    }
    errCode = new_node
      ? FS.mayDelete(new_dir, new_name, isdir)
      : FS.mayCreate(new_dir, new_name)
    if (errCode) {
      throw new FS.ErrnoError(errCode)
    }
    if (!old_dir.node_ops.rename) {
      throw new FS.ErrnoError(63)
    }
    if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
      throw new FS.ErrnoError(10)
    }
    if (new_dir !== old_dir) {
      errCode = FS.nodePermissions(old_dir, 'w')
      if (errCode) {
        throw new FS.ErrnoError(errCode)
      }
    }
    try {
      if (FS.trackingDelegate['willMovePath']) {
        FS.trackingDelegate['willMovePath'](old_path, new_path)
      }
    } catch (e) {
      err(
        "FS.trackingDelegate['willMovePath']('" +
          old_path +
          "', '" +
          new_path +
          "') threw an exception: " +
          e.message
      )
    }
    FS.hashRemoveNode(old_node)
    try {
      old_dir.node_ops.rename(old_node, new_dir, new_name)
    } catch (e) {
      throw e
    } finally {
      FS.hashAddNode(old_node)
    }
    try {
      if (FS.trackingDelegate['onMovePath'])
        FS.trackingDelegate['onMovePath'](old_path, new_path)
    } catch (e) {
      err(
        "FS.trackingDelegate['onMovePath']('" +
          old_path +
          "', '" +
          new_path +
          "') threw an exception: " +
          e.message
      )
    }
  },
  rmdir: function(path) {
    var lookup = FS.lookupPath(path, { parent: true })
    var parent = lookup.node
    var name = PATH.basename(path)
    var node = FS.lookupNode(parent, name)
    var errCode = FS.mayDelete(parent, name, true)
    if (errCode) {
      throw new FS.ErrnoError(errCode)
    }
    if (!parent.node_ops.rmdir) {
      throw new FS.ErrnoError(63)
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10)
    }
    try {
      if (FS.trackingDelegate['willDeletePath']) {
        FS.trackingDelegate['willDeletePath'](path)
      }
    } catch (e) {
      err(
        "FS.trackingDelegate['willDeletePath']('" +
          path +
          "') threw an exception: " +
          e.message
      )
    }
    parent.node_ops.rmdir(parent, name)
    FS.destroyNode(node)
    try {
      if (FS.trackingDelegate['onDeletePath'])
        FS.trackingDelegate['onDeletePath'](path)
    } catch (e) {
      err(
        "FS.trackingDelegate['onDeletePath']('" +
          path +
          "') threw an exception: " +
          e.message
      )
    }
  },
  readdir: function(path) {
    var lookup = FS.lookupPath(path, { follow: true })
    var node = lookup.node
    if (!node.node_ops.readdir) {
      throw new FS.ErrnoError(54)
    }
    return node.node_ops.readdir(node)
  },
  unlink: function(path) {
    var lookup = FS.lookupPath(path, { parent: true })
    var parent = lookup.node
    var name = PATH.basename(path)
    var node = FS.lookupNode(parent, name)
    var errCode = FS.mayDelete(parent, name, false)
    if (errCode) {
      throw new FS.ErrnoError(errCode)
    }
    if (!parent.node_ops.unlink) {
      throw new FS.ErrnoError(63)
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10)
    }
    try {
      if (FS.trackingDelegate['willDeletePath']) {
        FS.trackingDelegate['willDeletePath'](path)
      }
    } catch (e) {
      err(
        "FS.trackingDelegate['willDeletePath']('" +
          path +
          "') threw an exception: " +
          e.message
      )
    }
    parent.node_ops.unlink(parent, name)
    FS.destroyNode(node)
    try {
      if (FS.trackingDelegate['onDeletePath'])
        FS.trackingDelegate['onDeletePath'](path)
    } catch (e) {
      err(
        "FS.trackingDelegate['onDeletePath']('" +
          path +
          "') threw an exception: " +
          e.message
      )
    }
  },
  readlink: function(path) {
    var lookup = FS.lookupPath(path)
    var link = lookup.node
    if (!link) {
      throw new FS.ErrnoError(44)
    }
    if (!link.node_ops.readlink) {
      throw new FS.ErrnoError(28)
    }
    return PATH_FS.resolve(
      FS.getPath(link.parent),
      link.node_ops.readlink(link)
    )
  },
  stat: function(path, dontFollow) {
    var lookup = FS.lookupPath(path, { follow: !dontFollow })
    var node = lookup.node
    if (!node) {
      throw new FS.ErrnoError(44)
    }
    if (!node.node_ops.getattr) {
      throw new FS.ErrnoError(63)
    }
    return node.node_ops.getattr(node)
  },
  lstat: function(path) {
    return FS.stat(path, true)
  },
  chmod: function(path, mode, dontFollow) {
    var node
    if (typeof path === 'string') {
      var lookup = FS.lookupPath(path, { follow: !dontFollow })
      node = lookup.node
    } else {
      node = path
    }
    if (!node.node_ops.setattr) {
      throw new FS.ErrnoError(63)
    }
    node.node_ops.setattr(node, {
      mode: (mode & 4095) | (node.mode & ~4095),
      timestamp: Date.now(),
    })
  },
  lchmod: function(path, mode) {
    FS.chmod(path, mode, true)
  },
  fchmod: function(fd, mode) {
    var stream = FS.getStream(fd)
    if (!stream) {
      throw new FS.ErrnoError(8)
    }
    FS.chmod(stream.node, mode)
  },
  chown: function(path, uid, gid, dontFollow) {
    var node
    if (typeof path === 'string') {
      var lookup = FS.lookupPath(path, { follow: !dontFollow })
      node = lookup.node
    } else {
      node = path
    }
    if (!node.node_ops.setattr) {
      throw new FS.ErrnoError(63)
    }
    node.node_ops.setattr(node, { timestamp: Date.now() })
  },
  lchown: function(path, uid, gid) {
    FS.chown(path, uid, gid, true)
  },
  fchown: function(fd, uid, gid) {
    var stream = FS.getStream(fd)
    if (!stream) {
      throw new FS.ErrnoError(8)
    }
    FS.chown(stream.node, uid, gid)
  },
  truncate: function(path, len) {
    if (len < 0) {
      throw new FS.ErrnoError(28)
    }
    var node
    if (typeof path === 'string') {
      var lookup = FS.lookupPath(path, { follow: true })
      node = lookup.node
    } else {
      node = path
    }
    if (!node.node_ops.setattr) {
      throw new FS.ErrnoError(63)
    }
    if (FS.isDir(node.mode)) {
      throw new FS.ErrnoError(31)
    }
    if (!FS.isFile(node.mode)) {
      throw new FS.ErrnoError(28)
    }
    var errCode = FS.nodePermissions(node, 'w')
    if (errCode) {
      throw new FS.ErrnoError(errCode)
    }
    node.node_ops.setattr(node, { size: len, timestamp: Date.now() })
  },
  ftruncate: function(fd, len) {
    var stream = FS.getStream(fd)
    if (!stream) {
      throw new FS.ErrnoError(8)
    }
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(28)
    }
    FS.truncate(stream.node, len)
  },
  utime: function(path, atime, mtime) {
    var lookup = FS.lookupPath(path, { follow: true })
    var node = lookup.node
    node.node_ops.setattr(node, { timestamp: Math.max(atime, mtime) })
  },
  open: function(path, flags, mode, fd_start, fd_end) {
    if (path === '') {
      throw new FS.ErrnoError(44)
    }
    flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags
    mode = typeof mode === 'undefined' ? 438 : mode
    if (flags & 64) {
      mode = (mode & 4095) | 32768
    } else {
      mode = 0
    }
    var node
    if (typeof path === 'object') {
      node = path
    } else {
      path = PATH.normalize(path)
      try {
        var lookup = FS.lookupPath(path, { follow: !(flags & 131072) })
        node = lookup.node
      } catch (e) {}
    }
    var created = false
    if (flags & 64) {
      if (node) {
        if (flags & 128) {
          throw new FS.ErrnoError(20)
        }
      } else {
        node = FS.mknod(path, mode, 0)
        created = true
      }
    }
    if (!node) {
      throw new FS.ErrnoError(44)
    }
    if (FS.isChrdev(node.mode)) {
      flags &= ~512
    }
    if (flags & 65536 && !FS.isDir(node.mode)) {
      throw new FS.ErrnoError(54)
    }
    if (!created) {
      var errCode = FS.mayOpen(node, flags)
      if (errCode) {
        throw new FS.ErrnoError(errCode)
      }
    }
    if (flags & 512) {
      FS.truncate(node, 0)
    }
    flags &= ~(128 | 512)
    var stream = FS.createStream(
      {
        node: node,
        path: FS.getPath(node),
        flags: flags,
        seekable: true,
        position: 0,
        stream_ops: node.stream_ops,
        ungotten: [],
        error: false,
      },
      fd_start,
      fd_end
    )
    if (stream.stream_ops.open) {
      stream.stream_ops.open(stream)
    }
    if (Module['logReadFiles'] && !(flags & 1)) {
      if (!FS.readFiles) FS.readFiles = {}
      if (!(path in FS.readFiles)) {
        FS.readFiles[path] = 1
        err('FS.trackingDelegate error on read file: ' + path)
      }
    }
    try {
      if (FS.trackingDelegate['onOpenFile']) {
        var trackingFlags = 0
        if ((flags & 2097155) !== 1) {
          trackingFlags |= FS.tracking.openFlags.READ
        }
        if ((flags & 2097155) !== 0) {
          trackingFlags |= FS.tracking.openFlags.WRITE
        }
        FS.trackingDelegate['onOpenFile'](path, trackingFlags)
      }
    } catch (e) {
      err(
        "FS.trackingDelegate['onOpenFile']('" +
          path +
          "', flags) threw an exception: " +
          e.message
      )
    }
    return stream
  },
  close: function(stream) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8)
    }
    if (stream.getdents) stream.getdents = null
    try {
      if (stream.stream_ops.close) {
        stream.stream_ops.close(stream)
      }
    } catch (e) {
      throw e
    } finally {
      FS.closeStream(stream.fd)
    }
    stream.fd = null
  },
  isClosed: function(stream) {
    return stream.fd === null
  },
  llseek: function(stream, offset, whence) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8)
    }
    if (!stream.seekable || !stream.stream_ops.llseek) {
      throw new FS.ErrnoError(70)
    }
    if (whence != 0 && whence != 1 && whence != 2) {
      throw new FS.ErrnoError(28)
    }
    stream.position = stream.stream_ops.llseek(stream, offset, whence)
    stream.ungotten = []
    return stream.position
  },
  read: function(stream, buffer, offset, length, position) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28)
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8)
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(8)
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31)
    }
    if (!stream.stream_ops.read) {
      throw new FS.ErrnoError(28)
    }
    var seeking = typeof position !== 'undefined'
    if (!seeking) {
      position = stream.position
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70)
    }
    var bytesRead = stream.stream_ops.read(
      stream,
      buffer,
      offset,
      length,
      position
    )
    if (!seeking) stream.position += bytesRead
    return bytesRead
  },
  write: function(stream, buffer, offset, length, position, canOwn) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28)
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8)
    }
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(8)
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31)
    }
    if (!stream.stream_ops.write) {
      throw new FS.ErrnoError(28)
    }
    if (stream.flags & 1024) {
      FS.llseek(stream, 0, 2)
    }
    var seeking = typeof position !== 'undefined'
    if (!seeking) {
      position = stream.position
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70)
    }
    var bytesWritten = stream.stream_ops.write(
      stream,
      buffer,
      offset,
      length,
      position,
      canOwn
    )
    if (!seeking) stream.position += bytesWritten
    try {
      if (stream.path && FS.trackingDelegate['onWriteToFile'])
        FS.trackingDelegate['onWriteToFile'](stream.path)
    } catch (e) {
      err(
        "FS.trackingDelegate['onWriteToFile']('" +
          stream.path +
          "') threw an exception: " +
          e.message
      )
    }
    return bytesWritten
  },
  allocate: function(stream, offset, length) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8)
    }
    if (offset < 0 || length <= 0) {
      throw new FS.ErrnoError(28)
    }
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(8)
    }
    if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(43)
    }
    if (!stream.stream_ops.allocate) {
      throw new FS.ErrnoError(138)
    }
    stream.stream_ops.allocate(stream, offset, length)
  },
  mmap: function(stream, buffer, offset, length, position, prot, flags) {
    if (
      (prot & 2) !== 0 &&
      (flags & 2) === 0 &&
      (stream.flags & 2097155) !== 2
    ) {
      throw new FS.ErrnoError(2)
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(2)
    }
    if (!stream.stream_ops.mmap) {
      throw new FS.ErrnoError(43)
    }
    return stream.stream_ops.mmap(
      stream,
      buffer,
      offset,
      length,
      position,
      prot,
      flags
    )
  },
  msync: function(stream, buffer, offset, length, mmapFlags) {
    if (!stream || !stream.stream_ops.msync) {
      return 0
    }
    return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
  },
  munmap: function(stream) {
    return 0
  },
  ioctl: function(stream, cmd, arg) {
    if (!stream.stream_ops.ioctl) {
      throw new FS.ErrnoError(59)
    }
    return stream.stream_ops.ioctl(stream, cmd, arg)
  },
  readFile: function(path, opts) {
    opts = opts || {}
    opts.flags = opts.flags || 'r'
    opts.encoding = opts.encoding || 'binary'
    if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
      throw new Error('Invalid encoding type "' + opts.encoding + '"')
    }
    var ret
    var stream = FS.open(path, opts.flags)
    var stat = FS.stat(path)
    var length = stat.size
    var buf = new Uint8Array(length)
    FS.read(stream, buf, 0, length, 0)
    if (opts.encoding === 'utf8') {
      ret = UTF8ArrayToString(buf, 0)
    } else if (opts.encoding === 'binary') {
      ret = buf
    }
    FS.close(stream)
    return ret
  },
  writeFile: function(path, data, opts) {
    opts = opts || {}
    opts.flags = opts.flags || 'w'
    var stream = FS.open(path, opts.flags, opts.mode)
    if (typeof data === 'string') {
      var buf = new Uint8Array(lengthBytesUTF8(data) + 1)
      var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length)
      FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn)
    } else if (ArrayBuffer.isView(data)) {
      FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn)
    } else {
      throw new Error('Unsupported data type')
    }
    FS.close(stream)
  },
  cwd: function() {
    return FS.currentPath
  },
  chdir: function(path) {
    var lookup = FS.lookupPath(path, { follow: true })
    if (lookup.node === null) {
      throw new FS.ErrnoError(44)
    }
    if (!FS.isDir(lookup.node.mode)) {
      throw new FS.ErrnoError(54)
    }
    var errCode = FS.nodePermissions(lookup.node, 'x')
    if (errCode) {
      throw new FS.ErrnoError(errCode)
    }
    FS.currentPath = lookup.path
  },
  createDefaultDirectories: function() {
    FS.mkdir('/tmp')
    FS.mkdir('/home')
    FS.mkdir('/home/web_user')
  },
  createDefaultDevices: function() {
    FS.mkdir('/dev')
    FS.registerDevice(FS.makedev(1, 3), {
      read: function() {
        return 0
      },
      write: function(stream, buffer, offset, length, pos) {
        return length
      },
    })
    FS.mkdev('/dev/null', FS.makedev(1, 3))
    TTY.register(FS.makedev(5, 0), TTY.default_tty_ops)
    TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops)
    FS.mkdev('/dev/tty', FS.makedev(5, 0))
    FS.mkdev('/dev/tty1', FS.makedev(6, 0))
    var random_device
    if (
      typeof crypto === 'object' &&
      typeof crypto['getRandomValues'] === 'function'
    ) {
      var randomBuffer = new Uint8Array(1)
      random_device = function() {
        crypto.getRandomValues(randomBuffer)
        return randomBuffer[0]
      }
    } else if (ENVIRONMENT_IS_NODE) {
      try {
        var crypto_module = require('crypto')
        random_device = function() {
          return crypto_module['randomBytes'](1)[0]
        }
      } catch (e) {}
    } else {
    }
    if (!random_device) {
      random_device = function() {
        abort('random_device')
      }
    }
    FS.createDevice('/dev', 'random', random_device)
    FS.createDevice('/dev', 'urandom', random_device)
    FS.mkdir('/dev/shm')
    FS.mkdir('/dev/shm/tmp')
  },
  createSpecialDirectories: function() {
    FS.mkdir('/proc')
    FS.mkdir('/proc/self')
    FS.mkdir('/proc/self/fd')
    FS.mount(
      {
        mount: function() {
          var node = FS.createNode('/proc/self', 'fd', 16384 | 511, 73)
          node.node_ops = {
            lookup: function(parent, name) {
              var fd = +name
              var stream = FS.getStream(fd)
              if (!stream) throw new FS.ErrnoError(8)
              var ret = {
                parent: null,
                mount: { mountpoint: 'fake' },
                node_ops: {
                  readlink: function() {
                    return stream.path
                  },
                },
              }
              ret.parent = ret
              return ret
            },
          }
          return node
        },
      },
      {},
      '/proc/self/fd'
    )
  },
  createStandardStreams: function() {
    if (Module['stdin']) {
      FS.createDevice('/dev', 'stdin', Module['stdin'])
    } else {
      FS.symlink('/dev/tty', '/dev/stdin')
    }
    if (Module['stdout']) {
      FS.createDevice('/dev', 'stdout', null, Module['stdout'])
    } else {
      FS.symlink('/dev/tty', '/dev/stdout')
    }
    if (Module['stderr']) {
      FS.createDevice('/dev', 'stderr', null, Module['stderr'])
    } else {
      FS.symlink('/dev/tty1', '/dev/stderr')
    }
    var stdin = FS.open('/dev/stdin', 'r')
    var stdout = FS.open('/dev/stdout', 'w')
    var stderr = FS.open('/dev/stderr', 'w')
  },
  ensureErrnoError: function() {
    if (FS.ErrnoError) return
    FS.ErrnoError = function ErrnoError(errno, node) {
      this.node = node
      this.setErrno = function(errno) {
        this.errno = errno
      }
      this.setErrno(errno)
      this.message = 'FS error'
    }
    FS.ErrnoError.prototype = new Error()
    FS.ErrnoError.prototype.constructor = FS.ErrnoError
    ;[44].forEach(function(code) {
      FS.genericErrors[code] = new FS.ErrnoError(code)
      FS.genericErrors[code].stack = '<generic error, no stack>'
    })
  },
  staticInit: function() {
    FS.ensureErrnoError()
    FS.nameTable = new Array(4096)
    FS.mount(MEMFS, {}, '/')
    FS.createDefaultDirectories()
    FS.createDefaultDevices()
    FS.createSpecialDirectories()
    FS.filesystems = { MEMFS: MEMFS, NODEFS: NODEFS }
  },
  init: function(input, output, error) {
    FS.init.initialized = true
    FS.ensureErrnoError()
    Module['stdin'] = input || Module['stdin']
    Module['stdout'] = output || Module['stdout']
    Module['stderr'] = error || Module['stderr']
    FS.createStandardStreams()
  },
  quit: function() {
    FS.init.initialized = false
    var fflush = Module['_fflush']
    if (fflush) fflush(0)
    for (var i = 0; i < FS.streams.length; i++) {
      var stream = FS.streams[i]
      if (!stream) {
        continue
      }
      FS.close(stream)
    }
  },
  getMode: function(canRead, canWrite) {
    var mode = 0
    if (canRead) mode |= 292 | 73
    if (canWrite) mode |= 146
    return mode
  },
  joinPath: function(parts, forceRelative) {
    var path = PATH.join.apply(null, parts)
    if (forceRelative && path[0] == '/') path = path.substr(1)
    return path
  },
  absolutePath: function(relative, base) {
    return PATH_FS.resolve(base, relative)
  },
  standardizePath: function(path) {
    return PATH.normalize(path)
  },
  findObject: function(path, dontResolveLastLink) {
    var ret = FS.analyzePath(path, dontResolveLastLink)
    if (ret.exists) {
      return ret.object
    } else {
      ___setErrNo(ret.error)
      return null
    }
  },
  analyzePath: function(path, dontResolveLastLink) {
    try {
      var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink })
      path = lookup.path
    } catch (e) {}
    var ret = {
      isRoot: false,
      exists: false,
      error: 0,
      name: null,
      path: null,
      object: null,
      parentExists: false,
      parentPath: null,
      parentObject: null,
    }
    try {
      var lookup = FS.lookupPath(path, { parent: true })
      ret.parentExists = true
      ret.parentPath = lookup.path
      ret.parentObject = lookup.node
      ret.name = PATH.basename(path)
      lookup = FS.lookupPath(path, { follow: !dontResolveLastLink })
      ret.exists = true
      ret.path = lookup.path
      ret.object = lookup.node
      ret.name = lookup.node.name
      ret.isRoot = lookup.path === '/'
    } catch (e) {
      ret.error = e.errno
    }
    return ret
  },
  createFolder: function(parent, name, canRead, canWrite) {
    var path = PATH.join2(
      typeof parent === 'string' ? parent : FS.getPath(parent),
      name
    )
    var mode = FS.getMode(canRead, canWrite)
    return FS.mkdir(path, mode)
  },
  createPath: function(parent, path, canRead, canWrite) {
    parent = typeof parent === 'string' ? parent : FS.getPath(parent)
    var parts = path.split('/').reverse()
    while (parts.length) {
      var part = parts.pop()
      if (!part) continue
      var current = PATH.join2(parent, part)
      try {
        FS.mkdir(current)
      } catch (e) {}
      parent = current
    }
    return current
  },
  createFile: function(parent, name, properties, canRead, canWrite) {
    var path = PATH.join2(
      typeof parent === 'string' ? parent : FS.getPath(parent),
      name
    )
    var mode = FS.getMode(canRead, canWrite)
    return FS.create(path, mode)
  },
  createDataFile: function(parent, name, data, canRead, canWrite, canOwn) {
    var path = name
      ? PATH.join2(
          typeof parent === 'string' ? parent : FS.getPath(parent),
          name
        )
      : parent
    var mode = FS.getMode(canRead, canWrite)
    var node = FS.create(path, mode)
    if (data) {
      if (typeof data === 'string') {
        var arr = new Array(data.length)
        for (var i = 0, len = data.length; i < len; ++i)
          arr[i] = data.charCodeAt(i)
        data = arr
      }
      FS.chmod(node, mode | 146)
      var stream = FS.open(node, 'w')
      FS.write(stream, data, 0, data.length, 0, canOwn)
      FS.close(stream)
      FS.chmod(node, mode)
    }
    return node
  },
  createDevice: function(parent, name, input, output) {
    var path = PATH.join2(
      typeof parent === 'string' ? parent : FS.getPath(parent),
      name
    )
    var mode = FS.getMode(!!input, !!output)
    if (!FS.createDevice.major) FS.createDevice.major = 64
    var dev = FS.makedev(FS.createDevice.major++, 0)
    FS.registerDevice(dev, {
      open: function(stream) {
        stream.seekable = false
      },
      close: function(stream) {
        if (output && output.buffer && output.buffer.length) {
          output(10)
        }
      },
      read: function(stream, buffer, offset, length, pos) {
        var bytesRead = 0
        for (var i = 0; i < length; i++) {
          var result
          try {
            result = input()
          } catch (e) {
            throw new FS.ErrnoError(29)
          }
          if (result === undefined && bytesRead === 0) {
            throw new FS.ErrnoError(6)
          }
          if (result === null || result === undefined) break
          bytesRead++
          buffer[offset + i] = result
        }
        if (bytesRead) {
          stream.node.timestamp = Date.now()
        }
        return bytesRead
      },
      write: function(stream, buffer, offset, length, pos) {
        for (var i = 0; i < length; i++) {
          try {
            output(buffer[offset + i])
          } catch (e) {
            throw new FS.ErrnoError(29)
          }
        }
        if (length) {
          stream.node.timestamp = Date.now()
        }
        return i
      },
    })
    return FS.mkdev(path, mode, dev)
  },
  createLink: function(parent, name, target, canRead, canWrite) {
    var path = PATH.join2(
      typeof parent === 'string' ? parent : FS.getPath(parent),
      name
    )
    return FS.symlink(target, path)
  },
  forceLoadFile: function(obj) {
    if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true
    var success = true
    if (typeof XMLHttpRequest !== 'undefined') {
      throw new Error(
        'Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.'
      )
    } else if (read_) {
      try {
        obj.contents = intArrayFromString(read_(obj.url), true)
        obj.usedBytes = obj.contents.length
      } catch (e) {
        success = false
      }
    } else {
      throw new Error('Cannot load without read() or XMLHttpRequest.')
    }
    if (!success) ___setErrNo(29)
    return success
  },
  createLazyFile: function(parent, name, url, canRead, canWrite) {
    function LazyUint8Array() {
      this.lengthKnown = false
      this.chunks = []
    }
    LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
      if (idx > this.length - 1 || idx < 0) {
        return undefined
      }
      var chunkOffset = idx % this.chunkSize
      var chunkNum = (idx / this.chunkSize) | 0
      return this.getter(chunkNum)[chunkOffset]
    }
    LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(
      getter
    ) {
      this.getter = getter
    }
    LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
      var xhr = new XMLHttpRequest()
      xhr.open('HEAD', url, false)
      xhr.send(null)
      if (!((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304))
        throw new Error("Couldn't load " + url + '. Status: ' + xhr.status)
      var datalength = Number(xhr.getResponseHeader('Content-length'))
      var header
      var hasByteServing =
        (header = xhr.getResponseHeader('Accept-Ranges')) && header === 'bytes'
      var usesGzip =
        (header = xhr.getResponseHeader('Content-Encoding')) &&
        header === 'gzip'
      var chunkSize = 1024 * 1024
      if (!hasByteServing) chunkSize = datalength
      var doXHR = function(from, to) {
        if (from > to)
          throw new Error(
            'invalid range (' + from + ', ' + to + ') or no bytes requested!'
          )
        if (to > datalength - 1)
          throw new Error(
            'only ' + datalength + ' bytes available! programmer error!'
          )
        var xhr = new XMLHttpRequest()
        xhr.open('GET', url, false)
        if (datalength !== chunkSize)
          xhr.setRequestHeader('Range', 'bytes=' + from + '-' + to)
        if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer'
        if (xhr.overrideMimeType) {
          xhr.overrideMimeType('text/plain; charset=x-user-defined')
        }
        xhr.send(null)
        if (!((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304))
          throw new Error("Couldn't load " + url + '. Status: ' + xhr.status)
        if (xhr.response !== undefined) {
          return new Uint8Array(xhr.response || [])
        } else {
          return intArrayFromString(xhr.responseText || '', true)
        }
      }
      var lazyArray = this
      lazyArray.setDataGetter(function(chunkNum) {
        var start = chunkNum * chunkSize
        var end = (chunkNum + 1) * chunkSize - 1
        end = Math.min(end, datalength - 1)
        if (typeof lazyArray.chunks[chunkNum] === 'undefined') {
          lazyArray.chunks[chunkNum] = doXHR(start, end)
        }
        if (typeof lazyArray.chunks[chunkNum] === 'undefined')
          throw new Error('doXHR failed!')
        return lazyArray.chunks[chunkNum]
      })
      if (usesGzip || !datalength) {
        chunkSize = datalength = 1
        datalength = this.getter(0).length
        chunkSize = datalength
        out(
          'LazyFiles on gzip forces download of the whole file when length is accessed'
        )
      }
      this._length = datalength
      this._chunkSize = chunkSize
      this.lengthKnown = true
    }
    if (typeof XMLHttpRequest !== 'undefined') {
      if (!ENVIRONMENT_IS_WORKER)
        throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc'
      var lazyArray = new LazyUint8Array()
      Object.defineProperties(lazyArray, {
        length: {
          get: function() {
            if (!this.lengthKnown) {
              this.cacheLength()
            }
            return this._length
          },
        },
        chunkSize: {
          get: function() {
            if (!this.lengthKnown) {
              this.cacheLength()
            }
            return this._chunkSize
          },
        },
      })
      var properties = { isDevice: false, contents: lazyArray }
    } else {
      var properties = { isDevice: false, url: url }
    }
    var node = FS.createFile(parent, name, properties, canRead, canWrite)
    if (properties.contents) {
      node.contents = properties.contents
    } else if (properties.url) {
      node.contents = null
      node.url = properties.url
    }
    Object.defineProperties(node, {
      usedBytes: {
        get: function() {
          return this.contents.length
        },
      },
    })
    var stream_ops = {}
    var keys = Object.keys(node.stream_ops)
    keys.forEach(function(key) {
      var fn = node.stream_ops[key]
      stream_ops[key] = function forceLoadLazyFile() {
        if (!FS.forceLoadFile(node)) {
          throw new FS.ErrnoError(29)
        }
        return fn.apply(null, arguments)
      }
    })
    stream_ops.read = function stream_ops_read(
      stream,
      buffer,
      offset,
      length,
      position
    ) {
      if (!FS.forceLoadFile(node)) {
        throw new FS.ErrnoError(29)
      }
      var contents = stream.node.contents
      if (position >= contents.length) return 0
      var size = Math.min(contents.length - position, length)
      if (contents.slice) {
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents[position + i]
        }
      } else {
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents.get(position + i)
        }
      }
      return size
    }
    node.stream_ops = stream_ops
    return node
  },
  createPreloadedFile: function(
    parent,
    name,
    url,
    canRead,
    canWrite,
    onload,
    onerror,
    dontCreateFile,
    canOwn,
    preFinish
  ) {
    Browser.init()
    var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent
    var dep = getUniqueRunDependency('cp ' + fullname)
    function processData(byteArray) {
      function finish(byteArray) {
        if (preFinish) preFinish()
        if (!dontCreateFile) {
          FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
        }
        if (onload) onload()
        removeRunDependency(dep)
      }
      var handled = false
      Module['preloadPlugins'].forEach(function(plugin) {
        if (handled) return
        if (plugin['canHandle'](fullname)) {
          plugin['handle'](byteArray, fullname, finish, function() {
            if (onerror) onerror()
            removeRunDependency(dep)
          })
          handled = true
        }
      })
      if (!handled) finish(byteArray)
    }
    addRunDependency(dep)
    if (typeof url == 'string') {
      Browser.asyncLoad(
        url,
        function(byteArray) {
          processData(byteArray)
        },
        onerror
      )
    } else {
      processData(url)
    }
  },
  indexedDB: function() {
    return (
      window.indexedDB ||
      window.mozIndexedDB ||
      window.webkitIndexedDB ||
      window.msIndexedDB
    )
  },
  DB_NAME: function() {
    return 'EM_FS_' + window.location.pathname
  },
  DB_VERSION: 20,
  DB_STORE_NAME: 'FILE_DATA',
  saveFilesToDB: function(paths, onload, onerror) {
    onload = onload || function() {}
    onerror = onerror || function() {}
    var indexedDB = FS.indexedDB()
    try {
      var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
    } catch (e) {
      return onerror(e)
    }
    openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
      out('creating db')
      var db = openRequest.result
      db.createObjectStore(FS.DB_STORE_NAME)
    }
    openRequest.onsuccess = function openRequest_onsuccess() {
      var db = openRequest.result
      var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite')
      var files = transaction.objectStore(FS.DB_STORE_NAME)
      var ok = 0,
        fail = 0,
        total = paths.length
      function finish() {
        if (fail == 0) onload()
        else onerror()
      }
      paths.forEach(function(path) {
        var putRequest = files.put(FS.analyzePath(path).object.contents, path)
        putRequest.onsuccess = function putRequest_onsuccess() {
          ok++
          if (ok + fail == total) finish()
        }
        putRequest.onerror = function putRequest_onerror() {
          fail++
          if (ok + fail == total) finish()
        }
      })
      transaction.onerror = onerror
    }
    openRequest.onerror = onerror
  },
  loadFilesFromDB: function(paths, onload, onerror) {
    onload = onload || function() {}
    onerror = onerror || function() {}
    var indexedDB = FS.indexedDB()
    try {
      var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
    } catch (e) {
      return onerror(e)
    }
    openRequest.onupgradeneeded = onerror
    openRequest.onsuccess = function openRequest_onsuccess() {
      var db = openRequest.result
      try {
        var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly')
      } catch (e) {
        onerror(e)
        return
      }
      var files = transaction.objectStore(FS.DB_STORE_NAME)
      var ok = 0,
        fail = 0,
        total = paths.length
      function finish() {
        if (fail == 0) onload()
        else onerror()
      }
      paths.forEach(function(path) {
        var getRequest = files.get(path)
        getRequest.onsuccess = function getRequest_onsuccess() {
          if (FS.analyzePath(path).exists) {
            FS.unlink(path)
          }
          FS.createDataFile(
            PATH.dirname(path),
            PATH.basename(path),
            getRequest.result,
            true,
            true,
            true
          )
          ok++
          if (ok + fail == total) finish()
        }
        getRequest.onerror = function getRequest_onerror() {
          fail++
          if (ok + fail == total) finish()
        }
      })
      transaction.onerror = onerror
    }
    openRequest.onerror = onerror
  },
}
var SYSCALLS = {
  mappings: {},
  DEFAULT_POLLMASK: 5,
  umask: 511,
  calculateAt: function(dirfd, path) {
    if (path[0] !== '/') {
      var dir
      if (dirfd === -100) {
        dir = FS.cwd()
      } else {
        var dirstream = FS.getStream(dirfd)
        if (!dirstream) throw new FS.ErrnoError(8)
        dir = dirstream.path
      }
      path = PATH.join2(dir, path)
    }
    return path
  },
  doStat: function(func, path, buf) {
    try {
      var stat = func(path)
    } catch (e) {
      if (
        e &&
        e.node &&
        PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))
      ) {
        return -54
      }
      throw e
    }
    HEAP32[buf >> 2] = stat.dev
    HEAP32[(buf + 4) >> 2] = 0
    HEAP32[(buf + 8) >> 2] = stat.ino
    HEAP32[(buf + 12) >> 2] = stat.mode
    HEAP32[(buf + 16) >> 2] = stat.nlink
    HEAP32[(buf + 20) >> 2] = stat.uid
    HEAP32[(buf + 24) >> 2] = stat.gid
    HEAP32[(buf + 28) >> 2] = stat.rdev
    HEAP32[(buf + 32) >> 2] = 0
    ;(tempI64 = [
      stat.size >>> 0,
      ((tempDouble = stat.size),
      +Math_abs(tempDouble) >= +1
        ? tempDouble > +0
          ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) |
              0) >>>
            0
          : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>>
            0
        : 0),
    ]),
      (HEAP32[(buf + 40) >> 2] = tempI64[0]),
      (HEAP32[(buf + 44) >> 2] = tempI64[1])
    HEAP32[(buf + 48) >> 2] = 4096
    HEAP32[(buf + 52) >> 2] = stat.blocks
    HEAP32[(buf + 56) >> 2] = (stat.atime.getTime() / 1e3) | 0
    HEAP32[(buf + 60) >> 2] = 0
    HEAP32[(buf + 64) >> 2] = (stat.mtime.getTime() / 1e3) | 0
    HEAP32[(buf + 68) >> 2] = 0
    HEAP32[(buf + 72) >> 2] = (stat.ctime.getTime() / 1e3) | 0
    HEAP32[(buf + 76) >> 2] = 0
    ;(tempI64 = [
      stat.ino >>> 0,
      ((tempDouble = stat.ino),
      +Math_abs(tempDouble) >= +1
        ? tempDouble > +0
          ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) |
              0) >>>
            0
          : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>>
            0
        : 0),
    ]),
      (HEAP32[(buf + 80) >> 2] = tempI64[0]),
      (HEAP32[(buf + 84) >> 2] = tempI64[1])
    return 0
  },
  doMsync: function(addr, stream, len, flags, offset) {
    var buffer = HEAPU8.slice(addr, addr + len)
    FS.msync(stream, buffer, offset, len, flags)
  },
  doMkdir: function(path, mode) {
    path = PATH.normalize(path)
    if (path[path.length - 1] === '/') path = path.substr(0, path.length - 1)
    FS.mkdir(path, mode, 0)
    return 0
  },
  doMknod: function(path, mode, dev) {
    switch (mode & 61440) {
      case 32768:
      case 8192:
      case 24576:
      case 4096:
      case 49152:
        break
      default:
        return -28
    }
    FS.mknod(path, mode, dev)
    return 0
  },
  doReadlink: function(path, buf, bufsize) {
    if (bufsize <= 0) return -28
    var ret = FS.readlink(path)
    var len = Math.min(bufsize, lengthBytesUTF8(ret))
    var endChar = HEAP8[buf + len]
    stringToUTF8(ret, buf, bufsize + 1)
    HEAP8[buf + len] = endChar
    return len
  },
  doAccess: function(path, amode) {
    if (amode & ~7) {
      return -28
    }
    var node
    var lookup = FS.lookupPath(path, { follow: true })
    node = lookup.node
    if (!node) {
      return -44
    }
    var perms = ''
    if (amode & 4) perms += 'r'
    if (amode & 2) perms += 'w'
    if (amode & 1) perms += 'x'
    if (perms && FS.nodePermissions(node, perms)) {
      return -2
    }
    return 0
  },
  doDup: function(path, flags, suggestFD) {
    var suggest = FS.getStream(suggestFD)
    if (suggest) FS.close(suggest)
    return FS.open(path, flags, 0, suggestFD, suggestFD).fd
  },
  doReadv: function(stream, iov, iovcnt, offset) {
    var ret = 0
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAP32[(iov + i * 8) >> 2]
      var len = HEAP32[(iov + (i * 8 + 4)) >> 2]
      var curr = FS.read(stream, HEAP8, ptr, len, offset)
      if (curr < 0) return -1
      ret += curr
      if (curr < len) break
    }
    return ret
  },
  doWritev: function(stream, iov, iovcnt, offset) {
    var ret = 0
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAP32[(iov + i * 8) >> 2]
      var len = HEAP32[(iov + (i * 8 + 4)) >> 2]
      var curr = FS.write(stream, HEAP8, ptr, len, offset)
      if (curr < 0) return -1
      ret += curr
    }
    return ret
  },
  varargs: undefined,
  get: function() {
    SYSCALLS.varargs += 4
    var ret = HEAP32[(SYSCALLS.varargs - 4) >> 2]
    return ret
  },
  getStr: function(ptr) {
    var ret = UTF8ToString(ptr)
    return ret
  },
  getStreamFromFD: function(fd) {
    var stream = FS.getStream(fd)
    if (!stream) throw new FS.ErrnoError(8)
    return stream
  },
  get64: function(low, high) {
    return low
  },
}
function ___syscall221(fd, cmd, varargs) {
  SYSCALLS.varargs = varargs
  try {
    var stream = SYSCALLS.getStreamFromFD(fd)
    switch (cmd) {
      case 0: {
        var arg = SYSCALLS.get()
        if (arg < 0) {
          return -28
        }
        var newStream
        newStream = FS.open(stream.path, stream.flags, 0, arg)
        return newStream.fd
      }
      case 1:
      case 2:
        return 0
      case 3:
        return stream.flags
      case 4: {
        var arg = SYSCALLS.get()
        stream.flags |= arg
        return 0
      }
      case 12: {
        var arg = SYSCALLS.get()
        var offset = 0
        HEAP16[(arg + offset) >> 1] = 2
        return 0
      }
      case 13:
      case 14:
        return 0
      case 16:
      case 8:
        return -28
      case 9:
        ___setErrNo(28)
        return -1
      default: {
        return -28
      }
    }
  } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e)
    return -e.errno
  }
}
function ___syscall5(path, flags, varargs) {
  SYSCALLS.varargs = varargs
  try {
    var pathname = SYSCALLS.getStr(path)
    var mode = SYSCALLS.get()
    var stream = FS.open(pathname, flags, mode)
    return stream.fd
  } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e)
    return -e.errno
  }
}
function ___syscall54(fd, op, varargs) {
  SYSCALLS.varargs = varargs
  try {
    var stream = SYSCALLS.getStreamFromFD(fd)
    switch (op) {
      case 21509:
      case 21505: {
        if (!stream.tty) return -59
        return 0
      }
      case 21510:
      case 21511:
      case 21512:
      case 21506:
      case 21507:
      case 21508: {
        if (!stream.tty) return -59
        return 0
      }
      case 21519: {
        if (!stream.tty) return -59
        var argp = SYSCALLS.get()
        HEAP32[argp >> 2] = 0
        return 0
      }
      case 21520: {
        if (!stream.tty) return -59
        return -28
      }
      case 21531: {
        var argp = SYSCALLS.get()
        return FS.ioctl(stream, op, argp)
      }
      case 21523: {
        if (!stream.tty) return -59
        return 0
      }
      case 21524: {
        if (!stream.tty) return -59
        return 0
      }
      default:
        abort('bad ioctl syscall ' + op)
    }
  } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e)
    return -e.errno
  }
}
function _fd_close(fd) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd)
    FS.close(stream)
    return 0
  } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e)
    return e.errno
  }
}
function ___wasi_fd_close(a0) {
  return _fd_close(a0)
}
function _fd_read(fd, iov, iovcnt, pnum) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd)
    var num = SYSCALLS.doReadv(stream, iov, iovcnt)
    HEAP32[pnum >> 2] = num
    return 0
  } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e)
    return e.errno
  }
}
function ___wasi_fd_read(a0, a1, a2, a3) {
  return _fd_read(a0, a1, a2, a3)
}
function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd)
    var HIGH_OFFSET = 4294967296
    var offset = offset_high * HIGH_OFFSET + (offset_low >>> 0)
    var DOUBLE_LIMIT = 9007199254740992
    if (offset <= -DOUBLE_LIMIT || offset >= DOUBLE_LIMIT) {
      return -61
    }
    FS.llseek(stream, offset, whence)
    ;(tempI64 = [
      stream.position >>> 0,
      ((tempDouble = stream.position),
      +Math_abs(tempDouble) >= +1
        ? tempDouble > +0
          ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) |
              0) >>>
            0
          : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>>
            0
        : 0),
    ]),
      (HEAP32[newOffset >> 2] = tempI64[0]),
      (HEAP32[(newOffset + 4) >> 2] = tempI64[1])
    if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null
    return 0
  } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e)
    return e.errno
  }
}
function ___wasi_fd_seek(a0, a1, a2, a3, a4) {
  return _fd_seek(a0, a1, a2, a3, a4)
}
function _fd_write(fd, iov, iovcnt, pnum) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd)
    var num = SYSCALLS.doWritev(stream, iov, iovcnt)
    HEAP32[pnum >> 2] = num
    return 0
  } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e)
    return e.errno
  }
}
function ___wasi_fd_write(a0, a1, a2, a3) {
  return _fd_write(a0, a1, a2, a3)
}
function _emscripten_get_heap_size() {
  return HEAPU8.length
}
function emscripten_realloc_buffer(size) {
  try {
    var newBuffer = new ArrayBuffer(size)
    if (newBuffer.byteLength != size) return
    new Int8Array(newBuffer).set(HEAP8)
    _emscripten_replace_memory(newBuffer)
    updateGlobalBufferAndViews(newBuffer)
    return 1
  } catch (e) {}
}
function _emscripten_resize_heap(requestedSize) {
  var oldSize = _emscripten_get_heap_size()
  var PAGE_MULTIPLE = 16777216
  var maxHeapSize = 2147483648 - PAGE_MULTIPLE
  if (requestedSize > maxHeapSize) {
    return false
  }
  var minHeapSize = 16777216
  for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
    var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown)
    overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296)
    var newSize = Math.min(
      maxHeapSize,
      alignUp(
        Math.max(minHeapSize, requestedSize, overGrownHeapSize),
        PAGE_MULTIPLE
      )
    )
    var replacement = emscripten_realloc_buffer(newSize)
    if (replacement) {
      return true
    }
  }
  return false
}
function _emscripten_memcpy_big(dest, src, num) {
  HEAPU8.copyWithin(dest, src, src + num)
}
var FSNode = function(parent, name, mode, rdev) {
  if (!parent) {
    parent = this
  }
  this.parent = parent
  this.mount = parent.mount
  this.mounted = null
  this.id = FS.nextInode++
  this.name = name
  this.mode = mode
  this.node_ops = {}
  this.stream_ops = {}
  this.rdev = rdev
}
var readMode = 292 | 73
var writeMode = 146
Object.defineProperties(FSNode.prototype, {
  read: {
    get: function() {
      return (this.mode & readMode) === readMode
    },
    set: function(val) {
      val ? (this.mode |= readMode) : (this.mode &= ~readMode)
    },
  },
  write: {
    get: function() {
      return (this.mode & writeMode) === writeMode
    },
    set: function(val) {
      val ? (this.mode |= writeMode) : (this.mode &= ~writeMode)
    },
  },
  isFolder: {
    get: function() {
      return FS.isDir(this.mode)
    },
  },
  isDevice: {
    get: function() {
      return FS.isChrdev(this.mode)
    },
  },
})
FS.FSNode = FSNode
FS.staticInit()
if (ENVIRONMENT_IS_NODE) {
  var fs = require('fs')
  var NODEJS_PATH = require('path')
  NODEFS.staticInit()
}
var ASSERTIONS = false
function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1
  var u8array = new Array(len)
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length)
  if (dontAddNull) u8array.length = numBytesWritten
  return u8array
}
function intArrayToString(array) {
  var ret = []
  for (var i = 0; i < array.length; i++) {
    var chr = array[i]
    if (chr > 255) {
      if (ASSERTIONS) {
        assert(
          false,
          'Character code ' +
            chr +
            ' (' +
            String.fromCharCode(chr) +
            ')  at offset ' +
            i +
            ' not in 0x00-0xFF.'
        )
      }
      chr &= 255
    }
    ret.push(String.fromCharCode(chr))
  }
  return ret.join('')
}
var decodeBase64 =
  typeof atob === 'function'
    ? atob
    : function(input) {
        var keyStr =
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
        var output = ''
        var chr1, chr2, chr3
        var enc1, enc2, enc3, enc4
        var i = 0
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '')
        do {
          enc1 = keyStr.indexOf(input.charAt(i++))
          enc2 = keyStr.indexOf(input.charAt(i++))
          enc3 = keyStr.indexOf(input.charAt(i++))
          enc4 = keyStr.indexOf(input.charAt(i++))
          chr1 = (enc1 << 2) | (enc2 >> 4)
          chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
          chr3 = ((enc3 & 3) << 6) | enc4
          output = output + String.fromCharCode(chr1)
          if (enc3 !== 64) {
            output = output + String.fromCharCode(chr2)
          }
          if (enc4 !== 64) {
            output = output + String.fromCharCode(chr3)
          }
        } while (i < input.length)
        return output
      }
function intArrayFromBase64(s) {
  if (typeof ENVIRONMENT_IS_NODE === 'boolean' && ENVIRONMENT_IS_NODE) {
    var buf
    try {
      buf = Buffer.from(s, 'base64')
    } catch (_) {
      buf = new Buffer(s, 'base64')
    }
    return new Uint8Array(buf['buffer'], buf['byteOffset'], buf['byteLength'])
  }
  try {
    var decoded = decodeBase64(s)
    var bytes = new Uint8Array(decoded.length)
    for (var i = 0; i < decoded.length; ++i) {
      bytes[i] = decoded.charCodeAt(i)
    }
    return bytes
  } catch (_) {
    throw new Error('Converting base64 string to bytes failed.')
  }
}
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return
  }
  return intArrayFromBase64(filename.slice(dataURIPrefix.length))
}
var asmGlobalArg = {
  Math: Math,
  Int8Array: Int8Array,
  Int16Array: Int16Array,
  Int32Array: Int32Array,
  Uint8Array: Uint8Array,
  Uint16Array: Uint16Array,
  Float32Array: Float32Array,
  Float64Array: Float64Array,
}
var asmLibraryArg = {
  a: abort,
  b: setTempRet0,
  c: getTempRet0,
  d: ___setErrNo,
  e: ___syscall221,
  f: ___syscall5,
  g: ___syscall54,
  h: ___wasi_fd_close,
  i: ___wasi_fd_read,
  j: ___wasi_fd_seek,
  k: ___wasi_fd_write,
  l: _emscripten_get_heap_size,
  m: _emscripten_memcpy_big,
  n: _emscripten_resize_heap,
  o: _fd_close,
  p: _fd_read,
  q: _fd_seek,
  r: _fd_write,
  s: tempDoublePtr,
} // EMSCRIPTEN_START_ASM
var asm = /** @suppress {uselessCode} */ (function(global, env, buffer) {
  'almost asm'
  var a = new global.Int8Array(buffer),
    b = new global.Int16Array(buffer),
    c = new global.Int32Array(buffer),
    d = new global.Uint8Array(buffer),
    e = new global.Uint16Array(buffer),
    f = new global.Float32Array(buffer),
    g = new global.Float64Array(buffer),
    h = env.s | 0,
    i = 0,
    j = 0,
    k = 0,
    l = 0,
    m = 0,
    n = 0,
    o = 0,
    p = 0.0,
    q = global.Math.imul,
    r = global.Math.clz32,
    s = env.a,
    t = env.b,
    u = env.c,
    v = env.d,
    w = env.e,
    x = env.f,
    y = env.g,
    z = env.h,
    A = env.i,
    B = env.j,
    C = env.k,
    D = env.l,
    E = env.m,
    F = env.n,
    G = env.o,
    H = env.p,
    I = env.q,
    J = env.r,
    K = 7024,
    L = 5249904,
    M = 0.0
  function N(newBuffer) {
    a = new Int8Array(newBuffer)
    d = new Uint8Array(newBuffer)
    b = new Int16Array(newBuffer)
    e = new Uint16Array(newBuffer)
    c = new Int32Array(newBuffer)
    f = new Float32Array(newBuffer)
    g = new Float64Array(newBuffer)
    buffer = newBuffer
    return true
  }
  // EMSCRIPTEN_START_FUNCS
  function ta(e, f, g, h, i, j) {
    e = e | 0
    f = f | 0
    g = g | 0
    h = h | 0
    i = i | 0
    j = j | 0
    var k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0,
      L = 0,
      M = 0,
      N = 0,
      O = 0,
      P = 0,
      Q = 0,
      R = 0,
      S = 0,
      T = 0,
      U = 0,
      V = 0,
      W = 0,
      X = 0,
      Y = 0,
      Z = 0,
      _ = 0,
      $ = 0,
      aa = 0,
      ba = 0,
      ca = 0,
      da = 0,
      ea = 0,
      fa = 0,
      ga = 0,
      ha = 0,
      ia = 0,
      ja = 0,
      ka = 0,
      la = 0,
      ma = 0,
      na = 0,
      oa = 0,
      qa = 0,
      sa = 0,
      ta = 0,
      va = 0,
      wa = 0,
      xa = 0,
      ya = 0,
      za = 0,
      Aa = 0,
      Ba = 0,
      Ca = 0,
      Da = 0,
      Ea = 0,
      Fa = 0,
      Ga = 0,
      Ha = 0,
      Ia = 0,
      Ja = 0,
      Ka = 0,
      La = 0,
      Ma = 0,
      Na = 0,
      Oa = 0,
      Pa = 0,
      Qa = 0,
      Ra = 0,
      Sa = 0,
      Ta = 0,
      Ua = 0,
      Va = 0,
      Wa = 0,
      Xa = 0,
      Ya = 0,
      Za = 0,
      _a = 0,
      $a = 0,
      ab = 0,
      bb = 0,
      cb = 0,
      db = 0,
      eb = 0,
      fb = 0,
      gb = 0,
      hb = 0,
      ib = 0,
      jb = 0,
      kb = 0,
      lb = 0,
      mb = 0,
      nb = 0,
      ob = 0,
      pb = 0,
      qb = 0,
      rb = 0,
      sb = 0,
      tb = 0,
      ub = 0,
      vb = 0,
      wb = 0,
      xb = 0,
      yb = 0,
      zb = 0,
      Ab = 0,
      Bb = 0,
      Cb = 0,
      Db = 0,
      Eb = 0,
      Fb = 0,
      Gb = 0,
      Hb = 0,
      Ib = 0,
      Jb = 0,
      Kb = 0,
      Lb = 0,
      Mb = 0,
      Nb = 0,
      Ob = 0,
      Pb = 0,
      Qb = 0,
      Rb = 0,
      Sb = 0,
      Tb = 0,
      Ub = 0,
      Vb = 0,
      Wb = 0,
      Xb = 0,
      Yb = 0,
      Zb = 0,
      _b = 0,
      $b = 0,
      ac = 0,
      dc = 0,
      ec = 0,
      fc = 0,
      gc = 0,
      hc = 0,
      ic = 0,
      jc = 0,
      kc = 0,
      lc = 0,
      mc = 0,
      nc = 0,
      oc = 0,
      pc = 0,
      qc = 0,
      rc = 0,
      sc = 0,
      tc = 0,
      uc = 0,
      vc = 0,
      wc = 0,
      xc = 0,
      yc = 0,
      zc = 0,
      Ac = 0,
      Bc = 0,
      Cc = 0,
      Dc = 0,
      Ec = 0,
      Fc = 0,
      Gc = 0,
      Hc = 0,
      Ic = 0,
      Jc = 0,
      Kc = 0,
      Lc = 0,
      Mc = 0,
      Nc = 0,
      Oc = 0,
      Pc = 0,
      Qc = 0,
      Rc = 0,
      Sc = 0,
      Tc = 0,
      Uc = 0,
      Vc = 0,
      Wc = 0,
      Xc = 0,
      Yc = 0,
      Zc = 0,
      _c = 0,
      $c = 0,
      ad = 0,
      bd = 0,
      cd = 0,
      dd = 0,
      ed = 0,
      fd = 0,
      gd = 0,
      hd = 0,
      id = 0,
      jd = 0,
      kd = 0,
      ld = 0,
      md = 0,
      nd = 0,
      od = 0,
      pd = 0,
      qd = 0,
      rd = 0,
      sd = 0,
      td = 0,
      ud = 0,
      vd = 0,
      wd = 0,
      xd = 0,
      yd = 0,
      zd = 0,
      Ad = 0,
      Bd = 0,
      Cd = 0,
      Dd = 0,
      Ed = 0,
      Fd = 0,
      Gd = 0,
      Hd = 0,
      Id = 0,
      Jd = 0,
      Kd = 0,
      Ld = 0,
      Md = 0,
      Nd = 0,
      Od = 0,
      Pd = 0,
      Qd = 0,
      Rd = 0,
      Sd = 0,
      Td = 0,
      Ud = 0,
      Vd = 0,
      Wd = 0,
      Xd = 0,
      Yd = 0,
      Zd = 0,
      _d = 0,
      $d = 0,
      ae = 0,
      be = 0,
      ce = 0,
      de = 0,
      ee = 0,
      fe = 0,
      ge = 0,
      he = 0,
      ie = 0,
      je = 0,
      ke = 0,
      le = 0,
      me = 0,
      ne = 0,
      oe = 0,
      pe = 0,
      qe = 0,
      re = 0,
      se = 0,
      te = 0,
      ue = 0,
      ve = 0,
      we = 0,
      xe = 0,
      ye = 0,
      ze = 0,
      Ae = 0,
      Be = 0,
      Ce = 0,
      De = 0,
      Ee = 0,
      Fe = 0,
      Ge = 0,
      He = 0,
      Ie = 0,
      Je = 0,
      Ke = 0,
      Le = 0,
      Me = 0,
      Ne = 0,
      Oe = 0,
      Pe = 0,
      Qe = 0,
      Re = 0,
      Se = 0,
      Te = 0,
      Ue = 0,
      Ve = 0,
      We = 0,
      Xe = 0,
      Ye = 0,
      Ze = 0,
      _e = 0,
      $e = 0,
      af = 0,
      bf = 0,
      cf = 0,
      df = 0,
      ef = 0,
      ff = 0,
      gf = 0,
      hf = 0,
      jf = 0,
      kf = 0,
      lf = 0,
      mf = 0,
      nf = 0,
      of = 0,
      pf = 0,
      qf = 0,
      rf = 0,
      sf = 0,
      tf = 0,
      uf = 0,
      vf = 0,
      wf = 0,
      xf = 0,
      yf = 0,
      zf = 0,
      Af = 0,
      Bf = 0,
      Cf = 0,
      Df = 0,
      Ef = 0,
      Ff = 0,
      Gf = 0,
      Hf = 0,
      If = 0,
      Jf = 0,
      Kf = 0,
      Lf = 0,
      Mf = 0,
      Nf = 0,
      Of = 0,
      Pf = 0,
      Qf = 0,
      Rf = 0,
      Sf = 0,
      Tf = 0,
      Uf = 0,
      Vf = 0,
      Wf = 0,
      Xf = 0,
      Yf = 0,
      Zf = 0,
      _f = 0,
      $f = 0,
      ag = 0,
      bg = 0,
      cg = 0,
      dg = 0,
      eg = 0,
      fg = 0,
      gg = 0,
      hg = 0,
      ig = 0,
      jg = 0,
      kg = 0,
      lg = 0,
      mg = 0,
      ng = 0,
      og = 0
    k = K
    K = (K + 192) | 0
    l = (k + 168) | 0
    m = (k + 72) | 0
    n = (k + 160) | 0
    o = k
    p = (k + 92) | 0
    q = (k + 88) | 0
    s = (j | 0) == 0
    if (s) t = 1
    else {
      j = (e + 28760) | 0
      u = c[(j + 4) >> 2] | 0
      t =
        ((u >>> 0 > 0) |
          (((u | 0) == 0) & ((c[j >> 2] | 0) >>> 0 > 33554432))) &
        1
    }
    if (i >>> 0 > 131071) {
      v = -72
      K = k
      return v | 0
    }
    j = pa(e, h, i) | 0
    u = j >>> 0 < 4294967177
    w = u ? (h + j) | 0 : h
    h = (i - (u ? j : 0)) | 0
    if (!u) {
      v = j
      K = k
      return v | 0
    }
    j = (e + 28956) | 0
    u = c[j >> 2] | 0
    i = ra(e, q, w, h) | 0
    a: do
      if (i >>> 0 < 4294967177) {
        x = (w + i) | 0
        y = (h - i) | 0
        do
          if (!u) {
            if (s) {
              z = c[q >> 2] | 0
              if ((z | 0) > 4) {
                A = z
                B = 11
              } else {
                C = z
                B = 13
              }
            } else {
              z = (e + 28760) | 0
              D = c[(z + 4) >> 2] | 0
              E = c[q >> 2] | 0
              if (
                ((D >>> 0 > 0) |
                  (((D | 0) == 0) & ((c[z >> 2] | 0) >>> 0 > 16777216))) &
                ((E | 0) > 4)
              ) {
                A = E
                B = 11
              } else {
                C = E
                B = 13
              }
            }
            if ((B | 0) == 11) {
              E = c[(e + 8) >> 2] | 0
              z = c[(E + 4) >> 2] | 0
              D = (E + 8) | 0
              E = 1 << z
              F = 0
              G = 0
              do {
                F = (F + (((d[(D + (G << 3) + 2) >> 0] | 0) > 22) & 1)) | 0
                G = (G + 1) | 0
              } while (G >>> 0 < E >>> 0)
              c[j >> 2] = 0
              if ((F << (8 - z)) >>> 0 < 20) H = A
              else {
                I = A
                break
              }
            } else if ((B | 0) == 13) {
              c[j >> 2] = 0
              H = C
            }
            E = (f + g) | 0
            G = c[(e + 28912) >> 2] | 0
            c[n >> 2] = G
            D = (G + (c[(e + 28928) >> 2] | 0)) | 0
            J = c[(e + 28732) >> 2] | 0
            L = c[(e + 28736) >> 2] | 0
            M = c[(e + 28740) >> 2] | 0
            b: do
              if (!H) {
                N = G
                O = f
                B = 327
              } else {
                c[(e + 28812) >> 2] = 1
                P = (o + 44) | 0
                Q = (e + 26668) | 0
                c[P >> 2] = c[Q >> 2]
                c[(P + 4) >> 2] = c[(Q + 4) >> 2]
                c[(P + 8) >> 2] = c[(Q + 8) >> 2]
                c: do
                  if (y) {
                    R = (o + 12) | 0
                    c[R >> 2] = x
                    S = (x + 4) | 0
                    T = (o + 16) | 0
                    c[T >> 2] = S
                    do
                      if (y >>> 0 > 3) {
                        U = (y + -4) | 0
                        V = (x + U) | 0
                        c[(o + 8) >> 2] = V
                        W =
                          d[V >> 0] |
                          (d[(V + 1) >> 0] << 8) |
                          (d[(V + 2) >> 0] << 16) |
                          (d[(V + 3) >> 0] << 24)
                        c[o >> 2] = W
                        X = a[(x + (y + -1)) >> 0] | 0
                        Y = (o + 4) | 0
                        if ((X << 24) >> 24) {
                          Z = (8 - ((r((X & 255) | 0) | 0) ^ 31)) | 0
                          c[Y >> 2] = Z
                          if (y >>> 0 < 4294967177) {
                            _ = U
                            $ = V
                            aa = o
                            ba = W
                            ca = Y
                            da = Z
                            break
                          } else break c
                        } else {
                          c[Y >> 2] = 0
                          break c
                        }
                      } else {
                        c[(o + 8) >> 2] = x
                        Y = d[x >> 0] | 0
                        c[o >> 2] = Y
                        switch (y | 0) {
                          case 2: {
                            ea = Y
                            B = 218
                            break
                          }
                          case 3: {
                            Z = ((d[(x + 2) >> 0] | 0) << 16) | Y
                            c[o >> 2] = Z
                            ea = Z
                            B = 218
                            break
                          }
                          default:
                            fa = Y
                        }
                        if ((B | 0) == 218) {
                          Y = (((d[(x + 1) >> 0] | 0) << 8) + ea) | 0
                          c[o >> 2] = Y
                          fa = Y
                        }
                        Y = a[(x + (y + -1)) >> 0] | 0
                        Z = (o + 4) | 0
                        if (!((Y << 24) >> 24)) {
                          c[Z >> 2] = 0
                          break c
                        } else {
                          W =
                            (40 - (y << 3) - ((r((Y & 255) | 0) | 0) ^ 31)) | 0
                          c[Z >> 2] = W
                          _ = 0
                          $ = x
                          aa = o
                          ba = fa
                          ca = Z
                          da = W
                          break
                        }
                      }
                    while (0)
                    W = (x + _) | 0
                    Z = c[e >> 2] | 0
                    Y = c[(Z + 4) >> 2] | 0
                    V = (Y + da) | 0
                    U = (ba >>> ((0 - V) & 31)) & c[(3808 + (Y << 2)) >> 2]
                    c[ca >> 2] = V
                    Y = (o + 20) | 0
                    c[Y >> 2] = U
                    do
                      if (V >>> 0 <= 32) {
                        U = (o + 8) | 0
                        if ((_ | 0) >= 4) {
                          X = (_ - (V >>> 3)) | 0
                          ga = (x + X) | 0
                          c[U >> 2] = ga
                          ha = V & 7
                          c[ca >> 2] = ha
                          ia =
                            d[ga >> 0] |
                            (d[(ga + 1) >> 0] << 8) |
                            (d[(ga + 2) >> 0] << 16) |
                            (d[(ga + 3) >> 0] << 24)
                          c[aa >> 2] = ia
                          ja = X
                          ka = ga
                          la = ia
                          ma = ha
                          break
                        }
                        ha = V >>> 3
                        ia = ((W + (0 - ha)) | 0) >>> 0 < x >>> 0 ? _ : ha
                        ha = (_ - ia) | 0
                        ga = (x + ha) | 0
                        X = (V - (ia << 3)) | 0
                        if (!_) {
                          ja = 0
                          ka = $
                          la = ba
                          ma = V
                        } else {
                          c[U >> 2] = ga
                          c[ca >> 2] = X
                          U =
                            d[ga >> 0] |
                            (d[(ga + 1) >> 0] << 8) |
                            (d[(ga + 2) >> 0] << 16) |
                            (d[(ga + 3) >> 0] << 24)
                          c[aa >> 2] = U
                          ja = ha
                          ka = ga
                          la = U
                          ma = X
                        }
                      } else {
                        ja = _
                        ka = $
                        la = ba
                        ma = V
                      }
                    while (0)
                    V = (x + ja) | 0
                    W = (o + 24) | 0
                    c[W >> 2] = Z + 8
                    X = c[(e + 8) >> 2] | 0
                    U = c[(X + 4) >> 2] | 0
                    ga = (U + ma) | 0
                    ha = (la >>> ((0 - ga) & 31)) & c[(3808 + (U << 2)) >> 2]
                    c[ca >> 2] = ga
                    U = (o + 28) | 0
                    c[U >> 2] = ha
                    do
                      if (ga >>> 0 <= 32) {
                        ha = (o + 8) | 0
                        if ((ja | 0) >= 4) {
                          ia = (ja - (ga >>> 3)) | 0
                          na = (x + ia) | 0
                          c[ha >> 2] = na
                          oa = ga & 7
                          c[ca >> 2] = oa
                          qa =
                            d[na >> 0] |
                            (d[(na + 1) >> 0] << 8) |
                            (d[(na + 2) >> 0] << 16) |
                            (d[(na + 3) >> 0] << 24)
                          c[aa >> 2] = qa
                          sa = ia
                          ta = na
                          va = qa
                          wa = oa
                          break
                        }
                        oa = ga >>> 3
                        qa = ((V + (0 - oa)) | 0) >>> 0 < x >>> 0 ? ja : oa
                        oa = (ja - qa) | 0
                        na = (x + oa) | 0
                        ia = (ga - (qa << 3)) | 0
                        if (!ja) {
                          sa = 0
                          ta = ka
                          va = la
                          wa = ga
                        } else {
                          c[ha >> 2] = na
                          c[ca >> 2] = ia
                          ha =
                            d[na >> 0] |
                            (d[(na + 1) >> 0] << 8) |
                            (d[(na + 2) >> 0] << 16) |
                            (d[(na + 3) >> 0] << 24)
                          c[aa >> 2] = ha
                          sa = oa
                          ta = na
                          va = ha
                          wa = ia
                        }
                      } else {
                        sa = ja
                        ta = ka
                        va = la
                        wa = ga
                      }
                    while (0)
                    ga = (x + sa) | 0
                    V = (o + 32) | 0
                    c[V >> 2] = X + 8
                    Z = c[(e + 4) >> 2] | 0
                    ia = c[(Z + 4) >> 2] | 0
                    ha = (ia + wa) | 0
                    na = (va >>> ((0 - ha) & 31)) & c[(3808 + (ia << 2)) >> 2]
                    c[ca >> 2] = ha
                    ia = (o + 36) | 0
                    c[ia >> 2] = na
                    if (ha >>> 0 > 32) {
                      c[(o + 40) >> 2] = Z + 8
                      break
                    }
                    na = (o + 8) | 0
                    if ((sa | 0) < 4)
                      if (sa) {
                        oa = ha >>> 3
                        qa = ((ga + (0 - oa)) | 0) >>> 0 < x >>> 0 ? sa : oa
                        oa = (ga + (0 - qa)) | 0
                        c[na >> 2] = oa
                        xa = (ha - (qa << 3)) | 0
                        c[ca >> 2] = xa
                        c[aa >> 2] =
                          d[oa >> 0] |
                          (d[(oa + 1) >> 0] << 8) |
                          (d[(oa + 2) >> 0] << 16) |
                          (d[(oa + 3) >> 0] << 24)
                        qa = (o + 40) | 0
                        c[qa >> 2] = Z + 8
                        if (xa >>> 0 > 32) break
                        else {
                          ya = xa
                          za = oa
                          Aa = qa
                        }
                      } else {
                        Ba = ta
                        Ca = ha
                        B = 238
                      }
                    else {
                      qa = (ga + (0 - (ha >>> 3))) | 0
                      c[na >> 2] = qa
                      ga = ha & 7
                      c[ca >> 2] = ga
                      c[aa >> 2] =
                        d[qa >> 0] |
                        (d[(qa + 1) >> 0] << 8) |
                        (d[(qa + 2) >> 0] << 16) |
                        (d[(qa + 3) >> 0] << 24)
                      Ba = qa
                      Ca = ga
                      B = 238
                    }
                    if ((B | 0) == 238) {
                      ga = (o + 40) | 0
                      c[ga >> 2] = Z + 8
                      ya = Ca
                      za = Ba
                      Aa = ga
                    }
                    ga = (t | 0) != 0
                    Z = (o + 48) | 0
                    qa = (o + 52) | 0
                    ha = (m + 4) | 0
                    oa = (m + 8) | 0
                    xa = (E + -32) | 0
                    Da = J
                    Ea = L
                    Fa = za
                    Ga = S
                    Ha = ya
                    Ia = H
                    Ja = f
                    d: while (1) {
                      do
                        if (Fa >>> 0 < Ga >>> 0) {
                          Ka = c[R >> 2] | 0
                          if ((Fa | 0) == (Ka | 0)) {
                            La = Ha
                            Ma = Fa
                            break
                          }
                          Na = Ha >>> 3
                          Oa =
                            ((Fa + (0 - Na)) | 0) >>> 0 < Ka >>> 0
                              ? (Fa - Ka) | 0
                              : Na
                          Na = (Fa + (0 - Oa)) | 0
                          c[na >> 2] = Na
                          Pa = Na
                          Qa = (Ha - (Oa << 3)) | 0
                          B = 246
                        } else {
                          Oa = (Fa + (0 - (Ha >>> 3))) | 0
                          c[na >> 2] = Oa
                          Pa = Oa
                          Qa = Ha & 7
                          B = 246
                        }
                      while (0)
                      if ((B | 0) == 246) {
                        B = 0
                        c[ca >> 2] = Qa
                        c[aa >> 2] =
                          d[Pa >> 0] |
                          (d[(Pa + 1) >> 0] << 8) |
                          (d[(Pa + 2) >> 0] << 16) |
                          (d[(Pa + 3) >> 0] << 24)
                        La = Qa
                        Ma = Pa
                      }
                      if (!Ia) {
                        B = 318
                        break
                      }
                      Ra = (Ia + -1) | 0
                      Oa = c[W >> 2] | 0
                      Na = c[Y >> 2] | 0
                      Ka = a[(Oa + (Na << 3) + 2) >> 0] | 0
                      Sa = Ka & 255
                      Ta = c[Aa >> 2] | 0
                      Ua = c[ia >> 2] | 0
                      Va = a[(Ta + (Ua << 3) + 2) >> 0] | 0
                      Wa = Va & 255
                      Xa = c[V >> 2] | 0
                      Ya = c[U >> 2] | 0
                      Za = a[(Xa + (Ya << 3) + 2) >> 0] | 0
                      _a = Za & 255
                      $a = (Wa + Sa) | 0
                      ab = c[(Oa + (Na << 3) + 4) >> 2] | 0
                      bb = c[(Ta + (Ua << 3) + 4) >> 2] | 0
                      cb = c[(Xa + (Ya << 3) + 4) >> 2] | 0
                      e: do
                        if (!((Za << 24) >> 24)) {
                          db = Ma
                          eb = La
                          fb = 0
                          B = 263
                        } else {
                          do
                            if (!(ga & ((Za & 255) > 24))) {
                              gb = (c[aa >> 2] << (La & 31)) >>> ((0 - Za) & 31)
                              hb = (La + _a) | 0
                              c[ca >> 2] = hb
                              ib = (gb + cb) | 0
                              do
                                if (hb >>> 0 > 32) {
                                  jb = Ma
                                  kb = hb
                                } else {
                                  if (Ma >>> 0 >= Ga >>> 0) {
                                    gb = (Ma + (0 - (hb >>> 3))) | 0
                                    c[na >> 2] = gb
                                    lb = hb & 7
                                    c[ca >> 2] = lb
                                    c[aa >> 2] =
                                      d[gb >> 0] |
                                      (d[(gb + 1) >> 0] << 8) |
                                      (d[(gb + 2) >> 0] << 16) |
                                      (d[(gb + 3) >> 0] << 24)
                                    jb = gb
                                    kb = lb
                                    break
                                  }
                                  lb = c[R >> 2] | 0
                                  if ((Ma | 0) == (lb | 0)) {
                                    jb = Ma
                                    kb = hb
                                    break
                                  }
                                  gb = hb >>> 3
                                  mb =
                                    ((Ma + (0 - gb)) | 0) >>> 0 < lb >>> 0
                                      ? (Ma - lb) | 0
                                      : gb
                                  gb = (Ma + (0 - mb)) | 0
                                  c[na >> 2] = gb
                                  lb = (hb - (mb << 3)) | 0
                                  c[ca >> 2] = lb
                                  c[aa >> 2] =
                                    d[gb >> 0] |
                                    (d[(gb + 1) >> 0] << 8) |
                                    (d[(gb + 2) >> 0] << 16) |
                                    (d[(gb + 3) >> 0] << 24)
                                  jb = gb
                                  kb = lb
                                }
                              while (0)
                              if ((Za & 255) < 2) {
                                db = jb
                                eb = kb
                                fb = ib
                                B = 263
                                break e
                              } else {
                                nb = jb
                                ob = kb
                                pb = ib
                              }
                            } else {
                              hb = (32 - La) | 0
                              lb = hb >>> 0 > _a >>> 0 ? _a : hb
                              hb = (_a - lb) | 0
                              gb = c[aa >> 2] | 0
                              mb = (lb + La) | 0
                              c[ca >> 2] = mb
                              qb =
                                ((((gb << (La & 31)) >>> ((0 - lb) & 31)) <<
                                  hb) +
                                  cb) |
                                0
                              do
                                if (mb >>> 0 > 32) {
                                  rb = Ma
                                  sb = gb
                                  tb = mb
                                } else {
                                  if (Ma >>> 0 >= Ga >>> 0) {
                                    lb = (Ma + (0 - (mb >>> 3))) | 0
                                    c[na >> 2] = lb
                                    ub = mb & 7
                                    c[ca >> 2] = ub
                                    vb =
                                      d[lb >> 0] |
                                      (d[(lb + 1) >> 0] << 8) |
                                      (d[(lb + 2) >> 0] << 16) |
                                      (d[(lb + 3) >> 0] << 24)
                                    c[aa >> 2] = vb
                                    rb = lb
                                    sb = vb
                                    tb = ub
                                    break
                                  }
                                  ub = c[R >> 2] | 0
                                  if ((Ma | 0) == (ub | 0)) {
                                    rb = Ma
                                    sb = gb
                                    tb = mb
                                    break
                                  }
                                  vb = mb >>> 3
                                  lb =
                                    ((Ma + (0 - vb)) | 0) >>> 0 < ub >>> 0
                                      ? (Ma - ub) | 0
                                      : vb
                                  vb = (Ma + (0 - lb)) | 0
                                  c[na >> 2] = vb
                                  ub = (mb - (lb << 3)) | 0
                                  c[ca >> 2] = ub
                                  lb =
                                    d[vb >> 0] |
                                    (d[(vb + 1) >> 0] << 8) |
                                    (d[(vb + 2) >> 0] << 16) |
                                    (d[(vb + 3) >> 0] << 24)
                                  c[aa >> 2] = lb
                                  rb = vb
                                  sb = lb
                                  tb = ub
                                }
                              while (0)
                              mb = (tb + hb) | 0
                              if (!hb) {
                                nb = rb
                                ob = tb
                                pb = qb
                                break
                              }
                              c[ca >> 2] = mb
                              nb = rb
                              ob = mb
                              pb =
                                (((sb << (tb & 31)) >>> ((0 - hb) & 31)) + qb) |
                                0
                            }
                          while (0)
                          c[qa >> 2] = c[Z >> 2]
                          c[Z >> 2] = c[P >> 2]
                          c[P >> 2] = pb
                          wb = pb
                          xb = nb
                          yb = ob
                        }
                      while (0)
                      f: do
                        if ((B | 0) == 263) {
                          B = 0
                          cb = (fb + (((ab | 0) == 0) & 1)) | 0
                          switch (cb | 0) {
                            case 0: {
                              wb = c[P >> 2] | 0
                              xb = db
                              yb = eb
                              break f
                              break
                            }
                            case 3: {
                              _a = ((c[P >> 2] | 0) + -1) | 0
                              zb = (_a + (((_a | 0) == 0) & 1)) | 0
                              B = 266
                              break
                            }
                            default: {
                              _a = c[(o + 44 + (cb << 2)) >> 2] | 0
                              Za = (_a + (((_a | 0) == 0) & 1)) | 0
                              if ((cb | 0) == 1) Ab = Za
                              else {
                                zb = Za
                                B = 266
                              }
                            }
                          }
                          if ((B | 0) == 266) {
                            B = 0
                            c[qa >> 2] = c[Z >> 2]
                            Ab = zb
                          }
                          c[Z >> 2] = c[P >> 2]
                          c[P >> 2] = Ab
                          wb = Ab
                          xb = db
                          yb = eb
                        }
                      while (0)
                      Za = (yb + Wa) | 0
                      if (!((Va << 24) >> 24)) {
                        Bb = yb
                        Cb = 0
                      } else {
                        cb = (c[aa >> 2] << (yb & 31)) >>> ((0 - Va) & 31)
                        c[ca >> 2] = Za
                        Bb = Za
                        Cb = cb
                      }
                      cb = (Cb + bb) | 0
                      do
                        if (($a >>> 0 < 20) | (Bb >>> 0 > 32)) {
                          Db = Bb
                          Eb = xb
                        } else {
                          if (xb >>> 0 >= Ga >>> 0) {
                            Za = (xb + (0 - (Bb >>> 3))) | 0
                            c[na >> 2] = Za
                            _a = Bb & 7
                            c[ca >> 2] = _a
                            c[aa >> 2] =
                              d[Za >> 0] |
                              (d[(Za + 1) >> 0] << 8) |
                              (d[(Za + 2) >> 0] << 16) |
                              (d[(Za + 3) >> 0] << 24)
                            Db = _a
                            Eb = Za
                            break
                          }
                          Za = c[R >> 2] | 0
                          if ((xb | 0) == (Za | 0)) {
                            Db = Bb
                            Eb = xb
                            break
                          }
                          _a = Bb >>> 3
                          mb =
                            ((xb + (0 - _a)) | 0) >>> 0 < Za >>> 0
                              ? (xb - Za) | 0
                              : _a
                          _a = (xb + (0 - mb)) | 0
                          c[na >> 2] = _a
                          Za = (Bb - (mb << 3)) | 0
                          c[ca >> 2] = Za
                          c[aa >> 2] =
                            d[_a >> 0] |
                            (d[(_a + 1) >> 0] << 8) |
                            (d[(_a + 2) >> 0] << 16) |
                            (d[(_a + 3) >> 0] << 24)
                          Db = Za
                          Eb = _a
                        }
                      while (0)
                      $a = (Db + Sa) | 0
                      if (!((Ka << 24) >> 24)) {
                        Fb = Db
                        Gb = 0
                      } else {
                        bb = (c[aa >> 2] << (Db & 31)) >>> ((0 - Ka) & 31)
                        c[ca >> 2] = $a
                        Fb = $a
                        Gb = bb
                      }
                      bb = (Gb + ab) | 0
                      do
                        if (Fb >>> 0 > 32) {
                          Hb = Eb
                          Ib = Fb
                        } else {
                          if (Eb >>> 0 >= Ga >>> 0) {
                            $a = (Eb + (0 - (Fb >>> 3))) | 0
                            c[na >> 2] = $a
                            Va = Fb & 7
                            c[ca >> 2] = Va
                            c[aa >> 2] =
                              d[$a >> 0] |
                              (d[($a + 1) >> 0] << 8) |
                              (d[($a + 2) >> 0] << 16) |
                              (d[($a + 3) >> 0] << 24)
                            Hb = $a
                            Ib = Va
                            break
                          }
                          Va = c[R >> 2] | 0
                          if ((Eb | 0) == (Va | 0)) {
                            Hb = Eb
                            Ib = Fb
                            break
                          }
                          $a = Fb >>> 3
                          Wa =
                            ((Eb + (0 - $a)) | 0) >>> 0 < Va >>> 0
                              ? (Eb - Va) | 0
                              : $a
                          $a = (Eb + (0 - Wa)) | 0
                          c[na >> 2] = $a
                          Va = (Fb - (Wa << 3)) | 0
                          c[ca >> 2] = Va
                          c[aa >> 2] =
                            d[$a >> 0] |
                            (d[($a + 1) >> 0] << 8) |
                            (d[($a + 2) >> 0] << 16) |
                            (d[($a + 3) >> 0] << 24)
                          Hb = $a
                          Ib = Va
                        }
                      while (0)
                      ab = b[(Oa + (Na << 3)) >> 1] | 0
                      Ka = d[(Oa + (Na << 3) + 3) >> 0] | 0
                      Sa = c[aa >> 2] | 0
                      Va = (Ib + Ka) | 0
                      $a = (Sa >>> ((0 - Va) & 31)) & c[(3808 + (Ka << 2)) >> 2]
                      c[ca >> 2] = Va
                      c[Y >> 2] = $a + (ab & 65535)
                      ab = b[(Ta + (Ua << 3)) >> 1] | 0
                      $a = d[(Ta + (Ua << 3) + 3) >> 0] | 0
                      Ka = (Va + $a) | 0
                      Va = (Sa >>> ((0 - Ka) & 31)) & c[(3808 + ($a << 2)) >> 2]
                      c[ca >> 2] = Ka
                      c[ia >> 2] = Va + (ab & 65535)
                      do
                        if (Ka >>> 0 > 32) {
                          Jb = Sa
                          Kb = Ka
                        } else {
                          if (Hb >>> 0 >= Ga >>> 0) {
                            ab = (Hb + (0 - (Ka >>> 3))) | 0
                            c[na >> 2] = ab
                            Va = Ka & 7
                            c[ca >> 2] = Va
                            $a =
                              d[ab >> 0] |
                              (d[(ab + 1) >> 0] << 8) |
                              (d[(ab + 2) >> 0] << 16) |
                              (d[(ab + 3) >> 0] << 24)
                            c[aa >> 2] = $a
                            Jb = $a
                            Kb = Va
                            break
                          }
                          Va = c[R >> 2] | 0
                          if ((Hb | 0) == (Va | 0)) {
                            Jb = Sa
                            Kb = Ka
                            break
                          }
                          $a = Ka >>> 3
                          ab =
                            ((Hb + (0 - $a)) | 0) >>> 0 < Va >>> 0
                              ? (Hb - Va) | 0
                              : $a
                          $a = (Hb + (0 - ab)) | 0
                          c[na >> 2] = $a
                          Va = (Ka - (ab << 3)) | 0
                          c[ca >> 2] = Va
                          ab =
                            d[$a >> 0] |
                            (d[($a + 1) >> 0] << 8) |
                            (d[($a + 2) >> 0] << 16) |
                            (d[($a + 3) >> 0] << 24)
                          c[aa >> 2] = ab
                          Jb = ab
                          Kb = Va
                        }
                      while (0)
                      Ka = b[(Xa + (Ya << 3)) >> 1] | 0
                      Sa = d[(Xa + (Ya << 3) + 3) >> 0] | 0
                      Ua = (Kb + Sa) | 0
                      Ta = (Jb >>> ((0 - Ua) & 31)) & c[(3808 + (Sa << 2)) >> 2]
                      c[ca >> 2] = Ua
                      c[U >> 2] = Ta + (Ka & 65535)
                      c[m >> 2] = bb
                      c[ha >> 2] = cb
                      c[oa >> 2] = wb
                      Ka = (Ja + bb) | 0
                      Ta = (bb + cb) | 0
                      Ua = c[n >> 2] | 0
                      Sa = (Ua + bb) | 0
                      Na = (Ka + (0 - wb)) | 0
                      g: do
                        if (
                          (((Ja + Ta) | 0) >>> 0 > xa >>> 0) |
                          (Sa >>> 0 > D >>> 0)
                        ) {
                          c[l >> 2] = c[m >> 2]
                          c[(l + 4) >> 2] = c[(m + 4) >> 2]
                          c[(l + 8) >> 2] = c[(m + 8) >> 2]
                          c[(l + 12) >> 2] = c[(m + 12) >> 2]
                          Lb = ua(Ja, E, l, n, D, J, L, M) | 0
                        } else {
                          Mb = Ja
                          Nb = Ua
                          Ob = (Mb + 16) | 0
                          do {
                            a[Mb >> 0] = a[Nb >> 0] | 0
                            Mb = (Mb + 1) | 0
                            Nb = (Nb + 1) | 0
                          } while ((Mb | 0) < (Ob | 0))
                          do
                            if (bb >>> 0 > 16) {
                              Oa = (Ua + 16) | 0
                              Va = (bb + -16) | 0
                              Mb = (Ja + 16) | 0
                              Nb = Oa
                              Ob = (Mb + 16) | 0
                              do {
                                a[Mb >> 0] = a[Nb >> 0] | 0
                                Mb = (Mb + 1) | 0
                                Nb = (Nb + 1) | 0
                              } while ((Mb | 0) < (Ob | 0))
                              Mb = (Ja + 32) | 0
                              Nb = (Ua + 32) | 0
                              Ob = (Mb + 16) | 0
                              do {
                                a[Mb >> 0] = a[Nb >> 0] | 0
                                Mb = (Mb + 1) | 0
                                Nb = (Nb + 1) | 0
                              } while ((Mb | 0) < (Ob | 0))
                              if ((Va | 0) < 33) break
                              qb = (Ja + 48) | 0
                              hb = Oa
                              do {
                                ab = hb
                                hb = (hb + 32) | 0
                                Mb = qb
                                Nb = hb
                                Ob = (Mb + 16) | 0
                                do {
                                  a[Mb >> 0] = a[Nb >> 0] | 0
                                  Mb = (Mb + 1) | 0
                                  Nb = (Nb + 1) | 0
                                } while ((Mb | 0) < (Ob | 0))
                                Mb = (qb + 16) | 0
                                Nb = (ab + 48) | 0
                                Ob = (Mb + 16) | 0
                                do {
                                  a[Mb >> 0] = a[Nb >> 0] | 0
                                  Mb = (Mb + 1) | 0
                                  Nb = (Nb + 1) | 0
                                } while ((Mb | 0) < (Ob | 0))
                                qb = (qb + 32) | 0
                              } while (qb >>> 0 < Ka >>> 0)
                            }
                          while (0)
                          c[n >> 2] = Sa
                          qb = Ka
                          do
                            if (wb >>> 0 > ((qb - Da) | 0) >>> 0) {
                              if (wb >>> 0 > ((qb - Ea) | 0) >>> 0) {
                                B = 297
                                break d
                              }
                              hb = (Na - Da) | 0
                              Oa = (M + hb) | 0
                              if (((Oa + cb) | 0) >>> 0 > M >>> 0) {
                                Va = (0 - hb) | 0
                                cc(Ka | 0, Oa | 0, Va | 0) | 0
                                ab = (hb + cb) | 0
                                c[ha >> 2] = ab
                                Pb = ab
                                Qb = Da
                                Rb = (Ka + Va) | 0
                                break
                              } else {
                                cc(Ka | 0, Oa | 0, cb | 0) | 0
                                Lb = Ta
                                break g
                              }
                            } else {
                              Pb = cb
                              Qb = Na
                              Rb = Ka
                            }
                          while (0)
                          if (wb >>> 0 > 15) {
                            qb = Qb
                            Oa = (Rb + Pb) | 0
                            Mb = Rb
                            Nb = qb
                            Ob = (Mb + 16) | 0
                            do {
                              a[Mb >> 0] = a[Nb >> 0] | 0
                              Mb = (Mb + 1) | 0
                              Nb = (Nb + 1) | 0
                            } while ((Mb | 0) < (Ob | 0))
                            Mb = (Rb + 16) | 0
                            Nb = (qb + 16) | 0
                            Ob = (Mb + 16) | 0
                            do {
                              a[Mb >> 0] = a[Nb >> 0] | 0
                              Mb = (Mb + 1) | 0
                              Nb = (Nb + 1) | 0
                            } while ((Mb | 0) < (Ob | 0))
                            if ((Pb | 0) < 33) {
                              Lb = Ta
                              break
                            }
                            Va = (Rb + 32) | 0
                            ab = qb
                            while (1) {
                              hb = ab
                              ab = (ab + 32) | 0
                              Mb = Va
                              Nb = ab
                              Ob = (Mb + 16) | 0
                              do {
                                a[Mb >> 0] = a[Nb >> 0] | 0
                                Mb = (Mb + 1) | 0
                                Nb = (Nb + 1) | 0
                              } while ((Mb | 0) < (Ob | 0))
                              Mb = (Va + 16) | 0
                              Nb = (hb + 48) | 0
                              Ob = (Mb + 16) | 0
                              do {
                                a[Mb >> 0] = a[Nb >> 0] | 0
                                Mb = (Mb + 1) | 0
                                Nb = (Nb + 1) | 0
                              } while ((Mb | 0) < (Ob | 0))
                              Va = (Va + 32) | 0
                              if (Va >>> 0 >= Oa >>> 0) {
                                Lb = Ta
                                break g
                              }
                            }
                          }
                          if (wb >>> 0 < 8) {
                            Oa = c[(3744 + (wb << 2)) >> 2] | 0
                            Va = Qb
                            a[Rb >> 0] = a[Va >> 0] | 0
                            a[(Rb + 1) >> 0] = a[(Va + 1) >> 0] | 0
                            a[(Rb + 2) >> 0] = a[(Va + 2) >> 0] | 0
                            a[(Rb + 3) >> 0] = a[(Va + 3) >> 0] | 0
                            ab = (Va + (c[(3776 + (wb << 2)) >> 2] | 0)) | 0
                            Va = (Rb + 4) | 0
                            qb =
                              d[ab >> 0] |
                              (d[(ab + 1) >> 0] << 8) |
                              (d[(ab + 2) >> 0] << 16) |
                              (d[(ab + 3) >> 0] << 24)
                            a[Va >> 0] = qb
                            a[(Va + 1) >> 0] = qb >> 8
                            a[(Va + 2) >> 0] = qb >> 16
                            a[(Va + 3) >> 0] = qb >> 24
                            Sb = (ab + (0 - Oa)) | 0
                          } else {
                            Oa = Qb
                            ab = Oa
                            qb =
                              d[ab >> 0] |
                              (d[(ab + 1) >> 0] << 8) |
                              (d[(ab + 2) >> 0] << 16) |
                              (d[(ab + 3) >> 0] << 24)
                            ab = (Oa + 4) | 0
                            Oa =
                              d[ab >> 0] |
                              (d[(ab + 1) >> 0] << 8) |
                              (d[(ab + 2) >> 0] << 16) |
                              (d[(ab + 3) >> 0] << 24)
                            ab = Rb
                            Va = ab
                            a[Va >> 0] = qb
                            a[(Va + 1) >> 0] = qb >> 8
                            a[(Va + 2) >> 0] = qb >> 16
                            a[(Va + 3) >> 0] = qb >> 24
                            qb = (ab + 4) | 0
                            a[qb >> 0] = Oa
                            a[(qb + 1) >> 0] = Oa >> 8
                            a[(qb + 2) >> 0] = Oa >> 16
                            a[(qb + 3) >> 0] = Oa >> 24
                            Sb = Qb
                          }
                          Oa = (Sb + 8) | 0
                          qb = (Rb + 8) | 0
                          ab = c[ha >> 2] | 0
                          if (ab >>> 0 <= 8) {
                            Lb = Ta
                            break
                          }
                          Va = (Rb + ab) | 0
                          if (((qb - Oa) | 0) < 16) {
                            hb = Oa
                            $a = qb
                            while (1) {
                              Wa = hb
                              _a = Wa
                              Za =
                                d[_a >> 0] |
                                (d[(_a + 1) >> 0] << 8) |
                                (d[(_a + 2) >> 0] << 16) |
                                (d[(_a + 3) >> 0] << 24)
                              _a = (Wa + 4) | 0
                              Wa =
                                d[_a >> 0] |
                                (d[(_a + 1) >> 0] << 8) |
                                (d[(_a + 2) >> 0] << 16) |
                                (d[(_a + 3) >> 0] << 24)
                              _a = $a
                              mb = _a
                              a[mb >> 0] = Za
                              a[(mb + 1) >> 0] = Za >> 8
                              a[(mb + 2) >> 0] = Za >> 16
                              a[(mb + 3) >> 0] = Za >> 24
                              Za = (_a + 4) | 0
                              a[Za >> 0] = Wa
                              a[(Za + 1) >> 0] = Wa >> 8
                              a[(Za + 2) >> 0] = Wa >> 16
                              a[(Za + 3) >> 0] = Wa >> 24
                              $a = ($a + 8) | 0
                              if ($a >>> 0 >= Va >>> 0) {
                                Lb = Ta
                                break g
                              } else hb = (hb + 8) | 0
                            }
                          }
                          Mb = qb
                          Nb = Oa
                          Ob = (Mb + 16) | 0
                          do {
                            a[Mb >> 0] = a[Nb >> 0] | 0
                            Mb = (Mb + 1) | 0
                            Nb = (Nb + 1) | 0
                          } while ((Mb | 0) < (Ob | 0))
                          Mb = (Rb + 24) | 0
                          Nb = (Sb + 24) | 0
                          Ob = (Mb + 16) | 0
                          do {
                            a[Mb >> 0] = a[Nb >> 0] | 0
                            Mb = (Mb + 1) | 0
                            Nb = (Nb + 1) | 0
                          } while ((Mb | 0) < (Ob | 0))
                          if ((ab | 0) < 41) {
                            Lb = Ta
                            break
                          }
                          qb = (Rb + 40) | 0
                          hb = Oa
                          do {
                            $a = hb
                            hb = (hb + 32) | 0
                            Mb = qb
                            Nb = hb
                            Ob = (Mb + 16) | 0
                            do {
                              a[Mb >> 0] = a[Nb >> 0] | 0
                              Mb = (Mb + 1) | 0
                              Nb = (Nb + 1) | 0
                            } while ((Mb | 0) < (Ob | 0))
                            Mb = (qb + 16) | 0
                            Nb = ($a + 48) | 0
                            Ob = (Mb + 16) | 0
                            do {
                              a[Mb >> 0] = a[Nb >> 0] | 0
                              Mb = (Mb + 1) | 0
                              Nb = (Nb + 1) | 0
                            } while ((Mb | 0) < (Ob | 0))
                            qb = (qb + 32) | 0
                          } while (qb >>> 0 < Va >>> 0)
                          Lb = Ta
                        }
                      while (0)
                      if (Lb >>> 0 >= 4294967177) {
                        Tb = Lb
                        B = 326
                        break
                      }
                      Ub = (Ja + Lb) | 0
                      Ta = c[ca >> 2] | 0
                      if (Ta >>> 0 > 32) {
                        B = 241
                        break
                      }
                      Fa = c[na >> 2] | 0
                      Ga = c[T >> 2] | 0
                      Ha = Ta
                      Ia = Ra
                      Ja = Ub
                    }
                    do
                      if ((B | 0) == 241)
                        if (!Ra) {
                          Vb = Ub
                          B = 324
                        } else break c
                      else if ((B | 0) == 297) {
                        Tb = -20
                        B = 326
                      } else if ((B | 0) == 318)
                        if (La >>> 0 <= 32) {
                          if (Ma >>> 0 >= Ga >>> 0) {
                            Ia = (Ma + (0 - (La >>> 3))) | 0
                            c[na >> 2] = Ia
                            c[ca >> 2] = La & 7
                            c[aa >> 2] =
                              d[Ia >> 0] |
                              (d[(Ia + 1) >> 0] << 8) |
                              (d[(Ia + 2) >> 0] << 16) |
                              (d[(Ia + 3) >> 0] << 24)
                            break c
                          }
                          Ia = c[R >> 2] | 0
                          if ((Ma | 0) == (Ia | 0))
                            if (La >>> 0 < 32) break c
                            else {
                              Vb = Ja
                              B = 324
                              break
                            }
                          else {
                            Ha = La >>> 3
                            T =
                              ((Ma + (0 - Ha)) | 0) >>> 0 < Ia >>> 0
                                ? (Ma - Ia) | 0
                                : Ha
                            Ha = (Ma + (0 - T)) | 0
                            c[na >> 2] = Ha
                            c[ca >> 2] = La - (T << 3)
                            c[aa >> 2] =
                              d[Ha >> 0] |
                              (d[(Ha + 1) >> 0] << 8) |
                              (d[(Ha + 2) >> 0] << 16) |
                              (d[(Ha + 3) >> 0] << 24)
                            break c
                          }
                        } else {
                          Vb = Ja
                          B = 324
                        }
                    while (0)
                    if ((B | 0) == 324) {
                      c[Q >> 2] = c[P >> 2]
                      c[(Q + 4) >> 2] = c[(P + 4) >> 2]
                      c[(Q + 8) >> 2] = c[(P + 8) >> 2]
                      N = c[n >> 2] | 0
                      O = Vb
                      B = 327
                      break b
                    } else if ((B | 0) == 326) {
                      Wb = Tb
                      break b
                    }
                  } else {
                    c[o >> 2] = 0
                    c[(o + 4) >> 2] = 0
                    c[(o + 8) >> 2] = 0
                    c[(o + 12) >> 2] = 0
                    c[(o + 16) >> 2] = 0
                  }
                while (0)
                Wb = -20
              }
            while (0)
            if ((B | 0) == 327) {
              M = (D - N) | 0
              if (M >>> 0 > ((E - O) | 0) >>> 0) Wb = -70
              else {
                bc(O | 0, N | 0, M | 0) | 0
                Wb = (O + M - f) | 0
              }
            }
            Xb = Wb
            break a
          } else {
            c[j >> 2] = 0
            I = c[q >> 2] | 0
          }
        while (0)
        M = (f + g) | 0
        L = c[(e + 28912) >> 2] | 0
        c[n >> 2] = L
        J = (L + (c[(e + 28928) >> 2] | 0)) | 0
        G = c[(e + 28732) >> 2] | 0
        z = c[(e + 28736) >> 2] | 0
        F = c[(e + 28740) >> 2] | 0
        h: do
          if (!I) {
            Yb = L
            Zb = f
            B = 207
          } else {
            c[(e + 28812) >> 2] = 1
            P = (p + 44) | 0
            Q = (e + 26668) | 0
            c[P >> 2] = c[Q >> 2]
            c[(P + 4) >> 2] = c[(Q + 4) >> 2]
            c[(P + 8) >> 2] = c[(Q + 8) >> 2]
            Ja = (I | 0) < 4 ? I : 4
            na = (p + 56) | 0
            c[na >> 2] = G
            R = G
            Ga = (f - R) | 0
            Ha = (p + 64) | 0
            c[Ha >> 2] = Ga
            T = (p + 60) | 0
            c[T >> 2] = F
            i: do
              if (!y) {
                c[p >> 2] = 0
                c[(p + 4) >> 2] = 0
                c[(p + 8) >> 2] = 0
                c[(p + 12) >> 2] = 0
                c[(p + 16) >> 2] = 0
                _b = -20
              } else {
                Ia = (p + 12) | 0
                c[Ia >> 2] = x
                Fa = (x + 4) | 0
                ha = (p + 16) | 0
                c[ha >> 2] = Fa
                do
                  if (y >>> 0 > 3) {
                    Da = (y + -4) | 0
                    Ea = (x + Da) | 0
                    c[(p + 8) >> 2] = Ea
                    xa =
                      d[Ea >> 0] |
                      (d[(Ea + 1) >> 0] << 8) |
                      (d[(Ea + 2) >> 0] << 16) |
                      (d[(Ea + 3) >> 0] << 24)
                    c[p >> 2] = xa
                    oa = a[(x + (y + -1)) >> 0] | 0
                    U = (p + 4) | 0
                    if ((oa << 24) >> 24) {
                      ia = (8 - ((r((oa & 255) | 0) | 0) ^ 31)) | 0
                      c[U >> 2] = ia
                      if (y >>> 0 < 4294967177) {
                        $b = Da
                        ac = Ea
                        dc = p
                        ec = xa
                        fc = U
                        gc = ia
                        break
                      } else {
                        _b = -20
                        break i
                      }
                    } else {
                      c[U >> 2] = 0
                      _b = -20
                      break i
                    }
                  } else {
                    c[(p + 8) >> 2] = x
                    U = d[x >> 0] | 0
                    c[p >> 2] = U
                    switch (y | 0) {
                      case 2: {
                        hc = U
                        B = 23
                        break
                      }
                      case 3: {
                        ia = ((d[(x + 2) >> 0] | 0) << 16) | U
                        c[p >> 2] = ia
                        hc = ia
                        B = 23
                        break
                      }
                      default:
                        ic = U
                    }
                    if ((B | 0) == 23) {
                      U = (((d[(x + 1) >> 0] | 0) << 8) + hc) | 0
                      c[p >> 2] = U
                      ic = U
                    }
                    U = a[(x + (y + -1)) >> 0] | 0
                    ia = (p + 4) | 0
                    if (!((U << 24) >> 24)) {
                      c[ia >> 2] = 0
                      _b = -20
                      break i
                    } else {
                      xa = (40 - (y << 3) - ((r((U & 255) | 0) | 0) ^ 31)) | 0
                      c[ia >> 2] = xa
                      $b = 0
                      ac = x
                      dc = p
                      ec = ic
                      fc = ia
                      gc = xa
                      break
                    }
                  }
                while (0)
                xa = (x + $b) | 0
                ia = c[e >> 2] | 0
                U = c[(ia + 4) >> 2] | 0
                Ea = (U + gc) | 0
                Da = (ec >>> ((0 - Ea) & 31)) & c[(3808 + (U << 2)) >> 2]
                c[fc >> 2] = Ea
                U = (p + 20) | 0
                c[U >> 2] = Da
                do
                  if (Ea >>> 0 <= 32) {
                    oa = (p + 8) | 0
                    if (($b | 0) >= 4) {
                      Y = ($b - (Ea >>> 3)) | 0
                      Z = (x + Y) | 0
                      c[oa >> 2] = Z
                      qa = Ea & 7
                      c[fc >> 2] = qa
                      ga =
                        d[Z >> 0] |
                        (d[(Z + 1) >> 0] << 8) |
                        (d[(Z + 2) >> 0] << 16) |
                        (d[(Z + 3) >> 0] << 24)
                      c[dc >> 2] = ga
                      jc = Y
                      kc = Z
                      lc = ga
                      mc = qa
                      break
                    }
                    qa = Ea >>> 3
                    ga = ((xa + (0 - qa)) | 0) >>> 0 < x >>> 0 ? $b : qa
                    qa = ($b - ga) | 0
                    Z = (x + qa) | 0
                    Y = (Ea - (ga << 3)) | 0
                    if (!$b) {
                      jc = 0
                      kc = ac
                      lc = ec
                      mc = Ea
                    } else {
                      c[oa >> 2] = Z
                      c[fc >> 2] = Y
                      oa =
                        d[Z >> 0] |
                        (d[(Z + 1) >> 0] << 8) |
                        (d[(Z + 2) >> 0] << 16) |
                        (d[(Z + 3) >> 0] << 24)
                      c[dc >> 2] = oa
                      jc = qa
                      kc = Z
                      lc = oa
                      mc = Y
                    }
                  } else {
                    jc = $b
                    kc = ac
                    lc = ec
                    mc = Ea
                  }
                while (0)
                Ea = (x + jc) | 0
                xa = (ia + 8) | 0
                Y = (p + 24) | 0
                c[Y >> 2] = xa
                oa = c[(e + 8) >> 2] | 0
                Z = c[(oa + 4) >> 2] | 0
                qa = (Z + mc) | 0
                ga = (lc >>> ((0 - qa) & 31)) & c[(3808 + (Z << 2)) >> 2]
                c[fc >> 2] = qa
                Z = (p + 28) | 0
                c[Z >> 2] = ga
                do
                  if (qa >>> 0 <= 32) {
                    V = (p + 8) | 0
                    if ((jc | 0) >= 4) {
                      W = (jc - (qa >>> 3)) | 0
                      S = (x + W) | 0
                      c[V >> 2] = S
                      X = qa & 7
                      c[fc >> 2] = X
                      Ta =
                        d[S >> 0] |
                        (d[(S + 1) >> 0] << 8) |
                        (d[(S + 2) >> 0] << 16) |
                        (d[(S + 3) >> 0] << 24)
                      c[dc >> 2] = Ta
                      nc = W
                      oc = S
                      pc = Ta
                      qc = X
                      break
                    }
                    X = qa >>> 3
                    Ta = ((Ea + (0 - X)) | 0) >>> 0 < x >>> 0 ? jc : X
                    X = (jc - Ta) | 0
                    S = (x + X) | 0
                    W = (qa - (Ta << 3)) | 0
                    if (!jc) {
                      nc = 0
                      oc = kc
                      pc = lc
                      qc = qa
                    } else {
                      c[V >> 2] = S
                      c[fc >> 2] = W
                      V =
                        d[S >> 0] |
                        (d[(S + 1) >> 0] << 8) |
                        (d[(S + 2) >> 0] << 16) |
                        (d[(S + 3) >> 0] << 24)
                      c[dc >> 2] = V
                      nc = X
                      oc = S
                      pc = V
                      qc = W
                    }
                  } else {
                    nc = jc
                    oc = kc
                    pc = lc
                    qc = qa
                  }
                while (0)
                qa = (x + nc) | 0
                Ea = (oa + 8) | 0
                ia = (p + 32) | 0
                c[ia >> 2] = Ea
                W = c[(e + 4) >> 2] | 0
                V = c[(W + 4) >> 2] | 0
                S = (V + qc) | 0
                X = (pc >>> ((0 - S) & 31)) & c[(3808 + (V << 2)) >> 2]
                c[fc >> 2] = S
                V = (p + 36) | 0
                c[V >> 2] = X
                j: do
                  if (S >>> 0 <= 32) {
                    Ta = (p + 8) | 0
                    if ((nc | 0) < 4)
                      if (nc) {
                        Ka = S >>> 3
                        Na = ((qa + (0 - Ka)) | 0) >>> 0 < x >>> 0 ? nc : Ka
                        Ka = (nc - Na) | 0
                        cb = (x + Ka) | 0
                        c[Ta >> 2] = cb
                        Sa = (S - (Na << 3)) | 0
                        c[fc >> 2] = Sa
                        Na =
                          d[cb >> 0] |
                          (d[(cb + 1) >> 0] << 8) |
                          (d[(cb + 2) >> 0] << 16) |
                          (d[(cb + 3) >> 0] << 24)
                        c[dc >> 2] = Na
                        Ua = (p + 40) | 0
                        c[Ua >> 2] = W + 8
                        if (Sa >>> 0 > 32) {
                          rc = 0
                          B = 94
                          break
                        } else {
                          sc = Ka
                          tc = Sa
                          uc = cb
                          vc = Na
                          wc = Ua
                        }
                      } else {
                        xc = 0
                        yc = oc
                        zc = S
                        Ac = pc
                        B = 43
                      }
                    else {
                      Ua = (nc - (S >>> 3)) | 0
                      Na = (x + Ua) | 0
                      c[Ta >> 2] = Na
                      cb = S & 7
                      c[fc >> 2] = cb
                      Sa =
                        d[Na >> 0] |
                        (d[(Na + 1) >> 0] << 8) |
                        (d[(Na + 2) >> 0] << 16) |
                        (d[(Na + 3) >> 0] << 24)
                      c[dc >> 2] = Sa
                      xc = Ua
                      yc = Na
                      zc = cb
                      Ac = Sa
                      B = 43
                    }
                    if ((B | 0) == 43) {
                      Sa = (p + 40) | 0
                      c[Sa >> 2] = W + 8
                      sc = xc
                      tc = zc
                      uc = yc
                      vc = Ac
                      wc = Sa
                    }
                    Sa = (t | 0) == 0
                    cb = (p + 48) | 0
                    Na = (p + 52) | 0
                    Ua = (W + 8) | 0
                    Ka = (W + 8) | 0
                    bb = (W + 8) | 0
                    Ya = (W + 8) | 0
                    Xa = sc
                    Va = sc
                    qb = sc
                    hb = sc
                    Oa = sc
                    ab = sc
                    $a = Ga
                    Wa = uc
                    Za = uc
                    _a = uc
                    mb = uc
                    gb = uc
                    ib = uc
                    ub = tc
                    lb = Da
                    vb = X
                    Bc = ga
                    Cc = vc
                    Dc = 0
                    while (1) {
                      do
                        if ((Xa | 0) < 4) {
                          Ec = ub >>> 3
                          Fc =
                            ((x + Xa + (0 - Ec)) | 0) >>> 0 < x >>> 0 ? Xa : Ec
                          Ec = (Xa - Fc) | 0
                          Gc = (x + Ec) | 0
                          Hc = (ub - (Fc << 3)) | 0
                          if (!Xa) {
                            Ic = Oa
                            Jc = hb
                            Kc = qb
                            Lc = 0
                            Mc = Va
                            Nc = ab
                            Oc = (x + ab) | 0
                            Pc = (x + hb) | 0
                            Qc = Wa
                            Rc = Za
                            Sc = _a
                            Tc = mb
                            Uc = gb
                            Vc = ib
                            Wc = Cc
                            Xc = ub
                            break
                          } else {
                            c[Ta >> 2] = Gc
                            c[fc >> 2] = Hc
                            Fc =
                              d[Gc >> 0] |
                              (d[(Gc + 1) >> 0] << 8) |
                              (d[(Gc + 2) >> 0] << 16) |
                              (d[(Gc + 3) >> 0] << 24)
                            c[dc >> 2] = Fc
                            Ic = Ec
                            Jc = Ec
                            Kc = Ec
                            Lc = Ec
                            Mc = Ec
                            Nc = Ec
                            Oc = Gc
                            Pc = Gc
                            Qc = Gc
                            Rc = Gc
                            Sc = Gc
                            Tc = Gc
                            Uc = Gc
                            Vc = Gc
                            Wc = Fc
                            Xc = Hc
                            break
                          }
                        } else {
                          Hc = (Xa - (ub >>> 3)) | 0
                          Fc = (x + Hc) | 0
                          c[Ta >> 2] = Fc
                          Gc = ub & 7
                          c[fc >> 2] = Gc
                          Ec =
                            d[Fc >> 0] |
                            (d[(Fc + 1) >> 0] << 8) |
                            (d[(Fc + 2) >> 0] << 16) |
                            (d[(Fc + 3) >> 0] << 24)
                          c[dc >> 2] = Ec
                          Ic = Hc
                          Jc = Hc
                          Kc = Hc
                          Lc = Hc
                          Mc = Hc
                          Nc = Hc
                          Oc = Fc
                          Pc = Fc
                          Qc = Fc
                          Rc = Fc
                          Sc = Fc
                          Tc = Fc
                          Uc = Fc
                          Vc = Fc
                          Wc = Ec
                          Xc = Gc
                        }
                      while (0)
                      if ((Dc | 0) >= (Ja | 0)) break
                      Gc = a[(xa + (lb << 3) + 2) >> 0] | 0
                      Ec = Gc & 255
                      Fc = a[(Ka + (vb << 3) + 2) >> 0] | 0
                      Hc = Fc & 255
                      Yc = a[(Ea + (Bc << 3) + 2) >> 0] | 0
                      Zc = Yc & 255
                      _c = (Hc + Ec) | 0
                      $c = c[(xa + (lb << 3) + 4) >> 2] | 0
                      ad = c[(Ua + (vb << 3) + 4) >> 2] | 0
                      bd = c[(Ea + (Bc << 3) + 4) >> 2] | 0
                      do
                        if (!((Yc << 24) >> 24)) {
                          cd = Mc
                          dd = Lc
                          ed = Kc
                          fd = Ic
                          gd = Jc
                          hd = Nc
                          id = Qc
                          jd = Rc
                          kd = Sc
                          ld = Tc
                          md = Uc
                          nd = Vc
                          od = Wc
                          pd = Xc
                          qd = 0
                          B = 67
                        } else {
                          do
                            if (Sa) {
                              rd = (Xc + Zc) | 0
                              c[fc >> 2] = rd
                              sd =
                                (((Wc << (Xc & 31)) >>> ((0 - Yc) & 31)) + bd) |
                                0
                              if (rd >>> 0 > 32) {
                                td = Mc
                                ud = Lc
                                vd = Kc
                                wd = Ic
                                xd = Jc
                                yd = Nc
                                zd = Qc
                                Ad = Rc
                                Bd = Sc
                                Cd = Tc
                                Dd = Uc
                                Ed = Vc
                                Fd = Wc
                                Gd = rd
                                Hd = sd
                                break
                              }
                              if ((Jc | 0) >= 4) {
                                Id = (Jc - (rd >>> 3)) | 0
                                Jd = (x + Id) | 0
                                c[Ta >> 2] = Jd
                                Kd = rd & 7
                                c[fc >> 2] = Kd
                                Ld =
                                  d[Jd >> 0] |
                                  (d[(Jd + 1) >> 0] << 8) |
                                  (d[(Jd + 2) >> 0] << 16) |
                                  (d[(Jd + 3) >> 0] << 24)
                                c[dc >> 2] = Ld
                                td = Id
                                ud = Id
                                vd = Id
                                wd = Id
                                xd = Id
                                yd = Id
                                zd = Jd
                                Ad = Jd
                                Bd = Jd
                                Cd = Jd
                                Dd = Jd
                                Ed = Jd
                                Fd = Ld
                                Gd = Kd
                                Hd = sd
                                break
                              }
                              Kd = rd >>> 3
                              Ld =
                                ((Pc + (0 - Kd)) | 0) >>> 0 < x >>> 0 ? Jc : Kd
                              Kd = (Jc - Ld) | 0
                              Jd = (x + Kd) | 0
                              Id = (rd - (Ld << 3)) | 0
                              if (!Jc) {
                                td = Mc
                                ud = 0
                                vd = Kc
                                wd = Ic
                                xd = 0
                                yd = 0
                                zd = Qc
                                Ad = Rc
                                Bd = Sc
                                Cd = Tc
                                Dd = Uc
                                Ed = Vc
                                Fd = Wc
                                Gd = rd
                                Hd = sd
                                break
                              }
                              c[Ta >> 2] = Jd
                              c[fc >> 2] = Id
                              rd =
                                d[Jd >> 0] |
                                (d[(Jd + 1) >> 0] << 8) |
                                (d[(Jd + 2) >> 0] << 16) |
                                (d[(Jd + 3) >> 0] << 24)
                              c[dc >> 2] = rd
                              td = Kd
                              ud = Kd
                              vd = Kd
                              wd = Kd
                              xd = Kd
                              yd = Kd
                              zd = Jd
                              Ad = Jd
                              Bd = Jd
                              Cd = Jd
                              Dd = Jd
                              Ed = Jd
                              Fd = rd
                              Gd = Id
                              Hd = sd
                            } else {
                              sd = Zc >>> 0 < 24 ? Zc : 24
                              Id = (Zc - sd) | 0
                              rd = (sd + Xc) | 0
                              c[fc >> 2] = rd
                              Jd =
                                ((((Wc << (Xc & 31)) >>> ((0 - sd) & 31)) <<
                                  Id) +
                                  bd) |
                                0
                              sd = (Id | 0) == 0
                              do
                                if (rd >>> 0 > 32) {
                                  Md = Ic
                                  Nd = Kc
                                  Od = Lc
                                  Pd = Mc
                                  Qd = Jc
                                  Rd = Nc
                                  Sd = Qc
                                  Td = Rc
                                  Ud = Sc
                                  Vd = Tc
                                  Wd = Uc
                                  Xd = Vc
                                  Yd = Wc
                                  Zd = rd
                                } else {
                                  if ((Nc | 0) >= 4) {
                                    Kd = (Nc - (rd >>> 3)) | 0
                                    Ld = (x + Kd) | 0
                                    c[Ta >> 2] = Ld
                                    _d = rd & 7
                                    c[fc >> 2] = _d
                                    $d =
                                      d[Ld >> 0] |
                                      (d[(Ld + 1) >> 0] << 8) |
                                      (d[(Ld + 2) >> 0] << 16) |
                                      (d[(Ld + 3) >> 0] << 24)
                                    c[dc >> 2] = $d
                                    Md = Kd
                                    Nd = Kd
                                    Od = Kd
                                    Pd = Kd
                                    Qd = Kd
                                    Rd = Kd
                                    Sd = Ld
                                    Td = Ld
                                    Ud = Ld
                                    Vd = Ld
                                    Wd = Ld
                                    Xd = Ld
                                    Yd = $d
                                    Zd = _d
                                    break
                                  }
                                  _d = rd >>> 3
                                  $d =
                                    ((Oc + (0 - _d)) | 0) >>> 0 < x >>> 0
                                      ? Nc
                                      : _d
                                  _d = (Nc - $d) | 0
                                  Ld = (x + _d) | 0
                                  Kd = (rd - ($d << 3)) | 0
                                  if (!Nc) {
                                    Md = Ic
                                    Nd = Kc
                                    Od = 0
                                    Pd = Mc
                                    Qd = Jc
                                    Rd = 0
                                    Sd = Qc
                                    Td = Rc
                                    Ud = Sc
                                    Vd = Tc
                                    Wd = Uc
                                    Xd = Vc
                                    Yd = Wc
                                    Zd = rd
                                    break
                                  }
                                  c[Ta >> 2] = Ld
                                  c[fc >> 2] = Kd
                                  $d =
                                    d[Ld >> 0] |
                                    (d[(Ld + 1) >> 0] << 8) |
                                    (d[(Ld + 2) >> 0] << 16) |
                                    (d[(Ld + 3) >> 0] << 24)
                                  c[dc >> 2] = $d
                                  Md = _d
                                  Nd = _d
                                  Od = _d
                                  Pd = _d
                                  Qd = _d
                                  Rd = _d
                                  Sd = Ld
                                  Td = Ld
                                  Ud = Ld
                                  Vd = Ld
                                  Wd = Ld
                                  Xd = Ld
                                  Yd = $d
                                  Zd = Kd
                                }
                              while (0)
                              rd = (Zd + Id) | 0
                              if (sd) {
                                td = Pd
                                ud = Od
                                vd = Nd
                                wd = Md
                                xd = Qd
                                yd = Rd
                                zd = Sd
                                Ad = Td
                                Bd = Ud
                                Cd = Vd
                                Dd = Wd
                                Ed = Xd
                                Fd = Yd
                                Gd = Zd
                                Hd = Jd
                                break
                              }
                              c[fc >> 2] = rd
                              td = Pd
                              ud = Od
                              vd = Nd
                              wd = Md
                              xd = Qd
                              yd = Rd
                              zd = Sd
                              Ad = Td
                              Bd = Ud
                              Cd = Vd
                              Dd = Wd
                              Ed = Xd
                              Fd = Yd
                              Gd = rd
                              Hd =
                                (((Yd << (Zd & 31)) >>> ((0 - Id) & 31)) + Jd) |
                                0
                            }
                          while (0)
                          if ((Yc & 255) < 2) {
                            cd = td
                            dd = ud
                            ed = vd
                            fd = wd
                            gd = xd
                            hd = yd
                            id = zd
                            jd = Ad
                            kd = Bd
                            ld = Cd
                            md = Dd
                            nd = Ed
                            od = Fd
                            pd = Gd
                            qd = Hd
                            B = 67
                            break
                          }
                          c[Na >> 2] = c[cb >> 2]
                          c[cb >> 2] = c[P >> 2]
                          c[P >> 2] = Hd
                          ae = wd
                          be = vd
                          ce = ud
                          de = td
                          ee = xd
                          fe = yd
                          ge = zd
                          he = Ad
                          ie = Bd
                          je = Cd
                          ke = Dd
                          le = Ed
                          me = Fd
                          ne = Gd
                          oe = Hd
                        }
                      while (0)
                      k: do
                        if ((B | 0) == 67) {
                          B = 0
                          Yc = (qd + ((($c | 0) == 0) & 1)) | 0
                          switch (Yc | 0) {
                            case 0: {
                              ae = fd
                              be = ed
                              ce = dd
                              de = cd
                              ee = gd
                              fe = hd
                              ge = id
                              he = jd
                              ie = kd
                              je = ld
                              ke = md
                              le = nd
                              me = od
                              ne = pd
                              oe = c[P >> 2] | 0
                              break k
                              break
                            }
                            case 3: {
                              bd = ((c[P >> 2] | 0) + -1) | 0
                              pe = (bd + (((bd | 0) == 0) & 1)) | 0
                              B = 70
                              break
                            }
                            default: {
                              bd = c[(p + 44 + (Yc << 2)) >> 2] | 0
                              Zc = (bd + (((bd | 0) == 0) & 1)) | 0
                              if ((Yc | 0) == 1) qe = Zc
                              else {
                                pe = Zc
                                B = 70
                              }
                            }
                          }
                          if ((B | 0) == 70) {
                            B = 0
                            c[Na >> 2] = c[cb >> 2]
                            qe = pe
                          }
                          c[cb >> 2] = c[P >> 2]
                          c[P >> 2] = qe
                          ae = fd
                          be = ed
                          ce = dd
                          de = cd
                          ee = gd
                          fe = hd
                          ge = id
                          he = jd
                          ie = kd
                          je = ld
                          ke = md
                          le = nd
                          me = od
                          ne = pd
                          oe = qe
                        }
                      while (0)
                      Zc = (x + be) | 0
                      Yc = (ne + Hc) | 0
                      if (!((Fc << 24) >> 24)) {
                        re = ne
                        se = 0
                      } else {
                        c[fc >> 2] = Yc
                        re = Yc
                        se = (me << (ne & 31)) >>> ((0 - Fc) & 31)
                      }
                      Yc = (se + ad) | 0
                      do
                        if ((_c >>> 0 < 20) | (re >>> 0 > 32)) {
                          te = de
                          ue = ce
                          ve = ae
                          we = ee
                          xe = be
                          ye = fe
                          ze = re
                          Ae = ge
                          Be = he
                          Ce = ie
                          De = je
                          Ee = ke
                          Fe = le
                          Ge = me
                        } else {
                          if ((be | 0) >= 4) {
                            bd = (be - (re >>> 3)) | 0
                            rd = (x + bd) | 0
                            c[Ta >> 2] = rd
                            Kd = re & 7
                            c[fc >> 2] = Kd
                            $d =
                              d[rd >> 0] |
                              (d[(rd + 1) >> 0] << 8) |
                              (d[(rd + 2) >> 0] << 16) |
                              (d[(rd + 3) >> 0] << 24)
                            c[dc >> 2] = $d
                            te = bd
                            ue = bd
                            ve = bd
                            we = bd
                            xe = bd
                            ye = bd
                            ze = Kd
                            Ae = rd
                            Be = rd
                            Ce = rd
                            De = rd
                            Ee = rd
                            Fe = rd
                            Ge = $d
                            break
                          }
                          $d = re >>> 3
                          rd = ((Zc + (0 - $d)) | 0) >>> 0 < x >>> 0 ? be : $d
                          $d = (be - rd) | 0
                          Kd = (x + $d) | 0
                          bd = (re - (rd << 3)) | 0
                          if (!be) {
                            te = de
                            ue = 0
                            ve = ae
                            we = 0
                            xe = 0
                            ye = 0
                            ze = re
                            Ae = ge
                            Be = he
                            Ce = ie
                            De = je
                            Ee = ke
                            Fe = le
                            Ge = me
                            break
                          }
                          c[Ta >> 2] = Kd
                          c[fc >> 2] = bd
                          rd =
                            d[Kd >> 0] |
                            (d[(Kd + 1) >> 0] << 8) |
                            (d[(Kd + 2) >> 0] << 16) |
                            (d[(Kd + 3) >> 0] << 24)
                          c[dc >> 2] = rd
                          te = $d
                          ue = $d
                          ve = $d
                          we = $d
                          xe = $d
                          ye = $d
                          ze = bd
                          Ae = Kd
                          Be = Kd
                          Ce = Kd
                          De = Kd
                          Ee = Kd
                          Fe = Kd
                          Ge = rd
                        }
                      while (0)
                      Zc = (x + te) | 0
                      _c = (ze + Ec) | 0
                      if (!((Gc << 24) >> 24)) {
                        He = ze
                        Ie = 0
                      } else {
                        c[fc >> 2] = _c
                        He = _c
                        Ie = (Ge << (ze & 31)) >>> ((0 - Gc) & 31)
                      }
                      _c = (Ie + $c) | 0
                      do
                        if (He >>> 0 > 32) {
                          Je = ve
                          Ke = ue
                          Le = te
                          Me = xe
                          Ne = we
                          Oe = ye
                          Pe = Ae
                          Qe = Be
                          Re = Ce
                          Se = De
                          Te = Ee
                          Ue = Fe
                          Ve = Ge
                          We = He
                        } else {
                          if ((te | 0) >= 4) {
                            ad = (te - (He >>> 3)) | 0
                            Fc = (x + ad) | 0
                            c[Ta >> 2] = Fc
                            Hc = He & 7
                            c[fc >> 2] = Hc
                            rd =
                              d[Fc >> 0] |
                              (d[(Fc + 1) >> 0] << 8) |
                              (d[(Fc + 2) >> 0] << 16) |
                              (d[(Fc + 3) >> 0] << 24)
                            c[dc >> 2] = rd
                            Je = ad
                            Ke = ad
                            Le = ad
                            Me = ad
                            Ne = ad
                            Oe = ad
                            Pe = Fc
                            Qe = Fc
                            Re = Fc
                            Se = Fc
                            Te = Fc
                            Ue = Fc
                            Ve = rd
                            We = Hc
                            break
                          }
                          Hc = He >>> 3
                          rd = ((Zc + (0 - Hc)) | 0) >>> 0 < x >>> 0 ? te : Hc
                          Hc = (te - rd) | 0
                          Fc = (x + Hc) | 0
                          ad = (He - (rd << 3)) | 0
                          if (!te) {
                            Je = ve
                            Ke = 0
                            Le = 0
                            Me = 0
                            Ne = 0
                            Oe = 0
                            Pe = Ae
                            Qe = Be
                            Re = Ce
                            Se = De
                            Te = Ee
                            Ue = Fe
                            Ve = Ge
                            We = He
                            break
                          }
                          c[Ta >> 2] = Fc
                          c[fc >> 2] = ad
                          rd =
                            d[Fc >> 0] |
                            (d[(Fc + 1) >> 0] << 8) |
                            (d[(Fc + 2) >> 0] << 16) |
                            (d[(Fc + 3) >> 0] << 24)
                          c[dc >> 2] = rd
                          Je = Hc
                          Ke = Hc
                          Le = Hc
                          Me = Hc
                          Ne = Hc
                          Oe = Hc
                          Pe = Fc
                          Qe = Fc
                          Re = Fc
                          Se = Fc
                          Te = Fc
                          Ue = Fc
                          Ve = rd
                          We = ad
                        }
                      while (0)
                      Zc = (x + Je) | 0
                      $c = (_c + $a) | 0
                      Gc = ((oe >>> 0 > $c >>> 0 ? F : G) + $c + (0 - oe)) | 0
                      $a = ($c + Yc) | 0
                      c[Ha >> 2] = $a
                      $c = b[(xa + (lb << 3)) >> 1] | 0
                      Ec = d[(xa + (lb << 3) + 3) >> 0] | 0
                      ad = (We + Ec) | 0
                      rd = (Ve >>> ((0 - ad) & 31)) & c[(3808 + (Ec << 2)) >> 2]
                      c[fc >> 2] = ad
                      lb = (rd + ($c & 65535)) | 0
                      c[U >> 2] = lb
                      $c = b[(Ya + (vb << 3)) >> 1] | 0
                      rd = d[(bb + (vb << 3) + 3) >> 0] | 0
                      Ec = (ad + rd) | 0
                      ad = (Ve >>> ((0 - Ec) & 31)) & c[(3808 + (rd << 2)) >> 2]
                      c[fc >> 2] = Ec
                      vb = (ad + ($c & 65535)) | 0
                      c[V >> 2] = vb
                      do
                        if (Ec >>> 0 > 32) {
                          Xe = Ke
                          Ye = Je
                          Ze = Ne
                          _e = Me
                          $e = Le
                          af = Oe
                          bf = Pe
                          cf = Qe
                          df = Re
                          ef = Se
                          ff = Te
                          gf = Ue
                          hf = Ve
                          jf = Ec
                        } else {
                          if ((Je | 0) >= 4) {
                            $c = (Je - (Ec >>> 3)) | 0
                            ad = (x + $c) | 0
                            c[Ta >> 2] = ad
                            rd = Ec & 7
                            c[fc >> 2] = rd
                            Fc =
                              d[ad >> 0] |
                              (d[(ad + 1) >> 0] << 8) |
                              (d[(ad + 2) >> 0] << 16) |
                              (d[(ad + 3) >> 0] << 24)
                            c[dc >> 2] = Fc
                            Xe = $c
                            Ye = $c
                            Ze = $c
                            _e = $c
                            $e = $c
                            af = $c
                            bf = ad
                            cf = ad
                            df = ad
                            ef = ad
                            ff = ad
                            gf = ad
                            hf = Fc
                            jf = rd
                            break
                          }
                          rd = Ec >>> 3
                          Fc = ((Zc + (0 - rd)) | 0) >>> 0 < x >>> 0 ? Je : rd
                          rd = (Je - Fc) | 0
                          ad = (x + rd) | 0
                          $c = (Ec - (Fc << 3)) | 0
                          if (!Je) {
                            Xe = 0
                            Ye = 0
                            Ze = 0
                            _e = 0
                            $e = 0
                            af = 0
                            bf = Pe
                            cf = Qe
                            df = Re
                            ef = Se
                            ff = Te
                            gf = Ue
                            hf = Ve
                            jf = Ec
                            break
                          }
                          c[Ta >> 2] = ad
                          c[fc >> 2] = $c
                          Fc =
                            d[ad >> 0] |
                            (d[(ad + 1) >> 0] << 8) |
                            (d[(ad + 2) >> 0] << 16) |
                            (d[(ad + 3) >> 0] << 24)
                          c[dc >> 2] = Fc
                          Xe = rd
                          Ye = rd
                          Ze = rd
                          _e = rd
                          $e = rd
                          af = rd
                          bf = ad
                          cf = ad
                          df = ad
                          ef = ad
                          ff = ad
                          gf = ad
                          hf = Fc
                          jf = $c
                        }
                      while (0)
                      Ec = b[(Ea + (Bc << 3)) >> 1] | 0
                      Zc = d[(Ea + (Bc << 3) + 3) >> 0] | 0
                      ub = (jf + Zc) | 0
                      $c = (hf >>> ((0 - ub) & 31)) & c[(3808 + (Zc << 2)) >> 2]
                      c[fc >> 2] = ub
                      Bc = ($c + (Ec & 65535)) | 0
                      c[Z >> 2] = Bc
                      c[(o + (Dc << 4)) >> 2] = _c
                      c[(o + (Dc << 4) + 4) >> 2] = Yc
                      c[(o + (Dc << 4) + 8) >> 2] = oe
                      c[(o + (Dc << 4) + 12) >> 2] = Gc
                      Ec = (Dc + 1) | 0
                      if (ub >>> 0 > 32) {
                        rc = Ec
                        B = 94
                        break j
                      } else {
                        Xa = Xe
                        Va = $e
                        qb = _e
                        hb = Ze
                        Oa = Ye
                        ab = af
                        Wa = bf
                        Za = cf
                        _a = df
                        mb = ef
                        gb = ff
                        ib = gf
                        Cc = hf
                        Dc = Ec
                      }
                    }
                    if (Xc >>> 0 > 32) {
                      kf = f
                      lf = Dc
                      B = 97
                    } else {
                      Cc = (m + 4) | 0
                      ib = (m + 8) | 0
                      gb = (M + -32) | 0
                      mb = z
                      _a = Vc
                      Za = Fa
                      Wa = Xc
                      ab = Qc
                      Oa = Rc
                      hb = Sc
                      qb = Tc
                      Va = Uc
                      Xa = f
                      ub = Dc
                      l: while (1) {
                        do
                          if (_a >>> 0 < Za >>> 0) {
                            Bc = c[Ia >> 2] | 0
                            if ((_a | 0) == (Bc | 0)) {
                              mf = Va
                              nf = qb
                              of = ab
                              pf = Oa
                              qf = hb
                              rf = Wa
                              break
                            }
                            vb = Wa >>> 3
                            bb =
                              ((_a + (0 - vb)) | 0) >>> 0 < Bc >>> 0
                                ? (_a - Bc) | 0
                                : vb
                            vb = (_a + (0 - bb)) | 0
                            c[Ta >> 2] = vb
                            sf = vb
                            tf = (Wa - (bb << 3)) | 0
                            B = 102
                          } else {
                            bb = (_a + (0 - (Wa >>> 3))) | 0
                            c[Ta >> 2] = bb
                            sf = bb
                            tf = Wa & 7
                            B = 102
                          }
                        while (0)
                        if ((B | 0) == 102) {
                          B = 0
                          c[fc >> 2] = tf
                          c[dc >> 2] =
                            d[sf >> 0] |
                            (d[(sf + 1) >> 0] << 8) |
                            (d[(sf + 2) >> 0] << 16) |
                            (d[(sf + 3) >> 0] << 24)
                          mf = sf
                          nf = sf
                          of = sf
                          pf = sf
                          qf = sf
                          rf = tf
                        }
                        if ((ub | 0) >= (I | 0)) {
                          uf = Xa
                          vf = ub
                          break j
                        }
                        Gc = c[Y >> 2] | 0
                        Yc = c[U >> 2] | 0
                        _c = a[(Gc + (Yc << 3) + 2) >> 0] | 0
                        bb = _c & 255
                        vb = c[wc >> 2] | 0
                        Bc = c[V >> 2] | 0
                        Ya = a[(vb + (Bc << 3) + 2) >> 0] | 0
                        lb = Ya & 255
                        $a = c[ia >> 2] | 0
                        Ua = c[Z >> 2] | 0
                        Ka = a[($a + (Ua << 3) + 2) >> 0] | 0
                        Ec = Ka & 255
                        $c = (lb + bb) | 0
                        Zc = c[(Gc + (Yc << 3) + 4) >> 2] | 0
                        Fc = c[(vb + (Bc << 3) + 4) >> 2] | 0
                        ad = c[($a + (Ua << 3) + 4) >> 2] | 0
                        do
                          if (!((Ka << 24) >> 24)) {
                            wf = of
                            xf = pf
                            yf = qf
                            zf = rf
                            Af = 0
                            B = 119
                          } else {
                            do
                              if (Sa) {
                                rd =
                                  (c[dc >> 2] << (rf & 31)) >>> ((0 - Ka) & 31)
                                Hc = (rf + Ec) | 0
                                c[fc >> 2] = Hc
                                Kd = (rd + ad) | 0
                                if (Hc >>> 0 > 32) {
                                  Bf = of
                                  Cf = pf
                                  Df = qf
                                  Ef = Hc
                                  Ff = Kd
                                  break
                                }
                                if (nf >>> 0 >= Za >>> 0) {
                                  rd = (nf + (0 - (Hc >>> 3))) | 0
                                  c[Ta >> 2] = rd
                                  bd = Hc & 7
                                  c[fc >> 2] = bd
                                  c[dc >> 2] =
                                    d[rd >> 0] |
                                    (d[(rd + 1) >> 0] << 8) |
                                    (d[(rd + 2) >> 0] << 16) |
                                    (d[(rd + 3) >> 0] << 24)
                                  Bf = rd
                                  Cf = rd
                                  Df = rd
                                  Ef = bd
                                  Ff = Kd
                                  break
                                }
                                bd = c[Ia >> 2] | 0
                                if ((nf | 0) == (bd | 0)) {
                                  Bf = of
                                  Cf = pf
                                  Df = qf
                                  Ef = Hc
                                  Ff = Kd
                                  break
                                }
                                rd = Hc >>> 3
                                $d =
                                  ((nf + (0 - rd)) | 0) >>> 0 < bd >>> 0
                                    ? (nf - bd) | 0
                                    : rd
                                rd = (nf + (0 - $d)) | 0
                                c[Ta >> 2] = rd
                                bd = (Hc - ($d << 3)) | 0
                                c[fc >> 2] = bd
                                c[dc >> 2] =
                                  d[rd >> 0] |
                                  (d[(rd + 1) >> 0] << 8) |
                                  (d[(rd + 2) >> 0] << 16) |
                                  (d[(rd + 3) >> 0] << 24)
                                Bf = rd
                                Cf = rd
                                Df = rd
                                Ef = bd
                                Ff = Kd
                              } else {
                                Kd = Ec >>> 0 < 24 ? Ec : 24
                                bd = (Ec - Kd) | 0
                                rd = c[dc >> 2] | 0
                                $d = (Kd + rf) | 0
                                c[fc >> 2] = $d
                                Hc =
                                  ((((rd << (rf & 31)) >>> ((0 - Kd) & 31)) <<
                                    bd) +
                                    ad) |
                                  0
                                Kd = (bd | 0) == 0
                                do
                                  if ($d >>> 0 > 32) {
                                    Gf = of
                                    Hf = pf
                                    If = qf
                                    Jf = rd
                                    Kf = $d
                                  } else {
                                    if (mf >>> 0 >= Za >>> 0) {
                                      Ld = (mf + (0 - ($d >>> 3))) | 0
                                      c[Ta >> 2] = Ld
                                      _d = $d & 7
                                      c[fc >> 2] = _d
                                      Lf =
                                        d[Ld >> 0] |
                                        (d[(Ld + 1) >> 0] << 8) |
                                        (d[(Ld + 2) >> 0] << 16) |
                                        (d[(Ld + 3) >> 0] << 24)
                                      c[dc >> 2] = Lf
                                      Gf = Ld
                                      Hf = Ld
                                      If = Ld
                                      Jf = Lf
                                      Kf = _d
                                      break
                                    }
                                    _d = c[Ia >> 2] | 0
                                    if ((mf | 0) == (_d | 0)) {
                                      Gf = of
                                      Hf = pf
                                      If = qf
                                      Jf = rd
                                      Kf = $d
                                      break
                                    }
                                    Lf = $d >>> 3
                                    Ld =
                                      ((mf + (0 - Lf)) | 0) >>> 0 < _d >>> 0
                                        ? (mf - _d) | 0
                                        : Lf
                                    Lf = (mf + (0 - Ld)) | 0
                                    c[Ta >> 2] = Lf
                                    _d = ($d - (Ld << 3)) | 0
                                    c[fc >> 2] = _d
                                    Ld =
                                      d[Lf >> 0] |
                                      (d[(Lf + 1) >> 0] << 8) |
                                      (d[(Lf + 2) >> 0] << 16) |
                                      (d[(Lf + 3) >> 0] << 24)
                                    c[dc >> 2] = Ld
                                    Gf = Lf
                                    Hf = Lf
                                    If = Lf
                                    Jf = Ld
                                    Kf = _d
                                  }
                                while (0)
                                $d = (Kf + bd) | 0
                                if (Kd) {
                                  Bf = Gf
                                  Cf = Hf
                                  Df = If
                                  Ef = Kf
                                  Ff = Hc
                                  break
                                }
                                c[fc >> 2] = $d
                                Bf = Gf
                                Cf = Hf
                                Df = If
                                Ef = $d
                                Ff =
                                  (((Jf << (Kf & 31)) >>> ((0 - bd) & 31)) +
                                    Hc) |
                                  0
                              }
                            while (0)
                            if ((Ka & 255) < 2) {
                              wf = Bf
                              xf = Cf
                              yf = Df
                              zf = Ef
                              Af = Ff
                              B = 119
                              break
                            }
                            c[Na >> 2] = c[cb >> 2]
                            c[cb >> 2] = c[P >> 2]
                            c[P >> 2] = Ff
                            Mf = Df
                            Nf = Bf
                            Of = Cf
                            Pf = Ef
                            Qf = Ff
                          }
                        while (0)
                        m: do
                          if ((B | 0) == 119) {
                            B = 0
                            Ka = (Af + (((Zc | 0) == 0) & 1)) | 0
                            switch (Ka | 0) {
                              case 0: {
                                Mf = yf
                                Nf = wf
                                Of = xf
                                Pf = zf
                                Qf = c[P >> 2] | 0
                                break m
                                break
                              }
                              case 3: {
                                ad = ((c[P >> 2] | 0) + -1) | 0
                                Rf = (ad + (((ad | 0) == 0) & 1)) | 0
                                B = 122
                                break
                              }
                              default: {
                                ad = c[(p + 44 + (Ka << 2)) >> 2] | 0
                                Ec = (ad + (((ad | 0) == 0) & 1)) | 0
                                if ((Ka | 0) == 1) Sf = Ec
                                else {
                                  Rf = Ec
                                  B = 122
                                }
                              }
                            }
                            if ((B | 0) == 122) {
                              B = 0
                              c[Na >> 2] = c[cb >> 2]
                              Sf = Rf
                            }
                            c[cb >> 2] = c[P >> 2]
                            c[P >> 2] = Sf
                            Mf = yf
                            Nf = wf
                            Of = xf
                            Pf = zf
                            Qf = Sf
                          }
                        while (0)
                        Ec = (Pf + lb) | 0
                        if (!((Ya << 24) >> 24)) {
                          Tf = Pf
                          Uf = 0
                        } else {
                          Ka = (c[dc >> 2] << (Pf & 31)) >>> ((0 - Ya) & 31)
                          c[fc >> 2] = Ec
                          Tf = Ec
                          Uf = Ka
                        }
                        Ka = (Uf + Fc) | 0
                        do
                          if (($c >>> 0 < 20) | (Tf >>> 0 > 32)) {
                            Vf = Tf
                            Wf = Of
                            Xf = Nf
                          } else {
                            if (Mf >>> 0 >= Za >>> 0) {
                              Ec = (Mf + (0 - (Tf >>> 3))) | 0
                              c[Ta >> 2] = Ec
                              ad = Tf & 7
                              c[fc >> 2] = ad
                              c[dc >> 2] =
                                d[Ec >> 0] |
                                (d[(Ec + 1) >> 0] << 8) |
                                (d[(Ec + 2) >> 0] << 16) |
                                (d[(Ec + 3) >> 0] << 24)
                              Vf = ad
                              Wf = Ec
                              Xf = Ec
                              break
                            }
                            Ec = c[Ia >> 2] | 0
                            if ((Mf | 0) == (Ec | 0)) {
                              Vf = Tf
                              Wf = Of
                              Xf = Nf
                              break
                            }
                            ad = Tf >>> 3
                            $d =
                              ((Mf + (0 - ad)) | 0) >>> 0 < Ec >>> 0
                                ? (Mf - Ec) | 0
                                : ad
                            ad = (Mf + (0 - $d)) | 0
                            c[Ta >> 2] = ad
                            Ec = (Tf - ($d << 3)) | 0
                            c[fc >> 2] = Ec
                            c[dc >> 2] =
                              d[ad >> 0] |
                              (d[(ad + 1) >> 0] << 8) |
                              (d[(ad + 2) >> 0] << 16) |
                              (d[(ad + 3) >> 0] << 24)
                            Vf = Ec
                            Wf = ad
                            Xf = ad
                          }
                        while (0)
                        $c = (Vf + bb) | 0
                        if (!((_c << 24) >> 24)) {
                          Yf = Vf
                          Zf = 0
                        } else {
                          Fc = (c[dc >> 2] << (Vf & 31)) >>> ((0 - _c) & 31)
                          c[fc >> 2] = $c
                          Yf = $c
                          Zf = Fc
                        }
                        Fc = (Zf + Zc) | 0
                        do
                          if (Yf >>> 0 > 32) {
                            _f = Xf
                            $f = Yf
                          } else {
                            if (Wf >>> 0 >= Za >>> 0) {
                              $c = (Wf + (0 - (Yf >>> 3))) | 0
                              c[Ta >> 2] = $c
                              Ya = Yf & 7
                              c[fc >> 2] = Ya
                              c[dc >> 2] =
                                d[$c >> 0] |
                                (d[($c + 1) >> 0] << 8) |
                                (d[($c + 2) >> 0] << 16) |
                                (d[($c + 3) >> 0] << 24)
                              _f = $c
                              $f = Ya
                              break
                            }
                            Ya = c[Ia >> 2] | 0
                            if ((Wf | 0) == (Ya | 0)) {
                              _f = Xf
                              $f = Yf
                              break
                            }
                            $c = Yf >>> 3
                            lb =
                              ((Wf + (0 - $c)) | 0) >>> 0 < Ya >>> 0
                                ? (Wf - Ya) | 0
                                : $c
                            $c = (Wf + (0 - lb)) | 0
                            c[Ta >> 2] = $c
                            Ya = (Yf - (lb << 3)) | 0
                            c[fc >> 2] = Ya
                            c[dc >> 2] =
                              d[$c >> 0] |
                              (d[($c + 1) >> 0] << 8) |
                              (d[($c + 2) >> 0] << 16) |
                              (d[($c + 3) >> 0] << 24)
                            _f = $c
                            $f = Ya
                          }
                        while (0)
                        Zc = ((c[Ha >> 2] | 0) + Fc) | 0
                        _c =
                          ((Qf >>> 0 > Zc >>> 0
                            ? c[T >> 2] | 0
                            : c[na >> 2] | 0) +
                            Zc +
                            (0 - Qf)) |
                          0
                        c[Ha >> 2] = Zc + Ka
                        Zc = b[(Gc + (Yc << 3)) >> 1] | 0
                        bb = d[(Gc + (Yc << 3) + 3) >> 0] | 0
                        Ya = c[dc >> 2] | 0
                        $c = ($f + bb) | 0
                        lb =
                          (Ya >>> ((0 - $c) & 31)) & c[(3808 + (bb << 2)) >> 2]
                        c[fc >> 2] = $c
                        c[U >> 2] = lb + (Zc & 65535)
                        Zc = b[(vb + (Bc << 3)) >> 1] | 0
                        lb = d[(vb + (Bc << 3) + 3) >> 0] | 0
                        bb = ($c + lb) | 0
                        $c =
                          (Ya >>> ((0 - bb) & 31)) & c[(3808 + (lb << 2)) >> 2]
                        c[fc >> 2] = bb
                        c[V >> 2] = $c + (Zc & 65535)
                        do
                          if (bb >>> 0 > 32) {
                            ag = Ya
                            bg = bb
                          } else {
                            if (_f >>> 0 >= Za >>> 0) {
                              Zc = (_f + (0 - (bb >>> 3))) | 0
                              c[Ta >> 2] = Zc
                              $c = bb & 7
                              c[fc >> 2] = $c
                              lb =
                                d[Zc >> 0] |
                                (d[(Zc + 1) >> 0] << 8) |
                                (d[(Zc + 2) >> 0] << 16) |
                                (d[(Zc + 3) >> 0] << 24)
                              c[dc >> 2] = lb
                              ag = lb
                              bg = $c
                              break
                            }
                            $c = c[Ia >> 2] | 0
                            if ((_f | 0) == ($c | 0)) {
                              ag = Ya
                              bg = bb
                              break
                            }
                            lb = bb >>> 3
                            Zc =
                              ((_f + (0 - lb)) | 0) >>> 0 < $c >>> 0
                                ? (_f - $c) | 0
                                : lb
                            lb = (_f + (0 - Zc)) | 0
                            c[Ta >> 2] = lb
                            $c = (bb - (Zc << 3)) | 0
                            c[fc >> 2] = $c
                            Zc =
                              d[lb >> 0] |
                              (d[(lb + 1) >> 0] << 8) |
                              (d[(lb + 2) >> 0] << 16) |
                              (d[(lb + 3) >> 0] << 24)
                            c[dc >> 2] = Zc
                            ag = Zc
                            bg = $c
                          }
                        while (0)
                        bb = b[($a + (Ua << 3)) >> 1] | 0
                        Ya = d[($a + (Ua << 3) + 3) >> 0] | 0
                        Bc = (bg + Ya) | 0
                        vb =
                          (ag >>> ((0 - Bc) & 31)) & c[(3808 + (Ya << 2)) >> 2]
                        c[fc >> 2] = Bc
                        c[Z >> 2] = vb + (bb & 65535)
                        bb = ub & 3
                        vb = (o + (bb << 4)) | 0
                        c[m >> 2] = c[vb >> 2]
                        c[(m + 4) >> 2] = c[(vb + 4) >> 2]
                        c[(m + 8) >> 2] = c[(vb + 8) >> 2]
                        c[(m + 12) >> 2] = c[(vb + 12) >> 2]
                        Bc = c[m >> 2] | 0
                        Ya = (Xa + Bc) | 0
                        Yc = c[Cc >> 2] | 0
                        Gc = (Yc + Bc) | 0
                        $c = c[n >> 2] | 0
                        Zc = ($c + Bc) | 0
                        lb = c[ib >> 2] | 0
                        ad = (Ya + (0 - lb)) | 0
                        n: do
                          if (
                            (Zc >>> 0 > J >>> 0) |
                            (((Xa + Gc) | 0) >>> 0 > gb >>> 0)
                          ) {
                            c[l >> 2] = c[m >> 2]
                            c[(l + 4) >> 2] = c[(m + 4) >> 2]
                            c[(l + 8) >> 2] = c[(m + 8) >> 2]
                            c[(l + 12) >> 2] = c[(m + 12) >> 2]
                            cg = ua(Xa, M, l, n, J, G, z, F) | 0
                          } else {
                            Mb = Xa
                            Nb = $c
                            Ob = (Mb + 16) | 0
                            do {
                              a[Mb >> 0] = a[Nb >> 0] | 0
                              Mb = (Mb + 1) | 0
                              Nb = (Nb + 1) | 0
                            } while ((Mb | 0) < (Ob | 0))
                            do
                              if (Bc >>> 0 > 16) {
                                Ec = ($c + 16) | 0
                                $d = (Bc + -16) | 0
                                Mb = (Xa + 16) | 0
                                Nb = Ec
                                Ob = (Mb + 16) | 0
                                do {
                                  a[Mb >> 0] = a[Nb >> 0] | 0
                                  Mb = (Mb + 1) | 0
                                  Nb = (Nb + 1) | 0
                                } while ((Mb | 0) < (Ob | 0))
                                Mb = (Xa + 32) | 0
                                Nb = ($c + 32) | 0
                                Ob = (Mb + 16) | 0
                                do {
                                  a[Mb >> 0] = a[Nb >> 0] | 0
                                  Mb = (Mb + 1) | 0
                                  Nb = (Nb + 1) | 0
                                } while ((Mb | 0) < (Ob | 0))
                                if (($d | 0) < 33) break
                                Hc = (Xa + 48) | 0
                                bd = Ec
                                do {
                                  Kd = bd
                                  bd = (bd + 32) | 0
                                  Mb = Hc
                                  Nb = bd
                                  Ob = (Mb + 16) | 0
                                  do {
                                    a[Mb >> 0] = a[Nb >> 0] | 0
                                    Mb = (Mb + 1) | 0
                                    Nb = (Nb + 1) | 0
                                  } while ((Mb | 0) < (Ob | 0))
                                  Mb = (Hc + 16) | 0
                                  Nb = (Kd + 48) | 0
                                  Ob = (Mb + 16) | 0
                                  do {
                                    a[Mb >> 0] = a[Nb >> 0] | 0
                                    Mb = (Mb + 1) | 0
                                    Nb = (Nb + 1) | 0
                                  } while ((Mb | 0) < (Ob | 0))
                                  Hc = (Hc + 32) | 0
                                } while (Hc >>> 0 < Ya >>> 0)
                              }
                            while (0)
                            c[n >> 2] = Zc
                            Hc = Ya
                            do
                              if (lb >>> 0 > ((Hc - R) | 0) >>> 0) {
                                if (lb >>> 0 > ((Hc - mb) | 0) >>> 0) break l
                                bd = (ad - R) | 0
                                Ec = (F + bd) | 0
                                if (((Ec + Yc) | 0) >>> 0 > F >>> 0) {
                                  $d = (0 - bd) | 0
                                  cc(Ya | 0, Ec | 0, $d | 0) | 0
                                  Kd = (bd + Yc) | 0
                                  c[Cc >> 2] = Kd
                                  dg = Kd
                                  eg = R
                                  fg = (Ya + $d) | 0
                                  break
                                } else {
                                  cc(Ya | 0, Ec | 0, Yc | 0) | 0
                                  cg = Gc
                                  break n
                                }
                              } else {
                                dg = Yc
                                eg = ad
                                fg = Ya
                              }
                            while (0)
                            if (lb >>> 0 > 15) {
                              Hc = eg
                              Ec = (fg + dg) | 0
                              Mb = fg
                              Nb = Hc
                              Ob = (Mb + 16) | 0
                              do {
                                a[Mb >> 0] = a[Nb >> 0] | 0
                                Mb = (Mb + 1) | 0
                                Nb = (Nb + 1) | 0
                              } while ((Mb | 0) < (Ob | 0))
                              Mb = (fg + 16) | 0
                              Nb = (Hc + 16) | 0
                              Ob = (Mb + 16) | 0
                              do {
                                a[Mb >> 0] = a[Nb >> 0] | 0
                                Mb = (Mb + 1) | 0
                                Nb = (Nb + 1) | 0
                              } while ((Mb | 0) < (Ob | 0))
                              if ((dg | 0) < 33) {
                                cg = Gc
                                break
                              }
                              $d = (fg + 32) | 0
                              Kd = Hc
                              while (1) {
                                bd = Kd
                                Kd = (Kd + 32) | 0
                                Mb = $d
                                Nb = Kd
                                Ob = (Mb + 16) | 0
                                do {
                                  a[Mb >> 0] = a[Nb >> 0] | 0
                                  Mb = (Mb + 1) | 0
                                  Nb = (Nb + 1) | 0
                                } while ((Mb | 0) < (Ob | 0))
                                Mb = ($d + 16) | 0
                                Nb = (bd + 48) | 0
                                Ob = (Mb + 16) | 0
                                do {
                                  a[Mb >> 0] = a[Nb >> 0] | 0
                                  Mb = (Mb + 1) | 0
                                  Nb = (Nb + 1) | 0
                                } while ((Mb | 0) < (Ob | 0))
                                $d = ($d + 32) | 0
                                if ($d >>> 0 >= Ec >>> 0) {
                                  cg = Gc
                                  break n
                                }
                              }
                            }
                            if (lb >>> 0 < 8) {
                              Ec = c[(3744 + (lb << 2)) >> 2] | 0
                              $d = eg
                              a[fg >> 0] = a[$d >> 0] | 0
                              a[(fg + 1) >> 0] = a[($d + 1) >> 0] | 0
                              a[(fg + 2) >> 0] = a[($d + 2) >> 0] | 0
                              a[(fg + 3) >> 0] = a[($d + 3) >> 0] | 0
                              Kd = ($d + (c[(3776 + (lb << 2)) >> 2] | 0)) | 0
                              $d = (fg + 4) | 0
                              Hc =
                                d[Kd >> 0] |
                                (d[(Kd + 1) >> 0] << 8) |
                                (d[(Kd + 2) >> 0] << 16) |
                                (d[(Kd + 3) >> 0] << 24)
                              a[$d >> 0] = Hc
                              a[($d + 1) >> 0] = Hc >> 8
                              a[($d + 2) >> 0] = Hc >> 16
                              a[($d + 3) >> 0] = Hc >> 24
                              gg = (Kd + (0 - Ec)) | 0
                            } else {
                              Ec = eg
                              Kd = Ec
                              Hc =
                                d[Kd >> 0] |
                                (d[(Kd + 1) >> 0] << 8) |
                                (d[(Kd + 2) >> 0] << 16) |
                                (d[(Kd + 3) >> 0] << 24)
                              Kd = (Ec + 4) | 0
                              Ec =
                                d[Kd >> 0] |
                                (d[(Kd + 1) >> 0] << 8) |
                                (d[(Kd + 2) >> 0] << 16) |
                                (d[(Kd + 3) >> 0] << 24)
                              Kd = fg
                              $d = Kd
                              a[$d >> 0] = Hc
                              a[($d + 1) >> 0] = Hc >> 8
                              a[($d + 2) >> 0] = Hc >> 16
                              a[($d + 3) >> 0] = Hc >> 24
                              Hc = (Kd + 4) | 0
                              a[Hc >> 0] = Ec
                              a[(Hc + 1) >> 0] = Ec >> 8
                              a[(Hc + 2) >> 0] = Ec >> 16
                              a[(Hc + 3) >> 0] = Ec >> 24
                              gg = eg
                            }
                            Ec = (gg + 8) | 0
                            Hc = (fg + 8) | 0
                            Kd = c[Cc >> 2] | 0
                            if (Kd >>> 0 <= 8) {
                              cg = Gc
                              break
                            }
                            $d = (fg + Kd) | 0
                            if (((Hc - Ec) | 0) < 16) {
                              bd = Ec
                              rd = Hc
                              while (1) {
                                Jd = bd
                                Id = Jd
                                sd =
                                  d[Id >> 0] |
                                  (d[(Id + 1) >> 0] << 8) |
                                  (d[(Id + 2) >> 0] << 16) |
                                  (d[(Id + 3) >> 0] << 24)
                                Id = (Jd + 4) | 0
                                Jd =
                                  d[Id >> 0] |
                                  (d[(Id + 1) >> 0] << 8) |
                                  (d[(Id + 2) >> 0] << 16) |
                                  (d[(Id + 3) >> 0] << 24)
                                Id = rd
                                _d = Id
                                a[_d >> 0] = sd
                                a[(_d + 1) >> 0] = sd >> 8
                                a[(_d + 2) >> 0] = sd >> 16
                                a[(_d + 3) >> 0] = sd >> 24
                                sd = (Id + 4) | 0
                                a[sd >> 0] = Jd
                                a[(sd + 1) >> 0] = Jd >> 8
                                a[(sd + 2) >> 0] = Jd >> 16
                                a[(sd + 3) >> 0] = Jd >> 24
                                rd = (rd + 8) | 0
                                if (rd >>> 0 >= $d >>> 0) {
                                  cg = Gc
                                  break n
                                } else bd = (bd + 8) | 0
                              }
                            }
                            Mb = Hc
                            Nb = Ec
                            Ob = (Mb + 16) | 0
                            do {
                              a[Mb >> 0] = a[Nb >> 0] | 0
                              Mb = (Mb + 1) | 0
                              Nb = (Nb + 1) | 0
                            } while ((Mb | 0) < (Ob | 0))
                            Mb = (fg + 24) | 0
                            Nb = (gg + 24) | 0
                            Ob = (Mb + 16) | 0
                            do {
                              a[Mb >> 0] = a[Nb >> 0] | 0
                              Mb = (Mb + 1) | 0
                              Nb = (Nb + 1) | 0
                            } while ((Mb | 0) < (Ob | 0))
                            if ((Kd | 0) < 41) {
                              cg = Gc
                              break
                            }
                            Hc = (fg + 40) | 0
                            bd = Ec
                            do {
                              rd = bd
                              bd = (bd + 32) | 0
                              Mb = Hc
                              Nb = bd
                              Ob = (Mb + 16) | 0
                              do {
                                a[Mb >> 0] = a[Nb >> 0] | 0
                                Mb = (Mb + 1) | 0
                                Nb = (Nb + 1) | 0
                              } while ((Mb | 0) < (Ob | 0))
                              Mb = (Hc + 16) | 0
                              Nb = (rd + 48) | 0
                              Ob = (Mb + 16) | 0
                              do {
                                a[Mb >> 0] = a[Nb >> 0] | 0
                                Mb = (Mb + 1) | 0
                                Nb = (Nb + 1) | 0
                              } while ((Mb | 0) < (Ob | 0))
                              Hc = (Hc + 32) | 0
                            } while (Hc >>> 0 < $d >>> 0)
                            cg = Gc
                          }
                        while (0)
                        if (cg >>> 0 >= 4294967177) {
                          _b = cg
                          break i
                        }
                        c[vb >> 2] = Fc
                        c[(o + (bb << 4) + 4) >> 2] = Ka
                        c[(o + (bb << 4) + 8) >> 2] = Qf
                        c[(o + (bb << 4) + 12) >> 2] = _c
                        Gc = (Xa + cg) | 0
                        lb = (ub + 1) | 0
                        Ya = c[fc >> 2] | 0
                        if (Ya >>> 0 > 32) {
                          kf = Gc
                          lf = lb
                          B = 97
                          break j
                        }
                        ad = c[Ta >> 2] | 0
                        _a = ad
                        Za = c[ha >> 2] | 0
                        Wa = Ya
                        ab = ad
                        Oa = ad
                        hb = ad
                        qb = ad
                        Va = ad
                        Xa = Gc
                        ub = lb
                      }
                      _b = -20
                      break i
                    }
                  } else {
                    c[(p + 40) >> 2] = W + 8
                    rc = 0
                    B = 94
                  }
                while (0)
                if ((B | 0) == 94)
                  if ((rc | 0) < (Ja | 0)) {
                    _b = -20
                    break
                  } else {
                    kf = f
                    lf = rc
                    B = 97
                  }
                if ((B | 0) == 97)
                  if ((lf | 0) < (I | 0)) {
                    _b = -20
                    break
                  } else {
                    uf = kf
                    vf = lf
                  }
                W = (vf - Ja) | 0
                o: do
                  if ((W | 0) < (I | 0)) {
                    ha = (m + 4) | 0
                    Z = (m + 8) | 0
                    Ia = (M + -32) | 0
                    V = z
                    U = uf
                    ia = W
                    p: while (1) {
                      Y = (o + ((ia & 3) << 4)) | 0
                      c[m >> 2] = c[Y >> 2]
                      c[(m + 4) >> 2] = c[(Y + 4) >> 2]
                      c[(m + 8) >> 2] = c[(Y + 8) >> 2]
                      c[(m + 12) >> 2] = c[(Y + 12) >> 2]
                      Y = c[m >> 2] | 0
                      Fa = (U + Y) | 0
                      Ea = c[ha >> 2] | 0
                      xa = (Ea + Y) | 0
                      ga = c[n >> 2] | 0
                      X = (ga + Y) | 0
                      Da = c[Z >> 2] | 0
                      S = (Fa + (0 - Da)) | 0
                      q: do
                        if (
                          (X >>> 0 > J >>> 0) |
                          (((U + xa) | 0) >>> 0 > Ia >>> 0)
                        ) {
                          c[l >> 2] = c[m >> 2]
                          c[(l + 4) >> 2] = c[(m + 4) >> 2]
                          c[(l + 8) >> 2] = c[(m + 8) >> 2]
                          c[(l + 12) >> 2] = c[(m + 12) >> 2]
                          hg = ua(U, M, l, n, J, G, z, F) | 0
                        } else {
                          Mb = U
                          Nb = ga
                          Ob = (Mb + 16) | 0
                          do {
                            a[Mb >> 0] = a[Nb >> 0] | 0
                            Mb = (Mb + 1) | 0
                            Nb = (Nb + 1) | 0
                          } while ((Mb | 0) < (Ob | 0))
                          do
                            if (Y >>> 0 > 16) {
                              qa = (ga + 16) | 0
                              oa = (Y + -16) | 0
                              Mb = (U + 16) | 0
                              Nb = qa
                              Ob = (Mb + 16) | 0
                              do {
                                a[Mb >> 0] = a[Nb >> 0] | 0
                                Mb = (Mb + 1) | 0
                                Nb = (Nb + 1) | 0
                              } while ((Mb | 0) < (Ob | 0))
                              Mb = (U + 32) | 0
                              Nb = (ga + 32) | 0
                              Ob = (Mb + 16) | 0
                              do {
                                a[Mb >> 0] = a[Nb >> 0] | 0
                                Mb = (Mb + 1) | 0
                                Nb = (Nb + 1) | 0
                              } while ((Mb | 0) < (Ob | 0))
                              if ((oa | 0) < 33) break
                              ub = (U + 48) | 0
                              Xa = qa
                              do {
                                Va = Xa
                                Xa = (Xa + 32) | 0
                                Mb = ub
                                Nb = Xa
                                Ob = (Mb + 16) | 0
                                do {
                                  a[Mb >> 0] = a[Nb >> 0] | 0
                                  Mb = (Mb + 1) | 0
                                  Nb = (Nb + 1) | 0
                                } while ((Mb | 0) < (Ob | 0))
                                Mb = (ub + 16) | 0
                                Nb = (Va + 48) | 0
                                Ob = (Mb + 16) | 0
                                do {
                                  a[Mb >> 0] = a[Nb >> 0] | 0
                                  Mb = (Mb + 1) | 0
                                  Nb = (Nb + 1) | 0
                                } while ((Mb | 0) < (Ob | 0))
                                ub = (ub + 32) | 0
                              } while (ub >>> 0 < Fa >>> 0)
                            }
                          while (0)
                          c[n >> 2] = X
                          ub = Fa
                          do
                            if (Da >>> 0 > ((ub - R) | 0) >>> 0) {
                              if (Da >>> 0 > ((ub - V) | 0) >>> 0) {
                                B = 184
                                break p
                              }
                              Xa = (S - R) | 0
                              qa = (F + Xa) | 0
                              if (((qa + Ea) | 0) >>> 0 > F >>> 0) {
                                oa = (0 - Xa) | 0
                                cc(Fa | 0, qa | 0, oa | 0) | 0
                                Va = (Xa + Ea) | 0
                                c[ha >> 2] = Va
                                ig = Va
                                jg = R
                                kg = (Fa + oa) | 0
                                break
                              } else {
                                cc(Fa | 0, qa | 0, Ea | 0) | 0
                                hg = xa
                                break q
                              }
                            } else {
                              ig = Ea
                              jg = S
                              kg = Fa
                            }
                          while (0)
                          if (Da >>> 0 > 15) {
                            ub = jg
                            qa = (kg + ig) | 0
                            Mb = kg
                            Nb = ub
                            Ob = (Mb + 16) | 0
                            do {
                              a[Mb >> 0] = a[Nb >> 0] | 0
                              Mb = (Mb + 1) | 0
                              Nb = (Nb + 1) | 0
                            } while ((Mb | 0) < (Ob | 0))
                            Mb = (kg + 16) | 0
                            Nb = (ub + 16) | 0
                            Ob = (Mb + 16) | 0
                            do {
                              a[Mb >> 0] = a[Nb >> 0] | 0
                              Mb = (Mb + 1) | 0
                              Nb = (Nb + 1) | 0
                            } while ((Mb | 0) < (Ob | 0))
                            if ((ig | 0) < 33) {
                              hg = xa
                              break
                            }
                            oa = (kg + 32) | 0
                            Va = ub
                            while (1) {
                              Xa = Va
                              Va = (Va + 32) | 0
                              Mb = oa
                              Nb = Va
                              Ob = (Mb + 16) | 0
                              do {
                                a[Mb >> 0] = a[Nb >> 0] | 0
                                Mb = (Mb + 1) | 0
                                Nb = (Nb + 1) | 0
                              } while ((Mb | 0) < (Ob | 0))
                              Mb = (oa + 16) | 0
                              Nb = (Xa + 48) | 0
                              Ob = (Mb + 16) | 0
                              do {
                                a[Mb >> 0] = a[Nb >> 0] | 0
                                Mb = (Mb + 1) | 0
                                Nb = (Nb + 1) | 0
                              } while ((Mb | 0) < (Ob | 0))
                              oa = (oa + 32) | 0
                              if (oa >>> 0 >= qa >>> 0) {
                                hg = xa
                                break q
                              }
                            }
                          }
                          if (Da >>> 0 < 8) {
                            qa = c[(3744 + (Da << 2)) >> 2] | 0
                            oa = jg
                            a[kg >> 0] = a[oa >> 0] | 0
                            a[(kg + 1) >> 0] = a[(oa + 1) >> 0] | 0
                            a[(kg + 2) >> 0] = a[(oa + 2) >> 0] | 0
                            a[(kg + 3) >> 0] = a[(oa + 3) >> 0] | 0
                            Va = (oa + (c[(3776 + (Da << 2)) >> 2] | 0)) | 0
                            oa = (kg + 4) | 0
                            ub =
                              d[Va >> 0] |
                              (d[(Va + 1) >> 0] << 8) |
                              (d[(Va + 2) >> 0] << 16) |
                              (d[(Va + 3) >> 0] << 24)
                            a[oa >> 0] = ub
                            a[(oa + 1) >> 0] = ub >> 8
                            a[(oa + 2) >> 0] = ub >> 16
                            a[(oa + 3) >> 0] = ub >> 24
                            lg = (Va + (0 - qa)) | 0
                          } else {
                            qa = jg
                            Va = qa
                            ub =
                              d[Va >> 0] |
                              (d[(Va + 1) >> 0] << 8) |
                              (d[(Va + 2) >> 0] << 16) |
                              (d[(Va + 3) >> 0] << 24)
                            Va = (qa + 4) | 0
                            qa =
                              d[Va >> 0] |
                              (d[(Va + 1) >> 0] << 8) |
                              (d[(Va + 2) >> 0] << 16) |
                              (d[(Va + 3) >> 0] << 24)
                            Va = kg
                            oa = Va
                            a[oa >> 0] = ub
                            a[(oa + 1) >> 0] = ub >> 8
                            a[(oa + 2) >> 0] = ub >> 16
                            a[(oa + 3) >> 0] = ub >> 24
                            ub = (Va + 4) | 0
                            a[ub >> 0] = qa
                            a[(ub + 1) >> 0] = qa >> 8
                            a[(ub + 2) >> 0] = qa >> 16
                            a[(ub + 3) >> 0] = qa >> 24
                            lg = jg
                          }
                          qa = (lg + 8) | 0
                          ub = (kg + 8) | 0
                          Va = c[ha >> 2] | 0
                          if (Va >>> 0 <= 8) {
                            hg = xa
                            break
                          }
                          oa = (kg + Va) | 0
                          if (((ub - qa) | 0) < 16) {
                            Xa = qa
                            qb = ub
                            while (1) {
                              hb = Xa
                              Oa = hb
                              ab =
                                d[Oa >> 0] |
                                (d[(Oa + 1) >> 0] << 8) |
                                (d[(Oa + 2) >> 0] << 16) |
                                (d[(Oa + 3) >> 0] << 24)
                              Oa = (hb + 4) | 0
                              hb =
                                d[Oa >> 0] |
                                (d[(Oa + 1) >> 0] << 8) |
                                (d[(Oa + 2) >> 0] << 16) |
                                (d[(Oa + 3) >> 0] << 24)
                              Oa = qb
                              Wa = Oa
                              a[Wa >> 0] = ab
                              a[(Wa + 1) >> 0] = ab >> 8
                              a[(Wa + 2) >> 0] = ab >> 16
                              a[(Wa + 3) >> 0] = ab >> 24
                              ab = (Oa + 4) | 0
                              a[ab >> 0] = hb
                              a[(ab + 1) >> 0] = hb >> 8
                              a[(ab + 2) >> 0] = hb >> 16
                              a[(ab + 3) >> 0] = hb >> 24
                              qb = (qb + 8) | 0
                              if (qb >>> 0 >= oa >>> 0) {
                                hg = xa
                                break q
                              } else Xa = (Xa + 8) | 0
                            }
                          }
                          Mb = ub
                          Nb = qa
                          Ob = (Mb + 16) | 0
                          do {
                            a[Mb >> 0] = a[Nb >> 0] | 0
                            Mb = (Mb + 1) | 0
                            Nb = (Nb + 1) | 0
                          } while ((Mb | 0) < (Ob | 0))
                          Mb = (kg + 24) | 0
                          Nb = (lg + 24) | 0
                          Ob = (Mb + 16) | 0
                          do {
                            a[Mb >> 0] = a[Nb >> 0] | 0
                            Mb = (Mb + 1) | 0
                            Nb = (Nb + 1) | 0
                          } while ((Mb | 0) < (Ob | 0))
                          if ((Va | 0) < 41) {
                            hg = xa
                            break
                          }
                          ub = (kg + 40) | 0
                          Xa = qa
                          do {
                            qb = Xa
                            Xa = (Xa + 32) | 0
                            Mb = ub
                            Nb = Xa
                            Ob = (Mb + 16) | 0
                            do {
                              a[Mb >> 0] = a[Nb >> 0] | 0
                              Mb = (Mb + 1) | 0
                              Nb = (Nb + 1) | 0
                            } while ((Mb | 0) < (Ob | 0))
                            Mb = (ub + 16) | 0
                            Nb = (qb + 48) | 0
                            Ob = (Mb + 16) | 0
                            do {
                              a[Mb >> 0] = a[Nb >> 0] | 0
                              Mb = (Mb + 1) | 0
                              Nb = (Nb + 1) | 0
                            } while ((Mb | 0) < (Ob | 0))
                            ub = (ub + 32) | 0
                          } while (ub >>> 0 < oa >>> 0)
                          hg = xa
                        }
                      while (0)
                      if (hg >>> 0 >= 4294967177) {
                        mg = hg
                        break
                      }
                      xa = (U + hg) | 0
                      ia = (ia + 1) | 0
                      if ((ia | 0) >= (I | 0)) {
                        ng = xa
                        break o
                      } else U = xa
                    }
                    if ((B | 0) == 184) mg = -20
                    og = mg
                    break h
                  } else ng = uf
                while (0)
                c[Q >> 2] = c[P >> 2]
                c[(Q + 4) >> 2] = c[(P + 4) >> 2]
                c[(Q + 8) >> 2] = c[(P + 8) >> 2]
                Yb = c[n >> 2] | 0
                Zb = ng
                B = 207
                break h
              }
            while (0)
            og = _b
          }
        while (0)
        if ((B | 0) == 207) {
          F = (J - Yb) | 0
          if (F >>> 0 > ((M - Zb) | 0) >>> 0) og = -70
          else {
            bc(Zb | 0, Yb | 0, F | 0) | 0
            og = (Zb + F - f) | 0
          }
        }
        Xb = og
      } else Xb = i
    while (0)
    v = Xb
    K = k
    return v | 0
  }
  function ua(b, e, f, g, h, i, j, k) {
    b = b | 0
    e = e | 0
    f = f | 0
    g = g | 0
    h = h | 0
    i = i | 0
    j = j | 0
    k = k | 0
    var l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0
    l = c[f >> 2] | 0
    m = (b + l) | 0
    n = (f + 4) | 0
    o = ((c[n >> 2] | 0) + l) | 0
    p = c[g >> 2] | 0
    q = (p + l) | 0
    r = (f + 8) | 0
    f = (m + (0 - (c[r >> 2] | 0))) | 0
    s = (e + -32) | 0
    if (((b + o) | 0) >>> 0 > e >>> 0) {
      t = -70
      return t | 0
    }
    if (q >>> 0 > h >>> 0) {
      t = -20
      return t | 0
    }
    h = b
    a: do
      if ((l | 0) < 8) {
        if ((l | 0) > 0) {
          e = p
          u = b
          while (1) {
            a[u >> 0] = a[e >> 0] | 0
            u = (u + 1) | 0
            if (u >>> 0 >= m >>> 0) break
            else e = (e + 1) | 0
          }
        }
      } else {
        if (m >>> 0 <= s >>> 0) {
          v = b
          w = p
          x = (v + 16) | 0
          do {
            a[v >> 0] = a[w >> 0] | 0
            v = (v + 1) | 0
            w = (w + 1) | 0
          } while ((v | 0) < (x | 0))
          v = (b + 16) | 0
          w = (p + 16) | 0
          x = (v + 16) | 0
          do {
            a[v >> 0] = a[w >> 0] | 0
            v = (v + 1) | 0
            w = (w + 1) | 0
          } while ((v | 0) < (x | 0))
          if ((l | 0) < 33) break
          e = (b + 32) | 0
          u = p
          while (1) {
            y = u
            u = (u + 32) | 0
            v = e
            w = u
            x = (v + 16) | 0
            do {
              a[v >> 0] = a[w >> 0] | 0
              v = (v + 1) | 0
              w = (w + 1) | 0
            } while ((v | 0) < (x | 0))
            v = (e + 16) | 0
            w = (y + 48) | 0
            x = (v + 16) | 0
            do {
              a[v >> 0] = a[w >> 0] | 0
              v = (v + 1) | 0
              w = (w + 1) | 0
            } while ((v | 0) < (x | 0))
            e = (e + 32) | 0
            if (e >>> 0 >= m >>> 0) break a
          }
        }
        if (s >>> 0 < b >>> 0) {
          z = p
          A = b
        } else {
          e = (s - h) | 0
          v = b
          w = p
          x = (v + 16) | 0
          do {
            a[v >> 0] = a[w >> 0] | 0
            v = (v + 1) | 0
            w = (w + 1) | 0
          } while ((v | 0) < (x | 0))
          v = (b + 16) | 0
          w = (p + 16) | 0
          x = (v + 16) | 0
          do {
            a[v >> 0] = a[w >> 0] | 0
            v = (v + 1) | 0
            w = (w + 1) | 0
          } while ((v | 0) < (x | 0))
          if ((e | 0) >= 33) {
            u = (b + 32) | 0
            y = p
            do {
              B = y
              y = (y + 32) | 0
              v = u
              w = y
              x = (v + 16) | 0
              do {
                a[v >> 0] = a[w >> 0] | 0
                v = (v + 1) | 0
                w = (w + 1) | 0
              } while ((v | 0) < (x | 0))
              v = (u + 16) | 0
              w = (B + 48) | 0
              x = (v + 16) | 0
              do {
                a[v >> 0] = a[w >> 0] | 0
                v = (v + 1) | 0
                w = (w + 1) | 0
              } while ((v | 0) < (x | 0))
              u = (u + 32) | 0
            } while (u >>> 0 < s >>> 0)
          }
          z = (p + e) | 0
          A = s
        }
        if (m >>> 0 > A >>> 0) {
          u = z
          y = A
          while (1) {
            a[y >> 0] = a[u >> 0] | 0
            y = (y + 1) | 0
            if ((y | 0) == (m | 0)) break
            else u = (u + 1) | 0
          }
        }
      }
    while (0)
    c[g >> 2] = q
    q = c[r >> 2] | 0
    r = m
    g = i
    do
      if (q >>> 0 > ((r - g) | 0) >>> 0) {
        if (q >>> 0 > ((r - j) | 0) >>> 0) {
          t = -20
          return t | 0
        }
        A = (f - g) | 0
        z = (k + A) | 0
        p = c[n >> 2] | 0
        if (((z + p) | 0) >>> 0 > k >>> 0) {
          b = (0 - A) | 0
          cc(m | 0, z | 0, b | 0) | 0
          h = (m + b) | 0
          b = (p + A) | 0
          c[n >> 2] = b
          C = h
          D = b
          E = i
          F = h
          G = g
          break
        }
        cc(m | 0, z | 0, p | 0) | 0
        t = o
        return t | 0
      } else {
        C = r
        D = c[n >> 2] | 0
        E = f
        F = m
        G = f
      }
    while (0)
    f = (C - G) | 0
    G = (F + D) | 0
    if ((D | 0) < 8) {
      if ((D | 0) <= 0) {
        t = o
        return t | 0
      }
      C = E
      m = F
      while (1) {
        a[m >> 0] = a[C >> 0] | 0
        m = (m + 1) | 0
        if (m >>> 0 >= G >>> 0) {
          t = o
          break
        } else C = (C + 1) | 0
      }
      return t | 0
    }
    if (f >>> 0 < 8) {
      C = c[(3744 + (f << 2)) >> 2] | 0
      a[F >> 0] = a[E >> 0] | 0
      a[(F + 1) >> 0] = a[(E + 1) >> 0] | 0
      a[(F + 2) >> 0] = a[(E + 2) >> 0] | 0
      a[(F + 3) >> 0] = a[(E + 3) >> 0] | 0
      m = (E + (c[(3776 + (f << 2)) >> 2] | 0)) | 0
      f = (F + 4) | 0
      n =
        d[m >> 0] |
        (d[(m + 1) >> 0] << 8) |
        (d[(m + 2) >> 0] << 16) |
        (d[(m + 3) >> 0] << 24)
      a[f >> 0] = n
      a[(f + 1) >> 0] = n >> 8
      a[(f + 2) >> 0] = n >> 16
      a[(f + 3) >> 0] = n >> 24
      H = (m + (0 - C)) | 0
    } else {
      C = E
      m = C
      n =
        d[m >> 0] |
        (d[(m + 1) >> 0] << 8) |
        (d[(m + 2) >> 0] << 16) |
        (d[(m + 3) >> 0] << 24)
      m = (C + 4) | 0
      C =
        d[m >> 0] |
        (d[(m + 1) >> 0] << 8) |
        (d[(m + 2) >> 0] << 16) |
        (d[(m + 3) >> 0] << 24)
      m = F
      f = m
      a[f >> 0] = n
      a[(f + 1) >> 0] = n >> 8
      a[(f + 2) >> 0] = n >> 16
      a[(f + 3) >> 0] = n >> 24
      n = (m + 4) | 0
      a[n >> 0] = C
      a[(n + 1) >> 0] = C >> 8
      a[(n + 2) >> 0] = C >> 16
      a[(n + 3) >> 0] = C >> 24
      H = E
    }
    E = (H + 8) | 0
    C = (F + 8) | 0
    n = C
    if (G >>> 0 <= s >>> 0) {
      m = (C + D) | 0
      if (((n - E) | 0) < 16) {
        f = E
        r = C
        while (1) {
          g = f
          i = g
          k =
            d[i >> 0] |
            (d[(i + 1) >> 0] << 8) |
            (d[(i + 2) >> 0] << 16) |
            (d[(i + 3) >> 0] << 24)
          i = (g + 4) | 0
          g =
            d[i >> 0] |
            (d[(i + 1) >> 0] << 8) |
            (d[(i + 2) >> 0] << 16) |
            (d[(i + 3) >> 0] << 24)
          i = r
          j = i
          a[j >> 0] = k
          a[(j + 1) >> 0] = k >> 8
          a[(j + 2) >> 0] = k >> 16
          a[(j + 3) >> 0] = k >> 24
          k = (i + 4) | 0
          a[k >> 0] = g
          a[(k + 1) >> 0] = g >> 8
          a[(k + 2) >> 0] = g >> 16
          a[(k + 3) >> 0] = g >> 24
          r = (r + 8) | 0
          if (r >>> 0 >= m >>> 0) {
            t = o
            break
          } else f = (f + 8) | 0
        }
        return t | 0
      }
      v = C
      w = E
      x = (v + 16) | 0
      do {
        a[v >> 0] = a[w >> 0] | 0
        v = (v + 1) | 0
        w = (w + 1) | 0
      } while ((v | 0) < (x | 0))
      v = (F + 24) | 0
      w = (H + 24) | 0
      x = (v + 16) | 0
      do {
        a[v >> 0] = a[w >> 0] | 0
        v = (v + 1) | 0
        w = (w + 1) | 0
      } while ((v | 0) < (x | 0))
      if ((D | 0) < 33) {
        t = o
        return t | 0
      }
      D = (F + 40) | 0
      f = E
      do {
        r = f
        f = (f + 32) | 0
        v = D
        w = f
        x = (v + 16) | 0
        do {
          a[v >> 0] = a[w >> 0] | 0
          v = (v + 1) | 0
          w = (w + 1) | 0
        } while ((v | 0) < (x | 0))
        v = (D + 16) | 0
        w = (r + 48) | 0
        x = (v + 16) | 0
        do {
          a[v >> 0] = a[w >> 0] | 0
          v = (v + 1) | 0
          w = (w + 1) | 0
        } while ((v | 0) < (x | 0))
        D = (D + 32) | 0
      } while (D >>> 0 < m >>> 0)
      t = o
      return t | 0
    }
    if (C >>> 0 > s >>> 0) {
      I = E
      J = C
    } else {
      m = (s - n) | 0
      if (((n - E) | 0) >= 16) {
        v = C
        w = E
        x = (v + 16) | 0
        do {
          a[v >> 0] = a[w >> 0] | 0
          v = (v + 1) | 0
          w = (w + 1) | 0
        } while ((v | 0) < (x | 0))
        v = (F + 24) | 0
        w = (H + 24) | 0
        x = (v + 16) | 0
        do {
          a[v >> 0] = a[w >> 0] | 0
          v = (v + 1) | 0
          w = (w + 1) | 0
        } while ((v | 0) < (x | 0))
        if ((m | 0) >= 33) {
          H = (F + 40) | 0
          F = E
          do {
            n = F
            F = (F + 32) | 0
            v = H
            w = F
            x = (v + 16) | 0
            do {
              a[v >> 0] = a[w >> 0] | 0
              v = (v + 1) | 0
              w = (w + 1) | 0
            } while ((v | 0) < (x | 0))
            v = (H + 16) | 0
            w = (n + 48) | 0
            x = (v + 16) | 0
            do {
              a[v >> 0] = a[w >> 0] | 0
              v = (v + 1) | 0
              w = (w + 1) | 0
            } while ((v | 0) < (x | 0))
            H = (H + 32) | 0
          } while (H >>> 0 < s >>> 0)
        }
      } else {
        H = E
        w = C
        while (1) {
          C = H
          v = C
          x =
            d[v >> 0] |
            (d[(v + 1) >> 0] << 8) |
            (d[(v + 2) >> 0] << 16) |
            (d[(v + 3) >> 0] << 24)
          v = (C + 4) | 0
          C =
            d[v >> 0] |
            (d[(v + 1) >> 0] << 8) |
            (d[(v + 2) >> 0] << 16) |
            (d[(v + 3) >> 0] << 24)
          v = w
          F = v
          a[F >> 0] = x
          a[(F + 1) >> 0] = x >> 8
          a[(F + 2) >> 0] = x >> 16
          a[(F + 3) >> 0] = x >> 24
          x = (v + 4) | 0
          a[x >> 0] = C
          a[(x + 1) >> 0] = C >> 8
          a[(x + 2) >> 0] = C >> 16
          a[(x + 3) >> 0] = C >> 24
          w = (w + 8) | 0
          if (w >>> 0 >= s >>> 0) break
          else H = (H + 8) | 0
        }
      }
      I = (E + m) | 0
      J = s
    }
    if (G >>> 0 <= J >>> 0) {
      t = o
      return t | 0
    }
    s = I
    I = J
    while (1) {
      a[I >> 0] = a[s >> 0] | 0
      I = (I + 1) | 0
      if ((I | 0) == (G | 0)) {
        t = o
        break
      } else s = (s + 1) | 0
    }
    return t | 0
  }
  function va(a) {
    a = a | 0
    return (a >>> 0 > 4294967176) | 0
  }
  function wa(a) {
    a = a | 0
    return (a >>> 0 < 4294967177 ? 0 : (0 - a) | 0) | 0
  }
  function xa(a, b) {
    a = a | 0
    b = b | 0
    var d = 0,
      e = 0
    d = c[b >> 2] | 0
    if (!d) {
      e = Qb(a) | 0
      return e | 0
    } else {
      e = Q[d & 0](c[(b + 8) >> 2] | 0, a) | 0
      return e | 0
    }
    return 0
  }
  function ya(a, b) {
    a = a | 0
    b = b | 0
    var d = 0
    if (!a) return
    d = c[(b + 4) >> 2] | 0
    if (!d) {
      Rb(a)
      return
    } else {
      T[d & 1](c[(b + 8) >> 2] | 0, a)
      return
    }
  }
  function za(a, b, d) {
    a = a | 0
    b = b | 0
    d = d | 0
    var e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0
    e = K
    K = (K + 48) | 0
    f = e
    g = f
    h = (g + 40) | 0
    do {
      c[g >> 2] = 0
      g = (g + 4) | 0
    } while ((g | 0) < (h | 0))
    i = Vb(b | 0, d | 0, -1379879466, 1625958382) | 0
    j = u() | 0
    k = Vb(b | 0, d | 0, 668265295, -1028477379) | 0
    l = u() | 0
    m = Vb(b | 0, d | 0, 2048144761, 1640531534) | 0
    n = u() | 0
    o = a
    c[o >> 2] = 0
    c[(o + 4) >> 2] = 0
    o = (a + 8) | 0
    c[o >> 2] = i
    c[(o + 4) >> 2] = j
    j = (a + 16) | 0
    c[j >> 2] = k
    c[(j + 4) >> 2] = l
    l = (a + 24) | 0
    c[l >> 2] = b
    c[(l + 4) >> 2] = d
    d = (a + 32) | 0
    c[d >> 2] = m
    c[(d + 4) >> 2] = n
    g = (a + 40) | 0
    a = f
    h = (g + 48) | 0
    do {
      c[g >> 2] = c[a >> 2]
      g = (g + 4) | 0
      a = (a + 4) | 0
    } while ((g | 0) < (h | 0))
    K = e
    return 0
  }
  function Aa(a, b, e) {
    a = a | 0
    b = b | 0
    e = e | 0
    var f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0,
      s = 0,
      t = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0
    f = (b + e) | 0
    g = a
    h = Vb(c[g >> 2] | 0, c[(g + 4) >> 2] | 0, e | 0, 0) | 0
    g = u() | 0
    i = a
    c[i >> 2] = h
    c[(i + 4) >> 2] = g
    g = (a + 72) | 0
    i = c[g >> 2] | 0
    do
      if (((i + e) | 0) >>> 0 >= 32) {
        if (!i) j = b
        else {
          h = (a + 40) | 0
          bc((h + i) | 0, b | 0, (32 - i) | 0) | 0
          k = (a + 8) | 0
          l = k
          m = c[l >> 2] | 0
          n = c[(l + 4) >> 2] | 0
          l = h
          h = l
          o = (l + 4) | 0
          l =
            Ub(
              d[h >> 0] |
                (d[(h + 1) >> 0] << 8) |
                (d[(h + 2) >> 0] << 16) |
                (d[(h + 3) >> 0] << 24) |
                0,
              d[o >> 0] |
                (d[(o + 1) >> 0] << 8) |
                (d[(o + 2) >> 0] << 16) |
                (d[(o + 3) >> 0] << 24) |
                0,
              668265295,
              -1028477379
            ) | 0
          o = Vb(l | 0, u() | 0, m | 0, n | 0) | 0
          n = u() | 0
          m = $b(o | 0, n | 0, 31) | 0
          l = u() | 0
          h = _b(o | 0, n | 0, 33) | 0
          n = Ub(m | h | 0, l | (u() | 0) | 0, -2048144761, -1640531535) | 0
          l = u() | 0
          h = k
          c[h >> 2] = n
          c[(h + 4) >> 2] = l
          l = (a + 16) | 0
          h = l
          n = c[h >> 2] | 0
          k = c[(h + 4) >> 2] | 0
          h = (a + 48) | 0
          m = h
          o = (h + 4) | 0
          h =
            Ub(
              d[m >> 0] |
                (d[(m + 1) >> 0] << 8) |
                (d[(m + 2) >> 0] << 16) |
                (d[(m + 3) >> 0] << 24) |
                0,
              d[o >> 0] |
                (d[(o + 1) >> 0] << 8) |
                (d[(o + 2) >> 0] << 16) |
                (d[(o + 3) >> 0] << 24) |
                0,
              668265295,
              -1028477379
            ) | 0
          o = Vb(h | 0, u() | 0, n | 0, k | 0) | 0
          k = u() | 0
          n = $b(o | 0, k | 0, 31) | 0
          h = u() | 0
          m = _b(o | 0, k | 0, 33) | 0
          k = Ub(n | m | 0, h | (u() | 0) | 0, -2048144761, -1640531535) | 0
          h = u() | 0
          m = l
          c[m >> 2] = k
          c[(m + 4) >> 2] = h
          h = (a + 24) | 0
          m = h
          k = c[m >> 2] | 0
          l = c[(m + 4) >> 2] | 0
          m = (a + 56) | 0
          n = m
          o = (m + 4) | 0
          m =
            Ub(
              d[n >> 0] |
                (d[(n + 1) >> 0] << 8) |
                (d[(n + 2) >> 0] << 16) |
                (d[(n + 3) >> 0] << 24) |
                0,
              d[o >> 0] |
                (d[(o + 1) >> 0] << 8) |
                (d[(o + 2) >> 0] << 16) |
                (d[(o + 3) >> 0] << 24) |
                0,
              668265295,
              -1028477379
            ) | 0
          o = Vb(m | 0, u() | 0, k | 0, l | 0) | 0
          l = u() | 0
          k = $b(o | 0, l | 0, 31) | 0
          m = u() | 0
          n = _b(o | 0, l | 0, 33) | 0
          l = Ub(k | n | 0, m | (u() | 0) | 0, -2048144761, -1640531535) | 0
          m = u() | 0
          n = h
          c[n >> 2] = l
          c[(n + 4) >> 2] = m
          m = (a + 32) | 0
          n = m
          l = c[n >> 2] | 0
          h = c[(n + 4) >> 2] | 0
          n = (a + 64) | 0
          k = n
          o = (n + 4) | 0
          n =
            Ub(
              d[k >> 0] |
                (d[(k + 1) >> 0] << 8) |
                (d[(k + 2) >> 0] << 16) |
                (d[(k + 3) >> 0] << 24) |
                0,
              d[o >> 0] |
                (d[(o + 1) >> 0] << 8) |
                (d[(o + 2) >> 0] << 16) |
                (d[(o + 3) >> 0] << 24) |
                0,
              668265295,
              -1028477379
            ) | 0
          o = Vb(n | 0, u() | 0, l | 0, h | 0) | 0
          h = u() | 0
          l = $b(o | 0, h | 0, 31) | 0
          n = u() | 0
          k = _b(o | 0, h | 0, 33) | 0
          h = Ub(l | k | 0, n | (u() | 0) | 0, -2048144761, -1640531535) | 0
          n = u() | 0
          k = m
          c[k >> 2] = h
          c[(k + 4) >> 2] = n
          n = (b + (32 - (c[g >> 2] | 0))) | 0
          c[g >> 2] = 0
          j = n
        }
        if (((j + 32) | 0) >>> 0 > f >>> 0) p = j
        else {
          n = (f + -32) | 0
          k = (a + 8) | 0
          h = k
          m = (a + 16) | 0
          l = m
          o = (a + 24) | 0
          q = o
          r = (a + 32) | 0
          s = r
          t = c[h >> 2] | 0
          v = c[(h + 4) >> 2] | 0
          h = c[l >> 2] | 0
          w = c[(l + 4) >> 2] | 0
          l = c[q >> 2] | 0
          x = c[(q + 4) >> 2] | 0
          q = c[s >> 2] | 0
          y = c[(s + 4) >> 2] | 0
          s = j
          do {
            z = s
            A = z
            B = (z + 4) | 0
            z =
              Ub(
                d[A >> 0] |
                  (d[(A + 1) >> 0] << 8) |
                  (d[(A + 2) >> 0] << 16) |
                  (d[(A + 3) >> 0] << 24) |
                  0,
                d[B >> 0] |
                  (d[(B + 1) >> 0] << 8) |
                  (d[(B + 2) >> 0] << 16) |
                  (d[(B + 3) >> 0] << 24) |
                  0,
                668265295,
                -1028477379
              ) | 0
            B = Vb(z | 0, u() | 0, t | 0, v | 0) | 0
            z = u() | 0
            A = $b(B | 0, z | 0, 31) | 0
            C = u() | 0
            D = _b(B | 0, z | 0, 33) | 0
            t = Ub(A | D | 0, C | (u() | 0) | 0, -2048144761, -1640531535) | 0
            v = u() | 0
            C = (s + 8) | 0
            D = C
            A = (C + 4) | 0
            C =
              Ub(
                d[D >> 0] |
                  (d[(D + 1) >> 0] << 8) |
                  (d[(D + 2) >> 0] << 16) |
                  (d[(D + 3) >> 0] << 24) |
                  0,
                d[A >> 0] |
                  (d[(A + 1) >> 0] << 8) |
                  (d[(A + 2) >> 0] << 16) |
                  (d[(A + 3) >> 0] << 24) |
                  0,
                668265295,
                -1028477379
              ) | 0
            A = Vb(C | 0, u() | 0, h | 0, w | 0) | 0
            C = u() | 0
            D = $b(A | 0, C | 0, 31) | 0
            z = u() | 0
            B = _b(A | 0, C | 0, 33) | 0
            h = Ub(D | B | 0, z | (u() | 0) | 0, -2048144761, -1640531535) | 0
            w = u() | 0
            z = (s + 16) | 0
            B = z
            D = (z + 4) | 0
            z =
              Ub(
                d[B >> 0] |
                  (d[(B + 1) >> 0] << 8) |
                  (d[(B + 2) >> 0] << 16) |
                  (d[(B + 3) >> 0] << 24) |
                  0,
                d[D >> 0] |
                  (d[(D + 1) >> 0] << 8) |
                  (d[(D + 2) >> 0] << 16) |
                  (d[(D + 3) >> 0] << 24) |
                  0,
                668265295,
                -1028477379
              ) | 0
            D = Vb(z | 0, u() | 0, l | 0, x | 0) | 0
            z = u() | 0
            B = $b(D | 0, z | 0, 31) | 0
            C = u() | 0
            A = _b(D | 0, z | 0, 33) | 0
            l = Ub(B | A | 0, C | (u() | 0) | 0, -2048144761, -1640531535) | 0
            x = u() | 0
            C = (s + 24) | 0
            A = C
            B = (C + 4) | 0
            C =
              Ub(
                d[A >> 0] |
                  (d[(A + 1) >> 0] << 8) |
                  (d[(A + 2) >> 0] << 16) |
                  (d[(A + 3) >> 0] << 24) |
                  0,
                d[B >> 0] |
                  (d[(B + 1) >> 0] << 8) |
                  (d[(B + 2) >> 0] << 16) |
                  (d[(B + 3) >> 0] << 24) |
                  0,
                668265295,
                -1028477379
              ) | 0
            B = Vb(C | 0, u() | 0, q | 0, y | 0) | 0
            C = u() | 0
            A = $b(B | 0, C | 0, 31) | 0
            z = u() | 0
            D = _b(B | 0, C | 0, 33) | 0
            q = Ub(A | D | 0, z | (u() | 0) | 0, -2048144761, -1640531535) | 0
            y = u() | 0
            s = (s + 32) | 0
          } while (s >>> 0 <= n >>> 0)
          n = k
          c[n >> 2] = t
          c[(n + 4) >> 2] = v
          n = m
          c[n >> 2] = h
          c[(n + 4) >> 2] = w
          n = o
          c[n >> 2] = l
          c[(n + 4) >> 2] = x
          n = r
          c[n >> 2] = q
          c[(n + 4) >> 2] = y
          p = s
        }
        n = (f - p) | 0
        if (p >>> 0 < f >>> 0) {
          bc((a + 40) | 0, p | 0, n | 0) | 0
          E = n
          break
        } else return 0
      } else {
        bc((a + 40 + i) | 0, b | 0, e | 0) | 0
        E = ((c[g >> 2] | 0) + e) | 0
      }
    while (0)
    c[g >> 2] = E
    return 0
  }
  function Ba(a) {
    a = a | 0
    var b = 0,
      e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0,
      s = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0,
      K = 0,
      L = 0,
      M = 0,
      N = 0,
      O = 0,
      P = 0,
      Q = 0,
      R = 0,
      S = 0,
      T = 0,
      U = 0,
      V = 0
    b = (a + 40) | 0
    e = c[(a + 72) >> 2] | 0
    f = (b + e) | 0
    g = a
    h = c[g >> 2] | 0
    i = c[(g + 4) >> 2] | 0
    if ((i >>> 0 > 0) | (((i | 0) == 0) & (h >>> 0 > 31))) {
      g = (a + 8) | 0
      j = c[g >> 2] | 0
      k = c[(g + 4) >> 2] | 0
      g = (a + 16) | 0
      l = c[g >> 2] | 0
      m = c[(g + 4) >> 2] | 0
      g = (a + 24) | 0
      n = c[g >> 2] | 0
      o = c[(g + 4) >> 2] | 0
      g = (a + 32) | 0
      p = c[g >> 2] | 0
      q = c[(g + 4) >> 2] | 0
      g = $b(j | 0, k | 0, 1) | 0
      r = u() | 0
      s = _b(j | 0, k | 0, 63) | 0
      v = r | (u() | 0)
      r = $b(l | 0, m | 0, 7) | 0
      w = u() | 0
      x = _b(l | 0, m | 0, 57) | 0
      y = Vb(r | x | 0, w | (u() | 0) | 0, g | s | 0, v | 0) | 0
      v = u() | 0
      s = $b(n | 0, o | 0, 12) | 0
      g = u() | 0
      w = _b(n | 0, o | 0, 52) | 0
      x = Vb(y | 0, v | 0, s | w | 0, g | (u() | 0) | 0) | 0
      g = u() | 0
      w = $b(p | 0, q | 0, 18) | 0
      s = u() | 0
      v = _b(p | 0, q | 0, 46) | 0
      y = Vb(x | 0, g | 0, w | v | 0, s | (u() | 0) | 0) | 0
      s = u() | 0
      v = Ub(j | 0, k | 0, 668265295, -1028477379) | 0
      w = u() | 0
      g = Ub(j | 0, k | 0, -2147483648, -1813351001) | 0
      k = u() | 0
      j = _b(v | 0, w | 0, 33) | 0
      w = Ub(j | g | 0, u() | 0 | k | 0, -2048144761, -1640531535) | 0
      k = Ub((y ^ w) | 0, (s ^ (u() | 0)) | 0, -2048144761, -1640531535) | 0
      s = Vb(k | 0, u() | 0, -1028477341, -2048144777) | 0
      k = u() | 0
      w = Ub(l | 0, m | 0, 668265295, -1028477379) | 0
      y = u() | 0
      g = Ub(l | 0, m | 0, -2147483648, -1813351001) | 0
      m = u() | 0
      l = _b(w | 0, y | 0, 33) | 0
      y = Ub(l | g | 0, u() | 0 | m | 0, -2048144761, -1640531535) | 0
      m = Ub((s ^ y) | 0, (k ^ (u() | 0)) | 0, -2048144761, -1640531535) | 0
      k = Vb(m | 0, u() | 0, -1028477341, -2048144777) | 0
      m = u() | 0
      y = Ub(n | 0, o | 0, 668265295, -1028477379) | 0
      s = u() | 0
      g = Ub(n | 0, o | 0, -2147483648, -1813351001) | 0
      o = u() | 0
      n = _b(y | 0, s | 0, 33) | 0
      s = Ub(n | g | 0, u() | 0 | o | 0, -2048144761, -1640531535) | 0
      o = Ub((k ^ s) | 0, (m ^ (u() | 0)) | 0, -2048144761, -1640531535) | 0
      m = Vb(o | 0, u() | 0, -1028477341, -2048144777) | 0
      o = u() | 0
      s = Ub(p | 0, q | 0, 668265295, -1028477379) | 0
      k = u() | 0
      g = Ub(p | 0, q | 0, -2147483648, -1813351001) | 0
      q = u() | 0
      p = _b(s | 0, k | 0, 33) | 0
      k = Ub(p | g | 0, u() | 0 | q | 0, -2048144761, -1640531535) | 0
      q = Ub((m ^ k) | 0, (o ^ (u() | 0)) | 0, -2048144761, -1640531535) | 0
      o = Vb(q | 0, u() | 0, -1028477341, -2048144777) | 0
      z = o
      A = u() | 0
    } else {
      o = (a + 24) | 0
      q = Vb(c[o >> 2] | 0, c[(o + 4) >> 2] | 0, 374761413, 668265263) | 0
      z = q
      A = u() | 0
    }
    q = Vb(z | 0, A | 0, h | 0, i | 0) | 0
    i = u() | 0
    h = (a + 48) | 0
    if (f >>> 0 < h >>> 0) {
      B = q
      C = i
      D = b
    } else {
      A = q
      q = i
      i = h
      h = b
      while (1) {
        b = h
        z = b
        o =
          d[z >> 0] |
          (d[(z + 1) >> 0] << 8) |
          (d[(z + 2) >> 0] << 16) |
          (d[(z + 3) >> 0] << 24)
        z = (b + 4) | 0
        b =
          d[z >> 0] |
          (d[(z + 1) >> 0] << 8) |
          (d[(z + 2) >> 0] << 16) |
          (d[(z + 3) >> 0] << 24)
        z = Ub(o | 0, b | 0, 668265295, -1028477379) | 0
        k = u() | 0
        m = Ub(o | 0, b | 0, -2147483648, -1813351001) | 0
        b = u() | 0
        o = _b(z | 0, k | 0, 33) | 0
        k = Ub(o | m | 0, u() | 0 | b | 0, -2048144761, -1640531535) | 0
        b = k ^ A
        k = (u() | 0) ^ q
        m = $b(b | 0, k | 0, 27) | 0
        o = u() | 0
        z = _b(b | 0, k | 0, 37) | 0
        k = Ub(m | z | 0, o | (u() | 0) | 0, -2048144761, -1640531535) | 0
        o = Vb(k | 0, u() | 0, -1028477341, -2048144777) | 0
        k = u() | 0
        z = (i + 8) | 0
        if (z >>> 0 > f >>> 0) {
          B = o
          C = k
          D = i
          break
        } else {
          m = i
          A = o
          q = k
          i = z
          h = m
        }
      }
    }
    h = (D + 4) | 0
    if (h >>> 0 > f >>> 0) {
      E = B
      F = C
      G = D
    } else {
      i =
        Ub(
          d[D >> 0] |
            (d[(D + 1) >> 0] << 8) |
            (d[(D + 2) >> 0] << 16) |
            (d[(D + 3) >> 0] << 24) |
            0,
          0,
          -2048144761,
          -1640531535
        ) | 0
      D = i ^ B
      B = (u() | 0) ^ C
      C = $b(D | 0, B | 0, 23) | 0
      i = u() | 0
      q = _b(D | 0, B | 0, 41) | 0
      B = Ub(C | q | 0, i | (u() | 0) | 0, 668265295, -1028477379) | 0
      i = Vb(B | 0, u() | 0, -1640531463, 374761393) | 0
      E = i
      F = u() | 0
      G = h
    }
    if (G >>> 0 >= f >>> 0) {
      H = E
      I = F
      J = _b(H | 0, I | 0, 33) | 0
      K = u() | 0
      L = J ^ H
      M = K ^ I
      N = Ub(L | 0, M | 0, 668265295, -1028477379) | 0
      O = u() | 0
      P = _b(N | 0, O | 0, 29) | 0
      Q = u() | 0
      R = P ^ N
      S = Q ^ O
      T = Ub(R | 0, S | 0, -1640531463, 374761393) | 0
      U = u() | 0
      V = U ^ T
      t(U | 0)
      return V | 0
    }
    f = (a + (e + 40)) | 0
    e = E
    E = F
    F = G
    while (1) {
      G = Ub(d[F >> 0] | 0 | 0, 0, 374761413, 668265263) | 0
      a = G ^ e
      G = (u() | 0) ^ E
      h = $b(a | 0, G | 0, 11) | 0
      i = u() | 0
      B = _b(a | 0, G | 0, 53) | 0
      G = Ub(h | B | 0, i | (u() | 0) | 0, -2048144761, -1640531535) | 0
      i = u() | 0
      F = (F + 1) | 0
      if ((F | 0) == (f | 0)) {
        H = G
        I = i
        break
      } else {
        e = G
        E = i
      }
    }
    J = _b(H | 0, I | 0, 33) | 0
    K = u() | 0
    L = J ^ H
    M = K ^ I
    N = Ub(L | 0, M | 0, 668265295, -1028477379) | 0
    O = u() | 0
    P = _b(N | 0, O | 0, 29) | 0
    Q = u() | 0
    R = P ^ N
    S = Q ^ O
    T = Ub(R | 0, S | 0, -1640531463, 374761393) | 0
    U = u() | 0
    V = U ^ T
    t(U | 0)
    return V | 0
  }
  function Ca(a, e, f, g, h) {
    a = a | 0
    e = e | 0
    f = f | 0
    g = g | 0
    h = h | 0
    var i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0,
      L = 0,
      M = 0,
      N = 0,
      O = 0,
      P = 0,
      Q = 0,
      R = 0,
      S = 0,
      T = 0,
      U = 0,
      V = 0,
      W = 0,
      X = 0,
      Y = 0,
      Z = 0,
      _ = 0,
      $ = 0,
      aa = 0,
      ba = 0,
      ca = 0,
      da = 0,
      ea = 0,
      fa = 0,
      ga = 0
    i = K
    K = (K + 16) | 0
    j = i
    k = (g + h) | 0
    if (h >>> 0 < 4) {
      c[j >> 2] = 0
      bc(j | 0, g | 0, h | 0) | 0
      l = Ca(a, e, f, j, 4) | 0
      m = (l >>> 0 < 4294967177) & (l >>> 0 > h >>> 0) ? -20 : l
      K = i
      return m | 0
    }
    dc(a | 0, 0, ((c[e >> 2] << 1) + 2) | 0) | 0
    l =
      d[g >> 0] |
      (d[(g + 1) >> 0] << 8) |
      (d[(g + 2) >> 0] << 16) |
      (d[(g + 3) >> 0] << 24)
    h = l & 15
    j = (h + 5) | 0
    if (j >>> 0 > 15) {
      m = -44
      K = i
      return m | 0
    }
    c[f >> 2] = j
    j = 32 << h
    f = j | 1
    a: do
      if (j >>> 0 > 1) {
        n = (k + -5) | 0
        o = (k + -7) | 0
        p = (k + -4) | 0
        q = p
        r = c[e >> 2] | 0
        s = 4
        t = l >>> 4
        u = 0
        v = g
        w = (h + 6) | 0
        x = 0
        y = f
        z = j
        b: while (1) {
          do
            if (x) {
              if (((t & 65535) | 0) == 65535) {
                A = s
                B = t
                C = v
                D = u
                while (1) {
                  E = (D + 24) | 0
                  if (C >>> 0 < n >>> 0) {
                    F = (C + 2) | 0
                    G = A
                    H =
                      (d[F >> 0] |
                        (d[(F + 1) >> 0] << 8) |
                        (d[(F + 2) >> 0] << 16) |
                        (d[(F + 3) >> 0] << 24)) >>>
                      A
                    I = F
                  } else {
                    G = (A + 16) | 0
                    H = B >>> 16
                    I = C
                  }
                  if (((H & 65535) | 0) == 65535) {
                    A = G
                    B = H
                    C = I
                    D = E
                  } else {
                    J = G
                    L = H
                    M = I
                    N = E
                    break
                  }
                }
              } else {
                J = s
                L = t
                M = v
                N = u
              }
              D = L & 3
              if ((D | 0) == 3) {
                C = J
                B = L
                A = N
                while (1) {
                  E = (A + 3) | 0
                  F = B >>> 2
                  O = (C + 2) | 0
                  P = F & 3
                  if ((P | 0) == 3) {
                    C = O
                    B = F
                    A = E
                  } else {
                    Q = P
                    R = O
                    S = F
                    T = E
                    break
                  }
                }
              } else {
                Q = D
                R = J
                S = L
                T = N
              }
              A = (T + Q) | 0
              B = (R + 2) | 0
              if (A >>> 0 > r >>> 0) {
                m = -48
                break b
              }
              if (A >>> 0 > u >>> 0) {
                dc((a + (u << 1)) | 0, 0, ((A - u) << 1) | 0) | 0
                U = A
              } else U = u
              A = (M + (B >> 3)) | 0
              if ((M >>> 0 > o >>> 0) & (A >>> 0 > p >>> 0)) {
                V = B
                W = S >>> 2
                X = U
                Y = M
                break
              } else {
                C = B & 7
                V = C
                W =
                  (d[A >> 0] |
                    (d[(A + 1) >> 0] << 8) |
                    (d[(A + 2) >> 0] << 16) |
                    (d[(A + 3) >> 0] << 24)) >>>
                  C
                X = U
                Y = A
                break
              }
            } else {
              V = s
              W = t
              X = u
              Y = v
            }
          while (0)
          A = ((z << 1) + -1) | 0
          C = (A - y) | 0
          B = W & (z + -1)
          if (B >>> 0 < C >>> 0) {
            Z = B
            _ = (w + -1) | 0
          } else {
            B = W & A
            Z = (B - ((B | 0) < (z | 0) ? 0 : C)) | 0
            _ = w
          }
          C = (_ + V) | 0
          B = (Z + -1) | 0
          A = (y - ((Z | 0) < 1 ? (1 - Z) | 0 : B)) | 0
          u = (X + 1) | 0
          b[(a + (X << 1)) >> 1] = B
          x = ((B | 0) == 0) & 1
          if ((A | 0) < (z | 0)) {
            B = w
            E = z
            while (1) {
              F = (B + -1) | 0
              O = E >> 1
              if ((A | 0) < (O | 0)) {
                B = F
                E = O
              } else {
                $ = F
                aa = O
                break
              }
            }
          } else {
            $ = w
            aa = z
          }
          E = (Y + (C >> 3)) | 0
          if ((Y >>> 0 > o >>> 0) & (E >>> 0 > p >>> 0)) {
            ba = (C - ((q - Y) << 3)) | 0
            ca = p
          } else {
            ba = C & 7
            ca = E
          }
          r = c[e >> 2] | 0
          if (!(((A | 0) > 1) & (u >>> 0 <= r >>> 0))) {
            da = ba
            ea = X
            fa = ca
            ga = A
            break a
          } else {
            s = ba
            t =
              (d[ca >> 0] |
                (d[(ca + 1) >> 0] << 8) |
                (d[(ca + 2) >> 0] << 16) |
                (d[(ca + 3) >> 0] << 24)) >>>
              (ba & 31)
            v = ca
            w = $
            y = A
            z = aa
          }
        }
        K = i
        return m | 0
      } else {
        da = 4
        ea = -1
        fa = g
        ga = f
      }
    while (0)
    if (((ga | 0) != 1) | ((da | 0) > 32)) {
      m = -20
      K = i
      return m | 0
    }
    c[e >> 2] = ea
    m = (fa + ((da + 7) >> 3) - g) | 0
    K = i
    return m | 0
  }
  function Da(b, e, f, g, h, i, j) {
    b = b | 0
    e = e | 0
    f = f | 0
    g = g | 0
    h = h | 0
    i = i | 0
    j = j | 0
    var k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0
    k = K
    K = (K + 272) | 0
    l = k
    if (!j) {
      m = -72
      K = k
      return m | 0
    }
    n = a[i >> 0] | 0
    o = n & 255
    do
      if ((n << 24) >> 24 < 0) {
        p = (o + -127) | 0
        q = ((o + -126) | 0) >>> 1
        if (q >>> 0 >= j >>> 0) {
          m = -72
          K = k
          return m | 0
        }
        if (p >>> 0 >= e >>> 0) {
          m = -20
          K = k
          return m | 0
        }
        s = (i + 1) | 0
        if (!p) {
          t = f
          u = (t + 52) | 0
          do {
            c[t >> 2] = 0
            t = (t + 4) | 0
          } while ((t | 0) < (u | 0))
          m = -20
          K = k
          return m | 0
        } else {
          v = 0
          do {
            w = (s + (v >>> 1)) | 0
            a[(b + v) >> 0] = (d[w >> 0] | 0) >>> 4
            a[(b + (v | 1)) >> 0] = a[w >> 0] & 15
            v = (v + 2) | 0
          } while (v >>> 0 < p >>> 0)
          x = q
          y = p
        }
      } else if (o >>> 0 < j >>> 0) {
        p = Ga(b, (e + -1) | 0, (i + 1) | 0, o, l, 6) | 0
        if (p >>> 0 < 4294967177) {
          x = o
          y = p
          break
        } else m = p
        K = k
        return m | 0
      } else {
        m = -72
        K = k
        return m | 0
      }
    while (0)
    t = f
    u = (t + 52) | 0
    do {
      c[t >> 2] = 0
      t = (t + 4) | 0
    } while ((t | 0) < (u | 0))
    if (!y) {
      m = -20
      K = k
      return m | 0
    }
    t = 0
    u = 0
    do {
      o = (b + t) | 0
      l = a[o >> 0] | 0
      if ((l & 255) > 11) {
        m = -20
        z = 21
        break
      }
      i = (f + ((l & 255) << 2)) | 0
      c[i >> 2] = (c[i >> 2] | 0) + 1
      u = (((1 << (d[o >> 0] | 0)) >> 1) + u) | 0
      t = (t + 1) | 0
    } while (t >>> 0 < y >>> 0)
    if ((z | 0) == 21) {
      K = k
      return m | 0
    }
    if (!u) {
      m = -20
      K = k
      return m | 0
    }
    z = (r(u | 0) | 0) ^ 31
    if (z >>> 0 > 11) {
      m = -20
      K = k
      return m | 0
    }
    c[h >> 2] = z + 1
    h = ((2 << z) - u) | 0
    u = (r(h | 0) | 0) ^ 31
    z = (u + 1) | 0
    if (((1 << u) | 0) != (h | 0)) {
      m = -20
      K = k
      return m | 0
    }
    a[(b + y) >> 0] = z
    b = (f + (z << 2)) | 0
    c[b >> 2] = (c[b >> 2] | 0) + 1
    b = c[(f + 4) >> 2] | 0
    if (!((b >>> 0 > 1) & (((b & 1) | 0) == 0))) {
      m = -20
      K = k
      return m | 0
    }
    c[g >> 2] = y + 1
    m = (x + 1) | 0
    K = k
    return m | 0
  }
  function Ea(c, e, f, g) {
    c = c | 0
    e = e | 0
    f = f | 0
    g = g | 0
    var h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0
    h = K
    K = (K + 512) | 0
    i = h
    j = (c + 4) | 0
    k = (f + 1) | 0
    l = 1 << g
    m = (l + -1) | 0
    if (f >>> 0 > 255) {
      n = -46
      K = h
      return n | 0
    }
    if (g >>> 0 > 12) {
      n = -44
      K = h
      return n | 0
    }
    f = g & 65535
    o = (k | 0) == 0
    if (!o) {
      p = (65536 << (g + -1)) >> 16
      q = 1
      s = m
      t = 0
      while (1) {
        u = b[(e + (t << 1)) >> 1] | 0
        if ((u << 16) >> 16 == -1) {
          a[(j + (s << 2) + 2) >> 0] = t
          v = 1
          w = q
          x = (s + -1) | 0
        } else {
          v = u
          w = (p | 0) > (((u << 16) >> 16) | 0) ? q : 0
          x = s
        }
        b[(i + (t << 1)) >> 1] = v
        t = (t + 1) | 0
        if ((t | 0) == (k | 0)) break
        else {
          q = w
          s = x
        }
      }
      b[c >> 1] = f
      b[(c + 2) >> 1] = w
      if (!o) {
        o = ((l >>> 3) + 3 + (l >>> 1)) | 0
        w = 0
        s = 0
        while (1) {
          q = b[(e + (s << 1)) >> 1] | 0
          if ((q << 16) >> 16 > 0) {
            t = s & 255
            v = (q << 16) >> 16
            q = 0
            p = w
            while (1) {
              a[(j + (p << 2) + 2) >> 0] = t
              u = p
              do u = (o + u) & m
              while (u >>> 0 > x >>> 0)
              q = (q + 1) | 0
              if ((q | 0) >= (v | 0)) {
                y = u
                break
              } else p = u
            }
          } else y = w
          s = (s + 1) | 0
          if ((s | 0) == (k | 0)) break
          else w = y
        }
        if (y | 0) {
          n = -1
          K = h
          return n | 0
        }
      }
    } else {
      b[c >> 1] = f
      b[(c + 2) >> 1] = 1
    }
    c = 0
    do {
      f = (j + (c << 2)) | 0
      y = (i + ((d[(f + 2) >> 0] | 0) << 1)) | 0
      w = b[y >> 1] | 0
      b[y >> 1] = ((w + 1) << 16) >> 16
      y = w & 65535
      w = (g - ((r(y | 0) | 0) ^ 31)) | 0
      a[(f + 3) >> 0] = w
      b[f >> 1] = (y << (w & 255)) - l
      c = (c + 1) | 0
    } while (c >>> 0 < l >>> 0)
    n = 0
    K = h
    return n | 0
  }
  function Fa(f, g, h, i, j) {
    f = f | 0
    g = g | 0
    h = h | 0
    i = i | 0
    j = j | 0
    var k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0,
      K = 0,
      L = 0,
      M = 0,
      N = 0,
      O = 0,
      P = 0,
      Q = 0,
      R = 0,
      S = 0,
      T = 0,
      U = 0,
      V = 0,
      W = 0,
      X = 0,
      Y = 0,
      Z = 0,
      _ = 0,
      $ = 0,
      aa = 0,
      ba = 0,
      ca = 0,
      da = 0,
      ea = 0,
      fa = 0,
      ga = 0,
      ha = 0,
      ia = 0,
      ja = 0,
      ka = 0,
      la = 0,
      ma = 0,
      na = 0,
      oa = 0,
      pa = 0,
      qa = 0,
      ra = 0,
      sa = 0,
      ta = 0,
      ua = 0,
      va = 0,
      wa = 0,
      xa = 0,
      ya = 0,
      za = 0,
      Aa = 0,
      Ba = 0,
      Ca = 0,
      Da = 0,
      Ea = 0,
      Fa = 0,
      Ga = 0,
      Ha = 0,
      Ia = 0,
      Ja = 0,
      Ka = 0,
      La = 0,
      Ma = 0,
      Na = 0,
      Oa = 0,
      Pa = 0,
      Qa = 0,
      Ra = 0,
      Sa = 0,
      Ta = 0,
      Ua = 0,
      Va = 0,
      Wa = 0,
      Xa = 0,
      Ya = 0,
      Za = 0,
      _a = 0,
      $a = 0
    k = (f + g) | 0
    g = (k + -3) | 0
    l = (i | 0) == 0
    if (!(b[(j + 2) >> 1] | 0)) {
      if (l) {
        m = -72
        return m | 0
      }
      do
        if (i >>> 0 > 3) {
          n = (i + -4) | 0
          o = a[(h + (i + -1)) >> 0] | 0
          if (!((o << 24) >> 24)) {
            m = -1
            return m | 0
          }
          p = (h + n) | 0
          q = (8 - ((r((o & 255) | 0) | 0) ^ 31)) | 0
          if (i >>> 0 < 4294967177) {
            s =
              d[p >> 0] |
              (d[(p + 1) >> 0] << 8) |
              (d[(p + 2) >> 0] << 16) |
              (d[(p + 3) >> 0] << 24)
            t = q
            u = n
          } else {
            m = i
            return m | 0
          }
        } else {
          n = d[h >> 0] | 0
          switch (i | 0) {
            case 2: {
              v = n
              w = 56
              break
            }
            case 3: {
              v = (d[(h + 2) >> 0] << 16) | n
              w = 56
              break
            }
            default:
              x = n
          }
          if ((w | 0) == 56) x = ((d[(h + 1) >> 0] << 8) + v) | 0
          n = a[(h + (i + -1)) >> 0] | 0
          if (!((n << 24) >> 24)) {
            m = -20
            return m | 0
          } else {
            s = x
            t = (40 - (i << 3) - ((r((n & 255) | 0) | 0) ^ 31)) | 0
            u = 0
            break
          }
        }
      while (0)
      x = (h + u) | 0
      v = e[j >> 1] | 0
      n = (t + v) | 0
      t = c[(3808 + (v << 2)) >> 2] | 0
      q = (s >>> ((0 - n) & 31)) & t
      do
        if (n >>> 0 <= 32) {
          if ((u | 0) >= 4) {
            p = (u - (n >>> 3)) | 0
            o = (h + p) | 0
            y =
              d[o >> 0] |
              (d[(o + 1) >> 0] << 8) |
              (d[(o + 2) >> 0] << 16) |
              (d[(o + 3) >> 0] << 24)
            z = n & 7
            A = p
            break
          }
          p = n >>> 3
          o = ((x + (0 - p)) | 0) >>> 0 < h >>> 0 ? u : p
          p = (u - o) | 0
          if (!u) {
            y = s
            z = n
            A = 0
          } else {
            B = (h + p) | 0
            y =
              d[B >> 0] |
              (d[(B + 1) >> 0] << 8) |
              (d[(B + 2) >> 0] << 16) |
              (d[(B + 3) >> 0] << 24)
            z = (n - (o << 3)) | 0
            A = p
          }
        } else {
          y = s
          z = n
          A = u
        }
      while (0)
      u = (j + 4) | 0
      n = (z + v) | 0
      v = (y >>> ((0 - n) & 31)) & t
      a: do
        if (n >>> 0 > 32) {
          C = y
          D = n
          E = A
          F = f
          G = q
          H = v
        } else {
          t = (h + A) | 0
          if ((A | 0) < 4)
            if (A) {
              z = n >>> 3
              s = ((t + (0 - z)) | 0) >>> 0 < h >>> 0 ? A : z
              z = (A - s) | 0
              t = (h + z) | 0
              x = (n - (s << 3)) | 0
              s =
                d[t >> 0] |
                (d[(t + 1) >> 0] << 8) |
                (d[(t + 2) >> 0] << 16) |
                (d[(t + 3) >> 0] << 24)
              if (x >>> 0 > 32) {
                C = s
                D = x
                E = z
                F = f
                G = q
                H = v
                break
              } else {
                I = s
                J = x
                K = z
              }
            } else {
              I = y
              J = n
              K = 0
            }
          else {
            z = (A - (n >>> 3)) | 0
            x = (h + z) | 0
            I =
              d[x >> 0] |
              (d[(x + 1) >> 0] << 8) |
              (d[(x + 2) >> 0] << 16) |
              (d[(x + 3) >> 0] << 24)
            J = n & 7
            K = z
          }
          z = I
          x = J
          s = K
          t = f
          p = q
          o = v
          while (1) {
            B = (h + s) | 0
            if ((s | 0) < 4) {
              if (!s) {
                C = z
                D = x
                E = 0
                F = t
                G = p
                H = o
                break a
              }
              L = x >>> 3
              M = ((B + (0 - L)) | 0) >>> 0 < h >>> 0
              B = M ? s : L
              N = (x - (B << 3)) | 0
              O = B
              P = M & 1
            } else {
              N = x & 7
              O = x >>> 3
              P = 0
            }
            M = (s - O) | 0
            B = (h + M) | 0
            L =
              d[B >> 0] |
              (d[(B + 1) >> 0] << 8) |
              (d[(B + 2) >> 0] << 16) |
              (d[(B + 3) >> 0] << 24)
            if (!((t >>> 0 < g >>> 0) & ((P | 0) == 0))) {
              C = L
              D = N
              E = M
              F = t
              G = p
              H = o
              break a
            }
            Q = d[(u + (p << 2) + 3) >> 0] | 0
            R = (N + Q) | 0
            S =
              (((L >>> ((0 - R) & 31)) & c[(3808 + (Q << 2)) >> 2]) +
                (e[(u + (p << 2)) >> 1] | 0)) |
              0
            a[t >> 0] = a[(u + (p << 2) + 2) >> 0] | 0
            Q = d[(u + (o << 2) + 3) >> 0] | 0
            T = (R + Q) | 0
            U =
              (((L >>> ((0 - T) & 31)) & c[(3808 + (Q << 2)) >> 2]) +
                (e[(u + (o << 2)) >> 1] | 0)) |
              0
            a[(t + 1) >> 0] = a[(u + (o << 2) + 2) >> 0] | 0
            if (T >>> 0 > 32) {
              V = L
              W = T
              X = M
              break
            }
            if ((M | 0) < 4) {
              if (!M) {
                V = L
                W = T
                X = 0
                break
              }
              L = T >>> 3
              Q = ((B + (0 - L)) | 0) >>> 0 < h >>> 0
              B = Q ? M : L
              L = (M - B) | 0
              R = (h + L) | 0
              Y = (T - (B << 3)) | 0
              B =
                d[R >> 0] |
                (d[(R + 1) >> 0] << 8) |
                (d[(R + 2) >> 0] << 16) |
                (d[(R + 3) >> 0] << 24)
              if (Q) {
                V = B
                W = Y
                X = L
                break
              } else {
                Z = B
                _ = Y
                $ = L
              }
            } else {
              L = (M - (T >>> 3)) | 0
              M = (h + L) | 0
              Z =
                d[M >> 0] |
                (d[(M + 1) >> 0] << 8) |
                (d[(M + 2) >> 0] << 16) |
                (d[(M + 3) >> 0] << 24)
              _ = T & 7
              $ = L
            }
            L = d[(u + (S << 2) + 3) >> 0] | 0
            T = (_ + L) | 0
            M =
              (((Z >>> ((0 - T) & 31)) & c[(3808 + (L << 2)) >> 2]) +
                (e[(u + (S << 2)) >> 1] | 0)) |
              0
            a[(t + 2) >> 0] = a[(u + (S << 2) + 2) >> 0] | 0
            L = d[(u + (U << 2) + 3) >> 0] | 0
            Y = (T + L) | 0
            T =
              (((Z >>> ((0 - Y) & 31)) & c[(3808 + (L << 2)) >> 2]) +
                (e[(u + (U << 2)) >> 1] | 0)) |
              0
            a[(t + 3) >> 0] = a[(u + (U << 2) + 2) >> 0] | 0
            L = (t + 4) | 0
            if (Y >>> 0 > 32) {
              C = Z
              D = Y
              E = $
              F = L
              G = M
              H = T
              break a
            } else {
              z = Z
              x = Y
              s = $
              t = L
              p = M
              o = T
            }
          }
          C = V
          D = W
          E = X
          F = (t + 2) | 0
          G = S
          H = U
        }
      while (0)
      U = (k + -2) | 0
      if (F >>> 0 > U >>> 0) {
        m = -70
        return m | 0
      }
      S = C
      C = D
      D = E
      E = F
      F = G
      G = H
      while (1) {
        H = d[(u + (F << 2) + 3) >> 0] | 0
        X = (C + H) | 0
        W = F
        F =
          (((S >>> ((0 - X) & 31)) & c[(3808 + (H << 2)) >> 2]) +
            (e[(u + (F << 2)) >> 1] | 0)) |
          0
        H = (E + 1) | 0
        a[E >> 0] = a[(u + (W << 2) + 2) >> 0] | 0
        if (X >>> 0 > 32) {
          aa = 2
          ba = G
          ca = H
          w = 99
          break
        }
        if ((D | 0) < 4) {
          W = X >>> 3
          V = ((h + D + (0 - W)) | 0) >>> 0 < h >>> 0 ? D : W
          if (!D) {
            da = S
            ea = X
            fa = 0
          } else {
            ga = (D - V) | 0
            ha = (X - (V << 3)) | 0
            w = 90
          }
        } else {
          ga = (D - (X >>> 3)) | 0
          ha = X & 7
          w = 90
        }
        if ((w | 0) == 90) {
          w = 0
          X = (h + ga) | 0
          da =
            d[X >> 0] |
            (d[(X + 1) >> 0] << 8) |
            (d[(X + 2) >> 0] << 16) |
            (d[(X + 3) >> 0] << 24)
          ea = ha
          fa = ga
        }
        if (H >>> 0 > U >>> 0) {
          m = -70
          w = 100
          break
        }
        X = d[(u + (G << 2) + 3) >> 0] | 0
        V = (ea + X) | 0
        W = G
        G =
          (((da >>> ((0 - V) & 31)) & c[(3808 + (X << 2)) >> 2]) +
            (e[(u + (G << 2)) >> 1] | 0)) |
          0
        X = (E + 2) | 0
        a[H >> 0] = a[(u + (W << 2) + 2) >> 0] | 0
        if (V >>> 0 > 32) {
          aa = 3
          ba = F
          ca = X
          w = 99
          break
        }
        if ((fa | 0) < 4) {
          W = V >>> 3
          H = ((h + fa + (0 - W)) | 0) >>> 0 < h >>> 0 ? fa : W
          if (!fa) {
            ia = da
            ja = V
            ka = 0
          } else {
            la = (fa - H) | 0
            ma = (V - (H << 3)) | 0
            w = 97
          }
        } else {
          la = (fa - (V >>> 3)) | 0
          ma = V & 7
          w = 97
        }
        if ((w | 0) == 97) {
          w = 0
          V = (h + la) | 0
          ia =
            d[V >> 0] |
            (d[(V + 1) >> 0] << 8) |
            (d[(V + 2) >> 0] << 16) |
            (d[(V + 3) >> 0] << 24)
          ja = ma
          ka = la
        }
        if (X >>> 0 > U >>> 0) {
          m = -70
          w = 100
          break
        } else {
          S = ia
          C = ja
          D = ka
          E = X
        }
      }
      if ((w | 0) == 99) {
        a[ca >> 0] = a[(u + (ba << 2) + 2) >> 0] | 0
        m = (E + aa - f) | 0
        return m | 0
      } else if ((w | 0) == 100) return m | 0
    } else {
      if (l) {
        m = -72
        return m | 0
      }
      do
        if (i >>> 0 > 3) {
          l = (i + -4) | 0
          aa = a[(h + (i + -1)) >> 0] | 0
          if (!((aa << 24) >> 24)) {
            m = -1
            return m | 0
          }
          E = (h + l) | 0
          ba = (8 - ((r((aa & 255) | 0) | 0) ^ 31)) | 0
          if (i >>> 0 < 4294967177) {
            na =
              d[E >> 0] |
              (d[(E + 1) >> 0] << 8) |
              (d[(E + 2) >> 0] << 16) |
              (d[(E + 3) >> 0] << 24)
            oa = ba
            pa = l
          } else {
            m = i
            return m | 0
          }
        } else {
          l = d[h >> 0] | 0
          switch (i | 0) {
            case 2: {
              qa = l
              w = 7
              break
            }
            case 3: {
              qa = (d[(h + 2) >> 0] << 16) | l
              w = 7
              break
            }
            default:
              ra = l
          }
          if ((w | 0) == 7) ra = ((d[(h + 1) >> 0] << 8) + qa) | 0
          l = a[(h + (i + -1)) >> 0] | 0
          if (!((l << 24) >> 24)) {
            m = -20
            return m | 0
          } else {
            na = ra
            oa = (40 - (i << 3) - ((r((l & 255) | 0) | 0) ^ 31)) | 0
            pa = 0
            break
          }
        }
      while (0)
      i = (h + pa) | 0
      ra = e[j >> 1] | 0
      qa = (oa + ra) | 0
      oa = c[(3808 + (ra << 2)) >> 2] | 0
      l = (na >>> ((0 - qa) & 31)) & oa
      do
        if (qa >>> 0 <= 32) {
          if ((pa | 0) >= 4) {
            ba = (pa - (qa >>> 3)) | 0
            E = (h + ba) | 0
            sa =
              d[E >> 0] |
              (d[(E + 1) >> 0] << 8) |
              (d[(E + 2) >> 0] << 16) |
              (d[(E + 3) >> 0] << 24)
            ta = qa & 7
            ua = ba
            break
          }
          ba = qa >>> 3
          E = ((i + (0 - ba)) | 0) >>> 0 < h >>> 0 ? pa : ba
          ba = (pa - E) | 0
          if (!pa) {
            sa = na
            ta = qa
            ua = 0
          } else {
            aa = (h + ba) | 0
            sa =
              d[aa >> 0] |
              (d[(aa + 1) >> 0] << 8) |
              (d[(aa + 2) >> 0] << 16) |
              (d[(aa + 3) >> 0] << 24)
            ta = (qa - (E << 3)) | 0
            ua = ba
          }
        } else {
          sa = na
          ta = qa
          ua = pa
        }
      while (0)
      pa = (j + 4) | 0
      j = (ta + ra) | 0
      ra = (sa >>> ((0 - j) & 31)) & oa
      b: do
        if (j >>> 0 > 32) {
          va = sa
          wa = j
          xa = ua
          ya = f
          za = l
          Aa = ra
        } else {
          oa = (h + ua) | 0
          if ((ua | 0) < 4)
            if (ua) {
              ta = j >>> 3
              qa = ((oa + (0 - ta)) | 0) >>> 0 < h >>> 0 ? ua : ta
              ta = (ua - qa) | 0
              oa = (h + ta) | 0
              na = (j - (qa << 3)) | 0
              qa =
                d[oa >> 0] |
                (d[(oa + 1) >> 0] << 8) |
                (d[(oa + 2) >> 0] << 16) |
                (d[(oa + 3) >> 0] << 24)
              if (na >>> 0 > 32) {
                va = qa
                wa = na
                xa = ta
                ya = f
                za = l
                Aa = ra
                break
              } else {
                Ba = qa
                Ca = na
                Da = ta
              }
            } else {
              Ba = sa
              Ca = j
              Da = 0
            }
          else {
            ta = (ua - (j >>> 3)) | 0
            na = (h + ta) | 0
            Ba =
              d[na >> 0] |
              (d[(na + 1) >> 0] << 8) |
              (d[(na + 2) >> 0] << 16) |
              (d[(na + 3) >> 0] << 24)
            Ca = j & 7
            Da = ta
          }
          ta = Ba
          na = Ca
          qa = Da
          oa = f
          i = l
          ba = ra
          while (1) {
            E = (h + qa) | 0
            if ((qa | 0) < 4) {
              if (!qa) {
                va = ta
                wa = na
                xa = 0
                ya = oa
                za = i
                Aa = ba
                break b
              }
              aa = na >>> 3
              u = ((E + (0 - aa)) | 0) >>> 0 < h >>> 0
              E = u ? qa : aa
              Ea = (na - (E << 3)) | 0
              Fa = E
              Ga = u & 1
            } else {
              Ea = na & 7
              Fa = na >>> 3
              Ga = 0
            }
            u = (qa - Fa) | 0
            E = (h + u) | 0
            aa =
              d[E >> 0] |
              (d[(E + 1) >> 0] << 8) |
              (d[(E + 2) >> 0] << 16) |
              (d[(E + 3) >> 0] << 24)
            if (!((oa >>> 0 < g >>> 0) & ((Ga | 0) == 0))) {
              va = aa
              wa = Ea
              xa = u
              ya = oa
              za = i
              Aa = ba
              break b
            }
            ca = a[(pa + (i << 2) + 3) >> 0] | 0
            ka = (Ea + (ca & 255)) | 0
            Ha =
              (((aa << (Ea & 31)) >>> ((0 - ca) & 31)) +
                (e[(pa + (i << 2)) >> 1] | 0)) |
              0
            a[oa >> 0] = a[(pa + (i << 2) + 2) >> 0] | 0
            ca = a[(pa + (ba << 2) + 3) >> 0] | 0
            D = (ka + (ca & 255)) | 0
            Ia =
              (((aa << (ka & 31)) >>> ((0 - ca) & 31)) +
                (e[(pa + (ba << 2)) >> 1] | 0)) |
              0
            a[(oa + 1) >> 0] = a[(pa + (ba << 2) + 2) >> 0] | 0
            if (D >>> 0 > 32) {
              Ja = aa
              Ka = D
              La = u
              break
            }
            if ((u | 0) < 4) {
              if (!u) {
                Ja = aa
                Ka = D
                La = 0
                break
              }
              aa = D >>> 3
              ca = ((E + (0 - aa)) | 0) >>> 0 < h >>> 0
              E = ca ? u : aa
              aa = (u - E) | 0
              ka = (h + aa) | 0
              ja = (D - (E << 3)) | 0
              E =
                d[ka >> 0] |
                (d[(ka + 1) >> 0] << 8) |
                (d[(ka + 2) >> 0] << 16) |
                (d[(ka + 3) >> 0] << 24)
              if (ca) {
                Ja = E
                Ka = ja
                La = aa
                break
              } else {
                Ma = E
                Na = ja
                Oa = aa
              }
            } else {
              aa = (u - (D >>> 3)) | 0
              u = (h + aa) | 0
              Ma =
                d[u >> 0] |
                (d[(u + 1) >> 0] << 8) |
                (d[(u + 2) >> 0] << 16) |
                (d[(u + 3) >> 0] << 24)
              Na = D & 7
              Oa = aa
            }
            aa = a[(pa + (Ha << 2) + 3) >> 0] | 0
            D = (Na + (aa & 255)) | 0
            u =
              (((Ma << (Na & 31)) >>> ((0 - aa) & 31)) +
                (e[(pa + (Ha << 2)) >> 1] | 0)) |
              0
            a[(oa + 2) >> 0] = a[(pa + (Ha << 2) + 2) >> 0] | 0
            aa = a[(pa + (Ia << 2) + 3) >> 0] | 0
            ja = (D + (aa & 255)) | 0
            E =
              (((Ma << (D & 31)) >>> ((0 - aa) & 31)) +
                (e[(pa + (Ia << 2)) >> 1] | 0)) |
              0
            a[(oa + 3) >> 0] = a[(pa + (Ia << 2) + 2) >> 0] | 0
            aa = (oa + 4) | 0
            if (ja >>> 0 > 32) {
              va = Ma
              wa = ja
              xa = Oa
              ya = aa
              za = u
              Aa = E
              break b
            } else {
              ta = Ma
              na = ja
              qa = Oa
              oa = aa
              i = u
              ba = E
            }
          }
          va = Ja
          wa = Ka
          xa = La
          ya = (oa + 2) | 0
          za = Ha
          Aa = Ia
        }
      while (0)
      Ia = (k + -2) | 0
      if (ya >>> 0 > Ia >>> 0) {
        m = -70
        return m | 0
      }
      k = va
      va = wa
      wa = xa
      xa = ya
      ya = za
      za = Aa
      while (1) {
        Aa = a[(pa + (ya << 2) + 3) >> 0] | 0
        Ha = (va + (Aa & 255)) | 0
        La = ya
        ya =
          (((k << (va & 31)) >>> ((0 - Aa) & 31)) +
            (e[(pa + (ya << 2)) >> 1] | 0)) |
          0
        Aa = (xa + 1) | 0
        a[xa >> 0] = a[(pa + (La << 2) + 2) >> 0] | 0
        if (Ha >>> 0 > 32) {
          Pa = 2
          Qa = za
          Ra = Aa
          w = 50
          break
        }
        if ((wa | 0) < 4) {
          La = Ha >>> 3
          Ka = ((h + wa + (0 - La)) | 0) >>> 0 < h >>> 0 ? wa : La
          if (!wa) {
            Sa = k
            Ta = Ha
            Ua = 0
          } else {
            Va = (wa - Ka) | 0
            Wa = (Ha - (Ka << 3)) | 0
            w = 41
          }
        } else {
          Va = (wa - (Ha >>> 3)) | 0
          Wa = Ha & 7
          w = 41
        }
        if ((w | 0) == 41) {
          w = 0
          Ha = (h + Va) | 0
          Sa =
            d[Ha >> 0] |
            (d[(Ha + 1) >> 0] << 8) |
            (d[(Ha + 2) >> 0] << 16) |
            (d[(Ha + 3) >> 0] << 24)
          Ta = Wa
          Ua = Va
        }
        if (Aa >>> 0 > Ia >>> 0) {
          m = -70
          w = 100
          break
        }
        Ha = a[(pa + (za << 2) + 3) >> 0] | 0
        Ka = (Ta + (Ha & 255)) | 0
        La = za
        za =
          (((Sa << (Ta & 31)) >>> ((0 - Ha) & 31)) +
            (e[(pa + (za << 2)) >> 1] | 0)) |
          0
        Ha = (xa + 2) | 0
        a[Aa >> 0] = a[(pa + (La << 2) + 2) >> 0] | 0
        if (Ka >>> 0 > 32) {
          Pa = 3
          Qa = ya
          Ra = Ha
          w = 50
          break
        }
        if ((Ua | 0) < 4) {
          La = Ka >>> 3
          Aa = ((h + Ua + (0 - La)) | 0) >>> 0 < h >>> 0 ? Ua : La
          if (!Ua) {
            Xa = Sa
            Ya = Ka
            Za = 0
          } else {
            _a = (Ua - Aa) | 0
            $a = (Ka - (Aa << 3)) | 0
            w = 48
          }
        } else {
          _a = (Ua - (Ka >>> 3)) | 0
          $a = Ka & 7
          w = 48
        }
        if ((w | 0) == 48) {
          w = 0
          Ka = (h + _a) | 0
          Xa =
            d[Ka >> 0] |
            (d[(Ka + 1) >> 0] << 8) |
            (d[(Ka + 2) >> 0] << 16) |
            (d[(Ka + 3) >> 0] << 24)
          Ya = $a
          Za = _a
        }
        if (Ha >>> 0 > Ia >>> 0) {
          m = -70
          w = 100
          break
        } else {
          k = Xa
          va = Ya
          wa = Za
          xa = Ha
        }
      }
      if ((w | 0) == 50) {
        a[Ra >> 0] = a[(pa + (Qa << 2) + 2) >> 0] | 0
        m = (xa + Pa - f) | 0
        return m | 0
      } else if ((w | 0) == 100) return m | 0
    }
    return 0
  }
  function Ga(a, b, d, e, f, g) {
    a = a | 0
    b = b | 0
    d = d | 0
    e = e | 0
    f = f | 0
    g = g | 0
    var h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0
    h = K
    K = (K + 528) | 0
    i = h
    j = (h + 516) | 0
    k = (h + 512) | 0
    c[k >> 2] = 255
    l = Ca(i, k, j, d, e) | 0
    if (l >>> 0 >= 4294967177) {
      m = l
      K = h
      return m | 0
    }
    n = c[j >> 2] | 0
    if (n >>> 0 > g >>> 0) {
      m = -44
      K = h
      return m | 0
    }
    g = Ea(f, i, c[k >> 2] | 0, n) | 0
    if (g >>> 0 >= 4294967177) {
      m = g
      K = h
      return m | 0
    }
    m = Fa(a, b, (d + l) | 0, (e - l) | 0, f) | 0
    K = h
    return m | 0
  }
  function Ha(a) {
    a = a | 0
    return ((z(Ma(c[(a + 60) >> 2] | 0) | 0) | 0) & 65535) | 0
  }
  function Ia(a, b, d) {
    a = a | 0
    b = b | 0
    d = d | 0
    var e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0
    e = K
    K = (K + 32) | 0
    f = e
    g = (e + 16) | 0
    h = (a + 28) | 0
    i = c[h >> 2] | 0
    c[f >> 2] = i
    j = (a + 20) | 0
    k = ((c[j >> 2] | 0) - i) | 0
    c[(f + 4) >> 2] = k
    c[(f + 8) >> 2] = b
    c[(f + 12) >> 2] = d
    b = (a + 60) | 0
    i = f
    f = 2
    l = (k + d) | 0
    while (1) {
      if (!(Ka(C(c[b >> 2] | 0, i | 0, f | 0, g | 0) | 0) | 0))
        m = c[g >> 2] | 0
      else {
        c[g >> 2] = -1
        m = -1
      }
      if ((l | 0) == (m | 0)) {
        n = 6
        break
      }
      if ((m | 0) < 0) {
        n = 8
        break
      }
      k = c[(i + 4) >> 2] | 0
      o = m >>> 0 > k >>> 0
      p = o ? (i + 8) | 0 : i
      q = (m - (o ? k : 0)) | 0
      c[p >> 2] = (c[p >> 2] | 0) + q
      k = (p + 4) | 0
      c[k >> 2] = (c[k >> 2] | 0) - q
      i = p
      f = (f + ((o << 31) >> 31)) | 0
      l = (l - m) | 0
    }
    if ((n | 0) == 6) {
      m = c[(a + 44) >> 2] | 0
      c[(a + 16) >> 2] = m + (c[(a + 48) >> 2] | 0)
      l = m
      c[h >> 2] = l
      c[j >> 2] = l
      r = d
    } else if ((n | 0) == 8) {
      c[(a + 16) >> 2] = 0
      c[h >> 2] = 0
      c[j >> 2] = 0
      c[a >> 2] = c[a >> 2] | 32
      if ((f | 0) == 2) r = 0
      else r = (d - (c[(i + 4) >> 2] | 0)) | 0
    }
    K = e
    return r | 0
  }
  function Ja(a, b, d, e) {
    a = a | 0
    b = b | 0
    d = d | 0
    e = e | 0
    var f = 0,
      g = 0
    f = K
    K = (K + 16) | 0
    g = f
    Ka(B(c[(a + 60) >> 2] | 0, b | 0, d | 0, (e & 255) | 0, g | 0) | 0) | 0
    e = g
    g = c[e >> 2] | 0
    t(c[(e + 4) >> 2] | 0)
    K = f
    return g | 0
  }
  function Ka(a) {
    a = a | 0
    var b = 0,
      d = 0
    if (!((a << 16) >> 16)) b = 0
    else {
      d = La() | 0
      c[d >> 2] = a & 65535
      b = -1
    }
    return b | 0
  }
  function La() {
    return 6288
  }
  function Ma(a) {
    a = a | 0
    return a | 0
  }
  function Na(b, d, e) {
    b = b | 0
    d = d | 0
    e = e | 0
    var f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0
    f = K
    K = (K + 32) | 0
    g = f
    h = (f + 16) | 0
    c[g >> 2] = d
    i = (g + 4) | 0
    j = (b + 48) | 0
    k = c[j >> 2] | 0
    c[i >> 2] = e - (((k | 0) != 0) & 1)
    l = (b + 44) | 0
    c[(g + 8) >> 2] = c[l >> 2]
    c[(g + 12) >> 2] = k
    if (!(Ka(A(c[(b + 60) >> 2] | 0, g | 0, 2, h | 0) | 0) | 0)) {
      g = c[h >> 2] | 0
      if ((g | 0) >= 1) {
        k = c[i >> 2] | 0
        if (g >>> 0 > k >>> 0) {
          i = c[l >> 2] | 0
          l = (b + 4) | 0
          c[l >> 2] = i
          m = i
          c[(b + 8) >> 2] = m + (g - k)
          if (!(c[j >> 2] | 0)) n = e
          else {
            c[l >> 2] = m + 1
            a[(d + (e + -1)) >> 0] = a[m >> 0] | 0
            n = e
          }
        } else n = g
      } else {
        o = g
        p = 4
      }
    } else {
      c[h >> 2] = -1
      o = -1
      p = 4
    }
    if ((p | 0) == 4) {
      c[b >> 2] = ((o & 48) ^ 16) | c[b >> 2]
      n = o
    }
    K = f
    return n | 0
  }
  function Oa(a) {
    a = a | 0
    return 0
  }
  function Pa(a, b, c, d) {
    a = a | 0
    b = b | 0
    c = c | 0
    d = d | 0
    t(0)
    return 0
  }
  function Qa(a) {
    a = a | 0
    return ((((a | 0) == 32) | (((a + -9) | 0) >>> 0 < 5)) & 1) | 0
  }
  function Ra(b) {
    b = b | 0
    var d = 0,
      e = 0,
      f = 0
    d = (b + 74) | 0
    e = a[d >> 0] | 0
    a[d >> 0] = (e + 255) | e
    e = (b + 20) | 0
    d = (b + 28) | 0
    if ((c[e >> 2] | 0) >>> 0 > (c[d >> 2] | 0) >>> 0)
      R[c[(b + 36) >> 2] & 3](b, 0, 0) | 0
    c[(b + 16) >> 2] = 0
    c[d >> 2] = 0
    c[e >> 2] = 0
    e = c[b >> 2] | 0
    if (!(e & 4)) {
      d = ((c[(b + 44) >> 2] | 0) + (c[(b + 48) >> 2] | 0)) | 0
      c[(b + 8) >> 2] = d
      c[(b + 4) >> 2] = d
      f = (e << 27) >> 31
    } else {
      c[b >> 2] = e | 32
      f = -1
    }
    return f | 0
  }
  function Sa(a) {
    a = a | 0
    return (((a + -48) | 0) >>> 0 < 10) | 0
  }
  function Ta(a, b, c) {
    a = a | 0
    b = b | 0
    c = c | 0
    return Wa(a, b, c, 1, 1) | 0
  }
  function Ua(b, e, f, g, h, i) {
    b = b | 0
    e = +e
    f = f | 0
    g = g | 0
    h = h | 0
    i = i | 0
    var j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      r = 0,
      s = 0,
      t = 0.0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0.0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0.0,
      G = 0,
      H = 0,
      I = 0,
      J = 0.0,
      L = 0,
      M = 0,
      N = 0,
      O = 0,
      P = 0,
      Q = 0,
      R = 0,
      S = 0.0,
      T = 0,
      U = 0,
      V = 0,
      W = 0,
      X = 0,
      Y = 0,
      Z = 0,
      _ = 0,
      $ = 0,
      aa = 0,
      ba = 0,
      ca = 0,
      da = 0,
      ea = 0,
      fa = 0,
      ga = 0,
      ha = 0,
      ia = 0.0,
      ja = 0.0,
      ka = 0,
      la = 0,
      ma = 0,
      na = 0,
      oa = 0,
      pa = 0,
      qa = 0,
      ra = 0,
      sa = 0,
      ta = 0,
      ua = 0,
      va = 0,
      wa = 0,
      xa = 0,
      ya = 0,
      za = 0,
      Aa = 0,
      Ba = 0,
      Ca = 0,
      Da = 0,
      Ea = 0,
      Fa = 0,
      Ga = 0,
      Ha = 0,
      Ia = 0
    j = K
    K = (K + 560) | 0
    k = (j + 32) | 0
    l = (j + 536) | 0
    m = j
    n = m
    o = (j + 540) | 0
    c[l >> 2] = 0
    p = (o + 12) | 0
    r = mb(e) | 0
    s = u() | 0
    if ((s | 0) < 0) {
      t = -e
      v = mb(t) | 0
      w = u() | 0
      x = v
      y = 1
      z = 5114
      A = t
    } else {
      w = s
      x = r
      y = (((h & 2049) | 0) != 0) & 1
      z = ((h & 2048) | 0) == 0 ? (((h & 1) | 0) == 0 ? 5115 : 5120) : 5117
      A = e
    }
    do
      if ((0 == 0) & (((w & 2146435072) | 0) == 2146435072)) {
        r = ((i & 32) | 0) != 0
        x = (y + 3) | 0
        fb(b, 32, f, x, h & -65537)
        _a(b, z, y)
        _a(b, (A != A) | (0.0 != 0.0) ? (r ? 5141 : 5145) : r ? 5133 : 5137, 3)
        fb(b, 32, f, x, h ^ 8192)
        B = x
      } else {
        e = +nb(A, l) * 2.0
        x = e != 0.0
        if (x) c[l >> 2] = (c[l >> 2] | 0) + -1
        r = i | 32
        if ((r | 0) == 97) {
          s = i & 32
          v = (s | 0) == 0 ? z : (z + 9) | 0
          C = y | 2
          D = (12 - g) | 0
          do
            if (!((g >>> 0 > 11) | ((D | 0) == 0))) {
              E = D
              t = 8.0
              do {
                E = (E + -1) | 0
                t = t * 16.0
              } while ((E | 0) != 0)
              if ((a[v >> 0] | 0) == 45) {
                F = -(t + (-e - t))
                break
              } else {
                F = e + t - t
                break
              }
            } else F = e
          while (0)
          D = c[l >> 2] | 0
          E = (D | 0) < 0 ? (0 - D) | 0 : D
          G = db(E, (((E | 0) < 0) << 31) >> 31, p) | 0
          if ((G | 0) == (p | 0)) {
            E = (o + 11) | 0
            a[E >> 0] = 48
            H = E
          } else H = G
          a[(H + -1) >> 0] = ((D >> 31) & 2) + 43
          D = (H + -2) | 0
          a[D >> 0] = i + 15
          G = (g | 0) < 1
          E = ((h & 8) | 0) == 0
          I = m
          J = F
          while (1) {
            L = ~~J
            M = (I + 1) | 0
            a[I >> 0] = s | d[(4400 + L) >> 0]
            J = (J - +(L | 0)) * 16.0
            if (((M - n) | 0) == 1 ? !(E & (G & (J == 0.0))) : 0) {
              a[M >> 0] = 46
              N = (I + 2) | 0
            } else N = M
            if (!(J != 0.0)) break
            else I = N
          }
          I = N
          if ((g | 0) != 0 ? ((-2 - n + I) | 0) < (g | 0) : 0) {
            G = p
            E = D
            O = (g + 2 + G - E) | 0
            P = G
            Q = E
          } else {
            E = p
            G = D
            O = (E - n - G + I) | 0
            P = E
            Q = G
          }
          G = (O + C) | 0
          fb(b, 32, f, G, h)
          _a(b, v, C)
          fb(b, 48, f, G, h ^ 65536)
          E = (I - n) | 0
          _a(b, m, E)
          I = (P - Q) | 0
          fb(b, 48, (O - (E + I)) | 0, 0, 0)
          _a(b, D, I)
          fb(b, 32, f, G, h ^ 8192)
          B = G
          break
        }
        G = (g | 0) < 0 ? 6 : g
        if (x) {
          I = ((c[l >> 2] | 0) + -28) | 0
          c[l >> 2] = I
          R = I
          S = e * 268435456.0
        } else {
          R = c[l >> 2] | 0
          S = e
        }
        I = (R | 0) < 0 ? k : (k + 288) | 0
        J = S
        E = I
        do {
          s = ~~J >>> 0
          c[E >> 2] = s
          E = (E + 4) | 0
          J = (J - +(s >>> 0)) * 1.0e9
        } while (J != 0.0)
        x = I
        if ((R | 0) > 0) {
          D = R
          C = I
          v = E
          while (1) {
            s = (D | 0) < 29 ? D : 29
            M = (v + -4) | 0
            if (M >>> 0 >= C >>> 0) {
              L = 0
              T = M
              do {
                M = $b(c[T >> 2] | 0, 0, s | 0) | 0
                U = Vb(M | 0, u() | 0, L | 0, 0) | 0
                M = u() | 0
                L = Zb(U | 0, M | 0, 1e9, 0) | 0
                V = Ub(L | 0, u() | 0, 1e9, 0) | 0
                W = Wb(U | 0, M | 0, V | 0, u() | 0) | 0
                u() | 0
                c[T >> 2] = W
                T = (T + -4) | 0
              } while (T >>> 0 >= C >>> 0)
              if (L) {
                T = (C + -4) | 0
                c[T >> 2] = L
                X = T
              } else X = C
            } else X = C
            a: do
              if (v >>> 0 > X >>> 0) {
                T = v
                while (1) {
                  W = (T + -4) | 0
                  if (c[W >> 2] | 0) {
                    Y = T
                    break a
                  }
                  if (W >>> 0 > X >>> 0) T = W
                  else {
                    Y = W
                    break
                  }
                }
              } else Y = v
            while (0)
            L = ((c[l >> 2] | 0) - s) | 0
            c[l >> 2] = L
            if ((L | 0) > 0) {
              D = L
              C = X
              v = Y
            } else {
              Z = L
              _ = X
              $ = Y
              break
            }
          }
        } else {
          Z = R
          _ = I
          $ = E
        }
        if ((Z | 0) < 0) {
          v = (((((G + 25) | 0) / 9) | 0) + 1) | 0
          C = (r | 0) == 102
          D = Z
          L = _
          T = $
          while (1) {
            W = (0 - D) | 0
            V = (W | 0) < 9 ? W : 9
            if (L >>> 0 < T >>> 0) {
              W = ((1 << V) + -1) | 0
              M = 1e9 >>> V
              U = 0
              aa = L
              do {
                ba = c[aa >> 2] | 0
                c[aa >> 2] = (ba >>> V) + U
                U = q(ba & W, M) | 0
                aa = (aa + 4) | 0
              } while (aa >>> 0 < T >>> 0)
              aa = (c[L >> 2] | 0) == 0 ? (L + 4) | 0 : L
              if (!U) {
                ca = aa
                da = T
              } else {
                c[T >> 2] = U
                ca = aa
                da = (T + 4) | 0
              }
            } else {
              ca = (c[L >> 2] | 0) == 0 ? (L + 4) | 0 : L
              da = T
            }
            aa = C ? I : ca
            M = (((da - aa) >> 2) | 0) > (v | 0) ? (aa + (v << 2)) | 0 : da
            D = ((c[l >> 2] | 0) + V) | 0
            c[l >> 2] = D
            if ((D | 0) >= 0) {
              ea = ca
              fa = M
              break
            } else {
              L = ca
              T = M
            }
          }
        } else {
          ea = _
          fa = $
        }
        if (ea >>> 0 < fa >>> 0) {
          T = (((x - ea) >> 2) * 9) | 0
          L = c[ea >> 2] | 0
          if (L >>> 0 < 10) ga = T
          else {
            D = T
            T = 10
            while (1) {
              T = (T * 10) | 0
              v = (D + 1) | 0
              if (L >>> 0 < T >>> 0) {
                ga = v
                break
              } else D = v
            }
          }
        } else ga = 0
        D = (r | 0) == 103
        T = (G | 0) != 0
        L = (G - ((r | 0) == 102 ? 0 : ga) + (((T & D) << 31) >> 31)) | 0
        if ((L | 0) < ((((((fa - x) >> 2) * 9) | 0) + -9) | 0)) {
          v = (L + 9216) | 0
          L = ((v | 0) / 9) | 0
          C = (I + 4 + ((L + -1024) << 2)) | 0
          E = (v - ((L * 9) | 0)) | 0
          if ((E | 0) < 8) {
            L = 10
            v = E
            while (1) {
              E = (L * 10) | 0
              if ((v | 0) < 7) {
                L = E
                v = (v + 1) | 0
              } else {
                ha = E
                break
              }
            }
          } else ha = 10
          v = c[C >> 2] | 0
          L = ((v >>> 0) / (ha >>> 0)) | 0
          r = (v - (q(L, ha) | 0)) | 0
          E = ((C + 4) | 0) == (fa | 0)
          if (!(E & ((r | 0) == 0))) {
            t = ((L & 1) | 0) == 0 ? 9007199254740992.0 : 9007199254740994.0
            L = ha >>> 1
            J = r >>> 0 < L >>> 0 ? 0.5 : E & ((r | 0) == (L | 0)) ? 1.0 : 1.5
            if (!y) {
              ia = t
              ja = J
            } else {
              L = (a[z >> 0] | 0) == 45
              ia = L ? -t : t
              ja = L ? -J : J
            }
            L = (v - r) | 0
            c[C >> 2] = L
            if (ia + ja != ia) {
              r = (L + ha) | 0
              c[C >> 2] = r
              if (r >>> 0 > 999999999) {
                r = ea
                L = C
                while (1) {
                  v = (L + -4) | 0
                  c[L >> 2] = 0
                  if (v >>> 0 < r >>> 0) {
                    E = (r + -4) | 0
                    c[E >> 2] = 0
                    ka = E
                  } else ka = r
                  E = ((c[v >> 2] | 0) + 1) | 0
                  c[v >> 2] = E
                  if (E >>> 0 > 999999999) {
                    r = ka
                    L = v
                  } else {
                    la = ka
                    ma = v
                    break
                  }
                }
              } else {
                la = ea
                ma = C
              }
              L = (((x - la) >> 2) * 9) | 0
              r = c[la >> 2] | 0
              if (r >>> 0 < 10) {
                na = la
                oa = ma
                pa = L
              } else {
                v = L
                L = 10
                while (1) {
                  L = (L * 10) | 0
                  E = (v + 1) | 0
                  if (r >>> 0 < L >>> 0) {
                    na = la
                    oa = ma
                    pa = E
                    break
                  } else v = E
                }
              }
            } else {
              na = ea
              oa = C
              pa = ga
            }
          } else {
            na = ea
            oa = C
            pa = ga
          }
          v = (oa + 4) | 0
          qa = na
          ra = pa
          sa = fa >>> 0 > v >>> 0 ? v : fa
        } else {
          qa = ea
          ra = ga
          sa = fa
        }
        v = (0 - ra) | 0
        b: do
          if (sa >>> 0 > qa >>> 0) {
            L = sa
            while (1) {
              r = (L + -4) | 0
              if (c[r >> 2] | 0) {
                ta = 1
                ua = L
                break b
              }
              if (r >>> 0 > qa >>> 0) L = r
              else {
                ta = 0
                ua = r
                break
              }
            }
          } else {
            ta = 0
            ua = sa
          }
        while (0)
        do
          if (D) {
            C = (G + ((T ^ 1) & 1)) | 0
            if (((C | 0) > (ra | 0)) & ((ra | 0) > -5)) {
              va = (C + -1 - ra) | 0
              wa = (i + -1) | 0
            } else {
              va = (C + -1) | 0
              wa = (i + -2) | 0
            }
            if (!(h & 8)) {
              if (ta ? ((C = c[(ua + -4) >> 2] | 0), (C | 0) != 0) : 0)
                if (!((C >>> 0) % 10 | 0)) {
                  L = 10
                  V = 0
                  while (1) {
                    L = (L * 10) | 0
                    U = (V + 1) | 0
                    if ((C >>> 0) % (L >>> 0) | 0 | 0) {
                      xa = U
                      break
                    } else V = U
                  }
                } else xa = 0
              else xa = 9
              V = (((((ua - x) >> 2) * 9) | 0) + -9) | 0
              if ((wa | 32 | 0) == 102) {
                L = (V - xa) | 0
                C = (L | 0) > 0 ? L : 0
                ya = (va | 0) < (C | 0) ? va : C
                za = wa
                break
              } else {
                C = (V + ra - xa) | 0
                V = (C | 0) > 0 ? C : 0
                ya = (va | 0) < (V | 0) ? va : V
                za = wa
                break
              }
            } else {
              ya = va
              za = wa
            }
          } else {
            ya = G
            za = i
          }
        while (0)
        G = (ya | 0) != 0
        x = G ? 1 : (h >>> 3) & 1
        T = (za | 32 | 0) == 102
        if (T) {
          Aa = 0
          Ba = (ra | 0) > 0 ? ra : 0
        } else {
          D = (ra | 0) < 0 ? v : ra
          V = db(D, (((D | 0) < 0) << 31) >> 31, p) | 0
          D = p
          if (((D - V) | 0) < 2) {
            C = V
            while (1) {
              L = (C + -1) | 0
              a[L >> 0] = 48
              if (((D - L) | 0) < 2) C = L
              else {
                Ca = L
                break
              }
            }
          } else Ca = V
          a[(Ca + -1) >> 0] = ((ra >> 31) & 2) + 43
          C = (Ca + -2) | 0
          a[C >> 0] = za
          Aa = C
          Ba = (D - C) | 0
        }
        C = (y + 1 + ya + x + Ba) | 0
        fb(b, 32, f, C, h)
        _a(b, z, y)
        fb(b, 48, f, C, h ^ 65536)
        if (T) {
          v = qa >>> 0 > I >>> 0 ? I : qa
          L = (m + 9) | 0
          U = L
          r = (m + 8) | 0
          E = v
          do {
            M = db(c[E >> 2] | 0, 0, L) | 0
            if ((E | 0) == (v | 0))
              if ((M | 0) == (L | 0)) {
                a[r >> 0] = 48
                Da = r
              } else Da = M
            else if (M >>> 0 > m >>> 0) {
              dc(m | 0, 48, (M - n) | 0) | 0
              aa = M
              while (1) {
                W = (aa + -1) | 0
                if (W >>> 0 > m >>> 0) aa = W
                else {
                  Da = W
                  break
                }
              }
            } else Da = M
            _a(b, Da, (U - Da) | 0)
            E = (E + 4) | 0
          } while (E >>> 0 <= I >>> 0)
          if (!((((h & 8) | 0) == 0) & (G ^ 1))) _a(b, 5149, 1)
          if ((E >>> 0 < ua >>> 0) & ((ya | 0) > 0)) {
            I = E
            U = ya
            while (1) {
              r = db(c[I >> 2] | 0, 0, L) | 0
              if (r >>> 0 > m >>> 0) {
                dc(m | 0, 48, (r - n) | 0) | 0
                v = r
                while (1) {
                  T = (v + -1) | 0
                  if (T >>> 0 > m >>> 0) v = T
                  else {
                    Ea = T
                    break
                  }
                }
              } else Ea = r
              _a(b, Ea, (U | 0) < 9 ? U : 9)
              I = (I + 4) | 0
              v = (U + -9) | 0
              if (!((I >>> 0 < ua >>> 0) & ((U | 0) > 9))) {
                Fa = v
                break
              } else U = v
            }
          } else Fa = ya
          fb(b, 48, (Fa + 9) | 0, 9, 0)
        } else {
          U = ta ? ua : (qa + 4) | 0
          if ((qa >>> 0 < U >>> 0) & ((ya | 0) > -1)) {
            I = (m + 9) | 0
            L = ((h & 8) | 0) == 0
            E = I
            G = (0 - n) | 0
            v = (m + 8) | 0
            M = qa
            T = ya
            while (1) {
              x = db(c[M >> 2] | 0, 0, I) | 0
              if ((x | 0) == (I | 0)) {
                a[v >> 0] = 48
                Ga = v
              } else Ga = x
              do
                if ((M | 0) == (qa | 0)) {
                  x = (Ga + 1) | 0
                  _a(b, Ga, 1)
                  if (L & ((T | 0) < 1)) {
                    Ha = x
                    break
                  }
                  _a(b, 5149, 1)
                  Ha = x
                } else {
                  if (Ga >>> 0 <= m >>> 0) {
                    Ha = Ga
                    break
                  }
                  dc(m | 0, 48, (Ga + G) | 0) | 0
                  x = Ga
                  while (1) {
                    D = (x + -1) | 0
                    if (D >>> 0 > m >>> 0) x = D
                    else {
                      Ha = D
                      break
                    }
                  }
                }
              while (0)
              r = (E - Ha) | 0
              _a(b, Ha, (T | 0) > (r | 0) ? r : T)
              x = (T - r) | 0
              M = (M + 4) | 0
              if (!((M >>> 0 < U >>> 0) & ((x | 0) > -1))) {
                Ia = x
                break
              } else T = x
            }
          } else Ia = ya
          fb(b, 48, (Ia + 18) | 0, 18, 0)
          _a(b, Aa, (p - Aa) | 0)
        }
        fb(b, 32, f, C, h ^ 8192)
        B = C
      }
    while (0)
    K = j
    return ((B | 0) < (f | 0) ? f : B) | 0
  }
  function Va(a, b) {
    a = a | 0
    b = b | 0
    var d = 0,
      e = 0.0
    d = ((c[b >> 2] | 0) + (8 - 1)) & ~(8 - 1)
    e = +g[d >> 3]
    c[b >> 2] = d + 8
    g[a >> 3] = e
    return
  }
  function Wa(b, d, e, f, g) {
    b = b | 0
    d = d | 0
    e = e | 0
    f = f | 0
    g = g | 0
    var h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0
    h = K
    K = (K + 224) | 0
    i = (h + 208) | 0
    j = (h + 160) | 0
    k = (h + 80) | 0
    l = h
    m = j
    n = (m + 40) | 0
    do {
      c[m >> 2] = 0
      m = (m + 4) | 0
    } while ((m | 0) < (n | 0))
    c[i >> 2] = c[e >> 2]
    if ((Xa(0, d, i, k, j, f, g) | 0) < 0) o = -1
    else {
      if ((c[(b + 76) >> 2] | 0) > -1) p = Ya(b) | 0
      else p = 0
      e = c[b >> 2] | 0
      m = e & 32
      if ((a[(b + 74) >> 0] | 0) < 1) c[b >> 2] = e & -33
      e = (b + 48) | 0
      if (!(c[e >> 2] | 0)) {
        n = (b + 44) | 0
        q = c[n >> 2] | 0
        c[n >> 2] = l
        r = (b + 28) | 0
        c[r >> 2] = l
        s = (b + 20) | 0
        c[s >> 2] = l
        c[e >> 2] = 80
        t = (b + 16) | 0
        c[t >> 2] = l + 80
        l = Xa(b, d, i, k, j, f, g) | 0
        if (!q) u = l
        else {
          R[c[(b + 36) >> 2] & 3](b, 0, 0) | 0
          v = (c[s >> 2] | 0) == 0 ? -1 : l
          c[n >> 2] = q
          c[e >> 2] = 0
          c[t >> 2] = 0
          c[r >> 2] = 0
          c[s >> 2] = 0
          u = v
        }
      } else u = Xa(b, d, i, k, j, f, g) | 0
      g = c[b >> 2] | 0
      c[b >> 2] = g | m
      if (p | 0) Za(b)
      o = ((g & 32) | 0) == 0 ? u : -1
    }
    K = h
    return o | 0
  }
  function Xa(d, e, f, h, i, j, k) {
    d = d | 0
    e = e | 0
    f = f | 0
    h = h | 0
    i = i | 0
    j = j | 0
    k = k | 0
    var l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0,
      s = 0,
      t = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0,
      L = 0,
      M = 0,
      N = 0,
      O = 0,
      Q = 0,
      R = 0,
      S = 0,
      T = 0,
      U = 0,
      V = 0,
      W = 0,
      X = 0,
      Y = 0,
      Z = 0,
      _ = 0,
      $ = 0,
      aa = 0,
      ba = 0,
      ca = 0,
      da = 0,
      ea = 0,
      fa = 0,
      ga = 0,
      ha = 0,
      ia = 0,
      ja = 0,
      ka = 0,
      la = 0,
      ma = 0,
      na = 0,
      oa = 0,
      pa = 0,
      qa = 0,
      ra = 0,
      sa = 0,
      ta = 0,
      ua = 0,
      va = 0,
      wa = 0,
      xa = 0,
      ya = 0,
      za = 0,
      Aa = 0,
      Ba = 0,
      Ca = 0,
      Da = 0
    l = K
    K = (K + 64) | 0
    m = (l + 56) | 0
    n = (l + 40) | 0
    o = l
    p = (l + 48) | 0
    q = (l + 60) | 0
    c[m >> 2] = e
    e = (d | 0) != 0
    r = (o + 40) | 0
    s = r
    t = (o + 39) | 0
    o = (p + 4) | 0
    v = 0
    w = 0
    x = 0
    a: while (1) {
      y = v
      z = w
      while (1) {
        do
          if ((y | 0) > -1)
            if ((z | 0) > ((2147483647 - y) | 0)) {
              A = La() | 0
              c[A >> 2] = 61
              B = -1
              break
            } else {
              B = (z + y) | 0
              break
            }
          else B = y
        while (0)
        C = c[m >> 2] | 0
        A = a[C >> 0] | 0
        if (!((A << 24) >> 24)) {
          D = 92
          break a
        }
        E = A
        A = C
        b: while (1) {
          switch ((E << 24) >> 24) {
            case 37: {
              D = 10
              break b
              break
            }
            case 0: {
              F = A
              break b
              break
            }
            default: {
            }
          }
          G = (A + 1) | 0
          c[m >> 2] = G
          E = a[G >> 0] | 0
          A = G
        }
        c: do
          if ((D | 0) == 10) {
            D = 0
            E = A
            G = A
            while (1) {
              if ((a[(E + 1) >> 0] | 0) != 37) {
                F = G
                break c
              }
              H = (G + 1) | 0
              E = (E + 2) | 0
              c[m >> 2] = E
              if ((a[E >> 0] | 0) != 37) {
                F = H
                break
              } else G = H
            }
          }
        while (0)
        z = (F - C) | 0
        if (e) _a(d, C, z)
        if (!z) break
        else y = B
      }
      y = (Sa(a[((c[m >> 2] | 0) + 1) >> 0] | 0) | 0) == 0
      z = c[m >> 2] | 0
      if (!y ? (a[(z + 2) >> 0] | 0) == 36 : 0) {
        I = 3
        J = ((a[(z + 1) >> 0] | 0) + -48) | 0
        L = 1
      } else {
        I = 1
        J = -1
        L = x
      }
      y = (z + I) | 0
      c[m >> 2] = y
      z = a[y >> 0] | 0
      A = (((z << 24) >> 24) + -32) | 0
      if ((A >>> 0 > 31) | ((((1 << A) & 75913) | 0) == 0)) {
        M = z
        N = 0
        O = y
      } else {
        z = 0
        G = y
        y = A
        while (1) {
          A = (1 << y) | z
          E = (G + 1) | 0
          c[m >> 2] = E
          H = a[E >> 0] | 0
          y = (((H << 24) >> 24) + -32) | 0
          if ((y >>> 0 > 31) | ((((1 << y) & 75913) | 0) == 0)) {
            M = H
            N = A
            O = E
            break
          } else {
            z = A
            G = E
          }
        }
      }
      if ((M << 24) >> 24 == 42) {
        if (
          (Sa(a[(O + 1) >> 0] | 0) | 0) != 0
            ? ((G = c[m >> 2] | 0), (a[(G + 2) >> 0] | 0) == 36)
            : 0
        ) {
          z = (G + 1) | 0
          c[(i + (((a[z >> 0] | 0) + -48) << 2)) >> 2] = 10
          Q = 1
          R = (G + 3) | 0
          S = c[(h + (((a[z >> 0] | 0) + -48) << 3)) >> 2] | 0
        } else {
          if (L | 0) {
            T = -1
            break
          }
          if (e) {
            z = ((c[f >> 2] | 0) + (4 - 1)) & ~(4 - 1)
            G = c[z >> 2] | 0
            c[f >> 2] = z + 4
            U = G
          } else U = 0
          Q = 0
          R = ((c[m >> 2] | 0) + 1) | 0
          S = U
        }
        c[m >> 2] = R
        G = (S | 0) < 0
        V = R
        W = G ? N | 8192 : N
        X = Q
        Y = G ? (0 - S) | 0 : S
      } else {
        G = $a(m) | 0
        if ((G | 0) < 0) {
          T = -1
          break
        }
        V = c[m >> 2] | 0
        W = N
        X = L
        Y = G
      }
      do
        if ((a[V >> 0] | 0) == 46) {
          G = (V + 1) | 0
          if ((a[G >> 0] | 0) != 42) {
            c[m >> 2] = G
            G = $a(m) | 0
            Z = c[m >> 2] | 0
            _ = G
            break
          }
          if (
            Sa(a[(V + 2) >> 0] | 0) | 0
              ? ((G = c[m >> 2] | 0), (a[(G + 3) >> 0] | 0) == 36)
              : 0
          ) {
            z = (G + 2) | 0
            c[(i + (((a[z >> 0] | 0) + -48) << 2)) >> 2] = 10
            y = c[(h + (((a[z >> 0] | 0) + -48) << 3)) >> 2] | 0
            z = (G + 4) | 0
            c[m >> 2] = z
            Z = z
            _ = y
            break
          }
          if (X | 0) {
            T = -1
            break a
          }
          if (e) {
            y = ((c[f >> 2] | 0) + (4 - 1)) & ~(4 - 1)
            z = c[y >> 2] | 0
            c[f >> 2] = y + 4
            $ = z
          } else $ = 0
          z = ((c[m >> 2] | 0) + 2) | 0
          c[m >> 2] = z
          Z = z
          _ = $
        } else {
          Z = V
          _ = -1
        }
      while (0)
      z = Z
      y = 0
      while (1) {
        if ((((a[z >> 0] | 0) + -65) | 0) >>> 0 > 57) {
          T = -1
          break a
        }
        G = z
        z = (z + 1) | 0
        c[m >> 2] = z
        aa = a[((a[G >> 0] | 0) + -65 + (3936 + ((y * 58) | 0))) >> 0] | 0
        ba = aa & 255
        if (((ba + -1) | 0) >>> 0 >= 8) break
        else y = ba
      }
      if (!((aa << 24) >> 24)) {
        T = -1
        break
      }
      G = (J | 0) > -1
      do
        if ((aa << 24) >> 24 == 19)
          if (G) {
            T = -1
            break a
          } else D = 54
        else {
          if (G) {
            c[(i + (J << 2)) >> 2] = ba
            E = (h + (J << 3)) | 0
            A = c[(E + 4) >> 2] | 0
            H = n
            c[H >> 2] = c[E >> 2]
            c[(H + 4) >> 2] = A
            D = 54
            break
          }
          if (!e) {
            T = 0
            break a
          }
          ab(n, ba, f, k)
          ca = c[m >> 2] | 0
          D = 55
        }
      while (0)
      if ((D | 0) == 54) {
        D = 0
        if (e) {
          ca = z
          D = 55
        } else da = 0
      }
      d: do
        if ((D | 0) == 55) {
          D = 0
          G = a[(ca + -1) >> 0] | 0
          A = ((y | 0) != 0) & (((G & 15) | 0) == 3) ? G & -33 : G
          G = W & -65537
          H = ((W & 8192) | 0) == 0 ? W : G
          e: do
            switch (A | 0) {
              case 110: {
                switch (((y & 255) << 24) >> 24) {
                  case 0: {
                    c[c[n >> 2] >> 2] = B
                    da = 0
                    break d
                    break
                  }
                  case 1: {
                    c[c[n >> 2] >> 2] = B
                    da = 0
                    break d
                    break
                  }
                  case 2: {
                    E = c[n >> 2] | 0
                    c[E >> 2] = B
                    c[(E + 4) >> 2] = (((B | 0) < 0) << 31) >> 31
                    da = 0
                    break d
                    break
                  }
                  case 3: {
                    b[c[n >> 2] >> 1] = B
                    da = 0
                    break d
                    break
                  }
                  case 4: {
                    a[c[n >> 2] >> 0] = B
                    da = 0
                    break d
                    break
                  }
                  case 6: {
                    c[c[n >> 2] >> 2] = B
                    da = 0
                    break d
                    break
                  }
                  case 7: {
                    E = c[n >> 2] | 0
                    c[E >> 2] = B
                    c[(E + 4) >> 2] = (((B | 0) < 0) << 31) >> 31
                    da = 0
                    break d
                    break
                  }
                  default: {
                    da = 0
                    break d
                  }
                }
                break
              }
              case 112: {
                ea = H | 8
                fa = _ >>> 0 > 8 ? _ : 8
                ga = 120
                D = 67
                break
              }
              case 88:
              case 120: {
                ea = H
                fa = _
                ga = A
                D = 67
                break
              }
              case 111: {
                E = n
                ha = cb(c[E >> 2] | 0, c[(E + 4) >> 2] | 0, r) | 0
                E = (s - ha) | 0
                ia = ha
                ja = H
                ka =
                  (((H & 8) | 0) == 0) | ((_ | 0) > (E | 0)) ? _ : (E + 1) | 0
                la = 0
                ma = 5097
                D = 73
                break
              }
              case 105:
              case 100: {
                E = n
                ha = c[E >> 2] | 0
                na = c[(E + 4) >> 2] | 0
                if ((na | 0) < 0) {
                  E = Wb(0, 0, ha | 0, na | 0) | 0
                  oa = u() | 0
                  pa = n
                  c[pa >> 2] = E
                  c[(pa + 4) >> 2] = oa
                  qa = E
                  ra = oa
                  sa = 1
                  ta = 5097
                  D = 72
                  break e
                } else {
                  qa = ha
                  ra = na
                  sa = (((H & 2049) | 0) != 0) & 1
                  ta =
                    ((H & 2048) | 0) == 0
                      ? ((H & 1) | 0) == 0
                        ? 5097
                        : 5099
                      : 5098
                  D = 72
                  break e
                }
                break
              }
              case 117: {
                na = n
                qa = c[na >> 2] | 0
                ra = c[(na + 4) >> 2] | 0
                sa = 0
                ta = 5097
                D = 72
                break
              }
              case 99: {
                a[t >> 0] = c[n >> 2]
                ua = t
                va = G
                wa = 1
                xa = 0
                ya = 5097
                za = s
                break
              }
              case 115: {
                na = c[n >> 2] | 0
                ha = (na | 0) == 0 ? 5107 : na
                na = eb(ha, 0, _) | 0
                oa = (na | 0) == 0
                ua = ha
                va = G
                wa = oa ? _ : (na - ha) | 0
                xa = 0
                ya = 5097
                za = oa ? (ha + _) | 0 : na
                break
              }
              case 67: {
                c[p >> 2] = c[n >> 2]
                c[o >> 2] = 0
                c[n >> 2] = p
                Aa = -1
                D = 79
                break
              }
              case 83: {
                if (!_) {
                  fb(d, 32, Y, 0, H)
                  Ba = 0
                  D = 89
                } else {
                  Aa = _
                  D = 79
                }
                break
              }
              case 65:
              case 71:
              case 70:
              case 69:
              case 97:
              case 103:
              case 102:
              case 101: {
                da = P[j & 1](d, +g[n >> 3], Y, _, H, A) | 0
                break d
                break
              }
              default: {
                ua = C
                va = H
                wa = _
                xa = 0
                ya = 5097
                za = s
              }
            }
          while (0)
          f: do
            if ((D | 0) == 67) {
              D = 0
              A = n
              G = bb(c[A >> 2] | 0, c[(A + 4) >> 2] | 0, r, ga & 32) | 0
              A = n
              na =
                (((ea & 8) | 0) == 0) |
                (((c[A >> 2] | 0) == 0) & ((c[(A + 4) >> 2] | 0) == 0))
              ia = G
              ja = ea
              ka = fa
              la = na ? 0 : 2
              ma = na ? 5097 : (5097 + (ga >>> 4)) | 0
              D = 73
            } else if ((D | 0) == 72) {
              D = 0
              ia = db(qa, ra, r) | 0
              ja = H
              ka = _
              la = sa
              ma = ta
              D = 73
            } else if ((D | 0) == 79) {
              D = 0
              na = 0
              G = c[n >> 2] | 0
              while (1) {
                A = c[G >> 2] | 0
                if (!A) {
                  Ca = na
                  break
                }
                ha = gb(q, A) | 0
                Da = (ha | 0) < 0
                if (Da | (ha >>> 0 > ((Aa - na) | 0) >>> 0)) {
                  D = 83
                  break
                }
                A = (ha + na) | 0
                if (Aa >>> 0 > A >>> 0) {
                  na = A
                  G = (G + 4) | 0
                } else {
                  Ca = A
                  break
                }
              }
              if ((D | 0) == 83) {
                D = 0
                if (Da) {
                  T = -1
                  break a
                } else Ca = na
              }
              fb(d, 32, Y, Ca, H)
              if (!Ca) {
                Ba = 0
                D = 89
              } else {
                G = 0
                A = c[n >> 2] | 0
                while (1) {
                  ha = c[A >> 2] | 0
                  if (!ha) {
                    Ba = Ca
                    D = 89
                    break f
                  }
                  oa = gb(q, ha) | 0
                  G = (oa + G) | 0
                  if ((G | 0) > (Ca | 0)) {
                    Ba = Ca
                    D = 89
                    break f
                  }
                  _a(d, q, oa)
                  if (G >>> 0 >= Ca >>> 0) {
                    Ba = Ca
                    D = 89
                    break
                  } else A = (A + 4) | 0
                }
              }
            }
          while (0)
          if ((D | 0) == 73) {
            D = 0
            A = n
            G = ((c[A >> 2] | 0) != 0) | ((c[(A + 4) >> 2] | 0) != 0)
            A = ((ka | 0) != 0) | G
            na = (s - ia + ((G ^ 1) & 1)) | 0
            ua = A ? ia : r
            va = (ka | 0) > -1 ? ja & -65537 : ja
            wa = A ? ((ka | 0) > (na | 0) ? ka : na) : 0
            xa = la
            ya = ma
            za = s
          } else if ((D | 0) == 89) {
            D = 0
            fb(d, 32, Y, Ba, H ^ 8192)
            da = (Y | 0) > (Ba | 0) ? Y : Ba
            break
          }
          na = (za - ua) | 0
          A = (wa | 0) < (na | 0) ? na : wa
          G = (A + xa) | 0
          oa = (Y | 0) < (G | 0) ? G : Y
          fb(d, 32, oa, G, va)
          _a(d, ya, xa)
          fb(d, 48, oa, G, va ^ 65536)
          fb(d, 48, A, na, 0)
          _a(d, ua, na)
          fb(d, 32, oa, G, va ^ 8192)
          da = oa
        }
      while (0)
      v = B
      w = da
      x = X
    }
    g: do
      if ((D | 0) == 92)
        if (!d)
          if (!x) T = 0
          else {
            X = 1
            while (1) {
              da = c[(i + (X << 2)) >> 2] | 0
              if (!da) break
              ab((h + (X << 3)) | 0, da, f, k)
              da = (X + 1) | 0
              if (da >>> 0 < 10) X = da
              else {
                T = 1
                break g
              }
            }
            da = X
            while (1) {
              if (c[(i + (da << 2)) >> 2] | 0) {
                T = -1
                break g
              }
              da = (da + 1) | 0
              if (da >>> 0 >= 10) {
                T = 1
                break
              }
            }
          }
        else T = B
    while (0)
    K = l
    return T | 0
  }
  function Ya(a) {
    a = a | 0
    return 1
  }
  function Za(a) {
    a = a | 0
    return
  }
  function _a(a, b, d) {
    a = a | 0
    b = b | 0
    d = d | 0
    if (!(c[a >> 2] & 32)) kb(b, d, a) | 0
    return
  }
  function $a(b) {
    b = b | 0
    var d = 0,
      e = 0,
      f = 0,
      g = 0,
      h = 0
    if (!(Sa(a[c[b >> 2] >> 0] | 0) | 0)) d = 0
    else {
      e = 0
      while (1) {
        f = c[b >> 2] | 0
        g = (((e * 10) | 0) + -48 + (a[f >> 0] | 0)) | 0
        h = (f + 1) | 0
        c[b >> 2] = h
        if (!(Sa(a[h >> 0] | 0) | 0)) {
          d = g
          break
        } else e = g
      }
    }
    return d | 0
  }
  function ab(a, b, d, e) {
    a = a | 0
    b = b | 0
    d = d | 0
    e = e | 0
    var f = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0.0
    a: do
      if (b >>> 0 <= 20)
        do
          switch (b | 0) {
            case 9: {
              f = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1)
              h = c[f >> 2] | 0
              c[d >> 2] = f + 4
              c[a >> 2] = h
              break a
              break
            }
            case 10: {
              h = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1)
              f = c[h >> 2] | 0
              c[d >> 2] = h + 4
              h = a
              c[h >> 2] = f
              c[(h + 4) >> 2] = (((f | 0) < 0) << 31) >> 31
              break a
              break
            }
            case 11: {
              f = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1)
              h = c[f >> 2] | 0
              c[d >> 2] = f + 4
              f = a
              c[f >> 2] = h
              c[(f + 4) >> 2] = 0
              break a
              break
            }
            case 12: {
              f = ((c[d >> 2] | 0) + (8 - 1)) & ~(8 - 1)
              h = f
              i = c[h >> 2] | 0
              j = c[(h + 4) >> 2] | 0
              c[d >> 2] = f + 8
              f = a
              c[f >> 2] = i
              c[(f + 4) >> 2] = j
              break a
              break
            }
            case 13: {
              j = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1)
              f = c[j >> 2] | 0
              c[d >> 2] = j + 4
              j = ((f & 65535) << 16) >> 16
              f = a
              c[f >> 2] = j
              c[(f + 4) >> 2] = (((j | 0) < 0) << 31) >> 31
              break a
              break
            }
            case 14: {
              j = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1)
              f = c[j >> 2] | 0
              c[d >> 2] = j + 4
              j = a
              c[j >> 2] = f & 65535
              c[(j + 4) >> 2] = 0
              break a
              break
            }
            case 15: {
              j = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1)
              f = c[j >> 2] | 0
              c[d >> 2] = j + 4
              j = ((f & 255) << 24) >> 24
              f = a
              c[f >> 2] = j
              c[(f + 4) >> 2] = (((j | 0) < 0) << 31) >> 31
              break a
              break
            }
            case 16: {
              j = ((c[d >> 2] | 0) + (4 - 1)) & ~(4 - 1)
              f = c[j >> 2] | 0
              c[d >> 2] = j + 4
              j = a
              c[j >> 2] = f & 255
              c[(j + 4) >> 2] = 0
              break a
              break
            }
            case 17: {
              j = ((c[d >> 2] | 0) + (8 - 1)) & ~(8 - 1)
              k = +g[j >> 3]
              c[d >> 2] = j + 8
              g[a >> 3] = k
              break a
              break
            }
            case 18: {
              T[e & 1](a, d)
              break a
              break
            }
            default:
              break a
          }
        while (0)
    while (0)
    return
  }
  function bb(b, c, e, f) {
    b = b | 0
    c = c | 0
    e = e | 0
    f = f | 0
    var g = 0,
      h = 0
    if (((b | 0) == 0) & ((c | 0) == 0)) g = e
    else {
      h = b
      b = c
      c = e
      while (1) {
        e = (c + -1) | 0
        a[e >> 0] = d[(4400 + (h & 15)) >> 0] | 0 | f
        h = _b(h | 0, b | 0, 4) | 0
        b = u() | 0
        if (((h | 0) == 0) & ((b | 0) == 0)) {
          g = e
          break
        } else c = e
      }
    }
    return g | 0
  }
  function cb(b, c, d) {
    b = b | 0
    c = c | 0
    d = d | 0
    var e = 0,
      f = 0
    if (((b | 0) == 0) & ((c | 0) == 0)) e = d
    else {
      f = b
      b = c
      c = d
      while (1) {
        d = (c + -1) | 0
        a[d >> 0] = (f & 7) | 48
        f = _b(f | 0, b | 0, 3) | 0
        b = u() | 0
        if (((f | 0) == 0) & ((b | 0) == 0)) {
          e = d
          break
        } else c = d
      }
    }
    return e | 0
  }
  function db(b, c, d) {
    b = b | 0
    c = c | 0
    d = d | 0
    var e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0
    if ((c >>> 0 > 0) | (((c | 0) == 0) & (b >>> 0 > 4294967295))) {
      e = b
      f = c
      c = d
      do {
        g = e
        e = Zb(e | 0, f | 0, 10, 0) | 0
        h = f
        f = u() | 0
        i = Ub(e | 0, f | 0, 10, 0) | 0
        j = Wb(g | 0, h | 0, i | 0, u() | 0) | 0
        u() | 0
        c = (c + -1) | 0
        a[c >> 0] = (j & 255) | 48
      } while ((h >>> 0 > 9) | (((h | 0) == 9) & (g >>> 0 > 4294967295)))
      k = c
      l = e
    } else {
      k = d
      l = b
    }
    if (!l) m = k
    else {
      b = k
      k = l
      while (1) {
        l = k
        k = ((k >>> 0) / 10) | 0
        d = (b + -1) | 0
        a[d >> 0] = (l - ((k * 10) | 0)) | 48
        if (l >>> 0 < 10) {
          m = d
          break
        } else b = d
      }
    }
    return m | 0
  }
  function eb(b, d, e) {
    b = b | 0
    d = d | 0
    e = e | 0
    var f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      r = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0
    f = d & 255
    g = (e | 0) != 0
    a: do
      if (g & (((b & 3) | 0) != 0)) {
        h = d & 255
        i = e
        j = b
        while (1) {
          if ((a[j >> 0] | 0) == (h << 24) >> 24) {
            k = i
            l = j
            m = 6
            break a
          }
          n = (j + 1) | 0
          o = (i + -1) | 0
          p = (o | 0) != 0
          if (p & (((n & 3) | 0) != 0)) {
            i = o
            j = n
          } else {
            r = o
            s = n
            t = p
            m = 5
            break
          }
        }
      } else {
        r = e
        s = b
        t = g
        m = 5
      }
    while (0)
    if ((m | 0) == 5)
      if (t) {
        k = r
        l = s
        m = 6
      } else m = 16
    b: do
      if ((m | 0) == 6) {
        s = d & 255
        if ((a[l >> 0] | 0) == (s << 24) >> 24)
          if (!k) {
            m = 16
            break
          } else {
            u = l
            break
          }
        r = q(f, 16843009) | 0
        c: do
          if (k >>> 0 > 3) {
            t = k
            g = l
            while (1) {
              b = c[g >> 2] ^ r
              if ((((b & -2139062144) ^ -2139062144) & (b + -16843009)) | 0) {
                v = g
                w = t
                break c
              }
              b = (g + 4) | 0
              e = (t + -4) | 0
              if (e >>> 0 > 3) {
                t = e
                g = b
              } else {
                x = e
                y = b
                m = 11
                break
              }
            }
          } else {
            x = k
            y = l
            m = 11
          }
        while (0)
        if ((m | 0) == 11)
          if (!x) {
            m = 16
            break
          } else {
            v = y
            w = x
          }
        r = w
        g = v
        while (1) {
          if ((a[g >> 0] | 0) == (s << 24) >> 24) {
            u = g
            break b
          }
          r = (r + -1) | 0
          if (!r) {
            m = 16
            break
          } else g = (g + 1) | 0
        }
      }
    while (0)
    if ((m | 0) == 16) u = 0
    return u | 0
  }
  function fb(a, b, c, d, e) {
    a = a | 0
    b = b | 0
    c = c | 0
    d = d | 0
    e = e | 0
    var f = 0,
      g = 0,
      h = 0
    f = K
    K = (K + 256) | 0
    g = f
    if (((c | 0) > (d | 0)) & (((e & 73728) | 0) == 0)) {
      e = (c - d) | 0
      dc(g | 0, ((b << 24) >> 24) | 0, (e >>> 0 < 256 ? e : 256) | 0) | 0
      if (e >>> 0 > 255) {
        b = (c - d) | 0
        d = e
        do {
          _a(a, g, 256)
          d = (d + -256) | 0
        } while (d >>> 0 > 255)
        h = b & 255
      } else h = e
      _a(a, g, h)
    }
    K = f
    return
  }
  function gb(a, b) {
    a = a | 0
    b = b | 0
    var c = 0
    if (!a) c = 0
    else c = hb(a, b, 0) | 0
    return c | 0
  }
  function hb(b, d, e) {
    b = b | 0
    d = d | 0
    e = e | 0
    var f = 0
    do
      if (b) {
        if (d >>> 0 < 128) {
          a[b >> 0] = d
          f = 1
          break
        }
        e = ((ib() | 0) + 176) | 0
        if (!(c[c[e >> 2] >> 2] | 0))
          if (((d & -128) | 0) == 57216) {
            a[b >> 0] = d
            f = 1
            break
          } else {
            e = La() | 0
            c[e >> 2] = 25
            f = -1
            break
          }
        if (d >>> 0 < 2048) {
          a[b >> 0] = (d >>> 6) | 192
          a[(b + 1) >> 0] = (d & 63) | 128
          f = 2
          break
        }
        if ((d >>> 0 < 55296) | (((d & -8192) | 0) == 57344)) {
          a[b >> 0] = (d >>> 12) | 224
          a[(b + 1) >> 0] = ((d >>> 6) & 63) | 128
          a[(b + 2) >> 0] = (d & 63) | 128
          f = 3
          break
        }
        if (((d + -65536) | 0) >>> 0 < 1048576) {
          a[b >> 0] = (d >>> 18) | 240
          a[(b + 1) >> 0] = ((d >>> 12) & 63) | 128
          a[(b + 2) >> 0] = ((d >>> 6) & 63) | 128
          a[(b + 3) >> 0] = (d & 63) | 128
          f = 4
          break
        } else {
          e = La() | 0
          c[e >> 2] = 25
          f = -1
          break
        }
      } else f = 1
    while (0)
    return f | 0
  }
  function ib() {
    return jb() | 0
  }
  function jb() {
    return 4728
  }
  function kb(b, d, e) {
    b = b | 0
    d = d | 0
    e = e | 0
    var f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0
    f = (e + 16) | 0
    g = c[f >> 2] | 0
    if (!g)
      if (!(lb(e) | 0)) {
        h = c[f >> 2] | 0
        i = 5
      } else j = 0
    else {
      h = g
      i = 5
    }
    a: do
      if ((i | 0) == 5) {
        g = (e + 20) | 0
        f = c[g >> 2] | 0
        k = f
        if (((h - f) | 0) >>> 0 < d >>> 0) {
          j = R[c[(e + 36) >> 2] & 3](e, b, d) | 0
          break
        }
        b: do
          if (((a[(e + 75) >> 0] | 0) < 0) | ((d | 0) == 0)) {
            l = k
            m = 0
            n = d
            o = b
          } else {
            f = d
            while (1) {
              p = (f + -1) | 0
              if ((a[(b + p) >> 0] | 0) == 10) break
              if (!p) {
                l = k
                m = 0
                n = d
                o = b
                break b
              } else f = p
            }
            p = R[c[(e + 36) >> 2] & 3](e, b, f) | 0
            if (p >>> 0 < f >>> 0) {
              j = p
              break a
            }
            l = c[g >> 2] | 0
            m = f
            n = (d - f) | 0
            o = (b + f) | 0
          }
        while (0)
        bc(l | 0, o | 0, n | 0) | 0
        c[g >> 2] = (c[g >> 2] | 0) + n
        j = (m + n) | 0
      }
    while (0)
    return j | 0
  }
  function lb(b) {
    b = b | 0
    var d = 0,
      e = 0,
      f = 0
    d = (b + 74) | 0
    e = a[d >> 0] | 0
    a[d >> 0] = (e + 255) | e
    e = c[b >> 2] | 0
    if (!(e & 8)) {
      c[(b + 8) >> 2] = 0
      c[(b + 4) >> 2] = 0
      d = c[(b + 44) >> 2] | 0
      c[(b + 28) >> 2] = d
      c[(b + 20) >> 2] = d
      c[(b + 16) >> 2] = d + (c[(b + 48) >> 2] | 0)
      f = 0
    } else {
      c[b >> 2] = e | 32
      f = -1
    }
    return f | 0
  }
  function mb(a) {
    a = +a
    var b = 0
    g[h >> 3] = a
    b = c[h >> 2] | 0
    t(c[(h + 4) >> 2] | 0)
    return b | 0
  }
  function nb(a, b) {
    a = +a
    b = b | 0
    var d = 0,
      e = 0,
      f = 0,
      i = 0.0,
      j = 0,
      k = 0.0,
      l = 0.0
    g[h >> 3] = a
    d = c[h >> 2] | 0
    e = c[(h + 4) >> 2] | 0
    f = _b(d | 0, e | 0, 52) | 0
    u() | 0
    switch (f & 2047) {
      case 0: {
        if (a != 0.0) {
          i = +nb(a * 18446744073709551616.0, b)
          j = ((c[b >> 2] | 0) + -64) | 0
          k = i
        } else {
          j = 0
          k = a
        }
        c[b >> 2] = j
        l = k
        break
      }
      case 2047: {
        l = a
        break
      }
      default: {
        c[b >> 2] = (f & 2047) + -1022
        c[h >> 2] = d
        c[(h + 4) >> 2] = (e & -2146435073) | 1071644672
        l = +g[h >> 3]
      }
    }
    return +l
  }
  function ob(a) {
    a = a | 0
    var b = 0,
      d = 0
    if (a >>> 0 > 4294963200) {
      b = La() | 0
      c[b >> 2] = 0 - a
      d = -1
    } else d = a
    return d | 0
  }
  function pb(a) {
    a = a | 0
    return
  }
  function qb(a) {
    a = a | 0
    return
  }
  function rb(b) {
    b = b | 0
    var d = 0,
      e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0
    d = b
    a: do
      if (!(d & 3)) {
        e = b
        f = 5
      } else {
        g = d
        h = b
        while (1) {
          if (!(a[h >> 0] | 0)) {
            i = g
            break a
          }
          j = (h + 1) | 0
          g = j
          if (!(g & 3)) {
            e = j
            f = 5
            break
          } else h = j
        }
      }
    while (0)
    if ((f | 0) == 5) {
      f = e
      while (1) {
        k = c[f >> 2] | 0
        if (!(((k & -2139062144) ^ -2139062144) & (k + -16843009)))
          f = (f + 4) | 0
        else break
      }
      if (!(((k & 255) << 24) >> 24)) l = f
      else {
        k = f
        while (1) {
          f = (k + 1) | 0
          if (!(a[f >> 0] | 0)) {
            l = f
            break
          } else k = f
        }
      }
      i = l
    }
    return (i - d) | 0
  }
  function sb(b, c) {
    b = b | 0
    c = c | 0
    var d = 0
    d = tb(b, c) | 0
    return ((a[d >> 0] | 0) == ((c & 255) << 24) >> 24 ? d : 0) | 0
  }
  function tb(b, d) {
    b = b | 0
    d = d | 0
    var e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0
    e = d & 255
    a: do
      if (!e) f = (b + (rb(b) | 0)) | 0
      else {
        if (!(b & 3)) g = b
        else {
          h = d & 255
          i = b
          while (1) {
            j = a[i >> 0] | 0
            if ((j << 24) >> 24 == 0 ? 1 : (j << 24) >> 24 == (h << 24) >> 24) {
              f = i
              break a
            }
            j = (i + 1) | 0
            if (!(j & 3)) {
              g = j
              break
            } else i = j
          }
        }
        i = q(e, 16843009) | 0
        h = c[g >> 2] | 0
        b: do
          if (!(((h & -2139062144) ^ -2139062144) & (h + -16843009))) {
            j = h
            k = g
            while (1) {
              l = j ^ i
              if ((((l & -2139062144) ^ -2139062144) & (l + -16843009)) | 0) {
                m = k
                break b
              }
              l = (k + 4) | 0
              j = c[l >> 2] | 0
              if ((((j & -2139062144) ^ -2139062144) & (j + -16843009)) | 0) {
                m = l
                break
              } else k = l
            }
          } else m = g
        while (0)
        i = d & 255
        h = m
        while (1) {
          k = a[h >> 0] | 0
          if ((k << 24) >> 24 == 0 ? 1 : (k << 24) >> 24 == (i << 24) >> 24) {
            f = h
            break
          } else h = (h + 1) | 0
        }
      }
    while (0)
    return f | 0
  }
  function ub(a, b, d, e) {
    a = a | 0
    b = b | 0
    d = d | 0
    e = e | 0
    var f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0
    f = q(d, b) | 0
    g = (b | 0) == 0 ? 0 : d
    if ((c[(e + 76) >> 2] | 0) > -1) {
      d = (Ya(e) | 0) == 0
      h = kb(a, f, e) | 0
      if (d) i = h
      else {
        Za(e)
        i = h
      }
    } else i = kb(a, f, e) | 0
    if ((i | 0) == (f | 0)) j = g
    else j = ((i >>> 0) / (b >>> 0)) | 0
    return j | 0
  }
  function vb(a) {
    a = a | 0
    var b = 0,
      d = 0,
      e = 0
    if (c[(a + 68) >> 2] | 0) {
      b = c[(a + 132) >> 2] | 0
      d = (a + 128) | 0
      if (b | 0) c[(b + 128) >> 2] = c[d >> 2]
      a = c[d >> 2] | 0
      if (!a) e = ((wb() | 0) + 220) | 0
      else e = (a + 132) | 0
      c[e >> 2] = b
    }
    return
  }
  function wb() {
    return jb() | 0
  }
  function xb(b, d) {
    b = b | 0
    d = d | 0
    var e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0
    e = K
    K = (K + 16) | 0
    f = e
    if (sb(5151, a[d >> 0] | 0) | 0) {
      g = yb(d) | 0 | 32768
      c[f >> 2] = 438
      h = ob(x(b | 0, g | 0, f | 0) | 0) | 0
      if ((h | 0) >= 0) {
        f = zb(h, d) | 0
        if (!f) {
          z(h | 0) | 0
          i = 0
        } else i = f
      } else i = 0
    } else {
      f = La() | 0
      c[f >> 2] = 28
      i = 0
    }
    K = e
    return i | 0
  }
  function yb(b) {
    b = b | 0
    var c = 0,
      d = 0,
      e = 0,
      f = 0
    c = (sb(b, 43) | 0) == 0
    d = a[b >> 0] | 0
    e = c ? ((d << 24) >> 24 != 114) & 1 : 2
    c = (sb(b, 120) | 0) == 0
    f = c ? e : e | 128
    e = (sb(b, 101) | 0) == 0
    b = e ? f : f | 524288
    f = (d << 24) >> 24 == 114 ? b : b | 64
    b = (d << 24) >> 24 == 119 ? f | 512 : f
    return ((d << 24) >> 24 == 97 ? b | 1024 : b) | 0
  }
  function zb(b, d) {
    b = b | 0
    d = d | 0
    var e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0
    e = K
    K = (K + 32) | 0
    f = (e + 16) | 0
    g = (e + 8) | 0
    h = e
    i = (e + 24) | 0
    if (sb(5151, a[d >> 0] | 0) | 0) {
      j = Qb(1176) | 0
      if (!j) k = 0
      else {
        dc(j | 0, 0, 144) | 0
        l = (sb(d, 43) | 0) == 0
        m = a[d >> 0] | 0
        if (l) c[j >> 2] = (m << 24) >> 24 == 114 ? 8 : 4
        if ((m << 24) >> 24 == 97) {
          m = w(b | 0, 3, h | 0) | 0
          if (!(m & 1024)) {
            c[g >> 2] = m | 1024
            w(b | 0, 4, g | 0) | 0
          }
          g = c[j >> 2] | 128
          c[j >> 2] = g
          n = g
        } else n = c[j >> 2] | 0
        c[(j + 60) >> 2] = b
        c[(j + 44) >> 2] = j + 152
        c[(j + 48) >> 2] = 1024
        g = (j + 75) | 0
        a[g >> 0] = -1
        if (
          ((n & 8) | 0) == 0
            ? ((c[f >> 2] = i), (y(b | 0, 21523, f | 0) | 0) == 0)
            : 0
        )
          a[g >> 0] = 10
        c[(j + 32) >> 2] = 2
        c[(j + 36) >> 2] = 1
        c[(j + 40) >> 2] = 1
        c[(j + 12) >> 2] = 1
        if (!(c[1557] | 0)) c[(j + 76) >> 2] = -1
        Ab(j) | 0
        k = j
      }
    } else {
      j = La() | 0
      c[j >> 2] = 28
      k = 0
    }
    K = e
    return k | 0
  }
  function Ab(a) {
    a = a | 0
    var b = 0,
      d = 0
    b = Bb() | 0
    c[(a + 56) >> 2] = c[b >> 2]
    d = c[b >> 2] | 0
    if (d | 0) c[(d + 52) >> 2] = a
    c[b >> 2] = a
    Cb()
    return a | 0
  }
  function Bb() {
    pb(6292)
    return 6300
  }
  function Cb() {
    qb(6292)
    return
  }
  function Db(a) {
    a = a | 0
    var b = 0,
      d = 0,
      e = 0,
      f = 0,
      g = 0,
      h = 0
    if ((c[(a + 76) >> 2] | 0) > -1) b = Ya(a) | 0
    else b = 0
    vb(a)
    d = ((c[a >> 2] & 1) | 0) != 0
    if (!d) {
      e = Bb() | 0
      f = c[(a + 52) >> 2] | 0
      g = (a + 56) | 0
      if (f | 0) c[(f + 56) >> 2] = c[g >> 2]
      h = c[g >> 2] | 0
      if (h | 0) c[(h + 52) >> 2] = f
      if ((c[e >> 2] | 0) == (a | 0)) c[e >> 2] = h
      Cb()
    }
    h = Eb(a) | 0
    e = O[c[(a + 12) >> 2] & 3](a) | 0 | h
    h = c[(a + 96) >> 2] | 0
    if (h | 0) Rb(h)
    if (d) {
      if (b | 0) Za(a)
    } else Rb(a)
    return e | 0
  }
  function Eb(a) {
    a = a | 0
    var b = 0,
      d = 0,
      e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0
    do
      if (a) {
        if ((c[(a + 76) >> 2] | 0) <= -1) {
          b = Fb(a) | 0
          break
        }
        d = (Ya(a) | 0) == 0
        e = Fb(a) | 0
        if (d) b = e
        else {
          Za(a)
          b = e
        }
      } else {
        if (!(c[1181] | 0)) f = 0
        else f = Eb(c[1181] | 0) | 0
        e = Bb() | 0
        d = c[e >> 2] | 0
        if (!d) g = f
        else {
          e = d
          d = f
          while (1) {
            if ((c[(e + 76) >> 2] | 0) > -1) h = Ya(e) | 0
            else h = 0
            if ((c[(e + 20) >> 2] | 0) >>> 0 > (c[(e + 28) >> 2] | 0) >>> 0)
              i = Fb(e) | 0 | d
            else i = d
            if (h | 0) Za(e)
            e = c[(e + 56) >> 2] | 0
            if (!e) {
              g = i
              break
            } else d = i
          }
        }
        Cb()
        b = g
      }
    while (0)
    return b | 0
  }
  function Fb(a) {
    a = a | 0
    var b = 0,
      d = 0,
      e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0
    b = (a + 20) | 0
    d = (a + 28) | 0
    if (
      (c[b >> 2] | 0) >>> 0 > (c[d >> 2] | 0) >>> 0
        ? (R[c[(a + 36) >> 2] & 3](a, 0, 0) | 0, (c[b >> 2] | 0) == 0)
        : 0
    )
      e = -1
    else {
      f = (a + 4) | 0
      g = c[f >> 2] | 0
      h = (a + 8) | 0
      i = c[h >> 2] | 0
      if (g >>> 0 < i >>> 0) {
        j = (g - i) | 0
        S[c[(a + 40) >> 2] & 3](a, j, (((j | 0) < 0) << 31) >> 31, 1) | 0
        u() | 0
      }
      c[(a + 16) >> 2] = 0
      c[d >> 2] = 0
      c[b >> 2] = 0
      c[h >> 2] = 0
      c[f >> 2] = 0
      e = 0
    }
    return e | 0
  }
  function Gb(a, b, c) {
    a = a | 0
    b = b | 0
    c = c | 0
    return Ib(a, b, (((b | 0) < 0) << 31) >> 31, c) | 0
  }
  function Hb(a, b, d) {
    a = a | 0
    b = b | 0
    d = d | 0
    var e = 0,
      f = 0
    e = K
    K = (K + 16) | 0
    f = e
    c[f >> 2] = d
    d = Ta(a, b, f) | 0
    K = e
    return d | 0
  }
  function Ib(a, b, d, e) {
    a = a | 0
    b = b | 0
    d = d | 0
    e = e | 0
    var f = 0,
      g = 0,
      h = 0
    if ((c[(a + 76) >> 2] | 0) > -1) {
      f = (Ya(a) | 0) == 0
      g = Jb(a, b, d, e) | 0
      if (f) h = g
      else {
        Za(a)
        h = g
      }
    } else h = Jb(a, b, d, e) | 0
    return h | 0
  }
  function Jb(a, b, d, e) {
    a = a | 0
    b = b | 0
    d = d | 0
    e = e | 0
    var f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0
    if ((e | 0) == 1) {
      f = ((c[(a + 8) >> 2] | 0) - (c[(a + 4) >> 2] | 0)) | 0
      g = Wb(b | 0, d | 0, f | 0, ((((f | 0) < 0) << 31) >> 31) | 0) | 0
      h = g
      i = u() | 0
    } else {
      h = b
      i = d
    }
    d = (a + 20) | 0
    b = (a + 28) | 0
    if (
      (c[d >> 2] | 0) >>> 0 > (c[b >> 2] | 0) >>> 0
        ? (R[c[(a + 36) >> 2] & 3](a, 0, 0) | 0, (c[d >> 2] | 0) == 0)
        : 0
    )
      j = -1
    else {
      c[(a + 16) >> 2] = 0
      c[b >> 2] = 0
      c[d >> 2] = 0
      S[c[(a + 40) >> 2] & 3](a, h, i, e) | 0
      if ((u() | 0) < 0) j = -1
      else {
        c[(a + 8) >> 2] = 0
        c[(a + 4) >> 2] = 0
        c[a >> 2] = c[a >> 2] & -17
        j = 0
      }
    }
    return j | 0
  }
  function Kb(a) {
    a = a | 0
    var b = 0,
      d = 0,
      e = 0,
      f = 0,
      g = 0
    if ((c[(a + 76) >> 2] | 0) > -1) {
      b = (Ya(a) | 0) == 0
      d = Lb(a) | 0
      e = u() | 0
      if (b) {
        f = e
        g = d
      } else {
        Za(a)
        f = e
        g = d
      }
    } else {
      d = Lb(a) | 0
      f = u() | 0
      g = d
    }
    t(f | 0)
    return g | 0
  }
  function Lb(a) {
    a = a | 0
    var b = 0,
      d = 0,
      e = 0,
      f = 0,
      g = 0,
      h = 0
    if (!(c[a >> 2] & 128)) b = 1
    else b = (c[(a + 20) >> 2] | 0) >>> 0 > (c[(a + 28) >> 2] | 0) >>> 0 ? 2 : 1
    d = S[c[(a + 40) >> 2] & 3](a, 0, 0, b) | 0
    b = u() | 0
    if ((b | 0) < 0) {
      e = b
      f = d
    } else {
      g = ((c[(a + 8) >> 2] | 0) - (c[(a + 4) >> 2] | 0)) | 0
      h = Wb(d | 0, b | 0, g | 0, ((((g | 0) < 0) << 31) >> 31) | 0) | 0
      g = u() | 0
      b = ((c[(a + 20) >> 2] | 0) - (c[(a + 28) >> 2] | 0)) | 0
      a = Vb(h | 0, g | 0, b | 0, ((((b | 0) < 0) << 31) >> 31) | 0) | 0
      e = u() | 0
      f = a
    }
    t(e | 0)
    return f | 0
  }
  function Mb(b, d, e, f) {
    b = b | 0
    d = d | 0
    e = e | 0
    f = f | 0
    var g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0
    g = q(e, d) | 0
    h = (d | 0) == 0 ? 0 : e
    if ((c[(f + 76) >> 2] | 0) > -1) i = Ya(f) | 0
    else i = 0
    e = (f + 74) | 0
    j = a[e >> 0] | 0
    a[e >> 0] = (j + 255) | j
    j = (f + 4) | 0
    e = c[j >> 2] | 0
    k = ((c[(f + 8) >> 2] | 0) - e) | 0
    if ((k | 0) > 0) {
      l = k >>> 0 < g >>> 0 ? k : g
      bc(b | 0, e | 0, l | 0) | 0
      c[j >> 2] = (c[j >> 2] | 0) + l
      m = (b + l) | 0
      n = (g - l) | 0
    } else {
      m = b
      n = g
    }
    a: do
      if (!n) o = 13
      else {
        b = (f + 32) | 0
        l = m
        j = n
        while (1) {
          if (Ra(f) | 0) break
          e = R[c[b >> 2] & 3](f, l, j) | 0
          if (((e + 1) | 0) >>> 0 < 2) break
          k = (j - e) | 0
          if (!k) {
            o = 13
            break a
          } else {
            l = (l + e) | 0
            j = k
          }
        }
        if (i | 0) Za(f)
        p = ((((g - j) | 0) >>> 0) / (d >>> 0)) | 0
      }
    while (0)
    if ((o | 0) == 13)
      if (!i) p = h
      else {
        Za(f)
        p = h
      }
    return p | 0
  }
  function Nb(a) {
    a = a | 0
    var b = 0,
      d = 0
    b = Kb(a) | 0
    a = u() | 0
    if (((a | 0) > 0) | (((a | 0) == 0) & (b >>> 0 > 2147483647))) {
      a = La() | 0
      c[a >> 2] = 61
      d = -1
    } else d = b
    return d | 0
  }
  function Ob(a, b) {
    a = a | 0
    b = b | 0
    var d = 0,
      e = 0
    d = K
    K = (K + 16) | 0
    e = d
    c[e >> 2] = b
    b = Ta(c[1180] | 0, a, e) | 0
    K = d
    return b | 0
  }
  function Pb(b) {
    b = b | 0
    var c = 0,
      d = 0,
      e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0
    c = b
    while (1) {
      d = (c + 1) | 0
      if (!(Qa(a[c >> 0] | 0) | 0)) break
      else c = d
    }
    b = a[c >> 0] | 0
    switch (b | 0) {
      case 45: {
        e = 1
        f = 5
        break
      }
      case 43: {
        e = 0
        f = 5
        break
      }
      default: {
        g = b
        h = 0
        i = c
      }
    }
    if ((f | 0) == 5) {
      g = a[d >> 0] | 0
      h = e
      i = d
    }
    if (!(Sa(g) | 0)) j = 0
    else {
      g = 0
      d = i
      while (1) {
        i = (((g * 10) | 0) + 48 - (a[d >> 0] | 0)) | 0
        d = (d + 1) | 0
        if (!(Sa(a[d >> 0] | 0) | 0)) {
          j = i
          break
        } else g = i
      }
    }
    return ((h | 0) == 0 ? (0 - j) | 0 : j) | 0
  }
  function U(a) {
    a = a | 0
    var b = 0
    b = K
    K = (K + a) | 0
    K = (K + 15) & -16
    return b | 0
  }
  function V() {
    return K | 0
  }
  function W(a) {
    a = a | 0
    K = a
  }
  function X(a, b) {
    a = a | 0
    b = b | 0
    var d = 0,
      e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0
    d = K
    K = (K + 32) | 0
    e = (d + 16) | 0
    f = (d + 8) | 0
    g = d
    if ((a | 0) < 4) {
      a = c[1179] | 0
      ub(4960, 24, 1, a) | 0
      ub(4985, 57, 1, a) | 0
      h = 1
      K = d
      return h | 0
    }
    a = c[(b + 4) >> 2] | 0
    i = c[(b + 8) >> 2] | 0
    j = Pb(c[(b + 12) >> 2] | 0) | 0
    b = xb(a, 5043) | 0
    if (!b) {
      k = c[1179] | 0
      c[g >> 2] = a
      Hb(k, 5046, g) | 0
      h = 1
      K = d
      return h | 0
    }
    Gb(b, 0, 2) | 0
    g = Nb(b) | 0
    Gb(b, 0, 0) | 0
    k = Qb((g + 1) | 0) | 0
    if (!k) {
      ub(5069, 13, 1, c[1179] | 0) | 0
      Db(b) | 0
      h = 1
      K = d
      return h | 0
    }
    Mb(k, g, 1, b) | 0
    Db(b) | 0
    a = Qb((j + 1) | 0) | 0
    if (!a) {
      ub(5069, 13, 1, c[1179] | 0) | 0
      Rb(k)
      Db(b) | 0
      h = 1
      K = d
      return h | 0
    }
    l = $(a, j, k, g) | 0
    g = (va(l) | 0) == 0
    c[f >> 2] = g ? (l >>> 0 > 2147483646 ? -2 : l) : -1
    Ob(5083, f) | 0
    f = xb(i, 5094) | 0
    if (!f) {
      l = c[1179] | 0
      c[e >> 2] = i
      Hb(l, 5046, e) | 0
      Rb(k)
      Rb(a)
      Db(b) | 0
      h = 1
      K = d
      return h | 0
    } else {
      ub(a, j, 1, f) | 0
      Rb(a)
      Rb(k)
      Db(f) | 0
      h = 0
      K = d
      return h | 0
    }
    return 0
  }
  function Y(b, e, f, g) {
    b = b | 0
    e = e | 0
    f = f | 0
    g = g | 0
    var h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0,
      s = 0,
      t = 0,
      v = 0,
      w = 0,
      x = 0
    h = (g | 0) == 0 ? 5 : 1
    i = b
    j = (i + 40) | 0
    do {
      c[i >> 2] = 0
      i = (i + 4) | 0
    } while ((i | 0) < (j | 0))
    if (h >>> 0 > f >>> 0) {
      k = h
      return k | 0
    }
    if (!e) {
      k = -1
      return k | 0
    }
    do
      if ((g | 0) == 1)
        if (!f) l = -72
        else {
          m = 1
          n = e
          o = 10
        }
      else {
        i =
          d[e >> 0] |
          (d[(e + 1) >> 0] << 8) |
          (d[(e + 2) >> 0] << 16) |
          (d[(e + 3) >> 0] << 24)
        if ((i | 0) == -47205080) {
          m = h
          n = (e + (h + -1)) | 0
          o = 10
          break
        }
        if (((i & -16) | 0) != 407710288) {
          k = -10
          return k | 0
        }
        if (f >>> 0 < 8) {
          k = 8
          return k | 0
        }
        i = (b + 8) | 0
        c[i >> 2] = 0
        c[(i + 4) >> 2] = 0
        c[(i + 8) >> 2] = 0
        c[(i + 12) >> 2] = 0
        c[(i + 16) >> 2] = 0
        c[(i + 20) >> 2] = 0
        c[(i + 24) >> 2] = 0
        c[(i + 28) >> 2] = 0
        i = (e + 4) | 0
        j = b
        c[j >> 2] =
          d[i >> 0] |
          (d[(i + 1) >> 0] << 8) |
          (d[(i + 2) >> 0] << 16) |
          (d[(i + 3) >> 0] << 24)
        c[(j + 4) >> 2] = 0
        c[(b + 20) >> 2] = 1
        k = 0
        return k | 0
      }
    while (0)
    if ((o | 0) == 10) {
      o = d[n >> 0] | 0
      n = o >>> 6
      g = ((o & 32) | 0) != 0
      l =
        ((c[(16 + ((o & 3) << 2)) >> 2] | 0) +
          m +
          (c[(32 + (n << 2)) >> 2] | 0) +
          ((g ^ 1) & 1) +
          (g & ((n | 0) == 0) & 1)) |
        0
    }
    if (l >>> 0 > f >>> 0) {
      k = l
      return k | 0
    }
    c[(b + 24) >> 2] = l
    l = a[(e + (h + -1)) >> 0] | 0
    f = l & 255
    n = (f >>> 2) & 1
    if ((f & 8) | 0) {
      k = -14
      return k | 0
    }
    g = ((f & 32) | 0) != 0
    if (!g) {
      f = d[(e + h) >> 0] | 0
      m = ((f >>> 3) + 10) | 0
      o = $b(1, 0, m | 0) | 0
      j = u() | 0
      i = _b(o | 0, j | 0, 3) | 0
      p = Ub(i | 0, u() | 0, (f & 7) | 0, 0) | 0
      f = Vb(p | 0, u() | 0, o | 0, j | 0) | 0
      j = u() | 0
      if (m >>> 0 > 30) {
        k = -16
        return k | 0
      } else {
        q = f
        r = j
        s = (h + 1) | 0
      }
    } else {
      q = 0
      r = 0
      s = h
    }
    switch (l & 3) {
      case 3: {
        h = (e + s) | 0
        t =
          d[h >> 0] |
          (d[(h + 1) >> 0] << 8) |
          (d[(h + 2) >> 0] << 16) |
          (d[(h + 3) >> 0] << 24)
        v = (s + 4) | 0
        break
      }
      case 1: {
        t = d[(e + s) >> 0] | 0
        v = (s + 1) | 0
        break
      }
      case 2: {
        h = (e + s) | 0
        t = (d[h >> 0] | (d[(h + 1) >> 0] << 8)) & 65535
        v = (s + 2) | 0
        break
      }
      default: {
        t = 0
        v = s
      }
    }
    switch (((l & 255) >>> 6) & 3) {
      case 3: {
        l = (e + v) | 0
        s = l
        h = (l + 4) | 0
        w =
          d[s >> 0] |
          (d[(s + 1) >> 0] << 8) |
          (d[(s + 2) >> 0] << 16) |
          (d[(s + 3) >> 0] << 24)
        x =
          d[h >> 0] |
          (d[(h + 1) >> 0] << 8) |
          (d[(h + 2) >> 0] << 16) |
          (d[(h + 3) >> 0] << 24)
        break
      }
      case 1: {
        h = (e + v) | 0
        w = (((d[h >> 0] | (d[(h + 1) >> 0] << 8)) & 65535) + 256) | 0
        x = 0
        break
      }
      case 2: {
        h = (e + v) | 0
        w =
          d[h >> 0] |
          (d[(h + 1) >> 0] << 8) |
          (d[(h + 2) >> 0] << 16) |
          (d[(h + 3) >> 0] << 24)
        x = 0
        break
      }
      default:
        if (g) {
          w = d[(e + v) >> 0] | 0
          x = 0
        } else {
          w = -1
          x = -1
        }
    }
    v = g ? w : q
    q = g ? x : r
    c[(b + 20) >> 2] = 0
    r = b
    c[r >> 2] = w
    c[(r + 4) >> 2] = x
    x = (b + 8) | 0
    c[x >> 2] = v
    c[(x + 4) >> 2] = q
    x = (q >>> 0 < 0) | (((q | 0) == 0) & (v >>> 0 < 131072))
    q = x ? v : 131072
    c[(b + 16) >> 2] = q
    c[(b + 28) >> 2] = t
    c[(b + 32) >> 2] = n
    k = 0
    return k | 0
  }
  function Z(b, e, f, g, h, i, j, k) {
    b = b | 0
    e = e | 0
    f = f | 0
    g = g | 0
    h = h | 0
    i = i | 0
    j = j | 0
    k = k | 0
    var l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0,
      s = 0,
      t = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0,
      L = 0,
      M = 0,
      N = 0,
      O = 0,
      P = 0,
      Q = 0,
      R = 0,
      S = 0,
      T = 0,
      U = 0,
      V = 0,
      W = 0,
      X = 0,
      Z = 0,
      $ = 0,
      aa = 0,
      ba = 0,
      ca = 0,
      da = 0,
      ea = 0,
      fa = 0,
      ga = 0,
      ha = 0,
      ia = 0,
      ja = 0,
      na = 0,
      pa = 0,
      qa = 0,
      ra = 0,
      sa = 0,
      ua = 0,
      va = 0,
      xa = 0,
      ya = 0,
      Ca = 0,
      Da = 0,
      Ea = 0,
      Fa = 0,
      Ga = 0,
      Ha = 0,
      Ia = 0,
      Ja = 0,
      Ka = 0
    l = K
    K = (K + 16) | 0
    m = l
    n = (k | 0) != 0
    if (n) {
      o = ka(k) | 0
      p = o
      q = la(k) | 0
    } else {
      p = i
      q = j
    }
    j = (b + 28908) | 0
    i = (b + 28740) | 0
    o = (b + 28956) | 0
    r = (b + 28744) | 0
    s = (b + 28804) | 0
    t = (b + 28792) | 0
    v = (b + 28728) | 0
    w = (b + 10280) | 0
    x = (b + 28812) | 0
    y = (b + 28808) | 0
    z = (b + 28952) | 0
    A = (b + 26668) | 0
    B = (b + 16) | 0
    C = (b + 6176) | 0
    D = (b + 4) | 0
    E = (b + 4120) | 0
    F = (b + 8) | 0
    G = (b + 12) | 0
    H = ((q | 0) != 0) & ((p | 0) != 0)
    I = (b + 28732) | 0
    J = (b + 28736) | 0
    L = q >>> 0 < 8
    M = (p + q) | 0
    N = (p + 4) | 0
    O = (b + 16) | 0
    P = (b + 28752) | 0
    Q = (b + 28780) | 0
    R = (b + 28784) | 0
    S = (b + 28816) | 0
    T = (m + 8) | 0
    U = (m + 4) | 0
    V = (b + 28752) | 0
    W = e
    X = f
    f = 0
    Z = g
    g = h
    a: while (1) {
      h = (c[j >> 2] | 0) == 0 ? 5 : 1
      $ = Z
      aa = g
      while (1) {
        if (aa >>> 0 < h >>> 0) {
          ba = 58
          break a
        }
        if (
          (((d[$ >> 0] |
            (d[($ + 1) >> 0] << 8) |
            (d[($ + 2) >> 0] << 16) |
            (d[($ + 3) >> 0] << 24)) &
            -16) |
            0) !=
          407710288
        )
          break
        if (aa >>> 0 < 8) {
          ca = -72
          ba = 59
          break a
        }
        da = ($ + 4) | 0
        ea =
          d[da >> 0] |
          (d[(da + 1) >> 0] << 8) |
          (d[(da + 2) >> 0] << 16) |
          (d[(da + 3) >> 0] << 24)
        da = (ea + 8) | 0
        fa = da >>> 0 > aa >>> 0 ? -72 : da
        if (ea >>> 0 > 4294967287) {
          ca = -14
          ba = 59
          break a
        }
        ea = fa >>> 0 < 4294967177
        if (ea) {
          $ = ($ + fa) | 0
          aa = (aa - (ea ? fa : 0)) | 0
        } else {
          ca = fa
          ba = 59
          break a
        }
      }
      do
        if (!n) {
          c[r >> 2] = h
          c[s >> 2] = 0
          fa = t
          c[fa >> 2] = 0
          c[(fa + 4) >> 2] = 0
          c[v >> 2] = 0
          c[(v + 4) >> 2] = 0
          c[(v + 8) >> 2] = 0
          c[(v + 12) >> 2] = 0
          c[w >> 2] = 201326604
          c[x >> 2] = 0
          c[y >> 2] = 0
          c[z >> 2] = 0
          c[A >> 2] = c[1176]
          c[(A + 4) >> 2] = c[1177]
          c[(A + 8) >> 2] = c[1178]
          c[b >> 2] = B
          c[D >> 2] = C
          c[F >> 2] = E
          c[G >> 2] = w
          if (H) {
            if (L) {
              c[i >> 2] = 0
              c[J >> 2] = p
              c[I >> 2] = p
              c[v >> 2] = M
              ga = M
              break
            }
            if (
              (d[p >> 0] |
                (d[(p + 1) >> 0] << 8) |
                (d[(p + 2) >> 0] << 16) |
                (d[(p + 3) >> 0] << 24) |
                0) !=
              -332356553
            ) {
              c[i >> 2] = 0
              c[J >> 2] = p
              c[I >> 2] = p
              c[v >> 2] = M
              ga = M
              break
            }
            c[z >> 2] =
              d[N >> 0] |
              (d[(N + 1) >> 0] << 8) |
              (d[(N + 2) >> 0] << 16) |
              (d[(N + 3) >> 0] << 24)
            fa = _(O, p, q) | 0
            ea = (p + fa) | 0
            if (fa >>> 0 >= 4294967177) {
              ca = -30
              ba = 59
              break a
            }
            c[x >> 2] = 1
            c[y >> 2] = 1
            fa = c[v >> 2] | 0
            c[i >> 2] = fa
            c[J >> 2] = ea + ((c[I >> 2] | 0) - fa)
            c[I >> 2] = ea
            c[v >> 2] = M
            ga = M
          } else ga = 0
        } else {
          ea = ka(k) | 0
          fa = (ea + (la(k) | 0)) | 0
          c[o >> 2] = ((c[i >> 2] | 0) != (fa | 0)) & 1
          c[r >> 2] = (c[j >> 2] | 0) == 0 ? 5 : 1
          c[s >> 2] = 0
          fa = t
          c[fa >> 2] = 0
          c[(fa + 4) >> 2] = 0
          c[v >> 2] = 0
          c[(v + 4) >> 2] = 0
          c[(v + 8) >> 2] = 0
          c[(v + 12) >> 2] = 0
          c[w >> 2] = 201326604
          c[x >> 2] = 0
          c[y >> 2] = 0
          c[z >> 2] = 0
          c[A >> 2] = c[1176]
          c[(A + 4) >> 2] = c[1177]
          c[(A + 8) >> 2] = c[1178]
          c[b >> 2] = B
          c[D >> 2] = C
          c[F >> 2] = E
          c[G >> 2] = w
          ma(b, k)
          ga = c[v >> 2] | 0
        }
      while (0)
      if ((ga | 0) != (W | 0)) {
        c[i >> 2] = ga
        c[J >> 2] = W + ((c[I >> 2] | 0) - ga)
        c[I >> 2] = W
        c[v >> 2] = W
      }
      h = (W + X) | 0
      fa = c[j >> 2] | 0
      ea = (fa | 0) == 0
      b: do
        if (aa >>> 0 >= (ea ? 9 : 5) >>> 0) {
          da = ea ? 5 : 1
          ha = d[($ + (da + -1)) >> 0] | 0
          ia = ha >>> 6
          ja = ((ha & 32) | 0) != 0
          na =
            ((c[(16 + ((ha & 3) << 2)) >> 2] | 0) +
              da +
              (c[(32 + (ia << 2)) >> 2] | 0) +
              ((ja ^ 1) & 1) +
              (ja & ((ia | 0) == 0) & 1)) |
            0
          if (na >>> 0 < 4294967177)
            if (aa >>> 0 >= ((na + 3) | 0) >>> 0) {
              ia = Y(P, $, na, fa) | 0
              if (ia >>> 0 < 4294967177)
                if (!ia) {
                  ja = c[Q >> 2] | 0
                  if (ja | 0 ? (c[z >> 2] | 0) != (ja | 0) : 0) {
                    pa = -32
                    qa = $
                    ra = aa
                    break
                  }
                  if (c[R >> 2] | 0) za(S, 0, 0) | 0
                  ja = ($ + na) | 0
                  da = (aa - na) | 0
                  ha = oa(ja, da, m) | 0
                  c: do
                    if (ha >>> 0 < 4294967177) {
                      sa = h
                      ua = ha
                      va = ja
                      xa = W
                      ya = da
                      while (1) {
                        Ca = (va + 3) | 0
                        Da = (ya + -3) | 0
                        if (Da >>> 0 < ua >>> 0) {
                          Ea = -72
                          break c
                        }
                        d: do
                          switch (c[m >> 2] | 0) {
                            case 2: {
                              Fa = ta(b, xa, (sa - xa) | 0, Ca, ua, 1) | 0
                              ba = 44
                              break
                            }
                            case 0: {
                              if (!xa)
                                if (!ua) {
                                  Ga = 0
                                  break d
                                } else {
                                  Ea = -74
                                  break c
                                }
                              if (ua >>> 0 > ((sa - xa) | 0) >>> 0) {
                                Ea = -70
                                break c
                              }
                              bc(xa | 0, Ca | 0, ua | 0) | 0
                              Ga = ua
                              break
                            }
                            case 1: {
                              Ha = a[Ca >> 0] | 0
                              Ia = c[T >> 2] | 0
                              if (!xa)
                                if (!Ia) {
                                  Ga = 0
                                  break d
                                } else {
                                  Ea = -74
                                  break c
                                }
                              if (Ia >>> 0 > ((sa - xa) | 0) >>> 0) {
                                Ea = -70
                                break c
                              }
                              dc(xa | 0, Ha | 0, Ia | 0) | 0
                              Fa = Ia
                              ba = 44
                              break
                            }
                            default: {
                              Ea = -20
                              break c
                            }
                          }
                        while (0)
                        if ((ba | 0) == 44) {
                          ba = 0
                          if (Fa >>> 0 < 4294967177) Ga = Fa
                          else {
                            Ea = Fa
                            break c
                          }
                        }
                        if (c[R >> 2] | 0) Aa(S, xa, Ga) | 0
                        xa = (xa + Ga) | 0
                        va = (Ca + ua) | 0
                        ya = (Da - ua) | 0
                        if (c[U >> 2] | 0) break
                        Ia = oa(va, ya, m) | 0
                        if (Ia >>> 0 >= 4294967177) {
                          Ea = Ia
                          break c
                        } else ua = Ia
                      }
                      ua = V
                      sa = c[ua >> 2] | 0
                      Ia = c[(ua + 4) >> 2] | 0
                      if (
                        !(((sa | 0) == -1) & ((Ia | 0) == -1))
                          ? ((ua = (xa - W) | 0),
                            !(
                              ((sa | 0) == (ua | 0)) &
                              ((Ia | 0) == (((((ua | 0) < 0) << 31) >> 31) | 0))
                            ))
                          : 0
                      ) {
                        pa = -20
                        qa = $
                        ra = aa
                        break b
                      }
                      if (c[R >> 2] | 0) {
                        ua = Ba(S) | 0
                        u() | 0
                        if (ya >>> 0 < 4) {
                          pa = -22
                          qa = $
                          ra = aa
                          break b
                        }
                        if (
                          (d[va >> 0] |
                            (d[(va + 1) >> 0] << 8) |
                            (d[(va + 2) >> 0] << 16) |
                            (d[(va + 3) >> 0] << 24) |
                            0) ==
                          (ua | 0)
                        ) {
                          Ja = (va + 4) | 0
                          Ka = (ya + -4) | 0
                        } else {
                          pa = -22
                          qa = $
                          ra = aa
                          break b
                        }
                      } else {
                        Ja = va
                        Ka = ya
                      }
                      pa = (xa - W) | 0
                      qa = Ja
                      ra = Ka
                      break b
                    } else Ea = ha
                  while (0)
                  pa = Ea
                  qa = $
                  ra = aa
                } else {
                  pa = -72
                  qa = $
                  ra = aa
                }
              else {
                pa = ia
                qa = $
                ra = aa
              }
            } else {
              pa = -72
              qa = $
              ra = aa
            }
          else {
            pa = na
            qa = $
            ra = aa
          }
        } else {
          pa = -72
          qa = $
          ra = aa
        }
      while (0)
      if (((f | 0) == 1) & ((wa(pa) | 0) == 10)) {
        ca = -72
        ba = 59
        break
      }
      if (pa >>> 0 >= 4294967177) {
        ca = pa
        ba = 59
        break
      }
      W = (W + pa) | 0
      X = (X - pa) | 0
      f = 1
      Z = qa
      g = ra
    }
    if ((ba | 0) == 58) {
      K = l
      return ((aa | 0) == 0 ? (W - e) | 0 : -72) | 0
    } else if ((ba | 0) == 59) {
      K = l
      return ca | 0
    }
    return 0
  }
  function _(a, b, e) {
    a = a | 0
    b = b | 0
    e = e | 0
    var f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0
    f = K
    K = (K + 128) | 0
    g = f
    h = (f + 112) | 0
    i = (f + 108) | 0
    j = (b + e) | 0
    if (e >>> 0 < 9) {
      k = -30
      K = f
      return k | 0
    }
    l = (b + 8) | 0
    m = j
    n = da((a + 10264) | 0, l, (e + -8) | 0, a, 10264) | 0
    e = n >>> 0 < 4294967177
    o = e ? (l + n) | 0 : l
    if (!e) {
      k = -30
      K = f
      return k | 0
    }
    c[h >> 2] = 31
    e = Ca(g, h, i, o, (m - o) | 0) | 0
    if (
      (e >>> 0 < 4294967177
      ? ((l = c[h >> 2] | 0), l >>> 0 <= 31)
      : 0)
        ? ((n = c[i >> 2] | 0), n >>> 0 <= 8)
        : 0
    ) {
      qa((a + 4104) | 0, g, l, 48, 176, n)
      n = (o + e) | 0
      c[h >> 2] = 52
      e = Ca(g, h, i, n, (m - n) | 0) | 0
      if (
        (e >>> 0 < 4294967177
        ? ((o = c[h >> 2] | 0), o >>> 0 <= 52)
        : 0)
          ? ((l = c[i >> 2] | 0), l >>> 0 <= 9)
          : 0
      ) {
        qa((a + 6160) | 0, g, o, 304, 528, l)
        l = (n + e) | 0
        c[h >> 2] = 35
        e = Ca(g, h, i, l, (m - l) | 0) | 0
        if (
          (e >>> 0 < 4294967177
          ? ((n = c[h >> 2] | 0), n >>> 0 <= 35)
          : 0)
            ? ((h = c[i >> 2] | 0), h >>> 0 <= 9)
            : 0
        ) {
          qa(a, g, n, 752, 896, h)
          h = (l + e) | 0
          e = (h + 12) | 0
          if (e >>> 0 > j >>> 0) {
            k = -30
            K = f
            return k | 0
          }
          j = (m - e) | 0
          e =
            d[h >> 0] |
            (d[(h + 1) >> 0] << 8) |
            (d[(h + 2) >> 0] << 16) |
            (d[(h + 3) >> 0] << 24)
          if (((e + -1) | 0) >>> 0 >= j >>> 0) {
            k = -30
            K = f
            return k | 0
          }
          m = (h + 4) | 0
          c[(a + 26652) >> 2] = e
          e =
            d[m >> 0] |
            (d[(m + 1) >> 0] << 8) |
            (d[(m + 2) >> 0] << 16) |
            (d[(m + 3) >> 0] << 24)
          if (((e + -1) | 0) >>> 0 >= j >>> 0) {
            k = -30
            K = f
            return k | 0
          }
          h = (m + 4) | 0
          c[(a + 26656) >> 2] = e
          e =
            d[h >> 0] |
            (d[(h + 1) >> 0] << 8) |
            (d[(h + 2) >> 0] << 16) |
            (d[(h + 3) >> 0] << 24)
          if (((e + -1) | 0) >>> 0 >= j >>> 0) {
            k = -30
            K = f
            return k | 0
          }
          c[(a + 26660) >> 2] = e
          k = (h + 4 - b) | 0
          K = f
          return k | 0
        }
        k = -30
        K = f
        return k | 0
      }
      k = -30
      K = f
      return k | 0
    }
    k = -30
    K = f
    return k | 0
  }
  function $(a, b, d, e) {
    a = a | 0
    b = b | 0
    d = d | 0
    e = e | 0
    var f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0
    f = K
    K = (K + 32) | 0
    g = (f + 12) | 0
    h = f
    c[g >> 2] = c[1552]
    c[(g + 4) >> 2] = c[1553]
    c[(g + 8) >> 2] = c[1554]
    i = xa(160152, g) | 0
    if (!i) {
      j = -64
      K = f
      return j | 0
    }
    k = (i + 28916) | 0
    c[k >> 2] = 0
    c[(k + 4) >> 2] = 0
    c[(k + 8) >> 2] = 0
    c[(i + 28908) >> 2] = 0
    l = (i + 28936) | 0
    c[l >> 2] = 0
    c[(i + 28980) >> 2] = 134217729
    m = (i + 28948) | 0
    c[m >> 2] = 0
    n = (i + 28944) | 0
    c[n >> 2] = 0
    c[(i + 28740) >> 2] = 0
    o = (i + 28956) | 0
    c[(i + 28988) >> 2] = 0
    c[(i + 29004) >> 2] = 0
    c[(i + 29008) >> 2] = 0
    c[(i + 29020) >> 2] = 0
    c[(i + 28940) >> 2] = 0
    c[o >> 2] = 0
    c[(o + 4) >> 2] = 0
    c[(o + 8) >> 2] = 0
    c[(o + 12) >> 2] = 0
    c[(o + 16) >> 2] = 0
    o = (i + 28960) | 0
    na(0) | 0
    c[n >> 2] = 0
    c[m >> 2] = 0
    c[o >> 2] = 0
    p = Z(i, a, b, d, e, 0, 0, 0) | 0
    if (c[l >> 2] | 0) {
      j = p
      K = f
      return j | 0
    }
    c[h >> 2] = c[k >> 2]
    c[(h + 4) >> 2] = c[(k + 4) >> 2]
    c[(h + 8) >> 2] = c[(k + 8) >> 2]
    na(c[n >> 2] | 0) | 0
    c[n >> 2] = 0
    c[m >> 2] = 0
    c[o >> 2] = 0
    o = (i + 28968) | 0
    m = c[o >> 2] | 0
    c[g >> 2] = c[h >> 2]
    c[(g + 4) >> 2] = c[(h + 4) >> 2]
    c[(g + 8) >> 2] = c[(h + 8) >> 2]
    ya(m, g)
    c[o >> 2] = 0
    c[g >> 2] = c[h >> 2]
    c[(g + 4) >> 2] = c[(h + 4) >> 2]
    c[(g + 8) >> 2] = c[(h + 8) >> 2]
    ya(i, g)
    j = p
    K = f
    return j | 0
  }
  function aa(b, e, f, g, h) {
    b = b | 0
    e = e | 0
    f = f | 0
    g = g | 0
    h = h | 0
    var i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0,
      s = 0,
      t = 0
    i = K
    K = (K + 16) | 0
    j = (i + 4) | 0
    k = i
    c[j >> 2] = 0
    c[k >> 2] = 0
    l = (b + 4) | 0
    m = (g + 64) | 0
    if (h >>> 0 < 320) {
      n = -44
      K = i
      return n | 0
    }
    h = Da(m, 256, g, k, j, e, f) | 0
    if (h >>> 0 >= 4294967177) {
      n = h
      K = i
      return n | 0
    }
    f =
      d[b >> 0] |
      (d[(b + 1) >> 0] << 8) |
      (d[(b + 2) >> 0] << 16) |
      (d[(b + 3) >> 0] << 24)
    e = c[j >> 2] | 0
    if (e >>> 0 > (((f & 255) + 1) | 0) >>> 0) {
      n = -44
      K = i
      return n | 0
    }
    j = (f & -16776961) | ((e << 16) & 16711680)
    a[b >> 0] = j
    a[(b + 1) >> 0] = j >> 8
    a[(b + 2) >> 0] = j >> 16
    a[(b + 3) >> 0] = j >> 24
    j = (e + 1) | 0
    if (j >>> 0 > 1) {
      e = 1
      b = 0
      do {
        f = (g + (e << 2)) | 0
        o = b
        b = ((c[f >> 2] << (e + -1)) + b) | 0
        c[f >> 2] = o
        e = (e + 1) | 0
      } while ((e | 0) != (j | 0))
    }
    e = c[k >> 2] | 0
    if (!e) {
      n = h
      K = i
      return n | 0
    }
    k = 0
    do {
      b = d[(m + k) >> 0] | 0
      o = (1 << b) >> 1
      f = k & 255
      p = (j - b) & 255
      q = (g + (b << 2)) | 0
      b = c[q >> 2] | 0
      r = (b + o) | 0
      if (b >>> 0 < r >>> 0) {
        s = b
        do {
          a[(l + (s << 1)) >> 0] = f
          a[(l + (s << 1) + 1) >> 0] = p
          s = (s + 1) | 0
          b = ((c[q >> 2] | 0) + o) | 0
        } while (s >>> 0 < b >>> 0)
        t = b
      } else t = r
      c[q >> 2] = t
      k = (k + 1) | 0
    } while (k >>> 0 < e >>> 0)
    n = h
    K = i
    return n | 0
  }
  function ba(b, c, e, f, g) {
    b = b | 0
    c = c | 0
    e = e | 0
    f = f | 0
    g = g | 0
    var h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0,
      K = 0,
      L = 0,
      M = 0,
      N = 0,
      O = 0,
      P = 0
    h = (b + c) | 0
    i = (g + 4) | 0
    j =
      (d[g >> 0] |
        (d[(g + 1) >> 0] << 8) |
        (d[(g + 2) >> 0] << 16) |
        (d[(g + 3) >> 0] << 24)) >>>
      16
    if (!f) {
      k = -72
      return k | 0
    }
    do
      if (f >>> 0 > 3) {
        g = (f + -4) | 0
        l = a[(e + (f + -1)) >> 0] | 0
        if (!((l << 24) >> 24)) {
          k = -1
          return k | 0
        }
        m = (e + g) | 0
        n = (8 - ((r((l & 255) | 0) | 0) ^ 31)) | 0
        if (f >>> 0 < 4294967177) {
          o =
            d[m >> 0] |
            (d[(m + 1) >> 0] << 8) |
            (d[(m + 2) >> 0] << 16) |
            (d[(m + 3) >> 0] << 24)
          p = n
          q = g
        } else {
          k = f
          return k | 0
        }
      } else {
        g = d[e >> 0] | 0
        switch (f | 0) {
          case 2: {
            s = g
            t = 6
            break
          }
          case 3: {
            s = ((d[(e + 2) >> 0] | 0) << 16) | g
            t = 6
            break
          }
          default:
            u = g
        }
        if ((t | 0) == 6) u = (((d[(e + 1) >> 0] | 0) << 8) + s) | 0
        g = a[(e + (f + -1)) >> 0] | 0
        if (!((g << 24) >> 24)) {
          k = -20
          return k | 0
        } else {
          o = u
          p = (40 - (f << 3) - ((r((g & 255) | 0) | 0) ^ 31)) | 0
          q = 0
          break
        }
      }
    while (0)
    a: do
      if (p >>> 0 > 32) {
        v = o
        w = p
        x = (e + q) | 0
        y = b
      } else {
        f = (h + -3) | 0
        u = (0 - j) & 31
        s = o
        g = p
        n = q
        m = b
        while (1) {
          l = (e + n) | 0
          if ((n | 0) < 4) {
            if (!n) {
              z = s
              A = g
              B = 0
              break
            }
            C = g >>> 3
            D = ((l + (0 - C)) | 0) >>> 0 < e >>> 0
            l = D ? n : C
            E = l
            F = D & 1
            G = (g - (l << 3)) | 0
          } else {
            E = g >>> 3
            F = 0
            G = g & 7
          }
          n = (n - E) | 0
          H = (e + n) | 0
          I =
            d[H >> 0] |
            (d[(H + 1) >> 0] << 8) |
            (d[(H + 2) >> 0] << 16) |
            (d[(H + 3) >> 0] << 24)
          if (!((m >>> 0 < f >>> 0) & ((F | 0) == 0))) {
            t = 18
            break
          }
          l = (I << (G & 31)) >>> u
          D = (G + (d[(i + (l << 1) + 1) >> 0] | 0)) | 0
          a[m >> 0] = a[(i + (l << 1)) >> 0] | 0
          l = (I << (D & 31)) >>> u
          C = (D + (d[(i + (l << 1) + 1) >> 0] | 0)) | 0
          D = (m + 2) | 0
          a[(m + 1) >> 0] = a[(i + (l << 1)) >> 0] | 0
          if (C >>> 0 > 32) {
            v = I
            w = C
            x = H
            y = D
            break a
          } else {
            s = I
            g = C
            m = D
          }
        }
        if ((t | 0) == 18)
          if (G >>> 0 > 32) {
            v = I
            w = G
            x = H
            y = m
            break
          } else {
            z = I
            A = G
            B = n
          }
        g = z
        s = A
        f = B
        D = m
        while (1) {
          C = (e + f) | 0
          if ((f | 0) < 4) {
            if (!f) {
              v = g
              w = s
              x = e
              y = D
              break a
            }
            l = s >>> 3
            J = ((C + (0 - l)) | 0) >>> 0 < e >>> 0
            C = J ? f : l
            K = C
            L = J & 1
            M = (s - (C << 3)) | 0
          } else {
            K = s >>> 3
            L = 0
            M = s & 7
          }
          f = (f - K) | 0
          C = (e + f) | 0
          J =
            d[C >> 0] |
            (d[(C + 1) >> 0] << 8) |
            (d[(C + 2) >> 0] << 16) |
            (d[(C + 3) >> 0] << 24)
          if (!((D >>> 0 < h >>> 0) & ((L | 0) == 0))) {
            v = J
            w = M
            x = C
            y = D
            break a
          }
          l = (J << (M & 31)) >>> u
          N = (M + (d[(i + (l << 1) + 1) >> 0] | 0)) | 0
          O = (D + 1) | 0
          a[D >> 0] = a[(i + (l << 1)) >> 0] | 0
          if (N >>> 0 > 32) {
            v = J
            w = N
            x = C
            y = O
            break
          } else {
            g = J
            s = N
            D = O
          }
        }
      }
    while (0)
    if (y >>> 0 < h >>> 0) {
      M = (0 - j) & 31
      j = w
      L = y
      while (1) {
        y = (v << (j & 31)) >>> M
        K = (j + (d[(i + (y << 1) + 1) >> 0] | 0)) | 0
        a[L >> 0] = a[(i + (y << 1)) >> 0] | 0
        L = (L + 1) | 0
        if ((L | 0) == (h | 0)) {
          P = K
          break
        } else j = K
      }
    } else P = w
    k = ((x | 0) != (e | 0)) | ((P | 0) != 32) ? -20 : c
    return k | 0
  }
  function ca(b, c, e, f, g) {
    b = b | 0
    c = c | 0
    e = e | 0
    f = f | 0
    g = g | 0
    var h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0,
      K = 0,
      L = 0,
      M = 0,
      N = 0,
      O = 0,
      P = 0,
      Q = 0,
      R = 0,
      S = 0,
      T = 0,
      U = 0,
      V = 0,
      W = 0,
      X = 0,
      Y = 0,
      Z = 0,
      _ = 0,
      $ = 0,
      aa = 0,
      ba = 0,
      ca = 0,
      da = 0,
      ea = 0,
      fa = 0,
      ga = 0,
      ha = 0,
      ia = 0,
      ja = 0,
      ka = 0,
      la = 0,
      ma = 0,
      na = 0,
      oa = 0,
      pa = 0,
      qa = 0,
      ra = 0,
      sa = 0,
      ta = 0,
      ua = 0,
      va = 0,
      wa = 0,
      xa = 0,
      ya = 0,
      za = 0,
      Aa = 0,
      Ba = 0,
      Ca = 0,
      Da = 0,
      Ea = 0,
      Fa = 0,
      Ga = 0,
      Ha = 0,
      Ia = 0,
      Ja = 0,
      Ka = 0,
      La = 0,
      Ma = 0,
      Na = 0,
      Oa = 0,
      Pa = 0,
      Qa = 0,
      Ra = 0,
      Sa = 0,
      Ta = 0,
      Ua = 0,
      Va = 0,
      Wa = 0,
      Xa = 0,
      Ya = 0,
      Za = 0,
      _a = 0,
      $a = 0,
      ab = 0,
      bb = 0,
      cb = 0,
      db = 0,
      eb = 0,
      fb = 0,
      gb = 0,
      hb = 0,
      ib = 0,
      jb = 0,
      kb = 0,
      lb = 0,
      mb = 0,
      nb = 0,
      ob = 0,
      pb = 0,
      qb = 0,
      rb = 0,
      sb = 0,
      tb = 0,
      ub = 0,
      vb = 0,
      wb = 0,
      xb = 0,
      yb = 0,
      zb = 0,
      Ab = 0,
      Bb = 0,
      Cb = 0,
      Db = 0,
      Eb = 0,
      Fb = 0,
      Gb = 0,
      Hb = 0,
      Ib = 0,
      Jb = 0,
      Kb = 0,
      Lb = 0,
      Mb = 0,
      Nb = 0,
      Ob = 0,
      Pb = 0,
      Qb = 0,
      Rb = 0,
      Sb = 0,
      Tb = 0,
      Ub = 0,
      Vb = 0,
      Wb = 0,
      Xb = 0
    if (f >>> 0 < 10) {
      h = -20
      return h | 0
    }
    i = (b + c) | 0
    j = (g + 4) | 0
    k = d[e >> 0] | (d[(e + 1) >> 0] << 8)
    l = k & 65535
    m = (e + 2) | 0
    n = d[m >> 0] | (d[(m + 1) >> 0] << 8)
    m = n & 65535
    o = (e + 4) | 0
    p = d[o >> 0] | (d[(o + 1) >> 0] << 8)
    o = p & 65535
    q = (f + -6 - l - m - o) | 0
    s = (e + 6) | 0
    t = (e + (l + 6)) | 0
    u = (t + m) | 0
    v = (u + o) | 0
    w = ((c + 3) | 0) >>> 2
    x = (b + w) | 0
    y = (x + w) | 0
    z = (y + w) | 0
    A =
      (d[g >> 0] |
        (d[(g + 1) >> 0] << 8) |
        (d[(g + 2) >> 0] << 16) |
        (d[(g + 3) >> 0] << 24)) >>>
      16
    if (q >>> 0 > f >>> 0) {
      h = -20
      return h | 0
    }
    if (!((k << 16) >> 16)) {
      h = -72
      return h | 0
    }
    do
      if ((k & 65535) > 3) {
        f = (l + 2) | 0
        g = (e + f) | 0
        B = a[(s + (l + -1)) >> 0] | 0
        C = (8 - ((r((B & 255) | 0) | 0) ^ 31)) | 0
        if (!((B << 24) >> 24)) {
          h = -1
          return h | 0
        } else {
          D =
            d[g >> 0] |
            (d[(g + 1) >> 0] << 8) |
            (d[(g + 2) >> 0] << 16) |
            (d[(g + 3) >> 0] << 24)
          E = C
          F = f
        }
      } else {
        f = d[s >> 0] | 0
        switch ((k << 16) >> 16) {
          case 2: {
            G = f
            H = 8
            break
          }
          case 3: {
            G = ((d[(e + 8) >> 0] | 0) << 16) | f
            H = 8
            break
          }
          default:
            I = f
        }
        if ((H | 0) == 8) I = (((d[(e + 7) >> 0] | 0) << 8) + G) | 0
        f = a[(s + (l + -1)) >> 0] | 0
        if (!((f << 24) >> 24)) {
          h = -20
          return h | 0
        } else {
          D = I
          E = (40 - (l << 3) - ((r((f & 255) | 0) | 0) ^ 31)) | 0
          F = 6
          break
        }
      }
    while (0)
    if (!((n << 16) >> 16)) {
      h = -72
      return h | 0
    }
    do
      if ((n & 65535) > 3) {
        l = (m + -4) | 0
        I = (t + l) | 0
        s = a[(t + (m + -1)) >> 0] | 0
        G = (8 - ((r((s & 255) | 0) | 0) ^ 31)) | 0
        if (!((s << 24) >> 24)) {
          h = -1
          return h | 0
        } else {
          J =
            d[I >> 0] |
            (d[(I + 1) >> 0] << 8) |
            (d[(I + 2) >> 0] << 16) |
            (d[(I + 3) >> 0] << 24)
          K = G
          L = l
        }
      } else {
        l = d[t >> 0] | 0
        switch ((n << 16) >> 16) {
          case 2: {
            M = l
            H = 16
            break
          }
          case 3: {
            M = ((d[(t + 2) >> 0] | 0) << 16) | l
            H = 16
            break
          }
          default:
            N = l
        }
        if ((H | 0) == 16) N = (((d[(t + 1) >> 0] | 0) << 8) + M) | 0
        l = a[(t + (m + -1)) >> 0] | 0
        if (!((l << 24) >> 24)) {
          h = -20
          return h | 0
        } else {
          J = N
          K = (40 - (m << 3) - ((r((l & 255) | 0) | 0) ^ 31)) | 0
          L = 0
          break
        }
      }
    while (0)
    m = (t + L) | 0
    if (!((p << 16) >> 16)) {
      h = -72
      return h | 0
    }
    do
      if ((p & 65535) > 3) {
        N = (o + -4) | 0
        M = (u + N) | 0
        n = a[(u + (o + -1)) >> 0] | 0
        l = (8 - ((r((n & 255) | 0) | 0) ^ 31)) | 0
        if (!((n << 24) >> 24)) {
          h = -1
          return h | 0
        } else {
          O =
            d[M >> 0] |
            (d[(M + 1) >> 0] << 8) |
            (d[(M + 2) >> 0] << 16) |
            (d[(M + 3) >> 0] << 24)
          P = l
          Q = N
        }
      } else {
        N = d[u >> 0] | 0
        switch ((p << 16) >> 16) {
          case 2: {
            R = N
            H = 24
            break
          }
          case 3: {
            R = ((d[(u + 2) >> 0] | 0) << 16) | N
            H = 24
            break
          }
          default:
            S = N
        }
        if ((H | 0) == 24) S = (((d[(u + 1) >> 0] | 0) << 8) + R) | 0
        N = a[(u + (o + -1)) >> 0] | 0
        if (!((N << 24) >> 24)) {
          h = -20
          return h | 0
        } else {
          O = S
          P = (40 - (o << 3) - ((r((N & 255) | 0) | 0) ^ 31)) | 0
          Q = 0
          break
        }
      }
    while (0)
    o = (u + Q) | 0
    if (!q) {
      h = -72
      return h | 0
    }
    do
      if (q >>> 0 > 3) {
        S = (q + -4) | 0
        R = a[(v + (q + -1)) >> 0] | 0
        if (!((R << 24) >> 24)) {
          h = -1
          return h | 0
        }
        p = (v + S) | 0
        N = (8 - ((r((R & 255) | 0) | 0) ^ 31)) | 0
        if (q >>> 0 < 4294967177) {
          T =
            d[p >> 0] |
            (d[(p + 1) >> 0] << 8) |
            (d[(p + 2) >> 0] << 16) |
            (d[(p + 3) >> 0] << 24)
          U = N
          V = S
        } else {
          h = q
          return h | 0
        }
      } else {
        S = d[v >> 0] | 0
        switch (q | 0) {
          case 2: {
            W = S
            H = 32
            break
          }
          case 3: {
            W = ((d[(v + 2) >> 0] | 0) << 16) | S
            H = 32
            break
          }
          default:
            X = S
        }
        if ((H | 0) == 32) X = (((d[(v + 1) >> 0] | 0) << 8) + W) | 0
        S = a[(v + (q + -1)) >> 0] | 0
        if (!((S << 24) >> 24)) {
          h = -20
          return h | 0
        } else {
          T = X
          U = (40 - (q << 3) - ((r((S & 255) | 0) | 0) ^ 31)) | 0
          V = 0
          break
        }
      }
    while (0)
    q = (v + V) | 0
    do
      if (E >>> 0 <= 32) {
        if ((F | 0) >= 10) {
          X = (F - (E >>> 3)) | 0
          W = (e + X) | 0
          Y =
            d[W >> 0] |
            (d[(W + 1) >> 0] << 8) |
            (d[(W + 2) >> 0] << 16) |
            (d[(W + 3) >> 0] << 24)
          Z = E & 7
          _ = X
          $ = 0
          break
        }
        if ((F | 0) == 6) {
          Y = D
          Z = E
          _ = 6
          $ = E >>> 0 < 32 ? 1 : 2
          break
        } else {
          X = E >>> 3
          W = ((F - X) | 0) < 6
          S = W ? (F + -6) | 0 : X
          X = (F - S) | 0
          N = (e + X) | 0
          Y =
            d[N >> 0] |
            (d[(N + 1) >> 0] << 8) |
            (d[(N + 2) >> 0] << 16) |
            (d[(N + 3) >> 0] << 24)
          Z = (E - (S << 3)) | 0
          _ = X
          $ = W & 1
          break
        }
      } else {
        Y = D
        Z = E
        _ = F
        $ = 3
      }
    while (0)
    do
      if (K >>> 0 <= 32) {
        if ((L | 0) >= 4) {
          F = (L - (K >>> 3)) | 0
          E = (t + F) | 0
          aa =
            d[E >> 0] |
            (d[(E + 1) >> 0] << 8) |
            (d[(E + 2) >> 0] << 16) |
            (d[(E + 3) >> 0] << 24)
          ba = K & 7
          ca = F
          da = 0
          break
        }
        if (!L) {
          aa = J
          ba = K
          ca = 0
          da = K >>> 0 < 32 ? 1 : 2
          break
        } else {
          F = K >>> 3
          E = ((m + (0 - F)) | 0) >>> 0 < t >>> 0
          D = E ? L : F
          F = (L - D) | 0
          W = (t + F) | 0
          aa =
            d[W >> 0] |
            (d[(W + 1) >> 0] << 8) |
            (d[(W + 2) >> 0] << 16) |
            (d[(W + 3) >> 0] << 24)
          ba = (K - (D << 3)) | 0
          ca = F
          da = E & 1
          break
        }
      } else {
        aa = J
        ba = K
        ca = L
        da = 3
      }
    while (0)
    L = da | $
    do
      if (P >>> 0 <= 32) {
        if ((Q | 0) >= 4) {
          $ = (Q - (P >>> 3)) | 0
          da = (u + $) | 0
          ea =
            d[da >> 0] |
            (d[(da + 1) >> 0] << 8) |
            (d[(da + 2) >> 0] << 16) |
            (d[(da + 3) >> 0] << 24)
          fa = P & 7
          ga = $
          ha = 0
          break
        }
        if (!Q) {
          ea = O
          fa = P
          ga = 0
          ha = P >>> 0 < 32 ? 1 : 2
          break
        } else {
          $ = P >>> 3
          da = ((o + (0 - $)) | 0) >>> 0 < u >>> 0
          K = da ? Q : $
          $ = (Q - K) | 0
          J = (u + $) | 0
          ea =
            d[J >> 0] |
            (d[(J + 1) >> 0] << 8) |
            (d[(J + 2) >> 0] << 16) |
            (d[(J + 3) >> 0] << 24)
          fa = (P - (K << 3)) | 0
          ga = $
          ha = da & 1
          break
        }
      } else {
        ea = O
        fa = P
        ga = Q
        ha = 3
      }
    while (0)
    Q = L | ha
    do
      if (U >>> 0 <= 32) {
        if ((V | 0) >= 4) {
          ha = (V - (U >>> 3)) | 0
          L = (v + ha) | 0
          ia =
            d[L >> 0] |
            (d[(L + 1) >> 0] << 8) |
            (d[(L + 2) >> 0] << 16) |
            (d[(L + 3) >> 0] << 24)
          ja = U & 7
          ka = ha
          la = 0
          break
        }
        if (!V) {
          ia = T
          ja = U
          ka = 0
          la = U >>> 0 < 32 ? 1 : 2
          break
        } else {
          ha = U >>> 3
          L = ((q + (0 - ha)) | 0) >>> 0 < v >>> 0
          P = L ? V : ha
          ha = (V - P) | 0
          O = (v + ha) | 0
          ia =
            d[O >> 0] |
            (d[(O + 1) >> 0] << 8) |
            (d[(O + 2) >> 0] << 16) |
            (d[(O + 3) >> 0] << 24)
          ja = (U - (P << 3)) | 0
          ka = ha
          la = L & 1
          break
        }
      } else {
        ia = T
        ja = U
        ka = V
        la = 3
      }
    while (0)
    V = (i + -3) | 0
    if ((z >>> 0 < V >>> 0) & ((Q | la | 0) == 0)) {
      la = (0 - A) & 31
      Q = (w * 3) | 0
      U = (c + -4 - Q) & -2
      T = (U + 2) | 0
      q = (w + U + 2) | 0
      L = (U + (w << 1) + 2) | 0
      w = (Q + U + 2) | 0
      U = Y
      Q = Z
      ha = _
      P = aa
      O = ba
      o = ca
      da = ea
      $ = fa
      K = ga
      J = ia
      m = ja
      E = ka
      F = b
      D = x
      W = y
      X = z
      while (1) {
        S = (U << (Q & 31)) >>> la
        N = (Q + (d[(j + (S << 1) + 1) >> 0] | 0)) | 0
        a[F >> 0] = a[(j + (S << 1)) >> 0] | 0
        S = (P << (O & 31)) >>> la
        p = (O + (d[(j + (S << 1) + 1) >> 0] | 0)) | 0
        a[D >> 0] = a[(j + (S << 1)) >> 0] | 0
        S = (da << ($ & 31)) >>> la
        R = ($ + (d[(j + (S << 1) + 1) >> 0] | 0)) | 0
        a[W >> 0] = a[(j + (S << 1)) >> 0] | 0
        S = (J << (m & 31)) >>> la
        l = (m + (d[(j + (S << 1) + 1) >> 0] | 0)) | 0
        a[X >> 0] = a[(j + (S << 1)) >> 0] | 0
        S = (U << (N & 31)) >>> la
        M = (N + (d[(j + (S << 1) + 1) >> 0] | 0)) | 0
        a[(F + 1) >> 0] = a[(j + (S << 1)) >> 0] | 0
        F = (F + 2) | 0
        S = (P << (p & 31)) >>> la
        N = (p + (d[(j + (S << 1) + 1) >> 0] | 0)) | 0
        a[(D + 1) >> 0] = a[(j + (S << 1)) >> 0] | 0
        D = (D + 2) | 0
        S = (da << (R & 31)) >>> la
        p = (R + (d[(j + (S << 1) + 1) >> 0] | 0)) | 0
        a[(W + 1) >> 0] = a[(j + (S << 1)) >> 0] | 0
        W = (W + 2) | 0
        S = (J << (l & 31)) >>> la
        R = (l + (d[(j + (S << 1) + 1) >> 0] | 0)) | 0
        a[(X + 1) >> 0] = a[(j + (S << 1)) >> 0] | 0
        X = (X + 2) | 0
        do
          if (M >>> 0 > 32) {
            ma = U
            na = M
            oa = ha
          } else {
            if ((ha | 0) >= 10) {
              S = (ha - (M >>> 3)) | 0
              l = (e + S) | 0
              ma =
                d[l >> 0] |
                (d[(l + 1) >> 0] << 8) |
                (d[(l + 2) >> 0] << 16) |
                (d[(l + 3) >> 0] << 24)
              na = M & 7
              oa = S
              break
            }
            if ((ha | 0) == 6) {
              ma = U
              na = M
              oa = 6
              break
            }
            S = M >>> 3
            l = ((ha - S) | 0) < 6 ? (ha + -6) | 0 : S
            S = (ha - l) | 0
            n = (e + S) | 0
            ma =
              d[n >> 0] |
              (d[(n + 1) >> 0] << 8) |
              (d[(n + 2) >> 0] << 16) |
              (d[(n + 3) >> 0] << 24)
            na = (M - (l << 3)) | 0
            oa = S
          }
        while (0)
        do
          if (N >>> 0 > 32) {
            pa = P
            qa = N
            ra = o
          } else {
            if ((o | 0) >= 4) {
              M = (o - (N >>> 3)) | 0
              S = (t + M) | 0
              pa =
                d[S >> 0] |
                (d[(S + 1) >> 0] << 8) |
                (d[(S + 2) >> 0] << 16) |
                (d[(S + 3) >> 0] << 24)
              qa = N & 7
              ra = M
              break
            }
            M = N >>> 3
            S = ((t + o + (0 - M)) | 0) >>> 0 < t >>> 0 ? o : M
            M = (o - S) | 0
            if (!o) {
              pa = P
              qa = N
              ra = 0
              break
            }
            l = (t + M) | 0
            pa =
              d[l >> 0] |
              (d[(l + 1) >> 0] << 8) |
              (d[(l + 2) >> 0] << 16) |
              (d[(l + 3) >> 0] << 24)
            qa = (N - (S << 3)) | 0
            ra = M
          }
        while (0)
        do
          if (p >>> 0 > 32) {
            sa = da
            ta = p
            ua = K
          } else {
            if ((K | 0) >= 4) {
              N = (K - (p >>> 3)) | 0
              M = (u + N) | 0
              sa =
                d[M >> 0] |
                (d[(M + 1) >> 0] << 8) |
                (d[(M + 2) >> 0] << 16) |
                (d[(M + 3) >> 0] << 24)
              ta = p & 7
              ua = N
              break
            }
            N = p >>> 3
            M = ((u + K + (0 - N)) | 0) >>> 0 < u >>> 0 ? K : N
            N = (K - M) | 0
            if (!K) {
              sa = da
              ta = p
              ua = 0
              break
            }
            S = (u + N) | 0
            sa =
              d[S >> 0] |
              (d[(S + 1) >> 0] << 8) |
              (d[(S + 2) >> 0] << 16) |
              (d[(S + 3) >> 0] << 24)
            ta = (p - (M << 3)) | 0
            ua = N
          }
        while (0)
        do
          if (R >>> 0 > 32) {
            va = J
            wa = R
            xa = E
          } else {
            if ((E | 0) >= 4) {
              p = (E - (R >>> 3)) | 0
              N = (v + p) | 0
              va =
                d[N >> 0] |
                (d[(N + 1) >> 0] << 8) |
                (d[(N + 2) >> 0] << 16) |
                (d[(N + 3) >> 0] << 24)
              wa = R & 7
              xa = p
              break
            }
            p = R >>> 3
            N = ((v + E + (0 - p)) | 0) >>> 0 < v >>> 0 ? E : p
            p = (E - N) | 0
            if (!E) {
              va = J
              wa = R
              xa = 0
              break
            }
            M = (v + p) | 0
            va =
              d[M >> 0] |
              (d[(M + 1) >> 0] << 8) |
              (d[(M + 2) >> 0] << 16) |
              (d[(M + 3) >> 0] << 24)
            wa = (R - (N << 3)) | 0
            xa = p
          }
        while (0)
        if (X >>> 0 >= V >>> 0) break
        else {
          U = ma
          Q = na
          ha = oa
          P = pa
          O = qa
          o = ra
          da = sa
          $ = ta
          K = ua
          J = va
          m = wa
          E = xa
        }
      }
      ya = ma
      za = na
      Aa = oa
      Ba = pa
      Ca = qa
      Da = ra
      Ea = sa
      Fa = ta
      Ga = ua
      Ha = va
      Ia = wa
      Ja = xa
      Ka = (b + T) | 0
      La = (b + q) | 0
      Ma = (b + L) | 0
      Na = (b + w) | 0
    } else {
      ya = Y
      za = Z
      Aa = _
      Ba = aa
      Ca = ba
      Da = ca
      Ea = ea
      Fa = fa
      Ga = ga
      Ha = ia
      Ia = ja
      Ja = ka
      Ka = b
      La = x
      Ma = y
      Na = z
    }
    b = (t + Da) | 0
    ka = (u + Ga) | 0
    ja = (v + Ja) | 0
    if ((Ma >>> 0 > z >>> 0) | ((La >>> 0 > y >>> 0) | (Ka >>> 0 > x >>> 0))) {
      h = -20
      return h | 0
    }
    a: do
      if (za >>> 0 > 32) {
        Oa = ya
        Pa = za
        Qa = Aa
        Ra = Ka
      } else {
        ia = (x + -3) | 0
        ga = (0 - A) & 31
        fa = ya
        ea = za
        ca = Aa
        ba = Ka
        while (1) {
          if ((ca | 0) < 10) {
            if ((ca | 0) == 6) {
              Sa = fa
              Ta = ea
              Ua = 6
              break
            }
            aa = ea >>> 3
            _ = ((ca - aa) | 0) < 6
            Z = _ ? (ca + -6) | 0 : aa
            Va = Z
            Wa = _ & 1
            Xa = (ea - (Z << 3)) | 0
          } else {
            Va = ea >>> 3
            Wa = 0
            Xa = ea & 7
          }
          Ya = (ca - Va) | 0
          Z = (e + Ya) | 0
          Za =
            d[Z >> 0] |
            (d[(Z + 1) >> 0] << 8) |
            (d[(Z + 2) >> 0] << 16) |
            (d[(Z + 3) >> 0] << 24)
          if (!((ba >>> 0 < ia >>> 0) & ((Wa | 0) == 0))) {
            H = 93
            break
          }
          Z = (Za << (Xa & 31)) >>> ga
          _ = (Xa + (d[(j + (Z << 1) + 1) >> 0] | 0)) | 0
          a[ba >> 0] = a[(j + (Z << 1)) >> 0] | 0
          Z = (Za << (_ & 31)) >>> ga
          aa = (_ + (d[(j + (Z << 1) + 1) >> 0] | 0)) | 0
          _ = (ba + 2) | 0
          a[(ba + 1) >> 0] = a[(j + (Z << 1)) >> 0] | 0
          if (aa >>> 0 > 32) {
            Oa = Za
            Pa = aa
            Qa = Ya
            Ra = _
            break a
          } else {
            fa = Za
            ea = aa
            ca = Ya
            ba = _
          }
        }
        if ((H | 0) == 93)
          if (Xa >>> 0 > 32) {
            Oa = Za
            Pa = Xa
            Qa = Ya
            Ra = ba
            break
          } else {
            Sa = Za
            Ta = Xa
            Ua = Ya
          }
        ca = Sa
        ea = Ta
        fa = Ua
        ia = ba
        while (1) {
          if ((fa | 0) < 10) {
            if ((fa | 0) == 6) {
              Oa = ca
              Pa = ea
              Qa = 6
              Ra = ia
              break a
            }
            _ = ea >>> 3
            aa = ((fa - _) | 0) < 6
            Z = aa ? (fa + -6) | 0 : _
            _a = Z
            $a = aa & 1
            ab = (ea - (Z << 3)) | 0
          } else {
            _a = ea >>> 3
            $a = 0
            ab = ea & 7
          }
          Z = (fa - _a) | 0
          aa = (e + Z) | 0
          _ =
            d[aa >> 0] |
            (d[(aa + 1) >> 0] << 8) |
            (d[(aa + 2) >> 0] << 16) |
            (d[(aa + 3) >> 0] << 24)
          if (!((ia >>> 0 < x >>> 0) & (($a | 0) == 0))) {
            Oa = _
            Pa = ab
            Qa = Z
            Ra = ia
            break a
          }
          aa = (_ << (ab & 31)) >>> ga
          Y = (ab + (d[(j + (aa << 1) + 1) >> 0] | 0)) | 0
          w = (ia + 1) | 0
          a[ia >> 0] = a[(j + (aa << 1)) >> 0] | 0
          if (Y >>> 0 > 32) {
            Oa = _
            Pa = Y
            Qa = Z
            Ra = w
            break
          } else {
            ca = _
            ea = Y
            fa = Z
            ia = w
          }
        }
      }
    while (0)
    if (Ra >>> 0 < x >>> 0) {
      ab = (0 - A) & 31
      $a = Pa
      e = Ra
      while (1) {
        Ra = (Oa << ($a & 31)) >>> ab
        _a = ($a + (d[(j + (Ra << 1) + 1) >> 0] | 0)) | 0
        a[e >> 0] = a[(j + (Ra << 1)) >> 0] | 0
        e = (e + 1) | 0
        if ((e | 0) == (x | 0)) {
          bb = _a
          break
        } else $a = _a
      }
    } else bb = Pa
    b: do
      if (Ca >>> 0 > 32) {
        cb = Ba
        db = Ca
        eb = b
        fb = La
      } else {
        Pa = (y + -3) | 0
        $a = (0 - A) & 31
        x = Ba
        e = Ca
        ab = Da
        Oa = La
        while (1) {
          _a = (t + ab) | 0
          if ((ab | 0) < 4) {
            if (!ab) {
              gb = x
              hb = e
              ib = 0
              break
            }
            Ra = e >>> 3
            Ua = ((_a + (0 - Ra)) | 0) >>> 0 < t >>> 0
            _a = Ua ? ab : Ra
            jb = _a
            kb = Ua & 1
            lb = (e - (_a << 3)) | 0
          } else {
            jb = e >>> 3
            kb = 0
            lb = e & 7
          }
          ab = (ab - jb) | 0
          mb = (t + ab) | 0
          nb =
            d[mb >> 0] |
            (d[(mb + 1) >> 0] << 8) |
            (d[(mb + 2) >> 0] << 16) |
            (d[(mb + 3) >> 0] << 24)
          if (!((Oa >>> 0 < Pa >>> 0) & ((kb | 0) == 0))) {
            H = 112
            break
          }
          _a = (nb << (lb & 31)) >>> $a
          Ua = (lb + (d[(j + (_a << 1) + 1) >> 0] | 0)) | 0
          a[Oa >> 0] = a[(j + (_a << 1)) >> 0] | 0
          _a = (nb << (Ua & 31)) >>> $a
          Ra = (Ua + (d[(j + (_a << 1) + 1) >> 0] | 0)) | 0
          Ua = (Oa + 2) | 0
          a[(Oa + 1) >> 0] = a[(j + (_a << 1)) >> 0] | 0
          if (Ra >>> 0 > 32) {
            cb = nb
            db = Ra
            eb = mb
            fb = Ua
            break b
          } else {
            x = nb
            e = Ra
            Oa = Ua
          }
        }
        if ((H | 0) == 112)
          if (lb >>> 0 > 32) {
            cb = nb
            db = lb
            eb = mb
            fb = Oa
            break
          } else {
            gb = nb
            hb = lb
            ib = ab
          }
        e = gb
        x = hb
        Pa = ib
        Ua = Oa
        while (1) {
          Ra = (t + Pa) | 0
          if ((Pa | 0) < 4) {
            if (!Pa) {
              cb = e
              db = x
              eb = t
              fb = Ua
              break b
            }
            _a = x >>> 3
            Ta = ((Ra + (0 - _a)) | 0) >>> 0 < t >>> 0
            Ra = Ta ? Pa : _a
            ob = Ra
            pb = Ta & 1
            qb = (x - (Ra << 3)) | 0
          } else {
            ob = x >>> 3
            pb = 0
            qb = x & 7
          }
          Pa = (Pa - ob) | 0
          Ra = (t + Pa) | 0
          Ta =
            d[Ra >> 0] |
            (d[(Ra + 1) >> 0] << 8) |
            (d[(Ra + 2) >> 0] << 16) |
            (d[(Ra + 3) >> 0] << 24)
          if (!((Ua >>> 0 < y >>> 0) & ((pb | 0) == 0))) {
            cb = Ta
            db = qb
            eb = Ra
            fb = Ua
            break b
          }
          _a = (Ta << (qb & 31)) >>> $a
          Sa = (qb + (d[(j + (_a << 1) + 1) >> 0] | 0)) | 0
          Ya = (Ua + 1) | 0
          a[Ua >> 0] = a[(j + (_a << 1)) >> 0] | 0
          if (Sa >>> 0 > 32) {
            cb = Ta
            db = Sa
            eb = Ra
            fb = Ya
            break
          } else {
            e = Ta
            x = Sa
            Ua = Ya
          }
        }
      }
    while (0)
    if (fb >>> 0 < y >>> 0) {
      qb = (0 - A) & 31
      pb = db
      ob = fb
      while (1) {
        fb = (cb << (pb & 31)) >>> qb
        ib = (pb + (d[(j + (fb << 1) + 1) >> 0] | 0)) | 0
        a[ob >> 0] = a[(j + (fb << 1)) >> 0] | 0
        ob = (ob + 1) | 0
        if ((ob | 0) == (y | 0)) {
          rb = ib
          break
        } else pb = ib
      }
    } else rb = db
    c: do
      if (Fa >>> 0 > 32) {
        sb = Ea
        tb = Fa
        ub = ka
        vb = Ma
      } else {
        db = (z + -3) | 0
        pb = (0 - A) & 31
        y = Ea
        ob = Fa
        qb = Ga
        cb = Ma
        while (1) {
          ib = (u + qb) | 0
          if ((qb | 0) < 4) {
            if (!qb) {
              wb = y
              xb = ob
              yb = 0
              break
            }
            fb = ob >>> 3
            hb = ((ib + (0 - fb)) | 0) >>> 0 < u >>> 0
            ib = hb ? qb : fb
            zb = ib
            Ab = hb & 1
            Bb = (ob - (ib << 3)) | 0
          } else {
            zb = ob >>> 3
            Ab = 0
            Bb = ob & 7
          }
          qb = (qb - zb) | 0
          Cb = (u + qb) | 0
          Db =
            d[Cb >> 0] |
            (d[(Cb + 1) >> 0] << 8) |
            (d[(Cb + 2) >> 0] << 16) |
            (d[(Cb + 3) >> 0] << 24)
          if (!((cb >>> 0 < db >>> 0) & ((Ab | 0) == 0))) {
            H = 131
            break
          }
          ib = (Db << (Bb & 31)) >>> pb
          hb = (Bb + (d[(j + (ib << 1) + 1) >> 0] | 0)) | 0
          a[cb >> 0] = a[(j + (ib << 1)) >> 0] | 0
          ib = (Db << (hb & 31)) >>> pb
          fb = (hb + (d[(j + (ib << 1) + 1) >> 0] | 0)) | 0
          hb = (cb + 2) | 0
          a[(cb + 1) >> 0] = a[(j + (ib << 1)) >> 0] | 0
          if (fb >>> 0 > 32) {
            sb = Db
            tb = fb
            ub = Cb
            vb = hb
            break c
          } else {
            y = Db
            ob = fb
            cb = hb
          }
        }
        if ((H | 0) == 131)
          if (Bb >>> 0 > 32) {
            sb = Db
            tb = Bb
            ub = Cb
            vb = cb
            break
          } else {
            wb = Db
            xb = Bb
            yb = qb
          }
        ob = wb
        y = xb
        db = yb
        hb = cb
        while (1) {
          fb = (u + db) | 0
          if ((db | 0) < 4) {
            if (!db) {
              sb = ob
              tb = y
              ub = u
              vb = hb
              break c
            }
            ib = y >>> 3
            gb = ((fb + (0 - ib)) | 0) >>> 0 < u >>> 0
            fb = gb ? db : ib
            Eb = fb
            Fb = gb & 1
            Gb = (y - (fb << 3)) | 0
          } else {
            Eb = y >>> 3
            Fb = 0
            Gb = y & 7
          }
          db = (db - Eb) | 0
          fb = (u + db) | 0
          gb =
            d[fb >> 0] |
            (d[(fb + 1) >> 0] << 8) |
            (d[(fb + 2) >> 0] << 16) |
            (d[(fb + 3) >> 0] << 24)
          if (!((hb >>> 0 < z >>> 0) & ((Fb | 0) == 0))) {
            sb = gb
            tb = Gb
            ub = fb
            vb = hb
            break c
          }
          ib = (gb << (Gb & 31)) >>> pb
          lb = (Gb + (d[(j + (ib << 1) + 1) >> 0] | 0)) | 0
          nb = (hb + 1) | 0
          a[hb >> 0] = a[(j + (ib << 1)) >> 0] | 0
          if (lb >>> 0 > 32) {
            sb = gb
            tb = lb
            ub = fb
            vb = nb
            break
          } else {
            ob = gb
            y = lb
            hb = nb
          }
        }
      }
    while (0)
    if (vb >>> 0 < z >>> 0) {
      Gb = (0 - A) & 31
      Fb = tb
      Eb = vb
      while (1) {
        vb = (sb << (Fb & 31)) >>> Gb
        yb = (Fb + (d[(j + (vb << 1) + 1) >> 0] | 0)) | 0
        a[Eb >> 0] = a[(j + (vb << 1)) >> 0] | 0
        Eb = (Eb + 1) | 0
        if ((Eb | 0) == (z | 0)) {
          Hb = yb
          break
        } else Fb = yb
      }
    } else Hb = tb
    d: do
      if (Ia >>> 0 > 32) {
        Ib = Ha
        Jb = Ia
        Kb = ja
        Lb = Na
      } else {
        tb = (0 - A) & 31
        Fb = Ha
        z = Ia
        Eb = Ja
        Gb = Na
        while (1) {
          sb = (v + Eb) | 0
          if ((Eb | 0) < 4) {
            if (!Eb) {
              Mb = Fb
              Nb = z
              Ob = 0
              break
            }
            yb = z >>> 3
            vb = ((sb + (0 - yb)) | 0) >>> 0 < v >>> 0
            sb = vb ? Eb : yb
            Pb = sb
            Qb = vb & 1
            Rb = (z - (sb << 3)) | 0
          } else {
            Pb = z >>> 3
            Qb = 0
            Rb = z & 7
          }
          Eb = (Eb - Pb) | 0
          Sb = (v + Eb) | 0
          Tb =
            d[Sb >> 0] |
            (d[(Sb + 1) >> 0] << 8) |
            (d[(Sb + 2) >> 0] << 16) |
            (d[(Sb + 3) >> 0] << 24)
          if (!((Gb >>> 0 < V >>> 0) & ((Qb | 0) == 0))) {
            H = 150
            break
          }
          sb = (Tb << (Rb & 31)) >>> tb
          vb = (Rb + (d[(j + (sb << 1) + 1) >> 0] | 0)) | 0
          a[Gb >> 0] = a[(j + (sb << 1)) >> 0] | 0
          sb = (Tb << (vb & 31)) >>> tb
          yb = (vb + (d[(j + (sb << 1) + 1) >> 0] | 0)) | 0
          vb = (Gb + 2) | 0
          a[(Gb + 1) >> 0] = a[(j + (sb << 1)) >> 0] | 0
          if (yb >>> 0 > 32) {
            Ib = Tb
            Jb = yb
            Kb = Sb
            Lb = vb
            break d
          } else {
            Fb = Tb
            z = yb
            Gb = vb
          }
        }
        if ((H | 0) == 150)
          if (Rb >>> 0 > 32) {
            Ib = Tb
            Jb = Rb
            Kb = Sb
            Lb = Gb
            break
          } else {
            Mb = Tb
            Nb = Rb
            Ob = Eb
          }
        z = Mb
        Fb = Nb
        vb = Ob
        yb = Gb
        while (1) {
          sb = (v + vb) | 0
          if ((vb | 0) < 4) {
            if (!vb) {
              Ib = z
              Jb = Fb
              Kb = v
              Lb = yb
              break d
            }
            xb = Fb >>> 3
            wb = ((sb + (0 - xb)) | 0) >>> 0 < v >>> 0
            sb = wb ? vb : xb
            Ub = sb
            Vb = wb & 1
            Wb = (Fb - (sb << 3)) | 0
          } else {
            Ub = Fb >>> 3
            Vb = 0
            Wb = Fb & 7
          }
          vb = (vb - Ub) | 0
          sb = (v + vb) | 0
          wb =
            d[sb >> 0] |
            (d[(sb + 1) >> 0] << 8) |
            (d[(sb + 2) >> 0] << 16) |
            (d[(sb + 3) >> 0] << 24)
          if (!((yb >>> 0 < i >>> 0) & ((Vb | 0) == 0))) {
            Ib = wb
            Jb = Wb
            Kb = sb
            Lb = yb
            break d
          }
          xb = (wb << (Wb & 31)) >>> tb
          Bb = (Wb + (d[(j + (xb << 1) + 1) >> 0] | 0)) | 0
          Db = (yb + 1) | 0
          a[yb >> 0] = a[(j + (xb << 1)) >> 0] | 0
          if (Bb >>> 0 > 32) {
            Ib = wb
            Jb = Bb
            Kb = sb
            Lb = Db
            break
          } else {
            z = wb
            Fb = Bb
            yb = Db
          }
        }
      }
    while (0)
    if (Lb >>> 0 < i >>> 0) {
      Wb = (0 - A) & 31
      A = Jb
      Vb = Lb
      while (1) {
        Lb = (Ib << (A & 31)) >>> Wb
        Ub = (A + (d[(j + (Lb << 1) + 1) >> 0] | 0)) | 0
        a[Vb >> 0] = a[(j + (Lb << 1)) >> 0] | 0
        Vb = (Vb + 1) | 0
        if ((Vb | 0) == (i | 0)) {
          Xb = Ub
          break
        } else A = Ub
      }
    } else Xb = Jb
    h =
      ((Qa | 0) == 6) &
      ((bb | 0) == 32) &
      (((t | 0) == (eb | 0)) & ((rb | 0) == 32)) &
      (((u | 0) == (ub | 0)) & ((Hb | 0) == 32)) &
      (((v | 0) == (Kb | 0)) & ((Xb | 0) == 32))
        ? c
        : -20
    return h | 0
  }
  function da(e, f, g, h, i) {
    e = e | 0
    f = f | 0
    g = g | 0
    h = h | 0
    i = i | 0
    var j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0,
      L = 0,
      M = 0,
      N = 0,
      O = 0,
      P = 0
    j = K
    K = (K + 128) | 0
    k = (j + 64) | 0
    l = j
    m = (j + 120) | 0
    n = (j + 116) | 0
    o =
      d[e >> 0] |
      (d[(e + 1) >> 0] << 8) |
      (d[(e + 2) >> 0] << 16) |
      (d[(e + 3) >> 0] << 24)
    p = o & 255
    q = (e + 4) | 0
    r = (h + 624) | 0
    s = (h + 676) | 0
    t = (h + 732) | 0
    u = (h + 1244) | 0
    if (i >>> 0 < 1500) {
      v = -44
      K = j
      return v | 0
    }
    i = o & 255
    w = (h + 680) | 0
    x = r
    y = (x + 108) | 0
    do {
      c[x >> 2] = 0
      x = (x + 4) | 0
    } while ((x | 0) < (y | 0))
    if ((i & 255) > 12) {
      v = -44
      K = j
      return v | 0
    }
    i = Da(u, 256, r, n, m, f, g) | 0
    if (i >>> 0 >= 4294967177) {
      v = i
      K = j
      return v | 0
    }
    g = c[m >> 2] | 0
    if (p >>> 0 < g >>> 0) {
      v = -44
      K = j
      return v | 0
    }
    m = g
    while (1)
      if (!(c[(r + (m << 2)) >> 2] | 0)) m = (m + -1) | 0
      else break
    f = (m + 1) | 0
    z = f >>> 0 > 1
    if (z) {
      A = 0
      B = 1
      while (1) {
        C = ((c[(r + (B << 2)) >> 2] | 0) + A) | 0
        c[(w + (B << 2)) >> 2] = A
        B = (B + 1) | 0
        if ((B | 0) == (f | 0)) {
          D = C
          break
        } else A = C
      }
    } else D = 0
    c[w >> 2] = D
    A = c[n >> 2] | 0
    if (A | 0) {
      n = 0
      do {
        B = a[(u + n) >> 0] | 0
        C = (w + ((B & 255) << 2)) | 0
        E = c[C >> 2] | 0
        c[C >> 2] = E + 1
        a[(t + (E << 1)) >> 0] = n
        a[(t + (E << 1) + 1) >> 0] = B
        n = (n + 1) | 0
      } while (n >>> 0 < A >>> 0)
    }
    c[w >> 2] = 0
    if (z) {
      w = (p + -1 - g) | 0
      A = 0
      n = 1
      do {
        u = A
        A = ((c[(r + (n << 2)) >> 2] << (w + n)) + A) | 0
        c[(h + (n << 2)) >> 2] = u
        n = (n + 1) | 0
      } while ((n | 0) != (f | 0))
    }
    n = (g + 1) | 0
    g = (n - m) | 0
    m = (p + 1 - g) | 0
    if (!((g >>> 0 >= m >>> 0) | (z ^ 1))) {
      z = g
      do {
        A = 1
        do {
          c[(h + ((z * 52) | 0) + (A << 2)) >> 2] =
            (c[(h + (A << 2)) >> 2] | 0) >>> z
          A = (A + 1) | 0
        } while ((A | 0) != (f | 0))
        z = (z + 1) | 0
      } while ((z | 0) != (m | 0))
    }
    m = (n - p) | 0
    x = l
    z = h
    y = (x + 52) | 0
    do {
      c[x >> 2] = c[z >> 2]
      x = (x + 4) | 0
      z = (z + 4) | 0
    } while ((x | 0) < (y | 0))
    if (D | 0) {
      f = 0
      do {
        A = a[(t + (f << 1)) >> 0] | 0
        w = d[(t + (f << 1) + 1) >> 0] | 0
        r = (n - w) | 0
        u = (l + (w << 2)) | 0
        w = c[u >> 2] | 0
        B = (p - r) | 0
        E = 1 << B
        if (B >>> 0 < g >>> 0) {
          C = (E + w) | 0
          if (w >>> 0 < C >>> 0) {
            F = ((r << 16) & 16711680) | (A & 255) | 16777216
            G = w
            do {
              H = (q + (G << 2)) | 0
              b[H >> 1] = F
              b[(H + 2) >> 1] = F >>> 16
              G = (G + 1) | 0
            } while ((G | 0) != (C | 0))
            I = C
          } else I = C
        } else {
          G = (r + m) | 0
          F = (G | 0) > 1
          H = F ? G : 1
          G = c[(s + (H << 2)) >> 2] | 0
          J = (q + (w << 2)) | 0
          L = (t + (G << 1)) | 0
          M = (D - G) | 0
          x = k
          z = (h + ((r * 52) | 0)) | 0
          y = (x + 52) | 0
          do {
            c[x >> 2] = c[z >> 2]
            x = (x + 4) | 0
            z = (z + 4) | 0
          } while ((x | 0) < (y | 0))
          if (F ? ((C = c[(k + (H << 2)) >> 2] | 0), C | 0) : 0) {
            G = ((r << 16) & 16711680) | (A & 255) | 16777216
            N = 0
            do {
              O = (J + (N << 2)) | 0
              b[O >> 1] = G
              b[(O + 2) >> 1] = G >>> 16
              N = (N + 1) | 0
            } while ((N | 0) != (C | 0))
          }
          if (M | 0) {
            C = A & 255
            N = 0
            do {
              G = d[(L + (N << 1) + 1) >> 0] | 0
              H = (n - G) | 0
              F = (k + (G << 2)) | 0
              G = c[F >> 2] | 0
              O = ((1 << (B - H)) + G) | 0
              P =
                ((d[(L + (N << 1)) >> 0] | 0) << 8) |
                C |
                (((H + r) << 16) & 16711680) |
                33554432
              H = G
              do {
                G = (J + (H << 2)) | 0
                H = (H + 1) | 0
                b[G >> 1] = P
                b[(G + 2) >> 1] = P >>> 16
              } while (H >>> 0 < O >>> 0)
              c[F >> 2] = O
              N = (N + 1) | 0
            } while ((N | 0) != (M | 0))
          }
          I = (E + w) | 0
        }
        c[u >> 2] = I
        f = (f + 1) | 0
      } while ((f | 0) != (D | 0))
    }
    D = (o & -16776961) | (p << 16) | 256
    a[e >> 0] = D
    a[(e + 1) >> 0] = D >> 8
    a[(e + 2) >> 0] = D >> 16
    a[(e + 3) >> 0] = D >> 24
    v = i
    K = j
    return v | 0
  }
  function ea(b, c, e, f, g) {
    b = b | 0
    c = c | 0
    e = e | 0
    f = f | 0
    g = g | 0
    var h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0,
      K = 0,
      L = 0,
      M = 0,
      N = 0,
      O = 0,
      P = 0,
      Q = 0,
      R = 0,
      S = 0,
      T = 0,
      U = 0,
      V = 0,
      W = 0,
      X = 0
    if (!f) {
      h = -72
      return h | 0
    }
    do
      if (f >>> 0 > 3) {
        i = (f + -4) | 0
        j = a[(e + (f + -1)) >> 0] | 0
        if (!((j << 24) >> 24)) {
          h = -1
          return h | 0
        }
        k = (e + i) | 0
        l = (8 - ((r((j & 255) | 0) | 0) ^ 31)) | 0
        if (f >>> 0 < 4294967177) {
          m =
            d[k >> 0] |
            (d[(k + 1) >> 0] << 8) |
            (d[(k + 2) >> 0] << 16) |
            (d[(k + 3) >> 0] << 24)
          n = l
          o = i
        } else {
          h = f
          return h | 0
        }
      } else {
        i = d[e >> 0] | 0
        switch (f | 0) {
          case 2: {
            p = i
            q = 6
            break
          }
          case 3: {
            p = (d[(e + 2) >> 0] << 16) | i
            q = 6
            break
          }
          default:
            s = i
        }
        if ((q | 0) == 6) s = ((d[(e + 1) >> 0] << 8) + p) | 0
        i = a[(e + (f + -1)) >> 0] | 0
        if (!((i << 24) >> 24)) {
          h = -20
          return h | 0
        } else {
          m = s
          n = (40 - (f << 3) - ((r((i & 255) | 0) | 0) ^ 31)) | 0
          o = 0
          break
        }
      }
    while (0)
    f = (b + c) | 0
    s = (g + 4) | 0
    p =
      (d[g >> 0] |
        (d[(g + 1) >> 0] << 8) |
        (d[(g + 2) >> 0] << 16) |
        (d[(g + 3) >> 0] << 24)) >>>
      16
    a: do
      if (n >>> 0 > 32) {
        t = m
        u = n
        v = (e + o) | 0
        w = b
        q = 19
      } else {
        g = (f + -3) | 0
        i = (0 - p) & 31
        l = m
        k = n
        j = o
        x = b
        while (1) {
          y = (e + j) | 0
          if ((j | 0) < 4) {
            if (!j) {
              z = l
              A = k
              B = 0
              break
            }
            C = k >>> 3
            D = ((y + (0 - C)) | 0) >>> 0 < e >>> 0
            y = D ? j : C
            E = y
            F = D & 1
            G = (k - (y << 3)) | 0
          } else {
            E = k >>> 3
            F = 0
            G = k & 7
          }
          j = (j - E) | 0
          H = (e + j) | 0
          I =
            d[H >> 0] |
            (d[(H + 1) >> 0] << 8) |
            (d[(H + 2) >> 0] << 16) |
            (d[(H + 3) >> 0] << 24)
          if (!((x >>> 0 < g >>> 0) & ((F | 0) == 0))) {
            q = 18
            break
          }
          y = (I << (G & 31)) >>> i
          D = (s + (y << 2)) | 0
          C = d[D >> 0] | (d[(D + 1) >> 0] << 8)
          a[x >> 0] = C
          a[(x + 1) >> 0] = C >> 8
          C = (G + (d[(s + (y << 2) + 2) >> 0] | 0)) | 0
          D = (x + (d[(s + (y << 2) + 3) >> 0] | 0)) | 0
          y = (I << (C & 31)) >>> i
          J = (s + (y << 2)) | 0
          K = d[J >> 0] | (d[(J + 1) >> 0] << 8)
          a[D >> 0] = K
          a[(D + 1) >> 0] = K >> 8
          K = (C + (d[(s + (y << 2) + 2) >> 0] | 0)) | 0
          C = (D + (d[(s + (y << 2) + 3) >> 0] | 0)) | 0
          if (K >>> 0 > 32) {
            t = I
            u = K
            v = H
            w = C
            q = 19
            break a
          } else {
            l = I
            k = K
            x = C
          }
        }
        if ((q | 0) == 18)
          if (G >>> 0 > 32) {
            t = I
            u = G
            v = H
            w = x
            q = 19
            break
          } else {
            z = I
            A = G
            B = j
          }
        k = (f + -2) | 0
        l = z
        g = A
        C = B
        K = x
        while (1) {
          y = (e + C) | 0
          if ((C | 0) < 4) {
            if (!C) {
              L = k
              M = l
              N = g
              O = e
              P = K
              break a
            }
            D = g >>> 3
            J = ((y + (0 - D)) | 0) >>> 0 < e >>> 0
            y = J ? C : D
            Q = y
            R = J & 1
            S = (g - (y << 3)) | 0
          } else {
            Q = g >>> 3
            R = 0
            S = g & 7
          }
          C = (C - Q) | 0
          y = (e + C) | 0
          J =
            d[y >> 0] |
            (d[(y + 1) >> 0] << 8) |
            (d[(y + 2) >> 0] << 16) |
            (d[(y + 3) >> 0] << 24)
          if (!((K >>> 0 <= k >>> 0) & ((R | 0) == 0))) {
            L = k
            M = J
            N = S
            O = y
            P = K
            break a
          }
          D = (J << (S & 31)) >>> i
          T = (s + (D << 2)) | 0
          U = d[T >> 0] | (d[(T + 1) >> 0] << 8)
          a[K >> 0] = U
          a[(K + 1) >> 0] = U >> 8
          U = (S + (d[(s + (D << 2) + 2) >> 0] | 0)) | 0
          T = (K + (d[(s + (D << 2) + 3) >> 0] | 0)) | 0
          if (U >>> 0 > 32) {
            L = k
            M = J
            N = U
            O = y
            P = T
            break
          } else {
            l = J
            g = U
            K = T
          }
        }
      }
    while (0)
    if ((q | 0) == 19) {
      L = (f + -2) | 0
      M = t
      N = u
      O = v
      P = w
    }
    if (P >>> 0 > L >>> 0) {
      V = N
      W = P
    } else {
      w = (0 - p) & 31
      v = N
      N = P
      while (1) {
        P = (M << (v & 31)) >>> w
        u = (s + (P << 2)) | 0
        t = d[u >> 0] | (d[(u + 1) >> 0] << 8)
        a[N >> 0] = t
        a[(N + 1) >> 0] = t >> 8
        t = (v + (d[(s + (P << 2) + 2) >> 0] | 0)) | 0
        u = (N + (d[(s + (P << 2) + 3) >> 0] | 0)) | 0
        if (u >>> 0 > L >>> 0) {
          V = t
          W = u
          break
        } else {
          v = t
          N = u
        }
      }
    }
    do
      if (W >>> 0 < f >>> 0) {
        N = (M << (V & 31)) >>> ((0 - p) & 31)
        a[W >> 0] = a[(s + (N << 2)) >> 0] | 0
        if ((a[(s + (N << 2) + 3) >> 0] | 0) == 1) {
          X = (V + (d[(s + (N << 2) + 2) >> 0] | 0)) | 0
          break
        }
        if (V >>> 0 < 32) {
          v = (V + (d[(s + (N << 2) + 2) >> 0] | 0)) | 0
          X = v >>> 0 < 32 ? v : 32
        } else X = V
      } else X = V
    while (0)
    h = ((O | 0) != (e | 0)) | ((X | 0) != 32) ? -20 : c
    return h | 0
  }
  function fa(b, c, e, f, g) {
    b = b | 0
    c = c | 0
    e = e | 0
    f = f | 0
    g = g | 0
    var h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0,
      K = 0,
      L = 0,
      M = 0,
      N = 0,
      O = 0,
      P = 0,
      Q = 0,
      R = 0,
      S = 0,
      T = 0,
      U = 0,
      V = 0,
      W = 0,
      X = 0,
      Y = 0,
      Z = 0,
      _ = 0,
      $ = 0,
      aa = 0,
      ba = 0,
      ca = 0,
      da = 0,
      ea = 0,
      fa = 0,
      ga = 0,
      ha = 0,
      ia = 0,
      ja = 0,
      ka = 0,
      la = 0,
      ma = 0,
      na = 0,
      oa = 0,
      pa = 0,
      qa = 0,
      ra = 0,
      sa = 0,
      ta = 0,
      ua = 0,
      va = 0,
      wa = 0,
      xa = 0,
      ya = 0,
      za = 0,
      Aa = 0,
      Ba = 0,
      Ca = 0,
      Da = 0,
      Ea = 0,
      Fa = 0,
      Ga = 0,
      Ha = 0,
      Ia = 0,
      Ja = 0,
      Ka = 0,
      La = 0,
      Ma = 0,
      Na = 0,
      Oa = 0,
      Pa = 0,
      Qa = 0,
      Ra = 0,
      Sa = 0,
      Ta = 0,
      Ua = 0,
      Va = 0,
      Wa = 0,
      Xa = 0,
      Ya = 0,
      Za = 0,
      _a = 0,
      $a = 0,
      ab = 0,
      bb = 0,
      cb = 0,
      db = 0,
      eb = 0,
      fb = 0,
      gb = 0,
      hb = 0,
      ib = 0,
      jb = 0,
      kb = 0,
      lb = 0,
      mb = 0,
      nb = 0,
      ob = 0,
      pb = 0,
      qb = 0,
      rb = 0,
      sb = 0,
      tb = 0,
      ub = 0,
      vb = 0,
      wb = 0,
      xb = 0,
      yb = 0,
      zb = 0,
      Ab = 0,
      Bb = 0,
      Cb = 0,
      Db = 0,
      Eb = 0,
      Fb = 0,
      Gb = 0,
      Hb = 0,
      Ib = 0,
      Jb = 0,
      Kb = 0,
      Lb = 0,
      Mb = 0,
      Nb = 0,
      Ob = 0,
      Pb = 0,
      Qb = 0,
      Rb = 0,
      Sb = 0,
      Tb = 0,
      Ub = 0,
      Vb = 0,
      Wb = 0,
      Xb = 0,
      Yb = 0,
      Zb = 0,
      _b = 0,
      $b = 0,
      ac = 0,
      bc = 0,
      cc = 0,
      dc = 0,
      ec = 0,
      fc = 0,
      gc = 0,
      hc = 0,
      ic = 0,
      jc = 0,
      kc = 0,
      lc = 0,
      mc = 0,
      nc = 0,
      oc = 0,
      pc = 0,
      qc = 0,
      rc = 0,
      sc = 0,
      tc = 0,
      uc = 0,
      vc = 0,
      wc = 0,
      xc = 0,
      yc = 0,
      zc = 0,
      Ac = 0
    if (f >>> 0 < 10) {
      h = -20
      return h | 0
    }
    i = (b + c) | 0
    j = (g + 4) | 0
    k = d[e >> 0] | (d[(e + 1) >> 0] << 8)
    l = k & 65535
    m = (e + 2) | 0
    n = d[m >> 0] | (d[(m + 1) >> 0] << 8)
    m = n & 65535
    o = (e + 4) | 0
    p = d[o >> 0] | (d[(o + 1) >> 0] << 8)
    o = p & 65535
    q = (f + -6 - l - m - o) | 0
    s = (e + 6) | 0
    t = (e + (l + 6)) | 0
    u = (t + m) | 0
    v = (u + o) | 0
    w = ((c + 3) | 0) >>> 2
    x = (b + w) | 0
    y = (x + w) | 0
    z = (y + w) | 0
    w =
      (d[g >> 0] |
        (d[(g + 1) >> 0] << 8) |
        (d[(g + 2) >> 0] << 16) |
        (d[(g + 3) >> 0] << 24)) >>>
      16
    if (q >>> 0 > f >>> 0) {
      h = -20
      return h | 0
    }
    if (!((k << 16) >> 16)) {
      h = -72
      return h | 0
    }
    do
      if ((k & 65535) > 3) {
        f = (l + 2) | 0
        g = (e + f) | 0
        A = a[(s + (l + -1)) >> 0] | 0
        B = (8 - ((r((A & 255) | 0) | 0) ^ 31)) | 0
        if (!((A << 24) >> 24)) {
          h = -1
          return h | 0
        } else {
          C =
            d[g >> 0] |
            (d[(g + 1) >> 0] << 8) |
            (d[(g + 2) >> 0] << 16) |
            (d[(g + 3) >> 0] << 24)
          D = B
          E = f
        }
      } else {
        f = d[s >> 0] | 0
        switch ((k << 16) >> 16) {
          case 2: {
            F = f
            G = 8
            break
          }
          case 3: {
            F = (d[(e + 8) >> 0] << 16) | f
            G = 8
            break
          }
          default:
            H = f
        }
        if ((G | 0) == 8) H = ((d[(e + 7) >> 0] << 8) + F) | 0
        f = a[(s + (l + -1)) >> 0] | 0
        if (!((f << 24) >> 24)) {
          h = -20
          return h | 0
        } else {
          C = H
          D = (40 - (l << 3) - ((r((f & 255) | 0) | 0) ^ 31)) | 0
          E = 6
          break
        }
      }
    while (0)
    if (!((n << 16) >> 16)) {
      h = -72
      return h | 0
    }
    do
      if ((n & 65535) > 3) {
        l = (m + -4) | 0
        H = (t + l) | 0
        s = a[(t + (m + -1)) >> 0] | 0
        F = (8 - ((r((s & 255) | 0) | 0) ^ 31)) | 0
        if (!((s << 24) >> 24)) {
          h = -1
          return h | 0
        } else {
          I =
            d[H >> 0] |
            (d[(H + 1) >> 0] << 8) |
            (d[(H + 2) >> 0] << 16) |
            (d[(H + 3) >> 0] << 24)
          J = F
          K = l
        }
      } else {
        l = d[t >> 0] | 0
        switch ((n << 16) >> 16) {
          case 2: {
            L = l
            G = 16
            break
          }
          case 3: {
            L = (d[(t + 2) >> 0] << 16) | l
            G = 16
            break
          }
          default:
            M = l
        }
        if ((G | 0) == 16) M = ((d[(t + 1) >> 0] << 8) + L) | 0
        l = a[(t + (m + -1)) >> 0] | 0
        if (!((l << 24) >> 24)) {
          h = -20
          return h | 0
        } else {
          I = M
          J = (40 - (m << 3) - ((r((l & 255) | 0) | 0) ^ 31)) | 0
          K = 0
          break
        }
      }
    while (0)
    m = (t + K) | 0
    if (!((p << 16) >> 16)) {
      h = -72
      return h | 0
    }
    do
      if ((p & 65535) > 3) {
        M = (o + -4) | 0
        L = (u + M) | 0
        n = a[(u + (o + -1)) >> 0] | 0
        l = (8 - ((r((n & 255) | 0) | 0) ^ 31)) | 0
        if (!((n << 24) >> 24)) {
          h = -1
          return h | 0
        } else {
          N =
            d[L >> 0] |
            (d[(L + 1) >> 0] << 8) |
            (d[(L + 2) >> 0] << 16) |
            (d[(L + 3) >> 0] << 24)
          O = l
          P = M
        }
      } else {
        M = d[u >> 0] | 0
        switch ((p << 16) >> 16) {
          case 2: {
            Q = M
            G = 24
            break
          }
          case 3: {
            Q = (d[(u + 2) >> 0] << 16) | M
            G = 24
            break
          }
          default:
            R = M
        }
        if ((G | 0) == 24) R = ((d[(u + 1) >> 0] << 8) + Q) | 0
        M = a[(u + (o + -1)) >> 0] | 0
        if (!((M << 24) >> 24)) {
          h = -20
          return h | 0
        } else {
          N = R
          O = (40 - (o << 3) - ((r((M & 255) | 0) | 0) ^ 31)) | 0
          P = 0
          break
        }
      }
    while (0)
    o = (u + P) | 0
    if (!q) {
      h = -72
      return h | 0
    }
    do
      if (q >>> 0 > 3) {
        R = (q + -4) | 0
        Q = a[(v + (q + -1)) >> 0] | 0
        if (!((Q << 24) >> 24)) {
          h = -1
          return h | 0
        }
        p = (v + R) | 0
        M = (8 - ((r((Q & 255) | 0) | 0) ^ 31)) | 0
        if (q >>> 0 < 4294967177) {
          S =
            d[p >> 0] |
            (d[(p + 1) >> 0] << 8) |
            (d[(p + 2) >> 0] << 16) |
            (d[(p + 3) >> 0] << 24)
          T = M
          U = R
        } else {
          h = q
          return h | 0
        }
      } else {
        R = d[v >> 0] | 0
        switch (q | 0) {
          case 2: {
            V = R
            G = 32
            break
          }
          case 3: {
            V = (d[(v + 2) >> 0] << 16) | R
            G = 32
            break
          }
          default:
            W = R
        }
        if ((G | 0) == 32) W = ((d[(v + 1) >> 0] << 8) + V) | 0
        R = a[(v + (q + -1)) >> 0] | 0
        if (!((R << 24) >> 24)) {
          h = -20
          return h | 0
        } else {
          S = W
          T = (40 - (q << 3) - ((r((R & 255) | 0) | 0) ^ 31)) | 0
          U = 0
          break
        }
      }
    while (0)
    q = (v + U) | 0
    do
      if (D >>> 0 <= 32) {
        if ((E | 0) >= 10) {
          W = (E - (D >>> 3)) | 0
          V = (e + W) | 0
          X =
            d[V >> 0] |
            (d[(V + 1) >> 0] << 8) |
            (d[(V + 2) >> 0] << 16) |
            (d[(V + 3) >> 0] << 24)
          Y = D & 7
          Z = W
          _ = 0
          break
        }
        if ((E | 0) == 6) {
          X = C
          Y = D
          Z = 6
          _ = D >>> 0 < 32 ? 1 : 2
          break
        } else {
          W = D >>> 3
          V = ((E - W) | 0) < 6
          R = V ? (E + -6) | 0 : W
          W = (E - R) | 0
          M = (e + W) | 0
          X =
            d[M >> 0] |
            (d[(M + 1) >> 0] << 8) |
            (d[(M + 2) >> 0] << 16) |
            (d[(M + 3) >> 0] << 24)
          Y = (D - (R << 3)) | 0
          Z = W
          _ = V & 1
          break
        }
      } else {
        X = C
        Y = D
        Z = E
        _ = 3
      }
    while (0)
    do
      if (J >>> 0 <= 32) {
        if ((K | 0) >= 4) {
          E = (K - (J >>> 3)) | 0
          D = (t + E) | 0
          $ =
            d[D >> 0] |
            (d[(D + 1) >> 0] << 8) |
            (d[(D + 2) >> 0] << 16) |
            (d[(D + 3) >> 0] << 24)
          aa = J & 7
          ba = E
          ca = 0
          break
        }
        if (!K) {
          $ = I
          aa = J
          ba = 0
          ca = J >>> 0 < 32 ? 1 : 2
          break
        } else {
          E = J >>> 3
          D = ((m + (0 - E)) | 0) >>> 0 < t >>> 0
          C = D ? K : E
          E = (K - C) | 0
          V = (t + E) | 0
          $ =
            d[V >> 0] |
            (d[(V + 1) >> 0] << 8) |
            (d[(V + 2) >> 0] << 16) |
            (d[(V + 3) >> 0] << 24)
          aa = (J - (C << 3)) | 0
          ba = E
          ca = D & 1
          break
        }
      } else {
        $ = I
        aa = J
        ba = K
        ca = 3
      }
    while (0)
    K = ca | _
    do
      if (O >>> 0 <= 32) {
        if ((P | 0) >= 4) {
          _ = (P - (O >>> 3)) | 0
          ca = (u + _) | 0
          da =
            d[ca >> 0] |
            (d[(ca + 1) >> 0] << 8) |
            (d[(ca + 2) >> 0] << 16) |
            (d[(ca + 3) >> 0] << 24)
          ea = O & 7
          fa = _
          ga = 0
          break
        }
        if (!P) {
          da = N
          ea = O
          fa = 0
          ga = O >>> 0 < 32 ? 1 : 2
          break
        } else {
          _ = O >>> 3
          ca = ((o + (0 - _)) | 0) >>> 0 < u >>> 0
          J = ca ? P : _
          _ = (P - J) | 0
          I = (u + _) | 0
          da =
            d[I >> 0] |
            (d[(I + 1) >> 0] << 8) |
            (d[(I + 2) >> 0] << 16) |
            (d[(I + 3) >> 0] << 24)
          ea = (O - (J << 3)) | 0
          fa = _
          ga = ca & 1
          break
        }
      } else {
        da = N
        ea = O
        fa = P
        ga = 3
      }
    while (0)
    P = K | ga
    do
      if (T >>> 0 <= 32) {
        if ((U | 0) >= 4) {
          ga = (U - (T >>> 3)) | 0
          K = (v + ga) | 0
          ha =
            d[K >> 0] |
            (d[(K + 1) >> 0] << 8) |
            (d[(K + 2) >> 0] << 16) |
            (d[(K + 3) >> 0] << 24)
          ia = T & 7
          ja = ga
          ka = 0
          break
        }
        if (!U) {
          ha = S
          ia = T
          ja = 0
          ka = T >>> 0 < 32 ? 1 : 2
          break
        } else {
          ga = T >>> 3
          K = ((q + (0 - ga)) | 0) >>> 0 < v >>> 0
          O = K ? U : ga
          ga = (U - O) | 0
          N = (v + ga) | 0
          ha =
            d[N >> 0] |
            (d[(N + 1) >> 0] << 8) |
            (d[(N + 2) >> 0] << 16) |
            (d[(N + 3) >> 0] << 24)
          ia = (T - (O << 3)) | 0
          ja = ga
          ka = K & 1
          break
        }
      } else {
        ha = S
        ia = T
        ja = U
        ka = 3
      }
    while (0)
    U = (i + -3) | 0
    if ((z >>> 0 < U >>> 0) & ((P | ka | 0) == 0)) {
      ka = (0 - w) & 31
      P = X
      T = Y
      S = Z
      q = $
      K = aa
      ga = ba
      O = da
      N = ea
      o = fa
      ca = ha
      _ = ia
      J = ja
      I = b
      m = x
      D = y
      E = z
      while (1) {
        C = (P << (T & 31)) >>> ka
        V = (j + (C << 2)) | 0
        W = d[V >> 0] | (d[(V + 1) >> 0] << 8)
        a[I >> 0] = W
        a[(I + 1) >> 0] = W >> 8
        W = (T + (d[(j + (C << 2) + 2) >> 0] | 0)) | 0
        V = (I + (d[(j + (C << 2) + 3) >> 0] | 0)) | 0
        C = (q << (K & 31)) >>> ka
        R = (j + (C << 2)) | 0
        M = d[R >> 0] | (d[(R + 1) >> 0] << 8)
        a[m >> 0] = M
        a[(m + 1) >> 0] = M >> 8
        M = (K + (d[(j + (C << 2) + 2) >> 0] | 0)) | 0
        R = (m + (d[(j + (C << 2) + 3) >> 0] | 0)) | 0
        C = (O << (N & 31)) >>> ka
        p = (j + (C << 2)) | 0
        Q = d[p >> 0] | (d[(p + 1) >> 0] << 8)
        a[D >> 0] = Q
        a[(D + 1) >> 0] = Q >> 8
        Q = (N + (d[(j + (C << 2) + 2) >> 0] | 0)) | 0
        p = (D + (d[(j + (C << 2) + 3) >> 0] | 0)) | 0
        C = (ca << (_ & 31)) >>> ka
        l = (j + (C << 2)) | 0
        L = d[l >> 0] | (d[(l + 1) >> 0] << 8)
        a[E >> 0] = L
        a[(E + 1) >> 0] = L >> 8
        L = (_ + (d[(j + (C << 2) + 2) >> 0] | 0)) | 0
        l = (E + (d[(j + (C << 2) + 3) >> 0] | 0)) | 0
        C = (P << (W & 31)) >>> ka
        n = (j + (C << 2)) | 0
        F = d[n >> 0] | (d[(n + 1) >> 0] << 8)
        a[V >> 0] = F
        a[(V + 1) >> 0] = F >> 8
        F = (W + (d[(j + (C << 2) + 2) >> 0] | 0)) | 0
        W = (V + (d[(j + (C << 2) + 3) >> 0] | 0)) | 0
        C = (q << (M & 31)) >>> ka
        V = (j + (C << 2)) | 0
        n = d[V >> 0] | (d[(V + 1) >> 0] << 8)
        a[R >> 0] = n
        a[(R + 1) >> 0] = n >> 8
        n = (M + (d[(j + (C << 2) + 2) >> 0] | 0)) | 0
        M = (R + (d[(j + (C << 2) + 3) >> 0] | 0)) | 0
        C = (O << (Q & 31)) >>> ka
        R = (j + (C << 2)) | 0
        V = d[R >> 0] | (d[(R + 1) >> 0] << 8)
        a[p >> 0] = V
        a[(p + 1) >> 0] = V >> 8
        V = (Q + (d[(j + (C << 2) + 2) >> 0] | 0)) | 0
        Q = (p + (d[(j + (C << 2) + 3) >> 0] | 0)) | 0
        C = (ca << (L & 31)) >>> ka
        p = (j + (C << 2)) | 0
        R = d[p >> 0] | (d[(p + 1) >> 0] << 8)
        a[l >> 0] = R
        a[(l + 1) >> 0] = R >> 8
        R = (L + (d[(j + (C << 2) + 2) >> 0] | 0)) | 0
        L = (l + (d[(j + (C << 2) + 3) >> 0] | 0)) | 0
        do
          if (F >>> 0 <= 32) {
            if ((S | 0) >= 10) {
              C = (S - (F >>> 3)) | 0
              l = (e + C) | 0
              la =
                d[l >> 0] |
                (d[(l + 1) >> 0] << 8) |
                (d[(l + 2) >> 0] << 16) |
                (d[(l + 3) >> 0] << 24)
              ma = F & 7
              na = C
              oa = 0
              break
            }
            if ((S | 0) == 6) {
              la = P
              ma = F
              na = 6
              oa = F >>> 0 < 32 ? 1 : 2
              break
            } else {
              C = F >>> 3
              l = ((S - C) | 0) < 6
              p = l ? (S + -6) | 0 : C
              C = (S - p) | 0
              H = (e + C) | 0
              la =
                d[H >> 0] |
                (d[(H + 1) >> 0] << 8) |
                (d[(H + 2) >> 0] << 16) |
                (d[(H + 3) >> 0] << 24)
              ma = (F - (p << 3)) | 0
              na = C
              oa = l & 1
              break
            }
          } else {
            la = P
            ma = F
            na = S
            oa = 3
          }
        while (0)
        do
          if (n >>> 0 <= 32) {
            if ((ga | 0) >= 4) {
              F = (ga - (n >>> 3)) | 0
              l = (t + F) | 0
              pa =
                d[l >> 0] |
                (d[(l + 1) >> 0] << 8) |
                (d[(l + 2) >> 0] << 16) |
                (d[(l + 3) >> 0] << 24)
              qa = n & 7
              ra = F
              sa = 0
              break
            }
            if (!ga) {
              pa = q
              qa = n
              ra = 0
              sa = n >>> 0 < 32 ? 1 : 2
              break
            } else {
              F = n >>> 3
              l = ((0 - F + (t + ga)) | 0) >>> 0 < t >>> 0
              C = l ? ga : F
              F = (ga - C) | 0
              p = (t + F) | 0
              pa =
                d[p >> 0] |
                (d[(p + 1) >> 0] << 8) |
                (d[(p + 2) >> 0] << 16) |
                (d[(p + 3) >> 0] << 24)
              qa = (n - (C << 3)) | 0
              ra = F
              sa = l & 1
              break
            }
          } else {
            pa = q
            qa = n
            ra = ga
            sa = 3
          }
        while (0)
        n = sa | oa
        do
          if (V >>> 0 <= 32) {
            if ((o | 0) >= 4) {
              l = (o - (V >>> 3)) | 0
              F = (u + l) | 0
              ta =
                d[F >> 0] |
                (d[(F + 1) >> 0] << 8) |
                (d[(F + 2) >> 0] << 16) |
                (d[(F + 3) >> 0] << 24)
              ua = V & 7
              va = l
              wa = 0
              break
            }
            if (!o) {
              ta = O
              ua = V
              va = 0
              wa = V >>> 0 < 32 ? 1 : 2
              break
            } else {
              l = V >>> 3
              F = ((0 - l + (u + o)) | 0) >>> 0 < u >>> 0
              C = F ? o : l
              l = (o - C) | 0
              p = (u + l) | 0
              ta =
                d[p >> 0] |
                (d[(p + 1) >> 0] << 8) |
                (d[(p + 2) >> 0] << 16) |
                (d[(p + 3) >> 0] << 24)
              ua = (V - (C << 3)) | 0
              va = l
              wa = F & 1
              break
            }
          } else {
            ta = O
            ua = V
            va = o
            wa = 3
          }
        while (0)
        V = n | wa
        do
          if (R >>> 0 <= 32) {
            if ((J | 0) >= 4) {
              F = (J - (R >>> 3)) | 0
              l = (v + F) | 0
              xa =
                d[l >> 0] |
                (d[(l + 1) >> 0] << 8) |
                (d[(l + 2) >> 0] << 16) |
                (d[(l + 3) >> 0] << 24)
              ya = R & 7
              za = F
              Aa = 0
              break
            }
            if (!J) {
              xa = ca
              ya = R
              za = 0
              Aa = R >>> 0 < 32 ? 1 : 2
              break
            } else {
              F = R >>> 3
              l = ((0 - F + (v + J)) | 0) >>> 0 < v >>> 0
              C = l ? J : F
              F = (J - C) | 0
              p = (v + F) | 0
              xa =
                d[p >> 0] |
                (d[(p + 1) >> 0] << 8) |
                (d[(p + 2) >> 0] << 16) |
                (d[(p + 3) >> 0] << 24)
              ya = (R - (C << 3)) | 0
              za = F
              Aa = l & 1
              break
            }
          } else {
            xa = ca
            ya = R
            za = J
            Aa = 3
          }
        while (0)
        if ((L >>> 0 < U >>> 0) & ((V | Aa | 0) == 0)) {
          P = la
          T = ma
          S = na
          q = pa
          K = qa
          ga = ra
          O = ta
          N = ua
          o = va
          ca = xa
          _ = ya
          J = za
          I = W
          m = M
          D = Q
          E = L
        } else {
          Ba = la
          Ca = ma
          Da = na
          Ea = pa
          Fa = qa
          Ga = ra
          Ha = ta
          Ia = ua
          Ja = va
          Ka = xa
          La = ya
          Ma = za
          Na = W
          Oa = M
          Pa = Q
          Qa = L
          break
        }
      }
    } else {
      Ba = X
      Ca = Y
      Da = Z
      Ea = $
      Fa = aa
      Ga = ba
      Ha = da
      Ia = ea
      Ja = fa
      Ka = ha
      La = ia
      Ma = ja
      Na = b
      Oa = x
      Pa = y
      Qa = z
    }
    b = (t + Ga) | 0
    ja = (u + Ja) | 0
    ia = (v + Ma) | 0
    if ((Pa >>> 0 > z >>> 0) | ((Oa >>> 0 > y >>> 0) | (Na >>> 0 > x >>> 0))) {
      h = -20
      return h | 0
    }
    a: do
      if (Ca >>> 0 > 32) {
        Ra = Ba
        Sa = Ca
        Ta = Da
        Ua = Na
        G = 97
      } else {
        ha = (x + -3) | 0
        fa = (0 - w) & 31
        ea = Ba
        da = Ca
        ba = Da
        aa = Na
        while (1) {
          if ((ba | 0) < 10) {
            if ((ba | 0) == 6) {
              Va = ea
              Wa = da
              Xa = 6
              break
            }
            $ = da >>> 3
            Z = ((ba - $) | 0) < 6
            Y = Z ? (ba + -6) | 0 : $
            Ya = Y
            Za = Z & 1
            _a = (da - (Y << 3)) | 0
          } else {
            Ya = da >>> 3
            Za = 0
            _a = da & 7
          }
          $a = (ba - Ya) | 0
          Y = (e + $a) | 0
          ab =
            d[Y >> 0] |
            (d[(Y + 1) >> 0] << 8) |
            (d[(Y + 2) >> 0] << 16) |
            (d[(Y + 3) >> 0] << 24)
          if (!((aa >>> 0 < ha >>> 0) & ((Za | 0) == 0))) {
            G = 96
            break
          }
          Y = (ab << (_a & 31)) >>> fa
          Z = (j + (Y << 2)) | 0
          $ = d[Z >> 0] | (d[(Z + 1) >> 0] << 8)
          a[aa >> 0] = $
          a[(aa + 1) >> 0] = $ >> 8
          $ = (_a + (d[(j + (Y << 2) + 2) >> 0] | 0)) | 0
          Z = (aa + (d[(j + (Y << 2) + 3) >> 0] | 0)) | 0
          Y = (ab << ($ & 31)) >>> fa
          X = (j + (Y << 2)) | 0
          za = d[X >> 0] | (d[(X + 1) >> 0] << 8)
          a[Z >> 0] = za
          a[(Z + 1) >> 0] = za >> 8
          za = ($ + (d[(j + (Y << 2) + 2) >> 0] | 0)) | 0
          $ = (Z + (d[(j + (Y << 2) + 3) >> 0] | 0)) | 0
          if (za >>> 0 > 32) {
            Ra = ab
            Sa = za
            Ta = $a
            Ua = $
            G = 97
            break a
          } else {
            ea = ab
            da = za
            ba = $a
            aa = $
          }
        }
        if ((G | 0) == 96)
          if (_a >>> 0 > 32) {
            Ra = ab
            Sa = _a
            Ta = $a
            Ua = aa
            G = 97
            break
          } else {
            Va = ab
            Wa = _a
            Xa = $a
          }
        ba = (x + -2) | 0
        da = Va
        ea = Wa
        ha = Xa
        L = aa
        while (1) {
          if ((ha | 0) < 10) {
            if ((ha | 0) == 6) {
              bb = ba
              cb = da
              db = ea
              eb = 6
              fb = L
              break a
            }
            Q = ea >>> 3
            M = ((ha - Q) | 0) < 6
            W = M ? (ha + -6) | 0 : Q
            gb = W
            hb = M & 1
            ib = (ea - (W << 3)) | 0
          } else {
            gb = ea >>> 3
            hb = 0
            ib = ea & 7
          }
          W = (ha - gb) | 0
          M = (e + W) | 0
          Q =
            d[M >> 0] |
            (d[(M + 1) >> 0] << 8) |
            (d[(M + 2) >> 0] << 16) |
            (d[(M + 3) >> 0] << 24)
          if (!((L >>> 0 <= ba >>> 0) & ((hb | 0) == 0))) {
            bb = ba
            cb = Q
            db = ib
            eb = W
            fb = L
            break a
          }
          M = (Q << (ib & 31)) >>> fa
          V = (j + (M << 2)) | 0
          $ = d[V >> 0] | (d[(V + 1) >> 0] << 8)
          a[L >> 0] = $
          a[(L + 1) >> 0] = $ >> 8
          $ = (ib + (d[(j + (M << 2) + 2) >> 0] | 0)) | 0
          V = (L + (d[(j + (M << 2) + 3) >> 0] | 0)) | 0
          if ($ >>> 0 > 32) {
            bb = ba
            cb = Q
            db = $
            eb = W
            fb = V
            break
          } else {
            da = Q
            ea = $
            ha = W
            L = V
          }
        }
      }
    while (0)
    if ((G | 0) == 97) {
      bb = (x + -2) | 0
      cb = Ra
      db = Sa
      eb = Ta
      fb = Ua
    }
    if (fb >>> 0 > bb >>> 0) {
      jb = db
      kb = fb
    } else {
      Ua = (0 - w) & 31
      Ta = db
      db = fb
      while (1) {
        fb = (cb << (Ta & 31)) >>> Ua
        Sa = (j + (fb << 2)) | 0
        Ra = d[Sa >> 0] | (d[(Sa + 1) >> 0] << 8)
        a[db >> 0] = Ra
        a[(db + 1) >> 0] = Ra >> 8
        Ra = (Ta + (d[(j + (fb << 2) + 2) >> 0] | 0)) | 0
        Sa = (db + (d[(j + (fb << 2) + 3) >> 0] | 0)) | 0
        if (Sa >>> 0 > bb >>> 0) {
          jb = Ra
          kb = Sa
          break
        } else {
          Ta = Ra
          db = Sa
        }
      }
    }
    do
      if (kb >>> 0 < x >>> 0) {
        db = (cb << (jb & 31)) >>> ((0 - w) & 31)
        a[kb >> 0] = a[(j + (db << 2)) >> 0] | 0
        if ((a[(j + (db << 2) + 3) >> 0] | 0) == 1) {
          lb = (jb + (d[(j + (db << 2) + 2) >> 0] | 0)) | 0
          break
        }
        if (jb >>> 0 >= 32) {
          lb = jb
          break
        }
        Ta = (jb + (d[(j + (db << 2) + 2) >> 0] | 0)) | 0
        lb = Ta >>> 0 < 32 ? Ta : 32
      } else lb = jb
    while (0)
    b: do
      if (Fa >>> 0 > 32) {
        mb = Ea
        nb = Fa
        ob = b
        pb = Oa
        G = 122
      } else {
        jb = (y + -3) | 0
        kb = (0 - w) & 31
        cb = Ea
        x = Fa
        Ta = Ga
        db = Oa
        while (1) {
          bb = (t + Ta) | 0
          if ((Ta | 0) < 4) {
            if (!Ta) {
              qb = cb
              rb = x
              sb = 0
              break
            }
            Ua = x >>> 3
            Sa = ((bb + (0 - Ua)) | 0) >>> 0 < t >>> 0
            bb = Sa ? Ta : Ua
            tb = bb
            ub = Sa & 1
            vb = (x - (bb << 3)) | 0
          } else {
            tb = x >>> 3
            ub = 0
            vb = x & 7
          }
          Ta = (Ta - tb) | 0
          wb = (t + Ta) | 0
          xb =
            d[wb >> 0] |
            (d[(wb + 1) >> 0] << 8) |
            (d[(wb + 2) >> 0] << 16) |
            (d[(wb + 3) >> 0] << 24)
          if (!((db >>> 0 < jb >>> 0) & ((ub | 0) == 0))) {
            G = 121
            break
          }
          bb = (xb << (vb & 31)) >>> kb
          Sa = (j + (bb << 2)) | 0
          Ua = d[Sa >> 0] | (d[(Sa + 1) >> 0] << 8)
          a[db >> 0] = Ua
          a[(db + 1) >> 0] = Ua >> 8
          Ua = (vb + (d[(j + (bb << 2) + 2) >> 0] | 0)) | 0
          Sa = (db + (d[(j + (bb << 2) + 3) >> 0] | 0)) | 0
          bb = (xb << (Ua & 31)) >>> kb
          Ra = (j + (bb << 2)) | 0
          fb = d[Ra >> 0] | (d[(Ra + 1) >> 0] << 8)
          a[Sa >> 0] = fb
          a[(Sa + 1) >> 0] = fb >> 8
          fb = (Ua + (d[(j + (bb << 2) + 2) >> 0] | 0)) | 0
          Ua = (Sa + (d[(j + (bb << 2) + 3) >> 0] | 0)) | 0
          if (fb >>> 0 > 32) {
            mb = xb
            nb = fb
            ob = wb
            pb = Ua
            G = 122
            break b
          } else {
            cb = xb
            x = fb
            db = Ua
          }
        }
        if ((G | 0) == 121)
          if (vb >>> 0 > 32) {
            mb = xb
            nb = vb
            ob = wb
            pb = db
            G = 122
            break
          } else {
            qb = xb
            rb = vb
            sb = Ta
          }
        x = (y + -2) | 0
        cb = qb
        jb = rb
        Ua = sb
        fb = db
        while (1) {
          bb = (t + Ua) | 0
          if ((Ua | 0) < 4) {
            if (!Ua) {
              yb = x
              zb = cb
              Ab = jb
              Bb = t
              Cb = fb
              break b
            }
            Sa = jb >>> 3
            Ra = ((bb + (0 - Sa)) | 0) >>> 0 < t >>> 0
            bb = Ra ? Ua : Sa
            Db = bb
            Eb = Ra & 1
            Fb = (jb - (bb << 3)) | 0
          } else {
            Db = jb >>> 3
            Eb = 0
            Fb = jb & 7
          }
          Ua = (Ua - Db) | 0
          bb = (t + Ua) | 0
          Ra =
            d[bb >> 0] |
            (d[(bb + 1) >> 0] << 8) |
            (d[(bb + 2) >> 0] << 16) |
            (d[(bb + 3) >> 0] << 24)
          if (!((fb >>> 0 <= x >>> 0) & ((Eb | 0) == 0))) {
            yb = x
            zb = Ra
            Ab = Fb
            Bb = bb
            Cb = fb
            break b
          }
          Sa = (Ra << (Fb & 31)) >>> kb
          ib = (j + (Sa << 2)) | 0
          hb = d[ib >> 0] | (d[(ib + 1) >> 0] << 8)
          a[fb >> 0] = hb
          a[(fb + 1) >> 0] = hb >> 8
          hb = (Fb + (d[(j + (Sa << 2) + 2) >> 0] | 0)) | 0
          ib = (fb + (d[(j + (Sa << 2) + 3) >> 0] | 0)) | 0
          if (hb >>> 0 > 32) {
            yb = x
            zb = Ra
            Ab = hb
            Bb = bb
            Cb = ib
            break
          } else {
            cb = Ra
            jb = hb
            fb = ib
          }
        }
      }
    while (0)
    if ((G | 0) == 122) {
      yb = (y + -2) | 0
      zb = mb
      Ab = nb
      Bb = ob
      Cb = pb
    }
    if (Cb >>> 0 > yb >>> 0) {
      Gb = Ab
      Hb = Cb
    } else {
      pb = (0 - w) & 31
      ob = Ab
      Ab = Cb
      while (1) {
        Cb = (zb << (ob & 31)) >>> pb
        nb = (j + (Cb << 2)) | 0
        mb = d[nb >> 0] | (d[(nb + 1) >> 0] << 8)
        a[Ab >> 0] = mb
        a[(Ab + 1) >> 0] = mb >> 8
        mb = (ob + (d[(j + (Cb << 2) + 2) >> 0] | 0)) | 0
        nb = (Ab + (d[(j + (Cb << 2) + 3) >> 0] | 0)) | 0
        if (nb >>> 0 > yb >>> 0) {
          Gb = mb
          Hb = nb
          break
        } else {
          ob = mb
          Ab = nb
        }
      }
    }
    do
      if (Hb >>> 0 < y >>> 0) {
        Ab = (zb << (Gb & 31)) >>> ((0 - w) & 31)
        a[Hb >> 0] = a[(j + (Ab << 2)) >> 0] | 0
        if ((a[(j + (Ab << 2) + 3) >> 0] | 0) == 1) {
          Ib = (Gb + (d[(j + (Ab << 2) + 2) >> 0] | 0)) | 0
          break
        }
        if (Gb >>> 0 >= 32) {
          Ib = Gb
          break
        }
        ob = (Gb + (d[(j + (Ab << 2) + 2) >> 0] | 0)) | 0
        Ib = ob >>> 0 < 32 ? ob : 32
      } else Ib = Gb
    while (0)
    c: do
      if (Ia >>> 0 > 32) {
        Jb = Ha
        Kb = Ia
        Lb = ja
        Mb = Pa
        G = 147
      } else {
        Gb = (z + -3) | 0
        Hb = (0 - w) & 31
        zb = Ha
        y = Ia
        ob = Ja
        Ab = Pa
        while (1) {
          yb = (u + ob) | 0
          if ((ob | 0) < 4) {
            if (!ob) {
              Nb = zb
              Ob = y
              Pb = 0
              break
            }
            pb = y >>> 3
            nb = ((yb + (0 - pb)) | 0) >>> 0 < u >>> 0
            yb = nb ? ob : pb
            Qb = yb
            Rb = nb & 1
            Sb = (y - (yb << 3)) | 0
          } else {
            Qb = y >>> 3
            Rb = 0
            Sb = y & 7
          }
          ob = (ob - Qb) | 0
          Tb = (u + ob) | 0
          Ub =
            d[Tb >> 0] |
            (d[(Tb + 1) >> 0] << 8) |
            (d[(Tb + 2) >> 0] << 16) |
            (d[(Tb + 3) >> 0] << 24)
          if (!((Ab >>> 0 < Gb >>> 0) & ((Rb | 0) == 0))) {
            G = 146
            break
          }
          yb = (Ub << (Sb & 31)) >>> Hb
          nb = (j + (yb << 2)) | 0
          pb = d[nb >> 0] | (d[(nb + 1) >> 0] << 8)
          a[Ab >> 0] = pb
          a[(Ab + 1) >> 0] = pb >> 8
          pb = (Sb + (d[(j + (yb << 2) + 2) >> 0] | 0)) | 0
          nb = (Ab + (d[(j + (yb << 2) + 3) >> 0] | 0)) | 0
          yb = (Ub << (pb & 31)) >>> Hb
          mb = (j + (yb << 2)) | 0
          Cb = d[mb >> 0] | (d[(mb + 1) >> 0] << 8)
          a[nb >> 0] = Cb
          a[(nb + 1) >> 0] = Cb >> 8
          Cb = (pb + (d[(j + (yb << 2) + 2) >> 0] | 0)) | 0
          pb = (nb + (d[(j + (yb << 2) + 3) >> 0] | 0)) | 0
          if (Cb >>> 0 > 32) {
            Jb = Ub
            Kb = Cb
            Lb = Tb
            Mb = pb
            G = 147
            break c
          } else {
            zb = Ub
            y = Cb
            Ab = pb
          }
        }
        if ((G | 0) == 146)
          if (Sb >>> 0 > 32) {
            Jb = Ub
            Kb = Sb
            Lb = Tb
            Mb = Ab
            G = 147
            break
          } else {
            Nb = Ub
            Ob = Sb
            Pb = ob
          }
        y = (z + -2) | 0
        zb = Nb
        Gb = Ob
        pb = Pb
        Cb = Ab
        while (1) {
          yb = (u + pb) | 0
          if ((pb | 0) < 4) {
            if (!pb) {
              Vb = y
              Wb = zb
              Xb = Gb
              Yb = u
              Zb = Cb
              break c
            }
            nb = Gb >>> 3
            mb = ((yb + (0 - nb)) | 0) >>> 0 < u >>> 0
            yb = mb ? pb : nb
            _b = yb
            $b = mb & 1
            ac = (Gb - (yb << 3)) | 0
          } else {
            _b = Gb >>> 3
            $b = 0
            ac = Gb & 7
          }
          pb = (pb - _b) | 0
          yb = (u + pb) | 0
          mb =
            d[yb >> 0] |
            (d[(yb + 1) >> 0] << 8) |
            (d[(yb + 2) >> 0] << 16) |
            (d[(yb + 3) >> 0] << 24)
          if (!((Cb >>> 0 <= y >>> 0) & (($b | 0) == 0))) {
            Vb = y
            Wb = mb
            Xb = ac
            Yb = yb
            Zb = Cb
            break c
          }
          nb = (mb << (ac & 31)) >>> Hb
          Fb = (j + (nb << 2)) | 0
          Eb = d[Fb >> 0] | (d[(Fb + 1) >> 0] << 8)
          a[Cb >> 0] = Eb
          a[(Cb + 1) >> 0] = Eb >> 8
          Eb = (ac + (d[(j + (nb << 2) + 2) >> 0] | 0)) | 0
          Fb = (Cb + (d[(j + (nb << 2) + 3) >> 0] | 0)) | 0
          if (Eb >>> 0 > 32) {
            Vb = y
            Wb = mb
            Xb = Eb
            Yb = yb
            Zb = Fb
            break
          } else {
            zb = mb
            Gb = Eb
            Cb = Fb
          }
        }
      }
    while (0)
    if ((G | 0) == 147) {
      Vb = (z + -2) | 0
      Wb = Jb
      Xb = Kb
      Yb = Lb
      Zb = Mb
    }
    if (Zb >>> 0 > Vb >>> 0) {
      bc = Xb
      cc = Zb
    } else {
      Mb = (0 - w) & 31
      Lb = Xb
      Xb = Zb
      while (1) {
        Zb = (Wb << (Lb & 31)) >>> Mb
        Kb = (j + (Zb << 2)) | 0
        Jb = d[Kb >> 0] | (d[(Kb + 1) >> 0] << 8)
        a[Xb >> 0] = Jb
        a[(Xb + 1) >> 0] = Jb >> 8
        Jb = (Lb + (d[(j + (Zb << 2) + 2) >> 0] | 0)) | 0
        Kb = (Xb + (d[(j + (Zb << 2) + 3) >> 0] | 0)) | 0
        if (Kb >>> 0 > Vb >>> 0) {
          bc = Jb
          cc = Kb
          break
        } else {
          Lb = Jb
          Xb = Kb
        }
      }
    }
    do
      if (cc >>> 0 < z >>> 0) {
        Xb = (Wb << (bc & 31)) >>> ((0 - w) & 31)
        a[cc >> 0] = a[(j + (Xb << 2)) >> 0] | 0
        if ((a[(j + (Xb << 2) + 3) >> 0] | 0) == 1) {
          dc = (bc + (d[(j + (Xb << 2) + 2) >> 0] | 0)) | 0
          break
        }
        if (bc >>> 0 >= 32) {
          dc = bc
          break
        }
        Lb = (bc + (d[(j + (Xb << 2) + 2) >> 0] | 0)) | 0
        dc = Lb >>> 0 < 32 ? Lb : 32
      } else dc = bc
    while (0)
    d: do
      if (La >>> 0 > 32) {
        ec = Ka
        fc = La
        gc = ia
        hc = Qa
        G = 172
      } else {
        bc = (0 - w) & 31
        cc = Ka
        Wb = La
        z = Ma
        Lb = Qa
        while (1) {
          Xb = (v + z) | 0
          if ((z | 0) < 4) {
            if (!z) {
              ic = cc
              jc = Wb
              kc = 0
              break
            }
            Vb = Wb >>> 3
            Mb = ((Xb + (0 - Vb)) | 0) >>> 0 < v >>> 0
            Xb = Mb ? z : Vb
            lc = Xb
            mc = Mb & 1
            nc = (Wb - (Xb << 3)) | 0
          } else {
            lc = Wb >>> 3
            mc = 0
            nc = Wb & 7
          }
          z = (z - lc) | 0
          oc = (v + z) | 0
          pc =
            d[oc >> 0] |
            (d[(oc + 1) >> 0] << 8) |
            (d[(oc + 2) >> 0] << 16) |
            (d[(oc + 3) >> 0] << 24)
          if (!((Lb >>> 0 < U >>> 0) & ((mc | 0) == 0))) {
            G = 171
            break
          }
          Xb = (pc << (nc & 31)) >>> bc
          Mb = (j + (Xb << 2)) | 0
          Vb = d[Mb >> 0] | (d[(Mb + 1) >> 0] << 8)
          a[Lb >> 0] = Vb
          a[(Lb + 1) >> 0] = Vb >> 8
          Vb = (nc + (d[(j + (Xb << 2) + 2) >> 0] | 0)) | 0
          Mb = (Lb + (d[(j + (Xb << 2) + 3) >> 0] | 0)) | 0
          Xb = (pc << (Vb & 31)) >>> bc
          Kb = (j + (Xb << 2)) | 0
          Jb = d[Kb >> 0] | (d[(Kb + 1) >> 0] << 8)
          a[Mb >> 0] = Jb
          a[(Mb + 1) >> 0] = Jb >> 8
          Jb = (Vb + (d[(j + (Xb << 2) + 2) >> 0] | 0)) | 0
          Vb = (Mb + (d[(j + (Xb << 2) + 3) >> 0] | 0)) | 0
          if (Jb >>> 0 > 32) {
            ec = pc
            fc = Jb
            gc = oc
            hc = Vb
            G = 172
            break d
          } else {
            cc = pc
            Wb = Jb
            Lb = Vb
          }
        }
        if ((G | 0) == 171)
          if (nc >>> 0 > 32) {
            ec = pc
            fc = nc
            gc = oc
            hc = Lb
            G = 172
            break
          } else {
            ic = pc
            jc = nc
            kc = z
          }
        Wb = (i + -2) | 0
        cc = ic
        Vb = jc
        Jb = kc
        Xb = Lb
        while (1) {
          Mb = (v + Jb) | 0
          if ((Jb | 0) < 4) {
            if (!Jb) {
              qc = Wb
              rc = cc
              sc = Vb
              tc = v
              uc = Xb
              break d
            }
            Kb = Vb >>> 3
            Zb = ((Mb + (0 - Kb)) | 0) >>> 0 < v >>> 0
            Mb = Zb ? Jb : Kb
            vc = Mb
            wc = Zb & 1
            xc = (Vb - (Mb << 3)) | 0
          } else {
            vc = Vb >>> 3
            wc = 0
            xc = Vb & 7
          }
          Jb = (Jb - vc) | 0
          Mb = (v + Jb) | 0
          Zb =
            d[Mb >> 0] |
            (d[(Mb + 1) >> 0] << 8) |
            (d[(Mb + 2) >> 0] << 16) |
            (d[(Mb + 3) >> 0] << 24)
          if (!((Xb >>> 0 <= Wb >>> 0) & ((wc | 0) == 0))) {
            qc = Wb
            rc = Zb
            sc = xc
            tc = Mb
            uc = Xb
            break d
          }
          Kb = (Zb << (xc & 31)) >>> bc
          ac = (j + (Kb << 2)) | 0
          $b = d[ac >> 0] | (d[(ac + 1) >> 0] << 8)
          a[Xb >> 0] = $b
          a[(Xb + 1) >> 0] = $b >> 8
          $b = (xc + (d[(j + (Kb << 2) + 2) >> 0] | 0)) | 0
          ac = (Xb + (d[(j + (Kb << 2) + 3) >> 0] | 0)) | 0
          if ($b >>> 0 > 32) {
            qc = Wb
            rc = Zb
            sc = $b
            tc = Mb
            uc = ac
            break
          } else {
            cc = Zb
            Vb = $b
            Xb = ac
          }
        }
      }
    while (0)
    if ((G | 0) == 172) {
      qc = (i + -2) | 0
      rc = ec
      sc = fc
      tc = gc
      uc = hc
    }
    if (uc >>> 0 > qc >>> 0) {
      yc = sc
      zc = uc
    } else {
      hc = (0 - w) & 31
      gc = sc
      sc = uc
      while (1) {
        uc = (rc << (gc & 31)) >>> hc
        fc = (j + (uc << 2)) | 0
        ec = d[fc >> 0] | (d[(fc + 1) >> 0] << 8)
        a[sc >> 0] = ec
        a[(sc + 1) >> 0] = ec >> 8
        ec = (gc + (d[(j + (uc << 2) + 2) >> 0] | 0)) | 0
        fc = (sc + (d[(j + (uc << 2) + 3) >> 0] | 0)) | 0
        if (fc >>> 0 > qc >>> 0) {
          yc = ec
          zc = fc
          break
        } else {
          gc = ec
          sc = fc
        }
      }
    }
    do
      if (zc >>> 0 < i >>> 0) {
        sc = (rc << (yc & 31)) >>> ((0 - w) & 31)
        a[zc >> 0] = a[(j + (sc << 2)) >> 0] | 0
        if ((a[(j + (sc << 2) + 3) >> 0] | 0) == 1) {
          Ac = (yc + (d[(j + (sc << 2) + 2) >> 0] | 0)) | 0
          break
        }
        if (yc >>> 0 >= 32) {
          Ac = yc
          break
        }
        gc = (yc + (d[(j + (sc << 2) + 2) >> 0] | 0)) | 0
        Ac = gc >>> 0 < 32 ? gc : 32
      } else Ac = yc
    while (0)
    h =
      ((eb | 0) == 6) &
      ((lb | 0) == 32) &
      (((t | 0) == (Bb | 0)) & ((Ib | 0) == 32)) &
      (((u | 0) == (Yb | 0)) & ((dc | 0) == 32)) &
      (((v | 0) == (tc | 0)) & ((Ac | 0) == 32))
        ? c
        : -20
    return h | 0
  }
  function ga(a, b, c, e, f, g) {
    a = a | 0
    b = b | 0
    c = c | 0
    e = e | 0
    f = f | 0
    g = g | 0
    var h = 0
    if (
      !(
        ((((d[f >> 0] |
          (d[(f + 1) >> 0] << 8) |
          (d[(f + 2) >> 0] << 16) |
          (d[(f + 3) >> 0] << 24)) >>>
          8) &
          255) <<
          24) >>
        24
      )
    ) {
      h = ba(a, b, c, e, f) | 0
      return h | 0
    } else {
      h = ea(a, b, c, e, f) | 0
      return h | 0
    }
    return 0
  }
  function ha(a, b, c, d, e, f, g, h) {
    a = a | 0
    b = b | 0
    c = c | 0
    d = d | 0
    e = e | 0
    f = f | 0
    g = g | 0
    h = h | 0
    var i = 0
    h = aa(a, d, e, f, g) | 0
    if (h >>> 0 >= 4294967177) {
      i = h
      return i | 0
    }
    if (h >>> 0 >= e >>> 0) {
      i = -72
      return i | 0
    }
    i = ba(b, c, (d + h) | 0, (e - h) | 0, a) | 0
    return i | 0
  }
  function ia(a, b, c, e, f, g) {
    a = a | 0
    b = b | 0
    c = c | 0
    e = e | 0
    f = f | 0
    g = g | 0
    var h = 0
    if (
      !(
        ((((d[f >> 0] |
          (d[(f + 1) >> 0] << 8) |
          (d[(f + 2) >> 0] << 16) |
          (d[(f + 3) >> 0] << 24)) >>>
          8) &
          255) <<
          24) >>
        24
      )
    ) {
      h = ca(a, b, c, e, f) | 0
      return h | 0
    } else {
      h = fa(a, b, c, e, f) | 0
      return h | 0
    }
    return 0
  }
  function ja(a, b, d, e, f, g, h, i) {
    a = a | 0
    b = b | 0
    d = d | 0
    e = e | 0
    f = f | 0
    g = g | 0
    h = h | 0
    i = i | 0
    var j = 0,
      k = 0,
      l = 0,
      m = 0
    if (!d) {
      j = -70
      return j | 0
    }
    if (!f) {
      j = -20
      return j | 0
    }
    if (f >>> 0 < d >>> 0) k = (((f << 4) >>> 0) / (d >>> 0)) | 0
    else k = 15
    i = d >>> 8
    l =
      ((q(c[(1040 + ((k * 24) | 0) + 4) >> 2] | 0, i) | 0) +
        (c[(1040 + ((k * 24) | 0)) >> 2] | 0)) |
      0
    m =
      ((q(c[(1040 + ((k * 24) | 0) + 12) >> 2] | 0, i) | 0) +
        (c[(1040 + ((k * 24) | 0) + 8) >> 2] | 0)) |
      0
    if ((((m >>> 3) + m) | 0) >>> 0 < l >>> 0) {
      l = da(a, e, f, g, h) | 0
      if (l >>> 0 >= 4294967177) {
        j = l
        return j | 0
      }
      if (l >>> 0 >= f >>> 0) {
        j = -72
        return j | 0
      }
      j = fa(b, d, (e + l) | 0, (f - l) | 0, a) | 0
      return j | 0
    } else {
      l = aa(a, e, f, g, h) | 0
      if (l >>> 0 >= 4294967177) {
        j = l
        return j | 0
      }
      if (l >>> 0 >= f >>> 0) {
        j = -72
        return j | 0
      }
      j = ca(b, d, (e + l) | 0, (f - l) | 0, a) | 0
      return j | 0
    }
    return 0
  }
  function ka(a) {
    a = a | 0
    return c[(a + 4) >> 2] | 0
  }
  function la(a) {
    a = a | 0
    return c[(a + 8) >> 2] | 0
  }
  function ma(a, b) {
    a = a | 0
    b = b | 0
    var d = 0,
      e = 0
    c[(a + 28952) >> 2] = c[(b + 26676) >> 2]
    d = c[(b + 4) >> 2] | 0
    c[(a + 28732) >> 2] = d
    c[(a + 28736) >> 2] = d
    e = (d + (c[(b + 8) >> 2] | 0)) | 0
    c[(a + 28740) >> 2] = e
    c[(a + 28728) >> 2] = e
    e = (a + 28808) | 0
    if (!(c[(b + 26680) >> 2] | 0)) {
      c[e >> 2] = 0
      c[(a + 28812) >> 2] = 0
      return
    } else {
      c[e >> 2] = 1
      c[(a + 28812) >> 2] = 1
      c[a >> 2] = b + 12
      c[(a + 4) >> 2] = b + 6172
      c[(a + 8) >> 2] = b + 4116
      c[(a + 12) >> 2] = b + 10276
      c[(a + 26668) >> 2] = c[(b + 26664) >> 2]
      c[(a + 26672) >> 2] = c[(b + 26668) >> 2]
      c[(a + 26676) >> 2] = c[(b + 26672) >> 2]
      return
    }
  }
  function na(a) {
    a = a | 0
    var b = 0,
      d = 0,
      e = 0,
      f = 0,
      g = 0
    b = K
    K = (K + 32) | 0
    d = (b + 12) | 0
    e = b
    if (!a) {
      K = b
      return 0
    }
    f = (a + 26684) | 0
    c[e >> 2] = c[f >> 2]
    c[(e + 4) >> 2] = c[(f + 4) >> 2]
    c[(e + 8) >> 2] = c[(f + 8) >> 2]
    g = c[a >> 2] | 0
    c[d >> 2] = c[f >> 2]
    c[(d + 4) >> 2] = c[(f + 4) >> 2]
    c[(d + 8) >> 2] = c[(f + 8) >> 2]
    ya(g, d)
    c[d >> 2] = c[e >> 2]
    c[(d + 4) >> 2] = c[(e + 4) >> 2]
    c[(d + 8) >> 2] = c[(e + 8) >> 2]
    ya(a, d)
    K = b
    return 0
  }
  function oa(a, b, e) {
    a = a | 0
    b = b | 0
    e = e | 0
    var f = 0,
      g = 0
    if (b >>> 0 < 3) {
      f = -72
      return f | 0
    }
    b = (d[a >> 0] | (d[(a + 1) >> 0] << 8)) & 65535
    g = (((d[(a + 2) >> 0] | 0) << 16) | b) >>> 3
    c[(e + 4) >> 2] = b & 1
    a = b >>> 1
    c[e >> 2] = a & 3
    c[(e + 8) >> 2] = g
    switch (a & 3) {
      case 3: {
        f = -20
        return f | 0
      }
      case 1: {
        f = 1
        return f | 0
      }
      default: {
        f = g
        return f | 0
      }
    }
    return 0
  }
  function pa(b, e, f) {
    b = b | 0
    e = e | 0
    f = f | 0
    var g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0
    if (f >>> 0 < 3) {
      g = -20
      return g | 0
    }
    h = a[e >> 0] | 0
    i = h & 255
    j = i & 3
    switch (h & 3) {
      case 3: {
        if (!(c[(b + 28808) >> 2] | 0)) {
          g = -30
          return g | 0
        }
        break
      }
      case 2:
        break
      case 0: {
        switch (((h & 255) >>> 2) & 3) {
          case 3: {
            k = 3
            l =
              (((d[(e + 2) >> 0] | 0) << 16) |
                ((d[e >> 0] | (d[(e + 1) >> 0] << 8)) & 65535)) >>>
              4
            break
          }
          case 1: {
            k = 2
            l = ((d[e >> 0] | (d[(e + 1) >> 0] << 8)) & 65535) >>> 4
            break
          }
          default: {
            k = 1
            l = i >>> 3
          }
        }
        m = (k + l) | 0
        if (((m + 32) | 0) >>> 0 <= f >>> 0) {
          c[(b + 28912) >> 2] = e + k
          c[(b + 28928) >> 2] = l
          g = m
          return g | 0
        }
        n = (b + 29024) | 0
        if (m >>> 0 > f >>> 0) {
          g = -20
          return g | 0
        }
        bc(n | 0, (e + k) | 0, l | 0) | 0
        c[(b + 28912) >> 2] = n
        c[(b + 28928) >> 2] = l
        o = (b + 29024 + l) | 0
        p = (o + 32) | 0
        do {
          a[o >> 0] = 0
          o = (o + 1) | 0
        } while ((o | 0) < (p | 0))
        g = m
        return g | 0
      }
      case 1: {
        switch (((h & 255) >>> 2) & 3) {
          case 3: {
            m =
              ((d[(e + 2) >> 0] | 0) << 16) |
              ((d[e >> 0] | (d[(e + 1) >> 0] << 8)) & 65535)
            if (f >>> 0 < 4) {
              g = -20
              return g | 0
            }
            if (m >>> 0 > 2097167) {
              g = -20
              return g | 0
            } else {
              q = 3
              r = m >>> 4
            }
            break
          }
          case 1: {
            q = 2
            r = ((d[e >> 0] | (d[(e + 1) >> 0] << 8)) & 65535) >>> 4
            break
          }
          default: {
            q = 1
            r = i >>> 3
          }
        }
        i = (b + 29024) | 0
        dc(i | 0, a[(e + q) >> 0] | 0, (r + 32) | 0) | 0
        c[(b + 28912) >> 2] = i
        c[(b + 28928) >> 2] = r
        g = (q + 1) | 0
        return g | 0
      }
      default: {
      }
    }
    if (f >>> 0 < 5) {
      g = -20
      return g | 0
    }
    q =
      d[e >> 0] |
      (d[(e + 1) >> 0] << 8) |
      (d[(e + 2) >> 0] << 16) |
      (d[(e + 3) >> 0] << 24)
    switch (((h & 255) >>> 2) & 3) {
      case 3: {
        r = (q >>> 4) & 262143
        if (r >>> 0 > 131072) {
          g = -20
          return g | 0
        } else {
          s = 5
          t = ((d[(e + 4) >> 0] | 0) << 10) | (q >>> 22)
          u = r
          v = 0
        }
        break
      }
      case 2: {
        s = 4
        t = q >>> 18
        u = (q >>> 4) & 16383
        v = 0
        break
      }
      default: {
        s = 3
        t = (q >>> 14) & 1023
        u = (q >>> 4) & 1023
        v = ((h & 12) == 0) & 1
      }
    }
    h = (t + s) | 0
    if (h >>> 0 > f >>> 0) {
      g = -20
      return g | 0
    }
    if ((u >>> 0 > 768) & ((c[(b + 28956) >> 2] | 0) != 0)) {
      f = 0
      while (1) {
        q = (f + 64) | 0
        if (q >>> 0 < 16388) f = q
        else break
      }
    }
    f = (v | 0) != 0
    do
      if ((j | 0) == 3) {
        v = (b + 29024) | 0
        q = (e + s) | 0
        r = c[(b + 12) >> 2] | 0
        i = c[(b + 28940) >> 2] | 0
        if (f) {
          w = ga(v, u, q, t, r, i) | 0
          break
        } else {
          w = ia(v, u, q, t, r, i) | 0
          break
        }
      } else {
        i = (b + 10280) | 0
        r = (b + 29024) | 0
        q = (e + s) | 0
        v = (b + 26680) | 0
        m = c[(b + 28940) >> 2] | 0
        if (f) {
          w = ha(i, r, u, q, t, v, 2048, m) | 0
          break
        } else {
          w = ja(i, r, u, q, t, v, 2048, m) | 0
          break
        }
      }
    while (0)
    if (w >>> 0 >= 4294967177) {
      g = -20
      return g | 0
    }
    c[(b + 28912) >> 2] = b + 29024
    c[(b + 28928) >> 2] = u
    c[(b + 28808) >> 2] = 1
    if ((j | 0) == 2) c[(b + 12) >> 2] = b + 10280
    o = (b + 29024 + u) | 0
    p = (o + 32) | 0
    do {
      a[o >> 0] = 0
      o = (o + 1) | 0
    } while ((o | 0) < (p | 0))
    g = h
    return g | 0
  }
  function qa(d, e, f, g, h, i) {
    d = d | 0
    e = e | 0
    f = f | 0
    g = g | 0
    h = h | 0
    i = i | 0
    var j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0
    j = K
    K = (K + 112) | 0
    k = j
    l = (d + 8) | 0
    m = (f + 1) | 0
    f = 1 << i
    n = (f + -1) | 0
    o = (m | 0) == 0
    if (!o) {
      p = (65536 << (i + -1)) >> 16
      q = 1
      s = n
      t = 0
      while (1) {
        u = b[(e + (t << 1)) >> 1] | 0
        if ((u << 16) >> 16 == -1) {
          c[(l + (s << 3) + 4) >> 2] = t
          v = 1
          w = q
          x = (s + -1) | 0
        } else {
          v = u
          w = (p | 0) > (((u << 16) >> 16) | 0) ? q : 0
          x = s
        }
        b[(k + (t << 1)) >> 1] = v
        t = (t + 1) | 0
        if ((t | 0) == (m | 0)) break
        else {
          q = w
          s = x
        }
      }
      c[d >> 2] = w
      c[(d + 4) >> 2] = i
      if (!o) {
        o = ((f >>> 3) + 3 + (f >>> 1)) | 0
        w = 0
        s = 0
        while (1) {
          q = b[(e + (s << 1)) >> 1] | 0
          if ((q << 16) >> 16 > 0) {
            t = (q << 16) >> 16
            q = 0
            v = w
            while (1) {
              c[(l + (v << 3) + 4) >> 2] = s
              p = v
              do p = (o + p) & n
              while (p >>> 0 > x >>> 0)
              q = (q + 1) | 0
              if ((q | 0) >= (t | 0)) {
                y = p
                break
              } else v = p
            }
          } else y = w
          s = (s + 1) | 0
          if ((s | 0) == (m | 0)) break
          else w = y
        }
      }
    } else {
      c[d >> 2] = 1
      c[(d + 4) >> 2] = i
    }
    d = 0
    do {
      y = (l + (d << 3)) | 0
      w = (y + 4) | 0
      m = c[w >> 2] | 0
      s = (k + (m << 1)) | 0
      x = b[s >> 1] | 0
      b[s >> 1] = ((x + 1) << 16) >> 16
      s = x & 65535
      x = (i - ((r(s | 0) | 0) ^ 31)) | 0
      a[(y + 3) >> 0] = x
      b[y >> 1] = (s << (x & 255)) - f
      a[(y + 2) >> 0] = c[(h + (m << 2)) >> 2]
      c[w >> 2] = c[(g + (m << 2)) >> 2]
      d = (d + 1) | 0
    } while (d >>> 0 < f >>> 0)
    K = j
    return
  }
  function ra(b, e, f, g) {
    b = b | 0
    e = e | 0
    f = f | 0
    g = g | 0
    var h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0
    h = (f + g) | 0
    if (!g) {
      i = -72
      return i | 0
    }
    j = (f + 1) | 0
    k = a[f >> 0] | 0
    l = k & 255
    if (!((k << 24) >> 24)) {
      c[e >> 2] = 0
      i = (g | 0) == 1 ? 1 : -72
      return i | 0
    }
    do
      if ((k << 24) >> 24 < 0)
        if ((k << 24) >> 24 == -1)
          if ((g | 0) < 3) {
            i = -72
            return i | 0
          } else {
            m = (f + 3) | 0
            n = (((d[j >> 0] | (d[(j + 1) >> 0] << 8)) & 65535) + 32512) | 0
            break
          }
        else if ((g | 0) < 2) {
          i = -72
          return i | 0
        } else {
          m = (f + 2) | 0
          n = ((l << 8) + -32768) | (d[j >> 0] | 0)
          break
        }
      else {
        m = j
        n = l
      }
    while (0)
    c[e >> 2] = n
    e = (m + 1) | 0
    if (e >>> 0 > h >>> 0) {
      i = -72
      return i | 0
    }
    l = d[m >> 0] | 0
    m = h
    h = (b + 28812) | 0
    j = (b + 28956) | 0
    g =
      sa(
        (b + 16) | 0,
        b,
        l >>> 6,
        35,
        9,
        e,
        (m - e) | 0,
        1424,
        1568,
        1712,
        c[h >> 2] | 0,
        c[j >> 2] | 0,
        n
      ) | 0
    k = g >>> 0 < 4294967177
    o = k ? (e + g) | 0 : e
    if (!k) {
      i = -20
      return i | 0
    }
    k =
      sa(
        (b + 4120) | 0,
        (b + 8) | 0,
        (l >>> 4) & 3,
        31,
        8,
        o,
        (m - o) | 0,
        2240,
        2368,
        2496,
        c[h >> 2] | 0,
        c[j >> 2] | 0,
        n
      ) | 0
    e = k >>> 0 < 4294967177
    g = e ? (o + k) | 0 : o
    if (!e) {
      i = -20
      return i | 0
    }
    e =
      sa(
        (b + 6176) | 0,
        (b + 4) | 0,
        (l >>> 2) & 3,
        52,
        9,
        g,
        (m - g) | 0,
        2768,
        2992,
        3216,
        c[h >> 2] | 0,
        c[j >> 2] | 0,
        n
      ) | 0
    if (e >>> 0 >= 4294967177) {
      i = -20
      return i | 0
    }
    i = (g + e - f) | 0
    return i | 0
  }
  function sa(e, f, g, h, i, j, k, l, m, n, o, p, q) {
    e = e | 0
    f = f | 0
    g = g | 0
    h = h | 0
    i = i | 0
    j = j | 0
    k = k | 0
    l = l | 0
    m = m | 0
    n = n | 0
    o = o | 0
    p = p | 0
    q = q | 0
    var r = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0
    r = K
    K = (K + 128) | 0
    s = (r + 108) | 0
    t = (r + 112) | 0
    u = r
    c[s >> 2] = h
    switch (g | 0) {
      case 1: {
        if (k) {
          g = d[j >> 0] | 0
          if (g >>> 0 > h >>> 0) v = -20
          else {
            h = c[(l + (g << 2)) >> 2] | 0
            w = c[(m + (g << 2)) >> 2] | 0
            c[(e + 4) >> 2] = 0
            c[e >> 2] = 0
            a[(e + 11) >> 0] = 0
            b[(e + 8) >> 1] = 0
            a[(e + 10) >> 0] = w
            c[(e + 12) >> 2] = h
            c[f >> 2] = e
            v = 1
          }
        } else v = -72
        break
      }
      case 0: {
        c[f >> 2] = n
        v = 0
        break
      }
      case 3: {
        if (o)
          if (
            ((p | 0) != 0) & ((q | 0) > 24)
              ? ((q = ((8 << i) + 8) | 0), (q | 0) != 0)
              : 0
          ) {
            p = 0
            while (1) {
              o = (p + 64) | 0
              if (o >>> 0 < q >>> 0) p = o
              else {
                v = 0
                break
              }
            }
          } else v = 0
        else v = -20
        break
      }
      case 2: {
        p = Ca(u, s, t, j, k) | 0
        if (
          p >>> 0 < 4294967177 ? ((k = c[t >> 2] | 0), k >>> 0 <= i >>> 0) : 0
        ) {
          qa(e, u, c[s >> 2] | 0, l, m, k)
          c[f >> 2] = e
          x = p
        } else x = -20
        v = x
        break
      }
      default:
        v = -1
    }
    K = r
    return v | 0
  }
  function Qb(a) {
    a = a | 0
    var b = 0,
      d = 0,
      e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0,
      L = 0,
      M = 0,
      N = 0,
      O = 0,
      P = 0,
      Q = 0,
      R = 0,
      S = 0,
      T = 0,
      U = 0,
      V = 0,
      W = 0,
      X = 0,
      Y = 0,
      Z = 0,
      _ = 0,
      $ = 0,
      aa = 0,
      ba = 0,
      ca = 0,
      da = 0,
      ea = 0,
      fa = 0,
      ga = 0,
      ha = 0,
      ia = 0,
      ja = 0,
      ka = 0,
      la = 0,
      ma = 0,
      na = 0,
      oa = 0,
      pa = 0,
      qa = 0,
      ra = 0,
      sa = 0,
      ta = 0,
      ua = 0,
      va = 0,
      wa = 0,
      xa = 0,
      ya = 0,
      za = 0,
      Aa = 0,
      Ba = 0,
      Ca = 0,
      Da = 0,
      Ea = 0,
      Fa = 0,
      Ga = 0,
      Ha = 0,
      Ia = 0,
      Ja = 0
    b = K
    K = (K + 16) | 0
    d = b
    do
      if (a >>> 0 < 245) {
        e = a >>> 0 < 11 ? 16 : (a + 11) & -8
        f = e >>> 3
        g = c[1576] | 0
        h = g >>> f
        if ((h & 3) | 0) {
          i = (((h & 1) ^ 1) + f) | 0
          j = (6344 + ((i << 1) << 2)) | 0
          k = (j + 8) | 0
          l = c[k >> 2] | 0
          m = (l + 8) | 0
          n = c[m >> 2] | 0
          if ((n | 0) == (j | 0)) c[1576] = g & ~(1 << i)
          else {
            c[(n + 12) >> 2] = j
            c[k >> 2] = n
          }
          n = i << 3
          c[(l + 4) >> 2] = n | 3
          i = (l + n + 4) | 0
          c[i >> 2] = c[i >> 2] | 1
          o = m
          K = b
          return o | 0
        }
        m = c[1578] | 0
        if (e >>> 0 > m >>> 0) {
          if (h | 0) {
            i = 2 << f
            n = (h << f) & (i | (0 - i))
            i = ((n & (0 - n)) + -1) | 0
            n = (i >>> 12) & 16
            f = i >>> n
            i = (f >>> 5) & 8
            h = f >>> i
            f = (h >>> 2) & 4
            l = h >>> f
            h = (l >>> 1) & 2
            k = l >>> h
            l = (k >>> 1) & 1
            j = ((i | n | f | h | l) + (k >>> l)) | 0
            l = (6344 + ((j << 1) << 2)) | 0
            k = (l + 8) | 0
            h = c[k >> 2] | 0
            f = (h + 8) | 0
            n = c[f >> 2] | 0
            if ((n | 0) == (l | 0)) {
              i = g & ~(1 << j)
              c[1576] = i
              p = i
            } else {
              c[(n + 12) >> 2] = l
              c[k >> 2] = n
              p = g
            }
            n = j << 3
            j = (n - e) | 0
            c[(h + 4) >> 2] = e | 3
            k = (h + e) | 0
            c[(k + 4) >> 2] = j | 1
            c[(h + n) >> 2] = j
            if (m | 0) {
              n = c[1581] | 0
              h = m >>> 3
              l = (6344 + ((h << 1) << 2)) | 0
              i = 1 << h
              if (!(p & i)) {
                c[1576] = p | i
                q = (l + 8) | 0
                r = l
              } else {
                i = (l + 8) | 0
                q = i
                r = c[i >> 2] | 0
              }
              c[q >> 2] = n
              c[(r + 12) >> 2] = n
              c[(n + 8) >> 2] = r
              c[(n + 12) >> 2] = l
            }
            c[1578] = j
            c[1581] = k
            o = f
            K = b
            return o | 0
          }
          f = c[1577] | 0
          if (f) {
            k = ((f & (0 - f)) + -1) | 0
            j = (k >>> 12) & 16
            l = k >>> j
            k = (l >>> 5) & 8
            n = l >>> k
            l = (n >>> 2) & 4
            i = n >>> l
            n = (i >>> 1) & 2
            h = i >>> n
            i = (h >>> 1) & 1
            s = c[(6608 + (((k | j | l | n | i) + (h >>> i)) << 2)) >> 2] | 0
            i = ((c[(s + 4) >> 2] & -8) - e) | 0
            h = s
            n = s
            while (1) {
              s = c[(h + 16) >> 2] | 0
              if (!s) {
                l = c[(h + 20) >> 2] | 0
                if (!l) break
                else t = l
              } else t = s
              s = ((c[(t + 4) >> 2] & -8) - e) | 0
              l = s >>> 0 < i >>> 0
              i = l ? s : i
              h = t
              n = l ? t : n
            }
            h = (n + e) | 0
            if (h >>> 0 > n >>> 0) {
              l = c[(n + 24) >> 2] | 0
              s = c[(n + 12) >> 2] | 0
              do
                if ((s | 0) == (n | 0)) {
                  j = (n + 20) | 0
                  k = c[j >> 2] | 0
                  if (!k) {
                    u = (n + 16) | 0
                    v = c[u >> 2] | 0
                    if (!v) {
                      w = 0
                      break
                    } else {
                      x = v
                      y = u
                    }
                  } else {
                    x = k
                    y = j
                  }
                  j = x
                  k = y
                  while (1) {
                    u = (j + 20) | 0
                    v = c[u >> 2] | 0
                    if (!v) {
                      z = (j + 16) | 0
                      A = c[z >> 2] | 0
                      if (!A) break
                      else {
                        B = A
                        C = z
                      }
                    } else {
                      B = v
                      C = u
                    }
                    j = B
                    k = C
                  }
                  c[k >> 2] = 0
                  w = j
                } else {
                  u = c[(n + 8) >> 2] | 0
                  c[(u + 12) >> 2] = s
                  c[(s + 8) >> 2] = u
                  w = s
                }
              while (0)
              do
                if (l | 0) {
                  s = c[(n + 28) >> 2] | 0
                  u = (6608 + (s << 2)) | 0
                  if ((n | 0) == (c[u >> 2] | 0)) {
                    c[u >> 2] = w
                    if (!w) {
                      c[1577] = f & ~(1 << s)
                      break
                    }
                  } else {
                    s = (l + 16) | 0
                    c[((c[s >> 2] | 0) == (n | 0) ? s : (l + 20) | 0) >> 2] = w
                    if (!w) break
                  }
                  c[(w + 24) >> 2] = l
                  s = c[(n + 16) >> 2] | 0
                  if (s | 0) {
                    c[(w + 16) >> 2] = s
                    c[(s + 24) >> 2] = w
                  }
                  s = c[(n + 20) >> 2] | 0
                  if (s | 0) {
                    c[(w + 20) >> 2] = s
                    c[(s + 24) >> 2] = w
                  }
                }
              while (0)
              if (i >>> 0 < 16) {
                l = (i + e) | 0
                c[(n + 4) >> 2] = l | 3
                f = (n + l + 4) | 0
                c[f >> 2] = c[f >> 2] | 1
              } else {
                c[(n + 4) >> 2] = e | 3
                c[(h + 4) >> 2] = i | 1
                c[(h + i) >> 2] = i
                if (m | 0) {
                  f = c[1581] | 0
                  l = m >>> 3
                  s = (6344 + ((l << 1) << 2)) | 0
                  u = 1 << l
                  if (!(u & g)) {
                    c[1576] = u | g
                    D = (s + 8) | 0
                    E = s
                  } else {
                    u = (s + 8) | 0
                    D = u
                    E = c[u >> 2] | 0
                  }
                  c[D >> 2] = f
                  c[(E + 12) >> 2] = f
                  c[(f + 8) >> 2] = E
                  c[(f + 12) >> 2] = s
                }
                c[1578] = i
                c[1581] = h
              }
              o = (n + 8) | 0
              K = b
              return o | 0
            } else F = e
          } else F = e
        } else F = e
      } else if (a >>> 0 <= 4294967231) {
        s = (a + 11) | 0
        f = s & -8
        u = c[1577] | 0
        if (u) {
          l = (0 - f) | 0
          v = s >>> 8
          if (v)
            if (f >>> 0 > 16777215) G = 31
            else {
              s = (((v + 1048320) | 0) >>> 16) & 8
              z = v << s
              v = (((z + 520192) | 0) >>> 16) & 4
              A = z << v
              z = (((A + 245760) | 0) >>> 16) & 2
              H = (14 - (v | s | z) + ((A << z) >>> 15)) | 0
              G = ((f >>> ((H + 7) | 0)) & 1) | (H << 1)
            }
          else G = 0
          H = c[(6608 + (G << 2)) >> 2] | 0
          a: do
            if (!H) {
              I = l
              J = 0
              L = 0
              M = 61
            } else {
              z = l
              A = 0
              s = f << ((G | 0) == 31 ? 0 : (25 - (G >>> 1)) | 0)
              v = H
              N = 0
              while (1) {
                O = ((c[(v + 4) >> 2] & -8) - f) | 0
                if (O >>> 0 < z >>> 0)
                  if (!O) {
                    P = 0
                    Q = v
                    R = v
                    M = 65
                    break a
                  } else {
                    S = O
                    T = v
                  }
                else {
                  S = z
                  T = N
                }
                O = c[(v + 20) >> 2] | 0
                v = c[(v + 16 + ((s >>> 31) << 2)) >> 2] | 0
                U = ((O | 0) == 0) | ((O | 0) == (v | 0)) ? A : O
                if (!v) {
                  I = S
                  J = U
                  L = T
                  M = 61
                  break
                } else {
                  z = S
                  A = U
                  s = s << 1
                  N = T
                }
              }
            }
          while (0)
          if ((M | 0) == 61) {
            if (((J | 0) == 0) & ((L | 0) == 0)) {
              H = 2 << G
              l = (H | (0 - H)) & u
              if (!l) {
                F = f
                break
              }
              H = ((l & (0 - l)) + -1) | 0
              l = (H >>> 12) & 16
              e = H >>> l
              H = (e >>> 5) & 8
              n = e >>> H
              e = (n >>> 2) & 4
              h = n >>> e
              n = (h >>> 1) & 2
              i = h >>> n
              h = (i >>> 1) & 1
              V = c[(6608 + (((H | l | e | n | h) + (i >>> h)) << 2)) >> 2] | 0
              W = 0
            } else {
              V = J
              W = L
            }
            if (!V) {
              X = I
              Y = W
            } else {
              P = I
              Q = V
              R = W
              M = 65
            }
          }
          if ((M | 0) == 65) {
            h = P
            i = Q
            n = R
            while (1) {
              e = ((c[(i + 4) >> 2] & -8) - f) | 0
              l = e >>> 0 < h >>> 0
              H = l ? e : h
              e = l ? i : n
              l = c[(i + 16) >> 2] | 0
              if (!l) Z = c[(i + 20) >> 2] | 0
              else Z = l
              if (!Z) {
                X = H
                Y = e
                break
              } else {
                h = H
                i = Z
                n = e
              }
            }
          }
          if (
            ((Y | 0) != 0
            ? X >>> 0 < (((c[1578] | 0) - f) | 0) >>> 0
            : 0)
              ? ((n = (Y + f) | 0), n >>> 0 > Y >>> 0)
              : 0
          ) {
            i = c[(Y + 24) >> 2] | 0
            h = c[(Y + 12) >> 2] | 0
            do
              if ((h | 0) == (Y | 0)) {
                e = (Y + 20) | 0
                H = c[e >> 2] | 0
                if (!H) {
                  l = (Y + 16) | 0
                  g = c[l >> 2] | 0
                  if (!g) {
                    _ = 0
                    break
                  } else {
                    $ = g
                    aa = l
                  }
                } else {
                  $ = H
                  aa = e
                }
                e = $
                H = aa
                while (1) {
                  l = (e + 20) | 0
                  g = c[l >> 2] | 0
                  if (!g) {
                    m = (e + 16) | 0
                    N = c[m >> 2] | 0
                    if (!N) break
                    else {
                      ba = N
                      ca = m
                    }
                  } else {
                    ba = g
                    ca = l
                  }
                  e = ba
                  H = ca
                }
                c[H >> 2] = 0
                _ = e
              } else {
                l = c[(Y + 8) >> 2] | 0
                c[(l + 12) >> 2] = h
                c[(h + 8) >> 2] = l
                _ = h
              }
            while (0)
            do
              if (i) {
                h = c[(Y + 28) >> 2] | 0
                l = (6608 + (h << 2)) | 0
                if ((Y | 0) == (c[l >> 2] | 0)) {
                  c[l >> 2] = _
                  if (!_) {
                    l = u & ~(1 << h)
                    c[1577] = l
                    da = l
                    break
                  }
                } else {
                  l = (i + 16) | 0
                  c[((c[l >> 2] | 0) == (Y | 0) ? l : (i + 20) | 0) >> 2] = _
                  if (!_) {
                    da = u
                    break
                  }
                }
                c[(_ + 24) >> 2] = i
                l = c[(Y + 16) >> 2] | 0
                if (l | 0) {
                  c[(_ + 16) >> 2] = l
                  c[(l + 24) >> 2] = _
                }
                l = c[(Y + 20) >> 2] | 0
                if (l) {
                  c[(_ + 20) >> 2] = l
                  c[(l + 24) >> 2] = _
                  da = u
                } else da = u
              } else da = u
            while (0)
            b: do
              if (X >>> 0 < 16) {
                u = (X + f) | 0
                c[(Y + 4) >> 2] = u | 3
                i = (Y + u + 4) | 0
                c[i >> 2] = c[i >> 2] | 1
              } else {
                c[(Y + 4) >> 2] = f | 3
                c[(n + 4) >> 2] = X | 1
                c[(n + X) >> 2] = X
                i = X >>> 3
                if (X >>> 0 < 256) {
                  u = (6344 + ((i << 1) << 2)) | 0
                  l = c[1576] | 0
                  h = 1 << i
                  if (!(l & h)) {
                    c[1576] = l | h
                    ea = (u + 8) | 0
                    fa = u
                  } else {
                    h = (u + 8) | 0
                    ea = h
                    fa = c[h >> 2] | 0
                  }
                  c[ea >> 2] = n
                  c[(fa + 12) >> 2] = n
                  c[(n + 8) >> 2] = fa
                  c[(n + 12) >> 2] = u
                  break
                }
                u = X >>> 8
                if (u)
                  if (X >>> 0 > 16777215) ga = 31
                  else {
                    h = (((u + 1048320) | 0) >>> 16) & 8
                    l = u << h
                    u = (((l + 520192) | 0) >>> 16) & 4
                    i = l << u
                    l = (((i + 245760) | 0) >>> 16) & 2
                    g = (14 - (u | h | l) + ((i << l) >>> 15)) | 0
                    ga = ((X >>> ((g + 7) | 0)) & 1) | (g << 1)
                  }
                else ga = 0
                g = (6608 + (ga << 2)) | 0
                c[(n + 28) >> 2] = ga
                l = (n + 16) | 0
                c[(l + 4) >> 2] = 0
                c[l >> 2] = 0
                l = 1 << ga
                if (!(da & l)) {
                  c[1577] = da | l
                  c[g >> 2] = n
                  c[(n + 24) >> 2] = g
                  c[(n + 12) >> 2] = n
                  c[(n + 8) >> 2] = n
                  break
                }
                l = c[g >> 2] | 0
                c: do
                  if (((c[(l + 4) >> 2] & -8) | 0) == (X | 0)) ha = l
                  else {
                    g = X << ((ga | 0) == 31 ? 0 : (25 - (ga >>> 1)) | 0)
                    i = l
                    while (1) {
                      ia = (i + 16 + ((g >>> 31) << 2)) | 0
                      h = c[ia >> 2] | 0
                      if (!h) break
                      if (((c[(h + 4) >> 2] & -8) | 0) == (X | 0)) {
                        ha = h
                        break c
                      } else {
                        g = g << 1
                        i = h
                      }
                    }
                    c[ia >> 2] = n
                    c[(n + 24) >> 2] = i
                    c[(n + 12) >> 2] = n
                    c[(n + 8) >> 2] = n
                    break b
                  }
                while (0)
                l = (ha + 8) | 0
                e = c[l >> 2] | 0
                c[(e + 12) >> 2] = n
                c[l >> 2] = n
                c[(n + 8) >> 2] = e
                c[(n + 12) >> 2] = ha
                c[(n + 24) >> 2] = 0
              }
            while (0)
            o = (Y + 8) | 0
            K = b
            return o | 0
          } else F = f
        } else F = f
      } else F = -1
    while (0)
    Y = c[1578] | 0
    if (Y >>> 0 >= F >>> 0) {
      ha = (Y - F) | 0
      ia = c[1581] | 0
      if (ha >>> 0 > 15) {
        X = (ia + F) | 0
        c[1581] = X
        c[1578] = ha
        c[(X + 4) >> 2] = ha | 1
        c[(ia + Y) >> 2] = ha
        c[(ia + 4) >> 2] = F | 3
      } else {
        c[1578] = 0
        c[1581] = 0
        c[(ia + 4) >> 2] = Y | 3
        ha = (ia + Y + 4) | 0
        c[ha >> 2] = c[ha >> 2] | 1
      }
      o = (ia + 8) | 0
      K = b
      return o | 0
    }
    ia = c[1579] | 0
    if (ia >>> 0 > F >>> 0) {
      ha = (ia - F) | 0
      c[1579] = ha
      Y = c[1582] | 0
      X = (Y + F) | 0
      c[1582] = X
      c[(X + 4) >> 2] = ha | 1
      c[(Y + 4) >> 2] = F | 3
      o = (Y + 8) | 0
      K = b
      return o | 0
    }
    if (!(c[1694] | 0)) {
      c[1696] = 4096
      c[1695] = 4096
      c[1697] = -1
      c[1698] = -1
      c[1699] = 0
      c[1687] = 0
      c[1694] = (d & -16) ^ 1431655768
      ja = 4096
    } else ja = c[1696] | 0
    d = (F + 48) | 0
    Y = (F + 47) | 0
    ha = (ja + Y) | 0
    X = (0 - ja) | 0
    ja = ha & X
    if (ja >>> 0 <= F >>> 0) {
      o = 0
      K = b
      return o | 0
    }
    ga = c[1686] | 0
    if (
      ga | 0
        ? ((da = c[1684] | 0),
          (fa = (da + ja) | 0),
          (fa >>> 0 <= da >>> 0) | (fa >>> 0 > ga >>> 0))
        : 0
    ) {
      o = 0
      K = b
      return o | 0
    }
    d: do
      if (!(c[1687] & 4)) {
        ga = c[1582] | 0
        e: do
          if (ga) {
            fa = 6752
            while (1) {
              da = c[fa >> 2] | 0
              if (
                da >>> 0 <= ga >>> 0
                  ? ((da + (c[(fa + 4) >> 2] | 0)) | 0) >>> 0 > ga >>> 0
                  : 0
              )
                break
              da = c[(fa + 8) >> 2] | 0
              if (!da) {
                M = 128
                break e
              } else fa = da
            }
            da = (ha - ia) & X
            if (da >>> 0 < 2147483647) {
              ea = Sb(da) | 0
              if ((ea | 0) == (((c[fa >> 2] | 0) + (c[(fa + 4) >> 2] | 0)) | 0))
                if ((ea | 0) == (-1 | 0)) ka = da
                else {
                  la = ea
                  ma = da
                  M = 145
                  break d
                }
              else {
                na = ea
                oa = da
                M = 136
              }
            } else ka = 0
          } else M = 128
        while (0)
        do
          if ((M | 0) == 128) {
            ga = Sb(0) | 0
            if (
              (ga | 0) != (-1 | 0)
                ? ((f = ga),
                  (da = c[1695] | 0),
                  (ea = (da + -1) | 0),
                  (_ =
                    ((((ea & f) | 0) == 0
                      ? 0
                      : (((ea + f) & (0 - da)) - f) | 0) +
                      ja) |
                    0),
                  (f = c[1684] | 0),
                  (da = (_ + f) | 0),
                  (_ >>> 0 > F >>> 0) & (_ >>> 0 < 2147483647))
                : 0
            ) {
              ea = c[1686] | 0
              if (ea | 0 ? (da >>> 0 <= f >>> 0) | (da >>> 0 > ea >>> 0) : 0) {
                ka = 0
                break
              }
              ea = Sb(_) | 0
              if ((ea | 0) == (ga | 0)) {
                la = ga
                ma = _
                M = 145
                break d
              } else {
                na = ea
                oa = _
                M = 136
              }
            } else ka = 0
          }
        while (0)
        do
          if ((M | 0) == 136) {
            _ = (0 - oa) | 0
            if (
              !(
                (d >>> 0 > oa >>> 0) &
                ((oa >>> 0 < 2147483647) & ((na | 0) != (-1 | 0)))
              )
            )
              if ((na | 0) == (-1 | 0)) {
                ka = 0
                break
              } else {
                la = na
                ma = oa
                M = 145
                break d
              }
            ea = c[1696] | 0
            ga = (Y - oa + ea) & (0 - ea)
            if (ga >>> 0 >= 2147483647) {
              la = na
              ma = oa
              M = 145
              break d
            }
            if ((Sb(ga) | 0) == (-1 | 0)) {
              Sb(_) | 0
              ka = 0
              break
            } else {
              la = na
              ma = (ga + oa) | 0
              M = 145
              break d
            }
          }
        while (0)
        c[1687] = c[1687] | 4
        pa = ka
        M = 143
      } else {
        pa = 0
        M = 143
      }
    while (0)
    if (
      ((M | 0) == 143
      ? ja >>> 0 < 2147483647
      : 0)
        ? ((ka = Sb(ja) | 0),
          (ja = Sb(0) | 0),
          (oa = (ja - ka) | 0),
          (na = oa >>> 0 > ((F + 40) | 0) >>> 0),
          !(
            ((ka | 0) == (-1 | 0)) |
            (na ^ 1) |
            (((ka >>> 0 < ja >>> 0) &
              (((ka | 0) != (-1 | 0)) & ((ja | 0) != (-1 | 0)))) ^
              1)
          ))
        : 0
    ) {
      la = ka
      ma = na ? oa : pa
      M = 145
    }
    if ((M | 0) == 145) {
      pa = ((c[1684] | 0) + ma) | 0
      c[1684] = pa
      if (pa >>> 0 > (c[1685] | 0) >>> 0) c[1685] = pa
      pa = c[1582] | 0
      f: do
        if (pa) {
          oa = 6752
          while (1) {
            qa = c[oa >> 2] | 0
            ra = c[(oa + 4) >> 2] | 0
            if ((la | 0) == ((qa + ra) | 0)) {
              M = 154
              break
            }
            na = c[(oa + 8) >> 2] | 0
            if (!na) break
            else oa = na
          }
          if (
            ((M | 0) == 154
            ? ((na = (oa + 4) | 0), ((c[(oa + 12) >> 2] & 8) | 0) == 0)
            : 0)
              ? (la >>> 0 > pa >>> 0) & (qa >>> 0 <= pa >>> 0)
              : 0
          ) {
            c[na >> 2] = ra + ma
            na = ((c[1579] | 0) + ma) | 0
            ka = (pa + 8) | 0
            ja = ((ka & 7) | 0) == 0 ? 0 : (0 - ka) & 7
            ka = (pa + ja) | 0
            Y = (na - ja) | 0
            c[1582] = ka
            c[1579] = Y
            c[(ka + 4) >> 2] = Y | 1
            c[(pa + na + 4) >> 2] = 40
            c[1583] = c[1698]
            break
          }
          if (la >>> 0 < (c[1580] | 0) >>> 0) c[1580] = la
          na = (la + ma) | 0
          Y = 6752
          while (1) {
            if ((c[Y >> 2] | 0) == (na | 0)) {
              M = 162
              break
            }
            ka = c[(Y + 8) >> 2] | 0
            if (!ka) break
            else Y = ka
          }
          if ((M | 0) == 162 ? ((c[(Y + 12) >> 2] & 8) | 0) == 0 : 0) {
            c[Y >> 2] = la
            oa = (Y + 4) | 0
            c[oa >> 2] = (c[oa >> 2] | 0) + ma
            oa = (la + 8) | 0
            ka = (la + (((oa & 7) | 0) == 0 ? 0 : (0 - oa) & 7)) | 0
            oa = (na + 8) | 0
            ja = (na + (((oa & 7) | 0) == 0 ? 0 : (0 - oa) & 7)) | 0
            oa = (ka + F) | 0
            d = (ja - ka - F) | 0
            c[(ka + 4) >> 2] = F | 3
            g: do
              if ((pa | 0) == (ja | 0)) {
                X = ((c[1579] | 0) + d) | 0
                c[1579] = X
                c[1582] = oa
                c[(oa + 4) >> 2] = X | 1
              } else {
                if ((c[1581] | 0) == (ja | 0)) {
                  X = ((c[1578] | 0) + d) | 0
                  c[1578] = X
                  c[1581] = oa
                  c[(oa + 4) >> 2] = X | 1
                  c[(oa + X) >> 2] = X
                  break
                }
                X = c[(ja + 4) >> 2] | 0
                if (((X & 3) | 0) == 1) {
                  ia = X & -8
                  ha = X >>> 3
                  h: do
                    if (X >>> 0 < 256) {
                      ga = c[(ja + 8) >> 2] | 0
                      _ = c[(ja + 12) >> 2] | 0
                      if ((_ | 0) == (ga | 0)) {
                        c[1576] = c[1576] & ~(1 << ha)
                        break
                      } else {
                        c[(ga + 12) >> 2] = _
                        c[(_ + 8) >> 2] = ga
                        break
                      }
                    } else {
                      ga = c[(ja + 24) >> 2] | 0
                      _ = c[(ja + 12) >> 2] | 0
                      do
                        if ((_ | 0) == (ja | 0)) {
                          ea = (ja + 16) | 0
                          da = (ea + 4) | 0
                          f = c[da >> 2] | 0
                          if (!f) {
                            ca = c[ea >> 2] | 0
                            if (!ca) {
                              sa = 0
                              break
                            } else {
                              ta = ca
                              ua = ea
                            }
                          } else {
                            ta = f
                            ua = da
                          }
                          da = ta
                          f = ua
                          while (1) {
                            ea = (da + 20) | 0
                            ca = c[ea >> 2] | 0
                            if (!ca) {
                              ba = (da + 16) | 0
                              aa = c[ba >> 2] | 0
                              if (!aa) break
                              else {
                                va = aa
                                wa = ba
                              }
                            } else {
                              va = ca
                              wa = ea
                            }
                            da = va
                            f = wa
                          }
                          c[f >> 2] = 0
                          sa = da
                        } else {
                          ea = c[(ja + 8) >> 2] | 0
                          c[(ea + 12) >> 2] = _
                          c[(_ + 8) >> 2] = ea
                          sa = _
                        }
                      while (0)
                      if (!ga) break
                      _ = c[(ja + 28) >> 2] | 0
                      i = (6608 + (_ << 2)) | 0
                      do
                        if ((c[i >> 2] | 0) != (ja | 0)) {
                          ea = (ga + 16) | 0
                          c[
                            ((c[ea >> 2] | 0) == (ja | 0)
                              ? ea
                              : (ga + 20) | 0) >> 2
                          ] = sa
                          if (!sa) break h
                        } else {
                          c[i >> 2] = sa
                          if (sa | 0) break
                          c[1577] = c[1577] & ~(1 << _)
                          break h
                        }
                      while (0)
                      c[(sa + 24) >> 2] = ga
                      _ = (ja + 16) | 0
                      i = c[_ >> 2] | 0
                      if (i | 0) {
                        c[(sa + 16) >> 2] = i
                        c[(i + 24) >> 2] = sa
                      }
                      i = c[(_ + 4) >> 2] | 0
                      if (!i) break
                      c[(sa + 20) >> 2] = i
                      c[(i + 24) >> 2] = sa
                    }
                  while (0)
                  xa = (ja + ia) | 0
                  ya = (ia + d) | 0
                } else {
                  xa = ja
                  ya = d
                }
                ha = (xa + 4) | 0
                c[ha >> 2] = c[ha >> 2] & -2
                c[(oa + 4) >> 2] = ya | 1
                c[(oa + ya) >> 2] = ya
                ha = ya >>> 3
                if (ya >>> 0 < 256) {
                  X = (6344 + ((ha << 1) << 2)) | 0
                  fa = c[1576] | 0
                  i = 1 << ha
                  if (!(fa & i)) {
                    c[1576] = fa | i
                    za = (X + 8) | 0
                    Aa = X
                  } else {
                    i = (X + 8) | 0
                    za = i
                    Aa = c[i >> 2] | 0
                  }
                  c[za >> 2] = oa
                  c[(Aa + 12) >> 2] = oa
                  c[(oa + 8) >> 2] = Aa
                  c[(oa + 12) >> 2] = X
                  break
                }
                X = ya >>> 8
                do
                  if (!X) Ba = 0
                  else {
                    if (ya >>> 0 > 16777215) {
                      Ba = 31
                      break
                    }
                    i = (((X + 1048320) | 0) >>> 16) & 8
                    fa = X << i
                    ha = (((fa + 520192) | 0) >>> 16) & 4
                    _ = fa << ha
                    fa = (((_ + 245760) | 0) >>> 16) & 2
                    ea = (14 - (ha | i | fa) + ((_ << fa) >>> 15)) | 0
                    Ba = ((ya >>> ((ea + 7) | 0)) & 1) | (ea << 1)
                  }
                while (0)
                X = (6608 + (Ba << 2)) | 0
                c[(oa + 28) >> 2] = Ba
                ia = (oa + 16) | 0
                c[(ia + 4) >> 2] = 0
                c[ia >> 2] = 0
                ia = c[1577] | 0
                ea = 1 << Ba
                if (!(ia & ea)) {
                  c[1577] = ia | ea
                  c[X >> 2] = oa
                  c[(oa + 24) >> 2] = X
                  c[(oa + 12) >> 2] = oa
                  c[(oa + 8) >> 2] = oa
                  break
                }
                ea = c[X >> 2] | 0
                i: do
                  if (((c[(ea + 4) >> 2] & -8) | 0) == (ya | 0)) Ca = ea
                  else {
                    X = ya << ((Ba | 0) == 31 ? 0 : (25 - (Ba >>> 1)) | 0)
                    ia = ea
                    while (1) {
                      Da = (ia + 16 + ((X >>> 31) << 2)) | 0
                      fa = c[Da >> 2] | 0
                      if (!fa) break
                      if (((c[(fa + 4) >> 2] & -8) | 0) == (ya | 0)) {
                        Ca = fa
                        break i
                      } else {
                        X = X << 1
                        ia = fa
                      }
                    }
                    c[Da >> 2] = oa
                    c[(oa + 24) >> 2] = ia
                    c[(oa + 12) >> 2] = oa
                    c[(oa + 8) >> 2] = oa
                    break g
                  }
                while (0)
                ea = (Ca + 8) | 0
                X = c[ea >> 2] | 0
                c[(X + 12) >> 2] = oa
                c[ea >> 2] = oa
                c[(oa + 8) >> 2] = X
                c[(oa + 12) >> 2] = Ca
                c[(oa + 24) >> 2] = 0
              }
            while (0)
            o = (ka + 8) | 0
            K = b
            return o | 0
          }
          oa = 6752
          while (1) {
            d = c[oa >> 2] | 0
            if (
              d >>> 0 <= pa >>> 0
                ? ((Ea = (d + (c[(oa + 4) >> 2] | 0)) | 0), Ea >>> 0 > pa >>> 0)
                : 0
            )
              break
            oa = c[(oa + 8) >> 2] | 0
          }
          oa = (Ea + -47) | 0
          ka = (oa + 8) | 0
          d = (oa + (((ka & 7) | 0) == 0 ? 0 : (0 - ka) & 7)) | 0
          ka = (pa + 16) | 0
          oa = d >>> 0 < ka >>> 0 ? pa : d
          d = (oa + 8) | 0
          ja = (ma + -40) | 0
          na = (la + 8) | 0
          Y = ((na & 7) | 0) == 0 ? 0 : (0 - na) & 7
          na = (la + Y) | 0
          X = (ja - Y) | 0
          c[1582] = na
          c[1579] = X
          c[(na + 4) >> 2] = X | 1
          c[(la + ja + 4) >> 2] = 40
          c[1583] = c[1698]
          ja = (oa + 4) | 0
          c[ja >> 2] = 27
          c[d >> 2] = c[1688]
          c[(d + 4) >> 2] = c[1689]
          c[(d + 8) >> 2] = c[1690]
          c[(d + 12) >> 2] = c[1691]
          c[1688] = la
          c[1689] = ma
          c[1691] = 0
          c[1690] = d
          d = (oa + 24) | 0
          do {
            X = d
            d = (d + 4) | 0
            c[d >> 2] = 7
          } while (((X + 8) | 0) >>> 0 < Ea >>> 0)
          if ((oa | 0) != (pa | 0)) {
            d = (oa - pa) | 0
            c[ja >> 2] = c[ja >> 2] & -2
            c[(pa + 4) >> 2] = d | 1
            c[oa >> 2] = d
            X = d >>> 3
            if (d >>> 0 < 256) {
              na = (6344 + ((X << 1) << 2)) | 0
              Y = c[1576] | 0
              ea = 1 << X
              if (!(Y & ea)) {
                c[1576] = Y | ea
                Fa = (na + 8) | 0
                Ga = na
              } else {
                ea = (na + 8) | 0
                Fa = ea
                Ga = c[ea >> 2] | 0
              }
              c[Fa >> 2] = pa
              c[(Ga + 12) >> 2] = pa
              c[(pa + 8) >> 2] = Ga
              c[(pa + 12) >> 2] = na
              break
            }
            na = d >>> 8
            if (na)
              if (d >>> 0 > 16777215) Ha = 31
              else {
                ea = (((na + 1048320) | 0) >>> 16) & 8
                Y = na << ea
                na = (((Y + 520192) | 0) >>> 16) & 4
                X = Y << na
                Y = (((X + 245760) | 0) >>> 16) & 2
                ga = (14 - (na | ea | Y) + ((X << Y) >>> 15)) | 0
                Ha = ((d >>> ((ga + 7) | 0)) & 1) | (ga << 1)
              }
            else Ha = 0
            ga = (6608 + (Ha << 2)) | 0
            c[(pa + 28) >> 2] = Ha
            c[(pa + 20) >> 2] = 0
            c[ka >> 2] = 0
            Y = c[1577] | 0
            X = 1 << Ha
            if (!(Y & X)) {
              c[1577] = Y | X
              c[ga >> 2] = pa
              c[(pa + 24) >> 2] = ga
              c[(pa + 12) >> 2] = pa
              c[(pa + 8) >> 2] = pa
              break
            }
            X = c[ga >> 2] | 0
            j: do
              if (((c[(X + 4) >> 2] & -8) | 0) == (d | 0)) Ia = X
              else {
                ga = d << ((Ha | 0) == 31 ? 0 : (25 - (Ha >>> 1)) | 0)
                Y = X
                while (1) {
                  Ja = (Y + 16 + ((ga >>> 31) << 2)) | 0
                  ea = c[Ja >> 2] | 0
                  if (!ea) break
                  if (((c[(ea + 4) >> 2] & -8) | 0) == (d | 0)) {
                    Ia = ea
                    break j
                  } else {
                    ga = ga << 1
                    Y = ea
                  }
                }
                c[Ja >> 2] = pa
                c[(pa + 24) >> 2] = Y
                c[(pa + 12) >> 2] = pa
                c[(pa + 8) >> 2] = pa
                break f
              }
            while (0)
            d = (Ia + 8) | 0
            X = c[d >> 2] | 0
            c[(X + 12) >> 2] = pa
            c[d >> 2] = pa
            c[(pa + 8) >> 2] = X
            c[(pa + 12) >> 2] = Ia
            c[(pa + 24) >> 2] = 0
          }
        } else {
          X = c[1580] | 0
          if (((X | 0) == 0) | (la >>> 0 < X >>> 0)) c[1580] = la
          c[1688] = la
          c[1689] = ma
          c[1691] = 0
          c[1585] = c[1694]
          c[1584] = -1
          c[1589] = 6344
          c[1588] = 6344
          c[1591] = 6352
          c[1590] = 6352
          c[1593] = 6360
          c[1592] = 6360
          c[1595] = 6368
          c[1594] = 6368
          c[1597] = 6376
          c[1596] = 6376
          c[1599] = 6384
          c[1598] = 6384
          c[1601] = 6392
          c[1600] = 6392
          c[1603] = 6400
          c[1602] = 6400
          c[1605] = 6408
          c[1604] = 6408
          c[1607] = 6416
          c[1606] = 6416
          c[1609] = 6424
          c[1608] = 6424
          c[1611] = 6432
          c[1610] = 6432
          c[1613] = 6440
          c[1612] = 6440
          c[1615] = 6448
          c[1614] = 6448
          c[1617] = 6456
          c[1616] = 6456
          c[1619] = 6464
          c[1618] = 6464
          c[1621] = 6472
          c[1620] = 6472
          c[1623] = 6480
          c[1622] = 6480
          c[1625] = 6488
          c[1624] = 6488
          c[1627] = 6496
          c[1626] = 6496
          c[1629] = 6504
          c[1628] = 6504
          c[1631] = 6512
          c[1630] = 6512
          c[1633] = 6520
          c[1632] = 6520
          c[1635] = 6528
          c[1634] = 6528
          c[1637] = 6536
          c[1636] = 6536
          c[1639] = 6544
          c[1638] = 6544
          c[1641] = 6552
          c[1640] = 6552
          c[1643] = 6560
          c[1642] = 6560
          c[1645] = 6568
          c[1644] = 6568
          c[1647] = 6576
          c[1646] = 6576
          c[1649] = 6584
          c[1648] = 6584
          c[1651] = 6592
          c[1650] = 6592
          X = (ma + -40) | 0
          d = (la + 8) | 0
          ka = ((d & 7) | 0) == 0 ? 0 : (0 - d) & 7
          d = (la + ka) | 0
          oa = (X - ka) | 0
          c[1582] = d
          c[1579] = oa
          c[(d + 4) >> 2] = oa | 1
          c[(la + X + 4) >> 2] = 40
          c[1583] = c[1698]
        }
      while (0)
      la = c[1579] | 0
      if (la >>> 0 > F >>> 0) {
        ma = (la - F) | 0
        c[1579] = ma
        la = c[1582] | 0
        pa = (la + F) | 0
        c[1582] = pa
        c[(pa + 4) >> 2] = ma | 1
        c[(la + 4) >> 2] = F | 3
        o = (la + 8) | 0
        K = b
        return o | 0
      }
    }
    la = La() | 0
    c[la >> 2] = 48
    o = 0
    K = b
    return o | 0
  }
  function Rb(a) {
    a = a | 0
    var b = 0,
      d = 0,
      e = 0,
      f = 0,
      g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0,
      s = 0,
      t = 0,
      u = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0
    if (!a) return
    b = (a + -8) | 0
    d = c[1580] | 0
    e = c[(a + -4) >> 2] | 0
    a = e & -8
    f = (b + a) | 0
    do
      if (!(e & 1)) {
        g = c[b >> 2] | 0
        if (!(e & 3)) return
        h = (b + (0 - g)) | 0
        i = (g + a) | 0
        if (h >>> 0 < d >>> 0) return
        if ((c[1581] | 0) == (h | 0)) {
          j = (f + 4) | 0
          k = c[j >> 2] | 0
          if (((k & 3) | 0) != 3) {
            l = h
            m = h
            n = i
            break
          }
          c[1578] = i
          c[j >> 2] = k & -2
          c[(h + 4) >> 2] = i | 1
          c[(h + i) >> 2] = i
          return
        }
        k = g >>> 3
        if (g >>> 0 < 256) {
          g = c[(h + 8) >> 2] | 0
          j = c[(h + 12) >> 2] | 0
          if ((j | 0) == (g | 0)) {
            c[1576] = c[1576] & ~(1 << k)
            l = h
            m = h
            n = i
            break
          } else {
            c[(g + 12) >> 2] = j
            c[(j + 8) >> 2] = g
            l = h
            m = h
            n = i
            break
          }
        }
        g = c[(h + 24) >> 2] | 0
        j = c[(h + 12) >> 2] | 0
        do
          if ((j | 0) == (h | 0)) {
            k = (h + 16) | 0
            o = (k + 4) | 0
            p = c[o >> 2] | 0
            if (!p) {
              q = c[k >> 2] | 0
              if (!q) {
                r = 0
                break
              } else {
                s = q
                t = k
              }
            } else {
              s = p
              t = o
            }
            o = s
            p = t
            while (1) {
              k = (o + 20) | 0
              q = c[k >> 2] | 0
              if (!q) {
                u = (o + 16) | 0
                v = c[u >> 2] | 0
                if (!v) break
                else {
                  w = v
                  x = u
                }
              } else {
                w = q
                x = k
              }
              o = w
              p = x
            }
            c[p >> 2] = 0
            r = o
          } else {
            k = c[(h + 8) >> 2] | 0
            c[(k + 12) >> 2] = j
            c[(j + 8) >> 2] = k
            r = j
          }
        while (0)
        if (g) {
          j = c[(h + 28) >> 2] | 0
          k = (6608 + (j << 2)) | 0
          if ((c[k >> 2] | 0) == (h | 0)) {
            c[k >> 2] = r
            if (!r) {
              c[1577] = c[1577] & ~(1 << j)
              l = h
              m = h
              n = i
              break
            }
          } else {
            j = (g + 16) | 0
            c[((c[j >> 2] | 0) == (h | 0) ? j : (g + 20) | 0) >> 2] = r
            if (!r) {
              l = h
              m = h
              n = i
              break
            }
          }
          c[(r + 24) >> 2] = g
          j = (h + 16) | 0
          k = c[j >> 2] | 0
          if (k | 0) {
            c[(r + 16) >> 2] = k
            c[(k + 24) >> 2] = r
          }
          k = c[(j + 4) >> 2] | 0
          if (k) {
            c[(r + 20) >> 2] = k
            c[(k + 24) >> 2] = r
            l = h
            m = h
            n = i
          } else {
            l = h
            m = h
            n = i
          }
        } else {
          l = h
          m = h
          n = i
        }
      } else {
        l = b
        m = b
        n = a
      }
    while (0)
    if (l >>> 0 >= f >>> 0) return
    a = (f + 4) | 0
    b = c[a >> 2] | 0
    if (!(b & 1)) return
    if (!(b & 2)) {
      if ((c[1582] | 0) == (f | 0)) {
        r = ((c[1579] | 0) + n) | 0
        c[1579] = r
        c[1582] = m
        c[(m + 4) >> 2] = r | 1
        if ((m | 0) != (c[1581] | 0)) return
        c[1581] = 0
        c[1578] = 0
        return
      }
      if ((c[1581] | 0) == (f | 0)) {
        r = ((c[1578] | 0) + n) | 0
        c[1578] = r
        c[1581] = l
        c[(m + 4) >> 2] = r | 1
        c[(l + r) >> 2] = r
        return
      }
      r = ((b & -8) + n) | 0
      x = b >>> 3
      do
        if (b >>> 0 < 256) {
          w = c[(f + 8) >> 2] | 0
          t = c[(f + 12) >> 2] | 0
          if ((t | 0) == (w | 0)) {
            c[1576] = c[1576] & ~(1 << x)
            break
          } else {
            c[(w + 12) >> 2] = t
            c[(t + 8) >> 2] = w
            break
          }
        } else {
          w = c[(f + 24) >> 2] | 0
          t = c[(f + 12) >> 2] | 0
          do
            if ((t | 0) == (f | 0)) {
              s = (f + 16) | 0
              d = (s + 4) | 0
              e = c[d >> 2] | 0
              if (!e) {
                k = c[s >> 2] | 0
                if (!k) {
                  y = 0
                  break
                } else {
                  z = k
                  A = s
                }
              } else {
                z = e
                A = d
              }
              d = z
              e = A
              while (1) {
                s = (d + 20) | 0
                k = c[s >> 2] | 0
                if (!k) {
                  j = (d + 16) | 0
                  q = c[j >> 2] | 0
                  if (!q) break
                  else {
                    B = q
                    C = j
                  }
                } else {
                  B = k
                  C = s
                }
                d = B
                e = C
              }
              c[e >> 2] = 0
              y = d
            } else {
              o = c[(f + 8) >> 2] | 0
              c[(o + 12) >> 2] = t
              c[(t + 8) >> 2] = o
              y = t
            }
          while (0)
          if (w | 0) {
            t = c[(f + 28) >> 2] | 0
            i = (6608 + (t << 2)) | 0
            if ((c[i >> 2] | 0) == (f | 0)) {
              c[i >> 2] = y
              if (!y) {
                c[1577] = c[1577] & ~(1 << t)
                break
              }
            } else {
              t = (w + 16) | 0
              c[((c[t >> 2] | 0) == (f | 0) ? t : (w + 20) | 0) >> 2] = y
              if (!y) break
            }
            c[(y + 24) >> 2] = w
            t = (f + 16) | 0
            i = c[t >> 2] | 0
            if (i | 0) {
              c[(y + 16) >> 2] = i
              c[(i + 24) >> 2] = y
            }
            i = c[(t + 4) >> 2] | 0
            if (i | 0) {
              c[(y + 20) >> 2] = i
              c[(i + 24) >> 2] = y
            }
          }
        }
      while (0)
      c[(m + 4) >> 2] = r | 1
      c[(l + r) >> 2] = r
      if ((m | 0) == (c[1581] | 0)) {
        c[1578] = r
        return
      } else D = r
    } else {
      c[a >> 2] = b & -2
      c[(m + 4) >> 2] = n | 1
      c[(l + n) >> 2] = n
      D = n
    }
    n = D >>> 3
    if (D >>> 0 < 256) {
      l = (6344 + ((n << 1) << 2)) | 0
      b = c[1576] | 0
      a = 1 << n
      if (!(b & a)) {
        c[1576] = b | a
        E = (l + 8) | 0
        F = l
      } else {
        a = (l + 8) | 0
        E = a
        F = c[a >> 2] | 0
      }
      c[E >> 2] = m
      c[(F + 12) >> 2] = m
      c[(m + 8) >> 2] = F
      c[(m + 12) >> 2] = l
      return
    }
    l = D >>> 8
    if (l)
      if (D >>> 0 > 16777215) G = 31
      else {
        F = (((l + 1048320) | 0) >>> 16) & 8
        E = l << F
        l = (((E + 520192) | 0) >>> 16) & 4
        a = E << l
        E = (((a + 245760) | 0) >>> 16) & 2
        b = (14 - (l | F | E) + ((a << E) >>> 15)) | 0
        G = ((D >>> ((b + 7) | 0)) & 1) | (b << 1)
      }
    else G = 0
    b = (6608 + (G << 2)) | 0
    c[(m + 28) >> 2] = G
    c[(m + 20) >> 2] = 0
    c[(m + 16) >> 2] = 0
    E = c[1577] | 0
    a = 1 << G
    a: do
      if (!(E & a)) {
        c[1577] = E | a
        c[b >> 2] = m
        c[(m + 24) >> 2] = b
        c[(m + 12) >> 2] = m
        c[(m + 8) >> 2] = m
      } else {
        F = c[b >> 2] | 0
        b: do
          if (((c[(F + 4) >> 2] & -8) | 0) == (D | 0)) H = F
          else {
            l = D << ((G | 0) == 31 ? 0 : (25 - (G >>> 1)) | 0)
            n = F
            while (1) {
              I = (n + 16 + ((l >>> 31) << 2)) | 0
              r = c[I >> 2] | 0
              if (!r) break
              if (((c[(r + 4) >> 2] & -8) | 0) == (D | 0)) {
                H = r
                break b
              } else {
                l = l << 1
                n = r
              }
            }
            c[I >> 2] = m
            c[(m + 24) >> 2] = n
            c[(m + 12) >> 2] = m
            c[(m + 8) >> 2] = m
            break a
          }
        while (0)
        F = (H + 8) | 0
        w = c[F >> 2] | 0
        c[(w + 12) >> 2] = m
        c[F >> 2] = m
        c[(m + 8) >> 2] = w
        c[(m + 12) >> 2] = H
        c[(m + 24) >> 2] = 0
      }
    while (0)
    m = ((c[1584] | 0) + -1) | 0
    c[1584] = m
    if (m | 0) return
    m = 6760
    while (1) {
      H = c[m >> 2] | 0
      if (!H) break
      else m = (H + 8) | 0
    }
    c[1584] = -1
    return
  }
  function Sb(a) {
    a = a | 0
    var b = 0,
      d = 0,
      e = 0,
      f = 0
    b = ac() | 0
    d = c[b >> 2] | 0
    e = (d + ((a + 3) & -4)) | 0
    if (e >>> 0 > (D() | 0) >>> 0 ? (F(e | 0) | 0) == 0 : 0) {
      a = La() | 0
      c[a >> 2] = 48
      f = -1
      return f | 0
    }
    c[b >> 2] = e
    f = d
    return f | 0
  }
  function Tb(a, b) {
    a = a | 0
    b = b | 0
    var c = 0,
      d = 0,
      e = 0,
      f = 0
    c = a & 65535
    d = b & 65535
    e = q(d, c) | 0
    f = a >>> 16
    a = ((e >>> 16) + (q(d, f) | 0)) | 0
    d = b >>> 16
    b = q(d, c) | 0
    return (
      (t(((a >>> 16) + (q(d, f) | 0) + ((((a & 65535) + b) | 0) >>> 16)) | 0),
      ((a + b) << 16) | (e & 65535) | 0) | 0
    )
  }
  function Ub(a, b, c, d) {
    a = a | 0
    b = b | 0
    c = c | 0
    d = d | 0
    var e = 0,
      f = 0
    e = a
    a = c
    c = Tb(e, a) | 0
    f = u() | 0
    return (t(((q(b, a) | 0) + (q(d, e) | 0) + f) | (f & 0) | 0), c | 0 | 0) | 0
  }
  function Vb(a, b, c, d) {
    a = a | 0
    b = b | 0
    c = c | 0
    d = d | 0
    var e = 0
    e = (a + c) >>> 0
    return (t(((b + d + ((e >>> 0 < a >>> 0) | 0)) >>> 0) | 0), e | 0) | 0
  }
  function Wb(a, b, c, d) {
    a = a | 0
    b = b | 0
    c = c | 0
    d = d | 0
    var e = 0
    e = (b - d) >>> 0
    e = (b - d - ((c >>> 0 > a >>> 0) | 0)) >>> 0
    return (t(e | 0), ((a - c) >>> 0) | 0) | 0
  }
  function Xb(a) {
    a = a | 0
    return (a ? (31 - (r(a ^ (a - 1)) | 0)) | 0 : 32) | 0
  }
  function Yb(a, b, d, e, f) {
    a = a | 0
    b = b | 0
    d = d | 0
    e = e | 0
    f = f | 0
    var g = 0,
      h = 0,
      i = 0,
      j = 0,
      k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      s = 0,
      v = 0,
      w = 0,
      x = 0,
      y = 0,
      z = 0,
      A = 0,
      B = 0,
      C = 0,
      D = 0,
      E = 0,
      F = 0,
      G = 0,
      H = 0,
      I = 0,
      J = 0
    g = a
    h = b
    i = h
    j = d
    k = e
    l = k
    if (!i) {
      m = (f | 0) != 0
      if (!l) {
        if (m) {
          c[f >> 2] = (g >>> 0) % (j >>> 0)
          c[(f + 4) >> 2] = 0
        }
        n = 0
        o = ((g >>> 0) / (j >>> 0)) >>> 0
        return (t(n | 0), o) | 0
      } else {
        if (!m) {
          n = 0
          o = 0
          return (t(n | 0), o) | 0
        }
        c[f >> 2] = a | 0
        c[(f + 4) >> 2] = b & 0
        n = 0
        o = 0
        return (t(n | 0), o) | 0
      }
    }
    m = (l | 0) == 0
    do
      if (j) {
        if (!m) {
          p = ((r(l | 0) | 0) - (r(i | 0) | 0)) | 0
          if (p >>> 0 <= 31) {
            q = (p + 1) | 0
            s = (31 - p) | 0
            v = (p - 31) >> 31
            w = q
            x = ((g >>> (q >>> 0)) & v) | (i << s)
            y = (i >>> (q >>> 0)) & v
            z = 0
            A = g << s
            break
          }
          if (!f) {
            n = 0
            o = 0
            return (t(n | 0), o) | 0
          }
          c[f >> 2] = a | 0
          c[(f + 4) >> 2] = h | (b & 0)
          n = 0
          o = 0
          return (t(n | 0), o) | 0
        }
        s = (j - 1) | 0
        if ((s & j) | 0) {
          v = ((r(j | 0) | 0) + 33 - (r(i | 0) | 0)) | 0
          q = (64 - v) | 0
          p = (32 - v) | 0
          B = p >> 31
          C = (v - 32) | 0
          D = C >> 31
          w = v
          x =
            (((p - 1) >> 31) & (i >>> (C >>> 0))) |
            (((i << p) | (g >>> (v >>> 0))) & D)
          y = D & (i >>> (v >>> 0))
          z = (g << q) & B
          A =
            (((i << q) | (g >>> (C >>> 0))) & B) | ((g << p) & ((v - 33) >> 31))
          break
        }
        if (f | 0) {
          c[f >> 2] = s & g
          c[(f + 4) >> 2] = 0
        }
        if ((j | 0) == 1) {
          n = h | (b & 0)
          o = a | 0 | 0
          return (t(n | 0), o) | 0
        } else {
          s = Xb(j | 0) | 0
          n = (i >>> (s >>> 0)) | 0
          o = (i << (32 - s)) | (g >>> (s >>> 0)) | 0
          return (t(n | 0), o) | 0
        }
      } else {
        if (m) {
          if (f | 0) {
            c[f >> 2] = (i >>> 0) % (j >>> 0)
            c[(f + 4) >> 2] = 0
          }
          n = 0
          o = ((i >>> 0) / (j >>> 0)) >>> 0
          return (t(n | 0), o) | 0
        }
        if (!g) {
          if (f | 0) {
            c[f >> 2] = 0
            c[(f + 4) >> 2] = (i >>> 0) % (l >>> 0)
          }
          n = 0
          o = ((i >>> 0) / (l >>> 0)) >>> 0
          return (t(n | 0), o) | 0
        }
        s = (l - 1) | 0
        if (!(s & l)) {
          if (f | 0) {
            c[f >> 2] = a | 0
            c[(f + 4) >> 2] = (s & i) | (b & 0)
          }
          n = 0
          o = i >>> ((Xb(l | 0) | 0) >>> 0)
          return (t(n | 0), o) | 0
        }
        s = ((r(l | 0) | 0) - (r(i | 0) | 0)) | 0
        if (s >>> 0 <= 30) {
          v = (s + 1) | 0
          p = (31 - s) | 0
          w = v
          x = (i << p) | (g >>> (v >>> 0))
          y = i >>> (v >>> 0)
          z = 0
          A = g << p
          break
        }
        if (!f) {
          n = 0
          o = 0
          return (t(n | 0), o) | 0
        }
        c[f >> 2] = a | 0
        c[(f + 4) >> 2] = h | (b & 0)
        n = 0
        o = 0
        return (t(n | 0), o) | 0
      }
    while (0)
    if (!w) {
      E = A
      F = z
      G = y
      H = x
      I = 0
      J = 0
    } else {
      b = d | 0 | 0
      d = k | (e & 0)
      e = Vb(b | 0, d | 0, -1, -1) | 0
      k = u() | 0
      h = A
      A = z
      z = y
      y = x
      x = w
      w = 0
      do {
        a = h
        h = (A >>> 31) | (h << 1)
        A = w | (A << 1)
        g = (y << 1) | (a >>> 31) | 0
        a = (y >>> 31) | (z << 1) | 0
        Wb(e | 0, k | 0, g | 0, a | 0) | 0
        i = u() | 0
        l = (i >> 31) | (((i | 0) < 0 ? -1 : 0) << 1)
        w = l & 1
        y =
          Wb(
            g | 0,
            a | 0,
            (l & b) | 0,
            (((((i | 0) < 0 ? -1 : 0) >> 31) | (((i | 0) < 0 ? -1 : 0) << 1)) &
              d) |
              0
          ) | 0
        z = u() | 0
        x = (x - 1) | 0
      } while ((x | 0) != 0)
      E = h
      F = A
      G = z
      H = y
      I = 0
      J = w
    }
    w = F
    F = 0
    if (f | 0) {
      c[f >> 2] = H
      c[(f + 4) >> 2] = G
    }
    n = ((w | 0) >>> 31) | ((E | F) << 1) | (((F << 1) | (w >>> 31)) & 0) | I
    o = (((w << 1) | (0 >>> 31)) & -2) | J
    return (t(n | 0), o) | 0
  }
  function Zb(a, b, c, d) {
    a = a | 0
    b = b | 0
    c = c | 0
    d = d | 0
    return Yb(a, b, c, d, 0) | 0
  }
  function _b(a, b, c) {
    a = a | 0
    b = b | 0
    c = c | 0
    if ((c | 0) < 32) {
      t((b >>> c) | 0)
      return (a >>> c) | ((b & ((1 << c) - 1)) << (32 - c))
    }
    t(0)
    return (b >>> (c - 32)) | 0
  }
  function $b(a, b, c) {
    a = a | 0
    b = b | 0
    c = c | 0
    if ((c | 0) < 32) {
      t((b << c) | ((a & (((1 << c) - 1) << (32 - c))) >>> (32 - c)) | 0)
      return a << c
    }
    t((a << (c - 32)) | 0)
    return 0
  }
  function ac() {
    return 6832
  }
  function bc(b, d, e) {
    b = b | 0
    d = d | 0
    e = e | 0
    var f = 0,
      g = 0,
      h = 0
    if ((e | 0) >= 512) {
      E(b | 0, d | 0, e | 0) | 0
      return b | 0
    }
    f = b | 0
    g = (b + e) | 0
    if ((b & 3) == (d & 3)) {
      while (b & 3) {
        if (!e) return f | 0
        a[b >> 0] = a[d >> 0] | 0
        b = (b + 1) | 0
        d = (d + 1) | 0
        e = (e - 1) | 0
      }
      h = (g & -4) | 0
      e = (h - 64) | 0
      while ((b | 0) <= (e | 0)) {
        c[b >> 2] = c[d >> 2]
        c[(b + 4) >> 2] = c[(d + 4) >> 2]
        c[(b + 8) >> 2] = c[(d + 8) >> 2]
        c[(b + 12) >> 2] = c[(d + 12) >> 2]
        c[(b + 16) >> 2] = c[(d + 16) >> 2]
        c[(b + 20) >> 2] = c[(d + 20) >> 2]
        c[(b + 24) >> 2] = c[(d + 24) >> 2]
        c[(b + 28) >> 2] = c[(d + 28) >> 2]
        c[(b + 32) >> 2] = c[(d + 32) >> 2]
        c[(b + 36) >> 2] = c[(d + 36) >> 2]
        c[(b + 40) >> 2] = c[(d + 40) >> 2]
        c[(b + 44) >> 2] = c[(d + 44) >> 2]
        c[(b + 48) >> 2] = c[(d + 48) >> 2]
        c[(b + 52) >> 2] = c[(d + 52) >> 2]
        c[(b + 56) >> 2] = c[(d + 56) >> 2]
        c[(b + 60) >> 2] = c[(d + 60) >> 2]
        b = (b + 64) | 0
        d = (d + 64) | 0
      }
      while ((b | 0) < (h | 0)) {
        c[b >> 2] = c[d >> 2]
        b = (b + 4) | 0
        d = (d + 4) | 0
      }
    } else {
      h = (g - 4) | 0
      while ((b | 0) < (h | 0)) {
        a[b >> 0] = a[d >> 0] | 0
        a[(b + 1) >> 0] = a[(d + 1) >> 0] | 0
        a[(b + 2) >> 0] = a[(d + 2) >> 0] | 0
        a[(b + 3) >> 0] = a[(d + 3) >> 0] | 0
        b = (b + 4) | 0
        d = (d + 4) | 0
      }
    }
    while ((b | 0) < (g | 0)) {
      a[b >> 0] = a[d >> 0] | 0
      b = (b + 1) | 0
      d = (d + 1) | 0
    }
    return f | 0
  }
  function cc(b, c, d) {
    b = b | 0
    c = c | 0
    d = d | 0
    var e = 0
    if (((c | 0) < (b | 0)) & ((b | 0) < ((c + d) | 0))) {
      e = b
      c = (c + d) | 0
      b = (b + d) | 0
      while ((d | 0) > 0) {
        b = (b - 1) | 0
        c = (c - 1) | 0
        d = (d - 1) | 0
        a[b >> 0] = a[c >> 0] | 0
      }
      b = e
    } else bc(b, c, d) | 0
    return b | 0
  }
  function dc(b, d, e) {
    b = b | 0
    d = d | 0
    e = e | 0
    var f = 0,
      g = 0,
      h = 0,
      i = 0
    f = (b + e) | 0
    d = d & 255
    if ((e | 0) >= 67) {
      while (b & 3) {
        a[b >> 0] = d
        b = (b + 1) | 0
      }
      g = (f & -4) | 0
      h = d | (d << 8) | (d << 16) | (d << 24)
      i = (g - 64) | 0
      while ((b | 0) <= (i | 0)) {
        c[b >> 2] = h
        c[(b + 4) >> 2] = h
        c[(b + 8) >> 2] = h
        c[(b + 12) >> 2] = h
        c[(b + 16) >> 2] = h
        c[(b + 20) >> 2] = h
        c[(b + 24) >> 2] = h
        c[(b + 28) >> 2] = h
        c[(b + 32) >> 2] = h
        c[(b + 36) >> 2] = h
        c[(b + 40) >> 2] = h
        c[(b + 44) >> 2] = h
        c[(b + 48) >> 2] = h
        c[(b + 52) >> 2] = h
        c[(b + 56) >> 2] = h
        c[(b + 60) >> 2] = h
        b = (b + 64) | 0
      }
      while ((b | 0) < (g | 0)) {
        c[b >> 2] = h
        b = (b + 4) | 0
      }
    }
    while ((b | 0) < (f | 0)) {
      a[b >> 0] = d
      b = (b + 1) | 0
    }
    return (f - e) | 0
  }
  function ec(a, b) {
    a = a | 0
    b = b | 0
    return O[a & 3](b | 0) | 0
  }
  function fc(a, b, c, d, e, f, g) {
    a = a | 0
    b = b | 0
    c = +c
    d = d | 0
    e = e | 0
    f = f | 0
    g = g | 0
    return P[a & 1](b | 0, +c, d | 0, e | 0, f | 0, g | 0) | 0
  }
  function gc(a, b, c) {
    a = a | 0
    b = b | 0
    c = c | 0
    return Q[a & 0](b | 0, c | 0) | 0
  }
  function hc(a, b, c, d) {
    a = a | 0
    b = b | 0
    c = c | 0
    d = d | 0
    return R[a & 3](b | 0, c | 0, d | 0) | 0
  }
  function ic(a, b, c, d, e) {
    a = a | 0
    b = b | 0
    c = c | 0
    d = d | 0
    e = e | 0
    return S[a & 3](b | 0, c | 0, d | 0, e | 0) | 0
  }
  function jc(a, b, c) {
    a = a | 0
    b = b | 0
    c = c | 0
    T[a & 1](b | 0, c | 0)
  }
  function kc(a) {
    a = a | 0
    s(0)
    return 0
  }
  function lc(a, b, c, d, e, f) {
    a = a | 0
    b = +b
    c = c | 0
    d = d | 0
    e = e | 0
    f = f | 0
    s(1)
    return 0
  }
  function mc(a, b) {
    a = a | 0
    b = b | 0
    s(2)
    return 0
  }
  function nc(a, b, c) {
    a = a | 0
    b = b | 0
    c = c | 0
    s(3)
    return 0
  }
  function oc(a, b, c, d) {
    a = a | 0
    b = b | 0
    c = c | 0
    d = d | 0
    s(4)
    return 0
  }
  function pc(a, b) {
    a = a | 0
    b = b | 0
    s(5)
  }

  // EMSCRIPTEN_END_FUNCS
  var O = [kc, Ha, Oa, kc]
  var P = [lc, Ua]
  var Q = [mc]
  var R = [nc, Ia, Na, nc]
  var S = [oc, Ja, Pa, oc]
  var T = [pc, Va]
  return {
    ___errno_location: La,
    ___muldi3: Ub,
    ___udivdi3: Zb,
    _bitshift64Lshr: _b,
    _bitshift64Shl: $b,
    _emscripten_get_sbrk_ptr: ac,
    _emscripten_replace_memory: N,
    _free: Rb,
    _i64Add: Vb,
    _i64Subtract: Wb,
    _main: X,
    _malloc: Qb,
    _memcpy: bc,
    _memmove: cc,
    _memset: dc,
    dynCall_ii: ec,
    dynCall_iidiiii: fc,
    dynCall_iii: gc,
    dynCall_iiii: hc,
    dynCall_iiiii: ic,
    dynCall_vii: jc,
    stackAlloc: U,
    stackRestore: W,
    stackSave: V,
  }
})(
  // EMSCRIPTEN_END_ASM
  asmGlobalArg,
  asmLibraryArg,
  buffer
)
var ___errno_location = (Module['___errno_location'] = asm['___errno_location'])
var ___muldi3 = (Module['___muldi3'] = asm['___muldi3'])
var ___udivdi3 = (Module['___udivdi3'] = asm['___udivdi3'])
var _bitshift64Lshr = (Module['_bitshift64Lshr'] = asm['_bitshift64Lshr'])
var _bitshift64Shl = (Module['_bitshift64Shl'] = asm['_bitshift64Shl'])
var _emscripten_get_sbrk_ptr = (Module['_emscripten_get_sbrk_ptr'] =
  asm['_emscripten_get_sbrk_ptr'])
var _emscripten_replace_memory = (Module['_emscripten_replace_memory'] =
  asm['_emscripten_replace_memory'])
var _free = (Module['_free'] = asm['_free'])
var _i64Add = (Module['_i64Add'] = asm['_i64Add'])
var _i64Subtract = (Module['_i64Subtract'] = asm['_i64Subtract'])
var _main = (Module['_main'] = asm['_main'])
var _malloc = (Module['_malloc'] = asm['_malloc'])
var _memcpy = (Module['_memcpy'] = asm['_memcpy'])
var _memmove = (Module['_memmove'] = asm['_memmove'])
var _memset = (Module['_memset'] = asm['_memset'])
var stackAlloc = (Module['stackAlloc'] = asm['stackAlloc'])
var stackRestore = (Module['stackRestore'] = asm['stackRestore'])
var stackSave = (Module['stackSave'] = asm['stackSave'])
var dynCall_ii = (Module['dynCall_ii'] = asm['dynCall_ii'])
var dynCall_iidiiii = (Module['dynCall_iidiiii'] = asm['dynCall_iidiiii'])
var dynCall_iii = (Module['dynCall_iii'] = asm['dynCall_iii'])
var dynCall_iiii = (Module['dynCall_iiii'] = asm['dynCall_iiii'])
var dynCall_iiiii = (Module['dynCall_iiiii'] = asm['dynCall_iiiii'])
var dynCall_vii = (Module['dynCall_vii'] = asm['dynCall_vii'])
Module['asm'] = asm
Module['callMain'] = callMain
if (memoryInitializer) {
  if (!isDataURI(memoryInitializer)) {
    memoryInitializer = locateFile(memoryInitializer)
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = readBinary(memoryInitializer)
    HEAPU8.set(data, GLOBAL_BASE)
  } else {
    addRunDependency('memory initializer')
    var applyMemoryInitializer = function(data) {
      if (data.byteLength) data = new Uint8Array(data)
      HEAPU8.set(data, GLOBAL_BASE)
      if (Module['memoryInitializerRequest'])
        delete Module['memoryInitializerRequest'].response
      removeRunDependency('memory initializer')
    }
    var doBrowserLoad = function() {
      readAsync(memoryInitializer, applyMemoryInitializer, function() {
        throw 'could not load memory initializer ' + memoryInitializer
      })
    }
    var memoryInitializerBytes = tryParseAsDataURI(memoryInitializer)
    if (memoryInitializerBytes) {
      applyMemoryInitializer(memoryInitializerBytes.buffer)
    } else if (Module['memoryInitializerRequest']) {
      var useRequest = function() {
        var request = Module['memoryInitializerRequest']
        var response = request.response
        if (request.status !== 200 && request.status !== 0) {
          var data = tryParseAsDataURI(Module['memoryInitializerRequestURL'])
          if (data) {
            response = data.buffer
          } else {
            console.warn(
              'a problem seems to have happened with Module.memoryInitializerRequest, status: ' +
                request.status +
                ', retrying ' +
                memoryInitializer
            )
            doBrowserLoad()
            return
          }
        }
        applyMemoryInitializer(response)
      }
      if (Module['memoryInitializerRequest'].response) {
        setTimeout(useRequest, 0)
      } else {
        Module['memoryInitializerRequest'].addEventListener('load', useRequest)
      }
    } else {
      doBrowserLoad()
    }
  }
}
var calledRun
function ExitStatus(status) {
  this.name = 'ExitStatus'
  this.message = 'Program terminated with exit(' + status + ')'
  this.status = status
}
var calledMain = false
dependenciesFulfilled = function runCaller() {
  if (!calledRun) run()
  if (!calledRun) dependenciesFulfilled = runCaller
}
function callMain(args) {
  var entryFunction = Module['_main']
  args = args || []
  var argc = args.length + 1
  var argv = stackAlloc((argc + 1) * 4)
  HEAP32[argv >> 2] = allocateUTF8OnStack(thisProgram)
  for (var i = 1; i < argc; i++) {
    HEAP32[(argv >> 2) + i] = allocateUTF8OnStack(args[i - 1])
  }
  HEAP32[(argv >> 2) + argc] = 0
  try {
    var ret = entryFunction(argc, argv)
    exit(ret, true)
  } catch (e) {
    if (e instanceof ExitStatus) {
      return
    } else if (e == 'unwind') {
      noExitRuntime = true
      return
    } else {
      var toLog = e
      if (e && typeof e === 'object' && e.stack) {
        toLog = [e, e.stack]
      }
      err('exception thrown: ' + toLog)
      quit_(1, e)
    }
  } finally {
    calledMain = true
  }
}
function run(args) {
  args = args || arguments_
  if (runDependencies > 0) {
    return
  }
  preRun()
  if (runDependencies > 0) return
  function doRun() {
    if (calledRun) return
    calledRun = true
    Module['calledRun'] = true
    if (ABORT) return
    initRuntime()
    preMain()
    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']()
    if (shouldRunNow) callMain(args)
    postRun()
  }
  if (Module['setStatus']) {
    Module['setStatus']('Running...')
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('')
      }, 1)
      doRun()
    }, 1)
  } else {
    doRun()
  }
}
Module['run'] = run
function exit(status, implicit) {
  if (implicit && noExitRuntime && status === 0) {
    return
  }
  if (noExitRuntime) {
  } else {
    ABORT = true
    EXITSTATUS = status
    exitRuntime()
    if (Module['onExit']) Module['onExit'](status)
  }
  quit_(status, new ExitStatus(status))
}
if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function')
    Module['preInit'] = [Module['preInit']]
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()()
  }
}
var shouldRunNow = false
if (Module['noInitialRun']) shouldRunNow = false
noExitRuntime = true
run()
Module.mountContainingDirectory = function(filePath) {
  if (!ENVIRONMENT_IS_NODE) {
    return
  }
  var path = require('path')
  var containingDir = path.dirname(filePath)
  if (FS.isDir(containingDir) || containingDir === '/') {
    return
  }
  var currentDir = '/'
  var splitContainingDir = containingDir.split(path.sep)
  for (var ii = 1; ii < splitContainingDir.length; ii++) {
    currentDir += splitContainingDir[ii]
    if (!FS.analyzePath(currentDir).exists) {
      FS.mkdir(currentDir)
    }
    currentDir += '/'
  }
  FS.mount(NODEFS, { root: containingDir }, currentDir)
  return currentDir + path.basename(filePath)
}
Module.unmountContainingDirectory = function(filePath) {
  if (!ENVIRONMENT_IS_NODE) {
    return
  }
  var path = require('path')
  var containingDir = path.dirname(filePath)
  FS.unmount(containingDir)
}
Module.mkdirs = function(dirs) {
  var currentDir = '/'
  var splitDirs = dirs.split('/')
  for (var ii = 1; ii < splitDirs.length; ++ii) {
    currentDir += splitDirs[ii]
    if (!FS.analyzePath(currentDir).exists) {
      FS.mkdir(currentDir)
    }
    currentDir += '/'
  }
}
Module.mountBlobs = function(mountpoint, blobFiles) {
  if (!ENVIRONMENT_IS_WORKER) {
    return
  }
  Module.mkdirs(mountpoint)
  FS.mount(WORKERFS, { blobs: blobFiles, files: [] }, mountpoint)
}
Module.unmountBlobs = function(mountpoint) {
  if (!ENVIRONMENT_IS_WORKER) {
    return
  }
  FS.unmount(mountpoint)
}
Module.readFile = function(path, opts) {
  return FS.readFile(path, opts)
}
Module.writeFile = function(path, data, opts) {
  return FS.writeFile(path, data, opts)
}
Module.unlink = function(path) {
  return FS.unlink(path)
}

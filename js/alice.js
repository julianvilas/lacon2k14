/**
 * @param {?} data
 * @return {undefined}
 */
function globalEval(data) {
  eval.call(null, data);
}
/**
 * @param {boolean} mayParseLabeledStatementInstead
 * @param {string} guard
 * @return {undefined}
 */
function assert(mayParseLabeledStatementInstead, guard) {
  if (!mayParseLabeledStatementInstead) {
    abort("Assertion failed: " + guard);
  }
}
/**
 * @param {string} dataName
 * @param {string} fix
 * @param {Array} deepDataAndEvents
 * @param {Object} walkers
 * @return {?}
 */
function ccall(dataName, fix, deepDataAndEvents, walkers) {
  return ccallFunc(getCFunc(dataName), fix, deepDataAndEvents, walkers);
}
/**
 * @param {string} i
 * @return {?}
 */
function getCFunc(i) {
  try {
    var r = Module["_" + i];
    if (!r) {
      /** @type {*} */
      r = eval("_" + i);
    }
  } catch (e) {
  }
  assert(r, "Cannot call unknown function " + i + " (perhaps LLVM optimizations or closure removed it?)");
  return r;
}
/**
 * @param {Function} callback
 * @param {string} type
 * @param {(Array|Uint8Array|string)} deepDataAndEvents
 * @param {Array} obj
 * @return {?}
 */
function ccallFunc(callback, type, deepDataAndEvents, obj) {
  /**
   * @param {string} v
   * @param {string} type
   * @return {?}
   */
  function getType(v, type) {
    if (type == "string") {
      if (v === null || (v === undefined || v === 0)) {
        return 0;
      }
      v = intArrayFromString(v);
      /** @type {string} */
      type = "array";
    }
    if (type == "array") {
      if (!udataCur) {
        udataCur = Runtime.stackSave();
      }
      var failuresLink = Runtime.stackAlloc(v.length);
      writeArrayToMemory(v, failuresLink);
      return failuresLink;
    }
    return v;
  }
  /**
   * @param {number} d
   * @param {string} type
   * @return {?}
   */
  function handler(d, type) {
    if (type == "string") {
      return Pointer_stringify(d);
    }
    assert(type != "array");
    return d;
  }
  /** @type {number} */
  var udataCur = 0;
  /** @type {number} */
  var u = 0;
  var args = obj ? obj.map(function(event) {
    return getType(event, deepDataAndEvents[u++]);
  }) : [];
  var h = handler(callback.apply(null, args), type);
  if (udataCur) {
    Runtime.stackRestore(udataCur);
  }
  return h;
}
/**
 * @param {string} dataName
 * @param {string} fix
 * @param {Array} deepDataAndEvents
 * @return {?}
 */
function cwrap(dataName, fix, deepDataAndEvents) {
  var restoreScript = getCFunc(dataName);
  return function() {
    return ccallFunc(restoreScript, fix, deepDataAndEvents, Array.prototype.slice.call(arguments));
  };
}
/**
 * @param {number} path
 * @param {number} val
 * @param {string} type
 * @param {?} newValue
 * @return {undefined}
 */
function setValue(path, val, type, newValue) {
  type = type || "i8";
  if (type.charAt(type.length - 1) === "*") {
    /** @type {string} */
    type = "i32";
  }
  switch(type) {
    case "i1":
      /** @type {number} */
      HEAP8[path] = val;
      break;
    case "i8":
      /** @type {number} */
      HEAP8[path] = val;
      break;
    case "i16":
      /** @type {number} */
      HEAP16[path >> 1] = val;
      break;
    case "i32":
      /** @type {number} */
      HEAP32[path >> 2] = val;
      break;
    case "i64":
      /** @type {Array} */
      tempI64 = [val >>> 0, (tempDouble = val, Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? Math_min(Math_floor(tempDouble / 4294967296), 4294967295) >>> 0 : ~~Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)];
      HEAP32[path >> 2] = tempI64[0];
      HEAP32[path + 4 >> 2] = tempI64[1];
      break;
    case "float":
      /** @type {number} */
      HEAPF32[path >> 2] = val;
      break;
    case "double":
      /** @type {number} */
      HEAPF64[path >> 3] = val;
      break;
    default:
      abort("invalid type for setValue: " + type);
  }
}
/**
 * @param {number} code
 * @param {string} type
 * @param {?} defaultValue
 * @return {?}
 */
function getValue(code, type, defaultValue) {
  type = type || "i8";
  if (type.charAt(type.length - 1) === "*") {
    /** @type {string} */
    type = "i32";
  }
  switch(type) {
    case "i1":
      return HEAP8[code];
    case "i8":
      return HEAP8[code];
    case "i16":
      return HEAP16[code >> 1];
    case "i32":
      return HEAP32[code >> 2];
    case "i64":
      return HEAP32[code >> 2];
    case "float":
      return HEAPF32[code >> 2];
    case "double":
      return HEAPF64[code >> 3];
    default:
      abort("invalid type for setValue: " + type);
  }
  return null;
}
/**
 * @param {number} array
 * @param {string} selector
 * @param {(number|string)} count
 * @param {number} tmp
 * @return {?}
 */
function allocate(array, selector, count, tmp) {
  var i;
  var s;
  if (typeof array === "number") {
    /** @type {boolean} */
    i = true;
    /** @type {number} */
    s = array;
  } else {
    /** @type {boolean} */
    i = false;
    s = array.length;
  }
  /** @type {(null|string)} */
  var fn = typeof selector === "string" ? selector : null;
  var data;
  if (count == ALLOC_NONE) {
    /** @type {number} */
    data = tmp;
  } else {
    data = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][count === undefined ? ALLOC_STATIC : count](Math.max(s, fn ? 1 : selector.length));
  }
  if (i) {
    tmp = data;
    var str;
    assert((data & 3) == 0);
    str = data + (s & ~3);
    for (;tmp < str;tmp += 4) {
      /** @type {number} */
      HEAP32[tmp >> 2] = 0;
    }
    str = data + s;
    for (;tmp < str;) {
      /** @type {number} */
      HEAP8[tmp++ | 0] = 0;
    }
    return data;
  }
  if (fn === "i8") {
    if (array.subarray || array.slice) {
      HEAPU8.set(array, data);
    } else {
      HEAPU8.set(new Uint8Array(array), data);
    }
    return data;
  }
  /** @type {number} */
  var name = 0;
  var e;
  var ext;
  var le;
  for (;name < s;) {
    var value = array[name];
    if (typeof value === "function") {
      value = Runtime.getFunctionIndex(value);
    }
    e = fn || selector[name];
    if (e === 0) {
      name++;
      continue;
    }
    assert(e, "Must know what type to store in allocate!");
    if (e == "i64") {
      /** @type {string} */
      e = "i32";
    }
    setValue(data + name, value, e);
    if (le !== e) {
      ext = Runtime.getNativeTypeSize(e);
      le = e;
    }
    name += ext;
  }
  return data;
}
/**
 * @param {number} s
 * @param {number} b
 * @return {?}
 */
function Pointer_stringify(s, b) {
  /** @type {boolean} */
  var n = false;
  var copy;
  /** @type {number} */
  var a = 0;
  for (;1;) {
    assert(s + a < TOTAL_MEMORY);
    copy = HEAPU8[s + a | 0];
    if (copy >= 128) {
      /** @type {boolean} */
      n = true;
    } else {
      if (copy == 0 && !b) {
        break;
      }
    }
    a++;
    if (b && a == b) {
      break;
    }
  }
  if (!b) {
    /** @type {number} */
    b = a;
  }
  /** @type {string} */
  var pre = "";
  if (!n) {
    /** @type {number} */
    var e = 1024;
    var id;
    for (;b > 0;) {
      /** @type {string} */
      id = String.fromCharCode.apply(String, HEAPU8.subarray(s, s + Math.min(b, e)));
      /** @type {string} */
      pre = pre ? pre + id : id;
      s += e;
      b -= e;
    }
    return pre;
  }
  var jQuery = new Runtime.UTF8Processor;
  /** @type {number} */
  a = 0;
  for (;a < b;a++) {
    assert(s + a < TOTAL_MEMORY);
    copy = HEAPU8[s + a | 0];
    pre += jQuery.processCChar(copy);
  }
  return pre;
}
/**
 * @param {number} a
 * @return {?}
 */
function UTF16ToString(a) {
  /** @type {number} */
  var x = 0;
  /** @type {string} */
  var optsData = "";
  for (;1;) {
    var lo = HEAP16[a + x * 2 >> 1];
    if (lo == 0) {
      return optsData;
    }
    ++x;
    optsData += String.fromCharCode(lo);
  }
}
/**
 * @param {string} a
 * @param {number} time
 * @return {undefined}
 */
function stringToUTF16(a, time) {
  /** @type {number} */
  var i = 0;
  for (;i < a.length;++i) {
    var bc = a.charCodeAt(i);
    HEAP16[time + i * 2 >> 1] = bc;
  }
  /** @type {number} */
  HEAP16[time + a.length * 2 >> 1] = 0;
}
/**
 * @param {number} a
 * @return {?}
 */
function UTF32ToString(a) {
  /** @type {number} */
  var x = 0;
  /** @type {string} */
  var str = "";
  for (;1;) {
    var b = HEAP32[a + x * 4 >> 2];
    if (b == 0) {
      return str;
    }
    ++x;
    if (b >= 65536) {
      /** @type {number} */
      var db = b - 65536;
      str += String.fromCharCode(55296 | db >> 10, 56320 | db & 1023);
    } else {
      str += String.fromCharCode(b);
    }
  }
}
/**
 * @param {string} binary
 * @param {number} a
 * @return {undefined}
 */
function stringToUTF32(binary, a) {
  /** @type {number} */
  var x = 0;
  /** @type {number} */
  var i = 0;
  for (;i < binary.length;++i) {
    var ch = binary.charCodeAt(i);
    if (ch >= 55296 && ch <= 57343) {
      var s = binary.charCodeAt(++i);
      /** @type {number} */
      ch = 65536 + ((ch & 1023) << 10) | s & 1023;
    }
    HEAP32[a + x * 4 >> 2] = ch;
    ++x;
  }
  /** @type {number} */
  HEAP32[a + x * 4 >> 2] = 0;
}
/**
 * @param {string} data
 * @return {?}
 */
function demangle(data) {
  try {
    if (data == "Object._main" || data == "_main") {
      return "main()";
    }
    if (typeof data === "number") {
      data = Pointer_stringify(data);
    }
    if (data[0] !== "_") {
      return data;
    }
    if (data[1] !== "_") {
      return data;
    }
    if (data[2] !== "Z") {
      return data;
    }
    switch(data[3]) {
      case "n":
        return "operator new()";
      case "d":
        return "operator delete()";
    }
    /** @type {number} */
    var j = 3;
    var object = {
      v : "void",
      b : "bool",
      c : "char",
      s : "short",
      i : "int",
      l : "long",
      f : "float",
      d : "double",
      w : "wchar_t",
      a : "signed char",
      h : "unsigned char",
      t : "unsigned short",
      j : "unsigned int",
      m : "unsigned long",
      x : "long long",
      y : "unsigned long long",
      z : "..."
    };
    /**
     * @param {?} text
     * @return {undefined}
     */
    var print = function(text) {
      if (text) {
        Module.print(text);
      }
      Module.print(data);
      /** @type {string} */
      var query = "";
      /** @type {number} */
      var i = 0;
      for (;i < j;i++) {
        query += " ";
      }
      Module.print(query + "^");
    };
    /** @type {Array} */
    var paragraph = [];
    /**
     * @return {?}
     */
    var render = function() {
      j++;
      if (data[j] === "K") {
        j++;
      }
      /** @type {Array} */
      var results = [];
      for (;data[j] !== "E";) {
        if (data[j] === "S") {
          j++;
          var p = data.indexOf("_", j);
          var i = data.substring(j, p) || 0;
          results.push(paragraph[i] || "?");
          j = p + 1;
          continue;
        }
        if (data[j] === "C") {
          results.push(results[results.length - 1]);
          j += 2;
          continue;
        }
        /** @type {number} */
        var index = parseInt(data.substr(j));
        /** @type {number} */
        var offset = index.toString().length;
        if (!index || !offset) {
          j--;
          break;
        }
        var child = data.substr(j + offset, index);
        results.push(child);
        paragraph.push(child);
        j += offset + index;
      }
      j++;
      return results;
    };
    /** @type {boolean} */
    var K = true;
    /**
     * @param {boolean} dataAndEvents
     * @param {number} deepDataAndEvents
     * @param {boolean} keepData
     * @return {?}
     */
    var formatNumber = function(dataAndEvents, deepDataAndEvents, keepData) {
      /**
       * @return {?}
       */
      function zeroPad() {
        return "(" + result.join(", ") + ")";
      }
      deepDataAndEvents = deepDataAndEvents || Infinity;
      /** @type {string} */
      var fields = "";
      /** @type {Array} */
      var result = [];
      var val;
      if (data[j] === "N") {
        val = render().join("::");
        deepDataAndEvents--;
        if (deepDataAndEvents === 0) {
          return dataAndEvents ? [val] : val;
        }
      } else {
        if (data[j] === "K" || K && data[j] === "L") {
          j++;
        }
        /** @type {number} */
        var i = parseInt(data.substr(j));
        if (i) {
          /** @type {number} */
          var offset = i.toString().length;
          val = data.substr(j + offset, i);
          j += offset + i;
        }
      }
      /** @type {boolean} */
      K = false;
      if (data[j] === "I") {
        j++;
        var num = formatNumber(true);
        var totalPercent = formatNumber(true, 1, true);
        fields += totalPercent[0] + " " + val + "<" + num.join(", ") + ">";
      } else {
        fields = val;
      }
      e: for (;j < data.length && deepDataAndEvents-- > 0;) {
        var property = data[j++];
        if (property in object) {
          result.push(object[property]);
        } else {
          switch(property) {
            case "P":
              result.push(formatNumber(true, 1, true)[0] + "*");
              break;
            case "R":
              result.push(formatNumber(true, 1, true)[0] + "&");
              break;
            case "L":
              j++;
              var n = data.indexOf("E", j);
              /** @type {number} */
              i = n - j;
              result.push(data.substr(j, i));
              j += i + 2;
              break;
            case "A":
              /** @type {number} */
              i = parseInt(data.substr(j));
              j += i.toString().length;
              if (data[j] !== "_") {
                throw "?";
              }
              j++;
              result.push(formatNumber(true, 1, true)[0] + " [" + i + "]");
              break;
            case "E":
              break e;
            default:
              fields += "?" + property;
              break e;
          }
        }
      }
      if (!keepData && (result.length === 1 && result[0] === "void")) {
        /** @type {Array} */
        result = [];
      }
      return dataAndEvents ? result : fields + zeroPad();
    };
    return formatNumber();
  } catch (a) {
    return data;
  }
}
/**
 * @param {string} messageFormat
 * @return {?}
 */
function demangleAll(messageFormat) {
  return messageFormat.replace(/__Z[\w\d_]+/g, function(x) {
    var y = demangle(x);
    return x === y ? x : x + " [" + y + "]";
  });
}
/**
 * @return {?}
 */
function stackTrace() {
  /** @type {string} */
  var message = (new Error).stack;
  return message ? demangleAll(message) : "(no stack trace available)";
}
/**
 * @param {number} dataAndEvents
 * @return {?}
 */
function alignMemoryPage(dataAndEvents) {
  return dataAndEvents + 4095 & -4096;
}
/**
 * @return {undefined}
 */
function enlargeMemory() {
  abort("Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.");
}
/**
 * @param {Array} pathConfig
 * @return {undefined}
 */
function callRuntimeCallbacks(pathConfig) {
  for (;pathConfig.length > 0;) {
    var opts = pathConfig.shift();
    if (typeof opts == "function") {
      opts();
      continue;
    }
    var r = opts.func;
    if (typeof r === "number") {
      if (opts.arg === undefined) {
        Runtime.dynCall("v", r);
      } else {
        Runtime.dynCall("vi", r, [opts.arg]);
      }
    } else {
      r(opts.arg === undefined ? null : opts.arg);
    }
  }
}
/**
 * @return {undefined}
 */
function preRun() {
  if (Module["preRun"]) {
    if (typeof Module["preRun"] == "function") {
      /** @type {Array} */
      Module["preRun"] = [Module["preRun"]];
    }
    for (;Module["preRun"].length;) {
      addOnPreRun(Module["preRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}
/**
 * @return {undefined}
 */
function ensureInitRuntime() {
  if (runtimeInitialized) {
    return;
  }
  /** @type {boolean} */
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}
/**
 * @return {undefined}
 */
function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}
/**
 * @return {undefined}
 */
function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
}
/**
 * @return {undefined}
 */
function postRun() {
  if (Module["postRun"]) {
    if (typeof Module["postRun"] == "function") {
      /** @type {Array} */
      Module["postRun"] = [Module["postRun"]];
    }
    for (;Module["postRun"].length;) {
      addOnPostRun(Module["postRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}
/**
 * @param {?} suite
 * @return {undefined}
 */
function addOnPreRun(suite) {
  __ATPRERUN__.unshift(suite);
}
/**
 * @param {?} suite
 * @return {undefined}
 */
function addOnInit(suite) {
  __ATINIT__.unshift(suite);
}
/**
 * @param {?} suite
 * @return {undefined}
 */
function addOnPreMain(suite) {
  __ATMAIN__.unshift(suite);
}
/**
 * @param {?} suite
 * @return {undefined}
 */
function addOnExit(suite) {
  __ATEXIT__.unshift(suite);
}
/**
 * @param {?} suite
 * @return {undefined}
 */
function addOnPostRun(suite) {
  __ATPOSTRUN__.unshift(suite);
}
/**
 * @param {string} value
 * @param {boolean} deepDataAndEvents
 * @param {number} e
 * @return {?}
 */
function intArrayFromString(value, deepDataAndEvents, e) {
  var a = (new Runtime.UTF8Processor).processJSString(value);
  if (e) {
    /** @type {number} */
    a.length = e;
  }
  if (!deepDataAndEvents) {
    a.push(0);
  }
  return a;
}
/**
 * @param {Array} ca
 * @return {?}
 */
function intArrayToString(ca) {
  /** @type {Array} */
  var tagNameArr = [];
  /** @type {number} */
  var i = 0;
  for (;i < ca.length;i++) {
    var c = ca[i];
    if (c > 255) {
      assert(false, "Character code " + c + " (" + String.fromCharCode(c) + ")  at offset " + i + " not in 0x00-0xFF.");
      c &= 255;
    }
    tagNameArr.push(String.fromCharCode(c));
  }
  return tagNameArr.join("");
}
/**
 * @param {string} isXML
 * @param {number} _
 * @param {boolean} deepDataAndEvents
 * @return {undefined}
 */
function writeStringToMemory(isXML, _, deepDataAndEvents) {
  var resultItems = intArrayFromString(isXML, deepDataAndEvents);
  /** @type {number} */
  var i = 0;
  for (;i < resultItems.length;) {
    var result = resultItems[i];
    HEAP8[_ + i | 0] = result;
    /** @type {number} */
    i = i + 1;
  }
}
/**
 * @param {Array} codeSegments
 * @param {number} el
 * @return {undefined}
 */
function writeArrayToMemory(codeSegments, el) {
  /** @type {number} */
  var i = 0;
  for (;i < codeSegments.length;i++) {
    HEAP8[el + i | 0] = codeSegments[i];
  }
}
/**
 * @param {string} a
 * @param {number} pointer
 * @param {?} dataAndEvents
 * @return {undefined}
 */
function writeAsciiToMemory(a, pointer, dataAndEvents) {
  /** @type {number} */
  var i = 0;
  for (;i < a.length;i++) {
    assert(a.charCodeAt(i) === a.charCodeAt(i) & 255);
    HEAP8[pointer + i | 0] = a.charCodeAt(i);
  }
  if (!dataAndEvents) {
    /** @type {number} */
    HEAP8[pointer + a.length | 0] = 0;
  }
}
/**
 * @param {number} string
 * @param {number} i
 * @param {number} dataAndEvents
 * @param {?} deepDataAndEvents
 * @return {?}
 */
function unSign(string, i, dataAndEvents, deepDataAndEvents) {
  if (string >= 0) {
    return string;
  }
  return i <= 32 ? 2 * Math.abs(1 << i - 1) + string : Math.pow(2, i) + string;
}
/**
 * @param {number} x
 * @param {number} exponentBits
 * @param {number} dataAndEvents
 * @param {?} deepDataAndEvents
 * @return {?}
 */
function reSign(x, exponentBits, dataAndEvents, deepDataAndEvents) {
  if (x <= 0) {
    return x;
  }
  /** @type {number} */
  var y = exponentBits <= 32 ? Math.abs(1 << exponentBits - 1) : Math.pow(2, exponentBits - 1);
  if (x >= y && (exponentBits <= 32 || x > y)) {
    x = -2 * y + x;
  }
  return x;
}
/**
 * @param {string} timeoutKey
 * @return {undefined}
 */
function addRunDependency(timeoutKey) {
  runDependencies++;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies);
  }
  if (timeoutKey) {
    assert(!runDependencyTracking[timeoutKey]);
    /** @type {number} */
    runDependencyTracking[timeoutKey] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== "undefined") {
      /** @type {number} */
      runDependencyWatcher = setInterval(function() {
        /** @type {boolean} */
        var e = false;
        var control;
        for (control in runDependencyTracking) {
          if (!e) {
            /** @type {boolean} */
            e = true;
            Module.printErr("still waiting on run dependencies:");
          }
          Module.printErr("dependency: " + control);
        }
        if (e) {
          Module.printErr("(end of list)");
        }
      }, 1E4);
    }
  } else {
    Module.printErr("warning: run dependency added without ID");
  }
}
/**
 * @param {string} index
 * @return {undefined}
 */
function removeRunDependency(index) {
  runDependencies--;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies);
  }
  if (index) {
    assert(runDependencyTracking[index]);
    delete runDependencyTracking[index];
  } else {
    Module.printErr("warning: run dependency removed without ID");
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      /** @type {null} */
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      /** @type {function (): undefined} */
      var throttledUpdate = dependenciesFulfilled;
      /** @type {null} */
      dependenciesFulfilled = null;
      throttledUpdate();
    }
  }
}
/**
 * @return {undefined}
 */
function runPostSets() {
}
/**
 * @param {number} timeoutKey
 * @return {undefined}
 */
function copyTempFloat(timeoutKey) {
  HEAP8[tempDoublePtr] = HEAP8[timeoutKey];
  HEAP8[tempDoublePtr + 1] = HEAP8[timeoutKey + 1];
  HEAP8[tempDoublePtr + 2] = HEAP8[timeoutKey + 2];
  HEAP8[tempDoublePtr + 3] = HEAP8[timeoutKey + 3];
}
/**
 * @param {number} timeoutKey
 * @return {undefined}
 */
function copyTempDouble(timeoutKey) {
  HEAP8[tempDoublePtr] = HEAP8[timeoutKey];
  HEAP8[tempDoublePtr + 1] = HEAP8[timeoutKey + 1];
  HEAP8[tempDoublePtr + 2] = HEAP8[timeoutKey + 2];
  HEAP8[tempDoublePtr + 3] = HEAP8[timeoutKey + 3];
  HEAP8[tempDoublePtr + 4] = HEAP8[timeoutKey + 4];
  HEAP8[tempDoublePtr + 5] = HEAP8[timeoutKey + 5];
  HEAP8[tempDoublePtr + 6] = HEAP8[timeoutKey + 6];
  HEAP8[tempDoublePtr + 7] = HEAP8[timeoutKey + 7];
}
/**
 * @param {?} dataAndEvents
 * @return {?}
 */
function ___setErrNo(dataAndEvents) {
  HEAP32[___errno_state >> 2] = dataAndEvents;
  return dataAndEvents;
}
/**
 * @param {?} dataAndEvents
 * @return {undefined}
 */
function _fflush(dataAndEvents) {
}
/**
 * @param {?} data
 * @param {number} recurring
 * @param {number} r
 * @param {?} err
 * @return {?}
 */
function _send(data, recurring, r, err) {
  var newState = SOCKFS.getSocket(data);
  if (!newState) {
    ___setErrNo(ERRNO_CODES.EBADF);
    return-1;
  }
  return _write(data, recurring, r);
}
/**
 * @param {?} fileName
 * @param {number} recurring
 * @param {number} length
 * @param {number} positionError
 * @return {?}
 */
function _pwrite(fileName, recurring, length, positionError) {
  var fd = FS.getStream(fileName);
  if (!fd) {
    ___setErrNo(ERRNO_CODES.EBADF);
    return-1;
  }
  try {
    var text = HEAP8;
    return FS.write(fd, text, recurring, length, positionError);
  } catch (fmt) {
    FS.handleFSError(fmt);
    return-1;
  }
}
/**
 * @param {?} path
 * @param {number} recurring
 * @param {number} length
 * @return {?}
 */
function _write(path, recurring, length) {
  var fd = FS.getStream(path);
  if (!fd) {
    ___setErrNo(ERRNO_CODES.EBADF);
    return-1;
  }
  try {
    var text = HEAP8;
    return FS.write(fd, text, recurring, length);
  } catch (fmt) {
    FS.handleFSError(fmt);
    return-1;
  }
}
/**
 * @param {number} recurring
 * @param {number} order
 * @param {number} dataAndEvents
 * @param {?} path
 * @return {?}
 */
function _fwrite(recurring, order, dataAndEvents, path) {
  /** @type {number} */
  var firstLength = dataAndEvents * order;
  if (firstLength == 0) {
    return 0;
  }
  var val = _write(path, recurring, firstLength);
  if (val == -1) {
    var stream = FS.getStream(path);
    if (stream) {
      /** @type {boolean} */
      stream.error = true;
    }
    return 0;
  } else {
    return Math.floor(val / order);
  }
}
/**
 * @param {number} b
 * @return {?}
 */
function _strlen(b) {
  /** @type {number} */
  b = b | 0;
  /** @type {number} */
  var g = 0;
  /** @type {number} */
  g = b;
  for (;HEAP8[g];) {
    /** @type {number} */
    g = g + 1 | 0;
  }
  return g - b | 0;
}
/**
 * @param {number} val
 * @return {?}
 */
function __reallyNegative(val) {
  return val < 0 || val === 0 && 1 / val === -Infinity;
}
/**
 * @param {number} opt_attributes
 * @param {?} deepDataAndEvents
 * @return {?}
 */
function __formatString(opt_attributes, deepDataAndEvents) {
  /**
   * @param {string} value
   * @return {?}
   */
  function Number(value) {
    var Number;
    if (value === "double") {
      Number = HEAPF64[deepDataAndEvents + r >> 3];
    } else {
      if (value == "i64") {
        /** @type {Array} */
        Number = [HEAP32[deepDataAndEvents + r >> 2], HEAP32[deepDataAndEvents + (r + 8) >> 2]];
        r += 8;
      } else {
        /** @type {string} */
        value = "i32";
        Number = HEAP32[deepDataAndEvents + r >> 2];
      }
    }
    r += Math.max(Runtime.getNativeFieldSize(value), Runtime.getAlignSize(value, null, true));
    return Number;
  }
  /** @type {number} */
  var count = opt_attributes;
  /** @type {number} */
  var r = 0;
  /** @type {Array} */
  var out = [];
  var copies;
  var n;
  var num;
  for (;1;) {
    var len = count;
    copies = HEAP8[count];
    if (copies === 0) {
      break;
    }
    n = HEAP8[count + 1 | 0];
    if (copies == 37) {
      /** @type {boolean} */
      var l = false;
      /** @type {boolean} */
      var c = false;
      /** @type {boolean} */
      var type = false;
      /** @type {boolean} */
      var isRequired = false;
      /** @type {boolean} */
      var d = false;
      e: for (;1;) {
        switch(n) {
          case 43:
            /** @type {boolean} */
            l = true;
            break;
          case 45:
            /** @type {boolean} */
            c = true;
            break;
          case 35:
            /** @type {boolean} */
            type = true;
            break;
          case 48:
            if (isRequired) {
              break e;
            } else {
              /** @type {boolean} */
              isRequired = true;
              break;
            }
          ;
          case 32:
            /** @type {boolean} */
            d = true;
            break;
          default:
            break e;
        }
        count++;
        n = HEAP8[count + 1 | 0];
      }
      /** @type {number} */
      var arg = 0;
      if (n == 42) {
        arg = Number("i32");
        count++;
        n = HEAP8[count + 1 | 0];
      } else {
        for (;n >= 48 && n <= 57;) {
          /** @type {number} */
          arg = arg * 10 + (n - 48);
          count++;
          n = HEAP8[count + 1 | 0];
        }
      }
      /** @type {boolean} */
      var m = false;
      /** @type {number} */
      var max = -1;
      if (n == 46) {
        /** @type {number} */
        max = 0;
        /** @type {boolean} */
        m = true;
        count++;
        n = HEAP8[count + 1 | 0];
        if (n == 42) {
          max = Number("i32");
          count++;
        } else {
          for (;1;) {
            var cc = HEAP8[count + 1 | 0];
            if (cc < 48 || cc > 57) {
              break;
            }
            /** @type {number} */
            max = max * 10 + (cc - 48);
            count++;
          }
        }
        n = HEAP8[count + 1 | 0];
      }
      if (max === -1) {
        /** @type {number} */
        max = 6;
        /** @type {boolean} */
        m = false;
      }
      var precision;
      switch(String.fromCharCode(n)) {
        case "h":
          var w = HEAP8[count + 2 | 0];
          if (w == 104) {
            count++;
            /** @type {number} */
            precision = 1;
          } else {
            /** @type {number} */
            precision = 2;
          }
          break;
        case "l":
          w = HEAP8[count + 2 | 0];
          if (w == 108) {
            count++;
            /** @type {number} */
            precision = 8;
          } else {
            /** @type {number} */
            precision = 4;
          }
          break;
        case "L":
        ;
        case "q":
        ;
        case "j":
          /** @type {number} */
          precision = 8;
          break;
        case "z":
        ;
        case "t":
        ;
        case "I":
          /** @type {number} */
          precision = 4;
          break;
        default:
          /** @type {null} */
          precision = null;
      }
      if (precision) {
        count++;
      }
      n = HEAP8[count + 1 | 0];
      switch(String.fromCharCode(n)) {
        case "d":
        ;
        case "i":
        ;
        case "u":
        ;
        case "o":
        ;
        case "x":
        ;
        case "X":
        ;
        case "p":
          /** @type {boolean} */
          var E = n == 100 || n == 105;
          /** @type {number} */
          precision = precision || 4;
          num = Number("i" + precision * 8);
          var testCase = num;
          var value;
          if (precision == 8) {
            num = Runtime.makeBigInt(num[0], num[1], n == 117);
          }
          if (precision <= 4) {
            /** @type {number} */
            var mask = Math.pow(256, precision) - 1;
            num = (E ? reSign : unSign)(num & mask, precision * 8);
          }
          /** @type {number} */
          var duration = Math.abs(num);
          /** @type {string} */
          var result = "";
          if (n == 100 || n == 105) {
            if (precision == 8 && i64Math) {
              value = i64Math.stringify(testCase[0], testCase[1], null);
            } else {
              value = reSign(num, 8 * precision, 1).toString(10);
            }
          } else {
            if (n == 117) {
              if (precision == 8 && i64Math) {
                value = i64Math.stringify(testCase[0], testCase[1], true);
              } else {
                value = unSign(num, 8 * precision, 1).toString(10);
              }
              /** @type {number} */
              num = Math.abs(num);
            } else {
              if (n == 111) {
                /** @type {string} */
                value = (type ? "0" : "") + duration.toString(8);
              } else {
                if (n == 120 || n == 88) {
                  /** @type {string} */
                  result = type && num != 0 ? "0x" : "";
                  if (precision == 8 && i64Math) {
                    if (testCase[1]) {
                      /** @type {string} */
                      value = (testCase[1] >>> 0).toString(16);
                      /** @type {string} */
                      var character = (testCase[0] >>> 0).toString(16);
                      for (;character.length < 8;) {
                        /** @type {string} */
                        character = "0" + character;
                      }
                      value += character;
                    } else {
                      /** @type {string} */
                      value = (testCase[0] >>> 0).toString(16);
                    }
                  } else {
                    if (num < 0) {
                      /** @type {number} */
                      num = -num;
                      /** @type {string} */
                      value = (duration - 1).toString(16);
                      /** @type {Array} */
                      var tagNameArr = [];
                      /** @type {number} */
                      var i = 0;
                      for (;i < value.length;i++) {
                        tagNameArr.push((15 - parseInt(value[i], 16)).toString(16));
                      }
                      /** @type {string} */
                      value = tagNameArr.join("");
                      for (;value.length < precision * 2;) {
                        /** @type {string} */
                        value = "f" + value;
                      }
                    } else {
                      /** @type {string} */
                      value = duration.toString(16);
                    }
                  }
                  if (n == 88) {
                    /** @type {string} */
                    result = result.toUpperCase();
                    /** @type {string} */
                    value = value.toUpperCase();
                  }
                } else {
                  if (n == 112) {
                    if (duration === 0) {
                      /** @type {string} */
                      value = "(nil)";
                    } else {
                      /** @type {string} */
                      result = "0x";
                      /** @type {string} */
                      value = duration.toString(16);
                    }
                  }
                }
              }
            }
          }
          if (m) {
            for (;value.length < max;) {
              /** @type {string} */
              value = "0" + value;
            }
          }
          if (num >= 0) {
            if (l) {
              /** @type {string} */
              result = "+" + result;
            } else {
              if (d) {
                /** @type {string} */
                result = " " + result;
              }
            }
          }
          if (value.charAt(0) == "-") {
            /** @type {string} */
            result = "-" + result;
            value = value.substr(1);
          }
          for (;result.length + value.length < arg;) {
            if (c) {
              value += " ";
            } else {
              if (isRequired) {
                /** @type {string} */
                value = "0" + value;
              } else {
                /** @type {string} */
                result = " " + result;
              }
            }
          }
          /** @type {string} */
          value = result + value;
          value.split("").forEach(function(a) {
            out.push(a.charCodeAt(0));
          });
          break;
        case "f":
        ;
        case "F":
        ;
        case "e":
        ;
        case "E":
        ;
        case "g":
        ;
        case "G":
          num = Number("double");
          if (isNaN(num)) {
            /** @type {string} */
            value = "nan";
            /** @type {boolean} */
            isRequired = false;
          } else {
            if (!isFinite(num)) {
              /** @type {string} */
              value = (num < 0 ? "-" : "") + "inf";
              /** @type {boolean} */
              isRequired = false;
            } else {
              /** @type {boolean} */
              var currentStat = false;
              /** @type {number} */
              var p = Math.min(max, 20);
              if (n == 103 || n == 71) {
                /** @type {boolean} */
                currentStat = true;
                max = max || 1;
                /** @type {number} */
                var current = parseInt(num.toExponential(p).split("e")[1], 10);
                if (max > current && current >= -4) {
                  /** @type {number} */
                  n = (n == 103 ? "f" : "F").charCodeAt(0);
                  max -= current + 1;
                } else {
                  /** @type {number} */
                  n = (n == 103 ? "e" : "E").charCodeAt(0);
                  max--;
                }
                /** @type {number} */
                p = Math.min(max, 20);
              }
              if (n == 101 || n == 69) {
                value = num.toExponential(p);
                if (/[eE][-+]\d$/.test(value)) {
                  value = value.slice(0, -1) + "0" + value.slice(-1);
                }
              } else {
                if (n == 102 || n == 70) {
                  value = num.toFixed(p);
                  if (num === 0 && __reallyNegative(num)) {
                    /** @type {string} */
                    value = "-" + value;
                  }
                }
              }
              var match = value.split("e");
              if (currentStat && !type) {
                for (;match[0].length > 1 && (match[0].indexOf(".") != -1 && (match[0].slice(-1) == "0" || match[0].slice(-1) == "."));) {
                  match[0] = match[0].slice(0, -1);
                }
              } else {
                if (type && value.indexOf(".") == -1) {
                  match[0] += ".";
                }
                for (;max > p++;) {
                  match[0] += "0";
                }
              }
              value = match[0] + (match.length > 1 ? "e" + match[1] : "");
              if (n == 69) {
                value = value.toUpperCase();
              }
              if (num >= 0) {
                if (l) {
                  /** @type {string} */
                  value = "+" + value;
                } else {
                  if (d) {
                    /** @type {string} */
                    value = " " + value;
                  }
                }
              }
            }
          }
          for (;value.length < arg;) {
            if (c) {
              value += " ";
            } else {
              if (isRequired && (value[0] == "-" || value[0] == "+")) {
                value = value[0] + "0" + value.slice(1);
              } else {
                /** @type {string} */
                value = (isRequired ? "0" : " ") + value;
              }
            }
          }
          if (n < 97) {
            value = value.toUpperCase();
          }
          value.split("").forEach(function(a) {
            out.push(a.charCodeAt(0));
          });
          break;
        case "s":
          var end = Number("i8*");
          var length = end ? _strlen(end) : "(null)".length;
          if (m) {
            /** @type {number} */
            length = Math.min(length, max);
          }
          if (!c) {
            for (;length < arg--;) {
              out.push(32);
            }
          }
          if (end) {
            /** @type {number} */
            i = 0;
            for (;i < length;i++) {
              out.push(HEAPU8[end++ | 0]);
            }
          } else {
            /** @type {Array} */
            out = out.concat(intArrayFromString("(null)".substr(0, length), true));
          }
          if (c) {
            for (;length < arg--;) {
              out.push(32);
            }
          }
          break;
        case "c":
          if (c) {
            out.push(Number("i8"));
          }
          for (;--arg > 0;) {
            out.push(32);
          }
          if (!c) {
            out.push(Number("i8"));
          }
          break;
        case "n":
          var b = Number("i32*");
          /** @type {number} */
          HEAP32[b >> 2] = out.length;
          break;
        case "%":
          out.push(copies);
          break;
        default:
          i = len;
          for (;i < count + 2;i++) {
            out.push(HEAP8[i]);
          }
        ;
      }
      count += 2;
    } else {
      out.push(copies);
      count += 1;
    }
  }
  return out;
}
/**
 * @param {?} resolved
 * @param {number} opt_attributes
 * @param {?} deepDataAndEvents
 * @return {?}
 */
function _fprintf(resolved, opt_attributes, deepDataAndEvents) {
  var checkSet = __formatString(opt_attributes, deepDataAndEvents);
  var udataCur = Runtime.stackSave();
  var newbugdiv = _fwrite(allocate(checkSet, "i8", ALLOC_STACK), 1, checkSet.length, resolved);
  Runtime.stackRestore(udataCur);
  return newbugdiv;
}
/**
 * @param {number} opt_attributes
 * @param {?} deepDataAndEvents
 * @return {?}
 */
function _printf(opt_attributes, deepDataAndEvents) {
  var resolved = HEAP32[_stdout >> 2];
  return _fprintf(resolved, opt_attributes, deepDataAndEvents);
}
/**
 * @param {number} m
 * @param {number} i
 * @param {number} size
 * @return {?}
 */
function _memcpy(m, i, size) {
  /** @type {number} */
  m = m | 0;
  /** @type {number} */
  i = i | 0;
  /** @type {number} */
  size = size | 0;
  /** @type {number} */
  var MAX_TOKEN_COUNT = 0;
  /** @type {number} */
  MAX_TOKEN_COUNT = m | 0;
  if ((m & 3) == (i & 3)) {
    for (;m & 3;) {
      if ((size | 0) == 0) {
        return MAX_TOKEN_COUNT | 0;
      }
      HEAP8[m] = HEAP8[i];
      /** @type {number} */
      m = m + 1 | 0;
      /** @type {number} */
      i = i + 1 | 0;
      /** @type {number} */
      size = size - 1 | 0;
    }
    for (;(size | 0) >= 4;) {
      HEAP32[m >> 2] = HEAP32[i >> 2];
      /** @type {number} */
      m = m + 4 | 0;
      /** @type {number} */
      i = i + 4 | 0;
      /** @type {number} */
      size = size - 4 | 0;
    }
  }
  for (;(size | 0) > 0;) {
    HEAP8[m] = HEAP8[i];
    /** @type {number} */
    m = m + 1 | 0;
    /** @type {number} */
    i = i + 1 | 0;
    /** @type {number} */
    size = size - 1 | 0;
  }
  return MAX_TOKEN_COUNT | 0;
}
/**
 * @param {number} h
 * @param {number} value
 * @param {number} y
 * @return {?}
 */
function _memset(h, value, y) {
  /** @type {number} */
  h = h | 0;
  /** @type {number} */
  value = value | 0;
  /** @type {number} */
  y = y | 0;
  /** @type {number} */
  var bits = 0;
  /** @type {number} */
  var i = 0;
  /** @type {number} */
  var h4 = 0;
  /** @type {number} */
  var bgy = 0;
  /** @type {number} */
  bits = h + y | 0;
  if ((y | 0) >= 20) {
    /** @type {number} */
    value = value & 255;
    /** @type {number} */
    bgy = h & 3;
    /** @type {number} */
    i = value | value << 8 | value << 16 | value << 24;
    /** @type {number} */
    h4 = bits & ~3;
    if (bgy) {
      /** @type {number} */
      bgy = h + 4 - bgy | 0;
      for (;(h | 0) < (bgy | 0);) {
        /** @type {number} */
        HEAP8[h] = value;
        /** @type {number} */
        h = h + 1 | 0;
      }
    }
    for (;(h | 0) < (h4 | 0);) {
      /** @type {number} */
      HEAP32[h >> 2] = i;
      /** @type {number} */
      h = h + 4 | 0;
    }
  }
  for (;(h | 0) < (bits | 0);) {
    /** @type {number} */
    HEAP8[h] = value;
    /** @type {number} */
    h = h + 1 | 0;
  }
  return h - y | 0;
}
/**
 * @param {number} key
 * @return {?}
 */
function _malloc(key) {
  var t = Runtime.dynamicAlloc(key + 8);
  return t + 8 & 4294967288;
}
/**
 * @return {undefined}
 */
function _free() {
}
/**
 * @return {undefined}
 */
function _banner() {
  /** @type {number} */
  var e = 0;
  /** @type {number} */
  var __stackBase__ = 0;
  var n = STACKTOP;
  assert((STACKTOP | 0) < (STACK_MAX | 0)) | 0;
  var r = _printf(864, (__stackBase__ = STACKTOP, STACKTOP = STACKTOP + 1 | 0, STACKTOP = STACKTOP + 7 & -8, assert((STACKTOP | 0) < (STACK_MAX | 0)) | 0, HEAP32[__stackBase__ >> 2] = 0, __stackBase__));
  STACKTOP = __stackBase__;
  STACKTOP = n;
  return;
}
/**
 * @return {?}
 */
function _check_cube_pos() {
  /** @type {number} */
  var __label__ = 0;
  var __stackBase__ = STACKTOP;
  assert((STACKTOP | 0) < (STACK_MAX | 0)) | 0;
  /** @type {number} */
  __label__ = 1;
  for (;1;) {
    switch(__label__) {
      case 1:
        var n;
        var MAX_BIT_LENGTH;
        var dest;
        var r;
        /** @type {number} */
        MAX_BIT_LENGTH = 2;
        var o = HEAP32[3768 >> 2];
        if ((o | 0) == 1) {
          /** @type {number} */
          __label__ = 2;
          break;
        } else {
          if ((o | 0) == 2) {
            /** @type {number} */
            __label__ = 3;
            break;
          } else {
            if ((o | 0) == 3) {
              /** @type {number} */
              __label__ = 4;
              break;
            } else {
              /** @type {number} */
              __label__ = 5;
              break;
            }
          }
        }
      ;
      case 2:
        var quat = HEAP32[3760 >> 2];
        dest = quat;
        var tmp = HEAP32[3752 >> 2];
        r = tmp;
        /** @type {number} */
        __label__ = 5;
        break;
      case 3:
        var f = HEAP32[3760 >> 2];
        /** @type {number} */
        var vec = f + 1 | 0;
        /** @type {number} */
        dest = vec;
        var first = HEAP32[3752 >> 2];
        r = first;
        /** @type {number} */
        __label__ = 5;
        break;
      case 4:
        var h = HEAP32[3752 >> 2];
        /** @type {number} */
        var c = h + 1 | 0;
        /** @type {number} */
        r = c;
        var mat = HEAP32[3760 >> 2];
        dest = mat;
        /** @type {number} */
        __label__ = 5;
        break;
      case 5:
        var thisDest = dest;
        /** @type {boolean} */
        var m = (thisDest | 0) > 9;
        if (m) {
          /** @type {number} */
          __label__ = 7;
          break;
        } else {
          /** @type {number} */
          __label__ = 6;
          break;
        }
      ;
      case 6:
        var diffY = r;
        /** @type {boolean} */
        var y = (diffY | 0) > 13;
        if (y) {
          /** @type {number} */
          __label__ = 7;
          break;
        } else {
          /** @type {number} */
          __label__ = 8;
          break;
        }
      ;
      case 7:
        /** @type {number} */
        n = 4;
        /** @type {number} */
        __label__ = 29;
        break;
      case 8:
        var b = r;
        var dPointer = dest;
        /** @type {number} */
        var a = 8 + (dPointer * 56 & -1) | 0;
        /** @type {number} */
        var S = a + (b << 2) | 0;
        var x = HEAP32[S >> 2];
        /** @type {boolean} */
        var T = (x | 0) == 0;
        if (T) {
          /** @type {number} */
          __label__ = 9;
          break;
        } else {
          /** @type {number} */
          __label__ = 10;
          break;
        }
      ;
      case 9:
        /** @type {number} */
        n = 3;
        /** @type {number} */
        __label__ = 29;
        break;
      case 10:
        var i = r;
        var orig = dest;
        /** @type {number} */
        var source = 8 + (orig * 56 & -1) | 0;
        /** @type {number} */
        var L = source + (i << 2) | 0;
        var A = HEAP32[L >> 2];
        /** @type {boolean} */
        var O = (A | 0) == 4;
        if (O) {
          /** @type {number} */
          __label__ = 11;
          break;
        } else {
          /** @type {number} */
          __label__ = 13;
          break;
        }
      ;
      case 11:
        var M = HEAP32[3744 >> 2];
        /** @type {boolean} */
        var _ = (M | 0) == 0;
        if (_) {
          /** @type {number} */
          __label__ = 12;
          break;
        } else {
          /** @type {number} */
          __label__ = 13;
          break;
        }
      ;
      case 12:
        /** @type {number} */
        n = 3;
        /** @type {number} */
        __label__ = 29;
        break;
      case 13:
        var digit = HEAP32[3752 >> 2];
        var P = HEAP32[3760 >> 2];
        /** @type {number} */
        var result = 8 + (P * 56 & -1) | 0;
        /** @type {number} */
        var B = result + (digit << 2) | 0;
        var j = HEAP32[B >> 2];
        switch(j | 0) {
          case 0:
            /** @type {number} */
            __label__ = 14;
            break;
          case 1:
            /** @type {number} */
            __label__ = 15;
            break;
          case 2:
            /** @type {number} */
            __label__ = 16;
            break;
          case 3:
            /** @type {number} */
            __label__ = 19;
            break;
          case 4:
            /** @type {number} */
            __label__ = 22;
            break;
          case 5:
            /** @type {number} */
            __label__ = 25;
            break;
          default:
            /** @type {number} */
            __label__ = 28;
            break;
        }
        break;
      case 14:
        /** @type {number} */
        n = 3;
        /** @type {number} */
        __label__ = 29;
        break;
      case 15:
        /** @type {number} */
        __label__ = 28;
        break;
      case 16:
        var F = HEAP32[3768 >> 2];
        /** @type {boolean} */
        var I = (F | 0) == 1;
        if (I) {
          /** @type {number} */
          __label__ = 17;
          break;
        } else {
          /** @type {number} */
          __label__ = 18;
          break;
        }
      ;
      case 17:
        /** @type {number} */
        MAX_BIT_LENGTH = 3;
        /** @type {number} */
        __label__ = 18;
        break;
      case 18:
        /** @type {number} */
        __label__ = 28;
        break;
      case 19:
        var q = HEAP32[3768 >> 2];
        /** @type {boolean} */
        var R = (q | 0) == 1;
        if (R) {
          /** @type {number} */
          __label__ = 20;
          break;
        } else {
          /** @type {number} */
          __label__ = 21;
          break;
        }
      ;
      case 20:
        /** @type {number} */
        HEAP32[3744 >> 2] = 1;
        /** @type {number} */
        __label__ = 21;
        break;
      case 21:
        /** @type {number} */
        __label__ = 28;
        break;
      case 22:
        var U = HEAP32[3744 >> 2];
        /** @type {boolean} */
        var z = (U | 0) == 0;
        if (z) {
          /** @type {number} */
          __label__ = 23;
          break;
        } else {
          /** @type {number} */
          __label__ = 24;
          break;
        }
      ;
      case 23:
        /** @type {number} */
        MAX_BIT_LENGTH = 3;
        /** @type {number} */
        __label__ = 24;
        break;
      case 24:
        /** @type {number} */
        __label__ = 28;
        break;
      case 25:
        var W = HEAP32[3768 >> 2];
        /** @type {boolean} */
        var X = (W | 0) == 1;
        if (X) {
          /** @type {number} */
          __label__ = 26;
          break;
        } else {
          /** @type {number} */
          __label__ = 27;
          break;
        }
      ;
      case 26:
        /** @type {number} */
        MAX_BIT_LENGTH = 1;
        /** @type {number} */
        __label__ = 27;
        break;
      case 27:
        /** @type {number} */
        __label__ = 28;
        break;
      case 28:
        /** @type {(number|undefined)} */
        var step = MAX_BIT_LENGTH;
        /** @type {(number|undefined)} */
        n = step;
        /** @type {number} */
        __label__ = 29;
        break;
      case 29:
        /** @type {(number|undefined)} */
        var countDown = n;
        STACKTOP = __stackBase__;
        return countDown;
      default:
        assert(0, "bad label: " + __label__);
    }
  }
}
/**
 * @param {number} value
 * @return {?}
 */
function _move_cube(value) {
  /** @type {number} */
  var __label__ = 0;
  var __stackBase__ = STACKTOP;
  assert((STACKTOP | 0) < (STACK_MAX | 0)) | 0;
  /** @type {number} */
  __label__ = 1;
  for (;1;) {
    switch(__label__) {
      case 1:
        var val;
        var node;
        /** @type {number} */
        val = value;
        var rval = val;
        if ((rval | 0) == 3) {
          /** @type {number} */
          __label__ = 14;
          break;
        } else {
          if ((rval | 0) == 1) {
            /** @type {number} */
            __label__ = 2;
            break;
          } else {
            if ((rval | 0) == 4) {
              /** @type {number} */
              __label__ = 20;
              break;
            } else {
              if ((rval | 0) == 2) {
                /** @type {number} */
                __label__ = 8;
                break;
              } else {
                /** @type {number} */
                __label__ = 26;
                break;
              }
            }
          }
        }
      ;
      case 2:
        var o = HEAP32[3760 >> 2];
        /** @type {number} */
        var u = o - 1 | 0;
        /** @type {number} */
        HEAP32[3760 >> 2] = u;
        var a = HEAP32[3768 >> 2];
        /** @type {boolean} */
        var f = (a | 0) == 1;
        if (f) {
          /** @type {number} */
          __label__ = 3;
          break;
        } else {
          /** @type {number} */
          __label__ = 4;
          break;
        }
      ;
      case 3:
        var l = HEAP32[3760 >> 2];
        /** @type {number} */
        var c = l - 1 | 0;
        /** @type {number} */
        HEAP32[3760 >> 2] = c;
        /** @type {number} */
        HEAP32[3768 >> 2] = 2;
        /** @type {number} */
        __label__ = 7;
        break;
      case 4:
        var h = HEAP32[3768 >> 2];
        /** @type {boolean} */
        var p = (h | 0) == 2;
        if (p) {
          /** @type {number} */
          __label__ = 5;
          break;
        } else {
          /** @type {number} */
          __label__ = 6;
          break;
        }
      ;
      case 5:
        /** @type {number} */
        HEAP32[3768 >> 2] = 1;
        /** @type {number} */
        __label__ = 6;
        break;
      case 6:
        /** @type {number} */
        __label__ = 7;
        break;
      case 7:
        /** @type {number} */
        __label__ = 26;
        break;
      case 8:
        var d = HEAP32[3760 >> 2];
        /** @type {number} */
        var v = d + 1 | 0;
        /** @type {number} */
        HEAP32[3760 >> 2] = v;
        var m = HEAP32[3768 >> 2];
        /** @type {boolean} */
        var g = (m | 0) == 1;
        if (g) {
          /** @type {number} */
          __label__ = 9;
          break;
        } else {
          /** @type {number} */
          __label__ = 10;
          break;
        }
      ;
      case 9:
        /** @type {number} */
        HEAP32[3768 >> 2] = 2;
        /** @type {number} */
        __label__ = 13;
        break;
      case 10:
        var y = HEAP32[3768 >> 2];
        /** @type {boolean} */
        var b = (y | 0) == 2;
        if (b) {
          /** @type {number} */
          __label__ = 11;
          break;
        } else {
          /** @type {number} */
          __label__ = 12;
          break;
        }
      ;
      case 11:
        var w = HEAP32[3760 >> 2];
        /** @type {number} */
        var E = w + 1 | 0;
        /** @type {number} */
        HEAP32[3760 >> 2] = E;
        /** @type {number} */
        HEAP32[3768 >> 2] = 1;
        /** @type {number} */
        __label__ = 12;
        break;
      case 12:
        /** @type {number} */
        __label__ = 13;
        break;
      case 13:
        /** @type {number} */
        __label__ = 26;
        break;
      case 14:
        var S = HEAP32[3752 >> 2];
        /** @type {number} */
        var x = S + 1 | 0;
        /** @type {number} */
        HEAP32[3752 >> 2] = x;
        var T = HEAP32[3768 >> 2];
        /** @type {boolean} */
        var N = (T | 0) == 1;
        if (N) {
          /** @type {number} */
          __label__ = 15;
          break;
        } else {
          /** @type {number} */
          __label__ = 16;
          break;
        }
      ;
      case 15:
        /** @type {number} */
        HEAP32[3768 >> 2] = 3;
        /** @type {number} */
        __label__ = 19;
        break;
      case 16:
        var C = HEAP32[3768 >> 2];
        /** @type {boolean} */
        var k = (C | 0) == 3;
        if (k) {
          /** @type {number} */
          __label__ = 17;
          break;
        } else {
          /** @type {number} */
          __label__ = 18;
          break;
        }
      ;
      case 17:
        var L = HEAP32[3752 >> 2];
        /** @type {number} */
        var A = L + 1 | 0;
        /** @type {number} */
        HEAP32[3752 >> 2] = A;
        /** @type {number} */
        HEAP32[3768 >> 2] = 1;
        /** @type {number} */
        __label__ = 18;
        break;
      case 18:
        /** @type {number} */
        __label__ = 19;
        break;
      case 19:
        /** @type {number} */
        __label__ = 26;
        break;
      case 20:
        var O = HEAP32[3752 >> 2];
        /** @type {number} */
        var M = O - 1 | 0;
        /** @type {number} */
        HEAP32[3752 >> 2] = M;
        var _ = HEAP32[3768 >> 2];
        /** @type {boolean} */
        var D = (_ | 0) == 1;
        if (D) {
          /** @type {number} */
          __label__ = 21;
          break;
        } else {
          /** @type {number} */
          __label__ = 22;
          break;
        }
      ;
      case 21:
        var P = HEAP32[3752 >> 2];
        /** @type {number} */
        var H = P - 1 | 0;
        /** @type {number} */
        HEAP32[3752 >> 2] = H;
        /** @type {number} */
        HEAP32[3768 >> 2] = 3;
        /** @type {number} */
        __label__ = 25;
        break;
      case 22:
        var B = HEAP32[3768 >> 2];
        /** @type {boolean} */
        var j = (B | 0) == 3;
        if (j) {
          /** @type {number} */
          __label__ = 23;
          break;
        } else {
          /** @type {number} */
          __label__ = 24;
          break;
        }
      ;
      case 23:
        /** @type {number} */
        HEAP32[3768 >> 2] = 1;
        /** @type {number} */
        __label__ = 24;
        break;
      case 24:
        /** @type {number} */
        __label__ = 25;
        break;
      case 25:
        /** @type {number} */
        __label__ = 26;
        break;
      case 26:
        var fragment = _check_cube_pos();
        node = fragment;
        var current = node;
        STACKTOP = __stackBase__;
        return current;
      default:
        assert(0, "bad label: " + __label__);
    }
  }
}
/**
 * @param {?} dataAndEvents
 * @return {?}
 */
function _run_game(dataAndEvents) {
  /** @type {number} */
  var __label__ = 0;
  var __stackBase__ = STACKTOP;
  assert((STACKTOP | 0) < (STACK_MAX | 0)) | 0;
  /** @type {number} */
  __label__ = 1;
  for (;1;) {
    switch(__label__) {
      case 1:
        var YY_START;
        var A;
        var foo;
        var c;
        A = dataAndEvents;
        /** @type {number} */
        HEAP32[3760 >> 2] = 3;
        /** @type {number} */
        HEAP32[3752 >> 2] = 12;
        /** @type {number} */
        HEAP32[3768 >> 2] = 1;
        /** @type {number} */
        foo = 0;
        /** @type {number} */
        __label__ = 2;
        break;
      case 2:
        /** @type {(number|undefined)} */
        var u = foo;
        var ast = A;
        var environment = _strlen(ast);
        /** @type {boolean} */
        var l = u >>> 0 < environment >>> 0;
        if (l) {
          /** @type {number} */
          __label__ = 3;
          break;
        } else {
          /** @type {number} */
          __label__ = 12;
          break;
        }
      ;
      case 3:
        /** @type {(number|undefined)} */
        var id = foo;
        var message = A;
        /** @type {number} */
        var unlock = message + id | 0;
        var cache = HEAP8[unlock];
        /** @type {number} */
        var v = cache << 24 >> 24;
        /** @type {number} */
        var a = v - 48 | 0;
        /** @type {(number|undefined)} */
        var oldfoo = foo;
        /** @type {number} */
        var b = (oldfoo >>> 0) % 5 & -1;
        /** @type {number} */
        var udataCur = a - b | 0;
        var _c = _move_cube(udataCur);
        c = _c;
        var control = c;
        if ((control | 0) == 1) {
          /** @type {number} */
          __label__ = 4;
          break;
        } else {
          if ((control | 0) == 2) {
            /** @type {number} */
            __label__ = 7;
            break;
          } else {
            if ((control | 0) == 3 | (control | 0) == 4) {
              /** @type {number} */
              __label__ = 8;
              break;
            } else {
              /** @type {number} */
              __label__ = 9;
              break;
            }
          }
        }
      ;
      case 4:
        /** @type {(number|undefined)} */
        var str = foo;
        /** @type {boolean} */
        var x = (str | 0) == 45;
        if (x) {
          /** @type {number} */
          __label__ = 5;
          break;
        } else {
          /** @type {number} */
          __label__ = 6;
          break;
        }
      ;
      case 5:
        /** @type {number} */
        YY_START = 1;
        /** @type {number} */
        __label__ = 13;
        break;
      case 6:
        /** @type {number} */
        YY_START = 2;
        /** @type {number} */
        __label__ = 13;
        break;
      case 7:
        /** @type {number} */
        __label__ = 10;
        break;
      case 8:
        /** @type {number} */
        __label__ = 9;
        break;
      case 9:
        /** @type {number} */
        YY_START = 0;
        /** @type {number} */
        __label__ = 13;
        break;
      case 10:
        /** @type {number} */
        __label__ = 11;
        break;
      case 11:
        /** @type {(number|undefined)} */
        var s = foo;
        /** @type {number} */
        var _foo = s + 1 | 0;
        /** @type {number} */
        foo = _foo;
        /** @type {number} */
        __label__ = 2;
        break;
      case 12:
        /** @type {number} */
        YY_START = 0;
        /** @type {number} */
        __label__ = 13;
        break;
      case 13:
        /** @type {(number|undefined)} */
        var YYSTATE = YY_START;
        STACKTOP = __stackBase__;
        return YYSTATE;
      default:
        assert(0, "bad label: " + __label__);
    }
  }
}
/**
 * @param {?} subKey
 * @return {?}
 */
function _mmain(subKey) {
  /** @type {number} */
  var __label__ = 0;
  /** @type {number} */
  var __stackBase__ = 0;
  var r = STACKTOP;
  assert((STACKTOP | 0) < (STACK_MAX | 0)) | 0;
  /** @type {number} */
  __label__ = 1;
  for (;1;) {
    switch(__label__) {
      case 1:
        var type;
        var result;
        var el;
        result = subKey;
        /** @type {number} */
        el = 0;
        _banner();
        var oldconfig = result;
        var $5 = _strlen(oldconfig);
        /** @type {boolean} */
        var f = ($5 | 0) == 0;
        if (f) {
          /** @type {number} */
          __label__ = 2;
          break;
        } else {
          /** @type {number} */
          __label__ = 3;
          break;
        }
      ;
      case 2:
        var l = _printf(752, (__stackBase__ = STACKTOP, STACKTOP = STACKTOP + 1 | 0, STACKTOP = STACKTOP + 7 & -8, assert((STACKTOP | 0) < (STACK_MAX | 0)) | 0, HEAP32[__stackBase__ >> 2] = 0, __stackBase__));
        STACKTOP = __stackBase__;
        var remove = el;
        type = remove;
        /** @type {number} */
        __label__ = 12;
        break;
      case 3:
        var node = result;
        var tmpl = _run_game(node);
        el = tmpl;
        var d = el;
        /** @type {boolean} */
        var v = (d | 0) == 1;
        if (v) {
          /** @type {number} */
          __label__ = 4;
          break;
        } else {
          /** @type {number} */
          __label__ = 5;
          break;
        }
      ;
      case 4:
        var m = _printf(704, (__stackBase__ = STACKTOP, STACKTOP = STACKTOP + 1 | 0, STACKTOP = STACKTOP + 7 & -8, assert((STACKTOP | 0) < (STACK_MAX | 0)) | 0, HEAP32[__stackBase__ >> 2] = 0, __stackBase__));
        STACKTOP = __stackBase__;
        /** @type {number} */
        __label__ = 11;
        break;
      case 5:
        var currentEl = el;
        /** @type {boolean} */
        var y = (currentEl | 0) == 0;
        if (y) {
          /** @type {number} */
          __label__ = 6;
          break;
        } else {
          /** @type {number} */
          __label__ = 7;
          break;
        }
      ;
      case 6:
        var b = _printf(640, (__stackBase__ = STACKTOP, STACKTOP = STACKTOP + 1 | 0, STACKTOP = STACKTOP + 7 & -8, assert((STACKTOP | 0) < (STACK_MAX | 0)) | 0, HEAP32[__stackBase__ >> 2] = 0, __stackBase__));
        STACKTOP = __stackBase__;
        /** @type {number} */
        __label__ = 10;
        break;
      case 7:
        var targetEvent = el;
        /** @type {boolean} */
        var E = (targetEvent | 0) == 2;
        if (E) {
          /** @type {number} */
          __label__ = 8;
          break;
        } else {
          /** @type {number} */
          __label__ = 9;
          break;
        }
      ;
      case 8:
        var S = _printf(568, (__stackBase__ = STACKTOP, STACKTOP = STACKTOP + 1 | 0, STACKTOP = STACKTOP + 7 & -8, assert((STACKTOP | 0) < (STACK_MAX | 0)) | 0, HEAP32[__stackBase__ >> 2] = 0, __stackBase__));
        STACKTOP = __stackBase__;
        /** @type {number} */
        __label__ = 9;
        break;
      case 9:
        /** @type {number} */
        __label__ = 10;
        break;
      case 10:
        /** @type {number} */
        __label__ = 11;
        break;
      case 11:
        var x = el;
        type = x;
        /** @type {number} */
        __label__ = 12;
        break;
      case 12:
        var t = type;
        STACKTOP = r;
        return t;
      default:
        assert(0, "bad label: " + __label__);
    }
  }
}
/**
 * @param {number} status
 * @return {undefined}
 */
function ExitStatus(status) {
  /** @type {string} */
  this.name = "ExitStatus";
  /** @type {string} */
  this.message = "Program terminated with exit(" + status + ")";
  /** @type {number} */
  this.status = status;
}
/**
 * @param {Element} dataType
 * @return {undefined}
 */
function run(dataType) {
  /**
   * @return {undefined}
   */
  function finish() {
    if (Module["calledRun"]) {
      return;
    }
    /** @type {boolean} */
    Module["calledRun"] = true;
    ensureInitRuntime();
    preMain();
    if (Module["_main"] && shouldRunNow) {
      Module["callMain"](dataType);
    }
    postRun();
  }
  dataType = dataType || Module["arguments"];
  if (preloadStartTime === null) {
    /** @type {number} */
    preloadStartTime = Date.now();
  }
  if (runDependencies > 0) {
    Module.printErr("run() called, but dependencies remain, so not running");
    return;
  }
  preRun();
  if (runDependencies > 0) {
    return;
  }
  if (Module["calledRun"]) {
    return;
  }
  if (Module["setStatus"]) {
    Module["setStatus"]("Running...");
    setTimeout(function() {
      setTimeout(function() {
        Module["setStatus"]("");
      }, 1);
      if (!ABORT) {
        finish();
      }
    }, 1);
  } else {
    finish();
  }
}
/**
 * @param {number} status
 * @return {undefined}
 */
function exit(status) {
  /** @type {boolean} */
  ABORT = true;
  /** @type {number} */
  EXITSTATUS = status;
  STACKTOP = initialStackTop;
  exitRuntime();
  throw new ExitStatus(status);
}
/**
 * @param {string} text
 * @return {undefined}
 */
function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }
  /** @type {boolean} */
  ABORT = true;
  /** @type {number} */
  EXITSTATUS = 1;
  throw "abort() at " + stackTrace();
}
var Module;
if (!Module) {
  /** @type {*} */
  Module = eval("(function() { try { return Module || {} } catch(e) { return {} } })()");
}
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}
/** @type {boolean} */
var ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function";
/** @type {boolean} */
var ENVIRONMENT_IS_WEB = typeof window === "object";
/** @type {boolean} */
var ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
/** @type {boolean} */
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && (!ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER);
if (ENVIRONMENT_IS_NODE) {
  if (!Module["print"]) {
    /**
     * @param {string} line
     * @return {undefined}
     */
    Module["print"] = function(line) {
      process["stdout"].write(line + "\n");
    };
  }
  if (!Module["printErr"]) {
    /**
     * @param {string} line
     * @return {undefined}
     */
    Module["printErr"] = function(line) {
      process["stderr"].write(line + "\n");
    };
  }
  var nodeFS = require("fs");
  var nodePath = require("path");
  /**
   * @param {Text} src
   * @param {?} dataAndEvents
   * @return {?}
   */
  Module["read"] = function(src, dataAndEvents) {
    src = nodePath["normalize"](src);
    var dst = nodeFS["readFileSync"](src);
    if (!dst && src != nodePath["resolve"](src)) {
      src = path.join(__dirname, "..", "src", src);
      dst = nodeFS["readFileSync"](src);
    }
    if (dst && !dataAndEvents) {
      dst = dst.toString();
    }
    return dst;
  };
  /**
   * @param {?} deepDataAndEvents
   * @return {?}
   */
  Module["readBinary"] = function(deepDataAndEvents) {
    return Module["read"](deepDataAndEvents, true);
  };
  /**
   * @param {?} t
   * @return {undefined}
   */
  Module["load"] = function(t) {
    globalEval(read(t));
  };
  Module["arguments"] = process["argv"].slice(2);
  /** @type {*} */
  module["exports"] = Module;
} else {
  if (ENVIRONMENT_IS_SHELL) {
    if (!Module["print"]) {
      Module["print"] = print;
    }
    if (typeof printErr != "undefined") {
      Module["printErr"] = printErr;
    }
    if (typeof read != "undefined") {
      Module["read"] = read;
    } else {
      /**
       * @return {?}
       */
      Module["read"] = function() {
        throw "no read() available (jsc?)";
      };
    }
    /**
     * @param {?} t
     * @return {?}
     */
    Module["readBinary"] = function(t) {
      return read(t, "binary");
    };
    if (typeof scriptArgs != "undefined") {
      Module["arguments"] = scriptArgs;
    } else {
      if (typeof arguments != "undefined") {
        /** @type {Arguments} */
        Module["arguments"] = arguments;
      }
    }
    /** @type {*} */
    this["Module"] = Module;
    eval("if (typeof gc === 'function' && gc.toString().indexOf('[native code]') > 0) var gc = undefined");
  } else {
    if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      /**
       * @param {number} query
       * @return {?}
       */
      Module["read"] = function(query) {
        /** @type {XMLHttpRequest} */
        var req = new XMLHttpRequest;
        req.open("GET", query, false);
        req.send(null);
        return req.responseText;
      };
      if (typeof arguments != "undefined") {
        /** @type {Arguments} */
        Module["arguments"] = arguments;
      }
      if (typeof console !== "undefined") {
        if (!Module["print"]) {
          /**
           * @param {?} fmt
           * @return {undefined}
           */
          Module["print"] = function(fmt) {
            console.log(fmt);
          };
        }
        if (!Module["printErr"]) {
          /**
           * @param {?} fmt
           * @return {undefined}
           */
          Module["printErr"] = function(fmt) {
            console.log(fmt);
          };
        }
      } else {
        /** @type {boolean} */
        var TRY_USE_DUMP = false;
        if (!Module["print"]) {
          /** @type {function (?): undefined} */
          Module["print"] = TRY_USE_DUMP && typeof dump !== "undefined" ? function(v) {
            dump(v);
          } : function(dataAndEvents) {
          };
        }
      }
      if (ENVIRONMENT_IS_WEB) {
        /** @type {*} */
        this["Module"] = Module;
      } else {
        /** @type {function (...[string]): ?} */
        Module["load"] = importScripts;
      }
    } else {
      throw "Unknown runtime environment. Where are we?";
    }
  }
}
if (!Module["load"] == "undefined" && Module["read"]) {
  /**
   * @param {?} deepDataAndEvents
   * @return {undefined}
   */
  Module["load"] = function(deepDataAndEvents) {
    globalEval(Module["read"](deepDataAndEvents));
  };
}
if (!Module["print"]) {
  /**
   * @return {undefined}
   */
  Module["print"] = function() {
  };
}
if (!Module["printErr"]) {
  Module["printErr"] = Module["print"];
}
if (!Module["arguments"]) {
  /** @type {Array} */
  Module["arguments"] = [];
}
Module.print = Module["print"];
Module.printErr = Module["printErr"];
/** @type {Array} */
Module["preRun"] = [];
/** @type {Array} */
Module["postRun"] = [];
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
var Runtime = {
  /**
   * @return {?}
   */
  stackSave : function() {
    return STACKTOP;
  },
  /**
   * @param {number} value
   * @return {undefined}
   */
  stackRestore : function(value) {
    /** @type {number} */
    STACKTOP = value;
  },
  /**
   * @param {number} a
   * @param {number} b
   * @return {?}
   */
  forceAlign : function(a, b) {
    b = b || 4;
    if (b == 1) {
      return a;
    }
    if (isNumber(a) && isNumber(b)) {
      return Math.ceil(a / b) * b;
    } else {
      if (isNumber(b) && isPowerOfTwo(b)) {
        return "(((" + a + ")+" + (b - 1) + ")&" + -b + ")";
      }
    }
    return "Math.ceil((" + a + ")/" + b + ")*" + b;
  },
  /**
   * @param {string} keepData
   * @return {?}
   */
  isNumberType : function(keepData) {
    return keepData in Runtime.INT_TYPES || keepData in Runtime.FLOAT_TYPES;
  },
  /**
   * @param {string} keepData
   * @return {?}
   */
  isPointerType : function(keepData) {
    return keepData[keepData.length - 1] == "*";
  },
  /**
   * @param {string} letter
   * @return {?}
   */
  isStructType : function(letter) {
    if (isPointerType(letter)) {
      return false;
    }
    if (isArrayType(letter)) {
      return true;
    }
    if (/<?{ ?[^}]* ?}>?/.test(letter)) {
      return true;
    }
    return letter[0] == "%";
  },
  INT_TYPES : {
    i1 : 0,
    i8 : 0,
    i16 : 0,
    i32 : 0,
    i64 : 0
  },
  FLOAT_TYPES : {
    "float" : 0,
    "double" : 0
  },
  /**
   * @param {number} bps
   * @param {number} sum
   * @return {?}
   */
  or64 : function(bps, sum) {
    /** @type {number} */
    var inner = bps | 0 | (sum | 0);
    /** @type {number} */
    var arr = (Math.round(bps / 4294967296) | Math.round(sum / 4294967296)) * 4294967296;
    return inner + arr;
  },
  /**
   * @param {number} bps
   * @param {number} sum
   * @return {?}
   */
  and64 : function(bps, sum) {
    /** @type {number} */
    var inner = (bps | 0) & (sum | 0);
    /** @type {number} */
    var arr = (Math.round(bps / 4294967296) & Math.round(sum / 4294967296)) * 4294967296;
    return inner + arr;
  },
  /**
   * @param {number} bps
   * @param {number} sum
   * @return {?}
   */
  xor64 : function(bps, sum) {
    /** @type {number} */
    var inner = (bps | 0) ^ (sum | 0);
    /** @type {number} */
    var arr = (Math.round(bps / 4294967296) ^ Math.round(sum / 4294967296)) * 4294967296;
    return inner + arr;
  },
  /**
   * @param {string} type
   * @return {?}
   */
  getNativeTypeSize : function(type) {
    switch(type) {
      case "i1":
      ;
      case "i8":
        return 1;
      case "i16":
        return 2;
      case "i32":
        return 4;
      case "i64":
        return 8;
      case "float":
        return 4;
      case "double":
        return 8;
      default:
        if (type[type.length - 1] === "*") {
          return Runtime.QUANTUM_SIZE;
        } else {
          if (type[0] === "i") {
            /** @type {number} */
            var charCodeToReplace = parseInt(type.substr(1));
            assert(charCodeToReplace % 8 === 0);
            return charCodeToReplace / 8;
          } else {
            return 0;
          }
        }
      ;
    }
  },
  /**
   * @param {string} date
   * @return {?}
   */
  getNativeFieldSize : function(date) {
    return Math.max(Runtime.getNativeTypeSize(date), Runtime.QUANTUM_SIZE);
  },
  /**
   * @param {Array} features
   * @param {number} token
   * @return {?}
   */
  dedup : function(features, token) {
    var result = {};
    if (token) {
      return features.filter(function(obj) {
        if (result[obj[token]]) {
          return false;
        }
        /** @type {boolean} */
        result[obj[token]] = true;
        return true;
      });
    } else {
      return features.filter(function(axis) {
        if (result[axis]) {
          return false;
        }
        /** @type {boolean} */
        result[axis] = true;
        return true;
      });
    }
  },
  /**
   * @return {?}
   */
  set : function() {
    var codeSegments = typeof arguments[0] === "object" ? arguments[0] : arguments;
    var values = {};
    /** @type {number} */
    var i = 0;
    for (;i < codeSegments.length;i++) {
      /** @type {number} */
      values[codeSegments[i]] = 0;
    }
    return values;
  },
  STACK_ALIGN : 8,
  /**
   * @param {string} base
   * @param {Object} count
   * @param {boolean} dataAndEvents
   * @return {?}
   */
  getAlignSize : function(base, count, dataAndEvents) {
    if (dataAndEvents) {
      return 8;
    }
    if (!dataAndEvents && (base == "i64" || base == "double")) {
      return 8;
    }
    if (!base) {
      return Math.min(count, 8);
    }
    return Math.min(count || (base ? Runtime.getNativeFieldSize(base) : 0), Runtime.QUANTUM_SIZE);
  },
  /**
   * @param {Object} options
   * @return {?}
   */
  calculateStructAlignment : function(options) {
    /** @type {number} */
    options.flatSize = 0;
    /** @type {number} */
    options.alignSize = 0;
    /** @type {Array} */
    var features = [];
    /** @type {number} */
    var b = -1;
    /** @type {number} */
    var i = 0;
    options.flatIndexes = options.fields.map(function(type) {
      i++;
      var data;
      var val;
      if (Runtime.isNumberType(type) || Runtime.isPointerType(type)) {
        data = Runtime.getNativeTypeSize(type);
        val = Runtime.getAlignSize(type, data);
      } else {
        if (Runtime.isStructType(type)) {
          if (type[1] === "0") {
            /** @type {number} */
            data = 0;
            if (Types.types[type]) {
              val = Runtime.getAlignSize(null, Types.types[type].alignSize);
            } else {
              val = options.alignSize || QUANTUM_SIZE;
            }
          } else {
            data = Types.types[type].flatSize;
            val = Runtime.getAlignSize(null, Types.types[type].alignSize);
          }
        } else {
          if (type[0] == "b") {
            /** @type {number} */
            data = type.substr(1) | 0;
            /** @type {number} */
            val = 1;
          } else {
            if (type[0] === "<") {
              data = val = Types.types[type].flatSize;
            } else {
              if (type[0] === "i") {
                /** @type {number} */
                data = val = parseInt(type.substr(1)) / 8;
                assert(data % 1 === 0, "cannot handle non-byte-size field " + type);
              } else {
                assert(false, "invalid type for calculateStructAlignment");
              }
            }
          }
        }
      }
      if (options.packed) {
        /** @type {number} */
        val = 1;
      }
      /** @type {number} */
      options.alignSize = Math.max(options.alignSize, val);
      var a = Runtime.alignMemory(options.flatSize, val);
      options.flatSize = a + data;
      if (b >= 0) {
        features.push(a - b);
      }
      b = a;
      return a;
    });
    if (options.name_ && options.name_[0] === "[") {
      /** @type {number} */
      options.flatSize = parseInt(options.name_.substr(1)) * options.flatSize / 2;
    }
    options.flatSize = Runtime.alignMemory(options.flatSize, options.alignSize);
    if (features.length == 0) {
      options.flatFactor = options.flatSize;
    } else {
      if (Runtime.dedup(features).length == 1) {
        options.flatFactor = features[0];
      }
    }
    /** @type {boolean} */
    options.needsFlattening = options.flatFactor != 1;
    return options.flatIndexes;
  },
  /**
   * @param {Array} paths
   * @param {string} i
   * @param {number} px
   * @return {?}
   */
  generateStructInfo : function(paths, i, px) {
    var options;
    var element;
    if (i) {
      px = px || 0;
      options = (typeof Types === "undefined" ? Runtime.typeInfo : Types.types)[i];
      if (!options) {
        return null;
      }
      if (options.fields.length != paths.length) {
        printErr("Number of named fields must match the type for " + i + ": possibly duplicate struct names. Cannot return structInfo");
        return null;
      }
      element = options.flatIndexes;
    } else {
      options = {
        fields : paths.map(function(dataAndEvents) {
          return dataAndEvents[0];
        })
      };
      element = Runtime.calculateStructAlignment(options);
    }
    var ret = {
      __size__ : options.flatSize
    };
    if (i) {
      paths.forEach(function(key, prop) {
        if (typeof key === "string") {
          ret[key] = element[prop] + px;
        } else {
          var p;
          var i;
          for (i in key) {
            /** @type {string} */
            p = i;
          }
          ret[p] = Runtime.generateStructInfo(key[p], options.fields[prop], element[prop]);
        }
      });
    } else {
      paths.forEach(function(b, property) {
        ret[b[1]] = element[property];
      });
    }
    return ret;
  },
  /**
   * @param {string} obj
   * @param {?} r
   * @param {number} args
   * @return {?}
   */
  dynCall : function(obj, r, args) {
    if (args && args.length) {
      assert(args.length == obj.length - 1);
      return FUNCTION_TABLE[r].apply(null, args);
    } else {
      assert(obj.length == 1);
      return FUNCTION_TABLE[r]();
    }
  },
  /**
   * @param {?} name
   * @return {?}
   */
  addFunction : function(name) {
    var configList = FUNCTION_TABLE;
    var cnl = configList.length;
    assert(cnl % 2 === 0);
    configList.push(name);
    /** @type {number} */
    var r = 0;
    for (;r < 2 - 1;r++) {
      configList.push(0);
    }
    return cnl;
  },
  /**
   * @param {?} off
   * @return {undefined}
   */
  removeFunction : function(off) {
    var buf = FUNCTION_TABLE;
    /** @type {null} */
    buf[off] = null;
  },
  /**
   * @param {string} name
   * @param {number} dataAndEvents
   * @return {?}
   */
  getAsmConst : function(name, dataAndEvents) {
    if (!Runtime.asmConstCache) {
      Runtime.asmConstCache = {};
    }
    var existingNode = Runtime.asmConstCache[name];
    if (existingNode) {
      return existingNode;
    }
    /** @type {Array} */
    var assigns = [];
    /** @type {number} */
    var vvar = 0;
    for (;vvar < dataAndEvents;vvar++) {
      assigns.push(String.fromCharCode(36) + vvar);
    }
    name = Pointer_stringify(name);
    if (name[0] === '"') {
      if (name.indexOf('"', 1) === name.length - 1) {
        name = name.substr(1, name.length - 2);
      } else {
        abort("invalid EM_ASM input |" + name + "|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)");
      }
    }
    return Runtime.asmConstCache[name] = eval("(function(" + assigns.join(",") + "){ " + name + " })");
  },
  /**
   * @param {string} text
   * @return {undefined}
   */
  warnOnce : function(text) {
    if (!Runtime.warnOnce.shown) {
      Runtime.warnOnce.shown = {};
    }
    if (!Runtime.warnOnce.shown[text]) {
      /** @type {number} */
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers : {},
  /**
   * @param {?} r
   * @param {Object} walkers
   * @return {?}
   */
  getFuncWrapper : function(r, walkers) {
    assert(walkers);
    if (!Runtime.funcWrappers[r]) {
      /**
       * @return {?}
       */
      Runtime.funcWrappers[r] = function() {
        return Runtime.dynCall(walkers, r, arguments);
      };
    }
    return Runtime.funcWrappers[r];
  },
  /**
   * @return {undefined}
   */
  UTF8Processor : function() {
    /** @type {Array} */
    var ss = [];
    /** @type {number} */
    var t = 0;
    /**
     * @param {number} obj
     * @return {?}
     */
    this.processCChar = function(obj) {
      /** @type {number} */
      obj = obj & 255;
      if (ss.length == 0) {
        if ((obj & 128) == 0) {
          return String.fromCharCode(obj);
        }
        ss.push(obj);
        if ((obj & 224) == 192) {
          /** @type {number} */
          t = 1;
        } else {
          if ((obj & 240) == 224) {
            /** @type {number} */
            t = 2;
          } else {
            /** @type {number} */
            t = 3;
          }
        }
        return "";
      }
      if (t) {
        ss.push(obj);
        t--;
        if (t > 0) {
          return "";
        }
      }
      var lpath = ss[0];
      var sh = ss[1];
      var s = ss[2];
      var o = ss[3];
      var processCChar;
      if (ss.length == 2) {
        /** @type {string} */
        processCChar = String.fromCharCode((lpath & 31) << 6 | sh & 63);
      } else {
        if (ss.length == 3) {
          /** @type {string} */
          processCChar = String.fromCharCode((lpath & 15) << 12 | (sh & 63) << 6 | s & 63);
        } else {
          /** @type {number} */
          var a = (lpath & 7) << 18 | (sh & 63) << 12 | (s & 63) << 6 | o & 63;
          /** @type {string} */
          processCChar = String.fromCharCode(Math.floor((a - 65536) / 1024) + 55296, (a - 65536) % 1024 + 56320);
        }
      }
      /** @type {number} */
      ss.length = 0;
      return processCChar;
    };
    /**
     * @param {string} input
     * @return {?}
     */
    this.processJSString = function(input) {
      /** @type {string} */
      input = unescape(encodeURIComponent(input));
      /** @type {Array} */
      var colNames = [];
      /** @type {number} */
      var i = 0;
      for (;i < input.length;i++) {
        colNames.push(input.charCodeAt(i));
      }
      return colNames;
    };
  },
  /**
   * @param {?} dataAndEvents
   * @return {?}
   */
  stackAlloc : function(dataAndEvents) {
    var __stackBase__ = STACKTOP;
    /** @type {number} */
    STACKTOP = STACKTOP + dataAndEvents | 0;
    /** @type {number} */
    STACKTOP = STACKTOP + 7 & -8;
    assert((STACKTOP | 0) < (STACK_MAX | 0)) | 0;
    return __stackBase__;
  },
  /**
   * @param {number} opt_attributes
   * @return {?}
   */
  staticAlloc : function(opt_attributes) {
    var staticAlloc = STATICTOP;
    /** @type {number} */
    STATICTOP = STATICTOP + (assert(!staticSealed), opt_attributes) | 0;
    /** @type {number} */
    STATICTOP = STATICTOP + 7 & -8;
    return staticAlloc;
  },
  /**
   * @param {?} dataAndEvents
   * @return {?}
   */
  dynamicAlloc : function(dataAndEvents) {
    var dynamicAlloc = DYNAMICTOP;
    /** @type {number} */
    DYNAMICTOP = DYNAMICTOP + (assert(DYNAMICTOP > 0), dataAndEvents) | 0;
    /** @type {number} */
    DYNAMICTOP = DYNAMICTOP + 7 & -8;
    if (DYNAMICTOP >= TOTAL_MEMORY) {
      enlargeMemory();
    }
    return dynamicAlloc;
  },
  /**
   * @param {number} j
   * @param {number} maxLength
   * @return {?}
   */
  alignMemory : function(j, maxLength) {
    /** @type {number} */
    var i = j = Math.ceil(j / (maxLength ? maxLength : 8)) * (maxLength ? maxLength : 8);
    return i;
  },
  /**
   * @param {number} dataAndEvents
   * @param {number} deepDataAndEvents
   * @param {boolean} isXML
   * @return {?}
   */
  makeBigInt : function(dataAndEvents, deepDataAndEvents, isXML) {
    /** @type {number} */
    var ret = isXML ? (dataAndEvents >>> 0) + (deepDataAndEvents >>> 0) * 4294967296 : (dataAndEvents >>> 0) + (deepDataAndEvents | 0) * 4294967296;
    return ret;
  },
  GLOBAL_BASE : 8,
  QUANTUM_SIZE : 4,
  __dummy__ : 0
};
Module["Runtime"] = Runtime;
/** @type {number} */
var __THREW__ = 0;
/** @type {number} */
var setjmpId = 1;
var setjmpLabels = {};
/** @type {boolean} */
var ABORT = false;
/** @type {number} */
var EXITSTATUS = 0;
/** @type {number} */
var undef = 0;
var tempValue;
var tempInt;
var tempBigInt;
var tempInt2;
var tempBigInt2;
var tempPair;
var tempBigIntI;
var tempBigIntR;
var tempBigIntS;
var tempBigIntP;
var tempBigIntD;
var tempDouble;
var tempFloat;
var tempI64;
var tempI64b;
var tempRet0;
var tempRet1;
var tempRet2;
var tempRet3;
var tempRet4;
var tempRet5;
var tempRet6;
var tempRet7;
var tempRet8;
var tempRet9;
/** @type {global this} */
var globalScope = this;
/** @type {function (string, string, Array, Object): ?} */
Module["ccall"] = ccall;
/** @type {function (string, string, Array): ?} */
Module["cwrap"] = cwrap;
/** @type {function (number, number, string, ?): undefined} */
Module["setValue"] = setValue;
/** @type {function (number, string, ?): ?} */
Module["getValue"] = getValue;
/** @type {number} */
var ALLOC_NORMAL = 0;
/** @type {number} */
var ALLOC_STACK = 1;
/** @type {number} */
var ALLOC_STATIC = 2;
/** @type {number} */
var ALLOC_DYNAMIC = 3;
/** @type {number} */
var ALLOC_NONE = 4;
/** @type {number} */
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
/** @type {number} */
Module["ALLOC_STACK"] = ALLOC_STACK;
/** @type {number} */
Module["ALLOC_STATIC"] = ALLOC_STATIC;
/** @type {number} */
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
/** @type {number} */
Module["ALLOC_NONE"] = ALLOC_NONE;
/** @type {function (number, string, (number|string), number): ?} */
Module["allocate"] = allocate;
/** @type {function (number, number): ?} */
Module["Pointer_stringify"] = Pointer_stringify;
/** @type {function (number): ?} */
Module["UTF16ToString"] = UTF16ToString;
/** @type {function (string, number): undefined} */
Module["stringToUTF16"] = stringToUTF16;
/** @type {function (number): ?} */
Module["UTF32ToString"] = UTF32ToString;
/** @type {function (string, number): undefined} */
Module["stringToUTF32"] = stringToUTF32;
/** @type {number} */
var PAGE_SIZE = 4096;
var HEAP;
var HEAP8;
var HEAPU8;
var HEAP16;
var HEAPU16;
var HEAP32;
var HEAPU32;
var HEAPF32;
var HEAPF64;
/** @type {number} */
var STATIC_BASE = 0;
/** @type {number} */
var STATICTOP = 0;
/** @type {boolean} */
var staticSealed = false;
/** @type {number} */
var STACK_BASE = 0;
/** @type {number} */
var STACKTOP = 0;
/** @type {number} */
var STACK_MAX = 0;
/** @type {number} */
var DYNAMIC_BASE = 0;
/** @type {number} */
var DYNAMICTOP = 0;
var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
var FAST_MEMORY = Module["FAST_MEMORY"] || 2097152;
assert(typeof Int32Array !== "undefined" && (typeof Float64Array !== "undefined" && (!!(new Int32Array(1))["subarray"] && !!(new Int32Array(1))["set"])), "Cannot fallback to non-typed array case: Code is too specialized");
/** @type {ArrayBuffer} */
var buffer = new ArrayBuffer(TOTAL_MEMORY);
/** @type {Int8Array} */
HEAP8 = new Int8Array(buffer);
/** @type {Int16Array} */
HEAP16 = new Int16Array(buffer);
/** @type {Int32Array} */
HEAP32 = new Int32Array(buffer);
/** @type {Uint8Array} */
HEAPU8 = new Uint8Array(buffer);
/** @type {Uint16Array} */
HEAPU16 = new Uint16Array(buffer);
/** @type {Uint32Array} */
HEAPU32 = new Uint32Array(buffer);
/** @type {Float32Array} */
HEAPF32 = new Float32Array(buffer);
/** @type {Float64Array} */
HEAPF64 = new Float64Array(buffer);
/** @type {number} */
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, "Typed arrays 2 must be run on a little-endian system");
Module["HEAP"] = HEAP;
/** @type {Int8Array} */
Module["HEAP8"] = HEAP8;
/** @type {Int16Array} */
Module["HEAP16"] = HEAP16;
/** @type {Int32Array} */
Module["HEAP32"] = HEAP32;
/** @type {Uint8Array} */
Module["HEAPU8"] = HEAPU8;
/** @type {Uint16Array} */
Module["HEAPU16"] = HEAPU16;
/** @type {Uint32Array} */
Module["HEAPU32"] = HEAPU32;
/** @type {Float32Array} */
Module["HEAPF32"] = HEAPF32;
/** @type {Float64Array} */
Module["HEAPF64"] = HEAPF64;
/** @type {Array} */
var __ATPRERUN__ = [];
/** @type {Array} */
var __ATINIT__ = [];
/** @type {Array} */
var __ATMAIN__ = [];
/** @type {Array} */
var __ATEXIT__ = [];
/** @type {Array} */
var __ATPOSTRUN__ = [];
/** @type {boolean} */
var runtimeInitialized = false;
/** @type {function (?): undefined} */
Module["addOnPreRun"] = Module.addOnPreRun = addOnPreRun;
/** @type {function (?): undefined} */
Module["addOnInit"] = Module.addOnInit = addOnInit;
/** @type {function (?): undefined} */
Module["addOnPreMain"] = Module.addOnPreMain = addOnPreMain;
/** @type {function (?): undefined} */
Module["addOnExit"] = Module.addOnExit = addOnExit;
/** @type {function (?): undefined} */
Module["addOnPostRun"] = Module.addOnPostRun = addOnPostRun;
/** @type {function (string, boolean, number): ?} */
Module["intArrayFromString"] = intArrayFromString;
/** @type {function (Array): ?} */
Module["intArrayToString"] = intArrayToString;
/** @type {function (string, number, boolean): undefined} */
Module["writeStringToMemory"] = writeStringToMemory;
/** @type {function (Array, number): undefined} */
Module["writeArrayToMemory"] = writeArrayToMemory;
/** @type {function (string, number, ?): undefined} */
Module["writeAsciiToMemory"] = writeAsciiToMemory;
if (!Math["imul"] || Math["imul"](4294967295, 5) !== -5) {
  /**
   * @param {number} deepDataAndEvents
   * @param {number} dataAndEvents
   * @return {?}
   */
  Math["imul"] = function(deepDataAndEvents, dataAndEvents) {
    /** @type {number} */
    var a20 = deepDataAndEvents >>> 16;
    /** @type {number} */
    var a21 = deepDataAndEvents & 65535;
    /** @type {number} */
    var b12 = dataAndEvents >>> 16;
    /** @type {number} */
    var b02 = dataAndEvents & 65535;
    return a21 * b02 + (a20 * b02 + a21 * b12 << 16) | 0;
  };
}
Math.imul = Math["imul"];
/** @type {function (*): number} */
var Math_abs = Math.abs;
/** @type {function (*): number} */
var Math_cos = Math.cos;
/** @type {function (*): number} */
var Math_sin = Math.sin;
/** @type {function (*): number} */
var Math_tan = Math.tan;
/** @type {function (*): number} */
var Math_acos = Math.acos;
/** @type {function (*): number} */
var Math_asin = Math.asin;
/** @type {function (*): number} */
var Math_atan = Math.atan;
/** @type {function (*, *): number} */
var Math_atan2 = Math.atan2;
/** @type {function (*): number} */
var Math_exp = Math.exp;
/** @type {function (*): number} */
var Math_log = Math.log;
/** @type {function (*): number} */
var Math_sqrt = Math.sqrt;
/** @type {function (*): number} */
var Math_ceil = Math.ceil;
/** @type {function (*): number} */
var Math_floor = Math.floor;
/** @type {function (*, *): number} */
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
/** @type {function (...[*]): number} */
var Math_min = Math.min;
/** @type {number} */
var runDependencies = 0;
/** @type {null} */
var runDependencyWatcher = null;
/** @type {null} */
var dependenciesFulfilled = null;
var runDependencyTracking = {};
/** @type {function (string): undefined} */
Module["addRunDependency"] = addRunDependency;
/** @type {function (string): undefined} */
Module["removeRunDependency"] = removeRunDependency;
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
/** @type {null} */
var memoryInitializer = null;
/** @type {number} */
STATIC_BASE = 8;
/** @type {number} */
STATICTOP = STATIC_BASE + 3768;
__ATINIT__.push({
  /**
   * @return {undefined}
   */
  func : function() {
    runPostSets();
  }
});
allocate([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 
1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 5, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 
0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 89, 111, 117, 32, 117, 115, 101, 100, 32, 116, 111, 32, 98, 101, 32, 109, 117, 99, 104, 32, 109, 111, 114, 101, 46, 46, 46, 34, 109, 117, 99, 104, 105, 101, 114, 46, 34, 32, 89, 111, 117, 39, 118, 101, 32, 108, 111, 115, 116, 32, 121, 111, 117, 114, 32, 109, 117, 99, 104, 110, 101, 115, 115, 46, 10, 0, 0, 0, 0, 0, 
0, 0, 73, 116, 32, 119, 111, 117, 108, 100, 32, 98, 101, 32, 115, 111, 32, 110, 105, 99, 101, 32, 105, 102, 32, 115, 111, 109, 101, 116, 104, 105, 110, 103, 32, 109, 97, 100, 101, 32, 115, 101, 110, 115, 101, 32, 102, 111, 114, 32, 97, 32, 99, 104, 97, 110, 103, 101, 46, 10, 0, 0, 0, 0, 0, 0, 89, 101, 115, 44, 32, 116, 104, 97, 116, 39, 115, 32, 105, 116, 33, 32, 83, 97, 105, 100, 32, 116, 104, 101, 32, 72, 97, 116, 116, 101, 114, 32, 119, 105, 116, 104, 32, 97, 32, 115, 105, 103, 104, 10, 0, 0, 
0, 0, 34, 66, 101, 103, 105, 110, 32, 97, 116, 32, 116, 104, 101, 32, 98, 101, 103, 105, 110, 110, 105, 110, 103, 44, 34, 32, 116, 104, 101, 32, 75, 105, 110, 103, 32, 115, 97, 105, 100, 44, 32, 118, 101, 114, 121, 32, 103, 114, 97, 118, 101, 108, 121, 44, 32, 34, 97, 110, 100, 32, 103, 111, 32, 111, 110, 32, 116, 105, 108, 108, 32, 121, 111, 117, 32, 99, 111, 109, 101, 32, 116, 111, 32, 116, 104, 101, 32, 101, 110, 100, 58, 32, 116, 104, 101, 110, 32, 115, 116, 111, 112, 46, 34, 10, 0, 0, 0, 0, 
0, 0, 0, 0, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 46, 44, 44, 59, 59, 59, 59, 59, 33, 33, 33, 33, 33, 33, 33, 33, 33, 59, 59, 59, 44, 46, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 46, 44, 59, 59, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 59, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 46, 44, 59, 33, 
33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 62, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 44, 59, 59, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 62, 10, 32, 32, 32, 32, 32, 32, 32, 32, 44, 59, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 
33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 39, 10, 32, 32, 32, 32, 32, 32, 44, 60, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 10, 32, 32, 32, 32, 44, 60, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 
62, 10, 32, 32, 32, 59, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 62, 10, 32, 32, 60, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 62, 39, 39, 39, 39, 96, 96, 39, 39, 10, 32, 60, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 
33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 39, 39, 96, 32, 46, 46, 46, 46, 58, 58, 58, 58, 58, 58, 58, 58, 58, 10, 59, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 39, 96, 33, 33, 33, 33, 33, 33, 33, 33, 39, 39, 96, 46, 46, 46, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 10, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 39, 32, 44, 122, 32, 96, 33, 33, 33, 39, 96, 32, 46, 58, 58, 58, 
58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 10, 96, 96, 39, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 39, 39, 44, 99, 36, 36, 36, 98, 32, 96, 32, 46, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 10, 32, 32, 32, 32, 32, 96, 39, 33, 33, 33, 33, 33, 39, 32, 122, 36, 36, 36, 32, 36, 36, 36, 98, 32, 96, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 
58, 58, 58, 58, 58, 10, 32, 32, 32, 32, 32, 32, 32, 32, 96, 33, 39, 32, 99, 36, 36, 36, 36, 36, 104, 96, 36, 36, 36, 36, 32, 96, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 32, 32, 32, 32, 32, 95, 44, 59, 59, 59, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 122, 36, 80, 34, 95, 34, 63, 36, 36, 32, 36, 36, 34, 36, 36, 46, 32, 96, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 
58, 58, 58, 32, 32, 39, 96, 32, 46, 46, 32, 96, 33, 10, 32, 32, 32, 32, 32, 32, 32, 32, 122, 36, 36, 36, 32, 36, 36, 36, 99, 32, 34, 44, 96, 70, 32, 44, 34, 63, 99, 44, 96, 58, 58, 39, 39, 39, 96, 96, 96, 96, 96, 96, 96, 39, 39, 39, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 32, 32, 32, 60, 33, 39, 32, 60, 33, 10, 32, 32, 32, 32, 32, 32, 32, 74, 36, 63, 36, 36, 44, 96, 63, 36, 36, 36, 32, 51, 32, 36, 99, 44, 44, 100, 36, 80, 34, 32, 44, 59, 59, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 59, 
59, 44, 46, 96, 96, 96, 39, 58, 58, 58, 58, 58, 58, 58, 58, 32, 32, 32, 44, 33, 39, 10, 32, 32, 32, 32, 32, 32, 100, 36, 36, 44, 44, 96, 63, 98, 99, 44, 34, 34, 32, 74, 104, 96, 36, 36, 80, 34, 44, 59, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 59, 59, 59, 44, 44, 44, 44, 44, 44, 44, 59, 39, 96, 44, 110, 80, 80, 34, 39, 34, 61, 45, 10, 32, 32, 32, 32, 32, 96, 34, 39, 34, 63, 63, 36, 45, 96, 32, 46, 44, 110, 109, 110, 110, 44, 46, 32, 32, 96, 126, 104, 
32, 39, 96, 96, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 39, 39, 96, 96, 96, 96, 96, 96, 96, 96, 96, 32, 32, 32, 61, 77, 77, 77, 77, 77, 77, 77, 77, 77, 98, 110, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 99, 100, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 110, 44, 32, 96, 32, 34, 110, 46, 96, 60, 33, 33, 33, 33, 33, 33, 33, 39, 32, 44, 45, 61, 126, 34, 63, 63, 36, 36, 34, 36, 80, 34, 32, 32, 32, 32, 32, 96, 77, 77, 77, 80, 34, 32, 32, 32, 96, 34, 34, 10, 32, 32, 32, 
32, 32, 32, 32, 32, 32, 32, 32, 32, 46, 44, 110, 44, 46, 34, 63, 77, 77, 77, 77, 77, 77, 77, 77, 98, 44, 32, 32, 77, 77, 98, 32, 32, 96, 33, 39, 96, 44, 99, 36, 34, 32, 32, 32, 32, 32, 32, 32, 32, 34, 63, 34, 32, 44, 99, 99, 36, 99, 32, 44, 77, 77, 77, 77, 77, 77, 80, 52, 120, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 44, 110, 77, 77, 77, 77, 77, 77, 77, 98, 44, 51, 77, 77, 77, 77, 77, 77, 77, 77, 44, 32, 100, 77, 77, 114, 32, 32, 32, 99, 36, 36, 36, 70, 32, 44, 99, 100, 36, 36, 36, 63, 36, 99, 99, 
100, 36, 36, 80, 63, 63, 63, 32, 77, 77, 77, 77, 77, 77, 77, 77, 44, 34, 98, 10, 32, 32, 32, 32, 32, 32, 32, 110, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 62, 32, 104, 32, 63, 36, 36, 36, 36, 36, 36, 36, 36, 36, 34, 60, 36, 36, 99, 96, 36, 36, 39, 99, 100, 36, 44, 32, 34, 77, 77, 77, 77, 77, 80, 52, 77, 32, 77, 10, 32, 32, 32, 32, 32, 117, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 
77, 77, 77, 77, 76, 77, 62, 46, 32, 34, 36, 36, 36, 36, 36, 36, 36, 36, 46, 96, 36, 34, 32, 32, 36, 36, 99, 32, 32, 32, 34, 44, 61, 32, 34, 39, 34, 84, 39, 32, 39, 10, 32, 32, 32, 32, 74, 80, 32, 77, 77, 77, 77, 80, 32, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 46, 77, 62, 32, 36, 36, 36, 36, 36, 36, 36, 36, 36, 99, 44, 44, 44, 99, 36, 36, 36, 36, 98, 99, 44, 99, 99, 36, 36, 36, 98, 44, 10, 32, 32, 32, 32, 39, 32, 100, 77, 77, 77, 34, 44, 77, 77, 
77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 80, 34, 39, 34, 39, 34, 32, 63, 36, 36, 70, 60, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 80, 63, 63, 63, 36, 36, 36, 36, 36, 36, 36, 36, 36, 10, 32, 32, 32, 32, 32, 100, 77, 80, 34, 32, 44, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 32, 122, 74, 70, 34, 63, 63, 99, 99, 44, 96, 32, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 32, 36, 98, 99, 74, 36, 36, 36, 36, 36, 36, 36, 80, 10, 32, 
32, 32, 32, 32, 77, 32, 32, 32, 32, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 58, 60, 36, 36, 36, 36, 99, 32, 32, 34, 36, 32, 74, 36, 36, 36, 36, 36, 36, 36, 80, 70, 34, 32, 46, 34, 36, 36, 36, 36, 36, 36, 36, 36, 80, 34, 32, 46, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 52, 77, 52, 77, 77, 77, 77, 77, 52, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 76, 32, 63, 36, 36, 36, 36, 32, 60, 99, 44, 32, 36, 36, 36, 36, 63, 36, 80, 32, 44, 99, 100, 36, 36, 
99, 99, 44, 34, 39, 34, 34, 32, 32, 32, 99, 99, 36, 36, 114, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 96, 77, 39, 77, 77, 77, 77, 62, 52, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 120, 32, 34, 36, 36, 36, 98, 44, 34, 34, 32, 36, 36, 36, 36, 32, 36, 32, 39, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 32, 52, 36, 44, 34, 36, 36, 36, 70, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 77, 77, 77, 77, 62, 32, 77, 77, 77, 77, 77, 77, 77, 77, 34, 34, 63, 77, 77, 62, 32, 34, 63, 110, 32, 96, 
34, 63, 63, 63, 32, 36, 36, 36, 36, 32, 63, 32, 45, 96, 63, 36, 36, 36, 36, 36, 36, 36, 36, 99, 96, 63, 36, 99, 36, 36, 36, 70, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 34, 77, 77, 76, 32, 46, 34, 63, 77, 77, 77, 77, 32, 32, 32, 32, 32, 34, 34, 32, 32, 32, 32, 32, 32, 32, 34, 36, 36, 46, 96, 34, 34, 36, 98, 74, 46, 52, 32, 32, 34, 63, 36, 36, 36, 36, 36, 36, 70, 32, 32, 36, 36, 36, 36, 36, 39, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 34, 63, 60, 32, 63, 32, 32, 
32, 34, 34, 45, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 44, 59, 59, 33, 62, 32, 36, 36, 36, 36, 32, 98, 32, 34, 99, 99, 32, 44, 44, 32, 99, 32, 36, 36, 36, 36, 36, 36, 70, 32, 32, 44, 44, 45, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 44, 59, 33, 33, 33, 33, 33, 33, 32, 96, 36, 36, 36, 99, 96, 98, 46, 34, 36, 32, 36, 36, 32, 36, 32, 34, 36, 36, 36, 36, 36, 39, 44, 33, 33, 33, 
10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 44, 59, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 32, 96, 36, 36, 36, 36, 36, 36, 44, 32, 34, 61, 61, 61, 61, 34, 44, 36, 36, 36, 36, 39, 44, 33, 33, 39, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 44, 60, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 62, 32, 96, 36, 36, 36, 
36, 36, 36, 36, 36, 99, 99, 99, 36, 36, 36, 70, 44, 36, 39, 44, 33, 33, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 96, 96, 60, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 46, 96, 63, 63, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 34, 44, 34, 32, 59, 33, 39, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 96, 96, 
39, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 32, 59, 59, 32, 34, 36, 36, 36, 36, 36, 36, 80, 34, 32, 44, 59, 62, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 96, 60, 33, 33, 33, 33, 33, 33, 33, 39, 59, 33, 33, 33, 32, 96, 36, 36, 36, 80, 34, 32, 59, 33, 33, 33, 33, 62, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 
32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 46, 44, 46, 96, 96, 32, 96, 33, 33, 33, 33, 32, 32, 34, 34, 32, 45, 39, 39, 33, 39, 39, 32, 44, 33, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 44, 33, 33, 33, 33, 33, 33, 33, 62, 59, 44, 32, 96, 39, 92, 32, 60, 33, 62, 32, 32, 32, 44, 59, 60, 33, 33, 33, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 
32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 10, 32, 194, 169, 32, 110, 117, 108, 108, 115, 117, 98, 32, 50, 107, 49, 52, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 
32, 10, 10, 0, 0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
assert(tempDoublePtr % 8 == 0);
var ERRNO_CODES = {
  EPERM : 1,
  ENOENT : 2,
  ESRCH : 3,
  EINTR : 4,
  EIO : 5,
  ENXIO : 6,
  E2BIG : 7,
  ENOEXEC : 8,
  EBADF : 9,
  ECHILD : 10,
  EAGAIN : 11,
  EWOULDBLOCK : 11,
  ENOMEM : 12,
  EACCES : 13,
  EFAULT : 14,
  ENOTBLK : 15,
  EBUSY : 16,
  EEXIST : 17,
  EXDEV : 18,
  ENODEV : 19,
  ENOTDIR : 20,
  EISDIR : 21,
  EINVAL : 22,
  ENFILE : 23,
  EMFILE : 24,
  ENOTTY : 25,
  ETXTBSY : 26,
  EFBIG : 27,
  ENOSPC : 28,
  ESPIPE : 29,
  EROFS : 30,
  EMLINK : 31,
  EPIPE : 32,
  EDOM : 33,
  ERANGE : 34,
  ENOMSG : 42,
  EIDRM : 43,
  ECHRNG : 44,
  EL2NSYNC : 45,
  EL3HLT : 46,
  EL3RST : 47,
  ELNRNG : 48,
  EUNATCH : 49,
  ENOCSI : 50,
  EL2HLT : 51,
  EDEADLK : 35,
  ENOLCK : 37,
  EBADE : 52,
  EBADR : 53,
  EXFULL : 54,
  ENOANO : 55,
  EBADRQC : 56,
  EBADSLT : 57,
  EDEADLOCK : 35,
  EBFONT : 59,
  ENOSTR : 60,
  ENODATA : 61,
  ETIME : 62,
  ENOSR : 63,
  ENONET : 64,
  ENOPKG : 65,
  EREMOTE : 66,
  ENOLINK : 67,
  EADV : 68,
  ESRMNT : 69,
  ECOMM : 70,
  EPROTO : 71,
  EMULTIHOP : 72,
  EDOTDOT : 73,
  EBADMSG : 74,
  ENOTUNIQ : 76,
  EBADFD : 77,
  EREMCHG : 78,
  ELIBACC : 79,
  ELIBBAD : 80,
  ELIBSCN : 81,
  ELIBMAX : 82,
  ELIBEXEC : 83,
  ENOSYS : 38,
  ENOTEMPTY : 39,
  ENAMETOOLONG : 36,
  ELOOP : 40,
  EOPNOTSUPP : 95,
  EPFNOSUPPORT : 96,
  ECONNRESET : 104,
  ENOBUFS : 105,
  EAFNOSUPPORT : 97,
  EPROTOTYPE : 91,
  ENOTSOCK : 88,
  ENOPROTOOPT : 92,
  ESHUTDOWN : 108,
  ECONNREFUSED : 111,
  EADDRINUSE : 98,
  ECONNABORTED : 103,
  ENETUNREACH : 101,
  ENETDOWN : 100,
  ETIMEDOUT : 110,
  EHOSTDOWN : 112,
  EHOSTUNREACH : 113,
  EINPROGRESS : 115,
  EALREADY : 114,
  EDESTADDRREQ : 89,
  EMSGSIZE : 90,
  EPROTONOSUPPORT : 93,
  ESOCKTNOSUPPORT : 94,
  EADDRNOTAVAIL : 99,
  ENETRESET : 102,
  EISCONN : 106,
  ENOTCONN : 107,
  ETOOMANYREFS : 109,
  EUSERS : 87,
  EDQUOT : 122,
  ESTALE : 116,
  ENOTSUP : 95,
  ENOMEDIUM : 123,
  EILSEQ : 84,
  EOVERFLOW : 75,
  ECANCELED : 125,
  ENOTRECOVERABLE : 131,
  EOWNERDEAD : 130,
  ESTRPIPE : 86
};
var ERRNO_MESSAGES = {
  0 : "Success",
  1 : "Not super-user",
  2 : "No such file or directory",
  3 : "No such process",
  4 : "Interrupted system call",
  5 : "I/O error",
  6 : "No such device or address",
  7 : "Arg list too long",
  8 : "Exec format error",
  9 : "Bad file number",
  10 : "No children",
  11 : "No more processes",
  12 : "Not enough core",
  13 : "Permission denied",
  14 : "Bad address",
  15 : "Block device required",
  16 : "Mount device busy",
  17 : "File exists",
  18 : "Cross-device link",
  19 : "No such device",
  20 : "Not a directory",
  21 : "Is a directory",
  22 : "Invalid argument",
  23 : "Too many open files in system",
  24 : "Too many open files",
  25 : "Not a typewriter",
  26 : "Text file busy",
  27 : "File too large",
  28 : "No space left on device",
  29 : "Illegal seek",
  30 : "Read only file system",
  31 : "Too many links",
  32 : "Broken pipe",
  33 : "Math arg out of domain of func",
  34 : "Math result not representable",
  35 : "File locking deadlock error",
  36 : "File or path name too long",
  37 : "No record locks available",
  38 : "Function not implemented",
  39 : "Directory not empty",
  40 : "Too many symbolic links",
  42 : "No message of desired type",
  43 : "Identifier removed",
  44 : "Channel number out of range",
  45 : "Level 2 not synchronized",
  46 : "Level 3 halted",
  47 : "Level 3 reset",
  48 : "Link number out of range",
  49 : "Protocol driver not attached",
  50 : "No CSI structure available",
  51 : "Level 2 halted",
  52 : "Invalid exchange",
  53 : "Invalid request descriptor",
  54 : "Exchange full",
  55 : "No anode",
  56 : "Invalid request code",
  57 : "Invalid slot",
  59 : "Bad font file fmt",
  60 : "Device not a stream",
  61 : "No data (for no delay io)",
  62 : "Timer expired",
  63 : "Out of streams resources",
  64 : "Machine is not on the network",
  65 : "Package not installed",
  66 : "The object is remote",
  67 : "The link has been severed",
  68 : "Advertise error",
  69 : "Srmount error",
  70 : "Communication error on send",
  71 : "Protocol error",
  72 : "Multihop attempted",
  73 : "Cross mount point (not really error)",
  74 : "Trying to read unreadable message",
  75 : "Value too large for defined data type",
  76 : "Given log. name not unique",
  77 : "f.d. invalid for this operation",
  78 : "Remote address changed",
  79 : "Can   access a needed shared lib",
  80 : "Accessing a corrupted shared lib",
  81 : ".lib section in a.out corrupted",
  82 : "Attempting to link in too many libs",
  83 : "Attempting to exec a shared library",
  84 : "Illegal byte sequence",
  86 : "Streams pipe error",
  87 : "Too many users",
  88 : "Socket operation on non-socket",
  89 : "Destination address required",
  90 : "Message too long",
  91 : "Protocol wrong type for socket",
  92 : "Protocol not available",
  93 : "Unknown protocol",
  94 : "Socket type not supported",
  95 : "Not supported",
  96 : "Protocol family not supported",
  97 : "Address family not supported by protocol family",
  98 : "Address already in use",
  99 : "Address not available",
  100 : "Network interface is not configured",
  101 : "Network is unreachable",
  102 : "Connection reset by network",
  103 : "Connection aborted",
  104 : "Connection reset by peer",
  105 : "No buffer space available",
  106 : "Socket is already connected",
  107 : "Socket is not connected",
  108 : "Can't send after socket shutdown",
  109 : "Too many references",
  110 : "Connection timed out",
  111 : "Connection refused",
  112 : "Host is down",
  113 : "Host is unreachable",
  114 : "Socket already connected",
  115 : "Connection already in progress",
  116 : "Stale file handle",
  122 : "Quota exceeded",
  123 : "No medium (in tape drive)",
  125 : "Operation canceled",
  130 : "Previous owner died",
  131 : "State not recoverable"
};
/** @type {number} */
var ___errno_state = 0;
var PATH = {
  /**
   * @param {?} filename
   * @return {?}
   */
  splitPath : function(filename) {
    /** @type {RegExp} */
    var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return splitPathRe.exec(filename).slice(1);
  },
  /**
   * @param {Array} parts
   * @param {boolean} recurring
   * @return {?}
   */
  normalizeArray : function(parts, recurring) {
    /** @type {number} */
    var n = 0;
    /** @type {number} */
    var i = parts.length - 1;
    for (;i >= 0;i--) {
      var part = parts[i];
      if (part === ".") {
        parts.splice(i, 1);
      } else {
        if (part === "..") {
          parts.splice(i, 1);
          n++;
        } else {
          if (n) {
            parts.splice(i, 1);
            n--;
          }
        }
      }
    }
    if (recurring) {
      for (;n--;n) {
        parts.unshift("..");
      }
    }
    return parts;
  },
  /**
   * @param {string} path
   * @return {?}
   */
  normalize : function(path) {
    /** @type {boolean} */
    var isAbsolute = path.charAt(0) === "/";
    /** @type {boolean} */
    var trailingSlash = path.substr(-1) === "/";
    path = PATH.normalizeArray(path.split("/").filter(function(dataAndEvents) {
      return!!dataAndEvents;
    }), !isAbsolute).join("/");
    if (!path && !isAbsolute) {
      /** @type {string} */
      path = ".";
    }
    if (path && trailingSlash) {
      path += "/";
    }
    return(isAbsolute ? "/" : "") + path;
  },
  /**
   * @param {string} path
   * @return {?}
   */
  dirname : function(path) {
    var result = PATH.splitPath(path);
    var root = result[0];
    var dir = result[1];
    if (!root && !dir) {
      return ".";
    }
    if (dir) {
      dir = dir.substr(0, dir.length - 1);
    }
    return root + dir;
  },
  /**
   * @param {string} path
   * @return {?}
   */
  basename : function(path) {
    if (path === "/") {
      return "/";
    }
    var lastSlash = path.lastIndexOf("/");
    if (lastSlash === -1) {
      return path;
    }
    return path.substr(lastSlash + 1);
  },
  /**
   * @param {?} path
   * @return {?}
   */
  extname : function(path) {
    return PATH.splitPath(path)[3];
  },
  /**
   * @return {?}
   */
  join : function() {
    /** @type {Array.<?>} */
    var handles = Array.prototype.slice.call(arguments, 0);
    return PATH.normalize(handles.join("/"));
  },
  /**
   * @param {string} name
   * @param {string} value
   * @return {?}
   */
  join2 : function(name, value) {
    return PATH.normalize(name + "/" + value);
  },
  /**
   * @return {?}
   */
  resolve : function() {
    /** @type {string} */
    var resolvedPath = "";
    /** @type {boolean} */
    var resolvedAbsolute = false;
    /** @type {number} */
    var i = arguments.length - 1;
    for (;i >= -1 && !resolvedAbsolute;i--) {
      var path = i >= 0 ? arguments[i] : FS.cwd();
      if (typeof path !== "string") {
        throw new TypeError("Arguments to path.resolve must be strings");
      } else {
        if (!path) {
          continue;
        }
      }
      /** @type {string} */
      resolvedPath = path + "/" + resolvedPath;
      /** @type {boolean} */
      resolvedAbsolute = path.charAt(0) === "/";
    }
    resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(function(dataAndEvents) {
      return!!dataAndEvents;
    }), !resolvedAbsolute).join("/");
    return(resolvedAbsolute ? "/" : "") + resolvedPath || ".";
  },
  /**
   * @param {string} to
   * @param {string} from
   * @return {?}
   */
  relative : function(to, from) {
    /**
     * @param {Object} arr
     * @return {?}
     */
    function trim(arr) {
      /** @type {number} */
      var start = 0;
      for (;start < arr.length;start++) {
        if (arr[start] !== "") {
          break;
        }
      }
      /** @type {number} */
      var end = arr.length - 1;
      for (;end >= 0;end--) {
        if (arr[end] !== "") {
          break;
        }
      }
      if (start > end) {
        return[];
      }
      return arr.slice(start, end - start + 1);
    }
    to = PATH.resolve(to).substr(1);
    from = PATH.resolve(from).substr(1);
    var fromParts = trim(to.split("/"));
    var toParts = trim(from.split("/"));
    /** @type {number} */
    var length = Math.min(fromParts.length, toParts.length);
    /** @type {number} */
    var samePartsLength = length;
    /** @type {number} */
    var i = 0;
    for (;i < length;i++) {
      if (fromParts[i] !== toParts[i]) {
        /** @type {number} */
        samePartsLength = i;
        break;
      }
    }
    /** @type {Array} */
    var curr = [];
    /** @type {number} */
    i = samePartsLength;
    for (;i < fromParts.length;i++) {
      curr.push("..");
    }
    /** @type {Array} */
    curr = curr.concat(toParts.slice(samePartsLength));
    return curr.join("/");
  }
};
var TTY = {
  ttys : [],
  /**
   * @return {undefined}
   */
  init : function() {
  },
  /**
   * @return {undefined}
   */
  shutdown : function() {
  },
  /**
   * @param {?} path
   * @param {?} tmpl
   * @return {undefined}
   */
  register : function(path, tmpl) {
    TTY.ttys[path] = {
      input : [],
      output : [],
      ops : tmpl
    };
    FS.registerDevice(path, TTY.stream_ops);
  },
  stream_ops : {
    /**
     * @param {string} method
     * @return {undefined}
     */
    open : function(method) {
      var property = TTY.ttys[method.node.rdev];
      if (!property) {
        throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
      }
      method.tty = property;
      /** @type {boolean} */
      method.seekable = false;
    },
    /**
     * @param {?} cb
     * @return {undefined}
     */
    close : function(cb) {
      if (cb.tty.output.length) {
        cb.tty.ops.put_char(cb.tty, 10);
      }
    },
    /**
     * @param {Object} data
     * @param {Uint8Array} buffer
     * @param {number} offset
     * @param {number} length
     * @param {number} position
     * @return {?}
     */
    read : function(data, buffer, offset, length, position) {
      if (!data.tty || !data.tty.ops.get_char) {
        throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
      }
      /** @type {number} */
      var b = 0;
      /** @type {number} */
      var i = 0;
      for (;i < length;i++) {
        var output;
        try {
          output = data.tty.ops.get_char(data.tty);
        } catch (a) {
          throw new FS.ErrnoError(ERRNO_CODES.EIO);
        }
        if (output === undefined && b === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
        }
        if (output === null || output === undefined) {
          break;
        }
        b++;
        buffer[offset + i] = output;
      }
      if (b) {
        /** @type {number} */
        data.node.timestamp = Date.now();
      }
      return b;
    },
    /**
     * @param {Object} cb
     * @param {string} text
     * @param {number} recurring
     * @param {number} length
     * @param {number} position
     * @return {?}
     */
    write : function(cb, text, recurring, length, position) {
      if (!cb.tty || !cb.tty.ops.put_char) {
        throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
      }
      /** @type {number} */
      var i = 0;
      for (;i < length;i++) {
        try {
          cb.tty.ops.put_char(cb.tty, text[recurring + i]);
        } catch (o) {
          throw new FS.ErrnoError(ERRNO_CODES.EIO);
        }
      }
      if (length) {
        /** @type {number} */
        cb.node.timestamp = Date.now();
      }
      return i;
    }
  },
  default_tty_ops : {
    /**
     * @param {Array} env
     * @return {?}
     */
    get_char : function(env) {
      if (!env.input.length) {
        /** @type {null} */
        var udataCur = null;
        if (ENVIRONMENT_IS_NODE) {
          udataCur = process["stdin"]["read"]();
          if (!udataCur) {
            if (process["stdin"]["_readableState"] && process["stdin"]["_readableState"]["ended"]) {
              return null;
            }
            return undefined;
          }
        } else {
          if (typeof window != "undefined" && typeof window.prompt == "function") {
            /** @type {(null|string)} */
            udataCur = window.prompt("Input: ");
            if (udataCur !== null) {
              udataCur += "\n";
            }
          } else {
            if (typeof readline == "function") {
              udataCur = readline();
              if (udataCur !== null) {
                udataCur += "\n";
              }
            }
          }
        }
        if (!udataCur) {
          return null;
        }
        env.input = intArrayFromString(udataCur, true);
      }
      return env.input.shift();
    },
    /**
     * @param {?} test
     * @param {number} col
     * @return {undefined}
     */
    put_char : function(test, col) {
      if (col === null || col === 10) {
        Module["print"](test.output.join(""));
        /** @type {Array} */
        test.output = [];
      } else {
        test.output.push(TTY.utf8.processCChar(col));
      }
    }
  },
  default_tty1_ops : {
    /**
     * @param {?} test
     * @param {number} col
     * @return {undefined}
     */
    put_char : function(test, col) {
      if (col === null || col === 10) {
        Module["printErr"](test.output.join(""));
        /** @type {Array} */
        test.output = [];
      } else {
        test.output.push(TTY.utf8.processCChar(col));
      }
    }
  }
};
var MEMFS = {
  ops_table : null,
  CONTENT_OWNING : 1,
  CONTENT_FLEXIBLE : 2,
  CONTENT_FIXED : 3,
  /**
   * @param {?} obj
   * @return {?}
   */
  mount : function(obj) {
    return MEMFS.createNode(null, "/", 16384 | 511, 0);
  },
  /**
   * @param {string} recurring
   * @param {(number|string)} name
   * @param {number} url
   * @param {number} crossScope
   * @return {?}
   */
  createNode : function(recurring, name, url, crossScope) {
    if (FS.isBlkdev(url) || FS.isFIFO(url)) {
      throw new FS.ErrnoError(ERRNO_CODES.EPERM);
    }
    if (!MEMFS.ops_table) {
      MEMFS.ops_table = {
        dir : {
          node : {
            getattr : MEMFS.node_ops.getattr,
            setattr : MEMFS.node_ops.setattr,
            lookup : MEMFS.node_ops.lookup,
            mknod : MEMFS.node_ops.mknod,
            mknod : MEMFS.node_ops.mknod,
            rename : MEMFS.node_ops.rename,
            unlink : MEMFS.node_ops.unlink,
            rmdir : MEMFS.node_ops.rmdir,
            readdir : MEMFS.node_ops.readdir,
            symlink : MEMFS.node_ops.symlink
          },
          stream : {
            llseek : MEMFS.stream_ops.llseek
          }
        },
        file : {
          node : {
            getattr : MEMFS.node_ops.getattr,
            setattr : MEMFS.node_ops.setattr
          },
          stream : {
            llseek : MEMFS.stream_ops.llseek,
            read : MEMFS.stream_ops.read,
            write : MEMFS.stream_ops.write,
            allocate : MEMFS.stream_ops.allocate,
            mmap : MEMFS.stream_ops.mmap
          }
        },
        link : {
          node : {
            getattr : MEMFS.node_ops.getattr,
            setattr : MEMFS.node_ops.setattr,
            readlink : MEMFS.node_ops.readlink
          },
          stream : {}
        },
        chrdev : {
          node : {
            getattr : MEMFS.node_ops.getattr,
            setattr : MEMFS.node_ops.setattr
          },
          stream : FS.chrdev_stream_ops
        }
      };
    }
    var self = FS.createNode(recurring, name, url, crossScope);
    if (FS.isDir(self.mode)) {
      self.node_ops = MEMFS.ops_table.dir.node;
      self.stream_ops = MEMFS.ops_table.dir.stream;
      self.contents = {};
    } else {
      if (FS.isFile(self.mode)) {
        self.node_ops = MEMFS.ops_table.file.node;
        self.stream_ops = MEMFS.ops_table.file.stream;
        /** @type {Array} */
        self.contents = [];
        self.contentMode = MEMFS.CONTENT_FLEXIBLE;
      } else {
        if (FS.isLink(self.mode)) {
          self.node_ops = MEMFS.ops_table.link.node;
          self.stream_ops = MEMFS.ops_table.link.stream;
        } else {
          if (FS.isChrdev(self.mode)) {
            self.node_ops = MEMFS.ops_table.chrdev.node;
            self.stream_ops = MEMFS.ops_table.chrdev.stream;
          }
        }
      }
    }
    /** @type {number} */
    self.timestamp = Date.now();
    if (recurring) {
      recurring.contents[name] = self;
    }
    return self;
  },
  /**
   * @param {Object} self
   * @return {undefined}
   */
  ensureFlexible : function(self) {
    if (self.contentMode !== MEMFS.CONTENT_FLEXIBLE) {
      var content = self.contents;
      /** @type {Array.<?>} */
      self.contents = Array.prototype.slice.call(content);
      self.contentMode = MEMFS.CONTENT_FLEXIBLE;
    }
  },
  node_ops : {
    /**
     * @param {Object} self
     * @return {?}
     */
    getattr : function(self) {
      var stats = {};
      stats.dev = FS.isChrdev(self.mode) ? self.id : 1;
      stats.ino = self.id;
      stats.mode = self.mode;
      /** @type {number} */
      stats.nlink = 1;
      /** @type {number} */
      stats.uid = 0;
      /** @type {number} */
      stats.gid = 0;
      stats.rdev = self.rdev;
      if (FS.isDir(self.mode)) {
        /** @type {number} */
        stats.size = 4096;
      } else {
        if (FS.isFile(self.mode)) {
          stats.size = self.contents.length;
        } else {
          if (FS.isLink(self.mode)) {
            stats.size = self.link.length;
          } else {
            /** @type {number} */
            stats.size = 0;
          }
        }
      }
      /** @type {Date} */
      stats.atime = new Date(self.timestamp);
      /** @type {Date} */
      stats.mtime = new Date(self.timestamp);
      /** @type {Date} */
      stats.ctime = new Date(self.timestamp);
      /** @type {number} */
      stats.blksize = 4096;
      /** @type {number} */
      stats.blocks = Math.ceil(stats.size / stats.blksize);
      return stats;
    },
    /**
     * @param {Object} self
     * @param {Object} a
     * @return {undefined}
     */
    setattr : function(self, a) {
      if (a.mode !== undefined) {
        self.mode = a.mode;
      }
      if (a.timestamp !== undefined) {
        self.timestamp = a.timestamp;
      }
      if (a.size !== undefined) {
        MEMFS.ensureFlexible(self);
        var b = self.contents;
        if (a.size < b.length) {
          b.length = a.size;
        } else {
          for (;a.size > b.length;) {
            b.push(0);
          }
        }
      }
    },
    /**
     * @param {string} name
     * @param {string} path
     * @return {?}
     */
    lookup : function(name, path) {
      throw FS.genericErrors[ERRNO_CODES.ENOENT];
    },
    /**
     * @param {string} recurring
     * @param {number} name
     * @param {number} url
     * @param {number} crossScope
     * @return {?}
     */
    mknod : function(recurring, name, url, crossScope) {
      return MEMFS.createNode(recurring, name, url, crossScope);
    },
    /**
     * @param {Object} data
     * @param {Object} node
     * @param {string} name
     * @return {undefined}
     */
    rename : function(data, node, name) {
      if (FS.isDir(data.mode)) {
        var state;
        try {
          state = FS.lookupNode(node, name);
        } catch (i) {
        }
        if (state) {
          var n;
          for (n in state.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
        }
      }
      delete data.parent.contents[data.name];
      /** @type {string} */
      data.name = name;
      /** @type {Object} */
      node.contents[name] = data;
      /** @type {Object} */
      data.parent = node;
    },
    /**
     * @param {string} dir
     * @param {?} path
     * @return {undefined}
     */
    unlink : function(dir, path) {
      delete dir.contents[path];
    },
    /**
     * @param {string} dir
     * @param {string} path
     * @return {undefined}
     */
    rmdir : function(dir, path) {
      var parent = FS.lookupNode(dir, path);
      var i;
      for (i in parent.contents) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
      }
      delete dir.contents[path];
    },
    /**
     * @param {?} s
     * @return {?}
     */
    readdir : function(s) {
      /** @type {Array} */
      var bProperties = [".", ".."];
      var i;
      for (i in s.contents) {
        if (!s.contents.hasOwnProperty(i)) {
          continue;
        }
        bProperties.push(i);
      }
      return bProperties;
    },
    /**
     * @param {string} recurring
     * @param {string} path
     * @param {string} type
     * @return {?}
     */
    symlink : function(recurring, path, type) {
      var data = MEMFS.createNode(recurring, path, 511 | 40960, 0);
      /** @type {string} */
      data.link = type;
      return data;
    },
    /**
     * @param {Object} module
     * @return {?}
     */
    readlink : function(module) {
      if (!FS.isLink(module.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
      }
      return module.link;
    }
  },
  stream_ops : {
    /**
     * @param {Object} data
     * @param {Uint8Array} buf
     * @param {number} off
     * @param {(boolean|number)} length
     * @param {number} offset
     * @return {?}
     */
    read : function(data, buf, off, length, offset) {
      var buffer = data.node.contents;
      if (offset >= buffer.length) {
        return 0;
      }
      /** @type {number} */
      var size = Math.min(buffer.length - offset, length);
      assert(size >= 0);
      if (size > 8 && buffer.subarray) {
        buf.set(buffer.subarray(offset, offset + size), off);
      } else {
        /** @type {number} */
        var i = 0;
        for (;i < size;i++) {
          buf[off + i] = buffer[offset + i];
        }
      }
      return size;
    },
    /**
     * @param {Object} cb
     * @param {string} data
     * @param {number} recurring
     * @param {number} length
     * @param {number} offset
     * @param {boolean} deepDataAndEvents
     * @return {?}
     */
    write : function(cb, data, recurring, length, offset, deepDataAndEvents) {
      var self = cb.node;
      /** @type {number} */
      self.timestamp = Date.now();
      var buffer = self.contents;
      if (length && (buffer.length === 0 && (offset === 0 && data.subarray))) {
        assert(data.length);
        if (deepDataAndEvents && recurring === 0) {
          /** @type {string} */
          self.contents = data;
          self.contentMode = data.buffer === HEAP8.buffer ? MEMFS.CONTENT_OWNING : MEMFS.CONTENT_FIXED;
        } else {
          /** @type {Uint8Array} */
          self.contents = new Uint8Array(data.subarray(recurring, recurring + length));
          self.contentMode = MEMFS.CONTENT_FIXED;
        }
        return length;
      }
      MEMFS.ensureFlexible(self);
      buffer = self.contents;
      for (;buffer.length < offset;) {
        buffer.push(0);
      }
      /** @type {number} */
      var i = 0;
      for (;i < length;i++) {
        buffer[offset + i] = data[recurring + i];
      }
      return length;
    },
    /**
     * @param {Object} options
     * @param {number} recurring
     * @param {number} opt_attributes
     * @return {?}
     */
    llseek : function(options, recurring, opt_attributes) {
      /** @type {number} */
      var offset = recurring;
      if (opt_attributes === 1) {
        offset += options.position;
      } else {
        if (opt_attributes === 2) {
          if (FS.isFile(options.node.mode)) {
            offset += options.node.contents.length;
          }
        }
      }
      if (offset < 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
      }
      /** @type {Array} */
      options.ungotten = [];
      options.position = offset;
      return offset;
    },
    /**
     * @param {Object} options
     * @param {number} deepDataAndEvents
     * @param {number} triggerRoute
     * @return {undefined}
     */
    allocate : function(options, deepDataAndEvents, triggerRoute) {
      MEMFS.ensureFlexible(options.node);
      var list = options.node.contents;
      var loadedCount = deepDataAndEvents + triggerRoute;
      for (;loadedCount > list.length;) {
        list.push(0);
      }
    },
    /**
     * @param {Object} options
     * @param {Uint8Array} b
     * @param {?} deepDataAndEvents
     * @param {number} length
     * @param {number} i
     * @param {?} triggerRoute
     * @param {number} arg
     * @return {?}
     */
    mmap : function(options, b, deepDataAndEvents, length, i, triggerRoute, arg) {
      if (!FS.isFile(options.node.mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
      }
      var len;
      var allocated;
      var data = options.node.contents;
      if (!(arg & 2) && (data.buffer === b || data.buffer === b.buffer)) {
        /** @type {boolean} */
        allocated = false;
        len = data.byteOffset;
      } else {
        if (i > 0 || i + length < data.length) {
          if (data.subarray) {
            data = data.subarray(i, i + length);
          } else {
            /** @type {Array.<?>} */
            data = Array.prototype.slice.call(data, i, i + length);
          }
        }
        /** @type {boolean} */
        allocated = true;
        len = _malloc(length);
        if (!len) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
        }
        b.set(data, len);
      }
      return{
        ptr : len,
        allocated : allocated
      };
    }
  }
};
var IDBFS = {
  dbs : {},
  /**
   * @return {?}
   */
  indexedDB : function() {
    return window.indexedDB || (window.mozIndexedDB || (window.webkitIndexedDB || window.msIndexedDB));
  },
  DB_VERSION : 20,
  DB_STORE_NAME : "FILE_DATA",
  /**
   * @param {?} obj
   * @return {?}
   */
  mount : function(obj) {
    return MEMFS.mount.apply(null, arguments);
  },
  /**
   * @param {Object} test
   * @param {boolean} $1
   * @param {Function} callback
   * @return {undefined}
   */
  syncfs : function(test, $1, callback) {
    IDBFS.getLocalSet(test, function(basis, $0) {
      if (basis) {
        return callback(basis);
      }
      IDBFS.getRemoteSet(test, function(basis, dataAndEvents) {
        if (basis) {
          return callback(basis);
        }
        var REQ = $1 ? dataAndEvents : $0;
        var memory = $1 ? $0 : dataAndEvents;
        IDBFS.reconcile(REQ, memory, callback);
      });
    });
  },
  /**
   * @param {Object} req
   * @param {Object} options
   * @param {Function} fn
   * @return {?}
   */
  reconcile : function(req, options, fn) {
    /**
     * @param {Array} recurring
     * @return {?}
     */
    function callback(recurring) {
      if (recurring) {
        return fn(recurring);
      }
      if (++index >= length) {
        return fn(null);
      }
    }
    /** @type {number} */
    var length = 0;
    var files = {};
    var key;
    for (key in req.files) {
      if (!req.files.hasOwnProperty(key)) {
        continue;
      }
      var entry = req.files[key];
      var q = options.files[key];
      if (!q || entry.timestamp > q.timestamp) {
        files[key] = entry;
        length++;
      }
    }
    var cache = {};
    for (key in options.files) {
      if (!options.files.hasOwnProperty(key)) {
        continue;
      }
      entry = options.files[key];
      q = req.files[key];
      if (!q) {
        cache[key] = entry;
        length++;
      }
    }
    if (!length) {
      return fn(null);
    }
    /** @type {number} */
    var index = 0;
    var database = req.type === "remote" ? req.db : options.db;
    var transaction = database.transaction([IDBFS.DB_STORE_NAME], "readwrite");
    /**
     * @return {undefined}
     */
    transaction.onerror = function() {
      fn(this.error);
    };
    var _this = transaction.objectStore(IDBFS.DB_STORE_NAME);
    var path;
    for (path in files) {
      if (!files.hasOwnProperty(path)) {
        continue;
      }
      var data = files[path];
      if (options.type === "local") {
        try {
          if (FS.isDir(data.mode)) {
            FS.mkdir(path, data.mode);
          } else {
            if (FS.isFile(data.mode)) {
              var fd = FS.open(path, "w+", 438);
              FS.write(fd, data.contents, 0, data.contents.length, 0, true);
              FS.close(fd);
            }
          }
          callback(null);
        } catch (recurring) {
          return callback(recurring);
        }
      } else {
        var request = _this.put(data, path);
        /**
         * @return {undefined}
         */
        request.onsuccess = function() {
          callback(null);
        };
        /**
         * @return {undefined}
         */
        request.onerror = function() {
          callback(this.error);
        };
      }
    }
    for (path in cache) {
      if (!cache.hasOwnProperty(path)) {
        continue;
      }
      data = cache[path];
      if (options.type === "local") {
        try {
          if (FS.isDir(data.mode)) {
            FS.rmdir(path);
          } else {
            if (FS.isFile(data.mode)) {
              FS.unlink(path);
            }
          }
          callback(null);
        } catch (STOP) {
          return callback(STOP);
        }
      } else {
        request = _this.delete(path);
        /**
         * @return {undefined}
         */
        request.onsuccess = function() {
          callback(null);
        };
        /**
         * @return {undefined}
         */
        request.onerror = function() {
          callback(this.error);
        };
      }
    }
  },
  /**
   * @param {Object} test
   * @param {Function} callback
   * @return {?}
   */
  getLocalSet : function(test, callback) {
    /**
     * @param {string} k
     * @return {?}
     */
    function selector(k) {
      return k !== "." && k !== "..";
    }
    /**
     * @param {string} path
     * @return {?}
     */
    function property(path) {
      return function(isXML) {
        return PATH.join2(path, isXML);
      };
    }
    var files = {};
    var newArgs = FS.readdir(test.mountpoint).filter(selector).map(property(test.mountpoint));
    for (;newArgs.length;) {
      var name = newArgs.pop();
      var data;
      var d;
      try {
        var o = FS.lookupPath(name);
        d = o.node;
        data = FS.stat(name);
      } catch (STOP) {
        return callback(STOP);
      }
      if (FS.isDir(data.mode)) {
        newArgs.push.apply(newArgs, FS.readdir(name).filter(selector).map(property(name)));
        files[name] = {
          mode : data.mode,
          timestamp : data.mtime
        };
      } else {
        if (FS.isFile(data.mode)) {
          files[name] = {
            contents : d.contents,
            mode : data.mode,
            timestamp : data.mtime
          };
        } else {
          return callback(new Error("node type not supported"));
        }
      }
    }
    return callback(null, {
      type : "local",
      files : files
    });
  },
  /**
   * @param {string} method
   * @param {Function} callback
   * @return {?}
   */
  getDB : function(method, callback) {
    var db = IDBFS.dbs[method];
    if (db) {
      return callback(null, db);
    }
    var request;
    try {
      request = IDBFS.indexedDB().open(method, IDBFS.DB_VERSION);
    } catch (ERR_ENCRYPTED) {
      return onerror(ERR_ENCRYPTED);
    }
    /**
     * @return {undefined}
     */
    request.onupgradeneeded = function() {
      db = request.result;
      db.createObjectStore(IDBFS.DB_STORE_NAME);
    };
    /**
     * @return {undefined}
     */
    request.onsuccess = function() {
      db = request.result;
      IDBFS.dbs[method] = db;
      callback(null, db);
    };
    /**
     * @return {undefined}
     */
    request.onerror = function() {
      callback(this.error);
    };
  },
  /**
   * @param {Object} test
   * @param {Function} callback
   * @return {undefined}
   */
  getRemoteSet : function(test, callback) {
    var data = {};
    IDBFS.getDB(test.mountpoint, function(basis, db) {
      if (basis) {
        return callback(basis);
      }
      var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readonly");
      /**
       * @return {undefined}
       */
      transaction.onerror = function() {
        callback(this.error);
      };
      var source = transaction.objectStore(IDBFS.DB_STORE_NAME);
      /**
       * @param {Event} event
       * @return {?}
       */
      source.openCursor().onsuccess = function(event) {
        var item = event.target.result;
        if (!item) {
          return callback(null, {
            type : "remote",
            db : db,
            files : data
          });
        }
        data[item.key] = item.value;
        item.continue();
      };
    });
  }
};
var NODEFS = {
  isWindows : false,
  /**
   * @return {undefined}
   */
  staticInit : function() {
    /** @type {boolean} */
    NODEFS.isWindows = !!process.platform.match(/^win/);
  },
  /**
   * @param {?} options
   * @return {?}
   */
  mount : function(options) {
    assert(ENVIRONMENT_IS_NODE);
    return NODEFS.createNode(null, "/", NODEFS.getMode(options.opts.root), 0);
  },
  /**
   * @param {string} recurring
   * @param {(number|string)} name
   * @param {number} path
   * @param {number} crossScope
   * @return {?}
   */
  createNode : function(recurring, name, path, crossScope) {
    if (!FS.isDir(path) && (!FS.isFile(path) && !FS.isLink(path))) {
      throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    }
    var node = FS.createNode(recurring, name, path);
    node.node_ops = NODEFS.node_ops;
    node.stream_ops = NODEFS.stream_ops;
    return node;
  },
  /**
   * @param {boolean} deepDataAndEvents
   * @return {?}
   */
  getMode : function(deepDataAndEvents) {
    var time;
    try {
      time = fs.lstatSync(deepDataAndEvents);
      if (NODEFS.isWindows) {
        /** @type {number} */
        time.mode = time.mode | (time.mode & 146) >> 1;
      }
    } catch (ex) {
      if (!ex.code) {
        throw ex;
      }
      throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
    }
    return time.mode;
  },
  /**
   * @param {Object} parent
   * @return {?}
   */
  realPath : function(parent) {
    /** @type {Array} */
    var path = [];
    for (;parent.parent !== parent;) {
      path.push(parent.name);
      parent = parent.parent;
    }
    path.push(parent.mount.opts.root);
    path.reverse();
    return PATH.join.apply(null, path);
  },
  flagsToPermissionStringMap : {
    0 : "r",
    1 : "r+",
    2 : "r+",
    64 : "r",
    65 : "r+",
    66 : "r+",
    129 : "rx+",
    193 : "rx+",
    514 : "w+",
    577 : "w",
    578 : "w+",
    705 : "wx",
    706 : "wx+",
    1024 : "a",
    1025 : "a",
    1026 : "a+",
    1089 : "a",
    1090 : "a+",
    1153 : "ax",
    1154 : "ax+",
    1217 : "ax",
    1218 : "ax+",
    4096 : "rs",
    4098 : "rs+"
  },
  /**
   * @param {number} timeoutKey
   * @return {?}
   */
  flagsToPermissionString : function(timeoutKey) {
    if (timeoutKey in NODEFS.flagsToPermissionStringMap) {
      return NODEFS.flagsToPermissionStringMap[timeoutKey];
    } else {
      return timeoutKey;
    }
  },
  node_ops : {
    /**
     * @param {Object} name
     * @return {?}
     */
    getattr : function(name) {
      var fullPath = NODEFS.realPath(name);
      var stats;
      try {
        stats = fs.lstatSync(fullPath);
      } catch (ex) {
        if (!ex.code) {
          throw ex;
        }
        throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
      }
      if (NODEFS.isWindows && !stats.blksize) {
        /** @type {number} */
        stats.blksize = 4096;
      }
      if (NODEFS.isWindows && !stats.blocks) {
        /** @type {number} */
        stats.blocks = (stats.size + stats.blksize - 1) / stats.blksize | 0;
      }
      return{
        dev : stats.dev,
        ino : stats.ino,
        mode : stats.mode,
        nlink : stats.nlink,
        uid : stats.uid,
        gid : stats.gid,
        rdev : stats.rdev,
        size : stats.size,
        atime : stats.atime,
        mtime : stats.mtime,
        ctime : stats.ctime,
        blksize : stats.blksize,
        blocks : stats.blocks
      };
    },
    /**
     * @param {Object} item
     * @param {Object} stats
     * @return {undefined}
     */
    setattr : function(item, stats) {
      var file = NODEFS.realPath(item);
      try {
        if (stats.mode !== undefined) {
          fs.chmodSync(file, stats.mode);
          item.mode = stats.mode;
        }
        if (stats.timestamp !== undefined) {
          /** @type {Date} */
          var now = new Date(stats.timestamp);
          fs.utimesSync(file, now, now);
        }
        if (stats.size !== undefined) {
          fs.truncateSync(file, stats.size);
        }
      } catch (ex) {
        if (!ex.code) {
          throw ex;
        }
        throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
      }
    },
    /**
     * @param {string} recurring
     * @param {string} name
     * @return {?}
     */
    lookup : function(recurring, name) {
      var deepDataAndEvents = PATH.join2(NODEFS.realPath(recurring), name);
      var url = NODEFS.getMode(deepDataAndEvents);
      return NODEFS.createNode(recurring, name, url);
    },
    /**
     * @param {string} recurring
     * @param {number} name
     * @param {number} url
     * @param {number} crossScope
     * @return {?}
     */
    mknod : function(recurring, name, url, crossScope) {
      var file = NODEFS.createNode(recurring, name, url, crossScope);
      var filePath = NODEFS.realPath(file);
      try {
        if (FS.isDir(file.mode)) {
          fs.mkdirSync(filePath, file.mode);
        } else {
          fs.writeFileSync(filePath, "", {
            mode : file.mode
          });
        }
      } catch (ex) {
        if (!ex.code) {
          throw ex;
        }
        throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
      }
      return file;
    },
    /**
     * @param {Object} obj
     * @param {Error} node
     * @param {string} name
     * @return {undefined}
     */
    rename : function(obj, node, name) {
      var temp = NODEFS.realPath(obj);
      var absPath = PATH.join2(NODEFS.realPath(node), name);
      try {
        fs.renameSync(temp, absPath);
      } catch (ex) {
        if (!ex.code) {
          throw ex;
        }
        throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
      }
    },
    /**
     * @param {string} path
     * @param {string} callback
     * @return {undefined}
     */
    unlink : function(path, callback) {
      var f = PATH.join2(NODEFS.realPath(path), callback);
      try {
        fs.unlinkSync(f);
      } catch (ex) {
        if (!ex.code) {
          throw ex;
        }
        throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
      }
    },
    /**
     * @param {string} dir
     * @param {string} path
     * @return {undefined}
     */
    rmdir : function(dir, path) {
      var pathname = PATH.join2(NODEFS.realPath(dir), path);
      try {
        fs.rmdirSync(pathname);
      } catch (ex) {
        if (!ex.code) {
          throw ex;
        }
        throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
      }
    },
    /**
     * @param {?} path
     * @return {?}
     */
    readdir : function(path) {
      var resolved = NODEFS.realPath(path);
      try {
        return fs.readdirSync(resolved);
      } catch (ex) {
        if (!ex.code) {
          throw ex;
        }
        throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
      }
    },
    /**
     * @param {string} file
     * @param {string} path
     * @param {string} from
     * @return {undefined}
     */
    symlink : function(file, path, from) {
      var dest = PATH.join2(NODEFS.realPath(file), path);
      try {
        fs.symlinkSync(from, dest);
      } catch (ex) {
        if (!ex.code) {
          throw ex;
        }
        throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
      }
    },
    /**
     * @param {string} path
     * @return {?}
     */
    readlink : function(path) {
      var resolved = NODEFS.realPath(path);
      try {
        return fs.readlinkSync(resolved);
      } catch (ex) {
        if (!ex.code) {
          throw ex;
        }
        throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
      }
    }
  },
  stream_ops : {
    /**
     * @param {string} options
     * @return {undefined}
     */
    open : function(options) {
      var path = NODEFS.realPath(options.node);
      try {
        if (FS.isFile(options.node.mode)) {
          options.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(options.flags));
        }
      } catch (ex) {
        if (!ex.code) {
          throw ex;
        }
        throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
      }
    },
    /**
     * @param {?} cb
     * @return {undefined}
     */
    close : function(cb) {
      try {
        if (FS.isFile(cb.node.mode) && cb.nfd) {
          fs.closeSync(cb.nfd);
        }
      } catch (ex) {
        if (!ex.code) {
          throw ex;
        }
        throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
      }
    },
    /**
     * @param {Object} file
     * @param {Uint8Array} buffer
     * @param {number} offset
     * @param {(boolean|number)} length
     * @param {number} position
     * @return {?}
     */
    read : function(file, buffer, offset, length, position) {
      var b = new Buffer(length);
      var n;
      try {
        n = fs.readSync(file.nfd, b, 0, length, position);
      } catch (ex) {
        throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
      }
      if (n > 0) {
        /** @type {number} */
        var i = 0;
        for (;i < n;i++) {
          buffer[offset + i] = b[i];
        }
      }
      return n;
    },
    /**
     * @param {string} cb
     * @param {string} buf
     * @param {number} recurring
     * @param {number} length
     * @param {number} position
     * @return {?}
     */
    write : function(cb, buf, recurring, length, position) {
      var buffer = new Buffer(buf.subarray(recurring, recurring + length));
      var written;
      try {
        written = fs.writeSync(cb.nfd, buffer, 0, length, position);
      } catch (ex) {
        throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
      }
      return written;
    },
    /**
     * @param {Object} options
     * @param {number} recurring
     * @param {number} opt_attributes
     * @return {?}
     */
    llseek : function(options, recurring, opt_attributes) {
      /** @type {number} */
      var offset = recurring;
      if (opt_attributes === 1) {
        offset += options.position;
      } else {
        if (opt_attributes === 2) {
          if (FS.isFile(options.node.mode)) {
            try {
              var file = fs.fstatSync(options.nfd);
              offset += file.size;
            } catch (ex) {
              throw new FS.ErrnoError(ERRNO_CODES[ex.code]);
            }
          }
        }
      }
      if (offset < 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
      }
      options.position = offset;
      return offset;
    }
  }
};
var _stdin = allocate(1, "i32*", ALLOC_STATIC);
var _stdout = allocate(1, "i32*", ALLOC_STATIC);
var _stderr = allocate(1, "i32*", ALLOC_STATIC);
var FS = {
  root : null,
  mounts : [],
  devices : [null],
  streams : [null],
  nextInode : 1,
  nameTable : null,
  currentPath : "/",
  initialized : false,
  ignorePermissions : true,
  ErrnoError : null,
  genericErrors : {},
  /**
   * @param {string} err
   * @return {?}
   */
  handleFSError : function(err) {
    if (!(err instanceof FS.ErrnoError)) {
      throw err + " : " + stackTrace();
    }
    return ___setErrNo(err.errno);
  },
  /**
   * @param {string} name
   * @param {?} opt_attributes
   * @return {?}
   */
  lookupPath : function(name, opt_attributes) {
    name = PATH.resolve(FS.cwd(), name);
    opt_attributes = opt_attributes || {
      recurse_count : 0
    };
    if (opt_attributes.recurse_count > 8) {
      throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
    }
    var codeSegments = PATH.normalizeArray(name.split("/").filter(function(dataAndEvents) {
      return!!dataAndEvents;
    }), false);
    var node = FS.root;
    /** @type {string} */
    var path = "/";
    /** @type {number} */
    var i = 0;
    for (;i < codeSegments.length;i++) {
      /** @type {boolean} */
      var isLast = i === codeSegments.length - 1;
      if (isLast && opt_attributes.parent) {
        break;
      }
      node = FS.lookupNode(node, codeSegments[i]);
      path = PATH.join2(path, codeSegments[i]);
      if (FS.isMountpoint(node)) {
        node = node.mount.root;
      }
      if (!isLast || opt_attributes.follow) {
        /** @type {number} */
        var u = 0;
        for (;FS.isLink(node.mode);) {
          var relPath = FS.readlink(path);
          path = PATH.resolve(PATH.dirname(path), relPath);
          var body = FS.lookupPath(path, {
            recurse_count : opt_attributes.recurse_count
          });
          node = body.node;
          if (u++ > 40) {
            throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
          }
        }
      }
    }
    return{
      path : path,
      node : node
    };
  },
  /**
   * @param {Object} path
   * @return {?}
   */
  getPath : function(path) {
    var b;
    for (;true;) {
      if (FS.isRoot(path)) {
        var a = path.mount.mountpoint;
        if (!b) {
          return a;
        }
        return a[a.length - 1] !== "/" ? a + "/" + b : a + b;
      }
      b = b ? path.name + "/" + b : path.name;
      path = path.parent;
    }
  },
  /**
   * @param {number} far
   * @param {string} string
   * @return {?}
   */
  hashName : function(far, string) {
    /** @type {number} */
    var near = 0;
    /** @type {number} */
    var n = 0;
    for (;n < string.length;n++) {
      /** @type {number} */
      near = (near << 5) - near + string.charCodeAt(n) | 0;
    }
    return(far + near >>> 0) % FS.nameTable.length;
  },
  /**
   * @param {Window} e
   * @return {undefined}
   */
  hashAddNode : function(e) {
    var i = FS.hashName(e.parent.id, e.name);
    e.name_next = FS.nameTable[i];
    /** @type {Window} */
    FS.nameTable[i] = e;
  },
  /**
   * @param {Object} item
   * @return {undefined}
   */
  hashRemoveNode : function(item) {
    var i = FS.hashName(item.parent.id, item.name);
    if (FS.nameTable[i] === item) {
      FS.nameTable[i] = item.name_next;
    } else {
      var list = FS.nameTable[i];
      for (;list;) {
        if (list.name_next === item) {
          list.name_next = item.name_next;
          break;
        }
        list = list.name_next;
      }
    }
  },
  /**
   * @param {Object} source
   * @param {string} path
   * @return {?}
   */
  lookupNode : function(source, path) {
    var delayedStream = FS.mayLookup(source);
    if (delayedStream) {
      throw new FS.ErrnoError(delayedStream);
    }
    var resolved = FS.hashName(source.id, path);
    var mod = FS.nameTable[resolved];
    for (;mod;mod = mod.name_next) {
      var o = mod.name;
      if (mod.parent.id === source.id && o === path) {
        return mod;
      }
    }
    return FS.lookup(source, path);
  },
  /**
   * @param {(number|string)} recurring
   * @param {(number|string)} keepData
   * @param {number} url
   * @param {number} crossScope
   * @return {?}
   */
  createNode : function(recurring, keepData, url, crossScope) {
    if (!FS.FSNode) {
      /**
       * @param {Object} self
       * @param {string} tmplName
       * @param {number} dataAndEvents
       * @param {?} deepDataAndEvents
       * @return {undefined}
       */
      FS.FSNode = function(self, tmplName, dataAndEvents, deepDataAndEvents) {
        /** @type {number} */
        this.id = FS.nextInode++;
        /** @type {string} */
        this.name = tmplName;
        /** @type {number} */
        this.mode = dataAndEvents;
        this.node_ops = {};
        this.stream_ops = {};
        this.rdev = deepDataAndEvents;
        /** @type {null} */
        this.parent = null;
        /** @type {null} */
        this.mount = null;
        if (!self) {
          self = this;
        }
        /** @type {Object} */
        this.parent = self;
        this.mount = self.mount;
        FS.hashAddNode(this);
      };
      /** @type {number} */
      var property = 292 | 73;
      /** @type {number} */
      var mode = 146;
      FS.FSNode.prototype = {};
      Object.defineProperties(FS.FSNode.prototype, {
        read : {
          /**
           * @return {?}
           */
          get : function() {
            return(this.mode & property) === property;
          },
          /**
           * @param {(Object|number)} rawData
           * @return {undefined}
           */
          set : function(rawData) {
            if (rawData) {
              this.mode |= property;
            } else {
              this.mode &= ~property;
            }
          }
        },
        write : {
          /**
           * @return {?}
           */
          get : function() {
            return(this.mode & mode) === mode;
          },
          /**
           * @param {(Object|number)} rawData
           * @return {undefined}
           */
          set : function(rawData) {
            if (rawData) {
              this.mode |= mode;
            } else {
              this.mode &= ~mode;
            }
          }
        },
        isFolder : {
          /**
           * @return {?}
           */
          get : function() {
            return FS.isDir(this.mode);
          }
        },
        isDevice : {
          /**
           * @return {?}
           */
          get : function() {
            return FS.isChrdev(this.mode);
          }
        }
      });
    }
    return new FS.FSNode(recurring, keepData, url, crossScope);
  },
  /**
   * @param {Object} name
   * @return {undefined}
   */
  destroyNode : function(name) {
    FS.hashRemoveNode(name);
  },
  /**
   * @param {?} node
   * @return {?}
   */
  isRoot : function(node) {
    return node === node.parent;
  },
  /**
   * @param {?} value
   * @return {?}
   */
  isMountpoint : function(value) {
    return value.mounted;
  },
  /**
   * @param {?} path
   * @return {?}
   */
  isFile : function(path) {
    return(path & 61440) === 32768;
  },
  /**
   * @param {?} path
   * @return {?}
   */
  isDir : function(path) {
    return(path & 61440) === 16384;
  },
  /**
   * @param {number} path
   * @return {?}
   */
  isLink : function(path) {
    return(path & 61440) === 40960;
  },
  /**
   * @param {number} dataAndEvents
   * @return {?}
   */
  isChrdev : function(dataAndEvents) {
    return(dataAndEvents & 61440) === 8192;
  },
  /**
   * @param {number} queryStr
   * @return {?}
   */
  isBlkdev : function(queryStr) {
    return(queryStr & 61440) === 24576;
  },
  /**
   * @param {number} queryStr
   * @return {?}
   */
  isFIFO : function(queryStr) {
    return(queryStr & 61440) === 4096;
  },
  /**
   * @param {number} dataAndEvents
   * @return {?}
   */
  isSocket : function(dataAndEvents) {
    return(dataAndEvents & 49152) === 49152;
  },
  flagModes : {
    r : 0,
    rs : 1052672,
    "r+" : 2,
    w : 577,
    wx : 705,
    xw : 705,
    "w+" : 578,
    "wx+" : 706,
    "xw+" : 706,
    a : 1089,
    ax : 1217,
    xa : 1217,
    "a+" : 1090,
    "ax+" : 1218,
    "xa+" : 1218
  },
  /**
   * @param {(number|string)} key
   * @return {?}
   */
  modeStringToFlags : function(key) {
    var label = FS.flagModes[key];
    if (typeof label === "undefined") {
      throw new Error("Unknown file open mode: " + key);
    }
    return label;
  },
  /**
   * @param {number} timeoutKey
   * @return {?}
   */
  flagsToPermissionString : function(timeoutKey) {
    /** @type {number} */
    var unlock = timeoutKey & 2097155;
    var cache = ["r", "w", "rw"][unlock];
    if (timeoutKey & 512) {
      cache += "w";
    }
    return cache;
  },
  /**
   * @param {Object} s
   * @param {string} f
   * @return {?}
   */
  nodePermissions : function(s, f) {
    if (FS.ignorePermissions) {
      return 0;
    }
    if (f.indexOf("r") !== -1 && !(s.mode & 292)) {
      return ERRNO_CODES.EACCES;
    } else {
      if (f.indexOf("w") !== -1 && !(s.mode & 146)) {
        return ERRNO_CODES.EACCES;
      } else {
        if (f.indexOf("x") !== -1 && !(s.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
      }
    }
    return 0;
  },
  /**
   * @param {Object} source
   * @return {?}
   */
  mayLookup : function(source) {
    return FS.nodePermissions(source, "x");
  },
  /**
   * @param {Object} source
   * @param {?} res
   * @return {?}
   */
  mayCreate : function(source, res) {
    try {
      var data = FS.lookupNode(source, res);
      return ERRNO_CODES.EEXIST;
    } catch (r) {
    }
    return FS.nodePermissions(source, "wx");
  },
  /**
   * @param {Error} source
   * @param {?} path
   * @param {boolean} recurring
   * @return {?}
   */
  mayDelete : function(source, path, recurring) {
    var node;
    try {
      node = FS.lookupNode(source, path);
    } catch (e) {
      return e.errno;
    }
    var fd = FS.nodePermissions(source, "wx");
    if (fd) {
      return fd;
    }
    if (recurring) {
      if (!FS.isDir(node.mode)) {
        return ERRNO_CODES.ENOTDIR;
      }
      if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
        return ERRNO_CODES.EBUSY;
      }
    } else {
      if (FS.isDir(node.mode)) {
        return ERRNO_CODES.EISDIR;
      }
    }
    return 0;
  },
  /**
   * @param {Object} data
   * @param {number} timeoutKey
   * @return {?}
   */
  mayOpen : function(data, timeoutKey) {
    if (!data) {
      return ERRNO_CODES.ENOENT;
    }
    if (FS.isLink(data.mode)) {
      return ERRNO_CODES.ELOOP;
    } else {
      if (FS.isDir(data.mode)) {
        if ((timeoutKey & 2097155) !== 0 || timeoutKey & 512) {
          return ERRNO_CODES.EISDIR;
        }
      }
    }
    return FS.nodePermissions(data, FS.flagsToPermissionString(timeoutKey));
  },
  MAX_OPEN_FDS : 4096,
  /**
   * @param {number} fromIndex
   * @param {?} offset
   * @return {?}
   */
  nextfd : function(fromIndex, offset) {
    fromIndex = fromIndex || 1;
    offset = offset || FS.MAX_OPEN_FDS;
    /** @type {number} */
    var i = fromIndex;
    for (;i <= offset;i++) {
      if (!FS.streams[i]) {
        return i;
      }
    }
    throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
  },
  /**
   * @param {?} name
   * @return {?}
   */
  getStream : function(name) {
    return FS.streams[name];
  },
  /**
   * @param {Object} obj
   * @param {number} name
   * @param {?} cb
   * @return {?}
   */
  createStream : function(obj, name, cb) {
    if (!FS.FSStream) {
      /**
       * @return {undefined}
       */
      FS.FSStream = function() {
      };
      FS.FSStream.prototype = {};
      Object.defineProperties(FS.FSStream.prototype, {
        object : {
          /**
           * @return {?}
           */
          get : function() {
            return this.node;
          },
          /**
           * @param {(Node|string)} node
           * @return {undefined}
           */
          set : function(node) {
            /** @type {(Node|string)} */
            this.node = node;
          }
        },
        isRead : {
          /**
           * @return {?}
           */
          get : function() {
            return(this.flags & 2097155) !== 1;
          }
        },
        isWrite : {
          /**
           * @return {?}
           */
          get : function() {
            return(this.flags & 2097155) !== 0;
          }
        },
        isAppend : {
          /**
           * @return {?}
           */
          get : function() {
            return this.flags & 1024;
          }
        }
      });
    }
    if (obj.__proto__) {
      /** @type {(FS.FSStream.prototype)} */
      obj.__proto__ = FS.FSStream.prototype;
    } else {
      var o = new FS.FSStream;
      var i;
      for (i in obj) {
        o[i] = obj[i];
      }
      obj = o;
    }
    var id = FS.nextfd(name, cb);
    obj.fd = id;
    /** @type {Object} */
    FS.streams[id] = obj;
    return obj;
  },
  /**
   * @param {?} id
   * @return {undefined}
   */
  closeStream : function(id) {
    /** @type {null} */
    FS.streams[id] = null;
  },
  chrdev_stream_ops : {
    /**
     * @param {string} method
     * @return {undefined}
     */
    open : function(method) {
      var stream_ops = FS.getDevice(method.node.rdev);
      method.stream_ops = stream_ops.stream_ops;
      if (method.stream_ops.open) {
        method.stream_ops.open(method);
      }
    },
    /**
     * @return {?}
     */
    llseek : function() {
      throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
    }
  },
  /**
   * @param {number} dataAndEvents
   * @return {?}
   */
  major : function(dataAndEvents) {
    return dataAndEvents >> 8;
  },
  /**
   * @param {number} dataAndEvents
   * @return {?}
   */
  minor : function(dataAndEvents) {
    return dataAndEvents & 255;
  },
  /**
   * @param {number} expectedNumberOfNonCommentArgs
   * @param {number} lab
   * @return {?}
   */
  makedev : function(expectedNumberOfNonCommentArgs, lab) {
    return expectedNumberOfNonCommentArgs << 8 | lab;
  },
  /**
   * @param {?} el
   * @param {?} opt_attributes
   * @return {undefined}
   */
  registerDevice : function(el, opt_attributes) {
    FS.devices[el] = {
      stream_ops : opt_attributes
    };
  },
  /**
   * @param {?} index
   * @return {?}
   */
  getDevice : function(index) {
    return FS.devices[index];
  },
  /**
   * @param {boolean} options
   * @param {boolean} cb
   * @return {undefined}
   */
  syncfs : function(options, cb) {
    /**
     * @param {Array} er
     * @return {?}
     */
    function onread(er) {
      if (er) {
        return cb(er);
      }
      if (++index >= length) {
        cb(null);
      }
    }
    if (typeof options === "function") {
      /** @type {boolean} */
      cb = options;
      /** @type {boolean} */
      options = false;
    }
    /** @type {number} */
    var index = 0;
    var length = FS.mounts.length;
    /** @type {number} */
    var i = 0;
    for (;i < FS.mounts.length;i++) {
      var hook = FS.mounts[i];
      if (!hook.type.syncfs) {
        onread(null);
        continue;
      }
      hook.type.syncfs(hook, options, onread);
    }
  },
  /**
   * @param {Object} options
   * @param {Blob} opt_attributes
   * @param {string} path
   * @return {?}
   */
  mount : function(options, opt_attributes, path) {
    var item;
    if (path) {
      item = FS.lookupPath(path, {
        follow : false
      });
      path = item.path;
    }
    var opts = {
      type : options,
      opts : opt_attributes,
      mountpoint : path,
      root : null
    };
    var s = options.mount(opts);
    s.mount = opts;
    opts.root = s;
    if (item) {
      item.node.mount = opts;
      /** @type {boolean} */
      item.node.mounted = true;
      if (path === "/") {
        FS.root = opts.root;
      }
    }
    FS.mounts.push(opts);
    return s;
  },
  /**
   * @param {string} name
   * @param {string} path
   * @return {?}
   */
  lookup : function(name, path) {
    return name.node_ops.lookup(name, path);
  },
  /**
   * @param {string} path
   * @param {number} name
   * @param {number} crossScope
   * @return {?}
   */
  mknod : function(path, name, crossScope) {
    var item = FS.lookupPath(path, {
      parent : true
    });
    var source = item.node;
    var rvar = PATH.basename(path);
    var delayedStream = FS.mayCreate(source, rvar);
    if (delayedStream) {
      throw new FS.ErrnoError(delayedStream);
    }
    if (!source.node_ops.mknod) {
      throw new FS.ErrnoError(ERRNO_CODES.EPERM);
    }
    return source.node_ops.mknod(source, rvar, name, crossScope);
  },
  /**
   * @param {string} fileName
   * @param {number} res
   * @return {?}
   */
  create : function(fileName, res) {
    res = res !== undefined ? res : 438;
    res &= 4095;
    res |= 32768;
    return FS.mknod(fileName, res, 0);
  },
  /**
   * @param {string} name
   * @param {number} path
   * @return {?}
   */
  mkdir : function(name, path) {
    path = path !== undefined ? path : 511;
    path &= 511 | 512;
    path |= 16384;
    return FS.mknod(name, path, 0);
  },
  /**
   * @param {string} recurring
   * @param {number} res
   * @param {number} el
   * @return {?}
   */
  mkdev : function(recurring, res, el) {
    if (typeof el === "undefined") {
      /** @type {number} */
      el = res;
      /** @type {number} */
      res = 438;
    }
    res |= 8192;
    return FS.mknod(recurring, res, el);
  },
  /**
   * @param {string} type
   * @param {string} path
   * @return {?}
   */
  symlink : function(type, path) {
    var conf = FS.lookupPath(path, {
      parent : true
    });
    var file = conf.node;
    var resolved = PATH.basename(path);
    var readStream = FS.mayCreate(file, resolved);
    if (readStream) {
      throw new FS.ErrnoError(readStream);
    }
    if (!file.node_ops.symlink) {
      throw new FS.ErrnoError(ERRNO_CODES.EPERM);
    }
    return file.node_ops.symlink(file, resolved, type);
  },
  /**
   * @param {string} path
   * @param {string} source
   * @return {undefined}
   */
  rename : function(path, source) {
    var file = PATH.dirname(path);
    var from = PATH.dirname(source);
    var resolved = PATH.basename(path);
    var name = PATH.basename(source);
    var body;
    var self;
    var node;
    try {
      body = FS.lookupPath(path, {
        parent : true
      });
      self = body.node;
      body = FS.lookupPath(source, {
        parent : true
      });
      node = body.node;
    } catch (f) {
      throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
    }
    if (self.mount !== node.mount) {
      throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
    }
    var result = FS.lookupNode(self, resolved);
    var match = PATH.relative(path, from);
    if (match.charAt(0) !== ".") {
      throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    }
    match = PATH.relative(source, file);
    if (match.charAt(0) !== ".") {
      throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
    }
    var value;
    try {
      value = FS.lookupNode(node, name);
    } catch (f) {
    }
    if (result === value) {
      return;
    }
    var recurring = FS.isDir(result.mode);
    var str = FS.mayDelete(self, resolved, recurring);
    if (str) {
      throw new FS.ErrnoError(str);
    }
    str = value ? FS.mayDelete(node, name, recurring) : FS.mayCreate(node, name);
    if (str) {
      throw new FS.ErrnoError(str);
    }
    if (!self.node_ops.rename) {
      throw new FS.ErrnoError(ERRNO_CODES.EPERM);
    }
    if (FS.isMountpoint(result) || value && FS.isMountpoint(value)) {
      throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
    }
    if (node !== self) {
      str = FS.nodePermissions(self, "w");
      if (str) {
        throw new FS.ErrnoError(str);
      }
    }
    FS.hashRemoveNode(result);
    try {
      self.node_ops.rename(result, node, name);
    } catch (f) {
      throw f;
    } finally {
      FS.hashAddNode(result);
    }
  },
  /**
   * @param {string} path
   * @return {undefined}
   */
  rmdir : function(path) {
    var conf = FS.lookupPath(path, {
      parent : true
    });
    var file = conf.node;
    var resolved = PATH.basename(path);
    var fileName = FS.lookupNode(file, resolved);
    var readStream = FS.mayDelete(file, resolved, true);
    if (readStream) {
      throw new FS.ErrnoError(readStream);
    }
    if (!file.node_ops.rmdir) {
      throw new FS.ErrnoError(ERRNO_CODES.EPERM);
    }
    if (FS.isMountpoint(fileName)) {
      throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
    }
    file.node_ops.rmdir(file, resolved);
    FS.destroyNode(fileName);
  },
  /**
   * @param {?} path
   * @return {?}
   */
  readdir : function(path) {
    var list = FS.lookupPath(path, {
      follow : true
    });
    var start = list.node;
    if (!start.node_ops.readdir) {
      throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
    }
    return start.node_ops.readdir(start);
  },
  /**
   * @param {string} path
   * @return {undefined}
   */
  unlink : function(path) {
    var conf = FS.lookupPath(path, {
      parent : true
    });
    var file = conf.node;
    var resolved = PATH.basename(path);
    var fileName = FS.lookupNode(file, resolved);
    var readStream = FS.mayDelete(file, resolved, false);
    if (readStream) {
      if (readStream === ERRNO_CODES.EISDIR) {
        readStream = ERRNO_CODES.EPERM;
      }
      throw new FS.ErrnoError(readStream);
    }
    if (!file.node_ops.unlink) {
      throw new FS.ErrnoError(ERRNO_CODES.EPERM);
    }
    if (FS.isMountpoint(fileName)) {
      throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
    }
    file.node_ops.unlink(file, resolved);
    FS.destroyNode(fileName);
  },
  /**
   * @param {string} path
   * @return {?}
   */
  readlink : function(path) {
    var el = FS.lookupPath(path, {
      follow : false
    });
    var p = el.node;
    if (!p.node_ops.readlink) {
      throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    }
    return p.node_ops.readlink(p);
  },
  /**
   * @param {string} path
   * @param {boolean} dataAndEvents
   * @return {?}
   */
  stat : function(path, dataAndEvents) {
    var body = FS.lookupPath(path, {
      follow : !dataAndEvents
    });
    var n = body.node;
    if (!n.node_ops.getattr) {
      throw new FS.ErrnoError(ERRNO_CODES.EPERM);
    }
    return n.node_ops.getattr(n);
  },
  /**
   * @param {string} path
   * @return {?}
   */
  lstat : function(path) {
    return FS.stat(path, true);
  },
  /**
   * @param {Object} path
   * @param {number} mode
   * @param {boolean} dataAndEvents
   * @return {undefined}
   */
  chmod : function(path, mode, dataAndEvents) {
    var node;
    if (typeof path === "string") {
      var body = FS.lookupPath(path, {
        follow : !dataAndEvents
      });
      node = body.node;
    } else {
      /** @type {Object} */
      node = path;
    }
    if (!node.node_ops.setattr) {
      throw new FS.ErrnoError(ERRNO_CODES.EPERM);
    }
    node.node_ops.setattr(node, {
      mode : mode & 4095 | node.mode & ~4095,
      timestamp : Date.now()
    });
  },
  /**
   * @param {Object} path
   * @param {number} mode
   * @return {undefined}
   */
  lchmod : function(path, mode) {
    FS.chmod(path, mode, true);
  },
  /**
   * @param {?} callback
   * @param {number} mode
   * @return {undefined}
   */
  fchmod : function(callback, mode) {
    var some = FS.getStream(callback);
    if (!some) {
      throw new FS.ErrnoError(ERRNO_CODES.EBADF);
    }
    FS.chmod(some.node, mode);
  },
  /**
   * @param {Object} path
   * @param {?} uid
   * @param {?} gid
   * @param {boolean} dataAndEvents
   * @return {undefined}
   */
  chown : function(path, uid, gid, dataAndEvents) {
    var fn;
    if (typeof path === "string") {
      var conf = FS.lookupPath(path, {
        follow : !dataAndEvents
      });
      fn = conf.node;
    } else {
      /** @type {Object} */
      fn = path;
    }
    if (!fn.node_ops.setattr) {
      throw new FS.ErrnoError(ERRNO_CODES.EPERM);
    }
    fn.node_ops.setattr(fn, {
      timestamp : Date.now()
    });
  },
  /**
   * @param {Object} path
   * @param {?} uid
   * @param {?} gid
   * @return {undefined}
   */
  lchown : function(path, uid, gid) {
    FS.chown(path, uid, gid, true);
  },
  /**
   * @param {?} callback
   * @param {?} uid
   * @param {?} gid
   * @return {undefined}
   */
  fchown : function(callback, uid, gid) {
    var some = FS.getStream(callback);
    if (!some) {
      throw new FS.ErrnoError(ERRNO_CODES.EBADF);
    }
    FS.chown(some.node, uid, gid);
  },
  /**
   * @param {Object} input
   * @param {number} size
   * @return {undefined}
   */
  truncate : function(input, size) {
    if (size < 0) {
      throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    }
    var self;
    if (typeof input === "string") {
      var body = FS.lookupPath(input, {
        follow : true
      });
      self = body.node;
    } else {
      /** @type {Object} */
      self = input;
    }
    if (!self.node_ops.setattr) {
      throw new FS.ErrnoError(ERRNO_CODES.EPERM);
    }
    if (FS.isDir(self.mode)) {
      throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
    }
    if (!FS.isFile(self.mode)) {
      throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    }
    var prop = FS.nodePermissions(self, "w");
    if (prop) {
      throw new FS.ErrnoError(prop);
    }
    self.node_ops.setattr(self, {
      size : size,
      timestamp : Date.now()
    });
  },
  /**
   * @param {?} dir
   * @param {number} length
   * @return {undefined}
   */
  ftruncate : function(dir, length) {
    var item = FS.getStream(dir);
    if (!item) {
      throw new FS.ErrnoError(ERRNO_CODES.EBADF);
    }
    if ((item.flags & 2097155) === 0) {
      throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    }
    FS.truncate(item.node, length);
  },
  /**
   * @param {string} source
   * @param {?} now
   * @param {?} rh
   * @return {undefined}
   */
  utime : function(source, now, rh) {
    var body = FS.lookupPath(source, {
      follow : true
    });
    var n = body.node;
    n.node_ops.setattr(n, {
      timestamp : Math.max(now, rh)
    });
  },
  /**
   * @param {string} path
   * @param {number} target
   * @param {number} depth
   * @param {number} obj
   * @param {?} callback
   * @return {?}
   */
  open : function(path, target, depth, obj, callback) {
    target = typeof target === "string" ? FS.modeStringToFlags(target) : target;
    depth = typeof depth === "undefined" ? 438 : depth;
    if (target & 64) {
      /** @type {number} */
      depth = depth & 4095 | 32768;
    } else {
      /** @type {number} */
      depth = 0;
    }
    var data;
    if (typeof path === "object") {
      /** @type {string} */
      data = path;
    } else {
      path = PATH.normalize(path);
      try {
        var out = FS.lookupPath(path, {
          follow : !(target & 131072)
        });
        data = out.node;
      } catch (u) {
      }
    }
    if (target & 64) {
      if (data) {
        if (target & 128) {
          throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
        }
      } else {
        data = FS.mknod(path, depth, 0);
      }
    }
    if (!data) {
      throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
    }
    if (FS.isChrdev(data.mode)) {
      target &= ~512;
    }
    var ret = FS.mayOpen(data, target);
    if (ret) {
      throw new FS.ErrnoError(ret);
    }
    if (target & 512) {
      FS.truncate(data, 0);
    }
    target &= ~(128 | 512);
    var i = FS.createStream({
      node : data,
      path : FS.getPath(data),
      flags : target,
      seekable : true,
      position : 0,
      stream_ops : data.stream_ops,
      ungotten : [],
      error : false
    }, obj, callback);
    if (i.stream_ops.open) {
      i.stream_ops.open(i);
    }
    if (Module["logReadFiles"] && !(target & 1)) {
      if (!FS.readFiles) {
        FS.readFiles = {};
      }
      if (!(path in FS.readFiles)) {
        /** @type {number} */
        FS.readFiles[path] = 1;
        Module["printErr"]("read file: " + path);
      }
    }
    return i;
  },
  /**
   * @param {?} fd
   * @return {undefined}
   */
  close : function(fd) {
    try {
      if (fd.stream_ops.close) {
        fd.stream_ops.close(fd);
      }
    } catch (t) {
      throw t;
    } finally {
      FS.closeStream(fd.fd);
    }
  },
  /**
   * @param {Object} pending
   * @param {number} recurring
   * @param {number} opt_attributes
   * @return {?}
   */
  llseek : function(pending, recurring, opt_attributes) {
    if (!pending.seekable || !pending.stream_ops.llseek) {
      throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
    }
    return pending.stream_ops.llseek(pending, recurring, opt_attributes);
  },
  /**
   * @param {Object} data
   * @param {Uint8Array} buffer
   * @param {number} offset
   * @param {(boolean|number)} length
   * @param {number} position
   * @return {?}
   */
  read : function(data, buffer, offset, length, position) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    }
    if ((data.flags & 2097155) === 1) {
      throw new FS.ErrnoError(ERRNO_CODES.EBADF);
    }
    if (FS.isDir(data.node.mode)) {
      throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
    }
    if (!data.stream_ops.read) {
      throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    }
    /** @type {boolean} */
    var s = true;
    if (typeof position === "undefined") {
      position = data.position;
      /** @type {boolean} */
      s = false;
    } else {
      if (!data.seekable) {
        throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
      }
    }
    var r = data.stream_ops.read(data, buffer, offset, length, position);
    if (!s) {
      data.position += r;
    }
    return r;
  },
  /**
   * @param {Object} fd
   * @param {string} text
   * @param {number} recurring
   * @param {number} length
   * @param {number} position
   * @param {boolean} deepDataAndEvents
   * @return {?}
   */
  write : function(fd, text, recurring, length, position, deepDataAndEvents) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    }
    if ((fd.flags & 2097155) === 0) {
      throw new FS.ErrnoError(ERRNO_CODES.EBADF);
    }
    if (FS.isDir(fd.node.mode)) {
      throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
    }
    if (!fd.stream_ops.write) {
      throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    }
    /** @type {boolean} */
    var o = true;
    if (typeof position === "undefined") {
      position = fd.position;
      /** @type {boolean} */
      o = false;
    } else {
      if (!fd.seekable) {
        throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
      }
    }
    if (fd.flags & 1024) {
      FS.llseek(fd, 0, 2);
    }
    var r = fd.stream_ops.write(fd, text, recurring, length, position, deepDataAndEvents);
    if (!o) {
      fd.position += r;
    }
    return r;
  },
  /**
   * @param {Object} o
   * @param {number} deepDataAndEvents
   * @param {number} triggerRoute
   * @return {undefined}
   */
  allocate : function(o, deepDataAndEvents, triggerRoute) {
    if (deepDataAndEvents < 0 || triggerRoute <= 0) {
      throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    }
    if ((o.flags & 2097155) === 0) {
      throw new FS.ErrnoError(ERRNO_CODES.EBADF);
    }
    if (!FS.isFile(o.node.mode) && !FS.isDir(node.mode)) {
      throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
    }
    if (!o.stream_ops.allocate) {
      throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
    }
    o.stream_ops.allocate(o, deepDataAndEvents, triggerRoute);
  },
  /**
   * @param {string} option
   * @param {Uint8Array} assert
   * @param {?} deepDataAndEvents
   * @param {number} shallow
   * @param {number} dataName
   * @param {?} triggerRoute
   * @param {number} until
   * @return {?}
   */
  mmap : function(option, assert, deepDataAndEvents, shallow, dataName, triggerRoute, until) {
    if ((option.flags & 2097155) === 1) {
      throw new FS.ErrnoError(ERRNO_CODES.EACCES);
    }
    if (!option.stream_ops.mmap) {
      throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
    }
    return option.stream_ops.mmap(option, assert, deepDataAndEvents, shallow, dataName, triggerRoute, until);
  },
  /**
   * @param {?} deepDataAndEvents
   * @param {?} opt_obj2
   * @param {?} triggerRoute
   * @return {?}
   */
  ioctl : function(deepDataAndEvents, opt_obj2, triggerRoute) {
    if (!deepDataAndEvents.stream_ops.ioctl) {
      throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
    }
    return deepDataAndEvents.stream_ops.ioctl(deepDataAndEvents, opt_obj2, triggerRoute);
  },
  /**
   * @param {string} path
   * @param {Object} options
   * @return {?}
   */
  readFile : function(path, options) {
    options = options || {};
    options.flags = options.flags || "r";
    options.encoding = options.encoding || "binary";
    var contents;
    var fd = FS.open(path, options.flags);
    var entries = FS.stat(path);
    var length = entries.size;
    /** @type {Uint8Array} */
    var data = new Uint8Array(length);
    FS.read(fd, data, 0, length, 0);
    if (options.encoding === "utf8") {
      /** @type {string} */
      contents = "";
      var value = new Runtime.UTF8Processor;
      /** @type {number} */
      var i = 0;
      for (;i < length;i++) {
        contents += value.processCChar(data[i]);
      }
    } else {
      if (options.encoding === "binary") {
        /** @type {Uint8Array} */
        contents = data;
      } else {
        throw new Error('Invalid encoding type "' + options.encoding + '"');
      }
    }
    FS.close(fd);
    return contents;
  },
  /**
   * @param {string} path
   * @param {string} text
   * @param {Object} options
   * @return {undefined}
   */
  writeFile : function(path, text, options) {
    options = options || {};
    options.flags = options.flags || "w";
    options.encoding = options.encoding || "utf8";
    var fd = FS.open(path, options.flags, options.mode);
    if (options.encoding === "utf8") {
      var core_trim = new Runtime.UTF8Processor;
      /** @type {Uint8Array} */
      var data = new Uint8Array(core_trim.processJSString(text));
      FS.write(fd, data, 0, data.length, 0);
    } else {
      if (options.encoding === "binary") {
        FS.write(fd, text, 0, text.length, 0);
      } else {
        throw new Error('Invalid encoding type "' + options.encoding + '"');
      }
    }
    FS.close(fd);
  },
  /**
   * @return {?}
   */
  cwd : function() {
    return FS.currentPath;
  },
  /**
   * @param {string} dir
   * @return {undefined}
   */
  chdir : function(dir) {
    var options = FS.lookupPath(dir, {
      follow : true
    });
    if (!FS.isDir(options.node.mode)) {
      throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
    }
    var brng = FS.nodePermissions(options.node, "x");
    if (brng) {
      throw new FS.ErrnoError(brng);
    }
    FS.currentPath = options.path;
  },
  /**
   * @return {undefined}
   */
  createDefaultDirectories : function() {
    FS.mkdir("/tmp");
  },
  /**
   * @return {undefined}
   */
  createDefaultDevices : function() {
    FS.mkdir("/dev");
    FS.registerDevice(FS.makedev(1, 3), {
      /**
       * @return {?}
       */
      read : function() {
        return 0;
      },
      /**
       * @return {?}
       */
      write : function() {
        return 0;
      }
    });
    FS.mkdev("/dev/null", FS.makedev(1, 3));
    TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
    TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
    FS.mkdev("/dev/tty", FS.makedev(5, 0));
    FS.mkdev("/dev/tty1", FS.makedev(6, 0));
    FS.mkdir("/dev/shm");
    FS.mkdir("/dev/shm/tmp");
  },
  /**
   * @return {undefined}
   */
  createStandardStreams : function() {
    if (Module["stdin"]) {
      FS.createDevice("/dev", "stdin", Module["stdin"]);
    } else {
      FS.symlink("/dev/tty", "/dev/stdin");
    }
    if (Module["stdout"]) {
      FS.createDevice("/dev", "stdout", null, Module["stdout"]);
    } else {
      FS.symlink("/dev/tty", "/dev/stdout");
    }
    if (Module["stderr"]) {
      FS.createDevice("/dev", "stderr", null, Module["stderr"]);
    } else {
      FS.symlink("/dev/tty1", "/dev/stderr");
    }
    var fd = FS.open("/dev/stdin", "r");
    HEAP32[_stdin >> 2] = fd.fd;
    assert(fd.fd === 1, "invalid handle for stdin (" + fd.fd + ")");
    var file = FS.open("/dev/stdout", "w");
    HEAP32[_stdout >> 2] = file.fd;
    assert(file.fd === 2, "invalid handle for stdout (" + file.fd + ")");
    var info = FS.open("/dev/stderr", "w");
    HEAP32[_stderr >> 2] = info.fd;
    assert(info.fd === 3, "invalid handle for stderr (" + info.fd + ")");
  },
  /**
   * @return {undefined}
   */
  ensureErrnoError : function() {
    if (FS.ErrnoError) {
      return;
    }
    /**
     * @param {boolean} message
     * @return {undefined}
     */
    FS.ErrnoError = function(message) {
      /** @type {boolean} */
      this.errno = message;
      var code;
      for (code in ERRNO_CODES) {
        if (ERRNO_CODES[code] === message) {
          /** @type {string} */
          this.code = code;
          break;
        }
      }
      this.message = ERRNO_MESSAGES[message];
      if (this.stack) {
        this.stack = demangleAll(this.stack);
      }
    };
    /** @type {Error} */
    FS.ErrnoError.prototype = new Error;
    /** @type {function (boolean): undefined} */
    FS.ErrnoError.prototype.constructor = FS.ErrnoError;
    [ERRNO_CODES.ENOENT].forEach(function(i) {
      FS.genericErrors[i] = new FS.ErrnoError(i);
      /** @type {string} */
      FS.genericErrors[i].stack = "<generic error, no stack>";
    });
  },
  /**
   * @return {undefined}
   */
  staticInit : function() {
    FS.ensureErrnoError();
    /** @type {Array} */
    FS.nameTable = new Array(4096);
    FS.root = FS.createNode(null, "/", 16384 | 511, 0);
    FS.mount(MEMFS, {}, "/");
    FS.createDefaultDirectories();
    FS.createDefaultDevices();
  },
  /**
   * @param {(Object|boolean|number|string)} allBindingsAccessor
   * @param {(Object|boolean|number|string)} depMaps
   * @param {(Object|boolean|number|string)} rootjQuery
   * @return {undefined}
   */
  init : function(allBindingsAccessor, depMaps, rootjQuery) {
    assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
    /** @type {boolean} */
    FS.init.initialized = true;
    FS.ensureErrnoError();
    Module["stdin"] = allBindingsAccessor || Module["stdin"];
    Module["stdout"] = depMaps || Module["stdout"];
    Module["stderr"] = rootjQuery || Module["stderr"];
    FS.createStandardStreams();
  },
  /**
   * @return {undefined}
   */
  quit : function() {
    /** @type {boolean} */
    FS.init.initialized = false;
    /** @type {number} */
    var i = 0;
    for (;i < FS.streams.length;i++) {
      var fd = FS.streams[i];
      if (!fd) {
        continue;
      }
      FS.close(fd);
    }
  },
  /**
   * @param {boolean} deepDataAndEvents
   * @param {boolean} options
   * @return {?}
   */
  getMode : function(deepDataAndEvents, options) {
    /** @type {number} */
    var mode = 0;
    if (deepDataAndEvents) {
      mode |= 292 | 73;
    }
    if (options) {
      mode |= 146;
    }
    return mode;
  },
  /**
   * @param {?} file
   * @param {boolean} path
   * @return {?}
   */
  joinPath : function(file, path) {
    var name = PATH.join.apply(null, file);
    if (path && name[0] == "/") {
      name = name.substr(1);
    }
    return name;
  },
  /**
   * @param {?} path
   * @param {?} program
   * @return {?}
   */
  absolutePath : function(path, program) {
    return PATH.resolve(program, path);
  },
  /**
   * @param {string} fileName
   * @return {?}
   */
  standardizePath : function(fileName) {
    return PATH.normalize(fileName);
  },
  /**
   * @param {string} path
   * @param {?} deepDataAndEvents
   * @return {?}
   */
  findObject : function(path, deepDataAndEvents) {
    var parsed = FS.analyzePath(path, deepDataAndEvents);
    if (parsed.exists) {
      return parsed.object;
    } else {
      ___setErrNo(parsed.error);
      return null;
    }
  },
  /**
   * @param {string} path
   * @param {?} deepDataAndEvents
   * @return {?}
   */
  analyzePath : function(path, deepDataAndEvents) {
    try {
      var info = FS.lookupPath(path, {
        follow : !deepDataAndEvents
      });
      path = info.path;
    } catch (r) {
    }
    var options = {
      isRoot : false,
      exists : false,
      error : 0,
      name : null,
      path : null,
      object : null,
      parentExists : false,
      parentPath : null,
      parentObject : null
    };
    try {
      info = FS.lookupPath(path, {
        parent : true
      });
      /** @type {boolean} */
      options.parentExists = true;
      options.parentPath = info.path;
      options.parentObject = info.node;
      options.name = PATH.basename(path);
      info = FS.lookupPath(path, {
        follow : !deepDataAndEvents
      });
      /** @type {boolean} */
      options.exists = true;
      options.path = info.path;
      options.object = info.node;
      options.name = info.node.name;
      /** @type {boolean} */
      options.isRoot = info.path === "/";
    } catch (data) {
      options.error = data.errno;
    }
    return options;
  },
  /**
   * @param {HTMLElement} path
   * @param {string} name
   * @param {boolean} deepDataAndEvents
   * @param {boolean} callback
   * @return {?}
   */
  createFolder : function(path, name, deepDataAndEvents, callback) {
    var dir = PATH.join2(typeof path === "string" ? path : FS.getPath(path), name);
    var cb = FS.getMode(deepDataAndEvents, callback);
    return FS.mkdir(dir, cb);
  },
  /**
   * @param {string} path
   * @param {string} name
   * @param {?} obj
   * @param {?} value
   * @return {?}
   */
  createPath : function(path, name, obj, value) {
    path = typeof path === "string" ? path : FS.getPath(path);
    var braceStack = name.split("/").reverse();
    for (;braceStack.length;) {
      var udataCur = braceStack.pop();
      if (!udataCur) {
        continue;
      }
      var dir = PATH.join2(path, udataCur);
      try {
        FS.mkdir(dir);
      } catch (u) {
      }
      path = dir;
    }
    return dir;
  },
  /**
   * @param {string} path
   * @param {string} name
   * @param {?} file
   * @param {boolean} deepDataAndEvents
   * @param {boolean} callback
   * @return {?}
   */
  createFile : function(path, name, file, deepDataAndEvents, callback) {
    var fileName = PATH.join2(typeof path === "string" ? path : FS.getPath(path), name);
    var cb = FS.getMode(deepDataAndEvents, callback);
    return FS.create(fileName, cb);
  },
  /**
   * @param {string} x
   * @param {?} y
   * @param {string} data
   * @param {boolean} deepDataAndEvents
   * @param {boolean} mode
   * @param {boolean} dataAndEvents
   * @return {?}
   */
  createDataFile : function(x, y, data, deepDataAndEvents, mode, dataAndEvents) {
    var p = y ? PATH.join2(typeof x === "string" ? x : FS.getPath(x), y) : x;
    var name = FS.getMode(deepDataAndEvents, mode);
    var path = FS.create(p, name);
    if (data) {
      if (typeof data === "string") {
        /** @type {Array} */
        var tmp = new Array(data.length);
        /** @type {number} */
        var i = 0;
        /** @type {number} */
        var iLen = data.length;
        for (;i < iLen;++i) {
          /** @type {number} */
          tmp[i] = data.charCodeAt(i);
        }
        /** @type {Array} */
        data = tmp;
      }
      FS.chmod(path, name | 146);
      var fd = FS.open(path, "w");
      FS.write(fd, data, 0, data.length, 0, dataAndEvents);
      FS.close(fd);
      FS.chmod(path, name);
    }
    return path;
  },
  /**
   * @param {string} x
   * @param {string} stream
   * @param {Array} test
   * @param {Object} res
   * @return {?}
   */
  createDevice : function(x, stream, test, res) {
    var recurring = PATH.join2(typeof x === "string" ? x : FS.getPath(x), stream);
    var rvar = FS.getMode(!!test, !!res);
    if (!FS.createDevice.major) {
      /** @type {number} */
      FS.createDevice.major = 64;
    }
    var failuresLink = FS.makedev(FS.createDevice.major++, 0);
    FS.registerDevice(failuresLink, {
      /**
       * @param {string} method
       * @return {undefined}
       */
      open : function(method) {
        /** @type {boolean} */
        method.seekable = false;
      },
      /**
       * @param {?} cb
       * @return {undefined}
       */
      close : function(cb) {
        if (res && (res.buffer && res.buffer.length)) {
          res(10);
        }
      },
      /**
       * @param {Object} data
       * @param {Uint8Array} buffer
       * @param {number} offset
       * @param {number} length
       * @param {number} position
       * @return {?}
       */
      read : function(data, buffer, offset, length, position) {
        /** @type {number} */
        var b = 0;
        /** @type {number} */
        var i = 0;
        for (;i < length;i++) {
          var result;
          try {
            result = test();
          } catch (f) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          if (result === undefined && b === 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
          }
          if (result === null || result === undefined) {
            break;
          }
          b++;
          buffer[offset + i] = result;
        }
        if (b) {
          /** @type {number} */
          data.node.timestamp = Date.now();
        }
        return b;
      },
      /**
       * @param {Object} cb
       * @param {string} text
       * @param {number} recurring
       * @param {number} length
       * @param {number} position
       * @return {?}
       */
      write : function(cb, text, recurring, length, position) {
        /** @type {number} */
        var i = 0;
        for (;i < length;i++) {
          try {
            res(text[recurring + i]);
          } catch (u) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
        }
        if (length) {
          /** @type {number} */
          cb.node.timestamp = Date.now();
        }
        return i;
      }
    });
    return FS.mkdev(recurring, rvar, failuresLink);
  },
  /**
   * @param {HTMLElement} path
   * @param {string} id
   * @param {string} source
   * @param {?} title
   * @param {?} opt_container
   * @return {?}
   */
  createLink : function(path, id, source, title, opt_container) {
    var target = PATH.join2(typeof path === "string" ? path : FS.getPath(path), id);
    return FS.symlink(source, target);
  },
  /**
   * @param {Object} item
   * @return {?}
   */
  forceLoadFile : function(item) {
    if (item.isDevice || (item.isFolder || (item.link || item.contents))) {
      return true;
    }
    /** @type {boolean} */
    var forceLoadFile = true;
    if (typeof XMLHttpRequest !== "undefined") {
      throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
    } else {
      if (Module["read"]) {
        try {
          item.contents = intArrayFromString(Module["read"](item.url), true);
        } catch (n) {
          /** @type {boolean} */
          forceLoadFile = false;
        }
      } else {
        throw new Error("Cannot load without read() or XMLHttpRequest.");
      }
    }
    if (!forceLoadFile) {
      ___setErrNo(ERRNO_CODES.EIO);
    }
    return forceLoadFile;
  },
  /**
   * @param {string} path
   * @param {string} data
   * @param {string} href
   * @param {boolean} deepDataAndEvents
   * @param {boolean} next_callback
   * @return {?}
   */
  createLazyFile : function(path, data, href, deepDataAndEvents, next_callback) {
    if (typeof XMLHttpRequest !== "undefined") {
      if (!ENVIRONMENT_IS_WORKER) {
        throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
      }
      /**
       * @return {undefined}
       */
      var Context = function() {
        /** @type {boolean} */
        this.lengthKnown = false;
        /** @type {Array} */
        this.chunks = [];
      };
      /**
       * @param {number} start
       * @return {?}
       */
      Context.prototype.get = function(start) {
        if (start > this.length - 1 || start < 0) {
          return undefined;
        }
        /** @type {number} */
        var unlock = start % this.chunkSize;
        /** @type {number} */
        var r20 = Math.floor(start / this.chunkSize);
        return this.getter(r20)[unlock];
      };
      /**
       * @param {Function} getter
       * @return {undefined}
       */
      Context.prototype.setDataGetter = function(getter) {
        /** @type {Function} */
        this.getter = getter;
      };
      /**
       * @return {undefined}
       */
      Context.prototype.cacheLength = function() {
        /** @type {XMLHttpRequest} */
        var request = new XMLHttpRequest;
        request.open("HEAD", href, false);
        request.send(null);
        if (!(request.status >= 200 && request.status < 300 || request.status === 304)) {
          throw new Error("Couldn't load " + href + ". Status: " + request.status);
        }
        /** @type {number} */
        var index = Number(request.getResponseHeader("Content-length"));
        var bytes;
        /** @type {(boolean|string)} */
        var s = (bytes = request.getResponseHeader("Accept-Ranges")) && bytes === "bytes";
        /** @type {number} */
        var count = 1024 * 1024;
        if (!s) {
          /** @type {number} */
          count = index;
        }
        /**
         * @param {number} data
         * @param {number} id
         * @return {?}
         */
        var send = function(data, id) {
          if (data > id) {
            throw new Error("invalid range (" + data + ", " + id + ") or no bytes requested!");
          }
          if (id > index - 1) {
            throw new Error("only " + index + " bytes available! programmer error!");
          }
          /** @type {XMLHttpRequest} */
          var request = new XMLHttpRequest;
          request.open("GET", href, false);
          if (index !== count) {
            request.setRequestHeader("Range", "bytes=" + data + "-" + id);
          }
          if (typeof Uint8Array != "undefined") {
            /** @type {string} */
            request.responseType = "arraybuffer";
          }
          if (request.overrideMimeType) {
            request.overrideMimeType("text/plain; charset=x-user-defined");
          }
          request.send(null);
          if (!(request.status >= 200 && request.status < 300 || request.status === 304)) {
            throw new Error("Couldn't load " + href + ". Status: " + request.status);
          }
          if (request.response !== undefined) {
            return new Uint8Array(request.response || []);
          } else {
            return intArrayFromString(request.responseText || "", true);
          }
        };
        var chunk = this;
        chunk.setDataGetter(function(i) {
          /** @type {number} */
          var row = i * count;
          /** @type {number} */
          var to = (i + 1) * count - 1;
          /** @type {number} */
          to = Math.min(to, index - 1);
          if (typeof chunk.chunks[i] === "undefined") {
            chunk.chunks[i] = send(row, to);
          }
          if (typeof chunk.chunks[i] === "undefined") {
            throw new Error("doXHR failed!");
          }
          return chunk.chunks[i];
        });
        /** @type {number} */
        this._length = index;
        /** @type {number} */
        this._chunkSize = count;
        /** @type {boolean} */
        this.lengthKnown = true;
      };
      var ctx = new Context;
      Object.defineProperty(ctx, "length", {
        /**
         * @return {?}
         */
        get : function() {
          if (!this.lengthKnown) {
            this.cacheLength();
          }
          return this._length;
        }
      });
      Object.defineProperty(ctx, "chunkSize", {
        /**
         * @return {?}
         */
        get : function() {
          if (!this.lengthKnown) {
            this.cacheLength();
          }
          return this._chunkSize;
        }
      });
      var file = {
        isDevice : false,
        contents : ctx
      };
    } else {
      file = {
        isDevice : false,
        url : href
      };
    }
    var result = FS.createFile(path, data, file, deepDataAndEvents, next_callback);
    if (file.contents) {
      result.contents = file.contents;
    } else {
      if (file.url) {
        /** @type {null} */
        result.contents = null;
        result.url = file.url;
      }
    }
    var x = {};
    /** @type {Array.<string>} */
    var asserterNames = Object.keys(result.stream_ops);
    asserterNames.forEach(function(r) {
      var matcherFunction = result.stream_ops[r];
      /**
       * @return {?}
       */
      x[r] = function() {
        if (!FS.forceLoadFile(result)) {
          throw new FS.ErrnoError(ERRNO_CODES.EIO);
        }
        return matcherFunction.apply(null, arguments);
      };
    });
    /**
     * @param {Object} data
     * @param {Uint8Array} buffer
     * @param {number} offset
     * @param {(boolean|number)} length
     * @param {number} index
     * @return {?}
     */
    x.read = function(data, buffer, offset, length, index) {
      if (!FS.forceLoadFile(result)) {
        throw new FS.ErrnoError(ERRNO_CODES.EIO);
      }
      var list = data.node.contents;
      if (index >= list.length) {
        return 0;
      }
      /** @type {number} */
      var bytes = Math.min(list.length - index, length);
      assert(bytes >= 0);
      if (list.slice) {
        /** @type {number} */
        var i = 0;
        for (;i < bytes;i++) {
          buffer[offset + i] = list[index + i];
        }
      } else {
        /** @type {number} */
        i = 0;
        for (;i < bytes;i++) {
          buffer[offset + i] = list.get(index + i);
        }
      }
      return bytes;
    };
    result.stream_ops = x;
    return result;
  },
  /**
   * @param {string} name
   * @param {?} dir
   * @param {string} id
   * @param {boolean} deepDataAndEvents
   * @param {boolean} mode
   * @param {?} next
   * @param {Function} errorCB
   * @param {?} ignoreMethodDoesntExist
   * @param {boolean} dataAndEvents
   * @return {undefined}
   */
  createPreloadedFile : function(name, dir, id, deepDataAndEvents, mode, next, errorCB, ignoreMethodDoesntExist, dataAndEvents) {
    /**
     * @param {string} node
     * @return {undefined}
     */
    function handle(node) {
      /**
       * @param {string} it
       * @return {undefined}
       */
      function operation(it) {
        if (!ignoreMethodDoesntExist) {
          FS.createDataFile(name, dir, it, deepDataAndEvents, mode, dataAndEvents);
        }
        if (next) {
          next();
        }
        removeRunDependency("cp " + itemPath);
      }
      /** @type {boolean} */
      var c = false;
      Module["preloadPlugins"].forEach(function(tagMap) {
        if (c) {
          return;
        }
        if (tagMap["canHandle"](itemPath)) {
          tagMap["handle"](node, itemPath, operation, function() {
            if (errorCB) {
              errorCB();
            }
            removeRunDependency("cp " + itemPath);
          });
          /** @type {boolean} */
          c = true;
        }
      });
      if (!c) {
        operation(node);
      }
    }
    Browser.init();
    var itemPath = dir ? PATH.resolve(PATH.join2(name, dir)) : name;
    addRunDependency("cp " + itemPath);
    if (typeof id == "string") {
      Browser.asyncLoad(id, function(n) {
        handle(n);
      }, errorCB);
    } else {
      handle(id);
    }
  },
  /**
   * @return {?}
   */
  indexedDB : function() {
    return window.indexedDB || (window.mozIndexedDB || (window.webkitIndexedDB || window.msIndexedDB));
  },
  /**
   * @return {?}
   */
  DB_NAME : function() {
    return "EM_FS_" + window.location.pathname;
  },
  DB_VERSION : 20,
  DB_STORE_NAME : "FILE_DATA",
  /**
   * @param {Array} assertions
   * @param {Function} onSuccess
   * @param {Function} callback
   * @return {?}
   */
  saveFilesToDB : function(assertions, onSuccess, callback) {
    onSuccess = onSuccess || function() {
    };
    callback = callback || function() {
    };
    var $modal = FS.indexedDB();
    try {
      var request = $modal.open(FS.DB_NAME(), FS.DB_VERSION);
    } catch (er) {
      return callback(er);
    }
    /**
     * @return {undefined}
     */
    request.onupgradeneeded = function() {
      console.log("creating db");
      var db = request.result;
      db.createObjectStore(FS.DB_STORE_NAME);
    };
    /**
     * @return {undefined}
     */
    request.onsuccess = function() {
      /**
       * @return {undefined}
       */
      function onsuccess() {
        if (i == 0) {
          onSuccess();
        } else {
          callback();
        }
      }
      var db = request.result;
      var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
      var map = transaction.objectStore(FS.DB_STORE_NAME);
      /** @type {number} */
      var val = 0;
      /** @type {number} */
      var i = 0;
      var len = assertions.length;
      assertions.forEach(function(path) {
        var request = map.put(FS.analyzePath(path).object.contents, path);
        /**
         * @return {undefined}
         */
        request.onsuccess = function() {
          val++;
          if (val + i == len) {
            onsuccess();
          }
        };
        /**
         * @return {undefined}
         */
        request.onerror = function() {
          i++;
          if (val + i == len) {
            onsuccess();
          }
        };
      });
      transaction.onerror = callback;
    };
    /** @type {Function} */
    request.onerror = callback;
  },
  /**
   * @param {Array} assertions
   * @param {Function} fail
   * @param {Function} cb
   * @return {?}
   */
  loadFilesFromDB : function(assertions, fail, cb) {
    fail = fail || function() {
    };
    cb = cb || function() {
    };
    var $modal = FS.indexedDB();
    try {
      var req = $modal.open(FS.DB_NAME(), FS.DB_VERSION);
    } catch (er) {
      return cb(er);
    }
    /** @type {Function} */
    req.onupgradeneeded = cb;
    /**
     * @return {undefined}
     */
    req.onsuccess = function() {
      /**
       * @return {undefined}
       */
      function done() {
        if (i == 0) {
          fail();
        } else {
          cb();
        }
      }
      var database = req.result;
      try {
        var tx = database.transaction([FS.DB_STORE_NAME], "readonly");
      } catch (er) {
        cb(er);
        return;
      }
      var ignore = tx.objectStore(FS.DB_STORE_NAME);
      /** @type {number} */
      var val = 0;
      /** @type {number} */
      var i = 0;
      var len = assertions.length;
      assertions.forEach(function(path) {
        var request = ignore.get(path);
        /**
         * @return {undefined}
         */
        request.onsuccess = function() {
          if (FS.analyzePath(path).exists) {
            FS.unlink(path);
          }
          FS.createDataFile(PATH.dirname(path), PATH.basename(path), request.result, true, true, true);
          val++;
          if (val + i == len) {
            done();
          }
        };
        /**
         * @return {undefined}
         */
        request.onerror = function() {
          i++;
          if (val + i == len) {
            done();
          }
        };
      });
      tx.onerror = cb;
    };
    /** @type {Function} */
    req.onerror = cb;
  }
};
var _mkport = undefined;
var SOCKFS = {
  /**
   * @param {?} obj
   * @return {?}
   */
  mount : function(obj) {
    return FS.createNode(null, "/", 16384 | 511, 0);
  },
  /**
   * @param {string} cb
   * @param {Object} type
   * @param {number} options
   * @return {?}
   */
  createSocket : function(cb, type, options) {
    /** @type {boolean} */
    var boundary_edges = type == 1;
    if (options) {
      assert(boundary_edges == (options == 6));
    }
    var obj = {
      family : cb,
      type : type,
      protocol : options,
      server : null,
      peers : {},
      pending : [],
      recv_queue : [],
      sock_ops : SOCKFS.websocket_sock_ops
    };
    var name = SOCKFS.nextname();
    var child = FS.createNode(SOCKFS.root, name, 49152, 0);
    child.sock = obj;
    var s = FS.createStream({
      path : name,
      node : child,
      flags : FS.modeStringToFlags("r+"),
      seekable : false,
      stream_ops : SOCKFS.stream_ops
    });
    obj.stream = s;
    return obj;
  },
  /**
   * @param {?} input
   * @return {?}
   */
  getSocket : function(input) {
    var params = FS.getStream(input);
    if (!params || !FS.isSocket(params.node.mode)) {
      return null;
    }
    return params.node.sock;
  },
  stream_ops : {
    /**
     * @param {Object} options
     * @return {?}
     */
    poll : function(options) {
      var condition = options.node.sock;
      return condition.sock_ops.poll(condition);
    },
    /**
     * @param {?} body
     * @param {?} opt_obj2
     * @param {?} triggerRoute
     * @return {?}
     */
    ioctl : function(body, opt_obj2, triggerRoute) {
      var deepDataAndEvents = body.node.sock;
      return deepDataAndEvents.sock_ops.ioctl(deepDataAndEvents, opt_obj2, triggerRoute);
    },
    /**
     * @param {Object} data
     * @param {Uint8Array} buf
     * @param {number} offset
     * @param {(boolean|number)} length
     * @param {number} position
     * @return {?}
     */
    read : function(data, buf, offset, length, position) {
      var _this = data.node.sock;
      var res = _this.sock_ops.recvmsg(_this, length);
      if (!res) {
        return 0;
      }
      buf.set(res.buffer, offset);
      return res.buffer.length;
    },
    /**
     * @param {Object} cb
     * @param {string} text
     * @param {number} recurring
     * @param {number} length
     * @param {number} position
     * @return {?}
     */
    write : function(cb, text, recurring, length, position) {
      var failuresLink = cb.node.sock;
      return failuresLink.sock_ops.sendmsg(failuresLink, text, recurring, length);
    },
    /**
     * @param {?} cb
     * @return {undefined}
     */
    close : function(cb) {
      var fd = cb.node.sock;
      fd.sock_ops.close(fd);
    }
  },
  /**
   * @return {?}
   */
  nextname : function() {
    if (!SOCKFS.nextname.current) {
      /** @type {number} */
      SOCKFS.nextname.current = 0;
    }
    return "socket[" + SOCKFS.nextname.current++ + "]";
  },
  websocket_sock_ops : {
    /**
     * @param {Object} object
     * @param {Object} key
     * @param {number} dir
     * @return {?}
     */
    createPeer : function(object, key, dir) {
      var socket;
      if (typeof key === "object") {
        /** @type {Object} */
        socket = key;
        /** @type {null} */
        key = null;
        /** @type {null} */
        dir = null;
      }
      if (socket) {
        if (socket._socket) {
          key = socket._socket.remoteAddress;
          dir = socket._socket.remotePort;
        } else {
          /** @type {(Array.<string>|null)} */
          var path = /ws[s]?:\/\/([^:]+):(\d+)/.exec(socket.url);
          if (!path) {
            throw new Error("WebSocket URL must be in the format ws(s)://address:port");
          }
          /** @type {string} */
          key = path[1];
          /** @type {number} */
          dir = parseInt(path[2], 10);
        }
      } else {
        try {
          /** @type {string} */
          var url = "ws://" + key + ":" + dir;
          /** @type {(Array|{headers: {websocket-protocol: Array}})} */
          var clientOptions = ENVIRONMENT_IS_NODE ? {
            headers : {
              "websocket-protocol" : ["binary"]
            }
          } : ["binary"];
          var WebSocket = ENVIRONMENT_IS_NODE ? require("ws") : window["WebSocket"];
          socket = new WebSocket(url, clientOptions);
          /** @type {string} */
          socket.binaryType = "arraybuffer";
        } catch (a) {
          throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
        }
      }
      var m = {
        addr : key,
        port : dir,
        socket : socket,
        dgram_send_queue : []
      };
      SOCKFS.websocket_sock_ops.addPeer(object, m);
      SOCKFS.websocket_sock_ops.handlePeerEvents(object, m);
      if (object.type === 2 && typeof object.sport !== "undefined") {
        m.dgram_send_queue.push(new Uint8Array([255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), (object.sport & 65280) >> 8, object.sport & 255]));
      }
      return m;
    },
    /**
     * @param {Object} obj
     * @param {string} dataAndEvents
     * @param {number} keepData
     * @return {?}
     */
    getPeer : function(obj, dataAndEvents, keepData) {
      return obj.peers[dataAndEvents + ":" + keepData];
    },
    /**
     * @param {Object} obj
     * @param {Object} item
     * @return {undefined}
     */
    addPeer : function(obj, item) {
      /** @type {Object} */
      obj.peers[item.addr + ":" + item.port] = item;
    },
    /**
     * @param {Object} obj
     * @param {Object} item
     * @return {undefined}
     */
    removePeer : function(obj, item) {
      delete obj.peers[item.addr + ":" + item.port];
    },
    /**
     * @param {Object} owner
     * @param {Object} self
     * @return {undefined}
     */
    handlePeerEvents : function(owner, self) {
      /**
       * @param {Array} result
       * @return {undefined}
       */
      function callback(result) {
        assert(typeof result !== "string" && result.byteLength !== undefined);
        /** @type {Uint8Array} */
        result = new Uint8Array(result);
        var YYSTATE = YY_START;
        /** @type {boolean} */
        YY_START = false;
        if (YYSTATE && (result.length === 10 && (result[0] === 255 && (result[1] === 255 && (result[2] === 255 && (result[3] === 255 && (result[4] === "p".charCodeAt(0) && (result[5] === "o".charCodeAt(0) && (result[6] === "r".charCodeAt(0) && result[7] === "t".charCodeAt(0)))))))))) {
          /** @type {number} */
          var port = result[8] << 8 | result[9];
          SOCKFS.websocket_sock_ops.removePeer(owner, self);
          /** @type {number} */
          self.port = port;
          SOCKFS.websocket_sock_ops.addPeer(owner, self);
          return;
        }
        owner.recv_queue.push({
          addr : self.addr,
          port : self.port,
          data : result
        });
      }
      /** @type {boolean} */
      var YY_START = true;
      /**
       * @return {undefined}
       */
      var listener = function() {
        try {
          var uri = self.dgram_send_queue.shift();
          for (;uri;) {
            self.socket.send(uri);
            uri = self.dgram_send_queue.shift();
          }
        } catch (n) {
          self.socket.close();
        }
      };
      if (ENVIRONMENT_IS_NODE) {
        self.socket.on("open", listener);
        self.socket.on("message", function(buffer, flags) {
          if (!flags.binary) {
            return;
          }
          callback((new Uint8Array(buffer)).buffer);
        });
        self.socket.on("error", function() {
        });
      } else {
        /** @type {function (): undefined} */
        self.socket.onopen = listener;
        /**
         * @param {MessageEvent} msg
         * @return {undefined}
         */
        self.socket.onmessage = function(msg) {
          callback(msg.data);
        };
      }
    },
    /**
     * @param {Object} node
     * @return {?}
     */
    poll : function(node) {
      if (node.type === 1 && node.server) {
        return node.pending.length ? 64 | 1 : 0;
      }
      /** @type {number} */
      var obj = 0;
      var e = node.type === 1 ? SOCKFS.websocket_sock_ops.getPeer(node, node.daddr, node.dport) : null;
      if (node.recv_queue.length || (!e || (e && e.socket.readyState === e.socket.CLOSING || e && e.socket.readyState === e.socket.CLOSED))) {
        obj |= 64 | 1;
      }
      if (!e || e && e.socket.readyState === e.socket.OPEN) {
        obj |= 4;
      }
      if (e && e.socket.readyState === e.socket.CLOSING || e && e.socket.readyState === e.socket.CLOSED) {
        obj |= 16;
      }
      return obj;
    },
    /**
     * @param {?} deepDataAndEvents
     * @param {?} f
     * @param {?} triggerRoute
     * @return {?}
     */
    ioctl : function(deepDataAndEvents, f, triggerRoute) {
      switch(f) {
        case 21531:
          /** @type {number} */
          var valsLength = 0;
          if (deepDataAndEvents.recv_queue.length) {
            valsLength = deepDataAndEvents.recv_queue[0].data.length;
          }
          HEAP32[triggerRoute >> 2] = valsLength;
          return 0;
        default:
          return ERRNO_CODES.EINVAL;
      }
    },
    /**
     * @param {?} data
     * @return {?}
     */
    close : function(data) {
      if (data.server) {
        try {
          data.server.close();
        } catch (t) {
        }
        /** @type {null} */
        data.server = null;
      }
      /** @type {Array.<string>} */
      var codeSegments = Object.keys(data.peers);
      /** @type {number} */
      var i = 0;
      for (;i < codeSegments.length;i++) {
        var e = data.peers[codeSegments[i]];
        try {
          e.socket.close();
        } catch (t) {
        }
        SOCKFS.websocket_sock_ops.removePeer(data, e);
      }
      return 0;
    },
    /**
     * @param {Object} item
     * @param {string} obj
     * @param {number} type
     * @return {undefined}
     */
    bind : function(item, obj, type) {
      if (typeof item.saddr !== "undefined" || typeof item.sport !== "undefined") {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
      }
      /** @type {string} */
      item.saddr = obj;
      item.sport = type || _mkport();
      if (item.type === 2) {
        if (item.server) {
          item.server.close();
          /** @type {null} */
          item.server = null;
        }
        try {
          item.sock_ops.listen(item, 0);
        } catch (e) {
          if (!(e instanceof FS.ErrnoError)) {
            throw e;
          }
          if (e.errno !== ERRNO_CODES.EOPNOTSUPP) {
            throw e;
          }
        }
      }
    },
    /**
     * @param {Object} connection
     * @param {Object} events
     * @param {number} file
     * @return {undefined}
     */
    connect : function(connection, events, file) {
      if (connection.server) {
        throw new FS.ErrnoError(ERRNO_CODS.EOPNOTSUPP);
      }
      if (typeof connection.daddr !== "undefined" && typeof connection.dport !== "undefined") {
        var req = SOCKFS.websocket_sock_ops.getPeer(connection, connection.daddr, connection.dport);
        if (req) {
          if (req.socket.readyState === req.socket.CONNECTING) {
            throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
          } else {
            throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
          }
        }
      }
      var data = SOCKFS.websocket_sock_ops.createPeer(connection, events, file);
      connection.daddr = data.addr;
      connection.dport = data.port;
      throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
    },
    /**
     * @param {Object} self
     * @param {number} opt_scope
     * @return {undefined}
     */
    listen : function(self, opt_scope) {
      if (!ENVIRONMENT_IS_NODE) {
        throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
      }
      if (self.server) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
      }
      var App = require("ws").Server;
      var node = self.saddr;
      self.server = new App({
        host : node,
        port : self.sport
      });
      self.server.on("connection", function(camelKey) {
        if (self.type === 1) {
          var connection = SOCKFS.createSocket(self.family, self.type, self.protocol);
          var data = SOCKFS.websocket_sock_ops.createPeer(connection, camelKey);
          connection.daddr = data.addr;
          connection.dport = data.port;
          self.pending.push(connection);
        } else {
          SOCKFS.websocket_sock_ops.createPeer(self, camelKey);
        }
      });
      self.server.on("closed", function() {
        /** @type {null} */
        self.server = null;
      });
      self.server.on("error", function() {
      });
    },
    /**
     * @param {Object} node
     * @return {?}
     */
    accept : function(node) {
      if (!node.server) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
      }
      var stream = node.pending.shift();
      stream.stream.flags = node.stream.flags;
      return stream;
    },
    /**
     * @param {?} s
     * @param {?} dataAndEvents
     * @return {?}
     */
    getname : function(s, dataAndEvents) {
      var index;
      var _port;
      if (dataAndEvents) {
        if (s.daddr === undefined || s.dport === undefined) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
        }
        index = s.daddr;
        _port = s.dport;
      } else {
        index = s.saddr || 0;
        _port = s.sport || 0;
      }
      return{
        addr : index,
        port : _port
      };
    },
    /**
     * @param {Object} el
     * @param {Object} data
     * @param {number} offset
     * @param {number} length
     * @param {string} node
     * @param {number} key
     * @return {?}
     */
    sendmsg : function(el, data, offset, length, node, key) {
      if (el.type === 2) {
        if (node === undefined || key === undefined) {
          node = el.daddr;
          key = el.dport;
        }
        if (node === undefined || key === undefined) {
          throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
        }
      } else {
        node = el.daddr;
        key = el.dport;
      }
      var result = SOCKFS.websocket_sock_ops.getPeer(el, node, key);
      if (el.type === 1) {
        if (!result || (result.socket.readyState === result.socket.CLOSING || result.socket.readyState === result.socket.CLOSED)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
        } else {
          if (result.socket.readyState === result.socket.CONNECTING) {
            throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
          }
        }
      }
      var chunk;
      if (data instanceof Array || data instanceof ArrayBuffer) {
        chunk = data.slice(offset, offset + length);
      } else {
        chunk = data.buffer.slice(data.byteOffset + offset, data.byteOffset + offset + length);
      }
      if (el.type === 2) {
        if (!result || result.socket.readyState !== result.socket.OPEN) {
          if (!result || (result.socket.readyState === result.socket.CLOSING || result.socket.readyState === result.socket.CLOSED)) {
            result = SOCKFS.websocket_sock_ops.createPeer(el, node, key);
          }
          result.dgram_send_queue.push(chunk);
          return length;
        }
      }
      try {
        result.socket.send(chunk);
        return length;
      } catch (a) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
      }
    },
    /**
     * @param {Object} _this
     * @param {(boolean|number)} step
     * @return {?}
     */
    recvmsg : function(_this, step) {
      if (_this.type === 1 && _this.server) {
        throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
      }
      var self = _this.recv_queue.shift();
      if (!self) {
        if (_this.type === 1) {
          var req = SOCKFS.websocket_sock_ops.getPeer(_this, _this.daddr, _this.dport);
          if (!req) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
          } else {
            if (req.socket.readyState === req.socket.CLOSING || req.socket.readyState === req.socket.CLOSED) {
              return null;
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
        } else {
          throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
        }
      }
      var right = self.data.byteLength || self.data.length;
      var startOffset = self.data.byteOffset || 0;
      var buffer = self.data.buffer || self.data;
      /** @type {number} */
      var left = Math.min(step, right);
      var req_options = {
        buffer : new Uint8Array(buffer, startOffset, left),
        addr : self.addr,
        port : self.port
      };
      if (_this.type === 1 && left < right) {
        /** @type {number} */
        var rl = right - left;
        /** @type {Uint8Array} */
        self.data = new Uint8Array(buffer, startOffset + left, rl);
        _this.recv_queue.unshift(self);
      }
      return req_options;
    }
  }
};
/** @type {function (number): ?} */
Module["_malloc"] = _malloc;
/** @type {function (): undefined} */
Module["_free"] = _free;
var Browser = {
  mainLoop : {
    scheduler : null,
    shouldPause : false,
    paused : false,
    queue : [],
    /**
     * @return {undefined}
     */
    pause : function() {
      /** @type {boolean} */
      Browser.mainLoop.shouldPause = true;
    },
    /**
     * @return {undefined}
     */
    resume : function() {
      if (Browser.mainLoop.paused) {
        /** @type {boolean} */
        Browser.mainLoop.paused = false;
        Browser.mainLoop.scheduler();
      }
      /** @type {boolean} */
      Browser.mainLoop.shouldPause = false;
    },
    /**
     * @return {undefined}
     */
    updateStatus : function() {
      if (Module["setStatus"]) {
        var r20 = Module["statusMessage"] || "Please wait...";
        var left = Browser.mainLoop.remainingBlockers;
        var right = Browser.mainLoop.expectedBlockers;
        if (left) {
          if (left < right) {
            Module["setStatus"](r20 + " (" + (right - left) + "/" + right + ")");
          } else {
            Module["setStatus"](r20);
          }
        } else {
          Module["setStatus"]("");
        }
      }
    }
  },
  isFullScreen : false,
  pointerLock : false,
  moduleContextCreatedCallbacks : [],
  workers : [],
  /**
   * @return {undefined}
   */
  init : function() {
    /**
     * @return {undefined}
     */
    function completed() {
      /** @type {boolean} */
      Browser.pointerLock = document["pointerLockElement"] === element || (document["mozPointerLockElement"] === element || document["webkitPointerLockElement"] === element);
    }
    if (!Module["preloadPlugins"]) {
      /** @type {Array} */
      Module["preloadPlugins"] = [];
    }
    if (Browser.initted || ENVIRONMENT_IS_WORKER) {
      return;
    }
    /** @type {boolean} */
    Browser.initted = true;
    try {
      new Blob;
      /** @type {boolean} */
      Browser.hasBlobConstructor = true;
    } catch (e) {
      /** @type {boolean} */
      Browser.hasBlobConstructor = false;
      console.log("warning: no blob constructor, cannot create blobs with mimetypes");
    }
    Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : !Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null;
    /** @type {(DOMURL|undefined)} */
    Browser.URLObject = typeof window != "undefined" ? window.URL ? window.URL : window.webkitURL : undefined;
    if (!Module.noImageDecoding && typeof Browser.URLObject === "undefined") {
      console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
      /** @type {boolean} */
      Module.noImageDecoding = true;
    }
    var copies = {};
    /**
     * @param {?} qualifier
     * @return {?}
     */
    copies["canHandle"] = function(qualifier) {
      return!Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(qualifier);
    };
    /**
     * @param {string} buffer
     * @param {string} key
     * @param {?} onLoad
     * @param {?} done
     * @return {undefined}
     */
    copies["handle"] = function(buffer, key, onLoad, done) {
      /** @type {null} */
      var output = null;
      if (Browser.hasBlobConstructor) {
        try {
          /** @type {Blob} */
          output = new Blob([buffer], {
            type : Browser.getMimetype(key)
          });
          if (output.size !== buffer.length) {
            /** @type {Blob} */
            output = new Blob([(new Uint8Array(buffer)).buffer], {
              type : Browser.getMimetype(key)
            });
          }
        } catch (o) {
          Runtime.warnOnce("Blob constructor present but fails: " + o + "; falling back to blob builder");
        }
      }
      if (!output) {
        var bb = new Browser.BlobBuilder;
        bb.append((new Uint8Array(buffer)).buffer);
        output = bb.getBlob();
      }
      var url = Browser.URLObject.createObjectURL(output);
      assert(typeof url == "string", "createObjectURL must return a url as a string");
      /** @type {Image} */
      var img = new Image;
      /**
       * @return {undefined}
       */
      img.onload = function() {
        assert(img.complete, "Image " + key + " could not be decoded");
        /** @type {Element} */
        var canvas = document.createElement("canvas");
        /** @type {number} */
        canvas.width = img.width;
        /** @type {number} */
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        /** @type {Element} */
        Module["preloadedImages"][key] = canvas;
        Browser.URLObject.revokeObjectURL(url);
        if (onLoad) {
          onLoad(buffer);
        }
      };
      /**
       * @param {?} er
       * @return {undefined}
       */
      img.onerror = function(er) {
        console.log("Image " + url + " could not be decoded");
        if (done) {
          done();
        }
      };
      img.src = url;
    };
    Module["preloadPlugins"].push(copies);
    var templatePromise = {};
    /**
     * @param {string} rgb
     * @return {?}
     */
    templatePromise["canHandle"] = function(rgb) {
      return!Module.noAudioDecoding && rgb.substr(-4) in {
        ".ogg" : 1,
        ".wav" : 1,
        ".mp3" : 1
      };
    };
    /**
     * @param {Array} source
     * @param {string} key
     * @param {?} trim
     * @param {?} fun
     * @return {?}
     */
    templatePromise["handle"] = function(source, key, trim, fun) {
      /**
       * @param {?} data
       * @return {undefined}
       */
      function callback(data) {
        if (s) {
          return;
        }
        /** @type {boolean} */
        s = true;
        Module["preloadedAudios"][key] = data;
        if (trim) {
          trim(source);
        }
      }
      /**
       * @return {undefined}
       */
      function traverseNode() {
        if (s) {
          return;
        }
        /** @type {boolean} */
        s = true;
        Module["preloadedAudios"][key] = new Audio;
        if (fun) {
          fun();
        }
      }
      /** @type {boolean} */
      var s = false;
      if (Browser.hasBlobConstructor) {
        try {
          /** @type {Blob} */
          var uuidBlob = new Blob([source], {
            type : Browser.getMimetype(key)
          });
        } catch (f) {
          return traverseNode();
        }
        var url = Browser.URLObject.createObjectURL(uuidBlob);
        assert(typeof url == "string", "createObjectURL must return a url as a string");
        var audio = new Audio;
        audio.addEventListener("canplaythrough", function() {
          callback(audio);
        }, false);
        /**
         * @param {?} er
         * @return {undefined}
         */
        audio.onerror = function(er) {
          /**
           * @param {Array} url
           * @return {?}
           */
          function onerror(url) {
            /** @type {string} */
            var map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            /** @type {string} */
            var result = "=";
            /** @type {string} */
            var _result = "";
            /** @type {number} */
            var val = 0;
            /** @type {number} */
            var count = 0;
            /** @type {number} */
            var i = 0;
            for (;i < url.length;i++) {
              /** @type {number} */
              val = val << 8 | url[i];
              count += 8;
              for (;count >= 6;) {
                /** @type {number} */
                var objUid = val >> count - 6 & 63;
                count -= 6;
                _result += map[objUid];
              }
            }
            if (count == 2) {
              _result += map[(val & 3) << 4];
              _result += result + result;
            } else {
              if (count == 4) {
                _result += map[(val & 15) << 2];
                _result += result;
              }
            }
            return _result;
          }
          if (s) {
            return;
          }
          console.log("warning: browser could not fully decode audio " + key + ", trying slower base64 approach");
          /** @type {string} */
          audio.src = "data:audio/x-" + key.substr(-3) + ";base64," + onerror(source);
          callback(audio);
        };
        audio.src = url;
        Browser.safeSetTimeout(function() {
          callback(audio);
        }, 1E4);
      } else {
        return traverseNode();
      }
    };
    Module["preloadPlugins"].push(templatePromise);
    var element = Module["canvas"];
    element.requestPointerLock = element["requestPointerLock"] || (element["mozRequestPointerLock"] || element["webkitRequestPointerLock"]);
    element.exitPointerLock = document["exitPointerLock"] || (document["mozExitPointerLock"] || (document["webkitExitPointerLock"] || function() {
    }));
    element.exitPointerLock = element.exitPointerLock.bind(document);
    document.addEventListener("pointerlockchange", completed, false);
    document.addEventListener("mozpointerlockchange", completed, false);
    document.addEventListener("webkitpointerlockchange", completed, false);
    if (Module["elementPointerLock"]) {
      element.addEventListener("click", function(types) {
        if (!Browser.pointerLock && element.requestPointerLock) {
          element.requestPointerLock();
          types.preventDefault();
        }
      }, false);
    }
  },
  /**
   * @param {HTMLElement} canvas
   * @param {?} modules
   * @param {?} baseId
   * @param {Object} options
   * @return {?}
   */
  createContext : function(canvas, modules, baseId, options) {
    var context;
    try {
      if (modules) {
        var parameters = {
          antialias : false,
          alpha : false
        };
        if (options) {
          var key;
          for (key in options) {
            parameters[key] = options[key];
          }
        }
        /** @type {string} */
        var filename = "?";
        /**
         * @param {WebGLContextEvent} e
         * @return {undefined}
         */
        var completed = function(e) {
          filename = e.statusMessage || filename;
        };
        canvas.addEventListener("webglcontextcreationerror", completed, false);
        try {
          ["experimental-webgl", "webgl"].some(function(webgl) {
            return context = canvas.getContext(webgl, parameters);
          });
        } finally {
          canvas.removeEventListener("webglcontextcreationerror", completed, false);
        }
      } else {
        context = canvas.getContext("2d");
      }
      if (!context) {
        throw ":(";
      }
    } catch (f) {
      Module.print("Could not create canvas: " + [filename, f]);
      return null;
    }
    if (modules) {
      /** @type {string} */
      canvas.style.backgroundColor = "black";
      canvas.addEventListener("webglcontextlost", function(dataAndEvents) {
        alert("WebGL context lost. You will need to reload the page.");
      }, false);
    }
    if (baseId) {
      GLctx = Module.ctx = context;
      Module.useWebGL = modules;
      Browser.moduleContextCreatedCallbacks.forEach(function(init) {
        init();
      });
      Browser.init();
    }
    return context;
  },
  /**
   * @param {?} dataAndEvents
   * @param {?} context
   * @param {?} deepDataAndEvents
   * @return {undefined}
   */
  destroyContext : function(dataAndEvents, context, deepDataAndEvents) {
  },
  fullScreenHandlersInstalled : false,
  lockPointer : undefined,
  resizeCanvas : undefined,
  /**
   * @param {boolean} deepDataAndEvents
   * @param {boolean} triggerRoute
   * @return {undefined}
   */
  requestFullScreen : function(deepDataAndEvents, triggerRoute) {
    /**
     * @return {undefined}
     */
    function completed() {
      /** @type {boolean} */
      Browser.isFullScreen = false;
      if ((document["webkitFullScreenElement"] || (document["webkitFullscreenElement"] || (document["mozFullScreenElement"] || (document["mozFullscreenElement"] || (document["fullScreenElement"] || document["fullscreenElement"]))))) === element) {
        element.cancelFullScreen = document["cancelFullScreen"] || (document["mozCancelFullScreen"] || document["webkitCancelFullScreen"]);
        element.cancelFullScreen = element.cancelFullScreen.bind(document);
        if (Browser.lockPointer) {
          element.requestPointerLock();
        }
        /** @type {boolean} */
        Browser.isFullScreen = true;
        if (Browser.resizeCanvas) {
          Browser.setFullScreenCanvasSize();
        }
      } else {
        if (Browser.resizeCanvas) {
          Browser.setWindowedCanvasSize();
        }
      }
      if (Module["onFullScreen"]) {
        Module["onFullScreen"](Browser.isFullScreen);
      }
    }
    /** @type {boolean} */
    Browser.lockPointer = deepDataAndEvents;
    /** @type {boolean} */
    Browser.resizeCanvas = triggerRoute;
    if (typeof Browser.lockPointer === "undefined") {
      /** @type {boolean} */
      Browser.lockPointer = true;
    }
    if (typeof Browser.resizeCanvas === "undefined") {
      /** @type {boolean} */
      Browser.resizeCanvas = false;
    }
    var element = Module["canvas"];
    if (!Browser.fullScreenHandlersInstalled) {
      /** @type {boolean} */
      Browser.fullScreenHandlersInstalled = true;
      document.addEventListener("fullscreenchange", completed, false);
      document.addEventListener("mozfullscreenchange", completed, false);
      document.addEventListener("webkitfullscreenchange", completed, false);
    }
    element.requestFullScreen = element["requestFullScreen"] || (element["mozRequestFullScreen"] || (element["webkitRequestFullScreen"] ? function() {
      element["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]);
    } : null));
    element.requestFullScreen();
  },
  /**
   * @param {?} func
   * @return {undefined}
   */
  requestAnimationFrame : function(func) {
    if (typeof window === "undefined") {
      setTimeout(func, 1E3 / 60);
    } else {
      if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = window["requestAnimationFrame"] || (window["mozRequestAnimationFrame"] || (window["webkitRequestAnimationFrame"] || (window["msRequestAnimationFrame"] || (window["oRequestAnimationFrame"] || window["setTimeout"]))));
      }
      window.requestAnimationFrame(func);
    }
  },
  /**
   * @param {Function} matcherFunction
   * @return {?}
   */
  safeCallback : function(matcherFunction) {
    return function() {
      if (!ABORT) {
        return matcherFunction.apply(null, arguments);
      }
    };
  },
  /**
   * @param {?} $sanitize
   * @return {?}
   */
  safeRequestAnimationFrame : function($sanitize) {
    return Browser.requestAnimationFrame(function() {
      if (!ABORT) {
        $sanitize();
      }
    });
  },
  /**
   * @param {Function} $sanitize
   * @param {number} timestep
   * @return {?}
   */
  safeSetTimeout : function($sanitize, timestep) {
    return setTimeout(function() {
      if (!ABORT) {
        $sanitize();
      }
    }, timestep);
  },
  /**
   * @param {?} $sanitize
   * @param {?} frequency
   * @return {?}
   */
  safeSetInterval : function($sanitize, frequency) {
    return setInterval(function() {
      if (!ABORT) {
        $sanitize();
      }
    }, frequency);
  },
  /**
   * @param {string} string
   * @return {?}
   */
  getMimetype : function(string) {
    return{
      jpg : "image/jpeg",
      jpeg : "image/jpeg",
      png : "image/png",
      bmp : "image/bmp",
      ogg : "audio/ogg",
      wav : "audio/wav",
      mp3 : "audio/mpeg"
    }[string.substr(string.lastIndexOf(".") + 1)];
  },
  /**
   * @param {?} deepDataAndEvents
   * @return {undefined}
   */
  getUserMedia : function(deepDataAndEvents) {
    if (!window.getUserMedia) {
      window.getUserMedia = navigator["getUserMedia"] || navigator["mozGetUserMedia"];
    }
    window.getUserMedia(deepDataAndEvents);
  },
  /**
   * @param {Object} e
   * @return {?}
   */
  getMovementX : function(e) {
    return e["movementX"] || (e["mozMovementX"] || (e["webkitMovementX"] || 0));
  },
  /**
   * @param {Object} e
   * @return {?}
   */
  getMovementY : function(e) {
    return e["movementY"] || (e["mozMovementY"] || (e["webkitMovementY"] || 0));
  },
  mouseX : 0,
  mouseY : 0,
  mouseMovementX : 0,
  mouseMovementY : 0,
  /**
   * @param {Object} e
   * @return {undefined}
   */
  calculateMouseEvent : function(e) {
    if (Browser.pointerLock) {
      if (e.type != "mousemove" && "mozMovementX" in e) {
        /** @type {number} */
        Browser.mouseMovementX = Browser.mouseMovementY = 0;
      } else {
        Browser.mouseMovementX = Browser.getMovementX(e);
        Browser.mouseMovementY = Browser.getMovementY(e);
      }
      if (typeof SDL != "undefined") {
        Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
        Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
      } else {
        Browser.mouseX += Browser.mouseMovementX;
        Browser.mouseY += Browser.mouseMovementY;
      }
    } else {
      var bounds = Module["canvas"].getBoundingClientRect();
      var mouseX;
      var y;
      /** @type {number} */
      var x = typeof window.scrollX !== "undefined" ? window.scrollX : window.pageXOffset;
      /** @type {number} */
      var top = typeof window.scrollY !== "undefined" ? window.scrollY : window.pageYOffset;
      assert(typeof x !== "undefined" && typeof top !== "undefined", "Unable to retrieve scroll position, mouse positions likely broken.");
      if (e.type == "touchstart" || (e.type == "touchend" || e.type == "touchmove")) {
        var touch = e.touches.item(0);
        if (touch) {
          /** @type {number} */
          mouseX = touch.pageX - (x + bounds.left);
          /** @type {number} */
          y = touch.pageY - (top + bounds.top);
        } else {
          return;
        }
      } else {
        /** @type {number} */
        mouseX = e.pageX - (x + bounds.left);
        /** @type {number} */
        y = e.pageY - (top + bounds.top);
      }
      var width = Module["canvas"].width;
      var height = Module["canvas"].height;
      /** @type {number} */
      mouseX = mouseX * (width / bounds.width);
      /** @type {number} */
      y = y * (height / bounds.height);
      /** @type {number} */
      Browser.mouseMovementX = mouseX - Browser.mouseX;
      /** @type {number} */
      Browser.mouseMovementY = y - Browser.mouseY;
      /** @type {number} */
      Browser.mouseX = mouseX;
      /** @type {number} */
      Browser.mouseY = y;
    }
  },
  /**
   * @param {?} action
   * @param {Function} onSuccess
   * @param {Function} onError
   * @return {undefined}
   */
  xhrLoad : function(action, onSuccess, onError) {
    /** @type {XMLHttpRequest} */
    var xhr = new XMLHttpRequest;
    xhr.open("GET", action, true);
    /** @type {string} */
    xhr.responseType = "arraybuffer";
    /**
     * @return {undefined}
     */
    xhr.onload = function() {
      if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
        onSuccess(xhr.response);
      } else {
        onError();
      }
    };
    /** @type {Function} */
    xhr.onerror = onError;
    xhr.send(null);
  },
  /**
   * @param {string} seq
   * @param {Function} cb
   * @param {Function} fail
   * @param {?} filename
   * @return {undefined}
   */
  asyncLoad : function(seq, cb, fail, filename) {
    Browser.xhrLoad(seq, function(message) {
      assert(message, 'Loading data file "' + seq + '" failed (no arrayBuffer).');
      cb(new Uint8Array(message));
      if (!filename) {
        removeRunDependency("al " + seq);
      }
    }, function(dataAndEvents) {
      if (fail) {
        fail();
      } else {
        throw'Loading data file "' + seq + '" failed.';
      }
    });
    if (!filename) {
      addRunDependency("al " + seq);
    }
  },
  resizeListeners : [],
  /**
   * @return {undefined}
   */
  updateResizeListeners : function() {
    var results = Module["canvas"];
    Browser.resizeListeners.forEach(function(done) {
      done(results.width, results.height);
    });
  },
  /**
   * @param {?} width
   * @param {?} height
   * @param {?} deepDataAndEvents
   * @return {undefined}
   */
  setCanvasSize : function(width, height, deepDataAndEvents) {
    var cnv = Module["canvas"];
    cnv.width = width;
    cnv.height = height;
    if (!deepDataAndEvents) {
      Browser.updateResizeListeners();
    }
  },
  windowedWidth : 0,
  windowedHeight : 0,
  /**
   * @return {undefined}
   */
  setFullScreenCanvasSize : function() {
    var media = Module["canvas"];
    this.windowedWidth = media.width;
    this.windowedHeight = media.height;
    media.width = screen.width;
    media.height = screen.height;
    if (typeof SDL != "undefined") {
      var needUpdate = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
      /** @type {number} */
      needUpdate = needUpdate | 8388608;
      /** @type {number} */
      HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = needUpdate;
    }
    Browser.updateResizeListeners();
  },
  /**
   * @return {undefined}
   */
  setWindowedCanvasSize : function() {
    var $cont = Module["canvas"];
    $cont.width = this.windowedWidth;
    $cont.height = this.windowedHeight;
    if (typeof SDL != "undefined") {
      var keys = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
      /** @type {number} */
      keys = keys & ~8388608;
      /** @type {number} */
      HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = keys;
    }
    Browser.updateResizeListeners();
  }
};
FS.staticInit();
__ATINIT__.unshift({
  /**
   * @return {undefined}
   */
  func : function() {
    if (!Module["noFSInit"] && !FS.init.initialized) {
      FS.init();
    }
  }
});
__ATMAIN__.push({
  /**
   * @return {undefined}
   */
  func : function() {
    /** @type {boolean} */
    FS.ignorePermissions = false;
  }
});
__ATEXIT__.push({
  /**
   * @return {undefined}
   */
  func : function() {
    FS.quit();
  }
});
/** @type {function (HTMLElement, string, boolean, boolean): ?} */
Module["FS_createFolder"] = FS.createFolder;
/** @type {function (string, string, ?, ?): ?} */
Module["FS_createPath"] = FS.createPath;
/** @type {function (string, ?, string, boolean, boolean, boolean): ?} */
Module["FS_createDataFile"] = FS.createDataFile;
/** @type {function (string, ?, string, boolean, boolean, ?, Function, ?, boolean): undefined} */
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
/** @type {function (string, string, string, boolean, boolean): ?} */
Module["FS_createLazyFile"] = FS.createLazyFile;
/** @type {function (HTMLElement, string, string, ?, ?): ?} */
Module["FS_createLink"] = FS.createLink;
/** @type {function (string, string, Array, Object): ?} */
Module["FS_createDevice"] = FS.createDevice;
___errno_state = Runtime.staticAlloc(4);
/** @type {number} */
HEAP32[___errno_state >> 2] = 0;
__ATINIT__.unshift({
  /**
   * @return {undefined}
   */
  func : function() {
    TTY.init();
  }
});
__ATEXIT__.push({
  /**
   * @return {undefined}
   */
  func : function() {
    TTY.shutdown();
  }
});
TTY.utf8 = new Runtime.UTF8Processor;
if (ENVIRONMENT_IS_NODE) {
  var fs = require("fs");
  NODEFS.staticInit();
}
__ATINIT__.push({
  /**
   * @return {undefined}
   */
  func : function() {
    SOCKFS.root = FS.mount(SOCKFS, {}, null);
  }
});
/**
 * @param {boolean} deepDataAndEvents
 * @param {boolean} triggerRoute
 * @return {undefined}
 */
Module["requestFullScreen"] = function(deepDataAndEvents, triggerRoute) {
  Browser.requestFullScreen(deepDataAndEvents, triggerRoute);
};
/**
 * @param {?} func
 * @return {undefined}
 */
Module["requestAnimationFrame"] = function(func) {
  Browser.requestAnimationFrame(func);
};
/**
 * @param {?} pixelWidth
 * @param {?} pixelHeight
 * @param {?} deepDataAndEvents
 * @return {undefined}
 */
Module["setCanvasSize"] = function(pixelWidth, pixelHeight, deepDataAndEvents) {
  Browser.setCanvasSize(pixelWidth, pixelHeight, deepDataAndEvents);
};
/**
 * @return {undefined}
 */
Module["pauseMainLoop"] = function() {
  Browser.mainLoop.pause();
};
/**
 * @return {undefined}
 */
Module["resumeMainLoop"] = function() {
  Browser.mainLoop.resume();
};
/**
 * @return {undefined}
 */
Module["getUserMedia"] = function() {
  Browser.getUserMedia();
};
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
/** @type {boolean} */
staticSealed = true;
STACK_MAX = STACK_BASE + 5242880;
DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");
/** @type {Array} */
var FUNCTION_TABLE = [0, 0];
/** @type {function (?): ?} */
Module["_mmain"] = _mmain;
/** @type {null} */
var i64Math = null;
if (memoryInitializer) {
  /**
   * @param {string} data
   * @return {undefined}
   */
  var applyData = function(data) {
    HEAPU8.set(data, STATIC_BASE);
  };
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    applyData(Module["readBinary"](memoryInitializer));
  } else {
    addRunDependency("memory initializer");
    Browser.asyncLoad(memoryInitializer, function(inplace) {
      applyData(inplace);
      removeRunDependency("memory initializer");
    }, function(dataAndEvents) {
      throw "could not load memory initializer " + memoryInitializer;
    });
  }
}
/** @type {Error} */
ExitStatus.prototype = new Error;
/** @type {function (number): undefined} */
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
/** @type {null} */
var preloadStartTime = null;
/** @type {boolean} */
var calledMain = false;
/**
 * @return {undefined}
 */
dependenciesFulfilled = function runCaller() {
  if (!Module["calledRun"] && shouldRunNow) {
    run();
  }
  if (!Module["calledRun"]) {
    /** @type {function (): undefined} */
    dependenciesFulfilled = runCaller;
  }
};
/** @type {function (Array): undefined} */
Module["callMain"] = Module.callMain = function(qs) {
  /**
   * @return {undefined}
   */
  function getEnumerableProperties() {
    /** @type {number} */
    var e = 0;
    for (;e < 4 - 1;e++) {
      count.push(0);
    }
  }
  assert(runDependencies == 0, "cannot call main when async dependencies remain! (listen on __ATMAIN__)");
  assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
  qs = qs || [];
  if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
    Module.printErr("preload time: " + (Date.now() - preloadStartTime) + " ms");
  }
  ensureInitRuntime();
  var length = qs.length + 1;
  /** @type {Array} */
  var count = [allocate(intArrayFromString("/bin/this.program"), "i8", ALLOC_NORMAL)];
  getEnumerableProperties();
  /** @type {number} */
  var i = 0;
  for (;i < length - 1;i = i + 1) {
    count.push(allocate(intArrayFromString(qs[i]), "i8", ALLOC_NORMAL));
    getEnumerableProperties();
  }
  count.push(0);
  count = allocate(count, "i32", ALLOC_NORMAL);
  initialStackTop = STACKTOP;
  try {
    var result = Module["_main"](length, count, 0);
    if (!Module["noExitRuntime"]) {
      exit(result);
    }
  } catch (context) {
    if (context instanceof ExitStatus) {
      return;
    } else {
      if (context == "SimulateInfiniteLoop") {
        /** @type {boolean} */
        Module["noExitRuntime"] = true;
        return;
      } else {
        if (context && (typeof context === "object" && context.stack)) {
          Module.printErr("exception thrown: " + [context, context.stack]);
        }
        throw context;
      }
    }
  } finally {
    /** @type {boolean} */
    calledMain = true;
  }
};
/** @type {function (Element): undefined} */
Module["run"] = Module.run = run;
/** @type {function (number): undefined} */
Module["exit"] = Module.exit = exit;
/** @type {function (string): undefined} */
Module["abort"] = Module.abort = abort;
if (Module["preInit"]) {
  if (typeof Module["preInit"] == "function") {
    /** @type {Array} */
    Module["preInit"] = [Module["preInit"]];
  }
  for (;Module["preInit"].length > 0;) {
    Module["preInit"].pop()();
  }
}
/** @type {boolean} */
var shouldRunNow = true;
if (Module["noInitialRun"]) {
  /** @type {boolean} */
  shouldRunNow = false;
}
run();


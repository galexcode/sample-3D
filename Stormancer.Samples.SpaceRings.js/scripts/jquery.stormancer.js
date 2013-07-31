/* jQuery.XDomainRequest.js */
// jQuery.XDomainRequest.js
// Author: Jason Moon - @JSONMOON
// IE8+
if (!jQuery.support.cors && jQuery.ajaxTransport && window.XDomainRequest) {
  var httpRegEx = /^https?:\/\//i;
  var getOrPostRegEx = /^get|post$/i;
  var sameSchemeRegEx = new RegExp('^'+location.protocol, 'i');
  var htmlRegEx = /text\/html/i;
  var jsonRegEx = /\/json/i;
  var xmlRegEx = /\/xml/i;
  
  // ajaxTransport exists in jQuery 1.5+
  jQuery.ajaxTransport('text html xml json', function(options, userOptions, jqXHR){
    // XDomainRequests must be: asynchronous, GET or POST methods, HTTP or HTTPS protocol, and same scheme as calling page
    if (options.crossDomain && options.async && getOrPostRegEx.test(options.type) && httpRegEx.test(options.url) && sameSchemeRegEx.test(options.url)) {
      var xdr = null;
      var userType = (userOptions.dataType||'').toLowerCase();
      return {
        send: function(headers, complete){
          xdr = new XDomainRequest();
          if (/^\d+$/.test(userOptions.timeout)) {
            xdr.timeout = userOptions.timeout;
          }
          xdr.ontimeout = function(){
            complete(500, 'timeout');
          };
          xdr.onload = function(){
            var allResponseHeaders = 'Content-Length: ' + xdr.responseText.length + '\r\nContent-Type: ' + xdr.contentType;
            var status = {
              code: 200,
              message: 'success'
            };
            var responses = {
              text: xdr.responseText
            };
            try {
              if (userType === 'html' || htmlRegEx.test(xdr.contentType)) {
                responses.html = xdr.responseText;
              } else if (userType === 'json' || (userType !== 'text' && jsonRegEx.test(xdr.contentType))) {
                try {
                  responses.json = jQuery.parseJSON(xdr.responseText);
                } catch(e) {
                  status.code = 500;
                  status.message = 'parseerror';
                  //throw 'Invalid JSON: ' + xdr.responseText;
                }
              } else if (userType === 'xml' || (userType !== 'text' && xmlRegEx.test(xdr.contentType))) {
                var doc = new ActiveXObject('Microsoft.XMLDOM');
                doc.async = false;
                try {
                  doc.loadXML(xdr.responseText);
                } catch(e) {
                  doc = undefined;
                }
                if (!doc || !doc.documentElement || doc.getElementsByTagName('parsererror').length) {
                  status.code = 500;
                  status.message = 'parseerror';
                  throw 'Invalid XML: ' + xdr.responseText;
                }
                responses.xml = doc;
              }
            } catch(parseMessage) {
              throw parseMessage;
            } finally {
              complete(status.code, status.message, responses, allResponseHeaders);
            }
          };
          // set an empty handler for 'onprogress' so requests don't get aborted
          xdr.onprogress = function(){};
          xdr.onerror = function(){
            complete(500, 'error', {
              text: xdr.responseText
            });
          };
          var postData = '';
          if (userOptions.data) {
            postData = (jQuery.type(userOptions.data) === 'string') ? userOptions.data : jQuery.param(userOptions.data);
          }
          xdr.open(options.type, options.url);
          xdr.send(postData);
        },
        abort: function(){
          if (xdr) {
            xdr.abort();
          }
        }
      };
    }
  });
}
/* Scripts/msgPack.js */
/*!{id:msgpack.js,ver:1.05,license:"MIT",author:"uupaa.js@gmail.com"}*/

// === msgpack ===
// MessagePack -> http://msgpack.sourceforge.net/

this.msgpack || (function (globalScope) {

    globalScope.msgpack = {
        pack: msgpackpack,    // msgpack.pack(data:Mix,
        //              toString:Boolean = false):ByteArray/ByteString/false
        //  [1][mix to String]    msgpack.pack({}, true) -> "..."
        //  [2][mix to ByteArray] msgpack.pack({})       -> [...]
        unpack: msgpackunpack,  // msgpack.unpack(data:BinaryString/ByteArray):Mix
        //  [1][String to mix]    msgpack.unpack("...") -> {}
        //  [2][ByteArray to mix] msgpack.unpack([...]) -> {}
        worker: "msgpack.js",   // msgpack.worker - WebWorkers script filename
        upload: msgpackupload,  // msgpack.upload(url:String, option:Hash, callback:Function)
        download: msgpackdownload // msgpack.download(url:String, option:Hash, callback:Function)
    };

    var _ie = /MSIE/.test(navigator.userAgent),
        _bin2num = {}, // BinaryStringToNumber   { "\00": 0, ... "\ff": 255 }
        _num2bin = {}, // NumberToBinaryString   { 0: "\00", ... 255: "\ff" }
        _num2b64 = ("ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                       "abcdefghijklmnopqrstuvwxyz0123456789+/").split(""),
        _buf = [], // decode buffer
        _idx = 0,  // decode buffer[index]
        _error = 0,  // msgpack.pack() error code. 1 = CYCLIC_REFERENCE_ERROR
        _isArray = Array.isArray || (function (mix) {
            return Object.prototype.toString.call(mix) === "[object Array]";
        }),
        _toString = String.fromCharCode, // CharCode/ByteArray to String
        _MAX_DEPTH = 512;

    // for WebWorkers Code Block
    self.importScripts && (onmessage = function (event) {
        if (event.data.method === "pack") {
            postMessage(base64encode(msgpackpack(event.data.data)));
        } else {
            postMessage(msgpackunpack(event.data.data));
        }
    });

    // msgpack.pack
    function msgpackpack(data,       // @param Mix:
                         settings) { // @param Boolean(= false):
        // @return ByteArray/BinaryString/false:
        //     false is error return
        //  [1][mix to String]    msgpack.pack({}, true) -> "..."
        //  [2][mix to ByteArray] msgpack.pack({})       -> [...]
        var toString = false;
        _error = 0;
        if (!settings) {
            settings = {byteProperties:[]};
        }
        var byteArray = encode([], data, 0,settings);

        return _error ? false
                      : toString ? byteArrayToByteString(byteArray)
                                 : byteArray;
    }

    // msgpack.unpack
    function msgpackunpack(data,settings) { // @param BinaryString/ByteArray:
        // @return Mix/undefined:
        //       undefined is error return
        //  [1][String to mix]    msgpack.unpack("...") -> {}
        //  [2][ByteArray to mix] msgpack.unpack([...]) -> {}
        if (!settings) {
            settings = { byteProperties: [] };
        }
        _buf = typeof data === "string" ? toByteArray(data) : data;
        _idx = -1;
        return decode(settings); // mix or undefined
    }

    // inner - encoder
    function encode(rv,      // @param ByteArray: result
                    mix,     // @param Mix: source data
                    depth,  // @param Number: depth
                    settings,  
                    bytesArray
                    ) { 
        var size, i, iz, c, pos,        // for UTF8.encode, Array.encode, Hash.encode
            high, low, sign, exp, frac; // for IEEE754

        if (mix == null) { // null or undefined -> 0xc0 ( null )
            rv.push(0xc0);
        } else if (mix === false) { // false -> 0xc2 ( false )
            rv.push(0xc2);
        } else if (mix === true) {  // true  -> 0xc3 ( true  )
            rv.push(0xc3);
        } else {
            switch (typeof mix) {
                case "number":
                    if (mix !== mix) { // isNaN
                        rv.push(0xcb, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff); // quiet NaN
                    } else if (mix === Infinity) {
                        rv.push(0xcb, 0x7f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00); // positive infinity
                    } else if (Math.floor(mix) === mix) { // int or uint
                        if (mix < 0) {
                            // int
                            if (mix >= -32) { // negative fixnum
                                rv.push(0xe0 + mix + 32);
                            } else if (mix > -0x80) {
                                rv.push(0xd0, mix + 0x100);
                            } else if (mix > -0x8000) {
                                mix += 0x10000;
                                rv.push(0xd1, mix >> 8, mix & 0xff);
                            } else if (mix > -0x80000000) {
                                mix += 0x100000000;
                                rv.push(0xd2, mix >>> 24, (mix >> 16) & 0xff,
                                                          (mix >> 8) & 0xff, mix & 0xff);
                            } else {
                                high = Math.floor(mix / 0x100000000);
                                low = mix & 0xffffffff;
                                rv.push(0xd3, (high >> 24) & 0xff, (high >> 16) & 0xff,
                                              (high >> 8) & 0xff, high & 0xff,
                                              (low >> 24) & 0xff, (low >> 16) & 0xff,
                                              (low >> 8) & 0xff, low & 0xff);
                            }
                        } else {
                            // uint
                            if (mix < 0x80) {
                                rv.push(mix); // positive fixnum
                            } else if (mix < 0x100) { // uint 8
                                rv.push(0xcc, mix);
                            } else if (mix < 0x10000) { // uint 16
                                rv.push(0xcd, mix >> 8, mix & 0xff);
                            } else if (mix < 0x100000000) { // uint 32
                                rv.push(0xce, mix >>> 24, (mix >> 16) & 0xff,
                                                          (mix >> 8) & 0xff, mix & 0xff);
                            } else {
                                high = Math.floor(mix / 0x100000000);
                                low = mix & 0xffffffff;
                                rv.push(0xcf, (high >> 24) & 0xff, (high >> 16) & 0xff,
                                              (high >> 8) & 0xff, high & 0xff,
                                              (low >> 24) & 0xff, (low >> 16) & 0xff,
                                              (low >> 8) & 0xff, low & 0xff);
                            }
                        }
                    } else { // double
                        // THX!! @edvakf
                        // http://javascript.g.hatena.ne.jp/edvakf/20101128/1291000731
                        sign = mix < 0;
                        sign && (mix *= -1);

                        // add offset 1023 to ensure positive
                        // 0.6931471805599453 = Math.LN2;
                        exp = ((Math.log(mix) / 0.6931471805599453) + 1023) | 0;

                        // shift 52 - (exp - 1023) bits to make integer part exactly 53 bits,
                        // then throw away trash less than decimal point
                        frac = mix * Math.pow(2, 52 + 1023 - exp);

                        //  S+-Exp(11)--++-----------------Fraction(52bits)-----------------------+
                        //  ||          ||                                                        |
                        //  v+----------++--------------------------------------------------------+
                        //  00000000|00000000|00000000|00000000|00000000|00000000|00000000|00000000
                        //  6      5    55  4        4        3        2        1        8        0
                        //  3      6    21  8        0        2        4        6
                        //
                        //  +----------high(32bits)-----------+ +----------low(32bits)------------+
                        //  |                                 | |                                 |
                        //  +---------------------------------+ +---------------------------------+
                        //  3      2    21  1        8        0
                        //  1      4    09  6
                        low = frac & 0xffffffff;
                        sign && (exp |= 0x800);
                        high = ((frac / 0x100000000) & 0xfffff) | (exp << 20);

                        rv.push(0xcb, (high >> 24) & 0xff, (high >> 16) & 0xff,
                                      (high >> 8) & 0xff, high & 0xff,
                                      (low >> 24) & 0xff, (low >> 16) & 0xff,
                                      (low >> 8) & 0xff, low & 0xff);
                    }
                    break;
                case "string":
                    // http://d.hatena.ne.jp/uupaa/20101128
                    iz = mix.length;
                    pos = rv.length; // keep rewrite position

                    rv.push(0); // placeholder

                    // utf8.encode
                    for (i = 0; i < iz; ++i) {
                        c = mix.charCodeAt(i);
                        if (c < 0x80) { // ASCII(0x00 ~ 0x7f)
                            rv.push(c & 0x7f);
                        } else if (c < 0x0800) {
                            rv.push(((c >>> 6) & 0x1f) | 0xc0, (c & 0x3f) | 0x80);
                        } else if (c < 0x10000) {
                            rv.push(((c >>> 12) & 0x0f) | 0xe0,
                                    ((c >>> 6) & 0x3f) | 0x80, (c & 0x3f) | 0x80);
                        }
                    }
                    size = rv.length - pos - 1;

                    if (size < 32) {
                        rv[pos] = 0xa0 + size; // rewrite
                    } else if (size < 0x10000) { // 16
                        rv.splice(pos, 1, 0xda, size >> 8, size & 0xff);
                    } else if (size < 0x100000000) { // 32
                        rv.splice(pos, 1, 0xdb,
                                  size >>> 24, (size >> 16) & 0xff,
                                               (size >> 8) & 0xff, size & 0xff);
                    }
                    break;
                default: // array or hash
                    if (++depth >= _MAX_DEPTH) {
                        _error = 1; // CYCLIC_REFERENCE_ERROR
                        return rv = []; // clear
                    }
                    if (_isArray(mix)) {
                        if (bytesArray) {
                            size = mix.length;
                            if (size < 32) {
                                rv.push(0xa0 + size);
                            } else if (size < 0x10000) { // 16
                                rv.push(0xda, size >> 8, size & 0xff);
                            } else if (size < 0x100000000) { // 32
                                rv.push(0xdb, size >>> 24, (size >> 16) & 0xff,
                                                           (size >> 8) & 0xff, size & 0xff);
                            }
                            for (i = 0; i < size; ++i) {
                                rv.push(mix[i]);
                            }
                        }
                        else {
                            size = mix.length;
                            if (size < 16) {
                                rv.push(0x90 + size);
                            } else if (size < 0x10000) { // 16
                                rv.push(0xdc, size >> 8, size & 0xff);
                            } else if (size < 0x100000000) { // 32
                                rv.push(0xdd, size >>> 24, (size >> 16) & 0xff,
                                                           (size >> 8) & 0xff, size & 0xff);
                            }
                            for (i = 0; i < size; ++i) {
                                encode(rv, mix[i], depth,settings);
                            }
                        }
                    } else { // hash
                        // http://d.hatena.ne.jp/uupaa/20101129
                        pos = rv.length; // keep rewrite position
                        rv.push(0); // placeholder
                        size = 0;
                        for (i in mix) {
                            ++size;
                            encode(rv, i, depth);
                            if ($.inArray(i,settings.byteProperties)!=-1) {
                                encode(rv, mix[i], depth,settings,true);
                            }
                            else {
                                encode(rv, mix[i], depth, settings,false);
                            }
                        }
                        if (size < 16) {
                            rv[pos] = 0x80 + size; // rewrite
                        } else if (size < 0x10000) { // 16
                            rv.splice(pos, 1, 0xde, size >> 8, size & 0xff);
                        } else if (size < 0x100000000) { // 32
                            rv.splice(pos, 1, 0xdf,
                                      size >>> 24, (size >> 16) & 0xff,
                                                   (size >> 8) & 0xff, size & 0xff);
                        }
                    }
            }
        }
        return rv;
    }

    // inner - decoder
    function decode(settings,rawAsArray) { // @return Mix:
        var size, i, iz, c, num = 0,
            sign, exp, frac, ary, hash,
            buf = _buf, type = buf[++_idx],key;

        if (type >= 0xe0) {             // Negative FixNum (111x xxxx) (-32 ~ -1)
            return type - 0x100;
        }
        if (type < 0xc0) {
            if (type < 0x80) {          // Positive FixNum (0xxx xxxx) (0 ~ 127)
                return type;
            }
            if (type < 0x90) {          // FixMap (1000 xxxx)
                num = type - 0x80;
                type = 0x80;
            } else if (type < 0xa0) {   // FixArray (1001 xxxx)
                num = type - 0x90;
                type = 0x90;
            } else { // if (type < 0xc0) {   // FixRaw (101x xxxx)
                num = type - 0xa0;
                type = 0xa0;
            }
        }
        switch (type) {
            case 0xc0: return null;
            case 0xc2: return false;
            case 0xc3: return true;
            case 0xca:  // float
                num = buf[++_idx] * 0x1000000 + (buf[++_idx] << 16) +
                                                (buf[++_idx] << 8) + buf[++_idx];
                sign = num & 0x80000000;    //  1bit
                exp = (num >> 23) & 0xff;   //  8bits
                frac = num & 0x7fffff;      // 23bits
                if (!num || num === 0x80000000) { // 0.0 or -0.0
                    return 0;
                }
                if (exp === 0xff) { // NaN or Infinity
                    return frac ? NaN : Infinity;
                }
                return (sign ? -1 : 1) *
                            (frac | 0x800000) * Math.pow(2, exp - 127 - 23); // 127: bias
            case 0xcb:  // double
                num = buf[++_idx] * 0x1000000 + (buf[++_idx] << 16) +
                                                (buf[++_idx] << 8) + buf[++_idx];
                sign = num & 0x80000000;    //  1bit
                exp = (num >> 20) & 0x7ff;  // 11bits
                frac = num & 0xfffff;       // 52bits - 32bits (high word)
                if (!num || num === 0x80000000) { // 0.0 or -0.0
                    _idx += 4;
                    return 0;
                }
                if (exp === 0x7ff) { // NaN or Infinity
                    _idx += 4;
                    return frac ? NaN : Infinity;
                }
                num = buf[++_idx] * 0x1000000 + (buf[++_idx] << 16) +
                                                (buf[++_idx] << 8) + buf[++_idx];
                return (sign ? -1 : 1) *
                            ((frac | 0x100000) * Math.pow(2, exp - 1023 - 20) // 1023: bias
                             + num * Math.pow(2, exp - 1023 - 52));
                // 0xcf: uint64, 0xce: uint32, 0xcd: uint16
            case 0xcf: num = buf[++_idx] * 0x1000000 + (buf[++_idx] << 16) +
                                                         (buf[++_idx] << 8) + buf[++_idx];
                return num * 0x100000000 +
                       buf[++_idx] * 0x1000000 + (buf[++_idx] << 16) +
                                                 (buf[++_idx] << 8) + buf[++_idx];
            case 0xce: num += buf[++_idx] * 0x1000000 + (buf[++_idx] << 16);
            case 0xcd: num += buf[++_idx] << 8;
            case 0xcc: return num + buf[++_idx];
                // 0xd3: int64, 0xd2: int32, 0xd1: int16, 0xd0: int8
            case 0xd3: num = buf[++_idx];
                if (num & 0x80) { // sign -> avoid overflow
                    return ((num ^ 0xff) * 0x100000000000000 +
                            (buf[++_idx] ^ 0xff) * 0x1000000000000 +
                            (buf[++_idx] ^ 0xff) * 0x10000000000 +
                            (buf[++_idx] ^ 0xff) * 0x100000000 +
                            (buf[++_idx] ^ 0xff) * 0x1000000 +
                            (buf[++_idx] ^ 0xff) * 0x10000 +
                            (buf[++_idx] ^ 0xff) * 0x100 +
                            (buf[++_idx] ^ 0xff) + 1) * -1;
                }
                return num * 0x100000000000000 +
                       buf[++_idx] * 0x1000000000000 +
                       buf[++_idx] * 0x10000000000 +
                       buf[++_idx] * 0x100000000 +
                       buf[++_idx] * 0x1000000 +
                       buf[++_idx] * 0x10000 +
                       buf[++_idx] * 0x100 +
                       buf[++_idx];
            case 0xd2: num = buf[++_idx] * 0x1000000 + (buf[++_idx] << 16) +
                               (buf[++_idx] << 8) + buf[++_idx];
                return num < 0x80000000 ? num : num - 0x100000000; // 0x80000000 * 2
            case 0xd1: num = (buf[++_idx] << 8) + buf[++_idx];
                return num < 0x8000 ? num : num - 0x10000; // 0x8000 * 2
            case 0xd0: num = buf[++_idx];
                return num < 0x80 ? num : num - 0x100; // 0x80 * 2
                // 0xdb: raw32, 0xda: raw16, 0xa0: raw ( string ) (or <byte>Array if rawAsArray == true)
            case 0xdb: num += buf[++_idx] * 0x1000000 + (buf[++_idx] << 16);
            case 0xda: num += (buf[++_idx] << 8) + buf[++_idx];
            case 0xa0:  
                if (rawAsArray) {
                    for (ary = [], i = _idx, iz = i + num; i < iz;) {
                        ary.push(buf[++i]);
                    }
                    _idx = i;
                    return ary;
                }
                else {// utf8.decode

                    for (ary = [], i = _idx, iz = i + num; i < iz;) {
                        c = buf[++i]; // lead byte
                        ary.push(c < 0x80 ? c : // ASCII(0x00 ~ 0x7f)
                                 c < 0xe0 ? ((c & 0x1f) << 6 | (buf[++i] & 0x3f)) :
                                            ((c & 0x0f) << 12 | (buf[++i] & 0x3f) << 6
                                                              | (buf[++i] & 0x3f)));
                    }
                    _idx = i;
                    return ary.length < 10240 ? _toString.apply(null, ary)
                                              : byteArrayToByteString(ary);
                }
                // 0xdf: map32, 0xde: map16, 0x80: map
            case 0xdf: num += buf[++_idx] * 0x1000000 + (buf[++_idx] << 16);
            case 0xde: num += (buf[++_idx] << 8) + buf[++_idx];
            case 0x80: hash = {};
                while (num--) {
                    // make key/value pair
                    size = buf[++_idx] - 0xa0;

                    for (ary = [], i = _idx, iz = i + size; i < iz;) {
                        c = buf[++i]; // lead byte
                        ary.push(c < 0x80 ? c : // ASCII(0x00 ~ 0x7f)
                                 c < 0xe0 ? ((c & 0x1f) << 6 | (buf[++i] & 0x3f)) :
                                            ((c & 0x0f) << 12 | (buf[++i] & 0x3f) << 6
                                                              | (buf[++i] & 0x3f)));
                    }
                    _idx = i;
                    key = _toString.apply(null, ary)
                    if ($.inArray(key, settings.byteProperties) != -1) {
                        hash[key] = decode(settings,true);
                    }
                    else {

                        hash[key] = decode(settings);
                    }
                }
                return hash;
                // 0xdd: array32, 0xdc: array16, 0x90: array
            case 0xdd: num += buf[++_idx] * 0x1000000 + (buf[++_idx] << 16);
            case 0xdc: num += (buf[++_idx] << 8) + buf[++_idx];
            case 0x90: ary = [];
                while (num--) {
                    ary.push(decode(settings,rawAsArray));
                }
                return ary;
        }
        return;
    }

    // inner - byteArray To ByteString
    function byteArrayToByteString(byteArray) { // @param ByteArray
        // @return String
        // http://d.hatena.ne.jp/uupaa/20101128
        try {
            return _toString.apply(this, byteArray); // toString
        } catch (err) {
            ; // avoid "Maximum call stack size exceeded"
        }
        var rv = [], i = 0, iz = byteArray.length, num2bin = _num2bin;

        for (; i < iz; ++i) {
            rv[i] = num2bin[byteArray[i]];
        }
        return rv.join("");
    }

    // msgpack.download - load from server
    function msgpackdownload(url,        // @param String:
                             option,     // @param Hash: { worker, timeout, before, after }
                                         //    option.worker - Boolean(= false): true is use WebWorkers
                                         //    option.timeout - Number(= 10): timeout sec
                                         //    option.before  - Function: before(xhr, option)
                                         //    option.after   - Function: after(xhr, option, { status, ok })
                             callback) { // @param Function: callback(data, option, { status, ok })
        //    data   - Mix/null:
        //    option - Hash:
        //    status - Number: HTTP status code
        //    ok     - Boolean:
        option.method = "GET";
        option.binary = true;
        ajax(url, option, callback);
    }

    // msgpack.upload - save to server
    function msgpackupload(url,        // @param String:
                           option,     // @param Hash: { data, worker, timeout, before, after }
                                       //    option.data - Mix:
                                       //    option.worker - Boolean(= false): true is use WebWorkers
                                       //    option.timeout - Number(= 10): timeout sec
                                       //    option.before  - Function: before(xhr, option)
                                       //    option.after   - Function: after(xhr, option, { status, ok })
                           callback) { // @param Function: callback(data, option, { status, ok })
        //    data   - String: responseText
        //    option - Hash:
        //    status - Number: HTTP status code
        //    ok     - Boolean:
        option.method = "PUT";
        option.binary = true;

        if (option.worker && globalScope.Worker) {
            var worker = new Worker(msgpack.worker);

            worker.onmessage = function (event) {
                option.data = event.data;
                ajax(url, option, callback);
            };
            worker.postMessage({ method: "pack", data: option.data });
        } else {
            // pack and base64 encode
            option.data = base64encode(msgpackpack(option.data));
            ajax(url, option, callback);
        }
    }

    // inner -
    function ajax(url,        // @param String:
                  option,     // @param Hash: { data, ifmod, method, timeout,
                              //                header, binary, before, after, worker }
                              //    option.data    - Mix: upload data
                              //    option.ifmod   - Boolean: true is "If-Modified-Since" header
                              //    option.method  - String: "GET", "POST", "PUT"
                              //    option.timeout - Number(= 10): timeout sec
                              //    option.header  - Hash(= {}): { key: "value", ... }
                              //    option.binary  - Boolean(= false): true is binary data
                              //    option.before  - Function: before(xhr, option)
                              //    option.after   - Function: after(xhr, option, { status, ok })
                              //    option.worker  - Boolean(= false): true is use WebWorkers
                  callback) { // @param Function: callback(data, option, { status, ok })
        //    data   - String/Mix/null:
        //    option - Hash:
        //    status - Number: HTTP status code
        //    ok     - Boolean:
        function readyStateChange() {
            if (xhr.readyState === 4) {
                var data, status = xhr.status, worker, byteArray,
                    rv = { status: status, ok: status >= 200 && status < 300 };

                if (!run++) {
                    if (method === "PUT") {
                        data = rv.ok ? xhr.responseText : "";
                    } else {
                        if (rv.ok) {
                            if (option.worker && globalScope.Worker) {
                                worker = new Worker(msgpack.worker);
                                worker.onmessage = function (event) {
                                    callback(event.data, option, rv);
                                };
                                worker.postMessage({
                                    method: "unpack",
                                    data: xhr.responseText
                                });
                                gc();
                                return;
                            } else {
                                byteArray = _ie ? toByteArrayIE(xhr)
                                                : toByteArray(xhr.responseText);
                                data = msgpackunpack(byteArray);
                            }
                        }
                    }
                    after && after(xhr, option, rv);
                    callback(data, option, rv);
                    gc();
                }
            }
        }

        function ng(abort, status) {
            if (!run++) {
                var rv = { status: status || 400, ok: false };

                after && after(xhr, option, rv);
                callback(null, option, rv);
                gc(abort);
            }
        }

        function gc(abort) {
            abort && xhr && xhr.abort && xhr.abort();
            watchdog && (clearTimeout(watchdog), watchdog = 0);
            xhr = null;
            globalScope.addEventListener &&
                globalScope.removeEventListener("beforeunload", ng, false);
        }

        var watchdog = 0,
            method = option.method || "GET",
            header = option.header || {},
            before = option.before,
            after = option.after,
            data = option.data || null,
            xhr = globalScope.XMLHttpRequest ? new XMLHttpRequest() :
                  globalScope.ActiveXObject ? new ActiveXObject("Microsoft.XMLHTTP") :
                  null,
            run = 0, i,
            overrideMimeType = "overrideMimeType",
            setRequestHeader = "setRequestHeader",
            getbinary = method === "GET" && option.binary;

        try {
            xhr.onreadystatechange = readyStateChange;
            xhr.open(method, url, true); // ASync

            before && before(xhr, option);

            getbinary && xhr[overrideMimeType] &&
                xhr[overrideMimeType]("text/plain; charset=x-user-defined");
            data &&
                xhr[setRequestHeader]("Content-Type",
                                      "application/x-www-form-urlencoded");

            for (i in header) {
                xhr[setRequestHeader](i, header[i]);
            }

            globalScope.addEventListener &&
                globalScope.addEventListener("beforeunload", ng, false); // 400: Bad Request

            xhr.send(data);
            watchdog = setTimeout(function () {
                ng(1, 408); // 408: Request Time-out
            }, (option.timeout || 10) * 1000);
        } catch (err) {
            ng(0, 400); // 400: Bad Request
        }
    }

    // inner - BinaryString To ByteArray
    function toByteArray(data) { // @param BinaryString: "\00\01"
        // @return ByteArray: [0x00, 0x01]
        var rv = [], bin2num = _bin2num, remain,
            ary = data.split(""),
            i = -1, iz;

        iz = ary.length;
        remain = iz % 8;

        while (remain--) {
            ++i;
            rv[i] = bin2num[ary[i]];
        }
        remain = iz >> 3;
        while (remain--) {
            rv.push(bin2num[ary[++i]], bin2num[ary[++i]],
                    bin2num[ary[++i]], bin2num[ary[++i]],
                    bin2num[ary[++i]], bin2num[ary[++i]],
                    bin2num[ary[++i]], bin2num[ary[++i]]);
        }
        return rv;
    }

    // inner - BinaryString to ByteArray
    function toByteArrayIE(xhr) {
        var rv = [], data, remain,
            charCodeAt = "charCodeAt",
            loop, v0, v1, v2, v3, v4, v5, v6, v7,
            i = -1, iz;

        iz = vblen(xhr);
        data = vbstr(xhr);
        loop = Math.ceil(iz / 2);
        remain = loop % 8;

        while (remain--) {
            v0 = data[charCodeAt](++i); // 0x00,0x01 -> 0x0100
            rv.push(v0 & 0xff, v0 >> 8);
        }
        remain = loop >> 3;
        while (remain--) {
            v0 = data[charCodeAt](++i);
            v1 = data[charCodeAt](++i);
            v2 = data[charCodeAt](++i);
            v3 = data[charCodeAt](++i);
            v4 = data[charCodeAt](++i);
            v5 = data[charCodeAt](++i);
            v6 = data[charCodeAt](++i);
            v7 = data[charCodeAt](++i);
            rv.push(v0 & 0xff, v0 >> 8, v1 & 0xff, v1 >> 8,
                    v2 & 0xff, v2 >> 8, v3 & 0xff, v3 >> 8,
                    v4 & 0xff, v4 >> 8, v5 & 0xff, v5 >> 8,
                    v6 & 0xff, v6 >> 8, v7 & 0xff, v7 >> 8);
        }
        iz % 2 && rv.pop();

        return rv;
    }

    // inner - base64.encode
    function base64encode(data) { // @param ByteArray:
        // @return Base64String:
        var rv = [],
            c = 0, i = -1, iz = data.length,
            pad = [0, 2, 1][data.length % 3],
            num2bin = _num2bin,
            num2b64 = _num2b64;

        if (globalScope.btoa) {
            while (i < iz) {
                rv.push(num2bin[data[++i]]);
            }
            return btoa(rv.join(""));
        }
        --iz;
        while (i < iz) {
            c = (data[++i] << 16) | (data[++i] << 8) | (data[++i]); // 24bit
            rv.push(num2b64[(c >> 18) & 0x3f],
                    num2b64[(c >> 12) & 0x3f],
                    num2b64[(c >> 6) & 0x3f],
                    num2b64[c & 0x3f]);
        }
        pad > 1 && (rv[rv.length - 2] = "=");
        pad > 0 && (rv[rv.length - 1] = "=");
        return rv.join("");
    }

    // --- init ---
    (function () {
        var i = 0, v;

        for (; i < 0x100; ++i) {
            v = _toString(i);
            _bin2num[v] = i; // "\00" -> 0x00
            _num2bin[i] = v; //     0 -> "\00"
        }
        // http://twitter.com/edvakf/statuses/15576483807
        for (i = 0x80; i < 0x100; ++i) { // [Webkit][Gecko]
            _bin2num[_toString(0xf700 + i)] = i; // "\f780" -> 0x80
        }
    })();

    _ie && document.write('<script type="text/vbscript">\
Function vblen(b)vblen=LenB(b.responseBody)End Function\n\
Function vbstr(b)vbstr=CStr(b.responseBody)+chr(0)End Function</'+ 'script>');

})(this);

/* swfobject.js */
/*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
*/
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O.ActiveXObject!=D){try{var ad=new ActiveXObject(W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?"ActiveX":"PlugIn",ac="MMredirectURL="+O.location.toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();
/* web_socket.js */
// Copyright: Hiroshi Ichikawa <http://gimite.net/en/>
// License: New BSD License
// Reference: http://dev.w3.org/html5/websockets/
// Reference: http://tools.ietf.org/html/rfc6455

(function () {
    WEB_SOCKET_SWF_LOCATION = "http://stormancer.blob.core.windows.net/libs/js/WebSocketMainInsecure.swf";

    window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = true;
    //window.WEB_SOCKET_FORCE_FLASH = true;

    if (window.WEB_SOCKET_FORCE_FLASH) {
        // Keeps going.
    } else if (window.WebSocket) {
        return;
    } else if (window.MozWebSocket) {
        // Firefox.
        window.WebSocket = MozWebSocket;
        return;
    }

    var logger;
    if (window.WEB_SOCKET_LOGGER) {
        logger = WEB_SOCKET_LOGGER;
    } else if (window.console && window.console.log && window.console.error) {
        // In some environment, console is defined but console.log or console.error is missing.
        logger = window.console;
    } else {
        logger = { log: function () { }, error: function () { } };
    }

    // swfobject.hasFlashPlayerVersion("10.0.0") doesn't work with Gnash.
    if (swfobject.getFlashPlayerVersion().major < 10) {
        logger.error("Flash Player >= 10.0.0 is required.");
        return;
    }
    if (location.protocol == "file:") {
        logger.error(
          "WARNING: web-socket-js doesn't work in file:///... URL " +
          "unless you set Flash Security Settings properly. " +
          "Open the page via Web server i.e. http://...");
    }

    /**
     * Our own implementation of WebSocket class using Flash.
     * @param {string} url
     * @param {array or string} protocols
     * @param {string} proxyHost
     * @param {int} proxyPort
     * @param {string} headers
     */
    window.WebSocket = function (url, protocols, proxyHost, proxyPort, headers) {
        var self = this;
        self.__id = WebSocket.__nextId++;
        WebSocket.__instances[self.__id] = self;
        self.readyState = WebSocket.CONNECTING;
        self.bufferedAmount = 0;
        self.__events = {};
        if (!protocols) {
            protocols = [];
        } else if (typeof protocols == "string") {
            protocols = [protocols];
        }
        // Uses setTimeout() to make sure __createFlash() runs after the caller sets ws.onopen etc.
        // Otherwise, when onopen fires immediately, onopen is called before it is set.
        self.__createTask = setTimeout(function () {
            WebSocket.__addTask(function () {
                self.__createTask = null;
                WebSocket.__flash.create(
                    self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null);
            });
        }, 0);

        WebSocket.__initialize();
    };

    /**
     * Send data to the web socket.
     * @param {string} data  The data to send to the socket.
     * @return {boolean}  True for success, false for failure.
     */
    WebSocket.prototype.send = function (data) {
        if (this.readyState == WebSocket.CONNECTING) {
            throw "INVALID_STATE_ERR: Web Socket connection has not been established";
        }
        // We use encodeURIComponent() here, because FABridge doesn't work if
        // the argument includes some characters. We don't use escape() here
        // because of this:
        // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Functions#escape_and_unescape_Functions
        // But it looks decodeURIComponent(encodeURIComponent(s)) doesn't
        // preserve all Unicode characters either e.g. "\uffff" in Firefox.
        // Note by wtritch: Hopefully this will not be necessary using ExternalInterface.  Will require
        // additional testing.
        var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
        if (result < 0) { // success
            return true;
        } else {
            this.bufferedAmount += result;
            return false;
        }
    };

    /**
     * Close this web socket gracefully.
     */
    WebSocket.prototype.close = function () {
        if (this.__createTask) {
            clearTimeout(this.__createTask);
            this.__createTask = null;
            this.readyState = WebSocket.CLOSED;
            return;
        }
        if (this.readyState == WebSocket.CLOSED || this.readyState == WebSocket.CLOSING) {
            return;
        }
        this.readyState = WebSocket.CLOSING;
        WebSocket.__flash.close(this.__id);
    };

    /**
     * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
     *
     * @param {string} type
     * @param {function} listener
     * @param {boolean} useCapture
     * @return void
     */
    WebSocket.prototype.addEventListener = function (type, listener, useCapture) {
        if (!(type in this.__events)) {
            this.__events[type] = [];
        }
        this.__events[type].push(listener);
    };

    /**
     * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
     *
     * @param {string} type
     * @param {function} listener
     * @param {boolean} useCapture
     * @return void
     */
    WebSocket.prototype.removeEventListener = function (type, listener, useCapture) {
        if (!(type in this.__events)) return;
        var events = this.__events[type];
        for (var i = events.length - 1; i >= 0; --i) {
            if (events[i] === listener) {
                events.splice(i, 1);
                break;
            }
        }
    };

    /**
     * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
     *
     * @param {Event} event
     * @return void
     */
    WebSocket.prototype.dispatchEvent = function (event) {
        var events = this.__events[event.type] || [];
        for (var i = 0; i < events.length; ++i) {
            events[i](event);
        }
        var handler = this["on" + event.type];
        if (handler) handler.apply(this, [event]);
    };

    /**
     * Handles an event from Flash.
     * @param {Object} flashEvent
     */
    WebSocket.prototype.__handleEvent = function (flashEvent) {

        if ("readyState" in flashEvent) {
            this.readyState = flashEvent.readyState;
        }
        if ("protocol" in flashEvent) {
            this.protocol = flashEvent.protocol;
        }

        var jsEvent;
        if (flashEvent.type == "open" || flashEvent.type == "error") {
            jsEvent = this.__createSimpleEvent(flashEvent.type);
        } else if (flashEvent.type == "close") {
            jsEvent = this.__createSimpleEvent("close");
            jsEvent.wasClean = flashEvent.wasClean ? true : false;
            jsEvent.code = flashEvent.code;
            jsEvent.reason = flashEvent.reason;
        } else if (flashEvent.type == "message") {
            var data = decodeURIComponent(flashEvent.message);
            jsEvent = this.__createMessageEvent("message", data);
        } else {
            throw "unknown event type: " + flashEvent.type;
        }

        this.dispatchEvent(jsEvent);

    };

    WebSocket.prototype.__createSimpleEvent = function (type) {
        if (document.createEvent && window.Event) {
            var event = document.createEvent("Event");
            event.initEvent(type, false, false);
            return event;
        } else {
            return { type: type, bubbles: false, cancelable: false };
        }
    };

    WebSocket.prototype.__createMessageEvent = function (type, data) {
        if (document.createEvent && window.MessageEvent && !window.opera) {
            var event = document.createEvent("MessageEvent");
            event.initMessageEvent("message", false, false, data, null, null, window, null);
            return event;
        } else {
            // IE and Opera, the latter one truncates the data parameter after any 0x00 bytes.
            return { type: type, data: data, bubbles: false, cancelable: false };
        }
    };

    /**
     * Define the WebSocket readyState enumeration.
     */
    WebSocket.CONNECTING = 0;
    WebSocket.OPEN = 1;
    WebSocket.CLOSING = 2;
    WebSocket.CLOSED = 3;

    // Field to check implementation of WebSocket.
    WebSocket.__isFlashImplementation = true;
    WebSocket.__initialized = false;
    WebSocket.__flash = null;
    WebSocket.__instances = {};
    WebSocket.__tasks = [];
    WebSocket.__nextId = 0;

    /**
     * Load a new flash security policy file.
     * @param {string} url
     */
    WebSocket.loadFlashPolicyFile = function (url) {
        WebSocket.__addTask(function () {
            WebSocket.__flash.loadManualPolicyFile(url);
        });
    };

    /**
     * Loads WebSocketMain.swf and creates WebSocketMain object in Flash.
     */
    WebSocket.__initialize = function () {

        if (WebSocket.__initialized) return;
        WebSocket.__initialized = true;

        if (WebSocket.__swfLocation) {
            // For backword compatibility.
            window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation;
        }
        if (!window.WEB_SOCKET_SWF_LOCATION) {
            logger.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
            return;
        }
        if (!window.WEB_SOCKET_SUPPRESS_CROSS_DOMAIN_SWF_ERROR &&
            !WEB_SOCKET_SWF_LOCATION.match(/(^|\/)WebSocketMainInsecure\.swf(\?.*)?$/) &&
            WEB_SOCKET_SWF_LOCATION.match(/^\w+:\/\/([^\/]+)/)) {
            var swfHost = RegExp.$1;
            if (location.host != swfHost) {
                logger.error(
                    "[WebSocket] You must host HTML and WebSocketMain.swf in the same host " +
                    "('" + location.host + "' != '" + swfHost + "'). " +
                    "See also 'How to host HTML file and SWF file in different domains' section " +
                    "in README.md. If you use WebSocketMainInsecure.swf, you can suppress this message " +
                    "by WEB_SOCKET_SUPPRESS_CROSS_DOMAIN_SWF_ERROR = true;");
            }
        }
        var container = document.createElement("div");
        container.id = "webSocketContainer";
        // Hides Flash box. We cannot use display: none or visibility: hidden because it prevents
        // Flash from loading at least in IE. So we move it out of the screen at (-100, -100).
        // But this even doesn't work with Flash Lite (e.g. in Droid Incredible). So with Flash
        // Lite, we put it at (0, 0). This shows 1x1 box visible at left-top corner but this is
        // the best we can do as far as we know now.
        container.style.position = "absolute";
        if (WebSocket.__isFlashLite()) {
            container.style.left = "0px";
            container.style.top = "0px";
        } else {
            container.style.left = "-100px";
            container.style.top = "-100px";
        }
        var holder = document.createElement("div");
        holder.id = "webSocketFlash";
        container.appendChild(holder);
        document.body.appendChild(container);
        // See this article for hasPriority:
        // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
        swfobject.embedSWF(
          WEB_SOCKET_SWF_LOCATION,
          "webSocketFlash",
          "1" /* width */,
          "1" /* height */,
          "10.0.0" /* SWF version */,
          null,
          null,
          { hasPriority: true, swliveconnect: true, allowScriptAccess: "always" },
          null,
          function (e) {
              if (!e.success) {
                  logger.error("[WebSocket] swfobject.embedSWF failed");
              }
          }
        );

    };

    /**
     * Called by Flash to notify JS that it's fully loaded and ready
     * for communication.
     */
    WebSocket.__onFlashInitialized = function () {
        // We need to set a timeout here to avoid round-trip calls
        // to flash during the initialization process.
        setTimeout(function () {
            WebSocket.__flash = document.getElementById("webSocketFlash");
            WebSocket.__flash.setCallerUrl(location.href);
            WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
            for (var i = 0; i < WebSocket.__tasks.length; ++i) {
                WebSocket.__tasks[i]();
            }
            WebSocket.__tasks = [];
        }, 0);
    };

    /**
     * Called by Flash to notify WebSockets events are fired.
     */
    WebSocket.__onFlashEvent = function () {
        setTimeout(function () {
            try {
                // Gets events using receiveEvents() instead of getting it from event object
                // of Flash event. This is to make sure to keep message order.
                // It seems sometimes Flash events don't arrive in the same order as they are sent.
                var events = WebSocket.__flash.receiveEvents();
                for (var i = 0; i < events.length; ++i) {
                    WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i]);
                }
            } catch (e) {
                logger.error(e);
            }
        }, 0);
        return true;
    };

    // Called by Flash.
    WebSocket.__log = function (message) {
        logger.log(decodeURIComponent(message));
    };

    // Called by Flash.
    WebSocket.__error = function (message) {
        logger.error(decodeURIComponent(message));
    };

    WebSocket.__addTask = function (task) {
        if (WebSocket.__flash) {
            task();
        } else {
            WebSocket.__tasks.push(task);
        }
    };

    /**
     * Test if the browser is running flash lite.
     * @return {boolean} True if flash lite is running, false otherwise.
     */
    WebSocket.__isFlashLite = function () {
        if (!window.navigator || !window.navigator.mimeTypes) {
            return false;
        }
        var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
        if (!mimeType || !mimeType.enabledPlugin || !mimeType.enabledPlugin.filename) {
            return false;
        }
        return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true : false;
    };

    if (!window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION) {
        // NOTE:
        //   This fires immediately if web_socket.js is dynamically loaded after
        //   the document is loaded.
        swfobject.addDomLoadEvent(function () {
            WebSocket.__initialize();
        });
    }

})();
/* jquery.signalR.js */
/* jquery.signalR.core.js */
/*global window:false */
/*!
 * ASP.NET SignalR JavaScript Library v1.0.0
 * http://signalr.net/
 *
 * Copyright Microsoft Open Technologies, Inc. All rights reserved.
 * Licensed under the Apache 2.0
 * https://github.com/SignalR/SignalR/blob/master/LICENSE.md
 *
 */

/// <reference path="Scripts/jquery-1.6.4.js" />
(function ($, window) {
    "use strict";

    if (typeof ($) !== "function") {
        // no jQuery!
        throw new Error("SignalR: jQuery not found. Please ensure jQuery is referenced before the SignalR.js file.");
    }

    if (!window.JSON) {
        // no JSON!
        throw new Error("SignalR: No JSON parser found. Please ensure json2.js is referenced before the SignalR.js file if you need to support clients without native JSON parsing support, e.g. IE<8.");
    }

    var signalR,
        _connection,
        _pageLoaded = (window.document.readyState === "complete"),
        _pageWindow = $(window),

        events = {
            onStart: "onStart",
            onStarting: "onStarting",
            onReceived: "onReceived",
            onError: "onError",
            onConnectionSlow: "onConnectionSlow",
            onReconnecting: "onReconnecting",
            onReconnect: "onReconnect",
            onStateChanged: "onStateChanged",
            onDisconnect: "onDisconnect"
        },

        log = function (msg, logging) {
            if (logging === false) {
                return;
            }
            var m;
            if (typeof (window.console) === "undefined") {
                return;
            }
            m = "[" + new Date().toTimeString() + "] SignalR: " + msg;
            if (window.console.debug) {
                window.console.debug(m);
            } else if (window.console.log) {
                window.console.log(m);
            }
        },

        changeState = function (connection, expectedState, newState) {
            if (expectedState === connection.state) {
                connection.state = newState;

                $(connection).triggerHandler(events.onStateChanged, [{ oldState: expectedState, newState: newState }]);
                return true;
            }

            return false;
        },

        isDisconnecting = function (connection) {
            return connection.state === signalR.connectionState.disconnected;
        }, 

        configureStopReconnectingTimeout = function (connection) {
            var stopReconnectingTimeout,
                onReconnectTimeout;

            // Check if this connection has already been configured to stop reconnecting after a specified timeout.
            // Without this check if a connection is stopped then started events will be bound multiple times.
            if (!connection._.configuredStopReconnectingTimeout) {
                onReconnectTimeout = function (connection) {
                    connection.log("Couldn't reconnect within the configured timeout (" + connection.disconnectTimeout + "ms), disconnecting.");
                    connection.stop(/* async */ false, /* notifyServer */ false);
                };

                connection.reconnecting(function () {
                    var connection = this;
                    stopReconnectingTimeout = window.setTimeout(function () { onReconnectTimeout(connection); }, connection.disconnectTimeout);
                });

                connection.stateChanged(function (data) {
                    if (data.oldState === signalR.connectionState.reconnecting) {
                        // Clear the pending reconnect timeout check
                        window.clearTimeout(stopReconnectingTimeout);
                    }
                });

                connection._.configuredStopReconnectingTimeout = true;
            }
        };

    signalR = function (url, qs, logging) {
        /// <summary>Creates a new SignalR connection for the given url</summary>
        /// <param name="url" type="String">The URL of the long polling endpoint</param>
        /// <param name="qs" type="Object">
        ///     [Optional] Custom querystring parameters to add to the connection URL.
        ///     If an object, every non-function member will be added to the querystring.
        ///     If a string, it's added to the QS as specified.
        /// </param>
        /// <param name="logging" type="Boolean">
        ///     [Optional] A flag indicating whether connection logging is enabled to the browser
        ///     console/log. Defaults to false.
        /// </param>

        return new signalR.fn.init(url, qs, logging);
    };

    signalR.events = events;

    signalR.changeState = changeState;

    signalR.isDisconnecting = isDisconnecting;

    signalR.connectionState = {
        connecting: 0,
        connected: 1,
        reconnecting: 2,
        disconnected: 4
    };

    signalR.hub = {
        start: function () {
            // This will get replaced with the real hub connection start method when hubs is referenced correctly
            throw new Error("SignalR: Error loading hubs. Ensure your hubs reference is correct, e.g. <script src='/signalr/hubs'></script>.");
        }
    };

    _pageWindow.load(function () { _pageLoaded = true; });

    function validateTransport(requestedTransport, connection) {
        /// <summary>Validates the requested transport by cross checking it with the pre-defined signalR.transports</summary>
        /// <param name="requestedTransport" type="Object">The designated transports that the user has specified.</param>
        /// <param name="connection" type="signalR">The connection that will be using the requested transports.  Used for logging purposes.</param>
        /// <returns type="Object" />
        if ($.isArray(requestedTransport)) {
            // Go through transport array and remove an "invalid" tranports
            for (var i = requestedTransport.length - 1; i >= 0; i--) {
                var transport = requestedTransport[i];
                if ($.type(requestedTransport) !== "object" && ($.type(transport) !== "string" || !signalR.transports[transport])) {
                    connection.log("Invalid transport: " + transport + ", removing it from the transports list.");
                    requestedTransport.splice(i, 1);
                }
            }

            // Verify we still have transports left, if we dont then we have invalid transports
            if (requestedTransport.length === 0) {
                connection.log("No transports remain within the specified transport array.");
                requestedTransport = null;
            }
        } else if ($.type(requestedTransport) !== "object" && !signalR.transports[requestedTransport] && requestedTransport !== "auto") {
            connection.log("Invalid transport: " + requestedTransport.toString());
            requestedTransport = null;
        }

        return requestedTransport;
    }

    function getDefaultPort(protocol) {
        if(protocol === "http:") {
            return 80;
        }
        else if (protocol === "https:") {
            return 443;
        }
    }

    function addDefaultPort(protocol, url) {
        // Remove ports  from url.  We have to check if there's a / or end of line
        // following the port in order to avoid removing ports such as 8080.
        if(url.match(/:\d+$/)) {
            return url;
        } else {
            return url + ":" + getDefaultPort(protocol);
        }
    }

    signalR.fn = signalR.prototype = {
        init: function (url, qs, logging) {
            this.url = url;
            this.qs = qs;
            this._ = {};
            if (typeof (logging) === "boolean") {
                this.logging = logging;
            }            
        },

        isCrossDomain: function (url, against) {
            /// <summary>Checks if url is cross domain</summary>
            /// <param name="url" type="String">The base URL</param>
            /// <param name="against" type="Object">
            ///     An optional argument to compare the URL against, if not specified it will be set to window.location.
            ///     If specified it must contain a protocol and a host property.
            /// </param>
            var link;

            url = $.trim(url);
            if (url.indexOf("http") !== 0) {
                return false;
            }

            against = against || window.location;

            // Create an anchor tag.
            link = window.document.createElement("a");
            link.href = url;

            // When checking for cross domain we have to special case port 80 because the window.location will remove the 
            return link.protocol + addDefaultPort(link.protocol, link.host) !== against.protocol + addDefaultPort(against.protocol, against.host);
        },

        ajaxDataType: "json",

        logging: false,

        state: signalR.connectionState.disconnected,

        keepAliveData: {},

        reconnectDelay: 2000,

        disconnectTimeout: 40000, // This should be set by the server in response to the negotiate request (40s default)

        keepAliveWarnAt: 2 / 3, // Warn user of slow connection if we breach the X% mark of the keep alive timeout

        start: function (options, callback) {
            /// <summary>Starts the connection</summary>
            /// <param name="options" type="Object">Options map</param>
            /// <param name="callback" type="Function">A callback function to execute when the connection has started</param>
            var connection = this,
                config = {
                    waitForPageLoad: true,
                    transport: "auto",
                    jsonp: false
                },
                initialize,
                deferred = connection._deferral || $.Deferred(), // Check to see if there is a pre-existing deferral that's being built on, if so we want to keep using it
                parser = window.document.createElement("a");

            if ($.type(options) === "function") {
                // Support calling with single callback parameter
                callback = options;
            } else if ($.type(options) === "object") {
                $.extend(config, options);
                if ($.type(config.callback) === "function") {
                    callback = config.callback;
                }
            }

            config.transport = validateTransport(config.transport, connection);

            // If the transport is invalid throw an error and abort start
            if (!config.transport) {
                throw new Error("SignalR: Invalid transport(s) specified, aborting start.");
            }

            // Check to see if start is being called prior to page load
            // If waitForPageLoad is true we then want to re-direct function call to the window load event
            if (!_pageLoaded && config.waitForPageLoad === true) {
                _pageWindow.load(function () {
                    connection._deferral = deferred;
                    connection.start(options, callback);
                });
                return deferred.promise();
            }

            configureStopReconnectingTimeout(connection);

            if (changeState(connection,
                            signalR.connectionState.disconnected,
                            signalR.connectionState.connecting) === false) {
                // Already started, just return
                deferred.resolve(connection);
                return deferred.promise();
            }

            // Resolve the full url
            parser.href = connection.url;
            if (!parser.protocol || parser.protocol === ":") {
                connection.protocol = window.document.location.protocol;
                connection.host = window.document.location.host;
                connection.baseUrl = connection.protocol + "//" + connection.host;
            }
            else {
                connection.protocol = parser.protocol;
                connection.host = parser.host;
                connection.baseUrl = parser.protocol + "//" + parser.host;
                connection.path = parser.pathname.replace(new RegExp("^[/]+|[/]+$", "g"), "");
                ;
            }

            // Set the websocket protocol
            connection.wsProtocol = connection.protocol === "https:" ? "wss://" : "ws://";

            // If jsonp with no/auto transport is specified, then set the transport to long polling
            // since that is the only transport for which jsonp really makes sense.
            // Some developers might actually choose to specify jsonp for same origin requests
            // as demonstrated by Issue #623.
            if (config.transport === "auto" && config.jsonp === true) {
                config.transport = "longPolling";
            }

            if (this.isCrossDomain(connection.url)) {
                connection.log("Auto detected cross domain url.");

                if (config.transport === "auto") {
                    // Try webSockets and longPolling since SSE doesn't support CORS
                    // TODO: Support XDM with foreverFrame
                    config.transport = ["webSockets", "longPolling"];
                }

                // Determine if jsonp is the only choice for negotiation, ajaxSend and ajaxAbort.
                // i.e. if the browser doesn't supports CORS
                // If it is, ignore any preference to the contrary, and switch to jsonp.
                if (!config.jsonp) {
                    config.jsonp = !$.support.cors;

                    if (config.jsonp) {
                        connection.log("Using jsonp because this browser doesn't support CORS");
                    }
                }
            }

            connection.ajaxDataType = config.jsonp ? "jsonp" : "json";

            $(connection).bind(events.onStart, function (e, data) {
                if ($.type(callback) === "function") {
                    callback.call(connection);
                }
                deferred.resolve(connection);
            });

            initialize = function (transports, index) {
                index = index || 0;
                if (index >= transports.length) {
                    if (!connection.transport) {
                        // No transport initialized successfully
                        $(connection).triggerHandler(events.onError, "SignalR: No transport could be initialized successfully. Try specifying a different transport or none at all for auto initialization.");
                        deferred.reject("SignalR: No transport could be initialized successfully. Try specifying a different transport or none at all for auto initialization.");
                        // Stop the connection if it has connected and move it into the disconnected state
                        connection.stop();
                    }
                    return;
                }

                var transportName = transports[index],
                    transport = $.type(transportName) === "object" ? transportName : signalR.transports[transportName];

                if (transportName.indexOf("_") === 0) {
                    // Private member
                    initialize(transports, index + 1);
                    return;
                }

                transport.start(connection, function () { // success
                    if (transport.supportsKeepAlive && connection.keepAliveData.activated) {
                        signalR.transports._logic.monitorKeepAlive(connection);
                    }

                    connection.transport = transport;

                    changeState(connection,
                                signalR.connectionState.connecting,
                                signalR.connectionState.connected);

                    $(connection).triggerHandler(events.onStart);

                    _pageWindow.unload(function () { // failure
                        connection.stop(false /* async */);
                    });

                }, function () {
                    initialize(transports, index + 1);
                });
            };

            var url = connection.url + "/negotiate";
            connection.log("Negotiating with '" + url + "'.");
            $.ajax({
                url: url,
                global: false,
                cache: false,
                type: "GET",
                data: {},
                dataType: connection.ajaxDataType,
                error: function (error) {
                    $(connection).triggerHandler(events.onError, [error.responseText]);
                    deferred.reject("SignalR: Error during negotiation request: " + error.responseText);
                    // Stop the connection if negotiate failed
                    connection.stop();
                },
                success: function (res) {
                    var keepAliveData = connection.keepAliveData;

                    connection.appRelativeUrl = res.Url;
                    connection.id = res.ConnectionId;
                    connection.token = res.ConnectionToken;
                    connection.webSocketServerUrl = res.WebSocketServerUrl;

                    // Once the server has labeled the PersistentConnection as Disconnected, we should stop attempting to reconnect
                    // after res.DisconnectTimeout seconds.
                    connection.disconnectTimeout = res.DisconnectTimeout * 1000; // in ms
                    

                    // If we have a keep alive
                    if (res.KeepAliveTimeout) {
                        // Register the keep alive data as activated
                        keepAliveData.activated = true;

                        // Timeout to designate when to force the connection into reconnecting converted to milliseconds
                        keepAliveData.timeout = res.KeepAliveTimeout * 1000;

                        // Timeout to designate when to warn the developer that the connection may be dead or is hanging.
                        keepAliveData.timeoutWarning = keepAliveData.timeout * connection.keepAliveWarnAt;

                        // Instantiate the frequency in which we check the keep alive.  It must be short in order to not miss/pick up any changes
                        keepAliveData.checkInterval = (keepAliveData.timeout - keepAliveData.timeoutWarning) / 3;
                    }
                    else {
                        keepAliveData.activated = false;
                    }

                    if (!res.ProtocolVersion || res.ProtocolVersion !== "1.2") {
                        $(connection).triggerHandler(events.onError, "SignalR: Incompatible protocol version.");
                        deferred.reject("SignalR: Incompatible protocol version.");
                        return;
                    }

                    $(connection).triggerHandler(events.onStarting);

                    var transports = [],
                        supportedTransports = [];

                    $.each(signalR.transports, function (key) {
                        if (key === "webSockets" && !res.TryWebSockets) {
                            // Server said don't even try WebSockets, but keep processing the loop
                            return true;
                        }
                        supportedTransports.push(key);
                    });

                    if ($.isArray(config.transport)) {
                        // ordered list provided
                        $.each(config.transport, function () {
                            var transport = this;
                            if ($.type(transport) === "object" || ($.type(transport) === "string" && $.inArray("" + transport, supportedTransports) >= 0)) {
                                transports.push($.type(transport) === "string" ? "" + transport : transport);
                            }
                        });
                    } else if ($.type(config.transport) === "object" ||
                                    $.inArray(config.transport, supportedTransports) >= 0) {
                        // specific transport provided, as object or a named transport, e.g. "longPolling"
                        transports.push(config.transport);
                    } else { // default "auto"
                        transports = supportedTransports;
                    }
                    initialize(transports);
                }
            });

            return deferred.promise();
        },

        starting: function (callback) {
            /// <summary>Adds a callback that will be invoked before anything is sent over the connection</summary>
            /// <param name="callback" type="Function">A callback function to execute before each time data is sent on the connection</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onStarting, function (e, data) {
                callback.call(connection);
            });
            return connection;
        },

        send: function (data) {
            /// <summary>Sends data over the connection</summary>
            /// <param name="data" type="String">The data to send over the connection</param>
            /// <returns type="signalR" />
            var connection = this;

            if (connection.state === signalR.connectionState.disconnected) {
                // Connection hasn't been started yet
                throw new Error("SignalR: Connection must be started before data can be sent. Call .start() before .send()");
            }

            if (connection.state === signalR.connectionState.connecting) {
                // Connection hasn't been started yet
                throw new Error("SignalR: Connection has not been fully initialized. Use .start().done() or .start().fail() to run logic after the connection has started.");
            }

            connection.transport.send(connection, data);
            // REVIEW: Should we return deferred here?
            return connection;
        },

        received: function (callback) {
            /// <summary>Adds a callback that will be invoked after anything is received over the connection</summary>
            /// <param name="callback" type="Function">A callback function to execute when any data is received on the connection</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onReceived, function (e, data) {
                callback.call(connection, data);
            });
            return connection;
        },

        stateChanged: function (callback) {
            /// <summary>Adds a callback that will be invoked when the connection state changes</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection state changes</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onStateChanged, function (e, data) {
                callback.call(connection, data);
            });
            return connection;
        },

        error: function (callback) {
            /// <summary>Adds a callback that will be invoked after an error occurs with the connection</summary>
            /// <param name="callback" type="Function">A callback function to execute when an error occurs on the connection</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onError, function (e, data) {
                callback.call(connection, data);
            });
            return connection;
        },

        disconnected: function (callback) {
            /// <summary>Adds a callback that will be invoked when the client disconnects</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection is broken</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onDisconnect, function (e, data) {
                callback.call(connection);
            });
            return connection;
        },

        connectionSlow: function (callback) {
            /// <summary>Adds a callback that will be invoked when the client detects a slow connection</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection is slow</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onConnectionSlow, function(e, data) {
                callback.call(connection);
            });

            return connection;
        },

        reconnecting: function (callback) {
            /// <summary>Adds a callback that will be invoked when the underlying transport begins reconnecting</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection enters a reconnecting state</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onReconnecting, function (e, data) {
                callback.call(connection);
            });
            return connection;
        },

        reconnected: function (callback) {
            /// <summary>Adds a callback that will be invoked when the underlying transport reconnects</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection is restored</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onReconnect, function (e, data) {
                callback.call(connection);
            });
            return connection;
        },

        stop: function (async, notifyServer) {
            /// <summary>Stops listening</summary>
            /// <param name="async" type="Boolean">Whether or not to asynchronously abort the connection</param>
            /// <param name="notifyServer" type="Boolean">Whether we want to notify the server that we are aborting the connection</param>
            /// <returns type="signalR" />
            var connection = this;

            if (connection.state === signalR.connectionState.disconnected) {
                return;
            }

            try {
                if (connection.transport) {
                    if (notifyServer !== false) {
                        connection.transport.abort(connection, async);
                    }

                    if (connection.transport.supportsKeepAlive && connection.keepAliveData.activated) {
                        signalR.transports._logic.stopMonitoringKeepAlive(connection);
                    }

                    connection.transport.stop(connection);
                    connection.transport = null;
                }

                // Trigger the disconnect event
                $(connection).triggerHandler(events.onDisconnect);

                delete connection.messageId;
                delete connection.groupsToken;

                // Remove the ID and the deferral on stop, this is to ensure that if a connection is restarted it takes on a new id/deferral.
                delete connection.id;
                delete connection._deferral;
            }
            finally {
                changeState(connection, connection.state, signalR.connectionState.disconnected);
            }

            return connection;
        },

        log: function (msg) {
            log(msg, this.logging);
        }
    };

    signalR.fn.init.prototype = signalR.fn;

    signalR.noConflict = function () {
        /// <summary>Reinstates the original value of $.connection and returns the signalR object for manual assignment</summary>
        /// <returns type="signalR" />
        if ($.connection === signalR) {
            $.connection = _connection;
        }
        return signalR;
    };

    if ($.connection) {
        _connection = $.connection;
    }

    $.connection = $.signalR = signalR;

}(window.jQuery, window));
/* jquery.signalR.transports.common.js */
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.md in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.core.js" />

(function ($, window) {
    "use strict";

    var signalR = $.signalR,
        events = $.signalR.events,
        changeState = $.signalR.changeState;

    signalR.transports = {};

    function checkIfAlive(connection) {
        var keepAliveData = connection.keepAliveData,
            diff,
            timeElapsed;

        // Only check if we're connected
        if (connection.state === signalR.connectionState.connected) {
            diff = new Date();

            diff.setTime(diff - keepAliveData.lastKeepAlive);
            timeElapsed = diff.getTime();

            // Check if the keep alive has completely timed out
            if (timeElapsed >= keepAliveData.timeout) {
                connection.log("Keep alive timed out.  Notifying transport that connection has been lost.");

                // Notify transport that the connection has been lost
                connection.transport.lostConnection(connection);
            }
            else if (timeElapsed >= keepAliveData.timeoutWarning) {
                // This is to assure that the user only gets a single warning
                if (!keepAliveData.userNotified) {
                    connection.log("Keep alive has been missed, connection may be dead/slow.");
                    $(connection).triggerHandler(events.onConnectionSlow);
                    keepAliveData.userNotified = true;
                }
            }
            else {
                keepAliveData.userNotified = false;
            }
        }

        // Verify we're monitoring the keep alive
        // We don't want this as a part of the inner if statement above because we want keep alives to continue to be checked
        // in the event that the server comes back online (if it goes offline).
        if (keepAliveData.monitoring) {
            window.setTimeout(function () {
                checkIfAlive(connection);
            }, keepAliveData.checkInterval);
        }
    }

    signalR.transports._logic = {
        pingServer: function (connection, transport) {
            /// <summary>Pings the server</summary>
            /// <param name="connection" type="signalr">Connection associated with the server ping</param>
            /// <returns type="signalR" />
            var baseUrl = transport === "webSockets" ? "" : connection.baseUrl,
                url = baseUrl + connection.appRelativeUrl + "/ping",
                deferral = $.Deferred();

            $.ajax({
                url: url,
                global: false,
                cache: false,
                type: "GET",
                data: {},
                dataType: connection.ajaxDataType,
                success: function (data) {
                    if (data.Response === "pong") {
                        deferral.resolve();
                    }
                    else {
                        deferral.reject("SignalR: Invalid ping response when pinging server: " + (data.responseText || data.statusText));
                    }
                },
                error: function (data) {
                    deferral.reject("SignalR: Error pinging server: " + (data.responseText || data.statusText));
                }
            });

            return deferral.promise();
        },

        addQs: function (url, connection) {
            if (!connection.qs) {
                return url;
            }

            if (typeof (connection.qs) === "object") {
                return url + "&" + $.param(connection.qs);
            }

            if (typeof (connection.qs) === "string") {
                return url + "&" + connection.qs;
            }

            return url + "&" + window.encodeURIComponent(connection.qs.toString());
        },
        uint8ToString: function (buf) {
            var i, length, out = '';
            for (i = 0, length = buf.length; i < length; i += 1) {
                out += String.fromCharCode(buf[i]);
            }
            return out;
        },
        getUrl: function (connection, transport, reconnecting, appendReconnectUrl) {
            /// <summary>Gets the url for making a GET based connect request</summary>
            var baseUrl = transport === "webSockets" ? "" : connection.baseUrl,
                url = baseUrl + connection.appRelativeUrl,
                qs = "transport=" + transport + "&connectionToken=" + window.encodeURIComponent(connection.token);

            if (connection.data) {
                qs += "&connectionData=" + window.encodeURIComponent(connection.data);
            }

            if (connection.groupsToken) {

                qs += "&groupsToken=" + window.encodeURIComponent(this.uint8ToString(connection.groupsToken));
            }

            if (!reconnecting) {
                url = url + "/connect";
            } else {
                if (appendReconnectUrl) {
                    url = url + "/reconnect";
                }
                else {
                    url = url + "/";
                }
                if (connection.messageId) {
                    qs += "&messageId=" + window.encodeURIComponent(connection.messageId);
                }
            }
            url += "?" + qs;
            url = this.addQs(url, connection);
            url += "&tid=" + Math.floor(Math.random() * 11);
            return url;
        },

        maximizePersistentResponse: function (minPersistentResponse) {
            return {
                MessageId: minPersistentResponse.C,
                Messages: minPersistentResponse.M,
                Disconnect: typeof (minPersistentResponse.D) !== "undefined" ? true : false,
                TimedOut: typeof (minPersistentResponse.T) !== "undefined" ? true : false,
                LongPollDelay: minPersistentResponse.L,
                GroupsToken: minPersistentResponse.G
            };
        },

        updateGroups: function (connection, groupsToken) {
            if (groupsToken) {
                connection.groupsToken = groupsToken;
            }
        },

        ajaxSend: function (connection, data) {
            var url = connection.url + "/send" + "?transport=" + connection.transport.name + "&connectionToken=" + window.encodeURIComponent(connection.token);
            url = this.addQs(url, connection);
            return $.ajax({
                url: url,
                global: false,
                type: connection.ajaxDataType === "jsonp" ? "GET" : "POST",
                dataType: connection.ajaxDataType,
                data: {
                    data: data
                },
                success: function (result) {
                    if (result) {
                        $(connection).triggerHandler(events.onReceived, [result]);
                    }
                },
                error: function (errData, textStatus) {
                    if (textStatus === "abort" ||
                        (textStatus === "parsererror" && connection.ajaxDataType === "jsonp")) {
                        // The parsererror happens for sends that don't return any data, and hence
                        // don't write the jsonp callback to the response. This is harder to fix on the server
                        // so just hack around it on the client for now.
                        return;
                    }
                    $(connection).triggerHandler(events.onError, [errData]);
                }
            });
        },

        ajaxAbort: function (connection, async) {
            if (typeof (connection.transport) === "undefined") {
                return;
            }

            // Async by default unless explicitly overidden
            async = typeof async === "undefined" ? true : async;

            var url = connection.url + "/abort" + "?transport=" + connection.transport.name + "&connectionToken=" + window.encodeURIComponent(connection.token);
            url = this.addQs(url, connection);
            $.ajax({
                url: url,
                async: async,
                timeout: 1000,
                global: false,
                type: "POST",
                dataType: connection.ajaxDataType,
                data: {}
            });

            connection.log("Fired ajax abort async = " + async);
        },

        processMessages: function (connection, minData) {
            var data;
            // Transport can be null if we've just closed the connection
            if (connection.transport) {
                var $connection = $(connection);

                // If our transport supports keep alive then we need to update the last keep alive time stamp.
                // Very rarely the transport can be null.
                if (connection.transport.supportsKeepAlive && connection.keepAliveData.activated) {
                    this.updateKeepAlive(connection);
                }

                if (!minData) {
                    return;
                }

                data = this.maximizePersistentResponse(minData);

                if (data.Disconnect) {
                    connection.log("Disconnect command received from server");

                    // Disconnected by the server
                    connection.stop(false, false);
                    return;
                }

                this.updateGroups(connection, data.GroupsToken);

                if (data.Messages) {
                    $.each(data.Messages, function () {
                        try {
                            $connection.triggerHandler(events.onReceived, [this]);
                        }
                        catch (e) {
                            connection.log("Error raising received " + e);
                            $(connection).triggerHandler(events.onError, [e]);
                        }
                    });
                }

                if (data.MessageId) {
                    connection.messageId = data.MessageId;
                }
            }
        },

        monitorKeepAlive: function (connection) {
            var keepAliveData = connection.keepAliveData,
                that = this;

            // If we haven't initiated the keep alive timeouts then we need to
            if (!keepAliveData.monitoring) {
                keepAliveData.monitoring = true;

                // Initialize the keep alive time stamp ping
                that.updateKeepAlive(connection);

                // Save the function so we can unbind it on stop
                connection.keepAliveData.reconnectKeepAliveUpdate = function () {
                    that.updateKeepAlive(connection);
                };

                // Update Keep alive on reconnect
                $(connection).bind(events.onReconnect, connection.keepAliveData.reconnectKeepAliveUpdate);

                connection.log("Now monitoring keep alive with a warning timeout of " + keepAliveData.timeoutWarning + " and a connection lost timeout of " + keepAliveData.timeout);
                // Start the monitoring of the keep alive
                checkIfAlive(connection);
            }
            else {
                connection.log("Tried to monitor keep alive but it's already being monitored");
            }
        },

        stopMonitoringKeepAlive: function (connection) {
            var keepAliveData = connection.keepAliveData;

            // Only attempt to stop the keep alive monitoring if its being monitored
            if (keepAliveData.monitoring) {
                // Stop monitoring
                keepAliveData.monitoring = false;

                // Remove the updateKeepAlive function from the reconnect event
                $(connection).unbind(events.onReconnect, connection.keepAliveData.reconnectKeepAliveUpdate);

                // Clear all the keep alive data
                keepAliveData = {};
                connection.log("Stopping the monitoring of the keep alive");
            }
        },

        updateKeepAlive: function (connection) {
            connection.keepAliveData.lastKeepAlive = new Date();
        },

        ensureReconnectingState: function (connection) {
            if (changeState(connection,
                        signalR.connectionState.connected,
                        signalR.connectionState.reconnecting) === true) {
                $(connection).triggerHandler(events.onReconnecting);
            }
            return connection.state === signalR.connectionState.reconnecting;
        },

        foreverFrame: {
            count: 0,
            connections: {}
        }
    };

}(window.jQuery, window));
/* jquery.signalR.transports.webSockets.js */
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.md in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.transports.common.js" />

(function ($, window) {
    "use strict";

    var base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split("");
    var base64inv = {};
    for (var i = 0; i < base64chars.length; i++) {
        base64inv[base64chars[i]] = i;
    }
    function base64_decode_array(s) {
        // remove/ignore any characters not in the base64 characters list
        //  or the pad character -- particularly newlines
        s = s.replace(new RegExp('[^' + base64chars.join("") + '=]', 'g'), "");

        // replace any incoming padding with a zero pad (the 'A' character is zero)
        var p = (s.charAt(s.length - 1) == '=' ?
                (s.charAt(s.length - 2) == '=' ? 'AA' : 'A') : "");

        var r = [];

        s = s.substr(0, s.length - p.length) + p;

        // increment over the length of this encrypted string, four characters at a time
        for (var c = 0; c < s.length; c += 4) {

            // each of these four characters represents a 6-bit index in the base64 characters list
            //  which, when concatenated, will give the 24-bit number for the original 3 characters
            var n = (base64inv[s.charAt(c)] << 18) + (base64inv[s.charAt(c + 1)] << 12) +
                    (base64inv[s.charAt(c + 2)] << 6) + base64inv[s.charAt(c + 3)];


            // split the 24-bit number into the original three 8-bit (ASCII) characters
            r.push((n >>> 16) & 255);
            r.push((n >>> 8) & 255);
            r.push(n & 255);


        }
        // remove any zero pad that was added to make this a multiple of 24 bits
        return r;
    }

    var signalR = $.signalR,
        events = $.signalR.events,
        changeState = $.signalR.changeState,
        transportLogic = signalR.transports._logic;

    signalR.transports.webSockets = {
        name: "webSockets",

        supportsKeepAlive: true,

        attemptingReconnect: false,

        currentSocketID: 0,

        send: function (connection, data) {
            if (typeof Uint8Array === "undefined" || window.WEB_SOCKET_FORCE_FLASH) {
                connection.socket.send(data);
            }
            else {
                var array = new Uint8Array(data);
                connection.socket.send(array);
            }
        },

        start: function (connection, onSuccess, onFailed) {
            var url,
                opened = false,
                that = this,
                reconnecting = !onSuccess,
                $connection = $(connection);

            if (!window.WebSocket) {
                onFailed();
                return;
            }

            if (!connection.socket) {
                if (connection.webSocketServerUrl) {
                    url = connection.webSocketServerUrl;
                }
                else {
                    url = connection.wsProtocol + connection.host + '/' + connection.path;
                }

                url += transportLogic.getUrl(connection, this.name, reconnecting);

                connection.log("Connecting to websocket endpoint '" + url + "'");
                connection.socket = new window.WebSocket(url);
                connection.socket.ID = ++that.currentSocketID;
                connection.socket.binaryType = "arraybuffer";
                connection.socket.onopen = function () {
                    opened = true;
                    connection.log("Websocket opened");

                    if (that.attemptingReconnect) {
                        that.attemptingReconnect = false;
                    }

                    if (onSuccess) {
                        onSuccess();
                    } else if (changeState(connection,
                                         signalR.connectionState.reconnecting,
                                         signalR.connectionState.connected) === true) {
                        $connection.triggerHandler(events.onReconnect);
                    }
                };

                connection.socket.onclose = function (event) {
                    // Only handle a socket close if the close is from the current socket.
                    // Sometimes on disconnect the server will push down an onclose event
                    // to an expired socket.
                    if (this.ID === that.currentSocketID) {
                        if (!opened) {
                            if (onFailed) {
                                onFailed();
                            }
                            else if (reconnecting) {
                                that.reconnect(connection);
                            }
                            return;
                        }
                        else if (typeof event.wasClean !== "undefined" && event.wasClean === false) {
                            // Ideally this would use the websocket.onerror handler (rather than checking wasClean in onclose) but
                            // I found in some circumstances Chrome won't call onerror. This implementation seems to work on all browsers.
                            $(connection).triggerHandler(events.onError, [event.reason]);
                            connection.log("Unclean disconnect from websocket." + event.reason);
                        }
                        else {
                            connection.log("Websocket closed");
                        }

                        that.reconnect(connection);
                    }
                };

                connection.socket.onmessage = function (event) {
                    var view;
                    if (typeof (event.data) === "string") {
                        view = base64_decode_array(event.data);
                    }
                    else {
                        view = new Uint8Array(event.data, 0, event.data.byteLength);
                    }
                    var data = msgpack.unpack(view, { byteProperties: ['M', 'G'] });
                    $connection = $(connection);

                    if (data) {
                        // data.M is PersistentResponse.Messages
                        if ($.isEmptyObject(data) || data.M) {
                            transportLogic.processMessages(connection, data);
                        } else {
                            // For websockets we need to trigger onReceived
                            // for callbacks to outgoing hub calls.
                            $connection.triggerHandler(events.onReceived, [data]);
                        }
                    }
                };
            }
        },

        reconnect: function (connection) {
            var that = this;

            if (connection.state !== signalR.connectionState.disconnected) {
                if (!that.attemptingReconnect) {
                    that.attemptingReconnect = true;
                }

                window.setTimeout(function () {
                    if (that.attemptingReconnect) {
                        that.stop(connection);
                    }

                    if (transportLogic.ensureReconnectingState(connection)) {
                        connection.log("Websocket reconnecting");
                        that.start(connection);
                    }
                }, connection.reconnectDelay);
            }
        },

        lostConnection: function (connection) {
            this.reconnect(connection);

        },

        stop: function (connection) {
            if (connection.socket !== null) {
                connection.log("Closing the Websocket");
                connection.socket.close();
                connection.socket = null;
            }
        },

        abort: function (connection) {
        }
    };

}(window.jQuery, window));
/* jquery.signalR.version.js */
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.md in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.core.js" />
(function ($) {
    $.signalR.version = "...";
}(window.jQuery));
/* stormancer.js */
/// <reference path="defs/signalr.d.ts" />
/// <reference path="defs/msgpack.d.ts" />
// Module
var Stormancer;
(function (Stormancer) {
    var Settings = (function () {
        function Settings() { }
        Settings.api = 'http://api.stormancer.com/';
        return Settings;
    })();    
    //static api: string = 'http://localhost:23469/';
    //Represents a scene endpoint.
    var SceneEndpoint = (function () {
        function SceneEndpoint() { }
        return SceneEndpoint;
    })();
    Stormancer.SceneEndpoint = SceneEndpoint;    
    var ApiClient = (function () {
        function ApiClient(configuration) {
            this.configuration = configuration;
        }
        ApiClient.prototype.getSceneEndpoint = function (sceneId, userData, completed) {
            var url = this.configuration.getApiEndpoint() + this.configuration.account + '/' + this.configuration.application + '/scenes/' + sceneId + '/token';
            $.ajax({
                type: 'POST',
                url: url,
                contentType: 'text/plain',
                data: JSON.stringify(userData),
                dataType: 'json'
            }).done(function (data, status) {
                completed(data);
            }).fail(function (query, status) {
            });
        };
        return ApiClient;
    })();
    Stormancer.ApiClient = ApiClient;    
    var Scene = (function () {
        function Scene(client, sceneId, token) {
            this.host = client;
            this.sceneId = sceneId;
            this.token = token;
        }
        Scene.prototype.send = function (route, data, success) {
            if(!this.connected) {
                throw new Error("The scene is not connected.");
            }
            this.host.send(this.sceneId, route, msgpack.pack(data, {
                byteProperties: []
            }), success);
        };
        Scene.prototype.onMessage = function (route, handler) {
            this.host.observeMessages(this.sceneId, route, handler);
        };
        Scene.prototype.connect = function (success) {
            var _this = this;
            this.host.sendHostMessage(this.sceneId, "scene.start", this.token, function () {
                _this.connected = true;
                success();
            });
        };
        Scene.prototype.sendRequest = function (route, data, handler, completed, success) {
            if(!this.connected) {
                throw new Error("The scene is not connected.");
            }
            this.host.sendRequest(this.sceneId, route, msgpack.pack(data, {
                byteProperties: []
            }), handler, completed, success);
        };
        Scene.prototype.disconnect = function (success) {
            var _this = this;
            this.host.sendHostMessage(this.sceneId, "scene.stop", false, function () {
                _this.connected = false;
                success();
            });
        };
        return Scene;
    })();    
    var Configuration = (function () {
        function Configuration() { }
        Configuration.forLocalDev = function forLocalDev(applicationName) {
            var config = new Configuration();
            config.isLocalDev = true;
            config.application = applicationName;
            config.account = "local";
            return config;
        };
        Configuration.forAccount = function forAccount(accountId, applicationName) {
            var config = new Configuration();
            config.isLocalDev = false;
            config.account = accountId;
            config.application = applicationName;
            return config;
        };
        Configuration.prototype.getApiEndpoint = function () {
            if(this.isLocalDev) {
                if(this.localDevProxy != null) {
                    return this.localDevProxy;
                } else {
                    return Configuration.localDevEndpoint;
                }
            } else {
                return Configuration.apiEndpoint;
            }
        };
        Configuration.apiEndpoint = "http://api.stormancer.com/";
        Configuration.localDevEndpoint = "http://localhost:42001/";
        return Configuration;
    })();
    Stormancer.Configuration = Configuration;    
    // Class
    var Client = (function () {
        // Constructor
        function Client(configuration) {
            this.apiClient = new ApiClient(configuration);
            this.connections = Array();
            this.connectionsBySceneId = Array();
            this.routeHandlers = Array();
            this.responseHandlers = Array();
            this.requestCompleteHandlers = Array();
            this.configuration = configuration;
            this.currentId = 1;
        }
        Client.prototype.getPublicScene = function (sceneId, userData, success) {
            var _this = this;
            this.apiClient.getSceneEndpoint(sceneId, userData, function (endpoint) {
                _this.startConnection(endpoint.Endpoint, function (connection) {
                    _this.connectionsBySceneId[sceneId] = connection;
                    success(new Scene(_this, sceneId, endpoint.Token));
                });
            });
        };
        Client.prototype.getScene = function (token, success) {
            var _this = this;
            var ci = JSON.parse(token);
            this.startConnection(ci.Endpoint, function (connection) {
                _this.connectionsBySceneId[ci.SceneId] = connection;
                success(new Scene(_this, ci.SceneId, ci.Token));
            });
        };
        Client.prototype.startConnection = function (endpoint, success) {
            var _this = this;
            if(!this.connections[endpoint]) {
                var connection = $.signalR(endpoint);
                this.connections[endpoint] = connection;
                connection.received(function (data) {
                    _this.dataReceived(data);
                });
                connection.start(function () {
                    success(connection);
                });
            } else {
                success(this.connections[endpoint]);
            }
        };
        Client.prototype.dataReceived = function (data) {
            var msg = msgpack.unpack(data, {
                byteProperties: [
                    'D'
                ]
            });
            if(msg.R) {
                if(msg.R == "@r/m") {
                    var action = this.responseHandlers[msg.I];
                    if(action) {
                        action(msgpack.unpack(msg.D, {
                            byteProperties: []
                        }));
                    }
                } else if(msg.R == "@r/c") {
                    var completeAction = this.requestCompleteHandlers[msg.I];
                    if(completeAction) {
                        completeAction();
                        this.requestCompleteHandlers.slice(this.requestCompleteHandlers.indexOf(completeAction), 1);
                    }
                    var responseHandler = this.responseHandlers[msg.I];
                    if(responseHandler) {
                        this.responseHandlers.slice(this.responseHandlers.indexOf(responseHandler), 1);
                    }
                } else {
                    var actions = this.routeHandlers[msg.R];
                    if(actions) {
                        for(var i = 0; i < actions.length; i++) {
                            actions[i](msgpack.unpack(msg.D, {
                                byteProperties: []
                            }));
                        }
                    }
                }
            }
        };
        Client.prototype.observeMessages = function (sceneId, route, handler) {
            var fullRoute = sceneId + '/' + route;
            var actions = this.routeHandlers[fullRoute];
            if(!actions) {
                actions = Array();
                this.routeHandlers[fullRoute] = actions;
            }
            actions.push(handler);
        };
        Client.prototype.encodeMsg = function (sceneId, route, data, requestId) {
            var fullRoute = sceneId + '/' + route;
            var id = 0;
            if(!(requestId === undefined)) {
                id = requestId;
            }
            return msgpack.pack({
                R: fullRoute,
                D: data,
                I: id
            }, {
                byteProperties: [
                    'D'
                ]
            });
        };
        Client.prototype.send = function (sceneId, route, data, success) {
            var msg = this.encodeMsg(sceneId, route, data);
            var connection = this.connectionsBySceneId[sceneId];
            connection.send(msg);
            success();
        };
        Client.prototype.sendHostMessage = function (sceneId, route, message, success) {
            var msg = this.encodeMsg('@', route, msgpack.pack(message, {
                byteProperties: []
            }));
            var connection = this.connectionsBySceneId[sceneId];
            connection.send(msg);
            success();
        };
        Client.prototype.sendRequest = function (sceneId, route, data, handler, completed, success) {
            var requestId = this.currentId;
            this.currentId++;
            var msg = this.encodeMsg(sceneId, route, data, requestId);
            var connection = this.connectionsBySceneId[sceneId];
            this.responseHandlers[requestId] = handler;
            this.requestCompleteHandlers[requestId] = completed;
            connection.send(msg);
            success();
        };
        Client.prototype.Disconnect = function () {
            for(var i = 0; i < this.connections.length; i++) {
                var connection = this.connections[i];
                connection.stop();
            }
        };
        return Client;
    })();
    Stormancer.Client = Client;    
    var Msg = (function () {
        function Msg() { }
        return Msg;
    })();    
})(Stormancer || (Stormancer = {}));
((function ($, window) {
    $.stormancer = function (configuration) {
        return new Stormancer.Client(configuration);
    };
    //jQuery.support.cors = true
    })(jQuery, window));
//@ sourceMappingURL=stormancer.js.map

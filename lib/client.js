window.__ModuleLoader__.load({id:"@dsh-mobile/plugin",factory:(require)=>{var module={exports:{}};var exports=module.exports;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../../../../node_modules/qrcode/lib/can-promise.js
var require_can_promise = __commonJS({
  "../../../../../node_modules/qrcode/lib/can-promise.js"(exports, module2) {
    module2.exports = function() {
      return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/utils.js
var require_utils = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/utils.js"(exports) {
    var toSJISFunction;
    var CODEWORDS_COUNT = [
      0,
      // Not used
      26,
      44,
      70,
      100,
      134,
      172,
      196,
      242,
      292,
      346,
      404,
      466,
      532,
      581,
      655,
      733,
      815,
      901,
      991,
      1085,
      1156,
      1258,
      1364,
      1474,
      1588,
      1706,
      1828,
      1921,
      2051,
      2185,
      2323,
      2465,
      2611,
      2761,
      2876,
      3034,
      3196,
      3362,
      3532,
      3706
    ];
    exports.getSymbolSize = function getSymbolSize(version) {
      if (!version) throw new Error('"version" cannot be null or undefined');
      if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40');
      return version * 4 + 17;
    };
    exports.getSymbolTotalCodewords = function getSymbolTotalCodewords(version) {
      return CODEWORDS_COUNT[version];
    };
    exports.getBCHDigit = function(data) {
      let digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    };
    exports.setToSJISFunction = function setToSJISFunction(f) {
      if (typeof f !== "function") {
        throw new Error('"toSJISFunc" is not a valid function.');
      }
      toSJISFunction = f;
    };
    exports.isKanjiModeEnabled = function() {
      return typeof toSJISFunction !== "undefined";
    };
    exports.toSJIS = function toSJIS(kanji) {
      return toSJISFunction(kanji);
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/error-correction-level.js
var require_error_correction_level = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/error-correction-level.js"(exports) {
    exports.L = { bit: 1 };
    exports.M = { bit: 0 };
    exports.Q = { bit: 3 };
    exports.H = { bit: 2 };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "l":
        case "low":
          return exports.L;
        case "m":
        case "medium":
          return exports.M;
        case "q":
        case "quartile":
          return exports.Q;
        case "h":
        case "high":
          return exports.H;
        default:
          throw new Error("Unknown EC Level: " + string);
      }
    }
    exports.isValid = function isValid(level) {
      return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
    };
    exports.from = function from(value, defaultValue) {
      if (exports.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/bit-buffer.js
var require_bit_buffer = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/bit-buffer.js"(exports, module2) {
    function BitBuffer() {
      this.buffer = [];
      this.length = 0;
    }
    BitBuffer.prototype = {
      get: function(index) {
        const bufIndex = Math.floor(index / 8);
        return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
      },
      put: function(num, length) {
        for (let i = 0; i < length; i++) {
          this.putBit((num >>> length - i - 1 & 1) === 1);
        }
      },
      getLengthInBits: function() {
        return this.length;
      },
      putBit: function(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) {
          this.buffer.push(0);
        }
        if (bit) {
          this.buffer[bufIndex] |= 128 >>> this.length % 8;
        }
        this.length++;
      }
    };
    module2.exports = BitBuffer;
  }
});

// ../../../../../node_modules/qrcode/lib/core/bit-matrix.js
var require_bit_matrix = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/bit-matrix.js"(exports, module2) {
    function BitMatrix(size) {
      if (!size || size < 1) {
        throw new Error("BitMatrix size must be defined and greater than 0");
      }
      this.size = size;
      this.data = new Uint8Array(size * size);
      this.reservedBit = new Uint8Array(size * size);
    }
    BitMatrix.prototype.set = function(row, col, value, reserved) {
      const index = row * this.size + col;
      this.data[index] = value;
      if (reserved) this.reservedBit[index] = true;
    };
    BitMatrix.prototype.get = function(row, col) {
      return this.data[row * this.size + col];
    };
    BitMatrix.prototype.xor = function(row, col, value) {
      this.data[row * this.size + col] ^= value;
    };
    BitMatrix.prototype.isReserved = function(row, col) {
      return this.reservedBit[row * this.size + col];
    };
    module2.exports = BitMatrix;
  }
});

// ../../../../../node_modules/qrcode/lib/core/alignment-pattern.js
var require_alignment_pattern = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/alignment-pattern.js"(exports) {
    var getSymbolSize = require_utils().getSymbolSize;
    exports.getRowColCoords = function getRowColCoords(version) {
      if (version === 1) return [];
      const posCount = Math.floor(version / 7) + 2;
      const size = getSymbolSize(version);
      const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
      const positions = [size - 7];
      for (let i = 1; i < posCount - 1; i++) {
        positions[i] = positions[i - 1] - intervals;
      }
      positions.push(6);
      return positions.reverse();
    };
    exports.getPositions = function getPositions(version) {
      const coords = [];
      const pos = exports.getRowColCoords(version);
      const posLength = pos.length;
      for (let i = 0; i < posLength; i++) {
        for (let j = 0; j < posLength; j++) {
          if (i === 0 && j === 0 || // top-left
          i === 0 && j === posLength - 1 || // bottom-left
          i === posLength - 1 && j === 0) {
            continue;
          }
          coords.push([pos[i], pos[j]]);
        }
      }
      return coords;
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/finder-pattern.js
var require_finder_pattern = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/finder-pattern.js"(exports) {
    var getSymbolSize = require_utils().getSymbolSize;
    var FINDER_PATTERN_SIZE = 7;
    exports.getPositions = function getPositions(version) {
      const size = getSymbolSize(version);
      return [
        // top-left
        [0, 0],
        // top-right
        [size - FINDER_PATTERN_SIZE, 0],
        // bottom-left
        [0, size - FINDER_PATTERN_SIZE]
      ];
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/mask-pattern.js
var require_mask_pattern = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/mask-pattern.js"(exports) {
    exports.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };
    var PenaltyScores = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };
    exports.isValid = function isValid(mask) {
      return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
    };
    exports.from = function from(value) {
      return exports.isValid(value) ? parseInt(value, 10) : void 0;
    };
    exports.getPenaltyN1 = function getPenaltyN1(data) {
      const size = data.size;
      let points = 0;
      let sameCountCol = 0;
      let sameCountRow = 0;
      let lastCol = null;
      let lastRow = null;
      for (let row = 0; row < size; row++) {
        sameCountCol = sameCountRow = 0;
        lastCol = lastRow = null;
        for (let col = 0; col < size; col++) {
          let module3 = data.get(row, col);
          if (module3 === lastCol) {
            sameCountCol++;
          } else {
            if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
            lastCol = module3;
            sameCountCol = 1;
          }
          module3 = data.get(col, row);
          if (module3 === lastRow) {
            sameCountRow++;
          } else {
            if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
            lastRow = module3;
            sameCountRow = 1;
          }
        }
        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
      }
      return points;
    };
    exports.getPenaltyN2 = function getPenaltyN2(data) {
      const size = data.size;
      let points = 0;
      for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size - 1; col++) {
          const last = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
          if (last === 4 || last === 0) points++;
        }
      }
      return points * PenaltyScores.N2;
    };
    exports.getPenaltyN3 = function getPenaltyN3(data) {
      const size = data.size;
      let points = 0;
      let bitsCol = 0;
      let bitsRow = 0;
      for (let row = 0; row < size; row++) {
        bitsCol = bitsRow = 0;
        for (let col = 0; col < size; col++) {
          bitsCol = bitsCol << 1 & 2047 | data.get(row, col);
          if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
          bitsRow = bitsRow << 1 & 2047 | data.get(col, row);
          if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
        }
      }
      return points * PenaltyScores.N3;
    };
    exports.getPenaltyN4 = function getPenaltyN4(data) {
      let darkCount = 0;
      const modulesCount = data.data.length;
      for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
      const k = Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10);
      return k * PenaltyScores.N4;
    };
    function getMaskAt(maskPattern, i, j) {
      switch (maskPattern) {
        case exports.Patterns.PATTERN000:
          return (i + j) % 2 === 0;
        case exports.Patterns.PATTERN001:
          return i % 2 === 0;
        case exports.Patterns.PATTERN010:
          return j % 3 === 0;
        case exports.Patterns.PATTERN011:
          return (i + j) % 3 === 0;
        case exports.Patterns.PATTERN100:
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case exports.Patterns.PATTERN101:
          return i * j % 2 + i * j % 3 === 0;
        case exports.Patterns.PATTERN110:
          return (i * j % 2 + i * j % 3) % 2 === 0;
        case exports.Patterns.PATTERN111:
          return (i * j % 3 + (i + j) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + maskPattern);
      }
    }
    exports.applyMask = function applyMask(pattern, data) {
      const size = data.size;
      for (let col = 0; col < size; col++) {
        for (let row = 0; row < size; row++) {
          if (data.isReserved(row, col)) continue;
          data.xor(row, col, getMaskAt(pattern, row, col));
        }
      }
    };
    exports.getBestMask = function getBestMask(data, setupFormatFunc) {
      const numPatterns = Object.keys(exports.Patterns).length;
      let bestPattern = 0;
      let lowerPenalty = Infinity;
      for (let p = 0; p < numPatterns; p++) {
        setupFormatFunc(p);
        exports.applyMask(p, data);
        const penalty = exports.getPenaltyN1(data) + exports.getPenaltyN2(data) + exports.getPenaltyN3(data) + exports.getPenaltyN4(data);
        exports.applyMask(p, data);
        if (penalty < lowerPenalty) {
          lowerPenalty = penalty;
          bestPattern = p;
        }
      }
      return bestPattern;
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/error-correction-code.js
var require_error_correction_code = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/error-correction-code.js"(exports) {
    var ECLevel = require_error_correction_level();
    var EC_BLOCKS_TABLE = [
      // L  M  Q  H
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2,
      1,
      2,
      2,
      4,
      1,
      2,
      4,
      4,
      2,
      4,
      4,
      4,
      2,
      4,
      6,
      5,
      2,
      4,
      6,
      6,
      2,
      5,
      8,
      8,
      4,
      5,
      8,
      8,
      4,
      5,
      8,
      11,
      4,
      8,
      10,
      11,
      4,
      9,
      12,
      16,
      4,
      9,
      16,
      16,
      6,
      10,
      12,
      18,
      6,
      10,
      17,
      16,
      6,
      11,
      16,
      19,
      6,
      13,
      18,
      21,
      7,
      14,
      21,
      25,
      8,
      16,
      20,
      25,
      8,
      17,
      23,
      25,
      9,
      17,
      23,
      34,
      9,
      18,
      25,
      30,
      10,
      20,
      27,
      32,
      12,
      21,
      29,
      35,
      12,
      23,
      34,
      37,
      12,
      25,
      34,
      40,
      13,
      26,
      35,
      42,
      14,
      28,
      38,
      45,
      15,
      29,
      40,
      48,
      16,
      31,
      43,
      51,
      17,
      33,
      45,
      54,
      18,
      35,
      48,
      57,
      19,
      37,
      51,
      60,
      19,
      38,
      53,
      63,
      20,
      40,
      56,
      66,
      21,
      43,
      59,
      70,
      22,
      45,
      62,
      74,
      24,
      47,
      65,
      77,
      25,
      49,
      68,
      81
    ];
    var EC_CODEWORDS_TABLE = [
      // L  M  Q  H
      7,
      10,
      13,
      17,
      10,
      16,
      22,
      28,
      15,
      26,
      36,
      44,
      20,
      36,
      52,
      64,
      26,
      48,
      72,
      88,
      36,
      64,
      96,
      112,
      40,
      72,
      108,
      130,
      48,
      88,
      132,
      156,
      60,
      110,
      160,
      192,
      72,
      130,
      192,
      224,
      80,
      150,
      224,
      264,
      96,
      176,
      260,
      308,
      104,
      198,
      288,
      352,
      120,
      216,
      320,
      384,
      132,
      240,
      360,
      432,
      144,
      280,
      408,
      480,
      168,
      308,
      448,
      532,
      180,
      338,
      504,
      588,
      196,
      364,
      546,
      650,
      224,
      416,
      600,
      700,
      224,
      442,
      644,
      750,
      252,
      476,
      690,
      816,
      270,
      504,
      750,
      900,
      300,
      560,
      810,
      960,
      312,
      588,
      870,
      1050,
      336,
      644,
      952,
      1110,
      360,
      700,
      1020,
      1200,
      390,
      728,
      1050,
      1260,
      420,
      784,
      1140,
      1350,
      450,
      812,
      1200,
      1440,
      480,
      868,
      1290,
      1530,
      510,
      924,
      1350,
      1620,
      540,
      980,
      1440,
      1710,
      570,
      1036,
      1530,
      1800,
      570,
      1064,
      1590,
      1890,
      600,
      1120,
      1680,
      1980,
      630,
      1204,
      1770,
      2100,
      660,
      1260,
      1860,
      2220,
      720,
      1316,
      1950,
      2310,
      750,
      1372,
      2040,
      2430
    ];
    exports.getBlocksCount = function getBlocksCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
    exports.getTotalCodewordsCount = function getTotalCodewordsCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/galois-field.js
var require_galois_field = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/galois-field.js"(exports) {
    var EXP_TABLE = new Uint8Array(512);
    var LOG_TABLE = new Uint8Array(256);
    (function initTables() {
      let x = 1;
      for (let i = 0; i < 255; i++) {
        EXP_TABLE[i] = x;
        LOG_TABLE[x] = i;
        x <<= 1;
        if (x & 256) {
          x ^= 285;
        }
      }
      for (let i = 255; i < 512; i++) {
        EXP_TABLE[i] = EXP_TABLE[i - 255];
      }
    })();
    exports.log = function log(n) {
      if (n < 1) throw new Error("log(" + n + ")");
      return LOG_TABLE[n];
    };
    exports.exp = function exp(n) {
      return EXP_TABLE[n];
    };
    exports.mul = function mul(x, y) {
      if (x === 0 || y === 0) return 0;
      return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/polynomial.js
var require_polynomial = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/polynomial.js"(exports) {
    var GF = require_galois_field();
    exports.mul = function mul(p1, p2) {
      const coeff = new Uint8Array(p1.length + p2.length - 1);
      for (let i = 0; i < p1.length; i++) {
        for (let j = 0; j < p2.length; j++) {
          coeff[i + j] ^= GF.mul(p1[i], p2[j]);
        }
      }
      return coeff;
    };
    exports.mod = function mod(divident, divisor) {
      let result = new Uint8Array(divident);
      while (result.length - divisor.length >= 0) {
        const coeff = result[0];
        for (let i = 0; i < divisor.length; i++) {
          result[i] ^= GF.mul(divisor[i], coeff);
        }
        let offset = 0;
        while (offset < result.length && result[offset] === 0) offset++;
        result = result.slice(offset);
      }
      return result;
    };
    exports.generateECPolynomial = function generateECPolynomial(degree) {
      let poly = new Uint8Array([1]);
      for (let i = 0; i < degree; i++) {
        poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
      }
      return poly;
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/reed-solomon-encoder.js
var require_reed_solomon_encoder = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/reed-solomon-encoder.js"(exports, module2) {
    var Polynomial = require_polynomial();
    function ReedSolomonEncoder(degree) {
      this.genPoly = void 0;
      this.degree = degree;
      if (this.degree) this.initialize(this.degree);
    }
    ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
      this.degree = degree;
      this.genPoly = Polynomial.generateECPolynomial(this.degree);
    };
    ReedSolomonEncoder.prototype.encode = function encode(data) {
      if (!this.genPoly) {
        throw new Error("Encoder not initialized");
      }
      const paddedData = new Uint8Array(data.length + this.degree);
      paddedData.set(data);
      const remainder = Polynomial.mod(paddedData, this.genPoly);
      const start = this.degree - remainder.length;
      if (start > 0) {
        const buff = new Uint8Array(this.degree);
        buff.set(remainder, start);
        return buff;
      }
      return remainder;
    };
    module2.exports = ReedSolomonEncoder;
  }
});

// ../../../../../node_modules/qrcode/lib/core/version-check.js
var require_version_check = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/version-check.js"(exports) {
    exports.isValid = function isValid(version) {
      return !isNaN(version) && version >= 1 && version <= 40;
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/regex.js
var require_regex = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/regex.js"(exports) {
    var numeric = "[0-9]+";
    var alphanumeric = "[A-Z $%*+\\-./:]+";
    var kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
    kanji = kanji.replace(/u/g, "\\u");
    var byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";
    exports.KANJI = new RegExp(kanji, "g");
    exports.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
    exports.BYTE = new RegExp(byte, "g");
    exports.NUMERIC = new RegExp(numeric, "g");
    exports.ALPHANUMERIC = new RegExp(alphanumeric, "g");
    var TEST_KANJI = new RegExp("^" + kanji + "$");
    var TEST_NUMERIC = new RegExp("^" + numeric + "$");
    var TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
    exports.testKanji = function testKanji(str) {
      return TEST_KANJI.test(str);
    };
    exports.testNumeric = function testNumeric(str) {
      return TEST_NUMERIC.test(str);
    };
    exports.testAlphanumeric = function testAlphanumeric(str) {
      return TEST_ALPHANUMERIC.test(str);
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/mode.js
var require_mode = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/mode.js"(exports) {
    var VersionCheck = require_version_check();
    var Regex = require_regex();
    exports.NUMERIC = {
      id: "Numeric",
      bit: 1 << 0,
      ccBits: [10, 12, 14]
    };
    exports.ALPHANUMERIC = {
      id: "Alphanumeric",
      bit: 1 << 1,
      ccBits: [9, 11, 13]
    };
    exports.BYTE = {
      id: "Byte",
      bit: 1 << 2,
      ccBits: [8, 16, 16]
    };
    exports.KANJI = {
      id: "Kanji",
      bit: 1 << 3,
      ccBits: [8, 10, 12]
    };
    exports.MIXED = {
      bit: -1
    };
    exports.getCharCountIndicator = function getCharCountIndicator(mode, version) {
      if (!mode.ccBits) throw new Error("Invalid mode: " + mode);
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid version: " + version);
      }
      if (version >= 1 && version < 10) return mode.ccBits[0];
      else if (version < 27) return mode.ccBits[1];
      return mode.ccBits[2];
    };
    exports.getBestModeForData = function getBestModeForData(dataStr) {
      if (Regex.testNumeric(dataStr)) return exports.NUMERIC;
      else if (Regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC;
      else if (Regex.testKanji(dataStr)) return exports.KANJI;
      else return exports.BYTE;
    };
    exports.toString = function toString(mode) {
      if (mode && mode.id) return mode.id;
      throw new Error("Invalid mode");
    };
    exports.isValid = function isValid(mode) {
      return mode && mode.bit && mode.ccBits;
    };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "numeric":
          return exports.NUMERIC;
        case "alphanumeric":
          return exports.ALPHANUMERIC;
        case "kanji":
          return exports.KANJI;
        case "byte":
          return exports.BYTE;
        default:
          throw new Error("Unknown mode: " + string);
      }
    }
    exports.from = function from(value, defaultValue) {
      if (exports.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/version.js
var require_version = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/version.js"(exports) {
    var Utils = require_utils();
    var ECCode = require_error_correction_code();
    var ECLevel = require_error_correction_level();
    var Mode = require_mode();
    var VersionCheck = require_version_check();
    var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
    var G18_BCH = Utils.getBCHDigit(G18);
    function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    function getReservedBitsCount(mode, version) {
      return Mode.getCharCountIndicator(mode, version) + 4;
    }
    function getTotalBitsFromDataArray(segments, version) {
      let totalBits = 0;
      segments.forEach(function(data) {
        const reservedBits = getReservedBitsCount(data.mode, version);
        totalBits += reservedBits + data.getBitsLength();
      });
      return totalBits;
    }
    function getBestVersionForMixedData(segments, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        const length = getTotalBitsFromDataArray(segments, currentVersion);
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    exports.from = function from(value, defaultValue) {
      if (VersionCheck.isValid(value)) {
        return parseInt(value, 10);
      }
      return defaultValue;
    };
    exports.getCapacity = function getCapacity(version, errorCorrectionLevel, mode) {
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid QR Code version");
      }
      if (typeof mode === "undefined") mode = Mode.BYTE;
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (mode === Mode.MIXED) return dataTotalCodewordsBits;
      const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
      switch (mode) {
        case Mode.NUMERIC:
          return Math.floor(usableBits / 10 * 3);
        case Mode.ALPHANUMERIC:
          return Math.floor(usableBits / 11 * 2);
        case Mode.KANJI:
          return Math.floor(usableBits / 13);
        case Mode.BYTE:
        default:
          return Math.floor(usableBits / 8);
      }
    };
    exports.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel) {
      let seg;
      const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
      if (Array.isArray(data)) {
        if (data.length > 1) {
          return getBestVersionForMixedData(data, ecl);
        }
        if (data.length === 0) {
          return 1;
        }
        seg = data[0];
      } else {
        seg = data;
      }
      return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
    };
    exports.getEncodedBits = function getEncodedBits(version) {
      if (!VersionCheck.isValid(version) || version < 7) {
        throw new Error("Invalid QR Code version");
      }
      let d = version << 12;
      while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
        d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
      }
      return version << 12 | d;
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/format-info.js
var require_format_info = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/format-info.js"(exports) {
    var Utils = require_utils();
    var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
    var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
    var G15_BCH = Utils.getBCHDigit(G15);
    exports.getEncodedBits = function getEncodedBits(errorCorrectionLevel, mask) {
      const data = errorCorrectionLevel.bit << 3 | mask;
      let d = data << 10;
      while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
        d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
      }
      return (data << 10 | d) ^ G15_MASK;
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/numeric-data.js
var require_numeric_data = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/numeric-data.js"(exports, module2) {
    var Mode = require_mode();
    function NumericData(data) {
      this.mode = Mode.NUMERIC;
      this.data = data.toString();
    }
    NumericData.getBitsLength = function getBitsLength(length) {
      return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
    };
    NumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    NumericData.prototype.getBitsLength = function getBitsLength() {
      return NumericData.getBitsLength(this.data.length);
    };
    NumericData.prototype.write = function write(bitBuffer) {
      let i, group, value;
      for (i = 0; i + 3 <= this.data.length; i += 3) {
        group = this.data.substr(i, 3);
        value = parseInt(group, 10);
        bitBuffer.put(value, 10);
      }
      const remainingNum = this.data.length - i;
      if (remainingNum > 0) {
        group = this.data.substr(i);
        value = parseInt(group, 10);
        bitBuffer.put(value, remainingNum * 3 + 1);
      }
    };
    module2.exports = NumericData;
  }
});

// ../../../../../node_modules/qrcode/lib/core/alphanumeric-data.js
var require_alphanumeric_data = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/alphanumeric-data.js"(exports, module2) {
    var Mode = require_mode();
    var ALPHA_NUM_CHARS = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      " ",
      "$",
      "%",
      "*",
      "+",
      "-",
      ".",
      "/",
      ":"
    ];
    function AlphanumericData(data) {
      this.mode = Mode.ALPHANUMERIC;
      this.data = data;
    }
    AlphanumericData.getBitsLength = function getBitsLength(length) {
      return 11 * Math.floor(length / 2) + 6 * (length % 2);
    };
    AlphanumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    AlphanumericData.prototype.getBitsLength = function getBitsLength() {
      return AlphanumericData.getBitsLength(this.data.length);
    };
    AlphanumericData.prototype.write = function write(bitBuffer) {
      let i;
      for (i = 0; i + 2 <= this.data.length; i += 2) {
        let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
        value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
        bitBuffer.put(value, 11);
      }
      if (this.data.length % 2) {
        bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
      }
    };
    module2.exports = AlphanumericData;
  }
});

// ../../../../../node_modules/qrcode/lib/core/byte-data.js
var require_byte_data = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/byte-data.js"(exports, module2) {
    var Mode = require_mode();
    function ByteData(data) {
      this.mode = Mode.BYTE;
      if (typeof data === "string") {
        this.data = new TextEncoder().encode(data);
      } else {
        this.data = new Uint8Array(data);
      }
    }
    ByteData.getBitsLength = function getBitsLength(length) {
      return length * 8;
    };
    ByteData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    ByteData.prototype.getBitsLength = function getBitsLength() {
      return ByteData.getBitsLength(this.data.length);
    };
    ByteData.prototype.write = function(bitBuffer) {
      for (let i = 0, l = this.data.length; i < l; i++) {
        bitBuffer.put(this.data[i], 8);
      }
    };
    module2.exports = ByteData;
  }
});

// ../../../../../node_modules/qrcode/lib/core/kanji-data.js
var require_kanji_data = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/kanji-data.js"(exports, module2) {
    var Mode = require_mode();
    var Utils = require_utils();
    function KanjiData(data) {
      this.mode = Mode.KANJI;
      this.data = data;
    }
    KanjiData.getBitsLength = function getBitsLength(length) {
      return length * 13;
    };
    KanjiData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    KanjiData.prototype.getBitsLength = function getBitsLength() {
      return KanjiData.getBitsLength(this.data.length);
    };
    KanjiData.prototype.write = function(bitBuffer) {
      let i;
      for (i = 0; i < this.data.length; i++) {
        let value = Utils.toSJIS(this.data[i]);
        if (value >= 33088 && value <= 40956) {
          value -= 33088;
        } else if (value >= 57408 && value <= 60351) {
          value -= 49472;
        } else {
          throw new Error(
            "Invalid SJIS character: " + this.data[i] + "\nMake sure your charset is UTF-8"
          );
        }
        value = (value >>> 8 & 255) * 192 + (value & 255);
        bitBuffer.put(value, 13);
      }
    };
    module2.exports = KanjiData;
  }
});

// ../../../../../node_modules/dijkstrajs/dijkstra.js
var require_dijkstra = __commonJS({
  "../../../../../node_modules/dijkstrajs/dijkstra.js"(exports, module2) {
    "use strict";
    var dijkstra = {
      single_source_shortest_paths: function(graph, s, d) {
        var predecessors = {};
        var costs = {};
        costs[s] = 0;
        var open = dijkstra.PriorityQueue.make();
        open.push(s, 0);
        var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
        while (!open.empty()) {
          closest = open.pop();
          u = closest.value;
          cost_of_s_to_u = closest.cost;
          adjacent_nodes = graph[u] || {};
          for (v in adjacent_nodes) {
            if (adjacent_nodes.hasOwnProperty(v)) {
              cost_of_e = adjacent_nodes[v];
              cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
              cost_of_s_to_v = costs[v];
              first_visit = typeof costs[v] === "undefined";
              if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
                costs[v] = cost_of_s_to_u_plus_cost_of_e;
                open.push(v, cost_of_s_to_u_plus_cost_of_e);
                predecessors[v] = u;
              }
            }
          }
        }
        if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
          var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
          throw new Error(msg);
        }
        return predecessors;
      },
      extract_shortest_path_from_predecessor_list: function(predecessors, d) {
        var nodes = [];
        var u = d;
        var predecessor;
        while (u) {
          nodes.push(u);
          predecessor = predecessors[u];
          u = predecessors[u];
        }
        nodes.reverse();
        return nodes;
      },
      find_path: function(graph, s, d) {
        var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
        return dijkstra.extract_shortest_path_from_predecessor_list(
          predecessors,
          d
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(opts) {
          var T = dijkstra.PriorityQueue, t = {}, key;
          opts = opts || {};
          for (key in T) {
            if (T.hasOwnProperty(key)) {
              t[key] = T[key];
            }
          }
          t.queue = [];
          t.sorter = opts.sorter || T.default_sorter;
          return t;
        },
        default_sorter: function(a, b) {
          return a.cost - b.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(value, cost) {
          var item = { value, cost };
          this.queue.push(item);
          this.queue.sort(this.sorter);
        },
        /**
         * Return the highest priority element in the queue.
         */
        pop: function() {
          return this.queue.shift();
        },
        empty: function() {
          return this.queue.length === 0;
        }
      }
    };
    if (typeof module2 !== "undefined") {
      module2.exports = dijkstra;
    }
  }
});

// ../../../../../node_modules/qrcode/lib/core/segments.js
var require_segments = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/segments.js"(exports) {
    var Mode = require_mode();
    var NumericData = require_numeric_data();
    var AlphanumericData = require_alphanumeric_data();
    var ByteData = require_byte_data();
    var KanjiData = require_kanji_data();
    var Regex = require_regex();
    var Utils = require_utils();
    var dijkstra = require_dijkstra();
    function getStringByteLength(str) {
      return unescape(encodeURIComponent(str)).length;
    }
    function getSegments(regex, mode, str) {
      const segments = [];
      let result;
      while ((result = regex.exec(str)) !== null) {
        segments.push({
          data: result[0],
          index: result.index,
          mode,
          length: result[0].length
        });
      }
      return segments;
    }
    function getSegmentsFromString(dataStr) {
      const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
      const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
      let byteSegs;
      let kanjiSegs;
      if (Utils.isKanjiModeEnabled()) {
        byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
        kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
      } else {
        byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
        kanjiSegs = [];
      }
      const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
      return segs.sort(function(s1, s2) {
        return s1.index - s2.index;
      }).map(function(obj) {
        return {
          data: obj.data,
          mode: obj.mode,
          length: obj.length
        };
      });
    }
    function getSegmentBitsLength(length, mode) {
      switch (mode) {
        case Mode.NUMERIC:
          return NumericData.getBitsLength(length);
        case Mode.ALPHANUMERIC:
          return AlphanumericData.getBitsLength(length);
        case Mode.KANJI:
          return KanjiData.getBitsLength(length);
        case Mode.BYTE:
          return ByteData.getBitsLength(length);
      }
    }
    function mergeSegments(segs) {
      return segs.reduce(function(acc, curr) {
        const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
        if (prevSeg && prevSeg.mode === curr.mode) {
          acc[acc.length - 1].data += curr.data;
          return acc;
        }
        acc.push(curr);
        return acc;
      }, []);
    }
    function buildNodes(segs) {
      const nodes = [];
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        switch (seg.mode) {
          case Mode.NUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.ALPHANUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.KANJI:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
            break;
          case Mode.BYTE:
            nodes.push([
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
        }
      }
      return nodes;
    }
    function buildGraph(nodes, version) {
      const table = {};
      const graph = { start: {} };
      let prevNodeIds = ["start"];
      for (let i = 0; i < nodes.length; i++) {
        const nodeGroup = nodes[i];
        const currentNodeIds = [];
        for (let j = 0; j < nodeGroup.length; j++) {
          const node = nodeGroup[j];
          const key = "" + i + j;
          currentNodeIds.push(key);
          table[key] = { node, lastCount: 0 };
          graph[key] = {};
          for (let n = 0; n < prevNodeIds.length; n++) {
            const prevNodeId = prevNodeIds[n];
            if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
              graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
              table[prevNodeId].lastCount += node.length;
            } else {
              if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;
              graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version);
            }
          }
        }
        prevNodeIds = currentNodeIds;
      }
      for (let n = 0; n < prevNodeIds.length; n++) {
        graph[prevNodeIds[n]].end = 0;
      }
      return { map: graph, table };
    }
    function buildSingleSegment(data, modesHint) {
      let mode;
      const bestMode = Mode.getBestModeForData(data);
      mode = Mode.from(modesHint, bestMode);
      if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
        throw new Error('"' + data + '" cannot be encoded with mode ' + Mode.toString(mode) + ".\n Suggested mode is: " + Mode.toString(bestMode));
      }
      if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
        mode = Mode.BYTE;
      }
      switch (mode) {
        case Mode.NUMERIC:
          return new NumericData(data);
        case Mode.ALPHANUMERIC:
          return new AlphanumericData(data);
        case Mode.KANJI:
          return new KanjiData(data);
        case Mode.BYTE:
          return new ByteData(data);
      }
    }
    exports.fromArray = function fromArray(array) {
      return array.reduce(function(acc, seg) {
        if (typeof seg === "string") {
          acc.push(buildSingleSegment(seg, null));
        } else if (seg.data) {
          acc.push(buildSingleSegment(seg.data, seg.mode));
        }
        return acc;
      }, []);
    };
    exports.fromString = function fromString(data, version) {
      const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());
      const nodes = buildNodes(segs);
      const graph = buildGraph(nodes, version);
      const path = dijkstra.find_path(graph.map, "start", "end");
      const optimizedSegs = [];
      for (let i = 1; i < path.length - 1; i++) {
        optimizedSegs.push(graph.table[path[i]].node);
      }
      return exports.fromArray(mergeSegments(optimizedSegs));
    };
    exports.rawSplit = function rawSplit(data) {
      return exports.fromArray(
        getSegmentsFromString(data, Utils.isKanjiModeEnabled())
      );
    };
  }
});

// ../../../../../node_modules/qrcode/lib/core/qrcode.js
var require_qrcode = __commonJS({
  "../../../../../node_modules/qrcode/lib/core/qrcode.js"(exports) {
    var Utils = require_utils();
    var ECLevel = require_error_correction_level();
    var BitBuffer = require_bit_buffer();
    var BitMatrix = require_bit_matrix();
    var AlignmentPattern = require_alignment_pattern();
    var FinderPattern = require_finder_pattern();
    var MaskPattern = require_mask_pattern();
    var ECCode = require_error_correction_code();
    var ReedSolomonEncoder = require_reed_solomon_encoder();
    var Version = require_version();
    var FormatInfo = require_format_info();
    var Mode = require_mode();
    var Segments = require_segments();
    function setupFinderPattern(matrix, version) {
      const size = matrix.size;
      const pos = FinderPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -1; r <= 7; r++) {
          if (row + r <= -1 || size <= row + r) continue;
          for (let c = -1; c <= 7; c++) {
            if (col + c <= -1 || size <= col + c) continue;
            if (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupTimingPattern(matrix) {
      const size = matrix.size;
      for (let r = 8; r < size - 8; r++) {
        const value = r % 2 === 0;
        matrix.set(r, 6, value, true);
        matrix.set(6, r, value, true);
      }
    }
    function setupAlignmentPattern(matrix, version) {
      const pos = AlignmentPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupVersionInfo(matrix, version) {
      const size = matrix.size;
      const bits = Version.getEncodedBits(version);
      let row, col, mod;
      for (let i = 0; i < 18; i++) {
        row = Math.floor(i / 3);
        col = i % 3 + size - 8 - 3;
        mod = (bits >> i & 1) === 1;
        matrix.set(row, col, mod, true);
        matrix.set(col, row, mod, true);
      }
    }
    function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
      const size = matrix.size;
      const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
      let i, mod;
      for (i = 0; i < 15; i++) {
        mod = (bits >> i & 1) === 1;
        if (i < 6) {
          matrix.set(i, 8, mod, true);
        } else if (i < 8) {
          matrix.set(i + 1, 8, mod, true);
        } else {
          matrix.set(size - 15 + i, 8, mod, true);
        }
        if (i < 8) {
          matrix.set(8, size - i - 1, mod, true);
        } else if (i < 9) {
          matrix.set(8, 15 - i - 1 + 1, mod, true);
        } else {
          matrix.set(8, 15 - i - 1, mod, true);
        }
      }
      matrix.set(size - 8, 8, 1, true);
    }
    function setupData(matrix, data) {
      const size = matrix.size;
      let inc = -1;
      let row = size - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (!matrix.isReserved(row, col - c)) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = (data[byteIndex] >>> bitIndex & 1) === 1;
              }
              matrix.set(row, col - c, dark);
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || size <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
    function createData(version, errorCorrectionLevel, segments) {
      const buffer = new BitBuffer();
      segments.forEach(function(data) {
        buffer.put(data.mode.bit, 4);
        buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));
        data.write(buffer);
      });
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
        buffer.put(0, 4);
      }
      while (buffer.getLengthInBits() % 8 !== 0) {
        buffer.putBit(0);
      }
      const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
      for (let i = 0; i < remainingByte; i++) {
        buffer.put(i % 2 ? 17 : 236, 8);
      }
      return createCodewords(buffer, version, errorCorrectionLevel);
    }
    function createCodewords(bitBuffer, version, errorCorrectionLevel) {
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewords = totalCodewords - ecTotalCodewords;
      const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);
      const blocksInGroup2 = totalCodewords % ecTotalBlocks;
      const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
      const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
      const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
      const rs = new ReedSolomonEncoder(ecCount);
      let offset = 0;
      const dcData = new Array(ecTotalBlocks);
      const ecData = new Array(ecTotalBlocks);
      let maxDataSize = 0;
      const buffer = new Uint8Array(bitBuffer.buffer);
      for (let b = 0; b < ecTotalBlocks; b++) {
        const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
        dcData[b] = buffer.slice(offset, offset + dataSize);
        ecData[b] = rs.encode(dcData[b]);
        offset += dataSize;
        maxDataSize = Math.max(maxDataSize, dataSize);
      }
      const data = new Uint8Array(totalCodewords);
      let index = 0;
      let i, r;
      for (i = 0; i < maxDataSize; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          if (i < dcData[r].length) {
            data[index++] = dcData[r][i];
          }
        }
      }
      for (i = 0; i < ecCount; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          data[index++] = ecData[r][i];
        }
      }
      return data;
    }
    function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
      let segments;
      if (Array.isArray(data)) {
        segments = Segments.fromArray(data);
      } else if (typeof data === "string") {
        let estimatedVersion = version;
        if (!estimatedVersion) {
          const rawSegments = Segments.rawSplit(data);
          estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
        }
        segments = Segments.fromString(data, estimatedVersion || 40);
      } else {
        throw new Error("Invalid data");
      }
      const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
      if (!bestVersion) {
        throw new Error("The amount of data is too big to be stored in a QR Code");
      }
      if (!version) {
        version = bestVersion;
      } else if (version < bestVersion) {
        throw new Error(
          "\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " + bestVersion + ".\n"
        );
      }
      const dataBits = createData(version, errorCorrectionLevel, segments);
      const moduleCount = Utils.getSymbolSize(version);
      const modules = new BitMatrix(moduleCount);
      setupFinderPattern(modules, version);
      setupTimingPattern(modules);
      setupAlignmentPattern(modules, version);
      setupFormatInfo(modules, errorCorrectionLevel, 0);
      if (version >= 7) {
        setupVersionInfo(modules, version);
      }
      setupData(modules, dataBits);
      if (isNaN(maskPattern)) {
        maskPattern = MaskPattern.getBestMask(
          modules,
          setupFormatInfo.bind(null, modules, errorCorrectionLevel)
        );
      }
      MaskPattern.applyMask(maskPattern, modules);
      setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
      return {
        modules,
        version,
        errorCorrectionLevel,
        maskPattern,
        segments
      };
    }
    exports.create = function create2(data, options) {
      if (typeof data === "undefined" || data === "") {
        throw new Error("No input text");
      }
      let errorCorrectionLevel = ECLevel.M;
      let version;
      let mask;
      if (typeof options !== "undefined") {
        errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
        version = Version.from(options.version);
        mask = MaskPattern.from(options.maskPattern);
        if (options.toSJISFunc) {
          Utils.setToSJISFunction(options.toSJISFunc);
        }
      }
      return createSymbol(data, version, errorCorrectionLevel, mask);
    };
  }
});

// ../../../../../node_modules/qrcode/lib/renderer/utils.js
var require_utils2 = __commonJS({
  "../../../../../node_modules/qrcode/lib/renderer/utils.js"(exports) {
    function hex2rgba(hex) {
      if (typeof hex === "number") {
        hex = hex.toString();
      }
      if (typeof hex !== "string") {
        throw new Error("Color should be defined as hex string");
      }
      let hexCode = hex.slice().replace("#", "").split("");
      if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
        throw new Error("Invalid hex color: " + hex);
      }
      if (hexCode.length === 3 || hexCode.length === 4) {
        hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
          return [c, c];
        }));
      }
      if (hexCode.length === 6) hexCode.push("F", "F");
      const hexValue = parseInt(hexCode.join(""), 16);
      return {
        r: hexValue >> 24 & 255,
        g: hexValue >> 16 & 255,
        b: hexValue >> 8 & 255,
        a: hexValue & 255,
        hex: "#" + hexCode.slice(0, 6).join("")
      };
    }
    exports.getOptions = function getOptions(options) {
      if (!options) options = {};
      if (!options.color) options.color = {};
      const margin = typeof options.margin === "undefined" || options.margin === null || options.margin < 0 ? 4 : options.margin;
      const width = options.width && options.width >= 21 ? options.width : void 0;
      const scale = options.scale || 4;
      return {
        width,
        scale: width ? 4 : scale,
        margin,
        color: {
          dark: hex2rgba(options.color.dark || "#000000ff"),
          light: hex2rgba(options.color.light || "#ffffffff")
        },
        type: options.type,
        rendererOpts: options.rendererOpts || {}
      };
    };
    exports.getScale = function getScale(qrSize, opts) {
      return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
    };
    exports.getImageWidth = function getImageWidth(qrSize, opts) {
      const scale = exports.getScale(qrSize, opts);
      return Math.floor((qrSize + opts.margin * 2) * scale);
    };
    exports.qrToImageData = function qrToImageData(imgData, qr, opts) {
      const size = qr.modules.size;
      const data = qr.modules.data;
      const scale = exports.getScale(size, opts);
      const symbolSize = Math.floor((size + opts.margin * 2) * scale);
      const scaledMargin = opts.margin * scale;
      const palette = [opts.color.light, opts.color.dark];
      for (let i = 0; i < symbolSize; i++) {
        for (let j = 0; j < symbolSize; j++) {
          let posDst = (i * symbolSize + j) * 4;
          let pxColor = opts.color.light;
          if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
            const iSrc = Math.floor((i - scaledMargin) / scale);
            const jSrc = Math.floor((j - scaledMargin) / scale);
            pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
          }
          imgData[posDst++] = pxColor.r;
          imgData[posDst++] = pxColor.g;
          imgData[posDst++] = pxColor.b;
          imgData[posDst] = pxColor.a;
        }
      }
    };
  }
});

// ../../../../../node_modules/qrcode/lib/renderer/canvas.js
var require_canvas = __commonJS({
  "../../../../../node_modules/qrcode/lib/renderer/canvas.js"(exports) {
    var Utils = require_utils2();
    function clearCanvas(ctx, canvas, size) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!canvas.style) canvas.style = {};
      canvas.height = size;
      canvas.width = size;
      canvas.style.height = size + "px";
      canvas.style.width = size + "px";
    }
    function getCanvasElement() {
      try {
        return document.createElement("canvas");
      } catch (e) {
        throw new Error("You need to specify a canvas element");
      }
    }
    exports.render = function render(qrData, canvas, options) {
      let opts = options;
      let canvasEl = canvas;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!canvas) {
        canvasEl = getCanvasElement();
      }
      opts = Utils.getOptions(opts);
      const size = Utils.getImageWidth(qrData.modules.size, opts);
      const ctx = canvasEl.getContext("2d");
      const image = ctx.createImageData(size, size);
      Utils.qrToImageData(image.data, qrData, opts);
      clearCanvas(ctx, canvasEl, size);
      ctx.putImageData(image, 0, 0);
      return canvasEl;
    };
    exports.renderToDataURL = function renderToDataURL(qrData, canvas, options) {
      let opts = options;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!opts) opts = {};
      const canvasEl = exports.render(qrData, canvas, opts);
      const type = opts.type || "image/png";
      const rendererOpts = opts.rendererOpts || {};
      return canvasEl.toDataURL(type, rendererOpts.quality);
    };
  }
});

// ../../../../../node_modules/qrcode/lib/renderer/svg-tag.js
var require_svg_tag = __commonJS({
  "../../../../../node_modules/qrcode/lib/renderer/svg-tag.js"(exports) {
    var Utils = require_utils2();
    function getColorAttrib(color, attrib) {
      const alpha = color.a / 255;
      const str = attrib + '="' + color.hex + '"';
      return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
    }
    function svgCmd(cmd, x, y) {
      let str = cmd + x;
      if (typeof y !== "undefined") str += " " + y;
      return str;
    }
    function qrToPath(data, size, margin) {
      let path = "";
      let moveBy = 0;
      let newRow = false;
      let lineLength = 0;
      for (let i = 0; i < data.length; i++) {
        const col = Math.floor(i % size);
        const row = Math.floor(i / size);
        if (!col && !newRow) newRow = true;
        if (data[i]) {
          lineLength++;
          if (!(i > 0 && col > 0 && data[i - 1])) {
            path += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0);
            moveBy = 0;
            newRow = false;
          }
          if (!(col + 1 < size && data[i + 1])) {
            path += svgCmd("h", lineLength);
            lineLength = 0;
          }
        } else {
          moveBy++;
        }
      }
      return path;
    }
    exports.render = function render(qrData, options, cb) {
      const opts = Utils.getOptions(options);
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const qrcodesize = size + opts.margin * 2;
      const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>';
      const path = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size, opts.margin) + '"/>';
      const viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"';
      const width = !opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ';
      const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + "</svg>\n";
      if (typeof cb === "function") {
        cb(null, svgTag);
      }
      return svgTag;
    };
  }
});

// ../../../../../node_modules/qrcode/lib/browser.js
var require_browser = __commonJS({
  "../../../../../node_modules/qrcode/lib/browser.js"(exports) {
    var canPromise = require_can_promise();
    var QRCode = require_qrcode();
    var CanvasRenderer = require_canvas();
    var SvgRenderer = require_svg_tag();
    function renderCanvas(renderFunc, canvas, text, opts, cb) {
      const args = [].slice.call(arguments, 1);
      const argsNum = args.length;
      const isLastArgCb = typeof args[argsNum - 1] === "function";
      if (!isLastArgCb && !canPromise()) {
        throw new Error("Callback required as last argument");
      }
      if (isLastArgCb) {
        if (argsNum < 2) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 2) {
          cb = text;
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 3) {
          if (canvas.getContext && typeof cb === "undefined") {
            cb = opts;
            opts = void 0;
          } else {
            cb = opts;
            opts = text;
            text = canvas;
            canvas = void 0;
          }
        }
      } else {
        if (argsNum < 1) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 1) {
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 2 && !canvas.getContext) {
          opts = text;
          text = canvas;
          canvas = void 0;
        }
        return new Promise(function(resolve, reject) {
          try {
            const data = QRCode.create(text, opts);
            resolve(renderFunc(data, canvas, opts));
          } catch (e) {
            reject(e);
          }
        });
      }
      try {
        const data = QRCode.create(text, opts);
        cb(null, renderFunc(data, canvas, opts));
      } catch (e) {
        cb(e);
      }
    }
    exports.create = QRCode.create;
    exports.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
    exports.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
    exports.toString = renderCanvas.bind(null, function(data, _, opts) {
      return SvgRenderer.render(data, opts);
    });
  }
});

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react3 = require("react");

// src/client/styles.ts
var panelStyles = `
.dshm {
  --dm-text: var(--dsw-alias-label-primary, #20242b);
  --dm-muted: var(--dsw-alias-label-secondary, #686d76);
  --dm-border: var(--dsw-alias-border-l3, #e1e3e7);
  --dm-surface: var(--dsw-alias-bg-layer-1, #fff);
  --dm-hover: var(--dsw-alias-interactive-bg-hover, #f3f4f6);
  --dm-warning: var(--dsw-alias-state-warning-primary, #976318);
  --dm-error: var(--dsw-alias-state-error-primary, #bf4545);
  width: 100%; min-width: 0; max-width: 760px; box-sizing: border-box;
  color: var(--dm-text); font-family: var(--dsw-font-family, system-ui, sans-serif);
  font-size: 14px; line-height: 1.6;
}
.dshm *, .dshm *::before, .dshm *::after { box-sizing: border-box; }
.dshm h2, .dshm h3, .dshm p { margin: 0; }
.dshm h2 { font-size: 17px; font-weight: 600; line-height: 1.5; }
.dshm h3 { font-size: 14px; font-weight: 600; }
.dshm .dm-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
.dshm .dm-intro { margin-top: 6px; max-width: 54ch; color: var(--dm-muted); font-size: 13px; }
.dshm .dm-status { display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0; padding: 4px 10px; border: 1px solid var(--dm-border); border-radius: 20px; font-size: 12px; color: var(--dm-muted); }
.dshm .dm-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.dshm .dm-status[data-state="online"] { color: var(--dsw-alias-state-success-primary, #26835b); }
.dshm .dm-status[data-state="connecting"], .dshm .dm-status[data-state="reconnecting"] { color: var(--dm-warning); }
.dshm .dm-status[data-state="credential_rejected"] { color: var(--dm-error); }
.dshm .dm-form { display: grid; gap: 20px; }
.dshm .dm-choices { display: grid; gap: 10px; min-width: 0; margin: 0; padding: 0; border: 0; }
.dshm .dm-choices legend { margin-bottom: 10px; }
.dshm .dm-result { margin-bottom: 18px; }
.dshm .dm-fields { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; }
.dshm .dm-field { display: grid; align-content: start; gap: 7px; min-width: 0; }
.dshm .dm-label { font-size: 13px; font-weight: 500; }
.dshm .dm-input { appearance: none; width: 100%; min-width: 0; height: 40px; padding: 8px 12px; border: 1px solid var(--dm-border); border-radius: 9px; background: var(--dm-surface); color: var(--dm-text); font: inherit; line-height: 22px; }
.dshm .dm-input::placeholder { color: var(--dsw-alias-label-dimmed, #989ca4); }
.dshm .dm-input:disabled { opacity: .6; }
.dshm .dm-input:focus-visible, .dshm .dm-button:focus-visible, .dshm .dm-check input:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4268bb); outline-offset: 3px; }
.dshm .dm-help { color: var(--dm-muted); font-size: 12px; overflow-wrap: anywhere; }
.dshm code { font-family: var(--ds-font-family-code, Consolas, monospace); font-size: 12px; overflow-wrap: anywhere; }
.dshm .dm-note { padding: 12px 14px; border-radius: 9px; background: var(--dm-hover); color: var(--dm-muted); font-size: 12px; }
.dshm .dm-notice { margin-bottom: 18px; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--dm-warning) 30%, transparent); border-radius: 9px; background: color-mix(in srgb, var(--dm-warning) 8%, var(--dm-surface)); font-size: 13px; }
.dshm .dm-notice strong { display: block; margin-bottom: 2px; color: var(--dm-warning); font-weight: 600; }
.dshm .dm-notice-error { border-color: color-mix(in srgb, var(--dm-error) 30%, transparent); background: color-mix(in srgb, var(--dm-error) 8%, var(--dm-surface)); overflow-wrap: anywhere; }
.dshm .dm-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.dshm .dm-button { appearance: none; display: inline-flex; align-items: center; justify-content: center; width: auto; min-height: 36px; padding: 7px 16px; border: 1px solid var(--dm-border); border-radius: 18px; background: transparent; color: var(--dm-text); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer; }
.dshm .dm-button:hover:not(:disabled) { background: var(--dm-hover); }
.dshm .dm-button:active:not(:disabled) { transform: translateY(1px); }
.dshm .dm-button:disabled { cursor: not-allowed; opacity: .45; }
.dshm .dm-primary { background: var(--dsw-alias-button-primary-fill, #252830); color: var(--dsw-alias-label-primary-foreground, #fff); border-color: transparent; }
.dshm .dm-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover, #40444d); }
.dshm .dm-danger { color: var(--dm-error); }
.dshm .dm-connection { display: grid; gap: 16px; }
.dshm .dm-address { color: var(--dm-muted); font-size: 13px; overflow-wrap: anywhere; }
.dshm .dm-pair { display: grid; gap: 10px; margin-top: 18px; padding: 16px; border: 1px solid var(--dm-border); border-radius: 12px; }
.dshm .dm-pair-qr { display: block; width: 256px; max-width: 100%; height: auto; aspect-ratio: 1; background: #fff; }
.dshm .dm-section { margin-top: 28px; padding-top: 22px; border-top: 1px solid var(--dm-border); }
.dshm .dm-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.dshm .dm-count { font-size: 12px; color: var(--dm-muted); }
.dshm .dm-empty { padding: 22px 16px; text-align: center; border: 1px dashed var(--dm-border); border-radius: 12px; }
.dshm .dm-empty p { margin-top: 4px; font-size: 12px; color: var(--dm-muted); }
.dshm .dm-device { padding: 16px 0; border-top: 1px solid var(--dm-border); display: grid; gap: 10px; }
.dshm .dm-device:first-child { border-top: 0; padding-top: 0; }
.dshm .dm-device-head { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; justify-content: space-between; }
.dshm .dm-device-name { overflow-wrap: anywhere; min-width: 0; }
.dshm .dm-tag { font-size: 12px; padding: 2px 8px; border-radius: 6px; background: var(--dm-hover); color: var(--dm-muted); }
.dshm .dm-tag[data-state="pending"] { color: var(--dm-warning); }
.dshm .dm-tag[data-state="active"] { color: var(--dsw-alias-state-success-primary, #26835b); }
.dshm .dm-fingerprint { padding: 10px 12px; background: var(--dm-hover); border-radius: 8px; }
.dshm .dm-fingerprint code { display: block; margin-top: 4px; user-select: all; }
.dshm .dm-check { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
.dshm .dm-check input { width: 16px; height: 16px; margin: 0; accent-color: var(--dsw-alias-brand-primary, #4268bb); flex-shrink: 0; }
.dshm .dm-loading { display: grid; gap: 16px; padding: 12px 0; }
.dshm .dm-skeleton { height: 40px; background: var(--dm-hover); border-radius: 9px; }
.dshm .dm-skeleton:last-child { width: 40%; height: 16px; }
@media (max-width: 600px) {
  .dshm .dm-fields { grid-template-columns: minmax(0, 1fr); }
  .dshm .dm-head { flex-direction: column; gap: 12px; }
  .dshm .dm-pair { padding: 12px; }
}
`;

// src/client/pair-card.tsx
var import_react = require("react");

// src/client/pair-link.ts
var import_qrcode = __toESM(require_browser(), 1);
function appPairLink(link) {
  const url = new URL(link);
  if (url.href !== link || !["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/pair" || url.search || !/^#key=[A-Za-z0-9_-]{43}$/.test(url.hash)) {
    throw new Error("invalid_pair_link");
  }
  const result = `dshm://pair?server=${encodeURIComponent(url.origin)}${url.hash}`;
  if (result.length > 4096) throw new Error("invalid_pair_link");
  return result;
}
function pairQr(link) {
  const { modules } = (0, import_qrcode.create)(link, { errorCorrectionLevel: "M" });
  const quiet = 4;
  const segments = [];
  for (let y = 0; y < modules.size; y++) {
    for (let x = 0; x < modules.size; x++) {
      if (modules.get(y, x)) segments.push(`M${x + quiet},${y + quiet}h1v1h-1z`);
    }
  }
  return { size: modules.size + quiet * 2, path: segments.join("") };
}

// src/client/pair-card.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function PairCard({ link, onHide }) {
  const [copyStatus, setCopyStatus] = (0, import_react.useState)("");
  const appLink = (0, import_react.useMemo)(() => {
    try {
      return appPairLink(link);
    } catch {
      return void 0;
    }
  }, [link]);
  const qr = (0, import_react.useMemo)(() => {
    try {
      return appLink ? pairQr(appLink) : void 0;
    } catch {
      return void 0;
    }
  }, [appLink]);
  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("\u94FE\u63A5\u5DF2\u590D\u5236");
    } catch {
      setCopyStatus("\u65E0\u6CD5\u81EA\u52A8\u590D\u5236\uFF0C\u8BF7\u9009\u4E2D\u4E0B\u65B9\u94FE\u63A5\u624B\u52A8\u590D\u5236\u3002");
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dm-pair", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u8FDE\u63A5\u624B\u673A" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dm-help", children: "5 \u5206\u949F\u5185\u6709\u6548\uFF0C\u9886\u53D6\u540E\u7ACB\u5373\u5931\u6548\u3002\u8BF7\u4F7F\u7528\u652F\u6301\u6253\u5F00 App \u94FE\u63A5\u7684\u626B\u7801\u5DE5\u5177\uFF0C\u626B\u63CF\u540E\u5728 DSHM \u4E2D\u786E\u8BA4\u8FDE\u63A5\uFF0C\u518D\u5728\u7535\u8111\u4E0A\u6838\u5BF9\u6307\u7EB9\u5E76\u6279\u51C6\u3002" }),
    qr ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { className: "dm-pair-qr", role: "img", "aria-label": "\u5728 DSHM \u4E2D\u6253\u5F00\u914D\u5BF9\u7684\u4E8C\u7EF4\u7801", viewBox: `0 0 ${qr.size} ${qr.size}`, shapeRendering: "crispEdges", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { width: qr.size, height: qr.size, fill: "#fff" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: qr.path, fill: "#000" })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dm-help", role: "status", children: "\u4E8C\u7EF4\u7801\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u590D\u5236\u914D\u5BF9\u94FE\u63A5\u3002" }),
    appLink && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dm-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dm-label", children: "App \u914D\u5BF9\u94FE\u63A5" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dm-input", "aria-label": "App \u914D\u5BF9\u94FE\u63A5", readOnly: true, value: appLink, onFocus: (e) => e.target.select() })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dm-actions", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "dm-button", onClick: () => void copy(appLink), children: "\u590D\u5236 App \u94FE\u63A5" }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dm-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dm-label", children: "\u7C98\u8D34\u5230 DSHM" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dm-input", "aria-label": "\u4E00\u6B21\u6027\u914D\u5BF9\u94FE\u63A5", readOnly: true, value: link, onFocus: (e) => e.target.select() })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dm-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "dm-button", onClick: () => void copy(link), children: "\u590D\u5236\u914D\u5BF9\u94FE\u63A5" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "dm-button", onClick: onHide, children: "\u9690\u85CF\u94FE\u63A5\u548C\u4E8C\u7EF4\u7801" })
    ] }),
    copyStatus && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dm-help", role: "status", children: copyStatus })
  ] });
}

// src/client/feedback-sync-slot.tsx
var import_react2 = require("react");

// src/client/feedback-sync.ts
var DesktopFeedbackSync = class {
  constructor(connect) {
    this.connect = connect;
  }
  active = /* @__PURE__ */ new Map();
  subscribe(controller, sessionId, listener) {
    let state = this.active.get(controller);
    if (!state) {
      const listeners = /* @__PURE__ */ new Set();
      let disposed = false, pending = false, dirty = false, connected = false, revision;
      const events = this.connect(sessionId);
      const publish = (failed) => {
        if (!disposed) for (const fn of listeners) fn(failed);
      };
      const refresh = async () => {
        dirty = true;
        if (pending || disposed) return;
        pending = true;
        try {
          while (dirty && !disposed) {
            dirty = false;
            const result = await controller.resync();
            publish(!result.ok || !connected);
          }
        } catch {
          publish(true);
        } finally {
          pending = false;
        }
      };
      events.onmessage = (event) => {
        if (disposed) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === "ready" && message.revision === 0) {
            revision = 0;
            connected = true;
          } else if (message.type === "changed" && revision !== void 0 && Number.isSafeInteger(message.revision) && message.revision > revision) revision = message.revision;
          else throw new Error("invalid feedback notification");
          void refresh();
        } catch {
          connected = false;
          publish(true);
          events.close();
        }
      };
      events.onerror = () => {
        if (!disposed) {
          connected = false;
          revision = void 0;
          publish(true);
        }
      };
      state = { listeners, close: () => {
        disposed = true;
        events.onmessage = null;
        events.onerror = null;
        events.close();
      } };
      this.active.set(controller, state);
    }
    state.listeners.add(listener);
    const subscribed = state;
    let subscribedHere = true;
    return () => {
      if (!subscribedHere) return;
      subscribedHere = false;
      subscribed.listeners.delete(listener);
      if (!subscribed.listeners.size) {
        subscribed.close();
        this.active.delete(controller);
      }
    };
  }
  dispose() {
    for (const state of this.active.values()) state.close();
    this.active.clear();
  }
};

// src/client/feedback-sync-slot.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var slot = "conversation.chat.assistant-actions";
function registerDesktopFeedbackSync(ctx) {
  const sync = new DesktopFeedbackSync((sessionId) => new EventSource(`/api/dsh-mobile/feedback-events?sessionId=${encodeURIComponent(sessionId)}`));
  ctx.effect(() => () => sync.dispose(), "dsh-mobile: desktop feedback sync");
  const subscribe = (listener) => ctx.slots.subscribe(slot, listener);
  const snapshot = () => ctx.slots.entries(slot);
  function FeedbackSync({ sessionId }) {
    const entries = (0, import_react2.useSyncExternalStore)(subscribe, snapshot, snapshot);
    const [failed, setFailed] = (0, import_react2.useState)(false);
    (0, import_react2.useEffect)(() => {
      setFailed(false);
      const entry = ctx.slots.entriesOfSlot(slot).find((entry2) => entry2.options.id === "feedback" && entry2.locale === "feedback");
      if (!entry?.inject) return;
      const inject2 = entry.inject;
      const controller = inject2(sessionId).hooks?.feedback;
      if (typeof controller?.resync !== "function") return;
      return sync.subscribe(controller, sessionId, setFailed);
    }, [entries, sessionId]);
    return failed ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { role: "status", children: "\u8BC4\u4EF7\u540C\u6B65\u6682\u65F6\u4E2D\u65AD\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u4F1A\u8BDD\u3002" }) : null;
  }
  ctx.slots.inject("conversation.input.overlay", () => ctx.slots.register({
    name: "conversation.input.overlay",
    id: "dsh-mobile-feedback-sync",
    order: 3
  }, FeedbackSync));
}

// src/client/index.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var stateLabels = { disabled: "\u5DF2\u5173\u95ED", connecting: "\u6B63\u5728\u8FDE\u63A5", online: "\u5DF2\u8FDE\u63A5", reconnecting: "\u6B63\u5728\u91CD\u8FDE", credential_rejected: "\u51ED\u636E\u88AB\u62D2\u7EDD\u6216\u7535\u8111\u8FDE\u63A5\u91CD\u590D" };
var errors = {
  enrollment_credential_missing: "\u8BF7\u586B\u5199\u6CE8\u518C\u5BC6\u94A5\uFF0C\u4F7F\u7528\u540E\u7AEF ENROLLMENT_TOKEN \u7684\u503C\u3002",
  enrollment_credential_invalid: "\u6CE8\u518C\u5BC6\u94A5\u683C\u5F0F\u4E0D\u6B63\u786E\uFF0C\u8BF7\u7C98\u8D34\u540E\u7AEF ENROLLMENT_TOKEN \u7684\u5B8C\u6574\u503C\uFF0843 \u4F4D\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u4E0B\u5212\u7EBF\u6216\u8FDE\u5B57\u7B26\uFF09\u3002",
  enrollment_credential_unavailable: "\u65E0\u6CD5\u8BFB\u53D6\u672C\u673A\u6CE8\u518C\u51ED\u636E\uFF0C\u8BF7\u5728\u4E0B\u65B9\u76F4\u63A5\u586B\u5199\u6CE8\u518C\u5BC6\u94A5\u3002",
  gateway_unreachable: "\u65E0\u6CD5\u8FDE\u63A5\u540E\u7AEF\uFF0C\u8BF7\u68C0\u67E5\u670D\u52A1\u5730\u5740\u53CA\u540E\u7AEF\u662F\u5426\u6B63\u5728\u8FD0\u884C\u3002",
  gateway_timeout: "\u8FDE\u63A5\u540E\u7AEF\u8D85\u65F6\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5\u3002",
  invalid_gateway_origin: "\u8BF7\u8F93\u5165 HTTP \u6216 HTTPS \u670D\u52A1\u6839\u5730\u5740\uFF0C\u4E0D\u542B\u8DEF\u5F84\u3001\u8D26\u53F7\u3001\u67E5\u8BE2\u53C2\u6570\u6216\u7247\u6BB5\u3002",
  already_configured: "\u8FD9\u53F0\u7535\u8111\u5DF2\u7ECF\u5B8C\u6210\u6CE8\u518C\u3002",
  gateway_http_401: "\u670D\u52A1\u62D2\u7EDD\u4E86\u51ED\u636E\uFF1B\u9996\u6B21\u6CE8\u518C\u65F6\uFF0C\u8BF7\u786E\u8BA4\u6CE8\u518C\u5BC6\u94A5\u4E0E\u540E\u7AEF ENROLLMENT_TOKEN \u4E00\u81F4\u3002",
  gateway_http_404: "\u8BBE\u5907\u72B6\u6001\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5\u3002",
  connection_change_confirmation_required: "\u8BF7\u5148\u786E\u8BA4\u672C\u6B21\u5730\u5740\u4FEE\u6539\u65B9\u5F0F\u3002",
  connection_config_changed: "\u8FDE\u63A5\u914D\u7F6E\u5DF2\u5728\u5176\u4ED6\u9875\u9762\u4FEE\u6539\u3002\u8BF7\u53D6\u6D88\u7F16\u8F91\uFF0C\u91CD\u65B0\u6253\u5F00\u540E\u518D\u8BD5\u3002",
  credential_write_failed: "\u65E0\u6CD5\u4FDD\u5B58\u7535\u8111\u8FDE\u63A5\u914D\u7F6E\uFF0C\u539F\u8FDE\u63A5\u672A\u66F4\u6539\uFF0C\u8BF7\u91CD\u8BD5\u3002"
};
async function api(body) {
  const response = await fetch("/api/dsh-mobile", {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : void 0,
    signal: AbortSignal.timeout(2e4)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(errors[data.error] ?? "\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7535\u8111\u8FDE\u63A5\u548C\u516C\u7F51\u670D\u52A1\u540E\u91CD\u8BD5\u3002", { cause: data.error });
  return data;
}
function ManagementPanel() {
  const fieldId = (0, import_react3.useId)();
  const [status, setStatus] = (0, import_react3.useState)(), [error, setError] = (0, import_react3.useState)(""), [busy, setBusy] = (0, import_react3.useState)(false);
  const [pollError, setPollError] = (0, import_react3.useState)("");
  const [enrollmentToken, setEnrollmentToken] = (0, import_react3.useState)("");
  const [origin, setOrigin] = (0, import_react3.useState)(""), [name, setName] = (0, import_react3.useState)("\u6211\u7684\u7535\u8111"), [confirmed, setConfirmed] = (0, import_react3.useState)();
  const [server, setServer] = (0, import_react3.useState)();
  const [modeAttempt, setModeAttempt] = (0, import_react3.useState)(0);
  const mode = server?.origin === origin.trim() ? server.info?.registrationMode : void 0;
  const [pair, setPair] = (0, import_react3.useState)();
  const [grantDevice, setGrantDevice] = (0, import_react3.useState)();
  const [editing, setEditing] = (0, import_react3.useState)(false), [editKind, setEditKind] = (0, import_react3.useState)("same");
  const [editConfirmed, setEditConfirmed] = (0, import_react3.useState)(false), [editRevision, setEditRevision] = (0, import_react3.useState)();
  const [notice, setNotice] = (0, import_react3.useState)("");
  const refresh = (0, import_react3.useCallback)(async () => {
    try {
      setStatus(await api());
      setPollError("");
    } catch (e) {
      setPollError(e instanceof Error ? e.message : "\u65E0\u6CD5\u8BFB\u53D6\u72B6\u6001");
    }
  }, []);
  (0, import_react3.useEffect)(() => {
    if (status?.configured) setEnrollmentToken("");
  }, [status?.configured]);
  (0, import_react3.useEffect)(() => {
    if (status?.configured && !editing || !origin.trim()) return;
    let active = true;
    setServer(void 0);
    const address = origin.trim();
    const timer = setTimeout(() => {
      void api({ action: "server-info", origin: address }).then((info) => {
        if (active) {
          setServer({ origin: address, info });
          if (info.registrationMode === "open") setEnrollmentToken("");
        }
      }).catch((e) => {
        if (active) setServer({ origin: address, error: e instanceof Error ? e.message : "\u65E0\u6CD5\u8BFB\u53D6\u670D\u52A1\u6A21\u5F0F" });
      });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [origin, status?.configured, editing, modeAttempt]);
  (0, import_react3.useEffect)(() => {
    let active = true, timer;
    const poll = async () => {
      try {
        const value = await api();
        if (active) {
          setStatus(value);
          setPollError("");
        }
      } catch (e) {
        if (active) setPollError(e instanceof Error ? e.message : "\u65E0\u6CD5\u8BFB\u53D6\u72B6\u6001");
      }
      if (active) timer = setTimeout(() => {
        void poll();
      }, 5e3);
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);
  (0, import_react3.useEffect)(() => {
    if (!pair) return;
    const timer = setTimeout(() => setPair(void 0), Math.max(0, Date.parse(pair.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [pair]);
  async function act(body) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api(body);
      if (body.action === "setup") setEnrollmentToken("");
      if (body.action === "pair") setPair(result);
      if (body.action === "approve" || body.action === "revoke") {
        setConfirmed(void 0);
        setPair(void 0);
      }
      if (body.action === "change-origin" || body.action === "replace-server") {
        setEditing(false);
        setEnrollmentToken("");
        setEditConfirmed(false);
        setConfirmed(void 0);
        setGrantDevice(void 0);
        setPair(void 0);
        setNotice(body.action === "change-origin" ? "\u670D\u52A1\u5730\u5740\u5DF2\u66F4\u65B0\uFF0C\u7535\u8111\u8EAB\u4EFD\u548C\u539F\u8BBE\u5907\u6388\u6743\u5DF2\u4FDD\u7559\u3002\u624B\u673A\u4E0D\u4F1A\u81EA\u52A8\u66F4\u65B0\u5730\u5740\uFF0C\u8BF7\u4F7F\u7528\u65B0\u914D\u5BF9\u94FE\u63A5\u91CD\u65B0\u8FDE\u63A5\u3002" : "\u5DF2\u5207\u6362\u5230\u65B0\u670D\u52A1\uFF0C\u8BF7\u91CD\u65B0\u914D\u5BF9\u624B\u673A\u3002\u65E7\u670D\u52A1\u4E0A\u7684\u8BBE\u5907\u6388\u6743\u4E0D\u4F1A\u81EA\u52A8\u64A4\u9500\u3002");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? body.action === "change-origin" && e.cause === "gateway_http_401" ? "\u65B0\u5730\u5740\u4E0D\u63A5\u53D7\u5F53\u524D\u7535\u8111\u51ED\u636E\u3002\u8BF7\u786E\u8BA4\u5730\u5740\u5C5E\u4E8E\u540C\u4E00\u540E\u7AEF\uFF1B\u82E5\u6362\u4E86\u670D\u52A1\uFF0C\u9009\u62E9\u201C\u66F4\u6362\u540E\u7AEF\u201D\u91CD\u65B0\u6CE8\u518C\u3002" : e.message : "\u64CD\u4F5C\u5931\u8D25");
      if (body.action === "setup" || body.action === "replace-server") setModeAttempt((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }
  function editConnection() {
    setOrigin(status?.origin ?? "");
    setName(status?.name ?? "\u6211\u7684\u7535\u8111");
    setEditRevision(status?.configRevision);
    setEditKind("same");
    setEditConfirmed(false);
    setEnrollmentToken("");
    setServer(void 0);
    setPair(void 0);
    setError("");
    setNotice("");
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setEnrollmentToken("");
    setEditConfirmed(false);
    setError("");
  }
  const replacing = editing && editKind === "new";
  const insecure = /^http:/i.test((status?.configured && !editing ? status.origin ?? "" : origin).trim());
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "dshm", "aria-label": "DSH Mobile \u7535\u8111\u8FDE\u63A5", "aria-busy": busy, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("style", { children: panelStyles }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "dm-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: "\u8FDC\u7A0B\u8FDE\u63A5" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dm-intro", children: "\u8BA9\u5DF2\u6279\u51C6\u7684\u8BBE\u5907\u67E5\u770B\u4EFB\u52A1\u3001\u9605\u8BFB\u804A\u5929\u5E76\u7EE7\u7EED\u4F1A\u8BDD\u3002\u4F7F\u7528\u65F6\u8BF7\u4FDD\u6301\u7535\u8111\u548C dsh \u8FD0\u884C\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dm-status", "data-state": pollError ? "credential_rejected" : status?.connection, role: "status", children: pollError ? "\u72B6\u6001\u8BFB\u53D6\u5931\u8D25" : status ? stateLabels[status.connection] ?? "\u672A\u77E5\u72B6\u6001" : "\u8BFB\u53D6\u72B6\u6001\u4E2D" })
    ] }),
    (error || pollError) && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dm-notice dm-notice-error", role: "alert", children: error || pollError }),
    notice && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dm-note dm-result", role: "status", children: notice }),
    insecure && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("aside", { className: "dm-notice", role: "status", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "HTTP \u8FDE\u63A5\u4E0D\u5B89\u5168" }),
      "\u8FDE\u63A5\u672A\u52A0\u5BC6\uFF0C\u51ED\u636E\u548C\u804A\u5929\u5185\u5BB9\u53EF\u80FD\u88AB\u7A83\u542C\u6216\u7BE1\u6539\u3002\u4F60\u4ECD\u53EF\u7EE7\u7EED\u8FDE\u63A5\uFF0C\u5EFA\u8BAE\u4F7F\u7528 HTTPS\u3002"
    ] }),
    !status ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-loading", "aria-label": "\u6B63\u5728\u8BFB\u53D6\u8FDE\u63A5\u72B6\u6001", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dm-skeleton" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dm-skeleton" })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_jsx_runtime3.Fragment, { children: !status.configured || editing ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("form", { className: "dm-form", "aria-label": editing ? "\u4FEE\u6539\u670D\u52A1\u5730\u5740" : "\u6CE8\u518C\u7535\u8111", onSubmit: (event) => {
      event.preventDefault();
      if (!mode || editing && (!editConfirmed || !editRevision)) return;
      const registration = { name, ...mode === "private" && enrollmentToken.trim() ? { enrollmentToken: enrollmentToken.trim() } : {} };
      void act(editing ? {
        action: replacing ? "replace-server" : "change-origin",
        origin: origin.trim(),
        expectedRevision: editRevision,
        confirmed: editConfirmed,
        ...replacing ? registration : {}
      } : { action: "setup", origin: origin.trim(), ...registration });
    }, children: [
      editing && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { children: "\u4FEE\u6539\u670D\u52A1\u5730\u5740" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "dm-help", children: [
          "\u5F53\u524D\u670D\u52A1\uFF1A",
          status.origin,
          "\u3002\u4FDD\u5B58\u6210\u529F\u524D\uFF0C\u7EE7\u7EED\u4F7F\u7528\u539F\u8FDE\u63A5\u3002"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("fieldset", { className: "dm-choices", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("legend", { className: "dm-label", children: "\u8FD9\u6B21\u4FEE\u6539\u5C5E\u4E8E\u54EA\u79CD\u60C5\u51B5\uFF1F" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "dm-check", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { type: "radio", name: fieldId + "-kind", checked: editKind === "same", disabled: busy, onChange: () => {
              setEditKind("same");
              setEditConfirmed(false);
              setEnrollmentToken("");
              setError("");
            } }),
            "\u540C\u4E00\u540E\u7AEF\u6362\u5730\u5740\uFF0C\u4FDD\u7559\u8BBE\u5907\u6388\u6743"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "dm-check", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { type: "radio", name: fieldId + "-kind", checked: editKind === "new", disabled: busy, onChange: () => {
              setEditKind("new");
              setEditConfirmed(false);
              setEnrollmentToken("");
              setError("");
            } }),
            "\u66F4\u6362\u540E\u7AEF\uFF0C\u91CD\u65B0\u6CE8\u518C\u548C\u914D\u5BF9"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-fields", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: "dm-label", htmlFor: fieldId + "-origin", children: "\u670D\u52A1\u5730\u5740" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { className: "dm-input", id: fieldId + "-origin", "aria-describedby": fieldId + "-origin-help", required: true, disabled: busy, type: "url", placeholder: "https://relay.example.com", value: origin, onChange: (e) => {
            setOrigin(e.target.value);
            setServer(void 0);
            setEnrollmentToken("");
            setEditConfirmed(false);
            setError("");
          } }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dm-help", id: fieldId + "-origin-help", children: "\u652F\u6301 HTTP / HTTPS\uFF0C\u586B\u5199\u6839\u5730\u5740\u5373\u53EF\u3002" })
        ] }),
        (!editing || replacing) && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: "dm-label", htmlFor: fieldId + "-name", children: "\u7535\u8111\u540D\u79F0" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { className: "dm-input", id: fieldId + "-name", required: true, disabled: busy, maxLength: 80, value: name, onChange: (e) => setName(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dm-note", role: "status", children: editing && !replacing && mode ? "\u670D\u52A1\u53EF\u8BBF\u95EE\u3002\u4FDD\u5B58\u65F6\u5C06\u9A8C\u8BC1\u5F53\u524D\u7535\u8111\u51ED\u636E\uFF0C\u4E0D\u9700\u8981\u91CD\u65B0\u586B\u5199\u6CE8\u518C\u5BC6\u94A5\u3002" : mode === "open" ? "\u5F00\u653E\u4F7F\u7528 \xB7 \u65E0\u9700\u6CE8\u518C\u5BC6\u94A5\uFF0C\u53EF\u76F4\u63A5\u6CE8\u518C\u8FD9\u53F0\u7535\u8111\u3002" : mode === "private" ? replacing ? "\u4E2A\u4EBA\u4F7F\u7528 \xB7 \u8BF7\u586B\u5199\u65B0\u670D\u52A1\u7684\u6CE8\u518C\u5BC6\u94A5\u3002" : "\u4E2A\u4EBA\u4F7F\u7528 \xB7 \u9700\u8981\u6CE8\u518C\u5BC6\u94A5\uFF0C\u6216\u4F7F\u7528\u672C\u673A\u5DF2\u914D\u7F6E\u7684\u6CE8\u518C\u51ED\u636E\u3002" : server?.error ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
        server.error,
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dm-button", type: "button", onClick: () => setModeAttempt((value) => value + 1), children: "\u91CD\u65B0\u68C0\u6D4B" })
      ] }) : origin.trim() ? "\u6B63\u5728\u68C0\u6D4B\u670D\u52A1\u6A21\u5F0F\u2026" : "\u586B\u5199\u670D\u52A1\u5730\u5740\u540E\uFF0C\u5C06\u81EA\u52A8\u68C0\u6D4B\u6CE8\u518C\u65B9\u5F0F\u3002" }),
      mode === "private" && (!editing || replacing) && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: "dm-label", htmlFor: fieldId + "-enrollment", children: "\u6CE8\u518C\u5BC6\u94A5" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { className: "dm-input", id: fieldId + "-enrollment", "aria-describedby": fieldId + "-enrollment-help", type: "password", autoComplete: "off", spellCheck: false, autoCapitalize: "none", required: replacing, disabled: busy, maxLength: 256, placeholder: "\u7C98\u8D34\u540E\u7AEF ENROLLMENT_TOKEN", value: enrollmentToken, onChange: (e) => setEnrollmentToken(e.target.value) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dm-help", id: fieldId + "-enrollment-help", children: replacing ? "\u53EA\u7528\u4E8E\u6CE8\u518C\u65B0\u670D\u52A1\uFF0C\u6210\u529F\u540E\u6E05\u7A7A\uFF1B\u4E0D\u4F1A\u4F7F\u7528\u65E7\u670D\u52A1\u7684\u6CE8\u518C\u51ED\u636E\u3002" : "\u4EC5\u9996\u6B21\u6CE8\u518C\u4F7F\u7528\uFF0C\u6210\u529F\u540E\u6E05\u7A7A\u3002\u7559\u7A7A\u65F6\u5C1D\u8BD5\u8BFB\u53D6\u672C\u673A\u5DF2\u914D\u7F6E\u7684\u6CE8\u518C\u51ED\u636E\u3002" })
      ] }),
      editing ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dm-note", children: replacing ? "\u65B0\u670D\u52A1\u4E0D\u7EE7\u627F\u65E7\u8BBE\u5907\u6388\u6743\uFF0C\u624B\u673A\u9700\u8981\u91CD\u65B0\u914D\u5BF9\u3002\u65E7\u670D\u52A1\u4E0A\u7684\u6388\u6743\u4E0D\u4F1A\u81EA\u52A8\u64A4\u9500\uFF1B\u66F4\u6362\u524D\u53EF\u5148\u64A4\u9500\u4E0D\u518D\u4F7F\u7528\u7684\u8BBE\u5907\u3002" : "\u4EC5\u7528\u4E8E\u540C\u4E00\u4E2A\u540E\u7AEF\u6362\u57DF\u540D\u3001\u7AEF\u53E3\u6216 HTTP / HTTPS\u3002\u4FDD\u5B58\u540E\u4FDD\u7559\u7535\u8111\u8EAB\u4EFD\u548C\u539F\u8BBE\u5907\u6388\u6743\uFF1B\u624B\u673A\u4ECD\u4FDD\u5B58\u65E7\u5730\u5740\uFF0C\u9700\u8981\u4F7F\u7528\u65B0\u914D\u5BF9\u94FE\u63A5\u91CD\u65B0\u8FDE\u63A5\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "dm-check", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { type: "checkbox", checked: editConfirmed, disabled: busy, onChange: (e) => setEditConfirmed(e.target.checked) }),
          replacing ? "\u6211\u4E86\u89E3\u624B\u673A\u9700\u8981\u91CD\u65B0\u914D\u5BF9\uFF0C\u65E7\u670D\u52A1\u6388\u6743\u4E0D\u4F1A\u81EA\u52A8\u64A4\u9500" : "\u6211\u786E\u8BA4\u65B0\u5730\u5740\u5C5E\u4E8E\u540C\u4E00\u53EF\u4FE1\u670D\u52A1\uFF0C\u5141\u8BB8\u7528\u5F53\u524D\u7535\u8111\u51ED\u636E\u9A8C\u8BC1"
        ] })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dm-note", children: "\u6CE8\u518C\u6210\u529F\u540E\uFF0C\u63D2\u4EF6\u4F1A\u4FDD\u5B58\u8FD9\u53F0\u7535\u8111\u7684\u72EC\u7ACB\u51ED\u636E\u3002\u4E4B\u540E\u6B63\u5E38\u542F\u52A8 dsh \u5373\u53EF\uFF0C\u65E0\u9700\u518D\u6B21\u586B\u5199\u6CE8\u518C\u5BC6\u94A5\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dm-button dm-primary", disabled: busy || !mode || editing && (!editConfirmed || !editRevision || !replacing && origin.trim() === status.origin), type: "submit", children: busy ? editing ? "\u6B63\u5728\u68C0\u67E5\u5E76\u4FDD\u5B58\u2026" : "\u6B63\u5728\u6CE8\u518C\u2026" : editing ? replacing ? "\u6CE8\u518C\u5E76\u5207\u6362\u670D\u52A1" : "\u4FDD\u5B58\u670D\u52A1\u5730\u5740" : "\u6CE8\u518C\u8FD9\u53F0\u7535\u8111" }),
        editing && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dm-button", type: "button", disabled: busy, onClick: cancelEdit, children: "\u53D6\u6D88" })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-connection", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { children: status.name }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dm-address", children: status.origin })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dm-button" + (status.enabled ? "" : " dm-primary"), disabled: busy, onClick: () => void act({ action: status.enabled ? "disable" : "enable" }), children: status.enabled ? "\u5173\u95ED\u8FDC\u7A0B\u8FDE\u63A5" : "\u5F00\u542F\u8FDC\u7A0B\u8FDE\u63A5" }),
          status.enabled && status.connection !== "online" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dm-button", disabled: busy, onClick: () => void act({ action: "enable" }), children: "\u91CD\u65B0\u8FDE\u63A5" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dm-button", disabled: busy, onClick: () => void act({ action: "pair" }), children: "\u751F\u6210\u4E00\u6B21\u6027\u914D\u5BF9\u94FE\u63A5" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dm-button", disabled: busy, onClick: editConnection, children: "\u4FEE\u6539\u670D\u52A1\u5730\u5740" }),
          busy && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dm-help", role: "status", children: "\u6B63\u5728\u5904\u7406\u2026" })
        ] })
      ] }),
      pair && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(PairCard, { link: pair.link, onHide: () => setPair(void 0) }, pair.link),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-section-head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { children: "\u7ED1\u5B9A\u8BBE\u5907" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "dm-count", children: [
            status.devices.length,
            " \u53F0\u8BBE\u5907"
          ] })
        ] }),
        status.deviceError ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dm-notice dm-notice-error", role: "alert", children: status.deviceError }) : status.devices.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-empty", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "\u6682\u65E0\u7ED1\u5B9A\u8BBE\u5907" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: "\u8BBE\u5907\u9886\u53D6\u914D\u5BF9\u94FE\u63A5\u540E\uFF0C\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u7B49\u5F85\u4F60\u7684\u6279\u51C6\u3002" })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { children: status.devices.map((device) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("article", { className: "dm-device", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-device-head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { className: "dm-device-name", children: device.name }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dm-tag", "data-state": device.status, children: { pending: "\u7B49\u5F85\u6279\u51C6", active: "\u5DF2\u6279\u51C6", revoked: "\u5DF2\u64A4\u9500" }[device.status] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-fingerprint", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dm-help", children: "\u8BBE\u5907\u516C\u94A5\u6307\u7EB9" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("code", { children: device.fingerprint })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "dm-help", children: [
            "\u51ED\u636E\u5230\u671F\uFF1A",
            new Date(device.expiresAt).toLocaleString()
          ] }),
          device.status === "active" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "dm-help", children: [
            "\u6743\u9650\uFF1A",
            device.management ? "\u804A\u5929\u4E0E\u7535\u8111\u7BA1\u7406" : "\u804A\u5929\u4E0E\u4EFB\u52A1\u64CD\u4F5C"
          ] }),
          device.status === "pending" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_jsx_runtime3.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "dm-check", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { type: "checkbox", disabled: busy, checked: confirmed === device.id, onChange: (e) => setConfirmed(e.target.checked ? device.id : void 0) }),
            "\u6211\u5DF2\u6838\u5BF9\u8BBE\u5907\u516C\u94A5\u6307\u7EB9"
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-actions", children: [
            device.status === "pending" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dm-button dm-primary", disabled: busy || confirmed !== device.id, onClick: () => void act({ action: "approve", deviceId: device.id }), children: "\u6279\u51C6\u8BBE\u5907" }),
            device.status !== "revoked" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dm-button dm-danger", disabled: busy, onClick: () => void act({ action: "revoke", deviceId: device.id }), children: device.status === "pending" ? "\u62D2\u7EDD" : "\u64A4\u9500\u8BBF\u95EE" }),
            device.status === "active" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dm-button", disabled: busy, onClick: () => device.management ? void act({ action: "management", deviceId: device.id, enabled: false }) : setGrantDevice(device.id), children: device.management ? "\u6536\u56DE\u7BA1\u7406\u6743\u9650" : "\u6388\u4E88\u7BA1\u7406\u6743\u9650" })
          ] }),
          device.status === "active" && !device.management && grantDevice === device.id && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("aside", { className: "dm-notice", role: "alert", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "\u5141\u8BB8\u8FD9\u53F0\u8BBE\u5907\u7BA1\u7406\u7535\u8111\uFF1F" }),
            "\u8BBE\u5907\u5C06\u53EF\u5B89\u88C5\u3001\u5378\u8F7D\u548C\u914D\u7F6E\u7535\u8111\u63D2\u4EF6\uFF0C\u7BA1\u7406\u5DF2\u6709\u5DE5\u4F5C\u533A\uFF0C\u4EE5\u53CA\u66F4\u6539\u7535\u8111\u8BBE\u7F6E\u3002\u804A\u5929\u6388\u6743\u4E0D\u5305\u542B\u8FD9\u4E9B\u64CD\u4F5C\u3002",
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dm-actions", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dm-button dm-primary", disabled: busy, onClick: () => {
                setGrantDevice(void 0);
                void act({ action: "management", deviceId: device.id, enabled: true });
              }, children: "\u786E\u8BA4\u6388\u4E88" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "dm-button", onClick: () => setGrantDevice(void 0), children: "\u53D6\u6D88" })
            ] })
          ] })
        ] }, device.id)) })
      ] })
    ] }) })
  ] });
}
var inject = ["slots"];
function apply(ctx) {
  registerDesktopFeedbackSync(ctx);
  ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({ name: "plugins.bundle.config", key: "@dsh-mobile/plugin" }, ManagementPanel));
}
return module.exports;}});

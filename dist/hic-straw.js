(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.HicStraw = {}));
})(this, (function (exports) { 'use strict';

  // from https://github.com/imaya/zlib.js
  var Zlib = {
    Huffman: {},
    Util: {},
    CRC32: {}
  };

  /**
   * Compression Method
   * @enum {number}
   */
  Zlib.CompressionMethod = {
    DEFLATE: 8,
    RESERVED: 15
  };

  /**
   * @param {Object=} opt_params options.
   * @constructor
   */
  Zlib.Zip = function (opt_params) {
    opt_params = opt_params || {};
    /** @type {Array.<{
     *   buffer: !(Array.<number>|Uint8Array),
     *   option: Object,
     *   compressed: boolean,
     *   encrypted: boolean,
     *   size: number,
     *   crc32: number
     * }>} */
    this.files = [];
    /** @type {(Array.<number>|Uint8Array)} */
    this.comment = opt_params['comment'];
    /** @type {(Array.<number>|Uint8Array)} */
    this.password;
  };

  /**
   * @enum {number}
   */
  Zlib.Zip.CompressionMethod = {
    STORE: 0,
    DEFLATE: 8
  };

  /**
   * @enum {number}
   */
  Zlib.Zip.OperatingSystem = {
    MSDOS: 0,
    UNIX: 3,
    MACINTOSH: 7
  };

  /**
   * @enum {number}
   */
  Zlib.Zip.Flags = {
    ENCRYPT: 0x0001,
    DESCRIPTOR: 0x0008,
    UTF8: 0x0800
  };

  /**
   * @type {Array.<number>}
   * @const
   */
  Zlib.Zip.FileHeaderSignature = [0x50, 0x4b, 0x01, 0x02];

  /**
   * @type {Array.<number>}
   * @const
   */
  Zlib.Zip.LocalFileHeaderSignature = [0x50, 0x4b, 0x03, 0x04];

  /**
   * @type {Array.<number>}
   * @const
   */
  Zlib.Zip.CentralDirectorySignature = [0x50, 0x4b, 0x05, 0x06];

  /**
   * @param {Array.<number>|Uint8Array} input
   * @param {Object=} opt_params options.
   */
  Zlib.Zip.prototype.addFile = function (input, opt_params) {
    opt_params = opt_params || {};
    /** @type {string} */
    opt_params['filename'];
    /** @type {boolean} */
    var compressed;
    /** @type {number} */
    var size = input.length;
    /** @type {number} */
    var crc32 = 0;
    if (input instanceof Array) {
      input = new Uint8Array(input);
    }

    // default
    if (typeof opt_params['compressionMethod'] !== 'number') {
      opt_params['compressionMethod'] = Zlib.Zip.CompressionMethod.DEFLATE;
    }

    // その場で圧縮する場合
    if (opt_params['compress']) {
      switch (opt_params['compressionMethod']) {
        case Zlib.Zip.CompressionMethod.STORE:
          break;
        case Zlib.Zip.CompressionMethod.DEFLATE:
          crc32 = Zlib.CRC32.calc(input);
          input = this.deflateWithOption(input, opt_params);
          compressed = true;
          break;
        default:
          throw new Error('unknown compression method:' + opt_params['compressionMethod']);
      }
    }
    this.files.push({
      buffer: input,
      option: opt_params,
      compressed: compressed,
      encrypted: false,
      size: size,
      crc32: crc32
    });
  };

  /**
   * @param {(Array.<number>|Uint8Array)} password
   */
  Zlib.Zip.prototype.setPassword = function (password) {
    this.password = password;
  };
  Zlib.Zip.prototype.compress = function () {
    /** @type {Array.<{
     *   buffer: !(Array.<number>|Uint8Array),
     *   option: Object,
     *   compressed: boolean,
     *   encrypted: boolean,
     *   size: number,
     *   crc32: number
     * }>} */
    var files = this.files;
    /** @type {{
     *   buffer: !(Array.<number>|Uint8Array),
     *   option: Object,
     *   compressed: boolean,
     *   encrypted: boolean,
     *   size: number,
     *   crc32: number
     * }} */
    var file;
    /** @type {!(Array.<number>|Uint8Array)} */
    var output;
    /** @type {number} */
    var op1;
    /** @type {number} */
    var op2;
    /** @type {number} */
    var op3;
    /** @type {number} */
    var localFileSize = 0;
    /** @type {number} */
    var centralDirectorySize = 0;
    /** @type {number} */
    var endOfCentralDirectorySize;
    /** @type {number} */
    var offset;
    /** @type {number} */
    var needVersion;
    /** @type {number} */
    var flags;
    /** @type {Zlib.Zip.CompressionMethod} */
    var compressionMethod;
    /** @type {Date} */
    var date;
    /** @type {number} */
    var crc32;
    /** @type {number} */
    var size;
    /** @type {number} */
    var plainSize;
    /** @type {number} */
    var filenameLength;
    /** @type {number} */
    var extraFieldLength;
    /** @type {number} */
    var commentLength;
    /** @type {(Array.<number>|Uint8Array)} */
    var filename;
    /** @type {(Array.<number>|Uint8Array)} */
    var extraField;
    /** @type {(Array.<number>|Uint8Array)} */
    var comment;
    /** @type {(Array.<number>|Uint8Array)} */
    var buffer;
    /** @type {*} */
    var tmp;
    /** @type {Array.<number>|Uint32Array|Object} */
    var key;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    /** @type {number} */
    var j;
    /** @type {number} */
    var jl;

    // ファイルの圧縮
    for (i = 0, il = files.length; i < il; ++i) {
      file = files[i];
      filenameLength = file.option['filename'] ? file.option['filename'].length : 0;
      extraFieldLength = file.option['extraField'] ? file.option['extraField'].length : 0;
      commentLength = file.option['comment'] ? file.option['comment'].length : 0;

      // 圧縮されていなかったら圧縮
      if (!file.compressed) {
        // 圧縮前に CRC32 の計算をしておく
        file.crc32 = Zlib.CRC32.calc(file.buffer);
        switch (file.option['compressionMethod']) {
          case Zlib.Zip.CompressionMethod.STORE:
            break;
          case Zlib.Zip.CompressionMethod.DEFLATE:
            file.buffer = this.deflateWithOption(file.buffer, file.option);
            file.compressed = true;
            break;
          default:
            throw new Error('unknown compression method:' + file.option['compressionMethod']);
        }
      }

      // encryption
      if (file.option['password'] !== void 0 || this.password !== void 0) {
        // init encryption
        key = this.createEncryptionKey(file.option['password'] || this.password);

        // add header
        buffer = file.buffer;
        {
          tmp = new Uint8Array(buffer.length + 12);
          tmp.set(buffer, 12);
          buffer = tmp;
        }
        for (j = 0; j < 12; ++j) {
          buffer[j] = this.encode(key, i === 11 ? file.crc32 & 0xff : Math.random() * 256 | 0);
        }

        // data encryption
        for (jl = buffer.length; j < jl; ++j) {
          buffer[j] = this.encode(key, buffer[j]);
        }
        file.buffer = buffer;
      }

      // 必要バッファサイズの計算
      localFileSize +=
      // local file header
      30 + filenameLength +
      // file data
      file.buffer.length;
      centralDirectorySize +=
      // file header
      46 + filenameLength + commentLength;
    }

    // end of central directory
    endOfCentralDirectorySize = 22 + (this.comment ? this.comment.length : 0);
    output = new (Uint8Array )(localFileSize + centralDirectorySize + endOfCentralDirectorySize);
    op1 = 0;
    op2 = localFileSize;
    op3 = op2 + centralDirectorySize;

    // ファイルの圧縮
    for (i = 0, il = files.length; i < il; ++i) {
      file = files[i];
      filenameLength = file.option['filename'] ? file.option['filename'].length : 0;
      extraFieldLength = 0; // TODO
      commentLength = file.option['comment'] ? file.option['comment'].length : 0;

      //-------------------------------------------------------------------------
      // local file header & file header
      //-------------------------------------------------------------------------

      offset = op1;

      // signature
      // local file header
      output[op1++] = Zlib.Zip.LocalFileHeaderSignature[0];
      output[op1++] = Zlib.Zip.LocalFileHeaderSignature[1];
      output[op1++] = Zlib.Zip.LocalFileHeaderSignature[2];
      output[op1++] = Zlib.Zip.LocalFileHeaderSignature[3];
      // file header
      output[op2++] = Zlib.Zip.FileHeaderSignature[0];
      output[op2++] = Zlib.Zip.FileHeaderSignature[1];
      output[op2++] = Zlib.Zip.FileHeaderSignature[2];
      output[op2++] = Zlib.Zip.FileHeaderSignature[3];

      // compressor info
      needVersion = 20;
      output[op2++] = needVersion & 0xff;
      output[op2++] = /** @type {Zlib.Zip.OperatingSystem} */
      file.option['os'] || Zlib.Zip.OperatingSystem.MSDOS;

      // need version
      output[op1++] = output[op2++] = needVersion & 0xff;
      output[op1++] = output[op2++] = needVersion >> 8 & 0xff;

      // general purpose bit flag
      flags = 0;
      if (file.option['password'] || this.password) {
        flags |= Zlib.Zip.Flags.ENCRYPT;
      }
      output[op1++] = output[op2++] = flags & 0xff;
      output[op1++] = output[op2++] = flags >> 8 & 0xff;

      // compression method
      compressionMethod = /** @type {Zlib.Zip.CompressionMethod} */
      file.option['compressionMethod'];
      output[op1++] = output[op2++] = compressionMethod & 0xff;
      output[op1++] = output[op2++] = compressionMethod >> 8 & 0xff;

      // date
      date = /** @type {(Date|undefined)} */file.option['date'] || new Date();
      output[op1++] = output[op2++] = (date.getMinutes() & 0x7) << 5 | (date.getSeconds() / 2 | 0);
      output[op1++] = output[op2++] = date.getHours() << 3 | date.getMinutes() >> 3;
      //
      output[op1++] = output[op2++] = (date.getMonth() + 1 & 0x7) << 5 | date.getDate();
      output[op1++] = output[op2++] = (date.getFullYear() - 1980 & 0x7f) << 1 | date.getMonth() + 1 >> 3;

      // CRC-32
      crc32 = file.crc32;
      output[op1++] = output[op2++] = crc32 & 0xff;
      output[op1++] = output[op2++] = crc32 >> 8 & 0xff;
      output[op1++] = output[op2++] = crc32 >> 16 & 0xff;
      output[op1++] = output[op2++] = crc32 >> 24 & 0xff;

      // compressed size
      size = file.buffer.length;
      output[op1++] = output[op2++] = size & 0xff;
      output[op1++] = output[op2++] = size >> 8 & 0xff;
      output[op1++] = output[op2++] = size >> 16 & 0xff;
      output[op1++] = output[op2++] = size >> 24 & 0xff;

      // uncompressed size
      plainSize = file.size;
      output[op1++] = output[op2++] = plainSize & 0xff;
      output[op1++] = output[op2++] = plainSize >> 8 & 0xff;
      output[op1++] = output[op2++] = plainSize >> 16 & 0xff;
      output[op1++] = output[op2++] = plainSize >> 24 & 0xff;

      // filename length
      output[op1++] = output[op2++] = filenameLength & 0xff;
      output[op1++] = output[op2++] = filenameLength >> 8 & 0xff;

      // extra field length
      output[op1++] = output[op2++] = extraFieldLength & 0xff;
      output[op1++] = output[op2++] = extraFieldLength >> 8 & 0xff;

      // file comment length
      output[op2++] = commentLength & 0xff;
      output[op2++] = commentLength >> 8 & 0xff;

      // disk number start
      output[op2++] = 0;
      output[op2++] = 0;

      // internal file attributes
      output[op2++] = 0;
      output[op2++] = 0;

      // external file attributes
      output[op2++] = 0;
      output[op2++] = 0;
      output[op2++] = 0;
      output[op2++] = 0;

      // relative offset of local header
      output[op2++] = offset & 0xff;
      output[op2++] = offset >> 8 & 0xff;
      output[op2++] = offset >> 16 & 0xff;
      output[op2++] = offset >> 24 & 0xff;

      // filename
      filename = file.option['filename'];
      if (filename) {
        {
          output.set(filename, op1);
          output.set(filename, op2);
          op1 += filenameLength;
          op2 += filenameLength;
        }
      }

      // extra field
      extraField = file.option['extraField'];
      if (extraField) {
        {
          output.set(extraField, op1);
          output.set(extraField, op2);
          op1 += extraFieldLength;
          op2 += extraFieldLength;
        }
      }

      // comment
      comment = file.option['comment'];
      if (comment) {
        {
          output.set(comment, op2);
          op2 += commentLength;
        }
      }

      //-------------------------------------------------------------------------
      // file data
      //-------------------------------------------------------------------------

      {
        output.set(file.buffer, op1);
        op1 += file.buffer.length;
      }
    }

    //-------------------------------------------------------------------------
    // end of central directory
    //-------------------------------------------------------------------------

    // signature
    output[op3++] = Zlib.Zip.CentralDirectorySignature[0];
    output[op3++] = Zlib.Zip.CentralDirectorySignature[1];
    output[op3++] = Zlib.Zip.CentralDirectorySignature[2];
    output[op3++] = Zlib.Zip.CentralDirectorySignature[3];

    // number of this disk
    output[op3++] = 0;
    output[op3++] = 0;

    // number of the disk with the start of the central directory
    output[op3++] = 0;
    output[op3++] = 0;

    // total number of entries in the central directory on this disk
    output[op3++] = il & 0xff;
    output[op3++] = il >> 8 & 0xff;

    // total number of entries in the central directory
    output[op3++] = il & 0xff;
    output[op3++] = il >> 8 & 0xff;

    // size of the central directory
    output[op3++] = centralDirectorySize & 0xff;
    output[op3++] = centralDirectorySize >> 8 & 0xff;
    output[op3++] = centralDirectorySize >> 16 & 0xff;
    output[op3++] = centralDirectorySize >> 24 & 0xff;

    // offset of start of central directory with respect to the starting disk number
    output[op3++] = localFileSize & 0xff;
    output[op3++] = localFileSize >> 8 & 0xff;
    output[op3++] = localFileSize >> 16 & 0xff;
    output[op3++] = localFileSize >> 24 & 0xff;

    // .ZIP file comment length
    commentLength = this.comment ? this.comment.length : 0;
    output[op3++] = commentLength & 0xff;
    output[op3++] = commentLength >> 8 & 0xff;

    // .ZIP file comment
    if (this.comment) {
      {
        output.set(this.comment, op3);
        op3 += commentLength;
      }
    }
    return output;
  };

  /**
   * @param {!(Array.<number>|Uint8Array)} input
   * @param {Object=} opt_params options.
   * @return {!(Array.<number>|Uint8Array)}
   */
  Zlib.Zip.prototype.deflateWithOption = function (input, opt_params) {
    /** @type {Zlib.RawDeflate} */
    var deflator = new Zlib.RawDeflate(input, opt_params['deflateOption']);
    return deflator.compress();
  };

  /**
   * @param {(Array.<number>|Uint32Array)} key
   * @return {number}
   */
  Zlib.Zip.prototype.getByte = function (key) {
    /** @type {number} */
    var tmp = key[2] & 0xffff | 2;
    return tmp * (tmp ^ 1) >> 8 & 0xff;
  };

  /**
   * @param {(Array.<number>|Uint32Array|Object)} key
   * @param {number} n
   * @return {number}
   */
  Zlib.Zip.prototype.encode = function (key, n) {
    /** @type {number} */
    var tmp = this.getByte(/** @type {(Array.<number>|Uint32Array)} */key);
    this.updateKeys(/** @type {(Array.<number>|Uint32Array)} */key, n);
    return tmp ^ n;
  };

  /**
   * @param {(Array.<number>|Uint32Array)} key
   * @param {number} n
   */
  Zlib.Zip.prototype.updateKeys = function (key, n) {
    key[0] = Zlib.CRC32.single(key[0], n);
    key[1] = (((key[1] + (key[0] & 0xff)) * 20173 >>> 0) * 6681 >>> 0) + 1 >>> 0;
    key[2] = Zlib.CRC32.single(key[2], key[1] >>> 24);
  };

  /**
   * @param {(Array.<number>|Uint8Array)} password
   * @return {!(Array.<number>|Uint32Array|Object)}
   */
  Zlib.Zip.prototype.createEncryptionKey = function (password) {
    /** @type {!(Array.<number>|Uint32Array)} */
    var key = [305419896, 591751049, 878082192];
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    {
      key = new Uint32Array(key);
    }
    for (i = 0, il = password.length; i < il; ++i) {
      this.updateKeys(key, password[i] & 0xff);
    }
    return key;
  };

  /**
   * build huffman table from length list.
   * @param {!(Array.<number>|Uint8Array)} lengths length list.
   * @return {!Array} huffman table.
   */
  Zlib.Huffman.buildHuffmanTable = function (lengths) {
    /** @type {number} length list size. */
    var listSize = lengths.length;
    /** @type {number} max code length for table size. */
    var maxCodeLength = 0;
    /** @type {number} min code length for table size. */
    var minCodeLength = Number.POSITIVE_INFINITY;
    /** @type {number} table size. */
    var size;
    /** @type {!(Array|Uint8Array)} huffman code table. */
    var table;
    /** @type {number} bit length. */
    var bitLength;
    /** @type {number} huffman code. */
    var code;
    /**
     * サイズが 2^maxlength 個のテーブルを埋めるためのスキップ長.
     * @type {number} skip length for table filling.
     */
    var skip;
    /** @type {number} reversed code. */
    var reversed;
    /** @type {number} reverse temp. */
    var rtemp;
    /** @type {number} loop counter. */
    var i;
    /** @type {number} loop limit. */
    var il;
    /** @type {number} loop counter. */
    var j;
    /** @type {number} table value. */
    var value;

    // Math.max は遅いので最長の値は for-loop で取得する
    for (i = 0, il = listSize; i < il; ++i) {
      if (lengths[i] > maxCodeLength) {
        maxCodeLength = lengths[i];
      }
      if (lengths[i] < minCodeLength) {
        minCodeLength = lengths[i];
      }
    }
    size = 1 << maxCodeLength;
    table = new (Uint32Array )(size);

    // ビット長の短い順からハフマン符号を割り当てる
    for (bitLength = 1, code = 0, skip = 2; bitLength <= maxCodeLength;) {
      for (i = 0; i < listSize; ++i) {
        if (lengths[i] === bitLength) {
          // ビットオーダーが逆になるためビット長分並びを反転する
          for (reversed = 0, rtemp = code, j = 0; j < bitLength; ++j) {
            reversed = reversed << 1 | rtemp & 1;
            rtemp >>= 1;
          }

          // 最大ビット長をもとにテーブルを作るため、
          // 最大ビット長以外では 0 / 1 どちらでも良い箇所ができる
          // そのどちらでも良い場所は同じ値で埋めることで
          // 本来のビット長以上のビット数取得しても問題が起こらないようにする
          value = bitLength << 16 | i;
          for (j = reversed; j < size; j += skip) {
            table[j] = value;
          }
          ++code;
        }
      }

      // 次のビット長へ
      ++bitLength;
      code <<= 1;
      skip <<= 1;
    }
    return [table, maxCodeLength, minCodeLength];
  };

  //-----------------------------------------------------------------------------

  /** @define {number} buffer block size. */
  var ZLIB_RAW_INFLATE_BUFFER_SIZE = 0x8000; // [ 0x8000 >= ZLIB_BUFFER_BLOCK_SIZE ]

  //-----------------------------------------------------------------------------

  var buildHuffmanTable = Zlib.Huffman.buildHuffmanTable;

  /**
   * @constructor
   * @param {!(Uint8Array|Array.<number>)} input input buffer.
   * @param {Object} opt_params option parameter.
   *
   * opt_params は以下のプロパティを指定する事ができます。
   *   - index: input buffer の deflate コンテナの開始位置.
   *   - blockSize: バッファのブロックサイズ.
   *   - bufferType: Zlib.RawInflate.BufferType の値によってバッファの管理方法を指定する.
   *   - resize: 確保したバッファが実際の大きさより大きかった場合に切り詰める.
   */
  Zlib.RawInflate = function (input, opt_params) {
    /** @type {!(Array.<number>|Uint8Array)} inflated buffer */
    this.buffer;
    /** @type {!Array.<(Array.<number>|Uint8Array)>} */
    this.blocks = [];
    /** @type {number} block size. */
    this.bufferSize = ZLIB_RAW_INFLATE_BUFFER_SIZE;
    /** @type {!number} total output buffer pointer. */
    this.totalpos = 0;
    /** @type {!number} input buffer pointer. */
    this.ip = 0;
    /** @type {!number} bit stream reader buffer. */
    this.bitsbuf = 0;
    /** @type {!number} bit stream reader buffer size. */
    this.bitsbuflen = 0;
    /** @type {!(Array.<number>|Uint8Array)} input buffer. */
    this.input = new Uint8Array(input) ;
    /** @type {!(Uint8Array|Array.<number>)} output buffer. */
    this.output;
    /** @type {!number} output buffer pointer. */
    this.op;
    /** @type {boolean} is final block flag. */
    this.bfinal = false;
    /** @type {Zlib.RawInflate.BufferType} buffer management. */
    this.bufferType = Zlib.RawInflate.BufferType.ADAPTIVE;
    /** @type {boolean} resize flag for memory size optimization. */
    this.resize = false;

    // option parameters
    if (opt_params || !(opt_params = {})) {
      if (opt_params['index']) {
        this.ip = opt_params['index'];
      }
      if (opt_params['bufferSize']) {
        this.bufferSize = opt_params['bufferSize'];
      }
      if (opt_params['bufferType']) {
        this.bufferType = opt_params['bufferType'];
      }
      if (opt_params['resize']) {
        this.resize = opt_params['resize'];
      }
    }

    // initialize
    switch (this.bufferType) {
      case Zlib.RawInflate.BufferType.BLOCK:
        this.op = Zlib.RawInflate.MaxBackwardLength;
        this.output = new (Uint8Array )(Zlib.RawInflate.MaxBackwardLength + this.bufferSize + Zlib.RawInflate.MaxCopyLength);
        break;
      case Zlib.RawInflate.BufferType.ADAPTIVE:
        this.op = 0;
        this.output = new (Uint8Array )(this.bufferSize);
        break;
      default:
        throw new Error('invalid inflate mode');
    }
  };

  /**
   * @enum {number}
   */
  Zlib.RawInflate.BufferType = {
    BLOCK: 0,
    ADAPTIVE: 1
  };

  /**
   * decompress.
   * @return {!(Uint8Array|Array.<number>)} inflated buffer.
   */
  Zlib.RawInflate.prototype.decompress = function () {
    while (!this.bfinal) {
      this.parseBlock();
    }
    switch (this.bufferType) {
      case Zlib.RawInflate.BufferType.BLOCK:
        return this.concatBufferBlock();
      case Zlib.RawInflate.BufferType.ADAPTIVE:
        return this.concatBufferDynamic();
      default:
        throw new Error('invalid inflate mode');
    }
  };

  /**
   * @const
   * @type {number} max backward length for LZ77.
   */
  Zlib.RawInflate.MaxBackwardLength = 32768;

  /**
   * @const
   * @type {number} max copy length for LZ77.
   */
  Zlib.RawInflate.MaxCopyLength = 258;

  /**
   * huffman order
   * @const
   * @type {!(Array.<number>|Uint8Array)}
   */
  Zlib.RawInflate.Order = function (table) {
    return new Uint16Array(table) ;
  }([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);

  /**
   * huffman length code table.
   * @const
   * @type {!(Array.<number>|Uint16Array)}
   */
  Zlib.RawInflate.LengthCodeTable = function (table) {
    return new Uint16Array(table) ;
  }([0x0003, 0x0004, 0x0005, 0x0006, 0x0007, 0x0008, 0x0009, 0x000a, 0x000b, 0x000d, 0x000f, 0x0011, 0x0013, 0x0017, 0x001b, 0x001f, 0x0023, 0x002b, 0x0033, 0x003b, 0x0043, 0x0053, 0x0063, 0x0073, 0x0083, 0x00a3, 0x00c3, 0x00e3, 0x0102, 0x0102, 0x0102]);

  /**
   * huffman length extra-bits table.
   * @const
   * @type {!(Array.<number>|Uint8Array)}
   */
  Zlib.RawInflate.LengthExtraTable = function (table) {
    return new Uint8Array(table) ;
  }([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0]);

  /**
   * huffman dist code table.
   * @const
   * @type {!(Array.<number>|Uint16Array)}
   */
  Zlib.RawInflate.DistCodeTable = function (table) {
    return new Uint16Array(table) ;
  }([0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0007, 0x0009, 0x000d, 0x0011, 0x0019, 0x0021, 0x0031, 0x0041, 0x0061, 0x0081, 0x00c1, 0x0101, 0x0181, 0x0201, 0x0301, 0x0401, 0x0601, 0x0801, 0x0c01, 0x1001, 0x1801, 0x2001, 0x3001, 0x4001, 0x6001]);

  /**
   * huffman dist extra-bits table.
   * @const
   * @type {!(Array.<number>|Uint8Array)}
   */
  Zlib.RawInflate.DistExtraTable = function (table) {
    return new Uint8Array(table) ;
  }([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]);

  /**
   * fixed huffman length code table
   * @const
   * @type {!Array}
   */
  Zlib.RawInflate.FixedLiteralLengthTable = function (table) {
    return table;
  }(function () {
    var lengths = new (Uint8Array )(288);
    var i, il;
    for (i = 0, il = lengths.length; i < il; ++i) {
      lengths[i] = i <= 143 ? 8 : i <= 255 ? 9 : i <= 279 ? 7 : 8;
    }
    return buildHuffmanTable(lengths);
  }());

  /**
   * fixed huffman distance code table
   * @const
   * @type {!Array}
   */
  Zlib.RawInflate.FixedDistanceTable = function (table) {
    return table;
  }(function () {
    var lengths = new (Uint8Array )(30);
    var i, il;
    for (i = 0, il = lengths.length; i < il; ++i) {
      lengths[i] = 5;
    }
    return buildHuffmanTable(lengths);
  }());

  /**
   * parse deflated block.
   */
  Zlib.RawInflate.prototype.parseBlock = function () {
    /** @type {number} header */
    var hdr = this.readBits(3);

    // BFINAL
    if (hdr & 0x1) {
      this.bfinal = true;
    }

    // BTYPE
    hdr >>>= 1;
    switch (hdr) {
      // uncompressed
      case 0:
        this.parseUncompressedBlock();
        break;
      // fixed huffman
      case 1:
        this.parseFixedHuffmanBlock();
        break;
      // dynamic huffman
      case 2:
        this.parseDynamicHuffmanBlock();
        break;
      // reserved or other
      default:
        throw new Error('unknown BTYPE: ' + hdr);
    }
  };

  /**
   * read inflate bits
   * @param {number} length bits length.
   * @return {number} read bits.
   */
  Zlib.RawInflate.prototype.readBits = function (length) {
    var bitsbuf = this.bitsbuf;
    var bitsbuflen = this.bitsbuflen;
    var input = this.input;
    var ip = this.ip;

    /** @type {number} */
    var inputLength = input.length;
    /** @type {number} input and output byte. */
    var octet;

    // input byte
    if (ip + (length - bitsbuflen + 7 >> 3) >= inputLength) {
      throw new Error('input buffer is broken');
    }

    // not enough buffer
    while (bitsbuflen < length) {
      bitsbuf |= input[ip++] << bitsbuflen;
      bitsbuflen += 8;
    }

    // output byte
    octet = bitsbuf & (/* MASK */(1 << length) - 1);
    bitsbuf >>>= length;
    bitsbuflen -= length;
    this.bitsbuf = bitsbuf;
    this.bitsbuflen = bitsbuflen;
    this.ip = ip;
    return octet;
  };

  /**
   * read huffman code using table
   * @param {!(Array.<number>|Uint8Array|Uint16Array)} table huffman code table.
   * @return {number} huffman code.
   */
  Zlib.RawInflate.prototype.readCodeByTable = function (table) {
    var bitsbuf = this.bitsbuf;
    var bitsbuflen = this.bitsbuflen;
    var input = this.input;
    var ip = this.ip;

    /** @type {number} */
    var inputLength = input.length;
    /** @type {!(Array.<number>|Uint8Array)} huffman code table */
    var codeTable = table[0];
    /** @type {number} */
    var maxCodeLength = table[1];
    /** @type {number} code length & code (16bit, 16bit) */
    var codeWithLength;
    /** @type {number} code bits length */
    var codeLength;

    // not enough buffer
    while (bitsbuflen < maxCodeLength) {
      if (ip >= inputLength) {
        break;
      }
      bitsbuf |= input[ip++] << bitsbuflen;
      bitsbuflen += 8;
    }

    // read max length
    codeWithLength = codeTable[bitsbuf & (1 << maxCodeLength) - 1];
    codeLength = codeWithLength >>> 16;
    if (codeLength > bitsbuflen) {
      throw new Error('invalid code length: ' + codeLength);
    }
    this.bitsbuf = bitsbuf >> codeLength;
    this.bitsbuflen = bitsbuflen - codeLength;
    this.ip = ip;
    return codeWithLength & 0xffff;
  };

  /**
   * parse uncompressed block.
   */
  Zlib.RawInflate.prototype.parseUncompressedBlock = function () {
    var input = this.input;
    var ip = this.ip;
    var output = this.output;
    var op = this.op;

    /** @type {number} */
    var inputLength = input.length;
    /** @type {number} block length */
    var len;
    /** @type {number} number for check block length */
    var nlen;
    /** @type {number} output buffer length */
    var olength = output.length;
    /** @type {number} copy counter */
    var preCopy;

    // skip buffered header bits
    this.bitsbuf = 0;
    this.bitsbuflen = 0;

    // len
    if (ip + 1 >= inputLength) {
      throw new Error('invalid uncompressed block header: LEN');
    }
    len = input[ip++] | input[ip++] << 8;

    // nlen
    if (ip + 1 >= inputLength) {
      throw new Error('invalid uncompressed block header: NLEN');
    }
    nlen = input[ip++] | input[ip++] << 8;

    // check len & nlen
    if (len === ~nlen) {
      throw new Error('invalid uncompressed block header: length verify');
    }

    // check size
    if (ip + len > input.length) {
      throw new Error('input buffer is broken');
    }

    // expand buffer
    switch (this.bufferType) {
      case Zlib.RawInflate.BufferType.BLOCK:
        // pre copy
        while (op + len > output.length) {
          preCopy = olength - op;
          len -= preCopy;
          {
            output.set(input.subarray(ip, ip + preCopy), op);
            op += preCopy;
            ip += preCopy;
          }
          this.op = op;
          output = this.expandBufferBlock();
          op = this.op;
        }
        break;
      case Zlib.RawInflate.BufferType.ADAPTIVE:
        while (op + len > output.length) {
          output = this.expandBufferAdaptive({
            fixRatio: 2
          });
        }
        break;
      default:
        throw new Error('invalid inflate mode');
    }

    // copy
    {
      output.set(input.subarray(ip, ip + len), op);
      op += len;
      ip += len;
    }
    this.ip = ip;
    this.op = op;
    this.output = output;
  };

  /**
   * parse fixed huffman block.
   */
  Zlib.RawInflate.prototype.parseFixedHuffmanBlock = function () {
    switch (this.bufferType) {
      case Zlib.RawInflate.BufferType.ADAPTIVE:
        this.decodeHuffmanAdaptive(Zlib.RawInflate.FixedLiteralLengthTable, Zlib.RawInflate.FixedDistanceTable);
        break;
      case Zlib.RawInflate.BufferType.BLOCK:
        this.decodeHuffmanBlock(Zlib.RawInflate.FixedLiteralLengthTable, Zlib.RawInflate.FixedDistanceTable);
        break;
      default:
        throw new Error('invalid inflate mode');
    }
  };

  /**
   * parse dynamic huffman block.
   */
  Zlib.RawInflate.prototype.parseDynamicHuffmanBlock = function () {
    /** @type {number} number of literal and length codes. */
    var hlit = this.readBits(5) + 257;
    /** @type {number} number of distance codes. */
    var hdist = this.readBits(5) + 1;
    /** @type {number} number of code lengths. */
    var hclen = this.readBits(4) + 4;
    /** @type {!(Uint8Array|Array.<number>)} code lengths. */
    var codeLengths = new (Uint8Array )(Zlib.RawInflate.Order.length);
    /** @type {!Array} code lengths table. */
    var codeLengthsTable;
    /** @type {!(Uint8Array|Array.<number>)} literal and length code table. */
    var litlenTable;
    /** @type {!(Uint8Array|Array.<number>)} distance code table. */
    var distTable;
    /** @type {!(Uint8Array|Array.<number>)} code length table. */
    var lengthTable;
    /** @type {number} */
    var code;
    /** @type {number} */
    var prev;
    /** @type {number} */
    var repeat;
    /** @type {number} loop counter. */
    var i;
    /** @type {number} loop limit. */
    var il;

    // decode code lengths
    for (i = 0; i < hclen; ++i) {
      codeLengths[Zlib.RawInflate.Order[i]] = this.readBits(3);
    }

    // decode length table
    codeLengthsTable = buildHuffmanTable(codeLengths);
    lengthTable = new (Uint8Array )(hlit + hdist);
    for (i = 0, il = hlit + hdist; i < il;) {
      code = this.readCodeByTable(codeLengthsTable);
      switch (code) {
        case 16:
          repeat = 3 + this.readBits(2);
          while (repeat--) {
            lengthTable[i++] = prev;
          }
          break;
        case 17:
          repeat = 3 + this.readBits(3);
          while (repeat--) {
            lengthTable[i++] = 0;
          }
          prev = 0;
          break;
        case 18:
          repeat = 11 + this.readBits(7);
          while (repeat--) {
            lengthTable[i++] = 0;
          }
          prev = 0;
          break;
        default:
          lengthTable[i++] = code;
          prev = code;
          break;
      }
    }
    litlenTable = buildHuffmanTable(lengthTable.subarray(0, hlit)) ;
    distTable = buildHuffmanTable(lengthTable.subarray(hlit)) ;
    switch (this.bufferType) {
      case Zlib.RawInflate.BufferType.ADAPTIVE:
        this.decodeHuffmanAdaptive(litlenTable, distTable);
        break;
      case Zlib.RawInflate.BufferType.BLOCK:
        this.decodeHuffmanBlock(litlenTable, distTable);
        break;
      default:
        throw new Error('invalid inflate mode');
    }
  };

  /**
   * decode huffman code
   * @param {!(Array.<number>|Uint16Array)} litlen literal and length code table.
   * @param {!(Array.<number>|Uint8Array)} dist distination code table.
   */
  Zlib.RawInflate.prototype.decodeHuffmanBlock = function (litlen, dist) {
    var output = this.output;
    var op = this.op;
    this.currentLitlenTable = litlen;

    /** @type {number} output position limit. */
    var olength = output.length - Zlib.RawInflate.MaxCopyLength;
    /** @type {number} huffman code. */
    var code;
    /** @type {number} table index. */
    var ti;
    /** @type {number} huffman code distination. */
    var codeDist;
    /** @type {number} huffman code length. */
    var codeLength;
    var lengthCodeTable = Zlib.RawInflate.LengthCodeTable;
    var lengthExtraTable = Zlib.RawInflate.LengthExtraTable;
    var distCodeTable = Zlib.RawInflate.DistCodeTable;
    var distExtraTable = Zlib.RawInflate.DistExtraTable;
    while ((code = this.readCodeByTable(litlen)) !== 256) {
      // literal
      if (code < 256) {
        if (op >= olength) {
          this.op = op;
          output = this.expandBufferBlock();
          op = this.op;
        }
        output[op++] = code;
        continue;
      }

      // length code
      ti = code - 257;
      codeLength = lengthCodeTable[ti];
      if (lengthExtraTable[ti] > 0) {
        codeLength += this.readBits(lengthExtraTable[ti]);
      }

      // dist code
      code = this.readCodeByTable(dist);
      codeDist = distCodeTable[code];
      if (distExtraTable[code] > 0) {
        codeDist += this.readBits(distExtraTable[code]);
      }

      // lz77 decode
      if (op >= olength) {
        this.op = op;
        output = this.expandBufferBlock();
        op = this.op;
      }
      while (codeLength--) {
        output[op] = output[op++ - codeDist];
      }
    }
    while (this.bitsbuflen >= 8) {
      this.bitsbuflen -= 8;
      this.ip--;
    }
    this.op = op;
  };

  /**
   * decode huffman code (adaptive)
   * @param {!(Array.<number>|Uint16Array)} litlen literal and length code table.
   * @param {!(Array.<number>|Uint8Array)} dist distination code table.
   */
  Zlib.RawInflate.prototype.decodeHuffmanAdaptive = function (litlen, dist) {
    var output = this.output;
    var op = this.op;
    this.currentLitlenTable = litlen;

    /** @type {number} output position limit. */
    var olength = output.length;
    /** @type {number} huffman code. */
    var code;
    /** @type {number} table index. */
    var ti;
    /** @type {number} huffman code distination. */
    var codeDist;
    /** @type {number} huffman code length. */
    var codeLength;
    var lengthCodeTable = Zlib.RawInflate.LengthCodeTable;
    var lengthExtraTable = Zlib.RawInflate.LengthExtraTable;
    var distCodeTable = Zlib.RawInflate.DistCodeTable;
    var distExtraTable = Zlib.RawInflate.DistExtraTable;
    while ((code = this.readCodeByTable(litlen)) !== 256) {
      // literal
      if (code < 256) {
        if (op >= olength) {
          output = this.expandBufferAdaptive();
          olength = output.length;
        }
        output[op++] = code;
        continue;
      }

      // length code
      ti = code - 257;
      codeLength = lengthCodeTable[ti];
      if (lengthExtraTable[ti] > 0) {
        codeLength += this.readBits(lengthExtraTable[ti]);
      }

      // dist code
      code = this.readCodeByTable(dist);
      codeDist = distCodeTable[code];
      if (distExtraTable[code] > 0) {
        codeDist += this.readBits(distExtraTable[code]);
      }

      // lz77 decode
      if (op + codeLength > olength) {
        output = this.expandBufferAdaptive();
        olength = output.length;
      }
      while (codeLength--) {
        output[op] = output[op++ - codeDist];
      }
    }
    while (this.bitsbuflen >= 8) {
      this.bitsbuflen -= 8;
      this.ip--;
    }
    this.op = op;
  };

  /**
   * expand output buffer.
   * @param {Object=} opt_param option parameters.
   * @return {!(Array.<number>|Uint8Array)} output buffer.
   */
  Zlib.RawInflate.prototype.expandBufferBlock = function (opt_param) {
    /** @type {!(Array.<number>|Uint8Array)} store buffer. */
    var buffer = new (Uint8Array )(this.op - Zlib.RawInflate.MaxBackwardLength);
    /** @type {number} backward base point */
    var backward = this.op - Zlib.RawInflate.MaxBackwardLength;
    var output = this.output;

    // copy to output buffer
    {
      buffer.set(output.subarray(Zlib.RawInflate.MaxBackwardLength, buffer.length));
    }
    this.blocks.push(buffer);
    this.totalpos += buffer.length;

    // copy to backward buffer
    {
      output.set(output.subarray(backward, backward + Zlib.RawInflate.MaxBackwardLength));
    }
    this.op = Zlib.RawInflate.MaxBackwardLength;
    return output;
  };

  /**
   * expand output buffer. (adaptive)
   * @param {Object=} opt_param option parameters.
   * @return {!(Array.<number>|Uint8Array)} output buffer pointer.
   */
  Zlib.RawInflate.prototype.expandBufferAdaptive = function (opt_param) {
    /** @type {!(Array.<number>|Uint8Array)} store buffer. */
    var buffer;
    /** @type {number} expantion ratio. */
    var ratio = this.input.length / this.ip + 1 | 0;
    /** @type {number} maximum number of huffman code. */
    var maxHuffCode;
    /** @type {number} new output buffer size. */
    var newSize;
    /** @type {number} max inflate size. */
    var maxInflateSize;
    var input = this.input;
    var output = this.output;
    if (opt_param) {
      if (typeof opt_param.fixRatio === 'number') {
        ratio = opt_param.fixRatio;
      }
      if (typeof opt_param.addRatio === 'number') {
        ratio += opt_param.addRatio;
      }
    }

    // calculate new buffer size
    if (ratio < 2) {
      maxHuffCode = (input.length - this.ip) / this.currentLitlenTable[2];
      maxInflateSize = maxHuffCode / 2 * 258 | 0;
      newSize = maxInflateSize < output.length ? output.length + maxInflateSize : output.length << 1;
    } else {
      newSize = output.length * ratio;
    }

    // buffer expantion
    {
      buffer = new Uint8Array(newSize);
      buffer.set(output);
    }
    this.output = buffer;
    return this.output;
  };

  /**
   * concat output buffer.
   * @return {!(Array.<number>|Uint8Array)} output buffer.
   */
  Zlib.RawInflate.prototype.concatBufferBlock = function () {
    /** @type {number} buffer pointer. */
    var pos = 0;
    /** @type {number} buffer pointer. */
    var limit = this.totalpos + (this.op - Zlib.RawInflate.MaxBackwardLength);
    /** @type {!(Array.<number>|Uint8Array)} output block array. */
    var output = this.output;
    /** @type {!Array} blocks array. */
    var blocks = this.blocks;
    /** @type {!(Array.<number>|Uint8Array)} output block array. */
    var block;
    /** @type {!(Array.<number>|Uint8Array)} output buffer. */
    var buffer = new (Uint8Array )(limit);
    /** @type {number} loop counter. */
    var i;
    /** @type {number} loop limiter. */
    var il;
    /** @type {number} loop counter. */
    var j;
    /** @type {number} loop limiter. */
    var jl;

    // single buffer
    if (blocks.length === 0) {
      return this.output.subarray(Zlib.RawInflate.MaxBackwardLength, this.op) ;
    }

    // copy to buffer
    for (i = 0, il = blocks.length; i < il; ++i) {
      block = blocks[i];
      for (j = 0, jl = block.length; j < jl; ++j) {
        buffer[pos++] = block[j];
      }
    }

    // current buffer
    for (i = Zlib.RawInflate.MaxBackwardLength, il = this.op; i < il; ++i) {
      buffer[pos++] = output[i];
    }
    this.blocks = [];
    this.buffer = buffer;
    return this.buffer;
  };

  /**
   * concat output buffer. (dynamic)
   * @return {!(Array.<number>|Uint8Array)} output buffer.
   */
  Zlib.RawInflate.prototype.concatBufferDynamic = function () {
    /** @type {Array.<number>|Uint8Array} output buffer. */
    var buffer;
    var op = this.op;
    {
      if (this.resize) {
        buffer = new Uint8Array(op);
        buffer.set(this.output.subarray(0, op));
      } else {
        buffer = this.output.subarray(0, op);
      }
    }
    this.buffer = buffer;
    return this.buffer;
  };
  var buildHuffmanTable = Zlib.Huffman.buildHuffmanTable;

  /**
   * @param {!(Uint8Array|Array.<number>)} input input buffer.
   * @param {number} ip input buffer pointer.
   * @param {number=} opt_buffersize buffer block size.
   * @constructor
   */
  Zlib.RawInflateStream = function (input, ip, opt_buffersize) {
    /** @type {!Array.<(Array|Uint8Array)>} */
    this.blocks = [];
    /** @type {number} block size. */
    this.bufferSize = opt_buffersize ? opt_buffersize : ZLIB_STREAM_RAW_INFLATE_BUFFER_SIZE;
    /** @type {!number} total output buffer pointer. */
    this.totalpos = 0;
    /** @type {!number} input buffer pointer. */
    this.ip = ip === void 0 ? 0 : ip;
    /** @type {!number} bit stream reader buffer. */
    this.bitsbuf = 0;
    /** @type {!number} bit stream reader buffer size. */
    this.bitsbuflen = 0;
    /** @type {!(Array|Uint8Array)} input buffer. */
    this.input = new Uint8Array(input) ;
    /** @type {!(Uint8Array|Array)} output buffer. */
    this.output = new (Uint8Array )(this.bufferSize);
    /** @type {!number} output buffer pointer. */
    this.op = 0;
    /** @type {boolean} is final block flag. */
    this.bfinal = false;
    /** @type {number} uncompressed block length. */
    this.blockLength;
    /** @type {boolean} resize flag for memory size optimization. */
    this.resize = false;
    /** @type {Array} */
    this.litlenTable;
    /** @type {Array} */
    this.distTable;
    /** @type {number} */
    this.sp = 0; // stream pointer
    /** @type {Zlib.RawInflateStream.Status} */
    this.status = Zlib.RawInflateStream.Status.INITIALIZED;

    //
    // backup
    //
    /** @type {!number} */
    this.ip_;
    /** @type {!number} */
    this.bitsbuflen_;
    /** @type {!number} */
    this.bitsbuf_;
  };

  /**
   * @enum {number}
   */
  Zlib.RawInflateStream.BlockType = {
    UNCOMPRESSED: 0,
    FIXED: 1,
    DYNAMIC: 2
  };

  /**
   * @enum {number}
   */
  Zlib.RawInflateStream.Status = {
    INITIALIZED: 0,
    BLOCK_HEADER_START: 1,
    BLOCK_HEADER_END: 2,
    BLOCK_BODY_START: 3,
    BLOCK_BODY_END: 4,
    DECODE_BLOCK_START: 5,
    DECODE_BLOCK_END: 6
  };

  /**
   * decompress.
   * @return {!(Uint8Array|Array)} inflated buffer.
   */
  Zlib.RawInflateStream.prototype.decompress = function (newInput, ip) {
    /** @type {boolean} */
    var stop = false;
    if (newInput !== void 0) {
      this.input = newInput;
    }
    if (ip !== void 0) {
      this.ip = ip;
    }

    // decompress
    while (!stop) {
      switch (this.status) {
        // block header
        case Zlib.RawInflateStream.Status.INITIALIZED:
        case Zlib.RawInflateStream.Status.BLOCK_HEADER_START:
          if (this.readBlockHeader() < 0) {
            stop = true;
          }
          break;
        // block body
        case Zlib.RawInflateStream.Status.BLOCK_HEADER_END: /* FALLTHROUGH */
        case Zlib.RawInflateStream.Status.BLOCK_BODY_START:
          switch (this.currentBlockType) {
            case Zlib.RawInflateStream.BlockType.UNCOMPRESSED:
              if (this.readUncompressedBlockHeader() < 0) {
                stop = true;
              }
              break;
            case Zlib.RawInflateStream.BlockType.FIXED:
              if (this.parseFixedHuffmanBlock() < 0) {
                stop = true;
              }
              break;
            case Zlib.RawInflateStream.BlockType.DYNAMIC:
              if (this.parseDynamicHuffmanBlock() < 0) {
                stop = true;
              }
              break;
          }
          break;
        // decode data
        case Zlib.RawInflateStream.Status.BLOCK_BODY_END:
        case Zlib.RawInflateStream.Status.DECODE_BLOCK_START:
          switch (this.currentBlockType) {
            case Zlib.RawInflateStream.BlockType.UNCOMPRESSED:
              if (this.parseUncompressedBlock() < 0) {
                stop = true;
              }
              break;
            case Zlib.RawInflateStream.BlockType.FIXED: /* FALLTHROUGH */
            case Zlib.RawInflateStream.BlockType.DYNAMIC:
              if (this.decodeHuffman() < 0) {
                stop = true;
              }
              break;
          }
          break;
        case Zlib.RawInflateStream.Status.DECODE_BLOCK_END:
          if (this.bfinal) {
            stop = true;
          } else {
            this.status = Zlib.RawInflateStream.Status.INITIALIZED;
          }
          break;
      }
    }
    return this.concatBuffer();
  };

  /**
   * @const
   * @type {number} max backward length for LZ77.
   */
  Zlib.RawInflateStream.MaxBackwardLength = 32768;

  /**
   * @const
   * @type {number} max copy length for LZ77.
   */
  Zlib.RawInflateStream.MaxCopyLength = 258;

  /**
   * huffman order
   * @const
   * @type {!(Array.<number>|Uint8Array)}
   */
  Zlib.RawInflateStream.Order = function (table) {
    return new Uint16Array(table) ;
  }([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);

  /**
   * huffman length code table.
   * @const
   * @type {!(Array.<number>|Uint16Array)}
   */
  Zlib.RawInflateStream.LengthCodeTable = function (table) {
    return new Uint16Array(table) ;
  }([0x0003, 0x0004, 0x0005, 0x0006, 0x0007, 0x0008, 0x0009, 0x000a, 0x000b, 0x000d, 0x000f, 0x0011, 0x0013, 0x0017, 0x001b, 0x001f, 0x0023, 0x002b, 0x0033, 0x003b, 0x0043, 0x0053, 0x0063, 0x0073, 0x0083, 0x00a3, 0x00c3, 0x00e3, 0x0102, 0x0102, 0x0102]);

  /**
   * huffman length extra-bits table.
   * @const
   * @type {!(Array.<number>|Uint8Array)}
   */
  Zlib.RawInflateStream.LengthExtraTable = function (table) {
    return new Uint8Array(table) ;
  }([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0]);

  /**
   * huffman dist code table.
   * @const
   * @type {!(Array.<number>|Uint16Array)}
   */
  Zlib.RawInflateStream.DistCodeTable = function (table) {
    return new Uint16Array(table) ;
  }([0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0007, 0x0009, 0x000d, 0x0011, 0x0019, 0x0021, 0x0031, 0x0041, 0x0061, 0x0081, 0x00c1, 0x0101, 0x0181, 0x0201, 0x0301, 0x0401, 0x0601, 0x0801, 0x0c01, 0x1001, 0x1801, 0x2001, 0x3001, 0x4001, 0x6001]);

  /**
   * huffman dist extra-bits table.
   * @const
   * @type {!(Array.<number>|Uint8Array)}
   */
  Zlib.RawInflateStream.DistExtraTable = function (table) {
    return new Uint8Array(table) ;
  }([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]);

  /**
   * fixed huffman length code table
   * @const
   * @type {!Array}
   */
  Zlib.RawInflateStream.FixedLiteralLengthTable = function (table) {
    return table;
  }(function () {
    var lengths = new (Uint8Array )(288);
    var i, il;
    for (i = 0, il = lengths.length; i < il; ++i) {
      lengths[i] = i <= 143 ? 8 : i <= 255 ? 9 : i <= 279 ? 7 : 8;
    }
    return buildHuffmanTable(lengths);
  }());

  /**
   * fixed huffman distance code table
   * @const
   * @type {!Array}
   */
  Zlib.RawInflateStream.FixedDistanceTable = function (table) {
    return table;
  }(function () {
    var lengths = new (Uint8Array )(30);
    var i, il;
    for (i = 0, il = lengths.length; i < il; ++i) {
      lengths[i] = 5;
    }
    return buildHuffmanTable(lengths);
  }());

  /**
   * parse deflated block.
   */
  Zlib.RawInflateStream.prototype.readBlockHeader = function () {
    /** @type {number} header */
    var hdr;
    this.status = Zlib.RawInflateStream.Status.BLOCK_HEADER_START;
    this.save_();
    if ((hdr = this.readBits(3)) < 0) {
      this.restore_();
      return -1;
    }

    // BFINAL
    if (hdr & 0x1) {
      this.bfinal = true;
    }

    // BTYPE
    hdr >>>= 1;
    switch (hdr) {
      case 0:
        // uncompressed
        this.currentBlockType = Zlib.RawInflateStream.BlockType.UNCOMPRESSED;
        break;
      case 1:
        // fixed huffman
        this.currentBlockType = Zlib.RawInflateStream.BlockType.FIXED;
        break;
      case 2:
        // dynamic huffman
        this.currentBlockType = Zlib.RawInflateStream.BlockType.DYNAMIC;
        break;
      default:
        // reserved or other
        throw new Error('unknown BTYPE: ' + hdr);
    }
    this.status = Zlib.RawInflateStream.Status.BLOCK_HEADER_END;
  };

  /**
   * read inflate bits
   * @param {number} length bits length.
   * @return {number} read bits.
   */
  Zlib.RawInflateStream.prototype.readBits = function (length) {
    var bitsbuf = this.bitsbuf;
    var bitsbuflen = this.bitsbuflen;
    var input = this.input;
    var ip = this.ip;

    /** @type {number} input and output byte. */
    var octet;

    // not enough buffer
    while (bitsbuflen < length) {
      // input byte
      if (input.length <= ip) {
        return -1;
      }
      octet = input[ip++];

      // concat octet
      bitsbuf |= octet << bitsbuflen;
      bitsbuflen += 8;
    }

    // output byte
    octet = bitsbuf & (/* MASK */(1 << length) - 1);
    bitsbuf >>>= length;
    bitsbuflen -= length;
    this.bitsbuf = bitsbuf;
    this.bitsbuflen = bitsbuflen;
    this.ip = ip;
    return octet;
  };

  /**
   * read huffman code using table
   * @param {Array} table huffman code table.
   * @return {number} huffman code.
   */
  Zlib.RawInflateStream.prototype.readCodeByTable = function (table) {
    var bitsbuf = this.bitsbuf;
    var bitsbuflen = this.bitsbuflen;
    var input = this.input;
    var ip = this.ip;

    /** @type {!(Array|Uint8Array)} huffman code table */
    var codeTable = table[0];
    /** @type {number} */
    var maxCodeLength = table[1];
    /** @type {number} input byte */
    var octet;
    /** @type {number} code length & code (16bit, 16bit) */
    var codeWithLength;
    /** @type {number} code bits length */
    var codeLength;

    // not enough buffer
    while (bitsbuflen < maxCodeLength) {
      if (input.length <= ip) {
        return -1;
      }
      octet = input[ip++];
      bitsbuf |= octet << bitsbuflen;
      bitsbuflen += 8;
    }

    // read max length
    codeWithLength = codeTable[bitsbuf & (1 << maxCodeLength) - 1];
    codeLength = codeWithLength >>> 16;
    if (codeLength > bitsbuflen) {
      throw new Error('invalid code length: ' + codeLength);
    }
    this.bitsbuf = bitsbuf >> codeLength;
    this.bitsbuflen = bitsbuflen - codeLength;
    this.ip = ip;
    return codeWithLength & 0xffff;
  };

  /**
   * read uncompressed block header
   */
  Zlib.RawInflateStream.prototype.readUncompressedBlockHeader = function () {
    /** @type {number} block length */
    var len;
    /** @type {number} number for check block length */
    var nlen;
    var input = this.input;
    var ip = this.ip;
    this.status = Zlib.RawInflateStream.Status.BLOCK_BODY_START;
    if (ip + 4 >= input.length) {
      return -1;
    }
    len = input[ip++] | input[ip++] << 8;
    nlen = input[ip++] | input[ip++] << 8;

    // check len & nlen
    if (len === ~nlen) {
      throw new Error('invalid uncompressed block header: length verify');
    }

    // skip buffered header bits
    this.bitsbuf = 0;
    this.bitsbuflen = 0;
    this.ip = ip;
    this.blockLength = len;
    this.status = Zlib.RawInflateStream.Status.BLOCK_BODY_END;
  };

  /**
   * parse uncompressed block.
   */
  Zlib.RawInflateStream.prototype.parseUncompressedBlock = function () {
    var input = this.input;
    var ip = this.ip;
    var output = this.output;
    var op = this.op;
    var len = this.blockLength;
    this.status = Zlib.RawInflateStream.Status.DECODE_BLOCK_START;

    // copy
    // XXX: とりあえず素直にコピー
    while (len--) {
      if (op === output.length) {
        output = this.expandBuffer({
          fixRatio: 2
        });
      }

      // not enough input buffer
      if (ip >= input.length) {
        this.ip = ip;
        this.op = op;
        this.blockLength = len + 1; // コピーしてないので戻す
        return -1;
      }
      output[op++] = input[ip++];
    }
    if (len < 0) {
      this.status = Zlib.RawInflateStream.Status.DECODE_BLOCK_END;
    }
    this.ip = ip;
    this.op = op;
    return 0;
  };

  /**
   * parse fixed huffman block.
   */
  Zlib.RawInflateStream.prototype.parseFixedHuffmanBlock = function () {
    this.status = Zlib.RawInflateStream.Status.BLOCK_BODY_START;
    this.litlenTable = Zlib.RawInflateStream.FixedLiteralLengthTable;
    this.distTable = Zlib.RawInflateStream.FixedDistanceTable;
    this.status = Zlib.RawInflateStream.Status.BLOCK_BODY_END;
    return 0;
  };

  /**
   * オブジェクトのコンテキストを別のプロパティに退避する.
   * @private
   */
  Zlib.RawInflateStream.prototype.save_ = function () {
    this.ip_ = this.ip;
    this.bitsbuflen_ = this.bitsbuflen;
    this.bitsbuf_ = this.bitsbuf;
  };

  /**
   * 別のプロパティに退避したコンテキストを復元する.
   * @private
   */
  Zlib.RawInflateStream.prototype.restore_ = function () {
    this.ip = this.ip_;
    this.bitsbuflen = this.bitsbuflen_;
    this.bitsbuf = this.bitsbuf_;
  };

  /**
   * parse dynamic huffman block.
   */
  Zlib.RawInflateStream.prototype.parseDynamicHuffmanBlock = function () {
    /** @type {number} number of literal and length codes. */
    var hlit;
    /** @type {number} number of distance codes. */
    var hdist;
    /** @type {number} number of code lengths. */
    var hclen;
    /** @type {!(Uint8Array|Array)} code lengths. */
    var codeLengths = new (Uint8Array )(Zlib.RawInflateStream.Order.length);
    /** @type {!Array} code lengths table. */
    var codeLengthsTable;
    this.status = Zlib.RawInflateStream.Status.BLOCK_BODY_START;
    this.save_();
    hlit = this.readBits(5) + 257;
    hdist = this.readBits(5) + 1;
    hclen = this.readBits(4) + 4;
    if (hlit < 0 || hdist < 0 || hclen < 0) {
      this.restore_();
      return -1;
    }
    try {
      parseDynamicHuffmanBlockImpl.call(this);
    } catch (e) {
      this.restore_();
      return -1;
    }
    function parseDynamicHuffmanBlockImpl() {
      /** @type {number} */
      var bits;
      var code;
      var prev = 0;
      var repeat;
      /** @type {!(Uint8Array|Array.<number>)} code length table. */
      var lengthTable;
      /** @type {number} loop counter. */
      var i;
      /** @type {number} loop limit. */
      var il;

      // decode code lengths
      for (i = 0; i < hclen; ++i) {
        if ((bits = this.readBits(3)) < 0) {
          throw new Error('not enough input');
        }
        codeLengths[Zlib.RawInflateStream.Order[i]] = bits;
      }

      // decode length table
      codeLengthsTable = buildHuffmanTable(codeLengths);
      lengthTable = new (Uint8Array )(hlit + hdist);
      for (i = 0, il = hlit + hdist; i < il;) {
        code = this.readCodeByTable(codeLengthsTable);
        if (code < 0) {
          throw new Error('not enough input');
        }
        switch (code) {
          case 16:
            if ((bits = this.readBits(2)) < 0) {
              throw new Error('not enough input');
            }
            repeat = 3 + bits;
            while (repeat--) {
              lengthTable[i++] = prev;
            }
            break;
          case 17:
            if ((bits = this.readBits(3)) < 0) {
              throw new Error('not enough input');
            }
            repeat = 3 + bits;
            while (repeat--) {
              lengthTable[i++] = 0;
            }
            prev = 0;
            break;
          case 18:
            if ((bits = this.readBits(7)) < 0) {
              throw new Error('not enough input');
            }
            repeat = 11 + bits;
            while (repeat--) {
              lengthTable[i++] = 0;
            }
            prev = 0;
            break;
          default:
            lengthTable[i++] = code;
            prev = code;
            break;
        }
      }
      this.litlenTable = buildHuffmanTable(lengthTable.subarray(0, hlit)) ;
      this.distTable = buildHuffmanTable(lengthTable.subarray(hlit)) ;
    }
    this.status = Zlib.RawInflateStream.Status.BLOCK_BODY_END;
    return 0;
  };

  /**
   * decode huffman code (dynamic)
   * @return {(number|undefined)} -1 is error.
   */
  Zlib.RawInflateStream.prototype.decodeHuffman = function () {
    var output = this.output;
    var op = this.op;

    /** @type {number} huffman code. */
    var code;
    /** @type {number} table index. */
    var ti;
    /** @type {number} huffman code distination. */
    var codeDist;
    /** @type {number} huffman code length. */
    var codeLength;
    var litlen = this.litlenTable;
    var dist = this.distTable;
    var olength = output.length;
    var bits;
    this.status = Zlib.RawInflateStream.Status.DECODE_BLOCK_START;
    while (true) {
      this.save_();
      code = this.readCodeByTable(litlen);
      if (code < 0) {
        this.op = op;
        this.restore_();
        return -1;
      }
      if (code === 256) {
        break;
      }

      // literal
      if (code < 256) {
        if (op === olength) {
          output = this.expandBuffer();
          olength = output.length;
        }
        output[op++] = code;
        continue;
      }

      // length code
      ti = code - 257;
      codeLength = Zlib.RawInflateStream.LengthCodeTable[ti];
      if (Zlib.RawInflateStream.LengthExtraTable[ti] > 0) {
        bits = this.readBits(Zlib.RawInflateStream.LengthExtraTable[ti]);
        if (bits < 0) {
          this.op = op;
          this.restore_();
          return -1;
        }
        codeLength += bits;
      }

      // dist code
      code = this.readCodeByTable(dist);
      if (code < 0) {
        this.op = op;
        this.restore_();
        return -1;
      }
      codeDist = Zlib.RawInflateStream.DistCodeTable[code];
      if (Zlib.RawInflateStream.DistExtraTable[code] > 0) {
        bits = this.readBits(Zlib.RawInflateStream.DistExtraTable[code]);
        if (bits < 0) {
          this.op = op;
          this.restore_();
          return -1;
        }
        codeDist += bits;
      }

      // lz77 decode
      if (op + codeLength >= olength) {
        output = this.expandBuffer();
        olength = output.length;
      }
      while (codeLength--) {
        output[op] = output[op++ - codeDist];
      }

      // break
      if (this.ip === this.input.length) {
        this.op = op;
        return -1;
      }
    }
    while (this.bitsbuflen >= 8) {
      this.bitsbuflen -= 8;
      this.ip--;
    }
    this.op = op;
    this.status = Zlib.RawInflateStream.Status.DECODE_BLOCK_END;
  };

  /**
   * expand output buffer. (dynamic)
   * @param {Object=} opt_param option parameters.
   * @return {!(Array|Uint8Array)} output buffer pointer.
   */
  Zlib.RawInflateStream.prototype.expandBuffer = function (opt_param) {
    /** @type {!(Array|Uint8Array)} store buffer. */
    var buffer;
    /** @type {number} expantion ratio. */
    var ratio = this.input.length / this.ip + 1 | 0;
    /** @type {number} maximum number of huffman code. */
    var maxHuffCode;
    /** @type {number} new output buffer size. */
    var newSize;
    /** @type {number} max inflate size. */
    var maxInflateSize;
    var input = this.input;
    var output = this.output;
    if (opt_param) {
      if (typeof opt_param.fixRatio === 'number') {
        ratio = opt_param.fixRatio;
      }
      if (typeof opt_param.addRatio === 'number') {
        ratio += opt_param.addRatio;
      }
    }

    // calculate new buffer size
    if (ratio < 2) {
      maxHuffCode = (input.length - this.ip) / this.litlenTable[2];
      maxInflateSize = maxHuffCode / 2 * 258 | 0;
      newSize = maxInflateSize < output.length ? output.length + maxInflateSize : output.length << 1;
    } else {
      newSize = output.length * ratio;
    }

    // buffer expantion
    {
      buffer = new Uint8Array(newSize);
      buffer.set(output);
    }
    this.output = buffer;
    return this.output;
  };

  /**
   * concat output buffer. (dynamic)
   * @return {!(Array|Uint8Array)} output buffer.
   */
  Zlib.RawInflateStream.prototype.concatBuffer = function () {
    /** @type {!(Array|Uint8Array)} output buffer. */
    var buffer;
    /** @type {number} */
    var op = this.op;
    /** @type {Uint8Array} */
    var tmp;
    if (this.resize) {
      {
        buffer = new Uint8Array(this.output.subarray(this.sp, op));
      }
    } else {
      buffer = this.output.subarray(this.sp, op) ;
    }
    this.sp = op;

    // compaction
    if (op > Zlib.RawInflateStream.MaxBackwardLength + this.bufferSize) {
      this.op = this.sp = Zlib.RawInflateStream.MaxBackwardLength;
      {
        tmp = /** @type {Uint8Array} */this.output;
        this.output = new Uint8Array(this.bufferSize + Zlib.RawInflateStream.MaxBackwardLength);
        this.output.set(tmp.subarray(op - Zlib.RawInflateStream.MaxBackwardLength, op));
      }
    }
    return buffer;
  };

  /**
   * @constructor
   * @param {!(Uint8Array|Array)} input deflated buffer.
   * @param {Object=} opt_params option parameters.
   *
   * opt_params は以下のプロパティを指定する事ができます。
   *   - index: input buffer の deflate コンテナの開始位置.
   *   - blockSize: バッファのブロックサイズ.
   *   - verify: 伸張が終わった後 adler-32 checksum の検証を行うか.
   *   - bufferType: Zlib.Inflate.BufferType の値によってバッファの管理方法を指定する.
   *       Zlib.Inflate.BufferType は Zlib.RawInflate.BufferType のエイリアス.
   */
  Zlib.Inflate = function (input, opt_params) {
    /** @type {number} */
    var cmf;
    /** @type {number} */
    var flg;

    /** @type {!(Uint8Array|Array)} */
    this.input = input;
    /** @type {number} */
    this.ip = 0;
    /** @type {Zlib.RawInflate} */
    this.rawinflate;
    /** @type {(boolean|undefined)} verify flag. */
    this.verify;

    // option parameters
    if (opt_params || !(opt_params = {})) {
      if (opt_params['index']) {
        this.ip = opt_params['index'];
      }
      if (opt_params['verify']) {
        this.verify = opt_params['verify'];
      }
    }

    // Compression Method and Flags
    cmf = input[this.ip++];
    flg = input[this.ip++];

    // compression method
    switch (cmf & 0x0f) {
      case Zlib.CompressionMethod.DEFLATE:
        this.method = Zlib.CompressionMethod.DEFLATE;
        break;
      default:
        throw new Error('unsupported compression method');
    }

    // fcheck
    if (((cmf << 8) + flg) % 31 !== 0) {
      throw new Error('invalid fcheck flag:' + ((cmf << 8) + flg) % 31);
    }

    // fdict (not supported)
    if (flg & 0x20) {
      throw new Error('fdict flag is not supported');
    }

    // RawInflate
    this.rawinflate = new Zlib.RawInflate(input, {
      'index': this.ip,
      'bufferSize': opt_params['bufferSize'],
      'bufferType': opt_params['bufferType'],
      'resize': opt_params['resize']
    });
  };

  /**
   * @enum {number}
   */
  Zlib.Inflate.BufferType = Zlib.RawInflate.BufferType;

  /**
   * decompress.
   * @return {!(Uint8Array|Array)} inflated buffer.
   */
  Zlib.Inflate.prototype.decompress = function () {
    /** @type {!(Array|Uint8Array)} input buffer. */
    var input = this.input;
    /** @type {!(Uint8Array|Array)} inflated buffer. */
    var buffer;
    /** @type {number} adler-32 checksum */
    var adler32;
    buffer = this.rawinflate.decompress();
    this.ip = this.rawinflate.ip;

    // verify adler-32
    if (this.verify) {
      adler32 = (input[this.ip++] << 24 | input[this.ip++] << 16 | input[this.ip++] << 8 | input[this.ip++]) >>> 0;
      if (adler32 !== Zlib.Adler32(buffer)) {
        throw new Error('invalid adler-32 checksum');
      }
    }
    return buffer;
  };

  /* vim:set expandtab ts=2 sw=2 tw=80: */

  /**
   * @param {!(Uint8Array|Array)} input deflated buffer.
   * @constructor
   */
  Zlib.InflateStream = function (input) {
    /** @type {!(Uint8Array|Array)} */
    this.input = input === void 0 ? new (Uint8Array )() : input;
    /** @type {number} */
    this.ip = 0;
    /** @type {Zlib.RawInflateStream} */
    this.rawinflate = new Zlib.RawInflateStream(this.input, this.ip);
    /** @type {Zlib.CompressionMethod} */
    this.method;
    /** @type {!(Array|Uint8Array)} */
    this.output = this.rawinflate.output;
  };

  /**
   * decompress.
   * @return {!(Uint8Array|Array)} inflated buffer.
   */
  Zlib.InflateStream.prototype.decompress = function (input) {
    /** @type {!(Uint8Array|Array)} inflated buffer. */
    var buffer;

    // 新しい入力を入力バッファに結合する
    // XXX Array, Uint8Array のチェックを行うか確認する
    if (input !== void 0) {
      {
        var tmp = new Uint8Array(this.input.length + input.length);
        tmp.set(this.input, 0);
        tmp.set(input, this.input.length);
        this.input = tmp;
      }
    }
    if (this.method === void 0) {
      if (this.readHeader() < 0) {
        return new (Uint8Array )();
      }
    }
    buffer = this.rawinflate.decompress(this.input, this.ip);
    if (this.rawinflate.ip !== 0) {
      this.input = this.input.subarray(this.rawinflate.ip) ;
      this.ip = 0;
    }

    // verify adler-32
    /*
    if (this.verify) {
      adler32 =
        input[this.ip++] << 24 | input[this.ip++] << 16 |
        input[this.ip++] << 8 | input[this.ip++];
       if (adler32 !== Zlib.Adler32(buffer)) {
        throw new Error('invalid adler-32 checksum');
      }
    }
    */

    return buffer;
  };
  Zlib.InflateStream.prototype.readHeader = function () {
    var ip = this.ip;
    var input = this.input;

    // Compression Method and Flags
    var cmf = input[ip++];
    var flg = input[ip++];
    if (cmf === void 0 || flg === void 0) {
      return -1;
    }

    // compression method
    switch (cmf & 0x0f) {
      case Zlib.CompressionMethod.DEFLATE:
        this.method = Zlib.CompressionMethod.DEFLATE;
        break;
      default:
        throw new Error('unsupported compression method');
    }

    // fcheck
    if (((cmf << 8) + flg) % 31 !== 0) {
      throw new Error('invalid fcheck flag:' + ((cmf << 8) + flg) % 31);
    }

    // fdict (not supported)
    if (flg & 0x20) {
      throw new Error('fdict flag is not supported');
    }
    this.ip = ip;
  };

  /**
   * @fileoverview GZIP (RFC1952) 展開コンテナ実装.
   */

  /**
   * @constructor
   * @param {!(Array|Uint8Array)} input input buffer.
   * @param {Object=} opt_params option parameters.
   */
  Zlib.Gunzip = function (input, opt_params) {
    /** @type {!(Array.<number>|Uint8Array)} input buffer. */
    this.input = input;
    /** @type {number} input buffer pointer. */
    this.ip = 0;
    /** @type {Array.<Zlib.GunzipMember>} */
    this.member = [];
    /** @type {boolean} */
    this.decompressed = false;
  };

  /**
   * @return {Array.<Zlib.GunzipMember>}
   */
  Zlib.Gunzip.prototype.getMembers = function () {
    if (!this.decompressed) {
      this.decompress();
    }
    return this.member.slice();
  };

  /**
   * inflate gzip data.
   * @return {!(Array.<number>|Uint8Array)} inflated buffer.
   */
  Zlib.Gunzip.prototype.decompress = function () {
    /** @type {number} input length. */
    var il = this.input.length;
    while (this.ip < il) {
      this.decodeMember();
    }
    this.decompressed = true;
    return this.concatMember();
  };

  /**
   * decode gzip member.
   */
  Zlib.Gunzip.prototype.decodeMember = function () {
    /** @type {Zlib.GunzipMember} */
    var member = new Zlib.GunzipMember();
    /** @type {number} */
    var isize;
    /** @type {Zlib.RawInflate} RawInflate implementation. */
    var rawinflate;
    /** @type {!(Array.<number>|Uint8Array)} inflated data. */
    var inflated;
    /** @type {number} inflate size */
    var inflen;
    /** @type {number} character code */
    var c;
    /** @type {number} character index in string. */
    var ci;
    /** @type {Array.<string>} character array. */
    var str;
    /** @type {number} modification time. */
    var mtime;
    /** @type {number} */
    var crc32;
    var input = this.input;
    var ip = this.ip;
    member.id1 = input[ip++];
    member.id2 = input[ip++];

    // check signature
    if (member.id1 !== 0x1f || member.id2 !== 0x8b) {
      throw new Error('invalid file signature:' + member.id1 + ',' + member.id2);
    }

    // check compression method
    member.cm = input[ip++];
    switch (member.cm) {
      case 8:
        /* XXX: use Zlib const */
        break;
      default:
        throw new Error('unknown compression method: ' + member.cm);
    }

    // flags
    member.flg = input[ip++];

    // modification time
    mtime = input[ip++] | input[ip++] << 8 | input[ip++] << 16 | input[ip++] << 24;
    member.mtime = new Date(mtime * 1000);

    // extra flags
    member.xfl = input[ip++];

    // operating system
    member.os = input[ip++];

    // extra
    if ((member.flg & Zlib.Gzip.FlagsMask.FEXTRA) > 0) {
      member.xlen = input[ip++] | input[ip++] << 8;
      ip = this.decodeSubField(ip, member.xlen);
    }

    // fname
    if ((member.flg & Zlib.Gzip.FlagsMask.FNAME) > 0) {
      for (str = [], ci = 0; (c = input[ip++]) > 0;) {
        str[ci++] = String.fromCharCode(c);
      }
      member.name = str.join('');
    }

    // fcomment
    if ((member.flg & Zlib.Gzip.FlagsMask.FCOMMENT) > 0) {
      for (str = [], ci = 0; (c = input[ip++]) > 0;) {
        str[ci++] = String.fromCharCode(c);
      }
      member.comment = str.join('');
    }

    // fhcrc
    if ((member.flg & Zlib.Gzip.FlagsMask.FHCRC) > 0) {
      member.crc16 = Zlib.CRC32.calc(input, 0, ip) & 0xffff;
      if (member.crc16 !== (input[ip++] | input[ip++] << 8)) {
        throw new Error('invalid header crc16');
      }
    }

    // isize を事前に取得すると展開後のサイズが分かるため、
    // inflate処理のバッファサイズが事前に分かり、高速になる
    isize = input[input.length - 4] | input[input.length - 3] << 8 | input[input.length - 2] << 16 | input[input.length - 1] << 24;

    // isize の妥当性チェック
    // ハフマン符号では最小 2-bit のため、最大で 1/4 になる
    // LZ77 符号では 長さと距離 2-Byte で最大 258-Byte を表現できるため、
    // 1/128 になるとする
    // ここから入力バッファの残りが isize の 512 倍以上だったら
    // サイズ指定のバッファ確保は行わない事とする
    if (input.length - ip - /* CRC-32 */4 - /* ISIZE */4 < isize * 512) {
      inflen = isize;
    }

    // compressed block
    rawinflate = new Zlib.RawInflate(input, {
      'index': ip,
      'bufferSize': inflen
    });
    member.data = inflated = rawinflate.decompress();
    ip = rawinflate.ip;

    // crc32
    member.crc32 = crc32 = (input[ip++] | input[ip++] << 8 | input[ip++] << 16 | input[ip++] << 24) >>> 0;
    if (Zlib.CRC32.calc(inflated) !== crc32) {
      throw new Error('invalid CRC-32 checksum: 0x' + Zlib.CRC32.calc(inflated).toString(16) + ' / 0x' + crc32.toString(16));
    }

    // input size
    member.isize = isize = (input[ip++] | input[ip++] << 8 | input[ip++] << 16 | input[ip++] << 24) >>> 0;
    if ((inflated.length & 0xffffffff) !== isize) {
      throw new Error('invalid input size: ' + (inflated.length & 0xffffffff) + ' / ' + isize);
    }
    this.member.push(member);
    this.ip = ip;
  };

  /**
   * サブフィールドのデコード
   * XXX: 現在は何もせずスキップする
   */
  Zlib.Gunzip.prototype.decodeSubField = function (ip, length) {
    return ip + length;
  };

  /**
   * @return {!(Array.<number>|Uint8Array)}
   */
  Zlib.Gunzip.prototype.concatMember = function () {
    /** @type {Array.<Zlib.GunzipMember>} */
    var member = this.member;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    /** @type {number} */
    var p = 0;
    /** @type {number} */
    var size = 0;
    /** @type {!(Array.<number>|Uint8Array)} */
    var buffer;
    for (i = 0, il = member.length; i < il; ++i) {
      size += member[i].data.length;
    }
    {
      buffer = new Uint8Array(size);
      for (i = 0; i < il; ++i) {
        buffer.set(member[i].data, p);
        p += member[i].data.length;
      }
    }
    return buffer;
  };

  /**
   * @constructor
   */
  Zlib.GunzipMember = function () {
    /** @type {number} signature first byte. */
    this.id1;
    /** @type {number} signature second byte. */
    this.id2;
    /** @type {number} compression method. */
    this.cm;
    /** @type {number} flags. */
    this.flg;
    /** @type {Date} modification time. */
    this.mtime;
    /** @type {number} extra flags. */
    this.xfl;
    /** @type {number} operating system number. */
    this.os;
    /** @type {number} CRC-16 value for FHCRC flag. */
    this.crc16;
    /** @type {number} extra length. */
    this.xlen;
    /** @type {number} CRC-32 value for verification. */
    this.crc32;
    /** @type {number} input size modulo 32 value. */
    this.isize;
    /** @type {string} filename. */
    this.name;
    /** @type {string} comment. */
    this.comment;
    /** @type {!(Uint8Array|Array.<number>)} */
    this.data;
  };
  Zlib.GunzipMember.prototype.getName = function () {
    return this.name;
  };
  Zlib.GunzipMember.prototype.getData = function () {
    return this.data;
  };
  Zlib.GunzipMember.prototype.getMtime = function () {
    return this.mtime;
  };

  /**
   * @fileoverview GZIP (RFC1952) 実装.
   */

  /**
   * @constructor
   * @param {!(Array|Uint8Array)} input input buffer.
   * @param {Object=} opt_params option parameters.
   */
  Zlib.Gzip = function (input, opt_params) {
    /** @type {!(Array.<number>|Uint8Array)} input buffer. */
    this.input = input;
    /** @type {number} input buffer pointer. */
    this.ip = 0;
    /** @type {!(Array.<number>|Uint8Array)} output buffer. */
    this.output;
    /** @type {number} output buffer. */
    this.op = 0;
    /** @type {!Object} flags option flags. */
    this.flags = {};
    /** @type {!string} filename. */
    this.filename;
    /** @type {!string} comment. */
    this.comment;
    /** @type {!Object} deflate options. */
    this.deflateOptions;

    // option parameters
    if (opt_params) {
      if (opt_params['flags']) {
        this.flags = opt_params['flags'];
      }
      if (typeof opt_params['filename'] === 'string') {
        this.filename = opt_params['filename'];
      }
      if (typeof opt_params['comment'] === 'string') {
        this.comment = opt_params['comment'];
      }
      if (opt_params['deflateOptions']) {
        this.deflateOptions = opt_params['deflateOptions'];
      }
    }
    if (!this.deflateOptions) {
      this.deflateOptions = {};
    }
  };

  /**
   * @type {number}
   * @const
   */
  Zlib.Gzip.DefaultBufferSize = 0x8000;

  /**
   * encode gzip members.
   * @return {!(Array|Uint8Array)} gzip binary array.
   */
  Zlib.Gzip.prototype.compress = function () {
    /** @type {number} flags. */
    var flg;
    /** @type {number} modification time. */
    var mtime;
    /** @type {number} CRC-16 value for FHCRC flag. */
    var crc16;
    /** @type {number} CRC-32 value for verification. */
    var crc32;
    /** @type {!Zlib.RawDeflate} raw deflate object. */
    var rawdeflate;
    /** @type {number} character code */
    var c;
    /** @type {number} loop counter. */
    var i;
    /** @type {number} loop limiter. */
    var il;
    /** @type {!(Array|Uint8Array)} output buffer. */
    var output = new (Uint8Array )(Zlib.Gzip.DefaultBufferSize);
    /** @type {number} output buffer pointer. */
    var op = 0;
    var input = this.input;
    var ip = this.ip;
    var filename = this.filename;
    var comment = this.comment;

    // check signature
    output[op++] = 0x1f;
    output[op++] = 0x8b;

    // check compression method
    output[op++] = 8; /* XXX: use Zlib const */

    // flags
    flg = 0;
    if (this.flags['fname']) flg |= Zlib.Gzip.FlagsMask.FNAME;
    if (this.flags['fcomment']) flg |= Zlib.Gzip.FlagsMask.FCOMMENT;
    if (this.flags['fhcrc']) flg |= Zlib.Gzip.FlagsMask.FHCRC;
    // XXX: FTEXT
    // XXX: FEXTRA
    output[op++] = flg;

    // modification time
    mtime = (Date.now ? Date.now() : +new Date()) / 1000 | 0;
    output[op++] = mtime & 0xff;
    output[op++] = mtime >>> 8 & 0xff;
    output[op++] = mtime >>> 16 & 0xff;
    output[op++] = mtime >>> 24 & 0xff;

    // extra flags
    output[op++] = 0;

    // operating system
    output[op++] = Zlib.Gzip.OperatingSystem.UNKNOWN;

    // extra
    /* NOP */

    // fname
    if (this.flags['fname'] !== void 0) {
      for (i = 0, il = filename.length; i < il; ++i) {
        c = filename.charCodeAt(i);
        if (c > 0xff) {
          output[op++] = c >>> 8 & 0xff;
        }
        output[op++] = c & 0xff;
      }
      output[op++] = 0; // null termination
    }

    // fcomment
    if (this.flags['comment']) {
      for (i = 0, il = comment.length; i < il; ++i) {
        c = comment.charCodeAt(i);
        if (c > 0xff) {
          output[op++] = c >>> 8 & 0xff;
        }
        output[op++] = c & 0xff;
      }
      output[op++] = 0; // null termination
    }

    // fhcrc
    if (this.flags['fhcrc']) {
      crc16 = Zlib.CRC32.calc(output, 0, op) & 0xffff;
      output[op++] = crc16 & 0xff;
      output[op++] = crc16 >>> 8 & 0xff;
    }

    // add compress option
    this.deflateOptions['outputBuffer'] = output;
    this.deflateOptions['outputIndex'] = op;

    // compress
    rawdeflate = new Zlib.RawDeflate(input, this.deflateOptions);
    output = rawdeflate.compress();
    op = rawdeflate.op;

    // expand buffer
    {
      if (op + 8 > output.buffer.byteLength) {
        this.output = new Uint8Array(op + 8);
        this.output.set(new Uint8Array(output.buffer));
        output = this.output;
      } else {
        output = new Uint8Array(output.buffer);
      }
    }

    // crc32
    crc32 = Zlib.CRC32.calc(input);
    output[op++] = crc32 & 0xff;
    output[op++] = crc32 >>> 8 & 0xff;
    output[op++] = crc32 >>> 16 & 0xff;
    output[op++] = crc32 >>> 24 & 0xff;

    // input size
    il = input.length;
    output[op++] = il & 0xff;
    output[op++] = il >>> 8 & 0xff;
    output[op++] = il >>> 16 & 0xff;
    output[op++] = il >>> 24 & 0xff;
    this.ip = ip;
    if (op < output.length) {
      this.output = output = output.subarray(0, op);
    }
    return output;
  };

  /** @enum {number} */
  Zlib.Gzip.OperatingSystem = {
    FAT: 0,
    AMIGA: 1,
    VMS: 2,
    UNIX: 3,
    VM_CMS: 4,
    ATARI_TOS: 5,
    HPFS: 6,
    MACINTOSH: 7,
    Z_SYSTEM: 8,
    CP_M: 9,
    TOPS_20: 10,
    NTFS: 11,
    QDOS: 12,
    ACORN_RISCOS: 13,
    UNKNOWN: 255
  };

  /** @enum {number} */
  Zlib.Gzip.FlagsMask = {
    FTEXT: 0x01,
    FHCRC: 0x02,
    FEXTRA: 0x04,
    FNAME: 0x08,
    FCOMMENT: 0x10
  };

  /**
   * @fileoverview Heap Sort 実装. ハフマン符号化で使用する.
   */

  /**
   * カスタムハフマン符号で使用するヒープ実装
   * @param {number} length ヒープサイズ.
   * @constructor
   */
  Zlib.Heap = function (length) {
    this.buffer = new (Uint16Array )(length * 2);
    this.length = 0;
  };

  /**
   * 親ノードの index 取得
   * @param {number} index 子ノードの index.
   * @return {number} 親ノードの index.
   *
   */
  Zlib.Heap.prototype.getParent = function (index) {
    return ((index - 2) / 4 | 0) * 2;
  };

  /**
   * 子ノードの index 取得
   * @param {number} index 親ノードの index.
   * @return {number} 子ノードの index.
   */
  Zlib.Heap.prototype.getChild = function (index) {
    return 2 * index + 2;
  };

  /**
   * Heap に値を追加する
   * @param {number} index キー index.
   * @param {number} value 値.
   * @return {number} 現在のヒープ長.
   */
  Zlib.Heap.prototype.push = function (index, value) {
    var current,
      parent,
      heap = this.buffer,
      swap;
    current = this.length;
    heap[this.length++] = value;
    heap[this.length++] = index;

    // ルートノードにたどり着くまで入れ替えを試みる
    while (current > 0) {
      parent = this.getParent(current);

      // 親ノードと比較して親の方が小さければ入れ替える
      if (heap[current] > heap[parent]) {
        swap = heap[current];
        heap[current] = heap[parent];
        heap[parent] = swap;
        swap = heap[current + 1];
        heap[current + 1] = heap[parent + 1];
        heap[parent + 1] = swap;
        current = parent;
        // 入れ替えが必要なくなったらそこで抜ける
      } else {
        break;
      }
    }
    return this.length;
  };

  /**
   * Heapから一番大きい値を返す
   * @return {{index: number, value: number, length: number}} {index: キーindex,
   *     value: 値, length: ヒープ長} の Object.
   */
  Zlib.Heap.prototype.pop = function () {
    var index,
      value,
      heap = this.buffer,
      swap,
      current,
      parent;
    value = heap[0];
    index = heap[1];

    // 後ろから値を取る
    this.length -= 2;
    heap[0] = heap[this.length];
    heap[1] = heap[this.length + 1];
    parent = 0;
    // ルートノードから下がっていく
    while (true) {
      current = this.getChild(parent);

      // 範囲チェック
      if (current >= this.length) {
        break;
      }

      // 隣のノードと比較して、隣の方が値が大きければ隣を現在ノードとして選択
      if (current + 2 < this.length && heap[current + 2] > heap[current]) {
        current += 2;
      }

      // 親ノードと比較して親の方が小さい場合は入れ替える
      if (heap[current] > heap[parent]) {
        swap = heap[parent];
        heap[parent] = heap[current];
        heap[current] = swap;
        swap = heap[parent + 1];
        heap[parent + 1] = heap[current + 1];
        heap[current + 1] = swap;
      } else {
        break;
      }
      parent = current;
    }
    return {
      index: index,
      value: value,
      length: this.length
    };
  };

  /* vim:set expandtab ts=2 sw=2 tw=80: */

  /**
   * @fileoverview Deflate (RFC1951) 符号化アルゴリズム実装.
   */

  /**
   * Raw Deflate 実装
   *
   * @constructor
   * @param {!(Array.<number>|Uint8Array)} input 符号化する対象のバッファ.
   * @param {Object=} opt_params option parameters.
   *
   * typed array が使用可能なとき、outputBuffer が Array は自動的に Uint8Array に
   * 変換されます.
   * 別のオブジェクトになるため出力バッファを参照している変数などは
   * 更新する必要があります.
   */
  Zlib.RawDeflate = function (input, opt_params) {
    /** @type {Zlib.RawDeflate.CompressionType} */
    this.compressionType = Zlib.RawDeflate.CompressionType.DYNAMIC;
    /** @type {number} */
    this.lazy = 0;
    /** @type {!(Array.<number>|Uint32Array)} */
    this.freqsLitLen;
    /** @type {!(Array.<number>|Uint32Array)} */
    this.freqsDist;
    /** @type {!(Array.<number>|Uint8Array)} */
    this.input = input instanceof Array ? new Uint8Array(input) : input;
    /** @type {!(Array.<number>|Uint8Array)} output output buffer. */
    this.output;
    /** @type {number} pos output buffer position. */
    this.op = 0;

    // option parameters
    if (opt_params) {
      if (opt_params['lazy']) {
        this.lazy = opt_params['lazy'];
      }
      if (typeof opt_params['compressionType'] === 'number') {
        this.compressionType = opt_params['compressionType'];
      }
      if (opt_params['outputBuffer']) {
        this.output = opt_params['outputBuffer'] instanceof Array ? new Uint8Array(opt_params['outputBuffer']) : opt_params['outputBuffer'];
      }
      if (typeof opt_params['outputIndex'] === 'number') {
        this.op = opt_params['outputIndex'];
      }
    }
    if (!this.output) {
      this.output = new (Uint8Array )(0x8000);
    }
  };

  /**
   * @enum {number}
   */
  Zlib.RawDeflate.CompressionType = {
    NONE: 0,
    FIXED: 1,
    DYNAMIC: 2,
    RESERVED: 3
  };

  /**
   * LZ77 の最小マッチ長
   * @const
   * @type {number}
   */
  Zlib.RawDeflate.Lz77MinLength = 3;

  /**
   * LZ77 の最大マッチ長
   * @const
   * @type {number}
   */
  Zlib.RawDeflate.Lz77MaxLength = 258;

  /**
   * LZ77 のウィンドウサイズ
   * @const
   * @type {number}
   */
  Zlib.RawDeflate.WindowSize = 0x8000;

  /**
   * 最長の符号長
   * @const
   * @type {number}
   */
  Zlib.RawDeflate.MaxCodeLength = 16;

  /**
   * ハフマン符号の最大数値
   * @const
   * @type {number}
   */
  Zlib.RawDeflate.HUFMAX = 286;

  /**
   * 固定ハフマン符号の符号化テーブル
   * @const
   * @type {Array.<Array.<number, number>>}
   */
  Zlib.RawDeflate.FixedHuffmanTable = function () {
    var table = [],
      i;
    for (i = 0; i < 288; i++) {
      switch (true) {
        case i <= 143:
          table.push([i + 0x030, 8]);
          break;
        case i <= 255:
          table.push([i - 144 + 0x190, 9]);
          break;
        case i <= 279:
          table.push([i - 256 + 0x000, 7]);
          break;
        case i <= 287:
          table.push([i - 280 + 0x0C0, 8]);
          break;
        default:
          throw 'invalid literal: ' + i;
      }
    }
    return table;
  }();

  /**
   * DEFLATE ブロックの作成
   * @return {!(Array.<number>|Uint8Array)} 圧縮済み byte array.
   */
  Zlib.RawDeflate.prototype.compress = function () {
    /** @type {!(Array.<number>|Uint8Array)} */
    var blockArray;
    /** @type {number} */
    var position;
    /** @type {number} */
    var length;
    var input = this.input;

    // compression
    switch (this.compressionType) {
      case Zlib.RawDeflate.CompressionType.NONE:
        // each 65535-Byte (length header: 16-bit)
        for (position = 0, length = input.length; position < length;) {
          blockArray = input.subarray(position, position + 0xffff) ;
          position += blockArray.length;
          this.makeNocompressBlock(blockArray, position === length);
        }
        break;
      case Zlib.RawDeflate.CompressionType.FIXED:
        this.output = this.makeFixedHuffmanBlock(input, true);
        this.op = this.output.length;
        break;
      case Zlib.RawDeflate.CompressionType.DYNAMIC:
        this.output = this.makeDynamicHuffmanBlock(input, true);
        this.op = this.output.length;
        break;
      default:
        throw 'invalid compression type';
    }
    return this.output;
  };

  /**
   * 非圧縮ブロックの作成
   * @param {!(Array.<number>|Uint8Array)} blockArray ブロックデータ byte array.
   * @param {!boolean} isFinalBlock 最後のブロックならばtrue.
   * @return {!(Array.<number>|Uint8Array)} 非圧縮ブロック byte array.
   */
  Zlib.RawDeflate.prototype.makeNocompressBlock = function (blockArray, isFinalBlock) {
    /** @type {number} */
    var bfinal;
    /** @type {Zlib.RawDeflate.CompressionType} */
    var btype;
    /** @type {number} */
    var len;
    /** @type {number} */
    var nlen;
    var output = this.output;
    var op = this.op;

    // expand buffer
    {
      output = new Uint8Array(this.output.buffer);
      while (output.length <= op + blockArray.length + 5) {
        output = new Uint8Array(output.length << 1);
      }
      output.set(this.output);
    }

    // header
    bfinal = isFinalBlock ? 1 : 0;
    btype = Zlib.RawDeflate.CompressionType.NONE;
    output[op++] = bfinal | btype << 1;

    // length
    len = blockArray.length;
    nlen = ~len + 0x10000 & 0xffff;
    output[op++] = len & 0xff;
    output[op++] = len >>> 8 & 0xff;
    output[op++] = nlen & 0xff;
    output[op++] = nlen >>> 8 & 0xff;

    // copy buffer
    {
      output.set(blockArray, op);
      op += blockArray.length;
      output = output.subarray(0, op);
    }
    this.op = op;
    this.output = output;
    return output;
  };

  /**
   * 固定ハフマンブロックの作成
   * @param {!(Array.<number>|Uint8Array)} blockArray ブロックデータ byte array.
   * @param {!boolean} isFinalBlock 最後のブロックならばtrue.
   * @return {!(Array.<number>|Uint8Array)} 固定ハフマン符号化ブロック byte array.
   */
  Zlib.RawDeflate.prototype.makeFixedHuffmanBlock = function (blockArray, isFinalBlock) {
    /** @type {Zlib.BitStream} */
    var stream = new Zlib.BitStream(new Uint8Array(this.output.buffer) , this.op);
    /** @type {number} */
    var bfinal;
    /** @type {Zlib.RawDeflate.CompressionType} */
    var btype;
    /** @type {!(Array.<number>|Uint16Array)} */
    var data;

    // header
    bfinal = isFinalBlock ? 1 : 0;
    btype = Zlib.RawDeflate.CompressionType.FIXED;
    stream.writeBits(bfinal, 1, true);
    stream.writeBits(btype, 2, true);
    data = this.lz77(blockArray);
    this.fixedHuffman(data, stream);
    return stream.finish();
  };

  /**
   * 動的ハフマンブロックの作成
   * @param {!(Array.<number>|Uint8Array)} blockArray ブロックデータ byte array.
   * @param {!boolean} isFinalBlock 最後のブロックならばtrue.
   * @return {!(Array.<number>|Uint8Array)} 動的ハフマン符号ブロック byte array.
   */
  Zlib.RawDeflate.prototype.makeDynamicHuffmanBlock = function (blockArray, isFinalBlock) {
    /** @type {Zlib.BitStream} */
    var stream = new Zlib.BitStream(new Uint8Array(this.output.buffer) , this.op);
    /** @type {number} */
    var bfinal;
    /** @type {Zlib.RawDeflate.CompressionType} */
    var btype;
    /** @type {!(Array.<number>|Uint16Array)} */
    var data;
    /** @type {number} */
    var hlit;
    /** @type {number} */
    var hdist;
    /** @type {number} */
    var hclen;
    /** @const @type {Array.<number>} */
    var hclenOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    /** @type {!(Array.<number>|Uint8Array)} */
    var litLenLengths;
    /** @type {!(Array.<number>|Uint16Array)} */
    var litLenCodes;
    /** @type {!(Array.<number>|Uint8Array)} */
    var distLengths;
    /** @type {!(Array.<number>|Uint16Array)} */
    var distCodes;
    /** @type {{
     *   codes: !(Array.<number>|Uint32Array),
     *   freqs: !(Array.<number>|Uint8Array)
     * }} */
    var treeSymbols;
    /** @type {!(Array.<number>|Uint8Array)} */
    var treeLengths;
    /** @type {Array} */
    var transLengths = new Array(19);
    /** @type {!(Array.<number>|Uint16Array)} */
    var treeCodes;
    /** @type {number} */
    var code;
    /** @type {number} */
    var bitlen;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;

    // header
    bfinal = isFinalBlock ? 1 : 0;
    btype = Zlib.RawDeflate.CompressionType.DYNAMIC;
    stream.writeBits(bfinal, 1, true);
    stream.writeBits(btype, 2, true);
    data = this.lz77(blockArray);

    // リテラル・長さ, 距離のハフマン符号と符号長の算出
    litLenLengths = this.getLengths_(this.freqsLitLen, 15);
    litLenCodes = this.getCodesFromLengths_(litLenLengths);
    distLengths = this.getLengths_(this.freqsDist, 7);
    distCodes = this.getCodesFromLengths_(distLengths);

    // HLIT, HDIST の決定
    for (hlit = 286; hlit > 257 && litLenLengths[hlit - 1] === 0; hlit--) {}
    for (hdist = 30; hdist > 1 && distLengths[hdist - 1] === 0; hdist--) {}

    // HCLEN
    treeSymbols = this.getTreeSymbols_(hlit, litLenLengths, hdist, distLengths);
    treeLengths = this.getLengths_(treeSymbols.freqs, 7);
    for (i = 0; i < 19; i++) {
      transLengths[i] = treeLengths[hclenOrder[i]];
    }
    for (hclen = 19; hclen > 4 && transLengths[hclen - 1] === 0; hclen--) {}
    treeCodes = this.getCodesFromLengths_(treeLengths);

    // 出力
    stream.writeBits(hlit - 257, 5, true);
    stream.writeBits(hdist - 1, 5, true);
    stream.writeBits(hclen - 4, 4, true);
    for (i = 0; i < hclen; i++) {
      stream.writeBits(transLengths[i], 3, true);
    }

    // ツリーの出力
    for (i = 0, il = treeSymbols.codes.length; i < il; i++) {
      code = treeSymbols.codes[i];
      stream.writeBits(treeCodes[code], treeLengths[code], true);

      // extra bits
      if (code >= 16) {
        i++;
        switch (code) {
          case 16:
            bitlen = 2;
            break;
          case 17:
            bitlen = 3;
            break;
          case 18:
            bitlen = 7;
            break;
          default:
            throw 'invalid code: ' + code;
        }
        stream.writeBits(treeSymbols.codes[i], bitlen, true);
      }
    }
    this.dynamicHuffman(data, [litLenCodes, litLenLengths], [distCodes, distLengths], stream);
    return stream.finish();
  };

  /**
   * 動的ハフマン符号化(カスタムハフマンテーブル)
   * @param {!(Array.<number>|Uint16Array)} dataArray LZ77 符号化済み byte array.
   * @param {!Zlib.BitStream} stream 書き込み用ビットストリーム.
   * @return {!Zlib.BitStream} ハフマン符号化済みビットストリームオブジェクト.
   */
  Zlib.RawDeflate.prototype.dynamicHuffman = function (dataArray, litLen, dist, stream) {
    /** @type {number} */
    var index;
    /** @type {number} */
    var length;
    /** @type {number} */
    var literal;
    /** @type {number} */
    var code;
    /** @type {number} */
    var litLenCodes;
    /** @type {number} */
    var litLenLengths;
    /** @type {number} */
    var distCodes;
    /** @type {number} */
    var distLengths;
    litLenCodes = litLen[0];
    litLenLengths = litLen[1];
    distCodes = dist[0];
    distLengths = dist[1];

    // 符号を BitStream に書き込んでいく
    for (index = 0, length = dataArray.length; index < length; ++index) {
      literal = dataArray[index];

      // literal or length
      stream.writeBits(litLenCodes[literal], litLenLengths[literal], true);

      // 長さ・距離符号
      if (literal > 256) {
        // length extra
        stream.writeBits(dataArray[++index], dataArray[++index], true);
        // distance
        code = dataArray[++index];
        stream.writeBits(distCodes[code], distLengths[code], true);
        // distance extra
        stream.writeBits(dataArray[++index], dataArray[++index], true);
        // 終端
      } else if (literal === 256) {
        break;
      }
    }
    return stream;
  };

  /**
   * 固定ハフマン符号化
   * @param {!(Array.<number>|Uint16Array)} dataArray LZ77 符号化済み byte array.
   * @param {!Zlib.BitStream} stream 書き込み用ビットストリーム.
   * @return {!Zlib.BitStream} ハフマン符号化済みビットストリームオブジェクト.
   */
  Zlib.RawDeflate.prototype.fixedHuffman = function (dataArray, stream) {
    /** @type {number} */
    var index;
    /** @type {number} */
    var length;
    /** @type {number} */
    var literal;

    // 符号を BitStream に書き込んでいく
    for (index = 0, length = dataArray.length; index < length; index++) {
      literal = dataArray[index];

      // 符号の書き込み
      Zlib.BitStream.prototype.writeBits.apply(stream, Zlib.RawDeflate.FixedHuffmanTable[literal]);

      // 長さ・距離符号
      if (literal > 0x100) {
        // length extra
        stream.writeBits(dataArray[++index], dataArray[++index], true);
        // distance
        stream.writeBits(dataArray[++index], 5);
        // distance extra
        stream.writeBits(dataArray[++index], dataArray[++index], true);
        // 終端
      } else if (literal === 0x100) {
        break;
      }
    }
    return stream;
  };

  /**
   * マッチ情報
   * @param {!number} length マッチした長さ.
   * @param {!number} backwardDistance マッチ位置との距離.
   * @constructor
   */
  Zlib.RawDeflate.Lz77Match = function (length, backwardDistance) {
    /** @type {number} match length. */
    this.length = length;
    /** @type {number} backward distance. */
    this.backwardDistance = backwardDistance;
  };

  /**
   * 長さ符号テーブル.
   * [コード, 拡張ビット, 拡張ビット長] の配列となっている.
   * @const
   * @type {!(Array.<number>|Uint32Array)}
   */
  Zlib.RawDeflate.Lz77Match.LengthCodeTable = function (table) {
    return new Uint32Array(table) ;
  }(function () {
    /** @type {!Array} */
    var table = [];
    /** @type {number} */
    var i;
    /** @type {!Array.<number>} */
    var c;
    for (i = 3; i <= 258; i++) {
      c = code(i);
      table[i] = c[2] << 24 | c[1] << 16 | c[0];
    }

    /**
     * @param {number} length lz77 length.
     * @return {!Array.<number>} lz77 codes.
     */
    function code(length) {
      switch (true) {
        case length === 3:
          return [257, length - 3, 0];
        case length === 4:
          return [258, length - 4, 0];
        case length === 5:
          return [259, length - 5, 0];
        case length === 6:
          return [260, length - 6, 0];
        case length === 7:
          return [261, length - 7, 0];
        case length === 8:
          return [262, length - 8, 0];
        case length === 9:
          return [263, length - 9, 0];
        case length === 10:
          return [264, length - 10, 0];
        case length <= 12:
          return [265, length - 11, 1];
        case length <= 14:
          return [266, length - 13, 1];
        case length <= 16:
          return [267, length - 15, 1];
        case length <= 18:
          return [268, length - 17, 1];
        case length <= 22:
          return [269, length - 19, 2];
        case length <= 26:
          return [270, length - 23, 2];
        case length <= 30:
          return [271, length - 27, 2];
        case length <= 34:
          return [272, length - 31, 2];
        case length <= 42:
          return [273, length - 35, 3];
        case length <= 50:
          return [274, length - 43, 3];
        case length <= 58:
          return [275, length - 51, 3];
        case length <= 66:
          return [276, length - 59, 3];
        case length <= 82:
          return [277, length - 67, 4];
        case length <= 98:
          return [278, length - 83, 4];
        case length <= 114:
          return [279, length - 99, 4];
        case length <= 130:
          return [280, length - 115, 4];
        case length <= 162:
          return [281, length - 131, 5];
        case length <= 194:
          return [282, length - 163, 5];
        case length <= 226:
          return [283, length - 195, 5];
        case length <= 257:
          return [284, length - 227, 5];
        case length === 258:
          return [285, length - 258, 0];
        default:
          throw 'invalid length: ' + length;
      }
    }
    return table;
  }());

  /**
   * 距離符号テーブル
   * @param {!number} dist 距離.
   * @return {!Array.<number>} コード、拡張ビット、拡張ビット長の配列.
   * @private
   */
  Zlib.RawDeflate.Lz77Match.prototype.getDistanceCode_ = function (dist) {
    /** @type {!Array.<number>} distance code table. */
    var r;
    switch (true) {
      case dist === 1:
        r = [0, dist - 1, 0];
        break;
      case dist === 2:
        r = [1, dist - 2, 0];
        break;
      case dist === 3:
        r = [2, dist - 3, 0];
        break;
      case dist === 4:
        r = [3, dist - 4, 0];
        break;
      case dist <= 6:
        r = [4, dist - 5, 1];
        break;
      case dist <= 8:
        r = [5, dist - 7, 1];
        break;
      case dist <= 12:
        r = [6, dist - 9, 2];
        break;
      case dist <= 16:
        r = [7, dist - 13, 2];
        break;
      case dist <= 24:
        r = [8, dist - 17, 3];
        break;
      case dist <= 32:
        r = [9, dist - 25, 3];
        break;
      case dist <= 48:
        r = [10, dist - 33, 4];
        break;
      case dist <= 64:
        r = [11, dist - 49, 4];
        break;
      case dist <= 96:
        r = [12, dist - 65, 5];
        break;
      case dist <= 128:
        r = [13, dist - 97, 5];
        break;
      case dist <= 192:
        r = [14, dist - 129, 6];
        break;
      case dist <= 256:
        r = [15, dist - 193, 6];
        break;
      case dist <= 384:
        r = [16, dist - 257, 7];
        break;
      case dist <= 512:
        r = [17, dist - 385, 7];
        break;
      case dist <= 768:
        r = [18, dist - 513, 8];
        break;
      case dist <= 1024:
        r = [19, dist - 769, 8];
        break;
      case dist <= 1536:
        r = [20, dist - 1025, 9];
        break;
      case dist <= 2048:
        r = [21, dist - 1537, 9];
        break;
      case dist <= 3072:
        r = [22, dist - 2049, 10];
        break;
      case dist <= 4096:
        r = [23, dist - 3073, 10];
        break;
      case dist <= 6144:
        r = [24, dist - 4097, 11];
        break;
      case dist <= 8192:
        r = [25, dist - 6145, 11];
        break;
      case dist <= 12288:
        r = [26, dist - 8193, 12];
        break;
      case dist <= 16384:
        r = [27, dist - 12289, 12];
        break;
      case dist <= 24576:
        r = [28, dist - 16385, 13];
        break;
      case dist <= 32768:
        r = [29, dist - 24577, 13];
        break;
      default:
        throw 'invalid distance';
    }
    return r;
  };

  /**
   * マッチ情報を LZ77 符号化配列で返す.
   * なお、ここでは以下の内部仕様で符号化している
   * [ CODE, EXTRA-BIT-LEN, EXTRA, CODE, EXTRA-BIT-LEN, EXTRA ]
   * @return {!Array.<number>} LZ77 符号化 byte array.
   */
  Zlib.RawDeflate.Lz77Match.prototype.toLz77Array = function () {
    /** @type {number} */
    var length = this.length;
    /** @type {number} */
    var dist = this.backwardDistance;
    /** @type {Array} */
    var codeArray = [];
    /** @type {number} */
    var pos = 0;
    /** @type {!Array.<number>} */
    var code;

    // length
    code = Zlib.RawDeflate.Lz77Match.LengthCodeTable[length];
    codeArray[pos++] = code & 0xffff;
    codeArray[pos++] = code >> 16 & 0xff;
    codeArray[pos++] = code >> 24;

    // distance
    code = this.getDistanceCode_(dist);
    codeArray[pos++] = code[0];
    codeArray[pos++] = code[1];
    codeArray[pos++] = code[2];
    return codeArray;
  };

  /**
   * LZ77 実装
   * @param {!(Array.<number>|Uint8Array)} dataArray LZ77 符号化するバイト配列.
   * @return {!(Array.<number>|Uint16Array)} LZ77 符号化した配列.
   */
  Zlib.RawDeflate.prototype.lz77 = function (dataArray) {
    /** @type {number} input position */
    var position;
    /** @type {number} input length */
    var length;
    /** @type {number} loop counter */
    var i;
    /** @type {number} loop limiter */
    var il;
    /** @type {number} chained-hash-table key */
    var matchKey;
    /** @type {Object.<number, Array.<number>>} chained-hash-table */
    var table = {};
    /** @const @type {number} */
    var windowSize = Zlib.RawDeflate.WindowSize;
    /** @type {Array.<number>} match list */
    var matchList;
    /** @type {Zlib.RawDeflate.Lz77Match} longest match */
    var longestMatch;
    /** @type {Zlib.RawDeflate.Lz77Match} previous longest match */
    var prevMatch;
    /** @type {!(Array.<number>|Uint16Array)} lz77 buffer */
    var lz77buf = new Uint16Array(dataArray.length * 2) ;
    /** @type {number} lz77 output buffer pointer */
    var pos = 0;
    /** @type {number} lz77 skip length */
    var skipLength = 0;
    /** @type {!(Array.<number>|Uint32Array)} */
    var freqsLitLen = new (Uint32Array )(286);
    /** @type {!(Array.<number>|Uint32Array)} */
    var freqsDist = new (Uint32Array )(30);
    /** @type {number} */
    var lazy = this.lazy;
    /** @type {*} temporary variable */
    var tmp;
    freqsLitLen[256] = 1; // EOB の最低出現回数は 1

    /**
     * マッチデータの書き込み
     * @param {Zlib.RawDeflate.Lz77Match} match LZ77 Match data.
     * @param {!number} offset スキップ開始位置(相対指定).
     * @private
     */
    function writeMatch(match, offset) {
      /** @type {Array.<number>} */
      var lz77Array = match.toLz77Array();
      /** @type {number} */
      var i;
      /** @type {number} */
      var il;
      for (i = 0, il = lz77Array.length; i < il; ++i) {
        lz77buf[pos++] = lz77Array[i];
      }
      freqsLitLen[lz77Array[0]]++;
      freqsDist[lz77Array[3]]++;
      skipLength = match.length + offset - 1;
      prevMatch = null;
    }

    // LZ77 符号化
    for (position = 0, length = dataArray.length; position < length; ++position) {
      // ハッシュキーの作成
      for (matchKey = 0, i = 0, il = Zlib.RawDeflate.Lz77MinLength; i < il; ++i) {
        if (position + i === length) {
          break;
        }
        matchKey = matchKey << 8 | dataArray[position + i];
      }

      // テーブルが未定義だったら作成する
      if (table[matchKey] === void 0) {
        table[matchKey] = [];
      }
      matchList = table[matchKey];

      // skip
      if (skipLength-- > 0) {
        matchList.push(position);
        continue;
      }

      // マッチテーブルの更新 (最大戻り距離を超えているものを削除する)
      while (matchList.length > 0 && position - matchList[0] > windowSize) {
        matchList.shift();
      }

      // データ末尾でマッチしようがない場合はそのまま流しこむ
      if (position + Zlib.RawDeflate.Lz77MinLength >= length) {
        if (prevMatch) {
          writeMatch(prevMatch, -1);
        }
        for (i = 0, il = length - position; i < il; ++i) {
          tmp = dataArray[position + i];
          lz77buf[pos++] = tmp;
          ++freqsLitLen[tmp];
        }
        break;
      }

      // マッチ候補から最長のものを探す
      if (matchList.length > 0) {
        longestMatch = this.searchLongestMatch_(dataArray, position, matchList);
        if (prevMatch) {
          // 現在のマッチの方が前回のマッチよりも長い
          if (prevMatch.length < longestMatch.length) {
            // write previous literal
            tmp = dataArray[position - 1];
            lz77buf[pos++] = tmp;
            ++freqsLitLen[tmp];

            // write current match
            writeMatch(longestMatch, 0);
          } else {
            // write previous match
            writeMatch(prevMatch, -1);
          }
        } else if (longestMatch.length < lazy) {
          prevMatch = longestMatch;
        } else {
          writeMatch(longestMatch, 0);
        }
        // 前回マッチしていて今回マッチがなかったら前回のを採用
      } else if (prevMatch) {
        writeMatch(prevMatch, -1);
      } else {
        tmp = dataArray[position];
        lz77buf[pos++] = tmp;
        ++freqsLitLen[tmp];
      }
      matchList.push(position); // マッチテーブルに現在の位置を保存
    }

    // 終端処理
    lz77buf[pos++] = 256;
    freqsLitLen[256]++;
    this.freqsLitLen = freqsLitLen;
    this.freqsDist = freqsDist;
    return /** @type {!(Uint16Array|Array.<number>)} */lz77buf.subarray(0, pos) ;
  };

  /**
   * マッチした候補の中から最長一致を探す
   * @param {!Object} data plain data byte array.
   * @param {!number} position plain data byte array position.
   * @param {!Array.<number>} matchList 候補となる位置の配列.
   * @return {!Zlib.RawDeflate.Lz77Match} 最長かつ最短距離のマッチオブジェクト.
   * @private
   */
  Zlib.RawDeflate.prototype.searchLongestMatch_ = function (data, position, matchList) {
    var match,
      currentMatch,
      matchMax = 0,
      matchLength,
      i,
      j,
      l,
      dl = data.length;

    // 候補を後ろから 1 つずつ絞り込んでゆく
    permatch: for (i = 0, l = matchList.length; i < l; i++) {
      match = matchList[l - i - 1];
      matchLength = Zlib.RawDeflate.Lz77MinLength;

      // 前回までの最長一致を末尾から一致検索する
      if (matchMax > Zlib.RawDeflate.Lz77MinLength) {
        for (j = matchMax; j > Zlib.RawDeflate.Lz77MinLength; j--) {
          if (data[match + j - 1] !== data[position + j - 1]) {
            continue permatch;
          }
        }
        matchLength = matchMax;
      }

      // 最長一致探索
      while (matchLength < Zlib.RawDeflate.Lz77MaxLength && position + matchLength < dl && data[match + matchLength] === data[position + matchLength]) {
        ++matchLength;
      }

      // マッチ長が同じ場合は後方を優先
      if (matchLength > matchMax) {
        currentMatch = match;
        matchMax = matchLength;
      }

      // 最長が確定したら後の処理は省略
      if (matchLength === Zlib.RawDeflate.Lz77MaxLength) {
        break;
      }
    }
    return new Zlib.RawDeflate.Lz77Match(matchMax, position - currentMatch);
  };

  /**
   * Tree-Transmit Symbols の算出
   * reference: PuTTY Deflate implementation
   * @param {number} hlit HLIT.
   * @param {!(Array.<number>|Uint8Array)} litlenLengths リテラルと長さ符号の符号長配列.
   * @param {number} hdist HDIST.
   * @param {!(Array.<number>|Uint8Array)} distLengths 距離符号の符号長配列.
   * @return {{
   *   codes: !(Array.<number>|Uint32Array),
   *   freqs: !(Array.<number>|Uint8Array)
   * }} Tree-Transmit Symbols.
   */
  Zlib.RawDeflate.prototype.getTreeSymbols_ = function (hlit, litlenLengths, hdist, distLengths) {
    var src = new (Uint32Array )(hlit + hdist),
      i,
      j,
      runLength,
      l,
      result = new (Uint32Array )(286 + 30),
      nResult,
      rpt,
      freqs = new (Uint8Array )(19);
    j = 0;
    for (i = 0; i < hlit; i++) {
      src[j++] = litlenLengths[i];
    }
    for (i = 0; i < hdist; i++) {
      src[j++] = distLengths[i];
    }

    // 符号化
    nResult = 0;
    for (i = 0, l = src.length; i < l; i += j) {
      // Run Length Encoding
      for (j = 1; i + j < l && src[i + j] === src[i]; ++j) {}
      runLength = j;
      if (src[i] === 0) {
        // 0 の繰り返しが 3 回未満ならばそのまま
        if (runLength < 3) {
          while (runLength-- > 0) {
            result[nResult++] = 0;
            freqs[0]++;
          }
        } else {
          while (runLength > 0) {
            // 繰り返しは最大 138 までなので切り詰める
            rpt = runLength < 138 ? runLength : 138;
            if (rpt > runLength - 3 && rpt < runLength) {
              rpt = runLength - 3;
            }

            // 3-10 回 -> 17
            if (rpt <= 10) {
              result[nResult++] = 17;
              result[nResult++] = rpt - 3;
              freqs[17]++;
              // 11-138 回 -> 18
            } else {
              result[nResult++] = 18;
              result[nResult++] = rpt - 11;
              freqs[18]++;
            }
            runLength -= rpt;
          }
        }
      } else {
        result[nResult++] = src[i];
        freqs[src[i]]++;
        runLength--;

        // 繰り返し回数が3回未満ならばランレングス符号は要らない
        if (runLength < 3) {
          while (runLength-- > 0) {
            result[nResult++] = src[i];
            freqs[src[i]]++;
          }
          // 3 回以上ならばランレングス符号化
        } else {
          while (runLength > 0) {
            // runLengthを 3-6 で分割
            rpt = runLength < 6 ? runLength : 6;
            if (rpt > runLength - 3 && rpt < runLength) {
              rpt = runLength - 3;
            }
            result[nResult++] = 16;
            result[nResult++] = rpt - 3;
            freqs[16]++;
            runLength -= rpt;
          }
        }
      }
    }
    return {
      codes: result.subarray(0, nResult) ,
      freqs: freqs
    };
  };

  /**
   * ハフマン符号の長さを取得する
   * @param {!(Array.<number>|Uint8Array|Uint32Array)} freqs 出現カウント.
   * @param {number} limit 符号長の制限.
   * @return {!(Array.<number>|Uint8Array)} 符号長配列.
   * @private
   */
  Zlib.RawDeflate.prototype.getLengths_ = function (freqs, limit) {
    /** @type {number} */
    var nSymbols = freqs.length;
    /** @type {Zlib.Heap} */
    var heap = new Zlib.Heap(2 * Zlib.RawDeflate.HUFMAX);
    /** @type {!(Array.<number>|Uint8Array)} */
    var length = new (Uint8Array )(nSymbols);
    /** @type {Array} */
    var nodes;
    /** @type {!(Array.<number>|Uint32Array)} */
    var values;
    /** @type {!(Array.<number>|Uint8Array)} */
    var codeLength;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;

    // ヒープの構築
    for (i = 0; i < nSymbols; ++i) {
      if (freqs[i] > 0) {
        heap.push(i, freqs[i]);
      }
    }
    nodes = new Array(heap.length / 2);
    values = new (Uint32Array )(heap.length / 2);

    // 非 0 の要素が一つだけだった場合は、そのシンボルに符号長 1 を割り当てて終了
    if (nodes.length === 1) {
      length[heap.pop().index] = 1;
      return length;
    }

    // Reverse Package Merge Algorithm による Canonical Huffman Code の符号長決定
    for (i = 0, il = heap.length / 2; i < il; ++i) {
      nodes[i] = heap.pop();
      values[i] = nodes[i].value;
    }
    codeLength = this.reversePackageMerge_(values, values.length, limit);
    for (i = 0, il = nodes.length; i < il; ++i) {
      length[nodes[i].index] = codeLength[i];
    }
    return length;
  };

  /**
   * Reverse Package Merge Algorithm.
   * @param {!(Array.<number>|Uint32Array)} freqs sorted probability.
   * @param {number} symbols number of symbols.
   * @param {number} limit code length limit.
   * @return {!(Array.<number>|Uint8Array)} code lengths.
   */
  Zlib.RawDeflate.prototype.reversePackageMerge_ = function (freqs, symbols, limit) {
    /** @type {!(Array.<number>|Uint16Array)} */
    var minimumCost = new (Uint16Array )(limit);
    /** @type {!(Array.<number>|Uint8Array)} */
    var flag = new (Uint8Array )(limit);
    /** @type {!(Array.<number>|Uint8Array)} */
    var codeLength = new (Uint8Array )(symbols);
    /** @type {Array} */
    var value = new Array(limit);
    /** @type {Array} */
    var type = new Array(limit);
    /** @type {Array.<number>} */
    var currentPosition = new Array(limit);
    /** @type {number} */
    var excess = (1 << limit) - symbols;
    /** @type {number} */
    var half = 1 << limit - 1;
    /** @type {number} */
    var i;
    /** @type {number} */
    var j;
    /** @type {number} */
    var t;
    /** @type {number} */
    var weight;
    /** @type {number} */
    var next;

    /**
     * @param {number} j
     */
    function takePackage(j) {
      /** @type {number} */
      var x = type[j][currentPosition[j]];
      if (x === symbols) {
        takePackage(j + 1);
        takePackage(j + 1);
      } else {
        --codeLength[x];
      }
      ++currentPosition[j];
    }
    minimumCost[limit - 1] = symbols;
    for (j = 0; j < limit; ++j) {
      if (excess < half) {
        flag[j] = 0;
      } else {
        flag[j] = 1;
        excess -= half;
      }
      excess <<= 1;
      minimumCost[limit - 2 - j] = (minimumCost[limit - 1 - j] / 2 | 0) + symbols;
    }
    minimumCost[0] = flag[0];
    value[0] = new Array(minimumCost[0]);
    type[0] = new Array(minimumCost[0]);
    for (j = 1; j < limit; ++j) {
      if (minimumCost[j] > 2 * minimumCost[j - 1] + flag[j]) {
        minimumCost[j] = 2 * minimumCost[j - 1] + flag[j];
      }
      value[j] = new Array(minimumCost[j]);
      type[j] = new Array(minimumCost[j]);
    }
    for (i = 0; i < symbols; ++i) {
      codeLength[i] = limit;
    }
    for (t = 0; t < minimumCost[limit - 1]; ++t) {
      value[limit - 1][t] = freqs[t];
      type[limit - 1][t] = t;
    }
    for (i = 0; i < limit; ++i) {
      currentPosition[i] = 0;
    }
    if (flag[limit - 1] === 1) {
      --codeLength[0];
      ++currentPosition[limit - 1];
    }
    for (j = limit - 2; j >= 0; --j) {
      i = 0;
      weight = 0;
      next = currentPosition[j + 1];
      for (t = 0; t < minimumCost[j]; t++) {
        weight = value[j + 1][next] + value[j + 1][next + 1];
        if (weight > freqs[i]) {
          value[j][t] = weight;
          type[j][t] = symbols;
          next += 2;
        } else {
          value[j][t] = freqs[i];
          type[j][t] = i;
          ++i;
        }
      }
      currentPosition[j] = 0;
      if (flag[j] === 1) {
        takePackage(j);
      }
    }
    return codeLength;
  };

  /**
   * 符号長配列からハフマン符号を取得する
   * reference: PuTTY Deflate implementation
   * @param {!(Array.<number>|Uint8Array)} lengths 符号長配列.
   * @return {!(Array.<number>|Uint16Array)} ハフマン符号配列.
   * @private
   */
  Zlib.RawDeflate.prototype.getCodesFromLengths_ = function (lengths) {
    var codes = new (Uint16Array )(lengths.length),
      count = [],
      startCode = [],
      code = 0,
      i,
      il,
      j,
      m;

    // Count the codes of each length.
    for (i = 0, il = lengths.length; i < il; i++) {
      count[lengths[i]] = (count[lengths[i]] | 0) + 1;
    }

    // Determine the starting code for each length block.
    for (i = 1, il = Zlib.RawDeflate.MaxCodeLength; i <= il; i++) {
      startCode[i] = code;
      code += count[i] | 0;
      code <<= 1;
    }

    // Determine the code for each symbol. Mirrored, of course.
    for (i = 0, il = lengths.length; i < il; i++) {
      code = startCode[lengths[i]];
      startCode[lengths[i]] += 1;
      codes[i] = 0;
      for (j = 0, m = lengths[i]; j < m; j++) {
        codes[i] = codes[i] << 1 | code & 1;
        code >>>= 1;
      }
    }
    return codes;
  };

  /**
   * @param {!(Array.<number>|Uint8Array)} input input buffer.
   * @param {Object=} opt_params options.
   * @constructor
   */
  Zlib.Unzip = function (input, opt_params) {
    opt_params = opt_params || {};
    /** @type {!(Array.<number>|Uint8Array)} */
    this.input = input instanceof Array ? new Uint8Array(input) : input;
    /** @type {number} */
    this.ip = 0;
    /** @type {number} */
    this.eocdrOffset;
    /** @type {number} */
    this.numberOfThisDisk;
    /** @type {number} */
    this.startDisk;
    /** @type {number} */
    this.totalEntriesThisDisk;
    /** @type {number} */
    this.totalEntries;
    /** @type {number} */
    this.centralDirectorySize;
    /** @type {number} */
    this.centralDirectoryOffset;
    /** @type {number} */
    this.commentLength;
    /** @type {(Array.<number>|Uint8Array)} */
    this.comment;
    /** @type {Array.<Zlib.Unzip.FileHeader>} */
    this.fileHeaderList;
    /** @type {Object.<string, number>} */
    this.filenameToIndex;
    /** @type {boolean} */
    this.verify = opt_params['verify'] || false;
    /** @type {(Array.<number>|Uint8Array)} */
    this.password = opt_params['password'];
  };
  Zlib.Unzip.CompressionMethod = Zlib.Zip.CompressionMethod;

  /**
   * @type {Array.<number>}
   * @const
   */
  Zlib.Unzip.FileHeaderSignature = Zlib.Zip.FileHeaderSignature;

  /**
   * @type {Array.<number>}
   * @const
   */
  Zlib.Unzip.LocalFileHeaderSignature = Zlib.Zip.LocalFileHeaderSignature;

  /**
   * @type {Array.<number>}
   * @const
   */
  Zlib.Unzip.CentralDirectorySignature = Zlib.Zip.CentralDirectorySignature;

  /**
   * @param {!(Array.<number>|Uint8Array)} input input buffer.
   * @param {number} ip input position.
   * @constructor
   */
  Zlib.Unzip.FileHeader = function (input, ip) {
    /** @type {!(Array.<number>|Uint8Array)} */
    this.input = input;
    /** @type {number} */
    this.offset = ip;
    /** @type {number} */
    this.length;
    /** @type {number} */
    this.version;
    /** @type {number} */
    this.os;
    /** @type {number} */
    this.needVersion;
    /** @type {number} */
    this.flags;
    /** @type {number} */
    this.compression;
    /** @type {number} */
    this.time;
    /** @type {number} */
    this.date;
    /** @type {number} */
    this.crc32;
    /** @type {number} */
    this.compressedSize;
    /** @type {number} */
    this.plainSize;
    /** @type {number} */
    this.fileNameLength;
    /** @type {number} */
    this.extraFieldLength;
    /** @type {number} */
    this.fileCommentLength;
    /** @type {number} */
    this.diskNumberStart;
    /** @type {number} */
    this.internalFileAttributes;
    /** @type {number} */
    this.externalFileAttributes;
    /** @type {number} */
    this.relativeOffset;
    /** @type {string} */
    this.filename;
    /** @type {!(Array.<number>|Uint8Array)} */
    this.extraField;
    /** @type {!(Array.<number>|Uint8Array)} */
    this.comment;
  };
  Zlib.Unzip.FileHeader.prototype.parse = function () {
    /** @type {!(Array.<number>|Uint8Array)} */
    var input = this.input;
    /** @type {number} */
    var ip = this.offset;

    // central file header signature
    if (input[ip++] !== Zlib.Unzip.FileHeaderSignature[0] || input[ip++] !== Zlib.Unzip.FileHeaderSignature[1] || input[ip++] !== Zlib.Unzip.FileHeaderSignature[2] || input[ip++] !== Zlib.Unzip.FileHeaderSignature[3]) {
      throw new Error('invalid file header signature');
    }

    // version made by
    this.version = input[ip++];
    this.os = input[ip++];

    // version needed to extract
    this.needVersion = input[ip++] | input[ip++] << 8;

    // general purpose bit flag
    this.flags = input[ip++] | input[ip++] << 8;

    // compression method
    this.compression = input[ip++] | input[ip++] << 8;

    // last mod file time
    this.time = input[ip++] | input[ip++] << 8;

    //last mod file date
    this.date = input[ip++] | input[ip++] << 8;

    // crc-32
    this.crc32 = (input[ip++] | input[ip++] << 8 | input[ip++] << 16 | input[ip++] << 24) >>> 0;

    // compressed size
    this.compressedSize = (input[ip++] | input[ip++] << 8 | input[ip++] << 16 | input[ip++] << 24) >>> 0;

    // uncompressed size
    this.plainSize = (input[ip++] | input[ip++] << 8 | input[ip++] << 16 | input[ip++] << 24) >>> 0;

    // file name length
    this.fileNameLength = input[ip++] | input[ip++] << 8;

    // extra field length
    this.extraFieldLength = input[ip++] | input[ip++] << 8;

    // file comment length
    this.fileCommentLength = input[ip++] | input[ip++] << 8;

    // disk number start
    this.diskNumberStart = input[ip++] | input[ip++] << 8;

    // internal file attributes
    this.internalFileAttributes = input[ip++] | input[ip++] << 8;

    // external file attributes
    this.externalFileAttributes = input[ip++] | input[ip++] << 8 | input[ip++] << 16 | input[ip++] << 24;

    // relative offset of local header
    this.relativeOffset = (input[ip++] | input[ip++] << 8 | input[ip++] << 16 | input[ip++] << 24) >>> 0;

    // file name
    this.filename = String.fromCharCode.apply(null, input.subarray(ip, ip += this.fileNameLength) );

    // extra field
    this.extraField = input.subarray(ip, ip += this.extraFieldLength) ;

    // file comment
    this.comment = input.subarray(ip, ip + this.fileCommentLength) ;
    this.length = ip - this.offset;
  };

  /**
   * @param {!(Array.<number>|Uint8Array)} input input buffer.
   * @param {number} ip input position.
   * @constructor
   */
  Zlib.Unzip.LocalFileHeader = function (input, ip) {
    /** @type {!(Array.<number>|Uint8Array)} */
    this.input = input;
    /** @type {number} */
    this.offset = ip;
    /** @type {number} */
    this.length;
    /** @type {number} */
    this.needVersion;
    /** @type {number} */
    this.flags;
    /** @type {number} */
    this.compression;
    /** @type {number} */
    this.time;
    /** @type {number} */
    this.date;
    /** @type {number} */
    this.crc32;
    /** @type {number} */
    this.compressedSize;
    /** @type {number} */
    this.plainSize;
    /** @type {number} */
    this.fileNameLength;
    /** @type {number} */
    this.extraFieldLength;
    /** @type {string} */
    this.filename;
    /** @type {!(Array.<number>|Uint8Array)} */
    this.extraField;
  };
  Zlib.Unzip.LocalFileHeader.Flags = Zlib.Zip.Flags;
  Zlib.Unzip.LocalFileHeader.prototype.parse = function () {
    /** @type {!(Array.<number>|Uint8Array)} */
    var input = this.input;
    /** @type {number} */
    var ip = this.offset;

    // local file header signature
    if (input[ip++] !== Zlib.Unzip.LocalFileHeaderSignature[0] || input[ip++] !== Zlib.Unzip.LocalFileHeaderSignature[1] || input[ip++] !== Zlib.Unzip.LocalFileHeaderSignature[2] || input[ip++] !== Zlib.Unzip.LocalFileHeaderSignature[3]) {
      throw new Error('invalid local file header signature');
    }

    // version needed to extract
    this.needVersion = input[ip++] | input[ip++] << 8;

    // general purpose bit flag
    this.flags = input[ip++] | input[ip++] << 8;

    // compression method
    this.compression = input[ip++] | input[ip++] << 8;

    // last mod file time
    this.time = input[ip++] | input[ip++] << 8;

    //last mod file date
    this.date = input[ip++] | input[ip++] << 8;

    // crc-32
    this.crc32 = (input[ip++] | input[ip++] << 8 | input[ip++] << 16 | input[ip++] << 24) >>> 0;

    // compressed size
    this.compressedSize = (input[ip++] | input[ip++] << 8 | input[ip++] << 16 | input[ip++] << 24) >>> 0;

    // uncompressed size
    this.plainSize = (input[ip++] | input[ip++] << 8 | input[ip++] << 16 | input[ip++] << 24) >>> 0;

    // file name length
    this.fileNameLength = input[ip++] | input[ip++] << 8;

    // extra field length
    this.extraFieldLength = input[ip++] | input[ip++] << 8;

    // file name
    this.filename = String.fromCharCode.apply(null, input.subarray(ip, ip += this.fileNameLength) );

    // extra field
    this.extraField = input.subarray(ip, ip += this.extraFieldLength) ;
    this.length = ip - this.offset;
  };
  Zlib.Unzip.prototype.searchEndOfCentralDirectoryRecord = function () {
    /** @type {!(Array.<number>|Uint8Array)} */
    var input = this.input;
    /** @type {number} */
    var ip;
    for (ip = input.length - 12; ip > 0; --ip) {
      if (input[ip] === Zlib.Unzip.CentralDirectorySignature[0] && input[ip + 1] === Zlib.Unzip.CentralDirectorySignature[1] && input[ip + 2] === Zlib.Unzip.CentralDirectorySignature[2] && input[ip + 3] === Zlib.Unzip.CentralDirectorySignature[3]) {
        this.eocdrOffset = ip;
        return;
      }
    }
    throw new Error('End of Central Directory Record not found');
  };
  Zlib.Unzip.prototype.parseEndOfCentralDirectoryRecord = function () {
    /** @type {!(Array.<number>|Uint8Array)} */
    var input = this.input;
    /** @type {number} */
    var ip;
    if (!this.eocdrOffset) {
      this.searchEndOfCentralDirectoryRecord();
    }
    ip = this.eocdrOffset;

    // signature
    if (input[ip++] !== Zlib.Unzip.CentralDirectorySignature[0] || input[ip++] !== Zlib.Unzip.CentralDirectorySignature[1] || input[ip++] !== Zlib.Unzip.CentralDirectorySignature[2] || input[ip++] !== Zlib.Unzip.CentralDirectorySignature[3]) {
      throw new Error('invalid signature');
    }

    // number of this disk
    this.numberOfThisDisk = input[ip++] | input[ip++] << 8;

    // number of the disk with the start of the central directory
    this.startDisk = input[ip++] | input[ip++] << 8;

    // total number of entries in the central directory on this disk
    this.totalEntriesThisDisk = input[ip++] | input[ip++] << 8;

    // total number of entries in the central directory
    this.totalEntries = input[ip++] | input[ip++] << 8;

    // size of the central directory
    this.centralDirectorySize = (input[ip++] | input[ip++] << 8 | input[ip++] << 16 | input[ip++] << 24) >>> 0;

    // offset of start of central directory with respect to the starting disk number
    this.centralDirectoryOffset = (input[ip++] | input[ip++] << 8 | input[ip++] << 16 | input[ip++] << 24) >>> 0;

    // .ZIP file comment length
    this.commentLength = input[ip++] | input[ip++] << 8;

    // .ZIP file comment
    this.comment = input.subarray(ip, ip + this.commentLength) ;
  };
  Zlib.Unzip.prototype.parseFileHeader = function () {
    /** @type {Array.<Zlib.Unzip.FileHeader>} */
    var filelist = [];
    /** @type {Object.<string, number>} */
    var filetable = {};
    /** @type {number} */
    var ip;
    /** @type {Zlib.Unzip.FileHeader} */
    var fileHeader;
    /*: @type {number} */
    var i;
    /*: @type {number} */
    var il;
    if (this.fileHeaderList) {
      return;
    }
    if (this.centralDirectoryOffset === void 0) {
      this.parseEndOfCentralDirectoryRecord();
    }
    ip = this.centralDirectoryOffset;
    for (i = 0, il = this.totalEntries; i < il; ++i) {
      fileHeader = new Zlib.Unzip.FileHeader(this.input, ip);
      fileHeader.parse();
      ip += fileHeader.length;
      filelist[i] = fileHeader;
      filetable[fileHeader.filename] = i;
    }
    if (this.centralDirectorySize < ip - this.centralDirectoryOffset) {
      throw new Error('invalid file header size');
    }
    this.fileHeaderList = filelist;
    this.filenameToIndex = filetable;
  };

  /**
   * @param {number} index file header index.
   * @param {Object=} opt_params
   * @return {!(Array.<number>|Uint8Array)} file data.
   */
  Zlib.Unzip.prototype.getFileData = function (index, opt_params) {
    opt_params = opt_params || {};
    /** @type {!(Array.<number>|Uint8Array)} */
    var input = this.input;
    /** @type {Array.<Zlib.Unzip.FileHeader>} */
    var fileHeaderList = this.fileHeaderList;
    /** @type {Zlib.Unzip.LocalFileHeader} */
    var localFileHeader;
    /** @type {number} */
    var offset;
    /** @type {number} */
    var length;
    /** @type {!(Array.<number>|Uint8Array)} */
    var buffer;
    /** @type {number} */
    var crc32;
    /** @type {Array.<number>|Uint32Array|Object} */
    var key;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    if (!fileHeaderList) {
      this.parseFileHeader();
    }
    if (fileHeaderList[index] === void 0) {
      throw new Error('wrong index');
    }
    offset = fileHeaderList[index].relativeOffset;
    localFileHeader = new Zlib.Unzip.LocalFileHeader(this.input, offset);
    localFileHeader.parse();
    offset += localFileHeader.length;
    length = localFileHeader.compressedSize;

    // decryption
    if ((localFileHeader.flags & Zlib.Unzip.LocalFileHeader.Flags.ENCRYPT) !== 0) {
      if (!(opt_params['password'] || this.password)) {
        throw new Error('please set password');
      }
      key = this.createDecryptionKey(opt_params['password'] || this.password);

      // encryption header
      for (i = offset, il = offset + 12; i < il; ++i) {
        this.decode(key, input[i]);
      }
      offset += 12;
      length -= 12;

      // decryption
      for (i = offset, il = offset + length; i < il; ++i) {
        input[i] = this.decode(key, input[i]);
      }
    }
    switch (localFileHeader.compression) {
      case Zlib.Unzip.CompressionMethod.STORE:
        buffer = this.input.subarray(offset, offset + length) ;
        break;
      case Zlib.Unzip.CompressionMethod.DEFLATE:
        buffer = new Zlib.RawInflate(this.input, {
          'index': offset,
          'bufferSize': localFileHeader.plainSize
        }).decompress();
        break;
      default:
        throw new Error('unknown compression type');
    }
    if (this.verify) {
      crc32 = Zlib.CRC32.calc(buffer);
      if (localFileHeader.crc32 !== crc32) {
        throw new Error('wrong crc: file=0x' + localFileHeader.crc32.toString(16) + ', data=0x' + crc32.toString(16));
      }
    }
    return buffer;
  };

  /**
   * @return {Array.<string>}
   */
  Zlib.Unzip.prototype.getFilenames = function () {
    /** @type {Array.<string>} */
    var filenameList = [];
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    /** @type {Array.<Zlib.Unzip.FileHeader>} */
    var fileHeaderList;
    if (!this.fileHeaderList) {
      this.parseFileHeader();
    }
    fileHeaderList = this.fileHeaderList;
    for (i = 0, il = fileHeaderList.length; i < il; ++i) {
      filenameList[i] = fileHeaderList[i].filename;
    }
    return filenameList;
  };

  /**
   * @param {string} filename extract filename.
   * @param {Object=} opt_params
   * @return {!(Array.<number>|Uint8Array)} decompressed data.
   */
  Zlib.Unzip.prototype.decompress = function (filename, opt_params) {
    /** @type {number} */
    var index;
    if (!this.filenameToIndex) {
      this.parseFileHeader();
    }
    index = this.filenameToIndex[filename];
    if (index === void 0) {
      throw new Error(filename + ' not found');
    }
    return this.getFileData(index, opt_params);
  };

  /**
   * @param {(Array.<number>|Uint8Array)} password
   */
  Zlib.Unzip.prototype.setPassword = function (password) {
    this.password = password;
  };

  /**
   * @param {(Array.<number>|Uint32Array|Object)} key
   * @param {number} n
   * @return {number}
   */
  Zlib.Unzip.prototype.decode = function (key, n) {
    n ^= this.getByte(/** @type {(Array.<number>|Uint32Array)} */key);
    this.updateKeys(/** @type {(Array.<number>|Uint32Array)} */key, n);
    return n;
  };

  // common method
  Zlib.Unzip.prototype.updateKeys = Zlib.Zip.prototype.updateKeys;
  Zlib.Unzip.prototype.createDecryptionKey = Zlib.Zip.prototype.createEncryptionKey;
  Zlib.Unzip.prototype.getByte = Zlib.Zip.prototype.getByte;

  /**
   * @fileoverview 雑多な関数群をまとめたモジュール実装.
   */

  /**
   * Byte String から Byte Array に変換.
   * @param {!string} str byte string.
   * @return {!Array.<number>} byte array.
   */
  Zlib.Util.stringToByteArray = function (str) {
    /** @type {!Array.<(string|number)>} */
    var tmp = str.split('');
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    for (i = 0, il = tmp.length; i < il; i++) {
      tmp[i] = (tmp[i].charCodeAt(0) & 0xff) >>> 0;
    }
    return tmp;
  };

  /**
   * @fileoverview Adler32 checksum 実装.
   */

  /**
   * Adler32 ハッシュ値の作成
   * @param {!(Array|Uint8Array|string)} array 算出に使用する byte array.
   * @return {number} Adler32 ハッシュ値.
   */
  Zlib.Adler32 = function (array) {
    if (typeof array === 'string') {
      array = Zlib.Util.stringToByteArray(array);
    }
    return Zlib.Adler32.update(1, array);
  };

  /**
   * Adler32 ハッシュ値の更新
   * @param {number} adler 現在のハッシュ値.
   * @param {!(Array|Uint8Array)} array 更新に使用する byte array.
   * @return {number} Adler32 ハッシュ値.
   */
  Zlib.Adler32.update = function (adler, array) {
    /** @type {number} */
    var s1 = adler & 0xffff;
    /** @type {number} */
    var s2 = adler >>> 16 & 0xffff;
    /** @type {number} array length */
    var len = array.length;
    /** @type {number} loop length (don't overflow) */
    var tlen;
    /** @type {number} array index */
    var i = 0;
    while (len > 0) {
      tlen = len > Zlib.Adler32.OptimizationParameter ? Zlib.Adler32.OptimizationParameter : len;
      len -= tlen;
      do {
        s1 += array[i++];
        s2 += s1;
      } while (--tlen);
      s1 %= 65521;
      s2 %= 65521;
    }
    return (s2 << 16 | s1) >>> 0;
  };

  /**
   * Adler32 最適化パラメータ
   * 現状では 1024 程度が最適.
   * @see http://jsperf.com/adler-32-simple-vs-optimized/3
   * @define {number}
   */
  Zlib.Adler32.OptimizationParameter = 1024;

  /**
   * ビットストリーム
   * @constructor
   * @param {!(Array|Uint8Array)=} buffer output buffer.
   * @param {number=} bufferPosition start buffer pointer.
   */
  Zlib.BitStream = function (buffer, bufferPosition) {
    /** @type {number} buffer index. */
    this.index = typeof bufferPosition === 'number' ? bufferPosition : 0;
    /** @type {number} bit index. */
    this.bitindex = 0;
    /** @type {!(Array|Uint8Array)} bit-stream output buffer. */
    this.buffer = buffer instanceof (Uint8Array ) ? buffer : new (Uint8Array )(Zlib.BitStream.DefaultBlockSize);

    // 入力された index が足りなかったら拡張するが、倍にしてもダメなら不正とする
    if (this.buffer.length * 2 <= this.index) {
      throw new Error("invalid index");
    } else if (this.buffer.length <= this.index) {
      this.expandBuffer();
    }
  };

  /**
   * デフォルトブロックサイズ.
   * @const
   * @type {number}
   */
  Zlib.BitStream.DefaultBlockSize = 0x8000;

  /**
   * expand buffer.
   * @return {!(Array|Uint8Array)} new buffer.
   */
  Zlib.BitStream.prototype.expandBuffer = function () {
    /** @type {!(Array|Uint8Array)} old buffer. */
    var oldbuf = this.buffer;
    /** @type {number} loop limiter. */
    var il = oldbuf.length;
    /** @type {!(Array|Uint8Array)} new buffer. */
    var buffer = new (Uint8Array )(il << 1);

    // copy buffer
    {
      buffer.set(oldbuf);
    }
    return this.buffer = buffer;
  };

  /**
   * 数値をビットで指定した数だけ書き込む.
   * @param {number} number 書き込む数値.
   * @param {number} n 書き込むビット数.
   * @param {boolean=} reverse 逆順に書き込むならば true.
   */
  Zlib.BitStream.prototype.writeBits = function (number, n, reverse) {
    var buffer = this.buffer;
    var index = this.index;
    var bitindex = this.bitindex;

    /** @type {number} current octet. */
    var current = buffer[index];
    /** @type {number} loop counter. */
    var i;

    /**
     * 32-bit 整数のビット順を逆にする
     * @param {number} n 32-bit integer.
     * @return {number} reversed 32-bit integer.
     * @private
     */
    function rev32_(n) {
      return Zlib.BitStream.ReverseTable[n & 0xFF] << 24 | Zlib.BitStream.ReverseTable[n >>> 8 & 0xFF] << 16 | Zlib.BitStream.ReverseTable[n >>> 16 & 0xFF] << 8 | Zlib.BitStream.ReverseTable[n >>> 24 & 0xFF];
    }
    if (reverse && n > 1) {
      number = n > 8 ? rev32_(number) >> 32 - n : Zlib.BitStream.ReverseTable[number] >> 8 - n;
    }

    // Byte 境界を超えないとき
    if (n + bitindex < 8) {
      current = current << n | number;
      bitindex += n;
      // Byte 境界を超えるとき
    } else {
      for (i = 0; i < n; ++i) {
        current = current << 1 | number >> n - i - 1 & 1;

        // next byte
        if (++bitindex === 8) {
          bitindex = 0;
          buffer[index++] = Zlib.BitStream.ReverseTable[current];
          current = 0;

          // expand
          if (index === buffer.length) {
            buffer = this.expandBuffer();
          }
        }
      }
    }
    buffer[index] = current;
    this.buffer = buffer;
    this.bitindex = bitindex;
    this.index = index;
  };

  /**
   * ストリームの終端処理を行う
   * @return {!(Array|Uint8Array)} 終端処理後のバッファを byte array で返す.
   */
  Zlib.BitStream.prototype.finish = function () {
    var buffer = this.buffer;
    var index = this.index;

    /** @type {!(Array|Uint8Array)} output buffer. */
    var output;

    // bitindex が 0 の時は余分に index が進んでいる状態
    if (this.bitindex > 0) {
      buffer[index] <<= 8 - this.bitindex;
      buffer[index] = Zlib.BitStream.ReverseTable[buffer[index]];
      index++;
    }

    // array truncation
    {
      output = buffer.subarray(0, index);
    }
    return output;
  };

  /**
   * 0-255 のビット順を反転したテーブル
   * @const
   * @type {!(Uint8Array|Array.<number>)}
   */
  Zlib.BitStream.ReverseTable = function (table) {
    return table;
  }(function () {
    /** @type {!(Array|Uint8Array)} reverse table. */
    var table = new (Uint8Array )(256);
    /** @type {number} loop counter. */
    var i;

    // generate
    for (i = 0; i < 256; ++i) {
      table[i] = function (n) {
        var r = n;
        var s = 7;
        for (n >>>= 1; n; n >>>= 1) {
          r <<= 1;
          r |= n & 1;
          --s;
        }
        return (r << s & 0xff) >>> 0;
      }(i);
    }
    return table;
  }());

  /**
   * CRC32 ハッシュ値を取得
   * @param {!(Array.<number>|Uint8Array)} data data byte array.
   * @param {number=} pos data position.
   * @param {number=} length data length.
   * @return {number} CRC32.
   */
  Zlib.CRC32.calc = function (data, pos, length) {
    return Zlib.CRC32.update(data, 0, pos, length);
  };

  /**
   * CRC32ハッシュ値を更新
   * @param {!(Array.<number>|Uint8Array)} data data byte array.
   * @param {number} crc CRC32.
   * @param {number=} pos data position.
   * @param {number=} length data length.
   * @return {number} CRC32.
   */
  Zlib.CRC32.update = function (data, crc, pos, length) {
    var table = Zlib.CRC32.Table;
    var i = typeof pos === 'number' ? pos : pos = 0;
    var il = typeof length === 'number' ? length : data.length;
    crc ^= 0xffffffff;

    // loop unrolling for performance
    for (i = il & 7; i--; ++pos) {
      crc = crc >>> 8 ^ table[(crc ^ data[pos]) & 0xff];
    }
    for (i = il >> 3; i--; pos += 8) {
      crc = crc >>> 8 ^ table[(crc ^ data[pos]) & 0xff];
      crc = crc >>> 8 ^ table[(crc ^ data[pos + 1]) & 0xff];
      crc = crc >>> 8 ^ table[(crc ^ data[pos + 2]) & 0xff];
      crc = crc >>> 8 ^ table[(crc ^ data[pos + 3]) & 0xff];
      crc = crc >>> 8 ^ table[(crc ^ data[pos + 4]) & 0xff];
      crc = crc >>> 8 ^ table[(crc ^ data[pos + 5]) & 0xff];
      crc = crc >>> 8 ^ table[(crc ^ data[pos + 6]) & 0xff];
      crc = crc >>> 8 ^ table[(crc ^ data[pos + 7]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  /**
   * @param {number} num
   * @param {number} crc
   * @returns {number}
   */
  Zlib.CRC32.single = function (num, crc) {
    return (Zlib.CRC32.Table[(num ^ crc) & 0xff] ^ num >>> 8) >>> 0;
  };

  /**
   * @type {Array.<number>}
   * @const
   * @private
   */
  Zlib.CRC32.Table_ = [0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419, 0x706af48f, 0xe963a535, 0x9e6495a3, 0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988, 0x09b64c2b, 0x7eb17cbd, 0xe7b82d07, 0x90bf1d91, 0x1db71064, 0x6ab020f2, 0xf3b97148, 0x84be41de, 0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7, 0x136c9856, 0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9, 0xfa0f3d63, 0x8d080df5, 0x3b6e20c8, 0x4c69105e, 0xd56041e4, 0xa2677172, 0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b, 0x35b5a8fa, 0x42b2986c, 0xdbbbc9d6, 0xacbcf940, 0x32d86ce3, 0x45df5c75, 0xdcd60dcf, 0xabd13d59, 0x26d930ac, 0x51de003a, 0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423, 0xcfba9599, 0xb8bda50f, 0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924, 0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d, 0x76dc4190, 0x01db7106, 0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f, 0x9fbfe4a5, 0xe8b8d433, 0x7807c9a2, 0x0f00f934, 0x9609a88e, 0xe10e9818, 0x7f6a0dbb, 0x086d3d2d, 0x91646c97, 0xe6635c01, 0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e, 0x6c0695ed, 0x1b01a57b, 0x8208f4c1, 0xf50fc457, 0x65b0d9c6, 0x12b7e950, 0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3, 0xfbd44c65, 0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2, 0x4adfa541, 0x3dd895d7, 0xa4d1c46d, 0xd3d6f4fb, 0x4369e96a, 0x346ed9fc, 0xad678846, 0xda60b8d0, 0x44042d73, 0x33031de5, 0xaa0a4c5f, 0xdd0d7cc9, 0x5005713c, 0x270241aa, 0xbe0b1010, 0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f, 0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17, 0x2eb40d81, 0xb7bd5c3b, 0xc0ba6cad, 0xedb88320, 0x9abfb3b6, 0x03b6e20c, 0x74b1d29a, 0xead54739, 0x9dd277af, 0x04db2615, 0x73dc1683, 0xe3630b12, 0x94643b84, 0x0d6d6a3e, 0x7a6a5aa8, 0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1, 0xf00f9344, 0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb, 0x196c3671, 0x6e6b06e7, 0xfed41b76, 0x89d32be0, 0x10da7a5a, 0x67dd4acc, 0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5, 0xd6d6a3e8, 0xa1d1937e, 0x38d8c2c4, 0x4fdff252, 0xd1bb67f1, 0xa6bc5767, 0x3fb506dd, 0x48b2364b, 0xd80d2bda, 0xaf0a1b4c, 0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55, 0x316e8eef, 0x4669be79, 0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236, 0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f, 0xc5ba3bbe, 0xb2bd0b28, 0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31, 0x2cd99e8b, 0x5bdeae1d, 0x9b64c2b0, 0xec63f226, 0x756aa39c, 0x026d930a, 0x9c0906a9, 0xeb0e363f, 0x72076785, 0x05005713, 0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38, 0x92d28e9b, 0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21, 0x86d3d2d4, 0xf1d4e242, 0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1, 0x18b74777, 0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c, 0x8f659eff, 0xf862ae69, 0x616bffd3, 0x166ccf45, 0xa00ae278, 0xd70dd2ee, 0x4e048354, 0x3903b3c2, 0xa7672661, 0xd06016f7, 0x4969474d, 0x3e6e77db, 0xaed16a4a, 0xd9d65adc, 0x40df0b66, 0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9, 0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605, 0xcdd70693, 0x54de5729, 0x23d967bf, 0xb3667a2e, 0xc4614ab8, 0x5d681b02, 0x2a6f2b94, 0xb40bbe37, 0xc30c8ea1, 0x5a05df1b, 0x2d02ef8d];

  /**
   * @type {!(Array.<number>|Uint32Array)} CRC-32 Table.
   * @const
   */
  Zlib.CRC32.Table = new Uint32Array(Zlib.CRC32.Table_) ;

  /**
   * @fileoverview Deflate (RFC1951) 実装.
   * Deflateアルゴリズム本体は Zlib.RawDeflate で実装されている.
   */

  /**
   * Zlib Deflate
   * @constructor
   * @param {!(Array|Uint8Array)} input 符号化する対象の byte array.
   * @param {Object=} opt_params option parameters.
   */
  Zlib.Deflate = function (input, opt_params) {
    /** @type {!(Array|Uint8Array)} */
    this.input = input;
    /** @type {!(Array|Uint8Array)} */
    this.output = new (Uint8Array )(Zlib.Deflate.DefaultBufferSize);
    /** @type {Zlib.Deflate.CompressionType} */
    this.compressionType = Zlib.Deflate.CompressionType.DYNAMIC;
    /** @type {Zlib.RawDeflate} */
    this.rawDeflate;
    /** @type {Object} */
    var rawDeflateOption = {};
    /** @type {string} */
    var prop;

    // option parameters
    if (opt_params || !(opt_params = {})) {
      if (typeof opt_params['compressionType'] === 'number') {
        this.compressionType = opt_params['compressionType'];
      }
    }

    // copy options
    for (prop in opt_params) {
      rawDeflateOption[prop] = opt_params[prop];
    }

    // set raw-deflate output buffer
    rawDeflateOption['outputBuffer'] = this.output;
    this.rawDeflate = new Zlib.RawDeflate(this.input, rawDeflateOption);
  };

  /**
   * @const
   * @type {number} デフォルトバッファサイズ.
   */
  Zlib.Deflate.DefaultBufferSize = 0x8000;

  /**
   * @enum {number}
   */
  Zlib.Deflate.CompressionType = Zlib.RawDeflate.CompressionType;

  /**
   * 直接圧縮に掛ける.
   * @param {!(Array|Uint8Array)} input target buffer.
   * @param {Object=} opt_params option parameters.
   * @return {!(Array|Uint8Array)} compressed data byte array.
   */
  Zlib.Deflate.compress = function (input, opt_params) {
    return new Zlib.Deflate(input, opt_params).compress();
  };

  /**
   * Deflate Compression.
   * @return {!(Array|Uint8Array)} compressed data byte array.
   */
  Zlib.Deflate.prototype.compress = function () {
    /** @type {Zlib.CompressionMethod} */
    var cm;
    /** @type {number} */
    var cinfo;
    /** @type {number} */
    var cmf;
    /** @type {number} */
    var flg;
    /** @type {number} */
    var fcheck;
    /** @type {number} */
    var fdict;
    /** @type {number} */
    var flevel;
    /** @type {number} */
    var adler;
    /** @type {!(Array|Uint8Array)} */
    var output;
    /** @type {number} */
    var pos = 0;
    output = this.output;

    // Compression Method and Flags
    cm = Zlib.CompressionMethod.DEFLATE;
    switch (cm) {
      case Zlib.CompressionMethod.DEFLATE:
        cinfo = Math.LOG2E * Math.log(Zlib.RawDeflate.WindowSize) - 8;
        break;
      default:
        throw new Error('invalid compression method');
    }
    cmf = cinfo << 4 | cm;
    output[pos++] = cmf;

    // Flags
    fdict = 0;
    switch (cm) {
      case Zlib.CompressionMethod.DEFLATE:
        switch (this.compressionType) {
          case Zlib.Deflate.CompressionType.NONE:
            flevel = 0;
            break;
          case Zlib.Deflate.CompressionType.FIXED:
            flevel = 1;
            break;
          case Zlib.Deflate.CompressionType.DYNAMIC:
            flevel = 2;
            break;
          default:
            throw new Error('unsupported compression type');
        }
        break;
      default:
        throw new Error('invalid compression method');
    }
    flg = flevel << 6 | fdict << 5;
    fcheck = 31 - (cmf * 256 + flg) % 31;
    flg |= fcheck;
    output[pos++] = flg;

    // Adler-32 checksum
    adler = Zlib.Adler32(this.input);
    this.rawDeflate.op = pos;
    output = this.rawDeflate.compress();
    pos = output.length;
    {
      // subarray 分を元にもどす
      output = new Uint8Array(output.buffer);
      // expand buffer
      if (output.length <= pos + 4) {
        this.output = new Uint8Array(output.length + 4);
        this.output.set(output);
        output = this.output;
      }
      output = output.subarray(0, pos + 4);
    }

    // adler32
    output[pos++] = adler >> 24 & 0xff;
    output[pos++] = adler >> 16 & 0xff;
    output[pos++] = adler >> 8 & 0xff;
    output[pos++] = adler & 0xff;
    return output;
  };

  class BrowserLocalFile {
    constructor(blob) {
      this.file = blob;
    }
    async read(position, length) {
      const file = this.file;
      if (position !== undefined) {
        return file.slice(position, position + length).arrayBuffer();
      } else {
        return file.arrayBuffer();
      }
    }
  }

  typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
  class RemoteFile {
    constructor(args) {
      this.config = args;
      this.url = mapUrl(args.path || args.url);
    }
    async read(position, length) {
      length = Math.ceil(length);
      const headers = this.config.headers || {};
      const rangeString = "bytes=" + position + "-" + (position + length - 1);
      headers['Range'] = rangeString;
      let url = this.url.slice(); // slice => copy
      headers['User-Agent'] = 'IGV';
      if (this.config.oauthToken) {
        const token = resolveToken(this.config.oauthToken);
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (this.config.apiKey) {
        url = addParameter(url, "key", this.config.apiKey);
      }
      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
        redirect: 'follow',
        mode: 'cors'
      });
      const status = response.status;
      if (status >= 400) {
        console.error(`${status}  ${this.config.url}`);
        const err = Error(response.statusText);
        err.code = status;
        throw err;
      } else {
        return response.arrayBuffer();
      }

      /**
       * token can be a string, a function that returns a string, or a function that returns a Promise for a string
       * @param token
       * @returns {Promise<*>}
       */
      async function resolveToken(token) {
        if (typeof token === 'function') {
          return await Promise.resolve(token()); // Normalize the result to a promise, since we don't know what the function returns
        } else {
          return token;
        }
      }
    }
  }
  function mapUrl(url) {
    if (url.includes("//www.dropbox.com")) {
      return url.replace("//www.dropbox.com", "//dl.dropboxusercontent.com");
    } else if (url.startsWith("ftp://ftp.ncbi.nlm.nih.gov")) {
      return url.replace("ftp://", "https://");
    } else {
      return url;
    }
  }
  function addParameter(url, name, value) {
    const paramSeparator = url.includes("?") ? "&" : "?";
    return url + paramSeparator + name + "=" + value;
  }

  class ThrottledFile {
    constructor(file, rateLimiter) {
      this.file = file;
      this.rateLimiter = rateLimiter;
    }
    async read(position, length) {
      const file = this.file;
      const rateLimiter = this.rateLimiter;
      return new Promise(function (fulfill, reject) {
        rateLimiter.limiter(async function (f) {
          try {
            const result = await f.read(position, length);
            fulfill(result);
          } catch (e) {
            reject(e);
          }
        })(file);
      });
    }
  }

  class RateLimiter {
    constructor(wait) {
      this.wait = wait === undefined ? 100 : wait;
      this.isCalled = false;
      this.calls = [];
    }
    limiter(fn) {
      const self = this;
      let caller = function () {
        if (self.calls.length && !self.isCalled) {
          self.isCalled = true;
          self.calls.shift().call();
          setTimeout(function () {
            self.isCalled = false;
            caller();
          }, self.wait);
        }
      };
      return function () {
        self.calls.push(fn.bind(this, ...arguments));
        caller();
      };
    }
  }

  class BufferedFile {
    constructor(args) {
      this.file = args.file;
      this.size = args.size || 64000;
      this.position = 0;
      this.bufferStart = 0;
      this.bufferLength = 0;
      this.buffer = undefined;
    }
    async read(position, length) {
      const start = position;
      const end = position + length;
      const bufferStart = this.bufferStart;
      const bufferEnd = this.bufferStart + this.bufferLength;
      if (length > this.size) {
        // Request larger than max buffer size,  pass through to underlying file
        //console.log("0")
        this.buffer = undefined;
        this.bufferStart = 0;
        this.bufferLength = 0;
        return this.file.read(position, length);
      }
      if (start >= bufferStart && end <= bufferEnd) {
        // Request within buffer bounds
        //console.log("1")
        const sliceStart = start - bufferStart;
        const sliceEnd = sliceStart + length;
        return this.buffer.slice(sliceStart, sliceEnd);
      } else if (start < bufferStart && end > bufferStart) {
        // Overlap left, here for completness but this is an unexpected case in straw.  We don't adjust the buffer.
        //console.log("2")
        const l1 = bufferStart - start;
        const a1 = await this.file.read(position, l1);
        const l2 = length - l1;
        if (l2 > 0) {
          //this.buffer = await this.file.read(bufferStart, this.size)
          const a2 = this.buffer.slice(0, l2);
          return concatBuffers(a1, a2);
        } else {
          return a1;
        }
      } else if (start < bufferEnd && end > bufferEnd) {
        // Overlap right
        // console.log("3")
        const l1 = bufferEnd - start;
        const sliceStart = this.bufferLength - l1;
        const a1 = this.buffer.slice(sliceStart, this.bufferLength);
        const l2 = length - l1;
        if (l2 > 0) {
          try {
            this.buffer = await this.file.read(bufferEnd, this.size);
            this.bufferStart = bufferEnd;
            this.bufferLength = this.buffer.byteLength;
            const a2 = this.buffer.slice(0, l2);
            return concatBuffers(a1, a2);
          } catch (e) {
            // A "unsatisfiable range" error is expected here if we overlap past the end of file
            if (e.code && e.code === 416) {
              return a1;
            } else {
              throw e;
            }
          }
        } else {
          return a1;
        }
      } else {
        // No overlap with buffer
        // console.log("4")
        this.buffer = await this.file.read(position, this.size);
        this.bufferStart = position;
        this.bufferLength = this.buffer.byteLength;
        return this.buffer.slice(0, length);
      }
    }
  }

  /**
   * concatenates 2 array buffers.
   * Credit: https://gist.github.com/72lions/4528834
   *
   * @private
   * @param {ArrayBuffers} buffer1 The first buffer.
   * @param {ArrayBuffers} buffer2 The second buffer.
   * @return {ArrayBuffers} The new ArrayBuffer created out of the two.
   */
  var concatBuffers = function (buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  };

  // TODO -- big endian

  const BinaryParser = function (dataView, littleEndian) {
    this.littleEndian = littleEndian !== undefined ? littleEndian : true;
    this.position = 0;
    this.view = dataView;
    this.length = dataView.byteLength;
  };
  BinaryParser.prototype.available = function () {
    return this.length - this.position;
  };
  BinaryParser.prototype.remLength = function () {
    return this.length - this.position;
  };
  BinaryParser.prototype.hasNext = function () {
    return this.position < this.length - 1;
  };
  BinaryParser.prototype.getByte = function () {
    var retValue = this.view.getUint8(this.position, this.littleEndian);
    this.position++;
    return retValue;
  };
  BinaryParser.prototype.getShort = function () {
    var retValue = this.view.getInt16(this.position, this.littleEndian);
    this.position += 2;
    return retValue;
  };
  BinaryParser.prototype.getUShort = function () {
    // var byte1 = this.getByte(),
    //     byte2 = this.getByte(),
    //     retValue = ((byte2 << 24 >>> 16) + (byte1 << 24 >>> 24));
    //     return retValue;

    //
    var retValue = this.view.getUint16(this.position, this.littleEndian);
    this.position += 2;
    return retValue;
  };
  BinaryParser.prototype.getInt = function () {
    var retValue = this.view.getInt32(this.position, this.littleEndian);
    this.position += 4;
    return retValue;
  };
  BinaryParser.prototype.getUInt = function () {
    var retValue = this.view.getUint32(this.position, this.littleEndian);
    this.position += 4;
    return retValue;
  };
  BinaryParser.prototype.getLong = function () {
    // DataView doesn't support long. So we'll try manually

    var b = [];
    b[0] = this.view.getUint8(this.position);
    b[1] = this.view.getUint8(this.position + 1);
    b[2] = this.view.getUint8(this.position + 2);
    b[3] = this.view.getUint8(this.position + 3);
    b[4] = this.view.getUint8(this.position + 4);
    b[5] = this.view.getUint8(this.position + 5);
    b[6] = this.view.getUint8(this.position + 6);
    b[7] = this.view.getUint8(this.position + 7);
    var value = 0;
    if (this.littleEndian) {
      for (var i = b.length - 1; i >= 0; i--) {
        value = value * 256 + b[i];
      }
    } else {
      for (var i = 0; i < b.length; i++) {
        value = value * 256 + b[i];
      }
    }
    this.position += 8;
    return value;
  };
  BinaryParser.prototype.getString = function (len) {
    var s = "";
    var c;
    while ((c = this.view.getUint8(this.position++)) != 0) {
      s += String.fromCharCode(c);
      if (len && s.length == len) break;
    }
    return s;
  };
  BinaryParser.prototype.getFixedLengthString = function (len) {
    var s = "";
    var i;
    var c;
    for (i = 0; i < len; i++) {
      c = this.view.getUint8(this.position++);
      if (c > 0) {
        s += String.fromCharCode(c);
      }
    }
    return s;
  };
  BinaryParser.prototype.getFixedLengthTrimmedString = function (len) {
    var s = "";
    var i;
    var c;
    for (i = 0; i < len; i++) {
      c = this.view.getUint8(this.position++);
      if (c > 32) {
        s += String.fromCharCode(c);
      }
    }
    return s;
  };
  BinaryParser.prototype.getFloat = function () {
    var retValue = this.view.getFloat32(this.position, this.littleEndian);
    this.position += 4;
    return retValue;
  };
  BinaryParser.prototype.getDouble = function () {
    var retValue = this.view.getFloat64(this.position, this.littleEndian);
    this.position += 8;
    return retValue;
  };
  BinaryParser.prototype.skip = function (n) {
    this.position += n;
    return this.position;
  };

  /**
   * Return a bgzip (bam and tabix) virtual pointer
   * TODO -- why isn't 8th byte used ?
   * @returns {*}
   */
  BinaryParser.prototype.getVPointer = function () {
    var position = this.position,
      offset = this.view.getUint8(position + 1) << 8 | this.view.getUint8(position),
      byte6 = (this.view.getUint8(position + 6) & 0xff) * 0x100000000,
      byte5 = (this.view.getUint8(position + 5) & 0xff) * 0x1000000,
      byte4 = (this.view.getUint8(position + 4) & 0xff) * 0x10000,
      byte3 = (this.view.getUint8(position + 3) & 0xff) * 0x100,
      byte2 = this.view.getUint8(position + 2) & 0xff,
      block = byte6 + byte5 + byte4 + byte3 + byte2;
    this.position += 8;

    //       if (block == 0 && offset == 0) {
    //           return null;
    //       } else {
    return new VPointer(block, offset);
    //       }
  };
  function VPointer(block, offset) {
    this.block = block;
    this.offset = offset;
  }
  VPointer.prototype.isLessThan = function (vp) {
    return this.block < vp.block || this.block === vp.block && this.offset < vp.offset;
  };
  VPointer.prototype.isGreaterThan = function (vp) {
    return this.block > vp.block || this.block === vp.block && this.offset > vp.offset;
  };
  VPointer.prototype.print = function () {
    return "" + this.block + ":" + this.offset;
  };

  class MatrixZoomData {
    constructor(chr1, chr2) {
      this.chr1 = chr1; // chromosome index
      this.chr2 = chr2;
    }
    getKey() {
      return this.chr1.name + "_" + this.chr2.name + "_" + this.zoom.unit + "_" + this.zoom.binSize;
    }
    getBlockNumbers(region1, region2, version) {
      // Verify region chromosomes and swap if neccessary
      if (region1.chr == this.chr2 && region2.chr === this.chr1) {
        const tmp = region1;
        region1 = region2;
        region2 = tmp;
      }
      const sameChr = this.chr1 === this.chr2;
      const binsize = this.zoom.binSize;
      const blockBinCount = this.blockBinCount;
      const blockColumnCount = this.blockColumnCount;
      return version < 9 || !sameChr ? getBlockNumbersV8() : getBlockNumbersV9();
      function getBlockNumbersV8() {
        const x1 = region1.start / binsize;
        const x2 = region1.end / binsize;
        const y1 = region2.start / binsize;
        const y2 = region2.end / binsize;
        const col1 = Math.floor(x1 / blockBinCount);
        const col2 = Math.floor((x2 - 1) / blockBinCount);
        const row1 = Math.floor(y1 / blockBinCount);
        const row2 = Math.floor((y2 - 1) / blockBinCount);
        const blockNumbers = [];
        for (let row = row1; row <= row2; row++) {
          for (let column = col1; column <= col2; column++) {
            let blockNumber;
            if (sameChr && row < column) {
              blockNumber = column * blockColumnCount + row;
            } else {
              blockNumber = row * blockColumnCount + column;
            }
            if (!blockNumbers.includes(blockNumber)) {
              // possible from transposition
              blockNumbers.push(blockNumber);
            }
          }
        }
        return blockNumbers;
      }
      function getBlockNumbersV9() {
        const binX1 = region1.start / binsize;
        const binX2 = region1.end / binsize;
        const binY1 = region2.start / binsize;
        const binY2 = region2.end / binsize;

        // PAD = positionAlongDiagonal (~projected)
        // Depth is axis perpendicular to diagonal; nearer means closer to diagonal
        const translatedLowerPAD = Math.floor((binX1 + binY1) / 2 / blockBinCount);
        const translatedHigherPAD = Math.floor((binX2 + binY2) / 2 / blockBinCount);
        const translatedNearerDepth = Math.floor(Math.log2(1 + Math.abs(binX1 - binY2) / Math.sqrt(2) / blockBinCount));
        const translatedFurtherDepth = Math.floor(Math.log2(1 + Math.abs(binX2 - binY1) / Math.sqrt(2) / blockBinCount));

        // because code above assume above diagonal; but we could be below diagonal
        const containsDiagonal = (binX2 - binY1) * (binX1 - binY2) < 0; // i.e. sign of (x-y) opposite on 2 corners
        const nearerDepth = containsDiagonal ? 0 : Math.min(translatedNearerDepth, translatedFurtherDepth);
        const furtherDepth = Math.max(translatedNearerDepth, translatedFurtherDepth);
        const blockNumbers = [];
        for (let depth = nearerDepth; depth <= furtherDepth; depth++) {
          for (let pad = translatedLowerPAD; pad <= translatedHigherPAD; pad++) {
            const block_number = depth * blockColumnCount + pad;
            blockNumbers.push(block_number);
          }
        }
        return blockNumbers;
      }
    }
    static parseMatrixZoomData(chr1, chr2, dis) {
      const zd = new MatrixZoomData(chr1, chr2);
      const unit = dis.getString();
      const zoomIndex = dis.getInt();
      const sumCounts = dis.getFloat();
      const occupiedCellCount = dis.getFloat();
      const stdDev = dis.getFloat();
      const percent95 = dis.getFloat();
      const binSize = dis.getInt();
      zd.blockBinCount = dis.getInt();
      zd.blockColumnCount = dis.getInt();
      const nBlocks = dis.getInt();
      zd.zoom = {
        index: zoomIndex,
        unit: unit,
        binSize: binSize
      };
      zd.blockIndex = new StaticBlockIndex(nBlocks, dis);
      const nBins1 = chr1.size / binSize;
      const nBins2 = chr2.size / binSize;
      const avgCount = sumCounts / nBins1 / nBins2; // <= trying to avoid overflows

      zd.averageCount = avgCount;
      zd.sumCounts = sumCounts;
      zd.stdDev = stdDev;
      zd.occupiedCellCount = occupiedCellCount;
      zd.percent95 = percent95;
      return zd;
    }
  }
  class StaticBlockIndex {
    constructor(nBlocks, dis) {
      this.blockIndex = {};
      while (nBlocks-- > 0) {
        const blockNumber = dis.getInt();
        const filePosition = dis.getLong();
        const size = dis.getInt();
        this.blockIndex[blockNumber] = {
          filePosition,
          size
        };
      }
    }
    getBlockIndexEntry(blockNumber) {
      return this.blockIndex[blockNumber];
    }
  }

  class Matrix {
    constructor(chr1, chr2, zoomDataList) {
      this.chr1 = chr1;
      this.chr2 = chr2;
      this.bpZoomData = [];
      this.fragZoomData = [];
      for (let zd of zoomDataList) {
        if (zd.zoom.unit === "BP") {
          this.bpZoomData.push(zd);
        } else {
          this.fragZoomData.push(zd);
        }
      }
    }

    /**
     * Find the best zoom level for the given bin size
     * @param binSize
     * @param unit
     * @returns {number}
     */
    findZoomForResolution(binSize, unit) {
      const zdArray = "FRAG" === unit ? this.fragZoomData : this.bpZoomData;
      for (let i = 1; i < zdArray.length; i++) {
        var zd = zdArray[i];
        if (zd.zoom.binSize < binSize) {
          return i - 1;
        }
      }
      return zdArray.length - 1;
    }

    /**
     * Fetch zoom data by bin size.  If no matching level exists return undefined.
     *
     * @param unit
     * @param binSize
     * @param zoom
     * @returns {undefined|*}
     */
    getZoomData(binSize, unit) {
      unit = unit || "BP";
      const zdArray = unit === "BP" ? this.bpZoomData : this.fragZoomData;
      for (let i = 0; i < zdArray.length; i++) {
        var zd = zdArray[i];
        if (binSize === zd.zoom.binSize) {
          return zd;
        }
      }
      return undefined;
    }

    /**
     * Return zoom data by resolution index.
     * @param index
     * @param unit
     * @returns {*}
     */
    getZoomDataByIndex(index, unit) {
      const zdArray = "FRAG" === unit ? this.fragZoomData : this.bpZoomData;
      return zdArray[index];
    }
    static getKey(chrIdx1, chrIdx2) {
      if (chrIdx1 > chrIdx2) {
        const tmp = chrIdx1;
        chrIdx1 = chrIdx2;
        chrIdx2 = tmp;
      }
      return `${chrIdx1}_${chrIdx2}`;
    }
    static parseMatrix(data, chromosomes) {
      const dis = new BinaryParser(new DataView(data));
      const c1 = dis.getInt(); // Should equal chrIdx1
      const c2 = dis.getInt(); // Should equal chrIdx2

      // TODO validate this
      const chr1 = chromosomes[c1];
      const chr2 = chromosomes[c2];

      // # of resolution levels (bp and frags)
      let nResolutions = dis.getInt();
      const zdList = [];
      while (nResolutions-- > 0) {
        const zd = MatrixZoomData.parseMatrixZoomData(chr1, chr2, dis);
        zdList.push(zd);
      }
      return new Matrix(c1, c2, zdList);
    }
  }

  class ContactRecord {
    constructor(bin1, bin2, counts) {
      this.bin1 = bin1;
      this.bin2 = bin2;
      this.counts = counts;
    }
    getKey() {
      return "" + this.bin1 + "_" + this.bin2;
    }
  }

  class LRU {
    constructor(max = 10) {
      this.max = max;
      this.map = new Map();
    }
    get(key) {
      let item = this.map.get(key);
      if (item) {
        // refresh key
        this.map.delete(key);
        this.map.set(key, item);
      }
      return item;
    }
    set(key, val) {
      // refresh key
      if (this.map.has(key)) this.map.delete(key);
      // evict oldest
      else if (this.map.size === this.max) {
        this.map.delete(this.first());
      }
      this.map.set(key, val);
    }
    has(key) {
      return this.map.has(key);
    }
    clear() {
      this.map.clear();
    }
    first() {
      return this.map.keys().next().value;
    }
  }

  /*
   *  The MIT License (MIT)
   *
   * Copyright (c) 2016-2017 The Regents of the University of California
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
   * associated documentation files (the "Software"), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
   * following conditions:
   *
   * The above copyright notice and this permission notice shall be included in all copies or substantial
   * portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
   * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  FITNESS FOR A PARTICULAR PURPOSE AND
   * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
   * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
   * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   *
   */
  const DOUBLE$1 = 8;
  class NormalizationVector {
    constructor(file, filePosition, nValues, dataType) {
      this.file = file;
      this.filePosition = filePosition;
      this.nValues = nValues;
      this.dataType = dataType;
      this.cache = undefined;
    }
    async getValues(start, end) {
      if (!this.cache || start < this.cache.start || end > this.cache.end) {
        const adjustedStart = Math.max(0, start - 1000);
        const adjustedEnd = Math.min(this.nValues, end + 1000);
        const startPosition = this.filePosition + adjustedStart * this.dataType;
        const n = adjustedEnd - adjustedStart;
        const sizeInBytes = n * this.dataType;
        const data = await this.file.read(startPosition, sizeInBytes);
        if (!data) {
          return undefined;
        }
        const parser = new BinaryParser(new DataView(data));
        const values = [];
        for (let i = 0; i < n; i++) {
          values[i] = this.dataType === DOUBLE$1 ? parser.getDouble() : parser.getFloat();
        }
        this.cache = {
          start: adjustedStart,
          end: adjustedEnd,
          values: values
        };
      }
      const sliceStart = start - this.cache.start;
      const sliceEnd = sliceStart + (end - start);
      return this.cache.values.slice(sliceStart, sliceEnd);
    }
    getKey() {
      return NormalizationVector.getKey(this.type, this.chrIdx, this.unit, this.resolution);
    }
    static getNormalizationVectorKey(type, chrIdx, unit, resolution) {
      return type + "_" + chrIdx + "_" + unit + "_" + resolution;
    }
  }

  // Contains "normalization vector index" (nvi values) for legacy (v8) hosted files from aidenlab, ENCODE, and 4DN.
  // These values can speed up initialization by a few seconds.
  var nvi = {
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2Fcombined.hic": "54386046426,55860",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2Fprimary.hic": "33860030033,37504",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2Freplicate.hic": "30849652794,55832",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2Fmaternal.hic": "1380542661,17185",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2Fpaternal.hic": "1389001777,17185",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fimr90%2Fin-situ%2Fcombined.hic": "13433880319,35723",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC001.hic": "3409347253,35975",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC002.hic": "4529947083,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC003.hic": "6894962500,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC004.hic": "3395593338,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC005.hic": "5204128636,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC006.hic": "3278363811,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC007.hic": "3585547340,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC008.hic": "4134197273,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC009.hic": "2851728310,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC010.hic": "1754216102,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC011.hic": "1716829574,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC012.hic": "4367980375,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC013.hic": "2309654671,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC014.hic": "5324950266,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC015.hic": "3132333594,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC016.hic": "3159154704,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC017.hic": "3262554627,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC018.hic": "3014216364,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC019.hic": "5025753246,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC020.hic": "5861584507,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC021.hic": "3542263275,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC022.hic": "5061949378,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC023.hic": "4816423919,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC024.hic": "2683781104,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC025.hic": "6522701781,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC026.hic": "6748846520,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC027.hic": "5642693007,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC028.hic": "2098921691,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC029.hic": "3886454027,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fagar%2FHIC030.hic": "2288984204,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fagar%2FHIC031.hic": "2115342419,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fpellet%2FHIC032.hic": "2063314324,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fsupernatant%2FHIC033.hic": "1933908457,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fdilution%2FHIC034.hic": "13555514595,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fdilution%2FHIC035.hic": "6129650900,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fdilution%2FHIC036.hic": "4307445019,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fdilution%2FHIC037.hic": "9375139867,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fdilution%2Fcombined.hic": "11664249584,33929",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2Fcombined_DpnII.hic": "7003537290,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC038.hic": "2099825544,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC039.hic": "2096900138,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC040.hic": "2593642141,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC041.hic": "2263919098,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC042.hic": "2684774693,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2Fcombined_noXlink.hic": "5574807456,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC043.hic": "2986114347,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC044.hic": "1916378621,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC045.hic": "746463126,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC046.hic": "2338476164,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC047.hic": "1167496250,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC048.hic": "2231690794,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fin-situ%2FHIC049.hic": "2782308678,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fimr90%2Fin-situ%2FHIC050.hic": "3633531346,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fimr90%2Fin-situ%2FHIC051.hic": "4063486444,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fimr90%2Fin-situ%2FHIC052.hic": "929756278,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fimr90%2Fin-situ%2FHIC053.hic": "2489657204,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fimr90%2Fin-situ%2FHIC054.hic": "4036419444,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fimr90%2Fin-situ%2FHIC055.hic": "4284185549,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fimr90%2Fin-situ%2FHIC056.hic": "4410546240,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fimr90%2Fdilution%2FHIC057.hic": "1491998259,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhmec%2Fin-situ%2Fcombined.hic": "7266425111,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhmec%2Fin-situ%2FHIC058.hic": "6532635593,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhmec%2Fin-situ%2FHIC059.hic": "400684530,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhmec%2Fin-situ%2FHIC060.hic": "645352187,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhmec%2Fin-situ%2FHIC061.hic": "736291871,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhmec%2Fin-situ%2FHIC062.hic": "762731037,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhmec%2Fin-situ%2FHIC063.hic": "682917431,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhmec%2Fdilution%2FHIC064.hic": "4550171307,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fnhek%2Fin-situ%2Fcombined.hic": "11897184911,35789",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fnhek%2Fin-situ%2FHIC065.hic": "5425943567,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fnhek%2Fin-situ%2FHIC066.hic": "5942869818,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fnhek%2Fin-situ%2FHIC067.hic": "5191049261,35647",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fnhek%2Fdilution%2FHIC068.hic": "2713318801,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fk562%2Fin-situ%2Fcombined.hic": "12641555389,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fk562%2Fin-situ%2FHIC069.hic": "5630177461,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fk562%2Fin-situ%2FHIC070.hic": "5926611269,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fk562%2Fin-situ%2FHIC071.hic": "2486191351,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fk562%2Fin-situ%2FHIC072.hic": "2281343366,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fk562%2Fin-situ%2FHIC073.hic": "2173074239,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fk562%2Fin-situ%2FHIC074.hic": "2463700999,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fkbm7%2Fin-situ%2Fcombined.hic": "14661922519,35639",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fkbm7%2Fin-situ%2FHIC075.hic": "3685310515,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fkbm7%2Fin-situ%2FHIC076.hic": "5833658487,35891",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fkbm7%2Fin-situ%2FHIC077.hic": "2406346486,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fkbm7%2Fin-situ%2FHIC078.hic": "5241454987,35919",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fkbm7%2Fin-situ%2FHIC079.hic": "6297234263,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhuvec%2Fin-situ%2Fcombined.hic": "9193858096,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhuvec%2Fin-situ%2FHIC080.hic": "5171405536,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhuvec%2Fin-situ%2FHIC081.hic": "3489767688,35891",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhuvec%2Fin-situ%2FHIC082.hic": "4243339375,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhuvec%2Fdilution%2FHIC083.hic": "1497495406,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhela%2Fin-situ%2Fcombined.hic": "7923332224,35593",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhela%2Fin-situ%2FHIC084.hic": "867699123,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhela%2Fin-situ%2FHIC085.hic": "3669518514,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhela%2Fin-situ%2FHIC086.hic": "5306474712,35595",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhela%2Fin-situ%2FHIC087.hic": "1490963755,36397",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2Fcombined.hic": "8956382853,50248",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC088.hic": "1874185366,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC089.hic": "1301165236,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC090.hic": "1105246282,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC091.hic": "1338325770,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC092.hic": "1307918730,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC093.hic": "755136918,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC094.hic": "1606583694,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC095.hic": "2039711245,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC096.hic": "1909573053,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC097.hic": "1826710712,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC098.hic": "1998793575,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC099.hic": "1007740962,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC100.hic": "736464120,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC101.hic": "980505082,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fin-situ%2FHIC102.hic": "1116083646,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fdilution%2FHIC103.hic": "1096994310,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fch12-lx-b-lymphoblasts%2Fdilution%2FHIC104.hic": "841063882,32102",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC105.hic": "107742864,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC106.hic": "134295912,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC107.hic": "110228014,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC108.hic": "102761401,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC109.hic": "100461491,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC110.hic": "88828472,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC111.hic": "81471064,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC112.hic": "92297035,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC113.hic": "65503916,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC114.hic": "49181188,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC115.hic": "46471102,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC116.hic": "64284432,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC117.hic": "60434076,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC118.hic": "45248563,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC119.hic": "60288782,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC120.hic": "136888414,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC121.hic": "125009003,33681",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC122.hic": "154011688,34127",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC123.hic": "177663372,35293",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC124.hic": "382186226,35245",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC125.hic": "158160717,35271",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC127.hic": "110261177,34659",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC128.hic": "246131875,35509",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC129.hic": "260160119,35667",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC130.hic": "117479562,34681",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC131.hic": "81508929,34673",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC132.hic": "105959102,34895",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC133.hic": "91504812,33451",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC134.hic": "52222546,33737",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC135.hic": "57763085,34159",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC136.hic": "50618489,33731",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC137.hic": "193163606,33363",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC138.hic": "229876152,33777",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC139.hic": "201783666,33571",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC140.hic": "281163862,34125",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC141.hic": "275969727,33935",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC142.hic": "275020431,34125",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC144.hic": "223834810,34177",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC145.hic": "296632653,33937",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC146.hic": "290945216,33961",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC147.hic": "234459964,34231",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC148.hic": "295457850,34039",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC149.hic": "113569632,35695",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC150.hic": "304381897,33963",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC151.hic": "289314545,33805",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC152.hic": "284320182,33803",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC153.hic": "401393947,34659",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC154.hic": "188065488,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC155.hic": "299157119,33967",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC156.hic": "279289244,33787",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC157.hic": "254852119,33917",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC158.hic": "195969660,33477",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC159.hic": "185720388,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC160.hic": "227709279,33599",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC161.hic": "157225076,33209",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC162.hic": "105703444,32033",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC163.hic": "122665658,32121",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC164.hic": "228048231,33761",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC165.hic": "114440819,32011",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC166.hic": "285147558,33891",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC167.hic": "363116754,33943",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC168.hic": "119592158,31937",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC169.hic": "236853872,33785",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC170.hic": "195187639,33395",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC171.hic": "208044058,33309",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC172.hic": "144645916,32877",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC173.hic": "119115941,32203",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC175.hic": "178030481,33525",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC176.hic": "117220136,32169",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC177.hic": "128586196,32659",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC178.hic": "191419141,33629",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC179.hic": "141556748,32959",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC180.hic": "199825102,33185",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC181.hic": "301022688,33783",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC182.hic": "185384453,33205",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC183.hic": "202189264,36367",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC184.hic": "37464475,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC185.hic": "161938278,36099",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC186.hic": "133853166,36179",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC188.hic": "128068030,36237",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC189.hic": "148053886,36177",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC190.hic": "198946958,35803",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC191.hic": "226584564,36063",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC192.hic": "194412797,36341",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC193.hic": "176408194,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC194.hic": "207215649,36055",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC195.hic": "175185530,36315",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC196.hic": "168969337,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC197.hic": "121231252,36339",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC198.hic": "92713752,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC199.hic": "105130500,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC200.hic": "114526350,36479",
    "hicfiles.s3.amazonaws.com%2Fmiseq%2Frh2014%2FHIC201.hic": "122689717,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fhap1%2Fin-situ%2Fcombined.hic": "9614983328,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fexternal%2Fctbp_8_4_17%2Fall_intra_megabase_michrom.hic": "154205644,10960",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2Fdel-Xa-combined.hic": "8843305329,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FdelXa-chrX-diploid.hic": "11173520,1498",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FWT-combined.hic": "13365182403,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FWT-chrX-diploid.hic": "17343459,1498",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FHIC002.hic": "4279298739,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FHIC003.hic": "3027365532,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FHIC004.hic": "2896130835,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FHIC005.hic": "4717830071,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FHIC006.hic": "5066210154,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FHIC007.hic": "3069516128,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2Fdel-Xi-combined.hic": "14551096423,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FdelXi-chrX-diploid.hic": "17362477,1498",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FHIC008.hic": "2572386655,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FHIC009.hic": "2935931663,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FHIC010.hic": "2019085070,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FHIC011.hic": "6087610814,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FHIC012.hic": "2809618194,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frpe1%2FDarrowHuntley-2015%2FHIC013.hic": "2572386655,36479",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fpatski%2FDarrowHuntley-2015%2Fcombined.hic": "6950423609,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fpatski%2FDarrowHuntley-2015%2Fpaternal.hic": "220592749,15691",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fpatski%2FDarrowHuntley-2015%2Fmaternal.hic": "323233095,15691",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fpatski%2FDarrowHuntley-2015%2FHIC014.hic": "3183235800,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fpatski%2FDarrowHuntley-2015%2FHIC015.hic": "1739539801,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fpatski%2FDarrowHuntley-2015%2FHIC016.hic": "1105912758,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fpatski%2FDarrowHuntley-2015%2FHIC017.hic": "1060773319,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fpatski%2FDarrowHuntley-2015%2FHIC018.hic": "1203679874,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fpatski%2FDarrowHuntley-2015%2FHIC019.hic": "3321955269,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Frhesus%2FDarrowHuntley-2015%2FHIC020.hic": "7108980626,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fgm12878%2Fcola%2FDarrowHuntley-2015%2FHIC021.hic": "3906448676,34955",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fassembly%2Faedes%2Fcombined.hic": "390780490,2245",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fassembly%2Fhs2-hic.hic": "1960284186,33561",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2Fassembly%2FCpipJ3.hic": "766279097,4381",
    "s3.amazonaws.com%2Fhicfiles%2Fexternal%2Fphanstiel%2Fupdated_O%2FSnyder_O.hic": "8046980555,18679",
    "s3.amazonaws.com%2Fhicfiles%2Fexternal%2Fphanstiel%2FA_inter.hic": "10986005145,18679",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Funtreated%2Funsynchronized%2Fcombined.hic": "30439217680,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftreated_6hr%2Funsynchronized%2Fcombined.hic": "33255540403,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2Fdeep%2F20min_withdraw_combined.hic": "11078436933,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2Fdeep%2F40min_withdraw_combined.hic": "11031830038,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2Fdeep%2F60min_withdraw_combined.hic": "10312725340,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2Fdeep%2F180min_withdraw_combined.hic": "10038610214,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Funtreated%2Funsynchronized%2FHIC001.hic": "8004335785,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Funtreated%2Funsynchronized%2FHIC002.hic": "8453215933,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Funtreated%2Funsynchronized%2FHIC003.hic": "9118406189,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Funtreated%2Funsynchronized%2FHIC004.hic": "5973342894,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Funtreated%2Funsynchronized%2FHIC005.hic": "6846576837,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Funtreated%2Funsynchronized%2FHIC006.hic": "6075148017,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Funtreated%2Funsynchronized%2FHIC007.hic": "8192366992,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftreated_6hr%2Funsynchronized%2FHIC008.hic": "6844159653,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftreated_6hr%2Funsynchronized%2FHIC009.hic": "7282063059,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftreated_6hr%2Funsynchronized%2FHIC010.hic": "10410578833,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftreated_6hr%2Funsynchronized%2FHIC011.hic": "8192366992,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftreated_6hr%2Funsynchronized%2FHIC012.hic": "7223422850,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftreated_6hr%2Funsynchronized%2FHIC013.hic": "7435986997,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftreated_6hr%2Funsynchronized%2FHIC014.hic": "9120113605,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Funtreated%2Fsynchronized%2Fcombined.hic": "4170577904,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Funtreated%2Fsynchronized%2FHIC015.hic": "1504084990,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Funtreated%2Fsynchronized%2FHIC016.hic": "1686244500,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Funtreated%2Fsynchronized%2FHIC017.hic": "1804802410,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Funtreated%2Fsynchronized%2FHIC018.hic": "1533942067,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftreated_6hr%2Fsynchronized%2Fcombined.hic": "4572390198,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftreated_6hr%2Fsynchronized%2FHIC019.hic": "1543609666,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftreated_6hr%2Fsynchronized%2FHIC020.hic": "1814133288,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftreated_6hr%2Fsynchronized%2FHIC021.hic": "1942698243,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftreated_6hr%2Fsynchronized%2FHIC022.hic": "1873587413,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2Funtreated%2FRao-2017-HIC049.hic": "405127557,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2Funtreated%2FRao-2017-HIC060.hic": "326681741,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2Funtreated%2FRao-2017-HIC061.hic": "300908673,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_20min%2FRao-2017-HIC050.hic": "481758242,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_20min%2FRao-2017-HIC051.hic": "417577401,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_40min%2FRao-2017-HIC052.hic": "419353227,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_40min%2FRao-2017-HIC053.hic": "411554953,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_60min%2FRao-2017-HIC054.hic": "386655891,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_60min%2FRao-2017-HIC055.hic": "402170701,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_240min%2FRao-2017-HIC057.hic": "735906308,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min%2FRao-2017-HIC058.hic": "443789827,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min%2FRao-2017-HIC059.hic": "491422615,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min%2FRao-2017-HIC062.hic": "320261375,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min%2FRao-2017-HIC063.hic": "306590499,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_20min%2FRao-2017-HIC032S.hic": "367051742,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_20min%2FRao-2017-HIC033S.hic": "344555339,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_40min%2FRao-2017-HIC036S.hic": "349392947,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_40min%2FRao-2017-HIC037S.hic": "317714554,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_60min%2FRao-2017-HIC040S.hic": "266786397,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_60min%2FRao-2017-HIC041S.hic": "279445530,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_180min%2FRao-2017-HIC044S.hic": "898418269,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_180min%2FRao-2017-HIC045S.hic": "961006347,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_360min%2FRao-2017-HIC064.hic": "833576408,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_360min%2FRao-2017-HIC065.hic": "840881418,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_1080min%2FRao-2017-HIC066.hic": "980958864,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_1080min%2FRao-2017-HIC067.hic": "882023129,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_1440min%2FRao-2017-HIC068.hic": "1110292630,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fdegron%2Ftime_course%2FAuxin_treated_360min_withdraw_1440min%2FRao-2017-HIC069.hic": "1001747023,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fexternal%2Frowley_nichols_mol_cell_2017%2FCP190_HiChIP.hic": "144107588,6976",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fexternal%2Frowley_nichols_mol_cell_2017%2FH3K27ac_HiChIP_combined.hic": "43171370,5233",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fexternal%2Frowley_nichols_mol_cell_2017%2FH3K27me3_HiChIP_combined.hic": "42906472,5233",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fexternal%2Frowley_nichols_mol_cell_2017%2FPol2_ChIAPET.hic": "41992430,6976",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fexternal%2Frowley_nichols_mol_cell_2017%2FPol2S2_HiChIP.hic": "145842743,6976",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fexternal%2Frowley_nichols_mol_cell_2017%2FArabidopsis_Wang2015_Liu2016.hic": "1134391078,4984",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fexternal%2Frowley_nichols_mol_cell_2017%2FElegans_Crane2015.hic": "387127568,8758",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fexternal%2Frowley_nichols_mol_cell_2017%2FNcrassa_Galazka2016.hic": "26555511,27725",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fexternal%2Frowley_nichols_mol_cell_2017%2FPfalciparum_trophozoite_Ay2014.hic": "15640893,13948",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fduan%2FE-Me-A.hic": "6897251,23348",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fduan%2FE-Me-B.hic": "4959088,23348",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fduan%2FE-Mp-A.hic": "5232286,23348",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fduan%2FE-Mp-B.hic": "5105292,23348",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fduan%2FH-Me-A.hic": "6900072,23348",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fduan%2FH-Me-B.hic": "8653258,23348",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fduan%2FH-Mp-A.hic": "7999058,23348",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fduan%2FH-Mp-B.hic": "8774657,23348",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdekker%2F4dn%2Fh1hesc.hic": "23671753603,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdekker%2F4dn%2Fh1hesc_rep1.hic": "23671754721,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdekker%2F4dn%2Fh1hesc_rep2.hic": "22269909910,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdekker%2F4dn%2Fhffc6_rep1.hic": "19016661622,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Flieberman_aiden_van_berkum%2FGM06990_NcoI.hic": "480725203,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Flieberman_aiden_van_berkum%2F302NH.hic": "99948617,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Flieberman_aiden_van_berkum%2FK562.hic": "470263605,36151",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Flieberman_aiden_van_berkum%2FGM06990_HindIII.hic": "293706559,36289",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Flieberman_aiden_van_berkum%2FGM06990_rep_HindIII.hic": "309673862,36087",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Frudan%2Fcanis-lupus-rep1.hic": "1531151371,56905",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Frudan%2Fcanis-lupus-rep2.hic": "2851437676,56905",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Frudan%2Fmouse-rep1.hic": "582052544,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Frudan%2Fmacaque-rep1.hic": "698509182,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Frudan%2Fmacaque-rep2.hic": "461410393,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Frudan%2Frabbit-rep1.hic": "691045338,33561",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Frudan%2Frabbit-rep2.hic": "668888336,33561",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fsexton%2Fcombined.hic": "50650087,4486",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fkalhor%2Ftcc-hindiii.hic": "1071142023,16500",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fkalhor%2Ftcc-mboi.hic": "1508851093,16448",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fkalhor%2Fnon-tcc-hindiii.hic": "395179229,36093",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fkalhor%2Ftcc-combined.hic": "1050423847,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdixon%2Fmm9-hindiii%2Fsplit-read-run.hic": "9599984876,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdixon%2Fhesc-hindiii.hic": "1952555632,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdixon%2Fimr90-hindiii.hic": "9691260435,18679",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdixon%2Fmm9-cortex.hic": "3712072953,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzhang%2Fatm-i-scei-chr18.hic": "2083350075,16438",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzhang%2Fatm-i-scei-chr2.hic": "3362049644,16360",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzhang%2Fatm-i-scei-chr7.hic": "1658399854,16438",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzhang%2Fwt-i-scei-chr15.hic": "866691249,16438",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzhang%2Fwt-i-scei-chr2.hic": "3304782795,16386",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnagano%2Fcell-1.hic": "23673506,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnagano%2Fcell-2.hic": "26873280,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnagano%2Fcell-3.hic": "31066362,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnagano%2Fcell-4.hic": "16807724,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnagano%2Fcell-5.hic": "28665065,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnagano%2Fcell-6.hic": "13124158,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnagano%2Fcell-7.hic": "15118945,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnagano%2Fcell-8.hic": "68316814,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnagano%2Fcell-9.hic": "18965101,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnagano%2Fcell-10.hic": "17020666,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjin%2Fimr90%2Fcombined.hic": "6526601242,36427",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjin%2Fimr90%2Frep1.hic": "1861562891,36401",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjin%2Fimr90%2Frep2.hic": "3061013635,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjin%2Fimr90%2Frep3.hic": "1564588211,35969",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjin%2Fimr90%2Frep4.hic": "1255543175,36153",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjin%2Fimr90%2Frep5.hic": "974683253,36179",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjin%2Fimr90%2Frep6.hic": "1040805629,36053",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjin%2Fimr90-tnf-alpha%2Fcombined.hic": "8424080116,36401",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjin%2Fimr90-tnf-alpha%2Frep1.hic": "2697976702,36295",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjin%2Fimr90-tnf-alpha%2Frep3.hic": "1718610467,36159",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjin%2Fimr90-tnf-alpha%2Frep4.hic": "2029519405,36101",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjin%2Fimr90-tnf-alpha%2Frep5.hic": "985310855,36069",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjin%2Fimr90-tnf-alpha%2Frep6.hic": "1418750480,35967",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fcheng%2Fmhh-call-4-cell-line.hic": "538380253,35351",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fcheng%2Fprimary-b-all.hic": "773764191,35793",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fcheng%2Fnormal-b-cell-line.hic": "336271459,35005",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fcheng%2Frl-cell-line.hic": "484807998,35351",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fhou%2Fkc167-biorep.hic": "135932435,8758",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fhou%2Fkc167-techrep1.hic": "160355961,8758",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fhou%2Fkc167-techrep2.hic": "188809887,8758",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Flin%2Fpre-prob-egs.hic": "2237792858,15483",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Flin%2Fprob-egs.hic": "5744720377,16438",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Flin%2Fprob-fa.hic": "2174866215,16438",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fli%2Fhct116-rnapii-pilot.hic": "396366166,35999",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fli%2Fhela-rnapii-pilot.hic": "882516759,35107",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fli%2Fk562-rnapii-pilot.hic": "1131576189,35969",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fli%2Fk562-rnapii-saturated.hic": "571583828,36291",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fli%2Fmcf7-rnapii-saturated.hic": "1282547841,36035",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fli%2Fnb4-rnapii-pilot.hic": "761614686,34861",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fjung%2Fmouse_sperm.hic": "1730231642,29184",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Ftang%2Fgm12878.hic": "1953518212,20505",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Frutledge%2FSRR1791299.hic": "5723484,11956",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Frutledge%2FSRR1791297.hic": "16534743,23348",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzuin%2Fhek293t-rad21cv-hrv.hic": "5094525579,36289",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzuin%2Fhek293t-rad21cv-hrv-rep1.hic": "2574358912,36373",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzuin%2Fhek293t-rad21cv-hrv-rep2.hic": "3417099433,36243",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzuin%2Fhek293t-rad21cv-tev.hic": "4785157552,36323",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzuin%2Fhek293t-rad21cv-tev-rep1.hic": "2648268465,36321",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzuin%2Fhek293t-rad21cv-tev-rep2.hic": "2994727980,36107",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzuin%2Fhek293t-sirna-ctcf.hic": "5391791815,36063",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzuin%2Fhek293t-sirna-ctcf-rep1.hic": "3325842095,36269",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzuin%2Fhek293t-sirna-ctcf-rep2.hic": "3096215920,36167",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzuin%2Fhek293t-sirna-ctrl.hic": "3830902383,36167",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzuin%2Fhek293t-sirna-ctrl-rep1.hic": "1346712252,36079",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fzuin%2Fhek293t-sirna-ctrl_rep2.hic": "3098067367,36271",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fay%2Fp-falciparum-3d7-0h-hiseq.hic": "38174042,21889",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fay%2Fp-falciparum-3d7-18h-hiseq.hic": "26506099,21889",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fay%2Fp-falciparum-3d7-18h-hiseq-non-crosslinked_control.hic": "3545496,21889",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fay%2Fp-falciparum-3d7-36h-hiseq.hic": "70754194,21889",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnaumova%2Fhelas3%2Fg1mid-r1.hic": "200863476,17185",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnaumova%2Fhelas3%2Fm-r1.hic": "249021190,17185",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnaumova%2Fhelas3%2Fm-r2.hic": "212341157,17185",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnaumova%2Fhelas3ccl2p2%2Fg1-0-25fa.hic": "583572265,17185",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnaumova%2Fhelas3ccl2p2%2Fg1-1fa.hic": "354502306,17185",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnaumova%2Fhelas3ccl2p2%2Fm-0-25fa.hic": "149308791,17185",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnaumova%2Fhelas3ccl2p2%2Fm-98percent.hic": "778175225,17185",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnaumova%2Fhelas3ccl2p2%2Fm-1fa.hic": "158091047,17185",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnaumova%2Fhff1%2Fcchic-hff1-ns-r1.hic": "801670039,17185",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnaumova%2Fhff1%2Fcchic-hff1-m-r1.hic": "875922086,17185",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnaumova%2Fk562%2Fm-r1.hic": "130959943,17185",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnaumova%2Fk562%2Fm-r2.hic": "237861106,17185",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fsofueva%2FmAST-WT.hic": "496104039,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fsofueva%2FmAST-WT-adv-cre.hic": "438608517,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fsofueva%2FmAST-floxed-rep1.hic": "446205712,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fsofueva%2FmAST-floxed-rep2.hic": "386354767,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fsofueva%2FmAST-deleted-rep1.hic": "621998722,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fsofueva%2FmAST-deleted-rep2.hic": "583840829,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fsofueva%2FmNSC-floxed-rep1.hic": "801290988,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fsofueva%2FmNSC-floxed-rep2.hic": "819406658,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fsofueva%2FmNSC-deleted-rep1.hic": "792825269,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fsofueva%2FmNSC-deleted-rep2.hic": "746189884,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fsofueva%2FmNSC-WT.hic": "309353372,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fsofueva%2FmNSC-WT-OHT.hic": "274229679,30643",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fseitan%2FTcell-Rad21KO-R1.hic": "1490362251,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fseitan%2FTcell-Rad21KO-R3.hic": "2403664421,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fseitan%2FTcell-Rad21WT-R1.hic": "1377124538,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fseitan%2FTcell-Rad21WT-R3.hic": "2646201369,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fmoissiard%2Fcrh6-mutant.hic": "105261071,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fmoissiard%2FWT.hic": "127506388,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fgrob%2FCol.hic": "153638500,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fgrob%2Fcrwn1.hic": "211213220,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fgrob%2Fcrwn4.hic": "134236837,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fxie%2Fprimary.hic": "92936173,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Ffeng%2F6wt-control6wt337.hic": "318737891,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Ffeng%2F6wt-control6wt67.hic": "348123956,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Ffeng%2F6wt337.hic": "251107279,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Ffeng%2F6wt67.hic": "351840994,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Ffeng%2FCol0.hic": "345969497,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Ffeng%2Fclf28-swn7.hic": "299585025,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Ffeng%2Fcmt3-11.hic": "253427706,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Ffeng%2Fddm1-2.hic": "303626924,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Ffeng%2Fmet1-3.hic": "347697973,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Ffeng%2Fsuvh4-suvh5-suvh6.hic": "263122019,10217",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fma%2FDNase-HiC-WG-K562.hic": "892955840,18679",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fma%2FDNaseHiC-WG-H1.hic": "696922695,18679",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fma%2FtargetedDNaseHiC-lincRNA-K562-rep1.hic": "341917716,18679",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fma%2FtargeredDNaseHiC-lincRNA-K562-rep2.hic": "214841185,18679",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fma%2FtargetedDNaseHiC-lincRNA-H1-rep1.hic": "616326137,18679",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fma%2FtargetedDNaseHiC-lincRNA-H1-rep2.hic": "579654013,18679",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fma%2FtargetedDNaseHiC-pe-H1-rep1.hic": "519810544,18679",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fma%2FtargetedDNaseHiC-pe-K562-rep1.hic": "199553123,18679",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Frowley%2FKc167_DpnII.hic": "1319373594,6976",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Frowley%2FKc167_HinfI.hic": "1465493873,6976",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Frowley%2FKc167_DpnII_HinfI_combo.hic": "753062558,5814",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fbarutcu%2FMCF-10A.hic": "2784956115,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fbarutcu%2FMCF-7.hic": "2700457411,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fbatullin%2Fsperm.hic": "501052169,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fminajigi%2FWT_hiC_rep1.hic": "1450697530,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fminajigi%2FWT_hiC_rep2.hic": "1189371558,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fminajigi%2Fcombined.hic": "2262007875,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fminajigi%2Finactive.hic": "4444564,751",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fminajigi%2Factive.hic": "3993495,751",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdeng%2Fpatski_rep1.hic": "1650838357,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdeng%2Fpatski_rep2.hic": "1258038606,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdeng%2Fpatski.hic": "499827296,16438",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdeng%2Fpatski_active.hic": "79175714,15691",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdeng%2Fpatski_inactive.hic": "98947881,15691",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdeng%2Fbrain_dnase.hic": "4298088401,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdeng%2Fbrain_in_situ_dnase.hic": "609321852,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdeng%2Fbrain.hic": "1028196506,16438",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdeng%2Fbrain_active.hic": "79175714,15691",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fdeng%2Fbrain_inactive.hic": "98947881,15691",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fle%2FBglII_rep1.hic": "1283306,1463",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fle%2FBglII_rep2.hic": "1263227,1463",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fle%2FNcoI_rep1.hic": "4380906,1463",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Feagen%2FGSE89112_Kc167combined.hic": "1829549643,25624",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Feagen%2FGSE89112_Kc167combined_randomized.hic": "1859742654,25624",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fmumbach%2FGSE80820_HiChIP_GM_cohesin.hic": "1231264781,17932",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fmumbach%2FGSE80820_HiChIP_mES_cohesin_all.hic": "1152008628,16438",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fmumbach%2FGSE80820_HiChIP_mES_Oct4.hic": "912828146,16438",
    "s3.amazonaws.com%2Fhicfiles%2Fexternal%2Fwapl_hic%2FSCC4KO.hic": "1767906138,18679",
    "s3.amazonaws.com%2Fhicfiles%2Fexternal%2Fwapl_hic%2FDKO.hic": "1487228787,18679",
    "s3.amazonaws.com%2Fhicfiles%2Fexternal%2Fwapl_hic%2FWaplKO_1.14.hic": "1189751862,18679",
    "s3.amazonaws.com%2Fhicfiles%2Fexternal%2Fwapl_hic%2FWaplKO_3.3.hic": "1155057696,18679",
    "s3.amazonaws.com%2Fhicfiles%2Fexternal%2Fwapl_hic%2FWT.hic": "1522401568,18679",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fskfuwi4fnsjkdf9jekrw2%2Fmega_Liverpool%2Fmega.hic": "2612171975,4381",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fskfuwi4fnsjkdf9jekrw2%2FHIC2836_Liverpool1%2FLiverpool1.hic": "191729195,2245",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fskfuwi4fnsjkdf9jekrw2%2FHIC2861_Liverpool2%2FLiverpool2.hic": "1637096030,4381",
    "s3.amazonaws.com%2Fhicfiles%2Fhiseq%2Fskfuwi4fnsjkdf9jekrw2%2FHIC2862_Liverpool3%2FLiverpool3.hic": "1160045602,4381",
    "s3.amazonaws.com%2Fhicfiles%2Fexternal%2Fgoodell%2FHSPC.hic": "11857786247,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fexternal%2Fgoodell%2FHSPC_CanyonDel.hic": "8139168836,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fexternal%2Fgoodell%2Ftcell.hic": "9871547081,36479",
    "s3.amazonaws.com%2Fhicfiles%2Fexternal%2Fgoodell%2Fep.hic": "17479335373,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fnagano%2FTh1_ensemble.hic": "1690592868,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fbonev%2FES_mapq30.hic": "32930498831,32386",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fbonev%2FNPC_mapq30.hic": "55053730986,32386",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fbonev%2FCN_mapq30.hic": "53138031154,32386",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2FKieffer-Kwon_et_al_2017%2FMain_maps%2FKieffer-Kwon-2017-activated_B_cells_72_hours_WT.hic": "16492991184,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2FKieffer-Kwon_et_al_2017%2FMain_maps%2FKieffer-Kwon-2017-resting_B_cells_WT.hic": "23057795398,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2FKieffer-Kwon_et_al_2017%2FMain_maps%2FKieffer-Kwon-2017-activated_B_cells_24_hours_MYC_KO.hic": "21245554876,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2FKieffer-Kwon_et_al_2017%2FMain_maps%2FKieffer-Kwon-2017-resting_B_cells_TSA.hic": "13933346059,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2FKieffer-Kwon_et_al_2017%2FMain_maps%2FKieffer-Kwon-2017-activated_B_cells_24_hours_oligomycin.hic": "21902506832,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2FKieffer-Kwon_et_al_2017%2FMain_maps%2FKieffer-Kwon-2017-mES_WT.hic": "9451969795,32102",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2FVian_et_al_2018%2FMain_maps%2FVian-2018-activated_B_cells_24_hours_WT.hic": "3600188564,16438",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2FVian_et_al_2018%2FMain_maps%2FVian-2018-activated_B_cells_30_hours_WT.hic": "1309503359,16438",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2FVian_et_al_2018%2FMain_maps%2FVian-2018-activated_B_cells_30_hours_HU_treated.hic": "1477252396,16438",
    "hicfiles.s3.amazonaws.com%2Fhiseq%2FVian_et_al_2018%2FMain_maps%2FVian-2018-activated_B_cells_24_hours_flavopiridol.hic": "15711773490,32102",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fpgp%2FPGP1F_mega_090118%2FPGP1F_mega_090118_30.hic": "24786676166,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fpgp%2FHIC7145%2FHIC7145_30.hic": "4554644616,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fpgp%2FHIC7146%2FHIC7146_30.hic": "4174848944,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fpgp%2FHIC7147%2FHIC7147_30.hic": "5062229182,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fpgp%2FHIC7862%2FHIC7862_30.hic": "4520990620,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fpgp%2FHIC7863%2FHIC7863_30.hic": "4330354773,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fpgp%2FHIC7864%2FHIC7864_30.hic": "5880640268,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fpgp%2FHIC7865%2FHIC7865_30.hic": "4431632469,36479",
    "hicfiles.s3.amazonaws.com%2Fexternal%2Fpgp%2FHIC7866%2FHIC7866_30.hic": "4686000222,36479",
    "encode-public.s3.amazonaws.com%2F2018%2F10%2F19%2Fb122542b-306c-4631-bdc3-2e155e89af55%2FENCFF718AWL.hic": "39544267907,58932",
    "encode-public.s3.amazonaws.com%2F2019%2F02%2F15%2F8e787cd8-e388-4bc2-a236-7a5e6f39e0c0%2FENCFF999YXX.hic": "9255069996,56883",
    "encode-public.s3.amazonaws.com%2F2019%2F02%2F08%2Ffc1d9d5d-8fa0-4e29-9080-3da674d9490d%2FENCFF543USQ.hic": "5005263062,36479",
    "s3.us-east-1.wasabisys.com%2Fhicfiles%2Finternal%2FLCL_mega_42B_500bp_30.hic": "106482584851,22829",
    "www.encodeproject.org%2Ffiles%2FENCFF925QIF%2F%40%40download%2FENCFF925QIF.hic": "51712684396,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF259YUS%2F%40%40download%2FENCFF259YUS.hic": "24640030444,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF783KQI%2F%40%40download%2FENCFF783KQI.hic": "27209249856,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF318JAP%2F%40%40download%2FENCFF318JAP.hic": "28636979242,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF512PQA%2F%40%40download%2FENCFF512PQA.hic": "28124104361,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF591MHA%2F%40%40download%2FENCFF591MHA.hic": "37373387202,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF197OWW%2F%40%40download%2FENCFF197OWW.hic": "41826180893,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF317OIA%2F%40%40download%2FENCFF317OIA.hic": "34741636038,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF522YLZ%2F%40%40download%2FENCFF522YLZ.hic": "24064692329,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF420JTA%2F%40%40download%2FENCFF420JTA.hic": "21202405177,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF871ZDJ%2F%40%40download%2FENCFF871ZDJ.hic": "10124815680,18679",
    "www.encodeproject.org%2Ffiles%2FENCFF349RZY%2F%40%40download%2FENCFF349RZY.hic": "4446702705,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF738YON%2F%40%40download%2FENCFF738YON.hic": "3338049584,35947",
    "www.encodeproject.org%2Ffiles%2FENCFF406KJN%2F%40%40download%2FENCFF406KJN.hic": "4132875306,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF081NPN%2F%40%40download%2FENCFF081NPN.hic": "34495587443,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF946RZW%2F%40%40download%2FENCFF946RZW.hic": "34571955193,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF602CHT%2F%40%40download%2FENCFF602CHT.hic": "30674798032,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF150DKS%2F%40%40download%2FENCFF150DKS.hic": "12618769864,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF614IPZ%2F%40%40download%2FENCFF614IPZ.hic": "42450060331,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF571ZQR%2F%40%40download%2FENCFF571ZQR.hic": "15230068871,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF705MKK%2F%40%40download%2FENCFF705MKK.hic": "38686554702,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF658KTB%2F%40%40download%2FENCFF658KTB.hic": "13195884405,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF435JYN%2F%40%40download%2FENCFF435JYN.hic": "17192139674,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF016JKX%2F%40%40download%2FENCFF016JKX.hic": "37266736642,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF294GFP%2F%40%40download%2FENCFF294GFP.hic": "36389843399,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF700CYI%2F%40%40download%2FENCFF700CYI.hic": "60482012152,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF962EDB%2F%40%40download%2FENCFF962EDB.hic": "39394328182,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF467OGP%2F%40%40download%2FENCFF467OGP.hic": "35572788855,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF556RLR%2F%40%40download%2FENCFF556RLR.hic": "34826921187,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF309UNV%2F%40%40download%2FENCFF309UNV.hic": "48510618174,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF653HCO%2F%40%40download%2FENCFF653HCO.hic": "41079007620,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF120DSV%2F%40%40download%2FENCFF120DSV.hic": "12790195576,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF284OEA%2F%40%40download%2FENCFF284OEA.hic": "46007570339,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF035BLF%2F%40%40download%2FENCFF035BLF.hic": "63868871985,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF094KKX%2F%40%40download%2FENCFF094KKX.hic": "42151419971,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF965BPU%2F%40%40download%2FENCFF965BPU.hic": "42717376107,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF842DUO%2F%40%40download%2FENCFF842DUO.hic": "39553892515,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF417GBZ%2F%40%40download%2FENCFF417GBZ.hic": "45544785452,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF499BVX%2F%40%40download%2FENCFF499BVX.hic": "40900674170,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF136XCV%2F%40%40download%2FENCFF136XCV.hic": "47700392974,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF224HKR%2F%40%40download%2FENCFF224HKR.hic": "40426005932,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF711XSR%2F%40%40download%2FENCFF711XSR.hic": "41434581949,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF660JWA%2F%40%40download%2FENCFF660JWA.hic": "54201632697,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF081PMO%2F%40%40download%2FENCFF081PMO.hic": "53428285130,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF799QGA%2F%40%40download%2FENCFF799QGA.hic": "1228682189,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF473CAA%2F%40%40download%2FENCFF473CAA.hic": "1077514950,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF663FRL%2F%40%40download%2FENCFF663FRL.hic": "39843938245,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF341WOY%2F%40%40download%2FENCFF341WOY.hic": "34792598619,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF515ZBF%2F%40%40download%2FENCFF515ZBF.hic": "41779230923,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF545GBW%2F%40%40download%2FENCFF545GBW.hic": "38351980358,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF252ANV%2F%40%40download%2FENCFF252ANV.hic": "37668839771,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF912NDK%2F%40%40download%2FENCFF912NDK.hic": "21196851956,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF683PLM%2F%40%40download%2FENCFF683PLM.hic": "21849338763,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF355NFJ%2F%40%40download%2FENCFF355NFJ.hic": "47880627268,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF507WEW%2F%40%40download%2FENCFF507WEW.hic": "35777782924,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF241MSL%2F%40%40download%2FENCFF241MSL.hic": "22507408288,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF135MUT%2F%40%40download%2FENCFF135MUT.hic": "24168734040,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF459FRB%2F%40%40download%2FENCFF459FRB.hic": "37166770103,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF705YZH%2F%40%40download%2FENCFF705YZH.hic": "44679182442,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF395INO%2F%40%40download%2FENCFF395INO.hic": "56727346538,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF736ITL%2F%40%40download%2FENCFF736ITL.hic": "49036286185,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF546TZN%2F%40%40download%2FENCFF546TZN.hic": "33195126348,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF706SFK%2F%40%40download%2FENCFF706SFK.hic": "3271831702,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF922ERE%2F%40%40download%2FENCFF922ERE.hic": "12476647122,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF876OWE%2F%40%40download%2FENCFF876OWE.hic": "1538692704,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF227XJZ%2F%40%40download%2FENCFF227XJZ.hic": "1925617685,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF053BXY%2F%40%40download%2FENCFF053BXY.hic": "1032237652,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF014VMM%2F%40%40download%2FENCFF014VMM.hic": "1564021703,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF563XES%2F%40%40download%2FENCFF563XES.hic": "1489180508,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF482LGO%2F%40%40download%2FENCFF482LGO.hic": "1208778887,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF216QQM%2F%40%40download%2FENCFF216QQM.hic": "6293163571,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF256UOW%2F%40%40download%2FENCFF256UOW.hic": "6293163571,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF791UZC%2F%40%40download%2FENCFF791UZC.hic": "37029615181,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF911AHQ%2F%40%40download%2FENCFF911AHQ.hic": "34246649165,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF491AOR%2F%40%40download%2FENCFF491AOR.hic": "558663570,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF307PDL%2F%40%40download%2FENCFF307PDL.hic": "525321519,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF773ITV%2F%40%40download%2FENCFF773ITV.hic": "295464771,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF198SSL%2F%40%40download%2FENCFF198SSL.hic": "500142476,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF251UEF%2F%40%40download%2FENCFF251UEF.hic": "567443575,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF942LTN%2F%40%40download%2FENCFF942LTN.hic": "4430960222,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF543USQ%2F%40%40download%2FENCFF543USQ.hic": "5005263062,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF434XQU%2F%40%40download%2FENCFF434XQU.hic": "25506511674,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF318GOM%2F%40%40download%2FENCFF318GOM.hic": "44750824314,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF004TKY%2F%40%40download%2FENCFF004TKY.hic": "20705661833,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF493YNC%2F%40%40download%2FENCFF493YNC.hic": "53407154984,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF334XXU%2F%40%40download%2FENCFF334XXU.hic": "14341194962,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF569RJM%2F%40%40download%2FENCFF569RJM.hic": "1922066634,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF076LWH%2F%40%40download%2FENCFF076LWH.hic": "39406255845,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF977XWK%2F%40%40download%2FENCFF977XWK.hic": "20563512962,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF127TPS%2F%40%40download%2FENCFF127TPS.hic": "21032070512,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF480KLP%2F%40%40download%2FENCFF480KLP.hic": "33115569647,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF281ILS%2F%40%40download%2FENCFF281ILS.hic": "28236353584,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF129LMU%2F%40%40download%2FENCFF129LMU.hic": "35247096013,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF759YCW%2F%40%40download%2FENCFF759YCW.hic": "16058537743,32102",
    "www.encodeproject.org%2Ffiles%2FENCFF045YOM%2F%40%40download%2FENCFF045YOM.hic": "19775445828,32102",
    "www.encodeproject.org%2Ffiles%2FENCFF013TGD%2F%40%40download%2FENCFF013TGD.hic": "4208420532,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF929RPW%2F%40%40download%2FENCFF929RPW.hic": "1974260276,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF996XEO%2F%40%40download%2FENCFF996XEO.hic": "2072918865,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF097SKJ%2F%40%40download%2FENCFF097SKJ.hic": "1983524001,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF464KRA%2F%40%40download%2FENCFF464KRA.hic": "1957300131,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF406HHC%2F%40%40download%2FENCFF406HHC.hic": "3854527235,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF080DPJ%2F%40%40download%2FENCFF080DPJ.hic": "19953768024,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF621AIY%2F%40%40download%2FENCFF621AIY.hic": "26781700010,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF366ERB%2F%40%40download%2FENCFF366ERB.hic": "1049184239,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF997RGL%2F%40%40download%2FENCFF997RGL.hic": "2521167549,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF029MPB%2F%40%40download%2FENCFF029MPB.hic": "1854711185,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF043EEE%2F%40%40download%2FENCFF043EEE.hic": "2924133032,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF920CJR%2F%40%40download%2FENCFF920CJR.hic": "3011577886,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF928NJV%2F%40%40download%2FENCFF928NJV.hic": "2778936244,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF894GLR%2F%40%40download%2FENCFF894GLR.hic": "2831733099,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF303PCK%2F%40%40download%2FENCFF303PCK.hic": "688704435,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF999YXX%2F%40%40download%2FENCFF999YXX.hic": "9255069996,56883",
    "www.encodeproject.org%2Ffiles%2FENCFF685BLG%2F%40%40download%2FENCFF685BLG.hic": "16797022992,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF188SSH%2F%40%40download%2FENCFF188SSH.hic": "16797023050,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF465ESX%2F%40%40download%2FENCFF465ESX.hic": "13489465953,32102",
    "www.encodeproject.org%2Ffiles%2FENCFF493SFI%2F%40%40download%2FENCFF493SFI.hic": "30033046818,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF235LCO%2F%40%40download%2FENCFF235LCO.hic": "38572174589,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF625VNK%2F%40%40download%2FENCFF625VNK.hic": "45202258438,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF304HMS%2F%40%40download%2FENCFF304HMS.hic": "36994445315,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF605CEN%2F%40%40download%2FENCFF605CEN.hic": "40358346301,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF086ORS%2F%40%40download%2FENCFF086ORS.hic": "22650781304,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF237UKR%2F%40%40download%2FENCFF237UKR.hic": "41516707246,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF004YZQ%2F%40%40download%2FENCFF004YZQ.hic": "71900665326,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF104THR%2F%40%40download%2FENCFF104THR.hic": "15172410632,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF807IRK%2F%40%40download%2FENCFF807IRK.hic": "17346637451,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF193CQL%2F%40%40download%2FENCFF193CQL.hic": "55726903245,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF700DEX%2F%40%40download%2FENCFF700DEX.hic": "20231399798,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF234MDO%2F%40%40download%2FENCFF234MDO.hic": "24635312640,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF181ROW%2F%40%40download%2FENCFF181ROW.hic": "26883606497,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF896OFN%2F%40%40download%2FENCFF896OFN.hic": "36952196833,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF573OPJ%2F%40%40download%2FENCFF573OPJ.hic": "36685546919,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF028RXH%2F%40%40download%2FENCFF028RXH.hic": "31053919206,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF156GGD%2F%40%40download%2FENCFF156GGD.hic": "35284134289,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF496GEU%2F%40%40download%2FENCFF496GEU.hic": "44659660933,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF945TUH%2F%40%40download%2FENCFF945TUH.hic": "3898570191,35639",
    "www.encodeproject.org%2Ffiles%2FENCFF698KFV%2F%40%40download%2FENCFF698KFV.hic": "4427896684,35751",
    "www.encodeproject.org%2Ffiles%2FENCFF239BHZ%2F%40%40download%2FENCFF239BHZ.hic": "1718552021,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF277LAN%2F%40%40download%2FENCFF277LAN.hic": "4542391336,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF397CMD%2F%40%40download%2FENCFF397CMD.hic": "2832016430,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF778OYA%2F%40%40download%2FENCFF778OYA.hic": "14067187484,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF775VSU%2F%40%40download%2FENCFF775VSU.hic": "14067187484,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF812THZ%2F%40%40download%2FENCFF812THZ.hic": "9667720429,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF777KBU%2F%40%40download%2FENCFF777KBU.hic": "5058284320,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF688KOY%2F%40%40download%2FENCFF688KOY.hic": "4198695833,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF223UBX%2F%40%40download%2FENCFF223UBX.hic": "1206064037,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF273XBU%2F%40%40download%2FENCFF273XBU.hic": "44085607579,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF952JZV%2F%40%40download%2FENCFF952JZV.hic": "44728845246,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF643NDM%2F%40%40download%2FENCFF643NDM.hic": "35877886780,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF586MQY%2F%40%40download%2FENCFF586MQY.hic": "71158037547,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF251VFA%2F%40%40download%2FENCFF251VFA.hic": "40089479399,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF033WGK%2F%40%40download%2FENCFF033WGK.hic": "30802023728,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF649OHR%2F%40%40download%2FENCFF649OHR.hic": "28203184265,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF782WVZ%2F%40%40download%2FENCFF782WVZ.hic": "37248221674,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF579CAR%2F%40%40download%2FENCFF579CAR.hic": "39662025395,54779",
    "www.encodeproject.org%2Ffiles%2FENCFF514XWQ%2F%40%40download%2FENCFF514XWQ.hic": "1319613701,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF666USK%2F%40%40download%2FENCFF666USK.hic": "15051670107,32102",
    "www.encodeproject.org%2Ffiles%2FENCFF047SDP%2F%40%40download%2FENCFF047SDP.hic": "1357076705,16438",
    "www.encodeproject.org%2Ffiles%2FENCFF584LEP%2F%40%40download%2FENCFF584LEP.hic": "9314176858,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF671SOE%2F%40%40download%2FENCFF671SOE.hic": "3273732256,16438",
    "www.encodeproject.org%2Ffiles%2FENCFF702LAP%2F%40%40download%2FENCFF702LAP.hic": "1800427500,31682",
    "www.encodeproject.org%2Ffiles%2FENCFF339PON%2F%40%40download%2FENCFF339PON.hic": "5394351199,31514",
    "www.encodeproject.org%2Ffiles%2FENCFF741QPR%2F%40%40download%2FENCFF741QPR.hic": "4271510019,30139",
    "www.encodeproject.org%2Ffiles%2FENCFF103ANX%2F%40%40download%2FENCFF103ANX.hic": "4439745804,30083",
    "www.encodeproject.org%2Ffiles%2FENCFF395SBC%2F%40%40download%2FENCFF395SBC.hic": "1596732351,31850",
    "www.encodeproject.org%2Ffiles%2FENCFF289WNN%2F%40%40download%2FENCFF289WNN.hic": "8632980535,32102",
    "www.encodeproject.org%2Ffiles%2FENCFF381EAU%2F%40%40download%2FENCFF381EAU.hic": "1702476311,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF976FEY%2F%40%40download%2FENCFF976FEY.hic": "1448279040,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF485LVS%2F%40%40download%2FENCFF485LVS.hic": "1593610856,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF143VJV%2F%40%40download%2FENCFF143VJV.hic": "1422312076,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF588NHX%2F%40%40download%2FENCFF588NHX.hic": "3943637009,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF768UBD%2F%40%40download%2FENCFF768UBD.hic": "24786676166,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF965PEE%2F%40%40download%2FENCFF965PEE.hic": "29387092778,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF702IFC%2F%40%40download%2FENCFF702IFC.hic": "29387092778,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF288DNV%2F%40%40download%2FENCFF288DNV.hic": "10313429504,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF698HWZ%2F%40%40download%2FENCFF698HWZ.hic": "10962849269,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF355OWW%2F%40%40download%2FENCFF355OWW.hic": "3219571601,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF177TYX%2F%40%40download%2FENCFF177TYX.hic": "10325679706,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF542BHD%2F%40%40download%2FENCFF542BHD.hic": "11085397879,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF684IFW%2F%40%40download%2FENCFF684IFW.hic": "11085397879,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF592UHE%2F%40%40download%2FENCFF592UHE.hic": "21363948089,32102",
    "www.encodeproject.org%2Ffiles%2FENCFF779XIS%2F%40%40download%2FENCFF779XIS.hic": "9517383271,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF518PSL%2F%40%40download%2FENCFF518PSL.hic": "7500581463,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF275GBB%2F%40%40download%2FENCFF275GBB.hic": "7889407162,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF634KXI%2F%40%40download%2FENCFF634KXI.hic": "6430702966,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF337QPM%2F%40%40download%2FENCFF337QPM.hic": "8529733887,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF162KMP%2F%40%40download%2FENCFF162KMP.hic": "5615896908,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF992VTE%2F%40%40download%2FENCFF992VTE.hic": "7328975027,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF464WXY%2F%40%40download%2FENCFF464WXY.hic": "5715339664,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF752EGH%2F%40%40download%2FENCFF752EGH.hic": "1733758743,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF474UJM%2F%40%40download%2FENCFF474UJM.hic": "222309548,18679",
    "www.encodeproject.org%2Ffiles%2FENCFF531UPZ%2F%40%40download%2FENCFF531UPZ.hic": "1827756846,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF022VHA%2F%40%40download%2FENCFF022VHA.hic": "244983451,18679",
    "www.encodeproject.org%2Ffiles%2FENCFF732NGR%2F%40%40download%2FENCFF732NGR.hic": "1679484567,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF513VSF%2F%40%40download%2FENCFF513VSF.hic": "28397932940,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF750AOC%2F%40%40download%2FENCFF750AOC.hic": "36471430712,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF219YOB%2F%40%40download%2FENCFF219YOB.hic": "2859767211,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF604YDD%2F%40%40download%2FENCFF604YDD.hic": "3549694085,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF746AMV%2F%40%40download%2FENCFF746AMV.hic": "2954867135,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF845ZEB%2F%40%40download%2FENCFF845ZEB.hic": "2763039282,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF570LWS%2F%40%40download%2FENCFF570LWS.hic": "2861588289,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF883YVR%2F%40%40download%2FENCFF883YVR.hic": "2433679887,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF056VLK%2F%40%40download%2FENCFF056VLK.hic": "2502986910,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF532DUQ%2F%40%40download%2FENCFF532DUQ.hic": "3172615899,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF723PYJ%2F%40%40download%2FENCFF723PYJ.hic": "10292839095,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF991SGJ%2F%40%40download%2FENCFF991SGJ.hic": "13072407683,32102",
    "www.encodeproject.org%2Ffiles%2FENCFF885UZI%2F%40%40download%2FENCFF885UZI.hic": "1201881201,16438",
    "www.encodeproject.org%2Ffiles%2FENCFF287KXA%2F%40%40download%2FENCFF287KXA.hic": "14705801988,32102",
    "www.encodeproject.org%2Ffiles%2FENCFF335HYI%2F%40%40download%2FENCFF335HYI.hic": "20366756545,32102",
    "www.encodeproject.org%2Ffiles%2FENCFF121YPY%2F%40%40download%2FENCFF121YPY.hic": "2760104016,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF675SJE%2F%40%40download%2FENCFF675SJE.hic": "3751779995,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF876LAW%2F%40%40download%2FENCFF876LAW.hic": "4032376256,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF740KVX%2F%40%40download%2FENCFF740KVX.hic": "3202490322,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF977OQV%2F%40%40download%2FENCFF977OQV.hic": "2919735477,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF525EFN%2F%40%40download%2FENCFF525EFN.hic": "2394748073,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF690QRC%2F%40%40download%2FENCFF690QRC.hic": "3183023394,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF452FWS%2F%40%40download%2FENCFF452FWS.hic": "2951805127,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF089KBG%2F%40%40download%2FENCFF089KBG.hic": "2531936700,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF939ARM%2F%40%40download%2FENCFF939ARM.hic": "3066385212,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF401ZAN%2F%40%40download%2FENCFF401ZAN.hic": "3008677144,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF378RZT%2F%40%40download%2FENCFF378RZT.hic": "2830232168,26979",
    "www.encodeproject.org%2Ffiles%2FENCFF304AVD%2F%40%40download%2FENCFF304AVD.hic": "6164439305,50358",
    "www.encodeproject.org%2Ffiles%2FENCFF453DBX%2F%40%40download%2FENCFF453DBX.hic": "6775246670,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF590VOM%2F%40%40download%2FENCFF590VOM.hic": "6443478922,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF246DOF%2F%40%40download%2FENCFF246DOF.hic": "6837914659,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF125FXX%2F%40%40download%2FENCFF125FXX.hic": "9736232550,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF241RAY%2F%40%40download%2FENCFF241RAY.hic": "7686758397,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF415XWQ%2F%40%40download%2FENCFF415XWQ.hic": "6973092068,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF374EBH%2F%40%40download%2FENCFF374EBH.hic": "8557459058,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF263YWR%2F%40%40download%2FENCFF263YWR.hic": "331586820,18679",
    "www.encodeproject.org%2Ffiles%2FENCFF280CGS%2F%40%40download%2FENCFF280CGS.hic": "1743569614,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF553ZNS%2F%40%40download%2FENCFF553ZNS.hic": "1717253636,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF451VOI%2F%40%40download%2FENCFF451VOI.hic": "1626927468,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF420MQO%2F%40%40download%2FENCFF420MQO.hic": "31055961677,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF301BWY%2F%40%40download%2FENCFF301BWY.hic": "38902429246,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF606XNW%2F%40%40download%2FENCFF606XNW.hic": "1009699327,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF439ZOU%2F%40%40download%2FENCFF439ZOU.hic": "12381714313,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF499SYK%2F%40%40download%2FENCFF499SYK.hic": "13182654663,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF532LFI%2F%40%40download%2FENCFF532LFI.hic": "8286030286,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF020DPP%2F%40%40download%2FENCFF020DPP.hic": "23521952420,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF306VTV%2F%40%40download%2FENCFF306VTV.hic": "23521952480,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF399IHE%2F%40%40download%2FENCFF399IHE.hic": "10216571232,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF944AII%2F%40%40download%2FENCFF944AII.hic": "12567308552,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF230HVV%2F%40%40download%2FENCFF230HVV.hic": "8629849711,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF174LAF%2F%40%40download%2FENCFF174LAF.hic": "9446506633,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF898HRO%2F%40%40download%2FENCFF898HRO.hic": "9446506633,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF429MOR%2F%40%40download%2FENCFF429MOR.hic": "1455757398,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF061NXV%2F%40%40download%2FENCFF061NXV.hic": "1710915891,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF434PYS%2F%40%40download%2FENCFF434PYS.hic": "1832274903,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF704HHX%2F%40%40download%2FENCFF704HHX.hic": "1768142834,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF349DPM%2F%40%40download%2FENCFF349DPM.hic": "4316041260,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF718AWL%2F%40%40download%2FENCFF718AWL.hic": "39544267907,58932",
    "www.encodeproject.org%2Ffiles%2FENCFF065LSP%2F%40%40download%2FENCFF065LSP.hic": "24929805283,55874",
    "www.encodeproject.org%2Ffiles%2FENCFF632MFV%2F%40%40download%2FENCFF632MFV.hic": "22333105467,55798",
    "www.encodeproject.org%2Ffiles%2FENCFF179HVU%2F%40%40download%2FENCFF179HVU.hic": "2659219603,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF791SPZ%2F%40%40download%2FENCFF791SPZ.hic": "2537491657,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF211ZWF%2F%40%40download%2FENCFF211ZWF.hic": "3512141227,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF614BNU%2F%40%40download%2FENCFF614BNU.hic": "5252155462,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF891DLM%2F%40%40download%2FENCFF891DLM.hic": "2549095612,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF056EXT%2F%40%40download%2FENCFF056EXT.hic": "2219014704,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF776DSS%2F%40%40download%2FENCFF776DSS.hic": "3920308353,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF814LQF%2F%40%40download%2FENCFF814LQF.hic": "1349480197,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF513ZNA%2F%40%40download%2FENCFF513ZNA.hic": "2638868195,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF692IOL%2F%40%40download%2FENCFF692IOL.hic": "3106768498,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF294WZY%2F%40%40download%2FENCFF294WZY.hic": "2211089761,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF339UWS%2F%40%40download%2FENCFF339UWS.hic": "2142759055,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF835FSK%2F%40%40download%2FENCFF835FSK.hic": "3919821739,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF328BMB%2F%40%40download%2FENCFF328BMB.hic": "2550686152,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF897RTY%2F%40%40download%2FENCFF897RTY.hic": "1323294397,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF306MWH%2F%40%40download%2FENCFF306MWH.hic": "1665386199,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF039YUJ%2F%40%40download%2FENCFF039YUJ.hic": "2335679939,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF468QIN%2F%40%40download%2FENCFF468QIN.hic": "3352516594,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF364WXU%2F%40%40download%2FENCFF364WXU.hic": "3959043175,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF373MSH%2F%40%40download%2FENCFF373MSH.hic": "4429550624,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF959EGQ%2F%40%40download%2FENCFF959EGQ.hic": "2475218228,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF624XMK%2F%40%40download%2FENCFF624XMK.hic": "3527855681,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF445OKS%2F%40%40download%2FENCFF445OKS.hic": "3369125589,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF239QDV%2F%40%40download%2FENCFF239QDV.hic": "1960069888,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF645AVM%2F%40%40download%2FENCFF645AVM.hic": "4969006589,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF494IPI%2F%40%40download%2FENCFF494IPI.hic": "1565483792,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF753IXE%2F%40%40download%2FENCFF753IXE.hic": "2892400648,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF731GXX%2F%40%40download%2FENCFF731GXX.hic": "5131381303,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF369CAQ%2F%40%40download%2FENCFF369CAQ.hic": "4236629448,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF053VBX%2F%40%40download%2FENCFF053VBX.hic": "54305946375,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF555ISR%2F%40%40download%2FENCFF555ISR.hic": "54305946434,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF964RSP%2F%40%40download%2FENCFF964RSP.hic": "12065485229,36479",
    "www.encodeproject.org%2Ffiles%2FENCFF234MZQ%2F%40%40download%2FENCFF234MZQ.hic": "17507142760,47429",
    "www.encodeproject.org%2Ffiles%2FENCFF994CEG%2F%40%40download%2FENCFF994CEG.hic": "17507142760,47429",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb068e787-bbdd-49e2-9f6d-7a0e9f065d6e%2F4DNFIHSUIRFY.hic": "2701182442,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3768b89a-e124-40eb-8acd-94a4fdd35807%2F4DNFIXTAS6EE.hic": "3283740601,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9c513602-5abb-4088-8415-c827c381ab0d%2F4DNFIC3JD6O2.hic": "4896075767,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fde954dad-1849-4c23-beb4-bf893b7d76c9%2F4DNFIGY85S4W.hic": "3364151996,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe1befa6e-8067-4296-8db2-67d2a2458985%2F4DNFI2LTNXME.hic": "3699291418,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbb3307fd-7162-477a-87c5-52f12d03befc%2F4DNFID162B9J.hic": "3576428773,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8597cdae-8319-42d9-9175-3f77aaee34e1%2F4DNFIQWS3632.hic": "4022561190,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F327f091d-6a63-47c4-9752-2dff303a13d9%2F4DNFI6GFHB6G.hic": "4239331168,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd70dc3b8-48a7-42c2-bd23-80bc44fc2266%2F4DNFIS5F6EBL.hic": "4404671861,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F77df7bf8-6a3d-407a-8968-4ca1e78d2269%2F4DNFIF2D3TL9.hic": "4793989394,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc8f7cc35-d2ef-4717-9009-c02154050fbf%2F4DNFI6EIFUZI.hic": "3370273763,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F98449d79-30d1-4e32-801d-07435819a42f%2F4DNFIRKGMZRQ.hic": "4669813207,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd4fe1844-2493-4722-8b98-34a93a4bb7d8%2F4DNFIQWD8ZYD.hic": "5379889057,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1ee40499-1de4-47ff-b540-d9a65943c6b8%2F4DNFIX7H3CE2.hic": "4857679239,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fac016170-23a7-4111-8773-353d6c150f34%2F4DNFIO21YDCV.hic": "4695989644,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1faea4e7-9a32-466e-a826-0bfdab6cd915%2F4DNFIUE5RAS6.hic": "4788044799,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fcbd396ed-11bb-404f-aed9-ef10abc258e6%2F4DNFIFI6NIKJ.hic": "2069414927,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Faf3f78db-ae92-4215-bcae-76d30c617e5d%2F4DNFIL5K3MA1.hic": "2585598247,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F66fc2893-224e-48b4-bdb0-25e022dedd03%2F4DNFIPV5KFMK.hic": "2060965679,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2b39781d-aadc-434f-abe3-562d61308fdd%2F4DNFIW8TIFI5.hic": "1694424195,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb6d28f7b-27d3-486f-b5ac-32567416560d%2F4DNFIA6NSSBJ.hic": "2219532611,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F08785616-722e-46bb-ade2-2fdd21324e11%2F4DNFIBKZK63V.hic": "2429136232,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F904b13d3-1203-42a4-812c-963e80c159b1%2F4DNFI3CFMRID.hic": "1233390166,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb0ed4afe-5ecf-451d-bb1f-444697e3f558%2F4DNFIYIAUEPW.hic": "1753567534,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4bb9a9b3-12a8-4d2f-8071-4722294c88ea%2F4DNFIC3HAU11.hic": "2271375254,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F5abf9c36-c1d1-44dc-8197-74d860d896c0%2F4DNFIM2BMJ33.hic": "1770471113,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa68475db-7816-4cec-b2da-d4ce4a0c7a0e%2F4DNFIBY3UHJB.hic": "2095528423,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F07c40943-0d0b-4b3e-94a0-8583b0e00b47%2F4DNFIWZEN3FF.hic": "1558559508,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd8a39553-2718-4866-9b2a-45d8e9c5ac6f%2F4DNFIE5TEYK7.hic": "1323063102,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F294b61ef-5565-4f04-ade9-f921a6686cce%2F4DNFI7H4II2V.hic": "1436947982,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F87a70ad7-7d34-4302-9c03-eb824bd4e633%2F4DNFIAS8LV1C.hic": "1263105698,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9db804c6-5a91-4cf5-8ae9-e054223afb77%2F4DNFIBXWIH8J.hic": "1587059951,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd1e55906-ec8f-444b-8ce1-2de22a431a76%2F4DNFIO2HBDAI.hic": "1666436393,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7a4b9b37-8e38-470c-8190-fd4d513c0bbb%2F4DNFIXWCLD4M.hic": "1513511880,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6c7615b2-5310-4bbf-a605-98761d3a3079%2F4DNFINASC4NQ.hic": "1420358914,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F20454014-49cd-4e2d-93da-f40ad52776d5%2F4DNFIZF1KI43.hic": "1377041630,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F5df04e86-ee2a-45f2-b878-bf1648e2cca5%2F4DNFIQBHR9XC.hic": "1179502734,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9d1cc910-bb3f-4106-802a-73184c58d5ba%2F4DNFIQVMVRP6.hic": "1811976991,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe431986b-0732-460f-92ff-0abd1694d2d0%2F4DNFIJ7OAIFQ.hic": "1685503856,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F56d0c575-4962-4ea3-92c3-55bd0e17c096%2F4DNFIE8E4ANZ.hic": "1598369564,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fdb1502fb-a989-4ef9-b800-7eaa7be172ae%2F4DNFIOUSETUP.hic": "1493294709,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Facc2f1c3-8c96-4d21-814a-3a8ba81e7741%2F4DNFIVJ3IIQL.hic": "1472376655,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F037fb4c3-8641-4953-a977-cc71f2137582%2F4DNFIHN2QSMX.hic": "1179632606,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F16d2c3c0-6d29-4815-b074-b142af90b615%2F4DNFIILDWK8M.hic": "2280059989,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F31789849-e4db-45d8-9730-66a048c02d8a%2F4DNFI6XD6JAQ.hic": "2253961696,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fff04947e-e6e8-4d62-8374-ef2ee4104809%2F4DNFIALNLR78.hic": "1914687914,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F53e6c1e7-9410-4158-84e6-57c2e683b095%2F4DNFIBT4EAKN.hic": "2296378356,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0127900a-258f-4815-97d2-6fd2b043d853%2F4DNFIDJ2JZ7Q.hic": "2558945393,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F89f95693-3d28-44eb-9d45-14932f8e258c%2F4DNFI8JFOAJT.hic": "1726440253,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd803d818-b0d4-4796-8d61-a9f3943f3b10%2F4DNFIRZA6EV6.hic": "1805017504,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff9165fb1-0782-4757-a740-5b929e0252bb%2F4DNFIB7QTIMH.hic": "2541020707,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff8d916b2-b58e-4cdf-894c-ffcb3bf6ebd9%2F4DNFIJ5DQZVK.hic": "2445734043,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F14066a5b-e01a-43c2-a468-b18826174df3%2F4DNFISTWNV9C.hic": "2499319890,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd0692151-7f9a-4475-b059-f8802616dded%2F4DNFIBN9K4V9.hic": "1591570769,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F70a7ef36-a514-4e45-918f-47c4e9e30ef4%2F4DNFIR8OU6QJ.hic": "1689882108,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F180306cd-8593-413a-ae83-24f19209c5d2%2F4DNFIDSWKFF5.hic": "1596696630,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6e7b9be7-f465-4434-8e9c-68d1e44a76af%2F4DNFIV239W4L.hic": "2345867406,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F55df948c-941d-4930-854c-6a07557a0c1d%2F4DNFIREVU1Z5.hic": "2254683002,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3f590cb7-df3a-498f-81c3-d5ed4179b8ad%2F4DNFIFHU75I5.hic": "2497670883,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8f064770-6008-4f74-bfca-268d4a22d745%2F4DNFIMROE6N4.hic": "9850583704,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa93d0588-76b7-4ccf-933c-4325876b0a53%2F4DNFI5SUHCGZ.hic": "10364705187,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2f5f0d6b-0b22-4936-93c9-0944d49c037b%2F4DNFII84FBKM.hic": "8836986129,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F12e90fc5-0b76-4e42-b346-58d267f9ad6e%2F4DNFI2J1ODWB.hic": "13410858286,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff2702a45-3e8b-4980-bcd5-6bb0e291614f%2F4DNFIJWBWE41.hic": "20515676755,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa0859349-5f06-4ad3-b56f-b1166b34a9eb%2F4DNFIIMZB6Y9.hic": "15350325963,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F12685c57-d54a-46fa-9efb-acf34ed77574%2F4DNFICJECID5.hic": "1525002266,26979",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd101a58e-89aa-44fd-96c5-6bf1e2476272%2F4DNFIR6UW2QA.hic": "1264999913,26979",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3d8c73bf-1335-4af4-b124-e3622d48c5f6%2F4DNFIGOEKBUZ.hic": "1905947578,26979",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fcd2477cf-6ed0-4d7b-b4e9-88fb38b0df48%2F4DNFIMDNAEW4.hic": "996444147,26979",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0f03953e-29da-4f2e-8c05-572d0edf4525%2F4DNFI5OSZ3JC.hic": "369361754,22829",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F29d95dbb-005a-4ae1-8b9c-0fec9ec0bbd0%2F4DNFI7KOUGFM.hic": "1227434049,26979",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa441ab7b-afbe-437d-bf98-b6b916558642%2F4DNFIGKX4A32.hic": "883933242,26979",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F941b2f94-2fff-4d3c-aceb-fee4a5ae41a9%2F4DNFI1ORHOTA.hic": "1140970677,26979",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8720ede9-093f-4c00-912f-373283260a16%2F4DNFIWSVLZED.hic": "458091151,26979",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe9e17155-2b62-4a68-afb2-31dfa674e169%2F4DNFI6H926RO.hic": "3552863515,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F22f22778-987a-4dc0-97bc-f26eae0156d9%2F4DNFIKTYSPOF.hic": "2939475400,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F40f40192-0acb-44cb-8778-8d21afe593fb%2F4DNFIZ4S52BV.hic": "3067438113,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd8767374-7018-4e11-9226-bf5612d39ebb%2F4DNFI3APMXHF.hic": "3258874744,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8c5140ec-a65a-4186-8c59-2927233eecaa%2F4DNFIQLIKDSD.hic": "2746398416,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8cdedda6-d7d8-4231-a85b-d56fcd962366%2F4DNFIKYXMF1E.hic": "14442148774,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Faa4d4497-7c6c-4dad-8040-be13ba07ea32%2F4DNFI9815EEJ.hic": "17960817603,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe9b7b95f-190b-49fe-8047-ef4a8fc59746%2F4DNFIQ2687RT.hic": "15954277087,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F59863d3a-8d7c-49c7-9a41-7f2a58ad24d1%2F4DNFIYDBBSE3.hic": "16499534862,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3e80ca41-b3e0-4f4f-a05e-8f95fe96d938%2F4DNFIMOCN1YS.hic": "863725312,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F96f97a01-0020-4f09-93e8-fc8a9fd07218%2F4DNFI6558CM8.hic": "1597967345,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fce9e9334-ee0b-4549-a845-110470ba5986%2F4DNFIQZRKS7Y.hic": "907626411,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fdaac8209-1015-48da-9e31-2e252dfd8fe0%2F4DNFIX4DLXSE.hic": "1369766288,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F268b7d52-9655-474c-9467-8ba31bb2195c%2F4DNFII3JV8I1.hic": "856656441,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9681f9b5-335a-4f56-afa1-15b58bbb41e8%2F4DNFI5IAH9H1.hic": "1495185175,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3e082eab-95aa-4677-88ed-9d7adcc1effb%2F4DNFIK5HY1GP.hic": "2135337789,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F31af1ead-4520-4669-957e-424b4b197c33%2F4DNFIFA89L5B.hic": "1975593640,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fcc2b78fd-52d4-4e0c-ac93-b84ee82daf7e%2F4DNFICXCFGEI.hic": "2628202920,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff54efece-280f-46ca-95e3-1f8a3cd18820%2F4DNFIK4CECUH.hic": "1901129375,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1181c0c4-afb7-4b6a-9fdc-d868fb2253fc%2F4DNFI1EYIGOC.hic": "1947135384,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1d3e2905-b9b9-4b91-bcb4-8d34746e78f6%2F4DNFI7TLEWUI.hic": "1185758726,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Faba3d42f-39cd-4a85-9d3f-835aefb5c803%2F4DNFIVCJKHMN.hic": "687240974,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F27f54fcb-54fe-41a4-b25a-2f8944c89044%2F4DNFIN8F14CS.hic": "1304082029,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb75fedb5-88f4-4bc0-8e38-298df7847a7f%2F4DNFI5LCW273.hic": "12497258313,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2f22b2a0-3712-496e-92d2-63775ec0e421%2F4DNFIVSCH2CH.hic": "12594733778,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F07e47261-5863-44f5-9198-76e263081bea%2F4DNFIZ268JGC.hic": "1499059135,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F682b1ae1-3ac3-40e4-a330-c49f63946952%2F4DNFIJ1P4HBI.hic": "1190211725,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F197e7c89-ea73-41de-8cb2-8c0b1e3bb945%2F4DNFITEGKBIW.hic": "2061501971,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F191f6928-c9a8-44b2-8516-ee4d6005f24b%2F4DNFIE1P6RVH.hic": "1711447310,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F94435086-3701-4b28-a6d0-4a59b24d7615%2F4DNFICJ6I4DO.hic": "1557899940,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Faa9ac173-d233-41c7-8985-ca91949664e4%2F4DNFIKUG8MEW.hic": "1339072088,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fba6d8ab6-ee18-4ba2-8da9-d631888dd50a%2F4DNFICFZGFAV.hic": "1261083478,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F87a3ab04-7094-4673-81e4-ac8c9add8eb5%2F4DNFIQXCZVVA.hic": "1084913802,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbc1ff488-82af-4579-9424-959184edb139%2F4DNFIB6PJFJ3.hic": "1114571343,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1f7026ee-987a-41e7-8a61-45510ee3f86b%2F4DNFIX97731O.hic": "1246860402,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6186787c-2e72-4925-9729-02121e2e4597%2F4DNFIYQYZOTO.hic": "1212210849,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3b98a946-0109-4efa-a13e-cc7a36772125%2F4DNFIPXU7V25.hic": "1696288217,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fea17d041-c6ed-43a1-8047-535f3d19ad44%2F4DNFIL39PR76.hic": "1719284710,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F72774afe-f166-42ac-9849-4070b0dadf6d%2F4DNFIYLJ3R3B.hic": "1106419640,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4a45e733-55f8-4a8e-be24-2ef34c976e25%2F4DNFIL51WBN6.hic": "1327651164,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F086c62b0-a26f-41ae-a5ff-88b8be2bd2aa%2F4DNFI6SFPUDA.hic": "1336964405,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4d9b79c7-af62-4070-84a9-b953903f2732%2F4DNFI2KM22QR.hic": "953067310,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3c9889d1-f49e-4639-8e15-2d99d6cd22e7%2F4DNFIVF8Q45U.hic": "984193565,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa080dd7b-b7bb-4eae-a275-572a8b45b2d0%2F4DNFI2RN3WFP.hic": "1046525527,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb81860ca-c227-4b68-a298-1907fd32300a%2F4DNFI4TJTL7A.hic": "1160373401,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F74ab47dc-7b52-421c-845e-6feb33457adf%2F4DNFIYJ4TWB8.hic": "1268416204,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc6582128-a930-4bcc-941e-5c0733bdd4d5%2F4DNFIM6RGKPV.hic": "863347067,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F11a75514-4450-4295-9eda-18e3678a575a%2F4DNFIL2VWWL5.hic": "860731581,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F5eb52a8c-bf14-4225-bf34-14a0aa47c369%2F4DNFIX6ZXCA8.hic": "893462267,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F66aaa4c0-1f62-4040-8ecc-4e95da23cd18%2F4DNFIEVR81FS.hic": "879736207,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F821c6e7f-96f7-47de-b7d9-4970562b3c8e%2F4DNFIAUI6BBI.hic": "996313881,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9252c362-31ab-413d-a47a-cc97bdbf243a%2F4DNFIAFEE9G2.hic": "1103265750,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc1a0bf52-2e65-4deb-871f-ede736babd41%2F4DNFIPZBEXCP.hic": "1081257762,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F729f5ce3-d7e0-466d-b781-d18049e63bfa%2F4DNFIWPKRZGU.hic": "973779283,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F80b769ee-a717-4825-9db0-dca86f913173%2F4DNFIMD9QNDX.hic": "1158688208,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F266290c0-2767-4158-85ab-7274368905b9%2F4DNFIATA1HD5.hic": "1073361089,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc46f18a8-eb24-4d35-b112-36db72bde2f5%2F4DNFIH9U4I7I.hic": "1111124316,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fec91a79e-7de7-49f7-9b3d-d28313aeddc8%2F4DNFIZ95S6TR.hic": "1242494051,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9e9390b9-da20-43bb-a8f4-9830f354ddf9%2F4DNFI5ERM9J7.hic": "1271051397,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fee8ea82e-b9e4-41ad-bced-5f4fbdaa4fec%2F4DNFI15FPSQL.hic": "1216714120,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbed7eb86-8990-42f2-b3ee-5992d6361f7c%2F4DNFIJ3DZPGM.hic": "1035089437,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fdaa8a324-3bf8-424c-8a86-b8ad325cc20d%2F4DNFINW9P6XF.hic": "1215712740,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F70631758-6bf8-47a0-92b6-132574886faa%2F4DNFITS16HW8.hic": "1105283847,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe473304b-7bc8-49b8-bba1-ecb9f06914ee%2F4DNFIS3DIH4V.hic": "1036056660,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F10f9224a-111c-402a-ac25-e221ad0af9ef%2F4DNFIY3KDHP6.hic": "1071761024,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F17519b96-2bdd-4294-98f0-1535f1aef28e%2F4DNFIO8HVKOL.hic": "953793750,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ffb18f896-4730-4909-86a3-867fc8e76cd6%2F4DNFIMF6CFOM.hic": "708717889,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fcfee4d87-0873-40b0-b79f-35dcc8669c1c%2F4DNFIZZ77KD2.hic": "732668723,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb8b5d909-8a1b-41bb-bcdd-d108a0bde762%2F4DNFIOLO226X.hic": "951271932,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9ce81f6e-b9cf-4ec9-8bd3-517539e4b662%2F4DNFIJMS2ODT.hic": "932509067,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F506aa952-5d41-49ff-b658-916bcf88a395%2F4DNFI49F3LJ4.hic": "1208494817,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe4dc392d-ca36-4bdf-a27d-173cae34f520%2F4DNFI65MQOIJ.hic": "854630155,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F149ef8d7-e0b4-4e4f-b7e5-7226e2603746%2F4DNFIM4KEPRD.hic": "882790622,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa436f0a8-4f9a-4524-90ac-795c5b8491cf%2F4DNFIIXBIZFC.hic": "848244425,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbc8a05dc-7449-4b01-8330-a55db37ca8e6%2F4DNFIWDOOBVE.hic": "1116239020,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Faef8b881-28fe-4694-9a95-1d31940e6726%2F4DNFIDT9EB5M.hic": "888289053,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff66f3162-a53d-46f2-8800-3752935d5400%2F4DNFIX2VUNV8.hic": "1226661451,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F36c782e6-2c48-4298-aa43-bd6624da003d%2F4DNFIEQHTV1R.hic": "804665819,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff15d571e-605d-4bcc-a359-0350b57a6815%2F4DNFIFW7GA64.hic": "901568712,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc2aa2e8b-ac7f-4acb-b4b5-ac5f845840fe%2F4DNFIXGXD67I.hic": "970995551,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F71b6fd7d-b249-4d65-a597-b80b95845399%2F4DNFIA7GB1NB.hic": "956785837,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6cbb1418-34db-427f-9273-5174eac81529%2F4DNFIVOJGWNP.hic": "890415052,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc69c2ee7-b6c3-4a62-8d4f-913491c9dab8%2F4DNFIW22BNB5.hic": "1075499540,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa268f28f-c6d9-4324-8989-75d2d317af1b%2F4DNFIIFBC8WN.hic": "1045459440,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6c7361d4-60a6-440b-b5be-072cada98663%2F4DNFI9ZBEBJH.hic": "759395398,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fcceaad1a-e01e-4430-8bd6-24ffa6891802%2F4DNFID4SLU53.hic": "921288444,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9eee5854-b33e-4d5a-9ba8-ceffd47e7488%2F4DNFIODI1NUJ.hic": "733159777,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F5e1089b0-42e8-441c-99bb-4be99bcec28b%2F4DNFIJL26LFN.hic": "723567970,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F298a429e-ea29-49d3-bfed-fa851e1e7c4c%2F4DNFI5KTF553.hic": "2213661745,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F965d29f0-e4a3-477c-8ae4-faf4a654e69a%2F4DNFIYSPGFGV.hic": "2274989349,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd88acbc1-37b9-4266-9f97-d8fed576d0f3%2F4DNFILOR6D2D.hic": "2595459358,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7b6ddbce-0ed1-4272-b8ae-32793e4ea4e4%2F4DNFI1WMMPJQ.hic": "2262433890,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fedc0c8c4-97d8-4372-9a4f-5e0cdf09d7d0%2F4DNFI47P5978.hic": "2146314403,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0edcc389-43a4-44d7-b946-fe3496f93d56%2F4DNFI7XGW6IH.hic": "2302805723,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0a802926-e235-4c80-b521-83a1774dfb46%2F4DNFIK1EJG8I.hic": "2374943035,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3c36aedb-6a58-4aa2-9b11-bb440ec174f1%2F4DNFIDQ3THN9.hic": "2341188249,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F846123cd-8828-4e51-8b8a-27deaf293858%2F4DNFI3WPNFWT.hic": "775145629,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbd06e3ad-0e37-48a3-8367-c7d5912cab03%2F4DNFI9DCUOQ1.hic": "870487824,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc2eaf9bf-9584-4cec-8685-bd74038a6c01%2F4DNFIU8AF5ZY.hic": "1276224366,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F219497b5-3f35-473b-9d4e-e1cf21c69561%2F4DNFIHW8NTQX.hic": "28864787856,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4be13558-114a-4f2d-abca-7598e2ff4757%2F4DNFI4OUMWZ8.hic": "17061013588,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F49aed637-87a1-4d4d-ae68-e5da82aec05b%2F4DNFIEYQ5ZIR.hic": "13555272651,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa2f48779-4eff-44a6-8a9d-96435aca1ddc%2F4DNFIDZT7PR8.hic": "13425047093,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb6ec6b71-27b8-4891-b10a-ab06a5270468%2F4DNFIEJEFCAM.hic": "15394960208,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F68b9a7b5-8413-44fc-8c2d-59a67b1c4166%2F4DNFIJ8JKKWJ.hic": "17012681779,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F294d45a4-8b5e-456f-a9cb-1cbbbad3a7d2%2F4DNFINEQY95T.hic": "13966775978,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbd7f3a48-b822-41e2-bd9c-f52b3aff7b6a%2F4DNFII6AN691.hic": "12367300362,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7da44594-0dc8-4e74-8e10-a957aeaea51a%2F4DNFIDBIEXI7.hic": "2015474981,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F085a0453-3784-4eba-80b2-3556e53e2f52%2F4DNFIDKJFK2S.hic": "1983111659,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc370c78c-0a99-4c3f-a29b-2dfafc6a3e86%2F4DNFIPAF4PYT.hic": "3041434294,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F907ce45f-baa5-416d-92de-e86db4bacff1%2F4DNFIWIYYNQ5.hic": "7082321112,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff13afc6b-cf69-4c9d-881f-eed4dd3c28ee%2F4DNFIHMCILEN.hic": "1739157603,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7575d891-0e3d-4a77-896a-3e1b3a8d330b%2F4DNFIJBJ6QVH.hic": "5213499748,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff0daa830-60d5-4c7c-a2e1-a4ee70b3fee7%2F4DNFIH2A7IKF.hic": "4099503507,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff4970a25-91d8-49a7-9a4a-fe0f12cb2b0f%2F4DNFIOL8KGQ2.hic": "2256042055,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F879f1850-d175-4a86-8a97-12658482e3d1%2F4DNFIWILLD6C.hic": "5476286356,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F787f538e-d619-4c8f-985b-78753fb7e57c%2F4DNFIZBXXJAF.hic": "5946467856,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb8ee785f-1016-4989-9e64-78352621d32f%2F4DNFI8PZOJHN.hic": "8307204961,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3d8997fa-528c-4531-b25b-a412de6bd472%2F4DNFIGXAMSJY.hic": "6577588285,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F87aede55-7610-4283-af0e-c6840429a31e%2F4DNFIWNNO89O.hic": "2871061417,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F93b8e020-b337-4685-81dc-40cc8a12b5e9%2F4DNFIXU2KPNQ.hic": "3401717686,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ffb5cf1bd-59d6-46fe-857d-b86d9756029d%2F4DNFIHBGD6N6.hic": "840028421,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2d1bc088-d838-49b8-85fc-fea78a7353c4%2F4DNFI7J8NI4A.hic": "675705256,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F21a27b63-fd67-401b-9aa2-2798e6588d21%2F4DNFISFM9VFK.hic": "800145922,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F656c0a9d-7058-4c4b-a3ce-701d929561c1%2F4DNFIJU5XBK7.hic": "966593603,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2efacfbd-9c81-4e62-8df7-847d1ab774d5%2F4DNFIPKY8ED1.hic": "3401629450,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa50b6a26-56b5-43f2-b525-fa219fd716f1%2F4DNFIQRTP7NM.hic": "5358852759,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff5dc7a59-b998-4490-8a76-afbf3b258a49%2F4DNFIBCIA62Q.hic": "5779049277,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F62b2b237-cb02-45f7-89d9-616cf9ffb678%2F4DNFIV56OFE3.hic": "5818844506,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8ac79b4f-cfbf-4b2a-9fc2-898ed6c3e5e1%2F4DNFILIM6FDL.hic": "19637469163,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1cff8afa-5a13-4ad4-bcad-91fc3ced759c%2F4DNFIP71EWXC.hic": "17934647326,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F000789fe-9a22-4280-a71c-7ad228fd4cac%2F4DNFIM7ZVQOQ.hic": "700134697,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8d78457f-0c2b-4358-b08c-4d4ef4d9f59d%2F4DNFIS6EYHCX.hic": "628314484,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8ca3b4a0-2478-49c9-b4a2-a28430417a32%2F4DNFIKKCMS1Q.hic": "584050634,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff5041473-18ec-439d-92b1-8ad98c9b25c0%2F4DNFIBIV8OUN.hic": "522632731,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fcf474ec6-abd4-431e-a21c-252fcf5ee6b3%2F4DNFIAUMRM2S.hic": "313395531,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2bb1c73e-fb0f-41c4-8620-a938cc8d24a0%2F4DNFI9ZUXG61.hic": "332217525,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F26dfa41e-7e4f-457a-a3ac-72daf8059f3c%2F4DNFIDBFENL7.hic": "359604894,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8ed2e68b-189e-4988-bb6d-94e63240a231%2F4DNFI7XAZNNQ.hic": "5312422266,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6f2b1ce0-5205-4680-981e-d91b694dc3e4%2F4DNFISNGDB53.hic": "2008546759,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F73c8147f-bc7d-4d33-8a10-a9e7b413ecc6%2F4DNFI1CIGHYC.hic": "2221847625,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F526ae3e3-32cc-4670-970f-1faa9cfafd4d%2F4DNFIQD2DP2F.hic": "5295591503,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6e803530-47f8-4c56-bb19-fbdcd578d2f0%2F4DNFINHT8P7C.hic": "3159499486,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ffe705f38-903f-47b7-9b38-f80ebd18a479%2F4DNFIGF8EM7M.hic": "3490552542,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Faa197328-d6da-4299-a0fd-409ac9892668%2F4DNFIUPG2ZBJ.hic": "5382003751,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ffe5d52c4-2be7-4812-bca0-cd4bb3025e6b%2F4DNFIH3OTR14.hic": "3224693110,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F21935f61-daa8-4df2-aa69-fcd27953b405%2F4DNFIUATRW3Z.hic": "3835865655,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F72147527-e3e8-4967-bc45-8251249d76c9%2F4DNFI6V7ZQAE.hic": "4382708138,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F589f0919-f54d-49ff-a482-e2f453ef7f34%2F4DNFICKMT1CY.hic": "4479068191,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F861946ca-bad8-4a87-96e1-b2eb20b9ef10%2F4DNFIF9BDCNI.hic": "3698151402,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff76346ac-97ec-4893-8984-2b75ce1cdc51%2F4DNFIG5O1OQS.hic": "5704288175,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe8b43826-f049-4c3f-b83a-e75fa7aacc85%2F4DNFIHS2SVBQ.hic": "990025510,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F46316260-f555-4dd4-9e40-8ae06ca52822%2F4DNFIU95B69H.hic": "1275878544,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff62ef491-a3ae-4f66-ab33-c5673c9e0b65%2F4DNFIYRROFCR.hic": "1522530503,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1cd617e1-fad4-4fdc-8b4e-cb277650123c%2F4DNFIF7JN3IU.hic": "1463443128,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fdb20fe2a-0078-4d4a-8a52-d76043d06f40%2F4DNFIB2RYULQ.hic": "1269529700,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3d386fcf-1d22-47de-a0d6-0c3a641ca174%2F4DNFIMVDK3SI.hic": "1185489599,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F00e470bd-c533-41b1-923a-4b471824da12%2F4DNFIRLOTXSC.hic": "978217499,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb8774fb3-d0c5-43cc-a6c9-eb0ca39841fb%2F4DNFIZAPX6J8.hic": "1100356082,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fab3b826e-614c-448b-860f-a3ebef68a82f%2F4DNFIQD5VCSD.hic": "1322319877,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F66c78d2b-993a-4937-95ed-9e2d302ceb3e%2F4DNFIIF6VAGN.hic": "868885799,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F5d106fe1-2d80-466e-87aa-46b38ba142c5%2F4DNFI86IEZXH.hic": "751443267,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc99490b6-faf9-413f-9c38-3f53018089d6%2F4DNFIP881SR2.hic": "754427927,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F39c7e387-e710-4b1d-b757-357dec03f6ad%2F4DNFI42NNCW8.hic": "1166392978,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4742a211-43b1-4325-af6f-82490aeb766b%2F4DNFIEV4PKP6.hic": "1102227476,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Feaa73842-1c86-4ad9-8a9e-c189c0b4c01d%2F4DNFIF1DUQHE.hic": "1206699207,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd25f24df-0298-4079-bb6f-1c8e1e32392b%2F4DNFIGW55EAY.hic": "1033358104,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc57a7ab5-2778-4fe2-9d64-9a4e95135f12%2F4DNFISZRU6I4.hic": "1539570262,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd89f494a-27ca-46b6-89be-7583f3f6d18c%2F4DNFIBKKDTAP.hic": "350372180,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F06725280-cb24-4f22-a267-18b434bfa79e%2F4DNFIJSRQW24.hic": "314361467,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8fe5c3c5-006f-425b-ac6d-ea475e29be78%2F4DNFI3REN89E.hic": "299665258,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc8b6ac5c-13b4-427e-9158-cec0b890b6d8%2F4DNFIF5XLHKM.hic": "235668364,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F01ff33fc-fc23-48aa-a6c6-b720d6fe0768%2F4DNFIB6Q538N.hic": "316494853,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F552978c8-abbc-424a-9187-3e34cf802a97%2F4DNFI3ST3F7Y.hic": "296298411,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F72e66520-5170-4f2e-844a-fbfd0e23b480%2F4DNFIQT4M6UI.hic": "307691265,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb3eb3953-ffe8-4d5a-970c-a16f3b7b9ec3%2F4DNFIFNCC7M2.hic": "364160436,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F37d413fb-afab-41ff-99aa-1678830f7dde%2F4DNFITM9MDJL.hic": "252412426,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Faf5db92c-aaf1-4086-a0d2-79b28648f172%2F4DNFI3NTD7B3.hic": "227586640,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff6892f7b-1f8a-4d7d-9605-c67932cd5654%2F4DNFIBED48O1.hic": "328344868,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd64afb07-5ab1-4c4f-8438-2fee37afa86a%2F4DNFISATK9PF.hic": "379669025,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fad11bb63-8692-461c-b698-89c601451321%2F4DNFISRP84FE.hic": "298491537,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F63710ec5-35d2-47dd-bf9a-08d3daa83d67%2F4DNFI2LY7B73.hic": "303150299,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F76077d9e-ca75-4301-ab79-88aa49bda495%2F4DNFIXEB4UZO.hic": "711757090,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F34dd4c0e-3487-4fb4-b95f-c4bb66e0fa31%2F4DNFIQWWATGK.hic": "221304476,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F48a8cf86-3248-4a8e-8e85-472ec219d49c%2F4DNFI44JLUSL.hic": "284772724,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fee399fbf-2a9e-46e2-8364-457713bff508%2F4DNFIM7Q2FQQ.hic": "330729464,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F124d191a-c5c7-49b6-b84b-0d1bad8bef2b%2F4DNFIZK7W8GZ.hic": "293166018,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe351f7cc-7a2c-4515-ae0b-3bb2f91c986a%2F4DNFIMIMLMD3.hic": "240094740,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ffd1ae249-57b1-41d6-81a6-16b21dcd8f12%2F4DNFI7QUSU5J.hic": "681762505,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F46c92c5c-9ad8-4d49-beba-f35c5cd99208%2F4DNFINXUOI5H.hic": "375594313,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd7350d40-4e9e-4131-9151-bb539d39b431%2F4DNFIIJR2296.hic": "331322302,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbfacf37b-1665-45f3-a046-e29e1544e9b0%2F4DNFIJMZUTXR.hic": "361313244,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F234e18fb-9990-43bf-9a48-f72722cfa232%2F4DNFIZQPT9EL.hic": "540421873,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4b35ab09-2e79-4876-b2bc-d3a8faa26257%2F4DNFIZIXSZ9J.hic": "545066813,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2ae5118e-807a-46e0-8e92-143d4b282b3d%2F4DNFIDD9IF9T.hic": "237409149,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb34d7f6f-73f7-4b6b-80c7-c8af0f991549%2F4DNFIVC8OQPG.hic": "355121712,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9ab169fd-cbdd-4f60-8553-a4c6912ad89e%2F4DNFITUPI4HA.hic": "313085022,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4e53712b-d0d9-40c5-afe1-ffa0fad71e59%2F4DNFI5IZNXIO.hic": "341863906,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7a91477f-45eb-4a16-affb-fc131f9326b8%2F4DNFII16KXA7.hic": "248904495,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F153729de-0eca-43cc-9b61-61aa8d775b38%2F4DNFIAAH19VM.hic": "668047244,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F879fd78a-7165-43d9-a0de-ca158b53df30%2F4DNFIVKIY3KV.hic": "247571318,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F67f901a4-040b-4b04-9fff-94a1780423cd%2F4DNFIVVCWL6C.hic": "198355985,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd5b30c5a-654a-463c-9474-39bdc3ce4500%2F4DNFIJRF2273.hic": "343971277,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7070280a-8f03-40d0-9fef-e9d9f4d3dae7%2F4DNFI6FCC9ZA.hic": "312013061,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F47049719-9407-4d76-9048-26231045f642%2F4DNFI1CPQ4O3.hic": "352923267,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F862c2b5f-44c2-4bd7-9264-b3ca032d3d8d%2F4DNFISXFEDE9.hic": "271745977,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Feffbe052-39ff-4217-9871-44199ed90818%2F4DNFIF9L6QEQ.hic": "668409334,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa7791854-1b35-4258-90fb-603c55f24642%2F4DNFIPKASX1Q.hic": "312727920,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F79cccad6-a78e-4de9-9fe7-08f7e8df663d%2F4DNFIWXZ4JQZ.hic": "151808553,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7e86e0cc-d6f1-4ce0-aba4-c36c6ebb3c4c%2F4DNFIEMQ1O8V.hic": "700533280,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4a1b58d3-9ae6-43e4-91cf-49f1fcbbab33%2F4DNFIYWONU7A.hic": "729050356,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F67bff264-0b0c-4c5c-9d4d-ff5abef2bbe4%2F4DNFISNIE5FH.hic": "7987657997,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3a6a943f-2cc0-4433-a27d-c89f3fdd3309%2F4DNFIV8MLWJB.hic": "6646216171,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9e235711-ba90-404d-b4ac-b15990ea8e33%2F4DNFIXSTDPHL.hic": "3146468238,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0c89f4bc-e9fc-4ecf-b868-26108dbb7bb2%2F4DNFIQJNOH8U.hic": "2919703928,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1856ff9e-de7a-4fa1-ae0b-3e04b837b5e1%2F4DNFI57XB4A8.hic": "13417594377,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F099bb5b9-6315-4650-8f78-d603f5a046b3%2F4DNFIQ7UKVZV.hic": "9016468637,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Faf3c7a30-0fc4-410d-8d41-247da3eb105d%2F4DNFIWJY8GHD.hic": "7921314766,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fda99f429-20ab-4d91-bbfe-f8bdea8ed7b1%2F4DNFIN8NKRNF.hic": "4247121358,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0ca0f4e3-30ca-4332-b735-e32dce08e1a4%2F4DNFIZYGEHNZ.hic": "4910404663,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F243f48b0-6b59-4f37-ad39-a12e0986f530%2F4DNFIRPYGAV8.hic": "4220073636,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F49f1a890-d458-42a6-9c78-99c38b6c7a8f%2F4DNFI6MZTDM1.hic": "375035361,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F76bd4768-9343-44ba-a99d-5500e184e39d%2F4DNFIG3BCGPL.hic": "2422923206,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9d1ed866-eaf6-4906-aa8c-9e39616dde38%2F4DNFIS9YPJ3L.hic": "1593271574,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1e7a5636-bdb6-45fb-85d8-87a7e908de43%2F4DNFIOWGA9AX.hic": "1632314387,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F5ecc552a-0a6b-49a9-9aa5-9f3fd9b535fd%2F4DNFINKEDSBF.hic": "1458761024,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6c03f1d2-bb25-4c94-b5f5-d5cdd01c14b6%2F4DNFIVIXVUK7.hic": "1504818271,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1a4616ff-6d04-4a6a-9773-b80e81da2471%2F4DNFIANHFY16.hic": "1850724180,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd2231870-a78d-4c8b-9cfd-084f2468acb1%2F4DNFIJ67ZFBI.hic": "1473864703,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F859c2dd3-df8a-42b7-86ea-bf6524f75e80%2F4DNFIG3YQQ4V.hic": "1539822829,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8bad667e-6003-4828-9a20-07585fa9c811%2F4DNFIOLKEOME.hic": "3036353747,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F92ea551b-5779-4d31-a0f5-621e4bd0eb21%2F4DNFIVLN8WJE.hic": "2710426318,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F61ee79fa-0617-4083-b121-f92ef3a8905c%2F4DNFI2111XQA.hic": "2589549183,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F83ebb98d-e5db-403d-aa23-875293156c0e%2F4DNFI88HXX7D.hic": "2462367030,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6d63671a-8f1d-4159-82c0-931b43464772%2F4DNFIUBM6QK8.hic": "2486020469,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fcccb9014-ce15-4032-81ac-222b3d621cb4%2F4DNFIVILEERC.hic": "2052537210,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F21a07867-4007-4ca5-b066-25d3168208dc%2F4DNFIF7Q43N4.hic": "2091773428,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff738de0f-358b-44bf-97dd-644c8d9b1b1c%2F4DNFID56VJGW.hic": "878913568,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fda97c1d4-bb92-4a77-92a7-f7960f88b9dc%2F4DNFIYUR29KO.hic": "983915575,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F54ea363a-99e7-4f55-861e-1644acab7939%2F4DNFIUDPGHO8.hic": "905253594,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fdcd66a07-55ee-48d9-a157-419cf4ee3eef%2F4DNFISWC2N8T.hic": "1233576358,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F40363837-7466-4a1d-b20d-a66d1670b700%2F4DNFICMPHDMI.hic": "516590777,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0b3fa4e6-caeb-40b4-8942-e9c0b03dfe4f%2F4DNFIKMKN736.hic": "634310295,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb6a34050-d52b-4880-91cf-d3fe4b0ce982%2F4DNFIN5NLS49.hic": "650451131,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8e63a47b-9fd4-4772-8b0c-10ee589ffb16%2F4DNFI4P8UBRL.hic": "705655033,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7d92b666-30cc-4838-9d46-c1f11cee3d3c%2F4DNFISNC3LAI.hic": "176146197,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F17f7dc63-a1bc-4970-b389-87d9ee93b753%2F4DNFIVBWPFD7.hic": "749678512,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff8897333-4791-4a83-9444-a653e24aee13%2F4DNFITMQRXB7.hic": "254477361,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8712bf31-33d0-4562-ab0b-a1e9cf4fd30c%2F4DNFIUYD3HBY.hic": "995625724,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbfaf6383-9cc6-4b5c-9b20-d3bf2e8c3495%2F4DNFIRRSC7P9.hic": "1149985362,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb0b70598-5d17-4e0a-8831-6cbe697e69e2%2F4DNFIWKR8FP6.hic": "1151628407,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fccc094a8-23ce-4fd8-9c4a-41f07c045c8f%2F4DNFIQ74RSUY.hic": "931695969,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8eda16f3-af5e-4f1f-b46d-c74df44b76aa%2F4DNFI9IIO5PW.hic": "1077740364,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff283637b-cf2c-4412-ba00-0e3d7e279fad%2F4DNFI8WGJG19.hic": "812086456,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7ad8438f-d3d9-42d8-88bf-42845a0dc2d0%2F4DNFIQ5CCESJ.hic": "652559720,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F70e3bdcc-caf4-4822-b9c5-85234873db7a%2F4DNFIWTZHB4H.hic": "760694196,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F56ed767d-cd8a-4d38-8047-ed1e8bc8cd19%2F4DNFIENYQCDP.hic": "1159428005,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa912fff9-5f90-42b1-a3a6-cbb9eb2cf861%2F4DNFIFATZWPD.hic": "1033325746,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F21338ea5-fdee-4ad8-b61c-608fc6cec4bc%2F4DNFI7YRXKEO.hic": "388142539,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff0f88647-5631-437b-b48a-4603915e3714%2F4DNFIUY3J7EW.hic": "407344788,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F16926af8-ac3b-4f32-97d5-6c0dc6f1596a%2F4DNFIRKUYKP4.hic": "893352368,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F93e39aec-6cde-4c5b-bcdf-283faa3163a2%2F4DNFIAQDBJZP.hic": "489922022,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0dc0b1ba-5509-4464-9814-dfe103ff09a0%2F4DNFIC1CLPK7.hic": "565748333,37769",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb50964c7-b025-49d9-b1ed-289bedb59678%2F4DNFI3A3VYWU.hic": "4597459343,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff4390cea-b330-4022-88c1-9ff8c0a786f7%2F4DNFI6JJQKFJ.hic": "3678393678,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F70c0f730-5da1-4863-9b7a-6cdd31066cff%2F4DNFIK61ILGM.hic": "3324300994,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F14b14ac4-ab59-4754-9c43-eacd9d0638e2%2F4DNFIYD8LO9Z.hic": "3227227120,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7386f953-8da9-47b0-acb2-931cba810544%2F4DNFIOTPSS3L.hic": "253942497,7557",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff6b5d8bd-27dc-4415-a320-53405a16db85%2F4DNFI525PKU5.hic": "305089653,7557",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1f922dbc-637b-4c43-b816-f604f0e79ad1%2F4DNFI8Y9SRP2.hic": "1438589609,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6a36d686-716c-4ba8-a9c3-fa8311791d3c%2F4DNFIP25GZGA.hic": "1419100109,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0e535542-2cf2-46e4-ba10-7a0b946a7fb2%2F4DNFITPO1WTY.hic": "3885296184,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0c17d228-5052-4c83-880e-af05118e6929%2F4DNFIG4X5Z5F.hic": "2159245890,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc3977c00-525b-4556-9a27-061707f8cb76%2F4DNFIXLYR32S.hic": "587852728,21916",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3f856506-cbc5-4211-a29d-48a7530c622e%2F4DNFIWI3V5LI.hic": "2318237793,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F38f77979-5eb7-4b6f-9a60-c2451185db98%2F4DNFI2DGL7LH.hic": "2068150664,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe0992a75-7727-405e-95ac-aa97141b51c1%2F4DNFI1VSO8JP.hic": "1807949651,21916",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe925f1aa-2e7b-44e7-bfa8-2084a613ab13%2F4DNFIV5O2ZYO.hic": "2242134377,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F803a6d3c-3972-4939-8ff2-d195c5192090%2F4DNFIEWEWQ8D.hic": "2981341325,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F25104375-a588-46e6-a382-663cee6c332f%2F4DNFICSTCJQZ.hic": "14592996888,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F927aa8a5-24a5-43b7-807a-1e99ac321459%2F4DNFICEGAHRC.hic": "15431307603,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8c380474-12cd-41f4-b86f-2a29faf12eec%2F4DNFIY3XPKPO.hic": "2550999291,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F77da562e-d0ec-45a8-8764-14fa16d995a1%2F4DNFIK9PS9GM.hic": "3401011629,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F11b26222-d480-40a7-8d53-3ad8500396cb%2F4DNFIF4Y74JR.hic": "2127593378,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F93df02c6-1047-43f6-afae-d3598b61eeea%2F4DNFIBBKG9KD.hic": "5724446278,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6cd4378a-8f51-4e65-99eb-15f5c80abf8d%2F4DNFIT4I5C6Z.hic": "5419655766,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F067881e5-563d-40de-a9e3-caccad887fbc%2F4DNFI2U38HCE.hic": "14749043471,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fcb3da9ad-7afe-4d0c-9c2d-261181e7a95c%2F4DNFIETP228R.hic": "9401474797,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F185b7bcc-7bb7-41b7-9ebe-92d4fe159431%2F4DNFIXKC48TK.hic": "11624295594,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F18459b84-dd43-4af6-a05f-bcb773096322%2F4DNFIFPGOWJ6.hic": "2843730862,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ffde1e48c-4a0d-4bb1-b84a-e0e45f9a0aa3%2F4DNFIIRMBE8Y.hic": "5820677927,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbabed539-1f0f-4e87-8815-fde596e6024c%2F4DNFIVUGNDD7.hic": "5170782436,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7d00531a-e616-469b-af52-5b028270e2ce%2F4DNFIFLJLIS5.hic": "18917549985,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7a9dad53-b8af-4cb6-9ce3-5c38e4a855c7%2F4DNFIOX3BGNE.hic": "5482775936,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F82fd7b7e-5f47-48d5-bf0d-daaa48a4674d%2F4DNFISPUVQHA.hic": "2177864938,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4c6680f3-9cf6-452f-9dc5-ecebf376775d%2F4DNFI8649RQJ.hic": "3288850368,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2395f001-19d9-4000-9f00-dae3dea708d6%2F4DNFIE8T8JZ8.hic": "1383191843,21916",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F24464fa8-bf96-483c-8e9a-c2f626ad6e19%2F4DNFIBM714BP.hic": "1765204569,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F918fc048-fa27-41d2-a63a-d50c511fbb9a%2F4DNFI6CWNUFL.hic": "2431120602,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7ff5a0d1-8e54-4cf0-9fe7-339f147c78da%2F4DNFIZ4F74QR.hic": "3211825957,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F355f0412-cb17-452a-b15c-aba16c5a742c%2F4DNFIOUVOX3R.hic": "5547401083,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3cac91c5-160a-4b91-a91e-edc309318dd5%2F4DNFIVTDXW6X.hic": "4797344498,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe9ac9ec5-6221-4f39-951a-1c5054fc9f1c%2F4DNFICA8Y9TN.hic": "4277557869,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F46f62222-b50a-428b-938b-5444951600eb%2F4DNFIDWM3HN5.hic": "4374808431,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F50e4f2a1-9cb6-4192-8199-64d354bfdf96%2F4DNFIBK5TB3N.hic": "3757387253,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe4cdd5a8-1a45-4c6a-906b-a9603260d4c8%2F4DNFI3JYF9VS.hic": "5260534916,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc8164e99-5778-427d-be26-f0e1b62400f0%2F4DNFIP1GNKUO.hic": "7589365689,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0d72e78a-fc87-4716-8b8e-6dc5650ff2ef%2F4DNFIQYQWPF5.hic": "22022259901,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fac58fc15-48c2-4eec-a689-23b677b4b6e7%2F4DNFIW6H9U3S.hic": "6810897169,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F31811e40-e3ca-4456-8ba6-2ee66d6c7104%2F4DNFI7J8BQ4P.hic": "7188744676,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F62d81a52-d2cb-4bbd-8510-0fe120e786e0%2F4DNFIA3AKFSU.hic": "1763730692,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fae0b7513-d1a0-4f27-a9d3-348837f42cb6%2F4DNFID68JQY9.hic": "2422880133,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fae6a1a7e-1d2d-4fd2-a89f-1799abac8a9c%2F4DNFIL1FQDXE.hic": "1543814834,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F80d343c9-bd60-468a-803d-c3e351a958bc%2F4DNFITSIPCSK.hic": "2344682115,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff2d61195-a3a6-4d50-b928-546ca67546cb%2F4DNFIJ88LYHR.hic": "3362742962,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F31052aba-773a-4500-961b-e0a518245b0c%2F4DNFIJIPWD63.hic": "2529548812,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc93d0710-3fbf-40cc-b0eb-878e2aa659e4%2F4DNFIZUP2BBI.hic": "491996147,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8660baeb-5be1-4ba5-93e4-66499e9a4587%2F4DNFIEBC4AF3.hic": "2993048734,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff6d08fbc-b836-4776-82ad-8b1b277ae837%2F4DNFI5VO3E1W.hic": "1949322679,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3af004a2-a6fa-46dc-8be8-898b847a77be%2F4DNFIFDGVWLU.hic": "2456400803,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbd613b4b-2422-492c-8d8f-8afba9c8a182%2F4DNFITVGFNYZ.hic": "1411204423,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc340694f-14f3-4638-b09b-98220c20039a%2F4DNFIOW9TTC1.hic": "2611370588,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3effa71b-6aa3-4265-87ba-f8d709d778d7%2F4DNFIOAA3ZEQ.hic": "3123195980,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fde75cf8b-9ce1-44fc-8b7b-ca0adea6bae9%2F4DNFIA5ID1S6.hic": "3496246968,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F714f775d-a5a4-4314-83f8-016b9d73200b%2F4DNFIZYU7V81.hic": "4245592042,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F5ca518af-6e1e-4777-b67b-0fe7f039ce58%2F4DNFIRV6PVUX.hic": "3981520466,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc29b57d5-c263-4372-b396-ab4f55682f5d%2F4DNFIMEANFBY.hic": "3999623376,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4196d3ef-161a-4c18-a57e-005165c6b32a%2F4DNFIGLGQXLC.hic": "4105683321,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe10828b5-9519-4ceb-81e7-7228bfd890de%2F4DNFILS2HLXC.hic": "3804942111,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Feaac88c7-9bdc-4b1e-aa9f-e675520dfffa%2F4DNFIQS8853L.hic": "5287726781,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Faab371b1-bc8d-4e83-998e-5bb977c443ca%2F4DNFIVBYCYGS.hic": "4657988157,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fdb116add-af8c-4a3b-b106-9f704ba0a175%2F4DNFIE4WWHMF.hic": "5116727268,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F033366e2-05a2-4381-9d48-90122892a9e0%2F4DNFIKDUUC3C.hic": "45638237,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7284a446-442d-4a46-aae5-84987e75a7af%2F4DNFIJ5HIRA2.hic": "62201052,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F876649a3-6dd3-463a-8b17-5752a98a89c5%2F4DNFIXDFC7EM.hic": "69878143,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3cb4ce4d-d474-459f-8b8a-2159d8df8068%2F4DNFIO35EOVR.hic": "70153114,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F5c5612fa-18c2-47fb-8074-693b1054e254%2F4DNFI57QGL6U.hic": "54605055,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F70c1472d-cf3a-41d7-8682-cd03b7cc978d%2F4DNFI2AGEBE5.hic": "67930121,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2bf4cce8-6e03-422b-a190-e51d4a07d501%2F4DNFI1E6NJQJ.hic": "4893181511,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0eb3aa56-8a23-435d-a07b-8bb545e8d708%2F4DNFI2DNFM1A.hic": "60466977,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1201682a-a223-482d-913d-3c3972b8eb65%2F4DNFIIRIHBR2.hic": "48961678,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6aee7913-6356-43cf-affa-f2b60dd478f6%2F4DNFIKXNMT46.hic": "39095246,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F357139a3-c9a5-4343-b0a4-b41c45fd03fd%2F4DNFIRV7IRJP.hic": "70916718,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F76be3061-6259-42be-a917-19dcba41517b%2F4DNFIFX1XYKZ.hic": "229197441,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff60c348a-a62c-43c3-ac85-f6c28b5f823f%2F4DNFI64CJUZ5.hic": "112428610,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbd0b0a14-9703-49af-bb36-2359f96d4d0e%2F4DNFIBPL2HL1.hic": "73972428,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F79ac278d-83f7-4c1f-91b2-05c8018c1426%2F4DNFIBRSIPE4.hic": "415430378,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0c3b8141-8e67-4211-80dd-3bae88f9e537%2F4DNFIDLDVY14.hic": "112747303,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2ae703d2-d85c-4ac4-9ce1-14d653927675%2F4DNFI4R1II4P.hic": "210565448,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F76e641af-90be-49f8-b126-12c20f856159%2F4DNFINMLRY95.hic": "1590865292,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3b416382-ae5d-469f-9e9a-85a3e2ce9793%2F4DNFI8KBXYNL.hic": "4626496956,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa27589a6-86b2-43a2-8218-1f2232d551e6%2F4DNFI53R5IKA.hic": "1536016455,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fdd3999f5-b36e-4154-a6b9-446656959a3a%2F4DNFIAWVDQ8C.hic": "2210273411,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc377953b-0e61-426b-a905-abab2d5a3002%2F4DNFI9VXTBE2.hic": "3384365692,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2dbe0377-1db2-4aae-af2b-d87dff728035%2F4DNFIT96Z365.hic": "7692311974,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fdcfcb009-f006-4ab8-a4c7-af72be58c12c%2F4DNFITUOMFUQ.hic": "6592120312,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F67f9073d-b2c5-474e-b3d5-7d72cde555cd%2F4DNFIHLQKDN8.hic": "2647703964,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F76968cc8-fb9f-485b-85b2-c9289067194b%2F4DNFIL9M97T2.hic": "6186798917,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F87d9330b-8d2c-4e9d-85bb-02e572de7a68%2F4DNFIDWGZLHX.hic": "4379708168,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ffc01b381-3665-4225-88ee-2e5e9ecb7324%2F4DNFIMEG1QIC.hic": "3587146533,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3144a03c-15c3-4bf9-95f8-ffad2640a1bf%2F4DNFIWSB66VX.hic": "1529739069,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd7d3aac0-ba66-494b-ba0c-147631084b98%2F4DNFIH7TH4MF.hic": "6896300679,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4b13bd19-fbd1-4c68-8855-4f0158d1ce47%2F4DNFIHKWIZ9T.hic": "1954878455,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3d04e286-30d4-4add-a806-7a929d36419e%2F4DNFIZBBX795.hic": "1350142414,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Faa26f261-a88a-4cac-9118-ff8e90ab6f61%2F4DNFI9ZWZ5BS.hic": "3410552807,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F24e516ce-0b49-4476-b818-cc96471d8765%2F4DNFIPAI8XB5.hic": "4168518737,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fac3b06b5-46d4-4c1e-97e9-9a4f353473a7%2F4DNFI1OUWFSC.hic": "10766406904,21916",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F76c6aa27-895f-4e82-8ed8-7a85aca84490%2F4DNFIX4PJKXZ.hic": "1463157350,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe6fbe03a-997b-4d72-a3cc-f1ed7bd88a92%2F4DNFIZGCA8AH.hic": "1597664180,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F61d99a87-4ec6-4116-be99-b483999641c4%2F4DNFI5CGQ46V.hic": "2870576870,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F271ea8cd-53b9-44c9-9fff-1bb5c444b54c%2F4DNFIOCW5AEM.hic": "2463600138,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa98ca64a-861a-4a8c-92e9-586af457b1fb%2F4DNFI1UEG1HD.hic": "22480709268,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F5809b32e-0aea-4cf5-a174-cf162d591a35%2F4DNFI9YAVTI1.hic": "3141182061,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3be17688-cbce-4ef9-9b94-8571c20a858e%2F4DNFI916JQ1Y.hic": "5153550498,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbad90d57-68ae-441f-84b6-3da0e4b3f1b7%2F4DNFI5R1ECZI.hic": "5256843748,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F78d90bcc-64c1-40c4-83bf-39f981f7d6d4%2F4DNFISUPDO3A.hic": "6141911776,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc16b5fd8-b0a0-4daa-915f-dea88d56b95d%2F4DNFIMV6MPGH.hic": "4646473940,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ffe25da0b-0e94-426f-9e5c-25ea7ac560dc%2F4DNFI111EI3K.hic": "6360540164,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6db70d70-1248-4ef1-b734-247d39ce3a5a%2F4DNFIVWXJQR1.hic": "3567402729,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3ad46cc4-505e-4a5d-9dee-e8d362f73a9c%2F4DNFI14FXOOU.hic": "3750091538,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2334c531-2d0b-46b3-98c6-c7ed35b9f20d%2F4DNFIS1SRPWR.hic": "1888598768,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F32278b04-8c3a-4111-9992-1a40a7139731%2F4DNFI8LDZDN9.hic": "1908203928,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa844f39f-3aa7-4e21-ba09-7683e1d91ab2%2F4DNFIH1NZ1M8.hic": "5303565251,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3e727bd0-bab5-484e-8fdc-54a4a666d2ab%2F4DNFIK9TW97H.hic": "4844444289,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F5a84c606-1f3d-47c5-9be3-8112144cd5dd%2F4DNFI7ST3KR1.hic": "4076139611,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd2a326a8-1f3f-4acc-8b9b-a449a2cdd7a0%2F4DNFIIMDXANO.hic": "5886279116,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fede4b21a-1f17-43d1-970f-ac874ef01bb0%2F4DNFIXF2GL4C.hic": "5623357020,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc4812c8a-74ac-4ee9-ac9e-abf5abd59318%2F4DNFI8I2WYXS.hic": "7575864220,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa9ad9939-6297-48c4-a6a7-5fad70ddeb2c%2F4DNFI7C5YXNX.hic": "4723998471,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1cb2e17f-58aa-4b2a-92f4-a6fb53654f1c%2F4DNFI1P2EP7L.hic": "3517327113,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4cb9794d-a3f7-4fa8-8e62-ff8a50f2fa5c%2F4DNFIF78U26G.hic": "4524490522,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd03c2ad3-74de-4ae3-8ebf-f305309b51bd%2F4DNFIH6ANSX9.hic": "4704398892,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F93ec4ac1-0654-4548-9130-332e48fa9919%2F4DNFI8QUAO51.hic": "6410633809,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb36abbf5-e7d4-45e6-b11d-3b4a5c918189%2F4DNFIWZYSI2D.hic": "4979199288,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9fd6c29e-7e41-44f7-bceb-d04f6c3ef430%2F4DNFI7PCOZ9I.hic": "4460433802,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7ef01bb0-d114-48b5-8836-d8e5f0aaaa08%2F4DNFIWUZLEWY.hic": "4312740986,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fcc0accc9-a89f-4b40-bac6-de754a7f77c9%2F4DNFILI6XOB5.hic": "6360373541,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F61f0e53d-a1da-4cc0-8f5f-052ae61ab161%2F4DNFI7EETNXL.hic": "1412854116,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fcc5ab0e6-f193-4bf9-91df-a7b9c4bbbc64%2F4DNFII7EADPT.hic": "1991748717,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fefd1d3b2-b437-40af-9b36-4e957762032a%2F4DNFIOCDW18J.hic": "2009478680,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6c2a1de5-accb-4a43-85a0-cbf57318fd45%2F4DNFI9RMTGX1.hic": "2294307288,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa9a8ab76-0fc3-48dc-a487-d8a5921477df%2F4DNFIQ7YSRDA.hic": "4617097967,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff7062f5e-9a08-4d87-a7fa-19f3208e6f80%2F4DNFIU7JYUQJ.hic": "1591654523,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9b71b9d0-257d-48a5-9116-d0dae0c83c68%2F4DNFIMG5T456.hic": "1536982846,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F14bf1e4b-6713-46e8-9c8f-fdfafa6ff3bd%2F4DNFIFZW7GEE.hic": "2489628475,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0995fd1b-023d-4ec2-a95d-64e108ec36ea%2F4DNFIIHISWB1.hic": "1526894394,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F74ad588d-edec-48a5-af16-f857ceacb0aa%2F4DNFIC6OQBN7.hic": "2654265474,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1c97b8c3-31b4-41ad-924e-bf2d2cb94b74%2F4DNFIXDTO63C.hic": "2013309944,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F15ba1e34-3e22-4b31-beb7-417683011858%2F4DNFI31H3OGV.hic": "6361414603,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa6d18f0f-df0d-4d47-8cdc-032f3c7ef221%2F4DNFIUPVQ5UH.hic": "6834216978,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6fe30df7-5f0d-4638-8ec0-483a8b86ecdf%2F4DNFIVEMIOK8.hic": "773338173,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1d57bbab-562a-4dea-99c4-3c3bb021adcc%2F4DNFINZ25U3U.hic": "6039407224,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0098fa29-fc36-4a23-a63f-cda9616a6f89%2F4DNFIRU3N6DB.hic": "6590434017,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F77ab3250-4dc6-4163-9db2-2b847efce7ce%2F4DNFIBXBN6UB.hic": "676470326,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4551206a-231b-402e-9570-88a10effb7bc%2F4DNFIA1PDKM5.hic": "446073443,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F785d3cfc-5dcf-4c01-97b1-f58a48cc9ee8%2F4DNFIGBHDKL7.hic": "924249200,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbb76eb3b-0267-4161-b8e4-ef9fb0089c4a%2F4DNFISBPIB52.hic": "1032187300,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F043852cb-2967-4d40-b03e-e8542760714a%2F4DNFIBA73Y4Z.hic": "5574486826,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1cc48d9b-9735-42a0-888f-7f105af8640c%2F4DNFII4ADLYY.hic": "840451609,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F56e64332-25ec-4390-b66a-266d710486e5%2F4DNFI2CZIRZ4.hic": "3831692686,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fae9ba47a-6bb9-48d7-94df-2e8be961eb09%2F4DNFIAYXT1F3.hic": "4954772594,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3089d432-f2ab-4c0f-97fb-adab86471125%2F4DNFIX15LQDY.hic": "857822311,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1b5fb4f9-9f63-4443-80ca-7c60ba12c4fe%2F4DNFIGX5LN49.hic": "5175938352,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F18026766-9e0e-4c15-9610-44c0e4dbf3e5%2F4DNFI9I6O19H.hic": "895448286,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8e6fa044-7936-462f-8d37-aa0275cae3ca%2F4DNFIB4OS99H.hic": "855810083,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F84911760-df97-44c1-8b36-97e388f9c62a%2F4DNFI8IYNWGT.hic": "777249574,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe15079bb-ccdc-4248-87af-d0173eb76011%2F4DNFIVB7692N.hic": "853178496,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7e5c1e85-d4a5-40d4-964d-198947907abd%2F4DNFI5QJW5YD.hic": "5028458350,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ffbaf75a9-0155-4125-bf86-d31d9c3b90d5%2F4DNFIET12997.hic": "6645726944,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4e576005-7475-4d39-8fcb-9d4561b970f0%2F4DNFIYQ224EZ.hic": "4757808094,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe5f70a70-7d02-41cf-b27c-cacaaf754fa6%2F4DNFI1FK394F.hic": "4459181136,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ffaa95c6c-db4a-47ba-8c3c-d6b7d9d70fce%2F4DNFIE7KYLR5.hic": "1190688479,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8e76dc76-e36f-4464-b65a-9897aae10b65%2F4DNFIEC5NWVF.hic": "3342948701,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe4ff6b8c-f46f-4d57-8dcc-7ff0500f922a%2F4DNFIZBG3V9V.hic": "2118010954,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd32e7242-9629-45f4-9d1a-0237a5b9e869%2F4DNFITDGTIUK.hic": "1681141685,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6cab57d3-8ca4-4d79-94b4-1c4395fc7d7e%2F4DNFIAKOG8CW.hic": "1630820744,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa49824e1-6a92-4ffc-b6e9-52f35549406a%2F4DNFIX8FUVN6.hic": "2540960336,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fd3741fb2-a4ea-454c-a6b2-da1c6cef5f92%2F4DNFIA7CEMNT.hic": "2100106035,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7af7afcd-e66e-460e-b6eb-be26eb594f69%2F4DNFI5YVPH8H.hic": "1910838419,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2261e6df-f141-44cc-b916-12779a98d6e8%2F4DNFIR2YF7S1.hic": "84456840,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3d5d54ea-1fe7-48d8-a1f2-c0bc078eb91c%2F4DNFIAQVXT8S.hic": "5876011800,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F462680da-3e24-49b7-b967-d195198a198d%2F4DNFI9V5G78Z.hic": "80293794,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7b3ce521-89b9-41d4-ace2-1cab7804bcc2%2F4DNFIPZCCTV6.hic": "4917429800,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6112b96e-78e9-4b99-b9d7-f15ae5c79466%2F4DNFIHTFIMGG.hic": "4363292659,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbdb01c16-6acb-4b44-bbef-c67300dfa26f%2F4DNFIXWT5U42.hic": "3771883844,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0e66d31c-fda3-42b8-ba69-3f1ca7377665%2F4DNFIY1TCVLX.hic": "4392772657,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3400c4d3-4446-4fb9-96fa-b499dd00861d%2F4DNFI5EAPQTI.hic": "3882696477,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F34f2a636-012a-4079-81b5-53b40f29e73f%2F4DNFICPL7RPE.hic": "75287233,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F232ae04a-86c9-48af-b5c6-4c33e080c76e%2F4DNFI5O2WB24.hic": "6118504627,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F502b0485-ce03-4f5e-aa06-e6e0011e14b7%2F4DNFIC4GB8UM.hic": "4060758124,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0290c7cb-0b4a-482d-9e5c-f141e21096e7%2F4DNFILL624WG.hic": "3895589825,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F56df20f8-4aea-4245-b875-23b2a618801e%2F4DNFICF2Z2TG.hic": "3667006741,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2b7cf7ec-37fd-40b7-83e1-f777284a97fc%2F4DNFI7T93SHL.hic": "3211370872,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F826b1d10-6d89-4b23-a1b5-dfcbcb8031bf%2F4DNFIP9EJSOM.hic": "3636533438,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F20194877-57b7-4abe-8116-3a6a5c548846%2F4DNFIHG8BK98.hic": "86813098,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff2fea329-d8fd-4975-9266-03e5556151bf%2F4DNFI6JKPJGO.hic": "79846427,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F293f248f-1962-4476-b3ae-eb6e2b778f70%2F4DNFIYYPB1UI.hic": "72601205,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe8695158-70a2-4442-a9c8-b655163dc694%2F4DNFI35AE3O3.hic": "829193620,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc51bc383-04e0-40cf-a72f-589524efd8f7%2F4DNFIXB4O92R.hic": "644232107,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9e0bb1ce-4e61-4791-9479-d0a20ee304fa%2F4DNFIFZM3CWZ.hic": "2647900849,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F28143491-848b-4a7b-90e0-1ae60fe61a2e%2F4DNFIXEHCB3R.hic": "2632375995,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc3e15131-f768-42aa-9959-75547704b3fb%2F4DNFI1HWXE8A.hic": "2340946204,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8a97b975-ee5a-4efc-a137-e393b3315260%2F4DNFIASIXTZM.hic": "2230584547,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9bc0a720-f0da-41a5-9289-34c2ef33f412%2F4DNFI6SETG5U.hic": "2909425254,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F27527ede-b4a7-44e1-b959-8ef427a75727%2F4DNFIM7ACSX2.hic": "2807145365,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F891bb2e9-1d08-4c15-b544-4125fec3e6d3%2F4DNFIATBSBS3.hic": "2551006282,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F94b4c17a-9038-4947-9f9a-d7031405c379%2F4DNFIKR8L3O5.hic": "2467302957,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fae0abe8b-41c6-455e-a466-96cda0b2583b%2F4DNFI6C7TKI7.hic": "2357341855,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8ea50b3a-b753-426f-bcde-d438bb046ca9%2F4DNFIAXX5DW8.hic": "2753362470,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4900dce0-61a6-447f-ac6c-ab305018b9c7%2F4DNFIBY3K18K.hic": "4559946251,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7da49fc1-76aa-4c98-98a0-5d3c2b038b48%2F4DNFIOYBTKML.hic": "3184716393,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F15555ede-38ed-41bc-8360-b7199ef78905%2F4DNFI1AM5YH5.hic": "2297316945,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F03bdcf69-274b-4032-9f97-c3801eaff73c%2F4DNFICF19STL.hic": "1147374802,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F38cdfddb-14e4-4975-aa40-32d8755c1c3f%2F4DNFIJOJW15R.hic": "3691597417,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F9590c872-52ad-4b3f-acb2-c53adedba82a%2F4DNFIM391G1I.hic": "1440905789,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe576ec24-0e4f-45eb-8a1a-a3224a4745b0%2F4DNFIDB95IFX.hic": "1297694240,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F52a81c80-1e92-4f6a-86d9-55e5c51f6a1a%2F4DNFIN5ROA5D.hic": "1518878546,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fef1c70d3-7183-4d68-89f3-84f40be4754a%2F4DNFI4WHVND7.hic": "905267421,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F07a2daaa-eceb-413f-9db8-a29804f60e47%2F4DNFIQEYK87U.hic": "1887807641,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fff393095-88d1-474d-8147-b170895f49e5%2F4DNFIIHXG8KW.hic": "990948025,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F14475927-663a-46ea-87e5-262b2b63d4cd%2F4DNFI7RGXYFY.hic": "1995218925,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe801f002-d414-42ff-a4d6-5fb41700f8ef%2F4DNFI3NN1U8T.hic": "1411001640,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff0d46aa0-ddf5-4cda-af89-52f94a5e2e71%2F4DNFIKCEWMIA.hic": "2428803282,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbf511667-f8a9-447f-939a-2f4a6be9e375%2F4DNFII78SGLC.hic": "1346970600,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fbb09b17a-4913-4b9e-a012-e9479fc61486%2F4DNFIQBPRZZD.hic": "6069682291,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fba6ff162-dd84-4b2c-ba2d-f07a0b2e4b3f%2F4DNFIRLG5UWL.hic": "2403291005,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2b047495-6f82-4500-b544-a1aa76997e28%2F4DNFIGEI2UJ5.hic": "1172022205,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F5608ab84-424a-4959-a8ff-d30e02b2f7f6%2F4DNFIR3Y85FX.hic": "2506972674,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F87b3ffac-31fd-453d-848c-701d7f6cfc59%2F4DNFIGXWABZ8.hic": "1822988545,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0d791b5a-804c-43a0-b1ff-29934f743de0%2F4DNFIAZ2BC1Z.hic": "2418357843,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F140f5862-a950-4d6d-b73c-0c25aa3c4625%2F4DNFINL956G3.hic": "2822207807,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe1286ed7-6935-45d6-a551-4e23b0f04ab0%2F4DNFIPJBFDS7.hic": "2549466943,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ffb268240-1da9-45e0-bdf3-322e8f83479f%2F4DNFI6OVJGRB.hic": "3977878338,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fae8036e4-c01f-4685-aad1-c9165ea20da9%2F4DNFIY9S5ZOF.hic": "4376491213,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe1f7e790-ec33-40bb-a487-da303818d806%2F4DNFI9S2EX2W.hic": "2018000408,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fb1005a45-2702-4e42-8da0-725cc3b7bd5e%2F4DNFISAAJ8ZA.hic": "1969820347,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Ff94abe7a-4241-4127-9e4e-ad5c9e097537%2F4DNFIEHRX3PO.hic": "1812900014,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc280624f-895f-4ae1-bf79-7dc3b9f3b7b0%2F4DNFID9DXKIA.hic": "725923849,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fcab608ee-4a04-4778-ac76-6f35f749cf77%2F4DNFIYZY8FRZ.hic": "1740798405,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Faf129845-3b27-4ef1-9d06-c1874d96678f%2F4DNFI7TWN65F.hic": "734312298,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fda348dd8-6e9d-42f6-a4f3-33ccee122b5d%2F4DNFIQY1WZG2.hic": "709100099,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F201f494f-44a5-47b4-84f1-a51589e20475%2F4DNFI1OAGRV3.hic": "687695123,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F54ba0756-0e28-4362-a6c8-305484c80352%2F4DNFINROFYOA.hic": "701869003,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3d1254c1-c8b5-450b-8829-1f410da9411f%2F4DNFII9NVNO3.hic": "9088194137,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1a1cc3cc-15a7-4ddf-9eea-b96400def819%2F4DNFIGU793GK.hic": "10224339103,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F91a5a87a-7e53-4170-9f98-8df880205806%2F4DNFIYU853WO.hic": "5831941450,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0695c0b4-8b0e-4a78-a4f9-be8e148eaade%2F4DNFISDI5IAS.hic": "6338256623,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2118aed0-8a60-43c7-b204-b326c5ec063e%2F4DNFINR2MFSM.hic": "6918790050,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3e956c4d-9520-4275-9d54-480add2831e9%2F4DNFI9FI1WN4.hic": "6077420687,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F7f902a51-7a0a-41d8-acfa-c29b3420faac%2F4DNFIM351CAA.hic": "7415860197,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8c304c3b-71f3-4302-8fe8-989d881d32ae%2F4DNFI176BGDG.hic": "7148579858,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F74dd94fb-47ea-47e7-94cf-a909e521dc9a%2F4DNFI76TVWF9.hic": "4335721284,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fce6512f3-2c5e-441a-9e20-d025629fddbe%2F4DNFIU8ET5TP.hic": "5420195714,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F4ea59850-2c40-4a92-a245-76a7893001f2%2F4DNFI6XB8HB4.hic": "5192691591,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F5d254a61-9894-4c88-a005-31c08155aa14%2F4DNFI6QRXTH3.hic": "3969529135,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F0fe92b41-3a75-4665-86cf-b39f4cf94aa6%2F4DNFIPVMIIRE.hic": "8681423658,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8538b53a-eb26-40cb-9ec3-a61028f43e2b%2F4DNFIPTFHCFP.hic": "8285769882,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2232012c-4627-439b-9ce7-ad10a2bc3334%2F4DNFIESB8H1S.hic": "8654573338,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F07c7a44f-cb01-4901-b591-051913e91353%2F4DNFIK3NAVTO.hic": "8415503170,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fcabde890-f7cd-4916-a749-902673f6a716%2F4DNFIOTFSJFL.hic": "3455979876,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F1878f6d9-cb86-4be3-baa6-9300d32a6b46%2F4DNFINCBG8I4.hic": "3356575145,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F49813dc5-38c1-41d3-ad6a-b27e11f925fc%2F4DNFISZ88WZA.hic": "7739704623,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F3fd4b6e2-2002-4897-91c1-ebea81ac7f56%2F4DNFI42A55E5.hic": "6954360693,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F931eb1f3-c388-40c7-89e0-e995851650da%2F4DNFIJQO4MRF.hic": "16726884852,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fe6ecfcb8-9ca6-44c3-9e27-b4e475a382e4%2F4DNFIZX79UT2.hic": "13334742903,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fc62048ee-843f-40ee-81ad-f78d20266f7d%2F4DNFICZG2DYC.hic": "16057986680,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F6694b1fb-7fdd-4c1d-9fc6-8dfc8f6b5b58%2F4DNFIK6TSF51.hic": "13887898680,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F2ce3bdb5-84cb-4d31-abfa-e92a39889972%2F4DNFI1GY4LKB.hic": "15320828542,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F10758c5f-f49a-4da5-9e4e-25907afe27e2%2F4DNFI86G6QZJ.hic": "13911815900,25900",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F15e818b8-346b-4f90-a321-b7dd72abb7dc%2F4DNFINFK9D35.hic": "17494323050,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F5501e4db-e6a4-41da-85d4-9114ca5ba28e%2F4DNFIBFXR38K.hic": "17172205445,22663",
    "4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F378a1641-5894-475e-8614-bd016e8529d5%2F4DNFIMBPX8Q1.hic": "17880333903,22663"
  };

  const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
  const Short_MIN_VALUE = -32768;
  const DOUBLE = 8;
  const FLOAT = 4;
  const INT = 4;
  const GoogleRateLimiter = new RateLimiter(100);
  class HicFile {
    constructor(args) {
      if (args.alert) {
        this.alert = args.alert;
      }
      this.config = args;
      this.loadFragData = args.loadFragData;
      this.fragmentSitesCache = {};
      this.normVectorCache = new LRU(10);
      this.normalizationTypes = ['NONE'];
      this.matrixCache = new LRU(10);
      this.blockCache = new BlockCache();
      this.normVectorIndexPosition = -1;
      this.normVectorIndexSize = -1;

      // args may specify an io.File object, a local path (Node only), or a url
      if (args.file) {
        this.file = args.file;
      } else if (args.blob) {
        this.file = new BrowserLocalFile(args.blob);
      } else if (args.url || args.path && !isNode) {
        this.url = args.url || this.path;
        this.remote = true;

        // Google drive must be rate limited.  Perhaps all remote files should be rate limited?
        const remoteFile = new RemoteFile(args);
        if (isGoogleDrive(this.url)) {
          this.file = new ThrottledFile(remoteFile, GoogleRateLimiter);
        } else {
          this.file = remoteFile;
        }
      } else if (args.path) {
        // path argument, assumed local file
        throw Error(`path property is deprecated, use NodeLocalFile`);
      } else {
        throw Error("Arguments must include file, blob, url, or path");
      }
    }
    async init() {
      if (this.initialized) {
        return;
      } else {
        await this.readHeaderAndFooter();
        // Footer is read with header
        //await this.readFooter()
        this.initialized = true;
      }
    }
    async getVersion() {
      if (this.version === undefined) {
        const data = await this.file.read(0, 128);
        if (!data) {
          return undefined;
        }
        const binaryParser = new BinaryParser(new DataView(data));
        this.magic = binaryParser.getString();
        this.version = binaryParser.getInt();
        return this.version;
      } else {
        return this.version;
      }
    }
    async getMetaData() {
      await this.init();
      return this.meta;
    }
    async readHeaderAndFooter() {
      // Read initial fields magic, version, and footer position
      let data = await this.file.read(0, 16);
      if (!data || data.byteLength === 0) {
        throw Error("File content is empty");
      }
      let binaryParser = new BinaryParser(new DataView(data));
      this.magic = binaryParser.getString();
      this.version = binaryParser.getInt();
      if (this.version < 5) {
        throw Error("Unsupported hic version: " + this.version);
      }
      this.footerPosition = binaryParser.getLong();

      // Read footer and determine file position for body section (i.e. end of header)

      await this.readFooter();
      const bodyPostion = Object.values(this.masterIndex).reduce((min, currentValue) => {
        return Math.min(min, currentValue.start);
      }, Number.MAX_VALUE);
      const remainingSize = bodyPostion - 16;
      data = await this.file.read(16, remainingSize);
      binaryParser = new BinaryParser(new DataView(data));
      this.genomeId = binaryParser.getString();
      if (this.version >= 9) {
        this.normVectorIndexPosition = binaryParser.getLong();
        this.normVectorIndexSize = binaryParser.getLong();
      }
      this.attributes = {};
      let nAttributes = binaryParser.getInt();
      while (nAttributes-- > 0) {
        this.attributes[binaryParser.getString()] = binaryParser.getString();
      }
      this.chromosomes = [];
      this.chromosomeIndexMap = {};
      let nChrs = binaryParser.getInt();
      let i = 0;
      while (nChrs-- > 0) {
        const chr = {
          index: i,
          name: binaryParser.getString(),
          size: this.version < 9 ? binaryParser.getInt() : binaryParser.getLong()
        };
        if (chr.name.toLowerCase() === "all") {
          this.wholeGenomeChromosome = chr;
          this.wholeGenomeResolution = Math.round(chr.size * (1000 / 500)); // Hardcoded in juicer
        }
        this.chromosomes.push(chr);
        this.chromosomeIndexMap[chr.name] = chr.index;
        i++;
      }
      this.bpResolutions = [];
      let nBpResolutions = binaryParser.getInt();
      while (nBpResolutions-- > 0) {
        this.bpResolutions.push(binaryParser.getInt());
      }
      if (this.loadFragData) {
        this.fragResolutions = [];
        let nFragResolutions = binaryParser.getInt();
        if (nFragResolutions > 0) {
          while (nFragResolutions-- > 0) {
            this.fragResolutions.push(binaryParser.getInt());
          }

          // this.sites = [];
          // for(let i=0; i<this.chromosomes.length - 1; i++) {
          //     const chrSites = [];
          //     this.sites.push(chrSites);
          //     let nSites = binaryParser.getInt();
          //     console.log(nSites);
          //     for(let s=0; s<nSites; s++) {
          //         chrSites.push(binaryParser.getInt());
          //     }
          // }
        }
      }

      // Build lookup table for well-known chr aliases
      this.chrAliasTable = {};
      for (let chrName of Object.keys(this.chromosomeIndexMap)) {
        if (chrName.startsWith("chr")) {
          this.chrAliasTable[chrName.substr(3)] = chrName;
        } else if (chrName === "MT") {
          this.chrAliasTable["chrM"] = chrName;
        } else {
          this.chrAliasTable["chr" + chrName] = chrName;
        }
      }

      // Meta data for the API
      this.meta = {
        "version": this.version,
        "genome": this.genomeId,
        "chromosomes": this.chromosomes,
        "resolutions": this.bpResolutions
      };
    }
    async readFooter() {
      const skip = this.version < 9 ? 8 : 12;
      let data = await this.file.read(this.footerPosition, skip);
      if (!data) {
        return null;
      }
      let binaryParser = new BinaryParser(new DataView(data));
      const nBytes = this.version < 9 ? binaryParser.getInt() : binaryParser.getLong(); // Total size, master index + expected values
      let nEntries = binaryParser.getInt();

      // Estimate the size of the master index. String length of key is unknown, be conservative (100 bytes)

      const miSize = nEntries * (100 + 64 + 32);
      data = await this.file.read(this.footerPosition + skip, Math.min(miSize, nBytes));
      binaryParser = new BinaryParser(new DataView(data));
      this.masterIndex = {};
      while (nEntries-- > 0) {
        const key = binaryParser.getString();
        const pos = binaryParser.getLong();
        const size = binaryParser.getInt();
        this.masterIndex[key] = {
          start: pos,
          size: size
        };
      }
      this.expectedValueVectors = {};

      // Expected values
      // const nExpValues = binaryParser.readInt();
      // while (nExpValues-- > 0) {
      //     type = "NONE";
      //     unit = binaryParser.getString();
      //     binSize = binaryParser.getInt();
      //     nValues = binaryParser.getInt();
      //     values = [];
      //     while (nValues-- > 0) {
      //         values.push(binaryParser.getDouble());
      //     }
      //
      //     nChrScaleFactors = binaryParser.getInt();
      //     normFactors = {};
      //     while (nChrScaleFactors-- > 0) {
      //         normFactors[binaryParser.getInt()] = binaryParser.getDouble();
      //     }
      //
      //     // key = unit + "_" + binSize + "_" + type;
      //     //  NOT USED YET SO DON'T STORE
      //     //  dataset.expectedValueVectors[key] =
      //     //      new ExpectedValueFunction(type, unit, binSize, values, normFactors);
      // }

      // normalized expected values start after expected value.  Add 4 for
      if (this.version > 5) {
        const skip = this.version < 9 ? 4 : 8;
        this.normExpectedValueVectorsPosition = this.footerPosition + skip + nBytes;
      }
      return this;
    }
    async printIndexStats() {
      let totalSize = 0;
      let maxSize = 0;
      await await this.init();
      for (let key of Object.keys(this.masterIndex)) {
        const entry = this.masterIndex[key];
        //  console.log(`${key}\t${entry.start}\t${entry.size}`)
        totalSize += entry.size;
        if (entry.size > maxSize) {
          maxSize = entry.size;
        }
      }
      // console.log(`Total size  = ${totalSize}`);
    }
    async getMatrix(chrIdx1, chrIdx2) {
      const key = Matrix.getKey(chrIdx1, chrIdx2);
      if (this.matrixCache.has(key)) {
        return this.matrixCache.get(key);
      } else {
        const matrix = await this.readMatrix(chrIdx1, chrIdx2);
        this.matrixCache.set(key, matrix);
        return matrix;
      }
    }
    async readMatrix(chrIdx1, chrIdx2) {
      await this.init();
      if (chrIdx1 > chrIdx2) {
        const tmp = chrIdx1;
        chrIdx1 = chrIdx2;
        chrIdx2 = tmp;
      }
      const key = Matrix.getKey(chrIdx1, chrIdx2);
      const idx = this.masterIndex[key];
      if (!idx) {
        return undefined;
      }
      const data = await this.file.read(idx.start, idx.size);
      if (!data) {
        return undefined;
      }
      return Matrix.parseMatrix(data, this.chromosomes);
    }
    async getContactRecords(normalization, region1, region2, units, binsize, allRecords = false) {
      await this.init();
      const idx1 = this.chromosomeIndexMap[this.getFileChrName(region1.chr)];
      const idx2 = this.chromosomeIndexMap[this.getFileChrName(region2.chr)];
      const transpose = idx1 > idx2 || idx1 === idx2 && region1.start >= region2.end;
      if (transpose) {
        const tmp = region1;
        region1 = region2;
        region2 = tmp;
      }
      const blocks = await this.getBlocks(region1, region2, units, binsize);
      if (!blocks || blocks.length === 0) {
        return [];
      }
      const contactRecords = [];
      const x1 = region1.start / binsize;
      const x2 = region1.end / binsize;
      const y1 = region2.start / binsize;
      const y2 = region2.end / binsize;
      const nvX1 = Math.floor(x1);
      const nvX2 = Math.ceil(x2);
      const nvY1 = Math.floor(y1);
      const nvY2 = Math.ceil(y2);
      for (let block of blocks) {
        if (block) {
          // An undefined block is most likely caused by a base pair range outside the chromosome
          let normVector1;
          let normVector2;
          let isNorm = normalization && normalization !== "NONE";
          const chr1 = this.getFileChrName(region1.chr);
          const chr2 = this.getFileChrName(region2.chr);
          if (isNorm) {
            const nv1 = await this.getNormalizationVector(normalization, chr1, units, binsize);
            const nv2 = chr1 === chr2 ? nv1 : await this.getNormalizationVector(normalization, chr2, units, binsize);
            if (nv1 && nv2) {
              normVector1 = await nv1.getValues(nvX1, nvX2);
              normVector2 = await nv2.getValues(nvY1, nvY2);
            } else {
              isNorm = false;
              // Raise message and switch pulldown
            }
          }
          for (let rec of block.records) {
            if (allRecords || rec.bin1 >= x1 && rec.bin1 < x2 && rec.bin2 >= y1 && rec.bin2 < y2) {
              if (isNorm) {
                const x = rec.bin1;
                const y = rec.bin2;
                const nvnv = normVector1[x - nvX1] * normVector2[y - nvY1];
                if (nvnv !== 0 && !isNaN(nvnv)) {
                  const counts = rec.counts / nvnv;
                  contactRecords.push(new ContactRecord(x, y, counts));
                }
              } else {
                contactRecords.push(rec);
              }
            }
          }
        }
      }
      return contactRecords;
    }
    async getBlocks(region1, region2, unit, binSize) {
      const blockKey = (blockNumber, zd) => `${zd.getKey()}_${blockNumber}`;
      await this.init();
      const chr1 = this.getFileChrName(region1.chr);
      const chr2 = this.getFileChrName(region2.chr);
      const idx1 = this.chromosomeIndexMap[chr1];
      const idx2 = this.chromosomeIndexMap[chr2];
      if (idx1 === undefined) {
        return [];
      }
      if (idx2 === undefined) {
        return [];
      }
      const matrix = await this.getMatrix(idx1, idx2);
      if (!matrix) {
        return [];
      }
      const zd = matrix.getZoomData(binSize, unit);
      if (!zd) {
        let msg = `No data available for resolution: ${binSize}  for map ${region1.chr}-${region2.chr}`;
        throw new Error(msg);
      }
      const blockNumbers = zd.getBlockNumbers(region1, region2, this.version);
      const blocks = [];
      const blockNumbersToQuery = [];
      for (let num of blockNumbers) {
        const key = blockKey(num, zd);
        if (this.blockCache.has(binSize, key)) {
          blocks.push(this.blockCache.get(binSize, key));
        } else {
          blockNumbersToQuery.push(num);
        }
      }
      const promises = blockNumbersToQuery.map(blockNumber => this.readBlock(blockNumber, zd));
      const newBlocks = await Promise.all(promises);
      for (let block of newBlocks) {
        if (block) {
          this.blockCache.set(binSize, blockKey(block.blockNumber, zd), block);
        }
      }
      return blocks.concat(newBlocks);
    }
    async readBlock(blockNumber, zd) {
      const idx = await zd.blockIndex.getBlockIndexEntry(blockNumber);
      if (!idx) {
        return undefined;
      } else {
        let data = await this.file.read(idx.filePosition, idx.size);
        if (!data) {
          return undefined;
        }
        const inflate = new Zlib.Inflate(new Uint8Array(data));
        const plain = inflate.decompress();
        //var plain = zlib.inflateSync(Buffer.from(data))   //.decompress();
        data = plain.buffer;
        const parser = new BinaryParser(new DataView(data));
        const nRecords = parser.getInt();
        const records = [];
        if (this.version < 7) {
          for (let i = 0; i < nRecords; i++) {
            const binX = parser.getInt();
            const binY = parser.getInt();
            const counts = parser.getFloat();
            records.push(new ContactRecord(binX, binY, counts));
          }
        } else {
          const binXOffset = parser.getInt();
          const binYOffset = parser.getInt();
          const useFloatContact = parser.getByte() === 1;
          const useIntXPos = this.version < 9 ? false : parser.getByte() == 1;
          const useIntYPos = this.version < 9 ? false : parser.getByte() == 1;
          const type = parser.getByte();
          if (type === 1) {
            // List-of-rows representation
            const rowCount = useIntYPos ? parser.getInt() : parser.getShort();
            for (let i = 0; i < rowCount; i++) {
              const dy = useIntYPos ? parser.getInt() : parser.getShort();
              const binY = binYOffset + dy;
              const colCount = useIntXPos ? parser.getInt() : parser.getShort();
              for (let j = 0; j < colCount; j++) {
                const dx = useIntXPos ? parser.getInt() : parser.getShort();
                const binX = binXOffset + dx;
                const counts = useFloatContact ? parser.getFloat() : parser.getShort();
                records.push(new ContactRecord(binX, binY, counts));
              }
            }
          } else if (type == 2) {
            const nPts = parser.getInt();
            const w = parser.getShort();
            for (let i = 0; i < nPts; i++) {
              //int idx = (p.y - binOffset2) * w + (p.x - binOffset1);
              const row = Math.floor(i / w);
              const col = i - row * w;
              const bin1 = binXOffset + col;
              const bin2 = binYOffset + row;
              if (useFloatContact) {
                const counts = parser.getFloat();
                if (!isNaN(counts)) {
                  records.push(new ContactRecord(bin1, bin2, counts));
                }
              } else {
                const counts = parser.getShort();
                if (counts != Short_MIN_VALUE) {
                  records.push(new ContactRecord(bin1, bin2, counts));
                }
              }
            }
          } else {
            throw new Error("Unknown block type: " + type);
          }
        }
        return new Block(blockNumber, zd, records, idx);
      }
    }
    async hasNormalizationVector(type, chr, unit, binSize) {
      await this.init();
      let chrIdx;
      if (Number.isInteger(chr)) {
        chrIdx = chr;
      } else {
        const canonicalName = this.getFileChrName(chr);
        chrIdx = this.chromosomeIndexMap[canonicalName];
      }
      const key = getNormalizationVectorKey(type, chrIdx, unit.toString(), binSize);
      const normVectorIndex = await this.getNormVectorIndex();
      return normVectorIndex && normVectorIndex[key];
    }
    async isNormalizationValueAvailableAtResolution(normalization, chr, unit, resolution) {
      let chromosomeIndex;
      if (Number.isInteger(chr)) {
        chromosomeIndex = chr;
      } else {
        const canonicalName = this.getFileChrName(chr);
        chromosomeIndex = this.chromosomeIndexMap[canonicalName];
      }
      const normVectorIndex = await this.getNormVectorIndex();
      const key = getNormalizationVectorKey(normalization, chromosomeIndex, unit.toString(), resolution);
      const index = normVectorIndex[key];
      return undefined !== index;
    }
    async getNormalizationVector(type, chr, unit, binSize) {
      await this.init();
      let chrIdx;
      if (Number.isInteger(chr)) {
        chrIdx = chr;
      } else {
        const canonicalName = this.getFileChrName(chr);
        chrIdx = this.chromosomeIndexMap[canonicalName];
      }
      const key = getNormalizationVectorKey(type, chrIdx, unit.toString(), binSize);
      if (this.normVectorCache.has(key)) {
        return this.normVectorCache.get(key);
      }
      const normVectorIndex = await this.getNormVectorIndex();
      if (!normVectorIndex) {
        return undefined;
      }
      const status = await this.isNormalizationValueAvailableAtResolution(type, chr, unit, binSize);
      if (false === status) {
        const str = `Normalization option ${type} not available at resolution ${binSize}. Will use NONE.`;
        if (this.alert) {
          this.alert(str);
        }
        return undefined;
      }
      const idx = normVectorIndex[key];
      const data = await this.file.read(idx.filePosition, 8);
      if (!data) {
        return undefined;
      }
      const parser = new BinaryParser(new DataView(data));
      const nValues = this.version < 9 ? parser.getInt() : parser.getLong();
      const dataType = this.version < 9 ? DOUBLE : FLOAT;
      const filePosition = this.version < 9 ? idx.filePosition + 4 : idx.filePosition + 8;
      const nv = new NormalizationVector(this.file, filePosition, nValues, dataType);
      this.normVectorCache.set(key, nv);
      return nv;
    }
    async getNormVectorIndex() {
      if (this.version < 6) {
        return undefined;
      }
      if (this.normVectorIndex) {
        return this.normVectorIndex;
      }

      // If we know the position of the norm vector index, read it directly.  This is the case for hic v9 files
      if (this.normVectorIndexPosition > 0 && this.normVectorIndexSize > 0) {
        const range = {
          start: this.normVectorIndexPosition,
          size: this.normVectorIndexSize
        };
        return this.readNormVectorIndex(range);
      }

      // See if nvi (normVector position and size) is provided in config or can be inferred from url
      if (!this.config.nvi && this.remote && this.url) {
        const url = new URL(this.url);
        const key = encodeURIComponent(url.hostname + url.pathname);
        if (nvi.hasOwnProperty(key)) {
          this.config.nvi = nvi[key];
        }
      }
      if (this.config.nvi) {
        const nviArray = decodeURIComponent(this.config.nvi).split(",");
        const range = {
          start: parseInt(nviArray[0]),
          size: parseInt(nviArray[1])
        };
        return this.readNormVectorIndex(range);
      } else {
        try {
          await this.readNormExpectedValuesAndNormVectorIndex();
          return this.normVectorIndex;
        } catch (e) {
          if (e.code === "416" || e.code === 416) {
            // This is expected if file does not contain norm vectors
            this.normExpectedValueVectorsPosition = undefined;
          } else {
            console.error(e);
          }
        }
      }
    }
    async getNormalizationOptions() {
      // Normalization options are computed as a side effect of loading the index.  A bit
      // ugly but alternatives are worse.
      await this.getNormVectorIndex();
      return this.normalizationTypes;
    }

    /**
     * Return a promise to load the normalization vector index
     *
     * @param dataset
     * @param range  -- file range {position, size}
     * @returns Promise for the normalization vector index
     */
    async readNormVectorIndex(range) {
      await this.init();
      this.normalizationVectorIndexRange = range;
      const data = await this.file.read(range.start, range.size);
      const binaryParser = new BinaryParser(new DataView(data));
      this.normVectorIndex = {};
      let nEntries = binaryParser.getInt();
      while (nEntries-- > 0) {
        this.parseNormVectorEntry(binaryParser);
      }
      return this.normVectorIndex;
    }

    /**
     * This function is used when the position of the norm vector index is unknown.  We must read through the expected
     * values to find the index
     *
     * @param dataset
     * @returns {Promise}
     */
    async readNormExpectedValuesAndNormVectorIndex() {
      await this.init();
      if (this.normExpectedValueVectorsPosition === undefined) {
        return;
      }
      const nviStart = await this.skipExpectedValues(this.normExpectedValueVectorsPosition);
      let byteCount = INT;
      let data = await this.file.read(nviStart, INT);
      if (data.byteLength === 0) {
        // This is possible if there are no norm vectors.  Its a legal v8 file, though uncommon
        return;
      }
      const binaryParser = new BinaryParser(new DataView(data));
      const nEntries = binaryParser.getInt();
      const sizeEstimate = nEntries * 30;
      const range = {
        start: nviStart + byteCount,
        size: sizeEstimate
      };
      data = await this.file.read(range.start, range.size);
      this.normalizedExpectedValueVectors = {};
      this.normVectorIndex = {};

      // Recursively process entries
      await processEntries.call(this, nEntries, data);
      this.config.nvi = nviStart.toString() + "," + byteCount;
      async function processEntries(nEntries, data) {
        const binaryParser = new BinaryParser(new DataView(data));
        while (nEntries-- > 0) {
          if (binaryParser.available() < 100) {
            nEntries++; // Reset counter as entry is not processed

            byteCount += binaryParser.position;
            const sizeEstimate = Math.max(1000, nEntries * 30);
            const range = {
              start: nviStart + byteCount,
              size: sizeEstimate
            };
            const data = await this.file.read(range.start, range.size);
            return processEntries.call(this, nEntries, data);
          }
          this.parseNormVectorEntry(binaryParser);
        }
        byteCount += binaryParser.position;
      }
    }

    /**
     * This function is used when the position of the norm vector index is unknown.  We must read through the
     * normalized expected values to find the index
     *
     * @param dataset
     * @returns {Promise}
     */
    async skipExpectedValues(start) {
      const version = this.version;
      const file = new BufferedFile({
        file: this.file,
        size: 256000
      });
      const range = {
        start: start,
        size: INT
      };
      const data = await file.read(range.start, range.size);
      const binaryParser = new BinaryParser(new DataView(data));
      const nEntries = binaryParser.getInt(); // Total # of expected value chunks
      if (nEntries === 0) {
        return start + INT;
      } else {
        return parseNext(start + INT, nEntries);
      } // Skip 4 bytes for int

      async function parseNext(start, nEntries) {
        let range = {
          start: start,
          size: 500
        };
        let chunkSize = 0;
        let p0 = start;
        let data = await file.read(range.start, range.size);
        let binaryParser = new BinaryParser(new DataView(data));
        binaryParser.getString(); // type
        binaryParser.getString(); // unit
        binaryParser.getInt(); // binSize
        const nValues = version < 9 ? binaryParser.getInt() : binaryParser.getLong();
        chunkSize += binaryParser.position + nValues * (version < 9 ? DOUBLE : FLOAT);
        range = {
          start: start + chunkSize,
          size: INT
        };
        data = await file.read(range.start, range.size);
        binaryParser = new BinaryParser(new DataView(data));
        const nChrScaleFactors = binaryParser.getInt();
        chunkSize += INT + nChrScaleFactors * (INT + (version < 9 ? DOUBLE : FLOAT));
        nEntries--;
        if (nEntries === 0) {
          return p0 + chunkSize;
        } else {
          return parseNext(p0 + chunkSize, nEntries);
        }
      }
    }
    getZoomIndexForBinSize(binSize, unit) {
      unit = unit || "BP";
      let resolutionArray;
      if (unit === "BP") {
        resolutionArray = this.bpResolutions;
      } else if (unit === "FRAG") {
        resolutionArray = this.fragResolutions;
      } else {
        throw new Error("Invalid unit: " + unit);
      }
      for (let i = 0; i < resolutionArray.length; i++) {
        if (resolutionArray[i] === binSize) return i;
      }
      return -1;
    }
    parseNormVectorEntry(binaryParser) {
      const type = binaryParser.getString(); //15
      const chrIdx = binaryParser.getInt(); //4
      const unit = binaryParser.getString(); //3
      const binSize = binaryParser.getInt(); //4
      const filePosition = binaryParser.getLong(); //8
      const sizeInBytes = this.version < 9 ? binaryParser.getInt() : binaryParser.getLong(); //4:8
      const key = type + "_" + chrIdx + "_" + unit + "_" + binSize;
      // TODO -- why does this not work?  NormalizationVector.getNormalizationVectorKey(type, chrIdx, unit, binSize);

      if (!this.normalizationTypes.includes(type)) {
        this.normalizationTypes.push(type);
      }
      this.normVectorIndex[key] = {
        filePosition: filePosition,
        size: sizeInBytes
      };
    }
    getFileChrName(chrAlias) {
      if (this.chrAliasTable.hasOwnProperty(chrAlias)) {
        return this.chrAliasTable[chrAlias];
      } else {
        return chrAlias;
      }
    }

    // NOTE sties are not currently used
    // async getSites(chrName) {
    //     let sites = this.fragmentSitesCache[chrName];
    //     if (!sites) {
    //         if (this.fragmentSitesIndex) {
    //             const entry = self.fragmentSitesIndex[chrName];
    //             if (entry && entry.nSites > 0) {
    //                 sites = await this.readSites(entry.position, entry.nSites)
    //                 this.fragmentSitesCache[chrName] = sites;
    //             }
    //         }
    //     }
    //     return sites;
    // }
    //
  }
  function getNormalizationVectorKey(type, chrIdx, unit, resolution) {
    return type + "_" + chrIdx + "_" + unit + "_" + resolution;
  }
  function isGoogleDrive(url) {
    return url.indexOf("drive.google.com") >= 0 || url.indexOf("www.googleapis.com/drive") > 0;
  }
  class Block {
    constructor(blockNumber, zoomData, records, idx) {
      this.blockNumber = blockNumber;
      this.zoomData = zoomData;
      this.records = records;
      this.idx = idx;
    }
  }
  class BlockCache {
    constructor() {
      this.resolution = undefined;
      this.map = new LRU(6);
    }
    set(resolution, key, value) {
      if (this.resolution !== resolution) {
        this.map.clear();
      }
      this.resolution = resolution;
      this.map.set(key, value);
    }
    get(resolution, key) {
      return this.resolution === resolution ? this.map.get(key) : undefined;
    }
    has(resolution, key) {
      return this.resolution === resolution && this.map.has(key);
    }
  }

  class Straw {
    constructor(config) {
      this.config = config;
      if (config.liveContactMap) {
        this.hicFile = config.liveContactMap;
      } else {
        this.hicFile = new HicFile(config);
      }
    }
    async getMetaData() {
      return await this.hicFile.getMetaData();
    }

    //straw <NONE/VC/VC_SQRT/KR> <ile> <chr1>[:x1:x2] <chr2>[:y1:y2] <BP/FRAG> <binsize>
    async getContactRecords(normalization, region1, region2, units, binsize) {
      return this.hicFile.getContactRecords(normalization, region1, region2, units, binsize);
    }
    async getNormalizationOptions() {
      return this.hicFile.getNormalizationOptions();
    }
    async getNVI() {
      await this.hicFile.getNormVectorIndex();
      return this.hicFile.config.nvi;
    }
    async printIndexStats() {
      await this.hicFile.printIndexStats();
    }
    getFileChrName(chrAlias) {
      if (this.hicFile.chrAliasTable.hasOwnProperty(chrAlias)) {
        return this.hicFile.chrAliasTable[chrAlias];
      } else {
        return chrAlias;
      }
    }
  }

  /**
   * Parser for Spacewalk Text (SWT) format files — ball & stick style.
   *
   * SWT format:
   *   Line 1: ##format=sw1 name=<sample> genome=<genomeId>
   *   Line 2: chromosome  start  end  x  y  z   (column headers)
   *   Remaining: blocks of trace data, each beginning with "trace <N>"
   *              followed by whitespace-delimited data lines:
   *              chromosome  startBP  endBP  x  y  z
   */

  /**
   * Parse SWT text format into structured trace/vertex data.
   *
   * @param {string} swtText - Raw SWT file content
   * @returns {{
   *   sample: string,
   *   genomeId: string,
   *   chr: string,
   *   genomicStart: number,
   *   genomicEnd: number,
   *   binSize: number,
   *   traceCount: number,
   *   traceLength: number,
   *   traces: Array<Array<{x: number, y: number, z: number, isMissingData?: boolean}>>
   * }}
   */
  function parseSWT(swtText) {
    const lines = swtText.split(/\r?\n/);

    // Parse header line: ##format=sw1 name=IMR90 genome=hg38
    const headerLine = lines[0];
    if (!headerLine || !headerLine.startsWith('##format=sw1')) {
      throw new Error('Invalid SWT format: expected ##format=sw1 header');
    }
    const headerTokens = headerLine.split(/\s+/);
    let sample = undefined;
    let genomeId = undefined;
    for (const token of headerTokens) {
      if (token.startsWith('name=')) {
        sample = token.substring(5);
      } else if (token.startsWith('genome=')) {
        genomeId = token.substring(7);
      }
    }
    if (!sample) throw new Error('SWT header missing name property');
    if (!genomeId) throw new Error('SWT header missing genome property');

    // Skip line 2 (column headers)
    // Parse remaining lines into traces
    const traces = [];
    let currentTrace = null;
    let chr = undefined;
    let genomicStart = undefined;
    let genomicEnd = undefined;
    let binSize = undefined;
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      const tokens = line.split(/\s+/);
      if (tokens[0] === 'trace') {
        // Start a new trace
        currentTrace = [];
        traces.push(currentTrace);
        continue;
      }
      if (currentTrace === null) {
        // Data line before any trace delimiter — skip or error
        continue;
      }

      // Data line: chromosome  startBP  endBP  x  y  z
      if (tokens.length < 6) continue;
      const lineChr = tokens[0];
      const startBP = parseInt(tokens[1], 10);
      const endBP = parseInt(tokens[2], 10);
      const x = parseFloat(tokens[3]);
      const y = parseFloat(tokens[4]);
      const z = parseFloat(tokens[5]);

      // Set chromosome from first data line
      if (chr === undefined) {
        chr = lineChr;
      }

      // Track genomic extent
      if (genomicStart === undefined || startBP < genomicStart) {
        genomicStart = startBP;
      }
      if (genomicEnd === undefined || endBP > genomicEnd) {
        genomicEnd = endBP;
      }

      // Derive bin size from first data line
      if (binSize === undefined) {
        binSize = endBP - startBP;
      }

      // Create vertex
      const isMissingData = isNaN(x) || isNaN(y) || isNaN(z);
      const vertex = {
        x,
        y,
        z
      };
      if (isMissingData) {
        vertex.isMissingData = true;
      }
      currentTrace.push(vertex);
    }
    if (traces.length === 0) {
      throw new Error('SWT file contains no traces');
    }
    const traceLength = traces[0].length;
    return {
      sample,
      genomeId,
      chr,
      genomicStart,
      genomicEnd,
      binSize,
      traceCount: traces.length,
      traceLength,
      traces
    };
  }

  /**
   * Pairwise Euclidean distance computation for 3D vertex data.
   *
   * Produces NxN distance matrices (Float32Array, row-major) from arrays of
   * {x, y, z} vertices. Supports single-trace and ensemble-averaged computation.
   */

  const DISTANCE_UNDEFINED = -1;

  /**
   * Compute ensemble-averaged distance matrix across multiple traces.
   *
   * For each cell (i, j), computes the mean Euclidean distance across all traces
   * that have valid (non-missing) data at both positions i and j.
   *
   * @param {Array<Array<{x: number, y: number, z: number, isMissingData?: boolean}>>} traces
   * @param {number} traceLength - N (number of bins, same for all traces)
   * @returns {{ distances: Float32Array, maxDistance: number }}
   */
  function computeEnsembleDistances(traces, traceLength) {
    const N = traceLength;
    const distanceSum = new Float64Array(N * N);
    const countMatrix = new Uint32Array(N * N);
    for (const vertices of traces) {
      for (let i = 0; i < N; i++) {
        const vi = vertices[i];
        if (vi.isMissingData) continue;
        for (let j = i + 1; j < N; j++) {
          const vj = vertices[j];
          if (vj.isMissingData) continue;
          const dx = vi.x - vj.x;
          const dy = vi.y - vj.y;
          const dz = vi.z - vj.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const ij = i * N + j;
          const ji = j * N + i;
          distanceSum[ij] += dist;
          distanceSum[ji] += dist;
          countMatrix[ij] += 1;
          countMatrix[ji] += 1;
        }
      }
    }

    // Compute averages
    const distances = new Float32Array(N * N);
    distances.fill(DISTANCE_UNDEFINED);
    let maxDistance = 0;
    for (let i = 0; i < N; i++) {
      distances[i * N + i] = 0; // Diagonal
      for (let j = i + 1; j < N; j++) {
        const idx = i * N + j;
        if (countMatrix[idx] > 0) {
          const avg = distanceSum[idx] / countMatrix[idx];
          distances[idx] = avg;
          distances[j * N + i] = avg;
          if (avg > maxDistance) {
            maxDistance = avg;
          }
        }
      }
    }
    return {
      distances,
      maxDistance
    };
  }

  /**
   * Contact record derivation from distance matrices.
   *
   * Applies a distance threshold to a pairwise distance matrix to produce
   * ContactRecord objects suitable for the hic-straw / Juicebox pipeline.
   * Supports neighbor exclusion to remove trivially proximal diagonal contacts.
   */

  /**
   * Derive contact records from an (ensemble-averaged) distance matrix.
   * Produces binary contacts: counts = 1 for each pair within threshold.
   *
   * @param {Float32Array} distances - N×N distance matrix (row-major)
   * @param {number} traceLength - N
   * @param {number} distanceThreshold - pairs with distance < threshold are contacts
   * @param {object} [options]
   * @param {number} [options.neighborExclusion=0] - skip pairs where |i - j| <= K
   * @returns {ContactRecord[]} Upper-triangle contact records
   */
  function deriveContactRecords(distances, traceLength, distanceThreshold, options = {}) {
    const neighborExclusion = options.neighborExclusion || 0;
    const records = [];
    for (let i = 0; i < traceLength; i++) {
      for (let j = i + 1; j < traceLength; j++) {
        // Neighbor exclusion: skip pairs too close along the linear genome
        if (j - i <= neighborExclusion) continue;
        const dist = distances[i * traceLength + j];
        if (dist === DISTANCE_UNDEFINED) continue;
        if (dist < distanceThreshold) {
          records.push(new ContactRecord(i, j, 1));
        }
      }
    }
    return records;
  }

  /**
   * Derive contact records using ensemble contact frequency.
   *
   * For each bin pair (i, j), checks every trace independently: if the distance
   * in that trace is below the threshold, it counts as a contact for that trace.
   * The final counts value is the fraction of traces where the pair is in contact
   * (a value between 0.0 and 1.0).
   *
   * @param {Array<Array<{x: number, y: number, z: number, isMissingData?: boolean}>>} traces
   * @param {number} traceLength - N
   * @param {number} distanceThreshold - distance cutoff for contact
   * @param {object} [options]
   * @param {number} [options.neighborExclusion=0] - skip pairs where |i - j| <= K
   * @returns {{ contactRecords: ContactRecord[], contactFrequencies: Float32Array }}
   */
  function deriveEnsembleContactFrequencies(traces, traceLength, distanceThreshold, options = {}) {
    const neighborExclusion = options.neighborExclusion || 0;
    const N = traceLength;

    // For each pair, count contacts across traces and total valid traces
    const contactCount = new Uint32Array(N * N);
    const validCount = new Uint32Array(N * N);
    for (const vertices of traces) {
      for (let i = 0; i < N; i++) {
        const vi = vertices[i];
        if (vi.isMissingData) continue;
        for (let j = i + 1; j < N; j++) {
          if (j - i <= neighborExclusion) continue;
          const vj = vertices[j];
          if (vj.isMissingData) continue;
          const dx = vi.x - vj.x;
          const dy = vi.y - vj.y;
          const dz = vi.z - vj.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const ij = i * N + j;
          validCount[ij] += 1;
          if (dist < distanceThreshold) {
            contactCount[ij] += 1;
          }
        }
      }
    }

    // Build contact records and frequency matrix
    const contactFrequencies = new Float32Array(N * N);
    contactFrequencies.fill(DISTANCE_UNDEFINED);
    const contactRecords = [];
    for (let i = 0; i < N; i++) {
      contactFrequencies[i * N + i] = 0; // Diagonal
      for (let j = i + 1; j < N; j++) {
        const ij = i * N + j;
        if (validCount[ij] > 0) {
          const freq = contactCount[ij] / validCount[ij];
          contactFrequencies[ij] = freq;
          contactFrequencies[j * N + i] = freq;
          if (freq > 0) {
            contactRecords.push(new ContactRecord(i, j, freq));
          }
        }
      }
    }
    return {
      contactRecords,
      contactFrequencies
    };
  }

  /**
   * LiveContactMap — an in-memory adapter that implements the HicFile interface
   * for synthetic contact maps derived from 3D chromosome vertex data.
   *
   * Computes a pairwise distance matrix from 3D vertex positions (single trace
   * or ensemble-averaged), then derives contact records by applying a distance
   * threshold. Fully compatible with Straw and Juicebox.js — downstream consumers
   * cannot distinguish this from a real .hic file.
   *
   * Usage:
   *   const lcm = new LiveContactMap({ swtText, distanceThreshold: 200 })
   *   await lcm.init()
   *   const records = await lcm.getContactRecords('NONE', region1, region2, 'BP', 30000)
   */

  /**
   * Real chromosome sizes for known genome assemblies.
   * Used to set correct chromosome size in the HicFile interface —
   * SWT data only covers a sub-region, but Juicebox widgets (scrollbar,
   * ruler, clampXY) need the full chromosome size.
   */
  const knownChromosomeSizes = {
    hg38: {
      chr1: 248956422,
      chr2: 242193529,
      chr3: 198295559,
      chr4: 190214555,
      chr5: 181538259,
      chr6: 170805979,
      chr7: 159345973,
      chr8: 145138636,
      chr9: 138394717,
      chr10: 133797422,
      chr11: 135086622,
      chr12: 133275309,
      chr13: 114364328,
      chr14: 107043718,
      chr15: 101991189,
      chr16: 90338345,
      chr17: 83257441,
      chr18: 80373285,
      chr19: 58617616,
      chr20: 64444167,
      chr21: 46709983,
      chr22: 50818468,
      chrX: 156040895,
      chrY: 57227415
    },
    hg19: {
      chr1: 249250621,
      chr2: 243199373,
      chr3: 198022430,
      chr4: 191154276,
      chr5: 180915260,
      chr6: 171115067,
      chr7: 159138663,
      chr8: 146364022,
      chr9: 141213431,
      chr10: 135534747,
      chr11: 135006516,
      chr12: 133851895,
      chr13: 115169878,
      chr14: 107349540,
      chr15: 102531392,
      chr16: 90354753,
      chr17: 81195210,
      chr18: 78077248,
      chr19: 59128983,
      chr20: 63025520,
      chr21: 48129895,
      chr22: 51304566,
      chrX: 155270560,
      chrY: 59373566
    }
  };

  /**
   * Lightweight Matrix-like object returned by getMatrix().
   * Implements the minimal interface that Juicebox's contactMatrixView expects.
   */
  class LiveMatrix {
    constructor(chr1, chr2, zoomData) {
      this.chr1 = chr1;
      this.chr2 = chr2;
      this._zoomData = zoomData;
    }
    getZoomData(binSize, unit) {
      return this._zoomData;
    }
    getZoomDataByIndex(index, unit) {
      return this._zoomData;
    }
    findZoomForResolution(binSize, unit) {
      return 0;
    }
  }
  class LiveContactMap {
    /**
     * @param {object} config
     * @param {string} [config.swtText] - Raw SWT text to parse (option A)
     * @param {object} [config.parsedData] - Pre-parsed SWT data (option B)
     * @param {Array} [config.traces] - Raw trace vertex arrays (option C)
     * @param {Array} [config.chromosomes] - Chromosome array [{index, name, size}]
     * @param {string} [config.genomeId] - Genome identifier (e.g. "hg38")
     * @param {string} [config.chr] - Chromosome name (e.g. "chr21")
     * @param {number} [config.genomicStart] - Start position in bp
     * @param {number} [config.genomicEnd] - End position in bp
     * @param {number} [config.binSize] - Bin size in bp
     * @param {number} [config.traceLength] - Number of bins per trace
     * @param {number} [config.distanceThreshold=200] - Initial distance threshold
     * @param {number} [config.neighborExclusion=0] - Neighbor bins to exclude
     * @param {string} [config.contactMode='frequency'] - 'contact' or 'frequency'
     * @param {string} [config.name] - Dataset name
     */
    constructor(config) {
      this.config = config;
      this.initialized = false;
    }

    // =========================================================================
    // HicFile interface — methods that Straw and Juicebox call
    // =========================================================================

    /**
     * Initialize the adapter. Parses input data, computes distance matrix,
     * derives contact records. Safe to call multiple times (idempotent).
     */
    async init() {
      if (this.initialized) return;
      const config = this.config;

      // --- Resolve input data ---
      let traces, genomeId, chr, genomicStart, genomicEnd, binSize, traceLength;
      if (config.swtText) {
        const parsed = parseSWT(config.swtText);
        traces = parsed.traces;
        genomeId = config.genomeId || parsed.genomeId;
        chr = config.chr || parsed.chr;
        genomicStart = config.genomicStart !== undefined ? config.genomicStart : parsed.genomicStart;
        genomicEnd = config.genomicEnd !== undefined ? config.genomicEnd : parsed.genomicEnd;
        binSize = config.binSize || parsed.binSize;
        traceLength = parsed.traceLength;
      } else if (config.parsedData) {
        const pd = config.parsedData;
        traces = pd.traces;
        genomeId = config.genomeId || pd.genomeId;
        chr = config.chr || pd.chr;
        genomicStart = config.genomicStart !== undefined ? config.genomicStart : pd.genomicStart;
        genomicEnd = config.genomicEnd !== undefined ? config.genomicEnd : pd.genomicEnd;
        binSize = config.binSize || pd.binSize;
        traceLength = pd.traceLength;
        pd.sample;
      } else if (config.traces) {
        traces = config.traces;
        genomeId = config.genomeId;
        chr = config.chr;
        genomicStart = config.genomicStart;
        genomicEnd = config.genomicEnd;
        binSize = config.binSize;
        traceLength = config.traceLength || traces[0].length;
        config.name;
      } else {
        throw new Error('LiveContactMap requires swtText, parsedData, or traces in config');
      }

      // --- Store core data ---
      this.traces = traces;
      this.traceLength = traceLength;
      this.binSize = binSize;
      this.genomicStart = genomicStart;
      this.genomicEnd = genomicEnd;
      this.distanceThreshold = config.distanceThreshold !== undefined ? config.distanceThreshold : 200;
      this.neighborExclusion = config.neighborExclusion || 0;
      this.contactMode = config.contactMode || 'frequency';

      // Bin offset: converts trace-relative indices (0..N-1) to absolute
      // bin indices that match genomic coordinates (genomicStart/binSize).
      // In a real .hic file, bin index = genomicPosition / binSize.
      this.binOffset = Math.floor(genomicStart / binSize);

      // --- Build HicFile-compatible metadata ---
      this.genomeId = genomeId;
      this.version = 0; // Synthetic — not a real .hic file version

      // Chromosomes: use provided array or build from SWT data
      if (config.chromosomes) {
        this.chromosomes = config.chromosomes;
      } else {
        // Look up real chromosome size from known genome assemblies.
        // SWT data only covers a sub-region, but Juicebox widgets
        // (scrollbar, ruler, clampXY) need the full chromosome size.
        let chrSize;
        const genomeSizes = knownChromosomeSizes[genomeId];
        if (genomeSizes && genomeSizes[chr]) {
          chrSize = genomeSizes[chr];
        } else {
          chrSize = genomicEnd; // Fallback for unknown genomes
        }
        this.chromosomes = [{
          index: 0,
          name: 'All',
          size: chrSize
        }, {
          index: 1,
          name: chr,
          size: chrSize
        }];
      }

      // Resolution: single resolution matching the bin size
      this.bpResolutions = [binSize];
      this.fragResolutions = [];

      // Whole genome support (not needed for single-region live maps)
      this.wholeGenomeChromosome = this.chromosomes.find(c => c.name === 'All') || null;
      this.wholeGenomeResolution = this.wholeGenomeChromosome ? Math.round(this.wholeGenomeChromosome.size * (1000 / 500)) : null;

      // Normalization: only NONE for live maps
      this.normalizationTypes = ['NONE'];
      this.normVectorIndex = {};

      // Chromosome index map and alias table
      this.chromosomeIndexMap = {};
      this.chrAliasTable = {};
      for (const c of this.chromosomes) {
        this.chromosomeIndexMap[c.name] = c.index;
        this.chrAliasTable[c.name] = c.name;

        // Add common aliases: "chr21" <-> "21"
        if (c.name.startsWith('chr')) {
          const bare = c.name.substring(3);
          this.chrAliasTable[bare] = c.name;
        } else if (c.name !== 'All') {
          this.chrAliasTable['chr' + c.name] = c.name;
        }
      }

      // Meta object (returned by getMetaData)
      this.meta = {
        version: this.version,
        genome: this.genomeId,
        chromosomes: this.chromosomes,
        resolutions: this.bpResolutions
      };

      // --- Compute distance matrix ---
      this._computeDistances();

      // --- Derive contact records ---
      this._deriveContacts();
      this.initialized = true;
    }

    /**
     * @returns {Promise<{version: number, genome: string, chromosomes: Array, resolutions: Array}>}
     */
    async getMetaData() {
      await this.init();
      return this.meta;
    }

    /**
     * Get contact records for a region pair.
     *
     * @param {string} normalization - Normalization type (only "NONE" supported)
     * @param {{chr: string, start: number, end: number}} region1
     * @param {{chr: string, start: number, end: number}} region2
     * @param {string} units - "BP" (only BP supported)
     * @param {number} binsize - Bin size in base pairs
     * @returns {Promise<ContactRecord[]>}
     */
    async getContactRecords(normalization, region1, region2, units, binsize) {
      await this.init();
      const x1 = Math.floor(region1.start / binsize);
      const x2 = Math.ceil(region1.end / binsize);
      const y1 = Math.floor(region2.start / binsize);
      const y2 = Math.ceil(region2.end / binsize);
      const result = [];
      for (const rec of this.contactRecords) {
        // Upper triangle: rec.bin1 < rec.bin2
        if (rec.bin1 >= x1 && rec.bin1 < x2 && rec.bin2 >= y1 && rec.bin2 < y2) {
          result.push(rec);
        }
        // Lower triangle (symmetric): swap bin1 and bin2
        if (rec.bin1 !== rec.bin2 && rec.bin2 >= x1 && rec.bin2 < x2 && rec.bin1 >= y1 && rec.bin1 < y2) {
          result.push(new ContactRecord(rec.bin2, rec.bin1, rec.counts));
        }
      }
      return result;
    }

    /**
     * Get matrix for a chromosome pair.
     * Returns a lightweight Matrix-like object with a single zoom level.
     *
     * @param {number} chrIdx1 - Chromosome index
     * @param {number} chrIdx2 - Chromosome index
     * @returns {Promise<LiveMatrix|undefined>}
     */
    async getMatrix(chrIdx1, chrIdx2) {
      await this.init();
      const chr1 = this.chromosomes[chrIdx1];
      const chr2 = this.chromosomes[chrIdx2];
      if (!chr1 || !chr2) return undefined;

      // Compute statistics from current contact records
      let sumCounts = 0;
      for (const rec of this.contactRecords) {
        sumCounts += rec.counts;
      }
      const nBins = this.traceLength;
      const averageCount = nBins > 0 ? sumCounts / (nBins * nBins) : 0;
      const zoomData = {
        chr1,
        chr2,
        zoom: {
          index: 0,
          binSize: this.binSize,
          unit: 'BP'
        },
        averageCount,
        sumCounts,
        blockBinCount: this.traceLength,
        blockColumnCount: 1,
        stdDev: 0,
        occupiedCellCount: this.contactRecords.length,
        percent95: 0
      };
      return new LiveMatrix(chr1, chr2, zoomData);
    }

    /**
     * @returns {Promise<boolean>} Always false — live maps don't support normalization vectors
     */
    async hasNormalizationVector(type, chr, unit, binSize) {
      return false;
    }

    /**
     * @returns {Promise<string[]>} Always ['NONE']
     */
    async getNormalizationOptions() {
      return this.normalizationTypes || ['NONE'];
    }

    /**
     * Resolve a chromosome alias to the canonical name.
     * @param {string} chrAlias
     * @returns {string}
     */
    getFileChrName(chrAlias) {
      if (this.chrAliasTable && this.chrAliasTable.hasOwnProperty(chrAlias)) {
        return this.chrAliasTable[chrAlias];
      }
      return chrAlias;
    }

    /**
     * No caches to clear for in-memory data.
     */
    clearCaches() {
      // no-op
    }

    // =========================================================================
    // Live-map-specific methods
    // =========================================================================

    /**
     * Update the distance threshold and recompute contact records.
     * Does NOT recompute the distance matrix (that is expensive).
     *
     * @param {number} threshold - New distance threshold
     */
    setDistanceThreshold(threshold) {
      this.distanceThreshold = threshold;
      if (this.initialized) {
        this._deriveContacts();
      }
    }

    /**
     * Update the neighbor exclusion parameter and recompute contacts.
     *
     * @param {number} k - Number of neighbor bins to exclude
     */
    setNeighborExclusion(k) {
      this.neighborExclusion = k;
      if (this.initialized) {
        this._deriveContacts();
      }
    }

    /**
     * Replace the vertex data entirely (e.g., new ensemble loaded).
     * Recomputes everything: distances and contacts.
     *
     * @param {Array<Array<{x, y, z, isMissingData?}>>} traces
     * @param {object} [config] - Optional overrides for genomicStart, genomicEnd, binSize, etc.
     */
    updateVertexData(traces, config = {}) {
      this.traces = traces;
      if (config.traceLength !== undefined) this.traceLength = config.traceLength;else this.traceLength = traces[0].length;
      if (config.binSize !== undefined) this.binSize = config.binSize;
      if (config.genomicStart !== undefined) this.genomicStart = config.genomicStart;
      if (config.genomicEnd !== undefined) this.genomicEnd = config.genomicEnd;
      this._computeDistances();
      this._deriveContacts();
    }

    /**
     * Get the raw distance matrix (for distance map visualization).
     * @returns {{ distances: Float32Array, maxDistance: number, traceLength: number }}
     */
    getDistanceMatrix() {
      return {
        distances: this.distanceMatrix,
        maxDistance: this.maxDistance,
        traceLength: this.traceLength
      };
    }

    /**
     * Get the contact frequencies array (for optional RGBA rendering).
     * Only available in 'frequency' mode.
     * @returns {Float32Array|undefined}
     */
    getContactFrequencies() {
      return this.contactFrequencies;
    }

    // =========================================================================
    // Internal computation methods
    // =========================================================================

    /**
     * Compute the ensemble-averaged distance matrix from trace vertex data.
     * @private
     */
    _computeDistances() {
      const result = computeEnsembleDistances(this.traces, this.traceLength);
      this.distanceMatrix = result.distances;
      this.maxDistance = result.maxDistance;
    }

    /**
     * Derive contact records from the distance matrix using the current
     * threshold and neighbor exclusion settings.
     * @private
     */
    _deriveContacts() {
      const options = {
        neighborExclusion: this.neighborExclusion
      };
      let rawRecords;
      if (this.contactMode === 'frequency') {
        const result = deriveEnsembleContactFrequencies(this.traces, this.traceLength, this.distanceThreshold, options);
        rawRecords = result.contactRecords;
        this.contactFrequencies = result.contactFrequencies;
      } else {
        // 'contact' mode: binary contacts from averaged distance matrix
        rawRecords = deriveContactRecords(this.distanceMatrix, this.traceLength, this.distanceThreshold, options);
        this.contactFrequencies = undefined;
      }

      // Apply bin offset to convert trace-relative indices (0..N-1) to absolute
      // bin indices matching genomic coordinates (genomicStart / binSize + i).
      // This is critical for compatibility with Juicebox, which queries by
      // genomic position and computes bin indices as position / binSize.
      const offset = this.binOffset;
      if (offset === 0) {
        this.contactRecords = rawRecords;
      } else {
        this.contactRecords = rawRecords.map(rec => new ContactRecord(rec.bin1 + offset, rec.bin2 + offset, rec.counts));
      }
    }
  }

  exports.LiveContactMap = LiveContactMap;
  exports["default"] = Straw;

  Object.defineProperty(exports, '__esModule', { value: true });

}));

var F = {
  Huffman: {},
  Util: {},
  CRC32: {}
};
F.CompressionMethod = {
  DEFLATE: 8,
  RESERVED: 15
};
F.Zip = function(o) {
  o = o || {}, this.files = [], this.comment = o.comment, this.password;
};
F.Zip.CompressionMethod = {
  STORE: 0,
  DEFLATE: 8
};
F.Zip.OperatingSystem = {
  MSDOS: 0,
  UNIX: 3,
  MACINTOSH: 7
};
F.Zip.Flags = {
  ENCRYPT: 1,
  DESCRIPTOR: 8,
  UTF8: 2048
};
F.Zip.FileHeaderSignature = [80, 75, 1, 2];
F.Zip.LocalFileHeaderSignature = [80, 75, 3, 4];
F.Zip.CentralDirectorySignature = [80, 75, 5, 6];
F.Zip.prototype.addFile = function(o, e) {
  e = e || {}, e.filename;
  var a, t = o.length, i = 0;
  if (o instanceof Array && (o = new Uint8Array(o)), typeof e.compressionMethod != "number" && (e.compressionMethod = F.Zip.CompressionMethod.DEFLATE), e.compress)
    switch (e.compressionMethod) {
      case F.Zip.CompressionMethod.STORE:
        break;
      case F.Zip.CompressionMethod.DEFLATE:
        i = F.CRC32.calc(o), o = this.deflateWithOption(o, e), a = !0;
        break;
      default:
        throw new Error("unknown compression method:" + e.compressionMethod);
    }
  this.files.push({
    buffer: o,
    option: e,
    compressed: a,
    encrypted: !1,
    size: t,
    crc32: i
  });
};
F.Zip.prototype.setPassword = function(o) {
  this.password = o;
};
F.Zip.prototype.compress = function() {
  var o = this.files, e, a, t, i, n, r = 0, s = 0, f, c, h, d, w, u, p, m, N, l, b, z, I, C, x, g, R, T, E, v, y, L;
  for (E = 0, v = o.length; E < v; ++E) {
    if (e = o[E], l = e.option.filename ? e.option.filename.length : 0, b = e.option.extraField ? e.option.extraField.length : 0, z = e.option.comment ? e.option.comment.length : 0, !e.compressed)
      switch (e.crc32 = F.CRC32.calc(e.buffer), e.option.compressionMethod) {
        case F.Zip.CompressionMethod.STORE:
          break;
        case F.Zip.CompressionMethod.DEFLATE:
          e.buffer = this.deflateWithOption(e.buffer, e.option), e.compressed = !0;
          break;
        default:
          throw new Error("unknown compression method:" + e.option.compressionMethod);
      }
    if (e.option.password !== void 0 || this.password !== void 0) {
      for (T = this.createEncryptionKey(e.option.password || this.password), g = e.buffer, R = new Uint8Array(g.length + 12), R.set(g, 12), g = R, y = 0; y < 12; ++y)
        g[y] = this.encode(
          T,
          E === 11 ? e.crc32 & 255 : Math.random() * 256 | 0
        );
      for (L = g.length; y < L; ++y)
        g[y] = this.encode(T, g[y]);
      e.buffer = g;
    }
    r += // local file header
    30 + l + // file data
    e.buffer.length, s += // file header
    46 + l + z;
  }
  for (f = 22 + (this.comment ? this.comment.length : 0), a = new Uint8Array(
    r + s + f
  ), t = 0, i = r, n = i + s, E = 0, v = o.length; E < v; ++E)
    e = o[E], l = e.option.filename ? e.option.filename.length : 0, b = 0, z = e.option.comment ? e.option.comment.length : 0, c = t, a[t++] = F.Zip.LocalFileHeaderSignature[0], a[t++] = F.Zip.LocalFileHeaderSignature[1], a[t++] = F.Zip.LocalFileHeaderSignature[2], a[t++] = F.Zip.LocalFileHeaderSignature[3], a[i++] = F.Zip.FileHeaderSignature[0], a[i++] = F.Zip.FileHeaderSignature[1], a[i++] = F.Zip.FileHeaderSignature[2], a[i++] = F.Zip.FileHeaderSignature[3], h = 20, a[i++] = h & 255, a[i++] = /** @type {Zlib.Zip.OperatingSystem} */
    e.option.os || F.Zip.OperatingSystem.MSDOS, a[t++] = a[i++] = h & 255, a[t++] = a[i++] = h >> 8 & 255, d = 0, (e.option.password || this.password) && (d |= F.Zip.Flags.ENCRYPT), a[t++] = a[i++] = d & 255, a[t++] = a[i++] = d >> 8 & 255, w = /** @type {Zlib.Zip.CompressionMethod} */
    e.option.compressionMethod, a[t++] = a[i++] = w & 255, a[t++] = a[i++] = w >> 8 & 255, u = /** @type {(Date|undefined)} */
    e.option.date || /* @__PURE__ */ new Date(), a[t++] = a[i++] = (u.getMinutes() & 7) << 5 | (u.getSeconds() / 2 | 0), a[t++] = a[i++] = u.getHours() << 3 | u.getMinutes() >> 3, a[t++] = a[i++] = (u.getMonth() + 1 & 7) << 5 | u.getDate(), a[t++] = a[i++] = (u.getFullYear() - 1980 & 127) << 1 | u.getMonth() + 1 >> 3, p = e.crc32, a[t++] = a[i++] = p & 255, a[t++] = a[i++] = p >> 8 & 255, a[t++] = a[i++] = p >> 16 & 255, a[t++] = a[i++] = p >> 24 & 255, m = e.buffer.length, a[t++] = a[i++] = m & 255, a[t++] = a[i++] = m >> 8 & 255, a[t++] = a[i++] = m >> 16 & 255, a[t++] = a[i++] = m >> 24 & 255, N = e.size, a[t++] = a[i++] = N & 255, a[t++] = a[i++] = N >> 8 & 255, a[t++] = a[i++] = N >> 16 & 255, a[t++] = a[i++] = N >> 24 & 255, a[t++] = a[i++] = l & 255, a[t++] = a[i++] = l >> 8 & 255, a[t++] = a[i++] = b & 255, a[t++] = a[i++] = b >> 8 & 255, a[i++] = z & 255, a[i++] = z >> 8 & 255, a[i++] = 0, a[i++] = 0, a[i++] = 0, a[i++] = 0, a[i++] = 0, a[i++] = 0, a[i++] = 0, a[i++] = 0, a[i++] = c & 255, a[i++] = c >> 8 & 255, a[i++] = c >> 16 & 255, a[i++] = c >> 24 & 255, I = e.option.filename, I && (a.set(I, t), a.set(I, i), t += l, i += l), C = e.option.extraField, C && (a.set(C, t), a.set(C, i), t += b, i += b), x = e.option.comment, x && (a.set(x, i), i += z), a.set(e.buffer, t), t += e.buffer.length;
  return a[n++] = F.Zip.CentralDirectorySignature[0], a[n++] = F.Zip.CentralDirectorySignature[1], a[n++] = F.Zip.CentralDirectorySignature[2], a[n++] = F.Zip.CentralDirectorySignature[3], a[n++] = 0, a[n++] = 0, a[n++] = 0, a[n++] = 0, a[n++] = v & 255, a[n++] = v >> 8 & 255, a[n++] = v & 255, a[n++] = v >> 8 & 255, a[n++] = s & 255, a[n++] = s >> 8 & 255, a[n++] = s >> 16 & 255, a[n++] = s >> 24 & 255, a[n++] = r & 255, a[n++] = r >> 8 & 255, a[n++] = r >> 16 & 255, a[n++] = r >> 24 & 255, z = this.comment ? this.comment.length : 0, a[n++] = z & 255, a[n++] = z >> 8 & 255, this.comment && (a.set(this.comment, n), n += z), a;
};
F.Zip.prototype.deflateWithOption = function(o, e) {
  var a = new F.RawDeflate(o, e.deflateOption);
  return a.compress();
};
F.Zip.prototype.getByte = function(o) {
  var e = o[2] & 65535 | 2;
  return e * (e ^ 1) >> 8 & 255;
};
F.Zip.prototype.encode = function(o, e) {
  var a = this.getByte(
    /** @type {(Array.<number>|Uint32Array)} */
    o
  );
  return this.updateKeys(
    /** @type {(Array.<number>|Uint32Array)} */
    o,
    e
  ), a ^ e;
};
F.Zip.prototype.updateKeys = function(o, e) {
  o[0] = F.CRC32.single(o[0], e), o[1] = (((o[1] + (o[0] & 255)) * 20173 >>> 0) * 6681 >>> 0) + 1 >>> 0, o[2] = F.CRC32.single(o[2], o[1] >>> 24);
};
F.Zip.prototype.createEncryptionKey = function(o) {
  var e = [305419896, 591751049, 878082192], a, t;
  for (e = new Uint32Array(e), a = 0, t = o.length; a < t; ++a)
    this.updateKeys(e, o[a] & 255);
  return e;
};
F.Huffman.buildHuffmanTable = function(o) {
  var e = o.length, a = 0, t = Number.POSITIVE_INFINITY, i, n, r, s, f, c, h, d, w, u, p;
  for (d = 0, w = e; d < w; ++d)
    o[d] > a && (a = o[d]), o[d] < t && (t = o[d]);
  for (i = 1 << a, n = new Uint32Array(i), r = 1, s = 0, f = 2; r <= a; ) {
    for (d = 0; d < e; ++d)
      if (o[d] === r) {
        for (c = 0, h = s, u = 0; u < r; ++u)
          c = c << 1 | h & 1, h >>= 1;
        for (p = r << 16 | d, u = c; u < i; u += f)
          n[u] = p;
        ++s;
      }
    ++r, s <<= 1, f <<= 1;
  }
  return [n, a, t];
};
var X = 32768, H = F.Huffman.buildHuffmanTable;
F.RawInflate = function(o, e) {
  switch (this.buffer, this.blocks = [], this.bufferSize = X, this.totalpos = 0, this.ip = 0, this.bitsbuf = 0, this.bitsbuflen = 0, this.input = new Uint8Array(o), this.output, this.op, this.bfinal = !1, this.bufferType = F.RawInflate.BufferType.ADAPTIVE, this.resize = !1, (e || !(e = {})) && (e.index && (this.ip = e.index), e.bufferSize && (this.bufferSize = e.bufferSize), e.bufferType && (this.bufferType = e.bufferType), e.resize && (this.resize = e.resize)), this.bufferType) {
    case F.RawInflate.BufferType.BLOCK:
      this.op = F.RawInflate.MaxBackwardLength, this.output = new Uint8Array(
        F.RawInflate.MaxBackwardLength + this.bufferSize + F.RawInflate.MaxCopyLength
      );
      break;
    case F.RawInflate.BufferType.ADAPTIVE:
      this.op = 0, this.output = new Uint8Array(this.bufferSize);
      break;
    default:
      throw new Error("invalid inflate mode");
  }
};
F.RawInflate.BufferType = {
  BLOCK: 0,
  ADAPTIVE: 1
};
F.RawInflate.prototype.decompress = function() {
  for (; !this.bfinal; )
    this.parseBlock();
  switch (this.bufferType) {
    case F.RawInflate.BufferType.BLOCK:
      return this.concatBufferBlock();
    case F.RawInflate.BufferType.ADAPTIVE:
      return this.concatBufferDynamic();
    default:
      throw new Error("invalid inflate mode");
  }
};
F.RawInflate.MaxBackwardLength = 32768;
F.RawInflate.MaxCopyLength = 258;
F.RawInflate.Order = (function(o) {
  return new Uint16Array(o);
})([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
F.RawInflate.LengthCodeTable = (function(o) {
  return new Uint16Array(o);
})([
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258,
  258,
  258
]);
F.RawInflate.LengthExtraTable = (function(o) {
  return new Uint8Array(o);
})([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  0,
  0
]);
F.RawInflate.DistCodeTable = (function(o) {
  return new Uint16Array(o);
})([
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577
]);
F.RawInflate.DistExtraTable = (function(o) {
  return new Uint8Array(o);
})([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13
]);
F.RawInflate.FixedLiteralLengthTable = /* @__PURE__ */ (function(o) {
  return o;
})((function() {
  var o = new Uint8Array(288), e, a;
  for (e = 0, a = o.length; e < a; ++e)
    o[e] = e <= 143 ? 8 : e <= 255 ? 9 : e <= 279 ? 7 : 8;
  return H(o);
})());
F.RawInflate.FixedDistanceTable = /* @__PURE__ */ (function(o) {
  return o;
})((function() {
  var o = new Uint8Array(30), e, a;
  for (e = 0, a = o.length; e < a; ++e)
    o[e] = 5;
  return H(o);
})());
F.RawInflate.prototype.parseBlock = function() {
  var o = this.readBits(3);
  switch (o & 1 && (this.bfinal = !0), o >>>= 1, o) {
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
      throw new Error("unknown BTYPE: " + o);
  }
};
F.RawInflate.prototype.readBits = function(o) {
  var e = this.bitsbuf, a = this.bitsbuflen, t = this.input, i = this.ip, n = t.length, r;
  if (i + (o - a + 7 >> 3) >= n)
    throw new Error("input buffer is broken");
  for (; a < o; )
    e |= t[i++] << a, a += 8;
  return r = e & /* MASK */
  (1 << o) - 1, e >>>= o, a -= o, this.bitsbuf = e, this.bitsbuflen = a, this.ip = i, r;
};
F.RawInflate.prototype.readCodeByTable = function(o) {
  for (var e = this.bitsbuf, a = this.bitsbuflen, t = this.input, i = this.ip, n = t.length, r = o[0], s = o[1], f, c; a < s && !(i >= n); )
    e |= t[i++] << a, a += 8;
  if (f = r[e & (1 << s) - 1], c = f >>> 16, c > a)
    throw new Error("invalid code length: " + c);
  return this.bitsbuf = e >> c, this.bitsbuflen = a - c, this.ip = i, f & 65535;
};
F.RawInflate.prototype.parseUncompressedBlock = function() {
  var o = this.input, e = this.ip, a = this.output, t = this.op, i = o.length, n, r, s = a.length, f;
  if (this.bitsbuf = 0, this.bitsbuflen = 0, e + 1 >= i)
    throw new Error("invalid uncompressed block header: LEN");
  if (n = o[e++] | o[e++] << 8, e + 1 >= i)
    throw new Error("invalid uncompressed block header: NLEN");
  if (r = o[e++] | o[e++] << 8, n === ~r)
    throw new Error("invalid uncompressed block header: length verify");
  if (e + n > o.length)
    throw new Error("input buffer is broken");
  switch (this.bufferType) {
    case F.RawInflate.BufferType.BLOCK:
      for (; t + n > a.length; )
        f = s - t, n -= f, a.set(o.subarray(e, e + f), t), t += f, e += f, this.op = t, a = this.expandBufferBlock(), t = this.op;
      break;
    case F.RawInflate.BufferType.ADAPTIVE:
      for (; t + n > a.length; )
        a = this.expandBufferAdaptive({ fixRatio: 2 });
      break;
    default:
      throw new Error("invalid inflate mode");
  }
  a.set(o.subarray(e, e + n), t), t += n, e += n, this.ip = e, this.op = t, this.output = a;
};
F.RawInflate.prototype.parseFixedHuffmanBlock = function() {
  switch (this.bufferType) {
    case F.RawInflate.BufferType.ADAPTIVE:
      this.decodeHuffmanAdaptive(
        F.RawInflate.FixedLiteralLengthTable,
        F.RawInflate.FixedDistanceTable
      );
      break;
    case F.RawInflate.BufferType.BLOCK:
      this.decodeHuffmanBlock(
        F.RawInflate.FixedLiteralLengthTable,
        F.RawInflate.FixedDistanceTable
      );
      break;
    default:
      throw new Error("invalid inflate mode");
  }
};
F.RawInflate.prototype.parseDynamicHuffmanBlock = function() {
  var o = this.readBits(5) + 257, e = this.readBits(5) + 1, a = this.readBits(4) + 4, t = new Uint8Array(F.RawInflate.Order.length), i, n, r, s, f, c, h, d, w;
  for (d = 0; d < a; ++d)
    t[F.RawInflate.Order[d]] = this.readBits(3);
  for (i = H(t), s = new Uint8Array(o + e), d = 0, w = o + e; d < w; )
    switch (f = this.readCodeByTable(i), f) {
      case 16:
        for (h = 3 + this.readBits(2); h--; )
          s[d++] = c;
        break;
      case 17:
        for (h = 3 + this.readBits(3); h--; )
          s[d++] = 0;
        c = 0;
        break;
      case 18:
        for (h = 11 + this.readBits(7); h--; )
          s[d++] = 0;
        c = 0;
        break;
      default:
        s[d++] = f, c = f;
        break;
    }
  switch (n = H(s.subarray(0, o)), r = H(s.subarray(o)), this.bufferType) {
    case F.RawInflate.BufferType.ADAPTIVE:
      this.decodeHuffmanAdaptive(n, r);
      break;
    case F.RawInflate.BufferType.BLOCK:
      this.decodeHuffmanBlock(n, r);
      break;
    default:
      throw new Error("invalid inflate mode");
  }
};
F.RawInflate.prototype.decodeHuffmanBlock = function(o, e) {
  var a = this.output, t = this.op;
  this.currentLitlenTable = o;
  for (var i = a.length - F.RawInflate.MaxCopyLength, n, r, s, f, c = F.RawInflate.LengthCodeTable, h = F.RawInflate.LengthExtraTable, d = F.RawInflate.DistCodeTable, w = F.RawInflate.DistExtraTable; (n = this.readCodeByTable(o)) !== 256; ) {
    if (n < 256) {
      t >= i && (this.op = t, a = this.expandBufferBlock(), t = this.op), a[t++] = n;
      continue;
    }
    for (r = n - 257, f = c[r], h[r] > 0 && (f += this.readBits(h[r])), n = this.readCodeByTable(e), s = d[n], w[n] > 0 && (s += this.readBits(w[n])), t >= i && (this.op = t, a = this.expandBufferBlock(), t = this.op); f--; )
      a[t] = a[t++ - s];
  }
  for (; this.bitsbuflen >= 8; )
    this.bitsbuflen -= 8, this.ip--;
  this.op = t;
};
F.RawInflate.prototype.decodeHuffmanAdaptive = function(o, e) {
  var a = this.output, t = this.op;
  this.currentLitlenTable = o;
  for (var i = a.length, n, r, s, f, c = F.RawInflate.LengthCodeTable, h = F.RawInflate.LengthExtraTable, d = F.RawInflate.DistCodeTable, w = F.RawInflate.DistExtraTable; (n = this.readCodeByTable(o)) !== 256; ) {
    if (n < 256) {
      t >= i && (a = this.expandBufferAdaptive(), i = a.length), a[t++] = n;
      continue;
    }
    for (r = n - 257, f = c[r], h[r] > 0 && (f += this.readBits(h[r])), n = this.readCodeByTable(e), s = d[n], w[n] > 0 && (s += this.readBits(w[n])), t + f > i && (a = this.expandBufferAdaptive(), i = a.length); f--; )
      a[t] = a[t++ - s];
  }
  for (; this.bitsbuflen >= 8; )
    this.bitsbuflen -= 8, this.ip--;
  this.op = t;
};
F.RawInflate.prototype.expandBufferBlock = function(o) {
  var e = new Uint8Array(
    this.op - F.RawInflate.MaxBackwardLength
  ), a = this.op - F.RawInflate.MaxBackwardLength, t = this.output;
  return e.set(t.subarray(F.RawInflate.MaxBackwardLength, e.length)), this.blocks.push(e), this.totalpos += e.length, t.set(
    t.subarray(a, a + F.RawInflate.MaxBackwardLength)
  ), this.op = F.RawInflate.MaxBackwardLength, t;
};
F.RawInflate.prototype.expandBufferAdaptive = function(o) {
  var e, a = this.input.length / this.ip + 1 | 0, t, i, n, r = this.input, s = this.output;
  return o && (typeof o.fixRatio == "number" && (a = o.fixRatio), typeof o.addRatio == "number" && (a += o.addRatio)), a < 2 ? (t = (r.length - this.ip) / this.currentLitlenTable[2], n = t / 2 * 258 | 0, i = n < s.length ? s.length + n : s.length << 1) : i = s.length * a, e = new Uint8Array(i), e.set(s), this.output = e, this.output;
};
F.RawInflate.prototype.concatBufferBlock = function() {
  var o = 0, e = this.totalpos + (this.op - F.RawInflate.MaxBackwardLength), a = this.output, t = this.blocks, i, n = new Uint8Array(e), r, s, f, c;
  if (t.length === 0)
    return this.output.subarray(F.RawInflate.MaxBackwardLength, this.op);
  for (r = 0, s = t.length; r < s; ++r)
    for (i = t[r], f = 0, c = i.length; f < c; ++f)
      n[o++] = i[f];
  for (r = F.RawInflate.MaxBackwardLength, s = this.op; r < s; ++r)
    n[o++] = a[r];
  return this.blocks = [], this.buffer = n, this.buffer;
};
F.RawInflate.prototype.concatBufferDynamic = function() {
  var o, e = this.op;
  return this.resize ? (o = new Uint8Array(e), o.set(this.output.subarray(0, e))) : o = this.output.subarray(0, e), this.buffer = o, this.buffer;
};
var H = F.Huffman.buildHuffmanTable;
F.RawInflateStream = function(o, e, a) {
  this.blocks = [], this.bufferSize = a || ZLIB_STREAM_RAW_INFLATE_BUFFER_SIZE, this.totalpos = 0, this.ip = e === void 0 ? 0 : e, this.bitsbuf = 0, this.bitsbuflen = 0, this.input = new Uint8Array(o), this.output = new Uint8Array(this.bufferSize), this.op = 0, this.bfinal = !1, this.blockLength, this.resize = !1, this.litlenTable, this.distTable, this.sp = 0, this.status = F.RawInflateStream.Status.INITIALIZED, this.ip_, this.bitsbuflen_, this.bitsbuf_;
};
F.RawInflateStream.BlockType = {
  UNCOMPRESSED: 0,
  FIXED: 1,
  DYNAMIC: 2
};
F.RawInflateStream.Status = {
  INITIALIZED: 0,
  BLOCK_HEADER_START: 1,
  BLOCK_HEADER_END: 2,
  BLOCK_BODY_START: 3,
  BLOCK_BODY_END: 4,
  DECODE_BLOCK_START: 5,
  DECODE_BLOCK_END: 6
};
F.RawInflateStream.prototype.decompress = function(o, e) {
  var a = !1;
  for (o !== void 0 && (this.input = o), e !== void 0 && (this.ip = e); !a; )
    switch (this.status) {
      // block header
      case F.RawInflateStream.Status.INITIALIZED:
      case F.RawInflateStream.Status.BLOCK_HEADER_START:
        this.readBlockHeader() < 0 && (a = !0);
        break;
      // block body
      case F.RawInflateStream.Status.BLOCK_HEADER_END:
      /* FALLTHROUGH */
      case F.RawInflateStream.Status.BLOCK_BODY_START:
        switch (this.currentBlockType) {
          case F.RawInflateStream.BlockType.UNCOMPRESSED:
            this.readUncompressedBlockHeader() < 0 && (a = !0);
            break;
          case F.RawInflateStream.BlockType.FIXED:
            this.parseFixedHuffmanBlock() < 0 && (a = !0);
            break;
          case F.RawInflateStream.BlockType.DYNAMIC:
            this.parseDynamicHuffmanBlock() < 0 && (a = !0);
            break;
        }
        break;
      // decode data
      case F.RawInflateStream.Status.BLOCK_BODY_END:
      case F.RawInflateStream.Status.DECODE_BLOCK_START:
        switch (this.currentBlockType) {
          case F.RawInflateStream.BlockType.UNCOMPRESSED:
            this.parseUncompressedBlock() < 0 && (a = !0);
            break;
          case F.RawInflateStream.BlockType.FIXED:
          /* FALLTHROUGH */
          case F.RawInflateStream.BlockType.DYNAMIC:
            this.decodeHuffman() < 0 && (a = !0);
            break;
        }
        break;
      case F.RawInflateStream.Status.DECODE_BLOCK_END:
        this.bfinal ? a = !0 : this.status = F.RawInflateStream.Status.INITIALIZED;
        break;
    }
  return this.concatBuffer();
};
F.RawInflateStream.MaxBackwardLength = 32768;
F.RawInflateStream.MaxCopyLength = 258;
F.RawInflateStream.Order = (function(o) {
  return new Uint16Array(o);
})([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
F.RawInflateStream.LengthCodeTable = (function(o) {
  return new Uint16Array(o);
})([
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258,
  258,
  258
]);
F.RawInflateStream.LengthExtraTable = (function(o) {
  return new Uint8Array(o);
})([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  0,
  0
]);
F.RawInflateStream.DistCodeTable = (function(o) {
  return new Uint16Array(o);
})([
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577
]);
F.RawInflateStream.DistExtraTable = (function(o) {
  return new Uint8Array(o);
})([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13
]);
F.RawInflateStream.FixedLiteralLengthTable = /* @__PURE__ */ (function(o) {
  return o;
})((function() {
  var o = new Uint8Array(288), e, a;
  for (e = 0, a = o.length; e < a; ++e)
    o[e] = e <= 143 ? 8 : e <= 255 ? 9 : e <= 279 ? 7 : 8;
  return H(o);
})());
F.RawInflateStream.FixedDistanceTable = /* @__PURE__ */ (function(o) {
  return o;
})((function() {
  var o = new Uint8Array(30), e, a;
  for (e = 0, a = o.length; e < a; ++e)
    o[e] = 5;
  return H(o);
})());
F.RawInflateStream.prototype.readBlockHeader = function() {
  var o;
  if (this.status = F.RawInflateStream.Status.BLOCK_HEADER_START, this.save_(), (o = this.readBits(3)) < 0)
    return this.restore_(), -1;
  switch (o & 1 && (this.bfinal = !0), o >>>= 1, o) {
    case 0:
      this.currentBlockType = F.RawInflateStream.BlockType.UNCOMPRESSED;
      break;
    case 1:
      this.currentBlockType = F.RawInflateStream.BlockType.FIXED;
      break;
    case 2:
      this.currentBlockType = F.RawInflateStream.BlockType.DYNAMIC;
      break;
    default:
      throw new Error("unknown BTYPE: " + o);
  }
  this.status = F.RawInflateStream.Status.BLOCK_HEADER_END;
};
F.RawInflateStream.prototype.readBits = function(o) {
  for (var e = this.bitsbuf, a = this.bitsbuflen, t = this.input, i = this.ip, n; a < o; ) {
    if (t.length <= i)
      return -1;
    n = t[i++], e |= n << a, a += 8;
  }
  return n = e & /* MASK */
  (1 << o) - 1, e >>>= o, a -= o, this.bitsbuf = e, this.bitsbuflen = a, this.ip = i, n;
};
F.RawInflateStream.prototype.readCodeByTable = function(o) {
  for (var e = this.bitsbuf, a = this.bitsbuflen, t = this.input, i = this.ip, n = o[0], r = o[1], s, f, c; a < r; ) {
    if (t.length <= i)
      return -1;
    s = t[i++], e |= s << a, a += 8;
  }
  if (f = n[e & (1 << r) - 1], c = f >>> 16, c > a)
    throw new Error("invalid code length: " + c);
  return this.bitsbuf = e >> c, this.bitsbuflen = a - c, this.ip = i, f & 65535;
};
F.RawInflateStream.prototype.readUncompressedBlockHeader = function() {
  var o, e, a = this.input, t = this.ip;
  if (this.status = F.RawInflateStream.Status.BLOCK_BODY_START, t + 4 >= a.length)
    return -1;
  if (o = a[t++] | a[t++] << 8, e = a[t++] | a[t++] << 8, o === ~e)
    throw new Error("invalid uncompressed block header: length verify");
  this.bitsbuf = 0, this.bitsbuflen = 0, this.ip = t, this.blockLength = o, this.status = F.RawInflateStream.Status.BLOCK_BODY_END;
};
F.RawInflateStream.prototype.parseUncompressedBlock = function() {
  var o = this.input, e = this.ip, a = this.output, t = this.op, i = this.blockLength;
  for (this.status = F.RawInflateStream.Status.DECODE_BLOCK_START; i--; ) {
    if (t === a.length && (a = this.expandBuffer({ fixRatio: 2 })), e >= o.length)
      return this.ip = e, this.op = t, this.blockLength = i + 1, -1;
    a[t++] = o[e++];
  }
  return i < 0 && (this.status = F.RawInflateStream.Status.DECODE_BLOCK_END), this.ip = e, this.op = t, 0;
};
F.RawInflateStream.prototype.parseFixedHuffmanBlock = function() {
  return this.status = F.RawInflateStream.Status.BLOCK_BODY_START, this.litlenTable = F.RawInflateStream.FixedLiteralLengthTable, this.distTable = F.RawInflateStream.FixedDistanceTable, this.status = F.RawInflateStream.Status.BLOCK_BODY_END, 0;
};
F.RawInflateStream.prototype.save_ = function() {
  this.ip_ = this.ip, this.bitsbuflen_ = this.bitsbuflen, this.bitsbuf_ = this.bitsbuf;
};
F.RawInflateStream.prototype.restore_ = function() {
  this.ip = this.ip_, this.bitsbuflen = this.bitsbuflen_, this.bitsbuf = this.bitsbuf_;
};
F.RawInflateStream.prototype.parseDynamicHuffmanBlock = function() {
  var o, e, a, t = new Uint8Array(F.RawInflateStream.Order.length), i;
  if (this.status = F.RawInflateStream.Status.BLOCK_BODY_START, this.save_(), o = this.readBits(5) + 257, e = this.readBits(5) + 1, a = this.readBits(4) + 4, o < 0 || e < 0 || a < 0)
    return this.restore_(), -1;
  try {
    n.call(this);
  } catch {
    return this.restore_(), -1;
  }
  function n() {
    var r, s, f = 0, c, h, d, w;
    for (d = 0; d < a; ++d) {
      if ((r = this.readBits(3)) < 0)
        throw new Error("not enough input");
      t[F.RawInflateStream.Order[d]] = r;
    }
    for (i = H(t), h = new Uint8Array(o + e), d = 0, w = o + e; d < w; ) {
      if (s = this.readCodeByTable(i), s < 0)
        throw new Error("not enough input");
      switch (s) {
        case 16:
          if ((r = this.readBits(2)) < 0)
            throw new Error("not enough input");
          for (c = 3 + r; c--; )
            h[d++] = f;
          break;
        case 17:
          if ((r = this.readBits(3)) < 0)
            throw new Error("not enough input");
          for (c = 3 + r; c--; )
            h[d++] = 0;
          f = 0;
          break;
        case 18:
          if ((r = this.readBits(7)) < 0)
            throw new Error("not enough input");
          for (c = 11 + r; c--; )
            h[d++] = 0;
          f = 0;
          break;
        default:
          h[d++] = s, f = s;
          break;
      }
    }
    this.litlenTable = H(h.subarray(0, o)), this.distTable = H(h.subarray(o));
  }
  return this.status = F.RawInflateStream.Status.BLOCK_BODY_END, 0;
};
F.RawInflateStream.prototype.decodeHuffman = function() {
  var o = this.output, e = this.op, a, t, i, n, r = this.litlenTable, s = this.distTable, f = o.length, c;
  for (this.status = F.RawInflateStream.Status.DECODE_BLOCK_START; ; ) {
    if (this.save_(), a = this.readCodeByTable(r), a < 0)
      return this.op = e, this.restore_(), -1;
    if (a === 256)
      break;
    if (a < 256) {
      e === f && (o = this.expandBuffer(), f = o.length), o[e++] = a;
      continue;
    }
    if (t = a - 257, n = F.RawInflateStream.LengthCodeTable[t], F.RawInflateStream.LengthExtraTable[t] > 0) {
      if (c = this.readBits(F.RawInflateStream.LengthExtraTable[t]), c < 0)
        return this.op = e, this.restore_(), -1;
      n += c;
    }
    if (a = this.readCodeByTable(s), a < 0)
      return this.op = e, this.restore_(), -1;
    if (i = F.RawInflateStream.DistCodeTable[a], F.RawInflateStream.DistExtraTable[a] > 0) {
      if (c = this.readBits(F.RawInflateStream.DistExtraTable[a]), c < 0)
        return this.op = e, this.restore_(), -1;
      i += c;
    }
    for (e + n >= f && (o = this.expandBuffer(), f = o.length); n--; )
      o[e] = o[e++ - i];
    if (this.ip === this.input.length)
      return this.op = e, -1;
  }
  for (; this.bitsbuflen >= 8; )
    this.bitsbuflen -= 8, this.ip--;
  this.op = e, this.status = F.RawInflateStream.Status.DECODE_BLOCK_END;
};
F.RawInflateStream.prototype.expandBuffer = function(o) {
  var e, a = this.input.length / this.ip + 1 | 0, t, i, n, r = this.input, s = this.output;
  return o && (typeof o.fixRatio == "number" && (a = o.fixRatio), typeof o.addRatio == "number" && (a += o.addRatio)), a < 2 ? (t = (r.length - this.ip) / this.litlenTable[2], n = t / 2 * 258 | 0, i = n < s.length ? s.length + n : s.length << 1) : i = s.length * a, e = new Uint8Array(i), e.set(s), this.output = e, this.output;
};
F.RawInflateStream.prototype.concatBuffer = function() {
  var o, e = this.op, a;
  return this.resize ? o = new Uint8Array(this.output.subarray(this.sp, e)) : o = this.output.subarray(this.sp, e), this.sp = e, e > F.RawInflateStream.MaxBackwardLength + this.bufferSize && (this.op = this.sp = F.RawInflateStream.MaxBackwardLength, a = /** @type {Uint8Array} */
  this.output, this.output = new Uint8Array(this.bufferSize + F.RawInflateStream.MaxBackwardLength), this.output.set(a.subarray(e - F.RawInflateStream.MaxBackwardLength, e))), o;
};
F.Inflate = function(o, e) {
  var a, t;
  if (this.input = o, this.ip = 0, this.rawinflate, this.verify, (e || !(e = {})) && (e.index && (this.ip = e.index), e.verify && (this.verify = e.verify)), a = o[this.ip++], t = o[this.ip++], (a & 15) === F.CompressionMethod.DEFLATE)
    this.method = F.CompressionMethod.DEFLATE;
  else
    throw new Error("unsupported compression method");
  if (((a << 8) + t) % 31 !== 0)
    throw new Error("invalid fcheck flag:" + ((a << 8) + t) % 31);
  if (t & 32)
    throw new Error("fdict flag is not supported");
  this.rawinflate = new F.RawInflate(o, {
    index: this.ip,
    bufferSize: e.bufferSize,
    bufferType: e.bufferType,
    resize: e.resize
  });
};
F.Inflate.BufferType = F.RawInflate.BufferType;
F.Inflate.prototype.decompress = function() {
  var o = this.input, e, a;
  if (e = this.rawinflate.decompress(), this.ip = this.rawinflate.ip, this.verify && (a = (o[this.ip++] << 24 | o[this.ip++] << 16 | o[this.ip++] << 8 | o[this.ip++]) >>> 0, a !== F.Adler32(e)))
    throw new Error("invalid adler-32 checksum");
  return e;
};
F.InflateStream = function(o) {
  this.input = o === void 0 ? new Uint8Array() : o, this.ip = 0, this.rawinflate = new F.RawInflateStream(this.input, this.ip), this.method, this.output = this.rawinflate.output;
};
F.InflateStream.prototype.decompress = function(o) {
  var e;
  if (o !== void 0) {
    var a = new Uint8Array(this.input.length + o.length);
    a.set(this.input, 0), a.set(o, this.input.length), this.input = a;
  }
  return this.method === void 0 && this.readHeader() < 0 ? new Uint8Array() : (e = this.rawinflate.decompress(this.input, this.ip), this.rawinflate.ip !== 0 && (this.input = this.input.subarray(this.rawinflate.ip), this.ip = 0), e);
};
F.InflateStream.prototype.readHeader = function() {
  var o = this.ip, e = this.input, a = e[o++], t = e[o++];
  if (a === void 0 || t === void 0)
    return -1;
  if ((a & 15) === F.CompressionMethod.DEFLATE)
    this.method = F.CompressionMethod.DEFLATE;
  else
    throw new Error("unsupported compression method");
  if (((a << 8) + t) % 31 !== 0)
    throw new Error("invalid fcheck flag:" + ((a << 8) + t) % 31);
  if (t & 32)
    throw new Error("fdict flag is not supported");
  this.ip = o;
};
F.Gunzip = function(o, e) {
  this.input = o, this.ip = 0, this.member = [], this.decompressed = !1;
};
F.Gunzip.prototype.getMembers = function() {
  return this.decompressed || this.decompress(), this.member.slice();
};
F.Gunzip.prototype.decompress = function() {
  for (var o = this.input.length; this.ip < o; )
    this.decodeMember();
  return this.decompressed = !0, this.concatMember();
};
F.Gunzip.prototype.decodeMember = function() {
  var o = new F.GunzipMember(), e, a, t, i, n, r, s, f, c, h = this.input, d = this.ip;
  if (o.id1 = h[d++], o.id2 = h[d++], o.id1 !== 31 || o.id2 !== 139)
    throw new Error("invalid file signature:" + o.id1 + "," + o.id2);
  if (o.cm = h[d++], o.cm !== 8)
    throw new Error("unknown compression method: " + o.cm);
  if (o.flg = h[d++], f = h[d++] | h[d++] << 8 | h[d++] << 16 | h[d++] << 24, o.mtime = new Date(f * 1e3), o.xfl = h[d++], o.os = h[d++], (o.flg & F.Gzip.FlagsMask.FEXTRA) > 0 && (o.xlen = h[d++] | h[d++] << 8, d = this.decodeSubField(d, o.xlen)), (o.flg & F.Gzip.FlagsMask.FNAME) > 0) {
    for (s = [], r = 0; (n = h[d++]) > 0; )
      s[r++] = String.fromCharCode(n);
    o.name = s.join("");
  }
  if ((o.flg & F.Gzip.FlagsMask.FCOMMENT) > 0) {
    for (s = [], r = 0; (n = h[d++]) > 0; )
      s[r++] = String.fromCharCode(n);
    o.comment = s.join("");
  }
  if ((o.flg & F.Gzip.FlagsMask.FHCRC) > 0 && (o.crc16 = F.CRC32.calc(h, 0, d) & 65535, o.crc16 !== (h[d++] | h[d++] << 8)))
    throw new Error("invalid header crc16");
  if (e = h[h.length - 4] | h[h.length - 3] << 8 | h[h.length - 2] << 16 | h[h.length - 1] << 24, h.length - d - /* CRC-32 */
  4 - /* ISIZE */
  4 < e * 512 && (i = e), a = new F.RawInflate(h, { index: d, bufferSize: i }), o.data = t = a.decompress(), d = a.ip, o.crc32 = c = (h[d++] | h[d++] << 8 | h[d++] << 16 | h[d++] << 24) >>> 0, F.CRC32.calc(t) !== c)
    throw new Error("invalid CRC-32 checksum: 0x" + F.CRC32.calc(t).toString(16) + " / 0x" + c.toString(16));
  if (o.isize = e = (h[d++] | h[d++] << 8 | h[d++] << 16 | h[d++] << 24) >>> 0, (t.length & 4294967295) !== e)
    throw new Error("invalid input size: " + (t.length & 4294967295) + " / " + e);
  this.member.push(o), this.ip = d;
};
F.Gunzip.prototype.decodeSubField = function(o, e) {
  return o + e;
};
F.Gunzip.prototype.concatMember = function() {
  var o = this.member, e, a, t = 0, i = 0, n;
  for (e = 0, a = o.length; e < a; ++e)
    i += o[e].data.length;
  for (n = new Uint8Array(i), e = 0; e < a; ++e)
    n.set(o[e].data, t), t += o[e].data.length;
  return n;
};
F.GunzipMember = function() {
  this.id1, this.id2, this.cm, this.flg, this.mtime, this.xfl, this.os, this.crc16, this.xlen, this.crc32, this.isize, this.name, this.comment, this.data;
};
F.GunzipMember.prototype.getName = function() {
  return this.name;
};
F.GunzipMember.prototype.getData = function() {
  return this.data;
};
F.GunzipMember.prototype.getMtime = function() {
  return this.mtime;
};
F.Gzip = function(o, e) {
  this.input = o, this.ip = 0, this.output, this.op = 0, this.flags = {}, this.filename, this.comment, this.deflateOptions, e && (e.flags && (this.flags = e.flags), typeof e.filename == "string" && (this.filename = e.filename), typeof e.comment == "string" && (this.comment = e.comment), e.deflateOptions && (this.deflateOptions = e.deflateOptions)), this.deflateOptions || (this.deflateOptions = {});
};
F.Gzip.DefaultBufferSize = 32768;
F.Gzip.prototype.compress = function() {
  var o, e, a, t, i, n, r, s, f = new Uint8Array(F.Gzip.DefaultBufferSize), c = 0, h = this.input, d = this.ip, w = this.filename, u = this.comment;
  if (f[c++] = 31, f[c++] = 139, f[c++] = 8, o = 0, this.flags.fname && (o |= F.Gzip.FlagsMask.FNAME), this.flags.fcomment && (o |= F.Gzip.FlagsMask.FCOMMENT), this.flags.fhcrc && (o |= F.Gzip.FlagsMask.FHCRC), f[c++] = o, e = (Date.now ? Date.now() : +/* @__PURE__ */ new Date()) / 1e3 | 0, f[c++] = e & 255, f[c++] = e >>> 8 & 255, f[c++] = e >>> 16 & 255, f[c++] = e >>> 24 & 255, f[c++] = 0, f[c++] = F.Gzip.OperatingSystem.UNKNOWN, this.flags.fname !== void 0) {
    for (r = 0, s = w.length; r < s; ++r)
      n = w.charCodeAt(r), n > 255 && (f[c++] = n >>> 8 & 255), f[c++] = n & 255;
    f[c++] = 0;
  }
  if (this.flags.comment) {
    for (r = 0, s = u.length; r < s; ++r)
      n = u.charCodeAt(r), n > 255 && (f[c++] = n >>> 8 & 255), f[c++] = n & 255;
    f[c++] = 0;
  }
  return this.flags.fhcrc && (a = F.CRC32.calc(f, 0, c) & 65535, f[c++] = a & 255, f[c++] = a >>> 8 & 255), this.deflateOptions.outputBuffer = f, this.deflateOptions.outputIndex = c, i = new F.RawDeflate(h, this.deflateOptions), f = i.compress(), c = i.op, c + 8 > f.buffer.byteLength ? (this.output = new Uint8Array(c + 8), this.output.set(new Uint8Array(f.buffer)), f = this.output) : f = new Uint8Array(f.buffer), t = F.CRC32.calc(h), f[c++] = t & 255, f[c++] = t >>> 8 & 255, f[c++] = t >>> 16 & 255, f[c++] = t >>> 24 & 255, s = h.length, f[c++] = s & 255, f[c++] = s >>> 8 & 255, f[c++] = s >>> 16 & 255, f[c++] = s >>> 24 & 255, this.ip = d, c < f.length && (this.output = f = f.subarray(0, c)), f;
};
F.Gzip.OperatingSystem = {
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
F.Gzip.FlagsMask = {
  FTEXT: 1,
  FHCRC: 2,
  FEXTRA: 4,
  FNAME: 8,
  FCOMMENT: 16
};
F.Heap = function(o) {
  this.buffer = new Uint16Array(o * 2), this.length = 0;
};
F.Heap.prototype.getParent = function(o) {
  return ((o - 2) / 4 | 0) * 2;
};
F.Heap.prototype.getChild = function(o) {
  return 2 * o + 2;
};
F.Heap.prototype.push = function(o, e) {
  var a, t, i = this.buffer, n;
  for (a = this.length, i[this.length++] = e, i[this.length++] = o; a > 0 && (t = this.getParent(a), i[a] > i[t]); )
    n = i[a], i[a] = i[t], i[t] = n, n = i[a + 1], i[a + 1] = i[t + 1], i[t + 1] = n, a = t;
  return this.length;
};
F.Heap.prototype.pop = function() {
  var o, e, a = this.buffer, t, i, n;
  for (e = a[0], o = a[1], this.length -= 2, a[0] = a[this.length], a[1] = a[this.length + 1], n = 0; i = this.getChild(n), !(i >= this.length); ) {
    if (i + 2 < this.length && a[i + 2] > a[i] && (i += 2), a[i] > a[n])
      t = a[n], a[n] = a[i], a[i] = t, t = a[n + 1], a[n + 1] = a[i + 1], a[i + 1] = t;
    else
      break;
    n = i;
  }
  return { index: o, value: e, length: this.length };
};
F.RawDeflate = function(o, e) {
  this.compressionType = F.RawDeflate.CompressionType.DYNAMIC, this.lazy = 0, this.freqsLitLen, this.freqsDist, this.input = o instanceof Array ? new Uint8Array(o) : o, this.output, this.op = 0, e && (e.lazy && (this.lazy = e.lazy), typeof e.compressionType == "number" && (this.compressionType = e.compressionType), e.outputBuffer && (this.output = e.outputBuffer instanceof Array ? new Uint8Array(e.outputBuffer) : e.outputBuffer), typeof e.outputIndex == "number" && (this.op = e.outputIndex)), this.output || (this.output = new Uint8Array(32768));
};
F.RawDeflate.CompressionType = {
  NONE: 0,
  FIXED: 1,
  DYNAMIC: 2,
  RESERVED: 3
};
F.RawDeflate.Lz77MinLength = 3;
F.RawDeflate.Lz77MaxLength = 258;
F.RawDeflate.WindowSize = 32768;
F.RawDeflate.MaxCodeLength = 16;
F.RawDeflate.HUFMAX = 286;
F.RawDeflate.FixedHuffmanTable = (function() {
  var o = [], e;
  for (e = 0; e < 288; e++)
    switch (!0) {
      case e <= 143:
        o.push([e + 48, 8]);
        break;
      case e <= 255:
        o.push([e - 144 + 400, 9]);
        break;
      case e <= 279:
        o.push([e - 256 + 0, 7]);
        break;
      case e <= 287:
        o.push([e - 280 + 192, 8]);
        break;
      default:
        throw "invalid literal: " + e;
    }
  return o;
})();
F.RawDeflate.prototype.compress = function() {
  var o, e, a, t = this.input;
  switch (this.compressionType) {
    case F.RawDeflate.CompressionType.NONE:
      for (e = 0, a = t.length; e < a; )
        o = t.subarray(e, e + 65535), e += o.length, this.makeNocompressBlock(o, e === a);
      break;
    case F.RawDeflate.CompressionType.FIXED:
      this.output = this.makeFixedHuffmanBlock(t, !0), this.op = this.output.length;
      break;
    case F.RawDeflate.CompressionType.DYNAMIC:
      this.output = this.makeDynamicHuffmanBlock(t, !0), this.op = this.output.length;
      break;
    default:
      throw "invalid compression type";
  }
  return this.output;
};
F.RawDeflate.prototype.makeNocompressBlock = function(o, e) {
  var a, t, i, n, r = this.output, s = this.op;
  {
    for (r = new Uint8Array(this.output.buffer); r.length <= s + o.length + 5; )
      r = new Uint8Array(r.length << 1);
    r.set(this.output);
  }
  return a = e ? 1 : 0, t = F.RawDeflate.CompressionType.NONE, r[s++] = a | t << 1, i = o.length, n = ~i + 65536 & 65535, r[s++] = i & 255, r[s++] = i >>> 8 & 255, r[s++] = n & 255, r[s++] = n >>> 8 & 255, r.set(o, s), s += o.length, r = r.subarray(0, s), this.op = s, this.output = r, r;
};
F.RawDeflate.prototype.makeFixedHuffmanBlock = function(o, e) {
  var a = new F.BitStream(new Uint8Array(this.output.buffer), this.op), t, i, n;
  return t = e ? 1 : 0, i = F.RawDeflate.CompressionType.FIXED, a.writeBits(t, 1, !0), a.writeBits(i, 2, !0), n = this.lz77(o), this.fixedHuffman(n, a), a.finish();
};
F.RawDeflate.prototype.makeDynamicHuffmanBlock = function(o, e) {
  var a = new F.BitStream(new Uint8Array(this.output.buffer), this.op), t, i, n, r, s, f, c = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], h, d, w, u, p, m, N = new Array(19), l, b, z, I, C;
  for (t = e ? 1 : 0, i = F.RawDeflate.CompressionType.DYNAMIC, a.writeBits(t, 1, !0), a.writeBits(i, 2, !0), n = this.lz77(o), h = this.getLengths_(this.freqsLitLen, 15), d = this.getCodesFromLengths_(h), w = this.getLengths_(this.freqsDist, 7), u = this.getCodesFromLengths_(w), r = 286; r > 257 && h[r - 1] === 0; r--)
    ;
  for (s = 30; s > 1 && w[s - 1] === 0; s--)
    ;
  for (p = this.getTreeSymbols_(r, h, s, w), m = this.getLengths_(p.freqs, 7), I = 0; I < 19; I++)
    N[I] = m[c[I]];
  for (f = 19; f > 4 && N[f - 1] === 0; f--)
    ;
  for (l = this.getCodesFromLengths_(m), a.writeBits(r - 257, 5, !0), a.writeBits(s - 1, 5, !0), a.writeBits(f - 4, 4, !0), I = 0; I < f; I++)
    a.writeBits(N[I], 3, !0);
  for (I = 0, C = p.codes.length; I < C; I++)
    if (b = p.codes[I], a.writeBits(l[b], m[b], !0), b >= 16) {
      switch (I++, b) {
        case 16:
          z = 2;
          break;
        case 17:
          z = 3;
          break;
        case 18:
          z = 7;
          break;
        default:
          throw "invalid code: " + b;
      }
      a.writeBits(p.codes[I], z, !0);
    }
  return this.dynamicHuffman(
    n,
    [d, h],
    [u, w],
    a
  ), a.finish();
};
F.RawDeflate.prototype.dynamicHuffman = function(o, e, a, t) {
  var i, n, r, s, f, c, h, d;
  for (f = e[0], c = e[1], h = a[0], d = a[1], i = 0, n = o.length; i < n; ++i)
    if (r = o[i], t.writeBits(f[r], c[r], !0), r > 256)
      t.writeBits(o[++i], o[++i], !0), s = o[++i], t.writeBits(h[s], d[s], !0), t.writeBits(o[++i], o[++i], !0);
    else if (r === 256)
      break;
  return t;
};
F.RawDeflate.prototype.fixedHuffman = function(o, e) {
  var a, t, i;
  for (a = 0, t = o.length; a < t; a++)
    if (i = o[a], F.BitStream.prototype.writeBits.apply(
      e,
      F.RawDeflate.FixedHuffmanTable[i]
    ), i > 256)
      e.writeBits(o[++a], o[++a], !0), e.writeBits(o[++a], 5), e.writeBits(o[++a], o[++a], !0);
    else if (i === 256)
      break;
  return e;
};
F.RawDeflate.Lz77Match = function(o, e) {
  this.length = o, this.backwardDistance = e;
};
F.RawDeflate.Lz77Match.LengthCodeTable = (function(o) {
  return new Uint32Array(o);
})((function() {
  var o = [], e, a;
  for (e = 3; e <= 258; e++)
    a = t(e), o[e] = a[2] << 24 | a[1] << 16 | a[0];
  function t(i) {
    switch (!0) {
      case i === 3:
        return [257, i - 3, 0];
      case i === 4:
        return [258, i - 4, 0];
      case i === 5:
        return [259, i - 5, 0];
      case i === 6:
        return [260, i - 6, 0];
      case i === 7:
        return [261, i - 7, 0];
      case i === 8:
        return [262, i - 8, 0];
      case i === 9:
        return [263, i - 9, 0];
      case i === 10:
        return [264, i - 10, 0];
      case i <= 12:
        return [265, i - 11, 1];
      case i <= 14:
        return [266, i - 13, 1];
      case i <= 16:
        return [267, i - 15, 1];
      case i <= 18:
        return [268, i - 17, 1];
      case i <= 22:
        return [269, i - 19, 2];
      case i <= 26:
        return [270, i - 23, 2];
      case i <= 30:
        return [271, i - 27, 2];
      case i <= 34:
        return [272, i - 31, 2];
      case i <= 42:
        return [273, i - 35, 3];
      case i <= 50:
        return [274, i - 43, 3];
      case i <= 58:
        return [275, i - 51, 3];
      case i <= 66:
        return [276, i - 59, 3];
      case i <= 82:
        return [277, i - 67, 4];
      case i <= 98:
        return [278, i - 83, 4];
      case i <= 114:
        return [279, i - 99, 4];
      case i <= 130:
        return [280, i - 115, 4];
      case i <= 162:
        return [281, i - 131, 5];
      case i <= 194:
        return [282, i - 163, 5];
      case i <= 226:
        return [283, i - 195, 5];
      case i <= 257:
        return [284, i - 227, 5];
      case i === 258:
        return [285, i - 258, 0];
      default:
        throw "invalid length: " + i;
    }
  }
  return o;
})());
F.RawDeflate.Lz77Match.prototype.getDistanceCode_ = function(o) {
  var e;
  switch (!0) {
    case o === 1:
      e = [0, o - 1, 0];
      break;
    case o === 2:
      e = [1, o - 2, 0];
      break;
    case o === 3:
      e = [2, o - 3, 0];
      break;
    case o === 4:
      e = [3, o - 4, 0];
      break;
    case o <= 6:
      e = [4, o - 5, 1];
      break;
    case o <= 8:
      e = [5, o - 7, 1];
      break;
    case o <= 12:
      e = [6, o - 9, 2];
      break;
    case o <= 16:
      e = [7, o - 13, 2];
      break;
    case o <= 24:
      e = [8, o - 17, 3];
      break;
    case o <= 32:
      e = [9, o - 25, 3];
      break;
    case o <= 48:
      e = [10, o - 33, 4];
      break;
    case o <= 64:
      e = [11, o - 49, 4];
      break;
    case o <= 96:
      e = [12, o - 65, 5];
      break;
    case o <= 128:
      e = [13, o - 97, 5];
      break;
    case o <= 192:
      e = [14, o - 129, 6];
      break;
    case o <= 256:
      e = [15, o - 193, 6];
      break;
    case o <= 384:
      e = [16, o - 257, 7];
      break;
    case o <= 512:
      e = [17, o - 385, 7];
      break;
    case o <= 768:
      e = [18, o - 513, 8];
      break;
    case o <= 1024:
      e = [19, o - 769, 8];
      break;
    case o <= 1536:
      e = [20, o - 1025, 9];
      break;
    case o <= 2048:
      e = [21, o - 1537, 9];
      break;
    case o <= 3072:
      e = [22, o - 2049, 10];
      break;
    case o <= 4096:
      e = [23, o - 3073, 10];
      break;
    case o <= 6144:
      e = [24, o - 4097, 11];
      break;
    case o <= 8192:
      e = [25, o - 6145, 11];
      break;
    case o <= 12288:
      e = [26, o - 8193, 12];
      break;
    case o <= 16384:
      e = [27, o - 12289, 12];
      break;
    case o <= 24576:
      e = [28, o - 16385, 13];
      break;
    case o <= 32768:
      e = [29, o - 24577, 13];
      break;
    default:
      throw "invalid distance";
  }
  return e;
};
F.RawDeflate.Lz77Match.prototype.toLz77Array = function() {
  var o = this.length, e = this.backwardDistance, a = [], t = 0, i;
  return i = F.RawDeflate.Lz77Match.LengthCodeTable[o], a[t++] = i & 65535, a[t++] = i >> 16 & 255, a[t++] = i >> 24, i = this.getDistanceCode_(e), a[t++] = i[0], a[t++] = i[1], a[t++] = i[2], a;
};
F.RawDeflate.prototype.lz77 = function(o) {
  var e, a, t, i, n, r = {}, s = F.RawDeflate.WindowSize, f, c, h, d = new Uint16Array(o.length * 2), w = 0, u = 0, p = new Uint32Array(286), m = new Uint32Array(30), N = this.lazy, l;
  p[256] = 1;
  function b(z, I) {
    var C = z.toLz77Array(), x, g;
    for (x = 0, g = C.length; x < g; ++x)
      d[w++] = C[x];
    p[C[0]]++, m[C[3]]++, u = z.length + I - 1, h = null;
  }
  for (e = 0, a = o.length; e < a; ++e) {
    for (n = 0, t = 0, i = F.RawDeflate.Lz77MinLength; t < i && e + t !== a; ++t)
      n = n << 8 | o[e + t];
    if (r[n] === void 0 && (r[n] = []), f = r[n], u-- > 0) {
      f.push(e);
      continue;
    }
    for (; f.length > 0 && e - f[0] > s; )
      f.shift();
    if (e + F.RawDeflate.Lz77MinLength >= a) {
      for (h && b(h, -1), t = 0, i = a - e; t < i; ++t)
        l = o[e + t], d[w++] = l, ++p[l];
      break;
    }
    f.length > 0 ? (c = this.searchLongestMatch_(o, e, f), h ? h.length < c.length ? (l = o[e - 1], d[w++] = l, ++p[l], b(c, 0)) : b(h, -1) : c.length < N ? h = c : b(c, 0)) : h ? b(h, -1) : (l = o[e], d[w++] = l, ++p[l]), f.push(e);
  }
  return d[w++] = 256, p[256]++, this.freqsLitLen = p, this.freqsDist = m, /** @type {!(Uint16Array|Array.<number>)} */
  d.subarray(0, w);
};
F.RawDeflate.prototype.searchLongestMatch_ = function(o, e, a) {
  var t, i, n = 0, r, s, f, c, h = o.length;
  e:
    for (s = 0, c = a.length; s < c; s++) {
      if (t = a[c - s - 1], r = F.RawDeflate.Lz77MinLength, n > F.RawDeflate.Lz77MinLength) {
        for (f = n; f > F.RawDeflate.Lz77MinLength; f--)
          if (o[t + f - 1] !== o[e + f - 1])
            continue e;
        r = n;
      }
      for (; r < F.RawDeflate.Lz77MaxLength && e + r < h && o[t + r] === o[e + r]; )
        ++r;
      if (r > n && (i = t, n = r), r === F.RawDeflate.Lz77MaxLength)
        break;
    }
  return new F.RawDeflate.Lz77Match(n, e - i);
};
F.RawDeflate.prototype.getTreeSymbols_ = function(o, e, a, t) {
  var i = new Uint32Array(o + a), n, r, s, f, c = new Uint32Array(316), h, d, w = new Uint8Array(19);
  for (r = 0, n = 0; n < o; n++)
    i[r++] = e[n];
  for (n = 0; n < a; n++)
    i[r++] = t[n];
  for (h = 0, n = 0, f = i.length; n < f; n += r) {
    for (r = 1; n + r < f && i[n + r] === i[n]; ++r)
      ;
    if (s = r, i[n] === 0)
      if (s < 3)
        for (; s-- > 0; )
          c[h++] = 0, w[0]++;
      else
        for (; s > 0; )
          d = s < 138 ? s : 138, d > s - 3 && d < s && (d = s - 3), d <= 10 ? (c[h++] = 17, c[h++] = d - 3, w[17]++) : (c[h++] = 18, c[h++] = d - 11, w[18]++), s -= d;
    else if (c[h++] = i[n], w[i[n]]++, s--, s < 3)
      for (; s-- > 0; )
        c[h++] = i[n], w[i[n]]++;
    else
      for (; s > 0; )
        d = s < 6 ? s : 6, d > s - 3 && d < s && (d = s - 3), c[h++] = 16, c[h++] = d - 3, w[16]++, s -= d;
  }
  return {
    codes: c.subarray(0, h),
    freqs: w
  };
};
F.RawDeflate.prototype.getLengths_ = function(o, e) {
  var a = o.length, t = new F.Heap(2 * F.RawDeflate.HUFMAX), i = new Uint8Array(a), n, r, s, f, c;
  for (f = 0; f < a; ++f)
    o[f] > 0 && t.push(f, o[f]);
  if (n = new Array(t.length / 2), r = new Uint32Array(t.length / 2), n.length === 1)
    return i[t.pop().index] = 1, i;
  for (f = 0, c = t.length / 2; f < c; ++f)
    n[f] = t.pop(), r[f] = n[f].value;
  for (s = this.reversePackageMerge_(r, r.length, e), f = 0, c = n.length; f < c; ++f)
    i[n[f].index] = s[f];
  return i;
};
F.RawDeflate.prototype.reversePackageMerge_ = function(o, e, a) {
  var t = new Uint16Array(a), i = new Uint8Array(a), n = new Uint8Array(e), r = new Array(a), s = new Array(a), f = new Array(a), c = (1 << a) - e, h = 1 << a - 1, d, w, u, p, m;
  function N(l) {
    var b = s[l][f[l]];
    b === e ? (N(l + 1), N(l + 1)) : --n[b], ++f[l];
  }
  for (t[a - 1] = e, w = 0; w < a; ++w)
    c < h ? i[w] = 0 : (i[w] = 1, c -= h), c <<= 1, t[a - 2 - w] = (t[a - 1 - w] / 2 | 0) + e;
  for (t[0] = i[0], r[0] = new Array(t[0]), s[0] = new Array(t[0]), w = 1; w < a; ++w)
    t[w] > 2 * t[w - 1] + i[w] && (t[w] = 2 * t[w - 1] + i[w]), r[w] = new Array(t[w]), s[w] = new Array(t[w]);
  for (d = 0; d < e; ++d)
    n[d] = a;
  for (u = 0; u < t[a - 1]; ++u)
    r[a - 1][u] = o[u], s[a - 1][u] = u;
  for (d = 0; d < a; ++d)
    f[d] = 0;
  for (i[a - 1] === 1 && (--n[0], ++f[a - 1]), w = a - 2; w >= 0; --w) {
    for (d = 0, p = 0, m = f[w + 1], u = 0; u < t[w]; u++)
      p = r[w + 1][m] + r[w + 1][m + 1], p > o[d] ? (r[w][u] = p, s[w][u] = e, m += 2) : (r[w][u] = o[d], s[w][u] = d, ++d);
    f[w] = 0, i[w] === 1 && N(w);
  }
  return n;
};
F.RawDeflate.prototype.getCodesFromLengths_ = function(o) {
  var e = new Uint16Array(o.length), a = [], t = [], i = 0, n, r, s, f;
  for (n = 0, r = o.length; n < r; n++)
    a[o[n]] = (a[o[n]] | 0) + 1;
  for (n = 1, r = F.RawDeflate.MaxCodeLength; n <= r; n++)
    t[n] = i, i += a[n] | 0, i <<= 1;
  for (n = 0, r = o.length; n < r; n++)
    for (i = t[o[n]], t[o[n]] += 1, e[n] = 0, s = 0, f = o[n]; s < f; s++)
      e[n] = e[n] << 1 | i & 1, i >>>= 1;
  return e;
};
F.Unzip = function(o, e) {
  e = e || {}, this.input = o instanceof Array ? new Uint8Array(o) : o, this.ip = 0, this.eocdrOffset, this.numberOfThisDisk, this.startDisk, this.totalEntriesThisDisk, this.totalEntries, this.centralDirectorySize, this.centralDirectoryOffset, this.commentLength, this.comment, this.fileHeaderList, this.filenameToIndex, this.verify = e.verify || !1, this.password = e.password;
};
F.Unzip.CompressionMethod = F.Zip.CompressionMethod;
F.Unzip.FileHeaderSignature = F.Zip.FileHeaderSignature;
F.Unzip.LocalFileHeaderSignature = F.Zip.LocalFileHeaderSignature;
F.Unzip.CentralDirectorySignature = F.Zip.CentralDirectorySignature;
F.Unzip.FileHeader = function(o, e) {
  this.input = o, this.offset = e, this.length, this.version, this.os, this.needVersion, this.flags, this.compression, this.time, this.date, this.crc32, this.compressedSize, this.plainSize, this.fileNameLength, this.extraFieldLength, this.fileCommentLength, this.diskNumberStart, this.internalFileAttributes, this.externalFileAttributes, this.relativeOffset, this.filename, this.extraField, this.comment;
};
F.Unzip.FileHeader.prototype.parse = function() {
  var o = this.input, e = this.offset;
  if (o[e++] !== F.Unzip.FileHeaderSignature[0] || o[e++] !== F.Unzip.FileHeaderSignature[1] || o[e++] !== F.Unzip.FileHeaderSignature[2] || o[e++] !== F.Unzip.FileHeaderSignature[3])
    throw new Error("invalid file header signature");
  this.version = o[e++], this.os = o[e++], this.needVersion = o[e++] | o[e++] << 8, this.flags = o[e++] | o[e++] << 8, this.compression = o[e++] | o[e++] << 8, this.time = o[e++] | o[e++] << 8, this.date = o[e++] | o[e++] << 8, this.crc32 = (o[e++] | o[e++] << 8 | o[e++] << 16 | o[e++] << 24) >>> 0, this.compressedSize = (o[e++] | o[e++] << 8 | o[e++] << 16 | o[e++] << 24) >>> 0, this.plainSize = (o[e++] | o[e++] << 8 | o[e++] << 16 | o[e++] << 24) >>> 0, this.fileNameLength = o[e++] | o[e++] << 8, this.extraFieldLength = o[e++] | o[e++] << 8, this.fileCommentLength = o[e++] | o[e++] << 8, this.diskNumberStart = o[e++] | o[e++] << 8, this.internalFileAttributes = o[e++] | o[e++] << 8, this.externalFileAttributes = o[e++] | o[e++] << 8 | o[e++] << 16 | o[e++] << 24, this.relativeOffset = (o[e++] | o[e++] << 8 | o[e++] << 16 | o[e++] << 24) >>> 0, this.filename = String.fromCharCode.apply(
    null,
    o.subarray(e, e += this.fileNameLength)
  ), this.extraField = o.subarray(e, e += this.extraFieldLength), this.comment = o.subarray(e, e + this.fileCommentLength), this.length = e - this.offset;
};
F.Unzip.LocalFileHeader = function(o, e) {
  this.input = o, this.offset = e, this.length, this.needVersion, this.flags, this.compression, this.time, this.date, this.crc32, this.compressedSize, this.plainSize, this.fileNameLength, this.extraFieldLength, this.filename, this.extraField;
};
F.Unzip.LocalFileHeader.Flags = F.Zip.Flags;
F.Unzip.LocalFileHeader.prototype.parse = function() {
  var o = this.input, e = this.offset;
  if (o[e++] !== F.Unzip.LocalFileHeaderSignature[0] || o[e++] !== F.Unzip.LocalFileHeaderSignature[1] || o[e++] !== F.Unzip.LocalFileHeaderSignature[2] || o[e++] !== F.Unzip.LocalFileHeaderSignature[3])
    throw new Error("invalid local file header signature");
  this.needVersion = o[e++] | o[e++] << 8, this.flags = o[e++] | o[e++] << 8, this.compression = o[e++] | o[e++] << 8, this.time = o[e++] | o[e++] << 8, this.date = o[e++] | o[e++] << 8, this.crc32 = (o[e++] | o[e++] << 8 | o[e++] << 16 | o[e++] << 24) >>> 0, this.compressedSize = (o[e++] | o[e++] << 8 | o[e++] << 16 | o[e++] << 24) >>> 0, this.plainSize = (o[e++] | o[e++] << 8 | o[e++] << 16 | o[e++] << 24) >>> 0, this.fileNameLength = o[e++] | o[e++] << 8, this.extraFieldLength = o[e++] | o[e++] << 8, this.filename = String.fromCharCode.apply(
    null,
    o.subarray(e, e += this.fileNameLength)
  ), this.extraField = o.subarray(e, e += this.extraFieldLength), this.length = e - this.offset;
};
F.Unzip.prototype.searchEndOfCentralDirectoryRecord = function() {
  var o = this.input, e;
  for (e = o.length - 12; e > 0; --e)
    if (o[e] === F.Unzip.CentralDirectorySignature[0] && o[e + 1] === F.Unzip.CentralDirectorySignature[1] && o[e + 2] === F.Unzip.CentralDirectorySignature[2] && o[e + 3] === F.Unzip.CentralDirectorySignature[3]) {
      this.eocdrOffset = e;
      return;
    }
  throw new Error("End of Central Directory Record not found");
};
F.Unzip.prototype.parseEndOfCentralDirectoryRecord = function() {
  var o = this.input, e;
  if (this.eocdrOffset || this.searchEndOfCentralDirectoryRecord(), e = this.eocdrOffset, o[e++] !== F.Unzip.CentralDirectorySignature[0] || o[e++] !== F.Unzip.CentralDirectorySignature[1] || o[e++] !== F.Unzip.CentralDirectorySignature[2] || o[e++] !== F.Unzip.CentralDirectorySignature[3])
    throw new Error("invalid signature");
  this.numberOfThisDisk = o[e++] | o[e++] << 8, this.startDisk = o[e++] | o[e++] << 8, this.totalEntriesThisDisk = o[e++] | o[e++] << 8, this.totalEntries = o[e++] | o[e++] << 8, this.centralDirectorySize = (o[e++] | o[e++] << 8 | o[e++] << 16 | o[e++] << 24) >>> 0, this.centralDirectoryOffset = (o[e++] | o[e++] << 8 | o[e++] << 16 | o[e++] << 24) >>> 0, this.commentLength = o[e++] | o[e++] << 8, this.comment = o.subarray(e, e + this.commentLength);
};
F.Unzip.prototype.parseFileHeader = function() {
  var o = [], e = {}, a, t, i, n;
  if (!this.fileHeaderList) {
    for (this.centralDirectoryOffset === void 0 && this.parseEndOfCentralDirectoryRecord(), a = this.centralDirectoryOffset, i = 0, n = this.totalEntries; i < n; ++i)
      t = new F.Unzip.FileHeader(this.input, a), t.parse(), a += t.length, o[i] = t, e[t.filename] = i;
    if (this.centralDirectorySize < a - this.centralDirectoryOffset)
      throw new Error("invalid file header size");
    this.fileHeaderList = o, this.filenameToIndex = e;
  }
};
F.Unzip.prototype.getFileData = function(o, e) {
  e = e || {};
  var a = this.input, t = this.fileHeaderList, i, n, r, s, f, c, h, d;
  if (t || this.parseFileHeader(), t[o] === void 0)
    throw new Error("wrong index");
  if (n = t[o].relativeOffset, i = new F.Unzip.LocalFileHeader(this.input, n), i.parse(), n += i.length, r = i.compressedSize, (i.flags & F.Unzip.LocalFileHeader.Flags.ENCRYPT) !== 0) {
    if (!(e.password || this.password))
      throw new Error("please set password");
    for (c = this.createDecryptionKey(e.password || this.password), h = n, d = n + 12; h < d; ++h)
      this.decode(c, a[h]);
    for (n += 12, r -= 12, h = n, d = n + r; h < d; ++h)
      a[h] = this.decode(c, a[h]);
  }
  switch (i.compression) {
    case F.Unzip.CompressionMethod.STORE:
      s = this.input.subarray(n, n + r);
      break;
    case F.Unzip.CompressionMethod.DEFLATE:
      s = new F.RawInflate(this.input, {
        index: n,
        bufferSize: i.plainSize
      }).decompress();
      break;
    default:
      throw new Error("unknown compression type");
  }
  if (this.verify && (f = F.CRC32.calc(s), i.crc32 !== f))
    throw new Error(
      "wrong crc: file=0x" + i.crc32.toString(16) + ", data=0x" + f.toString(16)
    );
  return s;
};
F.Unzip.prototype.getFilenames = function() {
  var o = [], e, a, t;
  for (this.fileHeaderList || this.parseFileHeader(), t = this.fileHeaderList, e = 0, a = t.length; e < a; ++e)
    o[e] = t[e].filename;
  return o;
};
F.Unzip.prototype.decompress = function(o, e) {
  var a;
  if (this.filenameToIndex || this.parseFileHeader(), a = this.filenameToIndex[o], a === void 0)
    throw new Error(o + " not found");
  return this.getFileData(a, e);
};
F.Unzip.prototype.setPassword = function(o) {
  this.password = o;
};
F.Unzip.prototype.decode = function(o, e) {
  return e ^= this.getByte(
    /** @type {(Array.<number>|Uint32Array)} */
    o
  ), this.updateKeys(
    /** @type {(Array.<number>|Uint32Array)} */
    o,
    e
  ), e;
};
F.Unzip.prototype.updateKeys = F.Zip.prototype.updateKeys;
F.Unzip.prototype.createDecryptionKey = F.Zip.prototype.createEncryptionKey;
F.Unzip.prototype.getByte = F.Zip.prototype.getByte;
F.Util.stringToByteArray = function(o) {
  var e = o.split(""), a, t;
  for (a = 0, t = e.length; a < t; a++)
    e[a] = (e[a].charCodeAt(0) & 255) >>> 0;
  return e;
};
F.Adler32 = function(o) {
  return typeof o == "string" && (o = F.Util.stringToByteArray(o)), F.Adler32.update(1, o);
};
F.Adler32.update = function(o, e) {
  for (var a = o & 65535, t = o >>> 16 & 65535, i = e.length, n, r = 0; i > 0; ) {
    n = i > F.Adler32.OptimizationParameter ? F.Adler32.OptimizationParameter : i, i -= n;
    do
      a += e[r++], t += a;
    while (--n);
    a %= 65521, t %= 65521;
  }
  return (t << 16 | a) >>> 0;
};
F.Adler32.OptimizationParameter = 1024;
F.BitStream = function(o, e) {
  if (this.index = typeof e == "number" ? e : 0, this.bitindex = 0, this.buffer = o instanceof Uint8Array ? o : new Uint8Array(F.BitStream.DefaultBlockSize), this.buffer.length * 2 <= this.index)
    throw new Error("invalid index");
  this.buffer.length <= this.index && this.expandBuffer();
};
F.BitStream.DefaultBlockSize = 32768;
F.BitStream.prototype.expandBuffer = function() {
  var o = this.buffer, e = o.length, a = new Uint8Array(e << 1);
  return a.set(o), this.buffer = a;
};
F.BitStream.prototype.writeBits = function(o, e, a) {
  var t = this.buffer, i = this.index, n = this.bitindex, r = t[i], s;
  function f(c) {
    return F.BitStream.ReverseTable[c & 255] << 24 | F.BitStream.ReverseTable[c >>> 8 & 255] << 16 | F.BitStream.ReverseTable[c >>> 16 & 255] << 8 | F.BitStream.ReverseTable[c >>> 24 & 255];
  }
  if (a && e > 1 && (o = e > 8 ? f(o) >> 32 - e : F.BitStream.ReverseTable[o] >> 8 - e), e + n < 8)
    r = r << e | o, n += e;
  else
    for (s = 0; s < e; ++s)
      r = r << 1 | o >> e - s - 1 & 1, ++n === 8 && (n = 0, t[i++] = F.BitStream.ReverseTable[r], r = 0, i === t.length && (t = this.expandBuffer()));
  t[i] = r, this.buffer = t, this.bitindex = n, this.index = i;
};
F.BitStream.prototype.finish = function() {
  var o = this.buffer, e = this.index, a;
  return this.bitindex > 0 && (o[e] <<= 8 - this.bitindex, o[e] = F.BitStream.ReverseTable[o[e]], e++), a = o.subarray(0, e), a;
};
F.BitStream.ReverseTable = /* @__PURE__ */ (function(o) {
  return o;
})((function() {
  var o = new Uint8Array(256), e;
  for (e = 0; e < 256; ++e)
    o[e] = (function(a) {
      var t = a, i = 7;
      for (a >>>= 1; a; a >>>= 1)
        t <<= 1, t |= a & 1, --i;
      return (t << i & 255) >>> 0;
    })(e);
  return o;
})());
F.CRC32.calc = function(o, e, a) {
  return F.CRC32.update(o, 0, e, a);
};
F.CRC32.update = function(o, e, a, t) {
  var i = F.CRC32.Table, n = typeof a == "number" ? a : a = 0, r = typeof t == "number" ? t : o.length;
  for (e ^= 4294967295, n = r & 7; n--; ++a)
    e = e >>> 8 ^ i[(e ^ o[a]) & 255];
  for (n = r >> 3; n--; a += 8)
    e = e >>> 8 ^ i[(e ^ o[a]) & 255], e = e >>> 8 ^ i[(e ^ o[a + 1]) & 255], e = e >>> 8 ^ i[(e ^ o[a + 2]) & 255], e = e >>> 8 ^ i[(e ^ o[a + 3]) & 255], e = e >>> 8 ^ i[(e ^ o[a + 4]) & 255], e = e >>> 8 ^ i[(e ^ o[a + 5]) & 255], e = e >>> 8 ^ i[(e ^ o[a + 6]) & 255], e = e >>> 8 ^ i[(e ^ o[a + 7]) & 255];
  return (e ^ 4294967295) >>> 0;
};
F.CRC32.single = function(o, e) {
  return (F.CRC32.Table[(o ^ e) & 255] ^ o >>> 8) >>> 0;
};
F.CRC32.Table_ = [
  0,
  1996959894,
  3993919788,
  2567524794,
  124634137,
  1886057615,
  3915621685,
  2657392035,
  249268274,
  2044508324,
  3772115230,
  2547177864,
  162941995,
  2125561021,
  3887607047,
  2428444049,
  498536548,
  1789927666,
  4089016648,
  2227061214,
  450548861,
  1843258603,
  4107580753,
  2211677639,
  325883990,
  1684777152,
  4251122042,
  2321926636,
  335633487,
  1661365465,
  4195302755,
  2366115317,
  997073096,
  1281953886,
  3579855332,
  2724688242,
  1006888145,
  1258607687,
  3524101629,
  2768942443,
  901097722,
  1119000684,
  3686517206,
  2898065728,
  853044451,
  1172266101,
  3705015759,
  2882616665,
  651767980,
  1373503546,
  3369554304,
  3218104598,
  565507253,
  1454621731,
  3485111705,
  3099436303,
  671266974,
  1594198024,
  3322730930,
  2970347812,
  795835527,
  1483230225,
  3244367275,
  3060149565,
  1994146192,
  31158534,
  2563907772,
  4023717930,
  1907459465,
  112637215,
  2680153253,
  3904427059,
  2013776290,
  251722036,
  2517215374,
  3775830040,
  2137656763,
  141376813,
  2439277719,
  3865271297,
  1802195444,
  476864866,
  2238001368,
  4066508878,
  1812370925,
  453092731,
  2181625025,
  4111451223,
  1706088902,
  314042704,
  2344532202,
  4240017532,
  1658658271,
  366619977,
  2362670323,
  4224994405,
  1303535960,
  984961486,
  2747007092,
  3569037538,
  1256170817,
  1037604311,
  2765210733,
  3554079995,
  1131014506,
  879679996,
  2909243462,
  3663771856,
  1141124467,
  855842277,
  2852801631,
  3708648649,
  1342533948,
  654459306,
  3188396048,
  3373015174,
  1466479909,
  544179635,
  3110523913,
  3462522015,
  1591671054,
  702138776,
  2966460450,
  3352799412,
  1504918807,
  783551873,
  3082640443,
  3233442989,
  3988292384,
  2596254646,
  62317068,
  1957810842,
  3939845945,
  2647816111,
  81470997,
  1943803523,
  3814918930,
  2489596804,
  225274430,
  2053790376,
  3826175755,
  2466906013,
  167816743,
  2097651377,
  4027552580,
  2265490386,
  503444072,
  1762050814,
  4150417245,
  2154129355,
  426522225,
  1852507879,
  4275313526,
  2312317920,
  282753626,
  1742555852,
  4189708143,
  2394877945,
  397917763,
  1622183637,
  3604390888,
  2714866558,
  953729732,
  1340076626,
  3518719985,
  2797360999,
  1068828381,
  1219638859,
  3624741850,
  2936675148,
  906185462,
  1090812512,
  3747672003,
  2825379669,
  829329135,
  1181335161,
  3412177804,
  3160834842,
  628085408,
  1382605366,
  3423369109,
  3138078467,
  570562233,
  1426400815,
  3317316542,
  2998733608,
  733239954,
  1555261956,
  3268935591,
  3050360625,
  752459403,
  1541320221,
  2607071920,
  3965973030,
  1969922972,
  40735498,
  2617837225,
  3943577151,
  1913087877,
  83908371,
  2512341634,
  3803740692,
  2075208622,
  213261112,
  2463272603,
  3855990285,
  2094854071,
  198958881,
  2262029012,
  4057260610,
  1759359992,
  534414190,
  2176718541,
  4139329115,
  1873836001,
  414664567,
  2282248934,
  4279200368,
  1711684554,
  285281116,
  2405801727,
  4167216745,
  1634467795,
  376229701,
  2685067896,
  3608007406,
  1308918612,
  956543938,
  2808555105,
  3495958263,
  1231636301,
  1047427035,
  2932959818,
  3654703836,
  1088359270,
  936918e3,
  2847714899,
  3736837829,
  1202900863,
  817233897,
  3183342108,
  3401237130,
  1404277552,
  615818150,
  3134207493,
  3453421203,
  1423857449,
  601450431,
  3009837614,
  3294710456,
  1567103746,
  711928724,
  3020668471,
  3272380065,
  1510334235,
  755167117
];
F.CRC32.Table = new Uint32Array(F.CRC32.Table_);
F.Deflate = function(o, e) {
  this.input = o, this.output = new Uint8Array(F.Deflate.DefaultBufferSize), this.compressionType = F.Deflate.CompressionType.DYNAMIC, this.rawDeflate;
  var a = {}, t;
  (e || !(e = {})) && typeof e.compressionType == "number" && (this.compressionType = e.compressionType);
  for (t in e)
    a[t] = e[t];
  a.outputBuffer = this.output, this.rawDeflate = new F.RawDeflate(this.input, a);
};
F.Deflate.DefaultBufferSize = 32768;
F.Deflate.CompressionType = F.RawDeflate.CompressionType;
F.Deflate.compress = function(o, e) {
  return new F.Deflate(o, e).compress();
};
F.Deflate.prototype.compress = function() {
  var o, e, a, t, i, n, r, s, f, c = 0;
  if (f = this.output, o = F.CompressionMethod.DEFLATE, o === F.CompressionMethod.DEFLATE)
    e = Math.LOG2E * Math.log(F.RawDeflate.WindowSize) - 8;
  else
    throw new Error("invalid compression method");
  switch (a = e << 4 | o, f[c++] = a, n = 0, o) {
    case F.CompressionMethod.DEFLATE:
      switch (this.compressionType) {
        case F.Deflate.CompressionType.NONE:
          r = 0;
          break;
        case F.Deflate.CompressionType.FIXED:
          r = 1;
          break;
        case F.Deflate.CompressionType.DYNAMIC:
          r = 2;
          break;
        default:
          throw new Error("unsupported compression type");
      }
      break;
    default:
      throw new Error("invalid compression method");
  }
  return t = r << 6 | n << 5, i = 31 - (a * 256 + t) % 31, t |= i, f[c++] = t, s = F.Adler32(this.input), this.rawDeflate.op = c, f = this.rawDeflate.compress(), c = f.length, f = new Uint8Array(f.buffer), f.length <= c + 4 && (this.output = new Uint8Array(f.length + 4), this.output.set(f), f = this.output), f = f.subarray(0, c + 4), f[c++] = s >> 24 & 255, f[c++] = s >> 16 & 255, f[c++] = s >> 8 & 255, f[c++] = s & 255, f;
};
class G {
  constructor(e) {
    this.file = e;
  }
  async read(e, a) {
    const t = this.file;
    return e !== void 0 ? t.slice(e, e + a).arrayBuffer() : t.arrayBuffer();
  }
}
typeof process < "u" && process.versions != null && process.versions.node != null;
class Y {
  constructor(e) {
    this.config = e, this.url = Q(e.path || e.url);
  }
  async read(e, a) {
    a = Math.ceil(a);
    const t = this.config.headers || {}, i = "bytes=" + e + "-" + (e + a - 1);
    t.Range = i;
    let n = this.url.slice();
    if (t["User-Agent"] = "IGV", this.config.oauthToken) {
      const c = f(this.config.oauthToken);
      t.Authorization = `Bearer ${c}`;
    }
    this.config.apiKey && (n = J(n, "key", this.config.apiKey));
    const r = await fetch(n, {
      method: "GET",
      headers: t,
      redirect: "follow",
      mode: "cors"
    }), s = r.status;
    if (s >= 400) {
      console.error(`${s}  ${this.config.url}`);
      const c = Error(r.statusText);
      throw c.code = s, c;
    } else
      return r.arrayBuffer();
    async function f(c) {
      return typeof c == "function" ? await Promise.resolve(c()) : c;
    }
  }
}
function Q(o) {
  return o.includes("//www.dropbox.com") ? o.replace("//www.dropbox.com", "//dl.dropboxusercontent.com") : o.startsWith("ftp://ftp.ncbi.nlm.nih.gov") ? o.replace("ftp://", "https://") : o;
}
function J(o, e, a) {
  const t = o.includes("?") ? "&" : "?";
  return o + t + e + "=" + a;
}
class $ {
  constructor(e, a) {
    this.file = e, this.rateLimiter = a;
  }
  async read(e, a) {
    const t = this.file, i = this.rateLimiter;
    return new Promise(function(n, r) {
      i.limiter(async function(s) {
        try {
          const f = await s.read(e, a);
          n(f);
        } catch (f) {
          r(f);
        }
      })(t);
    });
  }
}
class ee {
  constructor(e) {
    this.wait = e === void 0 ? 100 : e, this.isCalled = !1, this.calls = [];
  }
  limiter(e) {
    const a = this;
    let t = function() {
      a.calls.length && !a.isCalled && (a.isCalled = !0, a.calls.shift().call(), setTimeout(function() {
        a.isCalled = !1, t();
      }, a.wait));
    };
    return function() {
      a.calls.push(e.bind(this, ...arguments)), t();
    };
  }
}
class ae {
  constructor(e) {
    this.file = e.file, this.size = e.size || 64e3, this.position = 0, this.bufferStart = 0, this.bufferLength = 0, this.buffer = void 0;
  }
  async read(e, a) {
    const t = e, i = e + a, n = this.bufferStart, r = this.bufferStart + this.bufferLength;
    if (a > this.size)
      return this.buffer = void 0, this.bufferStart = 0, this.bufferLength = 0, this.file.read(e, a);
    if (t >= n && i <= r) {
      const s = t - n, f = s + a;
      return this.buffer.slice(s, f);
    } else if (t < n && i > n) {
      const s = n - t, f = await this.file.read(e, s), c = a - s;
      if (c > 0) {
        const h = this.buffer.slice(0, c);
        return K(f, h);
      } else
        return f;
    } else if (t < r && i > r) {
      const s = r - t, f = this.bufferLength - s, c = this.buffer.slice(f, this.bufferLength), h = a - s;
      if (h > 0)
        try {
          this.buffer = await this.file.read(r, this.size), this.bufferStart = r, this.bufferLength = this.buffer.byteLength;
          const d = this.buffer.slice(0, h);
          return K(c, d);
        } catch (d) {
          if (d.code && d.code === 416)
            return c;
          throw d;
        }
      else
        return c;
    } else
      return this.buffer = await this.file.read(e, this.size), this.bufferStart = e, this.bufferLength = this.buffer.byteLength, this.buffer.slice(0, a);
  }
}
var K = function(o, e) {
  var a = new Uint8Array(o.byteLength + e.byteLength);
  return a.set(new Uint8Array(o), 0), a.set(new Uint8Array(e), o.byteLength), a.buffer;
};
const D = function(o, e) {
  this.littleEndian = e !== void 0 ? e : !0, this.position = 0, this.view = o, this.length = o.byteLength;
};
D.prototype.available = function() {
  return this.length - this.position;
};
D.prototype.remLength = function() {
  return this.length - this.position;
};
D.prototype.hasNext = function() {
  return this.position < this.length - 1;
};
D.prototype.getByte = function() {
  var o = this.view.getUint8(this.position, this.littleEndian);
  return this.position++, o;
};
D.prototype.getShort = function() {
  var o = this.view.getInt16(this.position, this.littleEndian);
  return this.position += 2, o;
};
D.prototype.getUShort = function() {
  var o = this.view.getUint16(this.position, this.littleEndian);
  return this.position += 2, o;
};
D.prototype.getInt = function() {
  var o = this.view.getInt32(this.position, this.littleEndian);
  return this.position += 4, o;
};
D.prototype.getUInt = function() {
  var o = this.view.getUint32(this.position, this.littleEndian);
  return this.position += 4, o;
};
D.prototype.getLong = function() {
  var o = [];
  o[0] = this.view.getUint8(this.position), o[1] = this.view.getUint8(this.position + 1), o[2] = this.view.getUint8(this.position + 2), o[3] = this.view.getUint8(this.position + 3), o[4] = this.view.getUint8(this.position + 4), o[5] = this.view.getUint8(this.position + 5), o[6] = this.view.getUint8(this.position + 6), o[7] = this.view.getUint8(this.position + 7);
  var e = 0;
  if (this.littleEndian)
    for (var a = o.length - 1; a >= 0; a--)
      e = e * 256 + o[a];
  else
    for (var a = 0; a < o.length; a++)
      e = e * 256 + o[a];
  return this.position += 8, e;
};
D.prototype.getString = function(o) {
  for (var e = "", a; (a = this.view.getUint8(this.position++)) != 0 && (e += String.fromCharCode(a), !(o && e.length == o)); )
    ;
  return e;
};
D.prototype.getFixedLengthString = function(o) {
  var e = "", a, t;
  for (a = 0; a < o; a++)
    t = this.view.getUint8(this.position++), t > 0 && (e += String.fromCharCode(t));
  return e;
};
D.prototype.getFixedLengthTrimmedString = function(o) {
  var e = "", a, t;
  for (a = 0; a < o; a++)
    t = this.view.getUint8(this.position++), t > 32 && (e += String.fromCharCode(t));
  return e;
};
D.prototype.getFloat = function() {
  var o = this.view.getFloat32(this.position, this.littleEndian);
  return this.position += 4, o;
};
D.prototype.getDouble = function() {
  var o = this.view.getFloat64(this.position, this.littleEndian);
  return this.position += 8, o;
};
D.prototype.skip = function(o) {
  return this.position += o, this.position;
};
D.prototype.getVPointer = function() {
  var o = this.position, e = this.view.getUint8(o + 1) << 8 | this.view.getUint8(o), a = (this.view.getUint8(o + 6) & 255) * 4294967296, t = (this.view.getUint8(o + 5) & 255) * 16777216, i = (this.view.getUint8(o + 4) & 255) * 65536, n = (this.view.getUint8(o + 3) & 255) * 256, r = this.view.getUint8(o + 2) & 255, s = a + t + i + n + r;
  return this.position += 8, new _(s, e);
};
function _(o, e) {
  this.block = o, this.offset = e;
}
_.prototype.isLessThan = function(o) {
  return this.block < o.block || this.block === o.block && this.offset < o.offset;
};
_.prototype.isGreaterThan = function(o) {
  return this.block > o.block || this.block === o.block && this.offset > o.offset;
};
_.prototype.print = function() {
  return "" + this.block + ":" + this.offset;
};
class j {
  constructor(e, a) {
    this.chr1 = e, this.chr2 = a;
  }
  getKey() {
    return this.chr1.name + "_" + this.chr2.name + "_" + this.zoom.unit + "_" + this.zoom.binSize;
  }
  getBlockNumbers(e, a, t) {
    if (e.chr == this.chr2 && a.chr === this.chr1) {
      const h = e;
      e = a, a = h;
    }
    const i = this.chr1 === this.chr2, n = this.zoom.binSize, r = this.blockBinCount, s = this.blockColumnCount;
    return t < 9 || !i ? f() : c();
    function f() {
      const h = e.start / n, d = e.end / n, w = a.start / n, u = a.end / n, p = Math.floor(h / r), m = Math.floor((d - 1) / r), N = Math.floor(w / r), l = Math.floor((u - 1) / r), b = [];
      for (let z = N; z <= l; z++)
        for (let I = p; I <= m; I++) {
          let C;
          i && z < I ? C = I * s + z : C = z * s + I, b.includes(C) || b.push(C);
        }
      return b;
    }
    function c() {
      const h = e.start / n, d = e.end / n, w = a.start / n, u = a.end / n, p = Math.floor((h + w) / 2 / r), m = Math.floor((d + u) / 2 / r), N = Math.floor(Math.log2(1 + Math.abs(h - u) / Math.sqrt(2) / r)), l = Math.floor(Math.log2(1 + Math.abs(d - w) / Math.sqrt(2) / r)), z = (d - w) * (h - u) < 0 ? 0 : Math.min(N, l), I = Math.max(N, l), C = [];
      for (let x = z; x <= I; x++)
        for (let g = p; g <= m; g++) {
          const R = x * s + g;
          C.push(R);
        }
      return C;
    }
  }
  static parseMatrixZoomData(e, a, t) {
    const i = new j(e, a), n = t.getString(), r = t.getInt(), s = t.getFloat(), f = t.getFloat(), c = t.getFloat(), h = t.getFloat(), d = t.getInt();
    i.blockBinCount = t.getInt(), i.blockColumnCount = t.getInt();
    const w = t.getInt();
    i.zoom = { index: r, unit: n, binSize: d }, i.blockIndex = new oe(w, t);
    const u = e.size / d, p = a.size / d, m = s / u / p;
    return i.averageCount = m, i.sumCounts = s, i.stdDev = c, i.occupiedCellCount = f, i.percent95 = h, i;
  }
}
class oe {
  constructor(e, a) {
    for (this.blockIndex = {}; e-- > 0; ) {
      const t = a.getInt(), i = a.getLong(), n = a.getInt();
      this.blockIndex[t] = { filePosition: i, size: n };
    }
  }
  getBlockIndexEntry(e) {
    return this.blockIndex[e];
  }
}
class A {
  constructor(e, a, t) {
    this.chr1 = e, this.chr2 = a, this.bpZoomData = [], this.fragZoomData = [];
    for (let i of t)
      i.zoom.unit === "BP" ? this.bpZoomData.push(i) : this.fragZoomData.push(i);
  }
  /**
   * Find the best zoom level for the given bin size
   * @param binSize
   * @param unit
   * @returns {number}
   */
  findZoomForResolution(e, a) {
    const t = a === "FRAG" ? this.fragZoomData : this.bpZoomData;
    for (let n = 1; n < t.length; n++) {
      var i = t[n];
      if (i.zoom.binSize < e)
        return n - 1;
    }
    return t.length - 1;
  }
  /**
   * Fetch zoom data by bin size.  If no matching level exists return undefined.
   *
   * @param unit
   * @param binSize
   * @param zoom
   * @returns {undefined|*}
   */
  getZoomData(e, a) {
    a = a || "BP";
    const t = a === "BP" ? this.bpZoomData : this.fragZoomData;
    for (let n = 0; n < t.length; n++) {
      var i = t[n];
      if (e === i.zoom.binSize)
        return i;
    }
  }
  /**
   * Return zoom data by resolution index.
   * @param index
   * @param unit
   * @returns {*}
   */
  getZoomDataByIndex(e, a) {
    return (a === "FRAG" ? this.fragZoomData : this.bpZoomData)[e];
  }
  static getKey(e, a) {
    if (e > a) {
      const t = e;
      e = a, a = t;
    }
    return `${e}_${a}`;
  }
  static parseMatrix(e, a) {
    const t = new D(new DataView(e)), i = t.getInt(), n = t.getInt(), r = a[i], s = a[n];
    let f = t.getInt();
    const c = [];
    for (; f-- > 0; ) {
      const h = j.parseMatrixZoomData(r, s, t);
      c.push(h);
    }
    return new A(i, n, c);
  }
}
class S {
  constructor(e, a, t) {
    this.bin1 = e, this.bin2 = a, this.counts = t;
  }
  getKey() {
    return "" + this.bin1 + "_" + this.bin2;
  }
}
class q {
  constructor(e = 10) {
    this.max = e, this.map = /* @__PURE__ */ new Map();
  }
  get(e) {
    let a = this.map.get(e);
    return a && (this.map.delete(e), this.map.set(e, a)), a;
  }
  set(e, a) {
    this.map.has(e) ? this.map.delete(e) : this.map.size === this.max && this.map.delete(this.first()), this.map.set(e, a);
  }
  has(e) {
    return this.map.has(e);
  }
  clear() {
    this.map.clear();
  }
  first() {
    return this.map.keys().next().value;
  }
}
const te = 8;
class V {
  constructor(e, a, t, i) {
    this.file = e, this.filePosition = a, this.nValues = t, this.dataType = i, this.cache = void 0;
  }
  async getValues(e, a) {
    if (!this.cache || e < this.cache.start || a > this.cache.end) {
      const n = Math.max(0, e - 1e3), r = Math.min(this.nValues, a + 1e3), s = this.filePosition + n * this.dataType, f = r - n, c = f * this.dataType, h = await this.file.read(s, c);
      if (!h)
        return;
      const d = new D(new DataView(h)), w = [];
      for (let u = 0; u < f; u++)
        w[u] = this.dataType === te ? d.getDouble() : d.getFloat();
      this.cache = {
        start: n,
        end: r,
        values: w
      };
    }
    const t = e - this.cache.start, i = t + (a - e);
    return this.cache.values.slice(t, i);
  }
  getKey() {
    return V.getKey(this.type, this.chrIdx, this.unit, this.resolution);
  }
  static getNormalizationVectorKey(e, a, t, i) {
    return e + "_" + a + "_" + t + "_" + i;
  }
}
const P = {
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
}, ie = typeof process < "u" && process.versions != null && process.versions.node != null, ne = -32768, k = 8, O = 4, B = 4, Fe = new ee(100);
class ce {
  constructor(e) {
    if (e.alert && (this.alert = e.alert), this.config = e, this.loadFragData = e.loadFragData, this.fragmentSitesCache = {}, this.normVectorCache = new q(10), this.normalizationTypes = ["NONE"], this.matrixCache = new q(10), this.blockCache = new fe(), this.normVectorIndexPosition = -1, this.normVectorIndexSize = -1, e.file)
      this.file = e.file;
    else if (e.blob)
      this.file = new G(e.blob);
    else if (e.url || e.path && !ie) {
      this.url = e.url || this.path, this.remote = !0;
      const a = new Y(e);
      se(this.url) ? this.file = new $(a, Fe) : this.file = a;
    } else throw e.path ? Error("path property is deprecated, use NodeLocalFile") : Error("Arguments must include file, blob, url, or path");
  }
  async init() {
    this.initialized || (await this.readHeaderAndFooter(), this.initialized = !0);
  }
  async getVersion() {
    if (this.version === void 0) {
      const e = await this.file.read(0, 128);
      if (!e)
        return;
      const a = new D(new DataView(e));
      return this.magic = a.getString(), this.version = a.getInt(), this.version;
    } else
      return this.version;
  }
  async getMetaData() {
    return await this.init(), this.meta;
  }
  async readHeaderAndFooter() {
    let e = await this.file.read(0, 16);
    if (!e || e.byteLength === 0)
      throw Error("File content is empty");
    let a = new D(new DataView(e));
    if (this.magic = a.getString(), this.version = a.getInt(), this.version < 5)
      throw Error("Unsupported hic version: " + this.version);
    this.footerPosition = a.getLong(), await this.readFooter();
    const i = Object.values(this.masterIndex).reduce((c, h) => Math.min(c, h.start), Number.MAX_VALUE) - 16;
    e = await this.file.read(16, i), a = new D(new DataView(e)), this.genomeId = a.getString(), this.version >= 9 && (this.normVectorIndexPosition = a.getLong(), this.normVectorIndexSize = a.getLong()), this.attributes = {};
    let n = a.getInt();
    for (; n-- > 0; )
      this.attributes[a.getString()] = a.getString();
    this.chromosomes = [], this.chromosomeIndexMap = {};
    let r = a.getInt(), s = 0;
    for (; r-- > 0; ) {
      const c = {
        index: s,
        name: a.getString(),
        size: this.version < 9 ? a.getInt() : a.getLong()
      };
      c.name.toLowerCase() === "all" && (this.wholeGenomeChromosome = c, this.wholeGenomeResolution = Math.round(c.size * (1e3 / 500))), this.chromosomes.push(c), this.chromosomeIndexMap[c.name] = c.index, s++;
    }
    this.bpResolutions = [];
    let f = a.getInt();
    for (; f-- > 0; )
      this.bpResolutions.push(a.getInt());
    if (this.loadFragData) {
      this.fragResolutions = [];
      let c = a.getInt();
      if (c > 0)
        for (; c-- > 0; )
          this.fragResolutions.push(a.getInt());
    }
    this.chrAliasTable = {};
    for (let c of Object.keys(this.chromosomeIndexMap))
      c.startsWith("chr") ? this.chrAliasTable[c.substr(3)] = c : c === "MT" ? this.chrAliasTable.chrM = c : this.chrAliasTable["chr" + c] = c;
    this.meta = {
      version: this.version,
      genome: this.genomeId,
      chromosomes: this.chromosomes,
      resolutions: this.bpResolutions
    };
  }
  async readFooter() {
    const e = this.version < 9 ? 8 : 12;
    let a = await this.file.read(this.footerPosition, e);
    if (!a)
      return null;
    let t = new D(new DataView(a));
    const i = this.version < 9 ? t.getInt() : t.getLong();
    let n = t.getInt();
    const r = n * 196;
    for (a = await this.file.read(this.footerPosition + e, Math.min(r, i)), t = new D(new DataView(a)), this.masterIndex = {}; n-- > 0; ) {
      const s = t.getString(), f = t.getLong(), c = t.getInt();
      this.masterIndex[s] = { start: f, size: c };
    }
    if (this.expectedValueVectors = {}, this.version > 5) {
      const s = this.version < 9 ? 4 : 8;
      this.normExpectedValueVectorsPosition = this.footerPosition + s + i;
    }
    return this;
  }
  async printIndexStats() {
    let e = 0, a = 0, t;
    await await this.init();
    for (let i of Object.keys(this.masterIndex)) {
      const n = this.masterIndex[i];
      e += n.size, n.size > a && (a = n.size, t = i);
    }
    console.log(`${a}  ${t}  ${this.config.url}`);
  }
  async getMatrix(e, a) {
    const t = A.getKey(e, a);
    if (this.matrixCache.has(t))
      return this.matrixCache.get(t);
    {
      const i = await this.readMatrix(e, a);
      return this.matrixCache.set(t, i), i;
    }
  }
  async readMatrix(e, a) {
    if (await this.init(), e > a) {
      const r = e;
      e = a, a = r;
    }
    const t = A.getKey(e, a), i = this.masterIndex[t];
    if (!i)
      return;
    const n = await this.file.read(i.start, i.size);
    if (n)
      return A.parseMatrix(n, this.chromosomes);
  }
  async getContactRecords(e, a, t, i, n, r = !1) {
    await this.init();
    const s = this.chromosomeIndexMap[this.getFileChrName(a.chr)], f = this.chromosomeIndexMap[this.getFileChrName(t.chr)];
    if (s > f || s === f && a.start >= t.end) {
      const I = a;
      a = t, t = I;
    }
    const h = await this.getBlocks(a, t, i, n);
    if (!h || h.length === 0)
      return [];
    const d = [], w = a.start / n, u = a.end / n, p = t.start / n, m = t.end / n, N = Math.floor(w), l = Math.ceil(u), b = Math.floor(p), z = Math.ceil(m);
    for (let I of h)
      if (I) {
        let C, x, g = e && e !== "NONE";
        const R = this.getFileChrName(a.chr), T = this.getFileChrName(t.chr);
        if (g) {
          const E = await this.getNormalizationVector(e, R, i, n), v = R === T ? E : await this.getNormalizationVector(e, T, i, n);
          E && v ? (C = await E.getValues(N, l), x = await v.getValues(b, z)) : g = !1;
        }
        for (let E of I.records)
          if (r || E.bin1 >= w && E.bin1 < u && E.bin2 >= p && E.bin2 < m)
            if (g) {
              const v = E.bin1, y = E.bin2, L = C[v - N] * x[y - b];
              if (L !== 0 && !isNaN(L)) {
                const Z = E.counts / L;
                d.push(new S(v, y, Z));
              }
            } else
              d.push(E);
      }
    return d;
  }
  async getBlocks(e, a, t, i) {
    const n = (l, b) => `${b.getKey()}_${l}`;
    await this.init();
    const r = this.getFileChrName(e.chr), s = this.getFileChrName(a.chr), f = this.chromosomeIndexMap[r], c = this.chromosomeIndexMap[s];
    if (f === void 0)
      return console.log("No chromosome named: " + e.chr), [];
    if (c === void 0)
      return console.log("No chromosome named: " + a.chr), [];
    const h = await this.getMatrix(f, c);
    if (!h)
      return console.log("No matrix for " + e.chr + "-" + a.chr), [];
    const d = h.getZoomData(i, t);
    if (!d) {
      let l = `No data available for resolution: ${i}  for map ${e.chr}-${a.chr}`;
      throw new Error(l);
    }
    const w = d.getBlockNumbers(e, a, this.version), u = [], p = [];
    for (let l of w) {
      const b = n(l, d);
      this.blockCache.has(i, b) ? u.push(this.blockCache.get(i, b)) : p.push(l);
    }
    const m = p.map((l) => this.readBlock(l, d)), N = await Promise.all(m);
    for (let l of N)
      l && this.blockCache.set(i, n(l.blockNumber, d), l);
    return u.concat(N);
  }
  async readBlock(e, a) {
    const t = await a.blockIndex.getBlockIndexEntry(e);
    if (t) {
      let i = await this.file.read(t.filePosition, t.size);
      if (!i)
        return;
      i = new F.Inflate(new Uint8Array(i)).decompress().buffer;
      const s = new D(new DataView(i)), f = s.getInt(), c = [];
      if (this.version < 7)
        for (let h = 0; h < f; h++) {
          const d = s.getInt(), w = s.getInt(), u = s.getFloat();
          c.push(new S(d, w, u));
        }
      else {
        const h = s.getInt(), d = s.getInt(), w = s.getByte() === 1, u = this.version < 9 ? !1 : s.getByte() == 1, p = this.version < 9 ? !1 : s.getByte() == 1, m = s.getByte();
        if (m === 1) {
          const N = p ? s.getInt() : s.getShort();
          for (let l = 0; l < N; l++) {
            const b = p ? s.getInt() : s.getShort(), z = d + b, I = u ? s.getInt() : s.getShort();
            for (let C = 0; C < I; C++) {
              const x = u ? s.getInt() : s.getShort(), g = h + x, R = w ? s.getFloat() : s.getShort();
              c.push(new S(g, z, R));
            }
          }
        } else if (m == 2) {
          const N = s.getInt(), l = s.getShort();
          for (let b = 0; b < N; b++) {
            const z = Math.floor(b / l), I = b - z * l, C = h + I, x = d + z;
            if (w) {
              const g = s.getFloat();
              isNaN(g) || c.push(new S(C, x, g));
            } else {
              const g = s.getShort();
              g != ne && c.push(new S(C, x, g));
            }
          }
        } else
          throw new Error("Unknown block type: " + m);
      }
      return new re(e, a, c, t);
    } else
      return;
  }
  async hasNormalizationVector(e, a, t, i) {
    await this.init();
    let n;
    if (Number.isInteger(a))
      n = a;
    else {
      const f = this.getFileChrName(a);
      n = this.chromosomeIndexMap[f];
    }
    const r = U(e, n, t.toString(), i), s = await this.getNormVectorIndex();
    return s && s[r];
  }
  async isNormalizationValueAvailableAtResolution(e, a, t, i) {
    let n;
    if (Number.isInteger(a))
      n = a;
    else {
      const c = this.getFileChrName(a);
      n = this.chromosomeIndexMap[c];
    }
    const r = await this.getNormVectorIndex(), s = U(e, n, t.toString(), i);
    return r[s] !== void 0;
  }
  async getNormalizationVector(e, a, t, i) {
    await this.init();
    let n;
    if (Number.isInteger(a))
      n = a;
    else {
      const N = this.getFileChrName(a);
      n = this.chromosomeIndexMap[N];
    }
    const r = U(e, n, t.toString(), i);
    if (this.normVectorCache.has(r))
      return this.normVectorCache.get(r);
    const s = await this.getNormVectorIndex();
    if (!s) {
      console.log("Normalization vectors not present in this file");
      return;
    }
    if (await this.isNormalizationValueAvailableAtResolution(e, a, t, i) === !1) {
      const N = `Normalization option ${e} not available at resolution ${i}. Will use NONE.`;
      console.log(N), this.alert && this.alert(N);
      return;
    }
    const c = s[r], h = await this.file.read(c.filePosition, 8);
    if (!h)
      return;
    const d = new D(new DataView(h)), w = this.version < 9 ? d.getInt() : d.getLong(), u = this.version < 9 ? k : O, p = this.version < 9 ? c.filePosition + 4 : c.filePosition + 8, m = new V(this.file, p, w, u);
    return this.normVectorCache.set(r, m), m;
  }
  async getNormVectorIndex() {
    if (!(this.version < 6)) {
      if (this.normVectorIndex)
        return this.normVectorIndex;
      if (this.normVectorIndexPosition > 0 && this.normVectorIndexSize > 0) {
        const e = { start: this.normVectorIndexPosition, size: this.normVectorIndexSize };
        return this.readNormVectorIndex(e);
      }
      if (!this.config.nvi && this.remote && this.url) {
        const e = new URL(this.url), a = encodeURIComponent(e.hostname + e.pathname);
        P.hasOwnProperty(a) && (this.config.nvi = P[a]);
      }
      if (this.config.nvi) {
        const e = decodeURIComponent(this.config.nvi).split(","), a = { start: parseInt(e[0]), size: parseInt(e[1]) };
        return this.readNormVectorIndex(a);
      } else
        try {
          return await this.readNormExpectedValuesAndNormVectorIndex(), this.normVectorIndex;
        } catch (e) {
          e.code === "416" || e.code === 416 ? this.normExpectedValueVectorsPosition = void 0 : console.error(e);
        }
    }
  }
  async getNormalizationOptions() {
    return await this.getNormVectorIndex(), this.normalizationTypes;
  }
  /**
   * Return a promise to load the normalization vector index
   *
   * @param dataset
   * @param range  -- file range {position, size}
   * @returns Promise for the normalization vector index
   */
  async readNormVectorIndex(e) {
    await this.init(), this.normalizationVectorIndexRange = e;
    const a = await this.file.read(e.start, e.size), t = new D(new DataView(a));
    this.normVectorIndex = {};
    let i = t.getInt();
    for (; i-- > 0; )
      this.parseNormVectorEntry(t);
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
    if (await this.init(), this.normExpectedValueVectorsPosition === void 0)
      return;
    const e = await this.skipExpectedValues(this.normExpectedValueVectorsPosition);
    let a = B, t = await this.file.read(e, B);
    if (t.byteLength === 0)
      return;
    const n = new D(new DataView(t)).getInt(), r = n * 30, s = { start: e + a, size: r };
    t = await this.file.read(s.start, s.size), this.normalizedExpectedValueVectors = {}, this.normVectorIndex = {}, await f.call(this, n, t), this.config.nvi = e.toString() + "," + a;
    async function f(c, h) {
      const d = new D(new DataView(h));
      for (; c-- > 0; ) {
        if (d.available() < 100) {
          c++, a += d.position;
          const w = Math.max(1e3, c * 30), u = { start: e + a, size: w }, p = await this.file.read(u.start, u.size);
          return f.call(this, c, p);
        }
        this.parseNormVectorEntry(d);
      }
      a += d.position;
    }
  }
  /**
   * This function is used when the position of the norm vector index is unknown.  We must read through the
   * normalized expected values to find the index
   *
   * @param dataset
   * @returns {Promise}
   */
  async skipExpectedValues(e) {
    const a = this.version, t = new ae({ file: this.file, size: 256e3 }), i = { start: e, size: B }, n = await t.read(i.start, i.size), s = new D(new DataView(n)).getInt();
    if (s === 0)
      return e + B;
    return f(e + B, s);
    async function f(c, h) {
      let d = { start: c, size: 500 }, w = 0, u = c, p = await t.read(d.start, d.size), m = new D(new DataView(p));
      m.getString(), m.getString(), m.getInt();
      const N = a < 9 ? m.getInt() : m.getLong();
      w += m.position + N * (a < 9 ? k : O), d = { start: c + w, size: B }, p = await t.read(d.start, d.size), m = new D(new DataView(p));
      const l = m.getInt();
      return w += B + l * (B + (a < 9 ? k : O)), h--, h === 0 ? u + w : f(u + w, h);
    }
  }
  getZoomIndexForBinSize(e, a) {
    a = a || "BP";
    let t;
    if (a === "BP")
      t = this.bpResolutions;
    else if (a === "FRAG")
      t = this.fragResolutions;
    else
      throw new Error("Invalid unit: " + a);
    for (let i = 0; i < t.length; i++)
      if (t[i] === e) return i;
    return -1;
  }
  parseNormVectorEntry(e) {
    const a = e.getString(), t = e.getInt(), i = e.getString(), n = e.getInt(), r = e.getLong(), s = this.version < 9 ? e.getInt() : e.getLong(), f = a + "_" + t + "_" + i + "_" + n;
    this.normalizationTypes.includes(a) || this.normalizationTypes.push(a), this.normVectorIndex[f] = { filePosition: r, size: s };
  }
  getFileChrName(e) {
    return this.chrAliasTable.hasOwnProperty(e) ? this.chrAliasTable[e] : e;
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
function U(o, e, a, t) {
  return o + "_" + e + "_" + a + "_" + t;
}
function se(o) {
  return o.indexOf("drive.google.com") >= 0 || o.indexOf("www.googleapis.com/drive") > 0;
}
class re {
  constructor(e, a, t, i) {
    this.blockNumber = e, this.zoomData = a, this.records = t, this.idx = i;
  }
}
class fe {
  constructor() {
    this.resolution = void 0, this.map = new q(6);
  }
  set(e, a, t) {
    this.resolution !== e && this.map.clear(), this.resolution = e, this.map.set(a, t);
  }
  get(e, a) {
    return this.resolution === e ? this.map.get(a) : void 0;
  }
  has(e, a) {
    return this.resolution === e && this.map.has(a);
  }
}
class ve {
  constructor(e) {
    this.config = e, e.liveContactMap ? this.hicFile = e.liveContactMap : this.hicFile = new ce(e);
  }
  async getMetaData() {
    return await this.hicFile.getMetaData();
  }
  //straw <NONE/VC/VC_SQRT/KR> <ile> <chr1>[:x1:x2] <chr2>[:y1:y2] <BP/FRAG> <binsize>
  async getContactRecords(e, a, t, i, n) {
    return this.hicFile.getContactRecords(e, a, t, i, n);
  }
  async getNormalizationOptions() {
    return this.hicFile.getNormalizationOptions();
  }
  async getNVI() {
    return await this.hicFile.getNormVectorIndex(), this.hicFile.config.nvi;
  }
  async printIndexStats() {
    await this.hicFile.printIndexStats();
  }
  getFileChrName(e) {
    return this.hicFile.chrAliasTable.hasOwnProperty(e) ? this.hicFile.chrAliasTable[e] : e;
  }
}
function de(o) {
  const e = o.split(/\r?\n/), a = e[0];
  if (!a || !a.startsWith("##format=sw1"))
    throw new Error("Invalid SWT format: expected ##format=sw1 header");
  const t = a.split(/\s+/);
  let i, n;
  for (const u of t)
    u.startsWith("name=") ? i = u.substring(5) : u.startsWith("genome=") && (n = u.substring(7));
  if (!i) throw new Error("SWT header missing name property");
  if (!n) throw new Error("SWT header missing genome property");
  const r = [];
  let s = null, f, c, h, d;
  for (let u = 2; u < e.length; u++) {
    const p = e[u].trim();
    if (p.length === 0) continue;
    const m = p.split(/\s+/);
    if (m[0] === "trace") {
      s = [], r.push(s);
      continue;
    }
    if (s === null || m.length < 6) continue;
    const N = m[0], l = parseInt(m[1], 10), b = parseInt(m[2], 10), z = parseFloat(m[3]), I = parseFloat(m[4]), C = parseFloat(m[5]);
    f === void 0 && (f = N), (c === void 0 || l < c) && (c = l), (h === void 0 || b > h) && (h = b), d === void 0 && (d = b - l);
    const x = isNaN(z) || isNaN(I) || isNaN(C), g = { x: z, y: I, z: C };
    x && (g.isMissingData = !0), s.push(g);
  }
  if (r.length === 0)
    throw new Error("SWT file contains no traces");
  const w = r[0].length;
  return {
    sample: i,
    genomeId: n,
    chr: f,
    genomicStart: c,
    genomicEnd: h,
    binSize: d,
    traceCount: r.length,
    traceLength: w,
    traces: r
  };
}
const he = 1;
async function W({ hdf5: o, ensembleGroupKey: e }) {
  if (!o) throw new Error("loadLiveVertices requires an open hdf5 handle");
  if (!e) throw new Error("loadLiveVertices requires ensembleGroupKey");
  const a = await we(o, e);
  return a || pe(o, e);
}
async function we(o, e) {
  const a = await o.get(e);
  if (!a || !(await a.keys).includes("live_contact_map_vertices")) return null;
  const i = await o.get("/Header"), r = (i ? await i.attrs : {}).live_contact_map_vertices_version;
  if (r !== void 0 && Number(r) !== he)
    return null;
  const s = await a.get("live_contact_map_vertices"), f = await s.shape;
  if (!f) return null;
  let c, h;
  if (f.length === 3 && f[2] === 3)
    c = f[0], h = f[1];
  else if (f.length === 2 && f[1] === 3) {
    if (h = await ue(a), !h || f[0] % h !== 0) return null;
    c = f[0] / h;
  } else
    return null;
  const d = await s.value;
  return le(d, c, h);
}
async function ue(o) {
  const e = await o.get("genomic_position/regions");
  if (!e) return null;
  const a = await e.shape;
  if (!a) return null;
  const t = a.reduce((i, n) => i * n, 1);
  return t % 3 !== 0 ? null : t / 3;
}
function le(o, e, a) {
  const t = new Array(e);
  let i = 0;
  for (let n = 0; n < e; n++) {
    const r = new Array(a);
    for (let s = 0; s < a; s++) {
      const f = o[i++], c = o[i++], h = o[i++], d = { x: f, y: c, z: h };
      (isNaN(f) || isNaN(c) || isNaN(h)) && (d.isMissingData = !0), r[s] = d;
    }
    t[n] = r;
  }
  return t;
}
async function pe(o, e) {
  const a = await o.get(`${e}/spatial_position`);
  if (!a)
    throw new Error(`SW file missing ${e}/spatial_position`);
  const t = (await a.keys).filter((n) => /^t_\d+$/.test(n)).sort((n, r) => parseInt(n.slice(2), 10) - parseInt(r.slice(2), 10));
  if (t.length === 0)
    throw new Error(`SW file contains no trace datasets at ${e}/spatial_position`);
  const i = [];
  for (const n of t) {
    const s = await (await a.get(n)).value;
    i.push(me(s));
  }
  return i;
}
function me(o) {
  if (o.length % 3 !== 0)
    throw new Error(
      `loadLiveVertices: spatial_position/t_* length ${o.length} is not a multiple of 3 — legacy pointcloud file with no live_contact_map_vertices bake; re-export with current swtool`
    );
  const e = new Array(o.length / 3);
  for (let a = 0, t = 0; a < o.length; a += 3, t++) {
    const i = o[a], n = o[a + 1], r = o[a + 2], s = { x: i, y: n, z: r };
    (isNaN(i) || isNaN(n) || isNaN(r)) && (s.isMissingData = !0), e[t] = s;
  }
  return e;
}
const be = typeof window < "u" && typeof document < "u", Ne = be ? import("hdf5-indexed-reader/dist/hdf5-indexed-reader.esm.js") : import("hdf5-indexed-reader/dist/hdf5-indexed-reader.node.mjs");
async function Ie({ file: o, url: e, path: a } = {}) {
  if (!o && !e && !a)
    throw new Error("parseSW requires one of: file, url, path");
  const { openH5File: t } = await Ne, n = await t({ ...o ? { file: o } : e ? { url: e } : { path: a }, fetchSize: 65536, maxSize: 4e6 }), r = await n.get("/Header");
  if (!r) throw new Error("SW file missing /Header group");
  const s = await r.attrs, f = s.genome, c = (s.point_type || "").toString().toLowerCase();
  if (c && c !== "single_point")
    throw new Error(`SW point_type "${s.point_type}" is not supported (V1: SINGLE_POINT only)`);
  const h = (await n.keys).filter((C) => C !== "Header" && C !== "_index");
  if (h.length === 0)
    throw new Error("SW file contains no ensemble group");
  const d = h[0], w = await n.get(`${d}/genomic_position/regions`);
  if (!w) throw new Error(`SW file missing ${d}/genomic_position/regions`);
  const u = await w.value;
  if (u.length < 3 || u.length % 3 !== 0)
    throw new Error(`SW regions dataset has invalid length ${u.length}`);
  const p = String(u[0]);
  for (let C = 3; C < u.length; C += 3)
    if (String(u[C]) !== p)
      throw new Error(`SW file spans multiple chromosomes (${p}, ${u[C]}); V1 supports a single-locus file`);
  const m = u.length / 3, N = parseInt(u[1], 10), l = parseInt(u[u.length - 1], 10), b = await W({ hdf5: n, ensembleGroupKey: d }), z = b[0].length;
  if (z !== m)
    throw new Error(`SW trace length (${z}) does not match region count (${m})`);
  const I = Math.round((l - N) / z);
  return {
    sample: s.name || d,
    genomeId: f,
    chr: p,
    genomicStart: N,
    genomicEnd: l,
    binSize: I,
    traceCount: b.length,
    traceLength: z,
    traces: b
  };
}
const M = -1;
function ze(o, e) {
  const a = e, t = new Float64Array(a * a), i = new Uint32Array(a * a);
  for (const s of o)
    for (let f = 0; f < a; f++) {
      const c = s[f];
      if (!c.isMissingData)
        for (let h = f + 1; h < a; h++) {
          const d = s[h];
          if (d.isMissingData) continue;
          const w = c.x - d.x, u = c.y - d.y, p = c.z - d.z, m = Math.sqrt(w * w + u * u + p * p), N = f * a + h, l = h * a + f;
          t[N] += m, t[l] += m, i[N] += 1, i[l] += 1;
        }
    }
  const n = new Float32Array(a * a);
  n.fill(M);
  let r = 0;
  for (let s = 0; s < a; s++) {
    n[s * a + s] = 0;
    for (let f = s + 1; f < a; f++) {
      const c = s * a + f;
      if (i[c] > 0) {
        const h = t[c] / i[c];
        n[c] = h, n[f * a + s] = h, h > r && (r = h);
      }
    }
  }
  return { distances: n, maxDistance: r };
}
function Ce(o, e, a) {
  const t = [];
  for (let i = 0; i < e; i++) {
    t.push(new S(i, i, 1));
    for (let n = i + 1; n < e; n++) {
      const r = o[i * e + n];
      r !== M && r < a && t.push(new S(i, n, 1));
    }
  }
  return t;
}
function ge(o, e, a) {
  const t = e, i = new Uint32Array(t * t), n = new Uint32Array(t * t);
  for (const f of o)
    for (let c = 0; c < t; c++) {
      const h = f[c];
      if (!h.isMissingData)
        for (let d = c + 1; d < t; d++) {
          const w = f[d];
          if (w.isMissingData) continue;
          const u = h.x - w.x, p = h.y - w.y, m = h.z - w.z, N = Math.sqrt(u * u + p * p + m * m), l = c * t + d;
          n[l] += 1, N < a && (i[l] += 1);
        }
    }
  const r = new Float32Array(t * t);
  r.fill(M);
  const s = [];
  for (let f = 0; f < t; f++) {
    r[f * t + f] = 1, s.push(new S(f, f, 1));
    for (let c = f + 1; c < t; c++) {
      const h = f * t + c;
      if (n[h] > 0) {
        const d = i[h] / n[h];
        r[h] = d, r[c * t + f] = d, d > 0 && s.push(new S(f, c, d));
      }
    }
  }
  return { contactRecords: s, contactFrequencies: r };
}
const De = {
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
}, xe = 0.35;
class Ee {
  constructor(e, a, t) {
    this.chr1 = e, this.chr2 = a, this._zoomData = t;
  }
  getZoomData(e, a) {
    return this._zoomData;
  }
  getZoomDataByIndex(e, a) {
    return this._zoomData;
  }
  findZoomForResolution(e, a) {
    return 0;
  }
}
class ye {
  /**
   * @param {object} config
   * @param {string} [config.swtText] - Raw SWT text to parse (option A)
   * @param {File|Blob} [config.swFile] - Browser File/Blob for a .sw (HDF5) file (option A2)
   * @param {string} [config.swUrl] - Remote URL for a .sw (HDF5) file (option A3)
   * @param {string} [config.swPath] - Node-local path for a .sw (HDF5) file (option A4)
   * @param {object} [config.hdf5] - Already-open hdf5-indexed-reader handle (option A5, paired with ensembleGroupKey)
   * @param {string} [config.ensembleGroupKey] - Ensemble group key inside the hdf5 file (required with config.hdf5)
   * @param {object} [config.parsedData] - Pre-parsed SWT/SW data (option B)
   * @param {Array} [config.traces] - Raw trace vertex arrays (option C)
   * @param {Array} [config.chromosomes] - Chromosome array [{index, name, size}]
   * @param {string} [config.genomeId] - Genome identifier (e.g. "hg38")
   * @param {string} [config.chr] - Chromosome name (e.g. "chr21")
   * @param {number} [config.genomicStart] - Start position in bp
   * @param {number} [config.genomicEnd] - End position in bp
   * @param {number} [config.binSize] - Bin size in bp
   * @param {number} [config.traceLength] - Number of bins per trace
   * @param {number} [config.distanceThreshold] - Initial distance threshold.
   *   If omitted, a data-driven default is derived from the distance
   *   distribution (see _computeDefaultThreshold).
   * @param {string} [config.contactMode='frequency'] - 'contact' or 'frequency'
   * @param {string} [config.name] - Dataset name
   */
  constructor(e) {
    this.config = e, this.initialized = !1;
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
    const e = this.config;
    let a, t, i, n, r, s, f;
    if (e.swtText) {
      const c = de(e.swtText);
      a = c.traces, t = e.genomeId || c.genomeId, i = e.chr || c.chr, n = e.genomicStart !== void 0 ? e.genomicStart : c.genomicStart, r = e.genomicEnd !== void 0 ? e.genomicEnd : c.genomicEnd, s = e.binSize || c.binSize, f = c.traceLength;
    } else if (e.swFile || e.swUrl || e.swPath) {
      const c = await Ie({ file: e.swFile, url: e.swUrl, path: e.swPath });
      a = c.traces, t = e.genomeId || c.genomeId, i = e.chr || c.chr, n = e.genomicStart !== void 0 ? e.genomicStart : c.genomicStart, r = e.genomicEnd !== void 0 ? e.genomicEnd : c.genomicEnd, s = e.binSize || c.binSize, f = c.traceLength, c.sample;
    } else if (e.hdf5 && e.ensembleGroupKey)
      a = await W({ hdf5: e.hdf5, ensembleGroupKey: e.ensembleGroupKey }), t = e.genomeId, i = e.chr, n = e.genomicStart, r = e.genomicEnd, s = e.binSize, f = e.traceLength || a[0].length, e.name;
    else if (e.parsedData) {
      const c = e.parsedData;
      a = c.traces, t = e.genomeId || c.genomeId, i = e.chr || c.chr, n = e.genomicStart !== void 0 ? e.genomicStart : c.genomicStart, r = e.genomicEnd !== void 0 ? e.genomicEnd : c.genomicEnd, s = e.binSize || c.binSize, f = c.traceLength, c.sample;
    } else if (e.traces)
      a = e.traces, t = e.genomeId, i = e.chr, n = e.genomicStart, r = e.genomicEnd, s = e.binSize, f = e.traceLength || a[0].length, e.name;
    else
      throw new Error("LiveContactMap requires swtText, swFile/swUrl/swPath, hdf5+ensembleGroupKey, parsedData, or traces in config");
    if (this.traces = a, this.traceLength = f, this.binSize = s, this.genomicStart = n, this.genomicEnd = r, this.distanceThreshold = e.distanceThreshold, this.contactMode = e.contactMode || "frequency", this.binOffset = Math.floor(n / s), this.genomeId = t, this.version = 0, e.chromosomes)
      this.chromosomes = e.chromosomes;
    else {
      let c;
      const h = De[t];
      h && h[i] ? c = h[i] : c = r, this.chromosomes = [
        { index: 0, name: "All", size: c },
        { index: 1, name: i, size: c }
      ];
    }
    this.bpResolutions = [s], this.fragResolutions = [], this.wholeGenomeChromosome = this.chromosomes.find((c) => c.name === "All") || null, this.wholeGenomeResolution = this.wholeGenomeChromosome ? Math.round(this.wholeGenomeChromosome.size * (1e3 / 500)) : null, this.normalizationTypes = ["NONE"], this.normVectorIndex = {}, this.chromosomeIndexMap = {}, this.chrAliasTable = {};
    for (const c of this.chromosomes)
      if (this.chromosomeIndexMap[c.name] = c.index, this.chrAliasTable[c.name] = c.name, c.name.startsWith("chr")) {
        const h = c.name.substring(3);
        this.chrAliasTable[h] = c.name;
      } else c.name !== "All" && (this.chrAliasTable["chr" + c.name] = c.name);
    this.meta = {
      version: this.version,
      genome: this.genomeId,
      chromosomes: this.chromosomes,
      resolutions: this.bpResolutions
    }, this._computeDistances(), this.distanceThreshold === void 0 && (this.distanceThreshold = this._computeDefaultThreshold(xe)), this._deriveContacts(), this.initialized = !0;
  }
  /**
   * @returns {Promise<{version: number, genome: string, chromosomes: Array, resolutions: Array}>}
   */
  async getMetaData() {
    return await this.init(), this.meta;
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
  async getContactRecords(e, a, t, i, n) {
    await this.init();
    const r = Math.floor(a.start / n), s = Math.ceil(a.end / n), f = Math.floor(t.start / n), c = Math.ceil(t.end / n), h = [];
    for (const d of this.contactRecords)
      d.bin1 >= r && d.bin1 < s && d.bin2 >= f && d.bin2 < c && h.push(d), d.bin1 !== d.bin2 && d.bin2 >= r && d.bin2 < s && d.bin1 >= f && d.bin1 < c && h.push(new S(d.bin2, d.bin1, d.counts));
    return h;
  }
  /**
   * Get matrix for a chromosome pair.
   * Returns a lightweight Matrix-like object with a single zoom level.
   *
   * @param {number} chrIdx1 - Chromosome index
   * @param {number} chrIdx2 - Chromosome index
   * @returns {Promise<LiveMatrix|undefined>}
   */
  async getMatrix(e, a) {
    await this.init();
    const t = this.chromosomes[e], i = this.chromosomes[a];
    if (!t || !i) return;
    let n = 0;
    for (const c of this.contactRecords)
      n += c.counts;
    const r = this.traceLength, s = r > 0 ? n / (r * r) : 0, f = {
      chr1: t,
      chr2: i,
      zoom: { index: 0, binSize: this.binSize, unit: "BP" },
      averageCount: s,
      sumCounts: n,
      blockBinCount: this.traceLength,
      blockColumnCount: 1,
      stdDev: 0,
      occupiedCellCount: this.contactRecords.length,
      percent95: 0
    };
    return new Ee(t, i, f);
  }
  /**
   * @returns {Promise<boolean>} Always false — live maps don't support normalization vectors
   */
  async hasNormalizationVector(e, a, t, i) {
    return !1;
  }
  /**
   * @returns {Promise<string[]>} Always ['NONE']
   */
  async getNormalizationOptions() {
    return this.normalizationTypes || ["NONE"];
  }
  /**
   * Resolve a chromosome alias to the canonical name.
   * @param {string} chrAlias
   * @returns {string}
   */
  getFileChrName(e) {
    return this.chrAliasTable && this.chrAliasTable.hasOwnProperty(e) ? this.chrAliasTable[e] : e;
  }
  /**
   * No caches to clear for in-memory data.
   */
  clearCaches() {
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
  setDistanceThreshold(e) {
    this.distanceThreshold = e, this.initialized && this._deriveContacts();
  }
  /**
   * Replace the vertex data entirely (e.g., new ensemble loaded).
   * Recomputes everything: distances and contacts.
   *
   * @param {Array<Array<{x, y, z, isMissingData?}>>} traces
   * @param {object} [config] - Optional overrides for genomicStart, genomicEnd, binSize, etc.
   */
  updateVertexData(e, a = {}) {
    this.traces = e, a.traceLength !== void 0 ? this.traceLength = a.traceLength : this.traceLength = e[0].length, a.binSize !== void 0 && (this.binSize = a.binSize), a.genomicStart !== void 0 && (this.genomicStart = a.genomicStart), a.genomicEnd !== void 0 && (this.genomicEnd = a.genomicEnd), this._computeDistances(), this._deriveContacts();
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
    const e = ze(this.traces, this.traceLength);
    this.distanceMatrix = e.distances, this.maxDistance = e.maxDistance;
  }
  /**
   * Derive a data-driven distance threshold from the distance matrix.
   *
   * 3D coordinates are in arbitrary, per-dataset units, so a fixed threshold
   * is meaningless. Instead, use the `density` percentile of the off-diagonal
   * pairwise distances: ~`density` fraction of pairs then fall within
   * threshold. This is exact for contact mode, and a close proxy for the mean
   * contact frequency in frequency mode, and adapts to any dataset's scale.
   *
   * @param {number} density - target contact density in (0, 1)
   * @returns {number} distance threshold
   * @private
   */
  _computeDefaultThreshold(e) {
    const a = this.traceLength, t = this.distanceMatrix, i = [];
    for (let r = 0; r < a; r++)
      for (let s = r + 1; s < a; s++) {
        const f = t[r * a + s];
        f !== M && i.push(f);
      }
    if (i.length === 0)
      return this.maxDistance > 0 ? this.maxDistance : 1;
    i.sort((r, s) => r - s);
    const n = Math.min(i.length - 1, Math.floor(e * i.length));
    return i[n];
  }
  /**
   * Derive contact records from the distance matrix using the current
   * distance threshold.
   * @private
   */
  _deriveContacts() {
    let e;
    if (this.contactMode === "frequency") {
      const t = ge(
        this.traces,
        this.traceLength,
        this.distanceThreshold
      );
      e = t.contactRecords, this.contactFrequencies = t.contactFrequencies;
    } else
      e = Ce(
        this.distanceMatrix,
        this.traceLength,
        this.distanceThreshold
      ), this.contactFrequencies = void 0;
    const a = this.binOffset;
    a === 0 ? this.contactRecords = e : this.contactRecords = e.map(
      (t) => new S(t.bin1 + a, t.bin2 + a, t.counts)
    );
  }
}
export {
  ye as LiveContactMap,
  ve as default
};
//# sourceMappingURL=hic-straw.esm.js.map

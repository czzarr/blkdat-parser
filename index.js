var through = require('through2')
var utils = require('bcoin-utils')
var readU32 = utils.readU32

module.exports = function (network) {
  var constants = require('bitcoin-constants')(network)

  var cache
  var s = 0
  var S = {
    END_OF_BLOCK: s++,
    END_OF_MAGIC: s++,
    END_OF_SIZE: s++,
    MIDDLE_OF_BLOCK: s++,
    MIDDLE_OF_MAGIC: s++,
    MIDDLE_OF_SIZE: s++,
    LAST_BLOCK_PARSED: s++,
  }
  var state = S.END_OF_BLOCK

  function stateToString (stateNumber) {
    for (var state in S) {
      var number = S[state];
      if (number === stateNumber) return state;
    }
  }

  function parseChunk (chunk, enc, done) {

    var off = 0
    var diff = -1
    var block, magic, size, raw

    while (true) {
      switch (state) {
        case S.END_OF_BLOCK:
          magic = chunk.slice(off, off + 4)

          if (magic.length < 4) {
            state = S.MIDDLE_OF_MAGIC
            cache = { magic: magic }
            return done()
          }

          magic = readU32(magic)
          if (magic !== constants.magic) {
            if (magic === 0) {
              state = S.LAST_BLOCK_PARSED
              return done()
            } else
              throw new Error('wrong magic number')
          }

          off += 4
          state = S.END_OF_MAGIC
          break

        case S.END_OF_MAGIC:
          size = chunk.slice(off, off + 4)

          if (size.length < 4) {
            state = S.MIDDLE_OF_SIZE
            cache = { size: size }
            return done()
          }

          size = readU32(size)
          off += 4
          state = S.END_OF_SIZE
          break

        case S.END_OF_SIZE:
          diff = size - chunk.slice(off).length

          if (diff <= 0) { // full block is in this chunk
            raw = chunk.slice(off, off + size)
            this.push(raw)
            state = S.END_OF_BLOCK
            if (diff === 0) // we are at the end of this chunk
              return done()
            off += size
            break
          } else { // full block overflows this chunk
            state = S.MIDDLE_OF_BLOCK
            cache = {
              chunk: chunk.slice(off),
              size: size,
              diff: diff
            }
            return done()
          }

        case S.MIDDLE_OF_BLOCK:
          chunk = Buffer.concat([cache.chunk, chunk])

          if (chunk.length < cache.size) { // block still overflows
            cache.chunk = chunk
            return done()
          }

          raw = chunk.slice(off, off + cache.size)
          this.push(raw)
          off = cache.size
          cache = undefined
          state = S.END_OF_BLOCK
          break

        case S.MIDDLE_OF_MAGIC:
          magic = Buffer.concat([cache.magic, chunk.slice(0, 4 - cache.magic.length)])
          off += 4 - cache.magic.length

          if (readU32(magic) !== constants.magic)
            throw new Error('wrong magic number')

          cache = undefined
          state = S.END_OF_MAGIC
          break

        case S.MIDDLE_OF_SIZE:
          size = readU32(Buffer.concat([cache.size, chunk.slice(0, 4 - cache.size.length)]))
          off += 4 - cache.size.length
          cache = undefined
          state = S.END_OF_SIZE
          break

        case S.LAST_BLOCK_PARSED:
          return done()
      }
    }
  }

  return through(parseChunk)
}


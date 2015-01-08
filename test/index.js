var async = require('async')
var bl = require('bcoin-block')
var btx = require('bcoin-tx')
var CombinedStream = require('combined-stream')
var fs = require('fs')
var glob = require('glob')
var parseBlock = require('bitcoin-block-streaming-parser')
var parseBlkDat = require('../')
var path = require('path')
var through = require('through2')
var utils = require('bcoin-utils')
var util = require('util')

var dataDir = '/Users/stan/Library/Application Support/Bitcoin/testnet3/blocks'

glob('blk*.dat', { cwd: dataDir }, function (err, files) {
  var cs = CombinedStream.create()
  async.eachSeries(
    files,
    function (file, done) {
      cs.append(function (next) {
        next(fs.createReadStream(path.resolve(dataDir, file), { mode: 0444 }))
      })
      done()
    },
    function (err) {
      if (err)
        throw err
      console.log('all good');
      cs
        .pipe(parseBlkDat('testnet3'))
        .pipe(parseBlock('testnet3'))
        .pipe(through.obj(function (chunk, enc, done) {
          var b = bl('testnet3', chunk, 'block')
          var t = btx('testnet3', chunk.txs[0])
          //console.log(t);
          //console.log(util.inspect(t.outputs, false, null));
          console.log(t.hash('hex'));
          console.log(t.txid('hex'));
          //console.log(b.tx);
          //console.log('hash', t.hash('hex'));
          //console.log('txid', t.txid('hex'));
          //throw Error()
          done()
        }))
    }
  )
})

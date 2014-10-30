# Blk*.dat file streaming parser
Parses the blk*.dat files that are created by Bitcoin Core.
Allows for super fast replication of the blocks database

Supports mainnet and testnet3

```
npm i blkdat-parser
```
# Example
```
var CombinedStream = require('combined-stream')
var fs = require('fs')
var glob = require('glob')
var parseBlock = require('bitcoin-block-streaming-parser')
var parseBlkDat = require('../')
var path = require('path')
var through = require('through2')

var dataDir = '/Users/stan/Library/Application Support/Bitcoin/testnet3/blocks'

glob('blk*.dat', { cwd: dataDir }, function (err, files) {
  var cs = CombinedStream.create()
  for (var j = 0; j < files.length; j++) {
    cs.append(fs.createReadStream(path.resolve(dataDir, files[j])))
  }
  cs
    .pipe(parseBlkDat('testnet3'))
    .pipe(parseBlock('testnet3'))
    .pipe(through.obj(function (chunk, enc, done) {
      console.log(chunk);
      done()
    }))
})
```

License MIT

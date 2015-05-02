#!/usr/bin/env node
//console.log('hello world!');
/*
var args = process.argv.slice(2);
for (var i=0;i<args.length;i++){
    console.log(args[i]);
}
*/

var lexalia = require('./lexaliaparser.js');

process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(data) {
  process.stdout.write( JSON.stringify(lexalia.run(data))+"\n" );
});

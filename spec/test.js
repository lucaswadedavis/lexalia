/* global lexaliaparser, describe, it, expect, should */

describe('escodegen.generate()', function () {
  'use strict';

  it('exists', function () {
    expect(escodegen.generate).to.be.a('function');

  });

  it('should parse an ast and return a string of Javascript', function () {
    var ast = {
      type: 'BinaryExpression',
      operator: '+',
      left: { type: 'Literal', value: 40 },
      right: { type: 'Literal', value: 2 }
    };
    expect(escodegen.generate(ast)).to.equal('40 + 2');
  });

});

describe('lexalia.parse()', function () {
  'use strict';

  var prog = `do(define(x, 10),
     if(>(x, 5),
        print("large"),
        print("small")))`;

  it('exists', function () {
    expect(lexalia.parse).to.be.a('function');
  });

  it('returns an object when handed a program string', function () {

    expect(lexalia.parse(prog)).to.be.an('object');
  });

  it('escodegen is present', function () {
    expect(escodegen.generate).to.be.a('function');
  });

  it('returns a js string when passed the ast to escodegen',function(){
    console.log(lexalia.parse(prog));
    
    expect(escodegen.generate(lexalia.parse(prog))).to.be.a('string');
  });
  
});

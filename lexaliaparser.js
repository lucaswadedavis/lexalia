(function(){
  var compiledJS = "";
  var lexalia = {};
  
  function parseExpression(program) {
    program = skipSpace(program);
    var match, expr, esExpr;
    if (match = /^"([^"]*)"/.exec(program)){
      expr = {type: "value", value: match[1]};
      esExpr = {type : "Literal", value: match[1]};
    } else if (match = /^\d+\b/.exec(program)){
      expr = {type: "value", value: Number(match[0])};
    } else if (match = /^[^\s(),"]+/.exec(program)){
      expr = {type: "word", name: match[0]};
    } else {
      throw new SyntaxError("Unexpected syntax: " + program);
    }
    return parseApply(expr, program.slice(match[0].length));
  }

  function skipSpace(string) {
    var skippable = string.match(/^(\s|#.*)*/);
    return string.slice(skippable[0].length);
  }
  
  function parseApply(expr, program) {
    program = skipSpace(program);
    var encapsulation = {open: "the", close: ")"};
    if (program.slice(0,encapsulation.open.length) != encapsulation.open){
      return {expr: expr, rest: program};
    }
    program = skipSpace(program.slice(3));
    expr = {type: "apply", operator: expr, args: []};
    while (program[0] != encapsulation.close) {
      var arg = parseExpression(program);
      expr.args.push(arg.expr);
      program = skipSpace(arg.rest);
      if (program[0] == ",")
        program = skipSpace(program.slice(1));
      else if (program[0] != encapsulation.close)
        throw new SyntaxError("Expected ',' or "+encapsulation.close);
    }
    return parseApply(expr, program.slice(1));
  }
  
  ////////////////////////////////////////////////////////
  
  
  function parse(program) {
    var result = parseExpression(program);
    if (skipSpace(result.rest).length > 0)
      throw new SyntaxError("Unexpected text after program");
    return result.expr;
  }
  
  function evaluate(expr, env) {
    switch(expr.type) {
      case "value":
        //console.log(expr.value);
        return expr.value;
      case "word":
        if (expr.name in env){
          //console.log(expr.name)
          return env[expr.name];
        } else {
          throw new ReferenceError("Undefined variable: " + expr.name);
        }
      case "apply":
        if (expr.operator.type == "word" &&
            expr.operator.name in specialForms){
          //console.log(specialForms[expr.operator.name](expr.args, env));
          return specialForms[expr.operator.name](expr.args, env);
          }
        var op = evaluate(expr.operator, env);
        if (typeof op != "function")
          throw new TypeError("Applying a non-function.");
        return op.apply(null, expr.args.map(function(arg) {
          //console.log(evaluate(arg,env));
          return evaluate(arg, env);
        }));
    }
  }

  ////////////////////////////////////////////////////////
 
  function run() {
    var env = Object.create(topEnv);
    var program = Array.prototype.slice
      .call(arguments, 0).join("\n");
    return evaluate(parse(program), env);
  }    
  
  ////////////////////////////////////////////////////////

  ////////////////////////////////////////////////////////
  
  var specialForms = Object.create(null);
  
  specialForms["if"] = function(args, env) {
    if (args.length != 3)
      throw new SyntaxError("Bad number of args to if");
  
    if (evaluate(args[0], env) !== false)
      return evaluate(args[1], env);
    else
      return evaluate(args[2], env);
  };
  specialForms['if'].compiledJS = function(args, env){
    compiledJS += "if";
  };
  
  specialForms["while"] = function(args, env) {
    if (args.length != 2)
      throw new SyntaxError("Bad number of args to while");
  
    while (evaluate(args[0], env) !== false)
      evaluate(args[1], env);
  
    return false;
  };
  specialForms['while'].compiledJS = function(args, env){
    compiledJS += "while";
  };
  
  specialForms["do"] = function(args, env) {
    var value = false;
    args.forEach(function(arg) {
      value = evaluate(arg, env);
    });
    return value;
  };
  specialForms['do'].compiledJS = function(args, env){
    compiledJS += "do";
  };
  
  specialForms["define"] = function(args, env) {
    if (args.length != 2 || args[0].type != "word")
      throw new SyntaxError("Bad use of define");
    var value = evaluate(args[1], env);
    env[args[0].name] = value;
    return value;
  };
  specialForms['define'].compiledJS = function(args, env){
    compiledJS += "define";
  };
  
  specialForms["fun"] = function(args, env) {
    if (!args.length)
      throw new SyntaxError("Functions need a body");
    function name(expr) {
      if (expr.type != "word")
        throw new SyntaxError("Arg names must be words");
      return expr.name;
    }
    var argNames = args.slice(0, args.length - 1).map(name);
    var body = args[args.length - 1];
  
    return function() {
      if (arguments.length != argNames.length)
        throw new TypeError("Wrong number of arguments");
      var localEnv = Object.create(env);
      for (var i = 0; i < arguments.length; i++)
        localEnv[argNames[i]] = arguments[i];
      return evaluate(body, localEnv);
    };
  };
  specialForms['fun'].compiledJS = function(args, env){
    compiledJS += "fun";
  };
  
  specialForms["set"] = function(args, env) {
    if (args.length != 2 || args[0].type != "word")
      throw new SyntaxError("Bad use of set");
    var varName = args[0].name;
    var value = evaluate(args[1], env);
  
    for (var scope = env; scope; scope = Object.getPrototypeOf(scope)) {
      if (Object.prototype.hasOwnProperty.call(scope, varName)) {
        scope[varName] = value;
        return value;
      }
    }
    throw new ReferenceError("Setting undefined variable " + varName);
  };
  specialForms['set'].compiledJS = function(args, env){
    compiledJS += "set";
  };
  
  ////////////////////////////////////////////////////////
  
  var topEnv = Object.create(null);

  topEnv["true"] = true;
  topEnv["false"] = false;
  
  //prefix notation
  
  ["+", "-", "*", "/", "<", ">"].forEach(function(op) {
    topEnv[op] = new Function("a, b", "return a " + op + " b;");
  });
  
  topEnv["=="] = new Function("a, b", "return a === b;");
  
  topEnv["array"] = function() {
    return Array.prototype.slice.call(arguments, 0);
  };
  
  topEnv["length"] = function(array) {
    return array.length;
  };
  
  topEnv["element"] = function(array, i) {
    return array[i];
  };
  
  topEnv["print"] = function(value) {
    //console.log(value);
    return value;
  };

  ////////////////////////////////////////////////////////
  
  lexalia.parse = parse;
  lexalia.run = run;

  ////////////////////////////////////////////////////////
  
  var root = this;
  
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = lexalia;
    }
    exports.lexalia = lexalia;
  } else {
    root.lexalia= lexalia;
  }
        
}).call(this);
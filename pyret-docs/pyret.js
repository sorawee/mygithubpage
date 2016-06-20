CodeMirror.defineMode("pyret", function(config, parserConfig) {
  var ERRORCLASS = 'error';
  function wordRegexp(words) {
    return new RegExp("^((" + words.join(")|(") + "))(?![a-zA-Z0-9-_])");
  }
  
  const pyret_indent_regex = new RegExp("^[a-zA-Z_][a-zA-Z0-9$_\\-]*");
  const pyret_closing_keywords = ["end"];
  const pyret_opening_keywords_colon = ["try", "ask", "ref-graph", "block"];
  const pyret_opening_keywords_nocolon = ["fun", "when", "for", "if", "let",
                                          "cases", "data", "shared", "check",
                                          "except", "letrec", "lam", "method",
                                          "examples"];
  const pyret_opening_keywords = pyret_opening_keywords_colon.concat(pyret_opening_keywords_nocolon);
  const pyret_keywords = 
    wordRegexp(["else if"].concat(pyret_opening_keywords_nocolon, pyret_closing_keywords,
               ["var", "rec", "import", "include", "provide", "type", "newtype",
                "from", "lazy", "shadow", "ref",
                "and", "or", "as", "else", "cases", "is==", "is=~", "is<=>", "is", "satisfies", "raises",
                "violates"]));
  const pyret_booleans = wordRegexp(["true", "false"]);
  const pyret_keywords_hyphen =
    wordRegexp(["provide-types", "type-let", "does-not-raise", "raises-violates", 
                "raises-satisfies", "raises-other-than", "is-not==", "is-not=~", "is-not<=>", "is-not"]);
  const pyret_keywords_colon = 
    wordRegexp(pyret_opening_keywords_colon.concat(["doc", "otherwise", "then", "with", "sharing", "where"]));
  const pyret_single_punctuation = 
    new RegExp("^([" + [":", ".", "<", ">", ",", "^", "!",
                        ";", "|", "=", "+", "*", "/", "\\\\", // NOTE: No minus
                        "(", ")", "{", "}", "\\[", "\\]"].join('') + "])");
  const pyret_double_punctuation = 
    new RegExp("^((" + ["<=>", "::", "=~", "==", ">=", "<=", "=>", "->", ":=", "<>"].join(")|(") + "))");
  const initial_operators = { "-": true, "+": true, "*": true, "/": true, "<": true, "<=": true,
                              ">": true, ">=": true, "==": true, "<>": true, ".": true, "^": true,
                              "<=>": true, "=~": true,
                              "is": true, "is==": true, "is=~": true, "is<=>": true,
                              "is-not": true, "is-not==": true, "is-not=~": true, "is-not<=>": true,
                              "satisfies": true, "violates": true, "raises": true, "raises-other-than": true,
                              "does-not-raise": true, "raises-satisfies": true, "raises-violates": true
                            }
  
  
  function ret(state, tokType, content, style) {
    state.lastToken = tokType; state.lastContent = content;
    return style;
  }

  function tokenBase(stream, state) { 
    if (stream.eatSpace())
      return "IGNORED-SPACE";

    var ch = stream.peek();
    

    // Handle Comments
    if (ch === '#') {
      if (stream.match("#|", true)) { 
        state.tokenizer = tokenizeBlockComment;
        state.commentNestingDepth = 1;
        return ret(state, "COMMENT-START", state.lastContent, 'comment');
      } else {
        stream.skipToEnd();
        return ret(state, "COMMENT", state.lastContent, 'comment');
      }
    }
    // Handle Number Literals
    if (stream.match(/^[0-9]+(\.[0-9]+)?/))
      return ret(state, 'number', stream.current(), 'number');
    
    // if (ch === '"') {
    //   state.tokenizer = tokenStringDouble;
    //   state.lastToken = '"';
    //   stream.eat('"');
    //   return state.tokenizer(stream, state);
    // }
    // if (ch === "'") {
    //   state.tokenizer = tokenStringSingle;
    //   state.lastToken = "'";
    //   stream.eat("'");
    //   return state.tokenizer(stream, state);
    // }
    const dquot_str = 
      new RegExp("^\"(?:" +
                 "\\\\[01234567]{1,3}" +
                 "|\\\\x[0-9a-fA-F]{1,2}" + 
                 "|\\\\u[0-9a-fA-f]{1,4}" + 
                 "|\\\\[\\\\nrt\"\']" + 
                 "|[^\\\\\"\n\r])*\"");
    const squot_str = 
      new RegExp("^\'(?:" +
                 "\\\\[01234567]{1,3}" +
                 "|\\\\x[0-9a-fA-F]{1,2}" + 
                 "|\\\\u[0-9a-fA-f]{1,4}" + 
                 "|\\\\[\\\\nrt\"\']" + 
                 "|[^\\\\\'\n\r])*\'");
    const unterminated_string = new RegExp("^[\"\'].*");

    var match;
    if (match = stream.match(dquot_str, true)) {
      return ret(state, 'string', match[0], 'string');
    } else if (match = stream.match(squot_str, true)) {
      return ret(state, 'string', match[0], 'string');
    } else if (stream.match(/^```/, true)) {
      state.tokenizer = tokenStringTriple;
      state.inString = stream.column();
      state.lastToken = '```';
      return state.tokenizer(stream, state);
    } else if (match = stream.match(unterminated_string, true)) {
      return ret(state, 'string', match[0], 'unterminated-string');
    }
    // Level 1
    if ((match = stream.match(pyret_double_punctuation, true)) || 
        (match = stream.match(pyret_single_punctuation, true))) {
      if (state.dataNoPipeColon && (match[0] == ":" || match[0] == "|"))
        state.dataNoPipeColon = false;
      return ret(state, match[0], match[0], 'builtin');
    }
    if (match = stream.match(pyret_keywords_hyphen, true)) {
      return ret(state, match[0], match[0], 'keyword');
    }
    if (match = stream.match(pyret_keywords, true)) {
      if (match[0] == "data")
        state.dataNoPipeColon = true;
      return ret(state, match[0], match[0], 'keyword');
    }
    if (match = stream.match(pyret_booleans, true)) {
      return ret(state, match[0], match[0], 'boolean');
    }
    if (match = stream.match(pyret_keywords_colon, true)) {
      if (stream.peek() === ":")
        return ret(state, match[0], match[0], 'keyword');
      else
        return ret(state, 'name', match[0], 'variable');
    }
    // Level 2
    if (match = stream.match(pyret_indent_regex)) {
      if (state.lastToken === "|" || state.lastToken === "::" || state.lastToken === "data"
          || state.dataNoPipeColon) {
        state.dataNoPipeColon = false;
        return ret(state, 'name', match[0], 'type');
      }
      else if (stream.match(/\s*\(/, false))
        return ret(state, 'name', match[0], 'function-name');
      return ret(state, 'name', match[0], 'variable');
    }
    if (stream.eat("-"))
      return ret(state, '-', '-', 'builtin');
    stream.next();
    return null;
  }

  function mkTokenString(singleOrDouble) {
    return function(stream, state) {
      var insideRE = singleOrDouble === "'" ? new RegExp("[^'\\]") : new RegExp('[^"\\]');
      var endRE = singleOrDouble === "'" ? new RegExp("'") : new RegExp('"');
      while (!stream.eol()) {
        stream.eatWhile(insideRE);
        if (stream.eat('\\')) {
          stream.next();
          if (stream.eol())
            return ret(state, 'string', stream.current(), 'string');
        } else if (stream.eat(singleOrDouble)) {
          state.tokenizer = tokenBase;
          return ret(state, 'string', stream.current(), 'string');
        } else
          stream.eat(endRE);
      }
      return ret(state, 'string', stream.current(), 'string');
    };
  }

  function tokenizeBlockComment(stream, state) {
    if (stream.match('#|', true)) {
      state.commentNestingDepth++; 
      return ret(state, "COMMENT-START", state.lastContent, 'comment');
    } else if (stream.match('|#', true)) {
      state.commentNestingDepth--;
      if (state.commentNestingDepth === 0) state.tokenizer = tokenBase;
      return ret(state, "COMMENT-END", state.lastContent, 'comment');
    } else {
      stream.next(); stream.eatWhile(/[^#|]/);
      return ret(state, "COMMENT", state.lastContent, 'comment');
    }
  }

  var tokenStringDouble = mkTokenString('"');
  var tokenStringSingle = mkTokenString("'");

  function tokenStringTriple(stream, state) {
    while (!stream.eol()) {
      stream.match(/[^`\\]*/, true); //eatWhile(/[^`\\]|`{1,2}([^`\\]|(?:\\))/);
      if (stream.eat('\\')) {
        stream.next();
        if (stream.eol()) {
          return ret(state, 'string', stream.current(), 'string');
        }
      } else if (stream.match('```', true)) {
        state.tokenizer = tokenBase;
        state.inString = false;
        return ret(state, 'string', stream.current(), 'string');
      } else
        stream.next();
    }
    return ret(state, 'string', stream.current(), 'string');
  }

  // Parsing

  function Indent(funs, cases, data, shared, trys, except, graph, parens, objects, vars, fields, initial, comments) {
    this.fn = funs || 0;
    this.c = cases || 0;
    this.d = data || 0;
    this.s = shared || 0;
    this.t = trys || 0;
    this.e = except || 0;
    this.g = graph || 0;
    this.p = parens || 0;
    this.o = objects || 0;
    this.v = vars || 0;
    this.f = fields || 0;
    this.i = initial || 0;
    this.comments = comments || 0;
  }
  Indent.prototype.toString = function() {
    return ("Fun " + this.fn + ", Cases " + this.c + ", Data " + this.d + ", Shared " + this.s
            + ", Try " + this.t + ", Except " + this.e + ", Graph " + this.g + ", Parens " + this.p 
            + ", Object " + this.o + ", Vars " + this.v + ", Fields " + this.f + ", Initial " + this.i
            + ", Comment depth " + this.comments);
  }
  Indent.prototype.copy = function() {
    return new Indent(this.fn, this.c, this.d, this.s, this.t, this.e, this.g, 
                      this.p, this.o, this.v, this.f, this.i, this.comments);
  }
  Indent.prototype.zeroOut = function() {
    this.fn = this.c = this.d = this.s = this.t = this.e = this.g = this.p = this.o = this.v = this.f = this.i = this.comments = 0;
  }
  Indent.prototype.addSelf = function(that) {
    this.fn += that.fn; this.c += that.c; this.d += that.d; this.s += that.s; this.t += that.t; this.e += that.e;
    this.g += that.g; this.p += that.p; this.o += that.o; this.v += that.v; this.f += that.f; this.i += that.i;
    this.comments += that.comments;
    return this;
  }
  Indent.prototype.add = function(that) { return this.copy().addSelf(that); }
  Indent.prototype.subSelf = function(that) {
    this.fn -= that.fn; this.c -= that.c; this.d -= that.d; this.s -= that.s; this.t -= that.t; that.e -= that.e;
    this.g -= that.g; this.p -= that.p; this.o -= that.o; this.v -= that.v; this.f -= that.f; this.i -= that.i;
    this.comments -= that.comments;
    return this;
  }
  Indent.prototype.sub = function(that) { return this.copy().subSelf(that); }

  function LineState(tokens,
                     nestingsAtLineStart, nestingsAtLineEnd,
                     deferedOpened, curOpened, deferedClosed, curClosed) {
    this.tokens = tokens;
    this.nestingsAtLineStart = nestingsAtLineStart;
    this.nestingsAtLineEnd = nestingsAtLineEnd;
    this.deferedOpened = deferedOpened;
    this.curOpened = curOpened;
    this.deferedClosed = deferedClosed;
    this.curClosed = curClosed;
  }
  LineState.prototype.copy = function() {
    return new LineState(this.tokens.concat([]),
                         this.nestingsAtLineStart.copy(), this.nestingsAtLineEnd.copy(),
                         this.deferedOpened.copy(), this.curOpened.copy(), 
                         this.deferedClosed.copy(), this.curClosed.copy());
  }
  LineState.prototype.print = function() {
    console.log("LineState is:");
    console.log("  NestingsAtLineStart = " + this.nestingsAtLineStart);
    console.log("  NestingsAtLineEnd = " + this.nestingsAtLineEnd);
    console.log("  DeferedOpened = " + this.deferedOpened);
    console.log("  DeferedClosed = " + this.deferedClosed);
    console.log("  CurOpened = " + this.curOpened);
    console.log("  CurClosed = " + this.curClosed);
    console.log("  Tokens = " + this.tokens);
  }

  function peek(arr) { return arr[arr.length - 1]; }
  function hasTop(arr, wanted) {
    if (wanted instanceof Array) {
      for (var i = 0; i < wanted.length; i++) {
        if (arr[arr.length - 1 - i] !== wanted[i]) {
          return false;
        }
      }
      return true;
    } else {
      return arr[arr.length - 1] === wanted;
    }
  }
  function parse(firstTokenInLine, state, stream, style) {
    ls = state.lineState;
    if (firstTokenInLine) {
      ls.nestingsAtLineStart = ls.nestingsAtLineEnd.copy();
    }
    if (ls.nestingsAtLineStart.comments > 0 || ls.curOpened.comments > 0 || ls.deferedOpened.comments > 0) {
      if (state.lastToken === "COMMENT-END") {
        if (ls.curOpened.comments > 0) ls.curOpened.comments--;
        else if (ls.deferedOpened.comments > 0) ls.deferedOpened.comments--;
        else if (firstTokenInLine) ls.curClosed.comments++;
        else ls.deferedClosed.comments++;
      } else if (state.lastToken === "COMMENT-START") {
        ls.deferedOpened.comments++;
      }
    } else if (state.lastToken === "COMMENT-START") {
      ls.deferedOpened.comments++;
    } else if (state.lastToken === "COMMENT") {
      // nothing to do
    } else if (hasTop(ls.tokens, "NEEDSOMETHING")) {
      ls.tokens.pop();
      if (hasTop(ls.tokens, "VAR") && ls.deferedOpened.v > 0) {
        ls.deferedOpened.v--;
        ls.tokens.pop();
      }
      parse(firstTokenInLine, state, stream, style); // keep going; haven't processed token yet
    } else if (firstTokenInLine && 
               ((initial_operators[state.lastToken] && (state.lastToken == "." || stream.match(/^\s+/)))
                || (state.lastToken === "is" && stream.match(/^%/))
                || (state.lastToken === "is-not" && stream.match(/^%/)))) {
      ls.curOpened.i++;
      ls.deferedClosed.i++;
    } else if (state.lastToken === ":") {
      if (hasTop(ls.tokens, "WANTCOLON") || hasTop(ls.tokens, "WANTCOLONOREQUAL"))
        ls.tokens.pop();
      else if (hasTop(ls.tokens, "OBJECT") || hasTop(ls.tokens, "SHARED")) {
        ls.deferedOpened.f++;
        ls.tokens.push("FIELD", "NEEDSOMETHING");
      }
    } else if (state.lastToken === "::") {
      if (hasTop(ls.tokens, "OBJECT") || hasTop(ls.tokens, "SHARED")) {
        ls.deferedOpened.f++;
        ls.tokens.push("FIELD", "NEEDSOMETHING");
      }
    } else if (state.lastToken === ",") {
      if (hasTop(ls.tokens, "FIELD")) {
        ls.tokens.pop();
        if (ls.curOpened.f > 0) ls.curOpened.f--;
        else if (ls.deferedOpened.f > 0) ls.deferedOpened.f--;
        else ls.deferedClosed.f++;
      }
    } else if (state.lastToken === "=") {
      if (hasTop(ls.tokens, "WANTCOLONOREQUAL")) 
        ls.tokens.pop();
      else {
        while (hasTop(ls.tokens, "VAR")) {
          ls.tokens.pop();
          ls.curClosed.v++;
        }
        ls.deferedOpened.v++;
        ls.tokens.push("VAR", "NEEDSOMETHING");
      }
    } else if (state.lastToken === "var" || state.lastToken === "rec") {
      ls.deferedOpened.v++;
      ls.tokens.push("VAR", "NEEDSOMETHING", "WANTCOLONOREQUAL");
    } else if (state.lastToken === "fun" || state.lastToken === "method" || state.lastToken === "lam") {
      ls.deferedOpened.fn++;
      ls.tokens.push("FUN", "WANTOPENPAREN");
    } else if (state.lastToken === "let" || state.lastToken === "letrec") {
      ls.deferedOpened.fn++;
      ls.tokens.push("LET", "WANTCOLON");
    } else if (state.lastToken === "when") {
      ls.deferedOpened.fn++; // when indents like functions
      ls.tokens.push("WHEN", "WANTCOLON");
    } else if (state.lastToken === "for") {
      ls.deferedOpened.fn++; // for-loops indent like functions
      ls.tokens.push("FOR", "WANTCOLON");
    } else if (state.lastToken === "cases") {
      ls.deferedOpened.c++;
      ls.tokens.push("CASES", "WANTCOLON", "WANTCLOSEPAREN", "WANTOPENPAREN");
    } else if (state.lastToken === "data") {
      ls.deferedOpened.d++;
      ls.tokens.push("DATA", "WANTCOLON", "NEEDSOMETHING");
    } else if (state.lastToken === "ask") {
      ls.deferedOpened.c++;
      ls.tokens.push("IFCOND");
    } else if (state.lastToken === "if") {
      ls.deferedOpened.fn++;
      ls.tokens.push("IF");
      ls.tokens.push("WANTCOLON", "NEEDSOMETHING");
    } else if (state.lastToken === "else if") {
      if (hasTop(ls.tokens, "IF")) {
        if (ls.curOpened.fn > 0) ls.curOpened.fn--;
        else if (ls.deferedOpened.fn > 0) ls.deferedOpened.fn--;
        else ls.curClosed.fn++;
        ls.deferedOpened.fn++;
        ls.tokens.push("WANTCOLON", "NEEDSOMETHING");
      }
    } else if (state.lastToken === "else") {
      if (hasTop(ls.tokens, "IF")) {
        if (ls.curOpened.fn > 0) ls.curOpened.fn--;
        else if (ls.deferedOpened.fn > 0) ls.deferedOpened.fn--;
        else ls.curClosed.fn++;
        ls.deferedOpened.fn++;
        ls.tokens.push("WANTCOLON");
      }
    } else if (state.lastToken === "|") {
      if (hasTop(ls.tokens, ["OBJECT", "DATA"]) || hasTop(ls.tokens, ["FIELD", "OBJECT", "DATA"])) {
        //ls.curClosed.o++;
        if (hasTop(ls.tokens, "FIELD")) {
          ls.tokens.pop();
          if (ls.curOpened.f > 0) ls.curOpened.f--;
          else if (ls.deferedOpened.f > 0) ls.deferedOpened.f--;
          else ls.curClosed.f++;
        }
        if (hasTop(ls.tokens, "OBJECT"))
          ls.tokens.pop();
      } else if (hasTop(ls.tokens, "DATA"))
        ls.tokens.push("NEEDSOMETHING");
    } else if (state.lastToken === "with") {
      if (hasTop(ls.tokens, ["WANTOPENPAREN", "WANTCLOSEPAREN", "DATA"])) {
        ls.tokens.pop(); ls.tokens.pop();
        ls.tokens.push("OBJECT", "WANTCOLON");
      } else if (hasTop(ls.tokens, ["DATA"])) {
        ls.tokens.push("OBJECT", "WANTCOLON");
      }        
    } else if (state.lastToken === "provide") {
      ls.tokens.push("PROVIDE");
    } else if (state.lastToken === "sharing") {
      ls.curClosed.d++; ls.deferedOpened.s++;
      if (hasTop(ls.tokens, ["OBJECT", "DATA"])) {
        ls.tokens.pop(); ls.tokens.pop();
        //ls.curClosed.o++;
        ls.tokens.push("SHARED", "WANTCOLON");
      } else if (hasTop(ls.tokens, "DATA")) {
        ls.tokens.pop();
        ls.tokens.push("SHARED", "WANTCOLON");
      }
    } else if (state.lastToken === "where" || (state.lastToken === "examples" && ls.tokens.length > 0)) {
      if (hasTop(ls.tokens, ["OBJECT", "DATA"])) {
        ls.tokens.pop();
        // ls.curClosed.o++; 
        ls.curClosed.d++; ls.deferedOpened.s++;
      } else if (hasTop(ls.tokens, "DATA")) {
        ls.curClosed.d++; ls.deferedOpened.s++;
      } else if (hasTop(ls.tokens, "FUN")) {
        ls.curClosed.f++; ls.deferedOpened.s++;
      } else if (hasTop(ls.tokens, "SHARED")) {
        ls.curClosed.s++; ls.deferedOpened.s++;
      }
      ls.tokens.pop();
      ls.tokens.push("CHECK", "WANTCOLON");
    } else if (state.lastToken === "check" || (state.lastToken === "examples" && ls.tokens.length === 0)) {
      ls.deferedOpened.s++;
      ls.tokens.push("CHECK", "WANTCOLON");
    } else if (state.lastToken === "try") {
      ls.deferedOpened.t++;
      ls.tokens.push("TRY", "WANTCOLON");
    } else if (state.lastToken === "except") {
      if (ls.curOpened.t > 0) ls.curOpened.t--;
      else if (ls.deferedOpened.t > 0) ls.deferedOpened.t--;
      else ls.curClosed.t++;
      if (hasTop(ls.tokens, "TRY")) {
        ls.tokens.pop();
        ls.tokens.push("WANTCOLON", "WANTCLOSEPAREN", "WANTOPENPAREN");
      }
    } else if (state.lastToken === "block") {
      ls.deferedOpened.fn++;
      ls.tokens.push("BLOCK", "WANTCOLON");
    } else if (state.lastToken === "ref-graph") {
      ls.deferedOpened.g++;
      ls.tokens.push("GRAPH", "WANTCOLON");
    } else if (state.lastToken === "[") {
      ls.deferedOpened.o++;
      ls.tokens.push("ARRAY");
    } else if (state.lastToken === "]") {
      if (firstTokenInLine) ls.curClosed.o++;
      else ls.deferedClosed.o++;
      if (hasTop(ls.tokens, "ARRAY"))
        ls.tokens.pop();
      while (hasTop(ls.tokens, "VAR")) {
        ls.tokens.pop();
        ls.deferedClosed.v++;
      }
    } else if (state.lastToken === "{") {
      ls.deferedOpened.o++;
      ls.tokens.push("OBJECT");
    } else if (state.lastToken === "}") {
      if (firstTokenInLine) ls.curClosed.o++;
      else ls.deferedClosed.o++;
      if (hasTop(ls.tokens, "FIELD")) {
        ls.tokens.pop();
        if (ls.curOpened.f > 0) ls.curOpened.f--;
        else if (ls.deferedOpened.f > 0) ls.deferedOpened.f--;
        else ls.curClosed.f++;
      }
      if (hasTop(ls.tokens, "OBJECT"))
        ls.tokens.pop();
      while (hasTop(ls.tokens, "VAR")) {
        ls.tokens.pop();
        ls.deferedClosed.v++;
      }
    } else if (state.lastToken === "(") {
      ls.deferedOpened.p++;
      if (hasTop(ls.tokens, "WANTOPENPAREN")) {
        ls.tokens.pop();
      } else if (hasTop(ls.tokens, "OBJECT") || hasTop(ls.tokens, "SHARED")) {
        ls.tokens.push("FUN");
        ls.deferedOpened.fn++;
      } else {
        ls.tokens.push("WANTCLOSEPAREN");
      }
    } else if (state.lastToken === ")") {
      if (ls.curOpened.p > 0) { ls.curOpened.p--; }
      else if (ls.deferedOpened.p > 0) { ls.deferedOpened.p--; }
      else {ls.deferedClosed.p++; }
      if (hasTop(ls.tokens, "WANTCLOSEPAREN"))
        ls.tokens.pop();
      while (hasTop(ls.tokens, "VAR")) {
        ls.tokens.pop();
        ls.deferedClosed.v++;
      }
    } else if (state.lastToken === "end" || state.lastToken === ";") {
      if (hasTop(ls.tokens, ["OBJECT", "DATA"])) {
        //ls.curClosed.o++;
        ls.tokens.pop();
      }
      var top = peek(ls.tokens);
      var is_semi, which_to_close;
      if (state.lastToken === ";") {
        is_semi = true;
        which_to_close = ls.deferedClosed;
      } else {
        is_semi = false;
        which_to_close = ls.curClosed;
      }
      var stillUnclosed = true;
      while (stillUnclosed && ls.tokens.length) {
        // Things that are not counted at all:
        //   provide, wantcolon, wantcolonorequal, needsomething, wantopenparen
        // Things that are counted but not closable by end:
        if (top === "OBJECT" || top === "ARRAY") {
          if (ls.curOpened.o > 0) ls.curOpened.o--;
          else if (ls.deferedOpened.o > 0) ls.deferedOpened.o--;
          else which_to_close.o++;
        } else if (top === "WANTCLOSEPAREN") {
          if (ls.curOpened.p > 0) ls.curOpened.p--;
          else if (ls.deferedOpened.p > 0) ls.deferedOpened.p--;
          else which_to_close.p++;
        } else if (top === "FIELD") {
          if (ls.curOpened.f > 0) ls.curOpened.f--;
          else if (ls.deferedOpened.f > 0) ls.deferedOpened.f--;
          else which_to_close.f++;
        } else if (top === "VAR") {
          if (ls.curOpened.v > 0) ls.curOpened.v--;
          else if (ls.deferedOpened.v > 0) ls.deferedOpened.v--;
          else which_to_close.v++;
        } 
        // Things that are counted, and closable by end:
        else if (top === "FUN" || top === "WHEN" || top === "FOR" || top === "IF" || top === "BLOCK" || top === "LET") {
          if (ls.curOpened.fn > 0) ls.curOpened.fn--;
          else if (ls.deferedOpened.fn > 0) ls.deferedOpened.fn--;
          else which_to_close.fn++;
          stillUnclosed = false;
        } else if (top === "CASES" || top === "IFCOND") {
          if (ls.curOpened.c > 0) ls.curOpened.c--;
          else if (ls.deferedOpened.c > 0) ls.deferedOpened.c--;
          else which_to_close.c++;
          stillUnclosed = false;
        } else if (top === "DATA") {
          if (ls.curOpened.d > 0) ls.curOpened.d--;
          else if (ls.deferedOpened.d > 0) ls.deferedOpened.d--;
          else which_to_close.d++;
          stillUnclosed = false;
        } else if (top === "SHARED" || top === "CHECK") {
          if (ls.curOpened.s > 0) ls.curOpened.s--;
          else if (ls.deferedOpened.s > 0) ls.deferedOpened.s--;
          else which_to_close.s++;
          stillUnclosed = false;
        } else if (top === "TRY") {
          if (ls.curOpened.t > 0) ls.curOpened.t--;
          else if (ls.deferedOpened.t > 0) ls.deferedOpened.t--;
          else which_to_close.t++;
          stillUnclosed = false;
        } else if (top === "EXCEPT") {
          if (ls.curOpened.e > 0) ls.curOpened.e--;
          else if (ls.deferedOpened.e > 0) ls.deferedOpened.e--;
          else which_to_close.e++;
          stillUnclosed = false;
        } else if (top === "GRAPH") {
          if (ls.curOpened.g > 0) ls.curOpened.g--
          else if (ls.deferedOpened.g > 0) ls.deferedOpened.g--;
          else which_to_close.g++;
          stillUnclosed = false;
        }
        ls.tokens.pop();
        top = peek(ls.tokens);
      }
    }
    if (stream.match(/\s*$/, false)) { // End of line; close out nestings fields
      // console.log("We think we're at an end of line");
      // console.log("LineState is currently");
      // ls.print();
      ls.nestingsAtLineStart.addSelf(ls.curOpened).subSelf(ls.curClosed);
      while (hasTop(ls.tokens, "VAR")) {
        ls.tokens.pop();
        ls.curClosed.v++;
      }
      ls.nestingsAtLineEnd.addSelf(ls.curOpened).addSelf(ls.deferedOpened)
        .subSelf(ls.curClosed).subSelf(ls.deferedClosed);
      ls.tokens = ls.tokens.concat([]);
      ls.curOpened.zeroOut(); ls.deferedOpened.zeroOut();
      ls.curClosed.zeroOut(); ls.deferedClosed.zeroOut();
    }
    // console.log("LineState is now");
    // ls.print();
  }


  const INDENTATION = new Indent(1, 2, 2, 1, 1, 1, 1/*could be 0*/, 1, 1, 1, 1, 1, 1.5);

  function copyState(oldState) {
    return { tokenizer: oldState.tokenizer, lineState: oldState.lineState.copy(),
             lastToken: oldState.lastToken, lastContent: oldState.lastContent,
             commentNestingDepth: oldState.commentNestingDepth, inString: oldState.inString,
             dataNoPipeColon: oldState.dataNoPipeColon,
             sol: oldState.sol
           }
  }
  
  function indent(state, textAfter, fullLine) {
    var indentUnit = config.indentUnit;
    var taSS = new CodeMirror.StringStream(textAfter, config.tabSize);
    var sol = true;
    var inString = state.inString;
    // console.log("***** In indent, before processing textAfter (" + textAfter + ")");
    // state.lineState.print();
    state = copyState(state);
    if (state.commentNestingDepth > 0) {
      state.lineState.nestingsAtLineStart = state.lineState.nestingsAtLineEnd.copy();
    }
    if (/^\s*$/.test(textAfter)) {
      state.lineState.nestingsAtLineStart = state.lineState.nestingsAtLineEnd.copy();
    } else {
      // TODO: track nested comment state in here, to indent if needed
      while (!taSS.eol()) {
        var style = state.tokenizer(taSS, state);
        if (style !== "IGNORED-SPACE") {
          parse(sol, state, taSS, style);
          sol = false;
        }
      }
    }
    // console.log("***** In indent, after processing textAfter (" + textAfter + ")");
    // state.lineState.print();
    var indentSpec = state.lineState.nestingsAtLineStart;
    var indent = 0;
    for (var key in INDENTATION) {
      if (INDENTATION.hasOwnProperty(key))
        indent += (indentSpec[key] || 0) * INDENTATION[key];
    }
    if ((indentSpec.comments > 0) || (inString !== false)) {
      var spaces = fullLine.match(/\s*/)[0].length;
      if (spaces > 0)       
        return spaces;
      else if (inString !== false)
        return inString;
      else 
        return indent * indentUnit;
    } else if (/^\s*\|([^#]|$)/.test(fullLine)) {
      return (indent - 1) * indentUnit;
    } else {
      return indent * indentUnit;
    }
  }


  var external = {
    startState: function(basecolumn) {
      return {
        tokenizer: tokenBase,
        inString: false,
        commentNestingDepth: 0,
        lineState: new LineState([],
                                 new Indent(), new Indent(), 
                                 new Indent(), new Indent(),
                                 new Indent(), new Indent()),
        sol: true
      };
    },
    blankLine: function blankLine(state) {
      // console.log("*** In BlankLine");
      state.lineState.nestingsAtLineStart = state.lineState.nestingsAtLineEnd.copy();
      // state.lineState.print();
    },

    copyState: copyState,
      
    token: function (stream, state) {
      // console.log("In token for stream = ");
      // console.log(stream);
      if (!state.sol && stream.sol()) {
        state.sol = true;
        state.indentation = stream.indentation();
      }
      var style = state.tokenizer(stream, state);
      if (style === "IGNORED-SPACE")
        return null;
      parse(state.sol, state, stream, style);
      state.sol = false;
      return style;
    },

    indent: indent,

    electricInput: new RegExp("(?:[de.\\]}|:]|\|#|[-enst\\*\\+/=<>^~]\\s|is%|is-not%)$"),

    fold: "pyret",

    delimiters: {opening: pyret_opening_keywords, closing: pyret_closing_keywords}

  };
  return external;
});

// CodeMirror.defineMIME("text/x-pyret", "pyret");

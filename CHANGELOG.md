# 6.0.0

### 🚀 Features

- project the values of selections through read-only views ([bfc3ff4](https://github.com/fundamentry/grammar/commit/bfc3ff4))

### 🩹 Fixes

- ⚠️  read only the parts a tree has ([45d4686](https://github.com/fundamentry/grammar/commit/45d4686))
- hand projections the value alone ([1ded011](https://github.com/fundamentry/grammar/commit/1ded011))

### ⚠️  Breaking Changes

- read only the parts a tree has  ([45d4686](https://github.com/fundamentry/grammar/commit/45d4686))

## 5.1.0

### 🚀 Features

- expose the children of tree nodes ([e6d077c](https://github.com/fundamentry/grammar/commit/e6d077c))
- walk the nodes of a tree ([2c96591](https://github.com/fundamentry/grammar/commit/2c96591))
- find the occurrences of a rule in a tree ([d33b5ee](https://github.com/fundamentry/grammar/commit/d33b5ee))
- focus on the parts of tree nodes with optics ([231db87](https://github.com/fundamentry/grammar/commit/231db87))
- edit the occurrences of a rule in a tree ([b03d115](https://github.com/fundamentry/grammar/commit/b03d115))
- reach the codecs of the parts of a codec ([ff18243](https://github.com/fundamentry/grammar/commit/ff18243))
- default codecs to the shortest text they accept ([2be23de](https://github.com/fundamentry/grammar/commit/2be23de))
- read missing parts of nodes as their defaults ([fd9eead](https://github.com/fundamentry/grammar/commit/fd9eead))
- step through selections by the grammar ([4aba734](https://github.com/fundamentry/grammar/commit/4aba734))
- set the parts of a selection from text ([e19e708](https://github.com/fundamentry/grammar/commit/e19e708))
- select the one place of a rule within another ([67da3f5](https://github.com/fundamentry/grammar/commit/67da3f5))
- iterate over focuses and selections ([37474bc](https://github.com/fundamentry/grammar/commit/37474bc))
- remove the optional parts around a selection ([fbfa842](https://github.com/fundamentry/grammar/commit/fbfa842))
- remove the elements of repetitions around a selection ([67bb3e6](https://github.com/fundamentry/grammar/commit/67bb3e6))
- select the elements of repetitions by position ([baa83d7](https://github.com/fundamentry/grammar/commit/baa83d7))
- insert elements into the repetitions of a selection ([00e4d03](https://github.com/fundamentry/grammar/commit/00e4d03))
- edit the parts of a selection as text ([91cef17](https://github.com/fundamentry/grammar/commit/91cef17))

### 🔥 Performance

- parse single-token expressions in one step ([68b3091](https://github.com/fundamentry/grammar/commit/68b3091))
- parse terminals without composing morphisms ([730a253](https://github.com/fundamentry/grammar/commit/730a253))

# 5.0.0

### 🚀 Features

- memoize parser rules per point ([d4e1746](https://github.com/fundamentry/grammar/commit/d4e1746))
- ⚠️  rebuild the public API around rules ([8ba1102](https://github.com/fundamentry/grammar/commit/8ba1102))

### ⚠️  Breaking Changes

- rebuild the public API around rules  ([8ba1102](https://github.com/fundamentry/grammar/commit/8ba1102))

# 4.0.0

### 🚀 Features

- ⚠️  remove the 'Rule' API ([87fb086](https://github.com/fundamentry/grammar/commit/87fb086))
- ⚠️  rebuild 'Codec' as a backtracking grammar ([979a7c3](https://github.com/fundamentry/grammar/commit/979a7c3))

### 🩹 Fixes

- make 'instanceof' on an 'Option' subclass check that subclass ([9ec0c14](https://github.com/fundamentry/grammar/commit/9ec0c14))

### ⚠️  Breaking Changes

- rebuild 'Codec' as a backtracking grammar  ([979a7c3](https://github.com/fundamentry/grammar/commit/979a7c3))
- remove the 'Rule' API  ([87fb086](https://github.com/fundamentry/grammar/commit/87fb086))

## 3.1.0

### 🚀 Features

- add 'Terminal' ([c99f0e6](https://github.com/fundamentry/grammar/commit/c99f0e6))

## 3.0.1

### 🩹 Fixes

- remove trailing slash in import path ([d9513e2](https://github.com/fundamentry/grammar/commit/d9513e2))
- make 'instanceof' on a 'Symbol' subclass check that subclass ([0f02587](https://github.com/fundamentry/grammar/commit/0f02587))
- make 'instanceof' on 'Sequence' and 'Repetition' subclasses check that subclass ([b8b66a0](https://github.com/fundamentry/grammar/commit/b8b66a0))

# 3.0.0

### 🚀 Features

- implement parse tree nodes ([d3bd104](https://github.com/fundamentry/grammar/commit/d3bd104))
- ⚠️  constrain 'Codec' values to parse tree nodes ([07e9c32](https://github.com/fundamentry/grammar/commit/07e9c32))
- ⚠️  make 'Symbol' a named rule over a parse tree node ([894952a](https://github.com/fundamentry/grammar/commit/894952a))
- add 'Production.literal' ([26f9956](https://github.com/fundamentry/grammar/commit/26f9956))

### ⚠️  Breaking Changes

- make 'Symbol' a named rule over a parse tree node  ([894952a](https://github.com/fundamentry/grammar/commit/894952a))
- constrain 'Codec' values to parse tree nodes  ([07e9c32](https://github.com/fundamentry/grammar/commit/07e9c32))

## 2.2.0

### 🚀 Features

- implement 'Symbol', 'Terminal', and 'Nonterminal' ([ace3a95](https://github.com/fundamentry/grammar/commit/ace3a95))
- implement 'Codec' ([d02af38](https://github.com/fundamentry/grammar/commit/d02af38))
- implement 'Production' ([91bb5a7](https://github.com/fundamentry/grammar/commit/91bb5a7))

### 🩹 Fixes

- resolve internal imports to compiled declarations for consumers ([602a6bc](https://github.com/fundamentry/grammar/commit/602a6bc))
- exclude test files from the published package ([d03bbef](https://github.com/fundamentry/grammar/commit/d03bbef))

## 2.1.0

### 🚀 Features

- implement 'Printer' ([73556db](https://github.com/fundamentry/grammar/commit/73556db))

# 2.0.0

### 🚀 Features

- ⚠️  generalise 'Lexer' and 'Parser' over arbitrary tokens ([e9555ab](https://github.com/fundamentry/grammar/commit/e9555ab))

### ⚠️  Breaking Changes

- generalise 'Lexer' and 'Parser' over arbitrary tokens  ([e9555ab](https://github.com/fundamentry/grammar/commit/e9555ab))

## 1.6.0

### 🚀 Features

- add 'default' rule modifier ([f54734f](https://github.com/fundamentry/grammar/commit/f54734f))
- add 'followedBy' rule modifier ([170cf53](https://github.com/fundamentry/grammar/commit/170cf53))
- add 'precededBy' rule modifier ([23c7289](https://github.com/fundamentry/grammar/commit/23c7289))
- add 'join' rule modifier ([6bf9845](https://github.com/fundamentry/grammar/commit/6bf9845))
- add 'reduce' rule modifier ([c2b2a0d](https://github.com/fundamentry/grammar/commit/c2b2a0d))

## 1.5.0

### 🚀 Features

- add 'or' rule modifier ([b31f71f](https://github.com/fundamentry/grammar/commit/b31f71f))

## 1.4.0

### 🚀 Features

- add 'required' rule modifier ([bf48451](https://github.com/fundamentry/grammar/commit/bf48451))

## 1.3.0

### 🚀 Features

- change input argument in 'hasDefinitionFor' method on 'DefinitionLexer' ([e76e893](https://github.com/fundamentry/grammar/commit/e76e893))

## 1.2.0

### 🚀 Features

- add 'type' attribute to 'Token.Definition' ([705117e](https://github.com/fundamentry/grammar/commit/705117e))
- add 'definitions' method on 'DefinitionLexer' ([3084d3b](https://github.com/fundamentry/grammar/commit/3084d3b))
- add 'hasDefinitionFor' method on 'DefinitionLexer' ([3c3ca20](https://github.com/fundamentry/grammar/commit/3c3ca20))

## 1.1.0

### 🚀 Features

- add 'Token.Definition' type ([6a4a1cc](https://github.com/fundamentry/grammar/commit/6a4a1cc))
- implement 'DefinitionLexer' ([4da8928](https://github.com/fundamentry/grammar/commit/4da8928))

# 1.0.0

### 🚀 Features

- initialise project ([c5e32e0](https://github.com/fundamentry/grammar/commit/c5e32e0))
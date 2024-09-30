# typebox-env

> Validate and Parse your env variables with TypeBox

![Tests](https://github.com/tinchoz49/typebox-env/actions/workflows/test.yml/badge.svg)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard--ext-05ae89.svg)](https://github.com/tinchoz49/eslint-config-standard-ext)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat)](https://github.com/RichardLitt/standard-readme)

## Install

```bash
$ npm install typebox-env @sinclair/typebox
```

## Usage

```js
import { Type } from '@sinclair/typebox'
import { JSON, parseEnv, SplitArray } from 'typebox-env'

const schema = Type.Object({
  FOO_BAR: SplitArray(Type.Array(Type.String())),
  BAZ: Type.String(),
  JSON: JSON(Type.Object({
    foo: Type.String(),
    bar: Type.String(),
  })),
  DEEP: Type.Object({
    NESTED: Type.Object({
      FOO: Type.String(),
    }),
    BAR: Type.String(),
  }),
})

const env = {
  FOO_BAR: 'a,b,c',
  BAZ: 'qux',
  JSON: '{"foo":"bar","bar":"baz"}',
  DEEP_NESTED_FOO: 'qux',
  DEEP_BAR: 'baz',
}

const result = parseEnv(schema, env)

console.log(result)
/*
{
  FOO_BAR: ['a', 'b', 'c'],
  BAZ: 'qux',
  JSON: {
    foo: 'bar',
    bar: 'baz',
  },
  DEEP: {
    NESTED: {
      FOO: 'qux',
    },
    BAR: 'baz',
  },
}
*/
```

## Issues

:bug: If you found an issue we encourage you to report it on [github](https://github.com/tinchoz49/typebox-env/issues). Please specify your OS and the actions to reproduce it.

## Contributing

:busts_in_silhouette: Ideas and contributions to the project are welcome. You must follow this [guideline](https://github.com/tinchoz49/typebox-env/blob/main/CONTRIBUTING.md).

## License

MIT © 2024 Martin Acosta

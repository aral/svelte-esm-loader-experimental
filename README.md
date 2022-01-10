# Basic, hardcoded Svelte SSR with Hydration spike using experimental Node.js module loader

This is a fork of Josh Nuss’s [svelte-esm-loader-experimental] that:

  - implements a proof-of-concept of server-side rendering (SSR) with client-side
    hydration (with nested components and context transfer from server to client)

  - is upgraded to use the latest Svelte version

  - `npm run start` changed to `npm run dev`

## Server-side render notes

### Spike: custom Node ES Module loader for server-side render

```shell
npm run dev
```

Note: this currently only works in Node 16.x. (Node 14.x had a different syntax for the experimental ES Module loaders)

---

## Original module documentation follows

Svelte ships with the ability to import `.svelte` files using `commonjs`'s `require` syntax.
This is an experiment to add support for esm's `import` syntax as well.

Tested with Node v12.5.0

## CommonJS

CommonJS is built into svelte:

```
require('svelte/register')
const App = require('./App.svelte').default

const output = App.render(...)
```

## ESM

Specify the loader `--experimental-loader loader.mjs` when running `node`:

```
node \
  --experimental-modules \
  --experimental-loader ./loader.mjs \
  src/server.js
```

Then you can import `.svelte` files using `import` statements:

```
import App from './App.svelte'

const output = App.render(...)
```

# License

  - Original: MIT
  - Any code added/changed by Aral: AGPLv3


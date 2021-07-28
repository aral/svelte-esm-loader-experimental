# Basic, hardcoded Svelte SSR with Hydration example using experimental Node.js module loader

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

(Generate the hydration script manually first. See below.)

Result: works. Will use.

See [loader.mjs](./loader.mjs)

### Spike: esbuild to generate hydration script

```shell
node ./esbuild-compile-svelte.js
```

Result: works. Will use.

See [esbuild-compile-svelte.js](./esbuild-compile-svelte.js)

### Spike: esbuild to generate the server-side render

```shell
node ./esbuild-compile-svelte-html.js
```

Results: works. __Won’t use.__

(The Node ES Module loader is far cleaner. In the actual framework implementation, I need to refactor the common transformations into a separate module shared with the esbuild hydration build.)

See [esbuild-compile-svelte-html.js](./esbuild-compile-svelte.js)

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


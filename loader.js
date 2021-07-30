console.time('Loader initialisation')
console.log('================== LOADER PROCESS START =====================')
import path from 'path'
import fs from 'fs'
import { compile } from 'svelte/compiler'
import { hydrationScriptCompiler } from './HydrationScriptCompiler.js'

import JSDB from '@small-tech/jsdb'

import { fileURLToPath } from 'url'
const __dirname = fileURLToPath(new URL('.', import.meta.url))

const db = JSDB.open('.cache')
if (!db.routes) {
  db.routes = {}
}

const scriptRegExp = /\<script\>.*?\<\/script\>/s
const nodeScriptRegExp = /\<node\>(.*?)\<\/node\>/s
const styleRegExp = /\<style\>.*?\<\/style\>/s

export async function resolve(specifier, context, defaultResolve) {
  if ((path.extname(specifier) === '.svelte') || (path.extname(specifier) === '.component') || (path.extname(specifier) === '.page') || (path.extname(specifier) === '.layout')) {
    const parentURL = new URL(context.parentURL)
    const parentPath = path.dirname(parentURL.pathname)
    const absolutePath = path.resolve(parentPath, specifier)

    return {
      url: `file://${absolutePath}`
    }
  }

  return defaultResolve(specifier, context, defaultResolve)
}

// Note: .component is just a (semantically more accurate, given our use case) alias
// ===== for .svelte and is treated in exactly the same way. On the other hand,
//       .page and .layout are supersets of Svelte and can include a script block
//       with a context of 'node' that gets executed in Node before every render. The data
//       returned is injected into the page as it is being rendered. Additionally,
//       .layout files get special treatment in that they are injected into every page
//       within the same directory and any subdirectories (TODO) unless a reset.layout file
//       is present (TODO).

export async function getFormat(url, context, defaultGetFormat) {
  if (url.endsWith('.svelte') || url.endsWith('.component') || url.endsWith('.page') || url.endsWith('.layout')) {
    return { format: 'module' }
  }

  return defaultGetFormat(url, context, defaultGetFormat)
}


export async function getSource(href, context, defaultGetSource) {
  const url = new URL(href)

  if (url.protocol === "file:" && (path.extname(href) === '.svelte') || (path.extname(href) === '.component') || (path.extname(href) === '.page') || (path.extname(href) === '.layout')) {
    const source = await compileSource(url.pathname)

    return { source }
  }

  return defaultGetSource(href, context, defaultGetSource)
}


async function compileSource(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')

  const route = path.relative(__dirname, filePath)

  let svelteSource = source
  let nodeScript

  const nodeScriptResult = nodeScriptRegExp.exec(source)
  if (nodeScriptResult) {
    // Contains a Node script. Svelte knows nothing about this, so we
    // strip it out and persist it for use during server-side rendering.
    svelteSource = source.replace(nodeScriptResult[0], '')

    // Wrap the  request into the script so its available
    // to the script without making people wrap their script
    // in an async function.
    nodeScript = `export default async request => {\n${nodeScriptResult[1]}\n}`
  }

  // Layout and hydration script support (again, hardcoded for this spike to the index page
  // and the single Page.layout). In the actual framework, this would only take place in the .page loader.
  if (filePath.endsWith('index.page')) {
    const script = scriptRegExp.exec(svelteSource)[0]
    const markup = svelteSource.replace(scriptRegExp, '').replace(styleRegExp, '').trim()

    const scriptWithLayoutImport = script.replace('<script>', "<script>\n  import PageLayout from './Page.layout'\n")
    const markupWithLayout = `<PageLayout>\n${markup}\n</PageLayout>`

    svelteSource = svelteSource.replace(script, scriptWithLayoutImport).replace(markup, markupWithLayout)

    // Client-side hydration script.
    const hydrationCode = await hydrationScriptCompiler(route)
    const hydrationScript = hydrationCode

    // Update the route cache with the material for this route.
    db.routes[route] = {
      nodeScript,
      hydrationScript
    }
  }

  const output = compile(svelteSource, {
    generate: 'ssr',
    format: 'esm',
    hydratable: true
  })

  return output.js.code
}

console.timeEnd('Loader initialisation')

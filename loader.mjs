import path from 'path'
import fs from 'fs'
import { compile } from 'svelte/compiler'

const scriptRegExp = /\<script\>.*?\<\/script\>/s
const nodeScriptRegExp = /\<script context=['"]node['"]\>(.*?)\<\/script\>/s
const styleRegExp = /\<style\>.*?\<\/style\>/s

export async function resolve(specifier, context, defaultResolve) {
  if (path.extname(specifier) === '.svelte') {
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

  let svelteSource = source
  let nodeSource
  const nodeScriptResult = nodeScriptRegExp.exec(source)
  if (nodeScriptResult) {
    // Contains a Node script. Svelte knows nothing about this, so we
    // strip it out and persist it for use during server-side rendering.
    svelteSource = source.replace(nodeScriptResult[0], '')
    nodeSource = nodeScriptResult[1]

    // Inject the request into the script so its available
    // to the script without making people wrap their script
    // in an async function.
    nodeSource = `const request = {mock: 'request'};\n${nodeSource}`

    // Write the Node script as a temporary file.
    fs.writeFileSync('Temp.js', nodeSource)

    // TODO: Once we render the data at the server (not here), we can pass
    // ===== the actual request object here so the behaviour of the server-side
    //       script can make use of it if it wants to (e.g., for authorisation, etc.)
    const data = (await import('./Temp.js')).data

    svelteSource = svelteSource.replace('let data', `let data = ${JSON.stringify(data)}`)
  }

  // Layout support (again, hardcoded for this spike)
  // (In the actual framework, this would only take place in the .page loader.)
  if (filePath.endsWith('index.page')) {
    const script = scriptRegExp.exec(svelteSource)[0]
    const markup = svelteSource.replace(scriptRegExp, '').replace(styleRegExp, '').trim()

    const scriptWithLayoutImport = script.replace('<script>', "<script>\n  import PageLayout from './Page.layout'\n")
    const markupWithLayout = `<PageLayout>\n${markup}\n</PageLayout>`

    svelteSource = svelteSource.replace(script, scriptWithLayoutImport).replace(markup, markupWithLayout)

  }

  const output = compile(svelteSource, {
    generate: 'ssr',
    format: 'esm',
    hydratable: true
  })

  // TODO: Generate client output using esbuild.
  // (If so, should we use esbuild to create SSR build too?)

  // const clientOutput = compile(svelteSource, {
  //   generate: 'dom',
  //   format: 'esm',
  //   hydratable: true,
  //   sveltePath: '/modules/svelte'
  // })

  return output.js.code
}

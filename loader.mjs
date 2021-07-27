import path from 'path'
import fs from 'fs'
import { compile } from 'svelte/compiler'

const nodeScriptRegExp = /\<script type=['"]node['"]\>(.*?)\<\/script\>/s

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

export async function getFormat(url, context, defaultGetFormat) {
  if (url.endsWith('.svelte')) {
    return { format: 'module' }
  }

  return defaultGetFormat(url, context, defaultGetFormat)
}

export async function getSource(href, context, defaultGetSource) {
  const url = new URL(href)

  if (url.protocol === "file:" && path.extname(href) === '.svelte') {
    const source = await compileSource(url.pathname)

    return { source /*: adjustImports(source)*/ }
  }

  return defaultGetSource(href, context, defaultGetSource)
}

async function compileSource(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')

  console.log(filePath)

  let svelteSource = source
  let nodeSource
  const nodeScriptResult = nodeScriptRegExp.exec(source)
  // console.log('>>>>>>>>>>>>', nodeScriptResult)
  if (nodeScriptResult) {
    // Contains a Node script. Svelte knows nothing about this, so we
    // strip it out and persist it for use during server-side rendering.
    svelteSource = source.replace(nodeScriptResult[0], '')
    nodeSource = nodeScriptResult[1]

    // Write the Node script as a temporary file.
    fs.writeFileSync('Temp.js', nodeSource)
    const data = (await import('./Temp.js')).data
    // console.log('DATA', data)
    svelteSource = svelteSource.replace('let data', `let data = ${JSON.stringify(data)}`)
    // console.log(svelteSource)
  }

  // Just for now.
  // console.log('Node source', nodeSource)

  const output = compile(svelteSource, {
    generate: 'ssr',
    format: 'esm',
    hydratable: true
  })

  const clientOutput = compile(svelteSource, {
    generate: 'dom',
    format: 'esm',
    hydratable: true,
    sveltePath: '/modules/svelte'
  })

  const clientSideFileName = path.parse(filePath).name
  fs.writeFileSync(`${clientSideFileName}.js`, clientOutput.js.code.replace(`import Inner from './Inner.svelte';`, `import Inner from './Inner.js';`))

  console.log('>>>', clientOutput)

  return output.js.code
}

// /*
//  * UGLY hack.
//  * Without it it gives error:
//  * "Directory import '.../node_modules/svelte/internal' is not supported resolving ES modules"
//  */
// function adjustImports(source) {
//   return source.replace('from "svelte/internal";', 'from "svelte/internal/index.mjs";')
// }

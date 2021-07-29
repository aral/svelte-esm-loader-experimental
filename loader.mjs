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

    return { source }
  }

  return defaultGetSource(href, context, defaultGetSource)
}

async function compileSource(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')

  console.log('========>>>> FILEPATH = ', filePath)

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

  // Layout support (again, hardcoded for this spike)
  // (In the actual framework, this would only take place in the .page loader.)
  if (filePath.endsWith('App.svelte')) {
    const script = scriptRegExp.exec(svelteSource)[0]
    const markup = svelteSource.replace(scriptRegExp, '').replace(styleRegExp, '').trim()

    const scriptWithLayoutImport = script.replace('<script>', "<script>\n  import Layout from './Layout.svelte'\n")
    const markupWithLayout = `<Layout>\n${markup}\n</Layout>`

    svelteSource = svelteSource.replace(script, scriptWithLayoutImport).replace(markup, markupWithLayout)

  }
  console.log('App with layout:\n', svelteSource)

  // Just for now.
  // console.log('Node source', nodeSource)

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

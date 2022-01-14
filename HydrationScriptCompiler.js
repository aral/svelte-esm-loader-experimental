// Compile, link, and return (using esbuild) the
// client-side hydration script for a page.

// Adapted from:
// https://esbuild.github.io/plugins/#svelte-plugin
import path from 'path'
import fs from 'fs'
import { compile } from 'svelte/compiler'
import esbuild from 'esbuild'

export async function hydrationScriptCompiler (relativePagePath) {
  console.time(`Hydration script compile: ${relativePagePath}`)
  let result
  try {
    result = await esbuild.build({
      entryPoints: [relativePagePath],
      bundle: true,
      format: 'esm',
      // Do not write out, we will consume the generated source from here.
      write: false,
      plugins: [sveltePlugin],
    })
  } catch (error) {
    console.error('esbuild error', error)
    process.exit(1)
  }

  const code = new TextDecoder().decode(result.outputFiles[0].contents)
  console.timeEnd(`Hydration script compile: ${relativePagePath}`)

  return code
}

// Private

const scriptRegExp = /\<script\>.*?\<\/script\>/s
const nodeScriptRegExp = /\<data\>(.*?)\<\/data\>/s
const styleRegExp = /\<style\>.*?\<\/style\>/s

const sveltePlugin = {
  name: 'svelte',
  setup(build) {
    build.onLoad({ filter: /(\.svelte|\.component|\.page|\.layout)$/ }, async (args) => {
      // This converts a message in Svelte's format to esbuild's format
      let convertMessage = ({ message, start, end }) => {
        let location
        if (start && end) {
          let lineText = source.split(/\r\n|\r|\n/g)[start.line - 1]
          let lineEnd = start.line === end.line ? end.column : lineText.length
          location = {
            file: filename,
            line: start.line,
            column: start.column,
            length: lineEnd - start.column,
            lineText,
          }
        }
        return { text: message, location }
      }

      // Load the file from the file system
      let source = await fs.promises.readFile(args.path, 'utf8')
      let filename = path.relative(process.cwd(), args.path)

      let nodeSource
      const nodeScriptResult = nodeScriptRegExp.exec(source)
      if (nodeScriptResult) {
        // Contains a Node script. Svelte knows nothing about this, so we
        // strip it out and persist it for use during server-side rendering.
        source = source.replace(nodeScriptResult[0], '')
      }

      // Layout support (again, hardcoded for this spike)
      if (args.path.endsWith('index.page')) {
        const script = scriptRegExp.exec(source)[0]
        const markup = source.replace(scriptRegExp, '').replace(styleRegExp, '').trim()

        const scriptWithLayoutImport = script.replace('<script>', "<script>\n  import PageLayout from './Page.layout'\n")
        const markupWithLayout = `<PageLayout>\n${markup}\n</PageLayout>`

        source = source.replace(script, scriptWithLayoutImport).replace(markup, markupWithLayout)
      }

      // Convert Svelte syntax to JavaScript
      try {
        let { js, warnings } = compile(source, {
          filename,
          hydratable: true
        })
        let contents = js.code + `//# sourceMappingURL=` + js.map.toUrl()
        return { contents, warnings: warnings.map(convertMessage) }
      } catch (e) {
        return { errors: [convertMessage(e)] }
      }
    })
  }
}

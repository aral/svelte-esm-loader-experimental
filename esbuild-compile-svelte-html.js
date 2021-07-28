// Adapted from:
// https://esbuild.github.io/plugins/#svelte-plugin

// This is an example of generating the SSR code using
// esbuild instead of a custom Node ES Module Loader.
//
// In this case, I think it might be best to use the
// module loader for what it’s meant for and to refactor
// the common logic between the esbuild hydration build
// and the module loader out into a shared module.
//
// (Especially the import from string + run step at the
// end is very inelegant when compared to native import +
// page.render(/* … */))
//
// And esbuild doesn’t give us any advantages over
// regular module loading for the server-side render.

import path from 'path'
import fs from 'fs'
import { compile } from 'svelte/compiler'

import requireFromString from 'require-from-string'

const scriptRegExp = /\<script\>.*?\<\/script\>/s
const nodeScriptRegExp = /\<script type=['"]node['"]\>(.*?)\<\/script\>/s
const styleRegExp = /\<style\>.*?\<\/style\>/s

let sveltePlugin = {
  name: 'svelte',
  setup(build) {
    build.onLoad({ filter: /\.svelte$/ }, async (args) => {
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
      // console.log('>>>>>>>>>>>>', nodeScriptResult)
      if (nodeScriptResult) {
        // Contains a Node script. Svelte knows nothing about this, so we
        // strip it out and persist it for use during server-side rendering.
        source = source.replace(nodeScriptResult[0], '')
        nodeSource = nodeScriptResult[1]

        // Write the Node script as a temporary file.
        fs.writeFileSync('Temp.js', nodeSource)
        const data = (await import('./Temp.js')).data
        // console.log('DATA', data)
        source = source.replace('let data', `let data = ${JSON.stringify(data)}`)
        // console.log(svelteSource)
      }

      // Layout support (again, hardcoded for this spike)
      if (args.path.endsWith('App.svelte')) {
        const script = scriptRegExp.exec(source)[0]
        const markup = source.replace(scriptRegExp, '').replace(styleRegExp, '').trim()

        const scriptWithLayoutImport = script.replace('<script>', "<script>\n  import Layout from './Layout.svelte'\n")
        const markupWithLayout = `<Layout>\n${markup}\n</Layout>`

        source = source.replace(script, scriptWithLayoutImport).replace(markup, markupWithLayout)
      }

      // Convert Svelte syntax to JavaScript
      try {
        let { js, warnings } = compile(source, {
          filename,
          generate: 'ssr',
          format: 'esm',
          hydratable: true
        })
        console.log(js)
        let contents = js.code + `//# sourceMappingURL=` + js.map.toUrl()
        return { contents, warnings: warnings.map(convertMessage) }
      } catch (e) {
        return { errors: [convertMessage(e)] }
      }
    })
  }
}

import esbuild from 'esbuild'

let result
try {
  result = await esbuild.build({
    entryPoints: ['src/App.svelte'],
    bundle: true,
    // outfile: 'App-esbuild.js',
    format: 'cjs',
    // Do not write out, we will consume the generated source from here.
    write: false,
    plugins: [sveltePlugin],
  })
} catch (error) {
  console.error('esbuild error', error)
  process.exit(1)
}

console.log(result)

const code = new TextDecoder().decode(result.outputFiles[0].contents)

console.log(code)

const App = requireFromString(code).default

const rendered = App.render({name: "World"})

console.log(rendered)

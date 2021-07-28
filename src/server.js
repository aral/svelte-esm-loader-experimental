import polka from 'polka'
import App from './App.svelte'
import fs from 'fs'

const svelteInternal = fs.readFileSync('node_modules/svelte/internal/index.mjs', 'utf-8')
const appJs = fs.readFileSync('App.js', 'utf-8')
const appEsbuildJs = fs.readFileSync('App-esbuild.js', 'utf-8')
const innerJs = fs.readFileSync('Inner.js', 'utf-8')

polka()
  // Serve Svelte ES Module to client.
  .get('/modules/svelte/internal', (req, res) => {
    res
      .setHeader('Content-Type', 'application/javascript')
      .end(svelteInternal)
  })
  .get('/App.js', (req, res) => {
    res
      .setHeader('Content-Type', 'application/javascript')
      .end(appJs)
  })
  .get('/App-esbuild.js', (req, res) => {
    res
      .setHeader('Content-Type', 'application/javascript')
      .end(appEsbuildJs)
  })
  .get('/Inner.js', (req, res) => {
    res
      .setHeader('Content-Type', 'application/javascript')
      .end(innerJs)
  })
  .get('/', (req, res) => {
    // We should really be adding the SSR data here.
    // (Currently mocked in the loader.)
    const { html } = App.render({name: "World"})

    console.log('===============')

    const fullHtml = `
    <!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta http-equiv='X-UA-Compatible' content='IE=edge'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <link rel="icon" href="data:,">
  <title>Document</title>
</head>
<body>
    <div id='app'>
      ${html}
    </div>
</body>
</html>
    `

    const htmlWithHydration = fullHtml.replace('</body>', `<script type='module'>
      import App from './App-esbuild.js'

      new App({
        target: document.getElementById('app'),
        hydrate: true,
        props: {
          name: 'hydration'
        }
      })
    </script></body>`)

    console.log(htmlWithHydration)

    res.end(htmlWithHydration)
  })
  .listen(3001, () => {
    console.log('Running on port 3001')
  })

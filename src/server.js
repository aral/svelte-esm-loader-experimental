import polka from 'polka'
import indexPage from './index.page'
import fs from 'fs'

// TODO: Integrate esbuild-compile-svelte into the server
// ===== and include the hydration script in the server-side
//       render from memory.
//
// (Currently you have to call it manually.)
const appEsbuildJs = fs.readFileSync('index.page-esbuild.js', 'utf-8')

polka()
  .get('/', (req, res) => {
    // We should really be adding the SSR data here.
    // (Currently mocked in the loader.)
    const { html, css } = indexPage.render({name: "from the server"})

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
  <style>${css.code}</style>
</head>
<body>
    <div id='app'>
      ${html}
    </div>
</body>
</html>
    `

    const htmlWithHydration = fullHtml.replace('</body>', `<script type='module'>
      ${appEsbuildJs}

      // TODO: Note: class name will be different for each page.
      // =========== This is currently hardcoded.
      new Src({
        target: document.getElementById('app'),
        hydrate: true,
        props: {
          name: 'from the client'
        }
      })
    </script></body>`)

    // const htmlWithHydration = fullHtml

    console.log(htmlWithHydration)

    res.end(htmlWithHydration)
  })
  .listen(3001, () => {
    console.log('Running on port 3001')
  })

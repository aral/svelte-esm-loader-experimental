console.log('================== MAIN PROCESS (SERVER) START ==============')
console.time('Server initialisation')

import polka from 'polka'
import JSDB from '@small-tech/jsdb'
import fs from 'fs'

// Note: in the actual server this will be a dynamic import.
let indexPagePath = './src/index.page'
const indexPage = (await import(indexPagePath)).default

// Note: We use JSDB as the communication channel between
// ===== the Node ES Module loader and the main application.
//       Remember that JSDB is designed for a single-threaded
//       environment so keep an eye out for issues in the future.
//       (There shouldn’t be any as the loader writes and the
//       main app only reads, but still…)
const db = JSDB.open('.cache')

const routeCache = db.routes['src/index.page']
const hydrationScript = routeCache.hydrationScript

// Load the node script for the route and write it into a temporary file
// so we can import it.
let nodeScript
if (routeCache.nodeScript) {
  let dynamicModule = '.script.tmp.js'
  fs.writeFileSync(dynamicModule, routeCache.nodeScript)
  nodeScript = (await import(`./${dynamicModule}`)).default
  fs.unlinkSync(dynamicModule)
}

// TODO: In actual app, each route will be in its own
// ===== module (ala Site.js).
polka()
  .get('/', async (request, response) => {
    console.time('Request')
    console.time('  ╭─ Node script execution (initial data)')
    // Run the nodeScript if it exists
    const data = nodeScript ? await nodeScript({mock: 'request'}) : undefined
    console.timeEnd('  ╭─ Node script execution (initial data)')

    console.time('  ├─ Page render (html + css)')
    // Render the page, passing the server-side data as a property.
    const { html, css } = indexPage.render({data})
    console.timeEnd('  ├─ Page render (html + css)')

    console.time('  ├─ Final HTML render')
    const finalHtml = `
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
          <script type='module'>
          ${hydrationScript}

          // TODO: Note: class name will be different for each page.
          // =========== This is currently hardcoded.
          new Src({
            target: document.getElementById('app'),
            hydrate: true,
            props: {
              data: ${JSON.stringify(data)}
            }
          })
      </script>
      </body>
      </html>
    `
    console.timeEnd('  ├─ Final HTML render')

    console.time('  ├─ Response send')
    response.end(finalHtml)
    console.timeEnd('  ├─ Response send')

    console.timeEnd('Request')
  })
  .listen(3001, () => {
    console.log('Server is running on port 3001')
    console.timeEnd('Server initialisation')
  })


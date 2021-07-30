console.log('================== MAIN PROCESS (SERVER) =====================')
console.time('Server initialisation')

import polka from 'polka'
import JSDB from '@small-tech/jsdb'
import fs from 'fs'

// Note: in the actual server this will be a dynamic import.
import indexPage from 'src/index.page'

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
  fs.writeFileSync('.script.tmp.js', routeCache.nodeScript)
  nodeScript = (await import('./.script.tmp.js')).default
  fs.unlinkSync('.script.tmp.js')
}

// TODO: In actual app, each route will be in its own
// ===== module (ala Site.js).
polka()
  .get('/', async (request, response) => {
    // Run the nodeScript if it exists
    const data = nodeScript ? await nodeScript({mock: 'request'}) : undefined

    // Render the page, passing the server-side data as a property.
    const { html, css } = indexPage.render({data})

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
    response.end(finalHtml)
  })
  .listen(3001, () => {
    console.log('Running on port 3001')
    console.timeEnd('Server initialisation')
  })


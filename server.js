import polka from 'polka'
import JSDB from '@small-tech/jsdb'
import fs from 'fs'
// import { renderHtml } from './HtmlRenderer.js'

// Note: in the actual server this will be a dynamic import.
import indexPage from 'src/index.page'

// Note: we have the loader writing to this database
// ===== from a different context. Let’s see if this
//       messes anything up.
const db = JSDB.open('.cache')

const routeCache = db.routes['src/index.page']
const hydrationScript = routeCache.hydrationScript

// Load the node script for the route and write it into a temporary file
// so we can import it.
let nodeScript
if (routeCache.nodeScript) {
  fs.writeFileSync('.script.tmp.js', routeCache.nodeScript)
  nodeScript = (await import('./.script.tmp.js')).default
  // console.log('nodeScript', nodeScript)
  fs.unlinkSync('.script.tmp.js')
}

console.log('nodeScript', nodeScript)
// console.log('hydrationScript', hydrationScript)

// TODO: In actual app, each route will be in its own
// ===== module (ala Site.js).
polka()
  .get('/', async (request, response) => {

    console.log('====== Serving route ======')

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

    console.log(finalHtml)
    response.end(finalHtml)
  })
  .listen(3001, () => {
    console.log('Running on port 3001')
  })

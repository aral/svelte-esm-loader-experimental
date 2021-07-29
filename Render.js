export function render (page) {
    // We should really be adding the SSR data here.
    // (Currently mocked in the loader.)
    const { html, css } = page.render()

    // TODO: Make the template HTML overridable.
    // ===== e.g., by providing an index.html file
    //       in the source. (low priority)
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

    const htmlWithHydration = fullHtml.replace('</body>', )

    // const htmlWithHydration = fullHtml

    return htmlWithHydration
}
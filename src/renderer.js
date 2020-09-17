const renderer = require('vue-server-renderer').createRenderer()
const app = require('./app')
module.exports = function render(expressApp) {
    return new Promise(async (resolve, reject) => {
        renderer.renderToString(await app(expressApp), (err, html) => {
            if (err) reject(err)
            resolve(html)
        })
    })
}
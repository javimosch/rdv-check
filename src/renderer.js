const renderer = require('vue-server-renderer').createRenderer()
const app = require('./app')
module.exports = function render() {
    return new Promise(async (resolve, reject) => {
        renderer.renderToString(await app(), (err, html) => {
            if (err) reject(err)
            resolve(html)
        })
    })
}
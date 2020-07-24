const sander = require('sander');
const mailjet = require('node-mailjet')
    .connect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE)

module.exports = {
    async notifyAvailability() {
        
        let stats = JSON.parse((await sander.readFile(process.cwd()+'/public/stats.json')).toString('utf-8'))

        let emailTo = (process.env.EMAIL_TO || "arancibiajav@gmail.com").trim().split(',').map(email=>{
            return {
                Email: email,
                Name: 'Listener'
            }
        })

        const request = mailjet
            .post("send", { 'version': 'v3.1' })
            .request({
                "Messages": [
                    {
                        "From": {
                            "Email": "robot@devforgood.org",
                            "Name": "RDV Check Robot"
                        },
                        "To": emailTo,
                        "Subject": "RDV Check: Availability detected!",
                        "TextPart": "Dear passenger 1, welcome to Mailjet! May the delivery force be with you!",
                        "HTMLPart": `
                        <h2>Hi Admin</h2>
                        <p>
                            I noticed the RDV is available. Go, quick!
                        </p>

                        <a href="http://www.herault.gouv.fr/Actualites/INFOS/Usagers-etrangers-en-situation-reguliere-Prenez-rendez-vous-ici" target="_blank">
                        http://www.herault.gouv.fr/Actualites/INFOS/Usagers-etrangers-en-situation-reguliere-Prenez-rendez-vous-ici
                        </a>
                        <br/><br/>
                        <label>Check the stats:</label>
                        <p>
                            ${JSON.stringify({
                                photosAvail: stats.photosAvail || 'Nothing to show :('
                            },null, 4).split('\n\r').join('<br/>')}
                        </p>

                        `
                    }
                ]
            })
        request
            .then((result) => {
                console.log(result.body)
            })
            .catch((err) => {
                console.log(err.statusCode)
            })
    }
}
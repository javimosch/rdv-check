require('dotenv').config({
    silent: true
})
const express = require('express')
const browserType = 'firefox';
const app = express();
const schedule = require('node-schedule');
const sander = require('sander');
const renderApp = require('./renderer')
let momentTZ = require('moment-timezone')
moment = (m) => momentTZ(m).tz('Europe/Paris')
const email = require('./email')
const dbname = 'rdvcheck'

//If an user already received an email, wait X minutes before sendind another one (to avoid spamming)
const MAIL_COOLDOWN_IN_MINUTES = process.env.MAIL_COOLDOWN_IN_MINUTES || 10

bootstrap().catch(err => {
    console.error(err)
    process.exit(1)
})

schedule.scheduleJob('*/30 * * * *', createRdvAvailableTask(true));
schedule.scheduleJob('*/3 * * * *', createRdvAvailableTask(false));

//TEST
//getMailableUsers().then(users=>console.log('MAILABLE RIGHT NOW',users))
//isRdvAvailable(false,true,false)

async function getCooledDownUsers() {
    try {
        let users = await getSubscribedUsers()
        let validUsers = users.filter(user => {
            return !user.last_email_sent || moment(user.last_email_sent).isBefore(moment().subtract(MAIL_COOLDOWN_IN_MINUTES, 'minutes'))
        })
        let invalidUsers = users.filter(u => validUsers.find(uu => uu.email == u.email) == null)
        validUsers.forEach(user => {
            console.log('getCooledDownUsers passed', user.email)
        })
        invalidUsers.forEach(user => {
            let fromNow = (user.last_email_sent ? moment(user.last_email_sent) : moment()).fromNow()
            console.log('getCooledDownUsers cooling down', user._id, fromNow)
        })
        return validUsers
    } catch (err) {
        console.log('sendEmailChecker ERROR', err.stack)
        return []
    }
}

function getMongoClient() {
    return new Promise((resolve, reject) => {
        if (app.mongo_client && app.mongo_client.isConnected()) {
            return resolve(app.mongo_client)
        }
        const MongoClient = require('mongodb').MongoClient;
        app.mongo_client = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true });
        app.mongo_client.connect(err => {
            if (err) {
                reject(err)
            } else {
                resolve(app.mongo_client)
            }
        })
    })
}

async function bootstrap() {
    //let mongo = await getMongoClient()
    await saveUsersFromEnv();
    //await require('axios').get('http://localhost:3000/api/unsubscribe/arancibiajav@gmail.com')
    //die each hour to remove puppeter zombies
    setTimeout(() => {
        console.log('Restarting...')
        process.exit(0);
    }, 1000 * 60 * 60)
}

async function getMailableUsers() {
    return await getCooledDownUsers()
}

async function updateEmailSent(users) {
    return await (await getMongoClient()).db(dbname).collection("users").updateMany({
        $or: users.map(user => ({ email: user.email }))
    }, {
        $set: {
            last_email_sent: Date.now(),
            last_email_sent_formatted: moment(Date.now()).format('DD-MM-YY HH:mm:ss')
        }
    })
}

async function getSubscribedUsers() {
    return (await (await getMongoClient()).db(dbname).collection("users").find({
        subscribed: true
    })).toArray()
}

async function setUserSusbscribe(userEmail, isSubscribed = false, upsert = false) {
    console.log('setUserSusbscribe', userEmail, {
        isSubscribed, upsert
    })

    if (upsert && userEmail.indexOf('@') === -1) {
        console.log('Ignoring email', userEmail)
        return
    }

    await (await getMongoClient()).db(dbname).collection("users").updateOne({
        email: {
            $eq: userEmail
        }
    }, {
        $set: {
            subscribed: isSubscribed
        }
    }, {
        upsert
    })
}

async function saveUsersFromEnv() {
    const collection = (await getMongoClient()).db(dbname).collection("users");
    return Promise.all(
        process.env.EMAIL_TO.split(',').map(userEmail => {
            return (async () => {

                let user = await collection.findOne({ email: userEmail })
                let subscribed = user ? (user.subscribed !== undefined ? user.subscribed : true) : true
                let set = {
                    email: userEmail,
                    subscribed
                }

                await collection.updateOne({
                    email: {
                        $eq: userEmail
                    }
                }, {
                    $set: set
                }, {
                    upsert: true
                })

            })();
        }))
}


//Test
//isRdvAvailable(false,false,false)

app.countSubscribers = async function () {
    return await (await getMongoClient()).db(dbname).collection("users").count({
        subscribed: {
            $eq: true
        }
    })
}

app.get('/api/is_subscribed/:email', async (req, res) => {
    let count = await (await getMongoClient()).db(dbname).collection("users").count({
        email: {
            $eq: req.params.email,
        },
        subscribed: {
            $eq: true
        }
    })
    res.status(200).json({
        message: count > 0 ? `${req.params.email} is already subscribed.` : `${req.params.email} is not subscribed`
    });
})

app.get('/api/unsubscribe/:email', (req, res) => {
    if (req.params.email.indexOf('@') === -1) {
        return res.json({
            message: `You need to specify the email you want to unsubscribe. Example: /api/unsubscribe/jean@gmail.com`
        })
    }
    setUserSusbscribe(req.params.email, false);
    res.status(200).json({
        message: `${req.params.email} is now unsubscribed and it will not receive any more emails`
    });
})

app.get('/api/subscribe/:email', async (req, res) => {

    let json = []
    try {
        json = JSON.parse((await sander.readFile(process.cwd() + '/users.json')).toString('utf-8'))
    } catch (err) {
    }
    if (json.indexOf(req.params.email) === -1) {
        json.push(req.params.email)
        await sander.writeFile(process.cwd() + '/users.json', JSON.stringify(json, null, 4))
    }

    setUserSusbscribe(req.params.email, true, true);

    res.status(200).json({
        message: `${req.params.email} is now subscribed`
    });

})

app.use('/', express.static('public'))
app.get('/', async (req, res) => {
    try {
        res.send(`
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DÉPÔT DE DOSSIER – ETRANGERS EN SITUATION RÉGULIÈRE: Vérification de disponibilité</title>
</head>
<body>
    ${await renderApp(app)}
</body>
</html>
        `)
    } catch (err) {
        console.error('ERROR', err.message, err.stack)
        res.send(500)
    }
})
app.listen(process.env.PORT || 3000, () => console.log(`LISTEN ${process.env.PORT || 3000}`))

detectExistingPhotos()

async function removeExtensions() {
    let stats = await getStats();
    stats.photos = stats.photos.map(p => {
        return p.split('.')[0]
    })
    stats.photosAvail = stats.photosAvail.map(p => {
        return p.split('.')[0]
    })
    await saveStats(stats)
}

async function removeDuplicates() {
    let stats = await getStats();
    stats.photos = stats.photos.filter((p, i) => {
        return stats.photos.indexOf(p) === i
    })
    stats.photosAvail = stats.photosAvail.filter((p, i) => {
        return stats.photosAvail.indexOf(p) === i
    })
    await saveStats(stats)
}

async function detectExistingPhotos() {
    await removeDuplicates()
    await removeExtensions()
    let stats = await getStats();
    let detectExistingPhotosAvailable = async (available = false) => {
        let statsKey = available ? 'photosAvail' : 'photos'
        let photosInStats = await readPhotosDirectory(available)
        photosInStats.forEach(name => {
            name = name.split('.')[0]
            let isPresent = stats[statsKey] && stats[statsKey].find(n => n == name)
            if (!isPresent) {
                stats[statsKey].push(name)
            }
        })
        stats[statsKey] = stats[statsKey].sort((a, b) => {
            return a < b ? 1 : -1
        })
    }
    await detectExistingPhotosAvailable(false)
    await detectExistingPhotosAvailable(true)
    await saveStats(stats)
}

async function readPhotosDirectory(available = false) {
    return await sander.readdir(process.cwd() + `/public/photos/${available ? 'available' : 'not_available'}`)
}

async function getStats() {
    try {
        return JSON.parse((await sander.readFile(process.cwd() + '/public/stats.json')).toString('utf-8'))
    } catch (err) {
        return {}
    }
}

async function saveStats(stats) {
    return await sander.writeFile(process.cwd() + '/public/stats.json', JSON.stringify(stats, null, 4))
}


function createRdvAvailableTask(savePhotos = true) {
    return function () {
        isRdvAvailable(savePhotos).then(async isAvailable => {
            let stats = JSON.parse((await sander.readFile(process.cwd() + '/public/stats.json')).toString('utf-8'))
            stats.lastCheck = moment()._d.getTime()
            stats.lastCheckFormatted = moment().format('DD-MM-YY HH[h]mm')
            await sander.writeFile(process.cwd() + '/public/stats.json', JSON.stringify(stats, null, 4))
        }).catch(err => {
            console.log("ERROR (CRON)", err)
        })
    }
}

function getUrl() {
    return 'http://www.herault.gouv.fr/Actualites/INFOS/Usagers-etrangers-en-situation-reguliere-Prenez-rendez-vous-ici'
}


async function isRdvAvailablePuppeter(savePhotos, keepBrowserOpened) {
    let url = getUrl()
    const puppeteer = require('puppeteer');
    const chromeFlags = [
        //'--headless',
        '--no-sandbox',
        "--disable-gpu",
        "--single-process",
        "--no-zygote"
    ]
    const browser = await puppeteer.launch({
        headless: keepBrowserOpened === false,
        args: chromeFlags
    });

    

    const page = await browser.newPage();
    const waitForNavigation = async ()=>{
        try{
            await page.waitForNavigation({
                timeout:2000,
                waitUntil: 'networkidle0',
            });
            /*await page.waitForNavigation({
                waitUntil: 'domcontentloaded',
            });*/
        }catch(err){}
    }
    const clickIgnore = async (selector)=>{
        try{
            await page.click(selector)
        }catch(err){

        }
    }
    await page.goto(url);
    url = await page.$eval('img[title="Prendre rendez-vous"]', el => el.parentNode.href)
    await page.goto(url)
    
    await page.waitForSelector('input[name="condition"]')
    await page.waitForSelector('input[name="nextButton"]')
    
    await clickIgnore('input[name="condition"]')
    await clickIgnore('input[name="nextButton"]')

    await waitForNavigation();

    while(await page.$eval('form[name="create"]', el => {
        return el.innerHTML.indexOf('radio') !== -1
    })){
        await waitForNavigation();
        await clickIgnore('input[name="planning"]')
        await clickIgnore('input[type="submit"]')
        await waitForNavigation();
    }

    let isAvailable = await page.$eval('form[name="create"]', el => {
        return el.innerHTML.indexOf('existe plus') === -1
    })


    if (isAvailable || savePhotos) {
        let photoPath = await savePhotoInfo(isAvailable)
        await page.screenshot({ path: photoPath, fullPage: true });
        await optimizeImage(photoPath)
    }

    await browser.close();
    return isAvailable
}

async function isRdvAvailable(savePhotos, keepBrowserOpened = false, notifyByEmail = true) {
    let isAvailable = false
    try {
        isAvailable = await isRdvAvailablePuppeter(savePhotos, keepBrowserOpened)
    } catch (err) {
        console.log("ERROR (While scraping)", err)
    }

    console.log(moment().format('DD-MM-YY HH:mm:ss'), 'available', isAvailable)



    if (isAvailable) {
        if (notifyByEmail) {
            let mailableUsers = await getMailableUsers()
            email.notifyAvailability(mailableUsers.map(u => u.email)).then(() => {
                updateEmailSent(mailableUsers)
            });
        }
    }

    return isAvailable
};

async function savePhotoInfo(isAvailable) {
    let stats = {}
    try {
        stats = JSON.parse((await sander.readFile(process.cwd() + '/public/stats.json')).toString('utf-8'))
    } catch (err) {
        console.log('Failed to read stats:', err.stack)
    }
    stats.photos = stats.photos || [];
    let id = moment().format('DD[_]MM[_]YY[_]HH[_]mm')
    if (stats.photos.indexOf(id) === -1) {
        stats.photos.push(id)
    }
    if (isAvailable) {
        stats.photosAvail = stats.photosAvail || [];
        stats.photosAvail.push(id)
    }
    await sander.writeFile(process.cwd() + '/public/stats.json', JSON.stringify(stats, null, 4))

    return process.cwd() + `/public/photos/${isAvailable ? 'available' : "not_available"}/${id}.png`;
}

async function optimizeImage(path) {
    const imagemin = require('imagemin');
    const pngToJpeg = require('png-to-jpeg');
    await imagemin([path], {
        destination: process.cwd() + '/public/photos',
        plugins: [
            pngToJpeg({ quality: 30 })
        ]
    });
}

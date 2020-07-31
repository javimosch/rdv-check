require('dotenv').config({
    silent:true
})
const express = require('express')
const playwright = require('playwright');
const browserType = 'firefox';
const app = express();
const schedule = require('node-schedule');
const sander = require('sander');
const renderApp = require('./renderer')
let momentTZ = require('moment-timezone')
moment = (m) => momentTZ(m).tz('Europe/Paris')
const email = require('./email')

schedule.scheduleJob('*/30 * * * *', createRdvAvailableTask(true));
schedule.scheduleJob('*/2,05 * * * *', createRdvAvailableTask(false));

app.get('/check',(req,res)=>{
    isRdvAvailableTask();
    res.send('Checking... (<a href="/" target="_self">refresh</a> the browser in a few seconds)')
})
app.use('/',express.static('public'))
app.get('/',async (req,res)=>{
    try{
        res.send(`
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DÉPÔT DE DOSSIER – ETRANGERS EN SITUATION RÉGULIÈRE: Vérification de disponibilité</title>
</head>
<body>
    ${await renderApp()}
</body>
</html>
        `)
    }catch(err){
        console.error('ERROR',err.message,err.stack)
        res.send(500)
    }
})
app.listen(process.env.PORT||3000, ()=>console.log(`LISTEN ${process.env.PORT||3000}`))

detectExistingPhotos()

async function removeExtensions(){
    let stats = await getStats();
    stats.photos = stats.photos.map(p=>{
        return p.split('.')[0]
    })
    stats.photosAvail = stats.photosAvail.map(p=>{
        return p.split('.')[0]
    })
    await saveStats(stats) 
}

async function removeDuplicates(){
    let stats = await getStats();
    stats.photos = stats.photos.filter((p,i)=>{
        return stats.photos.indexOf(p)===i
    })
    stats.photosAvail = stats.photosAvail.filter((p,i)=>{
        return stats.photosAvail.indexOf(p)===i
    })
    await saveStats(stats) 
}

async function detectExistingPhotos(){
    await removeDuplicates()
    await removeExtensions()
    let stats = await getStats();
    let detectExistingPhotosAvailable = async (available = false)=>{
        let statsKey = available ? 'photosAvail' : 'photos'
        let photosInStats = await readPhotosDirectory(available)
        photosInStats.forEach(name=>{
            name = name.split('.')[0]
            let isPresent = stats[statsKey] && stats[statsKey].find(n=>n==name)
            if(!isPresent){
                stats[statsKey].push(name)
            }
        })
        stats[statsKey] = stats[statsKey].sort((a,b)=>{
            return a<b ? 1 : -1
        })
    }
    await detectExistingPhotosAvailable(false)
    await detectExistingPhotosAvailable(true)
    await saveStats(stats)
}

async function readPhotosDirectory(available = false){
    return await sander.readdir(process.cwd()+`/public/photos/${available?'available':'not_available'}`)
}

async function getStats(){
    try{
        return JSON.parse((await sander.readFile(process.cwd()+'/public/stats.json')).toString('utf-8'))
    }catch(err){
        return {}
    }
}

async function saveStats(stats){
    return await sander.writeFile(process.cwd()+'/public/stats.json',JSON.stringify(stats,null,4))
}


function createRdvAvailableTask(savePhotos = true){
    return function(){
        isRdvAvailable(savePhotos).then(async isAvailable => {
            let stats = JSON.parse((await sander.readFile(process.cwd()+'/public/stats.json')).toString('utf-8'))
            stats.lastCheck = moment()._d.getTime()
            stats.lastCheckFormatted = moment().format('DD-MM-YY HH[h]mm')
            await sander.writeFile(process.cwd()+'/public/stats.json',JSON.stringify(stats,null,4))
        }).catch(err=>{
            console.log("ERROR (CRON)", err)
        })
    }
}

async function isRdvAvailable(savePhotos, keepBrowserOpened = false, notifyByEmail = true) {
    let url = 'http://www.herault.gouv.fr/Actualites/INFOS/Usagers-etrangers-en-situation-reguliere-Prenez-rendez-vous-ici';
    const browser = await playwright[browserType].launch({
        headless: keepBrowserOpened===false
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url);
    
    let isAvailable = false
    
    try{
        url = await page.$eval('img[title="Prendre rendez-vous"]', el => el.parentNode.href)
        await page.goto(url)
        await page.click('input[name="condition"]')
        await page.click('input[name="nextButton"')

        await page.waitForFunction(() => {
            return !!document.querySelector('#global_Booking')
        })
        let notAvailable = await page.$eval('form[name="create"]', el => {
            return el.innerHTML.indexOf('existe plus') !== -1
        })
        isAvailable = !notAvailable
    }catch(err){
        console.log("ERROR (While scraping)",err)
    }

    if(isAvailable || savePhotos){
        let photoPath = await savePhotoInfo(isAvailable)
        await page.screenshot({ path: photoPath });
        await optimizeImage(photoPath)
    }

    if(isAvailable){

        if(notifyByEmail){
            email.notifyAvailability();
        }

        if(keepBrowserOpened){
            try{
                if(app._browser && app._browserAt < Date.now()){
                    try{
                        await app._browser.close()
                    }catch(err){
                        //ignore such error
                    }
                    app._browser= null
                }
                if(app._browser){
                    console.log(moment().format('DD-MM-YY HH:mm:ss'),'There is already a <10 min rdv avail browser opened')
                    await browser.close() //There is <10 min available rdv openeed
                }else{
                    app._browserAt = Date.now() + (1000*3) //Keep a browser opened for 10 min or until next avail
                    app._browser= browser
                    console.log(moment().format('DD-MM-YY HH:mm:ss'),"INFO Browser is opened (availability)")
                }
            }catch(err){
                console.log('ERROR: (Trying to keep the browser opened)',err)
                await browser.close();
            }
        }else{
            console.log(moment().format('DD-MM-YY HH:mm:ss'),'INFO (Trying to keep the browser opened after an availabitiy)')
            isRdvAvailable(false,true, false)
        }


    }else{
        await browser.close();
        console.log(moment().format('DD-MM-YY HH:mm:ss'),'no rdv available')
    }
    
    return isAvailable
};

async function savePhotoInfo(isAvailable){
    let stats = {}
    try{
        stats = JSON.parse((await sander.readFile(process.cwd()+'/public/stats.json')).toString('utf-8'))
    }catch(err){}
    stats.photos = stats.photos || [];
    let id = moment().format('DD[_]MM[_]YY[_]HH[_]mm')
    if(stats.photos.indexOf(id)===-1){
        stats.photos.push(id)
    }
    if(isAvailable){
        stats.photosAvail = stats.photosAvail || [];
        stats.photosAvail.push(id)
    }
    await sander.writeFile(process.cwd()+'/public/stats.json',JSON.stringify(stats,null,4))

    return process.cwd()+`/public/photos/${isAvailable?'available':"not_available"}/${id}.png`;
}

async function optimizeImage(path){
    const imagemin = require('imagemin');
    const pngToJpeg = require('png-to-jpeg');
    await imagemin([path], {
        destination:process.cwd()+'/public/photos',
        plugins: [
            pngToJpeg({quality: 30})
        ]
    });
}

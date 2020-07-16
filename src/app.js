const Vue = require('vue')
const sander = require('sander');
let moment = require('moment-timezone')



module.exports = async function(){
    let stats = JSON.parse((await sander.readFile(process.cwd()+'/public/stats.json')).toString('utf-8'))
    function photosMap(photoName){
        return {
            name: photoName,
            date: moment(photoName.split('_').join(''),'DDMMYYHHmm').tz('Europe/Paris').format('DD-MM-YYYY HH[h]mm')
        }
    }
    stats.photos = stats.photos.map(photosMap)
    stats.photosAvail = (stats.photosAvail||[]).map(photosMap)
    return new Vue({
        template: `<div>
        
        <h1>DÉPÔT DE DOSSIER – ETRANGERS EN SITUATION RÉGULIÈRE: 
        <br/>Vérification de disponibilité</h1>
        <h3>Last check at {{stats.lastCheckFormatted}}</h3>

        <h2 class="rdv_ok">Disponibilités detectes</h2>
        <div class="imgTable">
            <div class="imgItem" v-for="(item,key) in stats.photosAvail||[]" :key="key">
                <label v-html="item.date"></label>    
                <img    :src="'/photos/'+item.name+'.png'" />
            </div>
        </div>
        <h2 class="rdv_fail">Indisponibilité detectes</h2>
        <div class="imgTable">
            <div class="imgItem" v-for="(item,key) in stats.photos" :key="key">
                <label v-html="item.date"></label>    
                <img    :src="'/photos/'+item.name+'.png'" />
            </div>
        </div>

        <style scoped>
            .imgTable{
                display:grid;
                grid-template-columns: 50% 50%;
            }
            .imgItem{
                padding:10px;
            }
            img{
                width:calc(100vw / 2);
                display:block;
            }
            label{
                text-align:center;
                display:block;
            }
            h1{
                background:blue;
                color:white;
                padding:0px 5px;
                margin:0px;
            }
            h3{
                background:yellow;
                padding:20px;
                margin:0px;
                text-align:right;
            }
            body{
                margin:0px;
            }
            .rdv_ok{
                background:green;
                color:white;
            }
            .rdv_fail{
                background:red;
                color:white;
            }
        </style>
        
        </div>`,
        data(){
            return {
                stats
            }
        }
    })
};
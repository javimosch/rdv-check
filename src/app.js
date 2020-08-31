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
        <h3 class="warning">Last check at {{stats.lastCheckFormatted}}</h3>
        <p>
        &nbsp;Source code: <br/>
        <a href="https://github.com/misitioba/rdv-check" target="_blank">
            &nbsp;https://github.com/misitioba/rdv-check
        </a>
        </p>
        
        <h2 class="rdv_ok">Disponibilités detectes</h2>
        <div class="imgTable">
            <div class="imgItem" v-for="(item,key) in stats.photosAvail||[]" :key="key">
                <a :href="'/photos/available/'+item.name+'.png'" target="_blank">
                    <p v-html="item.date"></p>    
                    <img    :src="'/photos/available/'+item.name+'.png'" />
                </a>
            </div>
        </div>
        <h2 class="rdv_fail">Indisponibilité detectes</h2>
        <div class="imgTable">
            <div class="imgItem" v-for="(item,key) in stats.photos" :key="key">
                
                <a :href="'/photos/not_available/'+item.name+'.png'" target="_blank">
                    <p v-html="item.date"></p>    
                    <img    :src="'/photos/not_available/'+item.name+'.png'" />
                </a>
            </div>
        </div>

        <style scoped>
            .imgTable{
                display: flex;
                flex-flow: wrap;
            }
            .imgItem{
                padding:10px;
            }
            img{
                width:calc(100vw / 10);
                display:block;
            }
            label{
                text-align:center;
                display:block;
            }
            h1{
                background:white;
                color:black;
                padding:0px 5px;
                margin:0px;
            }
            .warning{
                background:yellow;
                padding:20px;
                margin:0px;
                text-align:right;
                font-size:20px;
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
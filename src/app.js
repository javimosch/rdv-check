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
        
        <h1>DÉPÔT DE DOSSIER – ETRANGERS EN SITUATION RÉGULIÈRE: Vérification de disponibilité</h1>
        <h3>{{stats.lastCheckFormatted}}</h3>

        <h2>Disponibilités detectes</h2>
        <div class="imgTable">
            <div class="imgItem" v-for="(item,key) in stats.photosAvail||[]" :key="key">
                <label v-html="item.date"></label>    
                <img    :src="'/photos/'+item.name+'.png'" />
            </div>
        </div>
        <h2>Indisponibilité detectes</h2>
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
        </style>
        
        </div>`,
        data(){
            return {
                stats
            }
        }
    })
};
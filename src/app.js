const Vue = require('vue')
const sander = require('sander');
let moment = require('moment-timezone')



module.exports = async function(){
    let stats = JSON.parse((await sander.readFile(process.cwd()+'/public/stats.json')).toString('utf-8'))
    function photosMap(photoName){
        let date = moment(photoName.split('_').join(''),'DDMMYYHHmm').tz('Europe/Paris')
        return {
            name: photoName,
            dateFormatted: date.format('DD-MM-YYYY HH[h]mm'),
            date
        }
    }

    function sort(a, b){
        return a.date.isSameOrAfter(b.date) ? -1 : 1
    }

    stats.photos = stats.photos.map(photosMap).sort(sort)
    stats.photosAvail = (stats.photosAvail||[]).map(photosMap).sort(sort)
    return new Vue({
        template: `<div>
        
        <h1>DÉPÔT DE DOSSIER – ETRANGERS EN SITUATION RÉGULIÈRE: 
        <br/>Vérification de disponibilité</h1>
        <h3 class="warning">Last check at {{stats.lastCheckFormatted}}</h3>

        <div class="app">
        </div>
        <script src="https://cdn.jsdelivr.net/npm/vue@2.6.12"></script>
        <script src="/client.js"></script>

        <p class="source_code">
        &nbsp;Source code: <br/>
        <a href="https://github.com/misitioba/rdv-check" target="_blank">
            &nbsp;https://github.com/misitioba/rdv-check
        </a>
        </p>
        
        <h2 class="rdv_ok">Disponibilités detectes</h2>
        <p style="padding:10px;">
            Remember, some times there are false positives.
        </p>
        <p style="padding:10px;">
            Recuerda, aveces hay falsos positivos.
        </p>
        <p style="padding:10px;">
            N'oubliez pas que parfois, il y a des faux positifs.  
        </p>
        <div class="imgTable">
            <div class="imgItem" v-for="(item,key) in stats.photosAvail||[]" :key="key">
                <a target="_blank" :href="'/photos/available/'+item.name+'.png'" v-html="item.dateFormatted"></a>
            </div>
        </div>
        <h2 class="rdv_fail">Indisponibilité detectes</h2>
        <div class="imgTable">
            <div class="imgItem" v-for="(item,key) in stats.photos" :key="key">
                <a target="_blank" :href="'/photos/not_available/'+item.name+'.png'" v-html="item.dateFormatted"></a>
            </div>
        </div>

        <style scoped>
        .source_code{
            padding: 10px;
    background: #dedede;
    color: #7c0494;
    font-size: 18px;
        }
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
                color: #8d1643;
                padding: 0px 5px;
                margin: 0px;
                background: #fff2f2;
                font-size: 25px;
                padding: 20px;
                text-align: center;
            }
            .warning{
                background: #e8e8b8;
    padding: 20px;
    margin: 0px;
    text-align: right;
    font-size: 22px;
    color: #642081;
            }
            body{
                margin:0px;
            }
            .rdv_ok{
                background: #6e996e;
                color: white;
                padding: 10px;
            }
            .rdv_fail{
                background: indianred;
                color: white;
                padding: 10px;
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
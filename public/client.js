new Vue({
    el:'.app',
    template:`
    <div ref="scope" class="scope">

        <p>
        In order to show the lack of availabilities for a meeting in the prefecture, I made this scraping script that checks the website every 3 minutes. Also, It can notify a subscribers list via email each time it doesn't found the word "existe plus"
        </p>
        <p>
        Afin de montrer le manque de disponibilités pour un rendez-vous en préfecture, j'ai réalisé ce script de grattage qui vérifie le site toutes les 3 minutes. En outre, il peut notifier une liste d'abonnés par e-mail chaque fois qu'il ne trouve pas le mot «existe plus»
        </p>
        <p>
        Para mostrar la falta de disponibilidad para una reunión en la prefectura, hice este script de raspado que revisa el sitio web cada 3 minutos. Además, puede notificar a una lista de suscriptores por correo electrónico cada vez que no encuentre la palabra "existe plus".
        </p>

        <p>
        Este script es gratuito y es software libre.
        </p>

        <label>Subscribe/Unsubscribe</label>
        <p>
            In order to receive emails (each time the script detects an availability), please subscribe.
        </p>
        <input placeholder="email" v-model="email"/>
        <button @click="setSubscribe(true)">Subscribe</button>
        <button @click="setSubscribe(false)">Unsubscribe</button>
        <button @click="checkSubscribed()">Check if subscribed</button>
    </div>
    `,
    data(){
        return {
            email:''
        }
    },
    methods:{
        checkSubscribed(){
            fetch(`/api/is_subscribed/${this.email}`).then(r=>r.json()).then(r=>{
                window.alert(r.message)
            })
        },
        setSubscribe(flag){
            function validateEmail(email) {
                var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                return re.test(String(email).toLowerCase());
            }
            if(!validateEmail(this.email)){
                return window.alert('Invalid email')
            }
            fetch(`/api/${flag?'subscribe':'unsubscribe'}/${this.email}`).then(r=>r.json()).then(r=>{
                window.alert(r.message)
                this.email = ""
            })
        }
    },
    mounted(){
        let style = document.createElement('style')
        style.setAttribute('scoped',true)
        style.innerHTML = `
            .scope{
                padding:10px;
            }
            label{
                text-align:left!important;
                display:block;
                font-weight: bold;
            }
        `
        this.$refs.scope.appendChild(style)
    }
})
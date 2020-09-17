new Vue({
    el:'.app',
    template:`
    <div ref="scope" class="scope">
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
            }
        `
        this.$refs.scope.appendChild(style)
    }
})
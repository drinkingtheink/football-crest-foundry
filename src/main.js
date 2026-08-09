import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { startAnimatedFavicon } from './favicon.js'

createApp(App).mount('#app')
startAnimatedFavicon()

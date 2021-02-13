import Vue from 'vue'
import { LMap, LTileLayer, LMarker, LControlLayers, LPopup } from 'vue2-leaflet'
import 'leaflet/dist/leaflet.css'

import { Icon } from 'leaflet'

Vue.component('LMap', LMap)
Vue.component('LTileLayer', LTileLayer)
Vue.component('LMarker', LMarker)
Vue.component('LControlLayers', LControlLayers)
Vue.component('LPopup', LPopup)

delete Icon.Default.prototype._getIconUrl
Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
})

<template>
  <client-only>
    <!-- :min-zoom="2"  -->
    <l-map :zoom="zoom" :center="center" style="z-index: 0;">
      <l-control-layers position="topright"></l-control-layers>
      <l-tile-layer
        v-for="tileProvider in tileProviders"
        :key="tileProvider.name"
        :name="tileProvider.name"
        :visible="tileProvider.visible"
        :url="tileProvider.url"
        :attribution="tileProvider.attribution"
        layer-type="base"
      />

      <l-marker-cluster>
        <l-marker
          v-for="(marker, index) in markers"
          :key="index"
          :lat-lng="marker.latlng"
        >
          <l-popup>
            <nuxt-link :to="localePath(marker.path)">{{
              marker.content
            }}</nuxt-link>
            <template v-if="marker.image">
              <v-img
                class="ma-2"
                max-height="150px"
                min-height="90px"
                :src="marker.image"
                contain
              />
            </template>
          </l-popup>
        </l-marker>
      </l-marker-cluster>
    </l-map>
  </client-only>
</template>

<script lang="ts">
import { Vue, Prop, Component } from 'nuxt-property-decorator'

// const Vue2LeafletMarkerCluster = require('vue2-leaflet-markercluster')

let Vue2LeafletMarkerCluster = {}
if (process.client)
  Vue2LeafletMarkerCluster = require('vue2-leaflet-markercluster')

@Component({
  components: {
    'l-marker-cluster': Vue2LeafletMarkerCluster,
  },
})
export default class Map extends Vue {
  @Prop()
  markers!: any[]

  @Prop({ default: 1 })
  zoom!: number

  @Prop({
    default: [],
  })
  center!: number[]

  tileProviders: any[] = [
    {
      name: 'OpenStreetMap',
      visible: true,
      attribution:
        '&copy; <a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    },
    {
      name: 'OpenTopoMap',
      visible: false,
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution:
        'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    },
  ]
}
</script>
<style>
@import 'leaflet.markercluster/dist/MarkerCluster.css';
@import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
</style>

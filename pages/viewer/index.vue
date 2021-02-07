<template>
  <div>
    <template v-if="collectionFlag">
      <Collection></Collection>
    </template>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
import axios from 'axios'
import Collection from '~/components/viewer/Collection.vue'

@Component({
  components: {
    Collection,
  },
})
export default class about extends Vue {
  baseUrl: string = process.env.BASE_URL || ''
  collectionFlag: boolean = false

  get result(): {} {
    return this.$store.getters.getResult
  }

  set result(value) {
    this.$store.commit('setResult', value)
  }

  async created() {
    // XML
    const u: any = this.baseUrl + '/data/collection.json'
    const result = await axios.get(u)

    this.result = result.data
    this.collectionFlag = true
  }
}
</script>

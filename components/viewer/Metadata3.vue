<template>
  <div class="pa-5">
    <TeiElement
      v-for="(item, key) in arr"
      :key="key"
      class="my-5"
      :element="bbb(item)"
    ></TeiElement>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
import TeiElement from '~/components/viewer/TeiElement.vue'

const convert = require('xml-js')
const $ = require('jquery')

@Component({
  components: {
    TeiElement,
  },
})
export default class Metadata extends Vue {
  get xml(): any {
    return this.$store.getters.getXml
  }

  set xml(value) {
    this.$store.commit('setXml', value)
  }

  get metadata() {
    const xml = this.xml
    if (!xml) {
      return ''
    }
    const header = xml.querySelector('tei-teiheader')
    if (header) {
      return new XMLSerializer().serializeToString(header)
    } else {
      return ''
    }
  }

  get arr() {
    return $($(this.xml).find('tei-teiheader')).children()
  }

  bbb(data: any) {
    if (!data) {
      return {}
    }

    const dfStr = convert.xml2json(data.outerHTML, {
      compact: false,
      spaces: 4,
    })
    const df = JSON.parse(dfStr)

    return df.elements[0]
  }
}
</script>
<style>
tei-encodingdesc {
  display: block !important;
}
tei-publicationstmt {
  display: block !important;
}
tei-publicationstmt > * {
  display: block !important;
}
tei-sourcedesc {
  display: block !important;
}
</style>

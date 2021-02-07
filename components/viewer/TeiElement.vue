<template>
  <component :is="element.name || 'span'">
    <!-- date and time -->
    <template
      v-if="
        (element.name == 'tei-date' || element.name == 'tei-time') &&
        element.attributes &&
        element.attributes.when
      "
    >
      <v-tooltip right>
        <template #activator="{ on, attrs }">
          <span v-bind="attrs" v-on="on">{{ element.elements[0].text }}</span>
        </template>
        <span>{{ element.attributes.when }}</span>
      </v-tooltip>
    </template>
    <template
      v-else-if="
        (element.name == 'tei-persname' || element.name == 'tei-placename') &&
        element.attributes
      "
    >
      <a
        target="_blank"
        :href="
          'https://shibusawa-dlab.github.io/lab1/entity/' +
          (element.name == 'tei-persname' ? 'agential' : 'spatial') +
          '/' +
          getTextContent(element)
        "
        style="text-decoration: none"
      >
        <TeiElement
          v-for="(e, index) in element.elements"
          :key="index"
          :element="e"
        ></TeiElement>
      </a>
    </template>
    <template v-else-if="element.type == 'text'">
      {{ element.text }}
    </template>
    <template v-else>
      <template
        v-if="
          element.name == 'tei-pb' &&
          element.attributes &&
          element.attributes.corresp
        "
      >
        <v-icon
          class="ma-1"
          color="purple"
          @click="canvas = facs[element.attributes.corresp.replace('#', '')]"
          >mdi-image</v-icon
        >
        <span class="ma-1" style="color: grey"
          >[Page @{{ element.attributes.corresp }}]</span
        >
      </template>
      <TeiElement
        v-for="(e, index) in element.elements"
        :key="index"
        :element="e"
      ></TeiElement>
    </template>
  </component>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'nuxt-property-decorator'
import TeiElement from '~/components/viewer/TeiElement.vue'

@Component({
  components: {
    TeiElement,
  },
  name: 'TeiElement',
})
export default class Menu extends Vue {
  @Prop({})
  element!: any

  get canvas(): any {
    return this.$store.getters.canvas
  }

  set canvas(value) {
    this.$store.commit('setCanvas', value)
  }

  get facs(): any {
    return this.$store.getters.getFacs
  }

  set facs(value) {
    this.$store.commit('setFacs', value)
  }

  getTextContent(element: any) {
    let text = ''
    if (element.text) {
      text += element.text.trim()
    }
    if (element.elements) {
      for (let i = 0; i < element.elements.length; i++) {
        text += this.getTextContent(element.elements[i])
      }
    }
    return text.trim()
  }
}
</script>
<style scoped>
tei-persName {
  background-color: #ffccbc;
}

tei-placeName {
  background-color: #c8e6c9;
}

tei-date {
  background-color: #bbdefb;
}

tei-time {
  background-color: #fff9c4;
}

tei-head {
  margin: 20px;
  font-size: large !important;
  font-weight: bold;
}
</style>

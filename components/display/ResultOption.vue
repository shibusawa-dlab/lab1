<template>
  <span>
    <v-menu top offset-y>
      <template v-slot:activator="{ on }">
        <v-btn depressed icon v-on="on">
          <v-icon>mdi-share-variant</v-icon>
        </v-btn>
      </template>

      <ShareButtons :url="url" :title="title" />
    </v-menu>
  </span>
</template>

<script lang="ts">
import { Vue, Prop, Component } from 'nuxt-property-decorator'
import ShareButtons from '~/components/common/ShareButtons.vue'

@Component({
  components: {
    ShareButtons,
  },
})
export default class resultoption extends Vue {
  @Prop()
  item!: any

  get title() {
    return this.item.label
  }

  get url() {
    return this.item.url
  }
}
</script>

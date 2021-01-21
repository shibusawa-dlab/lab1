<template>
  <div>
    <v-container class="my-5">
      <h2 class="mb-5">{{ title }}</h2>

      <ul>
        <li>hogehoge</li>
      </ul>
    </v-container>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'

@Component({})
export default class about extends Vue {
  title: any = this.$t('legend')

  head() {
    const title = this.title
    return {
      title,
    }
  }
}
</script>

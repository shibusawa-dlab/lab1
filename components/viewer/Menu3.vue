<template>
  <v-list>
    <v-list-item class="mt-5">
      <v-list-item-title
        ><h3>{{ $t('コンテンツ') }}</h3>
      </v-list-item-title>
    </v-list-item>
    <v-list-group v-for="(item, key) in items" :key="key" no-action sub-group>
      <template #activator>
        <v-list-item-content @click="id = item.id">
          <v-list-item-title>{{ item.label }}</v-list-item-title>
        </v-list-item-content>
      </template>

      <template v-for="(item2, key2) in item.children">
        <v-list-item v-if="item2.label" :key="key2" @click="id = item2.id">
          <v-list-item-title>{{ item2.label }}</v-list-item-title>
        </v-list-item>
      </template>
    </v-list-group>
  </v-list>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'nuxt-property-decorator'

@Component({})
export default class Menu extends Vue {
  @Prop()
  items!: any[]

  get id(): any {
    return this.$store.getters.getId
  }

  set id(value) {
    this.$store.commit('setId', value)
  }
}
</script>

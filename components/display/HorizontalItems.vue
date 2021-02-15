<template>
  <div v-if="data.length > 0">
    <div class="text-center mt-10 pt-10 mb-4">
      <h3><!-- {{ $t('related') }}-->{{ title }}</h3>
      <div v-if="description" class="mt-2">
        <small>{{ description }}</small>
      </div>
    </div>
    <ul class="horizontal-list">
      <li v-for="(obj, index) in data" :key="index" class="item">
        <CardItem
          :key="'value_' + index"
          class="mt-2 mb-4"
          :horizontal="true"
          :item="obj"
          :width="width"
          :height="height"
        />
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { Vue, Prop, Component } from 'nuxt-property-decorator'
import CardItem from '~/components/display/CardItem.vue'

@Component({
  components: {
    CardItem,
  },
})
export default class Header extends Vue {
  @Prop()
  width!: number

  @Prop()
  height!: number

  @Prop({ default: [] })
  data!: any[]

  @Prop({ default: 'items' })
  title!: string

  @Prop({ default: '' })
  description!: string
}
</script>
<style>
.horizontal-list {
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  padding-left: 0 !important;
  padding-right: 0;
}
.item {
  /* 横スクロール用 */
  display: inline-block;

  /* 見た目調整 */
  margin-right: 16px;
}
</style>

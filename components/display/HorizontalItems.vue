<template>
  <div v-if="data.length > 0">
    <h3 class="mt-10 pt-10 mb-4 text-center">
      {{ $t('more_like_this') }}
    </h3>
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

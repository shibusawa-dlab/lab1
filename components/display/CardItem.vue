<template>
  <v-card
    no-body
    :class="horizontal ? '' : 'mb-4'"
    :style="horizontal ? 'width: ' + width + 'px;' : ''"
    flat
    outlined
  >
    <div
      class="pa-4"
      :style="
        horizontal
          ? 'width: ' +
            width +
            'px; height: ' +
            height +
            'px; overflow-y: auto;'
          : ''
      "
    >
      <nuxt-link
        :to="
          localePath({
            name: 'item-id',
            params: { id: item._id },
          })
        "
        class="mr-2"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <h4 v-html="$utils.formatArrayValue(item._source._label)"></h4>
      </nuxt-link>
      <template v-if="item._source.description">
        <div
          class="mt-2"
          v-html="
            $utils.removeHead(
              $utils.xml2html(
                $utils.formatArrayValue(item._source.description),
                true
              )
            )
          "
        ></div>
      </template>
    </div>

    <template v-if="!item.share_hide">
      <v-divider />

      <v-card-actions>
        <v-spacer></v-spacer>
        <ResultOption
          :item="{
            label: $utils.formatArrayValue(item._source._label),
            url: $utils.formatArrayValue(item._source._url),
          }"
        />
      </v-card-actions>
    </template>
  </v-card>
</template>

<script lang="ts">
import { Vue, Prop, Component } from 'nuxt-property-decorator'
import ResultOption from '~/components/display/ResultOption.vue'

@Component({
  components: {
    ResultOption,
  },
})
export default class CardItem extends Vue {
  @Prop({ required: true })
  item!: any

  @Prop({
    default: 300,
  })
  width!: number

  @Prop({
    default: 400,
  })
  height!: number

  @Prop({
    default: false,
  })
  horizontal!: boolean
}
</script>
<style>
a {
  text-decoration: none;
}
</style>

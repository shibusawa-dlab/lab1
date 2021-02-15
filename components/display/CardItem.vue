<template>
  <v-card
    no-body
    :class="horizontal ? '' : 'mb-4'"
    :style="horizontal ? 'width: ' + width + 'px;' : ''"
    flat
    outlined
  >
    <nuxt-link
      v-if="item._source._thumbnail && item._source._thumbnail.length > 0"
      :to="item.to"
    >
      <template v-if="item._source._thumbnail[0].includes('mdi-')">
        <div class="text-center grey lighten-2 pa-10" style="height: 150px">
          <v-icon size="75">{{ item._source._thumbnail[0] }}</v-icon>
        </div>
      </template>
      <template v-else>
        <v-img
          :src="item._source._thumbnail[0]"
          contain
          style="height: 150px"
          width="100%"
          class="grey lighten-2"
        ></v-img>
      </template>
    </nuxt-link>
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
          item.to ||
          localePath({
            name: 'item-id',
            params: { id: item._id },
          })
        "
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <h4 v-html="$utils.formatArrayValue(item._source._label)"></h4>
      </nuxt-link>

      <!--
      <p v-if="item._source.description" class="mt-2 mb-0">
        {{ item._source.description }}
      </p>
      -->

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
    default: 300,
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

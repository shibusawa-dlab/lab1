<template>
  <div>
    <v-sheet color="grey lighten-2">
      <v-container fluid class="py-4">
        <v-breadcrumbs class="py-0" :items="bh">
          <template #divider>
            <v-icon>mdi-chevron-right</v-icon>
          </template>
        </v-breadcrumbs>
      </v-container>
    </v-sheet>
    <v-container fluid class="py-5">
      <v-row dense>
        <v-col cols="12" :sm="3">
          <v-card flat outlined>
            <template v-if="item._source._thumbnail[0].includes('mdi-')">
              <div
                class="text-center grey lighten-2 pa-10"
                style="height: 150px"
              >
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
                    name: 'entity-entity-id',
                    params: { entity: 'agential', id: item._id },
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

          <h3 class="mt-10">
            アイテム
            <nuxt-link
              :to="
                localePath({
                  name: 'search',
                  query: {
                    'dev_MAIN[refinementList][agential][0]': $route.params.id,
                  },
                })
              "
              ><v-icon>mdi-magnify</v-icon></nuxt-link
            >
          </h3>
          <!--
          <ul class="my-5" style="max-height: 200px; overflow-y: auto">
            <li v-for="i in 50" :key="i">aaa</li>
          </ul>
          <p class="text-right"><a>もっと見る</a></p>
          -->
          <p v-if="false" class="mt-5">
            <nuxt-link
              :to="
                localePath({
                  name: 'search',
                  query: {
                    'dev_MAIN[refinementList][agential][0]': $route.params.id,
                  },
                })
              "
              >もっと見る <v-icon>mdi-magnify</v-icon></nuxt-link
            >
          </p>
          <h3 class="mt-10" style="color: red">TODO</h3>
          <ul style="color: red">
            <li>サムネイル画像の表示</li>
            <li>2ホップ先の関係性の表示</li>
          </ul>
        </v-col>
        <v-col cols="12" :sm="9">
          <network
            ref="network"
            :nodes="nodes"
            :edges="edges"
            :options="options"
            style="height: 600px; background-color: #f0f4c3"
            @click="onNodeSelected"
          >
          </network>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
// import * as algoliasearch from 'algoliasearch'
import algoliasearch from 'algoliasearch'
import config from '@/plugins/algolia.config.js'
const { Network } = require('vue-vis-network')

@Component({
  components: {
    network: Network,
  },
})
export default class about extends Vue {
  baseUrl: any = process.env.BASE_URL

  nodes: any = []
  nodesMap: any = {}
  edges: any = []

  horizontal: boolean = false

  options: any = {
    nodes: {
      // borderWidth: 4,
      shapeProperties: {
        useBorderWithImage: true,
      },
      color: 'lightgray',
    },
    edges: {
      color: 'orange',
    },
  }

  item2: any = {
    _source: {
      _thumbnail: [
        'http://commons.wikimedia.org/wiki/Special:FilePath/Asano_souichiro.jpg?width=300',
      ],
      _label: ['浅野総一郎'],
      description: [
        '浅野 総一郎（淺野總一郎 あさの そういちろう、1848年4月13日（嘉永元年3月10日） - 1930年（昭和5年）11月9日）は、日本の実業家。一代で浅野財閥を築いた。',
      ],
    },
  }

  get item(): any {
    return {
      _id: this.$route.params.id,

      _source: {
        _thumbnail: ['mdi-account'],
        _label: [this.$route.params.id],
        _url: [
          this.localePath({
            name: 'entity-entity-id',
            params: { entity: 'agential', id: this.$route.params.id },
          }),
        ],
      },
    }
  }

  get title(): string {
    return this.$route.params.id + 'のネットワーク'
  }

  get bh(): any[] {
    return [
      {
        text: this.$t('top'),
        disabled: false,
        to: this.localePath({ name: 'index' }),
        exact: true,
      },
      {
        text: this.$t('network'),
        disabled: false,
        to: this.localePath({ name: 'network' }),
        exact: true,
      },
      {
        text: this.title,
      },
    ]
  }

  async created() {
    const client = algoliasearch(config.appId, config.apiKey)
    const index = client.initIndex('dev_MAIN') // _temporal_asc

    const field = 'agential'
    const id = this.$route.params.id
    const facets = await index.searchForFacetValues(field, '', {
      filters: field + ':' + id, // 重要。条件のほうはentityに基づく
      maxFacetHits: 100,
    })
    const nodes: any[] = []
    const edges: any[] = []
    const nodesMap: any = {}

    if (this.item._source._thumbnail[0].includes('mdi-')) {
      nodes.push({
        id: 0,
        label: id,
        shape: 'icon',
        icon: {
          code: '\uF007',
          color: 'gray',
        },
      })
    } else {
      nodes.push({
        id: 0,
        label: id,
        shape: 'image',
        image:
          'http://commons.wikimedia.org/wiki/Special:FilePath/Asano_souichiro.jpg?width=300',
      })
    }

    for (let i = 1; i < facets.facetHits.length; i++) {
      const obj = facets.facetHits[i]

      const value = obj.value

      if (value.length > 20) {
        continue
      }

      if (i > 20) {
        break
      }

      nodes.push({
        id: i,
        label: value,
        shape: 'icon',
        icon: {
          code: '\uF007',
          color: 'gray',
        },
      })

      edges.push({
        from: 0,
        to: i,
        value: obj.count,
      })

      nodesMap[i] = value
    }

    /*
    const data: any = process.env.agentials
    const nodes = []

    
    const nodesMap: any = {}

    for (let i = 0; i < data.nodes.length; i++) {
      const node = data.nodes[i]
      nodesMap[node.id] = node

      node.shape = 'icon'
      node.icon = {
        code: '\uF007',
      }
      nodes.push(node)
    }

    
    this.nodesMap = nodesMap
    */
    this.nodes = nodes
    this.edges = edges
    this.nodesMap = nodesMap
  }

  onNodeSelected(value: any) {
    const nodes = value.nodes
    if (nodes.length > 0) {
      const node = this.nodesMap[nodes[0]]

      this.$router.push(
        this.localePath({
          name: 'network-id',
          params: {
            id: node,
          },
        })
      )
    }
  }

  head() {
    const title = this.title
    return {
      title,
    }
  }
}
</script>

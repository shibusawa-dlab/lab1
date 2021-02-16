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
            <v-img
              v-if="
                nodesMap[$route.params.id] && nodesMap[$route.params.id].image
              "
              :src="nodesMap[$route.params.id].image"
              contain
              style="height: 150px"
              width="100%"
              class="grey lighten-2"
            ></v-img>

            <div class="pa-4" :style="'max-height: 200px; overflow-y: auto;'">
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

              <template
                v-if="
                  nodesMap[$route.params.id] &&
                  nodesMap[$route.params.id].description
                "
              >
                <div class="mt-2">
                  {{ nodesMap[$route.params.id].description }}
                </div>
              </template>
            </div>

            <template v-if="!item.share_hide">
              <v-divider />

              <v-card-actions>
                <v-btn color="success" @click="dialog = !dialog"
                  ><v-icon class="mr-2">{{
                    dialog ? 'mdi-file' : 'mdi-account-network'
                  }}</v-icon
                  >{{
                    dialog ? 'つながりを一覧する' : 'ネットワークをみる'
                  }}</v-btn
                >
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

          <!-- Other -->

          <v-card v-if="otherId" flat outlined class="mt-5">
            <v-img
              v-if="nodesMap[otherId] && nodesMap[otherId].image"
              :src="nodesMap[otherId].image"
              contain
              style="height: 150px"
              width="100%"
              class="grey lighten-2"
            ></v-img>

            <div class="pa-4" :style="'max-height: 200px; overflow-y: auto;'">
              <nuxt-link
                :to="
                  localePath({
                    name: 'entity-entity-id',
                    params: { entity: 'agential', id: otherId },
                  })
                "
              >
                <!-- eslint-disable-next-line vue/no-v-html -->
                <h4>{{ otherId }}</h4>
              </nuxt-link>

              <!--
              <p v-if="item._source.description" class="mt-2 mb-0">
                {{ item._source.description }}
              </p>
              -->

              <template
                v-if="nodesMap[otherId] && nodesMap[otherId].description"
              >
                <div class="mt-2">
                  {{ nodesMap[otherId].description }}
                </div>
              </template>
            </div>

            <template v-if="!item.share_hide">
              <v-divider />

              <v-card-actions>
                <v-btn
                  color="primary"
                  :to="
                    localePath({
                      name: 'network-id',
                      params: {
                        id: otherId,
                      },
                    })
                  "
                  ><v-icon class="mr-2">mdi-account-network</v-icon>
                  ネットワークをみる</v-btn
                >
                <v-spacer></v-spacer>
                <ResultOption
                  :item="{
                    label: otherId,
                    url:
                      baseUrl +
                      localePath({
                        name: 'entity-entity-id',
                        params: { entity: 'agential', id: otherId },
                      }),
                  }"
                />
              </v-card-actions>
            </template>
          </v-card>

          <h3 v-if="false" class="mt-10">
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
        </v-col>
        <v-col cols="12" :sm="9">
          <network
            v-show="dialog"
            ref="network"
            :nodes="nodes"
            :edges="edges"
            :options="options"
            style="height: 800px; background-color: #f0f4c3"
            @click="onNodeSelected"
            @stabilized="stabilized"
          >
          </network>
          <v-row v-show="!dialog" dense>
            <v-col cols="12" sm="9">
              <div
                class="grey lighten-2"
                style="height: 850px; overflow-y: auto"
              >
                &nbsp;
                <v-card
                  v-for="(item, key) in items"
                  :key="key"
                  flat
                  outlined
                  class="mb-5 mx-5"
                >
                  <v-list-item three-line>
                    <v-list-item-content>
                      <nuxt-link
                        :to="
                          item.to ||
                          localePath({
                            name: 'entity-entity-id',
                            params: { entity: 'agential', id: item.key },
                          })
                        "
                      >
                        <!-- eslint-disable-next-line vue/no-v-html -->
                        <h3>{{ item.key }}</h3>
                      </nuxt-link>
                      <div class="mt-2">
                        {{ nodesMap[item.key].description }}
                      </div>
                    </v-list-item-content>

                    <v-list-item-avatar tile size="80">
                      <v-img :src="nodesMap[item.key].image" contain />
                    </v-list-item-avatar>
                  </v-list-item>

                  <div class="pa-4 grey lighten-3">
                    <h4 class="mb-4">
                      <v-icon>mdi-file</v-icon> つながりを表すアイテム
                    </h4>

                    <div
                      v-for="(item2, key2) in documents[item.key]"
                      :key="key2"
                      class="px-2"
                    >
                      <h4 class="my-2">
                        <nuxt-link
                          :to="
                            localePath({
                              name: 'item-id',
                              params: {
                                id: item2.objectID,
                              },
                            })
                          "
                          >{{ item2.label }}</nuxt-link
                        >
                      </h4>
                      <v-divider />
                    </div>

                    <!--
              <p v-if="item._source.description" class="mt-2 mb-0">
                {{ item._source.description }}
              </p>
              -->

                    <template v-if="nodesMap[key] && nodesMap[key].description">
                      <div class="mt-2">
                        {{ nodesMap[key].description }}
                      </div>
                    </template>
                  </div>
                </v-card>
              </div></v-col
            >
            <v-col cols="12" sm="3"
              ><v-sheet class="grey lighten-3 pa-2"
                ><h3><v-icon>mdi-view-list</v-icon> つながり一覧</h3></v-sheet
              >
              <v-list dense style="height: 800px; overflow-y: auto">
                <v-list-item
                  v-for="item in items"
                  :key="item.key"
                  @click="otherId = item.key"
                >
                  <v-list-item-avatar>
                    <v-img :src="nodesMap[item.key].image"></v-img>
                  </v-list-item-avatar>

                  <v-list-item-content>
                    <v-list-item-title v-text="item.key"></v-list-item-title>
                  </v-list-item-content>

                  <v-list-item-action>
                    {{ item.value }}
                  </v-list-item-action>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
import algoliasearch from 'algoliasearch'
import config from '@/plugins/algolia.config.js'
import axios from 'axios'
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

  dialog: boolean = true

  otherId: string = ''

  items: any[] = []

  documents: any = {}

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
    physics: {
      enabled: true,
    },
    layout: { randomSeed: 2 },
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
    const id = this.$route.params.id

    let results: any = await axios.get(
      this.baseUrl + '/data/agentials/' + id + '.json'
    )

    this.nodes = results.data.nodes
    this.edges = results.data.edges

    const nodesMap: any = {}
    for (let i = 0; i < results.data.nodes.length; i++) {
      const node = results.data.nodes[i]
      nodesMap[node.id] = node
    }

    const map: any = {}

    for (let i = 0; i < results.data.edges.length; i++) {
      const edge = results.data.edges[i]
      if (edge.from === id || edge.to === id) {
        if (edge.from === id) {
          map[edge.to] = edge.value
        } else {
          map[edge.from] = edge.value
        }
      }
    }

    const arr = Object.keys(map).map((e) => ({ key: e, value: map[e] }))

    arr.sort(function (a, b) {
      if (a.value < b.value) return 1
      if (a.value > b.value) return -1
      return 0
    })

    this.items = arr

    this.nodesMap = nodesMap

    /// ///

    const field = 'agential'
    const client = algoliasearch(config.appId, config.apiKey)
    const index = client.initIndex('dev_MAIN') // _temporal_asc

    results = await index.search('', {
      filters: field + ':' + id,
      hitsPerPage: 100,
    })

    const documents: any = {}

    for (let i = 0; i < results.hits.length; i++) {
      const obj = results.hits[i]
      const agentials = obj.agential
      for (let j = 0; j < agentials.length; j++) {
        const agential = agentials[j]
        if (!documents[agential]) {
          documents[agential] = []
        }
        documents[agential].push(obj)
      }
    }

    this.documents = documents
  }

  onNodeSelected(value: any) {
    const nodes = value.nodes
    if (nodes.length > 0) {
      const node = this.nodesMap[nodes[0]].id

      /*
      this.$router.push(
        this.localePath({
          name: 'network-id',
          params: {
            id: node,
          },
        })
      )
      */
      if (node !== this.$route.params.id) {
        this.otherId = node
      } else {
        this.otherId = ''
      }
    } else {
      this.otherId = ''
    }
  }

  stabilized() {
    this.options.physics.enabled = false
  }

  head() {
    const title = this.title
    return {
      title,
    }
  }
}
</script>

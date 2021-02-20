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
      <h2>登場人物同士のネットワーク</h2>
      <p class="mt-2">
        同一の日記に3回以上登場する人物を繋げています。正確な関連性を知るためには、「つながりを表すアイテム」から本文をご覧ください。ノードをダブルクリックすることで、当該人物のネットワークに遷移します。
      </p>

      <!-- 
      <v-row>
        <v-col
          ><v-btn
            v-show="otherId"
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
            {{ otherId }}のネットワークをみる</v-btn
          ></v-col
        >
        <v-col>
          <div class="text-right">
            <v-chip label>{{
              '同一の日記に3回以上共起する人物ネットワーク'
            }}</v-chip>
          </div>
        </v-col>
      </v-row>
      -->
      <v-row>
        <v-col cols="12" :sm="9">
          <network
            ref="network"
            :nodes="nodes"
            :edges="edges"
            :options="options"
            style="height: 800px; background-color: #f0f4c3"
            @dblclick="onNodeSelected"
            @double-click="aaa"
            @stabilized="stabilized"
          >
            <!-- @click="onNodeSelected" -->
          </network>
        </v-col>
        <v-col cols="12" :sm="3">
          <v-sheet class="grey lighten-3 pa-2"
            ><h3><v-icon>mdi-view-list</v-icon> 人物一覧</h3></v-sheet
          >
          <v-list dense style="max-height: 800px; overflow-y: auto">
            <v-list-item
              v-for="(item, key) in counts"
              :key="key"
              @click="select(item.key)"
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
    </v-container>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
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

  counts: any = {}

  options: any = {
    nodes: {
      /*
      // borderWidth: 4,
      shapeProperties: {
        useBorderWithImage: true,
      },
      
      */
      color: {
        background: 'lightgray',
        highlight: {
          background: 'lightgray',
          border: '#FF6E00',
        },
      },
      borderWidthSelected: 8,
      borderWidth: 4,
      shapeProperties: {
        useBorderWithImage: true,
      },
    },
    edges: {
      color: 'lightgray',
    },
    physics: {
      enabled: true,
    },
    layout: { randomSeed: 2 },
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
      },
    ]
  }

  async created() {
    const results: any = await axios.get(
      this.baseUrl + '/data/agentials_eiichi.json'
    )
    const data = results.data

    this.edges = data.edges
    const nodesMap: any = {}

    const nodes = data.nodes

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      nodesMap[node.id] = node

      /*
      node.image = {
        unselected: node.image,
        selected: node.image
      }

      node.shapeProperties = {
        borderDashes: [15, 5],
            interpolation: false,
      }
      */
    }

    this.nodes = nodes
    this.nodesMap = nodesMap

    /// //

    const counts: any = {}
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      counts[node.label] = node.count
    }

    const arr = Object.keys(counts).map((e) => ({ key: e, value: counts[e] }))

    arr.sort(function (a, b) {
      if (a.value < b.value) return 1
      if (a.value > b.value) return -1
      return 0
    })

    this.counts = arr
  }

  otherId = ''

  onNodeSelected(value: any) {
    const nodes = value.nodes
    if (nodes.length > 0) {
      const node = this.nodesMap[nodes[0]]
      this.otherId = node.label
    }
  }

  aaa(value: any) {
    const nodes = value.nodes
    if (nodes.length > 0) {
      const node = this.nodesMap[nodes[0]]
      this.$router.push(
        this.localePath({
          name: 'network-id',
          params: {
            id: node.label,
          },
        })
      )
    }
  }

  select(id: string) {
    this.otherId = ''
    if (id !== this.$route.params.id) {
      this.otherId = id
    }

    const network: any = this.$refs.network
    network.selectNodes([id])
    network.focus(id)
  }

  stabilized() {
    this.options.physics.enabled = false
  }

  head() {
    const title = this.$t('network')
    return {
      title,
    }
  }
}
</script>

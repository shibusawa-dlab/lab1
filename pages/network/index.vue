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
    <v-container class="py-5">
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

      <network
        ref="network"
        class="mt-5"
        :nodes="nodes"
        :edges="edges"
        :options="options"
        style="height: 800px; background-color: #f0f4c3"
        @click="onNodeSelected"
        @stabilized="stabilized"
      >
      </network>
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

  options: any = {
    nodes: {
      // borderWidth: 4,
      shapeProperties: {
        useBorderWithImage: true,
      },
      color: 'lightgray',
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
    const results: any = await axios.get(this.baseUrl + '/data/agentials.json')
    const data = results.data

    this.edges = data.edges
    const nodesMap: any = {}

    for (let i = 0; i < data.nodes.length; i++) {
      const node = data.nodes[i]
      nodesMap[node.id] = node
    }

    this.nodes = data.nodes
    this.nodesMap = nodesMap
  }

  otherId = ''

  onNodeSelected(value: any) {
    const nodes = value.nodes
    if (nodes.length > 0) {
      const node = this.nodesMap[nodes[0]]

      /*
      this.$router.push(
        this.localePath({
          name: 'network-id',
          params: {
            id: node.label,
          },
        })
      )
      */
      this.otherId = node.label

      /*
      const routeData = this.$router.resolve(
        this.localePath({
          
          name: 'network-id',
          params: {
            id: node.label,
          },
        })
      )
      */

      /*
      name: 'entity-entity-id',
      params: {
        entity: 'agential',
        id: node.label,
      },
      */

      // window.open(routeData.href /*, '_blank' */)
    }
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

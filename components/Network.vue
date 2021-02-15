<template>
  <v-container v-if="nodes.length > 0">
    <h2 class="mt-5 mb-3 text-center">{{ $t('network') }}</h2>
    <v-card no-body outlined flat>
      <network
        ref="network"
        :nodes="nodes"
        :edges="edges"
        :options="options"
        style="height: 600px"
        @click="onNodeSelected"
      >
      </network>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { Vue, Component, Watch, Prop } from 'nuxt-property-decorator'
import axios from 'axios'
const { Network } = require('vue-vis-network')

function getRandomColor() {
  const letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

function getCode(p: string) {
  if (p === 'http://schema.org/agential') {
    return '\uF007'
  } else if (p === 'http://schema.org/spatial') {
    return '\uF279'
  } else if (p === 'http://schema.org/temporal') {
    return '\uF133'
  } else {
    return '\uF02B'
  }
}

@Component({
  components: {
    network: Network,
  },
})
export default class about extends Vue {
  @Prop()
  u!: any

  nodes: any = []

  edges: any = []

  options: any = {
    nodes: {
      // borderWidth: 4,
    },
    edges: {
      color: 'lightgray',
    },
  }

  @Watch('u')
  watchU(): void {
    this.init()
  }

  created() {
    this.init()
  }

  init() {
    this.search()
  }

  async search() {
    const u = this.u

    const query = `
        SELECT DISTINCT ?p ?s ?label ?keyword ?label_k count(?cho) as ?count 
        ?s2 ?label2 count(?cho2) as ?count2 WHERE { 
          BIND(<${u}> as ?s)
          ?cho ?p2 ?s . 
          ?s rdfs:label ?label . 
          ?cho ?p ?keyword . 
          filter (?p != rdf:type && ?p != schema:inLanguage 
          && ?p != schema:temporal && ?p != jps:relationType 
          && ?p != jps:region && ?p != schema:license)
          filter(?s != ?keyword)
          ?keyword rdfs:label ?label_k . 
          filter(?label_k != '不明' && ?label_k != 'unknown / not defined')
        } order by desc(?count) limit 20
      `

    /*

    ?cho2 ?p ?keyword . 
    ?cho2 ?p ?s2 . 
    filter(?s != ?s2)
    filter(?keyword != ?s2)
    ?s2 rdfs:label ?label2 . 
    
    */

    const result = await axios.get(
      'https://jpsearch.go.jp/rdf/sparql?query=' +
        encodeURIComponent(query) +
        '&output=json'
    )

    const results = result.data.results.bindings

    const nodes = []

    const edges = []

    const nodes2: any = {}

    const colors: any = {
      'http://schema.org/agential': '#9E9E9E',
      'http://schema.org/about': '#4CAF50',
      'http://schema.org/spatial': '#FF9800',
      'http://schema.org/temporal': '#795548',
      'http://schema.org/category': '#E91E63',
      'http://schema.org/isPartOf': '#9C27B0',
    }

    for (let i = 0; i < results.length; i++) {
      const obj = results[i]

      const s = obj.s.value
      if (!nodes2[s]) {
        nodes2[s] = {
          label: obj.label.value,
          index: Object.keys(nodes2).length,
          icon: getCode('http://schema.org/agential'),
          uri: s,
          p: 'http://schema.org/agential',
        }
      }

      let label = obj.label.value
      label = obj.name ? obj.name.value : label

      const labelK = obj.label_k.value

      if (labelK === '不明') {
        continue
      }

      let p = obj.p.value
      const arr = ['creator', 'publisher', 'contributor', 'provider']
      for (let j = 0; j < arr.length; j++) {
        p = p.replace(
          'http://schema.org/' + arr[j],
          'http://schema.org/' + 'agential'
        )
      }

      if (!colors[p]) {
        colors[p] = getRandomColor()
      }

      // ----------------

      const keyword = obj.keyword.value
      if (!nodes2[keyword]) {
        nodes2[keyword] = {
          label: labelK,
          index: Object.keys(nodes2).length,
          icon: getCode(p),
          uri: keyword,
          p,
        }
      }

      // ----------------

      edges.push({
        from: nodes2[s].index,
        to: nodes2[keyword].index,
        value: Math.min(Number(obj.count.value), 1000),
        // title: Number(obj.count.value),
        title:
          obj.p.value + '（' + Number(obj.count.value).toLocaleString() + '）',
        arrows: 'to',
        color: colors[p],
      })
    }

    for (const uri in nodes2) {
      const node = nodes2[uri]
      nodes.push({
        id: node.index,
        label: node.label,
        shape: 'icon',
        icon: {
          code: node.icon,
        },
        uri: node.uri,
        p: node.p,
      })
    }

    this.nodes = nodes
    this.edges = edges
  }

  onNodeSelected(value: any) {
    const nodes = value.nodes
    if (nodes.length > 0) {
      const node = this.nodes[nodes[0]]

      let name = 'item'
      let params = {}
      if (node.p === 'http://schema.org/spatial') {
        name = 'entity'
        params = {
          entity: 'spatial',
        }
      } else if (node.p === 'http://schema.org/about') {
        name = 'keyword'
      }

      this.$router.push(
        this.localePath({
          name,
          params,
          query: {
            id: node.uri,
          },
        }),
        () => {},
        () => {}
      )
    }
  }
}
</script>

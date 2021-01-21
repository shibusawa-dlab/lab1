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
    <v-sheet v-if="entity.image" color="grey lighten-4">
      <v-img :src="entity.image" contain style="height: 300px"></v-img>
    </v-sheet>
    <v-container class="my-5">
      <h1>{{ id }}</h1>

      <p v-if="entity.description" class="my-5">{{ entity.description }}</p>

      <div class="text-center my-5">
        <v-tooltip bottom>
          <template #activator="{ on }">
            <v-btn
              class="mr-5"
              :href="baseUrl + '/snorql?describe=' + uri"
              icon
              v-on="on"
              ><v-img
                contain
                width="30px"
                :src="baseUrl + '/img/icons/rdf-logo.svg'"
            /></v-btn>
          </template>
          <span>{{ $t('RDF') }}</span>
        </v-tooltip>
        <ResultOption
          :item="{
            url: baseUrl + '/snorql?describe=' + uri,
            label: id,
          }"
        />
      </div>
    </v-container>
    <v-container class="my-5">
      <div v-if="false">
        <h2 class="mb-5">
          {{ $t(field) }}: {{ id }}（{{ total.toLocaleString() }}）
        </h2>

        <template v-if="Object.keys(entity).length > 0">
          <v-row class="mb-5">
            <v-col v-if="entity.image" cols="12" sm="2">
              <v-img height="150px" contain :src="entity.image" />
            </v-col>
            <v-col cols="12" sm="10">
              <p v-if="entity.description">
                {{ entity.description }}
              </p>
            </v-col>
          </v-row>
        </template>
      </div>

      <v-card flat class="my-5">
        <small>
          <h3 class="mt-5 text-center">
            {{ total.toLocaleString() + ' ' + $t('items') }}
          </h3>
        </small>
        <GChart
          class="pb-10"
          type="ColumnChart"
          :data="chartData"
          :options="chartOptions"
        />
      </v-card>

      <h2 class="mt-10 text-center">
        {{ $t('items') }}
        <v-tooltip bottom>
          <template #activator="{ on }">
            <v-btn
              :to="
                localePath({
                  name: 'search',
                  query: getQuery(field, id),
                })
              "
              icon
              v-on="on"
              ><v-icon>mdi-magnify</v-icon></v-btn
            >
          </template>
          <span>{{ $t('search') }}</span>
        </v-tooltip>
      </h2>

      <div v-if="total > 50" class="text-center">
        <small>（{{ $t('上位') }} 50 {{ $t('items') }}）</small>
      </div>

      <v-simple-table class="mt-10">
        <template #default>
          <tbody>
            <tr v-for="(arr, key) in items" :key="key">
              <td width="30%">{{ key }}（{{ arr.length }}）</td>
              <td style="overflow-wrap: break-word" class="py-5">
                <nuxt-link
                  v-for="(obj, key2) in arr"
                  :key="key2"
                  :to="
                    localePath({
                      name: 'item-id',
                      params: {
                        id: obj.objectID,
                      },
                    })
                  "
                  class="mr-5"
                >
                  {{ obj.label }}
                </nuxt-link>
              </td>
            </tr>
          </tbody>
        </template>
      </v-simple-table>
    </v-container>
  </div>
</template>

<script>
import * as algoliasearch from 'algoliasearch'
import config from '@/plugins/algolia.config.js'
import { GChart } from 'vue-google-charts'
import axios from 'axios'
import ResultOption from '~/components/display/ResultOption.vue'

export default {
  components: {
    GChart,
    ResultOption,
  },
  async asyncData({ payload, app }) {
    if (payload) {
      return { item: payload }
    } else {
      const id = app.context.params.id
      const field = app.context.params.entity

      const client = algoliasearch(config.appId, config.apiKey)
      const index = client.initIndex('dev_MAIN') // _temporal_asc

      const facets = await index.searchForFacetValues('year', '', {
        filters: field + ':' + id,
        maxFacetHits: 100,
      })

      const results = await index.search('', {
        filters: field + ':' + id,
        hitsPerPage: 50,
      })

      const items = {}

      for (let i = 0; i < results.hits.length; i++) {
        const obj = results.hits[i]
        const year = obj.year
        if (!items[year]) {
          items[year] = []
        }
        items[year].push(obj)
      }

      return { results: results.hits, items, field, facets: facets.facetHits }
    }
  },

  data() {
    return {
      baseUrl: process.env.BASE_URL,
      chartOptions: {
        chart: {
          title: 'Company Performance',
          subtitle: 'Sales, Expenses, and Profit: 2014-2017',
        },
      },
      entities: [],
      uri: '',
    }
  },

  head() {
    const title = this.title
    return {
      title,
      meta: [
        {
          hid: 'og:title',
          property: 'og:title',
          content: title,
        },
        {
          hid: 'og:type',
          property: 'og:type',
          content: 'article',
        },
        {
          hid: 'og:url',
          property: 'og:url',
          content: this.url,
        },
        {
          hid: 'twitter:card',
          name: 'twitter:card',
          content: 'summary_large_image',
        },
      ],
    }
  },

  computed: {
    total() {
      let total = 0
      const facets = this.facets

      for (let i = 0; i < facets.length; i++) {
        const facet = facets[i]

        total += facet.count
      }

      return total
    },
    chartData() {
      // const items = this.items
      let minYear = 2000
      let maxYear = 0

      const facets = this.facets
      const items = {}

      for (let i = 0; i < facets.length; i++) {
        const facet = facets[i]
        const year = Number(facet.value)
        items[year] = facet.count

        if (minYear > year) {
          minYear = year
        }
        if (maxYear < year) {
          maxYear = year
        }
      }

      const years = [['Year', 'Appearances']]
      for (let year = minYear; year < maxYear + 1; year++) {
        let freq = 0
        if (items[year]) {
          freq = items[year]
        }
        years.push([year + '', freq])
      }

      return years
    },

    title() {
      return this.id
    },

    id() {
      return this.$route.params.id
    },

    url() {
      return this.baseUrl + this.$route.path
    },

    entity() {
      const entities = this.entities
      if (entities.length > 0) {
        return entities[0]
      } else {
        return {}
      }
    },
    bh() {
      const field = this.field
      return [
        {
          text: this.$t('top'),
          disabled: false,
          to: this.localePath({ name: 'index' }),
        },
        {
          text: this.$t(field),
          disabled: false,
          to: this.localePath({
            name: 'entity-id',
            params: { id: field === 'spatial' ? 'place' : field },
          }),
          exact: true,
        },
        {
          text: this.title,
        },
      ]
    },
  },

  async created() {
    const map = {
      spatial: 'place',
      temporal: 'time',
      agential: 'chname',
    }

    let id = this.id
    if (id === '兜町') {
      id = '日本橋兜町'
    }

    const uri =
      'https://nakamura196.github.io/repo/api/' + map[this.field] + '/' + id
    this.uri = uri

    const query = `
      PREFIX schema: <http://schema.org/>
      PREFIX type: <https://jpsearch.go.jp/term/type/>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX hpdb: <https://w3id.org/hpdb/api/>
      PREFIX sh: <http://www.w3.org/ns/shacl#>
      SELECT DISTINCT * WHERE {
        ?s rdfs:label ?label . 
        filter (?s = <${uri}>)
        optional { ?s schema:description ?description } 
        optional { ?s schema:image ?image } 
      }
      LIMIT 1
    `

    let url = 'https://dydra.com/ut-digital-archives/shibusawa/sparql?query='

    url = url + encodeURIComponent(query) + '&output=json'

    const res = await axios.get(url)
    const results = res.data
    this.entities = results
  },

  methods: {
    getQuery(label, value) {
      const field = `dev_MAIN[refinementList][${label}][0]`
      const query = {
        // 'dev_MAIN[sortBy]': 'dev_MAIN', // _temporal_asc',
      }
      query[field] = value
      return query
    },

    getValues(data) {
      if (!data) {
        return []
      }
      return Array.isArray(data) ? data : [data]
    },

    dwnJson() {
      // 保存するJSONファイルの名前
      const fileName = this.item.objectID + '.xml'

      // データをJSON形式の文字列に変換する。
      const data = this.item.xml

      // HTMLのリンク要素を生成する。
      const link = document.createElement('a')

      // リンク先にJSON形式の文字列データを置いておく。
      link.href = 'data:text/xml;charset=utf-8,' + encodeURIComponent(data)

      // 保存するJSONファイルの名前をリンクに設定する。
      link.download = fileName

      // ファイルを保存する。
      link.click()
    },
  },
}
</script>

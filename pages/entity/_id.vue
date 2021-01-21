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

    <v-container>
      <div class="my-5">
        <v-btn
          v-for="(obj, index) in settings"
          :key="index"
          text
          class="my-1 mr-4"
          :to="
            localePath({
              name: 'entity-id',
              params: { id: index },
            })
          "
        >
          {{ obj.label }}
        </v-btn>
      </div>

      <template v-if="loadingFlag">
        <div class="text-center my-10">
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
        </div>
      </template>
      <template v-else>
        <v-row align="center" class="mt-5">
          <v-col cols="12">
            <v-text-field
              v-model="keywordStr"
              single-line
              background-color="grey lighten-3"
              class="px-4"
              filled
              rounded
              dense
              hide-details
              :label="$t('add_a_search_term')"
              append-icon="mdi-magnify"
              clearable
              clear-icon="mdi-close-circle"
              @click:append="updateQuery()"
              @keydown.enter="trigger"
            ></v-text-field>
          </v-col>
        </v-row>

        <div class="text-center my-10">
          <v-pagination
            v-model="currentPage"
            :length="paginationLength"
            :total-visible="7"
            @input="setCurrentPage"
          ></v-pagination>
        </div>

        <grid :col="4" :list="people"></grid>

        <div class="text-center my-10">
          <v-pagination
            v-model="currentPage"
            :length="paginationLength"
            :total-visible="7"
            @input="setCurrentPage"
          ></v-pagination>
        </div>
      </template>
    </v-container>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'nuxt-property-decorator'
import axios from 'axios'
// import grid from '~/components/Grid.vue'

@Component({})
export default class PageCategory extends Vue {
  @Watch('$route', { deep: true })
  watchTmp(): void {
    this.search()
  }

  settings: any = {
    agential: {
      type: 'type:Agent',
      query: 'fc-agentials',
      label: '人物',
    },
    place: {
      type: 'type:Place',
      query: 'fc-places',
      label: '場所',
    },
  }

  loadingFlag: boolean = true
  results: any[] = []
  label: string = ''
  people: any[] = []

  total: number = 0
  perPage: number = 20

  currentPage: number = 1

  id: string = ''

  // state
  mounted() {
    this.search()
  }

  get paginationLength() {
    return Math.ceil(this.total / this.perPage)
  }

  async getTotal() {
    const type = this.id === 'agential' ? 'Agent' : 'Place'

    const keyword = this.$route.query.keyword || ''

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
      SELECT DISTINCT (count(?s) as ?c) WHERE {
        ?s rdf:type type:${type} . 
        ${
          keyword !== ''
            ? "?s rdfs:label ?label . filter regex(?label, '" +
              keyword +
              "', 'i')"
            : ''
        }
      }
    `

    let url = 'https://dydra.com/ut-digital-archives/shibusawa/sparql?query='

    url = url + encodeURIComponent(query) + '&output=json'

    const results = await axios.get(url)

    return results.data[0].c
  }

  async search() {
    const id: any = this.$route.params.id
    this.id = id

    const total = await this.getTotal()
    this.total = total

    this.loadingFlag = true

    const setting = this.settings[id]

    const type = setting.type

    const from = Number(this.$route.query.from) || 0
    this.currentPage = from / this.perPage + 1

    const keyword = this.$route.query.keyword || ''

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
        ?s rdfs:label ?label;  rdf:type ${type} . 
        ${keyword !== '' ? "filter regex(?label, '" + keyword + "', 'i')" : ''}
            optional { ?s schema:image ?image } 
      }
      ORDER BY desc(?image)
      LIMIT ${this.perPage}
      OFFSET ${from}
    `

    let url = 'https://dydra.com/ut-digital-archives/shibusawa/sparql?query='

    url = url + encodeURIComponent(query) + '&output=json'

    axios.get(url).then((response: any) => {
      const results = response.data

      const people = []
      for (let i = 0; i < results.length; i++) {
        const obj = results[i]

        if (obj.label.value) {
          continue
        }

        const tmp = id === 'agential' ? id : 'spatial'

        const field = `dev_MAIN[refinementList][${tmp}][0]`

        const queryObj: any = {
          // 'dev_MAIN[sortBy]': 'dev_MAIN', // _temporal_asc',
        }
        queryObj[field] = obj.label

        const person: any = {
          label: obj.label,
          path: {
            /*
            name: 'search',
            query: queryObj,
            */
            name: 'entity-entity-id',
            params: {
              entity: tmp,
              id: obj.label,
            },
          },
        }

        if (obj.image) {
          person.image = obj.image
        } else {
          person.image = process.env.BASE_URL + '/img/icons/no-image.png'
        }

        const url = process.env.BASE_URL + '/snorql/?describe=' + obj.s
        person.url = url

        people.push(person)
      }
      this.people = people
      this.loadingFlag = false
    })
  }

  get title() {
    return this.settings[this.$route.params.id].label
  }

  head() {
    return {
      title: this.$t('category') + ' : ' + this.$t(this.title),
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: this.$t('search_by_category'),
        },
      ],
    }
  }

  setCurrentPage(value: number) {
    const from: any = (value - 1) * this.perPage
    const query: any = Object.assign({}, this.$route.query)
    query.from = from
    this.$router.push(
      this.localePath({
        name: 'entity-id',
        params: {
          id: this.id,
        },
        query,
      }),
      () => {},
      () => {}
    )
  }

  keywordStr: string = ''

  trigger(event: any) {
    // 日本語入力中のEnterキー操作は無効にする
    if (event.keyCode !== 13) return

    this.updateQuery()
  }

  updateQuery() {
    const query: any = Object.assign({}, this.$route.query)

    let keywordStr = this.keywordStr

    if (!keywordStr) {
      keywordStr = ''
    }

    let keywords
    if (keywordStr.startsWith('"') && keywordStr.endsWith('"')) {
      keywords = [keywordStr]
    } else {
      keywords = keywordStr.split(' ')
    }

    query.keyword = keywords

    delete query.from

    this.$router.push(
      this.localePath({
        name: 'entity-id',
        params: {
          id: this.id,
        },
        query,
      }),
      () => {},
      () => {}
    )
  }

  get bh() {
    return [
      {
        text: this.$t('top'),
        disabled: false,
        to: this.localePath({ name: 'index' }),
      },
      {
        text: this.title + '（' + this.total.toLocaleString() + '）',
      },
    ]
  }
}
</script>

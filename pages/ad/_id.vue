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
      <h1 class="mt-10">{{ title }}</h1>

      <div class="text-center my-10">
        <v-tooltip v-if="item.source" bottom>
          <template #activator="{ on }">
            <v-btn
              class="mr-5"
              :href="viewer + '/light/?u=' + item.source + '&id=' + item.slug"
              icon
              target="_blank"
              v-on="on"
              ><v-img
                contain
                width="30px"
                :src="baseUrl + '/img/icons/tei.png'"
            /></v-btn>
          </template>
          <span>TEI</span>
        </v-tooltip>
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
          <span>RDF</span>
        </v-tooltip>
        <ResultOption
          :item="{
            url: url,
            label: title,
          }"
        />
      </div>

      <v-simple-table v-if="item.parent" class="my-10">
        <template #default>
          <tbody>
            <tr>
              <td width="30%">{{ $t('parent') }}</td>
              <td style="overflow-wrap: break-word" class="py-5">
                <nuxt-link
                  :to="
                    localePath({
                      name: 'ad-id',
                      params: {
                        id: item.parent_slug,
                      },
                    })
                  "
                >
                  {{ map[item.parent].label }}
                </nuxt-link>
              </td>
            </tr>
            <tr>
              <td width="30%">{{ $t('description') }}</td>
              <td style="overflow-wrap: break-word" class="py-5">
                <span v-html="$utils.xml2html(item.xml)"> </span>
              </td>
            </tr>
          </tbody>
        </template>
      </v-simple-table>

      <grid :col="4" :list="children" class="mt-10"></grid>

      <h2 v-if="false" class="mt-10 pt-10">
        {{ $t('items') }}
        <v-tooltip bottom>
          <template #activator="{ on }">
            <v-btn
              :to="
                localePath({
                  name: 'search',
                  query: {}, //getQuery(field, id),
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

  baseUrl: any = process.env.BASE_URL
  viewer: any = process.env.viewer
  key: string = 'TOP'
  item: any = {}
  children: any[] = []
  map: any = {}

  // state
  mounted() {
    this.search()
  }

  async search() {
    const id = this.$route.params.id || 'top'

    const subject = process.env.github_pages + '/api/items/' + id

    const url = process.env.BASE_URL + '/data/ad.json'

    const result = await axios.get(url)

    const results = result.data

    const children: any = {}

    const map: any = {}
    for (let i = 0; i < results.length; i++) {
      const obj = results[i]
      const item: any = {
        id: obj['@id'],
        slug: obj['@id'].split('/items/')[1],
        label: obj['http://www.w3.org/2000/01/rdf-schema#label'][0]['@value'],
      }
      map[obj['@id']] = item

      if (obj['https://shibusawa-dlab.github.io/lab1/api/properties/xml']) {
        item.xml =
          obj['https://shibusawa-dlab.github.io/lab1/api/properties/xml'][0][
            '@value'
          ]
      }

      if (obj['http://schema.org/sourceData']) {
        const source = obj['http://schema.org/sourceData'][0]['@id']
        item.source = source
      }

      if (obj['http://schema.org/isPartOf']) {
        const parent = obj['http://schema.org/isPartOf'][0]['@id']
        item.parent = parent
        item.parent_slug = parent.split('/items/')[1]
        if (!children[parent]) {
          children[parent] = []
        }
        children[parent].push(item.id)
      }
    }

    // アイテム
    this.item = map[subject]

    // 辞書
    this.map = map

    // 子供
    const arr = []
    if (children[subject]) {
      const arr2 = children[subject]

      for (let i = 0; i < arr2.length; i++) {
        const id = arr2.sort()[i]
        const obj = map[id]
        arr.push({
          label: obj.label,
          image: 'mdi-book-open',
          path: {
            name: 'ad-id',
            params: {
              id: obj.slug,
            },
          },
        })
      }
    }
    this.children = arr
  }

  get title() {
    const item = this.item
    return item.label
  }

  get uri() {
    return this.item.id
  }

  get url() {
    return this.baseUrl + this.$route.fullPath
  }

  head() {
    return {
      title: this.$t('category') + ' : ' + this.title,
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: this.$t('search_by_category'),
        },
      ],
    }
  }

  get bh() {
    const title = this.title
    const top = {
      text: this.$t('top'),
      disabled: false,
      to: this.localePath({ name: 'index' }),
    }
    if (!this.$route.params.id) {
      return [
        top,
        {
          text: this.$t('ad'),
        },
      ]
    } else {
      return [
        top,
        {
          text: this.$t('ad'),
          disabled: false,
          to: this.localePath({ name: 'ad-id' }),
          exact: true,
        },
        {
          text: title,
        },
      ]
    }
  }
}
</script>

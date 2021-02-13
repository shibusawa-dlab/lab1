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
    <v-container class="mb-5">
      <h2 class="mt-10">{{ title }}</h2>

      <div v-for="(child, key) in children" :key="key">
        <v-sheet color="grey lighten-3 " class="my-10 pa-5">
          <h3>{{ map[key].label }}</h3>
        </v-sheet>

        <v-row>
          <template v-for="(obj, index) in child">
            <v-col v-if="map[obj].label" :key="index" cols="12" :sm="3">
              <v-card flat no-body class="mb-4">
                <nuxt-link
                  :to="
                    localePath({
                      name: 'ad-id',
                      params: { id: map[obj].slug },
                    })
                  "
                >
                  <template v-if="map[obj].image">
                    <v-img
                      :src="map[obj].image"
                      contain
                      style="height: 150px"
                      width="100%"
                      class="grey lighten-2"
                    ></v-img>
                  </template>
                  <template v-else>
                    <div
                      class="text-center grey lighten-2 pa-10"
                      style="height: 150px"
                    >
                      <v-icon size="75">mdi-book-open</v-icon>
                    </div>
                  </template>
                </nuxt-link>

                <div class="pa-4">
                  <nuxt-link
                    :to="
                      localePath({
                        name: 'ad-id',
                        params: { id: map[obj].slug },
                      })
                    "
                  >
                    <h4>{{ map[obj].label }}</h4>
                  </nuxt-link>
                </div>
              </v-card>
            </v-col>
          </template>
        </v-row>
      </div>
    </v-container>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
import axios from 'axios'

@Component({})
export default class about extends Vue {
  baseUrl: any = process.env.BASE_URL

  title: any = this.$t(
    '『渋沢栄一伝記資料』別巻1, 2の原本（もととなった資料）リスト'
  )

  get bh(): any[] {
    return [
      {
        text: this.$t('top'),
        disabled: false,
        to: this.localePath({ name: 'index' }),
        exact: true,
      },
      {
        text: this.$t('ad'),
      },
    ]
  }

  children: any = {}
  map: any = {}

  // state
  mounted() {
    this.search()
  }

  async search() {
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

      if (obj['http://schema.org/relatedLink']) {
        const source = obj['http://schema.org/relatedLink'][0]['@value']
        item.related = source
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

      if (
        obj['https://shibusawa-dlab.github.io/lab1/api/properties/provider']
      ) {
        item.provider1 =
          obj[
            'https://shibusawa-dlab.github.io/lab1/api/properties/provider'
          ][0]['@value']
      }

      if (obj['http://schema.org/provider']) {
        item.provider2 = obj['http://schema.org/provider'][0]['@value']
      }

      if (obj['http://schema.org/url']) {
        const source = obj['http://schema.org/url'][0]['@id']
        item.url = source
      }

      if (obj['http://schema.org/image']) {
        item.image = obj['http://schema.org/image'][0]['@id']
      }

      if (obj['http://schema.org/associatedMedia']) {
        item.manifest = obj['http://schema.org/associatedMedia'][0]['@id']
      }

      if (
        obj['https://shibusawa-dlab.github.io/lab1/api/properties/contributor']
      ) {
        item.contributor =
          obj[
            'https://shibusawa-dlab.github.io/lab1/api/properties/contributor'
          ][0]['@value']
      }
    }

    // 辞書
    this.map = map

    const keys = Object.keys(children)
    keys.sort()

    const data: any = {}
    for (const key of keys) {
      if (key === 'https://shibusawa-dlab.github.io/lab1/api/items/top') {
        continue
      }
      data[key] = children[key].sort()
    }

    this.children = data
  }

  head() {
    const title = this.$t('ad')
    return {
      titleTemplate: null,
      title,
    }
  }
}
</script>

<template>
  <div>
    <v-sheet color="grey lighten-2">
      <v-container fluid class="py-4">
        <v-breadcrumbs class="py-0" :items="items">
          <template #divider>
            <v-icon>mdi-chevron-right</v-icon>
          </template>
        </v-breadcrumbs>
      </v-container>
    </v-sheet>
    <v-container class="py-10">
      <p class="mb-5 text-center">
        <v-tooltip bottom>
          <template #activator="{ on }">
            <v-btn
              v-if="item.prev"
              text
              color="primary"
              class="ma-1"
              :to="
                localePath({
                  name: 'item-id',
                  params: { id: item.prev },
                })
              "
              v-on="on"
              ><v-icon>mdi-chevron-left</v-icon></v-btn
            >
          </template>
          <span>{{ $t('previous') }}</span>
        </v-tooltip>

        <v-tooltip bottom>
          <template #activator="{ on }">
            <v-btn
              v-if="item.next"
              text
              color="primary"
              class="ma-1"
              :to="
                localePath({
                  name: 'item-id',
                  params: { id: item.next },
                })
              "
              v-on="on"
              ><v-icon>mdi-chevron-right</v-icon></v-btn
            >
          </template>
          <span>{{ $t('next') }}</span>
        </v-tooltip>
      </p>

      <!--
      <dl class="row mb-5">
        <dt class="col-sm-3 text-muted pb-0">
          <b>{{ $t('label') }}</b>
        </dt>
        <dd class="col-sm-9">
          {{ item.label }}
        </dd>
      </dl>
      -->

      <v-card flat outlined class="my-5">
        <div class="pa-4">
          <span v-html="$utils.xml2html(item.xml, true)"> </span>
          <v-sheet class="pa-3 mt-10" color="grey lighten-3">
            <b class="mr-2">{{ $t('legend') }}:</b>
            <span class="mr-2 teiPersName">{{ $t('agential') }}</span>
            <span class="mr-2 teiPlaceName">{{ $t('spatial') }}</span>
            <span class="mr-2 teiDate">{{ $t('date') }}</span>
            <span class="teiTime">{{ $t('temporal') }}</span>
          </v-sheet>
        </div>
      </v-card>

      <div class="text-center mt-10">
        <v-tooltip bottom>
          <template #activator="{ on }">
            <v-btn icon class="mr-4" v-on="on">
              <a>
                <v-img
                  contain
                  width="30px"
                  :src="baseUrl + '/img/icons/tei.png'"
                  @click="dwnData()"
                />
              </a>
            </v-btn>
          </template>
          <span>TEI/XML</span>
        </v-tooltip>

        <v-tooltip bottom>
          <template #activator="{ on }">
            <v-btn icon class="mr-4" v-on="on">
              <a :href="jsonUrl" target="_blank">
                <v-img
                  contain
                  width="30px"
                  :src="baseUrl + '/img/icons/json-logo.svg'"
                />
              </a>
            </v-btn>
          </template>
          <span>JSON</span>
        </v-tooltip>

        <ResultOption
          :item="{
            label: title,
            url: url,
          }"
        />
      </div>

      <v-simple-table class="mt-10">
        <template #default>
          <tbody>
            <tr>
              <td width="30%">{{ $t('category') }}</td>
              <td style="overflow-wrap: break-word" class="py-5">
                <v-treeview dense open-all :items="categories">
                  <template #label="{ item }">
                    <nuxt-link
                      :to="localePath({ name: 'search', query: item.query })"
                      >{{ item.name }}</nuxt-link
                    >
                  </template>
                </v-treeview>
              </td>
            </tr>
            <tr>
              <td width="30%">{{ $t('date') }}</td>
              <td style="overflow-wrap: break-word" class="py-5">
                <v-treeview dense open-all :items="dates">
                  <template #label="{ item }">
                    <nuxt-link
                      :to="localePath({ name: 'search', query: item.query })"
                      >{{ item.name }}</nuxt-link
                    >
                  </template>
                </v-treeview>
              </td>
            </tr>
            <template v-for="(tag, key) in fields">
              <tr v-if="item[tag].length > 0" :key="key">
                <td width="30%">{{ $t(tag) }}</td>
                <td style="overflow-wrap: break-word" class="py-5">
                  <template v-for="(value, key2) in getValues(item[tag])">
                    <span :key="key2" class="mr-4">
                      <nuxt-link
                        :to="
                          localePath({
                            name: 'entity-entity-id',
                            params: {
                              entity: tag,
                              id: value,
                            },
                          })
                        "
                      >
                        {{ value }}
                      </nuxt-link>

                      <v-tooltip bottom>
                        <template #activator="{ on }">
                          <v-btn
                            icon
                            :to="
                              localePath({
                                name: 'search',
                                query: getQuery(tag, value),
                              })
                            "
                            v-on="on"
                          >
                            <v-icon>mdi-magnify</v-icon>
                          </v-btn>
                        </template>
                        <span>{{ $t('search') }}</span>
                      </v-tooltip>
                    </span>
                  </template>
                </td>
              </tr>
            </template>
          </tbody>
        </template>
      </v-simple-table>

      <!--

      <dl class="row mb-5">
        <dt class="col-sm-3 text-muted pb-0"><b>URL</b></dt>
        <dd class="col-sm-9" style="overflow-wrap: break-word">
          <a :href="url">{{ url }}</a>
        </dd>
      </dl>

      <dl class="row mb-5">
        <dt class="col-sm-3 text-muted pb-0">
          <b>{{ $t('category') }}</b>
        </dt>
        <dd class="col-sm-9" style="overflow-wrap: break-word">
          <v-treeview dense open-all :items="categories">
            <template #label="{ item }">
              <nuxt-link
                :to="localePath({ name: 'search', query: item.query })"
                >{{ item.name }}</nuxt-link
              >
            </template>
          </v-treeview>
        </dd>
      </dl>

      <dl class="row mb-5">
        <dt class="col-sm-3 text-muted pb-0">
          <b>{{ $t('date') }}</b>
        </dt>
        <dd class="col-sm-9" style="overflow-wrap: break-word">
          <v-treeview dense open-all :items="dates">
            <template #label="{ item }">
              <nuxt-link
                :to="localePath({ name: 'search', query: item.query })"
                >{{ item.name }}</nuxt-link
              >
            </template>
          </v-treeview>
        </dd>
      </dl>

      <template v-for="(tag, key) in ['agential', 'spatial' /*, 'temporal'*/]">
        <dl v-if="item[tag].length > 0" :key="key" class="row mb-5">
          <dt class="col-sm-3 text-muted pb-0">
            <b>{{ $t(tag) }}</b>
          </dt>
          <dd class="col-sm-9">
            <template v-for="(value, key2) in getValues(item[tag])">
              <span :key="key2" class="mr-4">
                <nuxt-link
                  :to="
                    localePath({
                      name: 'entity-entity-id',
                      params: {
                        entity: tag,
                        id: value,
                      },
                    })
                  "
                >
                  {{ value }}
                </nuxt-link>

                <v-tooltip bottom>
                  <template #activator="{ on }">
                    <v-btn
                      icon
                      :to="
                        localePath({
                          name: 'search',
                          query: getQuery(tag, value),
                        })
                      "
                      v-on="on"
                    >
                      <v-icon>mdi-magnify</v-icon>
                    </v-btn>
                  </template>
                  <span>{{ $t('search') }}</span>
                </v-tooltip>
              </span>
            </template>
          </dd>
        </dl>
      </template>

      -->

      <HorizontalItems :data="moreLikeThisData" />
    </v-container>

    <v-sheet class="text-center pa-10 mt-10">
      <small>
        <h3 class="mb-5">{{ $t('license') }}</h3>

        <template v-if="$i18n.locale == 'ja'">
          <a rel="license" href="http://creativecommons.org/licenses/by/4.0/"
            ><img
              alt="クリエイティブ・コモンズ・ライセンス"
              style="border-width: 0"
              src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a
          ><br />この作品は<a
            rel="license"
            href="http://creativecommons.org/licenses/by/4.0/"
            >クリエイティブ・コモンズ 表示 4.0 国際 ライセンス</a
          >の下に提供されています。
        </template>
        <template v-else>
          <a rel="license" href="http://creativecommons.org/licenses/by/4.0/"
            ><img
              alt="Creative Commons License"
              style="border-width: 0"
              src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a
          ><br />This work is licensed under a
          <a rel="license" href="http://creativecommons.org/licenses/by/4.0/"
            >Creative Commons Attribution 4.0 International License</a
          >.
        </template>
      </small>
    </v-sheet>
  </div>
</template>

<script>
import * as algoliasearch from 'algoliasearch'
import config from '@/plugins/algolia.config.js'
import ResultOption from '~/components/display/ResultOption.vue'
import HorizontalItems from '~/components/display/HorizontalItems.vue'

export default {
  components: {
    ResultOption,
    HorizontalItems,
  },
  async asyncData({ payload, app }) {
    if (payload) {
      return { item: payload }
    } else {
      const id = app.context.params.id
      const client = algoliasearch(config.appId, config.apiKey)
      const index = client.initIndex('dev_MAIN')
      const item = await index.getObject(id)
      return { item }
    }
  },

  data() {
    return {
      baseUrl: process.env.BASE_URL,
      moreLikeThisData: [],
      fields: ['agential', 'spatial' /*, 'temporal' */],
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
    dates() {
      const dates = this.item.date
      const keys = Object.keys(dates)
      const date = dates[keys[keys.length - 1]]
      const es = date.split(' > ')
      const data = []
      if (es.length >= 1) {
        data.push({
          id: 1,
          name: es[0],
          children: [],
          query: {
            'dev_MAIN[hierarchicalMenu][date.lvl0][0]': es[0],
          },
        })
      }
      if (es.length >= 2) {
        data[0].children.push({
          id: 2,
          name: es[1],
          children: [],
          query: {
            'dev_MAIN[hierarchicalMenu][date.lvl0][0]': es[0],
            'dev_MAIN[hierarchicalMenu][date.lvl0][1]': es[1],
          },
        })
      }

      if (es.length === 3) {
        data[0].children[0].children.push({
          id: 3,
          name: es[2],
          query: {
            'dev_MAIN[hierarchicalMenu][date.lvl0][0]': es[0],
            'dev_MAIN[hierarchicalMenu][date.lvl0][1]': es[1],
            'dev_MAIN[hierarchicalMenu][date.lvl0][2]': es[2],
          },
        })
      }
      return data
    },
    categories() {
      const values = this.item.category
      const keys = Object.keys(values)
      const value = values[keys[keys.length - 1]]
      const es = value.split(' > ')
      return [
        {
          id: 1,
          name: es[0],
          query: {
            'dev_MAIN[hierarchicalMenu][category.lvl0][0]': es[0],
          },
          children: [
            {
              id: 2,
              name: es[1],
              query: {
                'dev_MAIN[hierarchicalMenu][category.lvl0][0]': es[0],
                'dev_MAIN[hierarchicalMenu][category.lvl0][1]': es[1],
              },
            },
          ],
        },
      ]
    },
    title() {
      return this.item.label
    },

    url() {
      return this.baseUrl + this.$route.path
    },
    jsonUrl() {
      return `https://${config.appId}-dsn.algolia.net/1/indexes/dev_MAIN/${this.item.objectID}?X-Algolia-API-Key=${config.apiKey}&X-Algolia-Application-Id=${config.appId}`
    },
    items() {
      return [
        {
          text: this.$t('top'),
          disabled: false,
          to: this.localePath({ name: 'index' }),
        },
        {
          text: this.$t('search'),
          disabled: false,
          to: this.localePath({ name: 'search' }),
        },
        {
          text: this.title,
        },
      ]
    },
  },

  async created() {
    const item = this.item

    const es = []
    const fields = this.fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]
      const values = item[field]
      for (let j = 0; j < values.length; j++) {
        es.push(values[j])
      }
    }

    const client = algoliasearch(config.appId, config.apiKey)
    const index = client.initIndex('dev_MAIN')
    const item2 = await index.search('', {
      similarQuery: es.join(' '),
    })

    const arr = []
    const hits = item2.hits
    for (let i = 1; i < hits.length; i++) {
      const hit = hits[i]
      arr.push({
        _id: hit.objectID,
        _source: {
          _label: [hit.label],
          description: [
            '<p><b>' +
              this.$t('temporal') +
              '</b>: ' +
              hit.temporal +
              '</p>' +
              hit.xml,
          ],
          _thumbnail: [],
          _url: [this.baseUrl + '/item/' + hit.objectID],
        },
      })
    }

    this.moreLikeThisData = arr
  },

  methods: {
    getQuery(label, value) {
      const field = `dev_MAIN[refinementList][${label}][0]`
      const query = {
        'dev_MAIN[sortBy]': 'dev_MAIN', // 'dev_MAIN_temporal_asc',
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

    dwnData() {
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
<style>
tbody tr:nth-of-type(odd) {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>

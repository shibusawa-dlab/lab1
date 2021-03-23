<template>
  <client-only>
    <ais-instant-search
      :routing="routing"
      :search-client="searchClient"
      :index-name="index"
    >
      <v-sheet color="grey lighten-2">
        <v-container fluid class="py-4">
          <v-breadcrumbs class="py-0" :items="bh">
            <template #divider>
              <v-icon>mdi-chevron-right</v-icon>
            </template>
          </v-breadcrumbs>
        </v-container>
      </v-sheet>
      <v-container class="my-5">
        <h2>{{ $t('search') }}</h2>

        <p class="my-2">
          『渋沢栄一伝記資料』別巻1, 2の本文を対象に検索します。
        </p>

        <v-row class="my-2" dense>
          <v-col cols="12" md="10"
            ><ais-search-box :placeholder="$t('add_a_search_term')"
          /></v-col>
          <v-col cols="12" md="2"
            ><client-only
              ><div class="text-right">
                <ais-powered-by /></div></client-only
          ></v-col>
        </v-row>

        <v-row class="mt-10" dense>
          <v-col cols="12" lg="4"
            ><ais-stats>
              <h3 slot-scope="{ nbHits }" class="my-0">
                {{ $t('search_result') }}: {{ nbHits.toLocaleString() }}
                {{ $t('hits') }}
              </h3>
            </ais-stats></v-col
          >
          <v-col cols="12" lg="8"
            ><v-row dense>
              <v-col cols="12" :lg="6">
                <ais-pagination :padding="2" class="mb-4" />
              </v-col>
              <v-col cols="12" :lg="6">
                <v-row>
                  <v-col cols="12" :sm="6">
                    <ais-hits-per-page
                      :items="[
                        { text: '24', value: 24, default: true },
                        { text: '60', value: 60 },
                        { text: '120', value: 120 },
                        { text: '512', value: 512 },
                      ]"
                    >
                      <v-select
                        v-model="perPage"
                        slot-scope="{ items, refine }"
                        dense
                        :items="items"
                        :label="$t('items_per_page')"
                        @change="refine(perPage)"
                      >
                        {{ getPageValue(items) }}
                      </v-select>
                    </ais-hits-per-page>
                  </v-col>
                  <v-col cols="12" :sm="6">
                    <ais-sort-by
                      :items="[
                        { value: 'dev_MAIN', label: this.$t('relevance') },
                        /*
                      {
                        value: 'dev_MAIN_temporal_asc',
                        label: this.$t('temporal') + ' ' + this.$t('asc'),
                      },
                      */
                      ]"
                    >
                      <v-select
                        v-model="sort"
                        slot-scope="{ items, currentRefinement, refine }"
                        dense
                        :items="getSortItems(items)"
                        :label="$t('sort_by')"
                        @change="refine(sort)"
                      >
                        {{ getSortValue(currentRefinement) }}
                      </v-select>
                    </ais-sort-by>
                  </v-col>
                </v-row>
              </v-col>
            </v-row></v-col
          >
        </v-row>

        <v-row>
          <v-col col="12" sm="8" order-sm="12">
            <ais-hits>
              <v-row slot-scope="{ items }">
                <v-col v-for="item in items" :key="item.objectID" cols="12">
                  <v-card flat outlined>
                    <div class="pa-4">
                      <nuxt-link
                        :to="
                          localePath({
                            name: 'item-id',
                            params: { id: item.objectID },
                          })
                        "
                      >
                        <h3>{{ item.label }}</h3>
                      </nuxt-link>
                      <div class="my-2">
                        <small>
                          <span class="mr-4">
                            <b>ID:</b>
                            {{ item.objectID }}
                          </span>
                          <span
                            v-if="item.agential && item.agential.length > 0"
                            class="mr-4"
                          >
                            <b>{{ $t('agential') }}:</b>
                            {{ item.agential.join(', ') }}
                          </span>
                          <span
                            v-if="item.spatial && item.spatial.length > 0"
                            class="mr-4"
                          >
                            <b>{{ $t('spatial') }}:</b>
                            {{ item.spatial.join(', ') }}
                          </span>
                          <span
                            ><b>{{ $t('temporal') }}:</b>
                            {{ item.temporal }}</span
                          >
                        </small>
                      </div>

                      <p
                        class="mt-4"
                        style="max-height: 200px; overflow-y: auto"
                        v-html="
                          $utils.removeHead(
                            $utils.xml2html(item._highlightResult.xml.value)
                          )
                        "
                      />
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </ais-hits>

            <ais-pagination :padding="2" class="mt-10" />
          </v-col>

          <v-col col="12" sm="4" order-sm="1">
            <v-expansion-panels :value="0" flat class="mb-4">
              <v-expansion-panel>
                <v-expansion-panel-header class="grey lighten-2">
                  <h3>{{ $t('category') }}</h3>
                </v-expansion-panel-header>
                <v-expansion-panel-content outlined>
                  <ais-hierarchical-menu
                    class="mt-2"
                    :sort-by="['isRefined', 'name:asc']"
                    :attributes="['category.lvl0', 'category.lvl1']"
                  />
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>

            <v-expansion-panels :value="0" flat class="mt-4">
              <v-expansion-panel>
                <v-expansion-panel-header class="grey lighten-2">
                  <h3>{{ $t('date') }}</h3>
                </v-expansion-panel-header>
                <v-expansion-panel-content outlined>
                  <ais-hierarchical-menu
                    class="mt-2"
                    show-more
                    :show-more-limit="100"
                    :limit="20"
                    :sort-by="['isRefined', 'name:asc']"
                    :attributes="['date.lvl0', 'date.lvl1', 'date.lvl2']"
                  />
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>

            <v-expansion-panels
              v-for="(tag, key) in [
                'agential',
                'spatial',
                //'year',
                //'yearAndMonth',
                //'temporal',
              ]"
              :key="key"
              :value="0"
              flat
              class="mt-4"
            >
              <v-expansion-panel>
                <v-expansion-panel-header class="grey lighten-2">
                  <h3>{{ $t(tag) }}</h3>
                </v-expansion-panel-header>
                <v-expansion-panel-content outlined>
                  <ais-refinement-list
                    class="mt-2"
                    show-more
                    operator="and"
                    :show-more-limit="100"
                    :limit="20"
                    :attribute="tag"
                    :sort-by="[
                      'isRefined',
                      ['temporal', 'year', 'yearAndMonth'].includes(tag)
                        ? 'name:asc'
                        : '',
                    ]"
                  />
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>

            <v-expansion-panels :value="0" flat class="mt-4">
              <v-expansion-panel>
                <v-expansion-panel-header class="grey lighten-2">
                  <h3>{{ $t('type') }}</h3>
                </v-expansion-panel-header>
                <v-expansion-panel-content outlined>
                  <ais-refinement-list
                    class="mt-2"
                    show-more
                    operator="and"
                    :show-more-limit="100"
                    :limit="20"
                    attribute="type"
                    :sort-by="['isRefined']"
                  />
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-col>
        </v-row>
      </v-container>
    </ais-instant-search>
  </client-only>
</template>

<script>
import * as algoliasearch from 'algoliasearch'
import { simple } from 'instantsearch.js/es/lib/stateMappings'
import 'instantsearch.css/themes/algolia-min.css'
import config from '@/plugins/algolia.config.js'

export default {
  data() {
    return {
      searchClient: algoliasearch(config.appId, config.apiKey),

      index: config.index,

      routing: {
        stateMapping: simple(),
      },

      sort: '',
      perPage: '',

      sortItems: [
        { value: config.index, label: this.$t('relevance') },
        /*
        {
          value: 'dev_MAIN_temporal_asc',
          label: this.$t('temporal') + ' ' + this.$t('asc'),
        },
        */
      ],

      bh: [
        {
          text: this.$t('top'),
          disabled: false,
          to: this.localePath({ name: 'index' }),
          exact: true,
        },
        {
          text: this.$t('search'),
        },
      ],
    }
  },

  head() {
    return {
      title: this.$t('search'),
    }
  },
  methods: {
    getSortItems(items) {
      const array = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        array.push({
          text: item.label,
          value: item.value,
        })
      }
      return array
    },

    getSortValue(value) {
      this.sort = value
    },

    getPageValue(items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.isRefined) {
          this.perPage = item.value
          break
        }
      }
    },
  },
}
</script>
<style>
mark {
  background-color: #ffc168;
}
</style>

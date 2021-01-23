<template>
  <div>
    <section class="grey lighten-2">
      <v-img
        min-height="200px"
        max-height="400px"
        contain
        :src="baseUrl + '/img/ogp/home.png'"
      >
        <v-row align="center" class="white--text pa-2 fill-height text-center">
          <v-col v-if="false">
            <h1 class="display-1">
              <b>{{ $t(siteName) }} </b>
            </h1>
            <v-btn
              large
              class="mt-5"
              :to="
                localePath({
                  name: 'search',
                  /*
                  query: {
                    'dev_MAIN[sortBy]': 'dev_MAIN_temporal_asc',
                  },
                  */
                })
              "
              color="primary"
              >{{ $t('try_out') }}</v-btn
            >
          </v-col>
        </v-row>
      </v-img>
    </section>
    <v-container>
      <p class="text-right">
        <v-chip class="text-right" label
          >『渋沢栄一伝記資料』 別巻1 図版より</v-chip
        >
      </p>
    </v-container>

    <v-container class="py-5">
      <v-card flat>
        <div class="my-5 pa-5 text-center">
          <img width="60px" :src="baseUrl + '/img/ogp/logo.jpg'" />
          <h1>{{ $t(siteName) }}</h1>
          <p class="py-5">
            渋沢栄一伝記資料のTEIマークアッププロジェクトです。
          </p>
        </div>

        <div v-if="items.length > 0">
          <h3 class="my-10 text-center">{{ $t('menu') }}</h3>

          <v-row class="mb-10">
            <v-col v-for="(obj, key) in items" :key="key" cols="12" :sm="3">
              <v-card flat no-body class="mb-4">
                <template v-if="obj.href">
                  <a :href="obj.href" target="_blank">
                    <div class="text-center grey lighten-2 pa-10">
                      <v-icon size="100">{{ obj.icon }}</v-icon>
                    </div>
                  </a>
                  <div class="pa-4">
                    <a :href="obj.href" target="_blank">
                      <h4>{{ obj.label }}</h4>
                    </a>

                    <p v-if="obj.description" class="mt-2 mb-0">
                      {{ obj.description }}
                    </p>
                  </div>
                </template>
                <template v-else>
                  <nuxt-link :to="localePath(obj.path)">
                    <div class="text-center grey lighten-2 pa-10">
                      <v-icon size="100">{{ obj.icon }}</v-icon>
                    </div>
                  </nuxt-link>
                  <div class="pa-4">
                    <nuxt-link :to="localePath(obj.path)">
                      <h4>{{ obj.label }}</h4>
                    </nuxt-link>

                    <p v-if="obj.description" class="mt-2 mb-0">
                      {{ obj.description }}
                    </p>
                  </div>
                </template>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-card>
    </v-container>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'

@Component({})
export default class about extends Vue {
  baseUrl: string = process.env.BASE_URL || ''
  siteName: string = process.env.siteName || ''
  github: string = process.env.github || ''

  get items(): any[] {
    return [
      {
        label: this.$t('search'),
        path: {
          name: 'search',
        },
        description: '',
        icon: 'mdi-magnify',
      },
      {
        label: this.$t('calendar'),
        path: {
          name: 'calendar',
        },
        description: '',
        icon: 'mdi-calendar',
      },
      {
        label: this.$t('ad'),
        path: {
          name: 'ad-id',
        },
        description: '',
        icon: 'mdi-book-open',
      },
      {
        label: this.$t('entity'),
        path: {
          name: 'entity-id',
          params: {
            id: 'agential',
          },
        },
        description: '',
        icon: 'mdi-account',
      },
      {
        label: this.$t('map'),
        path: {
          name: 'map',
        },
        description: '',
        icon: 'mdi-map',
      },
      {
        label: this.$t('legend'),
        path: {
          name: 'legend',
        },
        description: '',
        icon: 'mdi-information',
      },
      {
        label: this.$t('snorql'),
        href: 'snorql',
        description: '',
        icon: 'mdi-database',
      },
      {
        label: 'TEI/XML',
        // href: this.github + '/blob/master/static/data/DKB01_20210113.xml',
        href:
          'https://nakamura196.github.io/tei-js-pub' +
          '/light/?u=' +
          'https://nakamura196.github.io/tei-js-pub/data/collection.json',
        description: '',
        icon: 'mdi-file',
      },
      /*
      {
        label: 'Search API',
        href:
          'https://la1l89esu7-dsn.algolia.net/1/indexes/dev_MAIN/?X-Algolia-API-Key=a8dc3bccca1af99f7a77ea55f7dd9f4d&X-Algolia-Application-Id=LA1L89ESU7',
        description: '',
        icon: 'mdi-api',
      },
      */
    ]
  }

  head() {
    const title = this.$t(this.siteName)
    return {
      titleTemplate: null,
      title,
    }
  }
}
</script>

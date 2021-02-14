<template>
  <div>
    <section class="grey lighten-2">
      <v-img
        min-height="200px"
        max-height="300px"
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

    <v-container class="pb-5">
      <v-card flat>
        <div class="mb-5 pb-5 text-center">
          <img width="60px" :src="baseUrl + '/img/ogp/logo.jpg'" />
          <h1>{{ $t(siteName) }}</h1>
          <p class="py-5" v-html="siteDesc"></p>
        </div>

        <div v-if="items.length > 0">
          <h3 class="mt-5 mb-10 text-center">{{ $t('menu') }}</h3>

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
  siteDesc: string = (process.env.siteDesc || '').split('\n').join('<br/>')
  github: string = process.env.github || ''

  get items(): any[] {
    return [
      {
        label: this.$t('about'),
        path: {
          name: 'about',
        },
        description: '',
        icon: 'mdi-information',
      },
      {
        label: this.$t('fulltext'),
        path: {
          name: 'fulltext',
        },
        description: '',
        icon: 'mdi-text',
      },

      {
        label: this.$t('ad'),
        path: {
          name: 'ad',
        },
        description: '',
        icon: 'mdi-book-open',
      },
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
        label: this.$t('person_place'),
        path: {
          name: 'entity',
        },
        description: '',
        icon: 'mdi-tag',
      },
      {
        label: this.$t('map'),
        path: {
          name: 'map',
        },
        description: '',
        icon: 'mdi-map',
      },
      /*
      {
        label: '渋沢栄一日記リスト',
        href:
          'https://www.kanzaki.com/works/2016/pub/image-annotator?u=https://shibusawa-dlab.github.io/lab1/iiif/collection/top.json',
        description: '',
        icon: 'mdi-image',
      },
      */
      {
        label: 'TEI/XML',
        href:
          'https://github.com/shibusawa-dlab/lab1/tree/master/static/data/tei',
        description: '',
        icon: 'mdi-file',
      },
      {
        label: this.$t('snorql'),
        href: 'snorql',
        description: '',
        icon: 'mdi-database',
      },

      {
        label: 'Search API',
        href:
          'https://la1l89esu7-dsn.algolia.net/1/indexes/dev_MAIN/?X-Algolia-API-Key=a8dc3bccca1af99f7a77ea55f7dd9f4d&X-Algolia-Application-Id=LA1L89ESU7',
        description: '',
        icon: 'mdi-api',
      },
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

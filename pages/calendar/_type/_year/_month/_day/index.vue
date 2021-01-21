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
    <v-container class="my-5">
      <v-row v-show="mainFlag" class="fill-height">
        <v-col>
          <v-sheet height="64">
            <v-toolbar flat color="white">
              <v-btn fab text small color="grey darken-2" @click="prev">
                <v-icon small>mdi-chevron-left</v-icon>
              </v-btn>
              <v-btn fab text small color="grey darken-2" @click="next">
                <v-icon small>mdi-chevron-right</v-icon>
              </v-btn>
              <v-toolbar-title class="ml-4">
                {{ title }}
              </v-toolbar-title>
              <v-spacer></v-spacer>
              <v-menu bottom right>
                <template #activator="{ on, attrs }">
                  <v-btn
                    outlined
                    color="grey darken-2"
                    v-bind="attrs"
                    v-on="on"
                  >
                    <span>{{ $t(typeToLabel[type]) }}</span>
                    <v-icon right>mdi-menu-down</v-icon>
                  </v-btn>
                </template>
                <v-list>
                  <v-list-item @click="type = 'day'">
                    <v-list-item-title>{{ $t('Day') }}</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="type = 'week'">
                    <v-list-item-title>{{ $t('Week') }}</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="type = 'month'">
                    <v-list-item-title>{{ $t('Month') }}</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="type = 'custom-daily'">
                    <v-list-item-title>{{ $t('Year') }}</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="type = '4day'">
                    <v-list-item-title>{{ $t('4 Days') }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-toolbar>
          </v-sheet>
          <v-sheet height="600">
            <v-calendar
              ref="calendar"
              v-model="value"
              color="primary"
              :events="events"
              :type="type"
              :locale="lang"
              @click:more="viewDay"
              @click:date="viewDay"
              @click:event="showEvent"
              @change="updateRange"
            ></v-calendar>
            <v-menu
              v-model="selectedOpen"
              :close-on-content-click="false"
              :activator="selectedElement"
              offset-x
            >
              <v-card color="grey lighten-4" min-width="350px" flat>
                <v-toolbar :color="selectedEvent.color" dark>
                  <v-toolbar-title>{{ selectedEvent.name }}</v-toolbar-title>
                  <v-spacer></v-spacer>
                  <v-toolbar-title>{{ selectedEvent.id }}</v-toolbar-title>
                </v-toolbar>
                <v-card-text>
                  <span v-html="$utils.xml2html(selectedEvent.xml, true)" />
                </v-card-text>
                <v-card-actions>
                  <v-btn
                    text
                    color="primary"
                    :to="
                      localePath({
                        name: 'item-id',
                        params: { id: selectedEvent.id },
                      })
                    "
                  >
                    {{ $t('Detail') }}
                  </v-btn>
                  <v-spacer></v-spacer>
                  <v-btn text color="secondary" @click="selectedOpen = false">
                    {{ $t('Cancel') }}
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-menu>
          </v-sheet>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
import * as algoliasearch from 'algoliasearch'
import config from '@/plugins/algolia.config.js'

// NUM=値 LEN=桁数
function zfill(NUM, LEN) {
  NUM = Number(NUM)
  return (Array(LEN).join('0') + NUM).slice(-LEN)
}

// 今後TEI側で構造化データとしたい
function getColor(data) {
  const color = 'cyan'
  if (data.includes('晴')) {
    return 'orange'
  } else if (data.includes('曇')) {
    return 'grey darken-1'
  }
  return color
}

export default {
  async asyncData({ payload, app }) {
    if (payload) {
      return { item: payload }
    } else {
      // 初期値
      let value = '1914-01-02'
      let type = 'custom-daily'

      if (app.context.params.year) {
        const params = app.context.params
        value =
          params.year +
          '-' +
          zfill(params.month, 2) +
          '-' +
          zfill(params.day, 2)
        if (params.type !== 'year') {
          type = params.type
        }
      }

      const es = value.split('-')

      const client = algoliasearch(config.appId, config.apiKey)
      const index = client.initIndex('dev_MAIN')
      const query = es[0] + '-' + es[1]

      const results = await index.search('', {
        filters: 'yearAndMonth:' + query,
        hitsPerPage: 50,
      })

      const events = []
      for (let i = 0; i < results.hits.length; i++) {
        const obj = results.hits[i]
        const date = new Date(`${obj.temporal}T00:00:00`)
        const event = {
          name: obj.label,
          start: date,
          end: date,
          color: getColor(obj.label),
          id: obj.objectID,
          xml: obj.xml,
        }
        events.push(event)
      }

      return { value, type, events, query }
    }
  },
  data: () => ({
    baseUrl: process.env.BASE_URL,
    initFlag: true,
    mainFlag: true,

    typeToLabel: {
      month: 'Month',
      week: 'Week',
      day: 'Day',
      '4day': '4 Days',
      'custom-daily': 'Year',
    },
    selectedEvent: {},
    selectedElement: null,
    selectedOpen: false,
  }),

  head() {
    const title = this.$t('calendar') + ' ' + this.title
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
    url() {
      return this.baseUrl + this.$route.path
    },
    lang() {
      return this.$i18n.locale
    },
    title() {
      // 以下、冗長
      const es = this.query.split('-')
      const monthEnglishList = [
        'Jan.',
        'Feb.',
        'Mar.',
        'Apr.',
        'May',
        'Jun.',
        'Jul.',
        'Aug.',
        'Sep.',
        'Oct.',
        'Nov.',
        'Dec.',
      ]
      const year = es[0]
      const month = Number(es[1])
      return this.lang === 'ja'
        ? year + '年' + month + '月'
        : monthEnglishList[month - 1] + ' ' + year
    },
    bh() {
      return [
        {
          text: this.$t('top'),
          disabled: false,
          to: this.localePath({ name: 'index' }),
        },
        {
          text: this.$t('calendar'),
          disabled: false,
          to: this.localePath({ name: 'calendar' }),
          exact: true,
        },
        {
          text: this.title,
        },
      ]
    },
  },
  methods: {
    viewDay({ date }) {
      this.value = date
      this.type = 'day'
    },
    prev() {
      this.$refs.calendar.prev()
    },
    next() {
      this.$refs.calendar.next()
    },
    showEvent({ nativeEvent, event }) {
      const open = () => {
        this.selectedEvent = event
        this.selectedElement = nativeEvent.target
        setTimeout(() => (this.selectedOpen = true), 10)
      }

      if (this.selectedOpen) {
        this.selectedOpen = false
        setTimeout(open, 10)
      } else {
        open()
      }

      nativeEvent.stopPropagation()
    },
    updateRange() {
      let type = this.type
      if (this.type === 'custom-daily') {
        type = 'year'
      }
      if (!this.initFlag) {
        this.mainFlag = false

        if (type === 'year') {
          this.$router.push(
            this.localePath({
              name: 'calendar',
            })
          )
        } else {
          const es = this.value.split('-')
          this.$router.replace(
            this.localePath({
              name: 'calendar-type-year-month-day',
              params: {
                type,
                year: es[0],
                month: Number(es[1]),
                day: Number(es[2]),
              },
            })
          )
        }
      }
      this.initFlag = false
    },
  },
}
</script>

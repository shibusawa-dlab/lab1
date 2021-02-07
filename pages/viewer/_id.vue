<template>
  <div>
    <template v-if="loading"
      ><div class="pa-10 text-center">
        <v-progress-circular
          indeterminate
          color="primary"
        ></v-progress-circular>
      </div>
    </template>

    <template v-else>
      <v-navigation-drawer
        v-model="drawer"
        style="z-index: 100000"
        app
        :temporary="false"
        :width="(256 * 3) / 2"
      >
        <Menu :id="$route.query.id" :items="items"></Menu>
      </v-navigation-drawer>

      <v-navigation-drawer
        v-model="drawer2"
        app
        :temporary="true"
        right
        :width="256 * 2"
      >
        <Metadata></Metadata>
      </v-navigation-drawer>

      <v-app-bar flat>
        <v-btn icon @click="drawer = !drawer"
          ><v-icon>mdi-view-list</v-icon></v-btn
        >

        <v-spacer></v-spacer>

        <v-tooltip bottom>
          <template #activator="{ on }">
            <v-btn
              v-show="index != divs2.length - 1"
              fab
              dark
              small
              class="mx-1"
              @click="index += 1"
              v-on="on"
            >
              <v-icon dark> mdi-menu-left </v-icon>
            </v-btn>
          </template>
          <span>{{ $t('next') }}</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template #activator="{ on }">
            <v-btn
              v-show="index != 0"
              fab
              dark
              small
              class="mx-1"
              @click="index -= 1"
              v-on="on"
            >
              <v-icon dark> mdi-menu-right </v-icon>
            </v-btn>
          </template>
          <span>{{ $t('previous') }}</span>
        </v-tooltip>

        <v-spacer></v-spacer>

        <v-app-bar-nav-icon @click.stop="drawer2 = !drawer2" />
      </v-app-bar>

      <v-container fluid>
        <v-row class="mt-2">
          <v-col cols="12" :sm="manifest ? 6 : 12">
            <v-card
              id="container"
              flat
              outlined
              class="scroll vertical"
              :style="`height: ${height * 0.8}px; width: ${
                manifest ? width / 2 : width
              }px;`"
            >
              <div class="pa-4 px-5">
                <TeiElement
                  v-if="divs2.length > 0"
                  :element="bbb(divs2[index])"
                ></TeiElement>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" :sm="manifest ? 6 : 12">
            <iframe
              v-if="manifest"
              :src="
                baseUrl + `/curation/?manifest=${manifest}&canvas=${canvas}`
              "
              width="100%"
              :style="`height: ${height * 0.8}px;`"
              allowfullscreen="allowfullscreen"
              frameborder="0"
            >
            </iframe>
          </v-col>
        </v-row>
      </v-container>
    </template>
  </div>
</template>

<script>
import CETEI from 'CETEIcean'
import $ from 'jquery'
import Menu from '~/components/viewer/Menu3.vue'
import Metadata from '~/components/viewer/Metadata3.vue'
import TeiElement from '~/components/viewer/TeiElement.vue'

const convert = require('xml-js')

export default {
  components: {
    Menu,
    Metadata,
    TeiElement,
  },
  data() {
    return {
      baseUrl: process.env.BASE_URL || '',
      siteName: process.env.siteName || '',

      github: process.env.github || '',

      loading: false,

      width: window.innerWidth,
      height: window.innerHeight,

      drawer: false,
      drawer2: false,

      // pos: 1,
      // canvas: '',
      manifest: null,

      index: 0,
      divs: [],
      ids: {},
      ids2: {},
      divs2: [],

      items: [],
    }
  },
  head() {
    const title = this.$t(this.siteName)
    return {
      titleTemplate: null,
      title,
    }
  },
  computed: {
    style: {
      get() {
        return this.$store.getters.getStyle
      },
      set(value) {
        this.$store.commit('setStyle', value)
      },
    },

    xml: {
      get() {
        return this.$store.getters.getXml
      },
      set(value) {
        this.$store.commit('setXml', value)
      },
    },

    facs: {
      get() {
        return this.$store.getters.getFacs
      },
      set(value) {
        this.$store.commit('setFacs', value)
      },
    },

    canvas: {
      get() {
        return this.$store.getters.getCanvas
      },
      set(value) {
        this.$store.commit('setCanvas', value)
      },
    },

    id: {
      get() {
        return this.$store.getters.getId
      },
      set(value) {
        this.$store.commit('setId', value)
      },
    },
  },

  watch: {
    id(val) {
      if (!val) {
        return
      }

      this.$router.push(
        this.localePath({
          name: 'viewer-id',
          params: {
            id: this.$route.params.id,
          },
          query: {
            id: val,
          },
        }),
        () => {},
        () => {}
      )

      this.index = this.ids[val]
    },

    index(val) {
      this.id = this.ids2[val]
      this.canvas = this.canvases[val]
    },
  },

  mounted() {
    this.loading = true

    window.addEventListener('resize', this.handleResize)

    const fileId = this.$route.params.id
    const query = this.$route.query
    const url = query.u || this.baseUrl + '/data/' + fileId + '.xml'
    const CETEIcean = new CETEI()

    const id = this.$route.query.id

    const self = this
    CETEIcean.getHTML5(url, function (data) {
      console.log('downloaded.')
      self.xml = data

      const texts = $($(data).find('tei-text')[0]).find('tei-text')

      const arr = []
      const arr2 = []
      const ids = {}
      const ids2 = {}
      const canvases = []

      const items = []

      let count = 0
      for (let j = 0; j < texts.length; j++) {
        const text = texts[j]

        let label = ''
        const heads = $(text).find('tei-head')
        if (heads.length > 0) {
          label = heads[0].textContent
        }

        let id2 = count
        if ($(text).attr('xml:id')) {
          id2 = $(text).attr('xml:id')
        }

        // count += 1

        const divs = $(text).find('tei-div')

        // とりあえずフラットに並べる
        const arr = []

        for (let i = 0; i < divs.length; i++) {
          const div = divs[i]
          arr.push(div)
          $(div).remove()
        }

        arr.unshift(text)
        // 終了

        // 親の準備
        const children2 = []
        items.push({
          label,
          id: id2,
          children: children2,
        })
        //

        // facs
        const sources = $(data).find('tei-source')
        const facs = {}
        for (let i = 0; i < sources.length; i++) {
          const source = sources[i]
          facs[$(source).attr('xml:id')] = $(source).attr('source')
        }

        self.facs = facs
        // facs end

        // メイン
        const currentCanvas = facs[Object.keys(facs)[0]]
        for (let i = 0; i < arr.length; i++) {
          const div = arr[i]
          arr2.push(div)

          const pbs = $(div).find('tei-pb')
          let canvas = ''
          if (pbs.length === 0) {
            canvas = currentCanvas
          } else {
            const firstPb = pbs[0]
            const currentN = $(firstPb).attr('n')
            const previousIndex = Number(currentN.replace('B', '')) - 1
            const pb = 'pageB' + previousIndex
            canvas = facs[pb]

            const lastPb = pbs[pbs.length - 1]
            currentCanvas = facs[$(lastPb).attr('corresp').replace('#', '')]
          }

          canvases.push(canvas)

          if ($(div).attr('xml:id')) {
            ids[$(div).attr('xml:id')] = count
            ids2[count] = $(div).attr('xml:id')
          } else {
            ids[count] = count
            ids2[count] = count
          }

          if (id === ids2[count]) {
            self.index = count
          }

          // 親の場合
          if (i !== 0) {
            let label2 = ''
            const heads2 = $(div).find('tei-head')
            if (heads2.length > 0) {
              label2 = heads2[0].textContent
            }

            children2.push({
              label: label2,
              id: ids2[count],
            })
          }

          count += 1
        }
      }

      self.items = items

      self.divs = arr
      self.divs2 = arr2
      self.ids = ids
      self.ids2 = ids2
      self.canvases = canvases

      // マニフェスト
      const manifest = $(data).find('tei-facsimile').attr('source')
      self.manifest = manifest

      self.loading = false

      console.log('processed.')
    })
  },

  methods: {
    handleResize() {
      // resizeのたびにこいつが発火するので、ここでやりたいことをやる
      this.width = window.innerWidth
      this.height = window.innerHeight
    },

    bbb(data) {
      if (!data) {
        return {}
      }
      const dfStr = convert.xml2json(data.outerHTML, {
        compact: false,
        spaces: 4,
      })
      const df = JSON.parse(dfStr)

      return df.elements[0]
    },
  },
}
</script>
<style>
.scroll {
  overflow-y: auto;
}

.vertical {
  -webkit-writing-mode: vertical-rl;
  -ms-writing-mode: tb-rl;
  writing-mode: vertical-rl;
}
</style>

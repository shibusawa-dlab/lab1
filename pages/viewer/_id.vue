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
        <Menu :id="$route.query.id" :items="menu"></Menu>
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
              v-show="index != Object.keys(items).length - 1"
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
                <TeiElement :element="item"></TeiElement>
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

      index: -1,
      // divs: [],
      ids: {},
      ids2: {},
      items: {},

      indexIdMap: {},
      idCanvasMap: {},

      menu: [],

      item: {},
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
    // IDが変わったら
    id(val) {
      if (!val) {
        return
      }

      this.canvas = this.idCanvasMap[val]

      const data = this.items[val]

      const dfStr = convert.xml2json(data.outerHTML, {
        compact: false,
        spaces: 4,
      })
      const df = JSON.parse(dfStr)

      this.item = df.elements[0]

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
    },

    // 次へが押されたら
    index(val) {
      const id = this.indexIdMap[val]
      this.id = id
    },
  },

  mounted() {
    this.loading = true

    window.addEventListener('resize', this.handleResize)

    const fileId = this.$route.params.id
    const query = this.$route.query
    const url = query.u || this.baseUrl + '/data/tei/' + fileId + '.xml'
    const CETEIcean = new CETEI()

    const queryId = this.$route.query.id

    let index = 0

    const self = this
    CETEIcean.getHTML5(url, function (data) {
      console.log('downloaded.')
      self.xml = data

      // ① idImageMapの作成
      const idImageMap = self.createIdImageMap(data)

      // ② facsの作成
      // facs
      const sources = $(data).find('tei-source')
      const facs = {}
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i]
        facs[$(source).attr('xml:id')] = $(source).attr('source')
      }
      self.facs = facs

      // diary, undefined, schedule, yearについて取得
      const texts = $($(data).find('tei-text')[0]).find('tei-text')

      // const arr = []
      const mainItems = []

      const indexIdMap = {}
      const idCanvasMap = {}

      const menu = []

      // let index = 0
      for (let j = 0; j < texts.length; j++) {
        const text = texts[j]

        let label = ''
        const heads = $(text).find('tei-head')
        if (heads.length > 0) {
          label = heads[0].textContent
        }

        // xml:idがあればid2
        // let id2 = count
        if (!$(text).attr('xml:id')) {
          continue
        }

        const idLv1 = $(text).attr('xml:id')

        // count += 1

        // text の中の div 要素を取得する
        // diary-entry, note, archival-description, month, day, 欄外
        const divs = $(text).find('tei-div')

        // とりあえずフラットに並べる
        const tmpArrFlat = []

        for (let i = 0; i < divs.length; i++) {
          const div = divs[i]
          tmpArrFlat.push(div)
          $(div).remove()
        }

        tmpArrFlat.unshift(text)
        // 終了

        // 親の準備
        const children2 = []
        menu.push({
          label,
          id: idLv1,
          children: children2,
        })

        for (let i = 0; i < tmpArrFlat.length; i++) {
          const div = tmpArrFlat[i]

          let idLv2 = idLv1
          if ($(div).attr('xml:id')) {
            idLv2 = $(div).attr('xml:id')
          }

          mainItems[idLv2] = div

          indexIdMap[Object.keys(mainItems).length - 1] = idLv2

          // クエリIDと初期indexを合わせる
          if (queryId === idLv2) {
            index = Object.keys(mainItems).length - 1
          }

          idCanvasMap[idLv2] = facs[idImageMap[idLv2]]

          // 親の場合
          if (i !== 0) {
            let label2 = ''
            const heads2 = $(div).find('tei-head')
            if (heads2.length > 0) {
              label2 = heads2[0].textContent
            }

            children2.push({
              label: label2,
              id: idLv2, // ids2[count],
            })
          }
        }
      }

      self.menu = menu
      self.items = mainItems
      self.indexIdMap = indexIdMap
      self.idCanvasMap = idCanvasMap

      // マニフェスト
      const manifest = $(data).find('tei-facsimile').attr('source')
      self.manifest = manifest

      self.loading = false

      console.log('processed.')

      self.index = index
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

    createIdImageMap(data) {
      const pbs = data.outerHTML.split('<tei-pb') // TEIをつけることに注意
      const map = {}
      for (let i = 0; i < pbs.length; i++) {
        const pb = pbs[i]

        const sp = 'corresp="'

        // correspを持たない場合
        if (!pb.includes(sp)) {
          continue
        }

        const corresp = pb.split(sp)[1].split('"')[0].replace('#', '')

        const es = pb.split(' ')

        for (let j = 0; j < es.length; j++) {
          const e = es[j]
          if (e.includes('xml:id=')) {
            const id = e.split('"')[1]

            if (!id.includes('DKB')) {
              continue
            }

            map[id] = corresp
          }
        }
      }

      return map
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

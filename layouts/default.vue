<template>
  <v-app>
    <div>
      <v-navigation-drawer v-model="drawer" app :temporary="true">
        <v-list>
          <v-list-item link :to="localePath({ name: 'index' })" exact>
            <v-list-item-action>
              <v-icon>mdi-home</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>Home</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            link
            :to="
              localePath({
                name: 'search',
                //query: { 'dev_MAIN[sortBy]': 'dev_MAIN_temporal_asc' },
              })
            "
          >
            <v-list-item-action>
              <v-icon>mdi-magnify</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>{{ $t('search') }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            link
            :to="
              localePath({
                name: 'calendar',
              })
            "
          >
            <v-list-item-action>
              <v-icon>mdi-calendar</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>{{ $t('calendar') }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            link
            :to="localePath({ name: 'entity-id', params: { id: 'agential' } })"
          >
            <v-list-item-action>
              <v-icon>mdi-account</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>{{ $t('entity') }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-list-item link :to="localePath({ name: 'map' })">
            <v-list-item-action>
              <v-icon>mdi-map</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>{{ $t('map') }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-list-item link :to="localePath({ name: 'legend' })">
            <v-list-item-action>
              <v-icon>mdi-information</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>{{ $t('legend') }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-list-item link :href="baseUrl + '/snorql'" target="_blank">
            <v-list-item-action>
              <v-icon>mdi-magnify</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title
                >Snorql <v-icon>mdi-open-in-new</v-icon></v-list-item-title
              >
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            link
            target="_blank"
            :href="baseUrl + '/data/DKB01_20210113.xml'"
          >
            <v-list-item-action>
              <v-icon>mdi-file</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title
                >TEI/XML <v-icon>mdi-open-in-new</v-icon></v-list-item-title
              >
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            link
            target="_blank"
            href="https://la1l89esu7-dsn.algolia.net/1/indexes/dev_MAIN/?X-Algolia-API-Key=a8dc3bccca1af99f7a77ea55f7dd9f4d&X-Algolia-Application-Id=LA1L89ESU7"
          >
            <v-list-item-action>
              <v-icon>mdi-magnify</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title
                >Searach API <v-icon>mdi-open-in-new</v-icon></v-list-item-title
              >
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>

      <v-app-bar dark>
        <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
        <v-toolbar-title>
          <nuxt-link
            :to="
              localePath({
                name: 'index',
              })
            "
            style="color: inherit; text-decoration: inherit"
          >
            {{ $t(siteName) }}
          </nuxt-link>
        </v-toolbar-title>

        <v-spacer></v-spacer>

        <v-menu offset-y>
          <template #activator="{ on }">
            <v-btn depressed btn v-on="on">
              <v-icon class="mr-2">mdi-translate</v-icon>
              <template v-if="$vuetify.breakpoint.name != 'xs'">
                {{ $i18n.locale == 'ja' ? '日本語' : 'English' }}</template
              >
              <v-icon class="ml-2">mdi-menu-down</v-icon>
            </v-btn>
          </template>

          <v-list>
            <v-list-item :to="switchLocalePath('ja')">
              <v-list-item-title>日本語</v-list-item-title>
            </v-list-item>
            <v-list-item :to="switchLocalePath('en')">
              <v-list-item-title>English</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <div v-if="false">
          <template v-if="isSignedIn">
            <v-menu left bottom>
              <template #activator="{ on }">
                <v-btn icon v-on="on">
                  <v-avatar size="36">
                    <img :src="userPic" :alt="userName" />
                  </v-avatar>
                </v-btn>
              </template>

              <v-list>
                <!--
              <v-list-item @click="dialog = !dialog">
                <v-list-item-title>プロフィール編集</v-list-item-title>
              </v-list-item>
              -->
                <v-list-item @click="signOut">
                  <v-list-item-title>ログアウト</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
          <template v-else>
            <v-btn color="error" @click="dialog4login = !dialog4login">{{
              $t('login')
            }}</v-btn>
          </template>
        </div>
      </v-app-bar>
    </div>

    <v-main>
      <nuxt />
    </v-main>

    <v-footer :dark="true" class="mt-5">
      <v-container>
        <p class="text-center my-5">
          {{ $t(siteName) }}
        </p>
      </v-container>
    </v-footer>

    <v-dialog v-model="dialog" width="500">
      <v-card>
        <v-card-title class="headline grey lighten-2" primary-title
          >プロフィールを編集</v-card-title
        >

        <v-card-text class="mt-5"
          >Lorem ipsum dolor sit amet, consectetur a</v-card-text
        >

        <v-card-actions>
          <v-btn @click="dialog = false">キャンセル</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary">更新</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialog4login" width="500">
      <v-card>
        <v-card-title class="headline grey lighten-2" primary-title>{{
          $t('login')
        }}</v-card-title>

        <v-card-text class="mt-5">
          ログインにはGoogle<!--またはTwitter-->アカウントが必要です。
          <div class="text-center mb-5">
            <v-btn class="error mt-5" @click="signInWithGoogle">
              <v-icon class="mr-2">mdi mdi-google</v-icon
              >{{ $t('login_with_google') }}
            </v-btn>
            <!--
            <v-btn class="info mt-5" @click="signInWithTwitter">
              <v-icon class="mr-2">mdi mdi-twitter</v-icon
              >Twitterアカウントでログイン
            </v-btn>
            -->
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-btn
      v-show="fab"
      v-scroll="onScroll"
      fab
      dark
      fixed
      bottom
      right
      large
      color="error"
      @click="toTop"
    >
      <v-icon>mdi-arrow-up</v-icon>
    </v-btn>
  </v-app>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'
import firebase from '../plugins/firebase'

@Component({
  components: {},
})
export default class search extends Vue {
  fab: boolean = false

  drawer: boolean = false
  baseUrl: string = process.env.BASE_URL || ''
  siteName: string = process.env.siteName || ''

  userName: any = null
  userPic: any = null
  dialog: boolean = false
  dialog4login: boolean = false

  get isSignedIn(): boolean {
    return this.$store.getters.getIsSignedIn
  }

  set isSignedIn(value) {
    this.$store.commit('setSignedIn', value)
  }

  created() {
    this.onAuthStateChanged()
  }

  onScroll(e: any): void {
    if (typeof window === 'undefined') return
    const top = window.pageYOffset || e.target.scrollTop || 0
    this.fab = top > 20
  }

  toTop(): void {
    // @ts-ignore
    this.$vuetify.goTo(0)
  }

  signInWithGoogle() {
    this.$store.dispatch('login')
    this.dialog4login = !this.dialog4login
  }

  onAuthStateChanged() {
    firebase.auth().onAuthStateChanged((user: any) => {
      this.userName = user ? user.displayName : null
      this.userPic = user ? user.photoURL : null
      this.isSignedIn = !!user
    })
  }

  async signOut() {
    await firebase.auth().signOut()
  }
}
</script>
<style>
.teiDate {
  background-color: #bbdefb;
}
.teiTime {
  background-color: #fff9c4;
}
.teiPersName {
  background-color: #ffccbc;
}
.teiPlaceName {
  background-color: #c8e6c9;
}
a {
  text-decoration: none;
}
</style>

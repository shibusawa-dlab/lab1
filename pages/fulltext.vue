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
    <v-container class="py-5">
      <h2 class="my-5">{{ $t('fulltext') }}</h2>
      <v-row>
        <v-col
          v-for="(obj, index) in result.members"
          :key="index"
          cols="12"
          :sm="3"
        >
          <v-card flat outlined no-body class="mb-4">
            <nuxt-link
              :to="
                localePath({
                  name: 'item-id',
                  params: { id: obj.id },
                })
              "
            >
              <div
                class="text-center grey lighten-2 pa-10"
                style="height: 150px; text-decoration: none"
              >
                <v-icon size="75">mdi-text</v-icon>
              </div>
            </nuxt-link>

            <div class="pa-4">
              <nuxt-link
                :to="
                  localePath({
                    name: 'item-id',
                    params: { id: obj.id },
                  })
                "
              >
                <h4>{{ obj.label }}</h4>
              </nuxt-link>

              <p v-if="false" class="mt-2 mb-0">
                {{ obj.description }}
                <img :src="baseUrl + '/img/icons/tei.png'" width="30px" />
                本文をすべて表示（読み込みに時間がかかります。）
              </p>
            </div>
            <v-divider />
            <v-card-actions>
              <v-btn
                class="mr-2"
                text
                :to="
                  localePath({
                    name: 'viewer-id',
                    params: { id: obj.viewer_id },
                  })
                "
              >
                <img :src="baseUrl + '/img/icons/tei.png'" width="30px" />
              </v-btn>
              <small>本文をすべて表示（読み込みに時間がかかります。）</small>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'

@Component({})
export default class about extends Vue {
  baseUrl: any = process.env.BASE_URL

  get bh(): any[] {
    return [
      {
        text: this.$t('top'),
        disabled: false,
        to: this.localePath({ name: 'index' }),
        exact: true,
      },
      {
        text: this.$t('fulltext'),
      },
    ]
  }

  result: any = {
    members: [
      {
        id: 'DKB10001m-1',
        viewer_id: 'DKB01',
        label: '渋沢栄一伝記資料. 別巻第1 日記 (慶応4年-大正3年)',
      },
      {
        id: 'DKB20001m-1',
        viewer_id: 'DKB02',
        label:
          '渋沢栄一伝記資料. 別巻第2 日記 (大正4年-昭和5年), 集会日時通知表',
      },
    ],
  }

  head() {
    const title = this.$t('fulltext')
    return {
      titleTemplate: null,
      title,
    }
  }
}
</script>

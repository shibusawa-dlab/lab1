<template>
  <div>
    <v-container class="pa-10">
      <v-row>
        <v-col
          v-for="(obj, index) in result.members"
          :key="index"
          cols="12"
          :sm="3"
        >
          <v-card flat no-body class="mb-4">
            <nuxt-link
              :to="
                localePath({
                  name: 'viewer-id',
                  params: { id: getId(obj['@id']) },
                })
              "
            >
              <div
                class="text-center grey lighten-2 pa-10"
                style="height: 150px; text-decoration: none"
              >
                <v-icon size="75">mdi-file</v-icon>
              </div>
            </nuxt-link>

            <div class="pa-4">
              <nuxt-link
                :to="
                  localePath({
                    name: 'viewer-id',
                    params: { id: getId(obj['@id']) },
                  })
                "
              >
                <h4>{{ obj.label }}</h4>
              </nuxt-link>

              <p v-if="obj.description" class="mt-2 mb-0">
                {{ obj.description }}
              </p>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'

@Component({})
export default class Metadata extends Vue {
  baseUrl: any = process.env.BASE_URL
  get result(): {} {
    return this.$store.getters.getResult
  }

  set result(value) {
    this.$store.commit('setResult', value)
  }

  getId(uri: string) {
    const es = uri.split('/')
    return es[es.length - 1].split('.')[0]
  }
}
</script>

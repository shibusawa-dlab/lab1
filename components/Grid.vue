<template>
  <v-row>
    <v-col v-for="(obj, index) in list" :key="index" cols="12" :sm="12 / col">
      <v-card flat no-body class="mb-4">
        <nuxt-link :to="localePath(obj.path)">
          <template v-if="obj.image && obj.image.includes('mdi-')">
            <div class="text-center grey lighten-2 pa-10" style="height: 150px">
              <v-icon size="75">{{ obj.image }}</v-icon>
            </div>
          </template>
          <template v-else>
            <v-img
              :src="obj.image"
              contain
              style="height: 150px"
              width="100%"
              class="grey lighten-2"
            ></v-img>
          </template>
        </nuxt-link>
        <div class="pa-4">
          <nuxt-link :to="localePath(obj.path)">
            <h4>{{ obj.label }}</h4>
          </nuxt-link>

          <p v-if="obj.description" class="mt-2 mb-0">{{ obj.description }}</p>
        </div>
        <template v-if="obj.url && false">
          <v-divider />

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-tooltip bottom>
              <template #activator="{ on }">
                <a target="_blank" :href="obj.url" v-on="on"
                  ><img width="30px" :src="baseUrl + '/img/icons/rdf-logo.svg'"
                /></a>
              </template>
              <span>{{ 'RDF' }}</span>
            </v-tooltip>
          </v-card-actions>
        </template>
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

@Component
export default class grid extends Vue {
  @Prop({ default: 4 })
  col!: number

  @Prop({ default: [] })
  list!: any[]

  baseUrl: string = process.env.BASE_URL || ''
}
</script>

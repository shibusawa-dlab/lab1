(window.webpackJsonp=window.webpackJsonp||[]).push([[4],{102:function(t,e,n){"use strict";var o=n(179);o.a.apps.length||o.a.initializeApp({apiKey:"AIzaSyBOOt8xvbTh5JAJ4kJxPD_6ohcyb0LfR7k",authDomain:"genji2022.firebaseapp.com",databaseURL:"https://genji2022.firebaseio.com",projectId:"genji2022",storageBucket:"genji2022.appspot.com",messagingSenderId:"52466352397",appId:"1:52466352397:web:cdc45cbe4b1ab3f96df044"}),e.a=o.a},185:function(t,e,n){"use strict";e.a={appId:"LA1L89ESU7",apiKey:"a8dc3bccca1af99f7a77ea55f7dd9f4d"}},228:function(t,e,n){"use strict";var o=n(2),r=n(468);o.default.use(r.a)},230:function(t,e,n){"use strict";n(68),n(32),n(63),n(52);var o=n(27),r=n(36),c=function(){function t(){Object(o.a)(this,t)}return Object(r.a)(t,[{key:"xml2html",value:function(data,t){return data?data=data.split("&lt;").join("<").split("&gt;").join(">").replace("<head",'<p class="teiHead"><b').replace("</head>","</b></p>").split("<lb/>").join("<br/>").split("<date").join('<span class="'.concat(t?"teiDate":"",'"')).split("</date>").join("</span>").split("<persName").join('<span class="'.concat(t?"teiPersName":"",'"')).split("</persName>").join("</span>").split("<place").join('<span class="'.concat(t?"teiPlaceName":"",'"')).split("</placeName>").join("</span>").split("<time").join('<span class="'.concat(t?"teiTime":"",'"')).split("</time>").join("</span>"):null}},{key:"removeHead",value:function(data){return data=data.replace('<p class="teiHead">','<p class="teiHead" style="display: none;">')}},{key:"formatArrayValue",value:function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:", ";if(null==t)return"";if(1===t.length)return t[0];var n=t.join(e);return n}}]),t}();e.a=function(t,e){e("utils",new c)}},231:function(t,e,n){"use strict";var o=n(2),r=n(306);o.default.use(r.a,{config:{id:"G-TPQRZ7Y0RK"}})},268:function(t,e,n){var content=n(350);"string"==typeof content&&(content=[[t.i,content,""]]),content.locals&&(t.exports=content.locals);(0,n(18).default)("50f9c72e",content,!0,{sourceMap:!1})},276:function(t,e,n){var content=n(371);"string"==typeof content&&(content=[[t.i,content,""]]),content.locals&&(t.exports=content.locals);(0,n(18).default)("56b15182",content,!0,{sourceMap:!1})},308:function(t,e,n){"use strict";n(310),n(48);var o=n(15),r=n(27),c=n(36),l=n(42),v=n(35),d=n(28),m=n(13),f=n(180),h=n(102);function _(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(t){return!1}}();return function(){var n,o=Object(d.a)(t);if(e){var r=Object(d.a)(this).constructor;n=Reflect.construct(o,arguments,r)}else n=o.apply(this,arguments);return Object(v.a)(this,n)}}var k=function(t,e,n,desc){var o,r=arguments.length,c=r<3?e:null===desc?desc=Object.getOwnPropertyDescriptor(e,n):desc;if("object"===("undefined"==typeof Reflect?"undefined":Object(m.a)(Reflect))&&"function"==typeof Reflect.decorate)c=Reflect.decorate(t,e,n,desc);else for(var i=t.length-1;i>=0;i--)(o=t[i])&&(c=(r<3?o(c):r>3?o(e,n,c):o(e,n))||c);return r>3&&c&&Object.defineProperty(e,n,c),c},y=function(t){Object(l.a)(v,t);var e,n=_(v);function v(){var t;return Object(r.a)(this,v),(t=n.apply(this,arguments)).fab=!1,t.drawer=!1,t.baseUrl="https://shibusawa-dlab.github.io/lab1",t.siteName="伝記資料TEI共同研究",t.github="https://github.com/shibusawa-dlab/lab1",t.userName=null,t.userPic=null,t.dialog=!1,t.dialog4login=!1,t}return Object(c.a)(v,[{key:"created",value:function(){this.onAuthStateChanged()}},{key:"onScroll",value:function(t){if("undefined"!=typeof window){var e=window.pageYOffset||t.target.scrollTop||0;this.fab=e>20}}},{key:"toTop",value:function(){this.$vuetify.goTo(0)}},{key:"signInWithGoogle",value:function(){this.$store.dispatch("login"),this.dialog4login=!this.dialog4login}},{key:"onAuthStateChanged",value:function(){var t=this;h.a.auth().onAuthStateChanged((function(e){t.userName=e?e.displayName:null,t.userPic=e?e.photoURL:null,t.isSignedIn=!!e}))}},{key:"signOut",value:(e=Object(o.a)(regeneratorRuntime.mark((function t(){return regeneratorRuntime.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,h.a.auth().signOut();case 2:case"end":return t.stop()}}),t)}))),function(){return e.apply(this,arguments)})},{key:"isSignedIn",get:function(){return this.$store.getters.getIsSignedIn},set:function(t){this.$store.commit("setSignedIn",t)}}]),v}(f.Vue),w=y=k([Object(f.Component)({components:{}})],y),j=(n(370),n(103)),x=n(142),N=n.n(x),P=n(505),I=n(512),O=n(506),C=n(219),V=n(236),S=n(220),U=n(92),A=n(513),T=n(507),L=n(508),$=n(218),E=n(221),R=n(133),D=n(222),M=n(96),F=n(509),H=n(472),B=n(511),G=n(510),J=n(238),z=n(301),K=n.n(z),W=n(171),component=Object(j.a)(w,(function(){var t=this,e=t.$createElement,n=t._self._c||e;return n("v-app",[n("div",[n("v-navigation-drawer",{attrs:{app:"",temporary:!0},model:{value:t.drawer,callback:function(e){t.drawer=e},expression:"drawer"}},[n("v-list",[n("v-list-item",{attrs:{link:"",to:t.localePath({name:"index"}),exact:""}},[n("v-list-item-action",[n("v-icon",[t._v("mdi-home")])],1),t._v(" "),n("v-list-item-content",[n("v-list-item-title",[t._v("Home")])],1)],1),t._v(" "),n("v-list-item",{attrs:{link:"",target:"_blank",href:"https://nakamura196.github.io/tei-js-pub/?u=https://shibusawa-dlab.github.io/lab1/data/collection.json"}},[n("v-list-item-action",[n("v-icon",[t._v("mdi-file")])],1),t._v(" "),n("v-list-item-content",[n("v-list-item-title",[t._v("TEI/XML "),n("v-icon",[t._v("mdi-open-in-new")])],1)],1)],1),t._v(" "),n("v-list-item",{attrs:{link:"",to:t.localePath({name:"search"})}},[n("v-list-item-action",[n("v-icon",[t._v("mdi-magnify")])],1),t._v(" "),n("v-list-item-content",[n("v-list-item-title",[t._v(t._s(t.$t("search")))])],1)],1),t._v(" "),n("v-list-item",{attrs:{link:"",to:t.localePath({name:"ad-id"})}},[n("v-list-item-action",[n("v-icon",[t._v("mdi-book-open")])],1),t._v(" "),n("v-list-item-content",[n("v-list-item-title",[t._v(t._s(t.$t("ad")))])],1)],1),t._v(" "),n("v-list-item",{attrs:{link:"",to:t.localePath({name:"legend"})}},[n("v-list-item-action",[n("v-icon",[t._v("mdi-information")])],1),t._v(" "),n("v-list-item-content",[n("v-list-item-title",[t._v(t._s(t.$t("legend")))])],1)],1),t._v(" "),n("v-list-item",{attrs:{link:"",to:t.localePath({name:"calendar"})}},[n("v-list-item-action",[n("v-icon",[t._v("mdi-calendar")])],1),t._v(" "),n("v-list-item-content",[n("v-list-item-title",[t._v(t._s(t.$t("calendar")))])],1)],1),t._v(" "),n("v-list-item",{attrs:{link:"",to:t.localePath({name:"entity-id",params:{id:"agential"}})}},[n("v-list-item-action",[n("v-icon",[t._v("mdi-account")])],1),t._v(" "),n("v-list-item-content",[n("v-list-item-title",[t._v(t._s(t.$t("entity")))])],1)],1),t._v(" "),n("v-list-item",{attrs:{link:"",to:t.localePath({name:"map"})}},[n("v-list-item-action",[n("v-icon",[t._v("mdi-map")])],1),t._v(" "),n("v-list-item-content",[n("v-list-item-title",[t._v(t._s(t.$t("map")))])],1)],1),t._v(" "),n("v-list-item",{attrs:{link:"",target:"_blank",href:"https://www.kanzaki.com/works/2016/pub/image-annotator?u=https://shibusawa-dlab.github.io/lab1/iiif/collection/top.json"}},[n("v-list-item-action",[n("v-icon",[t._v("mdi-image")])],1),t._v(" "),n("v-list-item-content",[n("v-list-item-title",[t._v("渋沢栄一日記リスト\n              "),n("v-icon",[t._v("mdi-open-in-new")])],1)],1)],1),t._v(" "),n("v-list-item",{attrs:{link:"",href:t.baseUrl+"/snorql",target:"_blank"}},[n("v-list-item-action",[n("v-icon",[t._v("mdi-database")])],1),t._v(" "),n("v-list-item-content",[n("v-list-item-title",[t._v(t._s(t.$t("snorql"))+"\n              "),n("v-icon",[t._v("mdi-open-in-new")])],1)],1)],1),t._v(" "),n("v-list-item",{attrs:{link:"",target:"_blank",href:"https://la1l89esu7-dsn.algolia.net/1/indexes/dev_MAIN/?X-Algolia-API-Key=a8dc3bccca1af99f7a77ea55f7dd9f4d&X-Algolia-Application-Id=LA1L89ESU7"}},[n("v-list-item-action",[n("v-icon",[t._v("mdi-api")])],1),t._v(" "),n("v-list-item-content",[n("v-list-item-title",[t._v("Searach API "),n("v-icon",[t._v("mdi-open-in-new")])],1)],1)],1)],1)],1),t._v(" "),n("v-app-bar",{attrs:{dark:""}},[n("v-app-bar-nav-icon",{on:{click:function(e){e.stopPropagation(),t.drawer=!t.drawer}}}),t._v(" "),n("v-toolbar-title",[n("nuxt-link",{staticStyle:{color:"inherit","text-decoration":"inherit"},attrs:{to:t.localePath({name:"index"})}},[t._v("\n          "+t._s(t.$t(t.siteName))+"\n        ")])],1),t._v(" "),n("v-spacer"),t._v(" "),n("v-menu",{attrs:{"offset-y":""},scopedSlots:t._u([{key:"activator",fn:function(e){var o=e.on;return[n("v-btn",t._g({attrs:{depressed:"",btn:""}},o),[n("v-icon",[t._v("mdi-translate")]),t._v(" "),"xs"!=t.$vuetify.breakpoint.name?[n("span",{staticClass:"ml-2"},[t._v(t._s("ja"==t.$i18n.locale?"日本語":"English"))]),t._v(" "),n("v-icon",{staticClass:"ml-2"},[t._v("mdi-menu-down")])]:t._e()],2)]}}])},[t._v(" "),n("v-list",[n("v-list-item",{attrs:{to:t.switchLocalePath("ja")}},[n("v-list-item-title",[t._v("日本語")])],1),t._v(" "),n("v-list-item",{attrs:{to:t.switchLocalePath("en")}},[n("v-list-item-title",[t._v("English")])],1)],1)],1),t._v(" "),t._e()],1)],1),t._v(" "),n("v-main",[n("nuxt")],1),t._v(" "),n("v-footer",{staticClass:"mt-5",attrs:{dark:!0}},[n("v-container",{staticClass:"text-center my-5"},[n("p",[n("nuxt-link",{staticStyle:{color:"white"},attrs:{to:t.localePath({name:"index"})}},[t._v(t._s(t.$t(t.siteName)))])],1),t._v(" "),n("p",[n("a",{attrs:{href:t.github}},[n("v-icon",[t._v("mdi-github")])],1)])])],1),t._v(" "),n("v-dialog",{attrs:{width:"500"},model:{value:t.dialog,callback:function(e){t.dialog=e},expression:"dialog"}},[n("v-card",[n("v-card-title",{staticClass:"headline grey lighten-2",attrs:{"primary-title":""}},[t._v("プロフィールを編集")]),t._v(" "),n("v-card-text",{staticClass:"mt-5"},[t._v("Lorem ipsum dolor sit amet, consectetur a")]),t._v(" "),n("v-card-actions",[n("v-btn",{on:{click:function(e){t.dialog=!1}}},[t._v("キャンセル")]),t._v(" "),n("v-spacer"),t._v(" "),n("v-btn",{attrs:{color:"primary"}},[t._v("更新")])],1)],1)],1),t._v(" "),n("v-dialog",{attrs:{width:"500"},model:{value:t.dialog4login,callback:function(e){t.dialog4login=e},expression:"dialog4login"}},[n("v-card",[n("v-card-title",{staticClass:"headline grey lighten-2",attrs:{"primary-title":""}},[t._v(t._s(t.$t("login")))]),t._v(" "),n("v-card-text",{staticClass:"mt-5"},[t._v("\n        ログインにはGoogle"),t._v("アカウントが必要です。\n        "),n("div",{staticClass:"text-center mb-5"},[n("v-btn",{staticClass:"error mt-5",on:{click:t.signInWithGoogle}},[n("v-icon",{staticClass:"mr-2"},[t._v("mdi mdi-google")]),t._v(t._s(t.$t("login_with_google"))+"\n          ")],1)],1)])],1)],1),t._v(" "),n("v-btn",{directives:[{name:"show",rawName:"v-show",value:t.fab,expression:"fab"},{name:"scroll",rawName:"v-scroll",value:t.onScroll,expression:"onScroll"}],attrs:{fab:"",dark:"",fixed:"",bottom:"",right:"",large:"",color:"error"},on:{click:t.toTop}},[n("v-icon",[t._v("mdi-arrow-up")])],1)],1)}),[],!1,null,null,null);e.a=component.exports;N()(component,{VApp:P.a,VAppBar:I.a,VAppBarNavIcon:O.a,VAvatar:C.a,VBtn:V.a,VCard:S.a,VCardActions:U.a,VCardText:U.b,VCardTitle:U.c,VContainer:A.a,VDialog:T.a,VFooter:L.a,VIcon:$.a,VList:E.a,VListItem:R.a,VListItemAction:D.a,VListItemContent:M.a,VListItemTitle:M.b,VMain:F.a,VMenu:H.a,VNavigationDrawer:B.a,VSpacer:G.a,VToolbarTitle:J.a}),K()(component,{Scroll:W.b})},325:function(t,e,n){n(326),t.exports=n(327)},349:function(t,e,n){"use strict";n(268)},350:function(t,e,n){(e=n(17)(!1)).push([t.i,"h1[data-v-63e85905]{font-size:20px}",""]),t.exports=e},370:function(t,e,n){"use strict";n(276)},371:function(t,e,n){(e=n(17)(!1)).push([t.i,".teiDate{background-color:#bbdefb}.teiTime{background-color:#fff9c4}.teiPersName{background-color:#ffccbc}.teiPlaceName{background-color:#c8e6c9}a{text-decoration:none}tbody tr:nth-of-type(odd){background-color:rgba(0,0,0,.05)}",""]),t.exports=e},429:function(t,e,n){"use strict";n.r(e),n.d(e,"state",(function(){return l})),n.d(e,"mutations",(function(){return v})),n.d(e,"actions",(function(){return d})),n.d(e,"getters",(function(){return m}));n(60),n(22),n(67),n(70);var o=n(102),r=o.a.firestore(),c=r.collection("todos"),l=function(){return{userUid:"",userName:"",userPic:"",todos:[],numbers:[],isSignedIn:!1}},v={setUserUid:function(t,e){t.userUid=e},setUserName:function(t,e){t.userName=e},addTodo:function(t,e){t.todos.push(e)},addNumber:function(t,e){t.numbers.push(e)},clearTodo:function(t){t.todos=[]},setSignedIn:function(t,e){t.isSignedIn=e},setUserPic:function(t,e){t.userPic=e}},d={login:function(t){var e=t.commit,n=new o.a.auth.GoogleAuthProvider;o.a.auth().signInWithPopup(n).then((function(t){var n=t.user;e("setUserUid",n.uid),e("setUserName",n.displayName),e("setUserPic",n.photoURL)})).catch((function(t){var e=t.code;console.log("error : "+e)}))},fetchTodos:function(t){var e=t.commit;c.get().then((function(t){t.forEach((function(t){e("addTodo",t.data())}))})).catch((function(t){console.log("error : "+t)}))},addTodo:function(t,e){var n=t.commit;c.add({todo:e.todo,limit:e.limit}).then((function(t){n("addTodo",e)})).catch((function(t){console.error("Error adding document: ",t)}))},addNumber:function(t,e){var n=t.commit;r.collection(e.parent).doc(e.id).set({values:e.values}).then((function(t){n("addNumber",e)})).catch((function(t){console.error("Error adding document: ",t)}))}},m={getUserUid:function(t){return t.userUid},getUserName:function(t){return t.userName},getTodos:function(t){return t.todos},getIsSignedIn:function(t){return t.isSignedIn},getUserPic:function(t){return t.userPic}}},434:function(t,e,n){var map={"./en":[318,1],"./en.json":[318,1],"./ja":[319,2],"./ja.json":[319,2]};function o(t){if(!n.o(map,t))return Promise.resolve().then((function(){var e=new Error("Cannot find module '"+t+"'");throw e.code="MODULE_NOT_FOUND",e}));var e=map[t],o=e[0];return n.e(e[1]).then((function(){return n.t(o,3)}))}o.keys=function(){return Object.keys(map)},o.id=434,t.exports=o},454:function(t,e,n){var map={"./ja":213,"./ja.js":213};function o(t){var e=r(t);return n(e)}function r(t){if(!n.o(map,t)){var e=new Error("Cannot find module '"+t+"'");throw e.code="MODULE_NOT_FOUND",e}return map[t]}o.keys=function(){return Object.keys(map)},o.resolve=r,t.exports=o,o.id=454},89:function(t,e,n){"use strict";var o={layout:"empty",props:{error:{type:Object,default:null}},data:function(){return{pageNotFound:"404 Not Found",otherError:"An error occurred"}},head:function(){return{title:404===this.error.statusCode?this.pageNotFound:this.otherError}}},r=(n(349),n(103)),c=n(142),l=n.n(c),v=n(505),d=n(513),component=Object(r.a)(o,(function(){var t=this,e=t.$createElement,n=t._self._c||e;return n("v-app",{attrs:{dark:""}},[n("v-container",{staticClass:"my-10"},[404===t.error.statusCode?n("h1",[t._v("\n      "+t._s(t.pageNotFound)+"\n    ")]):n("h1",[t._v("\n      "+t._s(t.otherError)+"\n    ")]),t._v(" "),n("NuxtLink",{attrs:{to:"/"}},[t._v(" Home page ")])],1)],1)}),[],!1,null,"63e85905",null);e.a=component.exports;l()(component,{VApp:v.a,VContainer:d.a})}},[[325,17,5,18]]]);
(window.webpackJsonp=window.webpackJsonp||[]).push([[6],{516:function(t,e,r){"use strict";r.r(e);r(310);var n=r(27),o=r(36),c=r(42),l=r(35),f=r(28),d=r(13),h=r(181),v=r(519);function m(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(t){return!1}}();return function(){var r,n=Object(f.a)(t);if(e){var o=Object(f.a)(this).constructor;r=Reflect.construct(n,arguments,o)}else r=n.apply(this,arguments);return Object(l.a)(this,r)}}var _=function(t,e,r,desc){var n,o=arguments.length,c=o<3?e:null===desc?desc=Object.getOwnPropertyDescriptor(e,r):desc;if("object"===("undefined"==typeof Reflect?"undefined":Object(d.a)(Reflect))&&"function"==typeof Reflect.decorate)c=Reflect.decorate(t,e,r,desc);else for(var i=t.length-1;i>=0;i--)(n=t[i])&&(c=(o<3?n(c):o>3?n(e,r,c):n(e,r))||c);return o>3&&c&&Object.defineProperty(e,r,c),c},y=function(t){Object(c.a)(r,t);var e=m(r);function r(){return Object(n.a)(this,r),e.apply(this,arguments)}return Object(o.a)(r,[{key:"title",get:function(){return this.item.label}},{key:"url",get:function(){return this.item.url}}]),r}(h.Vue);_([Object(h.Prop)()],y.prototype,"item",void 0);var w=y=_([Object(h.Component)({components:{ShareButtons:v.default}})],y),O=r(103),j=r(142),k=r.n(j),R=r(236),x=r(218),C=r(472),component=Object(O.a)(w,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("span",[r("v-menu",{attrs:{top:"","offset-y":""},scopedSlots:t._u([{key:"activator",fn:function(e){var n=e.on;return[r("v-btn",t._g({attrs:{depressed:"",icon:""}},n),[r("v-icon",[t._v("mdi-share-variant")])],1)]}}])},[t._v(" "),r("ShareButtons",{attrs:{url:t.url,title:t.title}})],1)],1)}),[],!1,null,null,null);e.default=component.exports;k()(component,{ShareButtons:r(519).default}),k()(component,{VBtn:R.a,VIcon:x.a,VMenu:C.a})},519:function(t,e,r){"use strict";r.r(e);r(310);var n=r(27),o=r(36),c=r(42),l=r(35),f=r(28),d=r(13),h=r(181);function v(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(t){return!1}}();return function(){var r,n=Object(f.a)(t);if(e){var o=Object(f.a)(this).constructor;r=Reflect.construct(n,arguments,o)}else r=n.apply(this,arguments);return Object(l.a)(this,r)}}var m=function(t,e,r,desc){var n,o=arguments.length,c=o<3?e:null===desc?desc=Object.getOwnPropertyDescriptor(e,r):desc;if("object"===("undefined"==typeof Reflect?"undefined":Object(d.a)(Reflect))&&"function"==typeof Reflect.decorate)c=Reflect.decorate(t,e,r,desc);else for(var i=t.length-1;i>=0;i--)(n=t[i])&&(c=(o<3?n(c):o>3?n(e,r,c):n(e,r))||c);return o>3&&c&&Object.defineProperty(e,r,c),c},_=function(t){Object(c.a)(r,t);var e=v(r);function r(){var t;return Object(n.a)(this,r),(t=e.apply(this,arguments)).baseUrl="https://shibusawa-dlab.github.io/lab1",t}return Object(o.a)(r,[{key:"twitterUrl",get:function(){return"https://twitter.com/intent/tweet?url="+this.url+"&text="+this.title}},{key:"facebookUrl",get:function(){return"https://www.facebook.com/sharer/sharer.php?u="+this.url}},{key:"pocketUrl",get:function(){return"http://getpocket.com/edit?url="+this.url}}]),r}(h.Vue);m([Object(h.Prop)({required:!0})],_.prototype,"url",void 0),m([Object(h.Prop)({required:!0})],_.prototype,"title",void 0);var y=_=m([h.Component],_),w=r(103),O=r(142),j=r.n(O),k=r(236),R=r(220),x=r(218),C=r(545),component=Object(w.a)(y,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("v-card",{attrs:{flat:""}},[r("v-tooltip",{attrs:{bottom:""},scopedSlots:t._u([{key:"activator",fn:function(e){var n=e.on;return[r("v-btn",t._g({staticClass:"ma-2",attrs:{icon:"",target:"_blank",href:t.twitterUrl}},n),[r("v-icon",[t._v("mdi-twitter")])],1)]}}])},[t._v(" "),r("span",[t._v(t._s("Twitter"))])]),t._v(" "),r("v-tooltip",{attrs:{bottom:""},scopedSlots:t._u([{key:"activator",fn:function(e){var n=e.on;return[r("v-btn",t._g({staticClass:"ma-2",attrs:{icon:"",target:"_blank",href:t.facebookUrl}},n),[r("v-icon",[t._v("mdi-facebook")])],1)]}}])},[t._v(" "),r("span",[t._v(t._s("Facebook"))])]),t._v(" "),r("v-tooltip",{attrs:{bottom:""},scopedSlots:t._u([{key:"activator",fn:function(e){var n=e.on;return[r("v-btn",t._g({staticClass:"ma-2",attrs:{icon:"",target:"_blank",href:t.pocketUrl}},n),[r("img",{staticStyle:{"font-size":"24px"},attrs:{src:t.baseUrl+"/img/icons/pocket.svg"}})])]}}])},[t._v(" "),r("span",[t._v(t._s("Pocket"))])])],1)}),[],!1,null,null,null);e.default=component.exports;j()(component,{VBtn:k.a,VCard:R.a,VIcon:x.a,VTooltip:C.a})},550:function(t,e,r){"use strict";r.r(e);r(310);var n=r(27),o=r(42),c=r(35),l=r(28),f=r(13),d=r(313);function h(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(t){return!1}}();return function(){var r,n=Object(l.a)(t);if(e){var o=Object(l.a)(this).constructor;r=Reflect.construct(n,arguments,o)}else r=n.apply(this,arguments);return Object(c.a)(this,r)}}var v=function(t,e,r,desc){var n,o=arguments.length,c=o<3?e:null===desc?desc=Object.getOwnPropertyDescriptor(e,r):desc;if("object"===("undefined"==typeof Reflect?"undefined":Object(f.a)(Reflect))&&"function"==typeof Reflect.decorate)c=Reflect.decorate(t,e,r,desc);else for(var i=t.length-1;i>=0;i--)(n=t[i])&&(c=(o<3?n(c):o>3?n(e,r,c):n(e,r))||c);return o>3&&c&&Object.defineProperty(e,r,c),c},m=function(t){Object(o.a)(r,t);var e=h(r);function r(){var t;return Object(n.a)(this,r),(t=e.apply(this,arguments)).baseUrl="https://shibusawa-dlab.github.io/lab1",t}return r}(d.Vue);v([Object(d.Prop)({default:4})],m.prototype,"col",void 0),v([Object(d.Prop)({default:[]})],m.prototype,"list",void 0);var _=m=v([d.Component],m),y=r(103),w=r(142),O=r.n(w),j=r(220),k=r(92),R=r(534),x=r(530),C=r(218),P=r(177),V=r(535),S=r(510),$=r(545),component=Object(y.a)(_,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("v-row",t._l(t.list,(function(e,n){return r("v-col",{key:n,attrs:{cols:"12",sm:12/t.col}},[r("v-card",{staticClass:"mb-4",attrs:{flat:"","no-body":""}},[r("nuxt-link",{attrs:{to:t.localePath(e.path)}},[e.image&&e.image.includes("mdi-")?[r("div",{staticClass:"text-center grey lighten-2 pa-10",staticStyle:{height:"150px"}},[r("v-icon",{attrs:{size:"75"}},[t._v(t._s(e.image))])],1)]:[r("v-img",{staticClass:"grey lighten-2",staticStyle:{height:"150px"},attrs:{src:e.image,contain:"",width:"100%"}})]],2),t._v(" "),r("div",{staticClass:"pa-4"},[r("nuxt-link",{attrs:{to:t.localePath(e.path)}},[r("h4",[t._v(t._s(e.label))])]),t._v(" "),e.description?r("p",{staticClass:"mt-2 mb-0"},[t._v(t._s(e.description))]):t._e()],1),t._v(" "),(e.url,t._e())],2)],1)})),1)}),[],!1,null,null,null);e.default=component.exports;O()(component,{VCard:j.a,VCardActions:k.a,VCol:R.a,VDivider:x.a,VIcon:C.a,VImg:P.a,VRow:V.a,VSpacer:S.a,VTooltip:$.a})},614:function(t,e,r){"use strict";r.r(e);r(47),r(310),r(32),r(233),r(51),r(52);var n=r(16),o=r(27),c=r(36),l=r(42),f=r(35),d=r(28),h=r(13),v=r(181),m=r(120),_=r.n(m);function y(t){var e=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(t){return!1}}();return function(){var r,n=Object(d.a)(t);if(e){var o=Object(d.a)(this).constructor;r=Reflect.construct(n,arguments,o)}else r=n.apply(this,arguments);return Object(f.a)(this,r)}}var w=function(t,e,r,desc){var n,o=arguments.length,c=o<3?e:null===desc?desc=Object.getOwnPropertyDescriptor(e,r):desc;if("object"===("undefined"==typeof Reflect?"undefined":Object(h.a)(Reflect))&&"function"==typeof Reflect.decorate)c=Reflect.decorate(t,e,r,desc);else for(var i=t.length-1;i>=0;i--)(n=t[i])&&(c=(o<3?n(c):o>3?n(e,r,c):n(e,r))||c);return o>3&&c&&Object.defineProperty(e,r,c),c},O=function(t){Object(l.a)(f,t);var e,r=y(f);function f(){var t;return Object(o.a)(this,f),(t=r.apply(this,arguments)).baseUrl="https://shibusawa-dlab.github.io/lab1",t.viewer="https://nakamura196.github.io/tei-js-pub",t.key="TOP",t.item={},t.children=[],t.map={},t}return Object(c.a)(f,[{key:"watchTmp",value:function(){this.search()}},{key:"mounted",value:function(){this.search()}},{key:"search",value:(e=Object(n.a)(regeneratorRuntime.mark((function t(){var e,r,n,o,c,map,i,l,f,source,d,h,v,m,y,w,O,j;return regeneratorRuntime.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return e=this.$route.params.id||"top",r="https://shibusawa-dlab.github.io/lab1/api/items/"+e,t.next=5,_.a.get("https://shibusawa-dlab.github.io/lab1/data/ad.json");case 5:for(n=t.sent,o=n.data,c={},map={},i=0;i<o.length;i++)l=o[i],f={id:l["@id"],slug:l["@id"].split("/items/")[1],label:l["http://www.w3.org/2000/01/rdf-schema#label"][0]["@value"]},map[l["@id"]]=f,l["https://shibusawa-dlab.github.io/lab1/api/properties/xml"]&&(f.xml=l["https://shibusawa-dlab.github.io/lab1/api/properties/xml"][0]["@value"]),l["http://schema.org/sourceData"]&&(source=l["http://schema.org/sourceData"][0]["@id"],f.source=source),l["http://schema.org/relatedLink"]&&(d=l["http://schema.org/relatedLink"][0]["@value"],f.related=d),l["http://schema.org/isPartOf"]&&(h=l["http://schema.org/isPartOf"][0]["@id"],f.parent=h,f.parent_slug=h.split("/items/")[1],c[h]||(c[h]=[]),c[h].push(f.id)),l["http://schema.org/provider"]&&(f.provider1=l["http://schema.org/provider"][0]["@value"]),l["https://shibusawa-dlab.github.io/lab1/api/properties/provider"]&&(f.provider2=l["https://shibusawa-dlab.github.io/lab1/api/properties/provider"][0]["@value"]),l["http://schema.org/url"]&&(v=l["http://schema.org/url"][0]["@id"],f.url=v,f.manifest=l["http://schema.org/associatedMedia"][0]["@id"]),l["https://shibusawa-dlab.github.io/lab1/api/properties/contributor"]&&(f.contributor=l["https://shibusawa-dlab.github.io/lab1/api/properties/contributor"][0]["@value"]);if(this.item=map[r],this.map=map,m=[],c[r])for(y=c[r],w=0;w<y.length;w++)O=y.sort()[w],j=map[O],m.push({label:j.label,image:"mdi-book-open",path:{name:"ad-id",params:{id:j.slug}}});this.children=m;case 15:case"end":return t.stop()}}),t,this)}))),function(){return e.apply(this,arguments)})},{key:"head",value:function(){return{title:this.$t("category")+" : "+this.title,meta:[{hid:"description",name:"description",content:this.$t("search_by_category")}]}}},{key:"title",get:function(){return this.item.label}},{key:"uri",get:function(){return this.item.id}},{key:"url",get:function(){return this.baseUrl+this.$route.fullPath}},{key:"bh",get:function(){var title=this.title,t={text:this.$t("top"),disabled:!1,to:this.localePath({name:"index"})};return this.$route.params.id?[t,{text:this.$t("ad"),disabled:!1,to:this.localePath({name:"ad-id"}),exact:!0},{text:title}]:[t,{text:this.$t("ad")}]}}]),f}(v.Vue);w([Object(v.Watch)("$route",{deep:!0})],O.prototype,"watchTmp",null);var j=O=w([Object(v.Component)({})],O),k=r(103),R=r(142),x=r.n(R),C=r(528),P=r(236),V=r(513),S=r(218),$=r(177),D=r(57),U=r(541),T=r(545),component=Object(k.a)(j,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[r("v-sheet",{attrs:{color:"grey lighten-2"}},[r("v-container",{staticClass:"py-4",attrs:{fluid:""}},[r("v-breadcrumbs",{staticClass:"py-0",attrs:{items:t.bh},scopedSlots:t._u([{key:"divider",fn:function(){return[r("v-icon",[t._v("mdi-chevron-right")])]},proxy:!0}])})],1)],1),t._v(" "),r("v-container",[r("h1",{staticClass:"mt-10"},[t._v(t._s(t.title))]),t._v(" "),r("div",{staticClass:"text-center my-10"},[t.item.source?r("v-tooltip",{attrs:{bottom:""},scopedSlots:t._u([{key:"activator",fn:function(e){var n=e.on;return[r("v-btn",t._g({staticClass:"mr-5",attrs:{href:t.viewer+"/light/?u="+t.item.source+"&id="+t.item.slug,icon:"",target:"_blank"}},n),[r("v-img",{attrs:{contain:"",width:"30px",src:t.baseUrl+"/img/icons/tei.png"}})],1)]}}],null,!1,964227314)},[t._v(" "),r("span",[t._v("TEI")])]):t._e(),t._v(" "),r("v-tooltip",{attrs:{bottom:""},scopedSlots:t._u([{key:"activator",fn:function(e){var n=e.on;return[r("v-btn",t._g({staticClass:"mr-5",attrs:{href:t.baseUrl+"/snorql?describe="+t.uri,icon:""}},n),[r("v-img",{attrs:{contain:"",width:"30px",src:t.baseUrl+"/img/icons/rdf-logo.svg"}})],1)]}}])},[t._v(" "),r("span",[t._v("RDF")])]),t._v(" "),r("ResultOption",{attrs:{item:{url:t.url,label:t.title}}})],1),t._v(" "),t.item.parent?r("v-simple-table",{staticClass:"my-10",scopedSlots:t._u([{key:"default",fn:function(){return[r("tbody",[r("tr",[r("td",{attrs:{width:"30%"}},[t._v(t._s(t.$t("parent")))]),t._v(" "),r("td",{staticClass:"py-5",staticStyle:{"overflow-wrap":"break-word"}},[r("nuxt-link",{attrs:{to:t.localePath({name:"ad-id",params:{id:t.item.parent_slug}})}},[t._v("\n                "+t._s(t.map[t.item.parent].label)+"\n              ")])],1)]),t._v(" "),t.item.related?r("tr",[r("td",{attrs:{width:"30%"}},[t._v(t._s(t.$t("items")))]),t._v(" "),r("td",{staticClass:"py-5",staticStyle:{"overflow-wrap":"break-word"}},[r("a",{attrs:{href:t.item.related}},[r("v-icon",[t._v("mdi-magnify")]),t._v("\n                "+t._s(t.$t("search"))+"\n              ")],1)])]):t._e(),t._v(" "),r("tr",[r("td",{attrs:{width:"30%"}},[t._v(t._s(t.$t("description")))]),t._v(" "),r("td",{staticClass:"py-5",staticStyle:{"overflow-wrap":"break-word"}},[r("span",{domProps:{innerHTML:t._s(t.$utils.xml2html(t.item.xml))}})])]),t._v(" "),t.item.provider1?r("tr",[r("td",{attrs:{width:"30%"}},[t._v("\n              "+t._s(t.$t("所蔵（伝記資料別巻第1発行1965年時）"))+"\n            ")]),t._v(" "),r("td",{staticClass:"py-5"},[t._v("\n              "+t._s(t.item.provider1)+"\n            ")])]):t._e(),t._v(" "),t.item.provider2?r("tr",[r("td",{attrs:{width:"30%"}},[t._v(t._s(t.$t("所蔵（2020年現在）")))]),t._v(" "),r("td",{staticClass:"py-5"},[t._v("\n              "+t._s(t.item.provider2)+"\n            ")])]):t._e(),t._v(" "),t.item.url?r("tr",[r("td",{attrs:{width:"30%"}},[t._v(t._s(t.$t("画像公開URL")))]),t._v(" "),r("td",{staticClass:"py-5",staticStyle:{"overflow-wrap":"break-word"}},[r("a",{attrs:{href:t.item.url}},[t._v("\n                "+t._s(t.item.url)+"\n              ")])])]):t._e(),t._v(" "),t.item.contributor?r("tr",[r("td",{attrs:{width:"30%"}},[t._v(t._s(t.$t("画像公開機関")))]),t._v(" "),r("td",{staticClass:"py-5"},[t._v("\n              "+t._s(t.item.contributor)+"\n            ")])]):t._e()])]},proxy:!0}],null,!1,3879423023)}):t._e(),t._v(" "),t.item.url?r("iframe",{staticClass:"mt-5",attrs:{allowfullscreen:"allowfullscreen",frameborder:"0",height:"600px",src:"https://da.dl.itc.u-tokyo.ac.jp/mirador/?manifest="+t.item.manifest,width:"100%"}}):t._e(),t._v(" "),r("grid",{staticClass:"mt-10",attrs:{col:4,list:t.children}}),t._v(" "),t._e()],1)],1)}),[],!1,null,null,null);e.default=component.exports;x()(component,{ResultOption:r(516).default,Grid:r(550).default}),x()(component,{VBreadcrumbs:C.a,VBtn:P.a,VContainer:V.a,VIcon:S.a,VImg:$.a,VSheet:D.a,VSimpleTable:U.a,VTooltip:T.a})}}]);
//Snorql plugin
var Snorqldef, SPARQL, L, CMEditor;

/** JavaScript port plus of Linked Data Browser (masaka)
 * created 2018-12-08
 * modified 2020-08-14
 * @param {Object} snorql	calling object, i.e. instance of Snorql class
 * @param {String} target_uri	URI of the described resource (value of describe)
 * @param {String} is_home_uri	flag to indicate the uri to describe is a resource in this triple store
 */
var JsonRDFFormatter = function(snorql, target_uri, is_home_uri){
	this.snorql = snorql;
	this.ns = snorql._namespaces;
	this.endpoint = snorql._endpoint;
	this.uris ={
		tgrsrc: target_uri || "",	//target resource URI for SPARQL describe
		img: [],	//could be multiple
		thumb: null,
		proced: []	//URIs already processed to format a table
	};
	this.has_target_resource = undefined;	//make sure result has target URI resource
	this.is_home_uri = is_home_uri;	//whether the target is home resource's uri of this endpoint
	this.sq_formatter = new SPARQLResultFormatter(null, this.ns, snorql);	//reuse _formatNode
	this.rdfjson = null;	//RDF/JSON (Talis) = object {uri1 : {p1: [o1, o2...], p2: ...}, uri2: ...}
	this.title = null;
	this.thmub_tb = null,	//tbody that contains thumbnail info
	this.rdftype = "";	//local name of rdf:type of the current object
	this.category = "";	//local name of schema:category of the current object, if any
	this.exserv = null;
	this.relpath = snorql.homedef ? (snorql.homedef.relpath || "") : "";
	this.langidx = Util.ulang === "ja" ? 0 : 1;
	this.ndc = {prop: set_uri(["schema", "about"])};
	for(var i=0; i<10; i++) this.ndc[i] = [];
	this.saved = {};	//hold anything that could be referred later
	this.dlink_props = [];	//props to treat value as direct link
	this.media_types = {};	//register rdf:type of schema:url and schema:associatedMedia
	this.xplabeluri = "urn:x-proplabels",	//extra label property uri (pseudo uri for construct) 2020-06-25
	this.xplabels = null;	//holds xplabeluri resources if later query returns values for the uri

	if(Snorqldef.ldb){
		var ldbdef = Snorqldef.ldb;
		this.props ={
			"label": set_uri(ldbdef.label_prop),	//this.ns.rdfs + "label";
			"img": set_uri(ldbdef.img_prop),
			"thumb": set_uri(ldbdef.thumb_prop)
		};
		["url", "relatedLink", "image", "associatedMedia", "thumbnail"].forEach(function(ln){
			this.dlink_props.push(this.ns.schema + ln);
		}, this);
		this.dlink_props.push(this.ns.jps + "sourceData");
		this.dlink_props.push(this.ns.rdfs + "seeAlso");
		this.geo = {
			prop: {
				geo: set_uri(ldbdef.geo.prop),
				strct: set_uri(ldbdef.geo.strctprop),
				region : set_uri(ldbdef.geo.regionprop),
				val : set_uri(ldbdef.geo.valprop),
				loc: set_uri(ldbdef.geo.locprop),
				lat: this.ns.schema + "latitude",
				long: this.ns.schema + "longitude",
				cover: this.ns.schema + "geoCoveredBy",
				within: this.ns.jps + "within"
			},
			cover_obj: {},
			//covering_obj: null,
			//count: 0,
			procd_subj: [],
			candcount: 0,
			cand_subj: [],
			cand: {
				ap: [], //access provider
				cs: [],	//content/creator specific
				es: [],	//entity (GLAM) specific
				pr: [], //publication with region
				cj: [],	//content/creator simply Japan (or America)
				gl: [] //generic location
			},
			pseudop: {lat: "lat of coveredBy", long: "long of coveredBy"} //{lat: "(latitude)", long: "(longitude)"},
			//hashv: {}	//lat/long of geohash of coveredby
		};
		this.acsinfo = {
			pprop: set_uri(["jps", "accessInfo"]),
			prvprop: set_uri(["schema", "provider"]),
			provider: []
		};
		this.exserv = Util.misc.rset(Snorqldef.ldb.texternal, 32);
		this.use_iiif_viewer = ldbdef.use_iiif_viewer;
		Util.iiif.viewer = this.exserv + Util.iiif.viewer;
		this.link_sfx = ldbdef.link_sfx;	//suffix mapping for external links
		//propety based class attribute
		this.propclass = ldbdef.propclass || {};
		//preferred order of properties
		if(ldbdef.proporder){
			var actions = {showup: "unshift", showdown: "push"};
			this.proporder = {};
			for(var type in actions){
				this.proporder[actions[type]] = [];
				ldbdef.proporder[type].forEach(function(map){
					this.proporder[actions[type]].push(set_uri(map));
				}, this);
			}
		}
		this.showrows = ldbdef.showrows || 4;
	}else{
		this.props = {};
		this.geo = {prop: null, strctprop: null, valprop: null};
		this.link_sfx = null;
		this.propclass = {};
		this.acsinfo = {};
		this.showrows = 4;
	}
	//end if Snorqldef.ldb
	this.pdesc = Snorqldef.prop_description || {};
	if(this.link_sfx) this.link_sfx.forEach(function(def){
		def.len = def.ns.length;
	});
	this.relmatch_pat = new RegExp("^" + this.ns.skos + "(exact|close|related)Match$");	//@@expects skos ns def
	//uri pattern to external query handler mapping to use in askex.proc
	this.qh = new GnrQueryHandler(this);
	this.addex = new AddExtraInfo(this);
	this.askex = new AskExternal(this);
	//uri pattern regexp to determine direct link in set_object_tdval

	function set_uri(nslocal){
		return (snorql._namespaces[nslocal[0]] || "") + nslocal[1];
	}
};
JsonRDFFormatter.prototype = {
	//@@ basic process
    /** display results using RDF/JSON (Talis)
     * @param {Object} json	SPARQL results in JSON format
     * @param {String} heading	heading in the result display section
     * @param {String} qtype	query type
     */
    display_result: function(json, heading, qtype){
		var that = this,
    	is_error = false,
		div = Util.dom.element("div"),
		h2 = Util.dom.element("h2");
		h2.appendChild(Util.dom.text(heading));
		div.appendChild(h2);
    	if(qtype === "DESCRIBE") this.addex.test_external_link(h2);
    	this.div_descr = div;
		//error handling
		if(!json){
			this.__msg(div, "[query error: no response]", "p");
			is_error = true;
		}else if(json.status && json.status === "error"){
			this.snorql.__msg(div, "ajax error: " + json.response , "pre");
			is_error = true;
		}else if(json.head && json.head.status === "error"){
			this.snorql.__msg(div, "query error: " + json.head.msg , "pre");
			is_error = true;
		}else if (json.results.bindings.length === 0) {
			this.snorql.__msg(div, "[no results for " + qtype + "]", "p");
			if(qtype === "DESCRIBE"){
				this.askex.proc(div);
				var msgarea = Util.dom.element("p");
				div.appendChild(msgarea);
				this.addex.osp(div, msgarea);
			}
			is_error = qtype;
		}
		if(is_error){
			this.snorql._display(div, "result");
			return;
		}else if(this.is_home_uri){
			//get labels for objects of the resource and merge
			this.addex.labels(this.uris.tgrsrc, json.results).then(proc_json);
		}else{
			//if not, simply proc the results set
			proc_json();
		}
		
		function proc_json(){
			div.appendChild(that.proc(json));
			that.snorql._display(div, "result");
			if(that.geo.candcount){//that.geo.count === 0 && 
				//to fetch geo. See one_object() in format_one_prop for direct geo properties
				var cand = find_best_geo();
				//if(cand) cand.otd.appendChild(that.addex.geo_table(cand.val, cand.lprop, true, cand.subj));
				if(cand) that.addex.geo_table(cand.otd,cand.val, cand.lprop, true, cand.subj);
				that.geo.candcount--;
			};
			if(that.addex.primimg_plus(div)) div.classList.add("with_pimg"); //h2.classList.add("with_pimg");
			else if(that.rdftype === "和歌" || that.category === "和歌") Util.waka.show(that, div);
			//title search for item (excluding dictionary entities) 2020-03-28
			if(that.rdftype && !that.rdftype.match(/^\w/)) that.addex.title_more_search(that.rdftype);
			Util.set_title(that, qtype);
			//2020-04-04, 2020-04-19
			that.askex.proc(div);
			//2019-02-11
			that.addex.set_osp_btn(div);
		}
		function find_best_geo(){
			//if no direct geo value found and has spatial value
			var cands = {val:[], lprop: [], otd: null}, seglen, csubj;
			for(var segment in that.geo.cand) if((seglen = that.geo.cand[segment].length)){
				var cseg = that.geo.cand[segment];
				if(segment === "ap"){
					//generate map for access provider immediately to leave cands for spatial nodes
					//cseg[0].otd.appendChild(that.addex.geo_table([cseg[0].value], [cseg[0].locprop], true));
					that.addex.geo_table(cseg[0].otd, [cseg[0].value], [cseg[0].locprop], true);
					that.geo.candcount--;
					continue;
				}else for(var i=0; i<seglen; i++){
					if(that.geo.procd_subj.includes(cseg[i].subj)) continue;
					if(cands.val.length === 0){
						//first priority
						cands.val.push(cseg[i].value);
						cands.lprop.push(cseg[i].locprop);
						cands.otd = cseg[i].otd;
						csubj = cseg[i].subj;
					}else if(cseg[i].subj === csubj){
						//add one more cand if same subj node
						cands.val.push(cseg[i].value);
						cands.lprop.push(cseg[i].locprop);
						return cands;
					}
				}
			}
			if(cands.val.length) return cands;
			//console.log("unkown segment in geo cand", that.geo.cand);
			return null;
		}
	},
	/**
	 * processes the results set
	 * @param {Object} json	SPARQL results in JSON format
	 * @return {DOMNode}	div element node that has the description table
	 */
	proc: function(json){
		this.rdfjson = this.toRDFJson(json);
		return this.format();
	},
	/**
	* converts SPARQL result JSON to RDF/JSON (Talis)
	 * @param {Object} json	SPARQL results in JSON format
	 * @return {Object}	RDF/JSON (Talis)
	 */
	toRDFJson: function(json){
		var res = {};
		json.results.bindings.forEach(function(binding){
			var sv = binding.s.value,
			pv = binding.p.value;
			o = binding.o;
			if(o.type === "uri" && o.value.substr(0, 2) === "_:") o.type = "bnode";
			if(!res[sv]) res[sv] = {};
			if(!res[sv][pv]) res[sv][pv] = [];
			res[sv][pv].push(o);
		});
		return res;
	},
	/**
	 * generates description table from RDF/JSON
	 * @return {DOMNode}	div element node that has the description table
	 */
	format: function(){
		var div = Util.dom.element("div");
		uris = Object.keys(this.rdfjson);
		//if(this.uris.tgrsrc) uris = this.reorder_item(uris, this.uris.tgrsrc, "unshift");
		if(this.uris.tgrsrc){
			if(this.uris.tgrsrc.match(/^(.+)#(access|source)info$/) && this.rdfjson[RegExp.$1]){
				this.uris.tgrsrc = RegExp.$1;
			}
			if(this.rdfjson[this.uris.tgrsrc] && !this.has_target_resource){
				this.reorder_item(uris, this.uris.tgrsrc, "unshift");
				uris = [this.uris.tgrsrc];	//only target uri should be processed as the top table 2020-03-02
				this.has_target_resource = true;
			}
		}
		//xplabeluri is special uri to represent prop labels and to be constructed by query e.g. ask_wikidata
		if(this.rdfjson[this.xplabeluri]) this.xplabels = this.rdfjson[this.xplabeluri];	//2020-06-25
		uris.forEach(function(uri){
			if(uri === this.xplabeluri) return;	//xplabeluri resources are handled at set_object_tval()
			var tbl = this.format_one_uri(uri);
			if(tbl) div.appendChild(tbl);
			//test
			if(uri.match(new RegExp("^http://purl.org/net/ns/ext/nt#kbgj-(\\d+)-(\\d+)$"))){
				this.uris.img.push("https://kunishitei.bunka.go.jp/bsys/photo/" + RegExp.$1 + "_P"
				+ (RegExp.$2 < 150 ? (RegExp.$2 + "000000000") : ("00000000" + RegExp.$2).slice(-8))
				+ "01.jpg");
			}
		}, this);
		return div;
	},
	/**
	 * format a table for one URI
	 * @param {String} uri	subject URI of the resource to process
	 * @param {String} pprop	parent property URI of the current resource (undefined if top level)
	 * @param {String} ppqname	QName of the parent property (undefined if top level)
	 * @param {DOMNode} table	table element to setup prop-vals for this uri. only provided from add_later_table
	 * @return {DOMNode}	table element node that describes one resource
	 */
	format_one_uri: function(uri, pprop, ppqname, table){
		//console.log(uri, pprop, table);
		//if(this.uris.proced.indexOf(uri) !== -1) return null;
		if(this.uris.proced.indexOf(uri) !== -1){
			return Util.dom.element("span", this.sq_formatter._toQName(uri));
		}
		var po = this.rdfjson[uri];	//property:object of this URI
		if(!po) return null;	//in case reques uri has extension and rdf not
		//console.log(uri, pprop);
		if(!table){
			table = Util.dom.element("table");
			this.set_table_caption(table, uri, pprop);
			this.uris.proced.push(uri);	//avoid re-format for nested URI
		}
		var col = [Util.dom.element("col"), Util.dom.element("col")],
		//po = this.rdfjson[uri],	//property:object of this URI
		pa = {	//parent objects
			"prop": pprop,
			"table": table,
			"pdescr": pprop ? (this.pdesc[ppqname + "_g"] || {}) : this.pdesc
		},
		ttype = "";	//rdftype of the item described in this table
		table.classList.add("describe");
		col[0].className = "term";
		col.forEach(function(c){table.appendChild(c);});
		var geopo, coverpo;
		if((coverpo = po[this.geo.prop.cover]) && (geopo = po[this.geo.prop.geo])){
			//coverprop should be evalueted here because geo and nested props will be processed first in forEach
			this.geo.cover_obj[geopo[0].value] = coverpo;
		}
		//for each property of subject URI
		this.order_props(po).forEach(function(p){
			if(p === this.ns.rdf + "rest") return;
			else if(p === this.ns.rdf + "first") table.appendChild(this.proc_rdf_list(po));
			else{
				var tbody = this.format_one_prop(po, {"prop": p, "subj": uri}, pa);
				table.appendChild(tbody);
				if(!ttype) ttype = tbody.getAttribute("data-type") || ""; //null;
			}
		}, this);
		add_microdata(this);
		return table;
		
		//test to add microdata
		function add_microdata(that){
			//find appropriate itemtype for microdata
			var itemid, schematype;
			if(pprop){
				//disabled in favor of flat microdata structure
				schematype = ttype.match(/^[A-Z]/) ? ttype : "";
			}else{
				itemid = uri;
				schematype = that.rdftype.match(/^[A-Z]/) ? that.rdftype : "CreativeWork";
				table.setAttribute("itemid", itemid);
			}
			if(schematype){
				table.setAttribute("itemscope", "");
				table.setAttribute("itemtype", "http://schema.org/" + schematype);
				if(schematype === "Place") table.setAttribute("itemprop", "location");
			}
		}
	},
	//add a table caption only for non describe and non bnode
	set_table_caption: function(table, uri, pprop){
		if(!uri.match(/^_:/)){
			var caption = Util.dom.element("caption");
			//caption.appendChild(Util.dom.text(Util.str.trim(uri, 128, [60, 40])));
			//prepare caption only if the uri is not the target resource (which has own h2)
			//though if it is nested (has parent prop) it is assumed to be auth/entity in NDLA call
			if(uri !== this.uris.tgrsrc || pprop) caption.innerText = Util.str.trim(uri, 128, [60, 40]);
			table.appendChild(caption);
		}
	},
	/**
	 * process one property (multiple object values)
	 * @param {Object} po	property-object set of current resource
	 * @param {Object} sp	{subj: subject URI of this property, prop: property to process}
	 * @param {Object} pa	parent objects {prop: parent property URI of the current resource (null if top level), 
	 	table: ancestor table to append result tbody (to check has_map etc.)}
	 * @return {DOMNode}	tbody element node that group up description of this property
	 */
	format_one_prop: function(po, sp, pa){
		if(!po[sp.prop]) console.log(sp.subj, sp.prop, po);
		var objs = po[sp.prop].sort(
			function(a, b){return (a.value < b.value) ? -1 : 1;}	//order by objs[i].value
		),	//RDF objects array of this property-object set
		tbody = Util.dom.element("tbody"),
		params = {
			numobj: objs.length,	//object count of this array
			pclass: null,	//HTML class attr for this property
			pqname: this.sq_formatter._toQName(sp.prop)	//QName of the property
		};
		//HTML tbody element to group up rows for this property
		//hilite agential, temporal, spatial
		if((params.pclass = this.propclass[params.pqname])){
			tbody.className = params.pclass + " ats";	//agential, temporal, spatial
			if(params.pclass === "type"){
				find_rdftype(objs[0].value, this);
				//test to add microdata
				if(pa.prop) tbody.setAttribute("data-type", this.rdftype);
			}
		}else if(sp.prop === this.props.label){
			this.title = objs[0].value;
			tbody.className = "label";
		}else if(sp.prop === this.props.img){
			//register all images
			objs.forEach(function(o){this.uris.img.push(o.value);}, this);
		}else if(sp.prop === this.props.thumb){
			//use only the first thumbnail if multiple present
			this.uris.thumb = objs[0].value;
			this.thmub_tb = tbody;
			tbody.className = "thumb";
		}else if(sp.prop === this.geo.prop.cover || sp.prop === this.geo.prop.within){
			//this.geo.covering_obj = objs;
			this.geo.cover_obj[sp.subj] = objs;
		}
		if(sp.subj === objs[0].value && this.uris.proced.indexOf(sp.subj) !== -1){
			//loop error in nested uri (which was already formatted)
			console.warn("same subj, obj", sp.subj, "for", sp.prop);
			return tbody;
		}
		pa.ancestor_table = pa.table.parentNode ? pa.table.parentNode.closest("table") : null;
		//processes each object of this property
		objs.forEach(function(myobj, i){
			sp.obj = myobj;	//add obj to sp so that proc_one_object can use it as spo
			var ovtd = this.proc_one_object(i, po, sp, pa, tbody, params);
		}, this);
		if(tbody.toggler) tbody.toggler.click();
		return tbody;
		
		function find_rdftype(val, that){
			if(!that.rdftype){
				//if(Snorqldef) val = val.replace(new RegExp("^" + Snorqldef.home.uri + "term/type/"), "");
				//that.rdftype = val;
				//var m = val.match(/[\/#]([^\/#]+)$/);
				//that.rdftype = m[1];
				that.rdftype = Util.uri.split(val, true);
			}
		}
	},
	/**
	 * process one object value. separated from format_one_prop 2020-05-27
	 * @param {Integer} i	object position
	 * @param {Object} po	property-object set of current resource
	 * @param {Object} spo	{subj: subject URI of this property, prop: property to process, obj: current target object}
	 * @param {Object} pa	parent objects {prop: parent property URI of the current resource (null if top level), 
	 	table: ancestor table to append result tbody (to check has_map etc.),
	 	ancestor_table: closest parent of pa.table or null}
	 * @param {DOMNode}	tbody element node for current property
	 * @param {Object} params	some values from format_one_prop
	 */
	proc_one_object: function(i, po, spo, pa, tbody, params){
		var row = Util.dom.element("tr"),	//HTML tr element to include this one prop-obj pair
		optd = Util.dom.element("td"),	//object property td = HTML td element for property
		myoval = spo.obj.value;	//value of current one object
		//property cell (td)
		if(i === 0){
			//property cell is generated only for the first value
			var pv = spo.prop.match(/^http/) ? this.sq_formatter._formatURI({"value": spo.prop}, "p", 1, false) :
				Util.dom.element("span", spo.prop),	//pseudo prop for coveredBy lat/long
			pdescr = pa.pdescr[params.pqname];
			pv.firstChild.addEventListener("click", function(ev){
				//Control + click is defined at snorql.js to show URI (prompt)
				if(ev.getModifierState("Shift")) location.href = "?describe=" + encodeURIComponent(this.getAttribute("title"));
			});
			optd.appendChild(pv);
			if(params.numobj > 1){
				optd.setAttribute("rowspan", params.numobj);
				//test to add row toggler 2019-04-28
				if(params.numobj > this.showrows + 1) tbody.toggler = this.add_toggler(optd, params.numobj);
			}
			if(pdescr) optd.title = pdescr[this.langidx];
			if(this.xplabels && this.xplabels[spo.prop]){
				//add a label to propety: ask_wikidata() results for now 2020-06-25
				optd.appendChild(this.set_wrapper_content(this.xplabels[spo.prop][0].value));
			}
		}else{
			//no show, but need for CSS :nth-child
			optd.className = "repeated";
		}
		row.appendChild(optd);
		
		//value cell (td)
		var ovtd = Util.dom.element("td"),	//object value td = HTML td element for property value
		ovtd_val = this.set_object_tdval(spo.obj, spo.prop, spo.subj, params.pqname, tbody);
		if(ovtd_val && ovtd_val.parent_has_map){
			pa.table.has_map = true;	//signal from map not yet on DOM tree
		}else if(tbody.has_map){
			pa.table.parent_has_map = true;	//one more step further
		}
	
		//add microdata 2020-02-13
		if(params.pqname) set_microdata_prop(ovtd);
		if(ovtd_val){
			//odtv could be an array, eg a geohash URI and a map table
			if(ovtd_val instanceof Array) ovtd_val.forEach(function(ov){ovtd.appendChild(ov);});
			else ovtd.appendChild(ovtd_val);
			row.appendChild(ovtd);
			tbody.appendChild(row);
		}
		//property test (mostly geo related, but also license description). note property is also tested in set_object_tdval()
		this.more_on_property(i, po, spo, pa, ovtd, myoval);
		//return ovtd;
		
		//setup refined microdata 2020-02-26
		function set_microdata_prop(otd){
			var pqm, mdprop;	//prop qname match, microdata prop
			if(!(pqm = params.pqname.match(/^(schema|jps):(.+)/))) return;
			if(pqm[1] === "schema"){
				mdprop = pqm[2] === "relatedLink" ? "url" : pqm[2];
				if(pqm[2] === "latitude") tbody.setAttribute("data-type", "Place");
			}else if(pqm[1] === "jps"){
				mdprop = pqm[2].match(/^(agenti|spati|tempor)al/) ? "disambiguatingDescription" : "";
			}
			if(mdprop){
				otd.setAttribute("itemprop", mdprop);
				if(mdprop === "provider"){
					otd.setAttribute("itemscope", "");
					otd.setAttribute("itemtype", "http://schema.org/Organization");
				}
			}
		}
		
	},

	/**
	 * setup the td element of the object, according to its type or property
	 * @param {Object} obj	one RDF object to process
	 * @param {String} prop	property URI of this object
	 * @param {String} subj	subject URI of this object
	 * @param {String} pqname	QName of the property
	 * @param {DOMNode} tbody	ancestor tbody element
	 * @return {DOMNode|Array}	(array of) DOM node to be the content of the td element for this object
	 */
	set_object_tdval: function(obj, prop, subj, pqname, tbody){
		var stype;
		if(obj.type === "literal" || obj.type === "typed-literal"){
			var span = this.sq_formatter._formatNode(obj, "o");
			if(obj.value.length > 1000) span.classList.add("scl");
			if(pqname === "schema:description") Util.hilite(span);
			return span;
		}else if(this.rdfjson[obj.value]){
			//URI that is also a subject in this graph
			if(!this.is_home_uri) return this.format_one_uri(obj.value, prop, pqname) ;
			
			//special for home resource
			var po = this.rdfjson[obj.value],	//Resources of this URI
			keys = Object.keys(po),
			span;
			//if object is a label fetched by add_labels()
			//if(keys.length === 1 && keys[0] === this.ns.rdfs + "label") return this.set_label_wrapper(obj, po, keys);
			//else return this.format_one_uri(obj.value, prop, pqname);
			if(keys.length === 1 && keys[0] === this.ns.rdfs + "label"){
				span = this.set_label_wrapper(obj, po, keys);
				//not to further process when more proc e.g. ask_wikidata 2020-06-25
				if(this.is_home_uri === "more_proc") this.uris.proced.push(obj.value);
			}else{
				span = this.format_one_uri(obj.value, prop, pqname);
			}
			if(obj.value.match(/http:\/\/(ja\.)?dbpedia\.org\/resource\/(.*)/) && this.is_home_uri !== "more_proc")
				this.addex.wikipedia_link(span, RegExp.$1, RegExp.$2);
			return span;
		}else if(prop === this.geo.prop.geo){
			//this.geo.count++;
			tbody.has_map = true;
			return [
				this.sq_formatter._formatURI(obj, "o", 2),	//render actual geo prop value as normal URI
				this.addex.gen_geo_table(obj.value)	//then add further lat/long etc and a map
			];
		}else{
			//external URI
			var sfxoption;
			if(this.link_sfx) this.link_sfx.forEach(function(def){
				//eg. add geohash parameter
				if(obj.value.substr(0, def.len) === def.ns){
					sfxoption = def.sfx;
					return;
				}
			});
			var is_dlink = (this.dlink_props.includes(prop) && !obj.value.match(this.askex.map_pat) ),
			span = this.sq_formatter._formatURI(obj, "o", 2, sfxoption, is_dlink);
			//add more info for IIIF etc
			if(obj.value.match(/\/(manifest.?(\.json)?|info\.json)$/) && this.use_iiif_viewer){
				//this.addex.iiif_link(span, obj.value, subj);	//subj as canvas??
				this.addex.iiif_link(span, obj.value);
			}else if(obj.value === "http://iiif.io/api/presentation/2#Manifest" && prop === (this.ns.rdf + "type")){
				this.addex.iiif_link(span, subj);
			}else if((prop === this.ns.schema + "isPartOf") &&
				(stype = this.rdfjson[subj][this.ns.rdf + "type"]) &&
				stype[0].value === "http://iiif.io/api/presentation/2#Canvas"
			){
				this.addex.iiif_link(span, obj.value, subj);
			}else if(obj.value.match(/\/canvas\/.*/)){
				this.addex.test_iiif(span, obj.value);
				
				
			}else if(prop === this.ns.schema + "url" || prop === this.ns.schema + "associatedMedia"){
				//add type info for a media url, and schema:url val which not handled by askex.proc
				this.addex.test_url_type(span, obj.value);
			/*
			}else if((prop === this.ns.owl + "sameAs" || prop.match(this.relmatch_pat))
				&& obj.value.match(/http:\/\/(ja\.)?dbpedia\.org\/resource\/(.*)/)){
				this.addex.wikipedia_link(span, RegExp.$1, RegExp.$2);
			*/
			}else if(prop === this.ndc.prop && obj.value.match(/ndc\d?[#\/]((\d)[\d\.]+)/)){
				//NDC
				this.ndc[RegExp.$2].push(RegExp.$1);
				
			}else if(obj.value.match(/http:\/\/(ja\.)?dbpedia\.org\/resource\/(.*)/)){
				//wikipadia (dbpedia)
				this.addex.wikipedia_link(span, RegExp.$1, RegExp.$2);
			}
			return span;
		}
	},
	/**
	 * add more info besed on current/parent property (mostly geo related, but also license description)
	 * property is tested at ancestor format_one_prop once for a property. this method is activated for each property value
	 * @param {Integer} i	object position
	 * @param {Object} po	property-object set of current resource
	 * @param {Object} spo	{subj: subject URI of this property, prop: property to process, obj: current target object}
	 * @param {Object} pa	parent objects {prop: parent property URI of the current resource (null if top level), 
	 	table: ancestor table to append result tbody (to check has_map etc.),
	 	ancestor_table: closest parent of pa.table or null}
	 * @param {Object} ovtd	object value td = HTML td element for property value
	 * @param {Object} myoval	value of current one object
	 */
	more_on_property: function(i, po, spo, pa, ovtd, myoval){
		var geo_tested = false;
		switch(spo.prop){
		case this.ns.schema + "latitude":
			if(pa.ancestor_table && pa.ancestor_table.has_map) break;
			//if there is a geocoordinate --> direct geo or fetched result.
			//See proc_json() in display_result for fetched geo
			var coverobj = this.geo.cover_obj[spo.subj] || po[this.geo.prop.cover] || po[this.geo.prop.within] || null,
			hash = coverobj ? Util.uri.split(coverobj[0].value, true) : null,
			msubj = spo.subj.match(/geohash\.org\/(.+)$/);
			//hash length is the precision of the wihin region = one level heigher than the place
			//if not region geo, or precision is better than prefecture level
			this.geo.procd_subj.push(spo.subj);
			//show a map
			Util.map.setup(ovtd, myoval, po, this.ns, this.rdftype, hash, msubj ? msubj[1] : null);
			//to avoid redundant map in one spatial table
			if(pa.ancestor_table) pa.ancestor_table.has_map = true;
			else pa.table.parent_has_map = true;	//pa.table not yet attached to the DOM tree
			geo_tested = true;
			break;
			
		case this.geo.prop.cover:
			if(!po[this.geo.pseudop.lat] || pa.table.has_map) break;
			//gerCoveredBy of indirect ref to location
			var hashm = myoval.match(/geohash\.org\/(.+)$/),
			pseudopo = {lat: po[this.geo.pseudop.lat], long: po[this.geo.pseudop.long]};
			Util.map.setup(ovtd, null, pseudopo, this.ns, this.rdftype, hashm[1]);
			pa.table.has_map = true;
			geo_tested = true;
			break;
			
		case this.geo.prop.loc:
			//if geolocation node itself
			//this.prep_geo_cand(ovtd, po, obj.value, prop, subj, true);
			this.prep_geo_cand(ovtd, po, spo.subj, {"prop": spo.prop, "subj":null}, true);
			geo_tested = true;
			break;
			
		case this.acsinfo.prvprop:
			if(pa.prop !== this.acsinfo.pprop) break;
			//access provider
			this.prep_geo_cand(ovtd, po, myoval, spo, true);
			this.acsinfo.provider.push(myoval);
			break;
			
		case this.ns.schema + "abstract":
			if(!this.askex.rstypes.includes(this.rdftype)) break;
			//excerpts of abstract for licese description
			ovtd.appendChild(Util.dom.element("a", "(read full on the original page)", [["href", spo.subj]]));
			break;
			
		case this.ns.schema + "license":
			this.addex.if_indiv_policy(ovtd, myoval);
			break;
			
		case this.ns.schema + "category":
			this.category = Util.uri.split(spo.obj.value, true);
			break;
		}
		if(!geo_tested && pa.prop === this.geo.prop.strct && i===0){
			//if a spatial node (i.e. parent prop == jps:spatial) found, save info for possible map disp
			if(spo.prop === this.geo.prop.region) this.prep_geo_cand(ovtd, po, myoval, spo, false);
			else if(spo.prop === this.geo.prop.val) this.prep_geo_cand(ovtd, po, myoval, spo, false);
			else if(spo.prop === this.snorql._namespaces.rdfs + "seeAlso") this.prep_geo_cand(ovtd, po, myoval, spo, true);
		}
	},
	/**
	 * proc RDF List as flat table (not nested ones) A:called from format_one_uri or B:nested call 2019-04-29
	 * @param {Object} po	property object list of the current node of the list
	 * @param {DOMNode} tbody	tbody to append tr for this list node | undefined if A
	 * @param {Integer} pos	position in the list (1 base) | undefined if A
	 * @param {String} bnid	bnode ID of the list node | undefined if A
	 * @return {DOMNode}	tbody element with each list node as tr/td if A
	 */
	proc_rdf_list: function(po, tbody, pos, bnid){
		if(!tbody){
			//case A
			tbody = Util.dom.element("tbody");
			pos = 1;
		}else{
			//case B
			this.uris.proced.push(bnid);	//avoid re-format for nested URI
		}
		var tr = Util.dom.element("tr"),
		tdnum = Util.dom.element("td", "(" + pos + ")"),
		tdval = Util.dom.element("td"),
		first = po[this.ns.rdf + "first"],
		rest = po[this.ns.rdf + "rest"];
		tdnum.className = "rdflist";
		if(!first || first.length === 0){
			//there must be only one rdf:first
			console.warn("ill-formed RDF List, no rdf:first in list node", pos, po);
			tdval.innerText = "(no rdf:first in list node)";
		}else{
			tdval.appendChild(this.set_object_tdval(first[0], this.ns.rdf + "first", bnid));
		}
		tr.appendChild(tdnum);
		tr.appendChild(tdval);
		tbody.appendChild(tr);
		if(first.length > 1){
			console.warn("ill-formed RDF List, more than one rdf:first", pos, po);
		}
		if(!rest || rest.length === 0){
			console.warn("ill-formed RDF List, no rdf:rest in list node", pos, po);
			return;
		}else if(rest[0].value === this.ns.rdf + "nil"){
			//normal end of the list
			return pos === 1 ? tbody : null;	//2020-06-29 added tbody
		}else if(rest.length > 1){
			console.warn("ill-formed RDF List, more than one rdf:rest", pos, po);
		}
		//nest process the next node
		this.proc_rdf_list(this.rdfjson[rest[0].value], tbody, pos + 1, rest[0].value);
		if(pos === 1) return tbody;
	},
	//setup a wrapper element for the post fetched label
	set_label_wrapper: function(obj, po, keys){
		var wrapper = Util.dom.element("span"),	//wrap the object desc and its label
		link = this.sq_formatter._formatURI(obj, "o", 2),
		label = this.set_wrapper_content(po[keys[0]][0].value); //Util.dom.element("span");
		wrapper.appendChild(link);
		wrapper.appendChild(label);
		return wrapper;
	},
	//set wrapper sub span element. also be used to show type of a resource (url)
	set_wrapper_content: function(val){
		var label = Util.dom.element("span");
		label.appendChild(Util.dom.text(" (" + val + ")"));
		label.className = "subtext";
		return label;
	},
	/**
	 * change display order of properties
	 * @param {Object} po	JSON object of RDF prop-object set
	 * return {Array}	list of property in the order of processing
	 */
	order_props: function(po){
		var props = Object.keys(po).sort();
		if(this.proporder) for(var action in this.proporder){
			this.proporder[action].forEach(function(p){
				props = this.reorder_item(props, p, action);
			}, this);
		}
		return props;
	},
	/**
	 * re-order an array item
	 * @param {Array} items	array to re-order
	 * @param {String} element	the element of the array to move
	 * @param {String} action	unshift (move the key to first position) or pop (to the last position)
	 * @return {Array}	re-ordered array
	 */
	reorder_item: function(items, element, action){
		var pos;
		if((pos = items.indexOf(element)) !==-1){
			var trimed = items.splice(pos, 1);
			items[action](trimed[0]);
		}
		return items;
	},
	/**
	 * save spatial relation for later map disp
	 * @param {Object} otd	<td> element of the structured node
	 * @param {Array} po	property-obect set of the structured node
	 * @param {String} val	object value of geo property
	 * @param {Object} spo	{subj: subject URI/bNode Id of the node, prop: property of geo value}
	 * @param {Boolean} need_loc_prop	whether schema:location prop needed before schema:gen
	 */
	prep_geo_cand: function(otd, po, val, spo, need_loc_prop){
		if(this.geo.cand_subj.includes(spo.subj)) return;
		this.geo.cand_subj.push(spo.subj);
		var regionp = this.ns.jps + "region",
		regionv = po[regionp] ? po[regionp][0].value : null,
		within = po[this.ns.jps + "within"] || po[this.ns.schema + "geoCoveredBy"] || null,
		relp = this.ns.jps + "relationType",
		relv = po[relp] ? po[relp][0].value : "",
		cand = {
			"prop": regionv ? regionp : spo.prop,	//geo property
			"value": regionv || val,	//geo prop value
			"subj": spo.subj,	//subject of the prop (the node), or null if called from schema:location
			"rel": relv,	//relationType of the node
			"otd": otd,	//<td> of the node
			"locprop": need_loc_prop ? this.geo.prop.loc : null	//schema:location
		};
		//try to use better precision
		if(within && spo.prop !== this.ns.jps + "region") cand.hash = Util.uri.split(within[0].value, true);
		//prioritize creation place
		//if(po[this.ns.jps + "region"]) this.geo.has_region = has_region = true;
		var segment;
		if(relv.match(/\/(制作|内容|採集)/)){
			segment = (val === this.ns.place + "日本" || val === this.ns.place + "アメリカ") ? "cj" : "cs";
		}else if(spo.prop === this.ns.rdfs + "seeAlso"){
			segment = "es";
		}else if(spo.prop === this.ns.jps + "region"){
			segment = "pr";
		}else if(spo.prop === this.ns.schema + "provider"){
			segment = "ap";
		}else{
			segment = "gl";
		}
		//order by precision
		if(cand.hash && cand.hash.length >= 5) this.geo.cand[segment].unshift(cand);
		else this.geo.cand[segment].push(cand);
		this.geo.candcount++;
		//if(po[this.ns.jps + "relationType"]) this.geo.has_region = true;
	},

	//in case resulting json has different name for SPO
	wdToRDFJson: function(json){
		var res = {};
		json.results.bindings.forEach(function(binding){
			var sv = binding.subject.value,
			pv = binding.predicate.value;
			o = binding.object;
			if(o.type === "uri"){
				if(o.value.substr(0, 2) === "_:") o.type = "bnode";
				//Wikidata does URL-encode for JSP chnames
				if(o.value.match(/^https:\/\/jpsearch/)) o.value = decodeURIComponent(o.value);
			}
			if(!res[sv]) res[sv] = {};
			if(!res[sv][pv]) res[sv][pv] = [];
			res[sv][pv].push(o);
		});
		return res;
	},
	///@@ misc util
	/**
	 * 2019-04-28 expand/collapse multi rows of one property
	 * @param {Object} ptd	td element for property
	 * @param {Integer} nrows	number of rows for property values
	 */
	add_toggler: function(ptd, nrows){
		var that = this,
		delta = nrows - this.showrows,
		toggler = Util.dom.element("span", "hide " + delta + " in " + nrows);
		toggler.className = "toggler";
		toggler.addEventListener("click", function(ev){
			that.toggle_rows(ev.target, nrows);
		}, false);
		ptd.appendChild(toggler);
		return toggler;
	},
	toggle_rows: function(o, nrows){
		var hidden,
		ptd = o.parentNode,
		tr = ptd.parentNode,
		delta = nrows - this.showrows,
		rpos = 1;
		if(o.innerText.match(/^…show/)){
			hidden = true;
			o.innerText = "hide " + delta + " in " + nrows;
			ptd.setAttribute("rowspan", nrows);
		}else{
			hidden = false;
			o.innerText = "…show all " + nrows;
			ptd.setAttribute("rowspan", this.showrows);
		}
		while((tr = tr.nextSibling)){
			if(!tr.tagName || tr.tagName.toLowerCase() !== "tr") continue;
			if(rpos++ < this.showrows) continue;
			if(hidden){
				tr.style.display='table-row';
			}else{
				tr.style.display='none';
			}
		}
	},
	//setup sequential navigation (not used)
	set_seq_nav: function(div, seq_uri){
		if(seq_uri[0]) div.appendChild(newlink(seq_uri[0], "←"));
		if(seq_uri[1]) div.appendChild(newlink(seq_uri[1], "→"));
		function newlink(uri, text){
			var anc = Util.dom.element("a", text);
			anc.setAttribute("href", "?describe=" + uri);
			return anc;
		};
	}
};

/** add extra info ascynchronously */
var AddExtraInfo = function(app){
	this.app = app;
	this.snorql = app.snorql;
	this.sq_formatter = app.sq_formatter;
	this.uris = app.uris;
	this.langidx = app.langidx;
	this.ns = app.ns;
	this.geo = app.geo;
	this.qh = app.qh;
};
AddExtraInfo.prototype = {
	//@@ /// additional information process
	//add one image (thumbnail) to the div element, plus ISBN info
	primimg_plus: function(div){
		var url, m, isbn, ilen;
		if((ilen = this.uris.img.length)){
			//if associatedMedia found
			var that = this, useimg, thumb = this.uris.thumb;
			//select low resolution image in case multi images are available (dubbed with thumb as met, cleveland)2020-05-26
			if(Object.keys(this.app.media_types).length === 0){
				var sid = setInterval(function(){
					//console.log(that.app.media_types);
					if(Object.keys(that.app.media_types).length >= ilen){
						select_one_image(that.uris.img);;
						clearInterval(sid);
					}
				}, 200);
			}
			//if multiple cands (associatedMedias of different resolution)
			else select_one_image(this.uris.img);
			return true;
			
		}else if(this.uris.thumb){
			//thumbnail uri found
			this.prim_image_url(div, null, this.uris.thumb);
			return true;
			
		}else if((url = this.license_budge(this.uris.tgrsrc, "l"))){
			//test of cc logo for license description
			this.prim_image_url(div, null, url);
			return true;
			
		}else if(this.app.has_target_resource &&
			(isbn = this.app.rdfjson[this.uris.tgrsrc][this.ns.schema + "isbn"])
		){
			//a book
			this.img_plus_from_isbn(div, isbn[0].value);
			return true;
		//}else if(this.rdftype === "図書"){this.prim_image(div, {no_onerror:true}, Util.img.gen_icon("book")); return true;
		}else return false;
		
		///local function to select the image to display. uses local vars
		function select_one_image(imguris){
			var candimg = [];
			for(var i=0; i<ilen; i++){
				var mtype = that.app.media_types[imguris[i]];
				if(mtype && !mtype.match(/(image|(jpe?g|png|gif|svg)$)/i)) continue;
				else if(mtype === null || imguris[i] === thumb){
					useimg = imguris[i];
					//console.log(useimg, mtype);
					break;
				}else candimg.push(imguris[i]);
			}
			if(!useimg){
				if(candimg[0]) useimg = candimg[0];
				else if(thumb) useimg = thumb;
				else return false;
			}
			if(useimg === thumb) thumb = null;
			that.prim_image_url(div, null, useimg, thumb);
		}
	},
	//generates an image element and insert as the first child
	prim_image_url: function(div, option, url, recover_url){
		var imgelt = Util.dom.element("img");
		if(!option) option = {w:100, recover:recover_url};
		imgelt.src = url;
		imgelt.className = "primimage";
		//in case if the url (associatedMedia) is a video etc, use thumbnail
		if(option.no_onerror){
			imgelt.title = "no image info in RDF";
			imgelt.classList.add("still");
		}else{
			Util.img.on_event(imgelt, option);
			if(option.title) imgelt.title = option.title;
			if(this.app.thmub_tb) this.img_search(this.app.thmub_tb.firstChild.firstChild);
		}
		div.insertBefore(imgelt, div.firstChild);
		return imgelt;
	},
	//try to get book cover image from ISBN, then add image elt if success. Also add bookinfo from the data
	img_plus_from_isbn: function(div, isbn){
		var that = this;
		Util.xhr.get("https://api.openbd.jp/v1/get?isbn=" + isbn, function(res){
			if(!res || !res[0]) return no_isbn_img(false);
			that.app.saved.openbd = res[0];
			var url = res[0].summary.cover;
			that.bookinfo_from_isbn(res[0].onix, res[0].hanmoto);
			if(!url) return no_isbn_img(true);	//, res[0].summary
			that.prim_image_url(div, {which:"book", title:"Obtained via openBD API (not a part of RDF)"}, url);
		});
		function no_isbn_img(show_icon){
			if(!show_icon) div.classList.remove("with_pimg");
			else that.prim_image_url(div, {no_onerror:true}, Util.img.gen_icon("book"));
			return false;
		}
	},
	//reuse ONIX/hanmoto data from openbd
	bookinfo_from_isbn: function(onix, hanmoto){
		if(!onix && !hanmoto) return;
		if(onix.DescriptiveDetail && onix.DescriptiveDetail.Audience){
			var rating = 0;
			onix.DescriptiveDetail.Audience.forEach(function(ai){
				if(ai.AudienceCodeType === "22") rating = Number(ai.AudienceCodeValue);
			});
			if(rating > 0){console.log(onix.DescriptiveDetail.Audience); return;}
		}
		var han_descr,	//hanmoto description text
		otc = onix.CollateralDetail ? onix.CollateralDetail.TextContent : null;	//onix TextContent
		if(!otc && !(han_descr = hanmoto.maegakinado || hanmoto.kaisetsu105w)) return;	//no useful description
		var tcs = {},	//TextContent's
		pelt = document.querySelector("td[itemprop=isbn]").previousSibling,
		ancelt = Util.dom.element("a"),
		parts = this.finder.prepare_parts(ancelt, (otc ? "ONIX TextContent" : "版元ドットコム") + " information");
		this.finder.prepare_anchor(ancelt, pelt, "Book information from openBD ONIX", "📘");//📖
		if(otc){
			otc.forEach(function(tc){
				tcs[tc.TextType] = tc.Text.replace(/！/g, "。");	//register Text w/ TextType as a key
			});
			parts.fbox.appendChild(Util.dom.element("div", tcs["03"] || tcs["02"] || tcs["23"] || ""));
			if(tcs["04"]) parts.fbox.appendChild(Util.dom.element("div", "【目次】\n" + tcs["04"]));	//table of contents
		}else parts.fbox.appendChild(Util.dom.element("div", han_descr));
		parts.finder.classList.add("bookinfo");
		pelt.appendChild(parts.finder);
	},
	//add IIIF viewer link and logo
	iiif_link: function(span, manifest, canvas){
		var iiif_link = Util.dom.element("a");
		iiif_link.href = Util.iiif.set_viewer_link(manifest, canvas, true);
		if(!Util.iiif.logo) Util.iiif.logo = Util.iiif.gen(16);
		iiif_link.title = "View this manifest with a IIIF viewer";
		iiif_link.appendChild(Util.iiif.logo.cloneNode(true));
		span.appendChild(Util.dom.text(" "));
		span.appendChild(iiif_link);
		span.classList.add("iiif");
	},
	//add link icon to Wikipedia which corresponds to DBpedia resource
	wikipedia_link: function(span, wpns, wpname){
		var wp_link = Util.dom.element("a"),
		icon = Util.dom.element("img");
		wp_link.href = "https://" + wpns + "wikipedia.org/wiki/" + wpname;
		wp_link.title = "View Wikipedia page for " + wpname.replace("_", " ");
		icon.setAttribute("src", this.snorql.relpath + "wpfav.png");
		wp_link.appendChild(icon);
		span.appendChild(Util.dom.text(" "));
		span.appendChild(wp_link);
	},
	//external link for non jps/cj uris
	test_external_link: function(h2){
		if(this.is_home_uri) return;
		var span = Util.dom.element("span");
		this.sq_formatter.set_external_link(span, this.uris.tgrsrc);
		h2.appendChild(span);
	},
	
	
	
	
	///@@ query more information
	//query type info for the uri
	test_url_type: function(span, uri){
		var that = this, binds,
		//^ in uri causes an error. e.g. in arc_nishikie-UCB_2_1_10_016QM01_001
		query = "SELECT ?type WHERE {<" + uri.replace('^', '%5E') + "> a ?type .}",
		show_type = function(val){
			var tlabel = that.app.set_wrapper_content(val.replace(/^.*?([^\/#]+)+$/, "$1"));
			span.appendChild(tlabel);
			if(RegExp.$1 === "Manifest" && !span.classList.contains("iiif")) that.iiif_link(span, uri);
		};
		this.qh.handler(null, query, function(res){
			if((binds = that.qh.check_res(res)) === false) return false;
			var bind = binds[0] || null;
			if(bind && bind.type.value){
				that.app.media_types[uri] = bind.type.value
				show_type(bind.type.value);
			}else{
				that.app.media_types[uri] = null;
			}
		});
	},
	//try to find IIIF manifest (asynchronous)
	test_iiif: function(span, canvas){
		var that = this, binds,
		query = "SELECT ?type ?manifest WHERE {<" + canvas + "> a ?type ; " +
		"<" + this.ns.schema + "isPartOf> ?manifest .}";
		this.qh.handler(null, query, function(res){
			if(!(binds = that.qh.check_res(res, "could not get manifest from " + canvas))) return false;
			if(!binds[0].manifest.value) return that.qh.log_error_msg("no manifest found", res);
			that.iiif_link(span, binds[0].manifest.value, canvas);
		});
	},
	//test if a map already generated, then add a table of a map for post fetched
	geo_table: function(target_td, uris, locprops, via_bnode, subj){
		var parent_table = target_td.closest("table");
		//console.log(uris, parent_table, parent_table.has_map);
		//to avoid redundant map in one spatial table
		if(parent_table.has_map) return false;
		target_td.appendChild(this.gen_geo_table(uris, locprops, via_bnode, subj));
		//if(!uris) parent_table.has_map = true;
	},
	//actually add a table of a map and lat/long/within of one location from a geo propert
	gen_geo_table: function(uris, locprops, via_bnode, subj){
		var geoprop = this.geo.prop.geo,
		query = "SELECT DISTINCT * WHERE {",
		uri;
		if(via_bnode){
			//uris, lcoporps are sets (two candidates) for bnode (jps:spatial)
			var uri = uris.shift(),
			locprop = locprops.shift(),
			bindp = "BIND(URI(\"" + this.geo.prop.cover + "\") as ?p)",
			latprop = this.geo.prop.lat,
			longprop = this.geo.prop.long,
			qgroup = one_qgroup(uri, locprop, bindp);	//first priority query
			query += (uris.length === 0 ? qgroup :
			"{" + one_qgroup(uris[0], locprops[0], bindp) + "} UNION {" + qgroup + "} ");	//if 2uris, 2nd priority query
		}else{
			uri = uris;
			//else the uri is of a geohash (=geocoord) ie query is <uri> [?p ?o]
			query += "BIND(<" + uri + "> as ?s) ?s ?p ?o";
		}
		query += "}";
		//console.log(query);
		return this.later_table(uri, query, "geo props", via_bnode, subj);
		//build group pattern
		function one_qgroup(myuri, locprop, bindp){
			var qg = "BIND(<" + myuri + "> as ?s)\n";
			//if the uri is of an entity, then query is <uri> schema:location/schema:geo [?p ?o]
			if(locprop) qg += "?s <" + locprop + "> ?loc .\n" +
			"{" + bindp + " ?loc ?p ?o .\n?o <" + latprop + "> ?olat ; <" + longprop + "> ?olong}\n" +
			"UNION {?loc <" + geoprop + "> ?gh . ?gh ?p ?o }";
			//if the uri is of a location, then query is <uri> schema:geo [?p ?o]
			else qg += "{" + bindp + " ?s ?p ?o}\nUNION {?s <" + geoprop + "> ?gh . ?gh ?p ?o }";
			return qg;
		}
		
	},
	/**
	 * get p/o of a URI (e.g. geo which is not bnode and cannot get p/o as CBD) and generate nested table asynchronously
	 * @param {String} uri	URI of (the parent node of) the subject to fetch further p/o
	 * @param {String} query	query string to get p/o to fill the table
	 * @param {String} prop	target property (parent of uri, or prop of uri if via_bnode)
	 * @param {Boolean} via_bnode	set if to obtain target p/o as prop [?p ?o] . Use when fetch geocoord of an entity
	 */
	later_table: function(uri, query, prop, via_bnode, subj){
		var that = this, binds,
		table = Util.dom.element("table");
		//query asynchronous
		this.qh.handler(null, query, function(newres){
			if(!(binds = that.qh.check_res(newres, "no po found for " + uri))) return false;
			//prepare solution object for the uri in rdfjson
			var loc, gh, latlon = {},
			rdfj_s = proc_binds(binds, loc, gh, latlon);
			//then select result the sets of appropriate place (subject)
			var lkey = Object.keys(rdfj_s),
			rdfj = rdfj_s[uri] || rdfj_s[lkey[0]],
			upos = that.uris.proced.indexOf(uri);
			//in case lat/log is taken from proced uri resource (e.g. target uri)
			if(upos !== -1) that.uris.proced.splice(upos, 1);
			//then set caption for bnode
			if(via_bnode) set_bnode_caption(rdfj, uri, lkey, latlon, loc, gh);
			//uri was not set before query for bnode
			that.app.rdfjson[uri] = rdfj;
			//then generate a nested table
			//that.format_one_uri(uri, prop, pqname, table);
			that.app.format_one_uri(uri, null, "", table);
			Util.map.refresh();
		});
		//return table (and display) not waiting query result
		return table;
		
		//// local functions
		// prepare solution object for the uri in rdfjson
		function proc_binds(bindings, loc, gh, latlon){
			var rdfj_s = {}, done_prop = {};
			//add result p/o to RDFJson object
			bindings.forEach(function(bind){
				var s = bind.s.value,
				p = bind.p.value;
				//assuming that higher priority query result was returned first in the solution sets
				//not necessarily. So, first store a set by its subject (s)
				if(!rdfj_s[s]){
					rdfj_s[s] = {};
					done_prop[s] = [];
				}else if(done_prop[s].indexOf(p) !== -1) return;
				done_prop[s].push(p);
				if(bind.loc && !loc) loc = bind.loc;
				if(bind.gh && !gh) gh = bind.gh.value;
				if(!rdfj_s[s][p]) rdfj_s[s][p] = [];
				rdfj_s[s][p].push(bind.o);
				//console.log(p, bind.s.value, latlon);
				if(bind.olat && !rdfj_s[s][that.geo.prop.lat]){
					//lat/long of geoGoveredBy
					rdfj_s[s][that.geo.pseudop.lat] = [bind.olat];
					rdfj_s[s][that.geo.pseudop.long] = [bind.olong];
					//that.geo.hashv[bind.o.value] = {lat: bind.olat.value, long: bind.olong.value};
				}
			});
			return rdfj_s;
		}
		// set caption for bnode
		function set_bnode_caption(rdfj, uri, lkey, latlon, loc, gh){
			var caption;
			if(!latlon[uri]) uri = lkey[0];
			//where schema:loc has place:XXX value, not a bnode (though actual subj shuould be its geo)
			if(loc && loc.type === "uri"){
				uri = gh; //loc.value;
				caption = "→ schema:geo → <" + gh + ">";
				if(rdfj[that.ns.schema + "geoCoveredBy"]) delete rdfj[that.ns.schema + "geoCoveredBy"];
			}else{
				//makes clear that those values are not direct properties of this node
				caption = "fetched via " + prop + " of " + that.sq_formatter._toQName(uri);
				if(loc) uri = loc.value.replace(/^nodeID:\/\/(.+)/, "_:$1") //b5514139
			}
			table.classList.add("viabnode");
			that.app.set_table_caption(table, caption);
			//if(!subj) uri = "_:test";
			if(rdfj[that.ns.schema + "latitude"] && rdfj[that.geo.pseudop.lat]){
				delete rdfj[that.geo.pseudop.lat];
				delete rdfj[that.geo.pseudop.long];
			}
		}
	},
	/**
	 * add labels for object resourece
	 * @param {String} uri	subject URI of the described resource
	 * @param {Object} jsonres	'results' node of SPARQL JSON result, to add the label resources
	 */
	labels: function(uri, jsonres){
		document.querySelector(".busy").innerText = "Getting labels ... ";
		//setup another query to get labels for each RDF object
		var that = this,
		query = "SELECT DISTINCT ?s ?o ?en WHERE { {<" + uri +"> ?q ?s .} " +
		"UNION {<" + uri +"> ?p ?po . ?po <" + this.ns.jps + "relationType> ?s } " + 
		"UNION {<" + uri +"#accessinfo> ?pa ?s } " + 
		"UNION {<" + uri +"#sourceinfo> ?ps ?s } " + 
		"?s <" + this.ns.rdfs + "label> ?o ." +	//use rdfs:label for Japanese
		"OPTIONAL {?s <" + this.ns.schema + "name> ?en . FILTER(lang(?en)=\"en\")}"	//use schema:name label@en for other lang if available
		+ "}",
		binds,
		set_labels = function(newres){
			if(!(binds = that.qh.check_res(newres, "label fetche failed"))) return false;
			binds.forEach(function(bind){
				//makes it as if the result from DESCRIBE
				if(Util.ulang !== "ja" && bind.en) bind.o.value = bind.en.value;	//if name@en available
				bind.p = {"type": "uri", "value": that.ns.rdfs + "label"};
				//labels are merged with original RDF json, then processed at set_object_tdval -> set_label_wrapper as subtext
				jsonres.bindings.push(bind);
			});
		},
		done = function(){return true;},
		failed =function(newres){
			return that.qh.log_error_msg("label fetche failed", newres);
		};
		//call another query, wait for response, and then merge the result
		return new Promise(function(done, failed){
			that.get_labels(query).then(function(newres){
				//call label query, then merge
				set_labels(newres);
				//ensure to promise resolved
				done();
			}).catch(failed);
		});
	},
	/**
	 * call SPARQL query, and wait for the result
	 * @param {Object} query	query to get labels
	 */
	get_labels: function(query){
		var that = this,
		OK = function(){return true;},
		NG = function(){return false;};
		return new Promise(function(OK, NG){
			var service = that.qh.set_service();
			service.query(query, {success: OK, failure: NG});
		});
	},
	//test license uri is an individual (non conditional) policy
	if_indiv_policy: function(ovtd, licenseuri){
		var that = this, binds,
		query = "PREFIX pds: <http://purl.org/net/ns/policy#>\n" +
		"PREFIX dct: <http://purl.org/dc/terms/>"+
		"select ?ref ?ipd where {<" + licenseuri + "> dct:isVersionOf? ?ref .\n" +
		"?ref a pds:ReferencePolicy .\n" +
		"OPTIONAL{<" + licenseuri + "> a ?ipd . ?ipd rdfs:subClassOf pds:IndividualPolicyDefinition}}";
		this.qh.handler(null, query, function(res){
			if(!(binds = that.qh.check_res(res, "no results for "))) return false;
			binds.forEach(function(bind){
				if(bind.ipd) ovtd.classList.add("ipd");	//individual policy definition
				if(bind.ref) test_icon(bind.ref.value, ovtd);
			});
			return true;
		});
		function test_icon(reflicense, ovtd){
			var src = that.license_budge(reflicense, "s");
			if(src){
				var imgelt = Util.dom.element("img");
				imgelt.src = src;
				ovtd.appendChild(imgelt);
			}
		}
	},
	//add license budge icon after license uri
	license_budge: function(uri, size){
		var m;
		if((m = uri.match(/^http:\/\/creativecommons.org\/(licenses|publicdomain)\/([^\/]+)/))){
			return "https://licensebuttons.net/" +
			((m[1]==="licenses") ? "l/" + m[2] + "/4" : "p/" + m[2] + "/1") + 
			".0/" + (size === "l" ? "88x31" : "80x15") + ".png";
		}else if(m = uri.match(/^http:\/\/rightsstatements.org\/vocab\/([^\/]+)/)){
			return "https://rightsstatements.org/files/buttons/" + m[1] + ".dark-white-interior.svg";
		}
		return null;
	},
	
	///@@ more additional info via query
	//similar title search 2020-03-28
	title_more_search: function(itemtype){
		if(!this.app.title) return;
		var tip = [["型が", "で、タイトルが", "を含む", "同じである", "アイテムを探す"],
			["find items of type ", " with ", "similar", "the same", " title"]][this.langidx],
		ancelt = Util.dom.element("a", "🔍"),	//📚
		ocpat = {"o": "\\[〔《［「＜（", "c": " ：　\\/\\]〕》］」＞）"},	//delimiting open/close pattern
		bifpat = new RegExp("^[" + ocpat.o + "]?([^a-z\\.\\-"+ ocpat.o + ocpat.c + "]+)[" + ocpat.c + "]"),
		titleelt = document.querySelector("tbody.label td"),	//:nth-child(2) for value cell
		//constructs of query
		query = "SELECT DISTINCT ?s ?title (sample(?who) as ?who) (sample(?publisher) as ?publisher) ?when",
		tcond = "?s rdfs:label ?title",	//title condition
		acond = "a",	//type condition (may be appended by /subClassOf*)
		bindcond = "BIND(\"" + this.app.title + "\" as ?title) ",	//exact match, bind to get title as a result var
		bifcond = tcond +" FILTER bif:contains(?title,\"'",	//bif full text match
		optcond = "\n\tOPTIONAL {?s (schema:creator|schema:contributor)/rdfs:label ?who}\n\tOPTIONAL {?s schema:publisher/rdfs:label ?publisher}\n\tOPTIONAL {?s schema:datePublished ?when}",
		imgcond = false,	//whether to obtain schema:image
		titlekwd = this.app.title;	//title or keyword (sub part) for bif:contains
		maxbiflen = 12;
		//query modifiers based on item type
		if(itemtype.match(/^(絵画|版画|素描|水彩)/)){
			acond += "/rdfs:subClassOf?";
			itemtype = "絵画";
			imgcond = true;
		}else if(itemtype.match(/^(写真|絵画等)/)){
			imgcond = true;
		}
		if(this.app.title.match(bifpat)){
			//title/label has sub parts
			if(RegExp.$1.length > maxbiflen * 2) bifcond = "";	//wont use long sub part for bif:contains
			else{
				bifcond += RegExp.$1 + "'\")";
				titlekwd = RegExp.$1;
			}
		}else if(this.app.title.length <= maxbiflen){
			//if title has no sub parts but short enough for full text search
			bifcond += this.app.title + "'\")";
			//bindcond = "";
		}else bifcond = "";
		if(imgcond){
			query += " ?image";
			optcond += "\n\tOPTIONAL {?s schema:image ?image}";
		}
		//build a query
		query += " WHERE{\n\t?s "+ acond + " type:" + itemtype +" .\n\t" + (bifcond || bindcond + tcond) +
		optcond + "\n} ORDER BY ?title ?when LIMIT 500";
		ancelt.setAttribute("href", "?query=" + encodeURIComponent(query));
		ancelt.setAttribute("title", tip[0] + '"' + itemtype + '"' + tip[1] + 
			(bifcond ? (this.langidx ? "" : '"' + titlekwd + '"') + tip[2] : tip[3]) + tip[4]);
		ancelt.classList.add("finder");
		titleelt.appendChild(ancelt);
		this.nxdl_img_search(titleelt, titlekwd);
	},
	//test to use 次世代デジタルライブラリー 2020-03-29
	nxdl_img_search: function(pelt, titlekwd){
		if(!pelt || !this.uris.tgrsrc.match(/dignl-(\d+)$/)) return;
		var that = this,
		bid = RegExp.$1,
		dlurl = "https://lab.ndl.go.jp/dl/",
		iseach = dlurl + "illust/search?",
		nxdl = ["次世代デジタルライブラリー", "Next Digital Library"],
		tip = [[nxdl[0] + "画像検索", "のパネル表示切り替え", "：キーワードから"],
			[nxdl[1] + " Illustration Search", ": toggle panel", " by keyword"]][this.langidx],
		tipttl = ["この画像を用いて次世代DL類似画像検索","use this image for illustration search"][this.langidx];
		for(var i=5; i<8; i++) if(this.app.ndc[i].length){
			//if found an NDC which is within the range available in NextDL search
			var kwdlink = iseach + "keyword=" + encodeURIComponent(titlekwd),
			ancelt = Util.dom.element("a");
			Util.xhr.get(dlurl + "api/illustration/of/" + bid, function(res){
				//query illusts in the item
				ancelt.classList.add("finder");
				pelt.appendChild(ancelt);
				if(res.list.length){
					//if any illustration is registered, set image search panel
					that.finder.prepare_anchor(ancelt, pelt, tip[0] + tip[1]);
					pelt.appendChild(setup_selection_table(res.list));
				}else{
					//otherewise provide keyword search link
					ancelt.innerText = "🔖";
					ancelt.setAttribute("href", kwdlink);
					ancelt.setAttribute("title", tip[0] + tip[2]);
				}
			});
			break;
		}
		//prepare image search panel
		function setup_selection_table(ilist){
			var item,
			parts = that.finder.prepare_parts(ancelt, 
				["キーワード／この資料内の図表から<strong>"+nxdl[0]+"で類似画像を</strong>検索",
				"Find <strong>similar images</strong> from keyword / figures in this item w/ "+nxdl[1]][that.langidx]),
			kwdbx = Util.dom.element("span", ["キーワード", "keyword"][that.langidx] + ": "),
			kwdanc = Util.dom.element("a", titlekwd, [["href", kwdlink]]);
			kwdanc.setAttribute("title", tip[0] + tip[2]);
			kwdbx.appendChild(kwdanc);
			parts.fbox.appendChild(kwdbx);
			for(var i=0; i<5; i++){
				if(!(item = ilist[i])) break;
				that.finder.set_ibox(parts, iseach + "image=" + item.id, 
					"https://www.dl.ndl.go.jp/api/iiif/" + bid + "/R" + ("0000000" + item.page).slice(-7) +
					"/pct:" + [item.x, item.y, item.w, item.h].join(",") + "/,128/0/default.jpg",
					tipttl
				);
			}
			return parts.finder;
		}
	},
	//test to use JPS image search 2020-03-31, entended 2020-06-14
	img_search: function(pelt){
		var home = this.snorql.homedef.uri,
		limit = 8,
		f, api_q, tipn;
		//if(!pelt || !this.uris.tgrsrc.match(/^(.+jpsearch\.go.+data\/)([^\/]+)$/)) return;
		if(!pelt || !home) return;
		if(home === "https://jpsearch.go.jp/"){
			if(!this.uris.tgrsrc.match(/^(.+jpsearch\.go.+data\/)([^\/]+)$/)) return;
			api_q = home + "api/item/search/jps-cross?csid=jps-cross&from=0&size=" + limit + "&image=" + RegExp.$2;
			tipn = ["ジャパンサーチ", "Japan Search"];
			f = {
				selector: function(res){return res.list;},
				uri: function(item){return "?describe=" + that.snorql.homedef.datauri + item.id;},
				thumb: function(item){return item.common.thumbnailUrl;},
				title: function(item){return item.common.title;}
			};
		}else if(home === "https://cultural.jp/"){
			//2020-06-14
			if(!this.uris.tgrsrc.match(/^(.+cultural\.jp.+data\/|.+jpsearch\.go.+data\/)([^\/]+)$/)) return;
			api_q = "https://api.cultural.jp/search?image=" + RegExp.$2; // + limit + ,
			tipn = ["Cultural Japan", "Cultural Japan"];
			f = {
				selector: function(res){return res.hits ? res.hits.hits : null;},
				uri: function(item){return (item._id.match(/^(cobas|dignl|arc_|issnl|bunka|najda)/) ? "https://jpsearch.go.jp" : "https://ld.cultural.jp") + "/data/" + item._id;},
				thumb: function(item){return item._source._image;},
				title: function(item){return item._source._title;}
			};
		}else return;
		var that=this,
		tip = [tipn[0] + "画像検索のパネル表示切り替え", tipn[1] + "Illustration Search: toggle panel"][this.langidx],
		stip = [tipn[0] + "内<strong>アイテム</strong>の類似サムネイル画像を検索中（時間がかかる場合あり）… ",
				"Searching items with similar image in " + tipn[1] + " (may take time) ..."][this.langidx],
		readyttl = [tipn[0] + "<strong>アイテム</strong>の類似サムネイル画像検索結果（最大" + limit + "件）",
				tipn[1] + " <strong>items</strong> with similar image (max " + limit + ")"][this.langidx],
		searching = stip + (this.app.relpath ? "<img src=\"" + this.app.relpath + "transp-spinner-light.gif\"/>" : ""),
		ancelt = Util.dom.element("a"),
		parts = this.finder.prepare_parts(ancelt, searching);
		//set anchor befor api request which would take time
		this.finder.prepare_anchor(ancelt, pelt, tip);
		pelt.appendChild(parts.finder);
		//search api request
		Util.xhr.get(api_q, function(res){	//api + itemid
			var itemlist = f.selector(res);
			if(!itemlist){
				parts.capt.innerText = "Similar item request failed";
				console.log(api_q, res);
			}else if(!itemlist.length){
				//if similar item not found, show a regret message
				parts.capt.innerText = "Similar item not found";
			}else{
				//if found, prepare image panel
				var item;
				for(var i=0; i<limit; i++){
					if(!(item = itemlist[i])) break;
					//that.finder.set_ibox(parts, "?describe=" + baseuri + item.id, item.common.thumbnailUrl, item.common.title);
					that.finder.set_ibox(parts, f.uri(item), f.thumb(item), f.title(item));
				}
				parts.capt.innerHTML = readyttl;
			}
		});
	},
	//utilities for image/nextdl search or other finder parts
	finder: {
		//anchor on the parent td element
		prepare_anchor: function(ancelt, pelt, tip, emoji){
			ancelt.classList.add("finder");
			pelt.appendChild(ancelt);
			ancelt.innerText = emoji || "🎨";
			ancelt.setAttribute("title", tip);
			pelt.style.position = "relative";
		},
		//popup finder parts
		prepare_parts: function(ancelt, caption){
			var finder = Util.dom.element("div", "", [["class", "finder"]]),
			capt = Util.dom.element("p"),
			fbox = Util.dom.element("div", "", [["class", "fbox"]]), 
			closer = Util.dom.element("span", "×", [["class", "closer"]]);
			capt.innerHTML = caption;
			finder.appendChild(capt);
			finder.appendChild(fbox);
			finder.appendChild(closer);
			ancelt.addEventListener("click", function(ev){
				if(finder.classList.contains("show")) finder.classList.remove("show");
				else finder.classList.add("show");
				ev.preventDefault();
			});
			document.body.addEventListener("click", function(ev){
				if(ev.target === ancelt || (ev.path || ev.composedPath()).includes(finder)) return;
				else if(finder.classList.contains("show")) finder.classList.remove("show");
			});
			closer.addEventListener("click", function(){
				finder.classList.remove("show");
			});
			return {"finder": finder, "fbox": fbox, "capt": capt};
		},
		//set one image box
		set_ibox: function(parts, link, imgsrc, title){
			var ibox = Util.dom.element("span"),
			img = Util.dom.element("img"),
			imganc = Util.dom.element("a", "", [["href", link]]);
			img.src = imgsrc;
				Util.img.on_event(img, {w:50});
			imganc.appendChild(img);
			if(title) imganc.title = title;
			ibox.appendChild(imganc);
			parts.fbox.appendChild(ibox);
		}
	},
	
	
	
	
	///@@ misc utils for owner
	//2019-02-11 with this uri as object(o), get resources(s) that have relation(p)
	set_osp_btn: function(div){
		var that = this,
		cdiv = Util.dom.element("div"),	//additional info division
		btn = Util.dom.element("span", "get resources that relate to this URI");
		btn.addEventListener("click", function(ev){
			//that.osp(div, btn);
			that.osp(cdiv, btn);
		}, false);
		btn.className = "pseudolink";
		if(this.app.exserv) cdiv.appendChild(this.graphdraw_form());	//2020-03-24
		cdiv.appendChild(btn);
		div.appendChild(cdiv);
	},
	//add object-subject-property table where subject is current target uri
	osp: function(div, msgarea){
		var that = this,
		query = "SELECT DISTINCT ?s ?label ?p ?p2 WHERE {\n" +
			"\t{?s ?p <" + this.uris.tgrsrc + ">  FILTER(isIRI(?s))} UNION\n" +
			"\t{?s ?p ?o . ?o ?p2 <" + this.uris.tgrsrc + "> FILTER(isBLANK(?o))\n" +
				"\t\tMINUS {?s ?p3 <" + this.uris.tgrsrc + ">}\n\t}\n" +
		"\tOPTIONAL {?s rdfs:label ?label}\n} LIMIT 500";
		msgarea.innerText = "asking ... ";
		msgarea.className = "busy";
		this.qh.handler(null, query, function(json){
			if(!that.qh.check_res(json, "Resources that relate to ", msgarea)) return false;
			var urid = Util.str.trim(that.uris.tgrsrc, 80, [50, 20]);
			new SPARQLSelectTableFormatter(json, that.ns, that.snorql).toDOM(div, true);
			msgarea.innerText = "Resources that relate to <" + urid +">";
			msgarea.className = "";
			Util.example.update_qtarea(query);
			return true;
		});
	},
	
	graphdraw_form: function(){
		var data = JSON.stringify(this.app.rdfjson),
		f = Util.dom.element("form", null, [["action", this.app.exserv + "/works/2009/pub/graph-draw"], ["method", "POST"]]),
		trigger = Util.dom.element("span", "🕸", [["class","strigger"], ["title", "draw graph"]]);
		trigger.onclick = function(){f.submit();};
		f.appendChild(trigger);
		f.appendChild(Util.dom.element("input", null, [["type","hidden"], ["name", "jsonobj"], ["value", data]]));
		return f;
	}
};

//@@ /// more info for LOD values. Moved to independent class 2020-06-27
function AskExternal(jrdf_formatter){
	this.app = jrdf_formatter;	//calling JsonRDFFormatter instance
	this.qh = jrdf_formatter.qh;
	//target uri pattern to processing function mapping
	this.map = {
		"http://id.ndl.go.jp/auth/": this.ask_ndla,
		"http://www.wikidata.org/entity/": this.ask_wikidata,
		"http://(ja.)?dbpedia.org/resource/":  this.ask_dbpedia,
		"http://viaf.org/viaf/": this.ask_viaf,
		"http://id.loc.gov/authorities/names/": this.ask_lcnames,
		"http://data.e-stat.go.jp/lod/sac/": this.ask_sac
	};
	//map each key to actual function in order to excute as this[key]. necessary to use this in each function
	for(var key in this.map) this[key] = this.map[key];
	//uri pattern regexp to determine direct link in set_object_tdval
	this.map_pat = new RegExp("^(" + Object.keys(this.map).join("|") + ")");
	this.snorql = jrdf_formatter.snorql;	//shortcut for snorql instance
	this.tguri = jrdf_formatter.uris.tgrsrc;	//shortcut for current target uri
	this.wdp = {"base":"http://www.wikidata.org/prop/"};
	this.wdp.dt = this.wdp.base + "direct";
	this.exns = {
		"dbp-owl": "http://dbpedia.org/ontology/",
		"dbp-propj": "http://ja.dbpedia.org/property/",
		"dbp-prop": "http://dbpedia.org/property/",
		"wdt": this.wdp.dt + "/",
		"wdtn": this.wdp.base + "direct-normalized/",
		"prov": "http://www.w3.org/ns/prov#",
		"wgs84": "http://www.w3.org/2003/01/geo/wgs84_pos#",
		"mads": "http://www.loc.gov/mads/rdf/v1#",
		"locid": "http://id.loc.gov/vocabulary/identifiers/",
		"recinfo": "http://id.loc.gov/ontologies/RecordInfo#",
		"bflc": "http://id.loc.gov/ontologies/bflc/",
		"chgset": "http://purl.org/vocab/changeset/schema#",
		"sacs": "http://data.e-stat.go.jp/lod/terms/sacs#",
		"imi": "http://imi.go.jp/ns/core/rdf#"
	};
	//rights statement types
	this.rstypes = ["License", "IndividualPolicyStatement", "ReferencePolicy", "RightsStatement", "AboutPage"];
};
AskExternal.prototype ={
	/**
	 * ask external endpoint to add more info for LOD values
	 * @param {DOMNode} div	<div> element to append resulting information table
	 * @return {Boolean}	true if uri pattern is matched and subdiv generated
	 */
	proc: function(div){
		if(this.app.is_home_uri === "more_proc"){
			console.log(this.app.is_home_uri, div);
			return false;
		}else this.app.is_home_uri = "more_proc";	//to treat rdfs:label as subtext in set_object_tdval()
		var mv, subdiv = Util.dom.element("div");
		//ask_map is defined in constructor
		for(var key in this.map) if(mv = this.tguri.match(new RegExp("^" + key))){
			//can be excuted by this.map[key], but "this" in each function becomes this.map
			if(this[key](subdiv, mv[1])) return add_subdiv(subdiv);
		}
		if(this.app.rdfjson){
			if(this.ask_license_def(subdiv)) return add_subdiv(subdiv);
		}
		return false;
		
		function add_subdiv(subdiv){
			div.appendChild(subdiv);
			return true;
		}
	},
	//add more info for NDLA resources
	ask_ndla: function(tgdiv){
		var requri = this.tguri.replace(/entity/, "ndlna"),
		prox = this.app.exserv ? (this.app.exserv + "/works/2016/pub/cors_proxy.php/") : "https://cors-anywhere.herokuthat.com/";
		if(requri !== this.tguri) requri += "> <" + this.tguri;
		this.query_and_proc("describe <" + requri + ">", tgdiv, "NDLA", prox + "http://id.ndl.go.jp/auth/ndla", "application/json");
		return true;
	},
	//add more info for Wikdata resources w/ prop labels 2020-06-25
	ask_wikidata: function(tgdiv){
		var query = "CONSTRUCT{\n" +
			//Wikidata resource property values
			"\t<" + this.tguri + "> ?p ?o ; rdfs:label ?slabel ; schema:description ?desc .\n" +
			"\t\t?o rdfs:label ?olabel.\n" +
			//extra triples to represent property labels -> handled by set_object_tdval
			"\t<" + this.app.xplabeluri + "> ?p ?plabel .\n" +
		"} WHERE {\n\t{\n" +
			"\t<" + this.tguri + "> ?p ?o .\n" +
			"\tFILTER(strstarts(str(?p), \"" + this.wdp.dt + "\"))\n" +
			"\tBIND(IRI(replace(str(?p), \"" + this.wdp.dt + ".*?/\", \"http://www.wikidata.org/entity/\")) as ?pent)\n" +
			"\t?pent rdfs:label ?plabel . FILTER(lang(?plabel)=\"ja\")\n" +
			"\tOPTIONAL {\n\t\tFILTER(isIRI(?o))\n\t\t?o rdfs:label ?olabel . FILTER(lang(?olabel)=\"ja\")\n\t}\n\t} UNION " +
			"{\n\t\t<" + this.tguri + "> schema:description ?desc ; rdfs:label ?slabel .\n" +
			"\t\tFILTER(lang(?desc)=\"ja\")\n\t\tFILTER(lang(?slabel)=\"ja\" || lang(?slabel)=\"en\")\n" +
		"\t}\n}\n";
		this.add_nsmap(["wdt", "wdtn"]);
		//this.app.props.thumb = this.exns.wdt + "P18";
		this.query_and_proc(query, tgdiv, "Wikidata", "https://query.wikidata.org/sparql");
		return true;
	},
	//add more info for DBpedia resources 2020-06-25
	ask_dbpedia: function(tgdiv, lang){
		var query = "select ?s ?p ?o where{bind(<" + this.tguri + "> as ?s) ?s ?p ?o" + (lang ? "":
		" . filter(isURI(?o) || (isLiteral(?o) && (!lang(?o) || lang(?o)=\"ja\" || lang(?o)=\"en\")))") + "}",
		prx = this.prep_https_proxy(),
		endpoint = lang ? prx + "http://" + lang + "dbpedia.org/sparql" : "https://dbpedia-live.openlinksw.com/sparql";
		//https://dbpedia.org/sparql has some problems with bind
		this.add_nsmap(["dbp-owl", "dbp-propj", "dbp-prop", "prov", "wgs84"]);
		//dbpedia-j does not accept https request
		this.query_and_proc(query, tgdiv, "DBpedia", endpoint);
		return true;
	},
	//add more info for e-stat sac code 2020-06-27
	ask_sac: function(tgdiv){
		//describe <uri> returns serialized rdf -> select spo
		var query = "select ?s ?p ?o where{{bind(<" + this.tguri + "> as ?s) ?s ?p ?o} union "+
		"{<" + this.tguri + "> <http://data.e-stat.go.jp/lod/terms/sacs#latestCode> ?s. ?s ?p ?o}} limit 200";
		this.add_nsmap(["sacs","imi"]);
		this.query_and_proc(query, tgdiv, "e-Stat", "https://data.e-stat.go.jp/lod/sparql/alldata/query");
		return true;
	},
	//add more info for VIAF resources 2020-06-26
	ask_viaf: function(tgdiv){
		this.distill_and_proc(tgdiv, "VIAF", ["dbp-owl","dbp-propj"], true);
		return true;
	},
	//add more info for LoC resources 2020-06-28
	ask_lcnames: function(tgdiv){
		this.distill_and_proc(tgdiv, "Library of Congress", ["mads","locid", "recinfo", "bflc", "chgset"], false);
		return true;
	},
	//lisence description
	ask_license_def: function(tgdiv){
		var defv,
		tgrs = this.app.rdfjson[this.tguri];
		//defuri = this.app.rdfjson[this.tguri][this.app.snorql.more_ns.dct + "isVersionOf"][0].value;
		//only for license description
		if(!this.rstypes.includes(this.app.rdftype)){
			if(!["WebPage"].includes(this.app.rdftype)) return false;
			defv = tgrs[this.app.ns.rdfs + "seeAlso"];
		}else{
			var dct = this.snorql.more_ns.dct,
			skos = this.app.ns.skos;
			defv = tgrs[this.app.ns.owl + "sameAs"] || tgrs[dct + "isReplacedBy"] || tgrs[dct + "isVersionOf"] || tgrs[skos + "exactMatch"] || tgrs[skos + "closeMatch"] || tgrs[skos + "relatedMatch"];
		}
		if(!defv) return false;
		
		var defuri = [];
		defv.forEach(function(v){defuri.push("<" + v.value +">");});
		//if it has owl:sameAs, dct:isReplacedBy or dct:isVersionOf
		var query = "select ?s ?p ?o where{values ?s {" + defuri.join(" ") +"} ?s ?p ?o}";
		this.query_and_proc(query, tgdiv, "License");
		return true;
	},
	
	/**
	 * common handler to ask more query and append the resulting table.
	 * @param {String} this.tguri	subject URI to get more information
	 * @param {String} query	query to get the information
	 * @param {DOMNode} tgdiv	<div> node to attatch the results
	 * @param {String} siglabel	a signature label to show processing info
	 * @param {String} endpoint	optional endpoint URI when asking to external store
	 * @param {String} accept	optional accept parameter
	 */
	query_and_proc: function(query, tgdiv, siglabel, endpoint, accept){
		var that = this, service;
		if(endpoint){
			service = new SPARQL.Service(endpoint);
			service.setMethod("GET");
			service.setRequestHeader("Accept", accept || "application/sparql-results+json,*/*");
			this.notice_proc_external(tgdiv, siglabel);
		}else service = this.qh.set_service();

		this.app.qh.handler(service, query, function(json){
			var cres, res;
			if(!(cres = that.qh.check_res(json, "Could not get results from " + siglabel, tgdiv, true))) return false;
			if(cres[0] === "rdfjson") res = json;
			else if(json.head.vars.includes("subject")) res = that.app.wdToRDFJson(json);
			else res = that.app.toRDFJson(json);
			that.proc_set_newrdfdiv(res, tgdiv, siglabel, endpoint);
		});
	},
	//general method to use rdf distiller and process resulting rdf/json
	distill_and_proc: function(tgdiv, siglabel, nsmap, tguri_only, trim_ext){
		this.notice_proc_external(tgdiv, siglabel);
		if(nsmap) this.add_nsmap(nsmap);
		var that = this;
		Util.xhr.get(this.prep_rdf_distiller_uri(this.tguri), function(jld){
			var myrdf = {},
			//trim file extension that is not part of the target uri
			tguri = that.tguri.replace(/\.(rdf|xml|json(ld)?|ttl|nt)$/, "");
			if(trim_ext) tguri = tguri.replace(new RegExp(trim_ext + "$"), "");	//eg. .madsrdf for lcnames
			//select the rdf object of target uri. e.g. VIAF also returns rdf from participating libraries
			myrdf[tguri] = jld[tguri];
			if(!tguri_only) for(var uri in jld){
				if(uri === tguri) continue;
				myrdf[uri] = jld[uri];
			}
			that.proc_set_newrdfdiv(myrdf, tgdiv, siglabel, true);
		});
	},
	//get distiller uri to have RDF/JSON instead of serialized jsonld
	prep_rdf_distiller_uri: function(uri){
		return this.prep_https_proxy() + "http://rdf.greggkellogg.net/distiller?command=serialize&output_format=rj&raw&url=" + uri;
	},
	//provisional proxy setting
	prep_https_proxy: function(){
		return location.href.match(/^http:\/\/localhost/) ? "" : "/app/prx/";
	},
	//processing notifier
	notice_proc_external: function(div, siglabel){
		div.innerHTML = "<p>asking to " + siglabel + " ... " +
		(this.app.relpath ? "<img src=\"" + this.app.relpath + "spinner.gif\"/>" : "") + "</p>";
	},
	//processes the result rdfjson and append new table to the parent div
	proc_set_newrdfdiv: function(newrdf, tgdiv, siglabel, has_external){
		//be careful! rdfjson is replaced
		this.app.saved.rdfjson = this.app.rdfjson;
		//console.log(json);
		//wikidata returns normal results
		this.app.rdfjson = newrdf;
		this.app.uris.proced = [];
		var newdiv = this.app.format();
		if(has_external){
			newdiv.firstChild.firstChild.innerText += " (Description from " + siglabel + ")";
			tgdiv.replaceChild(newdiv, tgdiv.firstChild);
		}else tgdiv.appendChild(newdiv);
	},
	//add nspfx mapping to more_ns so that properties can be displayed as qname
	add_nsmap: function(nsmap){
		nsmap.forEach(function(key){
			this.snorql.more_ns[key] = this.exns[key];
		}, this);
	}
};


/** Generic Query Handler */
var GnrQueryHandler = function(app){
	this.app = app;
	this.service = null;
	this.endpoint = app.snorql._endpoint;
};
GnrQueryHandler.prototype = {
	set_service: function(method){
		if(!this.service){
			this.service = new SPARQL.Service(this.endpoint);
			this.service.setMethod(method || "GET");
			this.service.setRequestHeader("Accept", "application/sparql-results+json,*/*");
			this.service.setOutput("json");
		}
		return this.service;
	},
	/**
	 * generic query handler
	 * @param {Object} service	SPARQL endpoint service
	 * @param {String} query	SPARQL query
	 * @param {function} success_fnc	function to excute when success. usually include that.qh.check_res()
	 * @param {DOMNode} msgarea	optional element to display message
	 */
	handler: function(service, query, success_fnc, msgarea){
		var that = this;
		this.last_query = query;
		if(!service) service = this.set_service();
		service.query(query, {
			"success": success_fnc,
			"failure": function(res){
				var msg = "query request failed:";
				if(msgarea) that.disp_error_msg(msgarea, msg);
				else that.log_error_msg(msg, res, true);
			}
		});
	},
	/**
	 * generic query result checker with several standard error messages
	 * @param {Object} json	query results
	 * @param {String} notfound_msg	message string to show on error
	 * @param {DOMNode} msgarea	optional element to display message
	 * @param {Boolean} test_rdfjson	set true if results format is RDF/JSON, not SPARQL json res
	 * @return {Object|Bookean|Integer}	results.bindings (or RDF/JSON) if success, 0 if 0 bindings, false if some errors
	 */
	check_res: function(json, notfound_msg, msgarea, test_rdfjson){
		var that = this;
		if(!json){
			return error_msg("[query error: no response]", "", true);
		}else if(json.status && json.status === "error"){
			this.log_error_msg("ajax error", json, true);
			return error_msg("ajax error: " + json.response);
		}
		if(test_rdfjson && !json.head){
			return ["rdfjson", json];
		}else if(json.head && json.head.status === "error"){
			return error_msg("query error: " + json.head.msg, "", true);
		}else if (json.results.bindings.length === 0){
			//returns 0 instead of false, so that calling handlers can set no value results e.g. test_url_type
			if(!notfound_msg) return 0;	//quiet
			else if(this.app.is_home_uri){
				error_msg(notfound_msg + "resource");
			}else if(this.app.uris){
				this.error_msg("", notfound_msg + "<a href=\"" + this.app.uris.tgrsrc + "\">this resource</a>.");
			}else{
				this.error_msg(notfound_msg);
			}
			return 0;
		}
		return test_rdfjson ? ["bindings", json.results.bindings] : json.results.bindings;
		
		function error_msg(msg, html, is_warning){
			return msgarea ? that.disp_error_msg(msgarea, msg, html) :
			that.log_error_msg(msg, json, is_warning);
		}
	},
	//display error message on display
	disp_error_msg: function(msgarea, msg, html){
		if(html) msgarea.innerHTML = html;
		else msgarea.innerText = msg;
		msgarea.className = "";
		return false;
	},
	//log message to console
	log_error_msg: function(msg, obj, is_warning){
		if(is_warning) console.warn(msg, obj);
		else console.log(msg, obj);
		return false;
	},
}


//a better table formatter for SPARQL select result
function SPARQLSelectTableFormatter(json, namespaces, snorql){
	this.sq_formatter = new SPARQLResultFormatter(json, namespaces, snorql);
	this.tbody = [];
	this.std_tbl_rows = 20;
	this.row_count = 0;
	this.inc = null;
	this.ns = namespaces;
	this.snorql = snorql;
	this.qh = new GnrQueryHandler(this);
}
SPARQLSelectTableFormatter.prototype = {
	toDOM: function(div, noTitle) {
		var is_count;
		this.table = Util.dom.element("table");
		this.table.className = "queryresults";
		if(!noTitle) is_count = Util.set_title(this, "SELECT", this.sq_formatter);
		var ncols = this.sq_formatter._variables.length;
		if(ncols > 4) this.table.classList.add("plus5");
		else if(ncols > 2) this.table.classList.add("plus3");
		var theadr = this.sq_formatter._createTableHeader();
		this.table.appendChild(theadr);
    	this.create_tbody(this.table, theadr, is_count);	//, this
		this.inc_ctrl = this.setup_inc_ctrl(this.table);
		if(this.inc_ctrl){
			div.appendChild(this.inc_ctrl[0]);
			div.appendChild(this.table);
			if(this.inc_ctrl[1]) div.appendChild(this.inc_ctrl[1]);
		}else div.appendChild(this.table);
		//if(!noTitle) Util.set_title(this, "SELECT", this.sq_formatter);
		Util.queries.add_countq();
	},
	/**
	 * create tbody element to group up some result rows (in order to show/hide each group)
	 * to be called from toDOM() function
	 * @param {DOMNode} table	table element node to append tbody's
	 */
	create_tbody: function(table, theadr, is_count){
		var tbpos = -1,
		cis_tds = {},	//counted item subject td's
		top_var = this.sq_formatter._variables[0];
		this.row_count = this.sq_formatter._results.length;
		this.sq_formatter._results.forEach(function(resul, i){
			if(i % this.std_tbl_rows === 0){
				this.tbody.push(Util.dom.element("tbody"));
				tbpos++;
				table.appendChild(this.tbody[tbpos]);
				if(tbpos) this.tbody[tbpos].className = "wait";
			}
			if(Object.keys(resul).length === 0) console.log("no item in row ", i);
			else{
				var row = this.sq_formatter._createTableRow(resul, i);
				//prepare for add_elabels if var is uri
				if(!resul[top_var]) ; //same mistype varname as snorql._createTableRow
				else if(resul[top_var].type === "uri") cis_tds[resul[top_var].value] = row.firstChild;
				this.tbody[tbpos].appendChild(row);
			}
		}, this);
		if(is_count) this.add_elabels(cis_tds, table, theadr);
	},
	/**
	 * setup increment controls for table view, to be called from displayJSONResult() function
	 * @param {DOMNode} table	target table node
	 * @param {Integer} offset	SPARQL offset modifier value
	 * @return {Array}	a pair of increment control <p> node
	 */
	setup_inc_ctrl: function(table, offset){
		if(typeof offset === "undefined") offset = 0;
		//if number of result rows is smaller than view rows, no need to create the control
		if(this.row_count <= this.std_tbl_rows){
			var dispres = this.row_count + " result" + (this.row_count > 1 ? "s": "");
			return [Util.dom.element("span", dispres, [["class", "ctrl0"]])];
		}
		var that = this,
		ctrlparam = {
			left: {text: "≪ prev", dir: -1, inistate: "wait"},
			right: {text: "next ≫", dir: +1, inistate: "active"},
			unit: this.std_tbl_rows,
			from: offset + 1,
			to: offset + this.std_tbl_rows,
			all: offset + this.row_count
		},
		ctrls = this.create_inc_ctrl(ctrlparam),
		switcher = Util.dom.element("span", "show all");
		this.inc = {
			ctrl: ctrls,
			showpos: 0,
			maxpos: Math.floor((this.row_count - 1) / ctrlparam.unit),
			unit: ctrlparam.unit,
			all: ctrlparam.all,
			offset: 0
		};
		//2019-02-11
		switcher.className = "switcher";
		switcher.addEventListener("click", function(ev){
			if(table.classList.contains("showall")){
				table.classList.remove("showall");
				ev.target.innerText = "show all";
			}else{
				table.classList.add("showall");
				ev.target.innerText = "collapse";
			}
		}, false);
		ctrls[1].p.appendChild(this.gen_tbrchanger());
		ctrls[1].p.appendChild(switcher);
		return [ctrls[0].p, ctrls[1].p];
	},
	/**
	 * create actual increment conrol elements
	 * @param {Object} param	setup parameters
	 * @return {Array}	a pair of increment control objects
	 */
	create_inc_ctrl: function(param){
		var that = this, ctrls = [];
		//creates two controls both for the above and the below table
		for(var i=0; i<2; i++){
			var ctrl = {
				p: Util.dom.element("p"),
				status: Util.dom.element("span")
			};
			ctrl.p.className = "incCtrl ctrl" + i;
			ctrl.status.appendChild(
				Util.dom.text(" " + param.from + " - " + param.to + " / " + param.all + " ")
			);
			["left", "right"].forEach(function(key){
				ctrl[key] = Util.dom.element("span");
				ctrl[key].appendChild(Util.dom.text(param[key].text));
				ctrl[key].className = "pseudolink " + param[key].inistate;
				ctrl[key].addEventListener("click", function(){that.set_view(param[key].dir);}, false);
			});
			ctrl.p.appendChild(ctrl.left);
			ctrl.p.appendChild(ctrl.status);
			ctrl.p.appendChild(ctrl.right);
			ctrls.push(ctrl);
		}
		return ctrls;
	},
	//generates select element to change number of rows to display
	gen_tbrchanger: function(){
		var that = this,
		sel = Util.dom.element("select");
		[20, 50, 100].forEach(function(num){
			var opt = Util.dom.element("option", num);
			if(that.std_tbl_rows === num) opt.setAttribute("selected", "selected");
			sel.appendChild(opt);
		});
		sel.addEventListener("change", function(ev){
			var formatter = that,
			selnum = Number(ev.target.value);
			if(selnum !== that.std_tbl_rows) that.reset_tbody(selnum);
			//console.log(ev, that.table);
		});
		return sel;
	},
	/**
	 * change table view (displayed rows), called by increment control elements
	 * @param {Integer} direction	increment the disp rows if +1, decrement if -1
	 */
	set_view: function(direction){
		if(direction < 0 && this.inc.showpos > 0){
			this.tbody[this.inc.showpos--].classList.add("wait");
			this.tbody[this.inc.showpos].classList.remove("wait");
			for(var i=0; i<2; i++){
				if(this.inc.showpos === 0) this.inc.ctrl[i].left.classList.add("wait");
				if(this.inc.showpos === this.inc.maxpos - 1){
					this.inc.ctrl[i].right.classList.remove("wait");
				}
			}
		}else if(direction > 0 && this.inc.showpos < this.inc.maxpos){
			this.tbody[this.inc.showpos++].classList.add("wait");
			this.tbody[this.inc.showpos].classList.remove("wait");
			for(var i=0; i<2; i++){
				if(this.inc.showpos === 1) this.inc.ctrl[i].left.classList.remove("wait");
				if(this.inc.showpos === this.inc.maxpos){
					this.inc.ctrl[i].right.classList.add("wait");
				}
			}
		}else return;
		
		for(var i=0; i<2; i++) this.inc.ctrl[i].status.innerText = " " + 
		(this.inc.showpos * this.inc.unit + this.inc.offset + 1) + " - "
		+ (Math.min((this.inc.showpos+1) * this.inc.unit, this.row_count) + this.inc.offset)
		+ " / " + this.inc.all + " ";
	},
	//changes the number of rows to display
	reset_tbody: function(numrows){
		this.std_tbl_rows = numrows;
		var table = this.table,
		trs = [],
		tbpos = -1;
		//remove current rows
		for(var tb=0, tbn=this.tbody.length; tb<tbn; tb++){
			if(this.tbody[tb].parentNode === table){
				table.removeChild(this.tbody[tb]);
				var tr;
				while((tr = this.tbody[tb].firstChild)) trs.push(this.tbody[tb].removeChild(tr));
			}
		}
		//reorganize tbodies
		this.row_count = trs.length;
		for(var i=0; i <this.row_count ; i++) {
			if(i % this.std_tbl_rows === 0){
				if(!this.tbody[++tbpos]) this.tbody.push(Util.dom.element("tbody"));
				table.appendChild(this.tbody[tbpos]);
				if(tbpos === 0) this.tbody[tbpos].classList.remove("wait")
				else this.tbody[tbpos].className = "wait";
			}
			this.tbody[tbpos].appendChild(trs[i]);
		}
		//reset controls
		var inc_ctrl = this.setup_inc_ctrl(table);
		if(inc_ctrl){
			var div = this.inc_ctrl[0].parentNode;
			div.replaceChild(inc_ctrl[0], this.inc_ctrl[0]);
			div.replaceChild(inc_ctrl[1], this.inc_ctrl[1]);
			this.inc_ctrl = inc_ctrl;
		}
	},
	//add English labels for counted item subject td's
	add_elabels: function(cis_tds, table, theadr){
		var keyarr = Object.keys(cis_tds);
		if(keyarr.length === 0) return;	//only if uri vars
		else if(keyarr.length > 1000) keyarr = keyarr.slice(0, 999);
		var that = this,
		enlbl = " en labels",
		query = "SELECT ?cv ?en WHERE{\n\tVALUES ?cv {\"" + keyarr.join('" "') + "\"}\n" +
			"\tBIND(IRI(?cv) as ?s)\n\t?s <http://schema.org/name> ?en . FILTER(lang(?en)=\"en\")\n}",
		service = this.qh.set_service("POST"),
		binds,
		add_label = function(res){
			if(!(binds = that.qh.check_res(res, "no en labels found"))) return false;
			binds.forEach(function(bind){
				var td = cis_tds[bind.cv.value],
				label = Util.str.trim(bind.en.value, 40, [36, 0]),
				span = Util.dom.element("span", label);
				span.className = "subtext";
				td.appendChild(span);
			});
		};
		//switcher
		var btn = Util.dom.element("span", "add" + enlbl, [["class", "subtext pseudolink"]]);
		btn.addEventListener("click", function(ev){
			var t = this.innerText;
			if(t.match(/^add/)) do_query();
			else if(t.match(/^show/)){
				table.classList.remove("nosubtext");
				this.innerText = "hide" + enlbl;
			}else{
				table.classList.add("nosubtext");
				this.innerText = "show" + enlbl;
			}
		});
		if(Util.ulang !== "ja") do_query();	//add later if ja
		theadr.firstChild.appendChild(btn);
		
		//get labels by query and add them
		function do_query(){
			that.qh.handler(service, query, add_label);
			btn.innerText = "hide" + enlbl;
		}
	}
};

//Utilities to be called from any class
var Util = {
	//snorql_def.jsに記述しておき、Snorql.init_homedefで設定する
	homelabel: null,
	defaulturi: "",
	numformat: function(num, zeros){
		return (zeros + num).slice(- zeros.length);
	},
	//toggle classname of an element (e.g. called from 'image' <th> to toggle <table> class, set by _createTableHeader)
	cls_toggler: function(elt, classname){
		if(elt.classList.contains(classname)) elt.classList.remove(classname);
		else elt.classList.add(classname);
	},
	//easy DOM handlers
	dom: {
		byid: function(id){
			return document.getElementById(id);
		},
		element: function(elt, str, attr){
			var node = document.createElement(elt);
			//if(str) node.appendChild(this.text(str));	//2019-02-11
			if(str) node.innerText = str;	//2019-02-11
			if(attr) attr.forEach(function(at){node.setAttribute(at[0], at[1]);});	//2020-03-24
			return node;
		},
		text: function(str){
			return document.createTextNode(str);
		},
		sve: function(elt, attrs){
			var e = document.createElementNS("http://www.w3.org/2000/svg", elt);
			if(attrs) attrs.forEach(function(attr){e.setAttribute(attr[0], attr[1])});
			return e;
		}
	},
	ulang: (navigator.userLanguage || navigator.language).substr(0, 2).toLowerCase(),
	lang_limit: [80, 150, 120, 100],
	lang_trim_offset: [[38, 36], [92, 50], [62, 50], [50, 42]],
	/**
	 * trim long URI for display purpose
	 * @param {DOMNode} elt	the element whose content to be the URI string
	 * @param {String} dispuri	URI to be displayed
	 * @param {Integer} numvars	number of select variables (more vars, shorter disp)
	 */
	url_disp: function(elt, dispuri, numvars){
		var limit = this.lang_limit[numvars] || this.lang_limit[0],
		offset = this.lang_trim_offset[numvars] || this.lang_trim_offset[0],
		len = dispuri.length;
		if(len < limit){
			elt.innerText = dispuri;
			return ;
		}
		elt.appendChild(this.dom.text(dispuri.substr(0, offset[0])));
		if(offset[1]){
			elt.appendChild(exspn(offset[0] + 1, len - offset[1] - offset[0]));
			elt.appendChild(this.dom.text(dispuri.substr(len - offset[1], offset[1])));
		}else{
			elt.appendChild(exspn(offset[0] + 1));
		}
		function exspn(st, ed){
			var splitter = " ... ",
			trstr = ed ? dispuri.substr(st, ed) : dispuri.substr(st),
			span = Util.dom.element("span", splitter);
			span.className = "exspn";
			span.title = "expand \"" + trstr + "\"";
			span.addEventListener("click", function(ev){
				var o = ev.target;
				if(o.innerText === splitter){
					o.innerText = trstr;
					o.title = "collapse long uri";
					o.classList.add("expanded");
				}else{
					o.innerText = splitter;
					o.title = "expand \"" + trstr + "\"";
					o.classList.remove("expanded");
				}
				ev.stopPropagation();
				ev.preventDefault();
			});
			return span;
		}
		
	},
	str: {
		sprintf: function(templ, replace_arr){
			replace_arr.forEach(function(rep, i){
				templ = templ.replace("%s" + i + "%", rep);
			});
			return templ;
		},
		trim: function(str, limit, offset){
			var len = typeof(str) === "string" ? str.length : 0;
			if(len > limit){
				str = str.substr(0, offset[0])
				+ " ..." + (offset[1] ? " " + str.substr((len - offset[1]), offset[1]) : "");
			}
			return str;
		},
		langtext: function(text, lang){
			return text instanceof Array ? text[lang] : text;
		}
	},
	hilite: function(elt){
		var m = elt.innerText.match(/\(excerpts re\. (\w+)\)/);
		if(!m) return;
		elt.innerHTML = elt.innerHTML.replace(new RegExp("(" + m[1] + ")", "ig"), "<em>" + RegExp.$1 + "</em>");
	},
	/*
	split_uri: function(uri, local_only){
		var m = uri.match(/^(.+?)[\/#]([^\/#]+)$/);
		return local_only ? m[2] : [m[1], m[2]];
	},
	*/
	uri: {
		split: function(uri, local_only){
			var m = uri.match(/^(.+?[\/#])([^\/#]+)$/);
			return local_only ? m[2] : [m[1], m[2]];
		},
		qname2uri: function(qname, nsmap){
			var nslocal = qname.split(":");
			return nsmap[nslocal[0]] + nslocal[1];
		}
	},
	//setup proper HTML title element
	set_title: function(app, qtype, sqfobj){
		if(!this.current_query){
			this.current_query = this.example.textarea ? this.example.textarea.value : "";
		}
		var title, is_count;
		if(qtype === "SELECT"){
			var matched = this.current_query.match(/(SELECT .*?(count\(.*\))?,*?) ?(FROM|WHERE|\x7B)/i);
			is_count = (matched && matched[2]) ? "count:" : "";	//for count() query
			title = matched ? matched[1] : "";
			if(sqfobj){
				var rows = sqfobj._results,
				row = rows[0],
				vars = sqfobj._variables,
				vlabel, vlocal, tpfx, i = 0;
				for(var v in row){
					if(row[v].type === "literal"){
						vlabel = vars[i] + "=" + Util.str.trim(row[v].value, 12, [10, 0]);
						foundpos = i;
						break;
					}else if(row[v].type === "uri" && !vlocal){
						var m = row[v].value.match(/[#\/]([^#\/]+)\/?$/);
						if(m) vlocal = vars[i] + "=" + Util.str.trim(m[1], 18, [6, 6]);
					}
					i++;
				}
				if((tpfx = (vlocal ? (vlocal + (vlabel ? " (" + vlabel + ")" : "")) : vlabel))){
					//(vlabel ? (vlabel + (vlocal ? " (" + vlocal + ")" : "")) : vlocal)
					tpfx = "📃" + is_count + tpfx + (rows.length > 1 ? " etc": "");	//📜📚📋📝
					title = tpfx + " by " + title;
				}
			}
		}else if(qtype === "DESCRIBE"){
			var qname,
			matched = this.current_query.match(/DESCRIBE ([^ ]+)/i);
			if(matched[1].match(/^<(.*?)([^\/#]+)>/)){
				var pfx, local = RegExp.$2;
				if(this.defaulturi === RegExp.$1) pfx = ":";
				else for(var pfxc in app.ns){
					if(app.ns[pfxc] === RegExp.$1){
						pfx = pfxc + ":";
						break;
					}
				}
				qname = (pfx || "ns01:") + local;
			}else qname = matched;	//\"\"
			title = (app.title ? app.title + ": " : "") + "Description of " + Util.str.trim(qname, 50, [20, 20]);
			description_microdata(app.uris.tgrsrc);//"✍" + 
		}else title = qtype;
		document.title = title + " - Snorql" + (this.homelabel ? " for " + this.homelabel : "");
		this.map.refresh();
		document.documentElement.setAttribute("lang", this.ulang==="ja" ? "ja" : "en");
		
		return is_count;	//return whether the query includes count() function for add_elabels
		
		function description_microdata(uri){
			var docelt = document.documentElement,
			aboutlink = Util.dom.element("link");
			docelt.setAttribute("itemscope", "");
			docelt.setAttribute("itemid", location.href);
			docelt.setAttribute("itemtype", "http://schema.org/WebPage");
			aboutlink.setAttribute("itemprop", "about");
			aboutlink.setAttribute("href", uri);
			document.head.appendChild(aboutlink);
			document.querySelector("title").setAttribute("itemprop", "name");
		}
	},
	//very simple XHr handler (see add_img_plus_from_isbn)
	xhr:{
		getp: function(url, success){
			var that = this;
			return new Promise(function(success){
				that.get(url, success);
			});
		},
		get: function(url, success){
			var xreq = new XMLHttpRequest();
			xreq.onreadystatechange = function(){
				if(xreq.readyState !== 4) return;
				if(xreq.status === 200) {
					var resvar = (xreq.responseType === "json") ? xreq.response: JSON.parse(xreq.responseText);
					success(resvar);
					return true;
				}else{
					console.error(xreq.status, xreq.statusText, url);
					return false;
				}
			}
			try{
				xreq.open("GET", url, true);
				xreq.responseType = "json";
				xreq.send("");
			}catch(e){
				console.error(e);
			}
		}
	},
	//change link with a modifier key (eg. external link with a parameter)
	link_modifier: function(tgelt, url, modifier){
		var key = modifier || "Shift";
		tgelt.addEventListener("click", function(ev){
			if(ev.getModifierState(key)) location.href=url;
		});
	},
	misc: {
		rset: function(set, ofst){
			var sv = "https://";
			set.forEach(function(ch){sv += String.fromCharCode(ch + ofst);});
			return sv;
		}
	},
	//removed nav.save_uris, nav.test_saved
	//query example setter. provide examples in snoral_def.js
	example: {
		queries: [],
		ns: {},
		textarea: null,
		//presel is example # to be initially selected (zero base)
		prepare: function(textareaid, presel){
			if(Snorqldef.example_ns) this.ns = Snorqldef.example_ns;
			this.textarea = Util.dom.byid(textareaid);
			if(!Snorqldef.example) return null;
			var that = this,
			labelkey,
			sel = Util.dom.element("select");
			if(Util.ulang === "ja"){
				add_option("― クエリ例 ―", "");
				labelkey = "label";
			}else{
				add_option("=== Query Examples ===", "");
				labelkey = "label_en";
			}
			Snorqldef.example.forEach(function(ex, i){
				var prolog = "";
				ex.ns.forEach(function(pfx){
					if(this.ns[pfx]) prolog += "PREFIX " + pfx + ": <" + this.ns[pfx] + ">\n";
				}, this);
				add_option(ex[labelkey], prolog + ex.query, i);
			}, this);
			sel.addEventListener("change", function(ev){Util.example.set(ev.target.selectedIndex);});
			this.textarea.parentNode.appendChild(sel);
			if(typeof(presel) !== "undefined") this.set(presel + 1);
			
			function add_option(label, query, i){
				var opt = Util.dom.element("option");
				opt.appendChild(Util.dom.text(label));
				if(i === presel) opt.setAttribute("selected", "selected");
				sel.appendChild(opt);
				that.queries.push(query);
			}
		},
		set: function(i){
			if(i===0) return;
			this.update_qtarea(this.queries[i]);
		},
		update_qtarea: function(qtext){
			this.textarea.value = qtext;
			if(CMEditor) CMEditor.setValue(qtext);
		}
	},
	intro: function(hdef, ressec){
		var lang = this.ulang === "ja" ? 0 : 1,
		idef = hdef.intro,
		homelink = "<a href=\"" + hdef.uri + "\">" + hdef.label + "</a>",
		snorqllink = "<a href=\"https://github.com/kurtjx/SNORQL\">Snorql</a>",
		eplink = "<a href=\"" + Snorqldef.vars._endpoint + "\">" + ["基本エンドポイント", "basic endpoint"][lang] + "</a>";
		gen_elt(ressec, "p", Util.str.sprintf([
			"%s0%は、SPARQLクエリ構築支援と分かりやすい結果表示のために、%s1%を<a href=\"https://www.kanzaki.com/works/ld/jpsearch/snorql_ldb-about\">拡張したツール</a>です。アプリケーションからのSPARQLクエリには%s2%を利用してください。", 
			"%s0% is an <a href=\"https://www.kanzaki.com/works/ld/jpsearch/snorql_ldb-about\">extension</a> of %s1%<a href=\"https://github.com/kurtjx/SNORQL\">Snorql</a> to make SPARQL query building easier and show results much understandable. Use %s2% for application query."
		][lang], 
			["Snorql for " + hdef.label, snorqllink, eplink]
		));
		var ul = this.dom.element("ul");
		gen_elt(ul, "li", [
			"入力欄下にクエリ例があります。",
			"Query examples are provided below the text area."
			/*
			"入力欄下にクエリ例があります。<a href=\"https://jpsearch.go.jp/api/sparql-explain/\">ジャパンサーチSPARQLエンドポイント解説</a>も参照してください。", 
			"Query examples are provided below the text area. See also <a href=\"https://www.kanzaki.com/works/ld/jpsearch/primer/\">Japan Search RDF Model Primer</a> for the general description."
			*/
		][lang]);
		if(idef) idef.forEach(function(v){
			gen_elt(ul, "li", Util.str.langtext(v, lang));
		});
		ressec.appendChild(ul);
		ressec.classList.add("intro");
		
		function gen_elt(pelt, type, html){
			var elt = Util.dom.element(type);
			elt.innerHTML = html;
			pelt.appendChild(elt);
		}
	}
};
//query rewriter
Util.queries = {
	current_q: null,
	replace_template: null,
	maxres: 1000,
	replace_q: function(uri, as_literal){
		if(!this.current_query) this.current_q = Util.example.textarea.value;
		if(this.replace_template === null) try{
			var sqt, solabel = "?label", colabel = "?label ; ";
			if(Snorqldef && (sqt = Snorqldef.qtemplate)){
				solabel = sqt.solslabel;
				colabel = sqt.condlabel;
			}
			this.replace_template = this.current_q
			.replace(/\s*GROUP BY.*/i, " LIMIT " + this.maxres)
			//.replace(/SELECT (distinct )?\?([\w\d]+) \(count\(.*?\?(\w+)\) as \?count\)/i, "SELECT DISTINCT __$3 " + solabel); //original pattern ([\w\d]+) not allow extra vars btw 1st var and count(var)
			.replace(/SELECT\s+(distinct )?\?(.+)\(count\(.*?\?(\w+)\) as \?count\)/i, "SELECT DISTINCT __$3 " + solabel);
			var v = [RegExp.$2, RegExp.$3],	//[primary var, count var]
			v1 = v[0].split(' ');	//in case other vars found btw 1st var and count(var) 2020-06-18
			if(v1.length > 1) v[0] = v1[0];//.replace(/\?/g, '\\?').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
			this.replace_template = this.replace_template
			.replace(new RegExp("\\?" + v[0]+"\\b", "g"), "%uri%")
			.replace(new RegExp("(\\?" + v[1] + "\\b)"), "$1 rdfs:label " + colabel)
			.replace(new RegExp("__" + v[1]), "?" + v[1])
			.replace(/\(sample\((.*?)\) as.*?\)/, "$1");	//in case include sample image in aggr query 2019-12-12
			//if the count variable is cho or s or uri, then add optional image query
			if(v[0] === "ndc") this.replace_ndcq();
			else if(v[1] === "cho" || v[1] === "s" || v[1] === "uri") this.replace_imgq(v);
			if(as_literal){
				//in case aggregation key is a literal variable
				this.replace_template = this.replace_template
				.replace(/\?label \?label/, "?label")
				.replace(/; ?rdfs:label \?label/, "")
				.replace(/FILTER ?\(?str(starts|ends)\(.*?\)\)?\s*\.?\n?/i, ".\n");
			}
		}catch(e){
			console.log("query replace template failed", e);
			this.replace_template = false;
		}
		//in case template failed, simply return the uri
		else if(this.replace_template === false) return uri;
		var encl = as_literal ? ['"', '"'] : ["<", ">"],
		query = this.replace_template.replace(/%uri%/g, encl[0] + uri + encl[1]);
		return "?query=" + encodeURIComponent(query);
	},
	replace_imgq: function(v){
		var im = this.replace_template.match(/schema:image\s(\?\w+)/),
		//where_re = new RegExp("WHERE\\s*{", "i");	//has a problem with FROM
		where_re = new RegExp("((FROM|WHERE\\s*{))", "i");
		if(im){
			//in case original query has image part
			//and not has ?image in select variables 2019-12-12
			if(! this.replace_template.match(new RegExp("SELECT .*\\" + im[1] + " .*WHERE\\s*{", "i")))
			this.replace_template = this.replace_template
			.replace(new RegExp("\\(sample\\(\\"+ im[1] + "\\) as .+?\\)\\s*"), "")
			.replace(where_re, im[1] + " $1");
			//.replace(where_re, im[1] + " WHERE {");
		}else{
			//otherwise
			this.replace_template = this.replace_template
			.replace(where_re, "?image $1")
			//.replace(where_re, "?image WHERE {")
			.replace(new RegExp("}\\s*LIMIT"), "\tOPTIONAL {?" + v[1] + " schema:image ?image}\n} LIMIT");
		}
	},
	replace_ndcq: function(){
		this.replace_template = this.replace_template
		.replace(/\?clabel/, "(sample(?creator) as ?creator) ?date")
		.replace(/\t*\?what \(skos:closeMatch\|skos:broaderMatch\).*?\n/, "")
		.replace(/\t*FILTER.*?ndc9#.*?\n/, "")
		.replace(/%uri% a .*ndcvocab.*?;\s+skos:broader.*?;\n/, "%uri%")
		.replace(/(OPTIONAL ?{ ?)?%uri%\s+rdfs:label \?clabel( ?\.? ?})?/, "OPTIONAL{?cho schema:creator/rdfs:label ?creator}\n\tOPTIONAL{?cho schema:datePublished ?date}")
		.replace(/LIMIT/, " ORDER BY desc(?date) LIMIT");
	},
	/**
	 * set image var td content. called from SPARQLResultFormatter._getLinkMaker.
	 * @param {String} uri	URI of the image
	 * @param {String} descuri	describer URI for the subject item (set by SPARQLResultFormatter._uri_describer)
	 * @param {String} relpath	relative path to image items directory (set by Snorql)
	 */
	image_q: function(uri, descuri, relpath){
		var img = Util.dom.element("img");
		uri = uri.replace(/(ogiNikki\/.*?)\/0001.jpg/, "$1/0004.jpg");
		img.src = uri;
		img.className = "thumb";
		img.alt = uri;	//URI is the actual value of the result sets. alt makes it possible for users to copy the value
		Util.img.on_event(img, {w:50});
		if(descuri){
			//if item uri (i.e. ?s, ?uri, ?cho) found in SPARQLResultFormatter._formatURI
			//make thumbnail click to load the description, rather than image itself
			var a = Util.dom.element("a");
			a.title = "link to the item description.\nimage = " + uri;
			a.href = descuri;
			a.appendChild(img);
			return a;
		}else{
			//no link, only shows the thumbnail. title attr for tooltip. also alt (see above) makes value copy possible
			img.title = uri;
			return img;
		}
	},
	//expand literal aggregation key, e.g. {?s schema:description ?key filter strstarts(?key, "format")} group by ?key
	add_pseudo_qlink: function(elt, val){
		var q = this.replace_q(val, true);
		elt.addEventListener("click", function(ev){
			if(ev.getModifierState("Control")){
				location.href = q;
				ev.preventDefault();
				return false;
			}
		});
		elt.classList.add("pseudoquery");
		elt.title = "ctrl+click to expand query";
	},
	//virtuoso specific preamble
	preamble: function(query, qtype){
		if(qtype === "DESCRIBE"){
			//query = "define sql:describe-mode \"CBD\"\n" + query;
		}else if(qtype === "SELECT" && query.match(/SELECT \?type \(count.*\)/i)){
			var exclude = "";
			["http://www.w3.org/2002/07/owl#",
			"http://www.w3.org/ns/ldp#",
			"http://www.openlinksw.com/schemas/virtrdf#"
			].forEach(function(uri){
				exclude += "define input:default-graph-exclude <" + uri + ">\n";
			});
			query = exclude + query;
		}
		return query;
	},
	count_q: function(){
		var current_q = CMEditor.getValue();
		CMEditor.setValue(current_q.
			replace(/SELECT (DISTINCT )?(\?\w+) .*WHERE/i, "SELECT ?key (count($1$2) as ?count) WHERE").
			replace(/LIMIT \d+/i, "GROUP BY ?key ORDER BY desc(?count)")
		);
	},
	add_countq: function(){
		var trigger = Util.dom.element("span", "🕸", [["class","strigger"], ["title", "count query"]]);
		trigger.onclick = function(){Util.queries.count_q();};
		document.getElementById("querytext").parentNode.appendChild(trigger);
	}
};

//add map w/ Leaflet
Util.map = {
	mymaps: [],
	def: (Snorqldef.ldb && Snorqldef.ldb.mapd) ? Snorqldef.ldb.maps[Snorqldef.ldb.mapd] : {
		template:  ["https://{s}.tile.osm.org/{z}/{x}/{y}.png",	//ja
			"https://{s}.tile.osm.org/{z}/{x}/{y}.png"],	//en
		lp: "qparam",
		fillopc: 0.15,
		aerial: "https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg",
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
	},
	linkd: Snorqldef.ldb.mapd || "openstreetmap.org",
	setup: function(tgobj, lat, po, ns, rdftype, withinhash, selfhash){
		//requires Leaflet
		if(!window.L) return false;
		var long,
		zlevel = 10,
		use_pointmarker = false,
		langidx = Util.ulang === "ja" ? 0 : 1,
		//geohash = this.getval(po, ns.jps + "within"),
		mapdiv = Util.dom.element("div"),
		precision = withinhash ? withinhash.length : 7,
		testhash = withinhash || selfhash || "",
		injp = testhash.match(/^(w[u-z]|x[n-p])/) ? true : false;
		if(lat){
			long = this.getval(po, ns.schema + "longitude");
		}else{
			lat = po.lat[0].value;
			long = po.long[0].value;
			if(precision > 5) precision = 5;
		}
		zlevel = precision > 4 ? precision + 4 : (precision === 4 ? 9 : (precision >= 3 ? precision + 3 : precision + 2)); //precision + 1;//(precision === 3 ? 4 : precision) ;//4;
		if(precision >= 6 && testhash.match(/^xn7(6[c-u]|7[3-9a-j])/)) zlevel += 2;	//tokyo
		else if(testhash === "xps" || testhash === "xn") zlevel--;	//Hokkaido or Japan
		else if(!injp){	//not japan
			if(precision < 6) zlevel --;
			if(this.linkd === "maps.gsi.go.jp" && zlevel > 5){
				zlevel = 5;	//8
				use_pointmarker = true;
			}else{
				if(zlevel === 8) zlevel = 7;	//city level
			}
		}
		if(zlevel > 6) use_pointmarker = true;
		//console.log(withinhash, zlevel, this.linkd, injp);
		tgobj.insertBefore(mapdiv, tgobj.firstChild);
		tgobj.classList.add("map");
		tgobj.previousSibling.classList.add("maplabel");
		var mymap = L.map(mapdiv, {center: [lat, long], zoom: zlevel, zoomControl: false}),
		link = this.set_dlink(lat, long, zlevel),
		marker;
		L.tileLayer(this.def.template[langidx], {
			attribution: this.def.attribution
		}).addTo(mymap);
		if(use_pointmarker) marker = L.marker([lat, long]);
		else{
			var rad = zlevel > 5 ? 1400000 : (zlevel > 3 ? 2600000 : 
				(zlevel > 1 ? (withinhash === "xn" ? 2800000 : 1800000) : 800000));
			marker = L.circle([lat, long], {stroke: false, fillColor: "blue", fillOpacity: this.def.fillopc, radius: rad / (zlevel*zlevel) });
			//console.log(precision, zlevel, rad, this.def);
		}
		marker.addEventListener("click", function(){location.href = link;});
		marker.addTo(mymap);
		this.mymaps.push(mymap);
	},
	set_dlink: function(lat, long, zlevel){
		var dlink = "https://" + this.linkd,
		zoom = (zlevel === 6) ? 8 : zlevel + 1;
		if(this.def.lp === "qparam"){
			dlink += "/?mlat=" + lat + "&mlon=" + long + "&zoom=" + zoom;
		}else{
			dlink += "/#" + zoom + "/" + lat + "/" + long;
		}
		return dlink;
	},
	getval: function(po, prop){
		var o = po[prop];
		return o ? o[0].value : null;
	},
	//need refresh for late appended map
	refresh: function(){
		if(this.mymaps.length) this.mymaps.forEach(function(m){m.invalidateSize();});
	},
	geohash_bounds: function (myhash) {
		const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
		var evenBit = true, 
		latMin =  -90, latMax =	 90,
		lonMin = -180, lonMax = 180;
		for(var i=0; i<myhash.length; i++) {
			var chr = myhash.charAt(i),
			idx = base32.indexOf(chr);
			if(idx === -1) throw new Error('Invalid geohash');
			for(var n=4; n>=0; n--) {
				var bitN = idx >> n & 1;
				if(evenBit) {
					var lonMid = (lonMin+lonMax) / 2;
					if(bitN === 1) lonMin = lonMid;
					else lonMax = lonMid;
				}else{
					var latMid = (latMin+latMax) / 2;
					if (bitN === 1) latMin = latMid;
					else latMax = latMid;
				}
				evenBit = !evenBit;
			}
		}
		var latc = (latMin + latMax)/2,
		lonc = (lonMin + lonMax)/2;
		latc = latc.toFixed(Math.floor(2-Math.log(latMax-latMin)/Math.LN10));
		lonc = lonc.toFixed(Math.floor(2-Math.log(lonMax-lonMin)/Math.LN10));
		return {bounds :[[latMin, lonMin], [latMax, lonMax]], center: [latc, lonc]};
	}
	
};
Util.img = {
	//replacement image on error (not found)
	on_event: function(imgelt, opt){
		var nfimg = this.gen_icon(opt.which, opt.w, opt.h || opt.w);
		if(Snorqldef.img_extra) Snorqldef.img_extra(opt, imgelt.src);
		imgelt.addEventListener("error", function(ev){
			if(this.getAttribute("data-org-src")){
				//if notfound image has a problem, throw an error to prevent loop
				throw new Error("replacement image " + nfimg + " not valid");
			}else if(!opt.recover || this.src === opt.recover){
				//if opt.recover is not provided, or recover image not found
				this.setAttribute("data-org-src", this.src);
				this.classList.add("still");
				this.title = "image not found";
				this.src = nfimg;
				this.setAttribute("alt", "*" + this.getAttribute("alt"));
			}else if(opt.recover){
				//if opt.recover is provided, try it first
				this.src = opt.recover;
			}else{
				console.error("under specified error option", opt);
			}
		});
		imgelt.addEventListener("load", function(ev){
			//if image width is smaller than default max, then no zoom-in cursor
			//if(this.naturalWidth < 200) this.classList.add("still");
			if(this.naturalWidth > 200){ 
				if(!this.classList.contains("still")){
					imgelt.addEventListener("click", function(evt){
						if(this.classList.contains("zoomed")) this.classList.remove("zoomed");
						else this.classList.add("zoomed");
						evt.stopPropagation();
					});
					document.body.addEventListener("click", function(ev){
						if(imgelt.classList.contains("zoomed")) imgelt.classList.remove("zoomed");
					});
				}
			}else this.classList.add("still");
		});
	},
	gen_icon: function(which, w, h, fcolor){
		var vb, pparam;
		if(!fcolor) fcolor = "#9999cc";
		if(which === "book"){
			vb = "-4 -2 52 50",
			pparam = {"fill-rule":"evenodd","clip-rule":"evenodd",fill:fcolor,d:"M41,46L41,46c0,0.553-0.447,1-1,1H12l0,0c-2.762,0-5-2.238-5-5V6c0-2.761,2.238-5,5-5l0,0h26l0,0c0.414,0,0.77,0.252,0.922,0.611C38.972,1.73,39,1.862,39,2v0v7l0,0h1l0,0c0.278,0,0.529,0.115,0.711,0.298C40.889,9.479,41,9.726,41,10c0,0,0,0,0,0V46z M9,42L9,42L9,42c0,1.657,1.344,3,3,3h3V11h-3l0,0c-1.131,0-2.162-0.39-3-1.022V42z M37,9V3H12l0,0l0,0c-1.656,0-3,1.343-3,3s1.344,3,3,3H37L37,9z M39,11H17v34h22V11z M12,7c-0.553,0-1-0.448-1-1s0.447-1,1-1h22c0.553,0,1,0.448,1,1s-0.447,1-1,1H12z"};
			if(!w){w = 128, h = 150;}
		}else{
			vb = "-1 0 25 25";
			pparam = {fill:fcolor,d:"M14 2H6C4.89 2 4 2.9 4 4V20C4 21.11 4.89 22 6 22H18C19.11 22 20 21.11 20 20V8L14 2M18 20H6V4H13V9H18V20M15 13C15 14.89 12.75 15.07 12.75 16.76H11.25C11.25 14.32 13.5 14.5 13.5 13C13.5 12.18 12.83 11.5 12 11.5S10.5 12.18 10.5 13H9C9 11.35 10.34 10 12 10S15 11.35 15 13M12.75 17.5V19H11.25V17.5H12.75Z"};
		}
		return this.gen_svgdata({viewBox:vb, width: w, height: h}, this.gen_elt("path", pparam));
	},
	gen_svgdata: function(atr, cont){
		atr.xmlns = "http://www.w3.org/2000/svg";
		return "data:image/svg+xml," + encodeURIComponent(this.gen_elt("svg", atr, cont));
	},
	gen_elt: function(elt, atr, content){
		var tag = "<" + elt;
		if(atr) for(var key in atr) tag += " " + key + "='" + atr[key] + "'";
		return tag + (content ? ">" + content + "</" + elt : "/") + ">";
	}
};
Util.iiif = {
	logo: null,
	viewer: "/works/2016/pub/image-annotator?u=",
	set_viewer_link: function(manifest, canvas, indv){
		 return this.viewer + manifest + (canvas ? "&canvas=" + canvas : "") + (indv ? "&vhint=individuals" : "");
	},
	ld: {p:[["b","M 65.2422,2178.75 775.242,1915 773.992,15 65.2422,276.25 v 1902.5"],["b","m 804.145,2640.09 c 81.441,-240.91 -26.473,-436.2 -241.04,-436.2 -214.558,0 -454.511,195.29 -535.9527,436.2 -81.4335,240.89 26.4805,436.18 241.0387,436.18 214.567,0 454.512,-195.29 535.954,-436.18"],["r","M 1678.58,2178.75 968.578,1915 969.828,15 1678.58,276.25 v 1902.5"],["r","m 935.082,2640.09 c -81.437,-240.91 26.477,-436.2 241.038,-436.2 214.56,0 454.51,195.29 535.96,436.2 81.43,240.89 -26.48,436.18 -241.04,436.18 -214.57,0 -454.52,-195.29 -535.958,-436.18"],["b","m 1860.24,2178.75 710,-263.75 -1.25,-1900 -708.75,261.25 v 1902.5"],["b","m 2603.74,2640.09 c 81.45,-240.91 -26.47,-436.2 -241.03,-436.2 -214.58,0 -454.52,195.29 -535.96,436.2 -81.44,240.89 26.48,436.18 241.03,436.18 214.57,0 454.51,-195.29 535.96,-436.18"],["r","m 3700.24,3310 v -652.5 c 0,0 -230,90 -257.5,-142.5 -2.5,-247.5 0,-336.25 0,-336.25 l 257.5,83.75 V 1690 l -258.61,-92.5 V 262.5 L 2735.24,0 v 2360 c 0,0 -15,850 965,950"]],vb:"0 0 493.35999 441.33334",tm:"matrix(1.3333333,0,0,-1.3333333,0,441.33333) scale(0.1)",c:{"b":"2873ab","r":"ed1d33"}},gen: function(h){var elt=Util.dom.sve("svg",[["viewBox",this.ld.vb],["height",h]]),g=Util.dom.sve("g",[["transform",this.ld.tm]]);this.ld.p.forEach(function(pa){g.appendChild(Util.dom.sve("path",[["d",pa[1]],["style","fill:#"+this.ld.c[pa[0]]]]));},this);elt.appendChild(g);return elt;}
};

Util.waka = {
	wbox: null,
	show: function(obj, div){
		var body = obj.rdfjson[obj.uris.tgrsrc],
		sinfo =  obj.rdfjson[obj.uris.tgrsrc + "#sourceinfo"],
		provider = Util.uri.split(sinfo[obj.ns.schema + "provider"][0].value, true),
		wo;
		switch(provider){
		case "二十一代集データベース":
			wo = this.get_d21(body, obj.ns);
			break;
		case "万葉集データベース":
			wo = this.get_manyo(body, obj.ns);
			break;
		default:
			return;
		}
		var kami = wo.vparts.splice(0,3).join(" "),
		shimo = [],
		nparts = wo.vparts.length;
		for(var i=0; i<nparts; i += 2) shimo.push(wo.vparts.slice(i, i+2).join(" "));
		var wbox = Util.dom.element("div"),
		wocbar = this.wocbar.set(wbox),
		nav = this.set_prev_next(obj.uris.tgrsrc, wo.zeros);
		vbox = Util.dom.element("span");
		vbox.className = "verse";
		wbox.appendChild(wocbar);
		this.wbox = wbox;
		nav.forEach(function(elt){wbox.appendChild(elt)});
		//initial close if verse is too long;
		if(nparts > 10 || wo.vlen > 64) this.wocbar.toggle(wocbar, true);
		if(wo.kotoba) this.add_box(wbox, wo.kotoba, "kotoba");
		if(wo.author) this.add_box(wbox, wo.author, "author");
		this.add_box(vbox, kami, "kami");
		shimo.forEach(function(simo){this.add_box(vbox, simo, "shimo")}, this);
		wbox.appendChild(vbox);
		wbox.classList.add("waka");
		div.insertBefore(wbox, div.firstChild);
	},
	//Waka open/close bar
	wocbar: {
		closer: {char: "▲", msg: "close waka box"},
		opener: {char: "▼", msg: "open waka box"},
		set: function(wbox){
			wbar = Util.dom.element("div", this.closer.char);
			wbar.className = "wbar";
			wbar.title = this.closer.msg;
			wbar.addEventListener("click", function(){
				Util.waka.wocbar.toggle(this);
			});
			return wbar;
		},
		toggle: function(obj, to_close){
			console.log(obj.innerText, to_close);
			if(obj.innerText === this.closer.char || to_close){
				Util.waka.wbox.classList.add("hide");
				obj.innerText = this.opener.char;
				obj.title = this.opener.msg;
			}else{
				Util.waka.wbox.classList.remove("hide");
				obj.innerText = this.closer.char;
				obj.title = this.closer.msg;
			}
		}
	},
	get_d21: function(body, ns){
		var verse = body[ns.rdfs + "label"][0].value || null,
		desc = body[ns.schema + "description"] || null,
		kotoba,
		author;
		if(!verse || !desc) return false;
		desc.forEach(function(d){
			if(d.value.match(/^［和歌作者原表記］(.*)/)){
				author = RegExp.$1;
			}else if(d.value.match(/^［詞書原表記］(.*)/)){
				kotoba = RegExp.$1.replace(/＋＋/g, "〳〵");
			}
		});
		return {
			"vparts": verse.replace(/＋＋/g, "〳〵").split("／"),
			"kotoba": kotoba,
			"author": author,
			"zeros": "0000000000",
			"vlen": verse.length
		};
	},
	get_manyo: function(body, ns){
		var names = body[ns.schema + "name"] || null,
		desc = body[ns.schema + "description"] || null,
		author = body[ns.schema + "creator"] || null,
		verse,
		kotoba;
		if(!names || !desc) return false;
		names.forEach(function(n){
			if(n.lang === "ja-kana") verse = n.value;
		});
		desc.forEach(function(d){
			if(d.value.match(/^題詞: (.*)/)) kotoba = RegExp.$1;
			if(!verse && d.value.match(/^訓読: (.*)/)) verse = RegExp.$1.replace(/（.*?）/g, "");
		});
		if(!verse) verse = names[0].value;
		return {
			"vparts": verse.split(" "),
			"kotoba": kotoba,
			"author": author ? author[0].value.replace(/^.*name\//, "") : null,
			"zeros": "0000",
			"vlen": verse.length
		};
	},
	set_prev_next: function(uri, zeros){
		var pn_uri = this.get_serial_prev_next(uri, zeros, [0, 34346]),
		prev_next = [];
		[{"class": "prev", "char": "▶"}, {"class": "next", "char": "◀"}].forEach(function(obj, i){
			var ref = pn_uri[i].uri, elt;
			if(ref){
				elt = Util.dom.element("a", obj.char);
				elt.setAttribute("href", ref);
				elt.title = obj.class + ": " + pn_uri[i].label;
			}else{
				elt = Util.dom.element("span");
			}
			elt.className = "nav " + obj.class;
			prev_next.push(elt);
		});
		return prev_next;
	},
	get_serial_prev_next: function(uri, zeros, minmax){
		var m = uri.match(/^(.*[^\d])(\d+)(S\d?)?$/),
		next_id = Number(m[2]) + 1,
		prev_id = Number(m[2]) - 1;
		return [{
			"uri": prev_id < minmax[0] ? null : "?describe=" + m[1] + Util.numformat(prev_id, zeros),
			"label": prev_id
		}, {
			"uri": next_id > minmax[1] ? null : "?describe=" + m[1] + Util.numformat(next_id, zeros),
			"label": next_id
		}];
	},
	add_box: function(wbox, str, cls){
		var box = Util.dom.element("span", str.replace(/[〔〕＊]/g, ""));
		box.className = cls;
		wbox.appendChild(box);
	}
};

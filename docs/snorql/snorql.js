/** SNORQL - an AJAXy front-end for exploring RDF SPARQL endpoints
 * based on SNORQL http://www4.wiwiss.fu-berlin.de/bizer/d2r-server/
 * originally created by Richard Cyganaik
 * adopted by kurtjx https://github.com/kurtjx/SNORQL
 * Apache-2 license
 * re-adopted for Japan Search 2018-12-07 by masaka, last modified 2020-06-18
 - removed graph browse / named graph and xslt to make things simple
 - removed dependencies on prototype.js and scriptaculous.js
 - added support of CodeMirror, if it is instantiated as CMEditor
 - works better if used with snorql_ldb.js, but not necessary
 - can use multiple Snorql instances, e.g. to display more than one results tables in one page
*/
var snorql = new Snorql();
//@@added 2018-12-13
var SPARQL, D2R_namespacePrefixes, CMEditor, Snorqldef, Util,
EasySPARQL, JsonRDFFormatter, SPARQLSelectTableFormatter;

String.prototype.trim = function () {
	return this.replace(/^\s*/, "").replace(/\s*$/, "");
};

String.prototype.startsWith = function(str) {
	return (this.match("^"+str) === str);
};

function Snorql() {
	// modify this._endpoint to point to your SPARQL endpoint
	this._endpoint = null;
	// modify these to your likeing
	this._poweredByLink = 'http://www4.wiwiss.fu-berlin.de/bizer/d2r-server/';
	this._poweredByLabel = 'D2R Server';

	this._browserBase = null;
	this._namespaces = {};
	//removed here: graph, xslt related
	this.default_query = 'SELECT DISTINCT * WHERE {\n  ?s ?p ?o\n}\nLIMIT 10';
	//some initializations moved to init();
	this.relpath = "";	//override by homedef

	this.start = function() {
		this.init();
		if(Snorqldef) this.init_homedef(Snorqldef);
		//this._enableNamedGraphs = false;
		// TODO: Extract a QueryType class
		if(!this._endpoint) this._endpoint = document.location.href.match(/^([^?]*)snorql/)[1] + 'sparql';
		//moved setBrowserBase to init() 2019-04-29
		//this.setBrowserBase(document.location.href.replace(/\?.*/, ''));
		this._displayEndpointURL(this.homedef.label || null);
		this._displayPoweredBy();
		//moved setNamespaces to init() 2019-04-29
		//this.setNamespaces(D2R_namespacePrefixes);
		if(document.querySelector("a.graph-link")) this.use_browsecp = true;
		//this.updateOutputMode();
		var qparam = {
			text: null,	//querytext = sparql query (from user) -> text area default value
			query: null,	//sparql query to send to endpoint
			urlstring: document.location.search.substr(1) //queryString = url encoded query string
		},
		ressec = document.getElementById('ressection'),	//section to display the results
		resultTitle,	//heading in the result display section
		presel;
		if(Util.example){
			var m;
			if(!qparam.urlstring && (m = location.hash.match(/#ex=(\d+)/))) presel = Number(m[1]);
			Util.example.prepare("querytext", presel);
		}
		if (!qparam.urlstring) {
			//@@ modified 2018-12-08
			if(!presel) this.prepare_default(ressec);
			return;
		}
		ressec.style.display = "block";
		// no graph related
		//@@ easysql 2018-12-08
		if(EasySPARQL){
			if(!(new EasySPARQL(this._namespaces, 200).doit(this._endpoint, qparam))) return;
			if(qparam.query) resultTitle = "EasySPARQL results:";
			if(qparam.endpoint) this._endpoint = qparam.endpoint;
		}
		//removed here: browse graph. also, browse class / property are moved to this.original_class_prop_query
		//@@modified 2018-12-07
		var matched,	//regex match results array
		submatch,	//nested regex match
		desc_uri,	//URI to describe
		is_home_uri;	//flag to indicate the uri to describe is a resource in this triple store
		if ((matched = qparam.urlstring.match(/describe.([^&]*)/i))) {	//2020-04-02 missing i modifier
			desc_uri = decodeURIComponent(matched[1]).replace(/\+/g, " ");
			//in case describe as query (not api param)
			if((matched = desc_uri.match(/<([^>]+)>/))) desc_uri = matched[1];
			if(submatch = desc_uri.match(/^(.+) ?WHERE/i)){
				resultTitle = "Description of resource matched against " + submatch[1];
				qparam.text = "DESCRIBE " + desc_uri;
			}else{
				resultTitle = "Description of <" +  desc_uri + ">";
				qparam.text = "DESCRIBE <" + desc_uri + ">";
			}
			if(this.homedef.duri_pat && desc_uri.match(this.homedef.duri_pat)){
				//special treatment to describe subresourece
				if(this.homedef.data_frags){
					if(! desc_uri.match(/#/)) this.homedef.data_frags.forEach(function(frag){
						qparam.text += "\n\t<" + desc_uri + "#" + frag + ">";
					});
					else if((matched = desc_uri.match(this.homedef.dfrag_pat))){
						qparam.text += "\n\t<" + matched[1] + ">";
						this.homedef.data_frags.forEach(function(frag){
							if(matched[2] !== frag) qparam.text += "\n\t<" + matched[1] + "#" + frag + ">";
						});
					}
					is_home_uri = true;
				}else if(! desc_uri.match(/#/)) is_home_uri = true;
			}else if(this.homedef.workuri_pat && desc_uri.match(this.homedef.workuri_pat)){
				is_home_uri = true;
			}
			qparam.query = qparam.text;
		}else if ((matched = qparam.urlstring.match(/query=([^&]*)/))) {
			resultTitle = 'SPARQL results:',
			qparam.text = this._betterUnescape(matched[1]);
			qparam.query = this._getPrefixes() + qparam.text;
			
		}else if(this.use_browsecp){
			//browse class / property works iiif "Browse" section presents
			resultTitle = this.original_class_prop_query(qparam);
		}
		if (!qparam.text) {
			//@@ modified 2018-12-08
			this.prepare_default(ressec);
			return;
		}
		document.getElementById('querytext').value = qparam.text;
		if(CMEditor) CMEditor.setValue(qparam.text);	//@@ CodeMirror support 2018-12-09

		this.displayBusyMessage();
		//moved service init to set_service 2019-04-29
		// AndyL changed MIME type and success callback depending on query form...
		var that = this;
		var exp = /^\s*(?:PREFIX\s+\w*:\s+<[^>]*>\s*)*(\w+)\s*.*/i;
		if ((matched = exp.exec(qparam.text))) {
			var successFunc,
			qtype = matched[1].toUpperCase(),
			accept = false,
			output = null;
			this.qtype = qtype;
			//if(Util.query_preamble) qparam.query = Util.query_preamble(qparam.query, qtype);
			if(Util.queries) qparam.query = Util.queries.preamble(qparam.query, qtype);
			if (qtype === 'ASK') {
					output = 'boolean';
					successFunc = function(value) {
					that.displayBooleanResult(value, resultTitle);
				};
			} else if (qtype === 'CONSTRUCT' || qtype === 'DESCRIBE'){
				if(JsonRDFFormatter){
					//@@ modified 2018-12-08
					var jrdf = new JsonRDFFormatter(this, desc_uri, is_home_uri);
					this.jrdf = jrdf; //debug
					successFunc = function(model) {
						jrdf.display_result(model, resultTitle, qtype);
					};
				}else{
					output = 'rdf'; // !json
					var successFunc = function(model) {
						that.displayRDFResult(model, resultTitle);
					};
				}
			} else {
				//SELECT query
				accept = true;
				output = "json";
				successFunc = function(json) {
					that.displayJSONResult(json, resultTitle);
				};
			}
		}
		this.set_service(qparam.query, successFunc, accept, output);
	};
	//can be used by multiple instance of Snorql 2019-04-29
	this.set_service = function(query, successFunc, accept, output){
		var that = this,
		service = new SPARQL.Service(this._endpoint);
		// removed here: if (this._graph)
		service.setMethod("GET");
		if(accept) service.setRequestHeader('Accept', "application/sparql-results+json,*/*"); //*/;
		if(output) service.setOutput(output);
		service.query(query, {
			success: successFunc,
			failure: function(report) {
				var message = report.responseText.match(/<pre>([\s\S]*)<\/pre>/);
				if (message) {
					that.displayErrorMessage(message[1]);
				} else {
					that.displayErrorMessage(report.responseText);
				}
			}
		});
	};

	this.setBrowserBase = function(url) {
		this._browserBase = url;
	};

	this._displayEndpointURL = function(label) {
		//@@modified 2018-12-08
		var newTitle = "Snorql" + (label ? " for " + label : ": Exploring " + this._endpoint);
		this._display(document.createTextNode(newTitle), 'title');
		document.title = newTitle;
	};

	this._displayPoweredBy = function() {
		//removed dependencies on prototype.js
		//$('poweredby').href = this._poweredByLink;
		//$('poweredby').update(this._poweredByLabel);
		var pwb = document.getElementById("poweredby");
		pwb.href = this._poweredByLink;
		pwb.innerText = this._poweredByLabel;
	};

	this.setNamespaces = function(namespaces, pfxtext) {
		this._namespaces = namespaces;
		if(pfxtext !== false) this._display(document.createTextNode(this._getPrefixes()), 'prefixestext');
	};
	
	//removed here: switchToGraph, switchToDefaultGraph, _updateGraph, updateOutputMode, resetQuery

	//called from HTML form button (onclick)
	this.submitQuery = function() {
		var qform = document.getElementById('queryform'),
		mode = this._selectedOutputMode();
		if(CMEditor) document.getElementById('querytext').value = CMEditor.getValue();	//@@ CodeMirror support 2018-12-09
		if (mode === 'browse' || mode === "") {
			qform.action = this._browserBase;
			document.getElementById('query').value = document.getElementById('querytext').value;
		} else {
			document.getElementById('query').value = this._getPrefixes() + document.getElementById('querytext').value;
			qform.action = this._endpoint;
			//2019-04-03, changed from jsonoutput to actualoutput;
			var aout = document.getElementById('actualoutput');
			aout.disabled = false;
			aout.value = mode;
		}
		//document.getElementById('jsonoutput').disabled = (mode !== 'json');
	   /* deleted xslt check */
		qform.submit();
	};

	this.displayBusyMessage = function() {
		var busy = document.createElement('div');
		busy.className = 'busy';
		busy.appendChild(document.createTextNode('Executing query ... '));
		this._display(busy, 'result');
	};

	this.displayErrorMessage = function(message) {
		var pre = document.createElement('pre');
		pre.innerHTML = message;
		this._display(pre, 'result');
	};

	this.displayBooleanResult = function(value, resultTitle) {
		var div = document.createElement('div');
		var title = document.createElement('h2');
		title.appendChild(document.createTextNode(resultTitle));
		div.appendChild(title);
		if (value)
			div.appendChild(document.createTextNode("TRUE"));
		else
			div.appendChild(document.createTextNode("FALSE"));
		this._display(div, 'result');
	};
	//legacy formatter
	this.displayRDFResult = function(model, resultTitle) {
		var div = document.createElement('div');
		var title = document.createElement('h2');
		title.appendChild(document.createTextNode(resultTitle));
		div.appendChild(title);
		div.appendChild(new RDFXMLFormatter(model));
		this._display(div, 'result');
		this._updateGraph(this._graph); // refresh links in new result - necessary for boolean?
	};
	//display SPARQL JSON results + header
	this.displayJSONResult = function(json, resultTitle) {
		var div = document.createElement('div');
		var title = document.createElement('h2');
		title.appendChild(document.createTextNode(resultTitle));
		div.appendChild(title);
		this.setup_json_result(json, div);
		this._display(div, "result");
	};
	//generalized method to display SPARQL JSON results 2019-04-29
	this.setup_json_result = function(json, div){
		//@@added error check 2018-12-09
		if(!json){
			this.__msg(div, "[query error: no response]", "p") ;
		}else if(json.status && json.status === "error"){
			this.__msg(div, "ajax error: " + json.response , "pre") ;
			console.log(json);
		}else if(json.head && json.head.status === "error"){
			this.__msg(div, "query status error: " + json.head.msg , "pre") ;
		}else if (json.results.bindings.length === 0) {
			this.__msg(div, "[no result]", "p") ;
		}else {
			if(SPARQLSelectTableFormatter){
				//@@modified 2018-12-12
				this.sstf = new SPARQLSelectTableFormatter(json, this._namespaces, this);
				this.sstf.toDOM(div);
			}else{
				div.appendChild(new SPARQLResultFormatter(json, this._namespaces, this).toDOM());
			}
		}
	};
	//@@2018-12-09
	this.__msg = function(div, msg, elt){
		var p = document.createElement(elt);
		p.className = 'empty';
		p.appendChild(document.createTextNode(msg));
		div.appendChild(p);
		//@@added 2018-12-14
		if(this.use_title)
		document.title = this.qtype + " " + msg + " - Snorql"
		+ (this.homedef.label ? " for " + this.homedef.label : "");
	};

	this._display = function(node, whereID) {
		var where = document.getElementById(whereID);
		if (!where) {
			console.log('ID not found: ' + whereID);
			return;
		}
		while (where.firstChild) {
			where.removeChild(where.firstChild);
		}
		if (node === null) return;
		where.appendChild(node);
	};

	this._selectedOutputMode = function() {
		return document.getElementById('selectoutput').value;
	};

	this._getPrefixes = function() {
		var prefix, prefixes = '';
		for (prefix in this._namespaces) {
			var uri = this._namespaces[prefix];
			prefixes = prefixes + 'PREFIX ' + prefix + ': <' + uri + '>\n';
		}
		return prefixes;
	};

	this._betterUnescape = function(s) {
		//return unescape(s.replace(/\+/g, ' '));
		//@@modified 2018-12-07
		return decodeURIComponent(s.replace(/\+/g, ' '));
	};

	//@@ moved here and works iif "Browse" section presents
	this.original_class_prop_query = function(qparam){
		var browse = qparam.urlstring.match(/browse=([^&]*)/);
		qparam.text = null;
		if (browse && browse[1] === 'superclasses') {
			var resultTitle = 'List of all super classes:';
			qparam.text = 'SELECT DISTINCT ?class\n' +
					'WHERE { [] rdfs:subClassOf ?class }\n' +
					'ORDER BY ?class';
			qparam.query = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' + qparam.text;
		}
		if (browse && browse[1] === 'classes') {
			var resultTitle = 'List of all classes:';
			qparam.query = 'SELECT DISTINCT ?class\n' +
					'WHERE { [] a ?class }\n' +
					'ORDER BY ?class';
		}
		if (browse && browse[1] === 'properties') {
			var resultTitle = 'List of all properties:';
			qparam.query = 'SELECT DISTINCT ?property\n' +
					'WHERE { [] ?property [] }\n' +
					'ORDER BY ?property';
		}
		if (browse && browse[1] === 'graphs') {
			var resultTitle = 'List of all named graphs:';
			qparam.text = 'SELECT DISTINCT ?namedgraph ?label\n' +
					'WHERE {\n' +
					'  GRAPH ?namedgraph { ?s ?p ?o }\n' +
					'  OPTIONAL { ?namedgraph rdfs:label ?label }\n' +
					'}\n' +
					'ORDER BY ?namedgraph';
			qparam.query = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' + qparam.text;
		}
		var match = qparam.urlstring.match(/property=([^&]*)/);
		if (match) {
			var resultTitle = 'All uses of property ' + decodeURIComponent(match[1]) + ':';
			qparam.query = 'SELECT DISTINCT ?resource ?value\n' +
					'WHERE { ?resource <' + decodeURIComponent(match[1]) + '> ?value }\n' +
					'ORDER BY ?resource ?value';
		}
		var match = qparam.urlstring.match(/class=([^&]*)/);
		if (match) {
			var resultTitle = 'All instances of class ' + decodeURIComponent(match[1]) + ':';
			qparam.query = 'SELECT DISTINCT ?instance\n' +
					'WHERE { ?instance a <' + decodeURIComponent(match[1]) + '> }\n' +
					'ORDER BY ?instance';
		}
		if (!qparam.text) qparam.text = qparam.query;
		return resultTitle;
	};
	
	//@@added
	//pfxtext = false if no pfxtext display area
	this.init = function(pfxtext){
		this.homedef = null;	//@@added 2018-12-13
		this.use_browsecp = false;	//flag to activate browse=class|property param
		this.link_img = 'link.png';	//2019-01-20
		this.setBrowserBase(document.location.href.replace(/\?.*/, ''));
		this.setNamespaces(D2R_namespacePrefixes, pfxtext);
		this.use_title = true;	//to set title element. set false if use snorql for partial display
	};
	this.prepare_default = function(ressec){
		document.getElementById('querytext').value = this.default_query;
		if(CMEditor) CMEditor.setValue(this.default_query);
		if(Util.intro) Util.intro(this.homedef, ressec);	//2020-06-03
		else ressec.style.display = "none";
	};
	//@param object def	Snorqldef
	this.init_homedef = function(def){
		//@@added for flexible customization. Can declare any variable in other place
		for(var key in def.vars) this[key] = def.vars[key];
		if(def.home){
			this.homedef = def.home;
			if(def.home.datauri) this.homedef.datauri_len = def.home.datauri.length;
			if(def.home.datauri_pat) this.homedef.duri_pat = new RegExp(def.home.datauri_pat);
			if(def.home.data_frags) this.homedef.dfrag_pat = new RegExp("^(.*)#(" + def.home.data_frags.join("|") + ")$");
			if(def.home.workuri){
				this.homedef.workuri_pat = new RegExp("^(" + def.home.workuri.join("|") + ")");
			}
			if(def.home.submit_label){
				var lang = Util.ulang ? (Util.ulang === "ja" ? 0 : 1) : 0,
				btn = document.querySelector(def.home.submit_selector);
				if(btn) btn.value = " " + def.home.submit_label[lang] + " ";
			}
			if(def.home.relpath){
				//relative path to snorql files from UI html
				this.link_img = def.home.relpath + this.link_img;
				this.relpath = def.home.relpath;
			}
			Util.defaulturi = def.home.datauri;
			if(def.home.label) Util.homelabel = def.home.label;
		}
	};
	//generalized select query processor 2019-04-27
	this.query_select = function(query, def){
		if(!def) def = Snorqldef;
		if(!this._endpoint){
			this.init();
			this._endpoint = def.vars._endpoint;
		}
		this.use_title = false;
		var that = this,
		div = Util.dom.element("div");
		this.set_service(query, function(json){
			that.setup_json_result(json, div);
		}, true, null);
		return div;
	};
}


/*
 * RDFXMLFormatter
 * 
 * maybe improve...
 */
function RDFXMLFormatter(string) {
	var pre = document.createElement('pre');
	pre.appendChild(document.createTextNode(string));
	return pre;
}


/*
===========================================================================
SPARQLResultFormatter: Renders a SPARQL/JSON result set into an HTML table.

var namespaces = { 'xsd': '', 'foaf': 'http://xmlns.com/foaf/0.1' };
var formatter = new SPARQLResultFormatter(json, namespaces);
var var app = Snorql object;
*/
function SPARQLResultFormatter(json, namespaces, app) {
	if(json){	//@@added in order to call without result json (from other formatter)
		this._json = json;
		this._variables = this._json.head.vars;
		this._results = this._json.results.bindings;
	}
	this._namespaces = namespaces;
	this.use_browsecp = app.use_browsecp || false;	//flag to activate browse=class|property param
	this.app = app;	//2019-01-20 points to Snorql
	this.target_uris = [];	//save subject (assumed) URIs for later use
	this.has_countvar = false;	//test to assign query template to literal var 2020-04-18

	this.toDOM = function() {
		var table = document.createElement('table');
		table.className = 'queryresults';
		table.appendChild(this._createTableHeader());
		for (var i = 0; i < this._results.length; i++) {
			table.appendChild(this._createTableRow(this._results[i], i));
		}
		return table;
	};

	// TODO: Refactor; non-standard link makers should be passed into the class by the caller
	this._getLinkMaker = function(varName, qname) {
		if (varName === 'property' && this.use_browsecp) {
			return function(uri) { return '?property=' + encodeURIComponent(uri); };
		} else if (varName === 'class' && this.use_browsecp) {
			return function(uri) { return '?class=' + encodeURIComponent(uri); };
		} else if (varName === '_replace' && Util.queries) {
			//@@2018-12-13
			return function(uri) { return Util.queries.replace_q(uri); };
		} else if (varName.match(/^(thumb(nail)?|image)$/) && Util.queries) {
			//@@2018-12-13/2019-05-07
			var descuri = this.current_subj_uri ? this._uri_describer(this.current_subj_uri) : null;
			return function(uri) { return Util.queries.image_q(uri, descuri, app.relpath); };
		} else {
			//2019-02-28 -> 2019-05-07
			return function(uri, that) {
				return that._uri_describer(uri);
			};
		}
	};
	//use different describer specified in Snorqldef.describer_map
	this._uri_describer = function(uri){
		var resuri = '?describe=' + encodeURIComponent(uri),
		map = Snorqldef.describer_map;
		if(map) for(var key in map){
			if(uri.match(map[key])){
				resuri = key + resuri;
				break;
			}
		}
		return resuri;
	};

	this._createTableHeader = function() {
		var tr = document.createElement('tr');
		var hasNamedGraph = false;
		for (var i = 0; i < this._variables.length; i++) {
			var th = document.createElement('th');
			th.appendChild(document.createTextNode(this._variables[i]));
			tr.appendChild(th);
			if (this._variables[i] === 'namedgraph') {
				hasNamedGraph = true;
			}
			else if(this._variables[i] === 'image' && Util.cls_toggler){
				//toggle to expand thumbnail 2019-12-20
				th.addEventListener("click", function(){
					Util.cls_toggler(this.parentNode.parentNode, "expandimg");
				});
				th.className = "toggler";
			}
			else if(this._variables[i] === "count"){
				this.has_countvar = i;
			}
		}
		if (hasNamedGraph) {
			var th = document.createElement('th');
			th.appendChild(document.createTextNode(' '));
			tr.insertBefore(th, tr.firstChild);
		}
		return tr;
	};

	this._createTableRow = function(binding, rowNumber) {
		var tr = document.createElement('tr');
		if (rowNumber % 2) {
			tr.className = 'odd';
		} else {
			tr.className = 'even';
		}
		this.current_subj_uri = null;	//@@2019-04-29
		var namedGraph = null;
		var numvars = this._variables.length;	//@@added 2018-12-07
		for (var i = 0; i < numvars; i++) {
			var varName = this._variables[i];
			var td = document.createElement('td');
			//@@modified 2018-12-07
			var node = binding[varName];
			if(!node){
				//2020-07-05
				//if(rowNumber === 0) console.warn("no binding for", varName, "at column", i); //in case wrong select var name
				tr.appendChild(td);
				continue;
			}
			if(i===0){
				//mark this link can be replaced as a query URI
				if(numvars <= 5 && this._variables.slice(1).includes("count")){
					node.o_varname = varName;
					varName = "_replace";	//allows count in any positon rather than this._variables[1]==="count" 2020-06-18. See Util.queries.replace_q
				}
				//save subject (assumed) URIs of all results.
				if(!node) console.warn("binding for '" + this._variables[i] + "' not found.");	//mistype of varname, e.g. kwy for key
				else if(node.type === "uri") this.target_uris.push(node.value);
			}
			var nodeval = this._formatNode(node, varName, numvars, i);
			td.appendChild(nodeval);
			if(nodeval.className === "unbound") td.className = "unbound";
			tr.appendChild(td);
			if (this._variables[i] === 'namedgraph') {
				namedGraph = binding[varName];
			}
		}
		if (namedGraph) {
			var link = document.createElement('a');
			link.href = 'javascript:snorql.switchToGraph(\'' + namedGraph.value + '\')';
			link.appendChild(document.createTextNode('Switch'));
			var td = document.createElement('td');
			td.appendChild(link);
			tr.insertBefore(td, tr.firstChild);
		}
		return tr;
	};

	this._formatNode = function(node, varName, numvars, varpos) {
		if (!node) {
			return this._formatUnbound(node, varName);
		}
		if (node.type === 'uri') {
			return this._formatURI(node, varName, numvars);
		}
		if (node.type === 'bnode') {
			return this._formatBlankNode(node, varName);
		}
		if (node.type === 'literal') {
			var nval = node.datatype ? this._formatTypedLiteral(node, varName) : this._formatPlainLiteral(node, varName, varpos);
			if(varName === "_replace" && Util.queries){
				//literal aggregation key can also be expanded
				var q = Util.queries.add_pseudo_qlink(nval, node.value);
			}
			return nval;
		}
		if (node.type === 'typed-literal') {
			return this._formatTypedLiteral(node, varName);
		}
		return document.createTextNode('???');
	};

	this._formatURI = function(node, varName, numvars, dlinkoption, is_direct_link) {
		//@@added 3rd, 4th arg: variable length (=column count), no direct link flag 2018-12-10
		//dlinkoption can be false e.g. for property cell of JsonRDFFormatter.format_one_prop()
		var qname = this._toQName(node.value),
		link = this._getLinkMaker(varName, qname)(node.value, this);
		if(varName.match(/^(ur[il]|s|cho)$/)) this.current_subj_uri = node.value;	//@@2019-04-29
		if(typeof(link) === "object") return link;
		var span = document.createElement('span');
		//span.className = 'uri';
		var a = document.createElement('a'),
		atitle = qname ? node.value : "";	//"description of "
		span.appendChild(a);
		if(dlinkoption === false){
			//i.e. property cell
			//atitle_pfx = "";
			if(!qname && this.app.more_ns) qname = this._toQName(node.value, this.app.more_ns);
			a.classList.add("prop");
		}else if(node.value.match(/^(https?|ftp):/)){
			if(is_direct_link && !qname){
				atitle = "direct link to this resource";
				a.href = node.value;
				a.classList.add("dlink");
			}else{
				a.href = link;
				//if(!qname) 
				this.set_external_link(span, node.value, dlinkoption);
			}
		}
		//'<' and '>' are delegated to CSS so as not to be included when copy table 2019-04-29
		if(atitle) a.title = atitle;
		//a.className = 'graph-link';
		this.set_uri_elt(a, node, qname, numvars);
		//show actual URI by ctrl+click
		a.addEventListener("click", function(ev){
			if(ev.getModifierState("Control")){
				prompt("value URI", node.value);
				ev.preventDefault();
				return false;
			}
		});
		if(varName === "_replace" && Util.queries){
			a.title = "query resources where ?" + node.o_varname + " replaced by this value. Shift+click to describe it.";
			a.addEventListener("click", function(ev){
				if(ev.getModifierState("Shift")){
					location.href = "?describe=" + encodeURIComponent(node.value);
					ev.preventDefault();
					return false;
				}
			});
		}
		return span;
	};
	
	this.set_uri_elt = function(elt, node, qname, numvars){
		if(qname) {
			elt.classList.add("qname");
			elt.innerText = qname;
		}else {
			//@@modified 2018-12-08 to trim long URI for display purpose
			Util.url_disp(elt, node.value, numvars);
			elt.classList.add("uri");
		}
	};
	this.set_external_link = function(span, node_value, dlinkoption){
		//if(!node.value.match(/^(https?|ftp):/)) return;
		//@@ added dlinkoption condition in order not to add direct link for property cell
		var externalLink = document.createElement('a');
		externalLink.href = node_value;
		externalLink.className = "extlink";
		var img = document.createElement('img');
		img.src = this.app.link_img;	//if link_img location is different, set Snorqldef.vars.link_img in snorql_def.js 2019-08-16
		img.alt = "";
		img.title = "to this URI itself";
		externalLink.appendChild(img);
		span.appendChild(externalLink);
		if(Util.link_modifier && (typeof(dlinkoption)==="string")){
			//changed dlinkoption behavior to modifier option 2020-03-16
			Util.link_modifier(externalLink, node_value + dlinkoption);
		}
	};

	this._formatPlainLiteral = function(node, varName, varpos) {
		//@@varpos to test to apply replace_q for literal (failed 2020-04-18)
		//@@2018-12-09 added node.lang
		var span = document.createElement('span'), lang;
		span.textContent = node.value.replace(/\\n/g, "\n");;
		span.className = "literal";
		//quotes and @lang are delegated to CSS for copy 2019-04-29
		if ((lang = node['xml:lang'] || node.lang)) {
			span.setAttribute("data-lang", lang);
		}
		return span;
	};

	this._formatTypedLiteral = function(node, varName) {
		var span = document.createElement('span');
		//String() for xsd:decimal, integer 2020-03-22
		span.textContent = String(node.value).replace(/\\n/g, "\n");;
		//quotes and ^^datatype are delegated to CSS for copy 2019-04-29
		if (node.datatype) {
			var datatype = this._toQNameOrURI(node.datatype);
			if(this._isNumericXSDType(node.datatype)){
				span.setAttribute("title", datatype);
				span.className = "number";
			}else if(datatype === "xsd:string"){
				span.setAttribute("title", datatype);
				span.className = "literal";
			}else{
				span.setAttribute("data-dtype", datatype);
				span.className = "literal";
			}
		}else{
			span.className = "literal";
		}
		return span;
	};

	this._formatBlankNode = function(node, varName) {
		return document.createTextNode('_:' + node.value);
	};

	this._formatUnbound = function(node, varName) {
		var span = document.createElement('span');
		span.className = 'unbound';
		span.title = 'Unbound';
		span.appendChild(document.createTextNode('-'));
		return span;
	};
	
	//added ns param to resolve with other (additional) namespaces def
	this._toQName = function(uri, ns) {
		if(!ns) ns = this._namespaces;
		for (var prefix in ns) {
			var nsURI = ns[prefix];
			if (uri.indexOf(nsURI) === 0) {
				//added length condition to avoid prefix only 2020-03-23
				return uri.length > nsURI.length ? prefix + ':' + uri.substring(nsURI.length) : null;
			}
		}
		return null;
	};

	this._toQNameOrURI = function(uri) {
		var qName = this._toQName(uri);
		return (qName === null) ? '<' + uri + '>' : qName;
	};

	this._isNumericXSDType = function(datatypeURI) {
		for (var i = 0; i < this._numericXSDTypes.length; i++) {
			if (datatypeURI === this._xsdNamespace + this._numericXSDTypes[i]) {
				return true;
			}
		}
		return false;
	};
	this._xsdNamespace = 'http://www.w3.org/2001/XMLSchema#';
	this._numericXSDTypes = ['long', 'decimal', 'float', 'double', 'int',
		'short', 'byte', 'integer', 'nonPositiveInteger', 'negativeInteger',
		'nonNegativeInteger', 'positiveInteger', 'unsignedLong',
		'unsignedInt', 'unsignedShort', 'unsignedByte'];
}
/*
 * RDFXMLFormatter
 * 
 * maybe improve...
 */
function RDFXMLFormatter(string) {
	var pre = document.createElement('pre');
	pre.appendChild(document.createTextNode(string));
	return pre;
}

//will be overridden by snorql_ldb.js
Util = {
	url_disp: function(elt, str){elt.innerText = str;}
};


function XMLHelper() {
  var NS = 'http://eeni.tbm.tudelft.nl/maia',
      doc = document.implementation.createDocument(NS, 'xml', null),
      root = doc.documentElement;
  
  var getRoot = this.getRoot = function() {
    return root; 
  };
  
  var setAttr = this.setAttr = function(el, attrs) {
    for (var key in attrs) {
      if (attrs.hasOwnProperty(key)) {
        el.setAttribute(key, attrs[key]);
      }
    }
    return el;
  };

  var setText = this.setText = function(el, text) {
    if ((text && typeof text === 'string') || typeof text === 'number') {
      var node = doc.createTextNode(text);
      el.appendChild(node);
    }
    return el;
  };

  var push = this.push = function(parent, tagName, attrs, text) {
    try {
      var el = doc.createElementNS(NS, tagName);
    } catch (e) {
      var el = doc.createElementNS(NS, "unknown");
      setAttr(el, {value: tagName});
    }
    parent.appendChild(el);
    attrs && setAttr(el, attrs);
    text && setText(el, text);
    return el;
  };

  var serialize = this.serialize = function() {
    var serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  };
  
  var download = this.download = function(force) {
    if (force) {
      var mime = "application/binary";
    } else {
      var mime = "application/xml";
    }
    var dataUri = 'data:' + mime + ';charset=utf-8,' + encodeURIComponent(serialize());
    window.open(dataUri, "model.xml");
  };
  
  var pushJson = this.pushJson = function(parent, tagName, json, itemTagName) {
    var node = push(parent, tagName);
    if (json instanceof Array) {
      itemTagName = itemTagName || 'item';
      for (var i = 0; i < json.length; i++) {
        pushJson(node, itemTagName, json[i]);
      }
   } else if (json && typeof json === 'object') {
      for (var key in json) {
        if (json.hasOwnProperty(key)) {
          if (/(^|_)id$/.test(key)) {
            setAttr(node, {id: json[key]});
          } else {
            pushJson(node, key, json[key]);
          }
        }
      }
    } else {
      setText(node, '' + json);
    }
    return node;
  };
}

function exportXML(download) {
  var exportCollections = ['roles', 'agents', 'institutions', 'components', 'actionSituations', 'actions', 'domainProblemVariables', 'roleEnactments', 'validationVariables'];
  var xml = new XMLHelper();

  for (var i = 0; i < exportCollections.length; i++) {
    var name = exportCollections[i],
        collection = window[name],
        tagName = name.replace(/[^A-Z][A-Z]+/g, function(m) {
          return m[0] + '_' + m.slice(1);
        }).toLowerCase(),
        node = xml.push(xml.getRoot(), tagName);
    
    for (var j = 0; j < collection.length; j++) {
      var model = collection.at(j);
      if (model) {
        model.toXML(xml, node);
      }
    }
  }
  
  xml.download(download);
}
$(function() {
  function defineRelationship(model1, collection1, field1, model2, collection2, field2) {
    function getMethodName(prefix, name, suffix) {
      name = name.replace(/s$/, '');
      return prefix + name[0].toUpperCase() + name.slice(1) + (suffix || '');
    }

    function addMethods(lmodel, lcollection, lfield, rmodel, rcollection, rfield) {
      var lsetter = getMethodName('set', lfield);
      var lgetter = getMethodName('get', lfield);
      var lhas = getMethodName('has', lfield);

      var rsetter = getMethodName('set', rfield);
      var rgetter = getMethodName('get', rfield);

      lmodel.prototype[lsetter] = function(model, data, noPropagate) {
        var dirty = false;
        var id = model.get('id');
        if (!id) return;
        var map = clone(this.get(lfield) || {});
        if (!data) {
          if (map[id]) {
            delete map[id];
            dirty = true;
          }
        }
        else {
          if (!map[id]) {
            map[id] = {}
            dirty = true;
          }
          for (key in data) {
            if (data.hasOwnProperty(key) && map[id][key] !== data[key]) {
              map[id][key] = data[key];
              dirty = true;
            }
          }
        }
        if (!dirty) return;
        this.save(kv(lfield, map));
        if (!noPropagate) {
          model[rsetter].call(model, this, data, true);
        }
      };

      lmodel.prototype[lgetter] = function(model) {
        var id = model.get('id');
        if (!id) return;
        var map = this.get(lfield) || {};
        return map[id];
      };

      lmodel.prototype[lhas] = function(model) {
        var id = model.get('id');
        if (!id) return;
        var map = this.get(lfield) || {};
        return map.hasOwnProperty(id);
      };

      var handlers = []
      if (lmodel.prototype._destroyHandlers) {
        var oldHandlers = lmodel.prototype._destroyHandlers;
        for (var i = 0; i < oldHandlers.length; i++)
        handlers[i] = oldHandlers[i];
      }
      lmodel.prototype._destroyHandlers = handlers;

      handlers.push(function() {
        var collection = window[rcollection];
        var rels = this.get(lfield);
        if (!rels) return;
        for (var key in rels) {
          if (rels.hasOwnProperty(key)) {
            var remote = collection.get(key);
            if (!remote) continue;
            remote[rsetter].call(remote, this, null);
          }
        }
        this.set(kv(lfield, []), {
          silent: true
        });
      });
    }

    addMethods(model1, collection1, field1, model2, collection2, field2);
    if (model1 !== model2 || collection1 !== collection2 || field1 !== field2) {
      addMethods(model2, collection2, field2, model1, collection1, field1);
    }
  }
  
  function relationsToXML(xml, parent, tagName, itemTagName, map) {
    var listNode = xml.push(parent, tagName);
    for (var id in map) {
      if (map.hasOwnProperty(id)) {
        var node = xml.push(listNode, itemTagName, {id: id});
        var attributes = map[id];
        for (var key in attributes) {
          if (attributes.hasOwnProperty(key)) {
             xml.push(node, key, {}, attributes[key]);
          }
        }
      }
    }
  }
  
  function firstRelationToXML(xml, parent, tagName, map) {
    var node = xml.push(parent, tagName);
    for (var id in map) {
      if (map.hasOwnProperty(id)) {
        xml.setAttr(node, { id: id });
      }
    }
  }
  
  function listToXML(xml, parent, tagName, itemTagName, items) {
    var listNode = xml.push(parent, tagName);
    if (!items) {
      items = [];
    } else if (!(items instanceof Array)) {
      items = [items];
    }
    for (var i = 0; i < items.length; i++) {
      xml.push(listNode, itemTagName, {}, items[i]);
    }
  }

  var BaseModel = Backbone.Model.extend({
    destroy: function() {
      var handlers = this._destroyHandlers || [];
      for (i = 0; i < handlers.length; i++)
      this._destroyHandlers[i].call(this);
      return Backbone.Model.prototype.destroy.call(this);
    },
    
    toXML: function(xml, parent) {
      xml.pushJson(parent, 'model', this.toJSON());
    }
  });

  function checkLabel(model, warnings) {
    var label = (model.get('label') || '').replace(/^\s+|\s+$/g, '');
    if (!label) return warnings.push('The label field cannot be empty');
    if (/\W/.test(label)) return warnings.push('Label is not a valid identifier');
  }

  /* Instance models */
  window.Institution = BaseModel.extend({
    defaults: function() {
      return {
        id: generateId(),
        x: Math.round(Math.random() * 1000),
        y: Math.round(Math.random() * 1000),
        deontic_type: 'none'
      };
    },

    warnings: function() {
      var warnings = [];
      checkLabel(this, warnings);
      return warnings;
    },

    instititional_type: function() {
      if (this.get('aim') && this.get('condition') && this.get('or_else') && this.get('deontic_type') !== 'none') {
        return 'Rule'
      }
      if (this.get('deontic_type') === 'none' && !this.get('or_else')) {
        return 'Shared strategy';
      }
      return 'Norm';
    },
    
    toXML: function(xml, parent) {
      var node = xml.push(parent, 'institution', { id: this.get('id') });
      xml.push(node, 'label', {}, this.get('label'));
      relationsToXML(xml, node, 'attributes', 'role', this.get('roles'));
      xml.push(node, 'deontic_type', {}, this.get('deontic_type'));
      xml.push(node, 'aim', {}, this.get('aim'));
      xml.push(node, 'condition', {}, this.get('condition'));
      xml.push(node, 'or_else', {}, this.get('or_else'));
    }
  });


  window.Role = BaseModel.extend({
    defaults: function() {
      return {
        id: generateId(),
        dependencies_x: Math.round(Math.random() * 1000),
        dependencies_y: Math.round(Math.random() * 1000),
      };
    },

    warnings: function() {
      var warnings = [];
      checkLabel(this, warnings);
      return warnings;
    },
    
    toXML: function(xml, parent) {
      var node = xml.push(parent, 'role', { id: this.get('id') });
      xml.push(node, 'label', {}, this.get('label'));
      xml.push(node, 'objective', {}, this.get('objective'));
      listToXML(xml, node, 'sub_objectives', 'sub_objective', this.get('sub_objectives'));
      relationsToXML(xml, node, 'institutions', 'institution', this.get('institutions'));
      listToXML(xml, node, 'entry_conditions', 'entry_condition', this.get('entry_conditions'));
      listToXML(xml, node, 'institutional_capabilities', 'institutional_capabilitity', this.get('institutional_capabilities'));
      relationsToXML(xml, node, 'dependencies', 'role', this.get('dependees'));
    }
  });

  defineRelationship(Role, 'roles', 'institutions', Institution, 'institutions', 'roles');
  defineRelationship(Role, 'roles', 'dependents', Role, 'roles', 'dependees');

  window.Agent = BaseModel.extend({
    defaults: function() {
      return {
        id: generateId()
      };
    },

    warnings: function() {
      var warnings = [];
      checkLabel(this, warnings);
      return warnings;
    },
    
    toXML: function(xml, parent) {
      var node = xml.push(parent, 'agent', { id: this.get('id') });
      xml.push(node, 'label', {}, this.get('label'));
      listToXML(xml, node, 'properties', 'property', this.get('properties'));
      listToXML(xml, node, 'personal_values', 'personal_value', this.get('personal_values'));
      xml.push(node, 'information', {}, this.get('information'));
      relationsToXML(xml, node, 'physical_components', 'component', this.get('components'));
      relationsToXML(xml, node, 'possible_roles', 'role', this.get('roles'));
      listToXML(xml, node, 'intrinsic_capabilities', 'intrinsic_capability', this.get('intrinsic_capability'));
      listToXML(xml, node, 'decision_making_criteria', 'decision_making_criterium', this.get('decision_making_behavior'));
    }
  });

  defineRelationship(Agent, 'agents', 'roles', Role, 'roles', 'agents');

  window.Component = BaseModel.extend({
    defaults: function() {
      return {
        id: generateId(),
        composition_x: Math.round(Math.random() * 1000),
        composition_y: Math.round(Math.random() * 1000),
        connections_x: Math.round(Math.random() * 1000),
        connections_y: Math.round(Math.random() * 1000)
      };
    },

    warnings: function() {
      var warnings = [];
      checkLabel(this, warnings);
      return warnings;
    },
    
    toXML: function(xml, parent) {
      var node = xml.push(parent, 'component', { id: this.get('id') });
      xml.push(node, 'label', {}, this.get('label'));
      listToXML(xml, node, 'properties', 'property', this.get('properties'));
      xml.push(node, 'type', {}, this.get('type'));
      listToXML(xml, node, 'behaviors', 'behavior', this.get('behaviors'));
      relationsToXML(xml, node, 'connections', 'component', this.get('connections'));
      relationsToXML(xml, node, 'composition', 'component', this.get('composeds'));
    }
  });

  defineRelationship(Component, 'components', 'agents', Agent, 'agents', 'components');
  defineRelationship(Component, 'components', 'composeds', Component, 'components', 'composees');
  defineRelationship(Component, 'components', 'connections', Component, 'components', 'connectees');

  window.Action = BaseModel.extend({
    defaults: function() {
      return {
        id: generateId(),
      };
    },

    warnings: function() {
      return [];
    },
    
    toXML: function(xml, parent) {
      var node = xml.push(parent, 'action', { id: this.get('id') });
      firstRelationToXML(xml, node, "action_situation", this.get('action_situation'));
      relationsToXML(xml, node, 'roles', 'role', this.get('roles'));
      xml.push(node, 'action_body', {}, this.get('body'));
      relationsToXML(xml, node, 'physical_components', 'component', this.get('components'));
      relationsToXML(xml, node, 'institutional_statement', 'institution', this.get('institutions'));
      xml.push(node, 'precondition', {}, this.get('precondition'));
      xml.push(node, 'postcondition', {}, this.get('postcondition'));
    }
  });

  defineRelationship(Role, 'roles', 'actions', Action, 'actions', 'roles');
  defineRelationship(Component, 'components', 'actions', Action, 'actions', 'components');
  defineRelationship(Institution, 'institutions', 'actions', Action, 'actions', 'institutions');

  window.ActionSituation = BaseModel.extend({
    defaults: function() {
      return {
        id: generateId(),
      };
    },

    warnings: function() {
      var warnings = [];
      checkLabel(this, warnings);
      return warnings;
    },
    
    toXML: function(xml, parent) {
      var node = xml.push(parent, 'action_situation', { id: this.get('id') });
      xml.push(node, 'label', {}, this.get('label'));
    }
  });

  window.ValidationVariable = BaseModel.extend({
    defaults: function() {
      return {
        id: generateId(),
      };
    },
    warnings: function() {
      var warnings = [];
      checkLabel(this, warnings);
      return warnings;
    },
    
    toXML: function(xml, parent) {
      var node = xml.push(parent, 'validation_variable', { id: this.get('id') });
      xml.push(node, 'label', {}, this.get('label'));
      relationsToXML(xml, node, 'action_situations', 'action_situation', this.get('evaluation'));
    }
  });

  window.DomainProblemVariable = BaseModel.extend({
    defaults: function() {
      return {
        id: generateId(),
      };
    },
    warnings: function() {
      var warnings = [];
      checkLabel(this, warnings);
      return warnings;
    },
    
    toXML: function(xml, parent) {
      var node = xml.push(parent, 'domain_problem_variable', { id: this.get('id') });
      xml.push(node, 'label', {}, this.get('label'));
      relationsToXML(xml, node, 'action_situations', 'action_situation', this.get('evaluation'));
    }
  });

  defineRelationship(ActionSituation, 'actionSituations', 'actions', Action, 'actions', 'action_situation');
  defineRelationship(ValidationVariable, 'validationVariables', 'evaluation', ActionSituation, 'actionSituations', 'validation_variable');
  defineRelationship(DomainProblemVariable, 'domainProblemVariables', 'evaluation', ActionSituation, 'actionSituations', 'domain_problem_variable');

  window.RoleEnactment = BaseModel.extend({
    defaults: function() {
      return {
        id: generateId(),
      };
    },

    warnings: function() {
    },
    
    toXML: function(xml, parent) {
      var node = xml.push(parent, 'role_enactment', { id: this.get('id') });
      firstRelationToXML(xml, node, "agent", this.get('agent'));
      firstRelationToXML(xml, node, "action_situation", this.get('action_situation'));
      firstRelationToXML(xml, node, "role", this.get('role'));
    }  
  });

  defineRelationship(RoleEnactment, 'roleEnactments', 'agent', Agent, 'agents', 'role_enactments');
  defineRelationship(RoleEnactment, 'roleEnactments', 'action_situation', ActionSituation, 'actionSituations', 'role_enactments');
  defineRelationship(RoleEnactment, 'roleEnactments', 'role', Role, 'roles', 'role_enactments');


  /* Collections */
  window.AgentList = Backbone.Collection.extend({
    model: Agent,
    localStorage: new Store('agent')
  });

  window.RoleList = Backbone.Collection.extend({
    model: Role,
    localStorage: new Store('role')
  });

  window.InstitutionList = Backbone.Collection.extend({
    model: Institution,
    localStorage: new Store('institution')
  });

  window.ComponentList = Backbone.Collection.extend({
    model: Component,
    localStorage: new Store('component')
  });

  window.ActionSituationList = Backbone.Collection.extend({
    model: ActionSituation,
    localStorage: new Store('action_situation')
  });

  window.ActionList = Backbone.Collection.extend({
    model: Action,
    localStorage: new Store('action')
  });

  window.RoleEnactmentList = Backbone.Collection.extend({
    model: RoleEnactment,
    localStorage: new Store('role_enactment')
  });

  window.ValidationVariableList = Backbone.Collection.extend({
    model: ValidationVariable,
    localStorage: new Store('validation_variable')
  });

  window.DomainProblemVariableList = Backbone.Collection.extend({
    model: DomainProblemVariable,
    localStorage: new Store('domain_problem_variable')
  });
});
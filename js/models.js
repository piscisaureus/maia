
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
        } else {
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
        this.set(kv(lfield, []), {silent: true});
      });
    }
    
    addMethods(model1, collection1, field1, model2, collection2, field2);
    if (model1 !== model2 ||
        collection1 !== collection2 ||
        field1 !== field2) {
      addMethods(model2, collection2, field2, model1, collection1, field1);
    }
  }

  var BaseModel = Backbone.Model.extend({
    destroy: function() {
      var handlers = this._destroyHandlers || [];
      for (i = 0; i < handlers.length; i++)
        this._destroyHandlers[i].call(this);
      return Backbone.Model.prototype.destroy.call(this);
    } 
  });
  
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
      if (Math.random() < .5) return false;
      return [
        "Something's wrong with this"
      ]
    },
    
    instititional_type: function() {
      if (this.get('aim') && 
          this.get('condition') && 
          this.get('or_else') && 
          this.get('deontic_type') !== 'none') {
        return 'Rule'
      }
      if (this.get('deontic_type') === 'none' &&
          !this.get('or_else')) {
        return 'Shared strategy';
      }
      return 'Norm';
    }
  });
    

  window.Role = BaseModel.extend({
    defaults: function() {
      return {
        id: generateId(),
        x: Math.round(Math.random() * 1000),
        y: Math.round(Math.random() * 1000),
      };
    },
    
    warnings: function() {
      if (Math.random() < .5) return false;
      return [
        "Something's wrong with this"
      ]
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
	
	warnings: function(){}
  });
  
  defineRelationship(Agent, 'agents', 'roles', Role, 'roles', 'agents');
   
  window.Component = Backbone.Model.extend({
    defaults: function() {
      return {
        id: generateId(),
        x: Math.round(Math.random() * 1000),
        y: Math.round(Math.random() * 1000)
      };
    },
	
	warnings: function(){}
  });
  
  defineRelationship(Component, 'components', 'agents', Agent, 'agents', 'components');
  defineRelationship(Component, 'components', 'composeds', Component, 'components', 'composees');
  defineRelationship(Component, 'components', 'connections', Component, 'components', 'connectees');
  
  window.Action = Backbone.Model.extend({
    defaults: function() {
      return {
        id: generateId(),
      };
    },
    warnings: function(){}
  });
  
  defineRelationship(Role, 'roles', 'actions', Action, 'actions', 'roles');
  defineRelationship(Component, 'components', 'actions', Action, 'actions', 'components');
  defineRelationship(Institution, 'institutions', 'actions', Action, 'actions', 'institutions');
  
  window.ActionSituation = Backbone.Model.extend({
    defaults: function() {
      return {
        id: generateId(),
      };
    },
  	warnings: function(){}
  });
    
  window.ValidationVariable = Backbone.Model.extend({
    defaults: function() {
      return {
        id: generateId(),
      };
    },
  	warnings: function(){}
  });
 
  window.DomainProblemVariable = Backbone.Model.extend({
    defaults: function() {
      return {
        id: generateId(),
      };
    },
  	warnings: function(){}
  });
 
  defineRelationship(ActionSituation, 'actionSituations', 'actions', Action, 'actions', 'actionSituation');  
  defineRelationship(ValidationVariable, 'validationVariables', 'evaluation', ActionSituation, 'actionSituations', 'validationVariable');
  defineRelationship(DomainProblemVariable, 'domainProblemVariables', 'evaluation', ActionSituation, 'actionSituations', 'domainProblemVariable');
  
  window.RoleEnactment = Backbone.Model.extend({
    defaults: function() {
      return {
        id: generateId(),
      };
    },
	
  	warnings: function(){}
  });
  
  defineRelationship(RoleEnactment, 'roleEnactments', 'agent', Agent, 'agents', 'roleEnactments');
  defineRelationship(RoleEnactment, 'roleEnactments', 'actionSituation', ActionSituation, 'actionSituations', 'roleEnactments');
  defineRelationship(RoleEnactment, 'roleEnactments', 'role', Role, 'roles', 'roleEnactments');

  
  /* Collections */
  window.InstitutionList = Backbone.Collection.extend({
    model: Institution,
    localStorage: new Store('institution')
  });

  window.RoleList = Backbone.Collection.extend({
    model: Role,
    localStorage: new Store('role')
  });

  window.AgentList = Backbone.Collection.extend({
    model: Agent,
    localStorage: new Store('agent')
  });

  window.ComponentList = Backbone.Collection.extend({
    model: Component,
    localStorage: new Store('component')
  });
  
  window.RoleEnactmentList = Backbone.Collection.extend({
    model: RoleEnactment,
    localStorage: new Store('role_enactment')
  });
  
  window.ActionList = Backbone.Collection.extend({
    model: Action,
    localStorage: new Store('action')
  });
  
  window.ActionSituationList = Backbone.Collection.extend({
    model: ActionSituation,
    localStorage: new Store('action_situation')
  });
  
  
  window.DomainProblemVariableList = Backbone.Collection.extend({
    model: DomainProblemVariable,
    localStorage: new Store('domain_problem_variable')
  });

  window.ValidationVariableList = Backbone.Collection.extend({
    model: ValidationVariable,
    localStorage: new Store('validation_variable')
  });

});
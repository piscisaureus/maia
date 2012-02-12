
$(function() {
  var Widget = Backbone.View.extend({
    initialize: function(options) {
      _.bindAll(this, '_triggerChange', 'deferredUpdate', 'update', 'save');
    
      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          this[key] = options[key];
        }
      }

      this.render();
      return this;
    },
    
    destroy: function() {
      this._unbind();
    },
    
    render: function() {
      this.el = $(this.template).appendTo(this.parent);
      this.update();
      this._bind(this.el);
    },
    
    _bind: function() {
    },
    
    _unbind: function() {
    },
    
    _triggerChange: function() {
      this.trigger('change');
    },
    
    update: function() {
    },
    
    deferredUpdate: function() {
      if (this._updateScheduled) return;
	  if (this._saving) return;
      this._updateScheduled = true;
      
      var self = this;
      setTimeout(function() {
        self._updateScheduled = false;
        self.update();
      });
    },
    
    save: function() {
      this._saving = true;
      this._save();
      this._saving = false;
    }    
  });
  
  window.TextInput = Widget.extend({
    template: '<input type="text" />',
  
    _bind: function() {
      $(this.el).change(this._triggerChange);
      this.model.bind('change:' + this.field, this.update);
    },
    
    _unbind: function() {
      this.model.unbind('change:' + this.field, this.update);
    },
    
    update: function() {
      $(this.el).val(this.model.get(this.field));
    },
    
    save: function() {
      this.model.save(kv(this.field, $(this.el).val()));
    }
  });
  
  window.Select = Widget.extend({
    render: function() {
      this.el = $('<select />').appendTo(this.parent);
	  
      for (var value in this.options) {
        if (this.options.hasOwnProperty(value)) {
          var option = $('<option />')
            .attr({value: value})
            .text(this.options[value])
            .appendTo(this.el);
        }
      }

      this.update();
      this._bind();
    },
    
    _bind: function() {
      $(this.el).change(this._triggerChange);
      this.model.bind('change:' + this.field, this.update);
    },
    
    _unbind: function() {
      this.model.unbind('change:' + this.field, this.update);
    },
    
    update: function() {
      $(this.el).val(this.model.get(this.field));
    },
    
    _save: function() {
       this.model.save(kv(this.field, $(el).find('option:selected').val()));
    }
  });
  
  window.RemoteSelect = Widget.extend({
    /* 
     * Options:
     * - model
     * - field
     * - optionLabelField (string)
     * - optionCollection (string)
     * - multiple (boolean)
     */
    render: function() {
      this.el = $('<select />').appendTo(this.parent);
	  if (this.multiple) {
	    this.el.attr({multiple: 'multiple'});
	  }
	  
      this.update();
      this._bind();
    },
    
    _getOptionCollection: function() {
      return (typeof this.optionCollection !== 'string') ? this.optionCollection : window[this.optionCollection]
    },
    
    update: function() {
      var self = this;
      
      $(this.el).empty();

      this._getOptionCollection().each(function(model) {
        var option = $('<option/>')
          .attr({value: model.get('id')})
          .text(model.get(self.optionLabelField))
          .appendTo(self.el);
      });
      
      var selected = this.model.get(this.field);
      
      for (var id in selected) {
        if (selected.hasOwnProperty(id)) {
          $(this.el).find('option[value=' + id + ']').attr({selected: 'selected'});
        }
      }
	  
	  if (!this._multiselectRendered) {	  
		$(this.el).multiselect();
		this._multiselectRendered = true;
      } else {
	    $(this.el).multiselect("refresh");
	  }
    },
    
    _bind: function() {
      $(this.el).change(this._triggerChange);
      this.model.bind('change:' + this.fieldName, this.deferredUpdate);
      this._getOptionCollection().bind('change', this.deferredUpdate);
    },
    
    _unbind: function() {
      this.model.unbind('change:' + this.fieldName, this.deferredUpdate);
      this._getOptionCollection().unbind('change', this.deferredUpdate);
    },
    
    _save: function() {
      var self = this;
      $(this.el).find('option').each(function(index, el) {
        var id = $(el).val(),
            item = self._getOptionCollection().get(id);
        if (!item) return;
        var method = 'set' + self.field[0].toUpperCase() + self.field.slice(1).replace(/s$/, '');
		console.log(method);
		console.log(self.model);
        self.model[method](item, $(el).attr('selected') ? {} : null);
      });
    }
  });
});

$(function() {
  window.TableView2 = Backbone.View.extend({
	/* 
	 * Options:
	 * - 
	
    initialize: function(options) {
      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          this[key] = options[key];
        }
      }
      
      if (typeof this.collection === 'string') {
        this.collection = window[this.collection];
      }
	  
	  if (!this.rowView) {
	    this.rowView = window.RowView2;
	  }

      this.render();
      return this;
    },
    
    render: function() {
      _.bindAll(this, 'addOne', 'addAll');
      
      console.log(this.parent);
      this.el = $('<table/>').appendTo(this.parent);
      this.tbody = $('<tbody/>').appendTo(this.el);
	        
      this.collection.bind('add', this.addOne, this);
      this.collection.bind('reset', this.addAll, this);
      
      this.addAll();
    },
    
    addOne: function(model) {
      var view = new (this.rowView)({model: model, parent: this.tbody, definition: this.definition});
    },
    
    addAll: function() {
      this.collection.each(this.addOne);
    }
  }, {
    create: function(options) {
      return new this(options);
    }
  });
  
  window.RowView2 = Backbone.View.extend({
    initialize: function(options) {
      options = options || {};
      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          this[key] = options[key];
        }
      }
      
      if (typeof this.collection === 'string') {
        this.collection = window[collection];
      }
      
      this._widgets = [];

      this.render();
      return this;
    },
    
    _destroyWidgets: function() {
      for (var i = 0; i < this._widgets.length; i++) {
        this._widgets[i].destroy();
      }
      this._widgets = [];
    },
    
    render: function() {
      this.el = $('<tr/>').appendTo(this.parent);
      
      this._widgets = [];
      for (var i = 0; i < this.definition.length; i++) {
        var d = this.definition[i];
        
        //debugger;
        var widget = new (d.widget)({model: this.model, parent: this.el});
        this._widgets.push(widget);
        widget.bind('change', widget.save);
      }
    },
    
    destroy: function() {
      this._destroyWidgets();
    }
  });
  
  var roleDefinition = [
    { label: 'name',           widget: TextInput.extend({ field: 'name' }) },
    { label: 'objective',      widget: TextInput.extend({ field: 'objective' }) },
    { label: 'sub-objectives', widget: TextInput.extend({ field: 'sub_objectives' }) },
    { label: 'institutions',   widget: RemoteSelect.extend({ field: 'institutions', optionCollection: 'institutions', optionLabelField: 'name', multiple: true }) }
  ];
  
  
  window.RoleTableView2 = TableView2.extend({
    parent: $('#roles2'),
    collection: 'roles',
    
    newItem: function() {
      var role = new Role();
      RoleDialogView.create({model: role, collection: this.collection});
    }
  });
});

$(function() {
/*
  window.updateInstitutionspicker = function(index, el, field) {

  function registerControl(target, handlers, methods) {
    function addHandler(type, handler) {
      var listName = "_" + type + "Handlers";
      
      var handlers = [];
      if (target.prototype[listName]) {
        var oldHandlers = target.prototype[listName];
        for (var i = 0; i < handlers.length; i++) {
          handlers[i] = oldHandlers[i];
        }
      }
      handlers.push(handler);      
      target.prototype[listName] = handlers;
    }
    
    for (var type in handlers) {
      if (handlers.hasOwnProperty(type)) {
        addHandler(type, handlers[type]);
      }
    }
    
    methods = methods || {};
    for (var name in methods) {
      if (methods.hasOwnProperty(name)) {
        target[name] = methods[name];
      }
    }
  }*/
  
  window.AutoView = Backbone.View.extend({
    initialize: function() {
      _.bindAll(this, 'updateInput', 'saveInput', 'saveSelect');
    
      this.model.bind('change', this.update, this);
      this.model.bind('destroy', this.remove, this);
      
      this.callHandlers('initialize');
      
      this.saving = 0;
    },
    
    callHandlers: function(type, arguments) {
      var listName = "_" + type + "Handlers";
      var list = this[listName];
      if (!list) return;
      for (var i = 0; i < list.length; i++) {
        list[i].apply(this, arguments);
      }
    },
    
    updateInput: function(index, el) {
      var cls = $(el).attr('class');
      if (!/^edit-/.test(cls)) return;
      var field = cls.replace(/^edit-/, '');
   
      $(el).val(this.model.get(field));
    },
    
    update: function() {
      if (!this.saving)
        this.render();
    },
    
    saveInput: function(index, el) {
      var cls = $(el).attr('class');
      if (!/^edit-/.test(cls)) return;
      var field = cls.replace(/^edit-/, '');
      this.model.save(kv(field, $(el).val()));
    },
    
    saveSelect: function(index, el) {
      var cls = $(el).attr('class');
      if (!/^edit-/.test(cls)) return;
      var field = cls.replace(/^edit-/, '');
      
      this.model.save(kv(field, $(el).find('option:selected').val()));
    },
    
    destroyModel: function(e) {
      this.model.destroy();
    },
    
    remove: function() {
      $(this.el).remove();
    }
  })

  window.RowView = AutoView.extend({
    tagName: 'tr',
    
    events: function() {
      return {
        'change input': 'changeInput',
        'change select': 'changeSelect',
        'click input.action-destroy': 'destroyModel'
      };
    },
    
    initialize: function() {
      AutoView.prototype.initialize.call(this);
      
      _.bindAll(this, 'updateWarnings');
    },
    
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      $(this.el).find('td .warnings').each(this.updateWarnings);
      $(this.el).find('td input').each(this.updateInput);
      $(this.el).find('td select').each(this.updateInput);
      //this.$('select').each(this.updateSelect);
      return this;
    },
    
    changeInput: function(e) {
      this.saveInput(0, e.target);
    },
    
    changeSelect: function(e) {
      this.saveSelect(0, e.target);
    },
    
    updateWarnings: function(index, el) {
      var warnings = this.model.warnings();
      if (!warnings) {
        $(el).css({'display': 'none'});
        $(el).off();
      } else {
        $(el).attr({'title': warnings.join('\n')}).tipTip();
      }
    }
  }, {
    create: function(options) {
      var view = new this(options);
      $(view.container).append(view.render().el);
      return view;
    }
  });
  
  window.DialogView = AutoView.extend({
    tagName: 'div',
    
    events: function() {
      return {
        'click .action-ok': 'ok',
        'click .action-cancel': 'cancel'
      };
    },
    
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      $(this.el).find('input').each(this.updateInput);
      $(this.el).find('select').each(this.updateInput);
      //this.$('select').each(this.updateSelect);
      return this;
    },
    
    saveAll: function() {
      $(this.el).find('input').each(this.saveInput);      
      $(this.el).find('select').each(this.saveSelect);
    },
    
    ok: function(e) {
      this.saving++;
      this.collection.add(this.model);
      this.saveAll();
      this.remove();
    },
    
    cancel: function(e) {
      this.remove();
    }
    
  }, {
    create: function(options) {
      var view = new this(options);
      $('body').append(view.render().el);
      setTimeout(function() {
        $(view.el).dialog();
      }, 0);
      return view;
    }
  });
  
  window.TableView = Backbone.View.extend({
    events: {
      'click .action-newitem' : 'newItem',
    },
    
    initialize: function() {
      _.bindAll(this, 'addOne', 'addAll');
    
      this.collection.bind('add', this.addOne, this);
      this.collection.bind('reset', this.addAll, this);
      
      this.addAll();
    },
    
    addOne: function(model) {
      var view = this.rowView.create({model: model});
    },
    
    addAll: function() {
      this.collection.each(this.addOne);
    }
  }, {
    create: function(options) {
      return new this(options);
    }
  });
  
  var RoleMixin = {
    updateInstitutions: function() {
     var model = this.model;
     var el = $(this.el).find('select.special-edit-institutions');
   
     el.empty();
     
     institutions.each(function(institution) {
       var option = $('<option/>')
              .attr({value: institution.get('id')});
       option.text(institution.get('name'));
       if (model.hasInstitution(institution)) {
         option.attr({'selected': 'selected'});
       }
       option.appendTo(el);
     });
     
     el.multiselect({'minWidth': 150});
   },
   
   saveInstitutions: function(index, el) {
     var model = this.model;
     $(el).find('option').each(function(index, option) {
       var institution = institutions.get($(option).val());
       if (!institution) return;
       model.setInstitution(institution, $(option).attr('selected') ? {} : null);
     });
   }
  };

  window.RoleRowView = RowView.extend({
     container: '#role-table',
     template: _.template($('#role-row-template').html()),
     
     events: function() {
       return mixin(RowView.prototype.events(), {
         'change .special-edit-institutions': 'changeInstitutions'
       });
     },
     
     initialize: function() {
       RowView.prototype.initialize.call(this);
     },
     
     render: function() {
       RowView.prototype.render.call(this);
       this.updateInstitutions();       
       return this;
     },

     changeInstitutions: function(e) {
       this.saveInstitutions(0, e.target);
     }
  });
  mixin(RoleRowView.prototype, RoleMixin);
  
  window.RoleTableView = TableView.extend({
    el: $('#roles'),
    rowView: RoleRowView,
    collection: roles,
    
    newItem: function() {
      var role = new Role();
      RoleDialogView.create({model: role, collection: this.collection});
    }
  });
  
  window.RoleDialogView = DialogView.extend({
    template: _.template($('#role-dialog-template').html()),
    
    initialize: function() {
      DialogView.prototype.initialize.call(this);
      _.bindAll(this, 'saveInstitutions');
    },
    
    render: function() {
       DialogView.prototype.render.call(this);
       this.updateInstitutions();       
       return this;
     },
     
     saveAll: function() {
       DialogView.prototype.saveAll.call(this);
       $(this.el).find('.special-edit-institutions').each(this.saveInstitutions);
     }
  });
  mixin(RoleDialogView.prototype, RoleMixin);

 var InstitutionMixin = {
   updateRoles: function() {
     var model = this.model;
     var el = $(this.el).find('select.special-edit-roles');
   
     el.empty();
     
     roles.each(function(role) {
       var option = $('<option/>')
              .attr({value: role.get('id')});
       option.text(role.get('name'));
       if (model.hasRole(role)) {
         option.attr({'selected': 'selected'});
       }
       option.appendTo(el);
     });
     
     el.multiselect({minWidth: 150});
   },
   
   saveRoles: function(index, el) {
     var model = this.model;
     $(el).find('option').each(function(index, option) {
       var role = roles.get($(option).val());
       if (!role) return;
       model.setRole(role, $(option).attr('selected') ? {} : null);
     });
   }
  };
  
  window.InstitutionRowView = RowView.extend({
     container: '#institution-table',
     template: _.template($('#institution-row-template').html()),
     
     events: function() {
       return mixin(RowView.prototype.events(), {
         'change .special-edit-roles': 'changeRoles'
       });
     },
 
     initialize: function() {
       RowView.prototype.initialize.call(this);
     },
     
     render: function() {
       RowView.prototype.render.call(this);
       this.updateRoles();       
       return this;
     },

     changeRoles: function(e) {
       this.saveRoles(0, e.target);
     }
  });
  mixin(InstitutionRowView.prototype, InstitutionMixin);
  
  window.InstitutionTableView = TableView.extend({
    el: $('#institutions'),
    rowView: InstitutionRowView,
    collection: institutions,
    
    newItem: function() {
      var institution = new Institution();
      InstitutionDialogView.create({model: institution, collection: this.collection});
    }
  });
  
  window.InstitutionDialogView = DialogView.extend({
    template: _.template($('#institution-dialog-template').html()),

    initialize: function() {
      DialogView.prototype.initialize.call(this);
      _.bindAll(this, 'saveRoles');
    },
    
    render: function() {
       DialogView.prototype.render.call(this);
       this.updateRoles();       
       return this;
     },
     
     saveAll: function() {
       DialogView.prototype.saveAll.call(this);
       $(this.el).find('.special-edit-roles').each(this.saveRoles);
     }
  });
  mixin(InstitutionDialogView.prototype, InstitutionMixin);
  
  window.InstitutionRoleGraph = Backbone.View.extend({
    el: $('#institution-role-graph'),
  
    initialize: function() {
      _.bindAll(this, 'render');
    
      roles.bind('change', this.delayedUpdate, this);
      institutions.bind('change', this.delayedUpdate, this);
    },
    
    delayedUpdate: function() {
      if (this.renderPending) return;
      
      renderPending = true;
      setTimeout(this.render, 0);
    },
    
    render: function() {
      renderPending = false;
      
      var g = new Graph();
      g.layoutMinX = 0;
      g.layoutMinY = 0;
      g.layoutMaxX = 1000;
      g.layoutMaxY = 1000;
      
      var self = this;
      
      g.bind('movenode', function(args) {
        if (!args.node.model) return;
        if (isNaN(args.x)) { self.delayedUpdate(); return; };
        args.node.model.save({
          x: args.x,
          y: args.y
        });
      });

      g.bind('createedge', function(args) {
        var from = args.fromNode.model,
            to = args.toNode.model;
            
        if (from instanceof Role && to instanceof Institution) {
          from.setInstitution(to, {});
        } else if (to instanceof Role && from instanceof Institution) {
          to.setInstitution(from, {});
        }
      });
      
      g.bind('changeedgelabel', function(args) {
        var from = args.fromNode.model,
            to = args.toNode.model;
            
        if (from instanceof Role && to instanceof Institution) {
          from.setInstitution(to, {label: args.label});
        } else if (to instanceof Role && from instanceof Institution) {
          to.setInstitution(from, {label: args.label});
        }
      });
      
      var color = "#00bf2f";
      roles.each(function(role) {
        g.addNode(role.get('id'), {
          model: role,
          label: role.get('name'),
          layoutPosX: role.get('x'),
          layoutPosY: role.get('y'),
          color: color
        });
      });
           
      var color = "#00a2bf";
      institutions.each(function(institution) {
        g.addNode(institution.get('id'), {
          model: institution,
          label: institution.get('name'),
          layoutPosX: institution.get('x'),
          layoutPosY: institution.get('y'),
          color: color
        });
        
        var links = institution.get('roles');
        for (var key in links) {
          if (links.hasOwnProperty(key)) {
            g.addEdge(key, institution.get('id'), { 
              label: links[key].label,
              placeholder: '... label ...' 
            });
          }
        }
      });
      
      this.el.empty();

      var renderer = new Graph.Renderer.Raphael(this.el.attr('id'), g, 908);
      //var layouter = new Graph.Layout.Spring(g);

      renderer.draw();
    }
  }, {
    create: function() {
      return (new this()).render();
    }
  });
  
  window.LocationRowView = RowView.extend({
     container: '#location-table',
     template: _.template($('#location-row-template').html())
  });
  
  window.LocationTableView = TableView.extend({
    el: $('#locations'),
    rowView: LocationRowView,
    collection: locations,
    
    newItem: function() {
      var location = new Location();
      LocationDialogView.create({model: location, collection: this.collection});
    }
  });
  
  window.LocationDialogView = DialogView.extend({
    template: _.template($('#location-dialog-template').html()),
  });

  window.ResourceRowView = RowView.extend({
     container: '#resource-table',
     template: _.template($('#resource-row-template').html())
  });
  
  window.ResourceTableView = TableView.extend({
    el: $('#resources'),
    rowView: ResourceRowView,
    collection: resources,
    
    newItem: function() {
      var resource = new Resource();
      ResourceDialogView.create({model: resource, collection: this.collection});
    }
  });
  
  window.ResourceDialogView = DialogView.extend({
    template: _.template($('#resource-dialog-template').html()),
  });
  
  window.LocationLinkGraph = Backbone.View.extend({
    el: $('#location-link-graph'),
  
    initialize: function() {
      _.bindAll(this, 'render');
      locations.bind('change', this.delayedUpdate, this);
    },
    
    delayedUpdate: function() {
      if (this.renderPending) return;
      renderPending = true;
      setTimeout(this.render, 0);
    },
    
    render: function() {
      renderPending = false;
      
      var g = new Graph();
      g.layoutMinX = 0;
      g.layoutMinY = 0;
      g.layoutMaxX = 1000;
      g.layoutMaxY = 1000;
      
      g.bind('movenode', function(args) {
        if (!args.node.model) return;
        args.node.model.save({
          x: args.x,
          y: args.y
        });
      });

      g.bind('createedge', function(args) {
        var from = args.fromNode.model,
            to = args.toNode.model;
        console.log(args);
        if (from instanceof Location && to instanceof Location) {
          from.setLink(to, {});
        }
      });
      
      var color = "#bf2f00";
      locations.each(function(res) {
        g.addNode(res.get('id'), {
          model: res,
          label: res.get('name'),
          layoutPosX: res.get('x'),
          layoutPosY: res.get('y'),
          color: color
        });
      });
           
      locations.each(function(res) {
        var links = res.get('links');
        for (var key in links) {
          if (links.hasOwnProperty(key) &&
              key > res.get('id')) {            
            g.addEdge(key, res.get('id'));
          }
        }
      });
      
      this.el.empty();

      var renderer = new Graph.Renderer.Raphael(this.el.attr('id'), g, 908);
      //var layouter = new Graph.Layout.Spring(g);

      renderer.draw();
    }
  }, {
    create: function() {
      return (new this()).render();
    }
  });

});


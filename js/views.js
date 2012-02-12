
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
    
    save: function(method) {
      this._saving = true;
      this._save(method);
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
      this.el = $('<select />').attr({'class': 'multi-select'}).appendTo(this.parent);
	  
      for (var value in this.options) {
        if (this.options.hasOwnProperty(value)) {
          var option = $('<option />')
            .attr({value: value})
            .appendTo(this.el);
          option.text(this.options[value]);
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
      
      if (!this._multiselectRendered) {	  
        $(this.el).multiselect({
          'minWidth': '160', 
          selectedList: 1, 
          header: false,
          noneSelectedText: 'Choose',
          multiple: false
        });
        this._multiselectRendered = true;
      } else {
        $(this.el).multiselect("refresh");
      }
    },
    
    _save: function() {
       this.model.save(kv(this.field, $(this.el).find('option:selected').val()));
    }
  });
  
  window.NestedTable = Widget.extend({
    render: function() {
      var view = new (this.table)({
        collection: this.model.get(this.field),
        parent: this.parent,
        'class': 'nested'
      });
      
      this._bind();
    },
    
    _bind: function() {
      var coll = this.model.get(this.field);
      coll.bind('change', this._triggerChange);
      coll.bind('add', this._triggerChange);
      coll.bind('reset', this._triggerChange);
      coll.bind('destroy', this._triggerChange);
    },
    
    _unbind: function() {
      var coll = this.model.get(this.field);
      coll.unbind('change', this._triggerChange);
      coll.unbind('add', this._triggerChange);
      coll.unbind('reset', this._triggerChange);
      coll.unbind('destroy', this._triggerChange);
    },
    
    destroy: function() {
      this._unbind();
    },
    
    update: function() {
    },
    
    _save: function() {
      // HACK HACK HACK HACK
      var baton = this.model.get('___baton');
      this.model.save({ ___baton: (baton || 0) + 1 });
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
      this.el = $('<select />').attr({'class': 'multi-select'}).appendTo(this.parent);
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

      if (!this.multiple && !this.required) {
        var option = $('<option/>')
            .attr({value: "_empty"})
            .appendTo(self.el);
        option.text("-");
      }
      
      this._getOptionCollection().each(function(model) {
        var option = $('<option/>')
          .attr({value: model.get('id')})
          .appendTo(self.el);
        option.text(model.get(self.optionLabelField));
      });
      
      if (this.newDialog) {
        var option = $('<option/>')
            .attr({value: "_new"})
            .appendTo(self.el);
        option.text("Create new...");
      }
      
      var selected = this.model.get(this.field);
      
      for (var id in selected) {
        if (selected.hasOwnProperty(id)) {
          $(this.el).find('option[value=' + id + ']').attr({selected: 'selected'});
        }
      }
	  
      if (!this._multiselectRendered) {	  
        $(this.el).multiselect({
          'minWidth': '150', 
          selectedList: 1, 
          header: false,
          noneSelectedText: '-',
          multiple: this.multiple
        });
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
        var id = $(el).val();

        if (id === '_new') {
          if (!$(el).attr('selected')) {
            return;
          }
          
          var item = new (self._getOptionCollection().model);
          var newDialog = (typeof self.newDialog === 'string') ? window[self.newDialog] : self.newDialog;
          var dialog = new newDialog({model: item});
          dialog.bind('save', function() {
            var method = 'set' + self.field[0].toUpperCase() + self.field.slice(1).replace(/s$/, '');
            self.model[method](item, {});
          });
          
          $(self.el).multiselect('close');
          self._saving = false;
          self.deferredUpdate();
          return;
        }
        
        var item = self._getOptionCollection().get(id);
        if (!item) return;
        var method = 'set' + self.field[0].toUpperCase() + self.field.slice(1).replace(/s$/, '');
        self.model[method](item, $(el).attr('selected') ? {} : null);
      });
    }
  });
  
  window.RemoteSelectFromMany = Widget.extend({

    render: function() {
      this.el = $('<select />').attr({'class': 'multi-select'}).appendTo(this.parent);
      if (this.multiple) {
        this.el.attr({multiple: 'multiple'});
      }
	  
      this.update();
      this._bind();
    },
    
    _getOptionCollection: function(collection) {
      return (typeof collection !== 'string') ? collection : window[collection]
    },
    
    update: function() {
      var self = this;
      
      $(this.el).empty();

      var sources = this.sources;
      for (var i = 0; i < sources.length; i++) {
        var source = sources[i];
        
        this._getOptionCollection(source.optionCollection).each(function(model) {
          var option = $('<option/>')
            .attr({value: i + "__" + model.get('id')})
            .appendTo(self.el);
          option.text(model.get(source.optionLabelField));
        });
        
        var selected = this.model.get(source.field);
        
        for (var id in selected) {
          if (selected.hasOwnProperty(id)) {
            $(this.el).find('option[value=' + i + '__' + id + ']').attr({selected: 'selected'});
          }
        }
      }
      
      if (!this._multiselectRendered) {	  
        $(this.el).multiselect({
          'minWidth': '150', 
          selectedList: 1, 
          header: false,
          noneSelectedText: 'Choose',
          multiple: this.multiple
        });
        this._multiselectRendered = true;
      } else {
        $(this.el).multiselect("refresh");
      }
    },
    
    _bind: function() {
      $(this.el).change(this._triggerChange);
      this.model.bind('change:' + this.fieldName, this.deferredUpdate);
      for (var i = 0; i < this.sources.length; i++) {
        this._getOptionCollection(this.sources[i].optionCollection).bind('change', this.deferredUpdate);
      }
    },
    
    _unbind: function() {
      this.model.unbind('change:' + this.fieldName, this.deferredUpdate);
      for (var i = 0; i < this.sources.length; i++) {
        this._getOptionCollection(this.sources[i].optionCollection).unbind('change', this.deferredUpdate);
      }
    },
    
    _save: function() {
      var self = this;
      $(this.el).find('option').each(function(index, el) {
        var val = $(el).val();
        var matches = /^(\d+)__(.*)$/.exec(val);
        if (!matches) return;
        var source = self.sources[matches[1]];
        var id = matches[2]
        
        var item = self._getOptionCollection(source.optionCollection).get(id);
        if (!item) return;
        var method = 'set' + source.field[0].toUpperCase() + source.field.slice(1).replace(/s$/, '');
        self.model[method](item, $(el).attr('selected') ? {} : null);
      });
    }
  });
});

$(function() {
  window.TableView2 = Backbone.View.extend({
    'class': 'striped',
  
    initialize: function(options) {
      _.bindAll(this, '_newItem');
    
      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          this[key] = options[key];
        }
      }
      
      if (typeof this.collection === 'string') {
        this.collection = window[this.collection];
      }
      
      this._rowViews = [];

      this.render();
      return this;
    },
    
    render: function() {
      _.bindAll(this, '_addOne', '_addAll');
      
      this.el = $('<table/>').addClass(this['class']).appendTo(this.parent);
      
      this.thead = $('<thead/>').appendTo(this.el);
      var tr = $('<tr/>').appendTo(this.thead);
      $('<th/>').attr({colspan: 2}).appendTo(tr);
      for (var i = 0; i < this.definition.length; i++) {
        $('<th/>')
          .appendTo(tr)
          .attr({'class': this.definition[i].headClass || 'input-column'})
          .text(this.definition[i].label);
      }
      
      this.tbody = $('<tbody/>').appendTo(this.el);
      
      this.tfoot = $('<tfoot/>').appendTo(this.el);
      var tr = $('<tr class="new-item"/>').appendTo(this.tfoot);
      $('<td/>').attr({colspan: 2}).appendTo(tr);
      var td = $('<td/>').attr({colspan: this.definition.length}).appendTo(tr);
      $('<a href="javascript:void(0)">Add...</a>').appendTo(td).click(this._newItem);
      
      this.collection.bind('add', this._addOne);
      this.collection.bind('reset', this._addAll);
      this.collection.bind('destroy', this._addAll);
      
      this._addAll();
    },
    
    _addOne: function(model) {
      var cls = ((this._rowViews.length + 1) % 2) ? 'odd' : 'even';
      var view = new (this.rowView)({model: model, parent: this.tbody, 'class': cls});
      this._rowViews.push(view);
    },
    
    _addAll: function() {
      this._destroyRows();
      this.tbody.empty();
    
      this.collection.each(this._addOne);
    },
    
    _destroyRows: function() {
      for (var i = 0; i < this._rowViews.length; i++) {
        this._rowViews[i].destroy();
      };
      this._rowViews = [];
    },
    
    _newItem: function() {
      var model = new this.collection.model();
      (new this.newDialog({model: model, collection: this.collection}));
      //this._addOne(model);
    },
    
    destroy: function() {
      this._destroyRows();
      
      this.collection.unbind('add', this._addOne);
      this.collection.unbind('reset', this._addAll);
      this.collection.unbind('destroy', this._addAll);
    }
    
  }, {
    create: function(options) {
      return new this(options);
    }
  });
  
  window.RowView2 = Backbone.View.extend({
    'class': '',
  
    initialize: function(options) {
      _.bindAll(this, 'removeItem', '_updateWarnings');
    
      options = options || {};
      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          this[key] = options[key];
        }
      }
      
      if (typeof this.collection === 'string') {
        this.collection = window[this.collection];
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
    
    _updateWarnings: function() {
      var warnings = this.model.warnings();
      if (!warnings) {
        $(this.warningsEl).hide();
        $(this.warningsEl).off();
      } else {
        $(this.warningsEl).show();
        $(this.warningsEl).attr({'title': warnings.join('\n')}).tipTip();
      }
    },
    
    render: function() {
      this.el = $('<tr/>').addClass(this['class']).appendTo(this.parent);
      
      var td = $('<td/>').appendTo(this.el);
      this.warningsEl = $('<span class="warnings"/>').appendTo(td);
      
      $('<td><a class="delete" href="javascript:void(0)">&nbsp;</a></td>')
        .appendTo(this.el)
        .find('a').click(this.removeItem);
      
      this._widgets = [];
      for (var i = 0; i < this.definition.length; i++) {
        var d = this.definition[i];
        
        var td = $('<td/>').appendTo(this.el);
        var widget = new (d.widget)({model: this.model, parent: td});
        this._widgets.push(widget);
        widget.bind('change', widget.save);
      }
              
      this._updateWarnings();
      this.model.bind('change', this._updateWarnings);
    },
    
    destroy: function() {
      this.model.unbind('change', this._updateWarnings);
      this._destroyWidgets();
    },
    
    removeItem: function() {
      this.model.destroy();
    }
  });
  
  window.DialogView2 = Backbone.View.extend({
    initialize: function(options) {
      _.bindAll(this, 'save', 'close');
    
      options = options || {};
      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          this[key] = options[key];
        }
      }
      
      if (typeof this.collection === 'string') {
        this.collection = window[this.collection];
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
      this.el = $('<div/>').appendTo($('body'));
      
      this.tbody = $('<table class="form"><tbody/></table>').appendTo(this.el).find('tbody');
      
      this._widgets = [];
      for (var i = 0; i < this.definition.length; i++) {
        var d = this.definition[i];
        
        var tr = $('<tr/>').appendTo(this.tbody);
        
        $('<th/>').text(d.label).appendTo(tr);
        
        var td = $('<td/>').appendTo(tr);
        var widget = new (d.widget)({model: this.model, parent: td});
        this._widgets.push(widget);
      }
      
      $('<input type="submit" value="OK" />').appendTo(this.el).click(this.save);
      $('<input type="submit" value="Cancel" />').appendTo(this.el).click(this.close);
      
      $(this.el).dialog({
        title: this.title,
        minWidth: 700,
        modal: true
      });
    },
    
    destroy: function() {
      this._destroyWidgets();
    },
    
    close: function() {
      this.trigger('close');
      this.destroy();
      $(this.el).remove();
    },
    
    save: function() {
      if (!this.model.collection)
        this.collection.add(this.model);
      
      for (var i = 0; i < this._widgets.length; i++) {
        this._widgets[i].save();
      }
            
      this.trigger('save');
      this.close();      
    }
  });
});

$(function() {
  /*
    window.RoleDialogView2 = DialogView2.extend({
    collection: 'roles',
    definition: roleDefinition
  });
  
  window.RoleRowView2 = RowView2.extend({
    definition: roleDefinition
  });
  
  window.RoleTableView2 = TableView2.extend({
    parent: $('#roles2'),
    rowView: RowView2,
    collection: 'roles',
    definition: roleDefinition,
    newDialog: RoleDialogView2
  });
  */
  
  window.generateViews = function(name, definition) {
     var className = name[0].toUpperCase() + name.slice(1);
     var collectionName = name + 's';
     
     var dialogView = window[className + 'DialogView'] = DialogView2.extend({
       collection: name + 's',
       definition: definition,
       title: 'New ' + name
     });
     
     var rowView = window[className + 'RowView'] = RowView2.extend({
       definition: definition
     });
     
     var tableView = window[className + 'TableView'] = TableView2.extend({
       parent: $('#' + name + 's'),
       rowView: rowView,
       collection: collectionName,
       definition: definition,
       newDialog: dialogView
     });
  }
});

$(function(){
  // Special case views for evaluation structure
  window.MatrixView = Backbone.View.extend({
    initialize: function(options) {
      _.bindAll(this, 'deferredUpdate');
    
      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          this[key] = options[key];
        }
      }
      
      this._views = [];

      this.render();
      return this;
    },
    
    render: function() {
      this.table = $('<table/ class="matrix striped">').appendTo(this.parent);
      this.thead = $('<thead/>').appendTo(this.table);
      this.tbody = $('<tbody/>').appendTo(this.table);
      
      this.update();
      this._bind();
    },
    
    _bind: function() {
      roles.bind('add', this.deferredUpdate);
      roles.bind('reset', this.deferredUpdate);
      roles.bind('destroy', this.deferredUpdate);

      actionSituations.bind('add', this.deferredUpdate);
      actionSituations.bind('reset', this.deferredUpdate);
      actionSituations.bind('destroy', this.deferredUpdate);
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

    update: function() {
      var self = this;
      
      this.thead.empty();
      this.tbody.empty();
      
      function getRel(role, actionSituation) {
        return (role.getEvaluation(actionSituation) || {})[self.field] || 'd';
      }
      
      function setRel(role, actionSituation, value) {
        role.setEvaluation(actionSituation, kv(self.field, value));
      }
      
      var tr = $('<tr/>').appendTo(this.thead);
      $('<th/>').appendTo(tr);
      for (var i = 0; i < actionSituations.length; i++) {
        var model = actionSituations.at(i);
        var th = $('<th/>').appendTo(tr);
        th.text(model.get('name'));
      }
      
      var n = 1;
      roles.each(function(role) {
        var tr = $('<tr/>')
          .attr({'class': (n++ % 2) ? 'odd' : 'even'})
          .appendTo(self.tbody);
        var th = $('<th/>').appendTo(tr);
        th.text(role.get('name'));
        
        actionSituations.each(function(actionSituation) {
          var td = $('<td/>').appendTo(tr);
          var select = $('<select/>').appendTo(td);
          $('<option value="d">D</option>').appendTo(select);
          $('<option value="i">I</option>').appendTo(select);
          $('<option value="n">N</option>').appendTo(select);
          select.val(getRel(role, actionSituation));
          select.change(function() {
            var value = select.find('option:selected').val();
            setRel(role, actionSituation, value);
          });
        });
      });
    }
  });

  window.RealityClosenessMatrixView = MatrixView.extend({
    field: 'reality',
    parent: $('#realityCloseness')
  });
  
  window.ScopeMatrixView = MatrixView.extend({
    field: 'scope',
    parent: $('#scope')
  });
});

$(function() {
  generateViews('role', [
    { label: 'Name',                widget: TextInput.extend({ field: 'name' }) },
    { label: 'Objective',           widget: TextInput.extend({ field: 'objective' }) },
    { label: 'Sub-objectives',      widget: TextInput.extend({ field: 'sub_objectives' }) },
    { label: 'Institutions',        widget: RemoteSelect.extend({ field: 'institutions', optionCollection: 'institutions', optionLabelField: 'name', multiple: true, newDialog: 'InstitutionDialogView' }) },
    { label: 'Entrée conditions',   widget: TextInput.extend({ field: 'entry_conditions' }) },
    { label: 'Institutional capabilities', widget: TextInput.extend({ field: 'institutional_capabilities' }) },
  ]);
  
  generateViews('institution', [
    { label: 'Name',           widget: TextInput.extend({ field: 'name' }) },
    { label: 'Attributes',     widget: RemoteSelect.extend({ field: 'roles', optionCollection: 'roles', optionLabelField: 'name', multiple: true }) },
    { label: 'Deontic type',   widget: Select.extend({ field: 'deontic_type', options: { permission: 'Permission', obligation: 'Obligation', prohibition: 'Prohibition' } }) },
    { label: 'Aim',           widget: TextInput.extend({ field: 'aim' }) },
    { label: 'Condition',      widget: TextInput.extend({ field: 'condition' }) },
    { label: 'Or else',        widget: TextInput.extend({ field: 'or_else' }) },
    { label: 'Institutional type', widget: Select.extend({ field: 'instititional_type', options: { formal: 'Formal', informal: 'Informal' } } ) },
  ]);
  
  generateViews('agent', [
    { label: 'Name',           widget: TextInput.extend({ field: 'name' }) },
  	{ label: 'Properties',     widget: TextInput.extend({ field: 'properties' }) },
	  { label: 'Personal values', widget: TextInput.extend({ field: 'personal_values' }) },
    { label: 'Roles',          widget: RemoteSelect.extend({ field: 'roles', optionCollection: 'roles', optionLabelField: 'name', multiple: true, newDialog: 'RoleDialogView' }) },
    { label: 'Physical components', widget: RemoteSelect.extend({ field: 'components', optionCollection: 'components', optionLabelField: 'name', multiple: true }) },
    { label: 'Type',   		     widget: Select.extend({ field: 'type', options: { external: 'External', institutional: 'Institutional' } }) },
    { label: 'Information',    widget: TextInput.extend({ field: 'information' }) },
    { label: 'Intrinsic capability', widget: TextInput.extend({ field: 'intrinsic_capability' }) },
    { label: 'Decision making behavior', widget: TextInput.extend({ field: 'decision_making_behavior' }) },
  ]);

  generateViews('component', [
    { label: 'Name',           widget: TextInput.extend({ field: 'name' }) },
    { label: 'Properties',     widget: TextInput.extend({ field: 'properties' }) },
    { label: 'Type',   		     widget: Select.extend({ field: 'type', options: { open: 'Open', fenced: 'Fenced' } }) },
    { label: 'Behaviors',      widget: TextInput.extend({ field: 'behaviors' }) },
  ]);

  generateViews('actionSituation', [
    { label: 'Name',           widget: TextInput.extend({ field: 'name' }) },
  ]);  
  
  generateViews('action', [
    { label: 'Action situation',         widget: RemoteSelect.extend({ field: 'actionSituation', optionCollection: 'actionSituations', optionLabelField: 'name', multiple: false, newDialog: ActionSituationDialogView }) },
    { label: 'Roles', widget: RemoteSelect.extend({ field: 'roles', optionCollection: 'roles', optionLabelField: 'name', multiple: true, newDialog: 'ComponentDialogView' }) },
    { label: 'Action body',    widget: RemoteSelectFromMany.extend({ multiple: false, sources: [
      { field: 'body_components', optionCollection: 'components', optionLabelField: 'behavior' },
      { field: 'body_roles', optionCollection: 'roles', optionLabelField: 'institutional_capabilities' },
      { field: 'body_agents', optionCollection: 'agents', optionLabelField: 'intrinsic_capability' },
    ]}) },
    { label: 'Physical components', widget: RemoteSelect.extend({ field: 'components', optionCollection: 'components', optionLabelField: 'name', multiple: true, newDialog: 'ComponentDialogView' }) },
    { label: 'Institutional statement', widget: RemoteSelect.extend({ field: 'institutions', optionCollection: 'institutions', optionLabelField: 'name', multiple: true, newDialog: 'InstitutionDialogView' }) },
    { label: 'Precondition',   widget: TextInput.extend({ field: 'precondition' }) },
    { label: 'Postcondition',  widget: TextInput.extend({ field: 'precondition' }) },
  ]);
  
  generateViews('roleEnactment', [
    { label: 'Agent',      widget: RemoteSelect.extend({ field: 'agent', optionCollection: 'agents', optionLabelField: 'name', multiple: false }) },
    { label: 'Action',     widget: RemoteSelect.extend({ field: 'actionSituation', optionCollection: 'actionSituations', optionLabelField: 'name', multiple: false }) },
    { label: 'Role',       widget: RemoteSelect.extend({ field: 'role', optionCollection: 'roles', optionLabelField: 'name', multiple: false }) },
  ]);
});

$(function() {
  window.DependencyNetworkView = Backbone.View.extend({
    el: $('#dependencynetwork'),
  
    initialize: function() {
      _.bindAll(this, 'render');
    
      roles.bind('change', this.delayedUpdate, this);
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
            
        from.setDependee(to, {});
      });
      
      g.bind('changeedgelabel', function(args) {
        var from = args.fromNode.model,
            to = args.toNode.model;
            
        from.setDependee(to, {label: args.label});
        self.delayedUpdate();
      });
      
      g.bind('destroyedge', function(args) {
        var from = args.fromNode.model,
            to = args.toNode.model;
            
        from.setDependee(to, null);
        self.delayedUpdate();
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
      
      roles.each(function(role) {
        var links = role.get('dependees');
        for (var key in links) {
          if (links.hasOwnProperty(key)) {
            g.addEdge(role.get('id'), key, { 
              label: links[key].label,
              placeholder: '...',
              directed: true
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
});


$(function() {
  window.CompositionDiagramView = Backbone.View.extend({
    el: $('#compositiondiagram'),
  
    initialize: function() {
      _.bindAll(this, 'render');
    
      components.bind('change', this.delayedUpdate, this);
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
            
        from.setComposee(to, {});
      });
           
      g.bind('destroyedge', function(args) {
        var from = args.fromNode.model,
            to = args.toNode.model;
            
        from.setComposee(to, null);
        self.delayedUpdate();
      });
      
      var color = "#005fbf";
      components.each(function(component) {
        g.addNode(component.get('id'), {
          model: component,
          label: component.get('name'),
          layoutPosX: component.get('x'),
          layoutPosY: component.get('y'),
          color: color
        });
      });
      
      components.each(function(component) {
        var links = component.get('composees');
        for (var key in links) {
          if (links.hasOwnProperty(key)) {
            g.addEdge(component.get('id'), key, { 
              directed: true
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
});


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

    _bind: function() {},

    _unbind: function() {},

    _triggerChange: function() {
      this.trigger('change');
    },

    update: function() {},

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

  window.Computed = Widget.extend({
    template: '<span />',

    _bind: function() {
      $(this.el).change(this._triggerChange);
      this.model.bind('change', this.update);
    },

    _unbind: function() {
      this.model.unbind('change', this.update);
    },

    update: function() {
      $(this.el).text(this.model[this.field]());
    },

    save: function() {}
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

  window.MultipleTextInput = Widget.extend({
    template: '<input type="text" />',

    _bind: function() {
      $(this.el).change(this._triggerChange);
      this.model.bind('change:' + this.field, this.update);
    },

    _unbind: function() {
      this.model.unbind('change:' + this.field, this.update);
    },

    update: function() {
      var value = this.model.get(this.field);
      if (!value) {
        value = '';
      } else if (value instanceof Array) {
        value = value.join(', ');
      }
      $(this.el).val(value);
    },

    save: function() {
      var value = $(this.el).val();
      var array = value.split(/[;,]/);
      for (var i = array.length - 1; i >= 0; i--) {
        var item = (array[i] + '').replace(/^\s+|\s+$/g, '');
        if (!item) {
          array.splice(i, 1);
        } else {
          array[i] = item;
        }
      }
      this.model.save(kv(this.field, array));
    }
  });

  window.Select = Widget.extend({
    render: function() {
      this.el = $('<select />').attr({
        'class': 'multi-select'
      }).appendTo(this.parent);

      for (var value in this.choices) {
        if (this.choices.hasOwnProperty(value)) {
          var option = $('<option />').attr({
            value: value
          }).appendTo(this.el);
          option.text(this.choices[value]);
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
      }
      else {
        $(this.el).multiselect("refresh");
      }
    },

    _save: function() {
      this.model.save(kv(this.field, $(this.el).find('option:selected').val()));
    }
  });

  window.NestedTable = Widget.extend({
    render: function() {
      var view = new(this.table)({
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

    update: function() {},

    _save: function() {
      // HACK HACK HACK HACK
      var baton = this.model.get('___baton');
      this.model.save({
        ___baton: (baton || 0) + 1
      });
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
    initialize: function() {
      _.bindAll(this, '_maybeCreateNew');
      Widget.prototype.initialize.apply(this, arguments);
    },

    render: function() {
      this.el = $('<select />').attr({
        'class': 'multi-select'
      }).appendTo(this.parent);
      if (this.multiple) {
        this.el.attr({
          multiple: 'multiple'
        });
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
        var option = $('<option/>').attr({
          value: "_empty"
        }).appendTo(self.el);
        option.text("-");
      }

      this._getOptionCollection().each(function(model) {
        var option = $('<option/>').attr({
          value: model.get('id')
        }).appendTo(self.el);
        option.text(model.get(self.optionLabelField));
      });

      if (this.newDialog) {
        var option = $('<option/>').attr({
          value: "_new"
        }).appendTo(self.el);
        option.text("Create new...");
      }

      var selected = this.model.get(this.field);

      for (var id in selected) {
        if (selected.hasOwnProperty(id)) {
          $(this.el).find('option[value=' + id + ']').attr({
            selected: 'selected'
          });
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
      }
      else {
        $(this.el).multiselect("refresh");
      }
    },

    _bind: function() {
      $(this.el).change(this._triggerChange);
      if (this.newDialog) {
        $(this.el).change(this._maybeCreateNew);
      }
      this.model.bind('change:' + this.fieldName, this.deferredUpdate);
      this._getOptionCollection().bind('change', this.deferredUpdate);
    },

    _unbind: function() {
      this.model.unbind('change:' + this.fieldName, this.deferredUpdate);
      this._getOptionCollection().unbind('change', this.deferredUpdate);
    },

    _maybeCreateNew: function() {
      var self = this;
      var newOption = $(this.el).find('option[value=_new]');
      if (newOption && newOption.attr('selected')) {
        var item = new(self._getOptionCollection().model);
        var newDialog = (typeof self.newDialog === 'string') ? window[self.newDialog] : self.newDialog;
        var dialog = new newDialog({
          model: item
        });
        dialog.bind('save', function() {
          setTimeout(function() {
            $(self.el).find('option[value=' + item.get('id') + ']').attr('selected', 'selected');
            $(self.el).multiselect("refresh");
            self._triggerChange();
          }, 10);
        });
        dialog.bind('close', function() {
          newOption.removeAttr('selected');
          $(this.el).multiselect("refresh");
        });

        $(self.el).multiselect('close');
        self.deferredUpdate();
      }
    },

    _save: function() {
      var self = this;
      $(this.el).find('option').each(function(index, el) {
        var id = $(el).val();

        if (id === '_new') {
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
      this.el = $('<select />').attr({
        'class': 'multi-select'
      }).appendTo(this.parent);
      if (this.multiple) {
        this.el.attr({
          multiple: 'multiple'
        });
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
          var values = (model.get(source.optionField) || []);
          if (!(values instanceof Array)) {
            values = [values]; 
          }
          for (var i = 0; i < values.length; i++) {
            var value = values[i].replace(/^\s+|\s+$/g, '');
            if (!value) continue;
            var option = $('<option/>').attr({
              value: value
            }).appendTo(self.el);
            option.text(value);
          }
        });
      }

      var selected = this.model.get(self.field);
      $(this.el).find('option[value=' + selected + ']').attr({
        selected: 'selected'
      });

      if (!this._multiselectRendered) {
        $(this.el).multiselect({
          'minWidth': '150',
          selectedList: 1,
          header: false,
          noneSelectedText: 'Choose',
          multiple: false //this.multiple
        });
        this._multiselectRendered = true;
      }
      else {
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
      this.model.save(kv(this.field, $(this.el).find('option:selected').val()));
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
      $('<th/>').attr({
        colspan: 2
      }).appendTo(tr);
      for (var i = 0; i < this.definition.length; i++) {
        $('<th/>').appendTo(tr).attr({
          'class': this.definition[i].headClass || 'input-column'
        }).text(this.definition[i].label);
      }

      this.tbody = $('<tbody/>').appendTo(this.el);

      this.tfoot = $('<tfoot/>').appendTo(this.el);
      var tr = $('<tr class="new-item"/>').appendTo(this.tfoot);
      $('<td/>').attr({
        colspan: 2
      }).appendTo(tr);
      var td = $('<td/>').attr({
        colspan: this.definition.length
      }).appendTo(tr);
      $('<a href="javascript:void(0)">Add...</a>').appendTo(td).click(this._newItem);

      this.collection.bind('add', this._addOne);
      this.collection.bind('reset', this._addAll);
      this.collection.bind('destroy', this._addAll);

      this._addAll();
    },

    _addOne: function(model) {
      var cls = ((this._rowViews.length + 1) % 2) ? 'odd' : 'even';
      var view = new(this.rowView)({
        model: model,
        parent: this.tbody,
        'class': cls
      });
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
      (new this.newDialog({
        model: model,
        collection: this.collection
      }));
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
      if (!warnings || !warnings.length) {
        $(this.warningsEl).hide();
        $(this.warningsEl).off();
      }
      else {
        $(this.warningsEl).show();
        $(this.warningsEl).attr({
          'title': warnings.join('\n')
        }).tipTip();
      }
    },

    render: function() {
      this.el = $('<tr/>').addClass(this['class']).appendTo(this.parent);

      var td = $('<td class="warnings"/>').appendTo(this.el);
      this.warningsEl = $('<span class="warnings"/>').appendTo(td);

      $('<td class="delete"><a class="delete" href="javascript:void(0)">&nbsp;</a></td>').appendTo(this.el).find('a').click(this.removeItem);

      this._widgets = [];
      for (var i = 0; i < this.definition.length; i++) {
        var d = this.definition[i];

        var td = $('<td/>').appendTo(this.el);
        var widget = new(d.widget)({
          model: this.model,
          parent: td
        });
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
        var widget = new(d.widget)({
          model: this.model,
          parent: td
        });
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
      if (!this.model.collection) this.collection.add(this.model);

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

  window.generateViews = function(name, definition, prettyName) {
    prettyName = prettyName || name;
    var className = name[0].toUpperCase() + name.slice(1);
    var collectionName = name + 's';

    var dialogView = window[className + 'DialogView'] = DialogView2.extend({
      collection: name + 's',
      definition: definition,
      title: 'New ' + prettyName
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

$(function() {
  // Special case views for evaluation structure
  window.MatrixView = Backbone.View.extend({
    initialize: function(options) {
      _.bindAll(this, 'deferredUpdate', '_newItem');

      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          this[key] = options[key];
        }
      }

      this._views = [];

      this.newDialog = DialogView2.extend({
        collection: this.collection,
        definition: [{
          label: 'Label',
          widget: TextInput.extend({
            field: 'label'
          })
        }],
        title: 'New ' + this.prettyName
      });

      this.render();
      return this;
    },

    render: function() {
      this.table = $('<table/ class="matrix striped">').appendTo(this.parent);
      this.thead = $('<thead/>').appendTo(this.table);
      this.tbody = $('<tbody/>').appendTo(this.table);
      this.tfoot = $('<tfoot/>').appendTo(this.table);

      this.update();
      this._bind();
    },

    _bind: function() {
      this.collection.bind('add', this.deferredUpdate);
      this.collection.bind('reset', this.deferredUpdate);
      this.collection.bind('destroy', this.deferredUpdate);

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
      this.tfoot.empty();

      function getRel(variable, actionSituation) {
        return (variable.getEvaluation(actionSituation) || {})[self.field] || 'd';
      }

      function setRel(variable, actionSituation, value) {
        variable.setEvaluation(actionSituation, kv(self.field, value));
      }

      var tr = $('<tr/>').appendTo(this.thead);
      $('<th/>').appendTo(tr);
      $('<th/>').text(this.prettyName.replace(/^(.)/, function(m) {
        return m.toUpperCase();
      })).appendTo(tr);
      for (var i = 0; i < actionSituations.length; i++) {
        var model = actionSituations.at(i);
        var td = $('<td/>').appendTo(tr);
        td.text(model.get('label'));
      }

      var n = 1;
      self.collection.each(function(variable) {
        var tr = $('<tr/>').attr({
          'class': (n++ % 2) ? 'odd' : 'even'
        }).appendTo(self.tbody);

        $('<th class="delete"><a class="delete" href="javascript:void(0)">&nbsp;</a></th>').appendTo(tr).find('a').click(function() {
          variable.destroy();
        });

        var th = $('<th/>').appendTo(tr);
        var input = $('<input type="text" />').appendTo(th);
        input.val(variable.get('label')).change(function() {
          variable.save({
            'label': input.val()
          });
        });

        actionSituations.each(function(actionSituation) {
          var td = $('<td/>').appendTo(tr);
          var select = $('<select/>').appendTo(td);
          $('<option value="d">D</option>').appendTo(select);
          $('<option value="i">I</option>').appendTo(select);
          $('<option value="n">N</option>').appendTo(select);
          select.val(getRel(variable, actionSituation));
          select.change(function() {
            var value = select.find('option:selected').val();
            setRel(variable, actionSituation, value);
          });
        });
      });

      var tr = $('<tr class="new-item"/>').appendTo(this.tfoot);
      $('<th />').attr({
        colspan: 1
      }).appendTo(tr);
      var th = $('<th/>').attr({
        colspan: 1 + actionSituations.length
      }).appendTo(tr);
      $('<a href="javascript:void(0)">Add...</a>').appendTo(th).click(this._newItem);
    },

    _newItem: function() {
      var model = new this.collection.model();
      (new this.newDialog({
        model: model,
        collection: this.collection
      }));
      //this._addOne(model);
    },
  });

  window.RealityClosenessMatrixView = MatrixView.extend({
    field: 'evaluation',
    collection: validationVariables,
    parent: $('#realityCloseness'),
    prettyName: 'validation variable'
  });

  window.ScopeMatrixView = MatrixView.extend({
    field: 'evaluation',
    collection: domainProblemVariables,
    parent: $('#scope'),
    prettyName: 'domain problem variable'
  });
});

$(function() {
  generateViews('role', [{
    label: 'Label',
    widget: TextInput.extend({
      field: 'label'
    })
  }, {
    label: 'Objective',
    widget: TextInput.extend({
      field: 'objective'
    })
  }, {
    label: 'Sub-objectives\u00b9',
    widget: MultipleTextInput.extend({
      field: 'sub_objectives'
    })
  }, {
    label: 'Institutions',
    widget: RemoteSelect.extend({
      field: 'institutions',
      optionCollection: 'institutions',
      optionLabelField: 'label',
      multiple: true,
      newDialog: 'InstitutionDialogView'
    })
  }, {
    label: 'Entr\u00b9e conditions\u00b9',
    widget: MultipleTextInput.extend({
      field: 'entry_conditions'
    })
  }, {
    label: 'Institutional capabilities\u00b9',
    widget: MultipleTextInput.extend({
      field: 'institutional_capabilities'
    })
  }, ]);

  generateViews('institution', [{
    label: 'Label',
    widget: TextInput.extend({
      field: 'label'
    })
  }, {
    label: 'Attributes',
    widget: RemoteSelect.extend({
      field: 'roles',
      optionCollection: 'roles',
      optionLabelField: 'label',
      multiple: true,
      newDialog: 'RoleDialogView'
    })
  }, {
    label: 'Deontic type',
    widget: Select.extend({
      field: 'deontic_type',
      choices: {
        none: 'None',
        permission: 'Permission',
        obligation: 'Obligation',
        prohibition: 'Prohibition'
      }
    })
  }, {
    label: 'Aim',
    widget: TextInput.extend({
      field: 'aim'
    })
  }, {
    label: 'Condition',
    widget: TextInput.extend({
      field: 'condition'
    })
  }, {
    label: 'Or else',
    widget: TextInput.extend({
      field: 'or_else'
    })
  }, {
    label: 'Institutional type',
    widget: Computed.extend({
      field: 'instititional_type'
    })
  }, ]);

  generateViews('agent', [{
    label: 'Label',
    widget: TextInput.extend({
      field: 'label'
    })
  }, {
    label: 'Properties\u00b9',
    widget: MultipleTextInput.extend({
      field: 'properties'
    })
  }, {
    label: 'Personal values\u00b9',
    widget: MultipleTextInput.extend({
      field: 'personal_values'
    })
  }, {
    label: 'Information',
    widget: TextInput.extend({
      field: 'information'
    })
  }, {
    label: 'Physical components',
    widget: RemoteSelect.extend({
      field: 'components',
      optionCollection: 'components',
      optionLabelField: 'label',
      multiple: true,
      newDialog: 'ComponentDialogView'
    })
  }, {
    label: 'Possible roles',
    widget: RemoteSelect.extend({
      field: 'roles',
      optionCollection: 'roles',
      optionLabelField: 'label',
      multiple: true,
      newDialog: 'RoleDialogView'
    })
  }, {
    label: 'Intrinsic capabilities\u00b9',
    widget: MultipleTextInput.extend({
      field: 'intrinsic_capability'
    })
  }, {
    label: 'Decision making criteria\u00b9',
    widget: MultipleTextInput.extend({
      field: 'decision_making_behavior'
    })
  }, ]);

  generateViews('component', [{
    label: 'Label',
    widget: TextInput.extend({
      field: 'label'
    })
  }, {
    label: 'Properties\u00b9',
    widget: MultipleTextInput.extend({
      field: 'properties'
    })
  }, {
    label: 'Type',
    widget: Select.extend({
      field: 'type',
      choices: {
        open: 'Open',
        fenced: 'Fenced'
      }
    })
  }, {
    label: 'Behaviors\u00b9',
    widget: MultipleTextInput.extend({
      field: 'behaviors'
    })
  }, ]);

  generateViews('actionSituation', [{
    label: 'Label',
    widget: TextInput.extend({
      field: 'label'
    })
  }, ], 'action situation');

  generateViews('action', [{
    label: 'Action situation',
    widget: RemoteSelect.extend({
      field: 'actionSituation',
      optionCollection: 'actionSituations',
      optionLabelField: 'label',
      multiple: false,
      newDialog: ActionSituationDialogView
    })
  }, {
    label: 'Roles',
    widget: RemoteSelect.extend({
      field: 'roles',
      optionCollection: 'roles',
      optionLabelField: 'label',
      multiple: true,
      newDialog: 'RoleDialogView'
    })
  }, {
    label: 'Action body',
    widget: RemoteSelectFromMany.extend({
      multiple: false,
      field: 'body',
      sources: [{
        optionCollection: 'components',
        optionField: 'behaviors'
      }, {
        optionCollection: 'roles',
        optionField: 'institutional_capabilities'
      }, {
        optionCollection: 'agents',
        optionField: 'intrinsic_capability'
      }, ]
    })
  }, {
    label: 'Physical components',
    widget: RemoteSelect.extend({
      field: 'components',
      optionCollection: 'components',
      optionLabelField: 'label',
      multiple: true,
      newDialog: 'ComponentDialogView'
    })
  }, {
    label: 'Institutional statement',
    widget: RemoteSelect.extend({
      field: 'institutions',
      optionCollection: 'institutions',
      optionLabelField: 'label',
      multiple: true,
      newDialog: 'InstitutionDialogView'
    })
  }, {
    label: 'Precondition',
    widget: TextInput.extend({
      field: 'precondition'
    })
  }, {
    label: 'Postcondition',
    widget: TextInput.extend({
      field: 'precondition'
    })
  }, ]);

  generateViews('roleEnactment', [{
    label: 'Agent',
    widget: RemoteSelect.extend({
      field: 'agent',
      optionCollection: 'agents',
      optionLabelField: 'label',
      multiple: false
    })
  }, {
    label: 'Action',
    widget: RemoteSelect.extend({
      field: 'actionSituation',
      optionCollection: 'actionSituations',
      optionLabelField: 'label',
      multiple: false
    })
  }, {
    label: 'Role',
    widget: RemoteSelect.extend({
      field: 'role',
      optionCollection: 'roles',
      optionLabelField: 'label',
      multiple: false
    })
  }, ]);
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
        if (isNaN(args.x)) {
          self.delayedUpdate();
          return;
        };
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

        from.setDependee(to, {
          label: args.label
        });
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
          label: role.get('label'),
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
              label: role.get('objective') || '',
              directed: true,
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
        if (isNaN(args.x)) {
          self.delayedUpdate();
          return;
        };
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
          label: component.get('label'),
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
              directed: true,
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
  window.ConnectionDiagramView = Backbone.View.extend({
    el: $('#connectiondiagram'),

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
        if (isNaN(args.x)) {
          self.delayedUpdate();
          return;
        };
        args.node.model.save({
          x: args.x,
          y: args.y
        });
      });

      g.bind('createedge', function(args) {
        var from = args.fromNode.model,
            to = args.toNode.model;

        from.setConnection(to, {});
      });

      g.bind('destroyedge', function(args) {
        var from = args.fromNode.model,
            to = args.toNode.model;

        from.setConnection(to, null);
        self.delayedUpdate();
      });

      g.bind('changeedgelabel', function(args) {
        var from = args.fromNode.model,
            to = args.toNode.model;

        from.setConnection(to, {
          label: args.label
        });
        self.delayedUpdate();
      });

      var color = "#005fbf";
      components.each(function(component) {
        g.addNode(component.get('id'), {
          model: component,
          label: component.get('label'),
          layoutPosX: component.get('x'),
          layoutPosY: component.get('y'),
          color: color
        });
      });

      components.each(function(component) {
        var links = component.get('connections');
        for (var key in links) {
          if (links.hasOwnProperty(key)) {
            g.addEdge(component.get('id'), key, {
              directed: false,
              label: links[key].label,
              placeholder: '...',
              editable: true
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

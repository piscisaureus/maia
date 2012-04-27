$(function() {
  // Process a "load" url or fetch from local storage.
  // Hack: do this before rendering the views.
  var result = window.location.hash.match(/^#load=(\w+)/i);
  if (result) {
    setTimeout(function() {
      var modelId = result[1];
      var load = confirm('It looks like you want to load a model. If you are working on another model, it will be overwritten.\n\nDo you really want to load this model?');
      if (!load) {
        fetchFromLocalStorage();
      } else {
        $.ajax({url: 'load.php?id=' + modelId, dataType: 'json'})
          .success(function(data) {
            loadModel(data);
            // Hack.
            window.location.hash = "";
            window.location.reload();
          })
          .error(function() {
            alert("Sorry. We were unable to load your model.")
            fetchFromLocalStorage();
          })
      }
    }, 50);
  } else {
    fetchFromLocalStorage();
  }

  RoleTableView.create();
  InstitutionTableView.create();
  DependencyNetworkView.create();

  ComponentTableView.create();
  CompositionDiagramView.create();
  ConnectionDiagramView.create();

  AgentTableView.create();

  ActionSituationTableView.create();
  ActionTableView.create();
  RoleEnactmentTableView.create();

  (new RealityClosenessMatrixView());

  (new ScopeMatrixView());

  // Bind export buttons
  $('#exportxml').click(function() { exportXML(false); });
  $('#exportxmldownload').click(function() { exportXML(true); });

  // Bind the save button
  $('#savemodel').click(function() {
    var model = saveInfos.get(0);
    if (!model) {
      model = new SaveInfo();
      saveInfos.add(model);
      model.save();
    }
    var dialog = new SaveDialogView({
      model: model
    });
    dialog.bind('save', function() {
      saveModel(model.get('email'), model.get('description'));
    });
  });

  // Set up backbone router
  var Workspace = Backbone.Router.extend({
    routes: {
      ":show": "show"
    },

    show: function(structure) {
      if (/^load=/i.test(structure)) {
        structure = 'about';
      }
      $('.contentArea').hide();
      $('#' + (structure || 'about')).show();
    }
  });
  new Workspace();
  Backbone.history.start();


  // Set up SPRY accordion panels
  $('.Accordion').each(function(index, el) {
    new Spry.Widget.Accordion($(el).attr('id'), {
      useFixedPanelHeights: false,
      defaultPanel: $(el).is(':first')
    });
  });
});
$(function() {
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

  // Set up backbone router
  var Workspace = Backbone.Router.extend({
    routes: {
      ":show": "show"
    },

    show: function(structure) {
      $('.contentArea').hide();
      console.log(structure);
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
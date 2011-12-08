
$(function() {
  var SpryAccordion1 = new Spry.Widget.Accordion("SpryAccordion1", {useFixedPanelHeights:false, defaultPanel:0});
  var SpryAccordion2 = new Spry.Widget.Accordion("SpryAccordion2", {useFixedPanelHeights:false, defaultPanel:0});
  
  RoleTableView.create();
  InstitutionTableView.create();
  InstitutionRoleGraph.create();
  LocationTableView.create();
  LocationLinkGraph.create();
  ResourceTableView.create();

  var Workspace = Backbone.Router.extend({
    routes: {
      ":show":    "show"   
    },

    show: function(structure) {
      $('.contentArea').hide();
      console.log(structure);
      $('#' + (structure || 'institutional')).show();
      console.log("aaa");
    }
  });
  new Workspace();
  Backbone.history.start();
});
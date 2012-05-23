
$(function() {
  window.roles = new RoleList();
  window.institutions = new InstitutionList();
  window.agents = new AgentList();
  window.components = new ComponentList();
  window.actionSituations = new ActionSituationList();
  window.actions = new ActionList();
  window.roleEnactments = new RoleEnactmentList();
  
  roles.fetch();
  institutions.fetch();
  agents.fetch();
  components.fetch();
  actionSituations.fetch();
  actions.fetch();
  roleEnactments.fetch();
});
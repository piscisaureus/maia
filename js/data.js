$(function() {
  window.agents = new AgentList();
  window.roles = new RoleList();
  window.institutions = new InstitutionList();
  window.components = new ComponentList();
  window.actionSituations = new ActionSituationList();
  window.actions = new ActionList();
  window.roleEnactments = new RoleEnactmentList();
  window.validationVariables = new ValidationVariableList();
  window.domainProblemVariables = new DomainProblemVariableList();

  agents.fetch();
  roles.fetch();
  institutions.fetch();
  components.fetch();
  actionSituations.fetch();
  actions.fetch();
  roleEnactments.fetch();
  validationVariables.fetch();
  domainProblemVariables.fetch();
});
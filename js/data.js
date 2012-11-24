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
  window.saveInfos = new SaveInfoList();
});

function fetchFromLocalStorage() {
  agents.fetch();
  roles.fetch();
  institutions.fetch();
  components.fetch();
  actionSituations.fetch();
  actions.fetch();
  roleEnactments.fetch();
  validationVariables.fetch();
  domainProblemVariables.fetch();
  saveInfos.fetch();
}

// Kind of hacky how this works
function saveModel(email, description) {
  var data = {};
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    data[key] = localStorage.getItem(key);
  }
  var fields = {
    email: email,
    description: description,
    data: JSON.stringify(data)
  };
  $.post('save.php', fields);
}

function loadModel(data) {
  localStorage.clear();
  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      localStorage.setItem(key, data[key]);
    }
  }
}

function clearModel() {
  localStorage.clear(); 
}

$(function() {
  window.roles = new RoleList();
  window.institutions = new InstitutionList();
  window.locations = new LocationList();
  window.resources = new ResourceList();

  roles.fetch();
  institutions.fetch();
  locations.fetch();  
  resources.fetch();
});
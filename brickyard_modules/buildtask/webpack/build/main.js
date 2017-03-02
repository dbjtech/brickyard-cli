<% for(var k in plugins){ %>require("<%= k %>")
<% } %>

module.exports = <%= JSON.stringify(plugins,null,'\t') %>

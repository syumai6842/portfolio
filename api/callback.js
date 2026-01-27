const { createVercelHandlers } = require('netlify-cms-oauth-provider-node');

const { complete } = createVercelHandlers({}, { useEnv: true });

module.exports = complete;

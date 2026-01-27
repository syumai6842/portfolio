const { createVercelHandlers } = require('netlify-cms-oauth-provider-node');

const { begin } = createVercelHandlers({}, { useEnv: true });

module.exports = begin;

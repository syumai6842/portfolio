import oauthProvider from 'netlify-cms-oauth-provider-node';

const { createVercelHandlers } = oauthProvider;
const { complete } = createVercelHandlers({}, { useEnv: true });

export default complete;

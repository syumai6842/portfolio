import oauthProvider from 'netlify-cms-oauth-provider-node';

const { createVercelHandlers } = oauthProvider;
const { begin } = createVercelHandlers({}, { useEnv: true });

export default begin;

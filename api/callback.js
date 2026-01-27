import { createVercelHandlers } from 'netlify-cms-oauth-provider-node';

const { complete } = createVercelHandlers({}, { useEnv: true });

export default complete;

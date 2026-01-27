import { createVercelHandlers } from 'netlify-cms-oauth-provider-node';

const { begin } = createVercelHandlers({}, { useEnv: true });

export default begin;

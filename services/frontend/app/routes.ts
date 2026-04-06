import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/_index.tsx'),
  route('workspace', 'routes/workspace/layout.tsx', [index('routes/workspace/index.tsx')]),
] satisfies RouteConfig;

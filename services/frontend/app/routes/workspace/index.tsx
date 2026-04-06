import { Link } from 'react-router';

export default function WorkspaceIndexRoute() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Select a workspace</h1>
      <p className="text-muted-foreground">
        This is a placeholder page. Next, we’ll wire it to workspace-service and list real
        workspaces.
      </p>
      <div>
        <Link className="text-primary underline underline-offset-4" to="/">
          Back to home
        </Link>
      </div>
    </div>
  );
}

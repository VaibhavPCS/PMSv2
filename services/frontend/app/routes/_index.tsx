import { Link } from 'react-router';

export default function IndexRoute() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">PMS</h1>
      <p className="text-muted-foreground">App scaffold is running.</p>
      <div>
        <Link className="text-primary underline underline-offset-4" to="/workspace">
          Go to workspace
        </Link>
      </div>
    </main>
  );
}


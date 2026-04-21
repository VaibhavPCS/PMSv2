import Link from 'next/link';
import { ROUTES } from '@shared/constants';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-7xl font-bold text-blue-600 mb-4">404</p>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href={ROUTES.DASHBOARD}
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
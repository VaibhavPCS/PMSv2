export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="PMS Logo">
              <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" />
              <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.7" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.7" />
              <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PMS</h1>
          <p className="text-sm text-gray-500 mt-1">Project Management System</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
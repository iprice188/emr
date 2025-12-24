import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
        <p className="text-gray-600">Welcome back</p>
      </div>

      {/* Primary Action */}
      <Link
        to="/jobs/new"
        className="block w-full bg-black text-white text-center py-4 rounded-lg font-medium text-lg shadow-lg active:bg-gray-800"
      >
        + New Job
      </Link>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Active Jobs</div>
          <div className="text-2xl font-bold">0</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Outstanding Quotes</div>
          <div className="text-2xl font-bold">0</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Unpaid Invoices</div>
          <div className="text-2xl font-bold">0</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Total Outstanding</div>
          <div className="text-2xl font-bold">£0</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-semibold mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <Link
            to="/jobs"
            className="block card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">View All Jobs</span>
              <span className="text-gray-400">→</span>
            </div>
          </Link>
          <Link
            to="/customers"
            className="block card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">View Customers</span>
              <span className="text-gray-400">→</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Jobs */}
      <div>
        <h3 className="font-semibold mb-3">Recent Jobs</h3>
        <div className="text-center text-gray-500 py-8">
          No jobs yet. Create your first job to get started!
        </div>
      </div>
    </div>
  )
}

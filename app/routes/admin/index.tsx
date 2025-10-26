import { Link, useOutletContext } from "react-router";

interface AdminContextType {
  trees: Array<{ id: string; name: string; version: string; docVersion: string }>;
  keys: Array<{ id: string; name: string }>;
  url: string;
}

export default function AdminIndex() {
  const { trees, keys } = useOutletContext<AdminContextType>();

  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold mb-2">Overview</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-700">Total Trees</h3>
          <p className="text-3xl font-bold text-indigo-600">{trees.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-700">Total Access Keys</h3>
          <p className="text-3xl font-bold text-indigo-600">{keys.length}</p>
        </div>
      </div>
      <div className="mt-6">
        <h3 className="text-md font-semibold mb-2">Quick Actions</h3>
        <div className="flex flex-col space-y-2 mt-4">
          <Link
            to="/admin/trees"
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 w-fit"
          >
            Manage Trees (Create, Edit, Delete)
          </Link>
          <Link
            to="/admin/keys"
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 w-fit"
          >
            Manage Access Keys (Create, View)
          </Link>
        </div>
      </div>
    </div>
  );
}

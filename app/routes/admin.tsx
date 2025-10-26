import {
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import { Link, Outlet, useLoaderData } from "react-router";
import { requireUserId } from "~/session.server";
import { getTrees } from "~/models/tree.server";
import { getKeys } from "~/models/key.server";

export const meta: MetaFunction = () => {
  return [{ title: "Admin" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  const trees = await getTrees();
  const keys = await getKeys();
  const url =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000/"
      : "https://marcsfamilytrees.com/";
  return {
    trees,
    keys,
    url,
  };
}

export default function AdminLayout() {
  const loaderData = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto h-full max-w-7xl sm:px-6 lg:px-8">
      <h1 className="text-xl">Dashboard</h1>
      <hr className="my-1" />
      <div className="flex flex-row space-x-1">
        <Link
          to="/admin"
          className="flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Dashboard
        </Link>
        <Link
          to="/admin/trees"
          className="flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Manage Trees
        </Link>
        <Link
          to="/admin/keys"
          className="flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Manage Keys
        </Link>
      </div>
      <Outlet context={{ trees: loaderData.trees, keys: loaderData.keys, url: loaderData.url }} />
    </div>
  );
}

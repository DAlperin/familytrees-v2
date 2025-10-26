import { LoaderFunctionArgs } from "react-router";
import { prisma } from "~/db.server";
import { useLoaderData } from "react-router";
import { Viewer } from "~/components/Viewer";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const key = await prisma.accessKey.findFirst({
    where: {
      id: params.key,
    },
    include: {
      trees: true,
    },
  });
  return {
    key,
  };
};

export default function Key() {
  const loaderData = useLoaderData<typeof loader>();
  if (!loaderData.key) {
    return (
      <div className="mx-auto h-full max-w-7xl sm:px-6 lg:px-8">
        <h1 className="text-xl">Invalid key...</h1>
      </div>
    );
  }
  return (
    <div className="mx-auto h-full max-w-7xl sm:px-6 lg:px-8">
      <h1 className="text-xl">Hello {loaderData.key?.name}</h1>
      {loaderData.key.trees.map((tree) => (
        <div key={tree.id} className="my-2 h-3/4 w-full">
          <div className="mb-2 flex flex-col space-x-2">
            <p className="font-bold">{tree.name}</p>
            <a
              className="flex w-1/5 justify-center rounded-md border border-transparent bg-blue-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              href={`https://zaydes-trees.s3.amazonaws.com/${tree.docVersion}`}
            >
              Download Explainer Doc
            </a>
          </div>
          <Viewer
            id={tree.version}
            className="h-3/4 w-full border-2 border-gray-400"
          />
        </div>
      ))}
    </div>
  );
}

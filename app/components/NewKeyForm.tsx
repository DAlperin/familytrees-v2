import { Tree } from "@prisma/client";
import { Form, useFetcher } from "react-router";
import { RefObject } from "react";

export function NewKeyForm({
  trees,
  formRef,
}: {
  trees: Tree[];
  formRef: RefObject<HTMLFormElement>;
}) {
  const fetcher = useFetcher();
  return (
    <Form
      ref={formRef}
      method="post"
      encType="multipart/form-data"
      className="mt-2 sm:w-full sm:max-w-md"
    >
      <div className="flex flex-col space-y-2">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Name
        </label>
        <div className="mt-1">
          <input
            type="text"
            name="name"
            id="name"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Dov Alperin"
          />
        </div>
        {trees.map((tree) => (
          <div key={tree.id} className="flex items-center">
            <input
              id={tree.id}
              name="tree"
              value={tree.id}
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label
              htmlFor={tree.id}
              className="ml-2 block text-sm text-gray-900"
            >
              {tree.name}
            </label>
          </div>
        ))}
        <button
          type="submit"
          name="intent"
          value="create_key"
          className="flex w-1/2 justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {fetcher.state === "submitting" ? "Processing Create..." : "Create"}
        </button>
      </div>
    </Form>
  );
}

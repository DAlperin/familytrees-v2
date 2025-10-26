import { Form, useNavigation } from "react-router";
import { RefObject } from "react";

export function NewTreeForm({
  formRef,
}: {
  formRef: RefObject<HTMLFormElement>;
}) {
  const navigation = useNavigation();
  return (
    <Form
      method="post"
      ref={formRef}
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
            placeholder="My Family Tree"
          />
        </div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Image
        </label>
        <div className="mt-1">
          <input
            type="file"
            name="upload"
            className="block border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Document
        </label>
        <div className="mt-1">
          <input
            type="file"
            name="document"
            className="block border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          name="intent"
          value="create"
          className="flex w-1/2 justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {navigation.state === "submitting" ? "Processing upload..." : "Create"}
        </button>
      </div>
    </Form>
  );
}

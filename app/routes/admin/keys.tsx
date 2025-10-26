import { type ActionFunctionArgs } from "react-router";
import { unstable_parseMultipartFormData } from "@remix-run/node";
import { useEffect, useRef, useState } from "react";
import { uploadHandler } from "~/uploadHandler.server";
import { useActionData, useFetcher, useOutletContext, useRevalidator } from "react-router";
import { createKey, deleteKey } from "~/models/key.server";
import { NewKeyForm } from "~/components/NewKeyForm";

interface AdminContextType {
  trees: Array<{
    id: string;
    name: string;
    version: string;
    docVersion: string;
  }>;
  keys: Array<{
    id: string;
    name: string;
    trees: Array<{ id: string; name: string }>;
  }>;
  url: string;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler
  );

  const intent = formData.get("intent");

  // Handle delete
  if (intent === "delete_key") {
    const id = formData.get("id");
    if (typeof id !== "string") {
      return {
        success: {
          key: false,
          delete: false,
        },
        errors: {
          name: null,
          trees: null,
        },
      };
    }
    await deleteKey(id);
    return {
      success: {
        key: false,
        delete: true,
      },
      errors: {
        name: null,
        trees: null,
      },
    };
  }

  // Handle create
  const trees = formData.getAll("tree");
  const name = formData.get("name");

  // Validate name
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return {
      success: {
        key: false,
      },
      errors: {
        name: "Name is required",
        trees: null,
      },
    };
  }

  // Validate that at least one tree is selected
  if (!trees || trees.length === 0) {
    return {
      success: {
        key: false,
      },
      errors: {
        name: null,
        trees: "At least one tree must be selected",
      },
    };
  }

  try {
    await createKey(name, trees as string[]);
    return {
      success: {
        key: true,
      },
      errors: {
        name: null,
        trees: null,
      },
    };
  } catch (e) {
    console.error("Error creating key:", e);
    return {
      success: {
        key: false,
      },
      errors: {
        name: null,
        trees: "Failed to create key. Please try again.",
      },
    };
  }
}

export default function AdminKeys() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const actionData = useActionData<typeof action>();
  const { trees, keys, url } = useOutletContext<AdminContextType>();
  let keyFormRef = useRef<HTMLFormElement>(null);
  const revalidator = useRevalidator();
  const fetcher = useFetcher();

  useEffect(() => {
    if (actionData?.success?.key) {
      keyFormRef.current?.reset();
      setShowCreateForm(false);
      revalidator.revalidate();
    }
  }, [actionData, revalidator]);

  useEffect(() => {
    // Revalidate when fetcher completes (for delete operations)
    if (fetcher.state === "idle" && fetcher.data) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center space-x-4">
        <h2 className="text-lg font-semibold">Manage Access Keys</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          {showCreateForm ? "Cancel" : "Create New Key"}
        </button>
      </div>

      {showCreateForm && (
        <>
          <NewKeyForm formRef={keyFormRef} trees={trees} />
          {actionData?.errors?.name && (
            <p className="text-red-600">{actionData?.errors?.name}</p>
          )}
          {actionData?.errors?.trees && (
            <p className="text-red-600">{actionData?.errors?.trees}</p>
          )}
          {actionData?.success?.key && (
            <p className="text-green-600">Key created successfully!</p>
          )}
        </>
      )}

      <h3 className="text-md mt-6 mb-2 font-semibold">Existing Keys</h3>
      {keys.map((key) => (
        <div key={key.id} className="mb-4 rounded-lg border p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-bold">{key.name}</p>
              <a
                className="text-blue-500"
                target="_blank"
                href={`${url}${key.id}`}
                rel="noreferrer"
              >
                {`${url}${key.id}`}
              </a>
              <p className="mt-2 text-sm text-gray-600">Access to trees:</p>
              <ul className="list-inside list-disc">
                {key.trees.map((tree) => (
                  <li key={tree.id}>{tree.name}</li>
                ))}
              </ul>
            </div>
            <button
              className="flex justify-center rounded-md border border-transparent bg-red-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              onClick={() => {
                fetcher.submit(
                  { intent: "delete_key", id: key.id },
                  {
                    method: "post",
                    encType: "multipart/form-data",
                  }
                );
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

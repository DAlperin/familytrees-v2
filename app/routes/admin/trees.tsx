import {
  type ActionFunctionArgs,
  redirect,
} from "react-router";
import {
  unstable_parseMultipartFormData,
  type NodeOnDiskFile,
} from "@remix-run/node";
import { useEffect, useRef, useState } from "react";
import { rmSync, uploadHandler } from "~/uploadHandler.server";
import { Form, useActionData, useFetcher, useOutletContext, useRevalidator } from "react-router";
import { tileImage } from "~/sharp.server";
import type { PutObjectCommandInput } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import { s3Client } from "~/s3.server";
import readdir from "recursive-readdir";
import {
  createTree,
  deleteTree,
  updateDocVersion,
  updateVersion,
} from "~/models/tree.server";
import { NewTreeForm } from "~/components/NewTreeForm";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Viewer } from "~/components/Viewer";

interface AdminContextType {
  trees: Array<{ id: string; name: string; version: string; docVersion: string }>;
  keys: Array<{ id: string; name: string }>;
  url: string;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler
  );
  let intent = formData.get("intent");
  switch (intent) {
    case "create": {
      const name = formData.get("name");
      const image = formData.get("upload")
        ? (formData.get("upload") as unknown as NodeOnDiskFile)
        : null;
      const doc = formData.get("document")
        ? (formData.get("document") as unknown as NodeOnDiskFile)
        : null;

      if (typeof name !== "string") {
        return {
          success: {
            create: false,
            update: false,
          },
          errors: {
            name: "Invalid name",
            image: null,
          },
        };
      }
      if (name.length < 5) {
        return {
          success: {
            create: false,
            update: false,
          },
          errors: {
            name: "Name must be at least 5 chars",
            image: null,
          },
        };
      }
      if (!image?.name) {
        return {
          success: {
            create: false,
            update: false,
          },
          errors: {
            name: null,
            image: "image required",
          },
        };
      }
      if (!doc?.name) {
        return {
          success: {
            create: false,
            update: false,
          },
          errors: {
            name: null,
            image: "document required",
          },
        };
      }
      const docVersion = doc?.name;
      let promisedUploads = [];
      const uploadDocFile = async () => {
        const docFile = await fs.readFileSync(`./tmp/uploads/${doc?.name}`);
        const docUploadParams: PutObjectCommandInput = {
          Bucket: "zaydes-trees",
          Key: doc?.name,
          Body: docFile,
          ACL: "public-read",
        };
        await s3Client.send(new PutObjectCommand(docUploadParams));
      };
      promisedUploads.push(uploadDocFile());
      const version = await tileImage(image?.name);
      // Upload dzi file
      const uploadFile = async () => {
        const dzFile = await fs.readFileSync(`./tmp/out/${version}.dzi`);
        const dziUploadParams: PutObjectCommandInput = {
          Bucket: "zaydes-trees",
          Key: `${version}/image.dzi`,
          Body: dzFile,
          ACL: "public-read",
        };
        console.log("Starting dzi upload");
        await s3Client.send(new PutObjectCommand(dziUploadParams));
        console.log("Finished dzi upload");
      };
      promisedUploads.push(uploadFile());
      // Upload all tiles
      const files = await readdir(`./tmp/out/${version}_files`, [
        "vips-properties.xml",
      ]);
      for (const filePath of files) {
        const path = filePath.split("/").slice(3, 5).join("/");
        const key = `${version}/image_files/${path}`;
        const uploadFile = async () => {
          const file = await fs.readFileSync(filePath);
          const uploadParams: PutObjectCommandInput = {
            Bucket: "zaydes-trees",
            Key: key,
            Body: file,
            ACL: "public-read",
          };
          console.log(`Starting upload for ${key}`);
          await s3Client.send(new PutObjectCommand(uploadParams));
          console.log(`Finished upload for ${key}`);
        };
        promisedUploads.push(uploadFile());
      }
      await Promise.all(promisedUploads);
      try {
        await createTree(name, version.toString(), docVersion);
      } catch (e) {
        console.log(e);
        if (e instanceof PrismaClientKnownRequestError) {
          if (e.code === "P2002") {
            return {
              success: {
                create: false,
                update: false,
              },
              errors: {
                name: "Name already taken, pick a new one",
                image: null,
              },
            };
          }
        }
      }
      rmSync(`./tmp/out/${version}.dzi`);
      rmSync(`./tmp/out/${version}_files`, { recursive: true, force: true });
      return {
        success: {
          create: true,
          update: false,
        },
        errors: {
          name: null,
          image: null,
        },
      };
    }
    case "delete_tree": {
      const id = formData.get("id");
      if (typeof id !== "string") {
        return {
          success: {
            create: false,
            update: false,
          },
          errors: {
            name: null,
            image: null,
            delete: "bad",
          },
        };
      }
      await deleteTree(id);
      return {
        success: {
          create: false,
          update: false,
        },
        errors: {
          name: null,
          image: null,
        },
      };
    }
    case "update_tree": {
      const id = formData.get("id");
      const image = formData.get("upload")
        ? (formData.get("upload") as unknown as NodeOnDiskFile)
        : null;
      const doc = formData.get("document")
        ? (formData.get("document") as unknown as NodeOnDiskFile)
        : null;
      if (image?.name) {
        let promisedUploads = [];
        const version = await tileImage(image?.name);
        // Upload dzi file
        const uploadFile = async () => {
          const dzFile = await fs.readFileSync(`./tmp/out/${version}.dzi`);
          const dziUploadParams: PutObjectCommandInput = {
            Bucket: "zaydes-trees",
            Key: `${version}/image.dzi`,
            Body: dzFile,
            ACL: "public-read",
          };
          console.log("Starting dzi upload");
          await s3Client.send(new PutObjectCommand(dziUploadParams));
          console.log("Finished dzi upload");
        };
        promisedUploads.push(uploadFile());
        // Upload all tiles
        const files = await readdir(`./tmp/out/${version}_files`, [
          "vips-properties.xml",
        ]);
        for (const filePath of files) {
          const path = filePath.split("/").slice(3, 5).join("/");
          const key = `${version}/image_files/${path}`;
          const uploadFile = async () => {
            const file = await fs.readFileSync(filePath);
            const uploadParams: PutObjectCommandInput = {
              Bucket: "zaydes-trees",
              Key: key,
              Body: file,
              ACL: "public-read",
            };
            console.log(`Starting upload for ${key}`);
            await s3Client.send(new PutObjectCommand(uploadParams));
            console.log(`Finished upload for ${key}`);
          };
          promisedUploads.push(uploadFile());
        }
        await Promise.all(promisedUploads);
        await updateVersion(id as string, version.toString());
      }
      if (doc?.name) {
        const docFile = await fs.readFileSync(`./tmp/uploads/${doc?.name}`);
        const docUploadParams: PutObjectCommandInput = {
          Bucket: "zaydes-trees",
          Key: doc?.name,
          Body: docFile,
          ACL: "public-read",
        };
        await s3Client.send(new PutObjectCommand(docUploadParams));
        await updateDocVersion(id as string, doc?.name);
      }
      return {
        success: {
          create: false,
          update: true,
        },
        errors: {
          name: null,
          image: null,
        },
      };
    }
  }
  return {
    success: {
      create: false,
      update: false,
    },
    errors: {
      name: null,
      image: null,
    },
  };
}

export default function AdminTrees() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTree, setEditingTree] = useState("");
  const actionData = useActionData<typeof action>();
  const { trees } = useOutletContext<AdminContextType>();
  let formRef = useRef<HTMLFormElement>(null);
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  useEffect(() => {
    console.log(actionData);
    if (actionData?.success?.create) {
      formRef.current?.reset();
      setShowCreateForm(false);
      revalidator.revalidate();
    }
    if (actionData?.success?.update) {
      setEditingTree("");
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
        <h2 className="text-lg font-semibold">Manage Trees</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          {showCreateForm ? "Cancel" : "Create New Tree"}
        </button>
      </div>

      {showCreateForm && (
        <>
          <NewTreeForm formRef={formRef} />
          {actionData?.errors?.name && (
            <p className="text-red-600">{actionData?.errors?.name}</p>
          )}
          {actionData?.errors?.image && (
            <p className="text-red-600">{actionData?.errors?.image}</p>
          )}
          {actionData?.success?.create && (
            <p className="text-green-600">Tree created successfully!</p>
          )}
        </>
      )}

      <h3 className="text-md font-semibold mt-6 mb-2">Existing Trees</h3>
      {trees.map((tree) => (
        <div key={tree.id} className="w-full mb-4">
          <p className="font-medium">{tree.name}</p>
          <div className="flex flex-row space-x-2">
            <button
              className="flex justify-center rounded-md border border-transparent bg-red-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              onClick={() => {
                fetcher.submit(
                  { intent: "delete_tree", id: tree.id },
                  {
                    method: "post",
                    encType: "multipart/form-data",
                  }
                );
              }}
            >
              Delete
            </button>
            <a
              className="flex justify-center rounded-md border border-transparent bg-blue-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              href={`https://zaydes-trees.s3.amazonaws.com/${tree.docVersion}`}
            >
              Download Doc
            </a>
            <button
              className="flex justify-center rounded-md border border-transparent bg-blue-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => {
                if (editingTree === tree.id) setEditingTree("");
                else setEditingTree(tree.id);
              }}
            >
              Edit Tree
            </button>
          </div>
          {editingTree === tree.id ? (
            <Form method="post" encType="multipart/form-data">
              <input
                hidden={true}
                readOnly={true}
                name="id"
                value={tree.id}
              />
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
                value="update_tree"
                className="flex w-1/2 justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Update
              </button>
            </Form>
          ) : (
            <Viewer
              id={tree.version}
              className="my-5 h-96 w-full border-2 border-gray-400"
            />
          )}
        </div>
      ))}
    </div>
  );
}

import {
  unstable_composeUploadHandlers,
  unstable_createFileUploadHandler,
  unstable_createMemoryUploadHandler,
} from "@remix-run/node";

export const fileUploadHandler = unstable_createFileUploadHandler({
  directory: "./tmp/uploads",
  maxPartSize: 60000000,
  file: ({ filename }) => {
    return `${Date.now()}_${filename}`;
  },
});

export const uploadHandler = unstable_composeUploadHandlers(
  fileUploadHandler,
  unstable_createMemoryUploadHandler()
);

export { rmSync, rmdirSync } from "fs";

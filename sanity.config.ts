import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./src/sanity/schemas";
export default defineConfig({
  name: "yeneta",
  title: "Yeneta Championship",
  projectId: process.env.SANITY_PROJECT_ID || "unconfigured",
  dataset: process.env.SANITY_DATASET || "production",
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("Championship")
          .items([
            S.listItem()
              .title("Championship data")
              .child(
                S.document()
                  .schemaType("championship")
                  .documentId("championship.current"),
              ),
          ]),
    }),
  ],
  schema: { types: schemaTypes },
});

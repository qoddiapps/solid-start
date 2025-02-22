import { copyFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { rollup } from "rollup";
import vite from "vite";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import common from "@rollup/plugin-commonjs";
import { spawn } from "child_process";

export default function () {
  return {
    start() {
      const proc = spawn("netlify", ["dev"]);
      proc.stdout.pipe(process.stdout);
      proc.stderr.pipe(process.stderr);
    },
    async build(config) {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const ssrEntry = `node_modules/solid-start/runtime/entries/stringAsync.tsx`;
      await Promise.all([
        vite.build({
          build: {
            outDir: "./dist/",
            rollupOptions: {
              input: `node_modules/solid-start/runtime/entries/client.tsx`
            }
          }
        }),
        vite.build({
          build: {
            ssr: true,
            outDir: "./.solid/server",
            rollupOptions: {
              input: ssrEntry,
              output: {
                format: "esm"
              }
            }
          }
        })
      ]);
      copyFileSync(
        join(config.root, ".solid", "server", "stringAsync.js"),
        join(config.root, ".solid", "server", "app.js")
      );
      copyFileSync(
        join(__dirname, "entry-async.js"),
        join(config.root, ".solid", "server", "index.js")
      );
      const bundle = await rollup({
        input: join(config.root, ".solid", "server", "index.js"),
        plugins: [
          json(),
          nodeResolve({
            exportConditions: ["node", "solid"]
          }),
          common()
        ]
      });
      // or write the bundle to disk
      await bundle.write({ format: "cjs", dir: join(config.root, "dist", "functions") });

      // closes the bundle
      await bundle.close();
    }
  };
}

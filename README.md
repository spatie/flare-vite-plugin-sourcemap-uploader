# Vite plugin for sending sourcemaps to Flare

The Flare Vite plugin helps you send sourcemaps of your compiled JavaScript code to Flare. This way, reports sent using the `@flareapp/flare-client` will be formatted correctly.

Additionally, it automatically passes the Flare API key to `@flareapp/flare-client`. This way, `flare.light()` works without any additional configuration.

Check the JavaScript error tracking section in [the Flare documentation](https://flareapp.io/docs/javascript-error-tracking/installation) for more information.

Looking for the Flare client? [Go to the @flareapp/flare-client repo](https://www.npmjs.com/package/@flareapp/flare-client).

## Installation

Install the plugin using NPM or Yarn:

```bash
yarn add --dev @flareapp/vite-plugin-sourcemap-uploader
# or
npm install --save-dev @flareapp/vite-plugin-sourcemap-uploader
```
Next, add the plugin to your `vite.config.js` file:

```js
import { defineConfig } from 'vite';
import FlareSourcemapUploader from './flare';

export default defineConfig({
    plugins: [
        FlareSourcemapUploader({
            key: 'YOUR API KEY HERE'
        }),
    ],
});
```

Run the `vite build` command to make sure the sourcemaps are generated. You should see the following lines in the output:

```bash
@flareapp/flare-vite-plugin-sourcemaps: Uploading 12 sourcemap files to Flare.
@flareapp/flare-vite-plugin-sourcemaps: Successfully uploaded sourcemaps to Flare.
```

## Configuration

```ts
type PluginConfig = {
    key?: string;
    base?: string;
    runInDevelopment: boolean;
    versionId: string;
    removeSourcemaps: boolean;
};
```

- `key: string` **(required)**: the Flare API key 
- `base: string`: the base path of built output (defaults to Vite's base path)
- `runInDevelopment: boolean`: whether to upload sourcemaps when `NODE_ENV=development` or when running the dev server (defaults to `false`)
- `versionId: string`: the sourcemap version (defaults to a fresh `uuid` per build)
- `removeSourcemaps: boolean`: whether to remove the sourcemaps after uploading them (defaults to `false`). Comes in handy when you want to upload sourcemaps to Flare but don't want them published in your build.

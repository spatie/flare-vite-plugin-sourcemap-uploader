import {resolve} from 'path';
import {existsSync, readFileSync, unlinkSync} from 'fs';
import glob from 'fast-glob';
import {deflateRawSync} from 'zlib';
import axios from 'axios';
import {Plugin, ResolvedConfig, UserConfig} from "vite";
import {OutputOptions} from "rollup";

type PluginConfig = {
    key?: string;
    base?: string;
    apiEndpoint: string;
    runInDevelopment: boolean;
    versionId: string;
    removeSourcemaps: boolean;
};

type Sourcemap = {
    original_file: string;
    content: string;
    sourcemap_url: string,
};

export default function FlareSourcemapUploader({
    key,
    base,
    apiEndpoint = 'https://flareapp.io/api/sourcemaps',
    runInDevelopment = false,
    versionId = uuid(),
    removeSourcemaps = false,
}: PluginConfig): Plugin {
    if (!key) {
        flareLog('No Flare API key was provided, not uploading sourcemaps to Flare.');
    }

    const enableUploadingSourcemaps = key &&
        (process.env.NODE_ENV !== 'development' || runInDevelopment) &&
        process.env.SKIP_SOURCEMAPS !== 'true';

    function uploadSourcemap(sourcemap: Sourcemap) {
        return new Promise((resolve, reject) => {
            const base64GzipSourcemap = deflateRawSync(sourcemap.content).toString('base64');

            axios
                .post(apiEndpoint, {
                    key,
                    version_id: versionId,
                    relative_filename: sourcemap.original_file,
                    sourcemap: base64GzipSourcemap,
                })
                .then(resolve)
                .catch((error) => {
                    return reject(`${error.response.status}: ${error.response.data}`);
                });
        });
    }

    return {
        name: 'flare-vite-plugin',
        apply: 'build',

        config({build}: UserConfig, {mode}: { mode: string }) {
            const enableSourcemaps = enableUploadingSourcemaps && mode !== 'development';

            return {
                // Set FLARE_SOURCEMAP_VERSION and API key so the Flare JS client can read it
                define: {
                    FLARE_SOURCEMAP_VERSION: `'${versionId}'`,
                    FLARE_JS_KEY: `'${key}'`,
                },
                build: {
                    sourcemap: build?.sourcemap !== undefined
                        ? build.sourcemap
                        : (enableSourcemaps ? 'hidden' : false),
                },
            };
        },

        configResolved(config: ResolvedConfig) {
            base = base || config.base;
            base += base.endsWith('/') ? '' : '/';
        },

        async writeBundle(outputConfig: OutputOptions) {
            if (!enableUploadingSourcemaps) {
                return;
            }

            const outputDir = outputConfig.dir || '';

            const files = await glob('./**/*.map', {cwd: outputDir});
            const sourcemaps = files.map((file): Sourcemap | null => {
                const sourcePath = file.replace(/\.map$/, '');
                const sourceFilename = resolve(outputDir, sourcePath);

                if (!existsSync(sourceFilename)) {
                    flareLog(`no corresponding source found for "${file}"`, true);
                    return null;
                }

                const sourcemapLocation = resolve(outputDir, file);

                try {
                    return {
                        content: readFileSync(sourcemapLocation, 'utf8'),
                        sourcemap_url: sourcemapLocation,
                        original_file: `${base}${sourcePath}`,
                    };
                } catch (error) {
                    flareLog('Error reading sourcemap file ' + sourcemapLocation + ': ' + error, true);
                    return null;
                }
            }).filter(sourcemap => sourcemap !== null) as Sourcemap[];

            if (!sourcemaps.length) {
                return;
            }

            flareLog(`Uploading ${sourcemaps.length} sourcemap files to Flare.`);

            const funcs = sourcemaps.map((sourcemap) => () => uploadSourcemap(sourcemap));

            try {
                while (funcs.length) {
                    // Maximum 10 at once https://stackoverflow.com/a/58686835
                    await Promise.all(funcs.splice(0, 10).map((f) => f()));
                }

                flareLog('Successfully uploaded sourcemaps to Flare.');
            } catch (error) {
                flareLog(`Something went wrong while uploading the sourcemaps to Flare: ${error}`, true);
            }

            if (removeSourcemaps) {
                sourcemaps.forEach(({ sourcemap_url }) => {
                    try {
                        unlinkSync(sourcemap_url);
                    } catch (error) {
                        console.error('Error removing sourcemap file', sourcemap_url, ': ', error);
                    }
                });

                flareLog('Successfully removed sourcemaps.');
            }
        },
    };
}

function flareLog(message: string, isError = false) {
    const formattedMessage = '@flareapp/flare-vite-plugin-sourcemaps: ' + message;

    if (isError) {
        console.error(formattedMessage);
        return;
    }

    console.log(formattedMessage);
}

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == 'x' ? r : (r & 0x3) | 0x8;

        return v.toString(16);
    });
}

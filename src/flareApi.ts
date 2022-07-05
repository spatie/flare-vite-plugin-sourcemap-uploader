import {deflateRawSync} from "zlib";
import axios from "axios";

export default class FlareApi {
    endpoint: string;
    key: string;
    versionId: string;

    constructor(endpoint: string, key: string, versionId: string) {
        this.endpoint = endpoint;
        this.key = key;
        this.versionId = versionId;
    }

    uploadSourcemap(sourcemap: Sourcemap) {
        return new Promise((resolve, reject) => {
            const base64GzipSourcemap = deflateRawSync(sourcemap.content).toString('base64');

            axios
                .post(this.endpoint, {
                    key: this.key,
                    version_id: this.versionId,
                    relative_filename: sourcemap.original_file,
                    sourcemap: base64GzipSourcemap,
                })
                .then(resolve)
                .catch((error) => {
                    return reject(`${error.response.status}: ${error.response.data}`);
                });
        })
    }
}

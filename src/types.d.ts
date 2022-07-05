type PluginConfig = {
    key: string;
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

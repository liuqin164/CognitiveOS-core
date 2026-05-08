function asRecord(data) {
    return data && typeof data === 'object' && !Array.isArray(data)
        ? data
        : {};
}
function stringify(value) {
    return typeof value === 'string' ? value : '';
}
function arrayOfRecords(value) {
    return Array.isArray(value)
        ? value.filter((item) => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
        : [];
}
function arrayOfStrings(value) {
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}
export function formatEnvironmentReply(data) {
    const env = asRecord(data);
    const runtime = asRecord(env.runtime);
    const networkPolicy = stringify(env.networkPolicy) || 'unknown';
    return [
        '当前运行环境：',
        `• workspace: ${stringify(env.workspaceRoot) || stringify(env.cwd) || 'unknown'}`,
        `• platform: ${stringify(env.platform) || 'unknown'}`,
        `• runtime: bun=${stringify(runtime.bun) || 'unknown'}, node=${stringify(runtime.node) || 'unknown'}`,
        `• packageManager: ${stringify(env.packageManager) || 'unknown'}`,
        `• networkPolicy: ${networkPolicy}`
    ].join('\n');
}
export function formatModelsReply(data) {
    const modelManifest = asRecord(data);
    const roles = arrayOfRecords(modelManifest.roles);
    if (roles.length === 0)
        return '当前没有可用模型信息。';
    const lines = roles.map((role) => {
        const caps = arrayOfStrings(role.capabilities).join(', ') || 'none';
        return `• ${stringify(role.role)}: ${stringify(role.provider)} ${stringify(role.modelName)} [${stringify(role.locality)}] capabilities=${caps}`;
    });
    return `当前模型能力：\n${lines.join('\n')}`;
}
export function formatFileAssetsReply(data) {
    const fileAssets = asRecord(data);
    const supported = arrayOfStrings(fileAssets.supportedExtensions);
    const planned = arrayOfStrings(fileAssets.unsupportedPlannedKinds);
    return [
        '当前文件资产能力：',
        `• 已支持：${supported.join(', ') || 'none'}`,
        `• 已索引文件数：${Number(fileAssets.indexedAssetCount || 0)}`,
        `• 已索引 chunk 数：${Number(fileAssets.indexedChunkCount || 0)}`,
        `• 尚未实现：${planned.join(', ') || 'none'}`
    ].join('\n');
}
export function formatSelfManifestReply(data) {
    const manifest = asRecord(data);
    const capabilities = arrayOfRecords(manifest.capabilities);
    const constraints = arrayOfRecords(manifest.constraints);
    const fileAssets = asRecord(manifest.fileAssets);
    return [
        `当前运行时自我清单：${stringify(manifest.manifestId) || 'unknown'}`,
        `• capabilities: ${capabilities.length}`,
        `• fileAssets: ${Number(fileAssets.indexedAssetCount || 0)} files / ${Number(fileAssets.indexedChunkCount || 0)} chunks`,
        `• constraints: ${constraints.map((constraint) => stringify(constraint.id)).filter(Boolean).join(', ') || 'none'}`
    ].join('\n');
}

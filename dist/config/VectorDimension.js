export const DEFAULT_VECTOR_DIMENSION = 384;
export const HIGH_VECTOR_DIMENSION_THRESHOLD = 2048;
export const VECTOR_DIMENSION_ESTIMATE_COUNT = 100_000;
export function parseVectorDimensionValue(value, fieldName, diagnostics) {
    if (value === undefined || value === null || value === '')
        return undefined;
    let parsed = Number.NaN;
    if (typeof value === 'number') {
        parsed = value;
    }
    else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^[0-9]+$/.test(trimmed))
            parsed = Number(trimmed);
    }
    if (!Number.isInteger(parsed) || parsed <= 0) {
        diagnostics.push({
            severity: 'error',
            code: 'invalid_vector_dimension',
            message: `${fieldName} must be a positive integer.`,
        });
        return undefined;
    }
    return parsed;
}
export function addVectorDimensionDiagnostics(dimension, diagnostics) {
    if (dimension < HIGH_VECTOR_DIMENSION_THRESHOLD)
        return;
    diagnostics.push({
        severity: 'warning',
        code: 'high_vector_dimension',
        message: vectorDimensionWarningMessage(dimension),
    });
}
export function vectorDimensionWarningMessage(dimension) {
    return [
        `High vector dimension ${dimension}: each neuron vector uses ${formatBytes(dimension * 4)} as Float32 data.`,
        `${VECTOR_DIMENSION_ESTIMATE_COUNT.toLocaleString('en-US')} memories need about ${formatBytes(estimateVectorBytes(dimension))} before SQLite/index overhead.`,
    ].join(' ');
}
export function estimateVectorBytes(dimension, count = VECTOR_DIMENSION_ESTIMATE_COUNT) {
    return dimension * 4 * count;
}
function formatBytes(bytes) {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(2)} ${units[unitIndex]}`;
}

export function confidenceFromEvidenceCount(count) {
    if (count <= 1)
        return 0.3;
    if (count <= 3)
        return 0.5;
    if (count <= 6)
        return 0.7;
    return 0.9;
}

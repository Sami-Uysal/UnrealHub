import type { Project } from '../types';

const versionParts = (version: string) =>
    version.match(/^(?:UE[_\s]*)?(\d+)\.(\d+)(?:\.(\d+))?/i);

export function compareEngineVersions(left: string, right: string): number {
    const a = versionParts(left);
    const b = versionParts(right);
    if (a && b) {
        for (let index = 1; index <= 3; index++) {
            const difference = Number(a[index] || 0) - Number(b[index] || 0);
            if (difference) return difference;
        }
        return 0;
    }
    return left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' });
}

// Source builds can resolve to a patch version; group them with the same UE release.
export function getProjectEngineVersion(project: Pick<Project, 'version' | 'engineVersion'>): string {
    const parts = versionParts(project.engineVersion || project.version);
    return parts ? `${Number(parts[1])}.${Number(parts[2])}` : 'unknown';
}

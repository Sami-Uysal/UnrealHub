import { ipcMain } from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { simpleGit } from 'simple-git';

export function registerGitHandlers() {
    ipcMain.handle('check-git-repo', async (_, projectPath: string) => {
        try {
            if (!existsSync(projectPath)) return false;
            const git = simpleGit(path.dirname(projectPath));
            return await git.checkIsRepo();
        } catch (e) {
            console.error('Error checking git repo:', e);
            return false;
        }
    });

    ipcMain.handle('get-git-status', async (_, projectPath: string) => {
        try {
            const git = simpleGit(path.dirname(projectPath));
            const isRepo = await git.checkIsRepo();
            if (!isRepo) return { current: '', branches: [], remotes: [] };

            const [branchSummary, branchesLocal, branchesRemote] = await Promise.all([
                git.branch(),
                git.branchLocal(),
                git.branch(['-r'])
            ]);

            return {
                current: branchSummary.current,
                branches: branchesLocal.all,
                remotes: branchesRemote.all
            };
        } catch (e) {
            console.error('Error fetching git status:', e);
            return { current: '', branches: [], remotes: [] };
        }
    });

    ipcMain.handle('get-git-history', async (_, projectPath: string) => {
        try {
            const git = simpleGit(path.dirname(projectPath));
            const isRepo = await git.checkIsRepo();
            if (!isRepo) return [];

            const log = await git.log({
                '--all': null,
                format: {
                    hash: '%H',
                    date: '%ai',
                    message: '%s',
                    refs: '%D',
                    body: '%b',
                    author_name: '%an',
                    author_email: '%ae',
                    parents: '%P'
                }
            } as any);

            return log.all.map((commit: any) => ({
                ...commit,
                parents: commit.parents || ''
            }));
        } catch (e) {
            console.error('Error fetching git history:', e);
            return [];
        }
    });
}

import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, GitCommit as GitIcon, AlertCircle, Monitor, Cloud, Tag, Check } from 'lucide-react';
import { GitCommit } from '../types';

interface GitHistoryPageProps {
    projectPath: string;
    projectName: string;
    onBack: () => void;
}

interface GraphNode {
    hash: string;
    x: number;
    y: number;
    color: string;
    branch?: string;
}

interface GraphLink {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
}

export const GitHistoryPage: React.FC<GitHistoryPageProps> = ({ projectPath, projectName, onBack }) => {
    const { t } = useTranslation();
    const [commits, setCommits] = useState<GitCommit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<{ current: string; branches: string[]; remotes: string[] } | null>(null);

    useEffect(() => {
        loadHistory();
    }, [projectPath]);

    const loadHistory = async () => {
        console.log("Loading Git history for:", projectPath);
        try {
            setLoading(true);
            setError(null);
            const isRepo = await window.unreal.checkGitRepo(projectPath);

            if (!isRepo) {
                setError(t('git.notRepo'));
                setLoading(false);
                return;
            }

            const [history, gitStatus] = await Promise.all([
                window.unreal.getGitHistory(projectPath),
                window.unreal.getGitStatus(projectPath)
            ]);

            console.log("Git history fetched:", history);
            console.log("Git status fetched:", gitStatus);
            setCommits(history || []);
            setStatus(gitStatus);
        } catch (err) {
            console.error("Error loading history:", err);
            setError(t('git.error'));
        } finally {
            setLoading(false);
        }
    };

    const graphData = useMemo(() => {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        const laneColors = ['#F06292', '#BA68C8', '#64B5F6', '#4DD0E1', '#81C784', '#FFD54F', '#FF8A65', '#A1887F'];

        const lanes: (string | null)[] = [];
        const laneLabels: (string | null)[] = [];

        commits.forEach((commit, index) => {
            let lane = lanes.indexOf(commit.hash);

            if (lane === -1) {
                lane = lanes.findIndex(l => l === null);
                if (lane === -1) lane = lanes.length;
            }

            if (commit.refs) {
                const refs = commit.refs.split(', ');
                const branchRef = refs.find(r => !r.includes('tag: '));
                if (branchRef) {
                    let name = branchRef;
                    if (name.includes('HEAD -> ')) name = name.replace('HEAD -> ', '');
                    if (name.includes('origin/')) name = name.replace('origin/', '');
                    laneLabels[lane] = name;
                }
            }

            for (let i = 0; i < lanes.length; i++) {
                if (lanes[i] === commit.hash && i !== lane) {
                    lanes[i] = null;
                    laneLabels[i] = null;
                }
            }

            nodes.push({
                hash: commit.hash,
                x: lane,
                y: index,
                color: laneColors[lane % laneColors.length],
                branch: laneLabels[lane] || undefined
            });

            const parents = commit.parents && commit.parents.trim().length > 0 ? commit.parents.trim().split(' ') : [];

            if (parents.length > 0) {
                lanes[lane] = parents[0];

                for (let p = 1; p < parents.length; p++) {
                    const parentHash = parents[p];
                    let pLane = lanes.indexOf(parentHash);

                    if (pLane === -1) {
                        pLane = lanes.findIndex(l => l === null);
                        if (pLane === -1) pLane = lanes.length;
                        lanes[pLane] = parentHash;
                        laneLabels[pLane] = null;
                    }
                }
            } else {
                lanes[lane] = null;
                laneLabels[lane] = null;
            }
        });

        nodes.forEach(node => {
            const commit = commits[node.y];
            const parents = commit.parents && commit.parents.trim().length > 0 ? commit.parents.trim().split(' ') : [];

            parents.forEach(parentHash => {
                const parentNode = nodes.find(n => n.hash === parentHash);
                if (parentNode) {
                    links.push({
                        x1: node.x,
                        y1: node.y,
                        x2: parentNode.x,
                        y2: parentNode.y,
                        color: node.color
                    });
                }
            });
        });

        return { nodes, links, width: Math.max(lanes.length, 2) * 24 + 20 };
    }, [commits]);

    const ROW_HEIGHT = 60;
    const LANE_WIDTH = 24;
    const BRANCH_COL_WIDTH = 180;


    const groupedRemotes = useMemo(() => {
        if (!status?.remotes) return {};
        const groups: Record<string, string[]> = {};
        status.remotes.forEach(remoteBranch => {
            const parts = remoteBranch.split('/');
            const remoteName = parts[0];
            const branchName = parts.slice(1).join('/');

            if (!groups[remoteName]) groups[remoteName] = [];
            groups[remoteName].push(branchName);
        });
        return groups;
    }, [status]);

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200">
            <div className="flex items-center space-x-4 border-b border-slate-800 p-4 bg-slate-950 shrink-0">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <GitIcon className="text-orange-500" />
                        {t('git.title')}
                    </h2>
                    <p className="text-xs text-slate-500">{projectName}</p>
                </div>
            </div>

            <div className="flex-1 flex min-h-0 p-4 gap-4">
                <div className="hidden md:flex w-64 bg-slate-900 border border-slate-800 flex-col overflow-y-auto shrink-0 select-none rounded-xl">
                    <div className="p-4 space-y-6">
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">{t('git.head')}</div>
                            {status?.current ? (
                                <div className="flex items-center gap-2 px-2 py-1.5 bg-primary/10 text-primary rounded-md border border-primary/20">
                                    <GitIcon size={14} />
                                    <span className="text-sm font-medium truncate" title={status.current}>{status.current}</span>
                                </div>
                            ) : (
                                <div className="px-2 text-sm text-slate-600 italic">{t('git.detached')}</div>
                            )}
                        </div>

                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">{t('git.local')}</div>
                            <div className="space-y-0.5">
                                {status?.branches.length === 0 && <div className="px-2 text-sm text-slate-600 italic">{t('git.noLocal')}</div>}
                                {status?.branches.map(branch => (
                                    <div key={branch} className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${branch === status.current ? 'text-primary font-medium' : 'text-slate-300'}`}>
                                        <GitIcon size={14} className={branch === status.current ? 'opacity-100' : 'opacity-50'} />
                                        <span className="text-sm truncate" title={branch}>{branch}</span>
                                        {branch === status.current && <span className="ml-auto text-[10px] bg-primary/20 text-primary px-1.5 rounded">{t('git.current')}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">{t('git.remote')}</div>
                            <div className="space-y-0.5">
                                {Object.entries(groupedRemotes).map(([remote, branches]) => (
                                    <div key={remote} className="mb-2">
                                        <div className="flex items-center gap-1.5 px-2 py-1 text-slate-400 text-sm font-semibold">
                                            <span>{remote}</span>
                                        </div>
                                        {branches.map(branch => (
                                            <div key={`${remote}/${branch}`} className="flex items-center gap-2 pl-6 pr-2 py-1.5 rounded-md text-slate-300">
                                                <GitIcon size={14} className="opacity-50" />
                                                <span className="text-sm truncate" title={branch}>{branch}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                {(!status?.remotes || status.remotes.length === 0) && <div className="px-2 text-sm text-slate-600 italic">{t('git.noRemote')}</div>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden bg-slate-900/50 flex flex-col relative w-full rounded-xl border border-slate-800">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-50 bg-slate-900/80">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center justify-center h-full text-red-400">
                            <AlertCircle size={48} className="mb-4" />
                            <p>{error}</p>
                        </div>
                    )}

                    {!loading && !error && commits.length > 0 && (
                        <div className="flex flex-col h-full w-full">
                            <div className="flex bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-400 z-20 relative shrink-0">
                                <div style={{ width: BRANCH_COL_WIDTH }} className="p-3 border-r border-slate-800 pl-4">{t('git.branchTag')}</div>
                                <div style={{ width: Math.max(100, graphData.width) }} className="p-3 border-r border-slate-800 text-center">{t('git.graph')}</div>
                                <div className="p-3 flex-1">{t('git.commitMessage')}</div>
                            </div>

                            <div className="flex-1 overflow-auto relative custom-scrollbar">
                                <svg
                                    className="absolute top-0 pointer-events-none z-10"
                                    style={{
                                        left: BRANCH_COL_WIDTH,
                                        width: Math.max(120, graphData.width),
                                        height: commits.length * ROW_HEIGHT
                                    }}
                                >
                                    {graphData.links.map((link, i) => {
                                        const sx = 14 + link.x1 * LANE_WIDTH;
                                        const sy = link.y1 * ROW_HEIGHT + ROW_HEIGHT / 2;
                                        const ex = 14 + link.x2 * LANE_WIDTH;
                                        const ey = link.y2 * ROW_HEIGHT + ROW_HEIGHT / 2;

                                        let d = `M ${sx} ${sy} L ${ex} ${ey}`;

                                        if (link.x1 !== link.x2) {
                                            const branchY = sy + (ROW_HEIGHT / 2);
                                            d = `M ${sx} ${sy} L ${sx} ${branchY} L ${ex} ${branchY} L ${ex} ${ey}`;
                                        }

                                        return (
                                            <path
                                                key={i}
                                                d={d}
                                                stroke={link.color}
                                                strokeWidth="2"
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                opacity="1"
                                            />
                                        );
                                    })}
                                    {graphData.nodes.map((node, i) => (
                                        <circle
                                            key={i}
                                            cx={14 + node.x * LANE_WIDTH}
                                            cy={node.y * ROW_HEIGHT + ROW_HEIGHT / 2}
                                            r={5}
                                            fill={node.color}
                                            stroke="#0f172a"
                                            strokeWidth="2"
                                        />
                                    ))}
                                </svg>

                                {commits.map((commit, index) => {
                                    const refs = commit.refs ? commit.refs.split(', ').map(ref => {
                                        let type = 'branch';
                                        let name = ref;
                                        if (ref.includes('tag: ')) {
                                            type = 'tag';
                                            name = ref.replace('tag: ', '');
                                        } else if (ref.includes('HEAD -> ')) {
                                            type = 'head';
                                            name = ref.replace('HEAD -> ', '');
                                        } else if (ref.includes('origin/')) {
                                            type = 'remote';
                                        }
                                        return { type, name };
                                    }) : [];

                                    const node = graphData.nodes.find(n => n.y === index);
                                    const branchName = node?.branch;

                                    return (
                                        <div
                                            key={commit.hash}
                                            className="group flex hover:bg-slate-900/40 transition-colors border-b border-slate-800/50 relative items-center overflow-hidden"
                                            style={{ height: ROW_HEIGHT }}
                                        >
                                            <div style={{ width: BRANCH_COL_WIDTH }} className="relative shrink-0 flex flex-col justify-center items-start pl-4 z-20">
                                                {branchName && refs.length === 0 && (
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 max-w-[calc(100%-2rem)]">
                                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-teal-950/40 text-teal-400/70 border border-teal-900/50 text-[10px] font-medium w-full overflow-hidden shadow-sm">
                                                            <Monitor size={10} className="shrink-0" />
                                                            <span className="truncate leading-none pt-[1px]">{branchName}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-1 justify-start w-full relative z-10">
                                                    {refs.map((ref, idx) => {
                                                        let Icon = Monitor;
                                                        let styleClass = 'bg-slate-800 text-slate-300 border-slate-700';

                                                        if (ref.type === 'head') {
                                                            Icon = Check;
                                                            styleClass = 'bg-teal-950 text-teal-400 border-teal-800 shadow-[0_0_10px_rgba(45,212,191,0.1)]';
                                                        } else if (ref.type === 'tag') {
                                                            Icon = Tag;
                                                            styleClass = 'bg-purple-950 text-purple-400 border-purple-800';
                                                        } else if (ref.type === 'remote') {
                                                            Icon = Cloud;
                                                            styleClass = 'bg-blue-950 text-blue-400 border-blue-800';
                                                        } else {
                                                            styleClass = 'bg-slate-800 text-slate-300 border-slate-700';
                                                        }

                                                        return (
                                                            <span key={idx} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded border font-medium truncate max-w-full ${styleClass}`} title={ref.name}>
                                                                <Icon size={10} />
                                                                {ref.name}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div style={{ width: Math.max(100, graphData.width) }} className="relative border-r border-slate-800 shrink-0 z-0">
                                            </div>
                                            <div className="flex-1 p-3 min-w-0 flex flex-col justify-center relative z-10">


                                                <div className="flex items-center justify-between gap-4 relative z-10">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-medium text-slate-200 truncate group-hover:text-primary transition-colors relative z-10">
                                                            {commit.message}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 relative z-10">
                                                            <span className="flex items-center gap-1.5">
                                                                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-300 font-bold border border-slate-600">
                                                                    {(commit.author_name || '?').charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="truncate max-w-[150px]">{commit.author_name}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <code className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-[10px] font-mono border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {commit.hash.substring(0, 7)}
                                                        </code>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, GitCommit as GitIcon, AlertCircle, Monitor, Cloud, Tag, Check, Clock } from 'lucide-react';
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

const formatRelativeDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 5) return `${diffWeeks}w ago`;
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    return date.toLocaleDateString();
};

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

    const ROW_HEIGHT = 52;
    const LANE_WIDTH = 24;
    const BRANCH_COL_WIDTH = 160;

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
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-white/5 px-5 py-3.5 bg-gradient-to-r from-slate-900/80 to-slate-950 shrink-0 backdrop-blur-md">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-white/5 rounded-lg transition-all text-slate-400 hover:text-white active:scale-95"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20 flex items-center justify-center">
                        <GitIcon size={16} className="text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white leading-tight">{t('git.title')}</h2>
                        <p className="text-[11px] text-slate-500 leading-tight">{projectName}</p>
                    </div>
                </div>
                {status?.current && (
                    <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/15 text-teal-400">
                        <GitIcon size={12} />
                        <span className="text-xs font-medium">{status.current}</span>
                    </div>
                )}
            </div>

            <div className="flex-1 flex min-h-0 gap-0">
                {/* Sidebar */}
                <div className="hidden md:flex w-56 border-r border-white/5 bg-slate-950 flex-col overflow-y-auto shrink-0 custom-scrollbar">
                    <div className="p-4 space-y-5">
                        {/* Local Branches */}
                        <div>
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 px-1">{t('git.local')}</div>
                            <div className="space-y-0.5">
                                {status?.branches.length === 0 && <div className="px-2 text-xs text-slate-600 italic">{t('git.noLocal')}</div>}
                                {status?.branches.map(branch => (
                                    <div key={branch} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors
                                        ${branch === status.current
                                            ? 'text-teal-400 bg-teal-500/8 font-medium'
                                            : 'text-slate-400 hover:text-slate-300 hover:bg-white/3'}`}>
                                        <Monitor size={12} className={branch === status.current ? 'text-teal-400' : 'text-slate-600'} />
                                        <span className="truncate">{branch}</span>
                                        {branch === status.current && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.5)]" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Remote Branches */}
                        <div>
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 px-1">{t('git.remote')}</div>
                            <div className="space-y-0.5">
                                {Object.entries(groupedRemotes).map(([remote, branches]) => (
                                    <div key={remote}>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
                                            <Cloud size={10} />
                                            <span>{remote}</span>
                                        </div>
                                        {branches.map(branch => (
                                            <div key={`${remote}/${branch}`} className="flex items-center gap-2 pl-6 pr-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-400 hover:bg-white/3 transition-colors">
                                                <GitIcon size={11} className="text-slate-700" />
                                                <span className="truncate">{branch}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                {(!status?.remotes || status.remotes.length === 0) && <div className="px-2 text-xs text-slate-600 italic">{t('git.noRemote')}</div>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden flex flex-col relative w-full">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-50 bg-slate-950/90 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-3">
                                <div className="animate-spin rounded-full h-7 w-7 border-2 border-slate-700 border-t-[var(--accent-color)]"></div>
                                <span className="text-xs text-slate-500">{t('git.loading')}</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                            <AlertCircle size={40} className="text-red-400/60" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {!loading && !error && commits.length > 0 && (
                        <div className="flex flex-col h-full w-full">
                            {/* Table Header */}
                            <div className="flex bg-slate-950 border-b border-white/5 text-[10px] font-bold text-slate-600 uppercase tracking-widest z-20 relative shrink-0">
                                <div style={{ width: BRANCH_COL_WIDTH }} className="py-2.5 px-4 border-r border-white/5">{t('git.branchTag')}</div>
                                <div style={{ width: Math.max(100, graphData.width) }} className="py-2.5 px-3 border-r border-white/5 text-center">{t('git.graph')}</div>
                                <div className="py-2.5 px-4 flex-1">{t('git.commitMessage')}</div>
                            </div>

                            {/* Commit Rows */}
                            <div className="flex-1 overflow-auto relative custom-scrollbar">
                                <svg
                                    className="absolute top-0 pointer-events-none z-10"
                                    style={{
                                        left: BRANCH_COL_WIDTH,
                                        width: Math.max(120, graphData.width),
                                        height: commits.length * ROW_HEIGHT
                                    }}
                                >
                                    <defs>
                                        {graphData.nodes.map((node, i) => (
                                            <radialGradient key={`glow-${i}`} id={`glow-${i}`}>
                                                <stop offset="0%" stopColor={node.color} stopOpacity="0.4" />
                                                <stop offset="100%" stopColor={node.color} stopOpacity="0" />
                                            </radialGradient>
                                        ))}
                                    </defs>
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
                                                opacity="0.7"
                                            />
                                        );
                                    })}
                                    {graphData.nodes.map((node, i) => (
                                        <g key={i}>
                                            <circle
                                                cx={14 + node.x * LANE_WIDTH}
                                                cy={node.y * ROW_HEIGHT + ROW_HEIGHT / 2}
                                                r={12}
                                                fill={`url(#glow-${i})`}
                                            />
                                            <circle
                                                cx={14 + node.x * LANE_WIDTH}
                                                cy={node.y * ROW_HEIGHT + ROW_HEIGHT / 2}
                                                r={4}
                                                fill={node.color}
                                                stroke="#0a0f1a"
                                                strokeWidth="2"
                                            />
                                        </g>
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
                                            className="group flex hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] relative items-center"
                                            style={{ height: ROW_HEIGHT }}
                                        >
                                            {/* Branch/Tag Column */}
                                            <div style={{ width: BRANCH_COL_WIDTH }} className="relative shrink-0 flex items-center pl-3 pr-2 z-20 border-r border-white/5">
                                                {branchName && refs.length === 0 && (
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-teal-500/8 text-teal-400/60 border border-teal-500/10 font-medium truncate">
                                                            <Monitor size={9} />
                                                            {branchName}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-1">
                                                    {refs.map((ref, idx) => {
                                                        let Icon = Monitor;
                                                        let styleClass = 'bg-slate-800/50 text-slate-400 border-slate-700/50';

                                                        if (ref.type === 'head') {
                                                            Icon = Check;
                                                            styleClass = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
                                                        } else if (ref.type === 'tag') {
                                                            Icon = Tag;
                                                            styleClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                                                        } else if (ref.type === 'remote') {
                                                            Icon = Cloud;
                                                            styleClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                                                        }

                                                        return (
                                                            <span key={idx} className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border font-medium truncate ${styleClass}`} title={ref.name}>
                                                                <Icon size={9} />
                                                                {ref.name}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Graph Column */}
                                            <div style={{ width: Math.max(100, graphData.width) }} className="relative border-r border-white/5 shrink-0 z-0" />

                                            {/* Commit Info */}
                                            <div className="flex-1 px-4 py-2 min-w-0 flex items-center justify-between gap-3 relative z-10">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[13px] text-slate-300 truncate group-hover:text-white transition-colors leading-tight">
                                                        {commit.message}
                                                    </div>
                                                    <div className="flex items-center gap-2.5 mt-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[8px] text-slate-300 font-bold">
                                                                {(commit.author_name || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="text-[11px] text-slate-500 truncate max-w-[120px]">{commit.author_name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-slate-600">
                                                            <Clock size={10} />
                                                            <span className="text-[10px]">{formatRelativeDate(commit.date)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <code className="px-2 py-0.5 rounded-md bg-white/[0.03] text-slate-600 text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    {commit.hash.substring(0, 7)}
                                                </code>
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

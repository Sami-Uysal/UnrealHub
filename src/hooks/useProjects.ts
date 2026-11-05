import { useState, useEffect, useRef, useCallback } from 'react';
import { Project } from '../types';
import { useScan } from './useScan';

const getProjectScan = (refresh: boolean) => window.unreal.getProjectScan(refresh);

export function useProjects() {
    const { snapshot, refresh: loadProjects } = useScan<Project>(getProjectScan);
    const projects = snapshot.items;
    const [projectSizes, setProjectSizes] = useState<Record<string, number>>({});
    const sizeRequestedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (snapshot.scanning) return;
        let cancelled = false;
        const queue = projects.filter(project => !sizeRequestedRef.current.has(project.path));
        const worker = async () => {
            while (!cancelled && queue.length) {
                const project = queue.shift()!;
                if (sizeRequestedRef.current.has(project.path)) continue;
                sizeRequestedRef.current.add(project.path);
                try {
                    const size = await window.unreal.getProjectSize(project.path);
                    if (!cancelled) setProjectSizes(previous => ({ ...previous, [project.path]: size }));
                } catch (error) { console.error('Failed to get project size:', error); }
            }
        };
        void Promise.all([worker(), worker()]);
        return () => { cancelled = true; };
    }, [projects, snapshot.scanning]);

    return { projects, projectSizes, loadProjects, scan: snapshot };
}

export function useFavorites() {
    const [favorites, setFavorites] = useState<string[]>([]);

    const loadFavorites = useCallback(async () => {
        try {
            const favs = await window.unreal.getFavorites();
            setFavorites(favs || []);
        } catch (error) { console.error('Failed to load favorites', error); }
    }, []);

    useEffect(() => { loadFavorites(); }, [loadFavorites]);

    const toggleFavorite = useCallback(async (projectPath: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const updated = await window.unreal.toggleFavorite(projectPath);
        setFavorites(updated);
    }, []);

    return { favorites, toggleFavorite };
}

export function useTags() {
    const [allTags, setAllTags] = useState<Record<string, string[]>>({});

    const loadTags = useCallback(async () => {
        try {
            const tags = await window.unreal.getProjectTags();
            setAllTags(tags || {});
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => { loadTags(); }, [loadTags]);

    return { allTags, setAllTags };
}

export function useClickOutside(refs: React.RefObject<HTMLElement | null>[], callbacks: (() => void)[]) {
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            refs.forEach((ref, i) => {
                if (ref.current && !ref.current.contains(event.target as Node)) {
                    callbacks[i]();
                }
            });
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [refs, callbacks]);
}

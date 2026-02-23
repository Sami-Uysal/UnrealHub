import { useState, useEffect, useRef, useCallback } from 'react';
import { Project } from '../types';

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectSizes, setProjectSizes] = useState<Record<string, number>>({});
    const sizeRequestedRef = useRef<Set<string>>(new Set());

    const loadProjects = useCallback(async () => {
        try {
            const data = await window.unreal.getProjects();
            setProjects(data);

            data.forEach(p => {
                if (!sizeRequestedRef.current.has(p.path)) {
                    sizeRequestedRef.current.add(p.path);
                    window.unreal.getProjectSize(p.path).then(size => {
                        setProjectSizes(prev => ({ ...prev, [p.path]: size }));
                    });
                }
            });
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => { loadProjects(); }, [loadProjects]);

    return { projects, projectSizes, loadProjects };
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

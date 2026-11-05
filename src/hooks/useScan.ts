import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScanSnapshot } from '../types';

export function useScan<T>(getSnapshot: (refresh: boolean) => Promise<ScanSnapshot<T>>) {
    const [snapshot, setSnapshot] = useState<ScanSnapshot<T>>({
        items: [], scanning: true, directories: 0, currentPath: '',
    });
    const generation = useRef(0);
    const timer = useRef<ReturnType<typeof setTimeout>>();

    const refresh = useCallback(async () => {
        const request = ++generation.current;
        clearTimeout(timer.current);
        setSnapshot(previous => ({ ...previous, scanning: true, error: undefined }));
        const poll = async (restart: boolean) => {
            try {
                const next = await getSnapshot(restart);
                if (generation.current !== request) return;
                setSnapshot(next);
                if (next.scanning) timer.current = setTimeout(() => { void poll(false); }, 500);
            } catch (error) {
                if (generation.current !== request) return;
                setSnapshot(previous => ({ ...previous, scanning: false, error: String(error) }));
            }
        };
        await poll(true);
    }, [getSnapshot]);

    const cancel = useCallback(() => {
        generation.current++;
        clearTimeout(timer.current);
    }, []);

    useEffect(() => {
        void refresh();
        return cancel;
    }, [refresh, cancel]);

    return { snapshot, refresh };
}

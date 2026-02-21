import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, GripVertical, Trash2, Edit2 } from 'lucide-react';
import { KanbanBoard, KanbanCard } from '../../types';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ConfirmationModal, DialogConfig } from '../ConfirmationModal';

interface KanbanProps {
    projectPath: string;
    onClose?: () => void;
}

const defaultBoard: KanbanBoard = {
    lists: []
};
const generateId = () => Math.random().toString(36).substr(2, 9);

const SortableCard = ({ card, listId, onEdit, onDelete }: { card: KanbanCard, listId: string, onEdit: (c: KanbanCard) => void, onDelete: (lId: string, cId: string) => void }) => {
    const { t } = useTranslation();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: card.id,
        data: { type: 'Card', card, listId }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`pb-2 ${isDragging ? 'opacity-50' : ''}`}
        >
            <div className={`group p-3 bg-slate-800 border border-slate-700/80 rounded-lg shadow-sm hover:border-[var(--accent-color)]/50 transition-colors cursor-grab active:cursor-grabbing ${isDragging ? 'shadow-2xl shadow-[var(--accent-color)]/20 border-[var(--accent-color)]' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-slate-200 leading-snug">
                        {card.title}
                    </p>
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 ml-2">
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onEdit(card); }}
                            title={t('kanban.editCard')}
                            className="text-slate-400 hover:text-[var(--accent-color)] p-1 bg-slate-900/50 rounded"
                        >
                            <Edit2 size={12} />
                        </button>
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(listId, card.id);
                            }}
                            className="text-slate-400 hover:text-red-400 p-1 bg-slate-900/50 rounded"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
                {card.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                        {card.description}
                    </p>
                )}
            </div>
        </div>
    );
};

interface ListProps {
    list: { id: string; title: string; cards: KanbanCard[] };
    onDeleteList: (id: string) => void;
    onAddCardClick: (listId: string) => void;
    addingCardToList: string | null;
    newCardTitle: string;
    setNewCardTitle: (content: string) => void;
    newCardDesc: string;
    setNewCardDesc: (desc: string) => void;
    handleAddCard: (listId: string) => void;
    setAddingCardToList: (id: string | null) => void;
    onEditCard: (card: KanbanCard) => void;
    onDeleteCard: (listId: string, cardId: string) => void;
}

const SortableList = ({ list, onDeleteList, onAddCardClick, addingCardToList, newCardTitle, setNewCardTitle, newCardDesc, setNewCardDesc, handleAddCard, setAddingCardToList, onEditCard, onDeleteCard }: ListProps) => {
    const { t } = useTranslation();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: list.id,
        data: { type: 'List', list }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const cardIds = useMemo(() => list.cards.map(c => c.id), [list.cards]);
    const localizedTitle = t(`kanban.${list.title.toLowerCase().replace(/\s+/g, '')}`) === `kanban.${list.title.toLowerCase().replace(/\s+/g, '')}` ? list.title : t(`kanban.${list.title.toLowerCase().replace(/\s+/g, '')}`);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex-shrink-0 w-80 max-h-full flex flex-col bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-lg ${isDragging ? 'opacity-50' : ''}`}
        >
            <div
                {...attributes}
                {...listeners}
                className="p-3 bg-slate-800/50 border-b border-slate-700/50 flex items-center justify-between group cursor-grab active:cursor-grabbing rounded-t-xl"
            >
                <div className="flex items-center gap-2">
                    <GripVertical size={16} className="text-slate-500" />
                    <h3 className="font-semibold text-slate-200">{localizedTitle}</h3>
                    <span className="bg-slate-700/50 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                        {list.cards.length}
                    </span>
                </div>
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteList(list.id);
                    }}
                    className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 min-h-[150px] custom-scrollbar">
                <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                    {list.cards.map(card => (
                        <SortableCard
                            key={card.id}
                            card={card}
                            listId={list.id}
                            onEdit={onEditCard}
                            onDelete={onDeleteCard}
                        />
                    ))}
                </SortableContext>
            </div>

            <div className="p-2 bg-slate-900 border-t border-slate-800 rounded-b-xl">
                {addingCardToList === list.id ? (
                    <div className="flex flex-col gap-2 p-1">
                        <textarea
                            autoFocus
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] resize-none"
                            placeholder={t('kanban.newTitle')}
                            rows={2}
                            value={newCardTitle}
                            onChange={(e) => setNewCardTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddCard(list.id);
                                }
                                if (e.key === 'Escape') {
                                    setAddingCardToList(null);
                                    setNewCardTitle('');
                                    setNewCardDesc('');
                                }
                            }}
                        />
                        <textarea
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] resize-none"
                            placeholder={t('kanban.newDesc')}
                            rows={3}
                            value={newCardDesc}
                            onChange={(e) => setNewCardDesc(e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleAddCard(list.id)}
                                className="px-3 py-1.5 bg-[var(--accent-color)] hover:opacity-90 text-white text-xs font-semibold rounded-md transition-opacity"
                            >
                                {t('kanban.save')}
                            </button>
                            <button
                                onClick={() => {
                                    setAddingCardToList(null);
                                    setNewCardTitle('');
                                }}
                                className="px-3 py-1.5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-md transition-colors"
                            >
                                {t('kanban.cancel')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => onAddCardClick(list.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors text-sm font-medium"
                    >
                        <Plus size={16} />
                        {t('kanban.addCard')}
                    </button>
                )}
            </div>
        </div>
    );
};

export const ProjectKanban: React.FC<KanbanProps> = ({ projectPath, onClose }) => {
    const { t } = useTranslation();
    const [board, setBoard] = useState<KanbanBoard | null>(null);
    const [newCardTitle, setNewCardTitle] = useState('');
    const [newCardDesc, setNewCardDesc] = useState('');
    const [addingCardToList, setAddingCardToList] = useState<string | null>(null);
    const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
    const [isAddingList, setIsAddingList] = useState(false);
    const [newListTitle, setNewListTitle] = useState('');
    const [confirmationDialog, setConfirmationDialog] = useState<DialogConfig | null>(null);

    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<'List' | 'Card' | null>(null);

    useEffect(() => {
        const loadKanban = async () => {
            const savedBoard = await window.unreal.getProjectKanban(projectPath);
            if (savedBoard) {
                if (!savedBoard.lists) {
                    setBoard(defaultBoard);
                } else {
                    setBoard(savedBoard);
                }
            } else {
                setBoard(defaultBoard);
            }
        };
        loadKanban();
    }, [projectPath]);

    const saveKanban = async (newBoard: KanbanBoard) => {
        setBoard(newBoard);
        await window.unreal.saveProjectKanban(projectPath, newBoard);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const onDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        setActiveType(active.data.current?.type);
    };

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveCard = active.data.current?.type === 'Card';
        const isOverCard = over.data.current?.type === 'Card';
        const isOverList = over.data.current?.type === 'List';

        if (!isActiveCard) return;

        setBoard((board) => {
            if (!board) return board;

            const activeListIndex = board.lists.findIndex(l => l.cards.some(c => c.id === activeId));
            let overListIndex = -1;

            if (isOverList) {
                overListIndex = board.lists.findIndex(l => l.id === overId);
            } else if (isOverCard) {
                overListIndex = board.lists.findIndex(l => l.cards.some(c => c.id === overId));
            }

            if (activeListIndex === -1 || overListIndex === -1 || activeListIndex === overListIndex) {
                return board;
            }

            const activeCardIndex = board.lists[activeListIndex].cards.findIndex(c => c.id === activeId);

            let overCardIndex = 0;
            if (isOverCard) {
                const overIndex = board.lists[overListIndex].cards.findIndex(c => c.id === overId);
                const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
                const modifier = isBelowOverItem ? 1 : 0;
                overCardIndex = overIndex >= 0 ? overIndex + modifier : board.lists[overListIndex].cards.length + 1;
            } else {
                overCardIndex = board.lists[overListIndex].cards.length + 1;
            }

            const newBoard = { ...board, lists: [...board.lists.map(l => ({ ...l, cards: [...l.cards] }))] };
            const [movedCard] = newBoard.lists[activeListIndex].cards.splice(activeCardIndex, 1);
            newBoard.lists[overListIndex].cards.splice(overCardIndex, 0, movedCard);

            return newBoard;
        });
    };

    const onDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        setActiveType(null);

        const { active, over } = event;
        if (!over) {
            setBoard(board => {
                if (board) saveKanban(board);
                return board;
            });
            return;
        }

        const activeId = active.id;
        const overId = over.id;
        const type = active.data.current?.type;

        if (type === 'List') {
            setBoard(board => {
                if (!board) return board;
                const activeIndex = board.lists.findIndex(l => l.id === activeId);
                const overIndex = board.lists.findIndex(l => l.id === overId);
                if (activeIndex !== overIndex) {
                    const newLists = arrayMove(board.lists, activeIndex, overIndex);
                    const newBoard = { ...board, lists: newLists };
                    saveKanban(newBoard);
                    return newBoard;
                }
                return board;
            });
        }

        if (type === 'Card') {
            setBoard(board => {
                if (!board) return board;

                const activeListIndex = board.lists.findIndex(l => l.cards.some(c => c.id === activeId));
                let overListIndex = board.lists.findIndex(l => l.cards.some(c => c.id === overId));
                if (overListIndex === -1 && over.data.current?.type === 'List') {
                    overListIndex = board.lists.findIndex(l => l.id === overId);
                }

                if (activeListIndex !== -1 && overListIndex !== -1 && activeListIndex === overListIndex) {
                    const activeCardIndex = board.lists[activeListIndex].cards.findIndex(c => c.id === activeId);
                    const overCardIndex = board.lists[overListIndex].cards.findIndex(c => c.id === overId);

                    if (activeCardIndex !== overCardIndex) {
                        const newBoard = { ...board, lists: [...board.lists.map(l => ({ ...l, cards: [...l.cards] }))] };
                        newBoard.lists[activeListIndex].cards = arrayMove(newBoard.lists[activeListIndex].cards, activeCardIndex, overCardIndex);
                        saveKanban(newBoard);
                        return newBoard;
                    }
                }
                saveKanban(board);
                return board;
            });
        }
    };

    const listIds = useMemo(() => board?.lists.map(l => l.id) || [], [board?.lists]);

    const activeItem = useMemo(() => {
        if (!activeId || !board) return null;
        if (activeType === 'List') {
            return board.lists.find(l => l.id === activeId);
        }
        if (activeType === 'Card') {
            for (const list of board.lists) {
                const card = list.cards.find(c => c.id === activeId);
                if (card) return { card, listId: list.id };
            }
        }
        return null;
    }, [activeId, activeType, board]);


    const handleAddCard = (listId: string) => {
        if (!newCardTitle.trim() || !board) return;

        const newBoard = {
            ...board,
            lists: board.lists.map(list => {
                if (list.id === listId) {
                    return {
                        ...list,
                        cards: [
                            ...list.cards,
                            {
                                id: `card-${generateId()}`,
                                title: newCardTitle.trim(),
                                description: newCardDesc.trim() || undefined,
                                createdAt: Date.now()
                            }
                        ]
                    };
                }
                return list;
            })
        };
        saveKanban(newBoard);
        setNewCardTitle('');
        setNewCardDesc('');
        setAddingCardToList(null);
    };

    const handleUpdateCard = (cardId: string, listId: string, newTitle: string, newDesc?: string) => {
        if (!newTitle.trim() || !board) return;

        const newBoard = {
            ...board,
            lists: board.lists.map(list => {
                if (list.id === listId) {
                    return {
                        ...list,
                        cards: list.cards.map(card => {
                            if (card.id === cardId) {
                                return { ...card, title: newTitle.trim(), description: newDesc };
                            }
                            return card;
                        })
                    };
                }
                return list;
            })
        };
        saveKanban(newBoard);
        setEditingCard(null);
    };

    const handleDeleteCard = (listId: string, cardId: string) => {
        setConfirmationDialog({
            type: 'confirm',
            variant: 'destructive',
            title: t('kanban.deleteCardTitle'),
            message: t('kanban.deleteCardConfirm'),
            confirmText: t('kanban.delete'),
            cancelText: t('kanban.cancel'),
            onConfirm: () => {
                const newBoard = {
                    ...board!,
                    lists: board!.lists.map(list => {
                        if (list.id === listId) {
                            return { ...list, cards: list.cards.filter(c => c.id !== cardId) };
                        }
                        return list;
                    })
                };
                setBoard(newBoard);
                saveKanban(newBoard);
            },
            onClose: () => setConfirmationDialog(null)
        });
    };

    const handleDeleteList = (listId: string) => {
        setConfirmationDialog({
            type: 'confirm',
            variant: 'destructive',
            title: t('kanban.deleteListTitle'),
            message: t('kanban.deleteListConfirm'),
            confirmText: t('kanban.delete'),
            cancelText: t('kanban.cancel'),
            onConfirm: () => {
                const newBoard = {
                    ...board!,
                    lists: board!.lists.filter(l => l.id !== listId)
                };
                setBoard(newBoard);
                saveKanban(newBoard);
            },
            onClose: () => setConfirmationDialog(null)
        });
    };

    const handleAddList = (title: string) => {
        if (!board || !title.trim()) return;
        const newBoard = {
            ...board,
            lists: [
                ...board.lists,
                { id: `list-${generateId()}`, title: title.trim(), cards: [] }
            ]
        };
        saveKanban(newBoard);
        setIsAddingList(false);
        setNewListTitle('');
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
    };

    if (!board) return <div className="p-4 text-slate-400">Loading Kanban...</div>;

    return (
        <div className="h-full flex flex-col p-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold tracking-tight text-white">{t('kanban.title')}</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsAddingList(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-200 transition-colors"
                    >
                        <Plus size={16} />
                        {t('kanban.addList')}
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-x-auto min-h-0 pb-4 custom-scrollbar">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                >
                    <div className="flex gap-4 h-full items-start">
                        <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
                            {board.lists.map(list => (
                                <SortableList
                                    key={list.id}
                                    list={list}
                                    onDeleteList={handleDeleteList}
                                    onAddCardClick={setAddingCardToList}
                                    addingCardToList={addingCardToList}
                                    newCardTitle={newCardTitle}
                                    setNewCardTitle={setNewCardTitle}
                                    newCardDesc={newCardDesc}
                                    setNewCardDesc={setNewCardDesc}
                                    handleAddCard={handleAddCard}
                                    setAddingCardToList={setAddingCardToList}
                                    onEditCard={setEditingCard}
                                    onDeleteCard={handleDeleteCard}
                                />
                            ))}
                        </SortableContext>
                    </div>

                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeType === 'List' && activeItem ? (
                            <SortableList
                                list={activeItem as any}
                                onDeleteList={() => { }}
                                onAddCardClick={() => { }}
                                addingCardToList={addingCardToList}
                                newCardTitle=""
                                setNewCardTitle={() => { }}
                                newCardDesc=""
                                setNewCardDesc={() => { }}
                                handleAddCard={() => { }}
                                setAddingCardToList={() => { }}
                                onEditCard={() => { }}
                                onDeleteCard={() => { }}
                            />
                        ) : null}
                        {activeType === 'Card' && activeItem && (activeItem as any).card ? (
                            <SortableCard
                                card={(activeItem as any).card}
                                listId={(activeItem as any).listId}
                                onEdit={() => { }}
                                onDelete={() => { }}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {editingCard && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">{t('kanban.editCard')}</h3>
                            <button onClick={() => setEditingCard(null)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">{t('kanban.newTitle')}</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[var(--accent-color)]"
                                    defaultValue={editingCard.title}
                                    id="edit-title"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">{t('kanban.newDesc')}</label>
                                <textarea
                                    className="w-full min-h-[100px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent-color)] resize-y custom-scrollbar"
                                    defaultValue={editingCard.description || ''}
                                    id="edit-desc"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.ctrlKey) {
                                            const title = (document.getElementById('edit-title') as HTMLInputElement).value;
                                            const desc = (document.getElementById('edit-desc') as HTMLTextAreaElement).value;
                                            let parentListId = '';
                                            for (const list of board.lists) {
                                                if (list.cards.find(c => c.id === editingCard.id)) {
                                                    parentListId = list.id;
                                                    break;
                                                }
                                            }
                                            if (parentListId) {
                                                handleUpdateCard(editingCard.id, parentListId, title, desc);
                                            }
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setEditingCard(null)} className="px-4 py-2 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-lg">
                                    {t('kanban.cancel')}
                                </button>
                                <button
                                    onClick={() => {
                                        const title = (document.getElementById('edit-title') as HTMLInputElement).value;
                                        const desc = (document.getElementById('edit-desc') as HTMLTextAreaElement).value;
                                        let parentListId = '';
                                        for (const list of board.lists) {
                                            if (list.cards.find(c => c.id === editingCard.id)) {
                                                parentListId = list.id;
                                                break;
                                            }
                                        }
                                        if (parentListId) {
                                            handleUpdateCard(editingCard.id, parentListId, title, desc);
                                        }
                                    }}
                                    className="px-4 py-2 bg-[var(--accent-color)] text-white text-sm font-medium rounded-lg hover:opacity-90"
                                >
                                    {t('kanban.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isAddingList && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">{t('kanban.addList')}</h3>
                            <button onClick={() => { setIsAddingList(false); setNewListTitle(''); }} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">{t('kanban.newTitle')}</label>
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[var(--accent-color)]"
                                    value={newListTitle}
                                    onChange={(e) => setNewListTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddList(newListTitle);
                                        } else if (e.key === 'Escape') {
                                            setIsAddingList(false);
                                            setNewListTitle('');
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => { setIsAddingList(false); setNewListTitle(''); }} className="px-4 py-2 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-lg transition-colors">
                                    {t('kanban.cancel')}
                                </button>
                                <button
                                    onClick={() => handleAddList(newListTitle)}
                                    className="px-4 py-2 bg-[var(--accent-color)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    {t('kanban.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {confirmationDialog && <ConfirmationModal config={confirmationDialog} />}
        </div>
    );
};

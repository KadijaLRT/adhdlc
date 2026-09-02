import { useMemo, useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, FlatList, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, selectTasks, selectEnergyLevel, type TaskCategory, type TaskPriority, type MotivatorTag, type EnergyLevel } from '@/store/index';
import { MOTIVATOR_OPTIONS } from '@/content/toolkitContent';
import { suggestNextTask } from './suggestNextTask';
import { Heading } from '@/shared/components/Heading';
import { generateId } from '@/shared/generateId';
import { useSafeTopInset } from '@/shared/hooks/useSafeTopInset';

const CATEGORY_OPTIONS: { id: TaskCategory; label: string; emoji: string }[] = [
  { id: 'general', label: 'All', emoji: '📋' },
  { id: 'home', label: 'Home', emoji: '🏠' },
  { id: 'school', label: 'School', emoji: '📚' },
  { id: 'health', label: 'Health', emoji: '❤️' },
  { id: 'errands', label: 'Errands', emoji: '🛒' },
  { id: 'car', label: 'Car', emoji: '🚗' },
  { id: 'personal', label: 'Personal', emoji: '🧑' },
];

const PRIORITY_DOT: Record<TaskPriority, string> = {
  critical: '🔴',
  important: '🟠',
  nice: '🟢',
};
const PRIORITY_GROUP_LABELS: Record<TaskPriority, string> = { critical: 'HIGH', important: 'MEDIUM', nice: 'LOW' };
const PRIORITY_ORDER: TaskPriority[] = ['critical', 'important', 'nice'];

function todayLocal(): string {
  return (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
}

/** Urgency is purely about timing (due today or overdue), kept separate from priority so the matrix's two axes actually mean different things. */
function isUrgent(task: { scheduledFor?: string }): boolean {
  return !!task.scheduledFor && task.scheduledFor <= todayLocal();
}
function isImportant(task: { priority?: TaskPriority }): boolean {
  return task.priority === 'critical' || task.priority === 'important';
}

function TaskRow({
  task, onPress, onToggle,
}: {
  task: { id: string; title: string; isComplete: boolean; priority?: TaskPriority; motivators?: MotivatorTag[]; subSteps?: { isComplete: boolean }[] };
  onPress: () => void; onToggle: () => void;
}) {
  const motivatorEmojis = (task.motivators || []).map((m) => MOTIVATOR_OPTIONS.find((o) => o.id === m)?.emoji).filter(Boolean);
  return (
    <Pressable onPress={onPress} className="bg-white rounded-xl p-4 flex-row items-center gap-3 dark:bg-slate-900">
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.isComplete }}
        className={task.isComplete ? 'w-6 h-6 rounded-full bg-emerald-500 items-center justify-center' : 'w-6 h-6 rounded-full border-2 border-stone-300'}
      >
        {task.isComplete && <Text className="text-white text-xs">✓</Text>}
      </Pressable>
      <View className="flex-1">
        <Text className={task.isComplete ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}>
          {task.priority ? `${PRIORITY_DOT[task.priority]} ` : ''}{task.title || 'Untitled task'}
        </Text>
        {(task.subSteps?.length || 0) > 0 && (
          <Text className="text-slate-500 text-xs mt-1">
            {(task.subSteps || []).filter((s) => s?.isComplete).length} of {task.subSteps?.length} steps
          </Text>
        )}
      </View>
      {motivatorEmojis.length > 0 && (
        <Text className="text-sm">{motivatorEmojis.join(' ')}</Text>
      )}
    </Pressable>
  );
}

export default function TasksScreen() {
  const topInset = useSafeTopInset();
  const router = useRouter();
  const tasks = useAppStore(selectTasks);
  const energyLevel = useAppStore(selectEnergyLevel);
  const addTask = useAppStore((s) => s.addTask);
  const toggleTaskComplete = useAppStore((s) => s.toggleTaskComplete);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('nice');
  const [newTaskEnergy, setNewTaskEnergy] = useState<EnergyLevel>('medium');
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>('general');
  const [selectedMotivator, setSelectedMotivator] = useState<MotivatorTag | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'priority' | 'matrix'>('list');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<TaskPriority>>(new Set());

  const suggested = useMemo(() => suggestNextTask(tasks, energyLevel), [tasks, energyLevel]);

  // Bug fix: "Today's Focus" used to always suggest from the full task
  // list, completely ignoring the active category/motivator filter —
  // filtering to "School" could still surface a Home task as the
  // focus, which defeats the point of filtering. Now the focus card
  // only shows when the suggested task actually matches the current
  // filter; otherwise it's suppressed rather than shown out of context.
  const suggestedMatchesFilter = useMemo(() => {
    if (!suggested) return false;
    if (selectedCategory !== 'general' && (suggested.category || 'general') !== selectedCategory) return false;
    if (selectedMotivator && !(suggested.motivators || []).includes(selectedMotivator)) return false;
    return true;
  }, [suggested, selectedCategory, selectedMotivator]);
  const visibleSuggestion = suggestedMatchesFilter ? suggested : null;

  const anyMotivatorsTagged = useMemo(() => (tasks || []).some((t) => (t.motivators?.length || 0) > 0), [tasks]);

  // Bug fix: the motivator filter row only renders while
  // anyMotivatorsTagged is true — if the last task carrying the
  // currently-selected motivator got completed, edited, or deleted,
  // the row (and the visible chip for it) disappears, but
  // selectedMotivator itself was never cleared. That left the list
  // silently filtered against a motivator with no visible active
  // filter and no way to clear it short of reloading the app.
  useEffect(() => {
    if (selectedMotivator && !anyMotivatorsTagged) setSelectedMotivator(null);
  }, [anyMotivatorsTagged, selectedMotivator]);

  const filteredTasks = useMemo(() => {
    // Bug fix: this used to always exclude the globally-suggested task
    // from the list, even when it wasn't actually being shown as the
    // "Today's Focus" card (because it didn't match the active
    // filter) — a task could vanish from view entirely, neither shown
    // as the focus nor in the list. Now it's only excluded from the
    // list when it's genuinely the thing occupying the focus card.
    const withoutSuggested = (tasks || []).filter((t) => t.id !== visibleSuggestion?.id);
    const byCategory = selectedCategory === 'general'
      ? withoutSuggested
      : withoutSuggested.filter((t) => (t.category || 'general') === selectedCategory);
    const byMotivator = selectedMotivator
      ? byCategory.filter((t) => (t.motivators || []).includes(selectedMotivator))
      : byCategory;
    const incomplete = byMotivator.filter((t) => !t.isComplete);
    const complete = byMotivator.filter((t) => t.isComplete);
    return [...incomplete, ...complete];
  }, [tasks, selectedCategory, selectedMotivator, visibleSuggestion]);

  const incompleteFiltered = useMemo(() => filteredTasks.filter((t) => !t.isComplete), [filteredTasks]);

  const groupedByPriority = useMemo(() => {
    const groups: Record<TaskPriority, typeof filteredTasks> = { critical: [], important: [], nice: [] };
    for (const task of incompleteFiltered) groups[task.priority || 'nice'].push(task);
    return groups;
  }, [incompleteFiltered]);

  const matrixQuadrants = useMemo(() => {
    const q = {
      urgentImportant: [] as typeof filteredTasks,
      notUrgentImportant: [] as typeof filteredTasks,
      urgentNotImportant: [] as typeof filteredTasks,
      notUrgentNotImportant: [] as typeof filteredTasks,
    };
    for (const task of incompleteFiltered) {
      const urgent = isUrgent(task);
      const important = isImportant(task);
      if (urgent && important) q.urgentImportant.push(task);
      else if (!urgent && important) q.notUrgentImportant.push(task);
      else if (urgent && !important) q.urgentNotImportant.push(task);
      else q.notUrgentNotImportant.push(task);
    }
    return q;
  }, [incompleteFiltered]);

  const toggleGroup = (priority: TaskPriority) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(priority)) next.delete(priority); else next.add(priority);
      return next;
    });
  };

  const totalCount = (tasks || []).length;
  const completedCount = (tasks || []).filter((t) => t.isComplete).length;
  const progressPercent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  // Bug fix: the empty state used to only ask "does a suggestion
  // exist," completely ignoring whether a category/motivator filter
  // was active — filtering to "Car" with zero car tasks showed "Add
  // one small thing above" even when 20 tasks existed in other
  // categories, which is actively misleading. Now it distinguishes
  // "nothing anywhere" from "nothing matches your current filter."
  const hasAnyFilterActive = selectedCategory !== 'general' || !!selectedMotivator;
  const emptyStateMessage = totalCount === 0
    ? 'Nothing here yet. Add one small thing above.'
    : hasAnyFilterActive
    ? 'Nothing matches this filter — try a different category or tap it again to clear it.'
    : suggested
    ? 'Nothing else here right now.'
    : 'Nothing here yet. Add one small thing above.';

  const handleAdd = async () => {
    if (!newTaskTitle?.trim()) return;
    await addTask({
      id: generateId('task'),
      title: newTaskTitle.trim(),
      isComplete: false,
      // Bug fix: this used to silently stamp whatever the person's
      // *current* energy level happened to be as the task's permanent
      // energyRequired — a 2-minute errand added on a high-energy
      // afternoon got tagged "high energy," then wrongly deprioritized
      // by suggestNextTask's energy-matching on every future low-energy
      // day, for no reason connected to the task itself. Now it's an
      // explicit choice with a neutral 'medium' default, matching how
      // priority already works.
      energyRequired: newTaskEnergy,
      priority: newTaskPriority,
      category: selectedCategory === 'general' ? 'general' : selectedCategory,
      createdAt: new Date().toISOString(),
      subSteps: [],
    });
    setNewTaskTitle('');
    setNewTaskPriority('nice');
    setNewTaskEnergy('medium');
    setShowAddOptions(false);
  };

  return (
    <View className="flex-1 w-full max-w-md self-center px-4" style={{ paddingTop: topInset }}>
      <Heading className="mb-1 mt-2">Tasks</Heading>

      {totalCount > 0 && (
        <View className="mb-4">
          <View className="h-2 bg-stone-100 rounded-full overflow-hidden mb-1 dark:bg-slate-800">
            <View className="h-2 bg-emerald-500 rounded-full" style={{ width: `${progressPercent}%` }} />
          </View>
          <Text className="text-slate-500 text-xs">
            {completedCount} of {totalCount} done today — progress, not a to-do pile.
          </Text>
        </View>
      )}

      {visibleSuggestion && (
        <Pressable
          onPress={() => router?.push?.(`/task/${visibleSuggestion.id}`)}
          className="bg-indigo-600/10 border-2 border-indigo-500 rounded-2xl p-4 mb-4"
        >
          <Text className="text-indigo-700 text-xs uppercase tracking-wider mb-1 dark:text-indigo-300">Today's focus</Text>
          <Text className="text-slate-900 text-lg font-medium mb-1 dark:text-slate-100">
            {PRIORITY_DOT[visibleSuggestion.priority || 'nice']} {visibleSuggestion.title}
          </Text>
          {(visibleSuggestion.estimatedMinutes || visibleSuggestion.realMinutes) && (
            <Text className="text-slate-500 text-xs">
              About {visibleSuggestion.realMinutes || visibleSuggestion.estimatedMinutes} min
            </Text>
          )}
        </Pressable>
      )}

      <View className="flex-row gap-2 mb-2">
        <TextInput
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
          onFocus={() => setShowAddOptions(true)}
          placeholder="Add a task..."
          placeholderTextColor="#64748b"
          onSubmitEditing={handleAdd}
          className="flex-1 bg-white text-slate-900 rounded-xl px-4 py-3 dark:text-slate-100 dark:bg-slate-900"
        />
        <Pressable onPress={handleAdd} className="bg-indigo-600 rounded-xl px-5 justify-center active:bg-indigo-500">
          <Text className="text-white font-semibold">Add</Text>
        </Pressable>
      </View>

      {/*
        Bug fix: this block used to be permanently visible — 6 pill
        buttons (3 priority + 3 energy) plus an "Adding as" line taking
        up real vertical space even before anyone had started typing a
        task, pushing the category filter and List/Priority/Matrix
        toggle further down and making the whole screen feel cramped.
        Now it only expands once the person actually focuses the input
        (or has already typed something), collapsing back after Add —
        so it's available exactly when relevant and out of the way
        otherwise. The "silently inherited category" fix from before
        stays in place — the Adding as line is still shown whenever
        this is open, just no longer pinned open all the time.
      */}
      {(showAddOptions || newTaskTitle.trim().length > 0) && (
        <>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-slate-400 text-[11px]">
              Adding as <Text className="font-semibold">{PRIORITY_DOT[newTaskPriority]} {newTaskPriority}</Text>
              {selectedCategory !== 'general' && (
                <> · <Text className="font-semibold">{CATEGORY_OPTIONS.find((c) => c.id === selectedCategory)?.emoji} {CATEGORY_OPTIONS.find((c) => c.id === selectedCategory)?.label}</Text></>
              )}
            </Text>
            {newTaskTitle.trim().length === 0 && (
              <Pressable onPress={() => setShowAddOptions(false)}>
                <Text className="text-slate-400 text-[11px]">Hide ▴</Text>
              </Pressable>
            )}
          </View>
          <View className="flex-row flex-wrap gap-2 mb-1">
            {(['nice', 'important', 'critical'] as TaskPriority[]).map((p) => {
              const isActive = newTaskPriority === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setNewTaskPriority(p)}
                  className={isActive ? 'bg-stone-100 border-2 border-indigo-400 rounded-full py-1.5 px-3' : 'bg-white border-2 border-transparent rounded-full py-1.5 px-3'}
                >
                  <Text className="text-slate-700 text-xs dark:text-slate-300">{PRIORITY_DOT[p]} {p}</Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {(['low', 'medium', 'high'] as EnergyLevel[]).map((e) => {
              const isActive = newTaskEnergy === e;
              const label = e === 'low' ? '🔋 low energy' : e === 'high' ? '🔋 high energy' : '🔋 medium energy';
              return (
                <Pressable
                  key={e}
                  onPress={() => setNewTaskEnergy(e)}
                  className={isActive ? 'bg-stone-100 border-2 border-indigo-400 rounded-full py-1.5 px-3' : 'bg-white border-2 border-transparent rounded-full py-1.5 px-3'}
                >
                  <Text className="text-slate-700 text-xs dark:text-slate-300">{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORY_OPTIONS}
        keyExtractor={(item) => item.id}
        style={{ height: 40, flexGrow: 0, marginBottom: 12 }}
        contentContainerStyle={{ gap: 8, alignItems: 'center' }}
        renderItem={({ item }) => {
          const isActive = selectedCategory === item.id;
          return (
            <Pressable
              onPress={() => setSelectedCategory(item.id)}
              className={isActive ? 'bg-indigo-600/20 border-2 border-indigo-400 rounded-full py-2 px-4' : 'bg-white border-2 border-transparent rounded-full py-2 px-4'}
            >
              <Text className={isActive ? 'text-indigo-700 text-xs' : 'text-slate-700 text-xs'}>{item.emoji} {item.label}</Text>
            </Pressable>
          );
        }}
      />

      {anyMotivatorsTagged && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MOTIVATOR_OPTIONS}
          keyExtractor={(item) => item.id}
          style={{ height: 40, flexGrow: 0, marginBottom: 12 }}
          contentContainerStyle={{ gap: 8, alignItems: 'center' }}
          renderItem={({ item }) => {
            const isActive = selectedMotivator === item.id;
            return (
              <Pressable
                onPress={() => setSelectedMotivator(isActive ? null : item.id)}
                className={isActive ? 'bg-emerald-400/10 border-2 border-emerald-400 rounded-full py-2 px-4' : 'bg-white border-2 border-transparent rounded-full py-2 px-4 dark:bg-slate-900'}
              >
                <Text className={isActive ? 'text-emerald-700 dark:text-emerald-400 text-xs' : 'text-slate-700 text-xs dark:text-slate-300'}>{item.emoji} {item.label}</Text>
              </Pressable>
            );
          }}
        />
      )}

      <View className="flex-row gap-2 mb-3">
        {([
          { id: 'list', label: 'List' },
          { id: 'priority', label: 'By Priority' },
          { id: 'matrix', label: 'Matrix' },
        ] as { id: 'list' | 'priority' | 'matrix'; label: string }[]).map((mode) => {
          const isActive = viewMode === mode.id;
          return (
            <Pressable
              key={mode.id}
              onPress={() => setViewMode(mode.id)}
              className={isActive ? 'flex-1 bg-indigo-600/20 border-2 border-indigo-400 rounded-full py-2 items-center' : 'flex-1 bg-white dark:bg-slate-900 border-2 border-transparent rounded-full py-2 items-center'}
            >
              <Text className={isActive ? 'text-indigo-700 dark:text-indigo-300 text-xs font-medium' : 'text-slate-600 dark:text-slate-300 text-xs font-medium'}>{mode.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {viewMode === 'list' && (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100, gap: 10 }}
          ListEmptyComponent={
            <Text className="text-slate-500 text-center mt-10">{emptyStateMessage}</Text>
          }
          renderItem={({ item }) => (
            <TaskRow task={item} onPress={() => router?.push?.(`/task/${item.id}`)} onToggle={() => toggleTaskComplete(item.id)} />
          )}
        />
      )}

      {viewMode === 'priority' && (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {incompleteFiltered.length === 0 && (
            <Text className="text-slate-500 text-center mt-10">{emptyStateMessage}</Text>
          )}
          <View className="gap-4">
            {PRIORITY_ORDER.map((priority) => {
              const group = groupedByPriority[priority];
              const isCollapsed = collapsedGroups.has(priority);
              return (
                <View key={priority}>
                  <Pressable onPress={() => toggleGroup(priority)} className="flex-row items-center gap-2 mb-2">
                    <Text className="text-slate-500 text-xs font-bold uppercase tracking-wide">
                      {PRIORITY_DOT[priority]} {PRIORITY_GROUP_LABELS[priority]} ({group.length})
                    </Text>
                    <Text className="text-slate-400 text-xs">{isCollapsed ? '▸' : '▾'}</Text>
                  </Pressable>
                  {!isCollapsed && group.length > 0 && (
                    <View className="gap-2">
                      {group.map((task) => (
                        <TaskRow key={task.id} task={task} onPress={() => router?.push?.(`/task/${task.id}`)} onToggle={() => toggleTaskComplete(task.id)} />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {viewMode === 'matrix' && (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {incompleteFiltered.length === 0 ? (
            <Text className="text-slate-500 text-center mt-10">{emptyStateMessage}</Text>
          ) : (
            <View className="gap-4">
              {[
                { key: 'urgentImportant' as const, label: 'Urgent & Important', color: 'text-red-500' },
                { key: 'notUrgentImportant' as const, label: 'Not Urgent & Important', color: 'text-amber-600 dark:text-amber-400' },
                { key: 'urgentNotImportant' as const, label: 'Urgent & Not Important', color: 'text-indigo-600 dark:text-indigo-400' },
                { key: 'notUrgentNotImportant' as const, label: 'Not Urgent & Not Important', color: 'text-emerald-600 dark:text-emerald-400' },
              ].map((quadrant) => {
                const tasksInQuadrant = matrixQuadrants[quadrant.key];
                return (
                  <View key={quadrant.key} className="bg-white dark:bg-slate-900 rounded-2xl p-4">
                    <Text className={`text-xs font-bold uppercase tracking-wide mb-2 ${quadrant.color}`}>{quadrant.label} ({tasksInQuadrant.length})</Text>
                    {tasksInQuadrant.length === 0 ? (
                      <Text className="text-slate-400 text-xs">Nothing here</Text>
                    ) : (
                      <View className="gap-2">
                        {tasksInQuadrant.map((task) => (
                          <TaskRow key={task.id} task={task} onPress={() => router?.push?.(`/task/${task.id}`)} onToggle={() => toggleTaskComplete(task.id)} />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          <Text className="text-slate-400 text-[11px] mt-3 text-center">
            Urgent = due today or overdue. Important = High or Medium priority.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

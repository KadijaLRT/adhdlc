import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { moveItem, shiftFor, targetIndexFor, type ItemBox } from '@/shared/dragReorderMath';

interface ActiveDrag {
  id: string;
  from: number;
  target: number;
}

/**
 * Drag-to-reorder for a vertical list of keyed items, no extra dependencies.
 * Dragging starts only from a handle, so scrolling the page never moves an item.
 *
 * Usage: wrap each item in <Animated.View {...itemProps(id)}> and render
 * <DragHandle controller={...} id={id} label="..." /> inside it. Disable the
 * parent ScrollView while `dragging` is true.
 */
export function useDragReorder(ids: string[], onReorder: (next: string[]) => void, gap: number) {
  const boxes = useRef<Record<string, ItemBox>>({});
  const idsRef = useRef<string[]>(ids || []);
  idsRef.current = ids || [];
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const activeRef = useRef<ActiveDrag | null>(null);
  const [active, setActive] = useState<ActiveDrag | null>(null);
  const dy = useRef(new Animated.Value(0)).current;

  const controller = useMemo(() => ({
    start(id: string) {
      const from = idsRef.current.indexOf(id);
      if (from < 0) return;
      dy.setValue(0);
      const next = { id, from, target: from };
      activeRef.current = next;
      setActive(next);
    },
    move(delta: number) {
      const current = activeRef.current;
      if (!current || !Number.isFinite(delta)) return;
      dy.setValue(delta);
      const renderedIds = idsRef.current.filter((id) => !!boxes.current[id]);
      const fromRendered = renderedIds.indexOf(current.id);
      if (fromRendered < 0) return;
      const list = renderedIds.map((id) => boxes.current[id] as ItemBox);
      const targetRendered = targetIndexFor(list, fromRendered, delta);
      const targetId = renderedIds[targetRendered];
      const target = targetId !== undefined ? idsRef.current.indexOf(targetId) : current.from;
      if (target < 0) return;
      if (target !== current.target) {
        const next = { ...current, target };
        activeRef.current = next;
        setActive(next);
      }
    },
    end(commit: boolean) {
      const current = activeRef.current;
      activeRef.current = null;
      setActive(null);
      dy.setValue(0);
      if (commit && current && current.target !== current.from) {
        onReorderRef.current(moveItem(idsRef.current, current.from, current.target));
      }
    },
    nudge(id: string, direction: 'up' | 'down') {
      const from = idsRef.current.indexOf(id);
      const to = direction === 'up' ? from - 1 : from + 1;
      if (from < 0 || to < 0 || to >= idsRef.current.length) return;
      onReorderRef.current(moveItem(idsRef.current, from, to));
    },
  }), [dy]);

  const itemProps = (id: string): { onLayout: (e: LayoutChangeEvent) => void; style: StyleProp<ViewStyle> } => {
    const index = idsRef.current.indexOf(id);
    const onLayout = (e: LayoutChangeEvent) => {
      const { y, height } = e?.nativeEvent?.layout || { y: 0, height: 0 };
      boxes.current[id] = { y, h: height };
    };
    if (!active) return { onLayout, style: undefined };
    if (active.id === id) {
      return {
        onLayout,
        style: [
          { zIndex: 20, elevation: 20, opacity: 0.96, transform: [{ translateY: dy }, { scale: 1.02 }] },
          Platform.OS === 'web' ? ({ userSelect: 'none' } as ViewStyle) : null,
        ],
      };
    }
    const span = (boxes.current[active.id]?.h || 0) + gap;
    return { onLayout, style: { transform: [{ translateY: shiftFor(index, active.from, active.target, span) }] } };
  };

  return { controller, itemProps, dragging: active !== null, draggingId: active?.id ?? null };
}

export type DragController = ReturnType<typeof useDragReorder>['controller'];

interface HandleProps {
  controller: DragController;
  id: string;
  label: string;
  children?: ReactNode;
}

/** The grip. Drag it, or focus it and press the up and down arrow keys; screen readers get Move up and Move down actions. */
export function DragHandle({ controller, id, label }: HandleProps) {
  const controllerRef = useRef(controller);
  controllerRef.current = controller;
  const idRef = useRef(id);
  idRef.current = id;

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => controllerRef.current.start(idRef.current),
    onPanResponderMove: (_e, g) => controllerRef.current.move(g.dy),
    onPanResponderRelease: () => controllerRef.current.end(true),
    onPanResponderTerminate: () => controllerRef.current.end(false),
  }), []);

  const webProps = Platform.OS === 'web'
    ? ({
        tabIndex: 0,
        onKeyDown: (e: { key?: string; preventDefault?: () => void }) => {
          if (e?.key === 'ArrowUp') { e.preventDefault?.(); controller.nudge(id, 'up'); }
          else if (e?.key === 'ArrowDown') { e.preventDefault?.(); controller.nudge(id, 'down'); }
        },
      } as object)
    : {};

  return (
    <View
      {...responder.panHandlers}
      {...webProps}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`Reorder ${label}`}
      accessibilityHint="Drag to move, or use the move up and move down actions"
      accessibilityActions={[{ name: 'moveUp', label: 'Move up' }, { name: 'moveDown', label: 'Move down' }]}
      onAccessibilityAction={(e) => {
        if (e?.nativeEvent?.actionName === 'moveUp') controller.nudge(id, 'up');
        if (e?.nativeEvent?.actionName === 'moveDown') controller.nudge(id, 'down');
      }}
      className="w-9 h-10 items-center justify-center"
      style={Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'grab', userSelect: 'none' } as unknown as ViewStyle) : undefined}
    >
      <Text className="text-slate-400 text-lg leading-5">⠿</Text>
    </View>
  );
}

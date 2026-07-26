import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createStore } from '../../src/state/createStore';

interface State {
  a: number;
  b: string;
}

const init = (): ReturnType<typeof createStore<State>> => createStore<State>({ a: 1, b: 'x' });

describe('createStore', () => {
  it('get מחזיר את המצב ההתחלתי', () => {
    expect(init().get()).toEqual({ a: 1, b: 'x' });
  });

  it('set ממזג patch חלקי', () => {
    const store = init();
    store.set({ a: 2 });
    expect(store.get()).toEqual({ a: 2, b: 'x' });
  });

  it('set עם פונקציה מקבל את המצב הקודם', () => {
    const store = init();
    store.set((prev) => ({ a: prev.a + 10 }));
    expect(store.get().a).toBe(11);
  });

  it('set יוצר אובייקט חדש (אין מוטציה)', () => {
    const store = init();
    const before = store.get();
    store.set({ a: 5 });
    expect(store.get()).not.toBe(before);
    expect(before.a).toBe(1);
  });

  it('subscribe מקבל התראה בכל set', () => {
    const store = init();
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ a: 2 });
    store.set({ b: 'y' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('פונקציית הביטול מסירה את המאזין', () => {
    const store = init();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.set({ a: 3 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('תומך בכמה מאזינים', () => {
    const store = init();
    const l1 = vi.fn();
    const l2 = vi.fn();
    store.subscribe(l1);
    store.subscribe(l2);
    store.set({ a: 9 });
    expect(l1).toHaveBeenCalledOnce();
    expect(l2).toHaveBeenCalledOnce();
  });

  it('use מרנדר מחדש רק כשהערך שנבחר משתנה', () => {
    const store = init();
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return store.use((s) => s.a);
    });
    expect(result.current).toBe(1);
    const rendersAfterMount = renders;

    act(() => store.set({ b: 'שונה' }));
    expect(renders).toBe(rendersAfterMount);

    act(() => store.set({ a: 42 }));
    expect(result.current).toBe(42);
    expect(renders).toBeGreaterThan(rendersAfterMount);
  });

  it('use מתנתק בפירוק הקומפוננטה', () => {
    const store = init();
    const { unmount } = renderHook(() => store.use((s) => s.a));
    unmount();
    expect(() => store.set({ a: 7 })).not.toThrow();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/stores/appStore';
import {
  flushCurrentDocument,
  saveCurrentDocument,
} from '../../src/services/documentSession';

function installFileWriter(write: (path: string, content: string) => Promise<void>) {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      electronAPI: {
        file: { write },
      },
    },
  });
}

describe('documentSession', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentFile: '/workspace/a.md',
      currentContent: 'initial',
      isDirty: false,
    });
  });

  it('flushes the current content and marks the matching snapshot saved', async () => {
    const write = vi.fn(async () => undefined);
    installFileWriter(write);
    useAppStore.getState().setContent('changed');

    await flushCurrentDocument();

    expect(write).toHaveBeenCalledWith('/workspace/a.md', 'changed');
    expect(useAppStore.getState().isDirty).toBe(false);
  });

  it('does not let an older in-flight save mark newer edits saved', async () => {
    let finishWrite!: () => void;
    installFileWriter(
      () => new Promise<void>((resolve) => {
        finishWrite = resolve;
      })
    );
    useAppStore.getState().setContent('first edit');

    const saving = saveCurrentDocument();
    await Promise.resolve();
    useAppStore.getState().setContent('newer edit');
    finishWrite();
    await saving;

    expect(useAppStore.getState().currentContent).toBe('newer edit');
    expect(useAppStore.getState().isDirty).toBe(true);
  });
});

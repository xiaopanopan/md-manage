import { useAppStore } from '@/stores/appStore';

let saveQueue: Promise<void> = Promise.resolve();

function enqueueWrite(filePath: string, content: string): Promise<void> {
  const task = saveQueue.then(async () => {
    await window.desktopAPI.file.write(filePath, content);

    const current = useAppStore.getState();
    if (
      current.currentFile === filePath &&
      current.currentContent === content
    ) {
      current.markSaved();
    }
  });

  // A failed write must not permanently poison the queue.
  saveQueue = task.catch(() => undefined);
  return task;
}

/** Save the current snapshot and wait for all earlier writes to finish. */
export async function flushCurrentDocument(): Promise<void> {
  const state = useAppStore.getState();
  if (!state.currentFile || !state.isDirty) {
    await saveQueue;
    return;
  }

  await enqueueWrite(state.currentFile, state.currentContent);
}

/** Queue an autosave snapshot without letting older writes mark newer edits saved. */
export function saveCurrentDocument(): Promise<void> {
  const state = useAppStore.getState();
  if (!state.currentFile || !state.isDirty) return saveQueue;
  return enqueueWrite(state.currentFile, state.currentContent);
}

/** Open a document only after the current document has safely reached disk. */
export async function openDocument(filePath: string): Promise<void> {
  const state = useAppStore.getState();
  if (state.currentFile === filePath) return;

  await flushCurrentDocument();
  const content = await window.desktopAPI.file.read(filePath);
  const latest = useAppStore.getState();
  latest.setCurrentFile(filePath, content);
  latest.addRecentFile(filePath);
}

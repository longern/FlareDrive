import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { processTransferTask } from "./transfer";

export interface TransferTask {
  type: "upload" | "download";
  remoteKey: string;
  file?: File;
  name: string;
  loaded: number;
  total: number;
  error?: any;
}

const TransferQueueContext = createContext<TransferTask[]>([]);
const SetTransferQueueContext = createContext<
  React.Dispatch<React.SetStateAction<TransferTask[]>>
>(() => {});

export function useTransferQueue() {
  return useContext(TransferQueueContext);
}

export function useUploadEnqueue() {
  const setTransferTasks = useContext(SetTransferQueueContext);
  return (...requests: { basedir: string; file: File }[]) => {
    const newTasks = requests.map(
      ({ basedir, file }) =>
        ({
          type: "upload",
          name: file.name,
          file,
          remoteKey: basedir + file.name,
          loaded: 0,
          total: file.size,
        } as TransferTask)
    );
    setTransferTasks((tasks) => [...tasks, ...newTasks]);
  };
}

export function TransferQueueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transferTasks, setTransferTasks] = useState<TransferTask[]>([]);
  const taskProcessing = useRef<TransferTask | null>(null);

  useEffect(() => {
    const taskToProcess = transferTasks.find((task) => task.loaded === 0);
    if (!taskToProcess || taskProcessing.current) return;
    taskProcessing.current = taskToProcess;
    processTransferTask({
      task: taskToProcess,
      onTaskProgress: ({ loaded }) => {
        setTransferTasks((tasks) => {
          const newTask: TransferTask = { ...taskProcessing.current!, loaded };
          const newTasks = tasks.map((t) =>
            t === taskProcessing.current ? newTask : t
          );
          taskProcessing.current = newTask;
          return newTasks;
        });
      },
    })
      .then(() => {
        taskProcessing.current = null;
        setTransferTasks((tasks) => [...tasks]);
      })
      .catch((error) => {
        setTransferTasks((tasks) => {
          const newTask: TransferTask = {
            ...taskProcessing.current!,
            error,
          } as TransferTask;
          const newTasks = tasks.map((t) =>
            t === taskProcessing.current ? newTask : t
          );
          taskProcessing.current = newTask;
          return newTasks;
        });
      });
  }, [transferTasks]);

  return (
    <TransferQueueContext.Provider value={transferTasks}>
      <SetTransferQueueContext.Provider value={setTransferTasks}>
        {children}
      </SetTransferQueueContext.Provider>
    </TransferQueueContext.Provider>
  );
}

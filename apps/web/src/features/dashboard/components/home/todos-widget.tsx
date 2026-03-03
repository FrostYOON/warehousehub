import Link from 'next/link';
import type { DashboardTodo } from '@/features/dashboard/model/types';

type TodosWidgetProps = {
  todos: DashboardTodo[];
};

export function TodosWidget({ todos }: TodosWidgetProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {todos.map((todo) => (
        <Link
          key={todo.id}
          href={todo.href}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
        >
          {todo.label} ({todo.value})
        </Link>
      ))}
    </div>
  );
}
